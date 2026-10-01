// Figuren aus einfachen Formen: Helden (Oberteil + Unterteil, daher Swapper-fähig), Gegner, Bosse, Hüte.
import * as THREE from '../../vendor/three.js';
import { GEO, mat, ownMat, mesh } from './parts.js';
import { ALL_CHARS } from '../data/heroes.js';
import { ELEMENTS } from '../data/elements.js';
import { HATS } from '../data/items.js';

const V = (x, y, z) => [x, y, z];
const col = (c) => new THREE.Color(c);
function shade(c, f) { const k = col(c); k.multiplyScalar(f); return k.getHex(); }

function add(parent, geo, color, p, s, o = {}) {
  const m = mesh(geo, color, p, s, o);
  m.castShadow = o.shadow !== false;
  if (o.name) m.name = o.name;
  parent.add(m);
  return m;
}
function group(parent, name, p) {
  const g = new THREE.Group(); g.name = name || '';
  if (p) g.position.set(p[0], p[1], p[2]);
  parent.add(g); return g;
}

// ---------------------------------------------------------------------- Merkmale
const F = {
  horns(c) { for (const s of [-1, 1]) add(c.head, GEO.cone, 0xefe2c4, V(s * 0.22, 0.36, -0.02), V(0.09, 0.46, 0.09), { rz: -s * 0.42 }); },
  antlers(c) {
    for (const s of [-1, 1]) {
      add(c.head, GEO.cyl, 0xd8c090, V(s * 0.2, 0.46, -0.02), V(0.05, 0.5, 0.05), { rz: -s * 0.3 });
      add(c.head, GEO.cyl, 0xd8c090, V(s * 0.3, 0.55, -0.02), V(0.04, 0.3, 0.04), { rz: -s * 0.9 });
      add(c.head, GEO.cyl, 0xd8c090, V(s * 0.27, 0.74, -0.02), V(0.04, 0.25, 0.04), { rz: s * 0.3 });
    }
  },
  flame(c) { for (let i = 0; i < 3; i++) add(c.head, GEO.cone, i === 1 ? 0xffd84a : 0xff7a2a, V((i - 1) * 0.16, 0.5 + (i === 1 ? 0.12 : 0), -0.05), V(0.11, 0.42 + (i === 1 ? 0.15 : 0), 0.11), { material: mat(i === 1 ? 0xffd84a : 0xff7a2a, { emissive: 1, basic: true }), name: 'flame' }); },
  flame_head(c) { for (let i = 0; i < 3; i++) add(c.head, GEO.cone, 0x9fffd0, V((i - 1) * 0.14, 0.46, 0), V(0.1, 0.38 + (i === 1 ? 0.14 : 0), 0.1), { material: mat(0x9fffd0, { basic: true, opacity: 0.85 }), name: 'flame' }); },
  flame_tail(c) {
    add(c.bottom, GEO.sphere, c.col, V(0, 0.28, -0.5), V(0.2, 0.2, 0.42), { name: 'tail' });
    add(c.bottom, GEO.cone, 0xff7a2a, V(0, 0.34, -0.95), V(0.16, 0.38, 0.16), { rx: -Math.PI / 2, material: mat(0xff7a2a, { emissive: 1, basic: true }), name: 'flame' });
  },
  tail_thin(c) { add(c.bottom, GEO.sphere, c.col, V(0, 0.2, -0.38), V(0.1, 0.1, 0.22), { name: 'tail' }); add(c.bottom, GEO.sphere, c.alt, V(0, 0.32, -0.62), V(0.1, 0.1, 0.12), { name: 'tail' }); },
  tail_bushy(c) { add(c.bottom, GEO.sphere, c.col, V(0, 0.32, -0.52), V(0.22, 0.22, 0.46), { name: 'tail' }); add(c.bottom, GEO.sphere, c.alt, V(0, 0.34, -0.9), V(0.17, 0.17, 0.2), { name: 'tail' }); },
  tail_fin(c) { add(c.bottom, GEO.cone, c.alt, V(0, 0.22, -0.5), V(0.08, 0.5, 0.3), { rx: -Math.PI / 2 }); },
  ears_pointy(c) { for (const s of [-1, 1]) { add(c.head, GEO.cone, c.col, V(s * 0.26, 0.38, -0.02), V(0.13, 0.36, 0.1), { rz: -s * 0.25 }); add(c.head, GEO.cone, c.alt, V(s * 0.26, 0.36, 0.03), V(0.07, 0.24, 0.05), { rz: -s * 0.25 }); } },
  ears_round(c) { for (const s of [-1, 1]) { add(c.head, GEO.sphere, c.col, V(s * 0.33, 0.28, -0.02), V(0.16, 0.16, 0.08)); add(c.head, GEO.sphere, c.alt, V(s * 0.33, 0.28, 0.03), V(0.09, 0.09, 0.05)); } },
  wings(c) { for (const s of [-1, 1]) { const g = group(c.torso, s < 0 ? 'wingL' : 'wingR', V(s * 0.3, 0.2, -0.28)); add(g, GEO.sphere, c.alt, V(s * 0.38, 0.1, -0.05), V(0.55, 0.05, 0.28), { rz: s * 0.25 }); add(g, GEO.sphere, c.col, V(s * 0.62, 0.14, -0.1), V(0.3, 0.04, 0.18), { rz: s * 0.25 }); } },
  crest(c) { for (let i = 0; i < 3; i++) add(c.head, GEO.cone, c.alt, V(0, 0.44 - i * 0.02, 0.1 - i * 0.12), V(0.07, 0.3 - i * 0.04, 0.07), { rx: -0.3 - i * 0.2 }); },
  beak(c) { add(c.head, GEO.cone, 0xffb030, V(0, -0.04, 0.46), V(0.11, 0.3, 0.11), { rx: Math.PI / 2 }); },
  fins(c) { add(c.head, GEO.cone, c.alt, V(0, 0.42, -0.1), V(0.07, 0.4, 0.3), { rx: -0.3 }); for (const s of [-1, 1]) add(c.torso, GEO.cone, c.alt, V(s * 0.5, 0.2, 0), V(0.1, 0.3, 0.2), { rz: -s * 1.2 }); },
  sword_nose(c) { add(c.head, GEO.cone, 0xe8f4ff, V(0, -0.02, 0.8), V(0.07, 0.8, 0.07), { rx: Math.PI / 2 }); },
  jelly_cap(c) { add(c.head, GEO.hemi, c.alt, V(0, 0.18, 0), V(0.56, 0.5, 0.56), { material: mat(c.alt, { opacity: 0.55, emissive: 0.5 }) }); },
  tentacles(c) { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(c.bottom, GEO.cyl, c.alt, V(Math.cos(a) * 0.2, 0.16, Math.sin(a) * 0.2), V(0.045, 0.32, 0.045), { name: 'tent' + i }); } },
  spikes(c) { for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 1.6; add(c.torso, GEO.cone, shade(c.col, 0.7), V(Math.sin(a) * 0.4, 0.62 + Math.cos(a) * 0.12, -0.28), V(0.09, 0.3, 0.09), { rx: -0.8, rz: -a * 0.5 }); } },
  brow(c) { add(c.head, GEO.box, shade(c.col, 0.55), V(0, 0.15, 0.36), V(0.6, 0.1, 0.12)); },
  claws(c) { for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add(c.torso, GEO.cone, 0xf4ecd0, V(s * 0.52 + (i - 1) * 0.05, 0.2, 0.22 + i * 0.0), V(0.03, 0.14, 0.03), { rx: Math.PI / 2 }); },
  snout(c) { add(c.head, GEO.sphere, c.alt, V(0, -0.1, 0.38), V(0.2, 0.15, 0.2)); add(c.head, GEO.sphere, 0x222222, V(0, -0.04, 0.55), V(0.06, 0.05, 0.05)); },
  goggles(c) { for (const s of [-1, 1]) add(c.head, GEO.torus, 0x55606e, V(s * 0.15, 0.05, 0.34), V(0.14, 0.14, 0.14), { material: mat(0x55606e) }); add(c.head, GEO.cyl, 0x55606e, V(0, 0.34, -0.05), V(0.42, 0.04, 0.42), { shadow: false }); },
  cap_mushroom(c) { add(c.head, GEO.hemi, c.col, V(0, 0.15, 0), V(0.68, 0.52, 0.68)); add(c.head, GEO.cyl, c.alt, V(0, 0.15, 0), V(0.52, 0.04, 0.52)); },
  spots(c) { for (const [x, y, z, r] of [[0, 0.6, 0.1, 0.1], [0.28, 0.45, -0.12, 0.08], [-0.26, 0.48, 0.1, 0.09], [0.1, 0.5, -0.3, 0.07]]) add(c.head, GEO.sphere, c.alt, V(x, y, z), V(r, r * 0.6, r)); },
  witch_hat(c) { add(c.head, GEO.cyl, c.col, V(0, 0.34, 0), V(0.62, 0.04, 0.62)); add(c.head, GEO.cone, c.col, V(0.04, 0.72, 0), V(0.32, 0.8, 0.32), { rz: -0.15 }); add(c.head, GEO.cyl, c.alt, V(0, 0.42, 0), V(0.34, 0.07, 0.34)); },
  stars(c) { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; add(c.torso, GEO.octa, c.alt, V(Math.cos(a) * 0.62, 0.9, Math.sin(a) * 0.62), V(0.08, 0.08, 0.08), { material: mat(c.alt, { basic: true }), name: 'orbit' + i }); } },
  cape(c) { add(c.torso, GEO.box, c.alt, V(0, 0.1, -0.36), V(0.62, 0.78, 0.05), { rx: 0.12 }); },
  antenna(c) { add(c.head, GEO.cyl, 0x556070, V(0.18, 0.5, 0), V(0.025, 0.36, 0.025)); add(c.head, GEO.sphere, 0xffe27a, V(0.18, 0.7, 0), V(0.07, 0.07, 0.07), { material: mat(0xffe27a, { emissive: 1, basic: true }), name: 'glowbit' }); },
  visor(c) { add(c.head, GEO.box, 0x1a2a3a, V(0, 0.04, 0.3), V(0.6, 0.2, 0.2), { material: mat(0x5adcff, { emissive: 0.8 }) }); },
  bolts(c) { for (const s of [-1, 1]) add(c.torso, GEO.sphere, 0xaab4c4, V(s * 0.42, 0.62, 0), V(0.1, 0.1, 0.1)); add(c.torso, GEO.box, 0x3a4252, V(0, 0.4, 0.36), V(0.28, 0.22, 0.05), { material: mat(0xffd84a, { emissive: 0.6 }) }); },
  moss(c) { for (const [x, z] of [[-0.2, -0.1], [0.15, 0.05], [0.0, -0.22]]) add(c.head, GEO.sphere, 0x3f7a2a, V(x, 0.34, z), V(0.2, 0.1, 0.18)); },
  leaf_hair(c) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(c.head, GEO.sphere, i % 2 ? 0x2f9a3a : 0x5ad05a, V(Math.cos(a) * 0.2, 0.42, Math.sin(a) * 0.2), V(0.07, 0.04, 0.22), { ry: -a, rx: -0.5 }); } },
  flower(c) { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(c.head, GEO.sphere, 0xff8ac8, V(0.28 + Math.cos(a) * 0.09, 0.4 + Math.sin(a) * 0.09, 0.12), V(0.06, 0.06, 0.03)); } add(c.head, GEO.sphere, 0xffe27a, V(0.28, 0.4, 0.14), V(0.05, 0.05, 0.04)); },
  vines(c) { for (const s of [-1, 1]) add(c.torso, GEO.cyl, 0x3f9a3a, V(s * 0.46, 0.3, 0.08), V(0.035, 0.5, 0.035), { rz: s * 0.1 }); },
  skull_eyes() {},
  ghost_tail(c) { add(c.bottom, GEO.cone, c.col, V(0, 0.2, 0), V(0.4, 0.8, 0.4), { rx: Math.PI, material: mat(c.col, { opacity: 0.8, emissive: 0.4 }), name: 'tail' }); },
  mane(c) { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; add(c.head, GEO.sphere, c.alt, V(Math.cos(a) * 0.42, Math.sin(a) * 0.42, -0.12), V(0.15, 0.15, 0.15)); } },
  halo(c) { add(c.head, GEO.torus, 0xffe27a, V(0, 0.62, 0), V(0.3, 0.3, 0.3), { rx: Math.PI / 2, material: mat(0xffe27a, { emissive: 1, basic: true }), name: 'halo' }); },
  glow(c) { add(c.torso, GEO.sphere, c.alt, V(0, 0.42, 0), V(0.7, 0.7, 0.7), { material: mat(c.alt, { opacity: 0.22, basic: true }), shadow: false }); },
  glow_eyes() {},
  hood(c) { add(c.head, GEO.sphere, shade(c.col, 0.8), V(0, 0.02, -0.08), V(0.5, 0.48, 0.5)); add(c.head, GEO.cone, shade(c.col, 0.8), V(0, 0.5, -0.12), V(0.3, 0.5, 0.3), { rx: -0.3 }); },
  pirate_hat(c) { add(c.head, GEO.cone, 0x1a1a22, V(0, 0.46, 0), V(0.62, 0.34, 0.45), { rz: 0 }); add(c.head, GEO.cyl, 0x1a1a22, V(0, 0.32, 0), V(0.66, 0.05, 0.5)); add(c.head, GEO.sphere, 0xf0f0f0, V(0, 0.46, 0.34), V(0.07, 0.07, 0.03)); },
  beard(c) { for (let i = 0; i < 5; i++) add(c.head, GEO.cone, 0x2a2a3a, V((i - 2) * 0.12, -0.4, 0.28), V(0.07, 0.3, 0.07), { rx: Math.PI }); },
  pearls(c) { for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 1.5; add(c.torso, GEO.sphere, 0xffffff, V(Math.sin(a) * 0.36, 0.68 - Math.abs(a) * 0.1, 0.34), V(0.06, 0.06, 0.06)); } },
  gloves(c) { for (const s of [-1, 1]) add(c.torso, GEO.sphere, c.alt, V(s * 0.52, 0.3, 0.12), V(0.17, 0.17, 0.17)); },
  swirl(c) { add(c.torso, GEO.torus, 0xdff6ff, V(0, 0.42, 0), V(0.62, 0.62, 0.3), { rx: Math.PI / 2, material: mat(0xdff6ff, { opacity: 0.55, basic: true }), name: 'spin', shadow: false }); },
  angry() {},
};

