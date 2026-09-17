// Paket 2 (2026-09-11, Umsetzungsplan / Vorlage quest6_matt_bruecke_umsetzung_2026-09-10.md):
// Brett-Komponente für die Quest-6-Erweiterung (Schach-Brücke, Mini-Spiel "Schach
// entkommen", Matt-Moment). Unterschied zu QuestMoveScreen: hier stehen MEHRERE eigene
// Figuren auf dem Brett (König, Springer, Läufer, Turm, Igel), und das Kind darf selbst
// wählen, welche davon zieht — genau das ist der Kern der Lektion "drei Wege, dem König
// zu helfen". QuestMoveScreen bleibt für alle Ein-Figur-Screens unverändert.
//
// Aufbau:
// - Alle Figuren werden direkt aus der FEN gelesen (chess.js `board()`), inklusive des
//   gegnerischen Königs — anders als in den Screens 1–3 ist hier die ganze Stellung Teil
//   der Aufgabe (der König kann nur fliehen, wenn man sieht, wo er hin kann).
// - Die ausgewählte eigene Figur ist Board.tsx' `pieceAt` (goldener Sockel, Zielfeld-
//   Ringe). Alle anderen Figuren sind `zusatzfiguren`, der Angreifer ist `opponentAt`
//   (damit das Schlagfeld den Ring statt eines verdeckten Punkts bekommt).
// - Antippen einer anderen eigenen Figur wählt sie aus (Board.tsx `onFeldTap`, neu).
// - `demoZug` lässt Lux einen Zug vorführen (Board.tsx `demoTarget`: hin und zurück).
// - `nurZuege` beschränkt die leuchtenden Züge (Matt-Moment: nur Ra8 — das Kind soll hier
//   den Begriff lernen, nicht suchen). Ohne `nurZuege` leuchten alle Legalzüge.
// - `stopp` ist die Stopp!-Aufgabe: ein Feld, das die ausgewählte Figur zwar erreichen
//   könnte, das den König aber nicht aus dem Schach holt — antippbar, zeigt die
//   Stopp!-Animation, führt aber keinen Zug aus (chess.js lehnt ihn ohnehin ab).
// - Nach dem Zug bleibt das Brett mit der neuen Stellung stehen (die aufrufende Quest
//   entscheidet über den Screenwechsel). Gibt der Zug Schach, wird die neue Bedrohung
//   angezeigt (Matt-Moment: Linie Turm a8 → König g8).

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Board, type BoardConfig } from "../quest1/Board";
import { createPosition, fromAlgebraic, toAlgebraic, tryMove, type BoardSquare } from "../lib/chessEngine";
import {
  BauerMasterIcon,
  BauerMasterDunkelIcon,
  TurmMasterIcon,
  TurmMasterDunkelIcon,
  LaeuferMasterIcon,
  LaeuferMasterDunkelIcon,
  SpringerMasterIcon,
  SpringerMasterDunkelIcon,
  DameMasterIcon,
  DameMasterDunkelIcon,
  KoenigMasterIcon,
  KoenigMasterDunkelIcon,
} from "../lib/pieceMasters";

type Farbe = "w" | "b";
type Typ = "p" | "n" | "b" | "r" | "q" | "k";

export type Figur = { at: BoardSquare; typ: Typ; farbe: Farbe };

export type SchachZug = {
  von: BoardSquare;
  nach: BoardSquare;
  typ: Typ;
  weg: "wegziehen" | "dazwischen" | "schlagen";
  istMatt: boolean;
};

// Nachtrag (2026-09-17, Stufe-3-Interaktionsmodell im Endlosmodus, siehe claude/
// stufe3_interaktionsmodell_konzept_2026-09-17.md): exportiert, damit EndlosmodusPuzzle.tsx
// dieselbe Icon-Zuordnung wiederverwenden kann, statt sie ein zweites Mal zu schreiben —
// keine Verhaltensänderung für Quest 6 selbst.
export function iconFuer(typ: Typ, farbe: Farbe): ReactNode {
  const hell = farbe === "w";
  switch (typ) {
    case "p":
      return hell ? <BauerMasterIcon /> : <BauerMasterDunkelIcon />;
    case "n":
      return hell ? <SpringerMasterIcon /> : <SpringerMasterDunkelIcon />;
    case "b":
      return hell ? <LaeuferMasterIcon /> : <LaeuferMasterDunkelIcon />;
    case "r":
      return hell ? <TurmMasterIcon /> : <TurmMasterDunkelIcon />;
    case "q":
      return hell ? <DameMasterIcon /> : <DameMasterDunkelIcon />;
    default:
      return hell ? <KoenigMasterIcon /> : <KoenigMasterDunkelIcon />;
  }
}

