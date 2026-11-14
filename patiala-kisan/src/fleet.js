// New wheels and wings: golf cart, quad bike, pickup, SUV and Punjab truck (each with its own
// handling), and the crop-duster airplane that lives at the Navi Zameen airstrip. The plane takes
// off from the runway, flies anywhere over Patiala, sprays fields when flying low, and has the sky
// games: the ring tour against the clock, kites to catch every day and cargo runs to nearby towns.
import * as THREE from 'three';
import { Builder, textTexture } from './geo.js';
import { enhance } from './shading.js';
import { wheel } from './models.js';
import { collide } from './world.js';
import { VEHICLES, PLANE, PLANE_ENGINES } from './config.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const _w = new THREE.Vector3(), _lp = new THREE.Vector3();
const MAT = () => enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true });
export const FLEET = ['golfcart', 'atv', 'pickup', 'suv', 'truck', 'plane'];
// where each new vehicle waits when bought (beside the garage row; the plane at the hangar)
const PARK = { golfcart: [26, 9.5, Math.PI], atv: [29, 9.5, Math.PI], pickup: [32.5, 9.8, Math.PI], suv: [36.5, 9.8, Math.PI], truck: [42, 2, Math.PI], plane: PLANE.park };
const DIM = { golfcart: { r: 0.9, seat: [0, 0.55, -0.1], wr: 0.25, wx: 0.55, wz: [0.8, -0.8] }, atv: { r: 0.75, seat: [0, 0.78, -0.25], wr: 0.32, wx: 0.55, wz: [0.62, -0.62] },
  pickup: { r: 1.6, seat: [-0.38, 0.72, 0.35], wr: 0.4, wx: 0.85, wz: [1.45, -1.4] }, suv: { r: 1.6, seat: [-0.38, 0.78, 0.25], wr: 0.42, wx: 0.85, wz: [1.35, -1.35] },
  truck: { r: 2.3, seat: [-0.5, 1.35, 2.3], wr: 0.5, wx: 1.05, wz: [2.4, -1.5, -2.6] } };