// ---------------------------------------------------------------------- Helden
function legHeight(b) { return b.legs === 'long' ? 0.56 : b.legs === 'short' ? 0.32 : b.legs === 'stub' ? 0.18 : 0.28; }

function buildBottom(spec) {
  const b = spec.body, g = new THREE.Group();
  const lh = legHeight(b);
  const c = { bottom: g, col: b.col, alt: b.alt };
  const anim = {};
  if (b.legs !== 'none') {
    for (const s of [-1, 1]) {
      const leg = group(g, s < 0 ? 'legL' : 'legR', V(s * 0.17, lh, 0));
      add(leg, GEO.cyl, shade(b.col, 0.9), V(0, -lh / 2, 0), V(0.12, lh, 0.12));
      add(leg, GEO.sphere, shade(b.alt, 0.85), V(0, -lh + 0.06, 0.06), V(0.16, 0.1, 0.22));
    }
  }
  for (const f of b.f) if (F[f] && ['tail_thin', 'tail_bushy', 'tail_fin', 'flame_tail', 'ghost_tail', 'tentacles'].includes(f)) F[f](c);
  g.userData.legH = lh;
  return g;
}

function buildTop(spec) {
  const b = spec.body, g = new THREE.Group();
  const el = ELEMENTS[spec.el];
  const torso = group(g, 'torso', V(0, 0, 0));
  const head = group(g, 'head', V(0, 1.0, 0.04));
  const c = { top: g, torso, head, col: b.col, alt: b.alt, el };
  // Rumpf
  if (b.torso === 'bulky') add(torso, GEO.sphere, b.col, V(0, 0.42, 0), V(0.54, 0.5, 0.46), { name: 'body' });
  else if (b.torso === 'ribs') {
    add(torso, GEO.sphere, shade(b.col, 0.9), V(0, 0.42, 0), V(0.36, 0.46, 0.3), { name: 'body' });
    for (let i = 0; i < 3; i++) add(torso, GEO.box, 0x30363a, V(0, 0.28 + i * 0.14, 0.27), V(0.44, 0.035, 0.05));
  } else add(torso, GEO.sphere, b.col, V(0, 0.42, 0), V(0.42, 0.48, 0.38), { name: 'body' });
  if (b.torso !== 'ribs') add(torso, GEO.sphere, b.alt, V(0, 0.36, 0.1), V(b.torso === 'bulky' ? 0.36 : 0.3, 0.32, 0.3));
  // Element-Juwel
  add(torso, GEO.octa, el.color, V(0, 0.55, b.torso === 'bulky' ? 0.44 : 0.36), V(0.08, 0.1, 0.05), { material: mat(el.color, { emissive: 1, basic: true }), name: 'gem' });
  // Arme
  for (const s of [-1, 1]) {
    const arm = group(torso, s < 0 ? 'armL' : 'armR', V(s * (b.torso === 'bulky' ? 0.58 : 0.46), 0.6, 0.02));
    add(arm, GEO.sphere, shade(b.col, 0.95), V(0, -0.14, 0.04), V(0.12, 0.2, 0.12));
  }
  // Kopf
  let hs = [0.4, 0.38, 0.4];
  if (b.head === 'wide') hs = [0.48, 0.38, 0.42]; else if (b.head === 'dome') hs = [0.44, 0.36, 0.44]; else if (b.head === 'tall') hs = [0.36, 0.5, 0.36];
  if (b.head === 'box') add(head, GEO.box, b.col, V(0, 0, 0), V(0.72, 0.6, 0.62), { name: 'headmesh' });
  else add(head, GEO.sphere, b.col, V(0, 0, 0), hs, { name: 'headmesh' });
  if (b.head === 'pointy') add(head, GEO.cone, b.alt, V(0, -0.06, 0.4), V(0.16, 0.34, 0.16), { rx: Math.PI / 2 });
  if (b.head === 'skull') add(head, GEO.box, shade(b.col, 0.9), V(0, -0.3, 0.12), V(0.3, 0.14, 0.24));
  // Augen
  const eyes = group(head, 'eyes', V(0, 0.04, 0));
  const hasGlow = b.f.includes('glow_eyes'), skull = b.f.includes('skull_eyes') || b.head === 'skull';
  const zf = b.head === 'box' ? 0.32 : 0.33;
  for (const s of [-1, 1]) {
    if (skull) {
      add(eyes, GEO.sphere, 0x101414, V(s * 0.15, 0.02, zf), V(0.11, 0.12, 0.08));
      add(eyes, GEO.sphere, 0x5ad090, V(s * 0.15, 0.02, zf + 0.04), V(0.05, 0.05, 0.04), { material: mat(0x5ad090, { emissive: 1, basic: true }) });
    } else {
      add(eyes, GEO.sphere, hasGlow ? shade(b.alt, 1) : 0xffffff, V(s * 0.15, 0.04, zf), V(0.1, 0.12, 0.07), hasGlow ? { material: mat(b.alt, { emissive: 1, basic: true }) } : {});
      if (!hasGlow) {
        add(eyes, GEO.sphere, 0x15151c, V(s * 0.15, 0.03, zf + 0.04), V(0.055, 0.075, 0.04));
        add(eyes, GEO.sphere, 0xffffff, V(s * 0.15 + 0.02, 0.07, zf + 0.075), V(0.02, 0.02, 0.02), { material: mat(0xffffff, { basic: true }) });
      }
    }
    if (b.f.includes('angry')) add(head, GEO.box, 0x15151c, V(s * 0.15, 0.18, zf + 0.02), V(0.16, 0.04, 0.05), { rz: s * 0.45 });
  }
  for (const f of b.f) if (F[f] && !['tail_thin', 'tail_bushy', 'tail_fin', 'flame_tail', 'ghost_tail', 'tentacles'].includes(f)) F[f](c);
  g.userData.parts = { torso, head, eyes };
  return g;
}

