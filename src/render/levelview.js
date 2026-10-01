// Baut aus den Leveldaten die 3D-Szene: Inseln, Dekoration, Himmel, Meer/Lava, bewegte Plattformen und Tore.
import * as THREE from '../../vendor/three.js';
import { GEO, mat, mesh, Batcher, islandBodyGeo } from './parts.js';
import { mulberry32, hashStr } from '../core/util.js';
import { ELEMENTS } from '../data/elements.js';

// Farben je Material: [Oberseite, Körper, Rand]
const GROUND = {
  grass:    [0x6cc04a, 0x8a6a46, 0x58a63c],
  stone:    [0x9a9690, 0x6e6a66, 0x8a8680],
  basalt:   [0x4a4448, 0x2e2a2c, 0x5a4a4a],
  obsidian: [0x5a4c88, 0x33284e, 0x6e5ea0],
  cliff:    [0x7a8a8a, 0x50605e, 0x8aa0a0],
  metal:    [0x8a929e, 0x4e5662, 0xffc030],
  wall:     [0x7a766e, 0x6a665e, 0x8a8a84],
  pillar:   [0x9a948a, 0x7a7468, 0xaaa498],
};

export const THEMES = {
  sky:    { bg: 0x8fd4ff, horizon: 0xdff4ff, top: 0x5aa8f0, fog: 0xc8ecff, fogN: 55, fogF: 150, sun: 0xfff4d8, sunI: 1.15, hemiS: 0xbfe6ff, hemiG: 0x8aa070, hemiI: 0.85, sea: null },
  forge:  { bg: 0x2a1410, horizon: 0x7a2a14, top: 0x1c0c0c, fog: 0x3a1810, fogN: 35, fogF: 110, sun: 0xffb070, sunI: 0.95, hemiS: 0xff9a60, hemiG: 0x402018, hemiI: 0.75, sea: 'lava' },
  shadow: { bg: 0x1a1236, horizon: 0x56388c, top: 0x0c0624, fog: 0x2a1c4c, fogN: 40, fogF: 130, sun: 0xc8b8ff, sunI: 1.0, hemiS: 0xb0a0f0, hemiG: 0x4a3870, hemiI: 1.05, sea: 'void', stars: true },
  storm:  { bg: 0x3a5c6c, horizon: 0x7a9aa8, top: 0x20343f, fog: 0x587888, fogN: 35, fogF: 120, sun: 0xe0f0ff, sunI: 1.0, hemiS: 0xb0d4e8, hemiG: 0x3a5058, hemiI: 1.0, sea: 'water' },
  hub:    { bg: 0x8fd4ff, horizon: 0xdff4ff, top: 0x5aa8f0, fog: 0xc8ecff, fogN: 60, fogF: 160, sun: 0xfff4d8, sunI: 1.2, hemiS: 0xbfe6ff, hemiG: 0x8aa070, hemiI: 0.9, sea: null },
};

function skyDome(th) {
  const g = new THREE.SphereGeometry(400, 24, 16);
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  const top = new THREE.Color(th.top), hor = new THREE.Color(th.horizon), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = g.attributes.position.getY(i) / 400;
    const k = Math.pow(Math.max(0, y), 0.6);
    c.copy(hor).lerp(top, k);
    if (y < 0) c.copy(hor).lerp(new THREE.Color(th.bg), Math.min(1, -y * 2));
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

function cloudGroup(rng, count, y0, spread) {
  const g = new THREE.Group();
  const m = mat(0xffffff, { opacity: 0.95, basic: true });
  for (let i = 0; i < count; i++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const s = mesh(GEO.sphereLow, 0xffffff, [(k - n / 2) * 2.2 + rng(), rng() * 0.8, rng() * 1.5], [2 + rng() * 2, 1.2 + rng() * 0.8, 1.8 + rng() * 1.4], { material: m });
      c.add(s);
    }
    c.position.set((rng() - 0.5) * spread, y0 + rng() * 8, (rng() - 0.5) * spread);
    c.userData.drift = 0.3 + rng() * 0.5;
    g.add(c);
  }
  return g;
}

