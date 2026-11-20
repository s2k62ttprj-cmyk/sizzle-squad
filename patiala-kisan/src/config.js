// Game content and economy. Every price, timer, unlock and reward lives here so
// balancing never requires touching gameplay code. Times are in seconds, money in rupees.

export const SAVE_KEY = 'patiala-kisan-save';
// true once recorded animal sounds ship in sounds/ (listed in sounds/animals.json); until then
// every animal voice is synthesised
export const SOUND_PACK = false;
export const SAVE_VERSION = 2;
// The release number: each release keeps one copy of the farm exactly as the release before left it
export const RELEASE = 13;
export const DAY_SECONDS = 360;          // one in-game day (salaries, weather)
export const PLOT = 2;                   // plot pitch in metres
export const START_MONEY = 40;

export const xpNeed = (level) => Math.round((25 + 18 * Math.pow(level, 1.55)) * 2.5);     // ×2.5 in release 12: levels take much longer

// shape drives the procedural plant model in crops.js
export const CROPS = {
  wheat:       { name: 'Wheat',       pa: 'Kanak',      icon: '🌾', level: 1,  seed: 2,  sell: 6,   grow: 25,  yield: 2, xp: 1, shape: 'grain', leaf: 0x86c34a, ripe: 0xe9c25a },
  carrot:      { name: 'Carrot',      pa: 'Gajar',      icon: '🥕', level: 1,  seed: 4,  sell: 11,  grow: 40,  yield: 2, xp: 2, shape: 'root',  leaf: 0x4fae3a, ripe: 0xff7f27 },
  potato:      { name: 'Potato',      pa: 'Aloo',       icon: '🥔', level: 2,  seed: 6,  sell: 8,   grow: 55,  yield: 4, xp: 2, shape: 'bush',  leaf: 0x5daa3f, ripe: 0xc8a26a, low: true },
  tomato:      { name: 'Tomato',      pa: 'Tamatar',    icon: '🍅', level: 3,  seed: 9,  sell: 14,  grow: 70,  yield: 3, xp: 3, shape: 'bush',  leaf: 0x4f9e37, ripe: 0xe8392c },
  maize:       { name: 'Maize',       pa: 'Makki',      icon: '🌽', level: 4,  seed: 10, sell: 12,  grow: 80,  yield: 4, xp: 3, shape: 'tall',  leaf: 0x6fb33f, ripe: 0xf4c542 },
  mustard:     { name: 'Mustard',     pa: 'Sarson',     icon: '🌼', level: 5,  seed: 12, sell: 25,  grow: 90,  yield: 2, xp: 4, shape: 'flower', leaf: 0x6aa83c, ripe: 0xf7d417 },
  strawberry:  { name: 'Strawberry',  pa: 'Strawberry', icon: '🍓', level: 6,  seed: 18, sell: 22,  grow: 100, yield: 3, xp: 4, shape: 'low',   leaf: 0x3f9a3a, ripe: 0xe0313f },
  sugarcane:   { name: 'Sugarcane',   pa: 'Ganna',      icon: '🎋', level: 8,  seed: 20, sell: 20,  grow: 120, yield: 4, xp: 5, shape: 'cane',  leaf: 0x7cc04a, ripe: 0xb9c45a },
  rice:        { name: 'Basmati',     pa: 'Jhona',      icon: '🍚', level: 10, seed: 25, sell: 30,  grow: 140, yield: 3, xp: 6, shape: 'grain', leaf: 0x7ccf54, ripe: 0xd9c06a, paddy: true },
  cauliflower: { name: 'Cauliflower', pa: 'Gobhi',      icon: '🥦', level: 12, seed: 30, sell: 50,  grow: 150, yield: 2, xp: 7, shape: 'head',  leaf: 0x4e9a45, ripe: 0xf6f1de },
  watermelon:  { name: 'Watermelon',  pa: 'Hadwana',    icon: '🍉', level: 14, seed: 40, sell: 120, grow: 200, yield: 1, xp: 8, shape: 'melon', leaf: 0x4f9c3a, ripe: 0x2f7d32 },
  chilli:      { name: 'Green Chilli', pa: 'Hari Mirch', icon: '🌶️', level: 16, seed: 35, sell: 18, grow: 160, yield: 7, xp: 8, shape: 'bush',  leaf: 0x3e8f33, ripe: 0x2fae2a },
  cotton:      { name: 'Cotton',      pa: 'Narma',      icon: '☁️', level: 18, seed: 45, sell: 70,  grow: 220, yield: 2, xp: 9, shape: 'puff',  leaf: 0x5b8f3a, ripe: 0xffffff },
  peas:        { name: 'Peas',        pa: 'Matar',      icon: '🫛', level: 20, grow: 180, yield: 4, xp: 10, shape: 'bush', leaf: 0x3f8a32, ripe: 0xb8e986 },
  onion:       { name: 'Onion',       pa: 'Pyaaz',      icon: '🧅', level: 22, grow: 200, yield: 4, xp: 11, shape: 'root', leaf: 0x5fae3f, ripe: 0xa8466a },
  garlic:      { name: 'Garlic',      pa: 'Lehsun',     icon: '🧄', level: 24, grow: 220, yield: 3, xp: 12, shape: 'root', leaf: 0x6fb34a, ripe: 0xf1ece0 },
  peanut:      { name: 'Peanut',      pa: 'Moongphali', icon: '🥜', level: 26, grow: 240, yield: 5, xp: 13, shape: 'bush', leaf: 0x4f9a3a, ripe: 0xc8995a, low: true },
  sunflower:   { name: 'Sunflower',   pa: 'Suraj-mukhi', icon: '🌻', level: 28, grow: 260, yield: 3, xp: 14, shape: 'flower', leaf: 0x5a9a33, ripe: 0xffc400 },
  pumpkin:     { name: 'Pumpkin',     pa: 'Kaddu',      icon: '🎃', level: 31, grow: 280, yield: 2, xp: 15, shape: 'melon', leaf: 0x4f9c3a, ripe: 0xf08a1c },
  turmeric:    { name: 'Turmeric',    pa: 'Haldi',      icon: '🟡', level: 35, grow: 320, yield: 3, xp: 17, shape: 'root',  leaf: 0x4fae3a, ripe: 0xf2a900 },
  saffron:     { name: 'Saffron',     pa: 'Kesar',      icon: '🌸', level: 40, grow: 400, yield: 1, xp: 22, shape: 'low',   leaf: 0x6aa83c, ripe: 0xa05bd6 },
};
// Seed and selling prices come from one formula, so no crop can cost more to sow than it earns.
// gross = what one plant is worth = rate(level) × tier × (grow time + 8 s of work); the crop's
// yield splits it into a price per item, and the seed costs a tier-based share of it (rare
// crops cost more to sow but pay back more). The twelve crops from before keep their old price
// whenever it was better for the player, so no farm is nerfed: sells only go up, seeds only
// go down, and a seed never costs more than half of one crop's selling price.
export const CROP_TIER = { wheat: 0, carrot: 0, potato: 0, tomato: 0, maize: 0, peas: 0, mustard: 1, strawberry: 1, sugarcane: 1, rice: 1, cauliflower: 1, chilli: 1, onion: 1, garlic: 1, peanut: 1, sunflower: 1, pumpkin: 1, watermelon: 2, cotton: 2, turmeric: 2, saffron: 3 };
export const TIER_NAMES = ['Staple', 'Cash crop', 'Premium', 'Rare'];
export const TIER_SHARE = [0.12, 0.16, 0.2, 0.26];
const TIER_MUL = [1, 1.08, 1.2, 1.5];
export const cropRate = (level, tier) => (0.4 + 0.006 * level) * TIER_MUL[tier];
export const cropGross = (c) => cropRate(c.level, c.tier) * (c.grow + 8);
for (const [id, c] of Object.entries(CROPS)) {
  c.tier = CROP_TIER[id] ?? 1;
  const gross = cropGross(c);
  const sell = Math.max(c.sell || 0, Math.round(gross / c.yield));
  let seed = Math.max(1, Math.round(gross * TIER_SHARE[c.tier]));
  if (c.seed) seed = Math.min(seed, c.seed);
  c.sell = sell;
  c.seed = Math.max(1, Math.min(seed, Math.floor(sell / 2)));
}

export const PRODUCTS = {
  egg:      { name: 'Egg',       pa: 'Anda',     icon: '🥚', price: 14,  color: 0xfff1d6 },
  milk:     { name: 'Milk',      pa: 'Dudh',     icon: '🥛', price: 38,  color: 0xf8f8f2 },
  wool:     { name: 'Wool',      pa: 'Unn',      icon: '🧶', price: 55,  color: 0xeeeadf },
  atta:     { name: 'Atta',      pa: 'Atta',     icon: '🥣', price: 15,  color: 0xf3e3c0 },
  oil:      { name: 'Mustard Oil', pa: 'Sarson da Tel', icon: '🛢️', price: 120, color: 0xd9a514 },
  gur:      { name: 'Gur',       pa: 'Gur',      icon: '🟫', price: 95,  color: 0x8a5a24 },
  makkhan:  { name: 'Makkhan',   pa: 'Makkhan',  icon: '🧈', price: 95,  color: 0xfff0a0 },
  paneer:   { name: 'Paneer',    pa: 'Paneer',   icon: '🧀', price: 120, color: 0xfffbea },
  ghee:     { name: 'Desi Ghee', pa: 'Ghee',     icon: '🍯', price: 180, color: 0xf2c94c },
  lassi:    { name: 'Lassi',     pa: 'Lassi',    icon: '🥤', price: 52,  color: 0xfaf3e3 },
  thali:    { name: 'Saag Makki Thali', pa: 'Saag te Makki di Roti', icon: '🍛', price: 260, color: 0x5f8f2a },
  paratha:  { name: 'Aloo Paratha', pa: 'Aloo Paratha', icon: '🫓', price: 105, color: 0xd9a35a },
  achaar:   { name: 'Achaar',    pa: 'Achaar',   icon: '🫙', price: 270, color: 0xb5651d },
  pinni:    { name: 'Pinni',     pa: 'Pinni',    icon: '🍡', price: 230, color: 0xb07a3a },
  jam:      { name: 'Strawberry Jam', pa: 'Jam', icon: '🥫', price: 135, color: 0xc0182a },
  phulkari: { name: 'Phulkari',  pa: 'Phulkari', icon: '🧣', price: 330, color: 0xff6a1a },
  khes:     { name: 'Khes Blanket', pa: 'Khes',  icon: '🛏️', price: 300, color: 0x3a6fd8 },
  mango:    { name: 'Mango',     pa: 'Amb',      icon: '🥭', price: 46,  color: 0xffb627 },
  guava:    { name: 'Guava',     pa: 'Amrood',   icon: '🍐', price: 30,  color: 0xb9e07a },
  orange:   { name: 'Orange',    pa: 'Santra',   icon: '🍊', price: 40,  color: 0xff9f1c },
  jamun:    { name: 'Jamun',     pa: 'Jamun',    icon: '🫐', price: 36,  color: 0x5b2a86 },
  ber:      { name: 'Ber',       pa: 'Ber',      icon: '🍒', price: 24,  color: 0xc9893a },  mithai:   { name: "Gopal's Mithai Box", pa: 'Mithai da Dabba', icon: '🎁', price: 300, color: 0xff6fae },
};

// Unified item table: crops sell at their crop price.
export const ITEMS = {};
for (const [id, c] of Object.entries(CROPS)) ITEMS[id] = { name: c.name, pa: c.pa, icon: c.icon, price: c.sell, color: c.ripe, crop: true };
for (const [id, p] of Object.entries(PRODUCTS)) ITEMS[id] = { ...p, crop: false };

export const RECIPES = {
  atta:     { in: { wheat: 3 }, out: { atta: 2 }, time: 20, xp: 3 },
  oil:      { in: { mustard: 3 }, out: { oil: 1 }, time: 30, xp: 5 },
  makkhan:  { in: { milk: 2 }, out: { makkhan: 1 }, time: 25, xp: 4 },
  paneer:   { in: { milk: 2 }, out: { paneer: 1 }, time: 30, xp: 5 },
  ghee:     { in: { milk: 3 }, out: { ghee: 1 }, time: 45, xp: 7 },
  lassi:    { in: { milk: 1 }, out: { lassi: 1 }, time: 15, xp: 2 },
  gur:      { in: { sugarcane: 3 }, out: { gur: 1 }, time: 30, xp: 5 },
  thali:    { in: { mustard: 2, maize: 2, makkhan: 1 }, out: { thali: 1 }, time: 40, xp: 10 },
  paratha:  { in: { atta: 2, potato: 2, makkhan: 1 }, out: { paratha: 2 }, time: 35, xp: 8 },
  achaar:   { in: { chilli: 4, oil: 1 }, out: { achaar: 1 }, time: 50, xp: 10 },
  pinni:    { in: { atta: 2, ghee: 1, gur: 1 }, out: { pinni: 2 }, time: 60, xp: 14 },
  jam:      { in: { strawberry: 4, gur: 1 }, out: { jam: 2 }, time: 45, xp: 9 },
  phulkari: { in: { cotton: 2, wool: 1 }, out: { phulkari: 1 }, time: 70, xp: 14 },
  khes:     { in: { cotton: 3 }, out: { khes: 1 }, time: 60, xp: 12 },
};

export const BUILDINGS = {
  chakki: { name: 'Atta Chakki',       pa: 'ਆਟਾ ਚੱਕੀ',   level: 6,  cost: 2000,  recipes: ['atta'] },
  kohlu:  { name: 'Kohlu Oil Press',   pa: 'ਕੋਹਲੂ',      level: 8,  cost: 4500,  recipes: ['oil'] },
  dairy:  { name: 'Dairy',             pa: 'ਡੇਅਰੀ',      level: 10, cost: 7000,  recipes: ['makkhan', 'paneer', 'ghee', 'lassi'] },
  belna:  { name: 'Gur Belna',         pa: 'ਗੁੜ ਵੇਲਣਾ',  level: 12, cost: 9000,  recipes: ['gur'] },
  dhaba:  { name: 'Dhaba',             pa: 'ਢਾਬਾ',       level: 14, cost: 14000, recipes: ['thali', 'paratha', 'achaar'] },
  halwai: { name: 'Halwai Shop',       pa: 'ਹਲਵਾਈ',      level: 17, cost: 22000, recipes: ['pinni', 'jam'] },
  khaddi: { name: 'Phulkari Workshop', pa: 'ਫੁਲਕਾਰੀ',    level: 19, cost: 30000, recipes: ['phulkari', 'khes'] },
};
// upgrade level n (0..6): speed and queue length
export const BUILDING_UPGRADES = [
  { speed: 1.0,  slots: 2 },
  { speed: 1.35, slots: 3, costMul: 0.6 },
  { speed: 1.7,  slots: 4, costMul: 1.2 },
  { speed: 2.1,  slots: 5, costMul: 2.2 },
  { speed: 2.6,  slots: 6, costMul: 3.5 },
  { speed: 3.2,  slots: 7, costMul: 5.5 },
  { speed: 4.0,  slots: 8, costMul: 8.5 },
];

