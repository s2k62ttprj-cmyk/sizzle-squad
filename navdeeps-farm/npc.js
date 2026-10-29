'use strict';
/* Navdeep's Farm - farm managers, customers and their speech bubbles. */

const NPC_STEP = 0.26; // seconds for a visitor to walk one tile
let npcs = [];         // managers and customers currently on the farm
let customerTimer = 15;

const pickOne = a => a[Math.floor(Math.random() * a.length)];

/* ---------- path finding ---------- */
const npcWalkable = (x, y) => inBounds(x, y) && !isSolid(x, y);

// Breadth-first search from (sx, sy). goal(x, y) returns something truthy for a tile worth standing on.
function findPath(sx, sy, goal) {
  const prev = new Int16Array(N_TILES).fill(-1);
  const start = idx(sx, sy);
  prev[start] = start;
  const queue = [start];
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q], cx = cur % MAP_W, cy = (cur / MAP_W) | 0;
    const hit = goal(cx, cy);
    if (hit) {
      const path = [];
      for (let t = cur; t !== start; t = prev[t]) path.push([t % MAP_W, (t / MAP_W) | 0]);
      return { path: path.reverse(), hit };
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(nx, ny)) continue;
      const n = idx(nx, ny);
      if (prev[n] !== -1 || !npcWalkable(nx, ny)) continue;
      prev[n] = cur;
      queue.push(n);
    }
  }
  return null;
}

/* ---------- shared walking and talking ---------- */
function makeNpc(kind, look, x, y) {
  return {
    kind, look, sprites: personSprites(look), tx: x, ty: y, px: x * TILE, py: y * TILE,
    dir: 2, path: [], t: 0, phase: 0, state: 'work', timer: 0, task: null, act: null, actT: 0, bubbleEl: null, bubbleUntil: 0,
  };
}

// Walks one frame along the path; returns true once there is nowhere left to go.
function npcMove(n, dt) {
  if (!n.path.length) { n.px = n.tx * TILE; n.py = n.ty * TILE; n.phase = 0; return true; }
  const [nx, ny] = n.path[0];
  if (n.t === 0) {
    if (!npcWalkable(nx, ny)) { n.path = []; return true; }
    n.dir = nx > n.tx ? 3 : nx < n.tx ? 2 : ny > n.ty ? 0 : 1;
  }
  n.t += dt / NPC_STEP;
  n.phase += (dt / NPC_STEP) * 2;
  if (n.t >= 1) { n.tx = nx; n.ty = ny; n.t = 0; n.path.shift(); }
  const [ax, ay] = n.path.length && n.t > 0 ? n.path[0] : [n.tx, n.ty];
  n.px = (n.tx + (ax - n.tx) * n.t) * TILE;
  n.py = (n.ty + (ay - n.ty) * n.t) * TILE;
  return false;
}

function npcOnScreen(n) {
  return n.px + 16 > cam.x && n.px < cam.x + VIEW_W && n.py + 16 > cam.y && n.py - 24 < cam.y + VIEW_H;
}

// Shows a speech bubble over a visitor. Important lines become a toast when the visitor is off screen.
function say(n, name, text, important = false, mood = '') {
  if (n.bubbleEl) n.bubbleEl.remove();
  const el = document.createElement('div');
  el.className = 'bubble ' + mood;
  el.innerHTML = `<b>${esc(name)}</b> ${esc(text)}`;
  $('bubbles').appendChild(el);
  n.bubbleEl = el;
  n.bubbleUntil = performance.now() + 5000;
  if (important && !npcOnScreen(n)) toast(`${name}: "${text}"`, mood, mood === 'bad' ? 'grumpy' : mood === 'good' ? 'happy' : 'hire');
}

function placeBubbles(cx, cy) {
  const now = performance.now();
  for (const n of npcs) {
    if (!n.bubbleEl) continue;
    if (now > n.bubbleUntil) { n.bubbleEl.remove(); n.bubbleEl = null; continue; }
    n.bubbleEl.style.left = ((n.px + 8 - cx) / VIEW_W) * 100 + '%';
    n.bubbleEl.style.top = ((n.py - 10 - cy) / VIEW_H) * 100 + '%';
  }
}

