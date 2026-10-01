// Upgrades, Hüte, Schätze, Schwierigkeit, Erfolge
import { HERO_IDS, VILLAIN_IDS } from './heroes.js';

export const MAX_LEVEL = 20;
export const xpNeeded = (lvl) => 45 + 30 * (lvl - 1);

// 4 Upgrades pro Held + 1 Seelenstein-Upgrade. s ist das Werte-Objekt des Helden.
export const UPGRADES = [
  { id: 'power',  name: 'Kraft',          desc: '+15 % Schaden',                 cost: 80,  apply: (s) => { s.dmg *= 1.15; } },
  { id: 'tough',  name: 'Zähigkeit',      desc: '+20 % Lebenspunkte',            cost: 120, apply: (s) => { s.hp *= 1.2; } },
  { id: 'swift',  name: 'Flinke Füße',    desc: '+10 % Tempo, +12 % Angriffstempo', cost: 180, apply: (s) => { s.spd *= 1.1; s.atkSpd *= 1.12; } },
  { id: 'master', name: 'Meisterschaft',  desc: 'Spezial lädt 25 % schneller',   cost: 260, apply: (s) => { s.spCd *= 0.75; } },
];
export const SOUL_UPGRADE = { id: 'soul', name: 'Seelenkern', desc: '+25 % Schaden, +25 % LP, Spezial lädt 15 % schneller', cost: 1, apply: (s) => { s.dmg *= 1.25; s.hp *= 1.25; s.spCd *= 0.85; } };

export const DIFFICULTIES = {
  leicht:    { id: 'leicht',    name: 'Leicht',    color: '#7dff6a', desc: 'Gegner haben weniger LP und treffen schwächer.', hp: 0.7,  dmg: 0.65, gold: 0.8,  wait: 3 },
  normal:    { id: 'normal',    name: 'Normal',    color: '#ffffff', desc: 'So ist das Spiel gedacht.',                       hp: 1,    dmg: 1,    gold: 1,    wait: 5 },
  schwer:    { id: 'schwer',    name: 'Schwer',    color: '#ffb42a', desc: 'Zähere Gegner, härtere Treffer, mehr Gold.',     hp: 1.5,  dmg: 1.4,  gold: 1.4,  wait: 8 },
  albtraum:  { id: 'albtraum',  name: 'Albtraum',  color: '#ff5a6a', desc: 'Nur für Meister. Sehr viel Gold.',              hp: 2.2,  dmg: 1.9,  gold: 2,    wait: 12 },
};
export const DIFF_IDS = Object.keys(DIFFICULTIES);

// Hüte: Werte-Bonus (hp/dmg/spd/spCd als Faktor), shape = Form für das Modell
export const HATS = {
  moos:     { name: 'Moosmütze',     shape: 'cap',       color: 0x6aa84a, bonus: { hp: 0.06 },  where: 'Moosklippen' },
  nebel:    { name: 'Nebelhut',      shape: 'wizard',    color: 0x9ab0c8, bonus: { dmg: 0.05 }, where: 'Nebelmoor-Ruinen' },
  schmied:  { name: 'Schmiedehelm',  shape: 'helmet',    color: 0x7a7e8a, bonus: { hp: 0.08 },  where: 'Funkenhalle' },
  glut:     { name: 'Glutkrone',     shape: 'crown',     color: 0xff7a2a, bonus: { dmg: 0.06 }, where: 'Essenschlund' },
  schatten: { name: 'Schattenkapuze', shape: 'hood',     color: 0x3a2a5a, bonus: { spd: 0.05 }, where: 'Schattenhof' },
  turm:     { name: 'Turmzinne',     shape: 'crown',     color: 0x8a6ac8, bonus: { spCd: -0.08 }, where: 'Zitadellen-Turm' },
  gischt:   { name: 'Gischt-Kappe',  shape: 'pirate',    color: 0x2a5a78, bonus: { spd: 0.06 }, where: 'Gischtklippen' },
  kompass:  { name: 'Sturmkompass',  shape: 'top',       color: 0xc8a050, bonus: { dmg: 0.08 }, where: 'Sturmauge' },
  propeller:{ name: 'Propellerkappe', shape: 'propeller', color: 0xff5a6a, bonus: { spd: 0.08 }, where: 'Arena, Welle 5' },
  zylinder: { name: 'Zylinder',      shape: 'top',       color: 0x22222a, bonus: { dmg: 0.04 }, where: 'Wolkenfeste-Kauf' , shop: 250 },
  stern:    { name: 'Sternenhut',    shape: 'cone',      color: 0x3a4ad0, bonus: { spCd: -0.1 }, where: 'Wolkenfeste-Kauf', shop: 400 },
  krone:    { name: 'Heldenkrone',   shape: 'crown',     color: 0xffd84a, bonus: { hp: 0.1, dmg: 0.05 }, where: 'Alle Bosse besiegt' },
};

export const TREASURES = {
  t_muschel:   { name: 'Singende Muschel',   gold: 60,  where: 'Moosklippen' },
  t_kompass:   { name: 'Wolkenkompass',      gold: 80,  where: 'Nebelmoor-Ruinen' },
  t_moragar:   { name: 'Moragars Siegel',    gold: 150, where: 'Boss: Moragar' },
  t_zahnrad:   { name: 'Goldenes Zahnrad',   gold: 90,  where: 'Funkenhalle' },
  t_glutstein: { name: 'Ewiger Glutstein',   gold: 110, where: 'Essenschlund' },
  t_kessel:    { name: 'Eisenkessels Kern',  gold: 180, where: 'Boss: Eisenkessel' },
  t_schatten:  { name: 'Schattenspiegel',    gold: 120, where: 'Schattenhof' },
  t_sterne:    { name: 'Sternenstaub',       gold: 140, where: 'Zitadellen-Turm' },
  t_zerrax:    { name: 'Zerrax\' Auge',      gold: 220, where: 'Boss: Zerrax' },
  t_perle:     { name: 'Riesenperle',        gold: 140, where: 'Gischtklippen' },
  t_blitz:     { name: 'Blitzflasche',       gold: 160, where: 'Sturmauge' },
  t_kraal:     { name: 'Kraals Dreizack',    gold: 260, where: 'Boss: Kraal' },
};

