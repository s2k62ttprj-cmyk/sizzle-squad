// Gurdwara Sri Dukh Niwaran Sahib, Patiala. Visit once a day to matha tek (bow): earns soul
// points and the day's blessing (better luck at harvest and the mandi). Langar seva earns more.
import * as THREE from 'three';
import { POS } from './world.js';
import { GURU, SOUL_PERKS, ITEMS } from './config.js';
import { todayKey } from './state.js';
import { Walker } from './market.js';
import { Builder } from './geo.js';

export class Guru {
  constructor(game) {
    this.game = game;
    this.inside = false;
    const st = game.state;
    game.actions.add({
      label: () => this.bowedToday() ? '🙏 Darshan done today' : '🙏 Matha Tekna',
      x: POS.darbar[0], z: POS.darbar[1], r: 2.6,
      onPress: () => this.bow(),
    });
    game.pads.add({
      x: POS.langarPad[0], z: POS.langarPad[1], r: 1.2, color: 0xff922b,
      label: () => `🍲 Langar Seva${st.guru.langarDate === todayKey() ? ` · ${st.guru.langarSoul}/${GURU.langarDailySoul} 🙏` : ''}`,
      onStay: (dt) => this.langarTick(dt),
    });
    game.labels.add(() => this.bowedToday() ? '' : '✨ Daily darshan', new THREE.Vector3(POS.darbar[0], 2.6, POS.darbar[1]), 'quest', 60);
  }

  bowedToday() { return this.game.state.guru.last === todayKey(); }
  blessed() { return this.game.state.guru.blessDate === todayKey(); }

  bow() {
    const g = this.game, st = g.state, gu = st.guru;
    if (g.player.bow > 0) return;
    g.player.startBow(() => {
      if (this.bowedToday()) {
        g.ui.toast('🙏 Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh', 2.5);
        return;
      }
      const today = todayKey();
      const y = new Date(); y.setDate(y.getDate() - 1);
      gu.streak = gu.last === todayKey(y) ? gu.streak + 1 : 1;
      gu.last = today;
      gu.blessDate = today;
      const pts = GURU.bowSoul + Math.min(gu.streak - 1, GURU.streakMax) * GURU.streakBonus;
      this.addSoul(pts);
      st.stats.streak = Math.max(st.stats.streak || 0, gu.streak);
      g.audio.play('bless');
      g.fx.sparkle(POS.darbar[0], 1.5, POS.darbar[1], 0xffd43b, 40);
      g.ui.blessing(pts, gu.streak);
      g.emit('bow', {});
      g.refreshPerks();
      g.save(true);
    });
  }

  addSoul(n) {
    const st = this.game.state, before = st.soul;
    st.soul += n;
    for (const p of SOUL_PERKS) if (before < p.at && st.soul >= p.at) this.game.ui.toast(`🌟 New blessing unlocked: ${p.name} — ${p.desc}`, 4);
    this.game.ui.soul();
    this.game.refreshPerks();
  }

  langarTick(dt) {
    const g = this.game, st = g.state, gu = st.guru;
    this.acc = (this.acc || 0) + dt;
    if (this.acc < 0.12) return;
    this.acc = 0;
    if (gu.langarDate !== todayKey()) { gu.langarDate = todayKey(); gu.langarSoul = 0; gu.langarItems = 0; }
    const cargo = g.activeCargo();
    if (!cargo.items.length) return;
    const id = cargo.items.pop();
    gu.langarItems = (gu.langarItems || 0) + 1;
    st.stats.langar++;
    g.addXP(1);
    g.flyers.add(id, g.player.backPoint(_v), new THREE.Vector3(POS.langar[0], 1.5, POS.langar[1] + 2.4), 0.3);
    g.audio.play('pop');
    g.carryDirty = true; g.vehicleCargoDirty();
    g.emit('langar', {});
    if (gu.langarItems % GURU.langarItemsPerSoul === 0 && gu.langarSoul < GURU.langarDailySoul) {
      gu.langarSoul++;
      this.addSoul(1);
      g.ui.float('+1 🙏', POS.langarPad[0], 2, POS.langarPad[1], 'gold');
    }
  }

