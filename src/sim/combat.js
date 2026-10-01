// Schaden, Status, Geschosse und die Angriffsarten der Helden.
import { ELEMENTS } from '../data/elements.js';
import { pointInBoxes, groundAt, GRAV } from './physics.js';
import { clamp, dist2, rnd } from '../core/util.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ Hilfen
export function aliveEnemies(w) { return w.enemies.filter((e) => !e.dead && !e.hidden); }
export function livePlayers(w) { return w.players.filter((p) => p.down <= 0); }
export function nearest(list, x, z, maxD = Infinity) {
  let best = null, bd = maxD * maxD;
  for (const o of list) { const d = dist2(o.x, o.z, x, z); if (d < bd) { bd = d; best = o; } }
  return best;
}
function hitsCyl(x, y, z, r, e) {
  const rr = r + e.r;
  if (dist2(x, z, e.x, e.z) > rr * rr) return false;
  return y > e.y - 0.4 && y < e.y + e.h + 0.4;
}

// ------------------------------------------------------------------ Status
export function applyStatus(w, e, el, dmg, src, strong) {
  const st = e.st;
  switch (ELEMENTS[el] && ELEMENTS[el].status) {
    case 'burn': st.burn = { t: 3, dps: Math.max(2, dmg * 0.35), src }; break;
    case 'wet': st.wet = 3.2; break;
    case 'stagger': if (strong || Math.random() < 0.22) stun(e, strong ? 0.8 : 0.5); break;
    case 'curse': st.curse = 4; break;
    case 'blind': st.blind = 3; break;
    default: break;
  }
}
export function stun(e, t) {
  if (e.boss) return;
  e.st.stun = Math.max(e.st.stun || 0, t);
}

// ------------------------------------------------------------------ Schaden
// opts: el, knock (Stärke), kx/kz (Richtung), crit, noStatus, strong, quiet, ignoreGuard
export function damageEnemy(w, e, amount, src, opts = {}) {
  if (e.dead || e.hidden || e.inv > 0) return 0;
  let dmg = amount;
  const st = e.st;
  if (st.curse > 0) dmg *= 1.25;
  if (st.wet > 0 && (opts.el === 'tech' || opts.el === 'luft')) dmg *= 1.35;
  if (e.spec.guard && !opts.ignoreGuard && opts.kx !== undefined) {
    // Frontschild: Treffer von vorn werden stark gedämpft
    const fx = Math.sin(e.face), fz = Math.cos(e.face);
    if (opts.kx * -fx + opts.kz * -fz > 0.5) { dmg *= 0.3; w.ev('spark', { x: e.x, y: e.y + e.h * 0.6, z: e.z, col: 0xcccccc }); }
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.12;
  w.ev('dmg', { x: e.x, y: e.y + e.h + 0.3, z: e.z, v: dmg, cls: opts.crit ? 'crit' : '' });
  w.ev('sfx', { n: e.boss ? 'hitBig' : 'hit', x: e.x, z: e.z });
  if (opts.el) w.ev('hitfx', { x: e.x, y: e.y + e.h * 0.55, z: e.z, el: opts.el });
  if (opts.knock && !e.boss && !e.fixed) {
    const k = opts.knock * (e.heavy ? 0.4 : 1) * (opts.el === 'luft' ? 1.5 : 1);
    e.kx += (opts.kx || 0) * k; e.kz += (opts.kz || 0) * k;
  }
  if (src && src.kind === 'player') {
    src.stats_.dealt += dmg;
    if (!opts.noStatus) {
      const el = opts.el || src.hero.el;
      applyStatus(w, e, el, dmg, src, opts.strong);
      if (el === 'tech' && !opts.chain) chainShock(w, e, dmg, src);
      if (el === 'leben') healPlayer(w, src, dmg * 0.1, true);
      if (el === 'untot') healPlayer(w, src, dmg * 0.08, true);
    }
  }
  if (e.hp <= 0) killEnemy(w, e, src);
  return dmg;
}

function chainShock(w, from, dmg, src) {
  const o = nearest(aliveEnemies(w).filter((e) => e !== from), from.x, from.z, 4.5);
  if (!o) return;
  w.ev('zap', { x1: from.x, y1: from.y + from.h * 0.6, z1: from.z, x2: o.x, y2: o.y + o.h * 0.6, z2: o.z });
  damageEnemy(w, o, Math.max(1, dmg * 0.5), src, { el: 'tech', chain: true, noStatus: true });
}

export function killEnemy(w, e, src) {
  if (e.dead) return;
  e.dead = true; e.hp = 0;
  const d = w.diff;
  w.ev('death', { x: e.x, y: e.y, z: e.z, id: e.id, boss: !!e.boss, big: e.spec.r > 0.8, el: e.spec.el, col: e.spec.model ? null : null });
  w.ev('sfx', { n: e.boss ? 'boom' : 'pop', x: e.x, z: e.z });
  // Spieler-Belohnung
  const killer = src && src.kind === 'player' ? src : (src && src.owner ? src.owner : null);
  w.stats.kills++;
  if (!e.summoned && !e.noReward) {
    for (const p of w.players) {
      if (p.down > 0) continue;
      const share = p === killer ? 1 : 0.6;
      p.xpGain += Math.round(e.spec.xp * share);
    }
  }
  if (e.split) {
    for (let i = 0; i < e.split; i++) {
      const a = (i / e.split) * TAU + rnd(0, 1);
      w.spawnEnemy('schleimchen', e.x + Math.cos(a) * 0.7, e.y + 0.2, e.z + Math.sin(a) * 0.7, { summoned: true });
    }
  }
  // Gold
  if ((!e.summoned || e.spec.gold > 3) && !e.noReward) {
    const g = Math.max(1, Math.round(e.spec.gold * d.gold));
    const n = Math.min(5, Math.ceil(g / 3));
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), dd = rnd(0.3, 1.2);
      w.addPickup({ kind: g >= 15 ? 'coin5' : 'coin', x: e.x + Math.cos(a) * dd, y: e.y, z: e.z + Math.sin(a) * dd, val: Math.max(1, Math.round(g / n)), drop: true });
    }
    if (Math.random() < 0.07 && !e.boss) w.addPickup({ kind: 'heart', x: e.x, y: e.y, z: e.z, drop: true });
  }
  if (e.elite) w.onEliteDown(e);
  if (e.boss) w.onBossDown(e);
  if (e.mobId !== undefined) w.mobDown(e);
}

