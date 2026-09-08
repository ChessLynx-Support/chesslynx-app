// Testlauf der Quest-3-Kernlogik aus src/lib/chessEngine.ts (QUEST3_POSITIONS) +
// src/quest3/Quest3.tsx, als reines Node/CommonJS-Skript (identische Logik, kein
// TypeScript/JSX nötig), gegen die echte, installierte chess.js-Bibliothek.
//
// Alle Roh-/Filter-Zahlen unten wurden NICHT nur aus dem Kopf übernommen, sondern vorab
// mit einem unabhängigen kleinen Zuggenerator-Skript gegengerechnet (siehe Lehre aus dem
// Quest-1-Bug: versteckte Schach-Stellungen erst durch echten Testlauf gefunden).
//
// Ausführen mit: node verify/test-quest3-logic.cjs (im Projektordner, nach npm install)

const { Chess } = require("chess.js");

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
function toAlgebraic(sq) {
  return `${FILES[sq.col]}${8 - sq.row}`;
}
function fromAlgebraic(a) {
  return { row: 8 - Number(a[1]), col: FILES.indexOf(a[0]) };
}
function legalTargetsFor(game, from) {
  return game.moves({ square: toAlgebraic(from), verbose: true }).map((m) => fromAlgebraic(m.to));
}
function tryMove(game, from, to) {
  try {
    const move = game.move({ from: toAlgebraic(from), to: toAlgebraic(to), promotion: "q" });
    if (!move) return { ok: false };
    return { ok: true, isCapture: Boolean(move.captured), isCheck: game.inCheck(), isCheckmate: game.isCheckmate() };
  } catch {
    return { ok: false };
  }
}
function withinWindow(sq) {
  return sq.row >= 2 && sq.row <= 6 && sq.col >= 1 && sq.col <= 5;
}

const QUEST3_POSITIONS = {
  screen2: "4k3/8/8/8/3B4/8/8/7K w - - 0 1",
  screen4Blocked: "4k3/8/5P2/8/3B4/8/8/7K w - - 0 1",
  screen5Capture: "4k3/8/5n2/8/3B4/8/8/7K w - - 0 1",
};

let failures = 0;
function check(label, condition) {
  console.log((condition ? "OK   " : "FEHLT") + "  " + label);
  if (!condition) failures++;
}

// --- Screen 2: offenes Feld, beide Diagonalen (Fensterfilter aktiv) ---
{
  const game = new Chess(QUEST3_POSITIONS.screen2);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen2: König h1 steht NICHT im Schach (keine versteckte Schach-Stellung)", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check("Screen2: chess.js liefert 13 Rohzüge (beide Diagonalen bis zum Rand)", all.length === 13);
  const filtered = all.filter(withinWindow);
  check("Screen2: nach Fensterfilter bleiben 8 Zielfelder", filtered.length === 8);
  const result = tryMove(game, pieceAt, fromAlgebraic("e5"));
  check("Screen2: Zug auf e5 ist laut chess.js legal", result.ok === true);
}

// --- Screen 4: Blockade / Stopp!-Aufgabe (eigener Bauer auf f6) ---
{
  const game = new Chess(QUEST3_POSITIONS.screen4Blocked);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen4: König h1 steht NICHT im Schach", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check("Screen4: durch eigenen Bauern auf f6 blockiert -> 10 Rohzüge (statt 13)", all.length === 10);
  const filtered = all.filter(withinWindow);
  check("Screen4: nach Fensterfilter bleiben 7 Zielfelder", filtered.length === 7);
  const trapAt = { row: 2, col: 5 }; // f6
  const trapIsIllegal = !all.some((t) => t.row === trapAt.row && t.col === trapAt.col);
  check("Screen4: f6 (Stopp!-Zielfeld, eigene Figur) ist NICHT unter den Legalzügen", trapIsIllegal);
  const attempt = tryMove(game, pieceAt, trapAt);
  check("Screen4: Versuch, auf f6 zu ziehen, wird von chess.js abgelehnt (ok:false)", attempt.ok === false);
}

// --- Screen 5: Schlagen am Ende einer offenen Diagonale (gegnerischer Springer auf f6) ---
{
  const game = new Chess(QUEST3_POSITIONS.screen5Capture);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen5: König h1 steht NICHT im Schach (Springer f6 deckt h1 nicht ab)", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check("Screen5: chess.js liefert 11 Rohzüge vor Filterung", all.length === 11);
  const filtered = all.filter(withinWindow);
  check("Screen5: nach Fensterfilter bleiben 8 Zielfelder", filtered.length === 8);
  const captureAt = { row: 2, col: 5 }; // f6
  const onlyCapture = filtered.filter((t) => t.row === captureAt.row && t.col === captureAt.col);
  check("Screen5: nach onlyCaptureAt-Filter bleibt genau f6 übrig", onlyCapture.length === 1 && toAlgebraic(onlyCapture[0]) === "f6");
  const result = tryMove(game, pieceAt, onlyCapture[0]);
  check("Screen5: Zug ist ein echtes Schlagen (isCapture: true)", result.ok === true && result.isCapture === true);
}

console.log("\n" + (failures === 0 ? "Alle Prüfungen bestanden (echtes chess.js)." : `${failures} Prüfung(en) fehlgeschlagen.`));
process.exit(failures === 0 ? 0 : 1);
