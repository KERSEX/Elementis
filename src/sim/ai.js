// Gegner-Verhalten und die Fähigkeiten von Elite-Schurken und Bossen.
import { ENEMIES } from '../data/enemies.js';
import { moveBody, hasGround, groundAt, GRAV } from './physics.js';
import { damagePlayer, ringAt, spawnProj, livePlayers, nearest } from './combat.js';
import { dist2, rnd, pick, clamp, angDiff } from '../core/util.js';

const TAU = Math.PI * 2;
const AGGRO = 15;

function faceTo(e, x, z, dt, rate = 10) {
  const want = Math.atan2(x - e.x, z - e.z);
  e.face += angDiff(e.face, want) * clamp(rate * dt, 0, 1);
}
function walk(w, e, tx, tz, speed, ignoreLedge) {
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
  let mx = (dx / d) * speed, mz = (dz / d) * speed;
  if (!ignoreLedge && !e.flying) {
    const k = 0.7;
    if (!hasGround(w.boxes, e.x + (mx / (speed || 1)) * k, e.z + (mz / (speed || 1)) * k, e.y)) { mx = 0; mz = 0; }
  }
  e.mx = mx; e.mz = mz;
}
function target(w, e, range = AGGRO) {
  return nearest(livePlayers(w), e.x, e.z, range);
}
function slowFactor(e) {
  let f = 1;
  if (e.st.wet > 0) f *= 0.75;
  if (e.st.slow > 0) f *= 0.5;
  if (e.st.blind > 0) f *= 0.8;
  return f;
}
function meleeStrike(w, e, range, dmg, knock = 5) {
  for (const p of livePlayers(w)) {
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
    if (d > range + p.r + e.r * 0.4 || Math.abs(p.y - e.y) > 2) continue;
    damagePlayer(w, p, dmg, e, { kx: dx / (d || 1), kz: dz / (d || 1), knock, lift: 3.5 });
  }
  w.ev('sfx', { n: 'enemyHit', x: e.x, z: e.z });
}
function fireAt(w, e, p, speed, dmg, o = {}) {
  const ox = e.x, oy = e.y + e.h * 0.6, oz = e.z;
  let dx = p.x - ox, dy = p.y + 0.9 - oy, dz = p.z - oz;
  const d = Math.hypot(dx, dz) || 1;
  const a = Math.atan2(dx, dz) + (o.ang || 0);
  const t = d / speed;
  spawnProj(w, {
    owner: 'e', srcE: e, x: ox + Math.sin(a) * 0.6, y: oy, z: oz + Math.cos(a) * 0.6,
    vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, vy: o.flat ? 0 : (dy / Math.max(0.3, t)) * 0.5 * (e.flying ? 1 : 0),
    r: o.r ?? 0.32, dmg, el: o.el || e.spec.el, life: o.life ?? 3, homing: o.homing || 0, pierce: 0, knock: 0,
  });
  w.ev('sfx', { n: 'enemyShot', x: e.x, z: e.z });
}

