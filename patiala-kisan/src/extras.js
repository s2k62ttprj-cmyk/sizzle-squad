// Farm life added in the big expansion:
//  - pets (Sheru the dog, Billo the cat) that follow you about and love a pat
//  - the Navi Zameen paddock: horses that graze and a pond full of ducks
//  - visitors who come to admire a beautiful farm, take a photo and leave a tip
//  - the Mela: a vehicle race through flags, a harvest challenge and hidden golden matkas
//  - puddles on the tracks after rain
import * as THREE from 'three';
import { Builder } from './geo.js';
import { enhance } from './shading.js';
import { makeHuman, animateHuman } from './models.js';
import { collide } from './world.js';
import { PETS, PADDOCK, MELA, DECOR, beautyTier } from './config.js';
import { todayKey } from './state.js';

const MAT = () => enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true });
const _lp = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- four-legged models
function quadruped(kind) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const b = new Builder(0.02, { ao: 0.1, aoH: 0.5 }), legs = [];
  const C = { dog: [0xc68642, 0xf1e3c8], cat: [0x6c757d, 0xf8f9fa], horse: [0x7b4a2a, 0x2b1d12], duck: [0xf8f9fa, 0xf08c00] }[kind];
  let legH, legX, legZ, legR;
  if (kind === 'horse') {
    b.capsule(C[0], { y: 1.45, rx: Math.PI / 2 }, 0.38, 1.1, 10); b.capsule(C[0], { y: 1.95, z: 0.8, rx: 0.6 }, 0.17, 0.6, 8);
    b.rbox(C[0], { y: 2.2, z: 1.15, sx: 0.24, sy: 0.26, sz: 0.55, rx: 0.4 }, 0.08); b.box(C[1], { y: 2.1, z: 0.65, sx: 0.06, sy: 0.55, sz: 0.5, rx: 0.6 });
    b.capsule(C[1], { y: 1.3, z: -1.0, rx: 0.5 }, 0.07, 0.6, 5); for (const s of [-1, 1]) b.cone(C[0], { x: s * 0.08, y: 2.45, z: 1.0, sx: 0.06, sy: 0.16, sz: 0.06 }, 4);
    legH = 1.05; legX = 0.2; legZ = 0.55; legR = 0.07;
  } else if (kind === 'duck') {
    b.sph(C[0], { y: 0.18, sx: 0.28, sy: 0.22, sz: 0.42 }, 8, 6); b.sph(C[0], { y: 0.38, z: 0.17, s: 0.18 }, 8, 6); b.cone(C[1], { y: 0.36, z: 0.3, sx: 0.08, sy: 0.14, sz: 0.05, rx: Math.PI / 2 }, 4);
    b.cone(C[0], { y: 0.24, z: -0.24, sx: 0.12, sy: 0.16, sz: 0.06, rx: -1.0 }, 4);
    g.add(b.mesh(MAT())); return { group: g, body, legs };
  } else {
    const big = kind === 'dog' ? 1 : 0.75;
    b.capsule(C[0], { y: 0.42 * big, rx: Math.PI / 2 }, 0.16 * big, 0.45 * big, 8);
    b.sph(C[0], { y: 0.62 * big, z: 0.36 * big, s: 0.3 * big }, 10, 8); b.sph(C[1], { y: 0.57 * big, z: 0.5 * big, sx: 0.16 * big, sy: 0.12 * big, sz: 0.16 * big }, 8, 6);
    b.sph(0x1d1d1f, { y: 0.6 * big, z: 0.58 * big, s: 0.06 * big }, 6, 4);
    for (const s of [-1, 1]) { b.sph(0x1d1d1f, { x: s * 0.07 * big, y: 0.68 * big, z: 0.49 * big, s: 0.045 * big, ao: false }, 5, 4); b.cone(kind === 'cat' ? C[0] : 0x8a5a2b, { x: s * 0.1 * big, y: 0.8 * big, z: 0.34 * big, sx: 0.09 * big, sy: kind === 'cat' ? 0.16 : 0.12, sz: 0.06 * big, rz: -s * (kind === 'dog' ? 0.6 : 0.1) }, 4); }
    if (kind === 'dog') b.torus(0xc92a2a, { y: 0.52, z: 0.25, rx: 1.2, s: 1 }, 0.13, 0.025, 4, 12);
    legH = 0.3 * big; legX = 0.09 * big; legZ = 0.18 * big; legR = 0.04 * big;
  }
  body.add(b.mesh(MAT()));
  const lb = new Builder(0.02, { ao: 0 });
  lb.cyl(kind === 'horse' ? C[0] : C[0], { y: -legH / 2, sy: legH }, legR, legR * 0.8, 6);
  if (kind === 'horse') lb.cyl(0x2b1d12, { y: -legH + 0.05, sy: 0.1 }, legR * 1.2, legR * 1.2, 6);
  const lgeo = lb.build();
  for (const [x, z] of [[-legX, legZ], [legX, legZ], [-legX, -legZ], [legX, -legZ]]) { const l = new THREE.Mesh(lgeo, MAT()); l.position.set(x, legH, z); body.add(l); legs.push(l); }
  if (kind === 'dog' || kind === 'cat') { const tb = new Builder(0, { ao: 0 }); tb.capsule(kind === 'dog' ? 0xc68642 : 0x6c757d, { y: 0.15, rx: 0 }, 0.03, 0.25, 5); const tail = new THREE.Mesh(tb.build(), MAT()); tail.position.set(0, kind === 'dog' ? 0.5 : 0.35, kind === 'dog' ? -0.32 : -0.26); tail.rotation.x = -0.6; body.add(tail); g.userData.tail = tail; }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, body, legs };
}
function walkPose(m, t, speed, sit = 0) {
  const k = Math.min(1, speed / 2), sw = Math.sin(t * (6 + speed * 2)) * 0.6 * k;
  m.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? sw : -sw); });
  m.body.position.y = Math.abs(Math.sin(t * (6 + speed * 2))) * 0.03 * k - sit * 0.12;
  m.body.rotation.x = -sit * 0.35;
  if (m.group.userData.tail) m.group.userData.tail.rotation.z = Math.sin(t * (speed > 0.2 ? 14 : 6)) * 0.5;
}

