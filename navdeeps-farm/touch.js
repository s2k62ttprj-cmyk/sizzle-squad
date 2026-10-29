'use strict';
/* Navdeep's Farm - on-screen controls for iPad and phone browsers, and tap/click support in menus. */

function setupTouch() {
  if (!window.AndroidTV) document.body.classList.add('web');
  // Tapping or clicking a menu item picks it, so menus work without a remote or keyboard.
  $('menu').addEventListener('click', e => {
    const top = UI.stack[UI.stack.length - 1];
    if (!top) return;
    const item = e.target.closest('.item');
    if (!item) { if (top.sel === undefined) UI.key('ok'); return; }
    const k = [...item.parentNode.children].indexOf(item);
    if (top.sel !== k) top.sel = k;
    Sound.unlock();
    UI.key('ok');
  });
  if (!touchMode) return;
  document.body.classList.add('touch');
  $('hud-hint').querySelector('.key').textContent = 'A';
  const el = (tag, id, cls, html = '') => { const e = document.createElement(tag); e.id = id; e.className = cls; e.innerHTML = html; document.body.appendChild(e); return e; };

  // Arrow pad: slide a thumb around it to walk; the direction follows the thumb.
  const pad = el('div', 'pad', 'touch-ui', `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path class="up" d="M50 8 L64 28 L36 28 Z"/><path class="down" d="M50 92 L64 72 L36 72 Z"/>
    <path class="left" d="M8 50 L28 36 L28 64 Z"/><path class="right" d="M92 50 L72 36 L72 64 Z"/></svg>`);
  let padDir = null;
  const setDir = d => {
    if (d === padDir) return;
    if (padDir) handleKey(padDir, false, false);
    padDir = d;
    pad.dataset.dir = d || '';
    if (d) handleKey(d, true, false);
  };
  const follow = e => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    setDir(Math.hypot(dx, dy) < r.width * 0.12 ? null : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
  };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); follow(e); });
  pad.addEventListener('pointermove', e => { if (pad.hasPointerCapture(e.pointerId)) follow(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(ev, () => setDir(null));

  // A = OK (hold it to switch seeds), B = back / menu, and a quick seed-switch button.
  const buttons = el('div', 'buttons', 'touch-ui');
  const button = (id, label, key, title) => {
    const b = document.createElement('button');
    b.id = id;
    b.className = 'tbtn';
    b.textContent = label;
    b.setAttribute('aria-label', title);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down'); handleKey(key, true, false); });
    const up = () => { if (!b.classList.contains('down')) return; b.classList.remove('down'); handleKey(key, false, false); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    buttons.appendChild(b);
  };
  button('btn-next', '⇄', 'next', 'Switch seeds');
  button('btn-b', 'B', 'back', 'Back or menu');
  button('btn-a', 'A', 'ok', 'Use');

  // Keep the page from scrolling or zooming under the player's thumbs.
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
}
