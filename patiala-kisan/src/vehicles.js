// Drivable vehicles: Bullet motorcycle, tractor with attachments and trolley, combine.
// Arcade steering: push the stick where you want to go; pull back to reverse.
import * as THREE from 'three';
import { makeTractor, makeAttachment, makeTrolley, makeCombine, makeBike } from './models.js';
import { StackView } from './cargo.js';
import { collide, POS } from './world.js';
import { VEHICLES, ATTACHMENTS, TRACTOR_HP, COMBINE_RADIUS, TANKER_CAP, CROPS, BIKE_ENGINES, AURA } from './config.js';
import { addStorage } from './state.js';
import { onRing } from './ring.js';
import { Ride, Airplane, FLEET } from './fleet.js';

const PARK = { bike: [12.6, 8.2, 0], tractor: [15.2, 10.5, Math.PI], combine: [21.5, 10.5, Math.PI] };
// grip: how hard the bike can turn; top: share of top speed; drag: extra rolling resistance (m/s²)
const SURFACE = { road: { grip: 1, top: 1, drag: 0 }, ground: { grip: 0.85, top: 0.92, drag: 0.5 }, field: { grip: 0.68, top: 0.72, drag: 1.6 } };
const _w = new THREE.Vector3(), tmp = [];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

class Vehicle {
  constructor(game, kind) {
    this.game = game;
    this.kind = kind;
    this.cfg = VEHICLES[kind];
    const m = kind === 'tractor' ? makeTractor() : kind === 'combine' ? makeCombine() : makeBike();
    Object.assign(this, m);
    this.data = game.state.vehicles[kind];
    if (!this.data.x && !this.data.z) { const p = PARK[kind]; this.data.x = p[0]; this.data.z = p[1]; this.data.rot = p[2]; }
    this.pos = this.group.position;
    this.pos.set(this.data.x, 0, this.data.z);
    this.rot = this.data.rot;
    this.group.rotation.y = this.rot;
    this.speed = 0;
    this.rev = false;
    this.radius = kind === 'combine' ? 2.1 : kind === 'tractor' ? 1.25 : 0.6;
    for (const w of this.wheels) w.rotation.order = 'YXZ';
    game.scene.add(this.group);
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (kind === 'tractor') {
      this.attMeshes = {};
      this.trolley = makeTrolley();
      game.scene.add(this.trolley.group);
      this.trolleyRot = this.rot;
      this.cargoView = new StackView(this.trolley.bed, { cap: 60, layout: 'grid', gx: 3, gz: 5, dx: 0.55, dz: 0.5, dy: 0.21 });
      this.setAttachment(this.data.att);
    }
    if (kind === 'bike') { this.lean = 0; this.dressBike(); }
    if (kind === 'combine') this.cargoView = new StackView(this.group, { cap: 45, layout: 'grid', gx: 3, gz: 3, dx: 0.55, dz: 0.45, dy: 0.21 });
    if (this.cargoView && kind === 'combine') { this.cargoView.crate.position.set(0, 3.38, -1.2); this.cargoView.top.position.set(0, 3.38, -1.2); }
    this.label = game.labels.add(() => game.player.vehicle === this ? '' : `${kind === 'bike' ? '🏍️' : kind === 'tractor' ? '🚜' : '🌾'} ${this.cfg.name}`, () => _lp.set(this.pos.x, kind === 'combine' ? 4.4 : 2.6, this.pos.z), 'veh', 18);
    game.actions.add({
      label: () => `${kind === 'bike' ? '🏍️ Ride' : '🚜 Drive'} ${kind === 'bike' ? 'Bullet' : kind === 'tractor' ? 'Tractor' : 'Combine'}`,
      pos: () => this.pos, r: kind === 'combine' ? 3.6 : 2.6,
      visible: () => !game.player.vehicle && game.player.bow === 0,
      onPress: () => game.player.vehicle ? null : this.enter(),
    });
    this.syncCargo();
  }

  get cargo() { return this.data.cargo; }
  get cargoCap() { return this.cfg.cargo; }

