// Gopal's Sweets: Gopal ji behind the glass counter and Chhotu frying jalebis in the kadahi.
// Eat a sweet for a boost, buy a mithai box for your bag (a gift for a friend), or fill
// Gopal ji's daily list for more than the mandi pays.
import * as THREE from 'three';
import { makeHuman, animateHuman } from './models.js';
import { POS } from './world.js';
import { SWEETS, BOOST_TIME, GOPAL_LINES, GOPAL_BUYS, GOPAL_RATE, ITEMS } from './config.js';
import { have, take, carryCap, addStorage, storageUsed, storageCap } from './state.js';

export class Sweets {
  constructor(game) {
    this.game = game;
    const [x, z] = POS.gopal;
    const add = (o, px, pz) => {
      const h = makeHuman(o);
      h.group.position.set(x + px, 0, z + pz);
      game.scene.add(h.group);
      h.group.traverse((m) => { if (m.isMesh) m.castShadow = false; });     // under the roof: the blob shadow is enough
      return h;
    };
    this.gopal = add({ turban: null, beard: false, shirt: 0xffffff, pants: 0xf8f9fa, apron: 0xe64980, skin: 0xd49a6a, hair: 0x2b2018, glasses: true, scale: 1.08 }, 0.7, 0.75);
    this.chhotu = add({ turban: null, beard: false, shirt: 0x74c0fc, pants: 0x495057, skin: 0xc68a5a, scale: 0.86 }, -2.3, 1.35);
    this.say = { text: '', t: 0, next: 3 };
    game.labels.add(() => this.say.t > 0 ? this.say.text : '', new THREE.Vector3(x + 0.7, 2.75, z + 0.75), 'bubble', 16);
    game.actions.add({ label: () => "🍥 Gopal's Sweets", x: POS.gopalAct[0], z: POS.gopalAct[1], r: 2.4, onPress: () => { this.ensureList(); game.ui.open('sweets'); } });
    this.steamT = 0;
    this.t = 0;
  }

  cost(id) { return SWEETS[id].cost(this.game.state.level); }

  // Returns an error message, or '' when the sweet was bought and used
  buy(id) {
    const g = this.game, st = g.state, s = SWEETS[id], cost = this.cost(id);
    if (st.money < cost) return 'Not enough money';
    if (s.item && st.carry.length >= carryCap(st) && storageUsed(st) >= storageCap(st)) return 'Bag and godown are full';
    st.money -= cost;
    if (s.boost) st.boosts[s.boost] = BOOST_TIME;
    if (s.grow) {
      const n = g.farm.boostAll(s.grow);
      g.ui.toast(n ? `🟠 ${n} crops jumped ahead!` : '🟠 Tasty — but nothing is growing right now', 2.6);
    }
    if (s.item) {
      if (st.carry.length < carryCap(st)) { st.carry.push(s.item); g.carryDirty = true; }
      else { addStorage(st, s.item, 1); g.ui.toast('🎁 Bag full — the mithai box went to the godown'); }
    }
    g.audio.play('eat');
    g.fx.sparkle(g.player.pos.x, 2, g.player.pos.z, 0xff6fae, 16);
    this.speak(s.item ? 'Shubh kaamna! Dabba pack kar ditta 🎁' : `Lao ji, ${s.name}! Mooh mitha karo 😋`);
    g.emit('sweet', { key: id });
    return '';
  }

  // Gopal ji's list: two goods he needs today (from what this farm can make), paid above mandi rate
  ensureList() {
    const st = this.game.state, gp = st.gopal;
    if (gp.day === st.day.n && Object.keys(gp.wants).length) return;
    const can = this.game.market.unlockedItems();
    const pool = GOPAL_BUYS.filter((k) => can.includes(k));
    const wants = {};
    for (let i = 0; i < 2 && pool.length; i++) {
      const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      wants[k] = Math.min(25, Math.max(2, Math.round((120 + st.level * 35) / ITEMS[k].price)));
    }
    st.gopal = { day: st.day.n, wants, done: false };
  }
  listPay() { return Math.round(Object.entries(this.game.state.gopal.wants).reduce((a, [k, n]) => a + ITEMS[k].price * n, 0) * GOPAL_RATE); }
  fillList() {
    const g = this.game, st = g.state, gp = st.gopal;
    if (gp.done) return 'Already delivered today';
    if (!Object.entries(gp.wants).every(([k, n]) => have(st, k) >= n)) return 'Missing items';
    for (const [k, n] of Object.entries(gp.wants)) take(st, k, n);
    const pay = this.listPay();
    gp.done = true;
    g.carryDirty = true;
    g.earn(pay);
    g.addXP(Math.round(pay / 20));
    g.audio.play('cash');
    this.speak('Waah! Hun bananga vadhiya mithai 🍥');
    return '';
  }

  speak(text, secs = 3) { this.say.text = `🧑‍🍳 ${text}`; this.say.t = secs; this.say.next = 9 + Math.random() * 6; this.gopal.talk?.(Math.min(2, secs)); this.gopal.expr?.('smile', secs); }

  update(dt) {
    const g = this.game, t = (this.t += dt);
    const d = g.player.pos.distanceTo(this.gopal.group.position);
    // Gopal ji waves customers in; Chhotu never stops stirring
    animateHuman(this.gopal, t, 0, d < 7 ? (t * 0.7) % 1 : 0);
    animateHuman(this.chhotu, t, 0, (t * 1.4) % 1);
    if (this.say.t > 0) this.say.t -= dt;
    else if (d < 14 && (this.say.next -= dt) <= 0) this.speak(GOPAL_LINES[Math.floor(Math.random() * GOPAL_LINES.length)]);
    this.steamT -= dt;
    if (this.steamT <= 0 && g.kadahi && d < 30) {
      this.steamT = 0.5;
      g.fx.puff(g.kadahi.x + (Math.random() - 0.5) * 0.5, g.kadahi.y, g.kadahi.z, { color: 0xf1f3f5, size: 0.35, grow: 2.2, life: 1.6, rise: 0.9, drift: 0.2, alpha: 0.4 });
    }
  }
}
