// Farm decoration: trees, flowers, lights, fountains, seating, paths, fences, statues and more.
// Every kind is modelled once (procedurally) and drawn with one instanced mesh, so a farm full of
// decorations costs a few draw calls. Items are bought in the Shop (🌳 Garden), previewed as a
// ghost in front of the farmer, placed, moved, turned and taken down again. Fruit trees ripen
// on the real clock and are picked by hand. Nothing can be put on fields, roads, pads, workshops
// or pens, or where people walk.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { shade } from './models.js';
import { enhance } from './shading.js';
import { DECOR, DECOR_MAX, DECOR_REFUND, ITEMS, BEAUTY_TIERS, beautyScore, beautyTier } from './config.js';
import { POS } from './world.js';
import { makeId } from './state.js';
import { onRing } from './ring.js';

const $ = (id) => document.getElementById(id);
const WOOD = 0x8a5a2b, WOOD2 = 0xa8723f, DARK = 0x5e3f24, STONE = 0xb8b2a6, MARBLE = 0xf3efe6, GOLD = 0xe3b23c, IRON = 0x2e3236, TERRA = 0xb5653a;
const LEAF = [0x4f9a3a, 0x3f8f35, 0x5aa340];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();

// ---------------------------------------------------------------- models
// Everything faces +z and is built around (0, 0, 0). Fruit trees also list where their fruit hangs.
const blobs = (b, list, col, jit = 0.08) => list.forEach(([x, y, z, s], i) => b.ico(shade(col, ((i % 3) - 1) * jit), { x, y, z, sx: s, sy: s * 0.86, sz: s, g: 0.3 }, 1));
const trunk = (b, h, r, c = DARK) => b.cyl(c, { y: h / 2, sy: h }, r * 0.7, r, 7);
const roundCrown = (b, h, s, col, r = 0.14) => { trunk(b, h, r); blobs(b, [[0, h + s * 0.35, 0, s], [s * 0.38, h + s * 0.15, s * 0.1, s * 0.75], [-s * 0.36, h + s * 0.2, -s * 0.1, s * 0.8], [s * 0.05, h + s * 0.15, s * 0.4, s * 0.7], [-s * 0.1, h + s * 0.7, -s * 0.2, s * 0.6]], col); };
const ringSpots = (n, r, y, s = 1) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + i * 0.4; return [Math.cos(a) * r * (0.55 + (i % 3) * 0.22) * s, y + (i % 2) * 0.25 * s, Math.sin(a) * r * (0.55 + (i % 3) * 0.22) * s]; });
const bed = (b, base, cols, n = 16, r = 0.55) => {
  b.rbox(0x7a5230, { y: 0.1, sx: r * 2.1, sy: 0.2, sz: r * 2.1 }, 0.05);
  b.ico(0x4a8f35, { y: 0.28, sx: r * 1.8, sy: 0.3, sz: r * 1.8 }, 1);
  for (let i = 0; i < n; i++) { const a = i * 2.4, d = Math.sqrt(i / n) * r * 0.8; b.sph(cols[i % cols.length], { x: Math.cos(a) * d, y: 0.42 + (i % 3) * 0.04, z: Math.sin(a) * d, s: 0.2, ao: false }, 6, 4); }
};
const pot = (b, x = 0, z = 0, s = 1) => { b.cyl(TERRA, { x, y: 0.2 * s, z, sy: 0.4 * s }, 0.3 * s, 0.2 * s, 10); b.torus(shade(TERRA, 0.1), { x, y: 0.4 * s, z, rx: Math.PI / 2, s: 1 }, 0.3 * s, 0.04 * s, 4, 12); };
const disc = (b, c, y, r) => b.cyl(c, { y, sy: 0.04 }, r, r, 20);
const seat = (b, len, col = WOOD2, back = true) => {
  b.rbox(col, { y: 0.5, sx: len, sy: 0.08, sz: 0.5 }, 0.03);
  if (back) { b.rbox(col, { y: 0.9, z: -0.22, sx: len, sy: 0.4, sz: 0.06, rx: -0.15 }, 0.03); }
  for (const s of [-1, 1]) b.rbox(DARK, { x: s * (len / 2 - 0.1), y: 0.25, sx: 0.1, sy: 0.5, sz: 0.42 }, 0.02);
};
const lamp = (b, h, post, head, crown) => { b.cyl(post, { y: h / 2, sy: h }, 0.05, 0.08, 8); b.cyl(post, { y: 0.1, sy: 0.2 }, 0.16, 0.2, 8); b.rbox(head, { y: h + 0.1, sx: 0.3, sy: 0.4, sz: 0.3 }, 0.05); b.cone(crown, { y: h + 0.42, sx: 0.42, sy: 0.25, sz: 0.42 }, 4); };
const flame = (b, x, y, z, s = 1) => { b.cone(0xff9a1f, { x, y, z, sx: 0.14 * s, sy: 0.3 * s, sz: 0.14 * s, ao: false }, 5); b.cone(0xffe27a, { x, y: y - 0.03 * s, z, sx: 0.08 * s, sy: 0.18 * s, sz: 0.08 * s, ao: false }, 5); };
const pillar = (b, x, z, h, r = 0.14, c = MARBLE) => { b.cyl(c, { x, y: h / 2, z, sy: h }, r, r * 1.1, 10); b.cyl(c, { x, y: 0.1, z, sy: 0.2 }, r * 1.5, r * 1.5, 10); b.cyl(c, { x, y: h, z, sy: 0.12 }, r * 1.5, r * 1.5, 10); };
const tiers = (b, c, gold, big = 1) => {
  b.cyl(c, { y: 0.25 * big, sy: 0.5 * big }, 1.3 * big, 1.35 * big, 20); b.torus(gold, { y: 0.5 * big, rx: Math.PI / 2, s: 1 }, 1.3 * big, 0.06, 5, 24);
  disc(b, 0x56b4e9, 0.46 * big, 1.18 * big);
  b.cyl(c, { y: 0.9 * big, sy: 0.8 * big }, 0.14 * big, 0.2 * big, 10);
  b.cyl(c, { y: 1.3 * big, sy: 0.1 * big }, 0.62 * big, 0.5 * big, 16); disc(b, 0x7ec8f2, 1.36 * big, 0.55 * big);
  b.cyl(c, { y: 1.65 * big, sy: 0.55 * big }, 0.09 * big, 0.12 * big, 8);
  b.cyl(c, { y: 1.95 * big, sy: 0.08 * big }, 0.34 * big, 0.28 * big, 12);
  b.sph(gold, { y: 2.15 * big, s: 0.22 * big }, 10, 8);
};
const chhatri = (b, x, z, s, c = MARBLE, dome = GOLD) => { for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(c, { x: x + px * s * 0.4, y: s * 0.55, z: z + pz * s * 0.4, sy: s * 1.1 }, s * 0.06, s * 0.07, 8); b.rbox(c, { x, y: s * 1.15, z, sx: s * 1.0, sy: s * 0.1, sz: s * 1.0 }, 0.03); b.dome(dome, { x, y: s * 1.2, z, s: s * 0.95 }, 14, 6); b.cone(GOLD, { x, y: s * 1.9, z, sx: s * 0.08, sy: s * 0.35, sz: s * 0.08 }, 6); };

const ROSEGOLD = 0xe8a598;
const chair = (b, x, z, ry, c = WOOD2) => {
  b.push(x, 0, z, ry);
  b.rbox(c, { y: 0.45, sx: 0.45, sy: 0.06, sz: 0.45 }, 0.02); b.rbox(c, { y: 0.75, z: -0.2, sx: 0.45, sy: 0.55, sz: 0.05 }, 0.02);
  for (const [px, pz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) b.cyl(DARK, { x: px, y: 0.22, z: pz, sy: 0.44 }, 0.025, 0.025, 4);
  b.pop();
};
const heart = (b, x, y, z, s, c) => {
  for (const k of [-1, 1]) b.sph(c, { x: x + k * 0.22 * s, y: y + 0.12 * s, z, sx: 0.55 * s, sy: 0.55 * s, sz: 0.18 * s, ao: false }, 8, 6);
  b.cone(c, { x, y: y - 0.22 * s, z, sx: 0.92 * s, sy: 0.6 * s, sz: 0.18 * s, rz: Math.PI, ao: false }, 4);
};
// an eight-sided pavilion with a railing, open at the front
const pavilion = (b, base, post, roof, top) => {
  b.cyl(base, { y: 0.12, sy: 0.24 }, 2.6, 2.7, 8); b.cyl(shade(base, -0.05), { y: 0.26, sy: 0.04 }, 2.4, 2.4, 8);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; pillar(b, Math.cos(a) * 2.2, Math.sin(a) * 2.2, 2.4, 0.09, post); }
  for (let i = 0; i < 8; i++) {
    if (i === 1) continue;
    const m = i * Math.PI / 4 + Math.PI / 4, d = 2.2 * Math.cos(Math.PI / 8);
    b.box(post, { x: Math.cos(m) * d, y: 0.85, z: Math.sin(m) * d, sx: 1.6, sy: 0.07, sz: 0.07, ry: Math.atan2(-Math.cos(m), -Math.sin(m)) });
  }
  b.cyl(post, { y: 2.55, sy: 0.25 }, 2.55, 2.45, 8);
  b.cone(roof, { y: 3.32, sx: 5.6, sy: 1.3, sz: 5.6 }, 8); b.cyl(top, { y: 3.95, sy: 0.12 }, 0.12, 0.18, 8); b.sph(top, { y: 4.1, s: 0.3 }, 8, 6);
};
const rugOf = (b, cols, fringe) => {
  b.box(cols[0], { y: 0.015, sx: 2.0, sy: 0.03, sz: 1.4 });
  b.box(cols[1], { y: 0.032, sx: 1.7, sy: 0.005, sz: 1.1, ao: false }); b.box(cols[2], { y: 0.036, sx: 1.4, sy: 0.005, sz: 0.8, ao: false }); b.box(cols[3], { y: 0.04, sx: 1.1, sy: 0.005, sz: 0.5, ao: false });
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) b.box(fringe, { x: -0.8 + i * 0.2, y: 0.01, z: s * 0.75, sx: 0.04, sy: 0.02, sz: 0.12, ao: false });
};
const flamingoBird = (b, x, z, ry) => {
  b.push(x, 0, z, ry);
  b.cyl(0xf06595, { y: 0.45, sy: 0.8 }, 0.015, 0.015, 4); b.cyl(0xf06595, { x: 0.06, y: 0.6, z: 0.05, sy: 0.32, rz: -0.6 }, 0.012, 0.012, 4);
  b.sph(0xf783ac, { y: 0.95, sx: 0.3, sy: 0.28, sz: 0.5 }, 8, 6); b.capsule(0xf783ac, { y: 1.25, z: 0.15, rx: 0.25 }, 0.035, 0.4, 5);
  b.sph(0xf783ac, { y: 1.5, z: 0.2, s: 0.13 }, 6, 5); b.cone(0x212529, { y: 1.45, z: 0.32, sx: 0.04, sy: 0.14, sz: 0.04, rx: 2.2 }, 4);
  b.pop();
};

