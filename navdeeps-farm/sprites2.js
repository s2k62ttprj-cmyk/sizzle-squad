'use strict';
/* Navdeep's Farm - animals, pets, the barn, fruit, fish, dishes and their icons. */

const ANIMAL_LOOK = {
  cow: { body: '#f4f1ea', shade: '#d6d0c2', head: '#f4f1ea', snout: '#f2a7a0', leg: '#e8e2d4', hoof: '#3a302a', spots: '#2a2624', horns: '#e8dcc0', tail: '#2a2624', ear: '#2a2624' },
  sheep: { wool: '#f6f1e4', woolShade: '#ddd5c2', head: '#3a3036', snout: '#4a3f46', leg: '#3a3036', hoof: '#1f1a1d', tail: '#f6f1e4', ear: '#2a2226' },
  goat: { body: '#d9c6a5', shade: '#b8a17c', head: '#efe7d6', snout: '#d8c8b0', leg: '#c9b48e', hoof: '#4a3b2e', horns: '#8a7a66', tail: '#efe7d6', beard: '#efe7d6', ear: '#b8a17c' },
  pig: { body: '#f4adb9', shade: '#d98798', head: '#f4adb9', snout: '#e88a9c', leg: '#e99aa8', hoof: '#b86a7a', tail: '#d98798', ear: '#d98798', curly: true },
};

// Farm animal facing right, 22x16. frame 0/1 walk, 2 grazing.
function drawAnimal(g, type, f) {
  const o = ANIMAL_LOOK[type], graze = f === 2, step = f === 1;
  const small = type === 'pig' || type === 'goat';
  const legY = small ? 12 : 11, legH = small ? 3 : 4;
  [5, 8, 13, 16].forEach((lx, k) => {
    const off = step && k % 2 ? 1 : 0;
    rect(g, o.leg, lx + off, legY, 2, legH);
    rect(g, o.hoof, lx + off, legY + legH - 1, 2, 1);
  });
  if (o.curly) { rect(g, o.tail, 2, 5, 2, 1); rect(g, o.tail, 1, 4); rect(g, o.tail, 3, 3, 1, 2); }
  else { rect(g, o.tail, 2, 5, 1, 5); rect(g, type === 'cow' ? '#2a2624' : o.tail, 1, 9, 2, 2); }
  if (o.wool) {
    for (const [cx, cy, r] of [[7, 8, 4], [11, 6, 4], [15, 8, 4], [9, 10, 4], [14, 10, 4]]) ellipse(g, o.woolShade, cx, cy + 1, r, r - 1);
    for (const [cx, cy, r] of [[7, 7, 4], [11, 5, 4], [15, 7, 4], [10, 9, 3], [14, 9, 3]]) ellipse(g, o.wool, cx, cy, r - 1, r - 2);
    for (const [x, y] of [[6, 5], [10, 3], [14, 5]]) rect(g, '#ffffff', x, y, 2, 1);
  } else {
    ellipse(g, o.body, 11, 8, 8, 4);
    rect(g, o.shade, 5, 11, 12, 1);
    rect(g, o.shade, 17, 7, 1, 4);
    if (type === 'cow') { ellipse(g, o.spots, 8, 6, 3, 2); ellipse(g, o.spots, 14, 9, 2, 1); rect(g, o.spots, 5, 8, 2, 2); }
    if (type === 'goat') rect(g, '#efe7d6', 7, 5, 6, 2);
    rect(g, '#ffffff', 7, 5, 3, 1);
  }
  const hy = graze ? 6 : 2;
  rect(g, o.head, 17, hy, 4, 6);
  rect(g, o.head, 16, hy + 1, 1, 4);
  rect(g, o.ear, 16, hy, 2, 1);
  rect(g, '#1a1214', 19, hy + 2);
  rect(g, o.snout, 19, hy + 4, 3, 2);
  rect(g, '#5a3a32', 21, hy + 4);
  if (o.horns) { rect(g, o.horns, 17, hy - 1); rect(g, o.horns, 20, hy - 1); if (type === 'goat') rect(g, o.horns, 16, hy - 2); }
  if (o.beard && !graze) rect(g, o.beard, 19, hy + 6, 1, 2);
  if (type === 'pig') { rect(g, o.snout, 20, hy + 3, 2, 3); rect(g, '#b86a7a', 21, hy + 4); }
}

