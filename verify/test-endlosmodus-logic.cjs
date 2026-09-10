#!/usr/bin/env node
// Unit-Tests für die kuratierten Endlosmodus-Stellungen in src/lib/chessEngine.ts
// (EICHHOERNCHEN_*, FUCHSBAU_*, DACHSHOEHLE_*, ADLERHORST_*, WOLFSFESTE_*) — analog zu
// verify/test-fesselung-logic.cjs / verify/test-matt-in2-logic.cjs / test-rochade-logic.cjs
// (siehe dortiger Datei-Kommentar für die Begründung "kein Jest, kein ts-node").
//
// Diese 27 Stellungen wurden VOR dem Eintrag in chessEngine.ts bereits gegen einen eigens
// dafür geschriebenen, vollständigen Legalzug-Prüfer verifiziert (die npm-Registry war in der
// Implementierungs-Sandbox für `chess.js` blockiert, siehe chessEngine.ts-Kopfkommentar,
// "Nachtrag 2026-09-09") — dieser Testlauf hier, mit `npm test`/
// `node verify/test-endlosmodus-logic.cjs` auf einem Rechner mit vollständigem `npm install`,
// ist der maßgebliche, tatsächlich gegen das echte, installierte chess.js ausgeführte Beweis.
//
// Ausführen: `node verify/test-endlosmodus-logic.cjs` im Projektverzeichnis (nach `npm install`).
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