export class LevelView {
  constructor(level, quality) {
    this.level = level;
    this.group = new THREE.Group();
    this.theme = THEMES[level.theme] || THEMES.sky;
    this.movers = []; this.crumbles = []; this.gateMeshes = new Map(); this.anim = [];
    this.rng = mulberry32(hashStr(level.id));
    this.q = quality;
    this.build();
  }

  build() {
    const lv = this.level, th = this.theme, rng = this.rng;
    const g = this.group;
    this.sky = skyDome(th); g.add(this.sky);
    const statics = new Batcher();
    const decorOK = this.q.decor;

    for (const b of lv.boxes) {
      if (b.gate) { this.addGate(b); continue; }
      if (b.prop) { this.addProp(b, statics); continue; }
      const kind = b.mat || 'grass';
      if (b.mover || b.crumble) { this.addMovable(b, kind); continue; }
      this.addIsland(statics, b, kind);
      if (decorOK && !b.nodecor) this.decorate(statics, b, kind);
    }
    const sm = statics.build(this.q.shadows);
    if (sm) g.add(sm);
    this.addSea();
    this.addBackdrop();
    this.addGoal();
    this.addVents();
  }

  addIsland(st, b, kind) {
    const cl = GROUND[kind] || GROUND.grass;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, ex = b.x1 - b.x0, ez = b.z1 - b.z0, th = b.y1 - b.y0;
    // Körper (unten schmal)
    const body = islandBodyGeo();
    st.add(body, cl[1], cx, b.y1 - 0.4 - th / 2, cz, ex * 0.98, th - 0.4, ez * 0.98);
    st.add(GEO.box, cl[2], cx, b.y1 - 0.45, cz, ex, 0.5, ez);   // Randband
    st.add(GEO.box, cl[0], cx, b.y1 - 0.12, cz, ex * 0.985, 0.26, ez * 0.985);   // Oberseite
    // Muster/Kanten je Material
    if (kind === 'basalt') { // glühende Risse
      const n = Math.max(2, Math.round((ex + ez) / 6));
      for (let i = 0; i < n; i++) {
        const horiz = this.rng() < 0.5;
        const x = cx + (this.rng() - 0.5) * ex * 0.8, z = cz + (this.rng() - 0.5) * ez * 0.8;
        st.add(GEO.box, 0xff5a1a, x, b.y1 + 0.011, z, horiz ? 1.6 + this.rng() * 1.6 : 0.09, 0.02, horiz ? 0.09 : 1.6 + this.rng() * 1.6);
      }
    } else if (kind === 'stone' || kind === 'obsidian' || kind === 'cliff') { // Fugen/Platten
      const col = kind === 'obsidian' ? 0x2e2548 : kind === 'cliff' ? 0x66787a : 0x84807a;
      const nx = Math.floor(ex / 3), nz = Math.floor(ez / 3);
      for (let i = 1; i < nx; i++) st.add(GEO.box, col, b.x0 + (i * ex) / nx, b.y1 + 0.011, cz, 0.06, 0.02, ez * 0.97);
      for (let i = 1; i < nz; i++) st.add(GEO.box, col, cx, b.y1 + 0.011, b.z0 + (i * ez) / nz, ex * 0.97, 0.02, 0.06);
    }
    // Hängende Zapfen unten
    const nSp = Math.max(1, Math.round((ex + ez) / 8));
    for (let i = 0; i < nSp; i++) {
      const x = cx + (this.rng() - 0.5) * ex * 0.45, z = cz + (this.rng() - 0.5) * ez * 0.45;
      st.add(GEO.cone, cl[1], x, b.y0 - 0.3, z, 0.5 + this.rng() * 0.4, 1.4 + this.rng() * 1.3, 0.5 + this.rng() * 0.4, Math.PI);
    }
  }

