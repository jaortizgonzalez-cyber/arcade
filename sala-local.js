// ─────────────────────────────────────────────────────────────
//  sala-local.js — Una sala que vive en memoria, sin Firebase.
//
//  Implementa la misma interfaz que `Sala`, así que los juegos
//  no necesitan saber si el rival es una persona al otro lado
//  de internet o un robot en este mismo dispositivo.
// ─────────────────────────────────────────────────────────────

export class SalaLocal {
  constructor(juego, estado, nombres = {}){
    this.juego  = juego;
    this.codigo = 'SOLO';
    this.rol    = 'A';
    this.uid    = 'local';
    this.esLocal = true;
    this._oyentes = [];
    this._secretos = {};
    this._avisando = false;
    this.ultimo = {
      juego, creada: Date.now(),
      jugadores: {
        A: { uid:'local', nombre: nombres.A || 'Tú',     online:true },
        B: { uid:'robot', nombre: nombres.B || 'Robot',  online:true }
      },
      estado
    };
  }

  get rival(){ return 'B'; }
  get roles(){ return Object.keys(this.ultimo.jugadores); }
  ocupados(){ return this.roles; }
  presentes(){ return this.roles; }
  otros(){ return this.roles.filter(r => r !== this.rol); }
  get completa(){ return true; }
  get activa(){ return true; }

  jugador(rol){ return this.ultimo.jugadores[rol]; }
  nombre(rol){ const j = this.jugador(rol); return (j && j.nombre) || rol; }
  enLinea(){ return true; }

  alJugador(){}                      // en solitario nadie entra ni sale

  alCambiar(cb){ this._oyentes.push(cb); cb(this.ultimo); }

  /** Aplaza el aviso para que un oyente pueda modificar el estado
   *  sin provocar una cadena de notificaciones dentro de sí misma. */
  _avisar(){
    if (this._avisando) return;
    this._avisando = true;
    queueMicrotask(() => {
      this._avisando = false;
      const s = this.ultimo;
      this._oyentes.forEach(cb => cb(s));
    });
  }

  async actualizar(fn){
    if (fn(this.ultimo) === false) return false;
    this._avisar();
    return true;
  }

  escribir(ruta, valor){
    const partes = ruta.split('/');
    let o = this.ultimo;
    for (let i = 0; i < partes.length - 1; i++){
      if (typeof o[partes[i]] !== 'object' || o[partes[i]] === null) o[partes[i]] = {};
      o = o[partes[i]];
    }
    o[partes[partes.length - 1]] = valor;
    this._avisar();
    return Promise.resolve();
  }

  guardarSecreto(datos){ this._secretos[this.rol] = datos; return Promise.resolve(); }
  leerSecreto(){ return Promise.resolve(this._secretos[this.rol] || null); }

  cambiarNombre(nuevo){
    nuevo = (nuevo || '').trim().slice(0,12);
    if (!nuevo) return Promise.resolve(false);
    this.ultimo.jugadores.A.nombre = nuevo;
    localStorage.setItem('nombreJugador', nuevo);
    this._avisar();
    return Promise.resolve(true);
  }

  salir(){ this._oyentes = []; }
  enlace(){ return location.href; }
  compartir(){ return Promise.resolve('copiado'); }
}