const {
  createPosition,
  legalTargetsFor,
  tryMove,
  fromAlgebraic,
  findeFesselung,
  EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS,
  EICHHOERNCHEN_FIGURENWERT_POSITIONS,
  FUCHSBAU_SCHACH_POSITIONEN,
  DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS,
  DACHSHOEHLE_SCHACH_POSITIONEN,
  DACHSHOEHLE_ROCHADE_POSITIONEN,
  ADLERHORST_FESSELUNG_POSITIONEN,
  WOLFSFESTE_FESSELUNG_POSITIONEN,
  WOLFSFESTE_MATT_IN_2_POSITIONEN,
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

function hatZielfeld(targets, row, col) {
  return targets.some((t) => t.row === row && t.col === col);
}

// Prüft, dass NACH einem Weißzug König/Held `folgeVon` -> `folgeNach` unabhängig von JEDER
// legalen schwarzen Zwischenantwort weiterhin legal bleibt — dieselbe vollständige
// Zugzwang-Prüfung wie `pruefeZugzwang` in verify/test-matt-in2-logic.cjs, hier allgemein
// für ein beliebiges Figurenpaar statt fest auf Turm/König verdrahtet.
function pruefeNachJederSchwarzantwort(name, fen, ersterZugVon, ersterZugNach, folgeVon, folgeNach) {
  const basis = createPosition(fen);
  const zug1 = tryMove(basis, ersterZugVon, ersterZugNach);
  assert.equal(zug1.ok, true, `${name}: Zug 1 sollte legal sein`);
  const schwarzeAntworten = basis.moves({ verbose: true });
  assert.ok(schwarzeAntworten.length > 0, `${name}: Schwarz sollte nach Zug 1 mindestens eine legale Antwort haben`);
  for (const antwort of schwarzeAntworten) {
    const probe = createPosition(basis.fen());
    const schwarzZug = tryMove(probe, fromAlgebraic(antwort.from), fromAlgebraic(antwort.to));
    assert.equal(schwarzZug.ok, true, `${name}: schwarze Antwort ${antwort.san} sollte selbst ein echter Legalzug sein`);
    const folgeZug = tryMove(probe, folgeVon, folgeNach);
    assert.equal(
      folgeZug.ok,
      true,
      `${name}: nach der schwarzen Antwort ${antwort.san} sollte der Folgezug weiterhin legal sein`
    );
  }
  console.log(`  (${name}: gegen alle ${schwarzeAntworten.length} möglichen schwarzen Antworten geprüft)`);
}

// ============================================================================
// EICHHOERNCHEN-LICHTUNG — Figur gewinnen (Turm a1 gegen einen oder mehrere Springer)
// ============================================================================
const TURM_A1 = { row: 7, col: 0 };
test("Eichhörnchen FigurGewinnen stern1: kein Schach, Ra1xa6 legal", () => {
  const game = createPosition(EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS.stern1);
  assert.equal(game.inCheck(), false);
  const targets = legalTargetsFor(game, TURM_A1);
  assert.equal(hatZielfeld(targets, 2, 0), true, "a6 sollte schlagbar sein"); // a6 = row2,col0
});
test("Eichhörnchen FigurGewinnen stern2: Ra1xa6 legal, e6-Distraktor für den Turm nicht erreichbar", () => {
  const game = createPosition(EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS.stern2);
  assert.equal(game.inCheck(), false);
  const targets = legalTargetsFor(game, TURM_A1);
  assert.equal(hatZielfeld(targets, 2, 0), true, "a6 sollte schlagbar sein");
  assert.equal(hatZielfeld(targets, 2, 4), false, "e6-Distraktor sollte für den Turm NICHT erreichbar sein");
});
test("Eichhörnchen FigurGewinnen stern3: Ra1xa8 legal, f5-Distraktor nicht erreichbar", () => {
  const game = createPosition(EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS.stern3);
  assert.equal(game.inCheck(), false);
  const targets = legalTargetsFor(game, TURM_A1);
  assert.equal(hatZielfeld(targets, 0, 0), true, "a8 sollte schlagbar sein");
  assert.equal(hatZielfeld(targets, 3, 5), false, "f5-Distraktor sollte für den Turm NICHT erreichbar sein");
});

// ============================================================================
// EICHHOERNCHEN-LICHTUNG — Figurenwert (Dame d4 gegen zwei Vergleichsfiguren d7/a4)
// ============================================================================
const DAME_D4 = { row: 4, col: 3 };
for (const [name, fen] of Object.entries(EICHHOERNCHEN_FIGURENWERT_POSITIONS)) {
  test(`Eichhörnchen Figurenwert ${name}: kein Schach, Dame d4 kann sowohl d7 als auch a4 schlagen`, () => {
    const game = createPosition(fen);
    assert.equal(game.inCheck(), false);
    const targets = legalTargetsFor(game, DAME_D4);
    assert.equal(hatZielfeld(targets, 1, 3), true, "d7 sollte schlagbar sein");
    assert.equal(hatZielfeld(targets, 4, 0), true, "a4 sollte schlagbar sein");
  });
}

// ============================================================================
// FUCHSBAU — Schach lösen (wegziehen / blockieren / schlagen)
// ============================================================================
test("Fuchsbau wegziehen: Weiß im Schach, Kd4-c4 löst es", () => {
  const game = createPosition(FUCHSBAU_SCHACH_POSITIONEN.wegziehen);
  assert.equal(game.inCheck(), true);
  const result = tryMove(game, { row: 4, col: 3 }, { row: 4, col: 2 }); // Kd4-c4
  assert.equal(result.ok, true);
  assert.equal(result.isCheck, false, "nach Kc4 sollte Weiß nicht mehr im Schach stehen");
});
test("Fuchsbau blockieren: Weiß im Schach, Ra5-d5 blockt", () => {
  const game = createPosition(FUCHSBAU_SCHACH_POSITIONEN.blockieren);
  assert.equal(game.inCheck(), true);
  const result = tryMove(game, { row: 3, col: 0 }, { row: 3, col: 3 }); // Ra5-d5
  assert.equal(result.ok, true);
  assert.equal(result.isCheck, false, "nach Rd5 sollte Weiß nicht mehr im Schach stehen (Linie blockiert)");
});
test("Fuchsbau schlagen: Weiß im Schach, Nb3xa5 schlägt den Angreifer", () => {
  const game = createPosition(FUCHSBAU_SCHACH_POSITIONEN.schlagen);
  assert.equal(game.inCheck(), true);
  const result = tryMove(game, { row: 5, col: 1 }, { row: 3, col: 0 }); // Nb3xa5
  assert.equal(result.ok, true);
  assert.equal(result.isCapture, true, "sollte den Läufer schlagen");
  assert.equal(result.isCheck, false, "nach Nxa5 sollte Weiß nicht mehr im Schach stehen");
});

// ============================================================================
// DACHSHÖHLE — Figur gewinnen
// ============================================================================
test("Dachshöhle FigurGewinnen stern1: kein Schach, Ra1xa3 legal", () => {
  const game = createPosition(DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS.stern1);
  assert.equal(game.inCheck(), false);
  const targets = legalTargetsFor(game, TURM_A1);
  assert.equal(hatZielfeld(targets, 5, 0), true, "a3 sollte schlagbar sein");
});
test("Dachshöhle FigurGewinnen stern2: Ra1xa4 legal, d5-Distraktor nicht erreichbar", () => {
  const game = createPosition(DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS.stern2);
  assert.equal(game.inCheck(), false);
  const targets = legalTargetsFor(game, TURM_A1);
  assert.equal(hatZielfeld(targets, 4, 0), true, "a4 sollte schlagbar sein");
  assert.equal(hatZielfeld(targets, 3, 3), false, "d5-Distraktor sollte für den Turm NICHT erreichbar sein");
});
test("Dachshöhle FigurGewinnen stern3: Ra1xa7 legal, f4-Distraktor nicht erreichbar", () => {
  const game = createPosition(DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS.stern3);
  assert.equal(game.inCheck(), false);
  const targets = legalTargetsFor(game, TURM_A1);
  assert.equal(hatZielfeld(targets, 1, 0), true, "a7 sollte schlagbar sein");
  assert.equal(hatZielfeld(targets, 4, 5), false, "f4-Distraktor sollte für den Turm NICHT erreichbar sein");
});

// ============================================================================
// DACHSHÖHLE — Schach lösen
// ============================================================================
test("Dachshöhle wegziehen: Weiß im Schach, Kd5-c5 löst es", () => {
  const game = createPosition(DACHSHOEHLE_SCHACH_POSITIONEN.wegziehen);
  assert.equal(game.inCheck(), true);
  const result = tryMove(game, { row: 3, col: 3 }, { row: 3, col: 2 }); // Kd5-c5
  assert.equal(result.ok, true);
  assert.equal(result.isCheck, false);
});
test("Dachshöhle blockieren: Weiß im Schach, La4-d7 blockt", () => {
  const game = createPosition(DACHSHOEHLE_SCHACH_POSITIONEN.blockieren);
  assert.equal(game.inCheck(), true);
  const result = tryMove(game, { row: 4, col: 0 }, { row: 1, col: 3 }); // Ba4-d7
  assert.equal(result.ok, true);
  assert.equal(result.isCheck, false, "nach Ld7 sollte Weiß nicht mehr im Schach stehen");
});
test("Dachshöhle schlagen: Weiß im Schach, Ra4xh4 schlägt den Angreifer", () => {
  const game = createPosition(DACHSHOEHLE_SCHACH_POSITIONEN.schlagen);
  assert.equal(game.inCheck(), true);
  const result = tryMove(game, { row: 4, col: 0 }, { row: 4, col: 7 }); // Ra4xh4
  assert.equal(result.ok, true);
  assert.equal(result.isCapture, true);
  assert.equal(result.isCheck, false);
});

// ============================================================================
// DACHSHÖHLE — Rochade-Übungsspalte
// ============================================================================
test("Dachshöhle Rochade stern1: nur die kurze Rochade ist möglich", () => {
  const game = createPosition(DACHSHOEHLE_ROCHADE_POSITIONEN.stern1);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 6), true, "kurze Rochade (g1) sollte legal sein");
  assert.equal(hatZielfeld(targets, 7, 2), false, "lange Rochade (c1) sollte NICHT legal sein (kein Recht + kein Turm auf a1)");
});
test("Dachshöhle Rochade stern2: nur die lange Rochade ist möglich", () => {
  const game = createPosition(DACHSHOEHLE_ROCHADE_POSITIONEN.stern2);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 2), true, "lange Rochade (c1) sollte legal sein");
  assert.equal(hatZielfeld(targets, 7, 6), false, "kurze Rochade (g1) sollte NICHT legal sein (kein Recht + kein Turm auf h1)");
});
test("Dachshöhle Rochade stern3: beide Rechte vorhanden, aber beide Seiten durch Springer blockiert", () => {
  const game = createPosition(DACHSHOEHLE_ROCHADE_POSITIONEN.stern3);
  const targets = legalTargetsFor(game, { row: 7, col: 4 }); // e1
  assert.equal(hatZielfeld(targets, 7, 2), false, "lange Rochade sollte durch den Springer auf d1 blockiert sein");
  assert.equal(hatZielfeld(targets, 7, 6), false, "kurze Rochade sollte durch den Springer auf f1 blockiert sein");
});

