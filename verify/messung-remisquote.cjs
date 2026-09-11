#!/usr/bin/env node
// Messung (kein Test mit Bestanden/Fehlgeschlagen): wie oft enden Bot-gegen-Bot-Partien je
// Stufe unentschieden, und wie lang sind sie? Vorgabe aus bonuskapitel_ganze_partie_
// umsetzung_2026-09-10.md, Abschnitt 7d: ab Stufe 400 weniger als 30 % Remis, im Mittel
// unter 60 Züge (= 120 Halbzüge).
//
// Ausführen im Projektordner:  npm run messen:remis
//   optional: node verify/messung-remisquote.cjs 40   (Partien je Stufe, Standard 20)
//
// Jede Stufe spielt gegen sich selbst (Weiß und Schwarz gleiche Stufe). Partien, die nach
// 300 Halbzügen noch laufen, werden als "abgebrochen" gezählt (zählen zum Remis).

const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");

Module._extensions[".ts"] = function (mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};

const { Chess } = require("chess.js");
const bot = require(path.join(__dirname, "..", "src", "lib", "waldfreundeBot.ts"));
const { remisUrsacheVon } = require(path.join(__dirname, "..", "src", "lib", "remisUrsache.ts"));

const PARTIEN = Number(process.argv[2]) || 20;
const MAX_HALBZUEGE = 300;

const zeilen = [];
for (const stufe of bot.WALDFREUNDE_STUFEN) {
  const z = { elo: stufe.elo, weiss: 0, schwarz: 0, patt: 0, material: 0, wiederholung: 0, abgebrochen: 0, halbzuege: 0 };
  for (let i = 0; i < PARTIEN; i++) {
    const s = new Chess();
    let n = 0;
    while (!s.isGameOver() && n < MAX_HALBZUEGE) {
      const zug = bot.waehleBotZug(s, stufe.elo);
      if (!zug) break;
      s.move(zug);
      n++;
    }
    z.halbzuege += n;
    if (s.isCheckmate()) s.turn() === "b" ? z.weiss++ : z.schwarz++;
    else if (!s.isGameOver()) z.abgebrochen++;
    else {
      const u = remisUrsacheVon(s);
      if (u === "patt") z.patt++;
      else if (u === "material") z.material++;
      else z.wiederholung++;
    }
  }
  zeilen.push(z);
  const remis = z.patt + z.material + z.wiederholung + z.abgebrochen;
  const quote = Math.round((100 * remis) / PARTIEN);
  const zuege = Math.round(z.halbzuege / PARTIEN / 2);
  const ziel = stufe.elo >= 400 ? (quote < 30 && zuege < 60 ? "✓" : "✗") : " ";
  console.log(
    `${ziel} Stufe ${String(stufe.elo).padStart(4)}: Remis ${String(quote).padStart(3)} %  ` +
      `(Patt ${z.patt}, Material ${z.material}, Wiederholung/50 ${z.wiederholung}, abgebrochen ${z.abgebrochen})  ` +
      `Matt ${z.weiss + z.schwarz}/${PARTIEN}  Ø ${zuege} Züge`
  );
}
console.log(`\nZiel ab Stufe 400: Remis < 30 %, Ø < 60 Züge. ${PARTIEN} Partien je Stufe.`);
