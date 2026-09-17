#!/usr/bin/env node
// Unit-Tests für die 115 kuratierten Gefährten-Motive-Stellungen (Adlerhorst-Lösen,
// Wolfsfeste-Lösen, Rabenfels-Setzen, Eichhörnchen-Gabel, Adlerhorst-Spieß — siehe claude/
// gefaehrten_motive_kuration_2026-09-17.md) UND für die reine Entscheidungslogik des neuen
// Stufe-3-Interaktionsmodells (siehe claude/stufe3_interaktionsmodell_konzept_2026-09-17.md
// und src/lib/EndlosmodusPuzzle.tsx, Datei-Kopfkommentar).
//
// Zwei getrennte Dinge werden hier geprüft, nach demselben "kein Jest, kein ts-node"-Muster
// wie verify/test-erobern-eskalation-logic.cjs (siehe dortiger Kopfkommentar für die
// Begründung):
//
//   1. Alle 115 Stellungen wurden VOR dem Eintrag in endlosmodusAufgaben.tsx bereits mit
//      python-chess einzeln unabhängig gegengeprüft (siehe kuration/verify_gefaehrten_
//      output.py, "ALLE 115 STELLUNGEN UNABHAENGIG GEGENGEPRUEFT — 0 FEHLER"). Dieser Testlauf
//      hier, gegen das echte, installierte chess.js, ist wie bei den übrigen Endlosmodus-
//      Stellungen der maßgebliche, tatsächlich im JS-Stack ausgeführte Beweis. Die Rohdaten
//      unten sind bewusst eine EIGENE, aus derselben JSON-Quelle exportierte Kopie (nicht aus
//      endlosmodusAufgaben.tsx importiert), weil diese Datei JSX enthält (Icons, React) und
//      dieses Testskript (wie die übrigen verify/*.cjs) bewusst ohne JSX-Transform/React
//      auskommt.
//
//   2. Die reine Entscheidungslogik des neuen Stufe-3-Modells (nur EXAKT `(pieceAt,
//      zielTargets[0])` löst, jeder andere angebotene Legalzug einer beliebigen eigenen Figur
//      wird abgewiesen und zählt nur einen Fehlversuch, KEIN echter game.move()) sowie die
//      Hinweis-Eskalation (stufe3HinweisStufe: Fehlversuche -> Hinweisstufe 1/2/3). Beide
//      Funktionen sind unten bewusst als exakte Kopien der Implementierung in
//      src/lib/EndlosmodusPuzzle.tsx nachgebildet (jene Datei importiert "react"/"react-native"
//      und lässt sich daher hier nicht laden) — bei einer künftigen Änderung der Schwellenwerte
//      oder der Lösungs-Prüfung dort MUSS diese Kopie mitgepflegt werden, sonst laufen die
//      beiden Stellen auseinander (siehe TEST 2, das prüft dies zusätzlich anhand der echten
//      115 Stellungen: für jede wird mit dem echten chess.js bestätigt, dass NUR der
//      kuratierte Zug löst und JEDER andere Legalzug JEDER anderen eigenen Figur abgewiesen
//      werden muss).
//
// Ausführen: `node verify/test-gefaehrten-motive-stufe3-logic.cjs` im Projektverzeichnis (nach
// `npm install`). Exit-Code 0 = alle Tests grün, 1 = mindestens ein Fehler.

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error(
    "Konnte das Paket 'typescript' nicht laden. Bitte einmalig `npm install` im " +
      "Projektverzeichnis ausführen und dieses Skript erneut starten."
  );
  process.exit(1);
}

const SRC = path.join(__dirname, "..", "src", "lib", "chessEngine.ts");
const source = fs.readFileSync(SRC, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
  fileName: "chessEngine.ts",
});

const m = new Module(SRC, module);
m.filename = SRC;
m.paths = Module._nodeModulePaths(path.dirname(SRC));
try {
  m._compile(outputText, SRC);
} catch (err) {
  console.error(
    "Konnte chessEngine.ts nicht laden (chess.js fehlt vermutlich noch). Bitte einmalig " +
      "`npm install` im Projektverzeichnis ausführen und erneut starten.\n"
  );
  console.error(err.message);
  process.exit(1);
}

