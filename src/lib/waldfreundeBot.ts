// Bot-Engine für den neuen "Freispiel"-Modus (Übungslichtung, siehe
// endlosmodus_freispiel_konzept.md im Claude-Projekt "ChessLynx").
//
// Hintergrund/Entscheidung (nicht nochmal recherchieren, siehe Konzept-Dokument):
// Keine kostenlose echte Schach-Engine deckt den gewünschten Bereich von 250–1300 Elo
// verlässlich ab — Stockfish ist laut eigener FAQ erst ab ca. 1320 Elo kalibrierbar
// (UCI_LimitStrength/UCI_Elo), Maia Chess (menschlich trainiertes Modell) erst ab ca.
// 1100 Elo. Deshalb: ein selbst geschriebener, sehr einfacher Bot direkt auf dem
// bereits im Projekt genutzten `chess.js` (BSD-2-Clause, kein neuer Lizenzeintrag
// nötig) statt eines externen Engine-Pakets. Bewusst NUR flache Materialbewertung
// plus höchstens ein Halbzug Gegenantwort ("geringe Suchtiefe") — keine echte
// Spielstärke-Ambition, sondern gezielt kalibrierbares, kindgerechtes Verhalten über
// die volle Bandbreite von "patzt fast immer" bis "spielt ordentlich, aber noch kein
// Turnierniveau".
//
// Ehrliche Einordnung (wie an anderer Stelle im Projekt üblich): Die 16 Parametersätze
// unten sind eine erste, plausible Kalibrierung, KEIN Ergebnis von echtem Playtesting.
// Vor dem produktiven Einsatz sollten reale Kinder/Testspieler pro Stufe kurz
// gegenspielen und `zufallsanteil`/`suchtiefe`/`topKAuswahl` bei Bedarf nachjustiert
// werden — dafür sind die Werte hier bewusst als eine einzige, gut lesbare Tabelle
// gehalten (siehe WALDFREUNDE_STUFEN unten), nicht über den Code verstreut.
//
// Abhängigkeit: erwartet eine `Chess`-Instanz aus dem npm-Paket `chess.js` (Version
// ^1.4.0, siehe package.json) — arbeitet bewusst direkt auf dem echten chess.js-Move-
// Objekt (inkl. dessen `after`-FEN-Feld), nicht auf dem für die kuratierten Quest-
// Puzzles gebauten Zeilen/Spalten-Wrapper `chessEngine.ts`. Für den Freispiel-Screen
// (freies Spiel, keine kuratierten Positionen) ist das die naheliegendere Grundlage;
// `chessEngine.ts` bleibt unverändert für die Quest-Screens zuständig.

import { Chess, type Move } from "chess.js";

/** Die sechs wiederverwendeten Waldgefährten-Charaktere, siehe Konzept-Dokument. */
export type WaldgefaehrtenTier =
  | "eichhoernchen"
  | "fuchs"
  | "dachs"
  | "adlerin"
  | "wolf"
  | "wisent";

/**
 * Eine einzelne Bot-Stufe im Freispiel-Modus: welcher Waldgefährte samt Rang sie
 * repräsentiert (fürs UI/die Freischalt-Reihenfolge, siehe Freispiel-Screen), und die
 * Verhaltensparameter für `waehleBotZug`.
 *
 * - `zufallsanteil`: Wahrscheinlichkeit (0–1), dass der Bot einen rein zufälligen
 *   Legalzug spielt statt eines bewerteten — das ist der Haupthebel für "patzt oft"
 *   auf den unteren Stufen, ganz ohne eigene Patzer-Sonderlogik.
 * - `suchtiefe`: 0 = bewertet nur die Stellung direkt nach dem eigenen Zug
 *   (reine Materialbewertung); 1 = zieht zusätzlich die für den Bot schlechtestmögliche
 *   gegnerische Antwort ab (ein Halbzug "Gegenantwort", verhindert grobes
 *   Wegschenken auf den oberen Stufen).
 * - `topKAuswahl`: aus wie vielen der bestbewerteten Züge zufällig ausgewählt wird
 *   (>1 sorgt dafür, dass der Bot nicht stur immer denselben "besten" Zug spielt).
 */