// Hut auf den Kopf setzen
export function buildHat(id) {
  const h = HATS[id];
  if (!h) return null;
  const g = new THREE.Group(), c = h.color;
  switch (h.shape) {
    case 'cap': add(g, GEO.hemi, c, V(0, 0, 0), V(0.44, 0.3, 0.44)); add(g, GEO.cyl, shade(c, 0.8), V(0, 0.01, 0.32), V(0.3, 0.03, 0.2)); break;
    case 'wizard': add(g, GEO.cyl, c, V(0, 0, 0), V(0.52, 0.04, 0.52)); add(g, GEO.cone, c, V(0, 0.4, 0), V(0.3, 0.8, 0.3), { rz: -0.12 }); break;
    case 'helmet': add(g, GEO.hemi, c, V(0, 0, 0), V(0.46, 0.38, 0.46)); add(g, GEO.box, shade(c, 0.7), V(0, 0.2, 0), V(0.06, 0.12, 0.5)); break;
    case 'crown': add(g, GEO.cyl, c, V(0, 0.08, 0), V(0.32, 0.16, 0.32), { material: mat(c, { emissive: 0.4 }) }); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(g, GEO.cone, c, V(Math.cos(a) * 0.28, 0.26, Math.sin(a) * 0.28), V(0.07, 0.2, 0.07), { material: mat(c, { emissive: 0.4 }) }); } break;
    case 'hood': add(g, GEO.hemi, c, V(0, -0.05, -0.04), V(0.5, 0.44, 0.52)); break;
    case 'pirate': add(g, GEO.cone, c, V(0, 0.18, 0), V(0.58, 0.34, 0.42)); add(g, GEO.cyl, c, V(0, 0.02, 0), V(0.62, 0.05, 0.46)); add(g, GEO.sphere, 0xf0f0f0, V(0, 0.16, 0.3), V(0.06, 0.06, 0.03)); break;
    case 'top': add(g, GEO.cyl, c, V(0, 0.22, 0), V(0.26, 0.44, 0.26)); add(g, GEO.cyl, c, V(0, 0, 0), V(0.46, 0.04, 0.46)); add(g, GEO.cyl, 0xb02a3a, V(0, 0.08, 0), V(0.27, 0.07, 0.27)); break;
    case 'propeller': add(g, GEO.hemi, c, V(0, 0, 0), V(0.44, 0.3, 0.44)); add(g, GEO.cyl, 0x444444, V(0, 0.3, 0), V(0.025, 0.14, 0.025)); { const p = group(g, 'prop', V(0, 0.38, 0)); add(p, GEO.box, 0xffd84a, V(0, 0, 0), V(0.7, 0.02, 0.1)); add(p, GEO.box, 0x4ab0ff, V(0, 0, 0), V(0.1, 0.02, 0.7)); } break;
    case 'cone': add(g, GEO.cone, c, V(0, 0.34, 0), V(0.3, 0.7, 0.3)); add(g, GEO.octa, 0xffe27a, V(0, 0.74, 0), V(0.08, 0.08, 0.08), { material: mat(0xffe27a, { emissive: 1, basic: true }) }); break;
  }
  return g;
}