function clearNpcs() {
  for (const n of npcs) if (n.bubbleEl) n.bubbleEl.remove();
  npcs = [];
}

function walkOut(n) {
  const e = World.entrance;
  if (n.tx === e.x && n.ty === e.y) { n.gone = true; return; }
  const r = findPath(n.tx, n.ty, (x, y) => x === e.x && y === e.y);
  if (r) n.path = r.path; else n.gone = true;
}

/* ---------- managers ---------- */
const managerInfo = id => MANAGERS.find(m => m.id === id);
const managerLooks = {};
function managerLook(m) {
  return managerLooks[m.id] || (managerLooks[m.id] = makeLook(m.id, m.seed, m.role === 'crop' ? { style: 'hat' } : {}));
}
const onDuty = id => S.managers[id] && S.managers[id].paid !== false && S.time >= 7 * 60 && S.time < 19 * 60;

function hireManager(m) {
  if (S.managers[m.id]) return;
  if (S.gold < m.fee) { toast(`You need ${fmtGold(m.fee)} to hire ${mgrName(m)}.`, 'bad', 'coin'); Sound.play('error'); return; }
  S.gold -= m.fee;
  S.managers[m.id] = { area: 'golu', seed: 'radish', paid: true };
  S.stats.hired++;
  Sound.play('coin');
  toast(`${mgrName(m)} joined Navdeep's Farm!`, 'good', 'hire');
  checkGoals();
}

function fireManager(m) {
  delete S.managers[m.id];
  toast(`${mgrName(m)} packed up and went home.`, '', 'hire');
}

function canGetSeed(t) { return S.inv.seeds[t] > 0 || S.gold >= CROPS[t].seed + 100; }

function managerTask(n, m, h) {
  const area = AREAS[h.area];
  const herdAt = new Map();
  if (m.role === 'animals') for (const a of herd) if (!a.inside && a.ref.has) herdAt.set(idx(...animalTile(a)), a);
  const isTask = (x, y) => {
    if (!inBounds(x, y)) return null;
    const i = idx(x, y);
    if (m.role === 'fruit') return S.orchard[i] && S.orchard[i].fruit > 0 ? 'pick' : null;
    if (m.role === 'animals') return S.eggs[i] ? 'egg' : herdAt.has(i) ? 'animal' : null;
    if (!inRect(area, x, y)) return null;
    const c = S.crops[i];
    if (m.role === 'clear') return S.debris[i] ? 'clear' : null;
    if (m.role === 'water') return c && !c.ready && S.soil[i] === 1 ? 'water' : null;
    if (c) return c.ready ? 'harvest' : null;
    if (S.sprink[i] || S.debris[i]) return null;
    const seedOk = canGetSeed(h.seed) && !(n.noSeedsUntil > S.time);
    if (S.soil[i]) return seedOk ? 'plant' : null;
    const free = World.ground[i] === G_GRASS && World.structAt[i] < 0 && !World.fence[i] && !World.solid[i];
    return free && seedOk && !(P.tx === x && P.ty === y) ? 'till' : null;
  };
  return findPath(n.tx, n.ty, (x, y) => {
    for (let d = 0; d < 4; d++) {
      const kind = isTask(x + DIRS[d][0], y + DIRS[d][1]);
      if (kind) return { x: x + DIRS[d][0], y: y + DIRS[d][1], dir: d, kind };
    }
    return null;
  });
}

