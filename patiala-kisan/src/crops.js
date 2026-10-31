// Procedural crop geometry. Each crop has a green "grow" model and a "ripe" model;
// one merged geometry covers a whole 2 m plot so a field renders with instancing.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { CROPS } from './config.js';
import { enhance } from './shading.js';
import { shade } from './models.js';

const spots = (n) => {
  const out = [], step = 1.6 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([-0.8 + step * (i + 0.5) + (rnd(i * 7 + j) - 0.5) * 0.08, -0.8 + step * (j + 0.5) + (rnd(j * 5 + i + 3) - 0.5) * 0.08]);
  return out;
};
const rnd = (seed) => { const x = Math.sin(seed * 91.17) * 43758.5453; return x - Math.floor(x); };

// A tapered leaf blade: a single triangle (the plant material is double-sided)
const bladeGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0], 3));
  g.computeVertexNormals();
  return g;
})();
// broad leaf: a diamond lying almost flat, folded along its midrib
const leafGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.5, 0.06, 0.45, 0, 0.12, 1, 0, 0, 0, 0, 0.12, 1, -0.5, 0.06, 0.45], 3));
  g.computeVertexNormals();
  return g;
})();
const BLADE = { pos: bladeGeo.attributes.position.array, nor: bladeGeo.attributes.normal.array };
const LEAF = { pos: leafGeo.attributes.position.array, nor: leafGeo.attributes.normal.array };
const blade = (b, color, t) => b.add(BLADE, color, { g: 0.35, ...t });
const leaf = (b, color, t) => b.add(LEAF, color, { g: 0.2, ...t });

function tuft(b, x, z, h, color, n = 7, lean = 0.35, w = 0.07) {
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + x * 3, l = lean * (0.5 + rnd(k + x * 7 + z) * 0.6);
    blade(b, shade(color, (rnd(k + z * 3) - 0.5) * 0.08), { x: x + Math.cos(a) * 0.04, z: z + Math.sin(a) * 0.04, sx: w, sy: h * (0.75 + rnd(k + z) * 0.35), ry: -a, rx: Math.sin(a) * l, rz: -Math.cos(a) * l });
  }
}