  setAttachment(id) {
    if (this.kind !== 'tractor') return;
    this.data.att = id;
    for (const k in this.attMeshes) this.attMeshes[k].visible = false;
    if (!this.attMeshes[id]) {
      const a = makeAttachment(id);
      (id === 'reaper' ? this.front : this.rear).add(a);
      a.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.attMeshes[id] = a;
    }
    this.attMeshes[id].visible = true;
    this.trolley.group.visible = id === 'reaper' || this.cargo.length > 0;
  }

  syncCargo() {
    if (this.cargoView) this.cargoView.set(this.cargo);
    if (this.kind === 'tractor') this.trolley.group.visible = this.data.att === 'reaper' || this.cargo.length > 0;
  }

  enter() {
    const g = this.game;
    g.player.vehicle = this;
    g.audio.play('engine');
    g.ui.vehicleMode(this);
    if (this.kind === 'tractor' && !g.state.stats.drove) { g.state.stats.drove = 1; g.ui.toast('Push the stick where you want to drive. Pull back to reverse.', 4); }
  }
  exit() {
    const g = this.game, pl = g.player;
    pl.vehicle = null;
    this.speed = 0; this.thr = 0; this.yaw = 0;
    const side = this.kind === 'combine' ? 2.6 : 1.5;
    pl.pos.set(this.pos.x + Math.cos(this.rot) * side, 0, this.pos.z - Math.sin(this.rot) * side);
    collide(g.colliders, pl.pos, 0.38);
    g.audio.setEngine(false);
    g.ui.vehicleMode(null);
    this.save();
    g.save(true);
  }

