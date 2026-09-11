#!/usr/bin/env node
// Paket 3 (2026-09-11): Logik-Test für das Bonuskapitel „Die ganze Partie" und die
// Freispiel-Abfederung (F1) — Testspezifikation aus bonuskapitel_ganze_partie_umsetzung_
// 2026-09-10.md, Abschnitt 8:
//
//   1. Grundstellung: 20 legale Züge; e4/Sf3/Lc4 mit den festen Schildkröten-Antworten legal.
//   2. Patt-Stellung: gültig, Weiß nicht im Schach; Dg6 → Patt; Dg7/Dg8/Dh1/Dh2 → Matt;
//      kein anderer Zug ist Matt.
//   3. Remis-Klassifikation (lib/remisUrsache.ts): Patt, ungenügendes Material, dreifache
//      Wiederholung liefern die richtige Ursache.
//   4. Bot (lib/waldfreundeBot.ts): Stellung mit genau einem Mattzug → ab Stufe 400 in 100 %
//      von 50 Läufen gewählt; Stellung mit Patt-Falle → keine Stufe wählt den Pattzug, wenn es
//      Alternativen gibt.
//
// Anders als die älteren verify/*.cjs prüft dieses Skript die ECHTEN Quelldateien (nicht eine
// Nachbildung): die .ts-Dateien werden beim require per `typescript.transpileModule` in
// CommonJS übersetzt (gleiches Verfahren wie test-freispiel-bot-staerke.cjs, hier als
// allgemeiner require-Hook für alle .ts-Importe).
//
// Ausführen: `node verify/test-ganze-partie-logic.cjs` im Projektverzeichnis (nach npm install).

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("Konnte 'typescript' nicht laden — bitte einmalig `npm install` ausführen.");
  process.exit(1);
}

Module._extensions[".ts"] = function (mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};

const SRC = path.join(__dirname, "..", "src");
const { Chess } = require("chess.js");
const logik = require(path.join(SRC, "bonus", "ganzePartieLogik.ts"));
const { remisUrsacheVon } = require(path.join(SRC, "lib", "remisUrsache.ts"));
const bot = require(path.join(SRC, "lib", "waldfreundeBot.ts"));

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

console.log("1. Grundstellung und geführte Eröffnung");
test("Grundstellung hat 20 legale Züge", () => {
  assert.equal(new Chess(logik.GRUNDSTELLUNG).moves().length, 20);
});
test("e4/Sf3/Lc4 mit den festen Antworten e5/Sc6/d6 ist durchgehend legal", () => {
  const spiel = new Chess(logik.GRUNDSTELLUNG);
  logik.EROEFFNUNG.forEach((idee, i) => {
    assert.ok(spiel.move({ from: idee.von, to: idee.nach }), `Idee ${i + 1} (${idee.von}-${idee.nach}) illegal`);
    assert.ok(spiel.move({ from: idee.antwort[0], to: idee.antwort[1] }), `Antwort ${i + 1} illegal`);
  });
  assert.equal(spiel.fen().split(" ")[0], "r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R");
});
test("schildkroetenAntwort spielt nach der Idee die feste Antwort", () => {
  let fen = logik.GRUNDSTELLUNG;
  logik.EROEFFNUNG.forEach((idee, i) => {
    const s = new Chess(fen);
    s.move({ from: idee.von, to: idee.nach });
    const nachher = new Chess(logik.schildkroetenAntwort(s.fen(), i));
    assert.ok(nachher.get(idee.antwort[1]), `Antwort ${i + 1}: auf ${idee.antwort[1]} steht nichts`);
    assert.equal(nachher.get(idee.antwort[0]), undefined, `Antwort ${i + 1}: ${idee.antwort[0]} nicht geräumt`);
    assert.equal(nachher.turn(), "w");
    fen = nachher.fen();
  });
});
test("schildkroetenAntwort weicht auf den Bot aus, wenn die feste Antwort nicht mehr legal ist", () => {
  // Schwarz am Zug, der Bauer steht schon auf e5 — die feste Antwort e7–e5 ist unmöglich,
  // also muss der Bot (Stufe 250) einen anderen legalen Zug spielen.
  const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2";
  const nachher = new Chess(logik.schildkroetenAntwort(fen, 0)); // e7–e5 ist hier unmöglich
  assert.equal(nachher.turn(), "w", "Bot hat nicht gezogen");
});
test("istLegal erkennt legale und illegale Züge", () => {
  assert.equal(logik.istLegal(logik.GRUNDSTELLUNG, "e2", "e4"), true);
  assert.equal(logik.istLegal(logik.GRUNDSTELLUNG, "e2", "e5"), false);
});

