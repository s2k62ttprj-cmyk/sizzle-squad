// The farmer: movement, auto-working nearby plots with the right tool, the visible
// stack on their back, riding vehicles and bowing at the Gurdwara.
import * as THREE from 'three';
import { makeHuman, animateHuman } from './models.js';
import { StackView } from './cargo.js';
import { collide } from './world.js';
import { CROPS, CANS, BAGS } from './config.js';
import { carryCap, addStorage } from './state.js';

const WALK = 6.2;
const tmp = [];

export class Player {
  constructor(game) {
    this.game = game;
    const st = game.state;
    this.h = makeHuman({ turban: new THREE.Color(st.turban).getHex(), shirt: 0xf7f3e8, pants: 0xf2eee2, vest: 0x2f5d8a, tools: true });
    this.group = this.h.group;
    this.pos = this.group.position;
    this.pos.set(st.player.x, 0, st.player.z);
    this.rot = st.player.rot;
    this.speed = 0;
    this.work = 0;
    this.workCd = 0;
    this.tool = null;
    this.vehicle = null;
    this.bow = 0;
    this.stepDist = 0;
    this.blockedAt = 0;
    game.scene.add(this.group);
    const back = new THREE.Group();
    back.position.set(0, 1.0, -0.36);
    this.group.add(back);
    // wooden carrying frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), new THREE.MeshLambertMaterial({ color: 0x8b5a2b }));
    frame.position.y = -0.04;
    back.add(frame);
    this.back = back;
    this.stack = new StackView(back, { cap: 60, layout: 'tower', cols: 1 });
    this.syncStack();
  }

  setTurban(hex) {
    // rebuild the model with a new turban colour (from settings)
    const parent = this.group.parent;
    const pos = this.pos.clone();
    parent.remove(this.group);
    this.game.state.turban = hex;
    const h = makeHuman({ turban: new THREE.Color(hex).getHex(), shirt: 0xf7f3e8, pants: 0xf2eee2, vest: 0x2f5d8a, tools: true });
    h.group.add(this.back);
    this.h = h;
    this.group = h.group;
    this.pos = this.group.position;
    this.pos.copy(pos);
    parent.add(this.group);
  }

  syncStack() {
    const cap = carryCap(this.game.state);
    this.stack.cols = cap > 35 ? 3 : cap > 14 ? 2 : 1;
    this.stack.set(this.game.state.carry);
    this.game.carryDirty = false;
  }

  backPoint(out = new THREE.Vector3()) {
    return out.set(this.pos.x - Math.sin(this.rot) * 0.4, 1.4 + Math.min(this.game.state.carry.length, 20) * 0.08, this.pos.z - Math.cos(this.rot) * 0.4);
  }

  setTool(name) {
    if (this.tool === name) return;
    for (const k in this.h.tools) this.h.tools[k].visible = k === name;
    this.tool = name;
  }

  update(dt, t) {
    const g = this.game, st = g.state;
    if (g.carryDirty) this.syncStack();
    if (this.vehicle) {
      const v = this.vehicle;
      v.seat.getWorldPosition(this.pos);
      this.pos.y -= 0.0;
      this.rot = v.rot;
      this.group.rotation.y = this.rot;
      animateHuman(this.h, t, 0, 0, true);
      this.setTool(null);
      this.back.visible = v.kind === 'bike';
      this.stack.update(dt, 0);
      return;
    }
    this.back.visible = true;
    this.group.position.y = 0;

    if (this.bow > 0) { this.updateBow(dt); return; }

    const v = g.input.vector();
    const slow = g.guru.inside ? 0.62 : 1;
    const target = v.len > 0.08 ? WALK * v.len * slow : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 12);
    if (v.len > 0.08) {
      const want = Math.atan2(v.x, v.y);
      let d = want - this.rot;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.rot += d * Math.min(1, dt * 14);
      const ox = this.pos.x, oz = this.pos.z;
      this.pos.x += (v.x / v.len) * this.speed * dt;
      this.pos.z += (v.y / v.len) * this.speed * dt;
      collide(g.colliders, this.pos, 0.38);
      const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
      this.stepDist += moved;
      if (this.stepDist > 1.25) {
        this.stepDist = 0;
        g.audio.play('step');
        if (this.speed > 3.5 && g.surface('dirt', this.pos.x, this.pos.z) > 0.4) g.fx.dust(this.pos.x - Math.sin(this.rot) * 0.3, this.pos.z - Math.cos(this.rot) * 0.3, 0.6);
      }
    }
    this.group.rotation.y = this.rot;

