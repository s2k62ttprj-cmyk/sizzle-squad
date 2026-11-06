// The 22 No. flyover: an elevated highway across the village between the farm and the
// Gurdwara, running out over the Bhakhra canal. Punjab trucks, PRTC buses, cars and
// tractor-trolleys drive across it (and honk). It fades out when the farmer walks under it
// so they never disappear behind the deck.
import * as THREE from 'three';
import { Builder, textTexture } from './geo.js';
import { enhance } from './shading.js';
import { FLY_Z, FLY_Y } from './world.js';

const X0 = -84, X1 = 78;                       // the deck runs into the hills at both ends
const PIERS = [-49, -40.2, -31, -22, -13, -4.2, 4.2, 11, 22, 31, 40, 49];
const LANE = 0.72;                             // left-hand traffic: eastbound in the north lane
const SCALE = 0.72;                            // vehicles are a little small so two fit side by side

export class Flyover {
  constructor(game) {
    this.game = game;
    this.mat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }));
    this.opacity = 1;
    const z = FLY_Z, top = FLY_Y;
    const b = new Builder(0.03, { ao: 0.22, aoH: 1.2 });
    // deck in 12 m spans so the parts off screen are skipped
    for (let x = X0; x < X1; x += 12) {
      const cx = x + 6;
      b.rbox(0xc9c5bd, { x: cx, y: top - 0.32, z, sx: 12.02, sy: 0.6, sz: 3.7 }, 0.06);
      b.box(0x4a4d52, { x: cx, y: top, z, sx: 12.02, sy: 0.04, sz: 3.1, j: 0.01 });
      for (const s of [-1, 1]) {
        b.rbox(0xe9e6df, { x: cx, y: top + 0.28, z: z + s * 1.7, sx: 12.02, sy: 0.55, sz: 0.24 }, 0.05);
        b.box(0xf2c200, { x: cx, y: top + 0.03, z: z + s * 1.45, sx: 12.02, sy: 0.02, sz: 0.06, ao: false });
      }
      for (let k = 0; k < 4; k++) b.box(0xffffff, { x: x + 1.5 + k * 3, y: top + 0.03, z, sx: 1.4, sy: 0.02, sz: 0.08, ao: false });
      for (const s of [-1, 0, 1]) b.box(0xb5b0a6, { x: cx, y: top - 0.78, z: z + s * 1.15, sx: 12.02, sy: 0.36, sz: 0.3 });
    }
    // piers: one round column each with a hammerhead cap on a footing
    for (const px of PIERS) {
      b.rbox(0xb9b4aa, { x: px, y: 0.1, z, sx: 1.4, sy: 0.2, sz: 1.4 }, 0.04);
      b.cyl(0xc4bfb5, { x: px, y: (top - 1.1) / 2, z, sy: top - 1.1, g: 0.1 }, 0.42, 0.48, 14);
      b.rbox(0xbdb8ae, { x: px, y: top - 1.05, z, sx: 1.0, sy: 0.5, sz: 3.3 }, 0.06);
      game.colliders.push({ x: px, z, r: 0.55 });
    }
    // street lights along the south barrier
    for (let x = X0 + 6; x < X1; x += 18) {
      b.cyl(0x6c7178, { x, y: top + 1.4, z: z + 1.75, sy: 2.4 }, 0.05, 0.07, 6);
      b.box(0x6c7178, { x, y: top + 2.58, z: z + 1.4, sx: 0.08, sy: 0.08, sz: 0.75 });
      b.sph(0xfff3bf, { x, y: top + 2.48, z: z + 1.08, sx: 0.32, sy: 0.14, sz: 0.32, ao: false, j: 0 }, 8, 4);
      game.glows.push([x, top + 2.45, z + 1.08, 1.2]);
    }
    this.root = b.meshChunks(24, this.mat);
    game.scene.add(this.root);

    // the name board over the main road, and "22" painted on the two piers beside it
    this.signs = [];
    const sign = (tex, w, h, x, y, zz) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      m.position.set(x, y, zz);
      game.scene.add(m);
      this.signs.push(m);
    };
    const board = textTexture([{ text: '22 ਨੰਬਰ ਫਲਾਈਓਵਰ', size: 74 }, { text: '22 No. FLYOVER · PATIALA', size: 52 }], { w: 1024, h: 240, bg: '#1e7a3c' });
    sign(board, 5.6, 1.3, 0, top - 0.2, z + 2.0);
    sign(board, 5.6, 1.3, -30, top - 0.2, z + 2.0);
    sign(board, 5.6, 1.3, 26, top - 0.2, z + 2.0);
    const num = textTexture([{ text: '22', size: 90 }], { w: 128, h: 128, bg: '#f2c200', fg: '#1d1d1f', border: '#1d1d1f' });
    for (const px of [-4.2, 4.2]) sign(num, 0.62, 0.62, px, 2.3, z + 0.58);

    this.buildTraffic();
  }

  // ---------- traffic
  buildTraffic() {
    const g = this.game;
    this.cars = [];
    const kinds = [['truck', 8.5], ['bus', 10.5], ['car', 13.5], ['tractor', 5.5], ['truck', 9], ['car', 12.5], ['car', 14]];
    kinds.forEach(([kind, speed], i) => {
      const mesh = this.vehicle(kind, i);
      mesh.scale.setScalar(SCALE);
      g.scene.add(mesh);
      const dir = i % 2 ? -1 : 1;
      const car = { mesh, kind, speed, v: speed, dir, x: X0 + Math.random() * (X1 - X0), honkT: 2 + Math.random() * 6, len: { truck: 5.8, bus: 8, car: 3.9, tractor: 6.2 }[kind] * SCALE };
      this.place(car);
      this.cars.push(car);
    });
  }

  place(c) {
    c.mesh.position.set(c.x, FLY_Y + 0.02, FLY_Z + (c.dir > 0 ? -LANE : LANE));
    c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
  }

  vehicle(kind, i) {
    const b = new Builder(0.03, { ao: 0.2, aoH: 0.5 });
    const wheel = (x, s, r = 0.42) => { b.cyl(0x1d1d1f, { x, y: r, z: s, rx: Math.PI / 2, sy: 0.3 }, r, r, 12); b.cyl(0xc0c4c9, { x, y: r, z: s * 1.06, rx: Math.PI / 2, sy: 0.04 }, r * 0.5, r * 0.5, 10); };
    if (kind === 'truck') {
      // Punjab truck: painted cab with a visor, wooden body with bright bands and a tarp
      const cab = [0xe8590c, 0x1c7ed6, 0xf2c200][i % 3], art = [0xe03131, 0x2b8a3e, 0x7048e8][i % 3];
      b.box(0x2b2b2b, { y: 0.62, sx: 5.6, sy: 0.25, sz: 1.7 });
      b.rbox(cab, { x: 2.1, y: 1.5, sx: 1.4, sy: 1.6, sz: 2.0 }, 0.12);
      b.box(0x2a3d4f, { x: 2.81, y: 1.78, sx: 0.02, sy: 0.6, sz: 1.7, ao: false });
      b.rbox(art, { x: 2.15, y: 2.38, sx: 1.55, sy: 0.22, sz: 2.06 }, 0.05);
      b.box(0xd8dde3, { x: 2.86, y: 0.78, sx: 0.12, sy: 0.22, sz: 2.0 });
      for (const s of [-0.7, 0.7]) b.sph(0xfff3bf, { x: 2.85, y: 1.05, z: s, s: 0.2, ao: false }, 6, 4);
      b.rbox(0xc8792b, { x: -0.75, y: 1.6, sx: 4.0, sy: 1.7, sz: 2.1 }, 0.06);
      b.box(art, { x: -0.75, y: 1.05, sx: 4.02, sy: 0.2, sz: 2.12 });
      b.box(0xf2c200, { x: -0.75, y: 1.35, sx: 4.02, sy: 0.1, sz: 2.12 });
      b.box(0x2b8a3e, { x: -0.75, y: 2.3, sx: 4.02, sy: 0.16, sz: 2.12 });
      for (let k = 0; k < 4; k++) b.box([0xff6fae, 0x22b8cf, 0xffd43b, 0xff922b][k], { x: -2.3 + k * 1.0, y: 1.8, sx: 0.32, sy: 0.32, sz: 2.13, rx: Math.PI / 4 });
      b.sph(0x2f9e44, { x: -0.75, y: 2.45, sx: 4.0, sy: 0.75, sz: 2.0, g: 0.2 }, 10, 6, Math.PI * 2, Math.PI / 2);
      for (const x of [2.0, -0.7, -1.9]) for (const s of [-0.95, 0.95]) wheel(x, s);
    } else if (kind === 'bus') {
      // PRTC bus: cream body, blue band, a long row of windows and a luggage rack
      b.rbox(0xf1ece0, { y: 1.45, sx: 8, sy: 2.2, sz: 2.2 }, 0.14);
      b.box(0x2a3d4f, { y: 1.85, sx: 7.6, sy: 0.75, sz: 2.22, ao: false });
      for (let k = 0; k < 9; k++) b.box(0xf1ece0, { x: -3.6 + k * 0.9, y: 1.85, sx: 0.08, sy: 0.76, sz: 2.24, ao: false });
      b.box(0x1c4fd1, { y: 1.12, sx: 8.02, sy: 0.3, sz: 2.22 });
      b.box(0xe03131, { y: 0.88, sx: 8.02, sy: 0.08, sz: 2.22 });
      b.box(0x2a3d4f, { x: 4.01, y: 1.75, sx: 0.02, sy: 1.0, sz: 2.0, ao: false });
      for (let k = 0; k < 5; k++) b.box(0x6c7178, { x: -2.5 + k * 1.2, y: 2.62, sx: 0.06, sy: 0.12, sz: 2.0 });
      b.rbox([0xd9c49a, 0x4dabf7, 0xe03131][i % 3], { x: -1.0, y: 2.75, sx: 1.4, sy: 0.4, sz: 1.2 }, 0.06);
      for (const x of [2.8, -2.6]) for (const s of [-1.0, 1.0]) wheel(x, s, 0.48);
    } else if (kind === 'car') {
      const c = [0xf8f9fa, 0xc92a2a, 0x868e96, 0x1c4fd1][i % 4];
      b.rbox(c, { y: 0.62, sx: 3.9, sy: 0.7, sz: 1.7 }, 0.18);
      b.rbox(c, { x: -0.2, y: 1.15, sx: 2.1, sy: 0.6, sz: 1.5 }, 0.16);
      b.box(0x2a3d4f, { x: -0.2, y: 1.15, sx: 2.12, sy: 0.4, sz: 1.52, ao: false });
      for (const s of [-0.6, 0.6]) b.sph(0xfff3bf, { x: 1.94, y: 0.7, z: s, sx: 0.08, sy: 0.14, sz: 0.3, ao: false }, 6, 4);
      for (const x of [1.25, -1.25]) for (const s of [-0.8, 0.8]) wheel(x, s, 0.33);
    } else {
      // red tractor pulling a loaded trolley
      b.rbox(0xd9480f, { x: 1.9, y: 1.0, sx: 1.6, sy: 0.7, sz: 0.8 }, 0.1);
      b.rbox(0xd9480f, { x: 1.1, y: 1.3, sx: 0.7, sy: 0.6, sz: 1.0 }, 0.08);
      b.cyl(0x343a40, { x: 2.3, y: 1.6, sy: 0.6 }, 0.05, 0.05, 6);
      b.rbox(0x343a40, { x: 0.95, y: 1.75, sx: 0.4, sy: 0.12, sz: 0.5 }, 0.03);
      wheel(2.4, -0.6, 0.36); wheel(2.4, 0.6, 0.36);
      wheel(1.0, -0.75, 0.7); wheel(1.0, 0.75, 0.7);
      b.box(0x343a40, { x: -0.1, y: 0.6, sx: 0.8, sy: 0.08, sz: 0.08 });
      b.rbox(0x2b8a3e, { x: -1.9, y: 1.0, sx: 3.0, sy: 0.7, sz: 1.8 }, 0.05);
      b.rbox(0xe03131, { x: -1.9, y: 1.38, sx: 3.02, sy: 0.08, sz: 1.82 }, 0.02);
      for (let k = 0; k < 6; k++) b.sph(0xd9c49a, { x: -2.9 + (k % 3) * 0.95, y: 1.55, z: (k < 3 ? -0.4 : 0.4), sx: 0.85, sy: 0.45, sz: 0.7 }, 8, 6);
      wheel(-1.9, -0.95, 0.42); wheel(-1.9, 0.95, 0.42);
    }
    const m = b.mesh(this.mat, false);       // no shadow pass for traffic: cheap on phones
    m.receiveShadow = false;
    return m;
  }

  update(dt) {
    const g = this.game, p = g.player.pos;
    // fade the deck while the farmer is under it or just north of it
    const want = p.z > FLY_Z - 5.2 && p.z < FLY_Z + 2.2 ? 0.25 : 1;
    if (Math.abs(want - this.opacity) > 0.001) {
      this.opacity += (want - this.opacity) * Math.min(1, dt * 6);
      if (Math.abs(want - this.opacity) < 0.01) this.opacity = want;
      this.mat.opacity = this.opacity;
      this.mat.depthWrite = this.opacity > 0.98;
      for (const s of this.signs) s.material.opacity = this.opacity;
    }
    const near = Math.abs(p.z - FLY_Z) < 14;
    for (const c of this.cars) {
      // keep a gap behind whoever is in front in the same lane (and honk about it)
      let gap = 1e9, ahead = null;
      for (const o of this.cars) {
        if (o === c || o.dir !== c.dir) continue;
        const d = (o.x - c.x) * c.dir;
        if (d > 0 && d < gap) { gap = d; ahead = o; }
      }
      const room = gap - (c.len + (ahead ? ahead.len : 0)) / 2;
      const target = room < 2 ? 0 : room < 7 ? Math.min(c.speed, ahead.v) : c.speed;
      c.v += (target - c.v) * Math.min(1, dt * 2.5);
      const ox = c.x;
      c.x += c.v * c.dir * dt;
      if ((c.dir > 0 && c.x > X1 + 6) || (c.dir < 0 && c.x < X0 - 6)) {
        c.x = c.dir > 0 ? X0 - 6 - Math.random() * 25 : X1 + 6 + Math.random() * 25;
        c.v = c.speed;
      }
      c.mesh.position.x = c.x;
      if (!near) continue;
      const dx = Math.abs(c.x - p.x);
      c.honkT -= dt;
      if (c.honkT <= 0 && dx < 18) {
        c.honkT = room < 7 ? 1.5 + Math.random() * 2 : 5 + Math.random() * 9;
        g.audio.play(c.kind === 'car' ? 'beep' : 'honk');
      }
      if (Math.abs(p.z - FLY_Z) < 4 && (ox - p.x) * (c.x - p.x) < 0) g.audio.play(c.kind === 'tractor' ? 'chug' : 'whoosh');
    }
  }
}