const gleich = (a?: BoardSquare, b?: BoardSquare) => Boolean(a && b && a.row === b.row && a.col === b.col);

export function figurenAusFen(fen: string): Figur[] {
  const brett = createPosition(fen).board();
  const liste: Figur[] = [];
  brett.forEach((reihe, row) =>
    reihe.forEach((feld, col) => {
      if (feld) liste.push({ at: { row, col }, typ: feld.type as Typ, farbe: feld.color as Farbe });
    })
  );
  return liste;
}

/** Findet den Angreifer, der den König der Farbe `farbe` gerade im Schach hält (erster Treffer). */
export function schachGeberFuer(fen: string, farbe: Farbe): { koenigAt: BoardSquare; angreiferAt?: BoardSquare } {
  const game = createPosition(fen);
  const koenig = figurenAusFen(fen).find((f) => f.typ === "k" && f.farbe === farbe)!;
  const angreifer = game.attackers(toAlgebraic(koenig.at), farbe === "w" ? "b" : "w");
  return { koenigAt: koenig.at, angreiferAt: angreifer.length ? fromAlgebraic(angreifer[0]) : undefined };
}

export type SchachAufgabeProps = {
  fen: string;
  /** Anfangs ausgewählte eigene Figur (meist der König). */
  startAt: BoardSquare;
  /** false während Lux erklärt/vorführt: nichts leuchtet, Taps bewirken nur den Puls. */
  interaktiv: boolean;
  /** Warmes Schach-Signal am eigenen König + Linie zum Angreifer. */
  zeigeSchach?: boolean;
  demoZug?: { von: BoardSquare; nach: BoardSquare };
  nurZuege?: { von: BoardSquare; nach: BoardSquare }[];
  stopp?: { von: BoardSquare; nach: BoardSquare };
  onStopp?: () => void;
  onZug: (zug: SchachZug) => void;
  // Paket 3 (2026-09-11, "Die ganze Partie"): Grundstellung ohne hervorgehobene eigene
  // Figur (kein goldener Sockel) — Antippen einer Figur meldet sie über onFigurTap.
  ohneAuswahl?: boolean;
  onFigurTap?: (figur: Figur) => void;
  // Paket 3: empfohlener Zug (geführte Eröffnung) — die Figur ist vorausgewählt, das
  // Zielfeld trägt die Sammel-Eichel als goldenen Hinweis. Alle anderen Legalzüge bleiben
  // erlaubt.
  hinweisZug?: { von: BoardSquare; nach: BoardSquare };
};

