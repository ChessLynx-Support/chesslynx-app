#!/usr/bin/env node
// Unit-Tests für die kuratierten FIGURENWERT_POSITIONS in src/lib/chessEngine.ts — analog zu
// verify/test-fesselung-logic.cjs / verify/test-rochade-logic.cjs (siehe dortiger Datei-
// Kommentar für die Begründung "kein Jest, kein ts-node").
//
// Diese Stellungen wurden VOR dem Eintrag in chessEngine.ts von Hand nachvollzogen (die
// npm-Registry war in der Implementierungs-Sandbox für `typescript`/`chess.js` blockiert,
// daher konnte dort kein echter Testlauf gegen das installierte chess.js erfolgen) — dieser
// Testlauf hier, mit `npm test`/`node verify/test-figurenwert-logic.cjs` auf einem Rechner
// mit vollständigem `npm install`, ist der maßgebliche, tatsächlich gegen das echte,
// installierte chess.js ausgeführte Beweis.
//
// Ausführen: `node verify/test-figurenwert-logic.cjs` im Projektverzeichnis (nach `npm install`).
// Exit-Code 0 = alle Tests grün, 1 = mindestens ein Fehler.

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
      "Projektverzeichnis ausführen (typescript ist bereits als devDependency in " +
      "package.json gelistet) und dieses Skript erneut starten."
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
    "Konnte chessEngine.ts nicht laden (chess.js fehlt vermutlich noch). Bitte " +
      "einmalig `npm install` im Projektverzeichnis ausführen und erneut starten.\n"
  );
  console.error(err.message);
  process.exit(1);
}

const { createPosition, legalTargetsFor, tryMove, FIGURENWERT_POSITIONS } = m.exports;

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

function hatZielfeld(targets, row, col) {
  return targets.some((t) => t.row === row && t.col === col);
}

const DAME = { row: 4, col: 3 }; // d4
const ZIEL_D7 = { row: 1, col: 3 }; // d7
const ZIEL_A4 = { row: 4, col: 0 }; // a4

// Alle vier Stellungen teilen dieselbe Geometrie -- ein gemeinsamer Geometrie-Test pro FEN.
for (const [name, fen] of Object.entries(FIGURENWERT_POSITIONS)) {
  test(`${name}: FEN ist gültig, Weiß nicht im Schach`, () => {
    const game = createPosition(fen);
    assert.doesNotThrow(() => game);
    assert.equal(game.inCheck(), false);
  });

  test(`${name}: Dame auf d4 darf sowohl d7 als auch a4 schlagen`, () => {
    const game = createPosition(fen);
    const targets = legalTargetsFor(game, DAME);
    assert.equal(hatZielfeld(targets, ZIEL_D7.row, ZIEL_D7.col), true, "d7 sollte ein legaler Schlagzug sein");
    assert.equal(hatZielfeld(targets, ZIEL_A4.row, ZIEL_A4.col), true, "a4 sollte ein legaler Schlagzug sein");
  });

  test(`${name}: Schlagzug auf d7 wird korrekt ausgeführt`, () => {
    const game = createPosition(fen);
    const result = tryMove(game, DAME, ZIEL_D7);
    assert.equal(result.ok, true);
    assert.equal(result.isCapture, true);
  });
}

// Figuren-Identität je Stellung (bestätigt die beabsichtigte Werte-Gegenüberstellung).
test("gleichwertSpringerLaeufer: d7=Springer, a4=Läufer (beide Wert 3)", () => {
  const game = createPosition(FIGURENWERT_POSITIONS.gleichwertSpringerLaeufer);
  const board = game.board();
  assert.equal(board[1][3]?.type, "n");
  assert.equal(board[4][0]?.type, "b");
});

test("kernaufgabeTurmLaeufer: d7=Turm (5), a4=Läufer (3) -- Turm ist wertvoller", () => {
  const game = createPosition(FIGURENWERT_POSITIONS.kernaufgabeTurmLaeufer);
  const board = game.board();
  assert.equal(board[1][3]?.type, "r");
  assert.equal(board[4][0]?.type, "b");
});

test("uebungBauerTurm: d7=Bauer (1), a4=Turm (5) -- Turm ist wertvoller", () => {
  const game = createPosition(FIGURENWERT_POSITIONS.uebungBauerTurm);
  const board = game.board();
  assert.equal(board[1][3]?.type, "p");
  assert.equal(board[4][0]?.type, "r");
});

test("uebungSpringerDame: d7=Springer (3), a4=Dame (9) -- Dame ist wertvoller", () => {
  const game = createPosition(FIGURENWERT_POSITIONS.uebungSpringerDame);
  const board = game.board();
  assert.equal(board[1][3]?.type, "n");
  assert.equal(board[4][0]?.type, "q");
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Figurenwert-Tests grün.");
  process.exit(0);
}
