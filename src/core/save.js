// Spielstand im Browser (localStorage). Fällt auf Speicher zurück, wenn der Browser das Speichern verbietet.
import { HERO_IDS, HEROES } from '../data/heroes.js';
import { MAX_LEVEL, xpNeeded, ACHIEVEMENTS } from '../data/items.js';

const KEY = 'elementis.save.v1';
const OLD_KEYS = ['portal-der-elemente.save', 'pde.save'];

export const DEFAULT_KEYS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space',
  a1: 'KeyJ', a2: 'KeyK', sp: 'KeyL', use: 'KeyE', pause: 'Escape',
};

function fresh() {
  return {
    v: 1,
    gold: 60, soul: 0, crystals: 1,
    unlocked: HERO_IDS.filter((id) => HEROES[id].start),
    captured: [],
    heroes: {},                    // id → { xp, lvl, ups:[bool×4], soul:bool, hat }
    selected: 'glutbock',
    swapper: { top: 'glutbock', bot: 'wirbelfeder', on: false },
    levels: {},                    // id → { stars:[b,b,b], best }
    bosses: [], hats: [], treasures: [], found: [], ach: [], p2hero: null,
    difficulty: 'normal',
    stats: { kills: 0, goldTotal: 0, deaths: 0, levels: 0, playtime: 0, swapperPlays: 0, arenaBest: 0, hardWins: 0, captures: 0 },
    settings: { quality: 'auto', master: 0.8, music: 0.45, sfx: 0.8, dmgNums: true, shake: true, keys: { ...DEFAULT_KEYS }, autoQ: 'high' },
    tutorialSeen: false,
  };
}

let data = null;
let memory = null;

function read() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) for (const k of OLD_KEYS) { raw = localStorage.getItem(k); if (raw) break; }
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return memory; }
}
export function load() {
  const d = fresh();
  const stored = read();
  if (stored && typeof stored === 'object') {
    Object.assign(d, stored);
    d.stats = Object.assign(fresh().stats, stored.stats);
    d.settings = Object.assign(fresh().settings, stored.settings);
    d.settings.keys = Object.assign({ ...DEFAULT_KEYS }, (stored.settings || {}).keys);
    d.swapper = Object.assign(fresh().swapper, stored.swapper);
  }
  data = d;
  return d;
}
export function get() { return data || load(); }
export function persist() {
  memory = data;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* privater Modus: nur im Speicher */ }
}
export function reset() {
  data = fresh();
  persist();
  return data;
}

// ---------------------------------------------------------------- Helden-Fortschritt
export function heroProg(id) {
  const s = get();
  if (!s.heroes[id]) s.heroes[id] = { xp: 0, lvl: 1, ups: [false, false, false, false], soul: false, hat: null };
  return s.heroes[id];
}
export function addXp(id, amount) {
  const p = heroProg(id);
  let leveled = 0;
  if (p.lvl >= MAX_LEVEL) return 0;
  p.xp += amount;
  while (p.lvl < MAX_LEVEL && p.xp >= xpNeeded(p.lvl)) { p.xp -= xpNeeded(p.lvl); p.lvl++; leveled++; }
  if (p.lvl >= MAX_LEVEL) p.xp = 0;
  return leveled;
}
export function isUnlocked(id) {
  const s = get();
  return s.unlocked.includes(id) || s.captured.includes(id);
}
export function checkAchievements() {
  const s = get();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.ach.includes(a.id) && a.check(s)) { s.ach.push(a.id); fresh.push(a); }
  }
  if (fresh.length) persist();
  return fresh;
}
