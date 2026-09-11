#!/usr/bin/env node
// Endspiel-Hilfe der Freispiel-Bots (2026-09-11) — prüft die ECHTE lib/waldfreundeBot.ts
// (gleicher TS-require-Hook wie test-ganze-partie-logic.cjs).
//
//   1. Erkennung: istGewonnenesEndspiel / endspielBonus liefern plausible Werte.
//   2. Dame + König gegen König: der Bot setzt auf allen Stufen fast immer Matt
//      (Verteidiger zieht zufällig), statt endlos hin- und herzuziehen.
//   3. Turm + König gegen König: der Bot setzt ab Stufe 400 meistens Matt.
//   4. Bauer + König gegen König: der Bauer wird umgewandelt.
//   5. Sicherheit: im gewonnenen Endspiel stellt keine Stufe die Dame neben den König.
//   6. Wiederholung: keine Stufe wählt einen Zug in die dreifache Wiederholung, wenn es
//      andere gibt.
//
// Die Partien sind zufällig — die Schwellen sind deshalb mit Abstand zu den gemessenen
// Werten gewählt (siehe Kommentare), damit der Test nicht sporadisch rot wird.
//
// Ausführen: `node verify/test-bot-endspiel.cjs` im Projektverzeichnis (nach npm install).

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

/** Bot (am Zug in `fen`) gegen einen zufällig ziehenden Verteidiger. */
function spieleAus(fen, elo, maxBotZuege) {
  const spiel = new Chess(fen);
  const botFarbe = spiel.turn();
  let botZuege = 0;
  let umgewandelt = false;
  while (!spiel.isGameOver() && botZuege < maxBotZuege) {
    if (spiel.turn() === botFarbe) {
      const zug = bot.spieleBotZug(spiel, elo);
      if (zug && zug.promotion) umgewandelt = true;
      botZuege++;
    } else {
      const zuege = spiel.moves();
      spiel.move(zuege[Math.floor(Math.random() * zuege.length)]);
    }
  }
  return { matt: spiel.isCheckmate() && spiel.turn() !== botFarbe, botZuege, umgewandelt, remis: spiel.isDraw() };
}

function quote(fen, elo, laeufe, maxBotZuege, kriterium = (e) => e.matt) {
  let treffer = 0;
  let zuegeSumme = 0;
  for (let i = 0; i < laeufe; i++) {
    const e = spieleAus(fen, elo, maxBotZuege);
    if (kriterium(e)) {
      treffer++;
      zuegeSumme += e.botZuege;
    }
  }
  return { anteil: treffer / laeufe, schnitt: treffer ? zuegeSumme / treffer : 0 };
}

const DAME_GEGEN_KOENIG = "8/8/8/4k3/8/8/8/3QK3 w - - 0 1";
const TURM_GEGEN_KOENIG = "8/8/8/3k4/8/8/8/R3K3 w - - 0 1";
const BAUER_GEGEN_KOENIG = "8/8/8/8/8/2k5/4P3/4K3 w - - 0 1";
const STUFEN = [250, 600, 1300];
const MESSEN = process.argv.includes("--messen");

console.log("\nEndspiel-Hilfe der Freispiel-Bots\n");

test("Erkennung: D+K gegen K ist gewonnen (für Weiß), Grundstellung nicht", () => {
  assert.equal(bot.istGewonnenesEndspiel(DAME_GEGEN_KOENIG, "w"), true);
  assert.equal(bot.istGewonnenesEndspiel(DAME_GEGEN_KOENIG, "b"), false);
  assert.equal(bot.istGewonnenesEndspiel(new Chess().fen(), "w"), false);
  // Gegner hat noch zu viel (Dame): trotz Vorsprung kein "gewonnenes Endspiel".
  assert.equal(bot.istGewonnenesEndspiel("8/8/8/3k4/8/3q4/8/RR2K2R w - - 0 1", "w"), false);
});

