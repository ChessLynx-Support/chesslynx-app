#!/usr/bin/env node
/**
 * ChessLynx — Lichess-Kandidaten für die ENDLOSMODUS-ÜBUNGSSPALTEN
 * ================================================================
 *
 * Zweck (Entscheidung Christian, 2026-09-19, siehe
 * claude/lueckenanalyse_deckung_lernkurve_2026-09-19.md):
 * Die bisherigen Übungsstellungen sind prozedural selbst erzeugt und nur auf LEGALITÄT
 * geprüft — daher die wiederkehrenden Probleme (Fesselungs-Bug 16.9., "Aufgaben zu leicht",
 * "Zielfigur immer ein schwarzer Springer"). Dieses Werkzeug ersetzt die Eigenerzeugung durch
 * die CC0-Puzzle-Datenbank von Lichess: dort ist jede Stellung von Menschen gespielt und
 * empirisch bewertet (Rating, Popularity, NbPlays).
 *
 * ABGRENZUNG zu scripts/lichess_filter.py: Jenes Skript baut den Pool für die
 * Lichess-KAMPAGNE (Update 2, März 2027) — lange Lösungen, Rush-Pool, Matt-Themen.
 * DIESES Skript sucht Material für die ENDLOSMODUS-SPALTEN: strikt einzügig, wenige Figuren,
 * und mit einer didaktischen Nachprüfung je Motiv. Die beiden ersetzen einander nicht.
 *
 * Läuft bewusst auf chess.js — derselben Engine wie die App selbst (Projektregel: Stellungen
 * immer gegen echtes chess.js prüfen, nie von Hand). Was hier durchkommt, verhält sich in der
 * App garantiert genauso.
 *
 * AUFRUF (Windows PowerShell, im Repo-Ordner):
 *   npm install fzstd
 *   node scripts\lichess_endlosmodus.cjs C:\Pfad\zu\lichess_db_puzzle.csv.zst
 *
 * Optionen:
 *   --out <ordner>     Zielordner (Standard: .\lichess_kandidaten)
 *   --limit <n>        nur die ersten n Zeilen lesen (für einen schnellen Testlauf)
 *   --max-figuren <n>  Gesamt-Obergrenze Figurenzahl (Standard: 20; gesammelt wird in
 *                      drei Bändern 2–7 / 8–12 / 13–20, passend zu den drei Stufen)
 *   --max-rating <n>   Obergrenze Rating (Standard: KEINE — siehe EINSTELLUNGEN)
 *   --max-pro-motiv <n> Obergrenze Kandidaten je Motiv (Standard: 3000)
 *   --beide-farben     Schwarz-Stellungen NICHT spiegeln (Standard: spiegeln, damit
 *                      das Kind immer Weiß spielt und das Brett nie gedreht wird)
 *
 * AUSGABE: je Motiv eine JSON-Datei mit Kandidaten plus eine Übersichtstabelle auf dem
 * Bildschirm. Die Kandidaten sind AUSWAHLVORSCHLÄGE, keine fertigen Aufgaben — sie werden
 * anschließend von Hand kuratiert (so wie bisher auch).
 */

const fs = require("fs");
const path = require("path");
const { Chess } = require("chess.js");

// ────────────────────────────────────────────────────────────── Einstellungen

const EINSTELLUNGEN = {
  // Figurenzahl: Lichess-Median ist 18. Statt einer einzigen Obergrenze wird jetzt in drei
  // BÄNDER gesammelt (Christian, 19.09.: "Eine weitere Einschränkung können wir bei Bedarf
  // anheben. Die Anzahl der Figuren."). Das passt zur 10/8/5-Eskalation der Spalten: Stufe 1
  // braucht aufgeräumte Bretter, Stufe 3 will laut Konzept ausdrücklich "echte Partie-Optik"
  // mit viel Material. Eine harte Obergrenze hätte für Stufe 3 genau das Falsche geliefert.
  baender: [
    { name: "klein", von: 2, bis: 7 },   // Stufe 1 — das Motiv steht praktisch allein da
    { name: "mittel", von: 8, bis: 12 }, // Stufe 2
    { name: "gross", von: 13, bis: 20 }, // Stufe 3 — volles Brett
  ],
  maxFiguren: 20, // Gesamt-Obergrenze; per --max-figuren änderbar

  // KEIN Rating-Tor mehr (Korrektur Christian, 19.09.2026):
  // "Die Fesselung muss sich nicht nur auf Elo <1000 beziehen. Wie der Spieler zu der Stellung
  //  gekommen ist, ist uninteressant für den Lernwert."
  // Das trifft zu. Das Lichess-Rating misst, wie schwer der Zug für einen GEWERTETEN SPIELER zu
  // FINDEN ist — nicht, wie klar die Stellung ein Motiv ZEIGT. Eine Fesselung aus einem
  // 1600er-Puzzle kann didaktisch völlig eindeutig sein; ein 600er-Eröffnungspuzzle mit 27
  // Figuren ist es nicht. Ein Rating-Tor wirft also gutes Material aus dem falschen Grund weg.
  // Was stattdessen zählt, wird jetzt wirklich gemessen: Figurenzahl, EINDEUTIGKEIT der Lösung,
  // Klarheit des Motivs und die Weglänge auf dem Brett (siehe `eindeutig`/`zugweite`/
  // `zielweite` unten). Das Rating wird weiterhin mitgeführt — als letztes Sortierkriterium und
  // zur Ansicht —, ist aber kein Ausschlusskriterium mehr.
  maxRating: null, // null = unbegrenzt; per --max-rating bei Bedarf wieder setzbar

  // Die folgenden zwei sind bewusst KEINE Schwierigkeits-, sondern Datenqualitätsfilter:
  // RatingDeviation zeigt, wie stabil das Puzzle vermessen ist, Popularity ist das
  // Daumen-hoch/runter-Verhältnis der Spieler. Beide sagen nichts über den Schwierigkeitsgrad
  // und dürfen deshalb bleiben.
  maxRatingAbweichung: 100,
  minPopularity: 80,
  minNbPlays: 500,

  maxProMotiv: 3000, // Obergrenze je Motiv; per --max-pro-motiv änderbar

  // Nur Weiß: Schwarz-am-Zug-Stellungen werden gespiegelt statt verworfen (siehe spiegeleFen).
  // Damit spielt das Kind immer Weiß und das Brett muss nie gedreht werden.
  // --beide-farben schaltet es ab (dann kommen Schwarz-Stellungen ungespiegelt durch).
  nurWeiss: true,
  // Tags, die für unsere Zielgruppe raus müssen (Sonderregeln oder zu lange Lösungen).
  ausschluss: new Set(["underPromotion", "veryLong", "long", "enPassant"]),
};

const FIGURENWERT = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// ────────────────────────────────────────────────────────────── Brett-Hilfen

/** Alle belegten Felder der Stellung. */
function felder(brett) {
  const raus = [];
  for (const reihe of brett.board()) {
    for (const feld of reihe) if (feld) raus.push(feld); // {square, type, color}
  }
  return raus;
}

