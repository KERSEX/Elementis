// Die Spielwelt: Level, Spieler, Gegner, Geschosse, Pickups. Reine Logik ohne Grafik –
// alles, was die Darstellung wissen muss, kommt als Ereignis in w.events.
import { enemySpec, ELITES, BOSSES, ENEMIES } from '../data/enemies.js';
import { DIFFICULTIES } from '../data/items.js';
import { GRAV, moveBody, updateMovers, groundAt, boxActive } from './physics.js';
import { doAttack, dashHits, updateProjectiles, damageEnemy, damagePlayer, healPlayer, explodeAt, ringAt, spawnProj, livePlayers, nearest, killEnemy } from './combat.js';
import { updateEnemy, separateEnemies } from './ai.js';
import { clamp, dist2, rnd, pick, angDiff, mulberry32 } from '../core/util.js';
import { ALL_CHARS } from '../data/heroes.js';

const TAU = Math.PI * 2;
let nextId = 1;

export class World {
  // opts: level (Daten), diff (id), heroes: [{hero, stats}], owned (Set bereits gefundener Dinge), crystals, bossesDone
  constructor(opts) {
    this.level = opts.level;
    this.boxes = this.level.boxes;
    this.diff = DIFFICULTIES[opts.diff] || DIFFICULTIES.normal;
    this.hooks = opts.hooks || {};
    this.owned = opts.owned || new Set();
    this.crystals = opts.crystals || 0;
    this.capturedIds = new Set(opts.captured || []);
    this.bossesDone = opts.bossesDone || [];
    this.t = 0;
    this.events = [];
    this.players = []; this.enemies = []; this.allies = []; this.projs = []; this.pickups = []; this.zones = [];
    this.state = 'play';       // play | won | lost
    this.winT = 0;
    this.stats = { kills: 0, gold: 0, attacks: 0, downs: 0, time: 0, countedDown: 0, treasure: false, hats: [], souls: [], captured: [], crystalsUsed: 0, crystalsFound: 0, totalEnemies: 0, bossDown: null, falls: 0, arenaWave: 0 };
    this.cp = null; this.cpIndex = -1;
    this.boss = null;
    this.rng = mulberry32(1234);
    this.stormT = 5;
    this.arena = this.level.arena ? { wave: 0, state: 'break', t: 3, queue: [], spawnT: 0, total: 0 } : null;
    this.storySeen = new Set();
    this.lastAbility = null;

    updateMovers(this.boxes, 0);
    for (const e of this.level.enemies) {
      this.spawnEnemy(e.type, e.x, e.y, e.z, { counted: true });
    }
    for (const pk of this.level.pickups) {
      if (pk.id && this.owned.has(pk.id)) continue;
      if (pk.kind === 'hat' && this.owned.has('hat:' + pk.id)) continue;
      this.addPickup(Object.assign({}, pk));
    }
    for (const z of this.level.zones) this.zones.push(Object.assign({}, z));
    opts.heroes.forEach((h, i) => this.addPlayer(i, h));
    this.spawnAllPlayers();
  }

  ev(t, d) { d.t = t; this.events.push(d); }

  // ---------------------------------------------------------------- Spieler
  addPlayer(idx, h) {
    const s = h.stats;
    const p = {
      kind: 'player', id: 'p' + idx, idx, hero: h.hero, stats: s, prog: h.prog || null,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, r: 0.45, h: 1.4, face: Math.PI, grounded: false, groundBox: null,
      hp: s.hp, maxHp: s.hp, cd: { a1: 0, a2: 0, sp: 0 }, cdMax: { a1: 1, a2: 1, sp: 1 },
      inv: 0, hurt: 0, dashInv: 0, down: 0, coyote: 0, jumpBuf: 0, airJumps: 0, jumpHeld: false,
      buff: { dmg: 0, spd: 0, atkSpd: 0, shield: 0, guard: 0 }, buffDmg: 1, buffSpd: 1, buffAtkSpd: 1, shieldReduce: 0,
      critChance: 0.08 + (h.hero.el === 'magie' || h.hero.swapper && h.hero.els.includes('magie') ? 0.15 : 0),
      dash: null, leap: null, anim: null, swing: 0, aimHold: 0, aimDist: 4,
      xpGain: 0, stats_: { dealt: 0, taken: 0 }, safe: null, safeT: 0, input: null, moving: false, walkT: 0,
    };
    this.players.push(p);
    return p;
  }
  spawnAllPlayers() {
    const sp = this.level.spawn;
    this.players.forEach((p, i) => {
      p.x = sp[0] + (i % 2 ? 1.3 : -1.3) * (i ? 1 : 0); p.y = sp[1]; p.z = sp[2] + 1 * (i ? 1 : 0);
      if (this.level.arena) { p.x = (i ? 1.5 : -1.5) * (this.players.length > 1 ? 1 : 0); p.z = 0; p.y = 0; }
      p.safe = { x: p.x, y: p.y, z: p.z };
    });
  }
  respawnPoint() { return this.cp || { x: this.level.spawn[0], y: this.level.spawn[1], z: this.level.spawn[2] }; }