console.log("2. Patt-Stellung (Screen 4)");
test("Stellung gültig, Weiß am Zug und nicht im Schach", () => {
  const s = new Chess(logik.PATT_STELLUNG);
  assert.equal(s.turn(), "w");
  assert.equal(s.inCheck(), false);
});
test("Dg6 ist Patt (kein Schach, kein Zug)", () => {
  const s = new Chess(logik.PATT_STELLUNG);
  s.move({ from: logik.PATT_ZUG.von, to: logik.PATT_ZUG.nach });
  assert.equal(s.isStalemate(), true);
  assert.equal(s.inCheck(), false);
});
test("Dg7, Dg8, Dh1, Dh2 sind Matt", () => {
  for (const ziel of logik.MATTZUEGE) {
    const s = new Chess(logik.PATT_STELLUNG);
    s.move({ from: "g1", to: ziel });
    assert.equal(s.isCheckmate(), true, `Dg1-${ziel} ist kein Matt`);
  }
});
test("kein anderer weißer Zug ist Matt", () => {
  const start = new Chess(logik.PATT_STELLUNG);
  const matts = start
    .moves({ verbose: true })
    .filter((m) => {
      const s = new Chess(logik.PATT_STELLUNG);
      s.move(m);
      return s.isCheckmate();
    })
    .map((m) => `${m.from}${m.to}`)
    .sort();
  assert.deepEqual(matts, logik.MATTZUEGE.map((z) => `g1${z}`).sort());
});

console.log("3. Remis-Ursache");
test("Patt → 'patt'", () => {
  const s = new Chess(logik.PATT_STELLUNG);
  s.move({ from: "g1", to: "g6" });
  assert.equal(remisUrsacheVon(s), "patt");
});
test("König gegen König → 'material'", () => {
  assert.equal(remisUrsacheVon(new Chess("8/8/4k3/8/8/4K3/8/8 w - - 0 1")), "material");
});
test("dreifache Wiederholung → 'wiederholung'", () => {
  const s = new Chess();
  for (let i = 0; i < 2; i++) {
    s.move("Nf3");
    s.move("Nf6");
    s.move("Ng1");
    s.move("Ng8");
  }
  assert.equal(s.isThreefoldRepetition(), true);
  assert.equal(remisUrsacheVon(s), "wiederholung");
});
test("50-Züge-Regel → 'wiederholung'", () => {
  const s = new Chess("8/8/4k3/8/8/4K3/R7/7r w - - 99 80");
  s.move("Ra3");
  assert.equal(s.isDrawByFiftyMoves(), true);
  assert.equal(remisUrsacheVon(s), "wiederholung");
});
test("laufende Partie → 'sonst'", () => {
  assert.equal(remisUrsacheVon(new Chess()), "sonst");
});

console.log("4. Bot: Matt-in-1 und Patt-Vermeidung");
// Genau ein Mattzug für den Bot (Schwarz): Grundreihenmatt Ta8–a1# gegen Kg1 hinter f2/g2/h2.
const EIN_MATT = "r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1";
test("Test-Stellung hat genau einen Mattzug", () => {
  const s = new Chess(EIN_MATT);
  const matts = s.moves({ verbose: true }).filter((m) => {
    const t = new Chess(EIN_MATT);
    t.move(m);
    return t.isCheckmate();
  });
  assert.equal(matts.length, 1, `gefunden: ${matts.map((m) => m.san).join(", ")}`);
});
test(`ab Stufe ${bot.MATT_IMMER_AB_ELO} wird der Mattzug in 50 von 50 Läufen gespielt`, () => {
  const stufen = bot.WALDFREUNDE_STUFEN.filter((st) => st.elo >= bot.MATT_IMMER_AB_ELO);
  assert.ok(stufen.length > 0);
  for (const st of stufen) {
    for (let i = 0; i < 50; i++) {
      const s = new Chess(EIN_MATT);
      const zug = bot.waehleBotZug(s, st.elo);
      s.move(zug);
      assert.equal(s.isCheckmate(), true, `Stufe ${st.elo}, Lauf ${i + 1}: ${zug && zug.san}`);
    }
  }
});
// Patt-Falle: weißer Kh1 allein, schwarzer Kf2 + De3. Dg3 wäre Patt (Kh1 nicht im Schach,
// aber ohne Zug); es gibt reichlich andere Züge (u. a. Matt mit De1#/Dh3#).
const PATT_FALLE = "8/8/8/8/8/4q3/5k2/7K b - - 0 1";
test("Test-Stellung enthält einen Pattzug", () => {
  const pattZuege = new Chess(PATT_FALLE).moves({ verbose: true }).filter((m) => {
    const t = new Chess(PATT_FALLE);
    t.move(m);
    return t.isStalemate();
  });
  assert.ok(pattZuege.length >= 1, "keine Patt-Falle in der Test-Stellung");
});
test("keine Stufe wählt in 30 Läufen je einen Pattzug", () => {
  for (const st of bot.WALDFREUNDE_STUFEN) {
    for (let i = 0; i < 30; i++) {
      const s = new Chess(PATT_FALLE);
      s.move(bot.waehleBotZug(s, st.elo));
      assert.equal(s.isStalemate(), false, `Stufe ${st.elo} hat Patt gesetzt`);
    }
  }
});
test("Schildkröte (Stufe 250) wählt ebenfalls nie den Pattzug", () => {
  for (let i = 0; i < 50; i++) {
    const s = new Chess(PATT_FALLE);
    s.move(bot.waehleBotZug(s, 250));
    assert.equal(s.isStalemate(), false);
  }
});

