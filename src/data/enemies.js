// Gegner, Elite-Schurken und Bosse.
// ai: Verhalten (siehe sim/ai.js). Elite/Boss nutzen Fähigkeiten (abilities) aus sim/abilities.js.
// model: Aufbau für render/models.js (parts: Kugeln/Zylinder/Kegel/Boxen)
const P = (g, c, x, y, z, sx, sy, sz, extra) => Object.assign({ g, c, p: [x, y, z], s: [sx, sy, sz] }, extra);

export const ENEMIES = {
  // ------------------------------------------------------------ Welt 1: Himmelsinseln
  kaefer: {
    name: 'Mooskäfer', ai: 'chaser', hp: 26, spd: 3.6, dmg: 9, r: 0.5, h: 0.7, xp: 6, gold: 2, windup: 0.45, range: 1.7, el: 'erde',
    model: { parts: [P('sphere', 0x5a8a3a, 0, 0.4, 0, 0.55, 0.38, 0.62), P('sphere', 0x3a5a2a, 0, 0.55, 0.1, 0.4, 0.2, 0.45), P('sphere', 0x2a3a1a, 0, 0.45, 0.5, 0.26, 0.24, 0.26), P('eyes', 0xffffff, 0, 0.55, 0.62, 1, 1, 1)], legs: 6 },
  },
  spucker: {
    name: 'Dornspucker', ai: 'turret', hp: 22, spd: 0, dmg: 8, r: 0.55, h: 1.0, xp: 7, gold: 3, shootCd: 2.4, shotSpeed: 9, el: 'leben',
    model: { parts: [P('cyl', 0x3a8a3a, 0, 0.45, 0, 0.18, 0.9, 0.18), P('sphere', 0xd8588a, 0, 1.0, 0, 0.5, 0.42, 0.5), P('sphere', 0xffe27a, 0, 1.0, 0.34, 0.28, 0.24, 0.2), P('cone', 0x2a6a2a, 0.45, 0.2, 0, 0.35, 0.4, 0.12, { rz: -1.0 }), P('cone', 0x2a6a2a, -0.45, 0.2, 0, 0.35, 0.4, 0.12, { rz: 1.0 })] },
  },
  fels: {
    name: 'Felsling', ai: 'tank', hp: 90, spd: 2.0, dmg: 16, r: 0.9, h: 1.6, xp: 16, gold: 6, windup: 0.8, slamR: 3.0, el: 'erde',
    model: { parts: [P('sphere', 0x8a8478, 0, 0.9, 0, 0.9, 0.85, 0.85), P('sphere', 0x6a665c, 0, 1.6, 0.1, 0.5, 0.44, 0.5), P('sphere', 0x6a665c, 0.9, 0.9, 0, 0.4, 0.7, 0.4), P('sphere', 0x6a665c, -0.9, 0.9, 0, 0.4, 0.7, 0.4), P('eyes', 0xffd84a, 0, 1.65, 0.45, 1, 1, 1), P('cone', 0x9a947c, 0, 1.55, -0.3, 0.2, 0.5, 0.2, { rx: -0.5 })] },
  },
  windling: {
    name: 'Windling', ai: 'flyer', hp: 20, spd: 4.2, dmg: 7, r: 0.45, h: 0.7, xp: 8, gold: 3, shootCd: 2.0, shotSpeed: 11, hover: 2.6, el: 'luft',
    model: { parts: [P('sphere', 0xcfeaff, 0, 0.5, 0, 0.42, 0.4, 0.42), P('wing', 0xffffff, 0.4, 0.6, 0, 1, 1, 1, { side: 1 }), P('wing', 0xffffff, -0.4, 0.6, 0, 1, 1, 1, { side: -1 }), P('eyes', 0x224466, 0, 0.55, 0.3, 0.8, 0.8, 0.8)] },
  },
  // ------------------------------------------------------------ Welt 2: Glutschmiede
  schleim: {
    name: 'Glutschleim', ai: 'jumper', hp: 34, spd: 3.3, dmg: 9, r: 0.65, h: 0.9, xp: 9, gold: 3, split: 2, el: 'feuer',
    model: { parts: [P('sphere', 0xff7a2a, 0, 0.5, 0, 0.7, 0.55, 0.7, { emissive: 0.6 }), P('sphere', 0xffc060, 0, 0.7, 0, 0.4, 0.3, 0.4, { emissive: 0.8 }), P('eyes', 0x220800, 0, 0.7, 0.55, 1.2, 1.2, 1.2)] },
  },
  schleimchen: {
    name: 'Schleimchen', ai: 'jumper', hp: 12, spd: 4.0, dmg: 6, r: 0.4, h: 0.55, xp: 3, gold: 1, el: 'feuer',
    model: { parts: [P('sphere', 0xff8a3a, 0, 0.3, 0, 0.42, 0.34, 0.42, { emissive: 0.6 }), P('eyes', 0x220800, 0, 0.4, 0.34, 0.8, 0.8, 0.8)] },
  },
  golem: {
    name: 'Schmiedegolem', ai: 'tank', hp: 120, spd: 2.2, dmg: 20, r: 0.95, h: 1.9, xp: 20, gold: 8, windup: 0.9, slamR: 3.4, el: 'tech',
    model: { parts: [P('box', 0x555a66, 0, 1.0, 0, 1.4, 1.4, 0.9), P('box', 0x3a3e48, 0, 1.9, 0, 0.7, 0.5, 0.6), P('box', 0x555a66, 1.0, 1.0, 0, 0.5, 1.2, 0.5), P('box', 0x555a66, -1.0, 1.0, 0, 0.5, 1.2, 0.5), P('sphere', 0xff8a30, 0, 1.1, 0.46, 0.5, 0.5, 0.2, { emissive: 1 }), P('eyes', 0xff7a20, 0, 1.95, 0.32, 1, 1, 1)] },
  },
  fledermaus: {
    name: 'Kohlefledermaus', ai: 'flyer', hp: 24, spd: 5.0, dmg: 8, r: 0.45, h: 0.6, xp: 9, gold: 3, shootCd: 2.2, shotSpeed: 12, hover: 2.4, dive: true, el: 'dunkel',
    model: { parts: [P('sphere', 0x2a2630, 0, 0.5, 0, 0.4, 0.36, 0.4), P('wing', 0x3a3040, 0.4, 0.6, 0, 1.1, 1, 1, { side: 1 }), P('wing', 0x3a3040, -0.4, 0.6, 0, 1.1, 1, 1, { side: -1 }), P('eyes', 0xff5a2a, 0, 0.55, 0.3, 0.8, 0.8, 0.8), P('cone', 0x2a2630, 0.15, 0.85, 0, 0.1, 0.22, 0.1), P('cone', 0x2a2630, -0.15, 0.85, 0, 0.1, 0.22, 0.1)] },
  },
  funkenkaefer: {
    name: 'Funkenkäfer', ai: 'exploder', hp: 16, spd: 5.4, dmg: 18, r: 0.45, h: 0.6, xp: 8, gold: 3, windup: 0.6, slamR: 2.4, el: 'feuer',
    model: { parts: [P('sphere', 0xc03a1a, 0, 0.35, 0, 0.48, 0.34, 0.55), P('sphere', 0xffc040, 0, 0.45, -0.1, 0.3, 0.2, 0.3, { emissive: 1 }), P('eyes', 0xffff80, 0, 0.42, 0.45, 0.8, 0.8, 0.8)], legs: 6 },
  },
  // ------------------------------------------------------------ Welt 3: Schattenzitadelle
  hund: {
    name: 'Schattenhund', ai: 'charger', hp: 32, spd: 4.8, dmg: 11, r: 0.55, h: 0.9, xp: 11, gold: 4, windup: 0.5, chargeSpeed: 13, el: 'dunkel',
    model: { parts: [P('sphere', 0x2a2040, 0, 0.55, 0, 0.5, 0.42, 0.78), P('sphere', 0x3a2c58, 0, 0.75, 0.62, 0.38, 0.34, 0.4), P('cone', 0x3a2c58, 0.15, 1.05, 0.55, 0.1, 0.25, 0.1), P('cone', 0x3a2c58, -0.15, 1.05, 0.55, 0.1, 0.25, 0.1), P('eyes', 0xc08aff, 0, 0.8, 0.86, 0.8, 0.8, 0.8, { emissive: 1 })], legs: 4 },
  },
  schuetze: {
    name: 'Knochenschütze', ai: 'shooter', hp: 28, spd: 3.2, dmg: 10, r: 0.5, h: 1.5, xp: 12, gold: 4, shootCd: 1.9, shotSpeed: 14, keep: 8, el: 'untot',
    model: { parts: [P('sphere', 0xd8dccc, 0, 1.25, 0, 0.36, 0.38, 0.36), P('cyl', 0xc8ccb8, 0, 0.7, 0, 0.3, 0.8, 0.2), P('box', 0x7a5a3a, 0.4, 0.8, 0.2, 0.08, 1.0, 0.08, { rz: 0.1 }), P('eyes', 0x5ad090, 0, 1.3, 0.3, 0.9, 0.9, 0.9, { emissive: 1 })], legs: 2 },
  },
  geist: {
    name: 'Geisterlicht', ai: 'flyer', hp: 22, spd: 3.6, dmg: 9, r: 0.45, h: 0.8, xp: 10, gold: 3, shootCd: 1.8, shotSpeed: 10, hover: 2.2, homingShot: true, el: 'untot',
    model: { parts: [P('sphere', 0x9fe8d0, 0, 0.7, 0, 0.42, 0.46, 0.42, { emissive: 0.9, opacity: 0.85 }), P('cone', 0x9fe8d0, 0, 0.25, 0, 0.35, 0.6, 0.35, { rx: Math.PI, emissive: 0.8, opacity: 0.7 }), P('eyes', 0x103020, 0, 0.78, 0.36, 0.9, 0.9, 0.9)] },
  },
  ritter: {
    name: 'Zitadellenritter', ai: 'tank', hp: 110, spd: 2.4, dmg: 18, r: 0.8, h: 1.7, xp: 20, gold: 8, windup: 0.7, slamR: 2.8, guard: true, el: 'licht',
    model: { parts: [P('cyl', 0x4a4a62, 0, 0.8, 0, 0.5, 1.2, 0.4), P('sphere', 0x5a5a78, 0, 1.6, 0, 0.42, 0.4, 0.42), P('box', 0x8a8aa8, 0, 1.0, 0.55, 0.9, 1.2, 0.1), P('box', 0x7a7a98, -0.55, 1.2, 0.1, 0.1, 1.2, 0.1), P('eyes', 0x8ac8ff, 0, 1.65, 0.36, 0.9, 0.9, 0.9, { emissive: 1 })], legs: 2 },
  },
  // ------------------------------------------------------------ Welt 4: Sturmküste
  krabbe: {
    name: 'Klippenkrabbe', ai: 'chaser', hp: 42, spd: 3.2, dmg: 12, r: 0.65, h: 0.8, xp: 12, gold: 4, windup: 0.5, range: 1.9, guard: true, el: 'wasser',
    model: { parts: [P('sphere', 0xd8603a, 0, 0.45, 0, 0.72, 0.34, 0.6), P('sphere', 0xe8784a, 0.7, 0.55, 0.45, 0.32, 0.26, 0.4), P('sphere', 0xe8784a, -0.7, 0.55, 0.45, 0.32, 0.26, 0.4), P('eyes', 0x111111, 0, 0.78, 0.4, 1, 1, 1)], legs: 6 },
  },
  moewe: {
    name: 'Möwenpirat', ai: 'flyer', hp: 30, spd: 5.2, dmg: 9, r: 0.5, h: 0.8, xp: 12, gold: 5, shootCd: 2.0, shotSpeed: 13, hover: 2.8, dive: true, el: 'luft',
    model: { parts: [P('sphere', 0xf2f2f2, 0, 0.55, 0, 0.42, 0.4, 0.55), P('wing', 0xdfe6ee, 0.4, 0.65, 0, 1.3, 1, 1, { side: 1 }), P('wing', 0xdfe6ee, -0.4, 0.65, 0, 1.3, 1, 1, { side: -1 }), P('cone', 0xffa030, 0, 0.55, 0.5, 0.1, 0.3, 0.1, { rx: Math.PI / 2 }), P('cone', 0x1a1a22, 0, 0.95, 0, 0.42, 0.18, 0.42), P('eyes', 0x111111, 0, 0.6, 0.35, 0.7, 0.7, 0.7)] },
  },
  qualle: {
    name: 'Leuchtqualle', ai: 'flyer', hp: 36, spd: 2.8, dmg: 10, r: 0.6, h: 1.0, xp: 13, gold: 5, shootCd: 1.6, shotSpeed: 9, hover: 2.4, shock: true, el: 'tech',
    model: { parts: [P('sphere', 0x7ae8ff, 0, 0.9, 0, 0.62, 0.5, 0.62, { emissive: 0.7, opacity: 0.8 }), P('cyl', 0xa0f0ff, 0.2, 0.35, 0, 0.06, 0.7, 0.06, { emissive: 0.8 }), P('cyl', 0xa0f0ff, -0.2, 0.35, 0.1, 0.06, 0.7, 0.06, { emissive: 0.8 }), P('cyl', 0xa0f0ff, 0, 0.35, -0.2, 0.06, 0.7, 0.06, { emissive: 0.8 }), P('eyes', 0x103050, 0, 0.95, 0.5, 0.8, 0.8, 0.8)] },
  },
  // ------------------------------------------------------------ Beschworene Helfer der Bosse
  schatten: {
    name: 'Schattenschemen', ai: 'chaser', hp: 20, spd: 4.2, dmg: 8, r: 0.45, h: 0.9, xp: 4, gold: 1, windup: 0.4, range: 1.6, el: 'dunkel',
    model: { parts: [P('sphere', 0x3a2c58, 0, 0.6, 0, 0.42, 0.5, 0.42, { opacity: 0.85 }), P('cone', 0x3a2c58, 0, 0.2, 0, 0.35, 0.5, 0.35, { rx: Math.PI }), P('eyes', 0xc08aff, 0, 0.68, 0.35, 0.9, 0.9, 0.9, { emissive: 1 })] },
  },
};

