// Menüs und Bildschirme (DOM). Nutzt die Klassen aus styles.css.
import { ELEMENTS, EL_IDS } from '../data/elements.js';
import { HEROES, VILLAINS, ALL_CHARS, HERO_IDS, VILLAIN_IDS } from '../data/heroes.js';
import { UPGRADES, SOUL_UPGRADE, HATS, TREASURES, DIFFICULTIES, DIFF_IDS, ACHIEVEMENTS, MAX_LEVEL, xpNeeded, totalStars } from '../data/items.js';
import { WORLDS, levelMeta, getLevel, LEVEL_IDS } from '../data/levels.js';
import * as Save from '../core/save.js';
import { heroProg, isUnlocked } from '../core/save.js';
import { resolveHero, heroStats, selectedSel } from '../sim/hero.js';
import { esc, fmtTime } from '../core/util.js';
import { keyName } from './hud.js';
import { QUALITY, Q_ORDER } from '../render/view.js';

const KIND_ICON = { melee: '🗡️', proj: '🎯', nova: '💥', dash: '💨', heal: '💚', shield: '🛡️', buff: '⚡', mine: '💣', pull: '🌀', summon: '🤖', leap: '⤵️' };
const CH_TEXT = {
  clear: 'Level abschließen', kills: 'Alle Gegner besiegen', treasure: 'Den Schatz finden', nodown: 'Ohne Erschöpfung gewinnen', speed: 'Schnell sein (unter der Zeitvorgabe)',
};

function dps(k) { return k ? (k.dmg || 0) * (k.count || 1) / Math.max(0.2, k.cd) : 0; }
function bar(v, max) { return `<span class="bar"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></span>`; }
function statRows(st, kit) {
  const d = dps(kit.a1) * 0.6 + dps(kit.a2) * 0.4;
  return `<div class="hstats"><span>LP</span>${bar(st.hp, 220)}<span class="sv">${Math.round(st.hp)}</span>
    <span>Tempo</span>${bar(st.spd, 9)}<span class="sv">${st.spd.toFixed(1)}</span>
    <span>Kraft</span>${bar(d * st.dmg, 60)}<span class="sv">${Math.round(d * st.dmg)}</span></div>`;
}
function atkList(kit) {
  return ['a1', 'a2', 'sp'].map((s) => `${KIND_ICON[kit[s].k] || ''} ${esc(kit[s].name)}`).join(' · ');
}
function pill(text, cls = '') { return `<span class="pill ${cls}">${text}</span>`; }

