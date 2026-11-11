// Baradari Gardens: a walled charbagh east of the Gurdwara with a twelve-arch baradari pavilion,
// a royal fountain, four flower quadrants, a lotus pond, a jhoola and benches under palms.
// Things to do there (all saved in state.garden, reset each day):
//  - make a wish at the fountain (₹10, once a day) for roses, coins, XP or seeds
//  - sit on a bench to relax: the first time on each bench each day pays XP, three benches pay a rose
//  - find the eight hidden roses (they sparkle when you are close) for a bonus
//  - spend roses at the Mali's stall on Baradari specials you can place on your own farm
// Visiting friends can walk the gardens too; only your own farm pays rewards.
import * as THREE from 'three';
import { Builder, vcMaterialCut, textTexture } from './geo.js';
import { shade } from './models.js';
import { MODELS } from './decor.js';
import { Walker } from './market.js';
import { GARDEN, CROPS } from './config.js';
import { todayKey } from './state.js';

const [CX, CZ] = GARDEN.centre;
const W = (lx, lz) => [CX + lx, CZ + lz];
const MARBLE = 0xf3efe6, OCHRE = 0xe7c27a, TERRA = 0xc7733a, GOLD = 0xe3b23c, STONE = 0xc4bdb0, BRICK = 0xb4583a;
const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

// local (lx, lz): the entrance gate is south (+lz), the pavilion north (-lz)
export const BENCHES = [[-2.5, 9, 1], [2.5, 9, -1], [-2.5, -1.5, 1], [2.5, -1.5, -1]];      // x, z, which way it faces (+1 east, -1 west)
const FOUNTAIN = [0, 2.2];
const PAVILION = [0, -9.5];
const POND = [7.6, -9.3];
const SWING = [-7.6, -9.6];
const MALI = [6.8, 11.3];
// twenty-four places a rose may hide; eight of them are used each day
const ROSE_SPOTS = [[-8.6, 11], [-9.2, 6], [-9.3, 0.5], [-8.4, -4.5], [-9.4, -11], [-4.5, -12.2], [4.8, -12.4], [9.2, -12.3], [9.4, -5], [9.3, 1], [9.1, 7], [8.8, 12], [-5.4, 4.6], [5.6, 4.7], [-5.6, -0.6], [5.7, -0.4], [-3.4, 12.2], [3.4, 12.3], [-5.9, -7.2], [5.9, -6.5], [0, -5.6], [-7.2, 9], [7.2, 8.6], [0.4, 8]];

// deterministic daily pick: the same eight roses all day, a different set tomorrow
export function dailyRoses(day, pid = '') {
  let seed = 7; for (const ch of day + pid) seed = (seed * 31 + ch.charCodeAt(0)) % 233280;
  const pool = ROSE_SPOTS.map((_, i) => i), out = [];
  while (out.length < GARDEN.roses) { seed = (seed * 9301 + 49297) % 233280; out.push(pool.splice(seed % pool.length, 1)[0]); }
  return out.sort((a, b) => a - b);
}