export interface WaldfreundeStufe {
  elo: number;
  tier: WaldgefaehrtenTier;
  /** 1-basierter Rang innerhalb des Charakters, nur fürs UI (z. B. Anzahl Abzeichen). */
  rang: number;
  zufallsanteil: number;
  suchtiefe: 0 | 1;
  topKAuswahl: number;
}

/**
 * Die 16 Freispiel-Stufen, aufsteigend sortiert — Reihenfolge ist gleichzeitig die
 * Freischalt-Reihenfolge im Freispiel-Screen (siehe Konzept-Dokument, Tabelle
 * "Die 16 Bot-Stufen"). Charakter-/Rang-Zuordnung 1:1 wie dort festgelegt:
 * Eichhörnchen ×3, Fuchs/Dachs/Adlerin/Wolf ×2, Wisent ×5 (900–1300).
 */
export const WALDFREUNDE_STUFEN: readonly WaldfreundeStufe[] = [
  { elo: 250, tier: "eichhoernchen", rang: 1, zufallsanteil: 0.85, suchtiefe: 0, topKAuswahl: 8 },
  { elo: 300, tier: "eichhoernchen", rang: 2, zufallsanteil: 0.75, suchtiefe: 0, topKAuswahl: 7 },
  { elo: 350, tier: "eichhoernchen", rang: 3, zufallsanteil: 0.65, suchtiefe: 0, topKAuswahl: 6 },
  { elo: 400, tier: "fuchs", rang: 1, zufallsanteil: 0.55, suchtiefe: 0, topKAuswahl: 5 },
  { elo: 450, tier: "fuchs", rang: 2, zufallsanteil: 0.45, suchtiefe: 0, topKAuswahl: 5 },
  { elo: 500, tier: "dachs", rang: 1, zufallsanteil: 0.38, suchtiefe: 0, topKAuswahl: 4 },
  { elo: 550, tier: "dachs", rang: 2, zufallsanteil: 0.30, suchtiefe: 1, topKAuswahl: 4 },
  { elo: 600, tier: "adlerin", rang: 1, zufallsanteil: 0.24, suchtiefe: 1, topKAuswahl: 3 },
  { elo: 650, tier: "adlerin", rang: 2, zufallsanteil: 0.19, suchtiefe: 1, topKAuswahl: 3 },
  { elo: 700, tier: "wolf", rang: 1, zufallsanteil: 0.15, suchtiefe: 1, topKAuswahl: 3 },
  { elo: 800, tier: "wolf", rang: 2, zufallsanteil: 0.11, suchtiefe: 1, topKAuswahl: 2 },
  { elo: 900, tier: "wisent", rang: 1, zufallsanteil: 0.08, suchtiefe: 1, topKAuswahl: 2 },
  { elo: 1000, tier: "wisent", rang: 2, zufallsanteil: 0.06, suchtiefe: 1, topKAuswahl: 2 },
  { elo: 1100, tier: "wisent", rang: 3, zufallsanteil: 0.045, suchtiefe: 1, topKAuswahl: 2 },
  { elo: 1200, tier: "wisent", rang: 4, zufallsanteil: 0.03, suchtiefe: 1, topKAuswahl: 1 },
  { elo: 1300, tier: "wisent", rang: 5, zufallsanteil: 0.02, suchtiefe: 1, topKAuswahl: 1 },
] as const;

/** Sucht die Stufen-Definition zu einer Elo-Zahl. Wirft, wenn die Elo nicht existiert
 * (bewusst laut statt eines stillen Fallbacks — ein Aufrufer mit falscher Elo hat
 * einen Bug, der nicht als "spielt halt wie 250" versteckt werden soll). */
