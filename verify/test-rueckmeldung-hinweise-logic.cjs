#!/usr/bin/env node
// Tests für die dreiteilige Rückmeldung (src/lib/zugBewertung.ts) und die vierstufige
// Hinweisleiter (src/lib/hinweisLeiter.ts).
//
// Kein Jest, kein ts-node (siehe verify/test-endlosmodus-logic.cjs).
// Ausführen: `node verify/test-rueckmeldung-hinweise-logic.cjs` im Projektverzeichnis.
//
// Beide Module setzen pädagogische Festlegungen durch, die im Code sonst still erodieren:
//   · Gelobt wird die Abwesenheit von Fehlern, nicht die Trefferquote.
//   · Ein Lösungszug bleibt stark, auch wenn er kurzfristig Material einstellt.
//   · Keine Feldkoordinaten, kein „den/die/das", keine Frage nach dem besten Zug.
// Deshalb stehen sie hier als Test und nicht nur als Kommentar.

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const Module = require("module");

let Chess;
try {
  ({ Chess } = require("chess.js"));
} catch {
  console.error("Konnte 'chess.js' nicht laden. Bitte einmalig `npm install` ausführen.");
  process.exit(1);
}

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

function lade(datei) {
  const quelle = path.join(__dirname, "..", "src", "lib", datei);
  const js = ts.transpileModule(fs.readFileSync(quelle, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
    fileName: datei,
  }).outputText;
  const mod = new Module(quelle, module);
  mod.filename = quelle;
  mod.paths = Module._nodeModulePaths(path.dirname(quelle));
  mod._compile(js, quelle);
  return mod.exports;
}

const {
  bewerteZug,
  groessterVerlust,
  IN_ORDNUNG_ZEILEN,
  VERSCHENKT_ZEILEN,
  KEIN_DRUCK_ANSAGE,
  zeileAusPool,
} = lade("zugBewertung.ts");

const {
  hinweisText,
  bereichFuerFeld,
  naechsteStufeMitText,
  stufeAusFehlversuchen,
  figurName,
  HOECHSTE_HINWEISSTUFE,
} = lade("hinweisLeiter.ts");

// ════════════════════════════════════════════════════════════════════════════
// 1. Die Einordnung eines Zugs
// ════════════════════════════════════════════════════════════════════════════

test("der Lösungszug ist stark", () => {
  const u = bewerteZug({
    fen: "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1",
    von: "d1",
    nach: "d6",
    zielFelder: ["d6"],
    loesungsFigurFeld: "d1",
  });
  assert.equal(u, "stark");
});

test("ein Lösungszug bleibt stark, AUCH wenn er Material einstellt", () => {
  // Das ist der wichtigste Fall: Bei Gabel und Spieß stellt sich die eigene Figur mitten ins
  // Feld — genau das ist der Lehrzug. Käme hier "verschenkt" heraus, würde die App dem Kind den
  // richtigen Zug madig machen.
  const u = bewerteZug({
    fen: "6k1/3q4/8/8/4N3/8/8/7K w - - 0 1",
    von: "e4",
    nach: "f6",
    zielFelder: ["f6"],
    loesungsFigurFeld: "e4",
  });
  assert.equal(u, "stark");
});

test("ein sicherer Zug, der nicht die Lösung ist, gilt als in Ordnung", () => {
  // Der Turm zieht irgendwo hin, wo ihn nichts angreift. Heute bekäme das Kind darauf gar keine
  // Antwort — genau das Schweigen, um das es geht.
  const u = bewerteZug({
    fen: "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1",
    von: "d1",
    nach: "d3",
    zielFelder: ["d6"],
    loesungsFigurFeld: "d1",
  });
  assert.equal(u, "inOrdnung");
});