export const PENS = {
  coop:    { name: 'Murgi Khana',  en: 'Chicken coop', animal: 'chicken', animalName: 'Chicken', plural: 'Chickens', level: 5,  cost: 1000, animalCost: 120, caps: [6, 10, 14, 18, 24], capCosts: [1500, 4000, 9000, 16000], product: 'egg',  cycle: 45,  feeds: ['wheat', 'maize'], xp: 1 },
  tabela:  { name: 'Tabela', en: 'Cow & buffalo shed', animal: 'buffalo', animalName: 'Cow or buffalo', plural: 'Cows & buffaloes', level: 8,  cost: 3500, animalCost: 900, caps: [3, 5, 8, 10, 12], capCosts: [4000, 9000, 16000, 26000], product: 'milk', cycle: 90, feeds: ['wheat', 'maize', 'sugarcane'], xp: 3 },
  bakri:   { name: 'Bakriyan da Vada', en: 'Goat pen', animal: 'goat', animalName: 'Beetal goat', plural: 'Beetal goats', level: 11, cost: 5000, animalCost: 500, caps: [4, 7, 10, 13, 16], capCosts: [5000, 11000, 18000, 28000], product: 'milk', cycle: 60, feeds: ['carrot', 'cauliflower', 'wheat'], xp: 2 },
  bhed:    { name: 'Bhedan da Vada', en: 'Sheep pen', animal: 'sheep', animalName: 'Sheep', plural: 'Sheep', level: 13, cost: 6000, animalCost: 650, caps: [4, 7, 10, 13, 16], capCosts: [6000, 12000, 20000, 30000], product: 'wool', cycle: 120, feeds: ['wheat', 'maize'], xp: 3 },
};
export const PEN_PIPE_COST = 1600;   // doubled in release 11     // tubewell pipe: animals never run out of water
export const PEN_WATER_CAP = 30;

// Farmland. x0/z0 is the north-west corner, cols along +x, rows along +z.
export const FIELDS = [
  { id: 'f1', name: 'Ghar wala Khet',  x0: -14, z0: -7,  cols: 4, rows: 4, level: 1,  cost: 0 },
  { id: 'f2', name: 'Uttar wala Khet', x0: -14, z0: -18, cols: 4, rows: 5, level: 2,  cost: 250 },
  { id: 'f3', name: 'Nehar wala Khet', x0: -25, z0: -7,  cols: 5, rows: 4, level: 4,  cost: 900 },
  { id: 'f4', name: 'Peepal wala Khet', x0: -25, z0: -18, cols: 5, rows: 5, level: 6,  cost: 2500 },
  { id: 'f5', name: 'Dakkhan wala Khet', x0: -15, z0: 4, cols: 6, rows: 5, level: 9,  cost: 6000 },
  { id: 'f6', name: 'Vadda Khet',      x0: -28, z0: 4,   cols: 6, rows: 5, level: 12, cost: 12000 },
  { id: 'f7', name: 'Murabba',         x0: -38, z0: -18, cols: 6, rows: 6, level: 16, cost: 25000 },
  { id: 'f8', name: 'Kila',            x0: -39, z0: 4,   cols: 5, rows: 5, level: 20, cost: 40000 },
  // added in the new-lands update (append only: saves and farm links go by id). Release 11 moved them next to the old farm.
  { id: 'e1', name: 'Phulkari Baagh',   kind: 'flower', x0: -38.5, z0: 15.6, cols: 5, rows: 6, level: 14, cost: 30000 },
  { id: 'e2', name: 'Sabzi Baagh',      kind: 'veg',    x0: -27.5, z0: 15.6, cols: 5, rows: 6, level: 17, cost: 45000 },
  { id: 'e3', name: 'Jhona Khet',       kind: 'paddy',  x0: -23.2, z0: 29,   cols: 6, rows: 6, level: 20, cost: 65000 },
  { id: 'e4', name: 'Sheesh Mahal Greenhouse', kind: 'green', x0: -10.8, z0: 29, cols: 5, rows: 5, level: 24, cost: 120000 },
  { id: 'e5', name: 'Ganna Bagaan',     kind: 'plant',  x0: -37.5, z0: -63.5, cols: 6, rows: 6, level: 27, cost: 160000 },
  { id: 'e6', name: 'Shahi Zameen',     kind: 'shahi',  x0: -37.5, z0: -49.5, cols: 6, rows: 6, level: 32, cost: 300000 },
];
// what each kind of land is good at: grow = speed multiplier, extra = more crops per harvest
export const FIELD_KINDS = {
  flower: { name: 'Flower farm', icon: '🌸', crops: ['mustard', 'sunflower', 'saffron', 'strawberry'], grow: 1.15, extra: 1, desc: 'Flower crops grow 15% faster and give +1 a harvest' },
  veg:    { name: 'Vegetable farm', icon: '🥕', crops: ['carrot', 'potato', 'tomato', 'cauliflower', 'chilli', 'peas', 'onion', 'garlic', 'pumpkin', 'watermelon'], grow: 1.25, extra: 0, desc: 'Vegetables grow 25% faster' },
  paddy:  { name: 'Rice paddy', icon: '🌾', crops: ['rice'], grow: 1.3, extra: 2, desc: 'Basmati grows 30% faster and gives +2 a harvest' },
  green:  { name: 'Greenhouse', icon: '🏡', crops: null, grow: 1.4, extra: 0, desc: 'Every crop grows 40% faster under glass' },
  plant:  { name: 'Plantation', icon: '🎋', crops: ['sugarcane', 'cotton', 'turmeric', 'peanut', 'maize'], grow: 1.1, extra: 2, desc: 'Cane, cotton, turmeric, peanut and maize: 10% faster, +2 a harvest' },
  shahi:  { name: 'Premium land', icon: '👑', crops: null, grow: 1.2, extra: 1, desc: 'Royal soil: every crop grows 20% faster and gives +1' },
};
export const kindFits = (f, crop) => { const K = FIELD_KINDS[f?.kind]; return !!K && (!K.crops || K.crops.includes(crop)); };
export const kindGrow = (f, crop) => (kindFits(f, crop) ? FIELD_KINDS[f.kind].grow : 1);
export const kindExtra = (f, crop) => (kindFits(f, crop) ? FIELD_KINDS[f.kind].extra : 0);

// The orchard (Navi Zameen): twelve fruit trees bought with the land, each ripening on the real
// clock and picked by hand
export const ORCHARD = { level: 15, cost: 50000, x0: 56, z0: -42, cols: 6, rows: 2, dx: 4.6, dz: 6,
  trees: ['mango', 'guava', 'orange', 'jamun', 'ber', 'mango', 'orange', 'guava', 'ber', 'jamun', 'mango', 'orange'], every: 300, n: 5 };

// Seasons: Rabi (winter) and Kharif (monsoon) take turns every 5 days; crops in season sell 15% dearer
export const SEASONS = [
  { id: 'rabi', name: 'Rabi', icon: '❄️', desc: 'winter crops', crops: ['wheat', 'mustard', 'peas', 'potato', 'carrot', 'cauliflower', 'onion', 'garlic', 'strawberry', 'saffron'] },
  { id: 'kharif', name: 'Kharif', icon: '🌧️', desc: 'monsoon crops', crops: ['rice', 'maize', 'cotton', 'sugarcane', 'tomato', 'chilli', 'watermelon', 'peanut', 'sunflower', 'pumpkin', 'turmeric'] },
];
export const SEASON_DAYS = 5, SEASON_BONUS = 0.15;

// Pets that follow you, the Navi Zameen paddock (horses and a duck pond) and the Mela games
export const PETS = {
  dog: { name: 'Sheru', icon: '🐕', cost: 8000, level: 6, desc: 'A loyal desi dog who follows you everywhere' },
  cat: { name: 'Billo', icon: '🐈', cost: 6000, level: 6, desc: 'A grey cat who trots after you, when she feels like it' },
  patEvery: 600, patXp: 8,
};
export const PADDOCK = { x0: 56, x1: 76, z0: -62, z1: -47, shed: [71.5, -59], trough: [64, -50], pond: [60.5, -57, 2.4], horses: 3, ducks: 6, cost: 80000, level: 20, feedXp: 30, feedSoul: 5 };
export const MELA = {
  board: [49.8, 17],
  race: [[53.5, 30], [70, 24], [85.7, 24], [85.7, 8], [75, 2.7], [58, 2.7], [53.5, -16], [66, -20], [53.5, -44]], raceTime: 100, racePay: 800,
  harvestTime: 60, harvestPay: 30, harvestCool: 600,
  matkas: 6, matkaPay: 250, matkaBonus: 1500,
  matkaSpots: [[-1.5, 43], [5.6, 37], [18.6, 36], [-25.5, 29], [38.6, -30], [23.6, -32], [-28.4, -34], [-38.4, -40], [-24, -46], [-53.9, 30], [41.6, 26], [-10.4, 40], [27.6, 42], [-31.4, -22], [-53.4, 6], [58, -27], [80, -27.5], [75, 46], [60, 46.5], [98, -30], [49.5, -40], [-36, 45]],
  puddles: [[0, 10, 1.2], [0, 25, 1.0], [10, 30, 1.3], [10, 40, 1.0], [-6, 22.5, 1.2], [20, 23, 1.0], [8, -14.5, 1.1], [25, -14.5, 1.0], [53.5, 10, 1.2], [53.5, -20, 1.1], [70, 24, 1.2], [70, 2.7, 1.0], [85.7, -10, 1.1], [-1, -20, 1.0]],
  visitorBeauty: 120, visitorTip: 40, visitorTipTier: 30, visitorFrom: [[0, 49], [10, 49], [50, 24]],
};

// Tube wells: switch the motor on and water runs down the khaal (channel) to the fields listed
export const TUBEWELLS = [
  { name: 'Ghar wala tubewell', kotha: [-4.5, -4.2], tank: [-4.5, -1.9], puddle: [-2.6, -1.4], fields: ['f1', 'f2', 'f3', 'f4'],
    channel: [[-5.6, -2.4], [-5.9, -2.4], [-5.9, -7.5], [-25, -7.5]], khaal: { cost: 2500, level: 5 } },
  { name: 'Navi Zameen tubewell', kotha: [62, 6.2], tank: [65.5, 6.4], puddle: [67.9, 6.0], fields: [],
    channel: [[65.2, 7.2], [65.2, 9.3], [55.3, 9.3], [55.3, -28]] },
];
export const seasonOf = (day) => SEASONS[Math.floor(Math.max(0, (day | 0) - 1) / SEASON_DAYS) % SEASONS.length];

export const BAGS = [
  { name: 'Jhola',           cap: 8,  cost: 0,    level: 1 },
  { name: 'Bori (sack)',     cap: 14, cost: 120,  level: 2 },
  { name: 'Tokri (basket)',  cap: 22, cost: 450,  level: 4 },
  { name: 'Rehri (cart)',    cap: 35, cost: 1600, level: 7 },
  { name: 'Vaddi Rehri',     cap: 55, cost: 5000, level: 11 },
  { name: 'Gadda (ox cart)', cap: 75, cost: 14000, level: 16 },
  { name: 'Lohe di Rehri (steel cart)', cap: 100, cost: 30000, level: 22 },
];
export const CANS = [
  { name: 'Baalti (bucket)',   cap: 8,  cost: 0,    level: 1 },
  { name: 'Watering can',      cap: 16, cost: 200,  level: 2 },
  { name: 'Big watering can',  cap: 30, cost: 900,  level: 5 },
  { name: 'Backpack sprayer',  cap: 50, cost: 3000, level: 9 },
  { name: 'Tanki (water drum)', cap: 75, cost: 8000, level: 14 },
  { name: 'Pump sprayer',      cap: 110, cost: 20000, level: 20 },
];
export const STORAGE = [
  { name: 'Kotha',        cap: 60,   cost: 0,     level: 1 },
  { name: 'Godown',       cap: 150,  cost: 800,   level: 3 },
  { name: 'Big Godown',   cap: 300,  cost: 3000,  level: 6 },
  { name: 'Warehouse',    cap: 600,  cost: 9000,  level: 10 },
  { name: 'Cold Store',   cap: 1200, cost: 25000, level: 15 },
  { name: 'Mega Cold Store', cap: 2400, cost: 60000, level: 21 },
  { name: 'Patiala Cold Chain', cap: 4000, cost: 120000, level: 27 },
  { name: 'Navi Zameen Silo', cap: 7000, cost: 250000, level: 33 },
  { name: 'Punjab Grain Bank', cap: 12000, cost: 500000, level: 40 },
];
export const STALL = [
  { name: 'Phatta (plank stall)', shelf: 30,  every: 7.0, cost: 0,    level: 1 },
  { name: 'Mandi Stall',          shelf: 60,  every: 5.0, cost: 1500, level: 5 },
  { name: 'Sabzi Dukaan',         shelf: 120, every: 3.5, cost: 6000, level: 10 },
  { name: 'Vaddi Dukaan',         shelf: 240, every: 2.5, cost: 18000, level: 16 },
  { name: 'Mandi Showroom',       shelf: 400, every: 1.9, cost: 45000, level: 21 },
  { name: 'Patiala Super Store',  shelf: 600, every: 1.5, cost: 90000, level: 27 },
  { name: 'Punjab Mega Mart',     shelf: 900, every: 1.2, cost: 220000, level: 34 },
];
export const ARHTIYA_RATE = 0.7;     // wholesale buys instantly but pays less

