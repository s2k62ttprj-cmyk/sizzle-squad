// Crows and scarecrows. Every minute or two while you play, a flock of kaan (crows) flies
// in to peck a few growing plots. Pecked plots lose some growth (they are never destroyed).
// Walk over to shoo them, or put up scarecrows: each guards the plots within its radius and
// turns most raids away (all of them at the top level). Scarecrows are bought in the Shop,
// placed anywhere on or beside your own fields, then upgraded, restyled or moved.
import * as THREE from 'three';
import { makeScarecrow } from './models.js';
import { Builder, vcMaterial } from './geo.js';
import { CROWS, CROPS, SCARECROW_DESIGNS, SCARECROW_LEVELS, SCARECROW_MAX } from './config.js';
import { scarecrowGuard, makeId } from './state.js';

const $ = (id) => document.getElementById(id);
const ringGeo = new THREE.RingGeometry(0.94, 1, 72).rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// ---------------------------------------------------------------- scarecrows
export class Scarecrows {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.placing = null;
    for (const d of game.state.scarecrows) this.spawn(d);
    game.actions.add({
      label: () => `${SCARECROW_DESIGNS[this.near?.data.d]?.icon || '🧍'} Scarecrow`,
      pos: () => this.near?.group.position || _far, r: 1.7,
      visible: () => !!this.near && !this.placing && !game.visit,
      onPress: () => { game.ui.scarecrow = this.near; game.ui.open('scarecrow'); },
    });
    $('placeYes').addEventListener('click', (e) => { e.stopPropagation(); this.confirm(); });
    $('placeNo').addEventListener('click', (e) => { e.stopPropagation(); this.cancel(); });
    for (const id of ['placeYes', 'placeNo']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  ring(color, opacity) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity * 0.35, depthWrite: false }));
    ring.position.y = disc.position.y = 0.06;
    ring.renderOrder = disc.renderOrder = -1;
    g.add(ring, disc);
    g.userData.mats = [ring.material, disc.material];
    return g;
  }

  spawn(data) {
    const m = makeScarecrow(data.d, data.lvl);
    m.group.position.set(data.x, 0, data.z);
    m.group.rotation.y = data.ry || 0;
    m.group.traverse((o) => { if (o.isMesh && o.material === vcMaterial) o.castShadow = true; });
    m.data = data;
    m.ring = this.ring(0x69db7c, 0.5);
    m.ring.scale.setScalar(SCARECROW_LEVELS[data.lvl].radius);
    m.ring.position.set(data.x, 0, data.z);
    m.ring.visible = false;
    m.ph = Math.random() * 6;
    this.game.scene.add(m.group, m.ring);
    this.game.colliders.push(m.col = { x: data.x, z: data.z, r: 0.22 });
    this.list.push(m);
    return m;
  }
  despawn(m) {
    this.game.scene.remove(m.group, m.ring);
    const i = this.game.colliders.indexOf(m.col);
    if (i >= 0) this.game.colliders.splice(i, 1);
    this.list.splice(this.list.indexOf(m), 1);
  }
  rebuild(m) { const d = m.data; this.despawn(m); const n = this.spawn(d); if (this.game.ui.scarecrow === m) this.game.ui.scarecrow = n; return n; }

  // ---------- placing: a ghost scarecrow walks in front of the farmer with its protected circle
  start(design, m = null) {
    const g = this.game, st = g.state;
    if (!m && st.scarecrows.length >= SCARECROW_MAX) return `You can put up ${SCARECROW_MAX} scarecrows`;
    if (!m && st.level < SCARECROW_LEVELS[0].level) return `Unlocks at level ${SCARECROW_LEVELS[0].level}`;
    if (!m && st.money < SCARECROW_LEVELS[0].cost) return 'Not enough money';
    if (g.player.vehicle) return 'Get off the vehicle first';
    this.cancel(true);
    const lvl = m ? m.data.lvl : 0;
    const ghost = makeScarecrow(design, lvl);
    const ring = this.ring(0x69db7c, 0.75);
    ring.scale.setScalar(SCARECROW_LEVELS[lvl].radius);
    g.scene.add(ghost.group, ring);
    if (m) m.group.visible = false;
    this.placing = { design, lvl, m, ghost, ring, ok: false };
    g.ui.close();
    $('placeBar').hidden = false;
    $('action').hidden = true;
    this.updatePlacing();
    g.ui.toast('Walk to where it should stand — the green circle is what it protects', 3.2);
    return '';
  }
  // a spot is fine on or beside one of your own fields, not too close to another scarecrow
  validSpot(x, z, skip = null) {
    const g = this.game, f = g.farm.fieldAt(x, z, 1.2);
    if (!f || !g.state.fields[f.id].owned) return 'Put it on or beside one of your fields';
    for (const o of this.list) if (o !== skip && Math.hypot(o.data.x - x, o.data.z - z) < 1.6) return 'Too close to another scarecrow';
    return '';
  }
  updatePlacing() {
    const P = this.placing, g = this.game, pl = g.player;
    const x = pl.pos.x + Math.sin(pl.rot) * 1.5, z = pl.pos.z + Math.cos(pl.rot) * 1.5;
    P.ghost.group.position.set(x, 0, z);
    P.ghost.group.rotation.y = 0;
    P.ring.position.set(x, 0, z);
    const why = this.validSpot(x, z, P.m);
    P.ok = !why; P.x = x; P.z = z;
    for (const mt of P.ring.userData.mats) mt.color.set(P.ok ? 0x69db7c : 0xff6b6b);
    const L = SCARECROW_LEVELS[P.lvl];
    $('placeInfo').innerHTML = why ? `⚠️ ${why}` : `${SCARECROW_DESIGNS[P.design].icon} Protects ${L.radius} m around it${P.m ? '' : ` · ₹${L.cost}`}`;
    $('placeYes').disabled = !P.ok;
  }
  confirm() {
    const P = this.placing, g = this.game, st = g.state;
    if (!P || !P.ok) return;
    if (P.m) {
      Object.assign(P.m.data, { x: +P.x.toFixed(2), z: +P.z.toFixed(2) });
      P.m.group.visible = true;
      this.rebuild(P.m);
      g.ui.toast('🧍 Scarecrow moved', 1.8);
    } else {
      const L = SCARECROW_LEVELS[0];
      if (st.money < L.cost) { g.ui.toast('Not enough money'); g.audio.play('error'); return; }
      st.money -= L.cost;
      g.ui.money();
      const d = { id: makeId(6), x: +P.x.toFixed(2), z: +P.z.toFixed(2), lvl: 0, d: P.design };
      st.scarecrows.push(d);
      this.spawn(d);
      g.emit('scarecrow', {});
      g.ui.toast(`${SCARECROW_DESIGNS[P.design].icon} ${SCARECROW_DESIGNS[P.design].name} is guarding your crops!`, 2.6);
    }
    g.audio.play('buy');
    g.fx.dust(P.x, P.z, 1.2);
    this.placing.m = null;
    this.cancel(true);
    g.save(true);
  }
  cancel(quiet = false) {
    const P = this.placing;
    if (!P) return;
    this.game.scene.remove(P.ghost.group, P.ring);
    if (P.m) P.m.group.visible = true;
    this.placing = null;
    $('placeBar').hidden = true;
    if (!quiet) this.game.ui.toast('Cancelled', 1.2);
  }

  // ---------- managing one scarecrow (from its panel)
  upgrade(m) {
    const g = this.game, st = g.state, next = SCARECROW_LEVELS[m.data.lvl + 1];
    if (!next) return 'Already the best';
    if (st.level < next.level) return `Needs level ${next.level}`;
    if (st.money < next.cost) return 'Not enough money';
    st.money -= next.cost;
    m.data.lvl++;
    const n = this.rebuild(m);
    g.fx.sparkle(n.data.x, 1.6, n.data.z, 0xffd43b, 24);
    g.audio.play('buy');
    g.save(true);
    return '';
  }
  restyle(m, design) { m.data.d = design; this.rebuild(m); this.game.save(true); }
  remove(m) {
    const g = this.game, st = g.state;
    let paid = 0;
    for (let i = 0; i <= m.data.lvl; i++) paid += SCARECROW_LEVELS[i].cost;
    const back = Math.round(paid * 0.4);
    st.money += back;
    st.scarecrows.splice(st.scarecrows.indexOf(m.data), 1);
    this.despawn(m);
    g.save(true);
    return back;
  }

  // the scarecrow guarding a plot that crows picked (for the "Shoo!" moment)
  guarding(x, z) {
    let best = null, bg = 0;
    for (const m of this.list) {
      const L = SCARECROW_LEVELS[m.data.lvl];
      if (Math.hypot(m.data.x - x, m.data.z - z) <= L.radius && L.guard > bg) { bg = L.guard; best = m; }
    }
    return best;
  }

  update(dt, t) {
    const g = this.game, p = g.player.pos, wind = g.weather.raining ? 2 : 1;
    if (this.placing) this.updatePlacing();
    this.near = null;
    let nd = 1.7;
    for (const m of this.list) {
      const dx = p.x - m.data.x, dz = p.z - m.data.z, d = Math.hypot(dx, dz);
      if (d < nd) { nd = d; this.near = m; }
      // sway in the wind; shake hard when it has just scared crows
      m.shake = Math.max(0, (m.shake || 0) - dt);
      m.top.rotation.z = Math.sin(t * 1.3 + m.ph) * 0.035 * wind + Math.sin(t * 22) * 0.06 * m.shake;
      m.top.rotation.x = Math.sin(t * 0.9 + m.ph * 2) * 0.02 * wind;
      if (m.phirki) m.phirki.rotation.z -= dt * (5 + Math.sin(t * 0.7 + m.ph) * 2) * wind;
      if (m.phirki2) m.phirki2.rotation.z += dt * (5 + Math.cos(t * 0.6 + m.ph) * 2) * wind;
      // the protected circle shows while you stand near it (and while placing another)
      const show = this.placing ? 0.45 : d < SCARECROW_LEVELS[m.data.lvl].radius + 1.5 && !g.player.vehicle ? 0.4 : 0;
      const mats = m.ring.userData.mats;
      const o = mats[0].opacity + (show - mats[0].opacity) * Math.min(1, dt * 4);
      mats[0].opacity = o; mats[1].opacity = o * 0.3;
      m.ring.visible = o > 0.02;
    }
  }
}
const _far = new THREE.Vector3(1e6, 0, 1e6);

