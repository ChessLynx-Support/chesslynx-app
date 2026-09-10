#!/usr/bin/env node
// Unit-Tests für die kuratierten MATT_IN_3_POSITIONEN in src/lib/chessEngine.ts — analog zu
// den übrigen verify/test-*-logic.cjs-Dateien (siehe test-fesselung-logic.cjs für die
// Begründung "kein Jest, kein ts-node").
//
// Diese Stellungen wurden VOR dem Eintrag in chessEngine.ts mit einem eigens geschriebenen,
// vollständigen Turm/Dame/König-Legalzug-Prüfer (Python) Zug für Zug durchgerechnet (die
// npm-Registry war in der Implementierungs-Sandbox blockiert, kein echtes chess.js
// verfügbar) — dieser Testlauf hier, mit `npm test`/`node verify/test-matt-in3-logic.cjs` auf
// einem Rechner mit vollständigem `npm install`, ist der maßgebliche, tatsächlich gegen das
// echte, installierte chess.js ausgeführte Beweis, INKLUSIVE der entscheidenden
// `isCheckmate`-Prüfung nach dem dritten Zug (siehe unten) — das ist mit dem Python-Prüfer
// zwar bereits unabhängig bestätigt, aber die App selbst verlässt sich auf chess.js, nicht auf
// jenes Python-Skript, daher hier die maßgebliche Probe.
//
// WICHTIG (siehe chessEngine.ts/MATT_IN_3_POSITIONEN-Kommentar): dieser Test prüft, dass JEDER
// EINZELNE in MattIn3.tsx angebotene Weißzug tatsächlich ein echter Legalzug ist UND dass die
// Schlussstellung nach dem dritten Zug tatsächlich MATT ist (`isCheckmate === true`). Er prüft
// NICHT, dass die animierte schwarze Zwischenantwort die EINZIG legale ist (das ist laut
// Skript-Ausweichklausel bewusst nicht der Fall, siehe MattIn3.tsx-Kopfkommentar) — er prüft
// nur, dass die tatsächlich gewählte Zwischenantwort selbst ein echter Legalzug ist.
//
// Ausführen: `node verify/test-matt-in3-logic.cjs` im Projektverzeichnis (nach `npm install`).
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

const { createPosition, legalTargetsFor, tryMove, MATT_IN_3_POSITIONEN } = m.exports;

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

// Geometrie je Rätsel — siehe MattIn3.tsx/RAETSEL für die identische Definition.
const RAETSEL = {
  turmleiter: {
    fen: MATT_IN_3_POSITIONEN.turmleiter,
    stueckAStart: { row: 2, col: 7 }, // h6
    stueckAZwischenziel: { row: 5, col: 7 }, // h3
    stueckAMattziel: { row: 7, col: 7 }, // h1
    stueckBStart: { row: 4, col: 0 }, // a4
    stueckBZiel: { row: 6, col: 0 }, // a2
    gegnerKoenigStart: { row: 5, col: 4 }, // e3
    gegnerKoenigNachZug1: { row: 6, col: 4 }, // e2
    gegnerKoenigNachZug2: { row: 7, col: 4 }, // e1
  },
  damenUndTurm: {
    fen: MATT_IN_3_POSITIONEN.damenUndTurm,
    stueckAStart: { row: 2, col: 7 },
    stueckAZwischenziel: { row: 5, col: 7 },
    stueckAMattziel: { row: 7, col: 7 },
    stueckBStart: { row: 4, col: 0 },
    stueckBZiel: { row: 6, col: 0 },
    gegnerKoenigStart: { row: 5, col: 4 },
    gegnerKoenigNachZug1: { row: 6, col: 4 },
    gegnerKoenigNachZug2: { row: 7, col: 4 },
  },
  reduziert: {
    fen: MATT_IN_3_POSITIONEN.reduziert,
    stueckAStart: { row: 5, col: 7 }, // h3
    stueckAZwischenziel: { row: 2, col: 7 }, // h6
    stueckAMattziel: { row: 0, col: 7 }, // h8
    stueckBStart: { row: 3, col: 0 }, // a5
    stueckBZiel: { row: 1, col: 0 }, // a7
    gegnerKoenigStart: { row: 2, col: 4 }, // e6
    gegnerKoenigNachZug1: { row: 1, col: 4 }, // e7
    gegnerKoenigNachZug2: { row: 0, col: 4 }, // e8
  },
};

