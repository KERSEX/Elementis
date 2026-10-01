// Verbindet die Spielwelt (sim) mit Three.js: Szene, Kamera, Figuren, Effekte, Ereignisse.
import * as THREE from '../../vendor/three.js';
import { GEO, mat, mesh, Batcher, islandBodyGeo } from './parts.js';
import { buildHero, buildEnemy, buildElite, buildBoss, buildAlly, buildHat } from './models.js';
import { LevelView, THEMES } from './levelview.js';
import { Particles, Flashes, FloatText, elColor } from './fx.js';
import { groundAt } from '../sim/physics.js';
import { ELEMENTS } from '../data/elements.js';
import { ALL_CHARS } from '../data/heroes.js';
import { BOSSES, ELITES } from '../data/enemies.js';
import { clamp, lerp } from '../core/util.js';

export const QUALITY = {
  high:    { id: 'high',    pr: 2,   shadows: 2048, decor: true,  aa: true,  label: 'Hoch' },
  medium:  { id: 'medium',  pr: 1.5, shadows: 1024, decor: true,  aa: true,  label: 'Mittel' },
  low:     { id: 'low',     pr: 1,   shadows: 0,    decor: true,  aa: false, label: 'Niedrig' },
  verylow: { id: 'verylow', pr: 0.6, shadows: 0,    decor: false, aa: false, label: 'Sehr niedrig' },
};
export const Q_ORDER = ['high', 'medium', 'low', 'verylow'];

const P_COLORS = [0x7fe8ff, 0xffb42a, 0x7dff6a, 0xff7ac8];