// ---------------------------------------------------------------- pets
class Pet {
  constructor(game) { this.game = game; this.kind = null; this.t = 0; }
  get st() { return this.game.state.pets; }
  sync() {
    const k = this.st.active && this.st.owned[this.st.active] ? this.st.active : null;
    if (k === this.kind) return;
    if (this.m) this.game.scene.remove(this.m.group);
    this.kind = k; this.m = null;
    if (!k) return;
    this.m = quadruped(k);
    const p = this.game.player.pos; this.m.group.position.set(p.x - 1.2, 0, p.z - 1);
    this.game.scene.add(this.m.group);
  }
  update(dt, t) {
    this.syncT = (this.syncT || 0) - dt;
    if (this.syncT <= 0) { this.syncT = 1; this.sync(); }
    if (!this.m) return;
    const g = this.game, pl = g.player, p = this.m.group.position, v = pl.vehicle;
    const back = v ? 3 : 1.4, tx = pl.pos.x - Math.sin(pl.rot) * back + Math.cos(pl.rot) * 0.8, tz = pl.pos.z - Math.cos(pl.rot) * back - Math.sin(pl.rot) * 0.8;
    const d = Math.hypot(tx - p.x, tz - p.z);
    if (v?.alt > 1) { walkPose(this.m, t, 0, 1); return; }          // waits on the ground while you fly
    if (d > 30) { p.set(tx, 0, tz); return; }
    let sp = 0;
    if (d > 0.6) {
      sp = Math.min(d * 2.2, v ? 16 : 7.5);
      const a = Math.atan2(tx - p.x, tz - p.z);
      this.m.group.rotation.y += wrap(a - this.m.group.rotation.y) * Math.min(1, dt * 8);
      p.x += Math.sin(this.m.group.rotation.y) * sp * dt; p.z += Math.cos(this.m.group.rotation.y) * sp * dt;
      collide(g.colliders, p, 0.25);
      this.idle = 0;
    } else this.idle = (this.idle || 0) + dt;
    walkPose(this.m, t, sp, this.idle > 2 ? Math.min(1, (this.idle - 2) * 2) : 0);
  }
  pat() {
    const g = this.game, st = g.state, P = PETS[this.kind], now = Date.now();
    g.audio.play(this.kind === 'dog' ? 'pop' : 'click');
    const p = this.m.group.position; g.fx.sparkle(p.x, 0.9, p.z, 0xff8fab, 12);
    if (now - (this.st.pat || 0) > PETS.patEvery * 1000) {
      this.st.pat = now; g.addXP(PETS.patXp); st.stats.petPlay = (st.stats.petPlay || 0) + 1; g.emit('petPlay', {});
      g.ui.toast(`${P.icon} ${P.name} ${this.kind === 'dog' ? 'wags his tail' : 'purrs'}! +${PETS.patXp} XP`, 2);
    } else g.ui.toast(`${P.icon} ${P.name} ${this.kind === 'dog' ? 'jumps up happily' : 'rolls over'}`, 1.4);
  }
}

