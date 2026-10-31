// Static world: terrain, paths, Patiala village buildings, Gurdwara Dukh Niwaran Sahib,
// trees and the collision map. Dynamic things (fields, pens, workshops) live in their systems.
import * as THREE from 'three';
import { Builder, vcMaterial, textTexture } from './geo.js';
import { props } from './models.js';

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
};

const GRASS = new THREE.Color(0x8fd14f), GRASS2 = new THREE.Color(0x6fbe43), HILL = new THREE.Color(0x5fa53c);
const DIRT = 0xdba467, MARBLE = 0xfbf8f1, GOLD = 0xf2bd3a;

function noise(x, z) {
  return Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * 0.5 + Math.sin(z * 0.17 + x * 0.07) * 0.3 + Math.sin((x + z) * 0.6) * 0.2;
}

export function buildWorld(game) {
  const { scene } = game;
  const colliders = [];
  const rect = (cx, cz, w, d) => colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  const circ = (x, z, r) => colliders.push({ x, z, r });
  const anim = [];   // per-frame callbacks for water, flags, smoke

  // ---------- terrain
  const size = 220, seg = 110;
  const tg = new THREE.PlaneGeometry(size, size, seg, seg);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const ox = Math.max(0, BOUNDS.x0 - 4 - x, x - BOUNDS.x1 - 4), oz = Math.max(0, BOUNDS.z0 - 6 - z, z - BOUNDS.z1 - 6);
    const out = Math.hypot(ox, oz);
    const h = out > 0 ? Math.min(9, out * 0.35) * (0.6 + 0.4 * noise(x * 0.5, z * 0.5)) : 0;
    pos.setY(i, h - 0.02);
    const n = noise(x, z) * 0.5 + 0.5;
    c.copy(GRASS).lerp(GRASS2, n * 0.6);
    if (out > 0) c.lerp(HILL, Math.min(1, out / 10));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  tg.computeVertexNormals();
  const ground = new THREE.Mesh(tg, vcMaterial);
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- paths (flat, no shadows)
  const pb = new Builder(0.03);
  const path = (x0, z0, x1, z1, color = DIRT) => pb.box(color, { x: (x0 + x1) / 2, y: 0.01, z: (z0 + z1) / 2, sx: x1 - x0, sy: 0.04, sz: z1 - z0, j: 0.02 });
  path(-1.6, -29, 1.6, 44);              // main road north-south
  path(3, -9, 16.5, 5.5);                // mandi plaza
  path(9, 5, 11, 46);                    // customer road
  path(-17, 21.5, 39, 24.5);             // south lane (workshops)
  path(1.5, -15.6, 34, -13.4);           // east lane (godown, pens)
  path(-27, -8.2, -1.6, -7.3, 0xd39a5c); // bund walk between fields
  path(-41, 1.8, -1.6, 3.2, 0xd39a5c);
  path(11, 6, 15, 13.5, 0xb9b2a5);       // garage slab
  pb.disc(DIRT, { x: 0, y: 0.015, z: 2.3, s: 7 });
  // Gurdwara marble plaza and parikrama
  pb.box(0xf1ece2, { x: -3, y: 0.02, z: -46, sx: 38, sy: 0.05, sz: 34, j: 0.01 });
  for (let i = -21; i < 16; i += 2) pb.box(0xe6dfd2, { x: i + 1, y: 0.05, z: -46, sx: 0.06, sy: 0.02, sz: 34, j: 0 });
  const paths = pb.mesh(vcMaterial, false);
  paths.receiveShadow = true;
  scene.add(paths);

  // ---------- static buildings and props (one merged mesh)
  const b = new Builder(0.035);

  // Farmhouse (kothi) with veranda and black roof tank
  {
    const [x, z] = POS.farmhouse;
    b.push(x, 0, z);
    b.box(0xd8cbb3, { y: 0.2, sx: 6.6, sy: 0.4, sz: 5 });
    b.box(0xf3e2c4, { y: 1.8, z: -0.4, sx: 6, sy: 2.9, sz: 3.8 });
    b.box(0xe9cfa3, { y: 3.3, z: -0.4, sx: 6.3, sy: 0.18, sz: 4.1 });
    b.box(0xf3e2c4, { y: 3.6, z: -0.4, sx: 6.3, sy: 0.45, sz: 4.1 });
    b.box(0xf3e2c4, { y: 3.85, z: -0.4, sx: 5.6, sy: 0.08, sz: 3.4 });
    b.box(0x7a4a24, { y: 1.3, z: 1.52, sx: 1.1, sy: 2.0, sz: 0.06 });
    for (const wx of [-2, 2]) {
      b.box(0x2f6fb0, { x: wx, y: 1.9, z: 1.52, sx: 1.0, sy: 0.9, sz: 0.06 });
      b.box(0xffffff, { x: wx, y: 1.9, z: 1.55, sx: 0.06, sy: 0.9, sz: 0.04 });
    }
    // veranda
    b.box(0xe9cfa3, { y: 2.95, z: 2.1, sx: 6.3, sy: 0.15, sz: 1.4 });
    for (const px of [-2.9, -1, 1, 2.9]) b.box(0xf8efe0, { x: px, y: 1.5, z: 2.6, sx: 0.22, sy: 2.8, sz: 0.22 });
    b.cyl(0x4a4f57, { x: 1.8, y: 4.35, z: -1.2, sy: 0.9 }, 0.42, 0.46, 12);
    b.cyl(0x4a4f57, { x: 1.8, y: 4.85, z: -1.2, sy: 0.1 }, 0.22, 0.42, 12);
    b.box(0xb5a58c, { x: -3.25, y: 2, z: -1.3, sx: 0.5, sy: 0.1, sz: 0.8, rz: 0.9 });
    b.pop();
    rect(x, z - 0.4, 6.2, 4.0);
    props.nalka(b, x + 4.2, z + 2.5);
    props.charpai(b, x + 1.6, z + 2.0, 1.5);
    circ(x + 4.2, z + 2.5, 0.4);
  }

  // Garage canopy
  {
    const [x, z] = POS.garage;
    for (const [px, pz] of [[-2.8, -2.6], [2.8, -2.6], [-2.8, 2.6], [2.8, 2.6]]) {
      b.cyl(0x8a8f96, { x: x + px, y: 1.6, z: z + pz, sy: 3.2 }, 0.08, 0.08, 6);
      circ(x + px, z + pz, 0.2);
    }
    b.box(0x2f9e8f, { x, y: 3.25, z, sx: 6.2, sy: 0.12, sz: 5.8, rx: 0.06 });
  }

  // Tubewell kotha and water tank (chubacha)
  {
    const [x, z] = POS.tubewell;
    b.box(0xa4553a, { x, y: 1.1, z, sx: 2.4, sy: 2.2, sz: 2.2 });
    b.box(0xc9b9a0, { x, y: 2.28, z, sx: 2.7, sy: 0.16, sz: 2.5 });
    b.box(0x2f6fb0, { x: x - 0.5, y: 0.9, z: z + 1.11, sx: 0.8, sy: 1.6, sz: 0.04 });
    for (let i = 0; i < 6; i++) b.box(0x8e4430, { x, y: 0.3 + i * 0.36, z: z + 1.115, sx: 2.4, sy: 0.02, sz: 0.02 });
    const [tx, tz] = POS.tank;
    b.box(0xa4553a, { x: tx, y: 0.35, z: tz, sx: 2.0, sy: 0.7, sz: 1.3 });
    b.cyl(0x6c7178, { x: tx + 0.3, y: 1.05, z: tz - 0.65, rx: Math.PI / 2, sy: 0.7 }, 0.12, 0.12, 8);
    rect(x, z, 2.5, 2.4);
    rect(tx, tz, 2.0, 1.3);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0), game.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(tx, 0.62, tz);
    scene.add(water);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.75 }));
    stream.position.set(tx + 0.3, 0.8, tz - 0.25);
    scene.add(stream);
    anim.push((t) => { stream.scale.x = stream.scale.z = 1 + Math.sin(t * 20) * 0.12; });
    game.tubewellSpout = new THREE.Vector3(tx + 0.3, 0.7, tz - 0.2);
  }

  // Mandi stall with striped awning (stock is drawn by market.js)
  {
    const [x, z] = POS.stall;
    b.push(x, 0, z);
    b.box(0x9a6a3a, { y: 0.55, z: 0.5, sx: 5, sy: 1.1, sz: 1.2 });
    b.box(0xc08850, { y: 1.14, z: 0.5, sx: 5.2, sy: 0.08, sz: 1.35 });
    b.box(0xb07a43, { y: 0.9, z: -0.6, sx: 5, sy: 0.12, sz: 1.0 });
    for (const px of [-2.45, 2.45]) for (const pz of [-1.15, -0.2]) b.box(0x7a4a24, { x: px, y: 1.35, z: pz, sx: 0.14, sy: 2.7, sz: 0.14 });
    for (let i = 0; i < 10; i++) b.box(i % 2 ? 0xffffff : 0xf76707, { x: -2.5 + 0.25 + i * 0.5, y: 2.65, z: -0.75, sx: 0.5, sy: 0.08, sz: 1.5, rx: 0.32 });
    for (let i = 0; i < 10; i++) b.cone(i % 2 ? 0xffffff : 0xf76707, { x: -2.25 + i * 0.5, y: 2.3, z: 0.02, rx: Math.PI, sx: 0.5, sy: 0.3, sz: 0.1 }, 3);
    b.pop();
    rect(x, z, 5.2, 2.6);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਮੰਡੀ  MANDI' }], { w: 512, h: 150, bg: '#f76707' }) }));
    sign.position.set(x, 3.25, z - 0.6);
    sign.rotation.x = -0.3;
    scene.add(sign);
  }

  // Arhtiya (wholesale) shed with gunny sacks and a tarazu
  {
    const [x, z] = POS.arhtiya;
    for (const [px, pz] of [[-2, -1.3], [2, -1.3], [-2, 1.3], [2, 1.3]]) b.box(0x6c7178, { x: x + px, y: 1.4, z: z + pz, sx: 0.12, sy: 2.8, sz: 0.12 });
    b.box(0xa8b0b8, { x, y: 2.85, z, sx: 4.6, sy: 0.08, sz: 3.2, rx: -0.12 });
    for (let i = 0; i < 7; i++) b.sph(0xd9c49a, { x: x - 1.4 + (i % 4) * 0.9, y: 0.35 + Math.floor(i / 4) * 0.55, z: z - 0.6, sx: 0.85, sy: 0.6, sz: 0.6 }, 8, 6);
    b.box(0x7a4a24, { x: x + 1.2, y: 0.5, z: z + 0.6, sx: 0.1, sy: 1.0, sz: 0.1 });
    b.box(0x7a4a24, { x: x + 1.2, y: 1.0, z: z + 0.6, sx: 1.0, sy: 0.05, sz: 0.05 });
    b.cyl(0xc0c4c9, { x: x + 0.75, y: 0.6, z: z + 0.6, sy: 0.04 }, 0.22, 0.2, 10);
    b.cyl(0xc0c4c9, { x: x + 1.65, y: 0.6, z: z + 0.6, sy: 0.04 }, 0.22, 0.2, 10);
    rect(x, z - 0.4, 4.4, 2.2);
  }

  // Order board
  {
    const [x, z] = POS.board;
    b.box(0x7a4a24, { x: x - 0.9, y: 1.1, z, sx: 0.12, sy: 2.2, sz: 0.12 });
    b.box(0x7a4a24, { x: x + 0.9, y: 1.1, z, sx: 0.12, sy: 2.2, sz: 0.12 });
    b.box(0xb07a43, { x, y: 1.6, z, sx: 2.1, sy: 1.1, sz: 0.08 });
    for (const [px, py, cc] of [[-0.55, 1.75, 0xfff3bf], [0.05, 1.55, 0xffffff], [0.6, 1.72, 0xd0ebff]]) b.box(cc, { x: x + px, y: py, z: z + 0.05, sx: 0.45, sy: 0.55, sz: 0.02, rz: px * 0.1 });
    circ(x - 0.9, z, 0.2); circ(x + 0.9, z, 0.2);
  }

  // Godown
  {
    const [x, z] = POS.godown;
    b.box(0x8aa1b1, { x, y: 1.6, z, sx: 7, sy: 3.2, sz: 4.2 });
    b.cyl(0x9aa5ad, { x, y: 3.2, z, rz: Math.PI / 2, sy: 7.2 }, 2.2, 2.2, 16, false);
    b.box(0x6c7a86, { x, y: 1.3, z: z + 2.12, sx: 3.2, sy: 2.6, sz: 0.05 });
    for (let i = 0; i < 9; i++) b.box(0x5a6672, { x, y: 0.2 + i * 0.28, z: z + 2.15, sx: 3.2, sy: 0.03, sz: 0.02 });
    rect(x, z, 7.2, 4.4);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'GODOWN' }], { w: 512, h: 128, bg: '#2b4a63' }) }));
    sign.position.set(x, 3.0, z + 2.2);
    scene.add(sign);
  }

  // ---------- Gurdwara Sri Dukh Niwaran Sahib
  buildGurdwara(b, rect, circ, game, anim);

  // Langar hall
  {
    const [x, z] = POS.langar;
    b.box(0xf6efe2, { x, y: 1.7, z, sx: 8, sy: 3.4, sz: 5 });
    b.box(GOLD, { x, y: 3.45, z, sx: 8.2, sy: 0.15, sz: 5.2 });
    for (let i = 0; i < 4; i++) b.box(0xe9dcc0, { x: x - 2.7 + i * 1.8, y: 1.5, z: z + 2.51, sx: 1.1, sy: 2.0, sz: 0.04 });
    for (let i = 0; i < 4; i++) b.cyl(0xe9dcc0, { x: x - 2.7 + i * 1.8, y: 2.5, z: z + 2.51, rx: Math.PI / 2, sy: 0.04 }, 0.55, 0.55, 10);
    b.dome(GOLD, { x, y: 3.5, z, s: 1.3 }, 12, 6);
    rect(x, z, 8.2, 5.2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਲੰਗਰ  LANGAR' }], { w: 512, h: 120, bg: '#e8590c' }) }));
    sign.position.set(x, 3.0, z + 2.56);
    scene.add(sign);
  }

  // Patiala road sign and milestone
  {
    props.sign(b, 3.6, -23);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਪਟਿਆਲਾ' }, { text: 'PATIALA' }], { w: 512, h: 256 }) }));
    s.position.set(3.6, 2.6, -22.95);
    scene.add(s);
    b.box(0xffffff, { x: -2.6, y: 0.4, z: 12, sx: 0.5, sy: 0.8, sz: 0.25 });
    b.dome(0xf2c200, { x: -2.6, y: 0.8, z: 12, sx: 0.5, sy: 0.4, sz: 0.25 }, 10, 4);
    const ms = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'Patiala' }, { text: '3 km' }], { w: 128, h: 128, bg: '#ffffff', fg: '#222', border: null }) }));
    ms.position.set(-2.6, 0.45, 12.13);
    scene.add(ms);
    circ(-2.6, 12, 0.3);
  }

  // ---------- trees, kups, flowers, poles
  const treeSpots = [];
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
  for (const [x, z] of trees) { props.tree(b, x, z, 0.9 + Math.abs(Math.cos(x + z)) * 0.5, [0x4f9a3a, 0x3f8f35, 0x5aa340][Math.abs(x | 0) % 3]); circ(x, z, 0.5); }
  for (const [x, z, s] of [[-5.2, -11, 0.8], [-31, -2.5, 1], [-36, -2.2, 0.85], [-40, 21, 1], [33, 30, 1]]) { props.kup(b, x, z, s); circ(x, z, 1.1 * s); }
  for (const [x, z, cc] of [[2.2, -27, 0xff6b6b], [-2.4, -27, 0xffd43b], [7.5, 6.6, 0xff922b], [-7, 21, 0xf06595], [4.2, -28, 0xffffff], [-4.2, -28, 0xff922b], [12, -34, 0xffd43b], [-12, -34, 0xff6b6b], [17, 6.5, 0xffd43b]]) props.flowers(b, x, z, cc);
  for (const [x, z] of [[-1, 30], [-5, 25.8], [18, 26.5], [-35, -26], [30, -27]]) props.bush(b, x, z, 1.1);
  for (let z = -18; z <= 40; z += 14) props.pole(b, 2.6, z + 4);
  for (const [x, z] of [[-26, 25], [36, 8], [-46, -12], [12, 40]]) props.rock(b, x, z, 1.2);

  // ---------- canal (nehar) on the west edge
  {
    b.box(0xb89a6a, { x: -43.5, y: 0.05, z: -3, sx: 5, sy: 0.1, sz: 140 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3, 140), game.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-43.6, 0.12, -3);
    scene.add(water);
    colliders.push({ x0: -50, x1: -42, z0: -80, z1: 80 });
  }

  // ---------- distant Patiala skyline: Qila Mubarak walls, houses, brick kiln
  {
    b.box(0xc9a37a, { x: -6, y: 3, z: -86, sx: 46, sy: 6, sz: 3 });
    for (let i = 0; i < 6; i++) {
      b.cyl(0xc29a6f, { x: -28 + i * 9, y: 4, z: -86, sy: 8 }, 1.6, 1.8, 10);
      b.dome(0xb88c60, { x: -28 + i * 9, y: 8, z: -86, s: 3.2 }, 10, 6);
    }
    for (let i = 0; i < 9; i++) b.box([0xf1e3c8, 0xe9b98a, 0xd8e2ea, 0xf4c7c3][i % 4], { x: 22 + (i % 3) * 5, y: 2 + (i % 2) * 1.5, z: -70 - Math.floor(i / 3) * 6, sx: 4, sy: 4 + (i % 2) * 3, sz: 4 });
    b.cyl(0xa4553a, { x: -34, y: 8, z: -72, sy: 16 }, 0.8, 1.6, 10);
    game.kilnTop = new THREE.Vector3(-34, 16.5, -72);
  }

  const statics = b.mesh();
  scene.add(statics);

  return { colliders, anim };
}

