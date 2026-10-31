// Gurdwara Sri Dukh Niwaran Sahib, Patiala. Visit once a day to matha tek (bow): earns soul
// points and the day's blessing (better luck at harvest and the mandi). Langar seva earns more.
import * as THREE from 'three';
import { POS } from './world.js';
import { GURU, SOUL_PERKS, ITEMS } from './config.js';
import { todayKey } from './state.js';

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

  update() {
    const p = this.game.player.pos;
    const inside = p.z < -28.5 && p.x > -23 && p.x < 17;
    if (inside !== this.inside) {
      this.inside = inside;
      this.game.audio.zone = inside ? 'gurdwara' : 'farm';
      if (inside) this.game.ui.toast('🙏 Gurdwara Sri Dukh Niwaran Sahib, Patiala', 2.5);
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
