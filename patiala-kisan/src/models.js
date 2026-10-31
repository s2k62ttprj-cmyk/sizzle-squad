// Procedural 3D models: people, animals, vehicles and small props.
// Everything faces +z with its origin at ground level.
import * as THREE from 'three';
import { Builder, vcMaterial } from './geo.js';
import { makeBlob } from './shading.js';

export const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return c.getHex();
};
const CHROME = 0xd8dde3, STEEL = 0xa9b1ba, DARK = 0x26262b;

// ---------------------------------------------------------------- people
// o: skin, shirt, pants, hair, vest, turban (null = bare head), beard, dupatta, shoes,
//    apron, tools (true = farm tools + manager items), scale
export function makeHuman(o = {}) {
  const skin = o.skin ?? 0xc68a5a, shirt = o.shirt ?? 0xf5f0e1, pants = o.pants ?? 0xf0ece0;
  const hair = o.hair ?? 0x1b1410;
  const woman = !!o.dupatta;
  const group = new THREE.Group();
  const b = new Builder(0.02, { ao: 0.18, aoH: 0.5 });
  // kurta: chest, flared skirt, shoulders, placket and buttons
  b.cyl(shirt, { y: 1.13, sy: 0.56, g: 0.1 }, 0.25, 0.29, 14);
  b.cyl(shirt, { y: 0.74, sy: 0.3, g: 0.1 }, 0.29, woman ? 0.38 : 0.34, 14);
  b.sph(shirt, { y: 1.39, sx: 0.6, sy: 0.26, sz: 0.44 }, 14, 8);
  b.box(shade(shirt, -0.08), { y: 1.2, z: 0.255, sx: 0.07, sy: 0.32, sz: 0.02, ao: false });
  for (let i = 0; i < 3; i++) b.sph(o.vest ? 0xf2c94c : shade(shirt, -0.25), { y: 1.31 - i * 0.1, z: 0.268, s: 0.035, ao: false }, 6, 4);
  if (o.vest) {
    // sleeveless jacket with a darker trim
    b.cyl(o.vest, { y: 1.15, sy: 0.5, sz: 0.94, g: 0.12 }, 0.262, 0.298, 14, true);
    b.box(o.vest, { x: -0.13, y: 1.15, z: 0.24, sx: 0.12, sy: 0.48, sz: 0.04, rz: 0.05 });
    b.box(o.vest, { x: 0.13, y: 1.15, z: 0.24, sx: 0.12, sy: 0.48, sz: 0.04, rz: -0.05 });
    b.box(shade(o.vest, -0.12), { x: -0.075, y: 1.15, z: 0.262, sx: 0.025, sy: 0.48, sz: 0.02 });
    b.box(shade(o.vest, -0.12), { x: 0.075, y: 1.15, z: 0.262, sx: 0.025, sy: 0.48, sz: 0.02 });
  }
  if (o.apron) b.box(o.apron, { y: 0.98, z: 0.27, sx: 0.4, sy: 0.6, sz: 0.03, rx: -0.06 });
  if (o.sash) b.torus(o.sash, { y: 0.88, rx: Math.PI / 2, s: 1 }, 0.275, 0.04, 6, 20);
  // neck and head
  b.cyl(skin, { y: 1.5, sy: 0.14 }, 0.08, 0.09, 8);
  b.sph(skin, { y: 1.72, sx: 0.5, sy: 0.52, sz: 0.48 }, 16, 12);
  b.sph(skin, { x: -0.245, y: 1.71, z: -0.01, sx: 0.08, sy: 0.12, sz: 0.06 }, 6, 4);
  b.sph(skin, { x: 0.245, y: 1.71, z: -0.01, sx: 0.08, sy: 0.12, sz: 0.06 }, 6, 4);
  // eyes: whites, pupils with a catch-light, brows
  for (const s of [-1, 1]) {
    b.sph(0xffffff, { x: s * 0.085, y: 1.745, z: 0.205, sx: 0.085, sy: 0.1, sz: 0.05, ao: false, j: 0 }, 8, 6);
    b.sph(0x2a1a10, { x: s * 0.085, y: 1.74, z: 0.228, sx: 0.055, sy: 0.068, sz: 0.03, ao: false, j: 0 }, 8, 6);
    b.sph(0xffffff, { x: s * 0.085 + 0.012, y: 1.758, z: 0.243, s: 0.016, ao: false, j: 0 }, 4, 3);
    b.box(woman ? 0x2a1a10 : hair, { x: s * 0.088, y: 1.81, z: 0.212, sx: 0.09, sy: 0.022, sz: 0.02, rz: s * -0.12, ao: false });
  }
  b.sph(shade(skin, -0.05), { y: 1.69, z: 0.24, sx: 0.07, sy: 0.08, sz: 0.07 }, 6, 4);
  b.sph(0xe8806a, { x: -0.14, y: 1.67, z: 0.19, sx: 0.08, sy: 0.05, sz: 0.03, ao: false, j: 0 }, 6, 4);
  b.sph(0xe8806a, { x: 0.14, y: 1.67, z: 0.19, sx: 0.08, sy: 0.05, sz: 0.03, ao: false, j: 0 }, 6, 4);
  if (o.beard !== false && !woman) {
    // full beard wrapping the jaw, curled moustache
    b.sph(hair, { y: 1.6, z: 0.07, sx: 0.44, sy: 0.34, sz: 0.38, g: 0.04 }, 12, 8, Math.PI * 2, Math.PI * 0.62);
    b.sph(hair, { y: 1.555, z: 0.13, sx: 0.3, sy: 0.24, sz: 0.24 }, 10, 6);
    b.capsule(hair, { x: -0.065, y: 1.655, z: 0.235, rz: 1.25, s: 1 }, 0.022, 0.08, 6);
    b.capsule(hair, { x: 0.065, y: 1.655, z: 0.235, rz: -1.25, s: 1 }, 0.022, 0.08, 6);
    b.box(0x8a3a2a, { y: 1.63, z: 0.235, sx: 0.06, sy: 0.015, sz: 0.02, ao: false });
  } else {
    b.torus(0x8a3a2a, { y: 1.645, z: 0.225, rx: 0.3, rz: Math.PI, s: 1, ao: false, j: 0 }, 0.04, 0.009, 3, 8, Math.PI);
  }
  if (woman) {
    // hair parting, braid and a dupatta over the head and shoulders
    b.sph(hair, { y: 1.78, z: -0.02, sx: 0.52, sy: 0.5, sz: 0.5 }, 12, 8, Math.PI * 2, Math.PI * 0.55);
    b.capsule(hair, { y: 1.35, z: -0.24, rx: 0.12 }, 0.05, 0.42, 6);
    b.sph(o.dupatta, { y: 1.76, z: -0.04, sx: 0.58, sy: 0.56, sz: 0.56, g: 0.1 }, 14, 8, Math.PI * 2, Math.PI * 0.58);
    b.box(o.dupatta, { y: 1.28, z: -0.27, sx: 0.5, sy: 0.72, sz: 0.04, rx: 0.1 });
    b.torus(o.dupatta, { y: 1.42, z: 0.0, rx: Math.PI / 2 - 0.25, s: 1 }, 0.27, 0.05, 6, 18, Math.PI);
    b.box(shade(o.dupatta, 0.15), { y: 0.95, z: -0.29, sx: 0.5, sy: 0.05, sz: 0.04 });
  } else if (o.turban !== null) {
    // Patiala-shahi pagg: wrapped layers rising to a peak at the front
    const t = o.turban ?? 0xe8590c, d1 = shade(t, -0.1), d2 = shade(t, 0.06);
    b.cyl(t, { y: 1.84, sy: 0.14, rx: -0.14 }, 0.262, 0.252, 18);
    b.sph(t, { y: 1.88, z: -0.035, sx: 0.56, sy: 0.4, sz: 0.58, rx: -0.14 }, 16, 10, Math.PI * 2, Math.PI * 0.55);
    b.sph(d2, { y: 1.93, z: 0.07, sx: 0.36, sy: 0.3, sz: 0.4, rx: 0.3 }, 10, 8);
    for (let i = 0; i < 4; i++) {
      b.torus(i % 2 ? d1 : d2, { y: 1.81 + i * 0.045, z: 0.03 - i * 0.01, rx: Math.PI / 2 - 0.16 - i * 0.08, rz: 0, s: 1 - i * 0.06 }, 0.262, 0.017, 4, 22, Math.PI);
    }
    b.torus(d1, { y: 1.83, z: 0.0, rx: Math.PI / 2 + 0.55, ry: 0.35, s: 0.98 }, 0.26, 0.016, 4, 18, Math.PI * 0.55);
    b.cone(t, { y: 2.06, z: 0.06, sx: 0.12, sy: 0.12, sz: 0.08, rx: 0.4 }, 8);
    if (o.badge) b.sph(o.badge, { y: 1.9, z: 0.27, s: 0.06, ao: false }, 6, 4);
  } else {
    b.sph(hair, { y: 1.8, z: -0.02, sx: 0.52, sy: 0.42, sz: 0.5 }, 12, 8, Math.PI * 2, Math.PI * 0.5);
  }
  if (o.glasses) for (const s of [-1, 1]) b.torus(0x222222, { x: s * 0.085, y: 1.745, z: 0.25, s: 1, ao: false }, 0.05, 0.008, 4, 12);
  const body = b.mesh();
  group.add(body);

  const limb = (color, r, len, hand) => {
    const lb = new Builder(0.02, { ao: 0 });
    lb.capsule(color, { y: -len / 2 - 0.04 }, r, len, 8);
    if (hand) {
      lb.sph(skin, { y: -len - 0.12, sx: r * 2.4, sy: r * 2.6, sz: r * 2.3 }, 8, 6);
      if (hand === 'kara') lb.torus(CHROME, { y: -len - 0.04, rx: Math.PI / 2, s: 1 }, r * 1.05, 0.014, 4, 12);
    } else {
      // jutti with a curled toe
      const sh = o.shoes ?? 0x7a4a22;
      lb.rbox(sh, { y: -len - 0.13, z: 0.04, sx: 0.17, sy: 0.09, sz: 0.3 }, 0.035);
      lb.cone(sh, { y: -len - 0.1, z: 0.21, rx: -1.2, sx: 0.06, sy: 0.12, sz: 0.05 }, 5);
      lb.box(0xf2c94c, { y: -len - 0.085, z: 0.08, sx: 0.12, sy: 0.02, sz: 0.1, ao: false });
    }
    const pivot = new THREE.Group();
    pivot.add(lb.mesh());
    return pivot;
  };
  const armL = limb(shirt, 0.075, 0.42, true), armR = limb(shirt, 0.075, 0.42, 'kara');
  armL.position.set(-0.32, 1.38, 0); armR.position.set(0.32, 1.38, 0);
  armL.rotation.z = -0.1; armR.rotation.z = 0.1;
  const legL = limb(pants, 0.1, 0.46), legR = limb(pants, 0.1, 0.46);
  legL.position.set(-0.12, 0.76, 0); legR.position.set(0.12, 0.76, 0);
  group.add(armL, armR, legL, legR);

  const tools = {};
  if (o.tools) {
    const hand = new THREE.Group();
    hand.position.set(0, -0.58, 0.04);
    armR.add(hand);
    const tb = new Builder(0.02, { ao: 0 });
    // kahi (Punjabi hoe)
    tb.cyl(0x9b6b3c, { y: 0, z: 0.35, rx: Math.PI / 2, sy: 1.0 }, 0.025, 0.025, 6);
    tb.rbox(0x8a9399, { y: -0.12, z: 0.85, sx: 0.28, sy: 0.24, sz: 0.035, rx: 0.2 }, 0.012);
    tools.hoe = tb.mesh();
    tb.cyl(0x2f9e5a, { y: -0.05, z: 0.12, sy: 0.3 }, 0.13, 0.14, 14);
    tb.cyl(0x2f9e5a, { y: 0.04, z: 0.38, rx: 1.1, sy: 0.4 }, 0.025, 0.04, 6);
    tb.cyl(0x23784a, { y: 0.14, z: 0.6, rx: 1.1, sy: 0.06 }, 0.06, 0.03, 8);
    tb.torus(0x23784a, { y: 0.14, z: 0.12, ry: Math.PI / 2 }, 0.1, 0.018, 4, 10, Math.PI);
    tools.can = tb.mesh();
    tb.cyl(0x6b4a2b, { y: -0.08, sy: 0.2 }, 0.025, 0.025, 6);
    tb.torus(0xd5dade, { y: 0.1, z: 0.14, ry: Math.PI / 2, rz: 0.6 }, 0.17, 0.016, 3, 12, Math.PI * 1.1);
    tools.sickle = tb.mesh();
    tb.sph(0xd9c49a, { y: -0.12, sx: 0.24, sy: 0.3, sz: 0.2 }, 8, 6);
    tb.cyl(0xa98a55, { y: 0.04, sy: 0.06 }, 0.05, 0.08, 6);
    tools.seed = tb.mesh();
    // manager items: ledger (bahi-khata), spanner, steel balti
    tb.rbox(0xc92a2a, { y: -0.06, z: 0.1, sx: 0.06, sy: 0.32, sz: 0.24, rx: -0.3 }, 0.015);
    tb.box(0xfff3d6, { y: -0.06, z: 0.1, sx: 0.065, sy: 0.3, sz: 0.2, rx: -0.3, x: 0.004 });
    tools.book = tb.mesh();
    tb.box(STEEL, { y: -0.02, z: 0.16, sx: 0.04, sy: 0.04, sz: 0.36 });
    tb.torus(STEEL, { y: -0.02, z: 0.38, ry: Math.PI / 2 }, 0.05, 0.02, 4, 10, Math.PI * 1.5);
    tools.wrench = tb.mesh();
    tb.cyl(CHROME, { y: -0.2, sy: 0.24 }, 0.16, 0.12, 14);
    tb.torus(STEEL, { y: -0.02, rx: 0 }, 0.12, 0.01, 4, 12, Math.PI);
    tb.cyl(0xd9b45a, { y: -0.09, sy: 0.02 }, 0.15, 0.15, 12);
    tools.bucket = tb.mesh();
    for (const k in tools) { hand.add(tools[k]); tools[k].visible = false; }
  }
  const blob = makeBlob(0.95, 0.85);
  group.add(blob);
  if (o.scale) group.scale.setScalar(o.scale);
  return { group, body, armL, armR, legL, legR, tools, blob };
}