function buildGurdwara(b, rect, circ, game, anim) {
  const { scene } = game;
  const [sx, sz] = POS.sarovar;
  // sarovar: marble rim, steps and water
  b.box(MARBLE, { x: sx, y: 0.2, z: sz - 4.4, sx: 17.6, sy: 0.4, sz: 0.8 });
  b.box(MARBLE, { x: sx, y: 0.2, z: sz + 4.4, sx: 17.6, sy: 0.4, sz: 0.8 });
  b.box(MARBLE, { x: sx - 8.4, y: 0.2, z: sz, sx: 0.8, sy: 0.4, sz: 8 });
  b.box(MARBLE, { x: sx + 8.4, y: 0.2, z: sz, sx: 0.8, sy: 0.4, sz: 8 });
  b.box(0x7aa9b8, { x: sx, y: -0.2, z: sz, sx: 16, sy: 0.2, sz: 8 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16, 8, 16, 8), game.waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(sx, 0.08, sz);
  scene.add(water);
  rect(sx, sz, 16.6, 8.6);

  // entrance gate (deorhi) over the road
  {
    const [gx, gz] = POS.gate;
    for (const px of [-2.6, 2.6]) {
      b.box(MARBLE, { x: gx + px, y: 2.2, z: gz, sx: 1.1, sy: 4.4, sz: 1.1 });
      b.dome(GOLD, { x: gx + px, y: 4.4, z: gz, s: 0.9 }, 10, 6);
      b.cone(GOLD, { x: gx + px, y: 5.0, z: gz, s: 0.3 }, 6);
      circ(gx + px, gz, 0.7);
    }
    b.box(MARBLE, { x: gx, y: 4.2, z: gz, sx: 5.0, sy: 0.9, sz: 0.9 });
    b.torus(MARBLE, { x: gx, y: 3.3, z: gz }, 2.05, 0.28, 6, 20, Math.PI);
    b.dome(GOLD, { x: gx, y: 4.65, z: gz, s: 1.4 }, 12, 6);
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
  b.box(MARBLE, { y: 0.35, sx: 19, sy: 0.7, sz: 11 });
  for (let i = 0; i < 3; i++) b.box(MARBLE, { y: 0.1 + i * 0.12, z: 5.5 + 0.9 - i * 0.3, sx: 6, sy: 0.22, sz: 0.4 });
  b.box(MARBLE, { y: 3.7, sx: 14, sy: 6, sz: 8 });
  // arches
  for (let i = 0; i < 5; i++) {
    const x = -5.2 + i * 2.6, door = i === 2;
    const cc = door ? 0xd9a520 : 0xeadfc6;
    b.box(cc, { x, y: 2.35, z: 4.01, sx: 1.5, sy: door ? 3.0 : 2.4, sz: 0.05 });
    b.cyl(cc, { x, y: door ? 3.85 : 3.55, z: 4.01, rx: Math.PI / 2, sy: 0.05 }, 0.75, 0.75, 14);
  }
  for (let i = 0; i < 7; i++) b.box(0xeadfc6, { x: -6 + i * 2, y: 5.6, z: 4.01, sx: 0.9, sy: 0.9, sz: 0.05 });
  b.box(MARBLE, { y: 6.8, sx: 14.4, sy: 0.25, sz: 8.4 });
  for (const s of [-1, 1]) {
    b.box(GOLD, { y: 6.8, z: s * 4.22, sx: 14.5, sy: 0.32, sz: 0.1 });
    b.box(GOLD, { x: s * 7.22, y: 6.8, sx: 0.1, sy: 0.32, sz: 8.5 });
  }
  for (let i = 0; i <= 14; i++) {
    b.box(MARBLE, { x: -7 + i, y: 7.15, z: 4, sx: 0.2, sy: 0.5, sz: 0.2 });
    b.box(MARBLE, { x: -7 + i, y: 7.15, z: -4, sx: 0.2, sy: 0.5, sz: 0.2 });
  }
  b.box(MARBLE, { y: 7.45, z: 4, sx: 14.2, sy: 0.12, sz: 0.25 });
  // corner chhatris
  for (const [cx, cz] of [[-6.4, 3.4], [6.4, 3.4], [-6.4, -3.4], [6.4, -3.4]]) {
    for (const [px, pz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) b.box(MARBLE, { x: cx + px, y: 7.6, z: cz + pz, sx: 0.12, sy: 1.4, sz: 0.12 });
    b.box(MARBLE, { x: cx, y: 8.35, z: cz, sx: 1.3, sy: 0.15, sz: 1.3 });
    b.sph(GOLD, { x: cx, y: 8.4, z: cz, s: 1.25 }, 12, 8, Math.PI * 2, Math.PI * 0.6);
    b.cone(GOLD, { x: cx, y: 9.25, z: cz, sx: 0.18, sy: 0.6, sz: 0.18 }, 6);
  }
  // upper storey
  b.box(MARBLE, { y: 8.1, sx: 8, sy: 2.2, sz: 5.5 });
  for (let i = 0; i < 3; i++) b.box(0xeadfc6, { x: -2.4 + i * 2.4, y: 8.0, z: 2.76, sx: 1.0, sy: 1.4, sz: 0.04 });
  b.box(MARBLE, { y: 9.28, sx: 8.3, sy: 0.18, sz: 5.8 });
  for (const s of [-1, 1]) {
    b.box(GOLD, { y: 9.28, z: s * 2.92, sx: 8.4, sy: 0.24, sz: 0.08 });
    b.box(GOLD, { x: s * 4.17, y: 9.28, sx: 0.08, sy: 0.24, sz: 5.9 });
  }
  // main golden dome: drum, lotus petals, bulb, kalash
  b.cyl(MARBLE, { y: 10.15, sy: 1.6 }, 2.05, 2.15, 24);
  b.cyl(GOLD, { y: 11.0, sy: 0.16 }, 2.3, 2.3, 24);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    b.sph(GOLD, { x: Math.cos(a) * 2.05, y: 11.2, z: Math.sin(a) * 2.05, sx: 0.5, sy: 0.5, sz: 0.3, ry: -a }, 6, 4);
  }
  b.sph(GOLD, { y: 12.2, sx: 4.7, sy: 5.0, sz: 4.7 }, 24, 14, Math.PI * 2, Math.PI * 0.64);
  b.sph(0xf7cf55, { y: 14.75, s: 0.7 }, 10, 8);
  b.cone(GOLD, { y: 15.4, sx: 0.45, sy: 0.7, sz: 0.45 }, 8);
  b.sph(0xf7cf55, { y: 15.85, s: 0.35 }, 8, 6);
  b.cone(GOLD, { y: 16.5, sx: 0.16, sy: 1.0, sz: 0.16 }, 6);
  // smaller domes on the upper storey corners
  for (const [cx, cz] of [[-3.5, 2.3], [3.5, 2.3], [-3.5, -2.3], [3.5, -2.3]]) {
    b.cyl(MARBLE, { x: cx, y: 9.7, z: cz, sy: 0.6 }, 0.45, 0.45, 10);
    b.sph(GOLD, { x: cx, y: 10.1, z: cz, s: 0.95 }, 10, 6, Math.PI * 2, Math.PI * 0.62);
    b.cone(GOLD, { x: cx, y: 10.75, z: cz, sx: 0.12, sy: 0.45, sz: 0.12 }, 6);
  }
  b.pop();
  rect(gx, gz, 19, 11);

  // lamp posts around the parikrama
  for (const [lx, lz] of [[-10, -35], [10, -35], [-10, -45.5], [10, -45.5]]) {
    b.cyl(MARBLE, { x: lx, y: 1.3, z: lz, sy: 2.6 }, 0.08, 0.12, 8);
    b.sph(0xfff3bf, { x: lx, y: 2.75, z: lz, s: 0.4 }, 8, 6);
    circ(lx, lz, 0.25);
  }

  // Nishan Sahib: saffron-clad pole, khanda and waving flag
  {
    const [nx, nz] = POS.nishan;
    b.box(MARBLE, { x: nx, y: 0.4, z: nz, sx: 2.4, sy: 0.8, sz: 2.4 });
    b.box(MARBLE, { x: nx, y: 1.0, z: nz, sx: 1.4, sy: 0.4, sz: 1.4 });
    b.cyl(0xff8c1a, { x: nx, y: 7.6, z: nz, sy: 13 }, 0.12, 0.18, 10);
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
      flag.rotation.y = Math.sin(t * 0.3) * 0.4 + 0.6;
    });
  }
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
