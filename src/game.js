// Spielsteuerung: Zustände (Titel, Wolkenfeste, Level, Pause, Ergebnis), Hauptschleife, Speichern.
import * as Save from './core/save.js';
import * as audio from './core/audio.js';
import { Input } from './core/input.js';
import { GameView, QUALITY, Q_ORDER } from './render/view.js';
import { World } from './sim/world.js';
import { resolveHero, heroStats, selectedSel } from './sim/hero.js';
import { getLevel, WORLDS, LEVEL_IDS } from './data/levels.js';
import { ELEMENTS } from './data/elements.js';
import { ALL_CHARS, HEROES } from './data/heroes.js';
import { DIFF_IDS, DIFFICULTIES, UPGRADES, HATS, TREASURES, MAX_LEVEL, xpNeeded } from './data/items.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { setupTouch, isTouchDevice } from './ui/touch.js';
import { fmtTime } from './core/util.js';

const STEP = 1 / 60;

export class Game {
  constructor() {
    this.save = Save.load();
    this.audio = audio;
    this.canvas = document.getElementById('game');
    const q = this.save.settings.quality === 'auto' ? this.save.settings.autoQ : this.save.settings.quality;
    this.view = new GameView(this.canvas, { dmg: document.getElementById('dmg'), prompts: document.getElementById('prompts') }, q);
    this.input = new Input(this.canvas, () => this.save.settings.keys);
    this.hud = new Hud();
    this.ui = new Screens(this);
    this.input.menuHandler = (e) => this.onMenuKey(e);
    this.state = 'title';
    this.world = null;
    this.levelId = null; this.mode = 'level';
    this.p2on = false;
    this.last = performance.now();
    this.fpsAcc = 0; this.fpsN = 0; this.fpsT = 0; this.lowCount = 0; this.highCount = 0;
    this.applySettings();
    this.touch = null;
    if (isTouchDevice()) { this.touch = setupTouch(this.input, () => this.state === 'play' && this.pause()); this.touch.show(false); this.input.touch.on = true; }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { Save.persist(); if (this.state === 'play') this.pause(); } });
    window.addEventListener('pagehide', () => Save.persist());
    setInterval(() => { if (this.state === 'play') Save.persist(); }, 10000);
    const unlock = () => { audio.init(); audio.setVolumes(this.save.settings); this.syncMusic(); };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  start() {
    this.toTitle();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ------------------------------------------------------------ Einstellungen
  applySettings() {
    const st = this.save.settings;
    audio.setVolumes({ master: st.master, music: st.music, sfx: st.sfx });
    this.view.float.enabled = st.dmgNums;
    this.view.shakeOn = st.shake;
  }
  applyQuality() {
    const st = this.save.settings;
    const q = st.quality === 'auto' ? st.autoQ : st.quality;
    this.view.setQuality(q);
  }
  autoQuality(dt) {
    const st = this.save.settings;
    if (st.quality !== 'auto' || this.state !== 'play') { this.fpsAcc = 0; this.fpsN = 0; this.fpsT = 0; return; }
    this.fpsAcc += dt; this.fpsN++; this.fpsT += dt;
    if (this.fpsT < 3) return;
    const fps = this.fpsN / this.fpsAcc;
    this.fpsAcc = 0; this.fpsN = 0; this.fpsT = 0;
    const idx = Q_ORDER.indexOf(this.view.quality.id);
    if (fps < 45 && idx < Q_ORDER.length - 1) {
      this.lowCount++;
      if (this.lowCount >= 2) { this.lowCount = 0; this.setAuto(Q_ORDER[idx + 1]); this.hud.toast('Grafik: ' + QUALITY[Q_ORDER[idx + 1]].label, ''); }
    } else this.lowCount = 0;
    if (fps > 57 && idx > 0 && this.view.quality.id === st.autoQ) {
      this.highCount++;
      if (this.highCount >= 8 && (this.nextTry || 0) < performance.now()) { this.highCount = 0; this.setAuto(Q_ORDER[idx - 1]); this.nextTry = performance.now() + 60000; }
    } else this.highCount = 0;
  }
  setAuto(q) { this.save.settings.autoQ = q; this.view.setQuality(q); Save.persist(); }

  // ------------------------------------------------------------ Menüs
  onMenuKey(e) {
    if (this.state === 'play') {
      if (e.code === 'NumpadEnter') this.joinP2();
      return;
    }
    if (this.input.rebinding) return;
    if (e.code === 'Escape') {
      if (this.state === 'paused') return this.resume();
      if (this.ui.kind === 'settings' || this.ui.kind === 'controls') return this.ui.onClick({ target: { closest: () => ({ dataset: { act: 'back' } }) } });
      if (this.ui.kind === 'levelstart') return this.ui.hub();
    }
    this.ui.navigate(e);
  }
  toTitle() {
    this.state = 'title';
    this.world && (this.world = null);
    this.hud.show(false);
    if (this.touch) this.touch.show(false);
    this.showHubScene();
    this.view.hubFocusX = 0;
    this.ui.title();
    audio.playMusic('hub');
  }
  enterHub() {
    this.state = 'hub';
    if (!this.view.hub) this.showHubScene();
    this.syncMusic();
  }
  showHubScene() {
    const sel = selectedSel();
    this.view.showHub(sel, this.hatOf(sel));
  }
  refreshHubHero() {
    if (!this.view.hub) return;
    const sel = selectedSel();
    const key = JSON.stringify([sel, this.hatOf(sel)]);
    if (this.hubKey === key) return;
    this.hubKey = key;
    this.view.setHubHero(sel, this.hatOf(sel));
  }
  hatOf(sel) {
    const id = sel.top || sel.id;
    const p = Save.heroProg(id);
    return p.hat && this.save.hats.includes(p.hat) ? p.hat : null;
  }
  syncMusic() {
    if (this.state === 'play' && this.world) {
      const lv = this.world.level;
      audio.playMusic(lv.boss ? 'boss' : lv.arena ? 'boss' : lv.theme);
    } else audio.playMusic('hub');
  }

  // ------------------------------------------------------------ Auswahl & Einkauf
  pickHero(id) {
    this.save.selected = id; this.save.swapper.on = false; Save.persist();
    this.audio.play('select');
  }
  useSwapper() { this.save.swapper.on = true; Save.persist(); this.audio.play('select'); this.hubKey = null; }
  buyHero(id) {
    const h = HEROES[id], s = this.save;
    if (!h || s.unlocked.includes(id) || s.gold < h.cost) return;
    s.gold -= h.cost; s.unlocked.push(id); s.selected = id; s.swapper.on = false;
    Save.persist(); this.audio.play('buy');
    this.ui.tab = 'helden';
    Save.checkAchievements();
  }
  buyUpgrade(v) {
    const s = this.save, id = this.ui.smithHero || s.selected, p = Save.heroProg(id);
    if (v === 'soul') { if (p.soul || s.soul < 1) return; s.soul--; p.soul = true; }
    else { const i = +v, u = UPGRADES[i]; if (p.ups[i] || s.gold < u.cost) return; s.gold -= u.cost; p.ups[i] = true; }
    Save.persist(); this.audio.play('buy');
    for (const a of Save.checkAchievements()) this.hud.toast('Erfolg: ' + a.name, 'gold');
  }
  buyHat(id) {
    const h = HATS[id], s = this.save;
    if (!h || !h.shop || s.hats.includes(id) || s.gold < h.shop) return;
    s.gold -= h.shop; s.hats.push(id); Save.persist(); this.audio.play('buy');
  }
  canDifficulty(id) { return id !== 'albtraum' || this.save.bosses.includes('zerrax'); }
  changeDifficulty(d) {
    const avail = DIFF_IDS.filter((x) => this.canDifficulty(x));
    let i = avail.indexOf(this.save.difficulty);
    if (i < 0) i = 1;
    i = (i + d + avail.length) % avail.length;
    this.save.difficulty = avail[i]; Save.persist();
  }
  toggleP2() { this.p2on = !this.p2on; }

  // ------------------------------------------------------------ Level starten
  buildHeroes() {
    const s = this.save;
    const sel = selectedSel();
    const heroes = [];
    const res = resolveHero(sel);
    heroes.push({ hero: res, stats: heroStats(res) });
    return heroes;
  }
  startLevel(id) {
    const level = getLevel(id);
    this.levelId = id; this.mode = 'level';
    this.launch(level);
  }
  startArena() {
    const level = getLevel('arena');
    this.levelId = 'arena'; this.mode = 'arena';
    this.launch(level);
  }
  launch(level) {
    audio.init();
    const s = this.save;
    const heroes = this.buildHeroes();
    const own2 = s.unlocked.concat(s.captured);
    if (s.p2hero && own2.includes(s.p2hero)) { const h2 = this.p2Hero(heroes[0]); if (h2) { heroes.push(h2); this.input.p2Active = true; } } else this.input.p2Active = false;
    const owned = new Set([...s.treasures, ...s.found, ...s.hats.map((h) => 'hat:' + h)]);
    const hooks = {
      gold: (n) => { s.gold += n; s.stats.goldTotal += n; },
      xp: (p, amt) => this.gainXp(p, amt),
      elName: (el) => ELEMENTS[el].name,
    };
    const world = new World({ level, diff: s.difficulty, heroes, owned, crystals: s.crystals, captured: s.captured, bossesDone: s.bosses, hooks });
    this.world = world;
    this.startedAt = performance.now();
    if (heroes[0].hero.swapper) s.stats.swapperPlays++;
    this.view.hatFor = (p) => this.hatOf({ id: p.hero.top });
    this.view.loadWorld(world);
    this.ui.clear();
    this.hud.show(true);
    this.hud.build(world, s.settings.keys);
    if (this.touch) this.touch.show(true);
    this.state = 'play';
    this.syncMusic();
    this.eventsPending = 0;
    if (level.arena) this.hud.banner('Arena der Elemente', 'Bereit?', '#ffd84a');
    else {
      const wd = WORLDS.find((w) => w.id === level.world);
      this.hud.banner(wd ? `Welt ${wd.id} · ${wd.name}` : '', level.name, wd ? wd.color : '#ffd84a');
    }
    this.input.pressed.clear();
  }
  p2Hero(first) {
    const s = this.save;
    const own = s.unlocked.concat(s.captured);
    let id = s.p2hero && own.includes(s.p2hero) ? s.p2hero : own.find((o) => o !== first.hero.top) || own[0];
    const res = resolveHero({ id });
    return { hero: res, stats: heroStats(res) };
  }
  joinP2() {
    const w = this.world;
    if (!w || w.players.length > 1) return;
    const h = this.p2Hero({ hero: w.players[0].hero });
    const p = w.addPlayer(1, h);
    const p1 = w.players[0];
    p.x = p1.x + 1.4; p.y = p1.y + 0.1; p.z = p1.z; p.safe = { x: p.x, y: p.y, z: p.z };
    this.input.p2Active = true;
    this.hud.build(w, this.save.settings.keys);
    this.hud.toast('Spieler 2 ist dabei!', 'gold');
  }
  gainXp(p, amt) {
    let lv = 0;
    for (const id of p.hero.progIds) lv = Math.max(lv, Save.addXp(id, amt));
    if (lv > 0) {
      const old = p.maxHp;
      p.stats = heroStats(p.hero);
      p.maxHp = p.stats.hp; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5 + (p.maxHp - old));
      this.world.ev('levelup', { x: p.x, y: p.y, z: p.z });
      this.world.ev('sfx', { n: 'levelup', x: p.x, z: p.z });
      this.hud.toast(p.hero.name + ' erreicht Stufe ' + p.stats.lvl + '!', 'gold big');
    }
  }

  // ------------------------------------------------------------ Pause, Neustart, Beenden
  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.ui.pause();
  }
  resume() {
    if (this.state !== 'paused') return;
    this.ui.clear(); this.state = 'play'; this.last = performance.now(); this.input.pressed.clear();
  }
  restartLevel() {
    this.ui.clear();
    if (this.levelId === 'arena') this.startArena(); else this.startLevel(this.levelId);
  }
  replay() { this.restartLevel(); }
  quitToHub() {
    Save.persist();
    this.leaveWorld();
    this.ui.tab = this.mode === 'arena' ? 'arena' : 'welten';
    this.showHubScene(); this.view.hubFocusX = 0;
    this.ui.hub(); this.syncMusic();
  }
  leaveWorld() {
    this.world = null;
    this.view.clearWorld();
    this.hud.show(false);
    if (this.touch) this.touch.show(false);
    this.hubKey = null;
  }
  afterResults() {
    this.leaveWorld();
    this.ui.tab = this.mode === 'arena' ? 'arena' : 'welten';
    this.showHubScene();
    this.ui.hub(); this.syncMusic();
  }

  // ------------------------------------------------------------ Ergebnis
  finishLevel(win) {
    const w = this.world, s = this.save, lv = w.level;
    const st = w.stats;
    const rows = [], unlocks = [];
    let stars = [false, false, false], challenges = [], title = lv.name;
    s.stats.playtime += st.time;
    s.stats.kills += st.kills;
    s.stats.deaths += st.downs;
    s.crystals = w.crystals;
    for (const v of st.captured) { if (!s.captured.includes(v)) { s.captured.push(v); s.stats.captures++; unlocks.push('Schurke gefangen: ' + ALL_CHARS[v].name + ' ist jetzt spielbar!'); } }
    // Funde
    for (const id of st.souls) { s.soul++; if (id && id !== 'soul') s.found.push(id); }
    for (const h of st.hats) if (!s.hats.includes(h)) { s.hats.push(h); unlocks.push('Neuer Hut: ' + HATS[h].name); }
    if (st.treasure && st.treasureId && !s.treasures.includes(st.treasureId)) {
      s.treasures.push(st.treasureId);
      const t = TREASURES[st.treasureId];
      s.gold += t.gold; s.stats.goldTotal += t.gold; st.gold += t.gold;
      unlocks.push('Schatz: ' + t.name + ' (+' + t.gold + ' Gold)');
    }
    if (win && lv.arena) {
      // nie: Arena endet über 'lost'
    }
    if (lv.arena) {
      const wave = st.arenaWave;
      if (wave > s.stats.arenaBest) { s.stats.arenaBest = wave; unlocks.push('Neuer Arena-Rekord: Welle ' + wave); }
      rows.push(['Erreichte Welle', wave], ['Gegner besiegt', st.kills], ['Gold', st.gold], ['Zeit', fmtTime(st.time)]);
      title = 'Arena der Elemente';
    } else if (win) {
      s.stats.levels++;
      if (s.difficulty === 'schwer' || s.difficulty === 'albtraum') s.stats.hardWins++;
      const doneKills = st.totalEnemies > 0 && st.countedDown >= st.totalEnemies;
      const chk = { clear: true, kills: doneKills, treasure: st.treasure || (lv.treasure && s.treasures.includes(lv.treasure) && false), nodown: st.downs === 0, speed: st.time <= lv.par };
      const rec = s.levels[lv.id] || (s.levels[lv.id] = { stars: [false, false, false], best: 0 });
      lv.challenges.forEach((c, i) => {
        const done = !!chk[c];
        const isNew = done && !rec.stars[i];
        if (done) rec.stars[i] = true;
        challenges.push({ done, isNew, text: ({ clear: 'Level abschließen', kills: 'Alle Gegner besiegen', treasure: 'Den Schatz finden', nodown: 'Ohne Erschöpfung gewinnen', speed: 'Unter ' + fmtTime(lv.par) }[c]) });
      });
      stars = rec.stars.slice(0, 3);
      if (!rec.best || st.time < rec.best) rec.best = Math.round(st.time);
      rows.push(['Gold', st.gold], ['Gegner besiegt', st.kills + (st.totalEnemies ? ` (${st.countedDown}/${st.totalEnemies})` : '')], ['Zeit', fmtTime(st.time)], ['Schwierigkeit', DIFFICULTIES[s.difficulty].name]);
      if (lv.boss && !s.bosses.includes(lv.boss)) {
        s.bosses.push(lv.boss);
        const next = WORLDS.find((x) => x.need === lv.boss);
        if (next) unlocks.push('Neue Welt: ' + next.name);
        if (lv.boss === 'zerrax') unlocks.push('Schwierigkeit „Albtraum“ freigeschaltet');
        if (['moragar', 'eisenkessel', 'zerrax', 'kraal'].every((b) => s.bosses.includes(b)) && !s.hats.includes('krone')) { s.hats.push('krone'); unlocks.push('Neuer Hut: ' + HATS.krone.name); }
      }
    }
    for (const a of Save.checkAchievements()) unlocks.push('Erfolg: ' + a.name);
    Save.persist();
    this.ui.results({ win, arena: !!lv.arena, title, stars, challenges, rows, unlocks });
    this.hud.show(false);
    if (this.touch) this.touch.show(false);
    this.state = 'results';
  }

  // ------------------------------------------------------------ Hauptschleife
  handleEvents(w) {
    const ev = w.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      this.view.onEvent(e);
      switch (e.t) {
        case 'sfx': {
          const f = this.view.focus;
          if (e.x === undefined || Math.hypot(e.x - f.x, e.z - f.z) < 34) audio.play(e.n);
          break;
        }
        case 'toast': this.hud.toast(e.text, e.cls); break;
        case 'story': this.hud.story(e.who, e.text, e.villain); break;
        case 'banner': this.hud.banner(e.small, e.big, e.color); break;
        case 'bossStart': audio.playMusic('boss'); this.hud.banner(w.boss.spec.title, w.boss.spec.name, '#d88bff'); break;
        case 'capture': this.hud.banner('Schurke gefangen!', e.name, '#b05cff'); break;
        case 'bossDown': this.hud.banner('Boss besiegt!', w.boss.spec.name, '#ffd84a'); break;
        case 'phase': this.hud.toast(w.boss.spec.name + ' wird wütend!', 'bad big'); break;
        case 'bolt': this.view.flashSky(0.6); break;
      }
    }
    ev.length = 0;
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    if (dt > 0.1) dt = 0.1;
    const realDt = dt;
    if (this.state === 'play' && this.world) {
      const w = this.world;
      // Eingaben
      for (const p of w.players) {
        if (p.idx === 1 && !this.input.p2Active) this.input.p2Active = true;
        p.input = this.input.poll(p.idx, this.view, p, p.y + 0.9);
        if (p.input.pause && p.idx === 0) { this.pause(); break; }
      }
      if (this.state === 'play') {
        const n = Math.max(1, Math.ceil(dt / STEP));
        const h = dt / n;
        for (let i = 0; i < n; i++) w.step(h);
        this.handleEvents(w);
        this.hud.update(w, dt);
        this.hud.updatePrompts(w, this.view, this.save.settings.keys);
        if (w.state === 'won' && w.winT > 2.2) this.finishLevel(true);
        else if (w.state === 'lost') { w.lostT = (w.lostT || 0) + dt; if (w.lostT > 1.6) this.finishLevel(false); }
        this.autoQuality(realDt);
        this.save.stats.playtime += 0;
      }
      this.view.update(this.state === 'play' ? dt : 0, realDt);
    } else if (this.state === 'results' && this.world) {
      this.view.update(dt * 0.3, realDt);
    } else {
      this.view.update(dt, realDt);
    }
    this.input.endFrame();
  }
}
