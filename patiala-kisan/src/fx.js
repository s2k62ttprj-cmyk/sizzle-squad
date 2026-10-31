// Pooled particles drawn as instanced meshes: chunky bits (soil, water, leaves, sparkles),
// soft camera-facing puffs (dust, smoke, steam) and rain. Plus the yellow guide arrow and
// the ground rings used for pads.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { TEX } from './shading.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();
const _e = new THREE.Euler();

// soft round puff texture
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
})();

export class FX {
  constructor(scene, cap = 400) {
    const g = new THREE.IcosahedronGeometry(0.08, 0);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 }), cap);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, _c.set(0xffffff));
    scene.add(this.mesh);
    this.p = [];
    this.cap = cap;

    // soft billboard puffs with per-particle alpha
    const PC = 220;
    const pg = new THREE.PlaneGeometry(1, 1);
    pg.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(PC), 1));
    this.puffMesh = new THREE.InstancedMesh(pg, new THREE.ShaderMaterial({
      uniforms: { uMap: { value: puffTex } },
      vertexShader: `
        attribute float aAlpha; varying float vA; varying vec2 vUv; varying vec3 vC;
        void main() {
          vUv = uv; vA = aAlpha;
          #ifdef USE_INSTANCING_COLOR
            vC = instanceColor;
          #else
            vC = vec3(1.0);
          #endif
          vec3 c = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float s = length(instanceMatrix[0].xyz);
          vec4 mv = modelViewMatrix * vec4(c, 1.0);
          mv.xy += position.xy * s;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying float vA; varying vec2 vUv; varying vec3 vC;
        void main() { vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(vC, t.a * vA); }`,
      transparent: true, depthWrite: false,
    }), PC);
    for (let i = 0; i < PC; i++) this.puffMesh.setColorAt(i, _c.set(0xffffff));
    this.puffMesh.frustumCulled = false;
    this.puffMesh.count = 0;
    this.puffMesh.renderOrder = 3;
    scene.add(this.puffMesh);
    this.puffs = [];
    this.puffCap = PC;

    // rain streaks
    const rg = new THREE.BoxGeometry(0.02, 0.55, 0.02);
    this.rain = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ color: 0xd4ecff, transparent: true, opacity: 0.55 }), 300);
    this.rain.frustumCulled = false;
    this.rain.count = 0;
    scene.add(this.rain);
    this.drops = Array.from({ length: 300 }, () => ({ x: (Math.random() - 0.5) * 30, y: Math.random() * 14, z: (Math.random() - 0.5) * 30 }));
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
  // soft puff: grows and fades; rise > 0 floats up (smoke), rise ~0 hangs (dust)
  puff(x, y, z, { color = 0xd9c3a0, size = 0.8, grow = 1.6, life = 1.0, rise = 0.3, drift = 0.3, alpha = 0.55 } = {}) {
    if (this.puffs.length >= this.puffCap) this.puffs.shift();
    const a = Math.random() * 6.28;
    this.puffs.push({ x, y, z, vx: Math.cos(a) * drift, vz: Math.sin(a) * drift, vy: rise, size, grow, life, max: life, color, alpha });
  }
  soil(x, z) { this.emit(x, 0.2, z, { n: 7, color: 0x7a4a26, speed: 1.8, up: 2.6 }); this.puff(x, 0.25, z, { color: 0xc9a77a, size: 0.6, life: 0.7, rise: 0.15 }); }
  water(x, z) { this.emit(x, 0.6, z, { n: 10, color: 0x5cc8ff, speed: 1.2, up: 1.5, life: 0.5, size: 0.8 }); }
  leaves(x, z, color = 0x6dbb3c) { this.emit(x, 0.6, z, { n: 9, color, speed: 2.2, up: 3.2, life: 0.7 }); }
  sparkle(x, y, z, color = 0xffd43b, n = 14) { this.emit(x, y, z, { n, color, speed: 1.5, up: 2.5, life: 1.1, gravity: -0.5, size: 0.9 }); }
  smoke(x, y, z, color = 0xbdbdbd) { this.puff(x, y, z, { color, size: 0.7, grow: 2.4, life: 2.6, rise: 0.8, drift: 0.25, alpha: 0.5 }); }
  dust(x, z, k = 1) { this.puff(x + (Math.random() - 0.5) * 0.4, 0.2, z + (Math.random() - 0.5) * 0.4, { color: 0xd8c09a, size: 0.5 * k, grow: 1.8, life: 0.9, rise: 0.25, drift: 0.35, alpha: 0.45 }); }

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

    // puffs
    const al = this.puffMesh.geometry.attributes.aAlpha;
    let pn = 0;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const q = this.puffs[i];
      q.life -= dt;
      if (q.life <= 0) { this.puffs.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.vx *= 1 - dt; q.vz *= 1 - dt;
    }
    for (const q of this.puffs) {
      const f = 1 - q.life / q.max;
      const s = q.size * (1 + f * q.grow);
      _m.compose(_p.set(q.x, q.y, q.z), _q.identity(), _s.set(s, s, s));
      this.puffMesh.setMatrixAt(pn, _m);
      this.puffMesh.setColorAt(pn, _c.set(q.color));
      al.array[pn] = q.alpha * Math.min(1, f * 6) * (1 - f);
      pn++;
    }
    this.puffMesh.count = pn;
    this.puffMesh.instanceMatrix.needsUpdate = true;
    if (this.puffMesh.instanceColor) this.puffMesh.instanceColor.needsUpdate = true;
    al.needsUpdate = true;

    if (raining) {
      let i = 0;
      for (const d of this.drops) {
        d.y -= dt * 17;
        if (d.y < 0) { d.y = 12 + Math.random() * 3; d.x = (Math.random() - 0.5) * 32; d.z = (Math.random() - 0.5) * 36; }
        _m.makeTranslation(center.x + d.x, d.y, center.z + d.z - 4);
        this.rain.setMatrixAt(i++, _m);
      }
      this.rain.count = i;
      this.rain.instanceMatrix.needsUpdate = true;
    } else this.rain.count = 0;
  }
}

