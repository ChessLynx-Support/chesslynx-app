#!/usr/bin/env node
// Unit-Tests für UMWANDLUNGS_KUER_POSITION in src/lib/chessEngine.ts — analog zu
// verify/test-wisent-boss-logic.cjs (siehe dortiger Datei-Kommentar für die Begründung
// "kein Jest, kein ts-node", direkt `new Chess(fen)` statt `createPosition()`).
//
// Geprüft wird für BEIDE Stellungs-Varianten (hauptstellung UND variante2 — die zweite ist die
// Wiederholungs-Variante für den zweiten Besuch, siehe storage.ts/holeUndSchalteKuerVariante,
// kein eigenständiges drittes Rätsel):
//   - der Umwandlungszug ist legal
//   - er wandelt den Bauern tatsächlich in eine Dame um (chess.js `move.promotion === "q"`)
//   - danach steht der gegnerische König Matt
//
// Ausführen: `node verify/test-umwandlung-kuer-logic.cjs` im Projektverzeichnis (nach
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
      "Projektverzeichnis ausführen (typescript ist bereits als devDependency in " +
      "package.json gelistet) und dieses Skript erneut starten."
  );
  process.exit(1);
}

let Chess;
try {
  ({ Chess } = require("chess.js"));
} catch {
  console.error("Konnte das Paket 'chess.js' nicht laden. Bitte einmalig `npm install` ausführen.");
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

const { UMWANDLUNGS_KUER_POSITION } = m.exports;

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

function pruefeUmwandlung(label, fen, from, to) {
  test(`${label}: ${from}-${to} ist legal und wandelt in eine Dame um`, () => {
    const g = new Chess(fen);
    const zug = g.move({ from, to, promotion: "q" });
    assert.ok(zug, `${from}-${to} sollte ein legaler Zug sein`);
    assert.equal(zug.promotion, "q", "sollte in eine Dame umwandeln");
  });
  test(`${label}: nach der Umwandlung steht der gegnerische König matt`, () => {
    const g = new Chess(fen);
    g.move({ from, to, promotion: "q" });
    assert.equal(g.isCheckmate(), true);
  });
}

pruefeUmwandlung("Hauptstellung (f7-f8=Q#)", UMWANDLUNGS_KUER_POSITION.hauptstellung, "f7", "f8");
pruefeUmwandlung("Variante 2 (c7-c8=Q#)", UMWANDLUNGS_KUER_POSITION.variante2, "c7", "c8");

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Umwandlungs-Kür-Tests grün.");
  process.exit(0);
}
