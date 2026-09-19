#!/usr/bin/env node
// Tests für die Auswahl der Stufen-Abschlusszeile (src/lib/lobAuswahl.ts).
//
// Hintergrund (Christian, 2026-09-19): Gelobt werden soll die ABWESENHEIT VON FEHLERN, nicht
// die Trefferquote — und der zweite Teil der Zeile soll ein Angebot sein, keine Forderung.
// Beides sind pädagogische Festlegungen, die im Code sonst still erodieren; deshalb stehen
// sie hier als Test.
//
// Wie in verify/test-endlosmodus-logic.cjs: kein Jest, kein ts-node.
// Ausführen: `node verify/test-lob-auswahl-logic.cjs` im Projektverzeichnis.

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("Konnte das Paket 'typescript' nicht laden. Bitte einmalig `npm install` ausführen.");
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

const QUELLE = path.join(__dirname, "..", "src", "lib", "lobAuswahl.ts");
const js = ts.transpileModule(fs.readFileSync(QUELLE, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  fileName: "lobAuswahl.ts",
}).outputText;
const mod = new Module(QUELLE, module);
mod.filename = QUELLE;
mod.paths = Module._nodeModulePaths(path.dirname(QUELLE));
mod._compile(js, QUELLE);
const { waehleLob, rundeAbschliessen, lobZeile, KOENNEN_ZEILEN, VORAUSBLICK_ZEILE } = mod.exports;

const lage = (o) => ({ verschenktJetzt: 0, verschenktVorher: null, hatNaechstenGefaehrten: true, ...o });

// ============================================================================
// 1. Der erste Teil der Zeile hängt NUR an verschenkten Figuren
// ============================================================================

test("Nichts verschenkt → ohneVerlust, egal wie viele Anläufe es gebraucht hat", () => {
  assert.equal(waehleLob(lage({ verschenktJetzt: 0 })).ohneVerlust, true);
});

test("Eine Figur verschenkt → nicht ohneVerlust", () => {
  assert.equal(waehleLob(lage({ verschenktJetzt: 1 })).ohneVerlust, false);
});

// ============================================================================
// 2. Belegter Fortschritt nur, wenn er wirklich belegbar ist
// ============================================================================

test("Ohne Vorrunde gibt es keinen belegten Fortschritt", () => {
  assert.notEqual(waehleLob(lage({ verschenktJetzt: 0, verschenktVorher: null })).zugabe, "belegterFortschritt");
});

test("Besser als beim letzten Mal → belegter Fortschritt", () => {
  assert.equal(
    waehleLob(lage({ verschenktJetzt: 0, verschenktVorher: 2 })).zugabe,
    "belegterFortschritt"
  );
});

test("Gleichstand ist KEIN Fortschritt — ein falsches Lob wäre schlimmer als ein allgemeines", () => {
  assert.notEqual(waehleLob(lage({ verschenktJetzt: 1, verschenktVorher: 1 })).zugabe, "belegterFortschritt");
});

test("Schlechter als beim letzten Mal → erst recht kein belegter Fortschritt", () => {
  assert.notEqual(waehleLob(lage({ verschenktJetzt: 3, verschenktVorher: 1 })).zugabe, "belegterFortschritt");
});

test("Auch eine Verbesserung von 3 auf 1 zählt, nicht nur die Null", () => {
  // Wichtig für ein Kind, das sich langsam verbessert: Der Fortschritt soll auch dann
  // benannt werden, wenn noch nicht alles perfekt ist.
  const e = waehleLob(lage({ verschenktJetzt: 1, verschenktVorher: 3 }));
  assert.equal(e.zugabe, "belegterFortschritt");
  assert.equal(e.ohneVerlust, false);
});

// ============================================================================
// 3. Die Rangfolge der Zugaben
// ============================================================================

