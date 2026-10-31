// Save data: creation, versioned load/migrate, autosave and inventory helpers.
// Pure module (no three.js) so it can be unit tested in tests/index.html.
import { SAVE_KEY, SAVE_VERSION, START_MONEY, FIELDS, PENS, BUILDINGS, VEHICLES, BAGS, STORAGE, TANKER_CAP } from './config.js';

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  return {
    v: SAVE_VERSION, created: Date.now(), saved: 0,
    name, turban,
    money: START_MONEY, xp: 0, level: 1, soul: 0,
    carry: [], storage: {}, seeds: { wheat: 8 }, seed: 'wheat', water: 8,
    up: { bag: 0, can: 0, storage: 0, stall: 0 },
    fields, plots, pens, buildings, vehicles,
    staff: { pali: false, mistri: false, munshi: false },
    stall: {}, pile: 0,
    orders: [], orderSeq: 0, orderCooldown: 0,
    quest: 0, questProg: 0,
    stats: { harvested: 0, earned: 0, tilled: 0, planted: 0, watered: 0, sold: 0, orders: 0, langar: 0, made: 0, products: 0, tractorWork: 0 },
    ach: {},
    daily: { date: '', goals: [] },
    guru: { last: '', streak: 0, langarDate: '', langarSoul: 0, blessDate: '' },
    day: { n: 1, t: 0, weather: 'sunny', rain: 0 },
    player: { x: 2.5, z: 6, rot: Math.PI, ride: null },
    settings: { music: 0.45, sfx: 0.8, quality: 'auto', sens: 1, zoom: 1 },
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
  // 1: (s) => { ...; s.v = 2; return s; },
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
  return s;
}

export function parseSave(text) {
  if (!text) return null;
  return migrate(JSON.parse(text));
}

let storageOk = true;
export function loadSave() {
  for (const key of [SAVE_KEY, SAVE_KEY + '-backup']) {
    try {
      const s = parseSave(localStorage.getItem(key));
      if (s) return s;
    } catch (e) {
      console.warn('save slot unreadable', key, e);
    }
  }
  return null;
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
