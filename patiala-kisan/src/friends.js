// Friends, gifts and trades through share links (WhatsApp, Messages…). There is no server:
// everything travels inside the link after #pk=, so
//  - a farm link carries a snapshot of your farm; friends who open it can walk around it,
//    and you join their friends list (it shows the farm as it was when it was shared);
//  - a gift link carries goods addressed to one friend's farm and works once;
//  - a trade link offers goods for goods: your side is set aside when you make it, your
//    friend accepts and sends back a reply link that pays you.
// Limits per link and per day (config TRADE) keep the trading fair.
import { CROPS, FIELDS, PENS, BUILDINGS, VEHICLES, MANAGERS, ITEMS, SOUL_PERKS, BAGS, CANS, STORAGE, STALL, QUESTS, TRADE, TURBAN_COLORS, SCARECROW_DESIGNS, SCARECROW_LEVELS, SCARECROW_MAX } from './config.js';
import { newState, makeId, tradeLimitError, noteTradeSent, redeemOnce, roomFor, receive, take, have, rating, itemCount, itemsValue } from './state.js';
import { pack, unpack } from './codec.js';

export const INBOX_KEY = 'patiala-kisan-inbox';      // links opened on the start screen, waiting for the farm to load

// ---------------------------------------------------------------- link codec
const SALT = 'patiala-kisan';
export const encode = (obj) => pack(obj, SALT);
export async function decode(code) {
  if (!code || !/^[zj][A-Za-z0-9_-]+$/.test(code) || code.length > 12000) throw new Error('not a Patiala Kisan link');
  return clean(await unpack(code, SALT, 'this link is damaged — ask for it again'));
}
// Pull a link code out of a URL or any pasted message text
export function findCode(text) {
  const m = String(text || '').match(/pk=([zj][A-Za-z0-9_-]+)/) || String(text || '').trim().match(/^([zj][A-Za-z0-9_-]{16,})$/);
  return m ? m[1] : null;
}
export function linkFor(code) {
  const base = typeof location !== 'undefined' ? location.origin + location.pathname : 'https://s2k62ttprj-cmyk.github.io/sizzle-squad/patiala-kisan/';
  return `${base}#pk=${code}`;
}

// Links come from other people: keep only known goods and sane numbers, cap the name.
function cleanItems(o) {
  const out = {};
  if (o && typeof o === 'object') for (const [k, n] of Object.entries(o)) if (ITEMS[k] && Number.isInteger(n) && n > 0 && n <= 500) out[k] = n;
  return out;
}
function clean(o) {
  if (!o || typeof o !== 'object' || !['farm', 'gift', 'offer', 'reply'].includes(o.k)) throw new Error('not a Patiala Kisan link');
  o.fn = String(o.fn ?? o.n ?? 'Kisan').slice(0, 14);
  if (o.n !== undefined) o.n = String(o.n).slice(0, 14);
  if (o.tn !== undefined) o.tn = String(o.tn).slice(0, 14);
  const t = o.ft ?? o.t;
  o.ft = /^#[0-9a-f]{6}$/i.test(t) ? t : TURBAN_COLORS[0];
  for (const k of ['items', 'give', 'want']) if (o[k] !== undefined) o[k] = cleanItems(o[k]);
  o.from = String(o.from ?? o.id ?? '').slice(0, 16);
  if (o.to !== undefined) o.to = String(o.to).slice(0, 16);
  return o;
}