export const MODELS = {
  neem: (b) => roundCrown(b, 1.4, 2.0, 0x4f9a3a),
  ashoka: (b) => { trunk(b, 1.1, 0.1); blobs(b, [[0, 1.6, 0, 1.0], [0, 2.3, 0, 0.9], [0, 3.0, 0, 0.72], [0, 3.55, 0, 0.5]], 0x3a8a3a, 0.05); },
  peepal: (b) => { trunk(b, 1.7, 0.2); blobs(b, [[0, 2.6, 0, 2.3], [0.9, 2.3, 0.3, 1.6], [-0.9, 2.4, -0.2, 1.7], [0.1, 2.3, 0.9, 1.5], [-0.2, 3.2, -0.3, 1.4]], 0x5aa340); },
  mango: (b) => roundCrown(b, 1.1, 2.2, 0x2f7a2f, 0.17),
  guava: (b) => roundCrown(b, 0.9, 1.5, 0x5aa340, 0.1),
  ber: (b) => { roundCrown(b, 0.9, 1.35, 0x6aa84f, 0.09); for (let i = 0; i < 6; i++) b.cyl(0x7a5a3a, { x: Math.cos(i) * 0.5, y: 1.2, z: Math.sin(i) * 0.5, sy: 0.7, rz: Math.cos(i) * 0.6, rx: -Math.sin(i) * 0.6 }, 0.015, 0.02, 4); },
  gulmohar: (b) => { trunk(b, 1.9, 0.16); blobs(b, [[0, 2.5, 0, 2.6], [1.1, 2.3, 0, 1.8], [-1.1, 2.35, 0.2, 1.9], [0.1, 2.3, -1, 1.8]], 0x4f9a3a); for (const [x, y, z] of ringSpots(22, 1.7, 2.6)) b.sph(i2c(x + z), { x, y: y + 0.45, z, s: 0.26, ao: false }, 5, 4); },
  orange: (b) => roundCrown(b, 0.9, 1.6, 0x2f7a2f, 0.1),
  palm: (b) => { for (let i = 0; i < 6; i++) b.cyl(0x8a6a3a, { x: i * 0.03, y: 0.5 + i * 0.5, sy: 0.55, rz: -0.05 * i }, 0.1 - i * 0.008, 0.12 - i * 0.008, 7); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.capsule(0x4f9a3a, { x: 0.12 + Math.cos(a) * 0.55, y: 3.2, z: Math.sin(a) * 0.55, rz: -Math.cos(a) * 1.15, rx: Math.sin(a) * 1.15, sx: 0.8, sy: 1, sz: 0.25 }, 0.18, 1.1, 5); } for (let i = 0; i < 4; i++) b.sph(0x8a5a1c, { x: 0.15 + Math.cos(i * 1.6) * 0.18, y: 3.0, z: Math.sin(i * 1.6) * 0.18, s: 0.16 }, 5, 4); },
  jamun: (b) => roundCrown(b, 1.2, 2.3, 0x2d6b2d, 0.17),
  bamboo: (b) => { for (let i = 0; i < 9; i++) { const a = i * 2.3, d = 0.15 + (i % 3) * 0.12, h = 3.2 + (i % 4) * 0.5, x = Math.cos(a) * d, z = Math.sin(a) * d; b.cyl(i % 2 ? 0x9bb84a : 0x86a63e, { x, y: h / 2, z, sy: h, rz: Math.cos(a) * 0.05, rx: Math.sin(a) * 0.05 }, 0.045, 0.06, 6); for (let k = 1; k < 5; k++) b.cyl(0x6f8a30, { x, y: k * h / 5, z, sy: 0.04 }, 0.065, 0.065, 6); b.capsule(0x6aa83c, { x, y: h - 0.2, z, rz: 1.2, rx: a, sx: 1, sy: 1, sz: 0.4 }, 0.12, 0.7, 4); } },
  banyan: (b) => { trunk(b, 2.2, 0.55, 0x6b4a32); blobs(b, [[0, 3.6, 0, 4.2], [2.0, 3.2, 0.5, 3.0], [-2.1, 3.3, -0.3, 3.1], [0.3, 3.2, 2.0, 2.8], [-0.2, 3.4, -2.0, 2.9], [0.5, 4.5, 0, 2.4]], 0x2f7a35); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = 1.4 + (i % 3) * 0.5; b.cyl(0x8a6a4a, { x: Math.cos(a) * d, y: 1.3, z: Math.sin(a) * d, sy: 2.4 }, 0.04, 0.09, 5); } },
  pot: (b) => { pot(b, 0, 0, 1.1); b.ico(0x3f8f35, { y: 0.7, sx: 0.55, sy: 0.5, sz: 0.55 }, 1); },
  marigold: (b) => bed(b, 0, [0xff9a1f, 0xffc61a, 0xf08a1c], 18),
  rose: (b) => bed(b, 0, [0xd6336c, 0xe03131, 0xff8fab, 0xc2255c], 16),
  mogra: (b) => { b.ico(0x3f8f35, { y: 0.45, sx: 0.9, sy: 0.7, sz: 0.9 }, 1); for (let i = 0; i < 14; i++) b.sph(0xffffff, { x: Math.cos(i * 2.1) * 0.35, y: 0.5 + (i % 4) * 0.12, z: Math.sin(i * 2.1) * 0.35, s: 0.1, ao: false }, 5, 4); },
  tulsi: (b) => { b.rbox(0xc7733a, { y: 0.25, sx: 0.8, sy: 0.5, sz: 0.8 }, 0.04); b.rbox(0xd98a52, { y: 0.55, sx: 0.65, sy: 0.14, sz: 0.65 }, 0.03); b.ico(0x3f9a3a, { y: 0.95, sx: 0.5, sy: 0.55, sz: 0.5 }, 1); b.cyl(WOOD, { y: 1.1, sy: 1.0, x: 0.28 }, 0.015, 0.015, 4); b.prism(0xff7a00, { x: 0.36, y: 1.38, sx: 0.2, sy: 0.14, sz: 0.01, rz: -Math.PI / 2 }); },
  hedge: (b) => { b.ico(0x2f7a2f, { y: 0.55, sx: 1.1, sy: 1.0, sz: 1.1 }, 2); b.cyl(DARK, { y: 0.1, sy: 0.2 }, 0.1, 0.1, 5); },
  sunflowers: (b) => { for (let i = 0; i < 6; i++) { const x = Math.cos(i * 1.2) * 0.4, z = Math.sin(i * 1.2) * 0.4, h = 1.1 + (i % 3) * 0.25; b.cyl(0x5a8f35, { x, y: h / 2, z, sy: h }, 0.02, 0.03, 5); b.cyl(0xffc400, { x, y: h, z: z + 0.04, sy: 0.05, rx: 1.2 }, 0.17, 0.17, 12); b.cyl(0x5a3a1c, { x, y: h + 0.01, z: z + 0.07, sy: 0.05, rx: 1.2 }, 0.09, 0.09, 8); } },
  lotus: (b) => { pot(b, 0, 0, 1.4); disc(b, 0x3b82c4, 0.5, 0.52); for (let i = 0; i < 3; i++) b.cyl(0x3f8f35, { x: Math.cos(i * 2.1) * 0.28, y: 0.52, z: Math.sin(i * 2.1) * 0.28, sy: 0.02 }, 0.15, 0.15, 10); for (let i = 0; i < 6; i++) b.cone(0xff8fb1, { y: 0.66, x: Math.cos(i) * 0.07, z: Math.sin(i) * 0.07, sx: 0.12, sy: 0.3, sz: 0.06, rz: Math.cos(i) * 0.5, rx: -Math.sin(i) * 0.5, ao: false }, 4); },
  diya: (b) => { b.cyl(STONE, { y: 0.3, sy: 0.6 }, 0.07, 0.12, 8); b.cyl(TERRA, { y: 0.64, sy: 0.07 }, 0.2, 0.12, 10); flame(b, 0, 0.82); },
  lamp: (b) => lamp(b, 2.5, IRON, 0xfff0b0, GOLD),
  lantern: (b) => { b.rbox(STONE, { y: 0.15, sx: 0.5, sy: 0.3, sz: 0.5 }, 0.04); b.cyl(STONE, { y: 0.55, sy: 0.5 }, 0.1, 0.12, 8); b.rbox(0xffe9a0, { y: 1.0, sx: 0.4, sy: 0.4, sz: 0.4 }, 0.04); b.cone(0x8a8478, { y: 1.4, sx: 0.65, sy: 0.35, sz: 0.65 }, 4); },
  birdbath: (b) => { b.cyl(STONE, { y: 0.4, sy: 0.8 }, 0.1, 0.16, 8); b.cyl(STONE, { y: 0.85, sy: 0.14 }, 0.5, 0.2, 14); disc(b, 0x5aa9d8, 0.92, 0.42); b.sph(0x666666, { x: 0.2, y: 1.0, z: 0.05, s: 0.12 }, 5, 4); },
  pond: (b) => { disc(b, 0x2f6fa8, 0.04, 4.0); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; b.rbox(shade(STONE, (i % 3 - 1) * 0.05), { x: Math.cos(a) * 2.05, y: 0.13, z: Math.sin(a) * 2.05, sx: 0.7, sy: 0.26, sz: 0.5, ry: -a }, 0.07); } for (const [x, z] of [[0.6, 0.3], [-0.9, -0.4], [0.3, -1.0], [-0.3, 0.9]]) b.cyl(0x3f8f35, { x, y: 0.06, z, sy: 0.02 }, 0.28, 0.28, 10); for (const [x, z] of [[0.6, 0.3], [-0.9, -0.4]]) for (let i = 0; i < 5; i++) b.cone(0xff8fb1, { x: x + Math.cos(i) * 0.06, y: 0.16, z: z + Math.sin(i) * 0.06, sx: 0.1, sy: 0.22, sz: 0.05, rz: Math.cos(i) * 0.5, rx: -Math.sin(i) * 0.5, ao: false }, 4); for (const [x, z] of [[1.2, -0.3], [0.7, -0.9], [0.1, -1.3]]) b.cyl(STONE, { x, y: 0.1, z, sy: 0.12 }, 0.2, 0.22, 8); },
  fountain: (b) => tiers(b, MARBLE, GOLD, 1),
  bench: (b) => seat(b, 1.6),
  charpai: (b) => { for (const [x, z] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) b.cyl(WOOD, { x, y: 0.2, z, sy: 0.4 }, 0.05, 0.06, 6); b.rbox(WOOD2, { y: 0.42, sx: 1.4, sy: 0.07, sz: 0.04, z: -0.38 }, 0.02); b.rbox(WOOD2, { y: 0.42, sx: 1.4, sy: 0.07, sz: 0.04, z: 0.38 }, 0.02); b.rbox(WOOD2, { y: 0.42, sx: 0.04, sy: 0.07, sz: 0.8, x: -0.7 }, 0.02); b.rbox(WOOD2, { y: 0.42, sx: 0.04, sy: 0.07, sz: 0.8, x: 0.7 }, 0.02); for (let i = 0; i < 9; i++) b.box(i % 2 ? 0xe9d8b4 : 0xc9a96e, { x: -0.6 + i * 0.15, y: 0.46, sx: 0.07, sy: 0.02, sz: 0.74 }); },
  picnic: (b) => { b.rbox(WOOD2, { y: 0.78, sx: 1.6, sy: 0.08, sz: 0.8 }, 0.03); for (const s of [-1, 1]) { b.rbox(WOOD2, { y: 0.45, z: s * 0.75, sx: 1.6, sy: 0.07, sz: 0.3 }, 0.03); b.rbox(DARK, { x: s * 0.55, y: 0.4, sx: 0.08, sy: 0.8, sz: 1.5, rx: 0 }, 0.02); } },
  stoneseats: (b) => { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.cyl(shade(STONE, (i - 1) * 0.06), { x: Math.cos(a) * 0.5, y: 0.2, z: Math.sin(a) * 0.5, sy: 0.4 }, 0.26, 0.3, 10); } },
  jhoola: (b) => { for (const s of [-1, 1]) { b.cyl(WOOD, { x: s * 0.9, y: 1.2, z: -0.4, sy: 2.5, rx: -0.2 }, 0.06, 0.08, 6); b.cyl(WOOD, { x: s * 0.9, y: 1.2, z: 0.4, sy: 2.5, rx: 0.2 }, 0.06, 0.08, 6); b.cyl(0x666666, { x: s * 0.55, y: 1.3, sy: 1.5 }, 0.01, 0.01, 3); } b.cyl(WOOD, { y: 2.42, sy: 2.1, rz: Math.PI / 2 }, 0.06, 0.06, 6); b.rbox(WOOD2, { y: 0.6, sx: 1.2, sy: 0.07, sz: 0.4 }, 0.03); for (const s of [-1, 1]) b.cyl(0x8a7a5a, { x: s * 0.55, y: 1.5, sy: 1.8 }, 0.012, 0.012, 3); },
  brick: (b) => { b.rbox(0xb4583a, { y: 0.03, sx: 1.55, sy: 0.06, sz: 1.55 }, 0.02); for (let i = 1; i < 4; i++) { b.box(0x8a3f27, { y: 0.065, z: -0.78 + i * 0.39, sx: 1.55, sy: 0.01, sz: 0.02, ao: false }); } for (let i = 0; i < 4; i++) b.box(0x8a3f27, { y: 0.066, x: -0.58 + (i % 2) * 0.2 + i * 0.3, sx: 0.02, sy: 0.01, sz: 0.38, z: -0.58 + i * 0.39, ao: false }); },
  slab: (b) => { b.rbox(0xa0a0a0, { y: 0.03, sx: 1.55, sy: 0.06, sz: 1.55 }, 0.03); b.box(0x8c8c8c, { y: 0.065, sx: 1.5, sy: 0.01, sz: 0.02, ao: false }); b.box(0x8c8c8c, { y: 0.065, sx: 0.02, sy: 0.01, sz: 1.5, ao: false }); },
  marble: (b) => { b.rbox(MARBLE, { y: 0.03, sx: 1.55, sy: 0.06, sz: 1.55 }, 0.03); b.rbox(0xc9c2b4, { y: 0.065, sx: 0.9, sy: 0.01, sz: 0.9, ry: Math.PI / 4 }, 0.01); b.rbox(0xf9f6ee, { y: 0.07, sx: 0.4, sy: 0.01, sz: 0.4, ry: Math.PI / 4 }, 0.01); },
  fence: (b) => { for (const x of [-1.2, 0, 1.2]) b.rbox(WOOD, { x, y: 0.5, sx: 0.12, sy: 1.0, sz: 0.12 }, 0.03); for (const y of [0.35, 0.75]) b.rbox(WOOD2, { y, sx: 2.5, sy: 0.1, sz: 0.06 }, 0.02); },
  ironfence: (b) => { for (let i = 0; i < 9; i++) { const x = -1.2 + i * 0.3; b.cyl(IRON, { x, y: 0.5, sy: 1.0 }, 0.02, 0.02, 4); b.cone(GOLD, { x, y: 1.05, sx: 0.07, sy: 0.12, sz: 0.07 }, 4); } for (const y of [0.25, 0.8]) b.box(IRON, { y, sx: 2.5, sy: 0.04, sz: 0.04 }); for (const x of [-1.25, 1.25]) { b.cyl(IRON, { x, y: 0.6, sy: 1.2 }, 0.05, 0.05, 6); b.sph(GOLD, { x, y: 1.25, s: 0.14 }, 6, 5); } },
  gate: (b) => { for (const s of [-1, 1]) b.rbox(WOOD, { x: s * 1.0, y: 0.7, sx: 0.18, sy: 1.4, sz: 0.18 }, 0.03); b.rbox(WOOD2, { x: -0.5, y: 0.75, sx: 0.8, sy: 1.0, sz: 0.06 }, 0.02); b.rbox(WOOD2, { x: 0.5, y: 0.75, sx: 0.8, sy: 1.0, sz: 0.06 }, 0.02); b.box(DARK, { x: -0.5, y: 0.75, z: 0.04, sx: 0.8, sy: 0.05, sz: 0.02, rz: 0.55 }); b.box(DARK, { x: 0.5, y: 0.75, z: 0.04, sx: 0.8, sy: 0.05, sz: 0.02, rz: -0.55 }); },
  arch: (b) => { for (const s of [-1, 1]) { b.rbox(0xc0392b, { x: s * 0.95, y: 1.1, sx: 0.2, sy: 2.2, sz: 0.2 }, 0.03); b.sph(GOLD, { x: s * 0.95, y: 2.3, s: 0.18 }, 6, 5); } b.torus(0xff7a00, { y: 2.15, rx: 0, s: 1 }, 0.95, 0.09, 5, 18, Math.PI); for (let i = 0; i < 9; i++) b.box([0xd6336c, 0xf2c200, 0x2b8a3e, 0x1c7ed6, 0xff7a00][i % 5], { x: -0.8 + i * 0.2, y: 2.05 + Math.sin(i / 8 * Math.PI) * 0.3 - 0.12, z: 0.05, sx: 0.08, sy: 0.3 + (i % 2) * 0.1, sz: 0.01, ao: false }); },
  horse: (b) => { b.rbox(MARBLE, { y: 0.35, sx: 1.4, sy: 0.7, sz: 0.8 }, 0.05); b.capsule(0x8a8478, { y: 1.4, z: 0, rx: Math.PI / 2, sx: 1, sy: 1, sz: 1 }, 0.28, 0.9, 8); b.capsule(0x8a8478, { y: 1.9, z: 0.6, rx: -0.5, sx: 1, sy: 1, sz: 1 }, 0.14, 0.6, 6); b.rbox(0x8a8478, { y: 2.2, z: 0.85, sx: 0.22, sy: 0.22, sz: 0.5, rx: -0.4 }, 0.05); for (const [x, z] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.5], [0.18, -0.5]]) b.cyl(0x8a8478, { x, y: 0.95, z, sy: 0.55 }, 0.06, 0.08, 6); b.capsule(0x6e695f, { y: 1.5, z: -0.85, rx: 0.7, sx: 1, sy: 1, sz: 1 }, 0.06, 0.5, 5); },
  lion: (b) => { b.rbox(MARBLE, { y: 0.3, sx: 1.2, sy: 0.6, sz: 0.8 }, 0.05); b.capsule(0xc9a24a, { y: 0.95, rx: Math.PI / 2, sx: 1, sy: 1, sz: 1 }, 0.25, 0.7, 8); b.sph(0xb58a30, { y: 1.15, z: 0.55, s: 0.62 }, 10, 8); b.sph(0xc9a24a, { y: 1.1, z: 0.8, s: 0.34 }, 8, 6); for (const [x, z] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.35], [0.18, -0.35]]) b.cyl(0xc9a24a, { x, y: 0.7, z, sy: 0.4 }, 0.07, 0.09, 6); b.capsule(0xc9a24a, { y: 1.0, z: -0.7, rx: 1.0, sx: 1, sy: 1, sz: 1 }, 0.04, 0.45, 5); },
  maharaja: (b) => { b.cyl(MARBLE, { y: 0.8, sy: 1.6 }, 0.35, 0.42, 12); b.rbox(GOLD, { y: 1.65, sx: 0.9, sy: 0.12, sz: 0.9 }, 0.03); b.cyl(0xc9a24a, { y: 2.0, sy: 0.6 }, 0.28, 0.34, 10); b.sph(0xd9a066, { y: 2.45, s: 0.34 }, 10, 8); b.dome(0xd6336c, { y: 2.55, s: 0.46 }, 12, 6); b.torus(GOLD, { y: 2.55, rx: Math.PI / 2, s: 1 }, 0.22, 0.03, 4, 12); b.cone(GOLD, { y: 2.85, z: 0.05, sx: 0.06, sy: 0.25, sz: 0.06, rx: -0.3 }, 5); b.capsule(0x1b1410, { x: -0.1, y: 2.4, z: 0.15, rz: 1.3 }, 0.015, 0.1, 4); b.capsule(0x1b1410, { x: 0.1, y: 2.4, z: 0.15, rz: -1.3 }, 0.015, 0.1, 4); },
  matkas: (b) => { pot(b, -0.25, 0, 1.3); pot(b, 0.3, 0.05, 1.2); b.cyl(TERRA, { x: 0.02, y: 0.78, z: -0.05, sy: 0.4 }, 0.3, 0.2, 10); b.sph(shade(TERRA, -0.1), { x: 0.02, y: 0.95, z: -0.05, s: 0.42 }, 10, 6); },
  charkha: (b) => { b.rbox(WOOD, { y: 0.25, sx: 0.9, sy: 0.12, sz: 0.4 }, 0.03); b.torus(WOOD2, { x: 0.25, y: 0.75, rx: 0, s: 1 }, 0.38, 0.03, 4, 20); for (let i = 0; i < 8; i++) b.box(WOOD2, { x: 0.25, y: 0.75, sx: 0.015, sy: 0.74, sz: 0.015, rz: i / 8 * Math.PI }); b.cyl(WOOD, { x: -0.3, y: 0.55, sy: 0.6 }, 0.03, 0.04, 5); b.cyl(0xf4f1ea, { x: -0.3, y: 0.85, sy: 0.25, rz: Math.PI / 2 }, 0.03, 0.06, 6); },
  cart: (b) => { b.rbox(WOOD2, { y: 0.85, sx: 1.6, sy: 0.12, sz: 1.0 }, 0.04); for (const s of [-1, 1]) { b.rbox(WOOD, { z: s * 0.5, y: 1.1, sx: 1.6, sy: 0.4, sz: 0.06 }, 0.02); b.torus(WOOD, { x: s * 0.9, y: 0.7, rx: 0, ry: Math.PI / 2, s: 1 }, 0.7, 0.07, 5, 20); for (let i = 0; i < 6; i++) b.box(WOOD, { x: s * 0.9, y: 0.7, sx: 0.04, sy: 1.35, sz: 0.04, rx: i / 6 * Math.PI }); } b.cyl(WOOD, { y: 0.7, sy: 2.0, rz: Math.PI / 2 }, 0.04, 0.04, 5); b.cyl(WOOD, { y: 0.65, z: 1.5, sy: 2.0, rx: Math.PI / 2 - 0.06 }, 0.05, 0.05, 5); },
  rangoli: (b) => { disc(b, 0xf2f2f2, 0.02, 1.6); disc(b, 0xd6336c, 0.03, 1.3); disc(b, 0xf2c200, 0.035, 1.0); disc(b, 0x2b8a3e, 0.04, 0.7); disc(b, 0x1c7ed6, 0.045, 0.4); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.cyl(i % 2 ? 0xff7a00 : 0xffffff, { x: Math.cos(a) * 0.62, y: 0.05, z: Math.sin(a) * 0.62, sy: 0.02 }, 0.08, 0.08, 8); } },
  bonfire: (b) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.cyl(0x4a2d18, { x: Math.cos(a) * 0.18, y: 0.28, z: Math.sin(a) * 0.18, sy: 0.9, rz: Math.cos(a) * 0.8, rx: -Math.sin(a) * 0.8 }, 0.07, 0.09, 5); } for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.sph(0x6e6a64, { x: Math.cos(a) * 0.6, y: 0.1, z: Math.sin(a) * 0.6, s: 0.22 }, 5, 4); } b.cone(0xff6a00, { y: 0.55, sx: 0.5, sy: 0.9, sz: 0.5, ao: false }, 6); b.cone(0xffc61a, { y: 0.5, sx: 0.32, sy: 0.65, sz: 0.32, ao: false }, 6); b.cone(0xfff3a0, { y: 0.45, sx: 0.16, sy: 0.4, sz: 0.16, ao: false }, 5); },
  diyaring: (b) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55; b.cyl(TERRA, { x, y: 0.05, z, sy: 0.08 }, 0.1, 0.07, 8); flame(b, x, 0.2, z, 0.6); } disc(b, 0xf2c200, 0.02, 0.5); },
  flags: (b) => { b.cyl(WOOD, { y: 1.5, sy: 3.0 }, 0.04, 0.06, 6); b.sph(GOLD, { y: 3.05, s: 0.13 }, 6, 5); b.prism(0xff7a00, { x: 0.32, y: 2.25, sx: 0.8, sy: 0.64, sz: 0.02, rz: -Math.PI / 2 }); b.cyl(WOOD, { y: 0.1, sy: 0.2 }, 0.16, 0.2, 8); },
  royalfountain: (b) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.rbox(MARBLE, { x: Math.cos(a) * 1.9, y: 0.3, z: Math.sin(a) * 1.9, sx: 1.5, sy: 0.6, sz: 0.4, ry: -a + Math.PI / 2 }, 0.06); } disc(b, 0x56b4e9, 0.5, 3.4); b.torus(GOLD, { y: 0.62, rx: Math.PI / 2, s: 1 }, 1.9, 0.05, 4, 32); tiers(b, MARBLE, GOLD, 1.2); },
  marblebench: (b) => { b.rbox(MARBLE, { y: 0.5, sx: 1.7, sy: 0.12, sz: 0.55 }, 0.04); b.rbox(MARBLE, { y: 0.95, z: -0.24, sx: 1.7, sy: 0.55, sz: 0.1 }, 0.05); for (const s of [-1, 1]) { b.rbox(MARBLE, { x: s * 0.75, y: 0.25, sx: 0.2, sy: 0.5, sz: 0.5 }, 0.04); b.sph(GOLD, { x: s * 0.82, y: 0.72, z: 0.1, s: 0.22 }, 8, 6); } },
  rosearch: (b) => { for (const s of [-1, 1]) b.rbox(0xf3efe6, { x: s * 0.95, y: 1.1, sx: 0.16, sy: 2.2, sz: 0.16 }, 0.03); b.torus(0xf3efe6, { y: 2.1, s: 1 }, 0.95, 0.07, 5, 20, Math.PI); for (let i = 0; i < 26; i++) { const a = i / 25 * Math.PI, x = Math.cos(a) * 0.95, y = 2.1 + Math.sin(a) * 0.95; b.sph([0xd6336c, 0xe03131, 0xff8fab][i % 3], { x: i % 2 ? x * 1.04 : x, y: y + (i % 3) * 0.04, z: (i % 3 - 1) * 0.08, s: 0.19, ao: false }, 5, 4); b.ico(0x3f8f35, { x: x * 0.98, y: y - 0.03, z: 0.1, s: 0.15 }, 0); } for (let i = 0; i < 9; i++) b.sph([0xd6336c, 0xe03131][i % 2], { x: (i % 2 ? 1 : -1) * 0.95, y: 0.4 + i * 0.22, z: (i % 3 - 1) * 0.07, s: 0.18, ao: false }, 5, 4); },
  goldlamp: (b) => lamp(b, 3.0, GOLD, 0xfff3b0, 0xffd54a),
  peacock: (b) => { b.rbox(MARBLE, { y: 0.3, sx: 1.0, sy: 0.6, sz: 1.0 }, 0.05); b.capsule(0x1b6fa8, { y: 0.95, z: 0.1, rx: 0.5, sx: 1, sy: 1, sz: 1 }, 0.2, 0.5, 8); b.capsule(0x1b6fa8, { y: 1.5, z: 0.35, rx: -0.2 }, 0.07, 0.5, 6); b.sph(0x1b6fa8, { y: 1.9, z: 0.4, s: 0.2 }, 8, 6); b.cone(GOLD, { y: 2.05, z: 0.4, sx: 0.05, sy: 0.18, sz: 0.05 }, 4); for (let i = 0; i < 11; i++) { const a = -0.9 + i * 0.18, x = Math.sin(a) * 0.75, y = 1.35 + Math.cos(a) * 0.62; b.capsule(i % 2 ? 0x1c9a6a : 0x1b6fa8, { x, y, z: -0.55, rz: -a, sx: 0.5, sy: 1, sz: 0.2 }, 0.13, 0.55, 5); b.sph(0xf2c200, { x: Math.sin(a) * 0.95, y: 1.35 + Math.cos(a) * 0.85, z: -0.5, s: 0.1, ao: false }, 5, 4); } },
  royalpond: (b) => { disc(b, 0x2f8ac8, 0.05, 5.0); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; b.rbox(MARBLE, { x: Math.cos(a) * 2.55, y: 0.18, z: Math.sin(a) * 2.55, sx: 0.8, sy: 0.36, sz: 0.5, ry: -a }, 0.08); } b.torus(GOLD, { y: 0.38, rx: Math.PI / 2, s: 1 }, 2.55, 0.04, 4, 36); for (let i = 0; i < 7; i++) { const a = i * 2.4, d = 0.5 + (i % 3) * 0.5, x = Math.cos(a) * d, z = Math.sin(a) * d; b.cyl(0x3f8f35, { x, y: 0.08, z, sy: 0.02 }, 0.3, 0.3, 10); for (let k = 0; k < 5; k++) b.cone(0xff8fb1, { x: x + Math.cos(k) * 0.07, y: 0.2, z: z + Math.sin(k) * 0.07, sx: 0.12, sy: 0.26, sz: 0.06, rz: Math.cos(k) * 0.5, rx: -Math.sin(k) * 0.5, ao: false }, 4); } b.cyl(MARBLE, { y: 0.4, sy: 0.8 }, 0.14, 0.2, 8); b.sph(GOLD, { y: 0.9, s: 0.2 }, 8, 6); },
  minibaradari: (b) => { b.rbox(MARBLE, { y: 0.2, sx: 3.6, sy: 0.4, sz: 3.6 }, 0.05); b.rbox(0xe8dfcb, { y: 0.45, sx: 3.2, sy: 0.1, sz: 3.2 }, 0.03); for (const x of [-1.3, 0, 1.3]) for (const z of [-1.3, 0, 1.3]) { if (x === 0 && z === 0) continue; pillar(b, x, z, 2.2, 0.12); } b.rbox(0xf2e6c8, { y: 2.45, sx: 3.5, sy: 0.3, sz: 3.5 }, 0.05); b.dome(GOLD, { y: 2.6, s: 2.2 }, 18, 8); b.cone(GOLD, { y: 3.9, sx: 0.12, sy: 0.6, sz: 0.12 }, 6); for (const [x, z] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) { b.dome(0xf2e6c8, { x, y: 2.6, z, s: 0.55 }, 10, 5); b.cone(GOLD, { x, y: 3.0, z, sx: 0.05, sy: 0.3, sz: 0.05 }, 5); } for (let i = 0; i < 4; i++) b.box(0xe8dfcb, { x: -0.6 + i * 0.4, y: 0.12, z: 1.9, sx: 0.4, sy: 0.12 * (4 - i) / 2, sz: 0.4 }); },
  // ---- added in the decoration-mode update
  waterfall: (b) => {
    disc(b, 0x3b8fd0, 0.05, 3.2);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; b.ico(shade(STONE, (i % 3 - 1) * 0.08), { x: Math.cos(a) * 1.55, y: 0.15, z: Math.sin(a) * 1.55, sx: 0.6, sy: 0.35, sz: 0.45 }, 0); }
    b.ico(0x8f877a, { y: 0.9, z: -1.0, sx: 2.2, sy: 1.8, sz: 1.2 }, 1); b.ico(0x9c9486, { x: -0.7, y: 1.5, z: -1.1, sx: 1.2, sy: 1.4, sz: 1.0 }, 1); b.ico(0x857d70, { x: 0.6, y: 1.8, z: -1.2, sx: 1.1, sy: 1.2, sz: 0.9 }, 1);
    b.box(0x9fd8ff, { y: 1.05, z: -0.42, sx: 0.7, sy: 1.95, sz: 0.05, rx: 0.12, ao: false }); b.box(0xe3f4ff, { y: 1.05, z: -0.39, sx: 0.36, sy: 1.95, sz: 0.03, rx: 0.12, ao: false });
    b.box(0x9fd8ff, { y: 2.02, z: -0.72, sx: 0.7, sy: 0.05, sz: 0.6, ao: false });
    for (let i = 0; i < 6; i++) b.sph(0xffffff, { x: (i - 2.5) * 0.14, y: 0.12, z: -0.2 + (i % 2) * 0.1, s: 0.16, ao: false }, 5, 4);
    for (const [x, z] of [[-0.9, 0.6], [1.0, 0.3]]) b.cyl(0x3f8f35, { x, y: 0.08, z, sy: 0.02 }, 0.22, 0.22, 8);
    b.ico(0x3f8f35, { x: -1.2, y: 1.9, z: -1.0, s: 0.7 }, 1); b.ico(0x4f9a3a, { x: 1.1, y: 2.3, z: -1.1, s: 0.6 }, 1);
  },
  pool: (b) => {
    b.rbox(0xe9ecef, { y: 0.08, sx: 5.2, sy: 0.16, sz: 3.4 }, 0.05);
    b.box(0x2fa8e0, { y: 0.165, sx: 4.6, sy: 0.02, sz: 2.8, ao: false }); b.box(0x74d0f5, { y: 0.172, sx: 3.6, sy: 0.01, sz: 1.8, ao: false });
    for (let i = 0; i < 5; i++) b.box(0x1c7ed6, { x: -1.84 + i * 0.92, y: 0.168, sx: 0.04, sy: 0.01, sz: 2.6, ao: false });
    for (const z of [-0.25, 0.25]) { b.cyl(0xc0c4c8, { x: 2.15, y: 0.5, z, sy: 0.7 }, 0.025, 0.025, 6); b.torus(0xc0c4c8, { x: 2.3, y: 0.85, z, s: 1 }, 0.15, 0.025, 4, 8, Math.PI); }
    for (let i = 0; i < 3; i++) b.box(0xc0c4c8, { x: 2.15, y: 0.25 + i * 0.18, sx: 0.03, sy: 0.03, sz: 0.5 });
    b.torus(0xf783ac, { x: -1.2, y: 0.2, z: 0.5, rx: Math.PI / 2, s: 1 }, 0.3, 0.1, 6, 14); b.torus(0xffd43b, { x: 0.6, y: 0.2, z: -0.6, rx: Math.PI / 2, s: 1 }, 0.26, 0.09, 6, 14);
  },
  sofa: (b) => {
    const C = 0x8a6a4a, Cu = 0xf1e3c8;
    b.rbox(C, { y: 0.25, sx: 1.8, sy: 0.4, sz: 0.8 }, 0.06); b.rbox(C, { y: 0.7, z: -0.32, sx: 1.8, sy: 0.6, sz: 0.16 }, 0.06);
    for (const s of [-1, 1]) b.rbox(C, { x: s * 0.85, y: 0.55, sx: 0.16, sy: 0.35, sz: 0.8 }, 0.05);
    for (const s of [-1, 1]) b.rbox(Cu, { x: s * 0.4, y: 0.52, z: 0.04, sx: 0.74, sy: 0.16, sz: 0.66 }, 0.06);
    b.rbox(0xd6336c, { x: -0.45, y: 0.8, z: -0.18, sx: 0.4, sy: 0.36, sz: 0.12, rx: -0.2 }, 0.08); b.rbox(0x1c7ed6, { x: 0.45, y: 0.8, z: -0.18, sx: 0.4, sy: 0.36, sz: 0.12, rx: -0.2 }, 0.08);
  },
  dining: (b) => {
    b.cyl(WOOD2, { y: 0.75, sy: 0.06 }, 0.6, 0.6, 16); b.cyl(DARK, { y: 0.38, sy: 0.75 }, 0.05, 0.05, 6); b.cyl(DARK, { y: 0.03, sy: 0.06 }, 0.3, 0.3, 10);
    b.cyl(0xdddddd, { y: 1.5, sy: 1.6 }, 0.025, 0.025, 5); b.cone(0xe03131, { y: 2.35, sx: 2.4, sy: 0.5, sz: 2.4 }, 8); b.sph(0xffffff, { y: 2.62, s: 0.1 }, 5, 4);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; chair(b, Math.cos(a) * 0.95, Math.sin(a) * 0.95, Math.atan2(-Math.cos(a), -Math.sin(a))); }
    b.cyl(0xffffff, { x: 0.15, y: 0.82, sy: 0.08 }, 0.12, 0.1, 10); b.sph(0xff9f1c, { x: 0.15, y: 0.88, s: 0.1 }, 5, 4); b.sph(0x8bc34a, { x: 0.2, y: 0.88, z: 0.05, s: 0.09 }, 5, 4);
  },
  swingchair: (b) => {
    b.cyl(IRON, { y: 0.04, z: -0.1, sy: 0.08 }, 0.5, 0.55, 14); b.cyl(IRON, { y: 1.15, z: -0.55, sy: 2.3 }, 0.045, 0.055, 6); b.cyl(IRON, { y: 2.3, z: -0.28, sy: 0.6, rx: Math.PI / 2 }, 0.04, 0.04, 6);
    b.cyl(0x666666, { y: 1.85, sy: 0.9 }, 0.012, 0.012, 3); b.dome(0xc99a5b, { y: 1.0, rx: Math.PI, s: 1.0 }, 12, 6); b.torus(0xa87a42, { y: 1.0, rx: Math.PI / 2, s: 1 }, 0.5, 0.05, 4, 16);
    b.cyl(0xf1e3c8, { y: 0.62, sy: 0.12 }, 0.36, 0.36, 12); b.rbox(0xd6336c, { y: 0.85, z: -0.22, sx: 0.4, sy: 0.3, sz: 0.1, rx: -0.3 }, 0.06);
  },
  coffeetable: (b) => {
    b.rbox(WOOD2, { y: 0.42, sx: 1.0, sy: 0.06, sz: 0.6 }, 0.03); b.rbox(DARK, { y: 0.15, sx: 0.9, sy: 0.03, sz: 0.5 }, 0.01);
    for (const [x, z] of [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]]) b.cyl(DARK, { x, y: 0.2, z, sy: 0.4 }, 0.03, 0.03, 5);
    for (const x of [-0.2, 0.12]) { b.cyl(0xffffff, { x, y: 0.5, z: 0.05, sy: 0.1 }, 0.05, 0.04, 8); b.cyl(0xb5653a, { x, y: 0.553, z: 0.05, sy: 0.01 }, 0.045, 0.045, 8); }
    b.cyl(0xc0c0c0, { x: 0.35, y: 0.52, z: -0.1, sy: 0.14 }, 0.06, 0.07, 8);
  },
  lounger: (b) => {
    b.rbox(0xf8f9fa, { y: 0.3, z: 0.15, sx: 0.7, sy: 0.08, sz: 1.3 }, 0.03); b.rbox(0xf8f9fa, { y: 0.55, z: -0.7, sx: 0.7, sy: 0.08, sz: 0.7, rx: 0.6 }, 0.03);
    b.rbox(0x1c7ed6, { y: 0.36, z: 0.15, sx: 0.62, sy: 0.06, sz: 1.2 }, 0.03); b.rbox(0x1c7ed6, { y: 0.6, z: -0.66, sx: 0.62, sy: 0.06, sz: 0.64, rx: 0.6 }, 0.03);
    for (const [x, z] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.7], [0.3, 0.7]]) b.cyl(0xc0c4c8, { x, y: 0.14, z, sy: 0.28 }, 0.025, 0.025, 5);
    b.rbox(0xffffff, { y: 0.48, z: -0.9, sx: 0.4, sy: 0.12, sz: 0.2, rx: 0.6 }, 0.05);
  },
  streetlight: (b) => {
    b.cyl(0x495057, { y: 1.8, sy: 3.6 }, 0.05, 0.08, 8); b.cyl(0x495057, { y: 0.12, sy: 0.24 }, 0.16, 0.2, 8);
    b.cyl(0x495057, { y: 3.6, z: 0.35, sy: 0.75, rx: Math.PI / 2 }, 0.035, 0.035, 6);
    b.rbox(0x343a40, { y: 3.55, z: 0.75, sx: 0.28, sy: 0.1, sz: 0.5 }, 0.04); b.box(0xfff8db, { y: 3.49, z: 0.75, sx: 0.22, sy: 0.02, sz: 0.42, ao: false });
  },
  fairylights: (b) => {
    for (const s of [-1, 1]) { b.cyl(WOOD, { x: s * 1.4, y: 1.15, sy: 2.3 }, 0.04, 0.06, 6); b.cyl(WOOD, { x: s * 1.4, y: 0.08, sy: 0.16 }, 0.14, 0.16, 8); }
    for (let r = 0; r < 2; r++) {
      const pt = (t) => [-1.4 + t * 2.8, 2.2 - r * 0.35 - Math.sin(t * Math.PI) * 0.45];
      for (let i = 0; i <= 14; i++) {
        const [x, y] = pt(i / 14);
        b.sph([0xfff3b0, 0xffd43b, 0xffffff, 0xffc9de][(i + r) % 4], { x, y: y - 0.05, z: r * 0.06, s: 0.1, ao: false }, 5, 4);
        if (i < 14) { const [x1, y1] = pt((i + 1) / 14); b.cyl(0x343a40, { x: (x + x1) / 2, y: (y + y1) / 2, z: r * 0.06, sy: Math.hypot(x1 - x, y1 - y), rz: Math.atan2(-(x1 - x), y1 - y) }, 0.008, 0.008, 3); }
      }
    }
  },
  colorlights: (b) => {
    b.cyl(IRON, { y: 1.15, sy: 2.3 }, 0.04, 0.06, 8); b.cyl(IRON, { y: 0.1, sy: 0.2 }, 0.15, 0.2, 8);
    b.torus(IRON, { y: 2.2, rx: Math.PI / 2, s: 1 }, 0.42, 0.015, 3, 20);
    const C = [0xff4d4d, 0x51cf66, 0x4dabf7, 0xffd43b, 0xcc5de8];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.sph(C[i], { x: Math.cos(a) * 0.42, y: 2.2, z: Math.sin(a) * 0.42, s: 0.26, ao: false }, 8, 6); }
    b.sph(0xffffff, { y: 2.45, s: 0.24, ao: false }, 8, 6);
  },
  hanglantern: (b) => {
    b.cyl(IRON, { y: 1.0, sy: 2.0 }, 0.03, 0.04, 6); b.cyl(IRON, { y: 0.06, sy: 0.12 }, 0.12, 0.14, 8);
    for (const s of [-1, 1]) {
      b.torus(IRON, { x: s * 0.25, y: 2.0, s: 1 }, 0.25, 0.025, 4, 10, Math.PI);
      b.cyl(0x666666, { x: s * 0.5, y: 1.86, sy: 0.28 }, 0.008, 0.008, 3);
      b.sph(s > 0 ? 0xff6b6b : 0xffa94d, { x: s * 0.5, y: 1.55, sx: 0.3, sy: 0.36, sz: 0.3, ao: false }, 8, 6);
      for (const y of [1.72, 1.38]) b.cyl(0xc92a2a, { x: s * 0.5, y, sy: 0.04 }, 0.08, 0.08, 6);
    }
  },
  gazebo: (b) => pavilion(b, MARBLE, 0xffffff, 0xf8f9fa, GOLD),
  pergola: (b) => {
    for (const [x, z] of [[-1.6, -1.0], [1.6, -1.0], [-1.6, 1.0], [1.6, 1.0]]) { b.rbox(WOOD, { x, y: 1.2, z, sx: 0.18, sy: 2.4, sz: 0.18 }, 0.03); b.ico(0x3f8f35, { x, y: 0.9, z, sx: 0.45, sy: 1.6, sz: 0.45 }, 1); }
    for (const z of [-1.0, 1.0]) b.rbox(WOOD2, { y: 2.45, z, sx: 3.9, sy: 0.18, sz: 0.12 }, 0.03);
    for (let i = 0; i < 7; i++) b.rbox(WOOD2, { x: -1.65 + i * 0.55, y: 2.6, sx: 0.1, sy: 0.12, sz: 2.6 }, 0.02);
    for (let i = 0; i < 10; i++) b.ico(LEAF[i % 3], { x: -1.7 + i * 0.38, y: 2.72, z: ((i * 7) % 5 - 2) * 0.4, sx: 0.6, sy: 0.25, sz: 0.6 }, 0);
    for (let i = 0; i < 8; i++) b.sph([0xcc5de8, 0xf783ac][i % 2], { x: -1.5 + i * 0.42, y: 2.62, z: ((i * 3) % 5 - 2) * 0.45, s: 0.14, ao: false }, 5, 4);
  },
  bridge: (b) => {
    b.box(0x3b8fd0, { y: 0.02, sx: 1.4, sy: 0.02, sz: 2.6, ao: false });
    const N = 11;
    for (let i = 0; i < N; i++) { const t = i / (N - 1); b.rbox(i % 2 ? WOOD2 : shade(WOOD2, -0.06), { x: -1.9 + t * 3.8, y: 0.12 + Math.sin(t * Math.PI) * 0.55, sx: 0.36, sy: 0.08, sz: 1.2, rz: Math.atan(0.4546 * Math.cos(t * Math.PI)) }, 0.02); }
    for (const z of [-0.6, 0.6]) {
      for (let i = 0; i < 6; i++) { const t = i / 5; b.cyl(WOOD, { x: -1.8 + t * 3.6, y: 0.47 + Math.sin(t * Math.PI) * 0.55, z, sy: 0.7 }, 0.04, 0.04, 5); }
      for (let i = 0; i < 10; i++) {
        const t0 = i / 10, t1 = (i + 1) / 10, x0 = -1.8 + t0 * 3.6, x1 = -1.8 + t1 * 3.6, y0 = 0.82 + Math.sin(t0 * Math.PI) * 0.55, y1 = 0.82 + Math.sin(t1 * Math.PI) * 0.55;
        b.box(WOOD2, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, sx: Math.hypot(x1 - x0, y1 - y0) + 0.02, sy: 0.06, sz: 0.06, rz: Math.atan2(y1 - y0, x1 - x0) });
      }
    }
  },
  birdhouse: (b) => {
    b.cyl(WOOD, { y: 0.8, sy: 1.6 }, 0.035, 0.045, 6); b.cyl(WOOD, { y: 0.06, sy: 0.12 }, 0.12, 0.14, 8);
    b.rbox(0xd9480f, { y: 1.8, sx: 0.4, sy: 0.4, sz: 0.36 }, 0.03); b.prism(0x5c3d2e, { y: 2.1, sx: 0.52, sy: 0.26, sz: 0.46 });
    b.cyl(0x2b1d12, { y: 1.85, z: 0.185, sy: 0.02, rx: Math.PI / 2 }, 0.07, 0.07, 8); b.cyl(WOOD, { y: 1.72, z: 0.24, sy: 0.12, rx: Math.PI / 2 }, 0.015, 0.015, 4);
    b.sph(0x8a6a4a, { x: 0.12, y: 2.32, z: 0.05, s: 0.12 }, 5, 4);
  },
  rug: (b) => rugOf(b, [0xc92a2a, 0xf2c200, 0x1c7ed6, 0xc92a2a], 0xf8f0dc),
  welcome: (b) => {
    for (const s of [-1, 1]) { b.rbox(WOOD, { x: s * 0.8, y: 0.7, sx: 0.12, sy: 1.4, sz: 0.12 }, 0.03); b.ico(0x3f8f35, { x: s * 0.8, y: 0.25, z: 0.15, s: 0.45 }, 1); }
    b.rbox(WOOD2, { y: 1.15, sx: 1.8, sy: 0.6, sz: 0.08 }, 0.04);
    b.box(0xf2c200, { y: 1.15, z: 0.045, sx: 1.55, sy: 0.04, sz: 0.01, ao: false }); b.box(0x5c3d2e, { y: 1.29, z: 0.045, sx: 1.3, sy: 0.1, sz: 0.01, ao: false }); b.box(0x5c3d2e, { y: 1.02, z: 0.045, sx: 1.0, sy: 0.08, sz: 0.01, ao: false });
    for (let i = 0; i < 11; i++) { const t = i / 10; b.sph(i % 2 ? 0xff9a1f : 0xffc61a, { x: -0.85 + t * 1.7, y: 0.84 - Math.sin(t * Math.PI) * 0.12, z: 0.06, s: 0.11, ao: false }, 5, 4); }
  },
  elephant: (b) => {
    const G = 0x9a958c;
    b.rbox(MARBLE, { y: 0.25, sx: 1.4, sy: 0.5, sz: 2.2 }, 0.05);
    for (const [x, z] of [[-0.32, -0.55], [0.32, -0.55], [-0.32, 0.55], [0.32, 0.55]]) b.cyl(G, { x, y: 0.9, z, sy: 0.85 }, 0.15, 0.17, 8);
    b.sph(G, { y: 1.6, sx: 1.15, sy: 1.15, sz: 1.85 }, 12, 8);
    b.sph(G, { y: 1.95, z: 1.0, s: 0.85 }, 10, 8);
    b.capsule(G, { y: 1.3, z: 1.42, rx: 0.15 }, 0.1, 0.75, 6);
    for (const s of [-1, 1]) { b.cyl(shade(G, -0.06), { x: s * 0.45, y: 1.95, z: 0.85, sy: 0.05, rz: Math.PI / 2 }, 0.42, 0.42, 12); b.capsule(0xfffbea, { x: s * 0.17, y: 1.55, z: 1.38, rx: 1.0 }, 0.04, 0.3, 4); }
    b.rbox(0xc92a2a, { y: 2.12, sx: 1.2, sy: 0.08, sz: 1.0 }, 0.03); b.box(GOLD, { y: 2.12, sx: 1.24, sy: 0.04, sz: 1.04 });
    b.rbox(0xc92a2a, { y: 2.2, z: 1.2, sx: 0.5, sy: 0.4, sz: 0.06, rx: 0.5 }, 0.03); b.sph(GOLD, { y: 2.42, z: 1.12, s: 0.12 }, 6, 5);
    b.capsule(G, { y: 1.5, z: -0.95, rx: -0.4 }, 0.03, 0.4, 4);
  },
  deer: (b) => {
    const C = 0xb07a45;
    b.rbox(STONE, { y: 0.1, sx: 0.8, sy: 0.2, sz: 1.3 }, 0.04);
    for (const [x, z] of [[-0.12, -0.32], [0.12, -0.32], [-0.12, 0.3], [0.12, 0.3]]) b.cyl(C, { x, y: 0.55, z, sy: 0.7 }, 0.03, 0.04, 5);
    b.capsule(C, { y: 0.98, rx: Math.PI / 2 }, 0.2, 0.55, 8);
    b.capsule(C, { y: 1.3, z: 0.38, rx: 0.45 }, 0.08, 0.35, 6); b.sph(C, { y: 1.58, z: 0.52, sx: 0.18, sy: 0.2, sz: 0.34 }, 8, 6);
    for (const s of [-1, 1]) { b.cyl(0x6b4a2a, { x: s * 0.1, y: 1.85, z: 0.45, sy: 0.4, rz: -s * 0.4 }, 0.015, 0.02, 4); b.cyl(0x6b4a2a, { x: s * 0.2, y: 1.95, z: 0.5, sy: 0.2, rz: s * 0.5 }, 0.012, 0.015, 4); b.cone(C, { x: s * 0.12, y: 1.68, z: 0.42, sx: 0.08, sy: 0.16, sz: 0.04, rz: -s * 0.9 }, 4); }
    for (let i = 0; i < 7; i++) b.sph(0xfff3df, { x: (i % 2 ? 0.1 : -0.1), y: 1.12, z: -0.3 + i * 0.1, s: 0.06, ao: false }, 4, 3);
  },
  windmill: (b) => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(0x868e96, { x: sx * 0.35, y: 2.0, z: sz * 0.35, sy: 4.05, rz: sx * 0.1, rx: -sz * 0.1 }, 0.035, 0.045, 5);
    for (const y of [1.0, 2.0, 3.0]) { const w = 0.6 * (1 - y / 4.5) + 0.3; for (const s of [-1, 1]) { b.box(0x868e96, { y, z: s * w * 0.95, sx: w * 1.9, sy: 0.04, sz: 0.04 }); b.box(0x868e96, { y, x: s * w * 0.95, sx: 0.04, sy: 0.04, sz: w * 1.9 }); } }
    b.rbox(0x868e96, { y: 4.1, sx: 0.4, sy: 0.15, sz: 0.4 }, 0.03); b.cyl(0x495057, { y: 4.3, z: 0.25, sy: 0.25, rx: Math.PI / 2 }, 0.12, 0.12, 8);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.box(i % 2 ? 0xe9ecef : 0xc92a2a, { x: Math.cos(a) * 0.62, y: 4.3 + Math.sin(a) * 0.62, z: 0.4, sx: 0.9, sy: 0.15, sz: 0.02, rz: a }); }
    b.box(0xe9ecef, { y: 4.3, z: -0.6, sx: 0.02, sy: 0.55, sz: 0.9 }); b.box(0x868e96, { y: 4.3, z: -0.2, sx: 0.03, sy: 0.03, sz: 0.8 });
    b.cyl(0x6c757d, { x: 0.9, y: 0.35, sy: 0.7 }, 0.4, 0.4, 12); b.cyl(0x3b8fd0, { x: 0.9, y: 0.71, sy: 0.02 }, 0.36, 0.36, 12);
  },
  pinktree: (b) => { trunk(b, 1.5, 0.15, 0x6b4a3a); blobs(b, [[0, 2.3, 0, 2.2], [0.9, 2.1, 0.2, 1.5], [-0.9, 2.2, -0.1, 1.6], [0.1, 2.1, 0.9, 1.4], [-0.1, 2.9, -0.2, 1.3]], 0xf7a8c4, 0.06); for (const [x, y, z] of ringSpots(18, 1.5, 2.3)) b.sph(0xfcc2d7, { x, y: y + 0.3, z, s: 0.22, ao: false }, 5, 4); },
  pinkbench: (b) => { seat(b, 1.6, 0xf783ac, false); for (const x of [-0.45, 0.45]) heart(b, x, 0.98, -0.22, 0.6, 0xd6336c); b.rbox(0xf783ac, { y: 0.72, z: -0.22, sx: 1.5, sy: 0.06, sz: 0.05 }, 0.02); },
  heartarch: (b) => {
    for (const s of [-1, 1]) { b.rbox(0xffffff, { x: s * 1.0, y: 0.85, sx: 0.14, sy: 1.7, sz: 0.14 }, 0.03); b.ico(0x3f8f35, { x: s * 1.0, y: 0.3, s: 0.5 }, 1); }
    for (let i = 0; i < 64; i++) {
      const t = i / 64 * Math.PI * 2, hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      if (hy < -4) continue;
      const x = hx * 0.075, y = 1.6 + (hy + 4) * 0.075;
      b.sph([0xf06595, 0xff8fab, 0xd6336c][i % 3], { x, y, z: (i % 3 - 1) * 0.06, s: 0.2, ao: false }, 5, 4);
      if (i % 2) b.ico(0x3f8f35, { x: x * 0.97, y: y - 0.04, z: 0.1, s: 0.14 }, 0);
    }
  },
  pinklamp: (b) => { b.cyl(ROSEGOLD, { y: 1.15, sy: 2.3 }, 0.04, 0.07, 8); b.cyl(ROSEGOLD, { y: 0.1, sy: 0.2 }, 0.16, 0.2, 8); heart(b, 0, 2.5, 0, 0.6, 0xffc9de); b.torus(ROSEGOLD, { y: 2.5, s: 1 }, 0.32, 0.02, 4, 16); },
  flamingo: (b) => { b.cyl(0x3f8f35, { y: 0.03, sy: 0.06 }, 0.7, 0.75, 12); flamingoBird(b, -0.25, 0, 0.4); flamingoBird(b, 0.3, 0.1, -0.5); },
  pinkfountain: (b) => { tiers(b, 0xf8c8d8, GOLD, 1); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.sph(0xf06595, { x: Math.cos(a) * 1.32, y: 0.56, z: Math.sin(a) * 1.32, s: 0.16, ao: false }, 5, 4); } },
  pinkswing: (b) => {
    for (const s of [-1, 1]) { b.cyl(0xffffff, { x: s * 0.9, y: 1.2, z: -0.4, sy: 2.5, rx: -0.2 }, 0.06, 0.08, 6); b.cyl(0xffffff, { x: s * 0.9, y: 1.2, z: 0.4, sy: 2.5, rx: 0.2 }, 0.06, 0.08, 6); b.cyl(0x8a7a5a, { x: s * 0.55, y: 1.5, sy: 1.8 }, 0.012, 0.012, 3); }
    b.cyl(0xffffff, { y: 2.42, sy: 2.1, rz: Math.PI / 2 }, 0.06, 0.06, 6); b.rbox(0xf783ac, { y: 0.6, sx: 1.2, sy: 0.07, sz: 0.4 }, 0.03);
    for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1; b.sph([0xf06595, 0xffc9de, 0xffffff][i % 3], { x: s * 0.55, y: 0.75 + Math.floor(i / 2) * 0.2, s: 0.12, ao: false }, 5, 4); }
    for (let i = 0; i < 10; i++) b.sph([0xf06595, 0xffc9de][i % 2], { x: -0.9 + i * 0.2, y: 2.5, z: (i % 2 - 0.5) * 0.08, s: 0.14, ao: false }, 5, 4);
  },
  pinkgazebo: (b) => pavilion(b, 0xffe3ec, 0xffffff, 0xf783ac, GOLD),
  pinkrug: (b) => { rugOf(b, [0xf783ac, 0xffc9de, 0xffffff, 0xf06595], 0xffffff); for (let i = 0; i < 6; i++) b.sph(0xd6336c, { x: -0.6 + (i % 3) * 0.6, y: 0.045, z: i < 3 ? -0.3 : 0.3, sx: 0.16, sy: 0.02, sz: 0.16, ao: false }, 6, 3); },
};
const i2c = (i) => [0xe03131, 0xff6b3a, 0xd6336c][Math.abs(Math.floor(i * 3)) % 3];

