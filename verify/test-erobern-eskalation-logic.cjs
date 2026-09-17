#!/usr/bin/env node
// Unit-Tests für die Erobern-Schwierigkeitseskalation (Christian, 2026-09-16 spät abends:
// "10x Stufe eins ..., 8x Stufe zwei, 5x Stufe drei", siehe claude/taktik_
// schwierigkeitseskalation_konzept_2026-09-16.md und claude/erobern_kuration_2026-09-17.md).
//
// Zwei getrennte Dinge werden hier geprüft, nach demselben "kein Jest, kein ts-node"-Muster
// wie verify/test-endlosmodus-logic.cjs (siehe dortiger Kopfkommentar):
//
//   1. Alle 46 kuratierten Erobern-Stellungen (23 Eichhörnchen-Lichtung + 23 Dachshöhle) sind
//      bereits vor dem Eintrag in endlosmodusAufgaben.tsx mit python-chess einzeln verifiziert
//      worden (Rejection-Sampling, siehe Methodik-Abschnitt der Kuration) — dieser Testlauf
//      hier, gegen das echte, installierte chess.js, ist wie bei den übrigen Endlosmodus-
//      Stellungen der maßgebliche Beweis. Die Rohdaten unten sind bewusst eine EIGENE, aus
//      derselben Quelle exportierte Kopie (nicht aus der .tsx-Datei importiert), weil
//      endlosmodusAufgaben.tsx JSX enthält und dieses Testskript (wie die übrigen
//      verify/*.cjs) bewusst ohne JSX-Transform/React auskommt.
//   2. Die reine Stufen-/Sterne-Logik in lib/endlosmodusStufen.ts (Sterne aus Fortschritt,
//      nächste offene Aufgabe, Stufe+Position aus Index) — dieses Modul ist bewusst OHNE
//      AsyncStorage-Import (siehe dortiger Kopfkommentar), lässt sich deshalb genau wie
//      chessEngine.ts direkt laden und testen.
//
// Ausführen: `node verify/test-erobern-eskalation-logic.cjs` im Projektverzeichnis (nach
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
      "Projektverzeichnis ausführen und dieses Skript erneut starten."
  );
  process.exit(1);
}

function ladeTsModul(relPfad) {
  const abs = path.join(__dirname, "..", relPfad);
  const quelle = fs.readFileSync(abs, "utf8");
  const { outputText } = ts.transpileModule(quelle, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
    fileName: abs,
  });
  const m = new Module(abs, module);
  m.filename = abs;
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  m._compile(outputText, abs);
  return m.exports;
}

let chessEngine, endlosmodusStufen;
try {
  chessEngine = ladeTsModul("src/lib/chessEngine.ts");
  endlosmodusStufen = ladeTsModul("src/lib/endlosmodusStufen.ts");
} catch (err) {
  console.error("Konnte ein Modul nicht laden (chess.js fehlt vermutlich noch). Bitte einmalig " +
    "`npm install` im Projektverzeichnis ausführen und erneut starten.\n");
  console.error(err.message);
  process.exit(1);
}

const { createPosition, legalTargetsFor, tryMove, fromAlgebraic } = chessEngine;
const {
  STANDARD_STUFEN,
  EROBERN_ESKALATIONS_STUFEN,
  gesamtAnzahlAufgaben,
  sterneAusFortschritt,
  naechsteOffeneAufgabe,
  stufeUndPositionFuerIndex,
} = endlosmodusStufen;

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

function hatZielfeld(targets, sq) {
  const ziel = fromAlgebraic(sq);
  return targets.some((t) => t.row === ziel.row && t.col === ziel.col);
}

// ============================================================================
// Teil 1: die 46 kuratierten Erobern-Stellungen (siehe Kopfkommentar)
// ============================================================================

