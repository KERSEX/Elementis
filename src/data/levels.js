// Level als Daten. Der LevelBuilder setzt Inseln wie mit einer Schildkröte hintereinander
// (next/turn), Inhalte werden relativ zur aktuellen Insel platziert (u = rechts, v = vorwärts).
import { mulberry32, hashStr } from '../core/util.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // Nord, Ost, Süd, West
const THICK = 3.2;

class LevelBuilder {
  constructor(def) {
    this.def = def;
    this.rng = mulberry32(hashStr(def.id));
    this.boxes = []; this.islands = []; this.enemies = []; this.pickups = [];
    this.checkpoints = []; this.story = []; this.zones = []; this.gates = [];
    this.dir = 0; this.cur = null; this.y = 0;
    this.spawn = [0, 0, 0]; this.goalPos = null; this.treasure = null; this.nid = 1;
  }
  get f() { return DIRS[this.dir]; }
  get r() { const f = DIRS[this.dir]; return [-f[1], f[0]]; }

  // ---------------------------------------------------------------- Inseln
  _island(cx, cz, y, w, d, o = {}) {
    const alongZ = this.dir % 2 === 0;
    const ex = alongZ ? w : d, ez = alongZ ? d : w;
    const isl = { cx, cz, y, w, d, ex, ez, kind: o.kind || this.def.ground || 'grass', thick: o.thick || THICK, bare: !!o.bare, nodecor: !!o.nodecor };
    const box = { x0: cx - ex / 2, x1: cx + ex / 2, z0: cz - ez / 2, z1: cz + ez / 2, y0: y - isl.thick, y1: y, mat: isl.kind, isl };
    if (o.mover) box.mover = o.mover;
    if (o.nodecor || o.mover || o.crumble) box.nodecor = true;
    if (o.crumble) box.crumble = { delay: o.crumble, respawn: 4.5, t: -1, off: 0 };
    this.boxes.push(box); isl.box = box;
    this.islands.push(isl);
    return isl;
  }
  start(w, d, o) {
    const isl = this._island(0, 0, 0, w, d, o);
    this.cur = isl; this.y = 0; this.spawn = [0, 0, 0];
    return this;
  }
  next(w, d, o = {}) {
    const gap = o.gap ?? 3, side = o.side ?? 0, dy = o.dy ?? 0;
    const p = this.cur, f = this.f, r = this.r;
    const along = (f[0] !== 0) ? p.ex : p.ez;
    const alongNew = d;                         // neue Tiefe liegt in Laufrichtung
    const dist = along / 2 + gap + alongNew / 2;
    this.prevMain = p;
    this.y += dy;
    const cx = p.cx + f[0] * dist + r[0] * side, cz = p.cz + f[1] * dist + r[1] * side;
    this.cur = this._island(cx, cz, this.y, w, d, o);
    return this;
  }
  turn(n) { this.dir = (this.dir + n + 4) % 4; return this; }