// where ripe fruit hangs (per fruit tree) and its colour
const FRUIT = { mango: [0xffb627, 1.1, 2.2], guava: [0xb9e07a, 0.9, 1.5], ber: [0xc9893a, 0.9, 1.35], orange: [0xff9f1c, 0.9, 1.6], jamun: [0x5b2a86, 1.2, 2.3] };
const SWAY = new Set(['neem', 'ashoka', 'peepal', 'mango', 'guava', 'ber', 'gulmohar', 'orange', 'palm', 'jamun', 'bamboo', 'banyan', 'pot', 'marigold', 'rose', 'mogra', 'hedge', 'sunflowers', 'lotus', 'pinktree']);

const geoCache = {};
export function decorGeometry(k) {
  if (geoCache[k]) return geoCache[k];
  const b = new Builder(0.03, { ao: 0.2, aoH: 0.7 });
  MODELS[k](b);
  return (geoCache[k] = b.build());
}
function fruitGeometry(k) {
  const key = k + ':fruit';
  if (geoCache[key]) return geoCache[key];
  const [col, h, s] = FRUIT[k], b = new Builder(0.02, { ao: 0 });
  for (const [x, y, z] of ringSpots(DECOR[k].fruit.n + 3, s * 0.62, h + s * 0.2)) b.sph(col, { x, y, z: z + 0.1, s: 0.2, ao: false }, 6, 5);
  return (geoCache[key] = b.build());
}