export function damagePlayer(w, p, amount, srcE, opts = {}) {
  if (p.down > 0 || p.inv > 0 || p.dashInv > 0) return 0;
  let dmg = amount * w.diff.dmg;
  if (srcE && srcE.st && srcE.st.blind > 0) dmg *= 0.55;
  if (p.buff.shield > 0) dmg *= 1 - p.shieldReduce;
  if (p.buff.guard > 0) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg));
  p.hp -= dmg;
  p.inv = opts.inv ?? 0.7;
  p.hurt = 0.25;
  p.stats_.taken += dmg;
  w.ev('dmg', { x: p.x, y: p.y + p.h + 0.4, z: p.z, v: dmg, cls: 'hurt' });
  w.ev('sfx', { n: 'hurt', x: p.x, z: p.z });
  w.ev('shake', { v: Math.min(0.5, 0.15 + dmg / 80) });
  w.ev('hurt', { idx: p.idx });
  if (opts.kx !== undefined) { p.kx += opts.kx * (opts.knock || 5); p.kz += opts.kz * (opts.knock || 5); if (opts.lift) p.vy = Math.max(p.vy, opts.lift); }
  if (p.hp <= 0) w.playerDown(p);
  return dmg;
}

export function healPlayer(w, p, amount, quiet) {
  if (p.down > 0) return;
  const a = Math.min(p.maxHp - p.hp, amount);
  if (a <= 0.5) return;
  p.hp += a;
  if (!quiet || a >= 3) w.ev('dmg', { x: p.x, y: p.y + p.h + 0.5, z: p.z, v: '+' + Math.round(a), cls: 'heal' });
}

