'use strict';
/* Navdeep's Farm - people, animals, crops, items and menu icons. */

// Chicken facing right. frame 0/1 walk, 2 peck.
function drawChicken(g, frame, ox = 0, oy = 0) {
  const W = '#fbfbf5', Wd = '#dedbd0';
  const peck = frame === 2, hy = peck ? 3 : 0;
  rect(g, W, ox + 1, oy + 2, 2, 3);
  ellipse(g, W, ox + 5, oy + 6, 4, 3);
  rect(g, Wd, ox + 2, oy + 8, 6, 1);
  rect(g, Wd, ox + 4, oy + 5, 3, 2);
  rect(g, W, ox + 7, oy + 1 + hy, 3, 4);
  rect(g, '#e8412c', ox + 8, oy + hy, 2, 1);
  rect(g, '#f2b134', ox + 10, oy + 3 + hy);
  rect(g, '#222222', ox + 8, oy + 2 + hy);
  if (!peck) rect(g, '#e8412c', ox + 9, oy + 5);
  const legs = frame === 1 ? [3, 7] : [4, 6];
  for (const lx of legs) rect(g, '#f2a33a', ox + lx, oy + 9, 1, 2);
}

const CROP_COL = {
  radish: ['#e0457b', '#f27aa5'],
  carrot: ['#f08a24', '#f8b066'],
  tomato: ['#e8412c', '#f47a62'],
  corn: ['#f2cf3d', '#f8e27a'],
  strawberry: ['#e8344a', '#f47285'],
  pumpkin: ['#f28c28', '#f8b25a'],
};

// 16x32 canvas: the crop's own tile is rows 16-31; tall plants reach into the tile above.
function drawCrop(g, t, stage) {
  const L = PAL;
  if (stage === 0) {
    rect(g, '#6e4426', 5, 26, 6, 2);
    rect(g, '#f0dfb0', 6, 25);
    rect(g, '#f0dfb0', 9, 26);
    rect(g, '#f0dfb0', 7, 27);
    return;
  }
  if (stage === 1) {
    rect(g, L.leafMid, 7, 22, 2, 6);
    rect(g, L.leafLight, 4, 21, 3, 2);
    rect(g, L.leafLight, 9, 20, 3, 2);
    return;
  }
  const ripe = stage === 3, [c1, c2] = CROP_COL[t];
  if (t === 'radish' || t === 'carrot') {
    const dark = t === 'carrot' ? L.leafDark : L.leaf, light = t === 'carrot' ? L.leafMid : L.leafLight;
    const top = ripe ? 13 : 17;
    rect(g, dark, 7, top + 2, 2, 26 - top);
    rect(g, light, 4, top + 3, 2, 22 - top);
    rect(g, light, 10, top + 3, 2, 22 - top);
    rect(g, dark, 2, top + 6, 2, 19 - top);
    rect(g, dark, 12, top + 6, 2, 19 - top);
    rect(g, light, 6, top, 1, 6);
    rect(g, light, 9, top, 1, 6);
    if (ripe && t === 'radish') { rect(g, c1, 5, 25, 6, 4); rect(g, c2, 6, 25, 2, 2); rect(g, '#f9e6ee', 7, 29, 2, 1); }
    if (ripe && t === 'carrot') { rect(g, c1, 5, 25, 6, 3); rect(g, c2, 6, 25, 2, 1); rect(g, '#d8701a', 7, 27, 2, 1); }
  } else if (t === 'tomato') {
    const top = ripe ? 6 : 12;
    rect(g, L.woodLight, 7, top, 1, 31 - top);
    for (let y = top + 3; y < 29; y += 3) {
      const w = 3 + (y % 3);
      rect(g, L.leaf, 7 - w, y, w, 2);
      rect(g, L.leafMid, 8, y + 1, w, 2);
    }
    if (ripe) for (const [x, y] of [[3, 13], [10, 16], [4, 21], [10, 24]]) { rect(g, c1, x, y, 3, 3); rect(g, c2, x, y); }
    else for (const [x, y] of [[4, 22], [10, 24]]) rect(g, '#9fd36b', x, y, 2, 2);
  } else if (t === 'corn') {
    const top = ripe ? 2 : 10;
    rect(g, L.leafMid, 7, top, 2, 30 - top);
    for (let y = top + 3; y < 27; y += 5) {
      rect(g, L.leafLight, 3, y, 4, 1);
      rect(g, L.leafLight, 2, y + 1, 2, 1);
      rect(g, L.leaf, 9, y + 2, 4, 1);
      rect(g, L.leaf, 13, y + 3, 2, 1);
    }
    if (ripe) {
      rect(g, '#e8c27a', 6, 0, 4, 2);
      rect(g, c1, 9, 11, 3, 7);
      rect(g, c2, 9, 11, 1, 6);
      rect(g, L.leafLight, 9, 16, 4, 3);
    } else rect(g, '#e8c27a', 7, top - 1, 2, 1);
  } else if (t === 'strawberry') {
    for (const [x, y] of [[5, 25], [11, 25], [8, 22]]) { ellipse(g, L.leaf, x, y, 3, 2); rect(g, L.leafLight, x - 1, y - 1, 2, 1); }
    if (ripe) for (const [x, y] of [[3, 26], [8, 27], [12, 23], [6, 20]]) { rect(g, c1, x, y, 3, 3); rect(g, '#f6e27a', x + 1, y + 1); rect(g, L.leafLight, x + 1, y - 1); }
    else for (const [x, y] of [[4, 23], [10, 21]]) { rect(g, '#ffffff', x, y, 2, 2); rect(g, '#f2c94c', x, y); }
  } else if (t === 'pumpkin') {
    rect(g, L.leafMid, 1, 27, 14, 1);
    ellipse(g, L.leaf, 4, 23, 3, 2);
    ellipse(g, L.leaf, 12, 22, 3, 2);
    rect(g, L.leafLight, 3, 22, 2, 1);
    rect(g, L.leafLight, 11, 21, 2, 1);
    if (ripe) {
      ellipse(g, c1, 8, 25, 6, 4);
      for (const x of [5, 8, 11]) rect(g, '#d06f17', x, 22, 1, 7);
      rect(g, c2, 4, 23, 2, 2);
      rect(g, '#5b7a2a', 8, 19, 2, 3);
    } else {
      ellipse(g, '#8cc152', 8, 26, 3, 2);
      rect(g, '#5b7a2a', 8, 23, 1, 2);
    }
  }
}

