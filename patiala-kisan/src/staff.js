// Workers and managers. Seeris farm a field each, the Pali looks after the animals, the Mistri
// runs the workshops and the Munshi handles orders and surplus sales. All are visible in the world.
import * as THREE from 'three';
import { Walker } from './market.js';
import { STAFF, FIELDS, CROPS, ITEMS, MUNSHI_KEEP, MUNSHI_RATE, PLOT } from './config.js';
import { addStorage } from './state.js';
import { POS } from './world.js';

class Seeri {
  constructor(game, f) {
    this.game = game;
    this.f = f;
    this.w = new Walker(game, { turban: 0xf2c400, shirt: 0xe9ecef, pants: 0x495057, tools: true });
    this.w.pos.set(f.x0 - 0.8, 0, f.z0 + f.rows * PLOT / 2);
    this.busy = 0;
    this.plot = null;
    this.idle = 0;
    this.label = game.labels.add(() => this.note, () => _l.set(this.w.pos.x, 2.4, this.w.pos.z), 'bubble', 14);
    this.note = '';
  }
  update(dt) {
    const g = this.game, st = g.state, farm = g.farm, fd = st.fields[this.f.id];
    if (this.busy > 0) {
      this.busy -= dt;
      this.w.update(dt, 1 - this.busy / 0.7);
      if (this.busy <= 0) this.act();
      return;
    }
    const arrived = this.w.update(dt);
    if (this.plot && arrived) { this.busy = 0.7; this.showTool(); return; }
    if (!this.plot) {
      this.idle -= dt;
      if (this.idle > 0) return;
      // nearest plot that needs work
      let best = null, bd = 1e9;
      for (const p of farm.byField[this.f.id]) {
        const a = farm.nextAction(p);
        if (!a) continue;
        if (a === 'plant' && !this.seedReady(fd.crop)) continue;
        const d = Math.hypot(p.x - this.w.pos.x, p.z - this.w.pos.z) - (a === 'harvest' ? 3 : 0);
        if (d < bd) { bd = d; best = p; }
      }
      if (!best) { this.idle = 1.5; this.note = ''; return; }
      this.plot = best;
      this.w.goto(best.x - 0.5, best.z + 0.4);
    }
  }
  seedReady(crop) {
    const st = this.game.state, c = CROPS[crop];
    if (st.level < c.level) return false;
    if ((st.seeds[crop] || 0) > 0) return true;
    if (st.money >= c.seed) { st.money -= c.seed; st.seeds[crop] = 1; return true; }
    this.note = '🪙 Need money for seeds';
    return false;
  }
  showTool() {
    const a = this.game.farm.nextAction(this.plot);
    const tools = this.w.h.tools;
    for (const k in tools) tools[k].visible = k === { till: 'hoe', plant: 'seed', water: 'can', harvest: 'sickle' }[a];
  }
  act() {
    const g = this.game, st = g.state, farm = g.farm, p = this.plot, fd = st.fields[this.f.id];
    this.plot = null;
    const a = farm.nextAction(p);
    if (a === 'till') { farm.till(p); g.fx.soil(p.x, p.z); }
    else if (a === 'plant' && this.seedReady(fd.crop)) farm.plant(p, fd.crop);
    else if (a === 'water') { farm.water(p); g.fx.water(p.x, p.z); }
    else if (a === 'harvest') {
      const n = farm.harvest(p);
      if (n) {
        const crop = farm.lastHarvest.crop;
        const k = addStorage(st, crop, n);
        st.stats.harvested += n;
        g.addXP(Math.ceil(CROPS[crop].xp / 2));
        g.fx.leaves(p.x, p.z, CROPS[crop].leaf);
        this.note = k < n ? '🏚️ Godown full!' : '';
        g.emit('harvested', { crop, n });
      }
    }
    if (Math.hypot(g.player.pos.x - p.x, g.player.pos.z - p.z) < 10) g.audio.play(a === 'till' ? 'till' : a === 'water' ? 'water' : a === 'harvest' ? 'harvest' : 'plant');
  }
  remove() { this.w.remove(); this.label.el.remove(); this.game.labels.list.splice(this.game.labels.list.indexOf(this.label), 1); }
}
const _l = new THREE.Vector3();

// A manager who walks a loop of stops and runs a job at each one
class Rounds {
  constructor(game, look, stops, job) {
    this.game = game;
    this.w = new Walker(game, look);
    this.stops = stops;
    this.i = 0;
    this.job = job;
    this.wait = 0;
    const s = stops[0];
    this.w.pos.set(s[0], 0, s[1]);
  }
  update(dt) {
    if (this.wait > 0) { this.wait -= dt; this.w.update(dt, (this.wait * 2) % 1); return; }
    const arrived = this.w.update(dt);
    if (arrived) {
      this.job(this.i);
      this.wait = 1.6;
      this.i = (this.i + 1) % this.stops.length;
      const s = this.stops[this.i];
      this.w.goto(s[0], s[1]);
    }
  }
}

