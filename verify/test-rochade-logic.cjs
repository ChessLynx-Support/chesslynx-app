#!/usr/bin/env node
// Unit-Tests für die kuratierten ROCHADE_POSITIONS in src/lib/chessEngine.ts — analog zu
// verify/test-fesselung-logic.cjs (siehe dortiger Datei-Kommentar für die Begründung "kein
// Jest, kein ts-node", dieselbe on-the-fly-Transpilierung wird hier wiederverwendet).
//
// Diese Stellungen wurden VOR dem Eintrag in chessEngine.ts von Hand nach den offiziellen
// Rochade-Regeln nachvollzogen (die npm-Registry war in der Implementierungs-Sandbox für
// `typescript`/`chess.js` blockiert, daher konnte dort kein echter Testlauf gegen das
// installierte chess.js erfolgen) — dieser Testlauf hier, mit `npm test`/
// `node verify/test-rochade-logic.cjs` auf einem Rechner mit vollständigem `npm install`,
// ist der maßgebliche, tatsächlich gegen das echte, installierte chess.js ausgeführte Beweis.
//
// Ausführen: `node verify/test-rochade-logic.cjs` im Projektverzeichnis (nach `npm install`).
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
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
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

const { createPosition, legalTargetsFor, tryMove, ROCHADE_POSITIONS } = m.exports;

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

// --- vorstellung: Sanity-Check, gültige Ausgangsstellung -----------------------------------

test("vorstellung: FEN ist gültig ladbar, Weiß nicht im Schach", () => {
  const game = createPosition(ROCHADE_POSITIONS.vorstellung);
  assert.doesNotThrow(() => game);
  assert.equal(game.inCheck(), false);
});

// --- kurzeRochade: König e1 -> g1, Turm h1 -> f1 -------------------------------------------

test("kurzeRochade: König auf e1 darf nach g1 rochieren", () => {
  const game = createPosition(ROCHADE_POSITIONS.kurzeRochade);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 6), true, "g1 (kurze Rochade) sollte legal sein");
});

test("kurzeRochade: nach der Rochade steht der Turm auf f1, nicht mehr auf h1", () => {
  const game = createPosition(ROCHADE_POSITIONS.kurzeRochade);
  const result = tryMove(game, { row: 7, col: 4 }, { row: 7, col: 6 }); // e1-g1
  assert.equal(result.ok, true, "die Rochade selbst muss als legaler Zug ausgeführt werden");
  const board = game.board();
  assert.equal(board[7][5]?.type, "r", "f1 sollte jetzt den Turm tragen"); // f1 = row7,col5
  assert.equal(board[7][5]?.color, "w");
  assert.equal(board[7][7], null, "h1 sollte jetzt leer sein");
  assert.equal(board[7][6]?.type, "k", "g1 sollte jetzt den König tragen");
});

// --- langeRochade: König e1 -> c1, Turm a1 -> d1 (DREI Felder) -----------------------------

test("langeRochade: König auf e1 darf nach c1 rochieren", () => {
  const game = createPosition(ROCHADE_POSITIONS.langeRochade);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 2), true, "c1 (lange Rochade) sollte legal sein");
});

test("langeRochade: nach der Rochade steht der Turm auf d1 (drei Felder von a1), nicht mehr auf a1", () => {
  const game = createPosition(ROCHADE_POSITIONS.langeRochade);
  const result = tryMove(game, { row: 7, col: 4 }, { row: 7, col: 2 }); // e1-c1
  assert.equal(result.ok, true);
  const board = game.board();
  assert.equal(board[7][3]?.type, "r", "d1 sollte jetzt den Turm tragen"); // d1 = row7,col3
  assert.equal(board[7][3]?.color, "w");
  assert.equal(board[7][0], null, "a1 sollte jetzt leer sein");
  assert.equal(board[7][2]?.type, "k", "c1 sollte jetzt den König tragen");
});

// --- wegBlockiert: eigener Springer auf d1 verhindert die lange Rochade -------------------

test("wegBlockiert: FEN ist gültig, Springer steht auf d1", () => {
  const game = createPosition(ROCHADE_POSITIONS.wegBlockiert);
  const board = game.board();
  assert.equal(board[7][3]?.type, "n", "d1 sollte den blockierenden Springer tragen");
});

test("wegBlockiert: König auf e1 darf NICHT nach c1 rochieren (Weg blockiert)", () => {
  const game = createPosition(ROCHADE_POSITIONS.wegBlockiert);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 2), false, "c1 sollte NICHT erreichbar sein, solange d1 besetzt ist");
});

