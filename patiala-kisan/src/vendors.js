// Travelling vendors: every few minutes a pheriwala pushes a rehri up the customer road to
// the mandi, rings their cycle bell and waits a couple of minutes with one deal. Tap the
// big button next to them to see it.
import * as THREE from 'three';
import { Builder } from './geo.js';
import { props } from './models.js';
import { Walker } from './market.js';
import { POS } from './world.js';
import { VENDORS, VENDOR_GAP, VENDOR_STAY, CROPS, ITEMS, BAGS, CANS, STORAGE, BOOST_TIME } from './config.js';
import { have, take, roomFor, receive } from './state.js';

const BYE = ['Shukriya ji! Rabb rakha 🙏', 'Phir milange! 👋', 'Sauda pakka! 🤝'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Vendors {
  constructor(game) {
    this.game = game;
    this.v = null;
    this.t = 45 + Math.random() * 40;           // the first one turns up soon after you start
    this.last = null;
    game.actions.add({
      label: () => `${VENDORS[this.v.id].icon} ${VENDORS[this.v.id].name.split(' ')[0]}'s deal`,
      pos: () => this.v.w.pos, r: 2.6,
      visible: () => !!this.v && this.v.state === 'wait',
      onPress: () => game.ui.open('vendor'),
    });
  }

  // ---------- deals (computed when the vendor arrives)
  makeDeal(id) {
    const g = this.game, st = g.state, l = st.level, kind = VENDORS[id].kind;
    switch (kind) {
      case 'seeds': {
        const crops = Object.entries(CROPS).filter(([, c]) => c.level <= l).slice(-3);
        const [cid, c] = pick(crops);
        const n = 10 + 2 * Math.min(l, 20);
        return { kind, text: `${n} ${c.icon} ${c.name} seeds`, was: c.seed * n, price: Math.round(c.seed * n * 0.5), give: { seeds: { [cid]: n } } };
      }
      case 'bundle': {
        const items = g.market.unlockedItems().filter((k) => ITEMS[k].price >= 10);
        const k = pick(items), p = ITEMS[k].price;
        const n = Math.max(3, Math.min(30, Math.round((200 + l * 60) / p)));
        return { kind, text: `${n} ${ITEMS[k].icon} ${ITEMS[k].name}`, was: p * n, price: Math.round(p * n * 0.6), give: { items: { [k]: n } } };
      }
      case 'buyer': {
        // pays 40% over the mandi for whatever this farm has the most of
        let best = null, bv = 0;
        for (const k of Object.keys(ITEMS)) { const v = have(st, k) * ITEMS[k].price; if (v > bv) { bv = v; best = k; } }
        if (!best) best = pick(Object.entries(CROPS).filter(([, c]) => c.level <= l))[0];
        return { kind, item: best, rate: Math.round(g.market.price(best) * 1.4), max: 10 + l, text: `Buys ${ITEMS[best].icon} ${ITEMS[best].name}` };
      }
      case 'khaad': return { kind, text: 'Urea-DAP: every growing crop jumps 40% ahead', price: 60 + l * 25, grow: 0.4 };
      case 'chai': return { kind, text: 'Adrak waali chaa: walk 30% faster for 3 min', price: 15 + l * 4, boost: 'speed' };
      case 'kulfi': return { kind, text: 'Kulfi for your customers: happy for 3 min (better reviews, bigger baskets)', price: 50 + l * 15, boost: 'happy' };
      case 'tools': {
        const ups = [['bag', BAGS, '🧺'], ['can', CANS, '💧'], ['storage', STORAGE, '🏚️']]
          .map(([key, list, icon]) => ({ key, icon, next: list[st.up[key] + 1] }))
          .filter((u) => u.next && u.next.level <= l);
        if (!ups.length) return null;
        const u = ups.reduce((a, b) => (a.next.cost < b.next.cost ? a : b));
        return { kind, text: `${u.icon} ${u.next.name} upgrade`, was: u.next.cost, price: Math.round(u.next.cost * 0.7), upgrade: u.key };
      }
    }
    return null;
  }

  // Take the deal. Returns an error message or ''.
  accept(n = 0) {
    const g = this.game, st = g.state, v = this.v;
    if (!v || v.state !== 'wait' || v.sold) return 'The vendor has moved on';
    const d = v.deal;
    if (d.kind === 'buyer') {
      const q = Math.min(have(st, d.item), d.max, n || d.max);
      if (!q) return `You have no ${ITEMS[d.item].name}`;
      take(st, d.item, q);
      g.earn(q * d.rate);
      st.stats.sold += q;
      g.emit('sold', { id: d.item, money: q * d.rate });
      g.carryDirty = true;
      g.audio.play('cash');
      g.ui.toast(`💵 Sold ${q} ${ITEMS[d.item].icon} for ₹${(q * d.rate).toLocaleString('en-IN')}`);
    } else {
      if (st.money < d.price) return 'Not enough money';
      if (d.give?.items && roomFor(st) < Object.values(d.give.items)[0]) return 'Make room in your godown or bag first';
      st.money -= d.price;
      if (d.give?.seeds) for (const [k, q] of Object.entries(d.give.seeds)) st.seeds[k] = (st.seeds[k] || 0) + q;
      if (d.give?.items) { receive(st, d.give.items); g.carryDirty = true; }
      if (d.grow) { const c = g.farm.boostAll(d.grow); g.ui.toast(c ? `🧪 ${c} crops jumped ahead!` : '🧪 Nothing is growing right now — the khaad is wasted', 2.6); }
      if (d.boost) st.boosts[d.boost] = BOOST_TIME;
      if (d.upgrade) { st.up[d.upgrade]++; if (d.upgrade === 'can') st.water = CANS[st.up.can].cap; g.carryDirty = true; g.emit('upgrade', { key: d.upgrade }); }
      g.audio.play(d.boost === 'speed' ? 'eat' : 'buy');
    }
    v.sold = true;
    v.say = pick(BYE); v.sayT = 3;
    v.stay = Math.min(v.stay, 4);
    g.ui.seedPill();
    g.save();
    return '';
  }

  // ---------- arrive, wait, leave
  arrive() {
    const g = this.game, ids = Object.keys(VENDORS).filter((k) => k !== this.last);
    let id, deal = null;
    for (let tries = 0; tries < 8 && !deal; tries++) { id = pick(ids); deal = this.makeDeal(id); }
    if (!deal) return;
    this.last = id;
    const cfg = VENDORS[id];
    const w = new Walker(g, { ...cfg.look, skin: pick([0xc68a5a, 0xb57a4f, 0xd49a6a]) });
    w.maxSpeed = 2.4;
    w.group.add(this.cart(cfg));
    w.pos.set(POS.customerSpawn[0] + 0.4, 0, POS.customerSpawn[1]);
    w.rot = Math.PI;
    w.go([[10.6, 6.6], POS.vendor]);
    const v = this.v = { id, deal, w, state: 'arrive', stay: VENDOR_STAY, say: '', sayT: 0, shoutT: 2 };
    v.label = g.labels.add(() => v.sayT > 0 ? v.say : (v.state === 'wait' && !v.sold ? `${cfg.icon} <b>Deal!</b>` : ''), () => _lp.set(v.w.pos.x, 2.5, v.w.pos.z), 'bubble vendor', 26);
    g.audio.play('tring');
    g.ui.toast(`🛎️ ${cfg.name} is coming to the mandi: ${deal.text}${deal.price ? ` for ₹${deal.price.toLocaleString('en-IN')}` : ''}`, 4);
  }

  leave() {
    const v = this.v;
    v.state = 'leave';
    v.w.go([[10.6, 6.6], [POS.customerSpawn[0] + 0.4, POS.customerSpawn[1]]]);
    if (this.game.ui.view === 'vendor') this.game.ui.close();
  }

  update(dt) {
    const g = this.game;
    if (!this.v) {
      this.t -= dt;
      if (this.t <= 0) { this.t = VENDOR_GAP[0] + Math.random() * (VENDOR_GAP[1] - VENDOR_GAP[0]); this.arrive(); }
      return;
    }
    const v = this.v, cfg = VENDORS[v.id];
    const arrived = v.w.update(dt, v.state === 'wait' && v.sayT > 0 ? (v.sayT * 2) % 1 : 0);
    if (v.sayT > 0) v.sayT -= dt;
    if (v.state === 'arrive' && arrived) { v.state = 'wait'; v.w.face(0.35); }
    else if (v.state === 'wait') {
      v.stay -= dt;
      v.shoutT -= dt;
      if (v.shoutT <= 0 && !v.sold) { v.shoutT = 7 + Math.random() * 5; v.say = pick(cfg.lines); v.sayT = 3; if (g.player.pos.distanceTo(v.w.pos) < 18 && Math.random() < 0.5) g.audio.play('tring'); }
      if (v.stay <= 0) { if (!v.sold) { v.say = 'Chalo, kal aavanga!'; v.sayT = 2.5; } this.leave(); }
    } else if (v.state === 'leave' && arrived) {
      v.w.remove();
      g.labels.remove(v.label);
      this.v = null;
    }
  }

  // The rehri they push, loaded with whatever they sell
  cart(cfg) {
    const b = new Builder(0.03, { ao: 0.2, aoH: 0.5 });
    b.push(0, 0, 1.9, Math.PI);
    props.cart(b, 0, 0);
    b.pop();
    const [c1, c2] = cfg.cart;
    const kind = cfg.kind;
    if (kind === 'chai') {
      b.cyl(0xadb5bd, { y: 1.05, z: 1.9, sy: 0.5 }, 0.22, 0.26, 12);
      b.cone(0xadb5bd, { y: 1.38, z: 1.9, sx: 0.3, sy: 0.18, sz: 0.3 }, 10);
      b.cyl(0xadb5bd, { x: 0.22, y: 1.15, z: 1.9, rz: -0.9, sy: 0.3 }, 0.03, 0.04, 6);
      for (let i = 0; i < 6; i++) b.cyl(0xf8f9fa, { x: -0.35 + (i % 3) * 0.14, y: 0.9, z: 1.55 + Math.floor(i / 3) * 0.16, sy: 0.12 }, 0.05, 0.04, 8);
    } else if (kind === 'kulfi') {
      props.matka(b, 0, 1.9, 1.2);
      b.sph(c1, { y: 1.35, z: 1.9, sx: 0.7, sy: 0.25, sz: 0.7 }, 10, 6);
      b.cyl(0xffffff, { x: 0.45, y: 1.4, z: 2.2, sy: 1.2 }, 0.02, 0.02, 4);
      b.box(c1, { x: 0.45, y: 2.05, z: 2.2, sx: 0.5, sy: 0.3, sz: 0.02 });
    } else {
      for (let i = 0; i < 6; i++) {
        const x = -0.3 + (i % 2) * 0.6, z = 1.3 + Math.floor(i / 2) * 0.5;
        if (kind === 'seeds' || kind === 'khaad' || kind === 'buyer') b.sph(i % 2 ? c1 : c2, { x, y: 1.0, z, sx: 0.55, sy: 0.4, sz: 0.42 }, 8, 6);
        else b.rbox(i % 2 ? c1 : c2, { x, y: 1.0, z, sx: 0.5, sy: 0.32, sz: 0.4 }, 0.03);
      }
      // a big umbrella over the cart
      b.cyl(0x666666, { x: -0.5, y: 1.5, z: 2.4, sy: 1.6 }, 0.02, 0.02, 4);
      b.cone(c1, { x: -0.5, y: 2.35, z: 2.4, sx: 1.4, sy: 0.32, sz: 1.4 }, 8);
    }
    const m = b.mesh();
    m.castShadow = true;
    return m;
  }
}
const _lp = new THREE.Vector3();
