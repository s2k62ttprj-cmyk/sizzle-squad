// All sound is synthesised with the Web Audio API (no audio files to load).
// iOS Safari only allows audio after a user gesture, so unlock() runs on the first touch.
export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.musicOn = false;
    this.zone = 'farm';         // 'farm' | 'gurdwara'
    this.nextBeat = 0;
    this.step = 0;
    this.engine = null;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = window.__ac || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.sfxGain = ctx.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain(); this.musicGain.connect(this.master);
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0; this.droneGain.connect(this.musicGain);
    this.applyVolumes();
    // noise buffer reused for footsteps, water, rain, soil
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startDrone();
    this.nextBeat = ctx.currentTime + 0.2;
    // a silent buffer kick-starts output on older iOS
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const st = this.game.state?.settings || { music: 0.45, sfx: 0.8 };
    this.sfxGain.gain.value = st.sfx;
    this.musicGain.gain.value = st.music * 0.5;
  }

  suspend(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend(); else this.ctx.resume();
  }

  // ---------- primitives
  tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, delay = 0, dest = null } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  burst(dur, { freq = 1200, q = 1, vol = 0.3, type = 'bandpass', delay = 0, slide = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- game sounds
  play(name) {
    if (!this.ctx || this.game.simulating) return;
    switch (name) {
      case 'step': this.burst(0.06, { freq: 700, q: 0.8, vol: 0.06 }); break;
      case 'till': this.burst(0.14, { freq: 300, q: 1.2, vol: 0.35 }); this.tone(90, 0.12, { type: 'triangle', vol: 0.25, slide: 0.6 }); break;
      case 'plant': this.tone(520, 0.08, { type: 'triangle', vol: 0.15 }); this.burst(0.08, { freq: 2400, vol: 0.06, delay: 0.03 }); break;
      case 'water': this.burst(0.4, { freq: 1800, q: 0.6, vol: 0.18, slide: 0.5 }); break;
      case 'harvest': this.tone(660, 0.09, { type: 'triangle', vol: 0.22 }); this.tone(990, 0.12, { type: 'triangle', vol: 0.18, delay: 0.06 }); this.burst(0.1, { freq: 3000, vol: 0.08 }); break;
      case 'pop': this.tone(820 + Math.random() * 200, 0.06, { type: 'triangle', vol: 0.12 }); break;
      case 'coin': this.tone(1320, 0.12, { type: 'square', vol: 0.06 }); this.tone(1760, 0.18, { type: 'square', vol: 0.05, delay: 0.07 }); break;
      case 'cash': this.burst(0.12, { freq: 4000, q: 2, vol: 0.12 }); this.tone(1568, 0.1, { type: 'triangle', vol: 0.12, delay: 0.04 }); break;
      case 'buy': [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.18, delay: i * 0.07 })); break;
      case 'level': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.2, delay: i * 0.09 })); break;
      case 'error': this.tone(220, 0.18, { type: 'square', vol: 0.08, slide: 0.7 }); break;
      case 'click': this.tone(900, 0.04, { type: 'triangle', vol: 0.1 }); break;
      case 'cluck': this.tone(700, 0.07, { type: 'square', vol: 0.05, slide: 1.4 }); this.tone(820, 0.06, { type: 'square', vol: 0.04, delay: 0.09, slide: 1.3 }); break;
      case 'moo': this.tone(110, 0.9, { type: 'sawtooth', vol: 0.08, attack: 0.15, slide: 0.75 }); break;
      case 'baa': this.tone(320, 0.5, { type: 'sawtooth', vol: 0.05, attack: 0.05, slide: 0.9 }); break;
      case 'bird': { const f = 2200 + Math.random() * 1200; this.tone(f, 0.08, { vol: 0.05, slide: 1.3 }); this.tone(f * 1.1, 0.1, { vol: 0.04, delay: 0.12, slide: 0.8 }); break; }
      case 'bell': [880, 1320].forEach((f, i) => this.tone(f, 2.2, { vol: 0.12 - i * 0.04, attack: 0.002 })); break;
      case 'bless': [587, 740, 880, 1175].forEach((f, i) => this.tone(f, 1.4, { vol: 0.1, delay: i * 0.15, attack: 0.05 })); break;
      case 'engine': this.tone(80, 0.5, { type: 'sawtooth', vol: 0.12, slide: 1.8 }); break;
      case 'horn': this.tone(440, 0.25, { type: 'square', vol: 0.08 }); this.tone(554, 0.25, { type: 'square', vol: 0.06 }); break;
    }
  }

  // Continuous engine note while driving
  setEngine(on, speed = 0, low = 1) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (on && !this.engine) {
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0;
      lfo.frequency.value = 18; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
      o.connect(f); f.connect(g); g.connect(this.sfxGain);
      o.start(); lfo.start();
      this.engine = { o, f, g, lfo };
    }
    if (!this.engine) return;
    const t = c.currentTime;
    if (!on) {
      this.engine.g.gain.setTargetAtTime(0, t, 0.1);
      const e = this.engine; this.engine = null;
      setTimeout(() => { try { e.o.stop(); e.lfo.stop(); } catch { /* already stopped */ } }, 400);
      return;
    }
    this.engine.o.frequency.setTargetAtTime((42 + speed * 9) * low, t, 0.1);
    this.engine.lfo.frequency.setTargetAtTime(12 + speed * 3, t, 0.1);
    this.engine.g.gain.setTargetAtTime(0.09, t, 0.1);
  }

  // Gurdwara: soft harmonium-like drone (Sa–Pa) fades in near the darbar
  startDrone() {
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(this.droneGain);
    for (const [hz, v] of [[146.8, 0.12], [220, 0.08], [293.7, 0.05], [147.6, 0.1]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz; g.gain.value = v;
      o.connect(g); g.connect(f); o.start();
    }
    const trem = c.createOscillator(), tg = c.createGain();
    trem.frequency.value = 4.2; tg.gain.value = 0.15; trem.connect(tg); tg.connect(this.droneGain.gain);
    trem.start();
  }

  // Generative countryside tune: tumbi-style plucks over a soft dhol pulse (D major pentatonic)
  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx;
    const inG = this.zone === 'gurdwara';
    this.droneGain.gain.setTargetAtTime(inG ? 0.35 : 0, c.currentTime, 0.8);
    const beat = 0.34;
    while (this.nextBeat < c.currentTime + 0.25) {
      const t = this.nextBeat - c.currentTime, s = this.step++;
      if (!inG) {
        const bar = Math.floor(s / 16) % 4, k = s % 16;
        if (k % 4 === 0) this.tone(k % 8 === 0 ? 80 : 110, 0.22, { vol: 0.35, slide: 0.5, delay: t, dest: this.musicGain });
        if (k % 4 === 2) this.burst(0.05, { freq: 2500, vol: 0.05, delay: t });
        const scale = [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3, 740];
        const pattern = [[0, 2, 4, 2, 5, 4, 2, 1], [3, 4, 5, 7, 5, 4, 3, 2], [0, 2, 4, 5, 4, 2, 1, 0], [4, 5, 7, 5, 4, 2, 4, 0]][bar];
        if (k % 2 === 0 && (k % 8 !== 6 || bar % 2)) {
          const n = scale[pattern[k / 2 | 0]];
          this.tone(n, 0.28, { type: 'triangle', vol: 0.12, delay: t, dest: this.musicGain });
          this.tone(n * 2, 0.12, { type: 'square', vol: 0.025, delay: t, dest: this.musicGain });
        }
        if (k === 0) this.tone(146.8, beat * 15, { type: 'triangle', vol: 0.06, attack: 0.3, delay: t, dest: this.musicGain });
      }
      this.nextBeat += beat;
    }
  }
}
