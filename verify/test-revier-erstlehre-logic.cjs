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
const { REVIER_ERSTLEHRE, erstlehreFuerRevier, naechsteOffeneErstlehre } =
  revierErstlehreModule.exports;

// ── Nachtrag 2026-09-19 (Umbau auf Erstlehre-KETTEN) ───────────────────────────────────────
// Zwei Änderungen machten diesen Abschnitt nötig:
//   1. Die Fesselung-Erstlehre ist am Vormittag des 19.09. von adlerin zu rabe gewandert
//      (siehe revierErstlehre.ts-Kopfkommentar). Dieser Test erwartete danach noch die alte
//      Zuordnung und war damit rot — nur unbemerkt, weil `npm test` an dem Tag nicht lief.
//   2. `REVIER_ERSTLEHRE` hält seitdem je Revier ein ARRAY (Kette) statt eines Einzeleintrags,
//      und `erstlehreFuerRevier` liefert entsprechend immer ein Array — für Reviere ohne
//      Erstlehre ein leeres, nicht mehr `undefined`.
// Beides ist unten nachgezogen; zusätzlich wird die eigentliche Kettenfähigkeit geprüft
// (mehrere Kapitel hintereinander), obwohl die Tabelle aktuell noch überall nur eines enthält.
const ERWARTETE_ZUORDNUNG = {
  eichhoernchen: { kapitelId: "figurenwert", route: "Figurenwert" },
  rabe: { kapitelId: "fesselung", route: "Fesselung" },
  dachs: { kapitelId: "rochade", route: "Rochade" },
  wolf: { kapitelId: "mattIn2", route: "MattIn2" },
};
const OHNE_ERSTLEHRE = ["adlerin", "wisent"];

test("REVIER_ERSTLEHRE enthält genau die vier erwarteten Gefährten-Schlüssel", () => {
  assert.deepEqual(
    Object.keys(REVIER_ERSTLEHRE).sort(),
    Object.keys(ERWARTETE_ZUORDNUNG).sort(),
    "erwartet: eichhoernchen, rabe, dachs, wolf — nicht adlerin/wisent"
  );
});

test("Jeder Eintrag ist eine Kette (Array), nicht mehr ein Einzelobjekt", () => {
  for (const [gefaehrteId, kette] of Object.entries(REVIER_ERSTLEHRE)) {
    assert.ok(Array.isArray(kette), `REVIER_ERSTLEHRE.${gefaehrteId} sollte ein Array sein`);
    assert.ok(kette.length > 0, `REVIER_ERSTLEHRE.${gefaehrteId} sollte nicht leer sein`);
  }
});

for (const [gefaehrteId, erwartet] of Object.entries(ERWARTETE_ZUORDNUNG)) {
  test(`REVIER_ERSTLEHRE.${gefaehrteId} beginnt mit ${erwartet.route} (kapitelId "${erwartet.kapitelId}")`, () => {
    const kette = REVIER_ERSTLEHRE[gefaehrteId];
    assert.notEqual(kette, undefined, `sollte einen Eintrag für ${gefaehrteId} haben`);
    const eintrag = kette[0];
    assert.equal(eintrag.kapitelId, erwartet.kapitelId);
    assert.equal(eintrag.route, erwartet.route);
    assert.equal(typeof eintrag.titel, "string", "titel sollte ein nicht-leerer Anzeigetext sein");
    assert.ok(eintrag.titel.length > 0);
  });
}

test("erstlehreFuerRevier(...) liefert für adlerin/wisent ein LEERES Array (nicht undefined)", () => {
  for (const gefaehrteId of OHNE_ERSTLEHRE) {
    const kette = erstlehreFuerRevier(gefaehrteId);
    assert.ok(Array.isArray(kette), `${gefaehrteId} sollte ein Array liefern`);
    assert.equal(kette.length, 0, `${gefaehrteId} sollte eine leere Kette liefern`);
  }
});

