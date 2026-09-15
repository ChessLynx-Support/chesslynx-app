#!/usr/bin/env node
// Unit-Tests für EN_PASSANT_KUER_POSITION in src/lib/chessEngine.ts — analog zu
// verify/test-umwandlung-kuer-logic.cjs (siehe dortiger Datei-Kommentar für die
// Grundbegründung).
//
// Geprüft wird für BEIDE Stellungs-Varianten:
//   - der Schlagzug im Vorbeigehen ist legal
//   - chess.js markiert ihn tatsächlich als en-passant-Zug (move.flags enthält "e")
//   - eine gegnerische Figur verschwindet dabei vom Brett (Figurenzahl -1)
//
// Ausführen: `node verify/test-en-passant-kuer-logic.cjs` im Projektverzeichnis (nach
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

const { EN_PASSANT_KUER_POSITION } = m.exports;

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

function pruefeEnPassant(label, fen, from, to) {
  test(`${label}: ${from}x${to} ist legal und ein echter En-passant-Zug`, () => {
    const g = new Chess(fen);
    const vorher = g.board().flat().filter(Boolean).length;
    const zug = g.move({ from, to });
    assert.ok(zug, `${from}-${to} sollte ein legaler Zug sein`);
    assert.ok(zug.flags.includes("e"), `chess.js sollte "e" (en passant) als Zug-Flag melden, war "${zug.flags}"`);
    const nachher = g.board().flat().filter(Boolean).length;
    assert.equal(nachher, vorher - 1, "eine gegnerische Figur sollte vom Brett verschwinden");
  });
}

pruefeEnPassant("Hauptstellung (e5xd6 e.p.)", EN_PASSANT_KUER_POSITION.hauptstellung, "e5", "d6");
pruefeEnPassant("Variante 2 (f5xg6 e.p.)", EN_PASSANT_KUER_POSITION.variante2, "f5", "g6");

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle En-passant-Kür-Tests grün.");
  process.exit(0);
}
