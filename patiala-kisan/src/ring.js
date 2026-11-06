// The ring road: a two-lane asphalt road all the way round the village for gerhi (a ride
// round town). It crosses the Bhakhra on two road bridges, passes under both ends of the 22
// No. flyover, and joins the village lanes at junctions with zebra crossings. Streetlights
// glow at dusk; cars, autos, tractors and trucks drive it on the left and slow for the farmer.
import * as THREE from 'three';
import { Builder, textTexture, vcMaterialCut } from './geo.js';
import { enhance } from './shading.js';
import { trafficVehicle } from './flyover.js';
import { POS } from './world.js';

export const RING = { x0: -50.5, x1: 44.5, z0: -69, z1: 51, r: 10, w: 6.6 };
const CX = (RING.x0 + RING.x1) / 2, CZ = (RING.z0 + RING.z1) / 2;

// ---------------------------------------------------------------- the centre line
// Points every metre round the loop, clockwise from the south side (x = 0): straight sides
// joined by quarter circles. s = distance along the loop.
function buildPath() {
  const { x0, x1, z0, z1, r } = RING, raw = [];
  const line = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5); for (let i = 0; i < n; i++) raw.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]); };
  const arc = (cx, cz, a0, a1) => { const n = 24; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; raw.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
  line(0, z1, x1 - r, z1);
  arc(x1 - r, z1 - r, Math.PI / 2, 0);
  line(x1, z1 - r, x1, z0 + r);
  arc(x1 - r, z0 + r, 0, -Math.PI / 2);
  line(x1 - r, z0, x0 + r, z0);
  arc(x0 + r, z0 + r, -Math.PI / 2, -Math.PI);
  line(x0, z0 + r, x0, z1 - r);
  arc(x0 + r, z1 - r, Math.PI, Math.PI / 2);
  line(x0 + r, z1, 0, z1);
  // resample evenly by distance
  const cum = [0];
  for (let i = 1; i <= raw.length; i++) { const a = raw[i - 1], b = raw[i % raw.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[cum.length - 1], N = Math.round(L), pts = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = k * L / N;
    while (cum[j + 1] < s) j++;
    const a = raw[j], b = raw[(j + 1) % raw.length], f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    pts.push({ x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, s });
  }
  for (let k = 0; k < N; k++) {
    const a = pts[(k - 1 + N) % N], b = pts[(k + 1) % N];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    pts[k].dx = dx / l; pts[k].dz = dz / l;
    pts[k].rot = Math.atan2(dx, dz);
    // outwards = away from the middle of the village
    const ox = pts[k].dz, oz = -pts[k].dx;
    const out = (pts[k].x - CX) * ox + (pts[k].z - CZ) * oz > 0 ? 1 : -1;
    pts[k].ox = ox * out; pts[k].oz = oz * out;
  }
  return { pts, L };
}
export const PATH = buildPath();

// Point on the loop at distance s (wraps), with heading and the "outwards" side
export function ringAt(s, out = {}) {
  const { pts, L } = PATH, N = pts.length;
  s = ((s % L) + L) % L;
  const f = s / L * N, i = Math.floor(f) % N, k = f - Math.floor(f), a = pts[i], b = pts[(i + 1) % N];
  out.x = a.x + (b.x - a.x) * k; out.z = a.z + (b.z - a.z) * k;
  out.dx = a.dx; out.dz = a.dz; out.rot = a.rot; out.ox = a.ox; out.oz = a.oz; out.s = s;
  return out;
}
// Nearest point on the loop: { s, d (distance from the centre line) }
export function ringNearest(x, z) {
  let best = 0, bd = 1e9;
  for (const p of PATH.pts) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = p.s; } }
  return { s: best, d: Math.sqrt(bd) };
}
// Distance from the centre line, worked out directly from the rounded-rectangle shape (cheap)
export function ringDist(x, z) {
  const hx = (RING.x1 - RING.x0) / 2 - RING.r, hz = (RING.z1 - RING.z0) / 2 - RING.r;
  const qx = Math.abs(x - CX) - hx, qz = Math.abs(z - CZ) - hz;
  const sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - RING.r;
  return Math.abs(sd);
}
export const onRing = (x, z) => ringDist(x, z) < RING.w / 2 + 0.6;
// the road rises a little to cross the canal
const hump = (x) => Math.max(0, 1 - Math.max(0, Math.abs(x - POS.canalX) - 2.6) / 3.5);

