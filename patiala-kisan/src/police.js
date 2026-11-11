// The Police Station and the thief who visits your godown now and then.
// Rules and saving live in crime.js; this file is the building, the officers, the thief's run,
// the investigation clock and the short confrontation. The desk dialogue is in ui.js.
import * as THREE from 'three';
import { Builder, vcMaterialCut, textTexture } from './geo.js';
import { Walker } from './market.js';
import { POLICE, ITEMS } from './config.js';
import { POS } from './world.js';
import { rollTheft, theftBlocked, advanceCases, activeCase, resolveCase, fileReport, caseValue, caseCount } from './crime.js';

const [SX, SZ] = POLICE.spot;
const W = (lx, lz) => [SX + lx, SZ + lz];
const CREAM = 0xefe4c6, BLUE = 0x1c3f94, KHAKI = 0xd2b48c, ROOF = 0x8a3f27;
export const DESK = [0, 4.0], PAD = [0, 6.4], CELL = [6.4, 0.2], YARD = [2.6, 7.0];
const _v = new THREE.Vector3();
const OFFICER = { turban: BLUE, shirt: KHAKI, pants: 0xc2a878, vest: 0x1d3557 };

function jeep(b, x, z, ry) {
  b.push(x, 0, z, ry);
  b.rbox(0xf4f4f0, { y: 0.75, sx: 1.9, sy: 0.7, sz: 3.6 }, 0.1);
  b.rbox(BLUE, { y: 0.75, sx: 1.93, sy: 0.18, sz: 3.62 }, 0.04);
  b.rbox(0xf4f4f0, { y: 1.3, z: -0.3, sx: 1.7, sy: 0.55, sz: 1.9 }, 0.1);
  b.rbox(0x5aa9d8, { y: 1.32, z: 0.65, sx: 1.55, sy: 0.4, sz: 0.06, rx: -0.35 }, 0.02);
  for (const s of [-1, 1]) for (const zz of [-1.2, 1.2]) { b.cyl(0x1d1d1f, { x: s * 0.95, y: 0.36, z: zz, sy: 0.3, rz: Math.PI / 2 }, 0.38, 0.38, 14); b.cyl(0xc8ced4, { x: s * 1.0, y: 0.36, z: zz, sy: 0.3, rz: Math.PI / 2 }, 0.2, 0.2, 10); }
  b.rbox(0x1c7ed6, { x: -0.3, y: 1.7, z: -0.3, sx: 0.5, sy: 0.18, sz: 0.28 }, 0.04); b.rbox(0xe03131, { x: 0.3, y: 1.7, z: -0.3, sx: 0.5, sy: 0.18, sz: 0.28 }, 0.04);
  b.sph(0xfff3b0, { x: -0.6, y: 0.85, z: 1.82, s: 0.22, ao: false }, 6, 5); b.sph(0xfff3b0, { x: 0.6, y: 0.85, z: 1.82, s: 0.22, ao: false }, 6, 5);
  b.pop();
}

