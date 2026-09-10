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
// `restrictToSingleStep` (Quest 1, Screen 2) war bis 2026-09-08 die einzige verbliebene
// Ausnahme: eine dem Kind noch gar nicht erklärte eigene Zugregel (der Doppelschritt)
// wurde absichtlich zurückgehalten. Update (2026-09-08, Nutzerwunsch: "Am Anfang darf
// Igel/der Bauer zwei Felder ziehen, aber nur wenn du ihn das erste Mal im Spiel
// bewegst, danach nur noch ein Feld"): genau dieses Verhalten liefert chess.js bereits
// vollautomatisch — `game.moves()` erlaubt den Doppelschritt ausschließlich von der
// Startreihe aus, jeder Folgezug ist unabhängig davon automatisch auf ein Feld begrenzt
// (die Regel hängt an der aktuellen Reihe der Figur, nicht an einem separaten
// "schon gezogen"-Flag). Die künstliche Einschränkung war damit nicht mehr nötig und ist
// samt Prop ersatzlos entfernt — Quest 1 Screen 2 zeigt jetzt wie jeder andere Screen
// einfach ALLE von chess.js gelieferten Legalzüge.

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Board, type BoardConfig } from "../quest1/Board";
import { createPosition, legalTargetsFor, tryMove, type BoardSquare } from "./chessEngine";

// ---------------------------------------------------------------------------------------
// Neu (2026-09-08, Auto-Demo-Vorführung + Übungsphase, siehe claude/quest_review_
// automatik_vollbrett_vorschlag.md, Abschnitt 3): Screen 2 ("Bewegung entdecken") bekommt
// optional einen dreiteiligen Ablauf statt des bisherigen Einteilers — (1) Lux führt die
// Bewegung automatisch vor (`autoDemo`, siehe Board.tsx `demoTarget`/`onDemoDone`), (2) das
// Kind probiert selbst (unverändertes Verhalten), (3) eine Übungsphase mit `uebungsrunden`
// weiteren, vom Kind selbst gezogenen Zügen, erst danach `onSolved()`. Beide neuen Props
// sind komplett optional und wirkungslos, wenn nicht gesetzt (`autoDemo` default false,
// `uebungsrunden` default 0) — bestehende Aufrufstellen (Screen 4/5 aller Quests, die
// QuestMoveScreen ohne diese Props nutzen) verhalten sich exakt wie zuvor: sofortiges
// `onSolved()` nach dem ersten korrekten Zug.
//
// Technische Kernschwierigkeit der Übungsphase: chess.js lässt nach einem ausgeführten Zug
// nur noch die GEGENSEITE ziehen (normales Partie-Verhalten) — für "dieselbe Figur zieht
// gleich nochmal" muss die Zugseite im FEN nach jedem erfolgreichen Zug wieder auf Weiß
// zurückgesetzt werden, siehe `mitWeissAmZug` unten. Alle kuratierten Quest-Stellungen
// (chessEngine.ts) haben ohnehin weder Rochaderecht noch ein En-passant-Feld ("- -" im
// FEN) — das Patchen des reinen Zugfelds ist hier deshalb unbedenklich und ändert an der
// eigentlichen Stellung nichts.
//
// `game` ist deshalb jetzt eine `useRef` (mutierbar, ohne dadurch selbst einen Re-Render
// auszulösen) statt der bisherigen `useState`-Einmalinitialisierung — ausgetauscht wird sie
// nach jedem erfolgreichen Zug gegen eine frische, aus der gepatchten FEN neu erzeugte
// Chess-Instanz. Position (`aktuellerOrt`) und Legalzüge (`legalTargets`) sind aus demselben
// Grund jetzt regulärer State statt einmaliger Lazy-Init, da sie sich während der
// Übungsphase mit jeder Runde ändern.
// ---------------------------------------------------------------------------------------

function mitWeissAmZug(fen: string): string {
  const teile = fen.split(" ");
  teile[1] = "w";
  return teile.join(" ");
}