// ---------------------------------------------------------------- models (all face +z)
function carBody(kind) {
  const b = new Builder(0.02, { ao: 0.15, aoH: 0.6 });
  const GLASS = 0x2d3a4a, CHROME = 0xd5d9de;
  if (kind === 'golfcart') {
    b.rbox(0xf8f9fa, { y: 0.42, sx: 1.15, sy: 0.3, sz: 2.2 }, 0.1); b.rbox(0x2b8a3e, { y: 0.62, z: -0.15, sx: 1.05, sy: 0.14, sz: 0.6 }, 0.05);
    b.rbox(0x2b8a3e, { y: 0.9, z: -0.45, sx: 1.05, sy: 0.5, sz: 0.1 }, 0.04); b.rbox(0xf8f9fa, { y: 0.62, z: 0.75, sx: 1.1, sy: 0.3, sz: 0.6 }, 0.08);
    for (const [x, z] of [[-0.5, 0.95], [0.5, 0.95], [-0.5, -0.9], [0.5, -0.9]]) b.cyl(0xced4da, { x, y: 1.2, z, sy: 1.3 }, 0.025, 0.025, 6);
    b.rbox(0x2b8a3e, { y: 1.88, sx: 1.25, sy: 0.08, sz: 2.1 }, 0.04); b.cyl(0x343a40, { y: 0.95, z: 0.55, sy: 0.4, rx: -0.6 }, 0.02, 0.02, 4); b.torus(0x343a40, { y: 1.12, z: 0.45, rx: -0.9, s: 1 }, 0.14, 0.02, 4, 12);
    for (let i = 0; i < 3; i++) b.cyl([0xc92a2a, 0x1c7ed6, 0xf2c200][i], { x: -0.3 + i * 0.3, y: 0.85, z: -0.95, sy: 0.6 }, 0.04, 0.04, 6);
  } else if (kind === 'atv') {
    b.rbox(0xc92a2a, { y: 0.62, sx: 0.9, sy: 0.32, sz: 1.5 }, 0.12); b.rbox(0x212529, { y: 0.84, z: -0.25, sx: 0.5, sy: 0.14, sz: 0.7 }, 0.06);
    b.rbox(0xc92a2a, { y: 0.78, z: 0.62, sx: 1.15, sy: 0.12, sz: 0.5 }, 0.05); b.rbox(0xc92a2a, { y: 0.78, z: -0.7, sx: 1.15, sy: 0.12, sz: 0.45 }, 0.05);
    b.cyl(0x343a40, { y: 1.0, z: 0.42, sy: 0.4, rx: -0.4 }, 0.03, 0.03, 5); b.cyl(0x343a40, { y: 1.18, z: 0.5, sy: 0.75, rz: Math.PI / 2 }, 0.025, 0.025, 5);
    b.sph(0xfff3bf, { y: 0.8, z: 0.88, sx: 0.3, sy: 0.12, sz: 0.06, ao: false }, 8, 4); b.box(0x343a40, { y: 0.9, z: -0.85, sx: 0.8, sy: 0.04, sz: 0.3 });
  } else if (kind === 'pickup') {
    const C = 0x8a1c1c;
    b.rbox(0x343a40, { y: 0.45, sx: 1.8, sy: 0.25, sz: 4.5 }, 0.06);
    b.rbox(C, { y: 0.85, z: 1.35, sx: 1.85, sy: 0.6, sz: 1.8 }, 0.12); b.rbox(C, { y: 1.45, z: 0.55, sx: 1.75, sy: 0.65, sz: 1.5 }, 0.12);
    b.box(GLASS, { y: 1.5, z: 1.31, sx: 1.6, sy: 0.5, sz: 0.04, rx: -0.35 }); for (const s of [-1, 1]) b.box(GLASS, { x: s * 0.89, y: 1.5, z: 0.55, sx: 0.02, sy: 0.42, sz: 1.2 });
    b.rbox(C, { y: 0.8, z: -1.15, sx: 1.85, sy: 0.12, sz: 2.3 }, 0.04); for (const s of [-1, 1]) b.rbox(C, { x: s * 0.88, y: 1.05, z: -1.15, sx: 0.1, sy: 0.5, sz: 2.3 }, 0.03);
    b.rbox(C, { y: 1.05, z: -2.28, sx: 1.85, sy: 0.5, sz: 0.1 }, 0.03); b.rbox(CHROME, { y: 0.62, z: 2.27, sx: 1.8, sy: 0.22, sz: 0.1 }, 0.04);
    for (const s of [-1, 1]) b.sph(0xfff3bf, { x: s * 0.65, y: 0.95, z: 2.25, sx: 0.3, sy: 0.18, sz: 0.06, ao: false }, 8, 4);
  } else if (kind === 'suv') {
    const C = 0x1d1f22;
    b.rbox(C, { y: 0.85, sx: 1.9, sy: 0.75, sz: 4.3 }, 0.14); b.rbox(C, { y: 1.55, z: -0.25, sx: 1.8, sy: 0.7, sz: 3.2 }, 0.14);
    b.box(GLASS, { y: 1.6, z: 1.37, sx: 1.6, sy: 0.55, sz: 0.04, rx: -0.3 }); for (const s of [-1, 1]) b.box(GLASS, { x: s * 0.91, y: 1.6, z: -0.25, sx: 0.02, sy: 0.45, sz: 2.8 });
    b.rbox(CHROME, { y: 0.75, z: 2.16, sx: 1.6, sy: 0.35, sz: 0.06 }, 0.04); for (let i = 0; i < 6; i++) b.box(0x495057, { x: -0.6 + i * 0.24, y: 0.75, z: 2.2, sx: 0.04, sy: 0.3, sz: 0.02 });
    for (const s of [-1, 1]) { b.sph(0xfff3bf, { x: s * 0.72, y: 1.0, z: 2.15, sx: 0.32, sy: 0.16, sz: 0.06, ao: false }, 8, 4); b.box(0x343a40, { x: s * 0.6, y: 1.94, z: -0.25, sx: 0.06, sy: 0.06, sz: 2.8 }); }
    b.cyl(0x343a40, { y: 1.2, z: -2.2, sy: 0.25, rx: Math.PI / 2 }, 0.36, 0.36, 12);
  } else {
    // a painted Punjab truck
    b.rbox(0x343a40, { y: 0.6, sx: 2.2, sy: 0.3, sz: 6.6 }, 0.06);
    b.rbox(0xf08c00, { y: 1.55, z: 2.35, sx: 2.3, sy: 1.6, sz: 1.7 }, 0.14); b.box(GLASS, { y: 1.9, z: 3.21, sx: 2.0, sy: 0.6, sz: 0.04 });
    b.rbox(0xc92a2a, { y: 2.5, z: 2.6, sx: 2.3, sy: 0.35, sz: 1.3 }, 0.1); for (let i = 0; i < 7; i++) b.sph([0xf2c200, 0x2b8a3e, 0x1c7ed6, 0xe64980][i % 4], { x: -0.9 + i * 0.3, y: 2.5, z: 3.27, s: 0.16, ao: false }, 6, 4);
    b.rbox(0x2b8a3e, { y: 1.75, z: -1.0, sx: 2.4, sy: 1.9, sz: 4.6 }, 0.06);
    for (const s of [-1, 1]) { b.box(0xf2c200, { x: s * 1.21, y: 2.2, z: -1.0, sx: 0.02, sy: 0.3, sz: 4.4, ao: false }); b.box(0xe64980, { x: s * 1.21, y: 1.4, z: -1.0, sx: 0.02, sy: 0.25, sz: 4.4, ao: false }); for (let i = 0; i < 6; i++) b.sph(0xffffff, { x: s * 1.22, y: 1.8, z: -3 + i * 0.8, sx: 0.04, sy: 0.22, sz: 0.22, ao: false }, 6, 4); }
    b.rbox(CHROME, { y: 0.8, z: 3.25, sx: 2.2, sy: 0.3, sz: 0.1 }, 0.04); for (const s of [-1, 1]) b.sph(0xfff3bf, { x: s * 0.8, y: 1.05, z: 3.24, sx: 0.32, sy: 0.2, sz: 0.06, ao: false }, 8, 4);
    for (let i = 0; i < 9; i++) b.box([0xc92a2a, 0xf2c200, 0x1c7ed6][i % 3], { x: -1.0 + i * 0.25, y: 0.35, z: -3.3, sx: 0.1, sy: 0.35, sz: 0.02, ao: false });
  }
  return b;
}
export function makeCar(kind) {
  const D = DIM[kind], group = new THREE.Group();
  group.add(carBody(kind).mesh(MAT()));
  const wheels = [];
  for (const z of D.wz) for (const s of [-1, 1]) {
    const w = wheel(D.wr, kind === 'atv' ? 0.3 : 0.22, 0x1d1d1f, kind === 'suv' ? 0xadb5bd : kind === 'truck' ? 0xf2c200 : 0xced4da);
    w.position.set(s * D.wx, D.wr, z); w.userData.r = D.wr; w.userData.front = z > 0;
    group.add(w); wheels.push(w);
  }
  const seat = new THREE.Object3D(); seat.position.set(...D.seat); group.add(seat);
  return { group, wheels, seat };
}
export function makePlane() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const b = new Builder(0.02, { ao: 0.12, aoH: 0.8 });
  const Y = 0xf2c200, R = 0xc92a2a, W = 0xf8f9fa;
  b.capsule(Y, { y: 1.15, rx: Math.PI / 2 }, 0.55, 3.6, 12);
  b.rbox(0x2d3a4a, { y: 1.72, z: 0.45, sx: 0.8, sy: 0.45, sz: 1.2 }, 0.2);
  b.rbox(Y, { y: 1.55, z: 0.1, sx: 9.0, sy: 0.12, sz: 1.5 }, 0.05);
  for (const s of [-1, 1]) { b.rbox(R, { x: s * 4.1, y: 1.56, z: 0.1, sx: 0.8, sy: 0.13, sz: 1.52 }, 0.04); b.box(R, { x: s * 1.6, y: 1.15, z: 0.1, sx: 0.04, sy: 0.8, sz: 0.05, rz: s * 0.4 }); }
  b.box(R, { y: 1.15, z: -0.6, sx: 1.12, sy: 0.12, sz: 2.4, ao: false });
  b.rbox(Y, { y: 1.35, z: -2.6, sx: 3.0, sy: 0.08, sz: 0.8 }, 0.03); b.prism(R, { y: 1.95, z: -2.65, sx: 0.08, sy: 1.1, sz: 0.9, ry: Math.PI / 2 });
  b.cyl(W, { y: 1.15, z: 2.15, sy: 0.3, rx: Math.PI / 2 }, 0.45, 0.5, 12); b.cone(R, { y: 1.15, z: 2.45, sy: 0.35, rx: Math.PI / 2 }, 10);
  // landing gear: two main wheels and a tail wheel
  for (const s of [-1, 1]) b.cyl(0x495057, { x: s * 0.75, y: 0.6, z: 0.6, sy: 0.9, rz: s * 0.5 }, 0.04, 0.04, 5);
  b.cyl(0x495057, { y: 0.55, z: -2.4, sy: 0.6, rx: 0.3 }, 0.03, 0.03, 5);
  // spray booms under the wings
  b.box(0xadb5bd, { y: 1.35, z: -0.4, sx: 8, sy: 0.04, sz: 0.04 });
  body.add(b.mesh(MAT()));
  const wheels = [];
  for (const [x, z, r] of [[-1.05, 0.6, 0.3], [1.05, 0.6, 0.3], [0, -2.55, 0.15]]) { const w = wheel(r, 0.14, 0x1d1d1f, 0xced4da); w.position.set(x, r, z); w.userData.r = r; body.add(w); wheels.push(w); }
  const prop = new THREE.Group(); prop.position.set(0, 1.15, 2.65);
  const pb = new Builder(0, { ao: 0 });
  for (const a of [0, Math.PI]) pb.box(0x343a40, { x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7, sx: 1.4, sy: 0.14, sz: 0.04, rz: a });
  pb.sph(R, { s: 0.2 }, 8, 6);
  prop.add(pb.mesh(MAT())); body.add(prop);
  const seat = new THREE.Object3D(); seat.position.set(0, 1.25, 0.35); body.add(seat);
  return { group, body, wheels, seat, prop };
}