  addProp(b, st) {
    const kind = b.mat === 'pillar' ? 'pillar' : 'wall';
    const cl = GROUND[kind];
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, ex = b.x1 - b.x0, ez = b.z1 - b.z0, h = b.y1 - b.y0;
    st.add(GEO.box, cl[0], cx, b.y0 + h / 2, cz, ex, h, ez);
    st.add(GEO.box, cl[2], cx, b.y1 + 0.1, cz, ex * 1.18, 0.22, ez * 1.18);
    st.add(GEO.box, cl[2], cx, b.y0 + 0.2, cz, ex * 1.14, 0.4, ez * 1.14);
    if (this.level.theme === 'forge') st.add(GEO.sphere, 0xff7a2a, cx, b.y1 + 0.5, cz, 0.28, 0.28, 0.28);
    else if (this.level.theme === 'shadow') st.add(GEO.octa, 0xb05cff, cx, b.y1 + 0.7, cz, 0.22, 0.34, 0.22);
  }

  addMovable(b, kind) {
    const cl = GROUND[kind] || GROUND.grass;
    const ex = b.x1 - b.x0, ez = b.z1 - b.z0, th = b.y1 - b.y0;
    const g = new THREE.Group();
    const body = mesh(GEO.box, cl[1], [0, -th / 2 + 0.1, 0], [ex * 0.96, th - 0.1, ez * 0.96], { shadow: true });
    const top = mesh(GEO.box, cl[0], [0, -0.1, 0], [ex, 0.22, ez]);
    top.castShadow = true; top.receiveShadow = true; body.castShadow = true;
    g.add(body); g.add(top);
    if (kind === 'metal' || b.mover) { // Warnstreifen am Rand
      const stripe = mesh(GEO.box, 0xffc030, [0, -0.05, 0], [ex + 0.04, 0.12, ez + 0.04]);
      stripe.scale.set(ex + 0.06, 0.12, ez + 0.06);
      g.add(stripe);
      top.scale.set(ex - 0.5, 0.26, ez - 0.5);
    }
    if (b.crumble) {
      for (let i = 0; i < 4; i++) g.add(mesh(GEO.box, 0x15101e, [(this.rng() - 0.5) * ex * 0.8, 0.012, (this.rng() - 0.5) * ez * 0.8], [0.9, 0.03, 0.06], { ry: this.rng() * 3 }));
    }
    g.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
    this.group.add(g);
    const rec = { b, g, shake: 0 };
    (b.crumble ? this.crumbles : this.movers).push(rec);
    b._view = rec;
  }