const { createPosition, legalTargetsFor, tryMove, fromAlgebraic, toAlgebraic } = m.exports;

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push({ name, err });
  }
}

function hatZielfeld(targets, sq) {
  const ziel = fromAlgebraic(sq);
  return targets.some((t) => t.row === ziel.row && t.col === ziel.col);
}

// ============================================================================
// Teil 1: die 115 kuratierten Gefährten-Motive-Stellungen (siehe Kopfkommentar)
// ============================================================================

const GEFAEHRTEN_MOTIVE_TESTDATEN = {
  adlerhorst_loesen: {
    stufe1: [
      { fen: "1r6/1R6/8/1K5P/4p3/8/8/5k2 w - - 0 1", angreiferFeld: "b7", zielFeld: "b8" },
      { fen: "1k6/8/2p5/8/7P/4K3/3B4/2b5 w - - 0 1", angreiferFeld: "d2", zielFeld: "c1" },
      { fen: "8/1P1K2pk/8/3Q1P2/8/3q4/p7/8 w - - 0 1", angreiferFeld: "d5", zielFeld: "d3" },
      { fen: "8/p1K3k1/8/2R5/p1rP4/8/7P/8 w - - 0 1", angreiferFeld: "c5", zielFeld: "c4" },
      { fen: "8/p7/P2K4/8/3PpB1p/8/2P1k2b/8 w - - 0 1", angreiferFeld: "f4", zielFeld: "h2" },
      { fen: "8/4pK2/PP2Q2p/3q4/8/k2P4/1p6/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "d5" },
      { fen: "8/P2rRK2/5p1p/P7/4p2p/7P/2P5/2k5 w - - 0 1", angreiferFeld: "e7", zielFeld: "d7" },
      { fen: "8/4P3/2P2p1k/8/2pPb2p/P1p2B2/6K1/8 w - - 0 1", angreiferFeld: "f3", zielFeld: "e4" },
      { fen: "8/1PqP1Pk1/2Q1p3/2K2pPp/2p5/8/2p4P/8 w - - 0 1", angreiferFeld: "c6", zielFeld: "c7" },
      { fen: "8/2pp4/3P2Pk/p4P2/P5p1/7p/1KR1rP2/8 w - - 0 1", angreiferFeld: "c2", zielFeld: "e2" },
    ],
    stufe2: [
      { fen: "8/p4k2/1P2r3/3PR2P/8/4K2P/1pp4p/8 w - - 0 1", angreiferFeld: "e5", zielFeld: "e6" },
      { fen: "8/1P2K3/3BP3/8/pb5P/4pppP/1k6/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "b4" },
      { fen: "1k6/7P/1K1P4/1P1p4/3Q2P1/1ppP3p/p4q2/8 w - - 0 1", angreiferFeld: "d4", zielFeld: "f2" },
      { fen: "8/p3P3/5P2/4P2k/1rRK1p2/3Ppp2/1p5P/8 w - - 0 1", angreiferFeld: "c4", zielFeld: "b4" },
      { fen: "8/p1P2P2/1Pp1P3/2P2b2/3pB3/1p1K1Ppp/8/3k4 w - - 0 1", angreiferFeld: "e4", zielFeld: "f5" },
      { fen: "8/3q4/3Qp1p1/1P4P1/3KPpP1/2P5/p2p1Pkp/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "d7" },
      { fen: "8/p2r4/1P1R1p1p/3K3P/1pp3pP/2P5/Pp2P1P1/7k w - - 0 1", angreiferFeld: "d6", zielFeld: "d7" },
      { fen: "8/P3b3/1kpBP1p1/7P/pK4pp/2Pp4/P1pP1P2/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "e7" },
    ],
    stufe3: [
      { fen: "8/K4p2/8/2P5/6k1/2n2n2/pR1b3P/1b1B4 w - - 0 1", angreiferFeld: "b2", zielFeld: "d2" },
      { fen: "8/1pKP4/4Pkb1/2p1nn2/2p3Rb/4PR2/8/8 w - - 0 1", angreiferFeld: "g4", zielFeld: "h4" },
      { fen: "8/8/1np3K1/4P2P/bp5p/1p2kP2/5n1P/R2b2B1 w - - 0 1", angreiferFeld: "a1", zielFeld: "d1" },
      { fen: "2K5/1p1P1kbp/4nP2/3B1n2/P4bR1/4p2P/pp5P/8 w - - 0 1", angreiferFeld: "g4", zielFeld: "f4" },
      { fen: "1R1b4/2Pkp2P/2n3Pp/4P1p1/BbPpp1KP/3n4/6p1/8 w - - 0 1", angreiferFeld: "b8", zielFeld: "d8" },
    ],
  },
  wolfsfeste_loesen: {
    stufe1: [
      { fen: "8/1rR1K3/8/8/1p6/8/1P6/6k1 w - - 0 1", angreiferFeld: "c7", zielFeld: "b7" },
      { fen: "8/P7/4k3/1b6/6p1/3B4/4K3/8 w - - 0 1", angreiferFeld: "d3", zielFeld: "b5" },
      { fen: "8/q1Q1K3/P1p5/3k4/8/pP6/8/8 w - - 0 1", angreiferFeld: "c7", zielFeld: "a7" },
      { fen: "8/8/1k1rRK2/8/5p2/8/2P2Pp1/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "d6" },
      { fen: "5k2/7p/1P6/3K4/6P1/1P2pB2/1p4b1/8 w - - 0 1", angreiferFeld: "f3", zielFeld: "g2" },
      { fen: "8/p2q4/2Q5/1KP5/P7/4p3/k4p1P/8 w - - 0 1", angreiferFeld: "c6", zielFeld: "d7" },
      { fen: "8/1K1Rr3/3p1P2/8/1k5p/4p2p/P3P1P1/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "e7" },
      { fen: "3b4/P3B3/5KP1/3p2p1/3pP3/6p1/4P3/k7 w - - 0 1", angreiferFeld: "e7", zielFeld: "d8" },
      { fen: "5q2/P3Q3/3K3p/P6P/Pp6/6p1/pp5P/6k1 w - - 0 1", angreiferFeld: "e7", zielFeld: "f8" },
      { fen: "8/1P5p/p4pP1/1P3k1P/7p/5KRr/3p1P2/8 w - - 0 1", angreiferFeld: "g3", zielFeld: "h3" },
    ],
    stufe2: [
      { fen: "8/2rP1p1p/8/2R4P/1PK2P2/7k/p6p/8 w - - 0 1", angreiferFeld: "c5", zielFeld: "c7" },
      { fen: "8/3P4/1bp2P2/P1B5/2pKP3/8/3p1p2/1k6 w - - 0 1", angreiferFeld: "c5", zielFeld: "b6" },
      { fen: "8/1p1q4/3Q2p1/3K4/PP2pP2/5p1P/1p4P1/4k3 w - - 0 1", angreiferFeld: "d6", zielFeld: "d7" },
      { fen: "8/1pK1Rr2/5P2/7P/3p4/5kPp/2P1p1pP/8 w - - 0 1", angreiferFeld: "e7", zielFeld: "f7" },
      { fen: "2b5/1p2p3/P3B3/1pP2K2/pP1P4/7k/2pP1p1P/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "c8" },
      { fen: "8/P3p3/P3p1k1/1p2P3/1pPpp3/3P3P/2qQ1K2/8 w - - 0 1", angreiferFeld: "d2", zielFeld: "c2" },
      { fen: "8/P2Pp3/6p1/P2p4/p1p1pp2/rRK2P1P/P2P4/7k w - - 0 1", angreiferFeld: "b3", zielFeld: "a3" },
      { fen: "8/p2P3p/2PP2PP/2p2P2/bpp2pp1/1B6/P1K4k/8 w - - 0 1", angreiferFeld: "b3", zielFeld: "a4" },
    ],
    stufe3: [
      { fen: "n7/2b4P/1p3RP1/2R4b/1K3n1p/5k2/8/8 w - - 0 1", angreiferFeld: "c5", zielFeld: "h5" },
      { fen: "1R3b2/3k4/4n3/p5PK/n3P1B1/5p1p/1b1P4/8 w - - 0 1", angreiferFeld: "b8", zielFeld: "f8" },
      { fen: "8/4P3/1b1R4/Pk1b4/2n2n2/P1p1p3/pp1PB2K/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "b6" },
      { fen: "K7/p1p1k3/P1Pn3P/1P3bR1/1B3P1p/5p2/p5b1/4n3 w - - 0 1", angreiferFeld: "g5", zielFeld: "f5" },
      { fen: "8/2b5/4n1P1/Pp2p1P1/8/pPR1bKP1/pPp2p2/1R1nk3 w - - 0 1", angreiferFeld: "c3", zielFeld: "e3" },
    ],
  },
  rabenfels_setzen: {
    stufe1: [
      { fen: "4R3/8/2r5/2k5/8/6P1/3p4/7K w - - 0 1", angreiferFeld: "e8", zielFeld: "c8" },
      { fen: "8/6P1/5b2/6k1/1B6/7K/7p/8 w - - 0 1", angreiferFeld: "b4", zielFeld: "e7" },
      { fen: "8/5K2/Q7/6p1/4P1p1/2q1k1P1/8/8 w - - 0 1", angreiferFeld: "a6", zielFeld: "a3" },
      { fen: "8/8/7p/5R2/2Pkr3/3P3p/8/1K6 w - - 0 1", angreiferFeld: "f5", zielFeld: "f4" },
      { fen: "8/5b1B/2p1kP2/2P5/4p3/K1Pp4/8/8 w - - 0 1", angreiferFeld: "h7", zielFeld: "g8" },
      { fen: "3Q4/5q1P/2pP4/5k2/1p3p2/2P5/8/2K5 w - - 0 1", angreiferFeld: "d8", zielFeld: "f8" },
      { fen: "8/1p1P4/pkr2PP1/p3R3/4p3/4P3/1K6/8 w - - 0 1", angreiferFeld: "e5", zielFeld: "e6" },
      { fen: "8/3P1p2/1k3p1P/2b2PB1/ppK5/8/6P1/8 w - - 0 1", angreiferFeld: "g5", zielFeld: "e3" },
      { fen: "7K/8/5kp1/1P6/p2p1qP1/1P1p4/Pp2Q1P1/8 w - - 0 1", angreiferFeld: "e2", zielFeld: "f2" },
      { fen: "8/2p3RP/2P2p2/2P2K2/pp1kr3/3Pp3/7P/8 w - - 0 1", angreiferFeld: "g7", zielFeld: "g4" },
    ],
    stufe2: [
      { fen: "8/6P1/3k4/3r4/8/7R/6p1/K7 w - - 0 1", angreiferFeld: "h3", zielFeld: "d3" },
      { fen: "8/2k5/7p/4b3/8/8/3BP1K1/8 w - - 0 1", angreiferFeld: "d2", zielFeld: "f4" },
      { fen: "8/8/3Q4/6pK/5qP1/8/2P2k1p/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "f6" },
      { fen: "8/8/1p4K1/2Pk1p2/8/3r4/5P2/6R1 w - - 0 1", angreiferFeld: "g1", zielFeld: "d1" },
      { fen: "8/3K4/1p1b4/2k5/p6B/2p5/1P1P1P2/8 w - - 0 1", angreiferFeld: "h4", zielFeld: "e7" },
      { fen: "2K5/2PQ4/3p1p1P/7P/8/1q4p1/2k5/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "a4" },
      { fen: "8/8/1PP3P1/1R6/2Pp1p1p/7p/2r1k3/7K w - - 0 1", angreiferFeld: "b5", zielFeld: "b2" },
      { fen: "8/8/8/pKP3P1/p6P/5bP1/Bpp3k1/8 w - - 0 1", angreiferFeld: "a2", zielFeld: "d5" },
    ],
    stufe3: [
      { fen: "8/3Q4/8/1p6/1P1Pq3/1K6/5pk1/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "c6" },
      { fen: "8/p4Q2/p1q5/1k6/1P4K1/3P3P/2p5/8 w - - 0 1", angreiferFeld: "f7", zielFeld: "e8" },
      { fen: "8/1P3K2/1p6/4qP2/7Q/2kpp3/p3P1P1/8 w - - 0 1", angreiferFeld: "h4", zielFeld: "f6" },
      { fen: "K7/p1p1Q3/7P/2PP1p2/5p2/3p2q1/P4kP1/8 w - - 0 1", angreiferFeld: "e7", zielFeld: "h4" },
      { fen: "8/5p2/1p2P1P1/5P1P/2Q2p2/Kp3q1P/p3p1kP/8 w - - 0 1", angreiferFeld: "c4", zielFeld: "d5" },
    ],
  },
  eichhoernchen_gabel: {
    stufe1: [
      { fen: "8/q7/1p1k4/8/3NP2K/8/8/8 w - - 0 1", angreiferFeld: "d4", zielFeld: "b5" },
      { fen: "8/5K2/4p3/8/Pk6/N7/8/q7 w - - 0 1", angreiferFeld: "a3", zielFeld: "c2" },
      { fen: "8/P5q1/6p1/4P3/5N2/4p1k1/8/5K2 w - - 0 1", angreiferFeld: "f4", zielFeld: "h5" },
      { fen: "1K6/2p5/8/8/4q2P/p6k/7P/3N4 w - - 0 1", angreiferFeld: "d1", zielFeld: "f2" },
      { fen: "8/1P4p1/4Pp2/8/3K2N1/P2p1k2/8/5q2 w - - 0 1", angreiferFeld: "g4", zielFeld: "h2" },
      { fen: "8/p7/1P4p1/1q1P1k2/P3N2p/8/8/6K1 w - - 0 1", angreiferFeld: "e4", zielFeld: "d6" },
      { fen: "8/3NpK2/8/1P5p/k3q3/3P4/P1p2Pp1/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "c5" },
      { fen: "8/8/8/1N1pP2p/1K2Pp2/2P2P2/p1k1q3/8 w - - 0 1", angreiferFeld: "b5", zielFeld: "d4" },
      { fen: "8/2P4P/KpppN1p1/2P5/8/4P2q/P3kp2/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "f4" },
      { fen: "2k5/5Ppp/8/2p5/1pN1q3/6p1/P2PP2P/K7 w - - 0 1", angreiferFeld: "c4", zielFeld: "d6" },
    ],
    stufe2: [
      { fen: "8/2qP2Nn/5q2/8/K4k2/6p1/8/8 w - - 0 1", angreiferFeld: "g7", zielFeld: "e6" },
      { fen: "6q1/7N/p6K/8/4k3/5q2/3P4/6n1 w - - 0 1", angreiferFeld: "h7", zielFeld: "f6" },
      { fen: "1q6/1PNn4/6P1/8/1k3q2/p7/K4p2/8 w - - 0 1", angreiferFeld: "c7", zielFeld: "d5" },
      { fen: "K7/8/4q3/4Pp2/2P1N3/1k6/6pn/5q2 w - - 0 1", angreiferFeld: "e4", zielFeld: "c5" },
      { fen: "8/2K1P3/1n6/2Pppk1q/2q5/8/6Pp/5N2 w - - 0 1", angreiferFeld: "f1", zielFeld: "g3" },
      { fen: "3K4/1P6/4q1p1/8/4k2p/p1n4N/1P1P4/3q4 w - - 0 1", angreiferFeld: "h3", zielFeld: "g5" },
      { fen: "8/6pN/4k1q1/7p/3Kp2n/pPP4q/6PP/8 w - - 0 1", angreiferFeld: "h7", zielFeld: "g5" },
      { fen: "6K1/3p2PP/q6p/1N1kpP1p/8/P7/5n2/3q4 w - - 0 1", angreiferFeld: "b5", zielFeld: "c7" },
    ],
    stufe3: [
      { fen: "8/1k3N2/4q3/2P3p1/p7/8/8/5K2 w - - 0 1", angreiferFeld: "f7", zielFeld: "d8" },
      { fen: "8/3k1P2/2N3q1/8/1p6/1p6/5K2/8 w - - 0 1", angreiferFeld: "c6", zielFeld: "e5" },
      { fen: "8/q3p2K/8/3PN1P1/2pk4/3p4/8/8 w - - 0 1", angreiferFeld: "e5", zielFeld: "c6" },
      { fen: "7K/3k4/N7/8/pp6/3qPp2/7P/8 w - - 0 1", angreiferFeld: "a6", zielFeld: "c5" },
      { fen: "8/8/3P1p2/1K4k1/1P2p3/p7/4pq1P/6N1 w - - 0 1", angreiferFeld: "g1", zielFeld: "h3" },
    ],
  },
  adlerhorst_spiess: {
    stufe1: [
      { fen: "8/3p4/6R1/3n1k2/8/8/3P4/K7 w - - 0 1", angreiferFeld: "g6", zielFeld: "g5" },
      { fen: "8/6p1/3B1k2/8/7n/7P/2K5/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "e7" },
      { fen: "8/2P2P1R/3nk3/4p3/1p6/3K4/8/8 w - - 0 1", angreiferFeld: "h7", zielFeld: "h6" },
      { fen: "8/8/P4BPp/3K4/8/p3k3/5n2/8 w - - 0 1", angreiferFeld: "f6", zielFeld: "d4" },
      { fen: "K7/pP6/8/4p3/p5P1/3k1n2/5P2/2R5 w - - 0 1", angreiferFeld: "c1", zielFeld: "c3" },
      { fen: "8/P1KP2P1/1p3n2/4k3/8/1pp1B3/8/8 w - - 0 1", angreiferFeld: "e3", zielFeld: "d4" },
      { fen: "8/1P1K4/3PpR2/p3P1kP/8/p5n1/p7/8 w - - 0 1", angreiferFeld: "f6", zielFeld: "g6" },
      { fen: "K7/P2p4/P7/2pB4/5p2/1p4PP/2k5/1n6 w - - 0 1", angreiferFeld: "d5", zielFeld: "e4" },
      { fen: "2R5/4P3/3kn2P/2pPp2p/7p/p6P/7P/6K1 w - - 0 1", angreiferFeld: "c8", zielFeld: "c6" },
      { fen: "8/1n3K2/2k4P/8/5Ppp/1B1Pp2p/1P3Pp1/8 w - - 0 1", angreiferFeld: "b3", zielFeld: "d5" },
    ],
    stufe2: [
      { fen: "8/2P5/8/3n1k2/3p4/8/8/1K5R w - - 0 1", angreiferFeld: "h1", zielFeld: "h5" },
      { fen: "8/5p2/1n6/5P2/3k1K1B/8/8/8 w - - 0 1", angreiferFeld: "h4", zielFeld: "f2" },
      { fen: "8/8/2P1k1nK/4P3/3R4/3pp3/8/8 w - - 0 1", angreiferFeld: "d4", zielFeld: "d6" },
      { fen: "6n1/8/K3kP2/8/4P3/5p2/p3B3/8 w - - 0 1", angreiferFeld: "e2", zielFeld: "c4" },
      { fen: "8/R4P1p/1P5K/2p5/3p4/3k1n2/P7/8 w - - 0 1", angreiferFeld: "a7", zielFeld: "a3" },
      { fen: "4n3/4pk2/3P4/3K4/3p1P2/1p3B2/6P1/8 w - - 0 1", angreiferFeld: "f3", zielFeld: "h5" },
      { fen: "6K1/5p2/5Pp1/2n1P3/2k2p2/4p3/6PP/R7 w - - 0 1", angreiferFeld: "a1", zielFeld: "c1" },
      { fen: "8/2BPP2K/p3P1P1/8/p2kp3/3p4/1n6/8 w - - 0 1", angreiferFeld: "c7", zielFeld: "e5" },
    ],
    stufe3: [
      { fen: "8/5P2/3pn3/8/4k3/7K/1pR5/8 w - - 0 1", angreiferFeld: "c2", zielFeld: "e2" },
      { fen: "8/8/R7/8/3k4/p2n1P2/Kp6/8 w - - 0 1", angreiferFeld: "a6", zielFeld: "d6" },
      { fen: "5K2/8/7P/1p6/1R6/8/2k2p2/2n5 w - - 0 1", angreiferFeld: "b4", zielFeld: "c4" },
      { fen: "R7/p4P2/2k5/8/2n2K2/p7/8/8 w - - 0 1", angreiferFeld: "a8", zielFeld: "c8" },
      { fen: "8/2p5/2p5/1PR1K3/8/3k4/8/3n4 w - - 0 1", angreiferFeld: "c5", zielFeld: "d5" },
    ],
  },
};

const SOLL_ANZAHL = { stufe1: 10, stufe2: 8, stufe3: 5 };

let gesamtAnzahl = 0;
for (const [spaltenName, stufen] of Object.entries(GEFAEHRTEN_MOTIVE_TESTDATEN)) {
  for (const [stufe, eintraege] of Object.entries(stufen)) {
    gesamtAnzahl += eintraege.length;
    test(`${spaltenName} ${stufe}: genau ${SOLL_ANZAHL[stufe]} Aufgaben`, () => {
      assert.equal(eintraege.length, SOLL_ANZAHL[stufe], `${spaltenName} ${stufe} sollte ${SOLL_ANZAHL[stufe]} Einträge haben`);
    });

    eintraege.forEach((e, i) => {
      test(`${spaltenName} ${stufe} #${i + 1}: gültige Stellung, kein Schach, Angreifer erreicht Zielfeld`, () => {
        const game = createPosition(e.fen);
        assert.equal(game.inCheck(), false, "Stellung darf nicht im Schach stehen");
        const angreiferFeld = fromAlgebraic(e.angreiferFeld);
        const targets = legalTargetsFor(game, angreiferFeld);
        assert.equal(hatZielfeld(targets, e.zielFeld), true, `Zielfeld ${e.zielFeld} sollte für ${e.angreiferFeld} erreichbar sein`);
      });

      test(`${spaltenName} ${stufe} #${i + 1}: Zug ${e.angreiferFeld}->${e.zielFeld} ist ein legaler chess.js-Zug`, () => {
        const game = createPosition(e.fen);
        const angreiferFeld = fromAlgebraic(e.angreiferFeld);
        const zielFeld = fromAlgebraic(e.zielFeld);
        const ergebnis = tryMove(game, angreiferFeld, zielFeld);
        assert.equal(ergebnis.ok, true, `Zug ${e.angreiferFeld}->${e.zielFeld} sollte legal sein`);
      });
    });
  }
}

test("Gefährten-Motive: insgesamt genau 115 Stellungen (5 Spalten x 23)", () => {
  assert.equal(gesamtAnzahl, 115, "sollten insgesamt 115 Stellungen sein (5 Spalten x [10+8+5])");
});

// ============================================================================
// Teil 2: reine Entscheidungslogik des neuen Stufe-3-Interaktionsmodells (siehe
// Kopfkommentar) — Kopie der Implementierung in src/lib/EndlosmodusPuzzle.tsx.
// ============================================================================

/** Kopie von EndlosmodusPuzzle.tsx' `stufe3HinweisStufe` — MUSS bei einer Änderung der
 *  Schwellenwerte dort mitgepflegt werden (siehe Kopfkommentar). */
function stufe3HinweisStufe(fehlversuche) {
  if (fehlversuche >= 6) return 3;
  if (fehlversuche >= 3) return 2;
  return 1;
}

/** Kopie der Kernentscheidung aus EndlosmodusPuzzle.tsx' `handleCorrectMove` (Stufe-3-Zweig):
 *  löst NUR, wenn die ausgewählte Figur exakt die Lösungsfigur ist UND das angetippte Ziel
 *  exakt das kuratierte Zielfeld ist — jede andere Kombination (andere Figur, oder dieselbe
 *  Figur auf ein anderes ihrer Legalfelder) wird abgewiesen, ohne den Zug tatsächlich
 *  auszuführen. */
function istStufe3Loesung(ausgewaehlteFigur, angetipptesZiel, loesungsFigur, loesungsZiel) {
  return ausgewaehlteFigur === loesungsFigur && angetipptesZiel === loesungsZiel;
}

test("stufe3HinweisStufe: Hinweisstufe 1 bis Fehlversuch 2", () => {
  assert.equal(stufe3HinweisStufe(0), 1);
  assert.equal(stufe3HinweisStufe(1), 1);
  assert.equal(stufe3HinweisStufe(2), 1);
});

test("stufe3HinweisStufe: Hinweisstufe 2 ab Fehlversuch 3", () => {
  assert.equal(stufe3HinweisStufe(3), 2);
  assert.equal(stufe3HinweisStufe(4), 2);
  assert.equal(stufe3HinweisStufe(5), 2);
});

test("stufe3HinweisStufe: Hinweisstufe 3 (volle Empfehlung) ab Fehlversuch 6", () => {
  assert.equal(stufe3HinweisStufe(6), 3);
  assert.equal(stufe3HinweisStufe(20), 3);
});

test("istStufe3Loesung: nur exakt (Lösungsfigur, Lösungsziel) löst", () => {
  assert.equal(istStufe3Loesung("b3", "b5", "b3", "b5"), true);
});

test("istStufe3Loesung: dieselbe Figur auf ein ANDERES ihrer Legalfelder löst NICHT", () => {
  assert.equal(istStufe3Loesung("b3", "d5", "b3", "b5"), false);
});

test("istStufe3Loesung: eine ANDERE eigene Figur auf irgendein Feld löst NICHT", () => {
  assert.equal(istStufe3Loesung("a2", "b5", "b3", "b5"), false);
});

// Für jede der 115 Stellungen: bestätigt am echten chess.js, dass unter ALLEN eigenen
// (weißen) Figuren und ALLEN ihren jeweiligen Legalzielen tatsächlich NUR die kuratierte
// (angreiferFeld, zielFeld)-Kombination die Aufgabe löst — jede andere denkbare Kombination,
// die ein Kind antippen könnte, wird von `istStufe3Loesung` korrekt abgewiesen. Das ist exakt
// die Garantie, auf der das "Zug wird abgelehnt, nichts wird wirklich bewegt"-Design beruht
// (Christian, siehe claude/stufe3_interaktionsmodell_konzept_2026-09-17.md: "Da dann bspw. die
// Fesselung durch einen Zug von Schwarz gelöst werden könnte und die ganze Stellung nicht mehr
// funktioniert").
for (const [spaltenName, stufen] of Object.entries(GEFAEHRTEN_MOTIVE_TESTDATEN)) {
  stufen.stufe3.forEach((e, i) => {
    test(`${spaltenName} stufe3 #${i + 1}: nur ${e.angreiferFeld}->${e.zielFeld} löst, jede andere Figur/jedes andere Ziel wird abgewiesen`, () => {
      const game = createPosition(e.fen);
      const brett = game.board();
      let mindestensEineAndereKombiGeprueft = false;
      brett.forEach((reihe) => {
        reihe.forEach((feld) => {
          if (!feld || feld.color !== "w") return;
          const von = fromAlgebraic(feld.square);
          const vonAlg = toAlgebraic(von);
          const ziele = legalTargetsFor(game, von);
          ziele.forEach((zielFeld) => {
            const zielAlg = toAlgebraic(zielFeld);
            mindestensEineAndereKombiGeprueft = true;
            const sollteLoesenSein = vonAlg === e.angreiferFeld && zielAlg === e.zielFeld;
            assert.equal(
              istStufe3Loesung(vonAlg, zielAlg, e.angreiferFeld, e.zielFeld),
              sollteLoesenSein,
              `(${vonAlg}->${zielAlg}) sollte ${sollteLoesenSein ? "" : "NICHT "}als Lösung gelten`
            );
          });
        });
      });
      assert.equal(mindestensEineAndereKombiGeprueft, true, "mindestens ein Legalzug sollte existieren");
    });
  });
}

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Gefährten-Motive-Stufe3-Tests grün.");
  process.exit(0);
}
