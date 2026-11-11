// Keeps the farmer visible: when a wall, roof, flyover deck or tree comes between the camera
// and them, those surfaces dissolve inside a soft circle around the farmer (shader side in
// shading.js, materials with { cut: true }), fading in and out over a moment.
//
// Whether anything is in the way is answered by a coarse height map of everything tall in the
// world (1 m cells holding the highest surface above each cell), filled once from the static
// geometry and again whenever a pen or workshop is built, then a short march from the farmer
// towards the camera.
import * as THREE from 'three';
import { SH } from './shading.js';

const CELL = 1, HALF = 110, N = (HALF * 2) / CELL;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3();

export class SeeThrough {
  constructor(game) {
    this.game = game;
    this.h = new Float32Array(N * N);
    this.dh = new Float32Array(N * N);        // movable things (decorations), redone whenever they change
    this.amount = 0;
  }

  // Add a mesh (or a group of meshes) to the height map: every triangle raises the cells under it
  add(obj) {
    obj.updateMatrixWorld(true);
    obj.traverse((m) => {
      if (!m.isMesh || !m.geometry?.attributes.position) return;
      const p = m.geometry.attributes.position, idx = m.geometry.index, mw = m.matrixWorld;
      const tri = idx ? idx.count / 3 : p.count / 3;
      const v = (i, out) => out.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(mw);
      for (let i = 0; i < tri; i++) {
        v(i * 3, _a); v(i * 3 + 1, _b); v(i * 3 + 2, _c);
        const top = Math.max(_a.y, _b.y, _c.y);
        if (top < 1.2) continue;                         // low things never hide a standing farmer
        const x0 = cell(Math.min(_a.x, _b.x, _c.x)), x1 = cell(Math.max(_a.x, _b.x, _c.x));
        const z0 = cell(Math.min(_a.z, _b.z, _c.z)), z1 = cell(Math.max(_a.z, _b.z, _c.z));
        if ((x1 - x0 + 1) * (z1 - z0 + 1) > 400) continue;   // skip huge spans (hills, far scenery)
        for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
          const k = z * N + x;
          if (top > this.h[k]) this.h[k] = top;
        }
      }
    });
  }
  // a raised slab such as the flyover deck, given as a box
  addBox(x0, z0, x1, z1, top) {
    for (let z = cell(z0); z <= cell(z1); z++) for (let x = cell(x0); x <= cell(x1); x++) { const k = z * N + x; if (top > this.h[k]) this.h[k] = top; }
  }
  // boxes [x0, z0, x1, z1, top] for trees and statues that can be placed, moved and taken down
  setDynamic(list) {
    this.dh.fill(0);
    for (const [x0, z0, x1, z1, top] of list) for (let z = cell(z0); z <= cell(z1); z++) for (let x = cell(x0); x <= cell(x1); x++) { const k = z * N + x; if (top > this.dh[k]) this.dh[k] = top; }
  }
  height(x, z) { const k = cell(z) * N + cell(x); return Math.max(this.h[k], this.dh[k]); }

  // Is something between the camera and this point? March towards the camera.
  blocked(p, y, cam) {
    _t.set(p.x, y, p.z);
    _d.subVectors(cam, _t);
    const len = _d.length();
    _d.divideScalar(len);
    for (let s = 0.6; s < Math.min(len, 30); s += 0.45) {
      const x = _t.x + _d.x * s, yy = _t.y + _d.y * s, z = _t.z + _d.z * s;
      if (this.height(x, z) > yy + 0.05) return true;
    }
    return false;
  }

  update(dt) {
    const g = this.game, p = g.player.pos, cam = g.camera.position;
    const v = g.player.vehicle;
    const chest = v ? (v.kind === 'combine' ? 3.0 : v.kind === 'tractor' ? 2.0 : 1.5) : 1.2;
    const want = this.blocked(p, chest, cam) || this.blocked(p, chest + 0.7, cam) ? 1 : 0;
    this.amount += (want - this.amount) * Math.min(1, dt * (want ? 5 : 2.5));
    SH.uCut.value = this.amount < 0.01 ? 0 : this.amount;
    SH.uCutT.value.set(p.x, chest, p.z);
    SH.uCutR.value = v ? (v.kind === 'combine' ? 4.2 : v.kind === 'tractor' ? 3.2 : 2.4) : 2.2;
  }
}
const cell = (v) => Math.max(0, Math.min(N - 1, Math.floor((v + HALF) / CELL)));