// Walk / work / sit animation shared by player and NPCs.
export function animateHuman(h, t, speed, work = 0, sit = false) {
  if (sit) {
    h.legL.rotation.x = h.legR.rotation.x = -1.45;
    h.armL.rotation.x = h.armR.rotation.x = -0.9;
    h.body.position.y = 0;
    h.body.rotation.z = 0;
    h.blob.visible = false;
    return;
  }
  h.blob.visible = true;
  const s = Math.min(1, speed / 4);
  const ph = t * (6 + speed * 1.4);
  const sw = Math.sin(ph) * 0.75 * s;
  h.legL.rotation.x = sw;
  h.legR.rotation.x = -sw;
  h.armL.rotation.x = -sw * 0.8;
  h.armR.rotation.x = work > 0 ? -1.3 + Math.sin(work * Math.PI) * 1.1 : sw * 0.8;
  h.body.position.y = Math.abs(Math.cos(ph)) * 0.05 * s + (s < 0.05 ? Math.sin(t * 2.2) * 0.008 : 0);
  h.body.rotation.z = Math.sin(ph) * 0.03 * s;
}

// ---------------------------------------------------------------- animals
export function animalGeometry(kind) {
  const b = new Builder(0.04, { ao: 0.25, aoH: 0.35 });
  if (kind === 'chicken') {
    const w = 0xfdfaf2, wing = 0xf1e6cf;
    b.sph(w, { y: 0.34, sx: 0.4, sy: 0.36, sz: 0.48 }, 12, 10);
    b.sph(w, { y: 0.3, z: 0.06, sx: 0.36, sy: 0.3, sz: 0.36 }, 10, 8);
    for (const s of [-1, 1]) b.sph(wing, { x: s * 0.19, y: 0.36, z: -0.02, sx: 0.1, sy: 0.22, sz: 0.34, rx: 0.15 }, 8, 6);
    for (let i = 0; i < 3; i++) b.cone([0x6b4a2b, 0xd9b45a, 0x3b2a1a][i], { x: (i - 1) * 0.05, y: 0.5, z: -0.24, rx: -0.6 - i * 0.12, rz: (i - 1) * 0.3, sx: 0.09, sy: 0.24, sz: 0.06 }, 5);
    b.sph(w, { y: 0.58, z: 0.16, s: 0.24 }, 10, 8);
    for (let i = 0; i < 3; i++) b.sph(0xe03131, { y: 0.71 + (i === 1 ? 0.02 : 0), z: 0.1 + i * 0.05, s: 0.07, ao: false }, 6, 4);
    b.sph(0xe03131, { y: 0.5, z: 0.25, sx: 0.05, sy: 0.08, sz: 0.04, ao: false }, 6, 4);
    b.cone(0xf59f00, { y: 0.57, z: 0.3, rx: Math.PI / 2, sx: 0.07, sy: 0.12, sz: 0.06 }, 6);
    for (const s of [-1, 1]) {
      b.sph(0x111111, { x: s * 0.085, y: 0.61, z: 0.23, s: 0.04, ao: false, j: 0 }, 6, 4);
      b.cyl(0xf59f00, { x: s * 0.07, y: 0.09, sy: 0.18 }, 0.02, 0.02, 4);
      b.box(0xf59f00, { x: s * 0.07, y: 0.01, z: 0.04, sx: 0.08, sy: 0.02, sz: 0.12 });
    }
  } else if (kind === 'buffalo') {
    const c = 0x2c2c32, d = 0x1c1c20, m = 0x4a4a52;
    b.capsule(c, { y: 1.02, rx: Math.PI / 2 }, 0.48, 0.9, 14);
    b.sph(c, { y: 1.1, z: 0.42, sx: 0.88, sy: 0.84, sz: 0.7 }, 12, 8);
    b.sph(c, { y: 0.96, z: -0.45, sx: 0.9, sy: 0.88, sz: 0.7 }, 12, 8);
    // head: skull, broad muzzle, nostrils, eyes, ears, tight curled Murrah horns
    b.sph(c, { y: 1.05, z: 0.92, sx: 0.42, sy: 0.44, sz: 0.52, rx: 0.5 }, 12, 10);
    b.sph(m, { y: 0.86, z: 1.12, sx: 0.34, sy: 0.26, sz: 0.26 }, 10, 8);
    b.sph(0x111111, { x: -0.07, y: 0.86, z: 1.24, s: 0.05, ao: false }, 5, 4);
    b.sph(0x111111, { x: 0.07, y: 0.86, z: 1.24, s: 0.05, ao: false }, 5, 4);
    for (const s of [-1, 1]) {
      b.sph(0xffffff, { x: s * 0.17, y: 1.13, z: 1.02, s: 0.07, ao: false, j: 0 }, 6, 4);
      b.sph(0x111111, { x: s * 0.175, y: 1.13, z: 1.045, s: 0.045, ao: false, j: 0 }, 6, 4);
      b.sph(d, { x: s * 0.31, y: 1.12, z: 0.84, sx: 0.22, sy: 0.08, sz: 0.13, rz: s * 0.3 }, 8, 6);
      b.torus(0x6a6d74, { x: s * 0.2, y: 1.26, z: 0.78, ry: s * 1.35, rx: 0.25, rz: s > 0 ? Math.PI : 0 }, 0.12, 0.05, 6, 14, Math.PI * 1.6);
      b.torus(0x7b7f86, { x: s * 0.24, y: 1.2, z: 0.7, ry: s * 1.35, rx: 0.25, rz: s > 0 ? Math.PI : 0 }, 0.06, 0.035, 5, 10, Math.PI * 1.4);
    }
    for (const [x, z] of [[-0.26, 0.55], [0.26, 0.55], [-0.26, -0.55], [0.26, -0.55]]) {
      b.cyl(c, { x, y: 0.4, z, sy: 0.8 }, 0.11, 0.085, 8);
      b.cyl(0x111111, { x, y: 0.05, z, sy: 0.1 }, 0.09, 0.1, 8);
    }
    b.cyl(c, { y: 0.78, z: -1.0, rx: 0.2, sy: 0.75 }, 0.03, 0.03, 4);
    b.sph(0x111111, { y: 0.4, z: -1.08, sx: 0.1, sy: 0.16, sz: 0.1 }, 6, 4);
    b.sph(0xd99a9a, { y: 0.6, z: -0.2, sx: 0.32, sy: 0.16, sz: 0.3 }, 8, 6);
  } else if (kind === 'goat') {
    const c = 0x8b5a3c, w = 0xf2ede4;
    b.capsule(c, { y: 0.7, rx: Math.PI / 2 }, 0.27, 0.52, 12);
    b.sph(w, { y: 0.74, z: 0.12, sx: 0.52, sy: 0.42, sz: 0.42 }, 10, 8);
    b.sph(w, { x: 0.1, y: 0.8, z: -0.2, sx: 0.3, sy: 0.3, sz: 0.3 }, 8, 6);
    b.sph(c, { y: 1.0, z: 0.52, sx: 0.24, sy: 0.27, sz: 0.38, rx: 0.5 }, 10, 8);
    b.sph(shade(c, -0.08), { y: 0.92, z: 0.68, sx: 0.17, sy: 0.17, sz: 0.18 }, 8, 6);
    for (const s of [-1, 1]) {
      // long droopy Beetal ears, small horns, eyes
      b.capsule(0x5e3b24, { x: s * 0.16, y: 0.86, z: 0.48, rz: s * 0.25, rx: 0.2 }, 0.05, 0.24, 6);
      b.cone(0x8f8a80, { x: s * 0.07, y: 1.18, z: 0.44, rx: -0.6, rz: s * -0.2, sx: 0.05, sy: 0.2, sz: 0.05 }, 5);
      b.sph(0x111111, { x: s * 0.095, y: 1.04, z: 0.62, s: 0.045, ao: false, j: 0 }, 5, 4);
    }
    b.cone(0x3b2a1a, { y: 0.78, z: 0.66, rx: Math.PI, sx: 0.06, sy: 0.14, sz: 0.06 }, 5);
    b.cone(c, { y: 0.88, z: -0.42, rx: -0.9, sx: 0.06, sy: 0.18, sz: 0.06 }, 5);
    for (const [x, z] of [[-0.14, 0.28], [0.14, 0.28], [-0.14, -0.28], [0.14, -0.28]]) {
      b.cyl(c, { x, y: 0.26, z, sy: 0.52 }, 0.05, 0.045, 6);
      b.cyl(0x222222, { x, y: 0.03, z, sy: 0.06 }, 0.05, 0.055, 6);
    }
  } else if (kind === 'sheep') {
    const wool = 0xf6f3ec;
    for (const [x, y, z, s] of [[0, 0.72, 0, 0.66], [-0.2, 0.74, 0.26, 0.44], [0.2, 0.74, 0.26, 0.44], [-0.2, 0.74, -0.26, 0.46], [0.2, 0.74, -0.26, 0.46], [0, 0.94, 0.05, 0.46], [0, 0.9, -0.22, 0.4], [-0.24, 0.62, 0, 0.36], [0.24, 0.62, 0, 0.36], [0, 0.86, 0.32, 0.36]])
      b.ico(wool, { x, y, z, s }, 1);
    b.sph(0x2b2622, { y: 0.84, z: 0.52, sx: 0.25, sy: 0.28, sz: 0.34, rx: 0.4 }, 10, 8);
    b.ico(wool, { y: 1.0, z: 0.46, s: 0.2 }, 1);
    for (const s of [-1, 1]) {
      b.sph(0x2b2622, { x: s * 0.17, y: 0.9, z: 0.46, sx: 0.16, sy: 0.06, sz: 0.09, rz: s * -0.3 }, 6, 4);
      b.sph(0xffffff, { x: s * 0.08, y: 0.9, z: 0.64, s: 0.05, ao: false, j: 0 }, 5, 4);
      b.sph(0x111111, { x: s * 0.08, y: 0.9, z: 0.66, s: 0.03, ao: false, j: 0 }, 5, 4);
    }
    for (const [x, z] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, -0.22], [0.15, -0.22]]) b.cyl(0x2b2622, { x, y: 0.22, z, sy: 0.44 }, 0.05, 0.045, 6);
  }
  return b.build();
}

