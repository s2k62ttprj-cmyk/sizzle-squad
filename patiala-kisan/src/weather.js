// Weather: sunny, cloudy, rain (light to heavy) and thunderstorms, decided a day ahead so the
// game can warn you. A storm day builds through the morning (darker sky, rising wind), breaks
// in the afternoon with lightning, thunder and heavy rain, then clears with a rainbow. Everything
// eases in and out. It never interrupts play: warnings are banners and toasts, lightning is only
// light and sound, and the rain waters every crop for free.
import * as THREE from 'three';
import { DAY_SECONDS, WEATHER } from './config.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ICON = { sunny: '☀️', cloudy: '⛅', rain: '🌧️', storm: '⛈️' };
const NAME = { sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', storm: 'Thunderstorm' };
const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();

export const pickWeather = (rng = Math.random) => {
  let r = rng(), acc = 0;
  for (const [k, p] of Object.entries(WEATHER.odds)) { acc += p; if (r < acc) return k; }
  return 'sunny';
};
export const rainLabel = (i) => (i < 0.4 ? 'Light rain' : i < 0.62 ? 'Steady rain' : 'Heavy rain');

export class Weather {
  constructor(game) {
    this.game = game;
    this.rain = 0;            // 0..1 how hard it rains right now
    this.cloud = 0;           // 0..~0.95 cloud cover
    this.wind = 1;            // multiplies how much plants and flags sway
    this.flash = 0;           // 0..1 lightning light
    this.stormK = 0;          // 0..1 how deep into the thunderstorm we are
    this.dark = 0;
    this.strikeT = 6;
    this.rainbow = 0;
    this.noted = { n: -1 };
    this.boltMat = new THREE.LineBasicMaterial({ color: 0xeaf2ff, transparent: true, opacity: 0, fog: false });
    this.bolt = new THREE.LineSegments(new THREE.BufferGeometry(), this.boltMat);
    this.bolt.frustumCulled = false; this.bolt.visible = false;
    game.scene.add(this.bolt);
    // a rainbow: seven thin arcs, shown for a little while after a storm
    this.arcs = new THREE.Group();
    [0xff4d4d, 0xff9f43, 0xffe66d, 0x69db7c, 0x4dabf7, 0x5c7cfa, 0x9775fa].forEach((c, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(60 - i * 0.9, 0.45, 4, 40, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      this.arcs.add(m);
    });
    this.arcs.visible = false;
    game.scene.add(this.arcs);
    this.makeHud();
  }
  get raining() { return this.rain > 0.12; }
  get stormy() { return this.stormK > 0.4; }

  // ---------- planning the days
  newDay() {
    const d = this.game.state.day;
    d.weather = d.next || pickWeather();
    d.next = pickWeather();
    d.rainI = +(0.3 + Math.random() * 0.45).toFixed(2);
  }
  ensure() {
    const d = this.game.state.day;
    if (!d.next) d.next = pickWeather();
    if (!(d.rainI > 0)) d.rainI = 0.5;
    if (!ICON[d.weather]) d.weather = 'sunny';
  }

  // ---------- the HUD: a chip beside the day text and a warning banner
  makeHud() {
    const hud = $('hud');
    const bar = document.createElement('div');
    bar.id = 'wxBar'; bar.className = 'wxbar'; bar.hidden = true;
    bar.innerHTML = '<i id="wxIcon">⚠️</i><div><b id="wxTitle"></b><small id="wxText"></small></div><button id="wxX" aria-label="Close">✕</button>';
    hud.appendChild(bar);
    const chip = document.createElement('button');
    chip.id = 'wxChip'; chip.className = 'wxchip'; chip.hidden = true;
    hud.appendChild(chip);
    for (const el of [bar, chip]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
    $('wxX').addEventListener('click', (e) => { e.stopPropagation(); bar.hidden = true; });
    chip.addEventListener('click', (e) => { e.stopPropagation(); this.game.ui.weatherInfo(); });
    bar.addEventListener('click', () => { this.game.ui.weatherInfo(); });
  }
  banner(icon, title, text, secs = 12) {
    $('wxIcon').textContent = icon; $('wxTitle').textContent = title; $('wxText').textContent = text;
    $('wxBar').hidden = false;
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => { $('wxBar').hidden = true; }, secs * 1000);
    this.game.audio.play('tring');
  }
  untilStorm() { const d = this.game.state.day; return Math.max(0, Math.round(WEATHER.stormWindow[0] * DAY_SECONDS - d.t)); }
  statusText() {
    const d = this.game.state.day, f = d.t / DAY_SECONDS;
    if (this.stormy) return '⛈️ Thunderstorm';
    if (d.weather === 'storm' && f < WEATHER.stormWindow[0]) { const s = this.untilStorm(); return `⚠️ Storm in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    if (this.raining) return `🌧️ ${rainLabel(this.rain)}`;
    if (d.weather === 'storm') return '🌈 Storm has passed';
    return `${ICON[d.weather]} ${NAME[d.weather]}`;
  }
  forecast() {
    const d = this.game.state.day;
    return { today: d.weather, tomorrow: d.next, rainI: d.rainI };
  }

  // ---------- announcements (once each per day)
  announce(f) {
    const g = this.game, d = g.state.day, n = this.noted;
    if (n.n !== d.n) { Object.assign(n, { n: d.n, warn: false, last: false, start: false, end: false }); }
    if (g.visit) return;
    const [a, b] = WEATHER.stormWindow;
    if (d.weather === 'storm') {
      if (!n.warn && f < a - 0.05) {
        n.warn = true;
        this.banner('⚠️', 'Thunderstorm warning', 'A big storm will hit this afternoon with lightning and heavy rain. The rain will water your crops for free, the crows will stay away. Harvest what is ripe and finish your outdoor jobs.', 14);
      }
      if (!n.last && f >= a - 0.1 && f < a) { n.last = true; this.banner('⛈️', 'Storm arriving soon', 'Dark clouds are rolling in. Less than a minute until it breaks.', 8); }
      if (!n.start && f >= a) { n.start = true; g.ui.toast('⛈️ The thunderstorm has begun. Stay cosy, the farm is fine', 3); }
      if (!n.end && f >= b + 0.05) { n.end = true; this.rainbow = 40; g.ui.toast('🌈 The storm has passed. Rich soil, fresh air!', 3.5); }
    } else if (d.weather === 'rain' && !n.start && f > 0.26) { n.start = true; g.ui.toast(`🌧️ ${rainLabel(d.rainI)}: it is watering your crops`, 2.8); }
  }

  // ---------- each frame: where the day fraction f puts the weather
  update(dt, f) {
    const g = this.game, d = g.state.day, w = d.weather, [a, b] = WEATHER.stormWindow;
    let rainT = 0, cloudT = 0, windT = 1, k = 0;
    if (w === 'cloudy') { cloudT = 0.34; windT = 1.4; }
    else if (w === 'rain') {
      const m = sm(0.22, 0.3, f) * (1 - sm(0.56, 0.64, f));
      rainT = d.rainI * m; cloudT = 0.34 + 0.32 * m; windT = 1.3 + 0.8 * m;
    } else if (w === 'storm') {
      const build = sm(a - 0.22, a, f), after = 1 - sm(b + 0.05, b + 0.16, f);
      k = sm(a, a + 0.04, f) * (1 - sm(b, b + 0.06, f));
      rainT = 0.2 * build * (1 - k) + 0.96 * k + 0.12 * (1 - after < 1 ? after * (1 - k) * sm(b, b + 0.06, f) : 0);
      cloudT = 0.3 + 0.62 * Math.max(build * after, k);
      windT = 1.2 + 2.3 * Math.max(build * 0.5 * after, k);
    }
    const ease = (v, t, r) => v + (t - v) * Math.min(1, dt * r);
    this.rain = ease(this.rain, rainT, 0.5);
    this.cloud = ease(this.cloud, cloudT, 0.35);
    this.wind = ease(this.wind, windT, 0.5);
    this.stormK = ease(this.stormK, k, 1);
    this.dark = Math.max(0, (this.cloud - 0.45) / 0.5);
    this.announce(f);
    // lightning: a flash of light, a jagged bolt on the horizon, thunder that arrives after a delay
    this.flash = Math.max(0, this.flash - dt * 4.5);
    if (this.stormK > 0.4) {
      this.strikeT -= dt;
      if (this.strikeT <= 0) { this.strike(); this.strikeT = 3.5 + Math.random() * 8 * (1.3 - this.stormK); }
    }
    if (this.boltMat.opacity > 0) { this.boltMat.opacity = Math.max(0, this.boltMat.opacity - dt * 5); if (this.boltMat.opacity <= 0) this.bolt.visible = false; }
    // rainbow after the storm
    if (this.rainbow > 0) { this.rainbow -= dt; }
    const rb = Math.min(1, this.rainbow / 6, (40 - this.rainbow) / 4) * (this.rainbow > 0 ? 1 : 0);
    this.arcs.visible = rb > 0.01;
    if (this.arcs.visible) {
      const p = g.player.pos;
      this.arcs.position.set(p.x - 6, -4, p.z - 78);
      for (const m of this.arcs.children) m.material.opacity = Math.max(0, rb) * 0.4;
    }
    // chip
    const chip = $('wxChip');
    const show = this.stormy || (w === 'storm' && f < a && !g.visit) || this.rain > 0.6;
    if (show !== !chip.hidden) chip.hidden = !show;
    if (show) { const t = this.statusText(); if (chip.textContent !== t) chip.textContent = t; chip.classList.toggle('warn', !this.stormy && w === 'storm'); }
  }

  strike() {
    const g = this.game, p = g.player.pos;
    const x = p.x + (Math.random() - 0.5) * 50, z = p.z - 9 - Math.random() * 26;
    const dist = Math.hypot(x - p.x, z - p.z);
    const pts = [], seg = 9;
    let cx = x, cz = z;
    for (let i = 0; i < seg; i++) {
      const y0 = 46 - i * 5, y1 = y0 - 5, nx = cx + (Math.random() - 0.5) * 3.6, nz = cz + (Math.random() - 0.5) * 1.8;
      pts.push(cx, y0, cz, nx, y1, nz);
      if (i > 2 && Math.random() < 0.35) pts.push(nx, y1, nz, nx + (Math.random() - 0.5) * 7, y1 - 7, nz + (Math.random() - 0.5) * 3);
      cx = nx; cz = nz;
    }
    this.bolt.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.bolt.geometry.computeBoundingSphere();
    this.bolt.visible = true; this.boltMat.opacity = 1;
    this.flash = 1;
    setTimeout(() => { this.flash = Math.max(this.flash, 0.7); }, 110);          // the second flicker
    g.audio.thunder?.(dist);
    g.fx.sparkle(x, 0.4, z, 0xdbe9ff, 6);
  }
}
