// Effekte: Partikel, Ringe (Druckwellen), Schwünge, Blitze, Warnkreise.
import * as THREE from '../../vendor/three.js';
import { GEO, mat, mesh } from './parts.js';
import { ELEMENTS } from '../data/elements.js';

const MAXP = 700;
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Color();

export class Particles {
  constructor(scene, max = MAXP) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(GEO.ico, new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    const c = new THREE.Color(1, 1, 1);
    this.mesh.setColorAt(0, c);
    scene.add(this.mesh);
    this.list = [];
    this.free = [];
  }
  spawn(x, y, z, vx, vy, vz, color, size, life, grav = 0, shrink = true) {
    if (this.list.length >= this.max) return;
    this.list.push({ x, y, z, vx, vy, vz, c: color, s: size, life, max: life, g: grav, shrink });
  }
  burst(x, y, z, color, n = 10, speed = 4, size = 0.14, life = 0.5, grav = 6, up = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI * 0.8;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.spawn(x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp * up + speed * 0.3, Math.sin(a) * Math.cos(e) * sp, color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), grav);
    }
  }
  update(dt) {
    const L = this.list;
    let w = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      L[w++] = p;
    }
    L.length = w;
    this.mesh.count = w;
    for (let i = 0; i < w; i++) {
      const p = L[i];
      const k = p.life / p.max;
      const s = p.s * (p.shrink ? k : 1);
      tmpM.compose(tmpP.set(p.x, p.y, p.z), tmpQ.identity(), tmpS.set(s, s, s));
      this.mesh.setMatrixAt(i, tmpM);
      tmpC.setHex(p.c);
      this.mesh.setColorAt(i, tmpC);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// Ringe, Schwünge, Blitze, Linien: kurzlebige Meshes
export class Flashes {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.pool = [];
  }
  _mesh(geo, material) {
    const m = this.pool.pop() || new THREE.Mesh(geo, material);
    m.geometry = geo; m.material = material; m.visible = true;
    this.scene.add(m);
    return m;
  }
  ring(x, y, z, r, color, dur = 0.4, o = {}) {
    const material = mat(color, { opacity: 0.8, basic: true, add: true, side: 'double' });
    const m = this._mesh(GEO.ring, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(0, 0, 0);
    const disc = o.disc ? this._mesh(GEO.disc, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })) : null;
    if (disc) disc.position.set(x, y, z);
    this.list.push({ m, disc, t: 0, dur, r, kind: 'ring', start: o.start ?? 0.25, pull: !!o.pull });
  }
  swing(x, y, z, face, range, arcDeg, color, big) {
    const arc = (arcDeg * Math.PI) / 180;
    const geo = new THREE.RingGeometry(range * 0.35, range, 20, 1, -arc / 2, arc);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 0.25, z);
    // Ring-Segment ist um +X zentriert, Blickrichtung ist +Z → um 90° drehen
    m.rotation.y = face - Math.PI / 2;
    this.scene.add(m);
    this.list.push({ m, t: 0, dur: big ? 0.26 : 0.18, kind: 'swing', geo, spin: arc * 0.35 });
  }
  line(x1, y1, z1, x2, y2, z2, color, dur = 0.18, w = 0.12) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, len = Math.hypot(dx, dy, dz) || 1;
    const m = new THREE.Mesh(GEO.cyl, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    m.scale.set(w, len, w);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    this.scene.add(m);
    this.list.push({ m, t: 0, dur, kind: 'line' });
  }
  bolt(x, y, z, color = 0xdff4ff) {
    // senkrechter Blitzstrahl
    this.line(x + 0.3, y + 22, z, x, y, z, color, 0.28, 0.35);
    this.line(x - 0.2, y + 12, z + 0.2, x, y, z, 0xffffff, 0.2, 0.15);
    this.ring(x, y + 0.1, z, 2.4, color, 0.35);
  }
  update(dt) {
    let w = 0;
    for (const f of this.list) {
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) {
        this.scene.remove(f.m); if (f.disc) this.scene.remove(f.disc);
        if (f.kind === 'swing') f.geo.dispose();
        if (f.kind === 'ring') { this.pool.push(f.m); f.m.material.dispose(); if (f.disc) { f.disc.material.dispose(); this.pool.push(f.disc); } }
        else { f.m.material.dispose(); }
        continue;
      }
      if (f.kind === 'ring') {
        const e = f.pull ? 1 - k : Math.min(1, k / 0.55);
        const s = f.r * (f.pull ? 0.2 + 0.8 * (1 - k) : 0.15 + 0.85 * (1 - Math.pow(1 - e, 2)));
        f.m.scale.set(s, 1, s);
        f.m.material.opacity = 0.85 * (1 - k);
        if (f.disc) { f.disc.scale.set(s, 1, s); f.disc.material.opacity = 0.3 * (1 - k); }
      } else if (f.kind === 'swing') {
        f.m.material.opacity = 0.75 * (1 - k);
        const s = 0.85 + k * 0.3; f.m.scale.set(s, 1, s);
      } else if (f.kind === 'line') {
        f.m.material.opacity = 0.95 * (1 - k);
      }
      this.list[w++] = f;
    }
    this.list.length = w;
  }
}

// Schadenszahlen und Hinweise im DOM
export class FloatText {
  constructor(layer, project) {
    this.layer = layer; this.project = project; this.items = []; this.pool = [];
    this.enabled = true;
  }
  add(x, y, z, text, cls) {
    if (!this.enabled && cls !== 'gold' && cls !== 'heal') return;
    if (this.items.length > 40) return;
    const el = this.pool.pop() || document.createElement('div');
    el.className = 'dmg ' + (cls || '');
    el.textContent = text;
    this.layer.appendChild(el);
    this.items.push({ el, x, y, z, t: 0, dx: (Math.random() - 0.5) * 40 });
  }
  update(dt, w, h) {
    let k = 0;
    for (const it of this.items) {
      it.t += dt;
      if (it.t > 0.9) { it.el.remove(); this.pool.push(it.el); continue; }
      const p = this.project(it.x, it.y + it.t * 1.6, it.z);
      if (p) {
        const sc = it.t < 0.12 ? 0.6 + it.t * 5 : 1;
        it.el.style.transform = `translate(${p.x + it.dx * it.t}px, ${p.y}px) translate(-50%,-50%) scale(${sc})`;
        it.el.style.opacity = it.t > 0.6 ? String(1 - (it.t - 0.6) / 0.3) : '1';
        it.el.style.display = '';
      } else it.el.style.display = 'none';
      this.items[k++] = it;
    }
    this.items.length = k;
  }
  clear() { for (const it of this.items) it.el.remove(); this.items.length = 0; }
}

export function elColor(el) { return (ELEMENTS[el] || ELEMENTS.magie).color; }
