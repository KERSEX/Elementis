# Elementis – Hüter der Himmelsinseln

Eigenes 3D-Action-Adventure im Stil der Portal-Spiele: 20 Helden aus 10 Elementen, Swapper, fangbare Schurken, 4 Welten mit Bossen, Arena, Duell, Hüte, Schätze, Sammlung und Erfolge.
Man spielt allein, zu zweit an einem PC oder mit bis zu 4 Spielern im Heimnetz.
Alle Figuren, Namen, Welten und die Musik sind eigene Entwürfe.
(Bis September 2026 hieß das Spiel „Portal der Elemente“ – alte Spielstände werden beim ersten Start automatisch übernommen.)

## Inhalte
- **Helden:** 2 pro Element – Feuer (Glutbock, Aschefuchs), Wasser (Riffklinge, Nebelqualle), Erde (Granitus, Grabscharr), Luft (Wirbelfeder, Surra), Magie (Morchel, Nimbra), Tech (Bolzen, Kiko), Leben (Brummbart, Vira), Untot (Krax, Flacker), Licht (Aurel, Glim), Dunkelheit (Nox, Umbra). Stufe bis 20, je 4 Upgrades plus ein Seelenstein-Upgrade.
- **Swapper:** Oberteil (Angriffe, LP, Element) und Unterteil (Tempo, Spezialfähigkeit) von zwei Helden kombinieren – im Portal-Tab „Swapper“. Swapper öffnen die Tore beider Elemente.
- **Schurken:** 8 Elite-Schurken und 4 Bosse. Wer beim Sieg einen Fangkristall hat, fängt sie und kann sie danach am Portal spielen.
- **Welten:** Himmelsinseln, Glutschmiede (Lava, bewegte Plattformen, Aufzug), Schattenzitadelle und – nach dem Sieg über Zerrax – die Sturmküste (Gezeiten- und Windplattformen, Gewitter). Je 2 Level und ein Boss (Moragar, Eisenkessel, Zerrax, Kraal) mit Story-Untertiteln.
- **Schwierigkeit:** Leicht, Normal, Schwer und Albtraum (erst nach Zerrax). Der Host wählt sie vor dem Levelstart oder im Pausemenü in der Wolkenfeste; sie gilt für alle Mitspieler und verändert Gegner-LP, Gegnerschaden, Gold und die Wartezeit nach dem Erschöpfen.
- **Sammeln:** Seelensteine, Hüte (Werte-Boni), Schmuckstücke (Spezialeffekte), Fangkristalle, 12 Schätze (stehen danach in der Wolkenfeste), 3 Herausforderungen pro Level.
- **Sammlung & Erfolge:** Im Hauptmenü und im Pausemenü unter „Sammlung“: Fortschritt in Prozent, alle Hüte, Schmuckstücke, Schurken und Schätze mit Fundort, Statistik und 24 Erfolge (werden pro PC gespeichert).
- **Modi:** Arena der Elemente (Wellen, Seelensteine bei Welle 10 und 15, ab Welle 15 auch Sturmküsten-Gegner), Duell-Insel (Spieler gegeneinander, 3 Siege), Skystones-Tisch (öffnet `..\Skystone\skystones.html`).
- **Sonstiges:** Prozedurale Musik, Einstellungen (Grafik, Lautstärken, Schadenszahlen, Wackeln, Tastenbelegung), Emotes und Markierungen, Level-Banner, Element-Fahnen und Welt-Bögen in der Wolkenfeste.

## Starten
`start.bat` doppelklicken. Beim ersten Start wird die Python-Umgebung (`venv`, aiohttp) eingerichtet, danach öffnet sich der Browser auf `http://localhost:5180`.

**Browser:** Das Spiel braucht 3D-Grafik (WebGL) mit Hardwarebeschleunigung. Chrome und Edge laufen direkt.
In LibreWolf oder Firefox: Einstellungen → Allgemein → Leistung → „Empfohlene Leistungseinstellungen“ abwählen → „Hardwarebeschleunigung verwenden, wenn verfügbar“ anhaken → Browser neu starten.
Fehlt WebGL, zeigt das Spiel eine Fehlermeldung mit dem Grund, den der Browser nennt, und passenden Schritten (Windows bzw. Linux). Fehler aus dem Browser erscheinen im Server-Fenster des Hosts, auch die von Mitspielern im Heimnetz. Zum Ansehen der Fehlerseite: `?nogl=1` an die Adresse hängen.

**Firefox unter Linux ohne WebGL:** about:config → `webgl.disabled` auf false und `webgl.force-enabled` auf true, dann neu starten. Mesa-Treiber mit 3D sind nötig (`glxinfo -B`), und Firefox aus Flatpak oder Snap hat oft keinen Zugriff auf die Grafikkarte. about:support zeigt unter „Grafik“ den genauen Grund.

