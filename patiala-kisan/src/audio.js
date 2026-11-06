// All sound is synthesised with the Web Audio API (no audio files to load).
// iOS Safari only allows audio after a user gesture, so unlock() runs on the first touch.
//
// Every area has its own music and ambience: a tumbi folk tune in the fields, a dhol-heavy
// bhangra beat at the mandi, a harmonium drone with soft tabla at the Gurdwara, a slow
// algoza flute by the Bhakhra canal, a festive shehnai at Gopal's Sweets, a playful
// cowbell tune by the animals, the chakki rhythm at the workshops and truck-radio bhangra
// under the 22 No. flyover. Water, crowd, traffic and sizzling ambience fade with distance.
import { ambienceAt } from './world.js';

const SA = 293.66;                                 // Sa = D
const note = (n) => SA * Math.pow(2, n / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];         // D E F# A B D' E' F#'
const BILAWAL = [0, 2, 4, 5, 7, 9, 11, 12];        // D major (kirtan, shehnai)
const KAFI = [0, 2, 3, 5, 7, 9, 10, 12];           // the algoza's folk mode

// Each style plays one 16-step bar at a time; step is the length of a step in seconds.
const STYLES = {
  // fields: tumbi plucks over a soft dhol pulse
  farm: {
    step: 0.34,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.dhol(t, k % 8 === 0 ? 'dha' : 'ge', 0.8);
      if (k % 4 === 2) a.chimta(t, 0.5);
      const pat = [[0, 2, 4, 2, 5, 4, 2, 1], [3, 4, 5, 7, 5, 4, 3, 2], [0, 2, 4, 5, 4, 2, 1, 0], [4, 5, 7, 5, 4, 2, 4, 0]][bar];
      if (k % 2 === 0 && (k % 8 !== 6 || bar % 2)) a.tumbi(note(PENTA[pat[k / 2 | 0]]), t);
      if (k === 0) a.tone(note(-12), 0.34 * 15, { type: 'triangle', vol: 0.06, attack: 0.3, delay: t, dest: a.musicGain });
    },
  },
  // mandi: fast bhangra, dhol on every beat, chimta jingles, a repeating tumbi riff
  mandi: {
    step: 0.25,
    play(a, k, bar, t) {
      if ([0, 3, 6, 8, 11, 14].includes(k)) a.dhol(t, k === 0 || k === 8 ? 'dha' : 'ge', 1);
      if (k % 4 === 2) a.dhol(t, 'ta', 0.7);
      if (k % 2 === 1) a.chimta(t, 0.8);
      const riff = bar % 2 ? [6, 6, 7, 6, 5, 4, 5, 6] : [5, 5, 7, 5, 4, 2, 4, 5];
      if (k % 2 === 0) a.tumbi(note(PENTA[riff[k / 2 | 0]] + (bar === 3 && k > 8 ? 2 : 0)), t, 0.13);
      if (k % 8 === 0) a.tone(note(PENTA[riff[0]] - 24), 0.45, { type: 'square', vol: 0.05, delay: t, dest: a.musicGain });
    },
  },
  // Gurdwara: harmonium drone (always on here) with a slow, gentle melody and soft tabla
  gurdwara: {
    step: 0.5,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.tabla(t, k % 8 === 0 ? 'ge' : 'na', 0.5);
      if (k % 4 === 2) a.tabla(t, 'na', 0.3);
      const mel = [[0, 2, 4, 4, 5, 4, 2, 0], [4, 5, 7, 7, 5, 4, 2, 4], [7, 5, 4, 5, 4, 2, 0, 2], [0, 2, 4, 2, 1, 0, 0, 0]][bar];
      if (k % 2 === 0 && k % 8 !== 6) a.harmonium(note(BILAWAL[mel[k / 2 | 0]]), t, 0.9);
    },
  },
  // Bhakhra canal: slow, breathy algoza flute, no drums
  canal: {
    step: 0.42,
    play(a, k, bar, t) {
      const mel = [[4, -1, 5, 4, 2, -1, 0, -1], [2, 3, 4, -1, 3, 2, 0, -1], [5, 7, -1, 5, 4, 3, 2, -1], [0, 2, 3, 2, 0, -1, -1, -1]][bar];
      if (k % 2 === 0) { const n = mel[k / 2 | 0]; if (n >= 0) a.flute(note(KAFI[n] + 12), t, 0.8); }
      if (k === 0) a.flute(note(KAFI[0]), t, 4.5, 0.03);
    },
  },
  // Gopal's Sweets: festive shehnai over a light dholak
  sweets: {
    step: 0.3,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.dhol(t, 'ge', 0.5);
      if (k % 4 === 2 || k % 4 === 3) a.dhol(t, 'ta', 0.4);
      const mel = [[4, 5, 7, 5, 4, 4, 2, 4], [5, 7, 7, 7, 5, 4, 5, 4], [4, 2, 0, 2, 4, 5, 4, 2], [2, 4, 2, 0, 0, -1, 0, -1]][bar];
      if (k % 2 === 0) { const n = mel[k / 2 | 0]; if (n >= 0) a.shehnai(note(BILAWAL[n] + 12), t, 0.55); }
    },
  },
  // animals: a bouncy marimba tune with cowbells
  animals: {
    step: 0.3,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.cowbell(t, 0.6);
      if (k % 8 === 4) a.dhol(t, 'ge', 0.5);
      const mel = [[0, 2, 4, 2, 0, 2, 4, 7], [5, 4, 2, 4, 5, 4, 2, 0], [0, 4, 2, 4, 7, 5, 4, 2], [4, 2, 0, 2, 0, -1, 0, -1]][bar];
      if (k % 2 === 0) { const n = mel[k / 2 | 0]; if (n >= 0) a.marimba(note(PENTA[n]), t); }
    },
  },
  // workshops: the thump of the chakki, metal clinks and a working-song bass
  workshops: {
    step: 0.32,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.thud(t);
      if (k % 4 === 2) a.clank(t);
      if (k % 2 === 1 && Math.random() < 0.5) a.chimta(t, 0.35);
      const bass = [0, 0, 3, 3, 5, 5, 3, 2][(bar * 2 + (k >> 3)) % 8];
      if (k % 4 === 0) a.tumbi(note(PENTA[bass] - 12), t, 0.12);
      if (k % 8 === 6) a.tumbi(note(PENTA[(bass + 2) % 8]), t, 0.08);
    },
  },
  // under the flyover: a truck radio blasting bhangra
  flyover: {
    step: 0.24,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.dhol(t, 'dha', 1.2);
      if (k % 4 === 2) a.dhol(t, 'ta', 0.8);
      if (k % 2 === 1) a.chimta(t, 0.6);
      const riff = [2, 4, 5, 4, 2, 0, 2, 4];
      if (k % 2 === 0) a.tone(note(PENTA[riff[k / 2 | 0]] + (bar % 2 ? 2 : 0)), 0.16, { type: 'square', vol: 0.05, delay: t, dest: a.radio });
      if (k % 4 === 0) a.tone(note(-24 + (bar % 2 ? 5 : 0)), 0.3, { type: 'sawtooth', vol: 0.09, delay: t, dest: a.radio });
    },
  },
};

