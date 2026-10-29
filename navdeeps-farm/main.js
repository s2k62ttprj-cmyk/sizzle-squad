'use strict';
/* Navdeep's Farm - main loop, input, camera, rendering and effects. */

const VIEW_W = 480, VIEW_H = 270;
const STEP_TIME = 0.17; // seconds to walk one tile
const HOLD_TIME = 420;  // ms to hold OK before the item picker opens
const ACT_TIME = 0.25;

// The world is laid out in 480x270 game pixels but drawn at double resolution with smoothed sprites.
const HD = 2;
const canvas = $('view');
const ctx = canvas.getContext('2d');
const [lightCanvas, lightCtx] = makeCanvas(VIEW_W * HD, VIEW_H * HD);
let groundHd = null, groundHdCtx = null;
let vignette = null;

// Draws a sprite using its smoothed double-resolution copy.
const blit = (im, x, y) => ctx.drawImage(im.hd || im, x, y, im.width, im.height);

let mode = 'title';
let busy = false;
let groundCache = null, groundCtx = null;
let particles = [];
let chickens = [];
let rainDrops = [];
let butterflies = [];
let clouds = [];
let lateWarned = false;
let hudTimer = 0, saveTimer = 0, smokeTimer = 0, titleT = 0, lastFrame = 0;

const P = {
  tx: 5, ty: 6, toX: 5, toY: 6, px: 80, py: 96, dir: 0, moving: false, t: 0, phase: 0,
  turnUntil: 0, actT: 0, actKind: null, actX: 0, actY: 0, lift: null, pendingAction: false,
};
const cam = { x: 0, y: 0 };
const input = { dirs: [], queued: null, okAt: 0, okHeld: false };

// Saves go to the TV app's private storage when running as an app. In a browser they go to
// localStorage and, when the game runs as a claude.ai artifact, to a private per-player cloud copy.
const Store = {
  mem: {},
  cloud: null,
  get(key) {
    if (window.AndroidTV) { try { return window.AndroidTV.load(key) || null; } catch (e) { return null; } }
    if (key in this.mem) return this.mem[key];
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    if (window.AndroidTV) { try { window.AndroidTV.save(key, value); } catch (e) { /* storage unavailable */ } return; }
    this.mem[key] = value;
    try { localStorage.setItem(key, value); localStorage.setItem('farm-saved-at', String(Date.now())); } catch (e) { /* storage unavailable */ }
    if (this.cloud) this.cloud.set(key, value);
  },
  flush() { if (this.cloud) this.cloud.flush(); },
};

// Keeps the farm in the artifact's private per-player storage so it follows the player between devices.
async function connectCloudSave() {
  if (window.AndroidTV || !window.claude || !window.claude.use) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const ref = db.doc('data/users/' + (await user.id()) + '/farm');
    const snap = await ref.get();
    const data = snap.exists ? Object.assign({}, snap.data()) : {};
    let localAt = 0;
    try { localAt = +localStorage.getItem('farm-saved-at') || 0; } catch (e) { /* none */ }
    if (data.savedAt > localAt && data[SAVE_KEY]) {
      for (const k of Object.keys(data)) if (k !== 'savedAt') Store.mem[k] = data[k];
      if (mode === 'title') { S = loadSave() || newState(); resetScene(); openTitle(); }
    }
    let timer = 0;
    const write = () => { clearTimeout(timer); timer = 0; ref.set(data).catch(() => { /* keep playing on local storage */ }); };
    Store.cloud = {
      set(key, value) { data[key] = value; data.savedAt = Date.now(); clearTimeout(timer); timer = setTimeout(write, 3000); },
      flush() { if (timer) write(); },
    };
  } catch (e) { /* no cloud save: local storage still works */ }
}

function saveGame() {
  if (!S || mode !== 'play') return;
  S.player = { x: P.tx, y: P.ty, dir: P.dir };
  Store.set(SAVE_KEY, serialize());
}

function loadSave() {
  const text = Store.get(SAVE_KEY);
  if (!text) return null;
  try { return deserialize(text); } catch (e) { return null; }
}

function startGame(state, isNew) {
  S = state;
  mode = 'play';
  busy = false;
  lateWarned = S.time >= 22 * 60;
  resetScene();
  UI.closeAll();
  $('hud').classList.remove('hidden');
  updateHud();
  saveGame();
  if (isNew) showWelcome();
  else toast(`Welcome back! Day ${S.day}, ${fmtTime(S.time)}`, '', 'sun');
}

function resetScene() {
  buildGroundCache();
  placePlayer();
  spawnChickens();
  spawnHerd();
  resetPets();
  clearNpcs();
  fishing = null;
  particles = [];
  updateCamera(0, true);
}

function spawnHerd() { herd = S.animals.map((a, n) => makeAnimalEnt(a, n)); }

function backToTitle() {
  saveGame();
  clearNpcs();
  mode = 'title';
  $('hud').classList.add('hidden');
  titleT = 0;
  openTitle();
}

function exitApp() {
  saveGame();
  if (window.AndroidTV) window.AndroidTV.exit();
  else toast('Thanks for playing! You can close this tab now.');
}