function doManagerTask(n, m, h, task) {
  const i = idx(task.x, task.y), c = S.crops[i], near = npcOnScreen(n);
  n.dir = task.dir;
  n.actKind = task.kind;
  n.actT = 0.3;
  n.actX = task.x;
  n.actY = task.y;
  if (task.kind === 'water' && c && S.soil[i] === 1) {
    S.soil[i] = 2;
    groundChanged(i);
    fxAtTile(i, 'water');
    if (near) Sound.play('water');
  } else if (task.kind === 'harvest' && c && c.ready) {
    collectCrop(i);
    fxAtTile(i, 'spark');
    if (near) Sound.play('harvest');
  } else if (task.kind === 'plant' && S.soil[i] && !c) {
    const t = h.seed;
    if (S.inv.seeds[t] > 0) S.inv.seeds[t]--;
    else if (S.gold >= CROPS[t].seed + 100) S.gold -= CROPS[t].seed;
    else {
      n.noSeedsUntil = S.time + 120;
      say(n, mgrName(m), `Boss Bambi, we're out of ${CROPS[t].name} seeds!`, true, 'bad');
      return;
    }
    S.crops[i] = { t, age: 0, ready: false };
    S.stats.planted++;
    fxAtTile(i, 'leaf');
    if (near) Sound.play('plant');
    autoSwitchHand();
  } else if (task.kind === 'till' && !S.soil[i] && !S.debris[i]) {
    S.soil[i] = 1;
    groundChanged(i);
    fxAtTile(i, 'dirt');
    if (near) Sound.play('till');
  } else if (task.kind === 'clear' && S.debris[i]) {
    const d = S.debris[i];
    S.debris[i] = 0;
    S.stats.cleared++;
    fxAtTile(i, d === 1 ? 'leaf' : d === 2 ? 'stone' : 'wood');
    if (near) Sound.play(d === 1 ? 'pull' : d === 2 ? 'rock' : 'chop');
  } else if (task.kind === 'pick' && S.orchard[i] && S.orchard[i].fruit > 0) {
    const o = S.orchard[i];
    invAdd(o.f, o.fruit);
    S.stats.fruit += o.fruit;
    o.fruit = 0;
    fxAtTile(i, 'leaf');
    if (near) Sound.play('harvest');
  } else if (task.kind === 'egg' && S.eggs[i]) {
    invAdd(S.eggs[i] === 2 ? 'bigEgg' : 'egg', 1);
    delete S.eggs[i];
    S.stats.eggs++;
    if (near) Sound.play('harvest');
  } else if (task.kind === 'animal') {
    const a = herd.find(e => !e.inside && e.ref.has && Math.hypot(e.x + 11 - (task.x * TILE + 8), e.y + 12 - (task.y * TILE + 8)) < 28);
    if (a) collectAnimal(a, false);
  }
  checkGoals();
}

// The stand seller stands by the veggie stand and keeps it stocked from Bambi's bag.
function sellerThink(n, dt, m) {
  const [sx, sy] = [23, 7];
  if (n.tx !== sx || n.ty !== sy) {
    const r = findPath(n.tx, n.ty, (x, y) => x === sx && y === sy);
    if (r && r.path.length) n.path = r.path; else n.timer = 2;
    return;
  }
  n.dir = 2;
  n.timer -= dt;
  if (n.timer > 0) return;
  n.timer = 20;
  let moved = 0;
  for (const [id, cnt] of sellables()) { moveToStand(id, cnt); moved += cnt; }
  say(n, mgrName(m), moved ? `Put ${moved} things on the stand. Fresh from Navdeep's Farm!` : pickOne(['Fresh veggies here!', "Come buy from Navdeep's Farm!", 'Best prices in farm country!']));
}

function managerThink(n, dt) {
  const m = managerInfo(n.id), h = S.managers[n.id];
  if ((!h || !onDuty(n.id)) && n.state !== 'leave') { n.state = 'leave'; n.path = []; n.task = null; }
  if (n.act) {
    n.act.t -= dt;
    if (n.act.t <= 0) { if (h) doManagerTask(n, m, h, n.act); n.act = null; n.timer = 0.15; }
    return;
  }
  if (!npcMove(n, dt)) return;
  if (n.state === 'leave') { walkOut(n); return; }
  if (n.task) { n.act = Object.assign({ t: 0.45 }, n.task); n.dir = n.task.dir; n.task = null; return; }
  if (m.role === 'sell') { sellerThink(n, dt, m); return; }
  n.timer -= dt;
  if (n.timer > 0) return;
  const found = managerTask(n, m, h);
  if (found) {
    n.path = found.path;
    n.task = found.hit;
    n.saidDone = false;
    return;
  }
  if (!n.saidDone) {
    n.saidDone = true;
    const done = {
      water: `All watered on ${AREAS[h.area].name}, boss Bambi!`, crop: `${AREAS[h.area].name} is looking great, boss!`,
      clear: `${AREAS[h.area].name} is spotless now!`, fruit: 'Every fruit is picked, boss Bambi!', animals: 'The animals are all looked after!',
    };
    say(n, mgrName(m), done[m.role]);
  }
  n.timer = 3 + Math.random() * 2;
  const area = AREA_ROLES.includes(m.role) ? AREAS[h.area] : m.role === 'fruit' ? { x0: 26, y0: 26, x1: 34, y1: 32 } : World.pasture;
  const stroll = findPath(n.tx, n.ty, (x, y) => inRect(area, x, y) && Math.random() < 0.06);
  if (stroll) n.path = stroll.path.slice(0, 5);
}

