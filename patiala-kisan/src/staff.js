// Workers and managers. Seeris farm a field each; the Dukaandar keeps the Mandi stall stocked and
// banks the cash, the Pali looks after the animals, the Mistri runs the workshops and the Munshi
// handles orders and surplus sales. All of them walk the farm, can be trained through five ranks
// and keep working (up to OFFLINE_HOURS) while the game is closed.
import * as THREE from 'three';
import { Walker } from './market.js';
import { StackView } from './cargo.js';
import { MANAGERS, SEERI, MANAGER_RANKS, wage, FIELDS, CROPS, ITEMS, STALL, MUNSHI_KEEP, MUNSHI_RATE, DUKAANDAR_KEEP, OFFLINE_HOURS, PLOT } from './config.js';
import { addStorage, storageUsed } from './state.js';
import { POS } from './world.js';
import { fmt } from './pads.js';

const _l = new THREE.Vector3(), _v = new THREE.Vector3();
const stars = (rank) => '★'.repeat(rank + 1) + '<i>' + '★'.repeat(MANAGER_RANKS.length - 1 - rank) + '</i>';

class Seeri {
  constructor(staff, f) {
    this.staff = staff;
    this.game = staff.game;
    this.f = f;
    this.w = new Walker(this.game, { ...SEERI.look, tools: true });
    this.w.pos.set(f.x0 - 0.8, 0, f.z0 + f.rows * PLOT / 2);
    this.busy = 0;
    this.plot = null;
    this.idle = 0;
    this.label = this.game.labels.add(() => this.note, () => _l.set(this.w.pos.x, 2.5, this.w.pos.z), 'bubble', 14);
    this.note = '';
  }
  speed() { return MANAGER_RANKS[this.game.state.seeriRank].speed; }
  update(dt) {
    const g = this.game, st = g.state, farm = g.farm, fd = st.fields[this.f.id];
    this.w.maxSpeed = 3.2 * this.speed();
    const workT = 0.7 / this.speed();
    if (this.busy > 0) {
      this.busy -= dt;
      this.w.update(dt, 1 - this.busy / workT);
      if (this.busy <= 0) this.act();
      return;
    }
    const arrived = this.w.update(dt);
    if (this.plot && arrived) { this.busy = workT; this.showTool(); return; }
    if (!this.plot) {
      this.idle -= dt;
      if (this.idle > 0) return;
      // nearest plot that needs work
      let best = null, bd = 1e9;
      for (const p of farm.byField[this.f.id]) {
        const a = farm.nextAction(p);
        if (!a) continue;
        if (a === 'plant' && !this.staff.seedReady(fd.crop)) { this.note = this.staff.seedNote(fd.crop); continue; }
        const d = Math.hypot(p.x - this.w.pos.x, p.z - this.w.pos.z) - (a === 'harvest' ? 3 : 0);
        if (d < bd) { bd = d; best = p; }
      }
      if (!best) { this.idle = 1.5; return; }
      this.note = '';
      this.plot = best;
      this.w.goto(best.x - 0.5, best.z + 0.4);
    }
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
    else if (a === 'plant' && this.staff.seedReady(fd.crop)) farm.plant(p, fd.crop);
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
  remove() { this.w.remove(); this.game.labels.remove(this.label); }
}

// Base for the four managers: a walker with a desk, a name tag with rank stars and a status note
class Manager {
  constructor(staff, role) {
    this.staff = staff;
    this.game = staff.game;
    this.role = role;
    this.cfg = MANAGERS[role];
    const [dx, dz] = POS.desks[role];
    this.home = [dx, dz - 0.85];
    this.w = new Walker(this.game, { ...this.cfg.look, tools: true });
    this.w.pos.set(this.home[0], 0, this.home[1]);
    this.w.rot = 0;
    this.note = '';
    this.wait = 0;
    this.holdTool(this.cfg.tool);
    this.label = this.game.labels.add(() => this.tag(), () => _l.set(this.w.pos.x, 2.55, this.w.pos.z), 'mgr', 24);
  }
  get data() { return this.game.state.managers[this.role]; }
  speed() { return MANAGER_RANKS[this.data.rank].speed * (this.staff.unpaid > 0 ? 0 : 1); }
  tag() { return `<b>${this.cfg.icon} ${this.cfg.name}</b> <span class="stars">${stars(this.data.rank)}</span>${this.note ? `<br><small>${this.note}</small>` : ''}`; }
  holdTool(k) { for (const t in this.w.h.tools) this.w.h.tools[t].visible = t === k; }
  goHome() { this.w.go([this.home]); this.state = 'home'; }
  status() { return this.note || 'Waiting at the desk'; }
  update(dt) {
    const sp = this.speed();
    if (sp <= 0) { this.note = '😴 Wages unpaid'; this.w.update(dt); return; }
    this.w.maxSpeed = 3.2 * sp;
    this.tick(dt, sp);
  }
  remove() { this.w.remove(); this.game.labels.remove(this.label); }
}

// Dukaandar: godown → stall (restock) → cash pile (bank) → desk
class Dukaandar extends Manager {
  constructor(staff) {
    super(staff, 'dukaandar');
    const back = new THREE.Group();
    back.position.set(0, 1.0, -0.36);
    this.w.group.add(back);
    this.stack = new StackView(back, { cap: 40, layout: 'tower', cols: 2, dx: 0.42 });
    this.load = [];
    this.state = 'home';
    this.t = 0;
  }
  cap() { return 8 + this.data.rank * 6; }
  shelfRoom() { const st = this.game.state; return STALL[st.up.stall].shelf - this.game.market.stock(); }
  // items worth bringing: godown stock above the reserve, most valuable first
  sellable() {
    const st = this.game.state;
    return Object.keys(st.storage).filter((k) => st.storage[k] > DUKAANDAR_KEEP && ITEMS[k]).sort((a, b) => ITEMS[b].price - ITEMS[a].price);
  }
  sync() { this.stack.set(this.load); }
  tick(dt, sp) {
    const g = this.game, st = g.state, m = g.market;
    const arrived = this.w.update(dt, this.state === 'load' || this.state === 'unload' ? (this.t * 3) % 1 : 0);
    this.stack.update(dt, this.w.speed * 0.8);
    switch (this.state) {
      case 'home':
        if (!arrived) return;
        this.w.face(0);
        this.holdTool(this.cfg.tool);
        this.wait -= dt;
        if (this.wait > 0) return;
        this.wait = 1.2;
        if (this.shelfRoom() > 4 && this.sellable().length) { this.note = '🚶 To the godown'; this.state = 'toGodown'; this.w.go([[12.4, -10.5], [8.2, -13.9]]); }
        else if (st.pile >= 25) { this.note = '💰 Collecting cash'; this.state = 'toPile'; this.w.go([[15.8, -3.6], [14.6, -2.6]]); }
        else this.note = this.shelfRoom() <= 4 ? '✅ Stall is full' : '📦 Godown empty — need stock';
        return;
      case 'toGodown': if (arrived) { this.state = 'load'; this.t = 0; this.holdTool(null); } return;
      case 'load': {
        this.t += dt;
        const step = 0.16 / sp;
        while (this.t >= step) {
          this.t -= step;
          const room = Math.min(this.cap(), this.shelfRoom()) - this.load.length;
          const k = this.sellable()[0];
          if (room <= 0 || !k) {
            if (this.load.length) { this.note = `🧺 Taking ${this.load.length} to the stall`; this.state = 'toStall'; this.w.go([[9.4, -9.2], [10, -5.2]]); }
            else this.goHome();
            return;
          }
          st.storage[k]--; if (!st.storage[k]) delete st.storage[k];
          this.load.push(k);
          if (this.near(14)) { g.flyers.add(k, new THREE.Vector3(POS.godown[0], 1, POS.godown[1] + 2), () => this.w.pos.clone().setY(1.3 + this.load.length * 0.05), 0.25); g.audio.play('pop'); }
          this.sync();
        }
        return;
      }
      case 'toStall': if (arrived) { this.state = 'unload'; this.t = 0; this.w.face(Math.PI); } return;
      case 'unload': {
        this.t += dt;
        const step = 0.12 / sp;
        while (this.t >= step) {
          this.t -= step;
          if (!this.load.length || this.shelfRoom() <= 0) {
            if (this.load.length) { this.note = '⏳ Waiting for space on the stall'; this.t = -1; return; }
            if (st.pile > 0) { this.note = '💰 Collecting cash'; this.state = 'toPile'; this.w.go([[13.6, -4.6], [14.6, -2.6]]); }
            else { this.note = ''; this.goHome(); }
            return;
          }
          const id = this.load.pop();
          st.stall[id] = (st.stall[id] || 0) + 1;
          g.flyers.add(id, this.w.pos.clone().setY(1.4), new THREE.Vector3(POS.stall[0] + (Math.random() - 0.5) * 3, 1.4, POS.stall[1] + 0.5), 0.28, () => m.refreshShelf());
          if (this.near(14)) g.audio.play('pop');
          this.sync();
          g.emit('stock', { manager: true });
        }
        return;
      }
      case 'toPile':
        if (!arrived) return;
        if (st.pile > 0) {
          const amt = st.pile;
          st.pile = 0;
          this.staff.log.dukaandar = (this.staff.log.dukaandar || 0) + amt;
          for (let i = 0; i < Math.min(6, Math.ceil(amt / 20)); i++) setTimeout(() => g.flyers.add('cash', new THREE.Vector3(POS.pile[0], 0.4, POS.pile[1]), () => this.w.pos.clone().setY(1.3), 0.3), i * 50);
          g.earn(amt);
          if (this.near(16)) { g.audio.play('cash'); g.ui.float(`+₹${fmt(amt)} 🧺`, POS.pile[0], 1.8, POS.pile[1], 'money'); }
          m.refreshPile();
        }
        this.note = '';
        this.w.go([[15.6, -4.0], this.home]);
        this.state = 'home';
        return;
    }
  }
  near(r) { const p = this.game.player.pos; return Math.hypot(p.x - this.w.pos.x, p.z - this.w.pos.z) < r; }
  status() {
    if (this.state === 'load') return `📦 Loading at the godown (${this.load.length}/${this.cap()})`;
    if (this.state === 'unload') return '🧺 Stocking the stall';
    return super.status();
  }
}

// Rounds: a manager who walks a loop of stops and does a job at each one
class Rounds extends Manager {
  constructor(staff, role, stops) {
    super(staff, role);
    this.stopsFn = stops;
    this.i = -1;
    this.state = 'home';
  }
  tick(dt, sp) {
    const arrived = this.w.update(dt, this.wait > 0 ? (this.wait * 2) % 1 : 0);
    if (this.wait > 0) { this.wait -= dt; return; }
    if (!arrived) return;
    const stops = this.stopsFn();
    if (this.state === 'work') {
      const s = stops[this.i];
      if (s) { this.note = s.job() || ''; this.wait = 1.6 / sp; }
      this.state = 'walk';
      return;
    }
    if (!stops.length) { this.note = this.idleNote || ''; if (this.state !== 'home') this.goHome(); this.w.face(0); return; }
    this.i = (this.i + 1) % stops.length;
    const s = stops[this.i];
    this.w.go(s.path);
    this.state = 'work';
  }
}

export class Staff {
  constructor(game) {
    this.game = game;
    this.seeris = {};
    this.managers = {};
    this.log = {};
    this.unpaid = 0;
    // hire desks: stand on the white ring to pay, then tap the button to manage
    const st = game.state;
    for (const [role, cfg] of Object.entries(MANAGERS)) {
      const [x, z] = POS.desks[role];
      game.pads.add({
        x, z: z + 1.35, r: 1.0,
        label: () => `<b>👔 Hire ${cfg.name}</b><br>${cfg.role} · ₹${cfg.hire.toLocaleString('en-IN')}${st.level < cfg.level ? `<br>🔒 Level ${cfg.level}` : ''}`,
        visible: () => !st.managers[role].on,
        pay: { level: cfg.level, cost: cfg.hire, ref: () => st.managers[role], done: () => this.hire(role, null, true) },
      });
      game.actions.add({ label: () => `👔 ${cfg.name} ${'★'.repeat(st.managers[role].rank + 1)}`, x, z: z + 1.35, r: 1.7, visible: () => st.managers[role].on, onPress: () => game.ui.openStaff(role) });
    }
    this.sync();
  }

