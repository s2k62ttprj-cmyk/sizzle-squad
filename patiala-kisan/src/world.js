// Static world: terrain, roads, Patiala village buildings, Gurdwara Dukh Niwaran Sahib,
// trees and the collision map. Dynamic things (fields, pens, workshops) live in their systems.
import * as THREE from 'three';
import { Builder, vcMaterial, textTexture } from './geo.js';
import { props, shade } from './models.js';
import { groundMaterial, waterMaterial } from './shading.js';

export const BOUNDS = { x0: -46, x1: 41, z0: -64, z1: 44 };

export const POS = {
  spawn: [2.5, 6],
  tubewell: [-4.5, -4.2], tank: [-4.5, -1.9], tankPad: [-4.5, -0.25],
  stall: [10, -2], stallPad: [10, -4.9], pile: [14.2, -1.4],
  arhtiya: [5.2, -6.6], arhtiyaPad: [5.2, -3.8], board: [14.6, 3.2],
  godown: [7, -18], godownPad: [7, -14.6],
  farmhouse: [5, 10], garage: [15, 10],
  gate: [0, -30], sarovar: [0, -40], darbar: [0, -48.4], gurdwara: [0, -55],
  langar: [-16, -47.5], langarPad: [-16, -43.2], nishan: [11, -47],
  queue: [10, 0.4], customerSpawn: [10, 46],
  pens: { coop: [16, -20], tabela: [26, -20], bakri: [20, -8], bhed: [29, -8] },
  buildings: { chakki: [-11, 18.5], kohlu: [-4.5, 18.5], dairy: [5.5, 18.5], belna: [14.5, 18.5], dhaba: [21.5, 18.5], halwai: [28.5, 18.5], khaddi: [35.5, 18.5] },
  // manager desks (hire spot, and where each manager waits when idle)
  desks: { dukaandar: [14.6, -5.6], pali: [21.2, -14.9], munshi: [17.8, 3.4], mistri: [-15.8, 22.9] },
};

const MARBLE = 0xfbf8f1, GOLD = 0xf2bd3a, BRICK = 0xb4583a, PLASTER = 0xf3e2c4;
const WORLD = 220, HALF = WORLD / 2;

function noise(x, z) {
  return Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * 0.5 + Math.sin(z * 0.17 + x * 0.07) * 0.3 + Math.sin((x + z) * 0.6) * 0.2;
}
// terrain height: flat play area, rolling hills beyond the edges
export function terrainH(x, z) {
  const ox = Math.max(0, BOUNDS.x0 - 4 - x, x - BOUNDS.x1 - 4), oz = Math.max(0, BOUNDS.z0 - 6 - z, z - BOUNDS.z1 - 6);
  const out = Math.hypot(ox, oz);
  return out > 0 ? Math.min(9, out * 0.35) * (0.6 + 0.4 * noise(x * 0.5, z * 0.5)) : 0;
}

