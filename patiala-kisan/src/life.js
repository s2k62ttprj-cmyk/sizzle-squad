// Living details: wind-swept grass tufts and wild flowers over every free patch of ground,
// birds wheeling overhead, butterflies over the flowers, and lamps that glow at dusk.
import * as THREE from 'three';
import { BOUNDS, terrainH } from './world.js';
import { FIELDS, PLOT } from './config.js';
import { enhance, TEX } from './shading.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function rng(seed) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// tuft of tapered blades, dark at the root and sunlit at the tip
function tuftGeometry() {
  const pos = [], col = [];
  const base = new THREE.Color(0x3f7a2a), tip = new THREE.Color(0xb5e06a), mid = new THREE.Color(0x76b843);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + (i % 2) * 0.4, r = 0.05, h = 0.26 + (i % 3) * 0.08, lean = 0.12 + (i % 2) * 0.08, w = 0.045;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, tx = cx + Math.cos(a) * lean, tz = cz + Math.sin(a) * lean;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz);
    const c1 = i % 2 ? mid : base;
    col.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, tip.r, tip.g, tip.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // point normals upward so the tufts light like the ground they grow from
  const nr = g.attributes.normal;
  for (let i = 0; i < nr.count; i++) nr.setXYZ(i, nr.getX(i) * 0.35, 0.9, nr.getZ(i) * 0.35);
  return g;
}

function flowerGeometry() {
  const pos = [], col = [];
  const add = (a, b, c, cc) => { pos.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) col.push(cc.r, cc.g, cc.b); };
  const stem = new THREE.Color(0x3f8f2f), white = new THREE.Color(0xffffff), mid = new THREE.Color(0xffc21a);
  add([-0.012, 0, 0], [0.012, 0, 0], [0, 0.28, 0], stem);
  add([0, 0, -0.012], [0, 0, 0.012], [0, 0.28, 0], stem);
  const y = 0.28;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, a1 = a - 0.42, a2 = a + 0.42;
    add([0, y, 0], [Math.cos(a1) * 0.09, y + 0.012, Math.sin(a1) * 0.09], [Math.cos(a2) * 0.09, y + 0.012, Math.sin(a2) * 0.09], white);
  }
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    add([0, y + 0.02, 0], [Math.cos(a) * 0.03, y + 0.014, Math.sin(a) * 0.03], [Math.cos(a + 1.57) * 0.03, y + 0.014, Math.sin(a + 1.57) * 0.03], mid);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const nr = g.attributes.normal;
  for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, 1, 0);
  return g;
}

// one wing: a rounded triangle fan, hinged at x = 0
function wingGeometry(len, width, back = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, width * 0.5, len, 0, back, 0, 0, -width * 0.5, 0, 0, width * 0.5, len * 0.6, 0, width * 0.45 + back * 0.5, len, 0, back], 3));
  g.computeVertexNormals();
  return g;
}

export class Life {
  constructor(game) {
    this.game = game;
    this.rand = rng(1234);
    this.buildMask();
    this.buildGrass();
    this.buildGlows();
    this.buildBirds();
    this.buildButterflies();
  }