function plant(b, shape, c, ripe) {
  const lf = c.leaf, fruit = c.ripe;
  switch (shape) {
    case 'grain': {
      const h = c.paddy ? 0.75 : 0.9;
      const stalk = ripe ? (c.paddy ? 0xc9b25a : 0xdcb04c) : lf;
      for (const [x, z] of spots(3)) {
        tuft(b, x, z, h, stalk, 8, 0.3, 0.07);
        if (ripe) for (let k = 0; k < 4; k++) {
          const a = k * 1.57 + x, lx = x + Math.cos(a) * 0.12, lz = z + Math.sin(a) * 0.12, tilt = 0.35 + rnd(k + x) * 0.25;
          b.cone(fruit, { x: lx, y: h * 0.98, z: lz, sx: 0.07, sy: 0.26, sz: 0.07, rx: Math.sin(a) * tilt, rz: -Math.cos(a) * tilt, g: 0.25 }, 5);
          if (!c.paddy) blade(b, shade(fruit, 0.08), { x: lx, y: h * 1.08, z: lz, sx: 0.015, sy: 0.2, rx: Math.sin(a) * tilt, rz: -Math.cos(a) * tilt });
        }
      }
      break;
    }
    case 'root':
      for (const [x, z] of spots(3)) {
        for (let k = 0; k < 5; k++) {
          const a = k * 1.26 + x * 2;
          blade(b, shade(lf, (k % 2) * 0.05), { x, z, sx: 0.12, sy: 0.48, ry: -a, rx: Math.sin(a) * 0.45, rz: -Math.cos(a) * 0.45 });
        }
        if (ripe) {
          b.cone(fruit, { x, y: 0.05, z, rx: Math.PI, sx: 0.2, sy: 0.3, sz: 0.2 }, 8);
          b.sph(fruit, { x, y: 0.16, z, sx: 0.2, sy: 0.08, sz: 0.2 }, 8, 4);
        }
      }
      break;
    case 'bush':
      for (const [x, z] of spots(2)) {
        const h = c.low ? 0.45 : 0.75;
        b.ico(lf, { x, y: h * 0.55, z, sx: 0.66, sy: h, sz: 0.66, g: 0.3 }, 1);
        b.ico(shade(lf, -0.06), { x: x + 0.14, y: h * 0.78, z: z - 0.1, s: 0.42, g: 0.3 }, 1);
        b.ico(shade(lf, 0.05), { x: x - 0.14, y: h * 0.7, z: z + 0.12, s: 0.36, g: 0.3 }, 1);
        if (ripe) {
          for (let k = 0; k < 6; k++) {
            const a = k / 6 * Math.PI * 2 + x, r = c.low ? 0.34 : 0.29, y = c.low ? 0.08 : h * (0.35 + rnd(k + x) * 0.5);
            const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
            if (c.ripe === 0x2fae2a) b.cone(k % 3 === 0 ? 0xd8281c : fruit, { x: px, y, z: pz, rx: Math.PI, sx: 0.06, sy: 0.24, sz: 0.06 }, 6);
            else {
              b.sph(fruit, { x: px, y, z: pz, sx: c.low ? 0.22 : 0.17, sy: c.low ? 0.15 : 0.17, sz: c.low ? 0.18 : 0.17, ao: c.low }, 8, 6);
              if (!c.low) b.cone(0x2f7d22, { x: px, y: y + 0.08, z: pz, sx: 0.06, sy: 0.04, sz: 0.06, ao: false }, 5);
            }
          }
          if (c.low) for (let k = 0; k < 3; k++) b.sph(0xf8f0ff, { x: x + (k - 1) * 0.12, y: h + 0.05, z, s: 0.08, ao: false }, 5, 4);
        }
      }
      break;
    case 'tall':
      for (const [x, z] of spots(2)) {
        b.cyl(0x7fb547, { x, y: 0.85, z, sy: 1.7 }, 0.035, 0.055, 6);
        for (let k = 0; k < 7; k++) {
          const a = k * 2.1 + x, y = 0.3 + k * 0.2;
          blade(b, shade(lf, (k % 2) * 0.05), { x, y, z, sx: 0.12, sy: 0.7, ry: -a, rx: Math.sin(a) * 1.05, rz: -Math.cos(a) * 1.05 });
        }
        b.cone(ripe ? 0xd9b45a : 0x9bc45a, { x, y: 1.85, z, sx: 0.12, sy: 0.38, sz: 0.12 }, 5);
        for (let k = 0; k < 4; k++) blade(b, ripe ? 0xc9a24a : 0xb5cf6a, { x, y: 1.75, z, sx: 0.03, sy: 0.3, ry: k * 1.6, rx: 0.5 });
        if (ripe) {
          b.sph(fruit, { x: x + 0.1, y: 1.05, z: z + 0.05, sx: 0.13, sy: 0.34, sz: 0.13, rz: -0.35 }, 8, 6);
          for (const s of [-1, 1]) leaf(b, 0x9bc45a, { x: x + 0.1, y: 0.86, z: z + 0.05, sx: 0.12, sy: 1, sz: 0.36, rx: -1.2, ry: s * 0.6 + 1.2 });
          b.cone(0xb06a2a, { x: x + 0.2, y: 1.3, z: z + 0.05, sx: 0.05, sy: 0.12, sz: 0.05, rz: -0.6 }, 4);
        }
      }
      break;
    case 'flower':
      // sarson: bushy plant crowned with dense yellow flower clusters
      for (const [x, z] of spots(3)) {
        tuft(b, x, z, 0.72, lf, 5, 0.22, 0.1);
        b.ico(0x5f9e35, { x, y: 0.24, z, sx: 0.38, sy: 0.28, sz: 0.38 }, 1);
        if (ripe) for (let k = 0; k < 6; k++) b.ico(k % 2 ? fruit : shade(fruit, 0.08), { x: x + Math.cos(k * 1.1) * 0.13, y: 0.76 + rnd(k + x) * 0.16, z: z + Math.sin(k * 1.1) * 0.13, s: 0.17, ao: false, g: 0.2 }, 0);
        else for (let k = 0; k < 3; k++) b.sph(0x9bc45a, { x: x + Math.cos(k * 2) * 0.08, y: 0.74, z: z + Math.sin(k * 2) * 0.08, s: 0.08 }, 5, 4);
      }
      break;
    case 'low':
      for (const [x, z] of spots(2)) {
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * Math.PI * 2;
          leaf(b, shade(lf, (k % 2) * 0.06), { x, y: 0.05, z, sx: 0.3, sy: 1.4, sz: 0.34, ry: -a + Math.PI / 2 });
        }
        if (ripe) for (let k = 0; k < 5; k++) {
          const a = k * 1.3 + 0.5, px = x + Math.cos(a) * 0.3, pz = z + Math.sin(a) * 0.3;
          b.cone(fruit, { x: px, y: 0.09, z: pz, rx: Math.PI, sx: 0.15, sy: 0.18, sz: 0.15, ao: false }, 8);
          b.cone(0x2f8a2a, { x: px, y: 0.18, z: pz, sx: 0.12, sy: 0.04, sz: 0.12, ao: false }, 5);
        }
      }
      break;
    case 'cane':
      for (const [x, z] of spots(2)) {
        for (let k = 0; k < 4; k++) {
          const dx = x + (k % 2 - 0.5) * 0.16, dz = z + (k > 1 ? 0.08 : -0.08);
          b.cyl(ripe ? fruit : 0x8cc152, { x: dx, y: 1.05, z: dz, sy: 2.1, rz: (k - 1.5) * 0.04 }, 0.045, 0.05, 6);
          for (let s = 0; s < 4; s++) b.cyl(0x6f8f3a, { x: dx, y: 0.4 + s * 0.45, z: dz, sy: 0.04 }, 0.056, 0.056, 6);
        }
        for (let k = 0; k < 7; k++) {
          const a = k * 0.9 + x;
          blade(b, shade(lf, (k % 2) * 0.05), { x, y: 1.4 + (k % 3) * 0.2, z, sx: 0.1, sy: 1.0, ry: -a, rx: Math.sin(a) * 1.1, rz: -Math.cos(a) * 1.1 });
        }
      }
      break;
    case 'head':
      for (const [x, z] of spots(2)) {
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * Math.PI * 2;
          leaf(b, shade(lf, (k % 2) * 0.05), { x, y: 0.06, z, sx: 0.4, sy: 3.5, sz: 0.42, ry: -a + Math.PI / 2 });
        }
        if (ripe) {
          b.sph(fruit, { x, y: 0.3, z, sx: 0.4, sy: 0.3, sz: 0.4, g: 0.2 }, 10, 6);
          for (let k = 0; k < 6; k++) b.sph(shade(fruit, -0.04), { x: x + Math.cos(k) * 0.1, y: 0.38, z: z + Math.sin(k) * 0.1, s: 0.12, ao: false }, 5, 4);
        }
      }
      break;
    case 'melon':
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2;
        leaf(b, shade(lf, (k % 2) * 0.05), { x: Math.cos(a) * 0.3, y: 0.04, z: Math.sin(a) * 0.3, sx: 0.5, sy: 1, sz: 0.5, ry: -a + Math.PI / 2 });
      }
      for (let k = 0; k < 3; k++) b.torus(0x5f9e35, { x: (k - 1) * 0.3, y: 0.03, rx: Math.PI / 2, s: 1 }, 0.25, 0.012, 3, 10, Math.PI);
      if (ripe) {
        b.sph(fruit, { y: 0.32, sx: 0.86, sy: 0.62, sz: 0.64 }, 16, 10);
        for (let s = 0; s < 8; s++) b.torus(0x7fc96b, { y: 0.32, ry: s / 8 * Math.PI, sx: 1.0, sy: 1.0, sz: 0.74, ao: false }, 0.425, 0.02, 3, 18, Math.PI);
      }
      break;
    case 'puff':
      for (const [x, z] of spots(2)) {
        b.cyl(0x6b5a3a, { x, y: 0.4, z, sy: 0.8 }, 0.03, 0.04, 5);
        b.ico(lf, { x, y: 0.6, z, sx: 0.58, sy: 0.62, sz: 0.58, g: 0.3 }, 1);
        if (ripe) for (let k = 0; k < 7; k++) b.ico(fruit, { x: x + Math.cos(k) * 0.26, y: 0.55 + (k % 3) * 0.15, z: z + Math.sin(k) * 0.26, s: 0.18, ao: false }, 1);
      }
      break;
  }
}