function drawDog(g, f) {
  const C = '#b06f3a', D = '#8a5226', L = '#d49a62';
  [2, 4, 8, 10].forEach((x, k) => rect(g, D, x + (f === 1 && k % 2 ? 1 : 0), 8, 1, 3));
  ellipse(g, C, 6, 6, 5, 2);
  rect(g, L, 3, 7, 6, 1);
  rect(g, C, 0, f === 1 ? 2 : 3, 1, 3);
  rect(g, C, 9, 1, 4, 5);
  rect(g, L, 11, 4, 3, 2);
  rect(g, '#1a1214', 13, 4);
  rect(g, '#1a1214', 11, 2);
  rect(g, D, 9, 1, 2, 4);
  rect(g, '#e2433a', 9, 6, 3, 1);
}

function drawCat(g, f) {
  const C = '#e8913a', S = '#c06a22', W = '#fff1de';
  if (f === 1) { // curled up asleep
    ellipse(g, C, 6, 7, 5, 2);
    rect(g, S, 3, 6, 1, 2); rect(g, S, 6, 5, 1, 2); rect(g, S, 9, 6, 1, 2);
    rect(g, C, 9, 4, 3, 3); rect(g, C, 9, 3); rect(g, C, 11, 3);
    rect(g, '#2b1d14', 10, 5, 2, 1);
    rect(g, W, 2, 8, 4, 1);
    return;
  }
  ellipse(g, C, 6, 7, 3, 3);
  rect(g, W, 5, 7, 2, 3);
  rect(g, S, 3, 6, 1, 2); rect(g, S, 8, 6, 1, 2);
  rect(g, C, 4, 1, 5, 4); rect(g, C, 4, 0); rect(g, C, 8, 0);
  rect(g, '#5cb83a', 5, 2); rect(g, '#5cb83a', 7, 2); rect(g, '#f19a86', 6, 3);
  rect(g, C, 9, 8, 2, 1); rect(g, C, 10, 6, 1, 2);
}

function drawDuck(g, f) {
  ellipse(g, '#f6f3ea', 4, 5, 4, 2);
  rect(g, '#ddd8ca', 1, 6, 7, 1);
  rect(g, '#f6f3ea', 0, 3, 1, 2);
  const hy = f === 1 ? 1 : 0;
  rect(g, '#2f7a4a', 6, hy, 3, 3);
  rect(g, '#f2a03a', 9, hy + 1);
  rect(g, '#1a1214', 7, hy + 1);
  rect(g, '#2f7a4a', 6, 3, 2, 1);
}

function makeBarn(night) {
  return paint(48, 62, g => {
    rect(g, '#b8402f', 2, 24, 44, 38);
    for (let x = 4; x < 46; x += 4) rect(g, '#9c3428', x, 26, 1, 36);
    rect(g, '#f4ead6', 2, 24, 2, 38);
    rect(g, '#f4ead6', 44, 24, 2, 38);
    rect(g, '#7a2a20', 14, 38, 20, 24);
    for (const [x0, x1] of [[15, 22], [25, 32]]) {
      for (let t = 0; t <= 22; t++) {
        rect(g, '#f4ead6', x0 + Math.round((t * (x1 - x0)) / 22), 39 + t);
        rect(g, '#f4ead6', x1 - Math.round((t * (x1 - x0)) / 22), 39 + t);
      }
    }
    rect(g, '#f4ead6', 13, 37, 22, 2);
    rect(g, '#f4ead6', 13, 37, 2, 25);
    rect(g, '#f4ead6', 33, 37, 2, 25);
    rect(g, '#f4ead6', 23, 39, 2, 23);
    rect(g, '#f4ead6', 19, 26, 10, 9);
    rect(g, night ? '#ffd970' : '#3b2418', 20, 27, 8, 7);
    if (!night) rect(g, '#e8c35a', 20, 32, 8, 2);
    for (let y = 0; y < 24; y++) {
      const inset = y < 10 ? Math.max(0, 14 - Math.floor(y * 1.4)) : Math.max(0, 2 - Math.floor((y - 10) / 5));
      rect(g, y % 4 === 3 ? '#4a3a34' : '#5e4a42', inset, y + 2, 48 - inset * 2, 1);
    }
    rect(g, '#3a2c26', 14, 1, 20, 2);
    rect(g, '#f4ead6', 0, 25, 48, 1);
  });
}