// ------------------------------------------------------------------ Geschosse
let pid = 1;
export function spawnProj(w, o) {
  const pr = Object.assign({
    id: pid++, owner: 'p', x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, r: 0.3, dmg: 5, el: 'magie', life: 1.2, pierce: 0,
    hits: new Set(), homing: 0, grav: 0, explode: 0, knock: 0, dead: false, wide: 0, t: 0,
  }, o);
  w.projs.push(pr);
  return pr;
}

export function updateProjectiles(w, dt) {
  for (const pr of w.projs) {
    if (pr.dead) continue;
    pr.t += dt;
    pr.life -= dt;
    if (pr.life <= 0) { projEnd(w, pr, false); continue; }
    // Lenkung
    if (pr.homing > 0 && pr.owner === 'p') {
      const tgt = nearest(aliveEnemies(w), pr.x, pr.z, 9);
      if (tgt) steer(pr, tgt.x, tgt.y + tgt.h * 0.5, tgt.z, pr.homing, dt);
    } else if (pr.homing > 0 && pr.owner === 'e') {
      const tgt = nearest(livePlayers(w), pr.x, pr.z, 14);
      if (tgt) steer(pr, tgt.x, tgt.y + 0.8, tgt.z, pr.homing, dt);
    }
    if (pr.grav) pr.vy -= pr.grav * dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
    if (pr.kind === 'wave') { waveHit(w, pr); continue; }
    // Wände und Boden
    if (pr.y < w.level.killY) { pr.dead = true; continue; }
    const hit = pointInBoxes(w.boxes, pr.x, pr.y, pr.z, true);
    if (hit) { projEnd(w, pr, true); continue; }
    // Ziele
    if (pr.owner === 'p' || pr.owner === 'a') {
      for (const e of w.enemies) {
        if (e.dead || e.hidden || pr.hits.has(e.id) || !hitsCyl(pr.x, pr.y, pr.z, pr.r, e)) continue;
        pr.hits.add(e.id);
        hitProj(w, pr, e);
        if (pr.dead) break;
        if (pr.pierce <= 0) { projEnd(w, pr, true, e); break; }
        pr.pierce--;
      }
    } else {
      for (const p of w.players) {
        if (p.down > 0 || pr.hits.has(p.id) || !hitsCyl(pr.x, pr.y, pr.z, pr.r, p)) continue;
        if (p.dashInv > 0 || p.inv > 0) { continue; }
        pr.hits.add(p.id);
        const d = Math.hypot(pr.vx, pr.vz) || 1;
        damagePlayer(w, p, pr.dmg, pr.srcE, { kx: pr.vx / d, kz: pr.vz / d, knock: 3 + pr.knock });
        if (pr.pierce <= 0) { projEnd(w, pr, true); break; }
        pr.pierce--;
      }
    }
  }
  w.projs = w.projs.filter((p) => !p.dead);
}
function steer(pr, tx, ty, tz, rate, dt) {
  const sp = Math.hypot(pr.vx, pr.vy, pr.vz) || 1;
  let dx = tx - pr.x, dy = ty - pr.y, dz = tz - pr.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  dx /= d; dy /= d; dz /= d;
  const k = clamp(rate * dt * 3, 0, 1);
  pr.vx += (dx * sp - pr.vx) * k; pr.vy += (dy * sp - pr.vy) * k; pr.vz += (dz * sp - pr.vz) * k;
  const ns = Math.hypot(pr.vx, pr.vy, pr.vz) || 1;
  pr.vx *= sp / ns; pr.vy *= sp / ns; pr.vz *= sp / ns;
}
function hitProj(w, pr, e) {
  const d = Math.hypot(pr.vx, pr.vz) || 1;
  const crit = pr.crit;
  if (pr.explode > 0) return; // Schaden kommt dann durch die Explosion
  damageEnemy(w, e, pr.dmg, pr.src, { el: pr.el, knock: pr.knock, kx: pr.vx / d, kz: pr.vz / d, crit });
}
function projEnd(w, pr, hit, target) {
  if (pr.dead) return;
  pr.dead = true;
  if (pr.explode > 0 && (pr.owner === 'p' || pr.owner === 'a')) {
    explodeAt(w, pr.x, pr.y, pr.z, pr.explode, pr.dmg, pr.src, pr.el, pr.crit, pr.knock);
  } else if (pr.explode > 0 && pr.owner === 'e') {
    ringAt(w, pr.x, pr.y, pr.z, pr.explode, pr.dmg, pr.srcE);
  }
  if (hit) w.ev('hitfx', { x: pr.x, y: pr.y, z: pr.z, el: pr.el, small: true });
}