const EICHHOERNCHEN_EROBERN_TESTDATEN = [
  { fen: "8/1k6/8/8/4nR2/8/8/1K6 w - - 0 1", attackerSq: "f4", targetSq: "e4", decoySq: null },
  { fen: "6k1/5p2/8/8/2B5/3n4/5P2/7K w - - 0 1", attackerSq: "c4", targetSq: "d3", decoySq: null },
  { fen: "1k6/2p4p/8/3n4/5N2/8/K1P3P1/8 w - - 0 1", attackerSq: "f4", targetSq: "d5", decoySq: null },
  { fen: "7k/ppp5/8/8/5Q2/4n3/P1PP4/6K1 w - - 0 1", attackerSq: "f4", targetSq: "e3", decoySq: null },
  { fen: "1k6/p3ppp1/8/8/2R5/7K/P2PPP2/2n5 w - - 0 1", attackerSq: "c4", targetSq: "c1", decoySq: null },
  { fen: "8/1n1ppppk/2B5/8/8/8/K2PPPP1/8 w - - 0 1", attackerSq: "c6", targetSq: "b7", decoySq: null },
  { fen: "1k6/3pppp1/8/n7/2N5/8/3PPPPK/8 w - - 0 1", attackerSq: "c4", targetSq: "a5", decoySq: null },
  { fen: "7k/p2pp1p1/8/8/2Q2n2/8/P2PP1P1/1K6 w - - 0 1", attackerSq: "c4", targetSq: "f4", decoySq: null },
  { fen: "6k1/pp1ppp1p/8/8/2n5/2R5/PP1PPP1P/6K1 w - - 0 1", attackerSq: "c3", targetSq: "c4", decoySq: null },
  { fen: "7k/p3ppp1/8/3B4/2n5/8/P3PPP1/1K6 w - - 0 1", attackerSq: "d5", targetSq: "c4", decoySq: null },
  { fen: "8/1k2p1p1/8/8/2nR4/r2r4/6PP/1K6 w - - 0 1", attackerSq: "d4", targetSq: "c4", decoySq: "d3" },
  { fen: "8/1k1p1pp1/2n5/1b6/4B3/8/P4PPK/1n6 w - - 0 1", attackerSq: "e4", targetSq: "b1", decoySq: "c6" },
  { fen: "1k6/p1p4p/4n3/8/3n4/5N2/P1P4P/1K4n1 w - - 0 1", attackerSq: "f3", targetSq: "g1", decoySq: "d4" },
  { fen: "4b3/pppp2pk/8/4Qn2/8/7K/PPPPr1P1/8 w - - 0 1", attackerSq: "e5", targetSq: "f5", decoySq: "e8" },
  { fen: "k4n2/1pp3p1/8/8/8/3b1R1K/1PP3P1/4n3 w - - 0 1", attackerSq: "f3", targetSq: "f8", decoySq: "d3" },
  { fen: "8/kp1p1pp1/8/b3B3/8/2r5/1P1P1PPn/K7 w - - 0 1", attackerSq: "e5", targetSq: "h2", decoySq: "c3" },
  { fen: "8/pkppn3/8/5N1n/8/6nK/P1PP4/8 w - - 0 1", attackerSq: "f5", targetSq: "e7", decoySq: "g3" },
  { fen: "k2b4/4ppp1/8/b7/8/2Q5/1n2PPPK/8 w - - 0 1", attackerSq: "c3", targetSq: "b2", decoySq: "a5" },
  { fen: "6k1/p1pnpp2/7p/3R2q1/8/8/PKP1PP2/8 w - - 0 1", attackerSq: "d5", targetSq: "d7", decoySq: "g5" },
  { fen: "7k/1p3p2/8/3n4/2B5/6n1/KP2qP2/8 w - - 0 1", attackerSq: "c4", targetSq: "d5", decoySq: "e2" },
  { fen: "8/1p2p1kp/2r5/3N4/5n2/2q5/1P2P2P/K7 w - - 0 1", attackerSq: "d5", targetSq: "f4", decoySq: "c3" },
  { fen: "1k6/p1p1p3/5Qn1/8/8/8/P1PnP2K/5q2 w - - 0 1", attackerSq: "f6", targetSq: "g6", decoySq: "f1" },
  { fen: "8/ppp1pr1k/8/5q2/3n1R2/8/PPP1P3/6K1 w - - 0 1", attackerSq: "f4", targetSq: "d4", decoySq: "f5" },
];