/* ---------- ground cache ---------- */
function buildGroundCache() {
  if (!groundCache) [groundCache, groundCtx] = makeCanvas(MAP_W * TILE, MAP_H * TILE);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) drawGroundTile(x, y);
  groundHd = scale2x(groundCache);
  groundHdCtx = groundHd.getContext('2d');
}

// Re-smooths one rectangle of tiles after the ground changes (tilling, watering...).
function refreshGroundHd(tx0, ty0, tx1, ty1) {
  const x0 = Math.max(0, tx0 * TILE - 1), y0 = Math.max(0, ty0 * TILE - 1);
  const x1 = Math.min(MAP_W * TILE, (tx1 + 1) * TILE + 1), y1 = Math.min(MAP_H * TILE, (ty1 + 1) * TILE + 1);
  const [part, pg] = makeCanvas(x1 - x0, y1 - y0);
  pg.drawImage(groundCache, -x0, -y0);
  const hd = scale2x(part);
  const ix = tx0 * TILE - x0, iy = ty0 * TILE - y0, w = (tx1 - tx0 + 1) * TILE, h = (ty1 - ty0 + 1) * TILE;
  groundHdCtx.drawImage(hd, ix * 2, iy * 2, w * 2, h * 2, tx0 * TILE * 2, ty0 * TILE * 2, w * 2, h * 2);
}

function drawGroundTile(x, y) {
  const i = idx(x, y), g = groundCtx, px = x * TILE, py = y * TILE, type = World.ground[i];
  const nb = (dx, dy) => (inBounds(x + dx, y + dy) ? World.ground[idx(x + dx, y + dy)] : G_FOREST);
  if (S && S.soil[i]) {
    Ground.soil(g, px, py, x, y, S.soil[i] === 2, (dx, dy) => inBounds(x + dx, y + dy) && S.soil[idx(x + dx, y + dy)] > 0);
  } else if (type === G_FOREST) Ground.forest(g, px, py, x, y);
  else if (type === G_PATH) Ground.path(g, px, py, x, y, nb);
  else if (type === G_DRIVE) Ground.drive(g, px, py, x, y);
  else if (type === G_WATER) Ground.water(g, px, py, x, y, nb);
  else {
    Ground.grass(g, px, py, x, y);
    if (!inField(x, y) && !inPen(x, y) && hash2(x, y, 77) < 0.08) Ground.flowers(g, px, py, x, y);
  }
}

function groundChanged(i) {
  const x = i % MAP_W, y = (i / MAP_W) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inBounds(x + dx, y + dy)) drawGroundTile(x + dx, y + dy);
  refreshGroundHd(Math.max(0, x - 1), Math.max(0, y - 1), Math.min(MAP_W - 1, x + 1), Math.min(MAP_H - 1, y + 1));
}

// Where each building sprite sits, plus the lit windows used at night.
function layoutStructures() {
  for (const s of World.structures) {
    const spr = Art.struct[s.id];
    s.dx = s.x * TILE + (s.w * TILE - (spr.width - 2)) / 2 - 1;
    s.dy = (s.y + s.h) * TILE - (spr.height - 2) - 1;
    s.sortY = (s.y + s.h) * TILE - 1;
    if (s.id === 'house') {
      World.lights.push([s.dx + 18, s.dy + 58, 30], [s.dx + 64, s.dy + 58, 30]);
      World.chimney = [s.dx + 65, s.dy + 1];
    }
    if (s.id === 'shop') World.lights.push([s.dx + 33, s.dy + 40, 34]);
    if (s.id === 'coop') World.lights.push([s.dx + 25, s.dy + 31, 22]);
    if (s.id === 'barn') World.lights.push([s.dx + 25, s.dy + 31, 26]);
    if (s.id === 'stand') World.lights.push([s.dx + 25, s.dy + 26, 30]);
  }
}

/* ---------- the farmer ---------- */
function placePlayer() {
  P.tx = P.toX = S.player.x;
  P.ty = P.toY = S.player.y;
  P.dir = S.player.dir || 0;
  P.moving = false;
  P.t = 0;
  P.px = P.tx * TILE;
  P.py = P.ty * TILE;
  P.actT = 0;
  P.actKind = null;
  P.lift = null;
  P.pendingAction = false;
}

const heldDir = () => (input.dirs.length ? input.dirs[input.dirs.length - 1] : null);

function tryMove(d) {
  const nx = P.tx + DIRS[d][0], ny = P.ty + DIRS[d][1];
  if (isSolid(nx, ny)) return false;
  P.toX = nx;
  P.toY = ny;
  P.moving = true;
  P.t = 0;
  return true;
}

function targetTile() {
  const bx = P.moving ? P.toX : P.tx, by = P.moving ? P.toY : P.ty;
  return [bx + DIRS[P.dir][0], by + DIRS[P.dir][1]];
}

