// The wardrobe: a turning 3D preview of any outfit (drag to spin it all the way round), and
// buying, wearing and choosing a hairstyle. Outfits are cosmetic only and bought once.
import * as THREE from 'three';
import { makeHuman, animateHuman } from './models.js';
import { SKINS, lookFor } from './config.js';

const W = 300, H = 380;
const toSrgb = new Uint8ClampedArray(256).map((_, v) => { const c = v / 255; return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); });

export class Wardrobe {
  constructor(game) {
    this.game = game;
    this.preview = null;          // the outfit being looked at (may not be owned yet)
    this.angle = 0.4;
    this.spin = 0.6;              // turns by itself until dragged
    this.running = false;
  }
  get w() { return this.game.state.wardrobe; }
  current() { return this.w.gender === 'f' ? this.w.fskin : this.w.skin; }

  setup() {
    if (this.rig) return;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a66, 2.1));
    const key = new THREE.DirectionalLight(0xfff3dd, 2.6); key.position.set(2, 3, 4);
    const rim = new THREE.DirectionalLight(0xbfdcff, 1.5); rim.position.set(-3, 2, -2);
    scene.add(key, rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe9dcc0 }));
    scene.add(floor);
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 20);
    cam.position.set(0, 1.25, 4.3); cam.lookAt(0, 0.98, 0);
    this.rig = { scene, cam, rt: new THREE.WebGLRenderTarget(W, H), buf: new Uint8Array(W * H * 4) };
  }
  show(id) {
    this.setup();
    const { scene } = this.rig;
    if (this.model) { scene.remove(this.model.group); this.model.group.traverse((o) => o.geometry?.dispose()); }
    const s = SKINS[id], w = { ...this.w, gender: s.gender, skin: s.gender === 'm' ? id : this.w.skin, fskin: s.gender === 'f' ? id : this.w.fskin };
    this.model = makeHuman({ ...lookFor(w, this.game.state.turban), hq: true });
    this.model.blob.visible = false;
    scene.add(this.model.group);
    this.preview = id;
    this.t = 0;
  }
  // keep drawing into the panel's canvas while it is on screen
  start(id) {
    this.show(id || this.preview || this.current());
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      const cv = document.getElementById('wardCanvas');
      if (!cv || this.game.ui.view !== 'wardrobe') { this.running = false; return; }
      if (now - last >= 48) { const dt = Math.min(0.1, (now - last) / 1000); last = now; this.draw(cv, dt); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  bind(cv) {
    if (cv.dataset.bound) return;
    cv.dataset.bound = '1';
    let x0 = null;
    cv.addEventListener('pointerdown', (e) => { e.stopPropagation(); x0 = e.clientX; this.spin = 0; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (x0 === null) return; this.angle += (e.clientX - x0) * 0.012; x0 = e.clientX; });
    const up = () => { x0 = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  draw(cv, dt) {
    const g = this.game, r = g.renderer, { scene, cam, rt, buf } = this.rig, m = this.model;
    this.bind(cv);
    this.t += dt;
    this.angle += this.spin * dt;
    m.group.rotation.y = this.angle;
    // a slow idle, and now and then a little walk on the spot to show the clothes moving
    const walk = Math.sin(this.t * 0.5) > 0.6 ? 2.2 : 0;
    animateHuman(m, this.t, walk);
    const prev = r.getRenderTarget(), pc = r.getClearColor(new THREE.Color()), pa = r.getClearAlpha(), sh = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, cam);
    r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    r.setRenderTarget(prev); r.setClearColor(pc, pa); r.shadowMap.autoUpdate = sh;
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    const x = cv.getContext('2d'), img = this.img || (this.img = x.createImageData(W, H)), d = img.data;
    for (let y = 0; y < H; y++) {
      const s0 = (H - 1 - y) * W * 4, d0 = y * W * 4;
      for (let i = 0; i < W * 4; i += 4) { d[d0 + i] = toSrgb[buf[s0 + i]]; d[d0 + i + 1] = toSrgb[buf[s0 + i + 1]]; d[d0 + i + 2] = toSrgb[buf[s0 + i + 2]]; d[d0 + i + 3] = buf[s0 + i + 3]; }
    }
    x.putImageData(img, 0, 0);
  }

  // ---------- owning and wearing
  buyError(id) {
    const s = SKINS[id], st = this.game.state;
    if (!s) return 'Unknown outfit';
    if (this.w.owned[id]) return '';
    if (st.level < s.level) return `Unlocks at level ${s.level}`;
    if (st.money < s.price) return `You need ₹${(s.price - st.money).toLocaleString('en-IN')} more`;
    return '';
  }
  buy(id) {
    const err = this.buyError(id);
    if (err) return err;
    if (this.w.owned[id]) return '';
    const s = SKINS[id], st = this.game.state;
    st.money -= s.price;
    this.w.owned[id] = true;
    this.game.emit('skin', { key: id });
    this.game.ui.money();
    this.game.save(true);
    return '';
  }
  wear(id) {
    const s = SKINS[id];
    if (!s || !this.w.owned[id]) return 'Buy it first';
    this.w.gender = s.gender;
    if (s.gender === 'f') this.w.fskin = id; else this.w.skin = id;
    this.game.player.setLook();
    this.game.save(true);
    return '';
  }
  setGender(gd) { this.w.gender = gd; this.game.player.setLook(); this.show(this.current()); this.game.save(true); }
  setHair(hs) { this.w.hair = hs; if (this.w.gender === 'f') this.game.player.setLook(); this.show(this.preview); this.game.save(true); }
}