export const VEHICLES = {
  bike:    { name: 'Bullet Motorcycle', level: 3,  cost: 1200,  speed: 13, cargo: 0,   desc: 'Zoom around the farm. Uses your bag.' },
  tractor: { name: 'Tractor 35 HP',     level: 9,  cost: 10000, speed: 8.5, cargo: 80, desc: 'Works fields with attachments and carries a trolley.' },
  combine: { name: 'Combine Harvester', level: 18, cost: 40000, speed: 7,  cargo: 200, desc: 'Harvests a wide strip in one pass.' },
  // added in the vehicles-and-airplane update (append only). top m/s, accel m/s², turn rad/s, offroad: no slow-down in fields
  golfcart: { name: 'Golf Cart', icon: '⛳', level: 8, cost: 15000, speed: 9, accel: 4, turn: 3.0, cargo: 10, desc: 'Quiet and nippy. Perfect for a garden tour.' },
  atv:      { name: 'Quad Bike (ATV)', icon: '🛞', level: 12, cost: 35000, speed: 14, accel: 8, turn: 2.8, cargo: 20, offroad: true, desc: 'Four fat tyres: flies over fields and rough ground.' },
  pickup:   { name: 'Mahindra Pickup', icon: '🛻', level: 18, cost: 60000, speed: 15, accel: 6, turn: 2.2, cargo: 120, desc: 'Open back for 120 goods. Drive them to the Mandi.' },
  suv:      { name: 'Scorpio SUV', icon: '🚙', level: 24, cost: 150000, speed: 19, accel: 7.5, turn: 2.0, cargo: 40, desc: 'Fast, black and very Punjabi.' },
  truck:    { name: 'Delivery Truck', icon: '🚚', level: 28, cost: 220000, speed: 12, accel: 3.5, turn: 1.4, cargo: 300, desc: 'A painted Punjab truck that carries 300 goods.' },
  plane:    { name: 'Crop-duster Airplane', icon: '✈️', level: 30, cost: 500000, speed: 34, accel: 6, turn: 1.3, cargo: 0, desc: 'Fly over Patiala! Lives in the Navi Zameen hangar. Missions, rings, spraying.' },
};
// the airplane: engines bought at the hangar; fuel is used in the air and bought at the hangar
export const PLANE_ENGINES = [
  { name: 'Lycoming 180', top: 34, climb: 5, fuel: 100 },
  { name: 'Lycoming 260', top: 40, climb: 6.5, fuel: 130, cost: 120000, level: 32 },
  { name: 'Turbo 350', top: 47, climb: 8, fuel: 170, cost: 300000, level: 36 },
];
export const PLANE = {
  takeoff: 20, ceiling: 70, burn: 1 / 5, fuelPrice: 40,                 // burn: fuel per second in the air; ₹ per unit of fuel
  park: [92.5, 36, Math.PI], runway: { x0: 88, x1: 97, z0: -14, z1: 40 }, hangar: [92.5, 45.5],
  rings: [[60, -50, 14], [20, -35, 18], [-20, -45, 22], [-45, -10, 16], [-30, 30, 14], [10, 40, 20], [40, 20, 26], [75, 25, 12]],   // the sky tour, in order: x, z, height
  ringPay: 1500, ringXp: 60, ringTime: 150,
  kites: 12, kitePay: 150,                                                // patang to catch every day
  cargo: [{ name: 'Mangoes to Rajpura', x: -48, z: -60, pay: 4000 }, { name: 'Seeds to Sanaur', x: -40, z: 50, pay: 3500 }, { name: 'Milk to Sirhind', x: 30, z: -60, pay: 3800 }, { name: 'Spares to Bahadurgarh', x: 40, z: 48, pay: 3200 }],
  cargoTime: 120, sprayPay: 3,
};
export const ATTACHMENTS = {
  cultivator: { name: 'Cultivator',   action: 'till',    cost: 0,    level: 9 },
  seeder:     { name: 'Seed Drill',   action: 'plant',   cost: 1500, level: 9 },
  sprayer:    { name: 'Water Tanker', action: 'water',   cost: 2000, level: 10 },
  reaper:     { name: 'Reaper',       action: 'harvest', cost: 3500, level: 11 },
};
export const TRACTOR_HP = [
  { name: '35 HP', radius: 1.5, speed: 8.5 },
  { name: '50 HP', radius: 2.3, speed: 9.5,  cost: 8000,  level: 13 },
  { name: '75 HP', radius: 3.1, speed: 10.5, cost: 18000, level: 17 },
  { name: '90 HP', radius: 3.8, speed: 11.5, cost: 32000, level: 21 },
  { name: '120 HP', radius: 4.5, speed: 12.5, cost: 55000, level: 26 },
];
export const COMBINE_RADIUS = 3.4;
// Bullet engines (stored in vehicles.bike.hp): top speed m/s, acceleration m/s²
export const BIKE_ENGINES = [
  { name: 'Bullet 350', top: 13, accel: 5.0 },
  { name: 'Bullet 500', top: 15.5, accel: 6.2, cost: 6000, level: 8 },
  { name: 'Classic 650 · Gerhi Special', top: 18.5, accel: 7.6, cost: 16000, level: 14 },
  { name: 'Thunder 750', top: 20.5, accel: 8.6, cost: 30000, level: 20 },
  { name: 'Shahi 900 · Maharaja Edition', top: 22, accel: 9.6, cost: 52000, level: 26 },
];

// Aura Points: earned on the Bullet round the ring road (gerhi) and by finding the sights of
// Patiala, spent on paint jobs and extras. Daily caps keep it from being farmed.
export const AURA = {
  lap: 15, lapBest: 10, lapMin: 16, lapsPerDay: 8,          // a lap pays 15 (best lap +10), 8 laps a day; under 16 s is a glitch
  distEvery: 200, distPerDay: 60,                            // +1 per 200 m ridden on the ring, 60 a day
  goal: 25,                                                  // each daily challenge
  spots: [
    { id: 'pulN', name: 'Bhakhra Pul (north)', icon: '🌉', x: -43.6, z: -68.4, r: 5, pts: 20 },
    { id: 'pulS', name: 'Bhakhra Pul (south)', icon: '🌉', x: -43.6, z: 50.5, r: 5, pts: 20 },
    { id: 'gurdwaraBack', name: 'Gurdwara back road', icon: '🙏', x: 0, z: -69, r: 5, pts: 20 },
    { id: 'qila', name: 'Qila Mubarak view', icon: '🏰', x: -18, z: -69, r: 5, pts: 20 },
    { id: 'bhatta', name: 'Bhatta (brick kiln) corner', icon: '🧱', x: -46, z: -63, r: 5, pts: 20 },
    { id: 'flyE', name: '22 No. underpass (east)', icon: '🌉', x: 44.5, z: -23.5, r: 5, pts: 20 },
    { id: 'flyW', name: '22 No. underpass (west)', icon: '🌉', x: -50.5, z: -23.5, r: 5, pts: 20 },
    { id: 'footbridge', name: 'Nehar footbridge', icon: '🚶', x: -44, z: 2.5, r: 2.5, pts: 20 },
    { id: 'mandiRoad', name: 'Mandi road junction', icon: '🧺', x: 10, z: 51, r: 5, pts: 20 },
  ],
  goals: [
    { id: 'laps1', text: 'Ride a full lap of the ring road', type: 'laps', n: 1 },
    { id: 'laps3', text: 'Ride 3 laps of the ring road', type: 'laps', n: 3 },
    { id: 'km2', text: 'Ride 2 km on the ring road', type: 'dist', n: 2000 },
    { id: 'km4', text: 'Ride 4 km on the ring road', type: 'dist', n: 4000 },
    { id: 'fast', text: 'Ride a lap in under 50 seconds', type: 'fast', n: 50 },
    { id: 'bridges', text: 'Ride over both Bhakhra bridges', type: 'spots', ids: ['pulN', 'pulS'] },
    { id: 'unders', text: 'Ride under both ends of the 22 No. flyover', type: 'spots', ids: ['flyE', 'flyW'] },
    { id: 'dusk', text: 'Ride a lap after sunset, headlight on', type: 'dusk', n: 1 },
  ],
  miles: [
    { id: 'd5', text: 'Ride 5 km', stat: 'dist', n: 5000, pts: 50 },
    { id: 'd20', text: 'Ride 20 km', stat: 'dist', n: 20000, pts: 100 },
    { id: 'd50', text: 'Ride 50 km — Gerhi Raja', stat: 'dist', n: 50000, pts: 200 },
    { id: 'd100', text: 'Ride 100 km', stat: 'dist', n: 100000, pts: 400 },
    { id: 'l10', text: 'Ride 10 laps', stat: 'laps', n: 10, pts: 50 },
    { id: 'l50', text: 'Ride 50 laps', stat: 'laps', n: 50, pts: 150 },
    { id: 'l100', text: 'Ride 100 laps', stat: 'laps', n: 100, pts: 300 },
  ],
  // spend Aura: paint jobs and extras for the Bullet
  rewards: {
    maroon: { name: 'Maroon paint', icon: '🟥', cost: 150, paint: 0x7a1424 },
    fauji: { name: 'Fauji green paint', icon: '🟩', cost: 150, paint: 0x4b5a2f },
    royal: { name: 'Royal blue paint', icon: '🟦', cost: 200, paint: 0x1c3f94 },
    chrome: { name: 'Chrome tank', icon: '🪩', cost: 350, paint: 0xd8dde3 },
    ribbons: { name: 'Handlebar ribbons', icon: '🎀', cost: 100 },
    horn: { name: 'Patiala pressure horn', icon: '📯', cost: 120 },
    lamps: { name: 'Twin fog lamps', icon: '💡', cost: 180 },
    title: { name: '"Gerhi Raja" title', icon: '👑', cost: 300 },
  },
};
export const TANKER_CAP = 120;

// Managers run a whole department on their own. Hire them at their desk in the world (stand on
// the white ring) or from the 👔 Staff menu, then train them through eight ranks.
// look: how they are dressed; tool: what they carry around.
export const MANAGERS = {
  dukaandar: { name: 'Dukaandar', role: 'Shop manager', icon: '🧺', level: 5, hire: 1200, salary: 80, tool: 'book',
    look: { turban: 0xf76707, shirt: 0xfff3bf, pants: 0xf2eee2, apron: 0x2b8a3e }, desc: 'Carries goods from the godown to your Mandi stall, keeps it stocked and banks the cash pile.' },
  pali: { name: 'Pali', role: 'Animal manager', icon: '🐄', level: 12, hire: 4000, salary: 180, tool: 'bucket',
    look: { turban: 0x2b8a3e, shirt: 0xffec99, pants: 0x495057, sash: 0x2b8a3e }, desc: 'Feeds and waters every animal and moves eggs, milk and wool to the godown.' },
  munshi: { name: 'Munshi', role: 'Sales manager', icon: '📒', level: 14, hire: 6000, salary: 220, tool: 'book',
    look: { turban: 0xffffff, shirt: 0xf8f9fa, pants: 0xf8f9fa, vest: 0x343a40, glasses: true }, desc: 'Fills customer orders from the godown and sells surplus at the Arhtiya (keeps 15 of each).' },
  mistri: { name: 'Mistri', role: 'Workshop manager', icon: '🔧', level: 15, hire: 7000, salary: 260, tool: 'wrench',
    look: { turban: 0x1c4fd1, shirt: 0xadb5bd, pants: 0x343a40, apron: 0x5c4033 }, desc: 'Keeps every workshop busy from godown stock and stores the finished goods.' },
};
// work: share of a full worker's pace (walking and each job, and offline work too)
export const SEERI = { name: 'Seeri', role: 'Field manager', icon: '🧑‍🌾', level: 10, hire: 2500, salary: 120, tool: 'hoe', work: 0.5,
  look: { turban: 0xf2c400, shirt: 0xe9ecef, pants: 0x495057 }, desc: 'Tills, plants, waters and harvests one field. Buys seeds and sends crops to the godown.' };
export const STAFF = { seeri: SEERI, ...MANAGERS };
// Ranks: speed multiplies walking and working; training costs hire × costMul; wages grow 30% a rank
export const MANAGER_RANKS = [
  { name: 'Naya', speed: 1.0 },
  { name: 'Tajurbekar', speed: 1.3, costMul: 1.2 },
  { name: 'Mahir', speed: 1.65, costMul: 3 },
  { name: 'Ustad', speed: 2.1, costMul: 7 },
  { name: 'Sardar', speed: 2.7, costMul: 15 },
  { name: 'Numberdar', speed: 3.2, costMul: 26 },
  { name: 'Zaildar', speed: 3.7, costMul: 45 },
  { name: 'Maharaja', speed: 4.3, costMul: 75 },
  // added in release 12: four more levels, very dear
  { name: 'Sarpanch', speed: 4.8, costMul: 130 },
  { name: 'Jathedar', speed: 5.3, costMul: 220 },
  { name: 'Nawab', speed: 5.8, costMul: 360 },
  { name: 'Badshah', speed: 6.4, costMul: 600 },
];
export const WALK_MAX = 3;            // fast ranks work quicker but never walk faster than ×3
export const wage = (base, rank) => Math.round(base * (1 + rank * 0.3));
export const MUNSHI_KEEP = 15;
export const MUNSHI_RATE = 0.9;
export const DUKAANDAR_KEEP = 5;      // the Dukaandar leaves this many of each item in the godown
export const OFFLINE_HOURS = 2;       // managers keep working this long while the game is closed

// Gurdwara Dukh Niwaran Sahib
export const GURU = {
  bowSoul: 10, streakBonus: 2, streakMax: 7,
  blessLuck: 0.15,          // extra chance of a double harvest while blessed
  blessPrice: 0.10,         // extra mandi price while blessed
  langarItemsPerSoul: 5, langarDailySoul: 25,
};
export const SOUL_PERKS = [
  { at: 30,  id: 'sabar',  name: 'Sabar',       desc: 'Crops grow 5% faster',         grow: 0.05 },
  { at: 100, id: 'seva',   name: 'Seva',        desc: '+5% mandi prices',             price: 0.05 },
  { at: 250, id: 'mehar',  name: 'Mehar',       desc: '+5% double harvest luck',      luck: 0.05 },
  { at: 500, id: 'chardi', name: 'Chardi Kala', desc: 'Crops grow 10% more faster',   grow: 0.10 },
  { at: 900, id: 'sarbat', name: 'Sarbat da Bhala', desc: '+10% mandi prices',        price: 0.10 },
  { at: 1500, id: 'nimrata', name: 'Nimrata',   desc: '+5% double harvest luck',      luck: 0.05 },
  { at: 2500, id: 'anand',   name: 'Anand',     desc: 'Crops grow 10% more faster',   grow: 0.10 },
  { at: 4000, id: 'sehaj',   name: 'Sehaj',     desc: '+10% mandi prices',            price: 0.10 },
];