  addGate(b) {
    const el = ELEMENTS[b.gate.el];
    const ex = b.x1 - b.x0, ez = b.z1 - b.z0, h = b.y1 - b.y0;
    const g = new THREE.Group();
    const wall = mesh(GEO.box, el.color, [0, 0, 0], [ex, h, ez], { material: mat(el.color, { opacity: 0.38, emissive: 0.9 }) });
    g.add(wall);
    // Rahmen
    const frame = mat(0x4a4660);
    const long = ex > ez;
    for (const sgn of [-1, 1]) g.add(mesh(GEO.box, 0x4a4660, [long ? sgn * ex / 2 : 0, 0, long ? 0 : sgn * ez / 2], [0.5, h + 0.4, 0.5], { material: frame }));
    g.add(mesh(GEO.box, 0x4a4660, [0, h / 2, 0], long ? [ex + 0.5, 0.35, ez + 0.3] : [ex + 0.3, 0.35, ez + 0.5], { material: frame }));
    // Zeichen
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'); cx.font = '90px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(el.glyph, 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(1.5, 1.5, 1); sp.position.set(0, 0.3, 0); sp.renderOrder = 5;
    g.add(sp);
    g.position.set((b.x0 + b.x1) / 2, b.y0 + h / 2, (b.z0 + b.z1) / 2);
    this.group.add(g);
    this.gateMeshes.set(b.gate.id, { g, wall, sp, b });
  }

  addSea() {
    const th = this.theme, lv = this.level;
    if (!th.sea) return;
    const y = lv.seaY;
    let c = 0x3a8ac0, o = 0.9, em = 0;
    if (th.sea === 'lava') { c = 0xff5a1a; o = 1; em = 1; }
    else if (th.sea === 'water') { c = 0x2a6a88; o = 0.92; }
    else if (th.sea === 'void') { c = 0x1e1240; o = 1; }
    const geo = new THREE.PlaneGeometry(500, 500, 60, 60);
    geo.rotateX(-Math.PI / 2);
    const m = th.sea === 'lava' ? new THREE.MeshBasicMaterial({ color: c, fog: true }) : new THREE.MeshLambertMaterial({ color: c, transparent: o < 1, opacity: o, emissive: new THREE.Color(c), emissiveIntensity: em });
    const sea = new THREE.Mesh(geo, m);
    sea.position.y = y;
    sea.userData.base = geo.attributes.position.array.slice();
    this.sea = sea; this.group.add(sea);
    if (th.sea === 'lava') {
      this.lavaGlow = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.lavaGlow.rotation.x = -Math.PI / 2; this.lavaGlow.position.y = y + 0.05; this.group.add(this.lavaGlow);
    }
  }

  addBackdrop() {
    const th = this.theme, rng = this.rng, lv = this.level;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const b of lv.boxes) { minX = Math.min(minX, b.x0); maxX = Math.max(maxX, b.x1); minZ = Math.min(minZ, b.z0); maxZ = Math.max(maxZ, b.z1); }
    if (!lv.boxes.length) { minX = maxX = minZ = maxZ = 0; }
    this.center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
    const spread = Math.max(120, maxX - minX + 120, maxZ - minZ + 120);
    if (lv.theme === 'sky') {
      this.clouds = cloudGroup(rng, 26, lv.seaY - 18, spread * 2);
      this.group.add(this.clouds);
    }
    // ferne schwebende Felsen
    const st = new Batcher();
    const n = this.q.decor ? 14 : 6;
    const cols = { sky: [0x7aa860, 0x8a7458], forge: [0x3a3030, 0x2a2224], shadow: [0x3a2e58, 0x241c3c], storm: [0x586a70, 0x40504e] }[lv.theme];
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = 55 + rng() * 80;
      const x = this.center.x + Math.cos(a) * d, z = this.center.z + Math.sin(a) * d, y = lv.seaY + 10 + rng() * 45;
      const s = 6 + rng() * 14;
      st.add(islandBodyGeo(), cols[1], x, y - s * 0.4, z, s, s * 0.9, s);
      st.add(GEO.box, cols[0], x, y + 0.1, z, s, 0.5, s);
      if (lv.theme === 'sky') st.add(GEO.cone, 0x3a8a3a, x, y + 2.5, z, s * 0.16, 4, s * 0.16);
    }
    const m = st.build(false);
    if (m) this.group.add(m);
    // Sterne
    if (th.stars) {
      const pts = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) { const a = rng() * Math.PI * 2, e = rng() * 1.2 - 0.1, r = 350; pts[i * 3] = Math.cos(a) * Math.cos(e) * r; pts[i * 3 + 1] = Math.sin(e) * r; pts[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      this.stars = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
      this.group.add(this.stars);
    }
  }

  addGoal() {
    const lv = this.level;
    if (!lv.goal) return;
    const g = new THREE.Group();
    const ring = mesh(GEO.torus, 0x7fe8ff, [0, 1.6, 0], [1.4, 1.4, 1.4], { material: mat(0x7fe8ff, { emissive: 1, basic: true }) });
    const ring2 = mesh(GEO.torus, 0xffd84a, [0, 1.6, 0], [1.1, 1.1, 1.1], { material: mat(0xffd84a, { emissive: 1, basic: true }) });
    const core = mesh(GEO.disc, 0xffffff, [0, 1.6, 0], [1.25, 1.25, 1.25], { material: mat(0x9ff0ff, { opacity: 0.5, basic: true, add: true, side: 'double' }) });
    core.rotation.x = 0;
    g.add(ring, ring2, core);
    const base = mesh(GEO.cyl, 0x7a766e, [0, 0.1, 0], [1.6, 0.2, 1.6]);
    g.add(base);
    g.position.set(lv.goal[0], lv.goal[1], lv.goal[2]);
    g.visible = !lv.boss;
    this.goal = { g, ring, ring2, core };
    this.group.add(g);
  }
  setGoalVisible(v) { if (this.goal) this.goal.g.visible = v; }