  // Plattform, die zwischen der aktuellen und der nächsten Insel pendelt
  ferry(gap, o = {}) {
    const size = o.size ?? 4.2, period = o.period ?? 7, axisY = !!o.lift;
    const p = this.cur, f = this.f;
    const along = (f[0] !== 0) ? p.ex : p.ez;
    const start = along / 2 + 0.7 + size / 2;               // Abstand Mitte → Mitte (nah an der Insel)
    const end = along / 2 + gap - 0.7 - size / 2;
    const mid = (start + end) / 2, amp = Math.max(0, (end - start) / 2);
    const cx = p.cx + f[0] * mid, cz = p.cz + f[1] * mid;
    const alongZ = this.dir % 2 === 0;
    const ex = alongZ ? (o.width ?? size) : size, ez = alongZ ? size : (o.width ?? size);
    const isl = { cx, cz, y: this.y, w: size, d: size, ex, ez, kind: 'metal', thick: 1.2, nodecor: true, plat: true };
    const box = { x0: cx - ex / 2, x1: cx + ex / 2, z0: cz - ez / 2, z1: cz + ez / 2, y0: this.y - 1.2, y1: this.y, mat: 'metal', isl, nodecor: true };
    box.mover = { axis: alongZ ? 'z' : 'x', amp, period, phase: o.phase ?? 0 };
    this.boxes.push(box); this.islands.push(isl); isl.box = box;
    return this;
  }
  // Aufzug: Plattform fährt zwischen aktueller Höhe und Höhe + dy
  lift(dy, o = {}) {
    const size = o.size ?? 5, period = o.period ?? 7;
    const p = this.cur, f = this.f;
    const along = (f[0] !== 0) ? p.ex : p.ez;
    const dist = along / 2 + 0.7 + size / 2;
    const cx = p.cx + f[0] * dist, cz = p.cz + f[1] * dist;
    const isl = { cx, cz, y: this.y, w: size, d: size, ex: size, ez: size, kind: 'metal', thick: 1.2, nodecor: true, plat: true };
    const box = { x0: cx - size / 2, x1: cx + size / 2, z0: cz - size / 2, z1: cz + size / 2, y0: this.y - 1.2, y1: this.y, mat: 'metal', isl, nodecor: true };
    box.mover = { axis: 'y', amp: Math.abs(dy) / 2, mid: dy / 2, period, phase: 0 };
    this.boxes.push(box); this.islands.push(isl); isl.box = box;
    // nächste Insel direkt hinter dem Aufzug
    this.cur = isl;
    return this;
  }
  // Abzweig zur Seite hinter einem Element-Tor (Schatz-Kammer)
  branch(sideDir, w, d, el, fn) {
    const saveDir = this.dir, saveCur = this.cur, saveY = this.y;
    this.dir = (this.dir + sideDir + 4) % 4;
    const f = this.f;
    const lateralHalf = (f[0] !== 0) ? saveCur.ex / 2 : saveCur.ez / 2;
    const dist = lateralHalf + d / 2;
    const cx = saveCur.cx + f[0] * dist, cz = saveCur.cz + f[1] * dist;
    const isl = this._island(cx, cz, this.y, w, d, { kind: 'stone', thick: 2.6 });
    this.cur = isl;
    // Tor
    const gx = saveCur.cx + f[0] * (lateralHalf - 0.1), gz = saveCur.cz + f[1] * (lateralHalf - 0.1);
    const alongZ = this.dir % 2 === 0;
    const gex = alongZ ? w : 0.9, gez = alongZ ? 0.9 : w;
    const gate = { x0: gx - gex / 2, x1: gx + gex / 2, z0: gz - gez / 2, z1: gz + gez / 2, y0: this.y, y1: this.y + 3.2, mat: 'gate', gate: { el, open: false, id: 'g' + this.nid++ } };
    this.boxes.push(gate); this.gates.push(gate);
    fn && fn(this);
    this.dir = saveDir; this.cur = saveCur; this.y = saveY;
    return this;
  }

  // ---------------------------------------------------------------- Inhalte
  at(u = 0, v = 0) {
    const c = this.cur, f = this.f, r = this.r;
    return [c.cx + r[0] * u + f[0] * v, this.y, c.cz + r[1] * u + f[1] * v];
  }
  _rand(margin = 1.8) {
    const c = this.cur;
    const hx = Math.max(0.5, c.ex / 2 - margin), hz = Math.max(0.5, c.ez / 2 - margin);
    return [c.cx + (this.rng() * 2 - 1) * hx, this.y, c.cz + (this.rng() * 2 - 1) * hz];
  }
  enemy(type, u = 0, v = 0, o = {}) {
    const [x, y, z] = this.at(u, v);
    this.enemies.push({ type, x, y, z, ...o });
    return this;
  }
  enemies_(type, n, margin = 2) {
    for (let i = 0; i < n; i++) { const [x, y, z] = this._rand(margin); this.enemies.push({ type, x, y, z }); }
    return this;
  }
  mob(types) { for (const t of types) this.enemies_(t, 1); return this; }
  pickup(kind, u = 0, v = 0, o = {}) {
    const [x, y, z] = this.at(u, v);
    this.pickups.push({ kind, x, y, z, id: o.id, val: o.val, hat: o.hat });
    return this;
  }
  coins(n, kind = 'coin') {
    for (let i = 0; i < n; i++) { const [x, y, z] = this._rand(1.5); this.pickups.push({ kind, x, y, z }); }
    return this;
  }
  coinRing(n, rad = 2.6, kind = 'coin') {
    const c = this.at(0, 0);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.pickups.push({ kind, x: c[0] + Math.cos(a) * rad, y: this.y, z: c[2] + Math.sin(a) * rad }); }
    return this;
  }
  // Münzbogen über die Lücke zur vorherigen Insel
  trail(n = 4, from) {
    const a = from || this.prevMain, b = this.cur;
    if (!a) return this;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      this.pickups.push({ kind: 'coin', x: a.cx + (b.cx - a.cx) * t, z: a.cz + (b.cz - a.cz) * t, y: a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 1.6 });
    }
    return this;
  }
  heart(u = 0, v = 0) { return this.pickup('heart', u, v); }
  cp(u = 0, v = 0) { const [x, y, z] = this.at(u, v); this.checkpoints.push({ x, y, z }); return this; }
  goal(u = 0, v = 0) { const [x, y, z] = this.at(u, v); this.goalPos = [x, y, z]; return this; }
  block(u, v, w, d, h, mat = 'stone') {
    const [x, y, z] = this.at(u, v);
    const alongZ = this.dir % 2 === 0;
    const ex = alongZ ? w : d, ez = alongZ ? d : w;
    this.boxes.push({ x0: x - ex / 2, x1: x + ex / 2, z0: z - ez / 2, z1: z + ez / 2, y0: y - 0.2, y1: y + h, mat, prop: true });
    return this;
  }
  said(who, text, r = 7) { const [x, , z] = this.at(0, 0); this.story.push({ x, z, r, who, text }); return this; }
  vent(u, v, r = 1.6, period = 5) { const [x, y, z] = this.at(u, v); this.zones.push({ kind: 'vent', x, y, z, r, period, on: 1.3, phase: this.rng() * period }); return this; }
  treasureGate(el, id) {
    // Schatzkammer hinter einem Tor (links), ★3 "Schatz gefunden"
    this.branch(-1, 5, 5, el, (b) => { b.pickup('treasure', 0, 0, { id }); b.coins(4, 'coin5'); });
    this.treasure = id;
    return this;
  }
  finish() {
    const d = this.def;
    let minY = 0;
    for (const b of this.boxes) if (!b.prop && !b.gate) minY = Math.min(minY, b.y1);
    return {
      id: d.id, name: d.name, world: d.world, theme: d.theme, desc: d.desc, boss: d.boss || null, order: d.order,
      challenges: d.challenges, par: d.par || 240, ground: d.ground, storm: !!d.storm, arena: !!d.arena,
      boxes: this.boxes, islands: this.islands, enemies: this.enemies, pickups: this.pickups, checkpoints: this.checkpoints,
      story: this.story, zones: this.zones, gates: this.gates, spawn: this.spawn, goal: this.goalPos, treasure: this.treasure,
      killY: minY - 9, seaY: minY - 5.5,
    };
  }
}