// ------------------------------------------------------------------ Elite-Schurken
// abilities: Liste aus Fähigkeiten (sim/abilities.js), wird der Reihe nach/zufällig genutzt
export const ELITES = {
  rumpel:     { name: 'Rumpel',     villain: 'rumpel',     ai: 'elite', hp: 360, spd: 3.0, dmg: 16, r: 1.0, h: 2.0, xp: 60, gold: 25, el: 'erde',   scale: 1.5, abilities: [['slam', { r: 3.6, dmg: 18 }], ['charge', { dmg: 16 }], ['rain', { n: 3, dmg: 14 }]] },
  zwick:      { name: 'Zwick',      villain: 'zwick',      ai: 'elite', hp: 300, spd: 4.6, dmg: 12, r: 0.7, h: 1.4, xp: 60, gold: 25, el: 'luft',   scale: 1.3, abilities: [['volley', { n: 5, spread: 60, dmg: 8 }], ['leap', { dmg: 14, r: 3 }], ['ring', { n: 10, dmg: 7 }]] },
  zunder:     { name: 'Zunder',     villain: 'zunder',     ai: 'elite', hp: 420, spd: 3.4, dmg: 16, r: 0.9, h: 1.8, xp: 80, gold: 35, el: 'feuer',  scale: 1.5, abilities: [['rain', { n: 4, dmg: 16 }], ['ring', { n: 12, dmg: 8 }], ['slam', { r: 3.6, dmg: 20 }]] },
  hammerhart: { name: 'Hammerhart', villain: 'hammerhart', ai: 'elite', hp: 520, spd: 2.6, dmg: 20, r: 1.1, h: 2.2, xp: 80, gold: 35, el: 'tech',   scale: 1.6, abilities: [['slam', { r: 4, dmg: 22 }], ['charge', { dmg: 20 }], ['summon', { type: 'funkenkaefer', n: 2 }]] },
  morrigan:   { name: 'Morrigan',   villain: 'morrigan',   ai: 'elite', hp: 440, spd: 3.2, dmg: 14, r: 0.8, h: 1.8, xp: 100, gold: 45, el: 'untot',  scale: 1.4, abilities: [['summon', { type: 'schatten', n: 3 }], ['volley', { n: 5, spread: 50, dmg: 10 }], ['rain', { n: 4, dmg: 16 }]] },
  vesper:     { name: 'Vesper',     villain: 'vesper',     ai: 'elite', hp: 400, spd: 4.8, dmg: 14, r: 0.7, h: 1.5, xp: 100, gold: 45, el: 'dunkel', scale: 1.4, abilities: [['charge', { dmg: 16 }], ['ring', { n: 12, dmg: 9 }], ['leap', { dmg: 16, r: 3.2 }]] },
  brack:      { name: 'Brack',      villain: 'brack',      ai: 'elite', hp: 560, spd: 3.2, dmg: 18, r: 1.0, h: 2.0, xp: 120, gold: 55, el: 'wasser', scale: 1.5, abilities: [['volley', { n: 3, spread: 30, dmg: 14 }], ['slam', { r: 3.6, dmg: 20 }], ['charge', { dmg: 18 }]] },
  perla:      { name: 'Perla',      villain: 'perla',      ai: 'elite', hp: 500, spd: 3.6, dmg: 14, r: 0.8, h: 1.7, xp: 120, gold: 55, el: 'licht',  scale: 1.4, abilities: [['ring', { n: 14, dmg: 9 }], ['rain', { n: 5, dmg: 16 }], ['volley', { n: 7, spread: 70, dmg: 9 }]] },
};

