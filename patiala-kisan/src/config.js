// Game content and economy. Every price, timer, unlock and reward lives here so
// balancing never requires touching gameplay code. Times are in seconds, money in rupees.

export const SAVE_KEY = 'patiala-kisan-save';
export const SAVE_VERSION = 1;
export const DAY_SECONDS = 360;          // one in-game day (salaries, weather)
export const PLOT = 2;                   // plot pitch in metres
export const START_MONEY = 40;

export const xpNeed = (level) => Math.round(25 + 18 * Math.pow(level, 1.55));

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
};

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
// upgrade level n (0..3): speed and queue length
export const BUILDING_UPGRADES = [
  { speed: 1.0,  slots: 2 },
  { speed: 1.35, slots: 3, costMul: 0.6 },
  { speed: 1.7,  slots: 4, costMul: 1.2 },
  { speed: 2.1,  slots: 5, costMul: 2.2 },
];

export const PENS = {
  coop:    { name: 'Murgi Khana',  en: 'Chicken coop', animal: 'chicken', animalName: 'Chicken', level: 5,  cost: 1000, animalCost: 120, caps: [6, 10, 14], capCosts: [1500, 4000], product: 'egg',  cycle: 45,  feeds: ['wheat', 'maize'], xp: 1 },
  tabela:  { name: 'Majjan da Tabela', en: 'Buffalo shed', animal: 'buffalo', animalName: 'Murrah buffalo', level: 8,  cost: 3500, animalCost: 900, caps: [3, 5, 8], capCosts: [4000, 9000], product: 'milk', cycle: 90, feeds: ['wheat', 'maize', 'sugarcane'], xp: 3 },
  bakri:   { name: 'Bakriyan da Vada', en: 'Goat pen', animal: 'goat', animalName: 'Beetal goat', level: 11, cost: 5000, animalCost: 500, caps: [4, 7, 10], capCosts: [5000, 11000], product: 'milk', cycle: 60, feeds: ['carrot', 'cauliflower', 'wheat'], xp: 2 },
  bhed:    { name: 'Bhedan da Vada', en: 'Sheep pen', animal: 'sheep', animalName: 'Sheep', level: 13, cost: 6000, animalCost: 650, caps: [4, 7, 10], capCosts: [6000, 12000], product: 'wool', cycle: 120, feeds: ['wheat', 'maize'], xp: 3 },
};
export const PEN_PIPE_COST = 800;     // tubewell pipe: animals never run out of water
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
];

export const BAGS = [
  { name: 'Jhola',           cap: 8,  cost: 0,    level: 1 },
  { name: 'Bori (sack)',     cap: 14, cost: 120,  level: 2 },
  { name: 'Tokri (basket)',  cap: 22, cost: 450,  level: 4 },
  { name: 'Rehri (cart)',    cap: 35, cost: 1600, level: 7 },
  { name: 'Vaddi Rehri',     cap: 55, cost: 5000, level: 11 },
];
export const CANS = [
  { name: 'Baalti (bucket)',   cap: 8,  cost: 0,    level: 1 },
  { name: 'Watering can',      cap: 16, cost: 200,  level: 2 },
  { name: 'Big watering can',  cap: 30, cost: 900,  level: 5 },
  { name: 'Backpack sprayer',  cap: 50, cost: 3000, level: 9 },
];
export const STORAGE = [
  { name: 'Kotha',        cap: 60,   cost: 0,     level: 1 },
  { name: 'Godown',       cap: 150,  cost: 800,   level: 3 },
  { name: 'Big Godown',   cap: 300,  cost: 3000,  level: 6 },
  { name: 'Warehouse',    cap: 600,  cost: 9000,  level: 10 },
  { name: 'Cold Store',   cap: 1200, cost: 25000, level: 15 },
];
export const STALL = [
  { name: 'Phatta (plank stall)', shelf: 30,  every: 7.0, cost: 0,    level: 1 },
  { name: 'Mandi Stall',          shelf: 60,  every: 5.0, cost: 1500, level: 5 },
  { name: 'Sabzi Dukaan',         shelf: 120, every: 3.5, cost: 6000, level: 10 },
  { name: 'Vaddi Dukaan',         shelf: 240, every: 2.5, cost: 18000, level: 16 },
];
export const ARHTIYA_RATE = 0.7;     // wholesale buys instantly but pays less

export const VEHICLES = {
  bike:    { name: 'Bullet Motorcycle', level: 3,  cost: 1200,  speed: 13, cargo: 0,   desc: 'Zoom around the farm. Uses your bag.' },
  tractor: { name: 'Tractor 35 HP',     level: 9,  cost: 10000, speed: 8.5, cargo: 80, desc: 'Works fields with attachments and carries a trolley.' },
  combine: { name: 'Combine Harvester', level: 18, cost: 40000, speed: 7,  cargo: 200, desc: 'Harvests a wide strip in one pass.' },
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
];
export const COMBINE_RADIUS = 3.4;
export const TANKER_CAP = 120;

export const STAFF = {
  seeri:  { name: 'Seeri', role: 'Field manager', level: 10, hire: 2500, salary: 120, desc: 'Tills, plants, waters and harvests one field. Buys seeds and sends crops to the godown.' },
  pali:   { name: 'Pali', role: 'Animal caretaker', level: 12, hire: 4000, salary: 180, desc: 'Feeds and waters every animal and collects eggs, milk and wool.' },
  mistri: { name: 'Mistri', role: 'Production manager', level: 15, hire: 7000, salary: 260, desc: 'Keeps every workshop busy using godown stock and collects the goods.' },
  munshi: { name: 'Munshi', role: 'Sales manager', level: 14, hire: 6000, salary: 220, desc: 'Fills customer orders and sells surplus godown stock (keeps 15 of each).' },
};
export const MUNSHI_KEEP = 15;
export const MUNSHI_RATE = 0.9;

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
  { type: 'build',   n: 1, key: 'tabela', text: 'Build the buffalo Tabela', target: 'tabela', reward: 120 },
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
  { id: 'auto',   text: 'Fully automate a field',       stat: 'seeris', n: 1 },
  { id: 'darshan7', text: '7-day Gurdwara streak',      stat: 'streak', n: 7 },
  { id: 'soul100', text: 'Earn 100 soul points',        stat: 'soul', n: 100 },
  { id: 'orders25', text: 'Complete 25 orders',         stat: 'orders', n: 25 },
  { id: 'langar100', text: 'Give 100 items to the Langar', stat: 'langar', n: 100 },
];

export const CUSTOMER_LINES = [
  'Sat Sri Akal ji!', 'Wah, taaze taaze!', 'Kinne da?', 'Vadhiya maal aa!', 'Ghar layi le chaliye',
  'Patiale di shaan!', 'Ik hor dena ji', 'Bahut vadhiya!', 'Chaa naal khavange', 'Rabb mehar kare!',
];
export const CUSTOMER_NAMES = ['Bhola', 'Jeeto', 'Kartar', 'Simran', 'Harpal', 'Preeto', 'Balwant', 'Gurmeet', 'Nindi', 'Jassi', 'Raju', 'Bebe', 'Chacha ji', 'Pinky', 'Lakha'];

export const TURBAN_COLORS = ['#e8590c', '#1c4fd1', '#d6336c', '#2b8a3e', '#f2c400', '#7b2cbf', '#111111', '#ffffff'];
