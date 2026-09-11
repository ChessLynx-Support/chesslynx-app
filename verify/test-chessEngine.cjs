#!/usr/bin/env node
// Unit-Tests für die reine, UI-freie Zuglogik in src/lib/chessEngine.ts.
//
// Hintergrund (siehe claude/priorisierter_umsetzungsplan.md, Abschnitt "Zusätzliche
// Optimierungspotentiale, außerhalb der vier Review-Kategorien"): der Opus-Review vom
// 2026-09-07 fand mehrere Fehler genau in dieser Schicht (falsche FEN-Kommentare,
// Quest-6-Figuren-Mismatch, siehe Befund 1.4/1.5) — rein manuell. `legalTargetsFor`,
// `tryMove` und `createPosition` sind reine, UI-freie Funktionen und lassen sich deshalb
// automatisiert gegen das echte, installierte chess.js prüfen, ganz ohne Gerät oder
// Bildschirmsteuerung (die für UI-Tests bereits als nicht machbar identifiziert wurde,
// siehe „Bildschirmtest-Automatisierung“ im selben Dokument).
//
// Bewusst KEIN Jest, kein ts-node, KEINE neue Abhängigkeit: läuft mit reinem
// `node verify/test-chessEngine.cjs` (oder `npm test`, siehe package.json). Nutzt nur,
// was bereits Projekt-Abhängigkeit ist — `typescript` (devDependency), um chessEngine.ts
// on-the-fly nur von seinen Typen zu befreien (keine projektweite Kompilierung, kein
// tsconfig-Lookup nötig), und lädt darüber das echte, installierte chess.js — exakt
// dieselbe Bibliothek, die die App zur Laufzeit nutzt. Setzt fort, was chessEngine.ts
// selbst schon referenziert ("sowohl per `node verify/test-questN-logic.cjs` gegen das
// echte, installierte chess.js" — jene Einzelskripte aus früheren Sitzungen liegen nicht
// mehr im Repo, dieses eine Skript deckt denselben Zweck konsolidiert für alle sechs
// Quests ab).
//
// Ausführen: `node verify/test-chessEngine.cjs` im Projektverzeichnis (nach `npm install`,
// falls noch nicht geschehen — braucht insbesondere `typescript` und `chess.js`, beide
// bereits in package.json gelistet). Exit-Code 0 = alle Tests grün, 1 = mindestens ein
// Fehler (Zusammenfassung am Ende, jeder Fehler mit Klartext-Meldung).

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

// In-memory-Modul statt temporärer Datei: Module._compile kompiliert den bereits
// typfreien JS-Text direkt. `m.paths` zeigt auf chessEngine.ts' eigenes Verzeichnis,
// damit das darin enthaltene `require("chess.js")` ganz normal gegen das echte,
// installierte node_modules/chess.js auflöst — kein Mock, keine Fälschung.
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

const {
  createPosition,
  legalTargetsFor,
  tryMove,
  toAlgebraic,
  fromAlgebraic,
  QUEST1_POSITIONS,
  QUEST2_POSITIONS,
  QUEST3_POSITIONS,
  QUEST4_POSITIONS,
  QUEST5_POSITIONS,
  QUEST6_POSITIONS,
} = m.exports;

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

// --- Reine Koordinaten-Umrechnung (kein chess.js nötig) --------------------------------

test("toAlgebraic/fromAlgebraic: Rundreise für alle vier Brettecken", () => {
  const ecken = [
    { row: 0, col: 0, algebraic: "a8" },
    { row: 0, col: 7, algebraic: "h8" },
    { row: 7, col: 0, algebraic: "a1" },
    { row: 7, col: 7, algebraic: "h1" },
  ];
  for (const e of ecken) {
    assert.equal(toAlgebraic({ row: e.row, col: e.col }), e.algebraic);
    assert.deepEqual(fromAlgebraic(e.algebraic), { row: e.row, col: e.col });
  }
});