test("ein Zug, der eine Figur ungedeckt ins Feuer stellt, gilt als verschenkt", () => {
  // Der Turm stellt sich der Dame direkt vor die Nase. Nichts deckt ihn, nichts schlägt zurück:
  // gewinn 0, verlust 5.
  //
  // Der weiße König steht bewusst auf f1, nicht auf h1: Von d5 aus liefe die Diagonale
  // d5-e4-f3-g2-h1 genau auf ihn, Weiß stünde im Schach und der Turmzug wäre gar nicht legal.
  // Im ersten Entwurf dieses Tests stand er auf h1 — dieselbe Sorte unspielbarer Stellung, die
  // am Vormittag schon einmal durchgerutscht ist. chess.js nimmt solche FEN klaglos an und
  // meldet sich erst beim Zug.
  const u = bewerteZug({
    fen: "7k/8/8/3q4/8/8/8/3R1K2 w - - 0 1",
    von: "d1",
    nach: "d4",
    zielFelder: ["zzz"], // absichtlich kein Treffer, damit die Materialrechnung greift
    loesungsFigurFeld: "d1",
  });
  assert.equal(u, "verschenkt");
});

test("NICHT jeder Schlagzug ist ein Verschenken — geprüft an einer echten Stellung", () => {
  // Beim ersten Entwurf dieses Tests hatte ich genau hier "verschenkt" erwartet, weil ich den
  // Läufer f6 für den Rückschläger auf d6 hielt. f6 und d6 stehen auf DERSELBEN REIHE — ein
  // Läufer kommt da nie hin. Das Modul hatte recht, die Erwartung war falsch.
  //
  // Der Fall bleibt als Test stehen, weil er die teuerste Fehlerrichtung absichert: Ein
  // fälschlich getadelter richtiger Zug wiegt schwerer als ein übersehener schwacher.
  const u = bewerteZug({
    fen: "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1",
    von: "d1",
    nach: "d6",
    zielFelder: ["zzz"],
    loesungsFigurFeld: "d1",
  });
  assert.equal(u, "inOrdnung");
});

test("ein Schlagzug, bei dem zurückgeschlagen wird, aber der Tausch aufgeht, ist in Ordnung", () => {
  // Turm schlägt Turm, Bauer schlägt zurück: gewinn 5, verlust 5 − 5 = 0 → geht auf.
  const u = bewerteZug({
    fen: "6k1/5p2/6r1/8/8/8/8/6RK w - - 0 1",
    von: "g1",
    nach: "g6",
    zielFelder: ["zzz"],
  });
  assert.equal(u, "inOrdnung");
});

test("Schach ist kein Materialverlust — kein Schlagzug nennt je den König als Beute", () => {
  // Erster Entwurf dieses Tests prüfte eine Stellung ohne jeden Schlagzug und war damit
  // wirkungslos (Gegenprobe 2026-09-19: der König ließ sich auf 9 setzen, ohne dass etwas rot
  // wurde). Geprüft wird jetzt die Eigenschaft, auf der die Rechnung wirklich ruht: chess.js
  // erzeugt NIE einen Zug mit `captured === "k"`. Nur deshalb kann der Königswert die
  // Verlustrechnung nicht dominieren — sonst wäre jedes Schach eine Katastrophe.
  const stellungen = [
    "4k3/8/8/8/8/8/8/4R2K b - - 0 1",
    "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1",
    "6k1/3q4/8/8/4N3/8/8/7K w - - 0 1",
    "q7/8/8/k7/8/8/7K/7R w - - 0 1",
  ];
  for (const fen of stellungen) {
    const brett = new Chess(fen);
    for (const zug of brett.moves({ verbose: true })) {
      assert.notEqual(zug.captured, "k", `${fen}: ${zug.from}x${zug.to}`);
    }
  }
  // Und eine Stellung, in der die Seite am Zug Schach BIETET, aber nichts zu holen ist.
  assert.equal(groessterVerlust("7k/8/8/8/8/8/8/4R2K b - - 0 1"), 0);
});