// Tutorial / story missions, completed in order. `target` names a guide-arrow location.
export const QUESTS = [
  { type: 'till',    n: 4, text: 'Till 4 plots — walk over the soil in your khet', target: 'f1', reward: 10 },
  { type: 'plant',   n: 4, text: 'Plant 4 wheat seeds', target: 'f1', reward: 10 },
  { type: 'water',   n: 4, text: 'Water 4 crops (refill at the tubewell)', target: 'f1', reward: 10 },
  { type: 'harvest', n: 4, text: 'Harvest 4 crops when they turn golden', target: 'f1', reward: 15 },
  { type: 'stock',   n: 6, text: 'Put 6 items on your Mandi stall', target: 'stall', reward: 15 },
  { type: 'collect', n: 1, text: 'Pick up your money from the stall', target: 'pile', reward: 10 },
  { type: 'bow',     n: 1, text: 'Visit Gurdwara Dukh Niwaran Sahib and matha tek', target: 'darbar', reward: 25 },
  { type: 'buySeed', n: 1, key: 'carrot', text: 'Buy carrot seeds in the Shop', reward: 10 },
  { type: 'upgrade', n: 1, key: 'bag', text: 'Upgrade your Jhola to a Bori in the Shop', reward: 20 },
  { type: 'buyField', n: 1, text: 'Buy Uttar wala Khet (stand on its pad)', target: 'f2', reward: 30 },
  { type: 'order',   n: 1, text: 'Complete a customer order at the board', target: 'board', reward: 30 },
  { type: 'level',   n: 4, text: 'Reach level 4', reward: 50 },
  { type: 'langar',  n: 10, text: 'Give 10 items to the Langar at the Gurdwara', target: 'langar', reward: 40 },
  { type: 'build',   n: 1, key: 'coop', text: 'Build the Murgi Khana (chicken coop)', target: 'coop', reward: 60 },
  { type: 'product', n: 6, key: 'egg', text: 'Collect 6 eggs', target: 'coop', reward: 60 },
  { type: 'build',   n: 1, key: 'chakki', text: 'Build the Atta Chakki', target: 'chakki', reward: 80 },
  { type: 'make',    n: 4, key: 'atta', text: 'Grind 4 atta at the chakki', target: 'chakki', reward: 80 },
  { type: 'hire',    n: 1, key: 'dukaandar', text: 'Hire a Dukaandar to run your Mandi stall', target: 'dukaandar', reward: 150 },
  { type: 'build',   n: 1, key: 'tabela', text: 'Build the Tabela for cows and buffaloes', target: 'tabela', reward: 120 },
  { type: 'vehicle', n: 1, key: 'tractor', text: 'Buy your first tractor (level 9)', target: 'garage', reward: 200 },
  { type: 'tractor', n: 12, text: 'Work 12 plots with the tractor', reward: 200 },
  { type: 'build',   n: 1, key: 'dairy', text: 'Build the Dairy', target: 'dairy', reward: 250 },
  { type: 'hire',    n: 1, key: 'seeri', text: 'Hire a Seeri to run a field', reward: 300 },
  { type: 'level',   n: 15, text: 'Reach level 15', reward: 500 },
  { type: 'hire',    n: 1, key: 'munshi', text: 'Hire the Munshi', reward: 500 },
  { type: 'build',   n: 1, key: 'halwai', text: 'Build the Halwai shop', target: 'halwai', reward: 800 },
  { type: 'make',    n: 6, key: 'pinni', text: 'Make 6 pinnis', target: 'halwai', reward: 1000 },
  { type: 'vehicle', n: 1, key: 'combine', text: 'Buy a combine harvester', target: 'garage', reward: 1500 },
  { type: 'build',   n: 1, key: 'khaddi', text: 'Open the Phulkari workshop', target: 'khaddi', reward: 2000 },
  { type: 'fields',  n: 8, text: 'Own all 8 fields', reward: 3000 },
  { type: 'level',   n: 30, text: 'Reach level 30 — a true Patiala zamindar', reward: 5000 },
  { type: 'buySeed', n: 1, key: 'peas', text: 'Buy matar (pea) seeds in the Shop', reward: 3000 },
  { type: 'make',    n: 10, key: 'khes', text: 'Weave 10 khes blankets', target: 'khaddi', reward: 4000 },
  { type: 'order',   n: 15, text: 'Complete 15 customer orders', target: 'board', reward: 5000 },
  { type: 'level',   n: 35, text: 'Reach level 35', reward: 8000 },
  { type: 'make',    n: 12, key: 'achaar', text: 'Make 12 jars of achaar at the Dhaba', target: 'dhaba', reward: 8000 },
  { type: 'langar',  n: 100, text: 'Give 100 items to the Langar', target: 'langar', reward: 6000 },
  { type: 'buySeed', n: 1, key: 'peanut', text: 'Buy moongphali (peanut) seeds in the Shop', reward: 8000 },
  { type: 'level',   n: 40, text: 'Reach level 40', reward: 12000 },
  { type: 'make',    n: 20, key: 'phulkari', text: 'Embroider 20 phulkaris', target: 'khaddi', reward: 15000 },
  { type: 'level',   n: 50, text: 'Reach level 50 — the Maharaja of Patiala farming', reward: 25000 },
  { type: 'rose',    n: 8, text: 'Find 8 hidden roses in Baradari Gardens', target: 'baradari', reward: 6000 },
  { type: 'wish',    n: 1, text: 'Make a wish at the Baradari fountain', target: 'baradari', reward: 3000 },
  { type: 'decorPlaced', n: 5, text: 'Decorate your farm: place 5 items from Shop → Garden', reward: 8000 },
  { type: 'fruit',   n: 12, text: 'Pick 12 fruits from your own fruit trees', reward: 10000 },
  { type: 'caseClosed', n: 1, text: 'Settle a theft case with the police (if a thief strikes)', target: 'police', reward: 12000 },
  { type: 'gardenDone', n: 3, text: 'Complete the Baradari rose challenge 3 days', target: 'baradari', reward: 20000 },
  { type: 'level',   n: 55, text: 'Reach level 55', reward: 40000 },
  { type: 'level',   n: 60, text: 'Reach level 60 — Maharaja of the whole of Punjab', reward: 80000 },
];

export const ACHIEVEMENTS = [
  { id: 'h100',   text: 'Harvest 100 crops',            stat: 'harvested', n: 100 },
  { id: 'h1000',  text: 'Harvest 1,000 crops',          stat: 'harvested', n: 1000 },
  { id: 'e1k',    text: 'Earn ₹1,000',                  stat: 'earned', n: 1000 },
  { id: 'e100k',  text: 'Earn ₹1,00,000',               stat: 'earned', n: 100000 },
  { id: 'chick10', text: 'Keep 10 chickens',            stat: 'chickens', n: 10 },
  { id: 'trac',   text: 'Buy a tractor',                stat: 'tractor', n: 1 },
  { id: 'prod1',  text: 'Open a workshop',              stat: 'buildings', n: 1 },
  { id: 'staff1', text: 'Hire your first worker',       stat: 'staff', n: 1 },
  { id: 'rank5',  text: 'Train a manager to Sardar rank', stat: 'topRank', n: 4 },
  { id: 'auto',   text: 'Fully automate a field',       stat: 'seeris', n: 1 },
  { id: 'darshan7', text: '7-day Gurdwara streak',      stat: 'streak', n: 7 },
  { id: 'soul100', text: 'Earn 100 soul points',        stat: 'soul', n: 100 },
  { id: 'orders25', text: 'Complete 25 orders',         stat: 'orders', n: 25 },
  { id: 'langar100', text: 'Give 100 items to the Langar', stat: 'langar', n: 100 },
  { id: 'h10k',   text: 'Harvest 10,000 crops',         stat: 'harvested', n: 10000 },
  { id: 'e10l',   text: 'Earn ₹10,00,000',              stat: 'earned', n: 1000000 },
  { id: 'rank8',  text: 'Train a manager to Maharaja rank', stat: 'topRank', n: 7 },
  { id: 'orders100', text: 'Complete 100 orders',       stat: 'orders', n: 100 },
  { id: 'soul1000', text: 'Earn 1,000 soul points',     stat: 'soul', n: 1000 },
  { id: 'langar1000', text: 'Give 1,000 items to the Langar', stat: 'langar', n: 1000 },
  { id: 'roses50', text: 'Collect 50 Baradari roses', stat: 'roses', n: 50 },
  { id: 'decor25', text: 'Place 25 decorations', stat: 'decor', n: 25 },
  { id: 'caught1', text: 'Get your goods back from a thief', stat: 'caught', n: 1 },
  { id: 'outfits5', text: 'Own 5 outfits', stat: 'outfits', n: 5 },
  { id: 'outfitsAll', text: 'Own every outfit in the wardrobe', stat: 'outfits', n: 36 },
  { id: 'beauty700', text: 'Make your farm Beautiful (beauty 700)', stat: 'beauty', n: 700 },
  { id: 'beauty2000', text: 'Make your farm Royal (beauty 2000)', stat: 'beauty', n: 2000 },
  { id: 'themePink', text: 'Place 10 Pink Paradise pieces', stat: 'pinkDecor', n: 10 },
  { id: 'eastLand', text: 'Own land in Navi Zameen', stat: 'eastFields', n: 1 },
  { id: 'eastAll', text: 'Own every Navi Zameen field', stat: 'eastFields', n: 6 },
  { id: 'orchard100', text: 'Pick 100 fruit in the orchard', stat: 'orchardFruit', n: 100 },
  { id: 'fly1', text: 'Take off in your airplane', stat: 'flights', n: 1 },
  { id: 'skyTour', text: 'Finish the sky tour', stat: 'tours', n: 1 },
  { id: 'kites50', text: 'Catch 50 kites in the sky', stat: 'kites', n: 50 },
  { id: 'cargo10', text: 'Fly 10 cargo runs', stat: 'cargoRuns', n: 10 },
  { id: 'garage5', text: 'Own 5 vehicles', stat: 'vehicles', n: 5 },
];

export const CUSTOMER_LINES = [
  'Sat Sri Akal ji!', 'Wah, taaze taaze!', 'Kinne da?', 'Vadhiya maal aa!', 'Ghar layi le chaliye',
  'Patiale di shaan!', 'Ik hor dena ji', 'Bahut vadhiya!', 'Chaa naal khavange', 'Rabb mehar kare!',
];
// said while buying (haggling); the stall sometimes answers back
export const CUSTOMER_BARGAIN = [
  'Kujh ghatt karo ji!', 'Pichhli vaari sasta si!', 'Dhaniya muft paa do 🌿', 'Do kilo lavanga, ik de paise 😅',
  'Tarazu theek aa na? 👀', 'Bhaji, rate sun ke chakkar aa gaya', 'Online te sasta milda!', 'Main tuhada purana customer aan!',
  'Bebe ne kiha si mol-bhaa karin', 'Ik free, ik paid?', 'Change nahi, Paytm chalega?', 'Inne paise ch Bullet aa jaandi!',
];
export const SELLER_REPLIES = [
  'Fixed rate ji, taaza maal! 🙏', 'Bhaji, eh Patiale da maal aa!', 'Dhaniya khatam, pyaar haazir aa 😄', 'Tarazu ekdum sachcha, aap check karo!',
  'Online wale tuhanu gajar nahi bhejde 😏', 'Tusi tan ghar de ho ji!', 'Ajj discount: muskaan free! 😁', 'Chalo, ik mirch free 🌶️',
];
export const CUSTOMER_EMPTY = ['🤔 Kuj taaza?', 'Dukaan khulli, maal kithe?', 'Shelf khaali kyon aa?'];
export const CUSTOMER_GIVEUP = ['Kujh nahi? Kal aavange', 'Gopal di dukaan chalde aan 🍥', 'Khaali haath ghar? Bebe gussa karegi!'];

// Reviews customers leave as they walk away (picked in reviews.js). stars 1–5; `for` ties a
// review to what they bought; `when` ties it to how the visit went: wait = long queue,
// empty = the shelf ran out, gaveup = left with nothing, price = prices well above normal.
// Every bad review (1–2 stars) has a `when`, so a customer only complains with a reason.
export const REVIEWS = [
  // a long queue
  { s: 1, when: 'wait', t: 'Line vich khade khade meri dadhi chitti ho gayi 👴' },
  { s: 1, when: 'wait', t: 'Inni der ch tan main aap kanak ugga laindi 🌾' },
  { s: 2, when: 'wait', t: 'Line inni lambi, PRTC bus jaldi aa jaandi 🚌' },
  { s: 2, when: 'wait', t: 'Intezaar karde karde do serial mukk gaye 📺' },
  { s: 2, when: 'wait', t: 'Aadha ghanta line ch? Dukaandar ji, ik hor counter kholo 🙏' },
  { s: 2, when: 'wait', t: 'Line ch khade khade gawandi naal rishta pakka ho gaya 💍' },
  { s: 3, when: 'wait', t: 'Thodi line si, par maal vadhiya. Agli vaari jaldi karna ji 👍' },
  { s: 3, when: 'wait', t: 'Intezaar karna peya, par taaze maal layi chalda ⏳' },
  { s: 3, when: 'wait', t: 'Line lambi si, par dukaandar ne hass ke gal kitti 😊' },
  // the shelf ran out before they got everything
  { s: 1, when: 'empty', t: 'Shelf khaali, dil khaali, jeb vi khaali 😢' },
  { s: 2, when: 'empty', t: 'Adha samaan mileya. Adhi khushi. 2 star 😐' },
  { s: 2, when: 'empty', t: 'Jo chahida si oh mukk gaya. Bebe ne list vaapas bhej ditti 📝' },
  { s: 2, when: 'empty', t: 'Shelf te ajj sirf hawa si. Hawa tan ghar vi hai 🌬️' },
  { s: 3, when: 'empty', t: 'Mera pasandida maal mukk gaya, baaki theek si 🙂' },
  { s: 3, when: 'empty', t: 'Thoda hi mileya, par jo mileya vadhiya si 👌' },
  // left with nothing
  { s: 1, when: 'gaveup', t: 'Kujh vi nahi mileya! Khaali haath ghar, Bebe gussa 😤' },
  { s: 1, when: 'gaveup', t: 'Khaali dukaan vekhan aaye si? Waah ji waah 👏' },
  { s: 2, when: 'gaveup', t: 'Gopal di dukaan chale gaye, othe ghatt ton ghatt jalebi tan si 🍥' },
  { s: 2, when: 'gaveup', t: 'Inni door aaye, khaali mudde. Petrol de paise kaun dau? ⛽' },
  { s: 3, when: 'gaveup', t: 'Ajj kujh nahi si, kal phir aavange. Umeed te duniya kaayam 🙏' },
  { s: 3, when: 'gaveup', t: 'Maal mukk gaya si, par dukaandar ne paani pilaya. Changi gal 💧' },
  // prices pushed well above normal
  { s: 2, when: 'price', t: 'Rate sun ke mera BP high ho gaya 🩺' },
  { s: 2, when: 'price', t: 'Ajj rate asmaan te! Mausam vaangu badalde 🌦️' },
  { s: 2, when: 'price', t: 'Inne paise ch tan Bullet di service ho jaandi 🏍️' },
  { s: 2, when: 'price', for: 'carrot', t: 'Gajar inni mehngi? Sone di bani aa? 🥕' },
  { s: 2, when: 'price', for: 'tomato', t: 'Tamatar inne laal, sharma rahe ne ya mehngaai ton? 🍅' },
  { s: 2, when: 'price', for: 'mustard', t: 'Sarson vekh ke DDLJ yaad aayi, rate vekh ke rona 🌼' },
  { s: 3, when: 'price', t: 'Thoda mehnga, par maal ekdum A-one 👌' },
  { s: 3, when: 'price', t: 'Rate vadh, par mithas vi vadh. Chalo theek aa 🍯' },
  // friendly three stars
  { s: 3, t: 'Theek-thaak. Agli vaari dhaniya vi rakhna 🌿' },
  { s: 3, t: 'Maal changa, dukaandar thoda chup-chup. Smile karo ji 😄' },
  { s: 3, t: 'Change di jagah toffee mili. Chalo, mooh mitha ho gaya 🍬' },
  { s: 3, t: 'Free sample nahi mileya, par maal changa 🥲' },
  { s: 3, for: 'strawberry', t: 'Strawberry? Patiale ch? Jatt fancy ho gaye 🍓' },
  { s: 3, for: 'potato', t: 'Aloo vich thodi mitti, par khet da taaza aa 🥔' },
  { s: 3, for: 'egg', t: 'Ik anda tutt gaya, meri galti si. Baaki vadhiya 🥚' },
  { s: 3, for: 'cauliflower', t: 'Bebe kehndi ghar di gobhi vadhiya. Bebe hamesha sahi 🥦' },
  { s: 3, for: 'maize', t: 'Makki tan le layi, hun saag kithon laiye? 🌽' },
  { s: 3, for: 'chilli', t: 'Hari mirch ne rula ditta. Akhaan vi, dil vi 😭' },
  { s: 3, for: 'ghee', t: 'Ghee vekh ke cholesterol ne chhutti lai layi 🍯' },
  { s: 3, for: 'atta', t: 'Atta vadhiya, par rotiyan main hi pakauniyan? 🫓' },
  { s: 3, for: 'mithai', t: "Gopal di mithai ithe? Gopal nu dassanga! 🍥" },
  // and the good ones
  { s: 5, t: 'Dukaandar ne naam leke bulaya. Ghar wargi feeling ❤️' },
  { s: 5, t: 'Saaf-suthri dukaan, taaza maal. Hor ki chahida? 👌' },
  { s: 5, t: 'Bebe ne kiha, ehi dukaan ton leya kar. Hukam mann leya 🙏' },
  { s: 5, t: 'Rate vi sahi, tolna vi sahi. Imaandaar dukaandar 🤝' },
  { s: 4, t: 'Jaldi kamm, hass ke gal. Vadhiya! 😄' },
  { s: 4, t: 'Maal changa, rate theek. Hafte ch do vaari aavange 🗓️' },
  { s: 4, t: 'Wifi nahi si, par maal 4G di speed naal mileya 📶' },
  { s: 5, t: 'Ekdum taaza! Rabb tuhanu taraqqi deve 🙏' },
  { s: 5, t: 'Patiale di shaan, tuhadi dukaan! 👑' },
  { s: 4, t: 'Dukaandar bada hasmukh, rate vi theek 👍' },
  { s: 5, t: 'Ghar wali khush, main khush, sab khush 😄' },
  { s: 5, t: 'Mandi Patiale di number 1 🥇' },
  { s: 4, t: 'Vadhiya maal. 5 star nahi dinda, aadat nahi 😏' },
  { s: 5, t: 'Inni sohni dukaan, selfie banti aa 🤳' },
  { s: 4, t: 'Taaza maal, sachchi gal. Phir aavange 😊' },
  { s: 5, for: 'tomato', t: 'Tuhade tamatar ne meri chutney bachaa layi 🍅' },
  { s: 5, for: 'potato', t: 'Inne sohne aalu, Insta te paavangi 📸' },
  { s: 5, for: 'carrot', t: 'Gajar da halwa banauna, Bebe khush ho jaavegi 🥕' },
  { s: 5, for: 'wheat', t: 'Kanak sone vargi chamakdi aa ✨' },
  { s: 5, for: 'sugarcane', t: 'Ganne da ras pee ke Bullet vargi taakat 🏍️' },
  { s: 5, for: 'watermelon', t: 'Thanda hadwana, garmi gayi bhaad ch 🍉' },
  { s: 4, for: 'watermelon', t: 'Hadwana inna vadda, ghar layi tractor chahida 🍉' },
  { s: 5, for: 'paneer', t: 'Paneer inna soft, mera dil pighal gaya 🧀' },
  { s: 5, for: 'lassi', t: 'Lassi pee ke neend aa gayi. Kamm kal karange 😴' },
  { s: 5, for: 'pinni', t: 'Pinni khaa ke Naani di yaad aa gayi 🥹' },
  { s: 5, for: 'gur', t: 'Gur di khushboo ne pind yaad karaa ditta 🟫' },
  { s: 5, for: 'thali', t: 'Saag te makki di roti! Swarg ithe hi aa 🍛' },
  { s: 5, for: 'paratha', t: 'Makkhan wala paratha? Hun diet kal ton 😂' },
  { s: 5, for: 'achaar', t: 'Achaar inna teekha, gawandiyan nu vi pata lagg gaya 🌶️' },
  { s: 5, for: 'phulkari', t: 'Phulkari vekh ke Dadi ji ro paye. Khushi de hanju 🧣' },
  { s: 5, for: 'khes', t: 'Khes ch aisi neend, alarm vi sharminda 😴' },
  { s: 5, for: 'makkhan', t: 'Makkhan inna changa, roti vi sharma gayi 🧈' },
  { s: 5, for: 'egg', t: 'Desi anda, desi taakat 💪' },
  { s: 5, for: 'mithai', t: 'Mithai da dabba! Rishta pakka 😍🎁' },
  { s: 5, for: 'peas', t: 'Taaze matar! Ajj matar-paneer banega 🫛' },
  { s: 3, for: 'onion', t: 'Pyaaz kattde hoye rona aa gaya, par maal vadhiya 🧅' },
  { s: 5, for: 'garlic', t: 'Lehsun di tadka, poore mohalle nu khushboo 🧄' },
  { s: 5, for: 'peanut', t: 'Garam moongphali te sardi di dhupp. Swaad aa gaya 🥜' },
  { s: 5, when: 'blessed', t: 'Dukh Niwaran Sahib di kirpa, maal vich barkat 🙏' },
];
export const REVIEW_KEEP = 40;            // reviews kept in the save (newest first)

