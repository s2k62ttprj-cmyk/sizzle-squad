// Patiala Kisan — boot, game loop, camera, lighting, day/weather cycle and saving.
import * as THREE from 'three';
import { DAY_SECONDS, FIELDS, PLOT, xpNeed, TURBAN_COLORS, CANS, levelGift } from './config.js';
import { newState, loadSave, hasSave, writeSave, wipeSave, rescueSave, restoreSave, carryCap, todayKey } from './state.js';
import { buildWorld, POS, areaAt } from './world.js';
import { Farm } from './farm.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { FX, makeArrow } from './fx.js';
import { Flyers } from './cargo.js';
import { Labels, Pads, Actions, fmt } from './pads.js';
import { Market } from './market.js';
import { Animals } from './animals.js';
import { Production } from './production.js';
import { Vehicles } from './vehicles.js';
import { Staff } from './staff.js';
import { Guru, computePerks } from './guru.js';
import { Progression } from './progression.js';
import { UI } from './ui.js';
import { Life } from './life.js';
import { SH, setAnisotropy } from './shading.js';
import { Flyover } from './flyover.js';
import { SeeThrough } from './seethrough.js';
import { Scarecrows, Crows } from './crows.js';
import { Ring, onRing } from './ring.js';
import { Gerhi } from './gerhi.js';
import { Social } from './net.js';
import { Sweets } from './sweets.js';
import { Vendors } from './vendors.js';
import { Friends, decode, findCode, visitState, describe, INBOX_KEY } from './friends.js';
import { Weather } from './weather.js';
import { Decor } from './decor.js';
import { EastLand } from './eastland.js';
import { Airfield } from './fleet.js';
import { Tubewells } from './tubewell.js';
import { Extras } from './extras.js';
import { Voice } from './voice.js';
import { Baradari, buildBaradari } from './baradari.js';
import { Police } from './police.js';
import { Wardrobe } from './wardrobe.js';

const $ = (id) => document.getElementById(id);
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

class Guide {
  constructor(game) {
    this.game = game;
    this.arrow = makeArrow();
    this.arrow.visible = false;
    game.scene.add(this.arrow);
    this.target = null;
  }
  pos(name) {
    const f = FIELDS.find((x) => x.id === name);
    if (f) return [f.x0 + f.cols * PLOT / 2, f.z0 + f.rows * PLOT / 2];
    if (POS.pens[name]) return [POS.pens[name][0], POS.pens[name][1] + (POS.pens[name][1] < -14 ? 4 : -4)];
    if (POS.buildings[name]) return [POS.buildings[name][0], POS.buildings[name][1] + 3.6];
    if (POS.desks[name]) return [POS.desks[name][0], POS.desks[name][1] + 1.35];
    const map = { tubewell: POS.tankPad, stall: POS.stallPad, pile: POS.pile, arhtiya: POS.arhtiyaPad, board: [POS.board[0], POS.board[1] + 1.2], godown: POS.godownPad, darbar: POS.darbar, langar: POS.langarPad, garage: POS.garage, farmhouse: [POS.farmhouse[0], POS.farmhouse[1] + 3],
      baradari: [29.5, -35], mali: [36.3, -36.8], police: [-31, 43.4], orchard: [53, -36], paddock: [53.5, -54.5], mela: [52, 18], hangar: [92, 39], tubewell2: [53.5, 4],
      gopal: POS.gopalAct, vendor: [POS.vendor[0] - 1.6, POS.vendor[1] + 1.2], flyover: [0, POS.flyZ + 3], canal: [POS.canalX + 4.5, -6] };
    return map[name] || null;
  }
  set(name, temporary = false) { this.target = this.pos(name); this.temp = temporary; }
  update(dt, t) {
    const a = this.arrow, p = this.game.player.pos;
    if (!this.target) { a.visible = false; return; }
    const dx = this.target[0] - p.x, dz = this.target[1] - p.z, d = Math.hypot(dx, dz);
    if (d < 2.2) {
      a.visible = false;
      if (this.temp) this.target = null;
      return;
    }
    a.visible = true;
    const ang = Math.atan2(dx, dz);
    a.position.set(p.x + Math.sin(ang) * 1.6, 0.35 + Math.sin(t * 5) * 0.08, p.z + Math.cos(ang) * 1.6);
    a.rotation.y = ang;
  }
}

