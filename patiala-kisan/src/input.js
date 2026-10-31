// Touch joystick (appears wherever the thumb lands outside the buttons) plus keyboard fallback.
export class Input {
  constructor(game) {
    this.game = game;
    this.x = 0; this.y = 0;          // joystick vector, screen space, length ≤ 1
    this.active = false;
    this.keys = new Set();
    this.base = document.getElementById('joy');
    this.knob = document.getElementById('knob');
    this.pointer = null;
    this.radius = 52;
    const area = document.getElementById('touch');
    area.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key === 'e' || e.key === 'Enter') { this.game.ui.pressAction(); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.up({ pointerId: this.pointer }); });
    // iOS: block pinch zoom and double-tap zoom
    for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', (e) => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
  }

  down(e) {
    if (this.pointer !== null) return;
    this.game.audio.unlock();
    this.pointer = e.pointerId;
    this.ox = e.clientX; this.oy = e.clientY;
    this.active = true;
    this.base.style.transform = `translate(${this.ox - 60}px, ${this.oy - 60}px)`;
    this.base.classList.add('on');
    this.knob.style.transform = 'translate(0px, 0px)';
    e.preventDefault();
  }
  move(e) {
    if (e.pointerId !== this.pointer) return;
    let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
    const d = Math.hypot(dx, dy), max = this.radius;
    if (d > max) {
      // drag the base along so the thumb never "runs off" the stick
      const k = (d - max) / d;
      this.ox += dx * k; this.oy += dy * k;
      dx = e.clientX - this.ox; dy = e.clientY - this.oy;
      this.base.style.transform = `translate(${this.ox - 60}px, ${this.oy - 60}px)`;
    }
    const sens = this.game.state?.settings.sens ?? 1;
    this.x = Math.max(-1, Math.min(1, dx / max * sens));
    this.y = Math.max(-1, Math.min(1, dy / max * sens));
    const l = Math.hypot(this.x, this.y);
    if (l > 1) { this.x /= l; this.y /= l; }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    e.preventDefault();
  }
  up(e) {
    if (e.pointerId !== this.pointer) return;
    this.pointer = null;
    this.active = false;
    this.x = this.y = 0;
    this.base.classList.remove('on');
  }

  // Combined movement vector (x right, y down the screen)
  vector() {
    let x = this.x, y = this.y;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, len: Math.min(1, l) };
  }
}