  // ---------- money
  seedReady(crop) {
    const st = this.game.state, c = CROPS[crop];
    if (st.level < c.level) return false;
    if ((st.seeds[crop] || 0) > 0) return true;
    if (st.money >= c.seed) { st.money -= c.seed; st.seeds[crop] = 1; return true; }
    return false;
  }
  seedNote(crop) { return this.game.state.level < CROPS[crop].level ? '🔒 Crop locked' : '🪙 Need money for seeds'; }

  hireCost(role) { return (MANAGERS[role] || SEERI).hire; }
  hire(role, fid, prepaid = false) {
    const g = this.game, st = g.state, cfg = role === 'seeri' ? SEERI : MANAGERS[role];
    if (st.level < cfg.level || (!prepaid && st.money < cfg.hire)) return false;
    if (role === 'seeri') { if (!st.fields[fid].owned || st.fields[fid].seeri) return false; st.fields[fid].seeri = true; }
    else { if (st.managers[role].on) return false; st.managers[role].on = true; st.managers[role].paid = 0; }
    if (!prepaid) st.money -= cfg.hire;
    st.stats.staff = (st.stats.staff || 0) + 1;
    st.stats.seeris = Object.values(st.fields).filter((f) => f.seeri).length;
    this.sync();
    g.emit('hire', { key: role });
    g.ui.toast(`👔 ${cfg.name} hired! ${role === 'seeri' ? 'They will farm this field.' : cfg.desc}`, 3.5);
    g.fx.sparkle(...(role === 'seeri' ? [g.player.pos.x, 1.5, g.player.pos.z] : [POS.desks[role][0], 1.5, POS.desks[role][1]]), 0xffd43b, 24);
    g.ui.money();
    return true;
  }
  fire(role, fid) {
    const st = this.game.state;
    if (role === 'seeri') st.fields[fid].seeri = false; else st.managers[role].on = false;
    this.sync();
  }
  rankOf(role) { return role === 'seeri' ? this.game.state.seeriRank : this.game.state.managers[role].rank; }
  trainCost(role) {
    const next = MANAGER_RANKS[this.rankOf(role) + 1];
    return next ? Math.round(this.hireCost(role) * next.costMul) : null;
  }
  train(role) {
    const st = this.game.state, cost = this.trainCost(role);
    if (cost === null || st.money < cost) return false;
    st.money -= cost;
    if (role === 'seeri') st.seeriRank++; else st.managers[role].rank++;
    st.stats.topRank = Math.max(st.stats.topRank || 0, this.rankOf(role));
    this.game.emit('train', { key: role });
    return true;
  }

