// Thefts and police cases: the rules, with no graphics, so they can be unit tested.
// A case goes open (goods stolen, not yet reported) → reported (police investigating, a timer
// runs on the real clock, so it also runs while the game is closed) → caught → closed.
// The stolen goods live in the case from the moment of the theft until the player settles it,
// and are handed back exactly once, so nothing is duplicated and nothing disappears.
import { POLICE, ITEMS } from './config.js';
import { storageUsed, restoreStorage, makeId } from './state.js';

export const THIEF_NAMES = ['Bunty', 'Lakha', 'Pappi', 'Jagga', 'Teja', 'Sonu', 'Ghudda', 'Nikka', 'Binder', 'Chhinda'];
export const THIEF_TAGS = ['Chhota Chor', 'Raat da Rahi', 'Gali da Gunda', 'Jeb-katra', 'Murga Chor'];

export const activeCase = (st) => st.police.cases.find((c) => c.status !== 'closed') || null;
export const caseValue = (c) => Object.entries(c.items).reduce((a, [k, q]) => a + (ITEMS[k]?.price || 0) * q, 0);
export const caseCount = (c) => Object.values(c.items).reduce((a, b) => a + b, 0);

// What a thief would take: 10% (rounded down) of every kind of goods held in stacks of 10+
export function lootFrom(storage) {
  const loot = {};
  for (const [k, n] of Object.entries(storage)) {
    if (!ITEMS[k] || n < POLICE.minStack) continue;
    const q = Math.floor(n * POLICE.take);
    if (q > 0) loot[k] = q;
  }
  return loot;
}

// '' when a theft may happen now, otherwise the reason it may not
export function theftBlocked(st, now = Date.now()) {
  if (st.level < POLICE.level) return 'level';
  if (activeCase(st)) return 'open case';
  if (now - st.police.last < POLICE.cooldown * 1000) return 'cooldown';
  if (storageUsed(st) < POLICE.minGodown) return 'small godown';
  const loot = lootFrom(st.storage);
  if (Object.values(loot).reduce((a, b) => a + b, 0) < POLICE.minTotal) return 'nothing worth taking';
  return '';
}

// One eligible check: a 10% chance. Returns the new case (goods already taken) or null.
export function rollTheft(st, rng = Math.random, now = Date.now()) {
  if (theftBlocked(st, now)) return null;
  if (!(rng() < POLICE.chance)) return null;
  return stealNow(st, rng, now);
}

export function stealNow(st, rng = Math.random, now = Date.now()) {
  const loot = lootFrom(st.storage);
  for (const [k, q] of Object.entries(loot)) { st.storage[k] -= q; if (st.storage[k] <= 0) delete st.storage[k]; }
  const c = {
    id: makeId(6), no: ++st.police.seq, at: now, items: loot, status: 'open',
    thief: { name: THIEF_NAMES[Math.floor(rng() * THIEF_NAMES.length)], tag: THIEF_TAGS[Math.floor(rng() * THIEF_TAGS.length)] },
  };
  st.police.cases.push(c);
  st.police.last = now;
  st.police.stats.thefts++;
  return c;
}

// Filing the report starts the investigation; trust in the police shortens it
export function fileReport(st, id, rng = Math.random, now = Date.now()) {
  const c = st.police.cases.find((x) => x.id === id);
  if (!c || c.status !== 'open') return null;
  const [lo, hi] = POLICE.probeSecs;
  const secs = (lo + rng() * (hi - lo)) * (1 - POLICE.trustCut * Math.min(st.police.trust, POLICE.trustMax));
  c.status = 'reported';
  c.reportedAt = now;
  c.due = now + Math.round(secs * 1000);
  return c;
}

// Cases whose investigation has run its course become "caught". Returns the ones that just did.
export function advanceCases(st, now = Date.now()) {
  const caught = [];
  for (const c of st.police.cases) if (c.status === 'reported' && now >= c.due) { c.status = 'caught'; c.caughtAt = now; caught.push(c); }
  return caught;
}

// How the player settles a caught case: 'confront' | 'forgive' | 'police'. The goods always come
// back, once. Returns { ok, items, money, soul, xp, msg } (xp is for the game to add).
export function resolveCase(st, id, option, now = Date.now()) {
  const c = st.police.cases.find((x) => x.id === id);
  const R = POLICE.rewards[option];
  if (!c || c.status !== 'caught' || !R) return { ok: false };
  c.status = 'closed';                      // closed first, so a second tap can never pay twice
  c.outcome = option;
  c.closedAt = now;
  restoreStorage(st, c.items);
  const items = { ...c.items }, value = caseValue(c), out = { ok: true, items, money: 0, soul: 0, xp: 0, value };
  if (option === 'confront') { out.xp = R.xp * st.level; st.police.trust = Math.max(0, st.police.trust + R.trust); }
  if (option === 'forgive') { out.soul = R.soul; out.money = Math.round(value * R.thanks); }
  if (option === 'police') { out.money = Math.round(value * R.reward); st.police.trust = Math.min(POLICE.trustMax, st.police.trust + R.trust); }
  st.money += out.money;
  st.soul += out.soul;
  st.police.stats.caught++;
  st.police.stats.recovered += Object.values(items).reduce((a, b) => a + b, 0);
  const closed = st.police.cases.filter((x) => x.status === 'closed');
  while (closed.length > 8) { const old = closed.shift(); st.police.cases.splice(st.police.cases.indexOf(old), 1); }
  return out;
}
