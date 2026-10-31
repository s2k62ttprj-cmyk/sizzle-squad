// Procedural 3D models: people, animals, vehicles and small props.
// Everything faces +z with its origin at ground level.
import * as THREE from 'three';
import { Builder, vcMaterial } from './geo.js';

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return c.getHex();
};

// ---------------------------------------------------------------- people
export function makeHuman(o = {}) {
  const skin = o.skin ?? 0xc68a5a, shirt = o.shirt ?? 0xf5f0e1, pants = o.pants ?? 0xf0ece0;
  const hair = o.hair ?? 0x1b1410;
  const group = new THREE.Group();
  const b = new Builder(0.03);
  // kurta: torso, flared skirt, shoulders
  b.cyl(shirt, { y: 1.12, sy: 0.6 }, 0.24, 0.28, 12);
  b.cyl(shirt, { y: 0.7, sy: 0.3 }, 0.28, 0.33, 12);
  b.sph(shirt, { y: 1.4, sx: 0.54, sy: 0.24, sz: 0.4 });
  if (o.vest) b.cyl(o.vest, { y: 1.18, sy: 0.46, sz: 0.92 }, 0.255, 0.285, 12);
  b.cyl(skin, { y: 1.5, sy: 0.12 }, 0.075, 0.085, 8);
  b.sph(skin, { y: 1.66, s: 0.4 }, 14, 10);
  b.sph(0x161010, { x: -0.07, y: 1.69, z: 0.175, s: 0.05 }, 6, 4);
  b.sph(0x161010, { x: 0.07, y: 1.69, z: 0.175, s: 0.05 }, 6, 4);
  b.sph(shade(skin, -0.06), { y: 1.645, z: 0.195, sx: 0.06, sy: 0.08, sz: 0.07 }, 6, 4);
  if (o.beard !== false && !o.dupatta) {
    b.sph(hair, { y: 1.535, z: 0.06, sx: 0.34, sy: 0.27, sz: 0.31 }, 10, 8);
    b.box(hair, { y: 1.61, z: 0.185, sx: 0.17, sy: 0.035, sz: 0.04 });
  }
  if (o.dupatta) {
    b.sph(o.dupatta, { y: 1.69, z: -0.02, sx: 0.46, sy: 0.46, sz: 0.46 }, 12, 8, Math.PI * 2, Math.PI * 0.62);
    b.box(o.dupatta, { y: 1.25, z: -0.25, sx: 0.44, sy: 0.7, sz: 0.04, rx: 0.08 });
  } else if (o.turban !== null) {
    const t = o.turban ?? 0xe8590c;
    b.cyl(t, { y: 1.765, sy: 0.12, rx: -0.12 }, 0.228, 0.212, 16);
    b.dome(t, { y: 1.79, sx: 0.47, sy: 0.36, sz: 0.5, rx: -0.12 }, 16, 8);
    b.cone(t, { y: 1.93, z: 0.1, sx: 0.16, sy: 0.16, sz: 0.1, rx: 0.35 }, 8);
    b.torus(shade(t, -0.12), { y: 1.81, z: 0.0, rx: Math.PI / 2 - 0.12, s: 0.95 }, 0.215, 0.018, 4, 20, Math.PI);
    b.torus(shade(t, -0.12), { y: 1.86, z: -0.01, rx: Math.PI / 2 - 0.12, s: 0.85 }, 0.215, 0.018, 4, 20, Math.PI);
  }
  const body = b.mesh();
  group.add(body);

  const limb = (color, r, len, handColor) => {
    const lb = new Builder(0.02);
    lb.capsule(color, { y: -len / 2 - 0.04 }, r, len, 8);
    if (handColor) lb.sph(handColor, { y: -len - 0.12, s: r * 2.3 }, 8, 6);
    else lb.box(o.shoes ?? 0x7a4a22, { y: -len - 0.13, z: 0.05, sx: 0.17, sy: 0.09, sz: 0.3 });
    const pivot = new THREE.Group();
    const m = lb.mesh();
    pivot.add(m);
    return pivot;
  };
  const armL = limb(shirt, 0.072, 0.42, skin), armR = limb(shirt, 0.072, 0.42, skin);
  armL.position.set(-0.31, 1.4, 0); armR.position.set(0.31, 1.4, 0);
  armL.rotation.z = -0.08; armR.rotation.z = 0.08;
  const legL = limb(pants, 0.095, 0.5), legR = limb(pants, 0.095, 0.5);
  legL.position.set(-0.12, 0.78, 0); legR.position.set(0.12, 0.78, 0);
  group.add(armL, armR, legL, legR);

  const tools = {};
  if (o.tools) {
    const hand = new THREE.Group();
    hand.position.set(0, -0.58, 0.04);
    armR.add(hand);
    const tb = new Builder(0.02);
    // kahi (Punjabi hoe)
    tb.cyl(0x9b6b3c, { y: 0, z: 0.35, rx: Math.PI / 2, sy: 1.0 }, 0.025, 0.025, 6);
    tb.box(0x8a9399, { y: -0.12, z: 0.85, sx: 0.26, sy: 0.24, sz: 0.03, rx: 0.2 });
    tools.hoe = tb.mesh();
    tb.cyl(0x2f9e5a, { y: -0.05, z: 0.12, sy: 0.3 }, 0.13, 0.13, 12);
    tb.cyl(0x2f9e5a, { y: 0.04, z: 0.38, rx: 1.1, sy: 0.4 }, 0.025, 0.04, 6);
    tb.torus(0x23784a, { y: 0.14, z: 0.12, ry: Math.PI / 2 }, 0.1, 0.018, 4, 10, Math.PI);
    tools.can = tb.mesh();
    tb.cyl(0x6b4a2b, { y: -0.08, rx: 0 , sy: 0.2 }, 0.025, 0.025, 6);
    tb.torus(0xc9ced3, { y: 0.1, z: 0.14, ry: Math.PI / 2, rz: 0.6 }, 0.17, 0.016, 3, 12, Math.PI * 1.1);
    tools.sickle = tb.mesh();
    tb.sph(0xd9c49a, { y: -0.12, sx: 0.24, sy: 0.3, sz: 0.2 }, 8, 6);
    tb.cyl(0xa98a55, { y: 0.04, sy: 0.06 }, 0.05, 0.08, 6);
    tools.seed = tb.mesh();
    for (const k in tools) { hand.add(tools[k]); tools[k].visible = false; }
  }
  if (o.scale) group.scale.setScalar(o.scale);
  return { group, body, armL, armR, legL, legR, tools };
}