// Travelling vendors stop at the mandi with a deal for a couple of minutes.
// kind: seeds (cheap seed bundle), bundle (cheap goods), buyer (pays extra for one item),
// khaad (instant crop growth), chai (walk faster), kulfi (happier customers), tools (cheap upgrade)
export const VENDOR_GAP = [140, 260];     // seconds between visits
export const VENDOR_STAY = 110;           // seconds a vendor waits at the mandi
export const VENDORS = {
  beej:   { name: 'Bhola Beej Wala', icon: '🌱', kind: 'seeds', look: { turban: 0x2b8a3e, shirt: 0xd3f9d8, pants: 0x495057 }, cart: [0xd9c49a, 0x6dbb3c],
    lines: ['Beej lai lo, beej! Sone vargi fasal! 🌱', 'Pakke beej, pakki fasal!', 'Ik vaari beejo, saal bhar khush raho!'] },
  pheri:  { name: 'Pappu Pheriwala', icon: '🛺', kind: 'bundle', look: { turban: 0x1c7ed6, shirt: 0xfff3bf, pants: 0x868e96 }, cart: [0xff922b, 0xf8f9fa],
    lines: ['Pheri wala aaya! Sasta maal, vadhiya maal!', 'Ajj di deal, kal nahi milni!', 'Bebe ji, ik vaari vekh tan lao!'] },
  vapari: { name: 'Vapari Kartar Singh', icon: '💵', kind: 'buyer', look: { turban: 0xffffff, shirt: 0xf8f9fa, pants: 0xf8f9fa, vest: 0x5c4033, glasses: true }, cart: [0xb07a43, 0x8a5a2b],
    lines: ['Maal vecho, nakad paise lao! 💵', 'Mandi ton vadh rate! Sirf ajj!', 'Changa maal, changa bhaa!'] },
  khaad:  { name: 'Karnail Khaad Wala', icon: '🧪', kind: 'khaad', look: { turban: 0x5f3dc4, shirt: 0xe9ecef, pants: 0x343a40 }, cart: [0xf1f3f5, 0x4c6ef5],
    lines: ['Urea-DAP! Fasal ho jau double! 🌾', 'Khaad pao, fasal vadhao!', 'Ik bori, khet hasse!'] },
  chai:   { name: 'Channi Chaiwala', icon: '☕', kind: 'chai', look: { turban: 0xc92a2a, shirt: 0xffe8cc, pants: 0x495057, apron: 0x8a5a2b }, cart: [0xadb5bd, 0xffd8a8],
    lines: ['Chaa garam! Adrak waali! ☕', 'Cutting chaa, full energy!', 'Ik cup, te Bullet vargi speed!'] },
  kulfi:  { name: 'Kaka Kulfi Wala', icon: '🍦', kind: 'kulfi', look: { turban: 0xf783ac, shirt: 0xffffff, pants: 0x495057 }, cart: [0xc92a2a, 0xfff3bf],
    lines: ['Kulfi! Malai waali kulfi! 🍦', 'Garmi bhagao, kulfi khao!', 'Customer khush, tusi khush!'] },
  lohar:  { name: 'Lakhbir Lohar', icon: '🔧', kind: 'tools', look: { turban: 0x343a40, shirt: 0xadb5bd, pants: 0x343a40, apron: 0x5c4033 }, cart: [0x868e96, 0x495057],
    lines: ['Sand banvao, sasta banvao! 🔧', 'Lohe da kamm, pakka kamm!', 'Ajj discount, kal nahi!'] },
};

// Gopal's Sweets: eat a sweet for a boost, buy a mithai box, or fill Gopal ji's daily list.
// boost: seconds of an effect; grow: share of grow time added to every growing crop at once.
export const BOOST_TIME = 180;
export const SWEETS = {
  jalebi: { name: 'Garam Jalebi', icon: '🍥', cost: (l) => 30 + l * 6, desc: 'Walk 30% faster for 3 min', boost: 'speed' },
  ladoo:  { name: 'Motichoor Ladoo', icon: '🟠', cost: (l) => 50 + l * 15, desc: 'Every growing crop jumps 30% ahead', grow: 0.3 },
  jamun:  { name: 'Gulab Jamun', icon: '🟤', cost: (l) => 80 + l * 20, desc: 'Mandi prices +12% for 3 min', boost: 'price' },
  barfi:  { name: 'Kaju Barfi', icon: '⬜', cost: (l) => 60 + l * 15, desc: 'Happy customers for 3 min: better reviews, they buy more', boost: 'happy' },
  dabba:  { name: 'Mithai da Dabba', icon: '🎁', cost: () => 450, desc: 'A box of mithai for your bag: gift it to a friend or sell it', item: 'mithai' },
};
export const BOOSTS = { speed: 0.3, price: 0.12, happy: 1 };
export const GOPAL_LINES = ['Garam garam jalebiyan! 🍥', 'Patiale di sab ton mithi dukaan!', 'Ladoo khao, khushiyan manao!', 'Shudh desi ghee di mithai!', 'Gopal di mithai, mooh ch ghul jaave!'];
export const GOPAL_BUYS = ['milk', 'gur', 'ghee', 'makkhan', 'paneer', 'atta', 'sugarcane', 'wheat', 'strawberry', 'egg'];
export const GOPAL_RATE = 1.35;           // Gopal ji pays this much over the mandi price for his list

// Crows raid growing crops now and then while you play. They never destroy a crop: pecked
// plots lose some growth (setback = share of the grow time). Walk up to shoo them, or put up
// scarecrows: each guards the plots within its radius (guard = chance a raid is turned away).
export const CROWS = { level: 3, gap: [75, 150], peck: 8, setback: 0.3, plots: [1, 3], shoo: 3.4 };
export const SCARECROW_DESIGNS = {
  daravna: { name: 'Daravna', icon: '🧍', desc: 'The classic: matka head, old kurta and a pagg' },
  fauji:   { name: 'Fauji', icon: '🪖', desc: 'Khaki uniform and a stern moustache' },
  bhoot:   { name: 'Chitta Bhoot', icon: '👻', desc: 'A white sheet that flaps in the wind' },
};
export const SCARECROW_LEVELS = [
  { name: 'Basic',  radius: 4.5, guard: 0.75, cost: 350,  level: 3 },
  { name: 'Strong', radius: 6.5, guard: 0.9,  cost: 1200, level: 7,  adds: 'tin-can rattles and ribbons' },
  { name: 'Ustad',  radius: 9,   guard: 1.0,  cost: 3600, level: 12, adds: 'a spinning phirki and shiny reflectors' },
  { name: 'Sardar', radius: 11.5, guard: 1.0, cost: 8000, level: 17, adds: 'brass bells and a bright pennant' },
  { name: 'Maharaja', radius: 14, guard: 1.0, cost: 16000, level: 22, adds: 'a golden kalgi and a second phirki' },
];
export const SCARECROW_MAX = 8;

// Online friends (live gifts, chat, guestbooks, riding together) use a Firebase Realtime
// Database (see docs/ONLINE-SETUP.md); set this to null to switch them off again.
// A Firebase web config is not a secret: the database rules decide what anyone can do.
export const ONLINE = {
  apiKey: 'AIzaSyClSc_72fejViiVheHzyEl_FoPql_cH95E',
  authDomain: 'patiala-kisan.firebaseapp.com',
  databaseURL: 'https://patiala-kisan-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'patiala-kisan',
  storageBucket: 'patiala-kisan.firebasestorage.app',
  messagingSenderId: '124247591228',
  appId: '1:124247591228:web:d14eee8988067d22c7b639',
};
export const SOCIAL = {
  giftsPerDay: 10, giftItems: (lvl) => Math.min(60, 8 + lvl * 2),       // per gift
  chatLen: 160, chatPerMinute: 8, boardLen: 120, boardGap: 600,           // seconds between posts on one board
  boardKeep: 30, historyKeep: 60, onlineFor: 90,                          // seconds since last seen = "online"
};

// ---------------------------------------------------------------- level rewards
// Every level from the update on pays a gift (older levels were passed before it existed).
// Levels carry on without end; the content (crops, decorations, statues) runs up to level 60.
export const levelGift = (level) => ({
  money: Math.round(12 * Math.pow(level, 1.4) / 10) * 10,
  tokens: level >= 10 && level % 5 === 0 ? 2 + Math.floor((level - 10) / 5) : 0,
});