// ---------------------------------------------------------------- splat map
// Painted on canvases in world coordinates: dirt roads, marble plaza, worn ground
const SPLAT = 512;
class Splat {
  constructor() {
    this.ch = ['dirt', 'marble', 'wear'].map(() => { const c = document.createElement('canvas'); c.width = c.height = SPLAT; const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#000'; x.fillRect(0, 0, SPLAT, SPLAT); x.fillStyle = '#fff'; return x; });
  }
  px(v) { return (v + HALF) / WORLD * SPLAT; }
  // soft rectangle: several expanding layers give a feathered edge
  rect(ch, x0, z0, x1, z1, soft = 0.6, a = 1) {
    const c = this.ch[ch];
    const L = 5;
    for (let i = L; i >= 0; i--) {
      const e = soft * i / L;
      c.globalAlpha = a * (i === 0 ? 1 : 0.22);
      const X0 = this.px(x0 - e), Z0 = this.px(z0 - e), X1 = this.px(x1 + e), Z1 = this.px(z1 + e);
      c.beginPath();
      if (c.roundRect) c.roundRect(X0, Z0, X1 - X0, Z1 - Z0, Math.max(1, (e + 0.3) / WORLD * SPLAT));
      else c.rect(X0, Z0, X1 - X0, Z1 - Z0);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  circle(ch, x, z, r, soft = 0.8, a = 1) {
    const c = this.ch[ch];
    const g = c.createRadialGradient(this.px(x), this.px(z), 0, this.px(x), this.px(z), (r + soft) / WORLD * SPLAT);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(r / (r + soft), `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(this.px(x), this.px(z), (r + soft) / WORLD * SPLAT, 0, 7); c.fill();
    c.fillStyle = '#fff';
  }
  texture() {
    const out = document.createElement('canvas');
    out.width = out.height = SPLAT;
    const o = out.getContext('2d');
    const img = o.createImageData(SPLAT, SPLAT), d = img.data;
    const data = this.ch.map((c) => c.getImageData(0, 0, SPLAT, SPLAT).data);
    this.dirt = new Uint8Array(SPLAT * SPLAT);
    this.marble = new Uint8Array(SPLAT * SPLAT);
    for (let i = 0; i < SPLAT * SPLAT; i++) {
      d[i * 4] = data[0][i * 4]; d[i * 4 + 1] = data[1][i * 4]; d[i * 4 + 2] = data[2][i * 4]; d[i * 4 + 3] = 255;
      this.dirt[i] = data[0][i * 4]; this.marble[i] = data[1][i * 4];
    }
    o.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.flipY = false;               // canvas rows map straight to +z
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }
  // 0..1 surface value at a world position (used to keep grass off roads)
  at(kind, x, z) {
    const i = Math.max(0, Math.min(SPLAT - 1, Math.floor(this.px(x)))), j = Math.max(0, Math.min(SPLAT - 1, Math.floor(this.px(z))));
    return this[kind][j * SPLAT + i] / 255;
  }
}

export function buildWorld(game) {
  const { scene } = game;
  const colliders = [];
  const rect = (cx, cz, w, d) => colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  const circ = (x, z, r) => colliders.push({ x, z, r });
  const anim = [];      // per-frame callbacks for water, flags, smoke
  const glows = [];     // [x, y, z, size] lamp positions that glow at dusk
  game.glows = glows;

  // ---------- splat: roads, yards and the Gurdwara plaza
  const sp = new Splat();
  sp.rect(0, -1.6, -29, 1.6, 44, 0.7);             // main road north-south
  sp.rect(0, 3, -9, 16.5, 5.5, 0.9);              // mandi plaza
  sp.rect(0, 9, 5, 11, 46, 0.6);                  // customer road
  sp.rect(0, -17, 21.5, 39, 24.5, 0.7);           // south lane (workshops)
  sp.rect(0, 1.5, -15.6, 34, -13.4, 0.7);         // east lane (godown, pens)
  sp.rect(0, -27, -8.2, -1.6, -7.3, 0.35, 0.85);  // bund walks between fields
  sp.rect(0, -41, 1.8, -1.6, 3.2, 0.35, 0.85);
  sp.circle(0, 0, 2.3, 3.4, 1.2);                 // vehra (farmyard)
  sp.circle(0, POS.farmhouse[0], POS.farmhouse[1] + 2.5, 3.5, 1.5, 0.9);
  sp.circle(0, POS.tubewell[0], POS.tubewell[1] + 1.2, 2.6, 1.0);
  sp.rect(0, 3, -21, 11, -14.5, 0.8);             // godown yard
  for (const [x, z] of Object.values(POS.buildings)) sp.rect(0, x - 3.2, z + 2.0, x + 3.2, z + 3.6, 0.6, 0.9);
  for (const [x, z] of Object.values(POS.pens)) sp.rect(0, x - 3.4, z - 2.8, x + 3.4, z + 2.8, 0.5, 0.75);
  for (const [x, z] of Object.values(POS.desks)) sp.circle(0, x, z, 1.1, 0.8, 0.8);
  sp.rect(0, -45, -80, -41.5, 80, 0.8, 0.9);       // canal bank
  sp.rect(1, -22, -63, 16, -29, 0.25);            // marble plaza
  sp.rect(1, -2.4, -29.5, 2.4, -26, 0.2);         // gate steps
  // wear: darker trampled ground at busy spots
  for (const [x, z] of [POS.stallPad, POS.pile, POS.arhtiyaPad, POS.godownPad, POS.tankPad, POS.queue, [10, 3], [0, 0]]) sp.circle(2, x, z, 1.3, 1.2, 0.6);
  for (const [x, z] of Object.values(POS.pens)) sp.rect(2, x - 3, z - 2.4, x + 3, z + 2.4, 0.6, 0.55);
  sp.rect(2, -1.0, -29, 1.0, 44, 0.4, 0.35);      // wheel ruts down the road
  sp.rect(2, -45, -80, -42, 80, 0.6, 0.5);
  const splat = sp.texture();
  game.surface = (kind, x, z) => sp.at(kind, x, z);

  // ---------- terrain (one mesh, splat-blended grass, dirt and marble)
  const seg = 110;
  const tg = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainH(x, z);
    pos.setY(i, h - 0.02);
    const n = noise(x, z) * 0.5 + 0.5, n2 = noise(x * 2.3 + 7, z * 2.1 - 3) * 0.5 + 0.5;
    let r = 0.94 + n * 0.12, g = 0.95 + n2 * 0.1, bl = 0.9 + n * 0.12;
    if (h > 0) { const k = Math.min(1, h / 6); r *= 1 - k * 0.22; g *= 1 - k * 0.1; bl *= 1 - k * 0.25; }
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = bl;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, groundMaterial(splat, [-HALF, -HALF], WORLD));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- static buildings and props (merged into a few chunks)
  const b = new Builder(0.03);

  // garage floor and kerbs around the Gurdwara plaza
  b.rbox(0xc9c2b4, { x: 13, y: 0.03, z: 9.75, sx: 4.4, sy: 0.08, sz: 7.9 }, 0.03);
  for (const [x0, z0, x1, z1] of [[-22.2, -63.2, 16.2, -62.9], [-22.2, -63.2, -21.9, -29], [15.9, -63.2, 16.2, -29], [-22.2, -29.2, -2.6, -28.9], [2.6, -29.2, 16.2, -28.9]])
    b.rbox(0xe8e0d0, { x: (x0 + x1) / 2, y: 0.08, z: (z0 + z1) / 2, sx: x1 - x0, sy: 0.16, sz: z1 - z0 }, 0.04);

  // ---- Farmhouse (kothi): brick plinth, plastered walls, veranda, parapet, roof tank
  {
    const [x, z] = POS.farmhouse;
    b.push(x, 0, z);
    b.rbox(0xc9b9a0, { y: 0.2, sx: 6.8, sy: 0.4, sz: 5.2 }, 0.05);
    for (let i = 0; i < 3; i++) b.rbox(0xd8cbb3, { y: 0.06 + i * 0.12, z: 2.75 + 0.3 - i * 0.18, sx: 1.6, sy: 0.12, sz: 0.4 }, 0.02);
    b.rbox(PLASTER, { y: 1.85, z: -0.4, sx: 6, sy: 2.9, sz: 3.8 }, 0.06);
    b.box(0xc87f5a, { y: 0.55, z: 1.51, sx: 6.02, sy: 0.3, sz: 0.02, ao: false });
    b.rbox(0xe9cfa3, { y: 3.32, z: -0.4, sx: 6.3, sy: 0.16, sz: 4.1 }, 0.04);
    // parapet with jaali (lattice) panels
    for (const s of [-1, 1]) b.rbox(PLASTER, { x: s * 3.08, y: 3.62, z: -0.4, sx: 0.16, sy: 0.5, sz: 4.1 }, 0.03);
    b.rbox(PLASTER, { y: 3.62, z: -2.42, sx: 6.3, sy: 0.5, sz: 0.16 }, 0.03);
    for (let i = 0; i < 6; i++) {
      b.rbox(PLASTER, { x: -2.6 + i * 1.04, y: 3.62, z: 1.62, sx: 0.2, sy: 0.5, sz: 0.16 }, 0.03);
      if (i < 5) for (let k = 0; k < 3; k++) b.box(0xe0c99c, { x: -2.08 + i * 1.04, y: 3.48 + k * 0.14, z: 1.62, sx: 0.8, sy: 0.04, sz: 0.06 });
    }
    b.rbox(0xe9cfa3, { y: 3.88, z: 1.62, sx: 6.3, sy: 0.06, sz: 0.24 }, 0.02);
    // door with frame, windows with grills and shutters
    b.rbox(0x7a4a24, { y: 1.3, z: 1.52, sx: 1.2, sy: 2.1, sz: 0.08 }, 0.03);
    b.rbox(0x5a3418, { y: 1.3, z: 1.56, sx: 0.04, sy: 1.9, sz: 0.02 }, 0.01);
    b.box(0xf2c94c, { y: 2.45, z: 1.53, sx: 1.4, sy: 0.12, sz: 0.06 });
    for (const wx of [-2, 2]) {
      b.rbox(0xffffff, { x: wx, y: 1.95, z: 1.5, sx: 1.2, sy: 1.1, sz: 0.08 }, 0.03);
      b.box(0x6fa8dc, { x: wx, y: 1.95, z: 1.53, sx: 1.0, sy: 0.9, sz: 0.04 });
      for (let k = 0; k < 4; k++) b.box(0x3b3b3b, { x: wx - 0.36 + k * 0.24, y: 1.95, z: 1.56, sx: 0.025, sy: 0.9, sz: 0.02, ao: false });
      for (const s of [-1, 1]) b.rbox(0x2b8a3e, { x: wx + s * 0.78, y: 1.95, z: 1.53, sx: 0.36, sy: 1.0, sz: 0.05 }, 0.02);
    }
    // veranda roof on pillars, with a hanging bulb
    b.rbox(0xe9cfa3, { y: 2.95, z: 2.15, sx: 6.4, sy: 0.15, sz: 1.5 }, 0.04);
    for (const px of [-2.9, -1, 1, 2.9]) {
      b.cyl(0xf8efe0, { x: px, y: 1.5, z: 2.7, sy: 2.8 }, 0.12, 0.14, 10);
      b.rbox(0xe9cfa3, { x: px, y: 0.12, z: 2.7, sx: 0.36, sy: 0.24, sz: 0.36 }, 0.03);
      b.rbox(0xe9cfa3, { x: px, y: 2.84, z: 2.7, sx: 0.32, sy: 0.12, sz: 0.32 }, 0.03);
    }
    glows.push([x, 2.7, z + 2.2, 1.4]);
    // roof: water tank, dish, potted plants, chulha chimney
    b.cyl(0x4a4f57, { x: 1.8, y: 4.35, z: -1.2, sy: 0.9 }, 0.42, 0.46, 14);
    b.cyl(0x4a4f57, { x: 1.8, y: 4.85, z: -1.2, sy: 0.1 }, 0.22, 0.42, 14);
    for (const [px, pz] of [[1.5, -1.5], [2.1, -1.5], [1.5, -0.9], [2.1, -0.9]]) b.cyl(0x6c7178, { x: px, y: 3.65, z: pz, sy: 0.5 }, 0.03, 0.03, 4);
    b.sph(0xdee2e6, { x: -1.9, y: 4.1, z: -1.6, sx: 0.7, sy: 0.7, sz: 0.25, rx: -0.6, ry: 0.4 }, 10, 6, Math.PI * 2, Math.PI / 2);
    b.cyl(0x8a8f96, { x: -1.9, y: 3.75, z: -1.6, sy: 0.4 }, 0.03, 0.03, 4);
    for (const px of [-2.6, -1.5, 0.3]) { b.cyl(0xb5653a, { x: px, y: 3.62, z: 1.35, sy: 0.3 }, 0.16, 0.12, 8); b.ico(0x3f8f35, { x: px, y: 3.92, z: 1.35, s: 0.4 }, 1); }
    b.rbox(0xa4553a, { x: -2.5, y: 4.0, z: -2.0, sx: 0.4, sy: 1.0, sz: 0.4 }, 0.04);
    b.box(0xb5a58c, { x: -3.25, y: 2, z: -1.3, sx: 0.5, sy: 0.1, sz: 0.8, rz: 0.9 });
    b.pop();
    rect(x, z - 0.4, 6.2, 4.0);
    game.chimney = new THREE.Vector3(x - 2.5, 4.6, z - 2.0);
    // yard: hand pump, charpai, matkas, clothesline, tulsi, buffalo-cart wheel
    props.nalka(b, x + 4.2, z + 2.5);
    props.charpai(b, x + 1.6, z + 2.0, 1.5);
    props.matka(b, x - 3.6, z + 1.9); props.matka(b, x - 3.1, z + 2.2, 0.8);
    props.clothesline(b, x - 3.2, z - 3.2, x + 0.4, [0xf06595, 0x4dabf7, 0xffd43b, 0xffffff, 0x69db7c]);
    b.rbox(0xe9cfa3, { x: x + 3.9, y: 0.35, z: z - 1.5, sx: 0.6, sy: 0.7, sz: 0.6 }, 0.05);
    b.ico(0x2f8a3a, { x: x + 3.9, y: 0.95, z: z - 1.5, s: 0.7 }, 1);
    circ(x + 4.2, z + 2.5, 0.4);
    // boundary wall with a gate gap facing the road
    for (const [x0, x1] of [[x - 4.4, x - 1.2], [x + 1.2, x + 4.6]]) {
      b.rbox(BRICK, { x: (x0 + x1) / 2, y: 0.45, z: z + 4.4, sx: x1 - x0, sy: 0.9, sz: 0.25 }, 0.04);
      b.rbox(0xe9cfa3, { x: (x0 + x1) / 2, y: 0.93, z: z + 4.4, sx: x1 - x0 + 0.1, sy: 0.08, sz: 0.32 }, 0.02);
      rect((x0 + x1) / 2, z + 4.4, x1 - x0, 0.3);
    }
    for (const s of [-1, 1]) { b.rbox(PLASTER, { x: x + s * 1.3, y: 0.7, z: z + 4.4, sx: 0.4, sy: 1.4, sz: 0.4 }, 0.04); b.sph(0xf2c94c, { x: x + s * 1.3, y: 1.5, z: z + 4.4, s: 0.26 }, 8, 6); }
  }

  // ---- Garage: steel-pillar shed with a corrugated roof
  {
    const [x, z] = POS.garage;
    for (const [px, pz] of [[-2.8, -2.6], [2.8, -2.6], [-2.8, 2.6], [2.8, 2.6]]) {
      b.cyl(0x8a8f96, { x: x + px, y: 1.6, z: z + pz, sy: 3.2 }, 0.09, 0.09, 8);
      b.rbox(0x6c7178, { x: x + px, y: 0.1, z: z + pz, sx: 0.3, sy: 0.2, sz: 0.3 }, 0.03);
      circ(x + px, z + pz, 0.2);
    }
    for (let i = 0; i < 12; i++) b.cyl(i % 2 ? 0x2f9e8f : 0x37b3a2, { x: x - 2.85 + i * 0.52, y: 3.25 + (i % 2) * 0.02, z, rx: Math.PI / 2 + 0.06, sy: 5.8 }, 0.27, 0.27, 6, true);
    b.rbox(0x24857a, { x, y: 3.32, z: z + 2.95, sx: 6.3, sy: 0.12, sz: 0.1 }, 0.03);
    for (const k of [0, 1, 2]) b.rbox([0xe03131, 0x1c7ed6, 0xf2c200][k], { x: x + 2.5, y: 0.25 + k * 0.5, z: z - 2.6, sx: 0.5, sy: 0.48, sz: 0.5 }, 0.05);
    b.cyl(0x343a40, { x: x - 2.4, y: 0.45, z: z - 2.4, sy: 0.9 }, 0.3, 0.3, 12);
    b.cyl(0x495057, { x: x - 2.4, y: 0.9, z: z - 2.4, sy: 0.04 }, 0.3, 0.3, 12);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'GARAGE · ਗੈਰਾਜ', size: 46 }], { w: 512, h: 110, bg: '#1d6f66' }) }));
    s.position.set(x, 3.0, z + 3.02);
    scene.add(s);
  }

  // ---- Tubewell kotha (brick pump room) and chubacha (water tank) with gushing pipe
  {
    const [x, z] = POS.tubewell;
    b.rbox(BRICK, { x, y: 1.1, z, sx: 2.4, sy: 2.2, sz: 2.2 }, 0.05);
    for (let i = 0; i < 8; i++) b.box(shade(BRICK, -0.08), { x, y: 0.2 + i * 0.27, z: z + 1.105, sx: 2.38, sy: 0.025, sz: 0.01, ao: false });
    for (let i = 0; i < 8; i++) for (let k = 0; k < 4; k++) b.box(shade(BRICK, -0.08), { x: x - 0.9 + k * 0.6 + (i % 2) * 0.3, y: 0.33 + i * 0.27, z: z + 1.105, sx: 0.025, sy: 0.25, sz: 0.01, ao: false });
    b.rbox(0xc9b9a0, { x, y: 2.28, z, sx: 2.7, sy: 0.16, sz: 2.5 }, 0.04);
    b.rbox(0x2f6fb0, { x: x - 0.5, y: 0.9, z: z + 1.12, sx: 0.8, sy: 1.6, sz: 0.05 }, 0.02);
    b.box(0x1d1d1f, { x: x - 0.2, y: 0.95, z: z + 1.16, sx: 0.06, sy: 0.06, sz: 0.04 });
    b.rbox(0x868e96, { x: x + 0.7, y: 1.8, z: z + 1.12, sx: 0.5, sy: 0.6, sz: 0.1 }, 0.03);
    // electric line to the kotha
    b.cyl(0xa3a39c, { x: x - 1.6, y: 2.6, z: z - 0.8, sy: 5.2 }, 0.06, 0.1, 6);
    const [tx, tz] = POS.tank;
    b.rbox(BRICK, { x: tx, y: 0.36, z: tz, sx: 2.1, sy: 0.72, sz: 1.4 }, 0.05);
    b.rbox(0xc9b9a0, { x: tx, y: 0.74, z: tz, sx: 2.2, sy: 0.06, sz: 1.5 }, 0.02);
    b.cyl(0x6c7178, { x: tx + 0.3, y: 1.05, z: tz - 0.7, rx: Math.PI / 2, sy: 0.7 }, 0.13, 0.13, 10);
    b.cyl(0x6c7178, { x: tx + 0.3, y: 0.9, z: tz - 1.05, sy: 0.4 }, 0.13, 0.13, 10);
    rect(x, z, 2.5, 2.4);
    rect(tx, tz, 2.1, 1.4);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), waterMaterial(1.8, 1.1, { foam: 0.12 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(tx, 0.64, tz);
    scene.add(water);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.45, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.8, emissive: 0x3a7a9a }));
    stream.position.set(tx + 0.3, 0.83, tz - 0.3);
    scene.add(stream);
    anim.push((t) => { stream.scale.x = stream.scale.z = 1 + Math.sin(t * 20) * 0.14; stream.rotation.y = t * 3; });
    game.tubewellSpout = new THREE.Vector3(tx + 0.3, 0.7, tz - 0.2);
  }

  // ---- Mandi stall: wooden counter, crates, a tarazu and striped awning
  {
    const [x, z] = POS.stall;
    b.push(x, 0, z);
    b.rbox(0x9a6a3a, { y: 0.55, z: 0.5, sx: 5, sy: 1.1, sz: 1.2 }, 0.05);
    for (let i = 0; i < 9; i++) b.box(0x8a5a2b, { x: -2.25 + i * 0.56, y: 0.55, z: 1.11, sx: 0.04, sy: 1.0, sz: 0.02, ao: false });
    b.rbox(0xc08850, { y: 1.14, z: 0.5, sx: 5.2, sy: 0.08, sz: 1.35 }, 0.03);
    b.rbox(0xb07a43, { y: 0.9, z: -0.6, sx: 5, sy: 0.12, sz: 1.0 }, 0.03);
    for (const px of [-2.45, 2.45]) for (const pz of [-1.15, -0.2]) b.rbox(0x7a4a24, { x: px, y: 1.35, z: pz, sx: 0.14, sy: 2.7, sz: 0.14 }, 0.03);
    for (let i = 0; i < 10; i++) b.box(i % 2 ? 0xffffff : 0xf76707, { x: -2.5 + 0.25 + i * 0.5, y: 2.65, z: -0.75, sx: 0.5, sy: 0.07, sz: 1.5, rx: 0.32 });
    for (let i = 0; i < 10; i++) b.cone(i % 2 ? 0xffffff : 0xf76707, { x: -2.25 + i * 0.5, y: 2.3, z: 0.02, rx: Math.PI, sx: 0.5, sy: 0.3, sz: 0.1 }, 3);
    // hanging bulbs and a marigold garland
    for (const px of [-1.4, 1.4]) { b.cyl(0x222222, { x: px, y: 2.2, z: -0.1, sy: 0.3 }, 0.01, 0.01, 3); b.sph(0xfff3bf, { x: px, y: 2.02, z: -0.1, s: 0.14, ao: false, j: 0 }, 6, 4); glows.push([x + px, 2.02, z - 0.1, 0.9]); }
    for (let i = 0; i < 14; i++) b.sph(i % 2 ? 0xff922b : 0xffd43b, { x: -2.3 + i * 0.35, y: 2.15 - Math.sin(i / 13 * Math.PI) * 0.25, z: 0.0, s: 0.1, ao: false }, 5, 4);
    // tarazu (weighing scale) and side crates
    b.cyl(0x7a4a24, { x: 1.9, y: 1.45, z: 0.4, sy: 0.6 }, 0.02, 0.02, 4);
    b.box(0x7a4a24, { x: 1.9, y: 1.74, z: 0.4, sx: 0.6, sy: 0.03, sz: 0.03 });
    for (const s of [-1, 1]) b.cyl(0xc0c4c9, { x: 1.9 + s * 0.28, y: 1.5, z: 0.4, sy: 0.03 }, 0.13, 0.11, 10);
    b.pop();
    props.crates(b, x - 3.3, z + 0.9, 4, 0.2);
    props.sacks(b, x - 3.4, z + 2.1, 3, 0.3);
    rect(x, z, 5.2, 2.6);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਮੰਡੀ  MANDI' }], { w: 512, h: 150, bg: '#f76707' }) }));
    sign.position.set(x, 3.25, z - 0.6);
    sign.rotation.x = -0.3;
    scene.add(sign);
  }

  // ---- Arhtiya (wholesale) shed with gunny sacks, a big tarazu and a desk
  {
    const [x, z] = POS.arhtiya;
    for (const [px, pz] of [[-2, -1.3], [2, -1.3], [-2, 1.3], [2, 1.3]]) b.cyl(0x6c7178, { x: x + px, y: 1.4, z: z + pz, sy: 2.8 }, 0.07, 0.07, 8);
    for (let i = 0; i < 9; i++) b.cyl(i % 2 ? 0xa8b0b8 : 0xb8c0c8, { x: x - 2.2 + i * 0.55, y: 2.85 + (i % 2) * 0.02, z, rx: Math.PI / 2 - 0.12, sy: 3.3 }, 0.28, 0.28, 6, true);
    props.sacks(b, x - 1.0, z - 0.7, 7, 0);
    b.rbox(0x7a4a24, { x: x + 1.2, y: 0.5, z: z + 0.6, sx: 0.1, sy: 1.0, sz: 0.1 }, 0.02);
    b.box(0x7a4a24, { x: x + 1.2, y: 1.0, z: z + 0.6, sx: 1.0, sy: 0.05, sz: 0.05 });
    b.cyl(0xc0c4c9, { x: x + 0.75, y: 0.6, z: z + 0.6, sy: 0.04 }, 0.22, 0.2, 12);
    b.cyl(0xc0c4c9, { x: x + 1.65, y: 0.6, z: z + 0.6, sy: 0.04 }, 0.22, 0.2, 12);
    for (const s of [-1, 1]) b.cyl(0x666666, { x: x + 1.2 + s * 0.45, y: 0.8, z: z + 0.6, sy: 0.4 }, 0.006, 0.006, 3);
    rect(x, z - 0.4, 4.4, 2.2);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਆੜ੍ਹਤੀ ARHTIYA', size: 46 }], { w: 512, h: 110, bg: '#8a5a24' }) }));
    s.position.set(x, 2.55, z + 1.36);
    scene.add(s);
  }

  // ---- Order board with pinned chits
  {
    const [x, z] = POS.board;
    for (const s of [-1, 1]) { b.rbox(0x7a4a24, { x: x + s * 0.9, y: 1.1, z, sx: 0.13, sy: 2.2, sz: 0.13 }, 0.03); circ(x + s * 0.9, z, 0.2); }
    b.rbox(0xb07a43, { x, y: 1.6, z, sx: 2.1, sy: 1.1, sz: 0.08 }, 0.03);
    b.prism(0xc92a2a, { x, y: 2.2, z, sx: 2.4, sy: 0.35, sz: 0.5 });
    for (const [px, py, cc] of [[-0.55, 1.75, 0xfff3bf], [0.05, 1.55, 0xffffff], [0.6, 1.72, 0xd0ebff]]) {
      b.box(cc, { x: x + px, y: py, z: z + 0.05, sx: 0.45, sy: 0.55, sz: 0.02, rz: px * 0.1 });
      b.sph(0xe03131, { x: x + px, y: py + 0.22, z: z + 0.07, s: 0.05, ao: false }, 5, 3);
    }
  }

  // ---- Godown: corrugated vaulted roof, rolling shutter, loading dock, sacks
  {
    const [x, z] = POS.godown;
    b.rbox(0x9db1bf, { x, y: 1.6, z, sx: 7, sy: 3.2, sz: 4.2 }, 0.06);
    for (let i = 0; i < 14; i++) b.box(0x8aa1b1, { x: x - 3.25 + i * 0.5, y: 1.6, z: z + 2.11, sx: 0.04, sy: 3.1, sz: 0.02, ao: false });
    b.cyl(0x9aa5ad, { x, y: 3.2, z, rz: Math.PI / 2, sy: 7.2 }, 2.2, 2.2, 20, false, );
    for (let i = 0; i < 9; i++) b.torus(0x86939c, { x: x - 3.4 + i * 0.85, y: 3.2, z, ry: Math.PI / 2, s: 1 }, 2.21, 0.025, 3, 20, Math.PI);
    b.rbox(0x6c7a86, { x, y: 1.3, z: z + 2.12, sx: 3.2, sy: 2.6, sz: 0.06 }, 0.02);
    for (let i = 0; i < 12; i++) b.box(0x5a6672, { x, y: 0.15 + i * 0.21, z: z + 2.16, sx: 3.2, sy: 0.03, sz: 0.02 });
    b.rbox(0xc9c2b4, { x, y: 0.2, z: z + 2.6, sx: 4.2, sy: 0.4, sz: 1.0 }, 0.04);
    props.sacks(b, x + 2.9, z + 2.8, 5, 0.2);
    props.sacks(b, x - 3.0, z + 2.8, 4, -0.2, 0xe9d8a6);
    glows.push([x, 3.0, z + 2.3, 1.2]);
    rect(x, z, 7.2, 4.4);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'GODOWN · ਗੋਦਾਮ' }], { w: 512, h: 128, bg: '#2b4a63' }) }));
    sign.position.set(x, 3.0, z + 2.2);
    scene.add(sign);
  }

  // ---- Manager desks: table, ledger, stool and a striped chhatri (umbrella)
  for (const [role, [x, z]] of Object.entries(POS.desks)) {
    const c = { dukaandar: 0xf76707, pali: 0x2b8a3e, munshi: 0x1c4fd1, mistri: 0x7048e8 }[role];
    b.push(x, 0, z);
    b.rbox(0x9a6a3a, { y: 0.72, sx: 1.1, sy: 0.08, sz: 0.65 }, 0.03);
    for (const [px, pz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) b.cyl(0x7a4a24, { x: px, y: 0.36, z: pz, sy: 0.72 }, 0.035, 0.03, 6);
    b.rbox(0xc92a2a, { x: -0.2, y: 0.8, sx: 0.36, sy: 0.06, sz: 0.28 }, 0.02);
    b.box(0xfff3d6, { x: -0.2, y: 0.835, sx: 0.32, sy: 0.02, sz: 0.24 });
    b.cyl(0x343a40, { x: 0.3, y: 0.82, sy: 0.12 }, 0.05, 0.05, 8);
    b.cyl(0x7a4a24, { z: -0.65, y: 0.25, sy: 0.5 }, 0.2, 0.22, 10);
    // umbrella off to the side so it never hides the manager from the camera
    b.cyl(0x666666, { x: 1.05, y: 1.1, z: 0.2, sy: 2.2 }, 0.03, 0.03, 6);
    b.cone(c, { x: 1.05, y: 2.3, z: 0.2, sx: 1.5, sy: 0.36, sz: 1.5 }, 8);
    for (let i = 0; i < 8; i += 2) b.cone(0xffffff, { x: 1.05 + Math.cos(i / 8 * Math.PI * 2) * 0.38, y: 2.24, z: 0.2 + Math.sin(i / 8 * Math.PI * 2) * 0.38, sx: 0.45, sy: 0.2, sz: 0.3, ry: -i / 8 * Math.PI * 2 }, 3);
    // a little board with the role's colour
    b.rbox(c, { x: -0.62, y: 1.0, z: 0.3, sx: 0.06, sy: 0.4, sz: 0.5 }, 0.02);
    b.pop();
    rect(x, z, 1.2, 0.7);
  }

  // ---------- Gurdwara Sri Dukh Niwaran Sahib
  buildGurdwara(b, rect, circ, game, anim, glows);

  // ---- Langar hall: arched front, golden trim, steel water drums
  {
    const [x, z] = POS.langar;
    b.rbox(0xf6efe2, { x, y: 1.7, z, sx: 8, sy: 3.4, sz: 5 }, 0.08);
    b.rbox(GOLD, { x, y: 3.45, z, sx: 8.2, sy: 0.15, sz: 5.2 }, 0.04);
    for (let i = 0; i < 4; i++) {
      b.box(0xe9dcc0, { x: x - 2.7 + i * 1.8, y: 1.3, z: z + 2.51, sx: 1.1, sy: 1.8, sz: 0.04 });
      b.cyl(0xe9dcc0, { x: x - 2.7 + i * 1.8, y: 2.2, z: z + 2.51, rx: Math.PI / 2, sy: 0.04 }, 0.55, 0.55, 12);
      b.torus(GOLD, { x: x - 2.7 + i * 1.8, y: 2.2, z: z + 2.54, s: 1 }, 0.58, 0.04, 4, 14, Math.PI);
    }
    for (let i = 0; i < 9; i++) b.rbox(0xf6efe2, { x: x - 3.8 + i * 0.95, y: 3.7, z: z + 2.5, sx: 0.25, sy: 0.4, sz: 0.25 }, 0.04);
    b.dome(GOLD, { x, y: 3.5, z, s: 1.4 }, 14, 7);
    b.cone(GOLD, { x, y: 4.4, z, sx: 0.2, sy: 0.5, sz: 0.2 }, 6);
    for (const s of [-1, 1]) { b.cyl(CHROME_D, { x: x + s * 3.2, y: 0.45, z: z + 3.1, sy: 0.9 }, 0.35, 0.35, 14); b.cyl(0xdee2e6, { x: x + s * 3.2, y: 0.92, z: z + 3.1, sy: 0.04 }, 0.36, 0.36, 14); }
    rect(x, z, 8.2, 5.2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਲੰਗਰ  LANGAR' }], { w: 512, h: 120, bg: '#e8590c' }) }));
    sign.position.set(x, 3.0, z + 2.56);
    scene.add(sign);
  }

  // ---- Patiala road sign and milestone
  {
    props.sign(b, 3.6, -23);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਪਟਿਆਲਾ' }, { text: 'PATIALA' }], { w: 512, h: 256 }) }));
    s.position.set(3.6, 2.05, -22.98);
    scene.add(s);
    b.rbox(0xffffff, { x: -2.6, y: 0.4, z: 12, sx: 0.5, sy: 0.8, sz: 0.25 }, 0.05);
    b.dome(0xf2c200, { x: -2.6, y: 0.8, z: 12, sx: 0.5, sy: 0.4, sz: 0.25 }, 10, 4);
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'Patiala' }, { text: '3 km' }], { w: 128, h: 128, bg: '#ffffff', fg: '#222', border: null }) }));
    ms.position.set(-2.6, 0.45, 12.13);
    scene.add(ms);
    circ(-2.6, 12, 0.3);
  }

  // ---------- trees, kups, flowers, poles
  for (let z = -24; z <= 40; z += 7) {
    if (Math.abs(z - 2) < 4 || Math.abs(z - 23) < 3 || Math.abs(z + 14.5) < 3) continue;
    for (const x of [-3, 3]) {
      if (z > -12 && z < 32) continue;                    // keep the farm, mandi and workshops clear
      props.safeda(b, x, z, 5.5 + Math.abs(z % 3) * 0.5); circ(x, z, 0.35);
    }
  }
  const kikars = [[-33, -22], [-20, -22], [-8, -24], [-44, 0], [-33, 19], [-20, 19.6], [33, -24], [37, -14], [38, 2], [24, 3], [32, 10], [-45, -30], [20, 33], [-10, 33], [30, 34], [-30, 32]];
  for (const [x, z] of kikars) { props.kikar(b, x, z, 0.9 + Math.abs(Math.sin(x * z)) * 0.4); circ(x, z, 0.4); }
  const trees = [[-6, 35], [4, 37], [17, 36], [-24, 34], [37, -30], [36, -40], [22, -32], [-30, -34], [-40, -40], [-28, -44], [20, -44], [-24, -56], [17, -60], [-44, 30], [40, 26], [-12, 40], [26, 42]];
  for (const [x, z] of trees) { props.tree(b, x, z, 0.9 + Math.abs(Math.cos(x + z)) * 0.5, LEAVES[Math.abs(x | 0) % 3]); circ(x, z, 0.5); }
  for (const [x, z] of [[-36, 38], [33, 40], [-40, 12]]) { props.mango(b, x, z, 1); circ(x, z, 0.5); }
  for (const [x, z, s] of [[-5.2, -11, 0.8], [-31, -2.5, 1], [-36, -2.2, 0.85], [-40, 21, 1], [33, 30, 1]]) { props.kup(b, x, z, s); circ(x, z, 1.1 * s); }
  for (const [x, z, cc] of [[2.2, -27, 0xff922b], [-2.4, -27, 0xffd43b], [7.5, 6.6, 0xff922b], [-7, 21, 0xf06595], [4.2, -28, 0xffd43b], [-4.2, -28, 0xff922b], [12, -34, 0xffd43b], [-12, -34, 0xff922b], [17, 6.5, 0xffd43b], [-12, -40, 0xff922b], [12, -40, 0xffd43b], [-12, -46, 0xffd43b], [12, -51, 0xff922b], [-0.5, 14.8, 0xffd43b], [10.5, 14.8, 0xff922b]]) props.flowers(b, x, z, cc);
  for (const [x, z] of [[-1, 30], [-5, 25.8], [18, 26.5], [-35, -26], [30, -27], [-18, 26], [36, 26], [-26, -26]]) props.bush(b, x, z, 1.1);
  for (const [x, z] of [[-26, 25], [36, 8], [-46, -12], [12, 40], [30, -2], [-20, 36]]) props.rock(b, x, z, 1.2);
  props.cart(b, -7.5, 9, 0.6);
  props.crates(b, 19.8, 21.2, 3, 0.1);
  // electricity poles with sagging wires down the road
  const poleZ = [];
  for (let z = -18; z <= 40; z += 14) { props.pole(b, 2.6, z + 4); poleZ.push(z + 4); circ(2.6, z + 4, 0.2); }
  for (let i = 0; i < poleZ.length - 1; i++) for (const dx of [-0.6, 0, 0.6]) {
    const z0 = poleZ[i], z1 = poleZ[i + 1];
    for (let k = 0; k < 4; k++) {
      const t0 = k / 4, t1 = (k + 1) / 4, sag = (t) => 7.85 - Math.sin(t * Math.PI) * 0.6;
      const za = z0 + (z1 - z0) * t0, zb = z0 + (z1 - z0) * t1, ya = sag(t0), yb = sag(t1);
      b.box(0x333333, { x: 2.6 + dx, y: (ya + yb) / 2, z: (za + zb) / 2, sx: 0.02, sy: 0.02, sz: Math.hypot(zb - za, yb - ya), rx: Math.atan2(ya - yb, zb - za), ao: false });
    }
  }

  // ---------- canal (nehar) on the west edge: brick-lined banks
  {
    for (const s of [-1, 1]) b.rbox(0xb4785a, { x: -43.6 + s * 1.65, y: 0.12, z: -3, sx: 0.35, sy: 0.3, sz: 140 }, 0.06);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3, 140), waterMaterial(3, 140, { foam: 0.35 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(-43.6, 0.1, -3);
    scene.add(water);
    colliders.push({ x0: -50, x1: -42, z0: -80, z1: 80 });
  }

  // ---------- beyond the farm: neighbours' fields, village houses, tree lines on the hills
  {
    const farFields = [[-62, -40, 12, 30, 0xf2d418], [-62, -5, 12, 26, 0x86c34a], [-62, 25, 12, 20, 0xe9c25a], [52, -50, 10, 26, 0x86c34a], [52, -18, 10, 22, 0xf2d418], [52, 8, 10, 26, 0x6fb33f], [-30, 54, 26, 9, 0xf2d418], [8, 54, 24, 9, 0x86c34a], [-20, -76, 22, 8, 0x6fb33f], [28, -78, 18, 8, 0xe9c25a]];
    for (const [cx, cz, w, d, c] of farFields) {
      const along = d > w;
      const n = Math.floor((along ? w : d) / 0.9);
      for (let i = 0; i < n; i++) {
        const off = -((along ? w : d) / 2) + 0.45 + i * 0.9;
        const x = along ? cx + off : cx, z = along ? cz : cz + off;
        const y = terrainH(x, z);
        b.capsule(shade(c, (i % 3 - 1) * 0.03), { x, y: y + 0.25, z, rx: along ? Math.PI / 2 : 0, rz: along ? 0 : Math.PI / 2, sx: 1, sy: (along ? d : w) / 1.0, sz: 1, ao: false }, 0.32, 0.4, 5);
      }
    }
    const houses = [[-56, 40, 0], [-52, 46, 0.3], [48, 36, -0.2], [54, 30, 0.1], [50, -34, 0.2], [-56, -56, 0], [44, -66, 0.4], [-10, 58, 0.1], [20, 58, -0.15]];
    for (const [x, z, ry] of houses) {
      const y = terrainH(x, z);
      b.push(x, y, z, ry);
      const wc = [0xf1e3c8, 0xe9b98a, 0xd8e2ea, 0xf4c7c3][Math.abs(x | 0) % 4];
      b.rbox(wc, { y: 1.5, sx: 5, sy: 3, sz: 4 }, 0.08);
      b.rbox(shade(wc, -0.08), { y: 3.1, sx: 5.3, sy: 0.2, sz: 4.3 }, 0.04);
      b.cyl(0x343a40, { x: 1.2, y: 3.7, z: -0.8, sy: 1.0 }, 0.4, 0.42, 10);
      b.rbox(0x5a3418, { y: 1.0, z: 2.02, sx: 0.9, sy: 1.8, sz: 0.06 }, 0.02);
      for (const s of [-1, 1]) b.rbox(0x6fa8dc, { x: s * 1.5, y: 1.9, z: 2.02, sx: 0.8, sy: 0.7, sz: 0.06 }, 0.02);
      b.pop();
    }
    // tree lines on the hills
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2, r = 72 + (i * 37 % 19);
      const x = Math.cos(a) * r * 0.85, z = Math.sin(a) * r;
      if (Math.abs(x) < 50 && Math.abs(z) < 62) continue;
      const y = terrainH(x, z), s = 1 + (i % 5) * 0.25;
      b.cyl(0x5e3f24, { x, y: y + 1 * s, z, sy: 2 * s, ao: false }, 0.15 * s, 0.22 * s, 5);
      b.ico(LEAVES[i % 3], { x, y: y + 2.8 * s, z, sx: 2.6 * s, sy: 2.4 * s, sz: 2.6 * s, ao: false, g: 0.3 }, 1);
    }
  }

  // ---------- distant Patiala skyline: Qila Mubarak walls, houses, brick kiln
  {
    b.rbox(0xc9a37a, { x: -6, y: 3, z: -86, sx: 46, sy: 6, sz: 3 }, 0.2);
    for (let i = 0; i < 23; i++) b.rbox(0xb88c60, { x: -28.5 + i * 2, y: 6.3, z: -84.6, sx: 0.9, sy: 0.6, sz: 0.4 }, 0.05);
    for (let i = 0; i < 6; i++) {
      b.cyl(0xc29a6f, { x: -28 + i * 9, y: 4, z: -86, sy: 8 }, 1.6, 1.8, 12);
      b.dome(0xb88c60, { x: -28 + i * 9, y: 8, z: -86, s: 3.2 }, 12, 6);
      b.cone(0xd9b45a, { x: -28 + i * 9, y: 9.9, z: -86, sx: 0.3, sy: 0.8, sz: 0.3 }, 6);
    }
    for (let i = 0; i < 9; i++) b.rbox([0xf1e3c8, 0xe9b98a, 0xd8e2ea, 0xf4c7c3][i % 4], { x: 22 + (i % 3) * 5, y: 2 + (i % 2) * 1.5, z: -70 - Math.floor(i / 3) * 6, sx: 4, sy: 4 + (i % 2) * 3, sz: 4 }, 0.1);
    b.cyl(0xa4553a, { x: -34, y: 8, z: -72, sy: 16 }, 0.8, 1.6, 12);
    for (let i = 0; i < 5; i++) b.torus(0x8e4430, { x: -34, y: 2 + i * 3.2, z: -72, rx: Math.PI / 2, s: 1 }, 1.5 - i * 0.16, 0.06, 4, 14);
    game.kilnTop = new THREE.Vector3(-34, 16.5, -72);
  }

  scene.add(b.meshChunks(22));

  return { colliders, anim, splat: sp };
}

const LEAVES = [0x4f9a3a, 0x3f8f35, 0x5aa340];
const CHROME_D = 0xc8ced4;

function buildGurdwara(b, rect, circ, game, anim, glows) {
  const { scene } = game;
  const [sx, sz] = POS.sarovar;
  // sarovar: marble rim with steps down to the water, railing and lamp posts
  for (const s of [-1, 1]) {
    b.rbox(MARBLE, { x: sx, y: 0.2, z: sz + s * 4.4, sx: 17.6, sy: 0.4, sz: 0.8 }, 0.06);
    b.rbox(MARBLE, { x: sx + s * 8.4, y: 0.2, z: sz, sx: 0.8, sy: 0.4, sz: 8 }, 0.06);
    for (let k = 0; k < 2; k++) b.rbox(0xeee7da, { x: sx, y: -0.05 - k * 0.15, z: sz + s * (3.8 - k * 0.4), sx: 16, sy: 0.15, sz: 0.4 }, 0.03);
    for (let i = 0; i <= 16; i++) {
      b.cyl(GOLD, { x: sx - 8 + i, y: 0.62, z: sz + s * 4.62, sy: 0.45 }, 0.025, 0.025, 4);
    }
    b.rbox(GOLD, { x: sx, y: 0.85, z: sz + s * 4.62, sx: 16.2, sy: 0.05, sz: 0.05 }, 0.02);
  }
  b.box(0x5a9fb8, { x: sx, y: -0.3, z: sz, sx: 16, sy: 0.2, sz: 8 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16, 8, 1, 1), waterMaterial(16, 8, { foam: 0.45, tint: { deep: 0x1a7aa8, shallow: 0x6cd3ea } }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(sx, 0.06, sz);
  scene.add(water);
  rect(sx, sz, 16.6, 8.6);

  // entrance gate (deorhi) over the road
  {
    const [gx, gz] = POS.gate;
    for (const px of [-2.6, 2.6]) {
      b.rbox(MARBLE, { x: gx + px, y: 2.2, z: gz, sx: 1.1, sy: 4.4, sz: 1.1 }, 0.06);
      b.rbox(0xeee7da, { x: gx + px, y: 0.3, z: gz, sx: 1.3, sy: 0.6, sz: 1.3 }, 0.05);
      b.rbox(GOLD, { x: gx + px, y: 4.4, z: gz, sx: 1.2, sy: 0.12, sz: 1.2 }, 0.03);
      b.dome(GOLD, { x: gx + px, y: 4.45, z: gz, s: 0.95 }, 12, 6);
      b.cone(GOLD, { x: gx + px, y: 5.05, z: gz, s: 0.3 }, 6);
      circ(gx + px, gz, 0.7);
      glows.push([gx + px, 3.8, gz + 0.6, 1.0]);
    }
    b.rbox(MARBLE, { x: gx, y: 4.2, z: gz, sx: 5.0, sy: 0.9, sz: 0.9 }, 0.05);
    b.torus(MARBLE, { x: gx, y: 3.3, z: gz }, 2.05, 0.28, 8, 24, Math.PI);
    b.torus(GOLD, { x: gx, y: 3.3, z: gz + 0.3 }, 2.05, 0.06, 4, 24, Math.PI);
    b.dome(GOLD, { x: gx, y: 4.65, z: gz, s: 1.4 }, 14, 7);
    b.cone(GOLD, { x: gx, y: 5.6, z: gz, s: 0.45 }, 8);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.85), new THREE.MeshBasicMaterial({
      map: textTexture([{ text: 'ਗੁਰਦੁਆਰਾ ਸ੍ਰੀ ਦੁਖ ਨਿਵਾਰਨ ਸਾਹਿਬ', size: 50 }, { text: 'Gurdwara Sri Dukh Niwaran Sahib · Patiala', size: 30 }], { w: 1024, h: 200, bg: '#1d3f8f', border: '#f2bd3a' }),
    }));
    sign.position.set(gx, 4.2, gz + 0.47);
    scene.add(sign);
  }

  // main darbar building on a raised marble platform
  const gx = POS.gurdwara[0], gz = POS.gurdwara[1];
  b.push(gx, 0, gz);
  b.rbox(MARBLE, { y: 0.35, sx: 19, sy: 0.7, sz: 11 }, 0.08);
  b.box(GOLD, { y: 0.68, z: 5.5, sx: 19, sy: 0.05, sz: 0.04, ao: false });
  for (let i = 0; i < 3; i++) b.rbox(MARBLE, { y: 0.1 + i * 0.12, z: 5.5 + 0.9 - i * 0.3, sx: 6, sy: 0.22, sz: 0.4 }, 0.03);
  b.rbox(MARBLE, { y: 3.7, sx: 14, sy: 6, sz: 8 }, 0.1);
  // arches with golden outlines, a golden main door
  for (let i = 0; i < 5; i++) {
    const x = -5.2 + i * 2.6, door = i === 2;
    const cc = door ? 0xd9a520 : 0xeadfc6;
    b.box(cc, { x, y: 2.35, z: 4.01, sx: 1.5, sy: door ? 3.0 : 2.4, sz: 0.05 });
    b.cyl(cc, { x, y: door ? 3.85 : 3.55, z: 4.01, rx: Math.PI / 2, sy: 0.05 }, 0.75, 0.75, 16);
    b.torus(GOLD, { x, y: door ? 3.85 : 3.55, z: 4.05, s: 1 }, 0.8, 0.05, 4, 16, Math.PI);
    for (const s of [-1, 1]) b.box(GOLD, { x: x + s * 0.8, y: door ? 2.35 : 2.35, z: 4.05, sx: 0.08, sy: door ? 3.0 : 2.4, sz: 0.04 });
    if (!door) for (let k = 0; k < 3; k++) b.box(0xd8ccb2, { x, y: 1.6 + k * 0.6, z: 4.03, sx: 1.3, sy: 0.04, sz: 0.04 });
  }
  for (let i = 0; i < 7; i++) {
    b.box(0xeadfc6, { x: -6 + i * 2, y: 5.6, z: 4.01, sx: 0.9, sy: 0.9, sz: 0.05 });
    b.torus(GOLD, { x: -6 + i * 2, y: 5.6, z: 4.05, s: 1 }, 0.42, 0.03, 4, 12);
  }
  b.rbox(MARBLE, { y: 6.8, sx: 14.4, sy: 0.25, sz: 8.4 }, 0.05);
  for (const s of [-1, 1]) {
    b.box(GOLD, { y: 6.8, z: s * 4.22, sx: 14.5, sy: 0.32, sz: 0.1 });
    b.box(GOLD, { x: s * 7.22, y: 6.8, sx: 0.1, sy: 0.32, sz: 8.5 });
  }
  for (let i = 0; i <= 14; i++) {
    b.box(MARBLE, { x: -7 + i, y: 7.15, z: 4, sx: 0.2, sy: 0.5, sz: 0.2 });
    b.box(MARBLE, { x: -7 + i, y: 7.15, z: -4, sx: 0.2, sy: 0.5, sz: 0.2 });
    b.sph(GOLD, { x: -7 + i, y: 7.45, z: 4, s: 0.14, ao: false }, 6, 4);
  }
  b.box(MARBLE, { y: 7.45, z: 4, sx: 14.2, sy: 0.12, sz: 0.25 });
  // corner chhatris
  for (const [cx, cz] of [[-6.4, 3.4], [6.4, 3.4], [-6.4, -3.4], [6.4, -3.4]]) {
    for (const [px, pz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) b.cyl(MARBLE, { x: cx + px, y: 7.6, z: cz + pz, sy: 1.4 }, 0.07, 0.08, 8);
    b.rbox(MARBLE, { x: cx, y: 8.35, z: cz, sx: 1.3, sy: 0.15, sz: 1.3 }, 0.04);
    b.sph(GOLD, { x: cx, y: 8.4, z: cz, s: 1.25 }, 14, 8, Math.PI * 2, Math.PI * 0.6);
    b.cone(GOLD, { x: cx, y: 9.25, z: cz, sx: 0.18, sy: 0.6, sz: 0.18 }, 6);
  }
  // upper storey
  b.rbox(MARBLE, { y: 8.1, sx: 8, sy: 2.2, sz: 5.5 }, 0.06);
  for (let i = 0; i < 3; i++) {
    b.box(0xeadfc6, { x: -2.4 + i * 2.4, y: 8.0, z: 2.76, sx: 1.0, sy: 1.4, sz: 0.04 });
    b.torus(GOLD, { x: -2.4 + i * 2.4, y: 8.7, z: 2.79, s: 1 }, 0.5, 0.035, 4, 12, Math.PI);
  }
  b.rbox(MARBLE, { y: 9.28, sx: 8.3, sy: 0.18, sz: 5.8 }, 0.04);
  for (const s of [-1, 1]) {
    b.box(GOLD, { y: 9.28, z: s * 2.92, sx: 8.4, sy: 0.24, sz: 0.08 });
    b.box(GOLD, { x: s * 4.17, y: 9.28, sx: 0.08, sy: 0.24, sz: 5.9 });
  }
  // main golden dome: drum, lotus petals, bulb, kalash
  b.cyl(MARBLE, { y: 10.15, sy: 1.6 }, 2.05, 2.15, 28);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; b.box(0xeadfc6, { x: Math.cos(a) * 2.08, y: 10.1, z: Math.sin(a) * 2.08, ry: -a + Math.PI / 2, sx: 0.4, sy: 0.9, sz: 0.04 }); }
  b.cyl(GOLD, { y: 11.0, sy: 0.16 }, 2.3, 2.3, 28);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    b.sph(GOLD, { x: Math.cos(a) * 2.05, y: 11.2, z: Math.sin(a) * 2.05, sx: 0.5, sy: 0.5, sz: 0.3, ry: -a }, 8, 6);
  }
  b.sph(GOLD, { y: 12.2, sx: 4.7, sy: 5.0, sz: 4.7, g: 0.2 }, 32, 18, Math.PI * 2, Math.PI * 0.64);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; b.torus(0xe0a92a, { y: 12.2, ry: a, rz: -0.14 * Math.PI, s: 1, sx: 1, sy: 1.06, ao: false }, 2.36, 0.025, 3, 20, Math.PI * 0.6); }
  b.sph(0xf7cf55, { y: 14.75, s: 0.7 }, 12, 8);
  b.cone(GOLD, { y: 15.4, sx: 0.45, sy: 0.7, sz: 0.45 }, 10);
  b.sph(0xf7cf55, { y: 15.85, s: 0.35 }, 10, 6);
  b.cone(GOLD, { y: 16.5, sx: 0.16, sy: 1.0, sz: 0.16 }, 6);
  // smaller domes on the upper storey corners
  for (const [cx, cz] of [[-3.5, 2.3], [3.5, 2.3], [-3.5, -2.3], [3.5, -2.3]]) {
    b.cyl(MARBLE, { x: cx, y: 9.7, z: cz, sy: 0.6 }, 0.45, 0.45, 12);
    b.sph(GOLD, { x: cx, y: 10.1, z: cz, s: 0.95 }, 12, 8, Math.PI * 2, Math.PI * 0.62);
    b.cone(GOLD, { x: cx, y: 10.75, z: cz, sx: 0.12, sy: 0.45, sz: 0.12 }, 6);
  }
  b.pop();
  rect(gx, gz, 19, 11);
  // deepmala: strings of little lights along the edges (glow at dusk)
  for (let i = 0; i <= 14; i += 1) glows.push([gx - 7 + i, 7.0, gz + 4.3, 0.5]);
  for (let i = 0; i <= 8; i += 1) glows.push([gx - 4 + i, 9.45, gz + 2.95, 0.45]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; glows.push([gx + Math.cos(a) * 2.3, 11.1, gz + Math.sin(a) * 2.3, 0.5]); }
  for (let i = 0; i <= 19; i += 1) glows.push([gx - 9.5 + i, 0.75, gz + 5.55, 0.4]);

  // lamp posts around the parikrama
  for (const [lx, lz] of [[-10, -35], [10, -35], [-10, -45.5], [10, -45.5], [-10, -31], [10, -31]]) {
    props.lamp(b, lx, lz, 0xf2bd3a);
    circ(lx, lz, 0.25);
    glows.push([lx, 2.75, lz, 1.4]);
  }

  // Nishan Sahib: saffron-clad pole, khanda and waving flag
  {
    const [nx, nz] = POS.nishan;
    b.rbox(MARBLE, { x: nx, y: 0.4, z: nz, sx: 2.4, sy: 0.8, sz: 2.4 }, 0.06);
    b.rbox(MARBLE, { x: nx, y: 1.0, z: nz, sx: 1.4, sy: 0.4, sz: 1.4 }, 0.05);
    b.box(GOLD, { x: nx, y: 0.78, z: nz, sx: 2.42, sy: 0.05, sz: 2.42, ao: false });
    b.cyl(0xff8c1a, { x: nx, y: 7.6, z: nz, sy: 13 }, 0.12, 0.18, 12);
    for (let i = 0; i < 8; i++) b.torus(0xe57a10, { x: nx, y: 1.6 + i * 1.6, z: nz, rx: Math.PI / 2, s: 1 }, 0.16, 0.02, 3, 12);
    // khanda: ring (chakkar), double-edged khanda and two kirpans
    b.push(nx, 14.6, nz);
    b.torus(GOLD, { y: 0 }, 0.32, 0.05, 6, 20);
    b.box(GOLD, { y: 0.2, sx: 0.08, sy: 1.0, sz: 0.04 });
    b.cone(GOLD, { y: 0.8, sx: 0.12, sy: 0.25, sz: 0.04 }, 4);
    b.torus(GOLD, { x: -0.2, y: -0.15, rz: 0.4 }, 0.42, 0.035, 4, 12, Math.PI * 0.8);
    b.torus(GOLD, { x: 0.2, y: -0.15, ry: Math.PI, rz: 0.4 }, 0.42, 0.035, 4, 12, Math.PI * 0.8);
    b.pop();
    circ(nx, nz, 1.3);
    const fg = new THREE.PlaneGeometry(2.6, 1.6, 12, 4);
    fg.translate(1.3, 0, 0);
    const flag = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: 0xff8c1a, side: THREE.DoubleSide }));
    flag.position.set(nx + 0.15, 13.2, nz);
    scene.add(flag);
    const base = fg.attributes.position.array.slice();
    anim.push((t) => {
      const p = fg.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const x = base[i];
        p[i + 2] = Math.sin(x * 2.2 - t * 4) * 0.22 * (x / 2.6);
        p[i + 1] = base[i + 1] - x * 0.05;
      }
      fg.attributes.position.needsUpdate = true;
      fg.computeVertexNormals();
      flag.rotation.y = Math.sin(t * 0.3) * 0.4 + 0.6;
    });
  }
  // flower beds and neat hedges along the parikrama
  for (const x of [-14, -6, 6, 14]) { props.bush(b, x, -36.5, 0.8, 0x3f8f35); props.bush(b, x, -44, 0.8, 0x3f8f35); }
}

// Push a circle of radius r out of every collider and the world bounds.
export function collide(colliders, p, r) {
  for (let k = 0; k < 2; k++) {
    for (const c of colliders) {
      if (c.r !== undefined) {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + r;
        if (d < min && d > 1e-5) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
      } else {
        const cx = Math.max(c.x0, Math.min(p.x, c.x1)), cz = Math.max(c.z0, Math.min(p.z, c.z1));
        const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
        if (d < r) {
          if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
          else {
            // centre inside the box: exit through the nearest side
            const e = [p.x - c.x0, c.x1 - p.x, p.z - c.z0, c.z1 - p.z], m = Math.min(...e);
            if (m === e[0]) p.x = c.x0 - r; else if (m === e[1]) p.x = c.x1 + r; else if (m === e[2]) p.z = c.z0 - r; else p.z = c.z1 + r;
          }
        }
      }
    }
  }
  p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x));
  p.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z));
}

export { vcMaterial };