const CH_LEVEL = ['clear', 'kills', 'treasure'];
const CH_BOSS = ['clear', 'nodown', 'speed'];

// ======================================================================================
// WELT 1 – Himmelsinseln
// ======================================================================================
function w1l1() {
  const b = new LevelBuilder({ id: 'w1l1', name: 'Moosklippen', world: 1, order: 1, theme: 'sky', ground: 'grass', desc: 'Grüne Inseln über den Wolken. Hier lernst du laufen, springen und kämpfen.', challenges: CH_LEVEL, par: 200 });
  b.start(12, 12).coins(6).said('Wolkenwächter', 'Willkommen auf den Moosklippen! Sammle Münzen, besiege die Käfer und finde den Weg zum Portal. Die Steuerung steht im Pause-Menü.');
  b.next(8, 8, { gap: 2.4 }).trail(2).enemy('kaefer', 0, 1).coins(3);
  b.next(8, 11, { gap: 2.8 }).trail(3).mob(['kaefer', 'kaefer']).heart(2, 0).said('Wolkenwächter', 'Käfer! Greife sie mit der Maus gezielt an – sie beißen nur im Nahkampf.', 6);
  b.next(10, 10, { gap: 3, dy: 1 }).trail(3).cp().enemy('spucker', 3, 3).enemy('spucker', -3, 3).coins(4).pickup('coin5', 0, 0);
  b.treasureGate('feuer', 't_muschel');
  b.next(6, 12, { gap: 3, side: 2 }).trail(3).coins(6).said('Wolkenwächter', 'Ein Tor mit Feuer-Zeichen! Mit einem Feuer-Helden öffnest du es mit E.', 8);
  b.turn(1).next(12, 10, { gap: 3, dy: -0.5 }).mob(['kaefer', 'kaefer', 'windling', 'windling']).heart(0, 3).coins(3);
  b.branch(1, 5, 5, 'luft', (c) => { c.pickup('hat', 0, 0, { id: 'moos' }); c.coins(5); });
  b.next(7, 9, { gap: 3.2, dy: 1 }).trail(3).cp().enemy('fels', 0, 0).coins(4);
  b.turn(-1).next(9, 12, { gap: 3, dy: 0.5 }).trail(3).mob(['windling', 'spucker', 'kaefer', 'kaefer']).pickup('crystal', 0, -3).heart(2, 2).coins(4);
  b.next(12, 12, { gap: 3.5 }).trail(4).coinRing(10, 3.2).goal(0, 0).said('Wolkenwächter', 'Geschafft! Das Portal bringt dich zurück zur Wolkenfeste.', 5);
  return b.finish();
}