test("erstlehreFuerRevier(...) liefert für die vier Erstlehre-Reviere dieselbe Kette wie REVIER_ERSTLEHRE", () => {
  for (const gefaehrteId of Object.keys(ERWARTETE_ZUORDNUNG)) {
    assert.deepEqual(erstlehreFuerRevier(gefaehrteId), REVIER_ERSTLEHRE[gefaehrteId]);
  }
});

test("Kein Kapitel hängt an zwei Revieren gleichzeitig", () => {
  const alle = Object.values(REVIER_ERSTLEHRE).flat().map((k) => k.kapitelId);
  assert.equal(new Set(alle).size, alle.length, `doppelte kapitelId gefunden: ${alle.join(", ")}`);
});

test("naechsteOffeneErstlehre: nichts erledigt → erstes Kapitel der Kette", () => {
  assert.equal(naechsteOffeneErstlehre("eichhoernchen", {}).kapitelId, "figurenwert");
  assert.equal(naechsteOffeneErstlehre("rabe", {}).kapitelId, "fesselung");
});

test("naechsteOffeneErstlehre: fehlender Eintrag zählt als offen, explizites false ebenso", () => {
  assert.equal(naechsteOffeneErstlehre("rabe", {}).kapitelId, "fesselung");
  assert.equal(naechsteOffeneErstlehre("rabe", { fesselung: false }).kapitelId, "fesselung");
});

test("naechsteOffeneErstlehre: alles erledigt bzw. leere Kette → null", () => {
  assert.equal(naechsteOffeneErstlehre("eichhoernchen", { figurenwert: true }), null);
  for (const gefaehrteId of OHNE_ERSTLEHRE) {
    assert.equal(naechsteOffeneErstlehre(gefaehrteId, {}), null);
  }
});

test("Kettenfähigkeit: mehrere Kapitel werden in fester Reihenfolge abgearbeitet", () => {
  // Bewusst zur Laufzeit gesetzt: Die echte Tabelle enthält aktuell überall nur ein Kapitel
  // (die Neuzuordnung nach "Variante A" kommt erst mit den beiden Deckungs-Kapiteln, siehe
  // revierErstlehre.ts-Kopfkommentar). Ohne diesen Test bliebe genau die Fähigkeit, für die
  // der Umbau gemacht wurde, bis dahin ungeprüft.
  const gesichert = REVIER_ERSTLEHRE.eichhoernchen;
  try {
    REVIER_ERSTLEHRE.eichhoernchen = [
      { kapitelId: "figurenwert", route: "Figurenwert", titel: "Figurenwert" },
      { kapitelId: "beschuetzer", route: "Beschuetzer", titel: "Der Beschützer" },
    ];
    assert.equal(naechsteOffeneErstlehre("eichhoernchen", {}).kapitelId, "figurenwert");
    assert.equal(
      naechsteOffeneErstlehre("eichhoernchen", { figurenwert: true }).kapitelId,
      "beschuetzer"
    );
    assert.equal(
      naechsteOffeneErstlehre("eichhoernchen", { figurenwert: true, beschuetzer: true }),
      null
    );
    // Reihenfolge muss auch dann gelten, wenn das SPÄTERE Kapitel zuerst erledigt wurde.
    assert.equal(
      naechsteOffeneErstlehre("eichhoernchen", { beschuetzer: true }).kapitelId,
      "figurenwert"
    );
  } finally {
    REVIER_ERSTLEHRE.eichhoernchen = gesichert;
  }
});

test("Alle kapitelId-Werte sind eine Teilmenge der bestehenden BonusKapitelId-Literale in storage.ts", () => {
  // storage.ts exportiert `BonusKapitelId` selbst nicht (siehe revierErstlehre.ts-
  // Kopfkommentar), deshalb hier ein Text-Check gegen die Feld-Initialisierung von
  // `bonusFortschritt` in storage.ts (`neuesKindProfil`/vergleichbare Stelle) statt eines
  // Typvergleichs zur Compile-Zeit.
  const storageSrc = fs.readFileSync(path.join(__dirname, "..", "src", "lib", "storage.ts"), "utf8");
  for (const { kapitelId } of Object.values(REVIER_ERSTLEHRE).flat()) {
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