export function explodeAt(w, x, y, z, radius, dmg, src, el, crit, knock = 4) {
  w.ev('ring', { x, y: groundAt(w.boxes, x, z, y) + 0.1, z, r: radius, el, dur: 0.35 });
  w.ev('sfx', { n: 'boom2', x, z });
  w.ev('shake', { v: 0.12 });
  for (const e of w.enemies) {
    if (e.dead || e.hidden) continue;
    const rr = radius + e.r;
    if (dist2(x, z, e.x, e.z) > rr * rr || Math.abs(e.y - y) > 3.5) continue;
    const d = Math.sqrt(dist2(x, z, e.x, e.z)) || 1;
    damageEnemy(w, e, dmg, src, { el, crit, knock, kx: (e.x - x) / d, kz: (e.z - z) / d, strong: true });
  }
}
// Explosion von Gegnern gegen Spieler
export function ringAt(w, x, y, z, radius, dmg, srcE, opts = {}) {
  w.ev('ring', { x, y: groundAt(w.boxes, x, z, y) + 0.1, z, r: radius, el: srcE && srcE.spec ? srcE.spec.el : 'dunkel', dur: 0.4 });
  for (const p of w.players) {
    if (p.down > 0) continue;
    const rr = radius + p.r;
    if (dist2(x, z, p.x, p.z) > rr * rr || Math.abs(p.y - y) > (opts.hgt ?? 2.2)) continue;
    const d = Math.sqrt(dist2(x, z, p.x, p.z)) || 1;
    damagePlayer(w, p, dmg, srcE, { kx: (p.x - x) / d, kz: (p.z - z) / d, knock: opts.knock ?? 6, lift: 4 });
  }
}

function waveHit(w, pr) {
  // Welle: breite, flache Wand; trifft nur, wer am Boden steht
  const sp = Math.hypot(pr.vx, pr.vz) || 1;
  const fx = pr.vx / sp, fz = pr.vz / sp;
  for (const p of w.players) {
    if (p.down > 0 || pr.hits.has(p.id)) continue;
    const dx = p.x - pr.x, dz = p.z - pr.z;
    const along = dx * fx + dz * fz, side = Math.abs(-dx * fz + dz * fx);
    if (Math.abs(along) < 0.9 + p.r && side < pr.wide && p.y < pr.y + 0.85) {
      pr.hits.add(p.id);
      damagePlayer(w, p, pr.dmg, pr.srcE, { kx: fx, kz: fz, knock: 7, lift: 5 });
    }
  }
  // Wellen enden am Rand der Insel
  if (pr.t > 0.3 && !w.onSolid(pr.x, pr.z, pr.y)) pr.dead = true;
}

// ------------------------------------------------------------------ Angriffe der Helden
export function dirTo(p) { return { x: Math.sin(p.face), z: Math.cos(p.face) }; }

