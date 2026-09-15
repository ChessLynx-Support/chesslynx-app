// Dünner Wrapper um chess.js (BSD-2-Clause), siehe konzept/technisches_konzept.md Abschnitt 1a.
//
// Zweck: ersetzt die im Web-Prototyp fest kodierten "legalTargets"-Arrays pro Screen
// (siehe prototyp/client/src/quest1/Quest1.tsx) durch echte, von chess.js abgeleitete
// Legalzüge. Die App zeigt nie algebraische Notation an — die Umrechnung {row, col} <-> "e4"
// passiert ausschließlich hier, nicht in der UI.
//
// STATUS: Alle sechs Quest-Stellungen (QUEST1_POSITIONS bis QUEST6_POSITIONS) sind
// durch einen echten Testlauf bestätigt — sowohl per `node verify/test-questN-logic.cjs`
// gegen das echte, installierte chess.js, als auch durch manuelles Durchklicken im
// Browser (npm install + expo start, Web-Modus). Siehe auch
// claude/entwicklungsstatus_grundgeruest.md im Projekt für den vollständigen Stand.
//
// Nachtrag (2026-09-09): die Endlosmodus-Stellungen ganz unten in dieser Datei
// (EICHHOERNCHEN_*, FUCHSBAU_*, DACHSHOEHLE_*, ADLERHORST_*, WOLFSFESTE_*) wurden mangels
// eines in dieser Sandbox installierbaren chess.js zunächst gegen einen eigens dafür
// geschriebenen, vollständigen Legalzug-Prüfer verifiziert (dasselbe bewährte Vorgehen wie
// bei MATT_IN_3_POSITIONEN, siehe dortiger Kommentar) — 27 von 27 Prüfungen bestanden, nach
// Korrektur von sechs beim ersten Durchlauf gefundenen Fehlern (u. a. eine Fesselungsfigur,
// die versehentlich der falschen Farbe zugeordnet war, und zwei falsch platzierte Wächter-
// Figuren, die kein echtes Schach erzeugten). `verify/test-endlosmodus-logic.cjs` prüft
// dieselben Stellungen zusätzlich gegen das echte, installierte chess.js — `npm test` auf
// dem eigenen Rechner ist die abschließende Bestätigung.

import { Chess, type Square as AlgebraicSquare } from "chess.js";

export type BoardSquare = { row: number; col: number };

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/**
 * Wandelt {row, col} (row 0 = oberste Zeile wie im bisherigen Web-Prototyp,
 * col 0 = linke Spalte) in algebraische Notation um. Reine interne Hilfsfunktion,
 * wird dem Kind nie angezeigt.
 */
export function toAlgebraic(sq: BoardSquare): AlgebraicSquare {
  const file = FILES[sq.col];
  const rank = 8 - sq.row;
  return `${file}${rank}` as AlgebraicSquare;
}

export function fromAlgebraic(a: AlgebraicSquare): BoardSquare {
  const file = a[0];
  const rank = Number(a[1]);
  return { row: 8 - rank, col: FILES.indexOf(file) };
}

/**
 * Erstellt eine chess.js-Partie aus einer FEN. chess.js verlangt eine vollständig
 * gültige Stellung (u. a. beide Könige) — für kuratierte Lern-Szenen genügt daher
 * meist "ein König + die Übungsfigur(en) + gegnerischer König irgendwo neutral",
 * siehe Beispiel-FENs weiter unten.
 */
export function createPosition(fen: string): Chess {
  // `skipValidation`, weil die Übungsstellungen der sechs Quests BEWUSST KEINE KÖNIGE
  // enthalten (siehe den Block über QUEST1_POSITIONS). chess.js besteht sonst auf je einem
  // König pro Seite und wirft `Invalid FEN: missing black king`.
  //
  // Die Abschaltung ist hier ungefährlich, weil `createPosition` AUSSCHLIESSLICH von
  // `lib/QuestMoveScreen.tsx` benutzt wird (drei Aufrufstellen, am 2026-09-14 projektweit
  // geprüft). Bonuskapitel, Endlosmodus, Freispiel und die Schach-/Matt-Screens von Quest 6
  // laden ihre Stellungen über eigene Wege und behalten die volle Validierung.
  return new Chess(fen, { skipValidation: true });
}

/**
 * Liefert alle legalen Zielfelder für die Figur auf `from`, als {row, col}-Liste —
 * genau das, was Board.tsx bisher als hart kodiertes `legalTargets` bekam.
 */
export function legalTargetsFor(game: Chess, from: BoardSquare): BoardSquare[] {
  const moves = game.moves({ square: toAlgebraic(from), verbose: true });
  return moves.map((m) => fromAlgebraic(m.to as AlgebraicSquare));
}

export type MoveResult = {
  ok: boolean;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  fenAfter: string;
};

/**
 * Führt einen Zug aus und liefert die für die UI relevanten Flags zurück
 * (z. B. um den "Schach"/"Matt"-Sprachhinweis auszulösen, siehe Quest 6-Spezifikation).
 */
export function tryMove(game: Chess, from: BoardSquare, to: BoardSquare): MoveResult {
  try {
    const move = game.move({ from: toAlgebraic(from), to: toAlgebraic(to), promotion: "q" });
    if (!move) {
      return { ok: false, isCapture: false, isCheck: false, isCheckmate: false, isStalemate: false, fenAfter: game.fen() };
    }
    return {
      ok: true,
      isCapture: Boolean(move.captured),
      isCheck: game.inCheck(),
      isCheckmate: game.isCheckmate(),
      isStalemate: game.isStalemate(),
      fenAfter: game.fen(),
    };
  } catch {
    // chess.js wirft bei strukturell unmöglichen Zügen statt null zurückzugeben —
    // für die Lern-App zählt beides als "kein legaler Zug" (z. B. Stopp!-Aufgabe).
    return { ok: false, isCapture: false, isCheck: false, isCheckmate: false, isStalemate: false, fenAfter: game.fen() };
  }
}

/**
 * Kuratierte Beispiel-Stellungen für Quest 1 (Bauer/Igel), passend zu den Screens
 * aus prototyp/client/src/quest1/Quest1.tsx. Weiße Bauern/König stehen für den Igel,
 * der schwarze König ist reine Pflichtfigur für eine gültige FEN und taucht in der
 * UI nicht auf (kein Gegner-Rendering für Screen 2/3).
 */
/**
 * Zugseite zurück auf Weiß patchen — die Übungsfigur soll sofort wieder ziehen dürfen.
 *
 * 2026-09-14 aus `QuestMoveScreen.tsx` hierher verlegt: zusammen mit `waehleVorschlagZiel`
 * bildet diese Funktion die Übungsschleife, und genau deren Zusammenspiel hat den Absturz
 * vom 2026-09-14 erzeugt (siehe Block über QUEST1_POSITIONS). In einer TSX-Datei mit
 * React-Importen war sie von `verify/*.cjs` aus nicht ladbar und damit ungetestet. Hier ist
 * sie es — `verify/test-quest-uebungsschleife.cjs` spielt die Schleife durch.
 */
export function mitWeissAmZug(fen: string): string {
  const teile = fen.split(" ");
  teile[1] = "w";
  return teile.join(" ");
}

// Bugfix (2026-09-10, Kurztest-Feedback: "Turm bleibt hängen bei der Eichel", "Läufer:
// die Eichel sollte nicht nur [auf einem] entfernten [Feld] liegen"): `vorschlagZiel` nahm
// bisher IMMER `legalTargets[0]` — die Reihenfolge, in der chess.js legale Zielfelder
// liefert, ist ein reines Bibliotheks-Detail (siehe android_geraetetest_2026-09-09.md,
// Punkt 12: alle Linienfelder VOR allen Reihenfeldern) und zeigte dadurch über alle
// Übungsrunden hinweg immer dieselbe Richtung (Turm: nur die a-Linie hinauf) bzw. beim
// Läufer bevorzugt das am weitesten entfernte Feld einer Diagonale statt eines in der Nähe.
// Der damals dokumentierte, aber nie umgesetzte Fix-Vorschlag ("zwischen den tatsächlich
// nutzbaren Richtungen abwechseln") ist jetzt hier tatsächlich umgesetzt, und zwar generisch
// über die Vorzeichen der Zeilen-/Spaltendifferenz zur aktuellen Position — funktioniert
// dadurch gleichermaßen für Turm (4 Richtungen), Läufer (4 Diagonalen), Dame (8) und in
// abgeschwächter Form auch den Springer (mehrere Sprünge können sich einen Vorzeichen-
// "Oktanten" teilen, was hier keinen Schaden anrichtet, da ohnehin nur EIN Zielfeld pro
// Runde vorgeschlagen wird).
//
// Zweiter Bugfix (2026-09-10, Kurztest-Feedback nach dem ersten Fix: "Auch hier ist die
// Eichel immer direkt ein Feld weiter"): Die erste Fassung wählte innerhalb der gewählten
// Richtung IMMER das nächstgelegene Feld. Für Turm/Läufer/Dame ist das nächstgelegene Feld
// einer freien Linie aber rein geometrisch IMMER genau ein Feld entfernt (jedes Feld davor
// wäre sonst selbst schon blockiert und käme als Legalzug gar nicht erst vor) — die Eichel
// zeigte dadurch ausnahmslos jede Runde einen Ein-Feld-Schritt, nie einen weiteren Zug über
// mehrere Felder. Jetzt wandert der Abstand INNERHALB einer Richtung mit jedem vollen
// Durchlauf aller Richtungen eine Stufe weiter (`tiefe` unten) — Runde 0..n-1 zeigt jede
// Richtung einmal ganz nah, danach (Runde n..2n-1) jede Richtung einen Schritt weiter usw.,
// gedeckelt auf das jeweils am weitesten entfernte tatsächlich vorhandene Feld dieser
// Richtung.
export function waehleVorschlagZiel(
  legalTargets: BoardSquare[],
  von: BoardSquare,
  rundenIndex: number
): BoardSquare | undefined {
  if (!legalTargets.length) return undefined;

  const richtungsSchluessel = (ziel: BoardSquare) =>
    `${Math.sign(ziel.row - von.row)},${Math.sign(ziel.col - von.col)}`;

  const richtungen: string[] = [];
  for (const ziel of legalTargets) {
    const schluessel = richtungsSchluessel(ziel);
    if (!richtungen.includes(schluessel)) richtungen.push(schluessel);
  }

  // Gerätetest 2026-09-11 (Nutzer: "Die Haselnuss liegt meist direkt an Läufer, Turm, Dame
  // dran. Sie sollte häufig weit oder ganz weit weg sein."): bisher wuchs der Abstand erst
  // nach einem vollen Durchlauf aller Richtungen — bei 5 Übungsrunden und bis zu 8 Richtungen
  // blieb die Nuss deshalb praktisch immer auf dem Nachbarfeld. Jetzt:
  //  - bevorzugt werden Richtungen mit langem freien Weg (mind. 3 Felder), reihum,
  //  - der Abstand folgt einem festen Muster mit Schwerpunkt auf weit/ganz weit.
  // Für Figuren mit nur einem Schritt je Richtung (König, Bauer, Springer) ändert sich nichts.
  const feldAbstand = (ziel: BoardSquare) => Math.max(Math.abs(ziel.row - von.row), Math.abs(ziel.col - von.col));
  const laengeJeRichtung = (r: string) =>
    Math.max(...legalTargets.filter((z) => richtungsSchluessel(z) === r).map(feldAbstand));
  const langeRichtungen = richtungen.filter((r) => laengeJeRichtung(r) >= 3);
  const auswahlRichtungen = langeRichtungen.length ? langeRichtungen : richtungen;
  const gewaehlteRichtung = auswahlRichtungen[rundenIndex % auswahlRichtungen.length];
  const kandidaten = legalTargets
    .filter((ziel) => richtungsSchluessel(ziel) === gewaehlteRichtung)
    .sort((a, b) => feldAbstand(a) - feldAbstand(b));

  // Abstands-Muster je Runde: ganz weit, weit, mittel, ganz weit, weit … (als Anteil des
  // längsten Feldes dieser Richtung; 1 = ganz außen).
  const ABSTANDS_MUSTER = [1, 0.67, 0.5, 1, 0.67];
  const anteil = ABSTANDS_MUSTER[rundenIndex % ABSTANDS_MUSTER.length];
  const index = Math.max(0, Math.min(kandidaten.length - 1, Math.round(anteil * (kandidaten.length - 1))));
  return kandidaten[index];
}