// ---------------------------------------------------------------- the paddock: horses and ducks
class Paddock {
  constructor(game) {
    this.game = game;
    const P = PADDOCK, b = new Builder(0.03, { ao: 0.2, aoH: 0.8 }), cols = game.colliders;
    const { x0, x1, z0, z1 } = P;
    // white rail fence with a gap on the west side, a shed, a trough and the duck pond
    const rail = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az); b.push((ax + bx) / 2, 0, (az + bz) / 2, ry); for (const y of [0.45, 0.9]) b.box(0xf8f9fa, { y, sx: 0.06, sy: 0.08, sz: L }); for (let i = 0; i <= Math.round(L / 2.5); i++) b.box(0xe9ecef, { y: 0.55, z: -L / 2 + i * L / Math.round(L / 2.5), sx: 0.12, sy: 1.1, sz: 0.12 }); b.pop(); cols.push(ax === bx ? { x0: ax - 0.1, x1: ax + 0.1, z0: Math.min(az, bz), z1: Math.max(az, bz) } : { x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: az - 0.1, z1: az + 0.1 }); };
    rail(x0, z0, x1, z0); rail(x0, z1, x1, z1); rail(x1, z0, x1, z1); rail(x0, z0, x0, (z0 + z1) / 2 - 1.6); rail(x0, (z0 + z1) / 2 + 1.6, x0, z1);
    const [sx, sz] = P.shed;
    b.rbox(0x9c5a2e, { x: sx, y: 1.3, z: sz, sx: 5, sy: 2.6, sz: 3 }, 0.05); b.prism(0x7a3b1e, { x: sx, y: 2.9, z: sz, sx: 5.4, sy: 0.9, sz: 3.4, ry: Math.PI / 2 });
    b.rbox(0x5c3d2e, { x: sx, y: 1, z: sz + 1.52, sx: 1.6, sy: 2, sz: 0.06 }, 0.02);
    cols.push({ x0: sx - 2.6, x1: sx + 2.6, z0: sz - 1.6, z1: sz + 1.6 });
    const [tx, tz] = P.trough; b.rbox(0x868e96, { x: tx, y: 0.3, z: tz, sx: 2, sy: 0.5, sz: 0.6 }, 0.05); b.box(0x8bc34a, { x: tx, y: 0.56, z: tz, sx: 1.8, sy: 0.04, sz: 0.45, ao: false }); cols.push({ x: tx, z: tz, r: 0.9 });
    const [px, pz, pr] = P.pond;
    b.cyl(0x2f8ac8, { x: px, y: 0.04, z: pz, sy: 0.04 }, pr, pr, 28);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; b.ico(0x9c9486, { x: px + Math.cos(a) * (pr + 0.2), y: 0.12, z: pz + Math.sin(a) * (pr + 0.2), sx: 0.6, sy: 0.3, sz: 0.5 }, 0); }
    for (let i = 0; i < 5; i++) b.cyl(0x3f8f35, { x: px + Math.cos(i * 1.3) * pr * 0.6, y: 0.07, z: pz + Math.sin(i * 1.3) * pr * 0.6, sy: 0.02 }, 0.3, 0.3, 8);
    cols.push({ x: px, z: pz, r: pr });
    game.scene.add(b.meshChunks(24, MAT()));
    this.horses = []; this.ducks = [];
    this.group = new THREE.Group(); game.scene.add(this.group);
    for (let i = 0; i < P.horses; i++) { const m = quadruped('horse'); m.group.position.set(x0 + 4 + i * 4, 0, z0 + 3 + (i % 2) * 4); m.group.rotation.y = i; this.group.add(m.group); this.horses.push({ m, tx: m.group.position.x, tz: m.group.position.z, wait: i }); }
    for (let i = 0; i < P.ducks; i++) { const m = quadruped('duck'); this.group.add(m.group); this.ducks.push({ m, a: i / P.ducks * Math.PI * 2, r: pr * (0.4 + (i % 3) * 0.18), s: 0.25 + (i % 2) * 0.12 }); }
    if (game.visit) return;
    game.pads.add({ x: x0 - 2.5, z: (z0 + z1) / 2, r: 1.3,
      label: () => `<b>🐴 Ghoda Tabela (paddock)</b><br>Horses and a duck pond · ₹${P.cost.toLocaleString('en-IN')}${game.state.level < P.level ? `<br>🔒 Level ${P.level}` : ''}`,
      visible: () => !this.st.owned, pay: { level: P.level, cost: P.cost, ref: () => this.st, done: () => this.buy() } });
    game.actions.add({ label: () => (this.st.fed === todayKey() ? '🐴 Pat the horses' : '🌾 Feed the horses'), x: tx, z: tz - 1.3, r: 2, visible: () => this.st.owned, onPress: () => this.feed() });
  }
  get st() { return this.game.state.paddock; }
  buy() { const g = this.game; this.st.owned = true; g.addXP(40); g.audio.play('yay'); g.ui.toast('🐴 The paddock is yours! Horses and ducks have moved in', 3); g.save(true); }
  feed() {
    const g = this.game, today = todayKey();
    g.audio.play('pop');
    const [tx, tz] = PADDOCK.trough; for (const h of this.horses) { h.tx = tx + (Math.random() - 0.5) * 3; h.tz = tz + 1.6 + Math.random(); h.wait = 0; }
    if (this.st.fed === today) { g.ui.toast('🐴 The horses nuzzle you', 1.5); return; }
    this.st.fed = today; g.addXP(PADDOCK.feedXp); g.state.soul += PADDOCK.feedSoul; g.state.stats.horsesFed = (g.state.stats.horsesFed || 0) + 1;
    g.fx.sparkle(tx, 1, tz, 0x8bc34a, 16);
    g.ui.toast(`🌾 The horses are fed · +${PADDOCK.feedXp} XP, +${PADDOCK.feedSoul} soul`, 2.5); g.save();
  }
  update(dt, t) {
    const own = !!this.st?.owned;
    this.group.visible = own;
    if (!own) return;
    const P = PADDOCK, p = this.game.player.pos;
    if (Math.hypot(p.x - (P.x0 + P.x1) / 2, p.z - (P.z0 + P.z1) / 2) > 60) return;
    for (const h of this.horses) {
      const g = h.m.group.position, d = Math.hypot(h.tx - g.x, h.tz - g.z);
      if (d < 0.3) { h.wait -= dt; if (h.wait <= 0) { h.tx = P.x0 + 2 + Math.random() * (P.x1 - P.x0 - 4); h.tz = P.z0 + 2 + Math.random() * (P.z1 - P.z0 - 4); h.wait = 4 + Math.random() * 8; } walkPose(h.m, t, 0); h.m.body.rotation.x = 0.25 + Math.sin(t + h.tx) * 0.05; continue; }
      const a = Math.atan2(h.tx - g.x, h.tz - g.z); h.m.group.rotation.y += wrap(a - h.m.group.rotation.y) * Math.min(1, dt * 3);
      g.x += Math.sin(h.m.group.rotation.y) * 1.3 * dt; g.z += Math.cos(h.m.group.rotation.y) * 1.3 * dt;
      collide(this.game.colliders, g, 0.6);
      walkPose(h.m, t, 1.3);
    }
    const [px, pz] = P.pond;
    for (const d of this.ducks) { d.a += d.s * dt; d.m.group.position.set(px + Math.cos(d.a) * d.r, 0.02 + Math.sin(t * 3 + d.a) * 0.02, pz + Math.sin(d.a) * d.r); d.m.group.rotation.y = -d.a; }
    this.quackT = (this.quackT || 4) - dt;
    if (this.quackT <= 0) { this.quackT = 6 + Math.random() * 8; if (Math.hypot(p.x - px, p.z - pz) < 14) this.game.audio.play('pop'); }
  }
}