const DACHSHOEHLE_EROBERN_TESTDATEN = [
  { fen: "1k6/8/2R2n2/8/8/8/8/K7 w - - 0 1", attackerSq: "c6", targetSq: "f6", decoySq: null },
  { fen: "1k6/7p/2n5/8/8/5B2/P7/6K1 w - - 0 1", attackerSq: "f3", targetSq: "c6", decoySq: null },
  { fen: "7k/1pp5/8/5n2/3N4/7K/4P1P1/8 w - - 0 1", attackerSq: "d4", targetSq: "f5", decoySq: null },
  { fen: "8/1kp2pnp/8/8/3Q4/8/K1P1PP2/8 w - - 0 1", attackerSq: "d4", targetSq: "g7", decoySq: null },
  { fen: "1k2n3/2p2ppp/8/4R3/8/K7/2P2PPP/8 w - - 0 1", attackerSq: "e5", targetSq: "e8", decoySq: null },
  { fen: "k7/3ppp1p/8/8/8/2B5/1n2PPPP/1K6 w - - 0 1", attackerSq: "c3", targetSq: "b2", decoySq: null },
  { fen: "8/kpp1p1p1/8/3N4/5n2/8/1PP1P1PK/8 w - - 0 1", attackerSq: "d5", targetSq: "f4", decoySq: null },
  { fen: "1k6/3ppppp/8/8/2Q5/2n5/3PPPPP/K7 w - - 0 1", attackerSq: "c4", targetSq: "c3", decoySq: null },
  { fen: "1k6/p2pppp1/8/8/2R5/8/P1nPPPPK/8 w - - 0 1", attackerSq: "c4", targetSq: "c2", decoySq: null },
  { fen: "k7/1pppp2p/8/8/6n1/5B2/1PPPP2P/6K1 w - - 0 1", attackerSq: "f3", targetSq: "g4", decoySq: null },
  { fen: "8/k3b1pp/2Rb4/8/8/8/1K3P1P/2n5 w - - 0 1", attackerSq: "c6", targetSq: "c1", decoySq: "d6" },
  { fen: "1k6/p1p4p/8/3r1b2/4B3/8/PKP3nP/8 w - - 0 1", attackerSq: "e4", targetSq: "g2", decoySq: "f5" },
  { fen: "8/p4pk1/8/4b3/2N5/7K/Pb1n1P2/8 w - - 0 1", attackerSq: "c4", targetSq: "d2", decoySq: "e5" },
  { fen: "6k1/ppppp3/7n/5n2/5Q2/8/PPPPPn2/6K1 w - - 0 1", attackerSq: "f4", targetSq: "f2", decoySq: "h6" },
  { fen: "5r1k/1ppp2p1/8/4n3/4Rn2/K7/1PPP2P1/8 w - - 0 1", attackerSq: "e4", targetSq: "e5", decoySq: "f4" },
  { fen: "1k6/2p2p1p/8/4B1r1/3n4/K5b1/2P2P1P/8 w - - 0 1", attackerSq: "e5", targetSq: "d4", decoySq: "g3" },
  { fen: "1r5k/3pppp1/2N5/n7/1n6/7K/3PPPP1/8 w - - 0 1", attackerSq: "c6", targetSq: "a5", decoySq: "b4" },
  { fen: "8/pkp1p2p/8/3n1Qb1/8/5n2/P1P1P1KP/8 w - - 0 1", attackerSq: "f5", targetSq: "d5", decoySq: "g5" },
  { fen: "8/pkp1p2p/8/3b4/1n3R2/5q2/P1P1P2P/6K1 w - - 0 1", attackerSq: "f4", targetSq: "b4", decoySq: "f3" },
  { fen: "8/pnpp3k/6b1/5q2/4B3/8/PKPP4/8 w - - 0 1", attackerSq: "e4", targetSq: "b7", decoySq: "f5" },
  { fen: "8/p1p2pkp/8/4N3/1n4n1/3q4/P1P2P1P/1K6 w - - 0 1", attackerSq: "e5", targetSq: "g4", decoySq: "d3" },
  { fen: "1k6/3p1ppp/8/4n3/4b3/2Q5/2qP1PPP/K7 w - - 0 1", attackerSq: "c3", targetSq: "e5", decoySq: "c2" },
  { fen: "6k1/pppp4/8/5R1n/4rq2/8/PPPP4/6K1 w - - 0 1", attackerSq: "f5", targetSq: "h5", decoySq: "f4" },
];