for (const [name, r] of Object.entries(RAETSEL)) {
  test(`${name}: FEN ist gültig, Schwarz nicht im Schach`, () => {
    const game = createPosition(r.fen);
    assert.doesNotThrow(() => game);
    assert.equal(game.inCheck(), false);
  });

  test(`${name}: Zug 1 (stueckA an Zwischenziel) ist legal und gibt Schach`, () => {
    const game = createPosition(r.fen);
    const targets = legalTargetsFor(game, r.stueckAStart);
    assert.equal(hatZielfeld(targets, r.stueckAZwischenziel.row, r.stueckAZwischenziel.col), true);
    const result = tryMove(game, r.stueckAStart, r.stueckAZwischenziel);
    assert.equal(result.ok, true);
    assert.equal(result.isCheck, true);
    assert.equal(result.isCheckmate, false, "nach Zug 1 sollte noch kein Matt vorliegen");
  });

  test(`${name}: gewählte Zwischenantwort (Zug 1) ist ein echter Legalzug des Königs`, () => {
    const game = createPosition(r.fen);
    tryMove(game, r.stueckAStart, r.stueckAZwischenziel);
    const koenigTargets = legalTargetsFor(game, r.gegnerKoenigStart);
    assert.equal(
      hatZielfeld(koenigTargets, r.gegnerKoenigNachZug1.row, r.gegnerKoenigNachZug1.col),
      true,
      "die animierte Zwischenantwort muss unter den legalen Königszügen sein"
    );
  });

  test(`${name}: Zug 2 (stueckB an Ziel) ist nach der Zwischenantwort legal und gibt Schach`, () => {
    const game = createPosition(r.fen);
    tryMove(game, r.stueckAStart, r.stueckAZwischenziel);
    tryMove(game, r.gegnerKoenigStart, r.gegnerKoenigNachZug1);
    const targets = legalTargetsFor(game, r.stueckBStart);
    assert.equal(hatZielfeld(targets, r.stueckBZiel.row, r.stueckBZiel.col), true);
    const result = tryMove(game, r.stueckBStart, r.stueckBZiel);
    assert.equal(result.ok, true);
    assert.equal(result.isCheck, true);
    assert.equal(result.isCheckmate, false, "nach Zug 2 sollte noch kein Matt vorliegen");
  });

  test(`${name}: zweite Zwischenantwort ist ein echter Legalzug des Königs`, () => {
    const game = createPosition(r.fen);
    tryMove(game, r.stueckAStart, r.stueckAZwischenziel);
    tryMove(game, r.gegnerKoenigStart, r.gegnerKoenigNachZug1);
    tryMove(game, r.stueckBStart, r.stueckBZiel);
    const koenigTargets = legalTargetsFor(game, r.gegnerKoenigNachZug1);
    assert.equal(hatZielfeld(koenigTargets, r.gegnerKoenigNachZug2.row, r.gegnerKoenigNachZug2.col), true);
  });

  test(`${name}: Zug 3 (stueckA ans Mattziel) ist legal und setzt ECHTES Matt (isCheckmate)`, () => {
    const game = createPosition(r.fen);
    tryMove(game, r.stueckAStart, r.stueckAZwischenziel);
    tryMove(game, r.gegnerKoenigStart, r.gegnerKoenigNachZug1);
    tryMove(game, r.stueckBStart, r.stueckBZiel);
    tryMove(game, r.gegnerKoenigNachZug1, r.gegnerKoenigNachZug2);
    const targets = legalTargetsFor(game, r.stueckAZwischenziel);
    assert.equal(hatZielfeld(targets, r.stueckAMattziel.row, r.stueckAMattziel.col), true);
    const result = tryMove(game, r.stueckAZwischenziel, r.stueckAMattziel);
    assert.equal(result.ok, true);
    assert.equal(result.isCheckmate, true, "der dritte Zug muss ein echtes, lückenloses Matt sein");
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
  console.log("Alle Matt-in-3-Tests grün — inklusive drei echt bestätigter Mattstellungen.");
  process.exit(0);
}