// ---------------------------------------------------------------- the manager
const MAT_RIGID = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true });
const MAT_SWAY = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true, sway: 0.55 });
const ghostMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.65, depthWrite: false });
const ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const PEN_BOX = { coop: [6, 5], tabela: [8, 6], bakri: [6, 5], bhed: [7, 5] };
// rectangles nobody may build on: the Mandi, godown lane, farmhouse, workshops row, the Gurdwara, roads
const ZONES = [
  [1.5, 19.5, -12, 9.5], [2.5, 12, -23, -12], [-1, 22, 5, 15], [-17, 39, 13, 27.5], [-23.5, 17.5, -64.5, -27], [-60, 50, -28.5, -18.5],
  [7.5, 14.5, 0, 48], [-1, 16, 27, 48], [15.5, 19.5, 2, 5], [-17.5, -13, 20, 25.5], [1, 9, -9, -2.5], [-7, -2, -5, 1],
];
const SPOTS = [[23, 3, 7], [5.2, 3.4, 3.5], [7.7, 15.7, 2.8], [2.5, 6, 2.5], [POS.gopalAct[0], POS.gopalAct[1], 3.5], [-31, 37, 7.5]];     // x, z, radius
const EDGE = { x0: -38.5, x1: 40, z0: -64.5, z1: 46.5 };
const GRID = 0.8;      // grid snapping: paving tiles (1.55 m) line up two squares apart