// Builds the scenery (one merged mesh in chunks), its colliders and its lamp glows. Called by the game after the world.
export function buildBaradari(game) {
  const { scene } = game, glows = game.glows;
  const b = new Builder(0.04, { ao: 0.25, aoH: 0.9 });
  const rect = (cx, cz, w, d) => game.colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  const circ = (x, z, r) => game.colliders.push({ x, z, r });
  b.push(CX, 0, CZ);
  const flat = (c, x, z, sx, sz, y = 0.04, h = 0.06) => b.rbox(c, { x, y: y + h / 2, z, sx, sy: h, sz }, 0.02);
  // stone paths: the main axis, the cross path and a ring round the fountain
  flat(STONE, 0, 5.8, 2.8, 15.4); flat(STONE, 0, -5, 2.8, 8); flat(STONE, 0, 2.2, 19, 2.4);
  b.cyl(shade(STONE, 0.06), { x: FOUNTAIN[0], y: 0.07, z: FOUNTAIN[1], sy: 0.06 }, 3.7, 3.7, 28);
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) b.box(shade(STONE, -0.1), { x: s * 1.4, y: 0.075, z: -8 + i * 3.2, sx: 0.05, sy: 0.01, sz: 3, ao: false });
  // the fountain
  b.push(FOUNTAIN[0], 0, FOUNTAIN[1]); MODELS.royalfountain(b); b.pop();
  circ(...W(...FOUNTAIN), 2.45);
  // four flower quadrants: brick border, soil and rows of flowers in one colour each
  const quad = [[6.2, -2.7, [0xff9a1f, 0xffc61a]], [-6.2, -2.7, [0xe03131, 0xff8fab]], [6.2, 7.0, [0xffffff, 0xfff3bf]], [-6.2, 7.0, [0xb197fc, 0x845ef7]]];
  for (const [qx, qz, cols] of quad) {
    b.rbox(BRICK, { x: qx, y: 0.12, z: qz, sx: 5.6, sy: 0.24, sz: 3.6 }, 0.05);
    b.rbox(0x5a3a22, { x: qx, y: 0.25, z: qz, sx: 5.2, sy: 0.06, sz: 3.2 }, 0.02);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
      const x = qx - 2.3 + i * 0.77, z = qz - 1.2 + j * 0.8;
      b.ico(0x4a8f35, { x, y: 0.34, z, sx: 0.42, sy: 0.22, sz: 0.42 }, 0);
      b.sph(cols[(i + j) % 2], { x, y: 0.48 + ((i * j) % 3) * 0.03, z, s: 0.22, ao: false }, 6, 4);
    }
  }
  // the baradari: ochre pavilion on a marble plinth, twelve pillars and arches, a golden dome
  const [px, pz] = PAVILION;
  b.rbox(MARBLE, { x: px, y: 0.3, z: pz, sx: 9.4, sy: 0.6, sz: 9.4 }, 0.06);
  b.rbox(0xe8dfcb, { x: px, y: 0.65, z: pz, sx: 8.4, sy: 0.12, sz: 8.4 }, 0.04);
  for (let i = 0; i < 5; i++) b.rbox(MARBLE, { x: px, y: 0.1 + i * 0.1, z: pz + 4.7 + (4 - i) * 0.32, sx: 3.2, sy: 0.2, sz: 0.34 }, 0.03);
  const cols = [];
  for (const k of [-3.4, -1.13, 1.13, 3.4]) for (const edge of [-3.4, 3.4]) { cols.push([px + k, pz + edge]); if (Math.abs(k) < 3.4) cols.push([px + edge, pz + k]); }
  const seen = new Set();
  for (const [x, z] of cols) {
    const key = x.toFixed(2) + z.toFixed(2); if (seen.has(key)) continue; seen.add(key);
    b.cyl(OCHRE, { x, y: 2.1, z, sy: 3.0 }, 0.26, 0.3, 10); b.cyl(MARBLE, { x, y: 0.85, z, sy: 0.4 }, 0.38, 0.42, 10); b.cyl(MARBLE, { x, y: 3.5, z, sy: 0.2 }, 0.38, 0.34, 10);
    circ(CX + x, CZ + z, 0.34);
  }
  for (const [ax, az, ry] of [[0, 3.4, 0], [0, -3.4, 0], [3.4, 0, Math.PI / 2], [-3.4, 0, Math.PI / 2]]) for (const k of [-2.27, 0, 2.27]) {
    const x = px + (ry ? ax : k), z = pz + (ry ? k : az);
    b.torus(OCHRE, { x, y: 3.35, z, ry, s: 1 }, 1.05, 0.12, 5, 14, Math.PI);
    b.box(shade(OCHRE, -0.08), { x, y: 3.7, z, sx: ry ? 0.3 : 2.1, sy: 0.55, sz: ry ? 2.1 : 0.3, ao: false });
  }
  b.rbox(OCHRE, { x: px, y: 3.95, z: pz, sx: 8.6, sy: 0.5, sz: 8.6 }, 0.06);
  b.rbox(TERRA, { x: px, y: 4.25, z: pz, sx: 8.9, sy: 0.14, sz: 8.9 }, 0.04);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 8.6 - 4.3 + 0.36; for (const [x, z] of [[a, -4.25], [a, 4.25], [-4.25, a], [4.25, a]]) b.cone(MARBLE, { x: px + x, y: 4.5, z: pz + z, sx: 0.28, sy: 0.3, sz: 0.28 }, 4); }
  b.cyl(OCHRE, { x: px, y: 5.0, z: pz, sy: 0.9 }, 2.3, 2.5, 16);
  b.dome(GOLD, { x: px, y: 5.4, z: pz, s: 4.8 }, 24, 10);
  b.cone(GOLD, { x: px, y: 8.3, z: pz, sx: 0.2, sy: 1.1, sz: 0.2 }, 6); b.sph(GOLD, { x: px, y: 8.9, z: pz, s: 0.3 }, 8, 6);
  for (const [x, z] of [[-3.9, -3.9], [3.9, -3.9], [-3.9, 3.9], [3.9, 3.9]]) { b.cyl(OCHRE, { x: px + x, y: 4.9, z: pz + z, sy: 1.0 }, 0.4, 0.45, 10); b.dome(GOLD, { x: px + x, y: 5.4, z: pz + z, s: 1.1 }, 12, 6); b.cone(GOLD, { x: px + x, y: 6.1, z: pz + z, sx: 0.08, sy: 0.4, sz: 0.08 }, 5); }
  // inside: a medallion on the floor and a hanging lamp
  b.cyl(0xd6336c, { x: px, y: 0.73, z: pz, sy: 0.02 }, 1.5, 1.5, 24); b.cyl(0xf2c200, { x: px, y: 0.74, z: pz, sy: 0.02 }, 1.1, 1.1, 24); b.cyl(0x1c7ed6, { x: px, y: 0.75, z: pz, sy: 0.02 }, 0.6, 0.6, 24);
  glows.push([CX + px, 3.0, CZ + pz, 2.4], [CX + px - 2.2, 3.0, CZ + pz + 3.4, 1.0], [CX + px + 2.2, 3.0, CZ + pz + 3.4, 1.0]);
  // lotus pond, swing, benches, palms
  b.push(POND[0], 0, POND[1]); MODELS.pond(b); b.pop(); circ(...W(...POND), 2.2);
  b.push(SWING[0], 0, SWING[1], 0); MODELS.jhoola(b); b.pop(); circ(...W(SWING[0] - 0.9, SWING[1]), 0.2); circ(...W(SWING[0] + 0.9, SWING[1]), 0.2);
  for (const [x, z, face] of BENCHES) { b.push(x, 0, z, face * Math.PI / 2); MODELS.marblebench(b); b.pop(); }
  const palms = [[-3.6, 11.8], [3.6, 11.8], [-3.6, 5.2], [3.6, 5.2], [-9.2, 9], [9.2, 9], [-9.4, -2], [9.4, -2], [-8.6, -13], [8.6, -13], [-4.2, -13.2], [4.2, -13.2]];
  for (const [x, z] of palms) { b.push(x, 0, z, x * 7); MODELS.palm(b); b.pop(); circ(...W(x, z), 0.28); }
  for (const [x, z, k] of [[-9, 3.5, 'neem'], [9, 3.5, 'neem'], [-8.8, -7.5, 'ashoka'], [9, -8, 'peepal']]) { b.push(x, 0, z, z); MODELS[k](b); b.pop(); circ(...W(x, z), 0.35); }
  // lamp posts along both paths
  for (const [x, z] of [[-1.9, 12], [1.9, 12], [-1.9, 6.4], [1.9, 6.4], [-1.9, -0.4], [1.9, -0.4], [-8.2, 2.2], [8.2, 2.2], [-1.9, -5.4], [1.9, -5.4]]) { b.push(x, 0, z); MODELS.goldlamp(b); b.pop(); glows.push([CX + x, 3.1, CZ + z, 1.7]); circ(...W(x, z), 0.15); }
  // hedges along the sides and behind the pavilion
  for (let i = 0; i < 13; i++) for (const x of [-10.2, 10.2]) b.ico(shade(0x2f7a2f, (i % 3 - 1) * 0.05), { x, y: 0.7, z: -13 + i * 2.05, sx: 1.4, sy: 1.5, sz: 1.5 }, 1);
  for (let i = 0; i < 10; i++) b.ico(shade(0x2f7a2f, (i % 3 - 1) * 0.05), { x: -9 + i * 2, y: 0.7, z: -13.3, sx: 1.5, sy: 1.5, sz: 1.4 }, 1);
  rect(CX - 10.2, CZ - 0.2, 1.3, 26.4); rect(CX + 10.2, CZ - 0.2, 1.3, 26.4); rect(CX, CZ - 13.3, 20, 1.3);
  // the entrance: two domed gate pillars, a Punjabi/English sign board and low railings
  const gz = 13.2;
  for (const s of [-1, 1]) {
    b.rbox(OCHRE, { x: s * 2.6, y: 1.5, z: gz, sx: 1.0, sy: 3.0, sz: 1.0 }, 0.06); b.rbox(MARBLE, { x: s * 2.6, y: 0.2, z: gz, sx: 1.3, sy: 0.4, sz: 1.3 }, 0.05);
    b.rbox(MARBLE, { x: s * 2.6, y: 3.1, z: gz, sx: 1.3, sy: 0.2, sz: 1.3 }, 0.04); b.dome(GOLD, { x: s * 2.6, y: 3.2, z: gz, s: 1.2 }, 12, 6); b.cone(GOLD, { x: s * 2.6, y: 4.0, z: gz, sx: 0.1, sy: 0.5, sz: 0.1 }, 5);
    for (let i = 0; i < 8; i++) { const x = s * (3.4 + i * 0.95); b.cyl(0x2e3236, { x, y: 0.55, z: gz, sy: 1.1 }, 0.025, 0.025, 4); b.cone(GOLD, { x, y: 1.14, z: gz, sx: 0.08, sy: 0.14, sz: 0.08 }, 4); }
    b.box(0x2e3236, { x: s * 7.6, y: 0.9, z: gz, sx: 8, sy: 0.05, sz: 0.05 }); b.box(0x2e3236, { x: s * 7.6, y: 0.25, z: gz, sx: 8, sy: 0.05, sz: 0.05 });
    circ(...W(s * 2.6, gz), 0.55);
  }
  b.rbox(OCHRE, { x: 0, y: 3.7, z: gz, sx: 5.0, sy: 0.9, sz: 0.4 }, 0.05);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.75), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਬਾਰਾਦਰੀ ਬਾਗ਼  ·  BARADARI GARDENS', size: 40 }], { w: 1024, h: 168, bg: '#7a1e2c', border: '#e3b23c' }) }));
  sign.position.set(CX, 3.7, CZ + gz + 0.22); sign.rotation.x = -0.12; scene.add(sign);
  b.rbox(OCHRE, { x: 0, y: 3.25, z: gz, sx: 5.0, sy: 0.25, sz: 0.4 }, 0.04);
  rect(CX + 7.6, CZ + gz, 8, 0.4); rect(CX - 7.6, CZ + gz, 8, 0.4);
  glows.push([CX - 2.6, 3.3, CZ + gz + 0.6, 1.1], [CX + 2.6, 3.3, CZ + gz + 0.6, 1.1]);
  // the Mali's stall: a striped awning over flower baskets and garlands
  const [mx, mz] = MALI;
  b.push(mx, 0, mz, 0);
  b.rbox(0x9a6a3a, { y: 0.55, sx: 2.6, sy: 1.1, sz: 0.9 }, 0.05);
  for (const s of [-1, 1]) for (const zz of [-0.4, 0.4]) b.cyl(0x7a4a24, { x: s * 1.2, y: 1.3, z: zz, sy: 2.6 }, 0.05, 0.05, 6);
  for (let i = 0; i < 8; i++) b.box(i % 2 ? 0xffffff : 0xd6336c, { x: -1.4 + 0.2 + i * 0.4, y: 2.65, z: 0, sx: 0.4, sy: 0.06, sz: 1.4, rx: 0.3 });
  for (let i = 0; i < 7; i++) b.sph([0xff9a1f, 0xd6336c, 0xffffff, 0xe03131][i % 4], { x: -1.0 + i * 0.33, y: 1.2 + (i % 2) * 0.05, z: 0.05, s: 0.26, ao: false }, 6, 4);
  for (let i = 0; i < 9; i++) b.sph(i % 2 ? 0xff9a1f : 0xffc61a, { x: -1.15 + i * 0.29, y: 2.3 - Math.sin(i / 8 * Math.PI) * 0.18, z: 0.5, s: 0.13, ao: false }, 5, 4);
  b.pop();
  rect(CX + mx, CZ + mz, 2.8, 1.1);
  glows.push([CX + mx, 2.2, CZ + mz + 0.6, 0.9]);
  b.pop();
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.4), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਮਾਲੀ  MALI', size: 52 }], { w: 512, h: 120, bg: '#d6336c' }) }));
  sign2.position.set(CX + mx, 2.95, CZ + mz - 0.1); sign2.rotation.x = -0.3; scene.add(sign2);
  const statics = b.meshChunks(22, vcMaterialCut);
  scene.add(statics);
  game.seeThrough?.add(statics);
}

