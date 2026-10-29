'use strict';
/* Navdeep's Farm - farm layout, saved state and game rules. */

const MAP_W = 48, MAP_H = 36, N_TILES = MAP_W * MAP_H;
const DIRS = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right
const DAY_START = 6 * 60, DAY_END = 24 * 60;
const MINUTES_PER_SECOND = 1.8; // a full day lasts about 10 real minutes
const SAVE_KEY = 'pandora-farm-save-v2';
const SAVE_VERSION = 3;
const MAX_CHICKENS = 6;
const CHICKEN_NAMES = ['Nugget', 'Clover', 'Pepper', 'Biscuit', 'Maple', 'Waffles'];

const CROPS = {
  radish:     { name: 'Radish',     seed: 10, sell: 25,  days: 3,  regrow: 0, energy: 8 },
  carrot:     { name: 'Carrot',     seed: 15, sell: 40,  days: 4,  regrow: 0, energy: 12 },
  tomato:     { name: 'Tomato',     seed: 30, sell: 30,  days: 5,  regrow: 2, energy: 10 },
  corn:       { name: 'Corn',       seed: 40, sell: 110, days: 7,  regrow: 0, energy: 25 },
  strawberry: { name: 'Strawberry', seed: 50, sell: 55,  days: 7,  regrow: 3, energy: 15 },
  pumpkin:    { name: 'Pumpkin',    seed: 80, sell: 300, days: 10, regrow: 0, energy: 50 },
};
const CROP_IDS = Object.keys(CROPS);
const GOODS = {
  egg: { name: 'Egg', sell: 40, energy: 15 },
  bigEgg: { name: 'Big Egg', sell: 75, energy: 25 },
  muffin: { name: 'Berry Muffin', sell: 0, energy: 45 },
};
const DEBRIS = { 1: { name: 'weeds', energy: 1 }, 2: { name: 'rock', energy: 4 }, 3: { name: 'stump', energy: 6 } };

const SHOP = [
  ...CROP_IDS.map(t => ({
    id: 'seed:' + t, name: CROPS[t].name + ' Seeds', price: CROPS[t].seed, stack: true,
    desc: `Grows in ${CROPS[t].days} days · sells for ${CROPS[t].sell}g` + (CROPS[t].regrow ? ` · regrows every ${CROPS[t].regrow} days` : ''),
  })),
  { id: 'sprinkler', name: 'Sprinkler', price: 300, stack: true, desc: 'Waters the 8 tiles around it every morning' },
  { id: 'muffin', name: 'Berry Muffin', price: 60, stack: true, desc: 'Eat it from your bag for +45 energy' },
  { id: 'can', name: 'Big Watering Can', price: 600, desc: 'Holds 50 water instead of 25' },
  { id: 'chicken', name: 'Chicken', price: 400, desc: 'Lays an egg every morning. Pet it daily for big eggs!' },
];

const GOALS = [
  { text: 'Clear 5 weeds, rocks or stumps', stat: 'cleared', need: 5, reward: { gold: 30 } },
  { text: 'Plant 6 seeds', stat: 'planted', need: 6, reward: { gold: 40 } },
  { text: 'Harvest your first crop', stat: 'harvested', need: 1, reward: { gold: 50 } },
  { text: 'Sell 15 items at the market crate', stat: 'shipped', need: 15, reward: { gold: 100 } },
  { text: 'Earn 1,000g from sales', stat: 'earned', need: 1000, reward: { sprinkler: 1 } },
  { text: 'Buy a chicken from Wren', stat: 'chickens', need: 1, reward: { gold: 100 } },
  { text: 'Hire a farm manager', stat: 'hired', need: 1, reward: { gold: 100 } },
  { text: 'Get 10 happy customer reviews', stat: 'happy', need: 10, reward: { gold: 300 } },
  { text: 'Harvest a pumpkin', stat: 'pumpkins', need: 1, reward: { gold: 250 } },
  { text: 'Collect 10 eggs', stat: 'eggs', need: 10, reward: { muffin: 3 } },
  { text: 'Earn 10,000g from sales', stat: 'earned', need: 10000, reward: { gold: 1000 } },
];

let S = null; // the farm's saved state