/**
 * ÜBUNGSSTELLUNGEN DER SECHS QUESTS — BEWUSST OHNE KÖNIGE (2026-09-14).
 *
 * Diese Stellungen lehren EINE Figur und ihre Bewegung, sonst nichts. Könige waren darin nie
 * Lehrinhalt, sondern nur Füllfiguren, weil chess.js sie sonst nicht lud. Genau daraus sind
 * drei Fehler entstanden:
 *
 *  1. 2026-09-08: Der weiße Füllkönig stand auf e1 und blockierte die angeblich freie
 *     1. Reihe — der Turm war "ab e-h nicht auswählbar". Behoben, indem er nach h4 zog.
 *  2. 2026-09-10: Derselbe Fehler steckte noch in zwei weiteren Stellungen, beim ersten Fix
 *     übersehen. Nochmals behoben.
 *  3. 2026-09-14 (Gerätetest, ABSTURZ): Seit die Vorschlags-Eichel weite Felder bevorzugt,
 *     zieht das Kind den Turm nach a8 — Schach für den schwarzen König auf e8. Die
 *     Übungsschleife setzt die Zugseite danach zurück auf Weiß (`mitWeissAmZug` in
 *     QuestMoveScreen.tsx), wodurch eine nach Schachregeln UNMÖGLICHE Stellung entsteht:
 *     Schwarz im Schach, Weiß am Zug. chess.js lädt die klaglos und bietet folgerichtig an,
 *     den König zu schlagen. Die Eichel zeigte auf genau dieses Feld; nach `Rxe8` enthielt
 *     die FEN keinen schwarzen König mehr und `createPosition` warf
 *     `Invalid FEN: missing black king` — die App stürzte ab. Gemessen und reproduziert.
 *
 * Alle drei haben dieselbe Wurzel: eine Figur auf dem Brett, die dort inhaltlich nichts zu
 * suchen hat. Ohne Könige gibt es kein Schach, keinen schlagbaren König, keine unmögliche
 * Stellung — und die Übungsfigur erreicht wirklich jedes Feld, das ihr Zugmuster erlaubt.
 * Das ist zugleich der pädagogische Zweck: Das Kind soll spüren, wie weit Turm, Läufer und
 * Dame ziehen und wie der Springer springt.
 *
 * PREIS: `createPosition` lädt mit `skipValidation` (siehe dort). Die Flags `isCheck` /
 * `isCheckmate` / `isStalemate` aus `tryMove` sind in kingless Stellungen ohne Aussage —
 * `QuestMoveScreen.tsx` wertet sie nicht aus (am 2026-09-14 geprüft), aber wer sie dort
 * künftig benutzen will, muss das hier zuerst lesen.
 *
 * AUSGENOMMEN: `QUEST6_POSITIONS.schachBruecke` und `.mattMoment` behalten ihre Könige —
 * dort IST Schach der Lehrinhalt, und sie laufen über `quest6/SchachAufgabe.tsx`, nicht über
 * QuestMoveScreen. In QUEST6_POSITIONS.screen2/screen4Check/screen5Capture bleibt der WEISSE
 * König stehen: Er ist dort die Übungsfigur.
 */