export class Screens {
  constructor(game) {
    this.g = game;
    this.root = document.getElementById('screens');
    this.cur = null;
    this.tab = 'welten';
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('change', (e) => this.onChange(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
  }
  get s() { return Save.get(); }
  clear() { this.root.innerHTML = ''; this.cur = null; this.kind = null; }
  show(inner, cls = '', kind = '') {
    const prevScroll = this.root.querySelector('.tabbody') ? this.root.querySelector('.tabbody').scrollTop : 0;
    this.root.innerHTML = `<div class="screen ${cls}">${inner}</div>`;
    this.cur = this.root.firstChild; this.kind = kind;
    const tb = this.root.querySelector('.tabbody'); if (tb) tb.scrollTop = prevScroll;
    this.focusFirst();
    return this.cur;
  }
  focusFirst() {
    const f = this.root.querySelector('.btn.primary, .btn, .tab.on');
    if (f && document.activeElement !== f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  // Pfeiltasten / Q E in Menüs
  navigate(e) {
    if (!this.cur) return false;
    const items = [...this.root.querySelectorAll('button:not(:disabled), select, input[type=range]')].filter((el) => el.offsetParent !== null);
    if (!items.length) return false;
    const idx = items.indexOf(document.activeElement);
    const k = e.code;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'KeyS' || k === 'KeyD') {
      if (document.activeElement && document.activeElement.type === 'range' && (k === 'ArrowRight' || k === 'KeyD')) return false;
      items[(idx + 1) % items.length].focus(); e.preventDefault(); return true;
    }
    if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'KeyW' || k === 'KeyA') {
      if (document.activeElement && document.activeElement.type === 'range' && (k === 'ArrowLeft' || k === 'KeyA')) return false;
      items[(idx - 1 + items.length) % items.length].focus(); e.preventDefault(); return true;
    }
    if (this.kind === 'hub' && (k === 'KeyQ' || k === 'KeyE')) {
      const tabs = ['welten', 'helden', 'swapper', 'schmiede', 'sammlung', 'arena'];
      const i = tabs.indexOf(this.tab);
      this.tab = tabs[(i + (k === 'KeyE' ? 1 : tabs.length - 1)) % tabs.length];
      this.hub(); e.preventDefault(); return true;
    }
    return false;
  }

  // ------------------------------------------------------------ Klick-Verteiler
  onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    const a = t.dataset.act, v = t.dataset.v;
    this.g.audio.init(); 
    this.g.audio.play(a === 'back' || a === 'close' ? 'back' : 'click');
    const g = this.g;
    switch (a) {
      case 'play': this.hub(); g.enterHub(); break;
      case 'tab': this.tab = v; this.hub(); break;
      case 'level': this.levelStart(v); break;
      case 'startLevel': g.startLevel(v); break;
      case 'diff': g.changeDifficulty(+v); this.refreshDiff(); break;
      case 'back': g.state === 'paused' ? this.pause() : (g.state === 'title' ? this.title() : this.hub()); break;
      case 'hub': this.hub(); break;
      case 'title': g.toTitle(); break;
      case 'pick': g.pickHero(v); this.hub(); break;
      case 'buyHero': g.buyHero(v); this.hub(); break;
      case 'buyUp': g.buyUpgrade(v); this.hub(); break;
      case 'buyHat': g.buyHat(v); this.hub(); break;
      case 'swapOn': g.useSwapper(); this.hub(); break;
      case 'arena': g.startArena(); break;
      case 'resume': g.resume(); break;
      case 'restartCp': g.restartLevel(); break;
      case 'quit': g.quitToHub(); break;
      case 'settings': this.settings(v); break;
      case 'controls': this.controls(v); break;
      case 'collection': this.tab = 'sammlung'; this.hub(); break;
      case 'again': g.replay(); break;
      case 'next': g.afterResults(); break;
      case 'rebind': this.startRebind(v, t); break;
      case 'resetKeys': Object.assign(this.s.settings.keys, Save.DEFAULT_KEYS); Save.persist(); this.settings(this.settingsBack); break;
      case 'resetSave': if (confirm('Wirklich den ganzen Spielstand löschen?')) { Save.reset(); g.audio.play('back'); this.title(); g.view.clearWorld(); } break;
      case 'p2': g.toggleP2(); this.hub(); break;
    }
  }
  onChange(e) {
    const t = e.target, g = this.g;
    const s = this.s;
    switch (t.dataset.set) {
      case 'quality': s.settings.quality = t.value; g.applyQuality(); Save.persist(); break;
      case 'dmgNums': s.settings.dmgNums = t.checked; g.applySettings(); Save.persist(); break;
      case 'shake': s.settings.shake = t.checked; g.applySettings(); Save.persist(); break;
      case 'swapTop': s.swapper.top = t.value; Save.persist(); this.hub(); break;
      case 'swapBot': s.swapper.bot = t.value; Save.persist(); this.hub(); break;
      case 'smithHero': this.smithHero = t.value; this.hub(); break;
      case 'hat': { const p = heroProg(this.smithHero || s.selected); p.hat = t.value || null; Save.persist(); this.g.refreshHubHero(); this.hub(); break; }
      case 'p2hero': s.p2hero = t.value || null; Save.persist(); break;
    }
  }
  onInput(e) {
    const t = e.target;
    if (t.dataset.vol) { this.s.settings[t.dataset.vol] = +t.value / 100; this.g.applySettings(); Save.persist(); }
  }

  // ------------------------------------------------------------ Titel
  title() {
    this.g.state = 'title';
    const ring = EL_IDS.map((id, i) => `<span style="--a:${i * 36}deg;--c:${ELEMENTS[id].css}"><b><i>${ELEMENTS[id].glyph}</i></b></span>`).join('');
    const s = this.s;
    const started = s.stats.levels > 0 || s.stats.kills > 0;
    this.show(`<div class="panel title">
      <div class="glyph-ring">${ring}</div>
      <h1 class="logo">Elementis</h1>
      <div class="tagline">Hüter der Himmelsinseln</div>
      <p class="sub">20 Helden · 10 Elemente · 4 Welten</p>
      <button class="btn primary" data-act="play">${started ? 'Weiterspielen' : 'Spiel starten'}</button>
      <div class="row2"><button class="btn" data-act="controls" data-v="title">Steuerung</button><button class="btn" data-act="settings" data-v="title">Einstellungen</button></div>
      <p class="hint">Browser-Version · Spielstand wird in diesem Browser gespeichert</p>
    </div>`, '', 'title');
  }

  // ------------------------------------------------------------ Wolkenfeste (Hub)
  hub() {
    const g = this.g, s = this.s;
    g.state = 'hub';
    const tabs = [['welten', 'Welten'], ['helden', 'Helden'], ['swapper', 'Swapper'], ['schmiede', 'Schmiede'], ['sammlung', 'Sammlung'], ['arena', 'Arena']];
    let body = '';
    switch (this.tab) {
      case 'helden': body = this.tabHelden(); break;
      case 'swapper': body = this.tabSwapper(); break;
      case 'schmiede': body = this.tabSchmiede(); break;
      case 'sammlung': body = this.tabSammlung(); break;
      case 'arena': body = this.tabArena(); break;
      default: body = this.tabWelten();
    }
    const cur = this.currentHeroName();
    this.show(`<div class="panel portal hubpanel">
      <div class="portal-head"><h2>Wolkenfeste</h2><div class="row-btns" style="margin:0">
        ${pill('💰 ' + s.gold)}${pill('💜 ' + s.soul, s.soul ? 'on' : '')}${pill('🔮 ' + s.crystals, s.crystals ? 'on' : '')}${pill('⭐ ' + totalStars(s) + '/24')}</div></div>
      <div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${this.tab === id ? 'on' : ''}" data-act="tab" data-v="${id}">${n}</button>`).join('')}</div>
      <div class="tabbody">${body}</div>
      <div class="row-btns"><span class="hint">Aktiver Held: <b>${esc(cur)}</b> · Q / E wechselt den Reiter</span><span style="flex:1"></span>
        <button class="btn small" data-act="settings" data-v="hub">⚙ Einstellungen</button><button class="btn small" data-act="title">Hauptmenü</button></div>
    </div>`, 'right', 'hub');
    g.refreshHubHero();
  }
  currentHeroName() {
    const sel = selectedSel();
    return resolveHero(sel).name + (sel.top ? ' (Swapper)' : '');
  }

  tabWelten() {
    const s = this.s;
    return `<div class="worlds">${WORLDS.map((w) => {
      const locked = w.need && !s.bosses.includes(w.need);
      return `<div class="world ${locked ? 'locked' : ''}" style="--wc:${w.color}"><div class="wh"><span class="wi">${w.icon}</span><div><b>${w.name}</b><small>${locked ? 'Besiege zuerst den Boss der vorigen Welt' : w.sub}</small></div></div>
      <div class="wl">${w.levels.map((id) => {
        const m = levelMeta(id), rec = s.levels[id], st = (rec && rec.stars) || [];
        const stars = [0, 1, 2].map((i) => (st[i] ? '★' : '☆')).join('');
        return `<button class="btn lvl ${m.boss ? 'boss' : ''}" ${locked ? 'disabled' : ''} data-act="level" data-v="${id}"><span>${m.boss ? '👑 ' : ''}${esc(m.name)}</span><small class="gold">${stars}</small></button>`;
      }).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  heroCardHTML(id, h, opts = {}) {
    const el = ELEMENTS[h.el];
    const unlocked = isUnlocked(id);
    const p = heroProg(id);
    const res = resolveHero({ id });
    const st = heroStats(res);
    const cur = !this.s.swapper.on && this.s.selected === id;
    const cls = `hcard ${cur ? 'current' : ''} ${unlocked ? '' : 'locked'}`;
    const act = unlocked ? `data-act="pick" data-v="${id}"` : `data-act="buyHero" data-v="${id}" ${this.s.gold < h.cost ? 'disabled' : ''}`;
    return `<button class="${cls}" style="--el:${el.css}" ${act}>
      <span class="hglyph">${el.glyph}</span><span class="hname">${esc(h.name)}</span><span class="htitle">${esc(h.title)} · ${el.name}</span>
      <span class="hmeta">${unlocked ? 'Stufe ' + p.lvl + (cur ? ' · aktiv' : '') : '🔒 ' + h.cost + ' Gold'}</span>
      <span class="hatk">${atkList({ a1: h.a1, a2: h.a2, sp: h.sp })}</span>${statRows(st, res.kit)}</button>`;
  }
  tabHelden() {
    const s = this.s;
    const heroes = HERO_IDS.map((id) => this.heroCardHTML(id, HEROES[id])).join('');
    const vill = VILLAIN_IDS.map((id) => {
      const v = VILLAINS[id];
      if (!s.captured.includes(id)) return `<div class="locked"><b>❓</b>${esc(v.name)}<br><small>Welt ${v.world}, Schurke</small></div>`;
      return this.heroCardHTML(id, v);
    }).join('');
    const anyV = s.captured.length;
    const p2opts = ['<option value="">Aus</option>', ...s.unlocked.concat(s.captured).map((id) => `<option value="${id}" ${s.p2hero === id ? 'selected' : ''}>${esc(ALL_CHARS[id].name)}</option>`)].join('');
    return `<p class="hint" style="margin:0 0 8px">Wähle deinen Helden. Gesperrte Helden kaufst du mit Gold. Jedes Element öffnet passende Tore im Level.</p>
      <div class="hgrid">${heroes}</div>
      <h3>Gefangene Schurken (${anyV}/8)</h3>
      <div class="hgrid">${vill}</div>
      <h3>Spieler 2 (Ziffernblock, am selben PC)</h3>
      <div class="field"><select data-set="p2hero">${p2opts}</select><span class="hint">Pfeiltasten laufen, Num0 springt, Num1/2/3 greifen an, Num5 benutzt. Im Level auch mit Num-Enter beitreten.</span></div>`;
  }

  tabSwapper() {
    const s = this.s;
    const own = s.unlocked.concat(s.captured);
    const opt = (sel) => own.map((id) => `<option value="${id}" ${sel === id ? 'selected' : ''}>${esc(ALL_CHARS[id].name)} (${ELEMENTS[ALL_CHARS[id].el].name})</option>`).join('');
    if (own.length < 2) return '<p>Du brauchst mindestens zwei Helden für einen Swapper.</p>';
    if (!own.includes(s.swapper.top)) s.swapper.top = own[0];
    if (!own.includes(s.swapper.bot)) s.swapper.bot = own[1];
    const sel = { top: s.swapper.top, bot: s.swapper.bot };
    const res = resolveHero(sel), st = heroStats(res);
    const T = ALL_CHARS[sel.top], B = ALL_CHARS[sel.bot];
    return `<p class="hint" style="margin:0 0 8px">Kombiniere das Oberteil (Angriffe, Lebenspunkte, Element) eines Helden mit dem Unterteil (Tempo, Springen, Spezialfähigkeit) eines anderen. Ein Swapper öffnet die Tore beider Elemente.</p>
      <div class="swap">
        <label class="field">Oberteil<select data-set="swapTop">${opt(sel.top)}</select></label>
        <label class="field">Unterteil<select data-set="swapBot">${opt(sel.bot)}</select></label>
        <div class="swap-prev" style="--el:${ELEMENTS[T.el].css}">
          <b style="font:900 20px var(--font)">${esc(res.name)}</b><br>
          Elemente: ${res.els.map((e) => ELEMENTS[e].glyph + ' ' + ELEMENTS[e].name).join(' + ')}<br>
          ${KIND_ICON[res.kit.a1.k]} ${esc(res.kit.a1.name)} · ${KIND_ICON[res.kit.a2.k]} ${esc(res.kit.a2.name)}<br>
          ${KIND_ICON[res.kit.sp.k]} Spezial: ${esc(res.kit.sp.name)}
          ${statRows(st, res.kit)}
        </div>
        <button class="btn primary" data-act="swapOn">${s.swapper.on ? 'Swapper aktiv – neu wählen' : 'Diesen Swapper wählen'}</button>
      </div>`;
  }

  tabSchmiede() {
    const s = this.s;
    const own = s.unlocked.concat(s.captured);
    const id = own.includes(this.smithHero) ? this.smithHero : (own.includes(s.selected) ? s.selected : own[0]);
    this.smithHero = id;
    const h = ALL_CHARS[id], p = heroProg(id), el = ELEMENTS[h.el];
    const res = resolveHero({ id }), st = heroStats(res);
    const need = p.lvl >= MAX_LEVEL ? 'Maximalstufe' : `${p.xp} / ${xpNeeded(p.lvl)} EP`;
    const ups = UPGRADES.map((u, i) => {
      const owned = p.ups[i];
      return `<button class="up ${owned ? 'owned' : ''}" data-act="buyUp" data-v="${i}" ${owned || s.gold < u.cost ? 'disabled' : ''}>
        <span class="un"><span>${u.name}</span><span class="gold">${owned ? '✔' : '💰 ' + u.cost}</span></span><span class="ud">${u.desc}</span></button>`;
    }).join('');
    const soul = `<button class="up soul ${p.soul ? 'owned' : ''}" data-act="buyUp" data-v="soul" ${p.soul || s.soul < 1 ? 'disabled' : ''}>
      <span class="un"><span>💜 ${SOUL_UPGRADE.name}</span><span>${p.soul ? '✔' : '1 Seelenstein'}</span></span><span class="ud">${SOUL_UPGRADE.desc}</span></button>`;
    const hats = Object.entries(HATS).filter(([hid]) => s.hats.includes(hid));
    const hatSel = `<label class="field">Hut<select data-set="hat"><option value="">Kein Hut</option>${hats.map(([hid, hh]) => `<option value="${hid}" ${p.hat === hid ? 'selected' : ''}>${esc(hh.name)} (${bonusText(hh.bonus)})</option>`).join('')}</select></label>`;
    const shop = Object.entries(HATS).filter(([hid, hh]) => hh.shop && !s.hats.includes(hid)).map(([hid, hh]) => `<button class="btn small" data-act="buyHat" data-v="${hid}" ${s.gold < hh.shop ? 'disabled' : ''}>🎩 ${esc(hh.name)} – ${hh.shop} Gold</button>`).join(' ');
    return `<div class="shop" style="width:auto">
      <label class="field">Held<select data-set="smithHero">${own.map((o) => `<option value="${o}" ${o === id ? 'selected' : ''}>${esc(ALL_CHARS[o].name)} – Stufe ${heroProg(o).lvl}</option>`).join('')}</select></label>
      <div class="shop-stats"><b style="color:${el.css}">${el.glyph} ${esc(h.name)}</b> · Stufe ${p.lvl} · ${need}<br>LP ${st.hp} · Tempo ${st.spd.toFixed(1)} · Schaden ×${st.dmg.toFixed(2)} · Spezial-Abklingzeit ×${st.spCd.toFixed(2)}</div>
      <h3>Upgrades</h3><div class="ups">${ups}${soul}</div>
      <h3>Kopfbedeckung</h3>${hatSel}<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${shop}</div></div>`;
  }

  tabSammlung() {
    const s = this.s;
    const hatsN = Object.keys(HATS).length, trN = Object.keys(TREASURES).length;
    const cats = [
      ['Helden', s.unlocked.length, 20], ['Schurken', s.captured.length, 8], ['Hüte', s.hats.length, hatsN], ['Schätze', s.treasures.length, trN],
      ['Sterne', totalStars(s), 24], ['Erfolge', s.ach.length, ACHIEVEMENTS.length],
    ];
    const total = cats.reduce((a, c) => a + c[1], 0), max = cats.reduce((a, c) => a + c[2], 0);
    const pct = Math.round((total / max) * 100);
    const catRows = cats.map(([n, a, b]) => `<div class="cat-row"><span>${n}</span><span class="pbar"><i style="width:${(a / b) * 100}%"></i></span><span>${a} / ${b}</span></div>`).join('');
    const hats = Object.entries(HATS).map(([id, h]) => `<div class="coll-item ${s.hats.includes(id) ? '' : 'locked'}"><b>🎩 ${s.hats.includes(id) ? esc(h.name) : '???'}</b><small>${s.hats.includes(id) ? bonusText(h.bonus) + ' · ' : ''}Fundort: ${esc(h.where)}</small></div>`).join('');
    const trs = Object.entries(TREASURES).map(([id, t]) => `<div class="coll-item ${s.treasures.includes(id) ? '' : 'locked'}"><b>🏺 ${s.treasures.includes(id) ? esc(t.name) : '???'}</b><small>Fundort: ${esc(t.where)}${s.treasures.includes(id) ? ' · ' + t.gold + ' Gold' : ''}</small></div>`).join('');
    const ach = ACHIEVEMENTS.map((a) => `<div class="coll-item ach ${s.ach.includes(a.id) ? '' : 'locked'}"><span class="ic">${a.icon}</span><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div></div>`).join('');
    const stt = s.stats;
    const statTable = `<table class="res stats"><tr><td>Gegner besiegt</td><td>${stt.kills}</td></tr><tr><td>Gold gesammelt</td><td>${stt.goldTotal}</td></tr><tr><td>Level geschafft</td><td>${stt.levels}</td></tr><tr><td>Erschöpft</td><td>${stt.deaths}</td></tr><tr><td>Spielzeit</td><td>${fmtTime(stt.playtime)}</td></tr><tr><td>Beste Arena-Welle</td><td>${stt.arenaBest}</td></tr></table>`;
    return `<div class="coll"><h3 style="margin-top:0">Fortschritt: ${pct} %</h3><span class="pbar big"><i style="width:${pct}%"></i></span>${catRows}
      <h3>Hüte</h3><div class="coll-grid">${hats}</div><h3>Schätze</h3><div class="coll-grid">${trs}</div>
      <h3>Erfolge</h3><div class="coll-grid">${ach}</div><h3>Statistik</h3>${statTable}
      <div class="row-btns"><button class="btn small" data-act="resetSave">Spielstand löschen</button></div></div>`;
  }

  tabArena() {
    const s = this.s;
    const d = DIFFICULTIES[s.difficulty];
    return `<div style="max-width:560px"><h3 style="margin-top:0">Arena der Elemente</h3>
      <p>Überlebe Welle um Welle. Alle 5 Wellen erscheint ein Schurke. Bei Welle 5 wartet ein Hut, bei Welle 10 und 15 je ein Seelenstein (einmalig). Ab Welle 15 kommen auch Sturmküsten-Gegner.</p>
      <p>Beste Welle: <b class="gold">${s.stats.arenaBest}</b></p>
      <div class="diff-row"><button class="btn small" data-act="diff" data-v="-1">◀</button><div class="diff-box" style="--dc:${d.color}"><span class="dn">${d.name}</span><small>${d.desc}</small></div><button class="btn small" data-act="diff" data-v="1">▶</button></div>
      <button class="btn primary" data-act="arena">Arena betreten</button></div>`;
  }

  // ------------------------------------------------------------ Levelstart
  levelStart(id) {
    const s = this.s;
    const m = levelMeta(id), rec = s.levels[id] || { stars: [] };
    const d = DIFFICULTIES[s.difficulty];
    const gates = [...new Set(m.gates)].map((e) => ELEMENTS[e].glyph + ' ' + ELEMENTS[e].name);
    const ch = m.challenges.map((c, i) => {
      const done = rec.stars && rec.stars[i];
      let text = CH_TEXT[c];
      if (c === 'speed') text = `Unter ${fmtTime(m.par)} Minuten`;
      if (c === 'treasure' && gates.length) text += ` (Tor: ${gates.join(' oder ')})`;
      return `<b class="${done ? 'ok' : ''}">${done ? '★' : '☆'} ${esc(text)}</b>`;
    }).join('');
    const stars = [0, 1, 2].map((i) => `<span class="${rec.stars && rec.stars[i] ? '' : 'off'}">★</span>`).join('');
    const sel = resolveHero(selectedSel());
    const cant = !this.g.canDifficulty(s.difficulty);
    this.show(`<div class="panel title" style="width:min(560px,94vw)">
      <h2 style="text-align:center;margin-bottom:2px">${m.boss ? '👑 ' : ''}${esc(m.name)}</h2>
      <p class="sub" style="margin-bottom:8px">${esc(m.desc)}</p>
      <div class="stars small" style="text-align:center">${stars}</div>
      <div class="lv-info">${ch}${m.gates.length && !m.boss ? `<span class="hint">Element-Tore: ${gates.join(', ')}</span>` : ''}</div>
      <div class="diff-row"><button class="btn small" data-act="diff" data-v="-1">◀</button><div class="diff-box" style="--dc:${d.color}"><span class="dn">${d.name}</span><small>${d.desc}</small></div><button class="btn small" data-act="diff" data-v="1">▶</button></div>
      <p class="hint" style="text-align:center">Held: <b>${esc(sel.name)}</b> ${sel.els.map((e) => ELEMENTS[e].glyph).join('')}</p>
      <button class="btn primary" data-act="startLevel" data-v="${id}">Los geht's!</button>
      <button class="btn" data-act="hub">Zurück</button></div>`, '', 'levelstart');
    this.levelStartId = id;
  }
  refreshDiff() {
    if (this.kind === 'levelstart') this.levelStart(this.levelStartId);
    else if (this.kind === 'hub') this.hub();
  }

  // ------------------------------------------------------------ Pause & Ergebnis
  pause() {
    this.g.state = 'paused';
    const w = this.g.world;
    const arena = w && w.arena;
    this.show(`<div class="panel title"><h2 style="text-align:center">Pause</h2>
      <button class="btn primary" data-act="resume">Weiter</button>
      ${arena ? '' : '<button class="btn" data-act="restartCp">Level neu starten</button>'}
      <div class="row2"><button class="btn" data-act="controls" data-v="pause">Steuerung</button><button class="btn" data-act="settings" data-v="pause">Einstellungen</button></div>
      <button class="btn" data-act="quit">${arena ? 'Arena beenden' : 'Level verlassen'}</button></div>`, '', 'pause');
  }

  results(r) {
    this.g.state = 'results';
    const stars = [0, 1, 2].map((i) => `<span class="${r.stars[i] ? '' : 'off'}">★</span>`).join('');
    const rows = r.rows.map(([a, b]) => `<tr><td>${a}</td><td style="text-align:right">${b}</td></tr>`).join('');
    const ch = r.challenges.map((c) => `<b class="${c.done ? 'ok' : ''}" style="${c.done ? '' : 'opacity:.5'}">${c.done ? '★' : '☆'} ${esc(c.text)}${c.isNew ? ' – neu!' : ''}</b>`).join('');
    this.show(`<div class="panel title" style="width:min(560px,94vw)">
      <h2 style="text-align:center;margin-bottom:0">${r.win ? (r.arena ? 'Arena beendet' : 'Level geschafft!') : 'Erschöpft!'}</h2>
      <p class="sub" style="margin:0 0 6px">${esc(r.title)}</p>
      ${r.arena ? '' : `<div class="stars">${stars}</div><div class="lv-info">${ch}</div>`}
      <table class="res">${rows}</table>
      ${r.unlocks.length ? `<div class="lv-info">${r.unlocks.map((u) => `<b class="ok">${esc(u)}</b>`).join('')}</div>` : ''}
      <button class="btn primary" data-act="next">Weiter</button>
      <button class="btn" data-act="again">Nochmal spielen</button></div>`, '', 'results');
  }

  // ------------------------------------------------------------ Einstellungen & Steuerung
  settings(back) {
    this.settingsBack = back;
    const st = this.s.settings;
    const qopts = ['auto', ...Q_ORDER].map((q) => `<option value="${q}" ${st.quality === q ? 'selected' : ''}>${q === 'auto' ? 'Automatisch' : QUALITY[q].label}</option>`).join('');
    const K = st.keys;
    const names = { up: 'Hoch', down: 'Runter', left: 'Links', right: 'Rechts', jump: 'Springen', a1: 'Angriff 1', a2: 'Angriff 2', sp: 'Spezial', use: 'Benutzen' };
    const keys = Object.keys(names).map((k) => `<span>${names[k]}</span><button class="btn small" data-act="rebind" data-v="${k}">${keyName(K[k])}</button>`).join('');
    this.show(`<div class="panel" style="width:min(640px,94vw)"><h2>Einstellungen</h2>
      <label class="field">Grafik<select data-set="quality">${qopts}</select><span class="q-now">${st.quality === 'auto' ? 'Aktuell: ' + QUALITY[this.g.view.quality.id].label : ''}</span></label>
      <label class="field">Gesamtlautstärke<input type="range" min="0" max="100" value="${Math.round(st.master * 100)}" data-vol="master"></label>
      <label class="field">Musik<input type="range" min="0" max="100" value="${Math.round(st.music * 100)}" data-vol="music"></label>
      <label class="field">Effekte<input type="range" min="0" max="100" value="${Math.round(st.sfx * 100)}" data-vol="sfx"></label>
      <label class="check"><input type="checkbox" data-set="dmgNums" ${st.dmgNums ? 'checked' : ''}> Schadenszahlen anzeigen</label>
      <label class="check"><input type="checkbox" data-set="shake" ${st.shake ? 'checked' : ''}> Bildschirm wackeln</label>
      <h3>Tastenbelegung (Spieler 1)</h3><div class="keys">${keys}</div>
      <div class="row-btns"><button class="btn small" data-act="resetKeys">Zurücksetzen</button><span style="flex:1"></span><button class="btn small primary" data-act="back">Fertig</button></div></div>`, '', 'settings');
  }
  startRebind(k, btn) {
    btn.textContent = 'Taste drücken …';
    this.g.input.rebinding = (code) => {
      this.g.input.rebinding = null;
      if (code !== 'Escape') { this.s.settings.keys[k] = code; Save.persist(); }
      this.settings(this.settingsBack);
    };
  }
  controls(back) {
    this.controlsBack = back;
    const K = this.s.settings.keys;
    this.show(`<div class="panel" style="width:min(760px,94vw)"><h2>Steuerung</h2>
      <table class="res"><tr><th></th><th>Spieler 1 (Tastatur + Maus)</th><th>Gamepad</th><th>Spieler 2</th></tr>
      <tr><td>Laufen</td><td>${keyName(K.up)}${keyName(K.left)}${keyName(K.down)}${keyName(K.right)}</td><td>linker Stick</td><td>Pfeiltasten</td></tr>
      <tr><td>Springen</td><td>${keyName(K.jump)}</td><td>A</td><td>Num0</td></tr>
      <tr><td>Angriff 1</td><td>Linksklick / ${keyName(K.a1)}</td><td>X / RT</td><td>Num1</td></tr>
      <tr><td>Angriff 2</td><td>Rechtsklick / ${keyName(K.a2)}</td><td>B</td><td>Num2</td></tr>
      <tr><td>Spezial</td><td>${keyName(K.sp)} / Q</td><td>Y</td><td>Num3</td></tr>
      <tr><td>Benutzen (Tore)</td><td>${keyName(K.use)}</td><td>RB</td><td>Num5</td></tr>
      <tr><td>Pause</td><td>Esc</td><td>Start</td><td>Num-Enter</td></tr></table>
      <p class="hint">Mit der Maus zielen die Angriffe auf den Mauszeiger, mit dem Gamepad auf den rechten Stick. Mit Tastatur allein zielt das Spiel automatisch auf Gegner in Blickrichtung. Am Handy: Stick links, Tasten rechts.</p>
      <dl class="help"><dt>Elemente &amp; Tore</dt><dd>Farbige Tore öffnet nur ein Held (oder Swapper) mit dem passenden Element. Dahinter liegen Schätze, Hüte und Seelensteine.</dd>
      <dt>Schurken fangen</dt><dd>Besiegst du einen Elite-Schurken mit einem Fangkristall im Beutel, kannst du ihn danach selbst spielen.</dd></dl>
      <div class="row-btns"><span style="flex:1"></span><button class="btn small primary" data-act="back">Zurück</button></div></div>`, '', 'controls');
  }
}

function bonusText(b) {
  const parts = [];
  if (b.hp) parts.push('+' + Math.round(b.hp * 100) + ' % LP');
  if (b.dmg) parts.push('+' + Math.round(b.dmg * 100) + ' % Schaden');
  if (b.spd) parts.push('+' + Math.round(b.spd * 100) + ' % Tempo');
  if (b.spCd) parts.push(Math.round(b.spCd * 100) + ' % Spezial-Abklingzeit');
  return parts.join(', ');
}