  addVents() {
    this.vents = [];
    for (const z of this.level.zones) {
      if (z.kind !== 'vent') continue;
      const g = new THREE.Group();
      g.add(mesh(GEO.cyl, 0x2a2224, [0, 0.1, 0], [z.r * 0.9, 0.2, z.r * 0.9]));
      const col = mesh(GEO.cyl, 0xffffff, [0, 1.4, 0], [z.r * 0.8, 2.8, z.r * 0.8], { material: mat(0xffffff, { opacity: 0.0, basic: true, add: true }) });
      g.add(col);
      const warn = mesh(GEO.ring, 0xff5a2a, [0, 0.06, 0], [z.r, 1, z.r], { material: mat(0xff5a2a, { opacity: 0.0, basic: true, add: true }) });
      g.add(warn);
      g.position.set(z.x, z.y, z.z);
      this.group.add(g);
      this.vents.push({ z, col, warn });
    }
  }

  // ------------------------------------------------------------ Dekoration
  decorate(st, b, kind) {
    const rng = this.rng, th = this.level.theme;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, ex = b.x1 - b.x0, ez = b.z1 - b.z0, y = b.y1;
    const area = ex * ez;
    const n = Math.min(14, Math.max(2, Math.round(area / 14)));
    const avoid = [];
    for (const p of this.level.pickups) if (Math.abs(p.y - y) < 2 && p.x > b.x0 - 1 && p.x < b.x1 + 1 && p.z > b.z0 - 1 && p.z < b.z1 + 1) avoid.push([p.x, p.z, 1.2]);
    for (const e of this.level.enemies) avoid.push([e.x, e.z, 1.6]);
    for (const c of this.level.checkpoints) avoid.push([c.x, c.z, 2.2]);
    if (this.level.goal) avoid.push([this.level.goal[0], this.level.goal[2], 2.4]);
    avoid.push([this.level.spawn[0], this.level.spawn[2], 2.4]);
    const ok = (x, z, r) => avoid.every((a) => (a[0] - x) ** 2 + (a[1] - z) ** 2 > (a[2] + r) ** 2) && this.level.boxes.every((q) => !q.prop || x + r < q.x0 || x - r > q.x1 || z + r < q.z0 || z - r > q.z1 || q.y1 < y - 1);
    for (let i = 0; i < n; i++) {
      // bevorzugt am Rand
      const edge = rng() < 0.75;
      let x, z;
      if (edge) {
        const side = Math.floor(rng() * 4), t = rng();
        const m = 0.55 + rng() * 0.6;
        if (side === 0) { x = b.x0 + m; z = b.z0 + t * ez; } else if (side === 1) { x = b.x1 - m; z = b.z0 + t * ez; }
        else if (side === 2) { z = b.z0 + m; x = b.x0 + t * ex; } else { z = b.z1 - m; x = b.x0 + t * ex; }
      } else { x = b.x0 + 1.5 + rng() * (ex - 3); z = b.z0 + 1.5 + rng() * (ez - 3); }
      if (!ok(x, z, 0.6)) continue;
      this.decorOne(st, th, kind, x, y, z, rng);
    }
    // Gras-Büschel / Details
    if (th === 'sky' && kind === 'grass') {
      for (let i = 0; i < Math.min(30, area / 4); i++) {
        const x = b.x0 + 0.4 + rng() * (ex - 0.8), z = b.z0 + 0.4 + rng() * (ez - 0.8);
        if (!ok(x, z, 0.2)) continue;
        const c = rng() < 0.2 ? [0xff7aa8, 0xffe27a, 0xffffff, 0xb08aff][Math.floor(rng() * 4)] : 0x4aa83a;
        if (rng() < 0.2) { st.add(GEO.cylLow, 0x3a8a2a, x, y + 0.12, z, 0.02, 0.24, 0.02); st.add(GEO.sphereLow, c, x, y + 0.26, z, 0.09, 0.09, 0.09); }
        else st.add(GEO.coneLow, c, x, y + 0.14, z, 0.07, 0.28, 0.07);
      }
    }
  }