// Walk / work / sit animation shared by player and NPCs.
export function animateHuman(h, t, speed, work = 0, sit = false) {
  if (sit) {
    h.legL.rotation.x = h.legR.rotation.x = -1.45;
    h.armL.rotation.x = h.armR.rotation.x = -0.9;
    h.body.position.y = 0;
    return;
  }
  const s = Math.min(1, speed / 4);
  const ph = t * (6 + speed * 1.4);
  const sw = Math.sin(ph) * 0.75 * s;
  h.legL.rotation.x = sw;
  h.legR.rotation.x = -sw;
  h.armL.rotation.x = -sw * 0.8;
  h.armR.rotation.x = work > 0 ? -1.3 + Math.sin(work * Math.PI) * 1.1 : sw * 0.8;
  h.body.position.y = Math.abs(Math.cos(ph)) * 0.05 * s;
}

// ---------------------------------------------------------------- animals
export function animalGeometry(kind) {
  const b = new Builder(0.06);
  if (kind === 'chicken') {
    b.sph(0xfdfbf4, { y: 0.32, sx: 0.36, sy: 0.32, sz: 0.44 });
    b.cone(0xf3efe2, { y: 0.45, z: -0.2, rx: -0.7, s: 0.2 }, 6);
    b.sph(0xfdfbf4, { y: 0.56, z: 0.15, s: 0.22 });
    b.box(0xe03131, { y: 0.69, z: 0.16, sx: 0.04, sy: 0.09, sz: 0.13 });
    b.sph(0xe03131, { y: 0.49, z: 0.24, s: 0.06 }, 6, 4);
    b.cone(0xf59f00, { y: 0.56, z: 0.29, rx: Math.PI / 2, sx: 0.06, sy: 0.1, sz: 0.06 }, 6);
    b.sph(0x111111, { x: -0.08, y: 0.59, z: 0.22, s: 0.035 }, 4, 3);
    b.sph(0x111111, { x: 0.08, y: 0.59, z: 0.22, s: 0.035 }, 4, 3);
    b.cyl(0xf59f00, { x: -0.07, y: 0.09, sy: 0.18 }, 0.02, 0.02, 4);
    b.cyl(0xf59f00, { x: 0.07, y: 0.09, sy: 0.18 }, 0.02, 0.02, 4);
  } else if (kind === 'buffalo') {
    const c = 0x26262b, d = 0x1a1a1e;
    b.capsule(c, { y: 1.0, rx: Math.PI / 2 }, 0.46, 0.85, 12);
    b.sph(c, { y: 1.02, z: 0.86, sx: 0.4, sy: 0.42, sz: 0.5, rx: 0.4 });
    b.sph(0x3a3a40, { y: 0.88, z: 1.08, sx: 0.3, sy: 0.24, sz: 0.24 });
    b.torus(0x5c5f66, { x: -0.22, y: 1.2, z: 0.78, ry: 1.3, rx: 0.2 }, 0.12, 0.045, 5, 12, Math.PI * 1.5);
    b.torus(0x5c5f66, { x: 0.22, y: 1.2, z: 0.78, ry: -1.3, rx: 0.2, rz: Math.PI }, 0.12, 0.045, 5, 12, Math.PI * 1.5);
    b.sph(d, { x: -0.3, y: 1.12, z: 0.82, sx: 0.2, sy: 0.08, sz: 0.12 });
    b.sph(d, { x: 0.3, y: 1.12, z: 0.82, sx: 0.2, sy: 0.08, sz: 0.12 });
    b.sph(0x111111, { x: -0.16, y: 1.12, z: 1.04, s: 0.06 }, 6, 4);
    b.sph(0x111111, { x: 0.16, y: 1.12, z: 1.04, s: 0.06 }, 6, 4);
    for (const [x, z] of [[-0.26, 0.5], [0.26, 0.5], [-0.26, -0.5], [0.26, -0.5]]) {
      b.cyl(c, { x, y: 0.38, z, sy: 0.78 }, 0.1, 0.085, 8);
      b.cyl(0x111111, { x, y: 0.04, z, sy: 0.08 }, 0.09, 0.1, 8);
    }
    b.cyl(c, { y: 0.8, z: -0.95, rx: 0.25, sy: 0.7 }, 0.03, 0.03, 4);
    b.sph(0x111111, { y: 0.45, z: -1.02, s: 0.1 }, 6, 4);
    b.sph(0xe8a0a0, { y: 0.6, z: -0.15, sx: 0.32, sy: 0.16, sz: 0.3 }, 8, 6);
  } else if (kind === 'goat') {
    const c = 0x8b5a3c;
    b.capsule(c, { y: 0.68, rx: Math.PI / 2 }, 0.26, 0.5, 10);
    b.sph(0xf2ede4, { y: 0.72, z: 0.1, sx: 0.5, sy: 0.4, sz: 0.4 });
    b.sph(c, { y: 0.98, z: 0.5, sx: 0.24, sy: 0.26, sz: 0.36, rx: 0.4 });
    b.box(0x5e3b24, { x: -0.16, y: 0.88, z: 0.48, sx: 0.06, sy: 0.3, sz: 0.12, rz: 0.3 });
    b.box(0x5e3b24, { x: 0.16, y: 0.88, z: 0.48, sx: 0.06, sy: 0.3, sz: 0.12, rz: -0.3 });
    b.cone(0x8f8a80, { x: -0.07, y: 1.15, z: 0.44, rx: -0.5, sx: 0.05, sy: 0.18, sz: 0.05 }, 5);
    b.cone(0x8f8a80, { x: 0.07, y: 1.15, z: 0.44, rx: -0.5, sx: 0.05, sy: 0.18, sz: 0.05 }, 5);
    b.sph(0x111111, { x: -0.09, y: 1.02, z: 0.6, s: 0.04 }, 4, 3);
    b.sph(0x111111, { x: 0.09, y: 1.02, z: 0.6, s: 0.04 }, 4, 3);
    for (const [x, z] of [[-0.14, 0.28], [0.14, 0.28], [-0.14, -0.28], [0.14, -0.28]]) b.cyl(c, { x, y: 0.25, z, sy: 0.5 }, 0.05, 0.045, 6);
  } else if (kind === 'sheep') {
    for (const [x, y, z, s] of [[0, 0.7, 0, 0.62], [-0.18, 0.72, 0.25, 0.42], [0.18, 0.72, 0.25, 0.42], [-0.18, 0.72, -0.25, 0.44], [0.18, 0.72, -0.25, 0.44], [0, 0.9, 0, 0.42]])
      b.sph(0xf4f1ea, { x, y, z, s }, 8, 6);
    b.sph(0x2b2622, { y: 0.84, z: 0.5, sx: 0.24, sy: 0.27, sz: 0.32, rx: 0.3 });
    b.sph(0x2b2622, { x: -0.15, y: 0.88, z: 0.46, sx: 0.14, sy: 0.06, sz: 0.08 });
    b.sph(0x2b2622, { x: 0.15, y: 0.88, z: 0.46, sx: 0.14, sy: 0.06, sz: 0.08 });
    b.sph(0xf4f1ea, { y: 0.97, z: 0.46, s: 0.18 }, 6, 4);
    for (const [x, z] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, -0.22], [0.15, -0.22]]) b.cyl(0x2b2622, { x, y: 0.22, z, sy: 0.44 }, 0.05, 0.045, 6);
  }
  return b.build();
}

