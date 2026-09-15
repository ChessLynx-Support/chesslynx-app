#!/usr/bin/env node
// Regressionstest für die ÜBUNGSSCHLEIFE der sechs Quests — der Pfad, der am 2026-09-14
// beim Android-Gerätetest zum Absturz geführt hat.
//
// Was dort passierte (gemessen, nicht vermutet):
//   Eichel auf a8  ->  Kind zieht Ra8+   (Schach gegen den schwarzen König auf e8)
//   mitWeissAmZug()  ->  Schwarz im Schach, Weiß am Zug: nach Schachregeln unmöglich
//   chess.js lädt das klaglos und bietet Rxe8 an  ->  Eichel zeigt auf e8
//   Kind tippt e8  ->  FEN ohne schwarzen König  ->  createPosition wirft  ->  ABSTURZ
//
// Möglich wurde das erst, als die Vorschlagslogik am 2026-09-11 auf "weit und ganz weit"
// umgestellt wurde. Der Defekt selbst steckte seit jeher in der Schleife — nur unerreichbar.
//
// Dieser Test spielt die Schleife für JEDE Übungsstellung über mehrere Runden durch, mit den
// ECHTEN Funktionen aus chessEngine.ts (TypeScript-require-Hook wie test-chessEngine.cjs),
// nicht mit Kopien. Genau deshalb wurden `mitWeissAmZug` und `waehleVorschlagZiel` am
// 2026-09-14 aus QuestMoveScreen.tsx dorthin verlegt: In einer TSX-Datei mit React-Importen
// waren sie von hier aus nicht ladbar und blieben ungetestet.
//
// Ausführen: `node verify/test-quest-uebungsschleife.cjs` (nach `npm install`).

const fs = require("fs");
const path = require("path");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("Konnte 'typescript' nicht laden — bitte einmalig `npm install` ausführen.");
  process.exit(1);
}
Module._extensions[".ts"] = function (mod, filename) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};

const E = require(path.join(__dirname, "..", "src", "lib", "chessEngine.ts"));