const World = {
  ground: new Uint8Array(N_TILES),
  fence: new Uint8Array(N_TILES),
  fenceMask: new Uint8Array(N_TILES),
  solid: new Uint8Array(N_TILES), // trees and bushes
  structAt: new Int8Array(N_TILES).fill(-1),
  structures: [],
  trees: [],
  bushes: [],
  lights: [],
  pen: { x0: 36, y0: 21, x1: 43, y1: 28 },
  coopDoor: { x: 41, y: 24 },
  pasture: { x0: 33, y0: 11, x1: 44, y1: 17 },
  barnDoor: { x: 34, y: 14 },
  door: { x: 5, y: 5 },
  spawn: { x: 5, y: 6 },
  entrance: { x: MAP_W - 1, y: 8 },          // where visitors walk in along the lane
  queue: [[21, 8], [23, 8], [25, 8]],         // customers line up in front of the veggie stand
};

// The named farm areas. Managers are assigned to one of these.
const AREAS = {
  golu: { name: "Navdeep's Farm", x0: 12, y0: 10, x1: 29, y1: 22 },
  guri: { name: "Guri Farm", x0: 3, y0: 21, x1: 10, y1: 28 },
  yash: { name: "Kiran Farm", x0: 15, y0: 26, x1: 24, y1: 31 },
};
const AREA_IDS = Object.keys(AREAS);

const MANAGERS = [
  { id: 'raju', name: 'Raju', role: 'water', fee: 150, wage: 40, seed: 11 },
  { id: 'simran', name: 'Simran', role: 'crop', fee: 250, wage: 70, seed: 22 },
  { id: 'bobby', name: 'Bobby', role: 'water', fee: 150, wage: 40, seed: 33 },
  { id: 'meera', name: 'Meera', role: 'crop', fee: 250, wage: 70, seed: 44 },
];
const ROLE_TEXT = {
  water: 'Waters every dry crop in their area',
  crop: 'Tills, plants and harvests in their area (buys seeds with your gold if your bag runs out)',
};

// Managers get fresh random names on every new farm.
const MANAGER_NAME_POOL = ['Arjun', 'Priya', 'Rohan', 'Anaya', 'Kabir', 'Mira', 'Jas', 'Tara', 'Neel', 'Ruby', 'Sunny', 'Lily',
  'Omar', 'Zara', 'Vikram', 'Isha', 'Manny', 'Nina', 'Raj', 'Maya', 'Noor', 'Teddy', 'Pooja', 'Bilal', 'Rosie', 'Harjot', 'Amar', 'Kiki'];
function randomManagerNames() {
  const pool = MANAGER_NAME_POOL.slice();
  const names = {};
  for (const m of MANAGERS) names[m.id] = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return names;
}
const mgrName = m => (S && S.mgrNames && S.mgrNames[m.id]) || mgrName(m);

const idx = (x, y) => y * MAP_W + x;
const inBounds = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
const inRect = (a, x, y) => x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1;
const inPen = (x, y) => inRect(World.pen, x, y) || inRect(World.pasture, x, y);
const inField = (x, y) => AREA_IDS.some(id => inRect(AREAS[id], x, y));

function treeKind(x, y) {
  const h = hash2(x, y, 11);
  return h < 0.35 ? 0 : h < 0.6 ? 2 : h < 0.75 ? 3 : h < 0.88 ? 1 : 4;
}