// ---------------------------------------------------------------- vehicles
function wheel(r, w, tire = 0x1d1d1f, rim = 0xf2b705, spokes = true) {
  const b = new Builder(0.03);
  b.cyl(tire, { rz: Math.PI / 2, sy: w }, r, r, 18);
  b.cyl(rim, { rz: Math.PI / 2, sy: w * 1.04 }, r * 0.6, r * 0.6, 14);
  b.cyl(0x7a7f87, { rz: Math.PI / 2, sy: w * 1.1 }, r * 0.18, r * 0.18, 8);
  if (spokes) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    b.box(0x1d1d1f, { y: Math.cos(a) * r * 0.93, z: Math.sin(a) * r * 0.93, rx: -a, sx: w * 1.06, sy: r * 0.16, sz: r * 0.2 });
  }
  const m = b.mesh();
  const g = new THREE.Group();
  g.add(m);
  g.userData.r = r;
  return g;
}

export function makeTractor() {
  const group = new THREE.Group();
  const b = new Builder(0.03);
  const red = 0xd62828, dark = 0x2a2a2e;
  b.box(dark, { y: 0.62, z: 0.1, sx: 0.55, sy: 0.35, sz: 2.4 });
  b.box(red, { y: 1.08, z: 0.85, sx: 0.78, sy: 0.6, sz: 1.5 });
  b.box(shade(red, 0.08), { y: 1.4, z: 0.85, sx: 0.7, sy: 0.06, sz: 1.42 });
  b.box(0xf8f9fa, { y: 1.12, z: 0.85, sx: 0.8, sy: 0.08, sz: 1.52 });
  b.box(0x3b3b40, { y: 1.02, z: 1.61, sx: 0.66, sy: 0.48, sz: 0.04 });
  for (let i = 0; i < 4; i++) b.box(0x8a8f96, { y: 0.86 + i * 0.1, z: 1.63, sx: 0.6, sy: 0.03, sz: 0.02 });
  b.sph(0xfff7c2, { x: -0.3, y: 1.3, z: 1.6, s: 0.14 }, 8, 6);
  b.sph(0xfff7c2, { x: 0.3, y: 1.3, z: 1.6, s: 0.14 }, 8, 6);
  b.box(0x55585e, { y: 0.55, z: 1.75, sx: 0.7, sy: 0.3, sz: 0.25 });
  b.cyl(0x222222, { x: 0.26, y: 1.75, z: 1.15, sy: 0.75 }, 0.045, 0.05, 8);
  b.cyl(0xc0c4c9, { x: 0.26, y: 2.16, z: 1.15, sy: 0.12 }, 0.06, 0.045, 8);
  b.box(red, { y: 0.98, z: -0.35, sx: 0.7, sy: 0.4, sz: 1.0 });
  // rear fenders
  for (const x of [-0.78, 0.78]) {
    b.cyl(red, { x, y: 0.95, z: -0.55, rz: Math.PI / 2, sy: 0.5 }, 0.86, 0.86, 18, true);
    b.box(red, { x, y: 1.55, z: -0.55, sx: 0.5, sy: 0.05, sz: 0.9 });
  }
  b.box(0x1b1b1b, { y: 1.42, z: -0.6, sx: 0.55, sy: 0.12, sz: 0.5 });
  b.box(0x1b1b1b, { y: 1.72, z: -0.86, sx: 0.55, sy: 0.55, sz: 0.1, rx: -0.15 });
  b.cyl(0x333333, { y: 1.62, z: 0.12, rx: -0.6, sy: 0.55 }, 0.03, 0.03, 6);
  b.torus(0x222222, { y: 1.86, z: -0.04, rx: Math.PI / 2 - 0.6 }, 0.17, 0.025, 4, 14);
  b.box(0x4a4d52, { y: 0.55, z: -1.35, sx: 0.5, sy: 0.15, sz: 0.4 });
  // flag-style ribbons, common on Punjab tractors
  b.box(0xff922b, { x: -0.38, y: 1.95, z: 1.55, sx: 0.02, sy: 0.6, sz: 0.02 });
  b.box(0xff922b, { x: -0.38, y: 2.2, z: 1.68, sx: 0.02, sy: 0.18, sz: 0.25 });
  const body = b.mesh();
  group.add(body);
  const wheels = [];
  for (const [x, z, r, w] of [[-0.82, -0.55, 0.78, 0.42], [0.82, -0.55, 0.78, 0.42], [-0.6, 1.25, 0.42, 0.24], [0.6, 1.25, 0.42, 0.24]]) {
    const wh = wheel(r, w, 0x1d1d1f, 0xf2b705);
    wh.position.set(x, r, z);
    group.add(wh);
    wheels.push(wh);
  }
  const seat = new THREE.Object3D(); seat.position.set(0, 0.7, -0.58); group.add(seat);
  const rear = new THREE.Object3D(); rear.position.set(0, 0, -1.55); group.add(rear);
  const front = new THREE.Object3D(); front.position.set(0, 0, 1.85); group.add(front);
  return { group, wheels, seat, rear, front, steer: [wheels[2], wheels[3]] };
}

