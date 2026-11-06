// People: the farmer, customers, managers, vendors, sevadars and sangat.
// Each person is one skinned mesh (a single draw call) on a 33-bone skeleton: hips, spine,
// chest, neck, head, jaw, eyelids, brows and mouth corners, shoulders, upper arms, forearms,
// hands and fingers, thighs, shins and feet (with jutti or bare feet). Limbs bend smoothly at
// the elbows and knees because the vertices near each joint are shared between the two bones.
// Faces blink, look around, smile, frown and talk; walking, running, idling, working, riding
// and bowing are all procedural.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { enhance, makeBlob } from './shading.js';

const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return c.getHex(); };
const CHROME = 0xd8dde3, STEEL = 0xa9b1ba;
export const skinMaterial = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { detail: 0.07, rim: 0.9 });

// ---------------------------------------------------------------- skeleton
// [name, parent, rest position in model space (x, y, z)]
const BONES = [
  ['root', -1, 0, 0, 0],
  ['hips', 'root', 0, 0.92, 0], ['spine', 'hips', 0, 1.08, 0], ['chest', 'spine', 0, 1.27, 0],
  ['neck', 'chest', 0, 1.49, 0], ['head', 'neck', 0, 1.6, 0], ['jaw', 'head', 0, 1.6, 0.03],
  ['lidL', 'head', -0.052, 1.676, 0.13], ['lidR', 'head', 0.052, 1.676, 0.13],
  ['browL', 'head', -0.055, 1.712, 0.13], ['browR', 'head', 0.055, 1.712, 0.13],
  ['mouthL', 'head', -0.03, 1.585, 0.132], ['mouthR', 'head', 0.03, 1.585, 0.132],
];
for (const [s, k] of [['L', -1], ['R', 1]]) {
  BONES.push(
    [`shoulder${s}`, 'chest', k * 0.08, 1.43, 0], [`arm${s}`, `shoulder${s}`, k * 0.205, 1.42, 0],
    [`fore${s}`, `arm${s}`, k * 0.23, 1.15, 0], [`hand${s}`, `fore${s}`, k * 0.24, 0.92, 0.01],
    [`fing${s}`, `hand${s}`, k * 0.245, 0.85, 0.02],
    [`thigh${s}`, 'hips', k * 0.1, 0.9, 0], [`shin${s}`, `thigh${s}`, k * 0.105, 0.5, 0.01],
    [`foot${s}`, `shin${s}`, k * 0.11, 0.085, 0], [`shoe${s}`, `foot${s}`, k * 0.11, 0.085, 0], [`bare${s}`, `foot${s}`, k * 0.11, 0.085, 0],
  );
}
const IDX = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
const REST = BONES.map((b) => new THREE.Vector3(b[2], b[3], b[4]));

