// ─────────────────────────────────────────────────────────────
//  sala.js — Salas en línea compartidas por todos los juegos.
//
//  Encapsula Firebase: conexión, login anónimo, creación y
//  entrada a salas, presencia y transacciones seguras.
//  Los juegos solo hablan con esta clase.
// ─────────────────────────────────────────────────────────────

const CDN = 'https://www.gstatic.com/firebasejs/10.12.2/';
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin I ni O: se confunden con 1 y 0

export class Sala {
  constructor(juego){
    this.juego  = juego;
    this.codigo = null;
    this.rol    = null;    // 'A' (quien crea) o 'B'
    this.uid    = null;
    this.ultimo = null;    // último valor conocido de la sala
    this._quitar = null;
    this._oyentes = [];
  }

  get rival(){ return this.rol === 'A' ? 'B' : 'A'; }
  get activa(){ return !!this.codigo; }

  static codigoNuevo(){
    return Array.from({length:4}, () => ALFABETO[Math.floor(Math.random()*ALFABETO.length)]).join('');
  }

  /* ── Conexión ──────────────────────────────────────────── */
  async conectar(){
    if (this.db) return;
    const [app, auth, rtdb, cfg] = await Promise.all([
      import(CDN + 'firebase-app.js'),
      import(CDN + 'firebase-auth.js'),
      import(CDN + 'firebase-database.js'),
      import('./config.js?v=4')
    ]);
    const instancia = app.initializeApp(cfg.firebaseConfig);
    const cred = await auth.signInAnonymously(auth.getAuth(instancia));
    this.uid = cred.user.uid;
    this.fb  = rtdb;
    this.db  = rtdb.getDatabase(instancia);
  }

  nodo(ruta){ return this.fb.ref(this.db, ruta); }

  /* ── Crear y entrar ────────────────────────────────────── */
  async crear(nombre, estadoInicial){
    await this.conectar();
    for (let intento = 0; intento < 5; intento++){
      const codigo = Sala.codigoNuevo();
      const r = await this.fb.runTransaction(this.nodo('salas/' + codigo), s => {
        if (s) return;                      // ya existe: abortamos y probamos otro código
        return {
          juego: this.juego,
          creada: Date.now(),
          jugadores: { A: { uid:this.uid, nombre, online:true } },
          estado: estadoInicial
        };
      });
      if (r.committed){ this._sentarse(codigo, 'A'); return codigo; }
    }
    throw new Error('No se pudo generar un código libre');
  }

  async entrar(codigo, nombre){
    await this.conectar();
    codigo = (codigo || '').toUpperCase().trim();
    if (codigo.length !== 4) throw new Error('El código tiene 4 caracteres.');

    // Leemos del servidor antes de la transacción. Ojo: get() no deja el nodo
    // sincronizado, así que la transacción puede recibir null en su primera
    // corrida (que es local). Si abortáramos ahí, moriría sin llegar al
    // servidor; por eso más abajo usamos este valor como respaldo.
    const previo = await this.fb.get(this.nodo('salas/' + codigo));
    if (!previo.exists()) throw new Error('Esa sala no existe. Revisa el código.');
    const base = previo.val();
    if (base.juego !== this.juego) throw new Error('Ese código es de otro juego.');
    // Una sala creada por una versión anterior no tiene el nodo `estado`.
    // Sin este aviso, el juego cargaría en blanco y sin explicación.
    if (!base.estado) throw new Error(
      'Esa sala se creó con una versión anterior del juego. ' +
      'Recarguen la página en ambos dispositivos (Ctrl+Shift+R) y creen una sala nueva.');

    // Un puesto está libre si nadie lo ocupa, si ya es mío, o si quien lo
    // tenía se desconectó (cada navegador recibe un uid anónimo distinto,
    // así que una pestaña olvidada podría dejar la sala trancada).
    const libre = (j, m) => !j[m] || j[m].uid === this.uid || j[m].online !== true;
    const jp = base.jugadores || {};
    if (!libre(jp,'A') && !libre(jp,'B')){
      throw new Error('La sala está llena: ' +
        (jp.A.nombre || 'alguien') + ' y ' + (jp.B.nombre || 'alguien') + ' están dentro.');
    }

    const r = await this.fb.runTransaction(this.nodo('salas/' + codigo), actual => {
      const s = actual || base;
      if (!s) return;
      const j = s.jugadores || {};
      const tomar = m => { j[m] = { uid:this.uid, nombre, online:true }; s.jugadores = j; return s; };
      if (j.A && j.A.uid === this.uid) return tomar('A');     // reconexión
      if (j.B && j.B.uid === this.uid) return tomar('B');
      if (libre(j,'A')) return tomar('A');
      if (libre(j,'B')) return tomar('B');
      return;
    });
    if (!r.committed) throw new Error('No se pudo entrar, inténtalo otra vez.');

    const s = r.snapshot.val();
    this._sentarse(codigo, (s.jugadores.A && s.jugadores.A.uid === this.uid) ? 'A' : 'B');
    return this.rol;
  }

