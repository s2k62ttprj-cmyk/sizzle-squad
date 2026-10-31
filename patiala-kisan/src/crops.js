// Procedural crop geometry. Each crop has a green "grow" model and a "ripe" model;
// one merged geometry covers a whole 2 m plot so a field renders with instancing.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { CROPS } from './config.js';

const spots = (n) => {
  const out = [], step = 1.6 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([-0.8 + step * (i + 0.5), -0.8 + step * (j + 0.5)]);
  return out;
};
const rnd = (seed) => { const x = Math.sin(seed * 91.17) * 43758.5453; return x - Math.floor(x); };

function blades(b, x, z, h, color, n = 7, lean = 0.35, w = 0.05) {
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + x * 3, l = lean * (0.5 + rnd(k + x * 7 + z) * 0.6);
    b.box(color, { x: x + Math.cos(a) * 0.05, y: h / 2, z: z + Math.sin(a) * 0.05, sx: w, sy: h * (0.8 + rnd(k + z) * 0.3), sz: w * 0.4, rx: Math.sin(a) * l, rz: -Math.cos(a) * l, ry: a });
  }
}

function plant(b, shape, c, ripe) {
  const leaf = c.leaf, fruit = c.ripe;
  switch (shape) {
    case 'grain': {
      const h = c.paddy ? 0.75 : 0.9;
      for (const [x, z] of spots(3)) {
        blades(b, x, z, h, ripe ? (c.paddy ? 0xc9b25a : 0xdcb04c) : leaf, 7, 0.32, 0.05);
        if (ripe) for (let k = 0; k < 4; k++) {
          const a = k * 1.57 + x;
          b.sph(fruit, { x: x + Math.cos(a) * 0.13, y: h * 0.95, z: z + Math.sin(a) * 0.13, sx: 0.07, sy: 0.24, sz: 0.07, rx: Math.sin(a) * 0.35, rz: -Math.cos(a) * 0.35 }, 5, 4);
        }
      }
      break;
    }
    case 'root':
      for (const [x, z] of spots(3)) {
        for (let k = 0; k < 4; k++) {
          const a = k * 1.57 + x * 2;
          b.cone(leaf, { x: x + Math.cos(a) * 0.08, y: 0.28, z: z + Math.sin(a) * 0.08, sx: 0.12, sy: 0.5, sz: 0.05, rx: Math.sin(a) * 0.4, rz: -Math.cos(a) * 0.4 }, 4);
        }
        if (ripe) b.cone(fruit, { x, y: 0.06, z, rx: Math.PI, sx: 0.2, sy: 0.3, sz: 0.2 }, 7);
      }
      break;
    case 'bush':
      for (const [x, z] of spots(2)) {
        const h = c.low ? 0.45 : 0.75;
        b.sph(leaf, { x, y: h * 0.55, z, sx: 0.62, sy: h, sz: 0.62 }, 8, 6);
        b.sph(0x3f8a2f, { x: x + 0.12, y: h * 0.8, z: z - 0.1, s: 0.4 }, 7, 5);
        if (ripe) {
          for (let k = 0; k < 6; k++) {
            const a = k / 6 * Math.PI * 2 + x, r = c.low ? 0.34 : 0.27, y = c.low ? 0.08 : h * (0.35 + rnd(k + x) * 0.5);
            if (c.shape === 'bush' && c.ripe === 0x2fae2a) b.cone(k % 3 === 0 ? 0xd8281c : fruit, { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r, rx: Math.PI, sx: 0.06, sy: 0.22, sz: 0.06 }, 5);
            else b.sph(fruit, { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r, sx: c.low ? 0.2 : 0.16, sy: c.low ? 0.14 : 0.16, sz: 0.16 }, 7, 5);
          }
        }
      }
      break;
    case 'tall':
      for (const [x, z] of spots(2)) {
        b.cyl(0x7fb547, { x, y: 0.85, z, sy: 1.7 }, 0.035, 0.05, 6);
        for (let k = 0; k < 6; k++) {
          const a = k * 2.1 + x, y = 0.4 + k * 0.22;
          b.box(leaf, { x: x + Math.cos(a) * 0.22, y, z: z + Math.sin(a) * 0.22, sx: 0.5, sy: 0.03, sz: 0.09, ry: -a, rz: -0.35 });
        }
        b.cone(ripe ? 0xd9b45a : 0x9bc45a, { x, y: 1.85, z, sx: 0.12, sy: 0.35, sz: 0.12 }, 5);
        if (ripe) {
          b.sph(fruit, { x: x + 0.1, y: 1.05, z: z + 0.05, sx: 0.12, sy: 0.32, sz: 0.12, rz: -0.35 }, 6, 5);
          b.cone(0x9bc45a, { x: x + 0.16, y: 1.25, z: z + 0.05, sx: 0.14, sy: 0.2, sz: 0.14, rz: -0.35 }, 5);
        }
      }
      break;
    case 'flower':
      for (const [x, z] of spots(3)) {
        blades(b, x, z, 0.75, leaf, 4, 0.2, 0.08);
        b.sph(0x5f9e35, { x, y: 0.25, z, sx: 0.35, sy: 0.25, sz: 0.35 }, 6, 4);
        if (ripe) for (let k = 0; k < 5; k++) b.sph(fruit, { x: x + Math.cos(k * 1.3) * 0.12, y: 0.78 + rnd(k + x) * 0.15, z: z + Math.sin(k * 1.3) * 0.12, s: 0.16 }, 5, 4);
      }
      break;
    case 'low':
      for (const [x, z] of spots(2)) {
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * Math.PI * 2;
          b.sph(leaf, { x: x + Math.cos(a) * 0.18, y: 0.14, z: z + Math.sin(a) * 0.18, sx: 0.3, sy: 0.1, sz: 0.24, ry: -a }, 6, 4);
        }
        if (ripe) for (let k = 0; k < 4; k++) b.cone(fruit, { x: x + Math.cos(k * 1.6 + 0.5) * 0.3, y: 0.08, z: z + Math.sin(k * 1.6 + 0.5) * 0.3, rx: Math.PI, sx: 0.14, sy: 0.16, sz: 0.14 }, 6);
      }
      break;
    case 'cane':
      for (const [x, z] of spots(2)) {
        for (let k = 0; k < 4; k++) {
          const dx = x + (k % 2 - 0.5) * 0.16, dz = z + (k > 1 ? 0.08 : -0.08);
          b.cyl(ripe ? fruit : 0x8cc152, { x: dx, y: 1.05, z: dz, sy: 2.1, rz: (k - 1.5) * 0.04 }, 0.045, 0.05, 6);
          for (let s = 0; s < 4; s++) b.cyl(0x6f8f3a, { x: dx, y: 0.4 + s * 0.45, z: dz, sy: 0.04 }, 0.055, 0.055, 6);
        }
        for (let k = 0; k < 6; k++) {
          const a = k * 1.05 + x;
          b.box(leaf, { x: x + Math.cos(a) * 0.3, y: 2.0 - (k % 2) * 0.2, z: z + Math.sin(a) * 0.3, sx: 0.7, sy: 0.03, sz: 0.08, ry: -a, rz: -0.5 });
        }
      }
      break;
    case 'head':
      for (const [x, z] of spots(2)) {
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * Math.PI * 2;
          b.sph(leaf, { x: x + Math.cos(a) * 0.2, y: 0.25, z: z + Math.sin(a) * 0.2, sx: 0.36, sy: 0.18, sz: 0.24, ry: -a, rz: 0.5 }, 7, 5);
        }
        if (ripe) b.sph(fruit, { x, y: 0.32, z, sx: 0.38, sy: 0.28, sz: 0.38 }, 9, 6);
      }
      break;
    case 'melon':
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2;
        b.sph(leaf, { x: Math.cos(a) * 0.55, y: 0.1, z: Math.sin(a) * 0.55, sx: 0.4, sy: 0.12, sz: 0.34, ry: -a }, 6, 4);
      }
      if (ripe) {
        b.sph(fruit, { y: 0.32, sx: 0.85, sy: 0.62, sz: 0.62 }, 14, 10);
        for (let s = 0; s < 6; s++) b.torus(0x7fc96b, { y: 0.32, ry: s / 6 * Math.PI, sx: 1.0, sy: 1.0, sz: 0.74 }, 0.42, 0.018, 3, 18, Math.PI);
      }
      break;
    case 'puff':
      for (const [x, z] of spots(2)) {
        b.cyl(0x6b5a3a, { x, y: 0.4, z, sy: 0.8 }, 0.03, 0.04, 5);
        b.sph(leaf, { x, y: 0.6, z, sx: 0.55, sy: 0.6, sz: 0.55 }, 8, 6);
        if (ripe) for (let k = 0; k < 6; k++) b.sph(fruit, { x: x + Math.cos(k) * 0.25, y: 0.55 + (k % 3) * 0.15, z: z + Math.sin(k) * 0.25, s: 0.17 }, 6, 4);
      }
      break;
  }
}

