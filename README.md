# Elementis – Hüter der Himmelsinseln

3D-Action-Adventure im Stil der Portal-Spiele, **direkt im Browser spielbar**: 20 Helden aus 10 Elementen, Swapper, fangbare Schurken, 4 Welten mit Bossen, Arena, Schmiede, Sammlung und Erfolge.
Alle Figuren, Namen, Welten und die Musik sind eigene Entwürfe.

## Spielen

| Weg | So geht's |
|---|---|
| **Einzeldatei** | `docs/index.html` herunterladen und im Browser öffnen. Kein Server, keine Installation, funktioniert auch offline. |
| **GitHub Pages** | Repository → Settings → Pages → *Deploy from a branch* → Branch `main`, Ordner `/docs`. Danach ist das Spiel unter der Pages-Adresse spielbar. |
| **Lokaler Server** | `start.bat` (Windows) oder `python server.py`, dann `http://localhost:5180`. |

Das Spiel braucht einen Browser mit WebGL (Chrome, Edge, Firefox, Safari; auch Handy und Tablet). Der Spielstand liegt im `localStorage` des Browsers.
Fehlt WebGL, zeigt das Spiel eine Fehlerseite mit Hinweisen. Mit `?nogl=1` an der Adresse lässt sie sich ansehen.

## Steuerung

| | Spieler 1 (Tastatur + Maus) | Gamepad | Spieler 2 (Ziffernblock) | Handy |
|---|---|---|---|---|
| Laufen | WASD | linker Stick | Pfeiltasten | Stick links |
| Springen | Leertaste | A | Num0 | ⤒ |
| Angriff 1 | Linksklick / J | X / RT | Num1 | A |
| Angriff 2 | Rechtsklick / K | B | Num2 | B |
| Spezial | L / Q | Y | Num3 | ★ |
| Benutzen (Tore) | E | RB | Num5 | E |
| Pause | Esc | Start | – | II |

Mit der Maus zielen die Angriffe auf den Mauszeiger, mit dem Gamepad auf den rechten Stick. Ohne Maus zielt das Spiel automatisch auf Gegner in Blickrichtung.
Die Tasten von Spieler 1 lassen sich unter **Einstellungen** ändern. Spieler 2 wird in der Wolkenfeste (Reiter *Helden*) gewählt oder tritt im Level mit Num-Enter bei.

## Inhalte
- **Helden:** 2 pro Element – Feuer (Glutbock, Aschefuchs), Wasser (Riffklinge, Nebelqualle), Erde (Granitus, Grabscharr), Luft (Wirbelfeder, Surra), Magie (Morchel, Nimbra), Tech (Bolzen, Kiko), Leben (Brummbart, Vira), Untot (Krax, Flacker), Licht (Aurel, Glim), Dunkelheit (Nox, Umbra). Je zwei Angriffe und ein Spezial. Stufe bis 20, vier Upgrades plus ein Seelenstein-Upgrade. Vier Helden sind von Anfang an frei, die anderen kauft man mit Gold.
- **Elemente:** Jeder Treffer bringt eine Wirkung mit: Feuer brennt, Wasser macht nass (Strom und Luft wirken dann stärker), Erde betäubt, Luft stößt zurück, Magie trifft öfter kritisch, Tech springt als Kettenblitz weiter, Leben und Untot heilen, Licht blendet, Dunkelheit verflucht.
- **Swapper:** Oberteil (Angriffe, LP, Element) und Unterteil (Tempo, Springen, Spezial) von zwei Helden kombinieren. Ein Swapper öffnet die Tore beider Elemente.
- **Schurken:** 8 Elite-Schurken. Wer beim Sieg einen Fangkristall hat, fängt sie und kann sie danach selbst spielen.
- **Welten:** Himmelsinseln (Moosklippen, Nebelmoor-Ruinen, Boss Moragar), Glutschmiede (Lava, Dampf, Fähren und Aufzüge, Boss Eisenkessel), Schattenzitadelle (brüchige Platten, Boss Zerrax) und – nach Zerrax – die Sturmküste (Gezeitenplattformen, Gewitter, Boss Kraal). Die Bosse haben je drei Phasen und eigene Angriffe mit Warnkreisen (Strahlen, Wellen, Blitze, Beschwörungen).
- **Element-Tore:** Farbige Tore öffnet nur ein Held mit dem passenden Element (E). Dahinter liegen Schätze, Hüte und Seelensteine.
- **Sammeln:** Seelensteine, 12 Hüte mit Werte-Bonus, 12 Schätze, Fangkristalle, 3 Herausforderungen (Sterne) pro Level.
- **Schwierigkeit:** Leicht, Normal, Schwer und Albtraum (erst nach Zerrax). Sie verändert Gegner-LP, Gegnerschaden, Gold und die Wartezeit nach dem Erschöpfen.
- **Arena der Elemente:** Wellen mit steigenden Gegnern, alle fünf Wellen ein Schurke. Belohnungen bei Welle 5, 10 und 15.
- **Sammlung & Erfolge:** Fortschritt in Prozent, alle Hüte und Schätze mit Fundort, Statistik und 24 Erfolge.
- **Sonstiges:** Musik und Töne werden im Browser erzeugt. Grafik-Einstellung *Hoch / Mittel / Niedrig / Sehr niedrig / Automatisch* (die Automatik schaltet bei zu wenigen Bildern pro Sekunde herunter), Schadenszahlen und Wackeln abschaltbar, Touch-Steuerung am Handy, lokaler Koop für zwei Spieler.