// Erfolge: check(save) → true/false
export const ACHIEVEMENTS = [
  { id: 'first_win',   icon: '🏁', name: 'Erster Sieg',        desc: 'Schließe ein Level ab.',                  check: (s) => s.stats.levels >= 1 },
  { id: 'kills_100',   icon: '⚔️', name: 'Gegnerjäger',        desc: 'Besiege 100 Gegner.',                     check: (s) => s.stats.kills >= 100 },
  { id: 'kills_500',   icon: '🗡️', name: 'Held der Inseln',    desc: 'Besiege 500 Gegner.',                     check: (s) => s.stats.kills >= 500 },
  { id: 'gold_1000',   icon: '💰', name: 'Goldsammler',        desc: 'Sammle insgesamt 1000 Gold.',             check: (s) => s.stats.goldTotal >= 1000 },
  { id: 'gold_5000',   icon: '🏦', name: 'Drachenhort',        desc: 'Sammle insgesamt 5000 Gold.',             check: (s) => s.stats.goldTotal >= 5000 },
  { id: 'boss_1',      icon: '👑', name: 'Moragar besiegt',    desc: 'Besiege den Boss der Himmelsinseln.',     check: (s) => s.bosses.includes('moragar') },
  { id: 'boss_2',      icon: '🔥', name: 'Eisenkessel besiegt', desc: 'Besiege den Boss der Glutschmiede.',     check: (s) => s.bosses.includes('eisenkessel') },
  { id: 'boss_3',      icon: '🌑', name: 'Zerrax besiegt',     desc: 'Besiege den Boss der Zitadelle.',         check: (s) => s.bosses.includes('zerrax') },
  { id: 'boss_4',      icon: '🌊', name: 'Kraal besiegt',      desc: 'Besiege den Boss der Sturmküste.',        check: (s) => s.bosses.includes('kraal') },
  { id: 'star_10',     icon: '⭐', name: 'Sternensammler',     desc: 'Sammle 10 Sterne.',                       check: (s) => totalStars(s) >= 10 },
  { id: 'star_all',    icon: '🌟', name: 'Sternenmeister',     desc: 'Sammle alle Sterne.',                     check: (s) => totalStars(s) >= 24 },
  { id: 'hero_5',      icon: '🧙', name: 'Heldentruppe',       desc: 'Schalte 5 Helden frei.',                  check: (s) => s.unlocked.length >= 5 },
  { id: 'hero_all',    icon: '🎖️', name: 'Alle Elemente',      desc: 'Schalte alle 20 Helden frei.',            check: (s) => HERO_IDS.every((h) => s.unlocked.includes(h)) },
  { id: 'lvl_10',      icon: '📈', name: 'Aufsteiger',         desc: 'Bringe einen Helden auf Stufe 10.',       check: (s) => Object.values(s.heroes).some((h) => h.lvl >= 10) },
  { id: 'lvl_20',      icon: '🏅', name: 'Meisterheld',        desc: 'Bringe einen Helden auf Stufe 20.',       check: (s) => Object.values(s.heroes).some((h) => h.lvl >= 20) },
  { id: 'soul',        icon: '💜', name: 'Seelenkraft',        desc: 'Nutze einen Seelenstein.',                check: (s) => Object.values(s.heroes).some((h) => h.soul) },
  { id: 'capture',     icon: '🔮', name: 'Schurkenfänger',     desc: 'Fange einen Schurken.',                   check: (s) => s.captured.length >= 1 },
  { id: 'capture_all', icon: '🏴‍☠️', name: 'Schurkensammler',  desc: 'Fange alle 8 Schurken.',                  check: (s) => VILLAIN_IDS.every((v) => s.captured.includes(v)) },
  { id: 'swapper',     icon: '🔀', name: 'Swapper',            desc: 'Spiele ein Level mit einem Swapper.',     check: (s) => s.stats.swapperPlays >= 1 },
  { id: 'hats_5',      icon: '🎩', name: 'Hutsammler',         desc: 'Finde 5 Hüte.',                           check: (s) => s.hats.length >= 5 },
  { id: 'treasure_6',  icon: '🏺', name: 'Schatzsucher',       desc: 'Finde 6 Schätze.',                        check: (s) => s.treasures.length >= 6 },
  { id: 'treasure_all',icon: '💎', name: 'Schatzmeister',      desc: 'Finde alle 12 Schätze.',                  check: (s) => s.treasures.length >= 12 },
  { id: 'arena_10',    icon: '🏟️', name: 'Arena-Kämpfer',      desc: 'Erreiche Welle 10 in der Arena.',         check: (s) => s.stats.arenaBest >= 10 },
  { id: 'hard_win',    icon: '😈', name: 'Harte Schule',       desc: 'Schließe ein Level auf Schwer ab.',       check: (s) => s.stats.hardWins >= 1 },
];
export function totalStars(s) {
  let n = 0;
  for (const l of Object.values(s.levels)) n += (l.stars || []).filter(Boolean).length;
  return n;
}
