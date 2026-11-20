// Missions (story chain), daily goals and achievements, all driven by game events.
import { QUESTS, ACHIEVEMENTS, FIELDS, ECON } from './config.js';
import { todayKey } from './state.js';

const EVENT_FOR = {
  till: 'till', plant: 'plant', water: 'water', harvest: 'harvest', stock: 'stock', collect: 'collect', bow: 'bow',
  buySeed: 'buySeed', upgrade: 'upgrade', buyField: 'buyField', order: 'order', langar: 'langar', build: 'build',
  product: 'product', make: 'make', vehicle: 'vehicle', tractor: 'tractorWork', hire: 'hire',
  rose: 'rose', wish: 'wish', decorPlaced: 'decorPlaced', fruit: 'fruit', caseClosed: 'caseClosed', gardenDone: 'gardenDone',
};

const DAILY_POOL = [
  { type: 'harvested', text: (n) => `Harvest ${n} crops`, n: (l) => 12 + l * 3 },
  { type: 'sold', text: (n) => `Sell ${n} items`, n: (l) => 10 + l * 3 },
  { type: 'earn', text: (n) => `Earn ₹${n.toLocaleString('en-IN')}`, n: (l) => 100 + l * l * 25 },
  { type: 'order', text: (n) => `Complete ${n} orders`, n: () => 2 },
  { type: 'product', text: (n) => `Collect ${n} eggs, milk or wool`, n: (l) => 6 + l, need: (st) => Object.values(st.pens).some((p) => p.owned) },
  { type: 'make', text: (n) => `Make ${n} goods in workshops`, n: (l) => 3 + Math.floor(l / 3), need: (st) => Object.values(st.buildings).some((b) => b.owned) },
  { type: 'langar', text: (n) => `Give ${n} items to the Langar`, n: () => 10 },
  // added in the big expansion
  { type: 'fruit', text: (n) => `Pick ${n} fruit`, n: (l) => 10 + Math.floor(l / 2), need: (st) => st.orchard?.owned || (st.decor || []).some((d) => ['mango', 'guava', 'ber', 'orange', 'jamun'].includes(d.k)) },
  { type: 'flight', text: () => 'Take off in your airplane', n: () => 1, need: (st) => st.vehicles.plane?.owned },
  { type: 'petPlay', text: () => 'Play with your pet', n: () => 1, need: (st) => Object.keys(st.pets?.owned || {}).length > 0 },
];
// weekly goals: bigger, three a week (Monday to Sunday), paid out when done
const WEEKLY_POOL = [
  { type: 'harvested', text: (n) => `Harvest ${n} crops this week`, n: (l) => 200 + l * 25 },
  { type: 'sold', text: (n) => `Sell ${n} items this week`, n: (l) => 160 + l * 20 },
  { type: 'earn', text: (n) => `Earn ₹${n.toLocaleString('en-IN')} this week`, n: (l) => 2000 + l * l * 220 },
  { type: 'order', text: (n) => `Complete ${n} orders this week`, n: () => 12 },
  { type: 'decorPlaced', text: (n) => `Place ${n} decorations this week`, n: () => 8, need: (st) => st.level >= 3 },
  { type: 'fruit', text: (n) => `Pick ${n} fruit this week`, n: (l) => 60 + l * 2, need: (st) => st.orchard?.owned },
  { type: 'flight', text: (n) => `Fly ${n} times this week`, n: () => 5, need: (st) => st.vehicles.plane?.owned },
  { type: 'race', text: (n) => `Finish ${n} mela races this week`, n: () => 3, need: (st) => st.level >= 8 },
  { type: 'langar', text: (n) => `Give ${n} items to the Langar this week`, n: () => 60 },
];
export const weekKey = (d = new Date()) => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`; };

export class Progression {
  constructor(game) {
    this.game = game;
    this.checkT = 0;
    this.ensureDaily();
    for (const ev of new Set([...Object.values(EVENT_FOR), 'harvested', 'sold', 'earn', 'fruit', 'flight', 'petPlay', 'race', 'decorPlaced', 'order', 'langar'])) game.on(ev, (d) => this.onEvent(ev, d));
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
    if (g.visit) return;
    if (q && EVENT_FOR[q.type] === ev && (!q.key || q.key === d.key)) {
      st.questProg += d.n && (ev === 'make' || ev === 'product' || ev === 'fruit') ? d.n : 1;
      g.ui.questBar();
    }
    // daily goals
    const daily = st.daily;
    const tick = (goals, label) => {
      for (const goal of goals) {
        if (goal.done || goal.type !== ev) continue;
        goal.prog += ev === 'earn' ? d.money : ev === 'harvested' ? d.n : ev === 'make' || ev === 'fruit' ? (d.n || 1) : 1;
        if (goal.prog >= goal.n) {
          goal.done = true;
          g.reward(goal.money);
          g.addXP(goal.xp);
          g.ui.toast(`✅ ${label} goal: ${goal.text} · +₹${goal.money.toLocaleString('en-IN')}`, 3);
          g.audio.play('buy');
        }
      }
    };
    if (daily.date === todayKey()) tick(daily.goals, 'Daily');
    if (st.weekly?.week === weekKey()) tick(st.weekly.goals, 'Weekly');
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

  ensureWeekly() {
    const st = this.game.state, wk = weekKey();
    if (st.weekly?.week === wk) return;
    const l = st.level, pool = WEEKLY_POOL.filter((d) => !d.need || d.need(st)), picks = [];
    let seed = wk.split('-').reduce((a, b) => a * 37 + +b, 11);
    while (picks.length < 3 && pool.length) { seed = (seed * 9301 + 49297) % 233280; picks.push(pool.splice(seed % pool.length, 1)[0]); }
    st.weekly = { week: wk, goals: picks.map((d) => { const n = d.n(l); return { type: d.type, text: d.text(n), n, prog: 0, done: false, money: Math.round((400 + l * l * 12) * ECON.reward), xp: 80 + l * 8 }; }) };
  }

  ensureDaily() {
    this.ensureWeekly();
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
      goals: [{ type: 'bow', text: 'Darshan at Gurdwara Dukh Niwaran Sahib', n: 1, prog: st.guru.last === today ? 1 : 0, done: st.guru.last === today, money: Math.round((20 + l * 10) * ECON.reward), xp: 10 + l * 2 },
        ...picks.map((d) => { const n = d.n(l); return { type: d.type, text: d.text(n), n, prog: 0, done: false, money: Math.round((30 + l * 15) * ECON.reward), xp: 10 + l * 3 }; })],
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
    st.stats.roses = st.garden.total; st.stats.decor = st.decor.length; st.stats.caught = st.police.stats.caught; st.stats.outfits = Object.keys(st.wardrobe.owned).length;
    st.stats.eastFields = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].filter((id) => st.fields[id]?.owned).length;
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