// junctions: where the village lanes meet the ring (x, z on the ring, and the lane's side)
export const JUNCTIONS = [
  { id: 'south', x: 0, z: RING.z1, name: 'Main road' },
  { id: 'mandi', x: 10, z: RING.z1, name: 'Mandi road' },
  { id: 'east', x: RING.x1, z: -14.5, name: 'Pens lane' },
  { id: 'works', x: RING.x1, z: 23, name: 'Workshop lane' },
  { id: 'west', x: RING.x0, z: 2.5, name: 'Bhakhra footbridge' },
  { id: 'north', x: 0, z: RING.z0, name: 'Gurdwara back road' },
];

// ---------------------------------------------------------------- asphalt texture
function asphaltTexture() {
  const W = 128, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#55585d'; x.fillRect(0, 0, W, H);
  // aggregate speckle and tyre-worn darker bands in each lane
  for (let i = 0; i < 9000; i++) { const v = 70 + Math.random() * 60 | 0; x.fillStyle = `rgba(${v},${v},${v + 4},${0.35 + Math.random() * 0.4})`; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); }
  x.fillStyle = 'rgba(30,30,34,0.16)';
  for (const u of [0.22, 0.36, 0.64, 0.78]) x.fillRect(u * W - 5, 0, 10, H);
  // white edge lines and a dashed white centre line (3 m dash in an 8 m tile)
  x.fillStyle = '#f1efe8';
  x.fillRect(W * 0.045, 0, W * 0.035, H); x.fillRect(W * 0.92, 0, W * 0.035, H);
  x.fillRect(W * 0.49 - 2, 0, 5, H * 3 / 8);
  // a soft gravel shoulder at both edges
  const g = x.createLinearGradient(0, 0, W * 0.04, 0); g.addColorStop(0, 'rgba(160,140,110,0.85)'); g.addColorStop(1, 'rgba(160,140,110,0)');
  x.fillStyle = g; x.fillRect(0, 0, W * 0.04, H);
  const g2 = x.createLinearGradient(W, 0, W * 0.96, 0); g2.addColorStop(0, 'rgba(160,140,110,0.85)'); g2.addColorStop(1, 'rgba(160,140,110,0)');
  x.fillStyle = g2; x.fillRect(W * 0.96, 0, W * 0.04, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- the road and its furniture
export class Ring {
  constructor(game) {
    this.game = game;
    const { pts } = PATH, N = pts.length, w = RING.w;
    // the road surface: one ribbon round the loop
    const pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
    for (let k = 0; k <= N; k++) {
      const p = pts[k % N], s = k === N ? PATH.L : p.s, y = 0.035 + hump(p.x) * 0.1;
      const lx = p.dz, lz = -p.dx;           // left of the travel direction
      pos.set([p.x + lx * w / 2, y, p.z + lz * w / 2, p.x - lx * w / 2, y, p.z - lz * w / 2], k * 6);
      uv.set([0, s / 8, 1, s / 8], k * 4);
      if (k < N) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // keep the faces pointing up whichever way the ribbon winds
    const nrm = geo.attributes.normal;
    if (nrm.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]; geo.setIndex(idx); geo.computeVertexNormals(); }
    const road = new THREE.Mesh(geo, enhance(new THREE.MeshLambertMaterial({ map: asphaltTexture() }), { detail: 0.08, rim: 0 }));
    road.receiveShadow = true;
    game.scene.add(road);
    this.road = road;

    const b = new Builder(0.03, { ao: 0.2, aoH: 0.8 });
    const glows = game.glows, cols = game.colliders;
    this.spurs = [];
    // streetlights along the outer edge
    for (let s = 6; s < PATH.L; s += 17) {
      const p = ringAt(s), x = p.x + p.ox * (w / 2 + 0.7), z = p.z + p.oz * (w / 2 + 0.7);
      if (Math.abs(x - POS.canalX) < 4.5) continue;               // not on the bridges
      if (JUNCTIONS.some((j) => Math.hypot(j.x - x, j.z - z) < 5)) continue;
      const ry = Math.atan2(-p.ox, -p.oz);
      b.push(x, 0, z, ry);
      b.cyl(0x6c7178, { y: 2.6, sy: 5.2 }, 0.07, 0.11, 8);
      b.rbox(0x5b6168, { y: 0.15, sx: 0.4, sy: 0.3, sz: 0.4 }, 0.04);
      b.box(0x6c7178, { y: 5.1, z: 0.8, sx: 0.08, sy: 0.08, sz: 1.6 });
      b.rbox(0x3d4248, { y: 5.05, z: 1.55, sx: 0.36, sy: 0.12, sz: 0.6 }, 0.04);
      b.box(0xfff3bf, { y: 4.98, z: 1.55, sx: 0.28, sy: 0.02, sz: 0.48, ao: false, j: 0 });
      b.pop();
      glows.push([x - p.ox * 1.55, 4.95, z - p.oz * 1.55, 1.6]);
      cols.push({ x, z, r: 0.18 });
    }
    // zebra crossings, stop lines and a short asphalt spur at every junction
    for (const j of JUNCTIONS) {
      const n = ringNearest(j.x, j.z), p = ringAt(n.s);
      b.push(p.x, 0, p.z, p.rot);
      for (let i = 0; i < 7; i++) b.box(0xf1efe8, { x: -w / 2 + 0.55 + i * (w - 1.1) / 6, y: 0.052, sx: 0.42, sy: 0.012, sz: 2.4, ao: false, j: 0 });
      b.pop();
      if (j.id === 'west') continue;            // the footbridge takes over here
      const ix = -p.ox, iz = -p.oz;             // towards the village
      const len = 4.2;
      this.spurs.push({ x: p.x + ix * (w / 2 + len / 2), z: p.z + iz * (w / 2 + len / 2), ix, iz, len, half: 2.2 });
      b.push(p.x + ix * (w / 2 + len / 2 - 0.05), 0, p.z + iz * (w / 2 + len / 2 - 0.05), Math.atan2(ix, iz));
      b.box(0x55585d, { y: 0.03, sx: 4.0, sy: 0.03, sz: len, ao: false });
      b.box(0xf1efe8, { y: 0.05, z: -len / 2 + 0.3, sx: 3.8, sy: 0.012, sz: 0.18, ao: false, j: 0 });
      b.pop();
    }
    // bridges over the Bhakhra: parapets with painted posts where the ring crosses the canal
    for (const p of PATH.pts) {
      if (Math.abs(p.x - POS.canalX) > 3.4) continue;
      for (const sd of [-1, 1]) {
        const x = p.x + p.dz * sd * (w / 2 + 0.2), z = p.z - p.dx * sd * (w / 2 + 0.2);
        b.push(x, 0, z, p.rot);
        b.rbox(0xd8d2c4, { y: 0.45, sx: 0.28, sy: 0.7, sz: 1.06 }, 0.03);
        b.box(Math.round(p.x) % 2 ? 0xffffff : 0x111111, { y: 0.84, sx: 0.3, sy: 0.12, sz: 1.06 });
        b.pop();
        cols.push({ x, z, r: 0.3 });
      }
    }
    // the footbridge from the fields to the west side of the ring
    {
      const z = 2.5, xa = RING.x0 + RING.w / 2 - 0.1, xb = -41.2;
      b.rbox(0xb8b0a0, { x: (xa + xb) / 2, y: 0.12, z, sx: xb - xa, sy: 0.16, sz: 2.8 }, 0.04);
      for (const sd of [-1, 1]) {
        b.rbox(0x9aa0a6, { x: (xa + xb) / 2, y: 0.85, z: z + sd * 1.35, sx: xb - xa, sy: 0.06, sz: 0.06 }, 0.02);
        for (let k = 0; k <= 5; k++) b.cyl(0x9aa0a6, { x: xa + k * (xb - xa) / 5, y: 0.5, z: z + sd * 1.35, sy: 0.7 }, 0.03, 0.03, 6);
        cols.push({ x0: xa, x1: xb, z0: z + sd * 1.35 - 0.06, z1: z + sd * 1.35 + 0.06 });
      }
    }
    // the Bhakhra's brick banks, and the water as an obstacle, except where the road crosses
    {
      const cx = POS.canalX, crossed = (x, z) => ringDist(x, z) < RING.w / 2 + 0.25 || (z > 1.0 && z < 4.0);
      const runs = (test) => { const out = []; let a = null; for (let z = -74; z <= 68.01; z += 0.25) { const free = !test(z); if (free && a === null) a = z; if ((!free || z >= 68) && a !== null) { out.push([a, z]); a = null; } } return out; };
      for (const s of [-1, 1]) for (const [z0, z1] of runs((z) => crossed(cx + s * 1.65, z))) b.rbox(0xb4785a, { x: cx + s * 1.65, y: 0.12, z: (z0 + z1) / 2, sx: 0.35, sy: 0.3, sz: z1 - z0 }, 0.06);
      for (const [z0, z1] of runs((z) => crossed(cx - 1.9, z) || crossed(cx, z) || crossed(cx + 1.9, z))) cols.push({ x0: cx - 1.9, x1: cx + 1.75, z0: z0 - (z0 < -73 ? 30 : 0), z1: z1 + (z1 > 67.9 ? 30 : 0) });
    }
    // milestones every 100 m, and green ring-road boards at the bigger junctions
    for (let s = 50; s < PATH.L; s += 100) {
      const p = ringAt(s), x = p.x + p.ox * (w / 2 + 0.5), z = p.z + p.oz * (w / 2 + 0.5);
      if (Math.abs(x - POS.canalX) < 5) continue;
      b.rbox(0xffffff, { x, y: 0.35, z, sx: 0.4, sy: 0.7, sz: 0.22 }, 0.04);
      b.dome(0xf2c200, { x, y: 0.7, z, sx: 0.4, sy: 0.3, sz: 0.22 }, 10, 4);
    }
    const board = textTexture([{ text: 'ਰਿੰਗ ਰੋਡ · RING ROAD', size: 56 }, { text: 'Patiala Bypass · Gerhi Route', size: 34 }], { w: 640, h: 180, bg: '#1e7a3c' });
    for (const [x, z] of [[-6, RING.z1 - 4.6], [RING.x1 - 4.8, 20], [6, RING.z0 + 4.6], [RING.x0 - 4.6, -6]]) {
      b.cyl(0x8a8f96, { x: x - 1.1, y: 1.4, z, sy: 2.8 }, 0.06, 0.06, 6);
      b.cyl(0x8a8f96, { x: x + 1.1, y: 1.4, z, sy: 2.8 }, 0.06, 0.06, 6);
      b.rbox(0x155f2e, { x, y: 2.45, z: z - 0.06, sx: 2.6, sy: 0.82, sz: 0.06 }, 0.02);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.7), new THREE.MeshBasicMaterial({ map: board }));
      s.position.set(x, 2.45, z);
      game.scene.add(s);
      cols.push({ x: x - 1.1, z, r: 0.12 }, { x: x + 1.1, z, r: 0.12 });
    }
    const bridgeBoard = textTexture([{ text: 'ਭਾਖੜਾ ਪੁਲ', size: 60 }, { text: 'BHAKHRA PUL', size: 44 }], { w: 512, h: 200, bg: '#1c5fa8' });
    for (const z of [RING.z0 + 4.4, RING.z1 - 4.4]) {
      b.cyl(0x8a8f96, { x: -38.8, y: 1.0, z, sy: 2.0 }, 0.05, 0.05, 6);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ map: bridgeBoard }));
      s.position.set(-38.8, 1.9, z + 0.05);
      game.scene.add(s);
    }
    this.furniture = b.meshChunks(30, vcMaterialCut);
    game.scene.add(this.furniture);
    game.seeThrough?.add(this.furniture);
    this.buildTraffic();
  }

  // asphalt here? (the loop or a junction spur) — keeps grass off the road
  covers(x, z) {
    if (ringDist(x, z) < RING.w / 2 + 0.7) return true;
    for (const s of this.spurs) {
      const dx = x - s.x, dz = z - s.z, along = dx * s.ix + dz * s.iz, across = dx * s.iz - dz * s.ix;
      if (Math.abs(along) < s.len / 2 + 0.4 && Math.abs(across) < s.half + 0.4) return true;
    }
    return false;
  }

  // ---------- traffic: a few vehicles going round in both directions, on the left
  buildTraffic() {
    const g = this.game;
    this.mat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true });
    const kinds = [['car', 10.5, 1], ['tractor', 5.2, 1], ['car', 9.5, -1], ['truck', 7.5, -1], ['car', 11, 1], ['bus', 8, -1]];
    this.cars = kinds.map(([kind, speed, dir], i) => {
      const mesh = trafficVehicle(kind, i + 3, this.mat);
      mesh.scale.setScalar(0.8);
      g.scene.add(mesh);
      const len = { truck: 5.8, bus: 8, car: 3.9, tractor: 6.2 }[kind] * 0.8;
      const c = { mesh, kind, speed, v: speed, dir, s: (i / kinds.length) * PATH.L, len, honkT: 3 + Math.random() * 6, cols: [{ x: 0, z: 0, r: 0.95 }, { x: 0, z: 0, r: 0.95 }] };
      g.colliders.push(...c.cols);
      return c;
    });
  }

  update(dt) {
    const g = this.game, p = g.player.pos, L = PATH.L;
    const me = ringNearest(p.x, p.z);
    for (const c of this.cars) {
      // gap to the next vehicle in the same lane
      let gap = 1e9, ahead = null;
      for (const o of this.cars) {
        if (o === c || o.dir !== c.dir) continue;
        const d = (((o.s - c.s) * c.dir) % L + L) % L;
        if (d < gap) { gap = d; ahead = o; }
      }
      let room = gap - (c.len + (ahead ? ahead.len : 0)) / 2;
      // and to the farmer, if they stand or ride in this lane
      const pd = (((me.s - c.s) * c.dir) % L + L) % L;
      const lane = ringAt(c.s, _a);
      const side = (p.x - lane.x) * lane.dz - (p.z - lane.z) * lane.dx;     // + = left of the centre line
      const inLane = me.d < RING.w / 2 + 0.8 && side * c.dir > -0.6;
      if (inLane && pd < 14) room = Math.min(room, pd - c.len / 2 - 1.2);
      const target = room < 1.5 ? 0 : room < 8 ? Math.min(c.speed, ahead && gap < pd ? ahead.v : c.speed * room / 8) : c.speed;
      c.v += (target - c.v) * Math.min(1, dt * (target < c.v ? 4 : 1.5));
      c.s = ((c.s + c.v * c.dir * dt) % L + L) % L;
      const q = ringAt(c.s, _a);
      const lx = q.dz * c.dir, lz = -q.dx * c.dir;               // left of this vehicle
      const x = q.x + lx * 1.65, z = q.z + lz * 1.65;
      c.mesh.position.set(x, 0.035 + hump(x) * 0.1, z);
      c.mesh.rotation.y = q.rot + (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      const hx = q.dx * c.dir, hz = q.dz * c.dir;
      c.cols[0].x = x + hx * c.len * 0.22; c.cols[0].z = z + hz * c.len * 0.22;
      c.cols[1].x = x - hx * c.len * 0.22; c.cols[1].z = z - hz * c.len * 0.22;
      // honk at whoever blocks the lane, and now and then for no reason at all
      c.honkT -= dt;
      const near = Math.hypot(p.x - x, p.z - z) < 22;
      if (c.honkT <= 0 && near) {
        c.honkT = room < 6 ? 1.6 + Math.random() * 2 : 6 + Math.random() * 10;
        g.audio.play(c.kind === 'car' ? 'beep' : 'honk');
      }
    }
  }
}
const _a = {};