export function makeAttachment(kind) {
  const b = new Builder(0.04);
  const g = new THREE.Group();
  let spin = null;
  if (kind === 'cultivator') {
    b.box(0x1f5fbf, { y: 0.55, z: -0.35, sx: 2.1, sy: 0.14, sz: 0.14 });
    b.box(0x1f5fbf, { y: 0.55, z: -0.85, sx: 2.1, sy: 0.14, sz: 0.14 });
    b.box(0x1f5fbf, { y: 0.55, z: -0.2, sx: 0.14, sy: 0.14, sz: 0.5 });
    for (let i = 0; i < 6; i++) {
      const x = -0.9 + i * 0.36;
      b.box(0x6c7178, { x, y: 0.3, z: i % 2 ? -0.85 : -0.35, sx: 0.06, sy: 0.5, sz: 0.06 });
      b.box(0x9aa0a6, { x, y: 0.06, z: (i % 2 ? -0.85 : -0.35) + 0.06, sx: 0.08, sy: 0.04, sz: 0.2 });
    }
  } else if (kind === 'seeder') {
    b.box(0x2b8a3e, { y: 0.95, z: -0.6, sx: 2.0, sy: 0.6, sz: 0.7 });
    b.box(0xf2b705, { y: 1.28, z: -0.6, sx: 2.04, sy: 0.08, sz: 0.74 });
    b.box(0x3d4045, { y: 0.45, z: -0.6, sx: 2.1, sy: 0.12, sz: 0.2 });
    for (let i = 0; i < 7; i++) b.cyl(0x9aa0a6, { x: -0.9 + i * 0.3, y: 0.2, z: -0.65, rz: Math.PI / 2, sy: 0.04 }, 0.18, 0.18, 10);
  } else if (kind === 'sprayer') {
    b.cyl(0x1c7ed6, { y: 1.0, z: -0.9, rx: Math.PI / 2, sy: 1.5 }, 0.55, 0.55, 14);
    b.cyl(0xf8f9fa, { y: 1.56, z: -0.6, sy: 0.12 }, 0.15, 0.15, 8);
    b.box(0x3d4045, { y: 0.35, z: -1.75, sx: 3.2, sy: 0.08, sz: 0.08 });
    b.box(0x3d4045, { y: 0.55, z: -0.25, sx: 0.4, sy: 0.12, sz: 0.4 });
    for (const x of [-0.7, 0.7]) {
      const w = wheel(0.35, 0.2, 0x1d1d1f, 0x9aa0a6, false);
      w.position.set(x, 0.35, -1.0);
      g.add(w);
    }
  } else if (kind === 'reaper') {
    b.box(0xd62828, { y: 0.35, z: 0.6, sx: 3.0, sy: 0.28, sz: 0.8 });
    b.box(0x9aa0a6, { y: 0.2, z: 1.05, sx: 3.0, sy: 0.05, sz: 0.2 });
    for (let i = 0; i < 12; i++) b.cone(0xc9ced3, { x: -1.4 + i * 0.255, y: 0.2, z: 1.2, rx: Math.PI / 2, sx: 0.08, sy: 0.25, sz: 0.04 }, 4);
    b.box(0xd62828, { x: -1.5, y: 0.75, z: 0.75, sx: 0.08, sy: 0.9, sz: 0.5 });
    b.box(0xd62828, { x: 1.5, y: 0.75, z: 0.75, sx: 0.08, sy: 0.9, sz: 0.5 });
    const rb = new Builder(0.03);
    rb.cyl(0xf2b705, { rz: Math.PI / 2, sy: 2.9 }, 0.06, 0.06, 6);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      rb.box(0xf2b705, { y: Math.cos(a) * 0.32, z: Math.sin(a) * 0.32, sx: 2.9, sy: 0.05, sz: 0.1, rx: -a });
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
  const b = new Builder(0.03);
  const g = new THREE.Group();
  b.box(0x2f6fd0, { y: 0.95, z: -1.6, sx: 1.9, sy: 0.12, sz: 2.6 });
  b.box(0x3b7ddd, { x: -0.95, y: 1.3, z: -1.6, sx: 0.08, sy: 0.65, sz: 2.6 });
  b.box(0x3b7ddd, { x: 0.95, y: 1.3, z: -1.6, sx: 0.08, sy: 0.65, sz: 2.6 });
  b.box(0x3b7ddd, { y: 1.3, z: -2.9, sx: 1.9, sy: 0.65, sz: 0.08 });
  b.box(0x3b7ddd, { y: 1.3, z: -0.3, sx: 1.9, sy: 0.65, sz: 0.08 });
  b.box(0xffd43b, { y: 1.55, z: -2.92, sx: 1.9, sy: 0.08, sz: 0.06 });
  b.box(0x3d4045, { y: 0.8, z: 0.2, sx: 0.12, sy: 0.12, sz: 1.0 });
  g.add(b.mesh());
  const wheels = [];
  for (const x of [-1.05, 1.05]) {
    const w = wheel(0.5, 0.3, 0x1d1d1f, 0xf2b705, false);
    w.position.set(x, 0.5, -1.7);
    g.add(w);
    wheels.push(w);
  }
  const bed = new THREE.Object3D(); bed.position.set(0, 1.05, -1.6); g.add(bed);
  return { group: g, wheels, bed };
}

export function makeCombine() {
  const group = new THREE.Group();
  const b = new Builder(0.03);
  const body = 0x3f9b3f, trim = 0xf2c200;
  b.box(body, { y: 1.75, z: -0.4, sx: 2.4, sy: 1.9, sz: 3.6 });
  b.box(trim, { y: 0.95, z: -0.4, sx: 2.44, sy: 0.12, sz: 3.62 });
  b.box(body, { y: 3.0, z: -1.2, sx: 2.0, sy: 0.7, sz: 1.6 });
  b.box(0x9fd3f0, { y: 3.15, z: 0.95, sx: 1.3, sy: 1.0, sz: 1.1 });
  b.box(body, { y: 3.7, z: 0.95, sx: 1.4, sy: 0.12, sz: 1.2 });
  b.box(0x333333, { y: 2.6, z: 0.95, sx: 1.4, sy: 0.15, sz: 1.2 });
  b.cyl(trim, { x: 1.3, y: 3.2, z: -1.2, rz: -1.2, sy: 2.4 }, 0.12, 0.12, 8);
  b.box(trim, { y: 0.75, z: 2.2, sx: 4.6, sy: 0.55, sz: 1.0 });
  b.box(0x9aa0a6, { y: 0.45, z: 2.75, sx: 4.6, sy: 0.06, sz: 0.25 });
  for (let i = 0; i < 18; i++) b.cone(0xc9ced3, { x: -2.2 + i * 0.26, y: 0.45, z: 2.95, rx: Math.PI / 2, sx: 0.08, sy: 0.25, sz: 0.04 }, 4);
  b.box(trim, { x: -2.3, y: 1.2, z: 2.3, sx: 0.08, sy: 1.0, sz: 0.9 });
  b.box(trim, { x: 2.3, y: 1.2, z: 2.3, sx: 0.08, sy: 1.0, sz: 0.9 });
  b.box(body, { y: 1.3, z: 1.45, sx: 1.0, sy: 0.6, sz: 0.8 });
  group.add(b.mesh());
  const rb = new Builder(0.03);
  rb.cyl(0xd62828, { rz: Math.PI / 2, sy: 4.4 }, 0.07, 0.07, 6);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    rb.box(0xd62828, { y: Math.cos(a) * 0.42, z: Math.sin(a) * 0.42, sx: 4.4, sy: 0.05, sz: 0.12, rx: -a });
  }
  const reel = rb.mesh(undefined, false);
  reel.position.set(0, 1.5, 2.5);
  group.add(reel);
  const wheels = [];
  for (const [x, z, r, w] of [[-1.25, 0.6, 0.85, 0.55], [1.25, 0.6, 0.85, 0.55], [-1.1, -1.8, 0.55, 0.35], [1.1, -1.8, 0.55, 0.35]]) {
    const wh = wheel(r, w, 0x1d1d1f, trim);
    wh.position.set(x, r, z);
    group.add(wh);
    wheels.push(wh);
  }
  const seat = new THREE.Object3D(); seat.position.set(0, 2.25, 0.85); group.add(seat);
  return { group, wheels, seat, reel, front: (() => { const o = new THREE.Object3D(); o.position.set(0, 0, 2.6); group.add(o); return o; })() };
}