function pruefeSpalte(spaltenName, eintraege) {
  assert.equal(eintraege.length, 23, `${spaltenName}: sollten genau 23 Aufgaben sein`);
  eintraege.forEach((e, i) => {
    test(`${spaltenName} #${i + 1}: gültige Stellung, kein Schach, Angreifer erreicht Zielfeld`, () => {
      const game = createPosition(e.fen);
      assert.equal(game.inCheck(), false, "Stellung darf nicht im Schach stehen");
      const angreiferFeld = fromAlgebraic(e.attackerSq);
      const targets = legalTargetsFor(game, angreiferFeld);
      assert.equal(hatZielfeld(targets, e.targetSq), true, `Zielfeld ${e.targetSq} sollte erreichbar sein`);
    });

    test(`${spaltenName} #${i + 1}: Zielfeld ${e.targetSq} ist nach dem Schlagen ungedeckt`, () => {
      const game = createPosition(e.fen);
      const angreiferFeld = fromAlgebraic(e.attackerSq);
      const zielFeld = fromAlgebraic(e.targetSq);
      const ergebnis = tryMove(game, angreiferFeld, zielFeld);
      assert.equal(ergebnis.ok, true, "Zug zum Zielfeld sollte legal sein");
      assert.equal(ergebnis.isCapture, true, "Zug zum Zielfeld sollte ein Schlagzug sein");
      const rueckschlaege = game.moves({ verbose: true }).filter((m) => m.to === e.targetSq);
      assert.equal(rueckschlaege.length, 0, `${e.targetSq} sollte nach dem Schlagen NICHT zurückschlagbar sein`);
    });

    if (e.decoySq) {
      test(`${spaltenName} #${i + 1}: Köder ${e.decoySq} ist erreichbar, aber gedeckt`, () => {
        const game = createPosition(e.fen);
        const angreiferFeld = fromAlgebraic(e.attackerSq);
        const targets = legalTargetsFor(game, angreiferFeld);
        assert.equal(hatZielfeld(targets, e.decoySq), true, `Köderfeld ${e.decoySq} sollte erreichbar sein`);
        const koederFeld = fromAlgebraic(e.decoySq);
        const ergebnis = tryMove(game, angreiferFeld, koederFeld);
        assert.equal(ergebnis.ok, true, "Zug zum Köderfeld sollte legal sein");
        const rueckschlaege = game.moves({ verbose: true }).filter((m) => m.to === e.decoySq);
        assert.ok(rueckschlaege.length > 0, `${e.decoySq} sollte nach dem Schlagen zurückschlagbar sein (Köder)`);
      });
    }
  });
}

pruefeSpalte("Eichhörnchen-Lichtung Erobern", EICHHOERNCHEN_EROBERN_TESTDATEN);
pruefeSpalte("Dachshöhle Erobern", DACHSHOEHLE_EROBERN_TESTDATEN);

// ============================================================================
// Teil 2: reine Stufen-/Sterne-Logik (lib/endlosmodusStufen.ts)
// ============================================================================

test("STANDARD_STUFEN/EROBERN_ESKALATIONS_STUFEN summieren sich korrekt", () => {
  assert.equal(gesamtAnzahlAufgaben(STANDARD_STUFEN), 3);
  assert.equal(gesamtAnzahlAufgaben(EROBERN_ESKALATIONS_STUFEN), 23);
});

test("sterneAusFortschritt: 0 Sterne, solange Stufe 1 nicht komplett ist", () => {
  const geloest = new Array(23).fill(false);
  geloest[0] = true;
  geloest[5] = true; // 2 von 10 Stufe-1-Aufgaben, Reihenfolge irrelevant
  assert.equal(sterneAusFortschritt(geloest, EROBERN_ESKALATIONS_STUFEN), 0);
});