// ---------------------------------------------------------------- farm snapshots
const growMul = (st) => 1 + SOUL_PERKS.reduce((a, p) => a + (st.soul >= p.at ? p.grow || 0 : 0), 0);
const PLOT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function snapshot(st) {
  const cl = [], now = Date.now(), gm = growMul(st);
  const ci = (c) => { let i = cl.indexOf(c); if (i < 0) { i = cl.length; cl.push(c); } return i; };
  const f = {};
  for (const fd of FIELDS) {
    if (!st.fields[fd.id].owned) continue;
    // per plot: 0 untilled, 1 tilled, or a letter = crop × (dry seed | growing | ripe)
    f[fd.id] = st.plots[fd.id].map((d) => {
      if (d.s < 2 || !CROPS[d.c]) return String(Math.min(d.s, 1));
      const stage = !d.w ? 0 : (now - d.w) / (CROPS[d.c].grow * 1000 / gm) >= 1 ? 2 : 1;
      return PLOT_CHARS[ci(d.c) * 3 + stage] || '1';
    }).join('') + (st.fields[fd.id].seeri ? '*' : '');
  }
  const stall = {};
  let n = 0;
  for (const [k, q] of Object.entries(st.stall)) if (q > 0 && n < 40) { stall[k] = Math.min(q, 40 - n); n += stall[k]; }
  return {
    k: 'farm', v: 1, from: st.pid, fn: st.name, ft: st.turban, l: st.level, s: st.soul, m: Math.round(st.money), d: st.day.n,
    r: Math.round(rating(st) * 10) / 10, rc: st.reviews.length, cl, f,
    p: Object.fromEntries(Object.entries(st.pens).filter(([, p]) => p.owned).map(([id, p]) => [id, [p.n, p.capLvl, p.pipe ? 1 : 0]])),
    b: Object.fromEntries(Object.entries(st.buildings).filter(([, b]) => b.owned).map(([id, b]) => [id, b.lvl])),
    vh: Object.keys(st.vehicles).filter((k) => st.vehicles[k].owned), hp: st.vehicles.tractor.hp,
    mg: Object.fromEntries(Object.entries(st.managers).filter(([, m]) => m.on).map(([id, m]) => [id, m.rank])), sr: st.seeriRank,
    u: [st.up.bag, st.up.can, st.up.storage, st.up.stall], sl: stall,
    g: [st.guru.streak, Object.keys(st.ach).length], ts: Date.now(),
    sc: (st.scarecrows || []).map((c) => [Math.round(c.x * 10), Math.round(c.z * 10), c.lvl, Object.keys(SCARECROW_DESIGNS).indexOf(c.d)]),
  };
}

