// Töne und Musik, komplett im Browser erzeugt (WebAudio).
let ctx = null, master, sfxGain, musicGain, noiseBuf;
let vols = { master: 0.8, music: 0.45, sfx: 0.8 };
let muted = false;

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
    master = ctx.createGain(); sfxGain = ctx.createGain(); musicGain = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    sfxGain.connect(master); musicGain.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    setVolumes(vols);
  } catch (e) { ctx = null; }
}
export function setVolumes(v) {
  vols = Object.assign(vols, v);
  if (!ctx) return;
  master.gain.value = vols.master; sfxGain.gain.value = vols.sfx; musicGain.gain.value = vols.music * 0.5;
}

function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0, dest) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, hp = 800, delay = 0, lpEnd = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = lpEnd ? 'lowpass' : 'highpass'; f.frequency.setValueAtTime(hp, t);
  if (lpEnd) f.frequency.exponentialRampToValueAtTime(lpEnd, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain);
  s.start(t); s.stop(t + dur + 0.02);
}

const last = {};
const S = {
  jump: () => tone(300, 0.16, 'square', 0.1, 340),
  jump2: () => tone(480, 0.14, 'square', 0.1, 360),
  land: () => noise(0.06, 0.08, 300),
  coin: () => { tone(988, 0.07, 'square', 0.09); tone(1319, 0.14, 'square', 0.09, 0, 0.06); },
  coin5: () => { tone(784, 0.07, 'square', 0.1); tone(1175, 0.07, 'square', 0.1, 0, 0.06); tone(1568, 0.16, 'square', 0.1, 0, 0.12); },
  heal: () => { tone(523, 0.12, 'sine', 0.15); tone(659, 0.12, 'sine', 0.15, 0, 0.1); tone(784, 0.2, 'sine', 0.15, 0, 0.2); },
  item: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, 0, i * 0.09)); },
  hit: () => { noise(0.07, 0.14, 1200); tone(180, 0.08, 'square', 0.1, -80); },
  hitBig: () => { noise(0.12, 0.2, 500); tone(110, 0.14, 'sawtooth', 0.14, -50); },
  hurt: () => { tone(220, 0.22, 'sawtooth', 0.16, -150); noise(0.1, 0.12, 600); },
  pop: () => { tone(420, 0.12, 'sine', 0.14, -300); noise(0.08, 0.1, 1500); },
  boom: () => { noise(0.7, 0.35, 900, 0, 60); tone(80, 0.6, 'sawtooth', 0.2, -50); },
  boom2: () => { noise(0.3, 0.22, 700, 0, 100); tone(120, 0.25, 'sawtooth', 0.12, -70); },
  slam: () => { noise(0.4, 0.3, 500, 0, 60); tone(70, 0.4, 'sine', 0.3, -30); },
  swing: () => noise(0.12, 0.1, 2000),
  dash: () => { noise(0.2, 0.12, 1500); tone(200, 0.2, 'sawtooth', 0.08, 500); },
  nova: () => { tone(220, 0.35, 'sawtooth', 0.14, 500); noise(0.3, 0.14, 600); },
  shield: () => { tone(440, 0.3, 'triangle', 0.14, 220); },
  buff: () => { [392, 523, 659].forEach((f, i) => tone(f, 0.15, 'triangle', 0.14, 0, i * 0.07)); },
  mine: () => tone(300, 0.1, 'square', 0.08, -100),
  pull: () => { tone(500, 0.35, 'sine', 0.14, -380); },
  summon: () => { tone(260, 0.3, 'triangle', 0.14, 300); tone(390, 0.3, 'triangle', 0.1, 300, 0.06); },
  shoot_feuer: () => { noise(0.14, 0.1, 900); tone(240, 0.12, 'sawtooth', 0.06, -80); },
  shoot_wasser: () => tone(520, 0.12, 'sine', 0.12, -260),
  shoot_erde: () => { tone(110, 0.12, 'square', 0.12, -40); noise(0.06, 0.08, 400); },
  shoot_luft: () => noise(0.1, 0.1, 3000),
  shoot_magie: () => { tone(700, 0.14, 'sine', 0.1, 400); },
  shoot_tech: () => { tone(900, 0.07, 'square', 0.08, -500); },
  shoot_leben: () => tone(420, 0.1, 'triangle', 0.12, 150),
  shoot_untot: () => tone(160, 0.18, 'sawtooth', 0.08, -60),
  shoot_licht: () => tone(1100, 0.1, 'sine', 0.1, 300),
  shoot_dunkel: () => tone(130, 0.2, 'sawtooth', 0.1, -40),
  enemyShot: () => tone(330, 0.1, 'square', 0.07, -120),
  enemyHit: () => { noise(0.1, 0.16, 700); tone(150, 0.12, 'square', 0.1, -60); },
  thud: () => noise(0.05, 0.08, 200),
  checkpoint: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'sine', 0.15, 0, i * 0.08)); },
  gate: () => { tone(200, 0.5, 'sine', 0.18, 500); noise(0.4, 0.1, 1200); },
  nope: () => tone(140, 0.2, 'square', 0.1, -30),
  crumble: () => noise(0.35, 0.16, 300, 0, 80),
  splash: () => noise(0.4, 0.2, 1800, 0, 200),
  down: () => { tone(330, 0.5, 'sawtooth', 0.14, -250); },
  win: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.12, 0, i * 0.12)); },
  win2: () => { [659, 880, 1109].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, 0, i * 0.1)); },
  roar: () => { tone(90, 0.8, 'sawtooth', 0.22, -40); noise(0.7, 0.2, 300, 0, 80); },
  capture: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.16, 0, i * 0.1)); },
  wave: () => { tone(110, 0.5, 'sawtooth', 0.14, 100); noise(0.5, 0.1, 400, 0, 100); },
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.12, 0, i * 0.07)); },
  click: () => tone(660, 0.05, 'square', 0.06),
  select: () => { tone(880, 0.06, 'square', 0.08); tone(1320, 0.08, 'square', 0.08, 0, 0.05); },
  back: () => tone(440, 0.08, 'square', 0.07, -120),
  buy: () => { tone(1047, 0.08, 'square', 0.1); tone(1568, 0.14, 'square', 0.1, 0, 0.07); },
};