// ---------------------------------------------------------------- a ground vehicle
export class Ride {
  constructor(game, kind) {
    this.game = game; this.kind = kind; this.cfg = VEHICLES[kind];
    Object.assign(this, makeCar(kind));
    this.data = game.state.vehicles[kind];
    if (!this.data.x && !this.data.z) { const p = PARK[kind]; this.data.x = p[0]; this.data.z = p[1]; this.data.rot = p[2]; }
    this.pos = this.group.position; this.pos.set(this.data.x, 0, this.data.z);
    this.rot = this.data.rot; this.group.rotation.y = this.rot;
    this.speed = 0; this.rev = false; this.radius = DIM[kind].r; this.lean = 0;
    for (const w of this.wheels) w.rotation.order = 'YXZ';
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(this.group);
    game.labels.add(() => (game.player.vehicle === this ? '' : `${this.cfg.icon} ${this.cfg.name}`), () => _lp.set(this.pos.x, kind === 'truck' ? 3.6 : 2.4, this.pos.z), 'veh', 18);
    game.actions.add({ label: () => `${this.cfg.icon} Drive ${this.cfg.name}`, pos: () => this.pos, r: this.radius + 1.6, visible: () => !game.player.vehicle && game.player.bow === 0, onPress: () => (game.player.vehicle ? null : this.enter()) });
  }
  get cargo() { return this.data.cargo; }
  get cargoCap() { return this.cfg.cargo; }
  syncCargo() {}
  enter() { const g = this.game; g.player.vehicle = this; g.audio.play('engine'); g.ui.vehicleMode(this); g.state.stats.drives = (g.state.stats.drives || 0) + 1; }
  exit() {
    const g = this.game, pl = g.player;
    pl.vehicle = null; this.speed = 0;
    const side = this.radius + 0.7;
    pl.pos.set(this.pos.x + Math.cos(this.rot) * side, 0, this.pos.z - Math.sin(this.rot) * side);
    collide(g.colliders, pl.pos, 0.38);
    g.audio.setEngine(false); g.ui.vehicleMode(null); this.save(); g.save(true);
  }
  drive(dt) {
    const g = this.game, v = g.input.vector(), c = this.cfg;
    const rough = !c.offroad && g.farm.fieldAt(this.pos.x, this.pos.z, 0) ? 0.65 : 1, wet = 1 - 0.15 * (g.weather?.rain || 0);
    const max = c.speed * rough;
    let target = 0, d = 0;
    if (v.len > 0.12) {
      const want = Math.atan2(v.x, v.y), fwd = wrap(want - this.rot);
      if (!this.rev && Math.abs(fwd) > 2.4 && this.speed < 1.2) this.rev = true; else if (this.rev && Math.abs(fwd) < 1.4) this.rev = false;
      d = this.rev ? wrap(want + Math.PI - this.rot) : fwd;
      const turn = c.turn * wet * (0.3 + 0.7 * Math.min(1, Math.abs(this.speed) / 3)) * (Math.abs(this.speed) > c.speed * 0.7 ? 0.8 : 1);
      this.rot += Math.max(-turn * dt, Math.min(turn * dt, d));
      target = this.rev ? -max * 0.4 * v.len : max * v.len * Math.max(0.25, Math.cos(d));
    }
    const acc = target === 0 ? 4 : (target > this.speed ? c.accel / Math.max(4, c.speed) * 2 : 3.5);
    this.speed += (target - this.speed) * Math.min(1, dt * acc);
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += Math.sin(this.rot) * this.speed * dt; this.pos.z += Math.cos(this.rot) * this.speed * dt;
    collide(g.colliders, this.pos, this.radius);
    const bx = this.pos.x, bz = this.pos.z;
    collide(g.vehicleColliders, this.pos, this.radius);
    if (bx !== this.pos.x || bz !== this.pos.z) this.warn('🙏 Please park outside the Gurdwara and walk in barefoot');
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (Math.abs(this.speed) * dt > 0.001 && moved < Math.abs(this.speed) * dt * 0.3) this.speed *= 0.6;
    g.audio.setEngine(true, Math.abs(this.speed), { golfcart: 1.9, atv: 1.5, pickup: 1.0, suv: 1.15, truck: 0.7 }[this.kind]);
    this.steer = d;
  }
  update(dt) {
    const g = this.game;
    if (g.player.vehicle === this) this.drive(dt);
    this.group.rotation.y = this.rot;
    for (const w of this.wheels) { w.rotation.x += this.speed * dt / w.userData.r; if (w.userData.front) w.rotation.y = Math.max(-0.45, Math.min(0.45, this.steer || 0)) * (g.player.vehicle === this ? 1 : 0); }
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0 && Math.abs(this.speed) > 2.5) { this.fxT = 0.08; const back = this.radius * 0.8; g.fx.dust(this.pos.x - Math.sin(this.rot) * back, this.pos.z - Math.cos(this.rot) * back, this.kind === 'truck' ? 1.4 : 0.9); }
  }
  warn(msg) { const now = performance.now(); if (now - (this.warnAt || 0) < 3000) return; this.warnAt = now; this.game.ui.toast(msg); this.game.audio.play('error'); }
  save() { this.data.x = +this.pos.x.toFixed(2); this.data.z = +this.pos.z.toFixed(2); this.data.rot = +this.rot.toFixed(3); }
}

