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

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Board, type BoardConfig } from "../quest1/Board";
import {
  createPosition,
  legalTargetsFor,
  mitWeissAmZug,
  tryMove,
  waehleVorschlagZiel,
  type BoardSquare,
} from "./chessEngine";
import { useLuxSpricht } from "./luxStimme";

// ---------------------------------------------------------------------------------------
// Phasenwechsel warten auf Lux
// ---------------------------------------------------------------------------------------
// Gerätetest 2026-09-14 (Nutzer: "Erfolgsmeldung wird abgeschnitten nach Aufgabe 1" und
// "nach der Verwandlung wird bei der Angabe die Sprechzeile etwas abgebrochen").
//
// Beides dieselbe Ursache wie zuvor beim Verwandlungsmoment: Ein Phasenwechsel hier lässt in
// der aufrufenden Quest den Sprech-Schlüssel wechseln, und dessen Aufräumschritt ruft
// `stoppen()` — mitten in einem laufenden Satz. Ausgelöst wurde der Wechsel bisher von
// Dingen, die nichts mit der Stimme zu tun haben:
//
//   - `onDemoDone`: sobald die ZUG-ANIMATION durch war, ging es in die interaktive Phase.
//     Die Vorführ-Zeile lief da noch.
//   - `beendeAufgabe`: ein festes `setTimeout(onSolved, 950)`. Der Kommentar dort nannte den
//     Zweck korrekt ("damit die Lob-Zeile Zeit hat, gehört zu werden") — nur ist 950 ms
//     geraten, und "Super, das kannst du schon richtig gut!" braucht deutlich länger.
//
// Statt weiter zu schätzen, wird jetzt gefragt: `useLuxSpricht()` liefert denselben Zustand,
// mit dem sich auch Lux' Maul bewegt, und ist seit dem 2026-09-14 auf beiden Plattformen
// belastbar (siehe ENGINE_ABFRAGE_VERLAESSLICH in luxStimme.ts). Der Wechsel wartet, bis es
// still ist, legt eine Atempause ein und geht dann weiter.
//
// Bewusst HIER und nicht in den sechs Quest-Dateien: Dies ist die eine Stelle, an der beide
// Wechsel entstehen — die Quests bleiben unverändert.

/** Atempause, nachdem Lux verstummt ist, bevor es weitergeht. */
const ATEMPAUSE_MS = 400;
/**
 * Anlauf für eine Zeile, die gerade erst angestoßen WURDE: Nach `wechselPhase("fertig")`
 * beginnt die Lob-Zeile erst im nächsten Rendergang und braucht dann noch bis zum ersten Ton.
 * Ohne diese Frist wäre es in genau dem Moment still, und wir würden sofort weiterschalten —
 * derselbe Wettlauf, der die Zeile vorher abgeschnitten hat, nur umgekehrt.
 */
const LOB_ANLAUF_MS = 700;
/**
 * Notbremsen. Sollte die Sprech-Auskunft je klemmen, geht es spätestens hiernach trotzdem
 * weiter — ein Kind darf nie vor einem Bildschirm sitzen, der sich nicht mehr rührt.
 *
 * Warum zwei Werte und warum so knapp (2026-09-14, nach der Rückmeldung "Bug, komme nicht
 * weiter im Quest"): Ein einzelner Wert von 8 s war zu großzügig gedacht. Rechnerisch löste
 * er die Blockade zwar auf, aber acht Sekunden vor einem Brett, das auf nichts reagiert,
 * sind für jeden — Kind wie Tester — schlicht ein kaputtes Spiel. Eine Notbremse muss kürzer
 * greifen, als Geduld reicht.
 *
 * Die Werte sind an der jeweils längstmöglichen Zeile bemessen, nicht geraten: Zu spät
 * weiterzuschalten kostet einen unhörbaren Moment, zu früh kostet den Satz.
 */
/** Vorführ-Zeilen sind kurz und laufen schon, wenn die Animation endet. */
const NOTBREMSE_VORFUEHRUNG_MS = 2500;
/** Lob-Zeilen sind die längsten Zeilen im Ablauf — plus deren Anlauf. */
const NOTBREMSE_LOB_MS = 4000;

/**
 * Dauer der Stopp!-Animation in Board.tsx (`setTimeout(() => setTrappedKey(null), 900)`).
 * Der Screenwechsel nach dem Antippen eines Stopp!-Feldes darf frühestens danach kommen,
 * sonst verschwindet die Animation, bevor das Kind sie gesehen hat.
 */
const STOPP_ANIMATION_MS = 900;

/** Notbremse für den Stopp!-Übergang, falls die Sprachausgabe ihr Ende nicht meldet. */
const NOTBREMSE_STOPP_MS = 4000;