test("sterneAusFortschritt: 1 Stern, sobald alle 10 Stufe-1-Aufgaben gelöst sind (beliebige Reihenfolge)", () => {
  const geloest = new Array(23).fill(false);
  for (let i = 0; i < 10; i++) geloest[i] = true;
  assert.equal(sterneAusFortschritt(geloest, EROBERN_ESKALATIONS_STUFEN), 1);
});

test("sterneAusFortschritt: 2 Sterne, sobald zusätzlich alle 8 Stufe-2-Aufgaben gelöst sind", () => {
  const geloest = new Array(23).fill(false);
  for (let i = 0; i < 18; i++) geloest[i] = true;
  assert.equal(sterneAusFortschritt(geloest, EROBERN_ESKALATIONS_STUFEN), 2);
});

test("sterneAusFortschritt: 3 Sterne, sobald alle 23 Aufgaben gelöst sind", () => {
  const geloest = new Array(23).fill(true);
  assert.equal(sterneAusFortschritt(geloest, EROBERN_ESKALATIONS_STUFEN), 3);
});

test("sterneAusFortschritt: Stufe 2 komplett ohne Stufe 1 zählt NICHT als Stern (Stufen sind gestaffelt)", () => {
  const geloest = new Array(23).fill(false);
  for (let i = 10; i < 18; i++) geloest[i] = true; // alle Stufe-2-Aufgaben, aber Stufe 1 fehlt
  assert.equal(sterneAusFortschritt(geloest, EROBERN_ESKALATIONS_STUFEN), 0);
});

test("sterneAusFortschritt: STANDARD_STUFEN verhält sich wie die alten Drei-Sterne-Spalten (ein Stern pro Aufgabe)", () => {
  assert.equal(sterneAusFortschritt([true, false, false], STANDARD_STUFEN), 1);
  assert.equal(sterneAusFortschritt([true, true, false], STANDARD_STUFEN), 2);
  assert.equal(sterneAusFortschritt([true, true, true], STANDARD_STUFEN), 3);
});

test("naechsteOffeneAufgabe: findet die erste ungelöste Aufgabe, nicht die am weitesten fortgeschrittene", () => {
  const geloest = new Array(23).fill(false);
  geloest[0] = true;
  geloest[1] = true;
  geloest[5] = true; // vorgezogen gelöst, aber 2 ist trotzdem die nächste offene
  assert.equal(naechsteOffeneAufgabe(geloest, 23), 2);
});

test("naechsteOffeneAufgabe: liefert die Gesamtanzahl, wenn alles gelöst ist", () => {
  const geloest = new Array(23).fill(true);
  assert.equal(naechsteOffeneAufgabe(geloest, 23), 23);
});

test("naechsteOffeneAufgabe: liefert 0 bei leerem Fortschritt", () => {
  assert.equal(naechsteOffeneAufgabe([], 23), 0);
});

test("stufeUndPositionFuerIndex: ordnet Indizes korrekt den drei Stufen zu", () => {
  assert.deepEqual(stufeUndPositionFuerIndex(0, EROBERN_ESKALATIONS_STUFEN), { stufe: 1, positionInStufe: 1, groesseStufe: 10 });
  assert.deepEqual(stufeUndPositionFuerIndex(9, EROBERN_ESKALATIONS_STUFEN), { stufe: 1, positionInStufe: 10, groesseStufe: 10 });
  assert.deepEqual(stufeUndPositionFuerIndex(10, EROBERN_ESKALATIONS_STUFEN), { stufe: 2, positionInStufe: 1, groesseStufe: 8 });
  assert.deepEqual(stufeUndPositionFuerIndex(17, EROBERN_ESKALATIONS_STUFEN), { stufe: 2, positionInStufe: 8, groesseStufe: 8 });
  assert.deepEqual(stufeUndPositionFuerIndex(18, EROBERN_ESKALATIONS_STUFEN), { stufe: 3, positionInStufe: 1, groesseStufe: 5 });
  assert.deepEqual(stufeUndPositionFuerIndex(22, EROBERN_ESKALATIONS_STUFEN), { stufe: 3, positionInStufe: 5, groesseStufe: 5 });
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Erobern-Eskalations-Tests grün.");
  process.exit(0);
}
