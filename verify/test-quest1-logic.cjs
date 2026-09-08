// Echter Testlauf der Kernlogik aus src/lib/chessEngine.ts + src/quest1/Quest1.tsx,
// hier als reines Node/CommonJS-Skript nachgebaut (identische Logik, kein TypeScript/
// JSX nötig), gegen die echte, installierte chess.js-Bibliothek.
//
// Bugfix: verwies bisher auf eine nie mitgelieferte Datei "./chess-lib.cjs" (Rest eines
// geplanten Offline-Ersatzes aus einer Zeit ohne npm-Zugriff) und war dadurch nicht
// lauffähig. Jetzt, nach echtem `npm install`, gegen das echte node_modules/chess.js.
//
// Ausführen mit: node verify/test-quest1-logic.cjs (im Projektordner, nach npm install)

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

const QUEST1_POSITIONS = {
  screen2: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
  screen4Blocked: "4k3/8/8/8/4n3/8/4P3/4K3 w - - 0 1",
  // Bugfix: König von e1 nach h1 verschoben — auf e1 stand er im Schach des Springers
  // auf f3 (Springer deckt auch e1 ab), siehe chessEngine.ts für Details.
  screen5Capture: "4k3/8/8/8/8/5n2/4P3/7K w - - 0 1",
};

let failures = 0;
function check(label, condition) {
  console.log((condition ? "OK   " : "FEHLT") + "  " + label);
  if (!condition) failures++;
}

// --- Screen 2: Einzelschritt (Curriculum-Filter aktiv) ---
{
  const game = new Chess(QUEST1_POSITIONS.screen2);
  const pieceAt = { row: 6, col: 4 }; // e2
  const all = legalTargetsFor(game, pieceAt);
  check("Screen2: chess.js liefert 2 Rohzüge (e3+e4) vor Filterung", all.length === 2);
  const filtered = all.filter((t) => Math.abs(t.row - pieceAt.row) === 1 && t.col === pieceAt.col);
  check("Screen2: nach restrictToSingleStep bleibt genau e3 übrig", filtered.length === 1 && toAlgebraic(filtered[0]) === "e3");
  const result = tryMove(game, pieceAt, filtered[0]);
  check("Screen2: Zug auf e3 ist laut chess.js legal", result.ok === true);
}

// --- Screen 4: Blockade / Stopp!-Aufgabe ---
{
  const game = new Chess(QUEST1_POSITIONS.screen4Blocked);
  const pieceAt = { row: 6, col: 4 }; // e2
  const all = legalTargetsFor(game, pieceAt);
  check("Screen4: durch Springer auf e4 blockiert -> nur e3 legal", all.length === 1 && toAlgebraic(all[0]) === "e3");
  const trapAt = { row: 4, col: 4 }; // e4
  const trapIsIllegal = !all.some((t) => t.row === trapAt.row && t.col === trapAt.col);
  check("Screen4: e4 (Stopp!-Zielfeld) ist tatsächlich NICHT unter den Legalzügen", trapIsIllegal);
  const attempt = tryMove(game, pieceAt, trapAt);
  check("Screen4: Versuch, auf e4 zu ziehen, wird von chess.js abgelehnt (ok:false)", attempt.ok === false);
}

// --- Screen 5: Diagonales Schlagen (Curriculum-Filter aktiv) ---
{
  const game = new Chess(QUEST1_POSITIONS.screen5Capture);
  const pieceAt = { row: 6, col: 4 }; // e2
  const all = legalTargetsFor(game, pieceAt);
  check("Screen5: chess.js liefert 3 Rohzüge (e3, e4, f3-Schlag) vor Filterung", all.length === 3);
  const onlyDiagonal = all.filter((t) => t.col !== pieceAt.col);
  check("Screen5: nach onlyDiagonal-Filter bleibt genau f3 übrig", onlyDiagonal.length === 1 && toAlgebraic(onlyDiagonal[0]) === "f3");
  const result = tryMove(game, pieceAt, onlyDiagonal[0]);
  check("Screen5: Zug ist ein echtes Schlagen (isCapture: true)", result.ok === true && result.isCapture === true);
}

console.log("\n" + (failures === 0 ? "Alle Prüfungen bestanden (echtes chess.js)." : `${failures} Prüfung(en) fehlgeschlagen.`));
process.exit(failures === 0 ? 0 : 1);