// ============================================================== einfache Verhaltensweisen
const AI = {
  chaser(w, e, dt) {
    const p = target(w, e, e.aggro);
    const sp = e.spec;
    switch (e.state) {
      case 'idle': if (p) { e.state = 'chase'; w.ev('alert', { x: e.x, y: e.y + e.h + 0.5, z: e.z }); } break;
      case 'chase':
        if (!p) { e.state = 'idle'; break; }
        faceTo(e, p.x, p.z, dt);
        if (Math.hypot(p.x - e.x, p.z - e.z) <= sp.range + p.r) { e.state = 'windup'; e.t = sp.windup; e.mx = e.mz = 0; }
        else walk(w, e, p.x, p.z, sp.spd * slowFactor(e));
        break;
      case 'windup':
        e.t -= dt; if (p) faceTo(e, p.x, p.z, dt, 5);
        if (e.t <= 0) { meleeStrike(w, e, sp.range + 0.3, sp.dmg); e.state = 'recover'; e.t = 0.8; e.lunge = 0.2; }
        break;
      case 'recover': e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
    }
  },
  tank(w, e, dt) {
    const p = target(w, e, e.aggro);
    const sp = e.spec;
    switch (e.state) {
      case 'idle': if (p) { e.state = 'chase'; w.ev('alert', { x: e.x, y: e.y + e.h + 0.5, z: e.z }); } break;
      case 'chase':
        if (!p) { e.state = 'idle'; break; }
        faceTo(e, p.x, p.z, dt, 5);
        if (Math.hypot(p.x - e.x, p.z - e.z) <= sp.slamR * 0.8) {
          e.state = 'windup'; e.t = sp.windup; e.mx = e.mz = 0;
          w.zones.push({ kind: 'tele', x: e.x, y: e.y, z: e.z, r: sp.slamR, t: sp.windup, dur: sp.windup, dmg: sp.dmg, srcE: e, slam: true, el: sp.el });
        } else walk(w, e, p.x, p.z, sp.spd * slowFactor(e));
        break;
      case 'windup': e.t -= dt; if (e.t <= 0) { e.state = 'recover'; e.t = 1.1; } break;
      case 'recover': e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
    }
  },
  turret(w, e, dt) {
    const p = target(w, e, 14);
    const sp = e.spec;
    e.cd -= dt;
    if (!p) { e.state = 'idle'; return; }
    faceTo(e, p.x, p.z, dt, 8);
    if (e.state === 'windup') {
      e.t -= dt;
      if (e.t <= 0) { fireAt(w, e, p, sp.shotSpeed, sp.dmg * 1, { flat: true }); e.state = 'idle'; e.cd = sp.shootCd * rnd(0.85, 1.2); }
    } else if (e.cd <= 0) { e.state = 'windup'; e.t = 0.4; }
  },
  shooter(w, e, dt) {
    const p = target(w, e, e.aggro);
    const sp = e.spec;
    e.cd -= dt;
    if (!p) { e.state = 'idle'; e.mx = e.mz = 0; return; }
    faceTo(e, p.x, p.z, dt, 8);
    const d = Math.hypot(p.x - e.x, p.z - e.z);
    if (e.state === 'windup') {
      e.t -= dt; e.mx = e.mz = 0;
      if (e.t <= 0) { fireAt(w, e, p, sp.shotSpeed, sp.dmg); e.state = 'idle'; e.cd = sp.shootCd * rnd(0.85, 1.2); }
      return;
    }
    const sf = slowFactor(e);
    if (d < sp.keep - 2) walk(w, e, e.x - (p.x - e.x), e.z - (p.z - e.z), sp.spd * sf);
    else if (d > sp.keep + 2) walk(w, e, p.x, p.z, sp.spd * sf);
    else { e.mx = e.mz = 0; }
    if (e.cd <= 0 && d < 15) { e.state = 'windup'; e.t = 0.4; }
  },
  flyer(w, e, dt) {
    const p = target(w, e, e.aggro + 2);
    const sp = e.spec;
    e.cd -= dt;
    e.flying = true;
    if (!p) {
      e.mx = e.mz = 0; e.vy += ((e.home.y + sp.hover - e.y) * 2 - e.vy) * Math.min(1, dt * 4);
      return;
    }
    const sf = slowFactor(e);
    const wantY = p.y + sp.hover * (e.state === 'diveWind' ? 1.4 : 1);
    if (e.state === 'dive') {
      e.t -= dt;
      e.mx = e.dvx; e.mz = e.dvz; e.vy = e.dvy;
      const dd = dist2(e.x, e.z, p.x, p.z);
      if (dd < (e.r + p.r + 0.4) ** 2 && Math.abs(e.y - p.y - 0.5) < 1.2) { damagePlayer(w, p, sp.dmg, e, { kx: e.dvx / 12, kz: e.dvz / 12, knock: 5 }); e.state = 'rise'; e.t = 1.2; }
      if (e.t <= 0 || e.y < p.y + 0.3) { e.state = 'rise'; e.t = 1.2; }
      return;
    }
    if (e.state === 'diveWind') {
      e.t -= dt; e.mx = e.mz = 0; faceTo(e, p.x, p.z, dt, 12);
      e.vy += ((wantY - e.y) * 3 - e.vy) * Math.min(1, dt * 6);
      if (e.t <= 0) {
        const dx = p.x - e.x, dz = p.z - e.z, dy = p.y + 0.6 - e.y, dd = Math.hypot(dx, dz, dy) || 1;
        e.dvx = (dx / dd) * 13; e.dvz = (dz / dd) * 13; e.dvy = (dy / dd) * 13; e.state = 'dive'; e.t = 1.1;
      }
      return;
    }
    if (e.state === 'rise') { e.t -= dt; if (e.t <= 0) e.state = 'fly'; }
    // Umkreisen
    e.orbit = (e.orbit || rnd(0, TAU)) + dt * (e.orbitDir || 1) * 0.8;
    const R = 5;
    const tx = p.x + Math.cos(e.orbit) * R, tz = p.z + Math.sin(e.orbit) * R;
    walk(w, e, tx, tz, sp.spd * sf, true);
    e.vy += ((wantY - e.y) * 2.5 - e.vy) * Math.min(1, dt * 5);
    faceTo(e, p.x, p.z, dt, 8);
    if (e.state === 'windup') {
      e.t -= dt;
      if (e.t <= 0) {
        if (sp.shock) { // Quallen: Stromstoß rund um sich
          ringAt(w, e.x, e.y, e.z, 3.2, sp.dmg, e, { hgt: 4 });
        } else fireAt(w, e, p, sp.shotSpeed, sp.dmg, { homing: sp.homingShot ? 0.5 : 0 });
        e.state = 'fly'; e.cd = sp.shootCd * rnd(0.85, 1.25);
      }
    } else if (e.cd <= 0 && Math.hypot(p.x - e.x, p.z - e.z) < 14) {
      if (sp.dive && Math.random() < 0.4) { e.state = 'diveWind'; e.t = 0.7; e.cd = 3.5; }
      else { e.state = 'windup'; e.t = 0.4; }
    }
  },
  jumper(w, e, dt) {
    const p = target(w, e, e.aggro);
    const sp = e.spec;
    e.cd -= dt;
    if (!p) { e.mx = e.mz = 0; return; }
    faceTo(e, p.x, p.z, dt, 6);
    if (e.grounded) {
      e.mx = e.mz = 0;
      if (e.airborne) { e.airborne = false; e.cd = rnd(0.55, 1.0); e.touched = false; w.ev('sfx', { n: 'thud', x: e.x, z: e.z }); }
      if (e.cd <= 0) {
        const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1;
        const hop = Math.min(d, 5.5);
        e.vy = 8.5; e.airborne = true; e.hopVx = (dx / d) * (hop / 0.65) * slowFactor(e); e.hopVz = (dz / d) * (hop / 0.65) * slowFactor(e);
        if (!hasGround(w.boxes, e.x + (dx / d) * hop * 0.6, e.z + (dz / d) * hop * 0.6, e.y)) { e.hopVx *= 0.2; e.hopVz *= 0.2; }
      }
    } else {
      e.mx = e.hopVx || 0; e.mz = e.hopVz || 0;
      if (!e.touched && dist2(e.x, e.z, p.x, p.z) < (e.r + p.r + 0.2) ** 2 && Math.abs(e.y - p.y) < 1.4) {
        e.touched = true; damagePlayer(w, p, sp.dmg, e, { kx: (p.x - e.x) / 1, kz: (p.z - e.z) / 1, knock: 3 });
      }
    }
  },
  charger(w, e, dt) {
    const p = target(w, e, e.aggro);
    const sp = e.spec;
    switch (e.state) {
      case 'idle': if (p) { e.state = 'chase'; w.ev('alert', { x: e.x, y: e.y + e.h + 0.5, z: e.z }); } break;
      case 'chase':
        if (!p) { e.state = 'idle'; break; }
        faceTo(e, p.x, p.z, dt);
        {
          const d = Math.hypot(p.x - e.x, p.z - e.z);
          if (d < 7 && d > 2.5 && Math.random() < dt * 1.5) {
            e.state = 'windup'; e.t = sp.windup; e.mx = e.mz = 0;
            e.cdx = (p.x - e.x) / d; e.cdz = (p.z - e.z) / d;
            w.zones.push({ kind: 'line', x: e.x, y: e.y, z: e.z, dx: e.cdx, dz: e.cdz, len: 9, w: 1.4, t: sp.windup, dur: sp.windup });
          } else if (d <= 2.5) { e.state = 'windup'; e.t = 0.35; e.cdx = (p.x - e.x) / d; e.cdz = (p.z - e.z) / d; }
          else walk(w, e, p.x, p.z, sp.spd * slowFactor(e));
        }
        break;
      case 'windup': e.t -= dt; e.face = Math.atan2(e.cdx, e.cdz); if (e.t <= 0) { e.state = 'charge'; e.t = 0.8; e.hit = false; } break;
      case 'charge':
        e.t -= dt; e.mx = e.cdx * sp.chargeSpeed; e.mz = e.cdz * sp.chargeSpeed;
        if (!hasGround(w.boxes, e.x + e.cdx, e.z + e.cdz, e.y)) { e.state = 'recover'; e.t = 0.9; e.mx = e.mz = 0; break; }
        if (!e.hit) for (const q of livePlayers(w)) {
          if (dist2(e.x, e.z, q.x, q.z) < (e.r + q.r + 0.2) ** 2 && Math.abs(q.y - e.y) < 1.6) { e.hit = true; damagePlayer(w, q, sp.dmg, e, { kx: e.cdx, kz: e.cdz, knock: 7, lift: 4 }); }
        }
        if (e.t <= 0 || e.hitWall) { e.state = 'recover'; e.t = 0.9; e.mx = e.mz = 0; }
        break;
      case 'recover': e.mx = e.mz = 0; e.t -= dt; if (e.t <= 0) e.state = 'chase'; break;
    }
  },
  exploder(w, e, dt) {
    const p = target(w, e, e.aggro);
    const sp = e.spec;
    switch (e.state) {
      case 'idle': if (p) { e.state = 'chase'; w.ev('alert', { x: e.x, y: e.y + e.h + 0.5, z: e.z }); } break;
      case 'chase':
        if (!p) { e.state = 'idle'; break; }
        faceTo(e, p.x, p.z, dt);
        if (Math.hypot(p.x - e.x, p.z - e.z) < 2.0) { e.state = 'windup'; e.t = sp.windup; e.mx = e.mz = 0; }
        else walk(w, e, p.x, p.z, sp.spd * slowFactor(e));
        break;
      case 'windup':
        e.t -= dt;
        if (e.t <= 0) { ringAt(w, e.x, e.y, e.z, sp.slamR, sp.dmg, e); w.ev('sfx', { n: 'boom2', x: e.x, z: e.z }); e.noReward = true; e.hp = 0; e.dead = true; w.ev('death', { x: e.x, y: e.y, z: e.z, id: e.id, el: sp.el }); }
        break;
    }
  },
};

