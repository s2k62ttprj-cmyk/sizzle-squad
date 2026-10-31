// The game's look: procedural textures (grass, dirt, tilled soil, marble tiles, detail noise),
// an enhanced Lambert material (texture detail, rim light, drifting cloud shadows, wind sway)
// and a stylised animated water shader. Everything is generated at start-up; no image files.
import * as THREE from 'three';

// Shared uniforms: one update per frame drives every material.
export const SH = {
  uTime: { value: 0 },
  uCloud: { value: 0.18 },                       // cloud-shadow strength (weather)
  uRim: { value: 0.3 },                          // rim-light strength
  uRimColor: { value: new THREE.Color(0xfff1d2) },
  uDetailAmt: { value: 1 },                      // texture detail (0 on low quality)
  uDetail: { value: null },
  uWind: { value: 1 },
  uLight: { value: 1 },                          // overall light level for unlit shaders (water)
};

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable value noise in 0..1 (contrast-stretched)
function noiseField(size, base, octaves, seed, persist = 0.5) {
  const out = new Float32Array(size * size), R = mulberry32(seed);
  let amp = 1;
  for (let o = 0; o < octaves; o++) {
    const n = base << o, grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = R();
    for (let y = 0; y < size; y++) {
      const fy = y / size * n, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % n) * n, r1 = ((y0 + 1) % n) * n;
      for (let x = 0; x < size; x++) {
        const fx = x / size * n, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const c0 = x0 % n, c1 = (x0 + 1) % n;
        const a = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * sx;
        const b = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    amp *= persist;
  }
  let lo = 1e9, hi = -1e9;
  for (const v of out) { if (v < lo) lo = v; if (v > hi) hi = v; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
  return out;
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function toTexture(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Paints a base colour mottled between two colours by noise into the canvas
function mottle(ctx, size, n, c1, c2, fine = null, fineAmt = 0) {
  const img = ctx.createImageData(size, size), d = img.data;
  // raw sRGB components (THREE.Color would convert hex to linear)
  const rgb = (h) => ({ r: ((h >> 16) & 255) / 255, g: ((h >> 8) & 255) / 255, b: (h & 255) / 255 });
  const a = rgb(c1), b = rgb(c2);
  for (let i = 0; i < size * size; i++) {
    const k = n[i], f = fine ? 1 + (fine[i] - 0.5) * fineAmt : 1;
    d[i * 4] = Math.min(255, (a.r + (b.r - a.r) * k) * 255 * f);
    d[i * 4 + 1] = Math.min(255, (a.g + (b.g - a.g) * k) * 255 * f);
    d[i * 4 + 2] = Math.min(255, (a.b + (b.b - a.b) * k) * 255 * f);
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Draw something at (x, y) and its wrapped copies so the texture tiles seamlessly
function wrapDraw(size, x, y, r, fn) {
  for (const ox of [0, -size, size]) for (const oy of [0, -size, size]) {
    if (x + ox < -r || x + ox > size + r || y + oy < -r || y + oy > size + r) continue;
    fn(x + ox, y + oy);
  }
}

// ---------------------------------------------------------------- textures
function makeDetail() {
  const S = 256;
  const r = noiseField(S, 8, 4, 11), g = noiseField(S, 4, 3, 23, 0.55), b = noiseField(S, 16, 3, 37);
  const [c, x] = canvas(S);
  const img = x.createImageData(S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { d[i * 4] = r[i] * 255; d[i * 4 + 1] = g[i] * 255; d[i * 4 + 2] = b[i] * 255; d[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  return toTexture(c, false);
}

function makeGrass() {
  const S = 512, R = mulberry32(5);
  const [c, x] = canvas(S);
  mottle(x, S, noiseField(S, 6, 4, 3), 0x79c043, 0x93d24f, noiseField(S, 64, 2, 9), 0.18);
  const pal = ['#5fae35', '#6dbb3c', '#86cc4a', '#9bd85a', '#4f9c2e', '#a9df6a', '#74c041'];
  x.lineCap = 'round';
  for (let i = 0; i < 9000; i++) {
    const px = R() * S, py = R() * S, len = 3 + R() * 7, a = R() * Math.PI * 2;
    x.strokeStyle = pal[(R() * pal.length) | 0];
    x.globalAlpha = 0.55 + R() * 0.4;
    x.lineWidth = 1 + R() * 1.4;
    wrapDraw(S, px, py, 12, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + Math.cos(a) * len * 0.5 + 1.5, Y + Math.sin(a) * len * 0.5, X + Math.cos(a) * len, Y + Math.sin(a) * len); x.stroke(); });
  }
  // clover patches and tiny wild flowers
  for (let i = 0; i < 70; i++) {
    const px = R() * S, py = R() * S;
    x.globalAlpha = 0.8; x.fillStyle = '#4c9a2c';
    wrapDraw(S, px, py, 8, (X, Y) => { for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(X + Math.cos(k * 2.1) * 2.2, Y + Math.sin(k * 2.1) * 2.2, 2.2, 0, 7); x.fill(); } });
  }
  for (let i = 0; i < 46; i++) {
    const px = R() * S, py = R() * S;
    x.globalAlpha = 0.95; x.fillStyle = ['#ffffff', '#fff3a0', '#ffd6e8', '#ffe066'][i % 4];
    wrapDraw(S, px, py, 4, (X, Y) => { x.beginPath(); x.arc(X, Y, 1.6, 0, 7); x.fill(); });
  }
  x.globalAlpha = 1;
  return toTexture(c);
}

function makeDirt() {
  const S = 512, R = mulberry32(17);
  const [c, x] = canvas(S);
  mottle(x, S, noiseField(S, 6, 4, 41), 0xc99a62, 0xdcb683, noiseField(S, 64, 2, 43), 0.14);
  // ruts / foot-worn streaks
  x.globalAlpha = 0.07; x.strokeStyle = '#7a5530'; x.lineWidth = 6;
  for (let i = 0; i < 40; i++) {
    const px = R() * S, py = R() * S, a = R() * 6.28, l = 30 + R() * 60;
    wrapDraw(S, px, py, 90, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke(); });
  }
  // pebbles with a lit top and dark bottom
  for (let i = 0; i < 650; i++) {
    const px = R() * S, py = R() * S, r = 1 + R() * 2.6, tone = 120 + R() * 90 | 0;
    wrapDraw(S, px, py, 8, (X, Y) => {
      x.globalAlpha = 0.5; x.fillStyle = '#6b4a2a'; x.beginPath(); x.ellipse(X + 0.6, Y + 0.9, r, r * 0.75, 0, 0, 7); x.fill();
      x.globalAlpha = 0.95; x.fillStyle = `rgb(${tone + 20},${tone},${tone - 20})`; x.beginPath(); x.ellipse(X, Y, r, r * 0.75, 0, 0, 7); x.fill();
      x.globalAlpha = 0.6; x.fillStyle = '#fff6e0'; x.beginPath(); x.arc(X - r * 0.3, Y - r * 0.3, r * 0.35, 0, 7); x.fill();
    });
  }
  x.globalAlpha = 1;
  return toTexture(c);
}

// grey-scale clod pattern, tinted by the plot colour
function makeSoil() {
  const S = 256, R = mulberry32(29);
  const [c, x] = canvas(S);
  mottle(x, S, noiseField(S, 8, 3, 51), 0xb4b4b4, 0xe2e2e2, noiseField(S, 64, 2, 53), 0.2);
  for (let i = 0; i < 520; i++) {
    const px = R() * S, py = R() * S, r = 1.5 + R() * 3.5;
    wrapDraw(S, px, py, 8, (X, Y) => {
      x.globalAlpha = 0.45; x.fillStyle = '#505050'; x.beginPath(); x.ellipse(X + 0.8, Y + 1.2, r, r * 0.8, 0, 0, 7); x.fill();
      x.globalAlpha = 0.7; x.fillStyle = '#f4f4f4'; x.beginPath(); x.ellipse(X, Y, r * 0.85, r * 0.65, 0, 0, 7); x.fill();
    });
  }
  x.globalAlpha = 1;
  return toTexture(c, false);
}

function makeTiles() {
  const S = 256;
  const [c, x] = canvas(S);
  mottle(x, S, noiseField(S, 8, 4, 61), 0xf6f1e7, 0xfffdf8);
  // marble veins
  const R = mulberry32(67);
  x.strokeStyle = '#d9d2c4'; x.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    let px = R() * S, py = R() * S;
    x.globalAlpha = 0.35; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 6; k++) { px += (R() - 0.5) * 30; py += (R() - 0.3) * 24; x.lineTo(px, py); }
    x.stroke();
  }
  // 2×2 tiles per texture with a thin grout line
  x.globalAlpha = 1; x.fillStyle = '#d8cfbf';
  for (const p of [0, S / 2]) { x.fillRect(p, 0, 2, S); x.fillRect(0, p, S, 2); }
  x.globalAlpha = 0.5; x.fillStyle = '#ffffff';
  for (const p of [2, S / 2 + 2]) { x.fillRect(p, 0, 1, S); x.fillRect(0, p, S, 1); }
  x.globalAlpha = 1;
  return toTexture(c);
}

// soft round shadow used under people, animals and vehicles
function makeBlobTex() {
  const [c, x] = canvas(64);
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return toTexture(c, false, false);
}

// warm additive glow for lamps and bulbs
function makeGlow() {
  const [c, x] = canvas(64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,248,220,1)');
  g.addColorStop(0.25, 'rgba(255,214,120,0.7)');
  g.addColorStop(1, 'rgba(255,170,60,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return toTexture(c, true, false);
}

export const TEX = {};
TEX.detail = makeDetail();
SH.uDetail.value = TEX.detail;
TEX.grass = makeGrass();
TEX.dirt = makeDirt();
TEX.soil = makeSoil();
TEX.tiles = makeTiles();
TEX.blob = makeBlobTex();
TEX.glow = makeGlow();
export function setAnisotropy(n) { for (const k of ['grass', 'dirt', 'soil', 'tiles', 'detail']) { TEX[k].anisotropy = n; TEX[k].needsUpdate = true; } }

// ---------------------------------------------------------------- enhanced Lambert
// opts: detail (strength of triplanar texture detail), rim (0..1), clouds, sway (wind on
// instanced plants, scaled by height), wmap (world-mapped texture multiplied in), wscale
export function enhance(m, opts = {}) {
  const o = { detail: 0.16, rim: 1, clouds: true, sway: 0, wmap: null, wscale: 0.5, wmul: 1, ...opts };
  const key = `enh:${o.detail}:${o.rim}:${o.clouds}:${o.sway}:${!!o.wmap}:${o.wscale}:${o.wmul}`;
  m.customProgramCacheKey = () => key;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: SH.uTime, uCloud: SH.uCloud, uRim: SH.uRim, uRimColor: SH.uRimColor, uDetail: SH.uDetail, uDetailAmt: SH.uDetailAmt, uWind: SH.uWind });
    if (o.wmap) sh.uniforms.uWMap = { value: o.wmap };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWN;\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${o.sway ? `#ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float hgt = max(position.y, 0.0);
          float ph = uTime * 1.7 + ip.x * 0.45 + ip.z * 0.3;
          float gust = 0.75 + 0.25 * sin(uTime * 0.6 + ip.x * 0.05);
          transformed.x += sin(ph) * ${(0.07 * o.sway).toFixed(3)} * hgt * gust * uWind;
          transformed.z += cos(ph * 0.8) * ${(0.05 * o.sway).toFixed(3)} * hgt * gust * uWind;
        #endif` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        vWPos = (modelMatrix * wp4).xyz;
        vWN = inverseTransformDirection(transformedNormal, viewMatrix);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        varying vec3 vWN;
        uniform sampler2D uDetail;
        uniform float uTime, uCloud, uRim, uDetailAmt;
        uniform vec3 uRimColor;
        ${o.wmap ? 'uniform sampler2D uWMap;' : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${o.wmap ? `diffuseColor.rgb *= texture2D(uWMap, vWPos.xz * ${o.wscale.toFixed(3)}).rgb * ${o.wmul.toFixed(3)};` : ''}
        ${o.detail ? `{
          vec3 bw = abs(normalize(vWN)); bw /= (bw.x + bw.y + bw.z + 1e-4);
          float dn = texture2D(uDetail, vWPos.xz * 0.37).r * bw.y + texture2D(uDetail, vWPos.xy * 0.37).r * bw.z + texture2D(uDetail, vWPos.zy * 0.37).r * bw.x;
          diffuseColor.rgb *= 1.0 + (dn - 0.5) * ${(o.detail * 2).toFixed(3)} * uDetailAmt;
        }` : ''}`)
      .replace('#include <opaque_fragment>', `
        ${o.clouds ? `{
          float cl = texture2D(uDetail, vWPos.xz * 0.0105 + vec2(uTime * 0.0055, uTime * 0.0032)).g;
          outgoingLight *= 1.0 - smoothstep(0.52, 0.74, cl) * uCloud;
        }` : ''}
        ${o.rim ? `{
          float rim = 1.0 - saturate(dot(geometryNormal, geometryViewDir));
          outgoingLight += uRimColor * (rim * rim * rim) * uRim * ${o.rim.toFixed(2)} * diffuseColor.rgb * 1.6;
        }` : ''}
        #include <opaque_fragment>`);
  };
  return m;
}

// ---------------------------------------------------------------- ground
// Grass, dirt roads and marble blended by a painted splat map: r = dirt, g = marble, b = wear
export function groundMaterial(splat, origin, size) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.customProgramCacheKey = () => 'ground';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uTime: SH.uTime, uCloud: SH.uCloud, uDetail: SH.uDetail, uDetailAmt: SH.uDetailAmt,
      uSplat: { value: splat }, uGrass: { value: TEX.grass }, uDirt: { value: TEX.dirt }, uTile: { value: TEX.tiles },
      uOrigin: { value: new THREE.Vector2(origin[0], origin[1]) }, uSize: { value: size },
    });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        uniform sampler2D uDetail, uSplat, uGrass, uDirt, uTile;
        uniform vec2 uOrigin;
        uniform float uSize, uTime, uCloud, uDetailAmt;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 w = vWPos.xz;
          vec4 sp = texture2D(uSplat, (w - uOrigin) / uSize);
          vec3 dt = texture2D(uDetail, w * 0.19).rgb;
          float macro = texture2D(uDetail, w * 0.021).b;
          vec3 grass = texture2D(uGrass, w * 0.21).rgb * (0.84 + 0.32 * macro);
          grass = mix(grass, grass * vec3(1.12, 1.06, 0.78), smoothstep(0.62, 0.9, texture2D(uDetail, w * 0.013).r) * 0.6);
          vec3 dirt = texture2D(uDirt, w * 0.24).rgb;
          vec3 tile = texture2D(uTile, w * 0.42).rgb;
          float da = smoothstep(0.36, 0.64, sp.r + (dt.r - 0.5) * 0.5 * uDetailAmt);
          vec3 c = mix(grass, dirt, da);
          c *= 1.0 - sp.b * 0.28;
          c = mix(c, tile, smoothstep(0.45, 0.55, sp.g));
          diffuseColor.rgb *= c;
        }`)
      .replace('#include <opaque_fragment>', `{
          float cl = texture2D(uDetail, vWPos.xz * 0.0105 + vec2(uTime * 0.0055, uTime * 0.0032)).g;
          outgoingLight *= 1.0 - smoothstep(0.52, 0.74, cl) * uCloud;
        }
        #include <opaque_fragment>`);
  };
  return m;
}