export class Staff {
  constructor(game) {
    this.game = game;
    this.seeris = {};
    this.managers = {};
    this.sync();
  }

  hireCost(role) { return STAFF[role].hire; }

  hire(role, fid) {
    const g = this.game, st = g.state, cfg = STAFF[role];
    if (st.level < cfg.level || st.money < cfg.hire) return false;
    if (role === 'seeri') { if (!st.fields[fid].owned || st.fields[fid].seeri) return false; st.fields[fid].seeri = true; }
    else { if (st.staff[role]) return false; st.staff[role] = true; }
    st.money -= cfg.hire;
    st.stats.staff = (st.stats.staff || 0) + 1;
    st.stats.seeris = Object.values(st.fields).filter((f) => f.seeri).length;
    this.sync();
    g.emit('hire', { key: role });
    return true;
  }
  fire(role, fid) {
    const st = this.game.state;
    if (role === 'seeri') st.fields[fid].seeri = false; else st.staff[role] = false;
    this.sync();
  }

  salaries() {
    const st = this.game.state;
    let total = Object.values(st.fields).filter((f) => f.seeri).length * STAFF.seeri.salary;
    for (const k of ['pali', 'mistri', 'munshi']) if (st.staff[k]) total += STAFF[k].salary;
    return total;
  }

  // called at the end of each in-game day
  payDay() {
    const g = this.game, st = g.state, s = this.salaries();
    if (!s) return;
    if (st.money >= s) { st.money -= s; g.ui.toast(`Paid ₹${s} in wages 🧾`); }
    else { g.ui.toast(`Not enough money for wages (₹${s}). Workers rest today.`, 3); this.unpaid = 1; }
    g.ui.money();
  }

  sync() {
    const g = this.game, st = g.state;
    for (const f of FIELDS) {
      const want = st.fields[f.id].owned && st.fields[f.id].seeri;
      if (want && !this.seeris[f.id]) this.seeris[f.id] = new Seeri(g, f);
      if (!want && this.seeris[f.id]) { this.seeris[f.id].remove(); delete this.seeris[f.id]; }
    }
    const P = POS.pens, B = POS.buildings;
    const defs = {
      pali: [{ turban: 0x2b8a3e, shirt: 0xffec99, pants: 0x495057 }, Object.values(P).map(([x, z]) => [x, z + (z < -14 ? 4.4 : -4.0)]), (i) => {
        const id = Object.keys(P)[i]; g.animals.pens[id].autoCare();
      }],
      mistri: [{ turban: 0x1c4fd1, shirt: 0xadb5bd, pants: 0x343a40 }, Object.values(B).map(([x, z]) => [x, z + 4.6]), (i) => {
        g.production.shops[Object.keys(B)[i]].autoRun();
      }],
      munshi: [{ turban: 0xffffff, shirt: 0xf8f9fa, pants: 0xf8f9fa, vest: 0x343a40 }, [[POS.board[0] - 1.2, POS.board[1] + 1.2], [POS.godownPad[0] + 2, POS.godownPad[1]], [POS.arhtiyaPad[0] + 1.5, POS.arhtiyaPad[1] + 0.6]], (i) => this.munshiJob(i)],
    };
    for (const [role, [look, stops, job]] of Object.entries(defs)) {
      if (st.staff[role] && !this.managers[role]) this.managers[role] = new Rounds(g, look, stops, job);
      if (!st.staff[role] && this.managers[role]) { this.managers[role].w.remove(); delete this.managers[role]; }
    }
  }

  munshiJob(i) {
    const g = this.game, st = g.state;
    if (i === 0) {
      for (const o of st.orders.slice()) if (g.market.fill(o, true)) { g.ui.toast(`Munshi filled ${o.name}'s order +₹${o.reward}`); break; }
    } else if (i === 2) {
      let sold = 0, money = 0;
      for (const [k, n] of Object.entries(st.storage)) {
        const extra = n - MUNSHI_KEEP;
        if (extra <= 0) continue;
        const q = Math.min(extra, 25 - sold);
        st.storage[k] -= q;
        money += Math.round(g.market.price(k) * MUNSHI_RATE) * q;
        sold += q;
        st.stats.sold += q;
        if (sold >= 25) break;
      }
      if (money) { g.earn(money); g.ui.float(`+₹${money}`, POS.arhtiyaPad[0], 2, POS.arhtiyaPad[1], 'money'); }
    }
  }

  update(dt) {
    if (this.unpaid) { this.unpaid -= dt / 60; return; }
    for (const k in this.seeris) this.seeris[k].update(dt);
    for (const k in this.managers) this.managers[k].update(dt);
  }
}