function updatePlayer(dt, now) {
  if (P.actT > 0) { P.actT -= dt; if (P.actT <= 0) P.actKind = null; }
  if (P.lift) { P.lift.t += dt; if (P.lift.t > 0.8) P.lift = null; }
  if (P.moving) {
    P.t += dt / STEP_TIME;
    P.phase += (dt / STEP_TIME) * 2;
    if (P.t >= 1) {
      P.tx = P.toX;
      P.ty = P.toY;
      P.moving = false;
      P.t = 0;
      if (P.pendingAction) { P.pendingAction = false; doAction(); }
      let d = heldDir();
      if (d === null) d = input.queued;
      input.queued = null;
      if (d !== null && P.actT <= 0) { P.dir = d; if (!tryMove(d)) P.phase = 0; } else P.phase = 0;
    }
  } else if (P.actT <= 0) {
    // A tap in a new direction only turns the farmer; holding it (or tapping again) walks.
    let d = heldDir();
    const tapped = input.queued !== null;
    if (d === null) d = input.queued;
    input.queued = null;
    if (d !== null) {
      if (d !== P.dir) { P.dir = d; P.turnUntil = now + 130; }
      else if (now >= P.turnUntil || tapped) tryMove(d);
    }
  }
  const fx = P.moving ? P.tx + (P.toX - P.tx) * P.t : P.tx;
  const fy = P.moving ? P.ty + (P.toY - P.ty) * P.t : P.ty;
  P.px = fx * TILE;
  P.py = fy * TILE;
}

function doAction() {
  if (!S || mode !== 'play') return;
  if (P.moving) { P.pendingAction = true; return; }
  if (P.actT > 0) return;
  const [x, y] = targetTile();
  const a = getAction(x, y);
  if (!a) { Sound.play('bump'); return; }
  if (!a.run) { toast(a.label); Sound.play('bump'); return; }
  if (a.cost && S.energy < a.cost) { toast("You're too tired for that. Eat a snack or go to bed!", 'bad', 'bolt'); Sound.play('error'); return; }
  if (a.needWater && S.water <= 0) { toast('Your watering can is empty. Refill it at the well or pond.', 'bad', 'can'); Sound.play('error'); return; }
  if (a.cost) S.energy -= a.cost;
  a.run();
  updateHud();
}

function playerAnim(kind) {
  P.actT = ACT_TIME;
  P.actKind = kind;
  [P.actX, P.actY] = targetTile();
}

function liftItem(id) { P.lift = { id, t: 0 }; }

/* ---------- sleeping ---------- */
function beginSleep(passedOut) {
  if (busy) return;
  busy = true;
  input.dirs = [];
  input.okAt = 0;
  Sound.play('sleep');
  $('fade').classList.add('on');
  setTimeout(() => {
    const rep = advanceDay(passedOut);
    resetScene();
    lateWarned = false;
    saveTimer = 0;
    saveGame();
    busy = false;
    showDaySummary(rep);
  }, 900);
}

function passOut() {
  toast('You can barely keep your eyes open...', 'bad', 'moon');
  beginSleep(true);
}

function morningSpray() {
  for (let i = 0; i < N_TILES; i++) if (S.sprink[i]) fxAtTile(i, 'spray');
}

/* ---------- chickens ---------- */
function makeChickenEnt(ref, n) {
  const p = World.pen;
  const tx = p.x0 + ((n * 2) % (p.x1 - p.x0)), ty = p.y0 + 4 + (n % 3);
  return { ref, x: tx * TILE + 2, y: ty * TILE + 3, gx: 0, gy: 0, state: 'idle', timer: Math.random() * 2, face: n % 2 ? -1 : 1, frame: 0, anim: Math.random(), inside: false };
}

function spawnChickens() { chickens = S.chickens.map((c, n) => makeChickenEnt(c, n)); }

function chickenAt(x, y) {
  return chickens.find(c => !c.inside && Math.floor((c.x + 6) / TILE) === x && Math.floor((c.y + 9) / TILE) === y) || null;
}

function updateChickens(dt) {
  const night = S.time >= 20 * 60;
  const p = World.pen;
  for (const c of chickens) {
    if (c.inside) continue;
    c.anim += dt;
    if (night && c.state !== 'home') {
      c.state = 'home';
      c.gx = World.coopDoor.x * TILE + 2;
      c.gy = World.coopDoor.y * TILE - 4;
    }
    if (c.state === 'idle' || c.state === 'peck') {
      c.timer -= dt;
      if (c.timer <= 0) {
        if (c.state === 'idle' && Math.random() < 0.45) { c.state = 'peck'; c.timer = 0.9; }
        else {
          let tx, ty, tries = 0;
          do {
            tx = p.x0 + Math.floor(Math.random() * (p.x1 - p.x0 + 1));
            ty = p.y0 + Math.floor(Math.random() * (p.y1 - p.y0 + 1));
          } while (World.structAt[idx(tx, ty)] >= 0 && tries++ < 20);
          c.gx = tx * TILE + 2;
          c.gy = ty * TILE + 3;
          c.state = 'walk';
        }
      }
    }
    if (c.state === 'walk' || c.state === 'home') {
      const dx = c.gx - c.x, dy = c.gy - c.y, dist = Math.hypot(dx, dy);
      if (dist < 1) {
        if (c.state === 'home') c.inside = true;
        c.state = 'idle';
        c.timer = 1 + Math.random() * 2.5;
      } else {
        const sp = c.state === 'home' ? 24 : 14;
        c.x += (dx / dist) * Math.min(dist, sp * dt);
        c.y += (dy / dist) * Math.min(dist, sp * dt);
        if (Math.abs(dx) > 0.5) c.face = dx < 0 ? -1 : 1;
      }
    }
    c.frame = c.state === 'peck' ? (Math.floor(c.anim * 4) % 2 ? 2 : 0) : (c.state === 'walk' || c.state === 'home') ? Math.floor(c.anim * 6) % 2 : 0;
  }
}