export function buildPolice(game) {
  const { scene } = game;
  const b = new Builder(0.04, { ao: 0.28, aoH: 0.9 });
  const rect = (lx, lz, w, d) => { const [x, z] = W(lx, lz); game.colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }); };
  const circ = (lx, lz, r) => { const [x, z] = W(lx, lz); game.colliders.push({ x, z, r }); };
  b.push(SX, 0, SZ);
  // yard paving and the main block with a gable roof
  b.rbox(0xcfc7b6, { y: 0.03, z: 4.2, sx: 12, sy: 0.06, sz: 9 }, 0.02);
  b.rbox(CREAM, { y: 1.7, sx: 9, sy: 3.4, sz: 5.6 }, 0.1);
  b.rbox(BLUE, { y: 0.45, z: 0, sx: 9.04, sy: 0.9, sz: 5.64 }, 0.06);
  b.rbox(0x9a7b4f, { y: 3.45, sx: 9.5, sy: 0.16, sz: 6.1 }, 0.03);
  b.prism(ROOF, { y: 3.5, sx: 9.8, sy: 1.5, sz: 6.4 });
  b.rbox(0x5a3418, { y: 1.1, z: 2.82, sx: 1.4, sy: 2.2, sz: 0.08 }, 0.03);
  for (const s of [-1, 1]) {
    b.rbox(0x8cc5ec, { x: s * 2.9, y: 1.9, z: 2.82, sx: 1.3, sy: 1.0, sz: 0.06 }, 0.02);
    for (let i = 0; i < 5; i++) b.cyl(0x2e3236, { x: s * 2.9 - 0.52 + i * 0.26, y: 1.9, z: 2.9, sy: 1.0 }, 0.015, 0.015, 4);
    b.rbox(0x8cc5ec, { x: s * 3.6, y: 1.9, z: -2.82, sx: 1.3, sy: 1.0, sz: 0.06 }, 0.02);
  }
  // the veranda: a lean-to roof on pillars, the reception desk and a bench for waiting
  b.rbox(0x9a7b4f, { y: 2.6, z: 3.5, sx: 7.4, sy: 0.14, sz: 1.5, rx: 0.08 }, 0.03);
  for (const x of [-3.5, -1.2, 1.2, 3.5]) { b.cyl(CREAM, { x, y: 1.3, z: 4.25, sy: 2.6 }, 0.14, 0.18, 8); }
  for (let i = 0; i < 6; i++) b.box(i % 2 ? 0xffffff : BLUE, { x: -3.55 + 0.6 + i * 1.2, y: 2.38, z: 4.3, sx: 1.2, sy: 0.36, sz: 0.04, ao: false });
  b.rbox(0x7a4a24, { x: DESK[0], y: 0.5, z: DESK[1], sx: 2.8, sy: 1.0, sz: 0.8 }, 0.05);
  b.rbox(0xa8723f, { x: DESK[0], y: 1.04, z: DESK[1], sx: 3.0, sy: 0.08, sz: 1.0 }, 0.03);
  b.rbox(0xffffff, { x: -0.7, y: 1.12, z: DESK[1] + 0.05, sx: 0.5, sy: 0.04, sz: 0.36 }, 0.01);   // register book
  b.cyl(0x2e3236, { x: 0.8, y: 1.18, z: DESK[1] + 0.1, sy: 0.16 }, 0.05, 0.07, 8); b.cyl(0xe03131, { x: 0.8, y: 1.28, z: DESK[1] + 0.1, sy: 0.05 }, 0.04, 0.04, 8);
  b.rbox(0x7a4a24, { x: -3.2, y: 0.4, z: 3.8, sx: 0.5, sy: 0.08, sz: 1.6 }, 0.03); for (const z of [3.2, 4.4]) b.rbox(0x5a3418, { x: -3.2, y: 0.2, z, sx: 0.4, sy: 0.4, sz: 0.08 }, 0.02);
  // sign over the door, a flagpole, a noticeboard
  b.rbox(BLUE, { y: 3.15, z: 2.9, sx: 4.6, sy: 0.7, sz: 0.2 }, 0.04);
  b.cyl(0xc8ced4, { x: 4.9, y: 3.0, z: 5.0, sy: 6.0 }, 0.05, 0.08, 6); b.cyl(0x6b6b6b, { x: 4.9, y: 0.15, z: 5.0, sy: 0.3 }, 0.28, 0.32, 8);
  for (const [i, c] of [0xff9933, 0xffffff, 0x138808].entries()) b.box(c, { x: 5.55, y: 5.7 - i * 0.28, z: 5.0, sx: 1.2, sy: 0.3, sz: 0.03, ao: false });
  b.cyl(0x000080, { x: 5.55, y: 5.42, z: 5.04, sy: 0.02, rx: Math.PI / 2 }, 0.1, 0.1, 10);
  b.rbox(0x2f5d8a, { x: -6, y: 1.3, z: 5.4, sx: 1.5, sy: 1.0, sz: 0.1 }, 0.03); for (const x of [-6.6, -5.4]) b.cyl(0x6b6b6b, { x, y: 0.5, z: 5.4, sy: 1.0 }, 0.04, 0.04, 5);
  // the lock-up on the east side: a barred cage you can see into
  b.rbox(0xb9ad94, { x: 6.4, y: 1.5, z: -0.9, sx: 3.6, sy: 3.0, sz: 0.3 }, 0.04);
  b.rbox(0xb9ad94, { x: 8.1, y: 1.5, z: 0.3, sx: 0.3, sy: 3.0, sz: 2.7 }, 0.04);
  b.rbox(0xb9ad94, { x: 4.7, y: 1.5, z: 0.3, sx: 0.3, sy: 3.0, sz: 2.7 }, 0.04);
  b.rbox(0x9a7b4f, { x: 6.4, y: 3.1, z: 0.3, sx: 4.0, sy: 0.2, sz: 3.0 }, 0.04);
  b.rbox(0xe8dfcb, { x: 6.4, y: 0.06, z: 0.3, sx: 3.4, sy: 0.1, sz: 2.6 }, 0.02);
  for (let i = 0; i < 14; i++) b.cyl(0x2e3236, { x: 4.9 + i * 0.235, y: 1.5, z: 1.6, sy: 3.0 }, 0.03, 0.03, 5);
  b.box(0x2e3236, { x: 6.4, y: 3.0, z: 1.6, sx: 3.5, sy: 0.08, sz: 0.08 }); b.box(0x2e3236, { x: 6.4, y: 0.1, z: 1.6, sx: 3.5, sy: 0.08, sz: 0.08 });
  b.rbox(0x7a7a72, { x: 7.4, y: 0.4, z: -0.3, sx: 1.0, sy: 0.12, sz: 1.5 }, 0.03);                // cot
  const cellSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਹਵਾਲਾਤ  LOCK-UP', size: 46 }], { w: 512, h: 112, bg: '#3a3a42' }) }));
  const [cx, cz] = W(6.4, 1.75); cellSign.position.set(cx, 3.55, cz); scene.add(cellSign);
  jeep(b, -8.2, 3.2, 0.25);
  b.pop();
  rect(0, 0, 9, 5.6); rect(6.4, 0.2, 3.8, 3.0); rect(-8.2, 3.2, 2.2, 3.8);
  for (const x of [-3.5, -1.2, 1.2, 3.5]) circ(x, 4.25, 0.2);
  circ(4.9, 5.0, 0.35); rect(0, DESK[1], 3.0, 1.0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.62), new THREE.MeshBasicMaterial({ map: textTexture([{ text: 'ਪੁਲਿਸ ਥਾਣਾ  ·  POLICE STATION', size: 44 }], { w: 1024, h: 148, bg: '#1c3f94', border: '#ffffff' }) }));
  const [sx, sz] = W(0, 3.02); sign.position.set(sx, 3.15, sz); sign.rotation.x = -0.1; scene.add(sign);
  // a beacon on the roof ridge: blue and red, it flashes while there is a case to deal with
  const beacon = new THREE.Group();
  const bm = (c) => new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: c }));
  const bl = bm(0x2f7bff), rd = bm(0xff3b30); bl.position.x = -0.22; rd.position.x = 0.22;
  beacon.add(bl, rd); beacon.position.set(...[SX, 5.15, SZ]); scene.add(beacon);
  const stat = b.meshChunks(22, vcMaterialCut);
  scene.add(stat);
  game.seeThrough?.add(stat);
  game.glows.push([SX - 1.2, 2.4, SZ + 3.7, 1.1], [SX + 1.2, 2.4, SZ + 3.7, 1.1], [SX + 6.4, 2.6, SZ + 0.5, 1.2], [SX, 5.3, SZ, 1.0]);
  return { beacon, bl, rd };
}