class Game {
  // opts.visit: a friend's farm snapshot — the game runs on a copy of their farm and never saves
  constructor(state, opts = {}) {
    this.state = state;
    this.visit = opts.visit || null;
    this.me = opts.me || null;             // who is visiting (their own name and pagg), for guestbooks
    this.listeners = {};
    this.carryDirty = true;
    this.perks = computePerks(state);
    this.clock = 0;
    this.saveT = 10;

    const canvas = $('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    setAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe3f5);
    this.scene.fog = new THREE.Fog(this.scene.background, 44, 120);
    this.camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.5, 300);
    this.hemi = new THREE.HemisphereLight(0xdcefff, 0x8a7a55, 1.45);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 3.0);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.camera.right = this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 100;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.035;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.weather = new Weather(this);
    this.dusk = 0;

    this.audio = new Audio(this);
    if (window.__ac) this.audio.unlock();
    this.labels = new Labels(this);
    this.pads = new Pads(this);
    this.actions = new Actions(this);
    this.colliders = [];
    const w = buildWorld(this);
    this.colliders.push(...w.colliders);
    this.vehicleColliders = w.vehicleOnly;
    this.anim = w.anim;
    this.seeThrough = new SeeThrough(this);
    this.seeThrough.add(w.statics);
    this.flyover = new Flyover(this);
    this.seeThrough.add(this.flyover.root);
    this.ring = new Ring(this);
    this.fx = new FX(this.scene);
    this.flyers = new Flyers(this.scene);
    this.farm = new Farm(this);
    this.scarecrows = new Scarecrows(this);
    this.crows = new Crows(this);
    this.decor = new Decor(this, this.state.decor, { view: !!this.visit });
    this.eastland = new EastLand(this);
    this.airfield = new Airfield(this);
    this.tubewells = new Tubewells(this);
    this.extras = new Extras(this);
    this.voice = new Voice(this);
    // release 13: tell the player once that their savings were cut to a third
    if (this.state.moneyCutNote && !this.visit) setTimeout(() => { const b = this.state.moneyCutNote; delete this.state.moneyCutNote; this.ui.toast(`🏦 Mandi reform: every farm keeps one third of its savings. ₹${b.toLocaleString('en-IN')} → ₹${Math.floor(b / 3).toLocaleString('en-IN')}`, 7); this.save(true); }, 3000);
    buildBaradari(this);
    this.player = new Player(this);
    this.input = new Input(this);
    this.guide = new Guide(this);
    this.market = new Market(this);
    this.sweets = new Sweets(this);
    this.vendors = this.visit ? null : new Vendors(this);
    this.friends = new Friends(this);
    this.animals = new Animals(this);
    this.production = new Production(this);
    this.vehicles = new Vehicles(this);
    this.gerhi = new Gerhi(this);
    this.staff = new Staff(this);
    this.baradari = new Baradari(this);
    this.police = new Police(this);
    this.wardrobe = new Wardrobe(this);
    this.guru = new Guru(this);
    this.progression = new Progression(this);
    this.setupFieldPads();
    this.life = new Life(this);
    this.ui = new UI(this);
    this.social = new Social(this);
    window.__game = this;