// ---------------------------------------------------------------- visitors
const LOOKS = [[0x1c7ed6, 0xf1f3f5, 0x495057], [0xe64980, 0xffe3ec, 0x343a40], [0x2b8a3e, 0xfff3bf, 0x868e96], [0xf08c00, 0xe7f5ff, 0x212529], [0x7048e8, 0xf8f9fa, 0x495057]];
const SAYS = ['😍 Wah ji wah!', '📸 Kinna sohna farm!', '🌸 Bahut sundar!', '👏 Kamaal kar ditta!', '✨ Ehna phullan di khushboo!'];
class Visitors {
  constructor(game) { this.game = game; this.list = []; this.t = 20; }
  update(dt, t) {
    const g = this.game, st = g.state, dec = g.decor;
    if (g.visit || !dec) return;
    const score = dec.beauty || 0;
    this.t -= dt;
    if (this.t <= 0 && score >= MELA.visitorBeauty && this.list.length < 3 && dec.list.length) {
      this.t = 45 + Math.random() * 45;
      const target = dec.list[(Math.random() * dec.list.length) | 0], [lc, ls, lp] = LOOKS[(Math.random() * LOOKS.length) | 0];
      const h = makeHuman({ shirt: ls, pants: lp, turban: Math.random() < 0.5 ? lc : null, female: Math.random() < 0.4, hairStyle: 'pony', top: Math.random() < 0.5 ? 'kurta' : undefined });
      const start = MELA.visitorFrom[(Math.random() * MELA.visitorFrom.length) | 0];
      h.group.position.set(start[0], 0, start[1]); g.scene.add(h.group);
      const v = { h, target, home: start, phase: 'go', t: 0, say: '', stuck: 0 };
      v.label = g.labels.add(() => v.say, () => _lp.set(v.h.group.position.x, 2.3, v.h.group.position.z), 'bubble', 22);
      this.list.push(v);
    }
    for (const v of [...this.list]) {
      const p = v.h.group.position, R = DECOR[v.target.k]?.r || 1;
      const [tx, tz] = v.phase === 'go' ? [v.target.x + R + 0.8, v.target.z + R * 0.5] : v.home;
      const d = Math.hypot(tx - p.x, tz - p.z);
      v.t += dt;
      if (v.phase === 'look') {
        animateHuman(v.h, t, 0);
        v.h.group.rotation.y = Math.atan2(v.target.x - p.x, v.target.z - p.z);
        if (v.t > 1.5 && !v.paid) {
          v.paid = true; v.say = SAYS[(Math.random() * SAYS.length) | 0];
          const tip = MELA.visitorTip + beautyTier(dec.beauty) * MELA.visitorTipTier;
          st.money += tip; st.stats.visitors = (st.stats.visitors || 0) + 1; g.ui.money(); g.emit('visitor', {});
          g.fx.sparkle(p.x, 1.8, p.z, 0xffffff, 10);
          if (Math.hypot(g.player.pos.x - p.x, g.player.pos.z - p.z) < 30) { g.audio.play('coin'); g.ui.toast(`📸 A visitor loved your ${DECOR[v.target.k]?.name || 'garden'}! Tip +₹${tip}`, 2.2); }
        }
        if (v.t > 6) { v.phase = 'home'; v.t = 0; v.say = ''; }
        continue;
      }
      if (d < 0.6 || v.t > 70) {
        if (v.phase === 'go' && d < 0.6) { v.phase = 'look'; v.t = 0; continue; }
        g.scene.remove(v.h.group); g.labels.remove(v.label); this.list.splice(this.list.indexOf(v), 1); continue;
      }
      const a = Math.atan2(tx - p.x, tz - p.z), ox = p.x, oz = p.z;
      v.h.group.rotation.y = a; p.x += Math.sin(a) * 2.2 * dt; p.z += Math.cos(a) * 2.2 * dt;
      collide(g.colliders, p, 0.35);
      if (Math.hypot(p.x - ox, p.z - oz) < 2.2 * dt * 0.3) { v.stuck += dt; p.x += Math.cos(a) * 2 * dt; p.z -= Math.sin(a) * 2 * dt; if (v.stuck > 6) v.t = 99; }
      animateHuman(v.h, t, 2.2);
    }
  }
}

