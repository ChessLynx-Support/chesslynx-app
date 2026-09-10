#!/usr/bin/env node
// Unit-Tests für die Fesselungs-Erkennung (findeFesselung) und die kuratierten
// FESSELUNG_POSITIONS in src/lib/chessEngine.ts — analog zu verify/test-chessEngine.cjs
// (siehe dortiger Datei-Kommentar für die Begründung "kein Jest, kein ts-node", dieselbe
// on-the-fly-Transpilierung wird hier wiederverwendet).
//
// Diese Stellungen wurden VOR dem Eintrag in chessEngine.ts bereits einmal von Hand (nach
// den Standard-Schachregeln zu Fesselungen) UND vorab in einem eigenständigen Plain-JS-Skript
// nachvollzogen (die npm-Registry war in der Implementierungs-Sandbox für `typescript`
// blockiert, daher konnte dort nicht exakt dieses Skript laufen) — dieser Testlauf hier, mit
// `npm test`/`node verify/test-fesselung-logic.cjs` auf einem Rechner mit vollständigem
// `npm install` (chess.js + typescript), ist der maßgebliche, tatsächlich gegen das echte,
// installierte chess.js ausgeführte Beweis.
//
// Ausführen: `node verify/test-fesselung-logic.cjs` im Projektverzeichnis (nach `npm install`).
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

const { createPosition, legalTargetsFor, tryMove, findeFesselung, FESSELUNG_POSITIONS } = m.exports;

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

function sortSquares(list) {
  return [...list].sort((a, b) => a.row - b.row || a.col - b.col);
}

function assertSameSquares(actual, expected, message) {
  assert.deepEqual(sortSquares(actual), sortSquares(expected), message);
}

// --- eigenePin: Weißer Wächter-Turm auf d4, gefesselt zwischen König d1 und Angreifer d8 --

test("eigenePin: FEN ist gültig ladbar und Weiß nicht im Schach (Wächter blockiert die Linie)", () => {
  const game = createPosition(FESSELUNG_POSITIONS.eigenePin);
  assert.doesNotThrow(() => game);
  assert.equal(game.inCheck(), false);
});

test("eigenePin: findeFesselung erkennt den weißen Turm auf d4 als gefesselt", () => {
  const game = createPosition(FESSELUNG_POSITIONS.eigenePin);
  const fesselung = findeFesselung(game, "w");
  assert.notEqual(fesselung, null, "sollte eine Fesselung finden");
  assert.deepEqual(fesselung.koenigAt, { row: 7, col: 3 }, "König auf d1");
  assert.deepEqual(fesselung.gefesselteAt, { row: 4, col: 3 }, "gefesselter Turm auf d4");
  assert.deepEqual(fesselung.angreiferAt, { row: 0, col: 3 }, "angreifender Turm auf d8");
});

test("eigenePin: findeFesselung findet für Schwarz keine (unpassende) Fesselung", () => {
  const game = createPosition(FESSELUNG_POSITIONS.eigenePin);
  assert.equal(findeFesselung(game, "b"), null, "der schwarze König auf h8 ist an keiner Fesselung beteiligt");
});

test("eigenePin: gefesselter Turm darf NUR auf der d-Linie ziehen (6 Zielfelder, inkl. Schlagen auf d8)", () => {
  const game = createPosition(FESSELUNG_POSITIONS.eigenePin);
  const targets = legalTargetsFor(game, { row: 4, col: 3 }); // d4
  assertSameSquares(
    targets,
    [
      { row: 5, col: 3 }, // d3
      { row: 6, col: 3 }, // d2
      { row: 3, col: 3 }, // d5
      { row: 2, col: 3 }, // d6
      { row: 1, col: 3 }, // d7
      { row: 0, col: 3 }, // d8 (Schlagen des Angreifers)
    ],
    "genau die d-Linie erwartet, keine Felder abseits (a4/e4/etc.)"
  );
});

