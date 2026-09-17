#!/usr/bin/env node
// Unit-Tests für die Wisent-Endspiel-Kür (Dame-Matt/Turm-Matt) und die zwei neuen Matt-in-3-
// Rätsel-Varianten, siehe claude/wisent_endspiel_kuer_kuratierung_2026-09-17.md. Nach demselben
// "kein Jest, kein ts-node"-Muster wie verify/test-erobern-eskalation-logic.cjs (siehe dortiger
// Kopfkommentar) — TypeScript-Quelldateien werden per ts.transpileModule + Module._compile
// direkt geladen und gegen das echte, installierte chess.js geprüft.
//
// Geprüft wird:
//   1. WISENT_ENDSPIEL_DAME_POSITIONEN/WISENT_ENDSPIEL_TURM_POSITIONEN (chessEngine.ts): alle
//      20 Startstellungen — exakte Materialaufteilung, gültige Stellung, Weiß am Zug, Partie
//      nicht bereits beendet, schwarzer König nicht bereits im Schach; zusätzlich, dass beide
//      Unterthemen an jedem Schlüssel exakt dieselbe Geometrie sind (nur Q<->R).
//   2. Die zwei neuen MATT_IN_3_POSITIONEN-Einträge (spiegelungALinie/drehung180): komplette
//      Zugfolge legal, Endstellung ist ein echtes, lückenloses Matt.
//   3. wisentEndspielFlucht.ts/waehleFluchtZug: liefert null bei Matt/Patt, bevorzugt
//      nachweislich Zentrumsnähe, liefert für alle 20 Startstellungen einen tatsächlich
//      legalen Zug, und bleibt über viele Halbzüge hinweg robust (nie ein illegales {from,to},
//      nie ein Wurf).
//   4. endlosmodusStufen.ts wiederverwendet mit den Wisent-Endspiel-Stufengrößen [4,3,3].
//
// Ausführen: `node verify/test-wisent-endspiel-kuer-logic.cjs` im Projektverzeichnis (nach
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

