// 20 Helden (2 pro Element) und 8 fangbare Schurken. Jeder hat drei Angriffe:
//   a1 = Standardangriff, a2 = zweiter Angriff, sp = Spezial (lange Abklingzeit).
// Angriffsarten (k): proj, melee, nova, dash, heal, shield, buff, mine, pull, summon, leap
//
// body: Aussehen für render/models.js
//   col = Hauptfarbe, alt = Bauch/Akzent, size = Größe, f = Merkmale (horns, ears, tail, wings ...)
export const HEROES = {
  // ------------------------------------------------------------ Feuer
  glutbock: {
    name: 'Glutbock', title: 'Funkenhirsch', el: 'feuer', cost: 0, start: true,
    stats: { hp: 125, spd: 6.1, jump: 1 },
    body: { col: 0xd9531e, alt: 0xffd27a, size: 1.1, head: 'wide', torso: 'bulky', legs: 'short', f: ['antlers', 'flame', 'tail_thin'] },
    a1: { k: 'melee', name: 'Hornhieb', dmg: 15, cd: 0.45, range: 2.6, arc: 110, knock: 3 },
    a2: { k: 'proj', name: 'Feuerball', dmg: 19, cd: 1.7, speed: 15, range: 14, size: 0.55, explode: 2.3 },
    sp: { k: 'dash', name: 'Brandsturm', dmg: 32, cd: 9, dist: 8, speed: 28 },
  },
  aschefuchs: {
    name: 'Aschefuchs', title: 'Glutschweif', el: 'feuer', cost: 220,
    stats: { hp: 90, spd: 7.3, jump: 1.05 },
    body: { col: 0xe8742a, alt: 0xfff0d0, size: 0.95, head: 'pointy', torso: 'bean', legs: 'long', f: ['ears_pointy', 'tail_bushy', 'flame_tail'] },
    a1: { k: 'proj', name: 'Funken', dmg: 7, cd: 0.27, speed: 19, range: 13, size: 0.3 },
    a2: { k: 'proj', name: 'Flammenfächer', dmg: 8, cd: 1.5, speed: 15, range: 10, size: 0.35, count: 3, spread: 44 },
    sp: { k: 'nova', name: 'Aschewolke', dmg: 26, cd: 10, radius: 5.2, knock: 6 },
  },
  // ------------------------------------------------------------ Wasser
  riffklinge: {
    name: 'Riffklinge', title: 'Schwertfisch', el: 'wasser', cost: 0, start: true,
    stats: { hp: 105, spd: 6.7, jump: 1 },
    body: { col: 0x2f86d8, alt: 0xcdeeff, size: 1.0, head: 'pointy', torso: 'bean', legs: 'short', f: ['fins', 'sword_nose', 'tail_fin'] },
    a1: { k: 'melee', name: 'Klingenhieb', dmg: 11, cd: 0.3, range: 2.7, arc: 120, knock: 2 },
    a2: { k: 'proj', name: 'Flutwelle', dmg: 17, cd: 1.6, speed: 13, range: 13, size: 0.9, pierce: 99, wide: true },
    sp: { k: 'dash', name: 'Gezeitensprung', dmg: 26, cd: 8, dist: 9, speed: 30 },
  },
  nebelqualle: {
    name: 'Nebelqualle', title: 'Wolkentreiber', el: 'wasser', cost: 260,
    stats: { hp: 95, spd: 6.2, jump: 1.1 },
    body: { col: 0x8ad0f0, alt: 0xffffff, size: 1.0, head: 'dome', torso: 'bean', legs: 'stub', f: ['tentacles', 'jelly_cap'] },
    a1: { k: 'proj', name: 'Blasenschuss', dmg: 8, cd: 0.38, speed: 14, range: 12, size: 0.42, homing: 0.5 },
    a2: { k: 'pull', name: 'Strudel', dmg: 10, cd: 5, radius: 5.5 },
    sp: { k: 'heal', name: 'Heilnebel', amt: 0.4, cd: 14, radius: 6.5 },
  },
  // ------------------------------------------------------------ Erde
  granitus: {
    name: 'Granitus', title: 'Felsgigant', el: 'erde', cost: 0, start: true,
    stats: { hp: 160, spd: 5.2, jump: 1 },
    body: { col: 0x8a7a68, alt: 0xc8b898, size: 1.25, head: 'wide', torso: 'bulky', legs: 'stub', f: ['spikes', 'brow'] },
    a1: { k: 'melee', name: 'Felsfaust', dmg: 21, cd: 0.62, range: 2.7, arc: 100, knock: 5 },
    a2: { k: 'nova', name: 'Beben', dmg: 24, cd: 3.2, radius: 4.2, knock: 6 },
    sp: { k: 'shield', name: 'Steinhaut', dur: 5, cd: 13, reduce: 0.7 },
  },
  grabscharr: {
    name: 'Grabscharr', title: 'Maulwurf', el: 'erde', cost: 240,
    stats: { hp: 110, spd: 6.4, jump: 1 },
    body: { col: 0x7a5a3a, alt: 0xe0c090, size: 0.95, head: 'pointy', torso: 'bean', legs: 'short', f: ['claws', 'snout', 'goggles'] },
    a1: { k: 'proj', name: 'Felsbrocken', dmg: 12, cd: 0.5, speed: 13, range: 11, size: 0.45, grav: 14, explode: 1.3 },
    a2: { k: 'mine', name: 'Erdmine', dmg: 28, cd: 3.5, radius: 3, delay: 0.9 },
    sp: { k: 'dash', name: 'Untertauchen', dmg: 18, cd: 8, dist: 7, speed: 26, ghost: true },
  },
  // ------------------------------------------------------------ Luft
  wirbelfeder: {
    name: 'Wirbelfeder', title: 'Sturmfalke', el: 'luft', cost: 0, start: true,
    stats: { hp: 85, spd: 7.6, jump: 1.05 },
    moves: { airJumps: 1, glide: true },
    body: { col: 0x5ab4e0, alt: 0xffffff, size: 0.95, head: 'round', torso: 'bean', legs: 'long', f: ['beak', 'wings', 'crest', 'tail_thin'] },
    a1: { k: 'proj', name: 'Federschuss', dmg: 7, cd: 0.24, speed: 23, range: 14, size: 0.26 },
    a2: { k: 'proj', name: 'Federsturm', dmg: 6, cd: 1.4, speed: 18, range: 11, size: 0.3, count: 5, spread: 72 },
    sp: { k: 'buff', name: 'Rückenwind', dur: 6, cd: 12, spd: 1.45, atkSpd: 1.35 },
  },
  surra: {
    name: 'Surra', title: 'Windrochen', el: 'luft', cost: 280,
    stats: { hp: 100, spd: 6.9, jump: 1.1 },
    moves: { airJumps: 1, glide: true },
    body: { col: 0xa0d8e8, alt: 0xf4fcff, size: 1.0, head: 'wide', torso: 'bean', legs: 'stub', f: ['wings', 'tail_fin', 'swirl'] },
    a1: { k: 'melee', name: 'Windstoß', dmg: 9, cd: 0.4, range: 3.1, arc: 150, knock: 7 },
    a2: { k: 'proj', name: 'Windhose', dmg: 9, cd: 2.0, speed: 8, range: 12, size: 1.0, pierce: 99, knock: 5, wide: true },
    sp: { k: 'pull', name: 'Sog', dmg: 16, cd: 11, radius: 7 },
  },
  // ------------------------------------------------------------ Magie
  morchel: {
    name: 'Morchel', title: 'Sporenmagier', el: 'magie', cost: 300,
    stats: { hp: 95, spd: 6.0, jump: 1 },
    body: { col: 0xc48ae8, alt: 0xfff0f8, size: 0.95, head: 'dome', torso: 'bean', legs: 'stub', f: ['cap_mushroom', 'spots'] },
    a1: { k: 'proj', name: 'Sporenblitz', dmg: 9, cd: 0.4, speed: 15, range: 13, size: 0.35, homing: 0.9 },
    a2: { k: 'proj', name: 'Giftwolke', dmg: 15, cd: 1.9, speed: 11, range: 10, size: 0.6, explode: 3.2 },
    sp: { k: 'summon', name: 'Sporenturm', dur: 12, cd: 13, unit: 'turret', dmg: 6, rate: 0.5 },
  },
  nimbra: {
    name: 'Nimbra', title: 'Sternenhexe', el: 'magie', cost: 520,
    stats: { hp: 85, spd: 6.4, jump: 1.05 },
    body: { col: 0x7a4ad0, alt: 0xffe27a, size: 1.0, head: 'round', torso: 'bean', legs: 'stub', f: ['witch_hat', 'stars', 'cape'] },
    a1: { k: 'proj', name: 'Sternenbolzen', dmg: 10, cd: 0.34, speed: 18, range: 14, size: 0.34, pierce: 1 },
    a2: { k: 'proj', name: 'Arkanstrahl', dmg: 24, cd: 2.2, speed: 34, range: 18, size: 0.5, pierce: 99, wide: true },
    sp: { k: 'buff', name: 'Mondkraft', dur: 7, cd: 14, dmg: 1.6 },
  },
  // ------------------------------------------------------------ Tech
  bolzen: {
    name: 'Bolzen', title: 'Schraubenwächter', el: 'tech', cost: 340,
    stats: { hp: 115, spd: 5.9, jump: 1 },
    body: { col: 0x8a98ac, alt: 0xffd84a, size: 1.05, head: 'box', torso: 'bulky', legs: 'short', f: ['antenna', 'visor', 'bolts'] },
    a1: { k: 'proj', name: 'Bolzenfeuer', dmg: 8, cd: 0.22, speed: 25, range: 14, size: 0.25 },
    a2: { k: 'proj', name: 'Rakete', dmg: 22, cd: 1.9, speed: 14, range: 15, size: 0.5, explode: 2.8 },
    sp: { k: 'summon', name: 'Geschützturm', dur: 12, cd: 14, unit: 'turret', dmg: 7, rate: 0.28 },
  },
  kiko: {
    name: 'Kiko', title: 'Funkenaffe', el: 'tech', cost: 560,
    stats: { hp: 90, spd: 7.1, jump: 1.15 },
    body: { col: 0xe8c04a, alt: 0x4a5a78, size: 0.9, head: 'round', torso: 'bean', legs: 'long', f: ['ears_round', 'tail_thin', 'goggles', 'gloves'] },
    a1: { k: 'melee', name: 'Schockhandschuh', dmg: 10, cd: 0.32, range: 2.6, arc: 130, knock: 2 },
    a2: { k: 'mine', name: 'Stromfalle', dmg: 24, cd: 3.0, radius: 3.2, delay: 0.7 },
    sp: { k: 'dash', name: 'Blitzsprint', dmg: 24, cd: 8, dist: 10, speed: 34 },
  },
  // ------------------------------------------------------------ Leben
  brummbart: {
    name: 'Brummbart', title: 'Waldwächter', el: 'leben', cost: 360,
    stats: { hp: 150, spd: 5.6, jump: 1 },
    body: { col: 0x6a8a3a, alt: 0xd8c890, size: 1.2, head: 'wide', torso: 'bulky', legs: 'short', f: ['ears_round', 'moss', 'claws'] },
    a1: { k: 'melee', name: 'Pranke', dmg: 17, cd: 0.5, range: 2.6, arc: 120, knock: 4 },
    a2: { k: 'nova', name: 'Brüllen', dmg: 10, cd: 4, radius: 4.6, knock: 8, selfHeal: 0.06 },
    sp: { k: 'heal', name: 'Waldsegen', amt: 0.35, cd: 13, radius: 6 },
  },
  vira: {
    name: 'Vira', title: 'Dornenhexe', el: 'leben', cost: 580,
    stats: { hp: 90, spd: 6.6, jump: 1.05 },
    body: { col: 0x4ab04a, alt: 0xff8ac8, size: 0.95, head: 'round', torso: 'bean', legs: 'stub', f: ['leaf_hair', 'flower', 'vines'] },
    a1: { k: 'proj', name: 'Dornen', dmg: 8, cd: 0.3, speed: 18, range: 13, size: 0.28 },
    a2: { k: 'pull', name: 'Rankenfessel', dmg: 12, cd: 5, radius: 5.5 },
    sp: { k: 'summon', name: 'Dornenranke', dur: 12, cd: 12, unit: 'turret', dmg: 9, rate: 0.7 },
  },
  // ------------------------------------------------------------ Untot
  krax: {
    name: 'Krax', title: 'Knochenritter', el: 'untot', cost: 420,
    stats: { hp: 120, spd: 6.2, jump: 1 },
    body: { col: 0xd8dccc, alt: 0x5ad090, size: 1.05, head: 'skull', torso: 'ribs', legs: 'long', f: ['skull_eyes', 'cape'] },
    a1: { k: 'melee', name: 'Knochenhieb', dmg: 13, cd: 0.4, range: 2.8, arc: 110, knock: 3 },
    a2: { k: 'proj', name: 'Knochenwurf', dmg: 15, cd: 1.3, speed: 17, range: 13, size: 0.5, pierce: 99 },
    sp: { k: 'nova', name: 'Totentanz', dmg: 30, cd: 11, radius: 4.8, knock: 5 },
  },
  flacker: {
    name: 'Flacker', title: 'Irrlicht', el: 'untot', cost: 600,
    stats: { hp: 80, spd: 7.0, jump: 1.1 },
    moves: { airJumps: 1 },
    body: { col: 0x7ae0b0, alt: 0xffffff, size: 0.9, head: 'dome', torso: 'bean', legs: 'none', f: ['ghost_tail', 'flame_head'] },
    a1: { k: 'proj', name: 'Irrfunke', dmg: 7, cd: 0.28, speed: 14, range: 13, size: 0.3, homing: 1.3 },
    a2: { k: 'dash', name: 'Spukhuschen', dmg: 12, cd: 4, dist: 6, speed: 26, ghost: true },
    sp: { k: 'shield', name: 'Geisterform', dur: 4, cd: 12, reduce: 0.65, spd: 1.35 },
  },
  // ------------------------------------------------------------ Licht
  aurel: {
    name: 'Aurel', title: 'Strahlenlöwe', el: 'licht', cost: 440,
    stats: { hp: 125, spd: 6.3, jump: 1 },
    body: { col: 0xf0c050, alt: 0xfff6d0, size: 1.1, head: 'wide', torso: 'bulky', legs: 'short', f: ['mane', 'tail_thin', 'halo'] },
    a1: { k: 'melee', name: 'Lichtschwert', dmg: 15, cd: 0.44, range: 2.8, arc: 115, knock: 3 },
    a2: { k: 'proj', name: 'Lichtlanze', dmg: 19, cd: 1.5, speed: 32, range: 17, size: 0.4, pierce: 99, wide: true },
    sp: { k: 'nova', name: 'Sonnenstoß', dmg: 24, cd: 11, radius: 5.5, knock: 4, heal: 0.15 },
  },
  glim: {
    name: 'Glim', title: 'Leuchtwurm', el: 'licht', cost: 620,
    stats: { hp: 85, spd: 6.5, jump: 1.05 },
    body: { col: 0xfff09a, alt: 0xffffff, size: 0.9, head: 'round', torso: 'bean', legs: 'none', f: ['antenna', 'halo', 'glow'] },
    a1: { k: 'proj', name: 'Lichtstrahl', dmg: 6, cd: 0.2, speed: 26, range: 13, size: 0.22 },
    a2: { k: 'nova', name: 'Blitzlicht', dmg: 12, cd: 3.2, radius: 4.4, knock: 3 },
    sp: { k: 'heal', name: 'Lichtregen', amt: 0.4, cd: 14, radius: 6.5 },
  },
  // ------------------------------------------------------------ Dunkelheit
  nox: {
    name: 'Nox', title: 'Schattenkatze', el: 'dunkel', cost: 480,
    stats: { hp: 95, spd: 7.5, jump: 1.15 },
    body: { col: 0x3a2a5a, alt: 0xc08aff, size: 0.95, head: 'pointy', torso: 'bean', legs: 'long', f: ['ears_pointy', 'tail_thin', 'claws', 'glow_eyes'] },
    a1: { k: 'melee', name: 'Krallen', dmg: 10, cd: 0.26, range: 2.4, arc: 120, knock: 1 },
    a2: { k: 'dash', name: 'Schattenschritt', dmg: 15, cd: 4, dist: 7, speed: 30, ghost: true },
    sp: { k: 'leap', name: 'Nachtsturz', dmg: 32, cd: 10, radius: 4.4, h: 5 },
  },
  umbra: {
    name: 'Umbra', title: 'Schattenmagier', el: 'dunkel', cost: 640,
    stats: { hp: 88, spd: 6.2, jump: 1 },
    body: { col: 0x4a3a7a, alt: 0xa070ff, size: 1.0, head: 'round', torso: 'bean', legs: 'none', f: ['hood', 'ghost_tail', 'glow_eyes'] },
    a1: { k: 'proj', name: 'Schattenbolzen', dmg: 9, cd: 0.34, speed: 17, range: 14, size: 0.34 },
    a2: { k: 'pull', name: 'Schwarzes Loch', dmg: 14, cd: 6, radius: 6.5 },
    sp: { k: 'summon', name: 'Schattendiener', dur: 12, cd: 13, unit: 'minion', dmg: 9, rate: 0.6 },
  },
};

