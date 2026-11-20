// Save data: creation, versioned load/migrate, autosave and inventory helpers.
// Pure module (no three.js) so it can be unit tested in tests/index.html.
import { PLOT, RELEASE, SAVE_KEY, SAVE_VERSION, START_MONEY, FIELDS, PENS, BUILDINGS, VEHICLES, BAGS, STORAGE, TANKER_CAP, MANAGERS, ITEMS, TRADE, SCARECROW_DESIGNS, SCARECROW_LEVELS, SCARECROW_MAX, AURA, CROPS, DECOR, DECOR_MAX, SKINS } from './config.js';
import { pack, unpack } from './codec.js';

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Random id for this farm (friends address gifts and trades to it)
export function makeId(n = 10) {
  const a = new Uint8Array(n);
  (globalThis.crypto || { getRandomValues: (x) => x.map(() => Math.random() * 256) }).getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}

export function newState(name = 'Guri', turban = '#e8590c') {
  const fields = {}, plots = {};
  for (const f of FIELDS) {
    fields[f.id] = { owned: f.cost === 0, paid: 0, crop: 'wheat', crops: [], seeri: false };
    plots[f.id] = Array.from({ length: f.cols * f.rows }, () => ({ s: 0, c: null, w: 0 }));
  }
  const pens = {};
  for (const id in PENS) pens[id] = { owned: false, paid: 0, n: 0, capLvl: 0, feed: 0, water: 0, ready: 0, pipe: false, t: 0 };
  const buildings = {};
  for (const id in BUILDINGS) buildings[id] = { owned: false, paid: 0, lvl: 0, queue: [], t: 0, out: {}, inp: {}, recipe: BUILDINGS[id].recipes[0] };
  const vehicles = {};
  for (const id in VEHICLES) vehicles[id] = { owned: false, x: 0, z: 0, rot: 0, cargo: [], att: 'cultivator', atts: { cultivator: true }, hp: 0, tank: TANKER_CAP };
  const managers = {};
  for (const id in MANAGERS) managers[id] = { on: false, rank: 0, paid: 0 };
  return {
    v: SAVE_VERSION, created: Date.now(), saved: 0,
    name, turban,
    money: START_MONEY, xp: 0, level: 1, soul: 0,
    carry: [], storage: {}, seeds: { wheat: 8 }, seed: 'wheat', water: 8,
    up: { bag: 0, can: 0, storage: 0, stall: 0 },
    fields, plots, pens, buildings, vehicles,
    managers, seeriRank: 0,
    stall: {}, pile: 0,
    orders: [], orderSeq: 0, orderCooldown: 0,
    quest: 0, questProg: 0,
    stats: { harvested: 0, earned: 0, tilled: 0, planted: 0, watered: 0, sold: 0, orders: 0, langar: 0, made: 0, products: 0, tractorWork: 0 },
    ach: {},
    daily: { date: '', goals: [] },
    weekly: { week: '', goals: [] },
    ledger: { day: '', inc: 0, exp: 0, days: [] },     // money in and out, today and the last 7 days
    guru: { last: '', streak: 0, langarDate: '', langarSoul: 0, blessDate: '' },
    day: { n: 1, t: 0, weather: 'sunny', rain: 0, next: '', rainI: 0.5 },
    player: { x: 2.5, z: 6, rot: Math.PI, ride: null },
    settings: { music: 0.45, sfx: 0.8, quality: 'auto', sens: 1, zoom: 1, radio: 'fm', radioVol: 0.8, ownMusic: false },
    // added in the reviews / Gopal's Sweets / friends update (older saves get these filled in)
    pid: makeId(),
    reviews: [],
    boosts: { speed: 0, price: 0, happy: 0 },
    gopal: { day: 0, wants: {}, done: false },
    friends: {},
    trade: { redeemed: [], out: {}, replies: {}, day: '', sent: 0 },
    inbox: [],
    // added in the scarecrows / ring road update
    scarecrows: [],
    social: { code: '', blocked: {}, history: [], giftDay: '', giftsToday: 0, posted: {} },
    // added in the Baradari / police / weather / decoration update
    wardrobe: { gender: 'm', skin: 'classic', fskin: 'f_suit', hair: 'bun', owned: { classic: true, f_suit: true } },
    lvlGift: 1,                       // the highest level that has been paid its gift
    decor: [],                        // placed decorations and trees: { id, k, x, z, ry, t }
    deco: { inv: {}, snap: true, tier: 0 },
    orchard: { owned: false, paid: 0, t: [] },
    sky: { day: '', kites: [], best: 0 },
    pump: { on: [true, true], khaal: true, fix: 1 },
    pets: { owned: {}, active: '', pat: 0 },
    paddock: { owned: false, paid: 0, fed: '' },
    mela: { day: '', found: [], best: 0, hBest: 0, hLast: 0 },      // tube well motors and the old well's irrigation channel          // the airplane's sky games     // Navi Zameen orchard: when each tree was last picked   // stored decorations by kind, grid snapping, beauty tier already paid
    garden: { tokens: 0, total: 0, day: '', found: [], bonus: false, wished: '', sat: {}, relax: 0 },
    police: { cases: [], seq: 0, t: 0, last: 0, trust: 0, stats: { thefts: 0, caught: 0, recovered: 0 } },
    aura: { pts: 0, total: 0, laps: 0, best: 0, dist: 0, day: '', today: { laps: 0, distPts: 0, dist: 0, spots: {}, fast: 0, dusk: 0 }, goals: [], spots: {}, miles: {}, owned: {}, paint: '', title: false },
  };
}