/* ---------- item icons (16x16) ---------- */
const bottle = cap => g => {
  rect(g, '#dfe8ee', 5, 4, 6, 11); rect(g, '#ffffff', 6, 6, 4, 8); rect(g, '#cfd8de', 9, 6, 1, 8); rect(g, cap, 5, 1, 6, 3);
};
const roundFruit = (c1, c2, rx = 5, ry = 5) => g => {
  ellipse(g, c1, 8, 9, rx, ry); rect(g, c2, 8 - rx + 2, 9 - ry + 2, 2, 2); rect(g, '#5b3a22', 8, 2, 1, 3); rect(g, '#5aa63f', 9, 2, 3, 2);
};
const fish = (c1, c2, extra) => g => {
  ellipse(g, c1, 7, 8, 6, 3); rect(g, c1, 13, 5, 2, 7); rect(g, c2, 3, 9, 7, 1); rect(g, '#1a1214', 3, 7); rect(g, c2, 6, 5, 4, 1);
  if (extra) extra(g);
};
const dish = foods => g => {
  ellipse(g, '#ffffff', 8, 11, 7, 3); ellipse(g, '#d9dde0', 8, 12, 6, 2);
  foods.forEach(([c, x, y]) => ellipse(g, c, x, y, 2, 1));
};

const EXTRA_ICONS = {
  milk: bottle('#3f72c8'),
  goatMilk: bottle('#5cb83a'),
  wool: g => { ellipse(g, '#f6f1e4', 8, 9, 6, 5); for (const y of [6, 9, 12]) rect(g, '#d8cfba', 4, y, 9, 1); rect(g, '#ffffff', 5, 5, 3, 1); },
  truffle: g => { ellipse(g, '#4a3022', 8, 9, 5, 4); ellipse(g, '#5e3e2c', 7, 8, 3, 2); for (const [x, y] of [[5, 10], [10, 8], [8, 12]]) rect(g, '#2e1c12', x, y); },
  apple: roundFruit('#d9342b', '#ff9a85'),
  orange: roundFruit('#f08c1a', '#ffc46b'),
  mango: g => { ellipse(g, '#f2b233', 8, 9, 4, 6); rect(g, '#e8752a', 9, 10, 3, 4); rect(g, '#fff0a0', 6, 5, 1, 3); rect(g, '#5aa63f', 8, 1, 3, 2); },
  peach: roundFruit('#f59a7e', '#ffd6c0'),
  lemon: roundFruit('#f2dc3c', '#fff7a8', 6, 4),
  sardine: fish('#9fb4c4', '#e6eef4'),
  carp: fish('#c48a3a', '#f2d29a'),
  catfish: fish('#6e6a62', '#a9a49a', g => { rect(g, '#3a3632', 0, 9, 2, 1); rect(g, '#3a3632', 0, 7, 2, 1); }),
  goldfish: fish('#f2b233', '#fff2b0', g => { rect(g, '#ffffff', 11, 2, 1, 3); rect(g, '#ffffff', 10, 3, 3, 1); }),
  fruitSalad: dish([['#d9342b', 6, 9], ['#f08c1a', 10, 9], ['#f59a7e', 8, 8]]),
  curry: dish([['#e8902a', 8, 10], ['#f2cf3d', 6, 9], ['#e8412c', 10, 9]]),
  fishFry: dish([['#d9a05a', 7, 10], ['#c48a3a', 10, 9], ['#f2dc3c', 5, 9]]),
  omelette: dish([['#f6d84a', 8, 10], ['#e8412c', 7, 9], ['#5aa63f', 10, 9]]),
  milkshake: g => { rect(g, '#e8f4fa', 5, 4, 6, 11); rect(g, '#f5a3c0', 6, 6, 4, 8); rect(g, '#ffffff', 5, 3, 6, 2); rect(g, '#e2433a', 9, 0, 1, 5); },
  mangoLassi: g => { rect(g, '#e8f4fa', 5, 4, 6, 11); rect(g, '#f6c23c', 6, 6, 4, 8); rect(g, '#ffffff', 5, 3, 6, 2); rect(g, '#5aa63f', 9, 0, 1, 5); },
  rod: g => { for (let k = 0; k < 12; k++) rect(g, k < 4 ? '#5b3a22' : '#a8743f', 2 + k, 14 - k); rect(g, '#dfe8ee', 14, 2, 1, 9); rect(g, '#e2433a', 13, 11, 3, 2); rect(g, '#ffffff', 13, 13, 3, 1); },
  axe: g => { for (let k = 0; k < 11; k++) rect(g, '#a8743f', 3 + k, 14 - k); rect(g, '#9aa3ad', 9, 1, 5, 5); rect(g, '#c9d0d6', 9, 1, 2, 2); },
  barn: g => { rect(g, '#b8402f', 2, 7, 12, 8); rect(g, '#5e4a42', 1, 3, 14, 4); rect(g, '#5e4a42', 4, 1, 8, 2); rect(g, '#f4ead6', 6, 10, 4, 5); },
  dog: g => drawDog(g, 0),
  fish: fish('#9fb4c4', '#e6eef4'),
};