export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.zone = 'farm';
    this.style = 'farm';
    this.nextBeat = 0;
    this.step = 0;
    this.engine = null;
    this.ambT = 0;
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
    this.ambGain = ctx.createGain(); this.ambGain.connect(this.master);
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0; this.droneGain.connect(this.musicGain);
    // tinny "truck radio" filter for the flyover tune
    this.radio = ctx.createBiquadFilter(); this.radio.type = 'bandpass'; this.radio.frequency.value = 900; this.radio.Q.value = 0.6;
    const rg = ctx.createGain(); rg.gain.value = 1.6; this.radio.connect(rg); rg.connect(this.musicGain);
    this.applyVolumes();
    // noise buffer reused for footsteps, water, rain, soil and the ambience beds
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startDrone();
    this.startAmbience();
    this.nextBeat = ctx.currentTime + 0.2;
    // a silent buffer kick-starts output on older iOS
    const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const st = this.game.state?.settings || { music: 0.45, sfx: 0.8 };
    this.sfxGain.gain.value = st.sfx;
    this.ambGain.gain.value = st.sfx * 0.9;
    this.musicGain.gain.value = st.music * 0.5;
  }

  suspend(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend(); else this.ctx.resume();
  }

  // ---------- primitives
  tone(freq, dur, { type = 'sine', vol = 0.3, attack = 0.005, slide = 0, delay = 0, dest = null } = {}) {
    if (!this.ctx || !Number.isFinite(freq)) return;
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
  burst(dur, { freq = 1200, q = 1, vol = 0.3, type = 'bandpass', delay = 0, slide = 0, dest = null } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  // a held note with vibrato through a filter (flute, shehnai, harmonium)
  voice(freq, dur, { type = 'sine', vol = 0.1, attack = 0.06, delay = 0, vib = 0, vibRate = 5.5, filter = 0, q = 1, detune = 0, dest = null } = {}) {
    if (!this.ctx || !Number.isFinite(freq)) return;
    const c = this.ctx, t = c.currentTime + delay;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filter; f.Q.value = q; g.connect(f); out = f; }
    out.connect(dest || this.musicGain);
    const oscs = detune ? [-detune, detune] : [0];
    for (const dt of oscs) {
      const o = c.createOscillator();
      o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = dt;
      if (vib) {
        const l = c.createOscillator(), lg = c.createGain();
        l.frequency.value = vibRate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * vib, t + Math.min(0.3, dur / 2));
        l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
      }
      o.connect(g); o.start(t); o.stop(t + dur + 0.05);
    }
  }

  // ---------- instruments (music bus)
  tumbi(f, t, vol = 0.12) {
    this.tone(f, 0.28, { type: 'triangle', vol, delay: t, dest: this.musicGain });
    this.tone(f * 2, 0.12, { type: 'square', vol: vol * 0.2, delay: t, dest: this.musicGain });
  }
  dhol(t, kind, k = 1) {
    const m = this.musicGain;
    if (kind === 'dha') this.tone(78, 0.3, { vol: 0.42 * k, slide: 0.5, delay: t, dest: m });
    else if (kind === 'ge') this.tone(112, 0.2, { vol: 0.3 * k, slide: 0.55, delay: t, dest: m });
    else this.burst(0.06, { freq: 1800, q: 1.5, vol: 0.14 * k, delay: t, dest: m });
  }
  chimta(t, k = 1) { this.burst(0.05, { freq: 6500, q: 3, vol: 0.05 * k, delay: t, dest: this.musicGain }); this.tone(5200 + Math.random() * 400, 0.05, { type: 'square', vol: 0.006 * k, delay: t, dest: this.musicGain }); }
  tabla(t, kind, k = 1) {
    if (kind === 'ge') this.tone(130, 0.35, { vol: 0.22 * k, slide: 0.6, delay: t, dest: this.musicGain });
    else this.tone(392, 0.16, { type: 'triangle', vol: 0.1 * k, delay: t, dest: this.musicGain });
  }
  harmonium(f, t, dur) { this.voice(f, dur, { type: 'sawtooth', vol: 0.035, attack: 0.08, delay: t, detune: 6, filter: 1100, q: 0.7 }); }
  flute(f, t, dur, vol = 0.07) {
    this.voice(f, dur, { type: 'sine', vol, attack: 0.09, delay: t, vib: 0.012, vibRate: 5 });
    this.burst(Math.min(0.25, dur), { freq: f * 2, q: 4, vol: vol * 0.25, delay: t, dest: this.musicGain });
  }
  shehnai(f, t, dur) { this.voice(f, dur, { type: 'sawtooth', vol: 0.06, attack: 0.04, delay: t, vib: 0.02, vibRate: 6.5, filter: 1500, q: 2.2 }); }
  marimba(f, t) { this.tone(f, 0.3, { vol: 0.1, delay: t, dest: this.musicGain }); this.tone(f * 4, 0.08, { vol: 0.02, delay: t, dest: this.musicGain }); }
  cowbell(t, k = 1) { this.tone(545, 0.25, { type: 'square', vol: 0.02 * k, delay: t, dest: this.musicGain }); this.tone(820, 0.2, { type: 'square', vol: 0.016 * k, delay: t, dest: this.musicGain }); }
  thud(t) { this.tone(62, 0.22, { vol: 0.4, slide: 0.6, delay: t, dest: this.musicGain }); this.burst(0.08, { freq: 300, vol: 0.08, delay: t, dest: this.musicGain }); }
  clank(t) { this.tone(1250, 0.12, { type: 'triangle', vol: 0.05, delay: t, dest: this.musicGain }); this.tone(1870, 0.1, { type: 'triangle', vol: 0.03, delay: t, dest: this.musicGain }); }

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
      // reviews: a happy sparkle for good ones, a sad trombone for the bad ones
      case 'yay': [784, 988, 1319].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.08 })); break;
      case 'womp': [392, 370, 349, 311].forEach((f, i) => this.voice(f * 0.5, i === 3 ? 0.9 : 0.32, { type: 'sawtooth', vol: 0.05, attack: 0.03, delay: i * 0.3, vib: i === 3 ? 0.03 : 0, vibRate: 7, filter: 900, q: 1, dest: this.sfxGain })); break;
      // vendors ring a cycle bell; trucks on the flyover blow their horns
      case 'tring': for (let i = 0; i < 2; i++) { this.tone(2350, 0.25, { type: 'triangle', vol: 0.08, delay: i * 0.16 }); this.tone(3130, 0.2, { vol: 0.04, delay: i * 0.16 }); } break;
      case 'honk': this.voice(310, 0.65, { type: 'sawtooth', vol: 0.05, attack: 0.02, detune: 30, filter: 800, q: 0.8, dest: this.sfxGain }); this.voice(390, 0.65, { type: 'sawtooth', vol: 0.04, attack: 0.02, filter: 900, q: 0.8, dest: this.sfxGain }); break;
      case 'beep': for (let i = 0; i < 2; i++) this.tone(620, 0.12, { type: 'square', vol: 0.04, delay: i * 0.17 }); break;
      case 'whoosh': this.burst(0.9, { freq: 300, q: 0.7, vol: 0.12, slide: 3 }); break;
      case 'splash': this.burst(0.35, { freq: 900, q: 0.5, vol: 0.12, slide: 0.4 }); this.tone(500, 0.1, { vol: 0.04, slide: 1.8, delay: 0.04 }); break;
      case 'frog': for (let i = 0; i < 3; i++) this.tone(140, 0.07, { type: 'square', vol: 0.03, delay: i * 0.09, slide: 0.8 }); break;
      case 'sizzle': for (let i = 0; i < 6; i++) this.burst(0.03, { freq: 5000 + Math.random() * 3000, q: 2, vol: 0.05, delay: Math.random() * 0.5, type: 'highpass' }); break;
      case 'chatter': { const f = 180 + Math.random() * 160; for (let i = 0; i < 3; i++) this.voice(f * (1 + (Math.random() - 0.5) * 0.3), 0.12, { type: 'sawtooth', vol: 0.012, attack: 0.02, delay: i * 0.13, filter: 900 + Math.random() * 500, q: 3, dest: this.sfxGain }); break; }
      case 'eat': this.tone(300, 0.07, { type: 'triangle', vol: 0.12 }); this.tone(260, 0.07, { type: 'triangle', vol: 0.12, delay: 0.12 }); this.tone(660, 0.25, { type: 'triangle', vol: 0.1, delay: 0.3, slide: 1.5 }); break;
      case 'trade': [659, 880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 0.4, { vol: 0.08, delay: i * 0.06, attack: 0.01 })); break;
      case 'chug': this.tone(55, 0.15, { type: 'sawtooth', vol: 0.06, slide: 1.4 }); break;
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

  // Looping noise beds: flowing water, mandi crowd, flyover traffic, sizzling kadahi
  startAmbience() {
    const c = this.ctx;
    const bed = (type, freq, q, lfoHz = 0, lfoAmt = 0) => {
      const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      const m = c.createGain(); m.gain.value = 1;
      s.connect(f); f.connect(m); m.connect(g); g.connect(this.ambGain);
      if (lfoHz) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = lfoHz; lg.gain.value = lfoAmt; l.connect(lg); lg.connect(m.gain); l.start(); }
      s.start(0, Math.random());
      return g;
    };
    this.amb = {
      water: bed('bandpass', 650, 0.6, 0.35, 0.45),
      crowd: bed('bandpass', 750, 1.4, 0.9, 0.6),
      traffic: bed('lowpass', 170, 0.7, 0.13, 0.35),
      sizzle: bed('highpass', 4200, 0.7, 7, 0.8),
    };
    this.ambVol = { water: 0.16, crowd: 0.07, traffic: 0.3, sizzle: 0.035 };
  }

  // The area must hold for a moment before the music switches, so walking along a
  // border doesn't flip the tune back and forth.
  setZone(z, dt) {
    if (z === this.zone) { this.pending = null; return; }
    if (this.pending !== z) { this.pending = z; this.pendingT = 0; }
    this.pendingT += dt;
    if (this.pendingT > 1.2) { this.zone = z; this.pending = null; }
  }

  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, g = this.game;
    const inG = this.style === 'gurdwara';
    this.droneGain.gain.setTargetAtTime(inG ? 0.32 : 0, c.currentTime, 0.8);
    while (this.nextBeat < c.currentTime + 0.25) {
      // a new area starts its own tune from the top of a bar
      if (this.zone !== this.style) { this.style = this.zone; this.step = 0; this.bar = -1; }
      const k = this.step % 16;
      const S = STYLES[this.style] || STYLES.farm;
      if (k === 0) this.bar = ((this.bar ?? -1) + 1) % 4;
      try { S.play(this, k, this.bar, Math.max(0, this.nextBeat - c.currentTime)); } catch (e) { console.warn('music', e); }
      this.step++;
      this.nextBeat += S.step;
    }
    // ambience follows the player
    this.ambT -= dt;
    if (this.ambT <= 0 && this.amb) {
      this.ambT = 0.2;
      const p = g.player.pos, w = ambienceAt(p.x, p.z);
      for (const k in this.amb) this.amb[k].gain.setTargetAtTime((w[k] || 0) * this.ambVol[k], c.currentTime, 0.4);
      if (w.crowd > 0.35 && Math.random() < 0.25) this.play('chatter');
      if (w.sizzle > 0.4 && Math.random() < 0.3) this.play('sizzle');
      if (w.water > 0.5 && Math.random() < 0.02) this.play(Math.random() < 0.5 ? 'frog' : 'splash');
    }
  }
}