test("eine gefesselte gegnerische Figur schlägt nicht — das darf nicht als Verlust zählen", () => {
  // DAS ist der Grund, warum über echte Legalzüge gerechnet wird und nicht über attackers():
  // Der schwarze Läufer e6 ist vom weißen Turm e1 an seinen König e8 gekettet. attackers()
  // meldet ihn trotzdem als Angreifer des Bauern d5 — er darf aber nicht schlagen. Käme hier
  // ein Verlust heraus, bekäme das Kind für einen guten Zug einen Tadel.
  //
  // Der erste Entwurf nahm einen SPRINGER auf e6. Von dort erreicht ein Springer d5 gar nicht,
  // der Test war damit wirkungslos (Gegenprobe 2026-09-19). Jetzt ein Läufer, und die
  // Gegenprobe greift: attackers() sagt ["e6"], die Legalzüge sagen keinen.
  const fen = "4k3/8/4b3/3P4/8/8/8/4R2K b - - 0 1";
  assert.deepEqual(new Chess(fen).attackers("d5", "b"), ["e6"], "Vorbedingung des Tests");
  assert.equal(groessterVerlust(fen), 0);
});

test("ohne Zielfeld-Vorgabe löst jeder legale Zug", () => {
  const u = bewerteZug({ fen: "7k/8/8/8/8/8/8/4R2K w - - 0 1", von: "e1", nach: "e8", zielFelder: [] });
  assert.equal(u, "stark");
});

test("die richtige Figur auf dem richtigen Feld — beides muss stimmen", () => {
  const lage = {
    fen: "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1",
    zielFelder: ["d6"],
    loesungsFigurFeld: "d1",
  };
  assert.equal(bewerteZug({ ...lage, von: "d1", nach: "d6" }), "stark");
  // Richtiges Zielfeld, aber es zieht gar nicht die Lösungsfigur → nicht "stark".
  assert.notEqual(bewerteZug({ ...lage, von: "h1", nach: "h2" }), "stark");
});

