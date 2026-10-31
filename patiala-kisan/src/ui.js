// HUD, toasts, floating numbers and every menu (shop, farm management, missions, bag, map,
// settings, orders, pens, workshops). Menus are HTML bottom sheets with event delegation.
import * as THREE from 'three';
import {
  CROPS, ITEMS, BAGS, CANS, STORAGE, STALL, FIELDS, PENS, BUILDINGS, RECIPES, VEHICLES, ATTACHMENTS, TRACTOR_HP,
  STAFF, SOUL_PERKS, QUESTS, ACHIEVEMENTS, BUILDING_UPGRADES, PEN_PIPE_COST, PEN_WATER_CAP, TANKER_CAP, xpNeed, TURBAN_COLORS, PLOT,
} from './config.js';
import { carryCap, storageCap, storageUsed, have, carryCount, saveWorks } from './state.js';
import { POS } from './world.js';
import { fmt } from './pads.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const money = (n) => `₹${fmt(n)}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    $('hud').hidden = false;
    const bind = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); game.audio.unlock(); game.audio.play('click'); fn(); });
    bind('btnShop', () => this.open('shop'));
    bind('btnFarm', () => this.open('farm'));
    bind('btnMissions', () => this.open('missions'));
    bind('btnBag', () => this.openBag());
    bind('btnMap', () => this.open('map'));
    bind('btnMenu', () => this.open('settings'));
    bind('lvl', () => this.open('missions'));
    bind('quest', () => { const q = QUESTS[game.state.quest]; if (q?.target) { game.guide.set(q.target, true); this.toast('Follow the yellow arrow ➜'); } else this.open('missions'); });
    bind('seedPill', () => this.open('seeds'));
    bind('soulBox', () => this.open('farm', 'blessings'));
    $('action').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); game.audio.unlock(); this.pressAction(); });
    $('attBtn').addEventListener('click', (e) => { e.stopPropagation(); this.cycleAttachment(); });
    $('hornBtn').addEventListener('click', (e) => { e.stopPropagation(); game.audio.play('horn'); });
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

  update(dt) {
    const g = this.game;
    this.tick = (this.tick || 0) - dt;
    if (this.tick <= 0) {
      this.tick = 0.25;
      this.money(); this.level(); this.carryPill(); this.waterPill(); this.questBar();
      if (this.view && this.live) this.render();
      this.set('dayInfo', `Day ${g.state.day.n} · ${{ sunny: '☀️', cloudy: '⛅', rain: '🌧️' }[g.state.day.weather]}${g.weather.raining ? ' raining' : ''}`);
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
    bar.hidden = !v || v.kind === 'bike';
    $('seedPill').hidden = !!v && v.kind !== 'tractor';
    if (!v || v.kind === 'bike') return;
    if (v.kind === 'tractor') {
      const a = ATTACHMENTS[v.data.att];
      $('attBtn').hidden = false;
      $('attBtn').innerHTML = `${{ cultivator: '⛏️', seeder: '🌱', sprayer: '💧', reaper: '✂️' }[v.data.att]} ${a.name} <small>tap to switch</small>`;
      $('tankInfo').hidden = v.data.att !== 'sprayer';
      $('tankInfo').innerHTML = `💧 ${v.data.tank}/${TANKER_CAP}`;
    } else { $('attBtn').hidden = true; $('tankInfo').hidden = true; }
  }
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

  levelUp(level) {
    const unlocks = [];
    for (const c of Object.values(CROPS)) if (c.level === level) unlocks.push(`${c.icon} ${c.name} seeds`);
    for (const f of FIELDS) if (f.level === level) unlocks.push(`🟫 ${f.name}`);
    for (const p of Object.values(PENS)) if (p.level === level) unlocks.push(`🐾 ${p.name}`);
    for (const b of Object.values(BUILDINGS)) if (b.level === level) unlocks.push(`🏭 ${b.name}`);
    for (const v of Object.values(VEHICLES)) if (v.level === level) unlocks.push(`🚜 ${v.name}`);
    for (const s of Object.values(STAFF)) if (s.level === level) unlocks.push(`👳 ${s.name} (${s.role})`);
    for (const k of [BAGS, CANS, STORAGE, STALL]) for (const u of k) if (u.level === level && u.cost) unlocks.push(`⬆️ ${u.name}`);
    this.modal(`<div class="big">⭐</div><h2>Level ${level}!</h2>${unlocks.length ? `<p>Unlocked:</p><ul class="unl scroll">${unlocks.map((u) => `<li>${u}</li>`).join('')}</ul>` : '<p>Shabaash! Keep growing.</p>'}`);
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
  close() { this.panel.hidden = true; $('scrim').hidden = true; this.view = null; }
  openOrders() { this.open('orders'); }
  openPen(id) { this.penId = id; this.open('pen'); }
  openWorkshop(id) { this.shopId = id; this.open('workshop'); }
  openBag(tab) { this.open('bag', tab); }

  defaultTab(view) {
    return { shop: 'seeds', farm: 'fields', missions: 'mission', bag: 'carry' }[view] || null;
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
        tabs = [['seeds', '🌱 Seeds'], ['tools', '🧰 Upgrades'], ['land', '🟫 Land'], ['build', '🏭 Build'], ['vehicles', '🚜 Vehicles']];
        html = this.shopHTML();
        break;
      case 'seeds': title = '🌱 Choose seeds'; html = this.seedsHTML(true); break;
      case 'farm':
        title = '🏡 Farm';
        tabs = [['fields', '🟫 Fields'], ['staff', '👳 Staff'], ['animals', '🐾 Animals'], ['work', '🏭 Workshops'], ['blessings', '🙏 Blessings'], ['stats', '📊 Stats']];
        html = this.farmHTML();
        this.live = this.tab === 'animals' || this.tab === 'work' || this.tab === 'fields';
        break;
      case 'missions': title = '📜 Goals'; tabs = [['mission', 'Mission'], ['daily', 'Daily'], ['ach', 'Achievements']]; html = this.missionsHTML(); this.live = true; break;
      case 'bag': title = '🎒 Bag & Godown'; tabs = [['carry', '🧺 Carrying'], ['storage', '🏚️ Godown'], ['seedbag', '🌱 Seeds']]; html = this.bagHTML(); break;
      case 'map': title = '🗺️ Map'; html = this.mapHTML(); break;
      case 'settings': title = '⚙️ Settings'; html = this.settingsHTML(); break;
      case 'orders': title = '📋 Customer orders'; html = this.ordersHTML(); this.live = true; break;
      case 'pen': title = `🐾 ${PENS[this.penId].name}`; html = this.penHTML(); this.live = true; break;
      case 'workshop': title = `🏭 ${BUILDINGS[this.shopId].name}`; html = this.workshopHTML(); this.live = true; break;
    }
    this.titleEl.textContent = title;
    this.tabs(tabs);
    if (this.cache.panelHtml !== html) {
      const y = this.body.scrollTop;
      this.body.innerHTML = html;
      this.cache.panelHtml = html;
      this.body.scrollTop = scrollTop ? 0 : y;
    }
    if (this.view === 'settings') this.bindSettings();
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
      case 'land': return '<p class="hint">Buy here, or stand on the white pad in the field to pay.</p>' + FIELDS.map((f) => {
        const o = st.fields[f.id].owned;
        const b = o ? '<span class="tag ok">Owned</span>' : st.level < f.level ? `<span class="tag">🔒 L${f.level}</span>` : this.btn(`Buy ${money(f.cost - st.fields[f.id].paid)}`, 'buyField', { id: f.id }, st.money < f.cost - st.fields[f.id].paid);
        return this.row('🟫', f.name, `${f.cols * f.rows} plots`, b + (o ? '' : this.btn('📍', 'guide', { t: f.id })));
      }).join('');
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
        let h = `<p class="hint">A Seeri (field manager) farms a field on their own, buying seeds as needed. Wages ₹${STAFF.seeri.salary}/day.</p>`;
        for (const f of FIELDS) {
          const fd = st.fields[f.id];
          if (!fd.owned) continue;
          const [u, t, , gr, r] = g.farm.counts(f.id);
          const crops = Object.entries(CROPS).filter(([, c]) => c.level <= st.level);
          const sel = `<select data-act="noop" onchange="window.__game.ui.setFieldCrop('${f.id}', this.value)">${crops.map(([id, c]) => `<option value="${id}" ${fd.crop === id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select>`;
          const b = fd.seeri ? this.btn('Dismiss', 'fire', { role: 'seeri', id: f.id }, false, 'ghost') : st.level < STAFF.seeri.level ? `<span class="tag">🔒 L${STAFF.seeri.level}</span>` : this.btn(`Hire Seeri ${money(STAFF.seeri.hire)}`, 'hire', { role: 'seeri', id: f.id }, st.money < STAFF.seeri.hire);
          h += `<div class="card2"><div class="ct"><b>🟫 ${f.name}</b>${fd.seeri ? '<span class="tag ok">👳 Seeri working</span>' : ''}</div>
            <small>${r} ripe · ${gr} growing · ${t} tilled · ${u} empty</small>
            <div class="ctrl">${fd.seeri ? `Crop: ${sel}` : ''}${b}${this.btn('📍', 'guide', { t: f.id })}</div></div>`;
        }
        return h;
      }
      case 'staff': {
        let h = `<p class="hint">Managers automate whole departments. Wages are paid every in-game day (${Math.round(360 / 60)} min). Total: ₹${g.staff.salaries()}/day.</p>`;
        for (const role of ['pali', 'mistri', 'munshi']) {
          const s = STAFF[role], on = st.staff[role];
          const b = on ? this.btn('Dismiss', 'fire', { role }, false, 'ghost') : st.level < s.level ? `<span class="tag">🔒 L${s.level}</span>` : this.btn(`Hire ${money(s.hire)}`, 'hire', { role }, st.money < s.hire);
          h += this.row('👳', `${s.name} <span class="pa">${s.role}</span>`, `${s.desc} ₹${s.salary}/day`, b);
        }
        h += this.row('🧑‍🌾', `Seeris: ${Object.values(st.fields).filter((f) => f.seeri).length}`, 'Hire per field in the Fields tab', this.btn('Fields', 'tab', { tab: 'fields' }));
        return h;
      }
      case 'animals': {
        let h = '';
        for (const [id, p] of Object.entries(PENS)) {
          const d = st.pens[id];
          if (!d.owned) { h += this.row('🔒', p.name, `Level ${p.level} · ${money(p.cost)}`, this.btn('📍', 'guide', { t: id }), 'locked'); continue; }
          const pen = g.animals.pens[id];
          h += this.row(ITEMS[p.product].icon, `${p.name} · ${d.n}/${pen.cap()} ${p.animalName}s`, `Feed ${d.feed} · Water ${d.pipe ? 'pipe' : d.water} · Ready ${d.ready}`, this.btn('Manage', 'openPen', { id }));
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
    if (this.tab === 'daily') {
      return `<p class="hint">New goals every day. Finished goals pay out automatically.</p>` + st.daily.goals.map((d) => `<div class="card2 ${d.done ? 'done' : ''}"><b>${d.done ? '✅' : '🎯'} ${esc(d.text)}</b><div class="bar"><i style="width:${Math.min(1, d.prog / d.n) * 100}%"></i></div><small>${Math.min(d.prog, d.n).toLocaleString('en-IN')}/${d.n.toLocaleString('en-IN')} · ₹${d.money} + ${d.xp} XP</small></div>`).join('');
    }
    return ACHIEVEMENTS.map((a) => this.row(st.ach[a.id] ? '🏆' : '▫️', a.text, `${Math.min(st.stats[a.stat] || 0, a.n).toLocaleString('en-IN')}/${a.n.toLocaleString('en-IN')}`, st.ach[a.id] ? '<span class="tag ok">Done</span>' : '', st.ach[a.id] ? '' : 'locked')).join('');
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
    s += `<rect x="${X(-45)}" y="0" width="${3 * 3}" height="336" fill="#4fb3d9"/>`;
    s += `<rect x="${X(-1.6)}" y="${Z(-29)}" width="${3.2 * 3}" height="${73 * 3}" fill="#dba467"/><rect x="${X(-22)}" y="${Z(-63)}" width="${38 * 3}" height="${34 * 3}" fill="#f1ece2"/>`;
    s += `<rect x="${X(-8)}" y="${Z(-44)}" width="48" height="24" fill="#4fb3d9"/><circle cx="${X(0)}" cy="${Z(-55)}" r="9" fill="#f2bd3a"/>`;
    for (const f of FIELDS) s += `<rect x="${X(f.x0)}" y="${Z(f.z0)}" width="${f.cols * PLOT * 3}" height="${f.rows * PLOT * 3}" fill="${st.fields[f.id].owned ? '#8a5a32' : '#6faa3e'}" stroke="#fff" stroke-width="${st.fields[f.id].owned ? 0 : 1}" stroke-dasharray="3 2" rx="2"/>`;
    const dot = (x, z, c, r = 4) => `<circle cx="${X(x)}" cy="${Z(z)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
    s += dot(...POS.stall, '#f76707') + dot(...POS.godown, '#74c0fc') + dot(...POS.tubewell, '#1c7ed6') + dot(...POS.farmhouse, '#fff3bf');
    for (const [id, p] of Object.entries(POS.pens)) s += dot(p[0], p[1], st.pens[id].owned ? '#ffd43b' : '#ced4da');
    for (const [id, p] of Object.entries(POS.buildings)) s += dot(p[0], p[1], st.buildings[id].owned ? '#d6336c' : '#ced4da');
    s += `<circle cx="${X(g.player.pos.x)}" cy="${Z(g.player.pos.z)}" r="6" fill="#e8590c" stroke="#fff" stroke-width="2.5"/></svg>`;
    const places = [['f1', '🟫 Your khet'], ['tubewell', '💧 Tubewell'], ['stall', '🧺 Mandi stall'], ['arhtiya', '⚖️ Arhtiya'], ['board', '📋 Order board'], ['godown', '🏚️ Godown'], ['darbar', '🙏 Gurdwara Dukh Niwaran Sahib'], ['langar', '🍲 Langar hall'], ['garage', '🚜 Garage'], ['farmhouse', '🏡 Kothi (home)'], ['coop', '🐔 Murgi Khana'], ['tabela', '🐃 Tabela'], ['bakri', '🐐 Goats'], ['bhed', '🐑 Sheep'], ...Object.entries(BUILDINGS).map(([id, b]) => [id, `🏭 ${b.name}`])];
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
      <button class="btn wide" data-act="share">📤 Share the game</button>
      <p class="hint">💾 Progress saves automatically on this device (last saved ${saved}).${saveWorks() ? '' : ' ⚠️ Saving is blocked in this browser mode (private browsing?).'} Saves stay in this browser — they do not sync between devices. Tip: Safari → Share → Add to Home Screen keeps your farm safest.</p>
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
    let h = `<div class="stats"><div><span>${p.animalName}s</span><b>${d.n}/${pen.cap()}</b></div><div><span>🌾 Feed</span><b>${d.feed}/${pen.feedCap()}</b></div><div><span>💧 Water</span><b>${d.pipe ? 'Pipe ✔' : `${d.water}/${PEN_WATER_CAP}`}</b></div><div><span>${ITEMS[p.product].icon} Ready</span><b>${d.ready}</b></div><div><span>⏱️ Each makes</span><b>1 / ${p.cycle}s</b></div></div>`;
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

  setFieldCrop(fid, crop) { this.game.state.fields[fid].crop = crop; }

  // ---------------------------------------------------------------- actions
  async handle(act, d) {
    const g = this.game, st = g.state;
    const fail = (msg) => { this.toast(msg); g.audio.play('error'); };
    switch (act) {
      case 'tab': this.open(this.view, d.tab); return;
      case 'goShop': this.open('shop', 'seeds'); return;
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
      case 'hire':
        if (!g.staff.hire(d.role, d.id)) return fail('Cannot hire yet');
        g.audio.play('buy');
        this.toast(`👳 ${STAFF[d.role].name} hired!`);
        break;
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
    }
    this.money();
    g.save();
    this.render();
  }
}