function updateManagers() {
  for (const id in S.managers) {
    if (!onDuty(id) || npcs.some(e => e.kind === 'manager' && e.id === id)) continue;
    const m = managerInfo(id);
    const n = makeNpc('manager', managerLook(m), World.entrance.x, World.entrance.y);
    n.id = id;
    npcs.push(n);
    const where = AREA_ROLES.includes(m.role) ? AREAS[S.managers[id].area].name : { fruit: 'the orchard', animals: 'the animals', sell: 'the veggie stand' }[m.role];
    say(n, mgrName(m), `Good morning, boss Bambi! Off to ${where}.`);
  }
}

/* ---------- customers ---------- */
const CUSTOMER_NAMES = ['Priya', 'Sam', 'Aunty Neelam', 'Mr. Jones', 'Kavya', 'Leo', 'Grandpa Joe', 'Mia', 'Arjun', 'Rosa',
  'Uncle Bittu', 'Hana', 'Dev', 'Olivia', 'Mrs. Kapoor', 'Ben', 'Simmi', 'Carlos'];
const PRAISE = [
  'This {item} is amazing, Navdeep!',
  'Navdeep grows the best {item} in town!',
  'Navdeep, your {item} made my whole day!',
  "Navdeep's Farm has the freshest {item}!",
  "Five stars for Navdeep's {item}!",
  'Navdeep is a farming legend!',
  'Say hi to Guri and Kiran for me, Navdeep!',
  "Navdeep's veggie stand is my favourite stop!",
  "I'm telling all my friends about Navdeep's {item}!",
  'Navdeep could win a gold medal for this {item}!',
];
const MIXED = [
  "No {want}? Fine, I'll take the {item}. Not bad, Navdeep.",
  'Wanted {want}, got {item}. Navdeep still delivers!',
];
const TEASE = [
  'Good {item}, but Navdeep, your prices are daylight robbery!',
  "Navdeep's hair is a mess today. The {item} is fine though.",
  'Navdeep waved at me with muddy hands. Gross! Nice {item} though.',
  'Navdeep was too busy daydreaming to give me my change!',
];
// Everyone in town is convinced Navdeep and Gurinder are meant to be.
const LOVE_GOSSIP = [
  'Saw Gurinder blushing by the veggie stand again. Hmm, Navdeep?',
  'When are Navdeep and Gurinder getting married? I am bringing the curry!',
  "Gurinder says Navdeep's carrots are the sweetest. Just like Navdeep, apparently.",
  'Navdeep and Gurinder: cutest couple in farm country. Do not argue with me.',
  'Gurinder bought three pumpkins just for an excuse to visit. Smooth, very smooth.',
  'The whole town knows about Navdeep and Gurinder. Even the chickens know.',
  "Navdeep, Gurinder asked me if you're single. I said ask yourself!",
  'This {item} tastes like love. Did Gurinder help grow it, Navdeep?',
];
const COMPLAINTS = [
  'The stand is empty, Navdeep? Do you even farm?',
  'I came all this way for {want}. Thanks for nothing, Navdeep!',
  'Navdeep must be napping by the well again. Empty stand!',
  "Empty shelves at Navdeep's Farm? Too busy texting Gurinder, maybe?",
];
const WEEDY = 'So many weeds out there! Navdeep, grab a hoe!';

const standPrice = id => Math.round((CROPS[id] ? CROPS[id].sell : GOODS[id].sell) * 1.5);
const fillLine = (s, item, want) => s.replace('{item}', item ? itemName(item).toLowerCase() : '').replace('{want}', itemName(want).toLowerCase());