let Chess;
try {
  ({ Chess } = require("chess.js"));
} catch {
  console.error("Konnte das Paket 'chess.js' nicht laden. Bitte einmalig `npm install` ausführen.");
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

let chessEngine, flucht, stufen;
try {
  chessEngine = ladeTsModul("src/lib/chessEngine.ts");
  flucht = ladeTsModul("src/lib/wisentEndspielFlucht.ts");
  stufen = ladeTsModul("src/lib/endlosmodusStufen.ts");
} catch (err) {
  console.error(
    "Konnte ein Modul nicht laden (chess.js fehlt vermutlich noch). Bitte einmalig " +
      "`npm install` im Projektverzeichnis ausführen und erneut starten.\n"
  );
  console.error(err.message);
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

// --- Teil 1: WISENT_ENDSPIEL_*_POSITIONEN ---------------------------------------------------

const {
  WISENT_ENDSPIEL_DAME_POSITIONEN,
  WISENT_ENDSPIEL_TURM_POSITIONEN,
  WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE,
  MATT_IN_3_POSITIONEN,
} = chessEngine;

test("WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE hat exakt 10 Einträge, passend zu [4,3,3]", () => {
  assert.equal(WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE.length, 10);
  assert.deepEqual(WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE, ["a1", "a2", "a3", "a4", "b1", "b2", "b3", "c1", "c2", "c3"]);
});

for (const thema of ["DAME", "TURM"]) {
  const positionen = thema === "DAME" ? WISENT_ENDSPIEL_DAME_POSITIONEN : WISENT_ENDSPIEL_TURM_POSITIONEN;
  const erwarteteFigur = thema === "DAME" ? "q" : "r";
  for (const schluessel of WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE) {
    test(`${thema} ${schluessel}: Material/Zugrecht/Stellung korrekt`, () => {
      const fen = positionen[schluessel];
      assert.ok(fen, `Schlüssel ${schluessel} fehlt`);
      const g = new Chess(fen);
      let weisseKoenige = 0,
        schwarzeKoenige = 0,
        weisseFiguren = 0,
        sonstige = 0;
      for (const zeile of g.board()) {
        for (const feld of zeile) {
          if (!feld) continue;
          if (feld.type === "k") feld.color === "w" ? weisseKoenige++ : schwarzeKoenige++;
          else if (feld.type === erwarteteFigur && feld.color === "w") weisseFiguren++;
          else sonstige++;
        }
      }
      assert.equal(weisseKoenige, 1);
      assert.equal(schwarzeKoenige, 1);
      assert.equal(weisseFiguren, 1);
      assert.equal(sonstige, 0);
      assert.equal(g.turn(), "w");
      assert.equal(g.isGameOver(), false);
      assert.equal(g.isCheck(), false);
    });
  }
}

test("Dame-Matt und Turm-Matt sind an jedem Schlüssel exakt dieselbe Stellung (Q<->R)", () => {
  for (const schluessel of WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE) {
    const alsTurm = WISENT_ENDSPIEL_DAME_POSITIONEN[schluessel].replace(/Q/g, "R");
    assert.equal(alsTurm, WISENT_ENDSPIEL_TURM_POSITIONEN[schluessel]);
  }
});

// --- Teil 2: neue MATT_IN_3_POSITIONEN-Einträge ---------------------------------------------

test("spiegelungALinie: komplette Zugfolge legal, Endstellung ist Matt", () => {
  const g = new Chess(MATT_IN_3_POSITIONEN.spiegelungALinie);
  for (const san of ["Ra3", "Kd2", "Rh2", "Kd1", "Ra1#"]) g.move(san);
  assert.equal(g.isCheckmate(), true);
});
test("drehung180: komplette Zugfolge legal, Endstellung ist Matt", () => {
  const g = new Chess(MATT_IN_3_POSITIONEN.drehung180);
  for (const san of ["Rh6", "Kd7", "Ra7", "Kd8", "Rh8#"]) g.move(san);
  assert.equal(g.isCheckmate(), true);
});

// --- Teil 3: waehleFluchtZug (wisentEndspielFlucht.ts) --------------------------------------

const { waehleFluchtZug } = flucht;

test("liefert null bei bereits erreichtem Matt (kein Legalzug mehr)", () => {
  const g = new Chess(MATT_IN_3_POSITIONEN.turmleiter);
  for (const san of ["Rh3", "Ke2", "Ra2", "Ke1", "Rh1#"]) g.move(san);
  assert.equal(g.isCheckmate(), true);
  assert.equal(waehleFluchtZug(g), null);
});

test("liefert null bei Patt (kein Legalzug, kein Schach)", () => {
  // Verifizierte Patt-Stellung: Dame c7 deckt a7/b7 (Reihe 7) und b8 (Diagonale c7-b8), König
  // a8 selbst steht nicht im Schach (c7 deckt a8 weder auf Linie/Reihe noch Diagonale).
  const g = new Chess("k7/2Q5/8/8/8/8/8/7K b - - 0 1");
  assert.equal(g.isCheckmate(), false);
  assert.equal(g.isStalemate(), true);
  assert.equal(waehleFluchtZug(g), null);
});

test("bevorzugt die Zentrumsnähe: König am Rand mit einer zentraleren Fluchtoption", () => {
  const g = new Chess("8/8/8/8/k7/8/8/7K b - - 0 1");
  const zug = waehleFluchtZug(g);
  assert.ok(zug, "sollte einen Zug liefern");
  const legale = g.moves({ verbose: true });
  function zentrumsabstand(feldName) {
    const datei = feldName.charCodeAt(0) - 97;
    const reihe = Number(feldName[1]) - 1;
    return Math.max(Math.abs(datei - 3.5), Math.abs(reihe - 3.5));
  }
  const minAbstand = Math.min(...legale.map((z) => zentrumsabstand(z.to)));
  assert.equal(zentrumsabstand(zug.to), minAbstand, `gewähltes Zielfeld ${zug.to} sollte unter den zentrumsnächsten sein`);
});

test("gewählter Zug ist auf der Stellung tatsächlich ausführbar (kein Wurf)", () => {
  for (const schluessel of WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE) {
    const fen = WISENT_ENDSPIEL_DAME_POSITIONEN[schluessel];
    const teile = fen.split(" ");
    teile[1] = "b"; // reine Test-Vorbereitung: in der Startstellung ist Weiß am Zug
    const g = new Chess(teile.join(" "));
    const zug = waehleFluchtZug(g);
    assert.ok(zug, `${schluessel}: sollte einen Zug liefern`);
    assert.doesNotThrow(
      () => g.move({ from: zug.from, to: zug.to }),
      `${schluessel}: gewählter Zug ${zug.from}-${zug.to} sollte legal ausführbar sein`
    );
  }
});

test("Robustheit: waehleFluchtZug liefert über viele Halbzüge hinweg durchgehend legale Züge (oder korrekt null), für alle zehn Startstellungen", () => {
  // Bewusst KEIN Anspruch, tatsächlich matt zu setzen (das wäre ein vollständiger
  // Mattführungs-Algorithmus für Weiß — nicht Gegenstand dieses Moduls, das nur den
  // FLÜCHTENDEN König modelliert). Reines Robustheits-Sicherheitsnetz.
  function istFigurUngedecktAnzubieten(g, zug) {
    g.move({ from: zug.from, to: zug.to });
    const schlagbar = g.moves({ verbose: true }).some((z) => z.to === zug.to && z.captured);
    g.undo();
    return Boolean(schlagbar);
  }
  for (const schluessel of WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE) {
    const g = new Chess(WISENT_ENDSPIEL_DAME_POSITIONEN[schluessel]);
    for (let zugNr = 0; zugNr < 60 && !g.isGameOver(); zugNr++) {
      if (g.turn() === "w") {
        const zuege = g.moves({ verbose: true });
        const sichere = zuege.filter((z) => !istFigurUngedecktAnzubieten(g, z));
        const wahl = (sichere.length > 0 ? sichere : zuege)[0];
        g.move({ from: wahl.from, to: wahl.to });
      } else {
        const zug = waehleFluchtZug(g);
        if (!zug) break; // Matt oder Patt — von den beiden Tests oben bereits geprüft
        assert.doesNotThrow(
          () => g.move({ from: zug.from, to: zug.to }),
          `${schluessel}, Halbzug ${zugNr}: ${zug.from}-${zug.to} sollte legal sein`
        );
      }
    }
  }
});

// --- Teil 4: endlosmodusStufen.ts mit den Wisent-Endspiel-Stufengrößen [4,3,3] --------------

const { sterneAusFortschritt, naechsteOffeneAufgabe, gesamtAnzahlAufgaben } = stufen;
const WISENT_STUFEN = [4, 3, 3];

test("gesamtAnzahlAufgaben([4,3,3]) === 10", () => {
  assert.equal(gesamtAnzahlAufgaben(WISENT_STUFEN), 10);
});
test("sterneAusFortschritt: 0 Sterne, solange Stufe A nicht komplett ist", () => {
  const geloest = [true, true, true, false, false, false, false, false, false, false];
  assert.equal(sterneAusFortschritt(geloest, WISENT_STUFEN), 0);
});
test("sterneAusFortschritt: 1 Stern, wenn genau Stufe A komplett ist", () => {
  const geloest = [true, true, true, true, false, false, false, false, false, false];
  assert.equal(sterneAusFortschritt(geloest, WISENT_STUFEN), 1);
});
test("sterneAusFortschritt: 3 Sterne, wenn alle 10 gelöst sind", () => {
  const geloest = Array(10).fill(true);
  assert.equal(sterneAusFortschritt(geloest, WISENT_STUFEN), 3);
});
test("naechsteOffeneAufgabe findet die erste offene Stelle", () => {
  const geloest = [true, true, false, true, false];
  assert.equal(naechsteOffeneAufgabe(geloest, 10), 2);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
} else {
  console.log("Alle Wisent-Endspiel-Kür-Tests grün.");
  process.exit(0);
}