function w1l2() {
  const b = new LevelBuilder({ id: 'w1l2', name: 'Nebelmoor-Ruinen', world: 1, order: 2, theme: 'sky', ground: 'stone', desc: 'Alte Ruinen im Nebel. Die Gegner werden zäher, und ein Schurke lauert.', challenges: CH_LEVEL, par: 260, fog: true });
  b.start(12, 10).coins(5).said('Wolkenwächter', 'Die Ruinen sind rutschig und alt. Ein Schurke haust hier – mit einem Fangkristall kannst du ihn fangen!');
  b.next(8, 10, { gap: 3 }).trail(3).mob(['kaefer', 'kaefer', 'spucker']).block(-2, 0, 1.4, 1.4, 2.2, 'pillar').block(2.4, 2, 1.4, 1.4, 2.2, 'pillar');
  b.next(10, 8, { gap: 3.2, dy: 0.6 }).trail(3).mob(['windling', 'windling', 'kaefer']).heart(0, 0).coins(3);
  b.treasureGate('wasser', 't_kompass');
  b.next(6, 14, { gap: 3.2, side: -2 }).trail(3).cp().coins(6, 'coin').mob(['spucker', 'spucker']);
  b.turn(1).next(14, 12, { gap: 3.2, dy: 0.8 }).trail(3).mob(['fels', 'windling', 'kaefer', 'kaefer']).block(0, 0, 1.6, 1.6, 2.4, 'pillar').heart(4, 3).pickup('crystal', -4, -3);
  b.next(7, 8, { gap: 3, dy: -0.6 }).trail(3).coins(4).cp();
  b.turn(-1).next(16, 16, { gap: 3.4, dy: 0.4 }).trail(4).said('Rumpel', 'Wer stört mein Nickerchen?! Ich zerquetsche euch!', 9)
    .enemy('rumpel', 0, 2).mob(['kaefer', 'kaefer', 'windling']).heart(-5, -5).heart(5, -5).block(-5, 3, 1.6, 1.6, 2.4, 'pillar').block(5, 3, 1.6, 1.6, 2.4, 'pillar');
  b.branch(1, 5, 5, 'erde', (c) => { c.pickup('soul', 0, 0, { id: 'soul_w1l2' }); c.coins(4, 'coin5'); });
  b.next(10, 10, { gap: 3.5, dy: 0.5 }).trail(4).coinRing(8, 3).goal();
  return b.finish();
}

function w1boss() {
  const b = new LevelBuilder({ id: 'w1boss', name: 'Moragars Bastion', world: 1, order: 3, theme: 'sky', ground: 'stone', desc: 'Der Schattenmagier Moragar erwartet dich.', boss: 'moragar', challenges: CH_BOSS, par: 240 });
  b.start(10, 8).said('Wolkenwächter', 'Dahinter liegt Moragars Arena. Sammle Kraft – er hat kein Erbarmen!').heart(0, 0).cp();
  b.next(30, 30, { gap: 3.5, thick: 4 });
  b.block(-9, -9, 1.8, 1.8, 3, 'pillar').block(9, -9, 1.8, 1.8, 3, 'pillar').block(-9, 9, 1.8, 1.8, 3, 'pillar').block(9, 9, 1.8, 1.8, 3, 'pillar');
  b.cp(0, 11);
  b.enemy('moragar', 0, -3);
  b.goal(0, 0);
  return b.finish();
}

// ======================================================================================
// WELT 2 – Glutschmiede
// ======================================================================================
function w2l1() {
  const b = new LevelBuilder({ id: 'w2l1', name: 'Funkenhalle', world: 2, order: 4, theme: 'forge', ground: 'basalt', desc: 'Lava unter dir, Dampf um dich. Bewegte Plattformen tragen dich über die Glut.', challenges: CH_LEVEL, par: 240 });
  b.start(12, 10).coins(5).said('Wolkenwächter', 'Die Glutschmiede! Wer in die Lava fällt, verliert Lebenspunkte. Nutze die Plattformen.');
  b.next(8, 9, { gap: 2.8 }).trail(2).mob(['schleim', 'funkenkaefer']).heart(0, 2);
  b.ferry(10, { size: 4.4, period: 7 }); b.next(9, 9, { gap: 10 }).mob(['schleim', 'schleim', 'fledermaus']).cp().coins(4);
  b.vent(-2, 0).vent(2, 2, 1.6, 6);
  b.treasureGate('wasser', 't_zahnrad');
  b.next(7, 14, { gap: 3.2, side: 2, dy: 0.5 }).trail(3).mob(['funkenkaefer', 'funkenkaefer', 'funkenkaefer']).vent(0, 0, 1.8, 4.5).coins(6);
  b.turn(1).next(12, 10, { gap: 3, dy: 0.5 }).trail(3).mob(['golem', 'fledermaus']).heart(-3, 0).cp();
  b.ferry(11, { size: 4.4, period: 6.5, phase: 1.5 }); b.next(8, 8, { gap: 11 }).mob(['schleim', 'schleim']).pickup('crystal', 0, 0).coins(4);
  b.turn(-1).next(10, 12, { gap: 3, dy: 0.4 }).trail(3).mob(['fledermaus', 'fledermaus', 'schleim', 'funkenkaefer']).heart(0, 3).vent(2, -2, 1.6, 5);
  b.branch(1, 5, 5, 'feuer', (c) => { c.pickup('hat', 0, 0, { id: 'schmied' }); c.coins(5, 'coin5'); });
  b.next(12, 12, { gap: 3.4 }).trail(4).coinRing(10, 3.2).goal();
  return b.finish();
}

