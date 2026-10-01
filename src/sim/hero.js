// Held auflösen (auch Swapper = Oberteil + Unterteil) und Werte aus Stufe, Upgrades und Hut berechnen.
import { ALL_CHARS } from '../data/heroes.js';
import { UPGRADES, SOUL_UPGRADE, HATS } from '../data/items.js';
import { get as getSave, heroProg } from '../core/save.js';

export function selKey(sel) { return sel.top ? 'swap:' + sel.top + ':' + sel.bot : sel.id; }

export function resolveHero(sel) {
  if (sel.top) {
    const t = ALL_CHARS[sel.top], b = ALL_CHARS[sel.bot];
    return {
      key: selKey(sel), swapper: true, name: t.name.slice(0, Math.max(3, Math.ceil(t.name.length / 2))) + b.name.slice(-Math.max(4, Math.floor(b.name.length / 2))).toLowerCase(),
      title: 'Swapper', el: t.el, els: [...new Set([t.el, b.el])], top: sel.top, bot: sel.bot,
      kit: { a1: t.a1, a2: t.a2, sp: b.sp },
      base: { hp: t.stats.hp, spd: b.stats.spd, jump: b.stats.jump },
      moves: b.moves || {}, progIds: [sel.top, sel.bot],
    };
  }
  const h = ALL_CHARS[sel.id];
  return {
    key: sel.id, swapper: false, name: h.name, title: h.title, el: h.el, els: [h.el], top: sel.id, bot: sel.id,
    kit: { a1: h.a1, a2: h.a2, sp: h.sp }, base: h.stats, moves: h.moves || {}, progIds: [sel.id], villain: !!h.villain,
  };
}

export function heroStats(res) {
  const save = getSave();
  const s = { hp: res.base.hp, spd: res.base.spd, jump: res.base.jump, dmg: 1, atkSpd: 1, spCd: 1, lvl: 1 };
  const topP = heroProg(res.top), botP = heroProg(res.bot);
  s.lvl = res.swapper ? Math.round((topP.lvl + botP.lvl) / 2) : topP.lvl;
  s.hp *= 1 + 0.05 * (s.lvl - 1);
  s.dmg *= 1 + 0.045 * (s.lvl - 1);
  const apply = (id, prog) => { if (prog.ups[UPGRADES.findIndex((u) => u.id === id)]) UPGRADES.find((u) => u.id === id).apply(s); };
  apply('power', topP); apply('tough', topP);
  apply('swift', botP); apply('master', botP);
  if (topP.soul) SOUL_UPGRADE.apply(s);
  if (res.swapper && botP.soul) s.spCd *= 0.85;
  const hat = HATS[topP.hat];
  if (hat && save.hats.includes(topP.hat)) {
    const bn = hat.bonus;
    if (bn.hp) s.hp *= 1 + bn.hp;
    if (bn.dmg) s.dmg *= 1 + bn.dmg;
    if (bn.spd) s.spd *= 1 + bn.spd;
    if (bn.spCd) s.spCd *= 1 + bn.spCd;
  }
  s.hp = Math.round(s.hp);
  return s;
}

// Held, der aktuell am Portal gewählt ist
export function selectedSel() {
  const s = getSave();
  if (s.swapper.on && s.swapper.top && s.swapper.bot) return { top: s.swapper.top, bot: s.swapper.bot };
  return { id: s.selected };
}