    this.applyQuality();
    addEventListener('resize', () => this.resize());
    this.resize();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.save(true); this.audio.suspend(true); }
      else { this.audio.suspend(false); this.last = performance.now(); }
    });
    addEventListener('pagehide', () => this.save(true));
    const q = this.progression.quest;
    if (q?.target && !this.visit) this.guide.set(q.target);
    const away = this.visit ? null : this.staff.catchUp();
    this.welcome(away);
    if (!this.visit) setTimeout(() => this.friends.pullInbox(), 900);
    this.last = performance.now();
    this.fpsT = 0; this.frames = 0; this.slow = 0;
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- events and economy
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, d = {}) { for (const fn of this.listeners[ev] || []) fn(d); }
  earn(n) {
    this.state.money += n;
    this.state.stats.earned += n;
    this.addXP(n / 14);
    this.emit('earn', { money: n });
    this.ui?.money();
  }
  reward(n) { this.state.money += n; this.ui?.money(); }
  addXP(n) {
    const st = this.state;
    st.xp += n;
    let up = false;
    while (st.xp >= xpNeed(st.level)) { st.xp -= xpNeed(st.level); st.level++; up = true; }
    if (up) {
      const gift = this.levelGifts();
      this.audio.play('level');
      this.player?.h.expr?.('happy', 3);
      this.fx.sparkle(this.player.pos.x, 2, this.player.pos.z, 0xffd43b, 30);
      this.ui?.levelUp(st.level, gift);
      this.emit('level', {});
      this.save(true);
    }
  }
  // Every level from the update on pays a gift (rupees, and Baradari roses at every fifth level). Each level pays once.
  levelGifts() {
    const st = this.state, out = { money: 0, tokens: 0 };
    if (this.visit) return out;
    for (let l = Math.max(1, st.lvlGift | 0) + 1; l <= st.level; l++) { const g = levelGift(l); out.money += g.money; out.tokens += g.tokens; }
    st.lvlGift = Math.max(st.lvlGift | 0, st.level);
    st.money += out.money; st.garden.tokens += out.tokens; st.garden.total += out.tokens;
    this.ui?.money();
    return out;
  }
  // hisaab: compare money each frame; ups are income, downs are expenses, kept per day
  trackMoney() {
    const st = this.state, L = st.ledger, m = st.money, day = new Date().toISOString().slice(0, 10);
    if (this.visit || !L) return;
    if (L.day !== day) { if (L.day) { L.days.push({ d: L.day, inc: Math.round(L.inc), exp: Math.round(L.exp) }); L.days = L.days.slice(-7); } L.day = day; L.inc = 0; L.exp = 0; }
    if (this.lastMoney !== undefined) { const d = m - this.lastMoney; if (d > 0) L.inc += d; else if (d < 0) L.exp -= d; }
    this.lastMoney = m;
  }
  refreshPerks() { this.perks = computePerks(this.state); this.ui?.blessBadge(); this.farm.dirty = true; }
  activeCargo() {
    const v = this.player?.vehicle;
    if (v && v.cargoCap > 0) return { items: v.cargo, cap: v.cargoCap };
    return { items: this.state.carry, cap: carryCap(this.state) };
  }
  vehicleCargoDirty() { const v = this.player.vehicle; if (v?.cargoView) v.syncCargo(); }

  unlockField(id) {
    this.state.fields[id].owned = true;
    this.farm.refreshFields();
    this.emit('buyField', { key: id });
    this.addXP(10);
    const f = FIELDS.find((x) => x.id === id);
    this.fx.sparkle(f.x0 + f.cols, 1, f.z0 + f.rows, 0x69db7c, 40);
    this.ui.toast(`🟫 ${f.name} is yours! Walk over it to till.`, 3);
    this.staff.sync();
    this.save(true);
  }
  setupFieldPads() {
    for (const f of FIELDS) {
      if (f.cost === 0) continue;
      const cx = f.x0 + f.cols * PLOT / 2, cz = f.z0 + f.rows * PLOT / 2;
      this.pads.add({
        x: cx, z: cz, r: 1.3,
        label: () => `<b>${f.name}</b><br>${f.cols * f.rows} plots · ₹${f.cost.toLocaleString('en-IN')}${this.state.level < f.level ? `<br>🔒 Level ${f.level}` : ''}`,
        visible: () => !this.state.fields[f.id].owned,
        pay: { level: f.level, cost: f.cost, ref: () => this.state.fields[f.id], done: () => this.unlockField(f.id) },
      });
    }
  }

  // ---------- day, weather, light
  updateDay(dt) {
    const d = this.state.day;
    d.t += dt;
    if (d.t >= DAY_SECONDS) {
      d.t -= DAY_SECONDS;
      d.n++;
      this.weather.newDay();
      this.staff.payDay();
      this.ui.toast(`🌅 Day ${d.n} · ${{ sunny: 'Sunny ☀️', cloudy: 'Cloudy ⛅', rain: 'Rain on the way 🌧️', storm: 'Thunderstorm expected ⛈️' }[d.weather]}`, 2.5);
      if (d.next === 'storm') this.ui.toast('🔮 Tomorrow: a thunderstorm is forecast', 3);
    }
    const f = d.t / DAY_SECONDS;
    const W = this.weather;
    W.update(dt, f);
    const raining = W.raining;
    if (W.rain > 0.3) { this.rainT = (this.rainT || 0) - dt; if (this.rainT <= 0) { this.rainT = 1; this.farm.rainAll(); } }
    // sunrise → day → golden sunset → blue dusk (lamps on) → dawn; never fully dark
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const sunset = sm(0.74, 0.83, f) * (1 - sm(0.89, 0.94, f));
    const night = sm(0.86, 0.92, f) * (1 - sm(0.97, 1.0, f));
    const sunrise = (1 - sm(0.0, 0.07, f)) * 0.85;
    const warm = Math.max(sunset, sunrise);
    const sunA = f * Math.PI * 2 * 0.92 - 0.3;
    const elev = Math.sin(Math.min(Math.PI, Math.max(0, f / 0.9 * Math.PI)));
    const cloud = W.cloud, fl = W.flash;
    this.sun.intensity = (2.6 + elev * 0.7) * (1 - cloud * 0.55) * (1 - night * 0.72) * (1 - warm * 0.22) * (1 - W.dark * 0.4) + fl * 1.6;
    this.hemi.intensity = (1.42 + elev * 0.12) * (1 - night * 0.42) * (1 - cloud * 0.08) * (1 - W.dark * 0.22) + cloud * 0.25 + fl * 2.6;
    // inside the Gurdwara the light turns softer and a little golden
    const calm = this.calm || 0;
    this.sun.intensity *= 1 - calm * 0.14;
    this.sun.color.set(0xfff1d6).lerp(_dusk.set(0xffa35a), warm * 0.85).lerp(_gray.set(0x9fb0ff), night * 0.8).lerp(_dusk.set(0xffe2a8), calm * 0.25);
    this.hemi.color.set(0xdcefff).lerp(_dusk.set(0xffd0b0), warm * 0.6).lerp(_gray.set(0x7d8fd8), night * 0.8).lerp(_dusk.set(0xfff0d0), calm * 0.3);
    _sky.set(0xbfe3f5).lerp(_gray.set(0xc6ced4), Math.min(1, cloud)).lerp(_dusk.set(0xffbe8f), warm * 0.75).lerp(_ngt.set(0x55639a), night * 0.85).lerp(_gray.set(0x5d6873), W.dark * 0.55).lerp(_dusk.set(0xf2f6ff), fl * 0.6);
    this.scene.background.copy(_sky);
    this.scene.fog.color.copy(_sky);
    // morning mist: thick on cloudy or rainy dawns, a light haze on clear ones, gone by mid-morning
    const mist = sm(0.01, 0.07, f) * (1 - sm(0.2, 0.3, f)) * Math.min(1, 0.35 + cloud * 0.9 + W.rain) * 0.85;
    this.mist = mist;
    this.scene.fog.near = (44 - 14 * W.dark) * (1 - mist) + 5 * mist; this.scene.fog.far = (120 - 36 * W.dark) * (1 - mist) + 40 * mist;
    if (mist > 0.02) this.scene.fog.color.lerp(_gray.set(0xe3e8ec), mist * 0.8);
    this.sunDir = [Math.cos(sunA) * 0.6 + 0.3, 0.55 + elev * 0.45, 0.45];
    this.dusk = Math.max(night, sunset * 0.35);
    SH.uCloud.value = (0.16 * (1 - cloud) + 0.3 * cloud) * (1 - W.rain) + 0.05 * W.rain;
    SH.uRimColor.value.set(0xfff1d2).lerp(_dusk.set(0xffb070), warm * 0.8).lerp(_gray.set(0xaab8ff), night * 0.7);
    SH.uWind.value = W.wind;
    SH.uLight.value = (1 - night * 0.5) * (1 - cloud * 0.25) * (1 - warm * 0.1) * (1 - W.dark * 0.15);
  }

  applyQuality() {
    let q = this.state.settings.quality;
    if (q === 'auto') q = this.autoQ || (isMobile ? 'medium' : 'high');
    this.q = q;
    const dpr = Math.min(devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' ? 1.6 : 1);
    this.renderer.setPixelRatio(dpr);
    const shadows = q !== 'low';
    this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    this.farm.setShadows(q === 'high');
    SH.uDetailAmt.value = q === 'low' ? 0 : 1;
    this.life?.setQuality(q);
    this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    this.resize();
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.75 ? 50 : 42;
    this.camera.updateProjectionMatrix();
    this.life?.resize(h * this.renderer.getPixelRatio(), this.camera.fov);
  }

  updateCamera(dt) {
    const p = this.player.pos, v = this.player.vehicle;
    const inG = this.guru.inside;
    this.zoomNow = this.zoomNow || 1;
    const alt = v?.alt || 0;
    this.altNow = (this.altNow || 0) + (alt - (this.altNow || 0)) * Math.min(1, dt * 3);
    this.zoomNow += ((v ? (v.kind === 'plane' ? 1.5 + Math.min(1.2, alt / 30) : v.kind === 'combine' || v.kind === 'truck' ? 1.35 : v.kind === 'tractor' || v.kind === 'pickup' || v.kind === 'suv' ? 1.15 : 1.05) : inG ? 1.3 : 1) - this.zoomNow) * Math.min(1, dt * 2);
    const zoom = this.state.settings.zoom * this.zoomNow;
    const portrait = innerWidth / innerHeight < 0.75;
    const dist = (portrait ? 20 : 16.5) * zoom;
    _ct.set(p.x, 0, p.z - (portrait ? 3.4 : 1.2) * zoom);
    this.camTarget = this.camTarget || _ct.clone();
    this.camTarget.lerp(_ct, Math.min(1, dt * 6));
    // ~52° looking down: shows the sides of buildings and people, not just their tops
    this.camera.position.set(this.camTarget.x, dist * 0.79 + this.altNow, this.camTarget.z + dist * 0.62);
    this.camera.lookAt(this.camTarget.x, 0.6 + this.altNow, this.camTarget.z - 0.8);
    const sd = this.sunDir || [0.5, 1, 0.45];
    this.sun.position.set(this.camTarget.x + sd[0] * 34, sd[1] * 44, this.camTarget.z - 6 + sd[2] * 34);
    this.sun.target.position.set(this.camTarget.x, 0, this.camTarget.z - 6);
  }

  frame() {
    if (document.hidden) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.renderer.render(this.scene, this.camera);
    // auto quality: drop a level when the frame rate stays low
    this.frames++; this.fpsT += dt;
    if (this.fpsT >= 3) {
      const fps = this.frames / this.fpsT;
      this.fps = fps;
      this.frames = 0; this.fpsT = 0;
      if (this.state.settings.quality === 'auto' && fps < 38 && this.q !== 'low') {
        if (++this.slow >= 2) { this.autoQ = this.q === 'high' ? 'medium' : 'low'; this.slow = 0; this.applyQuality(); }
      } else this.slow = 0;
    }
  }

  // One simulation step (also used by automated tests to advance time without rendering)
  step(dt) {
    this.clock += dt;
    const t = this.clock;
    SH.uTime.value = t;
    try {
      this.updateDay(dt);
      this.player.update(dt, t);
      this.vehicles.update(dt, t);
      this.gerhi.update(dt);
      this.pads.update(dt, t);
      this.actions.update();
      this.farm.update(dt, t);
      this.scarecrows.update(dt, t);
      this.crows.update(dt);
      this.decor.update(dt, t);
      this.eastland.update(dt);
      this.airfield.update(dt, t);
      this.tubewells.update(dt, t);
      this.extras.update(dt, t);
      this.trackMoney();
      this.baradari.update(dt, t);
      this.police.update(dt, t);
      this.market.update(dt);
      this.sweets.update(dt);
      this.vendors?.update(dt);
      this.flyover.update(dt);
      this.ring.update(dt);
      this.social.update(dt);
      this.animals.update(dt, t);
      this.production.update(dt);
      this.staff.update(dt);
      this.guru.update(dt);
      if (!this.visit) this.progression.update(dt);
      this.updateArea(dt);
      const bo = this.state.boosts;
      for (const k in bo) if (bo[k] > 0) bo[k] = Math.max(0, bo[k] - dt);
      this.guide.update(dt, t);
      this.flyers.update(dt);
      this.fx.update(dt, this.player.pos, this.weather);
      this.life.update(dt, t, this.dusk);
      for (const a of this.anim) a(t);
      this.smokeT = (this.smokeT || 0) - dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.55;
        if (this.kilnTop) this.fx.puff(this.kilnTop.x, this.kilnTop.y, this.kilnTop.z, { color: 0x8a8a8a, size: 1.6, grow: 3, life: 6, rise: 1.4, drift: 0.5, alpha: 0.5 });
        if (this.chimney && Math.random() < 0.6) this.fx.smoke(this.chimney.x, this.chimney.y, this.chimney.z, 0xd0d0d0);
      }
      if (Math.random() < dt * (this.guru.inside ? 0.12 : 0.25) && !this.weather.raining) this.audio.play('bird');
      this.audio.update(dt);
      this.updateCamera(dt);
      this.seeThrough.update(dt);
      this.labels.update();
      this.ui.update(dt);
      this.saveT -= dt;
      if (this.saveT <= 0) this.save(true);
    } catch (e) {
      console.error(e);
      if (!this.errShown) { this.errShown = true; this.ui?.toast('⚠️ ' + e.message, 5); }
      this.lastError = e;
    }
  }

  // Music follows the area; a few landmarks announce themselves when you arrive
  updateArea(dt) {
    const p = this.player.pos, a = onRing(p.x, p.z) ? 'ring' : areaAt(p.x, p.z);
    this.audio.setZone(a, dt);
    if (a === this.area) return;
    this.area = a;
    const names = { ring: '🛣️ Ring Road · ਰਿੰਗ ਰੋਡ — gerhi time!', canal: '🌊 Bhakhra Nehar · ਭਾਖੜਾ ਨਹਿਰ', flyover: '🌉 22 No. Flyover · 22 ਨੰਬਰ ਫਲਾਈਓਵਰ', sweets: "🍥 Gopal's Sweets · ਗੋਪਾਲ ਸਵੀਟਸ" };
    this.areaSeen ||= {};
    if (names[a] && !(this.clock - (this.areaSeen[a] ?? -1e9) < 60)) { this.areaSeen[a] = this.clock; this.ui.toast(names[a], 2.4); }
  }

  save(now = false) {
    if (this.visit) return;             // a friend's farm is only visited, never saved
    if (!now) { this.saveT = Math.min(this.saveT, 1.5); return; }
    this.saveT = 10;
    this.player.save();
    this.vehicles.save();
    writeSave(this.state);
  }

  welcome(report) {
    const st = this.state;
    $('pname').textContent = st.name + (st.aura?.title ? ' 👑' : '');
    if (this.visit) { setTimeout(() => this.ui.toast(`👀 Welcome to ${esc(st.name)}'s farm! Walk around — tap 🏠 to go home`, 4), 600); return; }
    const away = st.saved ? (Date.now() - st.saved) / 60000 : 0;
    if (report) setTimeout(() => this.ui.awayReport(report), 400);
    else if (away > 5) setTimeout(() => this.ui.toast(`Welcome back, ${st.name}! Your crops kept growing while you were away 🌱`, 3.5), 600);
    else if (!st.saved) setTimeout(() => this.ui.toast(`Sat Sri Akal, ${st.name}! Welcome to your khet in Patiala 🌾`, 3.5), 600);
    if (st.guru.last !== todayKey() && st.quest > 6) setTimeout(() => this.ui.toast('🙏 Visit Gurdwara Dukh Niwaran Sahib today for your blessing', 3.5), 4500);
  }

  goHome() {
    try { sessionStorage.removeItem('pk-visit'); } catch { /* ignore */ }
    location.replace(location.pathname + location.search);
  }

  share() {
    const url = location.href.split('#')[0];
    const data = { title: 'Patiala Kisan', text: 'Farm with me in Patiala! 🌾🚜🙏', url };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => this.ui.toast('🔗 Link copied!'), () => this.ui.toast(url, 5));
  }

  // Swap in a farm from a backup code: stop saving this one, keep it as a safety copy, reload
  restoreFarm(s) {
    if (this.visit) return;
    this.renderer.setAnimationLoop(null);
    this.save = () => {};
    addEventListener('pagehide', (e) => e.stopImmediatePropagation(), true);
    restoreSave(s);
    location.reload();
  }

  resetGame() {
    this.renderer.setAnimationLoop(null);
    wipeSave();
    addEventListener('pagehide', (e) => e.stopImmediatePropagation(), true);
    this.save = () => {};
    location.reload();
  }
}
const _ct = new THREE.Vector3(), _sky = new THREE.Color(), _gray = new THREE.Color(), _dusk = new THREE.Color(), _ngt = new THREE.Color();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- start screen
async function boot() {
  const start = $('start');
  $('loading').hidden = true;
  start.hidden = false;
  const has = hasSave();
  const saved = has ? loadSave() : null;
  // a save that exists but can't be read is parked under rescue keys, never overwritten
  if (has && !saved) rescueSave();
  let turban = saved?.turban || TURBAN_COLORS[0];
  const sw = $('swatches');
  sw.innerHTML = TURBAN_COLORS.map((c) => `<button style="background:${c}" data-c="${c}" class="${c === turban ? 'on' : ''}" aria-label="pagg colour"></button>`).join('');
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    turban = b.dataset.c;
    for (const x of sw.children) x.classList.toggle('on', x === b);
  });
  $('nameIn').value = saved?.name || 'Guri';
  if (saved) {
    $('playBtn').textContent = 'Continue ▶';
    $('newBtn').hidden = false;
    $('saveInfo').textContent = `Level ${saved.level} · ₹${fmt(saved.money)} · ${saved.soul} 🙏`;
  } else if (has) $('saveInfo').textContent = '⚠️ Your saved farm could not be opened here. It has been kept safe on this device.';
  let launched = false;
  const launch = (state, visit = null) => {
    if (launched) return;
    launched = true;
    start.hidden = true;
    $('loading').hidden = false;
    $('loadmsg').textContent = visit ? `Walking over to ${visit.fn}'s farm…` : 'Building your farm…';
    setTimeout(() => {
      try {
        new Game(state, { visit, me: visit && saved ? { name: saved.name, turban: saved.turban, wardrobe: saved.wardrobe } : null });
        $('loading').hidden = true;
      } catch (e) {
        console.error(e);
        $('loadmsg').textContent = 'Something went wrong: ' + e.message;
      }
    }, 30);
  };
  links(saved, launch).catch((e) => console.warn('link', e));
  $('playBtn').addEventListener('click', () => {
    const name = $('nameIn').value.trim() || 'Guri';
    const state = saved || newState(name, turban);
    state.name = name;
    state.turban = turban;
    unlockAudioEarly();
    launch(state);
  });
  $('newBtn').addEventListener('click', () => {
    if (!confirm('Start a brand-new farm? Your current farm on this device will be deleted.')) return;
    wipeSave();
    unlockAudioEarly();
    launch(newState($('nameIn').value.trim() || 'Guri', turban));
  });
}
// Links tapped in WhatsApp arrive as #pk=…; a friend's farm picked in 👥 Friends arrives
// through sessionStorage. Gifts, trades and new friends wait in the inbox until your own
// farm has loaded, so the start screen never touches the save.
async function links(saved, launch) {
  const card = $('invite'), vb = $('visitBtn');
  let hashText = location.hash || '';
  try { hashText = decodeURIComponent(hashText); } catch { /* keep raw */ }
  const code = findCode(hashText);
  if (code) { try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ } }
  let visitCode = null;
  try { visitCode = sessionStorage.getItem('pk-visit'); sessionStorage.removeItem('pk-visit'); } catch { /* ignore */ }
  const show = (html) => { card.innerHTML = html; card.hidden = false; };
  const play = saved ? 'Continue' : 'Play';
  if (code) {
    let o;
    try { o = await decode(code); } catch (e) { show(`⚠️ ${esc(e.message)}`); return; }
    const mine = !!saved && o.from === saved.pid;
    if (!mine) queueInbox(code);
    if (mine) show('🙂 This is your own link — send it to your friends!');
    else if (o.k === 'farm') {
      visitCode = code;
      show(`👥 <b>${esc(o.fn)}</b> shared their farm with you! ${saved ? 'They join your friends when you play.' : 'Visit it, then start your own farm.'}`);
    } else if (o.k === 'gift') show(`🎁 <b>${esc(o.fn)}</b> sent ${esc(o.tn || 'you')} a gift: ${describe(o.items)}. Tap ${play} to receive it.`);
    else if (o.k === 'offer') show(`🔁 <b>${esc(o.fn)}</b> wants to trade their ${describe(o.give)} for ${describe(o.want)}. Tap ${play} to answer.`);
    else if (o.k === 'reply') show(`🤝 <b>${esc(o.fn)}</b> accepted your trade! Tap ${play} to collect.`);
  }
  if (visitCode) {
    let snap;
    try { snap = await decode(visitCode); } catch { return; }
    if (snap.k !== 'farm') return;
    if (!code) show(`👀 Ready to visit <b>${esc(snap.fn)}</b>'s farm (level ${snap.l || 1}).`);
    vb.textContent = `👀 Visit ${snap.fn}'s farm`;
    vb.hidden = false;
    vb.onclick = () => { unlockAudioEarly(); launch(visitState(snap, saved), snap); };
  }
}
function queueInbox(code) {
  try {
    const list = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]');
    if (!list.includes(code)) list.push(code);
    localStorage.setItem(INBOX_KEY, JSON.stringify(list.slice(-20)));
  } catch { /* storage blocked */ }
}

// iOS needs the AudioContext created inside the tap handler itself
function unlockAudioEarly() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC && !window.__ac) { try { window.__ac = new AC(); window.__ac.resume(); } catch { /* ignore */ } }
}

boot();