  // paint and extras bought with Aura: swap the model's parts into the same group
  dressBike() {
    const a = this.game.state.aura, R = AURA.rewards;
    const m = makeBike({ tank: R[a.paint]?.paint, ribbons: !!a.owned.ribbons, lamps: !!a.owned.lamps });
    for (const c of [...this.group.children]) this.group.remove(c);
    for (const c of [...m.group.children]) this.group.add(c);
    this.wheels = m.wheels; this.seat = m.seat;
    for (const w of this.wheels) w.rotation.order = 'YXZ';
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  maxSpeed() {
    if (this.kind === 'bike') return (BIKE_ENGINES[this.data.hp] || BIKE_ENGINES[0]).top;
    if (this.kind === 'tractor') return TRACTOR_HP[this.data.hp].speed;
    return this.cfg.speed;
  }

  // What the wheels are on: the ring road grips best, open ground a little less, a tilled field least.
  surfaceAt(x, z) {
    if (onRing(x, z)) return SURFACE.road;
    return this.game.farm.fieldAt(x, z, 0) ? SURFACE.field : SURFACE.ground;
  }

  // The Bullet. Handling model:
  //  - the stick sets a wanted heading and how hard to pull; power builds up smoothly (no instant
  //    full throttle) and fades towards top speed along a curve instead of cutting off
  //  - steering is a yaw rate that follows the stick with a little lag, limited by grip / speed:
  //    sharp at walking pace, calmer and steadier at speed, never sliding sideways
  //  - pull the stick back to brake: it bites harder the faster you go (ABS-like), and stopped it reverses
  //  - the bike leans into turns; rough ground and fields cost grip, top speed and a little drag
  //  - hitting something keeps only the speed made along the heading: a glancing blow slows you a
  //    little, a head-on one stops you
  driveBike(dt) {
    const g = this.game, v = g.input.vector(), eng = BIKE_ENGINES[this.data.hp] || BIKE_ENGINES[0];
    const wet = 1 - 0.22 * (g.weather?.rain || 0);                          // rain makes every surface a little slippery
    const s0 = this.surfaceAt(this.pos.x, this.pos.z), sf = this.surf = { grip: s0.grip * wet, top: s0.top, drag: s0.drag }, top = eng.top * sf.top;
    this.thr ??= 0; this.yaw ??= 0;
    const sp = this.speed, abs = Math.abs(sp);
    let want = 0, brake = 0, err = 0, steering = false;
    if (v.len > 0.12) {
      const heading = Math.atan2(v.x, v.y), e = wrap(heading - this.rot), a = Math.abs(e);
      steering = true;
      if (a > 2.3 && sp > 0.8) { brake = Math.min(1, 0.4 + (a - 2.3) * 1.4); err = 0; }
      else if (a > 2.3) { err = wrap(heading + Math.PI - this.rot); want = -0.35 * v.len; }
      else { err = e; want = v.len * Math.max(0.2, Math.cos(e)); }
    }
    this.thr += (want - this.thr) * Math.min(1, dt * (want > this.thr ? 5 : 9));
    const thr = this.thr;
    // steering
    const maxYaw = Math.min(3, 10.5 * sf.grip / Math.max(abs, 3.5)) * Math.min(1, 0.25 + abs / 2.2);
    const yawWant = steering ? Math.max(-maxYaw, Math.min(maxYaw, err * (abs > 9 ? 3.4 : 4.6))) : 0;
    this.yaw += (yawWant - this.yaw) * Math.min(1, dt * (Math.abs(yawWant) > Math.abs(this.yaw) ? 8 : 12));
    this.rot += this.yaw * dt;
    // speed
    let acc;
    if (brake) acc = -(5.5 + abs * 0.45) * brake * Math.min(1, sf.grip + 0.2);
    else if (thr > 0.02) {
      const cap = top * Math.max(thr, 0.15);
      acc = sp < cap ? eng.accel * thr * (1 - Math.pow(Math.min(1, Math.max(0, sp) / top), 1.6)) * (0.6 + 0.4 * sf.grip) : -(1.6 + (sp - cap) * 0.5);
    } else if (thr < -0.02) acc = (thr * 1.4 - sp) * 2.5;
    else acc = -Math.sign(sp) * Math.min(abs / dt, 1.3 + abs * 0.07 + sf.drag);
    if (thr > 0.02 && sf.drag) acc -= sf.drag * Math.min(1, abs / 6);
    acc -= Math.sign(sp) * abs * Math.abs(this.yaw) * 0.1;                 // tyres scrub speed in a hard turn
    this.speed += acc * dt;
    if (brake && this.speed < 0) this.speed = 0;
    this.lean += (Math.max(-0.5, Math.min(0.5, -Math.atan(this.speed * this.yaw / 9.8))) - this.lean) * Math.min(1, dt * 7);
    // move and collide
    const ox = this.pos.x, oz = this.pos.z, fx = Math.sin(this.rot), fz = Math.cos(this.rot);
    this.pos.x += fx * this.speed * dt;
    this.pos.z += fz * this.speed * dt;
    collide(g.colliders, this.pos, this.radius);
    const bx = this.pos.x, bz = this.pos.z;
    collide(g.vehicleColliders, this.pos, this.radius);
    if (bx !== this.pos.x || bz !== this.pos.z) this.warn('🙏 Please park outside the Gurdwara and walk in barefoot');
    const along = ((this.pos.x - ox) * fx + (this.pos.z - oz) * fz) / dt;
    if (abs > 0.5 && Math.abs(along) < Math.abs(this.speed) - 0.2) {
      const lost = Math.abs(this.speed) - Math.abs(along);
      this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(along) * 0.85);
      this.yaw *= 0.5;
      if (lost > 4 && (this.bumpT ?? 0) <= 0) { this.bumpT = 0.4; g.fx.dust(this.pos.x, this.pos.z, 1.1); }
    }
    this.bumpT = (this.bumpT ?? 0) - dt;
    this.throttle = Math.max(0, thr); this.braking = brake;
    g.audio.setEngine(true, Math.abs(this.speed), 1.7, { bike: true, throttle: Math.max(0, thr), top: eng.top });
    this.steer = this.yaw;
  }
  drive(dt) {
    if (this.kind === 'bike') return this.driveBike(dt);
    const g = this.game, v = g.input.vector();
    const max = this.maxSpeed();
    let target = 0, d = 0;
    if (v.len > 0.12) {
      const want = Math.atan2(v.x, v.y);
      const fwd = wrap(want - this.rot);
      if (!this.rev && Math.abs(fwd) > 2.4 && this.speed < 1.2) this.rev = true;
      else if (this.rev && Math.abs(fwd) < 1.4) this.rev = false;
      d = this.rev ? wrap(want + Math.PI - this.rot) : fwd;
      const turn = (this.kind === 'bike' ? 3.2 : this.kind === 'combine' ? 1.3 : 1.9) * (0.35 + 0.65 * Math.min(1, Math.abs(this.speed) / 3));
      this.rot += Math.max(-turn * dt, Math.min(turn * dt, d));
      target = this.rev ? -max * 0.45 * v.len : max * v.len * Math.max(0.25, Math.cos(d));
    }
    const acc = target === 0 ? 5 : 2.4;
    this.speed += (target - this.speed) * Math.min(1, dt * acc);
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += Math.sin(this.rot) * this.speed * dt;
    this.pos.z += Math.cos(this.rot) * this.speed * dt;
    collide(g.colliders, this.pos, this.radius);
    const bx = this.pos.x, bz = this.pos.z;
    collide(g.vehicleColliders, this.pos, this.radius);
    if (bx !== this.pos.x || bz !== this.pos.z) this.warn('🙏 Please park outside the Gurdwara and walk in barefoot');
    const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (Math.abs(this.speed) * dt > 0.001 && moved < Math.abs(this.speed) * dt * 0.3) this.speed *= 0.6;
    g.audio.setEngine(true, Math.abs(this.speed), this.kind === 'bike' ? 1.7 : this.kind === 'combine' ? 0.8 : 1);
    this.steer = d;
  }

