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
import {
  EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS,
  FUCHSBAU_SCHACH_POSITIONEN,
  DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS,
  DACHSHOEHLE_SCHACH_POSITIONEN,
  DACHSHOEHLE_ROCHADE_POSITIONEN,
  ADLERHORST_FESSELUNG_POSITIONEN,
  WOLFSFESTE_FESSELUNG_POSITIONEN,
} from "./chessEngine";
import {
  TurmMasterIcon,
  TurmMasterDunkelIcon,
  SpringerMasterIcon,
  SpringerMasterDunkelIcon,
  LaeuferMasterIcon,
  LaeuferMasterDunkelIcon,
  KoenigMasterIcon,
  KoenigMasterDunkelIcon,
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
};

type Drei<T> = [T, T, T];

export const ENDLOSMODUS_AUFGABEN: Partial<Record<EndlosmodusSpalteId, Drei<EndlosmodusAufgabe>>> = {
  // --- Eichhörnchen-Lichtung: Figur gewinnen (Turm a1 gegen Springer) -------------------
  eichhoernchen_figurGewinnen: [
    {
      fen: EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS.stern1,
      pieceAt: sq("a1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("a6"),
      opponentIcon: <SpringerMasterDunkelIcon />,
    },
    {
      fen: EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS.stern2,
      pieceAt: sq("a1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("a6"),
      opponentIcon: <SpringerMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("e6"), icon: <SpringerMasterDunkelIcon /> }],
    },
    {
      fen: EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS.stern3,
      pieceAt: sq("a1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("a8"),
      opponentIcon: <SpringerMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("f5"), icon: <SpringerMasterDunkelIcon /> }],
    },
  ],

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

  // --- Dachshöhle: Figur gewinnen (Turm a1 gegen Springer, wie Eichhörnchen-Lichtung) ---
  dachshoehle_figurGewinnen: [
    {
      fen: DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS.stern1,
      pieceAt: sq("a1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("a3"),
      opponentIcon: <SpringerMasterDunkelIcon />,
    },
    {
      fen: DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS.stern2,
      pieceAt: sq("a1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("a4"),
      opponentIcon: <SpringerMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("d5"), icon: <SpringerMasterDunkelIcon /> }],
    },
    {
      fen: DACHSHOEHLE_FIGUR_GEWINNEN_POSITIONS.stern3,
      pieceAt: sq("a1"),
      pieceIcon: <TurmMasterIcon />,
      opponentAt: sq("a7"),
      opponentIcon: <SpringerMasterDunkelIcon />,
      zusatzfiguren: [{ at: sq("f4"), icon: <SpringerMasterDunkelIcon /> }],
    },
  ],

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
    },
  ],
};