test("Belegter Fortschritt schlägt den Vorausblick", () => {
  assert.equal(
    waehleLob(lage({ verschenktJetzt: 0, verschenktVorher: 1, hatNaechstenGefaehrten: true })).zugabe,
    "belegterFortschritt"
  );
});

test("Ohne belegbaren Fortschritt kommt der Vorausblick", () => {
  assert.equal(
    waehleLob(lage({ verschenktJetzt: 0, verschenktVorher: null, hatNaechstenGefaehrten: true })).zugabe,
    "vorausblick"
  );
});

test("Beim letzten Gefährten bleibt das Benennen von Können", () => {
  assert.equal(
    waehleLob(lage({ verschenktJetzt: 0, verschenktVorher: null, hatNaechstenGefaehrten: false })).zugabe,
    "koennen"
  );
});

test("Es gibt keine Zugabe, die mehr einfordert", () => {
  // Die Regel aus dem Konzept: Können benennen, nicht Leistung einfordern. Tauchte je eine
  // vierte Variante auf, müsste sie hier bewusst zugelassen werden.
  const erlaubt = new Set(["belegterFortschritt", "vorausblick", "koennen"]);
  for (const jetzt of [0, 1, 5]) {
    for (const vorher of [null, 0, 1, 5]) {
      for (const naechster of [true, false]) {
        const z = waehleLob({ verschenktJetzt: jetzt, verschenktVorher: vorher, hatNaechstenGefaehrten: naechster }).zugabe;
        assert.ok(erlaubt.has(z), `unerwartete Zugabe "${z}"`);
      }
    }
  }
});

// ============================================================================
// 4. Rundenwechsel
// ============================================================================

test("Beim Abschluss wird die laufende Zählung zum Vergleichswert und beginnt neu", () => {
  assert.deepEqual(rundeAbschliessen(2), { vorrunde: 2, laufend: 0 });
  assert.deepEqual(rundeAbschliessen(0), { vorrunde: 0, laufend: 0 });
});

test("Zwei Runden hintereinander ergeben einen belegbaren Fortschritt", () => {
  // Runde 1: zwei Figuren verschenkt, danach Abschluss.
  const nachRunde1 = rundeAbschliessen(2);
  // Runde 2: keine verschenkt.
  const e = waehleLob({
    verschenktJetzt: 0,
    verschenktVorher: nachRunde1.vorrunde,
    hatNaechstenGefaehrten: true,
  });
  assert.equal(e.ohneVerlust, true);
  assert.equal(e.zugabe, "belegterFortschritt");
});

// ============================================================================
// 5. Die Wortlaute (Nachtrag 2026-09-19)
// ============================================================================

const ALLE_LOBZEILEN = () => {
  const raus = [];
  for (const jetzt of [0, 1, 2, 5]) {
    for (const vorher of [null, 0, 1, 2, 5]) {
      for (const naechster of [true, false]) {
        for (const zaehler of [0, 1, 2]) {
          raus.push(lobZeile({ verschenktJetzt: jetzt, verschenktVorher: vorher, hatNaechstenGefaehrten: naechster }, zaehler));
        }
      }
    }
  }
  return raus;
};

test("keine Lobzeile sagt „Vorteil“", () => {
  // Abstrakter Schachbegriff, den die App nirgends einführt — und ein Lob ist die schlechteste
  // Stelle, um einen neuen Begriff fallen zu lassen (siehe Modul-Kommentar).
  for (const z of ALLE_LOBZEILEN()) assert.equal(/Vorteil/i.test(z.de), false, `"${z.de}"`);
});

test("keine Lobzeile fordert etwas ein", () => {
  // "Beim nächsten Mal kannst du mehr" hinge eine Hausaufgabe ans Lob und nähme die Aussage
  // halb zurück. Können benennen, nicht Leistung einfordern.
  for (const z of ALLE_LOBZEILEN()) {
    // Bewusst breit: Bei der Gegenprobe am 19.09. rutschte Christians Original-Entwurf
    // ("Beim nächsten Mal kannst du deinen Vorteil noch vergrößern") durch ein zu enges
    // Muster — er fiel nur über das Wort "Vorteil" auf, nicht über die Forderung selbst.
    assert.equal(
      /beim nächsten mal kannst du|kannst du (noch )?mehr|noch vergrößern|streng dich|versuch es besser|gib dir mehr/i.test(z.de),
      false,
      `"${z.de}"`
    );
  }
});