/** Notbremse für den Abschluss eines Screens ohne Übungsphase (Screen 4/5). */
const NOTBREMSE_ABSCHLUSS_MS = 3000;

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
// zurückgesetzt werden, siehe `mitWeissAmZug` in chessEngine.ts (2026-09-14 dorthin verlegt,
// damit die Übungsschleife testbar ist). Alle kuratierten Quest-Stellungen
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
  // wird nach jedem erfolgreichen Zug gegen eine frische, per `mitWeissAmZug` (chessEngine.ts) gepatchte
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

  // --- Warten, bis Lux ausgesprochen hat (siehe Datei-Kommentar oben) --------------------
  const luxSpricht = useLuxSpricht();
  // Die aufgeschobene Aktion liegt in einer Ref (sie soll kein Rendern auslösen); `wartemarke`
  // ist nur da, um den Effekt unten erneut laufen zu lassen, wenn eine Aktion NEU eingestellt
  // wird, während es ohnehin schon still ist — `luxSpricht` ändert sich dann ja nicht.
  const wartet = useRef<(() => void) | null>(null);
  const notbremse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anlauf = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wartemarke, setWartemarke] = useState(0);

  function loeseAus() {
    const tun = wartet.current;
    wartet.current = null;
    if (notbremse.current) {
      clearTimeout(notbremse.current);
      notbremse.current = null;
    }
    tun?.();
  }

  /** Führt `tun` aus, sobald Lux zu Ende gesprochen hat — nicht nach geschätzter Zeit. */
  function sobaldLuxFertigIst(tun: () => void, notbremseMs: number, anlaufMs = 0) {
    const einstellen = () => {
      anlauf.current = null;
      wartet.current = tun;
      if (notbremse.current) clearTimeout(notbremse.current);
      notbremse.current = setTimeout(loeseAus, notbremseMs);
      setWartemarke((n) => n + 1);
    };
    if (anlaufMs > 0) {
      if (anlauf.current) clearTimeout(anlauf.current);
      anlauf.current = setTimeout(einstellen, anlaufMs);
    } else {
      einstellen();
    }
  }

  useEffect(() => {
    if (!wartet.current || luxSpricht) return;
    const pause = setTimeout(loeseAus, ATEMPAUSE_MS);
    return () => clearTimeout(pause);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luxSpricht, wartemarke]);

  // Beim Verlassen des Screens nichts mehr nachfeuern lassen.
  useEffect(
    () => () => {
      wartet.current = null;
      if (notbremse.current) clearTimeout(notbremse.current);
      if (anlauf.current) clearTimeout(anlauf.current);
    },
    []
  );

  // Bugfix (2026-09-08, beim Entwurf der Quest1.tsx-Anbindung entdeckt, noch bevor eine
  // Quest*.tsx die neuen Props überhaupt nutzt): die ursprüngliche Fassung rief in beiden
  // Abschluss-Zweigen unten `onSolved()` VOR `wechselPhase("fertig")` auf. Da `onSolved`
  // von der aufrufenden Quest*.tsx erwartungsgemäß SOFORT den Screen wechselt (z. B.
  // `setScreen(4)`), würde die Komponente in genau dem Moment unmontiert, in dem
  // `onPhaseChange("fertig")` erst danach ausgelöst würde — eine an die "fertig"-Phase
  // gekoppelte Lob-Sprechzeile (z. B. "Super, das kannst du schon richtig gut!" nach der
  // Übungsphase) käme dadurch nie sichtbar/hörbar zustande. Jetzt: `wechselPhase("fertig")`
  // zuerst, danach erst `onSolved()`.
  //
  // Nachtrag 2026-09-14: Dieses "danach" war bis heute eine feste Verzögerung von 950 ms,
  // übernommen vom `setTimeout(..., 950)`-Muster für `onTrapTap` in Quest1.tsx Screen 4. Die
  // Absicht stimmte, der Wert nicht — er reichte für die Lob-Zeile schlicht nicht, und der
  // Nutzer meldete beim Gerätetest genau das ("Erfolgsmeldung wird abgeschnitten nach
  // Aufgabe 1"). Statt einer größeren Schätzung wird jetzt gewartet, bis Lux tatsächlich
  // fertig ist (siehe `sobaldLuxFertigIst` und der Datei-Kommentar ganz oben).
  function beendeAufgabe() {
    wechselPhase("fertig");
    if (uebungsrunden > 0) {
      // Update 2026-09-14: vorher ein festes `setTimeout(onSolved, 950)` — siehe
      // Datei-Kommentar oben. Jetzt wird der Lob-Zeile erst ihr Anlauf gegeben und danach
      // gewartet, bis sie WIRKLICH zu Ende gesprochen ist.
      sobaldLuxFertigIst(onSolved, NOTBREMSE_LOB_MS, LOB_ANLAUF_MS);
    } else {
      // Ohne Übungsphase (Screen 4/5 aller Quests) gibt es zwar keine eigene
      // "fertig"-Sprechzeile — die Zeile des Screens selbst läuft aber oft noch. Beim
      // Android-Gerätetest am 2026-09-14 hat der Nutzer genau das gemeldet: Auf dem
      // Schlagen-Screen wechselte die Ansicht, während Lux noch sprach.
      //
      // Die frühere Annahme ("hier wäre jedes Warten reine Wartezeit ohne Gegenwert") galt
      // nur für den Fall, dass gar nicht gesprochen wird. Genau den kostet das hier fast
      // nichts: Schweigt Lux, löst `sobaldLuxFertigIst` nach ATEMPAUSE_MS aus — eine
      // Atempause von 400 ms, kein Warten.
      sobaldLuxFertigIst(onSolved, NOTBREMSE_ABSCHLUSS_MS);
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
  // Siehe waehleVorschlagZiel in chessEngine.ts (Bugfix 2026-09-10): rotiert durch die tatsächlich
  // verfügbaren Richtungen statt immer legalTargets[0] zu nehmen. rundenIndex ist die
  // Anzahl bereits erledigter Übungsrunden (0 für Vorführung/den allerersten Zug).
  const rundenIndex = phase === "uebung" ? uebungenErledigt : 0;
  const gewaehltesZiel = waehleVorschlagZiel(legalTargets, aktuellerOrt, rundenIndex);
  const vorschlagZiel = gewaehltesZiel
    ? { row: gewaehltesZiel.row - rowOffset, col: gewaehltesZiel.col - colOffset }
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
      // Update 2026-09-14: Der Wechsel hing vorher allein an der Zug-Animation. Ist die
      // schneller durch als Lux' Vorführ-Zeile, schnitt der Phasenwechsel sie ab (siehe
      // Datei-Kommentar oben). Kein Anlauf nötig: Diese Zeile läuft schon seit dem
      // Betreten des Screens, die Auskunft "spricht" ist hier also belastbar.
      onDemoDone={() => sobaldLuxFertigIst(() => wechselPhase("interaktiv"), NOTBREMSE_VORFUEHRUNG_MS)}
      onCorrectMove={(target) => {
        // HÄNGER-SCHUTZ (Gerätetest 2026-09-15). Unten gibt es Zweige für "interaktiv" und
        // "uebung" — für "vorfuehrung" und "fertig" keinen. Ein Tap in einer dieser beiden
        // Phasen führte den Zug trotzdem aus: `gameRef` und `aktuellerOrt` wanderten weiter,
        // danach passierte nichts mehr. Kein Phasenwechsel, kein `onSolved` — der Screen blieb
        // stehen und war nur noch über Zurück verlassbar.
        //
        // Erreichbar war das, weil `Board.tsx` Taps allein während `animatingTo` sperrt, also
        // während der Vorführ-Animation. Davor, während Lux die Regel erklärt, leuchten die
        // Zielfelder bereits und nehmen Taps an. Genau dort hat der Nutzer getippt.
        //
        // Der Zug wird deshalb gar nicht erst ausgeführt. Die Sprechzeile schaltet durch den
        // Tap weiterhin weiter (Design-Vorgabe 3.3) — das läuft über den Sprechzeilen-Hook,
        // nicht über diesen Weg.
        if (phase !== "interaktiv" && phase !== "uebung") return;

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
      // Update 2026-09-15: Bis hierher lag hinter `onTrapTap` in jeder Quest-Datei ein
      // eigenes `setTimeout(..., 950)` — vier Kopien derselben Schätzung. Beim
      // Android-Gerätetest schnitt sie Lux' Erklärung ab ("Stopp!" in Quest 1).
      //
      // Die Ausnahme war am 2026-09-14 bewusst gesetzt worden, mit der Begründung: Das Kind
      // hat gerade selbst getippt, und Design-Vorgabe 3.3 sagt, ein Tipp während laufender
      // Sprachausgabe soll weiterschalten. Der Denkfehler darin: Der Tipp gilt der VORHERIGEN
      // Zeile. Die Erklärung, warum das Feld gesperrt ist, läuft danach noch — und genau die
      // schnitt der Zeitgeber ab. Abgeschnitten wurde also ausgerechnet der Lehrinhalt.
      //
      // Jetzt: erst die 900-ms-Stopp!-Animation aus Board.tsx abwarten (als Anlauf), dann
      // das Sprechende. Das ist `max(Animation, Sprechende)` — die Animation bleibt
      // sichtbar, die Zeile bleibt vollständig.
      onTrapTap={
        onTrapTap
          ? () => sobaldLuxFertigIst(onTrapTap, NOTBREMSE_STOPP_MS, STOPP_ANIMATION_MS)
          : undefined
      }
    />
  );
}
