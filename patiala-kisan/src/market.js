// Mandi: stock the stall, villagers queue up and buy, cash piles up for you to collect.
// Also the Arhtiya (instant wholesale), the godown, the tubewell and the order board.
import * as THREE from 'three';
import { makeHuman, animateHuman } from './models.js';
import { StackView, noteGeometry } from './cargo.js';
import { POS } from './world.js';
import { ITEMS, STALL, ARHTIYA_RATE, CANS, TANKER_CAP, CROPS, PENS, BUILDINGS, RECIPES, CUSTOMER_LINES, CUSTOMER_NAMES } from './config.js';
import { carryCap, storageCap, storageUsed, addStorage, have, take } from './state.js';
import { fmt } from './pads.js';

const _v = new THREE.Vector3();
const TURBANS = [0xe8590c, 0x1c4fd1, 0xd6336c, 0x2b8a3e, 0xf2c400, 0x7b2cbf, 0x111111, 0xffffff, 0x0ca678];
const SHIRTS = [0xf8f4ea, 0x74c0fc, 0xffd8a8, 0xb2f2bb, 0xfcc2d7, 0xd0bfff, 0xffec99];

export class Walker {
  constructor(game, o) {
    this.game = game;
    this.h = makeHuman(o);
    this.group = this.h.group;
    this.pos = this.group.position;
    this.rot = 0;
    this.speed = 0;
    this.target = null;
    this.t = Math.random() * 10;
    game.scene.add(this.group);
    this.group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  }
  goto(x, z) { this.target = [x, z]; }
  update(dt, work = 0) {
    this.t += dt;
    let moving = false;
    if (this.target) {
      const dx = this.target[0] - this.pos.x, dz = this.target[1] - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.08) {
        const sp = Math.min(3.2, d * 4);
        this.pos.x += dx / d * sp * dt; this.pos.z += dz / d * sp * dt;
        let dr = Math.atan2(dx, dz) - this.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        this.rot += dr * Math.min(1, dt * 10);
        this.speed = sp; moving = true;
      } else { this.target = null; }
    }
    if (!moving) this.speed = 0;
    this.group.rotation.y = this.rot;
    animateHuman(this.h, this.t, this.speed, work);
    return !this.target;
  }
  face(rot) { this.rot = rot; }
  remove() { this.game.scene.remove(this.group); }
}

export class Market {
  constructor(game) {
    this.game = game;
    const st = game.state;
    this.customers = [];
    this.spawnT = 3;
    const [sx, sz] = POS.stall;
    // shelf stock view on the counter
    const shelf = new THREE.Group();
    shelf.position.set(sx, 1.18, sz + 0.5);
    game.scene.add(shelf);
    this.shelf = new StackView(shelf, { cap: 48, layout: 'grid', gx: 8, gz: 2, dx: 0.56, dz: 0.45, dy: 0.21 });
    const pileG = new THREE.Group();
    pileG.position.set(POS.pile[0], 0.05, POS.pile[1]);
    game.scene.add(pileG);
    this.pileView = new StackView(pileG, { cap: 60, layout: 'grid', gx: 3, gz: 4, dx: 0.52, dz: 0.27, dy: 0.15, geo: noteGeometry() });
    this.refreshShelf();
    this.refreshPile();

    const pads = game.pads;
    pads.add({ x: POS.stallPad[0], z: POS.stallPad[1], r: 1.1, color: 0xff922b, vehicleOk: true, label: () => `🧺 Stall ${this.stock()}/${STALL[st.up.stall].shelf}`, onStay: (dt) => this.stockTick(dt) });
    pads.add({ x: POS.pile[0], z: POS.pile[1] + 0.2, r: 1.25, color: 0xa98fd6, label: () => st.pile > 0 ? `₹${fmt(st.pile)}` : '', onStay: () => this.collect() });
    pads.add({ x: POS.arhtiyaPad[0], z: POS.arhtiyaPad[1], r: 1.1, color: 0xfab005, vehicleOk: true, label: `⚖️ Arhtiya · instant ${Math.round(ARHTIYA_RATE * 100)}%`, onStay: (dt) => this.arhtiyaTick(dt) });
    pads.add({ x: POS.godownPad[0], z: POS.godownPad[1], r: 1.2, color: 0x74c0fc, vehicleOk: true, label: () => `🏚️ Godown ${storageUsed(st)}/${storageCap(st)}`, onStay: (dt) => this.godownTick(dt) });
    pads.add({ x: POS.tankPad[0], z: POS.tankPad[1], r: 1.1, color: 0x4dabf7, vehicleOk: true, label: () => `💧 Tubewell`, onStay: (dt) => this.waterTick(dt) });
    game.actions.add({ label: () => `📋 Orders (${st.orders.length})`, x: POS.board[0], z: POS.board[1] + 1.2, r: 2.0, onPress: () => game.ui.openOrders() });
    game.actions.add({ label: () => '🏚️ Open Godown', x: POS.godownPad[0] + 2.6, z: POS.godownPad[1], r: 1.5, onPress: () => game.ui.openBag('storage') });
    while (st.orders.length < 3) st.orders.push(this.makeOrder());
  }