function w2l2() {
  const b = new LevelBuilder({ id: 'w2l2', name: 'Essenschlund', world: 2, order: 5, theme: 'forge', ground: 'basalt', desc: 'Aufzüge und Glutströme. Tief unten wartet der Schurke Zunder.', challenges: CH_LEVEL, par: 300 });
  b.start(10, 10).coins(5).said('Wolkenwächter', 'Der Essenschlund ist heiß und steil. Zwei Schurken treiben hier ihr Unwesen.');
  b.next(8, 9, { gap: 3 }).trail(3).mob(['golem', 'schleim']).heart(0, -2);
  b.lift(3.6, { size: 5, period: 6 }); b.next(9, 9, { gap: 0.8, dy: 3.6 }); b.mob(['fledermaus', 'fledermaus', 'funkenkaefer', 'funkenkaefer']).cp().coins(4);
  b.treasureGate('erde', 't_glutstein');
  b.next(7, 14, { gap: 3.2, side: -1.5, dy: 0.5 }).trail(3).vent(0, -2, 1.8, 4.5).vent(0, 3, 1.8, 5.5).mob(['schleim', 'schleim', 'golem']);
  b.turn(1).next(12, 11, { gap: 3, dy: -0.4 }).trail(3).heart(0, 0).pickup('crystal', 4, -3).mob(['funkenkaefer', 'funkenkaefer', 'fledermaus']).cp();
  b.ferry(10, { size: 4.4, period: 6, phase: 3 }); b.next(9, 9, { gap: 10 }).mob(['golem', 'fledermaus']).coins(5);
  b.turn(-1).next(16, 16, { gap: 3.4, dy: 0.6 }).trail(4).said('Zunder', 'Hehe, Besuch! Ich hab genug Feuer für alle!', 9)
    .enemy('zunder', 0, 3).mob(['schleim', 'schleim', 'funkenkaefer']).heart(-5, -5).heart(5, -5).vent(-5, 2, 1.6, 6).vent(5, 2, 1.6, 6);
  b.branch(-1, 5, 5, 'tech', (c) => { c.pickup('soul', 0, 0, { id: 'soul_w2l2' }); c.pickup('hat', 0, 2, { id: 'glut' }); });
  b.next(10, 10, { gap: 3.4 }).trail(4).coinRing(8, 3).goal();
  return b.finish();
}

function w2boss() {
  const b = new LevelBuilder({ id: 'w2boss', name: 'Kessel der Glut', world: 2, order: 6, theme: 'forge', ground: 'basalt', desc: 'Eisenkessel, der Herr der Schmiede, erhitzt seine Arena.', boss: 'eisenkessel', challenges: CH_BOSS, par: 280 });
  b.start(10, 8).said('Wolkenwächter', 'Eisenkessel schmiedet seine Kriegsmaschinen selbst. Bleib in Bewegung!').heart(0, 0).cp();
  b.next(32, 32, { gap: 3.5, thick: 4 }).cp(0, 12);
  b.block(-10, 0, 2, 2, 3, 'pillar').block(10, 0, 2, 2, 3, 'pillar').block(0, 10, 2, 2, 3, 'pillar');
  b.vent(-8, -8, 1.8, 6).vent(8, -8, 1.8, 6);
  b.enemy('eisenkessel', 0, -4).goal(0, 0);
  return b.finish();
}

