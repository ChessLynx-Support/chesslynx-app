// Testlauf der Quest-2-Kernlogik aus src/lib/chessEngine.ts (QUEST2_POSITIONS) +
// src/quest2/Quest2.tsx, als reines Node/CommonJS-Skript (identische Logik, kein
// TypeScript/JSX nötig), gegen die echte, installierte chess.js-Bibliothek.
//
// Ausführen mit: node verify/test-quest2-logic.cjs (im Projektordner, nach npm install)

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
  return sq.row >= 3 && sq.row <= 7 && sq.col >= 0 && sq.col <= 4;
}

const QUEST2_POSITIONS = {
  screen2: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
  screen4Blocked: "4k3/8/8/8/8/P7/8/R3K3 w - - 0 1",
  screen5Capture: "4k3/8/8/8/n7/8/8/R3K3 w - - 0 1",
};

let failures = 0;
function check(label, condition) {
  console.log((condition ? "OK   " : "FEHLT") + "  " + label);
  if (!condition) failures++;
}

// --- Screen 2: offene Bahn, senkrecht + waagerecht (Fensterfilter aktiv) ---
{
  const game = new Chess(QUEST2_POSITIONS.screen2);
  const pieceAt = { row: 7, col: 0 }; // a1
  const all = legalTargetsFor(game, pieceAt);
  check("Screen2: chess.js liefert 10 Rohzüge (a2-a8 + b1-d1)", all.length === 10);
  const filtered = all.filter(withinWindow);
  check(
    "Screen2: nach Fensterfilter bleiben 7 Zielfelder (a2-a5 + b1-d1)",
    filtered.length === 7
  );
  check(
    "Screen2: a6/a7/a8 liegen außerhalb des Fensters und werden korrekt herausgefiltert",
    !filtered.some((t) => toAlgebraic(t) === "a6" || toAlgebraic(t) === "a7" || toAlgebraic(t) === "a8")
  );
  const result = tryMove(game, pieceAt, fromAlgebraic("a3"));
  check("Screen2: Zug auf a3 ist laut chess.js legal", result.ok === true);
}

// --- Screen 4: Blockade / Stopp!-Aufgabe (eigener Bauer auf a3) ---
{
  const game = new Chess(QUEST2_POSITIONS.screen4Blocked);
  const pieceAt = { row: 7, col: 0 }; // a1
  const all = legalTargetsFor(game, pieceAt);
  check(
    "Screen4: durch eigenen Bauern auf a3 blockiert -> nur a2 + b1/c1/d1 legal (4 Züge)",
    all.length === 4
  );
  const trapAt = { row: 5, col: 0 }; // a3
  const trapIsIllegal = !all.some((t) => t.row === trapAt.row && t.col === trapAt.col);
  check("Screen4: a3 (Stopp!-Zielfeld, eigene Figur) ist NICHT unter den Legalzügen", trapIsIllegal);
  const attempt = tryMove(game, pieceAt, trapAt);
  check("Screen4: Versuch, auf a3 zu ziehen, wird von chess.js abgelehnt (ok:false)", attempt.ok === false);
  const attemptBeyond = tryMove(game, pieceAt, fromAlgebraic("a4"));
  check("Screen4: Versuch, über die Blockade hinaus auf a4 zu ziehen, wird abgelehnt", attemptBeyond.ok === false);
}

// --- Screen 5: Schlagen am Ende einer offenen Linie (gegnerischer Springer auf a4) ---
{
  const game = new Chess(QUEST2_POSITIONS.screen5Capture);
  const pieceAt = { row: 7, col: 0 }; // a1
  const all = legalTargetsFor(game, pieceAt);
  check(
    "Screen5: chess.js liefert 6 Rohzüge (a2, a3, a4-Schlag, b1, c1, d1) vor Filterung",
    all.length === 6
  );
  const captureAt = { row: 4, col: 0 }; // a4
  const onlyCapture = all.filter((t) => t.row === captureAt.row && t.col === captureAt.col);
  check("Screen5: nach onlyCaptureAt-Filter bleibt genau a4 übrig", onlyCapture.length === 1 && toAlgebraic(onlyCapture[0]) === "a4");
  const result = tryMove(game, pieceAt, onlyCapture[0]);
  check("Screen5: Zug ist ein echtes Schlagen (isCapture: true)", result.ok === true && result.isCapture === true);
}

console.log("\n" + (failures === 0 ? "Alle Prüfungen bestanden (echtes chess.js)." : `${failures} Prüfung(en) fehlgeschlagen.`));
process.exit(failures === 0 ? 0 : 1);