// Fangbare Schurken: spielbar, sobald man sie mit einem Fangkristall besiegt hat.
export const VILLAINS = {
  rumpel: {
    name: 'Rumpel', title: 'Felsbrocken-Rüpel', el: 'erde', world: 1, villain: true,
    stats: { hp: 150, spd: 5.5, jump: 1 },
    body: { col: 0x6a5a48, alt: 0xb09a70, size: 1.3, head: 'wide', torso: 'bulky', legs: 'stub', f: ['brow', 'spikes', 'angry'] },
    a1: { k: 'melee', name: 'Rumpelhieb', dmg: 20, cd: 0.6, range: 2.8, arc: 110, knock: 6 },
    a2: { k: 'proj', name: 'Steinhagel', dmg: 10, cd: 1.8, speed: 13, range: 12, size: 0.45, count: 3, spread: 36, grav: 12 },
    sp: { k: 'leap', name: 'Bergsturz', dmg: 34, cd: 10, radius: 4.6, h: 4 },
  },
  zwick: {
    name: 'Zwick', title: 'Windbeutel', el: 'luft', world: 1, villain: true,
    stats: { hp: 85, spd: 7.8, jump: 1.1 },
    moves: { airJumps: 1, glide: true },
    body: { col: 0x78b8c8, alt: 0xf0f8ff, size: 0.85, head: 'pointy', torso: 'bean', legs: 'long', f: ['wings', 'beak', 'angry'] },
    a1: { k: 'proj', name: 'Zwickpfeil', dmg: 7, cd: 0.22, speed: 24, range: 14, size: 0.24 },
    a2: { k: 'melee', name: 'Flügelschlag', dmg: 9, cd: 0.8, range: 3, arc: 160, knock: 8 },
    sp: { k: 'dash', name: 'Sturzflug', dmg: 24, cd: 7, dist: 9, speed: 32 },
  },
  zunder: {
    name: 'Zunder', title: 'Brandstifter', el: 'feuer', world: 2, villain: true,
    stats: { hp: 110, spd: 6.4, jump: 1 },
    body: { col: 0xb02a10, alt: 0xffb030, size: 1.1, head: 'skull', torso: 'bean', legs: 'short', f: ['horns', 'flame', 'angry'] },
    a1: { k: 'proj', name: 'Zunderfunke', dmg: 9, cd: 0.3, speed: 18, range: 13, size: 0.32 },
    a2: { k: 'mine', name: 'Brandfalle', dmg: 30, cd: 3.2, radius: 3.4, delay: 0.8 },
    sp: { k: 'nova', name: 'Feuersbrunst', dmg: 34, cd: 11, radius: 5.4, knock: 6 },
  },
  hammerhart: {
    name: 'Hammerhart', title: 'Eisenschmied', el: 'tech', world: 2, villain: true,
    stats: { hp: 165, spd: 5.0, jump: 1 },
    body: { col: 0x5a6070, alt: 0xff9a30, size: 1.35, head: 'box', torso: 'bulky', legs: 'stub', f: ['visor', 'bolts', 'angry'] },
    a1: { k: 'melee', name: 'Schmiedehammer', dmg: 24, cd: 0.7, range: 2.9, arc: 100, knock: 6 },
    a2: { k: 'proj', name: 'Funkenregen', dmg: 7, cd: 1.6, speed: 15, range: 11, size: 0.3, count: 5, spread: 80 },
    sp: { k: 'shield', name: 'Eisenpanzer', dur: 5, cd: 12, reduce: 0.75 },
  },
  morrigan: {
    name: 'Morrigan', title: 'Totenbeschwörerin', el: 'untot', world: 3, villain: true,
    stats: { hp: 100, spd: 6.3, jump: 1 },
    body: { col: 0x6a8a78, alt: 0xd8ffe8, size: 1.0, head: 'skull', torso: 'ribs', legs: 'none', f: ['hood', 'ghost_tail', 'skull_eyes', 'angry'] },
    a1: { k: 'proj', name: 'Seelenbolzen', dmg: 9, cd: 0.32, speed: 16, range: 13, size: 0.34, homing: 0.8 },
    a2: { k: 'pull', name: 'Seelensog', dmg: 14, cd: 5, radius: 6 },
    sp: { k: 'summon', name: 'Knochenhelfer', dur: 12, cd: 12, unit: 'minion', dmg: 10, rate: 0.7 },
  },
  vesper: {
    name: 'Vesper', title: 'Nachtschwinge', el: 'dunkel', world: 3, villain: true,
    stats: { hp: 95, spd: 7.4, jump: 1.1 },
    moves: { airJumps: 1, glide: true },
    body: { col: 0x2a1a48, alt: 0xff6ac8, size: 0.95, head: 'pointy', torso: 'bean', legs: 'long', f: ['wings', 'ears_pointy', 'glow_eyes', 'angry'] },
    a1: { k: 'melee', name: 'Fledermausbiss', dmg: 10, cd: 0.28, range: 2.4, arc: 130, knock: 1 },
    a2: { k: 'proj', name: 'Schallwelle', dmg: 14, cd: 1.4, speed: 18, range: 12, size: 0.7, pierce: 99, wide: true },
    sp: { k: 'dash', name: 'Nachtflug', dmg: 22, cd: 7, dist: 10, speed: 32, ghost: true },
  },
  brack: {
    name: 'Brack', title: 'Kapitän Salzbart', el: 'wasser', world: 4, villain: true,
    stats: { hp: 135, spd: 6.0, jump: 1 },
    body: { col: 0x2a5a78, alt: 0xe8d8a0, size: 1.2, head: 'wide', torso: 'bulky', legs: 'short', f: ['pirate_hat', 'beard', 'angry'] },
    a1: { k: 'melee', name: 'Säbelhieb', dmg: 16, cd: 0.42, range: 2.8, arc: 120, knock: 4 },
    a2: { k: 'proj', name: 'Kanonenkugel', dmg: 22, cd: 1.8, speed: 14, range: 15, size: 0.55, explode: 2.6 },
    sp: { k: 'dash', name: 'Enterhaken', dmg: 28, cd: 8, dist: 9, speed: 30 },
  },
  perla: {
    name: 'Perla', title: 'Perlenräuberin', el: 'licht', world: 4, villain: true,
    stats: { hp: 100, spd: 6.8, jump: 1.05 },
    body: { col: 0xe8d8f0, alt: 0x6ac8e8, size: 0.95, head: 'round', torso: 'bean', legs: 'stub', f: ['jelly_cap', 'pearls', 'angry'] },
    a1: { k: 'proj', name: 'Perlenschuss', dmg: 8, cd: 0.3, speed: 20, range: 13, size: 0.3 },
    a2: { k: 'nova', name: 'Perlglanz', dmg: 14, cd: 3.4, radius: 4.6, knock: 4 },
    sp: { k: 'heal', name: 'Muschelsegen', amt: 0.4, cd: 13, radius: 6.5 },
  },
};

export const ALL_CHARS = { ...HEROES, ...VILLAINS };
for (const [id, h] of Object.entries(ALL_CHARS)) h.id = id;
export const HERO_IDS = Object.keys(HEROES);
export const VILLAIN_IDS = Object.keys(VILLAINS);
