// Little 3D portraits of the staff for the menus: the same character models, rendered once
// off-screen into an image (cached), so the Staff menu shows the real people who work the farm.
import * as THREE from 'three';
import { makeHuman } from './models.js';

const cache = {};
let rig = null;

function setup() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a66, 2.0));
  const key = new THREE.DirectionalLight(0xfff3dd, 2.8);
  key.position.set(2, 3, 4);
  const rim = new THREE.DirectionalLight(0xbfdcff, 1.4);
  rim.position.set(-3, 2, -2);
  scene.add(key, rim);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  cam.position.set(0.6, 1.95, 2.55);
  cam.lookAt(0, 1.62, 0);
  const S = 192;
  const rt = new THREE.WebGLRenderTarget(S, S);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  rig = { scene, cam, rt, S, canvas, buf: new Uint8Array(S * S * 4) };
}

const toSrgb = (v) => {
  const c = v / 255;
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
};

// key: cache id, look: makeHuman options, tool: item shown in the hand
export function portrait(renderer, key, look, tool = null) {
  if (cache[key]) return cache[key];
  try {
    if (!rig) setup();
    const { scene, cam, rt, S, canvas, buf } = rig;
    const h = makeHuman({ ...look, tools: true });
    h.blob.visible = false;
    for (const k in h.tools) h.tools[k].visible = k === tool;
    h.armR.rotation.x = tool ? -0.5 : 0;
    h.group.rotation.y = 0.3;
    scene.add(h.group);
    const prevTarget = renderer.getRenderTarget(), prevColor = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    const shadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevColor, prevAlpha);
    renderer.shadowMap.autoUpdate = shadows;
    scene.remove(h.group);
    h.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    // flip rows and convert linear → sRGB
    const x = canvas.getContext('2d'), img = x.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) {
      const s = ((S - 1 - y) * S + i) * 4, d = (y * S + i) * 4;
      img.data[d] = toSrgb(buf[s]); img.data[d + 1] = toSrgb(buf[s + 1]); img.data[d + 2] = toSrgb(buf[s + 2]); img.data[d + 3] = buf[s + 3];
    }
    x.putImageData(img, 0, 0);
    cache[key] = canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('portrait failed', e);
    cache[key] = '';
  }
  return cache[key];
}