  salaries() {
    const st = this.game.state;
    let total = Object.values(st.fields).filter((f) => f.owned && f.seeri).length * wage(SEERI.salary, st.seeriRank);
    for (const [k, m] of Object.entries(st.managers)) if (m.on) total += wage(MANAGERS[k].salary, m.rank);
    return total;
  }

  // called at the end of each in-game day
  payDay() {
    const g = this.game, st = g.state, s = this.salaries();
    if (!s) return;
    if (st.money >= s) { st.money -= s; g.ui.toast(`Paid ₹${s} in wages 🧾`); }
    else { g.ui.toast(`Not enough money for wages (₹${s}). Workers rest for a minute.`, 3); this.unpaid = 1; }
    g.ui.money();
  }

  sync() {
    const g = this.game, st = g.state;
    for (const f of FIELDS) {
      const want = st.fields[f.id].owned && st.fields[f.id].seeri;
      if (want && !this.seeris[f.id]) this.seeris[f.id] = new Seeri(this, f);
      if (!want && this.seeris[f.id]) { this.seeris[f.id].remove(); delete this.seeris[f.id]; }
    }
    const P = POS.pens, B = POS.buildings;
    const make = {
      dukaandar: () => new Dukaandar(this),
      pali: () => {
        const r = new Rounds(this, 'pali', () => Object.entries(P).filter(([id]) => st.pens[id].owned).map(([id, [x, z]]) => ({
          path: [[x, z + (z < -14 ? 4.4 : -4.0)]],
          job: () => { const pen = g.animals.pens[id]; pen.autoCare(); return `🐾 Caring for the ${pen.cfg.en.toLowerCase()}`; },
        })));
        r.idleNote = '🐾 No animals yet';
        return r;
      },
      mistri: () => {
        const r = new Rounds(this, 'mistri', () => Object.entries(B).filter(([id]) => st.buildings[id].owned).map(([id, [x, z]]) => ({
          path: [[x, z + 4.4]],
          job: () => { const s = g.production.shops[id]; s.autoRun(); return `🔧 ${s.cfg.name}: ${s.statusText()}`; },
        })));
        r.idleNote = '🏭 No workshops yet';
        return r;
      },
      munshi: () => new Rounds(this, 'munshi', () => [
        { path: [[15.6, 2.6], [13.6, 4.4]], job: () => this.munshiJob(0) },
        { path: [[15.6, 0], [13.8, -9], [9, -14.4]], job: () => this.munshiJob(1) },
        { path: [[8.8, -8.2], [6.7, -3.0]], job: () => this.munshiJob(2) },
        { path: [[7.2, -4.6], [13.6, -4.6], [15.6, 0]], job: () => '' },
      ]),
    };
    for (const role of Object.keys(MANAGERS)) {
      const want = st.managers[role].on;
      if (want && !this.managers[role]) this.managers[role] = make[role]();
      if (!want && this.managers[role]) { this.managers[role].remove(); delete this.managers[role]; }
    }
  }