const gegner = (farbe) => (farbe === "w" ? "b" : "w");

/** Steht auf diesem Feld eine Figur der Farbe `farbe`, die NIEMAND der eigenen Seite deckt? */
function istUngedeckt(brett, feld, farbe) {
  return brett.attackers(feld, farbe).length === 0;
}

/** Wird das Feld von der Gegenseite angegriffen? */
function wirdAngegriffen(brett, feld, vonFarbe) {
  return brett.attackers(feld, vonFarbe).length > 0;
}

/**
 * Hängt diese Figur wirklich? "Hängen" heißt für uns kindgerecht: sie wird angegriffen UND
 * niemand deckt sie. Bewusst KEINE vollständige Abtauschrechnung — die ist für Fünfjährige
 * nicht nachvollziehbar und war genau die Quelle der bisherigen Fehlurteile.
 */
function haengt(brett, feld, farbe) {
  return wirdAngegriffen(brett, feld, gegner(farbe)) && istUngedeckt(brett, feld, farbe);
}

/** Zieht einen Zug auf einer Kopie und gibt das neue Brett zurück (oder null). */
function nachZug(fen, zugUci) {
  const b = new Chess(fen);
  try {
    b.move({ from: zugUci.slice(0, 2), to: zugUci.slice(2, 4), promotion: zugUci[4] || "q" });
  } catch {
    return null;
  }
  return b;
}

// ────────────────────────────────────────── Nur Weiß spielen (Spiegelung statt Brettdrehung)
//
// Christian, 19.09.: "Ist es anhand der gefundenen Stellungen möglich, nur weiß zu spielen um
// das drehen des Brettes zu verhindern."
//
// Ja. Schwarz-am-Zug-Stellungen werden GESPIEGELT: Brett auf den Kopf, Figurenfarben
// getauscht. Die entstehende Stellung ist geometrisch dieselbe Aufgabe, nur spielt sie jetzt
// Weiß. Das Kind sieht dadurch IMMER von unten auf weiße Figuren — kein gedrehtes Brett,
// keine gespiegelten Hinweise ("oben rechts" heißt immer dasselbe).
//
// KLARSTELLUNG (nach dem Volllauf vom 19.09.): Die Spiegelung VERMEHRT das Material nicht.
// Schwarz-Stellungen wurden vorher nicht verworfen, sie hatten nur `kindFarbe: "b"` — die
// Kandidatenzahlen sind vor und nach dieser Änderung Zeile für Zeile identisch. Der Gewinn
// liegt allein darin, dass die App ohne Brettdrehung auskommt.
//
// Sicherheitsnetz: Nach der Spiegelung wird die Motiverkennung ganz normal erneut
// durchlaufen. Was nach dem Spiegeln kein sauberes Motiv mehr ist, fliegt raus — die
// Korrektheit hängt also nicht daran, dass die Spiegelung fehlerfrei ist.

/** Spiegelt ein Feld an der Brettmitte: e2 → e7, a1 → a8. */
function spiegeleFeld(feld) {
  return feld[0] + String(9 - Number(feld[1]));
}

/** Spiegelt einen UCI-Zug mitsamt Umwandlungsfigur. */
function spiegeleZug(uci) {
  return spiegeleFeld(uci.slice(0, 2)) + spiegeleFeld(uci.slice(2, 4)) + (uci[4] || "");
}

/**
 * Spiegelt eine ganze Stellung: Reihen umdrehen, Groß-/Kleinschreibung der Figuren tauschen
 * (= Farbwechsel), Zugrecht tauschen, Rochaderechte tauschen, En-passant-Feld spiegeln.
 */
function spiegeleFen(fen) {
  const [brett, amZug, rochade, ep, halb, voll] = fen.split(" ");
  const reihen = brett.split("/").reverse();
  const farbeTauschen = (z) => (z === z.toUpperCase() ? z.toLowerCase() : z.toUpperCase());
  const neuesBrett = reihen
    .map((r) => r.split("").map((z) => (/[a-zA-Z]/.test(z) ? farbeTauschen(z) : z)).join(""))
    .join("/");
  const neueRochade =
    rochade === "-" ? "-" : rochade.split("").map(farbeTauschen).sort().join("") || "-";
  return [
    neuesBrett,
    amZug === "w" ? "b" : "w",
    neueRochade,
    ep === "-" ? "-" : spiegeleFeld(ep),
    halb,
    voll,
  ].join(" ");
}

// ─────────────────────────────────────────────── Motiv-Erkennung (die eigentliche Arbeit)
//
// Jede Funktion bekommt: das Brett VOR dem Kindzug, den Lösungszug (UCI) und die Farbe des
// Kindes. Sie gibt entweder null zurück (Motiv trifft nicht zu) oder ein kleines Objekt mit
// den Angaben, die wir für Hinweistexte brauchen. Dadurch ist jede Zuordnung im Nachhinein
// nachvollziehbar und nicht nur "Lichess hat es so getaggt".

/** „Figur gewinnen" — der Lösungszug schlägt eine Figur, die wirklich ungedeckt dasteht. */
function motivFigurGewinnen(vorher, zug, kind) {
  const zielFeld = zug.slice(2, 4);
  const opfer = vorher.get(zielFeld);
  if (!opfer || opfer.color === kind) return null;
  if (!istUngedeckt(vorher, zielFeld, gegner(kind))) return null; // gedeckt → kein sauberes Motiv
  const nachher = nachZug(vorher.fen(), zug);
  if (!nachher) return null;
  // Nach dem Schlagen darf auf dem Zielfeld nichts zurückschlagen — sonst ist es ein Tausch.
  if (nachher.attackers(zielFeld, gegner(kind)).length > 0) return null;
  return { geschlagen: opfer.type, wert: FIGURENWERT[opfer.type], zielFeld };
}

/** „Gabel" — nach dem Zug bedroht die gezogene Figur mindestens zwei lohnende Ziele. */
function motivGabel(vorher, zug, kind) {
  const nachher = nachZug(vorher.fen(), zug);
  if (!nachher) return null;
  const von = zug.slice(2, 4);
  const gegabelt = felder(nachher)
    .filter((f) => f.color !== kind)
    .filter((f) => nachher.attackers(f.square, kind).includes(von))
    // Nur lohnende Ziele: König (Schach) oder eine Figur, die selbst ungedeckt ist bzw.
    // mehr wert als der Gabler. Sonst ist es keine echte Gabel, sondern nur "greift zwei an".
    .filter((f) => f.type === "k" || istUngedeckt(nachher, f.square, gegner(kind)) || FIGURENWERT[f.type] >= 5);
  if (gegabelt.length < 2) return null;
  return {
    gabler: nachher.get(von)?.type,
    ziele: gegabelt.map((f) => `${f.type}${f.square}`),
    mitSchach: gegabelt.some((f) => f.type === "k"),
  };
}