// Fill keys added in later versions without touching existing progress.
function fillDefaults(target, defaults) {
  for (const k in defaults) {
    const d = defaults[k];
    if (!(k in target) || target[k] === undefined || target[k] === null && d !== null) target[k] = structuredCloneSafe(d);
    else if (d && typeof d === 'object' && !Array.isArray(d) && typeof target[k] === 'object' && !Array.isArray(target[k])) fillDefaults(target[k], d);
  }
  return target;
}
const structuredCloneSafe = (o) => (o === null || typeof o !== 'object') ? o : JSON.parse(JSON.stringify(o));

// Version migrations run in order; each takes the save at version n and returns version n+1.
const MIGRATIONS = {
  // v1 → v2: staff booleans become managers with ranks; a new mission was inserted at index 17
  1: (s) => {
    s.managers = {};
    for (const k of ['pali', 'mistri', 'munshi']) s.managers[k] = { on: !!(s.staff && s.staff[k]), rank: 0, paid: 0 };
    delete s.staff;
    if (typeof s.quest === 'number' && s.quest >= 17) s.quest++;
    s.v = 2;
    return s;
  },
};

export function migrate(s) {
  if (typeof s.v !== 'number') throw new Error('not a save');
  while (s.v < SAVE_VERSION) {
    const m = MIGRATIONS[s.v];
    if (!m) throw new Error('no migration from v' + s.v);
    s = m(s);
  }
  const hadGift = 'lvlGift' in s;
  const pumpFix = !s.pump?.fix;                 // read before the defaults fill it in
  const fresh = newState(s.name, s.turban);
  fillDefaults(s, fresh);
  if (!hadGift) s.lvlGift = Math.max(1, s.level | 0);       // levels passed before the update get no gift
  // plot arrays must match field sizes even if a field was resized
  for (const f of FIELDS) {
    const want = f.cols * f.rows, arr = s.plots[f.id];
    while (arr.length < want) arr.push({ s: 0, c: null, w: 0 });
    arr.length = want;
  }
  // scarecrows must be sane (they come back from backups and old files too)
  if (!Array.isArray(s.scarecrows)) s.scarecrows = [];
  s.scarecrows = s.scarecrows.filter((c) => c && Number.isFinite(c.x) && Number.isFinite(c.z) && SCARECROW_DESIGNS[c.d])
    .slice(0, SCARECROW_MAX).map((c) => ({ ...c, lvl: Math.max(0, Math.min(SCARECROW_LEVELS.length - 1, c.lvl | 0)) }));
  s.decor = cleanDecor(s.decor);
  s.deco = cleanDeco(s.deco);
  // release 11: the tube wells run by default (water you can see) and the khaal comes free
  s.pump = { on: pumpFix ? [true, true] : [!!s.pump?.on?.[0], !!s.pump?.on?.[1]], khaal: true, fix: 1 };
  // release 11 moved the new fields next to the old farm: decorations standing there go to the store
  const inField = (d) => FIELDS.some((f) => d.x > f.x0 - 0.6 && d.x < f.x0 + f.cols * PLOT + 0.6 && d.z > f.z0 - 0.6 && d.z < f.z0 + f.rows * PLOT + 0.6);
  s.decor = s.decor.filter((d) => { if (!inField(d)) return true; s.deco.inv[d.k] = (s.deco.inv[d.k] || 0) + 1; s.deco.moved = (s.deco.moved || 0) + 1; return false; });
  s.sky = { day: String(s.sky?.day || '').slice(0, 10), kites: (Array.isArray(s.sky?.kites) ? s.sky.kites : []).filter(Number.isInteger).slice(0, 40), best: Math.max(0, +s.sky?.best || 0) };
  s.orchard = { owned: !!s.orchard?.owned, paid: Math.max(0, +s.orchard?.paid || 0), t: (Array.isArray(s.orchard?.t) ? s.orchard.t : []).slice(0, 12).map((v) => Math.max(0, +v || 0)) };
  s.wardrobe = cleanWardrobe(s.wardrobe);
  s.police.cases = cleanCases(s.police.cases);
  return s;
}

