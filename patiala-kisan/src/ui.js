// HUD, toasts, floating numbers and every menu (shop, farm management, missions, bag, map,
// settings, orders, pens, workshops). Menus are HTML bottom sheets with event delegation.
import * as THREE from 'three';
import {
  CROPS, ITEMS, BAGS, CANS, STORAGE, STALL, FIELDS, PENS, BUILDINGS, RECIPES, VEHICLES, ATTACHMENTS, TRACTOR_HP,
  STAFF, MANAGERS, SEERI, MANAGER_RANKS, wage, OFFLINE_HOURS, SOUL_PERKS, QUESTS, ACHIEVEMENTS, BUILDING_UPGRADES, PEN_PIPE_COST, PEN_WATER_CAP, TANKER_CAP, xpNeed, TURBAN_COLORS, PLOT,
  SWEETS, GOPAL_RATE, VENDORS, TRADE, SCARECROW_DESIGNS, SCARECROW_LEVELS, SCARECROW_MAX, AURA, BIKE_ENGINES, SOCIAL, DECOR, GARDEN, POLICE,
} from './config.js';
import { carryCap, storageCap, storageUsed, have, fieldCrops, saveWorks, rating, todayKey, tradeLimitError, itemCount, itemsValue, backupCode, readBackup } from './state.js';
import { POS, FLY_Z } from './world.js';
import { fmt } from './pads.js';
import { portrait } from './portrait.js';
import { describe, findCode } from './friends.js';
import { REASONS } from './reviews.js';
import { isOnline } from './net.js';
import { clean } from './moderation.js';
import { fmtT } from './gerhi.js';
import { RADIO } from './audio.js';
import { decorShopHTML, decorItemHTML, maliHTML, policeHTML, weatherModal, handlePanels, wardrobeHTML } from './panels.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const money = (n) => `₹${fmt(n)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stars = (n) => `${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i>`;
const ago = (t) => {
  const m = Math.max(0, (Date.now() - (t || Date.now())) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

export class UI {
  constructor(game) {
    this.game = game;
    this.panel = $('panel');
    this.body = this.panel.querySelector('.sheet-body');
    this.tabsEl = this.panel.querySelector('.tabs');
    this.titleEl = this.panel.querySelector('h2');
    this.cache = {};
    this.view = null;
    this.toastQ = [];
    this.tr = { to: null, mode: 'gift', give: {}, want: {} };     // the trade being put together
    $('hud').hidden = false;
    const bind = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); game.audio.unlock(); game.audio.play('click'); fn(); });
    bind('btnShop', () => this.open('shop'));
    bind('btnFarm', () => this.open('farm'));
    bind('btnMissions', () => this.open('missions'));
    bind('btnBag', () => this.openBag());
    bind('btnMap', () => this.open('map'));
    bind('btnStaff', () => this.openStaff());
    bind('btnFriends', () => this.open('friends'));
    bind('btnMenu', () => this.open('settings'));
    bind('radioBtn', () => this.open('radio'));
    bind('homeBtn', () => game.goHome());
    if (game.visit) {
      // a friend's farm: look around only
      for (const id of ['btnShop', 'btnFarm', 'btnMissions', 'btnBag', 'btnStaff', 'btnFriends', 'seedPill', 'quest', 'carryPill', 'waterPill']) $(id).hidden = true;
      const v = game.visit;
      $('visitBar').hidden = false;
      $('visitInfo').innerHTML = `👀 <b>${esc(v.fn)}</b>'s farm · Level ${v.l || 1}${v.r ? ` · ⭐ ${v.r}` : ''}<small>shared ${ago(v.ts)}</small><small id="visitLive"></small>`;
    }
    bind('lvl', () => this.open('missions'));
    document.querySelector('.who').addEventListener('click', (e) => { e.stopPropagation(); this.weatherInfo(); });
    bind('quest', () => { const q = QUESTS[game.state.quest]; if (q?.target) { game.guide.set(q.target, true); this.toast('Follow the yellow arrow ➜'); } else this.open('missions'); });
    bind('seedPill', () => this.open('seeds'));
    bind('soulBox', () => this.open('farm', 'blessings'));
    $('action').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); game.audio.unlock(); this.pressAction(); });
    $('attBtn').addEventListener('click', (e) => { e.stopPropagation(); this.cycleAttachment(); });
    $('hornBtn').addEventListener('click', (e) => { e.stopPropagation(); game.audio.play(game.player.vehicle?.kind === 'bike' && game.state.aura.owned.horn ? 'hornP' : 'horn'); });
    this.panel.querySelector('.x').addEventListener('click', () => this.close());
    $('scrim').addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || t.disabled) return;
      game.audio.play('click');
      this.handle(t.dataset.act, t.dataset);
    });
    this.tabsEl.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (t) { game.audio.play('click'); this.open(this.view, t.dataset.tab); }
    });
    for (const el of document.querySelectorAll('#hud button, #panel')) el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.refreshAll();
  }

  // ---------------------------------------------------------------- HUD
  refreshAll() { this.money(); this.soul(); this.level(); this.questBar(); this.seedPill(); this.waterPill(); this.carryPill(); this.blessBadge(); }
  set(id, html) { if (this.cache[id] !== html) { this.cache[id] = html; $(id).innerHTML = html; } }
  money() { this.set('money', fmt(this.game.state.money)); }
  soul() { this.set('soul', fmt(this.game.state.soul)); }
  level() {
    const st = this.game.state, need = xpNeed(st.level);
    this.set('lvlNum', st.level);
    const f = Math.min(1, st.xp / need);
    $('lvlRing').style.strokeDashoffset = String(119.4 * (1 - f));
  }
  questBar() {
    const g = this.game, q = QUESTS[g.state.quest];
    if (!q) { this.set('quest', '🏆 All missions done — keep growing your empire!'); return; }
    const [p, n] = g.progression.questProgress();
    this.set('quest', `<span class="qi">📜</span><span class="qt">${esc(q.text)}</span><b>${p}/${n}</b>`);
  }
  seedPill() {
    const st = this.game.state, c = CROPS[st.seed];
    this.set('seedPill', `<i>${c.icon}</i><b>${st.seeds[st.seed] || 0}</b>`);
  }
  waterPill() { const st = this.game.state; this.set('waterPill', `💧 <b>${st.water}/${CANS[st.up.can].cap}</b>`); }
  carryPill() {
    const g = this.game, c = g.activeCargo();
    this.set('carryPill', `🧺 <b>${c.items.length}/${c.cap}</b>`);
    $('carryPill').classList.toggle('full', c.items.length >= c.cap);
  }
  blessBadge() { $('blessBadge').hidden = !this.game.perks.blessed; }
  boosts() {
    const b = this.game.state.boosts, icons = { speed: '🍥 Fast', price: '🟤 Prices', happy: '😊 Happy' };
    const t = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    this.set('boosts', Object.entries(b).filter(([, s]) => s > 0).map(([k, s]) => `<span>${icons[k]} ${t(s)}</span>`).join(''));
  }

  update(dt) {
    const g = this.game;
    this.tick = (this.tick || 0) - dt;
    if (this.tick <= 0) {
      this.tick = 0.25;
      this.money(); this.level(); this.carryPill(); this.waterPill(); this.questBar(); this.boosts();
      if (this.view && this.live) this.render();
      if (g.player.vehicle?.kind === 'bike') this.gerhiPill();
      this.set('dayInfo', `Day ${g.state.day.n} · ${g.weather.statusText()}`);
      if (g.visit && $('visitLive')) this.set('visitLive', g.social?.hostStatus?.() || '');
    }
    // action button
    const pl = g.player, act = $('action');
    let label = null;
    if (pl.vehicle) label = '⬇️ Get off';
    else if (g.actions.best) label = g.actions.best.label();
    if (label !== this.cache.action) {
      this.cache.action = label;
      act.hidden = !label;
      if (label) act.innerHTML = label;
    }
    this.flushToasts(dt);
  }

  pressAction() {
    const g = this.game;
    if (g.player.vehicle) { g.player.vehicle.exit(); return; }
    const a = g.actions.best;
    if (a) { g.audio.play('click'); a.onPress(); }
  }

  vehicleMode(v) {
    const bar = $('vehBar');
    bar.hidden = !v;
    $('seedPill').hidden = !!v && v.kind !== 'tractor';
    $('gerhiPill').hidden = !v || v.kind !== 'bike' || !!this.game.visit;
    if (!v) return;
    if (v.kind === 'bike') { $('attBtn').hidden = true; $('tankInfo').hidden = true; this.gerhiPill(); return; }
    if (v.kind === 'tractor') {
      const a = ATTACHMENTS[v.data.att];
      $('attBtn').hidden = false;
      $('attBtn').innerHTML = `${{ cultivator: '⛏️', seeder: '🌱', sprayer: '💧', reaper: '✂️' }[v.data.att]} ${a.name} <small>tap to switch</small>`;
      $('tankInfo').hidden = v.data.att !== 'sprayer';
      $('tankInfo').innerHTML = `💧 ${v.data.tank}/${TANKER_CAP}`;
    } else { $('attBtn').hidden = true; $('tankInfo').hidden = true; }
  }
  gerhiPill() { if (!this.game.visit) this.set('gerhiPill', this.game.gerhi.status()); }

  cycleAttachment() {
    const g = this.game, v = g.player.vehicle;
    if (!v || v.kind !== 'tractor') return;
    const owned = Object.keys(ATTACHMENTS).filter((k) => v.data.atts[k]);
    const i = owned.indexOf(v.data.att);
    v.setAttachment(owned[(i + 1) % owned.length]);
    g.audio.play('click');
    if (owned.length === 1) this.toast('Buy more attachments in Shop → Vehicles');
    this.vehicleMode(v);
  }

  toast(msg, secs = 2.2) {
    if (this.toastQ.some((t) => t.msg === msg)) return;
    this.toastQ.push({ msg, secs });
  }
  flushToasts(dt) {
    const box = $('toasts');
    if (this.toastT > 0) { this.toastT -= dt; return; }
    const t = this.toastQ.shift();
    if (!t) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = t.msg;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), t.secs * 1000);
    setTimeout(() => el.remove(), t.secs * 1000 + 400);
    this.toastT = 0.35;
  }

  float(text, x, y, z, cls = '') {
    _v.set(x, y, z).project(this.game.camera);
    if (_v.z > 1) return;
    const el = document.createElement('div');
    el.className = 'float ' + cls;
    el.textContent = text;
    el.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth}px`;
    el.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
    $('floats').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  pulse(id) { const el = $(id); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

  weatherInfo() { weatherModal(this); }

  levelUp(level, gift = null) {
    const unlocks = [];
    for (const dd of Object.values(DECOR)) if (dd.level === level && !dd.tokens) unlocks.push(`${dd.icon} ${dd.name} (Shop → Garden)`);
    if (level === GARDEN.level) unlocks.push('🌹 Baradari Gardens');
    if (level === POLICE.level) unlocks.push('🚓 Police Station');
    for (const c of Object.values(CROPS)) if (c.level === level) unlocks.push(`${c.icon} ${c.name} seeds`);
    for (const f of FIELDS) if (f.level === level) unlocks.push(`🟫 ${f.name}`);
    for (const p of Object.values(PENS)) if (p.level === level) unlocks.push(`🐾 ${p.name}`);
    for (const b of Object.values(BUILDINGS)) if (b.level === level) unlocks.push(`🏭 ${b.name}`);
    for (const v of Object.values(VEHICLES)) if (v.level === level) unlocks.push(`🚜 ${v.name}`);
    for (const s of Object.values(STAFF)) if (s.level === level) unlocks.push(`👳 ${s.name} (${s.role})`);
    for (const k of [BAGS, CANS, STORAGE, STALL]) for (const u of k) if (u.level === level && u.cost) unlocks.push(`⬆️ ${u.name}`);
    const gifts = gift && (gift.money || gift.tokens) ? `<p class="gain">🎁 Level gift: ${money(gift.money)}${gift.tokens ? ` + ${gift.tokens} 🌹 Baradari roses` : ''}</p>` : '';
    this.modal(`<div class="big">⭐</div><h2>Level ${level}!</h2>${gifts}${unlocks.length ?`<p>Unlocked:</p><ul class="unl scroll">${unlocks.map((u) => `<li>${u}</li>`).join('')}</ul>` : '<p>Shabaash! Keep growing.</p>'}`);
    this.level();
  }

  blessing(pts, streak) {
    this.modal(`<div class="big">🙏</div><h2 class="gur">ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ</h2><p><i>Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh</i></p>
      <p class="gain">+${pts} soul points · ${streak}-day streak</p>
      <p>Today's blessing at Dukh Niwaran Sahib:<br>✨ +15% chance of double harvest<br>✨ +10% mandi prices</p>`, 'Chardi Kala 🙏');
    this.blessBadge();
  }

  modal(html, btn = 'Vadhiya!') {
    const m = $('modal');
    m.innerHTML = `<div class="card">${html}<button class="btn" id="modalOk">${btn}</button></div>`;
    m.hidden = false;
    $('modalOk').addEventListener('click', () => { m.hidden = true; this.game.audio.play('click'); });
  }

  confirm(html, yes, no = 'Cancel') {
    return new Promise((res) => {
      const m = $('modal');
      m.innerHTML = `<div class="card">${html}<div class="row2"><button class="btn ghost" id="mNo">${no}</button><button class="btn danger" id="mYes">${yes}</button></div></div>`;
      m.hidden = false;
      $('mNo').onclick = () => { m.hidden = true; res(false); };
      $('mYes').onclick = () => { m.hidden = true; res(true); };
    });
  }

  // ---------------------------------------------------------------- panels
  open(view, tab) {
    this.view = view;
    this.tab = tab || this.defaultTab(view);
    this.panel.hidden = false;
    $('scrim').hidden = false;
    this.render(true);
  }
  close() { if (this.view === 'board') this.game.social?.unwatchBoard(); this.panel.hidden = true; $('scrim').hidden = true; this.view = null; this.chatWith = null; }
  openOrders() { this.open('orders'); }
  openStaff(role = null) { this.focusRole = role; this.open('staff'); }
  openPen(id) { this.penId = id; this.open('pen'); }
  openWorkshop(id) { this.shopId = id; this.open('workshop'); }
  openBag(tab) { this.open('bag', tab); }

  defaultTab(view) {
    return { shop: 'seeds', farm: 'fields', missions: 'mission', bag: 'carry', friends: this.game.social?.on ? 'online' : 'friends' }[view] || null;
  }

  tabs(list) {
    this.tabsEl.innerHTML = list.map(([id, name]) => `<button data-tab="${id}" class="${id === this.tab ? 'on' : ''}">${name}</button>`).join('');
    this.tabsEl.hidden = !list.length;
  }

  render(scrollTop = false) {
    const g = this.game, st = g.state;
    let title = '', html = '', tabs = [];
    this.live = false;
    switch (this.view) {
      case 'shop':
        title = '🛒 Shop';
        tabs = [['seeds', '🌱 Seeds'], ['tools', '🧰 Upgrades'], ['land', '🟫 Land'], ['build', '🏭 Build'], ['vehicles', '🚜 Vehicles'], ['garden', '🌳 Garden'], ['wardrobe', '👕 Wardrobe']];
        html = this.shopHTML();
        break;
      case 'seeds': title = '🌱 Choose seeds'; html = this.seedsHTML(true); break;
      case 'farm':
        title = '🏡 Farm';
        tabs = [['fields', '🟫 Fields'], ['animals', '🐾 Animals'], ['work', '🏭 Workshops'], ['reviews', '⭐ Reviews'], ['blessings', '🙏 Blessings'], ['stats', '📊 Stats']];
        html = this.tab === 'reviews' ? this.reviewsHTML() : this.farmHTML();
        this.live = this.tab === 'animals' || this.tab === 'work' || this.tab === 'fields' || this.tab === 'reviews';
        break;
      case 'sweets': title = "🍥 Gopal's Sweets"; html = this.sweetsHTML(); this.live = true; break;
      case 'scarecrow': title = `${SCARECROW_DESIGNS[this.scarecrow?.data.d]?.icon || '🧍'} Scarecrow`; html = this.scarecrowHTML(); break;
      case 'vendor': {
        const v = g.vendors?.v;
        if (!v) { this.close(); return; }
        title = `${VENDORS[v.id].icon} ${VENDORS[v.id].name}`; html = this.vendorHTML(); this.live = true; break;
      }
      case 'friends': title = '👥 Friends'; tabs = g.social?.on ? [['online', '🌐 Online'], ['friends', '🔗 Link friends'], ['paste', '📋 Paste a link']] : [['friends', '👥 Friends'], ['paste', '📋 Paste a link']]; html = this.friendsHTML(); break;
      case 'gift': title = '🎁 Send a gift'; html = this.giftHTML(); break;
      case 'chat': title = `💬 ${esc(clean(g.social.friends[this.chatWith]?.name || '', 14))}`; html = this.chatHTML(); break;
      case 'board': title = '📝 Guestbook'; html = this.boardHTML(); break;
      case 'trade': title = this.tr.mode === 'gift' ? '🎁 Send a gift' : '🔁 Make a trade'; html = this.tradeHTML(); break;
      case 'missions': title = '📜 Goals'; tabs = [['mission', 'Mission'], ['daily', 'Daily'], ['gerhi', '🏍️ Gerhi'], ['ach', 'Achievements']]; html = this.missionsHTML(); this.live = this.tab !== 'gerhi'; break;
      case 'radio': title = '📻 Radio'; html = this.radioHTML(); break;
      case 'bag': title = '🎒 Bag & Godown'; tabs = [['carry', '🧺 Carrying'], ['storage', '🏚️ Godown'], ['seedbag', '🌱 Seeds']]; html = this.bagHTML(); break;
      case 'map': title = '🗺️ Map'; html = this.mapHTML(); break;
      case 'settings': title = '⚙️ Settings'; html = this.settingsHTML(); break;
      case 'orders': title = '📋 Customer orders'; html = this.ordersHTML(); this.live = true; break;
      case 'staff': title = '👔 Managers'; html = this.staffHTML(); this.live = true; break;
      case 'pen': title = `🐾 ${PENS[this.penId].name}`; html = this.penHTML(); this.live = true; break;
      case 'decor': title = `${DECOR[this.decorItem?.k]?.icon || '🪴'} ${DECOR[this.decorItem?.k]?.name || 'Decoration'}`; html = decorItemHTML(this); this.live = !!DECOR[this.decorItem?.k]?.fruit; break;
      case 'wardrobe': title = '👕 Wardrobe'; tabs = []; html = wardrobeHTML(this); setTimeout(() => this.game.wardrobe.start(this.wardSel), 0); break;
      case 'mali': title = '🌹 Mali\'s stall'; html = maliHTML(this); break;
      case 'police': title = '🚓 Police Station'; html = policeHTML(this); this.live = ['status', 'filed', 'greet'].includes(this.pStep); break;
      case 'workshop': title =`🏭 ${BUILDINGS[this.shopId].name}`; html = this.workshopHTML(); this.live = true; break;
    }
    this.titleEl.textContent = title;
    this.tabs(tabs);
    if (this.cache.panelHtml !== html) {
      const y = this.body.scrollTop;
      this.body.innerHTML = html;
      this.cache.panelHtml = html;
      this.body.scrollTop = scrollTop ? 0 : y;
    }
    if (this.view === 'settings' || this.view === 'radio') this.bindSettings();
  }

  row(icon, title, sub, btnHtml = '', cls = '') {
    return `<div class="row ${cls}"><div class="ri">${icon}</div><div class="rt"><b>${title}</b><small>${sub}</small></div><div class="rb">${btnHtml}</div></div>`;
  }
  btn(label, act, data = {}, disabled = false, cls = '') {
    const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${v}"`).join(' ');
    return `<button class="mini ${cls}" data-act="${act}" ${attrs} ${disabled ? 'disabled' : ''}>${label}</button>`;
  }

  seedsHTML(select) {
    const st = this.game.state;
    let h = select ? '<p class="hint">Tap a seed to plant it. Buy more in the Shop.</p>' : '';
    for (const [id, c] of Object.entries(CROPS)) {
      const locked = st.level < c.level, n = st.seeds[id] || 0;
      const sub = locked ? `🔒 Level ${c.level}` : `Seed ₹${c.seed} · sells ₹${c.sell} · ${c.grow}s · ×${c.yield}`;
      let b = '';
      if (!locked) {
        if (select) b = this.btn(st.seed === id ? '✔ Planting' : `Plant (${n})`, 'pickSeed', { id }, n === 0 && st.seed !== id, st.seed === id ? 'on' : '');
        else b = [1, 10, 50].map((k) => this.btn(`+${k} · ₹${fmt(c.seed * k)}`, 'buySeed', { id, n: k }, st.money < c.seed * k)).join('');
      }
      h += this.row(c.icon, `${c.name} <span class="pa">${c.pa}</span>${n ? ` <span class="tag">${n}</span>` : ''}`, sub, b, locked ? 'locked' : '');
    }
    if (select) h += `<button class="btn wide" data-act="goShop">🛒 Buy seeds</button>`;
    return h;
  }

  upgradeRow(icon, label, list, key, extra = '') {
    const st = this.game.state, cur = list[st.up[key]], next = list[st.up[key] + 1];
    let b = '<span class="tag">MAX</span>';
    if (next) b = st.level < next.level ? `<span class="tag">🔒 L${next.level}</span>` : this.btn(`${next.name} · ${money(next.cost)}`, 'upgrade', { key }, st.money < next.cost);
    return this.row(icon, `${label}: ${cur.name}`, extra(cur, next), b);
  }

  shopHTML() {
    const g = this.game, st = g.state;
    switch (this.tab) {
      case 'seeds': return this.seedsHTML(false);
      case 'tools': return this.upgradeRow('🧺', 'Bag', BAGS, 'bag', (c, n) => `Carries ${c.cap}${n ? ` → ${n.cap}` : ''}`)
        + this.upgradeRow('💧', 'Water', CANS, 'can', (c, n) => `Holds ${c.cap}${n ? ` → ${n.cap}` : ''}`)
        + this.upgradeRow('🏚️', 'Storage', STORAGE, 'storage', (c, n) => `Stores ${c.cap}${n ? ` → ${n.cap}` : ''}`)
        + this.upgradeRow('🧺', 'Mandi', STALL, 'stall', (c, n) => `Shelf ${c.shelf}, customer every ${c.every}s${n ? ` → ${n.shelf}, ${n.every}s` : ''}`);
      case 'garden': return decorShopHTML(this);
      case 'wardrobe': setTimeout(() => this.open('wardrobe'), 0); return '';
      case 'land': return '<p class="hint">Buy here, or stand on the white pad in the field to pay.</p>' + FIELDS.map((f) => {
        const o = st.fields[f.id].owned;
        const b = o ? '<span class="tag ok">Owned</span>' : st.level < f.level ? `<span class="tag">🔒 L${f.level}</span>` : this.btn(`Buy ${money(f.cost - st.fields[f.id].paid)}`, 'buyField', { id: f.id }, st.money < f.cost - st.fields[f.id].paid);
        return this.row('🟫', f.name, `${f.cols * f.rows} plots`, b + (o ? '' : this.btn('📍', 'guide', { t: f.id })));
      }).join('') + this.scarecrowShopHTML();
      case 'build': {
        let h = '<p class="hint">Build here or stand on the site pad to pay.</p><h3>Animals</h3>';
        for (const [id, p] of Object.entries(PENS)) {
          const o = st.pens[id].owned;
          const b = o ? this.btn('Manage', 'openPen', { id }) : st.level < p.level ? `<span class="tag">🔒 L${p.level}</span>` : this.btn(`Build ${money(p.cost - st.pens[id].paid)}`, 'buildPen', { id }, st.money < p.cost - st.pens[id].paid);
          h += this.row(ITEMS[p.product].icon, `${p.name} <span class="pa">${p.en}</span>`, `${p.animalName} ₹${p.animalCost} · makes ${ITEMS[p.product].name} every ${p.cycle}s`, b + this.btn('📍', 'guide', { t: id }));
        }
        h += '<h3>Workshops</h3>';
        for (const [id, b0] of Object.entries(BUILDINGS)) {
          const o = st.buildings[id].owned;
          const b = o ? this.btn('Open', 'openShop', { id }) : st.level < b0.level ? `<span class="tag">🔒 L${b0.level}</span>` : this.btn(`Build ${money(b0.cost - st.buildings[id].paid)}`, 'buildShop', { id }, st.money < b0.cost - st.buildings[id].paid);
          h += this.row('🏭', `${b0.name} <span class="pa">${b0.pa}</span>`, b0.recipes.map((r) => `${ITEMS[r].icon} ${ITEMS[r].name}`).join(', '), b + this.btn('📍', 'guide', { t: id }));
        }
        return h;
      }
      case 'vehicles': {
        let h = '';
        for (const [id, v] of Object.entries(VEHICLES)) {
          const o = st.vehicles[id].owned;
          const b = o ? '<span class="tag ok">Owned</span>' + this.btn('📍', 'guide', { t: 'garage' }) : st.level < v.level ? `<span class="tag">🔒 L${v.level}</span>` : this.btn(`Buy ${money(v.cost)}`, 'buyVehicle', { id }, st.money < v.cost);
          h += this.row({ bike: '🏍️', tractor: '🚜', combine: '🌾' }[id], v.name, v.desc + (v.cargo ? ` Holds ${v.cargo}.` : ''), b);
        }
        if (st.vehicles.bike.owned) {
          const e = st.vehicles.bike.hp, next = BIKE_ENGINES[e + 1];
          h += this.row('🏍️', `Bullet engine: ${BIKE_ENGINES[e].name}`, `Top speed ${Math.round(BIKE_ENGINES[e].top * 3.6)} km/h${next ? ` → ${Math.round(next.top * 3.6)} km/h, quicker pickup` : ''}. Paint and extras: Goals → 🏍️ Gerhi`,
            next ? (st.level < next.level ? `<span class="tag">🔒 L${next.level}</span>` : this.btn(`${next.name.split(' ·')[0]} · ${money(next.cost)}`, 'bikeUp', {}, st.money < next.cost)) : '<span class="tag">MAX</span>');
        }
        if (st.vehicles.tractor.owned) {
          h += '<h3>Tractor attachments</h3>';
          for (const [id, a] of Object.entries(ATTACHMENTS)) {
            const o = st.vehicles.tractor.atts[id];
            const b = o ? '<span class="tag ok">Owned</span>' : st.level < a.level ? `<span class="tag">🔒 L${a.level}</span>` : this.btn(`Buy ${money(a.cost)}`, 'buyAtt', { id }, st.money < a.cost);
            h += this.row({ cultivator: '⛏️', seeder: '🌱', sprayer: '💧', reaper: '✂️' }[id], a.name, { till: 'Tills soil', plant: 'Sows your selected seed', water: `Waters crops (tank ${TANKER_CAP})`, harvest: 'Harvests into the trolley' }[a.action], b);
          }
          const hp = st.vehicles.tractor.hp, next = TRACTOR_HP[hp + 1];
          h += this.row('⚙️', `Engine: ${TRACTOR_HP[hp].name}`, `Works a ${TRACTOR_HP[hp].radius.toFixed(1)} m radius${next ? ` → ${next.radius.toFixed(1)} m` : ''}`,
            next ? (st.level < next.level ? `<span class="tag">🔒 L${next.level}</span>` : this.btn(`${next.name} · ${money(next.cost)}`, 'tractorHP', {}, st.money < next.cost)) : '<span class="tag">MAX</span>');
        }
        return h;
      }
    }
    return '';
  }

  farmHTML() {
    const g = this.game, st = g.state;
    switch (this.tab) {
      case 'fields': {
        let h = `<p class="hint">A Seeri (field manager) farms a field on their own, buying seeds as needed. Wages ₹${wage(SEERI.salary, st.seeriRank)}/day. ${this.btn('👔 Managers', 'openStaff')}</p>`;
        for (const f of FIELDS) {
          const fd = st.fields[f.id];
          if (!fd.owned) continue;
          const [u, t, , gr, r] = g.farm.counts(f.id);
          const b = fd.seeri ? this.btn('Dismiss', 'fire', { role: 'seeri', id: f.id }, false, 'ghost') : st.level < STAFF.seeri.level ? `<span class="tag">🔒 L${STAFF.seeri.level}</span>` : this.btn(`Hire Seeri ${money(STAFF.seeri.hire)}`, 'hire', { role: 'seeri', id: f.id }, st.money < STAFF.seeri.hire);
          h += `<div class="card2"><div class="ct"><b>🟫 ${f.name}</b>${fd.seeri ? '<span class="tag ok">👳 Seeri working</span>' : ''}</div>
            <small>${r} ripe · ${gr} growing · ${t} tilled · ${u} empty</small>
            <div class="ctrl">${fd.seeri ? `${this.cropBtn(f.id)}` : ''}${b}${this.btn('📍', 'guide', { t: f.id })}</div></div>`;
        }
        return h;
      }
      case 'animals': {
        let h = '';
        for (const [id, p] of Object.entries(PENS)) {
          const d = st.pens[id];
          if (!d.owned) { h += this.row('🔒', p.name, `Level ${p.level} · ${money(p.cost)}`, this.btn('📍', 'guide', { t: id }), 'locked'); continue; }
          const pen = g.animals.pens[id];
          h += this.row(ITEMS[p.product].icon, `${p.name} · ${d.n}/${pen.cap()} ${p.plural}`, `Feed ${d.feed} · Water ${d.pipe ? 'pipe' : d.water} · Ready ${d.ready}`, this.btn('Manage', 'openPen', { id }));
        }
        return h;
      }
      case 'work': {
        let h = '';
        for (const [id, b] of Object.entries(BUILDINGS)) {
          const d = st.buildings[id];
          if (!d.owned) { h += this.row('🔒', b.name, `Level ${b.level} · ${money(b.cost)}`, this.btn('📍', 'guide', { t: id }), 'locked'); continue; }
          const out = Object.entries(d.out).map(([k, n]) => `${n}${ITEMS[k].icon}`).join(' ') || '—';
          h += this.row('🏭', b.name, `${g.production.shops[id].statusText()} · Output ${out}`, this.btn('Open', 'openShop', { id }));
        }
        return h;
      }
      case 'blessings': {
        const gu = st.guru;
        let h = `<div class="card2 gold"><b>🙏 Soul points: ${st.soul}</b><small>Visit Gurdwara Sri Dukh Niwaran Sahib every day. Streak: ${gu.streak} day${gu.streak === 1 ? '' : 's'}.${g.perks.blessed ? ' ✨ Blessed today.' : ' Not visited today.'}</small><div class="ctrl">${this.btn('📍 Go to Gurdwara', 'guide', { t: 'darbar' })}</div></div>`;
        for (const p of SOUL_PERKS) h += this.row(st.soul >= p.at ? '🌟' : '🔒', p.name, `${p.desc} · at ${p.at} soul points`, st.soul >= p.at ? '<span class="tag ok">Active</span>' : `<span class="tag">${st.soul}/${p.at}</span>`);
        h += `<p class="hint">Langar Seva: give produce at the langar hall. Every ${5} items earns a soul point (up to ${25} a day).</p>`;
        return h;
      }
      case 'stats': {
        const s = st.stats;
        const rows = [['💰 Total earned', money(s.earned)], ['🌾 Crops harvested', s.harvested], ['⛏️ Plots tilled', s.tilled], ['🛒 Items sold', s.sold], ['📋 Orders done', s.orders], ['🏭 Batches made', s.made], ['🥚 Animal products', s.products], ['🍲 Langar seva', s.langar], ['🚜 Tractor work', s.tractorWork], ['📅 Day', st.day.n], ['🧾 Wages / day', money(g.staff.salaries())]];
        return `<div class="stats">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
      }
    }
    return '';
  }

  missionsHTML() {
    const g = this.game, st = g.state;
    if (this.tab === 'mission') {
      const q = QUESTS[st.quest];
      let h = '';
      if (q) {
        const [p, n] = g.progression.questProgress();
        h += `<div class="card2 gold"><b>📜 ${esc(q.text)}</b><div class="bar"><i style="width:${p / n * 100}%"></i></div><small>${p}/${n} · Reward ₹${q.reward}</small>${q.target ? `<div class="ctrl">${this.btn('📍 Show me', 'guide', { t: q.target })}</div>` : ''}</div>`;
      } else h += '<div class="card2 gold"><b>🏆 Every mission complete!</b><small>You are a true Patiala zamindar.</small></div>';
      h += '<h3>Coming up</h3>';
      for (const n of QUESTS.slice(st.quest + 1, st.quest + 5)) h += this.row('▫️', esc(n.text), `Reward ₹${n.reward}`);
      return h;
    }
    if (this.tab === 'gerhi') return this.gerhiHTML();
    if (this.tab === 'daily') {
      return `<p class="hint">New goals every day. Finished goals pay out automatically.</p>` + st.daily.goals.map((d) => `<div class="card2 ${d.done ? 'done' : ''}"><b>${d.done ? '✅' : '🎯'} ${esc(d.text)}</b><div class="bar"><i style="width:${Math.min(1, d.prog / d.n) * 100}%"></i></div><small>${Math.min(d.prog, d.n).toLocaleString('en-IN')}/${d.n.toLocaleString('en-IN')} · ₹${d.money} + ${d.xp} XP</small></div>`).join('');
    }
    return ACHIEVEMENTS.map((a) => this.row(st.ach[a.id] ? '🏆' : '▫️', a.text, `${Math.min(st.stats[a.stat] || 0, a.n).toLocaleString('en-IN')}/${a.n.toLocaleString('en-IN')}`, st.ach[a.id] ? '<span class="tag ok">Done</span>' : '', st.ach[a.id] ? '' : 'locked')).join('');
  }

  // ---------------------------------------------------------------- gerhi and Aura
  gerhiHTML() {
    const g = this.game, st = g.state, a = st.aura, gh = g.gerhi;
    const bike = st.vehicles.bike.owned;
    let h = `<div class="card2 gold aura"><b class="big">✨ ${fmt(a.pts)} Aura</b><small>${(a.dist / 1000).toFixed(1)} km ridden · ${a.laps} laps${a.best ? ` · best lap ${fmtT(a.best)}` : ''}${a.title ? ' · 👑 Gerhi Raja' : ''}</small>
      ${bike ? '' : `<div class="ctrl">${this.btn('🏍️ Get a Bullet', 'goVehicles')}</div>`}</div>`;
    h += `<p class="hint">Ride the Bullet round the ring road: every 200 m earns Aura (${AURA.distPerDay} a day), every full lap +${AURA.lap} (${AURA.lapsPerDay} a day), and each sight of Patiala you find +20.</p>`;
    h += "<h3>Today's challenges</h3>";
    for (const gl of a.goals) {
      const G = AURA.goals.find((x) => x.id === gl.id), [n, of] = gh.progress(gl);
      h += `<div class="card2 ${gl.done ? 'done' : ''}"><b>${gl.done ? '✅' : '🏍️'} ${esc(G.text)}</b><div class="bar"><i style="width:${Math.min(1, n / of) * 100}%"></i></div><small>${G.type === 'dist' ? `${(n / 1000).toFixed(1)}/${of / 1000} km` : `${n}/${of}`} · +${AURA.goal} ✨ and ₹${50 + st.level * 10}</small></div>`;
    }
    h += '<h3>Sights of Patiala</h3><div class="chips">' + AURA.spots.map((s) => `<span class="chip ${a.spots[s.id] ? 'on' : ''}">${a.spots[s.id] ? s.icon : '❔'} ${a.spots[s.id] ? s.name : 'Not found yet'}</span>`).join('') + '</div>';
    h += '<h3>Spend Aura on your Bullet</h3>';
    for (const [id, r] of Object.entries(AURA.rewards)) {
      const own = a.owned[id];
      const b = own ? (r.paint ? (a.paint === id ? '<span class="tag ok">On</span>' : this.btn('Use', 'auraPaint', { id })) : '<span class="tag ok">Yours</span>') : this.btn(`${r.cost} ✨`, 'auraBuy', { id }, a.pts < r.cost);
      h += this.row(r.icon, r.name, r.paint ? 'Paint job for the tank and mudguards' : { ribbons: 'Bright ribbons on the handlebar', horn: 'Tap 📯 on the Bullet for the three-tone horn', lamps: 'Two chrome fog lamps on the crash guard', title: 'Shown next to your name' }[id], b);
    }
    if (Object.keys(AURA.rewards).some((id) => AURA.rewards[id].paint && a.owned[id])) h += this.row('⬛', 'Original black', 'The classic look', !a.paint ? '<span class="tag ok">On</span>' : this.btn('Use', 'auraPaint', { id: '' }));
    h += '<h3>Milestones</h3>';
    for (const m of AURA.miles) {
      const v = m.stat === 'dist' ? a.dist : a.laps;
      h += this.row(a.miles[m.id] ? '🏆' : '▫️', m.text, `${m.stat === 'dist' ? `${(Math.min(v, m.n) / 1000).toFixed(1)}/${m.n / 1000} km` : `${Math.min(v, m.n)}/${m.n}`} · +${m.pts} ✨`, a.miles[m.id] ? '<span class="tag ok">Done</span>' : '', a.miles[m.id] ? '' : 'locked');
    }
    return h;
  }

  radioHTML() {
    const g = this.game, s = g.state.settings, au = g.audio;
    const st = (id, icon, name, sub) => `<button class="station ${s.radio === id && !s.ownMusic ? 'on' : ''}" data-act="radio" data-id="${id}"><b>${icon} ${name}</b><small>${sub}</small></button>`;
    let h = `<div class="stations">${st('fm', '📻', 'Patiala FM', `Now: ${RADIO[(au.track || 0) % RADIO.length].name}`)}${st('area', '🎵', 'Area music', 'The tune of wherever you are')}${st('off', '🔇', 'Radio off', 'Just the engine and the road')}</div>`;
    h += `<div class="row2"><button class="btn ghost" data-act="radioPrev">⏮ Previous</button><button class="btn ghost" data-act="radioNext">Next ⏭</button></div>`;
    h += `<label class="set">🔊 Radio volume <input type="range" min="0" max="1" step="0.05" value="${s.radioVol ?? 0.8}" data-set="radioVol"></label>`;
    h += `<div class="card2 ${s.ownMusic ? 'gold' : ''}"><b>🎧 My music</b><small>Play songs from your own music app (Spotify, YouTube Music, Apple Music…) while you ride: start them there, then come back. The game turns its own music off and keeps its sounds.</small><div class="ctrl">${this.btn(s.ownMusic ? 'Turn off' : 'Turn on', 'ownMusic', {}, false, s.ownMusic ? 'ghost' : '')}</div></div>`;
    h += '<p class="hint small">Patiala FM plays original tracks made for this game. Commercial songs (Sidhu Moose Wala and others) need a licence from their rights holders before a game can include them, so use 🎧 My music for those.</p>';
    return h;
  }

  bagHTML() {
    const g = this.game, st = g.state;
    if (this.tab === 'carry') {
      const counts = {};
      for (const id of st.carry) counts[id] = (counts[id] || 0) + 1;
      const rows = Object.entries(counts).map(([id, n]) => this.row(ITEMS[id].icon, `${ITEMS[id].name} × ${n}`, `Worth ${money(ITEMS[id].price * n)} at the mandi`));
      return `<p class="hint">${BAGS[st.up.bag].name}: ${st.carry.length}/${carryCap(st)} · 💧 ${st.water}/${CANS[st.up.can].cap}</p>` + (rows.join('') || '<p class="empty">Nothing in your bag. Harvest crops or collect goods.</p>');
    }
    if (this.tab === 'storage') {
      const rows = Object.entries(st.storage).filter(([, n]) => n > 0).map(([id, n]) => this.row(ITEMS[id].icon, `${ITEMS[id].name} × ${n}`, `${money(ITEMS[id].price)} each`,
        this.btn('Take 1', 'takeOut', { id, n: 1 }, st.carry.length >= carryCap(st)) + this.btn('Take all', 'takeOut', { id, n: 999 }, st.carry.length >= carryCap(st))));
      return `<p class="hint">${STORAGE[st.up.storage].name}: ${storageUsed(st)}/${storageCap(st)}. Drop goods on the blue pad at the godown. Workshops and orders can use godown stock.</p>` + (rows.join('') || '<p class="empty">The godown is empty.</p>');
    }
    return this.seedsHTML(true);
  }

  mapHTML() {
    const g = this.game, st = g.state;
    // simple top-down SVG map
    const X = (x) => (x + 47) * 3, Z = (z) => (z + 66) * 3;
    let s = `<svg viewBox="0 0 270 336" class="map"><rect width="270" height="336" fill="#8fd14f" rx="12"/>`;
    s += `<rect x="${X(-45)}" y="0" width="${3 * 3}" height="336" fill="#4fb3d9"/><text x="${X(-43.6) + 2}" y="120" transform="rotate(-90 ${X(-43.6) + 2} 120)" class="mt" fill="#fff">BHAKHRA</text>`;
    s += `<rect x="${X(-1.6)}" y="${Z(-29)}" width="${3.2 * 3}" height="${73 * 3}" fill="#dba467"/><rect x="${X(-22)}" y="${Z(-63)}" width="${38 * 3}" height="${34 * 3}" fill="#f1ece2"/>`;
    s += `<rect x="${X(-8)}" y="${Z(-44)}" width="48" height="24" fill="#4fb3d9"/><circle cx="${X(0)}" cy="${Z(-55)}" r="9" fill="#f2bd3a"/>`;
    for (const f of FIELDS) s += `<rect x="${X(f.x0)}" y="${Z(f.z0)}" width="${f.cols * PLOT * 3}" height="${f.rows * PLOT * 3}" fill="${st.fields[f.id].owned ? '#8a5a32' : '#6faa3e'}" stroke="#fff" stroke-width="${st.fields[f.id].owned ? 0 : 1}" stroke-dasharray="3 2" rx="2"/>`;
    const dot = (x, z, c, r = 4) => `<circle cx="${X(x)}" cy="${Z(z)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
    s += `<rect x="0" y="${Z(FLY_Z) - 5}" width="270" height="10" fill="#adb5bd" opacity=".9"/><text x="${X(-30)}" y="${Z(FLY_Z) + 3.5}" class="mt" fill="#1d1d1f">22 No. FLYOVER</text>`;
    s += dot(...POS.stall, '#f76707') + dot(...POS.godown, '#74c0fc') + dot(...POS.tubewell, '#1c7ed6') + dot(...POS.farmhouse, '#fff3bf') + dot(...POS.gopal, '#e64980', 5);
    if (g.vendors?.v) s += dot(g.vendors.v.w.pos.x, g.vendors.v.w.pos.z, '#ffd43b', 5);
    s += dot(...GARDEN.centre, '#d6336c', 6) + dot(...POLICE.spot, '#1c3f94', 5);
    for (const [id, p] of Object.entries(POS.pens)) s += dot(p[0], p[1], st.pens[id].owned ? '#ffd43b' : '#ced4da');
    for (const [id, p] of Object.entries(POS.buildings)) s += dot(p[0], p[1], st.buildings[id].owned ? '#d6336c' : '#ced4da');
    s += `<circle cx="${X(g.player.pos.x)}" cy="${Z(g.player.pos.z)}" r="6" fill="#e8590c" stroke="#fff" stroke-width="2.5"/></svg>`;
    const places = [['f1', '🟫 Your khet'], ['tubewell', '💧 Tubewell'], ['stall', '🧺 Mandi stall'], ['arhtiya', '⚖️ Arhtiya'], ['board', '📋 Order board'], ['godown', '🏚️ Godown'], ['gopal', "🍥 Gopal's Sweets"], ...(g.vendors?.v ? [['vendor', `${VENDORS[g.vendors.v.id].icon} Vendor deal`]] : []), ['darbar', '🙏 Gurdwara Dukh Niwaran Sahib'], ['baradari', '🌹 Baradari Gardens'], ['police', '🚓 Police Station'], ['langar', '🍲 Langar hall'], ['flyover', '🌉 22 No. Flyover'], ['canal', '🌊 Bhakhra Nehar'], ['garage', '🚜 Garage'], ['farmhouse', '🏡 Kothi (home)'], ['coop', '🐔 Murgi Khana'], ['tabela', '🐃 Tabela'], ['bakri', '🐐 Goats'], ['bhed', '🐑 Sheep'], ...Object.entries(BUILDINGS).map(([id, b]) => [id, `🏭 ${b.name}`])];
    return `<div class="mapwrap">${s}</div><div class="chips">${places.map(([t, n]) => `<button class="chip" data-act="guide" data-t="${t}">${n}</button>`).join('')}</div>`;
  }

  settingsHTML() {
    const st = this.game.state, s = st.settings;
    const saved = st.saved ? new Date(st.saved).toLocaleTimeString() : 'not yet';
    return `
      <label class="set">🎵 Music <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-set="music"></label>
      <label class="set">🔊 Sound effects <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-set="sfx"></label>
      <label class="set">🕹️ Joystick sensitivity <input type="range" min="0.6" max="1.6" step="0.1" value="${s.sens}" data-set="sens"></label>
      <label class="set">🎥 Camera distance <input type="range" min="0.75" max="1.4" step="0.05" value="${s.zoom}" data-set="zoom"></label>
      <div class="set">🖼️ Graphics <div class="seg">${['auto', 'low', 'medium', 'high'].map((q) => `<button data-act="quality" data-q="${q}" class="${s.quality === q ? 'on' : ''}">${q}</button>`).join('')}</div></div>
      <div class="set">👳 Pagg colour <div class="swatches">${TURBAN_COLORS.map((c) => `<button data-act="turban" data-c="${c}" style="background:${c}" class="${st.turban === c ? 'on' : ''}"></button>`).join('')}</div></div>
      <label class="set">✏️ Name <input type="text" maxlength="14" value="${esc(st.name)}" data-set="name"></label>
      <div class="set">🎧 My own music <div class="seg"><button data-act="ownMusic" class="${s.ownMusic ? 'on' : ''}">${s.ownMusic ? 'On — game music off' : 'Off'}</button></div></div>
      <button class="btn wide" data-act="share">📤 Share the game</button>
      <p class="hint">💾 Progress saves automatically on this device (last saved ${saved}).${saveWorks() ? '' : ' ⚠️ Saving is blocked in this browser mode (private browsing?).'} Saves stay in this browser — they do not sync between devices. Tip: Safari → Share → Add to Home Screen keeps your farm safest.</p>
      <div class="row2"><button class="btn ghost" data-act="backup">💾 Back up my farm</button><button class="btn ghost" data-act="restore">📥 Restore a backup</button></div>
      <p class="hint small">A backup code is your whole farm as text. Keep it in your Notes or WhatsApp to yourself, and restore it on a new phone or after clearing Safari.</p>
      <button class="btn wide danger" data-act="reset">Start a new farm…</button>
      <p class="hint small">Patiala Kisan · ${this.game.state.day.n} days farmed</p>`;
  }
  bindSettings() {
    for (const el of this.body.querySelectorAll('[data-set]')) {
      el.oninput = () => {
        const st = this.game.state, k = el.dataset.set;
        if (k === 'name') { st.name = el.value.trim() || 'Kisan'; $('pname').textContent = st.name; return; }
        st.settings[k] = +el.value;
        this.game.audio.applyVolumes();
      };
    }
  }

  ordersHTML() {
    const g = this.game, st = g.state;
    let h = '<p class="hint">Deliver from your bag or godown. Orders pay 40% more than the mandi.</p>';
    for (const o of st.orders) {
      const ok = g.market.canFill(o);
      h += `<div class="card2"><div class="ct"><b>👤 ${esc(o.name)}</b><span class="tag gold">₹${fmt(o.reward)} · ${o.xp} XP</span></div><div class="need">${Object.entries(o.items).map(([k, n]) => {
        const hv = have(st, k);
        return `<span class="${hv >= n ? 'ok' : ''}">${ITEMS[k].icon} ${Math.min(hv, n)}/${n} ${ITEMS[k].name}</span>`;
      }).join('')}</div><div class="ctrl">${this.btn('Deliver', 'fill', { id: o.id }, !ok, 'go')}${this.btn('Skip', 'skip', { id: o.id }, false, 'ghost')}</div></div>`;
    }
    return h;
  }

  penHTML() {
    const g = this.game, st = g.state, id = this.penId, p = PENS[id], d = st.pens[id], pen = g.animals.pens[id];
    const nextCap = p.caps[d.capLvl + 1], capCost = p.capCosts[d.capLvl];
    const feedsInGodown = p.feeds.reduce((a, f) => a + (st.storage[f] || 0), 0);
    let h = `<div class="stats"><div><span>${p.plural}</span><b>${d.n}/${pen.cap()}</b></div><div><span>🌾 Feed</span><b>${d.feed}/${pen.feedCap()}</b></div><div><span>💧 Water</span><b>${d.pipe ? 'Pipe ✔' : `${d.water}/${PEN_WATER_CAP}`}</b></div><div><span>${ITEMS[p.product].icon} Ready</span><b>${d.ready}</b></div><div><span>⏱️ Each makes</span><b>1 / ${p.cycle}s</b></div></div>`;
    h += `<p class="hint">Eats ${p.feeds.map((f) => `${ITEMS[f].icon} ${ITEMS[f].name}`).join(', ')}. Stand on the yellow pad to feed, blue to water, green to collect.</p>`;
    h += this.row(ITEMS[p.product].icon, `Buy a ${p.animalName}`, money(p.animalCost), this.btn('Buy', 'buyAnimal', {}, d.n >= pen.cap() || st.money < p.animalCost));
    h += this.row('🧱', 'Bigger pen', nextCap ? `Room for ${nextCap}` : 'Max size', nextCap ? this.btn(money(capCost), 'penCap', {}, st.money < capCost) : '<span class="tag">MAX</span>');
    h += this.row('🚰', 'Tubewell pipe', 'Animals never run out of water', d.pipe ? '<span class="tag ok">Fitted</span>' : this.btn(money(PEN_PIPE_COST), 'penPipe', {}, st.money < PEN_PIPE_COST));
    h += this.row('🏚️', 'Feed from godown', `${feedsInGodown} usable in godown`, this.btn('Fill', 'penFill', {}, !feedsInGodown || d.feed >= pen.feedCap()));
    return h;
  }

  workshopHTML() {
    const g = this.game, st = g.state, id = this.shopId, b = BUILDINGS[id], d = st.buildings[id], shop = g.production.shops[id], up = BUILDING_UPGRADES[d.lvl];
    let h = `<div class="card2"><b>${shop.statusText()}</b><small>Queue ${d.queue.length}/${up.slots} · Speed ×${up.speed}</small>`;
    const out = Object.entries(d.out);
    h += `<div class="ctrl">${out.length ? out.map(([k, n]) => `${n} ${ITEMS[k].icon}`).join(' ') + ' ' + this.btn('Collect to bag', 'collectOut', {}, st.carry.length >= carryCap(st)) : '<small>No finished goods yet</small>'}</div></div>`;
    for (const rid of b.recipes) {
      const r = RECIPES[rid];
      const ins = Object.entries(r.in).map(([k, n]) => { const hv = have(st, k) + (d.inp[k] || 0); return `<span class="${hv >= n ? 'ok' : ''}">${n}${ITEMS[k].icon}</span>`; }).join(' + ');
      const outs = Object.entries(r.out).map(([k, n]) => `${n}${ITEMS[k].icon} ${ITEMS[k].name}`).join(', ');
      const can = Object.entries(r.in).every(([k, n]) => have(st, k) + (d.inp[k] || 0) >= n) && d.queue.length < up.slots;
      h += this.row(ITEMS[rid].icon, `${outs}`, `<span class="need">${ins}</span> · ${Math.round(r.time / up.speed)}s · sells ₹${ITEMS[rid].price}`,
        this.btn('Make', 'make', { r: rid }, !can, 'go') + this.btn(d.recipe === rid ? '★ Auto' : 'Auto', 'autoRecipe', { r: rid }, false, d.recipe === rid ? 'on' : 'ghost'));
    }
    const next = BUILDING_UPGRADES[d.lvl + 1];
    if (next) {
      const cost = Math.round(b.cost * next.costMul);
      h += this.row('⬆️', `Upgrade to level ${d.lvl + 2}`, `Speed ×${next.speed}, queue ${next.slots}`, this.btn(money(cost), 'shopUp', {}, st.money < cost));
    }
    h += '<p class="hint">★ Auto: goods dropped on the yellow pad start this recipe automatically.</p>';
    return h;
  }

  // ---------------------------------------------------------------- managers
  staffCard(role, cfg, data) {
    const g = this.game, st = g.state;
    const rank = role === 'seeri' ? st.seeriRank : data.rank;
    const img = portrait(g.renderer, role, cfg.look, cfg.tool);
    const r = MANAGER_RANKS[rank], next = MANAGER_RANKS[rank + 1];
    const hired = role === 'seeri' ? Object.values(st.fields).some((f) => f.owned && f.seeri) : data.on;
    const locked = st.level < cfg.level;
    const starsHtml = MANAGER_RANKS.map((_, i) => `<span class="${i <= rank ? 'on' : ''}">★</span>`).join('');
    let ctrl = '';
    if (locked) ctrl = `<span class="tag">🔒 Level ${cfg.level}</span>`;
    else if (role !== 'seeri' && !data.on) ctrl = this.btn(`Hire ${money(cfg.hire - (data.paid || 0))}`, 'hire', { role }, st.money < cfg.hire - (data.paid || 0), 'go') + this.btn('📍 Desk', 'guide', { t: role }, false, 'ghost');
    else {
      const cost = g.staff.trainCost(role);
      ctrl = next ? this.btn(`⬆️ Train to ${next.name} · ${money(cost)}`, 'train', { role }, st.money < cost) : '<span class="tag gold">🏅 Top rank</span>';
      if (role !== 'seeri') ctrl += this.btn('📍', 'guide', { t: role }, false, 'ghost') + this.btn('Dismiss', 'fire', { role }, false, 'ghost');
    }
    const status = role === 'seeri' ? `${Object.values(st.fields).filter((f) => f.owned && f.seeri).length} working · ₹${wage(cfg.salary, rank)}/day each`
      : data.on ? `${esc(g.staff.status(role))} · ₹${wage(cfg.salary, rank)}/day` : `Wages ₹${wage(cfg.salary, rank)}/day once hired`;
    return `<div class="mgr ${hired ? 'on' : ''} ${locked ? 'locked' : ''} ${this.focusRole === role ? 'focus' : ''}">
      <div class="pt" style="--c:#${new THREE.Color(cfg.look.turban).getHexString()}">${img ? `<img src="${img}" alt="">` : cfg.icon}</div>
      <div class="mi"><div class="mn"><b>${cfg.icon} ${cfg.name}</b><span class="pa">${cfg.role}</span></div>
        <div class="stars">${starsHtml}<em>${r.name} · speed ×${role === 'seeri' ? +(r.speed * SEERI.work).toFixed(2) : r.speed}</em></div>
        <small>${cfg.desc}</small>
        <small class="st">${hired ? '🟢 ' : ''}${status}</small>
        <div class="ctrl">${ctrl}</div></div></div>`;
  }

  staffHTML() {
    const g = this.game, st = g.state;
    let h = `<p class="hint">Managers run a part of your farm on their own — even while the game is closed (up to ${OFFLINE_HOURS} hours). Hire them here or stand on the white ring at their desk. Training makes them faster. Wages: ₹${fmt(g.staff.salaries())} per day.</p>`;
    for (const [role, cfg] of Object.entries(MANAGERS)) h += this.staffCard(role, cfg, st.managers[role]);
    h += '<h3>🧑‍🌾 Seeris (one per field)</h3>' + this.staffCard('seeri', SEERI, null);
    for (const f of FIELDS) {
      const fd = st.fields[f.id];
      if (!fd.owned) continue;
      const b = fd.seeri ? this.btn('Dismiss', 'fire', { role: 'seeri', id: f.id }, false, 'ghost') : st.level < SEERI.level ? `<span class="tag">🔒 L${SEERI.level}</span>` : this.btn(`Hire ${money(SEERI.hire)}`, 'hire', { role: 'seeri', id: f.id }, st.money < SEERI.hire);
      h += this.row(fd.seeri ? '🧑‍🌾' : '🟫', f.name, fd.seeri ? `Growing ${this.cropBtn(f.id)}` : `${f.cols * f.rows} plots · no Seeri`, b);
    }
    return h;
  }

  awayReport(r) {
    const h = Math.floor(r.minutes / 60), m = r.minutes % 60;
    const lines = [];
    if (r.stallItems) lines.push(`🧺 Dukaandar sold ${r.stallItems} items · ${money(r.stall)}`);
    if (r.harvested) lines.push(`🧑‍🌾 Seeris harvested ${r.harvested} crops`);
    if (r.products) lines.push(`🐄 Pali collected ${r.products} eggs, milk and wool`);
    if (r.made) lines.push(`🔧 Workshops finished ${r.made} batches`);
    if (r.munshi) lines.push(`📒 Munshi earned ${money(r.munshi)}`);
    if (!lines.length) lines.push('Your managers kept everything tidy.');
    this.modal(`<div class="big">🌙</div><h2>While you were away</h2><p>${h ? `${h} h ` : ''}${m} min</p><ul class="unl">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${r.money > 0 ? `<p class="gain">+${money(r.money)} earned</p>` : ''}`, 'Shabaash! 👏');
  }

  // ---------------------------------------------------------------- Seeri crop picker
  // Its own overlay (not part of the live panel, which redraws four times a second), so it
  // stays open until you press Done. Every tap is saved at once: tick several crops and the
  // Seeri sows them in turn.
  setFieldCrop(fid, crop) { const fd = this.game.state.fields[fid]; fd.crop = crop; fd.crops = [crop]; }
  cropBtn(fid) {
    const fd = this.game.state.fields[fid], list = fieldCrops(fd);
    return `<button class="chip cropbtn" data-act="seeriCrops" data-id="${fid}">${list.slice(0, 4).map((c) => CROPS[c].icon).join(' ')}${list.length > 4 ? ` +${list.length - 4}` : ''} ✏️ Choose crops</button>`;
  }
  openPicker(fid) {
    this.pickerField = fid;
    let el = $('picker');
    if (!el) {
      el = document.createElement('div');
      el.id = 'picker';
      $('app').appendChild(el);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.target.closest('[data-pk]');
        if (!b) return;
        this.game.audio.play('click');
        if (b.dataset.pk === 'done') return this.closePicker();
        if (b.dataset.pk === 'all' || b.dataset.pk === 'none') return this.pickAll(b.dataset.pk === 'all');
        this.togglePick(b.dataset.pk);
      });
      for (const ev of ['pointerdown', 'touchstart', 'touchmove', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    }
    this.renderPicker();
    el.hidden = false;
    this.game.save(true);
  }
  closePicker() { const el = $('picker'); if (el) { el.hidden = true; el.dataset.field = ''; } this.pickerField = null; if (this.view) this.render(); this.game.save(true); }
  pickable() { return Object.entries(CROPS).filter(([, c]) => c.level <= this.game.state.level).map(([id]) => id); }
  togglePick(id) {
    const g = this.game, fd = g.state.fields[this.pickerField];
    if (!fd || !CROPS[id] || g.state.level < CROPS[id].level) return;
    let list = fieldCrops(fd).slice();
    if (list.includes(id)) { if (list.length === 1) { this.toast('Keep at least one crop'); return; } list = list.filter((c) => c !== id); }
    else list.push(id);
    fd.crops = list; fd.crop = list[0];
    this.renderPicker();
  }
  pickAll(all) {
    const fd = this.game.state.fields[this.pickerField];
    const list = all ? this.pickable() : [fieldCrops(fd)[0]];
    fd.crops = list; fd.crop = list[0];
    this.renderPicker();
  }
  renderPicker() {
    const st = this.game.state, f = FIELDS.find((x) => x.id === this.pickerField), fd = st.fields[this.pickerField];
    const on = new Set(fieldCrops(fd)), el = $('picker'), keep = el.querySelector('.pgrid')?.scrollTop || 0;
    // after the first draw only the ticks change: the grid itself is never rebuilt, so scrolling is never disturbed
    if (el.dataset.field === this.pickerField && el.querySelector('.pgrid')) {
      for (const tile of el.querySelectorAll('.ptile')) {
        const k = tile.dataset.pk, sel = !!k && on.has(k);
        tile.classList.toggle('on', sel);
        const mark = tile.querySelector('em');
        if (sel && !mark) tile.insertAdjacentHTML('beforeend', '<em>✔</em>'); else if (!sel && mark) mark.remove();
      }
      el.querySelector('.pfoot span').textContent = `${on.size} chosen`;
      return;
    }
    el.dataset.field = this.pickerField;
    const tiles = Object.entries(CROPS).map(([id, c]) => {
      const locked = st.level < c.level;
      return `<button class="ptile ${on.has(id) ? 'on' : ''} ${locked ? 'locked' : ''}" data-pk="${locked ? '' : id}" ${locked ? 'disabled' : ''}>
        <i>${c.icon}</i><b>${c.name}</b><small>${locked ? `🔒 Level ${c.level}` : `₹${c.seed} → ₹${c.sell * c.yield} · ${c.grow}s`}</small>${on.has(id) ? '<em>✔</em>' : ''}</button>`;
    }).join('');
    el.innerHTML = `<div class="pcard"><div class="phead"><b>🧑‍🌾 ${f.name}</b><small>Tap crops to add or remove them. The Seeri sows them in turn.</small></div>
      <div class="pgrid">${tiles}</div>
      <div class="pfoot"><span>${on.size} chosen</span><button class="mini ghost" data-pk="none">Just one</button><button class="mini ghost" data-pk="all">All</button><button class="btn" data-pk="done">✅ Done</button></div></div>`;
    el.querySelector('.pgrid').scrollTop = keep;
  }

  // ---------------------------------------------------------------- scarecrows
  scarecrowShopHTML() {
    const st = this.game.state, L0 = SCARECROW_LEVELS[0], locked = st.level < L0.level, full = st.scarecrows.length >= SCARECROW_MAX;
    let h = `<h3>🧍 Scarecrows · ${st.scarecrows.length}/${SCARECROW_MAX}</h3><p class="hint">Crows peck growing crops and set them back. A scarecrow guards everything within its circle (${L0.radius} m to start). Put it anywhere on or beside your fields, then upgrade it.</p>`;
    for (const [id, d] of Object.entries(SCARECROW_DESIGNS)) {
      const b = locked ? `<span class="tag">🔒 L${L0.level}</span>` : this.btn(`Place ${money(L0.cost)}`, 'scarecrowBuy', { d: id }, full || st.money < L0.cost);
      h += this.row(d.icon, d.name, d.desc, b);
    }
    return h;
  }
  scarecrowHTML() {
    const g = this.game, st = g.state, m = this.scarecrow;
    if (!m || !g.scarecrows.list.includes(m)) return '<p class="empty">This scarecrow is gone.</p>';
    const L = SCARECROW_LEVELS[m.data.lvl], N = SCARECROW_LEVELS[m.data.lvl + 1], D = SCARECROW_DESIGNS[m.data.d];
    let h = `<div class="stats"><div><span>Level</span><b>${L.name}</b></div><div><span>Protects</span><b>${L.radius} m</b></div><div><span>Turns away</span><b>${Math.round(L.guard * 100)}% of raids</b></div><div><span>Crows scared</span><b>${st.stats.crowsScared || 0}</b></div></div>`;
    h += N ? this.row('⬆️', `Upgrade to ${N.name}`, `${N.radius} m circle, turns away ${Math.round(N.guard * 100)}% · adds ${N.adds}`, st.level < N.level ? `<span class="tag">🔒 L${N.level}</span>` : this.btn(money(N.cost), 'scarecrowUp', {}, st.money < N.cost))
      : '<p class="hint">🏆 The best scarecrow in Patiala: no crow gets past it.</p>';
    h += '<h3>Look</h3><div class="chips">' + Object.entries(SCARECROW_DESIGNS).map(([id, d]) => `<button class="chip ${id === m.data.d ? 'on' : ''}" data-act="scarecrowStyle" data-d="${id}">${d.icon} ${d.name}</button>`).join('') + '</div>';
    h += `<div class="row2"><button class="btn ghost" data-act="scarecrowMove">↔️ Move</button><button class="btn ghost danger" data-act="scarecrowRemove">🗑️ Take down</button></div>`;
    h += `<p class="hint small">${D.icon} ${D.name}: ${D.desc}.</p>`;
    return h;
  }

  // ---------------------------------------------------------------- reviews
  reviewsHTML() {
    const st = this.game.state, r = rating(st);
    if (!st.reviews.length) return '<p class="empty">No reviews yet. Customers leave one after they buy at your Mandi stall — keep the shelf full and the queue short!</p>';
    let h = `<div class="card2 gold rating"><b class="big">${r.toFixed(1)} <span class="stars">${stars(Math.round(r))}</span></b><small>from the last ${st.reviews.length} customers${r >= 4 ? ' · 🎉 More customers are coming!' : r < 2.2 ? ' · 😬 Fewer customers come — keep the stall stocked' : ''}</small></div>`;
    h += '<p class="hint">Customers only complain with a reason: a long queue, an empty shelf or a price surge. Keep the stall stocked and most reviews are happy ones.</p>';
    for (const x of st.reviews) {
      const why = REASONS[x.w];
      h += `<div class="review"><div><b>${esc(x.n)}</b> <span class="stars">${stars(x.s)}</span>${x.i && ITEMS[x.i] ? ` <span class="tag">${ITEMS[x.i].icon}</span>` : ''}${why ? ` <span class="tag why">${why.icon} ${why.text}</span>` : ''}<small>${ago(x.d)}</small></div><p>${esc(x.t)}</p></div>`;
    }
    return h;
  }

  // ---------------------------------------------------------------- Gopal's Sweets
  sweetsHTML() {
    const g = this.game, st = g.state, sw = g.sweets;
    sw.ensureList();
    let h = '<p class="hint">🧑‍🍳 Gopal ji: "Sab ton taazi mithai Patiale di! Kujh mitha ho jaye?"</p>';
    for (const [id, s] of Object.entries(SWEETS)) {
      const c = sw.cost(id), on = s.boost && st.boosts[s.boost] > 0;
      h += this.row(s.icon, `${s.name}${on ? ' <span class="tag ok">active</span>' : ''}`, s.desc, this.btn(`${s.item ? 'Buy' : 'Khao'} ${money(c)}`, 'eat', { id }, st.money < c, 'go'));
    }
    const gp = st.gopal, wants = Object.entries(gp.wants);
    h += '<h3>📜 Gopal ji di list (today)</h3>';
    if (!wants.length) h += '<p class="empty">Gopal ji needs nothing you can make yet.</p>';
    else {
      const ok = wants.every(([k, n]) => have(st, k) >= n);
      h += `<div class="card2 ${gp.done ? 'done' : ''}"><div class="need">${wants.map(([k, n]) => { const hv = have(st, k); return `<span class="${hv >= n ? 'ok' : ''}">${ITEMS[k].icon} ${Math.min(hv, n)}/${n} ${ITEMS[k].name}</span>`; }).join('')}</div>
        <small>Pays ${money(sw.listPay())} — ${Math.round((GOPAL_RATE - 1) * 100)}% more than the mandi. A new list every game day.</small>
        <div class="ctrl">${gp.done ? '<span class="tag ok">✅ Delivered — new list tomorrow</span>' : this.btn('Deliver', 'gopalList', {}, !ok, 'go')}</div></div>`;
    }
    return h;
  }

  // ---------------------------------------------------------------- vendor deal
  vendorHTML() {
    const g = this.game, st = g.state, v = g.vendors.v, d = v.deal, cfg = VENDORS[v.id];
    let h = `<p class="hint">${cfg.icon} "${esc(cfg.lines[0])}" · leaves in ${Math.max(0, Math.ceil(v.stay))}s</p>`;
    if (v.sold) return h + '<div class="card2 done"><b>✅ Sauda ho gaya!</b><small>Another vendor will come by soon.</small></div>';
    if (d.kind === 'buyer') {
      const n = Math.min(have(st, d.item), d.max), mandi = g.market.price(d.item);
      h += `<div class="card2 gold"><b>💵 Buys ${ITEMS[d.item].icon} ${ITEMS[d.item].name} at ${money(d.rate)} each</b><small>Mandi pays ${money(mandi)} · up to ${d.max} · you have ${have(st, d.item)} (bag + godown)</small>
        <div class="ctrl">${this.btn(n ? `Sell ${n} for ${money(n * d.rate)}` : `No ${ITEMS[d.item].name} to sell`, 'deal', {}, !n, 'go')}</div></div>`;
    } else {
      const save = d.was ? Math.round((1 - d.price / d.was) * 100) : 0;
      h += `<div class="card2 gold"><b>${esc(d.text)}</b>${d.was ? `<small><s>${money(d.was)}</s> → <b>${money(d.price)}</b> · save ${save}%</small>` : `<small>${money(d.price)}</small>`}
        <div class="ctrl">${this.btn(`Buy ${money(d.price)}`, 'deal', {}, st.money < d.price, 'go')}</div></div>`;
    }
    return h;
  }

  // ---------------------------------------------------------------- friends and trading
  // ---------------------------------------------------------------- online friends
  socialChanged() {
    if (this.view === 'chat') { const el = $('chatList'); if (el) { el.innerHTML = this.chatListHTML(); el.scrollTop = el.scrollHeight; } this.game.social.read(this.chatWith); }
    else if (this.view === 'board') { const el = $('boardList'); if (el) el.innerHTML = this.boardListHTML(); }
    else if (this.view === 'friends' && this.tab === 'online') this.render();
    const n = Object.values(this.game.social?.unread || {}).reduce((a, b) => a + b, 0) + Object.keys(this.game.social?.gifts || {}).length + Object.keys(this.game.social?.requests || {}).length;
    $('btnFriends').classList.toggle('badge', n > 0);
  }
  onlineHTML() {
    const g = this.game, st = g.state, so = g.social;
    if (!so.ready) return so.error ? `<p class="empty">⚠️ Can't reach the online service (${esc(so.error)}). Your farm still works offline.</p>` : '<p class="empty">🌐 Connecting…</p>';
    const now = Date.now();
    let h = `<div class="card2 gold"><b>🌐 Your friend code: <span class="code">${esc(st.social.code || '…')}</span></b><small>Friends type this code to add you. Gifts and chat work once you have both added each other.</small>
      <div class="ctrl">${this.btn('📋 Copy', 'copyCode', {}, false, 'ghost')}${this.btn('📤 Share', 'shareCode', {}, false, 'go')}</div></div>`;
    h += `<div class="addrow"><input id="codeIn" maxlength="8" placeholder="Friend's code" autocomplete="off" autocapitalize="characters"><button class="btn" data-act="sAdd">➕ Add</button></div>`;
    for (const [id, r] of Object.entries(so.requests)) h += `<div class="card2 inbox"><b>👥 ${esc(clean(r.name, 14))} wants to be friends</b><small>Level ${r.level || '?'}</small><div class="ctrl">${this.btn('Accept', 'sAccept', { id }, false, 'go')}${this.btn('Not now', 'sDecline', { id }, false, 'ghost')}</div></div>`;
    for (const [id, gf] of Object.entries(so.gifts)) h += `<div class="card2 inbox"><b>🎁 Gift from ${esc(clean(gf.name, 14))}</b><small>${describe(gf.items || {})}</small><div class="ctrl">${this.btn('Collect', 'sCollect', { id }, false, 'go')}</div></div>`;
    const ids = Object.keys(so.friends).sort((a, b) => (isOnline(so.friends[b], now) - isOnline(so.friends[a], now)) || ((so.friends[b].at || 0) - (so.friends[a].at || 0)));
    h += `<h3>Friends (${ids.length})</h3>`;
    if (!ids.length) h += '<p class="empty">Share your code, or add a friend\'s code above.</p>';
    for (const id of ids) {
      const f = so.friends[id], on = isOnline(f, now), un = so.unread[id] || 0;
      const where = f.ride && now - f.ride.at < 5000 ? ' · 🏍️ riding the ring road' : '';
      h += `<div class="friend"><div class="fav" style="--c:${esc(f.turban || '#e8590c')}">👳<i class="dot ${on ? 'on' : ''}"></i></div><div class="fi"><b>${esc(clean(f.name, 14))}</b><small>${on ? '🟢 Online' : f.at ? `Last seen ${ago(f.at)}` : 'Not seen yet'}${f.level ? ` · Level ${f.level}` : ''}${where}${f.mutual ? '' : '<br>⏳ Waiting for them to add you back'}</small>
        <div class="ctrl">${this.btn('🎁 Gift', 'sGift', { id }, !f.mutual, 'go')}${this.btn(`💬 Chat${un ? ` (${un})` : ''}`, 'sChat', { id }, !f.mutual)}${this.btn('👀 Visit', 'sVisit', { id }, !f.farm)}${this.btn('✕', 'sUnfriend', { id }, false, 'ghost')}</div></div></div>`;
    }
    const hist = st.social.history.slice(0, 12);
    if (hist.length) {
      h += '<h3>🎁 Gift history</h3>';
      for (const e of hist) h += this.row(e.k === 'sent' ? '📤' : '📥', `${e.k === 'sent' ? 'To' : 'From'} ${esc(e.who)}`, `${describe(e.items)} · ${ago(e.at)}`);
    }
    const left = st.social.giftDay === todayKey() ? Math.max(0, SOCIAL.giftsPerDay - st.social.giftsToday) : SOCIAL.giftsPerDay;
    h += `<p class="hint small">Up to ${SOCIAL.giftItems(st.level)} items a gift and ${SOCIAL.giftsPerDay} gifts a day (${left} left today). Chat is filtered; tap a friend's 💬 to block or report.</p>`;
    return h;
  }
  giftHTML() {
    const g = this.game, st = g.state, f = g.social.friends[this.giftTo];
    if (!f) return '<p class="empty">Not a friend any more.</p>';
    const pick = this.giftPick || {};
    const stock = {};
    for (const k of st.carry) stock[k] = (stock[k] || 0) + 1;
    for (const [k, n] of Object.entries(st.storage)) stock[k] = (stock[k] || 0) + n;
    const ids = Object.keys(stock).filter((k) => ITEMS[k]).sort((a, b) => ITEMS[b].price * stock[b] - ITEMS[a].price * stock[a]).slice(0, 12);
    let h = `<p class="hint">Tap what to give, then send. ${esc(clean(f.name, 14))} gets it right away.</p><div class="chips gift">`;
    h += ids.map((k) => `<button class="chip ${pick[k] ? 'on' : ''}" data-act="gPick" data-id="${k}">${ITEMS[k].icon} ${ITEMS[k].name}<small>${pick[k] ? `${pick[k]} of ${stock[k]}` : `you have ${stock[k]}`}</small></button>`).join('');
    h += '</div>';
    if (!ids.length) h += '<p class="empty">Your bag and godown are empty.</p>';
    const err = g.social.giftError(this.giftTo, pick);
    h += `<div class="card2 sticky"><small>${itemCount(pick)} items · tap an item again for more</small>${itemCount(pick) && err ? `<small class="warn">${esc(err)}</small>` : ''}<button class="btn wide" data-act="gSend" ${err ? 'disabled' : ''}>🎁 Send to ${esc(clean(f.name, 14))}</button></div>`;
    return h;
  }
  chatListHTML() {
    const g = this.game, me = g.social.uid, list = g.social.msgs[this.chatWith] || [];
    if (!list.length) return '<p class="empty">Say Sat Sri Akal! 👋</p>';
    return list.map((m) => `<div class="msg ${m.from === me ? 'me' : ''}"><p>${esc(m.text)}</p><small>${ago(m.at)}</small></div>`).join('');
  }
  chatHTML() {
    const f = this.game.social.friends[this.chatWith];
    const here = !!this.game.social.others[this.chatWith];
    const status = f ? `<p class="hint small">${isOnline(f) || here ? '🟢 Online now' : '⚪ Offline · they will see it later'}${here ? ' · here in the farm with you' : ''}</p>` : '';
    const quick = ['👋 Sat Sri Akal ji!', '🌾 Vadhiya khet ae!', '🏍️ Chalo gerhi maarde aan?', '☕ Chaa peeyiye?', '😄 Maza aa gaya!'];
    return `${status}<div id="chatList" class="chatlist">${this.chatListHTML()}</div>
      <div class="chips quick">${quick.map((q) => `<button class="chip" data-act="chatQuick" data-t="${q}">${q}</button>`).join('')}</div>
      <div class="addrow"><input id="chatIn" maxlength="${SOCIAL.chatLen}" placeholder="Message" autocomplete="off"><button class="btn" data-act="chatSend">Send</button></div>
      <div class="row2"><button class="btn ghost small" data-act="sBlock">🚫 Block</button><button class="btn ghost small" data-act="sReport">⚠️ Report</button></div>`;
  }
  boardListHTML() {
    const g = this.game, so = g.social, mine = !g.visit;
    if (!so.board.length) return `<p class="empty">${mine ? 'No messages yet. Friends who visit your farm can leave one here.' : 'Be the first to sign the guestbook!'}</p>`;
    return so.board.map((p) => `<div class="post"><div class="fav" style="--c:${esc(p.turban || '#e8590c')}">${esc((p.name || '?')[0].toUpperCase())}</div><div class="fi"><b>${esc(p.name)}</b> <small>${ago(p.at)} · ${new Date(p.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><p>${esc(p.text)}</p></div>${mine || p.from === so.uid ? `<button class="mini ghost" data-act="boardDel" data-id="${p.id}">🗑️</button>` : ''}</div>`).join('');
  }
  boardHTML() {
    const g = this.game, mine = !g.visit;
    return `<p class="hint">${mine ? 'Messages your visitors leave on your farm. Tap 🗑️ to remove any you don\'t want.' : `Leave a message for ${esc(g.visit.fn)} — they see it on their farm.`}</p>
      <div id="boardList">${this.boardListHTML()}</div>
      <div class="addrow"><input id="boardIn" maxlength="${SOCIAL.boardLen}" placeholder="${mine ? 'Write a note on your own board' : 'Write a message'}" autocomplete="off"><button class="btn" data-act="boardPost">📝 Post</button></div>`;
  }

  friendsHTML() {
    const g = this.game, st = g.state, fr = g.friends;
    if (this.tab === 'online') return this.onlineHTML();
    if (this.tab === 'paste') {
      return `<p class="hint">Got a Patiala Kisan link from a friend? If tapping it opened Safari instead of your Home Screen game, copy the whole message and paste it here.</p>
        <textarea id="pasteBox" class="paste" placeholder="Paste the link or message here"></textarea>
        <button class="btn wide" data-act="pasteOpen">Open link</button>`;
    }
    let h = `<div class="card2 gold"><b>🏡 Your farm link</b><small>Send it on WhatsApp: friends can walk around your farm and they join your friends list. Share it again whenever your farm grows.</small>
      <div class="ctrl">${this.btn('📤 Share my farm', 'shareFarm', {}, false, 'go')}${this.btn('📋 Paste a link', 'tab', { tab: 'paste' }, false, 'ghost')}</div></div>`;
    // waiting for you: gifts and trade offers
    for (const e of st.inbox) {
      if (e.k === 'gift') h += `<div class="card2 inbox"><b>🎁 Gift from ${esc(e.fn)}</b><small>${describe(e.items)}</small><div class="ctrl">${this.btn('Receive', 'getGift', { id: e.id }, false, 'go')}${this.btn('Not now', 'decline', { id: e.id }, false, 'ghost')}</div></div>`;
      else {
        const ok = Object.entries(e.want).every(([k, n]) => have(st, k) >= n);
        h += `<div class="card2 inbox"><b>🔁 ${esc(e.fn)} wants to trade</b><small>You get: ${describe(e.give)}<br>You give: ${describe(e.want)}${ok ? '' : ' <b>(you don\'t have it all yet)</b>'}</small><div class="ctrl">${this.btn('Accept', 'acceptOffer', { id: e.id }, !ok, 'go')}${this.btn('Decline', 'decline', { id: e.id }, false, 'ghost')}</div></div>`;
      }
    }
    for (const [id, o] of Object.entries(st.trade.out)) {
      if (o.status !== 'open') continue;
      h += `<div class="card2"><b>⏳ Trade sent to ${esc(o.tn)}</b><small>You give ${describe(o.give)} · you get ${describe(o.want)}. When ${esc(o.tn)} accepts, they send you a link back — open it to collect.</small><div class="ctrl">${this.btn('📤 Send again', 'reshare', { id }, false, 'ghost')}${this.btn('Cancel', 'cancelOffer', { id }, false, 'ghost')}</div></div>`;
    }
    for (const [id, r] of Object.entries(st.trade.replies)) {
      if (Date.now() - r.ts > 3 * 864e5) continue;
      h += `<div class="card2"><b>🤝 Traded with ${esc(r.tn)}</b><small>Send ${esc(r.tn)} the link for their ${describe(r.items)} if you haven't yet.</small><div class="ctrl">${this.btn('📤 Send their link', 'reshareReply', { id }, false, 'ghost')}</div></div>`;
    }
    const ids = Object.keys(st.friends).sort((a, b) => st.friends[b].seen - st.friends[a].seen);
    h += `<h3>👥 Your friends (${ids.length})</h3>`;
    if (!ids.length) h += '<p class="empty">No friends yet. Ask a friend to send you their farm link — open it and they appear here. Send them yours too!</p>';
    for (const id of ids) {
      const f = st.friends[id];
      h += `<div class="friend"><div class="fav" style="--c:${esc(f.turban)}">👳</div><div class="fi"><b>${esc(f.name)}</b><small>Level ${f.level || '?'}${f.fields ? ` · ${f.fields} fields` : ''}${f.rating ? ` · ⭐ ${f.rating}` : ''} · shared ${ago(f.seen)}${f.sent || f.got ? `<br>You sent ${f.sent} · got ${f.got} items` : ''}</small>
        <div class="ctrl">${this.btn('👀 Visit', 'visitFriend', { id }, !f.code, 'go')}${this.btn('🎁 Gift', 'compose', { id, mode: 'gift' })}${this.btn('🔁 Trade', 'compose', { id, mode: 'offer' })}${g.social?.ready ? this.btn('🌐 Add online', 'sConnect', { id }) : ''}${this.btn('✕', 'unfriend', { id }, false, 'ghost')}</div></div></div>`;
    }
    const left = st.trade.day === todayKey() ? Math.max(0, TRADE.linksPerDay - st.trade.sent) : TRADE.linksPerDay;
    h += `<p class="hint small">Trades are fair: up to ${TRADE.items(st.level)} items worth ${money(TRADE.value(st.level))} per link, ${TRADE.linksPerDay} links a day (${left} left today). Gifts and trades only open on the farm they were sent to, once. Money can't be traded.</p>`;
    return h;
  }

  tradeHTML() {
    const g = this.game, st = g.state, tr = this.tr, f = st.friends[tr.to];
    if (!f) { this.tr.to = null; return '<p class="empty">Pick a friend in 👥 Friends first.</p>'; }
    const giveIds = Object.keys(ITEMS).filter((k) => have(st, k) > 0);
    const stepper = (side, k, n, max) => `<div class="step">${this.btn('−', 'trQty', { side, id: k, d: -1 }, n <= 0, 'ghost')}<b>${n}</b>${this.btn('+', 'trQty', { side, id: k, d: 1 }, n >= max, 'ghost')}${this.btn('+5', 'trQty', { side, id: k, d: 5 }, n >= max, 'ghost')}</div>`;
    let h = `<div class="seg wide">${this.btn('🎁 Gift', 'trMode', { mode: 'gift' }, false, tr.mode === 'gift' ? 'on' : 'ghost')}${this.btn('🔁 Trade', 'trMode', { mode: 'offer' }, false, tr.mode === 'offer' ? 'on' : 'ghost')}</div>`;
    h += `<p class="hint">To <b>${esc(f.name)}</b>. ${tr.mode === 'gift' ? 'They get these goods when they open your link.' : 'Your side is set aside now. When they accept, they get your goods and send yours back with a link.'}</p>`;
    h += `<h3>${tr.mode === 'gift' ? 'Send' : 'You give'}</h3>`;
    if (!giveIds.length) h += '<p class="empty">Your bag and godown are empty.</p>';
    for (const k of giveIds) h += this.row(ITEMS[k].icon, ITEMS[k].name, `You have ${have(st, k)} · ${money(ITEMS[k].price)} each`, stepper('give', k, tr.give[k] || 0, have(st, k)));
    if (tr.mode === 'offer') {
      h += '<h3>You want back</h3>';
      for (const k of Object.keys(ITEMS)) h += this.row(ITEMS[k].icon, ITEMS[k].name, `${money(ITEMS[k].price)} each`, stepper('want', k, tr.want[k] || 0, 99), tr.want[k] ? '' : 'dim');
    }
    const err = tradeLimitError(st, tr.give) || (tr.mode === 'offer' && !itemCount(tr.want) ? 'Choose what you want back' : '');
    h += `<div class="card2 sticky"><small>${itemCount(tr.give)} items · ${money(itemsValue(tr.give))}${tr.mode === 'offer' ? ` for ${itemCount(tr.want)} items · ${money(itemsValue(tr.want))}` : ''} · limit ${TRADE.items(st.level)} items / ${money(TRADE.value(st.level))}</small>
      ${err ? `<small class="warn">${esc(err)}</small>` : ''}<button class="btn wide" data-act="makeLink" ${err ? 'disabled' : ''}>📤 Make ${tr.mode === 'gift' ? 'gift' : 'trade'} link</button></div>`;
    return h;
  }

  // A link is ready: share it from a fresh tap (iOS only opens the share sheet from a tap)
  shareSheet(link) {
    const m = $('modal');
    const what = { farm: 'Your farm link', gift: `Gift for ${esc(link.to)}`, offer: `Trade for ${esc(link.to)}`, reply: `${esc(link.to)}'s goods` }[link.kind];
    m.innerHTML = `<div class="card"><div class="big">📤</div><h2>${what} is ready</h2><p>Send it on WhatsApp or any chat.${link.kind === 'gift' || link.kind === 'offer' ? ' Only their farm can open it, once.' : ''}</p>
      <input class="linkbox" readonly value="${esc(link.url)}"><div class="row2"><button class="btn ghost" id="mCopy">📋 Copy</button><button class="btn" id="mShare">📤 Share</button></div><button class="btn ghost small" id="mDone">Done</button></div>`;
    m.hidden = false;
    const full = `${link.text} ${link.url}`;
    $('mShare').onclick = () => {
      if (navigator.share) navigator.share({ title: 'Patiala Kisan', text: link.text, url: link.url }).catch(() => {});
      else navigator.clipboard?.writeText(full).then(() => this.toast('🔗 Link copied — paste it in WhatsApp'), () => {});
    };
    $('mCopy').onclick = () => {
      const box = m.querySelector('.linkbox'); box.select();
      (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject()).then(() => this.toast('🔗 Link copied — paste it in WhatsApp'), () => { document.execCommand?.('copy'); this.toast('🔗 Copied'); });
    };
    $('mDone').onclick = () => { m.hidden = true; };
  }

  // ---------------------------------------------------------------- actions
  async handle(act, d) {
    const g = this.game, st = g.state;
    const fail = (msg) => { this.toast(msg); g.audio.play('error'); };
    const pr = await handlePanels(this, act, d);
    if (pr === 'done') return;
    if (pr === 'render') { this.render(); return; }
    switch (act) {
      case 'tab': this.open(this.view, d.tab); return;
      case 'goShop': this.open('shop', 'seeds'); return;
      case 'seeriCrops': this.openPicker(d.id); return;
      case 'pickSeed': st.seed = d.id; this.seedPill(); this.close(); return;
      case 'buySeed': {
        const c = CROPS[d.id], n = +d.n, cost = c.seed * n;
        if (st.money < cost) return fail('Not enough money');
        st.money -= cost;
        st.seeds[d.id] = (st.seeds[d.id] || 0) + n;
        if (!(st.seeds[st.seed] > 0)) st.seed = d.id;
        g.audio.play('coin');
        g.emit('buySeed', { key: d.id });
        this.toast(`+${n} ${c.icon} ${c.name} seeds`);
        break;
      }
      case 'upgrade': {
        const list = { bag: BAGS, can: CANS, storage: STORAGE, stall: STALL }[d.key];
        const next = list[st.up[d.key] + 1];
        if (!next || st.money < next.cost || st.level < next.level) return fail('Not yet');
        st.money -= next.cost;
        st.up[d.key]++;
        if (d.key === 'can') st.water = next.cap;
        g.carryDirty = true;
        g.audio.play('buy');
        g.emit('upgrade', { key: d.key });
        this.toast(`⬆️ ${next.name}!`);
        break;
      }
      case 'buyField': {
        const f = FIELDS.find((x) => x.id === d.id), fd = st.fields[d.id], cost = f.cost - fd.paid;
        if (st.money < cost || st.level < f.level) return fail('Not enough money');
        st.money -= cost; fd.paid = 0;
        g.unlockField(d.id);
        break;
      }
      case 'buildPen': {
        const p = PENS[d.id], pd = st.pens[d.id], cost = p.cost - pd.paid;
        if (st.money < cost || st.level < p.level) return fail('Not enough money');
        st.money -= cost; pd.paid = 0;
        g.animals.pens[d.id].buildPen();
        g.audio.play('buy');
        break;
      }
      case 'buildShop': {
        const b = BUILDINGS[d.id], bd = st.buildings[d.id], cost = b.cost - bd.paid;
        if (st.money < cost || st.level < b.level) return fail('Not enough money');
        st.money -= cost; bd.paid = 0;
        g.production.shops[d.id].open();
        g.audio.play('buy');
        break;
      }
      case 'buyVehicle':
        if (!g.vehicles.buy(d.id)) return fail('Not enough money');
        g.audio.play('buy');
        this.toast(`🎉 ${VEHICLES[d.id].name} is parked at the garage!`, 3);
        this.close();
        return;
      case 'buyAtt': {
        const a = ATTACHMENTS[d.id];
        if (st.money < a.cost) return fail('Not enough money');
        st.money -= a.cost;
        st.vehicles.tractor.atts[d.id] = true;
        g.audio.play('buy');
        this.toast(`${a.name} bought — switch attachments while driving`);
        break;
      }
      case 'tractorHP': {
        const next = TRACTOR_HP[st.vehicles.tractor.hp + 1];
        if (!next || st.money < next.cost) return fail('Not enough money');
        st.money -= next.cost;
        st.vehicles.tractor.hp++;
        g.audio.play('buy');
        break;
      }
      case 'hire': {
        const m = st.managers[d.role], cfg = STAFF[d.role];
        if (st.level < cfg.level) return fail(`Unlocks at level ${cfg.level}`);
        if (m) {
          // the desk pad may already hold part of the fee
          const due = cfg.hire - (m.paid || 0);
          if (m.on || st.money < due) return fail('Not enough money');
          st.money -= due;
          g.staff.hire(d.role, null, true);
        } else if (!g.staff.hire('seeri', d.id)) return fail('Cannot hire yet');
        g.audio.play('buy');
        break;
      }
      case 'train': {
        if (!g.staff.train(d.role)) return fail('Not enough money');
        const r = MANAGER_RANKS[g.staff.rankOf(d.role)];
        g.audio.play('level');
        this.toast(`⬆️ ${STAFF[d.role].name} is now ${r.name} — ${r.speed}× faster!`, 3);
        break;
      }
      case 'openStaff': this.openStaff(); return;
      case 'fire':
        if (!(await this.confirm(`<h2>Dismiss ${STAFF[d.role].name}?</h2><p>The hiring fee is not refunded.</p>`, 'Dismiss'))) return;
        g.staff.fire(d.role, d.id);
        break;
      case 'guide': g.guide.set(d.t, true); this.close(); this.toast('Follow the yellow arrow ➜'); return;
      case 'openPen': this.openPen(d.id); return;
      case 'openShop': this.openWorkshop(d.id); return;
      case 'takeOut': {
        const n = Math.min(+d.n, st.storage[d.id] || 0, carryCap(st) - st.carry.length);
        for (let i = 0; i < n; i++) st.carry.push(d.id);
        st.storage[d.id] -= n;
        if (!st.storage[d.id]) delete st.storage[d.id];
        g.carryDirty = true;
        break;
      }
      case 'quality': st.settings.quality = d.q; g.applyQuality(); break;
      case 'turban': g.player.setTurban(d.c); break;
      case 'share': g.share(); return;
      case 'goVehicles': this.open('shop', 'vehicles'); return;
      // ---- online friends
      case 'copyCode': navigator.clipboard?.writeText(st.social.code).then(() => this.toast('📋 Code copied'), () => this.toast(st.social.code, 4)); return;
      case 'shareCode': { const text = `Add me in Patiala Kisan! 🌾 My friend code: ${st.social.code}`; if (navigator.share) navigator.share({ title: 'Patiala Kisan', text, url: location.href.split('#')[0] }).catch(() => {}); else navigator.clipboard?.writeText(text).then(() => this.toast('📋 Copied — paste it in WhatsApp')); return; }
      case 'sAdd': { const err = await g.social.addByCode($('codeIn')?.value); if (err) return fail(err); this.toast('👥 Friend request sent!'); g.audio.play('trade'); break; }
      case 'sConnect': { const err = await g.social.addByPid(d.id); if (err) return fail(err); this.toast('👥 Friend request sent!'); break; }
      case 'sAccept': await g.social.accept(d.id); this.toast('👥 You are friends now!'); g.audio.play('trade'); break;
      case 'sDecline': await g.social.decline(d.id); break;
      case 'sUnfriend': if (!await this.confirm('<div class="big">👥</div><h2>Remove this friend?</h2>', 'Remove')) return; await g.social.unfriend(d.id); break;
      case 'sCollect': { const err = await g.social.collect(d.id); if (err) return fail(err); this.toast('🎁 Collected — it went to your godown'); break; }
      case 'sGift': this.giftTo = d.id; this.giftPick = {}; this.open('gift'); return;
      case 'gPick': {
        const have0 = (st.storage[d.id] || 0) + st.carry.filter((x) => x === d.id).length, cur = this.giftPick[d.id] || 0;
        const step = cur ? Math.max(1, Math.round(cur / 2)) : Math.min(5, have0);
        const next = cur >= have0 ? 0 : Math.min(have0, cur + step);
        if (next) this.giftPick[d.id] = next; else delete this.giftPick[d.id];
        break;
      }
      case 'gSend': { const err = await g.social.sendGift(this.giftTo, this.giftPick); if (err) return fail(err); this.toast('🎁 Gift sent!'); g.audio.play('trade'); this.open('friends', 'online'); return; }
      case 'sChat': this.chatWith = d.id; g.social.read(d.id); this.open('chat'); { const el = $('chatList'); if (el) el.scrollTop = el.scrollHeight; } return;
      case 'chatSend': { const box = $('chatIn'); let err; try { err = await g.social.say(this.chatWith, box.value); } catch { err = 'Could not send. Check your internet'; } if (err) return fail(err); box.value = ''; box.focus(); return; }
      case 'chatQuick': { let err; try { err = await g.social.say(this.chatWith, d.t); } catch { err = 'Could not send. Check your internet'; } if (err) return fail(err); return; }
      case 'sBlock': if (!await this.confirm('<div class="big">🚫</div><h2>Block this player?</h2><p>They are removed from your friends and can\'t message or gift you.</p>', 'Block')) return; await g.social.block(this.chatWith); this.close(); this.toast('🚫 Blocked'); return;
      case 'sReport': { const why = prompt('What happened? (optional)') ?? ''; await g.social.report(this.chatWith, 'chat', why); this.toast('⚠️ Report sent — thank you'); return; }
      case 'sVisit': { const f = g.social.friends[d.id]; if (!f?.farm) return fail('Their farm is not shared yet'); g.save(true); try { sessionStorage.setItem('pk-visit', f.farm); } catch { /* ignore */ } location.reload(); return; }
      case 'boardPost': { const box = $('boardIn'); const me = g.visit ? (g.me || { name: 'Visitor', turban: '#e8590c' }) : { name: st.name, turban: st.turban }; const err = await g.social.post(this.boardOwner, box.value, me); if (err) return fail(err); box.value = ''; this.toast('📝 Posted!'); return; }
      case 'boardDel': await g.social.unpost(this.boardOwner, d.id); return;
      case 'auraBuy': { const err = g.gerhi.buy(d.id); if (err) return fail(err); g.audio.play('aura'); this.toast(`${AURA.rewards[d.id].icon} ${AURA.rewards[d.id].name} is yours!`); break; }
      case 'auraPaint': g.gerhi.paint(d.id); g.audio.play('click'); break;
      case 'bikeUp': {
        const bk = st.vehicles.bike, next = BIKE_ENGINES[bk.hp + 1];
        if (!next || st.level < next.level || st.money < next.cost) return fail('Not yet');
        st.money -= next.cost; bk.hp++;
        g.audio.play('buy');
        this.toast(`🏍️ ${next.name} fitted! Top speed ${Math.round(next.top * 3.6)} km/h`);
        break;
      }
      case 'radio': st.settings.radio = d.id; if (st.settings.ownMusic) { st.settings.ownMusic = false; g.audio.setOwnMusic(false); } break;
      case 'radioPrev': case 'radioNext': st.settings.radio = 'fm'; g.audio.nextTrack(act === 'radioNext' ? 1 : -1); break;
      case 'ownMusic': st.settings.ownMusic = !st.settings.ownMusic; g.audio.setOwnMusic(st.settings.ownMusic); this.toast(st.settings.ownMusic ? '🎧 Game music off — play your songs in your music app' : '🎵 Game music back on'); break;
      case 'scarecrowBuy': { const err = g.scarecrows.start(d.d); if (err) return fail(err); return; }
      case 'scarecrowUp': { const err = g.scarecrows.upgrade(this.scarecrow); if (err) return fail(err); this.toast('⬆️ Scarecrow upgraded!'); break; }
      case 'scarecrowStyle': g.scarecrows.restyle(this.scarecrow, d.d); break;
      case 'scarecrowMove': { const err = g.scarecrows.start(this.scarecrow.data.d, this.scarecrow); if (err) return fail(err); return; }
      case 'scarecrowRemove': {
        if (!await this.confirm('<div class="big">🧍</div><h2>Take down this scarecrow?</h2><p>You get 40% of what it cost back.</p>', 'Take down')) return;
        this.toast(`🧍 Taken down · +${money(g.scarecrows.remove(this.scarecrow))}`);
        this.close();
        return;
      }
      case 'backup': {
        g.save(true);
        const code = await backupCode(st);
        const m = $('modal');
        m.innerHTML = `<div class="card"><div class="big">💾</div><h2>Your farm backup</h2><p>Level ${st.level} · ${money(st.money)} · ${fmt(st.soul)} 🙏 — copy it all and keep it safe (Notes, or WhatsApp it to yourself).</p>
          <textarea class="paste" readonly rows="4">${code}</textarea><div class="row2"><button class="btn ghost" id="mCopy">📋 Copy</button><button class="btn" id="mShare">📤 Save to…</button></div><button class="btn ghost small" id="mDone">Done</button></div>`;
        m.hidden = false;
        const text = `My Patiala Kisan farm backup (${st.name}, level ${st.level}). Restore it in ⚙️ Settings → Restore a backup:\n${code}`;
        $('mCopy').onclick = () => { const box = m.querySelector('textarea'); box.select(); (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => this.toast('💾 Backup copied'), () => { document.execCommand?.('copy'); this.toast('💾 Copied'); }); };
        $('mShare').onclick = () => { if (navigator.share) navigator.share({ title: 'Patiala Kisan backup', text }).catch(() => {}); else navigator.clipboard?.writeText(text).then(() => this.toast('💾 Backup copied'), () => {}); };
        $('mDone').onclick = () => { m.hidden = true; };
        return;
      }
      case 'restore': {
        const m = $('modal');
        m.innerHTML = `<div class="card"><div class="big">📥</div><h2>Restore a farm backup</h2><p>Paste a backup code. The farm on this device is kept as a safety copy.</p>
          <textarea class="paste" rows="4" placeholder="PKB…"></textarea><small class="warn" id="mErr"></small><div class="row2"><button class="btn ghost" id="mDone">Cancel</button><button class="btn" id="mGo">Check code</button></div></div>`;
        m.hidden = false;
        $('mDone').onclick = () => { m.hidden = true; };
        $('mGo').onclick = async () => {
          let s;
          try { s = await readBackup(m.querySelector('textarea').value); } catch (e) { $('mErr').textContent = '⚠️ ' + e.message; g.audio.play('error'); return; }
          m.hidden = true;
          if (await this.confirm(`<div class="big">📥</div><h2>Restore ${esc(s.name)}'s farm?</h2><p>Level ${s.level} · ${money(s.money)} · ${fmt(s.soul)} 🙏<br>It replaces the farm on this device (Level ${st.level}), which is kept as a safety copy.</p>`, 'Restore')) g.restoreFarm(s);
        };
        return;
      }
      case 'reset':
        if (!(await this.confirm('<h2>Start a new farm?</h2><p>This deletes all progress on this device: money, fields, animals and soul points.</p>', 'Delete farm'))) return;
        if (!(await this.confirm('<h2>Are you sure?</h2><p>This cannot be undone.</p>', 'Yes, start over'))) return;
        g.resetGame();
        return;
      case 'fill': {
        const o = st.orders.find((x) => x.id === +d.id);
        if (!o || !g.market.fill(o)) return fail('Missing items');
        this.toast(`📋 Delivered to ${o.name}! +₹${o.reward}`);
        break;
      }
      case 'skip': { const o = st.orders.find((x) => x.id === +d.id); if (o) g.market.skip(o); break; }
      case 'buyAnimal': if (!g.animals.pens[this.penId].buyAnimal()) return fail('Cannot buy'); g.audio.play('buy'); break;
      case 'penCap': if (!g.animals.pens[this.penId].upgradeCap()) return fail('Not enough money'); g.audio.play('buy'); break;
      case 'penPipe': if (!g.animals.pens[this.penId].buyPipe()) return fail('Not enough money'); g.audio.play('buy'); break;
      case 'penFill': {
        const pen = g.animals.pens[this.penId], pd = pen.data;
        for (const f of pen.cfg.feeds) while (pd.feed < pen.feedCap() && (st.storage[f] || 0) > 0) { st.storage[f]--; if (!st.storage[f]) delete st.storage[f]; pd.feed++; }
        pen.updateFills();
        break;
      }
      case 'make': {
        const err = g.production.shops[this.shopId].queue(d.r, true);
        if (err) return fail(err);
        g.audio.play('click');
        break;
      }
      case 'autoRecipe': st.buildings[this.shopId].recipe = d.r; g.production.shops[this.shopId].tryAutoStart(); break;
      case 'shopUp': if (!g.production.shops[this.shopId].upgrade()) return fail('Not enough money'); g.audio.play('buy'); break;
      case 'collectOut': {
        const bd = st.buildings[this.shopId];
        for (const k of Object.keys(bd.out)) while (bd.out[k] > 0 && st.carry.length < carryCap(st)) { st.carry.push(k); bd.out[k]--; }
        for (const k of Object.keys(bd.out)) if (!bd.out[k]) delete bd.out[k];
        g.production.shops[this.shopId].refresh();
        g.carryDirty = true;
        break;
      }
      // Gopal's Sweets and vendors
      case 'eat': { const err = g.sweets.buy(d.id); if (err) return fail(err); break; }
      case 'gopalList': { const err = g.sweets.fillList(); if (err) return fail(err); this.toast(`🍥 Gopal ji paid ${money(g.sweets.listPay())}!`, 2.6); break; }
      case 'deal': { const err = g.vendors?.accept(); if (err) return fail(err); break; }
      // friends and trading
      case 'shareFarm': this.shareSheet(await g.friends.farmLink()); return;
      case 'pasteOpen': {
        const code = findCode($('pasteBox')?.value);
        if (!code) return fail('That does not look like a Patiala Kisan link');
        this.close();
        await g.friends.open(code);
        return;
      }
      case 'getGift': { const err = g.friends.receiveGift(d.id); if (err) return fail(err); this.toast('🎁 Received! It went to your godown', 2.6); break; }
      case 'acceptOffer': {
        const r = await g.friends.acceptOffer(d.id);
        if (typeof r === 'string') return fail(r);
        this.render();
        this.shareSheet(r);
        return;
      }
      case 'decline': g.friends.decline(d.id); break;
      case 'cancelOffer':
        if (!(await this.confirm('<h2>Cancel this trade?</h2><p>Your goods come back. If your friend already accepted, you won\'t get theirs.</p>', 'Cancel trade', 'Keep it'))) return;
        { const err = g.friends.cancelOffer(d.id); if (err) return fail(err); }
        break;
      case 'reshare': {
        const o = st.trade.out[d.id];
        if (o) this.shareSheet(g.friends.ready({ kind: 'offer', code: o.code, to: o.tn, text: `🔁 ${st.name} offers ${describe(o.give)} for your ${describe(o.want)} in Patiala Kisan. Tap to trade:` }));
        return;
      }
      case 'reshareReply': {
        const r = st.trade.replies[d.id];
        if (r) this.shareSheet(g.friends.ready({ kind: 'reply', code: r.code, to: r.tn, text: `🤝 Trade done! Here is your ${describe(r.items)} from ${st.name} in Patiala Kisan. Tap to collect:` }));
        return;
      }
      case 'visitFriend': { const err = g.friends.visit(d.id); if (err) return fail(err); return; }
      case 'unfriend': {
        const f = st.friends[d.id];
        if (!f || !(await this.confirm(`<h2>Remove ${esc(f.name)}?</h2><p>You can add them again from their farm link.</p>`, 'Remove'))) return;
        g.friends.removeFriend(d.id);
        break;
      }
      case 'compose': this.tr = { to: d.id, mode: d.mode, give: {}, want: {} }; this.open('trade'); return;
      case 'trMode': this.tr.mode = d.mode; this.titleEl.textContent = d.mode === 'gift' ? '🎁 Send a gift' : '🔁 Make a trade'; break;
      case 'trQty': {
        const side = this.tr[d.side], max = d.side === 'give' ? have(st, d.id) : 99;
        side[d.id] = Math.max(0, Math.min(max, (side[d.id] || 0) + +d.d));
        if (!side[d.id]) delete side[d.id];
        break;
      }
      case 'makeLink': {
        const tr = this.tr;
        const r = tr.mode === 'gift' ? await g.friends.gift(tr.to, tr.give) : await g.friends.offer(tr.to, tr.give, tr.want);
        if (typeof r === 'string') return fail(r);
        this.tr = { to: tr.to, mode: tr.mode, give: {}, want: {} };
        this.open('friends');
        this.shareSheet(r);
        return;
      }
    }
    this.money();
    g.save();
    this.render();
  }
}