// 16x16 produce and food icons (also lifted over the farmer's head when harvested).
function drawProduce(g, id) {
  const L = PAL;
  switch (id) {
    case 'radish':
      ellipse(g, '#e0457b', 8, 10, 4, 4); rect(g, '#f27aa5', 6, 8, 2, 2); rect(g, '#f9e6ee', 8, 14, 1, 2);
      rect(g, L.leafMid, 6, 2, 1, 4); rect(g, L.leafLight, 8, 1, 1, 5); rect(g, L.leaf, 10, 3, 1, 3);
      break;
    case 'carrot':
      for (let y = 5; y < 16; y++) { const w = Math.max(0, Math.round((15 - y) / 2.4)); rect(g, '#f08a24', 8 - w, y, w * 2 + 1, 1); }
      rect(g, '#f8b066', 6, 6, 1, 3); rect(g, '#d8701a', 8, 8, 2, 1); rect(g, '#d8701a', 7, 11, 2, 1);
      rect(g, L.leafMid, 6, 1, 1, 4); rect(g, L.leafLight, 8, 0, 1, 5); rect(g, L.leaf, 10, 2, 1, 3);
      break;
    case 'tomato':
      ellipse(g, '#e8412c', 8, 9, 5, 5); rect(g, '#f47a62', 5, 6, 2, 2);
      rect(g, L.leafMid, 6, 3, 5, 1); rect(g, L.leafMid, 8, 2, 1, 3);
      break;
    case 'corn':
      ellipse(g, '#f2cf3d', 8, 8, 3, 6);
      for (let y = 4; y < 13; y += 2) rect(g, '#e0b52c', 7, y, 3, 1);
      rect(g, L.leafLight, 4, 8, 2, 7); rect(g, L.leafMid, 11, 8, 2, 7); rect(g, L.leaf, 6, 13, 5, 2);
      break;
    case 'strawberry':
      for (let y = 5; y < 15; y++) { const w = Math.round(5 * (1 - Math.pow((y - 5) / 10, 1.6))); rect(g, '#e8344a', 8 - w, y, w * 2 + 1, 1); }
      for (const [x, y] of [[6, 7], [9, 8], [7, 10], [10, 11], [5, 9], [8, 12]]) rect(g, '#f6e27a', x, y);
      rect(g, L.leafMid, 5, 4, 7, 1); rect(g, L.leafLight, 8, 2, 1, 3);
      break;
    case 'pumpkin':
      ellipse(g, '#f28c28', 8, 10, 6, 5);
      for (const x of [5, 8, 11]) rect(g, '#d06f17', x, 6, 1, 9);
      rect(g, '#f8b25a', 3, 8, 2, 2); rect(g, '#5b7a2a', 8, 3, 2, 3);
      break;
    case 'egg':
      ellipse(g, '#f6efe0', 8, 9, 4, 5); rect(g, '#e2d6bf', 10, 10, 2, 3); rect(g, '#ffffff', 6, 6, 1, 2);
      break;
    case 'bigEgg':
      ellipse(g, '#f3d9a0', 8, 9, 5, 6); rect(g, '#dcb978', 11, 10, 2, 4); rect(g, '#fff6dc', 5, 5, 2, 2);
      rect(g, '#ffffff', 13, 1, 1, 3); rect(g, '#ffffff', 12, 2, 3, 1);
      break;
    case 'muffin':
      rect(g, '#d98a4a', 4, 9, 9, 6);
      for (let x = 5; x < 13; x += 2) rect(g, '#b86b30', x, 9, 1, 6);
      ellipse(g, '#c98a52', 8, 7, 5, 3);
      for (const [x, y] of [[6, 6], [9, 5], [10, 8], [7, 8]]) rect(g, '#6b3fa0', x, y);
      break;
  }
}