// ---------------------------------------------------------------- vehicles
function wheel(r, w, tire = 0x1d1d1f, rim = 0xf2b705, { lugs = true, spokes = false } = {}) {
  const b = new Builder(0.03, { ao: 0 });
  b.cyl(tire, { rz: Math.PI / 2, sy: w }, r * 0.94, r * 0.94, 20);
  b.torus(tire, { ry: Math.PI / 2, s: 1, sz: w / (0.24 * r) }, r * 0.88, r * 0.12, 6, 22);
  b.cyl(rim, { rz: Math.PI / 2, sy: w * 1.04 }, r * 0.6, r * 0.6, 16);
  b.cyl(shade(rim, -0.15), { rz: Math.PI / 2, sy: w * 1.06 }, r * 0.42, r * 0.42, 14);
  b.cyl(CHROME, { rz: Math.PI / 2, sy: w * 1.12 }, r * 0.17, r * 0.17, 10);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    for (const s of [-1, 1]) b.sph(CHROME, { x: s * w * 0.54, y: Math.cos(a) * r * 0.3, z: Math.sin(a) * r * 0.3, s: r * 0.07, ao: false }, 4, 3);
  }
  if (lugs) for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    for (const s of [-1, 1]) b.box(tire, { x: s * w * 0.25, y: Math.cos(a) * r * 0.98, z: Math.sin(a) * r * 0.98, rx: -a, ry: s * 0.45, sx: w * 0.5, sy: r * 0.1, sz: r * 0.12 });
  }
  if (spokes) for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    b.box(CHROME, { y: Math.cos(a) * r * 0.45, z: Math.sin(a) * r * 0.45, rx: -a, sx: 0.015, sy: r * 0.9, sz: 0.015 });
  }
  const g = new THREE.Group();
  g.add(b.mesh());
  g.userData.r = r;
  return g;
}

