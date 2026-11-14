// Tube wells you switch on and off: the motor hums up, water gushes from the pipe into the
// chubacha with splashes, overflows into a puddle and darkens the ground, and runs down the
// khaal (irrigation channel) to the fields, where it waters every dry seed it reaches. Switch it
// off and the stream stops, the channel drains and the ground slowly dries.
// Well 1 is the old one by the farmhouse (its khaal is dug for a fee); well 2 serves Navi Zameen.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { enhance, waterMaterial } from './shading.js';
import { POS } from './world.js';
import { FIELDS, TUBEWELLS } from './config.js';

const BRICK = 0xb4583a, MUD = 0x6b4a2e;

export class Tubewells {
  constructor(game) {
    this.game = game;
    this.wells = TUBEWELLS.map((W, i) => this.build(W, i));
    this.hum = null;
  }
  get st() { return this.game.state.pump; }
  build(W, i) {
    const g = this.game, scene = g.scene, b = new Builder(0.03, { ao: 0.2, aoH: 0.8 });
    const w = { cfg: W, i, fill: 0, puddle: 0, spin: 0, segs: [], len: 0 };
    let tx, tz;
    if (i === 0) { [tx, tz] = POS.tank; w.stream = g.tubewellStream; w.spout = g.tubewellSpout.clone(); }
    else {
      // a second kotha and chubacha in Navi Zameen
      const [x, z] = W.kotha; [tx, tz] = W.tank;
      b.rbox(BRICK, { x, y: 1.1, z, sx: 2.4, sy: 2.2, sz: 2.2 }, 0.05); b.rbox(0xc9b9a0, { x, y: 2.28, z, sx: 2.7, sy: 0.16, sz: 2.5 }, 0.04);
      b.rbox(0x2f6fb0, { x: x - 0.5, y: 0.9, z: z - 1.12, sx: 0.8, sy: 1.6, sz: 0.05 }, 0.02); b.rbox(0x868e96, { x: x + 0.7, y: 1.8, z: z - 1.12, sx: 0.5, sy: 0.6, sz: 0.1 }, 0.03);
      b.cyl(0xa3a39c, { x: x + 1.6, y: 2.6, z: z + 0.8, sy: 5.2 }, 0.06, 0.1, 6);
      b.rbox(BRICK, { x: tx, y: 0.36, z: tz, sx: 2.1, sy: 0.72, sz: 1.4 }, 0.05); b.rbox(0xc9b9a0, { x: tx, y: 0.74, z: tz, sx: 2.2, sy: 0.06, sz: 1.5 }, 0.02);
      b.cyl(0x6c7178, { x: tx - 0.3, y: 1.05, z: tz - 0.7, rx: Math.PI / 2, sy: 0.7 }, 0.13, 0.13, 10); b.cyl(0x6c7178, { x: tx - 0.3, y: 0.9, z: tz - 1.05, sy: 0.4 }, 0.13, 0.13, 10);
      g.colliders.push({ x0: x - 1.25, x1: x + 1.25, z0: z - 1.2, z1: z + 1.2 }, { x0: tx - 1.05, x1: tx + 1.05, z0: tz - 0.7, z1: tz + 0.7 });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), waterMaterial(1.8, 1.1, { foam: 0.12 }));
      water.rotation.x = -Math.PI / 2; water.position.set(tx, 0.64, tz); scene.add(water);
      w.stream = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.45, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.8, emissive: 0x3a7a9a }));
      w.stream.position.set(tx - 0.3, 0.83, tz - 0.3); scene.add(w.stream);
      w.spout = new THREE.Vector3(tx - 0.3, 0.7, tz - 0.2);
    }
    w.tank = [tx, tz];
    // the khaal: brick-edged channel with a muddy bed; its water grows along it when the motor runs
    const pts = W.channel;
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, z0] = pts[k], [x1, z1] = pts[k + 1], L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      b.push(mx, 0, mz, ry);
      b.box(MUD, { y: 0.015, sx: 0.42, sy: 0.03, sz: L + 0.3, ao: false });
      for (const s of [-1, 1]) b.box(0xa0522d, { x: s * 0.25, y: 0.06, sx: 0.1, sy: 0.12, sz: L + 0.3 });
      b.pop();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1), waterMaterial(0.4, L, { foam: 0.05 }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.05; m.visible = false;
      const pivot = new THREE.Group(); pivot.position.set(x0, 0, z0); pivot.rotation.y = ry; pivot.add(m); scene.add(pivot);
      w.segs.push({ m, L, from: w.len }); w.len += L;
    }
    scene.add(b.meshChunks(30, enhance(new THREE.MeshLambertMaterial({ vertexColors: true }), { cut: true })));
    // overflow puddle and wet earth beside the tank
    const [px, pz] = W.puddle;
    w.wet = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3b2a1a, transparent: true, opacity: 0, depthWrite: false }));
    w.wet.position.set(px, 0.025, pz); w.wet.renderOrder = -1; scene.add(w.wet);
    w.pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6fb7e0, transparent: true, opacity: 0.75, depthWrite: false }));
    w.pool.position.set(px, 0.035, pz); w.pool.visible = false; scene.add(w.pool);
    // the switch on the kotha
    const sw = i === 0 ? [POS.tubewell[0] - 0.5, POS.tubewell[1] + 1.9] : [W.kotha[0] - 0.5, W.kotha[1] - 1.9];
    g.actions.add({ label: () => (this.on(i) ? '⏹️ Stop the motor' : '⚙️ Start the motor'), x: sw[0], z: sw[1], r: 1.6, visible: () => !g.visit, onPress: () => this.toggle(i) });
    w.fields = FIELDS.filter((f) => W.fields.includes(f.id));
    return w;
  }
  on(i) { return !!this.st?.on?.[i]; }
  khaal(i) { return i > 0 || !!this.st.khaal; }
  toggle(i) {
    const g = this.game, st = this.st;
    st.on[i] = !st.on[i];
    g.audio.play('click');
    if (st.on[i]) {
      this.wells[i].spin = 0;
      g.ui.toast(this.khaal(i) ? '⚙️ Motor on! Water runs down the khaal to the fields' : `⚙️ Motor on! Dig the khaal (Shop → Land) to send water to the fields`, 3);
      g.state.stats.pumpStarts = (g.state.stats.pumpStarts || 0) + 1;
    } else g.ui.toast('⏹️ Motor off', 1.5);
    g.save();
  }
  digKhaal() {
    const g = this.game, st = g.state, K = TUBEWELLS[0].khaal;
    if (this.st.khaal) return '';
    if (st.level < K.level) return `Unlocks at level ${K.level}`;
    if (st.money < K.cost) return 'Not enough money';
    st.money -= K.cost; this.st.khaal = true; g.ui.money(); g.audio.play('yay'); g.save(true);
    return '';
  }
  // the motor's hum: a low square wave and a little rattle, louder near a running kotha
  sound(vol) {
    const A = this.game.audio, c = A.ctx;
    if (!c) return;
    if (!this.hum && vol > 0.001) {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain();
      o.type = 'square'; o.frequency.value = 48; o2.type = 'sawtooth'; o2.frequency.value = 97;
      f.type = 'lowpass'; f.frequency.value = 320; gn.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(gn); gn.connect(A.sfxGain); o.start(); o2.start();
      this.hum = { o, o2, gn };
    }
    if (this.hum) this.hum.gn.gain.setTargetAtTime(vol, c.currentTime, 0.25);
  }
  update(dt, t) {
    const g = this.game, st = this.st, p = g.player.pos;
    if (!st) return;
    let vol = 0;
    for (const w of this.wells) {
      const on = this.on(w.i), K = this.khaal(w.i);
      w.spin = on ? Math.min(1, w.spin + dt / 1.5) : Math.max(0, w.spin - dt / 0.8);     // the motor runs up and down
      const flowing = w.spin > 0.95;
      if (w.stream) { w.stream.visible = w.spin > 0.4; w.stream.scale.y = 0.6 + w.spin * 0.4; }
      const d = Math.hypot(p.x - w.cfg.kotha[0], p.z - w.cfg.kotha[1]);
      if (w.spin > 0) vol = Math.max(vol, 0.07 * w.spin * Math.max(0, 1 - d / 26));
      // splashes at the spout
      w.fxT = (w.fxT || 0) - dt;
      if (flowing && w.fxT <= 0 && d < 40) {
        w.fxT = 0.12;
        g.fx.emit(w.spout.x, 0.66, w.spout.z, { n: 3, color: 0xd8f3ff, speed: 1.4, up: 1.6, life: 0.45, size: 0.6 });
        if (Math.random() < 0.4) g.fx.puff(w.spout.x, 0.7, w.spout.z, { color: 0xffffff, size: 0.35, grow: 1.4, life: 0.6, rise: 0.4, drift: 0.2, alpha: 0.5 });
      }
      // water runs along the channel (3 m/s) and drains away when switched off
      const want = flowing && K ? w.len : 0;
      w.fill += Math.sign(want - w.fill) * Math.min(Math.abs(want - w.fill), dt * (want > w.fill ? 3.2 : 5));
      for (const s of w.segs) {
        const k = Math.max(0, Math.min(1, (w.fill - s.from) / s.L));
        s.m.visible = k > 0.01;
        if (s.m.visible) { s.m.scale.y = s.L * k; s.m.position.z = s.L * k / 2; }
      }
      // overflow: a puddle grows while it runs and the wet patch dries slowly
      w.puddle = Math.max(0, Math.min(1, w.puddle + (flowing ? dt / 25 : -dt / 90)));
      w.pool.visible = w.puddle > 0.05; w.pool.scale.setScalar(0.3 + w.puddle * 0.9);
      w.wet.material.opacity = Math.min(0.32, w.puddle * 0.45); w.wet.scale.setScalar(0.6 + w.puddle * 1.8);
      // irrigation: once the khaal is full, water the dry seeds in the fields it serves
      if (K && w.fill >= w.len - 0.01 && flowing && !g.visit) {
        w.irT = (w.irT || 0) - dt;
        if (w.irT <= 0) {
          w.irT = 0.6;
          let n = 0;
          for (const f of w.fields) {
            if (!g.farm.owned(f.id)) continue;
            for (const q of g.farm.byField[f.id]) { if (n >= 3) break; if (g.farm.water(q)) { n++; if (Math.hypot(p.x - q.x, p.z - q.z) < 30) g.fx.water(q.x, q.z); } }
          }
          if (n) g.state.stats.khaalWatered = (g.state.stats.khaalWatered || 0) + n;
        }
      }
    }
    this.sound(vol);
  }
}
