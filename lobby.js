// ─────────────────────────────────────────────────────────────
//  lobby.js — Pantallas de entrada (menú, crear/unirse, espera).
//  Las inyecta cualquier juego para no repetir el mismo HTML.
// ─────────────────────────────────────────────────────────────

import { Sala } from './sala.js?v=4';
import { SalaLocal } from './sala-local.js?v=4';
import { configurado } from './config.js?v=4';

const HTML = `
<section class="pantalla activa" data-p="menu">
  <h1 data-titulo></h1>
  <p class="nota" data-lema></p>
  <button class="accion" data-b="online" id="b-online-txt">En línea · dos celulares</button>
  <button class="accion menta" data-b="solo" hidden>Un jugador</button>
  <button class="accion fantasma" data-b="local" hidden>Aquí mismo · dos en un dispositivo</button>
  <p class="aviso" data-aviso="config"></p>
</section>

<section class="pantalla" data-p="nivel">
  <a class="volver" href="#" data-b="atras2">← Atrás</a>
  <h1 data-titulo-nivel></h1>
  <p class="nota" data-lema-nivel></p>
  <div data-niveles></div>
</section>

<section class="pantalla" data-p="acceso">
  <a class="volver" href="#" data-b="atras">← Atrás</a>
  <h1>Sala <em>compartida</em></h1>
  <input class="campo" data-in="nombre" placeholder="Tu nombre" maxlength="12" autocomplete="off">
  <button class="accion" data-b="crear">Crear sala nueva</button>
  <p class="nota">o entra a la de tu pareja</p>
  <input class="campo codigo-in" data-in="codigo" placeholder="CÓDIGO" maxlength="4"
         autocomplete="off" autocapitalize="characters" spellcheck="false">
  <button class="accion menta" data-b="unir">Entrar</button>
  <p class="aviso" data-aviso="sala"></p>
</section>

<section class="pantalla" data-p="espera">
  <h1>Sala <em>lista</em></h1>
  <p class="nota">Pásale este código o mándale el enlace.</p>
  <div class="codigo" data-out="codigo">----</div>
  <button class="accion" data-b="compartir">Compartir enlace</button>
  <div class="lista-sala" data-out="dentro"></div>
  <p class="cargando puntitos" data-out="espera">Esperando a que entre</p>
  <button class="accion menta" data-b="entrar-ya" hidden>Entrar ya (los demás pueden llegar después)</button>
  <button class="accion fantasma" data-b="cancelar">Cancelar</button>
</section>`;

// Con más de dos puestos no tiene sentido bloquear al anfitrión hasta que
// estén todos: puede entrar y los demás se suman sobre la marcha.
const op_espera_manual = op => (op.maxJugadores || 2) > 2;

const NIVELES_POR_DEFECTO = [
  { n:1, t:'Principiante', d:'Comete errores seguido. Para entrar en calor.' },
  { n:2, t:'Intermedio',   d:'Juega bien y castiga los descuidos.' },
  { n:3, t:'Experto',      d:'Sin concesiones. Ganarle cuesta.' }
];

export class Lobby {
  /**
   * @param {object} op
   *  juego, titulo, lema, estadoInicial(), alEntrar(sala), alLocal()
   *  esperarRival: si es true, muestra la pantalla de espera hasta que llegue el rival
   */
  constructor(op){
    this.op = op;
    this.sala = new Sala(op.juego, op.maxJugadores || 2);
    this.caja = document.getElementById('lobby');
    this.caja.innerHTML = HTML;
    this._cablear();
  }

  $(sel){ return this.caja.querySelector(sel); }

  ver(p){
    this.caja.querySelectorAll('[data-p]').forEach(s => s.classList.toggle('activa', s.dataset.p === p));
    this.caja.hidden = false;
    document.querySelectorAll('[data-juego]').forEach(s => s.hidden = true);
  }

  /** Deja el código a la vista dentro del juego, para confirmar que
   *  todos están en la misma sala. */
  _chipCodigo(){
    if (document.querySelector('.chip-sala')) return;
    const ancla = document.querySelector('a.inicio');
    if (!ancla) return;
    const chip = document.createElement('span');
    chip.className = 'chip-sala';
    chip.textContent = 'Sala ' + this.sala.codigo;
    chip.title = 'Toca para copiar el enlace';
    chip.addEventListener('click', () => {
      this.sala.compartir(this.op.juego).catch(()=>{});
    });
    ancla.insertAdjacentElement('afterend', chip);
  }

  verJuego(){
    this.caja.hidden = true;
    document.querySelectorAll('[data-juego]').forEach(s => s.hidden = false);
  }