// ---------------------------------------------------------------------- Animation
function makeAnimator(root, parts) {
  const find = (n) => { let r = null; root.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
  const legL = find('legL'), legR = find('legR'), armL = find('armL'), armR = find('armR');
  const wingL = find('wingL'), wingR = find('wingR');
  const flames = [], tails = [], tents = [], orbits = [], spins = [], halos = [], props = [];
  root.traverse((o) => {
    if (o.name === 'flame') flames.push(o);
    else if (o.name === 'tail') tails.push(o);
    else if (/^tent\d$/.test(o.name)) tents.push(o);
    else if (/^orbit\d$/.test(o.name)) orbits.push(o);
    else if (o.name === 'spin') spins.push(o);
    else if (o.name === 'halo') halos.push(o);
    else if (o.name === 'prop') props.push(o);
  });
  const baseFlame = flames.map((f) => f.scale.clone());
  const baseTop = parts.topY;
  let blink = 0, nextBlink = 2 + Math.random() * 3;
  return function update(t, dt, st) {
    const { top, head, eyes } = parts;
    const moving = st.moving, w = st.walkT;
    const swing = moving ? Math.sin(w) * 0.7 : 0;
    if (legL) { legL.rotation.x = swing; legR.rotation.x = -swing; }
    if (armL) { armL.rotation.x = -swing * 0.8; armR.rotation.x = swing * 0.8; }
    let bob = moving ? Math.abs(Math.sin(w)) * 0.06 : Math.sin(t * 2.2) * 0.012;
    if (!st.grounded) bob = 0;
    const squash = st.landT > 0 ? 1 - st.landT * 0.5 : 1;
    top.position.y = baseTop + bob;
    top.scale.set(1 + (1 - squash) * 0.6, squash + (st.grounded ? 0 : 0.06), 1 + (1 - squash) * 0.6);
    top.rotation.x = (st.swing > 0 ? 0.28 * (st.swing / 0.25) : 0) + (moving ? 0.08 : 0) + (st.gliding ? 0.5 : 0);
    top.rotation.z = st.hurt > 0 ? Math.sin(t * 60) * 0.1 : 0;
    head.rotation.y = moving || st.swing > 0 ? 0 : Math.sin(t * 0.7) * 0.25;
    if (armL && st.swing > 0) { const k = st.swing / 0.25; armR.rotation.x = -1.6 * k; armL.rotation.x = -1.2 * k; }
    // Blinzeln
    blink -= dt; nextBlink -= dt;
    if (nextBlink <= 0) { blink = 0.12; nextBlink = 2 + Math.random() * 3.5; }
    eyes.scale.y = blink > 0 ? 0.12 : 1;
    // Flügel, Flammen, Schwänze
    if (wingL) { const fl = st.grounded ? Math.sin(t * 2) * 0.12 : Math.sin(t * 22) * 0.6; wingL.rotation.z = fl; wingR.rotation.z = -fl; }
    flames.forEach((f, i) => { const k = 1 + Math.sin(t * 14 + i * 2) * 0.18; f.scale.set(baseFlame[i].x * k, baseFlame[i].y * (1 + Math.sin(t * 11 + i) * 0.22), baseFlame[i].z * k); });
    tails.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.35; });
    tents.forEach((f, i) => { f.rotation.x = Math.sin(t * 3 + i * 1.3) * 0.25; f.rotation.z = Math.cos(t * 2.4 + i) * 0.2; });
    orbits.forEach((o, i) => { const a = t * 1.6 + (i / orbits.length) * Math.PI * 2; o.position.set(Math.cos(a) * 0.62, 0.9 + Math.sin(t * 2 + i) * 0.1, Math.sin(a) * 0.62); o.rotation.y = t * 3; });
    spins.forEach((s) => { s.rotation.z = t * 2.5; });
    halos.forEach((h) => { h.position.y = 0.62 + Math.sin(t * 2) * 0.03; });
    props.forEach((p) => { p.rotation.y = t * 20; });
  };
}