  stock() { return Object.values(this.game.state.stall).reduce((a, b) => a + b, 0); }
  priceMul() { return 1 + this.game.perks.price; }
  price(id) { return Math.max(1, Math.round(ITEMS[id].price * this.priceMul())); }

  refreshShelf() {
    const list = [];
    for (const [k, n] of Object.entries(this.game.state.stall)) for (let i = 0; i < n && list.length < 48; i++) list.push(k);
    this.shelf.set(list);
  }
  refreshPile() { this.pileView.set(Math.min(60, Math.ceil(this.game.state.pile / 20))); }

  // ---------- pads
  stockTick(dt) {
    const g = this.game, st = g.state;
    this.acc = (this.acc || 0) + dt;
    if (this.acc < 0.07) return;
    this.acc = 0;
    const cargo = g.activeCargo();
    if (!cargo.items.length) return;
    if (this.stock() >= STALL[st.up.stall].shelf) { if (!this.fullHint) { this.fullHint = true; g.ui.toast('Stall is full — wait for customers or sell at the Arhtiya'); } return; }
    this.fullHint = false;
    const id = cargo.items.pop();
    st.stall[id] = (st.stall[id] || 0) + 1;
    g.flyers.add(id, g.player.backPoint(_v), new THREE.Vector3(POS.stall[0] + (Math.random() - 0.5) * 3, 1.4, POS.stall[1] + 0.5), 0.28, () => this.refreshShelf());
    g.audio.play('pop');
    g.carryDirty = true; g.vehicleCargoDirty();
    g.emit('stock', {});
  }

  collect() {
    const g = this.game, st = g.state;
    if (st.pile <= 0) return;
    const amt = st.pile;
    st.pile = 0;
    const from = new THREE.Vector3(POS.pile[0], 0.4, POS.pile[1]);
    for (let i = 0; i < Math.min(10, Math.ceil(amt / 20)); i++) setTimeout(() => g.flyers.add('cash', from, () => g.player.backPoint(_v).setY(1.3), 0.3), i * 40);
    g.earn(amt, true);
    g.audio.play('cash');
    g.ui.float(`+₹${fmt(amt)}`, POS.pile[0], 1.6, POS.pile[1], 'money');
    this.refreshPile();
    g.emit('collect', {});
  }

  arhtiyaTick(dt) {
    const g = this.game;
    this.aAcc = (this.aAcc || 0) + dt;
    if (this.aAcc < 0.06) return;
    this.aAcc = 0;
    const cargo = g.activeCargo();
    if (!cargo.items.length) return;
    const id = cargo.items.pop();
    const p = Math.max(1, Math.round(this.price(id) * ARHTIYA_RATE));
    g.flyers.add(id, g.player.backPoint(_v), new THREE.Vector3(POS.arhtiya[0], 0.8, POS.arhtiya[1]), 0.25);
    g.earn(p);
    g.state.stats.sold++;
    g.emit('sold', { id, money: p });
    g.audio.play('coin');
    g.carryDirty = true; g.vehicleCargoDirty();
    g.ui.float(`+₹${p}`, POS.arhtiyaPad[0], 1.5, POS.arhtiyaPad[1], 'money');
  }