// ---------------------------------------------------------------- crows
function crowGeometries() {
  const b = new Builder(0.03, { ao: 0 });
  b.sph(0x1d1d22, { sx: 0.22, sy: 0.2, sz: 0.42 }, 10, 8);
  b.sph(0x26262c, { y: 0.08, z: 0.2, s: 0.16 }, 8, 6);
  b.cone(0x111114, { y: 0.07, z: 0.33, rx: Math.PI / 2, sx: 0.05, sy: 0.14, sz: 0.05 }, 5);
  b.sph(0x8a8f96, { y: 0.02, z: 0.08, sx: 0.2, sy: 0.12, sz: 0.2, ao: false }, 8, 4);        // grey neck (house crow)
  b.box(0x1d1d22, { y: 0.01, z: -0.3, sx: 0.14, sy: 0.03, sz: 0.2, rx: 0.2 });
  for (const s of [-1, 1]) b.sph(0xffffff, { x: s * 0.06, y: 0.11, z: 0.27, s: 0.025, ao: false, j: 0 }, 4, 3);
  const body = b.build();
  const w = new Builder(0.03, { ao: 0 });
  for (const s of [-1, 1]) w.box(0x18181c, { x: s * 0.24, sx: 0.44, sy: 0.02, sz: 0.24, rz: s * 0.08 });
  return { body, wings: w.build() };
}