// ---------------------------------------------------------------- geometry binding
// Parts added to the Builder are tagged with a bone, or with a function giving each vertex a
// blend of two bones (for joints); build() turns it all into one skinned geometry.
class Rig {
  constructor() { this.b = new Builder(0.012, { ao: 0.1, aoH: 0.5 }); this.tags = []; this.mark = 0; }
  tag(w) { for (let i = this.mark; i < this.b.parts.length; i++) this.tags[i] = w; this.mark = this.b.parts.length; }
  // the last part's colours get soft vertical folds (kurtas, salwar, dupatta)
  folds(n = 7, amt = 0.1) {
    const p = this.b.parts[this.b.parts.length - 1];
    for (let i = 0; i < p.pos.length; i += 3) { const f = 1 - amt * Math.pow(Math.abs(Math.sin(Math.atan2(p.pos[i], p.pos[i + 2]) * n)), 2); p.col[i] *= f; p.col[i + 1] *= f; p.col[i + 2] *= f; }
  }
  build() {
    let n = 0;
    for (const p of this.b.parts) n += p.pos.length;
    const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n);
    const si = new Uint16Array(n / 3 * 4), sw = new Float32Array(n / 3 * 4);
    let o = 0;
    this.b.parts.forEach((p, k) => {
      pos.set(p.pos, o); nor.set(p.nor, o); col.set(p.col, o);
      const w = this.tags[k] ?? 0;
      for (let i = 0; i < p.pos.length; i += 3) {
        const v = (o + i) / 3 * 4;
        if (typeof w === 'number') { si[v] = w; sw[v] = 1; }
        else { const r = w(p.pos[i], p.pos[i + 1], p.pos[i + 2]); si[v] = r[0]; sw[v] = r[1]; si[v + 1] = r[2]; sw[v + 1] = 1 - r[1]; }
      }
      o += p.pos.length;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.computeBoundingSphere();
    g.boundingSphere.center.set(0, 1.0, 0);
    g.boundingSphere.radius = 1.45;
    return g;
  }
}
// blend from bone a (above `y`) to bone b (below), over ±h metres
const along = (a, b, y, h = 0.06) => (x, vy) => { const t = Math.min(1, Math.max(0, (vy - (y - h)) / (2 * h))); return [IDX[a], t * t * (3 - 2 * t), IDX[b]]; };
const side = (x, l, r) => (x < 0 ? l : r);

// ---------------------------------------------------------------- the person
// o: skin, shirt, pants, hair, vest, turban (null = bare head), beard, dupatta, shoes, apron,
//    sash, glasses, badge, tools, scale — the same looks the game always used
export function makeHuman(o = {}) {
  const skin = o.skin ?? 0xc68a5a, shirt = o.shirt ?? 0xf5f0e1, pants = o.pants ?? 0xf0ece0, hair = o.hair ?? 0x1b1410;
  const woman = !!o.dupatta, R = new Rig(), b = R.b;
  const lip = shade(skin, -0.16), skinL = shade(skin, 0.05);

  // ---- head: skull, jaw, ears, nose, cheeks, eyes with lids, brows, mouth
  b.sph(skin, { y: 1.69, sx: 0.29, sy: 0.31, sz: 0.3 }, 14, 10); R.tag(IDX.head);
  b.sph(skin, { y: 1.61, z: 0.03, sx: 0.235, sy: 0.17, sz: 0.24 }, 12, 8); R.tag((x, y) => [IDX.head, Math.min(1, Math.max(0, (y - 1.57) / 0.05)), IDX.jaw]);
  for (const s of [-1, 1]) b.sph(skin, { x: s * 0.147, y: 1.675, z: -0.005, sx: 0.04, sy: 0.07, sz: 0.035 }, 6, 4);
  b.sph(skin, { y: 1.652, z: 0.142, sx: 0.036, sy: 0.042, sz: 0.045 }, 8, 6);                             // nose
  b.cone(skin, { y: 1.668, z: 0.14, rx: -0.3, sx: 0.026, sy: 0.045, sz: 0.026 }, 6);
  for (const s of [-1, 1]) b.sph(skinL, { x: s * 0.072, y: 1.628, z: 0.112, sx: 0.045, sy: 0.026, sz: 0.03, ao: false }, 6, 4);
  R.tag(IDX.head);
  for (const [s, k] of [['L', -1], ['R', 1]]) {
    const ex = k * 0.052, ey = 1.676, ez = 0.13;
    b.sph(0xf8f4ee, { x: ex, y: ey, z: ez, s: 0.044, ao: false, j: 0 }, 8, 6);
    b.sph(0x3b2414, { x: ex, y: ey - 0.002, z: ez + 0.015, s: 0.026, ao: false, j: 0 }, 8, 6);
    b.sph(0x0d0907, { x: ex, y: ey - 0.002, z: ez + 0.021, s: 0.013, ao: false, j: 0 }, 6, 4);
    b.sph(0xffffff, { x: ex + 0.006, y: ey + 0.006, z: ez + 0.025, s: 0.006, ao: false, j: 0 }, 4, 3);
    R.tag(IDX.head);
    // the upper lid: a skin cap round the eyeball that rolls down to blink
    b.sph(shade(skin, -0.04), { x: ex, y: ey, z: ez, s: 0.05, ao: false, j: 0 }, 8, 4, Math.PI * 2, Math.PI * 0.5); R.tag(IDX['lid' + s]);
    b.box(woman ? 0x2a1a10 : hair, { x: ex, y: 1.712, z: 0.142, sx: 0.06, sy: 0.012, sz: 0.012, rz: k * -0.1, ao: false }); R.tag(IDX['brow' + s]);
  }
  // lips: the corners ride on their own bones for smiles and frowns
  b.torus(lip, { y: 1.588, z: 0.128, rz: Math.PI, s: 1, ao: false, j: 0 }, 0.026, 0.006, 3, 10, Math.PI);
  b.box(shade(lip, 0.08), { y: 1.578, z: 0.126, sx: 0.035, sy: 0.008, sz: 0.01, ao: false, j: 0 });
  R.tag((x) => (Math.abs(x) < 0.008 ? [IDX.jaw, 1, IDX.jaw] : [IDX[side(x, 'mouthL', 'mouthR')], Math.min(1, Math.abs(x) / 0.025), IDX.jaw]));
  if (o.beard !== false && !woman) {
    // full beard round the jaw in layered tufts, a curled moustache
    b.sph(hair, { y: 1.59, z: 0.04, sx: 0.258, sy: 0.2, sz: 0.24, g: 0.05 }, 12, 8, Math.PI * 2, Math.PI * 0.62);
    b.sph(hair, { y: 1.54, z: 0.08, sx: 0.17, sy: 0.15, sz: 0.15, g: 0.05 }, 10, 6);
    for (let i = 0; i < 7; i++) b.cone(shade(hair, (i % 2) * 0.04), { x: -0.06 + i * 0.02, y: 1.475, z: 0.1 - Math.abs(i - 3) * 0.008, rx: Math.PI + 0.25, sx: 0.035, sy: 0.07, sz: 0.03 }, 4);
    for (const s of [-1, 1]) b.sph(hair, { x: s * 0.112, y: 1.635, z: 0.055, sx: 0.045, sy: 0.11, sz: 0.1 }, 6, 4);
    R.tag((x, y) => [IDX.head, Math.min(1, Math.max(0, (y - 1.53) / 0.07)), IDX.jaw]);
    b.capsule(hair, { x: -0.04, y: 1.605, z: 0.146, rz: 1.3, s: 1 }, 0.013, 0.05, 5);
    b.capsule(hair, { x: 0.04, y: 1.605, z: 0.146, rz: -1.3, s: 1 }, 0.013, 0.05, 5);
    for (const s of [-1, 1]) b.sph(hair, { x: s * 0.075, y: 1.611, z: 0.138, s: 0.018 }, 5, 3);
    R.tag(IDX.head);
  }
  if (woman) {
    // centre-parted hair, a long choti (braid) with a paranda tassel, the dupatta over head
    b.sph(hair, { y: 1.71, z: -0.01, sx: 0.305, sy: 0.3, sz: 0.31 }, 12, 8, Math.PI * 2, Math.PI * 0.56);
    b.box(shade(skin, -0.05), { y: 1.83, z: 0.07, sx: 0.006, sy: 0.006, sz: 0.12, rx: 0.5, ao: false });
    R.tag(IDX.head);
    for (let i = 0; i < 6; i++) b.sph(hair, { y: 1.5 - i * 0.07, z: -0.16 - i * 0.004, sx: 0.06, sy: 0.08, sz: 0.05 }, 6, 4);
    b.cone(0xe03131, { y: 1.06, z: -0.19, rx: Math.PI, sx: 0.05, sy: 0.1, sz: 0.04 }, 6);
    R.tag((x, y) => [IDX.head, Math.min(1, Math.max(0, (y - 1.35) / 0.2)), IDX.chest]);
    for (const s of [-1, 1]) b.sph(0xf2c94c, { x: s * 0.15, y: 1.635, z: 0.005, s: 0.02, ao: false }, 5, 3);
    // the dupatta sits back on the head, showing the parting, and falls to the shoulders
    b.sph(o.dupatta, { y: 1.715, z: -0.045, sx: 0.33, sy: 0.32, sz: 0.33, rx: -0.55, g: 0.1 }, 14, 8, Math.PI * 2, Math.PI * 0.6);
    for (const s of [-1, 1]) b.box(o.dupatta, { x: s * 0.15, y: 1.56, z: -0.045, sx: 0.025, sy: 0.24, sz: 0.2, rz: s * 0.12 });
    R.tag(IDX.head);
  } else if (o.turban !== null) {
    // Patiala-shahi pagg: a wrapped band, the crown, layered folds rising to a peak in front
    const t = o.turban ?? 0xe8590c, d1 = shade(t, -0.1), d2 = shade(t, 0.07);
    b.cyl(t, { y: 1.76, sy: 0.09, rx: -0.14 }, 0.158, 0.152, 18);
    b.sph(t, { y: 1.785, z: -0.022, sx: 0.34, sy: 0.25, sz: 0.35, rx: -0.14 }, 14, 8, Math.PI * 2, Math.PI * 0.55);
    b.sph(hair, { y: 1.69, z: -0.012, sx: 0.296, sy: 0.312, sz: 0.306, rx: -0.65 }, 12, 6, Math.PI * 2, Math.PI * 0.5);   // hair under the pagg at the back
    b.sph(d2, { y: 1.815, z: 0.045, sx: 0.22, sy: 0.19, sz: 0.25, rx: 0.3 }, 10, 8);
    for (let i = 0; i < 5; i++) b.torus(i % 2 ? d1 : d2, { y: 1.74 + i * 0.026, z: 0.02 - i * 0.006, rx: Math.PI / 2 - 0.16 - i * 0.07, s: 1 - i * 0.045 }, 0.158, 0.011, 4, 22, Math.PI);
    b.torus(d1, { y: 1.755, rx: Math.PI / 2 + 0.55, ry: 0.35, s: 0.98 }, 0.156, 0.01, 4, 18, Math.PI * 0.55);
    b.cone(t, { y: 1.925, z: 0.04, rx: 0.4, sx: 0.075, sy: 0.075, sz: 0.05 }, 8);
    if (o.badge) b.sph(o.badge, { y: 1.8, z: 0.165, s: 0.035, ao: false }, 6, 4);
    // the hair at the nape and a little sideburn below the pagg
    for (const s of [-1, 1]) b.box(hair, { x: s * 0.142, y: 1.705, z: 0.03, sx: 0.012, sy: 0.05, sz: 0.04, ao: false });
    R.tag(IDX.head);
  } else {
    b.sph(hair, { y: 1.74, z: -0.012, sx: 0.31, sy: 0.27, sz: 0.31 }, 12, 8, Math.PI * 2, Math.PI * 0.5);
    R.tag(IDX.head);
  }
  if (o.glasses) { for (const s of [-1, 1]) b.torus(0x222222, { x: s * 0.052, y: 1.676, z: 0.15, s: 1, ao: false }, 0.03, 0.005, 4, 12); b.box(0x222222, { y: 1.68, z: 0.152, sx: 0.04, sy: 0.005, sz: 0.005 }); R.tag(IDX.head); }
  // neck
  b.cyl(skin, { y: 1.52, sy: 0.14 }, 0.052, 0.06, 10); R.tag(along('head', 'neck', 1.55, 0.04));

  // ---- torso: kurta (or kameez), with a placket and buttons, folds in the skirt
  b.cyl(shirt, { y: 1.3, sy: 0.3, sx: 1.3, sz: 0.88 }, 0.15, 0.135, 12);
  b.sph(shirt, { y: 1.42, sx: 0.4, sy: 0.12, sz: 0.25 }, 12, 5);
  R.tag(along('chest', 'spine', 1.2, 0.06));
  b.cyl(shirt, { y: 1.08, sy: 0.18, sx: 1.22, sz: 0.9 }, 0.135, 0.15, 14);
  R.tag(along('spine', 'hips', 1.0, 0.06));
  b.cyl(shirt, { y: 0.74, sy: 0.46, sx: 1.12, sz: 0.95, g: 0.08 }, 0.17, woman ? 0.27 : 0.235, 18, true);
  R.folds(woman ? 9 : 7, 0.12);
  R.tag((x, y) => { const k = Math.min(1, Math.max(0, (0.96 - y) / 0.42)) * 0.55; return [IDX[side(x, 'thighL', 'thighR')], k, IDX.hips]; });
  b.box(shade(shirt, -0.08), { y: 1.33, z: 0.118, sx: 0.035, sy: 0.18, sz: 0.012, ao: false });
  for (let i = 0; i < 3; i++) b.sph(o.vest ? 0xf2c94c : shade(shirt, -0.25), { y: 1.4 - i * 0.055, z: 0.124, s: 0.017, ao: false }, 6, 4);
  b.torus(shade(shirt, -0.06), { y: 1.47, rx: Math.PI / 2, s: 1, ao: false }, 0.055, 0.012, 4, 14);
  R.tag(IDX.chest);
  if (o.vest) {
    // sadri: sleeveless jacket with a darker trim
    b.cyl(o.vest, { y: 1.22, sy: 0.4, sx: 1.33, sz: 0.92, g: 0.12 }, 0.155, 0.168, 14, true);
    for (const s of [-1, 1]) b.box(shade(o.vest, -0.12), { x: s * 0.045, y: 1.22, z: 0.142, sx: 0.015, sy: 0.38, sz: 0.012 });
    R.tag(along('chest', 'spine', 1.12, 0.08));
  }
  if (o.apron) { b.box(o.apron, { y: 0.98, z: 0.155, sx: 0.26, sy: 0.5, sz: 0.02, rx: -0.06 }); R.tag(along('spine', 'hips', 1.0, 0.1)); }
  if (o.sash) { b.torus(o.sash, { y: 0.97, rx: Math.PI / 2, s: 1, sx: 1.15 }, 0.16, 0.025, 6, 20); R.tag(IDX.hips); }
  if (woman) {
    // the dupatta drapes over both shoulders and down the back
    b.torus(o.dupatta, { y: 1.42, z: 0.0, rx: Math.PI / 2 - 0.3, s: 1, sx: 1.2 }, 0.17, 0.032, 6, 18, Math.PI);
    R.tag(IDX.chest);
    b.box(o.dupatta, { y: 1.18, z: -0.165, sx: 0.32, sy: 0.6, sz: 0.02, rx: 0.08 });
    R.folds(5, 0.12);
    b.box(shade(o.dupatta, 0.15), { y: 0.88, z: -0.18, sx: 0.32, sy: 0.03, sz: 0.022 });
    R.tag(along('chest', 'spine', 1.2, 0.2));
  }

  // ---- arms: long kurta sleeves that bend at the elbow, hands with fingers, the kara
  for (const [s, k] of [['L', -1], ['R', 1]]) {
    b.sph(shirt, { x: k * 0.178, y: 1.415, sx: 0.13, sy: 0.12, sz: 0.13 }, 10, 6); R.tag((x, y) => [IDX['arm' + s], Math.min(1, Math.abs(x) / 0.2), IDX.chest]);
    b.capsule(shirt, { x: k * 0.217, y: 1.285, rz: k * 0.04 }, 0.052, 0.2, 8);
    b.capsule(shirt, { x: k * 0.235, y: 1.04, rz: k * 0.03 }, 0.042, 0.19, 8);
    R.tag((x, y) => { const t = Math.min(1, Math.max(0, (y - 1.11) / 0.08)); return [IDX['arm' + s], t * t * (3 - 2 * t), IDX['fore' + s]]; });
    b.cyl(shade(shirt, -0.05), { x: k * 0.24, y: 0.94, sy: 0.03 }, 0.044, 0.044, 8);
    if (s === 'R' && !woman) b.torus(CHROME, { x: k * 0.24, y: 0.925, rx: Math.PI / 2, s: 1 }, 0.038, 0.007, 4, 12);
    if (woman) for (let i = 0; i < 3; i++) b.torus([0xe03131, 0xf2c94c, 0x2b8a3e][i], { x: k * 0.24, y: 0.93 - i * 0.012, rx: Math.PI / 2, s: 1, ao: false }, 0.036, 0.005, 3, 10);
    R.tag(IDX['fore' + s]);
    // palm and thumb on the hand, four fingers on their own bone so they can curl round a tool
    b.rbox(skin, { x: k * 0.243, y: 0.87, z: 0.012, sx: 0.042, sy: 0.085, sz: 0.072 }, 0.018);
    b.capsule(skin, { x: k * 0.236, y: 0.872, z: 0.055, rx: 0.5, rz: k * 0.3 }, 0.013, 0.04, 5);
    R.tag(IDX['hand' + s]);
    for (let i = 0; i < 4; i++) b.capsule(skin, { x: k * 0.245, y: 0.808, z: -0.016 + i * 0.019 }, 0.011, 0.05 - Math.abs(i - 1.5) * 0.007, 5);
    R.tag(IDX['fing' + s]);
  }

  // ---- legs: pajama / salwar that bends at the knee, jutti or bare feet
  for (const [s, k] of [['L', -1], ['R', 1]]) {
    const w = woman ? 1.18 : 1;
    b.capsule(pants, { x: k * 0.1, y: 0.7, sx: w, sz: w }, 0.072, 0.3, 8);
    b.capsule(pants, { x: k * 0.105, y: 0.3, sx: w, sz: w }, 0.06, 0.32, 8);
    R.tag((x, y) => { const t = Math.min(1, Math.max(0, (y - 0.45) / 0.1)); return [IDX['thigh' + s], t * t * (3 - 2 * t), IDX['shin' + s]]; });
    b.cyl(shade(pants, -0.04), { x: k * 0.106, y: 0.12, sy: 0.05 }, 0.055, 0.058, 8); R.tag(IDX['shin' + s]);
    // jutti with a curled toe and gold thread
    const sh = o.shoes ?? 0x7a4a22;
    b.rbox(sh, { x: k * 0.11, y: 0.045, z: 0.04, sx: 0.1, sy: 0.07, sz: 0.24 }, 0.025);
    b.cone(sh, { x: k * 0.11, y: 0.06, z: 0.175, rx: -1.25, sx: 0.035, sy: 0.08, sz: 0.03 }, 5);
    b.box(0xf2c94c, { x: k * 0.11, y: 0.083, z: 0.07, sx: 0.07, sy: 0.012, sz: 0.08, ao: false });
    R.tag(IDX['shoe' + s]);
    b.rbox(skin, { x: k * 0.11, y: 0.035, z: 0.045, sx: 0.085, sy: 0.05, sz: 0.21 }, 0.02);
    for (let i = 0; i < 4; i++) b.sph(shade(skin, -0.03), { x: k * 0.11 - 0.03 + i * 0.02, y: 0.028, z: 0.155, s: 0.022 - i * 0.002 }, 5, 3);
    R.tag(IDX['bare' + s]);
  }

  // ---- skeleton and mesh
  const bones = BONES.map(([name], i) => { const bn = new THREE.Bone(); bn.name = name; return bn; });
  BONES.forEach(([, parent], i) => {
    if (parent === -1) return;
    const p = IDX[parent];
    bones[p].add(bones[i]);
    bones[i].position.copy(REST[i]).sub(REST[p]);
  });
  const geo = R.build();
  const mesh = new THREE.SkinnedMesh(geo, skinMaterial);
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;           // the bounding sphere (round the body at rest) is generous enough for every pose
  const group = new THREE.Group();
  group.add(mesh);
  const B = Object.fromEntries(BONES.map(([name], i) => [name, bones[i]]));
  B.bareL.scale.setScalar(0.001); B.bareR.scale.setScalar(0.001);

  // ---- tools in the right hand (separate meshes so only the one in use is drawn)
  const tools = {};
  if (o.tools) {
    const hand = new THREE.Group();
    hand.position.set(0.005, -0.05, 0.03);
    B.handR.add(hand);
    const tb = new Builder(0.02, { ao: 0 });
    tb.cyl(0x9b6b3c, { y: 0, z: 0.3, rx: Math.PI / 2, sy: 0.9 }, 0.02, 0.02, 6);                   // kahi
    tb.rbox(0x8a9399, { y: -0.1, z: 0.75, sx: 0.24, sy: 0.2, sz: 0.03, rx: 0.2 }, 0.01);
    tools.hoe = tb.mesh();
    tb.cyl(0x2f9e5a, { y: -0.04, z: 0.1, sy: 0.25 }, 0.11, 0.12, 14);                                // watering can
    tb.cyl(0x2f9e5a, { y: 0.03, z: 0.32, rx: 1.1, sy: 0.34 }, 0.02, 0.035, 6);
    tb.cyl(0x23784a, { y: 0.12, z: 0.51, rx: 1.1, sy: 0.05 }, 0.05, 0.025, 8);
    tb.torus(0x23784a, { y: 0.12, z: 0.1, ry: Math.PI / 2 }, 0.085, 0.015, 4, 10, Math.PI);
    tools.can = tb.mesh();
    tb.cyl(0x6b4a2b, { y: -0.06, sy: 0.17 }, 0.02, 0.02, 6);                                        // darati
    tb.torus(0xd5dade, { y: 0.09, z: 0.12, ry: Math.PI / 2, rz: 0.6 }, 0.14, 0.013, 3, 12, Math.PI * 1.1);
    tools.sickle = tb.mesh();
    tb.sph(0xd9c49a, { y: -0.1, sx: 0.2, sy: 0.25, sz: 0.17 }, 8, 6);                              // seed bag
    tb.cyl(0xa98a55, { y: 0.03, sy: 0.05 }, 0.04, 0.07, 6);
    tools.seed = tb.mesh();
    tb.rbox(0xc92a2a, { y: -0.05, z: 0.08, sx: 0.05, sy: 0.27, sz: 0.2, rx: -0.3 }, 0.012);          // bahi-khata
    tb.box(0xfff3d6, { y: -0.05, z: 0.08, sx: 0.055, sy: 0.25, sz: 0.17, rx: -0.3, x: 0.004 });
    tools.book = tb.mesh();
    tb.box(STEEL, { y: -0.02, z: 0.13, sx: 0.035, sy: 0.035, sz: 0.3 });                            // spanner
    tb.torus(STEEL, { y: -0.02, z: 0.32, ry: Math.PI / 2 }, 0.04, 0.016, 4, 10, Math.PI * 1.5);
    tools.wrench = tb.mesh();
    tb.cyl(CHROME, { y: -0.17, sy: 0.2 }, 0.13, 0.1, 14);                                           // steel balti
    tb.torus(STEEL, { y: -0.02 }, 0.1, 0.008, 4, 12, Math.PI);
    tb.cyl(0xd9b45a, { y: -0.08, sy: 0.02 }, 0.12, 0.12, 12);
    tools.bucket = tb.mesh();
    for (const k in tools) { hand.add(tools[k]); tools[k].visible = false; tools[k].castShadow = true; }
  }
  const blob = makeBlob(0.75, 0.65);
  group.add(blob);
  if (o.scale) group.scale.setScalar(o.scale);
  const h = {
    group, mesh, bones: B, tools, blob,
    // the names older code moves directly
    body: B.spine, armL: B.armL, armR: B.armR, legL: B.thighL, legR: B.thighR,
    face: { blink: 2 + Math.random() * 3, lid: 0, look: 0, lookT: 2 + Math.random() * 4, lookTo: 0, expr: 'neutral', exprT: 0, talk: 0 },
    setBarefoot(bare) { for (const s of ['L', 'R']) { B['shoe' + s].scale.setScalar(bare ? 0.001 : 1); B['bare' + s].scale.setScalar(bare ? 1 : 0.001); } },
    expr(name, secs = 2.5) { this.face.expr = name; this.face.exprT = secs; },
    talk(secs = 1.5) { this.face.talk = secs; },
  };
  return h;
}

// ---------------------------------------------------------------- animation
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => x * x * (3 - 2 * x);
function rest(h) {
  const B = h.bones;
  for (const k in B) { if (k !== 'root') B[k].rotation.set(0, 0, 0); }
  B.hips.position.set(0, REST[IDX.hips].y, 0);
  B.armL.rotation.z = -0.08; B.armR.rotation.z = 0.08;
}

// Face: blinking, glancing about, expressions and talking
function animateFace(h, t, dt) {
  const F = h.face, B = h.bones;
  F.blink -= dt;
  if (F.blink <= 0) { F.blink = 2.2 + Math.random() * 3.5; F.lid = 0.14; }
  F.lid = Math.max(0, F.lid - dt);
  F.lookT -= dt;
  if (F.lookT <= 0) { F.lookT = 2 + Math.random() * 4; F.lookTo = Math.random() < 0.5 ? 0 : (Math.random() - 0.5) * 1.1; }
  F.look = lerp(F.look, F.lookTo, Math.min(1, dt * 3));
  if (F.exprT > 0) F.exprT -= dt; else F.expr = 'neutral';
  const e = F.expr;
  const smile = e === 'smile' || e === 'happy' ? 1 : 0, sad = e === 'sad' ? 1 : 0, angry = e === 'angry' ? 1 : 0, wow = e === 'surprised' ? 1 : 0, shut = e === 'calm' ? 1 : 0;
  const closed = F.lid > 0 || shut ? 1 : 0;
  const lid = closed ? 0.42 : lerp(-0.85, -0.6, smile * 0.6) + wow * -0.2;
  B.lidL.rotation.x = B.lidR.rotation.x = lid;
  const browY = 0.012 * (e === 'happy' ? 1 : 0) + 0.016 * wow - 0.008 * angry + 0.004 * sad;
  B.browL.position.y = REST[IDX.browL].y - REST[IDX.head].y + browY;
  B.browR.position.y = B.browL.position.y;
  B.browL.rotation.z = -0.25 * angry + 0.25 * sad; B.browR.rotation.z = -B.browL.rotation.z;
  const corner = 0.012 * smile - 0.012 * sad - 0.004 * angry;
  B.mouthL.position.y = B.mouthR.position.y = REST[IDX.mouthL].y - REST[IDX.head].y + corner;
  B.mouthL.position.x = REST[IDX.mouthL].x - smile * 0.006; B.mouthR.position.x = REST[IDX.mouthR].x + smile * 0.006;
  if (F.talk > 0) F.talk -= dt;
  B.jaw.rotation.x = F.talk > 0 ? Math.max(0, Math.sin(t * 17)) * 0.16 : wow * 0.18 + (e === 'happy' ? 0.06 : 0);
}

// Walk / run / idle / work / sit, shared by the farmer and everyone else. Same call as before:
// speed in m/s, work 0..1 through a swing, sit for vehicles.
export function animateHuman(h, t, speed, work = 0, sit = false) {
  if (!h.bones) return;
  const dt = Math.min(0.1, Math.max(0, t - (h.lastT ?? t))) || 0.016;
  h.lastT = t;
  const B = h.bones;
  rest(h);
  animateFace(h, t, dt);
  if (sit) {
    B.hips.position.y -= 0.16;
    B.thighL.rotation.x = B.thighR.rotation.x = -1.45;
    B.shinL.rotation.x = B.shinR.rotation.x = 1.35;
    B.armL.rotation.x = B.armR.rotation.x = -0.75;
    B.foreL.rotation.x = B.foreR.rotation.x = -0.45;
    B.fingL.rotation.x = B.fingR.rotation.x = 1.2;
    B.head.rotation.y = h.face.look * 0.5;
    h.blob.visible = false;
    return;
  }
  h.blob.visible = true;
  const s = Math.min(1, speed / 4), run = Math.max(0, Math.min(1, (speed - 4.2) / 1.6));
  h.ph = (h.ph || 0) + dt * (5.6 + speed * 1.25);
  const ph = h.ph;
  for (const [L, k] of [['L', 0], ['R', Math.PI]]) {
    const p = ph + k, sw = Math.sin(p);
    // legs: swing at the hip, the knee folds as the foot comes through, the foot stays level
    const amp = lerp(0.5, 0.82, run) * s;
    B['thigh' + L].rotation.x = sw * amp - run * 0.15;
    const knee = (Math.max(0, Math.sin(p + 1.9)) * lerp(0.75, 1.5, run) + 0.08) * s;
    B['shin' + L].rotation.x = knee;
    B['foot' + L].rotation.x = -(sw * amp) * 0.4 - knee * 0.35 + Math.max(0, -sw) * 0.25 * s;
    // arms: swing against the legs, elbows bend more when running
    const arm = -sw * lerp(0.45, 0.85, run) * s;
    B['arm' + (L === 'L' ? 'R' : 'L')].rotation.x = arm;
    B['fore' + (L === 'L' ? 'R' : 'L')].rotation.x = -(0.18 + run * 1.0 + Math.max(0, -arm) * 0.35) * Math.max(0.35, s);
  }
  // hips bob twice a stride and twist; the chest twists back; lean into a run
  B.hips.position.y += (Math.abs(Math.cos(ph)) * lerp(0.035, 0.06, run) - 0.02 * run) * s;
  B.hips.rotation.y = Math.sin(ph) * 0.13 * s;
  B.hips.rotation.z = Math.sin(ph) * 0.035 * s;
  B.chest.rotation.y = -Math.sin(ph) * 0.17 * s;
  B.spine.rotation.x = run * 0.16;
  B.head.rotation.x = -run * 0.1;
  B.fingL.rotation.x = B.fingR.rotation.x = 0.5 + run * 0.6;
  if (s < 0.05) {
    // idle: breathing, a slow weight shift, relaxed arms, glancing about
    const br = Math.sin(t * 1.7);
    B.chest.rotation.x = br * 0.018;
    B.chest.scale.set(1 + br * 0.01, 1, 1 + br * 0.012);
    B.hips.position.x = Math.sin(t * 0.37 + (h.seed || 0)) * 0.018;
    B.hips.rotation.z = Math.sin(t * 0.37 + (h.seed || 0)) * 0.025;
    B.thighL.rotation.z = -0.02 + B.hips.rotation.z * 0.6; B.thighR.rotation.z = 0.02 + B.hips.rotation.z * 0.6;
    B.foreL.rotation.x = B.foreR.rotation.x = -0.14 - br * 0.02;
    B.armL.rotation.x = B.armR.rotation.x = Math.sin(t * 0.9) * 0.02;
    B.fingL.rotation.x = B.fingR.rotation.x = 0.35;
  } else B.chest.scale.set(1, 1, 1);
  B.neck.rotation.y = h.face.look * 0.35;
  B.head.rotation.y = h.face.look * 0.45;
  if (work > 0) {
    // a two-handed swing (hoe, sickle, watering): the right arm drives, the left steadies
    const w = Math.sin(work * Math.PI), up = 1 - w;
    B.armR.rotation.x = -1.35 + w * 1.2;
    B.foreR.rotation.x = -0.5 - up * 0.5;
    B.armL.rotation.x = -0.75 + w * 0.5;
    B.foreL.rotation.x = -0.7;
    B.spine.rotation.x += 0.08 + w * 0.18;
    B.chest.rotation.y += -0.15 + w * 0.2;
    B.fingR.rotation.x = 1.3; B.fingL.rotation.x = 1.0;
  } else if (h.tools && Object.values(h.tools).some((m) => m.visible)) B.fingR.rotation.x = 1.3;
}

// On the Bullet: hands on the handlebar, feet on the pegs, leaning into the ride
export function poseRide(h, brake = 0, throttle = 0) {
  const B = h.bones;
  B.hips.position.y = REST[IDX.hips].y - 0.16;
  B.thighL.rotation.x = B.thighR.rotation.x = -1.25;
  B.thighL.rotation.z = -0.12; B.thighR.rotation.z = 0.12;
  B.shinL.rotation.x = B.shinR.rotation.x = 1.15;
  B.armL.rotation.x = B.armR.rotation.x = -1.05;
  B.armL.rotation.z = -0.32; B.armR.rotation.z = 0.32;
  B.foreL.rotation.x = B.foreR.rotation.x = -0.35;
  B.fingL.rotation.x = B.fingR.rotation.x = 1.35;
  B.spine.rotation.x = 0.12 + brake * 0.08 + Math.max(0, throttle) * 0.05;
  B.head.rotation.x = -0.1 - brake * 0.05;
}

// Matha tekna: kneel, hands together, then bow the forehead to the floor (eyes closed)
export function poseBow(h, kneel, bend) {
  const B = h.bones;
  B.hips.position.y = REST[IDX.hips].y - 0.46 * kneel - 0.12 * bend;
  B.thighL.rotation.x = B.thighR.rotation.x = -0.2 * kneel - 0.9 * bend;
  B.shinL.rotation.x = B.shinR.rotation.x = 1.75 * kneel + 0.5 * bend;
  B.footL.rotation.x = B.footR.rotation.x = 0.7 * kneel;
  B.spine.rotation.x = 0.4 * bend;
  B.chest.rotation.x = 0.55 * bend;
  B.head.rotation.x = 0.3 * bend;
  B.armL.rotation.x = B.armR.rotation.x = -0.5 * kneel - 1.0 * bend;
  B.armL.rotation.z = -0.25 * kneel * (1 - bend); B.armR.rotation.z = 0.25 * kneel * (1 - bend);
  B.foreL.rotation.x = B.foreR.rotation.x = -1.2 * kneel * (1 - bend) - 0.3 * bend;
  h.face.expr = kneel > 0.3 ? 'calm' : h.face.expr;
}
