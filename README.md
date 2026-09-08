# ChessLynx — React Native/Expo-Grundgerüst

Dies ist der in `konzept/technisches_konzept.md` (Abschnitt 9, Schritte 1–3) und
`konzept/mvp_priorisierung.md` empfohlene erste Schritt: ein kleines Expo-Grundgerüst
mit Navigation, Eltern-Gate, Firebase-/Offline-Anbindung und **Quest 1 als portiertem
Vertikal-Prototyp, jetzt mit echter `chess.js`-Zuglogik statt der im Web-Prototyp fest
kodierten Zug-Szenarien** — genau die Lücke, die `technisches_konzept.md` Abschnitt 1a
benennt.

## Wichtig: In dieser Umgebung nicht ausführbar geprüft

Ich habe diesen Code geschrieben, aber **nicht** mit `npm install` / `expo start`
getestet — die Umgebung, in der ich arbeite, hat keinen Internetzugriff, um Pakete
herunterzuladen oder einen Expo-Dev-Server zu starten. Das heißt konkret:

- Die TypeScript-Logik (`src/lib/chessEngine.ts`) ist inhaltlich korrekt durchdacht
  und die chess.js-API korrekt verwendet, aber **nicht durch einen echten Test-Lauf
  bestätigt**. Bitte nach `npm install` einmal die auskommentierten Beispiele am Ende
  der Datei ausprobieren, bevor du darauf aufbaust.
- Typo-/Versions-Fehler in `package.json` (chess.js-API ändert sich zwischen Versionen
  teilweise) können erst beim ersten echten Build auffallen.

## Setup

```bash
npm install
npx expo start
```

Zum Testen auf dem eigenen Handy: Expo-Go-App installieren, QR-Code scannen (siehe
`technisches_konzept.md` Abschnitt 8 — das ist der kostenlose erste Testweg vor jeder
Store-Gebühr).

Firebase ist bereits eingerichtet: Echtes Projekt "ChessLynx" (Spark-Tarif), Web-App
registriert, E-Mail/Passwort-Anmeldung aktiviert, Firestore-Datenbank (Standort eur3/
Europa) angelegt und die Sicherheitsregel veröffentlicht — die echten Config-Werte
stehen bereits in `src/lib/firebase.ts` (Stand 2026-09-04). Kein manueller Schritt vor
dem ersten Start mehr nötig.

## Was hier fertig ist

- Projekt-Grundgerüst (`package.json`, `app.json`, `babel.config.js`, `tsconfig.json`)
- Navigation mit Trennung Kind-/Elternbereich (`src/navigation/RootNavigator.tsx`)
- Eltern-Gate: Halten+Wischen-Geste, dann Rechenaufgabe (`src/screens/ParentGate.tsx`)
- Firebase-Grundgerüst + Datenmodell-Typen 1:1 aus `technisches_konzept.md` Abschnitt 5
  übertragen (`src/lib/firebase.ts`)
- Offline-first Fortschrittsspeicherung mit AsyncStorage (`src/lib/storage.ts`) —
  Firestore-Sync selbst ist als klar markiertes TODO hinterlegt, da sie einen
  bestehenden Login-Flow voraussetzt
- **`chess.js`-Wrapper** (`src/lib/chessEngine.ts`), der echte Legalzüge liefert statt
  hart kodierter Arrays
- **Quest 1, Screens 0/1/2/4/5/7**, mit dem Board auf Basis der echten chess.js-Züge
- **Lizenzhinweise** für das Cburnett-Schachfiguren-Set (CC BY-SA 3.0) und `chess.js`
  (BSD-2-Clause): vollständiger Text in `NOTICE.md`, Kurzfassung im In-App-Screen
  `src/screens/Credits.tsx`, erreichbar über einen Link auf dem Eltern-Dashboard. Der
  chess.js-Lizenztext in `NOTICE.md` ist inzwischen (2026-09-04) 1:1 gegen die
  tatsächlich installierte `node_modules/chess.js/LICENSE` abgeglichen.
