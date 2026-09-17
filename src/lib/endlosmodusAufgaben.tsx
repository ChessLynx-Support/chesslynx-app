// Brett-Konfigurationen für die sieben spielbaren Endlosmodus-Spalten (siehe
// endlosmodusSpalten.ts für die Statusliste — status "folgt" hat hier bewusst keinen
// Eintrag). Jede Aufgabe entspricht strukturell genau dem, was QuestMoveScreen.tsx für die
// sechs Hauptquests bereits leistet ("eine Stellung laden, EINE Figur darf ziehen, jeder
// von chess.js gelieferte Legalzug schließt die Aufgabe ab", Entscheidung 2026-09-07) — nur
// mit einer eigenen, schlankeren Laufzeit-Komponente (EndlosmodusPuzzle.tsx) statt
// QuestMoveScreen selbst, weil zwei Dinge nicht passen:
//   1. QuestMoveScreen lädt seine Stellung über `createPosition()` (chessEngine.ts), das
//      BEWUSST die FEN-Validierung abschaltet (Quest-Stellungen haben keine Könige). Die
//      Endlosmodus-Stellungen sind dagegen vollständige, gültige FENs (siehe chessEngine.ts,
//      Kommentar: "Bonuskapitel, Endlosmodus, Freispiel ... behalten die volle
//      Validierung") — hier deshalb direkt `new Chess(fen)` ohne skipValidation.
//   2. QuestMoveScreen koppelt "im Schach"-Anzeige (bedrohtAt/angreiferAt) fest an die
//      GEZOGENE Figur (aktuellerOrt) — passend für Quest 6 (der eigene König zieht selbst
//      aus dem Schach). Bei "Schach lösen durch Blockieren/Schlagen" zieht aber eine ANDERE
//      Figur als der bedrohte König (siehe rabenfels_schach.blockieren/schlagen unten) —
//      bedrohtAt/angreiferAt müssen deshalb unabhängig von pieceAt setzbar sein.
//
// Für "eigene Fesselung"/"fremde Fesselung" wird dieselbe kettenlinie-Konvention wie in
// bonus/Fesselung.tsx übernommen: {von: König, bis: Angreifer} bzw. {von: fesselnder Turm,
// bis: gegnerischer König} — siehe dortiger Kommentar, hier bewusst identisch gehalten,
// damit dasselbe visuelle Signal ("goldene Kettenlinie") in beiden Kontexten dasselbe
// bedeutet.
//
// Figurenwahl/Felder unten sind aus den ausführlichen Kommentaren über den jeweiligen
// POSITIONS-Konstanten in chessEngine.ts übernommen (dort steht die Begründung, welche
// Figur auf welchem Feld steht und warum) — diese Datei fügt nur die Board-Darstellung
// hinzu, keine neue Spiellogik.

import { fromAlgebraic, type BoardSquare } from "./chessEngine";
// Nachtrag (2026-09-17, Typecheck-Fix): `fromAlgebraic` erwartet chess.js' eigenen `Square`-Typ
// (Vereinigung aller 64 Feldbezeichnungen als String-Literale), nicht `string`. Die Erobern-
// Rohdaten unten (`ErobernRohEintrag`) brauchen deshalb denselben Typ für ihre Feld-Angaben —
// sonst lehnt `tsc` jeden `sq(roh.angreiferFeld)`-Aufruf ab, obwohl die Werte selbst gültige
// Felder sind (TypeScript weitet Objektliteral-Felder ohne engeren Zieltyp auf `string`).
import type { Square as AlgebraicSquare } from "chess.js";
import {
  FUCHSBAU_SCHACH_POSITIONEN,
  DACHSHOEHLE_SCHACH_POSITIONEN,
  DACHSHOEHLE_ROCHADE_POSITIONEN,
} from "./chessEngine";
// Nachtrag (2026-09-17, Gefaehrten-Motive-Kuration): ADLERHORST_FESSELUNG_POSITIONEN/
// WOLFSFESTE_FESSELUNG_POSITIONEN (chessEngine.ts) werden hier nicht mehr importiert — die
// "Fesselung"-Spalten haben jetzt 23 statt 3 Aufgaben (siehe ADLERHORST_LOESEN_AUFGABEN/
// WOLFSFESTE_LOESEN_AUFGABEN oben) und bauen ihre Stellungen direkt aus den neu kuratierten
// FENs, nicht mehr aus den alten Handstellungen. Die beiden Konstanten bleiben in
// chessEngine.ts unangetastet stehen (siehe dortiger Kommentar bei den Erobern-Spalten).
//
// Nachtrag (2026-09-17): EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS/DACHSHOEHLE_FIGUR_GEWINNEN_
// POSITIONS (chessEngine.ts) werden hier nicht mehr importiert — die "Figur gewinnen"-
// Spalten haben jetzt 23 statt 3 Aufgaben (siehe EICHHOERNCHEN_EROBERN_ROH/DACHSHOEHLE_
// EROBERN_ROH unten). Die alten Drei-Stellungen-Konstanten bleiben in chessEngine.ts
// unangetastet stehen (weiterhin von verify/test-endlosmodus-logic.cjs geprüft), nur hier
// nicht mehr verwendet.
import {
  TurmMasterIcon,
  TurmMasterDunkelIcon,
  SpringerMasterIcon,
  SpringerMasterDunkelIcon,
  LaeuferMasterIcon,
  LaeuferMasterDunkelIcon,
  KoenigMasterIcon,
  KoenigMasterDunkelIcon,
  DameMasterIcon,
  DameMasterDunkelIcon,
  BauerMasterIcon,
  BauerMasterDunkelIcon,
} from "./pieceMasters";
import type { EndlosmodusSpalteId } from "./endlosmodusSpalten";
import type { ReactNode } from "react";
// Nachtrag (2026-09-17, Gefaehrten-Motive-Kuration, siehe claude/
// gefaehrten_motive_kuration_2026-09-17.md und claude/stufe3_interaktionsmodell_konzept_
// 2026-09-17.md): `figurenAusFen`/`iconFuer` sind bereits fuer Quest 6 gebaut (mehrere
// eigene Figuren aus der FEN lesen + passendes Master-Icon dazu) — hier wiederverwendet,
// statt die Zusatzfiguren jeder der 115 neuen Stellungen von Hand aufzuzaehlen (wie es die
// aeltere ErobernRohEintrag.zusatzfiguren-Liste oben noch tut).
import { figurenAusFen, iconFuer } from "../quest6/SchachAufgabe";

const sq = fromAlgebraic;

export type EndlosmodusAufgabe = {
  fen: string;
  pieceAt: BoardSquare;
  pieceIcon: ReactNode;
  opponentAt?: BoardSquare;
  opponentIcon?: ReactNode;
  zusatzfiguren?: { at: BoardSquare; icon: ReactNode }[];
  kettenlinie?: { von: BoardSquare; bis: BoardSquare };
  bedrohtAt?: BoardSquare;
  angreiferAt?: BoardSquare;
  /**
   * Bugfix (Gerätetest 2026-09-16, Christian: "Die Quests zum Figuren erobern sind viel zu
   * einfach, ohne Lernwert, da es die einzige sinnvolle Option ist"): Ohne dieses Feld schließt
   * JEDER Legalzug der ziehenden Figur die Aufgabe ab (siehe EndlosmodusPuzzle.tsx) — beim Turm
   * z. B. auch ein belangloser Zug quer übers leere Brett, ohne die gegnerische Figur je zu
   * berühren. Für "Figur gewinnen" und die Fesselungs-Perspektivwechsel-Aufgaben (freies
   * Schlagen einer scheinbar gedeckten Figur) ist das der eigentliche Lernpunkt, nicht irgendein
   * Zug — deshalb hier die tatsächlich lösenden Zielfelder benannt.
   *
   * Bewusst KEINE Einschränkung von `legalTargets` selbst (das wäre derselbe Fehler wie die
   * früheren `onlyCaptureAt`/`onlyTarget`-Filter, siehe QuestMoveScreen.tsx-Kopfkommentar,
   * "Rechtsbewegung-Bug"): das Brett zeigt weiterhin ALLE echten Legalzüge an und nimmt sie an,
   * nur die Erfolgs-Wertung (Stern, Abschluss) ist an `zielTargets` gebunden. Ein Zug auf ein
   * anderes legales Feld bewegt die Figur dorthin wirklich (nichts wird versteckt oder verboten)
   * und die Übung geht von dort aus weiter — kein Fehler, keine Bestrafung, nur noch nicht
   * gelöst. Undefined (die meisten übrigen Aufgaben: Schach lösen, Rochade, Fesselung-
   * Linienbewegung) heißt weiterhin "jeder Legalzug löst", weil dort JEDER Legalzug bereits
   * durch die Schachregeln selbst zwangsläufig sinnvoll ist (ein Zug aus dem Schach heraus MUSS
   * das Schach lösen; eine gefesselte Figur darf ohnehin nur auf der Linie bleiben).
   */
  zielTargets?: BoardSquare[];
  /**
   * Nachtrag (2026-09-17, Schwierigkeitseskalation "Figur gewinnen", siehe
   * claude/taktik_schwierigkeitseskalation_konzept_2026-09-16.md): welcher der drei
   * Eskalationsstufen diese Aufgabe angehört — nur bei den prozedural kuratierten Erobern-
   * Aufgaben gesetzt (siehe baueErobernAufgabe unten). Treibt in EndlosmodusSpalte.tsx die
   * Fortschrittsanzeige ("Stufe 1 · Aufgabe 4 von 10") und in EndlosmodusPuzzle.tsx den
   * generischen Lux-Hinweistext (Stufe 1 ohne Köder vs. Stufe 2/3 mit Köder) — bewusst kein
   * fest eingebrannter Hinweistext hier (siehe luxHinweis.ts-Kommentar "FUNKTION statt
   * Konstante": diese Datei wird beim App-Start einmalig ausgewertet, ein hier eingebrannter
   * `t(...)`-Aufruf würde dauerhaft in der zu diesem Zeitpunkt aktiven Sprache einfrieren).
   */
  stufe?: 1 | 2 | 3;
  /**
   * Nachtrag (2026-09-17, Stufe-3-Interaktionsmodell, siehe claude/
   * stufe3_interaktionsmodell_konzept_2026-09-17.md): kurze Erklaerung, WARUM genau
   * `pieceAt` -> `zielTargets[0]` der richtige Zug ist — wird in EndlosmodusPuzzle.tsx als
   * dritte, hoechste Hinweisstufe angezeigt (volle Empfehlung inkl. Begruendung). Nur bei
   * stufe===3 gesetzt/verwendet; ohne Wert faellt EndlosmodusPuzzle.tsx auf einen
   * generischen Text zurueck.
   */
  stufe3Erklaerung?: string;
};