// --- Quest 1 (Bauer/Igel) ---------------------------------------------------------------

test("Quest1 Screen2: Bauer auf e2 darf ein ODER zwei Felder vor", () => {
  const game = createPosition(QUEST1_POSITIONS.screen2);
  const targets = legalTargetsFor(game, { row: 6, col: 4 });
  assertSameSquares(
    targets,
    [
      { row: 5, col: 4 },
      { row: 4, col: 4 },
    ],
    "e3 und e4 erwartet"
  );
});

test("Quest1 Screen4Blocked: Bauer hat KEINEN legalen Zug mehr (Opus-Review Abschnitt 3.2)", () => {
  // Regressionsschutz für die didaktische Korrektur vom 2026-09-07: die Blockade steht
  // jetzt direkt auf e3 (vorher e4), wodurch weder Einzel- noch Doppelschritt möglich
  // ist. Voll lösbar bleibt der Screen trotzdem, weil onTrapTap (Befund 1.3) die einzige
  // Interaktion übernimmt — das ist bewusst kein Bug, siehe chessEngine.ts-Kommentar.
  const game = createPosition(QUEST1_POSITIONS.screen4Blocked);
  const targets = legalTargetsFor(game, { row: 6, col: 4 });
  assert.equal(targets.length, 0, "Bauer sollte auf screen4Blocked keinen einzigen Legalzug haben");
});

test("Quest1 Screen5Capture: Bauer darf vorwärts UND schräg schlagen", () => {
  const game = createPosition(QUEST1_POSITIONS.screen5Capture);
  const targets = legalTargetsFor(game, { row: 6, col: 4 });
  assertSameSquares(
    targets,
    [
      { row: 5, col: 4 },
      { row: 4, col: 4 },
      { row: 5, col: 5 },
    ],
    "e3, e4 und f3 (Schlagfeld) erwartet"
  );
});

test("Quest1 Screen5Capture: Schlagzug auf f3 funktioniert und wird als Capture erkannt", () => {
  const game = createPosition(QUEST1_POSITIONS.screen5Capture);
  const result = tryMove(game, { row: 6, col: 4 }, { row: 5, col: 5 });
  assert.equal(result.ok, true);
  assert.equal(result.isCapture, true);
});

test("tryMove: strukturell unmöglicher Zug liefert ok:false statt zu werfen", () => {
  const game = createPosition(QUEST1_POSITIONS.screen2);
  // Drei Felder auf einmal ist für keinen Bauern legal.
  const result = tryMove(game, { row: 6, col: 4 }, { row: 3, col: 4 });
  assert.equal(result.ok, false);
});

// --- Quest 2 (Turm/Bär) -----------------------------------------------------------------

test("Quest2 Screen4Blocked: Turm darf bis a2 UND über die komplett freie 1. Reihe bis h1, aber nicht bis a3", () => {
  // Korrigiert (Nutzer-Testlauf 2026-09-07, npm test): die Erwartung hier war noch auf
  // dem Stand VOR dem "Turm-Bug"-Fix (siehe QuestMoveScreen.tsx-Kommentar bzw.
  // chessEngine.ts-Kommentar bei QUEST2_POSITIONS.screen4Blocked) — die kuratierte
  // Stellung ("4k3/8/8/8/7K/P7/8/R7 w - - 0 1") hat auf der ganzen 1. Reihe rechts vom
  // Turm nie eine Blockade gehabt, b1-h1 waren schon immer frei. Nur die frühere
  // onlyTarget-Filterung in Quest2.tsx blendete e1-h1 aus der ANZEIGE aus (genau der Bug,
  // der zur "immer alle Legalzüge anbieten"-Architektur geführt hat) — legalTargetsFor
  // selbst lieferte sie schon vorher korrekt mit. Dieser Test prüfte irrtümlich die alte,
  // gefilterte Anzeige-Erwartung statt der tatsächlichen Zuglogik.
  const game = createPosition(QUEST2_POSITIONS.screen4Blocked);
  const targets = legalTargetsFor(game, { row: 7, col: 0 });
  assertSameSquares(
    targets,
    [
      { row: 6, col: 0 }, // a2
      { row: 7, col: 1 }, // b1
      { row: 7, col: 2 }, // c1
      { row: 7, col: 3 }, // d1
      { row: 7, col: 4 }, // e1
      { row: 7, col: 5 }, // f1
      { row: 7, col: 6 }, // g1
      { row: 7, col: 7 }, // h1
    ],
    "a2 (bis zur Blockade) UND die komplett freie 1. Reihe bis h1 erwartet — a3 (eigener Bauer) und alles dahinter bleibt unerreichbar"
  );
});

