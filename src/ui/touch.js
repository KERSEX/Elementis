// Touch-Steuerung für Handy/Tablet: Stick links, Tasten rechts.
export function setupTouch(input, onPause) {
  const t = input.touch;
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `<div class="stickzone"><div class="stick"><i></i></div></div>
    <div class="tbtns"><button data-b="sp" class="tb t-sp">★</button><button data-b="a2" class="tb t-a2">B</button><button data-b="a1" class="tb t-a1">A</button><button data-b="jump" class="tb t-jump">⤒</button><button data-b="use" class="tb t-use small">E</button></div>
    <button class="tpause">II</button>`;
  document.body.appendChild(root);
  const zone = root.querySelector('.stickzone'), stick = root.querySelector('.stick'), knob = stick.firstChild;
  let sid = null, cx = 0, cy = 0;
  zone.addEventListener('pointerdown', (e) => {
    if (sid !== null) return; sid = e.pointerId; zone.setPointerCapture(sid);
    cx = e.clientX; cy = e.clientY; stick.style.display = 'block'; stick.style.left = cx - 55 + 'px'; stick.style.top = cy - 55 + 'px';
    t.on = true; input.lastDevice = 'touch'; e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), max = 50;
    if (l > max) { dx = (dx / l) * max; dy = (dy / l) * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const k = Math.min(1, l / max);
    t.mx = l > 8 ? (dx / (l || 1)) * k : 0; t.mz = l > 8 ? (dy / (l || 1)) * k : 0;
  });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; t.mx = t.mz = 0; stick.style.display = 'none'; knob.style.transform = ''; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  root.querySelectorAll('.tb').forEach((b) => {
    const k = b.dataset.b;
    b.addEventListener('pointerdown', (e) => {
      t.on = true; input.lastDevice = 'touch';
      if (k === 'jump') { t.jumpEdge = true; t.jumpHeld = true; } else if (k === 'use') t.useEdge = true; else t[k] = true;
      b.classList.add('down'); e.preventDefault();
    });
    const up = () => { if (k === 'jump') t.jumpHeld = false; else if (k !== 'use') t[k] = false; b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
  root.querySelector('.tpause').addEventListener('click', onPause);
  return { root, show(v) { root.style.display = v ? '' : 'none'; } };
}
export function isTouchDevice() {
  return ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}