/* ---------- particles and weather ---------- */
function spawn(x, y, n, o) {
  for (let k = 0; k < n; k++) {
    particles.push({
      x, y, vx: (Math.random() - 0.5) * (o.spread || 40), vy: -Math.random() * (o.up || 40),
      g: o.g == null ? 120 : o.g, life: o.life || 0.5, t: 0,
      c: o.colors[Math.floor(Math.random() * o.colors.length)], s: o.size || 1, kind: o.kind,
    });
  }
}

function fx(type, x, y) {
  switch (type) {
    case 'dirt': spawn(x, y, 10, { colors: ['#8d5c36', '#a06d42', '#6e4426'], spread: 60, up: 50, life: 0.45 }); break;
    case 'water': spawn(x, y - 6, 12, { colors: ['#69b6ec', '#a8dcff', '#3f94d9'], spread: 40, up: 20, g: 160, life: 0.5 }); break;
    case 'spray': spawn(x, y - 8, 24, { colors: ['#69b6ec', '#a8dcff'], spread: 90, up: 60, g: 140, life: 0.8 }); break;
    case 'leaf': spawn(x, y, 8, { colors: ['#5aa63f', '#7ccb5b', '#3f8a36'], spread: 50, up: 45, life: 0.6 }); break;
    case 'stone': spawn(x, y, 10, { colors: ['#8e8b86', '#b3b0aa', '#6d6a66'], spread: 70, up: 60, life: 0.5, size: 2 }); break;
    case 'wood': spawn(x, y, 10, { colors: ['#a8743f', '#c4935c', '#6b4226'], spread: 70, up: 60, life: 0.5, size: 2 }); break;
    case 'spark': spawn(x, y - 8, 10, { colors: ['#fff6b0', '#ffd84a', '#ffffff'], spread: 50, up: 50, g: 40, life: 0.7 }); break;
    case 'smoke': particles.push({ x, y, vx: 4 + Math.random() * 4, vy: -10, g: 0, life: 2.2, t: 0, c: '#d8d4ce', s: 2, kind: 'smoke' }); break;
    case 'heart':
      for (let k = 0; k < 3; k++) particles.push({ x: x + (k - 1) * 5, y: y - 6, vx: (k - 1) * 8, vy: -16 - k * 3, g: 0, life: 1, t: 0, kind: 'heart' });
      break;
  }
}

function fxAtTile(i, type) { fx(type, (i % MAP_W) * TILE + 8, ((i / MAP_W) | 0) * TILE + 10); }

function updateParticles(dt) {
  for (const p of particles) {
    p.t += dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particles = particles.filter(p => p.t < p.life);
}

function initAmbience() {
  rainDrops = [];
  for (let k = 0; k < 140; k++) rainDrops.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, v: 220 + Math.random() * 80 });
  butterflies = [];
  for (let k = 0; k < 5; k++) butterflies.push({ x: 60 + Math.random() * 520, y: 140 + Math.random() * 280, a: Math.random() * 6.28, c: ['#ffffff', '#ffd84a', '#ff8fb3'][k % 3], t: Math.random() * 10 });
  clouds = [];
  for (let k = 0; k < 3; k++) clouds.push({ x: Math.random() * 640, y: Math.random() * 480, r: 60 + Math.random() * 40 });
}

function updateAmbience(dt) {
  for (const d of rainDrops) {
    d.y += d.v * dt;
    d.x -= d.v * 0.25 * dt;
    if (d.y > VIEW_H) { d.y -= VIEW_H + 6; d.x = Math.random() * (VIEW_W + 60); }
  }
  for (const b of butterflies) {
    b.t += dt;
    b.a += (Math.random() - 0.5) * 3 * dt;
    b.x += Math.cos(b.a) * 14 * dt;
    b.y += Math.sin(b.a) * 10 * dt;
    if (b.x < 40 || b.x > 600 || b.y < 120 || b.y > 440) b.a += Math.PI * dt * 2;
  }
  for (const c of clouds) { c.x += 6 * dt; if (c.x - c.r > MAP_W * TILE) c.x = -c.r; }
}

/* ---------- camera ---------- */
function updateCamera(dt, snap) {
  const tx = Math.max(0, Math.min(MAP_W * TILE - VIEW_W, P.px + 8 - VIEW_W / 2));
  const ty = Math.max(0, Math.min(MAP_H * TILE - VIEW_H, P.py + 8 - VIEW_H / 2));
  if (snap) { cam.x = tx; cam.y = ty; return; }
  const k = Math.min(1, dt * 8);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}