// ---------------------------------------------------------------- water
const waterUniforms = {
  uDeep: { value: new THREE.Color(0x1f86b8) },
  uShallow: { value: new THREE.Color(0x5fd0e8) },
  uFoam: { value: new THREE.Color(0xf2fbff) },
};
export function waterMaterial(w = 4, d = 4, { foam = 0.35, tint = null } = {}) {
  const m = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSize: { value: new THREE.Vector2(w, d) }, uFoamW: { value: foam },
    }]),
    vertexShader: `
      varying vec3 vW; varying vec2 vUv;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime, uLight; uniform sampler2D uDetail; uniform vec3 uDeep, uShallow, uFoam; uniform vec2 uSize; uniform float uFoamW;
      varying vec3 vW; varying vec2 vUv;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vW.xz;
        float n1 = texture2D(uDetail, p * 0.09 + vec2(uTime * 0.021, uTime * 0.013)).r;
        float n2 = texture2D(uDetail, p * 0.14 - vec2(uTime * 0.017, -uTime * 0.022)).b;
        float n = (n1 + n2) * 0.5;
        vec3 col = mix(uDeep, uShallow, smoothstep(0.25, 0.8, n));
        float glint = smoothstep(0.86, 0.93, n1 * 0.55 + n2 * 0.55);
        col += vec3(1.0, 0.98, 0.9) * glint * 0.75;
        float ripple = sin((n1 - n2) * 30.0 + uTime * 1.5) * 0.5 + 0.5;
        col += uShallow * smoothstep(0.92, 1.0, ripple) * 0.18;
        vec2 e2 = min(vUv, 1.0 - vUv) * uSize;
        float e = min(e2.x, e2.y);
        float f = 1.0 - smoothstep(0.0, uFoamW, e + (n - 0.5) * 0.25 * uFoamW);
        col = mix(col, uFoam, f * 0.85);
        gl_FragColor = vec4(col * uLight, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  m.uniforms.uTime = SH.uTime;
  m.uniforms.uLight = SH.uLight;
  m.uniforms.uDetail = SH.uDetail;
  m.uniforms.uDeep = tint?.deep ? { value: new THREE.Color(tint.deep) } : waterUniforms.uDeep;
  m.uniforms.uShallow = tint?.shallow ? { value: new THREE.Color(tint.shallow) } : waterUniforms.uShallow;
  m.uniforms.uFoam = waterUniforms.uFoam;
  return m;
}

// ---------------------------------------------------------------- small helpers
export const blobMaterial = new THREE.MeshBasicMaterial({ map: TEX.blob, transparent: true, depthWrite: false, opacity: 1 });
const blobGeo = new THREE.PlaneGeometry(1, 1);
blobGeo.rotateX(-Math.PI / 2);
export function makeBlob(w = 1, d = w, y = 0.03) {
  const m = new THREE.Mesh(blobGeo, blobMaterial);
  m.scale.set(w, 1, d);
  m.position.y = y;
  m.renderOrder = -1;
  return m;
}
export { blobGeo };