// ---------------------------------------------------------------- the airplane
export class Airplane {
  constructor(game) {
    this.game = game; this.kind = 'plane'; this.cfg = VEHICLES.plane;
    Object.assign(this, makePlane());
    this.data = game.state.vehicles.plane;
    if (!this.data.x && !this.data.z) { const p = PARK.plane; this.data.x = p[0]; this.data.z = p[1]; this.data.rot = p[2]; }
    if (!(this.data.fuel >= 0)) this.data.fuel = this.eng().fuel;
    this.pos = this.group.position; this.pos.set(this.data.x, 0, this.data.z);
    this.rot = this.data.rot; this.group.rotation.y = this.rot;
    this.speed = 0; this.alt = 0; this.vs = 0; this.bank = 0; this.pitch = 0; this.radius = 2.2; this.lean = 0;
    for (const w of this.wheels) w.rotation.order = 'YXZ';
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(this.group);
    game.labels.add(() => (game.player.vehicle === this ? '' : '✈️ Airplane'), () => _lp.set(this.pos.x, 3.4 + this.alt, this.pos.z), 'veh', 26);
    game.actions.add({ label: () => '✈️ Fly the airplane', pos: () => this.pos, r: 3.4, visible: () => !game.player.vehicle && game.player.bow === 0 && this.alt < 0.1, onPress: () => (game.player.vehicle ? null : this.enter()) });
  }
  get cargo() { return this.data.cargo; }
  get cargoCap() { return 0; }
  get flying() { return this.alt > 0.05; }
  eng() { return PLANE_ENGINES[this.data.hp] || PLANE_ENGINES[0]; }
  syncCargo() {}
  enter() {
    const g = this.game;
    g.player.vehicle = this; g.audio.play('engine'); g.ui.vehicleMode(this);
    if (!g.state.stats.flewHint) { g.state.stats.flewHint = 1; g.ui.toast('✈️ Taxi with the stick, speed up along the runway and hold ⬆️ (or R) to take off. ⬇️ (or F) to come down.', 6); }
  }
  exit() {
    const g = this.game, pl = g.player;
    if (this.flying) { g.ui.toast('🛬 Land first! Hold ⬇️ to come down'); g.audio.play('error'); return; }
    pl.vehicle = null; this.speed = 0;
    pl.pos.set(this.pos.x + Math.cos(this.rot) * 3, 0, this.pos.z - Math.sin(this.rot) * 3);
    collide(g.colliders, pl.pos, 0.38);
    g.audio.setEngine(false); g.ui.vehicleMode(null); this.save(); g.save(true);
  }
  drive(dt) {
    const g = this.game, v = g.input.vector(), E = this.eng(), k = g.input.keys;
    const up = g.input.climb || k.has('r') || k.has('q'), down = g.input.dive || k.has('f') || k.has('z');
    const top = E.top;
    let want = null, err = 0;
    if (v.len > 0.12) { want = Math.atan2(v.x, v.y); err = wrap(want - this.rot); }
    if (!this.flying) {
      // taxi and take-off run
      let target = 0;
      if (want !== null) {
        const turn = 1.6 * (0.35 + 0.65 * Math.min(1, this.speed / 4)) * (this.speed > 12 ? 0.35 : 1);
        this.rot += Math.max(-turn * dt, Math.min(turn * dt, err));
        target = Math.abs(err) > 2.4 ? 0 : top * 0.8 * v.len * Math.max(0.2, Math.cos(err));
      }
      this.speed += (target - this.speed) * Math.min(1, dt * (target > this.speed ? E.climb * 0.12 + 0.3 : 1.4));
      if (up && this.speed >= PLANE.takeoff && this.data.fuel > 0) {
        this.alt = 0.1; this.vs = E.climb * 0.6;
        g.state.stats.flights = (g.state.stats.flights || 0) + 1;
        g.emit('flight', {}); g.ui.toast('🛫 Airborne! Steer with the stick, ⬆️ climb, ⬇️ descend', 3);
      } else if (up && this.speed < PLANE.takeoff && this.speed > 5) this.hint(`Faster! Take-off speed is ${Math.round(PLANE.takeoff * 3.6)} km/h`);
      else if (up && this.data.fuel <= 0) this.hint('⛽ No fuel: buy some at the hangar');
      const ox = this.pos.x, oz = this.pos.z;
      this.pos.x += Math.sin(this.rot) * this.speed * dt; this.pos.z += Math.cos(this.rot) * this.speed * dt;
      collide(g.colliders, this.pos, this.radius);
      const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
      if (this.speed * dt > 0.001 && moved < this.speed * dt * 0.3) this.speed *= 0.5;
      this.bank *= 0.85; this.pitch += (0 - this.pitch) * Math.min(1, dt * 4);
    } else {
      // flying: the stick picks the heading, ⬆️ / ⬇️ climb and descend, pulling back slows down
      const fuel = this.data.fuel > 0;
      const slow = want !== null && Math.abs(err) > 2.2;
      const target = !fuel ? top * 0.6 : slow ? top * 0.55 : top * (0.62 + 0.38 * (want === null ? 0.5 : v.len));
      this.speed += (target - this.speed) * Math.min(1, dt * 0.8);
      const yaw = want !== null && !slow ? Math.max(-1, Math.min(1, err * 1.6)) * this.cfg.turn : 0;
      this.rot += yaw * dt;
      this.bank += (-yaw * 0.45 - this.bank) * Math.min(1, dt * 3);
      let vsWant = up && fuel ? E.climb : down ? -E.climb * 1.1 : 0;
      if (!fuel) vsWant = Math.min(vsWant, -2);
      if (this.alt >= PLANE.ceiling && vsWant > 0) vsWant = 0;
      this.vs += (vsWant - this.vs) * Math.min(1, dt * 2.5);
      this.alt += this.vs * dt;
      this.pitch += (Math.atan2(this.vs, this.speed) - this.pitch) * Math.min(1, dt * 4);
      this.pos.x += Math.sin(this.rot) * this.speed * dt; this.pos.z += Math.cos(this.rot) * this.speed * dt;
      // stay over Patiala: past the hills the plane turns itself back
      if (this.pos.x < -110 || this.pos.x > 135 || this.pos.z < -105 || this.pos.z > 95) {
        const home = Math.atan2(20 - this.pos.x, -5 - this.pos.z); this.rot += wrap(home - this.rot) * Math.min(1, dt * 1.5); this.hint('↩️ Turning back over the farm');
      }
      this.data.fuel = Math.max(0, this.data.fuel - PLANE.burn * dt * (0.6 + 0.4 * this.speed / top));
      if (this.data.fuel <= 0) this.hint('⛽ Out of fuel! Gliding down…');
      if (this.alt <= 0) this.touchdown();
    }
    this.pos.y = this.alt;
    g.audio.setEngine(true, this.flying ? this.speed * 0.55 : this.speed * 0.8, 1.7);
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.hudT = 0.25; g.ui.planeHud?.(this); }
  }
  touchdown() {
    const g = this.game;
    this.alt = 0; this.vs = 0; this.pitch = 0;
    collide(g.colliders, this.pos, this.radius);
    const R = PLANE.runway, onRunway = this.pos.x > R.x0 && this.pos.x < R.x1 && this.pos.z > R.z0 && this.pos.z < R.z1;
    if (this.speed > this.eng().top * 0.8) { this.speed *= 0.5; g.fx.dust(this.pos.x, this.pos.z, 2.2); g.audio.play('error'); g.ui.toast('😬 Bumpy landing! Come in slower (pull the stick back)'); }
    else { g.ui.toast(onRunway ? '🛬 Smooth landing on the runway! Shabaash!' : '🛬 Landed in a field! Taxi back to the hangar', 2.5); if (onRunway) { g.addXP(10); g.state.stats.landings = (g.state.stats.landings || 0) + 1; } }
    g.fx.dust(this.pos.x, this.pos.z, 1.6);
  }
  hint(msg) { const now = performance.now(); if (now - (this.hintAt || 0) < 3500) return; this.hintAt = now; this.game.ui.toast(msg); }
  update(dt) {
    const g = this.game, mine = g.player.vehicle === this;
    if (mine) this.drive(dt);
    else if (this.flying) { this.alt = Math.max(0, this.alt - dt * 3); this.pos.y = this.alt; }
    this.group.rotation.set(0, this.rot, 0);
    this.body.rotation.set(-this.pitch, 0, this.bank);
    if (!this.flying) for (const w of this.wheels) w.rotation.x += this.speed * dt / w.userData.r;
    this.prop.rotation.z += dt * (mine ? 20 + this.speed * 1.5 : 0);
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0 && mine) {
      this.fxT = 0.09;
      if (!this.flying && this.speed > 6) g.fx.dust(this.pos.x - Math.sin(this.rot) * 2, this.pos.z - Math.cos(this.rot) * 2, 1.4);
      if (this.flying && this.alt < 8) g.fx.puff(this.pos.x - Math.sin(this.rot) * 0.4, Math.max(0.3, this.alt + 1.0), this.pos.z - Math.cos(this.rot) * 0.4, { color: 0xe6f6ff, size: 0.9, grow: 2.5, life: 1.0, rise: -1.2, drift: 1.2, alpha: 0.4 });
    }
  }
  save() { this.data.x = +this.pos.x.toFixed(2); this.data.z = +this.pos.z.toFixed(2); this.data.rot = +this.rot.toFixed(3); }
}