// ---------------------------------------------------------------- the mela: race, harvest challenge, hidden matkas
class Mela {
  constructor(game) {
    this.game = game;
    const b = new Builder(0.03, { ao: 0.2, aoH: 0.8 }), [bx, bz] = MELA.board;
    // a striped tent and a board
    b.cone(0xe03131, { x: bx, y: 2.6, z: bz, sx: 3.2, sy: 1.4, sz: 3.2 }, 8); b.cyl(0xffe066, { x: bx, y: 1.0, z: bz, sy: 2.0 }, 1.5, 1.5, 8, true);
    b.sph(0xf2c200, { x: bx, y: 3.4, z: bz, s: 0.3 }, 6, 5); b.rbox(0x5c3d2e, { x: bx + 2.2, y: 1, z: bz, sx: 0.1, sy: 2, sz: 1.6 }, 0.02);
    for (let i = 0; i < 8; i++) b.box([0xe03131, 0xf2c200, 0x1c7ed6, 0x2b8a3e][i % 4], { x: bx - 1.6 + i * 0.45, y: 2.1, z: bz - 1.6, sx: 0.2, sy: 0.3, sz: 0.02, ao: false });
    game.colliders.push({ x: bx, z: bz, r: 1.6 });
    game.scene.add(b.meshChunks(24, MAT()));
    game.actions.add({ label: () => '🎪 Mela games', x: bx + 2.2, z: bz + 1.2, r: 2.2, visible: () => !game.visit, onPress: () => game.ui.open('mela') });
    // race flags (shown during a race)
    const fb = new Builder(0, { ao: 0 }); fb.cyl(0xf8f9fa, { y: 1.6, sy: 3.2 }, 0.05, 0.05, 6); fb.prism(0xe03131, { x: 0.45, y: 2.8, sx: 0.8, sy: 0.6, sz: 0.04, rz: -Math.PI / 2 });
    const fgeo = fb.build();
    this.flags = MELA.race.map(([x, z]) => { const m = new THREE.Mesh(fgeo, MAT()); m.position.set(x, 0, z); m.visible = false; game.scene.add(m); return m; });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.8, depthWrite: false }));
    this.ring.position.y = 0.06; this.ring.visible = false; game.scene.add(this.ring);
    // golden matkas
    const mb = new Builder(0.02, { ao: 0 }); mb.sph(0xf2c200, { y: 0.35, sx: 0.6, sy: 0.55, sz: 0.6 }, 10, 8); mb.cyl(0xe8a317, { y: 0.66, sy: 0.12 }, 0.16, 0.22, 10); mb.torus(0xc92a2a, { y: 0.42, rx: Math.PI / 2, s: 1 }, 0.29, 0.03, 4, 16);
    this.matkas = new THREE.InstancedMesh(mb.build(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x4a3200 }), MELA.matkas);
    this.matkas.frustumCulled = false; game.scene.add(this.matkas);
    this.race = null; this.harvest = null;
    game.on('harvest', (d) => { const pl = game.player.pos, v = game.player.vehicle; if (this.harvest && d?.p && Math.hypot(d.p.x - pl.x, d.p.z - pl.z) < (v ? 7 : 3.5)) this.harvest.n++; });
  }
  get st() { return this.game.state.mela; }
  spots() {
    const day = todayKey();
    if (this._day === day) return this._spots;
    let h = 5381; for (const ch of day) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
    const pool = [...MELA.matkaSpots], out = [];
    while (out.length < MELA.matkas) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
    this._day = day; this._spots = out;
    return out;
  }
  startRace() {
    const g = this.game, v = g.player.vehicle;
    if (!v || v.kind === 'plane') return 'Get on a vehicle first (bike, tractor, car…), then start';
    this.race = { i: 0, t: 0 }; this.harvest = null;
    g.ui.toast(`🏁 Race! Drive through ${MELA.race.length} red flags in order within ${MELA.raceTime} s. Go!`, 3);
    return '';
  }
  startHarvest() {
    const g = this.game, now = Date.now();
    if (now - (this.st.hLast || 0) < MELA.harvestCool * 1000) return `Rest a little: again in ${Math.ceil((MELA.harvestCool * 1000 - now + this.st.hLast) / 60000)} min`;
    this.st.hLast = now; this.harvest = { n: 0, t: 0 }; this.race = null;
    g.ui.toast(`🌾 Harvest challenge! Harvest as many crops as you can in ${MELA.harvestTime} s`, 3);
    return '';
  }
  update(dt, t) {
    const g = this.game, st = g.state;
    if (g.visit || !this.st) return;
    // hidden matkas
    const day = todayKey();
    if (this.st.day !== day) { this.st.day = day; this.st.found = []; }
    const spots = this.spots(), p = g.player.pos;
    spots.forEach(([x, z], i) => {
      const gone = this.st.found.includes(i);
      _m.compose(_p.set(x, Math.sin(t * 2 + i) * 0.05, z), _q.setFromEuler(_e.set(0, t + i, 0)), gone ? _s.set(0, 0, 0) : _s.set(1, 1, 1));
      this.matkas.setMatrixAt(i, _m);
      if (!gone && !g.player.vehicle && Math.hypot(p.x - x, p.z - z) < 1.3) {
        this.st.found.push(i); st.money += MELA.matkaPay; g.ui.money(); g.audio.play('coin'); g.fx.sparkle(x, 0.8, z, 0xffd43b, 18);
        st.stats.matkas = (st.stats.matkas || 0) + 1;
        if (this.st.found.length === MELA.matkas) { st.money += MELA.matkaBonus; g.addXP(60); g.audio.play('yay'); g.ui.toast(`🏺 All ${MELA.matkas} golden matkas found! +₹${MELA.matkaBonus} bonus`, 3.5); }
        else g.ui.toast(`🏺 Golden matka! +₹${MELA.matkaPay} · ${this.st.found.length}/${MELA.matkas} today`, 2);
        g.save();
      }
    });
    this.matkas.instanceMatrix.needsUpdate = true;
    // race
    for (const f of this.flags) f.visible = false;
    this.ring.visible = false;
    if (this.race) {
      const R = this.race, v = g.player.vehicle; R.t += dt;
      if (!v || R.t > MELA.raceTime) { g.ui.toast(v ? '⏱️ Out of time! Try the race again at the mela' : 'Race stopped'); this.race = null; }
      else {
        this.flags.forEach((f, i) => { f.visible = i >= R.i; });
        const [fx, fz] = MELA.race[R.i]; this.ring.position.set(fx, 0.06, fz); this.ring.visible = true; this.ring.rotation.y = t;
        if (Math.hypot(v.pos.x - fx, v.pos.z - fz) < 3) {
          R.i++; g.audio.play('coin'); g.fx.sparkle(fx, 1.5, fz, 0xe03131, 14);
          if (R.i >= MELA.race.length) {
            const secs = Math.round(R.t), best = !this.st.best || secs < this.st.best, pay = MELA.racePay + st.level * 40;
            if (best) this.st.best = secs;
            st.money += pay; g.addXP(50); st.stats.races = (st.stats.races || 0) + 1; g.emit('race', {}); g.ui.money(); g.audio.play('yay');
            g.ui.toast(`🏁 Finished in ${secs} s${best ? ' · new record!' : ''} · +₹${pay.toLocaleString('en-IN')}`, 4); this.race = null; g.save(true);
          } else g.ui.toast(`🚩 Flag ${R.i}/${MELA.race.length}`, 0.9);
        }
      }
    }
    // harvest challenge
    if (this.harvest) {
      const H = this.harvest; H.t += dt;
      if (H.t >= MELA.harvestTime) {
        const pay = H.n * MELA.harvestPay, best = H.n > (this.st.hBest || 0);
        if (best) this.st.hBest = H.n;
        st.money += pay; g.addXP(Math.min(80, H.n * 2)); g.ui.money(); g.audio.play(H.n ? 'yay' : 'error');
        g.ui.toast(`🌾 Time! You harvested ${H.n} crops · +₹${pay.toLocaleString('en-IN')}${best && H.n ? ' · new record!' : ''}`, 4);
        this.harvest = null; g.save(true);
      }
    }
  }
  status() {
    if (this.race) return `🏁 ${this.race.i}/${MELA.race.length} · ${Math.max(0, Math.ceil(MELA.raceTime - this.race.t))} s`;
    if (this.harvest) return `🌾 ${this.harvest.n} · ${Math.max(0, Math.ceil(MELA.harvestTime - this.harvest.t))} s`;
    return '';
  }
}