test("die Lobzeile behauptet nie etwas Falsches über verschenkte Figuren", () => {
  // Der teuerste Fehler hier: ein Lob, das nicht stimmt. Wer eine Figur verloren hat, darf
  // nicht hören, er habe keine verloren.
  for (const jetzt of [1, 2, 5]) {
    for (const vorher of [null, 0, 1, 2, 5]) {
      for (const naechster of [true, false]) {
        const z = lobZeile({ verschenktJetzt: jetzt, verschenktVorher: vorher, hatNaechstenGefaehrten: naechster });
        assert.equal(/keine einzige Figur verschenkt/.test(z.de), false, `${jetzt}/${vorher}: "${z.de}"`);
      }
    }
  }
});

test("der belegte Fortschritt steht in richtiger Ein- und Mehrzahl", () => {
  // Die Zeile wird VORGELESEN. "sind dir noch 1 Figuren weggekommen" ist genau die Sorte Satz,
  // die aus einer Vorlage herausfällt, wenn niemand hinschaut.
  const eine = lobZeile({ verschenktJetzt: 0, verschenktVorher: 1, hatNaechstenGefaehrten: true });
  assert.match(eine.de, /ist dir noch eine Figur weggekommen/);
  assert.match(eine.de, /Diesmal keine einzige!/);

  const drei = lobZeile({ verschenktJetzt: 0, verschenktVorher: 3, hatNaechstenGefaehrten: true });
  assert.match(drei.de, /sind dir noch 3 Figuren weggekommen/);

  const nochEine = lobZeile({ verschenktJetzt: 1, verschenktVorher: 3, hatNaechstenGefaehrten: true });
  assert.match(nochEine.de, /Diesmal nur noch eine\./);

  // Nirgends eine Ziffer, wo ein Zahlwort hingehört.
  assert.equal(/ 1 Figur/.test(drei.de + eine.de + nochEine.de), false);
});

test("Christians Vorausblick-Zeile steht wörtlich drin", () => {
  assert.equal(VORAUSBLICK_ZEILE.de, "Und beim nächsten Gefährten zeige ich dir einen neuen Trick.");
  const z = lobZeile({ verschenktJetzt: 0, verschenktVorher: null, hatNaechstenGefaehrten: true });
  assert.ok(z.de.includes(VORAUSBLICK_ZEILE.de), `"${z.de}"`);
});

test("beim letzten Gefährten rotiert der Können-Pool", () => {
  const lage = { verschenktJetzt: 0, verschenktVorher: null, hatNaechstenGefaehrten: false };
  const gesehen = new Set(KOENNEN_ZEILEN.map((_, i) => lobZeile(lage, i).de));
  assert.equal(gesehen.size, KOENNEN_ZEILEN.length, "der Pool rotiert nicht");
  // Und bleibt auch bei krummen Zählern im Bereich.
  for (const n of [-4, 0, 7, 1000]) assert.ok(lobZeile(lage, n).de.length > 0);
});

test("jede Lobzeile hat eine englische Fassung und nennt keine Feldkoordinate", () => {
  for (const z of ALLE_LOBZEILEN()) {
    assert.ok(z.en && z.en.trim(), `englische Fassung fehlt: "${z.de}"`);
    assert.notEqual(z.de, z.en);
    assert.equal(/\b[a-h][1-8]\b/.test(z.de), false, `"${z.de}"`);
  }
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
}
console.log("Alle Lob-Auswahl-Tests grün.");
process.exit(0);
