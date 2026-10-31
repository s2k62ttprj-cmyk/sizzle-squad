// Visible stacks of goods (on the farmer's back, in trolleys, on shelves) and items flying
// between places. Two instanced meshes per stack: wooden crate + produce tinted per item.
import * as THREE from 'three';
import { crateGeometries } from './models.js';
import { Builder } from './geo.js';
import { ITEMS } from './config.js';
import { enhance } from './shading.js';

let GEO = null;
const crateMat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { detail: 0.25, clouds: false });
const topMat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { detail: 0.1, clouds: false });
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const colorCache = {};
export const itemColor = (id) => colorCache[id] || (colorCache[id] = new THREE.Color(ITEMS[id]?.color ?? 0xffffff));

export function noteGeometry() {
  const b = new Builder(0.04);
  b.box(0xa98fd6, { y: 0.07, sx: 0.5, sy: 0.14, sz: 0.24 });
  b.box(0xffffff, { y: 0.07, sx: 0.08, sy: 0.15, sz: 0.25 });
  b.box(0x8b6fc0, { y: 0.145, sx: 0.48, sy: 0.01, sz: 0.22 });
  return b.build();
}

export class StackView {
  // layout: 'tower' grows upward in `cols` columns; 'grid' fills gx × gz layers
  constructor(parent, { cap = 40, layout = 'tower', cols = 1, gx = 3, gz = 3, dx = 0.5, dz = 0.4, dy = 0.21, geo = null, castShadow = true } = {}) {
    if (!GEO) GEO = crateGeometries();
    this.cap = cap; this.layout = layout; this.cols = cols; this.gx = gx; this.gz = gz; this.dx = dx; this.dz = dz; this.dy = dy;
    this.custom = !!geo;
    this.crate = new THREE.InstancedMesh(geo || GEO.crate, crateMat, cap);
    this.crate.count = 0;
    this.crate.castShadow = castShadow;
    this.crate.frustumCulled = false;
    parent.add(this.crate);
    if (!geo) {
      this.top = new THREE.InstancedMesh(GEO.top, topMat, cap);
      this.top.count = 0;
      this.top.castShadow = castShadow;
      this.top.frustumCulled = false;
      for (let i = 0; i < cap; i++) this.top.setColorAt(i, _c.set(0xffffff));
      parent.add(this.top);
    }
    this.items = [];
    this.pop = 0;
    this.sway = 0;
  }

  slot(i, out) {
    if (this.layout === 'tower') {
      const col = i % this.cols, lvl = Math.floor(i / this.cols);
      return out.set((col - (this.cols - 1) / 2) * this.dx, lvl * this.dy, 0);
    }
    const per = this.gx * this.gz, layer = Math.floor(i / per), k = i % per;
    return out.set(((k % this.gx) - (this.gx - 1) / 2) * this.dx, layer * this.dy, (Math.floor(k / this.gx) - (this.gz - 1) / 2) * this.dz);
  }

  // items: array of item ids (or a count for custom geometry stacks)
  set(items) {
    const list = Array.isArray(items) ? items : null;
    const n = Math.min(this.cap, list ? list.length : items);
    if (n > this.crate.count) this.pop = 0;
    this.items = list;
    this.n = n;
    this.redraw();
  }

  redraw() {
    const n = this.n || 0;
    for (let i = 0; i < n; i++) {
      this.slot(i, _p);
      let sc = 1;
      if (i === n - 1 && this.pop < 1) sc = 0.3 + 0.7 * this.pop + Math.sin(this.pop * Math.PI) * 0.25;
      if (this.layout === 'tower') {
        const lvl = _p.y / this.dy;
        _p.x += Math.sin(this.sway + lvl * 0.4) * 0.012 * lvl;
      }
      _q.setFromAxisAngle(_Y, ((i * 37) % 7 - 3) * 0.03);
      _m.compose(_p, _q, _s.set(sc, sc, sc));
      this.crate.setMatrixAt(i, _m);
      if (this.top) {
        this.top.setMatrixAt(i, _m);
        if (this.items) this.top.setColorAt(i, itemColor(this.items[i]));
      }
    }
    this.crate.count = n;
    this.crate.instanceMatrix.needsUpdate = true;
    if (this.top) {
      this.top.count = n;
      this.top.instanceMatrix.needsUpdate = true;
      if (this.top.instanceColor) this.top.instanceColor.needsUpdate = true;
    }
  }

  update(dt, swaySpeed = 0) {
    let redraw = false;
    if (this.pop < 1 && this.n) { this.pop = Math.min(1, this.pop + dt * 6); redraw = true; }
    if (swaySpeed > 0 && this.layout === 'tower' && this.n > 2) { this.sway += dt * swaySpeed; redraw = true; }
    if (redraw) this.redraw();
  }

  setVisible(v) { this.crate.visible = v; if (this.top) this.top.visible = v; }
}
const _Y = new THREE.Vector3(0, 1, 0);

// Items that arc from one point to another (harvest → back, back → stall, pile → player)
export class Flyers {
  constructor(scene, cap = 40) {
    if (!GEO) GEO = crateGeometries();
    this.crate = new THREE.InstancedMesh(GEO.crate, crateMat, cap);
    this.top = new THREE.InstancedMesh(GEO.top, topMat, cap);
    this.note = new THREE.InstancedMesh(noteGeometry(), crateMat, cap);
    for (const m of [this.crate, this.top, this.note]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
    for (let i = 0; i < cap; i++) this.top.setColorAt(i, _c.set(0xffffff));
    this.list = [];
    this.cap = cap;
  }
  // to: Vector3 or function returning a Vector3 (moving targets)
  add(id, from, to, dur = 0.35, onDone = null, height = 1.2) {
    if (this.list.length >= this.cap) { onDone && onDone(); return; }
    this.list.push({ id, from: from.clone(), to, t: 0, dur, onDone, height });
  }
  update(dt) {
    let ci = 0, ni = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt / f.dur;
      if (f.t >= 1) { this.list.splice(i, 1); f.onDone && f.onDone(); }
    }
    for (const f of this.list) {
      const to = typeof f.to === 'function' ? f.to() : f.to;
      const t = f.t, h = Math.sin(t * Math.PI) * f.height;
      _p.lerpVectors(f.from, to, t); _p.y += h;
      _q.setFromAxisAngle(_Y, t * 6);
      const s = 1 - t * 0.25;
      _m.compose(_p, _q, _s.set(s, s, s));
      if (f.id === 'cash') this.note.setMatrixAt(ni++, _m);
      else {
        this.crate.setMatrixAt(ci, _m); this.top.setMatrixAt(ci, _m); this.top.setColorAt(ci, itemColor(f.id)); ci++;
      }
    }
    this.crate.count = this.top.count = ci;
    this.note.count = ni;
    this.crate.instanceMatrix.needsUpdate = this.top.instanceMatrix.needsUpdate = this.note.instanceMatrix.needsUpdate = true;
    if (this.top.instanceColor) this.top.instanceColor.needsUpdate = true;
  }
}