function addReview(name, text, good) {
  S.reviews.unshift({ name, text, good, day: S.day });
  if (S.reviews.length > 30) S.reviews.length = 30;
  if (good) S.stats.happy++;
  S.rep = Math.max(0, Math.min(100, S.rep + (good ? 3 : -4)));
}

function customerBuys(n) {
  const stock = Object.keys(S.stand).filter(k => S.stand[k] > 0);
  const item = S.stand[n.want] > 0 ? n.want : stock.length ? pickOne(stock) : null;
  let text, good;
  if (item) {
    const qty = Math.min(S.stand[item], 1 + Math.floor(Math.random() * 3));
    S.stand[item] -= qty;
    if (!S.stand[item]) delete S.stand[item];
    const pay = standPrice(item) * qty;
    S.gold += pay;
    S.stats.earned += pay;
    S.stats.shipped += qty;
    Sound.play('coin');
    good = true;
    text = fillLine(pickOne(item === n.want ? PRAISE : MIXED), item, n.want);
    let weeds = 0;
    for (let i = 0; i < N_TILES; i++) if (S.debris[i]) weeds++;
    const r = Math.random();
    if (weeds > 60 && r < 0.25) { good = false; text = WEEDY; }
    else if (r < 0.45) { text = fillLine(pickOne(LOVE_GOSSIP), item, n.want); n.mood = 'love'; }
    else if (r < 0.6) { good = false; text = fillLine(pickOne(TEASE), item, n.want); }
    toast(`${n.name} bought ${qty} ${itemName(item)} for ${fmtGold(pay)}`, 'good', 'coin');
  } else {
    good = false;
    text = fillLine(pickOne(COMPLAINTS), null, n.want);
  }
  addReview(n.name, text, good);
  say(n, n.name, text, true, n.mood || (good ? 'good' : 'bad'));
  checkGoals();
}

function customerThink(n, dt) {
  if (n.timer > 0) { n.timer -= dt; return; }
  if (!npcMove(n, dt)) return;
  if (n.state === 'leave') { n.spot = null; walkOut(n); return; }
  if (n.state === 'buy') { customerBuys(n); n.state = 'leave'; n.timer = 3; return; }
  // queueing: take the first free spot in line, moving up when someone ahead leaves
  const taken = new Set(npcs.filter(e => e !== n && e.kind === 'customer' && e.spot != null).map(e => e.spot));
  let k = 0;
  while (taken.has(k)) k++;
  if (k >= World.queue.length) { n.state = 'leave'; return; }
  if (n.spot == null || k < n.spot) {
    n.spot = k;
    const [sx, sy] = World.queue[k];
    const r = findPath(n.tx, n.ty, (x, y) => x === sx && y === sy);
    if (r && r.path.length) { n.path = r.path; return; }
  }
  const [fx, fy] = World.queue[0];
  if (n.spot === 0 && n.tx === fx && n.ty === fy) { n.dir = 1; n.state = 'buy'; n.timer = 1.5; }
  else { n.dir = 2; n.timer = 0.5; }
}

function updateCustomers(dt) {
  if (S.time < 8 * 60 || S.time >= 18 * 60) return;
  customerTimer -= dt;
  if (customerTimer > 0 || npcs.filter(e => e.kind === 'customer').length >= 3) return;
  customerTimer = 70 - S.rep * 0.45 + Math.random() * 20;
  const seed = Math.floor(Math.random() * 1e9);
  const n = makeNpc('customer', makeLook('c' + seed, seed), World.entrance.x, World.entrance.y);
  n.name = pickOne(CUSTOMER_NAMES);
  n.want = pickOne([...CROP_IDS, 'egg', 'milk', 'apple', 'mango', 'orange', 'carp', 'curry', 'fruitSalad']);
  n.state = 'queue';
  npcs.push(n);
}