export function doAttack(w, p, slot) {
  const kit = p.hero.kit[slot];
  if (!kit) return false;
  const s = p.stats;
  const mult = s.dmg * (p.buff.dmg > 0 ? p.buffDmg : 1);
  const crit = Math.random() < p.critChance;
  const dmg = kit.dmg ? kit.dmg * mult * (crit ? 1.75 : 1) : 0;
  const el = p.hero.el;
  const d = dirTo(p);
  const cdMul = slot === 'sp' ? s.spCd : 1 / (s.atkSpd * (p.buff.atkSpd > 0 ? p.buffAtkSpd : 1));
  p.cdMax[slot] = kit.cd * cdMul;
  p.cd[slot] = p.cdMax[slot];
  p.anim = { slot, t: 0.25, kind: kit.k };
  p.swing = 0.25;
  switch (kit.k) {
    case 'melee': {
      const range = kit.range;
      w.ev('swing', { x: p.x, y: p.y + 0.4, z: p.z, face: p.face, range, arc: kit.arc, el, big: kit.dmg > 16 });
      w.ev('sfx', { n: 'swing', x: p.x, z: p.z });
      let hitAny = false;
      const half = (kit.arc * Math.PI) / 360;
      for (const e of w.enemies) {
        if (e.dead || e.hidden) continue;
        const dx = e.x - p.x, dz = e.z - p.z, dd = Math.hypot(dx, dz);
        if (dd > range + e.r || Math.abs(e.y - p.y) > 2.4) continue;
        let da = Math.abs(Math.atan2(dx, dz) - p.face);
        if (da > Math.PI) da = TAU - da;
        if (da > half && dd > e.r + 0.6) continue;
        const nx = dx / (dd || 1), nz = dz / (dd || 1);
        damageEnemy(w, e, dmg, p, { el, knock: kit.knock || 3, kx: nx, kz: nz, crit });
        hitAny = true;
      }
      if (hitAny) { p.lunge = 0; w.ev('shake', { v: 0.06 }); }
      p.kx += d.x * 3; p.kz += d.z * 3;   // kleiner Vorsprung
      break;
    }
    case 'proj': {
      const n = kit.count || 1;
      const spread = ((kit.spread || 0) * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const a = p.face + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
        const vx = Math.sin(a) * kit.speed, vz = Math.cos(a) * kit.speed;
        spawnProj(w, {
          owner: 'p', src: p, x: p.x + Math.sin(a) * 0.7, y: p.y + 0.95, z: p.z + Math.cos(a) * 0.7, vx, vz,
          vy: kit.grav ? 4.5 : 0, r: kit.size || 0.3, dmg, el, life: kit.range / kit.speed, pierce: kit.pierce || 0,
          homing: kit.homing || 0, grav: kit.grav || 0, explode: kit.explode || 0, knock: kit.knock || 2, wide: kit.wide, crit,
        });
      }
      w.ev('sfx', { n: 'shoot_' + el, x: p.x, z: p.z });
      w.ev('muzzle', { x: p.x + d.x * 0.7, y: p.y + 0.95, z: p.z + d.z * 0.7, el });
      break;
    }
    case 'nova': {
      w.ev('ring', { x: p.x, y: p.y + 0.1, z: p.z, r: kit.radius, el, dur: 0.4, big: true });
      w.ev('sfx', { n: 'nova', x: p.x, z: p.z });
      w.ev('shake', { v: 0.18 });
      for (const e of w.enemies) {
        if (e.dead || e.hidden) continue;
        const rr = kit.radius + e.r;
        if (dist2(p.x, p.z, e.x, e.z) > rr * rr || Math.abs(e.y - p.y) > 3) continue;
        const dd = Math.sqrt(dist2(p.x, p.z, e.x, e.z)) || 1;
        damageEnemy(w, e, dmg, p, { el, knock: kit.knock || 5, kx: (e.x - p.x) / dd, kz: (e.z - p.z) / dd, crit, strong: true });
      }
      if (kit.selfHeal) healPlayer(w, p, p.maxHp * kit.selfHeal);
      if (kit.heal) for (const o of w.players) if (o.down <= 0 && dist2(o.x, o.z, p.x, p.z) < kit.radius * kit.radius) healPlayer(w, o, o.maxHp * kit.heal);
      break;
    }
    case 'dash': {
      const spd = kit.speed || 26;
      p.dash = { t: kit.dist / spd, dx: d.x, dz: d.z, speed: spd, dmg, hit: new Set(), el, crit, kit };
      p.dashInv = kit.dist / spd + 0.12;
      w.ev('sfx', { n: 'dash', x: p.x, z: p.z });
      break;
    }
    case 'heal': {
      w.ev('ring', { x: p.x, y: p.y + 0.1, z: p.z, r: kit.radius, el, dur: 0.6, heal: true });
      w.ev('sfx', { n: 'heal', x: p.x, z: p.z });
      for (const o of w.players) {
        if (o.down > 0 || dist2(o.x, o.z, p.x, p.z) > kit.radius * kit.radius) continue;
        healPlayer(w, o, o.maxHp * kit.amt);
      }
      for (const al of w.allies) if (dist2(al.x, al.z, p.x, p.z) < kit.radius * kit.radius) al.life += 3;
      break;
    }
    case 'shield': {
      p.buff.shield = kit.dur; p.shieldReduce = kit.reduce;
      if (kit.spd) { p.buff.spd = kit.dur; p.buffSpd = kit.spd; }
      w.ev('sfx', { n: 'shield', x: p.x, z: p.z });
      w.ev('ring', { x: p.x, y: p.y + 0.1, z: p.z, r: 2, el, dur: 0.4 });
      break;
    }
    case 'buff': {
      if (kit.dmg) { p.buff.dmg = kit.dur; p.buffDmg = kit.dmg; }
      if (kit.spd) { p.buff.spd = kit.dur; p.buffSpd = kit.spd; }
      if (kit.atkSpd) { p.buff.atkSpd = kit.dur; p.buffAtkSpd = kit.atkSpd; }
      w.ev('sfx', { n: 'buff', x: p.x, z: p.z });
      w.ev('ring', { x: p.x, y: p.y + 0.1, z: p.z, r: 2.4, el, dur: 0.5 });
      break;
    }
    case 'mine': {
      const dist = Math.min(5.5, p.aimDist || 4);
      const mx = p.x + d.x * Math.max(2, dist), mz = p.z + d.z * Math.max(2, dist);
      const gy = groundAt(w.boxes, mx, mz, p.y + 1);
      w.zones.push({ kind: 'mine', x: mx, y: Number.isFinite(gy) ? gy : p.y, z: mz, r: kit.radius, t: kit.delay, dmg, el, src: p, owner: 'p', crit });
      w.ev('sfx', { n: 'mine', x: p.x, z: p.z });
      break;
    }
    case 'pull': {
      w.ev('ring', { x: p.x, y: p.y + 0.1, z: p.z, r: kit.radius, el, dur: 0.5, pull: true });
      w.ev('sfx', { n: 'pull', x: p.x, z: p.z });
      for (const e of w.enemies) {
        if (e.dead || e.hidden || e.boss) continue;
        const dd = Math.sqrt(dist2(p.x, p.z, e.x, e.z));
        if (dd > kit.radius + e.r) continue;
        const nx = (p.x - e.x) / (dd || 1), nz = (p.z - e.z) / (dd || 1);
        e.kx += nx * Math.min(14, dd * 3.2); e.kz += nz * Math.min(14, dd * 3.2);
        e.st.slow = 1.5;
      }
      // Schaden nach kurzer Verzögerung am Zentrum
      w.zones.push({ kind: 'blast', x: p.x, y: p.y, z: p.z, r: Math.min(kit.radius, 3.6), t: 0.35, dmg, el, src: p, owner: 'p', crit });
      break;
    }
    case 'summon': {
      w.addAlly(p, kit);
      w.ev('sfx', { n: 'summon', x: p.x, z: p.z });
      break;
    }
    case 'leap': {
      const dd = Math.min(8, p.aimDist || 6);
      p.vy = 11; p.grounded = false; p.groundBox = null;
      p.kx = 0; p.kz = 0;
      p.leap = { dmg, radius: kit.radius, el, crit, vx: d.x * (dd / 0.75), vz: d.z * (dd / 0.75), t: 0 };
      p.dashInv = 0.6;
      w.ev('sfx', { n: 'dash', x: p.x, z: p.z });
      break;
    }
    default: return false;
  }
  w.stats.attacks++;
  return true;
}

// Dash-Schaden: berührte Gegner nehmen einmal Schaden
export function dashHits(w, p) {
  const dsh = p.dash;
  for (const e of w.enemies) {
    if (e.dead || e.hidden || dsh.hit.has(e.id)) continue;
    if (dist2(p.x, p.z, e.x, e.z) > (p.r + e.r + 0.5) ** 2 || Math.abs(e.y - p.y) > 2.2) continue;
    dsh.hit.add(e.id);
    damageEnemy(w, e, dsh.dmg, p, { el: dsh.el, knock: 6, kx: dsh.dx, kz: dsh.dz, crit: dsh.crit, strong: true });
  }
}