// Build a playable (never saved) state from a friend's snapshot
export function visitState(snap, mine = null) {
  const num = (v, lo, hi, d = lo) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : d);
  const s = newState(snap.fn, snap.ft);
  s.pid = snap.from;
  s.level = num(snap.l, 1, 999, 1);
  s.soul = num(snap.s, 0, 1e7);
  s.money = num(snap.m, 0, 1e12);
  s.day.n = num(snap.d, 1, 1e6, 1);
  s.quest = QUESTS.length;
  s.questProg = 0;
  if (mine?.settings) s.settings = { ...mine.settings };
  const now = Date.now(), gm = growMul(s), cl = Array.isArray(snap.cl) ? snap.cl : [];
  for (const fd of FIELDS) {
    const code = typeof snap.f?.[fd.id] === 'string' ? snap.f[fd.id] : null;
    if (!code) continue;
    s.fields[fd.id].owned = true;
    s.fields[fd.id].seeri = code.endsWith('*');
    const counts = {};
    s.plots[fd.id].forEach((d, i) => {
      const ch = code[i];
      if (ch === '1') { d.s = 1; return; }
      const k = PLOT_CHARS.indexOf(ch);
      const crop = k >= 0 ? cl[Math.floor(k / 3)] : null;
      if (!CROPS[crop]) return;
      const stage = k % 3, grow = CROPS[crop].grow * 1000 / gm;
      d.s = 2; d.c = crop; d.w = stage === 0 ? 0 : stage === 1 ? now - grow * (0.25 + Math.random() * 0.6) : now - grow * 1.2;
      counts[crop] = (counts[crop] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) s.fields[fd.id].crop = top[0];
  }
  for (const [id, v] of Object.entries(snap.p || {})) {
    if (!PENS[id] || !Array.isArray(v)) continue;
    const capLvl = num(v[1], 0, PENS[id].caps.length - 1);
    Object.assign(s.pens[id], { owned: true, n: num(v[0], 0, PENS[id].caps[capLvl]), capLvl, pipe: !!v[2], feed: 20, water: 30, t: now });
  }
  for (const [id, lvl] of Object.entries(snap.b || {})) if (BUILDINGS[id]) Object.assign(s.buildings[id], { owned: true, lvl: num(lvl, 0, 3), t: now });
  for (const id of Array.isArray(snap.vh) ? snap.vh : []) if (VEHICLES[id]) s.vehicles[id].owned = true;
  s.vehicles.tractor.hp = num(snap.hp, 0, 2);
  for (const [id, r] of Object.entries(snap.mg || {})) if (MANAGERS[id]) Object.assign(s.managers[id], { on: true, rank: num(r, 0, 4) });
  s.seeriRank = num(snap.sr, 0, 4);
  const u = Array.isArray(snap.u) ? snap.u : [];
  s.up = { bag: num(u[0], 0, BAGS.length - 1), can: num(u[1], 0, CANS.length - 1), storage: num(u[2], 0, STORAGE.length - 1), stall: num(u[3], 0, STALL.length - 1) };
  s.stall = cleanItems(snap.sl);
  s.guru.streak = num(snap.g?.[0], 0, 9999);
  const designs = Object.keys(SCARECROW_DESIGNS);
  s.scarecrows = (Array.isArray(snap.sc) ? snap.sc : []).slice(0, SCARECROW_MAX).filter((c) => Array.isArray(c) && designs[c[3]])
    .map((c, i) => ({ id: 'v' + i, x: num(c[0], -600, 600) / 10, z: num(c[1], -600, 600) / 10, lvl: num(c[2], 0, SCARECROW_LEVELS.length - 1), d: designs[c[3]] }));
  s.saved = now;
  return s;
}

// A friend card from a farm link (kept in the save; `code` lets you visit them again)
function friendFrom(obj, code) {
  return { name: obj.fn, turban: obj.ft, level: obj.l || 0, rating: obj.r || 0, fields: obj.f ? Object.keys(obj.f).length : 0, code: code || null, seen: obj.ts || Date.now(), sent: 0, got: 0 };
}

// ---------------------------------------------------------------- in-game friends manager
export class Friends {
  constructor(game) {
    this.game = game;
    this.links = [];          // links made this session, ready to (re)share
  }
  get st() { return this.game.state; }

  // Links tapped on the start screen wait in localStorage until a farm is loaded
  async pullInbox() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]'); localStorage.removeItem(INBOX_KEY); } catch { /* storage blocked */ }
    for (const code of list) await this.open(code);
  }

  // Open a link code (from the start screen, a paste, or a friend's farm)
  async open(code) {
    const g = this.game, ui = g.ui;
    let o;
    try { o = await decode(code); } catch (e) { ui.toast(`⚠️ ${e.message}`, 3); g.audio.play('error'); return false; }
    const st = this.st;
    if (o.from === st.pid) { ui.toast(o.k === 'farm' ? '🙂 That is your own farm link — send it to a friend' : '🙂 That is your own link — send it to your friend', 3.5); return false; }
    if (o.k === 'farm') {
      this.addFriend(o, code);
      ui.toast(`👥 ${o.fn} is now your friend! See them in 👥 Friends`, 3.5);
      g.audio.play('trade');
    } else if (o.k === 'reply') {
      this.collectReply(o);
    } else {
      if (o.to && o.to !== st.pid) { ui.modal(`<div class="big">🤔</div><h2>Not for this farm</h2><p>This ${o.k === 'gift' ? 'gift' : 'trade'} from ${esc(o.fn)} is for <b>${esc(o.tn || 'another')}'s</b> farm.</p><p class="hint">If you play from the Home Screen app, copy the link and paste it in 👥 Friends → Paste a link inside the game.</p>`, 'OK'); return false; }
      if (st.trade.redeemed.includes(o.id)) { ui.toast('✅ You already used this link', 3); return false; }
      if (!st.inbox.some((x) => x.id === o.id)) st.inbox.push({ id: o.id, k: o.k, from: o.from, fn: o.fn, ft: o.ft, items: o.items, give: o.give, want: o.want, ts: o.ts || Date.now() });
      if (!st.friends[o.from]) st.friends[o.from] = friendFrom(o, null);
      g.audio.play('tring');
      ui.open('friends', 'friends');
      ui.toast(o.k === 'gift' ? `🎁 ${o.fn} sent you a gift!` : `🔁 ${o.fn} wants to trade!`, 3);
    }
    g.save(true);
    return true;
  }

  addFriend(o, code) {
    const st = this.st, f = st.friends[o.from];
    const card = friendFrom(o, code);
    if (f) Object.assign(f, { ...card, sent: f.sent, got: f.got });
    else {
      const ids = Object.keys(st.friends);
      if (ids.length >= TRADE.maxFriends) delete st.friends[ids.sort((a, b) => st.friends[a].seen - st.friends[b].seen)[0]];
      st.friends[o.from] = card;
    }
  }
  removeFriend(id) { delete this.st.friends[id]; }

  // ---------- making links
  async farmLink() {
    const code = await encode(snapshot(this.st));
    return this.ready({ kind: 'farm', code, text: `${this.st.name} da khet dekho! 🌾 Visit my farm in Patiala Kisan (level ${this.st.level}):` });
  }

  // Returns an error message or a link object
  async gift(to, items) {
    const st = this.st, f = st.friends[to];
    if (!f) return 'Pick a friend first';
    const err = tradeLimitError(st, items) || (!Object.entries(items).every(([k, n]) => have(st, k) >= n) ? 'You don\'t have all of that' : '');
    if (err) return err;
    const o = { k: 'gift', id: makeId(12), from: st.pid, fn: st.name, ft: st.turban, to, tn: f.name, items, ts: Date.now() };
    const code = await encode(o);
    if (!Object.entries(items).every(([k, n]) => have(st, k) >= n)) return 'You don\'t have all of that';
    for (const [k, n] of Object.entries(items)) take(st, k, n);
    noteTradeSent(st);
    f.sent += itemCount(items);
    this.game.carryDirty = true;
    this.game.save(true);
    return this.ready({ kind: 'gift', code, to: f.name, text: `🎁 ${st.name} sent you ${describe(items)} in Patiala Kisan! Tap to receive:` });
  }

  async offer(to, give, want) {
    const st = this.st, f = st.friends[to];
    if (!f) return 'Pick a friend first';
    if (!itemCount(want)) return 'Choose what you want in return';
    const err = tradeLimitError(st, give) || (itemsValue(want) > TRADE.value(st.level) ? `Ask for at most ₹${TRADE.value(st.level).toLocaleString('en-IN')} of goods` : '')
      || (itemCount(want) > TRADE.items(st.level) ? `Ask for at most ${TRADE.items(st.level)} items` : '')
      || (!Object.entries(give).every(([k, n]) => have(st, k) >= n) ? 'You don\'t have all of that' : '');
    if (err) return err;
    const o = { k: 'offer', id: makeId(12), from: st.pid, fn: st.name, ft: st.turban, to, tn: f.name, give, want, ts: Date.now() };
    const code = await encode(o);
    if (!Object.entries(give).every(([k, n]) => have(st, k) >= n)) return 'You don\'t have all of that';
    for (const [k, n] of Object.entries(give)) take(st, k, n);
    noteTradeSent(st);
    st.trade.out[o.id] = { to, tn: f.name, give, want, ts: o.ts, status: 'open', code };
    this.game.carryDirty = true;
    this.game.save(true);
    return this.ready({ kind: 'offer', code, to: f.name, text: `🔁 ${st.name} offers ${describe(give)} for your ${describe(want)} in Patiala Kisan. Tap to trade:` });
  }

  ready(link) { link.url = linkFor(link.code); this.links.unshift(link); this.links.length = Math.min(this.links.length, 8); return link; }

  // ---------- incoming
  receiveGift(id) {
    const g = this.game, st = this.st, i = st.inbox.findIndex((x) => x.id === id), e = st.inbox[i];
    if (!e) return 'Not found';
    const n = itemCount(e.items);
    if (roomFor(st) < n) return `Make room for ${n} items in your godown or bag first`;
    if (!redeemOnce(st, e.id)) { st.inbox.splice(i, 1); return 'Already received'; }
    receive(st, e.items);
    st.inbox.splice(i, 1);
    if (st.friends[e.from]) st.friends[e.from].got += n;
    g.carryDirty = true;
    g.audio.play('trade');
    g.fx.sparkle(g.player.pos.x, 2, g.player.pos.z, 0xff6fae, 30);
    g.save(true);
    return '';
  }
  async acceptOffer(id) {
    const g = this.game, st = this.st, i = st.inbox.findIndex((x) => x.id === id), e = st.inbox[i];
    if (!e) return 'Not found';
    if (!Object.entries(e.want).every(([k, n]) => have(st, k) >= n)) return `You need ${describe(e.want)}`;
    if (roomFor(st) + itemCount(e.want) < itemCount(e.give)) return `Make room for ${itemCount(e.give)} items first`;
    const reply = { k: 'reply', id: e.id, from: st.pid, fn: st.name, ft: st.turban, to: e.from, tn: e.fn, items: e.want, ts: Date.now() };
    const code = await encode(reply);
    if (!redeemOnce(st, e.id)) { st.inbox.splice(i, 1); return 'Already traded'; }
    for (const [k, n] of Object.entries(e.want)) take(st, k, n);
    receive(st, e.give);
    st.inbox.splice(i, 1);
    if (st.friends[e.from]) { st.friends[e.from].got += itemCount(e.give); st.friends[e.from].sent += itemCount(e.want); }
    st.trade.replies[e.id] = { tn: e.fn, items: e.want, code, ts: Date.now() };
    const keys = Object.keys(st.trade.replies);
    if (keys.length > 10) delete st.trade.replies[keys[0]];
    g.carryDirty = true;
    g.audio.play('trade');
    g.save(true);
    return this.ready({ kind: 'reply', code, to: e.fn, text: `🤝 Trade done! Here is your ${describe(e.want)} from ${st.name} in Patiala Kisan. Tap to collect:` });
  }
  decline(id) { const st = this.st; st.inbox = st.inbox.filter((x) => x.id !== id); this.game.save(true); }

  collectReply(o) {
    const g = this.game, st = this.st, ui = g.ui, out = st.trade.out[o.id];
    if (!out) { ui.toast('🤔 This trade was not started on this farm', 3.5); return; }
    if (out.status === 'cancelled') { ui.toast('❌ You cancelled this trade earlier', 3.5); return; }
    if (out.status === 'done' || st.trade.redeemed.includes('r' + o.id)) { ui.toast('✅ Already collected', 3); return; }
    const n = itemCount(out.want);
    if (roomFor(st) < n) { ui.modal(`<div class="big">🏚️</div><h2>Make room first</h2><p>${esc(o.fn)} sent ${describe(out.want)}. Free up ${n} spaces in your godown or bag, then open the link again.</p>`, 'OK'); return; }
    redeemOnce(st, 'r' + o.id);
    receive(st, out.want);
    out.status = 'done';
    if (st.friends[out.to]) st.friends[out.to].got += n;
    g.carryDirty = true;
    g.audio.play('trade');
    ui.modal(`<div class="big">🤝</div><h2>Trade complete!</h2><p>${esc(o.fn)} sent you ${describe(out.want)}.</p>`, 'Vadhiya!');
  }

  cancelOffer(id) {
    const st = this.st, out = st.trade.out[id];
    if (!out || out.status !== 'open') return 'Nothing to cancel';
    if (roomFor(st) < itemCount(out.give)) return 'Make room for your goods first';
    receive(st, out.give);
    out.status = 'cancelled';
    this.game.carryDirty = true;
    this.game.save(true);
    return '';
  }

  // Remember the link to visit a friend's farm, then reload into visit mode
  visit(id) {
    const f = this.st.friends[id];
    if (!f?.code) return 'Ask them for a fresh farm link to visit';
    this.game.save(true);
    try { sessionStorage.setItem('pk-visit', f.code); } catch { return 'Visiting is blocked in this browser mode'; }
    location.replace(location.pathname + location.search);
    return '';
  }
}

export const describe = (items) => Object.entries(items).map(([k, n]) => `${n} ${ITEMS[k]?.icon || ''} ${ITEMS[k]?.name || k}`).join(', ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