export function makeTractor() {
  const group = new THREE.Group();
  const b = new Builder(0.025, { ao: 0.12, aoH: 0.6 });
  const red = 0xd62828, redD = 0xa61e1e, dark = 0x2a2a2e;
  // chassis, engine block and hood
  b.rbox(dark, { y: 0.6, z: 0.1, sx: 0.56, sy: 0.36, sz: 2.4 }, 0.06);
  b.rbox(0x3d4045, { y: 0.78, z: 0.9, sx: 0.66, sy: 0.4, sz: 1.2 }, 0.05);
  b.rbox(red, { y: 1.1, z: 0.86, sx: 0.8, sy: 0.5, sz: 1.56 }, 0.12);
  b.rbox(shade(red, 0.06), { y: 1.37, z: 0.86, sx: 0.66, sy: 0.08, sz: 1.44 }, 0.04);
  b.box(0xf8f9fa, { y: 1.08, z: 0.86, sx: 0.82, sy: 0.07, sz: 1.5 });
  b.box(0x1c4fd1, { x: 0.41, y: 1.2, z: 0.6, sx: 0.01, sy: 0.12, sz: 0.5, ao: false });
  b.box(0x1c4fd1, { x: -0.41, y: 1.2, z: 0.6, sx: 0.01, sy: 0.12, sz: 0.5, ao: false });
  // grille, headlights with chrome rims, front weights and bumper
  b.rbox(0x2f3136, { y: 1.04, z: 1.64, sx: 0.68, sy: 0.5, sz: 0.05 }, 0.02);
  for (let i = 0; i < 5; i++) b.box(CHROME, { y: 0.86 + i * 0.09, z: 1.67, sx: 0.58, sy: 0.025, sz: 0.02, ao: false });
  for (const s of [-1, 1]) {
    b.cyl(CHROME, { x: s * 0.3, y: 1.3, z: 1.6, rx: Math.PI / 2, sy: 0.08 }, 0.11, 0.11, 12);
    b.sph(0xfff7c2, { x: s * 0.3, y: 1.3, z: 1.64, sx: 0.18, sy: 0.18, sz: 0.06, ao: false, j: 0 }, 10, 6);
  }
  b.rbox(0x55585e, { y: 0.55, z: 1.78, sx: 0.78, sy: 0.32, sz: 0.28 }, 0.05);
  for (let i = 0; i < 4; i++) b.rbox(0x3a3d42, { x: -0.3 + i * 0.2, y: 0.55, z: 1.95, sx: 0.17, sy: 0.3, sz: 0.1 }, 0.03);
  // exhaust with chrome cap, air filter
  b.cyl(0x222222, { x: 0.26, y: 1.78, z: 1.15, sy: 0.8 }, 0.045, 0.05, 8);
  b.cyl(CHROME, { x: 0.26, y: 2.2, z: 1.15, sy: 0.14 }, 0.065, 0.05, 10);
  b.cyl(0x2b2b2b, { x: -0.25, y: 1.6, z: 1.25, sy: 0.4 }, 0.07, 0.07, 10);
  b.sph(CHROME, { x: -0.25, y: 1.82, z: 1.25, sx: 0.16, sy: 0.08, sz: 0.16 }, 8, 4);
  // fuel tank, dashboard, steering
  b.rbox(red, { y: 0.98, z: -0.3, sx: 0.72, sy: 0.42, sz: 0.95 }, 0.1);
  b.cyl(0x333333, { y: 1.62, z: 0.12, rx: -0.6, sy: 0.55 }, 0.03, 0.03, 6);
  b.torus(0x222222, { y: 1.86, z: -0.04, rx: Math.PI / 2 - 0.6 }, 0.17, 0.025, 6, 16);
  b.rbox(0x222222, { y: 1.42, z: 0.32, sx: 0.5, sy: 0.22, sz: 0.12, rx: -0.4 }, 0.03);
  // rear fenders with lamps and a "tool box" speaker, seat with cushion
  for (const s of [-1, 1]) {
    b.cyl(red, { x: s * 0.78, y: 0.95, z: -0.55, rz: Math.PI / 2, sy: 0.52 }, 0.88, 0.88, 22, true);
    b.cyl(redD, { x: s * 0.78, y: 0.95, z: -0.55, rz: Math.PI / 2, sy: 0.54 }, 0.9, 0.9, 22, true);
    b.rbox(red, { x: s * 0.78, y: 1.56, z: -0.55, sx: 0.54, sy: 0.06, sz: 0.95 }, 0.03);
    b.rbox(0xff6b00, { x: s * 0.92, y: 1.62, z: -0.95, sx: 0.12, sy: 0.08, sz: 0.06 }, 0.02);
    b.box(0xe03131, { x: s * 0.92, y: 1.62, z: -1.02, sx: 0.1, sy: 0.06, sz: 0.02, ao: false });
  }
  b.rbox(0x111111, { x: 0.78, y: 1.75, z: -0.2, sx: 0.3, sy: 0.3, sz: 0.3 }, 0.05);
  b.cyl(0x555555, { x: 0.78, y: 1.75, z: -0.04, rx: Math.PI / 2, sy: 0.02 }, 0.11, 0.11, 12);
  b.rbox(0x1b1b1b, { y: 1.42, z: -0.6, sx: 0.58, sy: 0.14, sz: 0.52 }, 0.06);
  b.rbox(0x7a1515, { y: 1.5, z: -0.6, sx: 0.5, sy: 0.06, sz: 0.44 }, 0.03);
  b.rbox(0x1b1b1b, { y: 1.74, z: -0.86, sx: 0.56, sy: 0.55, sz: 0.1, rx: -0.15 }, 0.05);
  b.rbox(0x4a4d52, { y: 0.55, z: -1.35, sx: 0.5, sy: 0.15, sz: 0.4 }, 0.04);
  b.box(0x3a3d42, { y: 0.48, z: -1.6, sx: 0.12, sy: 0.08, sz: 0.3 });
  // flag ribbons and a nimbu-mirch charm, common on Punjab tractors
  b.cyl(0x888888, { x: -0.38, y: 2.0, z: 1.55, sy: 0.7 }, 0.012, 0.012, 4);
  b.box(0xff922b, { x: -0.38, y: 2.24, z: 1.7, sx: 0.02, sy: 0.2, sz: 0.28 });
  b.box(0x2b8a3e, { x: -0.38, y: 2.08, z: 1.68, sx: 0.02, sy: 0.08, sz: 0.24 });
  b.sph(0xf2d000, { x: 0, y: 0.85, z: 2.12, s: 0.08 }, 6, 4);
  b.cone(0x2b8a3e, { x: 0, y: 0.72, z: 2.12, rx: Math.PI, sx: 0.04, sy: 0.12, sz: 0.04 }, 4);
  const body = b.mesh();
  group.add(body);
  const wheels = [];
  for (const [x, z, r, w] of [[-0.84, -0.55, 0.8, 0.44], [0.84, -0.55, 0.8, 0.44], [-0.6, 1.25, 0.44, 0.24], [0.6, 1.25, 0.44, 0.24]]) {
    const wh = wheel(r, w, 0x1d1d1f, 0xf2b705, { lugs: r > 0.6 });
    wh.position.set(x, r, z);
    group.add(wh);
    wheels.push(wh);
  }
  group.add(makeBlob(2.4, 3.8, 0.025));
  const seat = new THREE.Object3D(); seat.position.set(0, 0.72, -0.58); group.add(seat);
  const rear = new THREE.Object3D(); rear.position.set(0, 0, -1.55); group.add(rear);
  const front = new THREE.Object3D(); front.position.set(0, 0, 1.85); group.add(front);
  const exhaust = new THREE.Object3D(); exhaust.position.set(0.26, 2.3, 1.15); group.add(exhaust);
  return { group, wheels, seat, rear, front, exhaust, steer: [wheels[2], wheels[3]] };
}

