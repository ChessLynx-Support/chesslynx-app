#!/usr/bin/env node
// Unit-Tests für WISENT_BOSS_POSITION in src/lib/chessEngine.ts — analog zu
// verify/test-matt-in2-logic.cjs / test-fesselung-logic.cjs (siehe dortiger Datei-Kommentar
// für die Begründung "kein Jest, kein ts-node").
//
// Anders als bei den kuratierten Bonuskapitel-Stellungen ist WISENT_BOSS_POSITION eine
// VOLLSTÄNDIGE, gültige FEN (beide Könige, keine skipValidation-Krücke nötig) — dieser Test
// lädt sie deshalb direkt über `new Chess(fen)`, genauso wie screens/WisentKampf.tsx selbst
// (siehe dortiger Datei-Kommentar zur bewussten Abkehr von `createPosition()`).
//
// Geprüft wird die vollständige, im Konzeptdokument behauptete Zwei-Zug-Zwangsmatt-Sequenz:
//   Zug 1:  Qa2xf7+   (nutzt die Fesselung des Turms e7 aus)
//   Antwort: Ke8-d7    (BEHAUPTUNG: die einzige legale schwarze Antwort)
//   Zug 2:  Qf7-d5# ODER Qf7xe7#  (BEHAUPTUNG: beide sind Matt)
// sowie die im Konzept zusätzlich genannte, in der App bewusst NICHT angebotene dritte
// Mattmöglichkeit Re1-d1# (siehe screens/WisentKampf.tsx-Kopfkommentar für die Begründung,
// warum sie trotzdem hier mitgeprüft wird: falls sich die Stellung je ändert, soll ein Test
// das melden, auch für den nicht angebotenen Weg).
//
// Ausführen: `node verify/test-wisent-boss-logic.cjs` im Projektverzeichnis (nach `npm install`).
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

const { WISENT_BOSS_POSITION } = m.exports;

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

const FEN = WISENT_BOSS_POSITION.hauptstellung;

test("Ausgangsstellung: Weiß am Zug, kein Schach", () => {
  const g = new Chess(FEN);
  assert.equal(g.turn(), "w");
  assert.equal(g.inCheck(), false);
});

test("Zug 1 (Qxf7) ist legal, ein Schlagzug, und gibt Schach", () => {
  const g = new Chess(FEN);
  const zug = g.move({ from: "a2", to: "f7" });
  assert.ok(zug, "Qxf7 sollte ein legaler Zug sein");
  assert.equal(zug.captured, "p", "sollte den Bauern auf f7 schlagen");
  assert.equal(g.inCheck(), true);
});

test("Nach Qxf7+ hat Schwarz genau EINE legale Antwort, und zwar Kd7", () => {
  const g = new Chess(FEN);
  g.move({ from: "a2", to: "f7" });
  const antworten = g.moves({ verbose: true });
  assert.equal(antworten.length, 1, `erwartet genau 1 legalen Zug, gefunden: ${antworten.map((z) => z.san).join(", ")}`);
  assert.equal(antworten[0].san, "Kd7");
});

test("Zug 2, Variante A (Qd5): legal und Matt", () => {
  const g = new Chess(FEN);
  g.move({ from: "a2", to: "f7" });
  g.move({ from: "e8", to: "d7" });
  const zug = g.move({ from: "f7", to: "d5" });
  assert.ok(zug, "Qd5 sollte ein legaler Zug sein");
  assert.equal(g.isCheckmate(), true);
});

test("Zug 2, Variante B (Qxe7): legal, ein Schlagzug, und Matt", () => {
  const g = new Chess(FEN);
  g.move({ from: "a2", to: "f7" });
  g.move({ from: "e8", to: "d7" });
  const zug = g.move({ from: "f7", to: "e7" });
  assert.ok(zug, "Qxe7 sollte ein legaler Zug sein");
  assert.equal(zug.captured, "r", "sollte den Turm auf e7 schlagen");
  assert.equal(g.isCheckmate(), true);
});

// Bewusst NICHT als dritte UI-Tipp-Option übernommen (siehe screens/WisentKampf.tsx-
// Kopfkommentar) — trotzdem hier mitgeprüft, damit eine künftige Stellungsänderung nicht
// unbemerkt eine im Konzeptdokument behauptete Eigenschaft bricht.
test("Zug 2, Variante C (Rd1, nicht in der UI angeboten): legal und Matt", () => {
  const g = new Chess(FEN);
  g.move({ from: "a2", to: "f7" });
  g.move({ from: "e8", to: "d7" });
  const zug = g.move({ from: "e1", to: "d1" });
  assert.ok(zug, "Rd1 sollte ein legaler Zug sein");
  assert.equal(g.isCheckmate(), true);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Wisent-Boss-Puzzle-Tests grün.");
  process.exit(0);
}