// decorations and police cases come back from backups and old files too: keep only sane ones
export function cleanDecor(list) {
  const n = (v, lo, hi) => Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : 0;
  return (Array.isArray(list) ? list : []).filter((d) => d && DECOR[d.k] && Number.isFinite(+d.x) && Number.isFinite(+d.z)).slice(0, DECOR_MAX)
    .map((d) => ({ id: String(d.id || makeId(6)).slice(0, 12), k: d.k, x: n(d.x, -80, 80), z: n(d.z, -100, 80), ry: n(d.ry, -7, 7), t: Math.max(0, +d.t || 0) }));
}
// the decoration store: only real kinds, whole counts
export function cleanDeco(o) {
  const inv = {};
  for (const [k, n] of Object.entries(o?.inv || {})) if (DECOR[k] && Number.isFinite(+n) && +n >= 1) inv[k] = Math.min(999, Math.floor(+n));
  return { inv, snap: o?.snap !== false, tier: Math.max(0, Math.min(99, o?.tier | 0)), ...(o?.moved > 0 ? { moved: Math.min(999, o.moved | 0) } : {}) };
}
// outfits: only real ones are owned, the starting two always are, you can only wear what you own
export function cleanWardrobe(w) {
  const owned = { classic: true, f_suit: true };
  for (const k of Object.keys(w?.owned || {})) if (SKINS[k]) owned[k] = true;
  const pick = (id, g, d) => (SKINS[id]?.gender === g && owned[id] ? id : d);
  return { gender: w?.gender === 'f' ? 'f' : 'm', skin: pick(w?.skin, 'm', 'classic'), fskin: pick(w?.fskin, 'f', 'f_suit'), hair: ['bun', 'pony', 'open', 'bob'].includes(w?.hair) ? w.hair : 'bun', owned };
}
export function cleanCases(list) {
  return (Array.isArray(list) ? list : []).filter((c) => c && c.items && typeof c.items === 'object' && ['open', 'reported', 'caught', 'closed'].includes(c.status)).slice(-12)
    .map((c) => ({ ...c, items: Object.fromEntries(Object.entries(c.items).filter(([k, q]) => ITEMS[k] && Number.isInteger(q) && q > 0)) }));
}