export function makeAttachment(kind) {
  const b = new Builder(0.035, { ao: 0.15, aoH: 0.4 });
  const g = new THREE.Group();
  let spin = null;
  if (kind === 'cultivator') {
    b.rbox(0x1f5fbf, { y: 0.55, z: -0.35, sx: 2.1, sy: 0.14, sz: 0.14 }, 0.03);
    b.rbox(0x1f5fbf, { y: 0.55, z: -0.85, sx: 2.1, sy: 0.14, sz: 0.14 }, 0.03);
    b.rbox(0x1f5fbf, { y: 0.55, z: -0.2, sx: 0.14, sy: 0.14, sz: 0.5 }, 0.03);
    b.rbox(0xf2c200, { y: 0.66, z: -0.6, sx: 0.5, sy: 0.08, sz: 0.6 }, 0.02);
    for (let i = 0; i < 7; i++) {
      const x = -0.95 + i * 0.32, z = i % 2 ? -0.85 : -0.35;
      b.box(0x6c7178, { x, y: 0.32, z, sx: 0.06, sy: 0.5, sz: 0.06, rx: 0.25 });
      b.cone(0xb0b6bc, { x, y: 0.05, z: z + 0.1, rx: Math.PI / 2 + 0.6, sx: 0.12, sy: 0.22, sz: 0.04 }, 4);
    }
  } else if (kind === 'seeder') {
    b.rbox(0x2b8a3e, { y: 0.95, z: -0.6, sx: 2.0, sy: 0.6, sz: 0.7 }, 0.08);
    b.rbox(0xf2b705, { y: 1.28, z: -0.6, sx: 2.04, sy: 0.08, sz: 0.74 }, 0.03);
    for (let i = 0; i < 3; i++) b.rbox(0x1f6f33, { x: -0.65 + i * 0.65, y: 1.34, z: -0.6, sx: 0.5, sy: 0.05, sz: 0.55 }, 0.02);
    b.rbox(0x3d4045, { y: 0.45, z: -0.6, sx: 2.1, sy: 0.12, sz: 0.2 }, 0.03);
    for (let i = 0; i < 7; i++) {
      b.cyl(0x9aa0a6, { x: -0.9 + i * 0.3, y: 0.2, z: -0.65, rz: Math.PI / 2, sy: 0.04 }, 0.18, 0.18, 12);
      b.cyl(0x333333, { x: -0.9 + i * 0.3, y: 0.55, z: -0.85, sy: 0.5, rx: 0.3 }, 0.02, 0.02, 4);
    }
  } else if (kind === 'sprayer') {
    b.cyl(0x1c7ed6, { y: 1.0, z: -0.9, rx: Math.PI / 2, sy: 1.5, g: 0.12 }, 0.55, 0.55, 18);
    b.sph(0x1c7ed6, { y: 1.0, z: -1.65, sx: 1.1, sy: 1.1, sz: 0.3 }, 14, 8);
    b.sph(0x1c7ed6, { y: 1.0, z: -0.15, sx: 1.1, sy: 1.1, sz: 0.3 }, 14, 8);
    for (const z of [-0.5, -1.3]) b.torus(0x1864ab, { y: 1.0, z, s: 1 }, 0.56, 0.03, 4, 20);
    b.cyl(0xf8f9fa, { y: 1.58, z: -0.6, sy: 0.12 }, 0.15, 0.15, 10);
    b.rbox(0x3d4045, { y: 0.35, z: -1.75, sx: 3.2, sy: 0.08, sz: 0.08 }, 0.02);
    for (let i = 0; i < 8; i++) b.cone(0x8a8f96, { x: -1.4 + i * 0.4, y: 0.27, z: -1.75, rx: Math.PI, sx: 0.05, sy: 0.08, sz: 0.05 }, 5);
    b.rbox(0x3d4045, { y: 0.55, z: -0.25, sx: 0.4, sy: 0.12, sz: 0.4 }, 0.03);
    for (const x of [-0.7, 0.7]) {
      const w = wheel(0.35, 0.2, 0x1d1d1f, 0x9aa0a6, { lugs: false });
      w.position.set(x, 0.35, -1.0);
      g.add(w);
    }
  } else if (kind === 'reaper') {
    b.rbox(0xd62828, { y: 0.35, z: 0.6, sx: 3.0, sy: 0.28, sz: 0.8 }, 0.06);
    b.box(0x9aa0a6, { y: 0.2, z: 1.05, sx: 3.0, sy: 0.05, sz: 0.2 });
    for (let i = 0; i < 12; i++) b.cone(0xd5dade, { x: -1.4 + i * 0.255, y: 0.2, z: 1.2, rx: Math.PI / 2, sx: 0.08, sy: 0.25, sz: 0.04 }, 4);
    for (const s of [-1, 1]) b.rbox(0xd62828, { x: s * 1.5, y: 0.75, z: 0.75, sx: 0.08, sy: 0.9, sz: 0.5 }, 0.03);
    b.box(0xf2c200, { y: 0.52, z: 0.95, sx: 2.9, sy: 0.04, sz: 0.04, ao: false });
    const rb = new Builder(0.03, { ao: 0 });
    rb.cyl(0xf2b705, { rz: Math.PI / 2, sy: 2.9 }, 0.06, 0.06, 6);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      rb.box(0xf2b705, { y: Math.cos(a) * 0.32, z: Math.sin(a) * 0.32, sx: 2.9, sy: 0.05, sz: 0.1, rx: -a });
      for (let k = 0; k < 6; k++) rb.box(0xd5dade, { x: -1.3 + k * 0.52, y: Math.cos(a) * 0.38, z: Math.sin(a) * 0.38, sx: 0.02, sy: 0.14, sz: 0.02, rx: -a });
    }
    spin = rb.mesh(undefined, false);
    spin.position.set(0, 0.9, 0.9);
    g.add(spin);
  }
  if (!b.empty) g.add(b.mesh());
  g.userData.spin = spin;
  return g;
}

export function makeTrolley() {
  const b = new Builder(0.03, { ao: 0.12, aoH: 0.6 });
  const g = new THREE.Group();
  const blue = 0x2f6fd0, plank = 0xb98a55;
  b.rbox(0x3d4045, { y: 0.82, z: -1.6, sx: 1.5, sy: 0.14, sz: 2.4 }, 0.03);
  b.rbox(plank, { y: 0.95, z: -1.6, sx: 1.9, sy: 0.12, sz: 2.6 }, 0.03);
  for (const s of [-1, 1]) {
    // painted side boards with stripes, reflectors and a little "Sat Sri Akal" panel
    b.rbox(blue, { x: s * 0.95, y: 1.32, z: -1.6, sx: 0.08, sy: 0.66, sz: 2.6 }, 0.03);
    b.box(0xffd43b, { x: s * 0.995, y: 1.55, z: -1.6, sx: 0.01, sy: 0.06, sz: 2.5, ao: false });
    b.box(0xff6b6b, { x: s * 0.995, y: 1.12, z: -1.6, sx: 0.01, sy: 0.05, sz: 2.5, ao: false });
    for (let i = 0; i < 5; i++) b.sph([0xffd43b, 0xff6b6b, 0x69db7c][i % 3], { x: s * 1.0, y: 1.34, z: -2.6 + i * 0.5, sx: 0.02, sy: 0.12, sz: 0.12, ao: false }, 6, 4);
  }
  b.rbox(blue, { y: 1.32, z: -2.9, sx: 1.9, sy: 0.66, sz: 0.08 }, 0.03);
  b.rbox(blue, { y: 1.32, z: -0.3, sx: 1.9, sy: 0.66, sz: 0.08 }, 0.03);
  b.box(0xffd43b, { y: 1.62, z: -2.95, sx: 1.9, sy: 0.07, sz: 0.04, ao: false });
  for (const s of [-1, 1]) b.cyl(0xe03131, { x: s * 0.75, y: 1.0, z: -2.95, rx: Math.PI / 2, sy: 0.03 }, 0.08, 0.08, 10);
  b.rbox(0x3d4045, { y: 0.8, z: 0.2, sx: 0.12, sy: 0.12, sz: 1.0 }, 0.03);
  for (const s of [-1, 1]) b.cyl(0x3d4045, { x: s * 1.05, y: 0.5, z: -1.7, rz: Math.PI / 2, sy: 0.2 }, 0.06, 0.06, 6);
  g.add(b.mesh());
  const wheels = [];
  for (const x of [-1.08, 1.08]) {
    const w = wheel(0.5, 0.3, 0x1d1d1f, 0xf2b705, { lugs: false });
    w.position.set(x, 0.5, -1.7);
    g.add(w);
    wheels.push(w);
  }
  g.add(makeBlob(2.6, 3.2, 0.024).translateZ(-1.6));
  const bed = new THREE.Object3D(); bed.position.set(0, 1.05, -1.6); g.add(bed);
  return { group: g, wheels, bed };
}