function buildWorld() {
  const W = World;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const edge = x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2;
      W.ground[idx(x, y)] = edge ? G_FOREST : G_GRASS;
    }
  }
  const path = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) W.ground[idx(x, y)] = G_PATH;
  };
  path(5, 6, 5, 11);          // front door down to the pond
  path(3, 8, MAP_W - 1, 8);   // main lane, out through the east gate
  path(9, 9, 9, 20);          // to Guri farm
  path(35, 6, 35, 7);         // up to Wren's stall
  path(38, 9, 38, 20);        // to the chicken yard
  path(31, 9, 31, 24);        // round the field...
  path(19, 24, 30, 24);       // ...to Kiran farm
  path(19, 25, 19, 25);
  for (let y = 12; y <= 16; y++) {
    for (let x = 3; x <= 7; x++) {
      if ((x === 3 || x === 7) && (y === 12 || y === 16)) continue;
      W.ground[idx(x, y)] = G_WATER;
    }
  }
  const fenceRect = (x0, y0, x1, y1, gx, gy) => {
    for (let x = x0; x <= x1; x++) { W.fence[idx(x, y0)] = 1; W.fence[idx(x, y1)] = 1; }
    for (let y = y0; y <= y1; y++) { W.fence[idx(x0, y)] = 1; W.fence[idx(x1, y)] = 1; }
    W.fence[idx(gx, gy)] = 0;
  };
  fenceRect(35, 20, 44, 29, 38, 20); // chicken yard
  fenceRect(2, 20, 11, 29, 9, 20);   // Guri farm
  fenceRect(14, 25, 25, 32, 19, 25); // Kiran farm
  fenceRect(32, 10, 45, 18, 38, 10); // pasture (the chicken-yard path runs through it)
  W.fence[idx(38, 18)] = 0;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!W.fence[idx(x, y)]) continue;
      const f = (dx, dy) => inBounds(x + dx, y + dy) && W.fence[idx(x + dx, y + dy)] === 1;
      W.fenceMask[idx(x, y)] = (f(-1, 0) ? 1 : 0) | (f(1, 0) ? 2 : 0) | (f(0, -1) ? 4 : 0) | (f(0, 1) ? 8 : 0);
    }
  }

  W.structures = [
    { id: 'house', x: 3, y: 2, w: 5, h: 4 },
    { id: 'mailbox', x: 11, y: 7, w: 1, h: 1 },
    { id: 'bin', x: 12, y: 5, w: 1, h: 1 },
    { id: 'well', x: 14, y: 4, w: 1, h: 1 },
    { id: 'sign', x: 7, y: 7, w: 1, h: 1 },
    { id: 'board', x: 16, y: 7, w: 2, h: 1 },
    { id: 'stand', x: 20, y: 6, w: 3, h: 2 },
    { id: 'shop', x: 34, y: 3, w: 4, h: 3 },
    { id: 'farmsign', x: 40, y: 7, w: 5, h: 1 },
    { id: 'gurisign', x: 3, y: 19, w: 4, h: 1 },
    { id: 'yashsign', x: 21, y: 23, w: 4, h: 1 },
    { id: 'coop', x: 40, y: 21, w: 3, h: 3 },
    { id: 'barn', x: 33, y: 11, w: 3, h: 3 },
  ];
  W.structures.forEach((s, n) => {
    for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) W.structAt[idx(x, y)] = n;
  });

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (W.ground[idx(x, y)] !== G_FOREST) continue;
      const inner = x === 1 || y === 1 || x === MAP_W - 2 || y === MAP_H - 2;
      if (hash2(x, y, 3) < (inner ? 0.8 : 0.55)) W.trees.push({ x, y, kind: treeKind(x, y) });
    }
  }
  const free = (x, y) => {
    const i = idx(x, y);
    return W.ground[i] === G_GRASS && W.structAt[i] < 0 && !W.fence[i] && !W.solid[i];
  };
  const inner = [[16, 3], [19, 2], [24, 3], [27, 2], [30, 4], [40, 3], [42, 5], [44, 3], [7, 10], [12, 24], [12, 30],
    [26, 33], [35, 32], [44, 31], [2, 31], [8, 31], [13, 33], [30, 21], [33, 19], [45, 19], [2, 9], [2, 17], [11, 17], [29, 33]];
  const orchard = new Set(ORCHARD_SPOTS.map(([x, y]) => idx(x, y)));
  for (const [x, y] of inner) {
    if (!free(x, y) || inField(x, y) || inPen(x, y) || orchard.has(idx(x, y))) continue;
    W.trees.push({ x, y, kind: treeKind(x, y) });
    W.solid[idx(x, y)] = 1;
  }
  for (const [x, y] of [[8, 2], [11, 2], [12, 2], [32, 4], [38, 4], [45, 11]]) {
    if (!free(x, y)) continue;
    W.bushes.push({ x, y });
    W.solid[idx(x, y)] = 1;
  }
}

function canGrowWeed(x, y, s) {
  if (!inBounds(x, y)) return false;
  const i = idx(x, y);
  return World.ground[i] === G_GRASS && World.structAt[i] < 0 && !World.fence[i] && !World.solid[i] && !inPen(x, y)
    && !s.soil[i] && !s.debris[i] && !s.sprink[i] && !s.crops[i] && !(s.orchard && s.orchard[i]);
}

