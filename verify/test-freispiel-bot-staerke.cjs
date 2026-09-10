#!/usr/bin/env node
// Verifikation der Freispiel-Bot-Engine (src/lib/waldfreundeBot.ts) — Task #78 aus der
// Projekt-Tracking-Tabelle ("Logik-Verifikation des Bot-Schwierigkeitsgradienten (16 Stufen
// tatsächlich spielstärke-aufsteigend, analog zu verify/*.cjs bei den Hauptquests)").
//
// Hintergrund: waldfreundeBot.ts sagt selbst im Datei-Kommentar ganz offen, dass die 16
// Parametersätze (elo/zufallsanteil/suchtiefe/topKAuswahl) "eine erste, plausible
// Kalibrierung, KEIN Ergebnis von echtem Playtesting" sind. Dieses Skript prüft zweierlei:
//
//   1. STRUKTUR (deterministisch, ohne Zufall): Sind die 16 Stufen intern konsistent
//      aufgebaut? — aufsteigende Elo, die in endlosmodus_freispiel_konzept.md festgelegte
//      Charakter-/Rang-Zuordnung (Eichhörnchen×3, Fuchs/Dachs/Adlerin/Wolf×2, Wisent×5), und
//      die drei Verhaltens-Hebel monoton in die erwartete Richtung (zufallsanteil strikt
//      fallend, suchtiefe nie fallend, topKAuswahl nie steigend).
//
//   2. EMPIRIE (stochastisch, braucht echtes chess.js): Gewinnt eine höhere Stufe tatsächlich
//      öfter als die direkt darunterliegende, wenn beide gegeneinander spielen? Dafür lässt
//      dieses Skript jedes der 15 benachbarten Stufenpaare mehrfach gegeneinander antreten
//      (Farben abwechselnd, damit kein Anzugsvorteil verzerrt) und prüft den Punkteschnitt
//      der stärkeren Stufe. Weil `waehleBotZug` echten Zufall verwendet (Math.random, nicht
//      seedbar) UND benachbarte Stufen sich bewusst nur wenig unterscheiden, ist ein
//      EINZELNES Spiel kein verlässliches Signal — deshalb hier eine Serie pro Paar plus eine
//      GROSSZÜGIGE Tolranz beim Schwellwert (siehe MIN_ERWARTETE_PUNKTZAHL unten): das Skript
//      soll grobe Fehler (z. B. eine invertierte Stufe) zuverlässig fangen, aber nicht bei
//      jedem knappen Nachbarpaar durch reines Zufallsrauschen rot werden. Die tatsächlichen
//      Punktzahlen werden IMMER ausgegeben, damit ein Mensch Grenzfälle selbst beurteilen kann.
//
// Sandbox-Hinweis (wie bei allen verify/*.cjs in diesem Projekt): Dieses Skript wurde in der
// Implementierungs-Sandbox geschrieben, in der die npm-Registry blockiert ist (kein `npm
// install`, kein echtes chess.js verfügbar) — es konnte dort NICHT ausgeführt werden. Die
// STRUKTUR-Tests (Teil 1) sind reine Werte-Vergleiche der Tabelle in waldfreundeBot.ts und
// wurden vorab per Hand/eigenem Skript geprüft (siehe Projekt-Notiz). Der maßgebliche,
// tatsächliche Lauf — inklusive des EMPIRISCHEN Teils, der echtes chess.js braucht — muss auf
// einem Rechner mit vollständigem `npm install` erfolgen.
//
// Ausführen: `node verify/test-freispiel-bot-staerke.cjs` im Projektverzeichnis (nach
// `npm install`). Dauer: mehrere Sekunden bis niedrige Minuten (15 Paare × mehrere Spiele,
// pro Spiel auf wenige hundert Halbzüge gedeckelt). Exit-Code 0 = alle Tests grün (inkl.
// Empirie-Schwellwerte), 1 = mindestens ein Fehler.

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

const SRC = path.join(__dirname, "..", "src", "lib", "waldfreundeBot.ts");
const source = fs.readFileSync(SRC, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
  fileName: "waldfreundeBot.ts",
});

const m = new Module(SRC, module);
m.filename = SRC;
m.paths = Module._nodeModulePaths(path.dirname(SRC));
try {
  m._compile(outputText, SRC);
} catch (err) {
  console.error(
    "Konnte waldfreundeBot.ts nicht laden (chess.js fehlt vermutlich noch). Bitte " +
      "einmalig `npm install` im Projektverzeichnis ausführen und erneut starten.\n"
  );
  console.error(err.message);
  process.exit(1);
}

const { WALDFREUNDE_STUFEN, holeStufe, ersteStufe, naechsteStufeNach, waehleBotZug } = m.exports;