// One copy of the farm as the previous release left it, taken the first time a new release
// opens it (the two newest copies are kept). A rescue line if an update ever went wrong.
export const releaseKey = (n = RELEASE) => `${SAVE_KEY}-before-v${n}`;
function keepReleaseCopy(raw) {
  try {
    if (localStorage.getItem(releaseKey())) return;
    localStorage.setItem(releaseKey(), raw);
    for (let n = RELEASE - 2; n > 0; n--) localStorage.removeItem(releaseKey(n));
  } catch { /* storage full: not essential */ }
}

export function parseSave(text) {
  if (!text) return null;
  return migrate(JSON.parse(text));
}

let storageOk = true;
// A copy of the farm exactly as the previous version of the game left it, taken once
const PRE_UPDATE = SAVE_KEY + '-before-friends-update';
export function loadSave() {
  for (const key of [SAVE_KEY, SAVE_KEY + '-backup']) {
    try {
      const raw = localStorage.getItem(key);
      const s = parseSave(raw);
      if (s) {
        try { if (!localStorage.getItem(PRE_UPDATE) && !JSON.parse(raw).pid) localStorage.setItem(PRE_UPDATE, raw); } catch { /* storage full: not essential */ }
        if (key === SAVE_KEY) keepReleaseCopy(raw);
        return s;
      }
    } catch (e) {
      console.warn('save slot unreadable', key, e);
    }
  }
  return null;
}

// A save exists but could not be read: park both slots under rescue keys so starting
// a new farm can never overwrite them.
export function rescueSave() {
  try {
    for (const k of [SAVE_KEY, SAVE_KEY + '-backup']) {
      const raw = localStorage.getItem(k);
      if (raw && !localStorage.getItem(k + '-rescue')) localStorage.setItem(k + '-rescue', raw);
    }
  } catch { /* storage blocked */ }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function writeSave(s) {
  s.saved = Date.now();
  try {
    const text = JSON.stringify(s);
    const prev = localStorage.getItem(SAVE_KEY);
    if (prev) localStorage.setItem(SAVE_KEY + '-backup', prev);
    localStorage.setItem(SAVE_KEY, text);
    storageOk = true;
  } catch (e) {
    storageOk = false;
    console.warn('save failed', e);
  }
  return storageOk;
}

export function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-backup'); } catch { /* storage blocked */ }
}

export const saveWorks = () => storageOk;

// ---------- farm backup codes: copy your whole farm out as text, restore it on any device
const BACKUP_SALT = 'patiala-kisan-backup';
export const RESTORE_KEY = SAVE_KEY + '-before-restore';
export async function backupCode(s) { return 'PKB' + await pack(s, BACKUP_SALT); }
export async function readBackup(text) {
  const m = String(text || '').replace(/\s+/g, '').match(/PKB([zj][A-Za-z0-9_-]{20,})/);
  if (!m) throw new Error('That is not a farm backup code');
  return migrate(await unpack(m[1], BACKUP_SALT, 'This backup code is incomplete — copy all of it'));
}
// The farm on this device is kept under RESTORE_KEY before the backup replaces it
export function restoreSave(s) {
  try { const cur = localStorage.getItem(SAVE_KEY); if (cur) localStorage.setItem(RESTORE_KEY, cur); } catch { /* storage blocked */ }
  return writeSave(s);
}

// ---------- inventory helpers ----------
// The crops a Seeri sows on a field, in turn. Older saves only have crop; crops stays empty until the picker is used.
export const fieldCrops = (fd) => { const l = (Array.isArray(fd.crops) ? fd.crops : []).filter((c, i, a) => CROPS[c] && a.indexOf(c) === i); return l.length ? l : [fd.crop]; };
// Goods coming back (a recovered theft) go into the godown even when it is over its limit, so nothing is lost
export function restoreStorage(s, items) { for (const [k, q] of Object.entries(items)) if (ITEMS[k] && q > 0) s.storage[k] = (s.storage[k] || 0) + q; }
export const carryCap = (s) => BAGS[s.up.bag].cap;
export const storageCap = (s) => STORAGE[s.up.storage].cap;
export const storageUsed = (s) => Object.values(s.storage).reduce((a, b) => a + b, 0);
export const carryCount = (s, id) => { let n = 0; for (const x of s.carry) if (x === id) n++; return n; };
export const have = (s, id) => carryCount(s, id) + (s.storage[id] || 0);

