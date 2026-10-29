'use strict';
/* Navdeep's Farm - pasture animals, Sheru the dog, Billu the cat, ducks and birds. */

let herd = [];      // pasture animals on screen
let dog = null;
let ducks = [];
let birds = [];
let birdTimer = 15;
const CAT_SPOT = { x: 6, y: 6 };

const tileOf = (x, y, w, h) => [Math.floor((x + w / 2) / TILE), Math.floor((y + h) / TILE)];

/* ---------- pasture animals ---------- */
function makeAnimalEnt(ref, n) {
  const p = World.pasture;
  const tx = p.x0 + 4 + ((n * 3) % (p.x1 - p.x0 - 4)), ty = p.y0 + 2 + (n % 4);
  return { ref, x: tx * TILE - 3, y: ty * TILE - 2, gx: 0, gy: 0, state: 'idle', timer: Math.random() * 3, face: n % 2 ? -1 : 1, frame: 0, anim: Math.random(), inside: false };
}

function animalTile(a) { return tileOf(a.x, a.y, 22, 14); }

function animalAt(x, y) {
  return herd.find(a => { if (a.inside) return false; const [ax, ay] = animalTile(a); return ax === x && ay === y; }) || null;
}

function updateHerd(dt) {
  const night = S.time >= 20 * 60, p = World.pasture;
  for (const a of herd) {
    if (a.inside) continue;
    a.anim += dt;
    if (night && a.state !== 'home') { a.state = 'home'; a.gx = World.barnDoor.x * TILE - 3; a.gy = World.barnDoor.y * TILE - 6; }
    if (a.state === 'idle' || a.state === 'graze') {
      a.timer -= dt;
      if (a.timer <= 0) {
        if (a.state === 'idle' && Math.random() < 0.55) { a.state = 'graze'; a.timer = 2 + Math.random() * 3; }
        else {
          let tx, ty, tries = 0;
          do {
            tx = p.x0 + Math.floor(Math.random() * (p.x1 - p.x0 + 1));
            ty = p.y0 + Math.floor(Math.random() * (p.y1 - p.y0 + 1));
          } while (World.structAt[idx(tx, ty)] >= 0 && tries++ < 20);
          a.gx = tx * TILE - 3;
          a.gy = ty * TILE - 2;
          a.state = 'walk';
        }
      }
    }
    if (a.state === 'walk' || a.state === 'home') {
      const dx = a.gx - a.x, dy = a.gy - a.y, d = Math.hypot(dx, dy);
      if (d < 1) {
        if (a.state === 'home') a.inside = true;
        a.state = 'idle';
        a.timer = 1 + Math.random() * 3;
      } else {
        const sp = a.state === 'home' ? 20 : 10;
        a.x += (dx / d) * Math.min(d, sp * dt);
        a.y += (dy / d) * Math.min(d, sp * dt);
        if (Math.abs(dx) > 0.5) a.face = dx < 0 ? -1 : 1;
      }
    }
    a.frame = a.state === 'graze' ? 2 : a.state === 'idle' ? 0 : Math.floor(a.anim * 4) % 2;
  }
}

/* ---------- Sheru the dog follows Bambi around ---------- */
function resetPets() {
  dog = { x: P.px + 18, y: P.py + 4, face: 1, frame: 0, path: [], think: 0, anim: 0 };
  ducks = [];
  const water = [];
  for (let i = 0; i < N_TILES; i++) if (World.ground[i] === G_WATER) water.push(i);
  for (let k = 0; k < 3; k++) {
    const i = water[(k * 5 + 3) % water.length];
    ducks.push({ x: (i % MAP_W) * TILE + 4, y: ((i / MAP_W) | 0) * TILE + 6, gx: 0, gy: 0, timer: k, face: k % 2 ? -1 : 1, anim: k, water });
  }
}

const dogTile = () => tileOf(dog.x, dog.y, 14, 9);

