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
  ADLERHORST_FESSELUNG_POSITIONEN,
  WOLFSFESTE_FESSELUNG_POSITIONEN,
} from "./chessEngine";
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

  // --- Adlerhorst: Fesselung (eigene Figur gefesselt bzw. Perspektivwechsel, dieselbe
  // kettenlinie-Konvention wie bonus/Fesselung.tsx) --------------------------------------
  adlerhorst_fesselung: [
    {
      // Eigener Turm e4 gegen eigenen König e1 gefesselt (Turm e8 fesselt entlang e-Linie).
      fen: ADLERHORST_FESSELUNG_POSITIONEN.stern1,
      pieceAt: sq("e4"),
      pieceIcon: <TurmMasterIcon />,
      zusatzfiguren: [
        { at: sq("e1"), icon: <KoenigMasterIcon /> },
        { at: sq("e8"), icon: <TurmMasterDunkelIcon /> },
      ],
      kettenlinie: { von: sq("e1"), bis: sq("e8") },
    },
    {
      // Diagonale Fesselung: Läufer d4 gegen König a1, Läufer h8 fesselt (a1-h8-Diagonale).
      fen: ADLERHORST_FESSELUNG_POSITIONEN.stern2,
      pieceAt: sq("d4"),
      pieceIcon: <LaeuferMasterIcon />,
      zusatzfiguren: [
        { at: sq("a1"), icon: <KoenigMasterIcon /> },
        { at: sq("h8"), icon: <LaeuferMasterDunkelIcon /> },
      ],
      kettenlinie: { von: sq("a1"), bis: sq("h8") },
    },
    {
      // Perspektivwechsel: eigener Turm f1 schlägt den scheinbar gedeckten Springer f4 —
      // der gegnerische Turm g4 ist gegen den schwarzen König g8 gefesselt und darf gar
      // nicht zurückschlagen (siehe chessEngine.ts-Kommentar, zweifach korrigierte Stellung).
      fen: ADLERHORST_FESSELUNG_POSITIONEN.stern3,
      pieceAt: sq("f1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("f4"),
      opponentIcon: <SpringerMasterDunkelIcon />,
      zusatzfiguren: [
        { at: sq("g8"), icon: <KoenigMasterDunkelIcon /> },
        { at: sq("g4"), icon: <TurmMasterDunkelIcon /> },
        { at: sq("h2"), icon: <KoenigMasterIcon /> },
        { at: sq("g1"), icon: <TurmMasterIcon /> },
      ],
      kettenlinie: { von: sq("g1"), bis: sq("g8") },
      // siehe EndlosmodusAufgabe.zielTargets-Kommentar: der Turm hat noch mehrere andere
      // legale, aber belanglose Züge (a1-e1, f2, f3) — nur das Schlagen auf f4 zeigt den
      // eigentlichen Lernpunkt (sicheres Schlagen einer scheinbar gedeckten Figur).
      zielTargets: [sq("f4")],
    },
  ],

  // --- Wolfsfeste: Fesselung (höchste Stufe, andere Felder/Diagonalen als Adlerhorst) ---
  wolfsfeste_fesselung: [
    {
      fen: WOLFSFESTE_FESSELUNG_POSITIONEN.stern1,
      pieceAt: sq("g4"),
      pieceIcon: <TurmMasterIcon />,
      zusatzfiguren: [
        { at: sq("g1"), icon: <KoenigMasterIcon /> },
        { at: sq("g8"), icon: <TurmMasterDunkelIcon /> },
      ],
      kettenlinie: { von: sq("g1"), bis: sq("g8") },
    },
    {
      fen: WOLFSFESTE_FESSELUNG_POSITIONEN.stern2,
      pieceAt: sq("e4"),
      pieceIcon: <LaeuferMasterIcon />,
      zusatzfiguren: [
        { at: sq("h1"), icon: <KoenigMasterIcon /> },
        { at: sq("a8"), icon: <LaeuferMasterDunkelIcon /> },
      ],
      kettenlinie: { von: sq("h1"), bis: sq("a8") },
    },
    {
      // Perspektivwechsel: eigener Turm e1 schlägt den scheinbar gedeckten Springer e4 —
      // der gegnerische Turm b4 ist gegen den schwarzen König b8 gefesselt.
      fen: WOLFSFESTE_FESSELUNG_POSITIONEN.stern3,
      pieceAt: sq("e1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("e4"),
      opponentIcon: <SpringerMasterDunkelIcon />,
      zusatzfiguren: [
        { at: sq("a1"), icon: <KoenigMasterIcon /> },
        { at: sq("b1"), icon: <TurmMasterIcon /> },
        { at: sq("b8"), icon: <KoenigMasterDunkelIcon /> },
        { at: sq("b4"), icon: <TurmMasterDunkelIcon /> },
      ],
      kettenlinie: { von: sq("b1"), bis: sq("b8") },
      // siehe EndlosmodusAufgabe.zielTargets-Kommentar: derselbe Fall wie Adlerhorst Stern 3.
      zielTargets: [sq("e4")],
    },
  ],
};