test("eigenePin: ein Zug abseits der Linie (d4-e4, das im Bonuskapitel gezeigte Stopp!-Feld) ist strukturell kein Legalzug", () => {
  const game = createPosition(FESSELUNG_POSITIONS.eigenePin);
  const targets = legalTargetsFor(game, { row: 4, col: 3 });
  const hatE4 = targets.some((t) => t.row === 4 && t.col === 4);
  assert.equal(hatE4, false, "e4 (seitwärts von der Fesselungslinie herunter) darf NICHT erreichbar sein");
  const result = tryMove(game, { row: 4, col: 3 }, { row: 4, col: 4 });
  assert.equal(result.ok, false, "tryMove sollte den strukturell unmöglichen Zug ablehnen, nicht werfen");
});

// --- perspektivwechselUndSchlagen: schwarzer Wächter e4 gefesselt, weißer Held d1 schlägt --

test("perspektivwechselUndSchlagen: FEN ist gültig, Weiß nicht im Schach, Weiß am Zug", () => {
  const game = createPosition(FESSELUNG_POSITIONS.perspektivwechselUndSchlagen);
  assert.doesNotThrow(() => game);
  assert.equal(game.inCheck(), false);
  assert.equal(game.turn(), "w");
});

test("perspektivwechselUndSchlagen: findeFesselung erkennt den schwarzen Turm auf e4 als gefesselt", () => {
  const game = createPosition(FESSELUNG_POSITIONS.perspektivwechselUndSchlagen);
  const fesselung = findeFesselung(game, "b");
  assert.notEqual(fesselung, null, "sollte eine Fesselung finden");
  assert.deepEqual(fesselung.koenigAt, { row: 0, col: 4 }, "schwarzer König auf e8");
  assert.deepEqual(fesselung.gefesselteAt, { row: 4, col: 4 }, "gefesselter schwarzer Turm auf e4");
  assert.deepEqual(fesselung.angreiferAt, { row: 7, col: 4 }, "angreifender weißer Turm auf e1");
});

test("perspektivwechselUndSchlagen: weißer Turm auf d1 darf den Springer auf d4 schlagen", () => {
  const game = createPosition(FESSELUNG_POSITIONS.perspektivwechselUndSchlagen);
  const targets = legalTargetsFor(game, { row: 7, col: 3 }); // d1
  const hatD4 = targets.some((t) => t.row === 4 && t.col === 3);
  assert.equal(hatD4, true, "d1-Turm sollte den Springer auf d4 schlagen dürfen");
});

test("perspektivwechselUndSchlagen: nach dem Schlagzug (Rd1xd4) kann der gefesselte schwarze Turm NICHT zurückschlagen — die zentrale Lektion dieses Screens", () => {
  const game = createPosition(FESSELUNG_POSITIONS.perspektivwechselUndSchlagen);
  const result = tryMove(game, { row: 7, col: 3 }, { row: 4, col: 3 }); // d1xd4
  assert.equal(result.ok, true, "der Schlagzug selbst muss legal sein");
  assert.equal(result.isCapture, true, "sollte den Springer schlagen");

  // Jetzt ist Schwarz am Zug — der gefesselte Turm auf e4 darf laut Pin-Regel NICHT nach d4
  // ziehen (das würde den eigenen König auf e8 der Linie des weißen Turms auf e1 aussetzen).
  const targets = legalTargetsFor(game, { row: 4, col: 4 }); // e4
  const hatD4 = targets.some((t) => t.row === 4 && t.col === 3);
  assert.equal(hatD4, false, "der gefesselte Turm darf NICHT zurückschlagen");
});

