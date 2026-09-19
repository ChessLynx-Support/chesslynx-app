#!/usr/bin/env node
// Tests für die Vorführ-Logik des Bretts (src/quest1/boardDemo.ts) und für die Stellen in
// src/quest1/Board.tsx, die sie benutzen.
//
// Hintergrund (2026-09-19, animierte Motiv-Einführungen): Board.tsx bekam drei neue Props —
// `demoBleibt` (Figur bleibt auf dem Zielfeld stehen statt zurückzugleiten), `demoVon`
// (welche Figur vorgeführt wird, damit auch die Gegnerantwort ziehen kann) und `blickfangAt`
// (Ring auf der gerade benannten Figur).
//
// WICHTIGSTER TEIL DIESER DATEI ist nicht, dass die neuen Funktionen funktionieren, sondern
// der Abschnitt "Rückwärtskompatibilität": Board.tsx hängt an allen sechs Quests und jedem
// Bonuskapitel. Eine Regression dort trifft die ganze App.
//
// Wie in verify/test-endlosmodus-logic.cjs und verify/test-revier-erstlehre-logic.cjs: kein
// Jest, kein ts-node. Das reine TS-Modul wird per ts.transpileModule geladen; Board.tsx
// selbst ist eine RN-Komponente und wird nur per Textprüfung abgedeckt.
//
// Ausführen: `node verify/test-board-demo-logic.cjs` im Projektverzeichnis.

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

// ============================================================================
// Modul laden
// ============================================================================
const QUELLE = path.join(__dirname, "..", "src", "quest1", "boardDemo.ts");
const js = ts.transpileModule(fs.readFileSync(QUELLE, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  fileName: "boardDemo.ts",
}).outputText;
const mod = new Module(QUELLE, module);
mod.filename = QUELLE;
mod.paths = Module._nodeModulePaths(path.dirname(QUELLE));
mod._compile(js, QUELLE);
const {
  feldSchluessel,
  demoUrsprungFuer,
  demoIconQuelle,
  istDemoQuelleFeld,
  demoSchrittSchluessel,
  blickfangSchluessel,
} = mod.exports;

const F = (row, col) => ({ row, col });

// ============================================================================
// 1. RÜCKWÄRTSKOMPATIBILITÄT — der eigentliche Zweck dieser Datei
// ============================================================================

test("Ohne demoVon ist der Ursprung die eigene Figur (alle Alt-Aufrufstellen unverändert)", () => {
  const pieceAt = F(6, 4);
  assert.deepEqual(demoUrsprungFuer(undefined, pieceAt), pieceAt);
});

test("Ohne demoVon nimmt das Overlay weiterhin das EIGENE Figuren-Icon", () => {
  const pieceAt = F(6, 4);
  assert.equal(demoIconQuelle(pieceAt, pieceAt, F(1, 1), []), "eigen");
});

test("istDemoQuelleFeld verhält sich bei Standardwerten wie das frühere `!animatingTo`", () => {
  const pieceAt = F(6, 4);
  const k = feldSchluessel(pieceAt);
  // läuft keine Animation → Figur sichtbar (früher: !animatingTo === true)
  assert.equal(istDemoQuelleFeld(k, pieceAt, false), false);
  // läuft eine Animation → eigene Figur ausgeblendet (früher: !animatingTo === false)
  assert.equal(istDemoQuelleFeld(k, pieceAt, true), true);
  // ein anderes Feld bleibt in beiden Fällen unberührt
  assert.equal(istDemoQuelleFeld(feldSchluessel(F(0, 0)), pieceAt, true), false);
});

test("Ohne blickfangAt gibt es keine Ringe", () => {
  assert.equal(blickfangSchluessel(undefined).size, 0);
});

// ============================================================================
// 2. Die neuen Fähigkeiten
// ============================================================================

test("Mit demoVon wird von dort animiert, nicht von der eigenen Figur", () => {
  const pieceAt = F(6, 4);
  const koenig = F(0, 6);
  assert.deepEqual(demoUrsprungFuer(koenig, pieceAt), koenig);
});

test("Das Overlay nimmt das Icon der Figur, die wirklich auf dem Ausgangsfeld steht", () => {
  const pieceAt = F(6, 4);
  const gegner = F(0, 6);
  const zusatz = [F(3, 3), F(4, 4)];
  assert.equal(demoIconQuelle(pieceAt, pieceAt, gegner, zusatz), "eigen");
  assert.equal(demoIconQuelle(gegner, pieceAt, gegner, zusatz), "gegner");
  assert.equal(demoIconQuelle(F(4, 4), pieceAt, gegner, zusatz), "zusatz");
  assert.equal(demoIconQuelle(F(7, 7), pieceAt, gegner, zusatz), "keins");
});

