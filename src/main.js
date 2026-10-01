// Einstieg: prüft, ob die Seite bereit ist, und startet das Spiel.
import { Game } from './game.js';

function boot() {
  if (window.__pdeNoGL) return;           // index.html zeigt die WebGL-Fehlerseite
  let game;
  try {
    game = new Game();
  } catch (e) {
    window.__pdeFail && window.__pdeFail('Das Spiel konnte nicht starten', (e && (e.stack || e.message)) || String(e));
    throw e;
  }
  window.__pde = game;
  game.start();
  window.__pdeReady = true;
  const l = document.getElementById('loading');
  if (l) { l.classList.add('hide'); setTimeout(() => l.remove(), 300); }
}
boot();