export function addStorage(s, id, n) {
  const room = storageCap(s) - storageUsed(s);
  const k = Math.max(0, Math.min(room, n));
  if (k) s.storage[id] = (s.storage[id] || 0) + k;
  return k;
}

// Takes from the carried stack first (top down), then the godown. Returns false and changes nothing if short.
export function take(s, id, n) {
  if (have(s, id) < n) return false;
  let left = n;
  for (let i = s.carry.length - 1; i >= 0 && left > 0; i--) if (s.carry[i] === id) { s.carry.splice(i, 1); left--; }
  if (left > 0) { s.storage[id] -= left; if (s.storage[id] <= 0) delete s.storage[id]; }
  return true;
}

export function canAfford(s, items) {
  return Object.entries(items).every(([id, n]) => have(s, id) >= n);
}

// ---------- scarecrows: the best guard (0..1) any scarecrow gives a spot
export function scarecrowGuard(s, x, z) {
  let g = 0;
  for (const c of s.scarecrows) {
    const L = SCARECROW_LEVELS[c.lvl];
    if (L && Math.hypot(c.x - x, c.z - z) <= L.radius) g = Math.max(g, L.guard);
  }
  return g;
}

// three challenges a day, the same for everyone on the same date
// (gerhi.js)
export function goalsFor(day) {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = AURA.goals.map((g) => g.id), out = [];
  while (out.length < 3) {
    h = (h * 1103515245 + 12345) >>> 0;
    const id = pool.splice(h % pool.length, 1)[0];
    // never two lap-count or two distance goals on the same day
    const type = (x) => AURA.goals.find((g) => g.id === x).type;
    if (out.some((o) => type(o) === type(id))) continue;
    out.push(id);
  }
  return out.map((id) => ({ id, done: false }));
}

// ---------- reviews and trading
export const rating = (s) => s.reviews.length ? s.reviews.reduce((a, r) => a + r.s, 0) / s.reviews.length : 0;
export const itemCount = (items) => Object.values(items).reduce((a, n) => a + n, 0);
export const itemsValue = (items) => Object.entries(items).reduce((a, [k, n]) => a + (ITEMS[k]?.price || 0) * n, 0);

// Can this farm send these goods in one link today? Returns an error message or ''.
export function tradeLimitError(s, items, today = todayKey()) {
  const n = itemCount(items);
  if (!n) return 'Pick something first';
  if (Object.entries(items).some(([k, q]) => !ITEMS[k] || !(q > 0) || q !== Math.floor(q))) return 'Unknown goods';
  if (n > TRADE.items(s.level)) return `Max ${TRADE.items(s.level)} items per link at level ${s.level}`;
  if (itemsValue(items) > TRADE.value(s.level)) return `Max ₹${TRADE.value(s.level).toLocaleString('en-IN')} of goods per link at level ${s.level}`;
  if (s.trade.day === today && s.trade.sent >= TRADE.linksPerDay) return `${TRADE.linksPerDay} links a day — more tomorrow`;
  return '';
}
export function noteTradeSent(s, today = todayKey()) {
  if (s.trade.day !== today) { s.trade.day = today; s.trade.sent = 0; }
  s.trade.sent++;
}
// Remember a link id so the same gift or trade can only be used once on this farm
export function redeemOnce(s, id) {
  if (s.trade.redeemed.includes(id)) return false;
  s.trade.redeemed.push(id);
  if (s.trade.redeemed.length > TRADE.keepRedeemed) s.trade.redeemed.splice(0, s.trade.redeemed.length - TRADE.keepRedeemed);
  return true;
}
// Room for incoming goods: godown first, then the bag
export function roomFor(s) { return storageCap(s) - storageUsed(s) + carryCap(s) - s.carry.length; }
export function receive(s, items) {
  for (const [k, n] of Object.entries(items)) {
    const put = addStorage(s, k, n);
    for (let i = put; i < n && s.carry.length < carryCap(s); i++) s.carry.push(k);
  }
}
