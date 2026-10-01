// Gemeinsame Geometrien und Materialien (werden geteilt, damit der Grafikspeicher klein bleibt).
import * as THREE from '../../vendor/three.js';

export const GEO = {
  sphere: new THREE.SphereGeometry(1, 16, 12),
  sphereLow: new THREE.SphereGeometry(1, 8, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 7),
  cone: new THREE.ConeGeometry(1, 1, 12),
  coneLow: new THREE.ConeGeometry(1, 1, 6),
  octa: new THREE.OctahedronGeometry(1, 0),
  ico: new THREE.IcosahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.12, 8, 24),
  plane: new THREE.PlaneGeometry(1, 1),
  disc: new THREE.CircleGeometry(1, 32),
  ring: new THREE.RingGeometry(0.88, 1, 40),
  hemi: new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};
GEO.plane.rotateX(-Math.PI / 2);
GEO.disc.rotateX(-Math.PI / 2);
GEO.ring.rotateX(-Math.PI / 2);
// Kegel-Stumpf mit 4 Seiten: Basis für schwebende Inseln (unten schmal)
export function islandBodyGeo() {
  const g = new THREE.CylinderGeometry(0.7071, 0.26, 1, 4, 1, false);
  g.rotateY(Math.PI / 4);
  return g;
}

const cache = new Map();
export function mat(color, o = {}) {
  const key = color + '|' + (o.emissive || 0) + '|' + (o.opacity ?? 1) + '|' + (o.basic ? 'b' : 'l') + '|' + (o.vc ? 'v' : '') + '|' + (o.side || '') + '|' + (o.add ? 'a' : '') + '|' + (o.flat ? 'f' : '');
  let m = cache.get(key);
  if (m) return m;
  const opts = { color, transparent: (o.opacity ?? 1) < 1 || !!o.add, opacity: o.opacity ?? 1 };
  if (o.vc) opts.vertexColors = true;
  if (o.side === 'back') opts.side = THREE.BackSide; else if (o.side === 'double') opts.side = THREE.DoubleSide;
  if (o.add) { opts.blending = THREE.AdditiveBlending; opts.depthWrite = false; }
  if (o.basic) m = new THREE.MeshBasicMaterial(opts);
  else {
    if (o.emissive) { opts.emissive = new THREE.Color(color); opts.emissiveIntensity = o.emissive; }
    if (o.flat) opts.flatShading = true;
    m = new THREE.MeshLambertMaterial(opts);
  }
  cache.set(key, m);
  return m;
}
// eigene Kopie für Figuren (damit Treffer-Blitze nur diese Figur betreffen)
export function ownMat(m) {
  const c = m.clone();
  c.userData.baseEm = c.emissive ? c.emissive.clone() : null;
  c.userData.baseEmI = c.emissiveIntensity;
  return c;
}

export function mesh(geo, color, p, s, o = {}) {
  const m = new THREE.Mesh(geo, o.material || mat(color, o));
  if (p) m.position.set(p[0], p[1], p[2]);
  if (s) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.shadow) m.castShadow = true;
  return m;
}

// Mehrere Geometrien mit Vertexfarben zu einer zusammenfassen (für statische Level-Teile)
export class Batcher {
  constructor() { this.list = []; this.tmp = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); }
  add(geo, color, px, py, pz, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
    this.tmp.compose(this.v.set(px, py, pz), this.q, this.s.set(sx, sy, sz));
    g.applyMatrix4(this.tmp);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    if (g.index === null) { /* nicht indiziert ist ok, wenn alle so sind */ }
    this.list.push(g);
  }
  build(shadow = true) {
    if (!this.list.length) return null;
    const geos = this.list.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; });
    const merged = THREE.mergeGeometries ? THREE.mergeGeometries(geos, false) : null;
    for (const g of geos) g.dispose();
    const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.castShadow = shadow; mesh.receiveShadow = shadow;
    return mesh;
  }
}