export function holeStufe(elo: number): WaldfreundeStufe {
  const stufe = WALDFREUNDE_STUFEN.find((s) => s.elo === elo);
  if (!stufe) {
    throw new Error(
      `Unbekannte Freispiel-Elo-Stufe: ${elo}. Gültige Werte: ${WALDFREUNDE_STUFEN.map((s) => s.elo).join(", ")}`,
    );
  }
  return stufe;
}

/** Erste (leichteste) Stufe — Startpunkt der Freischalt-Kette. */
export function ersteStufe(): WaldfreundeStufe {
  return WALDFREUNDE_STUFEN[0];
}

/** Die Stufe direkt nach `elo` in der Freischalt-Reihenfolge, oder `null`, wenn `elo`
 * bereits die letzte (stärkste) Stufe ist. */
export function naechsteStufeNach(elo: number): WaldfreundeStufe | null {
  const index = WALDFREUNDE_STUFEN.findIndex((s) => s.elo === elo);
  if (index === -1 || index === WALDFREUNDE_STUFEN.length - 1) return null;
  return WALDFREUNDE_STUFEN[index + 1];
}

const FIGURENWERTE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Reine Materialbewertung einer FEN-Stellung aus Sicht einer Farbe (eigenes Material
 * minus gegnerisches Material, in Bauerneinheiten). Absichtlich keine Positionsbonus-
 * Terme (Zentrum, Entwicklung o. Ä.) — siehe Konzept-Dokument: "flache
 * Materialbewertung" ist bewusst gewählt, nicht eine vereinfachte Notlösung. */
function materialBewertung(fen: string, ausSichtVon: "w" | "b"): number {
  const stellungsfeld = fen.split(" ")[0];
  let bewertung = 0;
  for (const zeichen of stellungsfeld) {
    const wert = FIGURENWERTE[zeichen.toLowerCase()];
    if (wert === undefined) continue; // Ziffern (leere Felder) und "/" überspringen
    const istWeisseFigur = zeichen === zeichen.toUpperCase();
    const vorzeichen = istWeisseFigur === (ausSichtVon === "w") ? 1 : -1;
    bewertung += vorzeichen * wert;
  }
  return bewertung;
}

// ---------------------------------------------------------------------------------------------
// Endspiel-Hilfe (2026-09-11, Nutzerentscheidung nach der Remisquoten-Messung: "wichtiges
// Feature für das Marketing"). Befund der Messung: Bot-Partien endeten auf Stufe 250–500 zu
// 30–45 % unentschieden — fast nie durch Patt, sondern weil ein Bot mit klarem Material-
// vorsprung endlos hin- und herzog (die flache Materialbewertung kennt keinen Plan, wie man
// Matt setzt) oder alles bis zum "ungenügenden Material" abgetauscht wurde.
//
// Die Endspiel-Hilfe greift nur, wenn der Bot klar vorne liegt und der Gegner kaum noch
// Figuren hat. Dann bewertet der Bot zusätzlich (immer schwächer als ein Bauer, damit
// Material Vorrang behält):
//  - gegnerischen König an den Rand und in die Ecke drängen,
//  - mit dem eigenen König nachrücken (ohne ihn geht fast kein Matt),
//  - eigene Bauern nach vorne schieben (Umwandlung),
// würfelt seltener (halber Zufallsanteil, höchstens 25 %), spielt ein Matt in 1 auf jeder
// Stufe, schaut einen Halbzug voraus, ob er etwas herschenkt, und wiederholt Stellungen nicht.
// Im Mittelspiel ändert sich an den Stufen nichts — der Bot beendet gewonnene Partien, statt
// sie zu verschleppen. Unabhängig davon
// meiden alle Stufen Züge, die sofort in ungenügendes Material oder eine dreifache
// Wiederholung führen, solange es andere gibt.