  munshiJob(i) {
    const g = this.game, st = g.state, quiet = g.simulating;
    if (i === 0) {
      for (const o of st.orders.slice()) if (g.market.fill(o, true)) {
        this.log.munshi = (this.log.munshi || 0) + o.reward;
        if (!quiet) g.ui.toast(`📒 Munshi filled ${o.name}'s order +₹${o.reward}`);
        return `📋 Filled ${o.name}'s order`;
      }
      return '📋 No order can be filled yet';
    }
    if (i === 2) {
      let sold = 0, money = 0;
      const limit = 25 + this.rankOf('munshi') * 15;
      for (const [k, n] of Object.entries(st.storage)) {
        const extra = n - MUNSHI_KEEP;
        if (extra <= 0) continue;
        const q = Math.min(extra, limit - sold);
        st.storage[k] -= q;
        if (!st.storage[k]) delete st.storage[k];
        money += Math.round(g.market.price(k) * MUNSHI_RATE) * q;
        sold += q;
        st.stats.sold += q;
        if (sold >= limit) break;
      }
      if (money) {
        g.earn(money);
        this.log.munshi = (this.log.munshi || 0) + money;
        if (!quiet) g.ui.float(`+₹${fmt(money)} 📒`, POS.arhtiyaPad[0], 2, POS.arhtiyaPad[1], 'money');
        return `⚖️ Sold ${sold} surplus for ₹${fmt(money)}`;
      }
      return '⚖️ Nothing surplus to sell';
    }
    return `🏚️ Checking the godown (${storageUsed(st)})`;
  }