function drawDebris(g, kind) {
  const L = PAL;
  if (kind === 1) {
    rect(g, L.leaf, 4, 8, 1, 6); rect(g, L.leafMid, 5, 6, 1, 8); rect(g, L.leafDark, 7, 9, 1, 5);
    rect(g, L.leafMid, 8, 5, 1, 9); rect(g, L.leaf, 10, 7, 1, 7); rect(g, L.leafLight, 11, 9, 1, 5);
    rect(g, L.leaf, 5, 11, 6, 3); rect(g, '#ffd84a', 8, 4);
  } else if (kind === 2) {
    ellipse(g, L.stone, 8, 10, 6, 4); ellipse(g, L.stoneLight, 7, 9, 4, 2);
    rect(g, '#cfccc6', 5, 8, 2, 1); rect(g, L.stoneDark, 3, 13, 10, 1); rect(g, L.stoneDark, 9, 9, 1, 2);
  } else {
    rect(g, L.woodDark, 3, 8, 10, 6); rect(g, '#583420', 5, 9, 1, 5); rect(g, '#583420', 9, 9, 1, 5);
    rect(g, L.woodDark, 2, 12, 2, 2); rect(g, L.woodDark, 12, 12, 2, 2);
    ellipse(g, '#c4935c', 8, 8, 5, 2); ellipse(g, '#a87a47', 8, 8, 3, 1); rect(g, L.wood, 8, 8);
  }
}

function drawSprinkler(g, ox = 0, oy = 0) {
  rect(g, '#5f6670', ox + 4, oy + 12, 8, 2);
  rect(g, '#8a929c', ox + 6, oy + 8, 4, 5);
  rect(g, '#aab3bd', ox + 6, oy + 8, 4, 1);
  rect(g, '#4aa3e0', ox + 7, oy + 6, 2, 2);
  rect(g, '#9fd6f5', ox + 7, oy + 6);
}

function drawCan(g, ox = 0, oy = 0) {
  rect(g, '#2c7a8c', ox + 4, oy + 3, 6, 1); rect(g, '#2c7a8c', ox + 3, oy + 4, 1, 2); rect(g, '#2c7a8c', ox + 10, oy + 4, 1, 2);
  rect(g, '#3f9fb5', ox + 3, oy + 6, 8, 7); rect(g, '#7fd0e0', ox + 4, oy + 7, 2, 4);
  rect(g, '#3f9fb5', ox + 11, oy + 8, 2, 1); rect(g, '#3f9fb5', ox + 12, oy + 7, 2, 1); rect(g, '#2c7a8c', ox + 13, oy + 5, 2, 2);
}