export function makeCombine() {
  const group = new THREE.Group();
  const b = new Builder(0.025, { ao: 0.12, aoH: 0.8 });
  const body = 0x3f9b3f, bodyD = 0x2f7d2f, trim = 0xf2c200;
  b.rbox(body, { y: 1.75, z: -0.4, sx: 2.4, sy: 1.9, sz: 3.6 }, 0.15);
  b.box(trim, { y: 0.95, z: -0.4, sx: 2.44, sy: 0.12, sz: 3.62 });
  for (let i = 0; i < 6; i++) b.box(bodyD, { x: 1.21, y: 1.4 + (i % 3) * 0.25, z: -1.6 + Math.floor(i / 3) * 0.6, sx: 0.01, sy: 0.08, sz: 0.4, ao: false });
  // grain tank with a lid and the unloading auger
  b.rbox(body, { y: 3.0, z: -1.2, sx: 2.0, sy: 0.7, sz: 1.6 }, 0.12);
  b.rbox(bodyD, { y: 3.38, z: -1.2, sx: 1.8, sy: 0.06, sz: 1.4 }, 0.03);
  b.cyl(trim, { x: 1.3, y: 3.2, z: -1.2, rz: -1.2, sy: 2.4 }, 0.12, 0.12, 10);
  b.cyl(0x333333, { x: 2.38, y: 3.72, z: -1.2, rz: -1.2, sy: 0.2 }, 0.13, 0.1, 10);
  // cab: glass, frame, roof, beacon, mirrors, ladder
  b.box(0x9fd3f0, { y: 3.15, z: 0.95, sx: 1.3, sy: 1.0, sz: 1.1, ao: false });
  for (const [x, z] of [[-0.66, 0.4], [0.66, 0.4], [-0.66, 1.5], [0.66, 1.5]]) b.box(0x222222, { x, y: 3.15, z, sx: 0.06, sy: 1.0, sz: 0.06 });
  b.rbox(body, { y: 3.7, z: 0.95, sx: 1.45, sy: 0.14, sz: 1.25 }, 0.05);
  b.sph(0xff922b, { y: 3.85, z: 0.95, sx: 0.16, sy: 0.14, sz: 0.16 }, 8, 6);
  b.box(0x333333, { y: 2.6, z: 0.95, sx: 1.4, sy: 0.15, sz: 1.2 });
  for (const s of [-1, 1]) b.rbox(0x222222, { x: s * 0.82, y: 3.4, z: 1.45, sx: 0.04, sy: 0.18, sz: 0.12 }, 0.02);
  for (let i = 0; i < 5; i++) b.box(0x555555, { x: -0.8, y: 1.0 + i * 0.32, z: 1.25, sx: 0.3, sy: 0.04, sz: 0.06 });
  // header with knives, side shields and the feeder
  b.rbox(trim, { y: 0.75, z: 2.2, sx: 4.6, sy: 0.55, sz: 1.0 }, 0.1);
  b.box(0x9aa0a6, { y: 0.45, z: 2.75, sx: 4.6, sy: 0.06, sz: 0.25 });
  for (let i = 0; i < 18; i++) b.cone(0xd5dade, { x: -2.2 + i * 0.26, y: 0.45, z: 2.95, rx: Math.PI / 2, sx: 0.08, sy: 0.25, sz: 0.04 }, 4);
  for (const s of [-1, 1]) b.rbox(trim, { x: s * 2.3, y: 1.2, z: 2.3, sx: 0.08, sy: 1.0, sz: 0.9 }, 0.03);
  b.rbox(body, { y: 1.3, z: 1.45, sx: 1.0, sy: 0.6, sz: 0.8 }, 0.08);
  for (const s of [-1, 1]) {
    b.cyl(CHROME, { x: s * 0.9, y: 2.0, z: 1.42, rx: Math.PI / 2, sy: 0.06 }, 0.1, 0.1, 10);
    b.sph(0xfff7c2, { x: s * 0.9, y: 2.0, z: 1.46, sx: 0.16, sy: 0.16, sz: 0.04, ao: false }, 8, 4);
  }
  b.cyl(0x222222, { x: -0.7, y: 3.3, z: -2.0, sy: 1.0 }, 0.07, 0.08, 8);
  group.add(b.mesh());
  const rb = new Builder(0.03, { ao: 0 });
  rb.cyl(0xd62828, { rz: Math.PI / 2, sy: 4.4 }, 0.07, 0.07, 6);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    rb.box(0xd62828, { y: Math.cos(a) * 0.42, z: Math.sin(a) * 0.42, sx: 4.4, sy: 0.05, sz: 0.12, rx: -a });
    for (let k = 0; k < 8; k++) rb.box(0xd5dade, { x: -2 + k * 0.57, y: Math.cos(a) * 0.5, z: Math.sin(a) * 0.5, sx: 0.02, sy: 0.16, sz: 0.02, rx: -a });
  }
  const reel = rb.mesh(undefined, false);
  reel.position.set(0, 1.5, 2.5);
  group.add(reel);
  const wheels = [];
  for (const [x, z, r, w] of [[-1.25, 0.6, 0.88, 0.56], [1.25, 0.6, 0.88, 0.56], [-1.1, -1.8, 0.55, 0.35], [1.1, -1.8, 0.55, 0.35]]) {
    const wh = wheel(r, w, 0x1d1d1f, trim, { lugs: r > 0.6 });
    wh.position.set(x, r, z);
    group.add(wh);
    wheels.push(wh);
  }
  group.add(makeBlob(5.2, 6.4, 0.025).translateZ(0.3));
  const seat = new THREE.Object3D(); seat.position.set(0, 2.25, 0.85); group.add(seat);
  const exhaust = new THREE.Object3D(); exhaust.position.set(-0.7, 3.85, -2.0); group.add(exhaust);
  return { group, wheels, seat, reel, exhaust, front: (() => { const o = new THREE.Object3D(); o.position.set(0, 0, 2.6); group.add(o); return o; })() };
}

export function makeBike() {
  const group = new THREE.Group();
  const b = new Builder(0.02, { ao: 0 });
  // Royal-Bullet style: black tank with chrome, round headlamp, long chrome exhaust
  b.rbox(0x1b1b1f, { y: 0.6, sx: 0.14, sy: 0.12, sz: 1.2 }, 0.04);
  b.sph(0x1b1b1f, { y: 0.92, z: 0.22, sx: 0.34, sy: 0.27, sz: 0.58 }, 14, 10);
  b.sph(CHROME, { y: 0.96, z: 0.22, sx: 0.28, sy: 0.12, sz: 0.42 }, 12, 6);
  b.box(0xf2c94c, { y: 1.02, z: 0.22, sx: 0.04, sy: 0.02, sz: 0.48 });
  for (const s of [-1, 1]) b.sph(0xf2c94c, { x: s * 0.17, y: 0.93, z: 0.22, sx: 0.02, sy: 0.08, sz: 0.12 }, 6, 4);
  b.rbox(0x5a3a22, { y: 0.93, z: -0.33, sx: 0.3, sy: 0.1, sz: 0.58 }, 0.05);
  b.rbox(STEEL, { y: 0.46, z: 0.05, sx: 0.3, sy: 0.3, sz: 0.36 }, 0.06);
  for (let i = 0; i < 4; i++) b.box(CHROME, { y: 0.4 + i * 0.06, z: 0.05, sx: 0.32, sy: 0.015, sz: 0.3 });
  b.cyl(CHROME, { x: 0.18, y: 0.38, z: -0.5, rx: Math.PI / 2 + 0.12, sy: 1.0 }, 0.045, 0.055, 8);
  b.cyl(CHROME, { y: 0.85, z: 0.62, rx: -0.35, sy: 0.62 }, 0.03, 0.03, 6);
  b.box(0x1b1b1f, { y: 1.15, z: 0.68, sx: 0.72, sy: 0.04, sz: 0.04 });
  for (const s of [-1, 1]) b.cyl(0x111111, { x: s * 0.36, y: 1.15, z: 0.68, rz: Math.PI / 2, sy: 0.1 }, 0.025, 0.025, 6);
  b.cyl(CHROME, { y: 1.0, z: 0.8, rx: Math.PI / 2, sy: 0.08 }, 0.13, 0.13, 14);
  b.sph(0xfff3bf, { y: 1.0, z: 0.84, sx: 0.22, sy: 0.22, sz: 0.06, j: 0 }, 10, 6);
  b.cyl(0x1b1b1f, { y: 0.72, z: -0.72, rz: Math.PI / 2, sy: 0.16 }, 0.38, 0.38, 14, true);
  b.cyl(0x1b1b1f, { y: 0.72, z: 0.72, rz: Math.PI / 2, sy: 0.14 }, 0.38, 0.38, 14, true);
  group.add(b.mesh());
  const wheels = [];
  for (const z of [0.72, -0.72]) {
    const w = wheel(0.34, 0.1, 0x1d1d1f, 0xc0c4c9, { lugs: false, spokes: true });
    w.position.set(0, 0.34, z);
    group.add(w);
    wheels.push(w);
  }
  group.add(makeBlob(0.9, 2.0, 0.025));
  const seat = new THREE.Object3D(); seat.position.set(0, 0.25, -0.3); group.add(seat);
  return { group, wheels, seat };
}