// ============================================================================
// ADLERHORST — Fesselung
// ============================================================================
test("Adlerhorst Fesselung stern1: Turm e4 gefesselt, nur die e-Linie ist erreichbar", () => {
  const game = createPosition(ADLERHORST_FESSELUNG_POSITIONEN.stern1);
  const fesselung = findeFesselung(game, "w");
  assert.notEqual(fesselung, null, "sollte eine Fesselung finden");
  const targets = legalTargetsFor(game, { row: 4, col: 4 }); // e4
  assert.equal(hatZielfeld(targets, 4, 0), false, "seitlich (a4) darf NICHT erreichbar sein");
  assert.equal(hatZielfeld(targets, 0, 4), true, "e8 (Schlagen des Angreifers) sollte erreichbar sein");
});
test("Adlerhorst Fesselung stern2: Läufer d4 diagonal gefesselt (a1-h8), nur diese Diagonale erreichbar", () => {
  const game = createPosition(ADLERHORST_FESSELUNG_POSITIONEN.stern2);
  assert.equal(game.inCheck(), false);
  const fesselung = findeFesselung(game, "w");
  assert.notEqual(fesselung, null, "sollte eine Fesselung finden");
  const targets = legalTargetsFor(game, { row: 4, col: 3 }); // d4
  assert.equal(hatZielfeld(targets, 0, 7), true, "h8 (Schlagen des Angreifers, Ende der Diagonale) sollte erreichbar sein");
  assert.equal(hatZielfeld(targets, 3, 2), false, "c5 (andere Diagonale) sollte NICHT erreichbar sein");
  assert.equal(hatZielfeld(targets, 5, 4), false, "e3 (andere Diagonale) sollte NICHT erreichbar sein");
});
test("Adlerhorst Fesselung stern3: gegnerischer Turm g4 gefesselt, darf Springer f4 NICHT zurückschlagen", () => {
  const game = createPosition(ADLERHORST_FESSELUNG_POSITIONEN.stern3);
  const result = tryMove(game, { row: 7, col: 5 }, { row: 4, col: 5 }); // Rf1xf4
  assert.equal(result.ok, true, "weißer Schlagzug Rf1xf4 sollte legal sein");
  assert.equal(result.isCapture, true);
  const schwarzTargets = legalTargetsFor(game, { row: 4, col: 6 }); // g4
  assert.equal(hatZielfeld(schwarzTargets, 4, 5), false, "gefesselter Turm g4 darf nicht nach f4 zurückschlagen");
});
test("Adlerhorst Fesselung stern3: nach Rf1xf4 gewinnt Schwarz KEIN Material mit Rxg1 (Nutzer-Testlauf 2026-09-09)", () => {
  // Vor der ersten Korrektur stand der weiße König auf c1 statt h2 — dieselbe
  // Grundreihen-Schwäche wie in FESSELUNG_POSITIONS.perspektivwechselUndSchlagen: Rxg1 wäre
  // Schach UND ein ungedeckter Turmgewinn gewesen. Ein Zwischenstand (König auf f2, siehe
  // Korrektur-Kommentar bei ADLERHORST_FESSELUNG_POSITIONEN.stern3 in chessEngine.ts) blockierte
  // stattdessen selbst den einleitenden Zug Rf1xf4 — im echten `npm test`-Lauf gefunden, siehe
  // die vorherige Test-Assertion oben. König steht jetzt auf h2. Dieser Test schlägt fehl,
  // falls die ursprüngliche Grundreihen-Schwäche zurückkehrt.
  const game = createPosition(ADLERHORST_FESSELUNG_POSITIONEN.stern3);
  const schlag = tryMove(game, { row: 7, col: 5 }, { row: 4, col: 5 }); // Rf1xf4
  assert.equal(schlag.ok, true);
  assert.equal(game.inCheck(), false, "Rf1xf4 darf den eigenen König nicht selbst ins Schach stellen");
  const rueckschlag = tryMove(game, { row: 4, col: 6 }, { row: 7, col: 6 }); // Rxg1
  assert.equal(rueckschlag.ok, true, "Rxg1 bleibt auf der Fesselungslinie und ist legal");
  assert.equal(game.inCheck(), false, "Rxg1 darf dem weißen König KEIN Schach mehr bieten");
  const kxg1 = legalTargetsFor(game, { row: 6, col: 7 }); // weißer König auf h2
  assert.equal(kxg1.some((t) => t.row === 7 && t.col === 6), true, "der weiße König muss den Turm auf g1 sofort zurückschlagen können");
});