// ============================================================== Fähigkeiten (Elite + Boss)
function tele(w, e, x, z, r, t, dmg, o = {}) {
  const y = groundAt(w.boxes, x, z, e.y + 2);
  w.zones.push(Object.assign({ kind: 'tele', x, y: Number.isFinite(y) ? y : e.y, z, r, t, dur: t, dmg, srcE: e, el: e.spec.el }, o));
}
function validSpot(w, x, z, y) { return Number.isFinite(groundAt(w.boxes, x, z, y + 1.5, 1.2)); }

const ABILITY = {
  slam: {
    dur: () => 1.1,
    start(w, e, c, p) { tele(w, e, e.x, e.z, c.r + e.r * 0.4, 0.85, c.dmg, { slam: true }); },
    tick() { return false; },
  },
  rain: {
    dur: (c) => 1.2 + c.n * 0.14,
    start(w, e, c, p) {
      const ps = livePlayers(w);
      for (let i = 0; i < c.n; i++) {
        const tp = ps.length ? ps[i % ps.length] : p;
        const a = rnd(0, TAU), d = i < ps.length ? 0 : rnd(1.5, 5.5);
        let x = tp.x + Math.cos(a) * d, z = tp.z + Math.sin(a) * d;
        if (!validSpot(w, x, z, tp.y)) { x = tp.x; z = tp.z; }
        tele(w, e, x, z, c.lightning ? 1.8 : 2.0, 1.0 + i * 0.14, c.dmg, { lightning: !!c.lightning });
      }
    },
    tick() { return false; },
  },
  volley: {
    dur: () => 1.0,
    start(w, e, c, p) { c.fired = false; },
    tick(w, e, c, dt, p) {
      if (!c.fired && c.t > 0.5) {
        c.fired = true;
        const base = Math.atan2(p.x - e.x, p.z - e.z), sp = (c.spread * Math.PI) / 180;
        for (let i = 0; i < c.n; i++) {
          const a = c.n > 1 ? (i / (c.n - 1) - 0.5) * sp : 0;
          spawnProj(w, { owner: 'e', srcE: e, x: e.x + Math.sin(base + a) * 1.2, y: e.y + e.h * 0.55, z: e.z + Math.cos(base + a) * 1.2, vx: Math.sin(base + a) * 11, vz: Math.cos(base + a) * 11, r: 0.36, dmg: c.dmg, el: e.spec.el, life: 2.6 });
        }
        w.ev('sfx', { n: 'enemyShot', x: e.x, z: e.z });
      }
      return false;
    },
  },
  ring: {
    dur: (c) => (c.spin ? 1.5 : 1.1),
    start(w, e, c) { c.fired = 0; c.off = rnd(0, TAU); },
    tick(w, e, c) {
      const fire = (off) => {
        for (let i = 0; i < c.n; i++) {
          const a = off + (i / c.n) * TAU;
          spawnProj(w, { owner: 'e', srcE: e, x: e.x + Math.sin(a) * 1.4, y: e.y + 0.9, z: e.z + Math.cos(a) * 1.4, vx: Math.sin(a) * 7.5, vz: Math.cos(a) * 7.5, r: 0.36, dmg: c.dmg, el: e.spec.el, life: 3.4 });
        }
        w.ev('sfx', { n: 'enemyShot', x: e.x, z: e.z });
      };
      if (c.fired === 0 && c.t > 0.5) { c.fired = 1; fire(c.off); }
      if (c.spin && c.fired === 1 && c.t > 0.95) { c.fired = 2; fire(c.off + Math.PI / c.n); }
      return false;
    },
  },
  charge: {
    dur: () => 2.2,
    start(w, e, c, p) {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1;
      c.dx = dx / d; c.dz = dz / d; c.go = false; c.hit = false;
      w.zones.push({ kind: 'line', x: e.x, y: e.y, z: e.z, dx: c.dx, dz: c.dz, len: 16, w: e.r * 1.6, t: 0.8, dur: 0.8 });
    },
    tick(w, e, c, dt) {
      e.face = Math.atan2(c.dx, c.dz);
      if (c.t < 0.8) { e.mx = e.mz = 0; return false; }
      if (c.t < 1.7) {
        c.go = true; e.mx = c.dx * 15; e.mz = c.dz * 15;
        if (!hasGround(w.boxes, e.x + c.dx * 1.5, e.z + c.dz * 1.5, e.y) || e.hitWall) { e.mx = e.mz = 0; c.t = 1.7; return false; }
        for (const q of livePlayers(w)) {
          if (!c.hit && dist2(e.x, e.z, q.x, q.z) < (e.r + q.r + 0.3) ** 2 && Math.abs(q.y - e.y) < 2) { c.hit = true; damagePlayer(w, q, c.dmg, e, { kx: c.dx, kz: c.dz, knock: 9, lift: 5 }); }
        }
        w.ev('shake', { v: 0.04 });
        return false;
      }
      e.mx = e.mz = 0;
      return false;
    },
  },
  leap: {
    dur: () => 1.5,
    start(w, e, c, p) {
      c.sx = e.x; c.sz = e.z; c.sy = e.y; c.tx = p.x; c.tz = p.z;
      if (!validSpot(w, c.tx, c.tz, p.y)) { c.tx = e.x; c.tz = e.z; }
      tele(w, e, c.tx, c.tz, c.r + 0.8, 1.0, c.dmg, { slam: true });
      c.ty = groundAt(w.boxes, c.tx, c.tz, p.y + 1);
      if (!Number.isFinite(c.ty)) c.ty = e.y;
    },
    tick(w, e, c, dt) {
      const a = clamp((c.t - 0.3) / 0.7, 0, 1);
      if (c.t >= 0.3 && c.t < 1.0) {
        e.x = c.sx + (c.tx - c.sx) * a; e.z = c.sz + (c.tz - c.sz) * a;
        e.y = c.sy + (c.ty - c.sy) * a + Math.sin(a * Math.PI) * 4.5;
        e.vy = 0; e.leaping = true;
      } else if (e.leaping) { e.leaping = false; e.x = c.tx; e.z = c.tz; e.y = c.ty; e.vy = 0; }
      e.mx = e.mz = 0;
      return false;
    },
  },
  summon: {
    dur: () => 1.3,
    start(w, e, c) { c.done = false; },
    tick(w, e, c) {
      if (!c.done && c.t > 0.5) {
        c.done = true;
        const alive = w.enemies.filter((q) => !q.dead && q.summoned).length;
        const n = Math.min(c.n, Math.max(0, 8 - alive));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rnd(0, 1), d = e.r + 2.5;
          const x = e.x + Math.cos(a) * d, z = e.z + Math.sin(a) * d;
          if (!validSpot(w, x, z, e.y)) continue;
          w.spawnEnemy(c.type, x, e.y + 0.2, z, { summoned: true, awake: true });
          w.ev('puff', { x, y: e.y + 0.5, z, el: e.spec.el });
        }
        w.ev('sfx', { n: 'summon', x: e.x, z: e.z });
      }
      return false;
    },
  },
  sweep: {
    dur: (c) => c.dur + 1.2,
    start(w, e, c, p) {
      const a0 = Math.atan2(p.x - e.x, p.z - e.z), dir = Math.random() < 0.5 ? 1 : -1;
      c.beam = { kind: 'beam', src: e, x: e.x, z: e.z, y: e.y, ang: a0, dir, warm: 1.0, t: 0, dur: c.dur, len: 26, w: 0.85, dmg: c.dmg, tick: 0, double: !!c.double };
      w.zones.push(c.beam);
    },
    tick(w, e, c) { e.mx = e.mz = 0; c.beam.x = e.x; c.beam.z = e.z; c.beam.y = e.y; return false; },
  },
  teleport: {
    dur: () => 2.0,
    start(w, e, c, p) {
      let best = null;
      for (let i = 0; i < 14; i++) {
        const a = rnd(0, TAU), d = rnd(5, 8);
        const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (validSpot(w, x, z, p.y)) { best = [x, z]; break; }
      }
      c.dest = best || [p.x, p.z];
      c.gone = false; c.back = false;
      tele(w, e, c.dest[0], c.dest[1], 3.6, 1.4, 22, { slam: true });
    },
    tick(w, e, c) {
      e.mx = e.mz = 0;
      if (!c.gone && c.t > 0.3) { c.gone = true; e.hidden = true; w.ev('puff', { x: e.x, y: e.y + 1, z: e.z, el: e.spec.el, big: true }); }
      if (!c.back && c.t > 1.4) {
        c.back = true; e.hidden = false; e.x = c.dest[0]; e.z = c.dest[1];
        const gy = groundAt(w.boxes, e.x, e.z, e.y + 2); if (Number.isFinite(gy)) e.y = gy;
        w.ev('puff', { x: e.x, y: e.y + 1, z: e.z, el: e.spec.el, big: true });
      }
      return false;
    },
  },
  wave: {
    dur: (c) => 1.0 + (c.n || 1) * 1.1,
    start(w, e, c, p) { c.sent = 0; c.dirA = Math.atan2(p.x - e.x, p.z - e.z); },
    tick(w, e, c, dt, p) {
      e.face = c.dirA;
      const nTot = c.n || 1;
      if (c.sent < nTot && c.t > 0.7 + c.sent * 1.1) {
        c.sent++;
        const a = Math.atan2(p.x - e.x, p.z - e.z);
        spawnProj(w, { owner: 'e', srcE: e, kind: 'wave', x: e.x + Math.sin(a) * 1.6, y: e.y, z: e.z + Math.cos(a) * 1.6, vx: Math.sin(a) * 8.5, vz: Math.cos(a) * 8.5, vy: 0, r: 0.5, wide: 5.5, dmg: c.dmg, el: 'wasser', life: 4.5 });
        w.ev('sfx', { n: 'wave', x: e.x, z: e.z }); w.ev('shake', { v: 0.12 });
      }
      return false;
    },
  },
};