/* ---------- Gurinder drops by every day around lunchtime ---------- */
const GURINDER_LOOK_SEED = 2718;
const GURINDER_HELLO = [
  'Oh, hi! I was just passing by. For the fourth time today.',
  "Is Navdeep around? Not that I'm looking. I'm here for the radishes.",
];
const GURINDER_IDLE = [
  "Navdeep's farm smells like fresh carrots and true love. Mostly carrots.",
  'I brought snacks. Not for anyone special. Just... snacks.',
  'Is it hot out here or is it just this farm?',
  "Don't tell Navdeep, but the tomatoes are almost as cute as Navdeep.",
  "If anyone asks, I'm here to buy vegetables. Totally normal.",
];
const GURINDER_TALK = [
  "Navdeep planted these rows so straight. Someone that organised deserves a dinner date.",
  "My mom keeps asking about 'that farmer'. I keep saying we're just friends. She keeps laughing.",
  'Navdeep + Gurinder... the carrots ship it. The chickens ship it. Everyone ships it.',
  'You know what grows best on this farm? My crush. I mean CORN. I said corn.',
  "One day we'll run this farm together. Navdeep does the farming, I do the eating.",
  "The pumpkins are big, but my heart is bigger. Wait, don't tell Navdeep I said that!",
  'I named one of the chickens after Navdeep. Is that weird? It is a very handsome chicken.',
  'Roses are red, the corn is tall, Navdeep is the cutest farmer of all.',
];
let gurinderDay = 0;

function gurinderAt(x, y) {
  return npcs.find(n => n.kind === 'gurinder' && n.tx === x && n.ty === y) || null;
}

function talkGurinder(n) {
  fx('heart', n.px + 8, n.py - 6);
  Sound.play('goal');
  say(n, 'Gurinder', pickOne(GURINDER_TALK), false, 'love');
}

function updateGurinder() {
  if (S.time >= 11 * 60 && S.time < 15 * 60 && gurinderDay !== S.day) {
    gurinderDay = S.day;
    const n = makeNpc('gurinder', makeLook('gurinder', GURINDER_LOOK_SEED, { style: 'long', hair: '#1c1a20', hairLight: '#3d3846', shirt: '#e8608a', shirtShade: '#c0466c', shirtLight: '#f58aa8' }), World.entrance.x, World.entrance.y);
    n.chat = 4;
    npcs.push(n);
    say(n, 'Gurinder', pickOne(GURINDER_HELLO), true, 'love');
  }
}

// Gurinder hangs around near the player, says sweet things, and heads home at 3 PM.
function gurinderThink(n, dt) {
  if (S.time >= 15 * 60 && n.state !== 'leave') {
    n.state = 'leave';
    n.path = [];
    say(n, 'Gurinder', 'I have to go... but I will "accidentally" be back tomorrow!', false, 'love');
  }
  if (!npcMove(n, dt)) return;
  if (n.state === 'leave') { walkOut(n); return; }
  n.timer -= dt;
  if (n.timer <= 0) {
    n.timer = 0.6;
    const d = Math.abs(n.tx - P.tx) + Math.abs(n.ty - P.ty);
    if (d > 3) {
      const r = findPath(n.tx, n.ty, (x, y) => Math.abs(x - P.tx) + Math.abs(y - P.ty) === 2);
      if (r) n.path = r.path.slice(0, 8);
    } else n.dir = P.tx > n.tx ? 3 : P.tx < n.tx ? 2 : P.ty > n.ty ? 0 : 1;
  }
  n.chat -= dt;
  if (n.chat <= 0) { n.chat = 14 + Math.random() * 8; say(n, 'Gurinder', pickOne(GURINDER_IDLE), false, 'love'); }
}

function updateNpcs(dt) {
  updateManagers();
  updateCustomers(dt);
  updateGurinder();
  for (const n of npcs) {
    if (n.actT > 0) n.actT -= dt;
    if (n.kind === 'manager') managerThink(n, dt);
    else if (n.kind === 'gurinder') gurinderThink(n, dt);
    else customerThink(n, dt);
  }
  for (const n of npcs) if (n.gone && n.bubbleEl) n.bubbleEl.remove();
  npcs = npcs.filter(n => !n.gone);
}

/* ---------- the veggie stand ---------- */
function moveToStand(id, n) {
  invAdd(id, -n);
  S.stand[id] = (S.stand[id] || 0) + n;
}

function takeFromStand(id) {
  invAdd(id, S.stand[id] || 0);
  delete S.stand[id];
}

