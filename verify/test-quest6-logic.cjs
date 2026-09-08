// Testlauf der Quest-6-Kernlogik aus src/lib/chessEngine.ts (QUEST6_POSITIONS) +
// src/quest6/Quest6.tsx, als reines Node/CommonJS-Skript, gegen die echte, installierte
// chess.js-Bibliothek.
//
// Besonderheit dieser Quest: Screen 4 ist ein ECHTES Schach (siehe Kommentare in
// chessEngine.ts/Quest6.tsx) — hier zählt nicht nur "wird blockiert", sondern "welche
// Fluchtfelder bleiben nach chess.js' eigener Schach-Prüfung übrig". Wichtiger Fund beim
// unabhängigen Gegenrechnen dieser Zahlen (siehe Kommentar unten bei Screen 5): auch OHNE
// akutes Schach kann ein Zug ins Schach ziehen und dadurch illegal sein — das reduziert
// die Fluchtfeld-Zahl in Screen 5 von den naiv erwarteten 8 auf tatsächlich 6.
//
// Ausführen mit: node verify/test-quest6-logic.cjs (im Projektordner, nach npm install)

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

const QUEST6_POSITIONS = {
  screen2: "4k3/8/8/8/3K4/8/8/8 w - - 0 1",
  screen4Check: "7k/8/2n5/8/3K4/8/8/8 w - - 0 1",
  screen5Capture: "7k/8/8/4n3/3K4/8/8/8 w - - 0 1",
};

let failures = 0;
function check(label, condition) {
  console.log((condition ? "OK   " : "FEHLT") + "  " + label);
  if (!condition) failures++;
}

// --- Screen 2: offenes Feld, alle 8 Nachbarfelder ---
{
  const game = new Chess(QUEST6_POSITIONS.screen2);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen2: König steht NICHT im Schach", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  check("Screen2: chess.js liefert 8 Rohzüge (alle Nachbarfelder)", all.length === 8);
  const filtered = all.filter(withinWindow);
  check("Screen2: alle 8 Nachbarfelder liegen im 5x5-Anzeigefenster", filtered.length === 8);
}

// --- Screen 4: ECHTES Schach (Springer auf c6 deckt d4) ---
{
  const game = new Chess(QUEST6_POSITIONS.screen4Check);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen4: König steht im Schach (Springer c6 deckt d4 ab)", game.inCheck() === true);
  const all = legalTargetsFor(game, pieceAt);
  check(
    "Screen4: chess.js liefert genau 7 Fluchtfelder (e5 bleibt vom Springer bedroht, siehe trapAt)",
    all.length === 7
  );
  const filtered = all.filter(withinWindow);
  check("Screen4: alle 7 Fluchtfelder liegen im Anzeigefenster", filtered.length === 7);
  const trapAt = { row: 3, col: 4 }; // e5
  const trapIsIllegal = !all.some((t) => t.row === trapAt.row && t.col === trapAt.col);
  check("Screen4: e5 (Stopp!-Zielfeld, weiterhin bedroht) ist NICHT unter den Legalzügen", trapIsIllegal);
  const attempt = tryMove(game, pieceAt, trapAt);
  check("Screen4: Versuch, auf e5 zu ziehen, wird von chess.js abgelehnt (Zug ins Schach)", attempt.ok === false);
}

// --- Screen 5: KEIN Schach, aber zwei Nachbarfelder bleiben trotzdem illegal ---
{
  const game = new Chess(QUEST6_POSITIONS.screen5Capture);
  const pieceAt = { row: 4, col: 3 }; // d4
  check("Screen5: König steht NICHT im Schach (Springer e5 deckt d4 nicht ab)", game.inCheck() === false);
  const all = legalTargetsFor(game, pieceAt);
  // Unabhängig gegengerechnet (siehe verify_helper.py-Notiz): der Springer auf e5 deckt
  // zwar nicht d4 selbst, wohl aber c4 und d3 (zwei der acht Nachbarfelder) — ein Zug
  // dorthin wäre ein Zug INS Schach und ist deshalb trotz "kein akutes Schach" illegal.
  // Es bleiben 6 Legalzüge, nicht 8: c3, c5, d5, e3, e4 und der Schlagzug auf e5 selbst.
  check(
    "Screen5: chess.js liefert 6 Rohzüge (c4 und d3 blieben durch den Springer bedroht und sind illegal)",
    all.length === 6
  );
  const stillGuardedByKnight = [{ row: 4, col: 2 }, { row: 5, col: 3 }]; // c4, d3
  for (const sq of stillGuardedByKnight) {
    check(
      `Screen5: ${toAlgebraic(sq)} bleibt vom Springer gedeckt und ist NICHT unter den Legalzügen`,
      !all.some((t) => t.row === sq.row && t.col === sq.col)
    );
  }
  const filtered = all.filter(withinWindow);
  check("Screen5: alle 6 Legalzüge liegen im Anzeigefenster", filtered.length === 6);
  const captureAt = { row: 3, col: 4 }; // e5
  const onlyCapture = filtered.filter((t) => t.row === captureAt.row && t.col === captureAt.col);
  check("Screen5: nach onlyCaptureAt-Filter bleibt genau e5 übrig", onlyCapture.length === 1 && toAlgebraic(onlyCapture[0]) === "e5");
  const result = tryMove(game, pieceAt, onlyCapture[0]);
  check("Screen5: Zug ist ein echtes Schlagen (isCapture: true)", result.ok === true && result.isCapture === true);
}

console.log("\n" + (failures === 0 ? "Alle Prüfungen bestanden (echtes chess.js)." : `${failures} Prüfung(en) fehlgeschlagen.`));
process.exit(failures === 0 ? 0 : 1);