function startAbility(w, e, kind, params, p) {
  const A = ABILITY[kind];
  if (!A) return false;
  const c = Object.assign({ kind, t: 0 }, params);
  c.total = A.dur(c);
  e.cast = c;
  e.state = 'cast';
  A.start(w, e, c, p);
  w.ev('cast', { x: e.x, y: e.y + e.h, z: e.z, kind, id: e.id });
  return true;
}

function phaseOf(e) {
  const ph = e.spec.phases;
  const f = e.hp / e.maxHp;
  let idx = 0;
  for (let i = 0; i < ph.length; i++) if (f <= ph[i].pct) idx = i;
  return idx;
}

AI.elite = function (w, e, dt) { abilityAI(w, e, dt, false); };
AI.boss = function (w, e, dt) { abilityAI(w, e, dt, true); };

function abilityAI(w, e, dt, boss) {
  const sp = e.spec;
  const p = target(w, e, boss ? 60 : e.aggro + 4);
  if (boss) {
    const idx = phaseOf(e);
    if (idx > e.phase) w.bossPhase(e, idx);
  }
  if (e.cast) {
    const c = e.cast, A = ABILITY[c.kind];
    c.t += dt;
    if (p) A.tick(w, e, c, dt, p); else A.tick(w, e, c, dt, { x: e.x, z: e.z + 1, y: e.y });
    if (c.t >= c.total) { e.cast = null; e.state = 'idle'; e.mx = e.mz = 0; e.leaping = false; e.hidden = false; e.cd = (boss ? sp.phases[e.phase].cd : 2.0) * rnd(0.8, 1.15); }
    return;
  }
  if (!p) { e.mx = e.mz = 0; e.awake = false; return; }
  if (!e.awake) { e.awake = true; w.onBossWake && boss && w.onBossWake(e); }
  e.cd -= dt;
  faceTo(e, p.x, p.z, dt, 6);
  const d = Math.hypot(p.x - e.x, p.z - e.z);
  const pref = boss ? 7 : 3.2;
  if (d > pref + 1.5) walk(w, e, p.x, p.z, sp.spd * slowFactor(e));
  else if (d < pref - 2 && boss) walk(w, e, e.x - (p.x - e.x), e.z - (p.z - e.z), sp.spd * 0.8);
  else { // seitlich kreisen
    const nx = -(p.z - e.z) / (d || 1), nz = (p.x - e.x) / (d || 1);
    walk(w, e, e.x + nx * (e.orbitDir || 1), e.z + nz * (e.orbitDir || 1), sp.spd * 0.5);
  }
  if (e.cd <= 0) {
    const list = boss ? sp.phases[e.phase].abilities : sp.abilities;
    let pickA = pick(list);
    if (list.length > 1 && pickA[0] === e.lastAbility) pickA = pick(list);
    e.lastAbility = pickA[0];
    e.orbitDir = Math.random() < 0.5 ? 1 : -1;
    e.mx = e.mz = 0;
    // Nahkampf-Gegner starten Angriffe nur, wenn der Spieler in der Nähe ist (Elite)
    startAbility(w, e, pickA[0], Object.assign({}, pickA[1], { dmg: (pickA[1].dmg ?? sp.dmg) }), p);
  }
}

