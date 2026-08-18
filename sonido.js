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
    if (!this.activo){ this.patinar(false); if (this.motor) this.motorEstado(0,false,true); }
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

  /* ── Motor continuo ─────────────────────────────────────
     Un motor no es un "efecto" que se dispara: es una fuente que
     suena siempre y a la que se le cambia el tono y el timbre. */
  motorEncender(){
    if (!this._listo() || this.motor) return;
    const c = this.ctx, t = c.currentTime;

    const salida = c.createGain();
    salida.gain.value = 0;
    salida.connect(c.destination);

    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 700;
    filtro.Q.value = 3;
    filtro.connect(salida);

    // Cuerpo del motor: diente de sierra con un sub por debajo
    const osc = c.createOscillator();  osc.type = 'sawtooth'; osc.frequency.value = 60;
    const sub = c.createOscillator();  sub.type = 'square';   sub.frequency.value = 30;
    const gOsc = c.createGain(); gOsc.gain.value = 0.5;
    const gSub = c.createGain(); gSub.gain.value = 0.28;
    osc.connect(gOsc).connect(filtro);
    sub.connect(gSub).connect(filtro);

    // Aspereza: ruido filtrado que sube con las revoluciones
    const rasp = c.createBufferSource();
    rasp.buffer = this.ruido; rasp.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
    const gRasp = c.createGain(); gRasp.gain.value = 0.10;
    rasp.connect(bp).connect(gRasp).connect(filtro);

    osc.start(t); sub.start(t); rasp.start(t);
    this.motor = { salida, filtro, osc, sub, bp, vol:0 };
  }

  /**
   * @param {number} rpm 0..1 revoluciones
   * @param {boolean} gas si está acelerando
   * @param {boolean} suelo si toca el suelo (en el aire el motor se embala)
   */
  motorEstado(rpm, gas, suelo){
    const m = this.motor;
    if (!m || !this.ctx) return;
    const t = this.ctx.currentTime, s = 0.06;
    const r = Math.max(0, Math.min(1, rpm));
    // Sin carga (en el aire) el motor sube de vueltas aunque no avance
    const f = 48 + r*165 + (!suelo && gas ? 55 : 0);
    m.osc.frequency.setTargetAtTime(f, t, s);
    m.sub.frequency.setTargetAtTime(f/2, t, s);
    m.filtro.frequency.setTargetAtTime(420 + f*(gas ? 9 : 5), t, s);
    m.bp.frequency.setTargetAtTime(700 + f*7, t, s);
    const vol = this.activo ? (0.055 + r*0.075 + (gas ? 0.045 : 0)) : 0;
    m.salida.gain.setTargetAtTime(vol, t, 0.05);
  }

  motorApagar(){
    const m = this.motor;
    if (!m || !this.ctx) return;
    const t = this.ctx.currentTime;
    m.salida.gain.setTargetAtTime(0, t, 0.12);
    setTimeout(() => {
      try { m.osc.stop(); m.sub.stop(); } catch(e){}
      this.motor = null;
    }, 500);
  }

  /** Chirrido de frenada, sostenido mientras dure. */
  patinar(encendido){
    if (encendido && !this.derrape){
      if (!this._listo()) return;
      const c = this.ctx, t = c.currentTime;
      const src = c.createBufferSource(); src.buffer = this.ruido; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 2300; bp.Q.value = 7;
      const g = c.createGain(); g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.06);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      this.derrape = { src, g };
    } else if (!encendido && this.derrape){
      const { src, g } = this.derrape;
      const t = this.ctx.currentTime;
      g.gain.setTargetAtTime(0, t, 0.05);
      setTimeout(() => { try { src.stop(); } catch(e){} }, 300);
      this.derrape = null;
    }
  }

  /** Cañonazo: chasquido seco sobre un golpe grave. */
  canon(){
    if (!this._listo()) return;
    this._ruido(0.05, 'highpass', 4000, 2000, 0.35);
    this._ruido(0.45, 'lowpass', 1800, 70, 0.5);
    this._tono(0.35, 190, 45, 0.45);
  }

  /** Rebote metálico contra un muro. */
  rebote(){
    if (!this._listo()) return;
    const f = 1500 + Math.random()*900;
    this._tono(0.16, f, f*0.55, 0.13, 'triangle');
    this._ruido(0.10, 'bandpass', f*1.4, f*0.8, 0.14);
  }

  /** Tanque destruido: estallido con réplica y metralla. */
  estallido(){
    if (!this._listo()) return;
    this._ruido(0.9, 'lowpass', 2600, 55, 0.65);
    this._tono(0.7, 140, 30, 0.55);
    this._ruido(0.5, 'highpass', 2500, 5200, 0.16, 0.05);
    this._ruido(0.6, 'lowpass', 800, 50, 0.35, 0.16);
  }

  /** Puñetazo que conecta: golpe corto y carnoso. */
  golpe(){
    if (!this._listo()) return;
    this._ruido(0.09, 'lowpass', 1400, 260, 0.42);
    this._tono(0.11, 220, 70, 0.34);
  }

  /** Patada: más grave y con algo más de cuerpo. */
  patada(){
    if (!this._listo()) return;
    this._ruido(0.14, 'lowpass', 1100, 160, 0.48);
    this._tono(0.16, 160, 48, 0.4);
  }

  /** Golpe al aire. */
  fallo(){
    if (!this._listo()) return;
    this._ruido(0.13, 'bandpass', 900, 2600, 0.13);
  }

  /** Cuerpo que cae al suelo. */
  caida(){
    if (!this._listo()) return;
    this._ruido(0.3, 'lowpass', 600, 70, 0.4);
    this._tono(0.28, 110, 42, 0.3);
  }

  /** Aviso de oleada superada. */
  avance(){
    if (!this._listo()) return;
    [523, 659, 784].forEach((f,i) => this._tono(0.22, f, f, 0.17, 'triangle', i*0.09));
  }

  /** Fanfarria de victoria: arpegio ascendente sobre un retumbo. */
  victoria(){
    if (!this._listo()) return;
    const notas = [523, 659, 784, 1047];
    notas.forEach((f,i) => {
      this._tono(0.5, f, f, 0.22, 'triangle', i*0.13);
      this._tono(0.5, f/2, f/2, 0.12, 'sine', i*0.13);
    });
    this._tono(1.6, 1047, 1047, 0.2, 'triangle', 0.62);
    this._tono(1.6, 1568, 1568, 0.12, 'triangle', 0.62);
    this._tono(1.8, 262, 262, 0.22, 'sine', 0.62);
    this._ruido(0.8, 'lowpass', 2000, 70, 0.4);
    this._ruido(0.6, 'highpass', 3000, 6000, 0.12, 0.7);
  }

  /** Derrota: caída grave con retumbo largo. */
  derrota(){
    if (!this._listo()) return;
    [440, 392, 330, 262].forEach((f,i) =>
      this._tono(0.7, f, f*0.98, 0.2, 'sine', i*0.22));
    this._tono(2.2, 110, 55, 0.3, 'sine', 0.3);
    this._ruido(1.4, 'lowpass', 1200, 45, 0.45);
  }

  /** Aviso suave de "es tu turno". */
  turno(){
    if (!this._listo()) return;
    this._tono(0.12, 660, 880, 0.16, 'triangle');
    this._tono(0.14, 880, 1100, 0.12, 'triangle', 0.1);
  }
}