  playerDown(p) {
    p.hp = 0; p.down = this.arena ? 9999 : this.diff.wait;
    p.dash = null; p.leap = null;
    this.stats.downs++;
    this.ev('down', { idx: p.idx, x: p.x, y: p.y, z: p.z });
    this.ev('sfx', { n: 'down', x: p.x, z: p.z });
    this.ev('toast', { text: p.hero.name + ' ist erschöpft!', cls: 'bad' });
    if (this.arena && this.players.every((q) => q.down > 0)) { this.state = 'lost'; this.ev('lost', {}); }
  }
  reviveAt(p, pt) {
    p.down = 0; p.hp = p.maxHp; p.inv = 2; p.x = pt.x; p.y = pt.y + 0.05; p.z = pt.z; p.vx = p.vy = p.vz = 0; p.kx = p.kz = 0;
    p.safe = { x: pt.x, y: pt.y, z: pt.z };
    this.ev('revive', { idx: p.idx, x: p.x, y: p.y, z: p.z });
  }

  updatePlayer(p, dt) {
    const inp = p.input || {};
    const s = p.stats;
    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0) {
        const mate = this.players.find((q) => q !== p && q.down <= 0);
        this.reviveAt(p, mate ? { x: mate.x + 1, y: mate.y, z: mate.z } : this.respawnPoint());
      }
      return;
    }
    for (const k of ['a1', 'a2', 'sp']) if (p.cd[k] > 0) p.cd[k] -= dt;
    for (const k in p.buff) if (p.buff[k] > 0) p.buff[k] -= dt;
    if (p.inv > 0) p.inv -= dt;
    if (p.dashInv > 0) p.dashInv -= dt;
    if (p.hurt > 0) p.hurt -= dt;
    if (p.swing > 0) p.swing -= dt;
    if (p.aimHold > 0) p.aimHold -= dt;

    // Zielrichtung
    let ax = inp.ax || 0, az = inp.az || 0;
    p.aimDist = inp.aimDist || 4;
    const attacking = inp.a1 || inp.a2 || inp.sp;
    if (attacking && inp.aimMode === 'none') {
      // Zielhilfe: nächster Gegner im Blickkegel
      let fx = Math.sin(p.face), fz = Math.cos(p.face);
      if (Math.hypot(inp.mx || 0, inp.mz || 0) > 0.3) { fx = inp.mx; fz = inp.mz; const l = Math.hypot(fx, fz); fx /= l; fz /= l; }
      let best = null, bs = -1;
      for (const e of this.enemies) {
        if (e.dead || e.hidden) continue;
        const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
        if (d > 12 || d < 0.01) continue;
        const dot = (dx * fx + dz * fz) / d;
        if (dot < 0.5) continue;
        const sc = dot * 2 - d / 12;
        if (sc > bs) { bs = sc; best = e; }
      }
      if (best) { const dx = best.x - p.x, dz = best.z - p.z, d = Math.hypot(dx, dz); ax = dx / d; az = dz / d; p.aimDist = d; }
      else { ax = fx; az = fz; }
    }
    if (attacking && (ax || az)) { p.aimHold = 0.4; p.aimFace = Math.atan2(ax, az); }

    // Bewegung
    let mx = inp.mx || 0, mz = inp.mz || 0;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    let spd = s.spd * (p.buff.spd > 0 ? p.buffSpd : 1);
    if (p.dash) {
      const d = p.dash;
      d.t -= dt;
      p.vx = d.dx * d.speed; p.vz = d.dz * d.speed; if (p.grounded) p.vy = 0;
      dashHits(this, p);
      p.face = Math.atan2(d.dx, d.dz);
      if (d.t <= 0 || p.hitWall) p.dash = null;
      this.ev('trail', { x: p.x, y: p.y + 0.7, z: p.z, el: p.hero.el });
    } else if (p.leap) {
      p.vx = p.leap.vx; p.vz = p.leap.vz;
    } else {
      const accel = p.grounded ? 60 : 32;
      const tvx = mx * spd, tvz = mz * spd;
      const dvx = tvx - p.vx, dvz = tvz - p.vz;
      const dl = Math.hypot(dvx, dvz);
      const maxD = accel * dt;
      if (dl <= maxD) { p.vx = tvx; p.vz = tvz; } else { p.vx += (dvx / dl) * maxD; p.vz += (dvz / dl) * maxD; }
      if (p.grounded && ml < 0.05) { /* Bremsen kommt von der Beschleunigung */ }
    }
    p.moving = ml > 0.1 && p.grounded;
    if (p.moving) p.walkT += dt * spd * 1.6;

    // Springen
    if (p.grounded) { p.coyote = 0.12; p.airJumps = p.hero.moves && p.hero.moves.airJumps || 0; }
    else p.coyote -= dt;
    if (inp.jumpEdge) p.jumpBuf = 0.13; else p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && !p.dash && !p.leap) {
      if (p.coyote > 0) {
        p.vy = 10.2 * s.jump; p.grounded = false; p.coyote = 0; p.jumpBuf = 0; p.groundBox = null;
        this.ev('sfx', { n: 'jump', x: p.x, z: p.z }); this.ev('dust', { x: p.x, y: p.y, z: p.z });
      } else if (p.airJumps > 0) {
        p.airJumps--; p.vy = 9.4 * s.jump; p.jumpBuf = 0;
        this.ev('sfx', { n: 'jump2', x: p.x, z: p.z }); this.ev('ring', { x: p.x, y: p.y + 0.05, z: p.z, r: 1.2, el: p.hero.el, dur: 0.3, small: true });
      }
    }
    // kürzerer Sprung beim Loslassen
    if (!inp.jumpHeld && p.vy > 4 && !p.dash && !p.leap) p.vy -= 40 * dt;
    let gravMul = 1;
    if (p.hero.moves && p.hero.moves.glide && inp.jumpHeld && p.vy < -2.4 && !p.grounded) { p.vy = -2.4; p.gliding = true; } else p.gliding = false;
    if (p.dash) gravMul = 0.3;
    p.vy -= GRAV * gravMul * dt;
    if (p.vy < -30) p.vy = -30;

    // Rückstoß
    const bvx = p.vx, bvz = p.vz;
    p.vx = bvx + p.kx; p.vz = bvz + p.kz;
    const kd = Math.max(0, 1 - 12 * dt); p.kx *= kd; p.kz *= kd;
    const wasG = p.grounded;
    moveBody(this.boxes, p, dt);
    p.vx = bvx; p.vz = bvz;
    if (!wasG && p.grounded) {
      this.ev('dust', { x: p.x, y: p.y, z: p.z }); this.ev('sfx', { n: 'land', x: p.x, z: p.z });
      if (p.leap) {
        explodeAt(this, p.x, p.y, p.z, p.leap.radius, p.leap.dmg, p, p.leap.el, p.leap.crit, 8);
        this.ev('shake', { v: 0.3 }); p.leap = null;
      }
    }
    if (p.leap && p.grounded && p.leap.t > 0.2) p.leap = null;
    if (p.leap) p.leap.t += dt;

    // Blickrichtung
    if (p.dash) { /* gesetzt */ }
    else if (p.aimHold > 0 && p.aimFace !== undefined) p.face += angDiff(p.face, p.aimFace) * clamp(18 * dt, 0, 1);
    else if (ml > 0.1) p.face += angDiff(p.face, Math.atan2(mx, mz)) * clamp(14 * dt, 0, 1);

    // Angriffe
    if (!p.dash && !p.leap) {
      if (inp.a1 && p.cd.a1 <= 0) { this.faceAim(p, ax, az); doAttack(this, p, 'a1'); }
      else if (inp.a2 && p.cd.a2 <= 0) { this.faceAim(p, ax, az); doAttack(this, p, 'a2'); }
      else if (inp.sp && p.cd.sp <= 0) { this.faceAim(p, ax, az); doAttack(this, p, 'sp'); }
    }
    // Benutzen
    if (inp.useEdge) this.useAction(p);

    // sicherer Punkt (nicht auf bröckelnden/bewegten Platten, nicht am Rand)
    if (p.grounded && p.groundBox && !p.groundBox.mover && !p.groundBox.crumble && !p.groundBox.prop) {
      p.safeT -= dt;
      const b = p.groundBox;
      if (p.safeT <= 0 && p.x > b.x0 + 1 && p.x < b.x1 - 1 && p.z > b.z0 + 1 && p.z < b.z1 - 1) { p.safe = { x: p.x, y: p.y, z: p.z }; p.safeT = 0.3; }
    }
    // Absturz
    if (p.y < this.level.killY) this.fall(p);
    if (p.groundBox && p.groundBox.crumble && p.groundBox.crumble.t < 0) p.groundBox.crumble.t = p.groundBox.crumble.delay;
  }
  faceAim(p, ax, az) { if (ax || az) { p.face = Math.atan2(ax, az); } }

  fall(p) {
    this.stats.falls++;
    this.ev('splash', { x: p.x, y: this.level.seaY, z: p.z });
    this.ev('sfx', { n: 'splash', x: p.x, z: p.z });
    const dmg = Math.round(p.maxHp * 0.18);
    p.hp -= dmg; p.hurt = 0.3;
    this.ev('dmg', { x: p.x, y: p.y + 2, z: p.z, v: dmg, cls: 'hurt' });
    if (p.hp <= 0) { p.hp = 0; this.playerDown(p); p.x = p.safe.x; p.y = p.safe.y; p.z = p.safe.z; return; }
    const pt = p.safe || this.respawnPoint();
    p.x = pt.x; p.y = pt.y + 0.05; p.z = pt.z; p.vx = p.vy = p.vz = 0; p.kx = p.kz = 0; p.inv = 1.6; p.dash = null; p.leap = null;
    this.ev('shake', { v: 0.2 });
  }

  useAction(p) {
    // Tor öffnen
    let near = null, nd = 3.2 * 3.2;
    for (const g of this.level.gates) {
      if (g.gate.open) continue;
      const cx = (g.x0 + g.x1) / 2, cz = (g.z0 + g.z1) / 2;
      const d = dist2(cx, cz, p.x, p.z);
      if (d < nd) { nd = d; near = g; }
    }
    if (!near) return;
    if (p.hero.els.includes(near.gate.el)) {
      near.gate.open = true;
      this.ev('gateOpen', { id: near.gate.id, el: near.gate.el, x: (near.x0 + near.x1) / 2, y: near.y0 + 1.5, z: (near.z0 + near.z1) / 2 });
      this.ev('sfx', { n: 'gate', x: p.x, z: p.z });
      this.ev('toast', { text: 'Das Tor öffnet sich!', cls: 'gold' });
    } else {
      this.ev('toast', { text: 'Dieses Tor braucht einen Helden mit dem Element ' + (this.hooks.elName ? this.hooks.elName(near.gate.el) : near.gate.el) + '.', cls: 'bad' });
      this.ev('sfx', { n: 'nope', x: p.x, z: p.z });
    }
  }
  nearestGate(p) {
    let near = null, nd = 3.2 * 3.2;
    for (const g of this.level.gates) {
      if (g.gate.open) continue;
      const d = dist2((g.x0 + g.x1) / 2, (g.z0 + g.z1) / 2, p.x, p.z);
      if (d < nd) { nd = d; near = g; }
    }
    return near;
  }

  // ---------------------------------------------------------------- Gegner
  spawnEnemy(type, x, y, z, extra = {}) {
    const sp = enemySpec(type);
    if (!sp) return null;
    const np = this.players.length || 1;
    const hpMul = this.diff.hp * (1 + 0.5 * (np - 1));
    const e = {
      kind: 'enemy', id: nextId++, type, spec: sp, x, y, z, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, mx: 0, mz: 0,
      r: sp.r, h: sp.h, hp: Math.round(sp.hp * hpMul), maxHp: Math.round(sp.hp * hpMul), face: rnd(0, TAU), home: { x, y, z },
      state: 'idle', t: 0, cd: rnd(0.5, 1.5), st: {}, flash: 0, inv: 0, dead: false, grounded: false, groundBox: null,
      boss: sp.ai === 'boss', elite: sp.ai === 'elite', flying: sp.ai === 'flyer', fixed: sp.ai === 'turret', heavy: sp.ai === 'tank' || sp.ai === 'elite',
      aggro: sp.aggro || 13, awake: !!extra.awake, split: sp.split || 0, phase: 0, cast: null, summoned: !!extra.summoned,
      noReward: false, counted: !!extra.counted, lastAbility: null, orbitDir: Math.random() < 0.5 ? 1 : -1,
    };
    if (e.flying) e.y = y + sp.hover;
    if (e.boss) { e.aggro = 60; this.boss = e; }
    if (extra.counted && !e.summoned && !e.boss) this.stats.totalEnemies++;
    this.enemies.push(e);
    return e;
  }
  respawnEnemy(e) { e.x = e.home.x; e.y = e.home.y; e.z = e.home.z; e.vy = 0; e.kx = e.kz = 0; e.dead = false; }

  burnTick(e, burn) {
    const d = Math.max(1, Math.round(burn.dps * 0.5));
    e.hp -= d; e.flash = 0.08;
    this.ev('dmg', { x: e.x, y: e.y + e.h + 0.2, z: e.z, v: d, cls: 'burn' });
    if (e.hp <= 0) killEnemy(this, e, burn.src);
  }

  bossPhase(e, idx) {
    e.phase = idx;
    e.inv = 1.4;
    e.cast = null; e.hidden = false;
    this.ev('phase', { id: e.id, n: idx + 1, x: e.x, y: e.y, z: e.z });
    this.ev('ring', { x: e.x, y: e.y + 0.1, z: e.z, r: 7, el: e.spec.el, dur: 0.7, big: true });
    this.ev('shake', { v: 0.4 });
    this.ev('sfx', { n: 'roar', x: e.x, z: e.z });
    const line = e.spec.lines && e.spec.lines[idx];
    if (line) this.ev('story', { who: e.spec.name, text: line, villain: true });
    for (let i = 0; i < 2; i++) {
      const a = rnd(0, TAU);
      const x = e.x + Math.cos(a) * 9, z = e.z + Math.sin(a) * 9;
      const g = groundAt(this.boxes, x, z, e.y + 1);
      if (Number.isFinite(g)) this.addPickup({ kind: 'heart', x, y: g, z, drop: true });
    }
  }
  onBossWake(e) {
    const line = e.spec.lines && e.spec.lines[0];
    if (line) this.ev('story', { who: e.spec.name, text: line, villain: true });
    this.ev('bossStart', { id: e.id });
  }
  onBossDown(e) {
    this.stats.bossDown = e.type;
    this.ev('bossDown', { id: e.id, x: e.x, y: e.y, z: e.z });
    this.ev('shake', { v: 0.6 });
    this.ev('story', { who: 'Wolkenwächter', text: e.spec.name + ' ist besiegt! Das Portal ist offen.' });
    const sp = e.spec;
    const first = !this.bossesDone.includes(e.type);
    if (sp.treasure && !this.owned.has(sp.treasure)) this.addPickup({ kind: 'treasure', id: sp.treasure, x: e.x + 2, y: e.y, z: e.z, drop: true });
    if (first) this.addPickup({ kind: 'soul', id: 'soul_boss_' + e.type, x: e.x - 2, y: e.y, z: e.z, drop: true });
    for (const q of this.enemies) if (!q.dead && q.summoned) { q.dead = true; this.ev('death', { x: q.x, y: q.y, z: q.z, id: q.id, silent: true }); }
    this.zones = this.zones.filter((z) => z.kind !== 'tele' && z.kind !== 'beam' && z.kind !== 'line');
    this.projs.length = 0;
    this.bossDead = true;
  }
  onEliteDown(e) {
    const v = e.spec.villain;
    if (!v) return;
    if (this.capturedIds.has(v)) return;
    if (this.crystals > 0) {
      this.crystals--; this.stats.crystalsUsed++;
      this.capturedIds.add(v); this.stats.captured.push(v);
      this.ev('capture', { id: v, name: e.spec.name, x: e.x, y: e.y, z: e.z });
      this.ev('sfx', { n: 'capture', x: e.x, z: e.z });
    } else {
      this.ev('toast', { text: e.spec.name + ' entkommt! Mit einem Fangkristall hättest du ihn gefangen.', cls: 'bad' });
    }
  }

  // ---------------------------------------------------------------- Pickups
  addPickup(pk) {
    pk.pid = nextId++; pk.t = 0; pk.taken = false;
    if (pk.kind === 'coin' && !pk.val) pk.val = 1;
    if (pk.kind === 'coin5' && !pk.val) pk.val = 5;
    this.pickups.push(pk);
    return pk;
  }
  addAlly(p, kit) {
    // pro Spieler nur ein Helfer
    this.allies = this.allies.filter((a) => a.owner !== p);
    const d = Math.sin(p.face), dz = Math.cos(p.face);
    this.allies.push({
      kind: 'ally', id: 'a' + nextId++, unit: kit.unit, owner: p, x: p.x + d * 1.6, y: p.y, z: p.z + dz * 1.6, vx: 0, vy: 0, vz: 0, r: 0.4, h: 0.9, kx: 0, kz: 0,
      life: kit.dur, dmg: kit.dmg * p.stats.dmg * (p.buff.dmg > 0 ? p.buffDmg : 1), rate: kit.rate, cd: 0.3, el: p.hero.el, face: p.face, born: 0,
    });
  }
  updateAllies(dt) {
    for (const a of this.allies) {
      a.life -= dt; a.born += dt;
      if (a.life <= 0) { a.dead = true; this.ev('puff', { x: a.x, y: a.y + 0.5, z: a.z, el: a.el }); continue; }
      a.cd -= dt;
      const tgt = nearest(this.enemies.filter((e) => !e.dead && !e.hidden), a.x, a.z, a.unit === 'turret' ? 13 : 9);
      if (a.unit === 'minion') {
        const o = a.owner;
        let gx = o.x, gz = o.z, stop = 3;
        if (tgt) { gx = tgt.x; gz = tgt.z; stop = 1.3; }
        const dx = gx - a.x, dz = gz - a.z, d = Math.hypot(dx, dz);
        if (d > stop) { a.vx = (dx / d) * 5.5; a.vz = (dz / d) * 5.5; } else { a.vx = a.vz = 0; }
        if (d > 18) { a.x = o.x; a.z = o.z; a.y = o.y; }
        a.vy -= GRAV * dt;
        moveBody(this.boxes, a, dt);
        if (a.grounded && a.vy < 0) a.vy = 0;
        if (tgt) a.face = Math.atan2(tgt.x - a.x, tgt.z - a.z);
        else if (d > 0.5) a.face = Math.atan2(dx, dz);
        if (tgt && a.cd <= 0 && dist2(a.x, a.z, tgt.x, tgt.z) < (1.6 + tgt.r) ** 2) {
          a.cd = a.rate; damageEnemy(this, tgt, a.dmg, a.owner, { el: a.el, knock: 2, kx: Math.sin(a.face), kz: Math.cos(a.face) });
          this.ev('swing', { x: a.x, y: a.y + 0.3, z: a.z, face: a.face, range: 1.6, arc: 120, el: a.el });
        }
      } else if (tgt) {
        a.face = Math.atan2(tgt.x - a.x, tgt.z - a.z);
        if (a.cd <= 0) {
          a.cd = a.rate;
          const dx = tgt.x - a.x, dz = tgt.z - a.z, d = Math.hypot(dx, dz) || 1;
          spawnProj(this, { owner: 'a', src: a.owner, x: a.x, y: a.y + 0.8, z: a.z, vx: (dx / d) * 18, vz: (dz / d) * 18, r: 0.25, dmg: a.dmg, el: a.el, life: 1.0, knock: 1 });
          this.ev('sfx', { n: 'shoot_' + a.el, x: a.x, z: a.z });
        }
      }
    }
    this.allies = this.allies.filter((a) => !a.dead);
  }

  collect(p, pk) {
    pk.taken = true;
    const gain = (n) => { this.stats.gold += n; if (this.hooks.gold) this.hooks.gold(n); };
    switch (pk.kind) {
      case 'coin': case 'coin5': case 'gem': {
        const v = Math.max(1, Math.round((pk.val || 1) * (pk.drop ? 1 : this.diff.gold)));
        gain(v); this.ev('sfx', { n: pk.kind === 'coin' ? 'coin' : 'coin5', x: p.x, z: p.z });
        this.ev('dmg', { x: pk.x, y: pk.y + 1.1, z: pk.z, v: '+' + v, cls: 'gold' });
        break;
      }
      case 'heart':
        healPlayer(this, p, p.maxHp * 0.3); this.ev('sfx', { n: 'heal', x: p.x, z: p.z });
        break;
      case 'crystal':
        this.crystals++; this.stats.crystalsFound++;
        this.ev('toast', { text: 'Fangkristall gefunden!', cls: 'gold' }); this.ev('sfx', { n: 'item', x: p.x, z: p.z });
        break;
      case 'soul':
        this.stats.souls.push(pk.id || 'soul'); if (pk.id) this.owned.add(pk.id);
        this.ev('toast', { text: 'Seelenstein gefunden! Damit stärkst du einen Helden in der Schmiede.', cls: 'gold big' }); this.ev('sfx', { n: 'item', x: p.x, z: p.z });
        break;
      case 'hat':
        this.stats.hats.push(pk.id); this.owned.add('hat:' + pk.id);
        this.ev('toast', { text: 'Neuer Hut gefunden!', cls: 'gold big' }); this.ev('sfx', { n: 'item', x: p.x, z: p.z });
        break;
      case 'treasure':
        this.stats.treasure = true; this.stats.treasureId = pk.id; this.owned.add(pk.id);
        this.ev('toast', { text: 'Schatz gefunden!', cls: 'gold big' }); this.ev('sfx', { n: 'item', x: p.x, z: p.z });
        break;
    }
    this.ev('pickup', { kind: pk.kind, x: pk.x, y: pk.y, z: pk.z, id: pk.id });
  }
  updatePickups(dt) {
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      pk.t += dt;
      let best = null, bd = Infinity;
      for (const p of this.players) {
        if (p.down > 0) continue;
        const d = dist2(p.x, p.z, pk.x, pk.z);
        if (d < bd && Math.abs(p.y + 0.7 - pk.y - 0.6) < 2.2) { bd = d; best = p; }
      }
      if (!best) continue;
      const isCoin = pk.kind === 'coin' || pk.kind === 'coin5';
      const magnet = isCoin ? 3.4 : 0;
      if (isCoin && bd < magnet * magnet && pk.t > 0.35) {
        const d = Math.sqrt(bd) || 1, sp = 10 * dt;
        pk.x += ((best.x - pk.x) / d) * Math.min(d, sp); pk.z += ((best.z - pk.z) / d) * Math.min(d, sp);
        pk.y += (best.y + 0.4 - pk.y) * Math.min(1, dt * 6);
      }
      const rad = isCoin ? 1.0 : 1.3;
      if (bd < rad * rad) {
        if (pk.kind === 'heart' && best.hp >= best.maxHp - 1) continue;
        this.collect(best, pk);
      }
    }
    this.pickups = this.pickups.filter((p) => !p.taken);
  }

  // ---------------------------------------------------------------- Zonen
  updateZones(dt) {
    for (const z of this.zones) {
      switch (z.kind) {
        case 'tele':
          z.t -= dt;
          if (z.t <= 0) {
            z.done = true;
            ringAt(this, z.x, z.y, z.z, z.r, z.dmg, z.srcE, { hgt: 2.4, knock: 7 });
            if (z.lightning) this.ev('bolt', { x: z.x, y: z.y, z: z.z });
            if (z.slam) { this.ev('shake', { v: 0.3 }); this.ev('sfx', { n: 'slam', x: z.x, z: z.z }); }
            else this.ev('sfx', { n: 'boom2', x: z.x, z: z.z });
          }
          break;
        case 'mine':
          z.t -= dt;
          if (z.t <= 0) { z.done = true; explodeAt(this, z.x, z.y + 0.3, z.z, z.r, z.dmg, z.src, z.el, z.crit, 6); }
          break;
        case 'blast':
          z.t -= dt;
          if (z.t <= 0) { z.done = true; explodeAt(this, z.x, z.y + 0.3, z.z, z.r, z.dmg, z.src, z.el, z.crit, 2); }
          break;
        case 'line':
          z.t -= dt; if (z.t <= 0) z.done = true;
          break;
        case 'vent': {
          const ph = (this.t + z.phase) % z.period;
          z.active = ph < z.on; z.warn = !z.active && ph > z.period - 0.9;
          if (z.active) {
            z.tick = (z.tick || 0) - dt;
            if (z.tick <= 0) {
              z.tick = 0.45;
              for (const p of this.players) {
                if (p.down > 0 || dist2(p.x, p.z, z.x, z.z) > (z.r + p.r) ** 2 || p.y > z.y + 3) continue;
                damagePlayer(this, p, 11, null, { kx: 0, kz: 0, knock: 0, lift: 6, inv: 0.5 });
              }
            }
          }
          break;
        }
        case 'beam': {
          z.t += dt;
          if (z.t >= z.dur + z.warm) { z.done = true; break; }
          const active = z.t >= z.warm;
          const ang = z.ang + z.dir * 0.85 * Math.max(0, z.t - z.warm);
          z.cur = ang; z.active = active;
          if (active) {
            z.tick -= dt;
            const dirs = z.double ? [ang, ang + Math.PI] : [ang];
            if (z.tick <= 0) {
              z.tick = 0.25;
              for (const a of dirs) {
                const sa = Math.sin(a), ca = Math.cos(a);
                for (const p of this.players) {
                  if (p.down > 0) continue;
                  const dx = p.x - z.x, dz = p.z - z.z;
                  const along = dx * sa + dz * ca, side = Math.abs(dx * ca - dz * sa);
                  if (along > 0.5 && along < z.len && side < z.w + p.r && p.y < z.y + 1.1) damagePlayer(this, p, z.dmg, z.src, { kx: -sa * 0, kz: 0, knock: 0, inv: 0.3 });
                }
              }
            }
          }
          break;
        }
      }
    }
    this.zones = this.zones.filter((z) => !z.done);
  }

  // ---------------------------------------------------------------- Level-Logik
  updateCrumble(dt) {
    for (const b of this.boxes) {
      const c = b.crumble;
      if (!c) continue;
      if (b.off) { c.off -= dt; if (c.off <= 0) { b.off = false; c.t = -1; this.ev('crumbleBack', { box: b }); } continue; }
      if (c.t >= 0) {
        c.t -= dt;
        if (c.t <= 0) { b.off = true; c.off = c.respawn; c.t = -1; this.ev('crumble', { box: b }); this.ev('sfx', { n: 'crumble', x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2 }); }
      }
    }
  }
  updateLevel(dt) {
    const lv = this.level;
    // Checkpoints
    for (let i = 0; i < lv.checkpoints.length; i++) {
      if (i <= this.cpIndex) continue;
      const c = lv.checkpoints[i];
      for (const p of this.players) {
        if (p.down > 0) continue;
        if (dist2(p.x, p.z, c.x, c.z) < 2.6 * 2.6 && Math.abs(p.y - c.y) < 3) {
          this.cpIndex = i; this.cp = { x: c.x, y: c.y, z: c.z };
          this.ev('checkpoint', { x: c.x, y: c.y, z: c.z });
          this.ev('toast', { text: 'Checkpoint', cls: 'gold' });
          this.ev('sfx', { n: 'checkpoint', x: c.x, z: c.z });
          for (const q of this.players) if (q.down <= 0) healPlayer(this, q, q.maxHp * 0.25);
          break;
        }
      }
    }
    // Geschichte
    for (let i = 0; i < lv.story.length; i++) {
      if (this.storySeen.has(i)) continue;
      const s = lv.story[i];
      for (const p of this.players) {
        if (p.down <= 0 && dist2(p.x, p.z, s.x, s.z) < s.r * s.r) { this.storySeen.add(i); this.ev('story', { who: s.who, text: s.text, villain: !['Wolkenwächter'].includes(s.who) }); break; }
      }
    }
    // Ziel
    if (lv.goal && this.state === 'play' && (!lv.boss || this.bossDead)) {
      for (const p of this.players) {
        if (p.down > 0) continue;
        if (dist2(p.x, p.z, lv.goal[0], lv.goal[2]) < 2.0 * 2.0 && Math.abs(p.y - lv.goal[1]) < 2.5) {
          this.state = 'won'; this.winT = 0;
          this.ev('won', {}); this.ev('sfx', { n: 'win', x: p.x, z: p.z });
          for (const q of this.players) q.inv = 99;
          break;
        }
      }
    }
    // Sturm: zufällige Blitze mit Warnkreis
    if (lv.storm && !lv.boss) {
      this.stormT -= dt;
      if (this.stormT <= 0) {
        this.stormT = rnd(3.6, 6.2);
        const ps = livePlayers(this);
        if (ps.length) {
          const p = pick(ps);
          const a = rnd(0, TAU), d = rnd(0, 4);
          const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
          const g = groundAt(this.boxes, x, z, p.y + 1.5);
          if (Number.isFinite(g)) this.zones.push({ kind: 'tele', x, y: g, z, r: 1.8, t: 1.5, dur: 1.5, dmg: 14, srcE: null, el: 'tech', lightning: true });
        }
      }
    }
    if (this.arena) this.updateArena(dt);
  }
  onSolid(x, z, y) { return Number.isFinite(groundAt(this.boxes, x, z, y + 0.5, 0)) && groundAt(this.boxes, x, z, y + 0.5, 0) > y - 2; }

  // ---------------------------------------------------------------- Arena
  updateArena(dt) {
    const A = this.arena;
    const alive = this.enemies.filter((e) => !e.dead).length;
    if (A.state === 'break') {
      A.t -= dt;
      if (A.t <= 0) this.startWave();
    } else if (A.state === 'fight') {
      if (A.queue.length) {
        A.spawnT -= dt;
        if (A.spawnT <= 0 && alive < 10) {
          A.spawnT = 0.55;
          const type = A.queue.shift();
          const ps = livePlayers(this);
          let x = 0, z = 0;
          for (let i = 0; i < 12; i++) {
            const a = rnd(0, TAU), d = rnd(8, 13);
            x = Math.cos(a) * d; z = Math.sin(a) * d;
            if (!ps.some((p) => dist2(p.x, p.z, x, z) < 36)) break;
          }
          const e = this.spawnEnemy(type, x, 0, z, { awake: true });
          if (e) this.ev('puff', { x, y: 0.5, z, el: e.spec.el });
        }
      } else if (alive === 0) {
        A.state = 'break'; A.t = 5;
        this.stats.arenaWave = A.wave;
        const bonus = 15 + A.wave * 4;
        this.ev('toast', { text: 'Welle ' + A.wave + ' geschafft!  +' + bonus + ' Gold', cls: 'gold big' });
        this.ev('sfx', { n: 'win2', x: 0, z: 0 });
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; this.addPickup({ kind: 'coin5', val: Math.ceil(bonus / 8), x: Math.cos(a) * 2.5, y: 0, z: Math.sin(a) * 2.5, drop: true }); }
        this.addPickup({ kind: 'heart', x: 0, y: 0, z: 0, drop: true });
        if (A.wave === 5 && !this.owned.has('hat:propeller')) this.addPickup({ kind: 'hat', id: 'propeller', x: 0, y: 0, z: 3 });
        if ((A.wave === 10 || A.wave === 15) && !this.owned.has('soul_arena_' + A.wave)) this.addPickup({ kind: 'soul', id: 'soul_arena_' + A.wave, x: 0, y: 0, z: -3 });
        for (const p of this.players) if (p.down > 0) this.reviveAt(p, { x: 0, y: 0, z: 0 });
        else healPlayer(this, p, p.maxHp * 0.3);
      }
    }
  }
  startWave() {
    const A = this.arena;
    A.wave++; A.state = 'fight'; A.spawnT = 0;
    const n = A.wave;
    this.stats.arenaWave = Math.max(this.stats.arenaWave, n - 1);
    const pools = [['kaefer', 'spucker', 'windling', 'fels'], ['schleim', 'funkenkaefer', 'fledermaus', 'golem'], ['hund', 'schuetze', 'geist', 'ritter'], ['krabbe', 'moewe', 'qualle', 'krabbe']];
    const tiers = n < 5 ? 1 : n < 10 ? 2 : n < 15 ? 3 : 4;
    const count = Math.min(22, 3 + Math.floor(n * 1.3) + (this.players.length - 1) * 2);
    const q = [];
    for (let i = 0; i < count; i++) {
      const tier = Math.min(tiers - 1, Math.floor(Math.pow(Math.random(), 0.6) * tiers));
      let list = pools[tier];
      if (n >= 15 && Math.random() < 0.5) list = pools[3];
      q.push(pick(list));
    }
    if (n % 5 === 0) { const ids = Object.keys(ELITES); q.push(ids[Math.floor(n / 5 - 1) % ids.length]); }
    A.queue = q; A.total = q.length;
    this.ev('wave', { n });
    this.ev('banner', { small: 'Arena der Elemente', big: 'Welle ' + n, color: '#ffd84a' });
    this.ev('sfx', { n: 'wave', x: 0, z: 0 });
  }

  // ---------------------------------------------------------------- Schritt
  step(dt) {
    if (this.state === 'lost') { this.t += dt; return; }
    this.t += dt;
    if (this.state === 'play') this.stats.time += dt;
    updateMovers(this.boxes, this.t);
    this.updateCrumble(dt);
    for (const p of this.players) this.updatePlayer(p, dt);
    for (const e of this.enemies) if (!e.dead) updateEnemy(this, e, dt);
    separateEnemies(this);
    this.updateAllies(dt);
    updateProjectiles(this, dt);
    this.updateZones(dt);
    this.updatePickups(dt);
    this.updateLevel(dt);
    // Mitspieler, der zu weit weg ist, wird nachgeholt
    if (this.players.length > 1) {
      const [a, b] = this.players;
      if (a.down <= 0 && b.down <= 0) {
        const far = Math.hypot(a.x - b.x, a.z - b.z) > 24 || Math.abs(a.y - b.y) > 14;
        this.farT = far ? (this.farT || 0) + dt : 0;
        if (this.farT > 2.5) { this.farT = 0; const m = b.safe || a; b.x = a.x + 1.2; b.y = a.y + 0.1; b.z = a.z; b.vx = b.vy = b.vz = 0; this.ev('puff', { x: b.x, y: b.y + 0.7, z: b.z, el: b.hero.el }); }
      }
    }
    // XP vergeben
    for (const p of this.players) {
      if (p.xpGain > 0) { const g = p.xpGain; p.xpGain = 0; p.xpTotal = (p.xpTotal || 0) + g; if (this.hooks.xp) this.hooks.xp(p, g); }
    }
    // Aufräumen: besiegte Gegner verschwinden (die Darstellung spielt den Abgang über das Ereignis 'death')
    for (const e of this.enemies) if (e.dead && e.counted) this.stats.countedDown++;
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.state === 'won') this.winT += dt;
  }
}
