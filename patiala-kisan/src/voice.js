// A Punjabi voice for the farm: short spoken lines (Sat Sri Akal, Shabaash, Wadhaiyan…) using
// the phone's own speech voices. It prefers a Punjabi (pa-IN) voice and falls back to Hindi
// (hi-IN), which reads these romanised lines well. Quiet by design: one line every few
// seconds at most, and it can be switched off in Settings.
const LINES = {
  hello: ['Sat Sri Akal ji! Ji aayan nu!', 'Sat Sri Akal! Chalo, kheti karie!'],
  level: ['Wadhaiyan ji! Level {n}!', 'Balle balle! Level {n} ho gaya!'],
  sold: ['Shabaash!', 'Vadhiya sauda!', 'Paise aa gaye!'],
  harvest: ['Fasal tayaar hai!', 'Wah, kinni sohni fasal!'],
  customer: ['Sat Sri Akal ji!', 'Taaze taaze sabzi?', 'Kinne da ji?'],
  thief: ['Chor! Chor! Police nu bulao!'],
  flight: ['Udd chaliye!', 'Asmaan vich!'],
  buy: ['Mubarakan ji!', 'Navi cheez, vadhiya!'],
  fruit: ['Mitthe phal!'],
};

export class Voice {
  constructor(game) {
    this.game = game;
    this.last = 0;
    this.voice = null;
    this.ok = typeof speechSynthesis !== 'undefined';
    if (!this.ok) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find((v) => /^pa/i.test(v.lang)) || vs.find((v) => /^hi/i.test(v.lang)) || null;
    };
    pick();
    speechSynthesis.onvoiceschanged = pick;
    const on = (ev, kind, p = 1) => game.on(ev, (d) => { if (Math.random() < p) this.say(kind, d); });
    on('level', 'level'); on('sold', 'sold', 0.12); on('harvest', 'harvest', 0.04); on('flight', 'flight');
    on('vehicle', 'buy'); on('buyField', 'buy'); on('skin', 'buy'); on('fruit', 'fruit', 0.25); on('theft', 'thief');
    setTimeout(() => this.say('hello'), 2500);
  }
  get enabled() { return this.ok && this.game.state?.settings?.voice !== false && !this.game.visit; }
  say(kind, d = {}) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.last < 5000) return;
    const list = LINES[kind];
    if (!list) return;
    this.last = now;
    const text = list[(Math.random() * list.length) | 0].replace('{n}', this.game.state.level);
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'hi-IN';
      u.rate = 0.95; u.pitch = 1.05; u.volume = Math.min(1, (this.game.state.settings.sfx ?? 0.8) + 0.2);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* speech not available */ }
  }
}
