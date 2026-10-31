// Workshops: Atta Chakki, Kohlu, Dairy, Gur Belna, Dhaba, Halwai and Phulkari workshop.
// Drop raw goods on the input pad (or queue from the panel); finished goods pile up at the output pad.
import * as THREE from 'three';
import { Builder, textTexture } from './geo.js';
import { BUILDINGS, BUILDING_UPGRADES, RECIPES, ITEMS } from './config.js';
import { POS } from './world.js';
import { take, canAfford, addStorage } from './state.js';
import { StackView } from './cargo.js';

const W = 6, D = 4.4;

function buildingMesh(id) {
  const b = new Builder(0.04);
  const wallC = { chakki: 0xe9c99a, kohlu: 0xd9a066, dairy: 0xf4f6f8, belna: 0xb98e5e, dhaba: 0xf2c46b, halwai: 0xffd8a8, khaddi: 0xf7c6d9 }[id];
  const roofC = { chakki: 0xa4553a, kohlu: 0x7a4a24, dairy: 0x1c7ed6, belna: 0x8a6a3a, dhaba: 0xe8590c, halwai: 0xd6336c, khaddi: 0x7b2cbf }[id];
  b.box(0xcfc4b0, { y: 0.15, sx: W + 0.4, sy: 0.3, sz: D + 0.4 });
  b.box(wallC, { y: 1.6, z: -0.3, sx: W, sy: 2.6, sz: D - 0.6 });
  b.box(roofC, { y: 3.0, z: -0.1, sx: W + 0.5, sy: 0.18, sz: D + 0.2, rx: 0.08 });
  b.box(0x5a3a22, { y: 1.2, z: D / 2 - 0.58, sx: 1.4, sy: 1.9, sz: 0.06 });
  b.box(0x2f6fb0, { x: -1.9, y: 1.7, z: D / 2 - 0.58, sx: 1.0, sy: 0.8, sz: 0.06 });
  if (id === 'chakki') {
    b.cyl(0x9aa0a6, { x: 2.2, y: 0.9, z: 1.5, sy: 0.35 }, 0.6, 0.6, 16);
    b.cyl(0x8a8f96, { x: 2.2, y: 1.25, z: 1.5, sy: 0.3 }, 0.55, 0.55, 16);
    b.cyl(0xa4553a, { x: -2.4, y: 4.0, z: -1.2, sy: 2.2 }, 0.2, 0.25, 8);
  } else if (id === 'kohlu') {
    b.cyl(0x6b4226, { x: 2.1, y: 0.6, z: 1.4, sy: 1.0 }, 0.5, 0.6, 12);
    b.box(0x8b5a2b, { x: 2.1, y: 1.3, z: 1.4, sx: 2.2, sy: 0.12, sz: 0.12 });
  } else if (id === 'dairy') {
    for (let i = 0; i < 3; i++) b.cyl(0xc0c4c9, { x: 1.6 + i * 0.6, y: 0.65, z: 1.6, sy: 0.7 }, 0.22, 0.26, 10);
  } else if (id === 'belna') {
    b.cyl(0x3d3d3d, { x: 1.8, y: 0.55, z: 1.4, sy: 0.4 }, 1.1, 0.9, 16);
    b.cyl(0x8a5a24, { x: 1.8, y: 0.76, z: 1.4, sy: 0.02 }, 1.0, 1.0, 16);
    b.cyl(0xa4553a, { x: 1.8, y: 0.25, z: 1.4, sy: 0.5 }, 1.0, 1.05, 16);
  } else if (id === 'dhaba') {
    b.cyl(0xb5651d, { x: 2.0, y: 0.6, z: 1.5, sy: 1.2 }, 0.45, 0.6, 12);
    for (const x of [-2.2, -0.6]) { b.box(0x8b5a2b, { x, y: 0.45, z: 2.2, sx: 0.9, sy: 0.08, sz: 1.8, ry: Math.PI / 2 }); b.box(0xe9d8a6, { x, y: 0.5, z: 2.2, sx: 0.8, sy: 0.04, sz: 1.7, ry: Math.PI / 2 }); }
  } else if (id === 'halwai') {
    b.box(0xffffff, { x: 1.8, y: 0.8, z: 1.4, sx: 2.0, sy: 1.0, sz: 0.8 });
    for (let i = 0; i < 6; i++) b.sph([0xb07a3a, 0xf2c94c, 0xff922b][i % 3], { x: 1.1 + (i % 3) * 0.5, y: 1.4, z: 1.2 + Math.floor(i / 3) * 0.35, s: 0.3 }, 6, 4);
  } else if (id === 'khaddi') {
    b.box(0x8b5a2b, { x: 1.8, y: 1.0, z: 1.4, sx: 2.0, sy: 0.1, sz: 0.1 });
    for (let i = 0; i < 3; i++) b.box([0xff6a1a, 0xe03131, 0xf2c200][i], { x: 1.2 + i * 0.6, y: 0.55, z: 1.4, sx: 0.5, sy: 0.9, sz: 0.03 });
  }
  return b.mesh();
}

