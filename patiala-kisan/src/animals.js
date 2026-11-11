// Animal pens: chickens, Murrah buffaloes, goats and sheep. Feed them crops and water and
// they produce eggs, milk and wool over real time (paused, never punished, when unfed).
import * as THREE from 'three';
import { Builder, vcMaterial, vcMaterialCut } from './geo.js';
import { props, animalGeometry, shade } from './models.js';
import { PENS, PEN_WATER_CAP, PEN_PIPE_COST, CANS, ITEMS } from './config.js';
import { POS } from './world.js';
import { addStorage } from './state.js';
import { StackView } from './cargo.js';
import { enhance, waterMaterial, blobGeo, blobMaterial } from './shading.js';

const SIZE = { coop: [6, 5], tabela: [8, 6], bakri: [6, 5], bhed: [7, 5] };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _e = new THREE.Euler(), _bs = new THREE.Vector3();

class Pen {
  constructor(game, id) {
    this.game = game;
    this.id = id;
    this.cfg = PENS[id];
    const [cx, cz] = POS.pens[id];
    const [w, d] = SIZE[id];
    this.cx = cx; this.cz = cz; this.w = w; this.d = d;
    this.face = cz < -14 ? 1 : -1;               // which side faces the lane (+z south or -z north)
    this.front = cz + this.face * d / 2;
    this.animals = [];
    this.build();
    const fx = (k) => cx + k, fz = this.front + this.face * 1.3;
    this.feedPad = game.pads.add({ x: fx(-1.9), z: fz, r: 0.9, color: 0xffd43b, label: () => `🌾 Feed ${this.data.feed}/${this.feedCap()}`, visible: () => this.data.owned, onStay: (dt) => this.feedTick(dt) });
    this.waterPad = game.pads.add({ x: fx(0), z: fz, r: 0.9, color: 0x4dabf7, label: () => this.data.pipe ? '💧 Pipe' : `💧 Water ${this.data.water}/${PEN_WATER_CAP}`, visible: () => this.data.owned, onStay: (dt) => this.waterTick(dt) });
    this.collectPad = game.pads.add({ x: fx(1.9), z: fz, r: 0.9, color: 0x69db7c, label: () => `${ITEMS[this.cfg.product].icon} ${this.data.ready}`, visible: () => this.data.owned, onStay: (dt) => this.collectTick(dt) });
    this.buyPad = game.pads.add({
      x: cx, z: this.front + this.face * 1.6, r: 1.2, color: 0xffffff,
      label: () => `<b>${this.cfg.name}</b><br>${this.cfg.en} · ₹${this.cfg.cost.toLocaleString('en-IN')}${game.state.level < this.cfg.level ? `<br>🔒 Level ${this.cfg.level}` : ''}`,
      visible: () => !this.data.owned,
      pay: { level: this.cfg.level, cost: this.cfg.cost, ref: () => this.data, done: () => this.buildPen() },
    });
    game.actions.add({ label: () => `🐾 ${this.cfg.en}`, x: cx, z: this.front + this.face * 2.6, r: 1.6, visible: () => this.data.owned, onPress: () => game.ui.openPen(this.id) });
    this.status = game.labels.add(() => this.statusText(), new THREE.Vector3(cx, 3.2, cz), 'status', 24);
    this.status.visible = () => this.data.owned;
    this.refresh();
  }

  get data() { return this.game.state.pens[this.id]; }
  cap() { return this.cfg.caps[this.data.capLvl]; }
  feedCap() { return 10 + this.cap() * 4; }
  readyCap() { return 10 + this.cap() * 4; }
  interval() { return this.cfg.cycle / Math.max(1, this.data.n); }

