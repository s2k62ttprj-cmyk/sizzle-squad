// Ground pads (stand on them to sell, collect, pay for land…), action spots for the big
// contextual button, and floating HTML labels projected from 3D positions.
import * as THREE from 'three';
import { makePad, setPadProgress } from './fx.js';

const _v = new THREE.Vector3();

export class Labels {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('labels');
    this.list = [];
  }
  // text: string or () => string; pos: Vector3 or {x,y,z}
  add(text, pos, cls = '', range = 26) {
    const el = document.createElement('div');
    el.className = 'lbl ' + cls;
    this.root.appendChild(el);
    const l = { el, text, pos, range, last: null, shown: true, visible: () => true };
    this.list.push(l);
    return l;
  }
  remove(l) {
    if (!l) return;
    l.el.remove();
    const i = this.list.indexOf(l);
    if (i >= 0) this.list.splice(i, 1);
  }
  update() {
    const { camera, player } = this.game;
    const w = innerWidth, h = innerHeight;
    for (const l of this.list) {
      const p = typeof l.pos === 'function' ? l.pos() : l.pos;
      const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
      let show = d < l.range && l.visible();
      if (show) {
        _v.set(p.x, p.y, p.z).project(camera);
        if (_v.z > 1 || _v.x < -1.2 || _v.x > 1.2 || _v.y < -1.2 || _v.y > 1.2) show = false;
        else {
          const t = typeof l.text === 'function' ? l.text() : l.text;
          if (t !== l.last) { l.el.innerHTML = t; l.last = t; }
          if (!t) show = false;
          l.el.style.transform = `translate(-50%, -100%) translate(${(_v.x * 0.5 + 0.5) * w}px, ${(-_v.y * 0.5 + 0.5) * h}px)`;
        }
      }
      if (show !== l.shown) { l.el.style.display = show ? '' : 'none'; l.shown = show; }
    }
  }
}

export class Pads {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.current = null;
  }
  add(o) {
    const pad = { r: 1.1, color: 0xffffff, visible: () => true, vehicleOk: false, timer: 0, ...o };
    pad.mesh = makePad(pad.color, pad.r);
    pad.mesh.position.set(pad.x, 0, pad.z);
    this.game.scene.add(pad.mesh);
    if (pad.label) pad.lbl = this.game.labels.add(pad.label, new THREE.Vector3(pad.x, 0.9, pad.z), 'pad', 22);
    if (pad.lbl) pad.lbl.visible = pad.visible;
    this.list.push(pad);
    return pad;
  }

  update(dt, t) {
    const g = this.game, pl = g.player;
    const riding = pl.vehicle;
    let on = null;
    for (const pad of this.list) {
      const vis = pad.visible();
      pad.mesh.visible = vis;
      if (!vis) continue;
      pad.mesh.userData.ring.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
      pad.mesh.userData.dash.rotation.y = t * 0.5;
      if (riding && !pad.vehicleOk) continue;
      const d = Math.hypot(pl.pos.x - pad.x, pl.pos.z - pad.z);
      if (d < pad.r * (riding ? 1.8 : 1)) on = pad;
    }
    if (on !== this.current) {
      if (this.current?.onLeave) this.current.onLeave();
      this.current = on;
      if (on) { on.timer = 0; on.onEnter?.(); }
    }
    if (on) {
      on.timer += dt;
      if (on.pay) this.payTick(on, dt);
      else on.onStay?.(dt, on.timer);
    }
  }

  // Stand-to-pay: money drains into the pad until the price is covered
  payTick(pad, dt) {
    const g = this.game, st = g.state, p = pad.pay;
    const ref = p.ref();
    if (st.level < p.level) {
      if (pad.timer < dt * 1.5) g.ui.toast(`🔒 Unlocks at level ${p.level}`);
      return;
    }
    const cost = p.cost;
    if (pad.timer < 0.35) return;     // short grace so walking across doesn't spend
    if (st.money <= 0) {
      if (!pad.warned) { g.ui.toast(`Need ₹${fmt(cost - ref.paid)} more`); g.audio.play('error'); pad.warned = true; }
      return;
    }
    pad.warned = false;
    const rate = Math.max(cost / 1.4, 40);
    const amt = Math.min(Math.ceil(rate * dt), cost - ref.paid, st.money);
    if (amt > 0) {
      st.money -= amt;
      ref.paid += amt;
      g.ui.money();
      pad.tick = (pad.tick || 0) + dt;
      if (pad.tick > 0.12) { pad.tick = 0; g.audio.play('coin'); g.fx.sparkle(pad.x, 0.5, pad.z, 0xa98fd6, 2); }
    }
    setPadProgress(pad.mesh, ref.paid / cost);
    if (ref.paid >= cost) {
      ref.paid = 0;
      setPadProgress(pad.mesh, 0);
      p.done();
      g.audio.play('buy');
      g.save(true);
    }
  }
}

export class Actions {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.best = null;
  }
  add(o) { const a = { r: 2.2, visible: () => true, vehicleOk: false, ...o }; this.list.push(a); return a; }
  update() {
    const pl = this.game.player;
    let best = null, bd = 1e9;
    for (const a of this.list) {
      if (!a.visible()) continue;
      if (pl.vehicle && !a.vehicleOk) continue;
      const p = typeof a.pos === 'function' ? a.pos() : a;
      const d = Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z);
      if (d < a.r && d < bd) { bd = d; best = a; }
    }
    this.best = best;
    return best;
  }
}

export const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (n >= 100000) return (n / 100000).toFixed(2).replace(/\.?0+$/, '') + ' L';
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString('en-IN');
};