  godownTick(dt) {
    const g = this.game, st = g.state;
    this.gAcc = (this.gAcc || 0) + dt;
    if (this.gAcc < 0.05) return;
    this.gAcc = 0;
    const cargo = g.activeCargo();
    if (!cargo.items.length) return;
    if (storageUsed(st) >= storageCap(st)) { if (!this.gHint) { this.gHint = true; g.ui.toast('Godown is full — upgrade it in the Shop'); } return; }
    const id = cargo.items.pop();
    addStorage(st, id, 1);
    g.flyers.add(id, g.player.backPoint(_v), new THREE.Vector3(POS.godown[0], 1, POS.godown[1] + 2), 0.28);
    g.audio.play('pop');
    g.carryDirty = true; g.vehicleCargoDirty();
  }

  waterTick(dt) {
    const g = this.game, st = g.state;
    this.wAcc = (this.wAcc || 0) + dt;
    if (this.wAcc < 0.04) return;
    this.wAcc = 0;
    const v = g.player.vehicle;
    if (v && v.kind === 'tractor') {
      if (v.data.tank < TANKER_CAP) { v.data.tank = Math.min(TANKER_CAP, v.data.tank + 4); g.ui.vehicleMode(v); if (Math.random() < 0.2) g.audio.play('water'); }
      return;
    }
    const cap = CANS[st.up.can].cap;
    if (st.water >= cap) return;
    st.water++;
    g.fx.water(POS.tank[0], POS.tank[1]);
    if (st.water % 3 === 0) g.audio.play('water');
    g.ui.waterPill();
    if (st.water === cap) g.ui.toast(`${CANS[st.up.can].name} full 💧`, 1.2);
  }

  // ---------- orders
  unlockedItems() {
    const st = this.game.state, out = [];
    for (const [id, c] of Object.entries(CROPS)) if (c.level <= st.level) out.push(id);
    for (const [id, p] of Object.entries(PENS)) if (st.pens[id].owned && !out.includes(p.product)) out.push(p.product);
    for (const [id, b] of Object.entries(BUILDINGS)) if (st.buildings[id].owned) for (const r of b.recipes) {
      const ok = Object.keys(RECIPES[r].in).every((k) => out.includes(k) || CROPS[k]?.level <= st.level);
      if (ok) out.push(r);
    }
    return out;
  }
  makeOrder() {
    const st = this.game.state, items = this.unlockedItems();
    const kinds = Math.min(items.length, 1 + Math.floor(Math.random() * Math.min(3, 1 + st.level / 4)));
    const req = {};
    const pool = items.slice();
    let value = 0;
    for (let k = 0; k < kinds; k++) {
      const id = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const price = ITEMS[id].price;
      const q = Math.max(1, Math.round((3 + Math.random() * (4 + st.level * 0.8)) * Math.min(1, 40 / price)));
      req[id] = q;
      value += q * price;
    }
    const name = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    return { id: ++st.orderSeq, name, items: req, reward: Math.round(value * 1.4 + 10), xp: Math.max(3, Math.round(value / 10)) };
  }
  canFill(o) { return Object.entries(o.items).every(([k, n]) => have(this.game.state, k) >= n); }
  fill(o, fromGodownOnly = false) {
    const g = this.game, st = g.state;
    if (fromGodownOnly) { if (!Object.entries(o.items).every(([k, n]) => (st.storage[k] || 0) >= n)) return false; }
    else if (!this.canFill(o)) return false;
    for (const [k, n] of Object.entries(o.items)) {
      if (fromGodownOnly) { st.storage[k] -= n; if (!st.storage[k]) delete st.storage[k]; } else take(st, k, n);
    }
    g.earn(o.reward);
    g.addXP(o.xp);
    st.stats.orders++;
    const i = st.orders.indexOf(o);
    st.orders.splice(i, 1, this.makeOrder());
    g.carryDirty = true;
    g.emit('order', {});
    g.audio.play('buy');
    return true;
  }
  skip(o) {
    const st = this.game.state;
    const i = st.orders.indexOf(o);
    if (i >= 0) st.orders.splice(i, 1, this.makeOrder());
  }