// ---------------------------------------------------------------- props (into a Builder)
const LEAF = [0x4f9a3a, 0x5aa340, 0x3f8f35, 0x67ad45];
export const props = {
  safeda(b, x, z, h = 8) {
    // eucalyptus: tall pale trunk with bark patches, airy narrow crown
    b.cyl(0xe9e3d4, { x, y: h / 2, z, sy: h, g: 0.12 }, 0.12, 0.22, 8);
    for (let i = 0; i < 4; i++) b.cyl(0xb9ab92, { x, y: 0.8 + i * h * 0.17, z, sy: 0.35, ry: i }, 0.165 - i * 0.012, 0.17 - i * 0.012, 8);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.7 + x, r = 0.45 + (i % 2) * 0.25;
      b.ico([0x5e8a3a, 0x6b9a44, 0x557f34][i % 3], { x: x + Math.cos(a) * r, y: h * 0.62 + i * 0.5, z: z + Math.sin(a) * r, sx: 1.2, sy: 1.7, sz: 1.2, g: 0.22 }, 1);
    }
    b.ico(0x76a54c, { x, y: h + 0.5, z, sx: 0.9, sy: 1.5, sz: 0.9, g: 0.22 }, 1);
  },
  tree(b, x, z, s = 1, leaf = 0x4f9a3a) {
    // shade tree (neem / peepal): flared trunk, roots, branches, layered rounded canopy
    b.cyl(0x6b4a2b, { x, y: 1.1 * s, z, sy: 2.2 * s, g: 0.1 }, 0.18 * s, 0.3 * s, 9);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.4;
      b.cone(0x5e3f24, { x: x + Math.cos(a) * 0.28 * s, y: 0.12 * s, z: z + Math.sin(a) * 0.28 * s, rx: Math.sin(a) * 1.2, rz: -Math.cos(a) * 1.2, sx: 0.16 * s, sy: 0.55 * s, sz: 0.16 * s }, 5);
    }
    for (const [dx, dz, ry] of [[0.5, 0.2, 0.9], [-0.45, -0.25, -0.8], [0.05, -0.5, 0.2]]) b.cyl(0x6b4a2b, { x: x + dx * s, y: 2.4 * s, z: z + dz * s, sy: 1.2 * s, rz: -dx * 0.9, rx: dz * 0.9, ry }, 0.07 * s, 0.11 * s, 6);
    const c = [[0, 3.0, 0, 2.7], [0.95, 2.6, 0.45, 1.9], [-0.9, 2.7, -0.35, 2.0], [0.25, 3.8, -0.3, 1.9], [-0.35, 2.5, 0.9, 1.7], [0.6, 3.4, -0.8, 1.6], [-0.7, 3.5, 0.4, 1.5]];
    c.forEach(([dx, dy, dz, r], i) => b.ico(shade(leaf, (i % 3 - 1) * 0.035), { x: x + dx * s, y: dy * s, z: z + dz * s, s: r * s, g: 0.24 }, 2));
  },
  kikar(b, x, z, s = 1) {
    // acacia: leaning trunk, flat umbrella crown in layers
    b.cyl(0x5a3b22, { x, y: 1.3 * s, z, sy: 2.6 * s, rz: 0.12 }, 0.12 * s, 0.22 * s, 7);
    b.cyl(0x5a3b22, { x: x + 0.5 * s, y: 2.4 * s, z, sy: 1.2 * s, rz: -0.8 }, 0.06 * s, 0.09 * s, 5);
    b.cyl(0x5a3b22, { x: x - 0.4 * s, y: 2.5 * s, z: z + 0.2 * s, sy: 1.0 * s, rz: 0.8 }, 0.05 * s, 0.08 * s, 5);
    b.sph(0x6f8f3a, { x: x + 0.25 * s, y: 2.9 * s, z, sx: 3.8 * s, sy: 0.9 * s, sz: 3.4 * s, g: 0.25 }, 14, 6);
    b.sph(0x7d9e45, { x: x - 0.3 * s, y: 3.3 * s, z: z + 0.3 * s, sx: 2.4 * s, sy: 0.75 * s, sz: 2.2 * s, g: 0.25 }, 12, 5);
    b.sph(0x88a84d, { x: x + 0.6 * s, y: 3.45 * s, z: z - 0.4 * s, sx: 1.5 * s, sy: 0.55 * s, sz: 1.4 * s, g: 0.25 }, 10, 5);
  },
  mango(b, x, z, s = 1) {
    b.cyl(0x5e3f24, { x, y: 1.0 * s, z, sy: 2.0 * s }, 0.16 * s, 0.26 * s, 8);
    b.ico(0x2f7d32, { x, y: 2.9 * s, z, sx: 3.4 * s, sy: 2.6 * s, sz: 3.4 * s, g: 0.28 }, 2);
    b.ico(0x3a8a3a, { x: x + 0.5 * s, y: 3.6 * s, z: z - 0.3 * s, s: 1.8 * s, g: 0.28 }, 1);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9;
      b.sph(i % 2 ? 0xf2a51a : 0xa9c93a, { x: x + Math.cos(a) * 1.55 * s, y: (2.3 + (i % 3) * 0.4) * s, z: z + Math.sin(a) * 1.55 * s, sx: 0.16, sy: 0.22, sz: 0.16, ao: false }, 6, 4);
    }
  },
  bush(b, x, z, s = 1, c = 0x4c9a35) {
    b.ico(c, { x, y: 0.38 * s, z, sx: 1.1 * s, sy: 0.85 * s, sz: 1.0 * s, g: 0.25 }, 1);
    b.ico(shade(c, 0.05), { x: x + 0.38 * s, y: 0.32 * s, z: z + 0.22 * s, s: 0.62 * s, g: 0.25 }, 1);
    b.ico(shade(c, -0.03), { x: x - 0.32 * s, y: 0.28 * s, z: z - 0.2 * s, s: 0.55 * s, g: 0.25 }, 1);
  },
  flowers(b, x, z, color) {
    // marigold (genda) clump: leafy mound with round blooms
    b.ico(0x3f8f2f, { x, y: 0.16, z, sx: 0.95, sy: 0.4, sz: 0.95, g: 0.3 }, 1);
    for (let i = 0; i < 7; i++) {
      const dx = Math.cos(i * 2.4) * 0.32 * (i % 2 ? 1 : 0.6), dz = Math.sin(i * 2.4) * 0.32 * (i % 2 ? 1 : 0.6);
      b.cyl(0x3f8f2f, { x: x + dx, y: 0.2, z: z + dz, sy: 0.3 }, 0.012, 0.012, 4);
      b.sph(color, { x: x + dx, y: 0.36 + (i % 3) * 0.04, z: z + dz, sx: 0.17, sy: 0.12, sz: 0.17, ao: false }, 8, 5);
      b.sph(shade(color, -0.12), { x: x + dx, y: 0.41 + (i % 3) * 0.04, z: z + dz, s: 0.06, ao: false }, 5, 3);
    }
  },
  kup(b, x, z, s = 1) {   // toori kup: conical straw stack with rope bands and a matka on top
    b.cyl(0xd9b45a, { x, y: 0.7 * s, z, sy: 1.4 * s }, 1.05 * s, 1.18 * s, 16);
    b.cone(0xcfa84e, { x, y: 2.2 * s, z, sx: 2.2 * s, sy: 1.8 * s, sz: 2.2 * s }, 16);
    for (let i = 0; i < 3; i++) b.torus(0x9a7a3a, { x, y: (0.4 + i * 0.5) * s, z, rx: Math.PI / 2, s: 1 }, (1.12 - i * 0.03) * s, 0.025 * s, 4, 24);
    for (let i = 0; i < 6; i++) { const a = i * 1.05; b.box(0x9a7a3a, { x: x + Math.cos(a) * 0.6 * s, y: 2.15 * s, z: z + Math.sin(a) * 0.6 * s, sx: 0.03, sy: 1.9 * s, sz: 0.03, ry: -a, rz: Math.cos(a) * 0.55, rx: -Math.sin(a) * 0.55 }); }
    b.sph(0xb5653a, { x, y: 3.15 * s, z, s: 0.36 * s }, 8, 6);
  },
  charpai(b, x, z, ry = 0) {
    b.push(x, 0, z, ry);
    b.rbox(0x8b5a2b, { y: 0.45, sx: 1.0, sy: 0.08, sz: 1.9 }, 0.03);
    b.box(0xe9d8a6, { y: 0.5, sx: 0.88, sy: 0.04, sz: 1.78 });
    for (let i = 0; i < 8; i++) b.box(0xd4bf86, { y: 0.525, z: -0.8 + i * 0.23, sx: 0.88, sy: 0.01, sz: 0.04, ao: false });
    for (const [px, pz] of [[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]]) b.cyl(0x6b4226, { x: px, y: 0.22, z: pz, sy: 0.45 }, 0.05, 0.04, 6);
    b.pop();
  },
  nalka(b, x, z) {   // hand pump on a concrete basin
    b.rbox(0xb8b2a6, { x, y: 0.1, z, sx: 1.2, sy: 0.2, sz: 1.2 }, 0.05);
    b.box(0x8fc6dc, { x, y: 0.205, z, sx: 0.9, sy: 0.01, sz: 0.9, ao: false });
    b.cyl(0x2b8a3e, { x, y: 0.75, z, sy: 1.1 }, 0.09, 0.12, 10);
    b.sph(0x2b8a3e, { x, y: 1.32, z, s: 0.2 }, 8, 6);
    b.cyl(0x2b8a3e, { x, y: 1.0, z: z + 0.25, rx: Math.PI / 2, sy: 0.4 }, 0.04, 0.05, 6);
    b.box(0x1d1d1f, { x, y: 1.35, z: z - 0.35, sx: 0.05, sy: 0.05, sz: 0.8, rx: -0.4 });
  },
  fence(b, x1, z1, x2, z2, color = 0x9a6a3a) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / 1.6));
    const ry = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      b.rbox(shade(color, -0.06), { x: x1 + dx * t, y: 0.46, z: z1 + dz * t, sx: 0.13, sy: 0.92, sz: 0.13 }, 0.03);
      b.cone(shade(color, -0.1), { x: x1 + dx * t, y: 0.97, z: z1 + dz * t, sx: 0.16, sy: 0.12, sz: 0.16 }, 4);
    }
    for (const y of [0.35, 0.7]) b.rbox(color, { x: x1 + dx / 2, y, z: z1 + dz / 2, sx: 0.06, sy: 0.09, sz: len, ry }, 0.02);
  },
  rock(b, x, z, s = 1) {
    b.ico(0x9a9a92, { x, y: 0.12 * s, z, sx: 0.85 * s, sy: 0.5 * s, sz: 0.65 * s, g: 0.3 }, 0);
    b.ico(0xaaa9a0, { x: x + 0.4 * s, y: 0.08 * s, z: z + 0.25 * s, sx: 0.45 * s, sy: 0.3 * s, sz: 0.4 * s, g: 0.3 }, 0);
  },
  sign(b, x, z, ry = 0) {
    b.push(x, 0, z, ry);
    b.cyl(0x8a8f96, { x: -0.9, y: 1.2, sy: 2.4 }, 0.05, 0.05, 6);
    b.cyl(0x8a8f96, { x: 0.9, y: 1.2, sy: 2.4 }, 0.05, 0.05, 6);
    b.rbox(0x2b8a3e, { y: 2.05, z: -0.04, sx: 2.1, sy: 1.1, sz: 0.05 }, 0.03);
    b.pop();
  },
  pole(b, x, z) {
    // concrete electricity pole with insulators
    b.cyl(0xa3a39c, { x, y: 4, z, sy: 8 }, 0.08, 0.15, 6);
    b.rbox(0x6b6b66, { x, y: 7.6, z, sx: 1.5, sy: 0.1, sz: 0.1 }, 0.02);
    for (const dx of [-0.6, 0, 0.6]) b.cyl(0xf1f3f5, { x: x + dx, y: 7.75, z, sy: 0.2 }, 0.04, 0.06, 6);
  },
  lamp(b, x, z, color = 0x2f3136) {
    b.cyl(color, { x, y: 1.4, z, sy: 2.8 }, 0.05, 0.08, 8);
    b.cyl(color, { x, y: 0.1, z, sy: 0.2 }, 0.16, 0.18, 8);
    b.cyl(color, { x, y: 2.9, z, sy: 0.06 }, 0.2, 0.2, 8);
    b.sph(0xfff3bf, { x, y: 2.75, z, sx: 0.28, sy: 0.32, sz: 0.28, ao: false, j: 0 }, 8, 6);
  },
  matka(b, x, z, s = 1) {
    b.sph(0xb5653a, { x, y: 0.28 * s, z, sx: 0.5 * s, sy: 0.48 * s, sz: 0.5 * s }, 10, 8);
    b.cyl(0x9a5230, { x, y: 0.55 * s, z, sy: 0.1 * s }, 0.12 * s, 0.15 * s, 10);
  },
  sacks(b, x, z, n = 4, ry = 0, color = 0xd9c49a) {
    b.push(x, 0, z, ry);
    for (let i = 0; i < n; i++) {
      const lx = (i % 3 - 1) * 0.55, ly = Math.floor(i / 3) * 0.42, lz = (i % 2) * 0.08;
      b.sph(shade(color, (i % 3 - 1) * 0.04), { x: lx, y: 0.22 + ly, z: lz, sx: 0.55, sy: 0.42, sz: 0.4 }, 8, 6);
      b.box(shade(color, -0.25), { x: lx, y: 0.24 + ly, z: lz + 0.2, sx: 0.2, sy: 0.12, sz: 0.01, ao: false });
    }
    b.pop();
  },
  crates(b, x, z, n = 3, ry = 0) {
    b.push(x, 0, z, ry);
    for (let i = 0; i < n; i++) {
      const lx = (i % 2) * 0.55, ly = Math.floor(i / 2) * 0.36;
      b.rbox(0xb07a43, { x: lx, y: 0.18 + ly, sx: 0.5, sy: 0.34, sz: 0.4 }, 0.02);
      b.box(0x8a5a2b, { x: lx, y: 0.18 + ly, sx: 0.52, sy: 0.05, sz: 0.42 });
      b.sph([0xff7f27, 0xe8392c, 0x86c34a, 0xf4c542][i % 4], { x: lx, y: 0.36 + ly, sx: 0.4, sy: 0.12, sz: 0.3, ao: false }, 8, 4);
    }
    b.pop();
  },
  cart(b, x, z, ry = 0) {
    // rehri (hand cart) with wooden bed and spoked wheels
    b.push(x, 0, z, ry);
    b.rbox(0x9a6a3a, { y: 0.75, sx: 1.2, sy: 0.1, sz: 2.0 }, 0.03);
    for (const s of [-1, 1]) {
      b.rbox(0x7a4a24, { x: s * 0.6, y: 0.9, sx: 0.06, sy: 0.25, sz: 2.0 }, 0.02);
      b.torus(0x5e3f24, { x: s * 0.7, y: 0.45, ry: Math.PI / 2, s: 1 }, 0.42, 0.04, 6, 18);
      for (let i = 0; i < 6; i++) b.box(0x5e3f24, { x: s * 0.7, y: 0.45, rx: i / 6 * Math.PI, sx: 0.03, sy: 0.82, sz: 0.04 });
    }
    b.cyl(0x7a4a24, { y: 0.8, z: 1.4, rx: Math.PI / 2, sy: 1.0 }, 0.04, 0.04, 6);
    b.pop();
  },
  clothesline(b, x1, z, x2, colors) {
    for (const x of [x1, x2]) b.cyl(0x7a4a24, { x, y: 0.9, z, sy: 1.8 }, 0.04, 0.05, 6);
    b.box(0xeeeeee, { x: (x1 + x2) / 2, y: 1.72, z, sx: x2 - x1, sy: 0.015, sz: 0.015, ao: false });
    colors.forEach((c, i) => b.box(c, { x: x1 + (i + 0.8) * (x2 - x1) / (colors.length + 0.6), y: 1.42, z, sx: 0.42, sy: 0.55, sz: 0.02, rz: (i % 2 - 0.5) * 0.08 }));
  },
};

// Crate with a produce mound; the mound is tinted per item by instance colour.
export function crateGeometries() {
  const c = new Builder(0.04, { ao: 0.25, aoH: 0.12 });
  c.rbox(0xb07a43, { y: 0.09, sx: 0.46, sy: 0.18, sz: 0.36 }, 0.02);
  c.box(0x8a5a2b, { y: 0.09, sx: 0.48, sy: 0.04, sz: 0.38 });
  for (const s of [-1, 1]) c.box(0x8a5a2b, { x: s * 0.2, y: 0.09, sx: 0.05, sy: 0.19, sz: 0.37 });
  const t = new Builder(0.06, { ao: 0 });
  for (const [x, z] of [[-0.11, -0.07], [0.11, -0.07], [-0.11, 0.08], [0.11, 0.08], [0, 0]]) t.sph(0xffffff, { x, y: 0.2, z, s: 0.17, g: 0.25 }, 8, 6);
  return { crate: c.build(), top: t.build() };
}
