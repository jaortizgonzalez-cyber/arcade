// ─────────────────────────────────────────────────────────────
//  sonido.js — Efectos sintetizados con Web Audio.
//  Sin archivos externos: todo se genera en el navegador, así
//  que no hay descargas ni dependencias que cargar.
// ─────────────────────────────────────────────────────────────

export class Sonido {
  constructor(clave = 'sonidoActivo'){
    this.clave = clave;
    this.activo = localStorage.getItem(clave) !== 'no';
    this.ctx = null;
    // Los navegadores solo dejan sonar tras un gesto del usuario.
    const abrir = () => this._abrir();
    ['pointerdown','keydown'].forEach(ev =>
      addEventListener(ev, abrir, { once:true, passive:true }));
  }

  _abrir(){
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Ruido blanco reutilizable: la base de explosiones y chapoteos.
    const n = this.ctx.sampleRate * 2;
    this.ruido = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
  }

  alternar(){
    this.activo = !this.activo;
    localStorage.setItem(this.clave, this.activo ? 'si' : 'no');
    if (this.activo) this._abrir();
    return this.activo;
  }

  _listo(){
    if (!this.activo) return false;
    this._abrir();
    return !!this.ctx;
  }

  _ruido(dur, tipo, f0, f1, vol, retraso = 0){
    const t = this.ctx.currentTime + retraso;
    const src = this.ctx.createBufferSource();
    src.buffer = this.ruido;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.setValueAtTime(f0, t);
    filtro.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filtro).connect(g).connect(this.ctx.destination);
    src.start(t); src.stop(t + dur + 0.05);
  }

  _tono(dur, f0, f1, vol, tipo = 'sine', retraso = 0){
    const t = this.ctx.currentTime + retraso;
    const osc = this.ctx.createOscillator();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  /** Impacto seco contra un barco. */
  explosion(){
    if (!this._listo()) return;
    this._ruido(0.55, 'lowpass', 1600, 90, 0.55);
    this._tono(0.45, 150, 40, 0.5);
  }

  /** Barco hundido: más grave, más larga y con réplica. */
  hundimiento(){
    if (!this._listo()) return;
    this._ruido(1.1, 'lowpass', 2200, 55, 0.65);
    this._tono(0.9, 120, 28, 0.6);
    this._ruido(0.7, 'lowpass', 900, 60, 0.4, 0.18);
    this._tono(1.4, 70, 22, 0.35, 'sine', 0.3);
  }

  /** Disparo al agua: chapoteo corto. */
  chapoteo(){
    if (!this._listo()) return;
    this._ruido(0.3, 'bandpass', 2400, 500, 0.35);
    this._tono(0.22, 700, 180, 0.18);
  }

  /** Aviso suave de "es tu turno". */
  turno(){
    if (!this._listo()) return;
    this._tono(0.12, 660, 880, 0.16, 'triangle');
    this._tono(0.14, 880, 1100, 0.12, 'triangle', 0.1);
  }
}
