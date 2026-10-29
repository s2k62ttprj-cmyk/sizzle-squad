'use strict';
/* Navdeep's Farm - procedural pixel art.
   Every sprite is drawn in code at 1 px per game pixel and scaled up on screen. */

const TILE = 16;
const G_GRASS = 0, G_PATH = 1, G_WATER = 2, G_FOREST = 3, G_DRIVE = 4;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// Deterministic randomness so the farm looks the same every time.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, s = 0) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function rect(g, c, x, y, w = 1, h = 1) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

function ellipse(g, c, cx, cy, rx, ry) {
  g.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
    g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

// Adds a 1 px dark outline around a sprite (the result is 2 px wider and taller).
function outlined(src, color = '#24170e') {
  const [m, mg] = makeCanvas(src.width, src.height);
  mg.drawImage(src, 0, 0);
  mg.globalCompositeOperation = 'source-in';
  rect(mg, color, 0, 0, src.width, src.height);
  const [c, g] = makeCanvas(src.width + 2, src.height + 2);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(m, dx, dy);
  g.drawImage(src, 1, 1);
  return c;
}

// Scale2x (EPX): doubles a picture and rounds off its jagged diagonals. The game draws
// every sprite and the ground at this doubled resolution so edges look smooth on the TV.
function scale2x(src) {
  const w = src.width, h = src.height;
  const p = new Uint32Array(src.getContext('2d').getImageData(0, 0, w, h).data.buffer);
  const [c, g] = makeCanvas(w * 2, h * 2);
  const out = g.createImageData(w * 2, h * 2), d = new Uint32Array(out.data.buffer);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = p[y * w + x];
      const A = y > 0 ? p[(y - 1) * w + x] : P, D = y < h - 1 ? p[(y + 1) * w + x] : P;
      const C = x > 0 ? p[y * w + x - 1] : P, B = x < w - 1 ? p[y * w + x + 1] : P;
      const o = y * 4 * w + x * 2;
      d[o] = C === A && C !== D && A !== B ? A : P;
      d[o + 1] = A === B && A !== C && B !== D ? B : P;
      d[o + 2 * w] = D === C && D !== B && C !== A ? C : P;
      d[o + 2 * w + 1] = B === D && B !== A && D !== C ? D : P;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

function withHd(c) { c.hd = scale2x(c); return c; }

function flipH(src) {
  const [c, g] = makeCanvas(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return withHd(c);
}

// outline: true for the default dark outline, a colour string for a tinted one, false for none
function paint(w, h, fn, outline = true) {
  const [c, g] = makeCanvas(w, h);
  fn(g);
  if (!outline) return withHd(c);
  return withHd(typeof outline === 'string' ? outlined(c, outline) : outlined(c));
}

const PAL = {
  grass: ['#6cba4e', '#61aa45', '#7bc95a', '#559a3e'],
  forest: ['#3d7a35', '#35702f', '#468a3d'],
  path: ['#d6b077', '#c7a066', '#e0bd88', '#b58e5a'],
  soil: ['#8d5c36', '#74492a', '#a06d42'],
  wet: ['#5e3b22', '#4b2e1a', '#6d462a'],
  water: ['#3f94d9', '#3683c6', '#8fd0ff'],
  shore: '#e2cd96',
  leafDark: '#2f6b2c', leaf: '#3f8a36', leafMid: '#5aa63f', leafLight: '#7ccb5b',
  wood: '#8a5a32', woodLight: '#a8743f', woodDark: '#6b4226',
  stone: '#8e8b86', stoneLight: '#b3b0aa', stoneDark: '#6d6a66',
};

/* ---------- ground tiles, drawn into the cached map ---------- */
const Ground = {
  grass(g, x, y, tx, ty) {
    // large soft patches so the lawn doesn't look tiled
    const patch = hash2(tx >> 2, ty >> 2, 501) * 0.6 + hash2(tx >> 1, ty >> 1, 502) * 0.4;
    rect(g, patch < 0.35 ? '#69b64c' : patch < 0.65 ? '#6cba4e' : '#70be51', x, y, 16, 16);
    for (let i = 0; i < 14; i++) {
      const px = x + Math.floor(hash2(tx, ty, i) * 16), py = y + Math.floor(hash2(tx, ty, i + 40) * 16);
      rect(g, hash2(tx, ty, i + 80) < 0.5 ? PAL.grass[1] : PAL.grass[2], px, py);
    }
    // a blade or two of taller grass
    const h = hash2(tx, ty, 300), tufts = h < 0.45 ? 0 : h < 0.85 ? 1 : 2;
    for (let i = 0; i < tufts; i++) {
      const bx = x + 2 + Math.floor(hash2(tx, ty, i + 310) * 11), by = y + 4 + Math.floor(hash2(tx, ty, i + 330) * 10);
      rect(g, '#579c3f', bx, by - 1, 1, 2);
      rect(g, '#86d062', bx + 1, by - 3, 1, 4);
      rect(g, '#4f9238', bx + 2, by - 2, 1, 3);
    }
    const extra = hash2(tx, ty, 350);
    const ex = x + 3 + Math.floor(hash2(tx, ty, 351) * 10), ey = y + 3 + Math.floor(hash2(tx, ty, 352) * 10);
    if (extra < 0.07) {
      rect(g, '#6f6a62', ex, ey + 1, 3, 1);
      rect(g, '#a9a49a', ex, ey, 3, 1);
      rect(g, '#d6d1c6', ex, ey);
    } else if (extra < 0.14) {
      rect(g, '#4f9238', ex, ey, 2, 2);
      rect(g, '#4f9238', ex + 3, ey, 2, 2);
      rect(g, '#4f9238', ex + 1, ey + 2, 2, 2);
      rect(g, '#8fd36a', ex, ey);
      rect(g, '#8fd36a', ex + 3, ey);
    }
  },
  drive(g, x, y, tx, ty) {
    rect(g, '#a3a19b', x, y, 16, 16);
    for (let i = 0; i < 16; i++) {
      rect(g, hash2(tx, ty, i + 700) < 0.5 ? '#94928c' : '#b2b0aa', x + Math.floor(hash2(tx, ty, i + 720) * 16), y + Math.floor(hash2(tx, ty, i + 740) * 16));
    }
    if (ty % 2 === 0) rect(g, '#86847e', x, y, 16, 1);
    if (tx % 2 === 0) rect(g, '#86847e', x, y, 1, 16);
  },
  flowers(g, x, y, tx, ty) {
    const colors = ['#ffffff', '#ffd84a', '#ff8fb3', '#b9a4ff'];
    const col = colors[Math.floor(hash2(tx, ty, 7) * colors.length)];
    for (let i = 0; i < 2; i++) {
      const fx = x + 3 + Math.floor(hash2(tx, ty, i + 9) * 10), fy = y + 3 + Math.floor(hash2(tx, ty, i + 19) * 10);
      rect(g, col, fx - 1, fy, 3, 1);
      rect(g, col, fx, fy - 1, 1, 3);
      rect(g, '#f2a93b', fx, fy);
    }
  },
  forest(g, x, y, tx, ty) {
    rect(g, PAL.forest[0], x, y, 16, 16);
    for (let i = 0; i < 10; i++) {
      rect(g, hash2(tx, ty, i + 3) < 0.5 ? PAL.forest[1] : PAL.forest[2],
        x + Math.floor(hash2(tx, ty, i + 30) * 15), y + Math.floor(hash2(tx, ty, i + 60) * 15), 2, 1);
    }
  },
  path(g, x, y, tx, ty, nb) {
    rect(g, PAL.path[0], x, y, 16, 16);
    for (let i = 0; i < 14; i++) {
      rect(g, hash2(tx, ty, i + 5) < 0.5 ? PAL.path[1] : PAL.path[2],
        x + Math.floor(hash2(tx, ty, i + 25) * 16), y + Math.floor(hash2(tx, ty, i + 45) * 16));
    }
    for (let i = 0; i < 2; i++) {
      rect(g, PAL.path[3], x + 2 + Math.floor(hash2(tx, ty, i + 70) * 12), y + 2 + Math.floor(hash2(tx, ty, i + 90) * 12), 2, 1);
    }
    // soft grass edge wherever the path meets something else
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let s = 0; s < 4; s++) {
      if (nb(sides[s][0], sides[s][1]) === G_PATH) continue;
      for (let k = 0; k < 16; k++) {
        if (hash2(tx * 4 + s, ty, k) > 0.55) continue;
        const len = hash2(tx, ty * 4 + s, k) < 0.35 ? 2 : 1;
        if (s === 0) rect(g, PAL.grass[0], x + k, y, 1, len);
        else if (s === 1) rect(g, PAL.grass[0], x + k, y + 16 - len, 1, len);
        else if (s === 2) rect(g, PAL.grass[0], x, y + k, len, 1);
        else rect(g, PAL.grass[0], x + 16 - len, y + k, len, 1);
      }
    }
  },
  water(g, x, y, tx, ty, nb) {
    const up = nb(0, -1) !== G_WATER, dn = nb(0, 1) !== G_WATER, lf = nb(-1, 0) !== G_WATER, rt = nb(1, 0) !== G_WATER;
    rect(g, PAL.water[0], x, y, 16, 16);
    rect(g, PAL.water[1], x + (lf ? 4 : 0), y + (up ? 4 : 0), 16 - (lf ? 4 : 0) - (rt ? 4 : 0), 16 - (up ? 4 : 0) - (dn ? 4 : 0));
    if (up) { rect(g, PAL.shore, x, y, 16, 2); rect(g, PAL.water[2], x, y + 2, 16, 1); }
    if (dn) { rect(g, PAL.shore, x, y + 14, 16, 2); rect(g, PAL.water[2], x, y + 13, 16, 1); }
    if (lf) { rect(g, PAL.shore, x, y, 2, 16); rect(g, PAL.water[2], x + 2, y + (up ? 2 : 0), 1, 16 - (up ? 2 : 0) - (dn ? 2 : 0)); }
    if (rt) { rect(g, PAL.shore, x + 14, y, 2, 16); rect(g, PAL.water[2], x + 13, y + (up ? 2 : 0), 1, 16 - (up ? 2 : 0) - (dn ? 2 : 0)); }
    if (!up && !dn && !lf && !rt && hash2(tx, ty, 900) < 0.5) { // lily pads
      const lx = x + 3 + Math.floor(hash2(tx, ty, 901) * 7), ly = y + 3 + Math.floor(hash2(tx, ty, 902) * 7);
      ellipse(g, '#2f7d3a', lx + 1, ly + 1, 3, 2);
      ellipse(g, '#4fa34a', lx, ly, 3, 2);
      rect(g, PAL.water[1], lx, ly - 2, 1, 2);
      if (hash2(tx, ty, 903) < 0.4) { rect(g, '#ff9fc2', lx - 1, ly - 1, 2, 2); rect(g, '#fff0f5', lx - 1, ly - 1); }
    }
  },
  soil(g, x, y, tx, ty, wet, nb) {
    const p = wet ? PAL.wet : PAL.soil;
    rect(g, p[0], x, y, 16, 16);
    for (let r = 4; r < 16; r += 4) {
      rect(g, p[2], x, y + r - 1, 16, 1);
      rect(g, p[1], x, y + r, 16, 1);
    }
    for (let i = 0; i < 5; i++) rect(g, p[2], x + Math.floor(hash2(tx, ty, i + 11) * 15), y + Math.floor(hash2(tx, ty, i + 31) * 15));
    if (!nb(0, -1)) rect(g, p[1], x, y, 16, 1);
    if (!nb(0, 1)) rect(g, p[1], x, y + 15, 16, 1);
    if (!nb(-1, 0)) rect(g, p[1], x, y, 1, 16);
    if (!nb(1, 0)) rect(g, p[1], x + 15, y, 1, 16);
  },
};

/* ---------- trees, bushes and buildings ---------- */
const LEAF_OAK = ['#1b4428', '#285e31', '#377d39', '#4f9c43', '#73bd52', '#a6dc74'];
const LEAF_PINE = ['#163d2a', '#215435', '#2e6d42', '#3f8a52', '#62ad6b'];

// One rounded cluster of leaves, shaded from dark (underside) to light (top-left).
function leafClump(g, cx, cy, r, ramp, rnd) {
  ellipse(g, ramp[0], cx, cy + 1, r, r - 1);
  ellipse(g, ramp[1], cx, cy, r - 1, r - 2);
  ellipse(g, ramp[2], cx - 1, cy - 1, r - 2, r - 3);
  if (r > 4) ellipse(g, ramp[3], cx - 2, cy - 2, r - 4, r - 4);
  if (r > 6) ellipse(g, ramp[4], cx - 3, cy - 3, r - 6, r - 6);
  for (let i = 0; i < r * 3; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * (r - 1);
    const px = Math.round(cx + Math.cos(a) * d), py = Math.round(cy + Math.sin(a) * d * 0.85);
    rect(g, py < cy - 1 ? ramp[3] : ramp[1], px, py, rnd() < 0.5 ? 2 : 1, 1);
  }
  for (let i = 0; i < r + 4; i++) {
    const a = rnd() * Math.PI * 2;
    rect(g, Math.sin(a) > 0 ? ramp[0] : ramp[2], Math.round(cx + Math.cos(a) * (r + 0.5)), Math.round(cy + Math.sin(a) * (r - 0.5)));
  }
}

const LEAF_BIRCH = ['#2a5a2a', '#3d7a34', '#5a9c3e', '#7dbb4f', '#a3d466', '#cdeb8c'];
const LEAF_BLOSSOM = ['#9c3d63', '#c2557e', '#e07aa0', '#f09cba', '#f8c2d4', '#fff0f5'];
const LEAF_CITRUS = ['#163f26', '#205a30', '#2f7a3a', '#449a46', '#66b85a', '#98d47a'];

function makeTrunk(birch) {
  const [mid, lit, dark] = birch ? ['#e8e4da', '#ffffff', '#b9b3a6'] : ['#5a3b23', '#7b5332', '#46301c'];
  return paint(36, 46, g => {
    rect(g, mid, 15, 24, 6, 20);
    rect(g, lit, 15, 24, 2, 20);
    rect(g, dark, 20, 24, 1, 20);
    for (let y = 27; y < 42; y += 3) rect(g, birch ? '#2b2724' : dark, 16 + (y % 3), y, birch ? 3 : 1, birch ? 1 : 2);
    rect(g, mid, 12, 41, 12, 3);
    rect(g, lit, 12, 41, 3, 1);
    rect(g, dark, 21, 42, 3, 2);
    rect(g, mid, 10, 43, 4, 1);
    rect(g, mid, 22, 43, 4, 1);
    rect(g, '#2e1f12', 15, 24, 6, 4);
  }, '#1f140b');
}

// A round, leafy canopy built from shaded clumps.
function roundCanopy(L, r) {
  const outline = L === LEAF_BLOSSOM ? '#5e2238' : '#123222';
  return paint(36, 34, g => {
    for (const [cx, cy, rad] of [[9, 20, 8], [27, 20, 8], [18, 24, 9]]) leafClump(g, cx, cy, rad, [L[0], L[0], L[1], L[2], L[3]], r);
    for (const [cx, cy, rad] of [[10, 13, 8], [26, 13, 8], [18, 16, 9]]) leafClump(g, cx, cy, rad, L, r);
    leafClump(g, 18, 8, 7, L.slice(1), r);
    for (let i = 0; i < 10; i++) rect(g, L[5], 9 + Math.floor(r() * 16), 3 + Math.floor(r() * 9));
  }, outline);
}

const FRUIT_SPOTS = [[8, 14], [24, 10], [27, 20], [12, 22], [19, 17], [15, 9], [22, 25], [5, 19], [30, 15]];

// Fruit hanging in a canopy: count 1..3 shows 3, 6 or 9 fruits.
function fruitLayer(c1, c2, count) {
  return paint(36, 34, g => {
    for (const [ax, ay] of FRUIT_SPOTS.slice(0, count * 3)) {
      rect(g, '#3f2a14', ax + 1, ay - 1);
      rect(g, c1, ax, ay, 3, 3);
      rect(g, c2, ax, ay);
    }
  }, false);
}

const FRUIT_COLORS = {
  apple: ['#d9342b', '#ff9a85', LEAF_OAK], orange: ['#f08c1a', '#ffc46b', LEAF_CITRUS], mango: ['#f2b233', '#e8752a', LEAF_CITRUS],
  peach: ['#f59a7e', '#ffd6c0', LEAF_OAK], lemon: ['#f2dc3c', '#fff7a8', LEAF_CITRUS],
};

function makeFruitTree(fruit) {
  const [c1, c2, L] = FRUIT_COLORS[fruit];
  const r = rng(fruit.length * 977 + fruit.charCodeAt(0));
  return {
    trunk: makeTrunk(false), canopy: roundCanopy(L, r), fruits: [null, 1, 2, 3].map(n => n && fruitLayer(c1, c2, n)),
    sapling: paint(16, 20, g => {
      rect(g, '#7b5332', 7, 9, 2, 10);
      rect(g, '#6e4426', 4, 18, 8, 2);
      for (const [x, y] of [[3, 5], [9, 3], [5, 9], [10, 8]]) { rect(g, L[3], x, y, 4, 3); rect(g, L[4], x, y, 2, 1); }
    }),
    young: paint(24, 30, g => {
      rect(g, '#5a3b23', 11, 16, 3, 13);
      rect(g, '#7b5332', 11, 16, 1, 13);
      leafClump(g, 12, 11, 8, L, r);
      leafClump(g, 9, 8, 4, L.slice(1), r);
      rect(g, c1, 6, 12, 2, 2);
    }),
  };
}

// Trees are a trunk and a canopy so the canopy can sway in the breeze.
// kind 0 oak, 1 apple, 2 pine, 3 birch, 4 blossom
function makeTreeParts(kind) {
  const r = rng(kind * 131 + 7);
  const trunk = makeTrunk(kind === 3);
  if (kind === 3) return { trunk, canopy: roundCanopy(LEAF_BIRCH, r) };
  if (kind === 4) return { trunk, canopy: roundCanopy(LEAF_BLOSSOM, r) };
  if (kind === 2) {
    const P = LEAF_PINE;
    const canopy = paint(36, 40, g => {
      for (const [top, hw, h] of [[3, 7, 9], [9, 10, 10], [16, 13, 11], [24, 16, 12]]) {
        for (let yy = 0; yy < h; yy++) {
          const w = Math.max(1, Math.round(hw * (yy + 1) / h));
          rect(g, P[1], 18 - w, top + yy, w * 2, 1);
          rect(g, P[2], 18 - w, top + yy, Math.max(1, Math.round(w * 1.1)), 1);
          rect(g, P[3], 18 - w, top + yy, Math.max(1, Math.round(w * 0.5)), 1);
          rect(g, P[0], 18 + w - 2, top + yy, 2, 1);
        }
        for (let k = -hw; k < hw - 1; k += 3) rect(g, k < 0 ? P[2] : P[0], 18 + k, top + h, 2, 1);
        for (let i = 0; i < hw; i++) rect(g, P[4], 18 - Math.floor(r() * hw), top + 2 + Math.floor(r() * (h - 2)));
      }
      rect(g, P[3], 17, 0, 2, 3);
      rect(g, P[4], 17, 0);
    }, '#0f2a1c');
    return { trunk, canopy };
  }
  return { trunk, canopy: roundCanopy(LEAF_OAK, r), fruit: kind === 1 ? fruitLayer('#d9342b', '#ff9a85', 2) : null };
}

function makeBush() {
  return paint(16, 16, g => {
    ellipse(g, PAL.leaf, 8, 9, 7, 5);
    ellipse(g, PAL.leafMid, 7, 8, 5, 3);
    rect(g, PAL.leafLight, 4, 6, 3, 1);
    for (const [x, y] of [[4, 10], [10, 7], [11, 11], [7, 12]]) rect(g, '#d94a6b', x, y);
  });
}

function makeHouse(night) {
  return paint(80, 84, g => {
    rect(g, '#e8c58f', 4, 40, 72, 40);
    for (let x = 4; x < 76; x += 6) rect(g, '#d1a970', x, 40, 1, 40);
    rect(g, '#b98d58', 4, 40, 72, 3);
    rect(g, PAL.stone, 4, 78, 72, 6);
    rect(g, PAL.stoneLight, 4, 78, 72, 1);
    for (let x = 6; x < 76; x += 7) rect(g, PAL.stoneDark, x, 79, 1, 5);
    for (const wx of [11, 57]) {
      rect(g, '#fbf1dc', wx - 1, 50, 14, 14);
      rect(g, night ? '#ffd970' : '#8fcff2', wx, 51, 12, 12);
      if (!night) rect(g, '#d6f0ff', wx + 1, 52, 4, 3);
      rect(g, '#fbf1dc', wx + 5, 51, 2, 12);
      rect(g, '#fbf1dc', wx, 56, 12, 2);
      rect(g, PAL.wood, wx - 2, 64, 16, 3);
      rect(g, PAL.leafMid, wx - 1, 63, 14, 1);
      for (let i = 0; i < 5; i++) rect(g, i % 2 ? '#ff7aa8' : '#ffd84a', wx - 1 + i * 3, 61, 2, 2);
    }
    rect(g, '#5e3a1f', 33, 57, 14, 27);
    rect(g, '#8f5d33', 34, 58, 12, 26);
    rect(g, '#a8743f', 34, 58, 12, 2);
    rect(g, '#74482a', 39, 60, 2, 24);
    rect(g, '#f2d36b', 43, 71, 2, 2);
    // roof
    rect(g, '#9e3b2f', 0, 4, 80, 40);
    for (let r = 0; r < 7; r++) {
      const yy = 8 + r * 5;
      rect(g, '#c4523f', 0, yy, 80, 4);
      rect(g, '#d8664f', 0, yy, 80, 1);
      for (let x = (r % 2) * 4; x < 80; x += 8) rect(g, '#a8432f', x, yy + 1, 1, 3);
    }
    rect(g, '#7f2f25', 0, 4, 80, 4);
    rect(g, '#8a3328', 0, 43, 80, 1);
    // chimney
    rect(g, '#a1503a', 60, 0, 9, 12);
    for (let yy = 3; yy < 12; yy += 4) rect(g, '#7f3a2a', 60, yy, 9, 1);
    rect(g, '#6e6b66', 59, 0, 11, 2);
  });
}

function makeShop() {
  return paint(64, 66, g => {
    rect(g, PAL.woodDark, 3, 20, 4, 46);
    rect(g, PAL.woodDark, 57, 20, 4, 46);
    rect(g, '#5b3d27', 7, 20, 50, 26);
    rect(g, PAL.woodLight, 7, 32, 50, 2);
    ['#e0457b', '#f08a24', '#5aa63f', '#f2cf3d'].forEach((c, n) => {
      const sx = 10 + n * 12;
      rect(g, '#e3d1a6', sx, 25, 8, 7);
      rect(g, '#c9b384', sx, 25, 8, 1);
      rect(g, c, sx + 2, 26, 4, 2);
    });
    // Wren, the seed seller
    rect(g, '#4a2f5c', 27, 33, 10, 4);
    rect(g, '#f6c9a0', 28, 35, 8, 6);
    rect(g, '#4a2f5c', 27, 35, 1, 4);
    rect(g, '#4a2f5c', 36, 35, 1, 4);
    rect(g, '#2b1d14', 30, 37);
    rect(g, '#2b1d14', 33, 37);
    rect(g, '#f19a86', 29, 39);
    rect(g, '#f19a86', 34, 39);
    rect(g, '#4f9e3f', 26, 41, 12, 5);
    rect(g, '#f2c94c', 31, 42, 2, 2);
    // counter
    rect(g, '#a86b3c', 1, 46, 62, 20);
    for (let x = 4; x < 62; x += 6) rect(g, '#8f5a31', x, 48, 1, 18);
    rect(g, '#d29a5e', 0, 44, 64, 4);
    rect(g, '#e3b07a', 0, 44, 64, 1);
    for (const [cx, col] of [[6, '#e8412c'], [46, '#f08a24']]) {
      rect(g, '#c48a4f', cx, 39, 12, 6);
      rect(g, '#9a6b3e', cx, 43, 12, 1);
      for (let k = 0; k < 4; k++) rect(g, col, cx + 1 + k * 3, 37 + (k % 2), 3, 3);
    }
    // striped awning with scalloped edge
    for (let i = 0; i < 8; i++) {
      const c = i % 2 ? '#fff3df' : '#e2574c';
      rect(g, c, i * 8, 8, 8, 12);
      ellipse(g, c, i * 8 + 4, 20, 3, 2);
    }
    rect(g, '#b83f35', 0, 6, 64, 3);
    rect(g, PAL.woodDark, 22, 0, 20, 8);
    rect(g, '#e9c98f', 23, 1, 18, 6);
    rect(g, PAL.leafMid, 31, 2, 2, 4);
    rect(g, PAL.leafLight, 28, 2, 3, 2);
    rect(g, PAL.leafLight, 33, 2, 3, 2);
  });
}

function makeBin() {
  return paint(16, 20, g => {
    rect(g, '#9a6b3e', 1, 6, 14, 14);
    for (let y = 9; y < 20; y += 4) rect(g, '#7d532d', 1, y, 14, 1);
    rect(g, '#7c7c7c', 1, 6, 2, 14);
    rect(g, '#7c7c7c', 13, 6, 2, 14);
    rect(g, '#b8864f', 0, 3, 16, 4);
    rect(g, '#d29a5e', 0, 3, 16, 1);
    rect(g, '#f2c94c', 6, 11, 4, 4);
    rect(g, '#e0a92c', 7, 12, 2, 2);
  });
}

function makeWell() {
  return paint(16, 28, g => {
    rect(g, PAL.woodDark, 2, 6, 2, 14);
    rect(g, PAL.woodDark, 12, 6, 2, 14);
    for (let y = 0; y < 7; y++) rect(g, '#b84a3a', 7 - y, y, 2 + y * 2, 1);
    rect(g, '#8e352d', 0, 6, 16, 1);
    rect(g, PAL.wood, 3, 9, 10, 1);
    rect(g, '#d8c9a0', 7, 10, 1, 3);
    rect(g, PAL.woodLight, 6, 13, 3, 3);
    ellipse(g, PAL.stone, 8, 21, 7, 5);
    ellipse(g, '#2c5a86', 8, 19, 5, 2);
    rect(g, PAL.stoneLight, 1, 21, 14, 1);
    for (const sx of [3, 7, 11]) rect(g, PAL.stoneDark, sx, 23, 1, 3);
  });
}

function makeCoop(night) {
  return paint(48, 58, g => {
    rect(g, '#b9473b', 2, 22, 44, 36);
    for (let x = 4; x < 46; x += 5) rect(g, '#9c3a30', x, 24, 1, 34);
    rect(g, '#f4ead6', 2, 22, 2, 36);
    rect(g, '#f4ead6', 44, 22, 2, 36);
    ellipse(g, '#f4ead6', 24, 30, 4, 4);
    ellipse(g, night ? '#ffd970' : '#3b2418', 24, 30, 3, 3);
    rect(g, '#f4ead6', 17, 39, 14, 19);
    rect(g, '#3b2418', 19, 41, 10, 17);
    rect(g, PAL.woodLight, 19, 55, 10, 3);
    for (let y = 0; y < 22; y++) {
      const inset = Math.max(0, 10 - Math.floor(y * 0.9));
      rect(g, y % 4 === 3 ? '#5a3b28' : '#7a5236', inset, y + 2, 48 - inset * 2, 1);
    }
    rect(g, '#4a3020', 10, 1, 28, 2);
  });
}

function makeSign() {
  return paint(16, 20, g => {
    rect(g, PAL.woodDark, 7, 10, 2, 10);
    rect(g, PAL.wood, 1, 2, 14, 10);
    rect(g, PAL.woodLight, 1, 2, 14, 1);
    rect(g, '#5b3a22', 3, 5, 10, 1);
    rect(g, '#5b3a22', 3, 8, 7, 1);
  });
}

function makeFence(mask) {
  return paint(16, 16, g => {
    if (mask & 1) { rect(g, PAL.woodLight, 0, 6, 7, 2); rect(g, PAL.woodLight, 0, 10, 7, 2); }
    if (mask & 2) { rect(g, PAL.woodLight, 9, 6, 7, 2); rect(g, PAL.woodLight, 9, 10, 7, 2); }
    if (mask & 4) rect(g, PAL.woodLight, 7, 0, 2, 4);
    if (mask & 8) rect(g, PAL.woodLight, 7, 13, 2, 3);
    rect(g, PAL.wood, 6, 3, 4, 11);
    rect(g, '#c48a4f', 6, 3, 4, 1);
    rect(g, PAL.woodDark, 9, 4, 1, 10);
  });
}

/* ---------- 5x7 pixel font for signs ---------- */
const FONT = {
  A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1e11111111111e', E: '1f10101e10101f',
  F: '1f10101e101010', G: '0e11101711110f', H: '1111111f111111', I: '0e04040404040e', J: '0702020202120c',
  K: '11121418141211', L: '1010101010101f', M: '111b1515111111', N: '11111915131111', O: '0e11111111110e',
  P: '1e11111e101010', Q: '0e11111115120d', R: '1e11111e141211', S: '0f10100e01011e', T: '1f040404040404',
  U: '1111111111110e', V: '11111111110a04', W: '1111111515150a', X: '11110a040a1111', Y: '1111110a040404',
  Z: '1f01020408101f', 0: '0e11131519110e', 1: '040c040404040e', 2: '0e11010204081f', 3: '1f02040201110e',
  4: '02060a121f0202', 5: '1f101e0101110e', 6: '0608101e11110e', 7: '1f010204080808', 8: '0e11110e11110e',
  9: '0e11110f01020c', "'": '04040800000000', '.': '000000000c0c00', ' ': '00000000000000',
};

const textWidth = s => s.length * 6 - 1;

function drawText(g, s, x, y, color, shadow) {
  for (let n = 0; n < s.length; n++) {
    const code = FONT[s[n]] || FONT[' '];
    for (let row = 0; row < 7; row++) {
      const bits = parseInt(code.substr(row * 2, 2), 16);
      for (let col = 0; col < 5; col++) {
        if (!(bits & (16 >> col))) continue;
        if (shadow) rect(g, shadow, x + n * 6 + col, y + row + 1);
        rect(g, color, x + n * 6 + col, y + row);
      }
    }
  }
}

// A wooden board on two posts with one or two lines of painted text.
function makeBoardSign(lines, w, opts = {}) {
  const lineH = 9, boardH = lines.length * lineH + 6, postH = opts.postH || 8;
  return paint(w, boardH + postH, g => {
    rect(g, PAL.woodDark, 4, boardH - 2, 3, postH + 2);
    rect(g, PAL.woodDark, w - 7, boardH - 2, 3, postH + 2);
    rect(g, opts.frame || '#5b3a22', 0, 0, w, boardH);
    rect(g, opts.board || '#8a5a32', 1, 1, w - 2, boardH - 2);
    rect(g, '#a8743f', 1, 1, w - 2, 1);
    for (let y = 4; y < boardH - 1; y += 4) rect(g, '#7a4c29', 1, y, w - 2, 1);
    lines.forEach((t, n) => drawText(g, t, Math.floor((w - textWidth(t)) / 2), 3 + n * lineH, opts.text || '#ffe08a', '#3a2616'));
    if (opts.flowers) {
      for (const fx of [1, 9, w - 11, w - 3]) {
        rect(g, PAL.leafMid, fx, boardH + postH - 3, 3, 3);
        rect(g, fx % 2 ? '#ff8fb3' : '#ffd84a', fx + 1, boardH + postH - 4);
      }
    }
  });
}

function makeFarmSign() { return makeBoardSign(["NAVDEEP'S", 'FARM'], 80, { postH: 10, flowers: true }); }
function makeAreaSign(name) { return makeBoardSign([name], 72, { postH: 6, board: '#9a6838', text: '#ffffff' }); }

function makeHiringBoard() {
  return paint(40, 34, g => {
    rect(g, PAL.woodDark, 5, 20, 3, 14);
    rect(g, PAL.woodDark, 32, 20, 3, 14);
    rect(g, '#5b3a22', 0, 0, 40, 24);
    rect(g, '#b07a45', 1, 1, 38, 22);
    drawText(g, 'HIRING', 2, 2, '#ffffff', '#3a2616');
    for (const [px, c] of [[4, '#fff4dc'], [15, '#d6f0ff'], [26, '#ffe08a']]) {
      rect(g, c, px, 11, 9, 10);
      rect(g, '#9a8a70', px + 1, 13, 7, 1);
      rect(g, '#9a8a70', px + 1, 16, 5, 1);
      rect(g, '#e2433a', px + 4, 11);
    }
  });
}

// Bambi's veggie stand, where customers come to buy.
function makeStand() {
  return paint(48, 46, g => {
    rect(g, PAL.woodDark, 2, 14, 3, 32);
    rect(g, PAL.woodDark, 43, 14, 3, 32);
    rect(g, '#5b3d27', 5, 14, 38, 16);
    for (let i = 0; i < 6; i++) {
      const c = i % 2 ? '#fff3df' : '#4f9e3f';
      rect(g, c, i * 8, 9, 8, 6);
      ellipse(g, c, i * 8 + 4, 15, 3, 2);
    }
    rect(g, '#2f6b2c', 0, 8, 48, 2);
    rect(g, '#5b3a22', 1, -1, 46, 11);
    rect(g, '#fff4dc', 2, 0, 44, 9);
    drawText(g, 'VEGGIES', 4, 1, '#2f6b2c');
    rect(g, '#a86b3c', 0, 30, 48, 16);
    for (let x = 3; x < 48; x += 6) rect(g, '#8f5a31', x, 32, 1, 14);
    rect(g, '#d29a5e', 0, 28, 48, 3);
    rect(g, '#e3b07a', 0, 28, 48, 1);
    const veg = [['#e0457b', '#f27aa5'], ['#f08a24', '#f8b066'], ['#e8412c', '#f47a62'], ['#f2cf3d', '#f8e27a']];
    veg.forEach(([c1, c2], n) => {
      const cx = 3 + n * 11;
      rect(g, '#c48a4f', cx, 23, 10, 6);
      rect(g, '#9a6b3e', cx, 27, 10, 1);
      for (let k = 0; k < 3; k++) { rect(g, c1, cx + 1 + k * 3, 21 + (k % 2), 3, 3); rect(g, c2, cx + 1 + k * 3, 21 + (k % 2)); }
    });
    rect(g, '#2b3a2f', 34, 34, 11, 8);
    rect(g, '#ffffff', 36, 36, 7, 1);
    rect(g, '#ffffff', 36, 38, 5, 1);
  });
}

function makeMailbox() {
  return paint(20, 26, g => {
    rect(g, PAL.woodDark, 9, 12, 2, 14);
    rect(g, '#2f5f9e', 3, 3, 14, 9);
    ellipse(g, '#2f5f9e', 10, 4, 7, 2);
    rect(g, '#4a7fc4', 4, 3, 12, 1);
    rect(g, '#1f4273', 3, 10, 14, 2);
    rect(g, '#e2433a', 16, 0, 2, 6);
    rect(g, '#e2433a', 16, 0, 3, 2);
    rect(g, '#fff4dc', 1, 15, 18, 9);
    drawText(g, '115', 2, 16, '#2b1d14');
  });
}