// Menu and HUD icons, 16x16.
function drawIcon(g, name) {
  switch (name) {
    case 'coin': ellipse(g, '#f2c94c', 8, 8, 6, 6); ellipse(g, '#e0a92c', 8, 8, 4, 4); rect(g, '#f2c94c', 7, 5, 2, 6); rect(g, '#fff2b0', 5, 4, 2, 2); break;
    case 'bolt':
      for (const [x, y, w] of [[8, 1, 3], [7, 3, 3], [6, 5, 3], [5, 7, 7], [8, 9, 3], [7, 11, 3], [6, 13, 3]]) rect(g, '#ffd84a', x, y, w, 2);
      rect(g, '#fff2b0', 8, 2, 1, 3); break;
    case 'drop':
      for (const [x, y, w, h] of [[7, 2, 2, 2], [6, 4, 4, 2], [5, 6, 6, 2], [4, 8, 8, 4], [5, 12, 6, 2], [6, 14, 4, 1]]) rect(g, '#4aa3e0', x, y, w, h);
      rect(g, '#bfe6ff', 6, 9, 1, 2); break;
    case 'sun':
      ellipse(g, '#ffd84a', 8, 8, 4, 4); rect(g, '#fff2b0', 6, 6, 2, 2);
      for (const [x, y] of [[7, 0], [7, 14], [0, 7], [14, 7], [2, 2], [12, 2], [2, 12], [12, 12]]) rect(g, '#f2a93b', x, y, 2, 2);
      break;
    case 'rain':
      ellipse(g, '#e8eef5', 6, 6, 4, 3); ellipse(g, '#e8eef5', 10, 5, 4, 4); rect(g, '#e8eef5', 3, 6, 11, 4); rect(g, '#c5d0dc', 3, 9, 11, 1);
      for (const [x, y] of [[4, 12], [8, 13], [12, 12]]) rect(g, '#5aa9e8', x, y, 1, 2);
      break;
    case 'moon':
      ellipse(g, '#f6e27a', 8, 8, 6, 6);
      g.globalCompositeOperation = 'destination-out'; ellipse(g, '#000', 11, 6, 5, 5); g.globalCompositeOperation = 'source-over';
      break;
    case 'can': drawCan(g, 0, 1); break;
    case 'sprinkler': drawSprinkler(g, 0, 0); break;
    case 'chicken': drawChicken(g, 0, 2, 3); break;
    case 'play': for (let y = 3; y < 14; y++) { const w = 7 - Math.abs(8 - y); rect(g, '#5cb83a', 5, y, Math.max(1, w + 1), 1); } break;
    case 'bag':
      ellipse(g, '#b07a45', 8, 10, 5, 5); rect(g, '#9a6838', 6, 3, 4, 3); rect(g, '#e9c98f', 6, 5, 4, 1); rect(g, '#c99560', 5, 8, 2, 3); break;
    case 'book':
      rect(g, '#5d3a7a', 3, 2, 10, 12); rect(g, '#8a5ab8', 4, 2, 9, 11); rect(g, '#fbf1dc', 4, 13, 9, 1); rect(g, '#f2c94c', 7, 5, 3, 3); break;
    case 'help':
      ellipse(g, '#3f94d9', 8, 8, 6, 6);
      for (const [x, y, w, h] of [[6, 4, 4, 1], [9, 5, 1, 2], [8, 7, 1, 1], [7, 8, 1, 2], [7, 11, 1, 1]]) rect(g, '#ffffff', x, y, w, h);
      break;
    case 'gear':
      for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7], [3, 3], [11, 3], [3, 11], [11, 11]]) rect(g, '#9aa3ad', x, y, 2, 2);
      ellipse(g, '#9aa3ad', 8, 8, 5, 5); ellipse(g, '#5f6670', 8, 8, 2, 2); break;
    case 'door':
      rect(g, '#5e3a1f', 4, 1, 9, 15); rect(g, '#8f5d33', 5, 2, 7, 14); rect(g, '#f2d36b', 10, 9); break;
    case 'check':
      for (const [x, y] of [[2, 8], [4, 10], [6, 12], [8, 10], [10, 8], [12, 6], [13, 4]]) rect(g, '#5cb83a', x, y, 2, 2);
      break;
    case 'star':
      for (const [y, x0, x1] of [[2, 7, 8], [3, 7, 8], [4, 6, 9], [5, 1, 14], [6, 2, 13], [7, 3, 12], [8, 4, 11], [9, 4, 11], [10, 3, 6], [10, 9, 12], [11, 2, 5], [11, 10, 13], [12, 2, 3], [12, 12, 13]]) rect(g, '#ffd84a', x0, y, x1 - x0 + 1, 1);
      break;
    case 'lock':
      rect(g, '#8e8b86', 5, 2, 6, 1); rect(g, '#8e8b86', 4, 3, 1, 4); rect(g, '#8e8b86', 11, 3, 1, 4);
      rect(g, '#c9a043', 3, 7, 10, 8); rect(g, '#5b3a22', 7, 9, 2, 3); break;
    case 'golu': drawPerson(g, 0, 0, GOLU_LOOK); break;
    case 'happy':
    case 'grumpy': {
      const happy = name === 'happy';
      ellipse(g, happy ? '#ffd84a' : '#ff9d6b', 8, 8, 7, 7);
      rect(g, happy ? '#fff2b0' : '#ffc4a0', 4, 4, 3, 2);
      rect(g, EYE, 5, 6, 2, 2); rect(g, EYE, 10, 6, 2, 2);
      if (happy) { rect(g, EYE, 4, 10, 1, 1); rect(g, EYE, 5, 11, 6, 1); rect(g, EYE, 11, 10, 1, 1); }
      else { rect(g, EYE, 5, 11, 6, 1); rect(g, EYE, 4, 12, 1, 1); rect(g, EYE, 11, 12, 1, 1); rect(g, EYE, 4, 5, 2, 1); rect(g, EYE, 11, 5, 2, 1); }
      break;
    }
    case 'car':
      rect(g, '#15171c', 1, 6, 14, 7); rect(g, '#23262e', 4, 3, 8, 4); rect(g, '#4c6378', 5, 4, 3, 2); rect(g, '#4c6378', 9, 4, 2, 2);
      rect(g, '#0b0b0d', 2, 12, 3, 3); rect(g, '#0b0b0d', 11, 12, 3, 3); rect(g, '#e8f1ff', 13, 8, 2, 2); rect(g, '#b3262a', 1, 8, 1, 2);
      break;
    case 'hire':
      rect(g, '#b07a45', 2, 1, 12, 14); rect(g, '#fff4dc', 3, 3, 10, 11); rect(g, '#9a9aa0', 5, 0, 6, 3);
      rect(g, '#5cb83a', 4, 5, 2, 2); rect(g, '#9a8a70', 7, 5, 5, 1); rect(g, '#5cb83a', 4, 9, 2, 2); rect(g, '#9a8a70', 7, 9, 5, 1);
      break;
    case 'stand':
      for (let i = 0; i < 4; i++) rect(g, i % 2 ? '#fff3df' : '#4f9e3f', i * 4, 2, 4, 5);
      rect(g, '#a86b3c', 1, 9, 14, 6); rect(g, '#e8412c', 3, 7, 3, 3); rect(g, '#f08a24', 7, 7, 3, 3); rect(g, '#f2cf3d', 11, 7, 3, 3);
      break;
    case 'shop':
      for (let i = 0; i < 4; i++) rect(g, i % 2 ? '#fff3df' : '#e2574c', 1 + i * 4, 2, 4, 5);
      rect(g, '#b83f35', 1, 1, 16, 1); rect(g, '#a86b3c', 2, 9, 12, 6); rect(g, '#d29a5e', 1, 8, 14, 2); break;
  }
}

