// Testlauf der Quest-4-Kernlogik aus src/lib/chessEngine.ts (QUEST4_POSITIONS) +
// src/quest4/Quest4.tsx, als reines Node/CommonJS-Skript, gegen die echte, installierte
// chess.js-Bibliothek.
//
// Zentrale Aussage dieser Quest: der Springer wird NICHT durch benachbarte Figuren
// blockiert — die Anzahl der Legalzüge bleibt in Screen 4 exakt gleich wie in Screen 2
// (8 Sprungfelder, jeweils vollständig innerhalb des 5x5-Anzeigefensters).
//
// Ausführen mit: node verify/test-quest4-logic.cjs (im Projektordner, nach npm install)

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

const QUEST4_POSITIONS = {
  screen2: "4k3/8/8/8/3N4/8/8/7K w - - 0 1",
  screen4Blocked: "4k3/8/8/8/2PN4/8/8/7K w - - 0 1",
  screen5Capture: "4k3/8/2n5/8/3N4/8/8/7K w - - 0 1",
};

let failures = 0;
function check(label, condition) {
  console.log((condition ? "OK   " : "FEHLT") + "  " + label);
  if (!condition) failures++;
}

// --- Screen 2: offenes Feld, alle 8 Sprungfelder ---
{
  const game = new Chess(QUEST4_POSITIONS.screen2);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen2: König h1 steht NICHT im Schach", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check("Screen2: chess.js liefert 8 Rohzüge (alle Sprungfelder)", all.length === 8);
  const filtered = all.filter(withinWindow);
  check("Screen2: alle 8 Sprungfelder liegen im 5x5-Anzeigefenster", filtered.length === 8);
}

// --- Screen 4: "Blockade", die keine ist (Figur auf c4, Springer springt drüber) ---
{
  const game = new Chess(QUEST4_POSITIONS.screen4Blocked);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen4: König h1 steht NICHT im Schach", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check(
    "Screen4: trotz Figur auf c4 bleiben unverändert 8 Rohzüge (Springer wird nicht blockiert)",
    all.length === 8
  );
  const filtered = all.filter(withinWindow);
  check("Screen4: weiterhin alle 8 Sprungfelder im Fenster", filtered.length === 8);
  // Die "im Weg stehende" Figur auf c4 selbst ist kein Sprungziel und bleibt daher
  // logischerweise nicht unter den Legalzügen (sie steht nicht auf einem L-Muster-Feld).
  const blockerSquare = { row: 4, col: 2 }; // c4
  check(
    "Screen4: c4 selbst (die Figur daneben) ist kein Sprungziel und taucht nicht in den Legalzügen auf",
    !all.some((t) => t.row === blockerSquare.row && t.col === blockerSquare.col)
  );
}

// --- Screen 5: Schlagen eines der 8 Sprungfelder (gegnerischer Springer auf c6) ---
{
  const game = new Chess(QUEST4_POSITIONS.screen5Capture);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen5: König h1 steht NICHT im Schach (Springer c6 deckt h1 nicht ab)", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check("Screen5: chess.js liefert weiterhin 8 Rohzüge (c6 jetzt als Schlagfeld statt leer)", all.length === 8);
  const filtered = all.filter(withinWindow);
  check("Screen5: alle 8 Zielfelder weiterhin im Fenster", filtered.length === 8);
  const captureAt = { row: 2, col: 2 }; // c6
  const onlyCapture = filtered.filter((t) => t.row === captureAt.row && t.col === captureAt.col);
  check("Screen5: nach onlyCaptureAt-Filter bleibt genau c6 übrig", onlyCapture.length === 1 && toAlgebraic(onlyCapture[0]) === "c6");
  const result = tryMove(game, pieceAt, onlyCapture[0]);
  check("Screen5: Zug ist ein echtes Schlagen (isCapture: true)", result.ok === true && result.isCapture === true);
}

console.log("\n" + (failures === 0 ? "Alle Prüfungen bestanden (echtes chess.js)." : `${failures} Prüfung(en) fehlgeschlagen.`));
process.exit(failures === 0 ? 0 : 1);