function newState() {
  const s = {
    v: SAVE_VERSION, day: 1, time: DAY_START, weather: 'sun', gold: 200,
    energy: 100, maxEnergy: 100, water: 25, canMax: 25,
    inv: { seeds: { radish: 12, carrot: 4 }, crops: {}, saplings: {}, egg: 0, bigEgg: 0, muffin: 1, sprinkler: 0, rod: 0 },
    hand: 'seed:radish',
    soil: new Uint8Array(N_TILES), debris: new Uint8Array(N_TILES), sprink: new Uint8Array(N_TILES),
    crops: {}, eggs: {}, chickens: [],
    animals: [],    // pasture animals: { type, name, has, love }
    orchard: defaultOrchard(), // fruit trees: tile -> { f, age, fruit }
    managers: {},   // hired managers: id -> { area, seed, paid }
    mgrNames: randomManagerNames(),
    stand: {},      // veggie stand stock: item -> count
    reviews: [],    // newest first: { name, text, good, day }
    rep: 50,        // reputation 0-100; more customers when it is high
    stats: { cleared: 0, planted: 0, harvested: 0, shipped: 0, earned: 0, chickens: 0, pumpkins: 0, eggs: 0, hired: 0, happy: 0, fish: 0, fruit: 0, animals: 0, cooked: 0 },
    goal: 0,
    player: { x: World.spawn.x, y: World.spawn.y, dir: 0 },
  };
  const r = rng(20261027);
  const golu = AREAS.golu;
  for (let y = 9; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!canGrowWeed(x, y, s) || inRect(AREAS.guri, x, y) || inRect(AREAS.yash, x, y)) continue;
      if (r() < (inRect(golu, x, y) ? 0.32 : 0.05)) {
        const k = r();
        s.debris[idx(x, y)] = k < 0.55 ? 1 : k < 0.8 ? 2 : 3;
      }
    }
  }
  const till = (x0, x1, y, crop, age) => {
    for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      s.soil[i] = 1;
      s.debris[i] = 0;
      if (crop) s.crops[i] = { t: crop, age, ready: false };
    }
  };
  // a tilled patch in Navdeep's Farm, and gifts already growing on Guri and Kiran farms
  for (let y = 11; y <= 13; y++) till(13, 16, y);
  till(4, 9, 22, 'strawberry', 4);
  till(4, 9, 24);
  till(4, 9, 26);
  till(16, 23, 27, 'corn', 4);
  till(16, 23, 29);
  return s;
}

function serialize() {
  const pack = a => { const out = []; for (let i = 0; i < a.length; i++) if (a[i]) out.push(i, a[i]); return out; };
  return JSON.stringify(Object.assign({}, S, { soil: pack(S.soil), debris: pack(S.debris), sprink: pack(S.sprink) }));
}

function deserialize(text) {
  const o = JSON.parse(text);
  if (!o || (o.v !== SAVE_VERSION && o.v !== 2)) return null;
  const old = o.v === 2;
  o.v = SAVE_VERSION;
  const unpack = list => {
    const a = new Uint8Array(N_TILES);
    list = list || [];
    for (let k = 0; k + 1 < list.length; k += 2) a[list[k]] = list[k + 1];
    return a;
  };
  const s = newState();
  const inv = Object.assign(s.inv, o.inv || {});
  const stats = Object.assign(s.stats, o.stats || {});
  Object.assign(s, o, { inv, stats, soil: unpack(o.soil), debris: unpack(o.debris), sprink: unpack(o.sprink) });
  if (old) migrateSave(s);
  return s;
}

function isSolid(x, y) {
  if (!inBounds(x, y)) return true;
  const i = idx(x, y), g = World.ground[i];
  return g === G_FOREST || g === G_WATER || World.fence[i] === 1 || World.solid[i] === 1 || World.structAt[i] >= 0
    || S.debris[i] > 0 || S.sprink[i] > 0 || !!S.orchard[i];
}

function cropStage(c) {
  if (c.ready) return 3;
  if (c.age === 0) return 0;
  return c.age < CROPS[c.t].days / 2 ? 1 : 2;
}

/* ---------- inventory helpers ---------- */
function itemName(id) {
  if (id.startsWith('seed:')) return CROPS[id.slice(5)].name + ' Seeds';
  if (CROPS[id]) return CROPS[id].name;
  if (GOODS[id]) return GOODS[id].name;
  if (id === 'sprinkler') return 'Sprinkler';
  if (id === 'rod') return 'Fishing Rod';
  if (id.startsWith('sapling:')) return FRUITS[id.slice(8)].name + ' Sapling';
  return id;
}
const invCount = id => (CROPS[id] ? S.inv.crops[id] : S.inv[id]) || 0;
function invAdd(id, n) {
  if (CROPS[id]) S.inv.crops[id] = invCount(id) + n; else S.inv[id] = invCount(id) + n;
}
function handOptions() {
  const opts = CROP_IDS.filter(t => S.inv.seeds[t] > 0).map(t => 'seed:' + t);
  if (S.inv.sprinkler > 0) opts.push('sprinkler');
  for (const f of FRUIT_IDS) if (S.inv.saplings[f] > 0) opts.push('sapling:' + f);
  if (S.inv.rod) opts.push('rod');
  return opts;
}
function handCount(h) {
  if (!h) return 0;
  if (h === 'sprinkler') return S.inv.sprinkler;
  if (h === 'rod') return S.inv.rod;
  if (h.startsWith('sapling:')) return S.inv.saplings[h.slice(8)] || 0;
  return S.inv.seeds[h.slice(5)] || 0;
}
function autoSwitchHand() {
  if (handCount(S.hand) > 0) return;
  S.hand = handOptions()[0] || null;
}
function cycleHand(step) {
  const o = handOptions();
  if (!o.length) { toast("You have no seeds. Buy some at Wren's stall!", 'bad'); Sound.play('error'); return; }
  const k = o.indexOf(S.hand);
  S.hand = o[(k + step + o.length) % o.length];
  Sound.play('move');
}