// ---------------------------------------------------------------- wardrobe: outfits for your farmer
// Cosmetic only. look: makeHuman options; pagg: true wears your own pagg colour. The two starting
// looks are free; the rest are bought once and kept for good. New outfits are only ever appended.
export const RARITY = { free: { name: 'Starter', color: '#868e96' }, common: { name: 'Common', color: '#2b8a3e' }, rare: { name: 'Rare', color: '#1c7ed6' }, epic: { name: 'Epic', color: '#7b2cbf' }, legendary: { name: 'Legendary', color: '#e8590c' } };
export const HAIRSTYLES = [['bun', 'Juda (bun)'], ['pony', 'Ponytail'], ['open', 'Open hair'], ['bob', 'Short bob']];
export const SKINS = {
  classic:    { name: 'Classic Kisan', gender: 'm', rarity: 'free', price: 0, level: 1, pagg: true, desc: 'Kurta, sadri and jutti: how you started', look: { shirt: 0xf7f3e8, pants: 0xf2eee2, vest: 0x2f5d8a } },
  f_suit:     { name: 'Formal Suit', gender: 'f', rarity: 'free', price: 0, level: 1, desc: 'A tailored navy suit, silk blouse and heels', look: { female: true, top: 'blazer', shirt: 0x1f3a5f, inner: 0xfdf6ec, legs: 'trousers', pants: 0x1f3a5f, feet: 'heels', watch: 0xf2c94c, earrings: 0xf2c94c, necklace: 0xf2c94c } },
  kurta:      { name: 'Embroidered Kurta', gender: 'm', rarity: 'common', price: 25000, level: 5, pagg: true, desc: 'A cream kurta with maroon threadwork, white pajama, gold jutti', look: { shirt: 0xf3e6cf, pants: 0xfbf8f1, trim: 0x8a1c2b, shoes: 0x9a5a1c, scarf: 0x8a1c2b } },
  f_salwar:   { name: 'Phulkari Salwar Suit', gender: 'f', rarity: 'common', price: 30000, level: 5, desc: 'A pink kameez with a phulkari dupatta', look: { shirt: 0xe64980, pants: 0xffe3ec, dupatta: 0xff922b, shoes: 0xc92a2a } },
  farmer:     { name: 'Luxury Farmer', gender: 'm', rarity: 'rare', price: 90000, level: 10, desc: 'Checked shirt, waistcoat, straw hat and leather boots', look: { top: 'shirt', shirt: 0x8f2d2d, vest: 0x5a3a22, legs: 'jeans', pants: 0x2f4f7f, feet: 'boots', hat: 'straw', scarf: 0xe9c25a, watch: true } },
  cowboy:     { name: 'Western Cowboy', gender: 'm', rarity: 'rare', price: 120000, level: 12, desc: 'Leather jacket, jeans, big buckle, boots and a cowboy hat', look: { top: 'jacket', shirt: 0x6b3d1f, legs: 'jeans', pants: 0x2b4a7a, feet: 'boots', hat: 'cowboy', belt: 0x3a2414, beltBuckle: 0xd9b45a, scarf: 0xc92a2a } },
  f_skirt:    { name: 'Business Skirt Suit', gender: 'f', rarity: 'rare', price: 120000, level: 12, desc: 'A grey blazer, pencil skirt and heels', look: { female: true, top: 'blazer', shirt: 0x6c757d, inner: 0xffffff, legs: 'skirt', pants: 0x495057, tights: 0x8a5a3a, feet: 'heels', handbag: 0x7a1c2b, earrings: 0xe9ecef } },
  street:     { name: 'Streetwear', gender: 'm', rarity: 'rare', price: 150000, level: 14, desc: 'Oversized hoodie, cargo pants, cap and fresh sneakers', look: { top: 'hoodie', shirt: 0x2b2d42, trim: 0xff922b, legs: 'cargo', pants: 0x6b705c, feet: 'sneakers', shoes: 0xe03131, hat: 'cap', hatColor: 0xe03131, watch: 0x111111 } },
  f_street:   { name: 'Street Style', gender: 'f', rarity: 'rare', price: 150000, level: 14, desc: 'A lilac hoodie, jeans and sneakers', look: { female: true, top: 'hoodie', shirt: 0xb197fc, trim: 0xffffff, legs: 'jeans', pants: 0x2f4f7f, feet: 'sneakers', shoes: 0xffffff, earrings: 0xffffff } },
  gentleman:  { name: 'Modern Gentleman', gender: 'm', rarity: 'epic', price: 350000, level: 18, pagg: true, desc: 'A charcoal suit, silk tie, polished shoes and a watch', look: { top: 'suit', shirt: 0x343a40, inner: 0xffffff, tie: 0x9c1c2b, legs: 'trousers', pants: 0x343a40, feet: 'formal', watch: 0xf2c94c } },
  winter:     { name: 'Winter Explorer', gender: 'm', rarity: 'epic', price: 420000, level: 20, desc: 'Puffer jacket, beanie, wool scarf, gloves and snow boots', look: { top: 'puffer', shirt: 0x1c7ed6, legs: 'cargo', pants: 0x343a40, feet: 'boots', hat: 'beanie', hatColor: 0xe8590c, scarf: 0xf2c94c, gloves: 0x2a2a2a } },
  f_winter:   { name: 'Winter Chic', gender: 'f', rarity: 'epic', price: 420000, level: 20, desc: 'A white puffer, cream scarf, gloves and boots', look: { female: true, top: 'puffer', shirt: 0xf1f3f5, legs: 'jeans', pants: 0x343a40, feet: 'boots', shoes: 0x5a3a22, scarf: 0xd6336c, gloves: 0xd6336c } },
  military:   { name: 'Fauji Commando', gender: 'm', rarity: 'epic', price: 500000, level: 22, desc: 'A camouflage uniform, tactical vest, helmet, gloves and boots', look: { top: 'tactical', shirt: 0x5c6b3a, legs: 'cargo', pants: 0x5c6b3a, camo: true, feet: 'boots', shoes: 0x2a2418, hat: 'helmet', gloves: 0x3a3a2a, belt: 0x3a3a2a } },
  adventure:  { name: 'Premium Adventurer', gender: 'm', rarity: 'epic', price: 650000, level: 25, desc: 'Outdoor shirt, cargo trousers, a backpack, cap and trail boots', look: { top: 'shirt', shirt: 0x2f9e6e, legs: 'cargo', pants: 0xb5a27a, feet: 'boots', shoes: 0x6b4a2b, hat: 'cap', hatColor: 0xe9c25a, backpack: 0xe8590c, watch: true, belt: 0x5a3a22 } },
  f_adventure: { name: 'Trail Explorer', gender: 'f', rarity: 'epic', price: 650000, level: 25, desc: 'An outdoor shirt, cargo trousers, backpack and boots', look: { female: true, top: 'shirt', shirt: 0x20c997, legs: 'cargo', pants: 0x6b705c, feet: 'boots', backpack: 0x1c7ed6, watch: true } },
  sherwani:   { name: 'Royal Sherwani', gender: 'm', rarity: 'legendary', price: 1200000, level: 28, pagg: true, desc: 'An ivory sherwani with gold zari, a pagg with a kalgi, a pearl string', look: { top: 'sherwani', shirt: 0xf3ead6, trim: 0xd4a017, pants: 0xf3ead6, shoes: 0xc9a227, kalgi: true, necklace: 0xfff8f0, scarf: 0x9c1c2b } },
  f_rani:     { name: 'Rani Sahiba', gender: 'f', rarity: 'legendary', price: 1500000, level: 30, desc: 'A royal maroon suit, gold dupatta and kundan jewellery', look: { shirt: 0x7a1424, pants: 0xd4a017, dupatta: 0xf2c94c, shoes: 0xd4a017, necklace: 0xf2c94c } },
  maharaja:   { name: 'Maharaja of Patiala', gender: 'm', rarity: 'legendary', price: 2500000, level: 35, pagg: true, desc: 'A brocade achkan, ropes of pearls, a sash and a jewelled kalgi', look: { top: 'achkan', shirt: 0x1f3a5f, trim: 0xf2c94c, pants: 0xf8f4ea, shoes: 0xd4a017, kalgi: true, sash: 0x9c1c2b } },
  // added in the more-outfits update (append only)
  kisanblue:  { name: 'Navy Kurta Pajama', gender: 'm', rarity: 'common', price: 35000, level: 7, pagg: true, desc: 'A navy kurta with gold buttons and white pajama', look: { shirt: 0x1f3a5f, pants: 0xfbf8f1, trim: 0xf2c94c, shoes: 0x9a5a1c } },
  bhangra:    { name: 'Bhangra Star', gender: 'm', rarity: 'common', price: 40000, level: 8, pagg: true, desc: 'A golden kurta, black vest, blue chadra and a red rumal', look: { shirt: 0xf2c200, pants: 0x1c7ed6, vest: 0x1d1d1f, trim: 0xe03131, scarf: 0xe03131, shoes: 0xd4a017 } },
  tracksuit:  { name: 'Sports Tracksuit', gender: 'm', rarity: 'common', price: 45000, level: 9, pagg: true, desc: 'A blue tracksuit with white stripes and sneakers', look: { top: 'jacket', shirt: 0x1c7ed6, trim: 0xffffff, legs: 'trousers', pants: 0x1c7ed6, feet: 'sneakers', shoes: 0xffffff, watch: 0x111111 } },
  pilot:      { name: 'Flying Ace', gender: 'm', rarity: 'rare', price: 180000, level: 16, desc: 'A leather flight jacket, white scarf, cap, gloves and boots', look: { top: 'jacket', shirt: 0x6b3d1f, scarf: 0xffffff, legs: 'cargo', pants: 0x495057, feet: 'boots', shoes: 0x3a2414, hat: 'cap', hatColor: 0x6b3d1f, gloves: 0x3a2414, watch: true } },
  linen:      { name: 'Summer Linen', gender: 'm', rarity: 'epic', price: 380000, level: 19, pagg: true, desc: 'A white linen shirt, beige trousers, belt and loafers', look: { top: 'shirt', shirt: 0xf8f9fa, legs: 'trousers', pants: 0xe9dcc0, feet: 'formal', shoes: 0x8a5a2b, watch: 0xf2c94c, belt: 0x5a3a22, beltBuckle: 0xd9b45a } },
  groom:      { name: 'Lagan Groom', gender: 'm', rarity: 'legendary', price: 1800000, level: 32, pagg: true, desc: 'A red and gold sherwani with a pearl mala and a kalgi', look: { top: 'sherwani', shirt: 0xc92a2a, trim: 0xf2c94c, pants: 0xf8f4ea, shoes: 0xd4a017, kalgi: true, necklace: 0xfff8f0, sash: 0xf2c94c } },
  f_summer:   { name: 'Summer Dress', gender: 'f', rarity: 'common', price: 35000, level: 7, desc: 'A sunny yellow top and skirt with a handbag', look: { female: true, top: 'shirt', shirt: 0xffd43b, legs: 'skirt', pants: 0xffd43b, feet: 'sneakers', shoes: 0xffffff, handbag: 0xe8590c } },
  f_sports:   { name: 'Athleisure', gender: 'f', rarity: 'common', price: 45000, level: 9, desc: 'A pink hoodie, black joggers and white sneakers', look: { female: true, top: 'hoodie', shirt: 0xf06595, trim: 0xffffff, legs: 'trousers', pants: 0x343a40, feet: 'sneakers', shoes: 0xffffff } },
  f_phulkari: { name: 'Patiala Shahi Phulkari', gender: 'f', rarity: 'rare', price: 160000, level: 15, desc: 'A white kameez, pink Patiala salwar and an orange phulkari', look: { shirt: 0xf8f9fa, pants: 0xe64980, dupatta: 0xf76707, shoes: 0xd4a017, earrings: 0xf2c94c } },
  f_pilot:    { name: 'Sky Pilot', gender: 'f', rarity: 'rare', price: 180000, level: 16, desc: 'A flight jacket, white scarf, gloves and boots', look: { female: true, top: 'jacket', shirt: 0x6b3d1f, scarf: 0xffffff, legs: 'cargo', pants: 0x495057, feet: 'boots', shoes: 0x3a2414, gloves: 0x3a2414, watch: true } },
  f_anarkali: { name: 'Anarkali Gown', gender: 'f', rarity: 'epic', price: 450000, level: 21, desc: 'A long purple anarkali with gold work and jewellery', look: { female: true, top: 'achkan', shirt: 0x7048e8, trim: 0xf2c94c, legs: 'skirt', pants: 0x7048e8, feet: 'heels', earrings: 0xf2c94c, necklace: 0xf2c94c } },
  // release 12: premium outfits for the long road to level 60
  nawab:      { name: 'Nawab of Patiala', gender: 'm', rarity: 'legendary', price: 6000000, level: 40, pagg: true, desc: 'A royal-blue achkan with gold zari, ropes of pearls, a sash and a kalgi', look: { top: 'achkan', shirt: 0x1c3f94, trim: 0xf2c94c, pants: 0xfbf8f1, shoes: 0xd4a017, kalgi: true, necklace: 0xfff8f0, sash: 0xf2c94c, watch: 0xf2c94c } },
  tycoon:     { name: 'Patiala Tycoon', gender: 'm', rarity: 'legendary', price: 8000000, level: 45, pagg: true, desc: 'An ivory three-piece suit, gold tie, gold watch and polished shoes', look: { top: 'suit', shirt: 0xf3ead6, inner: 0xffffff, tie: 0xd4a017, vest: 0xe9dcc0, legs: 'trousers', pants: 0xf3ead6, feet: 'formal', shoes: 0x5a3a22, watch: 0xf2c94c, belt: 0x5a3a22, beltBuckle: 0xf2c94c } },
  nihang:     { name: 'Khalsa Warrior', gender: 'm', rarity: 'legendary', price: 12000000, level: 55, pagg: true, desc: 'A saffron chola, deep-blue sash, steel kara and a tall kalgi', look: { top: 'achkan', shirt: 0xf08c00, trim: 0x1c3f94, pants: 0x1c3f94, shoes: 0x5a3a22, kalgi: true, sash: 0x1c3f94, watch: 0xd8dde3 } },
  f_maharani: { name: 'Maharani Sahiba', gender: 'f', rarity: 'legendary', price: 7000000, level: 42, desc: 'An emerald suit, a gold dupatta and a kundan necklace', look: { shirt: 0x0b7a5a, pants: 0xd4a017, dupatta: 0xf2c94c, shoes: 0xd4a017, necklace: 0xf2c94c, earrings: 0xf2c94c } },
  f_tycoon:   { name: 'Boss Lady', gender: 'f', rarity: 'legendary', price: 8000000, level: 45, desc: 'An ivory power suit, gold jewellery, heels and a designer bag', look: { female: true, top: 'blazer', shirt: 0xf3ead6, inner: 0xd4a017, legs: 'trousers', pants: 0xf3ead6, feet: 'heels', handbag: 0x5a3a22, watch: 0xf2c94c, earrings: 0xf2c94c, necklace: 0xf2c94c } },
  f_starlight: { name: 'Starlight Gown', gender: 'f', rarity: 'legendary', price: 12000000, level: 55, desc: 'A midnight-blue anarkali with silver work and diamonds', look: { female: true, top: 'achkan', shirt: 0x1b1f4a, trim: 0xdee2e6, legs: 'skirt', pants: 0x1b1f4a, feet: 'heels', earrings: 0xffffff, necklace: 0xffffff, handbag: 0xdee2e6 } },
  f_lehenga:  { name: 'Bridal Lehenga', gender: 'f', rarity: 'legendary', price: 2000000, level: 33, desc: 'A red bridal lehenga, gold dupatta and kundan set', look: { shirt: 0xc92a2a, pants: 0xc92a2a, dupatta: 0xf2c94c, shoes: 0xd4a017, necklace: 0xf2c94c, earrings: 0xf2c94c } },
};
// What makeHuman needs to draw a wardrobe choice (the default is exactly the farmer of before)
export function lookFor(w, turban) {
  const id = w?.gender === 'f' ? w.fskin : w?.skin;
  const s = SKINS[id] || SKINS[w?.gender === 'f' ? 'f_suit' : 'classic'];
  const look = { ...s.look };
  if (s.gender === 'm') look.turban = look.hat ? null : (typeof turban === 'string' ? parseInt(turban.slice(1), 16) : turban ?? 0xe8590c);
  if (look.female) look.hairStyle = w?.hair || 'bun';
  return look;
}
// ---------------------------------------------------------------- farm decoration shop
// cat: tree | flower | light | water | seat | path | fence | gate | statue | orn | season | royal
// r: room it needs (m); solid: collision radius (0 = walk through); tokens: costs Baradari
// roses instead of rupees; fruit: a tree that ripens (every s seconds, n pieces) and is picked by hand;
// glow: [height, size] lamp glow at dusk; spray: a fountain that sprays.
export const DECOR_MAX = 200;
export const DECOR_REFUND = 0.5;
export const DECOR_CATS = [['tree', '🌳 Trees'], ['flower', '🌼 Flowers'], ['light', '💡 Lights'], ['water', '⛲ Water'], ['seat', '🪑 Seating'], ['path', '🟫 Paths'], ['fence', '🚧 Fences & gates'], ['statue', '🗿 Statues'], ['orn', '🏺 Ornaments'], ['season', '🪔 Seasonal'], ['royal', '👑 Baradari specials']];
export const DECOR = {
  neem:      { name: 'Neem tree', icon: '🌳', cat: 'tree', cost: 250, level: 3, r: 1.3, solid: 0.35, desc: 'Cool shade, the village favourite' },
  ashoka:    { name: 'Ashoka tree', icon: '🌲', cat: 'tree', cost: 350, level: 5, r: 1.0, solid: 0.3, desc: 'Tall and slim, lines a path well' },
  peepal:    { name: 'Peepal tree', icon: '🌳', cat: 'tree', cost: 400, level: 6, r: 1.7, solid: 0.45, desc: 'Heart-shaped leaves that rustle' },
  mango:     { name: 'Mango tree', icon: '🥭', cat: 'tree', cost: 900, level: 8, r: 1.6, solid: 0.4, fruit: { item: 'mango', every: 420, n: 4 }, desc: 'Ripens mangoes you pick by hand' },
  guava:     { name: 'Guava tree', icon: '🍐', cat: 'tree', cost: 700, level: 8, r: 1.3, solid: 0.3, fruit: { item: 'guava', every: 360, n: 4 }, desc: 'Ripens guavas you pick by hand' },
  ber:       { name: 'Ber tree', icon: '🍒', cat: 'tree', cost: 600, level: 10, r: 1.2, solid: 0.3, fruit: { item: 'ber', every: 300, n: 5 }, desc: 'Ripens sweet ber you pick by hand' },
  gulmohar:  { name: 'Gulmohar', icon: '🌺', cat: 'tree', cost: 800, level: 10, r: 1.8, solid: 0.4, desc: 'A red umbrella of flowers' },
  orange:    { name: 'Orange tree', icon: '🍊', cat: 'tree', cost: 1100, level: 12, r: 1.4, solid: 0.35, fruit: { item: 'orange', every: 480, n: 4 }, desc: 'Ripens santre you pick by hand' },
  palm:      { name: 'Date palm', icon: '🌴', cat: 'tree', cost: 700, level: 12, r: 1.2, solid: 0.25, desc: 'Sways in the breeze' },
  jamun:     { name: 'Jamun tree', icon: '🫐', cat: 'tree', cost: 1000, level: 14, r: 1.6, solid: 0.4, fruit: { item: 'jamun', every: 480, n: 4 }, desc: 'Ripens purple jamun you pick by hand' },
  bamboo:    { name: 'Bamboo clump', icon: '🎋', cat: 'tree', cost: 500, level: 15, r: 1.2, solid: 0.5, desc: 'Green stalks, gentle wind sounds' },
  banyan:    { name: 'Banyan tree', icon: '🌳', cat: 'tree', cost: 6000, level: 30, r: 3.4, solid: 1.0, desc: 'A grand tree with hanging roots' },
  pot:       { name: 'Potted plant', icon: '🪴', cat: 'flower', cost: 80, level: 2, r: 0.6, desc: 'A matka with a green plant' },
  marigold:  { name: 'Marigold bed', icon: '🌼', cat: 'flower', cost: 120, level: 2, r: 1.0, desc: 'Orange genda flowers' },
  rose:      { name: 'Rose bed', icon: '🌹', cat: 'flower', cost: 160, level: 3, r: 1.0, desc: 'Red and pink gulab' },
  mogra:     { name: 'Mogra bush', icon: '🤍', cat: 'flower', cost: 140, level: 4, r: 0.8, desc: 'White jasmine, sweet at dusk' },
  tulsi:     { name: 'Tulsi chaura', icon: '🌱', cat: 'flower', cost: 300, level: 4, r: 0.9, solid: 0.45, desc: 'Holy basil on a brick platform' },
  hedge:     { name: 'Topiary hedge', icon: '🌿', cat: 'flower', cost: 200, level: 5, r: 0.9, solid: 0.5, desc: 'A trimmed round hedge' },
  sunflowers: { name: 'Sunflower patch', icon: '🌻', cat: 'flower', cost: 180, level: 6, r: 1.0, desc: 'Faces the sun' },
  lotus:     { name: 'Lotus pot', icon: '🪷', cat: 'flower', cost: 260, level: 8, r: 0.9, desc: 'A pink kamal on still water' },
  diya:      { name: 'Diya stand', icon: '🪔', cat: 'light', cost: 150, level: 3, r: 0.5, glow: [0.7, 0.7], desc: 'A little flame that glows at dusk' },
  lamp:      { name: 'Garden lamp', icon: '💡', cat: 'light', cost: 300, level: 4, r: 0.5, solid: 0.12, glow: [2.5, 1.5], desc: 'A lamp post that lights up at dusk' },
  lantern:   { name: 'Stone lantern', icon: '🏮', cat: 'light', cost: 450, level: 9, r: 0.6, solid: 0.25, glow: [1.2, 1.0], desc: 'Warm light from carved stone' },
  birdbath:  { name: 'Bird bath', icon: '🐦', cat: 'water', cost: 600, level: 7, r: 0.9, solid: 0.35, desc: 'Birds come to splash' },
  pond:      { name: 'Lily pond', icon: '💧', cat: 'water', cost: 2200, level: 10, r: 2.2, solid: 1.5, desc: 'Water lilies and stepping stones' },
  fountain:  { name: 'Fountain', icon: '⛲', cat: 'water', cost: 4500, level: 12, r: 2.6, solid: 1.35, spray: true, desc: 'A tiered fountain with a spray' },
  bench:     { name: 'Bench', icon: '🪑', cat: 'seat', cost: 350, level: 3, r: 1.1, desc: 'A wooden bench, sit and chat' },
  charpai:   { name: 'Charpai', icon: '🛏️', cat: 'seat', cost: 450, level: 4, r: 1.3, desc: 'A rope cot for the afternoon' },
  picnic:    { name: 'Picnic table', icon: '🍽️', cat: 'seat', cost: 600, level: 6, r: 1.5, solid: 0.7, desc: 'Table with two benches' },
  stoneseats: { name: 'Stone seating', icon: '🪨', cat: 'seat', cost: 700, level: 7, r: 1.3, desc: 'Three round stone stools' },
  jhoola:    { name: 'Jhoola (swing)', icon: '🎠', cat: 'seat', cost: 1200, level: 9, r: 1.6, solid: 0.3, desc: 'A wooden swing that sways' },
  brick:     { name: 'Brick path', icon: '🧱', cat: 'path', cost: 30, level: 2, r: 0.8, desc: 'Red brick paving' },
  slab:      { name: 'Stone slab', icon: '⬜', cat: 'path', cost: 40, level: 2, r: 0.8, desc: 'Grey stone paving' },
  marble:    { name: 'Marble tile', icon: '🤍', cat: 'path', cost: 90, level: 10, r: 0.8, desc: 'Polished white marble' },
  fence:     { name: 'Wooden fence', icon: '🚧', cat: 'fence', cost: 60, level: 2, r: 1.3, desc: 'A short run of wooden fence' },
  ironfence: { name: 'Iron railing', icon: '⛓️', cat: 'fence', cost: 140, level: 8, r: 1.3, desc: 'Black iron with gold tips' },
  gate:      { name: 'Wooden gate', icon: '🚪', cat: 'fence', cost: 400, level: 5, r: 1.5, desc: 'A gate between two posts' },
  arch:      { name: 'Phulkari arch', icon: '🌈', cat: 'fence', cost: 1400, level: 11, r: 1.6, desc: 'A bright archway to walk under' },
  horse:     { name: 'Horse statue', icon: '🐎', cat: 'statue', cost: 5000, level: 15, r: 1.6, solid: 0.7, desc: 'Patiala is proud of its horses' },
  lion:      { name: 'Lion statue', icon: '🦁', cat: 'statue', cost: 6000, level: 18, r: 1.4, solid: 0.6, desc: 'A stone sher on a plinth' },
  maharaja:  { name: 'Maharaja bust', icon: '👑', cat: 'statue', cost: 9000, level: 22, r: 1.2, solid: 0.5, desc: 'A turbaned royal on a marble pillar' },
  matkas:    { name: 'Matka stack', icon: '🏺', cat: 'orn', cost: 120, level: 3, r: 0.8, solid: 0.3, desc: 'Clay pots in a pile' },
  charkha:   { name: 'Charkha', icon: '🧵', cat: 'orn', cost: 350, level: 7, r: 0.8, solid: 0.3, desc: 'A spinning wheel for the veranda' },
  cart:      { name: 'Bullock cart', icon: '🛒', cat: 'orn', cost: 900, level: 9, r: 1.8, solid: 0.9, desc: 'An old wooden gaddi' },
  rangoli:   { name: 'Rangoli', icon: '🎨', cat: 'season', cost: 90, level: 5, r: 1.0, desc: 'Coloured patterns on the ground' },
  bonfire:   { name: 'Lohri bonfire', icon: '🔥', cat: 'season', cost: 300, level: 5, r: 1.1, glow: [0.8, 2.2], desc: 'A crackling fire for Lohri nights' },
  diyaring:  { name: 'Diwali diyas', icon: '🪔', cat: 'season', cost: 250, level: 5, r: 1.0, glow: [0.4, 1.4], desc: 'A ring of lit diyas' },
  flags:     { name: 'Baisakhi flags', icon: '🚩', cat: 'season', cost: 180, level: 5, r: 0.9, solid: 0.12, desc: 'A saffron nishan on a pole' },
  royalfountain: { name: 'Royal fountain', icon: '⛲', cat: 'royal', tokens: 60, level: 5, r: 3.0, solid: 1.6, spray: true, desc: 'The Baradari fountain: marble, gold and a tall spray' },
  marblebench: { name: 'Marble bench', icon: '🪑', cat: 'royal', tokens: 20, level: 5, r: 1.3, desc: 'Carved white marble with lion arms' },
  rosearch:  { name: 'Rose arch', icon: '🌹', cat: 'royal', tokens: 30, level: 5, r: 1.6, desc: 'An arch covered in climbing roses' },
  goldlamp:  { name: 'Golden lamp', icon: '✨', cat: 'royal', tokens: 25, level: 5, r: 0.6, solid: 0.15, glow: [3.0, 1.9], desc: 'A royal lamp post with a golden crown' },
  peacock:   { name: 'Peacock statue', icon: '🦚', cat: 'royal', tokens: 45, level: 5, r: 1.3, solid: 0.5, desc: 'A proud mor with a jewelled tail' },
  royalpond: { name: 'Royal lotus pond', icon: '🪷', cat: 'royal', tokens: 50, level: 5, r: 2.6, solid: 1.6, desc: 'Marble-edged pond full of lotuses' },
  minibaradari: { name: 'Mini baradari', icon: '🏛️', cat: 'royal', tokens: 120, level: 5, r: 3.2, solid: 1.5, desc: 'A small arched pavilion of your own' },
  // added in the decoration-mode update (append only: friend visits send these by position)
  waterfall: { name: 'Rock waterfall', icon: '🏞️', cat: 'water', cost: 7000, level: 16, r: 2.4, solid: 1.3, spray: 1.9, desc: 'Water tumbles over rocks into a pool' },
  pool:      { name: 'Swimming pool', icon: '🏊', cat: 'water', cost: 12000, level: 20, r: 3.4, solid: 2.3, bty: 300, desc: 'Blue tiles, a ladder and clear water' },
  sofa:      { name: 'Garden sofa', icon: '🛋️', cat: 'furn', cost: 1500, level: 10, r: 1.3, desc: 'A cushioned cane sofa' },
  dining:    { name: 'Dining set', icon: '🍽️', cat: 'furn', cost: 2500, level: 12, r: 1.7, solid: 0.8, desc: 'Round table, four chairs and a parasol' },
  swingchair: { name: 'Swing chair', icon: '🪺', cat: 'furn', cost: 3000, level: 14, r: 1.2, solid: 0.4, desc: 'A hanging basket seat on a stand' },
  coffeetable: { name: 'Coffee table', icon: '☕', cat: 'furn', cost: 800, level: 8, r: 0.9, solid: 0.4, desc: 'A low table with chai cups' },
  lounger:   { name: 'Sun lounger', icon: '🏖️', cat: 'furn', cost: 1200, level: 11, r: 1.3, desc: 'Lie back by the pool' },
  streetlight: { name: 'Street light', icon: '🛣️', cat: 'light', cost: 900, level: 9, r: 0.6, solid: 0.12, glow: [3.6, 2.1], desc: 'A tall modern lamp for drives and paths' },
  fairylights: { name: 'Fairy lights', icon: '✨', cat: 'light', cost: 1100, level: 10, r: 1.7, glow: [2.0, 1.7], desc: 'Strings of tiny bulbs between two posts' },
  colorlights: { name: 'Coloured lights', icon: '🌈', cat: 'light', cost: 1300, level: 12, r: 0.6, solid: 0.1, glow: [2.2, 1.5], desc: 'A pole of red, green and blue bulbs' },
  hanglantern: { name: 'Hanging lanterns', icon: '🏮', cat: 'light', cost: 700, level: 8, r: 0.7, solid: 0.1, glow: [1.8, 1.3], desc: 'Paper lanterns on a hooked post' },
  gazebo:    { name: 'Gazebo', icon: '🛖', cat: 'prem', cost: 15000, level: 22, r: 3.0, bty: 400, desc: 'A white eight-sided pavilion to stand in' },
  pergola:   { name: 'Pergola', icon: '🪵', cat: 'prem', cost: 6000, level: 16, r: 2.4, desc: 'Wooden beams with climbing vines' },
  bridge:    { name: 'Garden bridge', icon: '🌉', cat: 'prem', cost: 4000, level: 14, r: 2.3, desc: 'An arched wooden bridge with rails' },
  birdhouse: { name: 'Birdhouse', icon: '🐦', cat: 'prem', cost: 500, level: 6, r: 0.6, solid: 0.12, desc: 'A little house on a pole for chidiyan' },
  rug:       { name: 'Outdoor rug', icon: '🟥', cat: 'prem', cost: 400, level: 6, r: 1.2, flat: true, desc: 'A woven durrie for the courtyard' },
  welcome:   { name: 'Welcome sign', icon: '🪧', cat: 'prem', cost: 600, level: 5, r: 1.2, solid: 0.15, desc: 'Jee Aayan Nu on a carved board' },
  elephant:  { name: 'Elephant statue', icon: '🐘', cat: 'statue', cost: 12000, level: 24, r: 1.9, solid: 0.9, bty: 500, desc: 'A decorated haathi in stone' },
  deer:      { name: 'Deer statue', icon: '🦌', cat: 'statue', cost: 4000, level: 15, r: 1.2, solid: 0.4, desc: 'A graceful hiran on the lawn' },
  windmill:  { name: 'Farm windmill', icon: '🌬️', cat: 'prem', cost: 8000, level: 18, r: 1.5, solid: 0.5, desc: 'A western windpump on a steel tower' },
  pinktree:  { name: 'Cherry blossom', icon: '🌸', cat: 'pink', cost: 1500, level: 10, r: 1.7, solid: 0.4, desc: 'A tree covered in pink blossom' },
  pinkbench: { name: 'Pink bench', icon: '🩷', cat: 'pink', cost: 900, level: 8, r: 1.1, desc: 'A sweet pink bench with heart backs' },
  heartarch: { name: 'Heart arch', icon: '💗', cat: 'pink', cost: 2500, level: 12, r: 1.6, desc: 'A heart-shaped arch of pink roses' },
  pinklamp:  { name: 'Heart lamp', icon: '💕', cat: 'pink', cost: 800, level: 9, r: 0.6, solid: 0.12, glow: [2.4, 1.5], desc: 'A rose-gold lamp with a heart light' },
  flamingo:  { name: 'Flamingo pair', icon: '🦩', cat: 'pink', cost: 2000, level: 12, r: 1.1, solid: 0.3, desc: 'Two pink flamingos on one leg' },
  pinkfountain: { name: 'Pink fountain', icon: '⛲', cat: 'pink', cost: 9000, level: 18, r: 2.6, solid: 1.35, spray: 2.3, bty: 250, desc: 'Rose marble tiers and a sparkling spray' },
  pinkswing: { name: 'Flower swing', icon: '🌷', cat: 'pink', cost: 3500, level: 15, r: 1.6, solid: 0.3, desc: 'A swing wrapped in pink flowers' },
  pinkgazebo: { name: 'Pink pavilion', icon: '🎀', cat: 'pink', cost: 18000, level: 25, r: 3.0, bty: 700, desc: 'A rose-pink pavilion with a golden top' },
  pinkrug:   { name: 'Pink rug', icon: '🌺', cat: 'pink', cost: 500, level: 7, r: 1.2, flat: true, desc: 'A soft pink rug with flower print' },
  // added in the flowers-and-lights update. tiny: small enough to go almost anywhere
  tulips:    { name: 'Tulip pot', icon: '🌷', cat: 'flower', cost: 150, level: 3, r: 0.45, tiny: true, desc: 'Red, yellow and pink tulips' },
  lily:      { name: 'Lily pot', icon: '🤍', cat: 'flower', cost: 180, level: 4, r: 0.45, tiny: true, desc: 'White lilies with broad leaves' },
  hibiscus:  { name: 'Gudhal bush', icon: '🌺', cat: 'flower', cost: 220, level: 5, r: 0.6, tiny: true, desc: 'Big red hibiscus flowers' },
  daisy:     { name: 'Daisy clump', icon: '🌼', cat: 'flower', cost: 120, level: 2, r: 0.45, tiny: true, desc: 'A cheerful patch of daisies' },
  lavender:  { name: 'Lavender pot', icon: '💜', cat: 'flower', cost: 260, level: 6, r: 0.45, tiny: true, desc: 'Purple spikes that smell lovely' },
  orchid:    { name: 'Orchid pot', icon: '🪻', cat: 'flower', cost: 400, level: 9, r: 0.4, tiny: true, desc: 'An elegant purple and white orchid' },
  bougain:   { name: 'Bougainvillea', icon: '🌸', cat: 'flower', cost: 600, level: 10, r: 0.8, tiny: true, desc: 'Magenta flowers on a little trellis' },
  rosebush:  { name: 'Rose bush', icon: '🌹', cat: 'flower', cost: 250, level: 4, r: 0.5, tiny: true, desc: 'A single bush of red and pink roses' },
  gendapot:  { name: 'Genda pot', icon: '🏵️', cat: 'flower', cost: 100, level: 2, r: 0.4, tiny: true, desc: 'Marigolds in a matka' },
  chameli:   { name: 'Chameli pot', icon: '🤍', cat: 'flower', cost: 200, level: 5, r: 0.45, tiny: true, desc: 'Jasmine, sweet in the evening' },
  hangbasket: { name: 'Hanging basket', icon: '🧺', cat: 'flower', cost: 350, level: 7, r: 0.5, tiny: true, desc: 'Trailing flowers on an iron hook' },
  flowertower: { name: 'Flower tower', icon: '🗼', cat: 'flower', cost: 700, level: 11, r: 0.5, tiny: true, desc: 'Three stacked pots overflowing with flowers' },
  pansy:     { name: 'Pansy tray', icon: '🟣', cat: 'flower', cost: 90, level: 2, r: 0.45, tiny: true, desc: 'A wooden tray of bright pansies' },
  flowercart: { name: 'Flower cart', icon: '🛒', cat: 'flower', cost: 1200, level: 12, r: 1.1, solid: 0.5, desc: 'A green cart loaded with flower boxes' },
  pathlight: { name: 'Path light', icon: '🔦', cat: 'light', cost: 120, level: 4, r: 0.3, tiny: true, glow: [0.45, 0.6], desc: 'A little light to line your paths' },
  kandeel:   { name: 'Kandeel lantern', icon: '🏮', cat: 'light', cost: 300, level: 6, r: 0.5, tiny: true, glow: [1.7, 1.2], desc: 'A Diwali kandeel on a hooked pole' },
  mashaal:   { name: 'Mashaal torch', icon: '🔥', cat: 'light', cost: 250, level: 5, r: 0.4, tiny: true, glow: [1.9, 1.3], desc: 'A flaming torch on a wooden pole' },
  lighttree: { name: 'Light tree', icon: '🎄', cat: 'light', cost: 1800, level: 13, r: 1.0, solid: 0.3, glow: [2.2, 2.4], desc: 'A little tree wrapped in coloured bulbs' },
  bulbarch:  { name: 'Bulb arch', icon: '🌉', cat: 'light', cost: 2200, level: 14, r: 1.6, glow: [2.8, 2.0], desc: 'An archway outlined with warm bulbs' },
  starlamp:  { name: 'Star lamp', icon: '⭐', cat: 'light', cost: 700, level: 9, r: 0.45, tiny: true, glow: [2.45, 1.4], desc: 'A golden star on a pole' },
  moonlamp:  { name: 'Moon lamp', icon: '🌕', cat: 'light', cost: 900, level: 10, r: 0.6, solid: 0.3, glow: [0.8, 1.6], desc: 'A glowing full moon on the lawn' },
  lanternrow: { name: 'Lantern string', icon: '🎐', cat: 'light', cost: 1000, level: 11, r: 1.7, glow: [1.8, 1.8], desc: 'Paper lanterns on a line between two posts' },
  globelamp: { name: 'Globe lamp', icon: '🔮', cat: 'light', cost: 600, level: 8, r: 0.45, tiny: true, glow: [2.7, 1.5], desc: 'A white glass globe on a black post' },
  twinlamp:  { name: 'Twin lamp post', icon: '🕯️', cat: 'light', cost: 1100, level: 12, r: 0.6, solid: 0.15, glow: [2.6, 2.0], desc: 'A royal post with two lanterns' },
  bollard:   { name: 'Bollard light', icon: '🚥', cat: 'light', cost: 220, level: 5, r: 0.3, tiny: true, glow: [0.6, 0.8], desc: 'A short post with a band of light' },
  fireflyjar: { name: 'Firefly jar', icon: '✨', cat: 'light', cost: 180, level: 4, r: 0.3, tiny: true, glow: [0.3, 0.6], desc: 'A jar of twinkling jugnu' },
  spotlight: { name: 'Garden spotlight', icon: '💡', cat: 'light', cost: 350, level: 7, r: 0.3, tiny: true, glow: [0.4, 1.3], desc: 'Lights up a tree or statue from below' },
};
// added in the decoration-mode update: new shop sections, before the Baradari specials
DECOR_CATS.splice(DECOR_CATS.length - 1, 0, ['furn', '🛋️ Furniture'], ['prem', '🏛️ Premium'], ['pink', '💗 Pink Paradise']);