export function ownMaterials(root) {
  const map = new Map(), list = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let m = map.get(o.material);
    if (!m) { m = ownMat(o.material); map.set(o.material, m); list.push(m); }
    o.material = m;
  });
  return list;
}
export function makeFlasher(mats) {
  return function setFlash(f) {
    for (const m of mats) {
      if (!m.emissive) continue;
      if (f > 0) { m.emissive.setRGB(f, f, f); m.emissiveIntensity = 1; }
      else if (m.userData.baseEm) { m.emissive.copy(m.userData.baseEm); m.emissiveIntensity = m.userData.baseEmI; }
    }
  };
}

// Held: top/bot = Figuren-IDs (bei normalen Helden gleich). hat = Hut-ID oder null.
export function buildHero(topId, botId, hatId) {
  const topSpec = ALL_CHARS[topId], botSpec = ALL_CHARS[botId || topId];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const bottom = buildBottom(botSpec), top = buildTop(topSpec);
  body.add(bottom);
  const lh = bottom.userData.legH;
  top.position.y = lh + 0.05;
  body.add(top);
  const size = (topSpec.body.size + (botSpec.body.size || 1)) / 2;
  const parts = { top, head: top.userData.parts.head, eyes: top.userData.parts.eyes, topY: lh + 0.05 };
  if (hatId) {
    const hat = buildHat(hatId);
    if (hat) { hat.position.set(0, 0.34, -0.02); parts.head.add(hat); }
  }
  body.scale.setScalar(0.82 * size);
  const mats = ownMaterials(root);
  const update = makeAnimator(root, parts);
  // Schatten-Kontakt wird vom View gesetzt
  return { root, body, update, setFlash: makeFlasher(mats), size: 0.82 * size, height: (lh + 1.6) * 0.82 * size, dispose() { root.traverse((o) => { if (o.isMesh && mats.includes(o.material)) { /* Geometrien sind geteilt */ } }); mats.forEach((m) => m.dispose()); } };
}

