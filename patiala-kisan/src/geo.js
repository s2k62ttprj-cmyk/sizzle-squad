// Procedural geometry builder: collects coloured primitives and merges them into one
// vertex-coloured BufferGeometry, so a whole building or tree costs a single draw call.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export const vcMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

export class Builder {
  constructor(jitter = 0.04) {
    this.parts = [];
    this.jitter = jitter;
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

  // t: {x,y,z, s|sx,sy,sz, rx,ry,rz, j}
  add(geo, color, t = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    _q.setFromEuler(_e.set(t.rx || 0, t.ry || 0, t.rz || 0));
    const s = t.s ?? 1;
    _s.set(t.sx ?? s, t.sy ?? s, t.sz ?? s);
    _p.set(t.x || 0, t.y || 0, t.z || 0);
    _m.compose(_p, _q, _s).premultiply(this.stack[this.stack.length - 1]);
    g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    _c.set(color);
    const j = t.j ?? this.jitter;
    for (let i = 0; i < n; i += 3) {
      const k = j ? 1 + (Math.random() * 2 - 1) * j : 1;
      for (let v = 0; v < 3 && i + v < n; v++) {
        const o = (i + v) * 3;
        col[o] = _c.r * k; col[o + 1] = _c.g * k; col[o + 2] = _c.b * k;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  box(color, t) { return this.add(new THREE.BoxGeometry(1, 1, 1), color, t); }
  cyl(color, t, rt = 0.5, rb = 0.5, seg = 12, open = false) { return this.add(new THREE.CylinderGeometry(rt, rb, 1, seg, 1, open), color, t); }
  cone(color, t, seg = 12) { return this.add(new THREE.ConeGeometry(0.5, 1, seg), color, t); }
  sph(color, t, w = 12, h = 8, phiLen = Math.PI * 2, thetaLen = Math.PI) {
    return this.add(new THREE.SphereGeometry(0.5, w, h, 0, phiLen, 0, thetaLen), color, t);
  }
  dome(color, t, w = 16, h = 8) { return this.sph(color, t, w, h, Math.PI * 2, Math.PI / 2); }
  torus(color, t, r = 0.5, tube = 0.08, rs = 6, ts = 18, arc = Math.PI * 2) {
    return this.add(new THREE.TorusGeometry(r, tube, rs, ts, arc), color, t);
  }
  capsule(color, t, r = 0.5, len = 1, seg = 10) { return this.add(new THREE.CapsuleGeometry(r, len, 4, seg), color, t); }
  plane(color, t) { return this.add(new THREE.PlaneGeometry(1, 1), color, { rx: -Math.PI / 2, ...t }); }
  disc(color, t, seg = 24) { return this.add(new THREE.CircleGeometry(0.5, seg), color, { rx: -Math.PI / 2, ...t }); }

  get empty() { return this.parts.length === 0; }

  build() {
    if (!this.parts.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    g.computeBoundingSphere();
    return g;
  }

  mesh(material = vcMaterial, shadows = true) {
    const m = new THREE.Mesh(this.build(), material);
    m.castShadow = shadows;
    m.receiveShadow = true;
    return m;
  }
}

// Canvas-texture sign for text (Gurmukhi renders with the device font).
export function textTexture(lines, { w = 512, h = 256, bg = '#1e6b34', fg = '#ffffff', border = '#ffffff', font = 'Baloo 2' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = border; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const step = h / (lines.length + 1);
  lines.forEach((ln, i) => {
    const size = ln.size || Math.floor(h / (lines.length + 1.6));
    x.font = `800 ${size}px "${ln.font || font}", "Baloo Paaji 2", "Gurmukhi MN", sans-serif`;
    x.fillText(ln.text, w / 2, step * (i + 1), w - 40);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