- **Eltern-Konto-Login** (`src/lib/auth.ts`, `src/screens/ElternLogin.tsx`): E-Mail/
  Passwort-Anmeldung und -Registrierung über Firebase Auth, mit
  `getReactNativePersistence` (Login übersteht App-Neustarts). Neue Zwischenroute
  `ElternBereich` (`RootNavigator.tsx`) entscheidet nach dem Eltern-Gate anhand des
  Anmeldestatus zwischen `ElternLogin` und `ParentDashboard`.
- **Firestore-Sync** (`src/lib/storage.ts`): `syncPendingProgress()` ist keine
  Platzhalterfunktion mehr, sondern schreibt die lokale Warteschlange echt gegen
  Firestore; `getOrCreateAktivesKindId()` legt beim ersten Login ein Kinderprofil an
  bzw. findet ein bestehendes wieder. Läuft jetzt gegen das echte Firebase-Projekt
  (siehe `src/lib/firebase.ts`) — bereit für den ersten echten End-to-End-Test.

## Was hier bewusst NICHT fertig ist

- **Quest 1, Screen 3** (Doppelschritt-Erklärung als eigener Screen) und **Screen 6**
  (3-Runden-Mini-Spiel mit Sterne-Auswertung) — beide fehlen, weil sie zusätzliche
  Zähl-/Auswertungslogik brauchen, die laut `aufwandsschaetzung_mvp_rollout.md` erst mit
  den echten MVP-Kern-Assets sinnvoll ist. Vollständiges Referenz-Verhalten: siehe
  `prototyp/client/src/quest1/Quest1.tsx` im Web-Prototyp.
- **Verwandlungsmoment-Animation** (Tier → Cburnett-Schachfigur, siehe
  `entscheidungsliste_offene_punkte.md` Punkt 15) — braucht die Cburnett-SVGs, die noch
  nicht in dieses Grundgerüst eingebunden sind.
- **Quest 2–6** in React Native — nächster Schritt, sobald das Muster hier (Board +
  chessEngine + Quest-Screen-Flow) sich im echten Test bewährt hat. Web-Prototyp-Logik
  für 2–6 liegt bereits vor (`prototyp/client/src/quest2` … `quest6`).
- Finale Illustrationen — Board/Figuren sind aktuell einfache Formen/Farbflächen, keine
  Igel-/Schachfiguren-Grafiken (das ist reiner Asset-Austausch, keine Logik-Änderung)

## Bekannte Bug-Muster aus dem Web-Prototyp (README des Gesamtpakets)

Beim Weiterbau aktiv gegenprüfen, nicht erst bei erneutem Auftreten:

1. `useEffect`-Abhängigkeiten auf Board-Positionen müssen primitive Werte sein, nicht
   Objektreferenzen.
2. Mehrschrittige Abschluss-Logik (Mini-Spiele) braucht explizite Zähler mit fester
   Ziel-Anzahl.
3. Wiederspielbare Screens mit festem Ausgangspunkt brauchen ein Reset-Tick/Key-Remount.
4. Aria-Label-Priorität: spezifischere Feldrolle zuerst prüfen, wenn zwei Feldrollen
   zusammenfallen.

## Ein während der Portierung gefundener und behobener Fehler

Beim Übertragen der Screen-2/4/5-Logik ist aufgefallen, dass `chess.js` von einem
unbewegten Bauern korrekt **beide** Vorwärtsfelder (Einzel- und Doppelschritt) sowie
den korrekten Diagonal-Schlagzug liefert — die ursprüngliche Fenster-Berechnung im
Board-Ausschnitt deckte das Doppelschritt-/Stopp!-Zielfeld nicht ab, und eine erste
Fassung der Screen-5-Teststellung platzierte die gegnerische Figur auf einem Feld, das
ein e2-Bauer gar nicht schlagen kann (d4 statt f3). Beides ist in der aktuellen Fassung
von `src/quest1/Quest1.tsx` und `src/lib/chessEngine.ts` korrigiert; erwähnt hier, falls
beim ersten echten Testlauf trotzdem noch ein Rand-Fall auffällt.