  update(dt, t) {
    const g = this.game;
    if (g.player.vehicle === this) this.drive(dt);
    this.group.rotation.y = this.rot;
    const roll = this.speed * dt;
    for (const w of this.wheels) w.rotation.x += roll / w.userData.r;
    if (this.steer !== undefined && this.kind !== 'bike') {
      const s = Math.max(-0.5, Math.min(0.5, this.steer || 0)) * (g.player.vehicle === this ? 1 : 0);
      if (this.kind === 'tractor') { this.wheels[2].rotation.y = s; this.wheels[3].rotation.y = s; }
    }
    if (this.kind === 'bike') { if (g.player.vehicle !== this) this.lean *= 0.9; this.group.rotation.z = this.lean; }
    if (this.kind === 'tractor') this.updateTrolley(dt);
    if (this.kind === 'combine' && Math.abs(this.speed) > 0.1) this.reel.rotation.x += dt * 5;
    if (this.kind === 'tractor' && this.data.att === 'reaper') this.attMeshes.reaper.userData.spin.rotation.x += dt * (Math.abs(this.speed) > 0.1 ? 6 : 0);
    if (g.player.vehicle === this && Math.abs(this.speed) > 0.3) this.work();
    if (this.cargoView) this.cargoView.update(dt);
    // dust behind the wheels and diesel puffs from the exhaust
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0) {
      this.fxT = 0.07;
      const sp = Math.abs(this.speed);
      if (sp > 1.8) {
        const back = this.kind === 'bike' ? 0.7 : this.kind === 'combine' ? 1.8 : 0.6, side = this.kind === 'bike' ? 0 : this.kind === 'combine' ? 1.2 : 0.85;
        const s = Math.sign(Math.random() - 0.5);
        const cx = this.pos.x - Math.sin(this.rot) * back + Math.cos(this.rot) * side * s, cz = this.pos.z - Math.cos(this.rot) * back - Math.sin(this.rot) * side * s;
        g.fx.dust(cx, cz, this.kind === 'combine' ? 1.6 : this.kind === 'tractor' ? 1.2 : 0.8);
      }
      if (this.exhaust && g.player.vehicle === this && Math.random() < 0.35 + sp * 0.05) {
        this.exhaust.getWorldPosition(_w);
        g.fx.smoke(_w.x, _w.y, _w.z, 0x6b6b6b);
      }
    }
  }

  updateTrolley(dt) {
    const tr = this.trolley;
    this.rear.getWorldPosition(_w);
    const diff = wrap(this.rot - this.trolleyRot);
    this.trolleyRot += diff * Math.min(1, Math.abs(this.speed) * dt * 0.55 + dt * 0.3);
    tr.group.position.set(_w.x, 0, _w.z);
    tr.group.rotation.y = this.trolleyRot;
    for (const w of tr.wheels) w.rotation.x += this.speed * dt / 0.5;
  }

  workPoint(out) {
    const front = this.kind === 'combine' || this.data.att === 'reaper';
    (front ? this.front : this.rear).getWorldPosition(out);
    if (!front && this.kind === 'tractor') { out.x -= Math.sin(this.rot) * 0.6; out.z -= Math.cos(this.rot) * 0.6; }
    return out;
  }

  work() {
    const g = this.game, st = g.state, farm = g.farm;
    const action = this.kind === 'combine' ? 'harvest' : ATTACHMENTS[this.data.att].action;
    if (this.kind === 'bike') return;
    const r = this.kind === 'combine' ? COMBINE_RADIUS : TRACTOR_HP[this.data.hp].radius;
    this.workPoint(_w);
    const plots = farm.near(_w.x, _w.z, r, tmp);
    for (const p of plots) {
      if (farm.nextAction(p) !== action) continue;
      let ok = false;
      if (action === 'till') { ok = farm.till(p); if (ok && Math.random() < 0.5) g.fx.soil(p.x, p.z); }
      else if (action === 'plant') {
        if (!g.player.pickSeed()) { g.player.blocked('seed'); break; }
        ok = farm.plant(p, st.seed);
        g.ui.seedPill();
      } else if (action === 'water') {
        if (this.data.tank <= 0) { this.warn('Tanker empty — drive onto the tubewell pad to refill 💧'); break; }
        ok = farm.water(p);
        if (ok) { this.data.tank--; g.fx.water(p.x, p.z); }
      } else if (action === 'harvest') {
        if (this.cargo.length >= this.cargoCap) { this.warn('Trolley full — unload at the Mandi, Arhtiya or Godown'); break; }
        const n = farm.harvest(p);
        if (n) {
          const crop = farm.lastHarvest.crop;
          const k = Math.min(n, this.cargoCap - this.cargo.length);
          for (let i = 0; i < k; i++) this.cargo.push(crop);
          if (n > k) addStorage(st, crop, n - k);
          st.stats.harvested += n;
          g.addXP(CROPS[crop].xp);
          g.fx.leaves(p.x, p.z, CROPS[crop].leaf);
          g.emit('harvested', { crop, n });
          this.syncCargo();
          ok = true;
        }
      }
      if (ok) {
        st.stats.tractorWork++;
        g.emit('tractorWork', {});
        if (Math.random() < 0.3) g.audio.play(action === 'harvest' ? 'harvest' : action === 'water' ? 'water' : 'till');
      }
    }
  }

  warn(msg) {
    const now = performance.now();
    if (now - (this.warnAt || 0) < 3000) return;
    this.warnAt = now;
    this.game.ui.toast(msg);
    this.game.audio.play('error');
  }

  save() { this.data.x = +this.pos.x.toFixed(2); this.data.z = +this.pos.z.toFixed(2); this.data.rot = +this.rot.toFixed(3); }
}
const _lp = new THREE.Vector3();

export class Vehicles {
  constructor(game) {
    this.game = game;
    this.map = {};
    for (const id in VEHICLES) if (game.state.vehicles[id].owned) this.spawn(id);
  }
  spawn(id) {
    if (!this.map[id]) this.map[id] = id === 'plane' ? new Airplane(this.game) : FLEET.includes(id) ? new Ride(this.game, id) : new Vehicle(this.game, id);
    return this.map[id];
  }
  buy(id) {
    const g = this.game, st = g.state, cfg = VEHICLES[id];
    if (st.vehicles[id].owned || st.level < cfg.level || st.money < cfg.cost) return false;
    st.money -= cfg.cost;
    st.vehicles[id].owned = true;
    if (id === 'tractor') st.stats.tractor = 1;
    this.spawn(id);
    g.emit('vehicle', { key: id });
    g.guide.set(id === 'plane' ? 'hangar' : 'garage');
    st.stats.vehicles = Object.values(st.vehicles).filter((v) => v.owned).length;
    return true;
  }
  update(dt, t) { for (const k in this.map) this.map[k].update(dt, t); }
  save() { for (const k in this.map) this.map[k].save(); }
}

export { TANKER_CAP };