  decorOne(st, th, kind, x, y, z, rng) {
    const r = rng();
    if (th === 'sky') {
      if (kind === 'grass') {
        if (r < 0.4) { const h = 1.2 + rng() * 1.1; st.add(GEO.cylLow, 0x6a4a2a, x, y + h / 2, z, 0.14, h, 0.14); st.add(GEO.coneLow, 0x2f9a3a, x, y + h + 0.5, z, 0.7, 1.4, 0.7); st.add(GEO.coneLow, 0x3fae46, x, y + h + 1.1, z, 0.5, 1.0, 0.5); }
        else if (r < 0.65) st.add(GEO.sphereLow, 0x4aa83a, x, y + 0.25, z, 0.5, 0.35, 0.5);
        else if (r < 0.85) st.add(GEO.ico, 0x9a948c, x, y + 0.2, z, 0.35 + rng() * 0.3, 0.3, 0.35);
        else { st.add(GEO.cylLow, 0xf2ead8, x, y + 0.15, z, 0.07, 0.3, 0.07); st.add(GEO.hemi, [0xe8503a, 0xc48ae8][Math.floor(rng() * 2)], x, y + 0.3, z, 0.22, 0.18, 0.22); }
      } else { // Ruinen
        if (r < 0.45) { const h = 0.8 + rng() * 1.8; st.add(GEO.box, 0x8a867e, x, y + h / 2, z, 0.5, h, 0.5, 0, rng() * 3); st.add(GEO.box, 0x9a968e, x, y + h + 0.1, z, 0.62, 0.2, 0.62); }
        else if (r < 0.75) st.add(GEO.ico, 0x7a766e, x, y + 0.25, z, 0.45, 0.35, 0.45, rng(), rng(), rng());
        else { st.add(GEO.cylLow, 0x6a5a40, x, y + 0.6, z, 0.06, 1.2, 0.06); st.add(GEO.sphereLow, 0x9ac8d8, x, y + 1.2, z, 0.3, 0.2, 0.3); }
      }
    } else if (th === 'forge') {
      if (r < 0.35) st.add(GEO.ico, 0x3a3234, x, y + 0.3, z, 0.5 + rng() * 0.3, 0.45, 0.5, rng(), rng(), 0);
      else if (r < 0.6) { st.add(GEO.cone, 0xff5a1a, x, y + 0.5, z, 0.15, 1.0, 0.15); st.add(GEO.cone, 0xffa030, x + 0.15, y + 0.3, z, 0.1, 0.6, 0.1); }
      else if (r < 0.8) { st.add(GEO.box, 0x4a4650, x, y + 0.3, z, 0.9, 0.6, 0.5); st.add(GEO.box, 0x5a5660, x, y + 0.65, z, 1.2, 0.2, 0.6); }
      else { const h = 1.6 + rng(); st.add(GEO.cylLow, 0x3a3640, x, y + h / 2, z, 0.2, h, 0.2); st.add(GEO.sphereLow, 0xff7a2a, x, y + h + 0.1, z, 0.22, 0.22, 0.22); }
    } else if (th === 'shadow') {
      if (r < 0.3) { const h = 1.5 + rng() * 1.3; st.add(GEO.cylLow, 0x2e2440, x, y + h / 2, z, 0.1, h, 0.1); st.add(GEO.cylLow, 0x2e2440, x + 0.25, y + h * 0.8, z, 0.05, 0.9, 0.05, 0, 0, -0.9); st.add(GEO.cylLow, 0x2e2440, x - 0.25, y + h * 0.65, z, 0.05, 0.8, 0.05, 0, 0, 0.9); }
      else if (r < 0.6) { st.add(GEO.octa, 0x9a5cf0, x, y + 0.5, z, 0.2, 0.55, 0.2); st.add(GEO.octa, 0xb07cff, x + 0.25, y + 0.3, z + 0.1, 0.13, 0.35, 0.13); }
      else if (r < 0.8) { st.add(GEO.box, 0x5a5470, x, y + 0.4, z, 0.5, 0.8, 0.12, 0, rng() * 0.5, 0); st.add(GEO.cylLow, 0x5a5470, x, y + 0.82, z, 0.25, 0.12, 0.06, Math.PI / 2, 0, 0); }
      else { st.add(GEO.cylLow, 0x3a3250, x, y + 0.7, z, 0.06, 1.4, 0.06); st.add(GEO.sphereLow, 0xb08aff, x, y + 1.5, z, 0.16, 0.16, 0.16); }
    } else { // storm
      if (r < 0.35) st.add(GEO.ico, 0x5a6a70, x, y + 0.3, z, 0.55 + rng() * 0.4, 0.45, 0.5, rng(), rng(), 0);
      else if (r < 0.55) { st.add(GEO.cylLow, 0x6a5a40, x, y + 0.5, z, 0.1, 1.0, 0.1); st.add(GEO.cylLow, 0x6a5a40, x + 0.5, y + 0.3, z, 0.1, 0.6, 0.1); }
      else if (r < 0.8) { st.add(GEO.cylLow, 0x8a5a2a, x, y + 0.35, z, 0.35, 0.7, 0.35); st.add(GEO.cylLow, 0x4a3a20, x, y + 0.5, z, 0.37, 0.06, 0.37); }
      else { st.add(GEO.cone, [0xff6a8a, 0xffa04a][Math.floor(rng() * 2)], x, y + 0.4, z, 0.2, 0.8, 0.2); st.add(GEO.cone, 0xff6a8a, x + 0.25, y + 0.25, z, 0.15, 0.5, 0.15); }
    }
  }