// --- Quest 3 (Läufer/Eule) ---------------------------------------------------------------

test("Quest3 Screen4Blocked: eine Diagonale komplett frei, die andere nur bis e5", () => {
  const game = createPosition(QUEST3_POSITIONS.screen4Blocked);
  const targets = legalTargetsFor(game, { row: 4, col: 3 });
  assert.equal(targets.length, 10, "10 Zielfelder erwartet (4 auf der teilblockierten, 6 auf der freien Diagonale)");
  const hatF6 = targets.some((t) => t.row === 2 && t.col === 5);
  assert.equal(hatF6, false, "f6 (der eigene Bauer selbst) darf nicht als Zielfeld erscheinen");
});

// --- Quest 4 (Springer/Pferd) ------------------------------------------------------------

test("Quest4 Screen4Blocked: Springer hüpft trotz der Bauernkette (c3/d3/e3) unverändert über alle 8 Felder", () => {
  // Positions-Update (Nutzer-Feedback 2026-09-07, "unrealistisch, dass der Springer von so
  // vielen anderen Springern umzingelt ist"): die Stellung nutzt jetzt eine kleinere,
  // realistischere 3er-Bauernkette statt des vollen Achter-Rings — keines der drei Felder
  // war je ein Sprungziel, daher bleiben unverändert alle 8 Sprünge legal.
  const game = createPosition(QUEST4_POSITIONS.screen4Blocked);
  const targets = legalTargetsFor(game, { row: 4, col: 3 });
  assert.equal(targets.length, 8, "alle 8 Sprungfelder sollten trotz der Bauernkette weiterhin legal sein");
  const hatE6 = targets.some((t) => t.row === 2 && t.col === 4);
  assert.equal(hatE6, true, "e6 muss unter den 8 Sprungfeldern sein");
});

// --- Quest 5 (Dame/Schwan) ----------------------------------------------------------------

test("Quest5 Screen4Blocked: d5 (vor der Blockade) erreichbar, d6 (die Blockade selbst) nicht", () => {
  const game = createPosition(QUEST5_POSITIONS.screen4Blocked);
  const targets = legalTargetsFor(game, { row: 4, col: 3 });
  const hatD5 = targets.some((t) => t.row === 3 && t.col === 3);
  const hatD6 = targets.some((t) => t.row === 2 && t.col === 3);
  assert.equal(hatD5, true, "d5 (das Feld direkt vor der Blockade) muss erreichbar sein");
  assert.equal(hatD6, false, "d6 (der blockierende eigene Bauer selbst) darf nicht erreichbar sein");
});

// --- Quest 6 (König/Hirsch) — der wichtigste Testfall: echte Schach-Erkennung ------------

test("Quest6 Screen4Check: der König steht im Schach, sobald die Stellung geladen wird", () => {
  const game = createPosition(QUEST6_POSITIONS.screen4Check);
  assert.equal(game.inCheck(), true, "der Springer auf c6 sollte den König auf d4 sofort bedrohen");
});