// ======================================================================================
// WELT 3 – Schattenzitadelle
// ======================================================================================
function w3l1() {
  const b = new LevelBuilder({ id: 'w3l1', name: 'Schattenhof', world: 3, order: 7, theme: 'shadow', ground: 'obsidian', desc: 'Der Vorhof der Zitadelle. Brüchige Steine geben unter dir nach.', challenges: CH_LEVEL, par: 260 });
  b.start(12, 10).coins(5).said('Wolkenwächter', 'Die Schattenzitadelle! Manche Platten brechen weg, sobald du sie betrittst.');
  b.next(8, 9, { gap: 3 }).trail(3).mob(['hund', 'schuetze']).heart(0, 1);
  b.next(5, 5, { gap: 2.8, crumble: 0.7 }).coins(2); b.next(5, 5, { gap: 2.8, crumble: 0.7, side: 1 }).coins(2); b.next(5, 5, { gap: 2.8, crumble: 0.7, side: -1 }).coins(2);
  b.next(10, 10, { gap: 2.8 }).cp().mob(['hund', 'hund', 'geist']).heart(3, 3);
  b.treasureGate('untot', 't_schatten');
  b.next(7, 13, { gap: 3.2, dy: 0.6 }).trail(3).mob(['schuetze', 'schuetze', 'geist']).coins(6);
  b.turn(1).next(12, 12, { gap: 3.2, dy: 0.4 }).trail(3).mob(['ritter', 'hund', 'geist']).heart(-3, 3).cp().pickup('crystal', 4, -3);
  b.next(5, 5, { gap: 2.8, crumble: 0.7 }).coins(2); b.next(5, 5, { gap: 2.8, crumble: 0.7, side: -1 }).coins(2); b.next(5, 5, { gap: 2.8, crumble: 0.7 }).coins(2);
  b.next(10, 12, { gap: 2.8, dy: 0.4 }).mob(['hund', 'hund', 'schuetze', 'schuetze']).heart(0, 3);
  b.branch(1, 5, 5, 'licht', (c) => { c.pickup('hat', 0, 0, { id: 'schatten' }); c.coins(5, 'coin5'); });
  b.turn(-1).next(12, 12, { gap: 3.4 }).trail(4).coinRing(10, 3.2).goal();
  return b.finish();
}

function w3l2() {
  const b = new LevelBuilder({ id: 'w3l2', name: 'Zitadellen-Turm', world: 3, order: 8, theme: 'shadow', ground: 'obsidian', desc: 'Hinauf in den Turm. Zwei Schurken bewachen den Aufstieg.', challenges: CH_LEVEL, par: 320 });
  b.start(10, 10).coins(5).said('Wolkenwächter', 'Der Turm führt zu Zerrax. Morrigan und Vesper wachen über den Weg.');
  b.next(8, 9, { gap: 3, dy: 0.8 }).trail(3).mob(['ritter', 'geist']).heart(0, 0);
  b.next(5, 5, { gap: 2.8, dy: 0.8, crumble: 0.6 }).coins(2); b.next(5, 5, { gap: 2.8, dy: 0.8, crumble: 0.6, side: 1 }).coins(2);
  b.next(11, 11, { gap: 2.8, dy: 0.8 }).cp().mob(['hund', 'hund', 'schuetze', 'geist']).heart(-3, 0);
  b.treasureGate('dunkel', 't_sterne');
  b.turn(1).next(14, 10, { gap: 3.2, dy: 0.8 }).trail(3).said('Morrigan', 'Meine Diener werden dich verschlingen!', 9).enemy('morrigan', 3, 0).mob(['schatten', 'schatten', 'geist']).heart(-4, 3).pickup('crystal', -5, -3);
  b.next(5, 5, { gap: 2.8, dy: 0.6, crumble: 0.6 }).coins(2); b.next(5, 5, { gap: 2.8, dy: 0.6, crumble: 0.6, side: -1 }).coins(2);
  b.next(12, 12, { gap: 2.8, dy: 0.6 }).cp().mob(['ritter', 'ritter', 'schuetze']).heart(0, 3);
  b.turn(-1).next(16, 16, { gap: 3.2, dy: 0.8 }).trail(4).said('Vesper', 'Flatter, flatter ... du kommst nicht weiter!', 9)
    .enemy('vesper', 0, 3).mob(['hund', 'hund', 'geist']).heart(-5, -5).heart(5, -5).block(-5, 0, 1.6, 1.6, 2.6, 'pillar').block(5, 0, 1.6, 1.6, 2.6, 'pillar');
  b.branch(1, 5, 5, 'leben', (c) => { c.pickup('soul', 0, 0, { id: 'soul_w3l2' }); c.pickup('hat', 0, 2, { id: 'turm' }); });
  b.next(10, 10, { gap: 3.4, dy: 0.5 }).trail(4).coinRing(8, 3).goal();
  return b.finish();
}

function w3boss() {
  const b = new LevelBuilder({ id: 'w3boss', name: 'Thronsaal des Zerrax', world: 3, order: 9, theme: 'shadow', ground: 'obsidian', desc: 'Zerrax beherrscht die Dunkelheit. Weiche seinen Strahlen aus!', boss: 'zerrax', challenges: CH_BOSS, par: 300 });
  b.start(10, 8).said('Wolkenwächter', 'Zerrax ist der mächtigste Schurke. Wenn du ihn besiegst, öffnet sich die Sturmküste!').heart(0, 0).cp();
  b.next(34, 34, { gap: 3.5, thick: 4 }).cp(0, 13);
  b.block(-11, -11, 2, 2, 3.4, 'pillar').block(11, -11, 2, 2, 3.4, 'pillar').block(-11, 11, 2, 2, 3.4, 'pillar').block(11, 11, 2, 2, 3.4, 'pillar');
  b.enemy('zerrax', 0, -4).goal(0, 0);
  return b.finish();
}