test("Bei laufender Animation wird die Figur auf dem ANIMIERTEN Feld ausgeblendet, nicht die eigene", () => {
  const pieceAt = F(6, 4);
  const koenig = F(0, 6);
  // Es zieht der gegnerische König: dessen Feld wird ausgeblendet …
  assert.equal(istDemoQuelleFeld(feldSchluessel(koenig), koenig, true), true);
  // … die eigene Figur bleibt sichtbar (sie steht ja weiterhin auf dem Brett).
  assert.equal(istDemoQuelleFeld(feldSchluessel(pieceAt), koenig, true), false);
});

test("Blickfang nimmt Einzelfeld und Array entgegen (wie blockerAt)", () => {
  assert.deepEqual([...blickfangSchluessel(F(2, 2))], ["2-2"]);
  assert.deepEqual([...blickfangSchluessel([F(2, 2), F(5, 1)])].sort(), ["2-2", "5-1"]);
});

// ============================================================================
// 3. Der Schrittschlüssel — hier steckte ein echter Fallstrick
// ============================================================================

test("Derselbe Zug wird nicht zweimal ausgelöst", () => {
  assert.equal(demoSchrittSchluessel(F(6, 4), F(4, 4)), demoSchrittSchluessel(F(6, 4), F(4, 4)));
});

test("Zwei Schritte auf DASSELBE Zielfeld sind verschiedene Schritte", () => {
  // Genau der Fall aus der Gabel-Einführung: Der König weicht nach h8, danach schlägt der
  // Springer die Dame — in anderen Folgen zieht die eigene Figur auf ein Feld, das der
  // Gegner gerade verlassen hat. Enthielte der Schlüssel nur das Zielfeld, würde der zweite
  // Schritt als "schon gelaufen" gelten und stillschweigend ausfallen.
  const ziel = F(3, 3);
  assert.notEqual(demoSchrittSchluessel(F(6, 4), ziel), demoSchrittSchluessel(F(0, 6), ziel));
});

// ============================================================================
// 4. Board.tsx selbst — Textprüfung (RN-Komponente, nicht ladbar)
// ============================================================================
const boardSrc = fs.readFileSync(path.join(__dirname, "..", "src", "quest1", "Board.tsx"), "utf8");

test("Board.tsx nimmt die drei neuen Props entgegen", () => {
  for (const prop of ["demoBleibt?: boolean", "demoVon?: BoardSquare"]) {
    assert.ok(boardSrc.includes(prop), `Typ "${prop}" fehlt`);
  }
  assert.ok(/blickfangAt\?: BoardSquare \| BoardSquare\[\]/.test(boardSrc), "blickfangAt fehlt in BoardConfig");
});

test("Die Rückgleit-Stufe hängt an demoBleibt", () => {
  // Die dritte Animationsstufe (zurück auf {x:0,y:0}) darf nur laufen, wenn demoBleibt NICHT
  // gesetzt ist — sonst bliebe die Figur nie stehen.
  assert.ok(
    /if \(!demoBleibt\)\s*\{[\s\S]*?toValue: \{ x: 0, y: 0 \}/.test(boardSrc),
    "Rückgleit-Stufe steht nicht in einem `if (!demoBleibt)`-Block"
  );
});

test("Das bewegliche Overlay benutzt Ursprung und Icon der vorgeführten Figur", () => {
  assert.ok(boardSrc.includes("left: demoUrsprung.col * cellSize"), "Overlay hängt noch an pieceAt");
  assert.ok(boardSrc.includes("{demoIcon ?? <View style={styles.pieceDot} />}"), "Overlay zeigt noch pieceIcon");
});

test("Alle drei Figuren-Renderzweige blenden die Vorführ-Quelle aus", () => {
  // eigene Figur (zwei Zweige: Sockel und Icon), Gegner, Zusatzfiguren
  const treffer = boardSrc.match(/!istDemoQuelle\(k\)/g) ?? [];
  assert.ok(treffer.length >= 4, `nur ${treffer.length} von mindestens 4 Renderzweigen abgedeckt`);
});

test("Der Blickfang-Ring wird gerendert", () => {
  assert.ok(boardSrc.includes("blickfangKeys.has(k)"), "Ring wird nirgends gerendert");
  assert.ok(boardSrc.includes("<BlickfangRing size={cellSize} />"), "BlickfangRing fehlt");
});

test("Board.tsx führt den Zug NICHT selbst aus (es bleibt ohne eigenen Stellungszustand)", () => {
  // Der ganze Ansatz hängt daran: Die Zugfolge ist Elternlogik. Fände sich hier ein eigener
  // Stellungszustand, wäre der Vertrag aus dem demoBleibt-Kommentar gebrochen.
  assert.ok(!/useState[^\n]*\bfen\b/i.test(boardSrc), "Board.tsx scheint eine eigene Stellung zu halten");
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
}
console.log("Alle Board-Vorführ-Tests grün.");
process.exit(0);