export type QuestPhase = "vorfuehrung" | "interaktiv" | "uebung" | "fertig";

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
  zeigeSchach?: boolean;
  pieceIcon: ReactNode;
  opponentIcon?: ReactNode;
  blockerIcon?: ReactNode;
  onSolved: () => void;
  onTrapTap?: () => void;
  // Neu (siehe Datei-Kommentar oben): Auto-Demo-Vorführung vor der eigentlichen Aufgabe.
  autoDemo?: boolean;
  // Neu: Anzahl zusätzlicher Übungszüge NACH dem ersten korrekten Zug, bevor onSolved()
  // aufgerufen wird. 0 (Standard) = bisheriges Verhalten, sofort onSolved().
  uebungsrunden?: number;
  // Neu: informiert die aufrufende Quest*.tsx über Phasenwechsel, damit dort die passende
  // Lux-Sprechzeile gesetzt werden kann (z. B. "Jetzt bist du dran!" bei "interaktiv").
  // Wird NUR bei tatsächlichen Übergängen aufgerufen, nicht bei jeder einzelnen
  // Übungsrunde innerhalb von "uebung".
  onPhaseChange?: (phase: QuestPhase) => void;
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
  zeigeSchach,
  pieceIcon,
  opponentIcon,
  blockerIcon,
  onSolved,
  onTrapTap,
  autoDemo,
  uebungsrunden = 0,
  onPhaseChange,
}: QuestMoveScreenProps) {
  // Siehe Datei-Kommentar oben: mutierbare Ref statt einmaliger useState-Initialisierung,
  // wird nach jedem erfolgreichen Zug gegen eine frische, per `mitWeissAmZug` gepatchte
  // Chess-Instanz ausgetauscht, damit dieselbe Figur in der Übungsphase erneut ziehen darf.
  const gameRef = useRef(createPosition(fen));

  const [aktuellerOrt, setAktuellerOrt] = useState<BoardSquare>(pieceAt);
  // Siehe Datei-Kommentar oben: keine Filterung mehr — jeder von chess.js gelieferte
  // Legalzug wird immer angezeigt und angeboten (schließt seit 2026-09-08 den
  // Bauern-Doppelschritt auf der Startreihe automatisch mit ein, siehe dortige Erklärung).
  const [legalTargets, setLegalTargets] = useState<BoardSquare[]>(() => legalTargetsFor(gameRef.current, pieceAt));
  const [phase, setPhase] = useState<QuestPhase>(autoDemo ? "vorfuehrung" : "interaktiv");
  const [uebungenErledigt, setUebungenErledigt] = useState(0);

  function wechselPhase(neu: QuestPhase) {
    setPhase(neu);
    onPhaseChange?.(neu);
  }

  // Bugfix (2026-09-08, beim Entwurf der Quest1.tsx-Anbindung entdeckt, noch bevor eine
  // Quest*.tsx die neuen Props überhaupt nutzt): die ursprüngliche Fassung rief in beiden
  // Abschluss-Zweigen unten `onSolved()` VOR `wechselPhase("fertig")` auf. Da `onSolved`
  // von der aufrufenden Quest*.tsx erwartungsgemäß SOFORT den Screen wechselt (z. B.
  // `setScreen(4)`), würde die Komponente in genau dem Moment unmontiert, in dem
  // `onPhaseChange("fertig")` erst danach ausgelöst würde — eine an die "fertig"-Phase
  // gekoppelte Lob-Sprechzeile (z. B. "Super, das kannst du schon richtig gut!" nach der
  // Übungsphase) käme dadurch nie sichtbar/hörbar zustande. Jetzt: `wechselPhase("fertig")`
  // zuerst, danach `onSolved()` — und zwar erst nach einer kurzen Verzögerung, WENN eine
  // Übungsphase stattfand (uebungsrunden > 0), damit die Lob-Zeile tatsächlich Zeit hat,
  // gesehen/gehört zu werden, bevor der Screen wechselt. Ohne Übungsphase (uebungsrunden
  // = 0, der bisherige Anwendungsfall in Screen 4/5 aller Quests) bleibt es beim sofortigen
  // `onSolved()` — dort gibt es keine "fertig"-Sprechzeile, die Verzögerung wäre reine,
  // vom Kind spürbare Wartezeit ohne Gegenwert. Verzögerung (950ms) übernommen vom bereits
  // bestehenden `setTimeout(..., 950)`-Muster für `onTrapTap` in Quest1.tsx Screen 4.
  function beendeAufgabe() {
    wechselPhase("fertig");
    if (uebungsrunden > 0) {
      setTimeout(() => onSolved(), 950);
    } else {
      onSolved();
    }
  }

  // Wird als Array an BoardConfig.blockerAt weitergereicht (auch für Quests mit nur einer
  // Blockade-Figur) — Board.tsx akzeptiert seit dem Bugfix "Blockerfigur nicht angezeigt"
  // (2026-09-08, siehe dortiger Kommentar) sowohl ein einzelnes BoardSquare als auch ein
  // Array, vorher fand `key(blockerAt)` dort nie eine passende Zelle, wenn hier ein Array
  // ankam.
  const blockerSquares = alsArray(blockerAt).map((b) => ({ row: b.row - rowOffset, col: b.col - colOffset }));

  // Vorschlags-/Vorführ-Zielfeld in Fenster-lokalen Koordinaten (wie legalTargets unten) —
  // dasselbe Feld dient sowohl als Vorführ-Ziel (Phase "vorfuehrung") als auch als
  // Sammel-Marker-Vorschlag (Phase "uebung"). Rein visuelle Führung: schränkt NICHT ein,
  // welches Feld tatsächlich antippbar ist (Design-Grundsatz "immer alle Legalzüge
  // anbieten") — jedes andere Feld aus legalTargets bleibt genauso lösend.
  const vorschlagZiel = legalTargets.length
    ? { row: legalTargets[0].row - rowOffset, col: legalTargets[0].col - colOffset }
    : undefined;

  const config: BoardConfig = {
    rows,
    cols,
    pieceAt: { row: aktuellerOrt.row - rowOffset, col: aktuellerOrt.col - colOffset },
    legalTargets: legalTargets.map((t) => ({ row: t.row - rowOffset, col: t.col - colOffset })),
    trapTarget: trapAt ? { row: trapAt.row - rowOffset, col: trapAt.col - colOffset } : undefined,
    opponentAt: opponentAt ? { row: opponentAt.row - rowOffset, col: opponentAt.col - colOffset } : undefined,
    blockerAt: blockerSquares.length ? blockerSquares : undefined,
    pieceIcon,
    opponentIcon: opponentAt ? opponentIcon : undefined,
    blockerIcon: blockerSquares.length ? blockerIcon : undefined,
    bedrohtAt: zeigeSchach ? { row: aktuellerOrt.row - rowOffset, col: aktuellerOrt.col - colOffset } : undefined,
    angreiferAt:
      zeigeSchach && opponentAt ? { row: opponentAt.row - rowOffset, col: opponentAt.col - colOffset } : undefined,
    sammelAt: phase === "uebung" ? vorschlagZiel : undefined,
  };

  return (
    <Board
      config={config}
      // Nur während der Vorführ-Phase gesetzt — Board.tsx sperrt Taps währenddessen
      // automatisch (siehe dortiger Kommentar zu animatingTo), ein echter onCorrectMove-
      // Aufruf kann in dieser Phase also nicht auftreten.
      demoTarget={phase === "vorfuehrung" ? vorschlagZiel : undefined}
      onDemoDone={() => wechselPhase("interaktiv")}
      onCorrectMove={(target) => {
        const real: BoardSquare = { row: target.row + rowOffset, col: target.col + colOffset };
        const result = tryMove(gameRef.current, aktuellerOrt, real);
        if (!result.ok) return;

        // Siehe Datei-Kommentar oben: Zugseite zurück auf Weiß patchen, damit dieselbe
        // Figur (falls eine Übungsrunde folgt) sofort wieder ziehen darf. Passiert nach
        // JEDEM erfolgreichen Zug, unabhängig von uebungsrunden — harmlos, falls der Screen
        // ohnehin direkt danach wechselt (die Komponente wird dann kurz darauf unmontiert).
        gameRef.current = createPosition(mitWeissAmZug(result.fenAfter));
        setAktuellerOrt(real);

        if (phase === "interaktiv") {
          // Das war der erste, "selbst ausprobieren"-Zug dieses Screens.
          if (uebungsrunden > 0) {
            setLegalTargets(legalTargetsFor(gameRef.current, real));
            setUebungenErledigt(0);
            wechselPhase("uebung");
          } else {
            beendeAufgabe();
          }
          return;
        }

        if (phase === "uebung") {
          const neueAnzahl = uebungenErledigt + 1;
          if (neueAnzahl < uebungsrunden) {
            setLegalTargets(legalTargetsFor(gameRef.current, real));
            setUebungenErledigt(neueAnzahl);
          } else {
            beendeAufgabe();
          }
        }
      }}
      onTrapTap={onTrapTap}
    />
  );
}