Auf der Fehlerseite gibt es **„Trotzdem starten (mir egal)“**: Das überspringt die Prüfung und probiert es einfach. Die Wahl merkt sich der Browser (`?forcegl=1`); rückgängig geht es mit dem Knopf „Grafik-Prüfung wieder einschalten“ auf derselben Seite. Hat der Browser wirklich kein WebGL, scheitert auch der zweite Versuch – dann hilft nur die Browser-Einstellung oben oder Chromium.

**Grafik und Leistung:** Unter **Einstellungen → Grafik** gibt es Hoch, Mittel, Niedrig, Sehr niedrig und Automatisch.
Automatisch misst alle 3 Sekunden die Bildrate, schaltet unter 45 Bildern/s eine Stufe herunter und probiert später wieder eine höhere. Die gefundene Stufe wird gespeichert, damit das nächste Spiel gleich passend startet (ab „Niedrig“ auch ohne Kantenglättung).
Niedrig schaltet Schatten ab und nimmt einfachere Materialien, Sehr niedrig rechnet mit 60 % Auflösung und ohne Deko und Wolken.
Ruckelt es selbst auf „Sehr niedrig“, erscheint ein Hinweis (abschaltbar). **Häufigste Ursache auf PCs mit zwei Grafikchips:** Windows lässt den Browser auf der Prozessor-Grafik laufen. Abhilfe: Windows-Einstellungen → System → Anzeige → Grafik → Browser wählen → „Hohe Leistung“ → Browser neu starten.

Beim ersten Start fragt die **Windows-Firewall**, ob Port 5180 freigegeben werden darf. Für Mitspieler im Heimnetz mit **Zulassen (privates Netzwerk)** bestätigen.

## Steuerung
| | Spieler 1 (Tastatur + Maus) | Gamepad | Spieler 2 (Ziffernblock) |
|---|---|---|---|
| Laufen | WASD | linker Stick | Pfeiltasten |
| Springen | Leertaste | A | Num0 |
| Angriff 1 | Linksklick / J | X / RT | Num1 |
| Angriff 2 | Rechtsklick / K | B | Num2 |
| Spezial | Q / L | Y | Num3 |
| Benutzen | E | RB | Num5 |
| Emote / Markieren | T / G | Steuerkreuz | – |
| Beitreten / Pause | Esc | Start | Num-Enter |
| Menü-Tabs | Q / E | LB / RB | Num7 / Num9 |

Die Tasten von Spieler 1 lassen sich unter **Einstellungen** ändern; die Übersicht steht im Menü unter **Steuerung**.

Mit der Maus zielen die Angriffe auf den Mauszeiger, mit dem Gamepad auf den rechten Stick.
Nur echte Controller zählen: Lenkräder, Pedale oder Mikrofone, die sich als „Gamepad“ melden, werden ignoriert.

## Mehrspieler im Heimnetz (LAN)
1. Host: `start.bat` → **LAN: Spiel hosten**. Unten rechts steht die Adresse, z. B. `http://192.168.178.178:5180`.
2. Mitspieler öffnen diese Adresse im Browser (oder starten ihr eigenes Spiel und tragen die Host-Adresse ein) → **LAN: Spiele suchen** → Spiel wählen.

Der Browser des Hosts berechnet das Spiel – auch wenn der Tab im Hintergrund oder das Fenster verdeckt ist. Mitspieler schicken ihre Eingaben und sagen die Bewegung des eigenen Helden lokal voraus.
Den Welt-Fortschritt und die Schwierigkeit speichert der Host. Helden-Stufen, Gold, Upgrades, die Sammlung (Hüte, Schmuck, Seelensteine, Schurken, Fangkristalle), Statistik und Erfolge speichert jeder Spieler an seinem eigenen PC.
**Host-Wechsel:** Verlässt der Host das Spiel, übernimmt der am längsten verbundene Mitspieler die Welt, und alle spielen weiter.

## BetterPortal-Bridge
Läuft BetterPortal auf demselben PC (Port 5177), liest das Spiel das Portal (nur lesen, BetterPortal wird nicht verändert):
- Slots 1–4 → Spieler 1, Slots 5–8 → Spieler 2
- **Figur:** das Element wählt einen der beiden eigenen Helden dieses Elements (fest je Figurenname)
- **Swapper Ober- + Unterteil:** ergibt die passende Swapper-Kombination
- **Falle:** wählt einen gefangenen Schurken des Fallen-Elements
- **Magisches Item:** Portal-Segen (+25 % Schaden für 60 s)
- **Fahrzeug:** wird erkannt, Fahrzeuge gibt es im Spiel aber nicht

Jede Erkennung zeigt unten links eine Portal-Animation. Die Anzeige im Portal-Bildschirm zeigt, ob BetterPortal verbunden ist.