test("perspektivwechselUndSchlagen: der gefesselte Turm darf weiterhin auf der e-Linie ziehen (z. B. e4-e5)", () => {
  // Bugfix (Nutzer-Testlauf 2026-09-08, echtes `npm test`): Dieser Test prüft eine reine
  // Positionstatsache über den gefesselten SCHWARZEN Turm — unabhängig davon, ob Weiß den
  // Springer auf d4 schon geschlagen hat (das ist der separate Test direkt darüber). Er
  // muss deshalb explizit Schwarz am Zug simulieren; die Basis-FEN selbst bleibt bewusst
  // bei "w" (Weiß am Zug), weil GENAU das die Stellung ist, die Fesselung.tsx Screen 4/5
  // tatsächlich für den echten Schlagzug des Kindes verwendet (siehe dortiger Kommentar).
  // Vorher fehlte dieser Zugfarben-Wechsel — legalTargetsFor lieferte für eine schwarze
  // Figur bei Weiß am Zug korrekterweise ein leeres Array (nicht die gegnerische Seite ist
  // am Zug), was den Test fälschlich als Logikfehler erscheinen ließ, obwohl `chess.js`
  // hier bereits richtig arbeitete. Isoliert per einfachem FEN-Farbtausch (nur in diesem
  // Test, verändert nicht FESSELUNG_POSITIONS selbst).
  const schwarzAmZugFen = FESSELUNG_POSITIONS.perspektivwechselUndSchlagen.replace(" w ", " b ");
  const game = createPosition(schwarzAmZugFen);
  assert.equal(game.turn(), "b", "diese Prüfung braucht Schwarz am Zug, um den gefesselten Turm selbst zu befragen");
  const targets = legalTargetsFor(game, { row: 4, col: 4 }); // e4
  const hatE5 = targets.some((t) => t.row === 3 && t.col === 4);
  assert.equal(hatE5, true, "e5 (auf der Fesselungslinie) sollte weiterhin legal sein");
});

test("perspektivwechselUndSchlagen: nach Rd1xd4 gewinnt Schwarz KEIN Material, wenn er stattdessen den fesselnden Turm auf e1 schlägt (Nutzer-Testlauf 2026-09-09)", () => {
  // Vor der Korrektur stand der weiße König auf a1 statt f2. Dort machte Rd1xd4 die
  // Grundreihe frei, sodass Rxe1 nicht nur legal (immer erlaubt, bleibt auf der
  // Fesselungslinie), sondern sogar Schach war UND einen ganzen Turm ohne Gegenschlag
  // gewann. Dieser Test schlägt fehl, falls dieselbe Schwäche je wieder eingeführt wird.
  const game = createPosition(FESSELUNG_POSITIONS.perspektivwechselUndSchlagen);
  const schlag = tryMove(game, { row: 7, col: 3 }, { row: 4, col: 3 }); // Rd1xd4
  assert.equal(schlag.ok, true, "Rd1xd4 muss weiterhin legal sein");
  assert.equal(game.inCheck(), false, "Rd1xd4 darf den eigenen König nicht selbst ins Schach stellen");

  const rueckschlag = tryMove(game, { row: 4, col: 4 }, { row: 7, col: 4 }); // Rxe1 (auf der Fesselungslinie erlaubt)
  assert.equal(rueckschlag.ok, true, "Rxe1 bleibt auf der Fesselungslinie und ist deshalb legal");
  assert.equal(game.inCheck(), false, "Rxe1 darf dem weißen König KEIN Schach mehr bieten (sonst könnte Weiß nicht sofort zurückschlagen)");

  const kxe1 = legalTargetsFor(game, { row: 6, col: 5 }); // weißer König auf f2
  const kannZurueckschlagen = kxe1.some((t) => t.row === 7 && t.col === 4);
  assert.equal(kannZurueckschlagen, true, "der weiße König muss den Turm auf e1 sofort zurückschlagen können (Kxe1), sonst hätte Schwarz einen ganzen Turm gratis gewonnen");
});

// --- Genereller Sanity-Check ---------------------------------------------------------------

test("Beide FESSELUNG_POSITIONS-Stellungen sind gültige, ladbare FENs", () => {
  const alle = Object.values(FESSELUNG_POSITIONS);
  assert.equal(alle.length, 2, "eigenePin + perspektivwechselUndSchlagen erwartet");
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
  console.log("Alle Fesselung-Tests grün.");
  process.exit(0);
}