  build() {
    const g = this.game, { cx, cz, w, d, face } = this;
    // construction site (shown until bought)
    const sb = new Builder(0.06);
    sb.box(0xc9a87a, { x: cx, y: 0.03, z: cz, sx: w, sy: 0.06, sz: d });
    for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) sb.box(0xff922b, { x: cx + x, y: 0.4, z: cz + z, sx: 0.15, sy: 0.8, sz: 0.15 });
    sb.box(0xffffff, { x: cx, y: 0.6, z: cz - face * d / 2, sx: w, sy: 0.05, sz: 0.05 });
    for (let i = 0; i < 3; i++) sb.box(0xb08050, { x: cx - 1 + i * 0.6, y: 0.15 + (i % 2) * 0.1, z: cz, sx: 1.6, sy: 0.12, sz: 0.25, ry: i * 0.3 });
    this.site = sb.mesh();
    // finished pen: fence with a gap at the front, shelter, troughs
    const b = new Builder(0.05);
    const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const back = face > 0 ? z0 : z1, front = face > 0 ? z1 : z0;
    props.fence(b, x0, back, x1, back);
    props.fence(b, x0, z0, x0, z1);
    props.fence(b, x1, z0, x1, z1);
    props.fence(b, x0, front, x1, front);
    const hz = back + face * 1.2;
    if (this.id === 'coop') {
      // raised wooden murgi-khana: plank walls, shingled gable roof, ramp, perch and nest boxes
      b.push(cx - 1.4, 0, hz);
      for (const [px, pz] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) b.box(0x6b4226, { x: px, y: 0.25, z: pz, sx: 0.12, sy: 0.5, sz: 0.12 });
      b.rbox(0xc0874f, { y: 1.0, sx: 2.4, sy: 1.0, sz: 1.6 }, 0.04);
      for (let i = 0; i < 6; i++) b.box(0xa8723f, { y: 0.55 + i * 0.18, z: face * 0.81, sx: 2.38, sy: 0.02, sz: 0.01, ao: false });
      b.prism(0xc0874f, { y: 1.5, sx: 2.4, sy: 0.6, sz: 1.6 });
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
        const d = 0.12 + k * 0.23;
        b.rbox(k % 2 ? 0xb5392f : 0xa02e25, { y: 2.12 - d * 0.75, z: s * d, sx: 2.7, sy: 0.05, sz: 0.3, rx: s * 0.64 }, 0.02);
      }
      b.rbox(0x4a2e1a, { x: 0.5, y: 0.85, z: face * 0.82, sx: 0.45, sy: 0.5, sz: 0.04 }, 0.02);
      b.rbox(0xa8723f, { x: 0.5, y: 0.3, z: face * 1.35, sx: 0.4, sy: 0.04, sz: 1.2, rx: face * 0.5 }, 0.02);
      for (let k = 0; k < 4; k++) b.box(0x6b4226, { x: 0.5, y: 0.2 + k * 0.12, z: face * (1.75 - k * 0.22), sx: 0.38, sy: 0.02, sz: 0.04, ao: false });
      b.pop();
      for (let i = 0; i < 3; i++) {
        b.rbox(0xd9b45a, { x: cx + 1 + i * 0.7, y: 0.18, z: hz, sx: 0.58, sy: 0.32, sz: 0.58 }, 0.04);
        b.sph(0xe9cf8a, { x: cx + 1 + i * 0.7, y: 0.36, z: hz, sx: 0.45, sy: 0.12, sz: 0.45 }, 8, 4);
      }
      b.cyl(0x6b4226, { x: cx + 1.7, y: 0.5, z: hz - face * 1.0, rz: Math.PI / 2, sy: 2.0 }, 0.04, 0.04, 6);
    } else {
      // shed: brick back wall, posts, and a straw-thatched roof; khurli (feeding trough) inside
      const wall = this.id === 'tabela' ? 0xb4583a : 0xb98e5e;
      b.rbox(wall, { x: cx, y: 1.1, z: back + face * 0.3, sx: w - 0.6, sy: 2.2, sz: 0.3 }, 0.04);
      for (let i = 0; i < 7; i++) b.box(shade(wall, -0.07), { x: cx, y: 0.2 + i * 0.3, z: back + face * 0.46, sx: w - 0.62, sy: 0.025, sz: 0.01, ao: false });
      for (const px of [-w / 2 + 0.5, w / 2 - 0.5, 0]) b.cyl(0x7a4a24, { x: cx + px, y: 1.2, z: back + face * 2.3, sy: 2.4 }, 0.08, 0.09, 8);
      b.rbox(0xd9b45a, { x: cx, y: 2.45, z: back + face * 1.25, sx: w - 0.1, sy: 0.25, sz: 2.8, rx: face * 0.12 }, 0.1);
      b.rbox(0xcfa84e, { x: cx, y: 2.62, z: back + face * 1.15, sx: w - 0.5, sy: 0.18, sz: 2.3, rx: face * 0.12 }, 0.08);
      for (let i = 0; i < 10; i++) b.box(0xb8923f, { x: cx - (w - 0.2) / 2 + 0.3 + i * (w - 0.8) / 9, y: 2.3, z: back + face * 2.62, sx: 0.04, sy: 0.18, sz: 0.06, ao: false });
      // the ceiling under the thatch: bamboo rafters on a beam
      b.box(0x6b4a2b, { x: cx, y: 2.3, z: back + face * 2.3, sx: w - 0.4, sy: 0.14, sz: 0.14 });
      for (let i = 0; i < 6; i++) b.cyl(0xb59a5a, { x: cx - (w - 1) / 2 + i * (w - 1) / 5, y: 2.36, z: back + face * 1.25, rx: Math.PI / 2 + face * 0.12, sy: 2.6 }, 0.04, 0.04, 6);
      b.rbox(0x9aa0a6, { x: cx, y: 0.3, z: back + face * 0.85, sx: w - 1.4, sy: 0.45, sz: 0.55 }, 0.06);
      b.box(0xd9b45a, { x: cx, y: 0.52, z: back + face * 0.85, sx: w - 1.6, sy: 0.04, sz: 0.4 });
      // straw heaps
      for (const px of [-w / 2 + 1.0, w / 2 - 1.2]) b.sph(0xe0bf6a, { x: cx + px, y: 0.1, z: back + face * 1.7, sx: 1.0, sy: 0.4, sz: 0.8 }, 8, 5);
    }
    // troughs at the front fence (feed and water)
    for (const tx of [cx - 1.9, cx]) b.rbox(0x8a8f96, { x: tx, y: 0.25, z: front - face * 0.5, sx: 1.4, sy: 0.4, sz: 0.5 }, 0.06);
    this.pen = b.mesh(vcMaterialCut);
    this.feedFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.36), enhance(new THREE.MeshLambertMaterial({ color: 0xd9b45a }), { detail: 0.4, rim: 0 }));
    this.feedFill.position.set(cx - 1.9, 0.42, front - face * 0.5);
    this.waterFill = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.36), waterMaterial(1.2, 0.36, { foam: 0.05 }));
    this.waterFill.rotation.x = -Math.PI / 2;
    this.waterFill.position.set(cx, 0.43, front - face * 0.5);
    g.scene.add(this.site, this.pen, this.feedFill, this.waterFill);
    g.colliders.push({ x0: x0 - 0.1, x1: x1 + 0.1, z0: z0 - 0.1, z1: z1 + 0.1 });
    // animals with soft contact shadows; the tabela keeps desi cows alongside the buffaloes
    this.kinds = this.id === 'tabela' ? ['buffalo', 'cow'] : [this.cfg.animal];
    this.insts = this.kinds.map((k) => {
      const m = new THREE.InstancedMesh(animalGeometry(k), vcMaterial, 32);
      m.castShadow = true;
      m.count = 0;
      m.frustumCulled = false;
      g.scene.add(m);
      return m;
    });
    this.blobs = new THREE.InstancedMesh(blobGeo, blobMaterial, 32);
    this.blobs.count = 0;
    this.blobs.frustumCulled = false;
    this.blobs.renderOrder = -1;
    g.scene.add(this.blobs);
    this.blobSize = { chicken: [0.55, 0.7], buffalo: [1.5, 2.8], goat: [0.8, 1.3], sheep: [1.0, 1.4] }[this.cfg.animal];
    // product pile next to the collect pad
    const holder = new THREE.Group();
    holder.position.set(cx + 1.9, 0.5, front - face * 0.5);
    g.scene.add(holder);
    this.pile = new StackView(holder, { cap: 18, layout: 'grid', gx: 3, gz: 2, dx: 0.42, dz: 0.34, dy: 0.2 });
  }

  refresh() {
    const o = this.data.owned;
    this.site.visible = !o;
    this.pen.visible = this.feedFill.visible = this.waterFill.visible = o;
    if (o && !this.tall) { this.tall = true; this.game.seeThrough?.add(this.pen); }
    while (this.animals.length < this.data.n) {
      const i = this.animals.length;
      const a = { x: this.cx + (Math.random() - 0.5) * (this.w - 2), z: this.cz + (Math.random() - 0.5) * (this.d - 2.2), rot: Math.random() * 6, tx: 0, tz: 0, wait: Math.random() * 3, ph: Math.random() * 6 };
      a.tx = a.x; a.tz = a.z;
      a.kind = this.kinds[i % this.kinds.length];
      // every animal has its own voice and its own moment to speak
      a.voice = 0.88 + ((i * 37 + this.id.length * 11) % 25) / 100;
      a.callT = 3 + Math.random() * 14;
      this.animals.push(a);
    }
    this.animals.length = this.data.n;
    this.updateFills();
  }

  updateFills() {
    const d = this.data;
    this.feedFill.scale.y = Math.max(0.01, d.feed / this.feedCap()) * 3;
    this.feedFill.visible = d.owned && d.feed > 0;
    this.waterFill.visible = d.owned && (d.pipe || d.water > 0);
    this.pile.set(Array(Math.min(d.ready, 18)).fill(this.cfg.product));
  }

  buildPen() {
    const d = this.data;
    d.owned = true;
    d.n = Math.max(d.n, 2);
    d.t = Date.now();
    this.refresh();
    this.game.ui.toast(`${this.cfg.name} built! 2 ${this.cfg.plural} moved in 🎉`);
    this.game.fx.sparkle(this.cx, 1, this.cz, 0xffd43b, 30);
    this.game.emit('build', { key: this.id });
    if (this.id === 'coop') this.game.state.stats.chickens = d.n;
  }

  buyAnimal() {
    const st = this.game.state, d = this.data;
    if (d.n >= this.cap() || st.money < this.cfg.animalCost) return false;
    st.money -= this.cfg.animalCost;
    d.n++;
    if (d.n === 1) d.t = Date.now();
    if (this.id === 'coop') st.stats.chickens = d.n;
    this.refresh();
    return true;
  }
  upgradeCap() {
    const st = this.game.state, d = this.data, cost = this.cfg.capCosts[d.capLvl];
    if (cost === undefined || st.money < cost) return false;
    st.money -= cost;
    d.capLvl++;
    return true;
  }
  buyPipe() {
    const st = this.game.state, d = this.data;
    if (d.pipe || st.money < PEN_PIPE_COST) return false;
    st.money -= PEN_PIPE_COST;
    d.pipe = true;
    this.updateFills();
    return true;
  }

  // ---------- pads
  feedTick(dt) {
    const g = this.game, st = g.state, d = this.data;
    this.feedAcc = (this.feedAcc || 0) + dt;
    if (this.feedAcc < 0.09) return;
    this.feedAcc = 0;
    if (d.feed >= this.feedCap()) return;
    const cargo = g.activeCargo();
    for (let i = cargo.items.length - 1; i >= 0; i--) {
      const id = cargo.items[i];
      if (!this.cfg.feeds.includes(id)) continue;
      cargo.items.splice(i, 1);
      d.feed++;
      g.flyers.add(id, g.player.backPoint(_bp), this.feedFill.position.clone(), 0.3);
      g.audio.play('pop');
      g.carryDirty = true; g.vehicleCargoDirty();
      this.updateFills();
      return;
    }
    if (!this.fedHint) { this.fedHint = true; g.ui.toast(`${this.cfg.plural} eat ${this.cfg.feeds.map((f) => ITEMS[f].icon + ' ' + ITEMS[f].name).join(', ')}`); }
  }
  waterTick(dt) {
    const g = this.game, st = g.state, d = this.data;
    if (d.pipe) return;
    this.waterAcc = (this.waterAcc || 0) + dt;
    if (this.waterAcc < 0.06) return;
    this.waterAcc = 0;
    if (d.water >= PEN_WATER_CAP) return;
    if (st.water <= 0) { if (!this.waterHint) { this.waterHint = true; g.ui.toast(`${CANS[st.up.can].name} empty — refill at the tubewell`); } return; }
    st.water--; d.water++;
    g.fx.water(this.waterFill.position.x, this.waterFill.position.z);
    if (d.water % 3 === 0) g.audio.play('water');
    g.ui.waterPill();
    this.updateFills();
  }
  collectTick(dt) {
    const g = this.game, st = g.state, d = this.data;
    this.colAcc = (this.colAcc || 0) + dt;
    if (this.colAcc < 0.08 || d.ready <= 0) return;
    this.colAcc = 0;
    const cargo = g.activeCargo();
    if (cargo.items.length >= cargo.cap) { if (!this.fullHint) { this.fullHint = true; g.ui.toast('Bag full!'); } return; }
    d.ready--;
    cargo.items.push(this.cfg.product);
    st.stats.products++;
    g.addXP(this.cfg.xp);
    g.emit('product', { key: this.cfg.product });
    g.flyers.add(this.cfg.product, this.pile.crate.parent.position.clone(), () => g.player.backPoint(_bp), 0.3);
    g.audio.play('pop');
    g.carryDirty = true; g.vehicleCargoDirty();
    this.updateFills();
  }

  statusText() {
    const d = this.data;
    if (!d.owned) return '';
    if (!d.n) return '🛒 Buy animals';
    if (d.feed <= 0) return '😟 Hungry';
    if (!d.pipe && d.water <= 0) return '😟 Thirsty';
    if (d.ready >= this.readyCap()) return '📦 Full';
    return '';
  }

  // Real-time production (also catches up after the game was closed)
  produce(now) {
    const d = this.data;
    if (!d.owned || !d.n) { d.t = now; return; }
    const iv = this.interval() * 1000;
    let changed = false, guard = 200;
    while (now - d.t >= iv && guard-- > 0) {
      if (d.feed <= 0 || (!d.pipe && d.water <= 0) || d.ready >= this.readyCap()) { d.t = now; break; }
      d.t += iv;
      d.feed--;
      if (!d.pipe) d.water--;
      d.ready++;
      changed = true;
    }
    if (guard <= 0) d.t = now;
    if (changed) {
      this.updateFills();
      // someone in the pen announces the fresh eggs, milk or wool
      const a = this.animals[Math.floor(Math.random() * this.animals.length)];
      if (a) a.callT = Math.min(a.callT, 0.4);
    }
  }

  // Pali (caretaker) does everything from the godown
  autoCare() {
    const st = this.game.state, d = this.data;
    if (!d.owned) return;
    for (const f of this.cfg.feeds) {
      while (d.feed < this.feedCap() && (st.storage[f] || 0) > 0) { st.storage[f]--; if (!st.storage[f]) delete st.storage[f]; d.feed++; }
    }
    if (!d.pipe) d.water = PEN_WATER_CAP;
    while (d.ready > 0 && addStorage(st, this.cfg.product, 1)) d.ready--;
    this.updateFills();
  }

  animate(dt, t) {
    const n = this.animals.length;
    this.slot = this.kinds.map(() => 0);
    const hw = this.w / 2 - 0.9, hd = this.d / 2 - 1.0;
    for (let i = 0; i < n; i++) {
      const a = this.animals[i];
      a.wait -= dt;
      const dx = a.tx - a.x, dz = a.tz - a.z, dist = Math.hypot(dx, dz);
      let moving = false;
      if (dist > 0.1) {
        const sp = this.cfg.animal === 'chicken' ? 1.1 : 0.7;
        a.x += dx / dist * sp * dt; a.z += dz / dist * sp * dt;
        let dr = Math.atan2(dx, dz) - a.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        a.rot += dr * Math.min(1, dt * 5);
        moving = true;
      } else if (a.wait <= 0) {
        a.tx = this.cx + (Math.random() * 2 - 1) * hw;
        a.tz = this.cz + (Math.random() * 2 - 1) * hd;
        a.wait = 2 + Math.random() * 5;
      }
      a.ph += dt * (moving ? 10 : 2);
      const bob = moving ? Math.abs(Math.sin(a.ph)) * 0.05 : 0;
      const peck = !moving && this.cfg.animal === 'chicken' ? Math.max(0, Math.sin(a.ph)) * 0.35 : 0;
      // a calling animal lifts its head a little
      const call = a.calling > 0 ? Math.sin(Math.min(1, a.calling) * Math.PI) * -0.12 : 0;
      if (a.calling > 0) a.calling -= dt;
      _q.setFromEuler(_e.set(peck + call, a.rot, moving ? Math.sin(a.ph) * 0.06 : 0));
      _m.compose(_p.set(a.x, bob, a.z), _q, _s);
      const k = this.kinds.indexOf(a.kind);
      this.insts[k].setMatrixAt(this.slot[k]++, _m);
      _q.setFromEuler(_e.set(0, a.rot, 0));
      _m.compose(_p.set(a.x, 0.03, a.z), _q, _bs.set(this.blobSize[0], 1, this.blobSize[1]));
      this.blobs.setMatrixAt(i, _m);
    }
    this.insts.forEach((m, k) => { m.count = this.slot[k]; m.instanceMatrix.needsUpdate = true; });
    this.blobs.count = n;
    this.blobs.instanceMatrix.needsUpdate = true;
  }

  // Each animal speaks on its own timer, louder as the farmer comes closer; walking up to the
  // pen gets someone's attention. The Animals manager keeps calls from piling up.
  voices(dt, mgr) {
    const g = this.game, p = g.player.pos;
    const d0 = Math.hypot(p.x - this.cx, p.z - this.cz);
    if (d0 > 34 || !this.animals.length) { this.wasNear = false; return; }
    const close = d0 < 9;
    if (close && !this.wasNear && (this.greetT || 0) <= 0) {
      let best = null, bd = 1e9;
      for (const a of this.animals) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < bd) { bd = d; best = a; } }
      if (best) { best.callT = 0.3 + Math.random() * 0.9; this.greetT = 25; }
    }
    this.wasNear = close;
    if (this.greetT > 0) this.greetT -= dt;
    for (const a of this.animals) {
      a.callT -= dt;
      if (a.callT > 0) continue;
      const d = Math.hypot(p.x - a.x, p.z - a.z);
      if (!mgr.canCall(a.kind)) { a.callT = 0.8 + Math.random() * 1.5; continue; }
      a.callT = a.kind === 'chicken' ? 9 + Math.random() * 14 : 15 + Math.random() * 22;
      if (!this.data.owned) continue;
      a.calling = 1.2;
      mgr.called(a.kind);
      g.audio.animal(a.kind, { dist: d, pan: Math.max(-1, Math.min(1, (a.x - p.x) / 12)) * 0.8, pitch: a.voice });
    }
  }
}
const _bp = new THREE.Vector3();

export class Animals {
  constructor(game) {
    this.game = game;
    this.pens = {};
    for (const id in PENS) this.pens[id] = new Pen(game, id);
    this.t = 0;
    this.kindGap = {};
  }
  update(dt, t) {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 1;
      const now = Date.now();
      for (const id in this.pens) this.pens[id].produce(now);
    }
    const p = this.game.player.pos;
    this.gap = Math.max(0, (this.gap || 0) - dt);
    for (const k in this.kindGap) this.kindGap[k] = Math.max(0, this.kindGap[k] - dt);
    for (const id in this.pens) {
      const pen = this.pens[id];
      if (Math.abs(p.x - pen.cx) < 30 && Math.abs(p.z - pen.cz) < 34) pen.animate(dt, t);
      pen.voices(dt, this);
    }
  }
  // never two animals at once, and the same kind leaves a longer pause
  canCall(kind) { return !(this.gap > 0) && !(this.kindGap[kind] > 0); }
  called(kind) { this.gap = 1.6 + Math.random() * 1.2; this.kindGap[kind] = 2.8 + Math.random() * 2; }
}