// ---------------------------------------------------------------------- Gegner
function buildPart(parent, p) {
  const sc = p.s;
  const o = { material: mat(p.c, { emissive: p.emissive || 0, opacity: p.opacity ?? 1 }) };
  if (p.rx) o.rx = p.rx; if (p.rz) o.rz = p.rz;
  switch (p.g) {
    case 'sphere': return add(parent, GEO.sphere, p.c, p.p, sc, o);
    case 'cyl': return add(parent, GEO.cyl, p.c, p.p, sc, o);
    case 'cone': return add(parent, GEO.cone, p.c, p.p, sc, o);
    case 'box': return add(parent, GEO.box, p.c, p.p, sc, o);
    case 'eyes': {
      const g = group(parent, 'eyes', p.p);
      for (const s of [-1, 1]) {
        add(g, GEO.sphere, p.c === 0xffffff ? 0xffffff : p.c, V(s * 0.13 * sc[0], 0, 0), V(0.08 * sc[0], 0.1 * sc[0], 0.06 * sc[0]), { material: mat(p.c, { emissive: p.emissive ? 1 : 0, basic: !!p.emissive }) });
        add(g, GEO.sphere, 0x111111, V(s * 0.13 * sc[0], 0, 0.04 * sc[0]), V(0.045 * sc[0], 0.06 * sc[0], 0.03 * sc[0]), { shadow: false });
      }
      return g;
    }
    case 'wing': {
      const g = group(parent, p.side > 0 ? 'wingL' : 'wingR', p.p);
      add(g, GEO.sphere, p.c, V(p.side * 0.36 * sc[0], 0, 0), V(0.42 * sc[0], 0.04, 0.26), { material: mat(p.c), rz: p.side * 0.2 });
      return g;
    }
  }
  return null;
}