// ---------------------------------------------------------------- the living garden
export class Baradari {
  constructor(game) {
    this.game = game;
    this.mali = new Walker(game, { turban: 0xd6336c, shirt: 0xfff3bf, pants: 0xf2eee2, apron: 0x2b8a3e });
    this.mali.pos.set(CX + MALI[0], 0, CZ + MALI[1] - 0.95); this.mali.face(0); this.mali.update(0.01);
    this.sprayT = 0; this.found = new Set(); this.sitting = null;
    this.roseMesh = this.buildRoses();
    game.scene.add(this.roseMesh);
    this.label = game.labels.add(() => this.hint(), () => _v.set(CX + FOUNTAIN[0], 4.4, CZ + FOUNTAIN[1] + 4), 'bubble', 16);
    const act = (o) => game.actions.add({ vehicleOk: false, ...o });
    act({ label: () => this.wishLabel(), x: CX + FOUNTAIN[0], z: CZ + FOUNTAIN[1] + 3.3, r: 2.2, visible: () => !game.visit, onPress: () => this.wish() });
    BENCHES.forEach(([x, z, face], i) => act({ label: () => this.sitLabel(i), x: CX + x + face * 0.0, z: CZ + z, r: 1.7, visible: () => !this.sitting, onPress: () => this.sit(i) }));
    act({ label: () => '🌹 Mali\'s stall — Baradari specials', x: CX + MALI[0], z: CZ + MALI[1] + 1.4, r: 1.9, visible: () => !game.visit, onPress: () => game.ui.open('mali') });
    act({ label: () => '🎠 Jhoola', x: CX + SWING[0], z: CZ + SWING[1] + 1.2, r: 1.6, onPress: () => this.swing(), visible: () => !this.sitting });
    this.day();
  }

