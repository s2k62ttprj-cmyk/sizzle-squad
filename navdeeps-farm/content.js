'use strict';
/* Navdeep's Farm - the orchard, farm animals, fishing, cooking and extra farm hands. */

const FRUITS = {
  apple: { name: 'Apple', sapling: 400, sell: 60, energy: 15 },
  orange: { name: 'Orange', sapling: 450, sell: 70, energy: 15 },
  mango: { name: 'Mango', sapling: 600, sell: 95, energy: 20 },
  peach: { name: 'Peach', sapling: 500, sell: 80, energy: 18 },
  lemon: { name: 'Lemon', sapling: 400, sell: 65, energy: 10 },
};
const FRUIT_IDS = Object.keys(FRUITS);
const TREE_GROW_DAYS = 8;

const FISH = {
  sardine: { name: 'Sardine', sell: 45, energy: 12, chance: 0.5 },
  carp: { name: 'Carp', sell: 75, energy: 15, chance: 0.3 },
  catfish: { name: 'Catfish', sell: 130, energy: 20, chance: 0.15 },
  goldfish: { name: 'Golden Fish', sell: 400, energy: 30, chance: 0.05 },
};

const ANIMALS = {
  cow: { name: 'Cow', price: 800, product: 'milk', sound: 'moo', names: ['Gauri', 'Bella', 'Moti', 'Daisy'] },
  sheep: { name: 'Sheep', price: 700, product: 'wool', sound: 'baa', names: ['Fluffy', 'Cotton', 'Badal', 'Snowy'] },
  goat: { name: 'Goat', price: 600, product: 'goatMilk', sound: 'baa', names: ['Chhotu', 'Billy', 'Nanny', 'Bucky'] },
  pig: { name: 'Pig', price: 900, product: 'truffle', sound: 'oink', names: ['Bubbles', 'Truffles', 'Oinky', 'Hammy'] },
};
const MAX_ANIMALS = 8;

const RECIPES = [
  { id: 'fruitSalad', name: 'Fruit Salad', needs: { apple: 1, orange: 1, peach: 1 }, sell: 320, energy: 60 },
  { id: 'curry', name: 'Veggie Curry', needs: { carrot: 1, tomato: 2, corn: 1 }, sell: 420, energy: 80 },
  { id: 'fishFry', name: 'Fish Fry', needs: { sardine: 2, lemon: 1 }, sell: 260, energy: 50 },
  { id: 'omelette', name: 'Veggie Omelette', needs: { egg: 2, tomato: 1 }, sell: 210, energy: 45 },
  { id: 'milkshake', name: 'Strawberry Milkshake', needs: { milk: 1, strawberry: 2 }, sell: 330, energy: 55 },
  { id: 'mangoLassi', name: 'Mango Lassi', needs: { mango: 1, milk: 1 }, sell: 300, energy: 50 },
];

Object.assign(GOODS, {
  milk: { name: 'Milk', sell: 120, energy: 20 },
  goatMilk: { name: 'Goat Milk', sell: 110, energy: 20 },
  wool: { name: 'Wool', sell: 150, energy: 0 },
  truffle: { name: 'Truffle', sell: 250, energy: 0 },
});
for (const [id, f] of Object.entries(FRUITS)) GOODS[id] = { name: f.name, sell: f.sell, energy: f.energy };
for (const [id, f] of Object.entries(FISH)) GOODS[id] = { name: f.name, sell: f.sell, energy: f.energy };
for (const r of RECIPES) GOODS[r.id] = { name: r.name, sell: r.sell, energy: r.energy };

SHOP.push(
  ...FRUIT_IDS.map(f => ({
    id: 'sapling:' + f, name: FRUITS[f].name + ' Sapling', price: FRUITS[f].sapling, stack: true,
    desc: `Plant it on grass. Grows into a tree in ${TREE_GROW_DAYS} days, then gives fruit every morning`,
  })),
  { id: 'rod', name: 'Fishing Rod', price: 200, desc: 'Hold it, face the pond and press OK to fish' },
  ...Object.keys(ANIMALS).map(a => ({
    id: 'animal:' + a, name: ANIMALS[a].name, price: ANIMALS[a].price,
    desc: `Lives in the pasture. Gives ${GOODS[ANIMALS[a].product].name.toLowerCase()} every morning`,
  })),
);