export class Crows {
  constructor(game) {
    this.game = game;
    const g = crowGeometries();
    this.body = new THREE.InstancedMesh(g.body, vcMaterial, 6);
    this.wings = new THREE.InstancedMesh(g.wings, vcMaterial, 6);
    for (const m of [this.body, this.wings]) { m.count = 0; m.frustumCulled = false; game.scene.add(m); }
    this.flock = [];
    this.state = 'idle';
    this.t = 40 + Math.random() * 40;           // first raid comes a little after you start
  }

  // growing or ripe plots crows can peck
  targets() {
    const farm = this.game.farm, out = [];
    for (const p of farm.list) if (farm.owned(p.fid)) { const s = farm.stage(p); if (s === 3 || s === 4) out.push(p); }
    return out;
  }

  launch() {
    const g = this.game, st = g.state, all = this.targets();
    if (!all.length) return false;
    const c = all[Math.floor(Math.random() * all.length)];
    const n = CROWS.plots[0] + Math.floor(Math.random() * (CROWS.plots[1] - CROWS.plots[0] + 1));
    const plots = all.filter((p) => p.fid === c.fid && Math.hypot(p.x - c.x, p.z - c.z) < 2.3).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z)).slice(0, n);
    this.plots = plots;
    this.guard = g.scarecrows.guarding(c.x, c.z);
    this.turnedAway = Math.random() < scarecrowGuard(st, c.x, c.z);
    // fly in from a tree line off to one side
    const a = Math.random() * Math.PI * 2;
    const from = new THREE.Vector3(c.x + Math.cos(a) * 34, 9, c.z + Math.sin(a) * 34);
    this.flock = [];
    const k = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < k; i++) {
      const p = plots[i % plots.length];
      const land = new THREE.Vector3(p.x + (Math.random() - 0.5) * 1.1, 0.1, p.z + (Math.random() - 0.5) * 1.1);
      this.flock.push({ pos: from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)), from: from.clone(), land, rot: 0, flap: Math.random() * 6, delay: i * 0.25, hop: Math.random() * 6 });
    }
    this.state = 'in';
    this.time = 0;
    this.caw(c, 2);
    return true;
  }

  caw(at, n = 1) {
    const g = this.game, p = g.player.pos;
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    for (let i = 0; i < n; i++) setTimeout(() => g.audio.animal('crow', { dist: d, pan: Math.max(-1, Math.min(1, (at.x - p.x) / 12)) * 0.8, pitch: 0.9 + Math.random() * 0.2 }), i * 340);
  }

  flee(reason) {
    this.state = 'out';
    this.time = 0;
    const c = this.plots[0];
    for (const b of this.flock) { b.from.copy(b.pos); b.land.set(b.pos.x + (b.pos.x - c.x + (Math.random() - 0.5)) * 12 + (Math.random() - 0.5) * 20, 10 + Math.random() * 4, b.pos.z + (b.pos.z - c.z) * 12 - 25); }
    this.caw(c, 3);
    const g = this.game, near = Math.hypot(g.player.pos.x - c.x, g.player.pos.z - c.z) < 24;
    if (reason === 'shoo') { g.ui.toast('🐦‍⬛ Shoo! The crows flew off', 1.8); g.emit('shoo', {}); }
    else if (reason === 'scarecrow') {
      if (this.guard) this.guard.shake = 1.2;
      if (near) { g.ui.float(`${SCARECROW_DESIGNS[this.guard?.data.d]?.icon || '🧍'} Shoo!`, c.x, 2.4, c.z, 'gold'); if (this.guard?.data.lvl >= 1) g.audio.play('rattle'); }
      g.state.stats.crowsScared = (g.state.stats.crowsScared || 0) + 1;
    }
  }

  // the crows got their meal: each pecked plot loses some growth (never the crop itself)
  peck() {
    const g = this.game, farm = g.farm, now = Date.now();
    let n = 0;
    for (const p of this.plots) {
      const d = farm.data(p);
      if (d.s !== 2 || !d.w || !d.c) continue;
      const grow = CROPS[d.c].grow * 1000 / farm.growMul();
      const prog = Math.min(1, farm.progress(d, now));
      d.w = now - Math.max(0, prog - CROWS.setback) * grow;
      n++;
    }
    if (!n) return;
    farm.dirty = true;
    const c = this.plots[0], st = g.state;
    g.ui.float(`🐦‍⬛ −${Math.round(CROWS.setback * 100)}% growth`, c.x, 1.6, c.z, '');
    st.stats.crowRaids = (st.stats.crowRaids || 0) + 1;
    const f = c.f.name;
    if (st.stats.crowRaids <= 2 || !st.scarecrows.length) g.ui.toast(`🐦‍⬛ Crows pecked ${n} plot${n > 1 ? 's' : ''} in ${f}. Shoo them away, or put up a 🧍 scarecrow (Shop → Land)`, 4);
    else g.ui.toast(`🐦‍⬛ Crows pecked ${n} plot${n > 1 ? 's' : ''} in ${f} — out of your scarecrows' reach`, 3);
  }

  update(dt) {
    const g = this.game, st = g.state;
    const f = st.day.t / 360;
    if (this.state === 'idle') {
      if (g.visit || st.level < CROWS.level || g.weather.raining || f > 0.86) { this.draw(); return; }
      this.t -= dt;
      if (this.t <= 0) {
        this.t = CROWS.gap[0] + Math.random() * (CROWS.gap[1] - CROWS.gap[0]);
        this.launch();
      }
      this.draw();
      return;
    }
    this.time += dt;
    const p = g.player.pos, c = this.plots[0];
    if (this.state === 'in') {
      let all = true;
      for (const b of this.flock) {
        const k = Math.min(1, Math.max(0, (this.time - b.delay) / 3.2)), e = k * k * (3 - 2 * k);
        // a protected field: they only get close before the scarecrow scares them off
        const stopAt = this.turnedAway ? 0.72 : 1;
        const kk = Math.min(e, stopAt);
        b.pos.lerpVectors(b.from, b.land, kk);
        b.pos.y += Math.sin(kk * Math.PI) * 2.5 + (this.turnedAway ? (1 - kk) * 0 + 2.2 * kk : 0);
        b.rot = Math.atan2(b.land.x - b.from.x, b.land.z - b.from.z);
        if (e < stopAt) all = false;
      }
      if (all) {
        if (this.turnedAway) this.flee('scarecrow');
        else { this.state = 'peck'; this.time = 0; }
      }
    } else if (this.state === 'peck') {
      for (const b of this.flock) {
        b.hop += dt * 6;
        b.pos.copy(b.land);
        b.pos.y = 0.1 + Math.max(0, Math.sin(b.hop * 0.7)) * 0.08;
        b.peck = Math.max(0, Math.sin(b.hop * 2.3));
        if (Math.random() < dt * 0.3) b.rot += (Math.random() - 0.5) * 2;
      }
      if (Math.random() < dt * 0.35) this.caw(c);
      // the farmer (or their tractor) walking up shoos them
      const close = this.plots.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < CROWS.shoo + (g.player.vehicle ? 1.5 : 0));
      if (close) this.flee('shoo');
      else if (this.time > CROWS.peck) { this.peck(); this.flee('fed'); }
    } else if (this.state === 'out') {
      let gone = true;
      for (const b of this.flock) {
        const k = Math.min(1, this.time / 3.5), e = k * k;
        b.pos.lerpVectors(b.from, b.land, e);
        b.rot = Math.atan2(b.land.x - b.from.x, b.land.z - b.from.z);
        if (k < 1) gone = false;
      }
      if (gone) { this.state = 'idle'; this.flock = []; }
    }
    this.draw();
  }

  draw() {
    const n = this.flock.length;
    for (let i = 0; i < n; i++) {
      const b = this.flock[i];
      const flying = this.state !== 'peck';
      b.flap += 0.016 * (flying ? 22 : 0);
      _q.setFromEuler(_e.set(flying ? -0.15 : (b.peck || 0) * 0.5, b.rot, 0));
      _m.compose(_p.copy(b.pos).setY(b.pos.y + 0.12), _q, _s.set(1, 1, 1));
      this.body.setMatrixAt(i, _m);
      // wings beat by stretching and lifting; folded along the back while pecking
      const fl = flying ? Math.sin(b.flap) : 0;
      _m.compose(_p.copy(b.pos).setY(b.pos.y + 0.16 + fl * 0.07), _q, _s.set(flying ? 0.65 + 0.35 * Math.abs(fl) : 0.42, 1, flying ? 1 : 0.6));
      this.wings.setMatrixAt(i, _m);
    }
    this.body.count = this.wings.count = n;
    this.body.instanceMatrix.needsUpdate = true;
    this.wings.instanceMatrix.needsUpdate = true;
  }
}