console.log("5. Weitermachen, wo du aufgehört hast (Paket 3c)");
test("startEtappeFuer: 0→1, 1→2, 3→4, 4→5, Ausreißer gekappt", () => {
  assert.equal(logik.startEtappeFuer(0), 1);
  assert.equal(logik.startEtappeFuer(1), 2);
  assert.equal(logik.startEtappeFuer(3), 4);
  assert.equal(logik.startEtappeFuer(4), 5);
  assert.equal(logik.startEtappeFuer(9), 5);
  assert.equal(logik.startEtappeFuer(-2), 1);
  assert.equal(logik.startEtappeFuer(NaN), 1);
});
test("Rückkehr-Screen nur mit Zwischenstand", () => {
  assert.equal(logik.brauchtRueckkehr(0), false);
  for (let n = 1; n < logik.ETAPPEN_ANZAHL; n++) assert.equal(logik.brauchtRueckkehr(n), true);
});
test("Brückensatz für Etappe 3/4/5, keiner für 1/2", () => {
  assert.equal(logik.brueckenZeileFuer(1), null);
  assert.equal(logik.brueckenZeileFuer(2), null);
  for (const e of [3, 4, 5]) assert.equal(typeof logik.brueckenZeileFuer(e), "string");
});

// Zwischenstand-Speicher gegen einen In-Memory-Ersatz für AsyncStorage prüfen.
const speicher = new Map();
const asyncStorageErsatz = {
  getItem: async (k) => (speicher.has(k) ? speicher.get(k) : null),
  setItem: async (k, v) => void speicher.set(k, String(v)),
  removeItem: async (k) => void speicher.delete(k),
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@react-native-async-storage/async-storage") return { __esModule: true, default: asyncStorageErsatz };
  return originalLoad.apply(this, arguments);
};
const stand = require(path.join(SRC, "lib", "ganzePartieStand.ts"));
Module._load = originalLoad;

async function asyncTests() {
  const pruefe = async (name, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${name}\n      ${err.message}`);
    }
  };
  await pruefe("ohne Zwischenstand → 0", async () => {
    speicher.clear();
    assert.equal(await stand.ladeGanzePartieEtappe(), 0);
  });
  await pruefe("speichern nur steigend, laden liefert den höchsten Stand", async () => {
    speicher.clear();
    await stand.speichereGanzePartieEtappe(2);
    await stand.speichereGanzePartieEtappe(1);
    assert.equal(await stand.ladeGanzePartieEtappe(), 2);
    await stand.speichereGanzePartieEtappe(4);
    assert.equal(await stand.ladeGanzePartieEtappe(), 4);
  });
  await pruefe("löschen (Von vorn / Kapitelende / Eltern) → wieder 0", async () => {
    await stand.loescheGanzePartieEtappe();
    assert.equal(await stand.ladeGanzePartieEtappe(), 0);
  });
  await pruefe("kaputter Wert → 0, zu großer Wert → höchstens 4", async () => {
    speicher.set(stand.GANZE_PARTIE_ETAPPE_KEY, "quatsch");
    assert.equal(await stand.ladeGanzePartieEtappe(), 0);
    speicher.set(stand.GANZE_PARTIE_ETAPPE_KEY, "17");
    assert.equal(await stand.ladeGanzePartieEtappe(), 4);
  });
}

asyncTests().then(() => {
  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
  process.exit(failed ? 1 : 0);
});
