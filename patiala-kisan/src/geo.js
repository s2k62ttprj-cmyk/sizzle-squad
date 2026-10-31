// Procedural geometry builder: collects coloured primitives and merges them into one
// vertex-coloured BufferGeometry, so a whole building or tree costs a single draw call.
// Colours get baked lighting detail: a soft top-to-bottom gradient per part and contact
// shadow (ambient occlusion) near the ground.
import * as THREE from 'three';
import { enhance } from './shading.js';

const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export const vcMaterial = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }));
export const vcMaterialFlat = enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { rim: 0, detail: 0.1 });

export class Builder {
  // ao: darkening at ground level (0..1); aoH: height over which it fades out
  constructor(jitter = 0.04, { ao = 0.3, aoH = 0.9, ground = 0 } = {}) {
    this.parts = [];
    this.jitter = jitter;
    this.ao = ao;
    this.aoH = aoH;
    this.ground = ground;
    this.stack = [new THREE.Matrix4()];
  }

  // Nested transforms: everything added until pop() is relative to (x, y, z, ry).
  push(x = 0, y = 0, z = 0, ry = 0, s = 1) {
    _q.setFromEuler(_e.set(0, ry, 0));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(s, s, s));
    this.stack.push(this.stack[this.stack.length - 1].clone().multiply(m));
    return this;
  }
  pop() { if (this.stack.length > 1) this.stack.pop(); return this; }

  // src: a cached primitive {pos, nor} or any BufferGeometry
  // t: {x,y,z, s|sx,sy,sz, rx,ry,rz, j (jitter), g (vertical gradient), ao (false to skip)}
  add(src, color, t = {}) {
    const P = src.pos ? src : toArrays(src);
    _q.setFromEuler(_e.set(t.rx || 0, t.ry || 0, t.rz || 0));
    const s = t.s ?? 1;
    _s.set(t.sx ?? s, t.sy ?? s, t.sz ?? s);
    _p.set(t.x || 0, t.y || 0, t.z || 0);
    _m.compose(_p, _q, _s).premultiply(this.stack[this.stack.length - 1]);
    _nm.getNormalMatrix(_m);
    const e = _m.elements, ne = _nm.elements, sp = P.pos, sn = P.nor;
    const len = sp.length, pa = new Float32Array(len), na = new Float32Array(len);
    for (let i = 0; i < len; i += 3) {
      const x = sp[i], y = sp[i + 1], z = sp[i + 2];
      pa[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
      pa[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      pa[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const a = sn[i], b = sn[i + 1], c = sn[i + 2];
      let nx = ne[0] * a + ne[3] * b + ne[6] * c, ny = ne[1] * a + ne[4] * b + ne[7] * c, nz = ne[2] * a + ne[5] * b + ne[8] * c;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      na[i] = nx / l; na[i + 1] = ny / l; na[i + 2] = nz / l;
    }
    const n = len / 3, col = new Float32Array(len);
    _c.set(color);
    const cr = _c.r, cg = _c.g, cb = _c.b;
    const j = t.j ?? this.jitter;
    const grad = t.g ?? 0.06;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 1; i < pa.length; i += 3) { const y = pa[i]; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const span = y1 - y0 > 0.04 ? y1 - y0 : 0;
    const ao = t.ao === false ? 0 : this.ao, aoH = this.aoH, gr = this.ground;
    for (let i = 0; i < n; i += 3) {
      const k = j ? 1 + (Math.random() * 2 - 1) * j : 1;
      for (let v = 0; v < 3 && i + v < n; v++) {
        const y = pa[(i + v) * 3 + 1];
        let f = k;
        if (span) f *= 1 + grad * (2 * (y - y0) / span - 1);
        if (ao) { const h = Math.min(1, Math.max(0, (y - gr) / aoH)); f *= 1 - ao * (1 - h * h * (3 - 2 * h)); }
        const o = (i + v) * 3;
        col[o] = cr * f; col[o + 1] = cg * f; col[o + 2] = cb * f;
      }
    }
    this.parts.push({ pos: pa, nor: na, col });
    return this;
  }

  box(color, t) { return this.add(prim('box', () => new THREE.BoxGeometry(1, 1, 1)), color, t); }
  // rounded box (bevelled edges catch the light — reads much softer than a plain box)
  rbox(color, t, r = 0.08) {
    const sx = t.sx ?? t.s ?? 1, sy = t.sy ?? t.s ?? 1, sz = t.sz ?? t.s ?? 1;
    const g = roundedBox(sx, sy, sz, Math.min(r, sx / 2.2, sy / 2.2, sz / 2.2));
    return this.add(g, color, { ...t, sx: 1, sy: 1, sz: 1, s: 1 });
  }
  cyl(color, t, rt = 0.5, rb = 0.5, seg = 12, open = false) { return this.add(prim(`cyl:${rt}:${rb}:${seg}:${open}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg, 1, open)), color, t); }
  cone(color, t, seg = 12) { return this.add(prim(`cone:${seg}`, () => new THREE.ConeGeometry(0.5, 1, seg)), color, t); }
  sph(color, t, w = 12, h = 8, phiLen = Math.PI * 2, thetaLen = Math.PI) {
    return this.add(prim(`sph:${w}:${h}:${phiLen}:${thetaLen}`, () => new THREE.SphereGeometry(0.5, w, h, 0, phiLen, 0, thetaLen)), color, { g: 0.14, ...t });
  }
  ico(color, t, detail = 1) { return this.add(prim(`ico:${detail}`, () => new THREE.IcosahedronGeometry(0.5, detail)), color, { g: 0.16, ...t }); }
  dome(color, t, w = 16, h = 8) { return this.sph(color, t, w, h, Math.PI * 2, Math.PI / 2); }
  torus(color, t, r = 0.5, tube = 0.08, rs = 6, ts = 18, arc = Math.PI * 2) {
    return this.add(prim(`tor:${r}:${tube}:${rs}:${ts}:${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc)), color, t);
  }
  capsule(color, t, r = 0.5, len = 1, seg = 10) { return this.add(prim(`cap:${r}:${len}:${seg}`, () => new THREE.CapsuleGeometry(r, len, 4, seg)), color, { g: 0.12, ...t }); }
  plane(color, t) { return this.add(prim('plane', () => new THREE.PlaneGeometry(1, 1)), color, { rx: -Math.PI / 2, ...t }); }
  disc(color, t, seg = 24) { return this.add(prim(`disc:${seg}`, () => new THREE.CircleGeometry(0.5, seg)), color, { rx: -Math.PI / 2, ...t }); }
  // gable / pitched roof prism: width along x, depth along z, ridge along x
  prism(color, t) {
    return this.add(prim('prism', () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, 0.5], 3));
      g.setIndex([0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5, 0, 1, 5, 0, 5, 4]);
      const ng = g.toNonIndexed();
      ng.computeVertexNormals();
      return ng;
    }), color, { g: 0.04, ...t });
  }

  get empty() { return this.parts.length === 0; }

  build() {
    const g = merge(this.parts);
    this.parts = [];
    return g;
  }

  mesh(material = vcMaterial, shadows = true) {
    const m = new THREE.Mesh(this.build(), material);
    m.castShadow = shadows;
    m.receiveShadow = true;
    return m;
  }

  // Like mesh(), but splits the parts into a grid of cells so the camera and the shadow
  // camera can skip whatever is off screen (big static scenery).
  meshChunks(cell = 24, material = vcMaterial, shadows = true) {
    const groups = new Map();
    for (const p of this.parts) {
      // parts are small: the midpoint of the first and last vertex is a good enough centre
      const a = p.pos, l = a.length - 3;
      const key = `${Math.floor((a[0] + a[l]) / 2 / cell)}:${Math.floor((a[2] + a[l + 2]) / 2 / cell)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    const root = new THREE.Group();
    for (const parts of groups.values()) {
      const g = merge(parts);
      const m = new THREE.Mesh(g, material);
      m.castShadow = shadows;
      m.receiveShadow = true;
      root.add(m);
    }
    this.parts = [];
    return root;
  }
}

// geometry → plain non-indexed position/normal arrays
function toArrays(g) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (!ng.attributes.normal) ng.computeVertexNormals();
  return { pos: ng.attributes.position.array, nor: ng.attributes.normal.array };
}
// concatenate parts into one vertex-coloured geometry
function merge(parts) {
  let n = 0;
  for (const p of parts) n += p.pos.length;
  const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n);
  let o = 0;
  for (const p of parts) { pos.set(p.pos, o); nor.set(p.nor, o); col.set(p.col, o); o += p.pos.length; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

// Primitive cache: each shape is built once as plain arrays and reused for every copy.
const PRIM = new Map();
function prim(key, make) {
  let a = PRIM.get(key);
  if (!a) { a = toArrays(make()); PRIM.set(key, a); }
  return a;
}

// Box with bevelled edges: a 3×3×3 grid whose outer band wraps round the edge with
// smooth normals, so edges catch the light like a soft rounded corner.
const rbCache = new Map();
function roundedBox(w, h, d, r) {
  const key = `${w.toFixed(3)}:${h.toFixed(3)}:${d.toFixed(3)}:${r.toFixed(3)}`;
  const hit = rbCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
  const p = g.attributes.position, n = g.attributes.normal;
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  const remap = (u, half, inner) => (Math.abs(u) > 0.4 ? Math.sign(u) * half : Math.sign(u) * inner);
  for (let i = 0; i < p.count; i++) {
    v.set(remap(p.getX(i), w / 2, hw), remap(p.getY(i), h / 2, hh), remap(p.getZ(i), d / 2, hd));
    c.set(Math.max(-hw, Math.min(hw, v.x)), Math.max(-hh, Math.min(hh, v.y)), Math.max(-hd, Math.min(hd, v.z)));
    const dir = v.clone().sub(c);
    if (dir.lengthSq() < 1e-8) dir.set(n.getX(i), n.getY(i), n.getZ(i));
    dir.normalize();
    p.setXYZ(i, c.x + dir.x * r, c.y + dir.y * r, c.z + dir.z * r);
    n.setXYZ(i, dir.x, dir.y, dir.z);
  }
  const arr = toArrays(g);
  rbCache.set(key, arr);
  return arr;
}

// Canvas-texture sign for text (Gurmukhi renders with the device font).
export function textTexture(lines, { w = 512, h = 256, bg = '#1e6b34', fg = '#ffffff', border = '#ffffff', font = 'Baloo 2' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  // painted board: gradient, inner border, soft vignette
  const gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, shadeCss(bg, 0.12)); gr.addColorStop(1, shadeCss(bg, -0.12));
  x.fillStyle = gr; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = border; x.lineWidth = Math.max(6, h * 0.05); x.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const step = h / (lines.length + 1);
  lines.forEach((ln, i) => {
    const size = ln.size || Math.floor(h / (lines.length + 1.6));
    x.font = `800 ${size}px "${ln.font || font}", "Baloo Paaji 2", "Gurmukhi MN", sans-serif`;
    x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowOffsetY = Math.max(2, size * 0.06); x.shadowBlur = 0;
    x.fillText(ln.text, w / 2, step * (i + 1), w - 40);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function shadeCss(hex, k) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return '#' + c.getHexString();
}