function drawPacket(g, t) {
  const [c1, c2] = CROP_COL[t];
  rect(g, '#b08b5a', 2, 1, 12, 15);
  rect(g, '#f3e3c0', 3, 2, 10, 13);
  rect(g, '#e2cf9f', 3, 2, 10, 2);
  ellipse(g, c1, 8, 10, 3, 3);
  rect(g, c2, 7, 9);
  rect(g, PAL.leafMid, 8, 5, 1, 3);
  rect(g, PAL.leafLight, 9, 5, 2, 1);
}

/* ---------- build every sprite once at start-up ---------- */
const Art = {};
const PRODUCE_IDS = ['radish', 'carrot', 'tomato', 'corn', 'strawberry', 'pumpkin', 'egg', 'bigEgg', 'muffin'];

function buildArt() {
  Art.trees = [0, 1, 2, 3, 4].map(makeTreeParts);
  Art.bush = makeBush();
  Art.struct = {
    house: makeHouse(false), shop: makeShop(), bin: makeBin(), well: makeWell(), coop: makeCoop(false), sign: makeSign(),
    stand: makeStand(), board: makeHiringBoard(), farmsign: makeFarmSign(), mailbox: makeMailbox(),
    gurisign: makeAreaSign('GURI FARM'), yashsign: makeAreaSign('KIRAN FARM'),
  };
  Art.structNight = { house: makeHouse(true), coop: makeCoop(true) };
  Art.fence = [];
  for (let m = 0; m < 16; m++) Art.fence.push(makeFence(m));
  Art.player = personSprites(GOLU_LOOK);
  Art.miniCan = paint(9, 7, g => {
    rect(g, '#3f9fb5', 1, 2, 5, 5); rect(g, '#7fd0e0', 2, 3, 1, 2); rect(g, '#2c7a8c', 2, 0, 3, 1);
    rect(g, '#3f9fb5', 6, 3, 2, 1); rect(g, '#2c7a8c', 7, 2, 2, 1);
  });
  Art.basket = paint(9, 7, g => {
    rect(g, '#b07a45', 0, 2, 9, 5); rect(g, '#8a5a32', 0, 4, 9, 1); rect(g, '#e8412c', 1, 1, 2, 2); rect(g, '#f08a24', 4, 0, 2, 2); rect(g, '#5aa63f', 6, 1, 2, 2);
  });
  Art.shadowTree = paint(27, 9, g => ellipse(g, 'rgba(0,0,0,0.22)', 13, 4, 13, 4), false);
  const right = [0, 1, 2].map(f => paint(12, 11, g => drawChicken(g, f)));
  Art.chicken = [right.map(flipH), right];
  Art.crops = {};
  for (const t of Object.keys(CROP_COL)) Art.crops[t] = [0, 1, 2, 3].map(s => paint(16, 32, g => drawCrop(g, t, s)));
  Art.debris = [null, 1, 2, 3].map(k => k && paint(16, 16, g => drawDebris(g, k)));
  Art.sprinkler = paint(16, 16, g => drawSprinkler(g));
  Art.eggs = [null, paint(8, 8, g => { ellipse(g, '#f6efe0', 4, 4, 2, 3); rect(g, '#e2d6bf', 5, 5, 1, 2); }),
    paint(8, 8, g => { ellipse(g, '#f3d9a0', 4, 4, 3, 3); rect(g, '#dcb978', 6, 4, 1, 3); rect(g, '#fff6dc', 2, 2); })];
  Art.produce = {};
  for (const id of PRODUCE_IDS) Art.produce[id] = paint(16, 16, g => drawProduce(g, id));
  Art.hoe = paint(10, 10, g => {
    for (let k = 0; k < 7; k++) rect(g, PAL.woodLight, 1 + k, 9 - k);
    rect(g, '#9aa3ad', 6, 0, 4, 2); rect(g, '#9aa3ad', 8, 2, 2, 2);
  });
  Art.can = paint(16, 14, g => drawCan(g, 0, 0));
  Art.heart = paint(5, 4, g => { rect(g, '#ff6f91', 0, 0, 2, 2); rect(g, '#ff6f91', 3, 0, 2, 2); rect(g, '#ff6f91', 0, 1, 5, 1); rect(g, '#ff6f91', 1, 2, 3, 1); rect(g, '#ff6f91', 2, 3); }, false);
  Art.shadowSmall = paint(11, 5, g => ellipse(g, 'rgba(0,0,0,0.2)', 5, 2, 5, 2), false);
  Art.shadowBig = paint(21, 7, g => ellipse(g, 'rgba(0,0,0,0.2)', 10, 3, 10, 3), false);
  buildArt2();
}