/* ---------- what OK does on the tile in front of the farmer ---------- */
const STRUCT_ACTIONS = {
  house: (x, y) => (x === World.door.x && y === World.door.y)
    ? { label: 'Go to bed (ends the day and saves)', run: askSleep }
    : { label: 'Cook in the kitchen', run: openKitchen },
  bin: () => {
    const n = sellables().reduce((a, [, c]) => a + c, 0);
    return n ? { label: `Sell your produce (${n})`, run: openSellMenu } : { label: 'Market crate: sell your harvest here', run: null };
  },
  well: () => ({ label: 'Fill watering can', run: refillCan }),
  sign: () => ({ label: 'Read the sign', run: openHelp }),
  shop: () => ({ label: "Shop at Wren's stall", run: openShop }),
  coop: () => ({ label: `Coop: ${S.chickens.length} of ${MAX_CHICKENS} chickens`, run: null }),
  mailbox: () => ({ label: 'Mailbox: read customer reviews', run: openReviews }),
  board: () => ({ label: 'Hire farm managers', run: openManagers }),
  stand: () => {
    const n = Object.values(S.stand).reduce((a, b) => a + b, 0);
    return { label: `Veggie stand: stock it (${n} for sale)`, run: openStand };
  },
  farmsign: () => ({ label: "Welcome to Navdeep's Farm!", run: null }),
  gurisign: () => ({ label: "Guri Farm", run: null }),
  yashsign: () => ({ label: "Kiran Farm", run: null }),
  barn: () => ({ label: `Barn: ${S.animals.length} of ${MAX_ANIMALS} animals`, run: null }),
};

function getAction(x, y) {
  if (!inBounds(x, y)) return null;
  const i = idx(x, y), g = World.ground[i];
  const st = World.structAt[i];
  if (st >= 0) return STRUCT_ACTIONS[World.structures[st].id](x, y);
  if (S.eggs[i]) return { label: S.eggs[i] === 2 ? 'Collect big egg' : 'Collect egg', run: () => collectEgg(i) };
  const gv = gurinderAt(x, y);
  if (gv) return { label: 'Talk to Gurinder', run: () => talkGurinder(gv) };
  const ch = chickenAt(x, y);
  if (ch) return { label: `Pet ${ch.ref.name}`, run: () => petChicken(ch) };
  const an = animalAt(x, y);
  if (an) return animalAction(an);
  const pet = petAt(x, y);
  if (pet) return pet;
  if (S.orchard[i]) return orchardAction(i);
  const d = S.debris[i];
  if (d) return { label: `Clear ${DEBRIS[d].name}`, cost: DEBRIS[d].energy, run: () => clearDebris(i) };
  if (S.sprink[i]) return { label: 'Pick up sprinkler', run: () => pickUpSprinkler(i) };
  if (g === G_WATER) {
    return S.hand === 'rod'
      ? { label: 'Cast your fishing line', cost: 2, run: () => startFishing(x, y) }
      : { label: 'Fill watering can (hold a fishing rod to fish)', run: refillCan };
  }
  if (g === G_FOREST || World.fence[i] || World.solid[i]) return null;
  const crop = S.crops[i];
  if (crop) {
    const info = CROPS[crop.t];
    if (crop.ready) return { label: `Harvest ${info.name}`, run: () => harvest(i) };
    if (S.soil[i] !== 2) return { label: `Water ${info.name}`, cost: 1, needWater: true, run: () => water(i) };
    const left = info.days - crop.age;
    return { label: `${info.name} is watered. Ready in ${left} day${left > 1 ? 's' : ''}`, run: null };
  }
  if (S.soil[i]) {
    if (S.hand && S.hand.startsWith('seed:')) {
      const t = S.hand.slice(5);
      return { label: `Plant ${CROPS[t].name}`, run: () => plant(i, t) };
    }
    if (S.hand === 'sprinkler') return { label: 'Place sprinkler', run: () => placeSprinkler(i) };
    return { label: "No seeds in hand. Buy some at Wren's stall", run: null };
  }
  if (inPen(x, y)) return { label: inRect(World.pasture, x, y) ? 'Pasture' : 'Chicken yard', run: null };
  if (g === G_GRASS) {
    if (S.hand === 'sprinkler') return { label: 'Place sprinkler', run: () => placeSprinkler(i) };
    if (S.hand && S.hand.startsWith('sapling:')) {
      const f = S.hand.slice(8);
      return { label: `Plant ${FRUITS[f].name.toLowerCase()} sapling`, run: () => plantSapling(i, f) };
    }
    return { label: 'Till soil', cost: 2, run: () => till(i) };
  }
  return null;
}