// ======================================================================================
// WELT 4 – Sturmküste
// ======================================================================================
function w4l1() {
  const b = new LevelBuilder({ id: 'w4l1', name: 'Gischtklippen', world: 4, order: 10, theme: 'storm', ground: 'cliff', storm: true, desc: 'Sturm peitscht die Küste. Gezeitenplattformen heben und senken sich.', challenges: CH_LEVEL, par: 260 });
  b.start(12, 10).coins(5).said('Wolkenwächter', 'Die Sturmküste! Achte auf die Blitze – sie schlagen dort ein, wo die roten Kreise leuchten.');
  b.next(8, 9, { gap: 3 }).trail(3).mob(['krabbe', 'krabbe']).heart(0, 1);
  b.next(6, 6, { gap: 2.8, mover: { axis: 'y', amp: 0.9, mid: 0, period: 6, phase: 0 } }).coins(2);
  b.next(6, 6, { gap: 2.8, side: 1, mover: { axis: 'y', amp: 0.9, mid: 0, period: 6, phase: 2 } }).coins(2);
  b.next(10, 10, { gap: 2.8 }).cp().mob(['moewe', 'moewe', 'krabbe']).heart(3, 3);
  b.treasureGate('luft', 't_perle');
  b.next(7, 14, { gap: 3.2, dy: 0.6 }).trail(3).mob(['krabbe', 'qualle', 'qualle']).coins(6);
  b.turn(1).next(12, 12, { gap: 3.2, dy: 0.4 }).trail(3).mob(['moewe', 'krabbe', 'krabbe', 'qualle']).heart(-3, 3).cp().pickup('crystal', 4, -3);
  b.next(6, 6, { gap: 2.8, mover: { axis: 'y', amp: 1.0, mid: 0, period: 5.5, phase: 1 } }).coins(2);
  b.next(6, 6, { gap: 2.8, side: -1, mover: { axis: 'y', amp: 1.0, mid: 0, period: 5.5, phase: 3 } }).coins(2);
  b.next(10, 12, { gap: 2.8 }).mob(['moewe', 'moewe', 'qualle', 'krabbe']).heart(0, 3);
  b.branch(1, 5, 5, 'tech', (c) => { c.pickup('hat', 0, 0, { id: 'gischt' }); c.coins(5, 'coin5'); });
  b.turn(-1).next(12, 12, { gap: 3.4 }).trail(4).coinRing(10, 3.2).goal();
  return b.finish();
}

function w4l2() {
  const b = new LevelBuilder({ id: 'w4l2', name: 'Sturmauge', world: 4, order: 11, theme: 'storm', ground: 'cliff', storm: true, desc: 'Im Auge des Sturms. Die Piraten Brack und Perla treiben ihr Spiel.', challenges: CH_LEVEL, par: 320 });
  b.start(10, 10).coins(5).said('Wolkenwächter', 'Brack und Perla haben das Sturmauge besetzt. Fangkristalle liegen bereit!');
  b.next(8, 9, { gap: 3, dy: 0.5 }).trail(3).mob(['krabbe', 'moewe', 'qualle']).heart(0, 0);
  b.next(6, 6, { gap: 2.8, mover: { axis: 'y', amp: 1.0, mid: 0, period: 5, phase: 0 } }).coins(2);
  b.next(6, 6, { gap: 2.8, side: 1, mover: { axis: 'y', amp: 1.0, mid: 0, period: 5, phase: 2.5 } }).coins(2);
  b.next(11, 11, { gap: 2.8 }).cp().mob(['moewe', 'moewe', 'krabbe', 'krabbe']).heart(-3, 0);
  b.treasureGate('licht', 't_blitz');
  b.turn(1).next(14, 12, { gap: 3.2, dy: 0.4 }).trail(3).said('Brack', 'Harr! Frischfleisch für meine Kanonen!', 9).enemy('brack', 3, 0).mob(['krabbe', 'moewe']).heart(-4, 3).pickup('crystal', -5, -3);
  b.next(6, 6, { gap: 2.8, mover: { axis: 'y', amp: 1.0, mid: 0, period: 5, phase: 1 } }).coins(2);
  b.next(6, 6, { gap: 2.8, side: -1, mover: { axis: 'y', amp: 1.0, mid: 0, period: 5, phase: 3 } }).coins(2);
  b.next(12, 12, { gap: 2.8 }).cp().mob(['qualle', 'qualle', 'krabbe', 'moewe']).heart(0, 3);
  b.turn(-1).next(16, 16, { gap: 3.4, dy: 0.6 }).trail(4).said('Perla', 'Ooh, Besuch! Deine Perlen gehören mir!', 9)
    .enemy('perla', 0, 3).mob(['qualle', 'moewe', 'krabbe']).heart(-5, -5).heart(5, -5).block(-5, 0, 1.6, 1.6, 2.4, 'pillar').block(5, 0, 1.6, 1.6, 2.4, 'pillar');
  b.branch(1, 5, 5, 'magie', (c) => { c.pickup('soul', 0, 0, { id: 'soul_w4l2' }); c.pickup('hat', 0, 2, { id: 'kompass' }); });
  b.next(10, 10, { gap: 3.4, dy: 0.4 }).trail(4).coinRing(8, 3).goal();
  return b.finish();
}