export function makeArrow() {
  const b = new Builder(0, { ao: 0 });
  b.rbox(0xffc61a, { z: -0.35, sx: 0.36, sy: 0.14, sz: 0.7 }, 0.05);
  b.cone(0xffc61a, { z: 0.25, rx: Math.PI / 2, sx: 0.85, sy: 0.6, sz: 0.22 }, 3);
  const m = b.mesh(undefined, false);
  m.material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x6a4800 });
  return m;
}

const ringGeo = new THREE.RingGeometry(0.82, 1, 48);
ringGeo.rotateX(-Math.PI / 2);
const fillGeo = new THREE.CircleGeometry(0.8, 48);
fillGeo.rotateX(-Math.PI / 2);
const dashGeo = (() => {
  // dashed inner ring for a lively, game-like pad
  const g = new THREE.BufferGeometry(), pos = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = a0 + Math.PI / n;
    for (const [a, b] of [[a0, a1]]) {
      const r0 = 0.6, r1 = 0.68;
      pos.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(b) * r1, 0, Math.sin(b) * r1, Math.cos(b) * r0, 0, Math.sin(b) * r0);
      pos.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1, Math.cos(b) * r1, 0, Math.sin(b) * r1);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
})();

export function makePad(color = 0xffffff, r = 1) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false }));
  const dash = new THREE.Mesh(dashGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  ring.position.y = 0.07; fill.position.y = 0.065; dash.position.y = 0.068;
  ring.renderOrder = fill.renderOrder = dash.renderOrder = 1;
  g.add(ring, fill, dash);
  g.scale.setScalar(r);
  // progress wedge for paying
  const prog = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40, 0, 0.001), new THREE.MeshBasicMaterial({ color: 0x40c057, transparent: true, opacity: 0.75, depthWrite: false }));
  prog.rotation.x = -Math.PI / 2; prog.position.y = 0.075;
  prog.renderOrder = 2;
  g.add(prog);
  g.userData = { ring, fill, prog, dash };
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

export { TEX };
