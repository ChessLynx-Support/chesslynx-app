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
  return new Chess(fen);
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
export const QUEST1_POSITIONS = {
  // Screen 2: einfacher Schritt geradeaus, Bauer noch nicht gezogen -> auch Doppelschritt legal
  screen2: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
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
  screen4Blocked: "4k3/8/8/8/8/4N3/4P3/4K3 w - - 0 1",
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
  // geblieben, weil dieser Screen früher nur den Schlagzug anbot (heute zeigt
  // QuestMoveScreen.tsx alle Legalzüge, siehe dortiger Kommentar), aber inhaltlich falsch:
  // die Szene sollte ein neutrales Übungsfeld sein,
  // kein verstecktes Schach. König jetzt auf h1 (außerhalb des Springer-Zielmusters),
  // Rest der Stellung unverändert.
  screen5Capture: "4k3/8/8/8/8/5n2/4P3/7K w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 2 (Turm/Schildkröte). Turm steht durchgehend
 * auf a1 (real row 7, col 0), damit ein einziges festes Anzeigefenster (siehe
 * rowOffset/colOffset in Quest2.tsx) für alle Screens funktioniert — analog zum e2-Bauern
 * in Quest 1.
 */
export const QUEST2_POSITIONS = {
  // Bugfix (Nutzer-Feedback 2026-09-07, "dem Turm werden rechts nur wenige Felder
  // vorgeschlagen, obwohl die ganze Linie entlang ziehen könnte"): Der weiße König stand
  // hier bisher auf e1 — DERSELBEN Reihe wie der Turm auf a1 — und blockierte die
  // Rechtsbewegung dadurch schon nach 3 Feldern (b1–d1). Technisch korrektes Schach
  // (eine Figur darf nicht über die eigene hinwegziehen), aber pädagogisch genau falsch
  // für einen Screen, der zeigen soll "der Turm zieht so weit die Bahn frei ist" — und
  // anders als bei Quest 3–5 (König bewusst auf h1, siehe dortiger Kommentar, nachweislich
  // außerhalb jeder Zuglinie der Übungsfigur) war Quest 2 hier die einzige Ausnahme. König
  // jetzt auf h4 verschoben — weder auf der a-Linie noch der 1. Reihe des Turms, exakt
  // nach demselben Muster wie bei den anderen Quests.
  // Screen 2: offene Bahn -> Turm darf beliebig weit senkrecht (a-Linie, a2–a8) UND
  // waagerecht (komplette 1. Reihe, b1–h1) ziehen, nirgends vom eigenen König verkürzt.
  screen2: "4k3/8/8/8/7K/8/8/R7 w - - 0 1",
  // Screen 4: eigener Bauer auf a3 blockiert die Linie nach einem freien Feld (a2) ->
  // chess.js liefert a2 + die (jetzt vollständig freie) 1. Reihe als Legalzüge, a3 (und
  // alles dahinter) bleibt nicht erreichbar. a3 selbst ist das Stopp!-Zielfeld (dort steht
  // ja schon eine Figur, "darüber hinweg" ist gemeint, siehe SCREEN_SCRIPTS). Die breitere
  // freie 1. Reihe wird inzwischen ebenfalls angezeigt (siehe QuestMoveScreen.tsx-
  // Kommentar) und schließt den Screen ebenso ab wie a2 selbst.
  screen4Blocked: "4k3/8/8/8/7K/P7/8/R7 w - - 0 1",
  // Screen 5: gegnerischer Springer auf a4, Weg dorthin frei -> a4 ist ein echter,
  // legaler Schlagzug. König ebenfalls auf Reihe 4, aber auf h4 statt a4 — kein Konflikt
  // mit dem Springer, kein verstecktes Schach (h4 liegt außerhalb jedes Springerzugs von
  // a4 aus).
  screen5Capture: "4k3/8/8/8/n6K/8/8/R7 w - - 0 1",
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
  screen2: "4k3/8/8/8/3B4/8/8/7K w - - 0 1",
  // Screen 4: eigener Bauer auf f6 (zwei Diagonalfelder entfernt) blockiert genau diese
  // eine Diagonale nach einem freien Feld (e5) -> f6 ist das Stopp!-Zielfeld, die andere
  // Diagonale bleibt komplett frei.
  screen4Blocked: "4k3/8/5P2/8/3B4/8/8/7K w - - 0 1",
  // Screen 5: gegnerischer Springer auf f6 (gleiches Feld wie oben, jetzt gegnerisch) ->
  // legaler Schlagzug am Ende der offenen Diagonale.
  screen5Capture: "4k3/8/5n2/8/3B4/8/8/7K w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 4 (Springer/Pferd). Springer durchgehend auf
 * d4. Besonderheit laut Projektwissen: der Springer ist die einzige Figur, die über
 * andere hinwegziehen darf — Screen 4 zeigt das als positive Überraschung, nicht als
 * Stopp!-Aufgabe (kein trapTarget nötig, die Sprungfelder bleiben unverändert legal).
 */
export const QUEST4_POSITIONS = {
  // Screen 2: offenes Feld -> alle 8 Sprungfelder des Springermusters sind erreichbar.
  screen2: "4k3/8/8/8/3N4/8/8/7K w - - 0 1",
  // Screen 4 (Nutzer-Feedback 2026-09-07, "Es sollten sinnvolle Züge des Pferds mit
  // weißen Figuren verdeckt werden, und alle möglichen Züge und ggf. ein Zug mit
  // Materialgewinn vorgeschlagen werden"): löst sowohl die alte "eine Figur steht im Weg"-
  // Demonstration als auch das separate Schlagfeld-Screen ab, jetzt in einer einzigen
  // Stellung kombiniert.
  // Korrektur (Nutzer-Feedback 2026-09-07, nach dem ersten `npm test`-Durchlauf: "Es ist
  // sehr unrealistisch, dass der Springer von so vielen anderen Springern umzingelt ist.
  // Vielleicht sinnvoller, dass der Springer hinter einer 3er Bauernkette steht"): die
  // ursprüngliche Fassung umgab den Springer auf ALLEN acht angrenzenden Feldern mit
  // eigenen Bauern — dabei zeigte Quest4.tsx (Bug, separat behoben) fälschlich Springer-
  // Icons statt Bauern-Icons an diesen Feldern, wodurch der Springer optisch von sieben
  // weiteren Springern umzingelt wirkte (real und pro Seite unmöglich). Jetzt eine
  // realistischere, kleinere Bauernkette (c3/d3/e3, direkt hinter dem Springer) statt des
  // vollen Rings aus acht Figuren — didaktisch unverändert: keines der drei Felder ist ein
  // Sprungziel, chess.js liefert deshalb weiterhin unverändert alle 8 Sprünge (b3/b5/c2/
  // c6/e2/e6/f3/f5). Auf einem dieser Sprungfelder (c6) wartet weiterhin eine gegnerische
  // Figur — ein echter Schlagzug mit Materialgewinn bleibt eine der acht gleichwertig
  // angebotenen Möglichkeiten (siehe QuestMoveScreen.tsx: alle Legalzüge werden jetzt immer
  // angezeigt, die gesprochene Zeile weist gezielt auf das Schlagen hin).
  screen4Blocked: "7k/8/2n5/8/3N4/2PPP3/8/7K w - - 0 1",
} as const;

/**
 * Kuratierte Beispiel-Stellungen für Quest 5 (Dame/Schwan). Dame durchgehend auf d4 —
 * kombiniert die Diagonalen von Quest 3 mit den geraden Linien von Quest 2.
 */
export const QUEST5_POSITIONS = {
  // Screen 2: offenes Feld -> Dame darf auf allen vier geraden UND vier diagonalen
  // Richtungen ziehen (Turm + Läufer kombiniert).
  screen2: "4k3/8/8/8/3Q4/8/8/7K w - - 0 1",
  // Screen 4: eigener Bauer auf d6 blockiert nur die senkrechte Linie nach einem freien
  // Feld (d5) -> d6 ist das Stopp!-Zielfeld, alle anderen sieben Richtungen bleiben frei.
  screen4Blocked: "4k3/8/3P4/8/3Q4/8/8/7K w - - 0 1",
  // Screen 5: gegnerischer Springer auf f6 (Ende der offenen a1-h8-Diagonale) -> legaler
  // Schlagzug.
  screen5Capture: "4k3/8/5n2/8/3Q4/8/8/7K w - - 0 1",
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
  screen2: "4k3/8/8/8/3K4/8/8/8 w - - 0 1",
  // Screen 4: gegnerischer Springer auf c6 gibt Schach (Springer deckt d4 ab) -> von den
  // 8 Nachbarfeldern bleibt e5 illegal (weiterhin vom Springer bedroht), die übrigen 7
  // lösen das Schach auf ("wegziehen"). Springer bewusst als Angreifer statt einer
  // Linienfigur gewählt, damit die Bedrohung innerhalb des kleinen Anzeigefensters
  // überhaupt sichtbar bleibt (bei Turm/Dame/Läufer stünde die angreifende Figur weit
  // außerhalb des Fensters).
  screen4Check: "7k/8/2n5/8/3K4/8/8/8 w - - 0 1",
  // Screen 5: gegnerischer (ungedeckter) Springer direkt neben dem König auf e5, KEIN
  // Schach (Springer deckt d4 nicht ab, siehe QUEST5_POSITIONS-Kommentar zur selben
  // Prüfung) -> normales Schlagen, wie bei jeder anderen Figur auch.
  screen5Capture: "7k/8/8/4n3/3K4/8/8/8 w - - 0 1",
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