function drawSaplingIcon(g, fruit) {
  const [c1, , L] = FRUIT_COLORS[fruit];
  rect(g, '#b8603a', 4, 11, 8, 5); rect(g, '#d97a4a', 4, 11, 8, 1);
  rect(g, '#7b5332', 7, 4, 2, 7);
  for (const [x, y] of [[3, 3], [9, 2], [5, 6], [10, 6]]) { rect(g, L[3], x, y, 4, 3); rect(g, L[4], x, y, 2, 1); }
  rect(g, c1, 10, 3, 2, 2);
}

function buildArt2() {
  Art.animals = {};
  for (const t of Object.keys(ANIMAL_LOOK)) {
    const right = [0, 1, 2].map(f => paint(22, 16, g => drawAnimal(g, t, f)));
    Art.animals[t] = [right.map(flipH), right];
  }
  const dogR = [0, 1].map(f => paint(14, 11, g => drawDog(g, f)));
  Art.dog = [dogR.map(flipH), dogR];
  Art.cat = [0, 1].map(f => paint(12, 10, g => drawCat(g, f)));
  const duckR = [0, 1].map(f => paint(10, 8, g => drawDuck(g, f)));
  Art.duck = [duckR.map(flipH), duckR];
  Art.bird = [0, 1].map(f => paint(7, 4, g => {
    rect(g, '#3a3640', 3, 1, 1, 2);
    if (f) { rect(g, '#3a3640', 0, 0, 3, 1); rect(g, '#3a3640', 4, 0, 3, 1); } else { rect(g, '#3a3640', 0, 2, 3, 1); rect(g, '#3a3640', 4, 2, 3, 1); }
  }, false));
  Art.struct.barn = makeBarn(false);
  Art.structNight.barn = makeBarn(true);
  Art.fruitTrees = {};
  for (const f of Object.keys(FRUIT_COLORS)) Art.fruitTrees[f] = makeFruitTree(f);
  for (const id of Object.keys(EXTRA_ICONS)) Art.produce[id] = paint(16, 16, EXTRA_ICONS[id]);
  Art.bobber = paint(4, 5, g => { rect(g, '#e2433a', 0, 0, 4, 2); rect(g, '#ffffff', 0, 2, 4, 2); rect(g, '#2b2b2b', 1, 4, 2, 1); });
  Art.exclaim = paint(5, 11, g => { rect(g, '#ffd84a', 1, 0, 3, 7); rect(g, '#ffd84a', 1, 8, 3, 3); });
}