function updateDog(dt) {
  dog.anim += dt;
  const [dx, dy] = dogTile();
  const far = Math.abs(dx - P.tx) + Math.abs(dy - P.ty);
  if (far > 14) { dog.x = P.px + 1; dog.y = P.py + 4; dog.path = []; return; }
  dog.think -= dt;
  if (dog.think <= 0) {
    dog.think = 0.4;
    dog.path = [];
    if (far > 2) {
      const r = findPath(dx, dy, (x, y) => Math.abs(x - P.tx) + Math.abs(y - P.ty) === 1);
      if (r) dog.path = r.path;
    }
  }
  if (dog.path.length) {
    const [nx, ny] = dog.path[0];
    const tx = nx * TILE + 1, ty = ny * TILE + 4;
    const ddx = tx - dog.x, ddy = ty - dog.y, d = Math.hypot(ddx, ddy);
    if (d < 1.5) dog.path.shift();
    else {
      dog.x += (ddx / d) * Math.min(d, 75 * dt);
      dog.y += (ddy / d) * Math.min(d, 75 * dt);
      if (Math.abs(ddx) > 0.5) dog.face = ddx < 0 ? -1 : 1;
    }
    dog.frame = Math.floor(dog.anim * 8) % 2;
  } else dog.frame = Math.floor(dog.anim * 3) % 2; // tail wag
}

function petAt(x, y) {
  const [dx, dy] = dog ? dogTile() : [-1, -1];
  if (dx === x && dy === y) return { label: 'Pet Sheru the dog', run: () => { fx('heart', dog.x + 7, dog.y); Sound.play('woof'); toast('Sheru wags his tail. Good boy!', 'good', 'dog'); } };
  if (x === CAT_SPOT.x && y === CAT_SPOT.y) return { label: 'Pet Billu the cat', run: () => { fx('heart', x * TILE + 8, y * TILE + 4); Sound.play('meow'); toast('Billu purrs happily.', 'good', 'happy'); } };
  return null;
}

/* ---------- ducks and birds ---------- */
function updateDucks(dt) {
  for (const d of ducks) {
    d.anim += dt;
    d.timer -= dt;
    if (d.timer <= 0) {
      const i = d.water[Math.floor(Math.random() * d.water.length)];
      d.gx = (i % MAP_W) * TILE + 3;
      d.gy = ((i / MAP_W) | 0) * TILE + 5;
      d.timer = 4 + Math.random() * 5;
    }
    const dx = d.gx - d.x, dy = d.gy - d.y, dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      d.x += (dx / dist) * Math.min(dist, 6 * dt);
      d.y += (dy / dist) * Math.min(dist, 6 * dt);
      if (Math.abs(dx) > 0.3) d.face = dx < 0 ? -1 : 1;
    }
  }
}

function updateBirds(dt) {
  birdTimer -= dt;
  if (birdTimer <= 0 && S.weather !== 'rain' && S.time < 19 * 60) {
    birdTimer = 25 + Math.random() * 30;
    const dir = Math.random() < 0.5 ? 1 : -1, y = cam.y + 20 + Math.random() * 120;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) birds.push({ x: cam.x + (dir > 0 ? -20 - k * 9 : VIEW_W + 20 + k * 9), y: y + (k % 2) * 7 + k * 2, vx: dir * (55 + Math.random() * 10), anim: Math.random() });
  }
  for (const b of birds) { b.x += b.vx * dt; b.anim += dt; }
  birds = birds.filter(b => b.x > cam.x - 80 && b.x < cam.x + VIEW_W + 80);
}

function updateLife(dt) {
  if (!S) return;
  updateHerd(dt);
  if (dog) updateDog(dt);
  updateDucks(dt);
  updateBirds(dt);
}

// Adds every animal to the sorted draw list.
function pushLife(push, shadow) {
  for (const a of herd) {
    if (a.inside) continue;
    shadow(Art.shadowSmall, a.x + 6, a.y + 13);
    push(a.y + 15, Art.animals[a.ref.type][a.face > 0 ? 1 : 0][a.frame], a.x - 1, a.y - 1);
  }
  if (dog) {
    shadow(Art.shadowSmall, dog.x + 1, dog.y + 7);
    push(dog.y + 10, Art.dog[dog.face > 0 ? 1 : 0][dog.frame], dog.x - 1, dog.y - 1);
  }
  const night = S.time >= 20 * 60 || S.time < 9 * 60;
  push(CAT_SPOT.y * TILE + 12, Art.cat[night ? 1 : 0], CAT_SPOT.x * TILE + 1, CAT_SPOT.y * TILE + 4);
  for (const d of ducks) {
    const bob = Math.round(Math.sin(d.anim * 2) * 0.6);
    push(d.y + 6, Art.duck[d.face > 0 ? 1 : 0][Math.sin(d.anim * 0.7) > 0.9 ? 1 : 0], d.x - 1, d.y - 1 + bob);
  }
}

function drawBirds(blit, cx, cy) {
  for (const b of birds) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(b.x - cx + 1, b.y - cy + 40, 5, 2);
    blit(Art.bird[Math.floor(b.anim * 6) % 2], b.x - cx, b.y - cy);
  }
}
