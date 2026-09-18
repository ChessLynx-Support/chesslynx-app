#!/usr/bin/env node
// Struktur-Tests für die Bonuskapitel→Gefährtensaga-Neuordnung (2026-09-17, siehe Claude-
// Projekt "ChessLynx", claude/schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md und claude/
// erobern_screen_reviere_ruhmeshalle_befund_2026-09-17.md) — analog zum bereits bestehenden
// Muster in verify/test-endlosmodus-logic.cjs (kein Jest, kein ts-node, siehe dortiger
// Kommentar).
//
// Geprüft wird:
//   1. src/lib/revierErstlehre.ts: REVIER_ERSTLEHRE/erstlehreFuerRevier — reine
//      Datenstruktur, keine Laufzeit-Abhängigkeiten (nur ein `import type`, siehe dortiger
//      Kopfkommentar), deshalb hier direkt geladen und ausgeführt.
//   2. src/lib/gate.ts: NICHT direkt geladen (zieht über storage.ts Firebase/AsyncStorage
//      nach sich, siehe dortiger Kopfkommentar — ein voller Mock-Aufbau dafür wäre für eine
//      reine Struktur-Prüfung unverhältnismäßig, siehe verify/test-konto-datenschutz.cjs für
//      das aufwendigere Vorbild, falls das je nötig wird). Stattdessen ein Text-Check auf den
//      Quellcode: die neuen Namen (`pruefeGefaehrtenErreichtStatus`, `GefaehrtenErreichtStatus`)
//      müssen exportiert sein, die alten, gate-pflichtigen Bonuskapitel-Namen dürfen nicht
//      mehr vorkommen.
//
// Ausführen: `node verify/test-revier-erstlehre-logic.cjs` im Projektverzeichnis (nach `npm
// install`). Exit-Code 0 = alle Tests grün, 1 = mindestens ein Fehler.

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
// 1. src/lib/revierErstlehre.ts — direkt geladen (nur ein `import type`, kein
//    Laufzeit-Import, siehe Datei-Kopfkommentar).
// ============================================================================
const REVIER_ERSTLEHRE_SRC = path.join(__dirname, "..", "src", "lib", "revierErstlehre.ts");
const revierErstlehreSource = fs.readFileSync(REVIER_ERSTLEHRE_SRC, "utf8");
const { outputText: revierErstlehreJs } = ts.transpileModule(revierErstlehreSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
  fileName: "revierErstlehre.ts",
});
const revierErstlehreModule = new Module(REVIER_ERSTLEHRE_SRC, module);
revierErstlehreModule.filename = REVIER_ERSTLEHRE_SRC;
revierErstlehreModule.paths = Module._nodeModulePaths(path.dirname(REVIER_ERSTLEHRE_SRC));
revierErstlehreModule._compile(revierErstlehreJs, REVIER_ERSTLEHRE_SRC);
const { REVIER_ERSTLEHRE, erstlehreFuerRevier } = revierErstlehreModule.exports;

const ERWARTETE_ZUORDNUNG = {
  eichhoernchen: { kapitelId: "figurenwert", route: "Figurenwert" },
  dachs: { kapitelId: "rochade", route: "Rochade" },
  adlerin: { kapitelId: "fesselung", route: "Fesselung" },
  wolf: { kapitelId: "mattIn2", route: "MattIn2" },
};

test("REVIER_ERSTLEHRE enthält genau die vier erwarteten Gefährten-Schlüssel", () => {
  assert.deepEqual(
    Object.keys(REVIER_ERSTLEHRE).sort(),
    Object.keys(ERWARTETE_ZUORDNUNG).sort(),
    "erwartet: eichhoernchen, dachs, adlerin, wolf — nicht rabe/wisent"
  );
});