export class Decor {
  constructor(game, list = game.state.decor, { view = false } = {}) {
    this.game = game;
    this.view = view;                       // a friend's farm: look only
    this.list = list;
    this.meshes = {};
    this.fruitMeshes = {};
    this.cols = new Map();
    this.glowRefs = new Map();
    this.placing = null;
    this.near = null;
    this.sprayT = 0;
    this.root = new THREE.Group();
    game.scene.add(this.root);
    this.rebuild();
    if (view) return;
    game.actions.add({ label: () => `${DECOR[this.near?.k]?.icon || '🪴'} ${DECOR[this.near?.k]?.name || ''}`, pos: () => this.nearPos || _far, r: 2.4, visible: () => !!this.near && !this.placing && !!this.nearPos && !this.fruitReady(this.near),
      onPress: () => { game.ui.decorItem = this.near; game.ui.open('decor'); } });
    game.actions.add({ label: () => `${ITEMS[DECOR[this.ripe?.k]?.fruit?.item]?.icon || '🍎'} Pick ${DECOR[this.ripe?.k]?.name?.replace(' tree', '') || 'fruit'}`, pos: () => this.ripePos || _far, r: 2.6, visible: () => !!this.ripe && !this.placing,
      onPress: () => this.pick(this.ripe) });
    for (const id of ['placeYes', 'placeNo', 'placeRot']) { const el = $(id); if (!el) continue; el.addEventListener('pointerdown', (e) => e.stopPropagation()); }
    $('placeYes')?.addEventListener('click', (e) => { e.stopPropagation(); this.confirm(); });
    $('placeNo')?.addEventListener('click', (e) => { e.stopPropagation(); this.cancel(); });
    $('placeRot')?.addEventListener('click', (e) => { e.stopPropagation(); this.rotate(); });
    $('placeSnap')?.addEventListener('pointerdown', (e) => e.stopPropagation());
    $('placeSnap')?.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSnap(); });
    setTimeout(() => this.checkBeauty(), 1500);
  }

  meshFor(k) {
    if (this.meshes[k]) return this.meshes[k];
    const m = new THREE.InstancedMesh(decorGeometry(k), SWAY.has(k) ? MAT_SWAY : MAT_RIGID, DECOR_MAX);
    m.castShadow = !(DECOR[k].flat || DECOR[k].cat.match(/path|season/)) || k === 'bonfire';
    m.receiveShadow = true; m.frustumCulled = false; m.count = 0;
    this.root.add(m);
    return (this.meshes[k] = m);
  }
  fruitMeshFor(k) {
    if (this.fruitMeshes[k]) return this.fruitMeshes[k];
    const m = new THREE.InstancedMesh(fruitGeometry(k), MAT_SWAY, DECOR_MAX);
    m.frustumCulled = false; m.count = 0;
    this.root.add(m);
    return (this.fruitMeshes[k] = m);
  }

  // Write every instance matrix, collider and lamp glow from the list (at most 120 items)
  rebuild() {
    const counts = {}, fcounts = {};
    for (const m of Object.values(this.meshes)) m.count = 0;
    for (const m of Object.values(this.fruitMeshes)) m.count = 0;
    const now = Date.now(), tall = [];
    const ids = new Set();
    for (const d of this.list) {
      const D = DECOR[d.k];
      if (!D || d.id === this.movingId) continue;
      ids.add(d.id);
      const m = this.meshFor(d.k), i = counts[d.k] = (counts[d.k] || 0);
      _m.compose(_p.set(d.x, 0, d.z), _q.setFromEuler(_e.set(0, d.ry || 0, 0)), _s.set(1, 1, 1));
      m.setMatrixAt(i, _m);
      counts[d.k]++;
      if (D.fruit && this.ripeNow(d, now)) {
        const fm = this.fruitMeshFor(d.k), j = fcounts[d.k] = (fcounts[d.k] || 0);
        fm.setMatrixAt(j, _m); fcounts[d.k]++;
      }
      if (D.solid && !this.cols.has(d.id)) { const c = { x: d.x, z: d.z, r: D.solid, decor: d.id }; this.cols.set(d.id, c); this.game.colliders.push(c); }
      if (D.glow && !this.glowRefs.has(d.id)) { const g = [d.x, D.glow[0], d.z, D.glow[1]]; this.glowRefs.set(d.id, g); this.game.glows.push(g); this.glowsDirty = true; }
      if (/tree|statue|royal|water|prem|pink/.test(D.cat) && (D.solid || 0) > 0.2) tall.push([d.x - D.solid * 1.2, d.z - D.solid * 1.2, d.x + D.solid * 1.2, d.z + D.solid * 1.2, D.cat === 'tree' ? 3.2 : 2.2]);
    }
    for (const [id, c] of [...this.cols]) if (!ids.has(id)) { const i = this.game.colliders.indexOf(c); if (i >= 0) this.game.colliders.splice(i, 1); this.cols.delete(id); }
    for (const [id, g] of [...this.glowRefs]) if (!ids.has(id)) { const i = this.game.glows.indexOf(g); if (i >= 0) this.game.glows.splice(i, 1); this.glowRefs.delete(id); this.glowsDirty = true; }
    for (const [k, m] of Object.entries(this.meshes)) { m.count = counts[k] || 0; m.instanceMatrix.needsUpdate = true; }
    for (const [k, m] of Object.entries(this.fruitMeshes)) { m.count = fcounts[k] || 0; m.instanceMatrix.needsUpdate = true; }
    this.game.seeThrough?.setDynamic(tall);
    if (this.glowsDirty) { this.game.life?.refreshGlows(); this.glowsDirty = false; }
    this.ripeSig = this.list.map((d) => d.id + (this.ripeNow(d, now) ? 1 : 0)).join();
    this.beauty = beautyScore(this.list);
  }

  // ---------- the store (bought items put away to place again later, free)
  get deco() { return this.game.state.deco; }
  stored(k) { return this.deco?.inv[k] || 0; }
  storedCount() { return Object.values(this.deco?.inv || {}).reduce((a, n) => a + n, 0); }
  store(d) {
    this.list.splice(this.list.indexOf(d), 1);
    this.deco.inv[d.k] = this.stored(d.k) + 1;
    this.rebuild();
    this.game.save(true);
  }
  // beauty tiers pay a gift once each; the paid tier only ever goes up
  checkBeauty() {
    const g = this.game, st = g.state;
    if (this.view || !st.deco) return;
    const tier = beautyTier(this.beauty);
    st.stats.beauty = Math.max(st.stats.beauty || 0, this.beauty);
    st.stats.pinkDecor = this.list.filter((d) => DECOR[d.k].cat === 'pink').length;
    if (tier <= st.deco.tier) return;
    let money = 0, xp = 0;
    for (let i = st.deco.tier + 1; i <= tier; i++) { money += BEAUTY_TIERS[i].money; xp += BEAUTY_TIERS[i].xp; }
    st.deco.tier = tier;
    st.money += money;
    g.addXP(xp);
    g.ui.money();
    g.audio.play('yay');
    g.ui.toast(`🌸 Your farm is now ${BEAUTY_TIERS[tier].name}! Beauty ${this.beauty} · +₹${money.toLocaleString('en-IN')} · +${xp} XP`, 4);
    g.save(true);
  }

  ripeNow(d, now = Date.now()) { const f = DECOR[d.k]?.fruit; return !!f && now - d.t >= f.every * 1000; }
  fruitReady(d) { return !!d && this.ripeNow(d); }
  untilRipe(d) { const f = DECOR[d.k].fruit; return Math.max(0, Math.ceil((d.t + f.every * 1000 - Date.now()) / 1000)); }
  count(k) { return this.list.filter((d) => d.k === k).length; }

  pick(d) {
    const g = this.game, f = DECOR[d.k].fruit;
    if (!f || !this.ripeNow(d)) return;
    const cargo = g.activeCargo();
    if (cargo.items.length + f.n > cargo.cap) { g.ui.toast('Bag is too full for the fruit'); g.audio.play('error'); return; }
    for (let i = 0; i < f.n; i++) cargo.items.push(f.item);
    d.t = Date.now();
    g.carryDirty = true; g.vehicleCargoDirty();
    g.audio.play('pop');
    g.fx.leaves(d.x, d.z, 0x6dbb3c);
    g.addXP(3);
    g.emit('fruit', { n: f.n });
    g.ui.toast(`${ITEMS[f.item].icon} Picked ${f.n} ${ITEMS[f.item].name}`, 1.8);
    this.rebuild();
    g.save();
  }

  // ---------- where may something stand?
  placeError(x, z, k, skipId = null) {
    const g = this.game, D = DECOR[k], r = D.r;
    if (x < EDGE.x0 + r * 0.3 || x > EDGE.x1 - r * 0.3 || z < EDGE.z0 + r * 0.3 || z > EDGE.z1 - r * 0.3) return 'Too close to the edge of the farm';
    if (onRing(x, z)) return 'Not on the road';
    if (g.farm.fieldAt(x, z, r * 0.45 + 0.5)) return 'Keep clear of the fields';
    for (const [id, [w, d]] of Object.entries(PEN_BOX)) { const [cx, cz] = POS.pens[id]; if (Math.abs(x - cx) < w / 2 + 1.4 + r * 0.3 && Math.abs(z - cz) < d / 2 + 3.4 + r * 0.3) return 'Animals need that space'; }
    for (const [cx, cz] of Object.values(POS.buildings)) if (Math.abs(x - cx) < 5.6 + r * 0.3 && z > cz - 4.8 - r * 0.3 && z < cz + 6.6 + r * 0.3) return 'Workshops need that space';
    for (const [x0, x1, z0, z1] of ZONES) if (x > x0 - r * 0.3 && x < x1 + r * 0.3 && z > z0 - r * 0.3 && z < z1 + r * 0.3) return 'People walk here';
    for (const [sx, sz, sr] of SPOTS) if (Math.hypot(x - sx, z - sz) < sr + r * 0.3) return 'Too close to a shop';
    for (const c of g.colliders) {
      if (c.decor && c.decor === skipId) continue;
      const rr = r * 0.5;
      if (c.r !== undefined) { if (Math.hypot(c.x - x, c.z - z) < c.r + rr) return 'Something is in the way'; }
      else if (x > c.x0 - rr && x < c.x1 + rr && z > c.z0 - rr && z < c.z1 + rr) return 'Something is in the way';
    }
    for (const p of g.pads.list) if (p.visible() && Math.hypot(p.x - x, p.z - z) < p.r + 0.9 + r * 0.3) return 'Too close to a pad';
    for (const a of g.actions.list) { if (a.decorSelf || !a.visible()) continue; const p = typeof a.pos === 'function' ? a.pos() : a; if (!p) continue; if (p.x !== undefined && a.r < 4 && Math.hypot(p.x - x, p.z - z) < a.r * 0.6 + r * 0.3 && !(p === _far)) return 'Too close to something you use'; }
    for (const o of this.list) {
      if (o.id === skipId) continue;
      const fk = DECOR[o.k], flat = (F) => F.flat || F.cat === 'path' || F.cat === 'season';
      const need = (flat(D) || flat(fk)) ? (D.r + fk.r) * 0.42 : (D.r + fk.r) * 0.55;
      if (Math.hypot(o.x - x, o.z - z) < need) return 'Too close to another decoration';
    }
    return '';
  }

  // ---------- placing: a ghost stands in front of the farmer, tied to the same Place / Cancel bar the scarecrows use
  buyError(k) {
    const D = DECOR[k], st = this.game.state;
    if (!D) return 'Unknown item';
    if (st.level < D.level) return `Unlocks at level ${D.level}`;
    if (D.bty && Math.max(this.beauty || 0, st.stats.beauty || 0) < D.bty) return `Needs farm beauty ${D.bty}`;
    if (D.tokens ? st.garden.tokens < D.tokens : st.money < D.cost) return D.tokens ? 'Not enough Baradari roses' : 'Not enough money';
    return '';
  }
  start(k, existing = null, fromStore = false) {
    const g = this.game, D = DECOR[k];
    if (!D) return 'Unknown item';
    if (g.visit) return 'Not while visiting';
    if (g.player.vehicle) return 'Get off the vehicle first';
    if (!existing) {
      if (this.list.length >= DECOR_MAX) return `You can place ${DECOR_MAX} items`;
      if (fromStore) { if (!this.stored(k)) return 'None in the store'; }
      else { const e = this.buyError(k); if (e) return e; }
    }
    g.scarecrows?.cancel(true);
    this.cancel(true);
    const ghost = new THREE.Mesh(decorGeometry(k), ghostMat);
    const ring = this.ringMesh(0x69db7c, D.r);
    g.scene.add(ghost, ring);
    if (existing) { this.movingId = existing.id; this.rebuild(); }
    this.placing = { k, existing, fromStore: !existing && fromStore, ghost, ring, ry: existing ? existing.ry : 0, ok: false };
    g.ui.close();
    $('placeBar').hidden = false; $('placeRot').hidden = false; this.snapLabel();
    $('action').hidden = true;
    this.updatePlacing();
    g.ui.toast('Walk to where it should go — green means you can place it', 3);
    return '';
  }
  ringMesh(color, r) {
    const gr = new THREE.Group();
    const mk = (geo, o) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false }));
    const a = mk(ringGeo, 0.8), b = mk(discGeo, 0.22);
    a.position.y = b.position.y = 0.07; a.renderOrder = b.renderOrder = -1;
    gr.add(a, b); gr.scale.setScalar(r * 0.55 + 0.25);
    gr.userData.mats = [a.material, b.material];
    return gr;
  }
  updatePlacing() {
    const P = this.placing, g = this.game, pl = g.player, D = DECOR[P.k];
    const ahead = 1.5 + D.r * 0.35;
    let x = pl.pos.x + Math.sin(pl.rot) * ahead, z = pl.pos.z + Math.cos(pl.rot) * ahead;
    if (this.snapOn()) { x = Math.round(x / GRID) * GRID; z = Math.round(z / GRID) * GRID; }
    P.x = x; P.z = z;
    P.ghost.position.set(x, 0, z); P.ghost.rotation.y = P.ry; P.ring.position.set(x, 0, z);
    const why = this.placeError(x, z, P.k, P.existing?.id);
    P.ok = !why;
    for (const mt of P.ring.userData.mats) mt.color.set(P.ok ? 0x69db7c : 0xff6b6b);
    const price = P.existing ? 'free to move' : P.fromStore ? 'from your store' : D.tokens ? `${D.tokens} 🌹` : `₹${D.cost}`;
    $('placeInfo').innerHTML = why ? `⚠️ ${why}` : `${D.icon} ${D.name} · ${price}`;
    $('placeYes').disabled = !P.ok;
  }
  rotate() { const P = this.placing; if (!P) return; P.ry = (P.ry + (this.snapOn() ? Math.PI / 4 : Math.PI / 12)) % (Math.PI * 2); this.game.audio.play('click'); this.updatePlacing(); }
  snapOn() { return this.deco?.snap !== false; }
  toggleSnap() { if (!this.deco) return; this.deco.snap = !this.snapOn(); this.snapLabel(); this.game.audio.play('click'); if (this.placing) this.updatePlacing(); this.game.save(); }
  snapLabel() { const el = $('placeSnap'); if (!el) return; el.hidden = !this.placing; el.textContent = this.snapOn() ? '▦ Grid on' : '✥ Free'; }
  confirm() {
    const P = this.placing, g = this.game, st = g.state;
    if (!P || !P.ok) return;
    const D = DECOR[P.k];
    if (P.existing) {
      Object.assign(P.existing, { x: +P.x.toFixed(2), z: +P.z.toFixed(2), ry: P.ry });
      this.movingId = null;
      g.ui.toast(`${D.icon} Moved`, 1.5);
    } else {
      if (P.fromStore) {
        if (!this.stored(P.k)) { g.ui.toast('None left in the store'); g.audio.play('error'); return; }
        if (--this.deco.inv[P.k] <= 0) delete this.deco.inv[P.k];
      } else {
        if (D.tokens ? st.garden.tokens < D.tokens : st.money < D.cost) { g.ui.toast('Not enough ' + (D.tokens ? 'roses' : 'money')); g.audio.play('error'); return; }
        if (D.tokens) st.garden.tokens -= D.tokens; else st.money -= D.cost;
      }
      const d = { id: makeId(6), k: P.k, x: +P.x.toFixed(2), z: +P.z.toFixed(2), ry: P.ry, t: Date.now() - (D.fruit ? D.fruit.every * 300 : 0) };
      this.list.push(d);
      g.emit('decorPlaced', { key: P.k });
      g.ui.toast(`${D.icon} ${D.name} placed`, 1.8);
    }
    g.ui.money();
    g.audio.play('buy');
    g.fx.sparkle(P.x, 0.6, P.z, 0xffd43b, 10);
    this.rebuild();
    this.clearGhost();
    this.checkBeauty();
    g.save(true);
    if (!P.existing && !P.fromStore && !D.fruit && !D.tokens) this.again = P.k;
  }
  clearGhost() {
    const P = this.placing;
    if (!P) return;
    this.game.scene.remove(P.ghost, P.ring);
    this.placing = null;
    $('placeBar').hidden = true; $('placeRot').hidden = true; if ($('placeSnap')) $('placeSnap').hidden = true;
  }
  cancel(quiet = false) {
    const P = this.placing;
    if (!P) return;
    if (P.existing) { this.movingId = null; this.rebuild(); }
    this.clearGhost();
    if (!quiet) this.game.ui.toast('Cancelled', 1.2);
  }

  // ---------- one placed item (from its panel)
  remove(d) {
    const g = this.game, D = DECOR[d.k];
    const back = Math.floor((D.tokens || D.cost) * DECOR_REFUND);
    if (D.tokens) g.state.garden.tokens += back; else g.state.money += back;
    this.list.splice(this.list.indexOf(d), 1);
    this.rebuild();
    g.ui.money();
    g.save(true);
    return back;
  }
  turn(d) { d.ry = ((d.ry || 0) + Math.PI / 4) % (Math.PI * 2); this.rebuild(); this.game.save(true); }

  update(dt, t) {
    const g = this.game, p = g.player.pos;
    if (this.placing) this.updatePlacing();
    if (this.view) return;
    // nearest item (to open its panel) and nearest ripe tree (to pick)
    let nd = 2.4, rd = 2.6;
    this.near = null; this.ripe = null;
    const now = Date.now();
    for (const d of this.list) {
      const dist = Math.hypot(p.x - d.x, p.z - d.z) - (DECOR[d.k].solid || 0.3);
      if (d.id === this.movingId) continue;
      if (dist < nd && !(g.player.vehicle)) { nd = dist; this.near = d; this.nearPos = d; }
      if (DECOR[d.k].fruit && this.ripeNow(d, now) && dist < rd) { rd = dist; this.ripe = d; this.ripePos = d; }
    }
    // fruit ripens: redraw when something becomes ripe
    this.chkT = (this.chkT || 0) - dt;
    if (this.chkT <= 0) {
      this.chkT = 2;
      const sig = this.list.map((d) => d.id + (this.ripeNow(d, now) ? 1 : 0)).join();
      if (sig !== this.ripeSig) this.rebuild();
    }
    // fountains spray
    this.sprayT -= dt;
    if (this.sprayT <= 0) {
      this.sprayT = 0.11;
      for (const d of this.list) {
        const D = DECOR[d.k];
        if (!D.spray || Math.hypot(p.x - d.x, p.z - d.z) > 26) continue;
        const h = typeof D.spray === 'number' ? D.spray : d.k === 'royalfountain' ? 2.7 : 2.3, a = Math.random() * 6.28, r = Math.random() * 0.25;
        g.fx.puff(d.x + Math.cos(a) * r, h, d.z + Math.sin(a) * r, { color: 0xe6f6ff, size: 0.22, grow: 0.8, life: 0.8, rise: -1.2, drift: 0.6, alpha: 0.6 });
        g.fx.puff(d.x, h - 0.4, d.z, { color: 0xffffff, size: 0.18, grow: 0.6, life: 0.6, rise: 0.9, drift: 0.35, alpha: 0.5 });
      }
    }
  }
}
const _far = { x: 1e5, z: 1e5 };
export { DECOR };