  // Status line for the Staff menu
  status(role) {
    const m = this.managers[role];
    if (!m) return '';
    return m.status();
  }

  update(dt) {
    if (this.unpaid > 0) this.unpaid -= dt / 60;
    for (const k in this.seeris) this.seeris[k].update(this.unpaid > 0 ? 0 : dt);
    for (const k in this.managers) this.managers[k].update(dt);
  }

  // ---------- offline work: replay up to OFFLINE_HOURS in 30-second steps
  catchUp() {
    const g = this.game, st = g.state;
    if (!st.saved) return null;
    const away = Math.min(Date.now() - st.saved, OFFLINE_HOURS * 3600e3);
    const M = st.managers;
    const seeriFields = FIELDS.filter((f) => st.fields[f.id].owned && st.fields[f.id].seeri);
    if (away < 300e3 || (!seeriFields.length && !Object.values(M).some((m) => m.on))) return null;
    g.simulating = true;
    const before = { money: st.money, harvested: st.stats.harvested, made: st.stats.made, products: st.stats.products };
    const sum = { stall: 0, stallItems: 0, harvested: 0, products: 0, made: 0 };
    const STEP = 30e3, start = st.saved, end = st.saved + away;
    let munshiT = 0;
    for (let t = start; t < end; t += STEP) {
      for (const f of seeriFields) sum.harvested += this.simField(f, t);
      for (const id in g.animals.pens) {
        const pen = g.animals.pens[id];
        if (M.pali.on) { const r = pen.data.ready; pen.autoCare(); sum.products += r - pen.data.ready; }
        pen.produce(t);
      }
      for (const id in g.production.shops) {
        const s = g.production.shops[id];
        s.process(t);
        if (M.mistri.on) s.autoRun(t);
      }
      if (M.munshi.on && (munshiT += STEP) >= 300e3) { munshiT = 0; this.munshiJob(0); this.munshiJob(2); }
      if (M.dukaandar.on) {
        // customers buy about two items per visit from the stall the Dukaandar keeps full
        let n = Math.floor(STEP / 1000 / STALL[st.up.stall].every * 2 * (0.6 + M.dukaandar.rank * 0.1));
        for (const k of Object.keys(st.storage).sort((a, b) => ITEMS[b].price - ITEMS[a].price)) {
          while (n > 0 && st.storage[k] > DUKAANDAR_KEEP) {
            st.storage[k]--; n--;
            const p = g.market.price(k);
            sum.stall += p; sum.stallItems++;
            st.stats.sold++;
          }
          if (n <= 0) break;
        }
      }
    }
    if (sum.stall) g.earn(sum.stall);
    g.simulating = false;
    g.farm.dirty = true;
    const res = {
      minutes: Math.round(away / 60000),
      money: st.money - before.money,
      stall: sum.stall, stallItems: sum.stallItems,
      harvested: st.stats.harvested - before.harvested,
      made: st.stats.made - before.made,
      products: sum.products,
      munshi: this.log.munshi || 0,
    };
    this.log = {};
    return res;
  }

  // one 30-second step of a Seeri's field while the game was closed
  simField(f, t) {
    const g = this.game, st = g.state, farm = g.farm, fd = st.fields[f.id];
    let got = 0;
    for (const p of farm.byField[f.id]) {
      const d = farm.data(p), s = farm.stage(p, t);
      if (s === 0) d.s = 1;
      else if (s === 1) { if (this.seedReady(fd.crop) && st.seeds[fd.crop] > 0) { st.seeds[fd.crop]--; if (!st.seeds[fd.crop]) delete st.seeds[fd.crop]; d.s = 2; d.c = fd.crop; d.w = 0; } }
      else if (s === 2 && !d.w) d.w = t;
      else if (s === 4) {
        const n = CROPS[d.c].yield;
        const k = addStorage(st, d.c, n);
        st.stats.harvested += n;
        got += k;
        d.s = 0; d.c = null; d.w = 0;
      }
    }
    return got;
  }
}

export { stars };