export class Police {
  constructor(game) {
    this.game = game;
    this.parts = buildPolice(game);
    this.officer = new Walker(game, OFFICER);
    this.officer.pos.set(SX + DESK[0] + 2.2, 0, SZ + DESK[1] + 0.2);          // stands at the end of the desk where the camera sees him
    this.officer.face(0); this.officer.update(0.01);
    this.guard = new Walker(game, { ...OFFICER, turban: 0x111111 });
    this.guard.pos.set(SX - 3, 0, SZ + 8.2); this.guard.maxSpeed = 1.2;
    this.guardLeg = 0;
    this.prisoner = null;           // the caught thief, standing in the lock-up
    this.thief = null;              // the thief running about during a theft
    this.fight = null;
    this.t = 0;
    this.labelO = game.labels.add(() => '👮 Inspector Sandhu', () => _v.set(SX + DESK[0] + 2.2, 2.55, SZ + DESK[1] + 0.2), 'mgr', 18);
    this.labelS = game.labels.add(() => this.stationTag(), () => _v.set(SX, 4.6, SZ + 3), 'bubble', 22);
    game.actions.add({ label: () => '🚓 Police Station', x: SX + PAD[0], z: SZ + PAD[1], r: 2.3, visible: () => !game.visit, onPress: () => this.openDesk() });
    this.pad = game.pads.add({ x: SX + PAD[0], z: SZ + PAD[1], r: 1.1, color: 0x4d79ff, label: () => '🚓 Police Station', visible: () => !game.visit && game.state.level >= POLICE.level, onStay: () => {} });
    this.sync(true);
  }
  get st() { return this.game.state; }
  get cases() { return this.st.police.cases; }

