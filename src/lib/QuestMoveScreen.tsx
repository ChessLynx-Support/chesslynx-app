// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): fasst die bis dahin sechsmal fast
// identisch kopierte lokale MoveScreen()-Funktion aus Quest1.tsx–Quest6.tsx in einer
// einzigen, gemeinsam genutzten Komponente zusammen — reine Code-Vereinfachung, KEIN
// Verhaltensunterschied für das Kind. Jede der sechs Quest*.tsx-Dateien behält ihre
// eigene Aufrufstelle mit den quest-spezifischen Werten (FEN, Feldpositionen, Icons);
// nur die Kapselung "Stellung laden, Legalzüge filtern, BoardConfig zusammenbauen,
// Board rendern" ist jetzt eine einzige Implementierung.
//
// Deckt die Unterschiede zwischen den sechs bisherigen Fassungen über Props ab:
// - Quest 1 nutzte ein 3×3-Ausschnittsfenster (rows/cols/rowOffset/colOffset), Quest 2–6
//   das volle 8×8-Brett (rows=8, cols=8, Offsets 0) — deshalb alle vier als optionale
//   Props mit Quest2-6-Standardwerten (siehe Quest1.tsx: dort explizit übergeben).
// - Die Übungsfigur stand in Quest 1 auf e2, in Quest 2 auf a1, in Quest 3–6 auf d4 —
//   deshalb `pieceAt` ein Pflicht-Prop statt einer intern fest kodierten Konstante.
// - Nur Quest 6 nutzt `zeigeSchach` (echtes Schach statt Blockade, siehe Board.tsx/
//   bedrohtAt/angreiferAt) — für alle anderen Quests bleibt das Feld einfach ungesetzt.
// - Icons (pieceIcon/opponentIcon/blockerIcon) bleiben vollständige, von der aufrufenden
//   Quest*.tsx bereits fertig gewählte Elemente (z. B. Quest 6: opponentIcon zeigt
//   SpringerMasterDunkelIcon, nicht die eigene Königs-Illustration) — die Komponente
//   selbst kennt keine Kreaturen, genau wie Board.tsx. opponentIcon/blockerIcon werden
//   nur tatsächlich an Board.tsx durchgereicht, wenn das jeweilige *At-Feld gesetzt ist
//   (spiegelt exakt die bisherige `opponentAt ? <XDunkelIcon /> : undefined`-Logik).
//
// Update (Nutzer-Feedback 2026-09-07, "Generell sollten stets alle möglichen Züge
// angeboten werden und in der Aufgabe speziell auf den gewünschten Zug hingewiesen
// werden", ausgelöst durch den Turm-Bug in Quest 2): die früheren Filter-Props
// (onlyCaptureAt, onlyTarget, onlyDiagonal) blendeten echte, korrekte Legalzüge aus der
// Anzeige aus, um genau EIN didaktisches Zielfeld hervorzuheben — z. B. zeigte Quest 2
// Screen 5 nur das Schlagfeld, obwohl der Turm auch stinknormal weiterziehen durfte. Das
// versteckte dieselbe Zugregel, die der Screen gerade demonstriert, nur eben zu weiteren
// Zielen — genau das, was beim Rechtsbewegung-Bug auffiel. Jetzt zeigt QuestMoveScreen
// IMMER alle von chess.js gelieferten Legalzüge; JEDER davon schließt den Screen ab.
// Welcher Zug "der Punkt der Aufgabe" ist (z. B. "kannst du sie schlagen?"), sagt allein
// die gesprochene Zeile in SCREEN_SCRIPTS der jeweiligen Quest*.tsx.
// `restrictToSingleStep` (Quest 1, Screen 2) ist die EINZIGE verbliebene Ausnahme: anders
// als bei den entfernten Filtern wird hier keine bereits gezeigte Regel künstlich
// verkürzt, sondern eine dem Kind noch gar nicht erklärte eigene Zugregel (der
// Doppelschritt, Thema von Screen 3, bewusst nicht Teil dieses Grundgerüsts) absichtlich
// zurückgehalten, bis sie an eigener Stelle eingeführt wird.

