// Save data: creation, versioned load/migrate, autosave and inventory helpers.
// Pure module (no three.js) so it can be unit tested in tests/index.html.
import { SAVE_KEY, SAVE_VERSION, START_MONEY, FIELDS, PENS, BUILDINGS, VEHICLES, BAGS, STORAGE, TANKER_CAP, MANAGERS, ITEMS, TRADE, SCARECROW_DESIGNS, SCARECROW_LEVELS, SCARECROW_MAX, AURA } from './config.js';
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
    fields[f.id] = { owned: f.cost === 0, paid: 0, crop: 'wheat', seeri: false };
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
    guru: { last: '', streak: 0, langarDate: '', langarSoul: 0, blessDate: '' },
    day: { n: 1, t: 0, weather: 'sunny', rain: 0 },
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
  const fresh = newState(s.name, s.turban);
  fillDefaults(s, fresh);
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
  return s;
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