test("ein unmöglicher Zug führt nie zu einem Tadel", () => {
  // Über das Brett nicht erreichbar (Board bietet nur Legalzüge an) — aber ein stillschweigendes
  // "verschenkt" wäre hier die falscheste aller Antworten.
  assert.equal(
    bewerteZug({ fen: "7k/8/8/8/8/8/8/4R2K w - - 0 1", von: "e1", nach: "b7", zielFelder: ["zzz"] }),
    "inOrdnung"
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Die Sprechzeilen der Rückmeldung
// ════════════════════════════════════════════════════════════════════════════

const ALLE_ZEILEN = [...IN_ORDNUNG_ZEILEN, ...VERSCHENKT_ZEILEN, ...KEIN_DRUCK_ANSAGE];

test("keine Rückmeldezeile sagt „falsch“ oder „leider“", () => {
  // Kein Fehlerzähler, keine Bestrafung — das ist ein Design-Grundsatz, kein Geschmacksfrage.
  for (const z of ALLE_ZEILEN) {
    assert.equal(/\bfalsch|leider|fehler/i.test(z.de), false, `"${z.de}"`);
  }
});

test("keine Rückmeldezeile fordert den besten Zug ein", () => {
  // "Finde den besten Zug" ist genau der Druck, den Christian benannt hat. Die eine erlaubte
  // Erwähnung ist die Entwarnung selbst ("musst du nicht immer den allerbesten Zug finden").
  for (const z of IN_ORDNUNG_ZEILEN) {
    assert.equal(/beste[nr]? Zug/i.test(z.de), false, `"${z.de}"`);
  }
  assert.ok(KEIN_DRUCK_ANSAGE.some((z) => /allerbesten Zug/.test(z.de)), "die Entwarnung fehlt");
});

test("die „verschenkt“-Zeilen sprechen über die FIGUR, nicht über das Kind", () => {
  for (const z of VERSCHENKT_ZEILEN) {
    assert.equal(/\bdu hast\b|\bdein Fehler\b/i.test(z.de), false, `"${z.de}"`);
  }
});

test("jede Zeile hat eine englische Fassung und nennt keine Feldkoordinate", () => {
  for (const z of ALLE_ZEILEN) {
    assert.ok(z.en && z.en.trim(), `englische Fassung fehlt: "${z.de}"`);
    assert.notEqual(z.de, z.en);
    assert.equal(/\b[a-h][1-8]\b/.test(z.de), false, `"${z.de}"`);
  }
});

test("der Pool rotiert und bleibt auch bei krummen Zählern im Bereich", () => {
  assert.equal(zeileAusPool(IN_ORDNUNG_ZEILEN, 0), IN_ORDNUNG_ZEILEN[0]);
  assert.equal(zeileAusPool(IN_ORDNUNG_ZEILEN, IN_ORDNUNG_ZEILEN.length), IN_ORDNUNG_ZEILEN[0]);
  for (const n of [-7, -1, 0, 1, 99, 1000]) {
    assert.ok(IN_ORDNUNG_ZEILEN.includes(zeileAusPool(IN_ORDNUNG_ZEILEN, n)), `Zähler ${n}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Die Hinweisleiter
// ════════════════════════════════════════════════════════════════════════════

const LAGE = { motivId: "gabel", figurTyp: "n", zielFelder: ["f6"] };

test("die vier Stufen geben vier verschiedene Arten von Hilfe", () => {
  const texte = [0, 1, 2, 3].map((s) => hinweisText(s, LAGE).de);
  assert.equal(new Set(texte).size, 4, texte.join(" | "));
  assert.match(texte[0], /Schau dir die Figuren/);
  assert.match(texte[1], /zwei Figuren auf einmal/);
  assert.match(texte[2], /Springer/);
  assert.match(texte[3], /leuchtende Feld/);
});

test("KEINE Stufe nennt je eine Feldkoordinate", () => {
  // Der eigentliche Grund für dieses Modul: hinweisTextFuerStufe3() sagte bis hierhin
  // "Ziehe … nach f6" — und las das seit dem 18.09. auch vor.
  for (const motivId of ["figurGewinnen", "gabel", "fesselung", "spiess", "beschuetzen", "verteidigen"]) {
    for (const typ of ["p", "n", "b", "r", "q", "k"]) {
      for (const ziele of [["a1"], ["h8"], ["d4"], ["a1", "b2", "c3"]]) {
        for (let s = 0; s <= HOECHSTE_HINWEISSTUFE; s++) {
          const txt = hinweisText(s, { motivId, figurTyp: typ, zielFelder: ziele });
          if (!txt) continue;
          assert.equal(/\b[a-h][1-8]\b/.test(txt.de), false, `${motivId}/${typ}/${s}: "${txt.de}"`);
          assert.equal(/\b[a-h][1-8]\b/.test(txt.en), false, `${motivId}/${typ}/${s}: "${txt.en}"`);
        }
      }
    }
  }
});

test('KEINE Stufe liest den Platzhalter "den/die/das" vor', () => {
  for (const typ of ["p", "n", "b", "r", "q", "k"]) {
    const txt = hinweisText(3, { motivId: "gabel", figurTyp: typ, zielFelder: ["f6"] });
    assert.equal(txt.de.includes("/"), false, `"${txt.de}"`);
  }
});

test("die Artikel stimmen — die Dame, den Turm", () => {
  const mit = (typ) => hinweisText(3, { motivId: "gabel", figurTyp: typ, zielFelder: ["f6"] }).de;
  assert.match(mit("q"), /die Dame/);
  assert.match(mit("r"), /den Turm/);
  assert.match(mit("p"), /den Bauern/);
  assert.match(mit("n"), /den Springer/);
});

test("keine Hinweiszeile fragt nach dem besten Zug", () => {
  for (const motivId of ["figurGewinnen", "gabel", "fesselung", "spiess", "beschuetzen", "verteidigen"]) {
    const txt = hinweisText(1, { motivId, figurTyp: "n", zielFelder: ["f6"] });
    assert.equal(/beste[nr]? Zug/i.test(txt.de), false, `${motivId}: "${txt.de}"`);
  }
});

test("der Brettbereich teilt dreiteilig ein, nicht geviertelt", () => {
  assert.equal(bereichFuerFeld("a1").de, "unten links");
  assert.equal(bereichFuerFeld("h8").de, "oben rechts");
  assert.equal(bereichFuerFeld("d4").de, "in der Mitte");
  assert.equal(bereichFuerFeld("d8").de, "oben in der Mitte");
  assert.equal(bereichFuerFeld("a5").de, "in der Mitte links");
});

test("jedes der 64 Felder bekommt einen Bereich, und keiner ist leer", () => {
  for (const linie of "abcdefgh") {
    for (let r = 1; r <= 8; r++) {
      const b = bereichFuerFeld(`${linie}${r}`);
      assert.ok(b.de.trim().length > 0 && b.en.trim().length > 0, `${linie}${r}`);
    }
  }
});

test("bei mehreren richtigen Antworten entfällt Stufe 0 und Stufe 3 sagt es", () => {
  // Beim Verteidigen sind im Schnitt zwölf bis sechzehn Felder sicher, und ALLE sind richtig.
  // Ein einzelner Bereichshinweis wäre dort irreführend.
  const viele = { motivId: "verteidigen", figurTyp: "r", zielFelder: ["a2", "b2", "c2", "d2"] };
  assert.equal(hinweisText(0, viele), null);
  assert.match(hinweisText(3, viele).de, /mehrere richtige Antworten/);
  assert.equal(naechsteStufeMitText(0, viele), 1);
});

test("eine Spalte ohne Motiv überspringt Stufe 1, statt nichts zu sagen", () => {
  // Schach lösen und Rochade haben bewusst kein Motiv. Ein Knopf, auf den nichts passiert,
  // wird kein zweites Mal gedrückt.
  const ohne = { motivId: null, figurTyp: "r", zielFelder: ["g1"] };
  assert.equal(hinweisText(1, ohne), null);
  assert.equal(naechsteStufeMitText(1, ohne), 2);
});

test("naechsteStufeMitText gibt null zurück, wenn wirklich nichts mehr kommt", () => {
  assert.equal(naechsteStufeMitText(0, { motivId: null, figurTyp: null, zielFelder: [] }), null);
});

test("Fehlversuche schalten weiter, aber nicht sprunghaft", () => {
  assert.equal(stufeAusFehlversuchen(0), 0);
  assert.equal(stufeAusFehlversuchen(1), 0);
  assert.equal(stufeAusFehlversuchen(2), 1);
  assert.equal(stufeAusFehlversuchen(5), 2);
  assert.equal(stufeAusFehlversuchen(8), 3);
  assert.equal(stufeAusFehlversuchen(99), 3);
  // Monoton: keine Stufe darf bei mehr Fehlversuchen wieder zurückfallen.
  let letzte = -1;
  for (let n = 0; n <= 30; n++) {
    const s = stufeAusFehlversuchen(n);
    assert.ok(s >= letzte, `bei ${n} Fehlversuchen fiel die Stufe zurück`);
    letzte = s;
  }
});

test("die Figurnamen sind kindgerecht und ohne Fachbegriff", () => {
  assert.deepEqual(
    ["p", "n", "b", "r", "q", "k"].map((t) => figurName(t).de),
    ["Bauer", "Springer", "Läufer", "Turm", "Dame", "König"]
  );
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
}
console.log("Alle Rückmeldungs- und Hinweis-Tests grün.");
process.exit(0);