  // ---------- customers
  update(dt) {
    const g = this.game, st = g.state;
    this.spawnT -= dt;
    const every = STALL[st.up.stall].every;
    if (this.spawnT <= 0) {
      this.spawnT = every * (0.7 + Math.random() * 0.6);
      const max = 4 + st.up.stall;
      if (this.customers.length < max && (this.stock() > 0 || this.customers.length < 1)) this.spawn();
    }
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      if (c.state !== 'leave') {
        const slot = this.customers.filter((x) => x.state !== 'leave').indexOf(c);
        const tx = POS.queue[0] + (slot % 2 ? 0.25 : -0.25), tz = POS.queue[1] + slot * 1.25;
        if (c.slot !== slot) { c.slot = slot; c.w.goto(tx, tz); }
      }
      const arrived = c.w.update(dt, c.state === 'buy' ? c.anim : 0);
      if (c.state === 'walk' && arrived && c.slot === 0) { c.state = 'wait'; c.wait = 0; c.w.face(Math.PI); }
      else if (c.state === 'wait') {
        c.wait += dt;
        const ids = Object.keys(st.stall).filter((k) => st.stall[k] > 0);
        if (ids.length) {
          c.state = 'buy'; c.t = 0; c.want = c.want || (1 + Math.floor(Math.random() * 3)); c.pay = 0; c.anim = 0;
          c.say = CUSTOMER_LINES[Math.floor(Math.random() * CUSTOMER_LINES.length)]; c.sayT = 2.2;
        } else if (c.wait > 18) { c.say = 'Kujh nahi? Kal aavange'; c.sayT = 2; this.leave(c); }
        else if (!c.bubbled) { c.bubbled = true; c.say = '🤔 Kuj taaza?'; c.sayT = 3; }
      } else if (c.state === 'buy') {
        c.t += dt;
        c.anim = (c.t * 2) % 1;
        if (c.t >= 0.5) {
          c.t = 0;
          const ids = Object.keys(st.stall).filter((k) => st.stall[k] > 0);
          if (!ids.length || c.want <= 0) { this.pay(c); this.leave(c); }
          else {
            const id = c.pick && st.stall[c.pick] > 0 ? c.pick : (c.pick = ids[Math.floor(Math.random() * ids.length)]);
            st.stall[id]--; if (!st.stall[id]) delete st.stall[id];
            c.pay += this.price(id);
            c.want--;
            g.state.stats.sold++;
            g.emit('sold', { id, money: this.price(id) });
            g.flyers.add(id, new THREE.Vector3(POS.stall[0], 1.4, POS.stall[1] + 0.5), c.w.pos.clone().setY(1.2), 0.3);
            this.refreshShelf();
            if (g.player.pos.distanceTo(c.w.pos) < 12) g.audio.play('pop');
          }
        }
      } else if (c.state === 'leave' && arrived) {
        c.w.remove();
        if (c.label) c.label.el.remove();
        this.game.labels.list.splice(this.game.labels.list.indexOf(c.label), 1);
        this.customers.splice(i, 1);
      }
      if (c.sayT > 0) c.sayT -= dt;
    }
  }

  pay(c) {
    if (c.pay <= 0) return;
    const g = this.game;
    g.state.pile += c.pay;
    g.flyers.add('cash', c.w.pos.clone().setY(1.1), new THREE.Vector3(POS.pile[0], 0.5, POS.pile[1]), 0.4, () => this.refreshPile());
    if (g.player.pos.distanceTo(c.w.pos) < 14) g.audio.play('cash');
    c.say = `₹${c.pay} 🙏`;
    c.sayT = 1.6;
    c.pay = 0;
  }

  leave(c) {
    c.state = 'leave';
    c.w.goto(POS.customerSpawn[0] - 0.8, POS.customerSpawn[1]);
  }

  spawn() {
    const woman = Math.random() < 0.4;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const w = new Walker(this.game, woman
      ? { shirt: pick(SHIRTS), pants: pick(SHIRTS), dupatta: pick([0xff6b6b, 0xf06595, 0xfab005, 0x4dabf7, 0x63e6be, 0xda77f2]), skin: pick([0xc68a5a, 0xb57a4f, 0xd49a6a]) }
      : { shirt: pick(SHIRTS), pants: 0xf2eee2, turban: pick(TURBANS), skin: pick([0xc68a5a, 0xb57a4f, 0xd49a6a]), hair: pick([0x1b1410, 0x1b1410, 0xd9d9d9]) });
    w.pos.set(POS.customerSpawn[0] + 0.6, 0, POS.customerSpawn[1]);
    w.rot = Math.PI;
    const c = { w, state: 'walk', slot: -1, say: '', sayT: 0 };
    c.label = this.game.labels.add(() => c.sayT > 0 ? c.say : '', () => _lb.set(c.w.pos.x, 2.4, c.w.pos.z), 'bubble', 16);
    this.customers.push(c);
  }
}
const _lb = new THREE.Vector3();
