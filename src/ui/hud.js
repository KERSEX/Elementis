// HUD im Spiel: Heldenkarten, Bossleiste, Banner, Story-Untertitel, Hinweise, Meldungen.
import { ELEMENTS } from '../data/elements.js';
import { xpNeeded, MAX_LEVEL } from '../data/items.js';
import { heroProg } from '../core/save.js';
import { esc } from '../core/util.js';
import { BOSSES } from '../data/enemies.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.local = document.getElementById('hud-local');
    this.remote = document.getElementById('hud-remote');
    this.bossEl = document.getElementById('boss');
    this.toasts = document.getElementById('toasts');
    this.prompts = document.getElementById('prompts');
    this.cards = [];
    this.storyEl = null; this.storyT = 0;
    this.modeEl = document.createElement('div'); this.modeEl.id = 'mode-hud'; this.root.appendChild(this.modeEl);
    this.queue = [];
    this.keyLabels = { a1: 'J', a2: 'K', sp: 'L' };
  }
  show(v) { this.root.hidden = !v; if (!v) this.clear(); }
  clear() {
    this.local.innerHTML = ''; this.cards = []; this.bossEl.hidden = true; this.modeEl.textContent = '';
    if (this.storyEl) { this.storyEl.remove(); this.storyEl = null; }
    const b = document.getElementById('banner'); if (b) b.remove();
    this.toasts.innerHTML = ''; this.prompts.innerHTML = ''; this.promptEls = {};
  }
  build(world, keys) {
    this.clear();
    this.keyLabels = { a1: keyName(keys.a1), a2: keyName(keys.a2), sp: keyName(keys.sp) };
    world.players.forEach((p, i) => {
      const el = ELEMENTS[p.hero.el];
      const card = document.createElement('div');
      card.className = 'pcard';
      card.style.borderColor = ['#7fe8ff', '#ffb42a', '#7dff6a', '#ff7ac8'][i % 4];
      card.innerHTML = `<div class="por" style="background:${el.css}55;border-color:${el.css}"><span>${el.glyph}</span><b class="lvl">1</b></div>
        <div class="info"><div class="nm"><span>${esc(p.hero.name)}</span><small class="hp-t"></small></div>
        <div class="bar"><i class="hp"></i></div><div class="bar xp"><i class="xp"></i></div>
        <div class="row"><span class="gold g-t">💰 0</span><span class="buff"></span><span class="cds">
          <span class="cd" data-s="a1"><b></b>${this.keyLabels.a1}</span><span class="cd" data-s="a2"><b></b>${this.keyLabels.a2}</span><span class="cd" data-s="sp"><b></b>${this.keyLabels.sp}</span></span></div></div>`;
      this.local.appendChild(card);
      this.cards.push({
        card, hp: card.querySelector('.hp'), xp: card.querySelector('.xp'), lvl: card.querySelector('.lvl'), hpT: card.querySelector('.hp-t'), gold: card.querySelector('.g-t'), buff: card.querySelector('.buff'),
        cds: { a1: card.querySelector('[data-s=a1]'), a2: card.querySelector('[data-s=a2]'), sp: card.querySelector('[data-s=sp]') }, last: {},
      });
    });
  }
  update(world, dt) {
    world.players.forEach((p, i) => {
      const c = this.cards[i]; if (!c) return;
      const prog = heroProg(p.hero.top);
      const hpR = Math.max(0, p.hp / p.maxHp);
      if (c.last.hp !== p.hp || c.last.max !== p.maxHp) { c.hp.style.width = hpR * 100 + '%'; c.hpT.textContent = Math.ceil(p.hp) + ' / ' + Math.ceil(p.maxHp); c.last.hp = p.hp; c.last.max = p.maxHp; }
      const need = xpNeeded(prog.lvl);
      const xr = prog.lvl >= MAX_LEVEL ? 1 : prog.xp / need;
      if (c.last.xp !== xr) { c.xp.style.width = xr * 100 + '%'; c.last.xp = xr; }
      if (c.last.lvl !== p.stats.lvl) { c.lvl.textContent = p.stats.lvl; c.last.lvl = p.stats.lvl; }
      const g = world.stats.gold;
      if (c.last.gold !== g) { c.gold.textContent = '💰 ' + g; c.last.gold = g; }
      for (const s of ['a1', 'a2', 'sp']) {
        const cd = c.cds[s], rem = Math.max(0, p.cd[s]) / (p.cdMax[s] || 1);
        const ready = p.cd[s] <= 0;
        if (c.last[s] !== (ready ? 'r' : Math.round(rem * 20))) {
          cd.classList.toggle('ready', ready); cd.firstChild.style.height = ready ? '0' : rem * 100 + '%'; c.last[s] = ready ? 'r' : Math.round(rem * 20);
        }
        cd.title = p.hero.kit[s] ? p.hero.kit[s].name : '';
      }
      const bf = [];
      if (p.buff.dmg > 0) bf.push('⚔️'); if (p.buff.spd > 0) bf.push('💨'); if (p.buff.shield > 0) bf.push('🛡️');
      const bs = bf.join(' ') + (p.down > 0 && p.down < 999 ? ' Erschöpft ' + Math.ceil(p.down) + 's' : '');
      if (c.last.buff !== bs) { c.buff.textContent = bs; c.last.buff = bs; }
      c.card.classList.toggle('down', p.down > 0);
    });
    // Boss
    const b = world.boss;
    if (b && !b.dead && world.level.boss && b.awake) {
      this.bossEl.hidden = false;
      if (!this.bossBuilt) { this.bossEl.innerHTML = `<div class="boss-name"></div><div class="bar"><i></i></div>`; this.bossBuilt = true; }
      const nm = this.bossEl.querySelector('.boss-name');
      const pips = b.spec.phases.map((_, i) => (i <= b.phase ? '●' : '○')).join(' ');
      const txt = `${b.spec.name} <span class="pips">${pips}</span>`;
      if (this.lastBoss !== txt) { nm.innerHTML = txt; this.lastBoss = txt; }
      this.bossEl.querySelector('i').style.width = Math.max(0, (b.hp / b.maxHp) * 100) + '%';
    } else { this.bossEl.hidden = true; this.bossBuilt = false; this.lastBoss = ''; }
    // Modus-Anzeige
    let mode = '';
    if (world.arena) {
      const A = world.arena;
      const left = A.queue.length + world.enemies.filter((e) => !e.dead).length;
      mode = A.state === 'break' ? `<small>Nächste Welle in ${Math.ceil(Math.max(0, A.t))}</small>Welle ${A.wave}` : `Welle ${A.wave}<small>Noch ${left} Gegner</small>`;
    } else {
      const t = Math.floor(world.stats.time), m = Math.floor(t / 60), s = String(t % 60).padStart(2, '0');
      mode = `<small>${m}:${s}</small>`;
    }
    if (this.lastMode !== mode) { this.modeEl.innerHTML = mode; this.lastMode = mode; }
    // Story ausblenden
    if (this.storyEl) { this.storyT -= dt; if (this.storyT <= 0) { this.storyEl.remove(); this.storyEl = null; this.nextStory(); } }
  }

  // Hinweise an Toren
  updatePrompts(world, view, keys) {
    const seen = new Set();
    for (const p of world.players) {
      if (p.down > 0) continue;
      const g = world.nearestGate(p);
      if (!g) continue;
      const ok = p.hero.els.includes(g.gate.el);
      const pos = view.project((g.x0 + g.x1) / 2, g.y0 + 3.4, (g.z0 + g.z1) / 2);
      if (!pos) continue;
      const id = g.gate.id + p.id;
      seen.add(id);
      let el = this.promptEls[id];
      if (!el) {
        el = document.createElement('div'); el.className = 'prompt' + (ok ? '' : ' bad');
        el.innerHTML = ok ? `<kbd>${keyName(p.idx === 0 ? keys.use : 'Numpad5')}</kbd>Tor öffnen` : `${ELEMENTS[g.gate.el].glyph} Braucht ${ELEMENTS[g.gate.el].name}`;
        this.prompts.appendChild(el); this.promptEls[id] = el;
      }
      el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-100%)`;
    }
    for (const id of Object.keys(this.promptEls)) if (!seen.has(id)) { this.promptEls[id].remove(); delete this.promptEls[id]; }
  }

  toast(text, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls; el.textContent = text;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  banner(small, big, color = '#ffd84a') {
    let b = document.getElementById('banner'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'banner'; b.style.setProperty('--bc', color);
    b.innerHTML = `<small>${esc(small)}</small><b>${esc(big)}</b>`;
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('out'), 2300);
    setTimeout(() => b.remove(), 2800);
  }
  story(who, text, villain) {
    this.queue.push({ who, text, villain });
    if (!this.storyEl) this.nextStory();
  }
  nextStory() {
    const s = this.queue.shift();
    if (!s) return;
    const el = document.createElement('div'); el.id = 'story';
    el.innerHTML = `<span class="who ${s.villain ? 'villain' : ''}">${esc(s.who)}</span><span class="txt">${esc(s.text)}</span>`;
    document.body.appendChild(el);
    this.storyEl = el; this.storyT = Math.max(3.2, s.text.length * 0.055);
  }
}

export function keyName(code) {
  if (!code) return '?';
  return code.replace('Key', '').replace('Digit', '').replace('Arrow', '').replace('Numpad', 'Num').replace('Space', 'Leer').replace('Escape', 'Esc').replace('Enter', 'Enter')
    .replace('Up', '↑').replace('Down', '↓').replace('Left', '←').replace('Right', '→');
}