/* ---------- main loop ---------- */
function update(dt, now) {
  updateParticles(dt);
  updateAmbience(dt);
  if (!S) return;
  updateChickens(dt);
  updateLife(dt);
  updateMotes(dt);
  if (Math.random() < dt * 2.5) spawnLeaves();
  smokeTimer += dt;
  if (smokeTimer > 0.6 && World.chimney) { smokeTimer = 0; fx('smoke', World.chimney[0], World.chimney[1]); }
  if (mode === 'title') {
    titleT += dt;
    cam.x = 140 + Math.sin(titleT * 0.06) * 140;
    cam.y = 10 + (Math.sin(titleT * 0.045) + 1) * 90;
    return;
  }
  if (busy || UI.active()) return;
  updateNpcs(dt);
  if (input.okAt && !input.okHeld && now - input.okAt > HOLD_TIME) { input.okHeld = true; openHandPicker(); }
  if (fishing) updateFishing(dt); else updatePlayer(dt, now);
  updateCamera(dt);
  S.time += dt * MINUTES_PER_SECOND;
  if (!lateWarned && S.time >= 22 * 60) { lateWarned = true; toast("It's getting late. Head to bed before midnight!", '', 'moon'); }
  if (S.time >= DAY_END) { S.time = DAY_END; passOut(); }
  hudTimer += dt;
  if (hudTimer > 0.15) { hudTimer = 0; updateHud(); }
  saveTimer += dt;
  if (saveTimer > 45) { saveTimer = 0; saveGame(); }
}

function loop(now) {
  const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
  lastFrame = now;
  update(dt, now);
  if (S) render(now);
  requestAnimationFrame(loop);
}

/* ---------- drawing ---------- */
function nightAmount() {
  const t = S.time;
  if (t < DAY_START + 30) return 0.45 * (1 - (t - DAY_START) / 30);
  if (t < 18 * 60) return 0;
  if (t < 21 * 60) return (t - 18 * 60) / 180;
  return 1;
}

function render(now) {
  ctx.setTransform(HD, 0, 0, HD, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const cx = Math.round(cam.x * HD) / HD, cy = Math.round(cam.y * HD) / HD;
  ctx.drawImage(groundHd, cx * HD, cy * HD, VIEW_W * HD, VIEW_H * HD, 0, 0, VIEW_W, VIEW_H);
  const tx0 = Math.max(0, (cx >> 4) - 2), tx1 = Math.min(MAP_W - 1, ((cx + VIEW_W) >> 4) + 2);
  const ty0 = Math.max(0, (cy >> 4) - 1), ty1 = Math.min(MAP_H - 1, ((cy + VIEW_H) >> 4) + 3);

  // water sparkle
  ctx.fillStyle = 'rgba(210,240,255,0.8)';
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      if (World.ground[idx(x, y)] !== G_WATER) continue;
      for (let k = 0; k < 2; k++) {
        const ph = (now / 1400 + hash2(x, y, k + 5)) % 1;
        if (ph < 0.45) ctx.fillRect(x * 16 + 3 + Math.floor(hash2(x, y, k) * 9) - cx, y * 16 + 4 + Math.floor(hash2(x, y, k + 9) * 8) - cy, ph < 0.2 ? 2 : 3, 1);
      }
    }
  }

  const items = [];
  const snap = v => Math.round(v * HD) / HD;
  const push = (s, im, x, y) => items.push({ s, im, x: snap(x - cx), y: snap(y - cy) });
  const shadow = (im, x, y) => blit(im, snap(x - cx), snap(y - cy));
  const night = S.time >= 19 * 60 || S.time < DAY_START + 20;

  for (const t of World.trees) {
    if (t.x < tx0 || t.x > tx1 || t.y < ty0 || t.y > ty1 + 1) continue;
    const tree = Art.trees[t.kind];
    const sway = Math.round(Math.sin(now / 900 + t.x * 0.7 + t.y * 0.3) * 0.75); // a gentle breeze
    shadow(Art.shadowTree, t.x * 16 - 5, t.y * 16 + 10);
    push(t.y * 16 + 15, tree.trunk, t.x * 16 - 11, t.y * 16 - 30);
    push(t.y * 16 + 15.5, tree.canopy, t.x * 16 - 11 + sway, t.y * 16 - 30);
    if (tree.fruit) push(t.y * 16 + 15.6, tree.fruit, t.x * 16 - 10 + sway, t.y * 16 - 29);
  }
  for (const b of World.bushes) if (b.x >= tx0 && b.x <= tx1 && b.y >= ty0 && b.y <= ty1) push(b.y * 16 + 14, Art.bush, b.x * 16 - 1, b.y * 16 - 2);
  for (const s of World.structures) {
    const im = (night && Art.structNight[s.id]) || Art.struct[s.id];
    if (s.dx + im.width < cx || s.dx > cx + VIEW_W || s.dy + im.height < cy || s.dy > cy + VIEW_H) continue;
    push(s.sortY, im, s.dx, s.dy);
  }
  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const i = idx(x, y), px = x * 16, py = y * 16;
      if (World.fence[i]) push(py + 12, Art.fence[World.fenceMask[i]], px - 1, py - 3);
      const c = S.crops[i];
      if (c) push(py + 13, Art.crops[c.t][cropStage(c)], px - 1, py - 17);
      const d = S.debris[i];
      if (d) push(py + 13, Art.debris[d], px - 1, py - 2);
      if (S.sprink[i]) push(py + 13, Art.sprinkler, px - 1, py - 2);
      const e = S.eggs[i];
      if (e) push(py + 12, Art.eggs[e], px + 3, py + 5);
    }
  }
  for (const c of chickens) {
    if (c.inside) continue;
    shadow(Art.shadowSmall, c.x + 1, c.y + 8);
    push(c.y + 11, Art.chicken[c.face > 0 ? 1 : 0][c.frame], c.x - 1, c.y - 1);
  }
  const tool = (kind, t, x, y, sortY) => {
    if (kind !== 'hoe' && kind !== 'can' && kind !== 'till' && kind !== 'water') return;
    const k = 1 - t / ACT_TIME;
    push(sortY, kind === 'hoe' || kind === 'till' ? Art.hoe : Art.can, x * 16 + 2, y * 16 - 8 + Math.round(k * 5));
  };
  for (const n of npcs) {
    shadow(Art.shadowSmall, n.px + 3, n.py + 13);
    const f = n.path.length ? [1, 0, 3, 0][Math.floor(n.phase) % 4] : 0;
    push(n.py + 15, n.sprites[n.dir][f], n.px - 1, n.py - 8);
    if (n.kind === 'manager' && n.dir !== 1) {
      const carry = managerInfo(n.id).role === 'water' ? Art.miniCan : Art.basket;
      push(n.py + 15.2, carry, n.px + (n.dir === 2 ? -4 : 10), n.py + 6);
    }
    if (n.actT > 0) tool(n.actKind, n.actT, n.actX, n.actY, Math.max(n.py, n.actY * 16) + 17);
  }
  const frame = P.moving ? [1, 0, 3, 0][Math.floor(P.phase) % 4] : 0;
  shadow(Art.shadowSmall, P.px + 3, P.py + 13);
  push(P.py + 15, Art.player[P.dir][frame], P.px - 1, P.py - 8);
  tool(P.actKind, P.actT, P.actX, P.actY, Math.max(P.py, P.actY * 16) + 17);
  pushLife(push, shadow);
  for (const [k, o] of Object.entries(S.orchard)) {
    const i = +k, x = (i % MAP_W) * 16, y = ((i / MAP_W) | 0) * 16;
    if (x < cx - 40 || x > cx + VIEW_W + 40 || y < cy - 16 || y > cy + VIEW_H + 48) continue;
    const art = Art.fruitTrees[o.f];
    if (o.age < 4) { push(y + 14, art.sapling, x - 1, y - 5); continue; }
    if (o.age < TREE_GROW_DAYS) { push(y + 15, art.young, x - 5, y - 15); continue; }
    const sway = Math.round(Math.sin(now / 900 + i) * 0.75);
    shadow(Art.shadowTree, x - 5, y + 10);
    push(y + 15, art.trunk, x - 11, y - 30);
    push(y + 15.5, art.canopy, x - 11 + sway, y - 30);
    if (o.fruit) push(y + 15.6, art.fruits[Math.min(3, o.fruit)], x - 10 + sway, y - 29);
  }
  items.sort((a, b) => a.s - b.s);
  for (const it of items) blit(it.im, it.x, it.y);

  if (fishing) drawFishing(now, cx, cy);
  if (P.lift) {
    const k = Math.min(1, P.lift.t / 0.25);
    blit(Art.produce[P.lift.id], snap(P.px - cx), snap(P.py - cy) - 26 - Math.round(k * 4));
  }
  drawBirds(blit, cx, cy);
  placeBubbles(cx, cy);
  if (mode === 'play' && !UI.active() && !busy) drawTarget(now, cx, cy);

  for (const p of particles) {
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
    if (p.kind === 'heart') {
      ctx.globalAlpha = 1 - p.t / p.life;
      blit(Art.heart, x - 2, y);
      ctx.globalAlpha = 1;
    } else if (p.kind === 'leaf') {
      ctx.fillStyle = p.c;
      ctx.fillRect(x + Math.sin(p.t * 4) * 2, y, 1.5, 1);
    } else if (p.kind === 'smoke') {
      const s = Math.round(p.s + p.t * 3);
      ctx.fillStyle = `rgba(220,216,210,${0.6 * (1 - p.t / p.life)})`;
      ctx.fillRect(x, y, s, s);
    } else {
      ctx.fillStyle = p.c;
      ctx.fillRect(x, y, p.s, p.s);
    }
  }
  drawAmbience(now, cx, cy);
  drawFinish(now, cx, cy);
}