  // occupancy grid (0.5 m cells) of everything grass must not grow through
  buildMask() {
    const g = this.game, C = 0.5;
    const x0 = BOUNDS.x0 - 9, z0 = BOUNDS.z0 - 9, W = Math.ceil((BOUNDS.x1 - BOUNDS.x0 + 18) / C), H = Math.ceil((BOUNDS.z1 - BOUNDS.z0 + 18) / C);
    const m = new Uint8Array(W * H);
    const fill = (ax, az, bx, bz) => {
      const i0 = Math.max(0, Math.floor((ax - x0) / C)), i1 = Math.min(W - 1, Math.floor((bx - x0) / C));
      const j0 = Math.max(0, Math.floor((az - z0) / C)), j1 = Math.min(H - 1, Math.floor((bz - z0) / C));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) m[j * W + i] = 1;
    };
    for (const f of FIELDS) fill(f.x0 - 0.9, f.z0 - 0.9, f.x0 + f.cols * PLOT + 0.9, f.z0 + f.rows * PLOT + 0.9);
    for (const c of g.colliders) {
      if (c.r !== undefined) fill(c.x - c.r - 0.25, c.z - c.r - 0.25, c.x + c.r + 0.25, c.z + c.r + 0.25);
      else fill(c.x0 - 0.25, c.z0 - 0.25, c.x1 + 0.25, c.z1 + 0.25);
    }
    for (const p of g.pads.list) fill(p.x - p.r - 0.35, p.z - p.r - 0.35, p.x + p.r + 0.35, p.z + p.r + 0.35);
    this.mask = { m, W, H, x0, z0, C };
  }
  // is this patch of ground free for grass? (not a road, field, building, pad or water)
  free(x, z) {
    const g = this.game, k = this.mask;
    const i = Math.floor((x - k.x0) / k.C), j = Math.floor((z - k.z0) / k.C);
    if (i < 0 || j < 0 || i >= k.W || j >= k.H || k.m[j * k.W + i]) return false;
    return !(g.surface('dirt', x, z) > 0.22 || g.surface('marble', x, z) > 0.05);
  }

  buildGrass() {
    const R = this.rand, scene = this.game.scene;
    const pts = [];
    const x0 = BOUNDS.x0 - 8, x1 = BOUNDS.x1 + 8, z0 = BOUNDS.z0 - 8, z1 = BOUNDS.z1 + 8;
    for (let i = 0; i < 26000 && pts.length < 9000; i++) {
      // cluster: most tufts grow near another tuft
      let x, z;
      if (pts.length && R() < 0.55) { const o = pts[(R() * pts.length) | 0]; x = o[0] + (R() - 0.5) * 1.6; z = o[1] + (R() - 0.5) * 1.6; }
      else { x = x0 + R() * (x1 - x0); z = z0 + R() * (z1 - z0); }
      if (!this.free(x, z)) continue;
      pts.push([x, z]);
    }
    const mat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { sway: 1.6, detail: 0, rim: 0, clouds: true });
    const tufts = new THREE.InstancedMesh(tuftGeometry(), mat, pts.length);
    pts.forEach(([x, z], i) => {
      const s = 0.7 + R() * 0.7;
      _q.setFromEuler(_e.set(0, R() * 6.28, 0));
      _m.compose(_p.set(x, terrainH(x, z) - 0.01, z), _q, _s.set(s, s * (0.8 + R() * 0.5), s));
      tufts.setMatrixAt(i, _m);
      const k = 0.85 + R() * 0.3;
      tufts.setColorAt(i, _c.setRGB(k * (0.9 + R() * 0.25), k, k * (0.8 + R() * 0.3)));
    });
    tufts.receiveShadow = true;
    tufts.frustumCulled = false;
    scene.add(tufts);
    this.tufts = tufts;
    this.tuftN = pts.length;

    // wild flowers in drifts
    const fl = [];
    for (let i = 0; i < 4000 && fl.length < 700; i++) {
      const cx = BOUNDS.x0 + R() * (BOUNDS.x1 - BOUNDS.x0), cz = BOUNDS.z0 + R() * (BOUNDS.z1 - BOUNDS.z0);
      const color = [0xffffff, 0xffe066, 0xff8fab, 0xd0bfff, 0xffa94d][(R() * 5) | 0];
      for (let k = 0; k < 6; k++) {
        const x = cx + (R() - 0.5) * 2.4, z = cz + (R() - 0.5) * 2.4;
        if (this.free(x, z)) fl.push([x, z, color]);
      }
    }
    const fm = enhance(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { sway: 1.2, detail: 0, rim: 0 });
    const flowers = new THREE.InstancedMesh(flowerGeometry(), fm, fl.length);
    fl.forEach(([x, z, color], i) => {
      const s = 0.8 + R() * 0.6;
      _q.setFromEuler(_e.set(0, R() * 6.28, 0));
      _m.compose(_p.set(x, 0, z), _q, _s.set(s, s, s));
      flowers.setMatrixAt(i, _m);
      flowers.setColorAt(i, _c.set(color));
    });
    flowers.frustumCulled = false;
    scene.add(flowers);
    this.flowers = flowers;
    this.flowerN = fl.length;
    this.flowerSpots = fl;
  }

  setQuality(q) {
    const k = q === 'high' ? 1 : q === 'medium' ? 0.7 : 0.35;
    this.tufts.count = Math.floor(this.tuftN * k);
    this.flowers.count = Math.floor(this.flowerN * (q === 'low' ? 0.5 : 1));
  }

  // ---------- dusk lamps (additive point sprites with per-light size)
  buildGlows() {
    const list = this.game.glows || [];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(list.flatMap((l) => [l[0], l[1], l[2]]), 3));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(list.map((l) => l[3]), 1));
    this.glowMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: TEX.glow }, uScale: { value: 800 }, uI: { value: 0 } },
      vertexShader: 'attribute float aSize; uniform float uScale; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uMap; uniform float uI; void main() { vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(c.rgb * uI, c.a * uI); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.glows = new THREE.Points(g, this.glowMat);
    this.glows.frustumCulled = false;
    this.glows.renderOrder = 5;
    this.game.scene.add(this.glows);
  }
  resize(h, fov) { if (this.glowMat) this.glowMat.uniforms.uScale.value = h / (2 * Math.tan(fov * Math.PI / 360)); }

  // ---------- birds: two small flocks circling over the farm
  buildBirds() {
    const n = 10;
    const body = new THREE.SphereGeometry(0.12, 6, 4); body.scale(0.8, 0.7, 2.2);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2b2b30 });
    this.birdBody = new THREE.InstancedMesh(body, mat, n);
    this.birdL = new THREE.InstancedMesh(wingGeometry(0.55, 0.32, -0.12), new THREE.MeshLambertMaterial({ color: 0x3a3a40, side: THREE.DoubleSide }), n);
    const rw = wingGeometry(0.55, 0.32, -0.12); rw.scale(-1, 1, 1);
    this.birdR = new THREE.InstancedMesh(rw, this.birdL.material, n);
    for (const m of [this.birdBody, this.birdL, this.birdR]) { m.frustumCulled = false; this.game.scene.add(m); }
    this.birds = Array.from({ length: n }, (_, i) => ({ flock: i < 5 ? 0 : 1, off: [(i % 5 - 2) * 1.1, ((i % 5) % 2) * 0.6, -Math.abs(i % 5 - 2) * 1.0], ph: i * 0.7 }));
    this.flocks = [{ a: 0, r: 26, h: 10, sp: 0.09, cx: 0, cz: -5 }, { a: 2.5, r: 34, h: 12, sp: -0.07, cx: -8, cz: 10 }];
  }

  // ---------- butterflies fluttering around flowers near the player
  buildButterflies() {
    const n = 14;
    const lw = wingGeometry(0.16, 0.2, 0.04), rw = wingGeometry(0.16, 0.2, 0.04); rw.scale(-1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    this.bfL = new THREE.InstancedMesh(lw, mat, n);
    this.bfR = new THREE.InstancedMesh(rw, mat, n);
    const R = this.rand;
    this.bfs = Array.from({ length: n }, (_, i) => {
      const c = new THREE.Color([0xffd43b, 0xff922b, 0xffffff, 0x74c0fc, 0xf783ac, 0xb197fc][i % 6]);
      this.bfL.setColorAt(i, c); this.bfR.setColorAt(i, c);
      return { x: 0, z: 0, y: 0.8, tx: 0, tz: 0, ph: R() * 6, t: 0, home: null };
    });
    for (const m of [this.bfL, this.bfR]) { m.frustumCulled = false; this.game.scene.add(m); }
  }

  update(dt, t, dusk) {
    const g = this.game;
    // lamps
    const target = Math.max(0, Math.min(1, dusk * 1.3));
    this.glowMat.uniforms.uI.value += (target - this.glowMat.uniforms.uI.value) * Math.min(1, dt * 2);
    this.glows.visible = this.glowMat.uniforms.uI.value > 0.02;

    const p = g.player.pos;
    // birds
    for (const f of this.flocks) {
      f.a += f.sp * dt;
      f.cx += (p.x - f.cx) * dt * 0.05; f.cz += (p.z - 6 - f.cz) * dt * 0.05;
    }
    this.birds.forEach((b, i) => {
      const f = this.flocks[b.flock];
      const a = f.a, dir = Math.sign(f.sp);
      const x = f.cx + Math.cos(a) * f.r, z = f.cz + Math.sin(a) * f.r;
      const heading = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir);
      _q.setFromEuler(_e.set(0, heading, Math.sin(t * 0.7 + b.ph) * 0.15));
      const ox = b.off[0] * Math.cos(heading) + b.off[2] * Math.sin(heading), oz = -b.off[0] * Math.sin(heading) + b.off[2] * Math.cos(heading);
      _p.set(x + ox, f.h + b.off[1] + Math.sin(t * 1.3 + b.ph) * 0.3, z + oz);
      _m.compose(_p, _q, _s.set(1, 1, 1));
      this.birdBody.setMatrixAt(i, _m);
      const flap = Math.sin(t * 9 + b.ph) * 0.7 + 0.1;
      for (const [mesh, s] of [[this.birdL, 1], [this.birdR, -1]]) {
        _q.setFromEuler(_e.set(0, heading, Math.sin(t * 0.7 + b.ph) * 0.15 + s * flap, 'YXZ'));
        _m.compose(_p, _q, _s.set(1, 1, 1));
        mesh.setMatrixAt(i, _m);
      }
    });
    for (const m of [this.birdBody, this.birdL, this.birdR]) m.instanceMatrix.needsUpdate = true;

    // butterflies: hop between flowers within ~14 m of the player
    const spots = this.flowerSpots, R = this.rand;
    this.bfs.forEach((b, i) => {
      b.t -= dt;
      if (!b.home || b.t <= 0 || Math.hypot(b.x - p.x, b.z - p.z) > 18) {
        let pick = null;
        for (let k = 0; k < 12; k++) { const s = spots[(R() * spots.length) | 0]; if (s && Math.hypot(s[0] - p.x, s[1] - p.z) < 14) { pick = s; break; } }
        if (!pick) pick = [p.x + (R() - 0.5) * 16, p.z + (R() - 0.5) * 16];
        if (!b.home || Math.hypot(b.x - p.x, b.z - p.z) > 18) { b.x = pick[0] + (R() - 0.5) * 4; b.z = pick[1] + (R() - 0.5) * 4; }
        b.home = pick; b.t = 3 + R() * 5;
      }
      b.ph += dt;
      const tx = b.home[0] + Math.sin(b.ph * 1.3 + i) * 0.8, tz = b.home[1] + Math.cos(b.ph * 1.1 + i * 2) * 0.8;
      const dx = tx - b.x, dz = tz - b.z;
      b.x += dx * dt * 0.9; b.z += dz * dt * 0.9;
      b.y = 0.55 + Math.sin(b.ph * 2.3 + i) * 0.3 + Math.abs(Math.sin(b.ph * 7)) * 0.1;
      const head = Math.atan2(dx, dz), flap = Math.sin(t * 22 + i) * 0.9 + 0.3;
      _p.set(b.x, b.y, b.z);
      _q.setFromEuler(_e.set(0, head, flap, 'YXZ')); _m.compose(_p, _q, _s.set(1, 1, 1)); this.bfL.setMatrixAt(i, _m);
      _q.setFromEuler(_e.set(0, head, -flap, 'YXZ')); _m.compose(_p, _q, _s.set(1, 1, 1)); this.bfR.setMatrixAt(i, _m);
    });
    this.bfL.instanceMatrix.needsUpdate = this.bfR.instanceMatrix.needsUpdate = true;
  }
}