export class GameView {
  constructor(canvas, layers, qualityId) {
    this.canvas = canvas;
    this.quality = QUALITY[qualityId] || QUALITY.high;
    const gl = { canvas, antialias: this.quality.aa, powerPreference: 'high-performance', alpha: false };
    this.renderer = new THREE.WebGLRenderer(gl);
    this.renderer.setClearColor(0x0b1024);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
    this.hemi = new THREE.HemisphereLight(0xbfe6ff, 0x8aa070, 0.85);
    this.sun = new THREE.DirectionalLight(0xfff4d8, 1.1);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    const sc = this.sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 120;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.particles = new Particles(this.scene);
    this.flashes = new Flashes(this.scene);
    this.float = new FloatText(layers.dmg, (x, y, z) => this.project(x, y, z));
    this.promptLayer = layers.prompts;
    this.world = null; this.level = null; this.hub = null;
    this.maps = { players: new Map(), enemies: new Map(), allies: new Map(), projs: new Map(), pickups: new Map(), zones: new Map(), cps: [] };
    this.t = 0; this.shake = 0; this.shakeOn = true;
    this.focus = new THREE.Vector3(); this.camDist = 1; this.camInit = false;
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.tmpV = new THREE.Vector3();
    this.shadowBlobGeo = GEO.disc;
    this.resize();
    this.setQuality(qualityId);
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(id) {
    this.quality = QUALITY[id] || QUALITY.high;
    const q = this.quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
    this.sun.castShadow = q.shadows > 0;
    if (q.shadows) { this.sun.shadow.mapSize.set(q.shadows, q.shadows); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  project(x, y, z) {
    this.tmpV.set(x, y, z).project(this.camera);
    if (this.tmpV.z > 1) return null;
    return { x: (this.tmpV.x * 0.5 + 0.5) * this.w, y: (-this.tmpV.y * 0.5 + 0.5) * this.h };
  }
  // Bildschirmpunkt → Punkt auf waagerechter Ebene in Höhe y
  groundPoint(cx, cy, y) {
    const nx = (cx / this.w) * 2 - 1, ny = -(cy / this.h) * 2 + 1;
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera);
    this.plane.constant = -y;
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.plane, out) ? out : null;
  }

  applyTheme(th) {
    this.scene.background = new THREE.Color(th.bg);
    this.scene.fog = new THREE.Fog(th.fog, th.fogN, th.fogF);
    this.hemi.color.set(th.hemiS); this.hemi.groundColor.set(th.hemiG); this.hemi.intensity = th.hemiI;
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;
    this.renderer.setClearColor(th.bg);
  }

  // ------------------------------------------------------------ Welt laden/entladen
  clearWorld() {
    if (this.hub) { this.scene.remove(this.hub.group); this.hub = null; }
    if (this.level) { this.scene.remove(this.level.group); this.level.dispose(); this.level = null; }
    for (const m of Object.values(this.maps)) {
      if (m instanceof Map) { for (const v of m.values()) this.scene.remove(v.root || v.mesh || v); m.clear(); }
    }
    for (const c of this.maps.cps) this.scene.remove(c.g);
    this.maps.cps = [];
    this.world = null;
    this.float.clear();
    this.particles.list.length = 0;
    this.promptLayer.innerHTML = '';
    this.camInit = false;
  }
  loadWorld(world) {
    this.clearWorld();
    this.world = world;
    const lv = world.level;
    const th = THEMES[lv.theme] || THEMES.sky;
    this.applyTheme(th);
    this.level = new LevelView(lv, this.quality);
    this.scene.add(this.level.group);
    // Checkpoints
    for (const c of lv.checkpoints) {
      const g = new THREE.Group();
      g.add(mesh(GEO.cyl, 0x6a6a74, [0, 1.0, 0], [0.07, 2.0, 0.07]));
      const flag = mesh(GEO.box, 0x888890, [0.45, 1.75, 0], [0.9, 0.55, 0.05], { material: mat(0x888890, { emissive: 0 }) });
      g.add(flag);
      g.add(mesh(GEO.cyl, 0x4a4650, [0, 0.08, 0], [0.4, 0.16, 0.4]));
      g.position.set(c.x, c.y, c.z);
      this.scene.add(g);
      this.maps.cps.push({ g, flag, c, lit: false });
    }
    this.focus.set(lv.spawn[0], lv.spawn[1], lv.spawn[2]);
  }

  showHub(sel, hatId) {
    this.clearWorld();
    this.applyTheme(THEMES.hub);
    const g = new THREE.Group();
    this.hubGroup = g;
    g.add(this.skyHub());
    // Inselchen mit Podest
    const st = new Batcher();
    st.add(islandBodyGeo(), 0x8a6a46, 0, -1.9, 0, 9, 3.4, 9);
    st.add(GEO.box, 0x58a63c, 0, -0.45, 0, 9, 0.5, 9);
    st.add(GEO.box, 0x6cc04a, 0, -0.12, 0, 8.9, 0.26, 8.9);
    st.add(GEO.cyl, 0xa8a49c, 0, 0.05, 0, 1.9, 0.3, 1.9);
    st.add(GEO.cyl, 0xc0bcb2, 0, 0.22, 0, 1.6, 0.1, 1.6);
    for (let i = 0; i < 7; i++) { const a = Math.PI + 0.35 + (i / 6) * (Math.PI - 0.7), d = 3.4 + (i % 2) * 0.7; const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9; st.add(GEO.cylLow, 0x6a4a2a, x, 0.8, z, 0.14, 1.6, 0.14); st.add(GEO.coneLow, 0x2f9a3a, x, 2.0, z, 0.75, 1.7, 0.75); st.add(GEO.coneLow, 0x3fae46, x, 2.7, z, 0.55, 1.2, 0.55); }
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, d = 3.6 + (i % 3) * 0.4; st.add(GEO.ico, 0x9a948c, Math.cos(a) * d, 0.1, Math.sin(a) * d + 1, 0.3 + (i % 3) * 0.1, 0.25, 0.3, i, i * 2, 0); }
    const base = st.build(true);
    g.add(base);
    this.scene.add(g);
    this.hub = { group: g, model: null, sel: null };
    this.setHubHero(sel, hatId);
    this.hubClouds = this._clouds();
    g.add(this.hubClouds);
    this.camInit = false;
    this.camera.position.set(0, 3.2, 11); this.camera.lookAt(3.2, 1.4, 0);
  }
  skyHub() {
    const lv = new LevelView({ id: 'hub', boxes: [], islands: [], enemies: [], pickups: [], checkpoints: [], story: [], zones: [], gates: [], spawn: [0, 0, 0], goal: null, theme: 'sky', seaY: -30, killY: -40 }, { decor: false, shadows: false });
    this.hubLV = lv;
    return lv.group;
  }
  _clouds() {
    const g = new THREE.Group();
    const m = mat(0xffffff, { opacity: 0.95, basic: true });
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) c.add(mesh(GEO.sphereLow, 0xffffff, [(k - 1.5) * 1.8, Math.random() * 0.6, Math.random()], [1.8 + Math.random(), 1 + Math.random() * 0.5, 1.4], { material: m }));
      const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * 14;
      c.position.set(Math.cos(a) * d, -4 + Math.random() * 4, Math.sin(a) * d - 6);
      g.add(c);
    }
    return g;
  }
  setHubHero(sel, hatId) {
    if (!this.hub) return;
    const h = this.hub;
    if (h.model) { h.group.remove(h.model.root); h.model.dispose(); }
    const top = sel.top || sel.id, bot = sel.bot || sel.id;
    h.model = buildHero(top, bot, hatId);
    h.model.root.position.set(0, 0.32, 0.5);
    h.model.root.scale.setScalar(1.25);
    h.group.add(h.model.root);
    h.sel = sel;
    h.spin = 0;
    this.particles.burst(0, 1.2, 0, elColor(ALL_CHARS[top].el), 14, 3, 0.12, 0.6, 2);
  }

  // ------------------------------------------------------------ Ereignisse
  onEvent(e) {
    const P = this.particles, F = this.flashes;
    switch (e.t) {
      case 'dmg': this.float.add(e.x, e.y, e.z, e.v, e.cls); break;
      case 'swing': F.swing(e.x, e.y, e.z, e.face, e.range, e.arc, elColor(e.el), e.big); break;
      case 'ring': F.ring(e.x, e.y, e.z, e.r, e.heal ? 0x7dff6a : elColor(e.el), e.dur || 0.4, { pull: e.pull, disc: e.big }); P.burst(e.x, e.y + 0.3, e.z, e.heal ? 0x7dff6a : elColor(e.el), e.small ? 4 : 10, 3, 0.12, 0.5, 2); break;
      case 'hitfx': P.burst(e.x, e.y, e.z, elColor(e.el), e.small ? 5 : 8, 3.6, 0.13, 0.4, 8); break;
      case 'spark': P.burst(e.x, e.y, e.z, e.col || 0xffffff, 5, 3, 0.1, 0.3, 4); break;
      case 'muzzle': P.burst(e.x, e.y, e.z, elColor(e.el), 3, 2, 0.1, 0.25, 0); break;
      case 'trail': P.spawn(e.x, e.y, e.z, 0, 0.2, 0, elColor(e.el), 0.3, 0.3, 0); break;
      case 'dust': P.burst(e.x, e.y + 0.1, e.z, 0xe8e0d0, 5, 1.6, 0.14, 0.4, 2, 0.4); break;
      case 'puff': P.burst(e.x, e.y, e.z, elColor(e.el), e.big ? 22 : 12, e.big ? 5 : 3, 0.2, 0.7, 1); break;
      case 'splash': P.burst(e.x, e.y, e.z, this.level && this.level.theme.sea === 'lava' ? 0xff7a2a : 0x9ad8ff, 22, 6, 0.25, 0.9, 12); break;
      case 'zap': F.line(e.x1, e.y1, e.z1, e.x2, e.y2, e.z2, 0xdff4ff, 0.2, 0.09); P.burst(e.x2, e.y2, e.z2, 0xdff4ff, 6, 3, 0.1, 0.3, 2); break;
      case 'bolt': F.bolt(e.x, e.y, e.z); P.burst(e.x, e.y + 0.4, e.z, 0xdff4ff, 14, 5, 0.18, 0.5, 6); this.shake = Math.max(this.shake, 0.25); break;
      case 'death': {
        const m = this.maps.enemies.get(e.id);
        if (m) { this.scene.remove(m.root); this.maps.enemies.delete(e.id); m.dispose && m.dispose(); }
        if (!e.silent) {
          P.burst(e.x, e.y + 0.7, e.z, elColor(e.el), e.boss ? 60 : e.big ? 26 : 14, e.boss ? 9 : 5, e.boss ? 0.35 : 0.2, 0.8, 8);
          P.burst(e.x, e.y + 0.7, e.z, 0xffffff, e.boss ? 20 : 6, 4, 0.12, 0.5, 6);
          if (e.boss) { F.ring(e.x, e.y + 0.2, e.z, 10, 0xffffff, 0.8, { disc: true }); }
        }
        break;
      }
      case 'pickup': {
        const c = { coin: 0xffd84a, coin5: 0xffa42a, heart: 0xff6a8a, crystal: 0x7fe8ff, soul: 0xb05cff, hat: 0xffd84a, treasure: 0xffd84a }[e.kind] || 0xffffff;
        P.burst(e.x, e.y + 0.6, e.z, c, e.kind === 'coin' ? 4 : 12, 3, 0.12, 0.5, 2);
        break;
      }
      case 'checkpoint': { P.burst(e.x, e.y + 1.5, e.z, 0x7fe8ff, 22, 4, 0.16, 0.9, 1); F.ring(e.x, e.y + 0.1, e.z, 2.4, 0x7fe8ff, 0.7); break; }
      case 'gateOpen': P.burst(e.x, e.y, e.z, elColor(e.el), 36, 5, 0.22, 0.9, 3); F.ring(e.x, e.y - 1.2, e.z, 3, elColor(e.el), 0.6); break;
      case 'crumble': { const b = e.box; P.burst((b.x0 + b.x1) / 2, b.y1, (b.z0 + b.z1) / 2, 0x8a8478, 22, 4, 0.25, 0.8, 14); break; }
      case 'capture': P.burst(e.x, e.y + 1, e.z, 0xb05cff, 44, 6, 0.24, 1.1, 2); F.ring(e.x, e.y + 0.2, e.z, 5, 0xb05cff, 0.9, { disc: true }); break;
      case 'phase': P.burst(e.x, e.y + 2, e.z, 0xffffff, 36, 8, 0.25, 0.9, 2); this.shake = Math.max(this.shake, 0.5); break;
      case 'revive': P.burst(e.x, e.y + 0.7, e.z, 0x7dff6a, 22, 4, 0.18, 0.8, 1); break;
      case 'down': P.burst(e.x, e.y + 0.7, e.z, 0xffffff, 18, 4, 0.16, 0.8, 4); break;
      case 'levelup': P.burst(e.x, e.y + 0.8, e.z, 0xffd84a, 40, 6, 0.2, 1.0, 1); F.ring(e.x, e.y + 0.1, e.z, 3.4, 0xffd84a, 0.7, { disc: true }); break;
      case 'alert': P.burst(e.x, e.y, e.z, 0xffec5a, 3, 1.5, 0.12, 0.4, 0); break;
      case 'cast': P.burst(e.x, e.y + 0.2, e.z, 0xffffff, 8, 3, 0.18, 0.5, 0); break;
      case 'bossDown': P.burst(e.x, e.y + 2, e.z, 0xffd84a, 80, 10, 0.3, 1.2, 2); break;
      case 'won': break;
      case 'shake': if (this.shakeOn) this.shake = Math.max(this.shake, e.v); break;
    }
  }

  // ------------------------------------------------------------ Synchronisation
  getPlayerView(p) {
    let v = this.maps.players.get(p.id);
    if (!v) {
      const hat = this.hatFor ? this.hatFor(p) : null;
      const m = buildHero(p.hero.top, p.hero.bot, hat);
      const ringCol = P_COLORS[p.idx % 4];
      const ring = mesh(GEO.ring, ringCol, [0, 0.04, 0], [0.7, 1, 0.7], { material: new THREE.MeshBasicMaterial({ color: ringCol, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }) });
      const blob = this.makeBlob(0.8);
      const shield = mesh(GEO.sphere, 0x7fe8ff, [0, 0.8, 0], [1.1, 1.2, 1.1], { material: mat(0x7fe8ff, { opacity: 0.25, emissive: 1, basic: true, add: true }) });
      shield.visible = false;
      const root = new THREE.Group();
      root.add(m.root, ring, shield);
      this.scene.add(root); this.scene.add(blob);
      v = { root, model: m, ring, blob, shield, st: { moving: false, walkT: 0, grounded: true, landT: 0, swing: 0, hurt: 0, gliding: false } };
      this.maps.players.set(p.id, v);
    }
    return v;
  }
  makeBlob(r) {
    const b = new THREE.Mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    b.scale.set(r, 1, r); b.renderOrder = 1;
    return b;
  }
  placeBlob(blob, x, y, z, r, boxes) {
    const gy = groundAt(boxes, x, z, y + 0.4);
    if (!Number.isFinite(gy)) { blob.visible = false; return; }
    blob.visible = true;
    const hgt = Math.max(0, y - gy);
    const s = r * Math.max(0.5, 1 - hgt * 0.1);
    blob.scale.set(s, 1, s);
    blob.position.set(x, gy + 0.03, z);
    blob.material.opacity = Math.max(0.1, 0.3 - hgt * 0.04);
  }

  getEnemyView(e) {
    let v = this.maps.enemies.get(e.id);
    if (v) return v;
    const sp = e.spec;
    let m;
    if (e.boss) m = buildBoss(e.type, sp);
    else if (e.elite) m = buildElite(sp);
    else m = buildEnemy(sp, 1);
    const root = new THREE.Group();
    root.add(m.root);
    // Lebensbalken
    const bar = new THREE.Group();
    const bg = mesh(GEO.plane, 0x000000, [0, 0, 0], [1.2, 1, 0.14], { material: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide }) });
    bg.rotation.x = Math.PI / 2;
    const fg = mesh(GEO.plane, 0xff5a6a, [0, 0, 0.001], [1.1, 1, 0.09], { material: new THREE.MeshBasicMaterial({ color: e.elite ? 0xe2b8ff : 0xff6a6a, depthTest: false, side: THREE.DoubleSide }) });
    fg.rotation.x = Math.PI / 2;
    bg.renderOrder = 10; fg.renderOrder = 11;
    bar.add(bg, fg);
    bar.visible = false;
    const blob = this.makeBlob(Math.max(0.6, e.r * 1.3));
    this.scene.add(root); this.scene.add(bar); this.scene.add(blob);
    v = { root, model: m, bar, fg, blob, id: e.id, seed: Math.random() * 6, walkT: 0, lastX: e.x, lastZ: e.z };
    v.dispose = () => { this.scene.remove(bar); this.scene.remove(blob); m.dispose(); };
    this.maps.enemies.set(e.id, v);
    return v;
  }

  update(dt, realDt) {
    this.t += dt;
    const w = this.world;
    if (w) this.syncWorld(dt, w);
    else if (this.hub) this.syncHub(dt);
    this.particles.update(realDt);
    this.flashes.update(realDt);
    this.float.update(realDt, this.w, this.h);
    this.renderer.render(this.scene, this.camera);
  }

  syncHub(dt) {
    const h = this.hub;
    h.spin += dt * 0.8;
    h.model.root.rotation.y = h.spin;
    h.model.update(this.t, dt, { moving: false, walkT: 0, grounded: true, landT: 0, swing: 0, hurt: 0 });
    this.hubLV.update(dt, this.t, this.camera.position);
    this.hubClouds.children.forEach((c) => { c.position.x += dt * 0.4; if (c.position.x > 30) c.position.x = -30; });
    const tx = this.hubFocusX ?? 0;
    this.camera.position.x = lerp(this.camera.position.x, tx, Math.min(1, dt * 3));
    this.camera.lookAt(this.camera.position.x + 3.2, 1.4, 0);
    this.sun.position.set(8, 16, 10); this.sun.target.position.set(0, 0, 0);
  }

  syncWorld(dt, w) {
    const boxes = w.boxes;
    const t = this.t;
    // --- Spieler
    for (const p of w.players) {
      const v = this.getPlayerView(p);
      const st = v.st;
      if (p.down > 0) { v.root.visible = false; v.blob.visible = false; continue; }
      v.root.visible = true;
      const blink = p.inv > 0 && p.inv < 50 && Math.floor(t * 18) % 2 === 0 && p.hurt <= 0 && p.dashInv <= 0;
      v.model.root.visible = !blink;
      v.root.position.set(p.x, p.y, p.z);
      v.model.root.rotation.y = p.face;
      st.moving = p.moving; st.walkT = p.walkT; st.grounded = p.grounded; st.swing = p.swing; st.hurt = p.hurt; st.gliding = p.gliding;
      st.landT = Math.max(0, (st.landT || 0) - dt * 6);
      if (p.grounded && !v.wasGrounded) st.landT = 0.4;
      v.wasGrounded = p.grounded;
      v.model.update(t, dt, st);
      v.model.setFlash(p.hurt > 0 ? p.hurt * 3 : 0);
      v.shield.visible = p.buff.shield > 0 || p.dashInv > 0.15;
      v.shield.scale.set(1.1 + Math.sin(t * 8) * 0.05, 1.2, 1.1);
      v.ring.rotation.y = t * 1.5;
      this.placeBlob(v.blob, p.x, p.y, p.z, 0.8, boxes);
      if (p.buff.dmg > 0 && Math.random() < 0.3) this.particles.spawn(p.x + (Math.random() - 0.5) * 0.6, p.y + 0.4, p.z + (Math.random() - 0.5) * 0.6, 0, 1.4, 0, 0xffd84a, 0.13, 0.5, 0);
      if (p.gliding) this.particles.spawn(p.x, p.y + 0.3, p.z, 0, -0.5, 0, 0xdff6ff, 0.12, 0.3, 0);
    }
    // --- Gegner
    for (const e of w.enemies) {
      if (e.dead) continue;
      const v = this.getEnemyView(e);
      v.root.visible = !e.hidden;
      v.root.position.set(e.x, e.y, e.z);
      v.model.root.rotation.y = e.face;
      const moved = Math.hypot(e.x - v.lastX, e.z - v.lastZ);
      v.lastX = e.x; v.lastZ = e.z;
      v.walkT += moved * 2.2;
      const stt = e.st.stun > 0 ? 'stun' : e.state;
      v.model.update(t, dt, { moving: moved > 0.004 && !e.flying, walkT: v.walkT, state: stt, lunge: e.lunge, grounded: e.grounded, seed: v.seed });
      v.model.setFlash(e.flash > 0 ? 0.8 : e.inv > 0 ? 0.35 + Math.sin(t * 40) * 0.2 : (e.state === 'windup' ? 0.2 + Math.sin(t * 30) * 0.2 : 0));
      // Lebensbalken
      const hurtB = e.hp < e.maxHp;
      v.bar.visible = hurtB && !e.hidden && !e.boss;
      if (v.bar.visible) {
        const r = Math.max(0.0, e.hp / e.maxHp);
        v.bar.position.set(e.x, e.y + e.h * (e.elite ? 1.15 : 1.0) + 0.5, e.z);
        v.bar.quaternion.copy(this.camera.quaternion);
        v.fg.scale.x = 1.1 * r; v.fg.position.x = -0.55 * (1 - r);
      }
      v.blob.visible = !e.flying || true;
      this.placeBlob(v.blob, e.x, e.y, e.z, Math.max(0.6, e.r * 1.3), boxes);
      if (e.hidden) v.blob.visible = false;
      // Status-Effekte
      if (Math.random() < dt * 8) {
        const s = e.st;
        if (s.burn) this.particles.spawn(e.x + (Math.random() - 0.5) * e.r, e.y + e.h * 0.6, e.z + (Math.random() - 0.5) * e.r, 0, 2, 0, 0xff7a2a, 0.16, 0.5, 0);
        if (s.wet > 0) this.particles.spawn(e.x + (Math.random() - 0.5) * e.r, e.y + e.h, e.z + (Math.random() - 0.5) * e.r, 0, -1, 0, 0x3aa0ff, 0.12, 0.5, 0);
        if (s.curse > 0) this.particles.spawn(e.x + (Math.random() - 0.5) * e.r, e.y + e.h * 0.8, e.z + (Math.random() - 0.5) * e.r, 0, 1.2, 0, 0x7a54b8, 0.14, 0.6, 0);
        if (s.blind > 0) this.particles.spawn(e.x, e.y + e.h + 0.3, e.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, 0xffe27a, 0.12, 0.5, 0);
        if (s.stun > 0) this.particles.spawn(e.x + Math.cos(t * 9) * e.r * 0.7, e.y + e.h + 0.3, e.z + Math.sin(t * 9) * e.r * 0.7, 0, 0, 0, 0xffec5a, 0.14, 0.3, 0);
      }
    }
    // --- Helfer
    const seenA = new Set();
    for (const a of w.allies) {
      seenA.add(a.id);
      let v = this.maps.allies.get(a.id);
      if (!v) {
        const m = buildAlly(a.unit, elColor(a.el));
        const blob = this.makeBlob(0.5);
        this.scene.add(m.root); this.scene.add(blob);
        v = { root: m.root, model: m, blob };
        this.maps.allies.set(a.id, v);
        this.particles.burst(a.x, a.y + 0.4, a.z, elColor(a.el), 14, 3, 0.16, 0.6, 2);
      }
      v.root.position.set(a.x, a.y, a.z);
      v.root.rotation.y = a.face;
      const k = a.life < 1.5 ? (Math.sin(t * 25) > 0 ? 1 : 0.4) : 1;
      v.root.scale.setScalar(Math.min(1, a.born * 5) * (k > 0.5 ? 1 : 0.85));
      v.model.update(t, dt, {});
      this.placeBlob(v.blob, a.x, a.y, a.z, 0.5, boxes);
    }
    for (const [id, v] of this.maps.allies) if (!seenA.has(id)) { this.scene.remove(v.root); this.scene.remove(v.blob); this.maps.allies.delete(id); }
    // --- Geschosse
    const seenP = new Set();
    for (const pr of w.projs) {
      seenP.add(pr.id);
      let v = this.maps.projs.get(pr.id);
      const col = pr.owner === 'e' ? (pr.kind === 'wave' ? 0x6ac8ff : elColor(pr.el)) : elColor(pr.el);
      if (!v) {
        let m;
        if (pr.kind === 'wave') {
          m = new THREE.Group();
          m.add(mesh(GEO.box, 0x4aa8e8, [0, 0.5, 0], [pr.wide * 2, 1.0, 0.7], { material: mat(0x4aa8e8, { opacity: 0.55, emissive: 0.8, basic: false }) }));
          m.add(mesh(GEO.box, 0xffffff, [0, 1.0, 0], [pr.wide * 2, 0.16, 0.9], { material: mat(0xe8f8ff, { opacity: 0.8, basic: true }) }));
          m.rotation.y = Math.atan2(pr.vx, pr.vz);
        } else if (pr.wide) {
          m = new THREE.Group();
          const s = mesh(GEO.sphere, col, [0, 0, 0], [pr.r * 2.2, pr.r * 0.5, pr.r * 0.8], { material: mat(col, { basic: true, add: true, opacity: 0.9 }) });
          m.add(s); m.rotation.y = Math.atan2(pr.vx, pr.vz) + Math.PI / 2;
        } else {
          m = new THREE.Group();
          m.add(mesh(GEO.sphere, col, [0, 0, 0], pr.r, { material: mat(col, { basic: true }) }));
          m.add(mesh(GEO.sphere, col, [0, 0, 0], pr.r * 2, { material: mat(col, { basic: true, add: true, opacity: 0.35 }) }));
          if (pr.owner === 'e') m.add(mesh(GEO.sphere, 0x180818, [0, 0, 0], pr.r * 0.55, { material: mat(0x180818, { basic: true }) }));
        }
        this.scene.add(m);
        v = { mesh: m, kind: pr.kind };
        this.maps.projs.set(pr.id, v);
      }
      v.mesh.position.set(pr.x, pr.y, pr.z);
      if (pr.kind === 'wave') { v.mesh.position.y = pr.y; }
      else if (Math.random() < 0.7) this.particles.spawn(pr.x, pr.y, pr.z, 0, 0, 0, col, pr.r * 0.9, 0.25, 0);
    }
    for (const [id, v] of this.maps.projs) if (!seenP.has(id)) { this.scene.remove(v.mesh); v.mesh.traverse((o) => { if (o.material && o.material.dispose && !o.material.userData.shared) { /* geteilt */ } }); this.maps.projs.delete(id); }
    // --- Pickups
    const seenK = new Set();
    for (const pk of w.pickups) {
      seenK.add(pk.pid);
      let v = this.maps.pickups.get(pk.pid);
      if (!v) { v = this.makePickup(pk); this.scene.add(v.g); this.maps.pickups.set(pk.pid, v); }
      const bob = Math.sin(t * 2.5 + pk.pid) * 0.12;
      const pop = pk.drop ? Math.min(1, pk.t * 4) : 1;
      v.g.position.set(pk.x, pk.y + 0.7 * pop + bob * (pk.kind === 'coin' || pk.kind === 'coin5' ? 1 : 1.4) + (pk.drop ? Math.sin(Math.min(1, pk.t * 3) * Math.PI) * 0.8 : 0), pk.z);
      v.spin.rotation.y = t * 2.4 + pk.pid;
      if (v.pulse) v.pulse.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
      if (v.sparkle && Math.random() < dt * 4) this.particles.spawn(pk.x + (Math.random() - 0.5), pk.y + 0.6 + Math.random(), pk.z + (Math.random() - 0.5), 0, 0.6, 0, v.sparkle, 0.1, 0.8, 0);
    }
    for (const [id, v] of this.maps.pickups) if (!seenK.has(id)) { this.scene.remove(v.g); this.maps.pickups.delete(id); }
    // --- Zonen
    const seenZ = new Set();
    for (const z of w.zones) {
      if (z.kind === 'vent' || z.kind === 'blast') continue;
      seenZ.add(z);
      let v = this.maps.zones.get(z);
      if (!v) { v = this.makeZone(z); if (!v) continue; this.scene.add(v.g); this.maps.zones.set(z, v); }
      this.updateZone(z, v, t);
    }
    for (const [z, v] of this.maps.zones) if (!seenZ.has(z)) { this.scene.remove(v.g); v.g.traverse((o) => { if (o.material && !o.material.userData.shared) o.material.dispose(); }); this.maps.zones.delete(z); }
    // --- Checkpoints
    for (let i = 0; i < this.maps.cps.length; i++) {
      const c = this.maps.cps[i];
      const lit = w.cpIndex >= i;
      if (lit !== c.lit) { c.lit = lit; c.flag.material = mat(lit ? 0x7fe8ff : 0x888890, { emissive: lit ? 1 : 0 }); }
      c.flag.rotation.y = Math.sin(t * 3 + i) * 0.15;
      if (lit && Math.random() < dt * 5) this.particles.spawn(c.c.x + (Math.random() - 0.5) * 0.4, c.c.y + 1.6, c.c.z + (Math.random() - 0.5) * 0.4, 0, 1, 0, 0x7fe8ff, 0.1, 0.8, 0);
    }
    // --- Level
    if (w.level.boss) this.level.setGoalVisible(!!w.bossDead);
    this.level.update(dt, t, this.camera.position);
    this.updateCamera(dt, w);
  }

  makePickup(pk) {
    const g = new THREE.Group(), spin = new THREE.Group();
    g.add(spin);
    let pulse = null, sparkle = 0;
    switch (pk.kind) {
      case 'coin': case 'coin5': {
        const c = pk.kind === 'coin' ? 0xffd84a : 0xff9a2a, s = pk.kind === 'coin' ? 0.3 : 0.4;
        spin.add(mesh(GEO.cyl, c, [0, 0, 0], [s, 0.06, s], { material: mat(c, { emissive: 0.8 }), rx: Math.PI / 2 }));
        spin.add(mesh(GEO.cyl, 0xffffff, [0, 0, 0], [s * 0.6, 0.075, s * 0.6], { material: mat(0xfff0a0, { emissive: 0.8 }), rx: Math.PI / 2 }));
        break;
      }
      case 'heart': {
        const m = mat(0xff4a6a, { emissive: 0.8 });
        spin.add(mesh(GEO.sphere, 0xff4a6a, [-0.14, 0.08, 0], [0.18, 0.18, 0.15], { material: m }));
        spin.add(mesh(GEO.sphere, 0xff4a6a, [0.14, 0.08, 0], [0.18, 0.18, 0.15], { material: m }));
        spin.add(mesh(GEO.cone, 0xff4a6a, [0, -0.12, 0], [0.3, 0.4, 0.15], { material: m, rz: Math.PI }));
        sparkle = 0xff8aa0; break;
      }
      case 'crystal':
        pulse = mesh(GEO.octa, 0x7fe8ff, [0, 0.2, 0], [0.28, 0.45, 0.28], { material: mat(0x7fe8ff, { emissive: 1, basic: true }) });
        spin.add(pulse); spin.add(mesh(GEO.octa, 0xffffff, [0, 0.2, 0], [0.5, 0.8, 0.5], { material: mat(0x7fe8ff, { opacity: 0.25, basic: true, add: true }) }));
        sparkle = 0x7fe8ff; break;
      case 'soul':
        pulse = mesh(GEO.ico, 0xb05cff, [0, 0.2, 0], [0.34, 0.34, 0.34], { material: mat(0xb05cff, { emissive: 1, basic: true }) });
        spin.add(pulse); spin.add(mesh(GEO.torus, 0xff8aff, [0, 0.2, 0], [0.6, 0.6, 0.6], { material: mat(0xff8aff, { basic: true, add: true, opacity: 0.8 }) }));
        sparkle = 0xe08aff; break;
      case 'hat': {
        const h = buildHat(pk.id);
        if (h) { h.scale.setScalar(1.3); spin.add(h); }
        sparkle = 0xffd84a; break;
      }
      case 'treasure':
        spin.add(mesh(GEO.box, 0xc89a2a, [0, 0, 0], [0.7, 0.4, 0.46], { material: mat(0xc89a2a, { emissive: 0.5 }) }));
        spin.add(mesh(GEO.hemi, 0xe0b040, [0, 0.2, 0], [0.38, 0.28, 0.5], { material: mat(0xe0b040, { emissive: 0.6 }), rz: 0 }));
        spin.add(mesh(GEO.sphere, 0xffffff, [0, 0.16, 0.25], [0.07, 0.07, 0.05], { material: mat(0xffffff, { basic: true }) }));
        sparkle = 0xffd84a; break;
    }
    return { g, spin, pulse, sparkle };
  }

  makeZone(z) {
    const g = new THREE.Group();
    const add = (m) => { m.material.userData.shared = false; g.add(m); return m; };
    if (z.kind === 'tele') {
      const col = z.lightning ? 0xdff4ff : 0xff3a3a;
      const base = add(new THREE.Mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false })));
      const fill = add(new THREE.Mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, depthWrite: false })));
      const edge = add(new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })));
      base.scale.set(z.r, 1, z.r); edge.scale.set(z.r, 1, z.r);
      g.position.set(z.x, z.y + 0.06, z.z);
      return { g, fill, edge, base };
    }
    if (z.kind === 'mine') {
      const col = elColor(z.el);
      const base = add(new THREE.Mesh(GEO.disc, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2, depthWrite: false })));
      const core = add(new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({ color: col })));
      const edge = add(new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })));
      base.scale.set(z.r, 1, z.r); edge.scale.set(z.r, 1, z.r); core.scale.setScalar(0.22);
      g.position.set(z.x, z.y + 0.1, z.z);
      return { g, core, base, edge };
    }
    if (z.kind === 'line') {
      const m = add(new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })));
      m.scale.set(z.w, 1, z.len);
      m.position.set(0, 0, z.len / 2);
      g.add(m);
      g.position.set(z.x, z.y + 0.08, z.z);
      g.rotation.y = Math.atan2(z.dx, z.dz);
      return { g, m };
    }
    if (z.kind === 'beam') {
      const arms = [];
      const n = z.double ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const arm = new THREE.Group();
        const core = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0xff5aff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
        core.scale.set(z.w * 2, 0.8, z.len); core.position.set(0, 0.5, z.len / 2);
        const glow = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.scale.set(z.w * 0.8, 0.4, z.len); glow.position.set(0, 0.5, z.len / 2);
        arm.add(core, glow); g.add(arm); arms.push({ arm, core, glow });
      }
      return { g, arms };
    }
    return null;
  }
  updateZone(z, v, t) {
    if (z.kind === 'tele') {
      const k = 1 - Math.max(0, z.t) / z.dur;
      v.fill.scale.set(z.r * k, 1, z.r * k);
      v.fill.material.opacity = 0.3 + 0.25 * Math.sin(t * 25) * (k > 0.6 ? 1 : 0);
      v.edge.material.opacity = 0.6 + 0.4 * Math.sin(t * 18);
    } else if (z.kind === 'mine') {
      v.core.position.y = 0.1 + Math.sin(t * 6) * 0.04;
      v.core.material.color.setHex(Math.sin(t * (z.t < 0.5 ? 40 : 10)) > 0 ? elColor(z.el) : 0xffffff);
    } else if (z.kind === 'line') {
      v.m.material.opacity = 0.18 + 0.2 * (1 - z.t / z.dur) + 0.1 * Math.sin(t * 30);
    } else if (z.kind === 'beam') {
      v.g.position.set(z.x, z.y, z.z);
      const a = z.cur ?? z.ang;
      v.arms.forEach((arm, i) => {
        arm.arm.rotation.y = a + i * Math.PI;
        if (z.active) { arm.core.material.opacity = 0.85; arm.core.scale.x = z.w * 2.4; arm.glow.material.opacity = 0.9; }
        else { arm.core.material.opacity = 0.2 + 0.15 * Math.sin(t * 30); arm.core.scale.x = z.w * 0.6; arm.glow.material.opacity = 0; }
      });
      if (z.active) this.particles.spawn(z.x + Math.sin(a) * (3 + Math.random() * 20), z.y + 0.5, z.z + Math.cos(a) * (3 + Math.random() * 20), 0, 1, 0, 0xff8aff, 0.16, 0.4, 0);
    }
  }

  updateCamera(dt, w) {
    const lv = w.level;
    const live = w.players.filter((p) => p.down <= 0);
    const ps = live.length ? live : w.players;
    let cx = 0, cy = 0, cz = 0;
    for (const p of ps) { cx += p.x; cy += p.y; cz += p.z; }
    cx /= ps.length; cy /= ps.length; cz /= ps.length;
    let spread = 0;
    for (const p of ps) spread = Math.max(spread, Math.hypot(p.x - cx, p.z - cz));
    // Arena/Boss: etwas weiter weg
    let dist = 1 + (lv.boss || lv.arena ? 0.42 : 0) + Math.min(0.9, spread * 0.05);
    if (w.boss && !w.boss.dead && lv.boss) { // zwischen Spieler und Boss
      cx = lerp(cx, w.boss.x, 0.18); cz = lerp(cz, w.boss.z, 0.18);
    }
    if (!this.camInit) { this.focus.set(cx, cy, cz); this.camDist = dist; this.camInit = true; }
    const k = Math.min(1, dt * 5);
    this.focus.x = lerp(this.focus.x, cx, k); this.focus.z = lerp(this.focus.z, cz, k);
    this.focus.y = lerp(this.focus.y, cy, Math.min(1, dt * 3));
    this.camDist = lerp(this.camDist, dist, Math.min(1, dt * 2));
    const D = this.camDist, aspect = this.camera.aspect;
    const narrow = aspect < 1 ? 1.4 : 1;
    const off = new THREE.Vector3(0, 15 * D * narrow, 11.5 * D * narrow);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const sh = this.shake * 0.7;
    this.camera.position.set(this.focus.x + off.x + (Math.random() - 0.5) * sh, this.focus.y + off.y + (Math.random() - 0.5) * sh, this.focus.z + off.z + (Math.random() - 0.5) * sh);
    this.camera.lookAt(this.focus.x, this.focus.y + 0.6, this.focus.z - 0.4);
    // Sonne folgt dem Fokus (Schatten bleiben scharf)
    this.sun.position.set(this.focus.x - 14, this.focus.y + 28, this.focus.z + 12);
    this.sun.target.position.set(this.focus.x, this.focus.y, this.focus.z);
    this.sun.target.updateMatrixWorld();
    // Gewitter: ab und zu Aufhellen
    if (lv.storm) { this.stormFlash = Math.max(0, (this.stormFlash || 0) - dt * 3); this.hemi.intensity = THEMES.storm.hemiI + this.stormFlash; }
  }
  flashSky(v = 0.8) { this.stormFlash = v; }
}

