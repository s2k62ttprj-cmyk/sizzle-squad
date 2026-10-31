// Patiala Kisan — boot, game loop, camera, lighting, day/weather cycle and saving.
import * as THREE from 'three';
import { DAY_SECONDS, FIELDS, PLOT, xpNeed, TURBAN_COLORS, CANS } from './config.js';
import { newState, loadSave, hasSave, writeSave, wipeSave, carryCap, todayKey } from './state.js';
import { buildWorld, POS } from './world.js';
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
    const map = { tubewell: POS.tankPad, stall: POS.stallPad, pile: POS.pile, arhtiya: POS.arhtiyaPad, board: [POS.board[0], POS.board[1] + 1.2], godown: POS.godownPad, darbar: POS.darbar, langar: POS.langarPad, garage: POS.garage, farmhouse: [POS.farmhouse[0], POS.farmhouse[1] + 3] };
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
  constructor(state) {
    this.state = state;
    this.listeners = {};
    this.carryDirty = true;
    this.weather = { raining: false };
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
    this.dusk = 0;

    this.audio = new Audio(this);
    if (window.__ac) this.audio.unlock();
    this.labels = new Labels(this);
    this.pads = new Pads(this);
    this.actions = new Actions(this);
    this.colliders = [];
    const w = buildWorld(this);
    this.colliders.push(...w.colliders);
    this.anim = w.anim;
    this.fx = new FX(this.scene);
    this.flyers = new Flyers(this.scene);
    this.farm = new Farm(this);
    this.player = new Player(this);
    this.input = new Input(this);
    this.guide = new Guide(this);
    this.market = new Market(this);
    this.animals = new Animals(this);
    this.production = new Production(this);
    this.vehicles = new Vehicles(this);
    this.staff = new Staff(this);
    this.guru = new Guru(this);
    this.progression = new Progression(this);
    this.setupFieldPads();
    this.life = new Life(this);
    this.ui = new UI(this);
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
    if (q?.target) this.guide.set(q.target);
    const away = this.staff.catchUp();
    this.welcome(away);
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
      this.audio.play('level');
      this.fx.sparkle(this.player.pos.x, 2, this.player.pos.z, 0xffd43b, 30);
      this.ui?.levelUp(st.level);
      this.emit('level', {});
      this.save(true);
    }
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
      const r = Math.random();
      d.weather = r < 0.55 ? 'sunny' : r < 0.8 ? 'cloudy' : 'rain';
      this.staff.payDay();
      this.ui.toast(`🌅 Day ${d.n} · ${{ sunny: 'Sunny ☀️', cloudy: 'Cloudy ⛅', rain: 'Rain on the way 🌧️' }[d.weather]}`, 2.5);
    }
    const f = d.t / DAY_SECONDS;
    const raining = d.weather === 'rain' && f > 0.25 && f < 0.6;
    if (raining !== this.weather.raining) {
      this.weather.raining = raining;
      if (raining) this.ui.toast('🌧️ Barish! Rain is watering your crops', 2.5);
    }
    if (raining) { this.rainT = (this.rainT || 0) - dt; if (this.rainT <= 0) { this.rainT = 1; this.farm.rainAll(); } }
    // sunrise → day → golden sunset → blue dusk (lamps on) → dawn; never fully dark
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const sunset = sm(0.74, 0.83, f) * (1 - sm(0.89, 0.94, f));
    const night = sm(0.86, 0.92, f) * (1 - sm(0.97, 1.0, f));
    const sunrise = (1 - sm(0.0, 0.07, f)) * 0.85;
    const warm = Math.max(sunset, sunrise);
    const sunA = f * Math.PI * 2 * 0.92 - 0.3;
    const elev = Math.sin(Math.min(Math.PI, Math.max(0, f / 0.9 * Math.PI)));
    const cloud = d.weather === 'sunny' ? 0 : raining ? 0.6 : 0.32;
    this.sun.intensity = (2.6 + elev * 0.7) * (1 - cloud * 0.55) * (1 - night * 0.72) * (1 - warm * 0.22);
    this.hemi.intensity = (1.42 + elev * 0.12) * (1 - night * 0.42) * (1 - cloud * 0.08) + cloud * 0.25;
    this.sun.color.set(0xfff1d6).lerp(_dusk.set(0xffa35a), warm * 0.85).lerp(_gray.set(0x9fb0ff), night * 0.8);
    this.hemi.color.set(0xdcefff).lerp(_dusk.set(0xffd0b0), warm * 0.6).lerp(_gray.set(0x7d8fd8), night * 0.8);
    _sky.set(0xbfe3f5).lerp(_gray.set(0xc6ced4), cloud).lerp(_dusk.set(0xffbe8f), warm * 0.75).lerp(_ngt.set(0x55639a), night * 0.85);
    this.scene.background.copy(_sky);
    this.scene.fog.color.copy(_sky);
    this.sunDir = [Math.cos(sunA) * 0.6 + 0.3, 0.55 + elev * 0.45, 0.45];
    this.dusk = Math.max(night, sunset * 0.35);
    SH.uCloud.value = d.weather === 'sunny' ? 0.16 : raining ? 0.05 : 0.3;
    SH.uRimColor.value.set(0xfff1d2).lerp(_dusk.set(0xffb070), warm * 0.8).lerp(_gray.set(0xaab8ff), night * 0.7);
    SH.uWind.value = raining ? 2.2 : d.weather === 'cloudy' ? 1.4 : 1;
    SH.uLight.value = (1 - night * 0.5) * (1 - cloud * 0.25) * (1 - warm * 0.1);
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
    this.zoomNow += ((v ? (v.kind === 'combine' ? 1.35 : v.kind === 'tractor' ? 1.15 : 1.05) : inG ? 1.3 : 1) - this.zoomNow) * Math.min(1, dt * 2);
    const zoom = this.state.settings.zoom * this.zoomNow;
    const portrait = innerWidth / innerHeight < 0.75;
    const dist = (portrait ? 20 : 16.5) * zoom;
    _ct.set(p.x, 0, p.z - (portrait ? 3.4 : 1.2) * zoom);
    this.camTarget = this.camTarget || _ct.clone();
    this.camTarget.lerp(_ct, Math.min(1, dt * 6));
    // ~52° looking down: shows the sides of buildings and people, not just their tops
    this.camera.position.set(this.camTarget.x, dist * 0.79, this.camTarget.z + dist * 0.62);
    this.camera.lookAt(this.camTarget.x, 0.6, this.camTarget.z - 0.8);
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
      this.pads.update(dt, t);
      this.actions.update();
      this.farm.update(dt, t);
      this.market.update(dt);
      this.animals.update(dt, t);
      this.production.update(dt);
      this.staff.update(dt);
      this.guru.update();
      this.progression.update(dt);
      this.guide.update(dt, t);
      this.flyers.update(dt);
      this.fx.update(dt, this.player.pos, this.weather.raining);
      this.life.update(dt, t, this.dusk);
      for (const a of this.anim) a(t);
      this.smokeT = (this.smokeT || 0) - dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.55;
        if (this.kilnTop) this.fx.puff(this.kilnTop.x, this.kilnTop.y, this.kilnTop.z, { color: 0x8a8a8a, size: 1.6, grow: 3, life: 6, rise: 1.4, drift: 0.5, alpha: 0.5 });
        if (this.chimney && Math.random() < 0.6) this.fx.smoke(this.chimney.x, this.chimney.y, this.chimney.z, 0xd0d0d0);
      }
      if (Math.random() < dt * 0.25 && !this.weather.raining && !this.guru.inside) this.audio.play('bird');
      this.audio.update(dt);
      this.updateCamera(dt);
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

  save(now = false) {
    if (!now) { this.saveT = Math.min(this.saveT, 1.5); return; }
    this.saveT = 10;
    this.player.save();
    this.vehicles.save();
    writeSave(this.state);
  }

  welcome(report) {
    const st = this.state;
    const away = st.saved ? (Date.now() - st.saved) / 60000 : 0;
    if (report) setTimeout(() => this.ui.awayReport(report), 400);
    else if (away > 5) setTimeout(() => this.ui.toast(`Welcome back, ${st.name}! Your crops kept growing while you were away 🌱`, 3.5), 600);
    else if (!st.saved) setTimeout(() => this.ui.toast(`Sat Sri Akal, ${st.name}! Welcome to your khet in Patiala 🌾`, 3.5), 600);
    if (st.guru.last !== todayKey() && st.quest > 6) setTimeout(() => this.ui.toast('🙏 Visit Gurdwara Dukh Niwaran Sahib today for your blessing', 3.5), 4500);
    $('pname').textContent = st.name;
  }

  share() {
    const url = location.href.split('#')[0];
    const data = { title: 'Patiala Kisan', text: 'Farm with me in Patiala! 🌾🚜🙏', url };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => this.ui.toast('🔗 Link copied!'), () => this.ui.toast(url, 5));
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

// ---------------------------------------------------------------- start screen
function boot() {
  const start = $('start');
  $('loading').hidden = true;
  start.hidden = false;
  const saved = hasSave() ? loadSave() : null;
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
  }
  let launched = false;
  const launch = (state) => {
    if (launched) return;
    launched = true;
    start.hidden = true;
    $('loading').hidden = false;
    $('loadmsg').textContent = 'Building your farm…';
    setTimeout(() => {
      try {
        new Game(state);
        $('loading').hidden = true;
      } catch (e) {
        console.error(e);
        $('loadmsg').textContent = 'Something went wrong: ' + e.message;
      }
    }, 30);
  };
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
// iOS needs the AudioContext created inside the tap handler itself
function unlockAudioEarly() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC && !window.__ac) { try { window.__ac = new AC(); window.__ac.resume(); } catch { /* ignore */ } }
}

boot();
