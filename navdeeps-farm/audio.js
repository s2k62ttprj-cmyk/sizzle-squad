'use strict';
/* Sunpatch Farm - synthesised sound effects and a gentle music loop (Web Audio, no sound files). */

const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  const settings = { music: true, sfx: true };

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.8;
      master.connect(ac.destination);
      sfxBus = ac.createGain();
      sfxBus.connect(master);
      musicBus = ac.createGain();
      musicBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applySettings();
      startMusic();
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function applySettings() {
    if (!ac) return;
    sfxBus.gain.value = settings.sfx ? 0.55 : 0;
    musicBus.gain.value = settings.music ? 0.2 : 0;
  }

  function tone(freq, dur, o = {}) {
    if (!ac) return;
    const t = o.abs != null ? o.abs : ac.currentTime + (o.at || 0);
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.vol == null ? 0.3 : o.vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(dur, freq, o = {}) {
    if (!ac) return;
    const t = ac.currentTime + (o.at || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    f.Q.value = o.q || 1;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(o.vol == null ? 0.4 : o.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(sfxBus);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.05);
  }

  const FX = {
    move: () => tone(740, 0.05, { vol: 0.06 }),
    select: () => { tone(523, 0.07, { vol: 0.1 }); tone(784, 0.1, { vol: 0.1, at: 0.06 }); },
    back: () => tone(440, 0.09, { vol: 0.08, slide: 300 }),
    error: () => tone(150, 0.18, { type: 'sawtooth', vol: 0.1 }),
    bump: () => tone(90, 0.08, { type: 'triangle', vol: 0.2 }),
    till: () => { noise(0.14, 700, { vol: 0.5 }); tone(120, 0.1, { type: 'triangle', vol: 0.3, slide: 70 }); },
    water: () => noise(0.4, 3000, { filter: 'bandpass', q: 1.5, vol: 0.35, sweep: 1200 }),
    splash: () => { noise(0.5, 1500, { filter: 'bandpass', vol: 0.4, sweep: 400 }); tone(300, 0.2, { type: 'sine', vol: 0.15, slide: 600 }); },
    plant: () => { tone(392, 0.06, { type: 'triangle', vol: 0.25 }); tone(523, 0.09, { type: 'triangle', vol: 0.25, at: 0.05 }); },
    harvest: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, { vol: 0.12, at: i * 0.06 })),
    coin: () => { tone(988, 0.08, { vol: 0.1 }); tone(1319, 0.25, { vol: 0.1, at: 0.08 }); },
    pull: () => noise(0.12, 2500, { filter: 'highpass', vol: 0.25 }),
    rock: () => { noise(0.1, 900, { vol: 0.5 }); tone(200, 0.12, { vol: 0.12, slide: 120 }); },
    chop: () => { noise(0.1, 1200, { vol: 0.45 }); tone(160, 0.12, { type: 'triangle', vol: 0.3, slide: 100 }); },
    cluck: () => { tone(880, 0.07, { vol: 0.07, slide: 620 }); tone(820, 0.09, { vol: 0.07, at: 0.09, slide: 560 }); },
    eat: () => { noise(0.08, 1800, { vol: 0.3 }); noise(0.08, 1600, { vol: 0.3, at: 0.12 }); },
    goal: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { vol: 0.12, at: i * 0.09 })),
    sleep: () => [784, 659, 523, 392].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.18, at: i * 0.18 })),
    honk: () => [0, 0.22].forEach(at => { tone(415, 0.16, { vol: 0.12, at }); tone(523, 0.16, { vol: 0.1, at }); }),
    moo: () => tone(140, 0.7, { type: 'sawtooth', vol: 0.09, slide: 110 }),
    baa: () => [0, 0.08, 0.16].forEach(at => tone(420, 0.1, { type: 'sawtooth', vol: 0.06, at, slide: 380 })),
    oink: () => { tone(260, 0.1, { type: 'square', vol: 0.08, slide: 180 }); tone(240, 0.1, { type: 'square', vol: 0.08, at: 0.13, slide: 170 }); },
    woof: () => { noise(0.08, 900, { vol: 0.35 }); tone(330, 0.1, { type: 'square', vol: 0.1, slide: 200 }); },
    meow: () => tone(700, 0.35, { type: 'triangle', vol: 0.1, slide: 500 }),
    bite: () => { tone(880, 0.08, { vol: 0.14 }); tone(1175, 0.12, { vol: 0.14, at: 0.08 }); noise(0.15, 2000, { filter: 'bandpass', vol: 0.3 }); },
  };

  // Music: a I-vi-IV-V progression with a fresh pentatonic melody every eight bars.
  const STEP = 60 / 92 / 2;
  const CHORDS = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
  const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79];
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  let melody = [], step = 0, nextTime = 0;

  function newMelody() {
    const m = [];
    let k = 4;
    for (let i = 0; i < 32; i++) {
      if (Math.random() < (i % 2 === 0 ? 0.7 : 0.25)) {
        k = Math.max(0, Math.min(SCALE.length - 1, k + Math.floor(Math.random() * 5) - 2));
        m.push(SCALE[k]);
      } else m.push(0);
    }
    return m;
  }

  function schedule(s, t) {
    const chord = CHORDS[Math.floor(s / 8) % 4], beat = s % 8;
    if (beat === 0 || beat === 4) tone(mtof(chord[0] - 12), STEP * 3.5, { type: 'triangle', vol: 0.35, abs: t, bus: musicBus });
    tone(mtof(chord[[0, 1, 2, 1][beat % 4]] + 12), STEP * 1.6, { type: 'sine', vol: 0.12, abs: t, bus: musicBus });
    const n = melody[s % 32];
    if (n) tone(mtof(n), STEP * 1.8, { type: 'triangle', vol: 0.16, abs: t, bus: musicBus });
  }

  function startMusic() {
    melody = newMelody();
    nextTime = ac.currentTime + 0.2;
    setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      if (nextTime < ac.currentTime - 0.1) nextTime = ac.currentTime + 0.05;
      while (nextTime < ac.currentTime + 0.3) {
        schedule(step, nextTime);
        nextTime += STEP;
        step++;
        if (step % 64 === 0) melody = newMelody();
      }
    }, 80);
  }

  return {
    settings,
    unlock,
    applySettings,
    play(name) { if (ac && FX[name]) FX[name](); },
    pause() { if (ac) ac.suspend(); },
    resume() { if (ac) ac.resume(); },
  };
})();