// ------------------------------------------------------------------ Bosse
// phases: ab hp-Anteil (pct) gilt die Fähigkeitenliste; cdMul = Tempo der Angriffe
export const BOSSES = {
  moragar: {
    name: 'Moragar', title: 'Schattenmagier der Moosklippen', ai: 'boss', hp: 1500, spd: 2.4, dmg: 14, r: 1.4, h: 3.0, xp: 200, gold: 150, el: 'dunkel', scale: 2.0, color: 0x5a3a8a, treasure: 't_moragar', world: 1,
    phases: [
      { pct: 1.0,  cd: 2.2, abilities: [['volley', { n: 5, spread: 50, dmg: 10 }], ['slam', { r: 4.2, dmg: 18 }], ['rain', { n: 3, dmg: 14 }]] },
      { pct: 0.66, cd: 1.8, abilities: [['summon', { type: 'schatten', n: 3 }], ['ring', { n: 12, dmg: 9 }], ['rain', { n: 5, dmg: 14 }], ['slam', { r: 4.6, dmg: 20 }]] },
      { pct: 0.33, cd: 1.4, abilities: [['ring', { n: 16, dmg: 10, spin: 1 }], ['volley', { n: 7, spread: 80, dmg: 10 }], ['rain', { n: 7, dmg: 15 }], ['summon', { type: 'schatten', n: 4 }]] },
    ],
    lines: ['Ihr wagt es, meine Klippen zu betreten?', 'Schatten, zu mir!', 'Das ist noch nicht das Ende ...'],
  },
  eisenkessel: {
    name: 'Eisenkessel', title: 'Herr der Glutschmiede', ai: 'boss', hp: 2000, spd: 2.2, dmg: 16, r: 1.6, h: 3.2, xp: 300, gold: 220, el: 'feuer', scale: 2.2, color: 0x7a6a64, treasure: 't_kessel', world: 2,
    phases: [
      { pct: 1.0,  cd: 2.2, abilities: [['charge', { dmg: 18 }], ['slam', { r: 4.6, dmg: 20 }], ['volley', { n: 5, spread: 60, dmg: 11 }]] },
      { pct: 0.66, cd: 1.8, abilities: [['rain', { n: 6, dmg: 16 }], ['summon', { type: 'funkenkaefer', n: 3 }], ['charge', { dmg: 20 }], ['ring', { n: 12, dmg: 10 }]] },
      { pct: 0.33, cd: 1.4, abilities: [['ring', { n: 18, dmg: 10, spin: 1 }], ['rain', { n: 8, dmg: 16 }], ['charge', { dmg: 22 }], ['slam', { r: 5.4, dmg: 24 }]] },
    ],
    lines: ['Aus meinem Kessel kommt nur Asche!', 'Heizt die Schmiede ein!', 'Zu ... heiß ...'],
  },
  zerrax: {
    name: 'Zerrax', title: 'Herrscher der Schattenzitadelle', ai: 'boss', hp: 2600, spd: 2.8, dmg: 18, r: 1.4, h: 3.2, xp: 400, gold: 300, el: 'dunkel', scale: 2.0, color: 0x3a2a68, treasure: 't_zerrax', world: 3,
    phases: [
      { pct: 1.0,  cd: 2.0, abilities: [['sweep', { dmg: 14, dur: 3.2 }], ['volley', { n: 7, spread: 70, dmg: 11 }], ['teleport', {}]] },
      { pct: 0.66, cd: 1.7, abilities: [['ring', { n: 14, dmg: 11 }], ['summon', { type: 'hund', n: 3 }], ['rain', { n: 6, dmg: 16 }], ['teleport', {}], ['sweep', { dmg: 16, dur: 3.6 }]] },
      { pct: 0.33, cd: 1.3, abilities: [['sweep', { dmg: 18, dur: 4, double: true }], ['ring', { n: 20, dmg: 11, spin: 1 }], ['rain', { n: 9, dmg: 17 }], ['teleport', {}]] },
    ],
    lines: ['Die Zitadelle gehört mir!', 'Dunkelheit, verschlinge sie!', 'Unmöglich ... das Licht ...'],
  },
  kraal: {
    name: 'Kraal', title: 'Sturmkönig der Tiefe', ai: 'boss', hp: 3200, spd: 2.4, dmg: 20, r: 1.8, h: 3.4, xp: 600, gold: 420, el: 'wasser', scale: 2.4, color: 0x2a6a8a, treasure: 't_kraal', world: 4,
    phases: [
      { pct: 1.0,  cd: 2.0, abilities: [['wave', { dmg: 16 }], ['slam', { r: 5, dmg: 22 }], ['rain', { n: 5, dmg: 16, lightning: true }]] },
      { pct: 0.66, cd: 1.7, abilities: [['wave', { dmg: 18, n: 2 }], ['summon', { type: 'krabbe', n: 2 }], ['rain', { n: 8, dmg: 17, lightning: true }], ['ring', { n: 14, dmg: 11 }]] },
      { pct: 0.33, cd: 1.3, abilities: [['wave', { dmg: 20, n: 3 }], ['rain', { n: 11, dmg: 18, lightning: true }], ['ring', { n: 20, dmg: 12, spin: 1 }], ['slam', { r: 6, dmg: 26 }]] },
    ],
    lines: ['Das Meer verschlingt euch alle!', 'Sturm, steh mir bei!', 'Die Tiefe ... ruft mich zurück ...'],
  },
};

export function enemySpec(type) {
  return ENEMIES[type] || ELITES[type] || BOSSES[type];
}