export function cropGeometries() {
  const out = {};
  const seed = new Builder(0.1);
  for (const [x, z] of spots(3)) seed.sph(0x5a3a1e, { x, y: 0.02, z, sx: 0.16, sy: 0.08, sz: 0.16 }, 5, 3);
  out.seed = seed.build();
  const sprout = new Builder(0.1);
  for (const [x, z] of spots(3)) {
    sprout.box(0x6dbb3c, { x: x - 0.05, y: 0.1, z, sx: 0.14, sy: 0.02, sz: 0.06, rz: 0.5 });
    sprout.box(0x7cc94a, { x: x + 0.05, y: 0.1, z, sx: 0.14, sy: 0.02, sz: 0.06, rz: -0.5 });
    sprout.cyl(0x6dbb3c, { x, y: 0.05, z, sy: 0.1 }, 0.015, 0.015, 4);
  }
  out.sprout = sprout.build();
  for (const [id, c] of Object.entries(CROPS)) {
    const g = new Builder(0.07); plant(g, c.shape, c, false); out[id + ':grow'] = g.build();
    const r = new Builder(0.07); plant(r, c.shape, c, true); out[id + ':ripe'] = r.build();
  }
  return out;
}

// Lambert material with a gentle wind sway driven by the instance position.
export function swayMaterial(uniforms) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float hgt = max(position.y, 0.0);
        float ph = uTime * 1.7 + ip.x * 0.45 + ip.z * 0.3;
        transformed.x += sin(ph) * 0.07 * hgt;
        transformed.z += cos(ph * 0.8) * 0.05 * hgt;
      #endif`);
  };
  return m;
}