/** Findet alle gefesselten gegnerischen Figuren (absolute Fesselung an den König). */
function gefesselte(brett, gegenFarbe) {
  const raus = [];
  const koenig = felder(brett).find((f) => f.type === "k" && f.color === gegenFarbe);
  if (!koenig) return raus;
  for (const f of felder(brett).filter((x) => x.color === gegenFarbe && x.type !== "k")) {
    // Testweise entfernen: entsteht dadurch ein Angriff auf den eigenen König, war sie gefesselt.
    const probe = new Chess(brett.fen());
    probe.remove(f.square);
    const vorherSchach = brett.attackers(koenig.square, gegner(gegenFarbe)).length;
    const nachherSchach = probe.attackers(koenig.square, gegner(gegenFarbe)).length;
    if (nachherSchach > vorherSchach) raus.push(f);
  }
  return raus;
}

/** „Fesselung setzen" — nach dem Zug ist eine gegnerische Figur gefesselt, die es vorher nicht war. */
function motivFesselungSetzen(vorher, zug, kind) {
  const nachher = nachZug(vorher.fen(), zug);
  if (!nachher) return null;
  const vorFelder = new Set(gefesselte(vorher, gegner(kind)).map((f) => f.square));
  const neu = gefesselte(nachher, gegner(kind)).filter((f) => !vorFelder.has(f.square));
  if (neu.length === 0) return null;
  return { gefesselt: neu.map((f) => `${f.type}${f.square}`) };
}

/** „Spieß" — der Zug gibt Schach, und hinter dem König steht auf derselben Linie eine Figur. */
function motivSpiess(vorher, zug, kind) {
  const nachher = nachZug(vorher.fen(), zug);
  if (!nachher || !nachher.isCheck()) return null;
  const von = zug.slice(2, 4);
  const koenig = felder(nachher).find((f) => f.type === "k" && f.color !== kind);
  if (!koenig || !nachher.attackers(koenig.square, kind).includes(von)) return null;
  const hinter = feldHinter(nachher, von, koenig.square);
  if (!hinter) return null;
  const dahinter = nachher.get(hinter);
  if (!dahinter || dahinter.color === kind) return null;
  return { koenig: koenig.square, dahinter: `${dahinter.type}${hinter}`, wert: FIGURENWERT[dahinter.type] };
}

/**
 * Das erste BESETZTE Feld hinter `ueber`, von `von` aus gesehen.
 *
 * Wichtig: nicht einfach das Nachbarfeld — beim Spieß steht die zweite Figur oft mehrere
 * Felder hinter dem König (Turm a1 gibt Schach auf a5, die Dame steht auf a8). Ein Test mit
 * genau dieser Stellung hat den ursprünglichen Nachbarfeld-Ansatz als zu eng entlarvt.
 */
function feldHinter(brett, von, ueber) {
  const sp = (s) => [s.charCodeAt(0) - 97, Number(s[1]) - 1];
  const [x1, y1] = sp(von);
  const [x2, y2] = sp(ueber);
  // muss eine echte Linie sein (waagerecht, senkrecht oder diagonal)
  if (!(x1 === x2 || y1 === y2 || Math.abs(x2 - x1) === Math.abs(y2 - y1))) return null;
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let x = x2 + dx;
  let y = y2 + dy;
  while (x >= 0 && x <= 7 && y >= 0 && y <= 7) {
    const feld = String.fromCharCode(97 + x) + (y + 1);
    if (brett.get(feld)) return feld;
    x += dx;
    y += dy;
  }
  return null;
}

/**
 * „Deckung erkennen" (NEU, Tipp-Aufgabe ohne Zug).
 * Hier interessiert der Lösungszug gar nicht — nur die Stellung: Es muss GENAU EINE
 * gegnerische Figur ungedeckt dastehen, damit die Aufgabe eine eindeutige Antwort hat.
 * Lichess hat für dieses Lernziel kein Thema; wir berechnen es selbst.
 */
function motivDeckungErkennen(vorher, _zug, kind) {
  // Nur "große" Figuren kommen als gesuchte Figur infrage (Springer, Läufer, Turm, Dame).
  // Bauern bleiben bewusst außen vor: sie sind in diesen Stellungen die BESCHÜTZER, und ein
  // ungedeckter Bauer am Rand würde die Aufgabe mehrdeutig machen. Genau daran ist der erste
  // Entwurf im Test gescheitert (Stellung A-5 wurde verworfen, weil ein Bauer mitzählte).
  const gegnerFiguren = felder(vorher).filter(
    (f) => f.color !== kind && f.type !== "k" && f.type !== "p"
  );

  // KORREKTUR 2026-09-19 (nach Christians Volllauf): Hier stand `< 3`, also mindestens drei
  // gegnerische Offiziere. Im Band "klein" (höchstens 7 Figuren) blieben dadurch nur
  // 16 Kandidaten im ganzen Datensatz übrig — rechnerisch zwingend: zwei Könige + drei
  // Offiziere + zwei Bauern als Beschützer sind schon exakt 7, und die Bauern müssen dann
  // auch noch die richtigen Figuren decken. (Die frühere Zusatzprüfung "mindestens zwei
  // gedeckte" war dabei ohnehin redundant: Bei drei Offizieren und genau einem ungedeckten
  // sind die anderen zwei automatisch gedeckt.)
  //
  // Jetzt genügen ZWEI Offiziere — einer mit, einer ohne Beschützer. Das ist immer noch ein
  // echter Vergleich und in fünf Figuren darstellbar. Wie viele zur Auswahl standen, steht
  // als `auswahl` im Datensatz: Bei der Kuratierung sollten für Stufe 2 und 3 Stellungen mit
  // drei oder mehr bevorzugt werden, damit das Kind dort nicht zwischen zwei Möglichkeiten
  // raten kann.
  if (gegnerFiguren.length < 2) return null;
  const ohneSchutz = gegnerFiguren.filter((f) => istUngedeckt(vorher, f.square, gegner(kind)));
  if (ohneSchutz.length !== 1) return null; // nicht eindeutig
  const gedeckte = gegnerFiguren.filter((f) => !istUngedeckt(vorher, f.square, gegner(kind)));
  if (gedeckte.length < 1) return null; // ohne Gegenbeispiel ist es keine Vergleichsaufgabe
  return {
    gesucht: `${ohneSchutz[0].type}${ohneSchutz[0].square}`,
    gedeckte: gedeckte.map((f) => `${f.type}${f.square}`),
    auswahl: gegnerFiguren.length, // zwischen wie vielen Figuren das Kind unterscheiden muss
  };
}