// ============================================================================
// WOLFSFESTE — Fesselung
// ============================================================================
test("Wolfsfeste Fesselung stern1: Turm g4 gefesselt, nur die g-Linie ist erreichbar", () => {
  const game = createPosition(WOLFSFESTE_FESSELUNG_POSITIONEN.stern1);
  const fesselung = findeFesselung(game, "w");
  assert.notEqual(fesselung, null, "sollte eine Fesselung finden");
  const targets = legalTargetsFor(game, { row: 4, col: 6 }); // g4
  assert.equal(hatZielfeld(targets, 4, 0), false, "seitlich (a4) darf NICHT erreichbar sein");
  assert.equal(hatZielfeld(targets, 0, 6), true, "g8 (Schlagen des Angreifers) sollte erreichbar sein");
});
test("Wolfsfeste Fesselung stern2: Läufer e4 auf der h1-a8-Diagonale gefesselt", () => {
  const game = createPosition(WOLFSFESTE_FESSELUNG_POSITIONEN.stern2);
  assert.equal(game.inCheck(), false);
  const fesselung = findeFesselung(game, "w");
  assert.notEqual(fesselung, null, "sollte eine Fesselung finden");
  const targets = legalTargetsFor(game, { row: 4, col: 4 }); // e4
  assert.equal(hatZielfeld(targets, 0, 0), true, "a8 (Schlagen des Angreifers) sollte erreichbar sein");
  assert.equal(hatZielfeld(targets, 7, 7), false, "h1 ist vom eigenen König besetzt, nicht erreichbar");
  assert.equal(hatZielfeld(targets, 2, 2), true, "c6 liegt auf der Pin-Diagonale und sollte erreichbar sein");
});
test("Wolfsfeste Fesselung stern3: gefesselter Turm b4 darf Springer e4 NICHT zurückschlagen", () => {
  const game = createPosition(WOLFSFESTE_FESSELUNG_POSITIONEN.stern3);
  const result = tryMove(game, { row: 7, col: 4 }, { row: 4, col: 4 }); // Re1xe4
  assert.equal(result.ok, true, "weißer Schlagzug Rxe4 sollte legal sein");
  assert.equal(result.isCapture, true);
  const schwarzTargets = legalTargetsFor(game, { row: 4, col: 1 }); // b4
  assert.equal(hatZielfeld(schwarzTargets, 4, 4), false, "gefesselter Turm b4 darf nicht nach e4 zurückschlagen");
});
test("Wolfsfeste Fesselung stern3: nach Rxe4 gewinnt Schwarz KEIN Material mit Rxb1 (Nutzer-Testlauf 2026-09-09)", () => {
  // Vor der Korrektur stand der weiße König auf h1 statt a1 — dieselbe Grundreihen-Schwäche
  // wie bei FESSELUNG_POSITIONS.perspektivwechselUndSchlagen und ADLERHORST_FESSELUNG_
  // POSITIONEN.stern3: Rxb1 wäre Schach UND ein ungedeckter Turmgewinn gewesen. Schlägt
  // fehl, falls dieselbe Schwäche zurückkehrt.
  const game = createPosition(WOLFSFESTE_FESSELUNG_POSITIONEN.stern3);
  const schlag = tryMove(game, { row: 7, col: 4 }, { row: 4, col: 4 }); // Re1xe4
  assert.equal(schlag.ok, true);
  assert.equal(game.inCheck(), false, "Rxe4 darf den eigenen König nicht selbst ins Schach stellen");
  const rueckschlag = tryMove(game, { row: 4, col: 1 }, { row: 7, col: 1 }); // Rxb1
  assert.equal(rueckschlag.ok, true, "Rxb1 bleibt auf der Fesselungslinie und ist legal");
  const kxb1 = legalTargetsFor(game, { row: 7, col: 0 }); // weißer König auf a1
  assert.equal(kxb1.some((t) => t.row === 7 && t.col === 1), true, "der weiße König muss den Turm auf b1 sofort zurückschlagen können (auch wenn Rxb1 harmlos Schach bietet)");
});