/** Ab so vielen Bauerneinheiten Vorsprung gilt eine Stellung als "gewonnenes Endspiel". */
export const ENDSPIEL_VORSPRUNG = 3;
/** … und nur, wenn der Gegner höchstens noch so viel Figurenwert (ohne Bauern) hat. */
const ENDSPIEL_GEGNER_FIGUREN_MAX = 5;

type Brettfeld = { typ: string; weiss: boolean; reihe: number; linie: number };

function figurenAusFen(fen: string): Brettfeld[] {
  const liste: Brettfeld[] = [];
  const reihen = fen.split(" ")[0].split("/");
  reihen.forEach((reiheText, r) => {
    let linie = 0;
    for (const zeichen of reiheText) {
      if (/\d/.test(zeichen)) {
        linie += Number(zeichen);
        continue;
      }
      liste.push({ typ: zeichen.toLowerCase(), weiss: zeichen === zeichen.toUpperCase(), reihe: 7 - r, linie });
      linie++;
    }
  });
  return liste;
}

/** Liegt der Bot in `fen` klar vorne, mit einem fast figurenlosen Gegner (oder hat der
 * Gegner nur noch seinen König)? */
export function istGewonnenesEndspiel(fen: string, botFarbe: "w" | "b"): boolean {
  const vorsprung = materialBewertung(fen, botFarbe);
  if (vorsprung <= 0) return false;
  const botWeiss = botFarbe === "w";
  const gegner = figurenAusFen(fen).filter((f) => f.weiss !== botWeiss && f.typ !== "k");
  // Gegner hat nur noch den König: jeder Vorsprung (auch ein einzelner Bauer) zählt.
  if (gegner.length === 0) return true;
  if (vorsprung < ENDSPIEL_VORSPRUNG) return false;
  const gegnerFiguren = gegner.filter((f) => f.typ !== "p").reduce((summe, f) => summe + FIGURENWERTE[f.typ], 0);
  return gegnerFiguren <= ENDSPIEL_GEGNER_FIGUREN_MAX;
}

/** Positionsbonus fürs gewonnene Endspiel (0 … < 1 Bauerneinheit). */
export function endspielBonus(fen: string, botFarbe: "w" | "b"): number {
  const botWeiss = botFarbe === "w";
  const figuren = figurenAusFen(fen);
  const eigenerKoenig = figuren.find((f) => f.typ === "k" && f.weiss === botWeiss);
  const gegnerKoenig = figuren.find((f) => f.typ === "k" && f.weiss !== botWeiss);
  if (!eigenerKoenig || !gegnerKoenig) return 0;
  // Abstand des gegnerischen Königs vom Zentrum (0 … 6): je größer, desto näher am Rand/Eck.
  const zentrumsAbstand =
    Math.max(3 - gegnerKoenig.linie, gegnerKoenig.linie - 4, 0) + Math.max(3 - gegnerKoenig.reihe, gegnerKoenig.reihe - 4, 0);
  // Abstand der beiden Könige (Manhattan, 0 … 14): je kleiner, desto besser.
  const koenigsAbstand =
    Math.abs(eigenerKoenig.linie - gegnerKoenig.linie) + Math.abs(eigenerKoenig.reihe - gegnerKoenig.reihe);
  // Eigene Bauern: wie weit schon vorgerückt (Weiß nach oben, Schwarz nach unten).
  const bauernFortschritt = figuren
    .filter((f) => f.typ === "p" && f.weiss === botWeiss)
    .reduce((summe, f) => summe + (botWeiss ? f.reihe - 1 : 6 - f.reihe), 0);
  const roh = 10 * zentrumsAbstand + 4 * (14 - koenigsAbstand) + 6 * Math.min(bauernFortschritt, 20);
  return roh / 250; // höchstens ≈ 0,95
}