export function buildEnemy(spec, scale = 1) {
  const root = new THREE.Group();
  const body = group(root, 'body');
  const m = spec.model;
  for (const p of m.parts) buildPart(body, p);
  // Beine
  const legs = [];
  if (m.legs) {
    for (let i = 0; i < m.legs; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2) - (m.legs / 4 - 0.5);
      const leg = group(body, 'leg' + i, V(side * 0.3, 0.2, row * 0.4));
      const pc = m.parts[0].c;
      add(leg, GEO.cyl, pc, V(side * 0.1, -0.08, 0), V(0.04, 0.22, 0.04), { rz: side * 0.7 });
      legs.push(leg);
    }
  }
  body.scale.setScalar(scale);
  const mats = ownMaterials(root);
  const wings = [], flames = [];
  root.traverse((o) => { if (o.name === 'wingL' || o.name === 'wingR') wings.push(o); });
  const flash = makeFlasher(mats);
  const update = (t, dt, st) => {
    const moving = st.moving;
    legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(st.walkT * 1.5 + i * 1.7) * 0.7 : 0; });
    let sq = 1, lean = 0, bob = 0;
    if (st.state === 'windup' || st.state === 'diveWind') { sq = 0.85 + Math.sin(t * 40) * 0.04; lean = -0.2; }
    if (st.lunge > 0) lean = 0.4;
    if (spec.ai === 'jumper') { sq = st.grounded ? 0.82 + Math.sin(t * 6) * 0.04 : 1.2; }
    if (spec.ai === 'flyer') bob = Math.sin(t * 3 + st.seed) * 0.12;
    else if (moving) bob = Math.abs(Math.sin(st.walkT * 1.5)) * 0.06;
    body.position.y = bob;
    body.scale.set(scale * (2 - sq) ** 0.5, scale * sq, scale * (2 - sq) ** 0.5);
    body.rotation.x = lean;
    wings.forEach((wg) => { const s = wg.name === 'wingL' ? 1 : -1; wg.rotation.z = s * Math.sin(t * 20 + st.seed) * 0.7; });
    if (st.state === 'stun') body.rotation.z = Math.sin(t * 30) * 0.15; else body.rotation.z = 0;
  };
  return { root, body, update, setFlash: flash, height: spec.h * scale, dispose() { mats.forEach((mm) => mm.dispose()); } };
}

// Elite: der Schurke selbst (aus der Held-Vorlage), größer
export function buildElite(spec) {
  const villain = spec.villain;
  const h = buildHero(villain, villain, null);
  h.root.scale.setScalar(spec.scale || 1.4);
  h.height = spec.h;
  return h;
}

