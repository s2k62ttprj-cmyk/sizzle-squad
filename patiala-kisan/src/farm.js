// Fields and plots: the till → plant → water → grow → harvest loop, crop growth over
// real time (so crops keep growing while the game is closed) and instanced rendering.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { FIELDS, CROPS, PLOT } from './config.js';
import { cropGeometries, swayMaterial } from './crops.js';
import { props } from './models.js';

const SOIL = { untilled: new THREE.Color(0xb08a55), tilled: new THREE.Color(0x8a5a32), wet: new THREE.Color(0x5e3b20) };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export class Farm {
  constructor(game) {
    this.game = game;
    this.list = [];                       // every plot: {fid, f, i, x, z}
    this.byField = {};
    for (const f of FIELDS) {
      this.byField[f.id] = [];
      for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++) {
        const p = { fid: f.id, f, i: r * f.cols + c, x: f.x0 + (c + 0.5) * PLOT, z: f.z0 + (r + 0.5) * PLOT, g: this.list.length };
        this.list.push(p);
        this.byField[f.id].push(p);
      }
    }
    this.dirty = true;
    this.stageTimer = 0;
    this.buildMeshes();
  }

  data(p) { return this.game.state.plots[p.fid][p.i]; }
  owned(fid) { return this.game.state.fields[fid].owned; }

  growMul() { return this.game.perks.grow; }

  // 0 untilled, 1 tilled, 2 planted (dry seed), 3 growing, 4 ripe
  stage(p, now = Date.now()) {
    const d = this.data(p);
    if (d.s < 2) return d.s;
    if (!d.w) return 2;
    return this.progress(d, now) >= 1 ? 4 : 3;
  }
  progress(d, now = Date.now()) {
    if (!d.w || !d.c) return 0;
    return (now - d.w) / (CROPS[d.c].grow * 1000 / this.growMul());
  }

  // ---------- actions (return true if something happened)
  till(p) {
    const d = this.data(p);
    if (d.s !== 0) return false;
    d.s = 1; d.c = null; d.w = 0;
    this.changed(p, 'till');
    return true;
  }
  plant(p, crop) {
    const d = this.data(p), st = this.game.state;
    if (d.s !== 1 || !(st.seeds[crop] > 0)) return false;
    st.seeds[crop]--;
    if (!st.seeds[crop]) delete st.seeds[crop];
    d.s = 2; d.c = crop; d.w = this.game.weather.raining ? Date.now() : 0;
    this.changed(p, 'plant');
    return true;
  }
  water(p) {
    const d = this.data(p);
    if (d.s !== 2 || d.w) return false;
    d.w = Date.now();
    this.changed(p, 'water');
    return true;
  }
  // Returns the number of items produced (0 if not ripe). Caller stores them.
  harvest(p) {
    const d = this.data(p);
    if (this.stage(p) !== 4) return 0;
    const c = CROPS[d.c];
    let n = c.yield;
    if (Math.random() < this.game.perks.luck) n *= 2;
    const crop = d.c;
    d.s = 0; d.c = null; d.w = 0;
    this.changed(p, 'harvest');
    this.lastHarvest = { crop, n, double: n > c.yield };
    return n;
  }

  changed(p, kind) {
    this.dirty = true;
    this.game.emit(kind, { p });
  }

  // What would a worker do on this plot? (used by player, tractor and Seeri)
  nextAction(p) {
    const st = this.stage(p);
    return st === 0 ? 'till' : st === 1 ? 'plant' : st === 2 ? 'water' : st === 4 ? 'harvest' : null;
  }

  // Owned plots whose centre lies within r of (x, z)
  near(x, z, r, out = []) {
    out.length = 0;
    for (const f of FIELDS) {
      if (!this.owned(f.id)) continue;
      if (x < f.x0 - r || x > f.x0 + f.cols * PLOT + r || z < f.z0 - r || z > f.z0 + f.rows * PLOT + r) continue;
      for (const p of this.byField[f.id]) if (Math.hypot(p.x - x, p.z - z) <= r) out.push(p);
    }
    return out;
  }

  fieldAt(x, z, pad = 0) {
    for (const f of FIELDS) if (x >= f.x0 - pad && x <= f.x0 + f.cols * PLOT + pad && z >= f.z0 - pad && z <= f.z0 + f.rows * PLOT + pad) return f;
    return null;
  }

  rainAll() {
    let n = 0;
    for (const p of this.list) {
      if (!this.owned(p.fid)) continue;
      const d = this.data(p);
      if (d.s === 2 && !d.w) { d.w = Date.now(); n++; }
    }
    if (n) this.dirty = true;
  }

  counts(fid) {
    const out = [0, 0, 0, 0, 0];
    for (const p of this.byField[fid]) out[this.stage(p)]++;
    return out;
  }

  // ---------- rendering
  buildMeshes() {
    const { scene } = this.game;
    const N = this.list.length;
    const soilGeo = new THREE.BoxGeometry(PLOT - 0.18, 0.14, PLOT - 0.18);
    soilGeo.translate(0, 0.07, 0);
    this.soil = new THREE.InstancedMesh(soilGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    this.soil.receiveShadow = true;
    const fb = new Builder(0.06);
    for (let k = 0; k < 4; k++) fb.box(0x7a4a26, { x: -0.6 + k * 0.4, y: 0.16, sx: 0.16, sy: 0.08, sz: PLOT - 0.4 });
    this.furrow = new THREE.InstancedMesh(fb.build(), new THREE.MeshLambertMaterial({ vertexColors: true }), N);
    this.furrow.receiveShadow = true;
    for (let i = 0; i < N; i++) {
      this.soil.setColorAt(i, SOIL.untilled);
      this.furrow.setColorAt(i, SOIL.untilled);
    }
    scene.add(this.soil, this.furrow);

    this.uniforms = { uTime: { value: 0 } };
    const mat = swayMaterial(this.uniforms);
    this.cropMeshes = {};
    const geos = cropGeometries();
    for (const key in geos) {
      const m = new THREE.InstancedMesh(geos[key], mat, N);
      m.count = 0;
      m.castShadow = false;
      m.receiveShadow = true;
      m.frustumCulled = false;
      scene.add(m);
      this.cropMeshes[key] = m;
    }

    // per-field bed (owned) and wild grass (for sale)
    this.fieldMeshes = {};
    for (const f of FIELDS) {
      const w = f.cols * PLOT, d = f.rows * PLOT, cx = f.x0 + w / 2, cz = f.z0 + d / 2;
      const ob = new Builder(0.05);
      ob.box(0x9c6a3c, { x: cx, y: 0.03, z: cz, sx: w + 0.5, sy: 0.06, sz: d + 0.5 });
      ob.box(0x7fbf4a, { x: cx, y: 0.14, z: f.z0 - 0.3, sx: w + 0.8, sy: 0.28, sz: 0.35 });
      ob.box(0x7fbf4a, { x: cx, y: 0.14, z: f.z0 + d + 0.3, sx: w + 0.8, sy: 0.28, sz: 0.35 });
      ob.box(0x7fbf4a, { x: f.x0 - 0.3, y: 0.14, z: cz, sx: 0.35, sy: 0.28, sz: d + 0.8 });
      ob.box(0x7fbf4a, { x: f.x0 + w + 0.3, y: 0.14, z: cz, sx: 0.35, sy: 0.28, sz: d + 0.8 });
      const owned = ob.mesh(undefined, false);
      const wb = new Builder(0.12);
      wb.box(0x86b84a, { x: cx, y: 0.02, z: cz, sx: w, sy: 0.04, sz: d });
      for (let k = 0; k < f.cols * f.rows * 1.6; k++) {
        const x = f.x0 + 0.4 + ((k * 0.618) % 1) * (w - 0.8), z = f.z0 + 0.4 + ((k * 0.377 + k * k * 0.013) % 1) * (d - 0.8);
        if (k % 5 === 0) props.bush(wb, x, z, 0.6, 0x5c9a3a);
        else for (let t = 0; t < 4; t++) wb.cone(t % 2 ? 0x6faa3e : 0x8ac24f, { x: x + t * 0.12, y: 0.3, z: z + (t % 2) * 0.1, sx: 0.12, sy: 0.6, sz: 0.12, rz: (t - 1.5) * 0.25 }, 4);
      }
      for (let k = 0; k <= f.cols; k++) {
        wb.box(0xd9d2c3, { x: f.x0 + k * PLOT, y: 0.4, z: f.z0 + d, sx: 0.1, sy: 0.8, sz: 0.1 });
      }
      const wild = wb.mesh();
      this.game.scene.add(owned, wild);
      this.fieldMeshes[f.id] = { owned, wild };
    }
    this.refreshFields();
  }

  refreshFields() {
    for (const f of FIELDS) {
      const o = this.owned(f.id);
      this.fieldMeshes[f.id].owned.visible = o;
      this.fieldMeshes[f.id].wild.visible = !o;
    }
    this.dirty = true;
  }

  update(dt, t) {
    this.uniforms.uTime.value = t;
    this.stageTimer -= dt;
    if (this.stageTimer <= 0) {
      this.stageTimer = 0.5;
      // detect growth stage changes without marking everything dirty every frame
      const now = Date.now();
      for (const p of this.list) {
        const d = this.data(p);
        if (d.s === 2 && d.w) {
          const k = this.visualKey(d, now);
          if (k !== p.vk) { this.dirty = true; break; }
        }
      }
    }
    if (this.dirty) this.redraw();
  }

  visualKey(d, now) {
    if (d.s < 2) return d.s;
    if (!d.w) return 'seed';
    const pr = this.progress(d, now);
    return pr >= 1 ? 'ripe' : pr < 0.2 ? 'seed' : pr < 0.45 ? 'sprout' : pr < 0.75 ? 'g1' : 'g2';
  }

  redraw() {
    this.dirty = false;
    const now = Date.now();
    for (const k in this.cropMeshes) this.cropMeshes[k].count = 0;
    let n = 0;
    for (const p of this.list) {
      const owned = this.owned(p.fid);
      const d = this.data(p);
      _p.set(p.x, owned ? 0 : -5, p.z);
      _m.compose(_p, _q.identity(), _s.set(1, 1, 1));
      this.soil.setMatrixAt(p.g, _m);
      this.furrow.setMatrixAt(p.g, _m);
      if (!owned) { p.vk = null; continue; }
      const vk = this.visualKey(d, now);
      p.vk = vk;
      const col = d.s === 0 ? SOIL.untilled : d.w ? SOIL.wet : SOIL.tilled;
      this.soil.setColorAt(p.g, col);
      this.furrow.setColorAt(p.g, d.s === 0 ? _c.set(0xb89262) : d.w ? _c.set(0x6a4a30) : _c.set(0xffffff));
      if (d.s < 2) continue;
      let key, sy = 1, sxz = 1;
      if (vk === 'seed') key = 'seed';
      else if (vk === 'sprout') key = 'sprout';
      else if (vk === 'ripe') key = d.c + ':ripe';
      else { key = d.c + ':grow'; sy = vk === 'g1' ? 0.5 : 0.82; sxz = vk === 'g1' ? 0.75 : 0.92; }
      const mesh = this.cropMeshes[key];
      const r = (p.g * 0.7) % 1;
      _q.setFromAxisAngle(_up, Math.floor(r * 4) * Math.PI / 2);
      _m.compose(_p.set(p.x, 0.14, p.z), _q, _s.set(sxz, sy, sxz));
      mesh.setMatrixAt(mesh.count++, _m);
      n++;
    }
    this.soil.instanceMatrix.needsUpdate = true;
    this.furrow.instanceMatrix.needsUpdate = true;
    this.soil.instanceColor.needsUpdate = true;
    this.furrow.instanceColor.needsUpdate = true;
    for (const k in this.cropMeshes) {
      const m = this.cropMeshes[k];
      m.visible = m.count > 0;
      m.instanceMatrix.needsUpdate = true;
    }
  }

  setShadows(on) {
    for (const k in this.cropMeshes) this.cropMeshes[k].castShadow = on;
  }
}
const _up = new THREE.Vector3(0, 1, 0);