const iconCache = {};
function icon(name) {
  if (iconCache[name]) return iconCache[name];
  const animal = !!ANIMAL_LOOK[name];
  const c = paint(animal ? 24 : 16, animal ? 24 : 16, g => {
    if (name.startsWith('seed:')) drawPacket(g, name.slice(5));
    else if (name.startsWith('sapling:')) drawSaplingIcon(g, name.slice(8));
    else if (animal) { g.translate(1, 4); drawAnimal(g, name, 0); }
    else if (PRODUCE_IDS.includes(name)) drawProduce(g, name);
    else if (EXTRA_ICONS[name]) EXTRA_ICONS[name](g);
    else drawIcon(g, name);
  });
  iconCache[name] = c.hd.toDataURL();
  return iconCache[name];
}

/* ---------- people: Bambi, the managers and the customers ---------- */
const EYE = '#1a1214', MOUTH = '#7a2e24';

const GOLU_LOOK = {
  id: 'golu', skin: '#c68857', skinShade: '#a56a40', blush: '#d9785a',
  hair: '#1c1a20', hairLight: '#3d3846', style: 'short',
  shirt: '#e8553e', shirtShade: '#b93e2d', shirtLight: '#f47e62', logo: '#ffd84a',
  pants: '#3c5a9a', pantsShade: '#2c4374', belt: '#4a2f1c', shoes: '#f4f4f4', shoesShade: '#bdbdbd',
};