test("Bonus: gegnerischer König in der Ecke > im Zentrum; nahe Könige > ferne", () => {
  const ecke = bot.endspielBonus("k7/8/8/8/8/8/8/3QK3 w - - 0 1", "w");
  const mitte = bot.endspielBonus("8/8/8/3k4/8/8/8/4K2Q w - - 0 1", "w");
  assert.ok(ecke > mitte, `${ecke} > ${mitte}`);
  const nah = bot.endspielBonus("8/8/8/3k4/8/3K4/8/7Q w - - 0 1", "w");
  assert.ok(nah > mitte, `${nah} > ${mitte}`);
  assert.ok(ecke < 1 && nah < 1, "Bonus bleibt unter einer Bauerneinheit");
});

// Gemessen (je 60–80 Läufe): alle Stufen ≥ 99 % Matt (vorher, ohne Endspiel-Hilfe: 3–5 %)
// — Schwelle 85 %.
for (const elo of STUFEN) {
  test(`D+K gegen K: Stufe ${elo} setzt Matt (≥ 85 % von 20 Läufen, max. 60 Züge)`, () => {
    const q = quote(DAME_GEGEN_KOENIG, elo, 20, 60);
    if (MESSEN) console.log(`      ${Math.round(q.anteil * 100)} % Matt, Ø ${q.schnitt.toFixed(1)} Züge`);
    assert.ok(q.anteil >= 0.85, `nur ${Math.round(q.anteil * 100)} % Matt`);
  });
}

// Turm-Matt: gemessen 93–100 % (Stufe 250–1000) — Schwelle 50 %.
for (const elo of [400, 1000]) {
  test(`T+K gegen K: Stufe ${elo} setzt meistens Matt (≥ 50 % von 20 Läufen, max. 80 Züge)`, () => {
    const q = quote(TURM_GEGEN_KOENIG, elo, 20, 80);
    if (MESSEN) console.log(`      ${Math.round(q.anteil * 100)} % Matt, Ø ${q.schnitt.toFixed(1)} Züge`);
    assert.ok(q.anteil >= 0.5, `nur ${Math.round(q.anteil * 100)} % Matt`);
  });
}

// Bauer: gemessen ≈ 90 % (vorher 40–48 %) — Schwelle 75 %.
for (const elo of [250, 700]) {
  test(`B+K gegen K: Stufe ${elo} wandelt den Bauern um (≥ 75 % von 40 Läufen)`, () => {
    const q = quote(BAUER_GEGEN_KOENIG, elo, 40, 40, (e) => e.umgewandelt);
    if (MESSEN) console.log(`      ${Math.round(q.anteil * 100)} % umgewandelt`);
    assert.ok(q.anteil >= 0.75, `nur ${Math.round(q.anteil * 100)} % umgewandelt`);
  });
}

test("Sicherheit: keine Stufe stellt die Dame neben den gegnerischen König (Dd4 in 8/8/8/3k4/8/8/8/Q6K)", () => {
  const fen = "8/8/8/3k4/8/8/8/Q6K w - - 0 1";
  for (const elo of [250, 400, 1300]) {
    for (let i = 0; i < 100; i++) {
      const zug = bot.waehleBotZug(new Chess(fen), elo);
      assert.notEqual(zug.to, "d4", `Stufe ${elo} spielt Dd4??`);
    }
  }
});

test("Wiederholung: kein Zug in die dreifache Wiederholung (Sg8 nach Sf3 Sf6 Sg1 Sg8 Sf3 Sf6 Sg1)", () => {
  for (const elo of [250, 700, 1300]) {
    for (let i = 0; i < 100; i++) {
      const spiel = new Chess();
      for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1"]) spiel.move(san);
      const zug = bot.waehleBotZug(spiel, elo);
      assert.ok(!(zug.from === "f6" && zug.to === "g8"), `Stufe ${elo} wiederholt dreifach`);
    }
  }
});

test("Matt in 1 hat weiter Vorrang (Stufe 400, 50 Läufe)", () => {
  // Weiß: Kg6, Db1 — Db8 ist Matt.
  const fen = "7k/8/6K1/8/8/8/8/1Q6 w - - 0 1";
  for (let i = 0; i < 50; i++) {
    const spiel = new Chess(fen);
    bot.spieleBotZug(spiel, 400);
    assert.ok(spiel.isCheckmate(), "kein Matt gespielt");
  }
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed ? 1 : 0);