// --- Erobern-Eskalation (Eichhörnchen-Lichtung + Dachshöhle, 23 statt bisher 3 Aufgaben je
// Spalte, siehe claude/erobern_kuration_2026-09-17.md für die vollständige, python-chess-
// verifizierte Kuration und claude/taktik_schwierigkeitseskalation_konzept_2026-09-16.md für
// das zugrunde liegende Konzept) -----------------------------------------------------------
//
// Anders als die übrigen, von Hand kommentierten Stellungen unten (je 3 pro Spalte, jede
// einzeln in chessEngine.ts begründet) sind dies 46 PROZEDURAL generierte und einzeln mit
// python-chess verifizierte Stellungen (Rejection-Sampling, siehe Methodik-Abschnitt der
// Kuration) — 46 Einzelkommentare wären hier weder lesbar noch pflegbar. Stattdessen trägt
// jeder Rohdaten-Eintrag nur die geometrischen Fakten (Angreiferfeld/-typ, Zielfeld, alle
// übrigen Figuren mit Feld+Symbol) und `baueErobernAufgabe` baut daraus ein vollständiges,
// den übrigen Aufgaben strukturell gleichwertiges EndlosmodusAufgabe-Objekt.
//
// WICHTIG (Christian-Korrektur 2026-09-16 spät abends: "Echte Stellungen mit König und
// einigem Material. Das Kind soll sehen, welche Figur hier einfach zu gewinnen ist, weil
// ungedeckt."): anders als die alten, sehr abstrakten Stellungen unten (leeres Brett, keine
// Könige sichtbar) zeigt jede Erobern-Aufgabe hier BEIDE Könige und alle Bauern/Nebenfiguren
// aus der jeweiligen FEN auch tatsächlich auf dem Brett (siehe `zusatzfiguren` unten) — genau
// die von Christian geforderte "echte Partie-Optik" statt eines Diagramms.

type FigurSymbol = "K" | "k" | "Q" | "q" | "R" | "r" | "B" | "b" | "N" | "n" | "P" | "p";

type ErobernRohEintrag = {
  fen: string;
  angreiferFeld: AlgebraicSquare;
  angreiferSymbol: FigurSymbol;
  zielFeld: AlgebraicSquare;
  zusatzfiguren: { feld: AlgebraicSquare; symbol: FigurSymbol }[];
};

function iconFuerSymbol(symbol: FigurSymbol): ReactNode {
  switch (symbol) {
    case "K":
      return <KoenigMasterIcon />;
    case "k":
      return <KoenigMasterDunkelIcon />;
    case "Q":
      return <DameMasterIcon />;
    case "q":
      return <DameMasterDunkelIcon />;
    case "R":
      return <TurmMasterIcon />;
    case "r":
      return <TurmMasterDunkelIcon />;
    case "B":
      return <LaeuferMasterIcon />;
    case "b":
      return <LaeuferMasterDunkelIcon />;
    case "N":
      return <SpringerMasterIcon />;
    case "n":
      return <SpringerMasterDunkelIcon />;
    case "P":
      return <BauerMasterIcon />;
    case "p":
      return <BauerMasterDunkelIcon />;
    default:
      throw new Error(`Unbekanntes Figurensymbol in Erobern-Rohdaten: ${symbol}`);
  }
}

/** Baut eine vollständige EndlosmodusAufgabe aus einem Erobern-Rohdaten-Eintrag. `stufe`
 *  wird von außen mitgegeben (aus der Position im jeweiligen Stufen-Block, siehe unten),
 *  nicht aus dem Eintrag selbst abgeleitet. */
// Nachtrag (2026-09-17, Stufe-3-Interaktionsmodell): dieselbe Erklaerung fuer alle zehn
// Erobern-Stufe3-Stellungen (Eichhoernchen + Dachshoehle) — der Lernpunkt ist ausnahmslos
// derselbe (siehe EndlosmodusAufgabe.stufe3Erklaerung-Kommentar oben).
const EROBERN_STUFE3_ERKLAERUNG =
  "Diese Figur steht hier ungedeckt: schlägst du sie mit der markierten Figur, schlägt nichts zurück.";

function baueErobernAufgabe(roh: ErobernRohEintrag, stufe: 1 | 2 | 3): EndlosmodusAufgabe {
  return {
    fen: roh.fen,
    pieceAt: sq(roh.angreiferFeld),
    pieceIcon: iconFuerSymbol(roh.angreiferSymbol),
    opponentAt: sq(roh.zielFeld),
    opponentIcon: <SpringerMasterDunkelIcon />, // Zielfigur ist im Generator immer ein schwarzer Springer.
    zusatzfiguren: roh.zusatzfiguren.map((z) => ({ at: sq(z.feld), icon: iconFuerSymbol(z.symbol) })),
    zielTargets: [sq(roh.zielFeld)], // siehe EndlosmodusAufgabe.zielTargets-Kommentar: nur das sichere Schlagen zählt.
    stufe,
    stufe3Erklaerung: stufe === 3 ? EROBERN_STUFE3_ERKLAERUNG : undefined,
  };
}

/** Baut ein vollständiges 23er-Array (10 Stufe 1, 8 Stufe 2, 5 Stufe 3) aus den drei
 *  Rohdaten-Blöcken einer Spalte. */
function baueErobernSpalte(
  stufe1: ErobernRohEintrag[],
  stufe2: ErobernRohEintrag[],
  stufe3: ErobernRohEintrag[]
): EndlosmodusAufgabe[] {
  return [
    ...stufe1.map((r) => baueErobernAufgabe(r, 1)),
    ...stufe2.map((r) => baueErobernAufgabe(r, 2)),
    ...stufe3.map((r) => baueErobernAufgabe(r, 3)),
  ];
}