test("wegBlockiert: ein versuchter Rochade-Zug (e1-c1) wird von tryMove korrekt abgelehnt", () => {
  const game = createPosition(ROCHADE_POSITIONS.wegBlockiert);
  const result = tryMove(game, { row: 7, col: 4 }, { row: 7, col: 2 }); // e1-c1
  assert.equal(result.ok, false, "tryMove sollte den strukturell unmöglichen Zug ablehnen, nicht werfen");
});

// --- wegBedroht: gegnerischer Turm auf d8 bedroht das freie Durchgangsfeld d1 -------------
// Neu (2026-09-09, Nutzer-Rückfrage nach Gerätetest, zweites Stopp!-Beispiel "durchs
// Schach"): b1/c1/d1 sind hier alle physisch frei, die lange Rochade scheitert trotzdem,
// weil d1 (ein Durchgangsfeld des Königs) vom gegnerischen Turm auf d8 bedroht wird.

test("wegBedroht: FEN ist gültig, d1 ist physisch frei, Weiß steht nicht im Schach", () => {
  const game = createPosition(ROCHADE_POSITIONS.wegBedroht);
  const board = game.board();
  assert.equal(board[7][3], null, "d1 sollte physisch leer sein (anders als bei wegBlockiert)");
  assert.equal(game.inCheck(), false, "der weiße König steht zu Beginn nicht im Schach");
});

// Bugfix (2026-09-09, echter `npm test`-Lauf auf Christians Rechner): chess.js liefert
// `moves({square})` nur für die Partei, die gerade am Zug ist ("w" in ROCHADE_POSITIONS.
// wegBedroht) — eine Abfrage der schwarzen Turm-Züge auf DIESER Stellung liefert deshalb
// immer ein leeres Array zurück, unabhängig davon, ob der Turm die Linie tatsächlich deckt.
// Das ist kein Fehler in der Stellung selbst (die nachfolgenden beiden Tests, die die
// eigentlich wichtige Konsequenz prüfen — der König KANN nicht rochieren — liefen im echten
// chess.js-Testlauf bereits grün), sondern ein Fehler in diesem Hilfs-Test. Fix: für diese
// reine Sichtlinien-Prüfung eine zweite, sonst identische Stellung mit Schwarz am Zug
// verwenden, statt der eigentlichen (Weiß-am-Zug-)Übungsstellung.
test("wegBedroht: der gegnerische Turm auf d8 deckt d1 (kein anderes Feld dazwischen)", () => {
  const sichtlinienCheck = createPosition("3rk3/8/8/8/8/8/8/R3K3 b - - 0 1");
  const targets = legalTargetsFor(sichtlinienCheck, { row: 0, col: 3 }); // d8
  assert.equal(hatZielfeld(targets, 7, 3), true, "d8-Turm sollte d1 auf der offenen d-Linie erreichen");
});

test("wegBedroht: König auf e1 darf NICHT nach c1 rochieren (Durchgangsfeld d1 bedroht)", () => {
  const game = createPosition(ROCHADE_POSITIONS.wegBedroht);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 2), false, "c1 sollte NICHT erreichbar sein, solange d1 bedroht ist");
});

test("wegBedroht: ein versuchter Rochade-Zug (e1-c1) wird von tryMove korrekt abgelehnt", () => {
  const game = createPosition(ROCHADE_POSITIONS.wegBedroht);
  const result = tryMove(game, { row: 7, col: 4 }, { row: 7, col: 2 }); // e1-c1
  assert.equal(result.ok, false, "tryMove sollte den strukturell unmöglichen Zug ablehnen, nicht werfen");
});

// --- Genereller Sanity-Check ---------------------------------------------------------------

test("Alle fünf ROCHADE_POSITIONS-Stellungen sind gültige, ladbare FENs", () => {
  const alle = Object.values(ROCHADE_POSITIONS);
  assert.equal(
    alle.length,
    5,
    "vorstellung + kurzeRochade + langeRochade + wegBlockiert + wegBedroht erwartet"
  );
  for (const fen of alle) {
    assert.doesNotThrow(() => createPosition(fen), `FEN sollte gültig sein: ${fen}`);
  }
});

// --- Zusammenfassung ------------------------------------------------------------------------

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Rochade-Tests grün.");
  process.exit(0);
}