/**
 * Welcher der drei Wege ist hier der STÄRKSTE? (Christian, 19.09.: „Bei Verteidigen kann Lux
 * jedoch einordnen, welcher der stärkste Zug wäre und erklären?")
 *
 * Bewusst KEINE Engine-Bewertung, sondern eine Reihenfolge, die ein fünfjähriges Kind
 * nachvollziehen kann, weil sie sich aus dem Gelernten ableitet (Figurenwert, Beschützer):
 *
 *   1. Den Angreifer schlagen — wenn nichts zurückschlägt oder der Tausch aufgeht.
 *   2. Einen Beschützer dazuholen — wenn der Angreifer mindestens so viel wert ist wie die
 *      bedrohte Figur. Sonst lohnt es nicht: Ein Bauer, der einen gedeckten Turm angreift,
 *      gewinnt trotzdem (fünf Sterne gegen einen), das ist der Kernscreen von Kapitel B.
 *   3. Wegziehen — geht fast immer.
 *
 * WICHTIG, DAS IST KEINE REGEL (Korrektur Christian, 19.09.: „Angreifer schlagen — bester Weg
 * … trifft keinesfalls immer zu"). Das stimmt: Schlagen kann eine Linie öffnen, eine andere
 * Figur hängen lassen oder in eine Gabel laufen. Diese Funktion beurteilt AUSSCHLIESSLICH
 * diese eine Bedrohung in dieser einen Stellung — sie ist blind für alles, was zwei Züge
 * später passiert. Das Ergebnis heißt deshalb `besterWegHier` und nicht `besterWeg`, und Lux
 * darf es nur stellungsbezogen aussprechen („hier ist das am besten, weil …"), nie als
 * allgemeinen Grundsatz.
 *
 * GEMESSEN (Volllauf 19.09.2026 über alle 6.100.952 Puzzles): Die Rangfolge deckt sich in
 * nur **50 %** der Fälle mit dem engine-geprüften Lichess-Lösungszug — 4715 von 9400. Das ist
 * ein Münzwurf, die Rangfolge trägt also für sich genommen kaum Information. Die Ursache ist
 * systematisch: 84 % der echten Lösungen ziehen die Figur einfach weg, während diese Funktion
 * Schlagen und Decken bevorzugt, sobald sie überhaupt möglich sind. Der Grund dafür liegt
 * außerhalb dessen, was hier gesehen werden kann — der beste Zug der STELLUNG ist oft gar
 * keine Rettungsaktion, sondern ein Gegenangriff oder ein Gewinn an anderer Stelle.
 *
 * DARAUS FOLGT FÜR DIE APP: `besterWegHier` taugt NICHT als Grundlage für ein Urteil. Lux
 * benennt deshalb nur, WELCHEN der drei Wege der Lösungszug benutzt ("hier ziehst du die
 * Figur einfach weg") — eine Tatsachenaussage. Eine Begründung ("… weil nichts zurückschlägt")
 * darf nur dort gesprochen werden, wo `stimmtMitLoesung === true` ist, also beide
 * übereinstimmen. Bei den übrigen wird nichts bewertet.
 *
 * Deshalb wandern übereinstimmende Kandidaten beim Sortieren nach vorn (siehe guete) — 4715
 * sind für die Spalte mehr als genug.
 */
function besterVerteidigungsweg(brett, kind, opferFeld) {
  const opfer = brett.get(opferFeld);
  if (!opfer) return null;
  const angreiferFelder = brett.attackers(opferFeld, gegner(kind));
  if (angreiferFelder.length === 0) return null;

  // Bei mehreren Angreifern wird es für Kinder unübersichtlich — dann ist Wegziehen fast immer
  // richtig, und die Stellung taugt ohnehin eher nicht als Lehrbeispiel.
  if (angreiferFelder.length > 1) {
    return { weg: "wegziehen", grund: "mehrere Angreifer", mehrereAngreifer: true };
  }

  const angreiferFeld = angreiferFelder[0];
  const angreifer = brett.get(angreiferFeld);

  // 1. Angreifer schlagen?
  for (const m of brett.moves({ verbose: true })) {
    if (m.to !== angreiferFeld) continue;
    const nachher = nachZug(brett.fen(), m.from + m.to + (m.promotion || ""));
    if (!nachher) continue;
    const gegenschlag = nachher.attackers(angreiferFeld, gegner(kind)).length > 0;
    // Ohne Gegenschlag immer gut; mit Gegenschlag nur, wenn wir nicht draufzahlen.
    if (!gegenschlag || FIGURENWERT[angreifer.type] >= FIGURENWERT[m.piece]) {
      return {
        weg: "angreifer_schlagen",
        grund: gegenschlag ? "Tausch geht für uns auf" : "nichts schlägt zurück",
        angreifer: `${angreifer.type}${angreiferFeld}`,
      };
    }
  }

  // 2. Decken? Lohnt nur, wenn der Angreifer mindestens so viel wert ist wie die bedrohte Figur.
  if (FIGURENWERT[angreifer.type] >= FIGURENWERT[opfer.type]) {
    for (const m of brett.moves({ verbose: true })) {
      if (m.from === opferFeld) continue; // das wäre Wegziehen
      const nachher = nachZug(brett.fen(), m.from + m.to + (m.promotion || ""));
      if (!nachher) continue;
      if (nachher.get(opferFeld)?.color !== kind) continue;
      if (nachher.attackers(opferFeld, kind).length > 0) {
        return { weg: "decken", grund: "Angreifer ist mindestens gleich viel wert" };
      }
    }
  }

  // 3. Wegziehen.
  return {
    weg: "wegziehen",
    grund:
      FIGURENWERT[angreifer.type] < FIGURENWERT[opfer.type]
        ? "Angreifer ist weniger wert — decken lohnt nicht"
        : "kein besserer Weg vorhanden",
  };
}

/**
 * „Verteidigen" (NEU).
 * Vor dem Zug hängt eine EIGENE Figur des Kindes; nach dem Lösungszug hängt sie nicht mehr.
 * Zusätzlich wird bestimmt, WELCHER der drei gelehrten Wege benutzt wurde — das brauchen wir
 * für die Hinweistexte und um die Aufgaben über die drei Wege zu mischen.
 */
function motivVerteidigen(vorher, zug, kind) {
  const bedroht = felder(vorher)
    .filter((f) => f.color === kind && f.type !== "k")
    .filter((f) => haengt(vorher, f.square, kind))
    .sort((a, b) => FIGURENWERT[b.type] - FIGURENWERT[a.type]);
  if (bedroht.length !== 1) return null; // genau eine Sorge, sonst ist es keine Lehraufgabe
  const opfer = bedroht[0];
  if (FIGURENWERT[opfer.type] < 3) return null; // ein Bauer lohnt die Lektion nicht

  const von = zug.slice(0, 2);
  const nach = zug.slice(2, 4);
  const nachher = nachZug(vorher.fen(), zug);
  if (!nachher) return null;

  let weg = null;
  if (von === opfer.square) {
    // Die bedrohte Figur selbst ist gezogen → weggezogen (und muss jetzt sicher stehen).
    if (haengt(nachher, nach, kind)) return null;
    weg = "wegziehen";
  } else if (vorher.get(nach) && vorher.get(nach).color !== kind && vorher.attackers(opfer.square, gegner(kind)).includes(nach)) {
    // Auf dem Zielfeld stand genau der Angreifer → Angreifer geschlagen.
    weg = "angreifer_schlagen";
  } else {
    // Sonst: die Figur steht noch da und ist jetzt gedeckt → ein Beschützer kam dazu.
    if (nachher.get(opfer.square)?.color !== kind) return null;
    if (istUngedeckt(nachher, opfer.square, kind)) return null;
    weg = "decken";
  }
  const beste = besterVerteidigungsweg(vorher, kind, opfer.square);
  return {
    gerettet: `${opfer.type}${opfer.square}`,
    wert: FIGURENWERT[opfer.type],
    weg, // welcher Weg im Lichess-Lösungszug benutzt wird
    besterWegHier: beste?.weg ?? null, // stärkster Weg IN DIESER STELLUNG, keine Regel
    begruendung: beste?.grund ?? null, // womit Lux das erklären kann
    // Stimmt unsere Einordnung mit dem engine-geprüften Lösungszug überein? Wo nicht, ist die
    // Stellung als Lehrbeispiel unbrauchbar (siehe besterVerteidigungsweg-Kommentar).
    stimmtMitLoesung: beste ? beste.weg === weg : null,
  };
}