// Eichhörnchen-Lichtung — Stufe 1 (10, kein Köder, steigendes Material).
const EICHHOERNCHEN_EROBERN_STUFE1: ErobernRohEintrag[] = [
  { fen: "8/1k6/8/8/4nR2/8/8/1K6 w - - 0 1", angreiferFeld: "f4", angreiferSymbol: "R", zielFeld: "e4", zusatzfiguren: [{ feld: "b1", symbol: "K" }, { feld: "b7", symbol: "k" }] },
  { fen: "6k1/5p2/8/8/2B5/3n4/5P2/7K w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "B", zielFeld: "d3", zusatzfiguren: [{ feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g8", symbol: "k" }, { feld: "h1", symbol: "K" }] },
  { fen: "1k6/2p4p/8/3n4/5N2/8/K1P3P1/8 w - - 0 1", angreiferFeld: "f4", angreiferSymbol: "N", zielFeld: "d5", zusatzfiguren: [{ feld: "a2", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "7k/ppp5/8/8/5Q2/4n3/P1PP4/6K1 w - - 0 1", angreiferFeld: "f4", angreiferSymbol: "Q", zielFeld: "e3", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "g1", symbol: "K" }, { feld: "h8", symbol: "k" }] },
  { fen: "1k6/p3ppp1/8/8/2R5/7K/P2PPP2/2n5 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "R", zielFeld: "c1", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b8", symbol: "k" }, { feld: "d2", symbol: "P" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g7", symbol: "p" }, { feld: "h3", symbol: "K" }] },
  { fen: "8/1n1ppppk/2B5/8/8/8/K2PPPP1/8 w - - 0 1", angreiferFeld: "c6", angreiferSymbol: "B", zielFeld: "b7", zusatzfiguren: [{ feld: "a2", symbol: "K" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h7", symbol: "k" }] },
  { fen: "1k6/3pppp1/8/n7/2N5/8/3PPPPK/8 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "N", zielFeld: "a5", zusatzfiguren: [{ feld: "b8", symbol: "k" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "K" }] },
  { fen: "7k/p2pp1p1/8/8/2Q2n2/8/P2PP1P1/1K6 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "Q", zielFeld: "f4", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b1", symbol: "K" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h8", symbol: "k" }] },
  { fen: "6k1/pp1ppp1p/8/8/2n5/2R5/PP1PPP1P/6K1 w - - 0 1", angreiferFeld: "c3", angreiferSymbol: "R", zielFeld: "c4", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g1", symbol: "K" }, { feld: "g8", symbol: "k" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "7k/p3ppp1/8/3B4/2n5/8/P3PPP1/1K6 w - - 0 1", angreiferFeld: "d5", angreiferSymbol: "B", zielFeld: "c4", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b1", symbol: "K" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h8", symbol: "k" }] },
];

// Eichhörnchen-Lichtung — Stufe 2 (8, ein gedeckter Köder, richtig vs. falsch unterscheiden).
const EICHHOERNCHEN_EROBERN_STUFE2: ErobernRohEintrag[] = [
  { fen: "8/1k2p1p1/8/8/2nR4/r2r4/6PP/1K6 w - - 0 1", angreiferFeld: "d4", angreiferSymbol: "R", zielFeld: "c4", zusatzfiguren: [{ feld: "a3", symbol: "r" }, { feld: "b1", symbol: "K" }, { feld: "b7", symbol: "k" }, { feld: "d3", symbol: "r" }, { feld: "e7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "P" }] },
  { fen: "8/1k1p1pp1/2n5/1b6/4B3/8/P4PPK/1n6 w - - 0 1", angreiferFeld: "e4", angreiferSymbol: "B", zielFeld: "b1", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "b5", symbol: "b" }, { feld: "b7", symbol: "k" }, { feld: "c6", symbol: "n" }, { feld: "d7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "K" }] },
  { fen: "1k6/p1p4p/4n3/8/3n4/5N2/P1P4P/1K4n1 w - - 0 1", angreiferFeld: "f3", angreiferSymbol: "N", zielFeld: "g1", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b1", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d4", symbol: "n" }, { feld: "e6", symbol: "n" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "4b3/pppp2pk/8/4Qn2/8/7K/PPPPr1P1/8 w - - 0 1", angreiferFeld: "e5", angreiferSymbol: "Q", zielFeld: "f5", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "r" }, { feld: "e8", symbol: "b" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h3", symbol: "K" }, { feld: "h7", symbol: "k" }] },
  { fen: "k4n2/1pp3p1/8/8/8/3b1R1K/1PP3P1/4n3 w - - 0 1", angreiferFeld: "f3", angreiferSymbol: "R", zielFeld: "f8", zusatzfiguren: [{ feld: "a8", symbol: "k" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d3", symbol: "b" }, { feld: "e1", symbol: "n" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h3", symbol: "K" }] },
  { fen: "8/kp1p1pp1/8/b3B3/8/2r5/1P1P1PPn/K7 w - - 0 1", angreiferFeld: "e5", angreiferSymbol: "B", zielFeld: "h2", zusatzfiguren: [{ feld: "a1", symbol: "K" }, { feld: "a5", symbol: "b" }, { feld: "a7", symbol: "k" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c3", symbol: "r" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }] },
  { fen: "8/pkppn3/8/5N1n/8/6nK/P1PP4/8 w - - 0 1", angreiferFeld: "f5", angreiferSymbol: "N", zielFeld: "e7", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b7", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "g3", symbol: "n" }, { feld: "h3", symbol: "K" }, { feld: "h5", symbol: "n" }] },
  { fen: "k2b4/4ppp1/8/b7/8/2Q5/1n2PPPK/8 w - - 0 1", angreiferFeld: "c3", angreiferSymbol: "Q", zielFeld: "b2", zusatzfiguren: [{ feld: "a5", symbol: "b" }, { feld: "a8", symbol: "k" }, { feld: "d8", symbol: "b" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "K" }] },
];

// Eichhörnchen-Lichtung — Stufe 3 (5, Dame als Köder, echtes Brett mit hohem Material).
const EICHHOERNCHEN_EROBERN_STUFE3: ErobernRohEintrag[] = [
  { fen: "6k1/p1pnpp2/7p/3R2q1/8/8/PKP1PP2/8 w - - 0 1", angreiferFeld: "d5", angreiferSymbol: "R", zielFeld: "d7", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "K" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g5", symbol: "q" }, { feld: "g8", symbol: "k" }, { feld: "h6", symbol: "p" }] },
  { fen: "7k/1p3p2/8/3n4/2B5/6n1/KP2qP2/8 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "B", zielFeld: "d5", zusatzfiguren: [{ feld: "a2", symbol: "K" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "e2", symbol: "q" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g3", symbol: "n" }, { feld: "h8", symbol: "k" }] },
  { fen: "8/1p2p1kp/2r5/3N4/5n2/2q5/1P2P2P/K7 w - - 0 1", angreiferFeld: "d5", angreiferSymbol: "N", zielFeld: "f4", zusatzfiguren: [{ feld: "a1", symbol: "K" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c3", symbol: "q" }, { feld: "c6", symbol: "r" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "g7", symbol: "k" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "1k6/p1p1p3/5Qn1/8/8/8/P1PnP2K/5q2 w - - 0 1", angreiferFeld: "f6", angreiferSymbol: "Q", zielFeld: "g6", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "n" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f1", symbol: "q" }, { feld: "h2", symbol: "K" }] },
  { fen: "8/ppp1pr1k/8/5q2/3n1R2/8/PPP1P3/6K1 w - - 0 1", angreiferFeld: "f4", angreiferSymbol: "R", zielFeld: "d4", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f5", symbol: "q" }, { feld: "f7", symbol: "r" }, { feld: "g1", symbol: "K" }, { feld: "h7", symbol: "k" }] },
];

export const EICHHOERNCHEN_EROBERN_AUFGABEN: EndlosmodusAufgabe[] = baueErobernSpalte(
  EICHHOERNCHEN_EROBERN_STUFE1,
  EICHHOERNCHEN_EROBERN_STUFE2,
  EICHHOERNCHEN_EROBERN_STUFE3
);

// Dachshöhle — Stufe 1 (10, kein Köder, steigendes Material).
const DACHSHOEHLE_EROBERN_STUFE1: ErobernRohEintrag[] = [
  { fen: "1k6/8/2R2n2/8/8/8/8/K7 w - - 0 1", angreiferFeld: "c6", angreiferSymbol: "R", zielFeld: "f6", zusatzfiguren: [{ feld: "a1", symbol: "K" }, { feld: "b8", symbol: "k" }] },
  { fen: "1k6/7p/2n5/8/8/5B2/P7/6K1 w - - 0 1", angreiferFeld: "f3", angreiferSymbol: "B", zielFeld: "c6", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "b8", symbol: "k" }, { feld: "g1", symbol: "K" }, { feld: "h7", symbol: "p" }] },
  { fen: "7k/1pp5/8/5n2/3N4/7K/4P1P1/8 w - - 0 1", angreiferFeld: "d4", angreiferSymbol: "N", zielFeld: "f5", zusatzfiguren: [{ feld: "b7", symbol: "p" }, { feld: "c7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "g2", symbol: "P" }, { feld: "h3", symbol: "K" }, { feld: "h8", symbol: "k" }] },
  { fen: "8/1kp2pnp/8/8/3Q4/8/K1P1PP2/8 w - - 0 1", angreiferFeld: "d4", angreiferSymbol: "Q", zielFeld: "g7", zusatzfiguren: [{ feld: "a2", symbol: "K" }, { feld: "b7", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "h7", symbol: "p" }] },
  { fen: "1k2n3/2p2ppp/8/4R3/8/K7/2P2PPP/8 w - - 0 1", angreiferFeld: "e5", angreiferSymbol: "R", zielFeld: "e8", zusatzfiguren: [{ feld: "a3", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "k7/3ppp1p/8/8/8/2B5/1n2PPPP/1K6 w - - 0 1", angreiferFeld: "c3", angreiferSymbol: "B", zielFeld: "b2", zusatzfiguren: [{ feld: "a8", symbol: "k" }, { feld: "b1", symbol: "K" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "8/kpp1p1p1/8/3N4/5n2/8/1PP1P1PK/8 w - - 0 1", angreiferFeld: "d5", angreiferSymbol: "N", zielFeld: "f4", zusatzfiguren: [{ feld: "a7", symbol: "k" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "K" }] },
  { fen: "1k6/3ppppp/8/8/2Q5/2n5/3PPPPP/K7 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "Q", zielFeld: "c3", zusatzfiguren: [{ feld: "a1", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "1k6/p2pppp1/8/8/2R5/8/P1nPPPPK/8 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "R", zielFeld: "c2", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b8", symbol: "k" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "K" }] },
  { fen: "k7/1pppp2p/8/8/6n1/5B2/1PPPP2P/6K1 w - - 0 1", angreiferFeld: "f3", angreiferSymbol: "B", zielFeld: "g4", zusatzfiguren: [{ feld: "a8", symbol: "k" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "g1", symbol: "K" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
];

// Dachshöhle — Stufe 2 (8, ein gedeckter Köder).
const DACHSHOEHLE_EROBERN_STUFE2: ErobernRohEintrag[] = [
  { fen: "8/k3b1pp/2Rb4/8/8/8/1K3P1P/2n5 w - - 0 1", angreiferFeld: "c6", angreiferSymbol: "R", zielFeld: "c1", zusatzfiguren: [{ feld: "a7", symbol: "k" }, { feld: "b2", symbol: "K" }, { feld: "d6", symbol: "b" }, { feld: "e7", symbol: "b" }, { feld: "f2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "1k6/p1p4p/8/3r1b2/4B3/8/PKP3nP/8 w - - 0 1", angreiferFeld: "e4", angreiferSymbol: "B", zielFeld: "g2", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d5", symbol: "r" }, { feld: "f5", symbol: "b" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "8/p4pk1/8/4b3/2N5/7K/Pb1n1P2/8 w - - 0 1", angreiferFeld: "c4", angreiferSymbol: "N", zielFeld: "d2", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "b" }, { feld: "e5", symbol: "b" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g7", symbol: "k" }, { feld: "h3", symbol: "K" }] },
  { fen: "6k1/ppppp3/7n/5n2/5Q2/8/PPPPPn2/6K1 w - - 0 1", angreiferFeld: "f4", angreiferSymbol: "Q", zielFeld: "f2", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f5", symbol: "n" }, { feld: "g1", symbol: "K" }, { feld: "g8", symbol: "k" }, { feld: "h6", symbol: "n" }] },
  { fen: "5r1k/1ppp2p1/8/4n3/4Rn2/K7/1PPP2P1/8 w - - 0 1", angreiferFeld: "e4", angreiferSymbol: "R", zielFeld: "e5", zusatzfiguren: [{ feld: "a3", symbol: "K" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "f4", symbol: "n" }, { feld: "f8", symbol: "r" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h8", symbol: "k" }] },
  { fen: "1k6/2p2p1p/8/4B1r1/3n4/K5b1/2P2P1P/8 w - - 0 1", angreiferFeld: "e5", angreiferSymbol: "B", zielFeld: "d4", zusatzfiguren: [{ feld: "a3", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g3", symbol: "b" }, { feld: "g5", symbol: "r" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "1r5k/3pppp1/2N5/n7/1n6/7K/3PPPP1/8 w - - 0 1", angreiferFeld: "c6", angreiferSymbol: "N", zielFeld: "a5", zusatzfiguren: [{ feld: "b4", symbol: "n" }, { feld: "b8", symbol: "r" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h3", symbol: "K" }, { feld: "h8", symbol: "k" }] },
  { fen: "8/pkp1p2p/8/3n1Qb1/8/5n2/P1P1P1KP/8 w - - 0 1", angreiferFeld: "f5", angreiferSymbol: "Q", zielFeld: "d5", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b7", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f3", symbol: "n" }, { feld: "g2", symbol: "K" }, { feld: "g5", symbol: "b" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
];

// Dachshöhle — Stufe 3 (5, Dame als Köder, echtes Brett mit hohem Material).
const DACHSHOEHLE_EROBERN_STUFE3: ErobernRohEintrag[] = [
  { fen: "8/pkp1p2p/8/3b4/1n3R2/5q2/P1P1P2P/6K1 w - - 0 1", angreiferFeld: "f4", angreiferSymbol: "R", zielFeld: "b4", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b7", symbol: "k" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d5", symbol: "b" }, { feld: "e2", symbol: "P" }, { feld: "e7", symbol: "p" }, { feld: "f3", symbol: "q" }, { feld: "g1", symbol: "K" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "8/pnpp3k/6b1/5q2/4B3/8/PKPP4/8 w - - 0 1", angreiferFeld: "e4", angreiferSymbol: "B", zielFeld: "b7", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "K" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "f5", symbol: "q" }, { feld: "g6", symbol: "b" }, { feld: "h7", symbol: "k" }] },
  { fen: "8/p1p2pkp/8/4N3/1n4n1/3q4/P1P2P1P/1K6 w - - 0 1", angreiferFeld: "e5", angreiferSymbol: "N", zielFeld: "g4", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b1", symbol: "K" }, { feld: "b4", symbol: "n" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d3", symbol: "q" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g7", symbol: "k" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "1k6/3p1ppp/8/4n3/4b3/2Q5/2qP1PPP/K7 w - - 0 1", angreiferFeld: "c3", angreiferSymbol: "Q", zielFeld: "e5", zusatzfiguren: [{ feld: "a1", symbol: "K" }, { feld: "b8", symbol: "k" }, { feld: "c2", symbol: "q" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e4", symbol: "b" }, { feld: "f2", symbol: "P" }, { feld: "f7", symbol: "p" }, { feld: "g2", symbol: "P" }, { feld: "g7", symbol: "p" }, { feld: "h2", symbol: "P" }, { feld: "h7", symbol: "p" }] },
  { fen: "6k1/pppp4/8/5R1n/4rq2/8/PPPP4/6K1 w - - 0 1", angreiferFeld: "f5", angreiferSymbol: "R", zielFeld: "h5", zusatzfiguren: [{ feld: "a2", symbol: "P" }, { feld: "a7", symbol: "p" }, { feld: "b2", symbol: "P" }, { feld: "b7", symbol: "p" }, { feld: "c2", symbol: "P" }, { feld: "c7", symbol: "p" }, { feld: "d2", symbol: "P" }, { feld: "d7", symbol: "p" }, { feld: "e4", symbol: "r" }, { feld: "f4", symbol: "q" }, { feld: "g1", symbol: "K" }, { feld: "g8", symbol: "k" }] },
];

export const DACHSHOEHLE_EROBERN_AUFGABEN: EndlosmodusAufgabe[] = baueErobernSpalte(
  DACHSHOEHLE_EROBERN_STUFE1,
  DACHSHOEHLE_EROBERN_STUFE2,
  DACHSHOEHLE_EROBERN_STUFE3
);

// --- Gefaehrten-Motive (Fesselung loesen/setzen, Gabel, Spiess — 115 Aufgaben ueber 5
// Spalten, siehe claude/gefaehrten_motive_kuration_2026-09-17.md fuer die vollstaendige,
// python-chess-verifizierte Kuration und claude/stufe3_interaktionsmodell_konzept_2026-09-17.md
// fuer das neue Stufe-3-Verhalten) -------------------------------------------------------
//
// Rohdaten-Form bewusst schlanker als ErobernRohEintrag oben: `zusatzfiguren` wird HIER
// nicht mehr von Hand mitgefuehrt, sondern in `baueGefaehrtenAufgabe` direkt aus der FEN
// gelesen (figurenAusFen, siehe Quest 6/SchachAufgabe.tsx) — bei allen vier Motiven ist
// ohnehin IMMER genau eine eigene Figur (`angreiferFeld`) die richtige, alle anderen
// Figuren sind reine Brett-Deko. `koederFeld`/`koederZielFeld`/`gefesselteFigur`/
// `spiessfigur` aus der Kuration werden hier bewusst NICHT uebernommen: das neue Stufe-3-
// Interaktionsmodell (EndlosmodusPuzzle.tsx) lehnt ohnehin JEDEN Zug ab, der nicht exakt
// `angreiferFeld` -> `zielFeld` ist — welches Feld der (jetzt wirkungslose) Koeder gewesen
// waere, muss die Laufzeit dafuer nicht mehr wissen.
type GefaehrtenRohEintrag = {
  fen: string;
  angreiferFeld: AlgebraicSquare;
  zielFeld: AlgebraicSquare;
  hinweis: string;
};

function baueGefaehrtenAufgabe(roh: GefaehrtenRohEintrag, stufe: 1 | 2 | 3): EndlosmodusAufgabe {
  const pieceAt = sq(roh.angreiferFeld);
  const eigene = figurenAusFen(roh.fen).find((f) => f.at.row === pieceAt.row && f.at.col === pieceAt.col);
  const zusatzfiguren = figurenAusFen(roh.fen)
    .filter((f) => !(f.at.row === pieceAt.row && f.at.col === pieceAt.col))
    .map((f) => ({ at: f.at, icon: iconFuer(f.typ, f.farbe) }));
  return {
    fen: roh.fen,
    pieceAt,
    pieceIcon: eigene ? iconFuer(eigene.typ, eigene.farbe) : <KoenigMasterIcon />,
    zusatzfiguren,
    zielTargets: [sq(roh.zielFeld)],
    stufe,
    stufe3Erklaerung: stufe === 3 ? roh.hinweis : undefined,
  };
}

function baueGefaehrtenSpalte(
  stufe1: GefaehrtenRohEintrag[],
  stufe2: GefaehrtenRohEintrag[],
  stufe3: GefaehrtenRohEintrag[]
): EndlosmodusAufgabe[] {
  return [
    ...stufe1.map((r) => baueGefaehrtenAufgabe(r, 1)),
    ...stufe2.map((r) => baueGefaehrtenAufgabe(r, 2)),
    ...stufe3.map((r) => baueGefaehrtenAufgabe(r, 3)),
  ];
}

// Adlerhorst — Fesselung loesen (23).
const ADLERHORST_LOESEN_STUFE1: GefaehrtenRohEintrag[] = [
  { fen: "1r6/1R6/8/1K5P/4p3/8/8/5k2 w - - 0 1", angreiferFeld: "b7", zielFeld: "b8", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "1k6/8/2p5/8/7P/4K3/3B4/2b5 w - - 0 1", angreiferFeld: "d2", zielFeld: "c1", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1P1K2pk/8/3Q1P2/8/3q4/p7/8 w - - 0 1", angreiferFeld: "d5", zielFeld: "d3", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p1K3k1/8/2R5/p1rP4/8/7P/8 w - - 0 1", angreiferFeld: "c5", zielFeld: "c4", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p7/P2K4/8/3PpB1p/8/2P1k2b/8 w - - 0 1", angreiferFeld: "f4", zielFeld: "h2", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/4pK2/PP2Q2p/3q4/8/k2P4/1p6/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "d5", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/P2rRK2/5p1p/P7/4p2p/7P/2P5/2k5 w - - 0 1", angreiferFeld: "e7", zielFeld: "d7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/4P3/2P2p1k/8/2pPb2p/P1p2B2/6K1/8 w - - 0 1", angreiferFeld: "f3", zielFeld: "e4", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1PqP1Pk1/2Q1p3/2K2pPp/2p5/8/2p4P/8 w - - 0 1", angreiferFeld: "c6", zielFeld: "c7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/2pp4/3P2Pk/p4P2/P5p1/7p/1KR1rP2/8 w - - 0 1", angreiferFeld: "c2", zielFeld: "e2", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
];

const ADLERHORST_LOESEN_STUFE2: GefaehrtenRohEintrag[] = [
  { fen: "8/p4k2/1P2r3/3PR2P/8/4K2P/1pp4p/8 w - - 0 1", angreiferFeld: "e5", zielFeld: "e6", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1P2K3/3BP3/8/pb5P/4pppP/1k6/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "b4", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "1k6/7P/1K1P4/1P1p4/3Q2P1/1ppP3p/p4q2/8 w - - 0 1", angreiferFeld: "d4", zielFeld: "f2", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p3P3/5P2/4P2k/1rRK1p2/3Ppp2/1p5P/8 w - - 0 1", angreiferFeld: "c4", zielFeld: "b4", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p1P2P2/1Pp1P3/2P2b2/3pB3/1p1K1Ppp/8/3k4 w - - 0 1", angreiferFeld: "e4", zielFeld: "f5", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/3q4/3Qp1p1/1P4P1/3KPpP1/2P5/p2p1Pkp/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "d7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p2r4/1P1R1p1p/3K3P/1pp3pP/2P5/Pp2P1P1/7k w - - 0 1", angreiferFeld: "d6", zielFeld: "d7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/P3b3/1kpBP1p1/7P/pK4pp/2Pp4/P1pP1P2/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "e7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
];

const ADLERHORST_LOESEN_STUFE3: GefaehrtenRohEintrag[] = [
  { fen: "8/K4p2/8/2P5/6k1/2n2n2/pR1b3P/1b1B4 w - - 0 1", angreiferFeld: "b2", zielFeld: "d2", hinweis: "Laeufer auf d2 ist an den gegnerischen Koenig gefesselt (von d1) und kann nicht zurueckschlagen" },
  { fen: "8/1pKP4/4Pkb1/2p1nn2/2p3Rb/4PR2/8/8 w - - 0 1", angreiferFeld: "g4", zielFeld: "h4", hinweis: "Laeufer auf h4 ist an den gegnerischen Koenig gefesselt (von f3) und kann nicht zurueckschlagen" },
  { fen: "8/8/1np3K1/4P2P/bp5p/1p2kP2/5n1P/R2b2B1 w - - 0 1", angreiferFeld: "a1", zielFeld: "d1", hinweis: "Laeufer auf d1 ist an den gegnerischen Koenig gefesselt (von g1) und kann nicht zurueckschlagen" },
  { fen: "2K5/1p1P1kbp/4nP2/3B1n2/P4bR1/4p2P/pp5P/8 w - - 0 1", angreiferFeld: "g4", zielFeld: "f4", hinweis: "Laeufer auf f4 ist an den gegnerischen Koenig gefesselt (von d5) und kann nicht zurueckschlagen" },
  { fen: "1R1b4/2Pkp2P/2n3Pp/4P1p1/BbPpp1KP/3n4/6p1/8 w - - 0 1", angreiferFeld: "b8", zielFeld: "d8", hinweis: "Laeufer auf d8 ist an den gegnerischen Koenig gefesselt (von a4) und kann nicht zurueckschlagen" },
];

export const ADLERHORST_LOESEN_AUFGABEN: EndlosmodusAufgabe[] = baueGefaehrtenSpalte(
  ADLERHORST_LOESEN_STUFE1,
  ADLERHORST_LOESEN_STUFE2,
  ADLERHORST_LOESEN_STUFE3
);

// Wolfsfeste — Fesselung loesen (23).
const WOLFSFESTE_LOESEN_STUFE1: GefaehrtenRohEintrag[] = [
  { fen: "8/1rR1K3/8/8/1p6/8/1P6/6k1 w - - 0 1", angreiferFeld: "c7", zielFeld: "b7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/P7/4k3/1b6/6p1/3B4/4K3/8 w - - 0 1", angreiferFeld: "d3", zielFeld: "b5", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/q1Q1K3/P1p5/3k4/8/pP6/8/8 w - - 0 1", angreiferFeld: "c7", zielFeld: "a7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/8/1k1rRK2/8/5p2/8/2P2Pp1/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "d6", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "5k2/7p/1P6/3K4/6P1/1P2pB2/1p4b1/8 w - - 0 1", angreiferFeld: "f3", zielFeld: "g2", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p2q4/2Q5/1KP5/P7/4p3/k4p1P/8 w - - 0 1", angreiferFeld: "c6", zielFeld: "d7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1K1Rr3/3p1P2/8/1k5p/4p2p/P3P1P1/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "e7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "3b4/P3B3/5KP1/3p2p1/3pP3/6p1/4P3/k7 w - - 0 1", angreiferFeld: "e7", zielFeld: "d8", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "5q2/P3Q3/3K3p/P6P/Pp6/6p1/pp5P/6k1 w - - 0 1", angreiferFeld: "e7", zielFeld: "f8", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1P5p/p4pP1/1P3k1P/7p/5KRr/3p1P2/8 w - - 0 1", angreiferFeld: "g3", zielFeld: "h3", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
];

const WOLFSFESTE_LOESEN_STUFE2: GefaehrtenRohEintrag[] = [
  { fen: "8/2rP1p1p/8/2R4P/1PK2P2/7k/p6p/8 w - - 0 1", angreiferFeld: "c5", zielFeld: "c7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/3P4/1bp2P2/P1B5/2pKP3/8/3p1p2/1k6 w - - 0 1", angreiferFeld: "c5", zielFeld: "b6", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1p1q4/3Q2p1/3K4/PP2pP2/5p1P/1p4P1/4k3 w - - 0 1", angreiferFeld: "d6", zielFeld: "d7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/1pK1Rr2/5P2/7P/3p4/5kPp/2P1p1pP/8 w - - 0 1", angreiferFeld: "e7", zielFeld: "f7", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "2b5/1p2p3/P3B3/1pP2K2/pP1P4/7k/2pP1p1P/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "c8", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/P3p3/P3p1k1/1p2P3/1pPpp3/3P3P/2qQ1K2/8 w - - 0 1", angreiferFeld: "d2", zielFeld: "c2", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/P2Pp3/6p1/P2p4/p1p1pp2/rRK2P1P/P2P4/7k w - - 0 1", angreiferFeld: "b3", zielFeld: "a3", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
  { fen: "8/p2P3p/2PP2PP/2p2P2/bpp2pp1/1B6/P1K4k/8 w - - 0 1", angreiferFeld: "b3", zielFeld: "a4", hinweis: "loest die Fesselung durch Schlagen der fesselnden Figur" },
];

const WOLFSFESTE_LOESEN_STUFE3: GefaehrtenRohEintrag[] = [
  { fen: "n7/2b4P/1p3RP1/2R4b/1K3n1p/5k2/8/8 w - - 0 1", angreiferFeld: "c5", zielFeld: "h5", hinweis: "Laeufer auf h5 ist an den gegnerischen Koenig gefesselt (von f6) und kann nicht zurueckschlagen" },
  { fen: "1R3b2/3k4/4n3/p5PK/n3P1B1/5p1p/1b1P4/8 w - - 0 1", angreiferFeld: "b8", zielFeld: "f8", hinweis: "Laeufer auf f8 ist an den gegnerischen Koenig gefesselt (von g4) und kann nicht zurueckschlagen" },
  { fen: "8/4P3/1b1R4/Pk1b4/2n2n2/P1p1p3/pp1PB2K/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "b6", hinweis: "Laeufer auf b6 ist an den gegnerischen Koenig gefesselt (von e2) und kann nicht zurueckschlagen" },
  { fen: "K7/p1p1k3/P1Pn3P/1P3bR1/1B3P1p/5p2/p5b1/4n3 w - - 0 1", angreiferFeld: "g5", zielFeld: "f5", hinweis: "Laeufer auf f5 ist an den gegnerischen Koenig gefesselt (von b4) und kann nicht zurueckschlagen" },
  { fen: "8/2b5/4n1P1/Pp2p1P1/8/pPR1bKP1/pPp2p2/1R1nk3 w - - 0 1", angreiferFeld: "c3", zielFeld: "e3", hinweis: "Laeufer auf e3 ist an den gegnerischen Koenig gefesselt (von b1) und kann nicht zurueckschlagen" },
];

export const WOLFSFESTE_LOESEN_AUFGABEN: EndlosmodusAufgabe[] = baueGefaehrtenSpalte(
  WOLFSFESTE_LOESEN_STUFE1,
  WOLFSFESTE_LOESEN_STUFE2,
  WOLFSFESTE_LOESEN_STUFE3
);

// Rabenfels — Fesselung setzen (neu, 23).
const RABENFELS_SETZEN_STUFE1: GefaehrtenRohEintrag[] = [
  { fen: "4R3/8/2r5/2k5/8/6P1/3p4/7K w - - 0 1", angreiferFeld: "e8", zielFeld: "c8", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/6P1/5b2/6k1/1B6/7K/7p/8 w - - 0 1", angreiferFeld: "b4", zielFeld: "e7", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/5K2/Q7/6p1/4P1p1/2q1k1P1/8/8 w - - 0 1", angreiferFeld: "a6", zielFeld: "a3", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/8/7p/5R2/2Pkr3/3P3p/8/1K6 w - - 0 1", angreiferFeld: "f5", zielFeld: "f4", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/5b1B/2p1kP2/2P5/4p3/K1Pp4/8/8 w - - 0 1", angreiferFeld: "h7", zielFeld: "g8", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "3Q4/5q1P/2pP4/5k2/1p3p2/2P5/8/2K5 w - - 0 1", angreiferFeld: "d8", zielFeld: "f8", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/1p1P4/pkr2PP1/p3R3/4p3/4P3/1K6/8 w - - 0 1", angreiferFeld: "e5", zielFeld: "e6", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/3P1p2/1k3p1P/2b2PB1/ppK5/8/6P1/8 w - - 0 1", angreiferFeld: "g5", zielFeld: "e3", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "7K/8/5kp1/1P6/p2p1qP1/1P1p4/Pp2Q1P1/8 w - - 0 1", angreiferFeld: "e2", zielFeld: "f2", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
  { fen: "8/2p3RP/2P2p2/2P2K2/pp1kr3/3Pp3/7P/8 w - - 0 1", angreiferFeld: "g7", zielFeld: "g4", hinweis: "zieht auf die Linie zwischen gegnerischem Koenig und der Figur -> Fesselung" },
];

const RABENFELS_SETZEN_STUFE2: GefaehrtenRohEintrag[] = [
  { fen: "8/6P1/3k4/3r4/8/7R/6p1/K7 w - - 0 1", angreiferFeld: "h3", zielFeld: "d3", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "8/2k5/7p/4b3/8/8/3BP1K1/8 w - - 0 1", angreiferFeld: "d2", zielFeld: "f4", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "8/8/3Q4/6pK/5qP1/8/2P2k1p/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "f6", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "8/8/1p4K1/2Pk1p2/8/3r4/5P2/6R1 w - - 0 1", angreiferFeld: "g1", zielFeld: "d1", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "8/3K4/1p1b4/2k5/p6B/2p5/1P1P1P2/8 w - - 0 1", angreiferFeld: "h4", zielFeld: "e7", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "2K5/2PQ4/3p1p1P/7P/8/1q4p1/2k5/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "a4", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "8/8/1PP3P1/1R6/2Pp1p1p/7p/2r1k3/7K w - - 0 1", angreiferFeld: "b5", zielFeld: "b2", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
  { fen: "8/8/8/pKP3P1/p6P/5bP1/Bpp3k1/8 w - - 0 1", angreiferFeld: "a2", zielFeld: "d5", hinweis: "das andere Zielfeld liegt auf derselben Zufahrtslinie, trifft die Fesselungsachse aber nicht genau" },
];

const RABENFELS_SETZEN_STUFE3: GefaehrtenRohEintrag[] = [
  { fen: "8/3Q4/8/1p6/1P1Pq3/1K6/5pk1/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "c6", hinweis: "der naheliegende gerade Zug erzeugt keine Fesselung, der diagonale schon" },
  { fen: "8/p4Q2/p1q5/1k6/1P4K1/3P3P/2p5/8 w - - 0 1", angreiferFeld: "f7", zielFeld: "e8", hinweis: "der naheliegende gerade Zug erzeugt keine Fesselung, der diagonale schon" },
  { fen: "8/1P3K2/1p6/4qP2/7Q/2kpp3/p3P1P1/8 w - - 0 1", angreiferFeld: "h4", zielFeld: "f6", hinweis: "der naheliegende gerade Zug erzeugt keine Fesselung, der diagonale schon" },
  { fen: "K7/p1p1Q3/7P/2PP1p2/5p2/3p2q1/P4kP1/8 w - - 0 1", angreiferFeld: "e7", zielFeld: "h4", hinweis: "der naheliegende gerade Zug erzeugt keine Fesselung, der diagonale schon" },
  { fen: "8/5p2/1p2P1P1/5P1P/2Q2p2/Kp3q1P/p3p1kP/8 w - - 0 1", angreiferFeld: "c4", zielFeld: "d5", hinweis: "der naheliegende gerade Zug erzeugt keine Fesselung, der diagonale schon" },
];

export const RABENFELS_SETZEN_AUFGABEN: EndlosmodusAufgabe[] = baueGefaehrtenSpalte(
  RABENFELS_SETZEN_STUFE1,
  RABENFELS_SETZEN_STUFE2,
  RABENFELS_SETZEN_STUFE3
);

// Eichhoernchen-Lichtung — Gabel setzen (23, zweite Fokus-Spalte).
const EICHHOERNCHEN_GABEL_STUFE1: GefaehrtenRohEintrag[] = [
  { fen: "8/q7/1p1k4/8/3NP2K/8/8/8 w - - 0 1", angreiferFeld: "d4", zielFeld: "b5", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/5K2/4p3/8/Pk6/N7/8/q7 w - - 0 1", angreiferFeld: "a3", zielFeld: "c2", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/P5q1/6p1/4P3/5N2/4p1k1/8/5K2 w - - 0 1", angreiferFeld: "f4", zielFeld: "h5", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "1K6/2p5/8/8/4q2P/p6k/7P/3N4 w - - 0 1", angreiferFeld: "d1", zielFeld: "f2", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/1P4p1/4Pp2/8/3K2N1/P2p1k2/8/5q2 w - - 0 1", angreiferFeld: "g4", zielFeld: "h2", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/p7/1P4p1/1q1P1k2/P3N2p/8/8/6K1 w - - 0 1", angreiferFeld: "e4", zielFeld: "d6", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/3NpK2/8/1P5p/k3q3/3P4/P1p2Pp1/8 w - - 0 1", angreiferFeld: "d7", zielFeld: "c5", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/8/8/1N1pP2p/1K2Pp2/2P2P2/p1k1q3/8 w - - 0 1", angreiferFeld: "b5", zielFeld: "d4", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "8/2P4P/KpppN1p1/2P5/8/4P2q/P3kp2/8 w - - 0 1", angreiferFeld: "e6", zielFeld: "f4", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
  { fen: "2k5/5Ppp/8/2p5/1pN1q3/6p1/P2PP2P/K7 w - - 0 1", angreiferFeld: "c4", zielFeld: "d6", hinweis: "Springergabel: Schach UND greift gleichzeitig die Dame an" },
];

const EICHHOERNCHEN_GABEL_STUFE2: GefaehrtenRohEintrag[] = [
  { fen: "8/2qP2Nn/5q2/8/K4k2/6p1/8/8 w - - 0 1", angreiferFeld: "g7", zielFeld: "e6", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "6q1/7N/p6K/8/4k3/5q2/3P4/6n1 w - - 0 1", angreiferFeld: "h7", zielFeld: "f6", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "1q6/1PNn4/6P1/8/1k3q2/p7/K4p2/8 w - - 0 1", angreiferFeld: "c7", zielFeld: "d5", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "K7/8/4q3/4Pp2/2P1N3/1k6/6pn/5q2 w - - 0 1", angreiferFeld: "e4", zielFeld: "c5", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "8/2K1P3/1n6/2Pppk1q/2q5/8/6Pp/5N2 w - - 0 1", angreiferFeld: "f1", zielFeld: "g3", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "3K4/1P6/4q1p1/8/4k2p/p1n4N/1P1P4/3q4 w - - 0 1", angreiferFeld: "h3", zielFeld: "g5", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "8/6pN/4k1q1/7p/3Kp2n/pPP4q/6PP/8 w - - 0 1", angreiferFeld: "h7", zielFeld: "g5", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
  { fen: "6K1/3p2PP/q6p/1N1kpP1p/8/P7/5n2/3q4 w - - 0 1", angreiferFeld: "b5", zielFeld: "c7", hinweis: "beide Springerzuege geben Schach, aber nur einer greift wirklich eine ungedeckte Dame an" },
];

const EICHHOERNCHEN_GABEL_STUFE3: GefaehrtenRohEintrag[] = [
  { fen: "8/1k3N2/4q3/2P3p1/p7/8/8/5K2 w - - 0 1", angreiferFeld: "f7", zielFeld: "d8", hinweis: "der Springer kann auch sofort einen Bauern schlagen, die Gabel gewinnt aber mehr" },
  { fen: "8/3k1P2/2N3q1/8/1p6/1p6/5K2/8 w - - 0 1", angreiferFeld: "c6", zielFeld: "e5", hinweis: "der Springer kann auch sofort einen Bauern schlagen, die Gabel gewinnt aber mehr" },
  { fen: "8/q3p2K/8/3PN1P1/2pk4/3p4/8/8 w - - 0 1", angreiferFeld: "e5", zielFeld: "c6", hinweis: "der Springer kann auch sofort einen Bauern schlagen, die Gabel gewinnt aber mehr" },
  { fen: "7K/3k4/N7/8/pp6/3qPp2/7P/8 w - - 0 1", angreiferFeld: "a6", zielFeld: "c5", hinweis: "der Springer kann auch sofort einen Bauern schlagen, die Gabel gewinnt aber mehr" },
  { fen: "8/8/3P1p2/1K4k1/1P2p3/p7/4pq1P/6N1 w - - 0 1", angreiferFeld: "g1", zielFeld: "h3", hinweis: "der Springer kann auch sofort einen Bauern schlagen, die Gabel gewinnt aber mehr" },
];

export const EICHHOERNCHEN_GABEL_AUFGABEN: EndlosmodusAufgabe[] = baueGefaehrtenSpalte(
  EICHHOERNCHEN_GABEL_STUFE1,
  EICHHOERNCHEN_GABEL_STUFE2,
  EICHHOERNCHEN_GABEL_STUFE3
);

// Adlerhorst — Spiess (23, zweite Fokus-Spalte).
const ADLERHORST_SPIESS_STUFE1: GefaehrtenRohEintrag[] = [
  { fen: "8/3p4/6R1/3n1k2/8/8/3P4/K7 w - - 0 1", angreiferFeld: "g6", zielFeld: "g5", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "8/6p1/3B1k2/8/7n/7P/2K5/8 w - - 0 1", angreiferFeld: "d6", zielFeld: "e7", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "8/2P2P1R/3nk3/4p3/1p6/3K4/8/8 w - - 0 1", angreiferFeld: "h7", zielFeld: "h6", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "8/8/P4BPp/3K4/8/p3k3/5n2/8 w - - 0 1", angreiferFeld: "f6", zielFeld: "d4", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "K7/pP6/8/4p3/p5P1/3k1n2/5P2/2R5 w - - 0 1", angreiferFeld: "c1", zielFeld: "c3", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "8/P1KP2P1/1p3n2/4k3/8/1pp1B3/8/8 w - - 0 1", angreiferFeld: "e3", zielFeld: "d4", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "8/1P1K4/3PpR2/p3P1kP/8/p5n1/p7/8 w - - 0 1", angreiferFeld: "f6", zielFeld: "g6", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "K7/P2p4/P7/2pB4/5p2/1p4PP/2k5/1n6 w - - 0 1", angreiferFeld: "d5", zielFeld: "e4", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "2R5/4P3/3kn2P/2pPp2p/7p/p6P/7P/6K1 w - - 0 1", angreiferFeld: "c8", zielFeld: "c6", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
  { fen: "8/1n3K2/2k4P/8/5Ppp/1B1Pp2p/1P3Pp1/8 w - - 0 1", angreiferFeld: "b3", zielFeld: "d5", hinweis: "Schach zwingt den Koenig zu ziehen, dahinter steht der Springer im Fadenkreuz" },
];

const ADLERHORST_SPIESS_STUFE2: GefaehrtenRohEintrag[] = [
  { fen: "8/2P5/8/3n1k2/3p4/8/8/1K5R w - - 0 1", angreiferFeld: "h1", zielFeld: "h5", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "8/5p2/1n6/5P2/3k1K1B/8/8/8 w - - 0 1", angreiferFeld: "h4", zielFeld: "f2", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "8/8/2P1k1nK/4P3/3R4/3pp3/8/8 w - - 0 1", angreiferFeld: "d4", zielFeld: "d6", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "6n1/8/K3kP2/8/4P3/5p2/p3B3/8 w - - 0 1", angreiferFeld: "e2", zielFeld: "c4", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "8/R4P1p/1P5K/2p5/3p4/3k1n2/P7/8 w - - 0 1", angreiferFeld: "a7", zielFeld: "a3", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "4n3/4pk2/3P4/3K4/3p1P2/1p3B2/6P1/8 w - - 0 1", angreiferFeld: "f3", zielFeld: "h5", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "6K1/5p2/5Pp1/2n1P3/2k2p2/4p3/6PP/R7 w - - 0 1", angreiferFeld: "a1", zielFeld: "c1", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
  { fen: "8/2BPP2K/p3P1P1/8/p2kp3/3p4/1n6/8 w - - 0 1", angreiferFeld: "c7", zielFeld: "e5", hinweis: "das Koederfeld gibt kein Schach, nur der echte Spiess-Zug zwingt den Koenig zu weichen" },
];

const ADLERHORST_SPIESS_STUFE3: GefaehrtenRohEintrag[] = [
  { fen: "8/5P2/3pn3/8/4k3/7K/1pR5/8 w - - 0 1", angreiferFeld: "c2", zielFeld: "e2", hinweis: "ein sofortiger Bauernschlag auf einer anderen Linie lenkt ab, der Spiess gewinnt aber mehr" },
  { fen: "8/8/R7/8/3k4/p2n1P2/Kp6/8 w - - 0 1", angreiferFeld: "a6", zielFeld: "d6", hinweis: "ein sofortiger Bauernschlag auf einer anderen Linie lenkt ab, der Spiess gewinnt aber mehr" },
  { fen: "5K2/8/7P/1p6/1R6/8/2k2p2/2n5 w - - 0 1", angreiferFeld: "b4", zielFeld: "c4", hinweis: "ein sofortiger Bauernschlag auf einer anderen Linie lenkt ab, der Spiess gewinnt aber mehr" },
  { fen: "R7/p4P2/2k5/8/2n2K2/p7/8/8 w - - 0 1", angreiferFeld: "a8", zielFeld: "c8", hinweis: "ein sofortiger Bauernschlag auf einer anderen Linie lenkt ab, der Spiess gewinnt aber mehr" },
  { fen: "8/2p5/2p5/1PR1K3/8/3k4/8/3n4 w - - 0 1", angreiferFeld: "c5", zielFeld: "d5", hinweis: "ein sofortiger Bauernschlag auf einer anderen Linie lenkt ab, der Spiess gewinnt aber mehr" },
];

export const ADLERHORST_SPIESS_AUFGABEN: EndlosmodusAufgabe[] = baueGefaehrtenSpalte(
  ADLERHORST_SPIESS_STUFE1,
  ADLERHORST_SPIESS_STUFE2,
  ADLERHORST_SPIESS_STUFE3
);

export const ENDLOSMODUS_AUFGABEN: Partial<Record<EndlosmodusSpalteId, EndlosmodusAufgabe[]>> = {
  // --- Eichhörnchen-Lichtung: Figur gewinnen (23 Aufgaben, siehe EICHHOERNCHEN_EROBERN_
  // AUFGABEN oben) --------------------------------------------------------------------
  eichhoernchen_figurGewinnen: EICHHOERNCHEN_EROBERN_AUFGABEN,

  // --- Rabenfels: Schach lösen (wegziehen/blockieren/schlagen) -------------------------
  // chessEngine.ts führt diese Stellungen weiterhin unter dem alten Namen
  // FUCHSBAU_SCHACH_POSITIONEN (Restbezeichnung, siehe endlosmodusSpalten.ts) — die
  // Zugstellungen selbst sind unverändert gültig.
  rabenfels_schach: [
    {
      // Wegziehen: eigener König d4 im Schach vom Turm d8 -> Kd4-c4.
      fen: FUCHSBAU_SCHACH_POSITIONEN.wegziehen,
      pieceAt: sq("d4"),
      pieceIcon: <KoenigMasterIcon />,
      opponentAt: sq("d8"),
      opponentIcon: <TurmMasterDunkelIcon />,
      bedrohtAt: sq("d4"),
      angreiferAt: sq("d8"),
    },
    {
      // Blockieren: Turm a5 stellt sich auf d5 zwischen den bedrohten König d1 und den
      // angreifenden Turm d8 — die ZIEHENDE Figur (a5) ist nicht dieselbe wie die
      // BEDROHTE (d1), deshalb bedrohtAt/angreiferAt hier unabhängig von pieceAt gesetzt.
      fen: FUCHSBAU_SCHACH_POSITIONEN.blockieren,
      pieceAt: sq("a5"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("d8"),
      opponentIcon: <TurmMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("d1"), icon: <KoenigMasterIcon /> }],
      bedrohtAt: sq("d1"),
      angreiferAt: sq("d8"),
    },
    {
      // Schlagen: Springer b3 schlägt den auf e1 schachbietenden Läufer a5 (Nb3xa5).
      fen: FUCHSBAU_SCHACH_POSITIONEN.schlagen,
      pieceAt: sq("b3"),
      pieceIcon: <SpringerMasterIcon />,
      opponentAt: sq("a5"),
      opponentIcon: <LaeuferMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("e1"), icon: <KoenigMasterIcon /> }],
      bedrohtAt: sq("e1"),
      angreiferAt: sq("a5"),
    },
  ],

  // --- Dachshöhle: Figur gewinnen (23 Aufgaben, siehe DACHSHOEHLE_EROBERN_AUFGABEN oben) ---
  dachshoehle_figurGewinnen: DACHSHOEHLE_EROBERN_AUFGABEN,

  // --- Dachshöhle: Schach lösen (wegziehen/blockieren/schlagen, andere Felder/Figuren
  // als Rabenfels, siehe chessEngine.ts-Kommentar "dieselbe Lösungsidee mit einem anderen
  // Zugmuster") ---------------------------------------------------------------------------
  dachshoehle_schach: [
    {
      fen: DACHSHOEHLE_SCHACH_POSITIONEN.wegziehen,
      pieceAt: sq("d5"),
      pieceIcon: <KoenigMasterIcon />,
      opponentAt: sq("d8"),
      opponentIcon: <TurmMasterDunkelIcon />,
      bedrohtAt: sq("d5"),
      angreiferAt: sq("d8"),
    },
    {
      // Blockieren: Läufer a4 stellt sich auf d7 zwischen König d1 und Turm d8.
      fen: DACHSHOEHLE_SCHACH_POSITIONEN.blockieren,
      pieceAt: sq("a4"),
      pieceIcon: <LaeuferMasterIcon />,
      opponentAt: sq("d8"),
      opponentIcon: <TurmMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("d1"), icon: <KoenigMasterIcon /> }],
      bedrohtAt: sq("d1"),
      angreiferAt: sq("d8"),
    },
    {
      // Schlagen: Turm a4 schlägt den auf h1 schachbietenden Turm h4 (Rxh4).
      fen: DACHSHOEHLE_SCHACH_POSITIONEN.schlagen,
      pieceAt: sq("a4"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("h4"),
      opponentIcon: <TurmMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("h1"), icon: <KoenigMasterIcon /> }],
      bedrohtAt: sq("h1"),
      angreiferAt: sq("h4"),
    },
  ],

  // --- Dachshöhle: Rochade — der König zieht, chess.js liefert die Rochade als seinen
  // eigenen Legalzug (e1->g1/c1), sobald das jeweilige Rochaderecht besteht UND der Weg
  // frei ist; Stern 3 hat formal beide Rechte, aber beide Seiten sind blockiert — der König
  // hat dort trotzdem gewöhnliche, ungefährliche Schrittzüge, siehe chessEngine.ts-
  // Kommentar ("Unterschied zwischen Recht vorhanden und Zug gerade jetzt möglich"). ------
  dachshoehle_rochade: [
    {
      fen: DACHSHOEHLE_ROCHADE_POSITIONEN.stern1,
      pieceAt: sq("e1"),
      pieceIcon: <KoenigMasterIcon />,
      zusatzfiguren: [{ at: sq("h1"), icon: <TurmMasterIcon /> }],
    },
    {
      fen: DACHSHOEHLE_ROCHADE_POSITIONEN.stern2,
      pieceAt: sq("e1"),
      pieceIcon: <KoenigMasterIcon />,
      zusatzfiguren: [{ at: sq("a1"), icon: <TurmMasterIcon /> }],
    },
    {
      fen: DACHSHOEHLE_ROCHADE_POSITIONEN.stern3,
      pieceAt: sq("e1"),
      pieceIcon: <KoenigMasterIcon />,
      zusatzfiguren: [
        { at: sq("a1"), icon: <TurmMasterIcon /> },
        { at: sq("d1"), icon: <SpringerMasterIcon /> },
        { at: sq("f1"), icon: <SpringerMasterIcon /> },
        { at: sq("h1"), icon: <TurmMasterIcon /> },
      ],
    },
  ],

  // --- Adlerhorst: Fesselung loesen (23 Aufgaben, siehe ADLERHORST_LOESEN_AUFGABEN oben) —
  // Nachtrag (2026-09-17, Gefaehrten-Motive-Kuration): ersetzt die alten 3 Handstellungen
  // (ADLERHORST_FESSELUNG_POSITIONEN, bleibt in chessEngine.ts unangetastet stehen, siehe
  // dortiger Kommentar bei den Erobern-Spalten) durch die volle 10/8/5-Eskalation. -------
  adlerhorst_fesselung: ADLERHORST_LOESEN_AUFGABEN,

  // --- Wolfsfeste: Fesselung loesen (23 Aufgaben, siehe WOLFSFESTE_LOESEN_AUFGABEN oben) ---
  wolfsfeste_fesselung: WOLFSFESTE_LOESEN_AUFGABEN,

  // --- Rabenfels: Fesselung setzen (NEU, zweite Fokus-Spalte, 23 Aufgaben) --------------
  rabenfels_fesselungSetzen: RABENFELS_SETZEN_AUFGABEN,

  // --- Eichhoernchen-Lichtung: Gabel setzen (zweite Fokus-Spalte, 23 Aufgaben) ----------
  eichhoernchen_gabel: EICHHOERNCHEN_GABEL_AUFGABEN,

  // --- Adlerhorst: Spiess (zweite Fokus-Spalte, 23 Aufgaben) ---------------------------
  adlerhorst_spiess: ADLERHORST_SPIESS_AUFGABEN,
};