test("Quest6 Screen4Check: von 8 Nachbarfeldern löst genau e5 das Schach NICHT auf", () => {
  const game = createPosition(QUEST6_POSITIONS.screen4Check);
  const targets = legalTargetsFor(game, { row: 4, col: 3 });
  assert.equal(targets.length, 7, "7 von 8 Nachbarfeldern sollten das Schach auflösen");
  const hatE5 = targets.some((t) => t.row === 3 && t.col === 4);
  assert.equal(hatE5, false, "e5 bleibt vom Springer auf c6 bedroht und darf NICHT als Legalzug erscheinen");
});

test("Quest6: die bedrohende/besuchende Figur ist auf Screen4 UND Screen5 ein Springer, kein König (Befund 1.5)", () => {
  // Regressionsschutz für den vom Opus-Review gefundenen Bug: Quest6.tsx zeigte hier
  // früher fälschlich KoenigMasterDunkelIcon, obwohl die FEN durchgehend einen Springer
  // ('n') kodiert — zwei Könige nebeneinander sind im Schach ohnehin unmöglich.
  const check = createPosition(QUEST6_POSITIONS.screen4Check);
  const capture = createPosition(QUEST6_POSITIONS.screen5Capture);
  assert.equal(check.get(toAlgebraic({ row: 2, col: 2 })).type, "n", "c6 in screen4Check sollte ein Springer sein");
  assert.equal(
    capture.get(toAlgebraic({ row: 3, col: 4 })).type,
    "n",
    "e5 in screen5Capture sollte ein Springer sein"
  );
});

test("Quest6 Screen5Capture: kein Schach, normales Schlagen möglich", () => {
  const game = createPosition(QUEST6_POSITIONS.screen5Capture);
  assert.equal(game.inCheck(), false, "der ungedeckte Springer auf e5 sollte den König NICHT bedrohen");
  const result = tryMove(game, { row: 4, col: 3 }, { row: 3, col: 4 });
  assert.equal(result.ok, true);
  assert.equal(result.isCapture, true);
});

// --- Genereller Sanity-Check über alle 23 kuratierten Stellungen -------------------------

test("Alle 23 Quest-Stellungen sind gültige, ladbare FENs", () => {
  // Update (2026-09-11, Paket 2 Quest-6-Erweiterung): QUEST6_POSITIONS enthält zusätzlich
  // schachBruecke, mattMoment und miniSpiel (Liste mit 4 Stellungen) — 17 + 6 = 23. Die
  // Werte werden deshalb flach ausgerollt (.flat()), damit auch die vier Mini-Spiel-FENs
  // einzeln geprüft werden statt als Array.
  // Korrigiert (Nutzer-Testlauf 2026-09-07, npm test): war bis dahin noch auf "18 (6 × 3)"
  // ausgelegt. Quest 4 (Springer) hat seit der Zusammenlegung von Screen 4 (Blockade) und
  // Screen 5 (Schlagen) zu einem einzigen kombinierten Screen (siehe QUEST4_POSITIONS-
  // Kommentar sowie Quest4.tsx: "surrounded + Schlagmöglichkeit in einem Screen") nur noch
  // zwei Stellungen (screen2, screen4Blocked) statt drei — macht 5 Quests × 3 + 1 Quest × 2
  // = 17 statt 18.
  const alle = [
    ...Object.values(QUEST1_POSITIONS),
    ...Object.values(QUEST2_POSITIONS),
    ...Object.values(QUEST3_POSITIONS),
    ...Object.values(QUEST4_POSITIONS),
    ...Object.values(QUEST5_POSITIONS),
    ...Object.values(QUEST6_POSITIONS),
  ].flat();
  assert.equal(
    alle.length,
    23,
    "5 Quests × 3 Screens + Quest 4 × 2 Screens = 17, plus Quest-6-Erweiterung 1 + 4 + 1 = 23 Stellungen erwartet"
  );
  for (const fen of alle) {
    assert.doesNotThrow(() => createPosition(fen), `FEN sollte gültig sein: ${fen}`);
  }
});

// --- Zusammenfassung ----------------------------------------------------------------------

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle chessEngine.ts-Tests grün.");
  process.exit(0);
}
