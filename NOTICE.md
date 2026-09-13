# Lizenzhinweise / Third-Party Notices

> Diese Datei erfüllt den in `projektwissen.md` ("Eltern-Bereich & Rechtliches") und
> `priorisierter_umsetzungsplan.md` (Phase 1) vorgesehenen Lizenzhinweis für die beiden
> Drittanbieter-Bestandteile der App. Der gleiche Text wird im In-App-Credits-Screen
> (`src/screens/Credits.tsx`, erreichbar über einen Link im Eltern-Bereich) angezeigt.

## Schachfiguren-Illustrationen (Cburnett-Set)

Die Schachfiguren-Grafiken, die ab dem Verwandlungsmoment in jeder Quest angezeigt
werden (`src/lib/chessPieces.tsx`), stammen vom **Cburnett-Schachfiguren-Set** von
**Colin M. L. Burnett**, veröffentlicht auf Wikimedia Commons.

- **Lizenz:** Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)
- **Lizenztext:** https://creativecommons.org/licenses/by-sa/3.0/
- **Quelle:** https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces
- **Änderungen:** Original-Pfaddaten und Original-Farben (Weiß/Schwarz-Kontur)
  unverändert übernommen, keine inhaltlichen Änderungen an den Figuren selbst — nur
  technische Einbindung als `react-native-svg`-Komponenten.

Empfohlener In-App-Attributionstext (kurz, für den Credits-Screen):

> "Schachfiguren-Illustrationen: Cburnett-Set von Colin M. L. Burnett, Wikimedia
> Commons, lizenziert unter CC BY-SA 3.0."

**Zu beachten (ShareAlike):** Sollten die Figuren-Grafiken selbst je verändert
("derivative work") statt nur eingebunden werden, müsste dieses veränderte Werk unter
derselben Lizenz (CC BY-SA 3.0) weitergegeben werden. Reine Verwendung unveränderter
Original-Grafiken in einer App löst diese Pflicht nicht aus, die Attribution oben
bleibt aber in jedem Fall Pflicht.

## Zuglogik (chess.js)

Die Schach-Zuglogik (Legalzug-Berechnung, siehe `src/lib/chessEngine.ts`) basiert auf
der Bibliothek **chess.js** von **Jeff Hlywa**.

- **Lizenz:** BSD 2-Clause License
- **Quelle:** https://github.com/jhlywa/chess.js
- **Verwendung:** unverändert als Abhängigkeit eingebunden (`package.json`,
  `"chess.js": "^1.4.0"`), kein eigener Fork/keine Code-Änderung an der Bibliothek
  selbst.

Empfohlener In-App-Attributionstext (kurz, für den Credits-Screen):

> "Schach-Zuglogik: chess.js von Jeff Hlywa, BSD-2-Clause-Lizenz."

**Lizenztext — abgeglichen mit der tatsächlich installierten Datei
`node_modules/chess.js/LICENSE` (2026-09-04, nach echtem `npm install` im lokalen
Projekt):**

```
Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

## Animationsdarstellung (lottie-react-native)

Die Umgebungsanimationen auf der Luchsrevier-Karte werden von **lottie-react-native**
dargestellt (Airbnb bzw. die heutige Community-Maintainer-Gruppe).

- **Lizenz:** Apache License, Version 2.0
- **Lizenztext:** https://www.apache.org/licenses/LICENSE-2.0
- **Quelle:** https://github.com/lottie-react-native/lottie-react-native
- **Verwendung:** unverändert als Abhängigkeit eingebunden (`package.json`,
  `lottie-react-native`), kein Fork, keine Änderung am Bibliothekscode.

**Hinweis zu den Animationsdateien selbst:** Die vier Bodymovin-Dateien unter
`assets/lottie/` (Baumwiegen, Glühwürmchen, Wasserglanz, Vogelauffliegen) sind
Eigenerzeugnisse von ChessLynx in den Markenfarben — kein Fremdmaterial, keine
LottieFiles-Downloads, damit auch keine fremden Lizenzbedingungen.

**Zu beachten (Apache 2.0):** Die Lizenz verlangt, dass Lizenztext und Urheberrechts-
hinweis bei der Weitergabe mitgeliefert werden, und dass Änderungen am Bibliothekscode
kenntlich gemacht werden. Beides ist erfüllt: Die Bibliothek wird unverändert verwendet,
der Hinweis steht hier und in `src/screens/Credits.tsx`.

## Wo diese Hinweise in der App erscheinen

- **In-App:** `src/screens/Credits.tsx`, erreichbar über einen "Lizenzen"-Link auf dem
  Eltern-Dashboard (`ParentDashboardPlaceholder` in `src/navigation/RootNavigator.tsx`).
- **Store-Listings (noch offen, Phase 4):** Apple/Google verlangen teils zusätzlich
  Open-Source-Hinweise in den Store-Metadaten bzw. einer separaten Rechtsseite — bei der
  Store-Einreichung gegenprüfen, ob der In-App-Screen dafür ausreicht.
