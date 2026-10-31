// Pooled particles (soil, water, leaves, sparkles, rain) drawn as one instanced mesh,
// plus the yellow guide arrow and the ground rings used for pads.
import * as THREE from 'three';
import { Builder } from './geo.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const _e = new THREE.Euler();

export class FX {
  constructor(scene, cap = 400) {
    const g = new THREE.OctahedronGeometry(0.08, 0);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 }), cap);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, _c.set(0xffffff));
    scene.add(this.mesh);
    this.p = [];
    this.cap = cap;
    // rain streaks
    const rg = new THREE.BoxGeometry(0.02, 0.5, 0.02);
    this.rain = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ color: 0xc8e6ff, transparent: true, opacity: 0.6 }), 260);
    this.rain.frustumCulled = false;
    this.rain.count = 0;
    scene.add(this.rain);
    this.drops = Array.from({ length: 260 }, () => ({ x: (Math.random() - 0.5) * 30, y: Math.random() * 14, z: (Math.random() - 0.5) * 30 }));
  }

  emit(x, y, z, { n = 8, color = 0x8a5a32, speed = 2.5, up = 3, life = 0.6, size = 1, gravity = 9, spread = 0.3 } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.p.length >= this.cap) this.p.shift();
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.p.push({
        x: x + (Math.random() - 0.5) * spread, y, z: z + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * s, vy: up * (0.6 + Math.random() * 0.6), vz: Math.sin(a) * s,
        life, max: life, color, size: size * (0.6 + Math.random() * 0.8), g: gravity, rot: Math.random() * 6,
      });
    }
  }
  soil(x, z) { this.emit(x, 0.2, z, { n: 7, color: 0x7a4a26, speed: 1.8, up: 2.6 }); }
  water(x, z) { this.emit(x, 0.6, z, { n: 10, color: 0x5cc8ff, speed: 1.2, up: 1.5, life: 0.5, size: 0.8 }); }
  leaves(x, z, color = 0x6dbb3c) { this.emit(x, 0.6, z, { n: 9, color, speed: 2.2, up: 3.2, life: 0.7 }); }
  sparkle(x, y, z, color = 0xffd43b, n = 14) { this.emit(x, y, z, { n, color, speed: 1.5, up: 2.5, life: 1.1, gravity: -0.5, size: 0.9 }); }
  smoke(x, y, z) { this.emit(x, y, z, { n: 1, color: 0xbfbfbf, speed: 0.2, up: 0.9, life: 2.2, gravity: -0.2, size: 3 }); }

  update(dt, center, raining) {
    let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.life -= dt;
      if (q.life <= 0) { this.p.splice(i, 1); continue; }
      q.vy -= q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.05 && q.g > 0) { q.y = 0.05; q.vx *= 0.6; q.vz *= 0.6; q.vy *= -0.3; }
      q.rot += dt * 5;
    }
    for (const q of this.p) {
      const k = q.size * Math.min(1, q.life / q.max * 2);
      _q.setFromEuler(_e.set(q.rot, q.rot * 0.7, 0));
      _m.compose(_p.set(q.x, q.y, q.z), _q, _s.set(k, k, k));
      this.mesh.setMatrixAt(n, _m);
      this.mesh.setColorAt(n, _c.set(q.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    if (raining) {
      let i = 0;
      for (const d of this.drops) {
        d.y -= dt * 16;
        if (d.y < 0) { d.y = 12 + Math.random() * 3; d.x = (Math.random() - 0.5) * 30; d.z = (Math.random() - 0.5) * 34; }
        _m.makeTranslation(center.x + d.x, d.y, center.z + d.z);
        this.rain.setMatrixAt(i++, _m);
      }
      this.rain.count = i;
      this.rain.instanceMatrix.needsUpdate = true;
    } else this.rain.count = 0;
  }
}

export function makeArrow() {
  const b = new Builder(0);
  b.box(0xffc61a, { z: -0.35, sx: 0.36, sy: 0.12, sz: 0.7 });
  b.cone(0xffc61a, { z: 0.25, rx: Math.PI / 2, sx: 0.85, sy: 0.6, sz: 0.2 }, 3);
  const m = b.mesh(undefined, false);
  m.material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x4a3200 });
  return m;
}

const ringGeo = new THREE.RingGeometry(0.82, 1, 40);
ringGeo.rotateX(-Math.PI / 2);
const fillGeo = new THREE.CircleGeometry(0.8, 40);
fillGeo.rotateX(-Math.PI / 2);

export function makePad(color = 0xffffff, r = 1) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }));
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 }));
  ring.position.y = 0.06; fill.position.y = 0.055;
  g.add(ring, fill);
  g.scale.setScalar(r);
  // progress wedge for paying
  const prog = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40, 0, 0.001), new THREE.MeshBasicMaterial({ color: 0x40c057, transparent: true, opacity: 0.7 }));
  prog.rotation.x = -Math.PI / 2; prog.position.y = 0.07;
  g.add(prog);
  g.userData = { ring, fill, prog };
  return g;
}

export function setPadProgress(pad, f) {
  const prog = pad.userData.prog;
  const k = Math.max(0.001, Math.min(1, f)) * Math.PI * 2;
  if (Math.abs((prog.userData.k || 0) - k) < 0.01) return;
  prog.geometry.dispose();
  prog.geometry = new THREE.CircleGeometry(0.8, 40, Math.PI / 2, k);
  prog.userData.k = k;
}
