// Missions (story chain), daily goals and achievements, all driven by game events.
import { QUESTS, ACHIEVEMENTS, FIELDS } from './config.js';
import { todayKey } from './state.js';

const EVENT_FOR = {
  till: 'till', plant: 'plant', water: 'water', harvest: 'harvest', stock: 'stock', collect: 'collect', bow: 'bow',
  buySeed: 'buySeed', upgrade: 'upgrade', buyField: 'buyField', order: 'order', langar: 'langar', build: 'build',
  product: 'product', make: 'make', vehicle: 'vehicle', tractor: 'tractorWork', hire: 'hire',
};

const DAILY_POOL = [
  { type: 'harvested', text: (n) => `Harvest ${n} crops`, n: (l) => 12 + l * 3 },
  { type: 'sold', text: (n) => `Sell ${n} items`, n: (l) => 10 + l * 3 },
  { type: 'earn', text: (n) => `Earn ₹${n.toLocaleString('en-IN')}`, n: (l) => 100 + l * l * 25 },
  { type: 'order', text: (n) => `Complete ${n} orders`, n: () => 2 },
  { type: 'product', text: (n) => `Collect ${n} eggs, milk or wool`, n: (l) => 6 + l, need: (st) => Object.values(st.pens).some((p) => p.owned) },
  { type: 'make', text: (n) => `Make ${n} goods in workshops`, n: (l) => 3 + Math.floor(l / 3), need: (st) => Object.values(st.buildings).some((b) => b.owned) },
  { type: 'langar', text: (n) => `Give ${n} items to the Langar`, n: () => 10 },
];

export class Progression {
  constructor(game) {
    this.game = game;
    this.checkT = 0;
    this.ensureDaily();
    for (const ev of new Set([...Object.values(EVENT_FOR), 'harvested', 'sold', 'earn'])) game.on(ev, (d) => this.onEvent(ev, d));
  }

  get quest() { return QUESTS[this.game.state.quest]; }

  questProgress() {
    const q = this.quest, st = this.game.state;
    if (!q) return [1, 1];
    if (q.type === 'level') return [Math.min(st.level, q.n), q.n];
    if (q.type === 'fields') return [Object.values(st.fields).filter((f) => f.owned).length, q.n];
    return [Math.min(st.questProg, q.n), q.n];
  }

  onEvent(ev, d) {
    const g = this.game, st = g.state, q = this.quest;
    if (q && EVENT_FOR[q.type] === ev && (!q.key || q.key === d.key)) {
      st.questProg += d.n && (ev === 'make' || ev === 'product') ? d.n : 1;
      g.ui.questBar();
    }
    // daily goals
    const daily = st.daily;
    if (daily.date === todayKey()) {
      for (const goal of daily.goals) {
        if (goal.done || goal.type !== ev) continue;
        goal.prog += ev === 'earn' ? d.money : ev === 'harvested' ? d.n : ev === 'make' ? (d.n || 1) : 1;
        if (goal.prog >= goal.n) {
          goal.done = true;
          g.reward(goal.money);
          g.addXP(goal.xp);
          g.ui.toast(`✅ Daily goal: ${goal.text} · +₹${goal.money}`, 3);
          g.audio.play('buy');
        }
      }
    }
    this.checkQuest();
  }

  checkQuest() {
    const g = this.game, st = g.state, q = this.quest;
    if (!q) return;
    const [p, n] = this.questProgress();
    if (p >= n) {
      st.quest++;
      st.questProg = 0;
      g.reward(q.reward);
      g.addXP(Math.round(q.reward / 2) + 5);
      g.ui.toast(`📜 Mission complete! +₹${q.reward}`, 2.6);
      g.audio.play('level');
      // some missions are already satisfied by earlier play
      const next = this.quest;
      if (next) {
        if (next.type === 'build' && (st.pens[next.key]?.owned || st.buildings[next.key]?.owned)) st.questProg = next.n;
        if (next.type === 'vehicle' && st.vehicles[next.key]?.owned) st.questProg = next.n;
        if (next.type === 'upgrade' && st.up[next.key] > 0) st.questProg = next.n;
        if (next.type === 'buySeed' && (st.seeds[next.key] || 0) > 0) st.questProg = next.n;
        if (next.type === 'buyField' && st.fields.f2.owned) st.questProg = next.n;
        if (next.type === 'hire' && (next.key === 'seeri' ? Object.values(st.fields).some((f) => f.seeri) : st.managers[next.key]?.on)) st.questProg = next.n;
        if (next.target) g.guide.set(next.target);
      }
      g.ui.questBar();
      setTimeout(() => this.checkQuest(), 50);
    }
  }

  ensureDaily() {
    const st = this.game.state, today = todayKey();
    if (st.daily.date === today) return;
    const l = st.level;
    const pool = DAILY_POOL.filter((d) => !d.need || d.need(st));
    const picks = [];
    let seed = today.split('-').reduce((a, b) => a * 31 + +b, 7);
    while (picks.length < 3 && pool.length) {
      seed = (seed * 9301 + 49297) % 233280;
      picks.push(pool.splice(seed % pool.length, 1)[0]);
    }
    st.daily = {
      date: today,
      goals: [{ type: 'bow', text: 'Darshan at Gurdwara Dukh Niwaran Sahib', n: 1, prog: st.guru.last === today ? 1 : 0, done: st.guru.last === today, money: 20 + l * 10, xp: 10 + l * 2 },
        ...picks.map((d) => { const n = d.n(l); return { type: d.type, text: d.text(n), n, prog: 0, done: false, money: 30 + l * 15, xp: 10 + l * 3 }; })],
    };
  }

  update(dt) {
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 2;
    this.ensureDaily();
    const g = this.game, st = g.state;
    st.stats.soul = st.soul;
    st.stats.streak = Math.max(st.stats.streak || 0, st.guru.streak);
    for (const a of ACHIEVEMENTS) {
      if (st.ach[a.id]) continue;
      if ((st.stats[a.stat] || 0) >= a.n) {
        st.ach[a.id] = Date.now();
        g.addXP(25);
        g.ui.toast(`🏆 Achievement: ${a.text}`, 3);
        g.audio.play('level');
      }
    }
    this.checkQuest();
  }
}

export const fieldCount = (st) => FIELDS.filter((f) => st.fields[f.id].owned).length;
