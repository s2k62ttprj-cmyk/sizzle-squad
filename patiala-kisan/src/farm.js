// Fields and plots: the till → plant → water → grow → harvest loop, crop growth over
// real time (so crops keep growing while the game is closed) and instanced rendering.
import * as THREE from 'three';
import { Builder, textTexture } from './geo.js';
import { FIELDS, CROPS, PLOT } from './config.js';
import { cropGeometries, swayMaterial } from './crops.js';
import { props } from './models.js';
import { enhance, TEX } from './shading.js';

const SOIL = {
  untilled: new THREE.Color(0xa88552), tilled: new THREE.Color(0x8d5c34), wet: new THREE.Color(0x5e3b20),
  ridge: new THREE.Color(0x9a6640), wetRidge: new THREE.Color(0x684327),
};
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
    // a raised soil bed per plot with bevelled edges, textured with clods
    const sb = new Builder(0, { ao: 0.25, aoH: 0.14 });
    sb.rbox(0xffffff, { y: 0.07, sx: PLOT - 0.16, sy: 0.14, sz: PLOT - 0.16, g: 0.12 }, 0.06);
    const soilMat = enhance(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), { wmap: TEX.soil, wscale: 0.55, wmul: 1.2, detail: 0, rim: 0 });
    this.soil = new THREE.InstancedMesh(sb.build(), soilMat, N);
    this.soil.receiveShadow = true;
    // furrow ridges (rounded mounds) running along each plot
    const fb = new Builder(0.04, { ao: 0.35, aoH: 0.22 });
    for (let k = 0; k < 4; k++) fb.cyl(0xffffff, { x: -0.6 + k * 0.4, y: 0.145, rx: Math.PI / 2, sx: 1.6, sy: PLOT - 0.45, sz: 0.75, g: 0.3 }, 0.07, 0.07, 6);
    this.furrow = new THREE.InstancedMesh(fb.build(), soilMat, N);
    this.furrow.receiveShadow = true;
    for (let i = 0; i < N; i++) {
      this.soil.setColorAt(i, SOIL.untilled);
      this.furrow.setColorAt(i, SOIL.untilled);
    }
    this.soil.frustumCulled = this.furrow.frustumCulled = false;
    scene.add(this.soil, this.furrow);

    const mat = swayMaterial();
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

    // per-field bed with grassy bunds (owned) and wild scrub with a sale board (for sale)
    this.fieldMeshes = {};
    const R = (k) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (const f of FIELDS) {
      const w = f.cols * PLOT, d = f.rows * PLOT, cx = f.x0 + w / 2, cz = f.z0 + d / 2;
      const ob = new Builder(0.04, { ao: 0.2, aoH: 0.3 });
      ob.rbox(0x8f6239, { x: cx, y: 0.02, z: cz, sx: w + 0.5, sy: 0.05, sz: d + 0.5 }, 0.02);
      const bund = (x, z, sx, sz) => ob.capsule(0x7cbd47, { x, y: 0.06, z, rz: sx > sz ? Math.PI / 2 : 0, rx: sx > sz ? 0 : Math.PI / 2, sx: sx > sz ? 0.85 : 1.25, sy: (Math.max(sx, sz)) / 0.5, sz: sx > sz ? 1.25 : 0.85, g: 0.25 }, 0.2, 0.1, 8);
      bund(cx, f.z0 - 0.35, w + 0.9, 0.4); bund(cx, f.z0 + d + 0.35, w + 0.9, 0.4);
      bund(f.x0 - 0.35, cz, 0.4, d + 0.9); bund(f.x0 + w + 0.35, cz, 0.4, d + 0.9);
      // grass tufts along the bunds
      for (let k = 0; k < (w + d) * 2.2; k++) {
        const t = R(k + f.x0) * 4, side = Math.floor(t), u = t - side;
        const x = side < 2 ? f.x0 - 0.3 + u * (w + 0.6) : side === 2 ? f.x0 - 0.38 : f.x0 + w + 0.38;
        const z = side === 0 ? f.z0 - 0.38 : side === 1 ? f.z0 + d + 0.38 : f.z0 - 0.3 + u * (d + 0.6);
        for (let b = 0; b < 3; b++) ob.cone(b % 2 ? 0x5fae35 : 0x86cc4a, { x: x + (b - 1) * 0.06, y: 0.3, z: z + (b % 2) * 0.05, sx: 0.07, sy: 0.4, sz: 0.07, rz: (b - 1) * 0.3, ao: false }, 3);
      }
      const owned = ob.mesh(undefined, false);
      owned.receiveShadow = true;
      const wb = new Builder(0.1, { ao: 0.25, aoH: 0.5 });
      for (let k = 0; k < f.cols * f.rows * 1.5; k++) {
        const x = f.x0 + 0.4 + R(k * 3 + f.z0) * (w - 0.8), z = f.z0 + 0.4 + R(k * 7 + f.x0) * (d - 0.8);
        if (k % 6 === 0) props.bush(wb, x, z, 0.55 + R(k) * 0.3, [0x5c9a3a, 0x6aa43e, 0x4f8f33][k % 3]);
        else if (k % 11 === 1) wb.sph([0xffd43b, 0xffffff, 0xf783ac][k % 3], { x, y: 0.42, z, s: 0.12, ao: false }, 5, 4);
        else for (let t = 0; t < 5; t++) wb.cone([0x6faa3e, 0x8ac24f, 0x9cc85a, 0x5f9e35][t % 4], { x: x + (t - 2) * 0.08, y: 0.32, z: z + (t % 2) * 0.08, sx: 0.09, sy: 0.55 + (t % 3) * 0.12, sz: 0.09, rz: (t - 2) * 0.22 }, 3);
      }
      // corner pegs with a string, and a painted "for sale" board
      for (const [px, pz] of [[f.x0, f.z0], [f.x0 + w, f.z0], [f.x0, f.z0 + d], [f.x0 + w, f.z0 + d]]) {
        wb.rbox(0xd9d2c3, { x: px, y: 0.45, z: pz, sx: 0.1, sy: 0.9, sz: 0.1 }, 0.03);
        wb.box(0xe03131, { x: px + 0.15, y: 0.8, z: pz, sx: 0.28, sy: 0.18, sz: 0.02, ao: false });
      }
      const bx = f.x0 + w - 1.2, bz = f.z0 + d + 0.6;
      wb.cyl(0x7a4a24, { x: bx - 0.55, y: 0.7, z: bz, sy: 1.4 }, 0.05, 0.05, 6);
      wb.cyl(0x7a4a24, { x: bx + 0.55, y: 0.7, z: bz, sy: 1.4 }, 0.05, 0.05, 6);
      const wild = wb.mesh();
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਵਿਕਾਊ', size: 46 }, { text: 'FOR SALE', size: 40 }], { w: 256, h: 128, bg: '#c92a2a' }) }));
      sign.position.set(bx, 1.15, bz + 0.06);
      wild.add(sign);
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

  update(dt) {
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
    let n = 0, ns = 0, nf = 0;
    for (const p of this.list) {
      const owned = this.owned(p.fid);
      const d = this.data(p);
      if (!owned) { p.vk = null; continue; }
      // only owned plots are drawn; ridges only once tilled
      _p.set(p.x, 0, p.z);
      _m.compose(_p, _q.identity(), _s.set(1, 1, 1));
      const col = d.s === 0 ? SOIL.untilled : d.w ? SOIL.wet : SOIL.tilled;
      this.soil.setMatrixAt(ns, _m);
      this.soil.setColorAt(ns++, col);
      if (d.s > 0) { this.furrow.setMatrixAt(nf, _m); this.furrow.setColorAt(nf++, d.w ? SOIL.wetRidge : SOIL.ridge); }
      const vk = this.visualKey(d, now);
      p.vk = vk;
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
    this.soil.count = ns;
    this.furrow.count = nf;
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
