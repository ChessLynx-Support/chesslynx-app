#!/usr/bin/env node
// Diagnose-Skript (2026-09-09, Nutzer-Feedback: "Turm: Mögliche Züge sind teilweise nach
// rechts eingeschränkt und bleibt hängen bei der Eichel") — KEIN Teil der regulären
// Test-Suite (nicht in package.json "test" eingebunden), sondern ein Einmal-Werkzeug, um
// die Übungsphase von Quest2.tsx Screen 2 (Turm/Bär) exakt so nachzuvollziehen, wie
// QuestMoveScreen.tsx sie tatsächlich durchläuft — inklusive `mitWeissAmZug`-Patch nach
// jedem Zug — gegen das echte, installierte chess.js. Reine Beobachtung, verändert nichts.
//
// Grund für dieses Skript statt eines direkten Fixes: die zugrunde liegende Stellung
// (QUEST2_POSITIONS.screen2 — nur Turm a1, eigener König e1, gegnerischer König e8, sonst
// leeres Brett) lässt sich beim bloßen Lesen des Codes nicht eindeutig als fehlerhaft
// erkennen; die Reihenfolge, in der chess.js legale Züge für einen Turm zurückgibt (die den
// "Eichel"-Vorschlag bestimmt, siehe QuestMoveScreen.tsx/vorschlagZiel), ist eine reine
// Bibliotheks-Implementierungsdetail. Nach der Adlerhorst-Erfahrung (2026-09-09, "vor Ort
// verifizieren statt am Schreibtisch raten") lieber einmal konkret nachsehen, was tatsächlich
// passiert, bevor irgendetwas geändert wird.
//
// Ausführen: `node verify/debug-quest2-turm.cjs` im Projektverzeichnis (nach `npm install`).
// Bitte die komplette Ausgabe zurückmelden.

const fs = require("fs");
const path = require("path");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("Konnte 'typescript' nicht laden — bitte `npm install` ausführen.");
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
m._compile(outputText, SRC);
const { createPosition, legalTargetsFor, tryMove, toAlgebraic, QUEST2_POSITIONS } = m.exports;

// --- Exakte Nachbildung von QuestMoveScreen.tsx/mitWeissAmZug ------------------------------
function mitWeissAmZug(fen) {
  const teile = fen.split(" ");
  teile[1] = "w";
  return teile.join(" ");
}

function zeige(targets) {
  return targets.map(toAlgebraic).sort().join(", ");
}

console.log("=== Quest 2, Screen 2 (Turm) — Übungsphasen-Simulation ===");
console.log("Start-FEN:", QUEST2_POSITIONS.screen2);
console.log();

let game = createPosition(QUEST2_POSITIONS.screen2);
let ort = { row: 7, col: 0 }; // a1, siehe Quest2.tsx PIECE_AT
const UEBUNGSRUNDEN = 5;

let targets = legalTargetsFor(game, ort);
console.log(`Runde 0 (Ausgangsstellung, VOR dem ersten eigenen Zug):`);
console.log(`  Turm auf ${toAlgebraic(ort)}`);
console.log(`  Alle legalen Zielfelder (${targets.length}): ${zeige(targets)}`);
console.log(`  "Eichel"-Vorschlag (legalTargets[0], erstes Element OHNE Sortierung): ${targets[0] ? toAlgebraic(targets[0]) : "(keins!)"}`);
console.log();

// Simuliert den bestmöglichen/typischsten Fall: das Kind tippt jede Runde genau auf den
// vorgeschlagenen Eichel-Platz (legalTargets[0]) — falls sich HIER schon ein Muster wie
// "wandert immer weiter nach rechts, bis irgendwann 0 Zielfelder übrig sind" zeigt, ist das
// der gesuchte Bug.
for (let runde = 1; runde <= 1 + UEBUNGSRUNDEN; runde++) {
  if (targets.length === 0) {
    console.log(`Runde ${runde}: KEINE legalen Zielfelder mehr übrig — hier bliebe das Spiel hängen!`);
    break;
  }
  const ziel = targets[0]; // "folgt der Eichel"
  const ergebnis = tryMove(game, ort, ziel);
  console.log(`Runde ${runde}: Zug ${toAlgebraic(ort)} -> ${toAlgebraic(ziel)} (Eichel-Vorschlag) — ok=${ergebnis.ok}`);
  if (!ergebnis.ok) {
    console.log("  ABBRUCH: tryMove hat den vorgeschlagenen Zug abgelehnt — das wäre der Bug.");
    break;
  }
  game = createPosition(mitWeissAmZug(ergebnis.fenAfter));
  ort = ziel;
  targets = legalTargetsFor(game, ort);
  console.log(`  Neue Stellung: Turm auf ${toAlgebraic(ort)}`);
  console.log(`  Alle legalen Zielfelder (${targets.length}): ${zeige(targets)}`);
  console.log(`  Nächster Eichel-Vorschlag: ${targets[0] ? toAlgebraic(targets[0]) : "(keins!)"}`);
  console.log();
}

console.log("=== Ende der Simulation ===");
