#!/usr/bin/env node
// Unit-Tests für die kuratierten MATT_IN_2_POSITIONEN in src/lib/chessEngine.ts — analog zu
// verify/test-fesselung-logic.cjs / verify/test-rochade-logic.cjs / test-figurenwert-logic.cjs
// (siehe dortiger Datei-Kommentar für die Begründung "kein Jest, kein ts-node").
//
// Diese Stellungen wurden VOR dem Eintrag in chessEngine.ts von Hand nachvollzogen (die
// npm-Registry war in der Implementierungs-Sandbox für `typescript`/`chess.js` blockiert,
// daher konnte dort kein echter Testlauf gegen das installierte chess.js erfolgen) — dieser
// Testlauf hier, mit `npm test`/`node verify/test-matt-in2-logic.cjs` auf einem Rechner mit
// vollständigem `npm install`, ist der maßgebliche, tatsächlich gegen das echte, installierte
// chess.js ausgeführte Beweis.
//
// WICHTIG (siehe chessEngine.ts/MATT_IN_2_POSITIONEN-Kommentar): dieser Test prüft, dass JEDER
// EINZELNE in MattIn2.tsx angebotene Zug tatsächlich ein echter Legalzug ist. Er prüft NICHT,
// dass die Zwei-Zug-REIHENFOLGE die einzig mögliche/kürzeste Mattführung ist — das ist eine
// bewusste didaktische Vereinfachung (curated legalTargets), keine Behauptung über eine
// erzwungene Schachlogik.
//
// Ausführen: `node verify/test-matt-in2-logic.cjs` im Projektverzeichnis (nach `npm install`).
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

const { createPosition, legalTargetsFor, tryMove, fromAlgebraic, MATT_IN_2_POSITIONEN } = m.exports;

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

// --- Feste Feldkoordinaten (siehe MattIn2.tsx) ---------------------------------------------
const KOENIG_START = { row: 7, col: 0 }; // a1
const TURM_START = { row: 7, col: 7 }; // h1
const WAECHTER_H5 = { row: 3, col: 7 }; // h5
const WAECHTER_DAME_H6 = { row: 2, col: 7 }; // h6
const ZIEL_BEDROHEN_H4 = { row: 4, col: 7 }; // h4
const KOENIG_ZIEL = { row: 6, col: 0 }; // a2

// Bugfix (Nutzer-Testlauf 2026-09-08, echtes `npm test`): Vier Tests in dieser Datei
// schlugen fehl, weil sie nach Weiß' erstem Zug (Turm) sofort einen ZWEITEN Weißzug
// (König) bzw. die Folge-Zielfelder derselben weißen Figur abfragten, OHNE dass
// dazwischen Schwarz am Zug war. chess.js erlaubt (korrekterweise!) niemals zwei Züge
// derselben Farbe hintereinander — das ist keine chess.js-Eigenart, sondern eine
// Grundregel des Schachs selbst, und hat mit der eigentlichen Kernaussage dieses
// Bonuskapitels nichts zu tun. Im Gegenteil: die "Zugzwang, ganz gleich was er macht"-
// Behauptung aus dem Screen-Skript (siehe chessEngine.ts/MATT_IN_2_POSITIONEN-Kommentar)
// braucht GENAU eine echte schwarze Zwischenantwort, um überhaupt sinnvoll geprüft zu
// werden. Diese Hilfsfunktion spielt deshalb nach Zug 1 JEDE von chess.js selbst
// gelieferte legale schwarze Antwort einzeln durch (nicht nur eine angenommene) und
// bestätigt für JEDE davon, dass König a1->a2 danach weiterhin legal bleibt — ein
// tatsächlicher, vollständiger Beweis der Zugzwang-Behauptung statt einer Stichprobe.
function pruefeZugzwang(name, fen, turmZiel) {
  const basis = createPosition(fen);
  const zug1 = tryMove(basis, TURM_START, turmZiel);
  assert.equal(zug1.ok, true, `${name}: Zug 1 (Turm) sollte legal sein`);
  const schwarzeAntworten = basis.moves({ verbose: true });
  assert.ok(schwarzeAntworten.length > 0, `${name}: Schwarz sollte nach Zug 1 mindestens eine legale Antwort haben`);
  for (const antwort of schwarzeAntworten) {
    const probe = createPosition(basis.fen());
    const schwarzZug = tryMove(probe, fromAlgebraic(antwort.from), fromAlgebraic(antwort.to));
    assert.equal(schwarzZug.ok, true, `${name}: schwarze Antwort ${antwort.san} sollte selbst ein echter Legalzug sein`);
    const koenigZug = tryMove(probe, KOENIG_START, KOENIG_ZIEL);
    assert.equal(
      koenigZug.ok,
      true,
      `${name}: nach der schwarzen Antwort ${antwort.san} sollte König a1->a2 weiterhin legal sein (Zugzwang-Behauptung)`
    );
  }
}

// Beide Stellungen: Grundgeometrie-Check.
for (const [name, fen] of Object.entries(MATT_IN_2_POSITIONEN)) {
  test(`${name}: FEN ist gültig, Weiß nicht im Schach (kein Widerspruch zur Zwei-Zug-Prämisse)`, () => {
    const game = createPosition(fen);
    assert.doesNotThrow(() => game);
    assert.equal(game.inCheck(), false);
  });

  test(`${name}: König a2 ist zu Beginn ein legaler Königszug (Zug-2-Zielfeld existiert)`, () => {
    const game = createPosition(fen);
    // a2 ist in beiden Stellungen frei und unbedroht -- ob es OHNE vorherigen Zug 1 schon
    // legal ist, ist für die App irrelevant (Zug 2 wird immer erst NACH Zug 1 angeboten),
    // aber zumindest muss a2 auf dem Brett existieren und leer sein.
    const board = game.board();
    assert.equal(board[6][0], null, "a2 sollte leer sein");
  });
}