function drawHair(g, L, view, y) {
  const H = L.hair, HL = L.hairLight;
  if (L.style === 'hat') {
    if (view !== 'back') rect(g, H, view === 'side' ? 9 : 3, 5 + y, view === 'side' ? 3 : 10, 2);
    else rect(g, H, 3, 4 + y, 10, 6);
    rect(g, '#f2c862', 5, y, 6, 3);
    rect(g, '#f8dc8c', 6, y, 3, 1);
    rect(g, '#d9534f', 5, 2 + y, 6, 1);
    rect(g, '#f2c862', view === 'side' ? 0 : 1, 3 + y, 14, 2);
    rect(g, '#d9a73f', view === 'side' ? 0 : 1, 4 + y, 14, 1);
    return;
  }
  if (L.style === 'cap') {
    if (view === 'back') rect(g, H, 3, 4 + y, 10, 6);
    else if (view === 'side') rect(g, H, 10, 4 + y, 2, 4);
    else { rect(g, H, 3, 5 + y, 1, 2); rect(g, H, 12, 5 + y, 1, 2); }
    rect(g, L.cap, view === 'side' ? 4 : 3, 1 + y, view === 'side' ? 8 : 10, 4);
    rect(g, '#ffffff', 7, 2 + y, 2, 1);
    if (view === 'front') rect(g, L.capShade, 3, 5 + y, 10, 1);
    if (view === 'side') rect(g, L.capShade, 1, 4 + y, 4, 1);
    if (view !== 'back') { rect(g, H, view === 'side' ? 4 : 5, 6 + y, 2, 1); if (view === 'front') rect(g, H, 9, 6 + y, 2, 1); }
    return;
  }
  const long = L.style === 'long' || L.style === 'bun';
  if (view === 'front') {
    rect(g, H, 4, 1 + y, 8, 4);
    rect(g, H, 3, 2 + y, 10, 3);
    rect(g, H, 3, 5 + y, 1, 2);
    rect(g, H, 12, 5 + y, 1, 2);
    if (long) { rect(g, H, 4, 5 + y, 8, 1); rect(g, H, 2, 3 + y, 2, 9); rect(g, H, 12, 3 + y, 2, 9); }
    else { rect(g, H, 4, 5 + y, 3, 1); rect(g, H, 10, 5 + y, 2, 1); }
    rect(g, HL, 5, 2 + y, 3, 1);
    rect(g, HL, 9, 3 + y, 2, 1);
    rect(g, H, 5, 6 + y, 2, 1);
    rect(g, H, 9, 6 + y, 2, 1);
  } else if (view === 'back') {
    rect(g, H, 3, 1 + y, 10, 9);
    rect(g, H, 4, y + 1, 8, 1);
    if (long) rect(g, H, 2, 3 + y, 12, 10);
    rect(g, HL, 5, 2 + y, 4, 1);
    rect(g, HL, 4, 4 + y, 2, 1);
  } else {
    rect(g, H, 4, 1 + y, 8, 4);
    rect(g, H, 10, 3 + y, 3, 6);
    rect(g, H, 3, 4 + y, 3, 1);
    if (long) rect(g, H, 9, 4 + y, 4, 8);
    rect(g, HL, 5, 2 + y, 3, 1);
    rect(g, H, 4, 6 + y, 2, 1);
  }
  if (L.style === 'bun') { rect(g, H, 6, y, 4, 2); rect(g, HL, 7, y, 1, 1); }
  else if (view !== 'back') rect(g, H, 6, y, 2, 1); // cowlick
}

// dir 0 down, 1 up, 2 left (right is mirrored); step 1 and 3 are strides. 16x24 canvas.
function drawPerson(g, dir, step, L) {
  const oy = step === 1 || step === 3 ? 1 : 0; // the body dips on each stride
  if (dir === 2) {
    const a = step === 1 ? -1 : step === 3 ? 1 : 0;
    rect(g, L.pantsShade, 8 - a, 18, 3, 3);
    rect(g, L.shoesShade, 8 - a, 21, 4, 2);
    rect(g, L.pants, 6 + a, 18, 3, 3);
    rect(g, L.shoes, 5 + a, 21, 4, 2);
    rect(g, L.shoesShade, 5 + a, 22, 4, 1);
    rect(g, L.shirt, 5, 12 + oy, 6, 6);
    rect(g, L.shirtLight, 5, 12 + oy, 1, 5);
    rect(g, L.shirtShade, 10, 12 + oy, 1, 6);
    rect(g, L.belt, 5, 17 + oy, 6, 1);
    rect(g, L.shirtShade, 7 + a, 12 + oy, 2, 3);
    rect(g, L.skin, 7 + a, 15 + oy, 2, 2);
    rect(g, L.skinShade, 7 + a, 16 + oy, 2, 1);
    rect(g, L.skin, 3, 4 + oy, 8, 7);
    rect(g, L.skinShade, 3, 10 + oy, 6, 1);
    rect(g, L.skinShade, 6, 11 + oy, 3, 1);
    rect(g, L.skin, 2, 7 + oy);
    rect(g, EYE, 4, 7 + oy, 1, 2);
    rect(g, L.blush, 5, 9 + oy);
    rect(g, MOUTH, 3, 9 + oy);
    rect(g, L.skin, 8, 6 + oy, 2, 3);
    rect(g, L.skinShade, 9, 7 + oy);
    drawHair(g, L, 'side', oy);
    return;
  }
  const front = dir === 0;
  const liftA = step === 1 ? 1 : 0, liftB = step === 3 ? 1 : 0;
  rect(g, L.pants, 5, 18, 3, 3 - liftA);
  rect(g, L.pantsShade, 7, 18, 1, 3 - liftA);
  rect(g, L.shoes, 4, 21 - liftA, 4, 2);
  rect(g, L.shoesShade, 4, 22 - liftA, 4, 1);
  rect(g, L.pants, 8, 18, 3, 3 - liftB);
  rect(g, L.pantsShade, 10, 18, 1, 3 - liftB);
  rect(g, L.shoes, 8, 21 - liftB, 4, 2);
  rect(g, L.shoesShade, 8, 22 - liftB, 4, 1);
  const sw = step === 1 ? 1 : step === 3 ? -1 : 0;
  rect(g, L.shirt, 2, 12 + oy, 2, 3);
  rect(g, L.skin, 2, 15 + oy + sw, 2, 2);
  rect(g, L.skinShade, 2, 16 + oy + sw, 2, 1);
  rect(g, L.shirtShade, 12, 12 + oy, 2, 3);
  rect(g, L.skin, 12, 15 + oy - sw, 2, 2);
  rect(g, L.skinShade, 12, 16 + oy - sw, 2, 1);
  rect(g, L.shirt, 4, 12 + oy, 8, 6);
  rect(g, L.shirtLight, 4, 12 + oy, 1, 5);
  rect(g, L.shirtShade, 10, 12 + oy, 2, 6);
  rect(g, L.belt, 4, 17 + oy, 8, 1);
  rect(g, L.skin, 3, 6 + oy, 1, 3);
  rect(g, L.skin, 12, 6 + oy, 1, 3);
  rect(g, L.skinShade, 6, 11 + oy, 4, 1);
  if (front) {
    rect(g, L.skinShade, 6, 12 + oy, 4, 1);
    if (L.logo) { // a little "G" for Bambi
      rect(g, L.logo, 6, 13 + oy, 3, 1);
      rect(g, L.logo, 6, 14 + oy, 1, 2);
      rect(g, L.logo, 8, 15 + oy);
      rect(g, L.logo, 6, 16 + oy, 3, 1);
    }
    rect(g, L.skin, 4, 4 + oy, 8, 7);
    rect(g, L.skinShade, 11, 5 + oy, 1, 5);
    rect(g, L.skinShade, 4, 10 + oy, 8, 1);
    rect(g, L.skinShade, 12, 7 + oy);
    rect(g, EYE, 5, 7 + oy, 2, 2);
    rect(g, EYE, 9, 7 + oy, 2, 2);
    rect(g, '#ffffff', 5, 7 + oy);
    rect(g, '#ffffff', 9, 7 + oy);
    rect(g, L.blush, 4, 9 + oy);
    rect(g, L.blush, 11, 9 + oy);
    rect(g, MOUTH, 7, 9 + oy, 2, 1);
  }
  drawHair(g, L, front ? 'front' : 'back', oy);
}

