// Gerhi: riding the Bullet round the ring road for fun, and the Aura Points it earns.
//  - every 200 m ridden on the ring road: +1 (60 a day)
//  - a full lap (all four sides, in either direction): +15, a personal best +10
//    (8 paying laps a day)
//  - the sights of Patiala, found on the Bullet: +20 each, once
//  - three daily challenges (+25 each, plus a little cash) and lifetime milestones
// Aura buys paint jobs and extras for the Bullet. Nothing is earned while visiting a friend.
import { AURA, BIKE_ENGINES } from './config.js';
import { todayKey, goalsFor } from './state.js';
export { goalsFor };
import { RING, PATH, ringNearest } from './ring.js';

const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
export { fmtT };

export class Gerhi {
  constructor(game) {
    this.game = game;
    this.lap = null;
    this.acc = 0;
    this.off = 0;
    this.checkT = 0;
    this.dayCheck();
  }
  get a() { return this.game.state.aura; }

  dayCheck() {
    const a = this.a, today = todayKey();
    if (a.day === today && a.goals.length) return;
    a.day = today;
    a.today = { laps: 0, distPts: 0, dist: 0, spots: {}, fast: 0, dusk: 0 };
    a.goals = goalsFor(today);
  }

  give(n, why = '', loud = true) {
    const a = this.a, g = this.game;
    a.pts += n; a.total += n;
    if (loud) {
      const p = g.player.pos;
      g.ui.float(`+${n} ✨`, p.x, 2.4, p.z, 'gold');
      if (why) g.ui.toast(`✨ ${why} · +${n} Aura`, 2.4);
      g.audio.play('aura');
    }
    g.ui.gerhiPill?.(true);
  }

  goal(id) { return AURA.goals.find((x) => x.id === id); }
  progress(gl) {
    const t = this.a.today, G = this.goal(gl.id);
    if (G.type === 'laps') return [Math.min(t.laps, G.n), G.n];
    if (G.type === 'dist') return [Math.min(Math.round(t.dist), G.n), G.n];
    if (G.type === 'fast') return [t.fast ? 1 : 0, 1];
    if (G.type === 'dusk') return [Math.min(t.dusk, G.n), G.n];
    if (G.type === 'spots') return [G.ids.filter((s) => t.spots[s]).length, G.ids.length];
    return [0, 1];
  }
  checkGoals() {
    const g = this.game;
    for (const gl of this.a.goals) {
      if (gl.done) continue;
      const [n, of] = this.progress(gl);
      if (n < of) continue;
      gl.done = true;
      const cash = 50 + g.state.level * 10;
      g.reward(cash);
      this.give(AURA.goal, `Challenge done: ${this.goal(gl.id).text} (+₹${cash})`);
    }
    const a = this.a;
    for (const m of AURA.miles) {
      if (a.miles[m.id] || (m.stat === 'dist' ? a.dist : a.laps) < m.n) continue;
      a.miles[m.id] = Date.now();
      if (m.id === 'd50') a.title = true;
      this.give(m.pts, `Milestone: ${m.text}`);
    }
  }

  completeLap(t) {
    const g = this.game, a = this.a;
    a.laps++; a.today.laps++;
    const best = !a.best || t < a.best;
    if (best) a.best = +t.toFixed(1);
    if (t < 50) a.today.fast = 1;
    if (g.dusk > 0.3) a.today.dusk++;
    if (a.today.laps <= AURA.lapsPerDay) this.give(AURA.lap + (best ? AURA.lapBest : 0), `🏁 Lap ${fmtT(t)}${best ? ' · new best!' : ''}`);
    else g.ui.toast(`🏁 Lap ${fmtT(t)}${best ? ' · new best!' : ''} (today's lap Aura is used up)`, 2.4);
    g.emit('lap', { t });
    this.checkGoals();
  }

  update(dt) {
    const g = this.game;
    if (g.visit) return;
    this.checkT -= dt;
    if (this.checkT <= 0) { this.checkT = 5; this.dayCheck(); }
    const v = g.player.vehicle, a = this.a;
    if (!v || v.kind !== 'bike') { this.lap = null; return; }
    const p = g.player.pos;
    // the sights of Patiala, found on the Bullet
    for (const s of AURA.spots) {
      if (Math.hypot(p.x - s.x, p.z - s.z) > s.r) continue;
      if (!a.today.spots[s.id]) { a.today.spots[s.id] = 1; this.checkGoals(); }
      if (!a.spots[s.id]) { a.spots[s.id] = Date.now(); this.give(s.pts, `${s.icon} Found: ${s.name}`); this.checkGoals(); }
    }
    const n = ringNearest(p.x, p.z), on = n.d < RING.w / 2 + 0.8, sp = Math.abs(v.speed);
    const top = (BIKE_ENGINES[v.data.hp] || BIKE_ENGINES[0]).top;
    if (on && sp > 4) {
      const moved = Math.min(sp, top * 1.1) * dt;
      a.dist += moved; a.today.dist += moved; this.acc += moved;
      while (this.acc >= AURA.distEvery) {
        this.acc -= AURA.distEvery;
        if (a.today.distPts < AURA.distPerDay) { a.today.distPts++; this.give(1, '', false); }
      }
      if (Math.random() < dt) this.checkGoals();
    }
    // laps: progress along the loop in either direction; all four sides; leaving the road for
    // a few seconds starts over
    const L = PATH.L;
    if (on) {
      this.off = 0;
      if (!this.lap) this.lap = { prog: 0, t: 0, quads: new Set(), prevS: n.s };
      const lp = this.lap;
      let ds = n.s - lp.prevS;
      if (ds > L / 2) ds -= L; else if (ds < -L / 2) ds += L;
      lp.prevS = n.s;
      lp.prog += ds;
      lp.t += dt;
      lp.quads.add(Math.floor(n.s / (L / 4)));
      if (Math.abs(lp.prog) >= L) {
        if (lp.quads.size === 4 && lp.t >= AURA.lapMin) this.completeLap(lp.t);
        this.lap = { prog: Math.sign(lp.prog) * (Math.abs(lp.prog) - L), t: 0, quads: new Set([Math.floor(n.s / (L / 4))]), prevS: n.s };
      }
    } else if (this.lap) {
      this.off += dt;
      if (this.off > 6) this.lap = null;
      else this.lap.t += dt;
    }
  }

  // the HUD line while riding
  status() {
    const a = this.a, lp = this.lap;
    const lap = lp && Math.abs(lp.prog) > 4 ? ` · 🏁 ${fmtT(lp.t)} ${Math.round(Math.min(1, Math.abs(lp.prog) / PATH.L) * 100)}%` : ' · ride the ring road 🛣️';
    return `✨ <b>${a.pts}</b>${lap}`;
  }

  // ---------- spending Aura
  buy(id) {
    const r = AURA.rewards[id], a = this.a;
    if (!r) return 'Unknown';
    if (a.owned[id]) return 'Already yours';
    if (a.pts < r.cost) return `Needs ${r.cost} ✨`;
    a.pts -= r.cost;
    a.owned[id] = Date.now();
    if (id === 'title') a.title = true;
    if (r.paint) a.paint = id;
    this.game.vehicles.map.bike?.dressBike();
    this.game.ui.refreshAll();
    return '';
  }
  paint(id) {
    const a = this.a;
    if (id && !a.owned[id]) return;
    a.paint = id;
    this.game.vehicles.map.bike?.dressBike();
  }
}