/* ---------- actions ---------- */
function till(i) {
  S.soil[i] = 1;
  groundChanged(i);
  fxAtTile(i, 'dirt');
  playerAnim('hoe');
  Sound.play('till');
}

function plant(i, t) {
  if (!S.inv.seeds[t]) { toast(`You're out of ${CROPS[t].name} seeds.`, 'bad'); Sound.play('error'); return; }
  S.inv.seeds[t]--;
  S.crops[i] = { t, age: 0, ready: false };
  S.stats.planted++;
  fxAtTile(i, 'leaf');
  playerAnim('hand');
  Sound.play('plant');
  if (!S.inv.seeds[t]) { autoSwitchHand(); toast(`That was your last ${CROPS[t].name} seed.`); }
  checkGoals();
}

function water(i) {
  S.water--;
  S.soil[i] = 2;
  groundChanged(i);
  fxAtTile(i, 'water');
  playerAnim('can');
  Sound.play('water');
}

// Moves a ripe crop into the bag (Bambi or a manager picked it); regrowing crops stay planted.
function collectCrop(i) {
  const c = S.crops[i], info = CROPS[c.t];
  S.inv.crops[c.t] = (S.inv.crops[c.t] || 0) + 1;
  S.stats.harvested++;
  if (c.t === 'pumpkin') S.stats.pumpkins++;
  if (info.regrow) { c.ready = false; c.age = info.days - info.regrow; } else delete S.crops[i];
  return c.t;
}

function harvest(i) {
  const t = collectCrop(i);
  fxAtTile(i, 'spark');
  playerAnim('hand');
  liftItem(t);
  Sound.play('harvest');
  checkGoals();
}

function clearDebris(i) {
  const d = S.debris[i];
  S.debris[i] = 0;
  S.stats.cleared++;
  fxAtTile(i, d === 1 ? 'leaf' : d === 2 ? 'stone' : 'wood');
  playerAnim(d === 1 ? 'hand' : 'hoe');
  Sound.play(d === 1 ? 'pull' : d === 2 ? 'rock' : 'chop');
  if (d === 1 && Math.random() < 0.12) {
    const t = CROP_IDS[Math.floor(Math.random() * 3)];
    S.inv.seeds[t] = (S.inv.seeds[t] || 0) + 1;
    if (!S.hand) S.hand = 'seed:' + t;
    toast(`Found a ${CROPS[t].name} seed in the weeds!`, 'good', 'seed:' + t);
  }
  checkGoals();
}

function refillCan() {
  if (S.water >= S.canMax) { toast('Your watering can is already full.', '', 'can'); return; }
  S.water = S.canMax;
  const [x, y] = targetTile();
  fx('water', x * 16 + 8, y * 16 + 10);
  playerAnim('can');
  Sound.play('splash');
  toast('Watering can filled!', 'good', 'can');
}

function placeSprinkler(i) {
  if (!S.inv.sprinkler) return;
  S.inv.sprinkler--;
  S.sprink[i] = 1;
  fxAtTile(i, 'water');
  Sound.play('plant');
  toast('Sprinkler placed. It waters the 8 tiles around it every morning.', 'good', 'sprinkler');
  autoSwitchHand();
}

function pickUpSprinkler(i) {
  S.sprink[i] = 0;
  S.inv.sprinkler++;
  if (!S.hand) S.hand = 'sprinkler';
  Sound.play('select');
  toast('Picked up the sprinkler.', '', 'sprinkler');
}

function collectEgg(i) {
  const id = S.eggs[i] === 2 ? 'bigEgg' : 'egg';
  delete S.eggs[i];
  S.inv[id]++;
  S.stats.eggs++;
  playerAnim('hand');
  liftItem(id);
  Sound.play('harvest');
  checkGoals();
}