function w4boss() {
  const b = new LevelBuilder({ id: 'w4boss', name: 'Kraals Tiefe', world: 4, order: 12, theme: 'storm', ground: 'cliff', storm: true, desc: 'Der Sturmkönig Kraal ruft Wellen und Blitze.', boss: 'kraal', challenges: CH_BOSS, par: 320 });
  b.start(10, 8).said('Wolkenwächter', 'Kraal beherrscht Wellen und Blitze. Springe über die Wellen und meide die roten Kreise!').heart(0, 0).cp();
  b.next(34, 34, { gap: 3.5, thick: 4 }).cp(0, 13);
  b.block(-11, 0, 2, 2, 3.2, 'pillar').block(11, 0, 2, 2, 3.2, 'pillar');
  b.enemy('kraal', 0, -4).goal(0, 0);
  return b.finish();
}

// ======================================================================================
// Arena – Wellenmodus auf einer runden Insel
// ======================================================================================
function arena() {
  const b = new LevelBuilder({ id: 'arena', name: 'Arena der Elemente', world: 0, order: 99, theme: 'sky', ground: 'stone', arena: true, desc: 'Überlebe Welle um Welle.', challenges: [], par: 0 });
  b.start(30, 30, { thick: 4 });
  b.block(-8, -8, 2, 2, 2.4, 'pillar').block(8, -8, 2, 2, 2.4, 'pillar').block(-8, 8, 2, 2, 2.4, 'pillar').block(8, 8, 2, 2, 2.4, 'pillar');
  b.cp(0, 0);
  return b.finish();
}

export const WORLDS = [
  { id: 1, name: 'Himmelsinseln', sub: 'Moosklippen und Ruinen', theme: 'sky', icon: '☁️', levels: ['w1l1', 'w1l2', 'w1boss'], need: null, color: '#7fe8ff' },
  { id: 2, name: 'Glutschmiede', sub: 'Lava, Dampf und Eisen', theme: 'forge', icon: '🌋', levels: ['w2l1', 'w2l2', 'w2boss'], need: 'moragar', color: '#ff6a2a' },
  { id: 3, name: 'Schattenzitadelle', sub: 'Dunkle Türme, brüchiger Stein', theme: 'shadow', icon: '🏰', levels: ['w3l1', 'w3l2', 'w3boss'], need: 'eisenkessel', color: '#b05cff' },
  { id: 4, name: 'Sturmküste', sub: 'Gezeiten, Wind und Gewitter', theme: 'storm', icon: '⛈️', levels: ['w4l1', 'w4l2', 'w4boss'], need: 'zerrax', color: '#3aa0ff' },
];

const cache = new Map();
export function getLevel(id) {
  if (!cache.has(id)) {
    const map = { w1l1, w1l2, w1boss, w2l1, w2l2, w2boss, w3l1, w3l2, w3boss, w4l1, w4l2, w4boss, arena };
    const build = map[id];
    if (!build) throw new Error('Unbekanntes Level: ' + id);
    cache.set(id, build());
  }
  // tiefe Kopie ohne die Rückverweise der Inseln; Tore sind dieselben Objekte wie in boxes
  const lv = JSON.parse(JSON.stringify(cache.get(id), (k, v) => (k === 'isl' || k === 'box' ? undefined : v)));
  lv.gates = lv.boxes.filter((b) => b.gate);
  return lv;
}
export const LEVEL_IDS = WORLDS.flatMap((w) => w.levels);
export function levelMeta(id) {
  const lv = getLevel(id);
  return { id: lv.id, name: lv.name, world: lv.world, desc: lv.desc, boss: lv.boss, challenges: lv.challenges, par: lv.par, treasure: lv.treasure, gates: lv.gates.map((g) => g.gate.el) };
}
