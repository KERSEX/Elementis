// Bewegung und Kollision: Figuren sind Zylinder (als Quadrat geprüft), Level sind Boxen.
export const GRAV = 26;
const EPS = 0.05;
const STEP = 0.42;                // so hohe Kanten nimmt man im Laufen mit

export function boxActive(b) {
  return !b.off && !(b.gate && b.gate.open);
}

// Bewegte Plattformen: Position = Basis + Mitte + Amplitude * sin(...). dx/dy/dz = Bewegung seit dem letzten Schritt.
export function updateMovers(boxes, t) {
  for (const b of boxes) {
    const m = b.mover;
    if (!m) continue;
    if (!m.base) m.base = { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z0: b.z0, z1: b.z1 };
    const off = (m.mid || 0) + m.amp * Math.sin((t * Math.PI * 2) / m.period + (m.phase || 0));
    const bs = m.base;
    const nx = bs.x0 + (m.axis === 'x' ? off : 0), ny = bs.y0 + (m.axis === 'y' ? off : 0), nz = bs.z0 + (m.axis === 'z' ? off : 0);
    b.dx = nx - b.x0; b.dy = ny - b.y0; b.dz = nz - b.z0;
    const w = bs.x1 - bs.x0, h = bs.y1 - bs.y0, d = bs.z1 - bs.z0;
    b.x0 = nx; b.x1 = nx + w; b.y0 = ny; b.y1 = ny + h; b.z0 = nz; b.z1 = nz + d;
  }
}

// Höchste Oberkante unter (x,z), die höchstens maxY + 0.6 hoch ist. Gibt -Infinity zurück, wenn nichts darunter ist.
export function groundAt(boxes, x, z, maxY, inset = 0) {
  let best = -Infinity;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (!boxActive(b) || b.gate) continue;
    if (x < b.x0 + inset || x > b.x1 - inset || z < b.z0 + inset || z > b.z1 - inset) continue;
    if (b.y1 <= maxY + 0.6 && b.y1 > best) best = b.y1;
  }
  return best;
}

function overlapsXZ(b, box, r) {
  return b.x + r > box.x0 && b.x - r < box.x1 && b.z + r > box.z0 && b.z - r < box.z1;
}

// Eine Figur bewegen. body: x,y,z (Füße), vx,vy,vz, r, h. opts.flying = keine Schwerkraft/Boden.
export function moveBody(boxes, b, dt, opts) {
  const r = b.r, h = b.h;
  const gb = b.groundBox;
  if (gb && gb.mover) { b.x += gb.dx || 0; b.z += gb.dz || 0; b.y += gb.dy || 0; }
  b.hitWall = false;

  // --- X
  b.x += b.vx * dt;
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (!boxActive(box) || box.ghost) continue;
    if (b.y + h <= box.y0 + EPS || b.y >= box.y1 - EPS) continue;
    if (!overlapsXZ(b, box, r) || (b.z + r <= box.z0 + 0.001) || (b.z - r >= box.z1 - 0.001)) continue;
    if (box.y1 - b.y <= STEP && b.vy <= 0.5 && !box.gate && !b.flying) { b.y = box.y1; continue; }
    // herausschieben auf der kürzeren Seite
    const pushL = b.x + r - box.x0, pushR = box.x1 - (b.x - r);
    if (pushL < pushR) b.x = box.x0 - r; else b.x = box.x1 + r;
    b.vx = 0; b.hitWall = true;
  }
  // --- Z
  b.z += b.vz * dt;
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (!boxActive(box) || box.ghost) continue;
    if (b.y + h <= box.y0 + EPS || b.y >= box.y1 - EPS) continue;
    if (!overlapsXZ(b, box, r)) continue;
    if (box.y1 - b.y <= STEP && b.vy <= 0.5 && !box.gate && !b.flying) { b.y = box.y1; continue; }
    const pushL = b.z + r - box.z0, pushR = box.z1 - (b.z - r);
    if (pushL < pushR) b.z = box.z0 - r; else b.z = box.z1 + r;
    b.vz = 0; b.hitWall = true;
  }
  // --- Y
  if (opts && opts.flying) { b.y += b.vy * dt; b.grounded = false; b.groundBox = null; return; }
  const prevY = b.y;
  b.y += b.vy * dt;
  b.grounded = false; b.groundBox = null;
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (!boxActive(box) || box.gate) continue;
    if (!overlapsXZ(b, box, r - 0.04)) continue;
    if (b.vy <= 0 && prevY >= box.y1 - 0.2 && b.y < box.y1 + 0.001) {
      if (!b.groundBox || box.y1 > b.groundBox.y1) { b.y = box.y1; b.groundBox = box; }
      b.vy = 0; b.grounded = true;
    } else if (b.vy > 0 && prevY + h <= box.y0 + 0.2 && b.y + h > box.y0) {
      b.y = box.y0 - h; b.vy = 0;
    }
  }
}

// Punkt in einer Box? (für Geschosse)
export function pointInBoxes(boxes, x, y, z, skipLow) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (!boxActive(b)) continue;
    if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y > b.y0 && y < b.y1) {
      if (skipLow && !b.prop && !b.gate && y > b.y1 - 0.25) continue;
      return b;
    }
  }
  return null;
}

// Ist unter (x,z) in Blickrichtung noch Boden? (damit Gegner nicht von Inseln laufen)
export function hasGround(boxes, x, z, y) {
  return groundAt(boxes, x, z, y + 0.3, 0.1) > y - 1.2;
}