const personCache = new Map();
function personSprites(look) {
  if (personCache.has(look.id)) return personCache.get(look.id);
  const frames = [0, 1, 2].map(dir => [0, 1, 2, 3].map(step => paint(16, 24, g => drawPerson(g, dir, step, look), '#20140d')));
  frames[3] = frames[2].map(flipH);
  personCache.set(look.id, frames);
  return frames;
}

const SKINS = [['#f2c9a0', '#d9a87e', '#f0a090'], ['#e0a878', '#c48a5c', '#e08a70'], ['#c68857', '#a56a40', '#d9785a'], ['#9a6640', '#7a4c2c', '#b8644a'], ['#6e4429', '#54321c', '#8a4a36']];
const HAIRS = [['#1c1a20', '#3d3846'], ['#4a2c1c', '#6e4630'], ['#8a5a2c', '#b07a45'], ['#d9b25a', '#f0d58a'], ['#8c8c8c', '#b5b5b5'], ['#b5452a', '#d9673f']];
const SHIRTS = [['#4f8fd6', '#3a6fb0', '#7fb0e8'], ['#5cb83a', '#45912b', '#86d062'], ['#e2a52b', '#b88220', '#f2c25a'], ['#9b59b6', '#7a3f94', '#bb85cf'],
  ['#e8608a', '#c0466c', '#f58aa8'], ['#3fb5a8', '#2c8a80', '#6fd1c6'], ['#f4f0e6', '#cfc9bb', '#ffffff']];
const PANTS = [['#3c5a9a', '#2c4374'], ['#4a3b2e', '#352a20'], ['#2f2f36', '#1e1e24'], ['#8a6a4a', '#6e5238']];
const SHOES = [['#4a3020', '#2e1d12'], ['#2f2f36', '#1e1e24'], ['#f4f4f4', '#bdbdbd']];
const CAPS = [['#d9534f', '#a83b38'], ['#3f72c8', '#2f5aa3'], ['#2f2f36', '#1e1e24'], ['#5cb83a', '#45912b']];

function makeLook(id, seed, overrides = {}) {
  const r = rng(seed);
  const pick = a => a[Math.floor(r() * a.length)];
  const [skin, skinShade, blush] = pick(SKINS), [hair, hairLight] = pick(HAIRS), [shirt, shirtShade, shirtLight] = pick(SHIRTS);
  const [pants, pantsShade] = pick(PANTS), [shoes, shoesShade] = pick(SHOES), [cap, capShade] = pick(CAPS);
  const style = pick(['short', 'long', 'long', 'bun', 'cap', 'short']);
  return Object.assign({ id, skin, skinShade, blush, hair, hairLight, style, cap, capShade, shirt, shirtShade, shirtLight, pants, pantsShade, belt: '#3a2a1e', shoes, shoesShade }, overrides);
}