// ============================================================================
// WOLFSFESTE — Matt in 2 (onlyTarget-Muster wie MATT_IN_2_POSITIONEN)
// ============================================================================
const TURM_H1 = { row: 7, col: 7 };
const KOENIG_A1 = { row: 7, col: 0 };
const KOENIG_A2 = { row: 6, col: 0 };

test("Wolfsfeste MattIn2 stern1: Th1xh6 legal, König a1->a2 bleibt nach jeder schwarzen Antwort legal", () => {
  const game = createPosition(WOLFSFESTE_MATT_IN_2_POSITIONEN.stern1);
  const targets = legalTargetsFor(game, TURM_H1);
  assert.equal(hatZielfeld(targets, 2, 7), true, "h6 sollte ein legaler Schlagzug sein"); // h6 = row2,col7
  pruefeNachJederSchwarzantwort("stern1", WOLFSFESTE_MATT_IN_2_POSITIONEN.stern1, TURM_H1, { row: 2, col: 7 }, KOENIG_A1, KOENIG_A2);
});
test("Wolfsfeste MattIn2 stern2: Th1xh7 legal, König a1->a2 bleibt nach jeder schwarzen Antwort legal", () => {
  const game = createPosition(WOLFSFESTE_MATT_IN_2_POSITIONEN.stern2);
  const targets = legalTargetsFor(game, TURM_H1);
  assert.equal(hatZielfeld(targets, 1, 7), true, "h7 sollte ein legaler Schlagzug sein"); // h7 = row1,col7
  pruefeNachJederSchwarzantwort("stern2", WOLFSFESTE_MATT_IN_2_POSITIONEN.stern2, TURM_H1, { row: 1, col: 7 }, KOENIG_A1, KOENIG_A2);
});
test("Wolfsfeste MattIn2 stern3 (Zugzwang-Fassung): Th1-h4 legal, König a1->a2 bleibt nach JEDER möglichen schwarzen Antwort legal", () => {
  const game = createPosition(WOLFSFESTE_MATT_IN_2_POSITIONEN.stern3);
  const targets = legalTargetsFor(game, TURM_H1);
  assert.equal(hatZielfeld(targets, 4, 7), true, "h4 sollte ein legaler (nicht schlagender) Zug sein"); // h4 = row4,col7
  pruefeNachJederSchwarzantwort("stern3", WOLFSFESTE_MATT_IN_2_POSITIONEN.stern3, TURM_H1, { row: 4, col: 7 }, KOENIG_A1, KOENIG_A2);
});

// --- Genereller Sanity-Check ---------------------------------------------------------------

test("Alle 27 Endlosmodus-Stellungen sind gültige, ladbare FENs", () => {
  const alle = [
    ...Object.values(EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS),
    ...Object.values(EICHHOERNCHEN_FIGURENWERT_POSITIONS),
    ...Object.values(FUCHSBAU_SCHACH_POSITIONEN),
    ...Object.values(DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS),
    ...Object.values(DACHSHOEHLE_SCHACH_POSITIONEN),
    ...Object.values(DACHSHOEHLE_ROCHADE_POSITIONEN),
    ...Object.values(ADLERHORST_FESSELUNG_POSITIONEN),
    ...Object.values(WOLFSFESTE_FESSELUNG_POSITIONEN),
    ...Object.values(WOLFSFESTE_MATT_IN_2_POSITIONEN),
  ];
  assert.equal(alle.length, 27, "9 Positions-Objekte * 3 Stellungen erwartet");
  for (const fen of alle) {
    assert.doesNotThrow(() => createPosition(fen), `FEN sollte gültig sein: ${fen}`);
  }
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Endlosmodus-Puzzle-Tests grün.");
  process.exit(0);
}