    // work the nearest plot that needs something
    this.workCd -= dt;
    if (this.work > 0) {
      this.work += dt / 0.2;
      if (this.work >= 1) this.work = 0;
    }
    if (this.workCd <= 0) this.tryWork();
    if (this.work === 0 && this.workCd < -0.6) this.setTool(null);
    animateHuman(this.h, t, this.speed, this.work);
    this.stack.update(dt, this.speed * 0.9);
  }

  tryWork() {
    const g = this.game, st = g.state, farm = g.farm;
    const plots = farm.near(this.pos.x, this.pos.z, 1.35, tmp);
    if (!plots.length) return;
    let best = null, bd = 1e9, bestAct = null, blocked = null;
    const room = carryCap(st) - st.carry.length;
    for (const p of plots) {
      const a = farm.nextAction(p);
      if (!a) continue;
      if (a === 'plant' && !this.pickSeed()) { blocked = blocked || 'seed'; continue; }
      if (a === 'water' && st.water <= 0) { blocked = blocked || 'water'; continue; }
      if (a === 'harvest' && room <= 0) { blocked = 'full'; continue; }
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z) + (a === 'harvest' ? -0.3 : 0);
      if (d < bd) { bd = d; best = p; bestAct = a; }
    }
    if (!best) {
      if (blocked) this.blocked(blocked);
      return;
    }
    this.workCd = 0.17;
    this.work = 0.001;
    const fx = g.fx, au = g.audio;
    switch (bestAct) {
      case 'till':
        this.setTool('hoe');
        farm.till(best);
        fx.soil(best.x, best.z);
        au.play('till');
        st.stats.tilled++;
        break;
      case 'plant':
        this.setTool('seed');
        farm.plant(best, st.seed);
        fx.emit(best.x, 0.4, best.z, { n: 5, color: 0x6dbb3c, speed: 0.8, up: 1.2 });
        au.play('plant');
        st.stats.planted++;
        g.ui.seedPill();
        break;
      case 'water':
        this.setTool('can');
        farm.water(best);
        st.water--;
        fx.water(best.x, best.z);
        au.play('water');
        st.stats.watered++;
        g.ui.waterPill();
        break;
      case 'harvest': {
        this.setTool('sickle');
        const n = farm.harvest(best);
        const { crop, double } = farm.lastHarvest;
        const k = Math.min(n, carryCap(st) - st.carry.length);
        for (let i = 0; i < k; i++) {
          st.carry.push(crop);
          g.flyers.add(crop, new THREE.Vector3(best.x, 0.4, best.z), () => this.backPoint(_bp), 0.3, null, 1.0);
        }
        const extra = n - k;
        let lost = 0;
        if (extra > 0) lost = extra - addStorage(st, crop, extra);
        g.carryDirty = true;
        fx.leaves(best.x, best.z, CROPS[crop].leaf);
        au.play('harvest');
        st.stats.harvested += n;
        g.addXP(CROPS[crop].xp * (double ? 2 : 1));
        g.ui.float(`+${n} ${CROPS[crop].icon}${double ? ' ✨' : ''}`, best.x, 1.2, best.z, double ? 'gold' : '');
        if (extra > 0) g.ui.toast(lost ? `Bag & godown full — ${lost} lost` : `${extra} sent to the godown`);
        g.emit('harvested', { crop, n });
        break;
      }
    }
  }

  // Use the selected seed, or switch to any seed you have
  pickSeed() {
    const st = this.game.state;
    if (st.seeds[st.seed] > 0) return true;
    const alt = Object.keys(st.seeds).find((k) => st.seeds[k] > 0);
    if (alt) { st.seed = alt; this.game.ui.seedPill(); this.game.ui.toast(`Switched to ${CROPS[alt].name} seeds`); return true; }
    return false;
  }

  blocked(why) {
    const now = performance.now();
    if (now - this.blockedAt < 2600) return;
    this.blockedAt = now;
    const g = this.game, st = g.state;
    if (why === 'seed') { g.ui.toast(`No seeds left — buy ${CROPS[st.seed].name} seeds in the Shop 🛒`); g.ui.pulse('btnShop'); }
    if (why === 'water') { g.ui.toast(`${CANS[st.up.can].name} is empty — refill at the tubewell 💧`); g.guide.set('tubewell', true); }
    if (why === 'full') { g.ui.toast(`${BAGS[st.up.bag].name} is full — sell at the Mandi 🧺`); g.guide.set('stall', true); }
    g.audio.play('error');
  }

  startBow(done) {
    this.bow = 0.0001;
    this.bowDone = done;
    this.rot = Math.PI;
    this.setTool(null);
  }
  updateBow(dt) {
    this.bow += dt / 2.6;
    const h = this.h, k = this.bow;
    const kneel = Math.min(1, k * 4, (1 - k) * 4);
    const bend = Math.max(0, Math.sin(Math.min(1, Math.max(0, (k - 0.2) / 0.6)) * Math.PI));
    h.legL.rotation.x = h.legR.rotation.x = -1.4 * kneel;
    this.group.position.y = -0.4 * kneel;
    this.group.rotation.y = this.rot;
    h.body.rotation.x = bend * 0.45;
    h.armL.rotation.x = h.armR.rotation.x = -0.6 * kneel - bend * 0.9;
    if (this.bow >= 1) {
      this.bow = 0;
      h.body.rotation.x = 0;
      this.group.position.y = 0;
      const d = this.bowDone; this.bowDone = null;
      d && d();
    }
  }

  save() {
    const p = this.game.state.player;
    p.x = +this.pos.x.toFixed(2); p.z = +this.pos.z.toFixed(2); p.rot = +this.rot.toFixed(3);
  }
}
const _bp = new THREE.Vector3();