export function makeBike() {
  const group = new THREE.Group();
  const b = new Builder(0.03);
  b.box(0x1b1b1f, { y: 0.6, sx: 0.14, sy: 0.12, sz: 1.2 });
  b.sph(0x1b1b1f, { y: 0.9, z: 0.2, sx: 0.32, sy: 0.26, sz: 0.55 });
  b.sph(0xd9dde2, { y: 0.93, z: 0.2, sx: 0.26, sy: 0.12, sz: 0.4 });
  b.box(0x5a3a22, { y: 0.92, z: -0.35, sx: 0.28, sy: 0.1, sz: 0.55 });
  b.box(0x9aa0a6, { y: 0.45, z: 0.05, sx: 0.3, sy: 0.3, sz: 0.35 });
  b.cyl(0xc0c4c9, { x: 0.18, y: 0.4, z: -0.45, rx: Math.PI / 2 + 0.15, sy: 0.9 }, 0.04, 0.05, 6);
  b.cyl(0x9aa0a6, { y: 0.85, z: 0.62, rx: -0.35, sy: 0.6 }, 0.03, 0.03, 6);
  b.box(0x1b1b1f, { y: 1.15, z: 0.68, sx: 0.7, sy: 0.04, sz: 0.04 });
  b.sph(0xfff3bf, { y: 1.0, z: 0.78, s: 0.18 }, 8, 6);
  b.cyl(0x1b1b1f, { y: 0.7, z: -0.72, rz: Math.PI / 2, sy: 0.14 }, 0.36, 0.36, 12, true);
  group.add(b.mesh());
  const wheels = [];
  for (const z of [0.72, -0.72]) {
    const w = wheel(0.34, 0.1, 0x1d1d1f, 0xc0c4c9, false);
    w.position.set(0, 0.34, z);
    group.add(w);
    wheels.push(w);
  }
  const seat = new THREE.Object3D(); seat.position.set(0, 0.25, -0.3); group.add(seat);
  return { group, wheels, seat };
}