  // Sevadar at the joda ghar, sangat walking the parikrama, and the player's own jutti
  buildSangat() {
    const g = this.game, [jx, jz] = POS.jodaGhar;
    this.sevadar = new Walker(g, { turban: 0x1c3f94, shirt: 0xffffff, pants: 0xffffff, sash: 0xff8c1a });
    this.sevadar.pos.set(jx - 0.4, 0, jz + 0.1);
    this.sevadar.face(0);
    this.say = { text: '', t: 0 };
    g.labels.add(() => this.say.t > 0 ? this.say.text : '', new THREE.Vector3(jx - 0.4, 2.5, jz + 0.3), 'bubble', 16);
    // the player's own pair waits in an empty cubby while they are inside
    const b = new Builder(0.02, { ao: 0 });
    for (const s of [-1, 1]) {
      b.rbox(0x7a4a22, { x: s * 0.09, y: 0, sx: 0.12, sy: 0.08, sz: 0.24 }, 0.03);
      b.box(0xf2c94c, { x: s * 0.09, y: 0.04, z: 0.03, sx: 0.09, sy: 0.015, sz: 0.08, ao: false });
    }
    this.pair = b.mesh();
    this.pair.position.set(jx - 1.35, 0.4, jz - 0.54);
    this.pair.visible = false;
    g.scene.add(this.pair);
    // sangat doing parikrama round the sarovar, slowly and clockwise
    const [sx, sz] = POS.sarovar;
    const loop = [[sx - 9.3, sz + 5.6], [sx + 9.3, sz + 5.6], [sx + 9.3, sz - 5.6], [sx - 9.3, sz - 5.6]];
    const looks = [
      { dupatta: 0xffffff, shirt: 0xf8f0e3, pants: 0xf8f0e3, skin: 0xc68a5a },
      { turban: 0xff8c1a, shirt: 0xffffff, pants: 0xffffff, hair: 0xd9d9d9, skin: 0xb57a4f },
      { dupatta: 0xffd43b, shirt: 0x74c0fc, pants: 0x74c0fc, skin: 0xd49a6a },
    ];
    this.sangat = looks.map((look, i) => {
      const w = new Walker(g, look);
      w.maxSpeed = 0.85;
      w.leg = i;
      const [x, z] = loop[i], [nx, nz] = loop[(i + 1) % 4];
      w.pos.set(x + (nx - x) * 0.4, 0, z + (nz - z) * 0.4);
      w.loop = loop;
      w.goto(nx, nz); w.leg = (i + 1) % 4;
      return w;
    });
  }

  setBarefoot(bare, quiet = false) {
    const g = this.game, h = g.player.h;
    this.barefoot = bare;
    this.model = h;
    h.setBarefoot?.(bare);
    h.setCovered?.(bare);
    this.pair.visible = bare;
    if (quiet) return;
    const token = 10 + (g.state.name.length * 7 + g.state.level * 3) % 89;
    this.say = { text: bare ? `🙏 Sat Sri Akal ji! Token number ${token}` : '🙏 Ji aaya nu! Eh lo tuhadi jutti', t: 3 };
    this.sevadar.work = 0.6;
    this.sevadar.h.talk?.(1.6); this.sevadar.h.expr?.('smile', 3);
    g.ui.toast(bare ? `👟 Jutti left at the Joda Ghar (token ${token}) — walking in barefoot` : '👟 Jutti back on — Waheguru Ji Ka Khalsa', 2.6);
  }

  update(dt = 0.016) {
    const g = this.game, p = g.player.pos;
    const inside = p.z < -28.5 && p.z > -63.6 && p.x > -23 && p.x < 17;
    if (inside !== this.inside) {
      this.inside = inside;
      if (inside) g.ui.toast('🙏 Gurdwara Sri Dukh Niwaran Sahib, Patiala', 2.5);
    }
    if (!this.sevadar) { this.buildSangat(); this.setBarefoot(inside && !g.player.vehicle, true); }
    // shoes come off on the way in and go back on on the way out (and after a pagg change)
    const bare = inside && !g.player.vehicle;
    if (bare !== this.barefoot) this.setBarefoot(bare);
    else if (this.model !== g.player.h) this.setBarefoot(bare, true);
    // calm (0..1): music, ambience and light settle as you walk in
    g.calm = (g.calm || 0) + ((inside ? 1 : 0) - (g.calm || 0)) * Math.min(1, dt * 1.5);
    // walking through the charan kund
    const [kx, kz] = POS.footbath;
    if (this.barefoot && Math.abs(p.x - kx) < 2 && Math.abs(p.z - kz) < 0.45 && g.player.speed > 1) {
      this.splashT = (this.splashT || 0) - dt;
      if (this.splashT <= 0) { this.splashT = 0.35; g.audio.play('splash'); g.fx.water(p.x, p.z); }
    }
    // helpers only animate when someone could see them
    const near = p.z < -18;
    if (this.say.t > 0) this.say.t -= dt;
    if (near) {
      this.sevadar.work = Math.max(0, (this.sevadar.work || 0) - dt);
      this.sevadar.update(dt, this.sevadar.work > 0 ? (this.sevadar.work * 2) % 1 : 0);
      for (const w of this.sangat) {
        if (w.update(dt)) { w.leg = (w.leg + 1) % 4; w.goto(...w.loop[w.leg]); }
      }
    }
  }
}
const _v = new THREE.Vector3();

export function computePerks(st) {
  const today = todayKey();
  const blessed = st.guru.blessDate === today;
  const out = { grow: 1, price: 0, luck: 0.03, blessed };
  for (const p of SOUL_PERKS) if (st.soul >= p.at) { out.grow += p.grow || 0; out.price += p.price || 0; out.luck += p.luck || 0; }
  if (blessed) { out.luck += GURU.blessLuck; out.price += GURU.blessPrice; }
  return out;
}