export function play(name) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const fn = S[name];
  if (!fn) return;
  const now = ctx.currentTime;
  if (last[name] && now - last[name] < 0.035) return;
  last[name] = now;
  try { fn(); } catch (e) { /* ignore */ }
}

// ------------------------------------------------------------------ Musik
const SCALES = {
  hub:    { root: 57, mode: [0, 2, 4, 7, 9], bpm: 100, bass: [0, 0, 7, 5], wave: 'triangle' },
  sky:    { root: 60, mode: [0, 2, 4, 7, 9], bpm: 116, bass: [0, 7, 5, 7], wave: 'triangle' },
  forge:  { root: 50, mode: [0, 3, 5, 7, 10], bpm: 128, bass: [0, 0, 3, 5], wave: 'sawtooth' },
  shadow: { root: 52, mode: [0, 2, 3, 7, 8], bpm: 100, bass: [0, 8, 7, 3], wave: 'triangle' },
  storm:  { root: 55, mode: [0, 2, 5, 7, 9], bpm: 124, bass: [0, 5, 7, 2], wave: 'square' },
  boss:   { root: 48, mode: [0, 1, 3, 7, 8], bpm: 140, bass: [0, 0, 1, 0], wave: 'sawtooth' },
};
let musicTimer = null, musicState = null;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function playMusic(name) {
  if (musicState && musicState.name === name) return;
  stopMusic();
  const sc = SCALES[name] || SCALES.sky;
  musicState = { name, sc, step: 0, next: 0 };
  if (!ctx) return;
  musicState.next = ctx.currentTime + 0.1;
  musicTimer = setInterval(scheduler, 120);
}
export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null; musicState = null;
}
export function resumeMusic() {
  if (musicState && !musicTimer && ctx) { musicState.next = ctx.currentTime + 0.1; musicTimer = setInterval(scheduler, 120); }
}
function scheduler() {
  if (!ctx || !musicState || ctx.state !== 'running' || muted) { if (musicState && ctx) musicState.next = Math.max(musicState.next, ctx.currentTime); return; }
  const m = musicState, sc = m.sc;
  const stepDur = 60 / sc.bpm / 2;
  while (m.next < ctx.currentTime + 0.4) {
    const s = m.step, bar = Math.floor(s / 16), pos = s % 16;
    const bassNote = sc.root - 12 + sc.mode[sc.bass[bar % 4] % sc.mode.length];
    if (pos % 4 === 0) tone(mtof(bassNote), stepDur * 3.6, sc.wave === 'sawtooth' ? 'sawtooth' : 'triangle', 0.16, 0, m.next - ctx.currentTime, musicGain);
    // Arpeggio / Melodie
    const pat = [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 4, 2, 1, 3, 2, 0];
    if (pos % 2 === 0 || (m.name === 'boss' || m.name === 'forge' || m.name === 'storm')) {
      const deg = (pat[pos] + bar * 2) % sc.mode.length;
      const oct = (pos % 8 === 6) ? 12 : 0;
      tone(mtof(sc.root + 12 + sc.mode[deg] + oct), stepDur * 1.5, sc.wave === 'sawtooth' ? 'square' : sc.wave, 0.07, 0, m.next - ctx.currentTime, musicGain);
    }
    if (pos % 4 === 2 && (m.name === 'boss' || m.name === 'storm' || m.name === 'forge')) noise(0.04, 0.05, 6000, m.next - ctx.currentTime);
    m.next += stepDur; m.step++;
  }
}