// ---------------------------------------------------------------- puddles on the tracks after rain
class Puddles {
  constructor(game) {
    this.game = game; this.wet = 0;
    const geo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0x8fb8cf, transparent: true, opacity: 0.7, depthWrite: false }), MELA.puddles.length);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -1; this.mesh.position.y = 0.04; game.scene.add(this.mesh);
  }
  update(dt) {
    const W = this.game.weather, rain = W?.rain || 0;
    this.wet = Math.max(0, Math.min(1, this.wet + (rain > 0.25 ? dt / 40 : -dt / 200)));
    this.mesh.visible = this.wet > 0.02;
    if (!this.mesh.visible || Math.abs(this.wet - (this.last || 0)) < 0.01) return;
    this.last = this.wet;
    MELA.puddles.forEach(([x, z, r], i) => { _m.compose(_p.set(x, 0, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(r * this.wet, 1, r * this.wet * 0.7)); this.mesh.setMatrixAt(i, _m); });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  get muddy() { return this.wet; }
}

export class Extras {
  constructor(game) {
    this.game = game;
    this.pet = new Pet(game);
    this.paddock = new Paddock(game);
    this.visitors = new Visitors(game);
    this.mela = new Mela(game);
    this.puddles = new Puddles(game);
    if (!game.visit) game.actions.add({ label: () => `${PETS[this.pet.kind]?.icon || '🐾'} Pat ${PETS[this.pet.kind]?.name || ''}`, pos: () => this.pet.m?.group.position || FAR, r: 1.6, visible: () => !!this.pet.m && !game.player.vehicle, onPress: () => this.pet.pat() });
  }
  buyPet(k) {
    const g = this.game, st = g.state, P = PETS[k];
    if (!P) return 'Unknown pet';
    if (st.pets.owned[k]) { st.pets.active = st.pets.active === k ? '' : k; g.save(); return ''; }
    if (st.level < P.level) return `Unlocks at level ${P.level}`;
    if (st.money < P.cost) return 'Not enough money';
    st.money -= P.cost; st.pets.owned[k] = true; st.pets.active = k; g.ui.money(); g.audio.play('yay'); g.save(true);
    return '';
  }
  update(dt, t) {
    if (this.game.visit) { this.paddock.update(dt, t); return; }
    this.pet.update(dt, t);
    this.paddock.update(dt, t);
    this.visitors.update(dt, t);
    this.mela.update(dt, t);
    this.puddles.update(dt);
  }
}
const FAR = { x: 1e5, z: 1e5 };