// ============================================================== Gegner-Schritt
export function updateEnemy(w, e, dt) {
  const sp = e.spec;
  // Zeiten
  if (e.flash > 0) e.flash -= dt;
  if (e.inv > 0) e.inv -= dt;
  const st = e.st;
  for (const k of ['wet', 'curse', 'blind', 'slow']) if (st[k] > 0) st[k] -= dt;
  if (st.burn) {
    st.burn.t -= dt;
    st.burnTick = (st.burnTick || 0) - dt;
    if (st.burnTick <= 0) {
      st.burnTick = 0.5;
      w.burnTick(e, st.burn);
      if (e.dead) return;
    }
    if (st.burn.t <= 0) st.burn = null;
  }
  // aktiv, wenn ein Spieler in der Nähe ist
  const near = nearest(w.players, e.x, e.z, 38);
  if (!near && !e.awake) { e.mx = e.mz = 0; return; }
  if (st.stun > 0) {
    st.stun -= dt; e.mx = e.mz = 0;
  } else {
    e.mx = e.mx || 0; e.mz = e.mz || 0;
    const fn = AI[sp.ai];
    if (fn) fn(w, e, dt);
  }
  // Bewegung
  e.vx = e.mx + e.kx; e.vz = e.mz + e.kz;
  const decay = Math.max(0, 1 - 9 * dt);
  e.kx *= decay; e.kz *= decay;
  if (e.flying || e.leaping) {
    if (e.flying) { e.x += e.vx * dt; e.z += e.vz * dt; e.y += e.vy * dt; }
    else if (e.leaping) { /* Position wird von der Fähigkeit gesetzt */ }
    e.grounded = false;
  } else {
    e.vy -= GRAV * dt;
    moveBody(w.boxes, e, dt);
    if (e.grounded && e.vy < 0) e.vy = 0;
  }
  if (e.lunge > 0) e.lunge -= dt;
  // Abgestürzt
  if (e.y < w.level.killY) { e.dead = true; e.noReward = true; w.ev('death', { x: e.x, y: e.y, z: e.z, id: e.id, silent: true }); if (e.boss) e.dead = false, e.hp = e.maxHp, w.respawnEnemy(e); }
}

export function separateEnemies(w) {
  const list = w.enemies;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || a.flying || a.hidden || a.boss) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || b.flying || b.hidden || b.boss) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = (a.r + b.r) * 0.9;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 0.0001) {
        const d = Math.sqrt(d2), push = (rr - d) * 0.5;
        const nx = dx / d, nz = dz / d;
        if (hasGround(w.boxes, a.x - nx * push, a.z - nz * push, a.y)) { a.x -= nx * push; a.z -= nz * push; }
        if (hasGround(w.boxes, b.x + nx * push, b.z + nz * push, b.y)) { b.x += nx * push; b.z += nz * push; }
      }
    }
  }
}
