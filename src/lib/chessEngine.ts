// Dünner Wrapper um chess.js (BSD-2-Clause), siehe konzept/technisches_konzept.md Abschnitt 1a.
//
// Zweck: ersetzt die im Web-Prototyp fest kodierten "legalTargets"-Arrays pro Screen
// (siehe prototyp/client/src/quest1/Quest1.tsx) durch echte, von chess.js abgeleitete
// Legalzüge. Die App zeigt nie algebraische Notation an — die Umrechnung {row, col} <-> "e4"
// passiert ausschließlich hier, nicht in der UI.
//
// WICHTIG: Diese Datei ist funktionsfähiger TypeScript-Code, wurde aber in dieser Umgebung
// nicht ausgeführt (kein npm install möglich, siehe README). Vor Verwendung: `npm install`
// und die kommentierten Beispiele am Dateiende einmal in einem Test/REPL prüfen.

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
  // Screen 4: Blockade direkt davor -> chess.js liefert hier bewusst KEINE legalen
  // Vorwärtszüge; die Stopp!-Aufgabe (Board.tsx `trapTarget`) bleibt separate UI-Logik,
  // da chess.js nur "legal ja/nein" kennt, keine "zeig die Konsequenz"-Animation.
  screen4Blocked: "4k3/8/8/8/4n3/8/4P3/4K3 w - - 0 1",
  // Screen 5: gegnerische Figur schräg vorne (f3) -> legalTargetsFor enthält
  // automatisch das Schlagfeld, weil chess.js Bauern-Schlagzüge korrekt generiert.
  // Wichtig: ein e2-Bauer schlägt nur auf d3/f3 (ein Feld diagonal), nicht auf d4/f4 —
  // eine frühere Fassung dieser FEN hatte die Figur fälschlich auf d4 platziert.
  screen5Capture: "4k3/8/8/8/8/5n2/4P3/4K3 w - - 0 1",
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