  // the daily slate: wish, benches and roses reset at the start of each real day
  day() {
    const gd = this.game.state.garden, today = todayKey();
    if (gd.day !== today) Object.assign(gd, { day: today, found: [], bonus: false, wished: '', sat: {}, relax: 0 });
    this.today = today;
    this.spots = dailyRoses(today, this.game.state.pid);
    this.found = new Set(gd.found);
    this.refreshRoses();
  }
  get gd() { return this.game.state.garden; }
  roseLeft() { return this.spots.filter((_, k) => !this.found.has(k)).length; }

  buildRoses() {
    const b = new Builder(0.02, { ao: 0 });
    b.cyl(0x3f8f35, { y: 0.2, sy: 0.4 }, 0.02, 0.025, 4);
    b.ico(0x3f8f35, { x: 0.07, y: 0.22, z: 0, sx: 0.12, sy: 0.05, sz: 0.08 }, 0);
    for (let i = 0; i < 5; i++) b.sph(i ? 0xe03131 : 0xb02424, { x: Math.cos(i * 1.3) * 0.05, y: 0.46 + (i ? 0 : 0.03), z: Math.sin(i * 1.3) * 0.05, s: i ? 0.13 : 0.1, ao: false }, 6, 4);
    const m = new THREE.InstancedMesh(b.build(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x3a0505 }), GARDEN.roses);
    m.frustumCulled = false; m.count = 0;
    return m;
  }
  refreshRoses() {
    let n = 0;
    this.spots.forEach((s, k) => {
      if (this.found.has(k)) return;
      const [x, z] = W(...ROSE_SPOTS[s]);
      _m.compose(_v.set(x, 0, z), _q.identity(), new THREE.Vector3(2.2, 2.2, 2.2));
      this.roseMesh.setMatrixAt(n++, _m);
    });
    this.roseMesh.count = n;
    this.roseMesh.instanceMatrix.needsUpdate = true;
  }

  inside() { const p = this.game.player.pos; return Math.abs(p.x - CX) < GARDEN.w / 2 + 1 && Math.abs(p.z - CZ) < GARDEN.d / 2 + 1; }
  hint() {
    if (!this.inside() || this.game.visit || this.game.state.level < GARDEN.level) return '';
    return this.roseLeft() ? `🌹 ${this.roseLeft()} hidden roses left today` : '🌹 All roses found today!';
  }
  locked() { if (this.game.state.level < GARDEN.level) { this.game.ui.toast(`🔒 Baradari Gardens open at level ${GARDEN.level}`); return true; } return false; }

  // ---------- the fountain
  wishLabel() { return this.gd.wished === this.today ? '⛲ Fountain (wish made today)' : `⛲ Make a wish · ₹${GARDEN.wishCost}`; }
  wish() {
    const g = this.game, st = g.state, gd = this.gd;
    if (this.locked()) return;
    if (gd.wished === this.today) { g.ui.toast('⛲ Your wish for today is already with the fountain. Come back tomorrow'); return; }
    if (st.money < GARDEN.wishCost) { g.ui.toast('Not enough money for the coin'); g.audio.play('error'); return; }
    st.money -= GARDEN.wishCost;
    gd.wished = this.today;
    const r = Math.random(), L = st.level;
    let msg;
    if (r < 0.38) { const n = 1 + Math.floor(Math.random() * 3); this.tokens(n); msg = `🌹 The fountain gave you ${n} rose${n > 1 ? 's' : ''}`; }
    else if (r < 0.62) { const m = Math.round((60 + L * 12) * (0.6 + Math.random()) / 5) * 5; g.reward(m); msg = `🪙 A shower of coins: +₹${m}`; }
    else if (r < 0.82) { const x = 20 + L * 3; g.addXP(x); msg = `✨ You feel lucky: +${x} XP`; }
    else if (r < 0.94) {
      const crops = Object.entries(CROPS).filter(([, c]) => c.level <= L).map(([id]) => id), id = crops[Math.floor(Math.random() * crops.length)];
      st.seeds[id] = (st.seeds[id] || 0) + 8; msg = `${CROPS[id].icon} 8 ${CROPS[id].name} seeds floated up`;
    } else { this.tokens(5); msg = '🌟 Lucky wish! 5 roses'; }
    g.audio.play('splash'); g.audio.play('bless');
    g.fx.sparkle(CX + FOUNTAIN[0], 1.4, CZ + FOUNTAIN[1], 0x9be7ff, 24);
    g.ui.toast(msg, 3.5);
    g.emit('wish', {});
    g.ui.money();
    g.save(true);
  }
  tokens(n) { const gd = this.gd; gd.tokens += n; gd.total += n; this.game.ui.soul?.(); }

  // ---------- benches
  sitLabel(i) { return this.gd.sat[i] === this.today ? '🪑 Sit for a while' : '🪑 Sit & relax'; }
  sit(i) {
    const g = this.game, [x, z, face] = BENCHES[i], pl = g.player;
    if (this.sitting || pl.vehicle) return;
    if (!g.visit && this.locked()) return;
    this.sitting = i;
    pl.sit = { t: GARDEN.sitSecs, x: CX + x - face * 0.05, z: CZ + z, y: 0.02, rot: face * Math.PI / 2, done: (finished) => this.stood(i, finished) };
    g.ui.toast('🪑 Relaxing… (move to stand up)', 1.8);
  }
  stood(i, finished) {
    const g = this.game, gd = this.gd;
    this.sitting = null;
    if (!finished || g.visit) return;
    if (gd.sat[i] === this.today) { g.ui.toast('😌 So peaceful'); return; }
    gd.sat[i] = this.today; gd.relax++;
    const xp = GARDEN.sitBonus + g.state.level;
    g.addXP(xp); g.audio.play('bless'); g.emit('relax', {});
    let msg = `😌 Relaxed on the bench: +${xp} XP`;
    if (gd.relax === 3) { this.tokens(1); msg += ' · 🌹 +1 rose for a calm day'; }
    g.ui.toast(msg, 3);
    g.save();
  }
  swing() {
    const g = this.game;
    g.ui.toast('🎠 Jhoola jhoole! The swing creaks happily', 2.4);
    g.audio.play('pop'); this.swingT = 3;
  }

  // ---------- roses
  collect(k) {
    const g = this.game, gd = this.gd;
    if (this.found.has(k) || !(k in this.spots)) return;                 // each rose pays once
    this.found.add(k); gd.found = [...this.found];
    this.tokens(1);
    g.addXP(4 + Math.floor(g.state.level / 3));
    g.audio.play('aura'); g.emit('rose', {});
    const [x, z] = W(...ROSE_SPOTS[this.spots[k]]);
    g.fx.sparkle(x, 0.6, z, 0xff6b81, 16);
    this.refreshRoses();
    const left = this.roseLeft();
    g.ui.toast(left ? `🌹 Found a rose! ${left} left today` : '🌹 All eight roses found!', 2.2);
    if (!left && !gd.bonus) {
      gd.bonus = true; this.tokens(GARDEN.rosesBonus.tokens); g.reward(g.state.level * 40); g.addXP(30); g.emit('gardenDone', {});
      g.ui.toast(`🏆 Baradari daily challenge done: +${GARDEN.rosesBonus.tokens} roses and ₹${g.state.level * 40}`, 4);
    }
    g.save(true);
  }

  update(dt, t) {
    const g = this.game, p = g.player.pos;
    if (this.today !== todayKey()) this.day();
    this.mali.update(dt);
    if (this.swingT > 0) this.swingT -= dt;
    // fountain spray is drawn by the decor manager for placed fountains; the royal one here
    this.sprayT -= dt;
    if (this.sprayT <= 0 && Math.hypot(p.x - (CX + FOUNTAIN[0]), p.z - (CZ + FOUNTAIN[1])) < 26) {
      this.sprayT = 0.1;
      const a = Math.random() * 6.28, r = Math.random() * 0.3, x = CX + FOUNTAIN[0], z = CZ + FOUNTAIN[1];
      g.fx.puff(x + Math.cos(a) * r, 3.2, z + Math.sin(a) * r, { color: 0xe6f6ff, size: 0.24, grow: 0.8, life: 0.9, rise: -1.4, drift: 0.7, alpha: 0.6 });
      g.fx.puff(x, 2.4, z, { color: 0xffffff, size: 0.2, grow: 0.6, life: 0.7, rise: 1.0, drift: 0.4, alpha: 0.5 });
    }
    if (g.visit || g.state.level < GARDEN.level || !this.inside()) return;
    // roses: sparkle when close, picked up by walking over them
    this.glintT = (this.glintT || 0) - dt;
    this.spots.forEach((s, k) => {
      if (this.found.has(k)) return;
      const [x, z] = W(...ROSE_SPOTS[s]), d = Math.hypot(p.x - x, p.z - z);
      if (d < 1.0) this.collect(k);
      else if (d < 7 && this.glintT <= 0) { g.fx.sparkle(x, 0.55, z, 0xff8fa3, 2); }
    });
    if (this.glintT <= 0) this.glintT = 1.4;
  }
}