MANAGERS.push(
  { id: 'kartik', name: 'Kartik', role: 'clear', fee: 200, wage: 45, seed: 55 },
  { id: 'pinky', name: 'Pinky', role: 'animals', fee: 300, wage: 60, seed: 66 },
  { id: 'harry', name: 'Harry', role: 'sell', fee: 250, wage: 50, seed: 77 },
  { id: 'neha', name: 'Neha', role: 'fruit', fee: 250, wage: 50, seed: 88 },
);
Object.assign(ROLE_TEXT, {
  clear: 'Clears weeds, rocks and stumps in their area',
  animals: 'Collects eggs, milk, wool and truffles from every animal on the farm',
  sell: 'Runs the veggie stand: puts everything sellable from your bag out for customers',
  fruit: 'Picks ripe fruit from every fruit tree on the farm',
});
const ROLE_NAMES = { water: 'Watering manager', crop: 'Crop manager', clear: 'Clean-up manager', animals: 'Animal keeper', sell: 'Stand seller', fruit: 'Orchard keeper' };
const ROLE_ICONS = { water: 'can', crop: 'seed:radish', clear: 'axe', animals: 'milk', sell: 'stand', fruit: 'apple' };
const AREA_ROLES = ['water', 'crop', 'clear'];

GOALS.splice(GOALS.length - 1, 0,
  { text: 'Catch a fish in the pond', stat: 'fish', need: 1, reward: { gold: 100 } },
  { text: 'Pick 10 fruits in the orchard', stat: 'fruit', need: 10, reward: { gold: 150 } },
  { text: 'Buy a cow, sheep, goat or pig', stat: 'animals', need: 1, reward: { gold: 200 } },
  { text: 'Cook a dish in the kitchen', stat: 'cooked', need: 1, reward: { gold: 150 } },
);

const ORCHARD_SPOTS = [[27, 27, 'apple'], [29, 27, 'orange'], [31, 27, 'mango'], [27, 30, 'peach'], [29, 30, 'lemon'],
  [31, 30, 'apple'], [33, 28, 'mango'], [33, 31, 'orange']];

function defaultOrchard() {
  const o = {};
  for (const [x, y, f] of ORCHARD_SPOTS) o[idx(x, y)] = { f, age: TREE_GROW_DAYS, fruit: 2 };
  return o;
}

/* ---------- the orchard ---------- */
function orchardAction(i) {
  const o = S.orchard[i], name = FRUITS[o.f].name;
  if (o.age < TREE_GROW_DAYS) {
    const left = TREE_GROW_DAYS - o.age;
    return { label: `${name} sapling: a tree in ${left} day${left > 1 ? 's' : ''}`, run: null };
  }
  if (o.fruit > 0) return { label: `Pick ${o.fruit} ${name.toLowerCase()}${o.fruit > 1 ? 's' : ''}`, run: () => pickFruit(i) };
  return { label: `${name} tree: new fruit every morning`, run: null };
}

function pickFruit(i) {
  const o = S.orchard[i];
  invAdd(o.f, o.fruit);
  S.stats.fruit += o.fruit;
  o.fruit = 0;
  fxAtTile(i, 'leaf');
  fxAtTile(i, 'spark');
  playerAnim('hand');
  liftItem(o.f);
  Sound.play('harvest');
  checkGoals();
}

function plantSapling(i, f) {
  if (!(S.inv.saplings[f] > 0)) return;
  S.inv.saplings[f]--;
  S.orchard[i] = { f, age: 0, fruit: 0 };
  fxAtTile(i, 'leaf');
  playerAnim('hand');
  Sound.play('plant');
  toast(`Planted a ${FRUITS[f].name.toLowerCase()} sapling. It grows into a tree in ${TREE_GROW_DAYS} days.`, 'good', 'sapling:' + f);
  autoSwitchHand();
}

/* ---------- farm animals ---------- */
function animalAction(a) {
  const info = ANIMALS[a.ref.type];
  if (a.ref.has) return { label: `Collect ${GOODS[info.product].name.toLowerCase()} from ${a.ref.name}`, run: () => collectAnimal(a, true) };
  return { label: `Pet ${a.ref.name} the ${info.name.toLowerCase()}`, run: () => petAnimal(a) };
}