// decoration themes: every item belongs to one or more; the shop can show one theme at a time
export const THEMES = {
  royal:   { name: 'Royal Garden', icon: '👑', keys: 'fountain marble ironfence horse lion maharaja lantern royalfountain marblebench rosearch goldlamp peacock royalpond minibaradari gazebo elephant hedge ashoka twinlamp globelamp lighttree orchid' },
  modern:  { name: 'Modern Luxury', icon: '🏙️', keys: 'lamp slab pool sofa dining swingchair coffeetable lounger streetlight colorlights fairylights hedge pot pathlight bollard spotlight starlamp moonlamp globelamp' },
  indian:  { name: 'Traditional Indian', icon: '🪔', keys: 'neem peepal banyan tulsi marigold mogra lotus diya matkas charkha cart charpai jhoola rangoli bonfire diyaring flags arch brick hanglantern elephant peacock welcome gendapot chameli kandeel mashaal flowercart hibiscus' },
  pink:    { name: 'Pink Paradise', icon: '💗', keys: 'rose lotus rosearch pinktree pinkbench heartarch pinklamp flamingo pinkfountain pinkswing pinkgazebo pinkrug fairylights mogra tulips hibiscus orchid bougain rosebush lily' },
  western: { name: 'Western Farmhouse', icon: '🤠', keys: 'fence gate picnic bench cart birdhouse windmill welcome sunflowers pergola rug lamp lanternrow hangbasket fireflyjar bulbarch flowercart' },
  natural: { name: 'Natural Countryside', icon: '🌿', keys: 'neem ashoka peepal mango guava ber gulmohar orange palm jamun bamboo banyan pot hedge sunflowers birdbath pond stoneseats slab fence waterfall bridge deer birdhouse pergola daisy lavender rosebush pansy fireflyjar' },
};
for (const [t, th] of Object.entries(THEMES)) for (const k of th.keys.split(' ')) if (DECOR[k]) (DECOR[k].th ||= []).push(t);