  // ------------------------------------------------------------ Laufende Aktualisierung
  update(dt, t, camPos) {
    for (const m of this.movers) { const b = m.b; m.g.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2); }
    for (const c of this.crumbles) {
      const b = c.b, cr = b.crumble;
      c.g.visible = !b.off;
      if (!b.off && cr.t >= 0) { c.g.position.set((b.x0 + b.x1) / 2 + Math.sin(t * 60) * 0.04, b.y1 - (cr.delay - cr.t) * 0.06, (b.z0 + b.z1) / 2 + Math.cos(t * 55) * 0.04); }
      else c.g.position.set((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2);
    }
    for (const [id, gm] of this.gateMeshes) {
      if (gm.b.gate.open) { gm.g.visible = false; continue; }
      gm.wall.material.opacity = 0.32 + Math.sin(t * 3) * 0.08;
      gm.sp.position.y = 0.3 + Math.sin(t * 2) * 0.1;
    }
    if (this.sea) {
      const th = this.theme.sea;
      if (th === 'water' || th === 'lava') {
        const pos = this.sea.geometry.attributes.position, base = this.sea.userData.base;
        const amp = th === 'water' ? 0.7 : 0.25, fr = th === 'water' ? 0.35 : 0.25;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], z = base[i * 3 + 2];
          pos.array[i * 3 + 1] = Math.sin(x * fr + t * 1.4) * amp * 0.5 + Math.cos(z * fr * 1.3 + t * 1.1) * amp * 0.5;
        }
        pos.needsUpdate = true;
      }
      if (camPos) { this.sea.position.x = Math.round(camPos.x / 8) * 8; this.sea.position.z = Math.round(camPos.z / 8) * 8; }
      if (this.lavaGlow) { this.lavaGlow.material.opacity = 0.18 + Math.sin(t * 1.5) * 0.08; if (camPos) { this.lavaGlow.position.x = camPos.x; this.lavaGlow.position.z = camPos.z; } }
    }
    if (this.clouds) for (const c of this.clouds.children) { c.position.x += c.userData.drift * dt; if (c.position.x > 400) c.position.x = -400; }
    if (this.goal) {
      const g = this.goal;
      g.ring.rotation.y = t * 1.2; g.ring2.rotation.x = t * 1.6; g.core.scale.setScalar(1.15 + Math.sin(t * 3) * 0.12);
      g.g.position.y = this.level.goal[1] + Math.sin(t * 2) * 0.05;
    }
    for (const v of this.vents) {
      const z = v.z;
      v.col.material.opacity = z.active ? 0.5 : 0;
      v.warn.material.opacity = z.warn ? 0.4 + Math.sin(t * 20) * 0.3 : 0;
    }
    if (this.sky && camPos) this.sky.position.copy(camPos);
    if (this.stars && camPos) this.stars.position.copy(camPos);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
      if (o.material && o.material.map) o.material.map.dispose();
    });
  }
}