// ───────────────────────────────────── Was den LERNWERT bestimmt (statt des Ratings)
//
// Nach dem Wegfall des Rating-Tors (siehe EINSTELLUNGEN) werden die Eigenschaften, auf die es
// didaktisch wirklich ankommt, hier direkt gemessen statt über einen Stellvertreter geschätzt.

/** Abstand zweier Felder in Königsschritten — ein brauchbares Maß dafür, wie weit das Auge
 *  auf dem Brett wandern muss. Eine Gabel über zwei Felder ist für ein Kind leichter zu
 *  sehen als dieselbe Gabel über sechs. */
function feldAbstand(a, b) {
  const sp = (x) => [x.charCodeAt(0) - 97, Number(x[1]) - 1];
  const [x1, y1] = sp(a);
  const [x2, y2] = sp(b);
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/** Zieht alle Feldbezeichnungen aus einem Motiv-Ergebnis (die Werte sehen aus wie "qd8",
 *  "d4" oder ["nf6","re8"]) — gebraucht, um die Weglänge zu den beteiligten Figuren zu messen. */
function felderAus(info) {
  const raus = [];
  const sammle = (v) => {
    if (typeof v === "string") {
      const m = v.match(/([a-h][1-8])$/);
      if (m) raus.push(m[1]);
    } else if (Array.isArray(v)) v.forEach(sammle);
  };
  Object.values(info).forEach(sammle);
  return raus;
}

/**
 * Ist die Lösung eindeutig? Gezählt wird, wie viele LEGALE Züge dasselbe Motiv erfüllen.
 *
 * Das ist die wichtigste der neuen Prüfungen. Eine Übungsaufgabe mit genau einer richtigen
 * Antwort ist für ein Kind etwas völlig anderes als eine, bei der drei Züge funktionieren, die
 * App aber nur einen als Lösung wertet — das Kind zieht dann etwas objektiv Richtiges und
 * bekommt trotzdem kein Erfolgserlebnis. Genau diese Sorte Ärgernis steckte hinter dem
 * Fesselungs-Befund vom 16.09. ("es ist keine Fesselung, wenn ich einen Springer schlagen kann
 * und dabei meinen eigenen Turm verliere").
 */
function anzahlLoesungen(vorher, kind, pruefe, obergrenze = 64) {
  let n = 0;
  for (const m of vorher.moves({ verbose: true })) {
    const uci = m.from + m.to + (m.promotion || "");
    if (pruefe(vorher, uci, kind)) n++;
    if (n >= obergrenze) return n; // Sicherheitsnetz, in unseren kleinen Stellungen nie erreicht
  }
  return n;
}

const MOTIVE = {
  figur_gewinnen: { pruefe: motivFigurGewinnen, lichessTags: ["hangingPiece"], eindeutigkeitPruefen: true },
  gabel: { pruefe: motivGabel, lichessTags: ["fork"], eindeutigkeitPruefen: true },
  fesselung_setzen: { pruefe: motivFesselungSetzen, lichessTags: ["pin"], eindeutigkeitPruefen: true },
  spiess: { pruefe: motivSpiess, lichessTags: ["skewer"], eindeutigkeitPruefen: true },
  // Für diese beiden gibt es bei Lichess KEIN passendes Thema — wir erkennen sie selbst,
  // deshalb auch kein Tag-Vorfilter (lichessTags leer = alle Zeilen prüfen).
  //
  // `deckung_erkennen` ist eine TIPP-Aufgabe ohne Zug: Die Motivprüfung schaut gar nicht auf
  // den Lösungszug, sondern nur auf die Stellung. Eine Zug-Eindeutigkeit gibt es hier also
  // nicht zu messen — die Eindeutigkeit steckt bereits in der Prüfung selbst (genau EINE
  // ungedeckte Figur, mindestens zwei gedeckte als Gegenbeispiel).
  deckung_erkennen: { pruefe: motivDeckungErkennen, lichessTags: [], eindeutigkeitPruefen: false },
  // Beim Verteidigen ist eine mehrdeutige Lösung KEIN Mangel, sondern eine Anweisung an die
  // Umsetzung: Wenn eine bedrohte Figur auf fünf sichere Felder fliehen kann, sind alle fünf
  // richtig, und die Aufgabe muss sie auch alle annehmen. Die Zahl steht deshalb als
  // `loesungen` mit im Datensatz — sie sagt, wie viele Zielfelder die Spalte akzeptieren muss.
  // (Im Selbsttest hatte KEINER der drei Verteidigungsfälle nur eine Lösung — das ist die
  // Regel, nicht die Ausnahme.)
  verteidigen: { pruefe: motivVerteidigen, lichessTags: [], eindeutigkeitPruefen: true },
};

// ──────────────────────────────────────────────── Güte einer Stellung (für die Bestenauswahl)
//
// WICHTIG, das war im ersten Volllauf falsch: Der Deckel je Motiv griff WÄHREND des Einlesens,
// in Dateireihenfolge — sortiert wurde erst danach. Bei sechs Motiven, die alle den Deckel
// erreichten, kuratierte man also aus den ERSTEN 3000 Fundstellen, nicht aus den BESTEN.
// Jetzt bekommt jeder Kandidat eine Güte-Zahl (kleiner ist besser), und beim Überlaufen wird
// der schlechtere Teil verworfen statt der später gefundene.

/** Bei welchen Motiven ist eine mehrdeutige Lösung tatsächlich ein Mangel? Beim Verteidigen
 *  nicht: Wenn eine bedrohte Figur auf zwölf sichere Felder fliehen kann, sind alle zwölf
 *  richtig — die Aufgabe muss sie dann eben alle annehmen (siehe MOTIVE-Kommentar). */
const EINDEUTIGKEIT_IST_QUALITAET = {
  figur_gewinnen: true,
  gabel: true,
  fesselung_setzen: true,
  spiess: true,
  verteidigen: false,
  deckung_erkennen: false, // Tipp-Aufgabe, kein Zug — Eindeutigkeit steckt schon in der Prüfung
};

function guete(eintrag, motivName) {
  const info = eintrag.motive[motivName];
  let punkte = 0;
  if (EINDEUTIGKEIT_IST_QUALITAET[motivName] && info.eindeutig === false) punkte += 1000;
  // Beim Verteidigen: Stellungen, bei denen unsere Wegeinordnung und der engine-geprüfte
  // Lösungszug auseinandergehen, ganz nach hinten. Dort kann Lux nichts begründen, ohne
  // womöglich Falsches zu sagen (siehe besterVerteidigungsweg — nur 50 % Übereinstimmung).
  if (info.stimmtMitLoesung === false) punkte += 2000;
  if (eintrag.mehrereMotive) punkte += 50;
  // Kurze Wege auf dem Brett zählen doppelt so stark wie eine zusätzliche Figur: Eine Gabel
  // über zwei Felder sieht ein Kind, dieselbe über sechs nicht.
  punkte += 2 * ((info.zugweite ?? 0) + (info.zielweite ?? 0));
  punkte += eintrag.figuren;
  return punkte;
}

/** In welches Figurenband gehört diese Stellung? */
function bandFuer(anzahlFiguren) {
  return EINSTELLUNGEN.baender.find((b) => anzahlFiguren >= b.von && anzahlFiguren <= b.bis)?.name;
}

// ────────────────────────────────────────────────────────────── Zeilenverarbeitung

function verarbeiteZeile(z) {
  const rating = Number(z.Rating);
  const abw = Number(z.RatingDeviation);
  const pop = Number(z.Popularity);
  const plays = Number(z.NbPlays);
  if (!Number.isFinite(rating)) return null;
  if (EINSTELLUNGEN.maxRating !== null && rating > EINSTELLUNGEN.maxRating) return null;
  if (abw > EINSTELLUNGEN.maxRatingAbweichung) return null;
  if (pop < EINSTELLUNGEN.minPopularity || plays < EINSTELLUNGEN.minNbPlays) return null;

  const tags = new Set((z.Themes || "").split(" ").filter(Boolean));
  for (const a of EINSTELLUNGEN.ausschluss) if (tags.has(a)) return null;

  const zuege = (z.Moves || "").split(" ").filter(Boolean);
  // Lichess-Konvention: der ERSTE Zug ist der Gegnerzug und wird automatisch ausgeführt;
  // `zuege[1]` ist der erste Zug des Kindes, danach folgt ggf. die Fortsetzung.
  //
  // KORREKTUR 2026-09-19 (nach Christians erstem Volllauf über alle 6.100.952 Puzzles):
  // Hier stand `if (zuege.length !== 2) return null` — "strikt einzügige Aufgaben". Das hat
  // Gabel, Spieß und Fesselung praktisch vollständig ausgelöscht: 0, 0 und 1 Treffer im
  // gesamten Datensatz. Der Grund ist strukturell, nicht statistisch: Bei diesen Motiven
  // GEWINNT der erste Zug noch nichts, er stellt nur die Drohung auf. Der Materialgewinn
  // fällt erst im zweiten Zug an, also hat so gut wie jedes Gabel-/Spieß-/Fesselungs-Puzzle
  // vier Halbzüge (Gegner, Gabel, Rettungsversuch, Abholen) und flog raus. Nur beim
  // Abgreifen einer hängenden Figur reicht wirklich ein Zug — deshalb kamen ausgerechnet
  // `figur_gewinnen` und die selbst erkannten Motive auf dreistellige Zahlen.
  //
  // Für unsere Übungsspalten ist das ohnehin die falsche Frage: Die Aufgabe lautet "stell die
  // Gabel auf", nicht "spiel die Kombination zu Ende". Wir nehmen deshalb den ersten Kindzug
  // als Lösung und ignorieren die Fortsetzung — prüfen aber weiterhin selbst nach, dass das
  // Motiv nach genau diesem Zug tatsächlich auf dem Brett steht.
  if (zuege.length < 2) return null;
  // Sehr lange Kombinationen bleiben trotzdem draußen: Wenn der erste Zug erst nach vier
  // eigenen Zügen aufgeht, ist die Stellung als Einzelaufgabe nicht mehr ehrlich.
  if (zuege.length > 6) return null;

  let start;
  try {
    start = new Chess(z.FEN);
  } catch {
    return null;
  }
  const nachVorzug = nachZug(z.FEN, zuege[0]);
  if (!nachVorzug) return null;

  const anzahlFiguren = felder(nachVorzug).length;
  if (anzahlFiguren > EINSTELLUNGEN.maxFiguren) return null;

  let stellung = nachVorzug;
  let kind = stellung.turn();
  let loesung = zuege[1];
  let gespiegelt = false;

  // Nur-Weiß: Schwarz-am-Zug-Stellungen spiegeln statt verwerfen (siehe spiegeleFen oben).
  // Danach läuft alles Weitere unverändert — inklusive der vollständigen Motivprüfung, die
  // eine fehlerhaft gespiegelte Stellung von selbst aussortieren würde.
  if (EINSTELLUNGEN.nurWeiss && kind === "b") {
    let gedreht;
    try {
      gedreht = new Chess(spiegeleFen(stellung.fen()));
    } catch {
      return null;
    }
    const gedrehterZug = spiegeleZug(loesung);
    if (!nachZug(gedreht.fen(), gedrehterZug)) return null; // Spiegelung unbrauchbar
    stellung = gedreht;
    loesung = gedrehterZug;
    kind = "w";
    gespiegelt = true;
  }
  // Sicherheitsnetz: der Lösungszug muss in der Stellung, die das Kind sieht, legal sein.
  const geloest = nachZug(stellung.fen(), loesung);
  if (!geloest) return null;

  const treffer = {};
  for (const [name, def] of Object.entries(MOTIVE)) {
    if (def.lichessTags.length && !def.lichessTags.some((t) => tags.has(t))) continue;
    const info = def.pruefe(stellung, loesung, kind);
    if (!info) continue;

    // Eindeutigkeit: erfüllt außer dem vorgesehenen Lösungszug noch ein anderer legaler Zug
    // dasselbe Motiv? (Siehe anzahlLoesungen — das ersetzt das weggefallene Rating als
    // eigentliches Qualitätsmaß.)
    if (def.eindeutigkeitPruefen) {
      info.loesungen = anzahlLoesungen(stellung, kind, def.pruefe);
      info.eindeutig = info.loesungen === 1;
    }

    // Weglängen: wie weit muss das Auge wandern? `zugweite` ist die Länge des Lösungszugs,
    // `zielweite` der größte Abstand vom Zielfeld zu den beteiligten Figuren des Motivs.
    const zielFeld = loesung.slice(2, 4);
    const beteiligt = felderAus(info).filter((f) => f !== zielFeld);
    info.zugweite = feldAbstand(loesung.slice(0, 2), zielFeld);
    info.zielweite = beteiligt.length ? Math.max(...beteiligt.map((f) => feldAbstand(zielFeld, f))) : 0;

    treffer[name] = info;
  }
  if (Object.keys(treffer).length === 0) return null;

  return {
    id: z.PuzzleId,
    fen: stellung.fen(),
    kindFarbe: kind, // durch die Spiegelung praktisch immer "w"
    gespiegelt, // true = Originalstellung war Schwarz am Zug und wurde gedreht

    loesung,
    figuren: anzahlFiguren,
    // Wie lang die Lichess-Lösung insgesamt ist. 1 = mit unserem Zug ist das Puzzle fertig,
    // >1 = das Original geht weiter (für unsere Spalte unerheblich, siehe Kommentar oben),
    // aber gut zu wissen, wenn eine Aufgabe später doch einmal zweizügig werden soll.
    kindzuegeGesamt: Math.ceil((zuege.length - 1) / 2),
    rating,
    popularity: pop,
    nbPlays: plays,
    gibtSchach: geloest.isCheck(),
    istMatt: geloest.isCheckmate(),
    lichessTags: [...tags].sort(),
    motive: treffer,
    // ACHTUNG, zwei verschiedene Dinge mit ähnlichem Namen:
    //   `mehrereMotive` = die STELLUNG erfüllt mehr als ein Motiv (z. B. ist das Schlagen des
    //                     Angreifers gleichzeitig "Figur gewinnen" UND "Verteidigen") — dann
    //                     passt sie in mehrere Spalten und man sollte sie bewusst zuordnen.
    //   `motive.<x>.eindeutig` = innerhalb EINES Motivs gibt es genau einen legalen Zug, der
    //                     es erfüllt. Das ist das eigentliche Qualitätsmaß (siehe
    //                     anzahlLoesungen) und ersetzt das weggefallene Rating-Tor.
    mehrereMotive: Object.keys(treffer).length > 1,
    quelle: z.GameUrl || "",
  };
}

// ────────────────────────────────────────────────────────────── CSV-Strom

/** Liest die Datei zeilenweise, egal ob .zst oder .csv, und ruft `jedeZeile` je Datensatz. */
async function leseCsv(datei, jedeZeile) {
  const istZstd = datei.endsWith(".zst");
  let kopf = null;
  let rest = "";
  let gelesen = 0;

  const verarbeiteText = (text) => {
    rest += text;
    const zeilen = rest.split("\n");
    rest = zeilen.pop() ?? "";
    for (const zeile of zeilen) {
      if (!zeile) continue;
      const teile = zeile.split(",");
      if (!kopf) {
        kopf = teile.map((s) => s.trim());
        continue;
      }
      const o = {};
      for (let i = 0; i < kopf.length; i++) o[kopf[i]] = teile[i];
      gelesen++;
      jedeZeile(o, gelesen);
    }
  };

  if (istZstd) {
    const { Decompress } = require("fzstd");
    const dec = new Decompress((chunk) => verarbeiteText(Buffer.from(chunk).toString("utf8")));
    await new Promise((fertig, fehler) => {
      const strom = fs.createReadStream(datei);
      strom.on("data", (d) => dec.push(new Uint8Array(d)));
      strom.on("end", () => {
        dec.push(new Uint8Array(0), true);
        fertig();
      });
      strom.on("error", fehler);
    });
  } else {
    await new Promise((fertig, fehler) => {
      const strom = fs.createReadStream(datei, "utf8");
      strom.on("data", verarbeiteText);
      strom.on("end", fertig);
      strom.on("error", fehler);
    });
  }
  if (rest.trim()) verarbeiteText("\n");
  return gelesen;
}

// ────────────────────────────────────────────────────────────── Hauptlauf

async function main() {
  const argv = process.argv.slice(2);
  const datei = argv.find((a) => !a.startsWith("--"));
  const opt = (name, standard) => {
    const i = argv.indexOf("--" + name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : standard;
  };
  if (!datei) {
    console.error("Aufruf: node lichess_endlosmodus.cjs <lichess_db_puzzle.csv.zst> [--out ordner] [--limit n]");
    process.exit(1);
  }
  const ausgabe = opt("out", "./lichess_kandidaten");
  const limit = Number(opt("limit", 0));
  EINSTELLUNGEN.maxFiguren = Number(opt("max-figuren", EINSTELLUNGEN.maxFiguren));
  EINSTELLUNGEN.maxProMotiv = Number(opt("max-pro-motiv", EINSTELLUNGEN.maxProMotiv));
  if (argv.includes("--beide-farben")) EINSTELLUNGEN.nurWeiss = false;
  const ratingOpt = opt("max-rating", null);
  EINSTELLUNGEN.maxRating = ratingOpt === null ? null : Number(ratingOpt);

  fs.mkdirSync(ausgabe, { recursive: true });

  // kandidaten[motiv][band] = Array der bisher besten Fundstellen
  const kandidaten = {};
  for (const m of Object.keys(MOTIVE)) {
    kandidaten[m] = {};
    for (const b of EINSTELLUNGEN.baender) kandidaten[m][b.name] = [];
  }

  /** Nimmt einen Kandidaten auf und hält die Liste auf Höchstlänge — behält dabei die
   *  BESTEN, nicht die zuerst gefundenen (siehe guete()). Gestutzt wird erst bei doppelter
   *  Länge, damit nicht bei jedem Einfügen sortiert werden muss. */
  function aufnehmen(liste, eintrag, motivName) {
    liste.push(eintrag);
    if (liste.length > 2 * EINSTELLUNGEN.maxProMotiv) {
      liste.sort((a, b) => guete(a, motivName) - guete(b, motivName));
      liste.length = EINSTELLUNGEN.maxProMotiv;
    }
  }
  let geprueft = 0;
  let abbruch = false;

  console.log(`Lese ${datei} …`);
  console.log(
    `Filter: Figuren ≤ ${EINSTELLUNGEN.maxFiguren}, einzügig, ` +
      `Rating ${EINSTELLUNGEN.maxRating === null ? "unbegrenzt (kein Schwierigkeitstor)" : "≤ " + EINSTELLUNGEN.maxRating}, ` +
      `Popularity ≥ ${EINSTELLUNGEN.minPopularity}, NbPlays ≥ ${EINSTELLUNGEN.minNbPlays}\n`
  );

  const gesamt = await leseCsv(datei, (z, n) => {
    if (abbruch) return;
    if (limit && n > limit) {
      abbruch = true;
      return;
    }
    if (n % 500000 === 0) process.stderr.write(`  … ${n.toLocaleString("de-DE")} Zeilen\n`);
    const e = verarbeiteZeile(z);
    geprueft++;
    if (!e) return;
    const band = bandFuer(e.figuren);
    if (!band) return;
    for (const m of Object.keys(e.motive)) aufnehmen(kandidaten[m][band], e, m);
  });

  // ── Übersicht je Motiv und Figurenband
  console.log(`\nGelesen: ${gesamt.toLocaleString("de-DE")} Zeilen\n`);

  const bandBeschriftung = EINSTELLUNGEN.baender
    .map((b) => `${b.name} = ${b.von}\u2013${b.bis} Figuren`)
    .join(" · ");
  console.log(`Figurenbänder: ${bandBeschriftung}\n`);

  console.log(
    "Motiv".padEnd(18) +
      "Band".padEnd(8) +
      "Kandidaten".padStart(11) +
      "eind.".padStart(8) +
      "1 Motiv".padStart(9) +
      "Ø Fig.".padStart(8) +
      "Ø Weite".padStart(9) +
      "Rating".padStart(13)
  );
  console.log("─".repeat(84));

  for (const [m, nachBand] of Object.entries(kandidaten)) {
    for (const bd of EINSTELLUNGEN.baender) {
      const liste = nachBand[bd.name];
      if (!liste.length) continue;
      const mittel = (f) => (liste.reduce((s2, e) => s2 + f(e), 0) / liste.length).toFixed(1);
      // Bei Motiven, wo Eindeutigkeit gar nicht gemessen wird, steht bewusst "—" statt einer
      // Zahl, die nur so aussieht, als sage sie etwas.
      const eind = EINDEUTIGKEIT_IST_QUALITAET[m]
        ? String(liste.filter((e) => e.motive[m].eindeutig).length)
        : "—";
      const ratings = liste.map((e) => e.rating);
      console.log(
        m.padEnd(18) +
          bd.name.padEnd(8) +
          String(liste.length).padStart(11) +
          eind.padStart(8) +
          String(liste.filter((e) => !e.mehrereMotive).length).padStart(9) +
          mittel((e) => e.figuren).padStart(8) +
          mittel((e) => (e.motive[m].zugweite ?? 0) + (e.motive[m].zielweite ?? 0)).padStart(9) +
          `${Math.min(...ratings)}\u2013${Math.max(...ratings)}`.padStart(13)
      );
    }
  }

  // ── Wege-Verteilung beim Verteidigen (brauchen wir zum Mischen der Mini-Übung)
  const alleVerteidigen = EINSTELLUNGEN.baender.flatMap((b) => kandidaten.verteidigen[b.name]);
  if (alleVerteidigen.length) {
    const wege = {};
    for (const e of alleVerteidigen) {
      const w = e.motive.verteidigen.weg;
      wege[w] = (wege[w] || 0) + 1;
    }
    console.log("\nVerteidigen, Verteilung der drei Wege (über alle Bänder):");
    for (const [w, n] of Object.entries(wege)) console.log(`  ${w.padEnd(20)} ${n}`);

    // Wie oft deckt sich unsere stellungsbezogene Einordnung mit dem engine-geprüften
    // Lichess-Lösungszug? Das ist der ehrliche Gütewert unserer Rangfolge — sie ist eine
    // lokale Heuristik, keine Regel (siehe besterVerteidigungsweg-Kommentar).
    const stimmt = alleVerteidigen.filter((e) => e.motive.verteidigen.stimmtMitLoesung === true).length;
    const abweichend = alleVerteidigen.filter((e) => e.motive.verteidigen.stimmtMitLoesung === false).length;
    const anteil = alleVerteidigen.length ? Math.round((100 * stimmt) / alleVerteidigen.length) : 0;
    console.log(
      `\n  Einordnung des stärksten Wegs deckt sich mit dem Lichess-Lösungszug: ` +
        `${stimmt} von ${alleVerteidigen.length} (${anteil} %), abweichend: ${abweichend}`
    );

    // Für die Kuratierung entscheidend: Wie verteilen sich die drei Wege in der Teilmenge,
    // bei der beide übereinstimmen? Nur dort darf Lux überhaupt etwas begründen — und nur
    // dort lässt sich beurteilen, ob für die Spalte genug von jedem Weg da ist.
    const wegeStimmig = {};
    for (const e of alleVerteidigen.filter((x) => x.motive.verteidigen.stimmtMitLoesung === true)) {
      const w = e.motive.verteidigen.weg;
      wegeStimmig[w] = (wegeStimmig[w] || 0) + 1;
    }
    console.log("  davon, nach Weg aufgeschlüsselt:");
    for (const [w, n] of Object.entries(wegeStimmig)) console.log(`    ${w.padEnd(20)} ${n}`);
    console.log(
      "  → Nur diese Teilmenge für die Spalte verwenden. Bei den übrigen benennt Lux den Weg,\n" +
        "    begründet ihn aber nicht (siehe besterVerteidigungsweg-Kommentar)."
    );
  }

  // ── Schreiben: je Motiv eine Datei, darin nach Band gruppiert
  console.log("");
  for (const [m, nachBand] of Object.entries(kandidaten)) {
    const inhalt = {};
    let summe = 0;
    for (const bd of EINSTELLUNGEN.baender) {
      const liste = nachBand[bd.name];
      if (!liste.length) continue;
      // Endgültige Sortierung = Kuratierreihenfolge: beste Güte zuerst (siehe guete()),
      // Gleichstände nach Rating, damit die Reihenfolge reproduzierbar ist.
      liste.sort((x, y) => guete(x, m) - guete(y, m) || x.rating - y.rating);
      liste.length = Math.min(liste.length, EINSTELLUNGEN.maxProMotiv);
      inhalt[bd.name] = liste;
      summe += liste.length;
    }
    if (summe === 0) continue;
    const ziel = path.join(ausgabe, `${m}.json`);
    fs.writeFileSync(ziel, JSON.stringify(inhalt, null, 1), "utf8");
    const teile = Object.entries(inhalt).map(([b, l]) => `${b}: ${l.length}`).join(", ");
    console.log(`Geschrieben: ${ziel}  (${summe} Kandidaten — ${teile})`);
  }

  console.log(
    "\nSpalten: 'eind.' = Stellungen, bei denen genau EIN legaler Zug das Motiv erfüllt.\n" +
      "Beim Verteidigen und beim Deckung-Erkennen steht dort '—': dort ist Mehrdeutigkeit kein\n" +
      "Mangel (siehe `loesungen` im Datensatz — so viele Zielfelder muss die Aufgabe annehmen).\n" +
      "'1 Motiv' = Stellung passt in genau eine Spalte. 'Ø Weite' = Weglänge auf dem Brett in\n" +
      "Königsschritten, klein ist besser. Rating ist KEIN Filter, nur Anzeige.\n\n" +
      "Die Bänder entsprechen den Eskalationsstufen: klein → Stufe 1, mittel → Stufe 2,\n" +
      "gross → Stufe 3 (dort ist volles Brett laut Konzept ausdrücklich gewollt).\n\n" +
      "Innerhalb jedes Bandes stehen die BESTEN zuerst (Güte: eindeutige Lösung, nur ein Motiv,\n" +
      "kurze Wege, wenige Figuren). Es sind AUSWAHLVORSCHLÄGE, keine fertigen Aufgaben — jede\n" +
      "Stellung ist gegen chess.js geprüft, muss aber noch von Hand auf Verständlichkeit für\n" +
      "Fünfjährige durchgesehen werden."
  );
}

main().catch((e) => {
  console.error("Fehler:", e.message);
  process.exit(1);
});