// Bambi or the animal keeper collects today's milk, wool or truffle. Well-loved animals sometimes give two.
function collectAnimal(a, byGolu) {
  const info = ANIMALS[a.ref.type];
  a.ref.has = false;
  a.ref.love = (a.ref.love || 0) + 1;
  const n = a.ref.love >= 7 && Math.random() < 0.3 ? 2 : 1;
  invAdd(info.product, n);
  fx('heart', a.x + 11, a.y);
  if (byGolu) {
    playerAnim('hand');
    liftItem(info.product);
    Sound.play(info.sound);
    if (n > 1) toast(`${a.ref.name} loves you so much you got 2 ${GOODS[info.product].name.toLowerCase()}!`, 'good', info.product);
  }
  checkGoals();
}

function petAnimal(a) {
  fx('heart', a.x + 11, a.y);
  Sound.play(ANIMALS[a.ref.type].sound);
  toast(`${a.ref.name} loves you, Bambi! Come back tomorrow for more ${GOODS[ANIMALS[a.ref.type].product].name.toLowerCase()}.`, '', a.ref.type);
}

function buyAnimal(type) {
  const info = ANIMALS[type];
  const taken = S.animals.filter(a => a.type === type).length;
  const ref = { type, name: info.names[taken % info.names.length], has: true, love: 0 };
  S.animals.push(ref);
  S.stats.animals++;
  herd.push(makeAnimalEnt(ref, S.animals.length - 1));
  return ref.name;
}

/* ---------- fishing ---------- */
let fishing = null; // { x, y, phase: 'wait' | 'bite', t }

function startFishing(x, y) {
  fishing = { x, y, phase: 'wait', t: 1.5 + Math.random() * 3.5 };
  fx('water', x * 16 + 8, y * 16 + 10);
  Sound.play('splash');
}

function updateFishing(dt) {
  if (!fishing) return;
  fishing.t -= dt;
  if (fishing.t > 0) return;
  if (fishing.phase === 'wait') {
    fishing.phase = 'bite';
    fishing.t = 0.9;
    fx('water', fishing.x * 16 + 8, fishing.y * 16 + 10);
    Sound.play('bite');
  } else endFishing('It got away! Press OK as soon as you see the "!"');
}

function fishingPress() {
  if (fishing.phase === 'wait') { endFishing('Too early! The fish swam away.'); return; }
  let r = Math.random(), id = 'sardine';
  for (const [k, f] of Object.entries(FISH)) { if (r < f.chance) { id = k; break; } r -= f.chance; }
  invAdd(id, 1);
  S.stats.fish++;
  fishing = null;
  liftItem(id);
  Sound.play(id === 'goldfish' ? 'goal' : 'harvest');
  toast(id === 'goldfish' ? 'WOW! Bambi caught a rare Golden Fish!' : `Bambi caught a ${FISH[id].name.toLowerCase()}!`, 'good', id);
  checkGoals();
  updateHud();
}

function endFishing(msg) {
  fishing = null;
  if (msg) { toast(msg, 'bad', 'rod'); Sound.play('error'); }
}

/* ---------- cooking ---------- */
const canCook = r => Object.entries(r.needs).every(([id, n]) => invCount(id) >= n);

function cook(r) {
  if (!canCook(r)) { toast(`You need ${Object.entries(r.needs).map(([id, n]) => `${n} ${itemName(id)}`).join(', ')}.`, 'bad', r.id); Sound.play('error'); return; }
  for (const [id, n] of Object.entries(r.needs)) invAdd(id, -n);
  invAdd(r.id, 1);
  S.stats.cooked++;
  Sound.play('goal');
  toast(`Bambi cooked ${r.name}! Sells for ${r.sell}g.`, 'good', r.id);
  checkGoals();
}

/* ---------- every morning ---------- */
function advanceExtras(rep) {
  rep.animalGoods = 0;
  for (const a of S.animals) { a.has = true; rep.animalGoods++; }
  rep.fruit = 0;
  for (const k in S.orchard) {
    const o = S.orchard[k];
    o.age++;
    if (o.age >= TREE_GROW_DAYS && o.fruit < 3) { o.fruit++; rep.fruit++; }
  }
}

// Saves from the previous version had no pasture or orchard: clear room for them.
function migrateSave(s) {
  const clear = i => { s.debris[i] = 0; s.soil[i] = 0; delete s.crops[i]; };
  for (let y = World.pasture.y0 - 1; y <= World.pasture.y1 + 1; y++) for (let x = World.pasture.x0 - 1; x <= World.pasture.x1 + 1; x++) clear(idx(x, y));
  for (const k in s.orchard) clear(+k);
}