class Workshop {
  constructor(game, id) {
    this.game = game;
    this.id = id;
    this.cfg = BUILDINGS[id];
    const [x, z] = POS.buildings[id];
    this.x = x; this.z = z;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    game.scene.add(this.group);
    this.mesh = buildingMesh(id);
    this.group.add(this.mesh);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([{ text: `${this.cfg.pa}  ${this.cfg.name.toUpperCase()}`, size: 52 }], { w: 768, h: 150, bg: '#7a2e1a' }) }));
    sign.position.set(0, 2.55, D / 2 - 0.55);
    this.group.add(sign);
    // construction site
    const sb = new Builder(0.06);
    sb.box(0xc9a87a, { y: 0.03, sx: W, sy: 0.06, sz: D });
    for (const [px, pz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) sb.box(0xff922b, { x: px, y: 0.5, z: pz, sx: 0.15, sy: 1, sz: 0.15 });
    for (let i = 0; i < 4; i++) sb.box(0xa4553a, { x: -1 + (i % 2) * 0.5, y: 0.15 + Math.floor(i / 2) * 0.3, z: 0, sx: 0.45, sy: 0.28, sz: 0.9 });
    this.site = sb.mesh();
    this.group.add(this.site);
    game.colliders.push({ x0: x - W / 2, x1: x + W / 2, z0: z - D / 2, z1: z + D / 2 - 0.3 });

    const pz = z + D / 2 + 1.2;
    this.inPad = game.pads.add({ x: x - 1.5, z: pz, r: 0.95, color: 0xffd43b, label: () => this.inputLabel(), visible: () => this.data.owned, onStay: (dt) => this.inputTick(dt), vehicleOk: true });
    this.outPad = game.pads.add({ x: x + 1.5, z: pz, r: 0.95, color: 0x69db7c, label: () => this.outputLabel(), visible: () => this.data.owned, onStay: (dt) => this.outputTick(dt) });
    this.buyPad = game.pads.add({
      x, z: pz, r: 1.2, label: () => `<b>${this.cfg.name}</b><br>₹${this.cfg.cost.toLocaleString('en-IN')}${game.state.level < this.cfg.level ? `<br>🔒 Level ${this.cfg.level}` : ''}`,
      visible: () => !this.data.owned,
      pay: { level: this.cfg.level, cost: this.cfg.cost, ref: () => this.data, done: () => this.open() },
    });
    game.actions.add({ label: () => `🏭 ${this.cfg.name}`, x, z: pz + 1.6, r: 1.5, visible: () => this.data.owned, onPress: () => game.ui.openWorkshop(this.id) });
    const outHolder = new THREE.Group();
    outHolder.position.set(x + 1.5, 0.15, z + D / 2 + 0.1);
    game.scene.add(outHolder);
    this.outView = new StackView(outHolder, { cap: 18, layout: 'grid', gx: 3, gz: 2, dx: 0.45, dz: 0.36, dy: 0.2 });
    this.status = game.labels.add(() => this.statusText(), new THREE.Vector3(x, 4.2, z), 'status', 26);
    this.status.visible = () => this.data.owned;
    this.smokeT = 0;
    this.refresh();
  }

  get data() { return this.game.state.buildings[this.id]; }
  up() { return BUILDING_UPGRADES[this.data.lvl]; }

  refresh() {
    const o = this.data.owned;
    this.mesh.visible = o;
    this.group.children[1].visible = o;
    this.site.visible = !o;
    const out = [];
    for (const [k, n] of Object.entries(this.data.out)) for (let i = 0; i < n && out.length < 18; i++) out.push(k);
    this.outView.set(out);
  }

  open() {
    this.data.owned = true;
    this.data.t = Date.now();
    this.refresh();
    this.game.state.stats.buildings = (this.game.state.stats.buildings || 0) + 1;
    this.game.fx.sparkle(this.x, 2, this.z, 0xffd43b, 30);
    this.game.ui.toast(`${this.cfg.name} is open! 🎉 Drop ingredients on the yellow pad.`, 4);
    this.game.emit('build', { key: this.id });
  }

  inputLabel() {
    const r = RECIPES[this.data.recipe];
    return `📥 ${ITEMS[this.data.recipe].icon} ${Object.entries(r.in).map(([k, n]) => `${n}${ITEMS[k].icon}`).join(' ')}`;
  }
  outputLabel() {
    const n = Object.values(this.data.out).reduce((a, b) => a + b, 0);
    return `📤 ${n}`;
  }
  statusText() {
    const d = this.data;
    if (!d.owned) return '';
    if (d.queue.length) {
      const head = d.queue[0], left = Math.max(0, Math.ceil((d.t + head.dur - Date.now()) / 1000));
      return `⚙️ ${ITEMS[head.r].icon} ${left}s${d.queue.length > 1 ? ` (+${d.queue.length - 1})` : ''}`;
    }
    return '💤 Idle';
  }

  // Queue one batch, taking inputs from the building, then the player / godown
  queue(rid, fromPlayer = true) {
    const d = this.data, r = RECIPES[rid];
    if (d.queue.length >= this.up().slots) return 'Queue is full';
    const need = {};
    for (const [k, n] of Object.entries(r.in)) need[k] = Math.max(0, n - (d.inp[k] || 0));
    if (fromPlayer && !canAfford(this.game.state, need)) return 'Not enough ingredients';
    if (!fromPlayer) for (const [k, n] of Object.entries(need)) if ((this.game.state.storage[k] || 0) < n) return 'Not enough in godown';
    for (const [k, n] of Object.entries(r.in)) {
      const fromInp = Math.min(n, d.inp[k] || 0);
      if (fromInp) { d.inp[k] -= fromInp; if (!d.inp[k]) delete d.inp[k]; }
      const rest = n - fromInp;
      if (rest) {
        if (fromPlayer) take(this.game.state, k, rest);
        else { this.game.state.storage[k] -= rest; if (!this.game.state.storage[k]) delete this.game.state.storage[k]; }
      }
    }
    if (!d.queue.length) d.t = Date.now();
    d.queue.push({ r: rid, dur: Math.round(r.time * 1000 / this.up().speed) });
    d.recipe = rid;
    this.game.carryDirty = true;
    return null;
  }

  // Input pad: drop matching goods; auto-start the selected recipe when complete
  inputTick(dt) {
    const g = this.game, d = this.data;
    this.inAcc = (this.inAcc || 0) + dt;
    if (this.inAcc < 0.1) return;
    this.inAcc = 0;
    const r = RECIPES[d.recipe];
    const cargo = g.activeCargo();
    // only accept ingredients still needed for the next batch(es)
    for (let i = cargo.items.length - 1; i >= 0; i--) {
      const id = cargo.items[i];
      if (!r.in[id]) continue;
      if ((d.inp[id] || 0) >= r.in[id] * this.up().slots) continue;
      cargo.items.splice(i, 1);
      d.inp[id] = (d.inp[id] || 0) + 1;
      g.flyers.add(id, g.player.backPoint(_bp), new THREE.Vector3(this.x, 1.2, this.z + 1), 0.3);
      g.audio.play('pop');
      g.carryDirty = true; g.vehicleCargoDirty();
      this.tryAutoStart();
      return;
    }
    this.tryAutoStart();
  }
  tryAutoStart() {
    const d = this.data, r = RECIPES[d.recipe];
    while (d.queue.length < this.up().slots && Object.entries(r.in).every(([k, n]) => (d.inp[k] || 0) >= n)) {
      this.queue(d.recipe, true);
      this.game.audio.play('click');
    }
  }

  outputTick(dt) {
    const g = this.game, d = this.data;
    this.outAcc = (this.outAcc || 0) + dt;
    if (this.outAcc < 0.08) return;
    this.outAcc = 0;
    const cargo = g.activeCargo();
    const k = Object.keys(d.out).find((id) => d.out[id] > 0);
    if (!k) return;
    if (cargo.items.length >= cargo.cap) { if (!this.fullHint) { this.fullHint = true; g.ui.toast('Bag full!'); } return; }
    d.out[k]--;
    if (!d.out[k]) delete d.out[k];
    cargo.items.push(k);
    g.flyers.add(k, new THREE.Vector3(this.x + 1.5, 0.4, this.z + D / 2), () => g.player.backPoint(_bp), 0.3);
    g.audio.play('pop');
    g.carryDirty = true; g.vehicleCargoDirty();
    this.refresh();
  }

  process(now) {
    const d = this.data;
    if (!d.owned) return;
    let changed = false;
    while (d.queue.length && now >= d.t + d.queue[0].dur) {
      const head = d.queue.shift();
      d.t += head.dur;
      const r = RECIPES[head.r];
      for (const [k, n] of Object.entries(r.out)) d.out[k] = (d.out[k] || 0) + n;
      this.game.state.stats.made += 1;
      this.game.addXP(r.xp);
      this.game.emit('make', { key: head.r, n: Object.values(r.out)[0] });
      changed = true;
    }
    if (!d.queue.length) d.t = now;
    if (changed) {
      this.refresh();
      if (Math.hypot(this.game.player.pos.x - this.x, this.game.player.pos.z - this.z) < 16) this.game.audio.play('bell');
      this.tryAutoStart();
    }
  }

  // Mistri: keep the queue busy from godown stock and move output to the godown
  autoRun() {
    const d = this.data, st = this.game.state;
    if (!d.owned) return;
    for (const k of Object.keys(d.out)) { while (d.out[k] > 0 && addStorage(st, k, 1)) d.out[k]--; if (!d.out[k]) delete d.out[k]; }
    const order = [d.recipe, ...this.cfg.recipes.filter((r) => r !== d.recipe)];
    for (const rid of order) while (d.queue.length < this.up().slots && !this.queue(rid, false));
    this.refresh();
  }

  upgrade() {
    const st = this.game.state, d = this.data, next = BUILDING_UPGRADES[d.lvl + 1];
    if (!next) return false;
    const cost = Math.round(this.cfg.cost * next.costMul);
    if (st.money < cost) return false;
    st.money -= cost;
    d.lvl++;
    return true;
  }

  animate(dt) {
    if (!this.data.owned || !this.data.queue.length) return;
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.35;
      this.game.fx.smoke(this.x + (this.id === 'chakki' ? -2.4 : 0), this.id === 'chakki' ? 5.2 : 3.4, this.z + (this.id === 'chakki' ? -1.2 : 0));
    }
  }
}
const _bp = new THREE.Vector3();

export class Production {
  constructor(game) {
    this.game = game;
    this.shops = {};
    for (const id in BUILDINGS) this.shops[id] = new Workshop(game, id);
    this.t = 0;
  }
  update(dt) {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.5;
      const now = Date.now();
      for (const id in this.shops) this.shops[id].process(now);
    }
    for (const id in this.shops) this.shops[id].animate(dt);
  }
}