// ---------------------------------------------------------------- props (into a Builder)
export const props = {
  safeda(b, x, z, h = 8) {
    b.cyl(0xe6e0d2, { x, y: h / 2, z, sy: h }, 0.12, 0.2, 7);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + x;
      b.sph(0x5e8a3a, { x: x + Math.cos(a) * 0.5, y: h * 0.7 + i * 0.6, z: z + Math.sin(a) * 0.5, sx: 1.3, sy: 2.0, sz: 1.3 }, 8, 6);
    }
    b.sph(0x6b9a44, { x, y: h + 0.4, z, sx: 1.0, sy: 1.6, sz: 1.0 }, 8, 6);
  },
  tree(b, x, z, s = 1, leaf = 0x4f9a3a) {
    b.cyl(0x6b4a2b, { x, y: 1.1 * s, z, sy: 2.2 * s }, 0.18 * s, 0.26 * s, 7);
    const c = [[0, 2.9, 0, 2.6], [0.8, 2.5, 0.4, 1.8], [-0.8, 2.6, -0.3, 1.9], [0.2, 3.6, -0.3, 1.8], [-0.3, 2.4, 0.8, 1.6]];
    c.forEach(([dx, dy, dz, r], i) => b.sph(shade(leaf, (i % 3 - 1) * 0.04), { x: x + dx * s, y: dy * s, z: z + dz * s, s: r * s }, 9, 7));
  },
  kikar(b, x, z, s = 1) {
    b.cyl(0x5a3b22, { x, y: 1.3 * s, z, sy: 2.6 * s, rz: 0.12 }, 0.12 * s, 0.2 * s, 6);
    b.sph(0x6f8f3a, { x: x + 0.25 * s, y: 2.9 * s, z, sx: 3.6 * s, sy: 1.0 * s, sz: 3.2 * s }, 10, 6);
    b.sph(0x7a9a42, { x: x - 0.3 * s, y: 3.3 * s, z: z + 0.3 * s, sx: 2.2 * s, sy: 0.8 * s, sz: 2.0 * s }, 8, 5);
  },
  bush(b, x, z, s = 1, c = 0x4c9a35) {
    b.sph(c, { x, y: 0.35 * s, z, sx: 1.1 * s, sy: 0.8 * s, sz: 1.0 * s }, 8, 6);
    b.sph(shade(c, 0.05), { x: x + 0.35 * s, y: 0.3 * s, z: z + 0.2 * s, s: 0.6 * s }, 7, 5);
  },
  flowers(b, x, z, color) {
    for (let i = 0; i < 5; i++) {
      const dx = Math.cos(i * 2.4) * 0.35, dz = Math.sin(i * 2.4) * 0.35;
      b.cyl(0x3f8f2f, { x: x + dx, y: 0.15, z: z + dz, sy: 0.3 }, 0.015, 0.015, 4);
      b.sph(color, { x: x + dx, y: 0.32, z: z + dz, s: 0.16 }, 6, 4);
    }
  },
  kup(b, x, z, s = 1) {   // toori kup: conical straw stack
    b.cyl(0xd9b45a, { x, y: 0.7 * s, z, sy: 1.4 * s }, 1.05 * s, 1.15 * s, 14);
    b.cone(0xcfa84e, { x, y: 2.2 * s, z, sx: 2.2 * s, sy: 1.8 * s, sz: 2.2 * s }, 14);
    b.sph(0x8a6a3a, { x, y: 3.15 * s, z, s: 0.25 * s }, 6, 4);
  },
  charpai(b, x, z, ry = 0) {
    b.push(x, 0, z, ry);
    b.box(0x8b5a2b, { y: 0.45, sx: 1.0, sy: 0.08, sz: 1.9 });
    b.box(0xe9d8a6, { y: 0.5, sx: 0.88, sy: 0.04, sz: 1.78 });
    for (const [px, pz] of [[-0.45, -0.9], [0.45, -0.9], [-0.45, 0.9], [0.45, 0.9]]) b.cyl(0x6b4226, { x: px, y: 0.22, z: pz, sy: 0.45 }, 0.05, 0.04, 6);
    b.pop();
  },
  nalka(b, x, z) {   // hand pump
    b.box(0xb8b2a6, { x, y: 0.1, z, sx: 1.2, sy: 0.2, sz: 1.2 });
    b.cyl(0x2b8a3e, { x, y: 0.75, z, sy: 1.1 }, 0.09, 0.11, 8);
    b.cyl(0x2b8a3e, { x, y: 1.0, z: z + 0.25, rx: Math.PI / 2, sy: 0.4 }, 0.04, 0.05, 6);
    b.box(0x1d1d1f, { x, y: 1.35, z: z - 0.35, sx: 0.05, sy: 0.05, sz: 0.8, rx: -0.4 });
  },
  fence(b, x1, z1, x2, z2, color = 0x9a6a3a) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / 1.6));
    const ry = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      b.box(shade(color, -0.05), { x: x1 + dx * t, y: 0.45, z: z1 + dz * t, sx: 0.12, sy: 0.9, sz: 0.12 });
    }
    for (const y of [0.35, 0.7]) b.box(color, { x: x1 + dx / 2, y, z: z1 + dz / 2, sx: 0.06, sy: 0.08, sz: len, ry });
  },
  rock(b, x, z, s = 1) { b.sph(0x9a9a92, { x, y: 0.15 * s, z, sx: 0.8 * s, sy: 0.45 * s, sz: 0.6 * s }, 6, 4); },
  sign(b, x, z, ry = 0) {
    b.push(x, 0, z, ry);
    b.cyl(0x8a8f96, { x: -0.9, y: 1.2, sy: 2.4 }, 0.05, 0.05, 6);
    b.cyl(0x8a8f96, { x: 0.9, y: 1.2, sy: 2.4 }, 0.05, 0.05, 6);
    b.pop();
  },
  pole(b, x, z) {
    b.cyl(0x8f8f8a, { x, y: 4, z, sy: 8 }, 0.08, 0.14, 6);
    b.box(0x6b6b66, { x, y: 7.6, z, sx: 1.4, sy: 0.1, sz: 0.1 });
  },
};

// Crate with a produce mound; the mound is tinted per item by instance colour.
export function crateGeometries() {
  const c = new Builder(0.05);
  c.box(0xb07a43, { y: 0.09, sx: 0.46, sy: 0.18, sz: 0.36 });
  c.box(0x8a5a2b, { y: 0.09, sx: 0.48, sy: 0.04, sz: 0.38 });
  const t = new Builder(0.08);
  for (const [x, z] of [[-0.11, -0.07], [0.11, -0.07], [-0.11, 0.08], [0.11, 0.08], [0, 0]]) t.sph(0xffffff, { x, y: 0.2, z, s: 0.17 }, 6, 4);
  return { crate: c.build(), top: t.build() };
}