export function SchachAufgabe({
  fen,
  startAt,
  interaktiv,
  zeigeSchach,
  demoZug,
  nurZuege,
  stopp,
  onStopp,
  onZug,
  ohneAuswahl,
  onFigurTap,
  hinweisZug,
}: SchachAufgabeProps) {
  const [auswahl, setAuswahl] = useState<BoardSquare>(hinweisZug?.von ?? startAt);
  // Stellung nach dem Zug des Kindes (null = Ausgangsstellung). Das Brett bleibt danach
  // stehen, bis die aufrufende Quest den Screen wechselt.
  const [fenNachZug, setFenNachZug] = useState<string | null>(null);

  const aktuelleFen = fenNachZug ?? fen;
  const figuren = useMemo(() => figurenAusFen(aktuelleFen), [aktuelleFen]);
  // Schach-Anzeige: vor dem Zug der eigene König (falls zeigeSchach), nach einem
  // Schach gebenden Zug der gegnerische König.
  const bedrohung = useMemo(() => {
    if (fenNachZug) {
      const game = createPosition(fenNachZug);
      return game.inCheck() ? schachGeberFuer(fenNachZug, game.turn() as Farbe) : null;
    }
    return zeigeSchach ? schachGeberFuer(fen, "w") : null;
  }, [fen, fenNachZug, zeigeSchach]);

  const eigeneMitZuegen = (von: BoardSquare): BoardSquare[] => {
    if (fenNachZug || !interaktiv) return [];
    const game = createPosition(fen);
    const alle = game
      .moves({ square: toAlgebraic(von), verbose: true })
      .map((m) => fromAlgebraic(m.to as Parameters<typeof fromAlgebraic>[0]));
    if (!nurZuege) return alle;
    return alle.filter((ziel) => nurZuege.some((z) => gleich(z.von, von) && gleich(z.nach, ziel)));
  };

  // Paket 3: `ohneAuswahl` legt die bewegliche Figur auf ein Feld außerhalb des Bretts —
  // Board.tsx findet dann keine Zelle dafür und zeichnet keinen Sockel.
  const bewegteFigurAt = ohneAuswahl ? { row: -1, col: -1 } : demoZug && !fenNachZug ? demoZug.von : auswahl;
  const bewegteFigur = figuren.find((f) => gleich(f.at, bewegteFigurAt));
  const legalTargets = demoZug ? [] : eigeneMitZuegen(auswahl);
  const angreiferAt = bedrohung?.angreiferAt;
  // Ist der Angreifer die gerade gezogene eigene Figur (Matt-Moment: Turm auf a8), bleibt
  // sie `pieceAt` — sonst stünde dieselbe Figur doppelt auf dem Feld.
  const angreifer =
    angreiferAt && !gleich(angreiferAt, bewegteFigurAt) ? figuren.find((f) => gleich(f.at, angreiferAt)) : undefined;

  const config: BoardConfig = {
    rows: 8,
    cols: 8,
    pieceAt: bewegteFigurAt,
    legalTargets,
    pieceIcon: bewegteFigur ? iconFuer(bewegteFigur.typ, bewegteFigur.farbe) : undefined,
    opponentAt: angreifer ? angreiferAt : undefined,
    opponentIcon: angreifer ? iconFuer(angreifer.typ, angreifer.farbe) : undefined,
    zusatzfiguren: figuren
      .filter((f) => !gleich(f.at, bewegteFigurAt) && !gleich(f.at, angreiferAt))
      .map((f) => ({ at: f.at, icon: iconFuer(f.typ, f.farbe) })),
    bedrohtAt: bedrohung?.koenigAt,
    angreiferAt,
    trapTarget: interaktiv && !fenNachZug && stopp && gleich(stopp.von, auswahl) ? stopp.nach : undefined,
    sammelAt: hinweisZug && !fenNachZug && gleich(hinweisZug.von, auswahl) ? hinweisZug.nach : undefined,
  };

  return (
    <Board
      config={config}
      demoTarget={demoZug && !fenNachZug ? demoZug.nach : undefined}
      onTrapTap={onStopp}
      onFeldTap={(feld) => {
        const getippt = figuren.find((f) => gleich(f.at, feld));
        if (getippt && onFigurTap) onFigurTap(getippt);
        if (ohneAuswahl || !interaktiv || fenNachZug) return;
        const figur = getippt;
        if (!figur || figur.farbe !== "w") return;
        // Nur Figuren auswählbar, die in dieser Aufgabe auch wirklich ziehen dürfen
        // (bei nurZuege z. B. nur der Turm) — sonst würde eine Auswahl ohne Leuchtfelder
        // eher verwirren.
        if (nurZuege && !nurZuege.some((z) => gleich(z.von, feld))) return;
        setAuswahl(feld);
      }}
      onCorrectMove={(ziel) => {
        const game = createPosition(fen);
        const vorher = figuren.find((f) => gleich(f.at, auswahl));
        const geschlagen = figuren.find((f) => gleich(f.at, ziel));
        const ergebnis = tryMove(game, auswahl, ziel);
        if (!ergebnis.ok || !vorher) return;
        setFenNachZug(ergebnis.fenAfter);
        setAuswahl(ziel);
        const weg: SchachZug["weg"] = vorher.typ === "k" ? "wegziehen" : geschlagen ? "schlagen" : "dazwischen";
        onZug({ von: auswahl, nach: ziel, typ: vorher.typ, weg, istMatt: ergebnis.isCheckmate });
      }}
    />
  );
}