function drawFishing(now, cx, cy) {
  const f = fishing, d = DIRS[P.dir];
  const bx = f.x * 16 + 6 - cx, by = f.y * 16 + 6 - cy + Math.sin(now / 250) * 0.8 + (f.phase === 'bite' ? 2 : 0);
  const hx = P.px + 8 + d[0] * 6 - cx, hy = P.py + 6 + d[1] * 3 - cy;
  const tipX = hx + d[0] * 9 + (d[0] ? 0 : 5), tipY = hy - 10;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#8a5a32';
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo((tipX + bx) / 2, Math.max(tipY, by) + 4, bx + 2, by); ctx.stroke();
  const r = (now / 300) % 4;
  ctx.strokeStyle = `rgba(220,240,255,${0.7 - r * 0.15})`;
  ctx.beginPath(); ctx.ellipse(bx + 2, by + 4, 3 + r, 1 + r / 3, 0, 0, Math.PI * 2); ctx.stroke();
  blit(Art.bobber, bx, by);
  if (f.phase === 'bite') blit(Art.exclaim, P.px + 6 - cx, P.py - 24 - cy + Math.round(Math.sin(now / 60)));
}

/* ---------- light and atmosphere ---------- */
let motes = [];

function updateMotes(dt) {
  if (motes.length < 26) motes.push({ x: cam.x + Math.random() * VIEW_W, y: cam.y + Math.random() * VIEW_H, a: Math.random() * 6.28, p: Math.random() * 6.28 });
  for (const m of motes) {
    m.a += (Math.random() - 0.5) * 2 * dt;
    m.x += Math.cos(m.a) * 8 * dt;
    m.y += Math.sin(m.a) * 6 * dt - 2 * dt;
    if (m.x < cam.x - 20 || m.x > cam.x + VIEW_W + 20 || m.y < cam.y - 20 || m.y > cam.y + VIEW_H + 20) {
      m.x = cam.x + Math.random() * VIEW_W;
      m.y = cam.y + Math.random() * VIEW_H;
    }
  }
}