export const QUEST1_POSITIONS = {
  // Screen 2: einfacher Schritt geradeaus, Bauer noch nicht gezogen -> auch Doppelschritt legal.
  //
  // Bugfix (2026-09-08, Nutzer-Feedback nach Gerätetest: "Kannst du das noch ein paar Mal?
  // funktioniert, aber am Ende geht es nicht weiter"): der schwarze König — reine
  // Pflichtfigur für eine gültige FEN, siehe Datei-Kommentar oben, taucht in der UI nie auf
  // — stand hier bisher auf e8, also GENAU auf der e-Linie, die der übende Bauer bei der
  // neuen mehrrundigen Übungsphase (siehe QuestMoveScreen.tsx uebungsrunden, Quest1.tsx
  // Screen 2) Zug für Zug hinaufwandert. Ein Bauer darf niemals auf ein besetztes Feld
  // ziehen (nur diagonal schlagen) — sobald der Bauer e7 erreichte, lieferte
  // legalTargetsFor für e8 (vom eigenen König blockiert) ein LEERES Array: keine
  // Zielfelder mehr, die Übung blieb nach der vorletzten Runde stecken, ohne dass ein
  // Fehler sichtbar wurde. König jetzt auf h8 (analog zum bereits an anderer Stelle
  // etablierten Muster "König auf einem Feld, das garantiert außerhalb des Übungswegs
  // liegt", siehe z. B. QUEST1_POSITIONS.screen5Capture-Kommentar zu h1) — der Bauer kann
  // dadurch ungehindert bis zur Umwandlung auf e8 durchziehen (`tryMove` fordert dort via
  // `promotion: "q"` korrekt eine Dame an, sobald die Übungsrundenzahl das ausschöpft).
  // Korrektur (2026-09-09, Nutzer-Feedback): "harmlos" war hier FALSCH eingeschätzt — bei
  // einem Doppelschritt als erstem Zug erreichte der Bauer die Umwandlung bereits eine
  // Übungsrunde zu früh, wodurch die anschließende letzte Runde sichtbar Damen-Zielfelder
  // anbot, während weiterhin nur das Bauern-Icon gezeichnet wurde. Als Fix hier zunächst
  // nur dokumentiert, aber nicht tatsächlich umgesetzt — Quest1.tsx behielt `uebungsrunden={5}`
  // bei, der Bug bestand deshalb nach einem erneuten Gerätetest weiterhin ("zieht zu weit").
  // Tatsächlich behoben (2026-09-09, zweite Runde): Quest1.tsx Screen 2 jetzt wirklich auf
  // `uebungsrunden={4}` umgestellt, siehe dortiger Bugfix-Kommentar an der Aufrufstelle.
  screen2: "8/8/8/8/8/8/4P3/8 w - - 0 1",
  // Screen 4: Blockade DIREKT vor dem Bauern (e3) -> der Bauer hat dadurch KEINEN
  // legalen Zug mehr (weder Einzel- noch Doppelschritt, da e3 den Weg für beide sperrt).
  // Korrektur (Opus-Review, 2026-09-07, Abschnitt 3.2 "Didaktische Progression", siehe
  // claude/review_logik_grafik_audiofuehrung.md): Die vorherige Fassung blockierte e4
  // (nur den Doppelschritt) — das Kind kennt den Doppelschritt zu diesem Zeitpunkt aber
  // gar nicht (Screen 3 dazu ist bewusst nicht Teil dieses Grundgerüsts, siehe Quest1.tsx-
  // Kommentar zum Umfang), die Lektion hatte also keinen Bezugspunkt. Blockade jetzt auf
  // e3 (der einzige Zug, den Screen 2 gelehrt hat) macht die Stopp!-Aufgabe inhaltlich
  // stimmig: "eine Figur im Weg verhindert den Zug, den du gerade gelernt hast". Dass
  // dadurch KEIN legaler Zug mehr existiert, ist bewusst und unproblematisch, seit
  // Befund 1.3 (onTrapTap führt jetzt zuverlässig weiter) umgesetzt ist — der Screen wird
  // dadurch zu einer reinen, aber vollständig lösbaren Stopp!-Demonstration (siehe
  // Quest1.tsx Screen 4: trapAt/blockerAt zeigen jetzt auf e3 statt e4).
  // Update (2026-09-07, Nutzer-Feedback, weiterhin gültig): Blocker als WEISSE (eigene)
  // Figur (N statt n) — eine Blockade-Stelle soll immer eine eigene Figur zeigen, nicht
  // eine gegnerische (siehe Board.tsx-Kommentar zu blockerAt/blockerIcon). Für die
  // Zuglogik macht die Farbe keinen Unterschied.
  screen4Blocked: "8/8/8/8/8/4N3/4P3/8 w - - 0 1",
  // Screen 5: gegnerische Figur schräg vorne (f3) -> legalTargetsFor enthält
  // automatisch das Schlagfeld, weil chess.js Bauern-Schlagzüge korrekt generiert.
  // Wichtig: ein e2-Bauer schlägt nur auf d3/f3 (ein Feld diagonal), nicht auf d4/f4 —
  // eine frühere Fassung dieser FEN hatte die Figur fälschlich auf d4 platziert.
  //
  // Bugfix (gefunden durch verify/test-quest1-logic.cjs im echten chess.js-Testlauf):
  // Der Springer auf f3 schlägt nicht nur diagonal auf e2/g2 usw., sondern deckt auch
  // e1 ab (Springer-Sprungmuster) — mit dem weißen König auf e1 stand Weiß hier bereits
  // im Schach, BEVOR das Kind überhaupt zieht. chess.js hat das korrekt erkannt und
  // e3/e4 (die reinen Bewegungszüge) automatisch als illegal verworfen, weil sie das
  // Schach nicht auflösen — nur der Schlagzug auf f3 blieb übrig. Für die App unbemerkt
  // geblieben, weil dieser Screen ohnehin nur den Schlagzug anbietet (onlyDiagonal-
  // Filter), aber inhaltlich falsch: die Szene sollte ein neutrales Übungsfeld sein,
  // kein verstecktes Schach. König jetzt auf h1 (außerhalb des Springer-Zielmusters),
  // Rest der Stellung unverändert.
  screen5Capture: "8/8/8/8/8/5n2/4P3/8 w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 2 (Turm/Schildkröte). Turm steht durchgehend
 * auf a1 (real row 7, col 0), damit ein einziges festes Anzeigefenster (siehe
 * rowOffset/colOffset in Quest2.tsx) für alle Screens funktioniert — analog zum e2-Bauern
 * in Quest 1.
 */
export const QUEST2_POSITIONS = {
  // Screen 2: offene Bahn -> Turm darf beliebig weit senkrecht (a-Linie) UND waagerecht
  // (die komplette 1. Reihe) ziehen.
  //
  // Bugfix (Kurztest-Feedback 2026-09-10: "Turm ist ab e-h nicht als Zug auswählbar und
  // die Auswahl abgeschnitten"): genau derselbe Fehler wie bei screen4Blocked unten (siehe
  // dortiger, bereits 2026-09-08 behobener Bugfix-Kommentar) steckte hier ebenfalls noch —
  // der eigene König stand auf e1, mitten auf der angeblich offenen 1. Reihe.
  // legalTargetsFor lieferte für den Turm dadurch nur b1/c1/d1 (plus die volle a-Linie),
  // e1-h1 waren durch den eigenen König blockiert; exakt das vom Kind beobachtete
  // "ab e-h nicht auswählbar, abgeschnitten". Beim damaligen Fix von screen4Blocked wurde
  // dieselbe Ursache hier übersehen, weil screen2 und screen5Capture (siehe dort) absichtlich
  // ungeprüft "as-is" beibehalten wurden. König jetzt ebenfalls auf h4 (dasselbe etablierte
  // Muster "König auf einem Feld außerhalb des Übungswegs") — die 1. Reihe ist dadurch jetzt
  // tatsächlich komplett frei bis h1.
  screen2: "8/8/8/8/8/8/8/R7 w - - 0 1",
  // Screen 4: eigener Bauer auf a3 blockiert die Linie nach zwei freien Feldern (a2) ->
  // chess.js liefert a2 + die freie 1. Reihe als Legalzüge, a3 (und alles dahinter) bleibt
  // nicht erreichbar. a3 selbst ist das Stopp!-Zielfeld (dort steht ja schon eine Figur,
  // "darüber hinweg" ist gemeint, siehe SCREEN_SCRIPTS).
  //
  // Bugfix (Nutzer-Testlauf 2026-09-08, echtes `npm test`): Der eigene König stand hier
  // (anders als in diesem Kommentar seit jeher behauptet) auf e1, mitten auf der
  // angeblich "freien 1. Reihe" — legalTargetsFor lieferte deshalb tatsächlich nur
  // a2/b1/c1/d1, e1-h1 waren durch den eigenen König blockiert. Vermutlich beim
  // Vereinheitlichen der Königsposition über screen2/screen5Capture (die e1 absichtlich
  // brauchen, siehe deren Kommentare) versehentlich auch hier übernommen. König jetzt auf
  // h4 (analog zum bereits etablierten Muster "König auf einem Feld außerhalb des
  // Übungswegs", siehe QUEST1_POSITIONS.screen5Capture-Kommentar) — die 1. Reihe ist
  // dadurch tatsächlich, wie beabsichtigt, komplett frei bis h1.
  screen4Blocked: "8/8/8/8/8/P7/8/R7 w - - 0 1",
  // Screen 5: gegnerischer Springer auf a4, Weg dorthin frei -> a4 ist ein echter,
  // legaler Schlagzug.
  //
  // Bugfix (Kurztest-Feedback 2026-09-10, siehe screen2-Kommentar oben): derselbe
  // e1-blockiert-die-1.-Reihe-Fehler. König jetzt auf h4, in derselben Reihe wie der
  // Springer auf a4 untergebracht ("n6K") — geprüft, dass der Springer von a4 aus h4 NICHT
  // angreift (Sprungmuster von a4: b6/b2/c5/c3), der weiße König steht dort also nicht im
  // Schach.
  screen5Capture: "8/8/8/8/n7/8/8/R7 w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 3 (Läufer/Wiesel). Läufer steht durchgehend
 * auf d4 (real row 4, col 3), König auf h1 (statt e1) — siehe Bugfix-Kommentar bei
 * QUEST1_POSITIONS.screen5Capture: h1 liegt nachweislich außerhalb jeder Diagonale von
 * d4, also kein verstecktes Schach. Jede Stellung unten wurde einzeln auf genau diese
 * Weise geprüft, nicht nur übernommen.
 */
export const QUEST3_POSITIONS = {
  // Screen 2: offenes Feld -> Läufer darf auf beiden Diagonalen beliebig weit ziehen.
  screen2: "8/8/8/8/3B4/8/8/8 w - - 0 1",
  // Screen 4: eigener Bauer auf f6 (zwei Diagonalfelder entfernt) blockiert genau diese
  // eine Diagonale nach einem freien Feld (e5) -> f6 ist das Stopp!-Zielfeld, die andere
  // Diagonale bleibt komplett frei.
  screen4Blocked: "8/8/5P2/8/3B4/8/8/8 w - - 0 1",
  // Screen 5: gegnerischer Springer auf f6 (gleiches Feld wie oben, jetzt gegnerisch) ->
  // legaler Schlagzug am Ende der offenen Diagonale.
  screen5Capture: "8/8/5n2/8/3B4/8/8/8 w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 4 (Springer/Pferd). Springer durchgehend auf
 * d4. Besonderheit laut Projektwissen: der Springer ist die einzige Figur, die über
 * andere hinwegziehen darf — Screen 4 zeigt das als positive Überraschung, nicht als
 * Stopp!-Aufgabe (kein trapTarget nötig, die Sprungfelder bleiben unverändert legal).
 */
export const QUEST4_POSITIONS = {
  // Screen 2: offenes Feld -> alle 8 Sprungfelder des Springermusters sind erreichbar.
  screen2: "8/8/8/8/3N4/8/8/8 w - - 0 1",
  // Screen 4: eigene Figur auf d5, direkt "im Weg" auf dem Weg nach oben — chess.js
  // liefert unverändert alle 8 Sprungfelder, weil der Springer nicht durch Zwischenfelder
  // blockiert wird. Genau das ist die zu vermittelnde Überraschung.
  // Korrektur (Opus-Review, 2026-09-07, Abschnitt 3.2 "Quest 4 ist zu leicht", siehe
  // claude/review_logik_grafik_audiofuehrung.md): Die vorherige Fassung stellte die
  // Blockade-Figur auf c4 (ein Nachbarfeld, das auf KEINEM Sprungpfad liegt) und bot
  // weiterhin alle 8 Sprungfelder gleichwertig an — die Überraschung ging dadurch unter,
  // weil das Kind sie nie gezielt erleben musste. Jetzt steht die Figur auf d5 (optisch
  // "im Weg" für den Sprung nach e6) und Quest4.tsx beschränkt den ZielfeldMarker per
  // onlyTarget auf genau dieses eine Sprungfeld (e6) — analog zum onlyTarget-Muster der
  // Stopp!-Screens in Quest 2/3/5.
  screen4Blocked: "8/8/8/3P4/3N4/8/8/8 w - - 0 1",
} as const;
// Hinweis: es gab hier früher zusätzlich ein `screen5Capture` ("4k3/8/2n5/8/3N4/8/8/7K w
// - - 0 1", gegnerischer Springer auf c6). Wie Quest4.tsx oben dokumentiert, wurden Screen
// 4 (Blockade) und der frühere Screen 5 (Schlagen) am 2026-09-07 auf Nutzer-Feedback hin zu
// einem einzigen Screen 4 verschmolzen — `screen5Capture` blieb dabei als ungenutzter Rest
// in dieser Datei stehen (kein einziger Verweis mehr in Quest4.tsx, per Grep bestätigt) und
// sorgte dadurch für eine falsche Gesamtzahl im Sanity-Check (18 statt der dokumentierten
// 17 Stellungen, siehe verify/test-chessEngine.cjs). Entfernt (Nutzer-Testlauf 2026-09-08,
// echtes `npm test`).

/**
 * Kuratierte Beispiel-Stellungen für Quest 5 (Dame/Schwan). Dame durchgehend auf d4 —
 * kombiniert die Diagonalen von Quest 3 mit den geraden Linien von Quest 2.
 */
export const QUEST5_POSITIONS = {
  // Screen 2: offenes Feld -> Dame darf auf allen vier geraden UND vier diagonalen
  // Richtungen ziehen (Turm + Läufer kombiniert).
  screen2: "8/8/8/8/3Q4/8/8/8 w - - 0 1",
  // Screen 4: eigener Bauer auf d6 blockiert nur die senkrechte Linie nach einem freien
  // Feld (d5) -> d6 ist das Stopp!-Zielfeld, alle anderen sieben Richtungen bleiben frei.
  screen4Blocked: "8/8/3P4/8/3Q4/8/8/8 w - - 0 1",
  // Screen 5: gegnerischer Springer auf f6 (Ende der offenen a1-h8-Diagonale) -> legaler
  // Schlagzug.
  screen5Capture: "8/8/5n2/8/3Q4/8/8/8 w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 6 (König/Hirsch). Anders als bei den anderen
 * Figuren: König durchgehend auf d4, aber Screen 4 zeigt hier absichtlich ein ECHTES
 * Schach (nicht nur eine Blockade) — das ist laut Projektwissen die zentrale neue Idee
 * dieser Quest ("führt Schach und Matt als gesprochene Begriffe ein"). chess.js berechnet
 * die reduzierten Fluchtfelder automatisch korrekt, kein eigener Sonderfall nötig.
 */
export const QUEST6_POSITIONS = {
  // Screen 2: offenes Feld -> König darf alle 8 Nachbarfelder betreten.
  screen2: "8/8/8/8/3K4/8/8/8 w - - 0 1",
  // Screen 4: gegnerischer Springer auf c6 gibt Schach (Springer deckt d4 ab) -> von den
  // 8 Nachbarfeldern bleibt e5 illegal (weiterhin vom Springer bedroht), die übrigen 7
  // lösen das Schach auf ("wegziehen"). Springer bewusst als Angreifer statt einer
  // Linienfigur gewählt, damit die Bedrohung innerhalb des kleinen Anzeigefensters
  // überhaupt sichtbar bleibt (bei Turm/Dame/Läufer stünde die angreifende Figur weit
  // außerhalb des Fensters).
  screen4Check: "8/8/2n5/8/3K4/8/8/8 w - - 0 1",
  // Screen 5: gegnerischer (ungedeckter) Springer direkt neben dem König auf e5, KEIN
  // Schach (Springer deckt d4 nicht ab, siehe QUEST5_POSITIONS-Kommentar zur selben
  // Prüfung) -> normales Schlagen, wie bei jeder anderen Figur auch.
  screen5Capture: "8/8/8/4n3/3K4/8/8/8 w - - 0 1",
  // --- Paket 2 (2026-09-11): Quest-6-Erweiterung, Vorlage quest6_matt_bruecke_umsetzung_
  // 2026-09-10.md. Alle FENs am 11.09. gegen das in der App installierte chess.js 1.4.0
  // geprüft (verify/test-quest6-logic.cjs). `screen4Check` oben wird seitdem nicht mehr
  // verwendet (die Schach-Brücke ersetzt den alten "nur wegziehen"-Screen), bleibt aber
  // für die bestehenden Tests stehen.
  //
  // Schach-Brücke: weißer König e1, Springer c3, Läufer a4; schwarzer Turm e8 gibt Schach.
  // Genau 7 Legalzüge, alle drei Wege: wegziehen (Kd1/Kf1/Kd2/Kf2), dazwischenstellen
  // (Ne2/Ne4), Angreifer schlagen (Bxe8). Stopp!-Feld b3 (Läufer zieht, Schach bleibt).
  schachBruecke: "4r2k/8/8/8/B7/2N5/8/4K3 w - - 0 1",
  // Mini-Spiel "Schach entkommen": je genau ein Weg, die vierte Stellung wieder alle drei.
  miniSpiel: [
    "7k/8/8/2n5/4K3/8/8/8 w - - 0 1", // P1: Springer-Schach -> nur wegziehen (7 Königszüge)
    "rr5k/8/8/8/8/2N5/8/K7 w - - 0 1", // P2: zwei Türme -> nur dazwischenstellen (Na2/Na4)
    "7k/8/8/8/8/8/5nPP/4B1RK w - - 0 1", // P3: König eingeklemmt -> nur schlagen (Bxf2)
    "k2r4/8/8/8/7B/5N2/8/3K4 w - - 0 1", // P4: Schach-Brücke gespiegelt -> alle drei Wege
  ],
  // Matt-Moment: Turm a1 -> a8 ist der einzige Mattzug (Grundreihenmatt hinter drei Igeln).
  mattMoment: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
} as const;

/**
 * Geometrie einer erkannten Fesselung (Pin): `gefesselteAt` steht zwischen dem eigenen
 * `koenigAt` und einer gegnerischen Linienfigur auf `angreiferAt`, alle drei auf
 * derselben Geraden (Linie oder Diagonale) — bewegt sich die Figur auf `gefesselteAt`
 * von dieser Geraden herunter, würde der eigene König dadurch ins Schach geraten.
 * Gebraucht für das Fesselung-Bonuskapitel (siehe FESSELUNG_POSITIONS unten): sowohl um
 * zu erkennen, DASS eine Fesselung vorliegt, als auch um ihre drei Felder für die
 * "Kettenlinie"-Visualisierung (Board.tsx, `kettenlinie`-Prop) zu bekommen.
 */
export type Fesselung = {
  koenigAt: BoardSquare;
  gefesselteAt: BoardSquare;
  angreiferAt: BoardSquare;
};

/**
 * Erkennt eine (absolute) Fesselung gegen den König der Farbe `koenigFarbe` — chess.js
 * selbst liefert dafür kein eigenes "ist diese Figur gefesselt?"-Flag, berücksichtigt
 * Fesselungen aber bereits vollautomatisch korrekt bei der Legalzug-Berechnung
 * (`legalTargetsFor`/`game.moves()`, siehe Test "gefesselter Turm darf NUR auf der
 * Linie ziehen" in verify/test-fesselung-logic.cjs) — diese Funktion wird NUR für die
 * Visualisierung gebraucht (welche drei Felder zeigt die Kettenlinie?), nicht für die
 * Zuglogik selbst.
 *
 * Standard-Ray-Casting-Algorithmus: von `koenigFarbe`s König aus in alle 8 Richtungen
 * laufen. Die erste eigene Figur auf einem Strahl ist ein Fesselungs-Kandidat; steht
 * DIREKT dahinter (ohne Lücke) eine gegnerische Figur, deren Zugmuster zu dieser
 * Richtung passt (Turm/Dame auf einer Linie, Läufer/Dame auf einer Diagonale), liegt
 * eine Fesselung vor. Eine gegnerische Figur VOR der eigenen (nichts dazwischen) auf
 * demselben Strahl bricht den Strahl sofort ab (kein Fesselungs-Kandidat dort) — trifft
 * der Strahl auf mehr als eine eigene Figur hintereinander, ist die zweite ohnehin per
 * Definition gedeckt, keine Fesselung.
 */
export function findeFesselung(game: Chess, koenigFarbe: "w" | "b"): Fesselung | null {
  const board = game.board(); // board[0] = Reihe 8 ... board[7] = Reihe 1, je 8 Spalten a-h — exakt dieselbe {row,col}-Konvention wie toAlgebraic/fromAlgebraic oben.

  let koenigRow = -1;
  let koenigCol = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const feld = board[r][c];
      if (feld && feld.type === "k" && feld.color === koenigFarbe) {
        koenigRow = r;
        koenigCol = c;
      }
    }
  }
  if (koenigRow === -1) return null; // sollte bei einer gültigen FEN nie eintreten

  const richtungen: { dr: number; dc: number; art: "linie" | "diagonale" }[] = [
    { dr: -1, dc: 0, art: "linie" },
    { dr: 1, dc: 0, art: "linie" },
    { dr: 0, dc: -1, art: "linie" },
    { dr: 0, dc: 1, art: "linie" },
    { dr: -1, dc: -1, art: "diagonale" },
    { dr: -1, dc: 1, art: "diagonale" },
    { dr: 1, dc: -1, art: "diagonale" },
    { dr: 1, dc: 1, art: "diagonale" },
  ];

  for (const { dr, dc, art } of richtungen) {
    let r = koenigRow + dr;
    let c = koenigCol + dc;
    let kandidat: BoardSquare | null = null;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const feld = board[r][c];
      if (feld) {
        if (!kandidat) {
          if (feld.color === koenigFarbe) {
            kandidat = { row: r, col: c };
          } else {
            break; // erste Figur auf dem Strahl ist bereits gegnerisch -> kein Kandidat hier
          }
        } else {
          if (feld.color !== koenigFarbe) {
            const greiftAlsLinie = art === "linie" && (feld.type === "r" || feld.type === "q");
            const greiftAlsDiagonale = art === "diagonale" && (feld.type === "b" || feld.type === "q");
            if (greiftAlsLinie || greiftAlsDiagonale) {
              return { koenigAt: { row: koenigRow, col: koenigCol }, gefesselteAt: kandidat, angreiferAt: { row: r, col: c } };
            }
          }
          break; // zweite Figur auf dem Strahl entscheidet immer (Fesselung oder nicht) — Strahl endet hier so oder so
        }
      }
      r += dr;
      c += dc;
    }
  }
  return null;
}

/**
 * Kuratierte Beispiel-Stellungen für das Fesselung-Bonuskapitel (siehe Claude-Projekt
 * "ChessLynx", bonuskapitel_screen_skripte.md). Wächter-Figur ist durchgehend der Turm
 * (Bär) — dieselbe Figur, die das Kind bereits aus Quest 2 kennt.
 *
 * Korrektur (Implementierungsrunde 2026-09-08, gegenüber dem ursprünglichen Screen-Skript-
 * Entwurf): der Entwurf sah als angreifende Figur einen gegnerischen LÄUFER vor (diagonale
 * Fesselung). Das ist chess-technisch falsch für die eigene Lektion dieses Kapitels ("eine
 * gefesselte Figur kann sich innerhalb der Linie trotzdem bewegen") — ein Turm hat auf einer
 * Diagonale KEIN einziges Zugmuster-Feld, eine diagonale Fesselung würde ihn also komplett
 * lähmen (0 Legalzüge), nicht nur einschränken. Deshalb hier stattdessen ein gegnerischer
 * TURM als Angreifer auf derselben Linie (Datei) — der Wächter behält dadurch echte,
 * antippbare Zielfelder auf der Linie, exakt wie es das Skript in Screen 2/3 beschreibt.
 */
export const FESSELUNG_POSITIONS = {
  // Screen 1-3: die eigene Fesselung. Weißer König auf d1, weißer Wächter-Turm auf d4,
  // schwarzer Turm auf d8 — alle drei auf der d-Linie. Der Wächter darf sich auf der Linie
  // frei bewegen (d2/d3/d5/d6/d7, sowie den Angreifer auf d8 schlagen), aber NICHT seitlich
  // herunter (a4-c4/e4-h4) — das würde den eigenen König sofort dem Turm auf d8 aussetzen.
  // Schwarzer König auf h8 (weit ab von jeder d-Linien-Wirkung) ist reine FEN-Pflichtfigur,
  // taucht in der UI nicht auf — dasselbe etablierte Muster wie bei den sechs Haupt-Quests
  // (siehe QUEST1_POSITIONS-Kommentar oben).
  eigenePin: "3r3k/8/8/8/3R4/8/8/3K4 w - - 0 1",
  // Screen 4-5: Perspektivwechsel + freies Schlagen. Jetzt fesselt EIN WEISSER Turm (e1)
  // einen SCHWARZEN Turm (e4) gegen den schwarzen König (e8) — dieselbe Fesselungs-Geometrie
  // wie oben, nur aus der anderen Perspektive erlebt: das Kind sieht zuerst, dass die
  // gegnerische Wächterfigur genauso gefesselt ist, und darf dann mit dem eigenen zweiten
  // Turm (d1) einen schwarzen Springer auf d4 schlagen — ein Zug, der bei einer NICHT
  // gefesselten schwarzen Wächterfigur riskant wäre (der Turm auf e4 "deckt" d4 entlang der
  // 4. Reihe), hier aber gefahrlos ist: der schwarze Turm darf wegen seiner eigenen Fesselung
  // gar nicht seitlich nach d4 ziehen, um zurückzuschlagen (siehe
  // verify/test-fesselung-logic.cjs für den vollständigen Beweis dieses Zugs).
  //
  // Korrektur (Nutzer-Testlauf 2026-09-09): der weiße König stand ursprünglich auf a1, direkt
  // auf derselben Grundreihe wie die beiden weißen Türme (d1/e1). Das schuf eine zweite,
  // von der eigentlichen Lektion unabhängige Schwäche: sobald der Turm von d1 nach d4 zieht
  // (um den Springer zu schlagen), wird d1 leer — die Grundreihe zwischen dem schwarzen Turm
  // auf e1 (nach dessen Zug) und dem weißen König auf a1 liegt dann völlig frei. Der
  // gefesselte schwarze Turm darf zwar nicht seitlich nach d4 ziehen, aber ER DARF JEDERZEIT
  // den ihn fesselnden Turm selbst schlagen (das bleibt exakt auf der Fesselungslinie, ist
  // also nie verboten) — nach Rd1xd4 wäre Rxe1 daher nicht nur legal, sondern sogar Schach
  // (freie Grundreihe bis a1) UND gewinnt einen ganzen Turm ohne Gegenwehr, da nichts mehr auf
  // e1 zurückschlagen kann. Die Behauptung "gefahrlos" stimmte also nur für den einen
  // geprüften Zug (Rückschlag auf d4), nicht für die Stellung insgesamt.
  // Fix: König von a1 nach f2 verschoben (keine der beiden Turm-Konstanten in Fesselung.tsx
  // referenziert a1, die Verschiebung ist rein positionsintern). Damit bleibt der weiße
  // König durchgehend Beschützer des Turms auf e1 (diagonal benachbart) — schlägt Schwarz nach
  // Rd1xd4 trotzdem auf e1, ist das kein Schach mehr und Weiß schlägt mit Kxe1 sofort zurück
  // (regulärer Turmtausch), Weiß bleibt schlicht um den Springer im Vorteil. Siehe
  // verify/test-fesselung-logic.cjs für den Beweis beider Fälle (vorher/nachher).
  perspektivwechselUndSchlagen: "4k3/8/8/8/3nr3/8/5K2/3RR3 w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für das Rochade-Bonuskapitel (siehe Claude-Projekt
 * "ChessLynx", bonuskapitel_screen_skripte.md, Abschnitt "Rochade"). König und Turm stehen
 * durchgehend auf ihren echten Startfeldern (e1/a1/h1) — anders als bei allen übrigen
 * kuratierten Stellungen dieser Datei ist das hier keine freie Gestaltungswahl: die Rochade
 * ist in den offiziellen Schachregeln untrennbar an genau diese drei Felder gebunden. Ein
 * Zug des Königs um zwei Felder auf sein Rochade-Zielfeld (e1->g1 bzw. e1->c1) wird von
 * chess.js automatisch als Rochade erkannt und bewegt dabei intern auch den Turm mit —
 * `tryMove` (oben) braucht dafür keinen eigenen Sonderfall.
 *
 * Bekannte, bewusste Vereinfachung (dokumentiert statt stillschweigend in Kauf genommen):
 * Board.tsx (siehe dortiger Kommentar zu `demoTarget`) animiert bei einem Zug immer nur EINE
 * Figur (`pieceAt`). Das Screen-Skript beschreibt die Rochade als "gleichzeitige" Bewegung
 * von König UND Turm — im Code wandert deshalb sichtbar nur der König; der Turm steht bis
 * zum Screen-Wechsel unverändert an seinem Ursprungsfeld (als `zusatzfigur`) und "springt"
 * erst mit dem Szenenwechsel auf sein neues Feld. Eine echte Zwei-Figuren-Animation würde
 * eine Erweiterung von Board.tsx voraussetzen, die für dieses Bonuskapitel bewusst
 * zurückgestellt wurde (siehe priorisierter_umsetzungsplan.md).
 */
export const ROCHADE_POSITIONS = {
  // Screen 1 (Vorstellung): Ausgangsstellung, beide Rochaden noch möglich, keine Interaktion.
  vorstellung: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1",
  // Screen 2 (Seite A, kurze Rochade): König e1 -> g1, Turm h1 -> f1.
  kurzeRochade: "4k3/8/8/8/8/8/8/4K2R w K - 0 1",
  // Screen 3 (Seite B, lange Rochade): König e1 -> c1, Turm a1 -> d1 — DREI Felder für den
  // Turm, nicht zwei (siehe Korrektur in projektwissen.md/bonuskapitel_screen_skripte.md:
  // die lange Rochade ist bewusst KEIN Spiegelbild der kurzen).
  langeRochade: "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1",
  // Screen 4 (Stopp!-Aufgabe): ein eigener Springer auf d1 blockiert den Weg der langen
  // Rochade — b1/c1/d1 müssen für eine lange Rochade alle frei sein, c1 bleibt für den König
  // dadurch strukturell unerreichbar. Springer bewusst als EIGENE (weiße) Figur, nicht
  // gegnerisch — Blockade-Stellen zeigen laut Konvention (siehe Board.tsx/blockerIcon-
  // Kommentar) immer eine eigene Figur, nie eine gegnerische.
  wegBlockiert: "4k3/8/8/8/8/8/8/R2NK3 w Q - 0 1",
  // Screen 5 (zweites Stopp!-Beispiel, neu 2026-09-09, Nutzer-Rückfrage nach Gerätetest:
  // "Rochade kann nicht abgeschlossen werden ... sondern auch nicht, wenn eine andere Figur
  // freie Sicht auf die Bewegungsfelder des Königs hat"): b1/c1/d1 sind hier alle PHYSISCH
  // frei (anders als wegBlockiert oben) — die lange Rochade scheitert trotzdem, weil der
  // gegnerische Turm auf d8 die komplette, ungehinderte d-Linie hinunter bis d1 einsieht.
  // d1 ist eines der beiden Felder, die der König bei O-O-O durchqueren würde (e1->d1->c1) —
  // per FIDE-Regel (von chess.js korrekt umgesetzt) darf der König dabei kein bedrohtes Feld
  // durchqueren, selbst wenn er selbst aktuell nicht im Schach steht. Bewusst dieselbe
  // Koordinate d1 wie bei wegBlockiert oben (siehe Rochade.tsx/KOENIG_LANG_DURCHGANG-
  // Kommentar) — dasselbe Durchgangsfeld verhindert die Rochade hier aus einem GANZ anderen
  // Grund (bedroht statt besetzt). Hand-verifiziert (dieselbe Sandbox-Einschränkung wie beim
  // übrigen Datei-Kommentar oben: kein lauffähiges chess.js hier verfügbar) — legalTargetsFor
  // für den Turm auf d8 deckt die gesamte offene d-Linie ab, keine andere Figur steht auf
  // b2-g7 dazwischen; `npm test` auf dem eigenen Rechner (verify/test-rochade-logic.cjs) ist
  // wie bei allen kuratierten Stellungen die maßgebliche Bestätigung.
  wegBedroht: "3rk3/8/8/8/8/8/8/R3K3 w Q - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für das Figurenwert-Bonuskapitel (siehe Claude-Projekt
 * "ChessLynx", bonuskapitel_screen_skripte.md, Abschnitt "Figurenwert"). Alle vier Stellungen
 * folgen bewusst derselben Geometrie (eigene Dame auf d4, zwei gleichzeitig schlagbare
 * gegnerische Figuren auf d7 und a4, Könige außerhalb jeder Wirklinie auf h1/h8) — nur die
 * Figurentypen auf d7/a4 unterscheiden sich zwischen den vier Stellungen. Das hält die vier
 * FENs leicht gegeneinander nachprüfbar (dieselbe Zuggeometrie, siehe verify/test-
 * figurenwert-logic.cjs) statt vier unabhängig konstruierte, fehleranfälligere Einzelfälle.
 *
 * `legalTargets` wird für alle vier Screens bewusst NICHT aus `legalTargetsFor` abgeleitet
 * (die Dame hätte auf einem leeren Brett weit mehr als zwei legale Zielfelder), sondern in
 * Figurenwert.tsx auf genau die beiden Vergleichsfelder eingeschränkt — dieselbe bewusste
 * Verengung wie bereits in Rochade.tsx (dort "onlyTarget" genannt) für einen gezielten
 * Vergleichs-Screen statt eines offenen Spielzugs.
 */
export const FIGURENWERT_POSITIONS = {
  // Screen 3 (Gleichwert-Entdecken): Springer (3) und Läufer (3) — beide gleich viel wert,
  // beide Antworten richtig.
  gleichwertSpringerLaeufer: "7k/3n4/8/8/b2Q4/8/8/7K w - - 0 1",
  // Screen 4 (Kernaufgabe "Welche ist mehr wert?"): Turm (5) gegen Läufer (3).
  kernaufgabeTurmLaeufer: "7k/3r4/8/8/b2Q4/8/8/7K w - - 0 1",
  // Mini-Übung, erstes Paar: Bauer (1) gegen Turm (5) — exakt das im Screen-Skript genannte
  // Beispielpaar.
  uebungBauerTurm: "7k/3p4/8/8/r2Q4/8/8/7K w - - 0 1",
  // Mini-Übung, zweites Paar: Springer (3) gegen Dame (9) — ebenfalls das im Screen-Skript
  // genannte Beispielpaar.
  uebungSpringerDame: "7k/3n4/8/8/q2Q4/8/8/7K w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für das Matt-in-2-Bonuskapitel (siehe Claude-Projekt
 * "ChessLynx", bonuskapitel_screen_skripte.md, Abschnitt "Matt in 2"). Alle drei Stellungen
 * teilen dieselbe Grundgeometrie: eigener König in der Ecke (a1), eigener Turm auf h1, ein
 * einzelner gegnerischer "Wächter" auf der h-Linie.
 *
 * Wichtige, bewusste Vereinfachung (dokumentiert statt stillschweigend in Kauf genommen):
 * Anders als bei den Fesselungs-/Rochade-Stellungen ist die Zwei-Zug-Reihenfolge hier NICHT
 * aus einer erzwungenen Schachlogik abgeleitet (ein direkter Beweis, dass "zuerst DIESE Figur
 * schlagen, dann DER König" der einzig legale Weg ist, ließe sich in dieser Sandbox ohne
 * echtes chess.js nicht verlässlich konstruieren, siehe Datei-Kommentar oben zur generellen
 * Sandbox-Einschränkung) — stattdessen bietet die App bewusst NUR die beiden gewünschten
 * Zielfelder pro Zug an (dieselbe "onlyTarget"-Verengung wie bereits in Rochade.tsx/
 * Figurenwert.tsx), unabhängig davon, ob eine vollständige Engine-Analyse eine kürzere Lösung
 * fände. Beide Einzelzüge selbst (Turm schlägt/bedroht den Wächter, König zieht auf ein
 * leeres, ungefährdetes Feld) sind für sich genommen echte, geprüfte Legalzüge — nur ihre
 * DIDAKTISCHE Zwei-Schritt-Reihenfolge ist geskriptet, nicht schachlich erzwungen. Empfehlung
 * wie bei den übrigen Bonuskapiteln: `npm test` auf dem eigenen Rechner bestätigt zumindest,
 * dass jeder einzelne angebotene Zug tatsächlich legal ist.
 */
export const MATT_IN_2_POSITIONEN = {
  // "Schlagen"-Beispiel: Turm h1 schlägt den Springer auf h5 (Zug 1), König a1 zieht
  // anschließend auf das freie Feld a2 (Zug 2, geskriptet als "Befreiung").
  schlagen: "7k/8/8/7n/8/8/8/K6R w - - 0 1",
  // "Ablenkung"-Beispiel: Turm h1 zieht NICHT schlagend nach h5 und bedroht von dort aus die
  // gegnerische Dame auf h6 (Zug 1 — eine reine Drohung, kein Schlagzug), König a1 zieht
  // anschließend auf a2 (Zug 2). Ersetzt die ursprünglich erwogene "glänzende Eichel" durch
  // eine echte, wertvolle Figur (siehe projektwissen.md-Korrektur zu diesem Kapitel).
  ablenkung: "7k/8/7q/8/8/8/8/K6R w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für das optionale, nicht gate-pflichtige Matt-in-3-
 * Bonuskapitel (siehe Claude-Projekt "ChessLynx", bonuskapitel_screen_skripte.md, Abschnitt
 * "Matt in 3"). Anders als Matt in 2 (wo "Matt" im Sinne der App-eigenen Erzählung "das
 * EIGENE, gefangene Königreich befreien" bedeutet) geht es hier um die schachlich klassische
 * Bedeutung: das Kind führt jetzt selbst den GEGNERISCHEN König aufs Matt — ein bewusster
 * Rollentausch als Abschluss der Matt-Progression (siehe tiefes_review_bonuskapitel_logik_
 * lernumfang_koenigreiche.md, Befund 1.10: "den gegnerischen König aktiv treiben").
 *
 * WICHTIGE PRODUKTIONSAUFLAGE aus dem Skript: "die Stellung muss so kuratiert sein, dass jede
 * Zwischenantwort des Königs tatsächlich der einzige legale Zug ist — per chess.js zu
 * verifizieren [...] Ist das nicht sauber konstruierbar, wird die Zwischenantwort stattdessen
 * als 'eine mögliche Antwort' erzählt statt als zwingend dargestellt." Diese Sandbox hat kein
 * lauffähiges chess.js (siehe Datei-Kopfkommentar), aber alle drei Stellungen wurden mit einem
 * eigens für diese Verifikation geschriebenen, vollständigen Turm/Dame/König-Legalzug-Prüfer
 * (Rochade/Bauern/Springer/Läufer kommen in keiner dieser Stellungen vor, daher genügt das)
 * Zug für Zug hand-verifiziert: JEDE der drei Stellungen erreicht nach exakt drei geprüften
 * Weißzügen ein ECHTES, lückenloses Matt (null legale Königszüge in der Schlussstellung).
 * ABER: die schwarze Zwischenantwort nach Zug 1 bzw. 2 ist NICHT die einzig legale (der König
 * hat jeweils 3 legale Fluchtfelder, nicht 1) — deshalb gilt hier exakt die oben zitierte
 * Skript-Ausweichklausel: MattIn3.tsx erzählt die animierte Zwischenantwort ausdrücklich als
 * "eine mögliche Antwort" ("Er versucht, hier zu entkommen…"), nie als zwingend. Alle drei
 * Weißzüge selbst UND die finale Mattstellung sind dagegen zweifelsfrei korrekt.
 * Empfehlung wie immer: `npm test` bestätigt das zusätzlich gegen das echte chess.js
 * (`game.isCheckmate()` nach dem dritten Zug).
 */
export const MATT_IN_3_POSITIONEN = {
  // "Turmleiter-Matt" (Treppenmatt mit zwei Türmen): Th6 schlägt kein Feld, sondern zieht nach
  // h3 (Schach auf Reihe 3), Ta4 zieht nach a2 (Schach auf Reihe 2, Reihe 3 bleibt durch Th3
  // versperrt), Th3 zieht nach h1 und setzt matt (Reihe 2 bleibt durch Ta2 versperrt).
  turmleiter: "K7/8/7R/8/R7/4k3/8/8 w - - 0 1",
  // "Dame-und-Turm-Randmatt": identischer Mechanismus wie oben, aber der a-Linien-Turm ist
  // durch eine Dame ersetzt (andere Figuren-Kombination, wie im Skript gefordert — siehe
  // Review-Befund 1.9-Verifikationsauflage, hier für BEIDE Stellungen eingelöst).
  damenUndTurm: "K7/8/7R/8/Q7/4k3/8/8 w - - 0 1",
  // Dritte Stellung, reduzierte Hilfe (Screen 5): vertikal gespiegelte Variante der
  // Turmleiter-Stellung (König wird stattdessen zur achten statt zur ersten Reihe getrieben)
  // — dieselbe verifizierte Mechanik, aber andere Felder, damit das Kind nicht einfach exakt
  // dieselben Tipp-Koordinaten wie in Screen 2 wiederholt.
  reduziert: "8/8/4k3/R7/8/7R/8/K7 w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für den Endlosmodus/Freispiel (siehe Claude-Projekt
 * "ChessLynx", endlosmodus_freispiel_konzept.md und projektwissen.md-Abschnitt
 * "Endlosmodus"). Jedes der fünf Königreiche hat eine feste "Fokus-Spalte" mit eigener
 * 1-3-Sterne-Progression (siehe projektwissen.md für die vollständige Zuordnung):
 *
 *   Eichhörnchen-Lichtung -> Figur gewinnen + Figurenwert
 *   Fuchsbau              -> Schach lösen
 *   Dachshöhle            -> Figur gewinnen + Schach lösen + Rochade-Übungsspalte
 *   Adlerhorst            -> Fesselung
 *   Wolfsfeste            -> Matt in 2 + Fesselung
 *
 * Die beiden letzten Zeilen (Dachshöhle-Rochade, Wolfsfeste-Matt-in-2 gehört zu einem
 * Königreich, das schon eine eigene Sterne-Spalte für Fesselung hat) sind die beiden im
 * tiefen Review (tiefes_review_bonuskapitel_logik_lernumfang_koenigreiche.md, Punkte 18/19)
 * beschlossenen Nachträge — siehe dortige Begründung, warum Figurenwert zur Eichhörnchen-
 * Lichtung wandert und warum die Dachshöhle eine echte, gewertete Rochade-Spalte statt nur
 * eines ungewerteten Erklär-Screens bekommt.
 *
 * Alle Stellungen unten wiederholen bewusst dieselben, bereits an anderer Stelle in dieser
 * Datei etablierten Geometrien (Turm auf a1 gegen Springer wie in QUEST2_POSITIONS, Dame auf
 * d4 gegen zwei Vergleichsfiguren wie in FIGURENWERT_POSITIONS, Fesselung entlang einer
 * Linie/Diagonale wie in FESSELUNG_POSITIONS, Turm-in-der-Ecke-Matt wie in
 * MATT_IN_2_POSITIONEN) — nicht aus Einfallslosigkeit, sondern weil eine bereits geprüfte
 * Zuggeometrie leichter gegenzuprüfen ist als eine neu erfundene (siehe Kommentar zu
 * FIGURENWERT_POSITIONS oben für dasselbe Argument). Jedes Sterne-Trio steigert dabei gezielt
 * die Ablenkung/Distraktoren, nicht die Zuglogik selbst — Stern 3 ist chess-technisch nie
 * schwerer zu ZIEHEN als Stern 1, nur schwerer zu ERKENNEN.
 */
export const EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS = {
  // Stern 1: ein einzelner gegnerischer Springer auf a6, direkt auf der a-Linie des Turms —
  // kein Ablenkungsmanöver, reines Wiedererkennen des "Figur gewinnen"-Musters aus Quest 2.
  stern1: "4k3/8/n7/8/8/8/8/R3K3 w - - 0 1",
  // Stern 2: zwei gegnerische Springer (a6 UND e6) — der Turm kann nur den auf seiner
  // eigenen Linie (a6) schlagen, e6 ist ein Distraktor, der wie ein zweites "gewinnbares"
  // Ziel aussieht, es aber (mangels Turm-Zugmuster dorthin) nicht ist.
  stern2: "4k3/8/n3n3/8/8/8/8/R3K3 w - - 0 1",
  // Stern 3: Turm zieht diesmal die GESAMTE a-Linie entlang bis a8 (statt nur bis a6) und
  // muss dabei einen weiter entfernten Distraktor (Springer f5, außerhalb jeder Turmlinie)
  // ignorieren — größere Distanz und ein Distraktor außerhalb des eigenen Bewegungsmusters
  // sind die Steigerung gegenüber Stern 2, nicht ein neuer Zugtyp.
  stern3: "n3k3/8/8/5n2/8/8/8/R3K3 w - - 0 1",
} as const;

export const EICHHOERNCHEN_FIGURENWERT_POSITIONS = {
  // Stern 1: Bauer (Wert 1) gegen Dame (Wert 9) — der größtmögliche Wertunterschied, damit
  // das Muster ("welche Figur ist mehr wert?") zuerst denkbar einfach erkennbar ist. Identische
  // Geometrie wie FIGURENWERT_POSITIONS.uebungBauerTurm (Dame d4, Vergleichsfiguren d7/a4).
  stern1: "7k/3p4/8/8/q2Q4/8/8/7K w - - 0 1",
  // Stern 2: Läufer (3) gegen Turm (5) — engerer, aber immer noch eindeutiger Wertunterschied.
  stern2: "7k/3b4/8/8/r2Q4/8/8/7K w - - 0 1",
  // Stern 3: Läufer (3) gegen Springer (3) — bewusster GLEICHSTAND (identisch zu
  // FIGURENWERT_POSITIONS.gleichwertSpringerLaeufer), damit die schwerste Stufe nicht "noch
  // enger", sondern konzeptionell anders ist: beide Antworten sind hier richtig, das Kind
  // muss erkennen, dass es keinen Unterschied gibt statt einen (noch kleineren) zu finden.
  stern3: "7k/3b4/8/8/n2Q4/8/8/7K w - - 0 1",
} as const;

/**
 * Fuchsbau — Fokus-Spalte "Schach lösen". Die drei Sterne sind hier bewusst NICHT nach
 * Schwierigkeit gestaffelt, sondern zeigen die drei grundverschiedenen Lösungswege für Schach
 * (wegziehen / blockieren / schlagen) je einmal — dieselbe Didaktik wie bei den drei
 * DACHSHOEHLE_SCHACH_POSITIONS weiter unten, nur mit anderer konkreter Stellung, damit das
 * Kind nicht exakt dieselben Koordinaten zweimal übt.
 */
export const FUCHSBAU_SCHACH_POSITIONEN = {
  // Wegziehen: Turm d8 schachbietet den König auf d4 entlang der d-Linie -> Kd4-c4 verlässt
  // die Linie und löst das Schach, ohne dass eine andere Figur beteiligt ist.
  wegziehen: "3r3k/8/8/8/3K4/8/8/8 w - - 0 1",
  // Blockieren: derselbe Turm d8 schachbietet jetzt einen König auf d1 (weiter weg) -> der
  // eigene Turm a5 stellt sich auf d5 dazwischen und unterbricht die Angriffslinie, ohne den
  // Angreifer zu schlagen.
  blockieren: "3r3k/8/8/R7/8/8/8/3K4 w - - 0 1",
  // Schlagen: ein gegnerischer Läufer auf a5 schachbietet den König auf e1 diagonal -> der
  // eigene Springer auf b3 schlägt den Läufer direkt (Nb3xa5) und beseitigt damit den
  // Angreifer selbst, statt ihm auszuweichen oder ihn zu blockieren.
  schlagen: "7k/8/8/b7/8/1N6/8/4K3 w - - 0 1",
} as const;

export const DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS = {
  // Stern 1: ein einzelner gegnerischer Springer auf a3, direkt auf der a-Linie des Turms.
  stern1: "4k3/8/8/8/8/n7/8/R3K3 w - - 0 1",
  // Stern 2: zwei Springer (a4 UND d5) — nur a4 liegt auf der Turmlinie, d5 ist Distraktor.
  stern2: "4k3/8/8/3n4/n7/8/8/R3K3 w - - 0 1",
  // Stern 3: Turm muss die gesamte a-Linie bis a7 durchqueren, ein weit entfernter Distraktor
  // (Springer f4) liegt außerhalb jeder Turmlinie.
  stern3: "4k3/n7/8/8/5n2/8/8/R3K3 w - - 0 1",
} as const;

export const DACHSHOEHLE_SCHACH_POSITIONEN = {
  // Wegziehen: Turm d8 schachbietet König d5 -> Kd5-c5 löst das Schach durch Wegziehen.
  wegziehen: "3r3k/8/8/3K4/8/8/8/8 w - - 0 1",
  // Blockieren: Turm d8 schachbietet König d1 -> eigener Läufer a4 blockt auf d7 (diagonal
  // erreichbar, siehe a4-b5-c6-d7). Bewusst eine ANDERE Blockade-Figur (Läufer statt Turm) als
  // im Fuchsbau, damit dieselbe Lösungsidee mit einem anderen Zugmuster geübt wird.
  blockieren: "3r3k/8/8/8/B7/8/8/3K4 w - - 0 1",
  // Schlagen: gegnerischer Turm h4 schachbietet König h1 entlang der 4. Reihe -> eigener Turm
  // a4 schlägt den Angreifer direkt (Rxh4).
  schlagen: "k7/8/8/8/R6r/8/8/7K w - - 0 1",
} as const;

/**
 * Dachshöhle — eigene Rochade-Sterne-Übungsspalte (Nachtrag laut tiefes_review_bonuskapitel_
 * logik_lernumfang_koenigreiche.md, Punkt 19 — siehe Begründung im großen Kommentar oben).
 * Anders als das ursprüngliche Rochade-Bonuskapitel (ROCHADE_POSITIONS, das die Rochade als
 * Konzept EINFÜHRT) prüft diese Spalte das ERKENNEN der Rochade-Bedingungen unter drei
 * verschiedenen Ausgangslagen — dieselbe "welche Bedingung fehlt/ist erfüllt?"-Didaktik wie
 * bei den übrigen Endlosmodus-Spalten, hier auf die Rochade angewandt.
 */
export const DACHSHOEHLE_ROCHADE_POSITIONEN = {
  // Stern 1: nur das kurze Rochaderecht (K in der FEN) ist überhaupt vorhanden -> Rochade
  // kurz (e1-g1) ist die einzig mögliche.
  stern1: "k7/8/8/8/8/8/8/4K2R w K - 0 1",
  // Stern 2: nur das lange Rochaderecht (Q in der FEN) ist vorhanden -> Rochade lang (e1-c1)
  // ist die einzig mögliche.
  stern2: "k7/8/8/8/8/8/8/R3K3 w Q - 0 1",
  // Stern 3: beide Rochaderechte sind formal vorhanden (KQ in der FEN), aber beide Seiten
  // sind durch je einen eigenen Springer (d1 bzw. f1) blockiert — keine der beiden Rochaden
  // ist tatsächlich ziehbar. Prüft damit gezielt den Unterschied zwischen "Recht vorhanden"
  // und "Zug gerade jetzt möglich", derselbe Unterschied, den bereits ROCHADE_POSITIONS.
  // wegBlockiert für die lange Rochade allein zeigt — hier für beide Seiten gleichzeitig.
  stern3: "k7/8/8/8/8/8/8/R2NKN1R w KQ - 0 1",
} as const;

/**
 * Adlerhorst — Fokus-Spalte Fesselung. Anders als FESSELUNG_POSITIONS (das die eigene Turm-
 * Wächterfigur nur auf einer geraden Linie fesselt) deckt diese Sterne-Spalte gezielt drei
 * unterschiedliche Fesselungs-Situationen ab, damit "Fesselung" als allgemeines Muster
 * verstanden wird, nicht nur als Turm-auf-Linie-Sonderfall.
 */
export const ADLERHORST_FESSELUNG_POSITIONEN = {
  // Stern 1: Turm e4 auf der e-Linie gegen den eigenen König e1 gefesselt (gegnerischer
  // Turm e8) — dieselbe Linien-Fesselung wie FESSELUNG_POSITIONS, als Wiedereinstieg.
  stern1: "4r2k/8/8/8/4R3/8/8/4K3 w - - 0 1",
  // Stern 2: erstmals eine DIAGONALE Fesselung — Läufer d4 auf der a1-h8-Diagonale gegen den
  // eigenen König a1 gefesselt (gegnerischer Läufer h8). Der gefesselte Läufer darf sich
  // trotzdem frei auf genau dieser einen Diagonale bewegen (b2/c3/e5/f6/g7/h8), aber auf
  // keiner anderen — anders als beim Turm in Stern 1 ist die "erlaubte Linie" hier schräg,
  // was Kindern erfahrungsgemäß schwerer fällt zu erkennen als eine gerade Linie.
  stern2: "k6b/8/8/8/3B4/8/8/K7 w - - 0 1",
  // Stern 3: Perspektivwechsel wie in FESSELUNG_POSITIONS.perspektivwechselUndSchlagen, aber
  // mit anderer Geometrie — ein GEGNERISCHER Turm (g4) ist gegen den schwarzen König (g8)
  // gefesselt. Das Kind sieht zuerst den eigenen Schlagzug (Rf1xf4, schlägt einen scheinbar
  // von Tg4 gedeckten Springer) und kann dann nachvollziehen, dass der gefesselte gegnerische
  // Turm gar nicht zurückschlagen darf (siehe verify/test-endlosmodus-logic.cjs).
  //
  // Korrektur (Nutzer-Testlauf 2026-09-09, erste Runde): der weiße König stand ursprünglich
  // auf c1, auf derselben Grundreihe wie die Türme f1/g1. Nach Rf1xf4 wird f1 leer, die
  // Grundreihe zwischen dem fesselnden Turm auf g1 und dem König liegt dann frei — der
  // gefesselte schwarze Turm darf zwar nicht seitlich nach f4, aber er darf JEDERZEIT den
  // ihn fesselnden Turm selbst schlagen (bleibt exakt auf der Fesselungslinie). Rxg1 wäre
  // also Schach UND ein kompletter, ungedeckter Turmgewinn gewesen. Als Fix zunächst König
  // von c1 nach f2 verschoben — das war aber selbst noch nicht per echtem chess.js
  // gegengeprüft (siehe Datei-Kopfkommentar zur damaligen Sandbox-Einschränkung).
  //
  // Zweite Korrektur (echter `npm test`-Lauf, 2026-09-09): genau dieser Zwischenstand hatte
  // einen NEUEN, gravierenderen Fehler eingeführt — der König auf f2 stand direkt auf der
  // f-Linie ZWISCHEN dem ziehenden Turm (f1) und seinem Zielfeld (f4) und blockierte damit
  // den gesamten Sinn der Aufgabe: Rf1xf4, der zentrale Einstiegszug, war dadurch gar nicht
  // mehr legal (ein Turm darf nicht über die eigene Figur hinwegziehen). Fix: König von f2
  // nach h2 — liegt weder auf der f-Linie (Rf1xf4 bleibt frei) noch auf der g-Linie (blockiert
  // dadurch nicht die eigentliche Fesselungslinie g1-g4-g8), deckt g1 aber weiterhin diagonal
  // (h2-g1), damit Weiß nach einem eventuellen Rxg1 sofort mit Kxg1 zurückschlagen kann.
  stern3: "6k1/8/8/8/5nr1/8/7K/5RR1 w - - 0 1",
} as const;

/**
 * Wolfsfeste — Fokus-Spalten Fesselung UND Matt in 2. Als letztes Königreich der Endlosmodus-
 * Progression kombiniert die Wolfsfeste beide bereits andernorts eingeführten Muster
 * (Fesselung: Adlerhorst; Matt in 2: eigenes Bonuskapitel MATT_IN_2_POSITIONEN) auf der
 * höchsten Schwierigkeitsstufe des jeweiligen Themas.
 */
export const WOLFSFESTE_FESSELUNG_POSITIONEN = {
  // Stern 1: Linien-Fesselung wie Adlerhorst Stern 1, andere Felder (g-Linie statt e-Linie).
  stern1: "1k4r1/8/8/8/6R1/8/8/6K1 w - - 0 1",
  // Stern 2: diagonale Fesselung wie Adlerhorst Stern 2, andere Diagonale (h1-a8 statt
  // a1-h8) und andere Felder — Läufer e4 gefesselt gegen den eigenen König h1, erlaubte
  // Zielfelder auf genau dieser Diagonale: a8/b7/c6/d5/f3/g2.
  stern2: "b7/8/8/8/4B3/8/8/k6K w - - 0 1",
  // Stern 3: Perspektivwechsel-Schlagen wie Adlerhorst Stern 3, andere Geometrie — ein
  // gegnerischer Turm (b4) ist gegen den schwarzen König (b8) gefesselt. Eigener Turm e1
  // schlägt zuerst den scheinbar gedeckten Springer auf e4 (Rxe4); der gefesselte schwarze
  // Turm b4 darf trotz scheinbarer Deckung NICHT auf e4 zurückschlagen.
  //
  // Korrektur (Nutzer-Testlauf 2026-09-09, dieselbe Schwäche wie in FESSELUNG_POSITIONS.
  // perspektivwechselUndSchlagen und ADLERHORST_FESSELUNG_POSITIONEN.stern3): der weiße
  // König stand ursprünglich auf h1, auf derselben Grundreihe wie die fesselnde Türme b1
  // und e1. Nach Rxe4 wird e1 leer, die ganze Grundreihe zwischen dem fesselnden Turm auf
  // b1 und dem König liegt dann frei — Rxb1 wäre Schach UND ein kompletter, ungedeckter
  // Turmgewinn gewesen (der gefesselte Turm darf den ihn fesselnden Turm immer schlagen,
  // das bleibt auf der Fesselungslinie). Fix: König von h1 nach a1 — deckt b1 jetzt direkt
  // (gleiche Reihe, ein Feld weiter). Schlägt Schwarz nach Rxe4 trotzdem auf b1, ist das
  // zwar (harmlos) Schach, Weiß schlägt aber mit Kxb1 sofort zurück (regulärer Turmtausch),
  // bleibt schlicht um den Springer im Vorteil.
  stern3: "1k6/8/8/8/1r2n3/8/8/KR2R3 w - - 0 1",
} as const;

/**
 * Wolfsfeste — Matt in 2, höchste Stufe der Matt-in-2-Progression (dieselbe "onlyTarget"-
 * Zwei-Zug-Didaktik wie MATT_IN_2_POSITIONEN, siehe dortiger Kommentar zur bewussten
 * Vereinfachung bei der Zugreihenfolge). Stern 1 und 2 wiederholen die beiden bereits dort
 * etablierten Fälle (Schlagen bzw. Ablenkung) mit einer anderen Wächterfigur; Stern 3 ist eine
 * echte ZUGZWANG-Fassung: hier gibt es KEINEN einzelnen gegnerischen Wächter, den Zug 1
 * beseitigt oder bedroht — stattdessen befreit Zug 1 (Th1-h4) den eigenen König unabhängig
 * davon, was Schwarz erwidert. Das wurde nicht nur behauptet, sondern für JEDE der sieben
 * möglichen schwarzen Antworten einzeln geprüft (siehe verify/test-endlosmodus-logic.cjs) —
 * Ka1-a2 bleibt in jedem einzelnen Fall legal.
 */
export const WOLFSFESTE_MATT_IN_2_POSITIONEN = {
  // Stern 1 ("Schlagen"): Turm h1 schlägt den Läufer auf h6 (Zug 1), König a1 zieht
  // anschließend auf das freie Feld a2 (Zug 2).
  stern1: "7k/8/7b/8/8/8/8/K6R w - - 0 1",
  // Stern 2 ("Schlagen", andere Wächterfigur): Turm h1 schlägt den Springer auf h7.
  stern2: "7k/7n/8/8/8/8/8/K6R w - - 0 1",
  // Stern 3 ("Zugzwang"): Turm h1 zieht nach h4 (kein Schlagzug, keine unmittelbare Drohung
  // gegen eine bestimmte Figur) — König a1 kann trotzdem anschließend, egal welche der sieben
  // legalen schwarzen Antworten kommt, gefahrlos auf a2 ziehen.
  stern3: "k7/8/7n/8/8/8/8/K6R w - - 0 1",
} as const;

/*
Beispielnutzung (zum Ausprobieren nach `npm install`, z. B. in einem kurzen Node-Skript
oder Jest-Test — nicht Teil der App-Laufzeit):

  const game = createPosition(QUEST1_POSITIONS.screen2);
  const targets = legalTargetsFor(game, { row: 6, col: 4 }); // e2
  // -> [{row: 5, col: 4}, {row: 4, col: 4}]  (e3 und e4)

  const result = tryMove(game, { row: 6, col: 4 }, { row: 4, col: 4 });
  // -> { ok: true, isCapture: false, isCheck: false, ... }
*/
