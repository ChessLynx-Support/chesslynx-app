#!/usr/bin/env node
/**
 * ChessLynx — Selbsttest für scripts/lichess_endlosmodus.cjs
 * =========================================================
 *
 * Erzeugt eine kleine Lichess-förmige Test-CSV mit Fällen, deren richtige Antwort vorher
 * feststeht, lässt den Filter darüber laufen und prüft das Ergebnis. Damit ist das Werkzeug
 * überprüfbar, ohne den 300-MB-Dump herunterzuladen.
 *
 * Aufruf (Windows PowerShell, im Repo-Ordner):
 *   node scripts\lichess_endlosmodus_testdaten.cjs
 *
 * Exit-Code 0 = alles wie erwartet, 1 = mindestens eine Abweichung.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { Chess } = require("chess.js");

const HIER = __dirname;
const CSV = path.join(HIER, "testdaten_lichess.csv");
const AUSGABE = path.join(HIER, "testausgabe_lichess");
const FILTER = path.join(HIER, "lichess_endlosmodus.cjs");

// ─────────────────────────────────────────────────────────────────────── Testfälle
//
// Felder: Id · FEN vor dem Gegnerzug · "gegnerzug kindzug" · Rating · erwartete Motive
// · erwartete Zusatzaussage (optional)
const FAELLE = [
  { id: "T_GEWINN", fen: "k7/2n5/8/8/8/3R4/8/7K b - - 0 1", zuege: "c7d5 d3d5", rating: 700, motive: ["figur_gewinnen"] },
  { id: "T_GABEL", fen: "k7/4r3/8/1N6/8/8/8/7K b - - 0 1", zuege: "e7e8 b5c7", rating: 700, motive: ["gabel"] },
  { id: "T_FESSEL", fen: "4k3/8/8/8/5n2/8/8/R6K b - - 0 1", zuege: "f4e6 a1e1", rating: 700, motive: ["fesselung_setzen"] },
  { id: "T_SPIESS", fen: "q7/8/8/8/k7/8/7K/7R b - - 0 1", zuege: "a4a5 h1a1", rating: 700, motive: ["spiess"] },
  { id: "T_VERT_WEG", fen: "7k/8/8/8/1b6/8/5R2/7K b - - 0 1", zuege: "b4c5 f2a2", rating: 700, motive: ["verteidigen"], weg: "wegziehen" },
  { id: "T_VERT_DECK", fen: "6k1/3r4/8/8/3B4/8/8/R6K b - - 0 1", zuege: "d7d8 a1d1", rating: 700, motive: ["verteidigen"], weg: "decken" },
  { id: "T_VERT_SCHLAG", fen: "k7/8/8/2b5/3R4/8/8/1R5K b - - 0 1", zuege: "c5b6 b1b6", rating: 700, motive: ["verteidigen"], weg: "angreifer_schlagen" },
  { id: "T_ERKENNEN", fen: "7k/8/4p2p/3n2b1/6r1/8/8/6RK b - - 0 1", zuege: "g4a4 g1g2", rating: 700, motive: ["deckung_erkennen"] },

  // ── Die beiden Fälle zur Korrektur vom 19.09. (Rating ist kein Lernwert-Maß) ──
  //
  // Hoch bewertetes Puzzle mit identischer Geometrie wie T_GEWINN: Es MUSS durchkommen.
  // Früher hätte das Rating-Tor (≤1000) es verworfen, obwohl die Stellung didaktisch
  // genauso klar ist — genau der Punkt der Korrektur.
  {
    id: "T_HOHES_RATING",
    fen: "k7/2n5/8/8/8/3R4/8/7K b - - 0 1",
    zuege: "c7d5 d3d5",
    rating: 1850,
    motive: ["figur_gewinnen"],
  },
  // Mehrdeutige Lösung: ZWEI ungedeckte schwarze Figuren sind vom selben Turm schlagbar
  // (Springer d8 und Läufer a4). Das Motiv trifft zu, aber `eindeutig` muss false sein —
  // als Übungsaufgabe taugt das nicht, weil das Kind mit dem "falschen" richtigen Zug
  // kein Erfolgserlebnis bekäme.
  {
    id: "T_MEHRDEUTIG",
    fen: "8/7k/2n5/8/b2R4/8/8/7K b - - 0 1",
    zuege: "c6d8 d4d8",
    rating: 700,
    motive: ["figur_gewinnen"],
    eindeutig: false,
  },

  // ── Gegenproben: dürfen NICHT erkannt werden ──
  // Gegenprobe für "Figur gewinnen": Der Springer d5 ist vom Turm d7 gedeckt, das Schlagen
  // wäre ein Tausch, kein sauberer Gewinn. Als deckung_erkennen ist dieselbe Stellung aber
  // sehr wohl gültig (gedeckter Springer, ungedeckter Turm) — deshalb hier "nicht" statt
  // "gar nichts". Genau das hat der Test aufgedeckt, als die Deckungs-Regel gelockert wurde.
  {
    id: "T_NEIN_TAUSCH",
    fen: "k7/2nr4/8/8/8/3R4/8/7K b - - 0 1",
    zuege: "c7d5 d3d5",
    rating: 700,
    motive: [],
    nicht: ["figur_gewinnen"],
  },
  // Zu lange Kombination (7 Halbzüge): bleibt draußen.
  {
    id: "T_NEIN_ZULANG",
    fen: "k7/2n5/8/8/8/3R4/8/7K b - - 0 1",
    zuege: "c7d5 d3d5 a8b8 d5d8 b8b7 d8d7 b7b6",
    rating: 700,
    motive: [],
  },

  // ── Nur-Weiß: Schwarz-am-Zug muss gespiegelt ankommen ──
  //
  // Dieselbe Aufgabe wie T_GEWINN, nur mit vertauschten Farben. Ohne Spiegelung müsste das
  // Kind Schwarz spielen und das Brett gedreht werden. Erwartet: kommt durch, `kindFarbe` ist
  // "w", `gespiegelt` ist true.
  {
    id: "T_GESPIEGELT",
    fen: "7k/3r4/8/8/8/8/2N5/K7 w - - 0 1",
    zuege: "c2d4 d7d4",
    rating: 700,
    motive: ["figur_gewinnen"],
    gespiegelt: true,
  },

  // ── Verteidigen: Schlagen ist stärker als Wegziehen ──
  //
  // Der Turm wird vom Läufer angegriffen UND ein anderer Turm kann den Läufer schlagen.
  // Wegziehen wäre legal, aber schwächer. Lux muss "Angreifer schlagen" als stärksten Weg
  // einordnen, und der Lichess-Lösungszug tut genau das (stimmtMitLoesung).
  {
    id: "T_VERT_BESTER",
    fen: "k7/8/8/2b5/3R4/8/8/1R5K b - - 0 1",
    zuege: "c5b6 b1b6",
    rating: 700,
    motive: ["verteidigen"],
    besterWegHier: "angreifer_schlagen",
    stimmtMitLoesung: true,
  },

  // ── Der Fall, an dem der erste Volllauf gescheitert ist ──
  //
  // Dieselbe Gabel wie T_GABEL, aber als ECHTES Lichess-Puzzle mit Fortsetzung: Gabel,
  // König flieht, Turm wird abgeholt (4 Halbzüge). Genau diese Bauart hat der frühere
  // "strikt einzügig"-Filter ausgeschlossen — und damit im ganzen Datensatz 0 Gabeln,
  // 0 Spieße und 1 Fesselung übrig gelassen. Muss jetzt gefunden werden, gewertet wird
  // der ERSTE Kindzug (die Gabel selbst).
  {
    id: "T_GABEL_MIT_FORTSETZUNG",
    fen: "k7/4r3/8/1N6/8/8/8/7K b - - 0 1",
    zuege: "e7e8 b5c7 a8b7 c7e8",
    rating: 1400,
    motive: ["gabel"],
    kindzuege: 2,
  },
];

// ───────────────────────────────────────────────────── CSV schreiben (mit Selbstprüfung)
const kopf = "PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags";
const zeilen = [kopf];
for (const f of FAELLE) {
  const b = new Chess(f.fen);
  for (const z of f.zuege.split(" ")) {
    try {
      b.move({ from: z.slice(0, 2), to: z.slice(2, 4), promotion: "q" });
    } catch {
      console.error(`❌ TESTDATEN FEHLERHAFT bei ${f.id}: Zug ${z} ist nicht legal in ${b.fen()}`);
      process.exit(1);
    }
  }
  // Themes großzügig setzen, damit der Tag-Vorfilter die Fälle nicht vorab wegwirft.
  zeilen.push(
    `${f.id},${f.fen},${f.zuege},${f.rating},70,95,5000,hangingPiece fork pin skewer oneMove,https://lichess.org/test,`
  );
}
fs.writeFileSync(CSV, zeilen.join("\n") + "\n");
console.log(`${FAELLE.length} Testfälle geschrieben, alle Züge gegen chess.js als legal bestätigt.\n`);

// ───────────────────────────────────────────────────────────────── Filter laufen lassen
fs.rmSync(AUSGABE, { recursive: true, force: true });
execFileSync(process.execPath, [FILTER, CSV, "--out", AUSGABE], { stdio: "inherit" });

// ───────────────────────────────────────────────────────────────────────── Auswertung
const gefunden = {}; // id → { motiv → eintrag }
for (const datei of fs.existsSync(AUSGABE) ? fs.readdirSync(AUSGABE) : []) {
  if (!datei.endsWith(".json")) continue;
  const motiv = datei.replace(/\.json$/, "");
  // Die Ausgabedatei ist seit dem Band-Umbau nach Figurenband gruppiert: { klein: [...],
  // mittel: [...], gross: [...] }. Für den Test ist das Band egal, wir ziehen alle zusammen —
  // merken uns aber, in welchem Band der Fall gelandet ist.
  const nachBand = JSON.parse(fs.readFileSync(path.join(AUSGABE, datei), "utf8"));
  for (const [band, liste] of Object.entries(nachBand)) {
    for (const e of liste) (gefunden[e.id] ??= {})[motiv] = { ...e, band };
  }
}

let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? "✅" : "❌"} ${text}`);
  if (!ok) fehler++;
};

console.log("\n══ Auswertung ══\n");
for (const f of FAELLE) {
  const treffer = gefunden[f.id] ?? {};
  const namen = Object.keys(treffer).sort();

  for (const erwartet of f.motive) {
    pruefe(namen.includes(erwartet), `${f.id}: als "${erwartet}" erkannt`);
  }
  if (f.nicht) {
    for (const verboten of f.nicht) {
      pruefe(!namen.includes(verboten), `${f.id}: NICHT als "${verboten}" erkannt`);
    }
  } else if (f.motive.length === 0) {
    pruefe(namen.length === 0, `${f.id}: korrekt verworfen${namen.length ? ` (fälschlich in ${namen.join(", ")})` : ""}`);
  }
  if (f.weg) {
    pruefe(treffer.verteidigen?.motive.verteidigen.weg === f.weg, `${f.id}: Weg "${f.weg}" richtig bestimmt`);
  }
  if (f.eindeutig === false) {
    const e = treffer[f.motive[0]];
    pruefe(e?.motive[f.motive[0]].eindeutig === false, `${f.id}: als NICHT eindeutig erkannt (mehrere Lösungszüge)`);
  }
  if (f.rating >= 1500) {
    pruefe(namen.length > 0, `${f.id}: hohes Rating (${f.rating}) führt NICHT mehr zum Ausschluss`);
  }
  if (f.gespiegelt) {
    const e = treffer[f.motive[0]];
    pruefe(e?.gespiegelt === true, `${f.id}: Schwarz-Stellung wurde gespiegelt`);
    pruefe(e?.kindFarbe === "w", `${f.id}: Kind spielt danach Weiß (kein gedrehtes Brett nötig)`);
  }
  if (f.besterWegHier) {
    const e = treffer.verteidigen;
    pruefe(
      e?.motive.verteidigen.besterWegHier === f.besterWegHier,
      `${f.id}: stärkster Weg als "${f.besterWegHier}" eingeordnet (Begründung: ${e?.motive.verteidigen.begruendung ?? "—"})`
    );
    pruefe(
      e?.motive.verteidigen.stimmtMitLoesung === f.stimmtMitLoesung,
      `${f.id}: Einordnung deckt sich mit dem Lichess-Lösungszug`
    );
  }
  if (f.kindzuege) {
    const e = treffer[f.motive[0]];
    pruefe(
      e?.kindzuegeGesamt === f.kindzuege,
      `${f.id}: mehrzügiges Puzzle akzeptiert, ${f.kindzuege} Kindzüge erkannt (gewertet wird der erste)`
    );
  }
}

// Bandzuordnung: alle Testfälle sind Miniaturen und müssen im Band "klein" bzw. "mittel"
// landen — nie in "gross".
for (const f of FAELLE.filter((x) => x.motive.length)) {
  const e = gefunden[f.id]?.[f.motive[0]];
  if (!e) continue;
  const erwartet = e.figuren <= 7 ? "klein" : e.figuren <= 12 ? "mittel" : "gross";
  pruefe(e.band === erwartet, `${f.id}: im Band "${erwartet}" einsortiert (${e.figuren} Figuren)`);
}

// Die eindeutigen Fälle müssen auch als eindeutig markiert sein — sonst wäre das Maß wertlos.
for (const id of ["T_GEWINN", "T_GABEL", "T_FESSEL", "T_SPIESS"]) {
  const motiv = FAELLE.find((f) => f.id === id).motive[0];
  const e = gefunden[id]?.[motiv];
  pruefe(e?.motive[motiv].eindeutig === true, `${id}: als eindeutig markiert`);
}

console.log(fehler === 0 ? "\n✅ Alle Prüfungen bestanden." : `\n❌ ${fehler} Prüfung(en) fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
