// Navi Zameen: the new lands east of the ring road. Signboards for each kind of field, the
// greenhouse frame, paddy bunds, a gate over the farm track, and the orchard: twelve fruit trees
// bought together, each ripening on the real clock and picked by hand.
import * as THREE from 'three';
import { Builder, textTexture } from './geo.js';
import { enhance } from './shading.js';
import { FIELDS, FIELD_KINDS, PLOT, ORCHARD, DECOR, ITEMS } from './config.js';
import { decorGeometry, fruitGeometry } from './decor.js';

const WOOD = 0x8a5a2b, STEEL = 0xdfe3e6, MUD = 0x7a5230;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
export const EAST_FIELDS = FIELDS.filter((f) => f.kind);
export const treeSpots = () => ORCHARD.trees.map((k, i) => ({ k, i, x: ORCHARD.x0 + (i % ORCHARD.cols) * ORCHARD.dx + 2, z: ORCHARD.z0 + Math.floor(i / ORCHARD.cols) * ORCHARD.dz + 2 }));

export class EastLand {
  constructor(game) {
    this.game = game;
    const b = new Builder(0.03, { ao: 0.2, aoH: 0.8 }), cols = game.colliders;
    this.signs = [];
    const board = (lines, w, h, x, y, z, ry = 0, bg = '#1e6b34') => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(lines, { w: 512, h: Math.round(512 * h / w), bg }), transparent: true }));
      m.position.set(x, y, z); m.rotation.y = ry;
      game.scene.add(m); this.signs.push(m);
    };
    // the gate over the track from the ring road
    {
      const x = 50, z = 24;
      for (const s of [-1, 1]) { b.rbox(0xb4583a, { x, y: 1.8, z: z + s * 2.2, sx: 0.5, sy: 3.6, sz: 0.5 }, 0.05); b.sph(0xf2bd3a, { x, y: 3.75, z: z + s * 2.2, s: 0.4 }, 8, 6); cols.push({ x, z: z + s * 2.2, r: 0.35 }); }
      b.rbox(0x8a5a2b, { x, y: 3.7, z, sx: 0.3, sy: 0.5, sz: 4.9 }, 0.04);
      board([{ text: 'ਨਵੀਂ ਜ਼ਮੀਨ', size: 70 }, { text: 'NAVI ZAMEEN', size: 54 }], 4.2, 1.05, x - 0.2, 3.05, z, -Math.PI / 2, '#8a3b12');
      board([{ text: 'ਨਵੀਂ ਜ਼ਮੀਨ', size: 70 }, { text: 'NAVI ZAMEEN', size: 54 }], 4.2, 1.05, x + 0.2, 3.05, z, Math.PI / 2, '#8a3b12');
    }
    for (const f of EAST_FIELDS) {
      const K = FIELD_KINDS[f.kind], w = f.cols * PLOT, d = f.rows * PLOT, cx = f.x0 + w / 2;
      // a signboard on two posts at the north edge, facing the track
      // a signboard on two posts beside the field, on a side that is not another field
      const clear = (x, z) => !FIELDS.some((g) => x > g.x0 - 1 && x < g.x0 + g.cols * PLOT + 1 && z > g.z0 - 1 && z < g.z0 + g.rows * PLOT + 1);
      const cands = [[f.x0 + 1.2, f.z0 - 1.4, 0], [f.x0 + 1.2, f.z0 + d + 1.4, 0], [f.x0 - 1.4, f.z0 + 1.2, Math.PI / 2], [f.x0 + w + 1.4, f.z0 + 1.2, Math.PI / 2]];
      const [sx, sz, sr] = cands.find(([x, z]) => clear(x, z)) || cands[0];
      b.push(sx, 0, sz, sr);
      for (const s of [-1, 1]) b.cyl(WOOD, { x: s * 0.9, y: 0.9, sy: 1.8 }, 0.05, 0.06, 6);
      b.pop();
      cols.push({ x: sx, z: sz, r: 0.5 });
      board([{ text: `${K.icon} ${f.name}`, size: 46 }, { text: K.name, size: 38 }], 2.3, 0.9, sx + Math.sin(sr) * 0.06, 1.45, sz + Math.cos(sr) * 0.06, sr);
      board([{ text: `${K.icon} ${f.name}`, size: 46 }, { text: K.name, size: 38 }], 2.3, 0.9, sx - Math.sin(sr) * 0.06, 1.45, sz - Math.cos(sr) * 0.06, sr + Math.PI);
      if (f.kind === 'paddy') {
        // earth bunds round the paddy and a little channel
        for (const [x, z, a, l] of [[cx, f.z0 - 0.35, 0, w + 1.4], [cx, f.z0 + d + 0.35, 0, w + 1.4], [f.x0 - 0.35, f.z0 + d / 2, 1, d], [f.x0 + w + 0.35, f.z0 + d / 2, 1, d]]) b.rbox(MUD, { x, y: 0.1, z, sx: a ? 0.45 : l, sy: 0.22, sz: a ? l : 0.45 }, 0.08);
        b.box(0x4f9fd0, { x: f.x0 - 0.95, y: 0.03, z: f.z0 + d / 2, sx: 0.5, sy: 0.03, sz: d, ao: false });
      }
      if (f.kind === 'green') {
        // the greenhouse: steel hoops and posts; glass panels are added below as one see-through mesh
        for (let i = 0; i <= f.cols; i++) {
          const x = f.x0 + i * PLOT;
          for (const z of [f.z0 - 0.3, f.z0 + d + 0.3]) { b.cyl(STEEL, { x, y: 1.4, z, sy: 2.8 }, 0.05, 0.05, 6); cols.push({ x, z, r: 0.12 }); }
          b.box(STEEL, { x, y: 2.85, z: f.z0 + d / 2, sx: 0.08, sy: 0.08, sz: d + 0.6 });
        }
        for (const z of [f.z0 - 0.3, f.z0 + d + 0.3]) b.box(STEEL, { x: cx, y: 2.85, z, sx: w, sy: 0.08, sz: 0.08 });
        b.box(STEEL, { x: cx, y: 3.6, z: f.z0 + d / 2, sx: w, sy: 0.08, sz: 0.08 });
        const glass = new THREE.MeshLambertMaterial({ color: 0xcfeefc, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
        const roof = new THREE.Group();
        for (const s of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(w, Math.hypot(0.75, d / 2 + 0.3)), glass);
          p.position.set(cx, 3.22, f.z0 + d / 2 + s * (d / 4 + 0.15));
          p.rotation.x = -Math.PI / 2 + s * Math.atan2(0.75, d / 2 + 0.3);
          roof.add(p);
        }
        for (const z of [f.z0 - 0.3, f.z0 + d + 0.3]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.4), glass); p.position.set(cx, 1.65, z); roof.add(p); }
        roof.renderOrder = 3;
        game.scene.add(roof);
        this.greenhouse = roof;
      }
      if (f.kind === 'flower') for (let i = 0; i < 8; i++) b.sph([0xff8fab, 0xffd43b, 0xcc5de8, 0xffffff][i % 4], { x: f.x0 + 0.5 + i * (w - 1) / 7, y: 0.25, z: f.z0 + d + 0.6, s: 0.35, ao: false }, 6, 4);
      if (f.kind === 'shahi') for (const [x, z] of [[f.x0 - 0.5, f.z0 - 0.5], [f.x0 + w + 0.5, f.z0 - 0.5], [f.x0 - 0.5, f.z0 + d + 0.5], [f.x0 + w + 0.5, f.z0 + d + 0.5]]) { b.rbox(0xfbf8f1, { x, y: 0.6, z, sx: 0.5, sy: 1.2, sz: 0.5 }, 0.05); b.sph(0xf2bd3a, { x, y: 1.4, z, s: 0.45 }, 8, 6); cols.push({ x, z, r: 0.35 }); }
    }
    // the orchard's low wall and its sign
    {
      const x0 = ORCHARD.x0, z0 = ORCHARD.z0, x1 = x0 + ORCHARD.cols * ORCHARD.dx, z1 = z0 + ORCHARD.rows * ORCHARD.dz;
      for (const [x, z, a, l] of [[(x0 + x1) / 2, z0 - 0.4, 0, x1 - x0 + 0.8], [(x0 + x1) / 2, z1 + 0.4, 0, x1 - x0 + 0.8], [x1 + 0.4, (z0 + z1) / 2, 1, z1 - z0]]) {
        b.rbox(0xc9b48f, { x, y: 0.3, z, sx: a ? 0.35 : l, sy: 0.6, sz: a ? l : 0.35 }, 0.05);
        cols.push(a ? { x0: x - 0.2, x1: x + 0.2, z0: z - l / 2, z1: z + l / 2 } : { x0: x - l / 2, x1: x + l / 2, z0: z - 0.2, z1: z + 0.2 });
      }
      for (const s of [-1, 1]) b.cyl(WOOD, { x: x0 - 1.4, y: 0.9, z: (z0 + z1) / 2 + s * 0.9, sy: 1.8 }, 0.05, 0.06, 6);
      board([{ text: '🥭 Bagicha', size: 50 }, { text: 'Fruit orchard', size: 38 }], 2.3, 0.9, x0 - 1.35, 1.45, (z0 + z1) / 2, -Math.PI / 2);
      board([{ text: '🥭 Bagicha', size: 50 }, { text: 'Fruit orchard', size: 38 }], 2.3, 0.9, x0 - 1.45, 1.45, (z0 + z1) / 2, Math.PI / 2);
    }
    game.scene.add(b.meshChunks(24, enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true })));

    // ---------- the orchard
    this.spots = treeSpots();
    this.meshes = {}; this.fruit = {};
    const mat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true, sway: 0.55 });
    for (const k of new Set(ORCHARD.trees)) {
      const m = new THREE.InstancedMesh(decorGeometry(k), mat, 12); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.count = 0;
      const f = new THREE.InstancedMesh(fruitGeometry(k), mat, 12); f.frustumCulled = false; f.count = 0;
      game.scene.add(m, f); this.meshes[k] = m; this.fruit[k] = f;
    }
    this.cols = [];
    this.sig = '';
    if (game.visit) { this.refresh(); return; }
    game.pads.add({
      x: ORCHARD.x0 - 3, z: ORCHARD.z0 + ORCHARD.dz, r: 1.3,
      label: () => `<b>🥭 Bagicha (orchard)</b><br>12 fruit trees · ₹${ORCHARD.cost.toLocaleString('en-IN')}${game.state.level < ORCHARD.level ? `<br>🔒 Level ${ORCHARD.level}` : ''}`,
      visible: () => !this.st.owned,
      pay: { level: ORCHARD.level, cost: ORCHARD.cost, ref: () => this.st, done: () => this.buy() },
    });
    game.actions.add({ label: () => `${ITEMS[DECOR[this.ripe?.k]?.fruit?.item]?.icon || '🍎'} Pick ${ITEMS[DECOR[this.ripe?.k]?.fruit?.item]?.name || 'fruit'}`, pos: () => this.ripe || FAR, r: 2.8, visible: () => !!this.ripe, onPress: () => this.pick(this.ripe) });
    this.refresh();
  }
  get st() { return this.game.state.orchard; }
  ripeAt(i, now = Date.now()) { return this.st.owned && now - (this.st.t[i] || 0) >= ORCHARD.every * 1000; }
  untilRipe(i) { return Math.max(0, Math.ceil(((this.st.t[i] || 0) + ORCHARD.every * 1000 - Date.now()) / 1000)); }
  ripeCount() { return this.spots.filter((s) => this.ripeAt(s.i)).length; }
  buy() {
    const g = this.game;
    this.st.owned = true;
    const now = Date.now();
    this.st.t = this.spots.map((s) => now - ORCHARD.every * 1000 * (0.4 + (s.i % 4) * 0.2));    // a few are ripe straight away
    g.addXP(25);
    g.audio.play('yay');
    g.fx.sparkle(ORCHARD.x0 + 12, 1, ORCHARD.z0 + 5, 0x69db7c, 40);
    g.ui.toast('🥭 The orchard is yours! Walk under a tree with fruit and press Pick.', 3.5);
    this.refresh();
    g.save(true);
  }
  pick(s) {
    const g = this.game;
    if (!s || !this.ripeAt(s.i)) return;
    const item = DECOR[s.k].fruit.item, n = ORCHARD.n, cargo = g.activeCargo();
    if (cargo.items.length + n > cargo.cap) { g.ui.toast('Bag is too full for the fruit'); g.audio.play('error'); return; }
    for (let i = 0; i < n; i++) cargo.items.push(item);
    this.st.t[s.i] = Date.now();
    this.game.state.stats.orchardFruit = (this.game.state.stats.orchardFruit || 0) + n;
    g.carryDirty = true; g.vehicleCargoDirty();
    g.audio.play('pop'); g.fx.leaves(s.x, s.z, 0x6dbb3c); g.addXP(4);
    g.emit('fruit', { n });
    g.ui.toast(`${ITEMS[item].icon} Picked ${n} ${ITEMS[item].name}`, 1.8);
    this.refresh();
    g.save();
  }
  refresh() {
    const now = Date.now(), cnt = {}, fc = {};
    for (const m of Object.values(this.meshes)) m.count = 0;
    for (const m of Object.values(this.fruit)) m.count = 0;
    for (const s of this.spots) {
      _m.compose(_p.set(s.x, 0, s.z), _q.identity(), _s.set(1, 1, 1));
      const m = this.meshes[s.k], i = cnt[s.k] = (cnt[s.k] || 0); m.setMatrixAt(i, _m); cnt[s.k]++;
      if (this.ripeAt(s.i, now)) { const f = this.fruit[s.k], j = fc[s.k] = (fc[s.k] || 0); f.setMatrixAt(j, _m); fc[s.k]++; }
    }
    for (const [k, m] of Object.entries(this.meshes)) { m.count = cnt[k] || 0; m.instanceMatrix.needsUpdate = true; }
    for (const [k, m] of Object.entries(this.fruit)) { m.count = fc[k] || 0; m.instanceMatrix.needsUpdate = true; }
    if (!this.cols.length) for (const s of this.spots) { const c = { x: s.x, z: s.z, r: 0.4 }; this.cols.push(c); this.game.colliders.push(c); }
    this.sig = this.spots.map((s) => (this.ripeAt(s.i, now) ? 1 : 0)).join('');
  }
  update(dt) {
    const g = this.game, p = g.player.pos;
    this.chk = (this.chk || 0) - dt;
    if (this.chk <= 0) { this.chk = 2; const sig = this.spots.map((s) => (this.ripeAt(s.i) ? 1 : 0)).join(''); if (sig !== this.sig) this.refresh(); }
    this.ripe = null;
    if (g.visit || !this.st?.owned || p.x < 50) return;
    let best = 2.8;
    for (const s of this.spots) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < best && this.ripeAt(s.i)) { best = d; this.ripe = s; } }
  }
}
const FAR = { x: 1e5, z: 1e5 };
