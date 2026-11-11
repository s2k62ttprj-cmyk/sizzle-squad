// All sound is synthesised with the Web Audio API (no audio files to load).
// iOS Safari only allows audio after a user gesture, so unlock() runs on the first touch.
//
// Every area has its own music and ambience: a tumbi folk tune in the fields, a dhol-heavy
// bhangra beat at the mandi, a harmonium drone with soft tabla at the Gurdwara, a slow
// algoza flute by the Bhakhra canal, a festive shehnai at Gopal's Sweets, a playful
// cowbell tune by the animals, the chakki rhythm at the workshops and truck-radio bhangra
// under the 22 No. flyover. Water, crowd, traffic and sizzling ambience fade with distance.
import { ambienceAt } from './world.js';
import { SOUND_PACK } from './config.js';

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
      if (k === 0) a.tone(note(-12), 0.34 * 15, { type: 'triangle', vol: 0.06, attack: 0.3, delay: t, dest: a.mus });
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
      if (k % 8 === 0) a.tone(note(PENTA[riff[0]] - 24), 0.45, { type: 'square', vol: 0.05, delay: t, dest: a.mus });
    },
  },
  // Gurdwara: a slow, peaceful kirtan: the harmonium drone (always on here), long legato
  // harmonium phrases, a soft humming voice and a hushed tabla on the slow beats only
  gurdwara: {
    step: 0.62,
    play(a, k, bar, t) {
      if (k % 8 === 0) a.tabla(t, 'ge', 0.32);
      if (k % 8 === 4) a.tabla(t, 'na', 0.16);
      const mel = [[0, -1, 2, -1, 4, -1, 2, -1], [4, -1, 5, -1, 4, 2, 0, -1], [2, -1, 4, -1, 5, 4, 2, -1], [1, -1, 2, -1, 0, -1, -1, -1]][bar];
      if (k % 2 === 0) {
        const n = mel[k / 2 | 0];
        if (n >= 0) {
          const len = mel[(k / 2 | 0) + 1] === -1 ? 2.3 : 1.15;
          a.harmonium(note(BILAWAL[n]), t, len, 0.022);
          a.hum(note(BILAWAL[n] - 12), t, len);
        }
      }
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

// on the ring road: a cruising bhangra groove
STYLES.ring = {
  step: 0.26,
  play(a, k, bar, t) {
    if (k % 4 === 0) a.dhol(t, k % 8 === 0 ? 'dha' : 'ge', 0.9);
    if (k % 4 === 3) a.dhol(t, 'ta', 0.6);
    if (k % 2 === 1) a.chimta(t, 0.45);
    const riff = [[4, 5, 4, 2, 4, 5, 7, 5], [4, 5, 4, 2, 1, 2, 0, -1], [5, 7, 5, 4, 5, 7, 8, 7], [5, 4, 2, 1, 2, 0, -1, -1]][bar];
    if (k % 2 === 0) { const n = riff[k / 2 | 0]; if (n >= 0) a.tumbi(note(PENTA[n] || PENTA[7] + 2), t, 0.11); }
    if (k % 8 === 0) a.tone(note(PENTA[bar % 2 ? 3 : 0] - 24), 0.5, { type: 'triangle', vol: 0.12, delay: t, dest: a.mus });
  },
};
// silence: the radio is off, or the player plays their own music
STYLES.silent = { step: 1, play() {} };
STYLES.baradari = STYLES.canal || STYLES.farm;

// Patiala FM: the Bullet's radio. Original tracks made for the game; songs from your own
// music app (Spotify, YouTube Music, Apple Music…) can play over the game with "My music".
export const RADIO = [
  { name: 'Gerhi Route', mood: 'bhangra', style: {
    step: 0.25,
    play(a, k, bar, t) {
      if ([0, 3, 6, 8, 11, 14].includes(k)) a.dhol(t, k === 0 || k === 8 ? 'dha' : 'ge', 1);
      if (k % 4 === 2) a.dhol(t, 'ta', 0.7);
      if (k % 2 === 1) a.chimta(t, 0.6);
      const sec = bar >> 2, riff = sec ? [7, 5, 4, 5, 7, 5, 4, 2] : [4, 4, 5, 4, 2, 0, 2, 4];
      if (k % 2 === 0) a.tumbi(note(PENTA[riff[k / 2 | 0]] + (bar % 4 === 3 && k > 8 ? 2 : 0)), t, 0.13);
      if (k % 4 === 0) a.tone(note(PENTA[riff[k / 2 | 0]] - 24), 0.22, { type: 'square', vol: 0.045, delay: t, dest: a.mus });
    } } },
  { name: 'Bhakhra Kinare', mood: 'chill', style: {
    step: 0.36,
    play(a, k, bar, t) {
      if (k % 8 === 0) a.dhol(t, 'ge', 0.45);
      if (k % 8 === 5) a.dhol(t, 'ta', 0.3);
      const mel = [[4, -1, 5, 4, 2, -1, 0, -1], [2, 3, 4, -1, 5, 4, 3, -1], [5, 7, -1, 5, 4, 3, 2, -1], [0, 2, 3, 2, 0, -1, -1, -1]][bar % 4];
      if (k % 2 === 0) { const n = mel[k / 2 | 0]; if (n >= 0) a.flute(note(KAFI[n] + 12), t, 0.7, 0.06); }
      if (k === 0) a.harmonium(note(KAFI[bar % 2 ? 3 : 0]), t, 5.5, 0.018);
    } } },
  { name: 'Sardari Beat', mood: 'modern', style: {
    step: 0.21,
    play(a, k, bar, t) {
      if (k === 0 || k === 7 || (k === 10 && bar % 2)) a.kick(t);
      if (k === 4 || k === 12) a.snare(t);
      if (k % 2 === 0 || (bar % 2 && k % 4 === 3)) a.hat(t, k % 4 === 2 ? 1 : 0.6);
      const mel = [[7, -1, 5, -1, 4, 5, 4, -1], [7, -1, 8, 7, 5, -1, 4, -1]][bar % 2];
      if (k % 2 === 0) { const n = mel[k / 2 | 0]; if (n >= 0) a.tumbi(note(PENTA[n]), t, 0.1); }
      if (k === 0) a.tone(note(PENTA[bar % 4 < 2 ? 0 : 3] - 24), 0.9, { vol: 0.2, slide: 0.92, delay: t, dest: a.mus });
    } } },
  { name: 'Pind Di Yaad', mood: 'folk', style: {
    step: 0.3,
    play(a, k, bar, t) {
      if (k % 4 === 0) a.dhol(t, 'ge', 0.6);
      if (k % 4 === 2) a.dhol(t, 'ta', 0.45);
      const mel = [[0, 2, 4, 5, 4, 2, 4, -1], [5, 4, 2, 4, 2, 1, 0, -1], [4, 5, 7, 5, 4, 5, 4, 2], [2, 1, 0, 1, 0, -1, 0, -1]][bar % 4];
      if (k % 2 === 0) { const n = mel[k / 2 | 0]; if (n >= 0) { a.tumbi(note(BILAWAL[n]), t, 0.11); if (k % 4 === 0) a.harmonium(note(BILAWAL[n]), t, 0.55, 0.02); } }
    } } },
];

const LOUD = new Set(['honk', 'beep', 'whoosh', 'chug', 'horn', 'engine', 'tring', 'chatter']);

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
    // each area's tune plays through its own fader, so a new area crossfades in
    this.mus = ctx.createGain(); this.mus.connect(this.musicGain);
    this.ambGain = ctx.createGain(); this.ambGain.connect(this.master);
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0; this.droneGain.connect(this.musicGain);
    // tinny "truck radio" filter for the flyover tune
    this.radio = ctx.createBiquadFilter(); this.radio.type = 'bandpass'; this.radio.frequency.value = 900; this.radio.Q.value = 0.6;
    const rg = ctx.createGain(); rg.gain.value = 1.6; this.radio.connect(rg); rg.connect(this.mus);
    this.applyVolumes();
    // noise buffer reused for footsteps, water, rain, soil and the ambience beds
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startDrone();
    this.startAmbience();
    if (SOUND_PACK) this.loadSamples();
    if (this.game.state?.settings.ownMusic) this.setOwnMusic(true);
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
  // thunder: a sharp crack, then a long low rumble, a little after the flash (further away: later and softer)
  thunder(dist = 30) {
    if (!this.ctx) return;
    const d = Math.min(3, 0.12 + dist * 0.024), loud = Math.max(0.25, 1 - dist / 95);
    this.burst(0.2, { freq: 3200, q: 0.7, vol: 0.5 * loud, delay: d, type: 'highpass' });
    this.burst(2.8, { freq: 300, q: 0.9, vol: 0.95 * loud, delay: d + 0.04, type: 'lowpass', slide: 0.3 });
    this.burst(1.8, { freq: 150, q: 1, vol: 0.8 * loud, delay: d + 0.55, type: 'lowpass', slide: 0.5 });
    this.tone(52, 1.9, { type: 'sine', vol: 0.3 * loud, delay: d + 0.1, slide: 0.6 });
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
    out.connect(dest || this.mus);
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
    this.tone(f, 0.28, { type: 'triangle', vol, delay: t, dest: this.mus });
    this.tone(f * 2, 0.12, { type: 'square', vol: vol * 0.2, delay: t, dest: this.mus });
  }
  dhol(t, kind, k = 1) {
    const m = this.mus;
    if (kind === 'dha') this.tone(78, 0.3, { vol: 0.42 * k, slide: 0.5, delay: t, dest: m });
    else if (kind === 'ge') this.tone(112, 0.2, { vol: 0.3 * k, slide: 0.55, delay: t, dest: m });
    else this.burst(0.06, { freq: 1800, q: 1.5, vol: 0.14 * k, delay: t, dest: m });
  }
  chimta(t, k = 1) { this.burst(0.05, { freq: 6500, q: 3, vol: 0.05 * k, delay: t, dest: this.mus }); this.tone(5200 + Math.random() * 400, 0.05, { type: 'square', vol: 0.006 * k, delay: t, dest: this.mus }); }
  tabla(t, kind, k = 1) {
    if (kind === 'ge') this.tone(130, 0.35, { vol: 0.22 * k, slide: 0.6, delay: t, dest: this.mus });
    else this.tone(392, 0.16, { type: 'triangle', vol: 0.1 * k, delay: t, dest: this.mus });
  }
  harmonium(f, t, dur, vol = 0.035) { this.voice(f, dur, { type: 'sawtooth', vol, attack: 0.08, delay: t, detune: 6, filter: 1100, q: 0.7, dest: this.mus }); }
  // a soft humming voice ("ooo"): sine body plus a gentle vowel formant
  hum(f, t, dur) {
    this.voice(f, dur, { type: 'sine', vol: 0.03, attack: 0.35, delay: t, vib: 0.006, vibRate: 4.5, dest: this.mus });
    this.voice(f, dur, { type: 'sawtooth', vol: 0.012, attack: 0.4, delay: t, filter: 520, q: 4, dest: this.mus });
  }
  flute(f, t, dur, vol = 0.07) {
    this.voice(f, dur, { type: 'sine', vol, attack: 0.09, delay: t, vib: 0.012, vibRate: 5 });
    this.burst(Math.min(0.25, dur), { freq: f * 2, q: 4, vol: vol * 0.25, delay: t, dest: this.mus });
  }
  shehnai(f, t, dur) { this.voice(f, dur, { type: 'sawtooth', vol: 0.06, attack: 0.04, delay: t, vib: 0.02, vibRate: 6.5, filter: 1500, q: 2.2 }); }
  marimba(f, t) { this.tone(f, 0.3, { vol: 0.1, delay: t, dest: this.mus }); this.tone(f * 4, 0.08, { vol: 0.02, delay: t, dest: this.mus }); }
  cowbell(t, k = 1) { this.tone(545, 0.25, { type: 'square', vol: 0.02 * k, delay: t, dest: this.mus }); this.tone(820, 0.2, { type: 'square', vol: 0.016 * k, delay: t, dest: this.mus }); }
  thud(t) { this.tone(62, 0.22, { vol: 0.4, slide: 0.6, delay: t, dest: this.mus }); this.burst(0.08, { freq: 300, vol: 0.08, delay: t, dest: this.mus }); }
  kick(t) { this.tone(130, 0.35, { vol: 0.45, slide: 0.35, delay: t, dest: this.mus }); }
  snare(t) { this.burst(0.14, { freq: 1900, q: 0.7, vol: 0.16, delay: t, dest: this.mus }); this.tone(210, 0.08, { type: 'triangle', vol: 0.08, delay: t, dest: this.mus }); }
  hat(t, k = 1) { this.burst(0.03, { freq: 8500, q: 1, vol: 0.05 * k, type: 'highpass', delay: t, dest: this.mus }); }
  clank(t) { this.tone(1250, 0.12, { type: 'triangle', vol: 0.05, delay: t, dest: this.mus }); this.tone(1870, 0.1, { type: 'triangle', vol: 0.03, delay: t, dest: this.mus }); }

  // ---------- game sounds
  play(name) {
    if (!this.ctx || this.game.simulating) return;
    if ((this.game.calm || 0) > 0.5 && LOUD.has(name)) return;     // horns and traffic never reach the darbar
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
      // Aura points: a bright little shimmer
      case 'aura': [1319, 1760, 2093].forEach((f, i) => this.tone(f, 0.25, { vol: 0.06, delay: i * 0.05, attack: 0.01 })); break;
      // the Patiala pressure horn on the Bullet: three-tone and proud
      case 'hornP': [523, 659, 784, 659, 784].forEach((f, i) => this.voice(f, 0.18, { type: 'square', vol: 0.035, attack: 0.01, delay: i * 0.17, filter: 1600, q: 0.8, dest: this.sfxGain })); break;
      // a scarecrow's tin cans rattling
      case 'rattle': for (let i = 0; i < 6; i++) { const d = i * 0.07 + Math.random() * 0.03; this.tone(1700 + Math.random() * 1600, 0.06, { type: 'triangle', vol: 0.05, delay: d }); this.burst(0.03, { freq: 5000, q: 2, vol: 0.03, delay: d }); } break;
      // pigeons (kabootar) cooing around the sarovar
      case 'coo': { const f = 330 + Math.random() * 40; [0, 0.32, 0.55].forEach((d, i) => this.voice(f * (i === 1 ? 1.12 : 1), i === 2 ? 0.45 : 0.24, { type: 'sine', vol: 0.025, attack: 0.06, delay: d, vib: 0.03, vibRate: 9, dest: this.sfxGain })); break; }
    }
  }

  // ---------- animal voices
  // Recordings, when the game ships them (sounds/animals.json lists files per animal), are
  // played with a little random pitch; otherwise each call is synthesised: a voiced source
  // with a pitch contour through moving vowel formants, plus vibrato and tremolo for bleats.
  // dist: metres from the farmer (louder and brighter up close), pan: -1..1, pitch: the
  // individual animal's voice.
  async loadSamples() {
    try {
      const r = await fetch('sounds/animals.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const list = await r.json();
      this.samples = {};
      for (const [kind, files] of Object.entries(list)) {
        this.samples[kind] = [];
        for (const f of files) {
          try { this.samples[kind].push(await this.ctx.decodeAudioData(await (await fetch('sounds/' + f)).arrayBuffer())); } catch { /* skip a bad file */ }
        }
      }
    } catch { /* no recordings: synthesised voices */ }
  }

  animal(kind, { dist = 5, pan = 0, pitch = 1 } = {}) {
    if (!this.ctx || this.game.simulating || dist > 34) return;
    const c = this.ctx, t = c.currentTime;
    const near = 1 / (1 + Math.pow(dist / 5, 1.6));
    const out = c.createGain(); out.gain.value = near;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1400, 9000 - dist * 260);
    out.connect(lp);
    let tail = lp;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; lp.connect(p); tail = p; }
    tail.connect(this.sfxGain);
    const rec = this.samples?.[kind];
    if (rec?.length) {
      const s = c.createBufferSource();
      s.buffer = rec[Math.floor(Math.random() * rec.length)];
      s.playbackRate.value = pitch * (0.95 + Math.random() * 0.1);
      s.connect(out); s.start(t);
      return;
    }
    const R = (a, b) => a + Math.random() * (b - a);
    if (kind === 'chicken') {
      // a run of clucks, sometimes ending in a long "bukaak"
      const n = 3 + Math.floor(Math.random() * 4);
      let d = 0;
      for (let i = 0; i < n; i++) {
        const last = i === n - 1 && Math.random() < 0.45;
        this.call(out, { at: t + d, dur: last ? 0.26 : R(0.06, 0.09), f: last ? [[0, 640], [0.4, 900], [1, 760]] : [[0, 640], [1, 470]], pitch, formants: [[1150, 3, 1], [2600, 5, 0.35]], vol: 0.2, attack: 0.008, release: last ? 0.08 : 0.03 });
        d += last ? 0.3 : R(0.12, 0.2);
      }
      return;
    }
    const V = {
      // low "mmm-OOO-aaa" with the mouth opening through the call
      cow: { dur: R(1.3, 2.0), f: [[0, 92], [0.15, 126], [0.6, 116], [1, 86]], formants: [[260, 5, 1, 620], [900, 6, 0.45, 1100], [2400, 8, 0.1]], vib: 0.008, vibRate: 5, vol: 0.5, attack: 0.18, release: 0.45, breath: 0.03 },
      // a deeper, rougher grunting moo
      buffalo: { dur: R(0.9, 1.4), f: [[0, 68], [0.2, 90], [0.7, 82], [1, 60]], formants: [[220, 4, 1, 470], [700, 5, 0.35], [1900, 6, 0.08]], trem: 0.35, tremRate: 22, vol: 0.55, attack: 0.12, release: 0.35, breath: 0.04 },
      // the quavering "meh-eh-eh"
      goat: { dur: R(0.55, 0.9), f: [[0, 520], [0.12, 565], [1, 470]], formants: [[600, 4, 1], [1700, 6, 0.5], [2600, 8, 0.2]], vib: 0.04, vibRate: 8.5, trem: 0.55, tremRate: 8.5, vol: 0.32, attack: 0.04, release: 0.18 },
      // a harsh, raspy "kaa"
      crow: { dur: R(0.18, 0.28), f: [[0, 470], [0.35, 525], [1, 390]], formants: [[1100, 3, 1], [1900, 4, 0.7], [3100, 6, 0.35]], trem: 0.5, tremRate: 55, vol: 0.3, attack: 0.012, release: 0.08, breath: 0.08 },
      // a rounder "baa-aa"
      sheep: { dur: R(0.7, 1.1), f: [[0, 300], [0.15, 332], [1, 262]], formants: [[450, 4, 1, 760], [1200, 5, 0.6], [2500, 8, 0.15]], vib: 0.03, vibRate: 6, trem: 0.4, tremRate: 6, vol: 0.34, attack: 0.05, release: 0.25, breath: 0.02 },
    }[kind];
    if (V) this.call(out, { ...V, at: t, pitch });
  }

  // One voiced call into `dest`. f: pitch contour [[0..1, Hz]...]; formants: [[Hz, Q, gain, Hz at
  // the open mouth?]...]; vib/trem: depth (share of pitch / of loudness) and rate.
  call(dest, o) {
    const c = this.ctx, t = o.at, dur = o.dur, p = o.pitch || 1;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(o.vol, t + o.attack);
    env.gain.setValueAtTime(o.vol, t + Math.max(o.attack, dur - o.release));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(dest);
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(o.f[0][1] * p, t);
    for (const [k, f] of o.f.slice(1)) osc.frequency.linearRampToValueAtTime(f * p, t + k * dur);
    const stop = t + dur + 0.05, lfos = [];
    if (o.vib) { const l = c.createOscillator(), g = c.createGain(); l.frequency.value = o.vibRate; g.gain.value = o.f[0][1] * p * o.vib; l.connect(g); g.connect(osc.frequency); lfos.push(l); }
    const am = c.createGain(); am.gain.value = 1;
    if (o.trem) { const l = c.createOscillator(), g = c.createGain(); l.frequency.value = o.tremRate; g.gain.value = o.trem; am.gain.value = 1 - o.trem / 2; l.connect(g); g.connect(am.gain); lfos.push(l); }
    osc.connect(am);
    for (const [f, q, g, open] of o.formants) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(f * Math.sqrt(p), t);
      if (open) { bp.frequency.linearRampToValueAtTime(open * Math.sqrt(p), t + dur * 0.45); bp.frequency.linearRampToValueAtTime((f + open) / 2 * Math.sqrt(p), t + dur); }
      const fg = c.createGain(); fg.gain.value = g * q * 0.5;
      am.connect(bp); bp.connect(fg); fg.connect(env);
    }
    if (o.breath) this.burst(Math.min(0.5, dur), { freq: 1800, q: 0.7, vol: o.breath, delay: t - c.currentTime, dest: env });
    osc.start(t); osc.stop(stop);
    for (const l of lfos) { l.start(t); l.stop(stop); }
  }

  // The Bullet's thump ("dug-dug-dug"): a slow firing pulse through a resonant low-pass,
  // a little valve-train tick and exhaust crackle when the throttle closes.
  setBike(on, speed = 0, { throttle = 0, top = 13 } = {}) {
    const c = this.ctx;
    if (on && !this.bike) {
      const pulse = c.createOscillator(), sub = c.createOscillator(), shaper = c.createWaveShaper(), lp = c.createBiquadFilter(), g = c.createGain(), sg = c.createGain();
      pulse.type = 'square'; sub.type = 'sine';
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.4); }
      shaper.curve = curve;
      lp.type = 'lowpass'; lp.Q.value = 7;
      g.gain.value = 0; sg.gain.value = 0.5;
      pulse.connect(shaper); shaper.connect(lp); lp.connect(g); sub.connect(sg); sg.connect(g); g.connect(this.sfxGain);
      pulse.start(); sub.start();
      this.bike = { pulse, sub, lp, g, last: 0 };
    }
    if (!this.bike) return;
    const t = c.currentTime, e = this.bike;
    if (!on) {
      e.g.gain.setTargetAtTime(0, t, 0.12);
      this.bike = null;
      setTimeout(() => { try { e.pulse.stop(); e.sub.stop(); } catch { /* already stopped */ } }, 500);
      return;
    }
    const rev = Math.min(1, speed / top) * 0.75 + Math.max(0, throttle) * 0.25;
    const fire = 9 + rev * 34;                                  // firing rate: idle thump to a steady beat
    e.pulse.frequency.setTargetAtTime(fire, t, 0.08);
    e.sub.frequency.setTargetAtTime(fire * 2, t, 0.08);
    e.lp.frequency.setTargetAtTime(170 + rev * 520 + throttle * 160, t, 0.08);
    e.g.gain.setTargetAtTime(0.1 + rev * 0.06 + throttle * 0.04, t, 0.1);
    // crackle on the overrun, ticking tappets at idle
    if (throttle <= 0 && e.last > 0.5 && speed > 6 && Math.random() < 0.5) for (let i = 0; i < 3; i++) this.burst(0.04, { freq: 900 + Math.random() * 600, q: 1.2, vol: 0.06, delay: i * 0.07 + Math.random() * 0.04 });
    e.last = throttle;
  }

  // Continuous engine note while driving
  setEngine(on, speed = 0, low = 1, opts = null) {
    if (!this.ctx) return;
    if (opts?.bike || (!on && this.bike)) { this.setBike(on, speed, opts || {}); if (opts?.bike || !this.engine) return; }
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
      rain: bed('highpass', 2400, 0.5, 0.2, 0.15),
      wind: bed('lowpass', 380, 0.6, 0.17, 0.5),
    };
    this.ambVol = { water: 0.16, crowd: 0.07, traffic: 0.3, sizzle: 0.035, rain: 0.2, wind: 0.2 };
  }

  // The area must hold for a moment before the music switches, so walking along a
  // border doesn't flip the tune back and forth.
  setZone(z, dt) {
    if (z === this.zone) { this.pending = null; return; }
    if (this.pending !== z) { this.pending = z; this.pendingT = 0; }
    this.pendingT += dt;
    if (this.pendingT > 1.2) { this.zone = z; this.pending = null; }
  }

  // What should be playing: the area's tune, the Bullet's radio, or nothing (radio off, or
  // the player's own music from another app)
  wanted() {
    const s = this.game.state.settings, v = this.game.player?.vehicle;
    if (s.ownMusic) return 'silent';
    if (v && s.radio === 'fm') return 'fm:' + (this.track || 0);
    if (v && s.radio === 'off') return 'silent';
    return this.zone;
  }
  styleOf(name) { return name.startsWith('fm:') ? RADIO[+name.slice(3) % RADIO.length].style : STYLES[name] || STYLES.farm; }
  levelOf(name) { return name.startsWith('fm:') ? 0.4 + (this.game.state.settings.radioVol ?? 0.8) * 1.2 : 1; }
  nextTrack(step = 1) {
    this.track = ((this.track || 0) + step + RADIO.length) % RADIO.length;
    this.trackBars = 0;
    this.game.ui?.toast(`📻 Patiala FM · ${RADIO[this.track].name}`, 2);
  }
  // "My music": mute the game's music and let iPhone mix in audio from other apps
  setOwnMusic(on) {
    try { if (navigator.audioSession) navigator.audioSession.type = on ? 'ambient' : 'auto'; } catch { /* not supported */ }
  }

  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const c = this.ctx, g = this.game;
    const inG = this.style === 'gurdwara';
    this.droneGain.gain.setTargetAtTime(inG && !g.state.settings.ownMusic ? 0.26 : 0, c.currentTime, 1.2);
    const want = this.wanted();
    // a new area or station: fade the old tune out, then start the new one from the top of a bar
    if (want !== this.style && !this.fading) {
      this.fading = 0.9;
      this.mus.gain.setTargetAtTime(0.0001, c.currentTime, 0.25);
    }
    if (this.fading) {
      this.fading -= dt;
      if (this.fading > 0) return this.updateAmbience(dt);
      this.fading = 0;
      this.style = this.wanted(); this.step = 0; this.bar = -1; this.trackBars = 0;
      this.nextBeat = Math.max(this.nextBeat, c.currentTime + 0.05);
      this.mus.gain.cancelScheduledValues(c.currentTime);
      this.mus.gain.setTargetAtTime(this.levelOf(this.style), c.currentTime, this.style === 'gurdwara' ? 1.2 : 0.35);
    } else if (this.style.startsWith('fm:')) this.mus.gain.setTargetAtTime(this.levelOf(this.style), c.currentTime, 0.2);
    while (this.nextBeat < c.currentTime + 0.25) {
      const k = this.step % 16;
      const S = this.styleOf(this.style);
      if (k === 0) {
        this.bar = ((this.bar ?? -1) + 1) % (this.style.startsWith('fm:') ? 8 : 4);
        // the radio moves on to the next song every 16 bars or so
        if (this.style.startsWith('fm:') && ++this.trackBars > 16) { this.nextTrack(); break; }
      }
      try { S.play(this, k, this.bar, Math.max(0, this.nextBeat - c.currentTime)); } catch (e) { console.warn('music', e); }
      this.step++;
      this.nextBeat += S.step;
    }
    this.updateAmbience(dt);
  }

  // ambience follows the player; inside the Gurdwara the city goes quiet (calm: 0..1)
  updateAmbience(dt) {
    const c = this.ctx, g = this.game;
    this.ambT -= dt;
    if (this.ambT > 0 || !this.amb) return;
    this.ambT = 0.2;
    const p = g.player.pos, w = ambienceAt(p.x, p.z), calm = g.calm || 0;
    w.traffic = (w.traffic || 0) * (1 - calm);
    w.crowd = (w.crowd || 0) * (1 - calm);
    w.water = (w.water || 0) * (1 - calm * 0.5);
    const wx = g.weather;
    w.rain = (wx?.rain || 0) * (1 - calm * 0.45);
    w.wind = Math.max(0, Math.min(1, ((wx?.wind || 1) - 1.2) / 2.2));
    for (const k in this.amb) this.amb[k].gain.setTargetAtTime((w[k] || 0) * this.ambVol[k], c.currentTime, 0.6);
    if (w.crowd > 0.35 && Math.random() < 0.25) this.play('chatter');
    if (w.sizzle > 0.4 && Math.random() < 0.3) this.play('sizzle');
    if (w.water > 0.5 && Math.random() < 0.02 && calm < 0.5) this.play(Math.random() < 0.5 ? 'frog' : 'splash');
    if (calm > 0.6 && Math.random() < 0.035) this.play('coo');
  }
}
