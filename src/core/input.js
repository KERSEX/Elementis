// Eingabe: Tastatur + Maus (Spieler 1), Ziffernblock (Spieler 2), Gamepad, Touch.
import { DEFAULT_KEYS } from './save.js';

const P2 = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', jump: 'Numpad0', a1: 'Numpad1', a2: 'Numpad2', sp: 'Numpad3', use: 'Numpad5' };

export class Input {
  constructor(canvas, getKeys) {
    this.canvas = canvas;
    this.getKeys = getKeys;
    this.down = new Set();
    this.pressed = new Set();     // seit dem letzten Frame gedrückt
    this.mouse = { x: 0, y: 0, left: false, right: false, active: false, moved: false };
    this.pad = null;
    this.touch = { mx: 0, mz: 0, a1: false, a2: false, sp: false, jumpEdge: false, jumpHeld: false, useEdge: false, ax: 0, az: 0, aim: false, on: false };
    this.lastDevice = 'kb';
    this.menuHandler = null;
    this.blocked = false;
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => { this.down.clear(); this.mouse.left = this.mouse.right = false; });
    canvas.addEventListener('mousedown', (e) => { this.mouse.active = true; if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.mouse.right = true; this.lastDevice = 'kb'; e.preventDefault(); });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    window.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.active = true; this.mouse.moved = true; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('gamepadconnected', () => {});
  }
  onKey(e, isDown) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (this.rebinding) { if (isDown) { this.rebinding(e.code); e.preventDefault(); } return; }
    if (isDown) {
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (!e.metaKey && !e.ctrlKey && (e.code.startsWith('Arrow') || e.code === 'Space' || e.code.startsWith('Numpad') || e.code === 'Tab')) e.preventDefault();
      this.lastDevice = e.code.startsWith('Numpad') || e.code.startsWith('Arrow') ? 'p2' : 'kb';
      if (this.menuHandler) this.menuHandler(e);
    } else this.down.delete(e.code);
  }
  wasPressed(code) { return this.pressed.has(code); }

  // Gamepad auslesen (ersten echten Controller)
  readPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      if (/steering|wheel|pedal|microphone|mic\b/i.test(p.id) || p.axes.length < 2 || p.buttons.length < 8) continue;
      return p;
    }
    return null;
  }

  // Eingaben für Spieler idx (0 = Tastatur+Maus/Gamepad, 1 = Ziffernblock)
  poll(idx, view, player, aimY) {
    const K = this.getKeys();
    const out = { mx: 0, mz: 0, ax: 0, az: 0, aimDist: 4, aimMode: 'none', a1: false, a2: false, sp: false, jumpEdge: false, jumpHeld: false, useEdge: false, pause: false };
    const keys = idx === 0 ? K : P2;
    const d = (c) => this.down.has(c), pr = (c) => this.pressed.has(c);
    if (idx === 1 && !this.p2Active) return out;
    let mx = 0, mz = 0;
    if (d(keys.left)) mx -= 1; if (d(keys.right)) mx += 1; if (d(keys.up)) mz -= 1; if (d(keys.down)) mz += 1;
    out.a1 = d(keys.a1); out.a2 = d(keys.a2); out.sp = d(keys.sp) || (idx === 0 && d('KeyQ'));
    out.jumpHeld = d(keys.jump); out.jumpEdge = pr(keys.jump); out.useEdge = pr(keys.use);
    if (idx === 0) {
      if (this.mouse.left) out.a1 = true;
      if (this.mouse.right) out.a2 = true;
      // Maus zielt (nur wenn die Maus bewegt wurde)
      if (player && this.mouse.active && view && this.lastDevice === 'kb' && !this.touch.on) {
        const gp = view.groundPoint(this.mouse.x, this.mouse.y, player.y + 0.9);
        if (gp) {
          const dx = gp.x - player.x, dz = gp.z - player.z, dl = Math.hypot(dx, dz);
          if (dl > 0.3) { out.ax = dx / dl; out.az = dz / dl; out.aimDist = dl; out.aimMode = 'mouse'; }
        }
      }
      // Gamepad
      const pad = this.readPad();
      if (pad) {
        const ax = (v) => (Math.abs(v) < 0.18 ? 0 : v);
        const lx = ax(pad.axes[0]), lz = ax(pad.axes[1]);
        if (lx || lz) { mx = lx; mz = lz; this.lastDevice = 'pad'; }
        const rx = ax(pad.axes[2] || 0), rz = ax(pad.axes[3] || 0);
        const b = (i) => pad.buttons[i] && pad.buttons[i].pressed;
        out.a1 = out.a1 || b(2) || (pad.buttons[7] && pad.buttons[7].value > 0.4);
        out.a2 = out.a2 || b(1); out.sp = out.sp || b(3);
        const jp = b(0);
        out.jumpHeld = out.jumpHeld || jp;
        if (jp && !this._padJump) out.jumpEdge = true;
        this._padJump = jp;
        const us = b(5); if (us && !this._padUse) out.useEdge = true; this._padUse = us;
        const st = b(9); if (st && !this._padStart) out.pause = true; this._padStart = st;
        if (rx || rz) { const l = Math.hypot(rx, rz); out.ax = rx / l; out.az = rz / l; out.aimMode = 'pad'; out.aimDist = 6; this.lastDevice = 'pad'; }
        if (out.jumpEdge || out.a1 || out.a2 || out.sp) this.lastDevice = 'pad';
      }
      // Touch
      if (this.touch.on) {
        const t = this.touch;
        if (t.mx || t.mz) { mx = t.mx; mz = t.mz; }
        out.a1 = out.a1 || t.a1; out.a2 = out.a2 || t.a2; out.sp = out.sp || t.sp;
        if (t.jumpEdge) { out.jumpEdge = true; t.jumpEdge = false; }
        out.jumpHeld = out.jumpHeld || t.jumpHeld;
        if (t.useEdge) { out.useEdge = true; t.useEdge = false; }
      }
    }
    out.mx = mx; out.mz = mz;
    if (pr(keys.pause || 'Escape') && idx === 0) out.pause = true;
    return out;
  }
  endFrame() { this.pressed.clear(); this.mouse.moved = false; }
}