// ---------------------------------------------------------------------- Bosse
export function buildBoss(id, spec) {
  const root = new THREE.Group();
  const body = group(root, 'body');
  const c = spec.color;
  const extra = [];
  const glow = (x, y, z, r, color) => add(body, GEO.sphere, color, V(x, y, z), V(r, r, r), { material: mat(color, { emissive: 1, basic: true }), shadow: false });
  if (id === 'moragar') {
    add(body, GEO.cone, c, V(0, 1.2, 0), V(1.3, 2.4, 1.1));
    add(body, GEO.sphere, 0x2a1a44, V(0, 2.5, 0.05), V(0.62, 0.62, 0.6));
    add(body, GEO.cone, 0x2a1a44, V(0, 3.1, -0.1), V(0.55, 0.9, 0.55), { rx: -0.2 });
    glow(-0.2, 2.55, 0.55, 0.12, 0xff5aff); glow(0.2, 2.55, 0.55, 0.12, 0xff5aff);
    add(body, GEO.cyl, 0x5a3a24, V(1.05, 1.3, 0.4), V(0.07, 2.6, 0.07), { rz: -0.1 });
    extra.push(glow(1.12, 2.7, 0.4, 0.22, 0xb05cff));
    for (let i = 0; i < 3; i++) extra.push(glow(0, 1.5, 0, 0.18, 0xb05cff));
  } else if (id === 'eisenkessel') {
    add(body, GEO.sphere, c, V(0, 1.5, 0), V(1.5, 1.35, 1.4));
    add(body, GEO.cyl, 0x4a4440, V(0, 2.7, 0), V(1.1, 0.25, 1.0));
    add(body, GEO.cyl, 0x2a2420, V(-0.6, 3.1, -0.2), V(0.22, 0.9, 0.22));
    add(body, GEO.cone, 0xff7a2a, V(0, 3.1, 0), V(0.6, 0.9, 0.6), { material: mat(0xff7a2a, { emissive: 1, basic: true }), name: 'flame' });
    add(body, GEO.cone, 0xffd84a, V(0, 3.0, 0), V(0.35, 0.7, 0.35), { material: mat(0xffd84a, { emissive: 1, basic: true }), name: 'flame' });
    glow(-0.4, 1.9, 1.2, 0.24, 0xffa030); glow(0.4, 1.9, 1.2, 0.24, 0xffa030);
    add(body, GEO.box, 0x2a2420, V(0, 1.3, 1.25), V(0.9, 0.18, 0.2));
    for (const s of [-1, 1]) { add(body, GEO.sphere, 0x5a544e, V(s * 1.7, 1.6, 0), V(0.5, 0.6, 0.5)); add(body, GEO.cyl, 0x5a544e, V(s * 1.7, 0.7, 0), V(0.3, 1.2, 0.3)); add(body, GEO.cyl, 0x4a4440, V(s * 0.8, 0.4, 0), V(0.4, 0.8, 0.4)); }
  } else if (id === 'zerrax') {
    add(body, GEO.sphere, c, V(0, 1.5, 0), V(1.1, 1.4, 0.9));
    add(body, GEO.sphere, 0x4a3a88, V(0, 1.4, 0.3), V(0.8, 1.0, 0.5));
    add(body, GEO.sphere, c, V(0, 2.8, 0.2), V(0.6, 0.55, 0.65));
    add(body, GEO.cone, 0x2a1a48, V(0, 2.8, 0.85), V(0.28, 0.6, 0.28), { rx: Math.PI / 2 });
    for (const s of [-1, 1]) {
      add(body, GEO.cone, 0xd8c8ff, V(s * 0.4, 3.35, 0), V(0.14, 0.9, 0.14), { rz: -s * 0.4 });
      glow(s * 0.28, 2.92, 0.7, 0.13, 0xb05cff);
      const w = group(body, s < 0 ? 'wingL' : 'wingR', V(s * 0.7, 2.0, -0.4));
      add(w, GEO.sphere, 0x2a1a48, V(s * 1.0, 0.4, 0), V(1.2, 0.06, 0.6), { rz: s * 0.35 });
      add(w, GEO.sphere, 0x4a3a88, V(s * 1.8, 0.7, 0), V(0.7, 0.05, 0.4), { rz: s * 0.35 });
    }
    for (let i = 0; i < 6; i++) add(body, GEO.cone, 0x2a1a48, V(0, 0.8 + i * 0.4, -0.7), V(0.12, 0.4, 0.12), { rx: -1.0 });
    add(body, GEO.cone, c, V(0, 0.6, -0.9), V(0.4, 1.8, 0.4), { rx: -1.35 });
  } else { // kraal
    add(body, GEO.sphere, c, V(0, 2.2, 0), V(1.5, 1.4, 1.4));
    add(body, GEO.sphere, 0x4aa0c0, V(0, 2.7, 0.1), V(1.1, 0.8, 1.0), { material: mat(0x4aa0c0, { opacity: 0.9 }) });
    glow(-0.5, 2.3, 1.2, 0.2, 0xffe84a); glow(0.5, 2.3, 1.2, 0.2, 0xffe84a);
    add(body, GEO.cone, 0xe8f4ff, V(0, 3.9, 0), V(0.2, 1.2, 0.2));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(body, GEO.cyl, c, V(Math.cos(a) * 1.1, 0.9, Math.sin(a) * 1.1), V(0.22, 1.9, 0.22), { name: 'tent' + (i % 8), rz: Math.cos(a) * 0.4, rx: -Math.sin(a) * 0.4 }); }
  }
  body.scale.setScalar(spec.scale ? spec.scale / 2 : 1);
  const mats = ownMaterials(root);
  const flash = makeFlasher(mats);
  const flames = [], tents = [], wings = [];
  root.traverse((o) => { if (o.name === 'flame') flames.push(o); else if (/^tent\d$/.test(o.name)) tents.push(o); else if (o.name === 'wingL' || o.name === 'wingR') wings.push(o); });
  const bs = spec.scale ? spec.scale / 2 : 1;
  const update = (t, dt, st) => {
    body.position.y = Math.sin(t * 1.8) * 0.12 + (id === 'moragar' || id === 'zerrax' ? 0.3 : 0);
    if (st.state === 'cast') { body.scale.set(bs * (1 + Math.sin(t * 30) * 0.02), bs * (1.04 + Math.sin(t * 30) * 0.02), bs); }
    else body.scale.setScalar(bs);
    flames.forEach((f, i) => { f.scale.y = (0.8 + Math.sin(t * 12 + i) * 0.25); });
    tents.forEach((f, i) => { f.rotation.z += Math.sin(t * 2 + i) * 0.004; });
    wings.forEach((wg) => { const s = wg.name === 'wingL' ? 1 : -1; wg.rotation.z = s * Math.sin(t * 3) * 0.2; });
    if (id === 'moragar') extra.forEach((o, i) => { if (i === 0) return; const a = t * 1.6 + (i / 3) * Math.PI * 2; o.position.set(Math.cos(a) * 1.4, 1.8 + Math.sin(t * 2 + i) * 0.3, Math.sin(a) * 1.4); });
  };
  return { root, body, update, setFlash: flash, height: spec.h, dispose() { mats.forEach((m) => m.dispose()); } };
}

// ---------------------------------------------------------------------- Helfer
export function buildAlly(unit, elColor) {
  const root = new THREE.Group();
  const body = group(root, 'body');
  if (unit === 'turret') {
    add(body, GEO.cyl, 0x58606e, V(0, 0.2, 0), V(0.38, 0.4, 0.38));
    add(body, GEO.sphere, elColor, V(0, 0.62, 0), V(0.32, 0.3, 0.32), { material: mat(elColor, { emissive: 0.6 }) });
    add(body, GEO.cyl, 0x30343c, V(0, 0.66, 0.34), V(0.07, 0.5, 0.07), { rx: Math.PI / 2, name: 'barrel' });
  } else {
    add(body, GEO.sphere, elColor, V(0, 0.4, 0), V(0.34, 0.38, 0.32), { material: mat(elColor, { emissive: 0.5 }) });
    add(body, GEO.sphere, 0xffffff, V(0.12, 0.5, 0.26), V(0.07, 0.09, 0.05)); add(body, GEO.sphere, 0xffffff, V(-0.12, 0.5, 0.26), V(0.07, 0.09, 0.05));
  }
  return { root, body, update(t, dt, st) { body.position.y = unit === 'turret' ? 0 : Math.abs(Math.sin(t * 6)) * 0.08; if (unit === 'turret') body.rotation.z = 0; }, setFlash() {}, dispose() {} };
}