function petChicken(c) {
  fx('heart', c.x + 6, c.y);
  Sound.play('cluck');
  if (c.ref.petted) { toast(`${c.ref.name} already feels loved today.`); return; }
  c.ref.petted = true;
  toast(`${c.ref.name} looks happy! Expect a big egg tomorrow.`, 'good', 'chicken');
}

function sellables() {
  const list = [];
  for (const t of CROP_IDS) if (invCount(t)) list.push([t, invCount(t), CROPS[t].sell]);
  for (const id of Object.keys(GOODS)) if (GOODS[id].sell && invCount(id)) list.push([id, invCount(id), GOODS[id].sell]);
  return list;
}

function sellStack(id) {
  const row = sellables().find(r => r[0] === id);
  if (!row) return;
  const [, n, price] = row;
  invAdd(id, -n);
  S.gold += n * price;
  S.stats.earned += n * price;
  S.stats.shipped += n;
  Sound.play('coin');
  toast(`Sold ${n} ${itemName(id)} for ${(n * price).toLocaleString('en-US')}g`, 'good', 'coin');
  checkGoals();
}

function sellAll() {
  let total = 0, count = 0;
  for (const [id, n, price] of sellables()) {
    total += n * price;
    count += n;
    invAdd(id, -n);
  }
  if (!count) return;
  S.gold += total;
  S.stats.earned += total;
  S.stats.shipped += count;
  Sound.play('coin');
  toast(`Sold ${count} item${count > 1 ? 's' : ''} for ${total.toLocaleString('en-US')}g!`, 'good', 'coin');
  checkGoals();
}

function buyItem(item, qty) {
  const cost = item.price * qty;
  if (S.gold < cost) { toast(`You need ${cost.toLocaleString('en-US')}g for that.`, 'bad', 'coin'); Sound.play('error'); return; }
  if (item.id === 'can' && S.canMax >= 50) return;
  if (item.id === 'chicken' && S.chickens.length >= MAX_CHICKENS) return;
  if (item.id.startsWith('animal:') && S.animals.length >= MAX_ANIMALS) return;
  if (item.id === 'rod' && S.inv.rod) return;
  S.gold -= cost;
  let what = qty > 1 ? `${qty} × ${item.name}` : item.name;
  if (item.id.startsWith('sapling:')) {
    const f = item.id.slice(8);
    S.inv.saplings[f] = (S.inv.saplings[f] || 0) + qty;
    S.hand = item.id;
    what += '. Hold it and press OK on grass to plant';
  } else if (item.id === 'rod') {
    S.inv.rod = 1;
    S.hand = 'rod';
    what += '. Face the pond and press OK to fish';
  } else if (item.id.startsWith('animal:')) {
    const type = item.id.slice(7);
    what = `${buyAnimal(type)} the ${ANIMALS[type].name.toLowerCase()}! Find them in the pasture`;
  } else if (item.id.startsWith('seed:')) {
    const t = item.id.slice(5);
    S.inv.seeds[t] = (S.inv.seeds[t] || 0) + qty;
    if (!S.hand || !handCount(S.hand)) S.hand = item.id;
  } else if (item.id === 'sprinkler') {
    S.inv.sprinkler += qty;
    if (!S.hand) S.hand = 'sprinkler';
  } else if (item.id === 'muffin') {
    S.inv.muffin += qty;
  } else if (item.id === 'can') {
    S.canMax = 50;
    S.water = 50;
  } else if (item.id === 'chicken') {
    const ref = { name: CHICKEN_NAMES[S.chickens.length], petted: false };
    S.chickens.push(ref);
    S.stats.chickens++;
    chickens.push(makeChickenEnt(ref, S.chickens.length - 1));
    what = `${ref.name} the chicken! Find her in the yard`;
  }
  Sound.play('coin');
  toast(`Bought ${what}`, 'good', shopIcon(item));
  checkGoals();
}

function shopIcon(item) {
  return item.id.startsWith('animal:') ? item.id.slice(7) : item.id;
}

function eat(id) {
  const info = CROPS[id] || GOODS[id];
  if (!invCount(id)) return;
  if (!info.energy) { toast(`Bambi can't eat ${info.name.toLowerCase()}! Sell it instead.`, 'bad'); Sound.play('error'); return; }
  if (S.energy >= S.maxEnergy) { toast("You're not hungry right now.", '', 'bolt'); Sound.play('error'); return; }
  invAdd(id, -1);
  S.energy = Math.min(S.maxEnergy, S.energy + info.energy);
  Sound.play('eat');
  toast(`Ate ${info.name === 'Egg' || info.name === 'Big Egg' ? 'an ' + info.name.toLowerCase() : info.name}. +${info.energy} energy`, 'good', 'bolt');
}