// ---------------------------------------------------------------- the airstrip and the sky games
const KITE_COLS = [0xe64980, 0xf2c200, 0x1c7ed6, 0x2b8a3e, 0xf76707, 0x7048e8];
export function kiteSpots(day) {
  let h = 2166136261; for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const R = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  return Array.from({ length: PLANE.kites }, () => [-40 + R() * 125, -60 + R() * 105, 10 + R() * 28]);
}
export class Airfield {
  constructor(game) {
    this.game = game;
    const b = new Builder(0.02, { ao: 0.2, aoH: 1.2 }), cols = game.colliders, R = PLANE.runway, cx = (R.x0 + R.x1) / 2, len = R.z1 - R.z0;
    b.box(0x4d5157, { x: cx, y: 0.03, z: (R.z0 + R.z1) / 2, sx: R.x1 - R.x0, sy: 0.03, sz: len, ao: false, j: 0.02 });
    for (let z = R.z0 + 3; z < R.z1 - 3; z += 5) b.box(0xf8f9fa, { x: cx, y: 0.05, z, sx: 0.25, sy: 0.01, sz: 2.6, ao: false, j: 0 });
    for (const zz of [R.z0 + 1.2, R.z1 - 1.2]) for (let i = 0; i < 6; i++) b.box(0xf8f9fa, { x: R.x0 + 1 + i * 1.4, y: 0.05, z: zz, sx: 0.6, sy: 0.01, sz: 1.6, ao: false, j: 0 });
    for (const s of [R.x0 + 0.2, R.x1 - 0.2]) for (let z = R.z0; z <= R.z1; z += 6) { b.cyl(0x343a40, { x: s, y: 0.15, z, sy: 0.3 }, 0.06, 0.06, 6); b.sph(0xfff3bf, { x: s, y: 0.35, z, s: 0.16, ao: false }, 6, 4); }
    // the hangar: a curved roof, open towards the runway
    const [hx, hz] = PLANE.hangar, HW = 12, HD = 9;
    for (const s of [-1, 1]) { b.rbox(0xdee2e6, { x: hx + s * HW / 2, y: 2.2, z: hz, sx: 0.3, sy: 4.4, sz: HD }, 0.05); cols.push({ x0: hx + s * HW / 2 - 0.25, x1: hx + s * HW / 2 + 0.25, z0: hz - HD / 2, z1: hz + HD / 2 }); }
    b.rbox(0xdee2e6, { x: hx, y: 2.2, z: hz + HD / 2, sx: HW, sy: 4.4, sz: 0.3 }, 0.05); cols.push({ x0: hx - HW / 2, x1: hx + HW / 2, z0: hz + HD / 2 - 0.25, z1: hz + HD / 2 + 0.25 });
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; b.box(i % 2 ? 0x868e96 : 0xadb5bd, { x: hx + Math.cos(a) * HW / 2, y: 4.4 + Math.sin(a) * 2.2, z: hz, sx: HW * Math.PI / 12 / 2 + 0.25, sy: 0.15, sz: HD + 0.3, rz: a + Math.PI / 2 }); }
    b.box(0x1c7ed6, { x: hx, y: 5.6, z: hz - HD / 2 - 0.2, sx: 7, sy: 0.9, sz: 0.1 });
    // windsock, fuel tank, a little office
    b.cyl(0xadb5bd, { x: 99, y: 3, z: -10, sy: 6 }, 0.06, 0.08, 6); b.cone(0xf76707, { x: 99, y: 5.9, z: -9.2, sx: 0.5, sy: 1.6, sz: 0.5, rx: Math.PI / 2 + 0.2 }, 10);
    b.cyl(0xc92a2a, { x: 84.5, y: 1.1, z: 44, sy: 1.6, rz: Math.PI / 2 }, 0.8, 0.8, 14); b.box(0x495057, { x: 84.5, y: 0.25, z: 44, sx: 1.6, sy: 0.5, sz: 1.2 }); cols.push({ x: 84.5, z: 44, r: 1.1 });
    game.scene.add(b.meshChunks(24, MAT()));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.85), new THREE.MeshBasicMaterial({ map: textTexture([{ text: '✈️ PATIALA FLYING CLUB', size: 50 }], { w: 1024, h: 128, bg: '#1c4fd1' }), transparent: true }));
    sign.position.set(hx, 5.6, hz - HD / 2 - 0.27); sign.rotation.y = Math.PI; game.scene.add(sign);
    // the hangar desk: refuel, engines and the sky games
    game.actions.add({ label: () => '✈️ Hangar', x: hx, z: hz - HD / 2 + 1.5, r: 2.4, visible: () => !game.visit, onPress: () => game.ui.open('hangar') });

    // sky rings (the tour) and kites
    const ringGeo = new THREE.TorusGeometry(3.6, 0.28, 8, 28);
    this.rings = PLANE.rings.map(([x, z, y]) => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.85 })); m.position.set(x, y, z); m.visible = false; game.scene.add(m); return m; });
    const kb = new Builder(0, { ao: 0 });
    kb.box(0xffffff, { sx: 1.4, sy: 1.4, sz: 0.04, rz: Math.PI / 4 }); kb.box(0x343a40, { y: -1.4, sx: 0.04, sy: 1.6, sz: 0.04 });
    this.kiteMesh = new THREE.InstancedMesh(kb.build(), new THREE.MeshLambertMaterial({ vertexColors: true }), PLANE.kites);
    this.kiteMesh.frustumCulled = false; game.scene.add(this.kiteMesh);
    for (let i = 0; i < PLANE.kites; i++) this.kiteMesh.setColorAt(i, new THREE.Color(KITE_COLS[i % KITE_COLS.length]));
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x69db7c, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    this.beam.visible = false; game.scene.add(this.beam);
    this.tour = null; this.run = null;
    this.kitesDay = '';
  }
  get sky() { return this.game.state.sky; }
  plane() { const v = this.game.player.vehicle; return v?.kind === 'plane' ? v : null; }
  today() { return new Date().toISOString().slice(0, 10); }
  // ---------- the ring tour
  startTour() {
    const p = this.plane();
    if (!p || !p.flying) return 'Take off first, then start the tour from the hangar menu';
    this.tour = { i: 0, t: 0 }; this.run = null; this.beam.visible = false;
    this.game.ui.toast(`🎯 Sky tour! Fly through ${this.rings.length} golden rings in ${PLANE.ringTime} s`, 3);
    return '';
  }
  startCargo(i) {
    const p = this.plane(), C = PLANE.cargo[i];
    if (!C) return 'Unknown run';
    if (!p || !p.flying) return 'Take off first, then pick a cargo run';
    this.run = { i, t: 0 }; this.tour = null;
    this.beam.position.set(C.x, 20, C.z); this.beam.visible = true;
    this.game.ui.toast(`📦 ${C.name}: fly to the green beam and fly through it low (under 15 m) within ${PLANE.cargoTime} s`, 4);
    return '';
  }
  update(dt, t) {
    const g = this.game, st = g.state, p = this.plane();
    // kites: a fresh set every day
    const day = this.today();
    if (this.sky.day !== day) { this.sky.day = day; this.sky.kites = []; }
    if (this.kitesDay !== day || this.kitesDirty) { this.kitesDay = day; this.kitesDirty = false; this.kiteSpots = kiteSpots(day); }
    const flyingNow = !!p?.flying, showSky = flyingNow || (st.vehicles.plane?.owned && g.player.pos.x > 50);
    this.kiteMesh.visible = showSky && st.vehicles.plane?.owned;
    if (this.kiteMesh.visible) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      this.kiteSpots.forEach(([x, z, y], i) => {
        const gone = this.sky.kites.includes(i);
        q.setFromEuler(new THREE.Euler(0, t * 0.5 + i, Math.sin(t * 2 + i) * 0.3));
        m.compose(_w.set(x, y + Math.sin(t * 1.3 + i) * 0.8, z), q, gone ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(1.4, 1.4, 1.4));
        this.kiteMesh.setMatrixAt(i, m);
        if (!gone && flyingNow && Math.hypot(p.pos.x - x, p.pos.z - z, p.alt - y) < 4.5) {
          this.sky.kites.push(i); st.money += PLANE.kitePay; st.stats.kites = (st.stats.kites || 0) + 1;
          g.audio.play('coin'); g.fx.sparkle(x, y, z, KITE_COLS[i % 6], 18); g.ui.money();
          g.ui.toast(`🪁 Kite caught! +₹${PLANE.kitePay} · ${this.sky.kites.length}/${PLANE.kites} today`, 1.8);
        }
      });
      this.kiteMesh.instanceMatrix.needsUpdate = true;
    }
    // the tour
    for (const r of this.rings) r.visible = false;
    if (this.tour) {
      const T = this.tour; T.t += dt;
      if (!flyingNow || T.t > PLANE.ringTime) { g.ui.toast(flyingNow ? '⏱️ Out of time! Try the sky tour again' : 'Sky tour stopped'); this.tour = null; }
      else {
        this.rings.forEach((r, i) => { r.visible = i >= T.i && i < T.i + 3; r.material.color.set(i === T.i ? 0xffd43b : 0xffffff); r.material.opacity = i === T.i ? 0.9 : 0.35; r.rotation.y = Math.atan2(r.position.x - (this.rings[i + 1] || r).position.x, r.position.z - (this.rings[i + 1] || r).position.z) + Math.PI / 2; });
        const r = this.rings[T.i];
        if (Math.hypot(p.pos.x - r.position.x, p.pos.z - r.position.z, p.alt - r.position.y) < 4.2) {
          T.i++; g.audio.play('coin'); g.fx.sparkle(r.position.x, r.position.y, r.position.z, 0xffd43b, 20);
          if (T.i >= this.rings.length) {
            const secs = Math.round(T.t), best = !this.sky.best || secs < this.sky.best;
            if (best) this.sky.best = secs;
            st.money += PLANE.ringPay; g.addXP(PLANE.ringXp); st.stats.tours = (st.stats.tours || 0) + 1; g.ui.money(); g.audio.play('yay');
            g.ui.toast(`🏆 Sky tour done in ${secs} s${best ? ' · new best!' : ''} +₹${PLANE.ringPay}`, 4);
            this.tour = null; g.save(true);
          } else g.ui.toast(`🎯 Ring ${T.i}/${this.rings.length}`, 1);
        }
      }
    }
    // a cargo run
    if (this.run) {
      const R = this.run, C = PLANE.cargo[R.i]; R.t += dt;
      this.beam.material.opacity = 0.22 + Math.sin(t * 4) * 0.08;
      if (!flyingNow || R.t > PLANE.cargoTime) { g.ui.toast(flyingNow ? '⏱️ Too late! The cargo run is off' : 'Cargo run stopped'); this.run = null; this.beam.visible = false; }
      else if (Math.hypot(p.pos.x - C.x, p.pos.z - C.z) < 5 && p.alt < 15) {
        st.money += C.pay; g.addXP(50); st.stats.cargoRuns = (st.stats.cargoRuns || 0) + 1; g.ui.money(); g.audio.play('yay');
        g.fx.sparkle(C.x, p.alt, C.z, 0x69db7c, 24); g.ui.toast(`📦 Delivered: ${C.name}! +₹${C.pay.toLocaleString('en-IN')}`, 3.5);
        this.run = null; this.beam.visible = false; g.save(true);
      }
    }
    // crop spraying: flying low over your fields waters every dry seed below
    if (flyingNow && p.alt < 7) {
      this.sprayT = (this.sprayT || 0) - dt;
      if (this.sprayT <= 0) {
        this.sprayT = 0.15;
        let n = 0;
        for (const q of g.farm.near(p.pos.x, p.pos.z, 4.5, [])) if (g.farm.water(q)) n++;
        if (n) { st.stats.sprayed = (st.stats.sprayed || 0) + n; st.money += n * PLANE.sprayPay; g.ui.money(); }
        g.fx.puff(p.pos.x, Math.max(0.4, p.alt - 0.4), p.pos.z, { color: 0xd8f3ff, size: 1.2, grow: 2.2, life: 1.0, rise: -1.6, drift: 1.5, alpha: 0.45 });
      }
    }
  }
  status() {
    const p = this.plane();
    if (!p) return '';
    const parts = [p.flying ? `🛫 ${Math.round(p.alt)} m · ${Math.round(p.speed * 3.6)} km/h` : `🛞 ${Math.round(p.speed * 3.6)} km/h`, `⛽ ${Math.round(p.data.fuel)}/${p.eng().fuel}`];
    if (this.tour) parts.push(`🎯 ${this.tour.i}/${this.rings.length} · ${Math.max(0, Math.ceil(PLANE.ringTime - this.tour.t))} s`);
    if (this.run) parts.push(`📦 ${Math.max(0, Math.ceil(PLANE.cargoTime - this.run.t))} s`);
    if (p.flying && p.alt < 7) parts.push('💧 spraying');
    return parts.join(' · ');
  }
}