## Entwickeln
```
npm install          # einmalig (esbuild)
npm run build        # schreibt docs/index.html (alles in einer Datei)
python server.py     # oder: npm run serve – Quellcode direkt ausprobieren
```
Zum Entwickeln genügt ein beliebiger statischer Server im Projektordner; `index.html` lädt `src/main.js` als ES-Modul. `docs/index.html` ist das gebündelte Ergebnis und wird mit `npm run build` neu erzeugt.
Three.js liegt als `vendor/three.js` im Repository (MIT-Lizenz, siehe `vendor/THREE-LICENSE`).

```
index.html, styles.css     Seite und Oberfläche
build.mjs                  Einzeldatei-Build (esbuild)
src/main.js, src/game.js   Start, Zustände (Titel, Wolkenfeste, Level, Pause, Ergebnis), Hauptschleife
src/sim/                   Spiellogik ohne Grafik: world, physics, combat, ai (Gegner, Elite, Bosse), hero
src/render/                Three.js: view (Szene, Kamera, Ereignisse), models (Figuren), levelview, fx, parts
src/core/                  input, audio (Töne + Musik), save (localStorage), util
src/ui/                    screens (Menüs), hud, touch
src/data/                  elements, heroes (Helden + Schurken), enemies (Gegner, Elite, Bosse), items, levels
vendor/three.js            Three.js (gebündelt)
server.py, start.bat       optionaler lokaler Server
```
Level sind Datenobjekte in `src/data/levels.js`. Der `LevelBuilder` setzt Inseln wie mit einer Schildkröte hintereinander (`next`, `turn`, `ferry`, `lift`, `branch`) und platziert Gegner, Münzen, Checkpoints und Tore relativ zur aktuellen Insel.
Ein neuer Held ist ein Eintrag in `src/data/heroes.js` (Werte, drei Angriffe, Aussehen aus Merkmalen). Ein neuer Erfolg ist ein Eintrag in `src/data/items.js`.

Zur Fehlersuche in der Browser-Konsole: `__pde` ist das Spielobjekt (`__pde.world`, `__pde.save`, `__pde.view`).

## Nicht enthalten
Diese Teile der ursprünglichen Planung gibt es in der Browser-Version nicht: LAN-Mehrspieler mit Host-Wechsel, Duell-Insel, BetterPortal-Bridge und der Skystones-Tisch. `server.py` enthält die alte Relay-Schnittstelle noch, das Spiel nutzt sie aber nicht.

Lizenz: siehe `LICENSE`.