  _cablear(){
    const op = this.op;
    this.$('[data-titulo]').innerHTML = op.titulo;
    this.$('[data-lema]').textContent = op.lema || '¿Cómo quieren jugar?';
    this.$('[data-b="online"]').textContent = op.textoOnline ||
      (op.maxJugadores > 2 ? 'En línea · hasta ' + op.maxJugadores + ' jugadores'
                           : 'En línea · dos celulares');
    if (op.alLocal) this.$('[data-b="local"]').hidden = false;
    if (op.alSolo){
      this.$('[data-b="solo"]').hidden = false;
      this.$('[data-b="solo"]').textContent = op.textoSolo || '🤖 Solo · contra el robot';
    }

    // Pantalla de nivel: cada juego pone sus propios textos y niveles
    this.$('[data-titulo-nivel]').innerHTML = op.tituloNivel || 'Nivel del <em>robot</em>';
    this.$('[data-lema-nivel]').textContent = op.lemaNivel || '¿Qué tan duro lo quieres?';
    const caja = this.$('[data-niveles]');
    caja.innerHTML = '';
    (op.niveles || NIVELES_POR_DEFECTO).forEach(x => {
      const b = document.createElement('button');
      b.className = 'accion nivel';
      b.dataset.n = x.n;
      b.innerHTML = '<b>' + x.t + '</b><span>' + x.d + '</span>';
      caja.appendChild(b);
    });

    if (!configurado){
      this.$('[data-b="online"]').disabled = true;
      this.$('[data-aviso="config"]').textContent = 'El modo en línea necesita la configuración de Firebase en config.js';
    }

    this.$('[data-b="online"]').addEventListener('click', () => {
      this.$('[data-in="nombre"]').value = localStorage.getItem('nombreJugador') || '';
      this.ver('acceso');
    });
    if (op.alLocal) this.$('[data-b="local"]').addEventListener('click', () => { this.verJuego(); op.alLocal(); });
    if (op.alSolo){
      this.$('[data-b="solo"]').addEventListener('click', () => this.ver('nivel'));
      this.$('[data-b="atras2"]').addEventListener('click', e => { e.preventDefault(); this.ver('menu'); });
      this.caja.querySelectorAll('.nivel').forEach(b => b.addEventListener('click', () => {
        const nivel = +b.dataset.n;
        localStorage.setItem('nivelRobot', nivel);
        const nombre = localStorage.getItem('nombreJugador') || 'Tú';
        const nombreBot = typeof op.nombreRobot === 'function'
          ? op.nombreRobot(nivel) : (op.nombreRobot || 'Robot');
        const sala = new SalaLocal(op.juego, op.estadoInicial(), { A: nombre, B: nombreBot });
        this.verJuego();
        op.alSolo(sala, nivel);
      }));
    }
    this.$('[data-b="atras"]').addEventListener('click', e => { e.preventDefault(); this.ver('menu'); });
    this.$('[data-b="crear"]').addEventListener('click', () => this._crear());
    this.$('[data-b="unir"]').addEventListener('click', () => this._unir());
    this.$('[data-in="codigo"]').addEventListener('keydown', e => { if (e.key === 'Enter') this._unir(); });
    this.$('[data-b="cancelar"]').addEventListener('click', () => { this.sala.salir(); this.ver('menu'); });
    this.$('[data-b="entrar-ya"]').addEventListener('click', () => this.verJuego());
    this.$('[data-b="compartir"]').addEventListener('click', async () => {
      try{
        const r = await this.sala.compartir(op.juego);
        if (r === 'copiado') this.$('[data-b="compartir"]').textContent = '¡Enlace copiado!';
      } catch(e){}
    });

    this.$('[data-in="nombre"]').addEventListener('input', () => {
      this.$('[data-aviso="sala"]').textContent = '';
    });

    const codigo = (location.hash || '').replace('#','').toUpperCase();
    if (configurado && codigo.length === 4){
      this.$('[data-in="nombre"]').value = localStorage.getItem('nombreJugador') || '';
      this.$('[data-in="codigo"]').value = codigo;
      this.ver('acceso');
    }
  }

  /** Quién está dentro, en vivo, mientras se espera. */
  _listaSala(){
    const caja = this.$('[data-out="dentro"]');
    if (!caja) return;
    const dentro = this.sala.ocupados ? this.sala.ocupados() : [];
    caja.innerHTML = dentro.map(r =>
      '<span class="quien-sala"><i></i>' + this.sala.nombre(r) +
      (r === this.sala.rol ? ' (tú)' : '') + '</span>').join('');
    const espera = this.$('[data-out="espera"]');
    if (espera) espera.textContent = dentro.length < 2
      ? 'Esperando a que entre alguien'
      : dentro.length + ' dentro · pueden empezar cuando quieran';
  }

  _nombre(){
    const n = this.$('[data-in="nombre"]').value.trim();
    if (!n) return null;                       // obligatorio: sin nombre no se entra
    localStorage.setItem('nombreJugador', n);
    return n;
  }

  _pedirNombre(){
    this.$('[data-aviso="sala"]').textContent = 'Escribe tu nombre para que tu pareja sepa quién eres.';
    this.$('[data-in="nombre"]').focus();
  }

  async _crear(){
    this.$('[data-aviso="sala"]').textContent = '';
    const nombre = this._nombre();
    if (!nombre) return this._pedirNombre();
    try{
      const codigo = await this.sala.crear(nombre, this.op.estadoInicial());
      location.hash = codigo;
      this.$('[data-out="codigo"]').textContent = codigo;
      this._arrancar(true);
    } catch(e){ this.$('[data-aviso="sala"]').textContent = e.message; }
  }

  async _unir(){
    this.$('[data-aviso="sala"]').textContent = '';
    const nombre = this._nombre();
    if (!nombre) return this._pedirNombre();
    try{
      await this.sala.entrar(this.$('[data-in="codigo"]').value, nombre);
      location.hash = this.sala.codigo;
      this._arrancar(false);
    } catch(e){ this.$('[data-aviso="sala"]').textContent = e.message; }
  }

  _arrancar(recienCreada){
    // Quien crea la sala siempre pasa por la pantalla de espera: es donde
    // ve el código y el botón de compartir. Sin esto no tendría cómo invitar.
    if (recienCreada){
      this.ver('espera');
      if (op_espera_manual(this.op)) this.$('[data-b="entrar-ya"]').hidden = false;
      this.sala.alCambiar(() => {
        this._listaSala();
        if (this.sala.completa && !op_espera_manual(this.op)) this.verJuego();
      });
    } else {
      this.verJuego();
    }
    this._chipCodigo();
    this.op.alEntrar(this.sala);
  }
}
