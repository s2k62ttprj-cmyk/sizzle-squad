// Online friends, through a Firebase Realtime Database (switched on by ONLINE in config.js).
// Each phone signs in anonymously (no account, no password: the sign-in is remembered by the
// browser) and gets a short friend code. With friends you can:
//  - send gifts in two taps; they arrive live with a notification (gift history is kept)
//  - chat one to one, see who is online and when they were last seen; block and report
//  - leave messages on each other's farm guestbook (the owner can delete any of them)
//  - ride the ring road together: friends riding at the same time appear on their Bullets
//  - meet on the farm: when you visit a friend who is online (or they visit you), your two characters
//    appear in the same farm, walk up to each other, talk in speech bubbles and chat in real time
// Everything is limited and filtered (config SOCIAL, moderation.js), and the database rules in
// database.rules.json only let friends gift and chat, and only owners change their own data.
import * as THREE from 'three';
import { ONLINE, SOCIAL, ITEMS, lookFor } from './config.js';
import { have, take, receive, roomFor, itemCount, todayKey, redeemOnce } from './state.js';
import { clean } from './moderation.js';
import { encode, snapshot } from './friends.js';
import { makeHuman, makeBike, poseRide, animateHuman } from './models.js';
import { POS } from './world.js';

const SDK = '10.12.2';
const lib = (m) => import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-${m}.js`);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
export const chatId = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
export const isOnline = (p, now = Date.now()) => !!p && p.online !== false && now - (p.at || 0) < SOCIAL.onlineFor * 1000;

export class Social {
  constructor(game) {
    this.game = game;
    this.on = !!ONLINE;
    this.ready = false;
    this.friends = {};       // uid → { name, turban, level, at, online, mutual, pid }
    this.requests = {};      // uid → { name, turban, at }
    this.gifts = {};         // gift id → gift waiting to be collected
    this.msgs = {};          // uid → [{ id, from, text, at }]
    this.unread = {};        // uid → count
    this.board = [];         // posts on the guestbook being looked at
    this.riders = {};        // uid → a friend''s Bullet on the ring road
    this.others = {};        // uid → a friend's character walking in the farm you are in (a visitor, or the host)
    this.nearOther = null;
    this.subs = [];
    this.sent = { t: 0, n: 0 };
    if (this.on) this.start().catch((e) => { console.warn('online', e); this.error = e.message; game.ui.socialChanged?.(); });
    if (this.on) game.labels.add(() => (this.myBubble ? esc(this.myBubble.text) : ''), () => _lp.set(game.player.pos.x, 2.7, game.player.pos.z), 'bubble', 40);
    if (this.on) game.actions.add({ label: () => `💬 Talk to ${clean(this.friends[this.nearOther]?.name || 'your friend', 14)}`, pos: () => this.others[this.nearOther]?.pos || { x: 1e5, z: 1e5 }, r: 3.6, visitOk: true, visible: () => !!this.nearOther && !!this.others[this.nearOther], onPress: () => this.talk(this.nearOther) });
    if (this.on) game.actions.add({ label: () => '📝 Guestbook', x: POS.guestbook[0], z: POS.guestbook[1] + 1.2, r: 1.8, visitOk: true, onPress: () => this.openBoard() });
  }
  get st() { return this.game.state; }

  async start() {
    const [{ initializeApp }, A, D] = await Promise.all([lib('app'), lib('auth'), lib('database')]);
    this.A = A; this.D = D;
    this.app = initializeApp(ONLINE);
    this.auth = A.getAuth(this.app);
    this.db = D.getDatabase(this.app);
    const user = await new Promise((res) => { const off = A.onAuthStateChanged(this.auth, (u) => { off(); res(u); }); });
    this.uid = (user || (await A.signInAnonymously(this.auth)).user).uid;
    if (!this.game.visit) { await this.register(); this.listen(); }
    this.ready = true;
    if (this.game.visit) this.visitLive().catch((e) => console.warn('visit live', e));
    this.game.ui.socialChanged?.();
  }
  ref(path) { return this.D.ref(this.db, path); }
  now() { return Date.now(); }

  // ---------- who I am: profile, a friend code, a link from my farm id, and being online
  async register() {
    const D = this.D, st = this.st, so = st.social;
    if (!so.code) {
      for (let i = 0; i < 6 && !so.code; i++) {
        const code = newCode();
        const r = await D.runTransaction(this.ref(`codes/${code}`), (v) => (v === null || v === this.uid ? this.uid : undefined));
        if (r.committed) so.code = code;
      }
    } else await D.set(this.ref(`codes/${so.code}`), this.uid).catch(() => {});
    await D.set(this.ref(`pids/${st.pid}`), this.uid).catch(() => {});
    await this.profile();
    D.onDisconnect(this.ref(`players/${this.uid}/online`)).set(false);
    this.beat = setInterval(() => this.profile(), 60000);
    this.farmT = 0;
    this.game.save(true);
  }
  async profile() {
    const st = this.st;
    const p = { name: st.name, turban: st.turban, level: st.level, pid: st.pid, code: st.social.code || '', online: true, at: this.D.serverTimestamp() };
    // a fresh farm snapshot now and then, so friends can visit the farm as it is today
    if (!this.farmT || Date.now() - this.farmT > 5 * 60000) { this.farmT = Date.now(); p.farm = await encode(snapshot(st)); }
    await this.D.update(this.ref(`players/${this.uid}`), p);
  }

  // ---------- listening for friends, requests, gifts and messages
  listen() {
    const D = this.D, me = this.uid;
    this.subs.push(D.onValue(this.ref(`friends/${me}`), (s) => {
      const ids = Object.keys(s.val() || {});
      for (const id of ids) if (!this.friends[id]) this.follow(id);
      for (const id of Object.keys(this.friends)) if (!ids.includes(id)) this.unfollow(id);
      this.changed();
    }));
    this.subs.push(D.onValue(this.ref(`requests/${me}`), (s) => {
      const was = Object.keys(this.requests).length;
      this.requests = s.val() || {};
      for (const id of Object.keys(this.requests)) if (this.friends[id]) D.remove(this.ref(`requests/${me}/${id}`));
      if (Object.keys(this.requests).length > was) { this.game.audio.play('tring'); this.game.ui.toast(`👥 ${this.requests[Object.keys(this.requests).pop()]?.name || 'Someone'} wants to be friends — 👥 Friends`, 3.5); }
      this.changed();
    }));
    this.subs.push(D.onChildAdded(this.ref(`inbox/${me}`), (s) => {
      const gft = s.val();
      if (!gft || this.st.social.blocked[gft.from]) { D.remove(s.ref); return; }
      this.gifts[s.key] = { ...gft, id: s.key };
      this.game.audio.play('trade');
      this.game.ui.toast(`🎁 ${clean(gft.name, 14)} sent you a gift! Collect it in 👥 Friends`, 3.5);
      this.changed();
    }));
    this.subs.push(D.onChildRemoved(this.ref(`inbox/${me}`), (s) => { delete this.gifts[s.key]; this.changed(); }));
  }
  follow(id) {
    const D = this.D, me = this.uid;
    const f = this.friends[id] = { name: '…', turban: '#e8590c', level: 0, at: 0, online: false, mutual: false, subs: [] };
    f.subs.push(D.onValue(this.ref(`players/${id}`), (s) => { Object.assign(f, s.val() || {}); this.changed(); }));
    f.subs.push(D.onValue(this.ref(`friends/${id}/${me}`), (s) => { f.mutual = s.exists(); this.changed(); }));
    f.subs.push(D.onChildAdded(D.query(this.ref(`chats/${chatId(me, id)}`), D.limitToLast(40)), (s) => {
      const m = s.val();
      if (!m) return;
      (this.msgs[id] ||= []).push({ id: s.key, from: m.from, text: clean(m.text, SOCIAL.chatLen), at: m.at });
      if (Date.now() - (m.at || 0) < 20000) this.bubble(m.from === me ? 'me' : id, clean(m.text, 70));
      if (m.from !== me && this.game.ui.chatWith !== id && Date.now() - (m.at || 0) < 120000) {
        this.unread[id] = (this.unread[id] || 0) + 1;
        this.game.audio.play('pop');
        this.game.ui.toast(`💬 ${clean(f.name, 14)}: ${clean(m.text, 40)}`, 3);
      }
      this.changed();
    }));
    f.subs.push(D.onValue(this.ref(`presence/${id}`), (s) => { f.ride = s.val(); }));
  }
  unfollow(id) {
    for (const off of this.friends[id]?.subs || []) off();
    delete this.friends[id];
    this.dropRider(id); this.dropOther(id);
  }
  changed() { this.game.ui.socialChanged?.(); }

  // ---------- making friends
  async addByCode(raw) {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length !== 6) return 'A friend code has 6 letters and numbers';
    if (code === this.st.social.code) return "That's your own code";
    const s = await this.D.get(this.ref(`codes/${code}`));
    if (!s.exists()) return 'No farm has that code';
    return this.add(s.val());
  }
  // friends from the old share links: their farm id leads to their online account
  async addByPid(pid) {
    const s = await this.D.get(this.ref(`pids/${pid}`));
    return s.exists() ? this.add(s.val()) : 'They have not come online yet';
  }
  async add(uid) {
    if (uid === this.uid) return "That's you";
    if (Object.keys(this.friends).length >= 60) return 'Your friends list is full';
    const st = this.st;
    await this.D.update(this.ref('/'), { [`friends/${this.uid}/${uid}`]: { at: Date.now() }, [`requests/${uid}/${this.uid}`]: { name: st.name, turban: st.turban, level: st.level, at: Date.now() } });
    delete st.social.blocked[uid];
    return '';
  }
  async accept(uid) { await this.D.update(this.ref('/'), { [`friends/${this.uid}/${uid}`]: { at: Date.now() }, [`requests/${this.uid}/${uid}`]: null }); }
  async decline(uid) { await this.D.remove(this.ref(`requests/${this.uid}/${uid}`)); }
  async unfriend(uid) { await this.D.remove(this.ref(`friends/${this.uid}/${uid}`)); }

  // ---------- gifts: two taps, limited per gift and per day
  giftError(uid, items) {
    const st = this.st, so = st.social, f = this.friends[uid];
    if (!f) return 'Not your friend';
    if (!f.mutual) return `${f.name} has not added you back yet`;
    const n = itemCount(items);
    if (!n) return 'Pick something';
    if (n > SOCIAL.giftItems(st.level)) return `Up to ${SOCIAL.giftItems(st.level)} items in one gift at level ${st.level}`;
    if (Object.entries(items).some(([k, q]) => !ITEMS[k] || have(st, k) < q)) return "You don't have all of that";
    if (so.giftDay === todayKey() && so.giftsToday >= SOCIAL.giftsPerDay) return `${SOCIAL.giftsPerDay} gifts a day — more tomorrow`;
    return '';
  }
  async sendGift(uid, items) {
    const err = this.giftError(uid, items);
    if (err) return err;
    const st = this.st, so = st.social, f = this.friends[uid];
    for (const [k, q] of Object.entries(items)) take(st, k, q);
    this.game.carryDirty = true;
    try {
      await this.D.push(this.ref(`inbox/${uid}`), { from: this.uid, name: st.name, turban: st.turban, items, at: Date.now() });
    } catch (e) {
      receive(st, items);                       // it didn't go: give the goods back
      return 'Could not send — check your internet';
    }
    if (so.giftDay !== todayKey()) { so.giftDay = todayKey(); so.giftsToday = 0; }
    so.giftsToday++;
    this.log({ k: 'sent', who: f.name, items });
    this.game.save(true);
    return '';
  }
  async collect(id) {
    const gft = this.gifts[id], st = this.st;
    if (!gft) return 'Already collected';
    if (roomFor(st) < itemCount(gft.items)) return 'Make room in your godown first';
    if (!redeemOnce(st, 'g:' + id)) { await this.D.remove(this.ref(`inbox/${this.uid}/${id}`)); return 'Already collected'; }
    const items = {};
    for (const [k, q] of Object.entries(gft.items || {})) if (ITEMS[k] && Number.isInteger(q) && q > 0 && q <= 500) items[k] = q;
    receive(st, items);
    this.game.carryDirty = true;
    this.log({ k: 'got', who: clean(gft.name, 14), items });
    delete this.gifts[id];
    await this.D.remove(this.ref(`inbox/${this.uid}/${id}`)).catch(() => {});
    this.game.audio.play('trade');
    this.game.save(true);
    this.changed();
    return '';
  }
  log(e) {
    const h = this.st.social.history;
    h.unshift({ ...e, at: Date.now() });
    if (h.length > SOCIAL.historyKeep) h.length = SOCIAL.historyKeep;
  }

  // ---------- chat
  async say(uid, raw) {
    const f = this.friends[uid];
    if (!f?.mutual) return 'You can chat once you are both friends';
    const text = clean(raw, SOCIAL.chatLen);
    if (!text) return '';
    const now = Date.now();
    if (now - this.sent.t > 60000) this.sent = { t: now, n: 0 };
    if (++this.sent.n > SOCIAL.chatPerMinute) return 'Slow down a little 🙂';
    await this.D.push(this.ref(`chats/${chatId(this.uid, uid)}`), { from: this.uid, text, at: now });
    return '';
  }
  read(uid) { this.unread[uid] = 0; }
  async block(uid) {
    this.st.social.blocked[uid] = Date.now();
    await this.D.set(this.ref(`blocks/${this.uid}/${uid}`), true).catch(() => {});
    await this.unfriend(uid).catch(() => {});
  }
  async report(uid, why, text = '') {
    await this.D.push(this.ref('reports'), { by: this.uid, about: uid, why: clean(why, 40), text: clean(text, 200), at: Date.now() }).catch(() => {});
  }

  // ---------- farm guestbooks
  async ownerOf(pid) { const s = await this.D.get(this.ref(`pids/${pid}`)); return s.exists() ? s.val() : null; }
  watchBoard(owner) {
    this.unwatchBoard();
    this.boardOwner = owner;
    this.board = [];
    const q = this.D.query(this.ref(`boards/${owner}`), this.D.limitToLast(SOCIAL.boardKeep));
    this.boardOff = this.D.onValue(q, (s) => {
      const v = s.val() || {};
      this.board = Object.entries(v).map(([id, p]) => ({ id, ...p, text: clean(p.text, SOCIAL.boardLen), name: clean(p.name, 14) }))
        .filter((p) => !this.st.social.blocked[p.from]).sort((a, b) => b.at - a.at);
      this.changed();
    });
  }
  async openBoard() {
    const g = this.game;
    if (!this.ready) { g.ui.toast(this.error ? 'The guestbook needs the internet' : 'Connecting…'); return; }
    const owner = g.visit ? await this.ownerOf(g.visit.from) : this.uid;
    if (!owner) { g.ui.toast(` hasn't come online yet — their guestbook opens once they do`, 3); return; }
    g.ui.boardOwner = owner;
    this.watchBoard(owner);
    g.ui.open('board');
  }
  unwatchBoard() { if (this.boardOff) this.boardOff(); this.boardOff = null; }
  async post(owner, raw, me) {
    const text = clean(raw, SOCIAL.boardLen);
    if (!text) return 'Write something first';
    const last = this.st.social.posted?.[owner] || 0;
    if (Date.now() - last < SOCIAL.boardGap * 1000) return `One message every ${SOCIAL.boardGap / 60} minutes on this board`;
    await this.D.push(this.ref(`boards/${owner}`), { from: this.uid, name: me.name, turban: me.turban, text, at: Date.now() });
    if (!this.game.visit) this.st.social.posted[owner] = Date.now();
    else this.lastPost = Date.now();
    return '';
  }
  async unpost(owner, id) { await this.D.remove(this.ref(`boards/${owner}/${id}`)); }

  // ---------- being in the same farm: a visitor and the host (when both are online) see each other
  // The visit page works out who owns the farm and follows them; both sides then share their position
  // a few times a second through presence/{uid} (friends can read it, only the owner can write it).
  async visitLive() {
    const g = this.game, D = this.D, me = this.uid;
    const owner = await this.ownerOf(g.visit.from);
    if (!owner || owner === me) return;
    this.host = owner;
    const [a, b] = await Promise.all([D.get(this.ref(`friends/${me}/${owner}`)), D.get(this.ref(`friends/${owner}/${me}`))]);
    this.hostMutual = a.exists() && b.exists();
    if (this.hostMutual) this.follow(owner);
    else this.subs.push(D.onValue(this.ref(`players/${owner}`), (s) => { this.hostProfile = s.val() || {}; this.changed(); }));
    D.onDisconnect(this.ref(`presence/${me}`)).remove();
    // a visitor is online too: keep their profile fresh while they are in a friend's farm
    const beat = () => D.update(this.ref(`players/${me}`), { online: true, at: D.serverTimestamp() }).catch(() => {});
    beat();
    D.onDisconnect(this.ref(`players/${me}/online`)).set(false);
    this.beat = setInterval(beat, 60000);
    this.changed();
  }
  // a line for the visit bar: is the friend here right now?
  hostStatus() {
    if (!this.host) return '';
    const f = this.hostMutual ? this.friends[this.host] : this.hostProfile;
    if (!f) return '';
    const on = isOnline(f);
    if (!on) return '⚪ Offline · the farm is as they left it';
    if (!this.hostMutual) return '🟢 Online · add each other as friends to meet';
    return this.others[this.host] ? '🟢 Here with you · walk up to say hi' : '🟢 Online · waiting for them to appear…';
  }
  // the outfit friends see: on a friend's farm, the visitor's own wardrobe
  myLook() { const w = this.game.visit ? this.game.me?.wardrobe : this.st.wardrobe; return w ? { gender: w.gender, skin: w.skin, fskin: w.fskin, hair: w.hair } : null; }
  talk(id) {
    const g = this.game;
    if (!id || !this.friends[id]?.mutual) return;
    g.ui.chatWith = id; this.read(id);
    g.ui.open('chat');
  }
  bubble(id, text) { const o = this.others[id] || (id === 'me' ? { me: true } : null); if (!o) return; if (id === 'me') { this.myBubble = { text, t: 6 }; return; } o.bubble = { text, t: 6 }; }

  // ---------- each frame: share where I am, show friends who ride or walk in this farm
  update(dt) {
    if (!this.ready) return;
    const g = this.game, v = g.player.vehicle, p = g.player.pos, now = Date.now();
    this.presT = (this.presT || 0) - dt;
    if (this.myBubble) { this.myBubble.t -= dt; if (this.myBubble.t <= 0) this.myBubble = null; }
    const visiting = !!g.visit && !!this.host;
    const riding = !g.visit && v?.kind === 'bike';
    const hosting = !g.visit && Object.keys(this.others).length > 0;
    const sending = visiting || riding || hosting;
    if (this.presT <= 0 && (sending || this.wasSending)) {
      this.presT = 0.3;
      let data = null;
      if (visiting || (hosting && !riding)) data = { m: 'walk', x: +p.x.toFixed(2), z: +p.z.toFixed(2), r: +g.player.rot.toFixed(2), s: +(g.player.speed || 0).toFixed(1), at: now, n: (g.visit ? g.me?.name : this.st.name) || 'Friend', t: (g.visit ? g.me?.turban : this.st.turban) || '#e8590c', w: this.myLook(), v: visiting ? this.host : null, f: visiting ? null : this.uid };
      else if (riding) data = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), r: +v.rot.toFixed(2), s: +v.speed.toFixed(1), at: now, paint: this.st.aura.paint || '', f: hosting ? this.uid : null };
      this.D.set(this.ref(`presence/${this.uid}`), data).catch(() => {});
      this.wasSending = sending;
    }
    let near = null, nd = 3.6;
    for (const [id, f] of Object.entries(this.friends)) {
      const r = f.ride, fresh = r && now - r.at < 6000 && f.mutual;
      const walking = fresh && r.m === 'walk' && (g.visit ? id === this.host && r.f === id : r.v === this.uid);
      const riding2 = fresh && r.m !== 'walk' && !g.visit;
      const hostRiding = fresh && r.m !== 'walk' && g.visit && id === this.host && r.f === id;
      if (walking) {
        const o = this.showOther(id, f, r, dt);
        const d = Math.hypot(o.x - p.x, o.z - p.z);
        if (d < nd) { nd = d; near = id; }
      } else this.dropOther(id);
      if (riding2 || hostRiding) this.showRider(id, f, r, dt); else this.dropRider(id);
    }
    this.nearOther = near;
    if (g.visit && this.host && !this.friends[this.host]) this.dropOther(this.host);
  }
  // a friend's character walking about in this farm
  showOther(id, f, r, dt) {
    const g = this.game;
    let o = this.others[id];
    if (!o) {
      const h = makeHuman({ ...lookFor(r.w, r.t || f.turban || '#e8590c'), hq: true });
      h.group.traverse((m) => { if (m.isMesh && m !== h.blob) m.castShadow = true; });
      g.scene.add(h.group);
      o = this.others[id] = { h, pos: h.group.position, x: r.x, z: r.z, rot: r.r, t: Math.random() * 9, spd: 0 };
      o.pos.set(r.x, 0, r.z);
      o.label = g.labels.add(() => {
        const live = this.friends[id];
        return `<b>${live && isOnline(live) ? '🟢' : '⚪'} ${clean(live?.name || r.n || 'Friend', 14)}</b>${o.bubble ? `<br><small>${esc(o.bubble.text)}</small>` : ''}`;
      }, () => _lp.set(o.x, 2.55, o.z), 'mgr', 40);
      g.audio.play('tring');
      g.ui.toast(g.visit ? `👋 ${clean(f.name, 14)} is here! Walk up to say hi` : `👋 ${clean(f.name, 14)} is visiting your farm!`, 3.2);
      g.ui.socialChanged?.();
    }
    const k = Math.min(1, dt * 7), ox = o.x, oz = o.z;
    o.x += (r.x - o.x) * k; o.z += (r.z - o.z) * k;
    let d = (r.r ?? o.rot) - o.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rot += d * Math.min(1, dt * 9);
    const sp = Math.hypot(o.x - ox, o.z - oz) / Math.max(dt, 1e-3);
    o.spd += (Math.min(6.2, sp) - o.spd) * Math.min(1, dt * 8);
    o.pos.set(o.x, 0, o.z);
    o.h.group.rotation.y = o.rot;
    o.t += dt;
    animateHuman(o.h, o.t, o.spd);
    if (o.bubble) { o.bubble.t -= dt; if (o.bubble.t <= 0) o.bubble = null; }
    return o;
  }
  dropOther(id) {
    const o = this.others[id];
    if (!o) return;
    this.game.scene.remove(o.h.group);
    this.game.labels.remove(o.label);
    delete this.others[id];
    this.game.ui.socialChanged?.();
  }
  showRider(id, f, r, dt) {
    const g = this.game;
    let o = this.riders[id];
    if (!o) {
      const bike = makeBike(), h = makeHuman({ turban: new THREE.Color(f.turban || '#e8590c').getHex(), shirt: 0xf7f3e8, pants: 0xf2eee2, vest: 0x2f5d8a });
      bike.group.add(h.group);
      h.group.position.copy(bike.seat.position);
      g.scene.add(bike.group);
      o = this.riders[id] = { bike, h, x: r.x, z: r.z, rot: r.r, label: g.labels.add(() => `🏍️ ${clean(f.name, 14)}`, () => _lp.set(o.x, 2.6, o.z), 'veh', 40) };
    }
    // glide towards the latest position (updates come a few times a second)
    const k = Math.min(1, dt * 6);
    o.x += (r.x - o.x) * k; o.z += (r.z - o.z) * k;
    let d = r.r - o.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rot += d * k;
    o.bike.group.position.set(o.x, 0, o.z);
    o.bike.group.rotation.y = o.rot;
    o.bike.group.rotation.z = -Math.max(-0.4, Math.min(0.4, d * (r.s || 0) * 0.08));
    for (const w of o.bike.wheels) w.rotation.x += (r.s || 0) * dt / 0.34;
    animateHuman(o.h, g.clock, 0, 0, true);
    poseRide(o.h, 0, 0.5);
  }
  dropRider(id) {
    const o = this.riders[id];
    if (!o) return;
    this.game.scene.remove(o.bike.group);
    this.game.labels.remove(o.label);
    delete this.riders[id];
  }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));const _lp = new THREE.Vector3();