function checkGoals() {
  while (S.goal < GOALS.length) {
    const goal = GOALS[S.goal];
    if ((S.stats[goal.stat] || 0) < goal.need) break;
    const r = goal.reward, parts = [];
    if (r.gold) { S.gold += r.gold; parts.push(`${r.gold}g`); }
    if (r.sprinkler) { S.inv.sprinkler += r.sprinkler; parts.push(`${r.sprinkler} sprinkler`); if (!S.hand) S.hand = 'sprinkler'; }
    if (r.muffin) { S.inv.muffin += r.muffin; parts.push(`${r.muffin} muffins`); }
    S.goal++;
    Sound.play('goal');
    toast(`Goal complete: ${goal.text}! Reward: ${parts.join(', ')}`, 'good', 'star');
  }
}

function rewardText(r) {
  return r.gold ? `${r.gold.toLocaleString('en-US')}g` : r.sprinkler ? `${r.sprinkler} sprinkler` : `${r.muffin} muffins`;
}

/* ---------- a new morning ---------- */
function advanceDay(passedOut) {
  const rep = { day: S.day + 1, grew: 0, eggs: 0, bigEggs: 0, sprinkled: 0, passedOut, weather: 'sun' };
  for (const k in S.crops) {
    const c = S.crops[k], i = +k;
    if (S.soil[i] === 2 && !c.ready) {
      c.age++;
      rep.grew++;
      if (c.age >= CROPS[c.t].days) c.ready = true;
    }
  }
  for (let i = 0; i < N_TILES; i++) {
    if (S.soil[i] === 2) S.soil[i] = 1;
    // untended bare soil slowly grows back into grass
    if (S.soil[i] === 1 && !S.crops[i] && !S.sprink[i] && Math.random() < 0.05) S.soil[i] = 0;
  }
  S.day++;
  S.weather = S.day <= 2 ? 'sun' : Math.random() < (S.weather === 'rain' ? 0.15 : 0.25) ? 'rain' : 'sun';
  if (S.weather === 'rain') for (let i = 0; i < N_TILES; i++) if (S.soil[i]) S.soil[i] = 2;
  for (let i = 0; i < N_TILES; i++) {
    if (!S.sprink[i]) continue;
    const x = i % MAP_W, y = (i / MAP_W) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || !inBounds(x + dx, y + dy)) continue;
        const j = idx(x + dx, y + dy);
        if (S.soil[j] === 1) { S.soil[j] = 2; rep.sprinkled++; }
      }
    }
  }
  const spots = [];
  for (let y = World.pen.y0; y <= World.pen.y1; y++) {
    for (let x = World.pen.x0; x <= World.pen.x1; x++) {
      const i = idx(x, y);
      if (World.structAt[i] < 0 && !S.eggs[i]) spots.push(i);
    }
  }
  for (const c of S.chickens) {
    if (spots.length) {
      const i = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
      S.eggs[i] = c.petted ? 2 : 1;
      if (c.petted) rep.bigEggs++; else rep.eggs++;
    }
    c.petted = false;
  }
  let weeds = 0, tries = 0;
  while (weeds < 3 && tries++ < 80) {
    const x = 2 + Math.floor(Math.random() * (MAP_W - 4)), y = 9 + Math.floor(Math.random() * (MAP_H - 11));
    if (canGrowWeed(x, y, S)) { S.debris[idx(x, y)] = 1; weeds++; }
  }
  // managers are paid every morning; anyone who can't be paid stays home today
  rep.wages = 0;
  rep.unpaid = [];
  for (const id in S.managers) {
    const m = MANAGERS.find(x => x.id === id), h = S.managers[id];
    h.paid = S.gold >= m.wage;
    if (h.paid) { S.gold -= m.wage; rep.wages += m.wage; } else rep.unpaid.push(mgrName(m));
  }
  S.energy = passedOut ? Math.round(S.maxEnergy * 0.6) : S.maxEnergy;
  S.time = DAY_START;
  S.player = { x: World.spawn.x, y: World.spawn.y, dir: 0 };
  rep.weather = S.weather;
  advanceExtras(rep);
  return rep;
}

function fmtTime(t) {
  const h24 = Math.floor(t / 60) % 24, m = Math.floor((t % 60) / 10) * 10;
  return `${h24 % 12 || 12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