## Aufbau
```
server.py        aiohttp: Spieldateien, /bridge/portal (BetterPortal), /ws (LAN-Relay mit Host-Wechsel), /skystones/
src/sim/         Spiellogik ohne Grafik: world (Level, Arena, Duell, Schwierigkeit), player, combat, allies, ai (inkl. Bosse), physics (bewegte Plattformen), progress, snapshot
src/net/         host.js (World + Snapshots, Host-Wechsel), client.js (Vorhersage + Glättung), protocol.js
src/render/      Three.js: renderer (Grafikstufen, Sonne, Sterne, Gegenlicht, Gewitter), models (Swapper/Elite/Hüte, Ruhe-Animation), parts (Material- und Geometrie-Cache), merge (Zusammenfassen/Freigeben), chars_*.js (Figuren), hats, level (Bodentexturen, Deko, Pfade, Hub-Bauten), fx, camera
src/core/        input, audio (Effekte), music (prozedural), save (Profile, Sammlung, Statistik, Erfolge, Einstellungen)
src/ui/          screens (Menüs, Portal-Tabs, Schmiede-Tabs, Levelstart mit Schwierigkeit, Sammlung, Einstellungen, Ergebnisse), hud (Banner, Story, Modi)
src/data/        elements, heroes, enemies, upgrades, items, difficulty, achievements, levels/*  ← Inhalte hier erweitern
```
Level sind Datenobjekte (`src/data/levels/*.js`): Boxen (auch bewegt, `mover(...)`; `mat: 'wall'` = Mauer mit Zinnen), Gegner, Pickups (Gold, Essen, Fangkristall, Hut, Schmuck, Seelenstein, Schatz), Tore, Checkpoints, Portal-Punkte, Ziel, Story-Zeilen und optional `paths` (Trittsteine) sowie `killDepth` (Absturztiefe).
Ein neuer Held braucht einen Eintrag in `data/heroes.js` und `data/upgrades.js` sowie ein Modell in `render/chars_*.js`. Ein neuer Erfolg ist ein Eintrag in `data/achievements.js`.

Zur Fehlersuche in der Browser-Konsole: `__pde.session`, `__pde.view`, `__pde.openPause()`, `__pde.openCollection()`, `__pde.checkAchievements()`.

## Stand
**Phase 1 (fertig):**
- 4 Helden (Feuer, Wasser, Erde, Luft)
- Wolkenfeste als Basis mit Portal und Schmiede
- Welt 1: Moosklippen, Nebelmoor-Ruinen und Boss-Arena mit Moragar
- Element-Tore, Checkpoints, Sterne-Wertung, Upgrades, Speichern
- Lokaler Koop und LAN mit bis zu 4 Spielern
- BetterPortal-Bridge

**Phase 2 (fertig):**
- 16 weitere Helden (alle 10 Elemente, je 2), Stufe 20, Seelenstein-Upgrades
- Welten 2 und 3 mit 6 neuen Gegnertypen, 2 Bossen, bewegten Plattformen und Story
- Swapper, 9 fangbare Schurken, Hüte, Schmuck, Schätze, Herausforderungen
- Arena, Duell, Skystones-Tisch
- Musik und Einstellungen
- BetterPortal: Swapper, Fallen, Items, Portal-Animation
- Host-Wechsel, Emotes und Markierungen im LAN

**Phase 3 (fertig):**
- Neuer Name „Elementis“ mit Logo, Element-Ring und Untertitel; alter Spielstand wird übernommen
- Welt 4 Sturmküste: Gischtklippen, Sturmauge, Tiefenschlund mit Klippenkrabbe, Möwenpirat, Leuchtqualle, den Elite-Schurken Brack und Perla und dem Boss Kraal; 2 neue Hüte, Sturmkompass, 3 Schätze, Meer, Gewitter, 2 neue Musikstücke
- Schwierigkeitsgrade Leicht/Normal/Schwer/Albtraum
- Sammlung mit Fundorten, Statistik und 24 Erfolgen
- Optik: Bodentexturen, Erdband und mehr Deko auf allen Inseln, Trittsteine, Sonne und Sterne, helleres Licht in dunklen Welten, Boss-Licht, Kontaktschatten, Level-Banner, Cooldown-Glow, Bossleiste mit Phasen
- Wolkenfeste: Mauern mit Zinnen, Element-Fahnen, Laternen, Bänke, Welt-Bögen mit Sternen-Stand, Trophäen-Sockel mit „???“
- Figuren: Atmen und Umschauen im Stand, Blinzeln, Augen-Glanz, Element-Juwel am Rumpf, Element-Partikel beim Laufen
- Spielschleife läuft auch weiter, wenn der Host-Tab im Hintergrund oder das Fenster verdeckt ist

**Leistung (September 2026):**
- Unbewegliche Levelteile und die Teile jeder Figur werden zu wenigen Meshes zusammengefasst (`render/merge.js`): etwa ein Drittel der Draw-Calls
- Geometrien werden geteilt und beim Levelwechsel freigegeben (vorher wuchs der Grafikspeicher mit jedem Level)
- Ein festes Boss-Licht statt eines neuen Lichts pro Boss: keine Shader-Neuübersetzung beim Bosskampf
- Neue Stufe „Sehr niedrig“, einfache Materialien ab „Niedrig“, die Automatik merkt sich die Stufe und kann wieder hochschalten
- Fehler behoben: Im Hintergrund stauten sich zusätzliche Bildschleifen auf, die danach alle gleichzeitig liefen