let failures = 0;
function check(label, bedingung, zusatz) {
  console.log((bedingung ? "OK   " : "FEHLT") + "  " + label + (zusatz ? "  (" + zusatz + ")" : ""));
  if (!bedingung) failures++;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const feld = (a) => ({ row: 8 - Number(a[1]), col: FILES.indexOf(a[0]) });
const name = (sq) => `${FILES[sq.col]}${8 - sq.row}`;

// Übungsfigur je Stellung. Bewusst ausgeschrieben statt hergeleitet: Bei screen4Blocked
// stehen ZWEI weiße Figuren auf dem Brett (Übungsfigur + Blockade), eine Automatik würde
// hier raten.
const SCHLEIFEN = [
  ["QUEST1.screen2", E.QUEST1_POSITIONS.screen2, "e2"],
  ["QUEST1.screen4Blocked", E.QUEST1_POSITIONS.screen4Blocked, "e2"],
  ["QUEST1.screen5Capture", E.QUEST1_POSITIONS.screen5Capture, "e2"],
  ["QUEST2.screen2", E.QUEST2_POSITIONS.screen2, "a1"],
  ["QUEST2.screen4Blocked", E.QUEST2_POSITIONS.screen4Blocked, "a1"],
  ["QUEST2.screen5Capture", E.QUEST2_POSITIONS.screen5Capture, "a1"],
  ["QUEST3.screen2", E.QUEST3_POSITIONS.screen2, "d4"],
  ["QUEST3.screen4Blocked", E.QUEST3_POSITIONS.screen4Blocked, "d4"],
  ["QUEST3.screen5Capture", E.QUEST3_POSITIONS.screen5Capture, "d4"],
  ["QUEST4.screen2", E.QUEST4_POSITIONS.screen2, "d4"],
  ["QUEST4.screen4Blocked", E.QUEST4_POSITIONS.screen4Blocked, "d4"],
  ["QUEST5.screen2", E.QUEST5_POSITIONS.screen2, "d4"],
  ["QUEST5.screen4Blocked", E.QUEST5_POSITIONS.screen4Blocked, "d4"],
  ["QUEST5.screen5Capture", E.QUEST5_POSITIONS.screen5Capture, "d4"],
  ["QUEST6.screen2", E.QUEST6_POSITIONS.screen2, "d4"],
  ["QUEST6.screen4Check", E.QUEST6_POSITIONS.screen4Check, "d4"],
  ["QUEST6.screen5Capture", E.QUEST6_POSITIONS.screen5Capture, "d4"],
];

const RUNDEN = 12;

console.log("\n1. Übungsschleife läuft durch, ohne zu werfen (" + RUNDEN + " Runden je Stellung)\n");

for (const [label, fen, startFeld] of SCHLEIFEN) {
  let fehler = null;
  let ort = feld(startFeld);
  let zuege = 0;
  try {
    let spiel = E.createPosition(fen);
    for (let runde = 0; runde < RUNDEN; runde++) {
      const ziele = E.legalTargetsFor(spiel, ort);
      // 0 Züge ist für QUEST1.screen4Blocked das RICHTIGE Ergebnis: Dort steht der
      // Springer direkt vor dem Bauern, der Screen lehrt genau diese Blockade.
      if (!ziele.length) break;
      const ziel = E.waehleVorschlagZiel(ziele, ort, runde);
      if (!ziel) break;
      if (!ziele.some((z) => z.row === ziel.row && z.col === ziel.col)) {
        throw new Error("Vorschlag " + name(ziel) + " ist kein Legalzug");
      }
      const ergebnis = E.tryMove(spiel, ort, ziel);
      if (!ergebnis.ok) throw new Error("tryMove lehnt den eigenen Vorschlag ab: " + name(ziel));
      // Genau diese Zeile warf beim Gerätetest:
      spiel = E.createPosition(E.mitWeissAmZug(ergebnis.fenAfter));
      ort = ziel;
      zuege++;
    }
  } catch (e) {
    fehler = e.message;
  }
  check(label, fehler === null, fehler ? fehler : zuege + " Züge");
}

console.log("\n2. Keine Könige als Füllfiguren (die Wurzel aller drei Fehler)\n");

// Ein schwarzer König in einer QuestMoveScreen-Stellung bringt das Schachgebot zurück und
// damit die unmögliche Stellung. Ein weißer König ist nur in Quest 6 zulässig — dort ist er
// die Übungsfigur.
for (const [label, fen] of SCHLEIFEN) {
  const brett = fen.split(" ")[0];
  const weissErlaubt = label.startsWith("QUEST6");
  check(label + ": kein schwarzer König", !brett.includes("k"));
  check(
    label + ": weißer König nur als Übungsfigur",
    weissErlaubt ? brett.includes("K") : !brett.includes("K")
  );
}

console.log("\n3. Das konkrete Absturzmuster von Quest 2 ist weg\n");

{
  let spiel = E.createPosition(E.QUEST2_POSITIONS.screen2);
  const erg = E.tryMove(spiel, feld("a1"), feld("a8"));
  check("Turm a1 -> a8 ist legal", erg.ok);
  check("Ra8 gibt KEIN Schach mehr", erg.isCheck === false);
  spiel = E.createPosition(E.mitWeissAmZug(erg.fenAfter));
  const abA8 = E.legalTargetsFor(spiel, feld("a8")).map(name);
  check("volle 8. Reihe erreichbar (f8/g8/h8)", ["f8", "g8", "h8"].every((f) => abA8.includes(f)), abA8.join(" "));
  // e8 DARF hier stehen — es ist ein leeres Feld. Entscheidend ist, dass dort kein König
  // mehr steht, der geschlagen werden könnte: genau das war der Absturz.
  check("auf dem Brett steht kein König mehr", !/[kK]/.test(spiel.fen().split(" ")[0]), spiel.fen().split(" ")[0]);
  check("14 Zielfelder ab a8", abA8.length === 14, abA8.length + " Felder");
}

console.log("\n" + (failures === 0 ? "Alle Prüfungen bestanden." : failures + " Prüfung(en) fehlgeschlagen."));
process.exit(failures === 0 ? 0 : 1);