export function cropGeometries() {
  const out = {};
  const seed = new Builder(0.1, { ao: 0 });
  for (const [x, z] of spots(3)) seed.sph(0x5a3a1e, { x, y: 0.02, z, sx: 0.18, sy: 0.08, sz: 0.18 }, 6, 3);
  out.seed = seed.build();
  const sprout = new Builder(0.08, { ao: 0.2, aoH: 0.2 });
  for (const [x, z] of spots(3)) {
    sprout.cyl(0x6dbb3c, { x, y: 0.06, z, sy: 0.12 }, 0.015, 0.018, 4);
    leaf(sprout, 0x7cc94a, { x, y: 0.1, z, sx: 0.14, sy: 0.6, sz: 0.14, ry: Math.PI / 2 });
    leaf(sprout, 0x6dbb3c, { x, y: 0.1, z, sx: 0.14, sy: 0.6, sz: 0.14, ry: -Math.PI / 2 });
  }
  out.sprout = sprout.build();
  for (const [id, c] of Object.entries(CROPS)) {
    const g = new Builder(0.06); plant(g, c.shape, c, false); out[id + ':grow'] = g.build();
    const r = new Builder(0.06); plant(r, c.shape, c, true); out[id + ':ripe'] = r.build();
  }
  return out;
}

// Plant material: enhanced Lambert with wind sway driven by the instance position.
export function swayMaterial() {
  return enhance(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { sway: 1, detail: 0.08, rim: 0.8 });
}