/** Stellungsschlüssel ohne Zugzähler — für die Wiederholungserkennung. */
function stellungsSchluessel(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/** Bewertet einen einzelnen Kandidatenzug aus Bot-Sicht. Bei `mitGegenantwort` wird
 * zusätzlich die für den Bot ungünstigste gegnerische Antwort abgezogen (ein Halbzug
 * Suchtiefe) — verhindert, dass die oberen Stufen sorglos Figuren herschenken, weil
 * sie nur die eigene, unmittelbare Materialbilanz sehen. */
function bewerteZug(zug: Move, botFarbe: "w" | "b", mitGegenantwort: boolean, endspiel = false): number {
  const bewerte = (fen: string) => materialBewertung(fen, botFarbe) + (endspiel ? endspielBonus(fen, botFarbe) : 0);
  let bewertung = bewerte(zug.after);
  // Endspiel: den gegnerischen König einsperren — je weniger Felder er nach unserem Zug
  // noch hat, desto besser (wirkt auch ohne Suchtiefe, weil es die Stellung direkt nach
  // dem eigenen Zug misst).
  const einengung = endspiel ? 0.06 * gegnerKoenigsZuege(zug.after) : 0;
  if (mitGegenantwort) {
    const stellungNachEigenemZug = new Chess(zug.after);
    const gegenzuege = stellungNachEigenemZug.moves({ verbose: true }) as Move[];
    for (const gegenzug of gegenzuege) {
      const folgeBewertung = bewerte(gegenzug.after);
      if (folgeBewertung < bewertung) bewertung = folgeBewertung;
    }
  }
  return bewertung - einengung;
}

/** Anzahl legaler Königszüge der Seite, die in `fen` am Zug ist. */
function gegnerKoenigsZuege(fen: string): number {
  return new Chess(fen).moves({ piece: "k" }).length;
}

/** Paket 3 (F1): ab dieser Stufe spielt der Bot ein vorhandenes Matt in 1 immer. */
export const MATT_IMMER_AB_ELO = 400;

function istMattZug(zug: Move): boolean {
  return new Chess(zug.after).isCheckmate();
}

function istPattZug(zug: Move): boolean {
  return new Chess(zug.after).isStalemate();
}

/**
 * Wählt den nächsten Zug des Bots für die gegebene Elo-Stufe.
 *
 * Ablauf: mit Wahrscheinlichkeit `zufallsanteil` wird ein rein zufälliger Legalzug
 * gespielt (das ist der Patzer-Mechanismus der unteren Stufen). Andernfalls werden
 * alle Legalzüge bewertet (Material, optional mit einem Halbzug Gegenantwort) und
 * zufällig einer der `topKAuswahl` bestbewerteten Züge gewählt.
 *
 * Gibt `null` zurück, wenn keine Legalzüge mehr existieren (Matt/Patt) — Aufrufer
 * sollten das ohnehin bereits über `spiel.isGameOver()` behandeln.
 */
export function waehleBotZug(spiel: Chess, elo: number): Move | null {
  const alleZuege = spiel.moves({ verbose: true }) as Move[];
  if (alleZuege.length === 0) return null;

  const stufe = holeStufe(elo);
  const botFarbe = spiel.turn();

  // Paket 3 (2026-09-11, Freispiel-Abfederung F1, bonuskapitel_ganze_partie_umsetzung_
  // 2026-09-10.md Abschnitt 7c): Die Bots werden dadurch nicht stärker, nur zielstrebiger —
  // Partien enden, statt endlos zu mäandern.
  // (1) Matt in 1: ab Stufe Fuchs (400) immer spielen, bei den Eichhörnchen-Stufen mit 50 %.
  //     Im gewonnenen Endspiel (siehe Endspiel-Hilfe) spielen es alle Stufen immer.
  const mattZuege = alleZuege.filter(istMattZug);
  const endspiel = istGewonnenesEndspiel(spiel.fen(), botFarbe);
  if (mattZuege.length > 0 && (stufe.elo >= MATT_IMMER_AB_ELO || endspiel || Math.random() < 0.5)) {
    return mattZuege[Math.floor(Math.random() * mattZuege.length)];
  }
  // (2) Das Kind nie "aus Versehen" patt setzen: Pattzüge fallen weg, solange es andere gibt.
  const ohnePatt = alleZuege.filter((zug) => !istPattZug(zug));
  let kandidaten = ohnePatt.length > 0 ? ohnePatt : alleZuege;

  // (3) Endspiel-Hilfe (siehe Block oben): keine Züge in ungenügendes Material oder eine
  // dreifache Wiederholung, solange es andere gibt; bereits gesehene Stellungen werden im
  // gewonnenen Endspiel zusätzlich abgewertet.
  const gesehen = new Map<string, number>();
  const verlauf = spiel.history({ verbose: true }) as Move[];
  for (const z of verlauf) {
    const k = stellungsSchluessel(z.before);
    gesehen.set(k, (gesehen.get(k) ?? 0) + 1);
  }
  const aktuellerSchluessel = stellungsSchluessel(spiel.fen());
  // Die aktuelle Stellung steht in keinem `before` (sie ist das `after` des letzten Zugs).
  gesehen.set(aktuellerSchluessel, (gesehen.get(aktuellerSchluessel) ?? 0) + 1);
  const wieOftGesehen = (zug: Move) => gesehen.get(stellungsSchluessel(zug.after)) ?? 0;
  const sinnvoll = kandidaten.filter((zug) => wieOftGesehen(zug) < 2 && !new Chess(zug.after).isInsufficientMaterial());
  if (sinnvoll.length > 0) kandidaten = sinnvoll;

  const zufallsanteil = endspiel ? Math.min(stufe.zufallsanteil / 2, 0.25) : stufe.zufallsanteil;
  if (endspiel) {
    // Im gewonnenen Endspiel schaut jede Stufe einen Halbzug voraus, ob sie etwas
    // herschenkt (typisch: die Dame neben den gegnerischen König stellen) — sonst endet
    // die Partie durch "ungenügendes Material" statt mit Matt. Auch Zufallszüge kommen
    // dann nur noch aus den sicheren Zügen.
    const materialJetzt = materialBewertung(spiel.fen(), botFarbe);
    const sicher = kandidaten.filter((zug) => bewerteZug(zug, botFarbe, true) >= materialJetzt - 0.5);
    if (sicher.length > 0) kandidaten = sicher;
  }

  if (Math.random() < zufallsanteil) {
    return kandidaten[Math.floor(Math.random() * kandidaten.length)];
  }

  const mitGegenantwort = stufe.suchtiefe === 1 || endspiel;
  const bewertet = kandidaten
    .map((zug) => ({
      zug,
      bewertung: bewerteZug(zug, botFarbe, mitGegenantwort, endspiel) - (endspiel && wieOftGesehen(zug) > 0 ? 0.5 : 0),
    }))
    .sort((a, b) => b.bewertung - a.bewertung);

  const topK = Math.min(endspiel ? Math.min(stufe.topKAuswahl, 2) : stufe.topKAuswahl, bewertet.length);
  const auswahl = bewertet.slice(0, topK);
  return auswahl[Math.floor(Math.random() * auswahl.length)].zug;
}

/** Führt `waehleBotZug` aus und spielt den Zug direkt auf `spiel` (mutiert die
 * übergebene Chess-Instanz, wie chess.js es sonst auch handhabt). Bequemlichkeits-
 * Wrapper für den Freispiel-Screen; gibt den gespielten Zug zurück oder `null` bei
 * Spielende. */
export function spieleBotZug(spiel: Chess, elo: number): Move | null {
  const zug = waehleBotZug(spiel, elo);
  if (!zug) return null;
  spiel.move({ from: zug.from, to: zug.to, promotion: zug.promotion ?? "q" });
  return zug;
}