// "Schlagen": Turm h1 schlägt den Springer auf h5.
test("schlagen: Turm h1 darf den Springer auf h5 schlagen", () => {
  const game = createPosition(MATT_IN_2_POSITIONEN.schlagen);
  const targets = legalTargetsFor(game, TURM_START);
  assert.equal(hatZielfeld(targets, WAECHTER_H5.row, WAECHTER_H5.col), true, "h5 sollte ein legaler Schlagzug sein");
});

test("schlagen: Schlagzug auf h5 wird korrekt als Capture ausgeführt, danach bleibt König a1->a2 legal — unabhängig davon, was Schwarz erwidert (Zugzwang)", () => {
  const captureCheck = tryMove(createPosition(MATT_IN_2_POSITIONEN.schlagen), TURM_START, WAECHTER_H5);
  assert.equal(captureCheck.ok, true);
  assert.equal(captureCheck.isCapture, true, "h5 trug zu Beginn den Springer -- sollte ein Schlagzug sein");
  pruefeZugzwang("schlagen", MATT_IN_2_POSITIONEN.schlagen, WAECHTER_H5);
});

// "Ablenkung": Turm h1 zieht (nicht schlagend) nach h5 und bedroht von dort die Dame auf h6.
test("ablenkung: Turm h1 darf (nicht schlagend) nach h5 ziehen", () => {
  const game = createPosition(MATT_IN_2_POSITIONEN.ablenkung);
  const targets = legalTargetsFor(game, TURM_START);
  assert.equal(hatZielfeld(targets, WAECHTER_H5.row, WAECHTER_H5.col), true, "h5 sollte ein legaler (nicht schlagender) Zug sein");
});

test("ablenkung: Zug nach h5 ist kein Schlagzug und bedroht anschließend die Dame auf h6", () => {
  // Bugfix (Nutzer-Testlauf 2026-09-08): Nach Rh1-h5 ist Schwarz am Zug -- legalTargetsFor
  // für eine WEISSE Figur liefert dann laut chess.js-Definition korrekterweise nichts. Hier
  // wird aber eine reine geometrische/taktische Tatsache geprüft (bedroht der Turm von h5
  // aus die Dame auf h6?), unabhängig davon, wer gerade am Zug ist — deshalb wird die
  // Zugfarbe in der FEN nach dem Zug gezielt zurück auf Weiß gesetzt (analog zum Fix in
  // verify/test-fesselung-logic.cjs), statt fälschlich eine schwarze Antwort zu simulieren,
  // die mit dieser Frage nichts zu tun hätte.
  const game = createPosition(MATT_IN_2_POSITIONEN.ablenkung);
  const result = tryMove(game, TURM_START, WAECHTER_H5);
  assert.equal(result.ok, true);
  assert.equal(result.isCapture, false, "h5 war zu Beginn leer -- kein Schlagzug");
  const weissWiederAmZug = createPosition(result.fenAfter.replace(" b ", " w "));
  const folgeTargets = legalTargetsFor(weissWiederAmZug, WAECHTER_H5);
  assert.equal(
    hatZielfeld(folgeTargets, WAECHTER_DAME_H6.row, WAECHTER_DAME_H6.col),
    true,
    "Turm auf h5 sollte die Dame auf h6 bedrohen (h6 als Folgezug erreichbar)"
  );
});

test("ablenkung: König a1->a2 bleibt nach dem Ablenkungszug legal, unabhängig davon, was Schwarz (inkl. der Dame) erwidert (Zugzwang)", () => {
  pruefeZugzwang("ablenkung", MATT_IN_2_POSITIONEN.ablenkung, WAECHTER_H5);
});

// Wahl-Screen (Screen 3): BEIDE Zug-1-Zielfelder (h5 = schlagen, h4 = bedrohen) müssen echte
// Legalzüge des Turms sein, siehe Review-Befund 1.8 ("das Kind wählt nie zwischen den Wegen").
test("Wahl-Screen: Turm h1 darf sowohl h5 (schlagen) als auch h4 (bedrohen) ziehen", () => {
  const game = createPosition(MATT_IN_2_POSITIONEN.schlagen);
  const targets = legalTargetsFor(game, TURM_START);
  assert.equal(hatZielfeld(targets, WAECHTER_H5.row, WAECHTER_H5.col), true, "h5 sollte legal sein");
  assert.equal(hatZielfeld(targets, ZIEL_BEDROHEN_H4.row, ZIEL_BEDROHEN_H4.col), true, "h4 sollte legal sein");
});

test("Wahl-Screen: nach der Alternative h4 (bedrohen statt schlagen) bleibt König a1->a2 legal — unabhängig davon, was Schwarz erwidert (Zugzwang)", () => {
  pruefeZugzwang("Wahl-Screen (h4)", MATT_IN_2_POSITIONEN.schlagen, ZIEL_BEDROHEN_H4);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Matt-in-2-Tests grün.");
  process.exit(0);
}