  _sentarse(codigo, rol){
    this.codigo = codigo;
    this.rol = rol;
    const luz = this.nodo(`salas/${codigo}/jugadores/${rol}/online`);
    this.fb.set(luz, true);
    this.fb.onDisconnect(luz).set(false);
    this._quitar = this.fb.onValue(this.nodo('salas/' + codigo), snap => {
      this.ultimo = snap.val();
      this._oyentes.forEach(cb => cb(this.ultimo));
    });
  }

  /* ── Lectura y escritura ───────────────────────────────── */
  alCambiar(cb){ this._oyentes.push(cb); if (this.ultimo) cb(this.ultimo); }

  /**
   * Transacción sobre la sala. `fn` recibe el objeto y lo modifica.
   * Si devuelve false, se cancela sin escribir nada.
   * Nunca devolvemos null desde dentro: en Firebase eso borraría la sala.
   */
  async actualizar(fn){
    if (!this.codigo) return false;
    const r = await this.fb.runTransaction(this.nodo('salas/' + this.codigo), actual => {
      const s = actual || this.ultimo;
      if (!s) return;
      return fn(s) === false ? undefined : s;
    });
    return r.committed;
  }

  async cambiarNombre(nuevo){
    nuevo = (nuevo || '').trim().slice(0,12);
    if (!nuevo || !this.codigo) return false;
    localStorage.setItem('nombreJugador', nuevo);
    await this.fb.set(this.nodo(`salas/${this.codigo}/jugadores/${this.rol}/nombre`), nuevo);
    return true;
  }

  /** Escritura directa, sin transacción: para datos de alta frecuencia
   *  como la posición en una carrera, donde el último valor es el bueno. */
  escribir(subruta, valor){
    if (!this.codigo) return Promise.resolve();
    return this.fb.set(this.nodo(`salas/${this.codigo}/${subruta}`), valor);
  }

  jugador(rol){ return (this.ultimo && this.ultimo.jugadores && this.ultimo.jugadores[rol]) || null; }
  nombre(rol){ const j = this.jugador(rol); return (j && j.nombre) || (rol === 'A' ? 'Jugador 1' : 'Jugador 2'); }
  enLinea(rol){ const j = this.jugador(rol); return !!(j && j.online); }
  get completa(){ return !!(this.jugador('A') && this.jugador('B')); }

  /* ── Nodos privados (datos ocultos al rival) ───────────── */
  async guardarSecreto(datos){
    await this.fb.set(this.nodo(`secretos/${this.codigo}/${this.rol}`), { uid:this.uid, ...datos });
  }
  async leerSecreto(){
    // Si el nodo todavía no existe, la regla de propiedad compara contra null
    // y Firebase responde "permission denied". No es un fallo: simplemente
    // aún no hemos guardado nada.
    try{
      const s = await this.fb.get(this.nodo(`secretos/${this.codigo}/${this.rol}`));
      return s.exists() ? s.val() : null;
    } catch(e){ return null; }
  }

  /* ── Salida ────────────────────────────────────────────── */
  salir(){
    if (this._quitar) this._quitar();
    if (this.codigo && this.rol)
      this.fb.set(this.nodo(`salas/${this.codigo}/jugadores/${this.rol}/online`), false);
    this._quitar = null; this._oyentes = [];
    this.codigo = null; this.rol = null; this.ultimo = null;
  }

  enlace(){ return location.origin + location.pathname + '#' + this.codigo; }

  async compartir(titulo){
    const url = this.enlace();
    if (navigator.share){ await navigator.share({ title:titulo, text:titulo + ': ' + url, url }); return 'compartido'; }
    await navigator.clipboard.writeText(url);
    return 'copiado';
  }
}