for (const [gefaehrteId, erwartet] of Object.entries(ERWARTETE_ZUORDNUNG)) {
  test(`REVIER_ERSTLEHRE.${gefaehrteId} verweist auf ${erwartet.route} (kapitelId "${erwartet.kapitelId}")`, () => {
    const eintrag = REVIER_ERSTLEHRE[gefaehrteId];
    assert.notEqual(eintrag, undefined, `sollte einen Eintrag für ${gefaehrteId} haben`);
    assert.equal(eintrag.kapitelId, erwartet.kapitelId);
    assert.equal(eintrag.route, erwartet.route);
    assert.equal(typeof eintrag.titel, "string", "titel sollte ein nicht-leerer Anzeigetext sein");
    assert.ok(eintrag.titel.length > 0);
  });
}

test("erstlehreFuerRevier(...) liefert für rabe/wisent bewusst undefined (kein Erstlehre-Kapitel)", () => {
  assert.equal(erstlehreFuerRevier("rabe"), undefined);
  assert.equal(erstlehreFuerRevier("wisent"), undefined);
});

test("erstlehreFuerRevier(...) liefert für die vier Erstlehre-Reviere denselben Eintrag wie REVIER_ERSTLEHRE", () => {
  for (const gefaehrteId of Object.keys(ERWARTETE_ZUORDNUNG)) {
    assert.deepEqual(erstlehreFuerRevier(gefaehrteId), REVIER_ERSTLEHRE[gefaehrteId]);
  }
});

test("Die vier kapitelId-Werte sind eine Teilmenge der bestehenden BonusKapitelId-Literale in storage.ts", () => {
  // storage.ts exportiert `BonusKapitelId` selbst nicht (siehe revierErstlehre.ts-
  // Kopfkommentar), deshalb hier ein Text-Check gegen die Feld-Initialisierung von
  // `bonusFortschritt` in storage.ts (`neuesKindProfil`/vergleichbare Stelle) statt eines
  // Typvergleichs zur Compile-Zeit.
  const storageSrc = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "storage.ts"), "utf8");
  for (const { kapitelId } of Object.values(ERWARTETE_ZUORDNUNG)) {
    assert.ok(
      new RegExp(`\\b${kapitelId}\\s*:\\s*false\\b`).test(storageSrc),
      `storage.ts sollte "${kapitelId}: false" als bonusFortschritt-Startwert enthalten`
    );
  }
});

// ============================================================================
// 2. src/lib/gate.ts — Text-Check (siehe Datei-Kopfkommentar oben, warum kein Laden).
// ============================================================================
const gateSource = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "gate.ts"), "utf8");

test("gate.ts exportiert die neuen Namen pruefeGefaehrtenErreichtStatus/GefaehrtenErreichtStatus", () => {
  assert.ok(/export\s+(async\s+)?function\s+pruefeGefaehrtenErreichtStatus\b/.test(gateSource));
  assert.ok(/export\s+type\s+GefaehrtenErreichtStatus\b/.test(gateSource));
});

test("gate.ts liest weiterhin alle sechs Basisquests aus loadQuestFortschrittLocal", () => {
  for (const questId of ["quest1", "quest2", "quest3", "quest4", "quest5", "quest6"]) {
    assert.ok(gateSource.includes(`"${questId}"`), `sollte "${questId}" enthalten`);
  }
  assert.ok(gateSource.includes("loadQuestFortschrittLocal"));
});

test("gate.ts enthält keine der alten, gate-pflichtigen Bonuskapitel-Namen mehr", () => {
  for (const alterName of [
    "pruefeSchlosstorStatus",
    "SchlosstorStatus",
    "GATE_PFLICHTIGE_BONUSKAPITEL",
    "BONUSKAPITEL_ROUTEN",
    "bonuskapitelStatus",
    "naechstesBonuskapitel",
  ]) {
    assert.ok(!gateSource.includes(alterName), `"${alterName}" sollte nicht mehr in gate.ts vorkommen`);
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
  console.log("Alle Erstlehre/Gate-Struktur-Tests grün.");
  process.exit(0);
}