  stationTag() {
    const c = activeCase(this.st);
    if (!c || this.game.visit) return '';
    if (c.status === 'open') return '🚨 Report the theft here!';
    if (c.status === 'reported') return `🔎 Investigating… ${this.mins(c)}`;
    return '👮 Thief caught! Come and decide';
  }
  mins(c) { const s = Math.max(0, Math.ceil((c.due - Date.now()) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  openDesk() {
    const g = this.game;
    if (this.st.level < POLICE.level) { g.ui.toast(`🔒 The police station opens at level ${POLICE.level}`); return; }
    g.ui.pStep = 'greet';
    g.ui.open('police');
    this.officer.h.expr?.('smile', 2);
  }

  // ---------- the investigation clock runs on the real clock, also while the game is closed
  sync(quiet = false) {
    const caught = advanceCases(this.st);
    if (caught.length && !quiet) this.announceCaught(caught[0]);
    const c = activeCase(this.st);
    const want = c?.status === 'caught' ? c : null;
    if (want && !this.prisoner) this.addPrisoner(want);
    if (!want && this.prisoner) this.removePrisoner();
    if (caught.length && quiet) setTimeout(() => this.announceCaught(caught[0]), 1500);
  }
  announceCaught(c) {
    const g = this.game;
    g.audio.play('tring');
    g.ui.toast(`🚓 ${c.thief.name} the thief has been caught! Visit the Police Station`, 5);
    g.guide.set('police', true);
    g.save(true);
  }
  addPrisoner(c) {
    const g = this.game;
    this.prisoner = new Walker(g, { turban: 0x4a4a4a, shirt: 0x6b6b6b, pants: 0x3a3a3a, vest: 0x222222 });
    this.prisoner.pos.set(SX + CELL[0], 0, SZ + CELL[1]); this.prisoner.face(0);
    this.prisoner.label = g.labels.add(() => `🥷 ${c.thief.name} — ${c.thief.tag}`, () => _v.set(this.prisoner.pos.x, 2.5, this.prisoner.pos.z), 'mgr', 20);
    this.prisoner.h.expr?.('sad', 99);
  }
  removePrisoner() {
    const p = this.prisoner; if (!p) return;
    p.remove(); this.game.labels.remove(p.label); this.prisoner = null;
  }

  // ---------- a theft: the thief comes in from the east, takes the goods from the godown and runs
  check(dt) {
    const g = this.game, st = this.st;
    if (g.visit || st.level < POLICE.level || this.thief || g.simulating) return;
    st.police.t += dt;
    if (st.police.t < POLICE.every) return;
    // not while a menu, a modal, the Gurdwara or a fight is going on: try again soon
    if (g.ui.view || !$('modal').hidden || g.guru.inside || this.fight || g.player.vehicle) { st.police.t = POLICE.every - 15; return; }
    st.police.t = 0;
    const c = rollTheft(st);
    if (c) this.startRun(c);
  }
  startRun(c) {
    const g = this.game;
    this.thief = { c, state: 'in', t: 0, w: new Walker(g, { turban: 0x2a2a2a, shirt: 0x3d3d46, pants: 0x2a2a2a, vest: 0x111111 }) };
    const w = this.thief.w;
    w.pos.set(POS.godownPad[0] + 22, 0, POS.godownPad[1] + 6); w.maxSpeed = 5.2;
    w.goto(POS.godownPad[0] + 0.6, POS.godownPad[1] + 0.3);
    this.thief.label = g.labels.add(() => '🥷 Chor!', () => _v.set(w.pos.x, 2.5, w.pos.z), 'bubble', 40);
    g.audio.play('tring');
    g.save(true);
  }
  updateThief(dt) {
    const T = this.thief; if (!T) return;
    const g = this.game, w = T.w;
    T.t += dt;
    const arrived = w.update(dt, T.state === 'grab' ? (T.t * 3) % 1 : 0);
    if (T.state === 'in' && arrived) {
      T.state = 'grab'; T.t = 0;
      let n = 0;
      for (const [k, q] of Object.entries(T.c.items)) for (let i = 0; i < Math.min(q, 6) && n < 14; i++, n++) setTimeout(() => g.flyers.add(k, new THREE.Vector3(POS.godown[0], 1.2, POS.godown[1] + 2), () => w.pos.clone().setY(1.3), 0.45), n * 70);
      g.audio.play('pop');
    } else if (T.state === 'grab' && T.t > 1.3) {
      T.state = 'out'; T.t = 0;
      w.maxSpeed = 7; w.goto(POS.godownPad[0] + 30, POS.godownPad[1] - 14);
      this.incident(T.c);
    } else if (T.state === 'out' && (arrived || T.t > 8)) {
      w.remove(); g.labels.remove(T.label); this.thief = null;
    }
  }
  // the player is told, in words, exactly what was taken
  incident(c) {
    const g = this.game, ui = g.ui;
    g.audio.play('womp');
    const lines = Object.entries(c.items).map(([k, q]) => `<li>${ITEMS[k].icon} ${q} × ${ITEMS[k].name}</li>`).join('');
    ui.modal(`<div class="big">🥷</div><h2>Chor! A thief struck</h2><p>Someone sneaked into your godown and made off with ${caseCount(c)} items (about ₹${Math.round(caseValue(c)).toLocaleString('en-IN')}):</p><ul class="unl scroll">${lines}</ul><p>The goods are safe in the case file. Report it at the Police Station 🚓 and the police will go after the thief.</p>`, 'Chalo, report it');
    g.guide.set('police', true);
    g.ui.toast(`🥷 Theft! ${caseCount(c)} items taken. Report it at the Police Station`, 4);
    g.save(true);
  }

  // ---------- the desk: filing the report
  report(id) {
    const g = this.game;
    const c = fileReport(this.st, id);
    if (!c) return null;
    g.audio.play('bell');
    g.save(true);
    return c;
  }

  // ---------- after the catch: forgive, let the police deal with it, or face the thief
  settle(id, option) {
    const g = this.game, st = this.st;
    const res = resolveCase(st, id, option);
    if (!res.ok) return res;
    if (res.xp) g.addXP(res.xp);
    g.carryDirty = true;
    g.emit('caseClosed', { option });
    g.audio.play(option === 'forgive' ? 'bless' : 'yay');
    g.ui.money(); g.ui.soul?.();
    this.sync(true);
    g.save(true);
    return res;
  }

  // The confrontation: a timing bar, three hits to win. The goods come back either way.
  startFight(id) {
    const g = this.game, c = this.cases.find((x) => x.id === id);
    if (!c || c.status !== 'caught' || this.fight) return;
    g.ui.close();
    const p = this.prisoner;
    if (!p) this.addPrisoner(c);
    const th = this.prisoner;
    th.pos.set(SX + YARD[0], 0, SZ + YARD[1]); th.face(-Math.PI / 2);
    g.player.frozen = true; g.player.pos.set(SX + YARD[0] - 2.1, 0, SZ + YARD[1]); g.player.rot = Math.PI / 2;
    th.h.expr?.('angry', 99);
    this.fight = { id, hp: 3, t: 0, limit: 16, needle: 0, over: false };
    const bar = this.fightBar();
    bar.hidden = false; $('action').hidden = true;
    this.say('Oye! Chhad de mainu!', th);
  }
  fightBar() {
    let el = $('fightBar');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'fightBar'; el.className = 'placebar fightbar'; el.hidden = true;
    el.innerHTML = '<span id="fightInfo"></span><div class="meter"><i id="fightGreen"></i><b id="fightNeedle"></b></div><div class="hp" id="fightHp"></div><div class="row2"><button id="fightHit" class="btn">👊 Dhakka!</button></div>';
    $('hud').appendChild(el);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    $('fightHit').addEventListener('click', (e) => { e.stopPropagation(); this.punch(); });
    return el;
  }
  say(text, who = this.prisoner) {
    const g = this.game;
    if (this.bubble) g.labels.remove(this.bubble);
    this.bubble = g.labels.add(text, () => _v.set(who.pos.x, 3.1, who.pos.z), 'bubble', 30);
    clearTimeout(this.bubbleT);
    this.bubbleT = setTimeout(() => { g.labels.remove(this.bubble); this.bubble = null; }, 1700);
  }
  punch() {
    const F = this.fight, g = this.game;
    if (!F || F.over) return;
    g.player.punchT = 0.3;
    const hit = Math.abs(F.needle - 0.5) < 0.17;
    const th = this.prisoner;
    if (hit) {
      F.hp--; g.audio.play('pop'); g.fx.sparkle(th.pos.x, 1.4, th.pos.z, 0xffffff, 8);
      th.pos.x += 0.35; th.hitT = 0.3;
      this.say(['Hai! Maaf karo!', 'Baas! Baas!', 'Meri kamar!', 'Sorry ji sorry!'][F.hp] || 'Aiii!');
    } else { g.audio.play('error'); this.say('Ha ha, chook gaya! 😏'); th.pos.x -= 0.25; th.hitT = 0.2; }
    if (F.hp <= 0) this.endFight(true);
  }
  endFight(won) {
    const F = this.fight, g = this.game;
    if (!F || F.over) return;
    F.over = true;
    this.fightBar().hidden = true;
    g.player.frozen = false;
    const th = this.prisoner;
    th.h.expr?.('sad', 99);
    const id = F.id;
    this.fight = null;
    // win: a punch-up settled; time up: the police step in. Either way the goods come back once.
    const res = this.settle(id, won ? 'confront' : 'police');
    g.ui.pStep = 'result'; g.ui.pResult = { ...res, option: won ? 'confront' : 'police', timeout: !won };
    g.ui.open('police');
  }
  update(dt, t) {
    const g = this.game;
    this.t += dt;
    // patrol: the guard paces the yard
    this.guardT = (this.guardT || 0) - dt;
    if (this.guardT <= 0 && !this.fight) { this.guardT = 4 + Math.random() * 2; this.guardLeg ^= 1; this.guard.goto(SX + (this.guardLeg ? 3.2 : -3.4), SZ + 8.2); }
    this.guard.update(dt);
    this.officer.update(dt);
    if (this.prisoner) {
      const p = this.prisoner;
      if (p.hitT > 0) { p.hitT -= dt; if (p.hitT <= 0 && this.fight) p.pos.x += (SX + YARD[0] - p.pos.x) * 0.5; }
      p.update(dt);
    }
    this.check(dt);
    this.updateThief(dt);
    // the clock: investigations end, the beacon flashes while there is something to do
    this.syncT = (this.syncT || 0) - dt;
    if (this.syncT <= 0) { this.syncT = 1; if (!g.visit) this.sync(); }
    const c = activeCase(this.st), alert = !!c && !g.visit;
    const k = Math.floor(this.t * 3) % 2;
    this.parts.bl.visible = alert ? !!k : true; this.parts.rd.visible = alert ? !k : true;
    // the fight bar
    const F = this.fight;
    if (F) {
      F.t += dt; F.needle = 0.5 + Math.sin(F.t * 3.6) * 0.5;
      $('fightNeedle').style.left = `${F.needle * 100}%`;
      $('fightInfo').textContent = `👮 ${this.cases.find((x) => x.id === F.id)?.thief.name}: hit when the needle is in the green!  ${Math.max(0, Math.ceil(F.limit - F.t))}s`;
      $('fightHp').textContent = '❤️'.repeat(F.hp) + '🖤'.repeat(3 - F.hp);
      if (F.t >= F.limit) this.endFight(false);
    }
  }
}
const $ = (id) => document.getElementById(id);
export { theftBlocked };