import { useState } from "react";
import type { ReactNode } from "react";
import { Board, type BoardConfig } from "../quest1/Board";
import { createPosition, legalTargetsFor, tryMove, type BoardSquare } from "./chessEngine";

export type QuestMoveScreenProps = {
  fen: string;
  pieceAt: BoardSquare;
  rows?: number;
  cols?: number;
  rowOffset?: number;
  colOffset?: number;
  trapAt?: BoardSquare;
  opponentAt?: BoardSquare;
  blockerAt?: BoardSquare | BoardSquare[];
  restrictToSingleStep?: boolean;
  zeigeSchach?: boolean;
  pieceIcon: ReactNode;
  opponentIcon?: ReactNode;
  blockerIcon?: ReactNode;
  onSolved: () => void;
  onTrapTap?: () => void;
};

function alsArray(at: BoardSquare | BoardSquare[] | undefined): BoardSquare[] {
  if (!at) return [];
  return Array.isArray(at) ? at : [at];
}

/**
 * Kapselt "eine chess.js-Stellung laden, Legalzüge für die Übungsfigur anzeigen, bei
 * korrektem Zug weiter" — ersetzt die sechs fast identischen MoveScreen()-Funktionen aus
 * Quest1.tsx–Quest6.tsx (siehe Kommentar oben).
 */
export function QuestMoveScreen({
  fen,
  pieceAt,
  rows = 8,
  cols = 8,
  rowOffset = 0,
  colOffset = 0,
  trapAt,
  opponentAt,
  blockerAt,
  restrictToSingleStep,
  zeigeSchach,
  pieceIcon,
  opponentIcon,
  blockerIcon,
  onSolved,
  onTrapTap,
}: QuestMoveScreenProps) {
  const [game] = useState(() => createPosition(fen));
  const [legalTargets] = useState(() => {
    const all = legalTargetsFor(game, pieceAt);
    // Siehe ausführlichen Kommentar oben: restrictToSingleStep ist die einzige verbliebene
    // Einschränkung, alle anderen Filter wurden entfernt — jeder von chess.js gelieferte
    // Legalzug wird jetzt immer angezeigt und angeboten.
    if (restrictToSingleStep) return all.filter((t) => Math.abs(t.row - pieceAt.row) === 1 && t.col === pieceAt.col);
    return all;
  });

  const blockerSquares = alsArray(blockerAt).map((b) => ({ row: b.row - rowOffset, col: b.col - colOffset }));

  const config: BoardConfig = {
    rows,
    cols,
    pieceAt: { row: pieceAt.row - rowOffset, col: pieceAt.col - colOffset },
    legalTargets: legalTargets.map((t) => ({ row: t.row - rowOffset, col: t.col - colOffset })),
    trapTarget: trapAt ? { row: trapAt.row - rowOffset, col: trapAt.col - colOffset } : undefined,
    opponentAt: opponentAt ? { row: opponentAt.row - rowOffset, col: opponentAt.col - colOffset } : undefined,
    blockerAt: blockerSquares.length ? blockerSquares : undefined,
    pieceIcon,
    opponentIcon: opponentAt ? opponentIcon : undefined,
    blockerIcon: blockerSquares.length ? blockerIcon : undefined,
    bedrohtAt: zeigeSchach ? { row: pieceAt.row - rowOffset, col: pieceAt.col - colOffset } : undefined,
    angreiferAt:
      zeigeSchach && opponentAt ? { row: opponentAt.row - rowOffset, col: opponentAt.col - colOffset } : undefined,
  };

  return (
    <Board
      config={config}
      onCorrectMove={(target) => {
        const real: BoardSquare = { row: target.row + rowOffset, col: target.col + colOffset };
        const result = tryMove(game, pieceAt, real);
        if (result.ok) onSolved();
      }}
      onTrapTap={onTrapTap}
    />
  );
}