let Chess;
try {
  ({ Chess } = require("chess.js"));
} catch {
  console.error(
    "Konnte das Paket 'chess.js' nicht laden. Bitte einmalig `npm install` im " +
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

// === Teil 1: Struktur-Tests (deterministisch) ===============================================

test("WALDFREUNDE_STUFEN hat genau 16 Einträge", () => {
  assert.equal(WALDFREUNDE_STUFEN.length, 16);
});

test("Elo-Werte sind streng aufsteigend sortiert (keine Duplikate, keine Lücken in der Reihenfolge)", () => {
  for (let i = 1; i < WALDFREUNDE_STUFEN.length; i++) {
    assert.ok(
      WALDFREUNDE_STUFEN[i].elo > WALDFREUNDE_STUFEN[i - 1].elo,
      `Stufe ${i} (${WALDFREUNDE_STUFEN[i].elo}) sollte höhere Elo haben als Stufe ${i - 1} (${WALDFREUNDE_STUFEN[i - 1].elo})`
    );
  }
});

test("Charakter-/Rang-Zuordnung entspricht der Tabelle in endlosmodus_freispiel_konzept.md", () => {
  const erwartet = [
    ["eichhoernchen", 1], ["eichhoernchen", 2], ["eichhoernchen", 3],
    ["fuchs", 1], ["fuchs", 2],
    ["dachs", 1], ["dachs", 2],
    ["adlerin", 1], ["adlerin", 2],
    ["wolf", 1], ["wolf", 2],
    ["wisent", 1], ["wisent", 2], ["wisent", 3], ["wisent", 4], ["wisent", 5],
  ];
  assert.equal(erwartet.length, WALDFREUNDE_STUFEN.length, "Erwartungs-Tabelle sollte auch 16 Einträge haben");
  WALDFREUNDE_STUFEN.forEach((stufe, i) => {
    assert.equal(stufe.tier, erwartet[i][0], `Stufe ${i} (Elo ${stufe.elo}): falscher Charakter`);
    assert.equal(stufe.rang, erwartet[i][1], `Stufe ${i} (Elo ${stufe.elo}): falscher Rang`);
  });
});

test("zufallsanteil (Patzerquote) ist über alle 15 Übergänge STRENG fallend", () => {
  for (let i = 1; i < WALDFREUNDE_STUFEN.length; i++) {
    assert.ok(
      WALDFREUNDE_STUFEN[i].zufallsanteil < WALDFREUNDE_STUFEN[i - 1].zufallsanteil,
      `zufallsanteil sollte von Stufe ${i - 1} (${WALDFREUNDE_STUFEN[i - 1].zufallsanteil}) zu Stufe ${i} (${WALDFREUNDE_STUFEN[i].zufallsanteil}) sinken`
    );
  }
});

test("suchtiefe ist über alle 15 Übergänge NIE fallend (0 → 1 nur in eine Richtung)", () => {
  for (let i = 1; i < WALDFREUNDE_STUFEN.length; i++) {
    assert.ok(
      WALDFREUNDE_STUFEN[i].suchtiefe >= WALDFREUNDE_STUFEN[i - 1].suchtiefe,
      `suchtiefe sollte von Stufe ${i - 1} zu Stufe ${i} nicht sinken`
    );
  }
});

test("topKAuswahl ist über alle 15 Übergänge NIE steigend", () => {
  for (let i = 1; i < WALDFREUNDE_STUFEN.length; i++) {
    assert.ok(
      WALDFREUNDE_STUFEN[i].topKAuswahl <= WALDFREUNDE_STUFEN[i - 1].topKAuswahl,
      `topKAuswahl sollte von Stufe ${i - 1} zu Stufe ${i} nicht steigen`
    );
  }
});

test("holeStufe/ersteStufe/naechsteStufeNach verhalten sich wie dokumentiert", () => {
  assert.deepEqual(ersteStufe(), WALDFREUNDE_STUFEN[0]);
  assert.deepEqual(holeStufe(700), WALDFREUNDE_STUFEN.find((s) => s.elo === 700));
  assert.throws(() => holeStufe(999), /Unbekannte Freispiel-Elo-Stufe/);
  assert.deepEqual(naechsteStufeNach(250), WALDFREUNDE_STUFEN[1]);
  assert.equal(naechsteStufeNach(1300), null, "die letzte (stärkste) Stufe hat keine Nachfolgerin");
});

// === Teil 2: Empirische Spielstärke-Prüfung (stochastisch, braucht chess.js) =================
//
// Für jedes der 15 benachbarten Stufenpaare (i, i+1): GAMES_PER_PAIR Partien, Farben
// hälftig getauscht. Jede Partie ist auf MAX_PLIES Halbzüge gedeckelt (verhindert
// Endlosschleifen durch Zugwiederholung bei zwei schwachen Bots); erreicht eine Partie das
// Limit, zählt sie als Remis (0.5/0.5) — genau wie ein von chess.js erkanntes Remis
// (Patt, Materialmangel, 3-fache Stellungswiederholung, 50-Züge-Regel).

const GAMES_PER_PAIR = 24; // 12× jede Farbe je Stufenpaar
const MAX_PLIES = 200;
// Toleranz: bei nur 24 Spielen pro (bewusst eng benachbartem) Paar ist ein Punkteschnitt von
// z. B. 0.42 statt >0.5 noch im Rahmen des Zufallsrauschens. Erst ein DEUTLICH invertiertes
// Ergebnis (stärkere Stufe gewinnt klar seltener als die schwächere) ist ein echtes
// Warnsignal für eine falsch kalibrierte Stufe.
const MIN_ERWARTETE_PUNKTZAHL_STAERKERE_STUFE = 0.5 - 0.22;

function spieleEinzelpartie(eloWeiss, eloSchwarz) {
  const spiel = new Chess();
  let halbzuege = 0;
  while (!spiel.isGameOver() && halbzuege < MAX_PLIES) {
    const amZugIstWeiss = spiel.turn() === "w";
    const elo = amZugIstWeiss ? eloWeiss : eloSchwarz;
    const zug = waehleBotZug(spiel, elo);
    if (!zug) break; // sollte durch isGameOver() bereits abgedeckt sein, defensiv
    spiel.move({ from: zug.from, to: zug.to, promotion: zug.promotion ?? "q" });
    halbzuege++;
  }
  if (spiel.isCheckmate()) {
    // Die Seite, die NICHT am Zug ist (weil sie mattgesetzt wurde), hat verloren —
    // spiel.turn() nach der letzten Bewegung ist die mattgesetzte, am Zug befindliche Seite.
    const mattgesetzteSeiteIstWeiss = spiel.turn() === "w";
    return mattgesetzteSeiteIstWeiss ? { weiss: 0, schwarz: 1 } : { weiss: 1, schwarz: 0 };
  }
  // Patt, Materialmangel, Stellungswiederholung, 50-Züge-Regel ODER Halbzug-Deckel erreicht.
  return { weiss: 0.5, schwarz: 0.5 };
}

console.log("\n--- Empirische Spielstärke-Prüfung (kann je nach Rechner einige Sekunden dauern) ---\n");

const paarErgebnisse = [];

for (let i = 1; i < WALDFREUNDE_STUFEN.length; i++) {
  const schwaechere = WALDFREUNDE_STUFEN[i - 1];
  const staerkere = WALDFREUNDE_STUFEN[i];
  let punkteStaerkere = 0;

  for (let spielNr = 0; spielNr < GAMES_PER_PAIR; spielNr++) {
    const staerkereSpieltWeiss = spielNr % 2 === 0;
    const ergebnis = staerkereSpieltWeiss
      ? spieleEinzelpartie(staerkere.elo, schwaechere.elo)
      : spieleEinzelpartie(schwaechere.elo, staerkere.elo);
    punkteStaerkere += staerkereSpieltWeiss ? ergebnis.weiss : ergebnis.schwarz;
  }

  const schnitt = punkteStaerkere / GAMES_PER_PAIR;
  paarErgebnisse.push({ schwaechere, staerkere, schnitt });

  const kennzeichnung = schnitt >= 0.5 ? "✓" : schnitt >= MIN_ERWARTETE_PUNKTZAHL_STAERKERE_STUFE ? "~" : "✗";
  console.log(
    `${kennzeichnung} ${staerkere.tier} #${staerkere.rang} (${staerkere.elo}) vs. ${schwaechere.tier} #${schwaechere.rang} (${schwaechere.elo}): ` +
      `Punkteschnitt der stärkeren Stufe = ${schnitt.toFixed(3)} (über ${GAMES_PER_PAIR} Partien)`
  );

  test(
    `Stufe ${staerkere.elo} sollte im Schnitt nicht deutlich schlechter abschneiden als Stufe ${schwaechere.elo}`,
    () => {
      assert.ok(
        schnitt >= MIN_ERWARTETE_PUNKTZAHL_STAERKERE_STUFE,
        `Punkteschnitt ${schnitt.toFixed(3)} liegt unter der Toleranzschwelle ${MIN_ERWARTETE_PUNKTZAHL_STAERKERE_STUFE.toFixed(3)} — ` +
          `möglicher Hinweis auf eine falsch kalibrierte Stufe (zufallsanteil/suchtiefe/topKAuswahl prüfen).`
      );
    }
  );
}

// Zusätzlicher, rein informativer Gesamttrend (kein harter Test, nur Einordnung): wie viele
// der 15 Paare zeigen die ERWARTETE Richtung (Schnitt >= 0.5)?
const anzahlErwarteteRichtung = paarErgebnisse.filter((p) => p.schnitt >= 0.5).length;
console.log(
  `\nGesamttrend: ${anzahlErwarteteRichtung} von ${paarErgebnisse.length} Nachbarpaaren zeigen die erwartete Richtung ` +
    `(stärkere Stufe punktet im Schnitt >= 0.5). Bei einer sinnvoll kalibrierten Stufenleiter sollte das die klare ` +
    `Mehrheit sein; einzelne knappe Ausreißer bei eng benachbarten Stufen (z. B. 900 vs. 1000 Elo) sind angesichts von ` +
    `nur ${GAMES_PER_PAIR} Partien pro Paar kein Grund zur Sorge.`
);

// === Zusammenfassung ==========================================================================

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Struktur- und Empirie-Tests der Freispiel-Bot-Engine grün.");
  process.exit(0);
}