// ---------------------------------------------------------------- beauty score
// Every placed item adds beauty (bigger, dearer pieces add more); more copies of one kind add less
// and less, and each different kind adds a little extra, so a varied garden scores best. Reaching
// a tier pays a one-time gift; some items (bty) need a beauty score before they can be bought.
export const BEAUTY_TIERS = [
  { at: 0, name: 'Plain', money: 0, xp: 0 }, { at: 50, name: 'Tidy', money: 500, xp: 40 }, { at: 150, name: 'Pretty', money: 1500, xp: 80 },
  { at: 350, name: 'Charming', money: 4000, xp: 150 }, { at: 700, name: 'Beautiful', money: 10000, xp: 250 }, { at: 1200, name: 'Gorgeous', money: 25000, xp: 400 },
  { at: 2000, name: 'Royal', money: 60000, xp: 600 }, { at: 3200, name: 'Legendary', money: 120000, xp: 900 },
];
export const beautyOf = (k) => { const D = DECOR[k]; return D ? Math.max(1, Math.round(Math.sqrt(D.tokens ? D.tokens * 150 : D.base ?? D.cost) / 2)) : 0; };
export function beautyScore(list) {
  const seen = {};
  let sum = 0;
  for (const d of list || []) {
    if (!DECOR[d.k]) continue;
    const n = seen[d.k] = (seen[d.k] || 0) + 1;
    sum += beautyOf(d.k) * Math.max(0.25, Math.pow(0.85, n - 1));
  }
  return Math.round(sum + Object.keys(seen).length * 2);
}
export const beautyTier = (score) => BEAUTY_TIERS.reduce((t, b, i) => (score >= b.at ? i : t), 0);

// ---------------------------------------------------------------- Baradari Gardens
export const GARDEN = {
  level: 5, centre: [29.5, -49.5], w: 21, d: 27,
  wishCost: 10, roses: 8, rosesBonus: { tokens: 5 }, sitSecs: 7, sitBonus: 12,
};

// ---------------------------------------------------------------- Police Station and thieves
// Every `every` seconds of play there is a 10% chance of a thief. He takes 10% of every kind of
// goods in the godown that you hold at least `minStack` of. One case at a time, a cooldown after
// each theft, and the goods are kept safe in the case until the thief is caught.
export const POLICE = {
  level: 6, every: 240, chance: 0.1, take: 0.1, minStack: 10, minTotal: 3, minGodown: 30, cooldown: 1500,
  probeSecs: [240, 420], trustCut: 0.1, trustMax: 4,
  rewards: {
    confront: { xp: 8, trust: -1 },
    forgive: { soul: 15, thanks: 0.15 },
    police: { reward: 0.05, trust: 1 },
  },
  spot: [-31, 37],
};

// ---------------------------------------------------------------- weather
export const WEATHER = {
  odds: { sunny: 0.46, cloudy: 0.24, rain: 0.18, storm: 0.12 },
  stormWindow: [0.42, 0.64],             // the thunderstorm part of the day
  warnAt: 0.3,                           // a last warning this far into a storm day
  maxRain: 380,
};
// Friends trade with share links. Limits keep trades fair: per link and per day.
export const TRADE = {
  linksPerDay: 5,
  items: (lvl) => Math.min(120, 10 + lvl * 3),
  value: (lvl) => 400 + lvl * 160,
  keepRedeemed: 300,
  maxFriends: 30,
};
export const CUSTOMER_NAMES = ['Bhola', 'Jeeto', 'Kartar', 'Simran', 'Harpal', 'Preeto', 'Balwant', 'Gurmeet', 'Nindi', 'Jassi', 'Raju', 'Bebe', 'Chacha ji', 'Pinky', 'Lakha'];

export const TURBAN_COLORS = ['#e8590c', '#1c4fd1', '#d6336c', '#2b8a3e', '#f2c400', '#7b2cbf', '#111111', '#ffffff'];

// ---------------------------------------------------------------- prices doubled (release 11)
// The farm was growing too fast, so everything you buy costs twice as much. Seeds and selling
// prices are untouched. Decorations remember their old price for the beauty score.
export const PRICE_MUL = 2;
{
  const dbl = (o, k = 'cost') => { if (o && typeof o[k] === 'number') o[k] = Math.round(o[k] * PRICE_MUL); };
  for (const f of FIELDS) dbl(f);
  for (const L of [BAGS, CANS, STORAGE, STALL, TRACTOR_HP, BIKE_ENGINES, PLANE_ENGINES, SCARECROW_LEVELS]) for (const x of L) dbl(x);
  for (const L of [VEHICLES, ATTACHMENTS, BUILDINGS]) for (const x of Object.values(L)) dbl(x);
  for (const p of Object.values(PENS)) { dbl(p); dbl(p, 'animalCost'); p.capCosts = p.capCosts.map((c) => c * PRICE_MUL); }
  for (const m of Object.values(MANAGERS)) dbl(m, 'hire');
  dbl(SEERI, 'hire');
  for (const d of Object.values(DECOR)) if (d.cost) { d.base = d.cost; dbl(d); }
  for (const s of Object.values(SKINS)) dbl(s, 'price');
  for (const p of Object.values(PETS)) dbl(p);
  dbl(ORCHARD); dbl(PADDOCK);
}

// ---------------------------------------------------------------- slower farm (release 12)
// Players were making crores far too quickly. Selling pays less, crops take longer, everything
// you buy costs more (dearer the higher its level: early things stay cheap enough to start),
// managers are very dear, rewards are smaller, and levels need more XP (see xpNeed).
export const ECON = { sell: 0.45, reward: 0.4, staff: 8, wage: 2 };
export const buyMul = (level) => 1 + 2 * Math.min(1, (level || 1) / 15);     // ×1 at level 1 up to ×3 from level 15
export const growMul12 = () => 3;                                            // every crop takes 3× as long to grow
{
  const mul = (o, k, m) => { if (o && typeof o[k] === 'number') o[k] = Math.round(o[k] * m); };
  for (const it of Object.values(ITEMS)) it.price = Math.max(1, Math.round(it.price * ECON.sell));
  for (const [id, c] of Object.entries(CROPS)) {
    c.sell = ITEMS[id].price;
    c.seed = Math.max(1, Math.min(c.seed, Math.floor(c.sell / 2), Math.floor(c.sell * c.yield / 3)));   // a plant still earns at least twice its seed
    c.grow = Math.round(c.grow * growMul12(c.level));
  }
  for (const f of FIELDS) mul(f, 'cost', buyMul(f.level));
  for (const L of [BAGS, CANS, STORAGE, STALL, TRACTOR_HP, BIKE_ENGINES, PLANE_ENGINES, SCARECROW_LEVELS]) for (const x of L) mul(x, 'cost', buyMul(x.level));
  for (const L of [VEHICLES, ATTACHMENTS, BUILDINGS]) for (const x of Object.values(L)) mul(x, 'cost', buyMul(x.level));
  for (const p of Object.values(PENS)) { const m = buyMul(p.level); mul(p, 'cost', m); mul(p, 'animalCost', m); p.capCosts = p.capCosts.map((c) => Math.round(c * m)); }
  for (const m of [...Object.values(MANAGERS), SEERI]) { mul(m, 'hire', ECON.staff); mul(m, 'salary', ECON.wage); }
  for (const d of Object.values(DECOR)) mul(d, 'cost', buyMul(d.level));
  for (const s of Object.values(SKINS)) mul(s, 'price', 3);
  for (const k of ['dog', 'cat']) mul(PETS[k], 'cost', 3);
  mul(ORCHARD, 'cost', 3); mul(PADDOCK, 'cost', 3);
  for (const t of BEAUTY_TIERS) mul(t, 'money', ECON.reward);
  for (const k of ['racePay', 'harvestPay', 'matkaPay', 'matkaBonus', 'visitorTip', 'visitorTipTier']) mul(MELA, k, ECON.reward);
  for (const k of ['ringPay', 'kitePay', 'fuelPrice']) mul(PLANE, k, k === 'fuelPrice' ? 3 : ECON.reward);
  for (const c of PLANE.cargo) mul(c, 'pay', ECON.reward);
}