// Drifting leaves under the trees on screen.
function spawnLeaves() {
  const vis = World.trees.filter(t => t.x * 16 > cam.x && t.x * 16 < cam.x + VIEW_W && t.y * 16 > cam.y && t.y * 16 < cam.y + VIEW_H + 30);
  if (!vis.length) return;
  const t = vis[Math.floor(Math.random() * vis.length)];
  const col = t.kind === 4 ? ['#f8c2d4', '#f09cba'] : ['#73bd52', '#a6dc74', '#d9b03a'];
  particles.push({ x: t.x * 16 + Math.random() * 28 - 6, y: t.y * 16 - 22 + Math.random() * 10, vx: 5 + Math.random() * 5, vy: 7, g: 0, life: 3.5, t: 0, c: col[Math.floor(Math.random() * col.length)], s: 1, kind: 'leaf' });
}

function makeVignette() {
  const [c, g] = makeCanvas(VIEW_W, VIEW_H);
  const gr = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
  gr.addColorStop(0, 'rgba(10,8,20,0)');
  gr.addColorStop(1, 'rgba(10,8,20,0.38)');
  g.fillStyle = gr;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  return c;
}

function drawFinish(now, cx, cy) {
  const n = nightAmount(), rain = S.weather === 'rain', day = 1 - n;
  if (!rain && day > 0.3) {
    // soft slanted sun rays
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const x = ((now / 70 + k * 173) % (VIEW_W + 260)) - 60;
      const gr = ctx.createLinearGradient(x - 70, 0, x, 0);
      gr.addColorStop(0, 'rgba(255,240,200,0)');
      gr.addColorStop(0.5, `rgba(255,240,200,${0.06 * day})`);
      gr.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 36, 0); ctx.lineTo(x - 64, VIEW_H); ctx.lineTo(x - 100, VIEW_H);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (!rain) {
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const x = m.x - cx, y = m.y - cy, tw = (Math.sin(now / 350 + m.p) + 1) / 2;
      if (n > 0.4) { // fireflies
        const gr = ctx.createRadialGradient(x, y, 0, x, y, 4);
        gr.addColorStop(0, `rgba(220,255,120,${0.9 * tw * n})`);
        gr.addColorStop(1, 'rgba(220,255,120,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x - 4, y - 4, 8, 8);
      } else if (day > 0.6) { // pollen in the sunlight
        ctx.fillStyle = `rgba(255,255,230,${0.35 * tw})`;
        ctx.fillRect(x, y, 0.5, 0.5);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(vignette, 0, 0);
}

function drawTarget(now, cx, cy) {
  const [tx, ty] = targetTile();
  const a = getAction(tx, ty);
  if (!a) return;
  const o = Math.sin(now / 160) > 0 ? 1 : 0, L = 4;
  const x0 = tx * 16 - cx - o, y0 = ty * 16 - cy - o, x1 = tx * 16 - cx + 15 + o, y1 = ty * 16 - cy + 15 + o;
  const corners = (dx, dy) => {
    ctx.fillRect(x0 + dx, y0 + dy, L, 1); ctx.fillRect(x0 + dx, y0 + dy, 1, L);
    ctx.fillRect(x1 - L + 1 + dx, y0 + dy, L, 1); ctx.fillRect(x1 + dx, y0 + dy, 1, L);
    ctx.fillRect(x0 + dx, y1 + dy, L, 1); ctx.fillRect(x0 + dx, y1 - L + 1 + dy, 1, L);
    ctx.fillRect(x1 - L + 1 + dx, y1 + dy, L, 1); ctx.fillRect(x1 + dx, y1 - L + 1 + dy, 1, L);
  };
  ctx.fillStyle = 'rgba(30,20,10,0.5)';
  corners(1, 1);
  ctx.fillStyle = a.run ? '#ffffff' : 'rgba(255,255,255,0.45)';
  corners(0, 0);
}

function drawAmbience(now, cx, cy) {
  const n = nightAmount();
  const rain = S.weather === 'rain';
  if (!rain && n < 0.5) {
    for (const c of clouds) {
      const x = c.x - cx, y = c.y - cy;
      if (x + c.r < 0 || x - c.r > VIEW_W || y + c.r < 0 || y - c.r > VIEW_H) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, c.r);
      gr.addColorStop(0, 'rgba(20,40,30,0.09)');
      gr.addColorStop(1, 'rgba(20,40,30,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - c.r, y - c.r, c.r * 2, c.r * 2);
    }
    for (const b of butterflies) {
      const x = Math.round(b.x - cx), y = Math.round(b.y - cy);
      if (x < -4 || x > VIEW_W || y < -4 || y > VIEW_H) continue;
      const open = Math.sin(b.t * 18) > 0;
      ctx.fillStyle = b.c;
      if (open) { ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 1, y, 2, 2); } else { ctx.fillRect(x - 1, y - 1, 1, 2); ctx.fillRect(x + 1, y - 1, 1, 2); }
      ctx.fillStyle = '#3a2616';
      ctx.fillRect(x, y, 1, 2);
    }
  }
  if (rain) {
    ctx.fillStyle = 'rgba(30,50,80,0.2)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(190,220,255,0.55)';
    for (const d of rainDrops) {
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
      ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y) + 3, 1, 2);
    }
  }
  const t = S.time;
  if (t > 16.5 * 60 && t < 20 * 60) {
    ctx.fillStyle = `rgba(255,128,48,${Math.sin(Math.PI * (t - 16.5 * 60) / 210) * 0.15})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (n <= 0) return;
  const lights = [[P.px + 8 - cx, P.py + 6 - cy, 46, false]];
  for (const [x, y, r] of World.lights) lights.push([x - cx, y - cy, r, true]);
  lightCtx.setTransform(HD, 0, 0, HD, 0, 0);
  lightCtx.globalCompositeOperation = 'source-over';
  lightCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  lightCtx.fillStyle = `rgba(14,18,52,${0.62 * n})`;
  lightCtx.fillRect(0, 0, VIEW_W, VIEW_H);
  lightCtx.globalCompositeOperation = 'destination-out';
  for (const [x, y, r] of lights) {
    const gr = lightCtx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    lightCtx.fillStyle = gr;
    lightCtx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.drawImage(lightCanvas, 0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, warm] of lights) {
    if (!warm) continue;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
    gr.addColorStop(0, `rgba(255,180,80,${0.25 * n})`);
    gr.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- input: TV remote (via the Android app) and keyboard ---------- */
const DIR_OF = { down: 0, up: 1, left: 2, right: 3 };

function handleKey(k, down, repeat) {
  Sound.unlock();
  const d = DIR_OF[k];
  if (!down) {
    if (d !== undefined) input.dirs = input.dirs.filter(x => x !== d);
    if (k === 'ok') {
      const fire = input.okAt && !input.okHeld;
      input.okAt = 0;
      input.okHeld = false;
      if (fire && mode === 'play' && !busy && !UI.active()) doAction();
    }
    return;
  }
  if (busy) return;
  if (UI.active()) {
    if (!repeat || d !== undefined) UI.key(k);
    return;
  }
  if (mode !== 'play') return;
  if (fishing) {
    if (repeat) return;
    if (k === 'ok') fishingPress();
    else if (k === 'back' || d !== undefined) endFishing(null);
    return;
  }
  if (d !== undefined) {
    if (!input.dirs.includes(d)) input.dirs.push(d);
    if (!repeat) input.queued = d;
    return;
  }
  // Android repeats a held button's key-down, so a repeated OK means "held"
  if (k === 'ok' && repeat && input.okAt && !input.okHeld) { input.okHeld = true; openHandPicker(); return; }
  if (repeat) return;
  if (k === 'ok') { input.okAt = performance.now(); input.okHeld = false; }
  else if (k === 'back' || k === 'menu') openPauseMenu();
  else if (k === 'next' || k === 'prev') { cycleHand(k === 'next' ? 1 : -1); updateHud(); }
  else if (/^n\d$/.test(k)) {
    const h = handOptions()[+k[1] - 1];
    if (h) { S.hand = h; Sound.play('move'); updateHud(); }
  }
}

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', KeyE: 'ok',
  Escape: 'back', Backspace: 'back', KeyQ: 'back', GoBack: 'back', BrowserBack: 'back',
  Tab: 'menu', KeyM: 'menu', ContextMenu: 'menu',
  PageUp: 'prev', PageDown: 'next', BracketLeft: 'prev', BracketRight: 'next',
  Digit1: 'n1', Digit2: 'n2', Digit3: 'n3', Digit4: 'n4', Digit5: 'n5', Digit6: 'n6', Digit7: 'n7',
};

window.addEventListener('keydown', e => {
  const k = KEYS[e.code] || KEYS[e.key];
  if (!k) return;
  e.preventDefault();
  handleKey(k, true, e.repeat);
});
window.addEventListener('keyup', e => {
  const k = KEYS[e.code] || KEYS[e.key];
  if (!k) return;
  e.preventDefault();
  handleKey(k, false, false);
});

// Called by the Android TV app (see MainActivity.java).
window.tvKey = (k, down, repeat) => handleKey(k, down, repeat);
window.tvPause = () => { saveGame(); Store.flush(); Sound.pause(); };
window.tvResume = () => Sound.resume();
document.addEventListener('visibilitychange', () => (document.hidden ? window.tvPause() : window.tvResume()));

function init() {
  buildArt();
  buildWorld();
  layoutStructures();
  try { Object.assign(Sound.settings, JSON.parse(Store.get('sunpatch-settings') || '{}')); } catch (e) { /* defaults */ }
  S = loadSave() || newState();
  resetScene();
  initAmbience();
  vignette = makeVignette();
  setupTouch();
  openTitle();
  requestAnimationFrame(loop);
  connectCloudSave();
}

init();
