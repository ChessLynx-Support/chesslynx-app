// Erstes Bonuskapitel: die Fesselung (Pin) — siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "Fesselung" (7 Screens, gate-pflichtig fürs
// Schlosstor). Wächter-Figur ist der Turm (Bär), dieselbe Figur, die das Kind bereits aus
// Quest 2 kennt — dieses Kapitel führt keine neue Kreatur ein, sondern eine neue REGEL für
// eine bereits bekannte Figur.
//
// Sieben Screens, 1:1 nach dem im Claude-Projekt festgelegten Schema (nach dem Opus-Review
// "tiefes_review_bonuskapitel_logik_lernumfang_koenigreiche.md", Befund 1.3, von 5 auf 7
// Screens erweitert — "keine Aufgabenart wird vom Kind verlangt, die nicht vorher mindestens
// einmal vorgeführt wurde"):
//   0 Vorstellung        — statisches Brett, Wächter zwischen König und Angreifer, noch OHNE
//                           Kettenlinie (die kommt erst in Screen 1 hinzu).
//   1 Entdecken          — dieselbe Stellung, jetzt MIT dem neuen Kettenlinie-Signal.
//   2 Kernaufgabe        — kombinierte Stopp!-Aufgabe: echte Legalzüge AUF der Linie und ein
//                           Stopp!-Feld ABSEITS der Linie sind gleichzeitig antippbar.
//   3 Perspektivwechsel  — dieselbe Fesselungs-Geometrie, jetzt an einer GEGNERISCHEN Figur,
//                           keine Interaktion (reine Erkenntnis: "auch der andere hat das").
//   4 Vorführung         — Auto-Demo des sicheren Schlagzugs (derselbe demoTarget/onDemoDone-
//                           Mechanismus wie QuestMoveScreen.tsx für die Vorführ-Phase nutzt).
//   5 Mini-Übung         — dasselbe Kernpuzzle jetzt selbst gelöst: die vom gefesselten
//                           Wächter nur scheinbar gedeckte Figur schlagen.
//   6 Abschluss          — QuestGeschafft + Kette-Icon, Fortschritt wird gespeichert.
//
// Korrektur gegenüber dem ursprünglichen Screen-Skript-Entwurf (Implementierungsrunde
// 2026-09-08): der Entwurf sah als angreifende Figur einen gegnerischen LÄUFER vor
// (diagonale Fesselung). Chess-technisch falsch für die eigene Lektion dieses Kapitels ("eine
// gefesselte Figur kann sich innerhalb der Linie trotzdem bewegen") — ein Turm hat auf einer
// Diagonale kein einziges Zugmuster-Feld, eine diagonale Fesselung würde ihn also komplett
// lähmen, nicht nur einschränken. Siehe chessEngine.ts/FESSELUNG_POSITIONS-Kommentar für die
// jetzt verwendete, korrigierte Version (gegnerischer TURM auf derselben Linie) — deckt sich
// mit dem im Review empfohlenen "Mini-Übung mit gefesseltem Turm statt Sonderfall Springer".
//
// Bewusst OHNE QuestMoveScreen (anders als alle sechs Haupt-Quests): diese Szene braucht
// gleichzeitig drei benannte Figuren (König, Wächter, Angreifer) plus zwei neue, nur hier
// gebrauchte Visualisierungen (kettenlinie, trapBedrohtAt/trapAngreiferAt) — mehr
// Sonderzustand, als es sinnvoll wäre, in die für die sechs Haupt-Quests zugeschnittene
// gemeinsame Komponente hineinzumischen. Ruft stattdessen wie QuestMoveScreen selbst direkt
// Board.tsx auf.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { FESSELUNG_POSITIONS, createPosition, legalTargetsFor, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board, type BoardConfig } from "../quest1/Board";
import { saveBonusFortschrittLocal } from "../lib/storage";
import {
  TurmMasterIcon,
  TurmMasterDunkelIcon,
  KoenigMasterIcon,
  KoenigMasterDunkelIcon,
  SpringerMasterDunkelIcon,
} from "../lib/pieceMasters";
import { KetteIcon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B) — Fesselung enthält die allererste Zugaufgabe im ganzen Bonusbereich (Screen
// 2), deshalb hier zusätzlich der einmalige Einführungssatz (siehe HINWEIS_EINFUEHRUNG_
// SATZ-Verwendung unten).
import {
  useHinweiseAktiv,
  useHinweisEinfuehrungGezeigt,
  hinweisAngebotZeile,
  hinweisEinfuehrungSatz,
  type HinweisPhase,
} from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

// --- Feste Feldkoordinaten (siehe chessEngine.ts/FESSELUNG_POSITIONS-Kommentar) -----------

// "eigenePin"-Stellung (Screens 0-2): weißer König/Wächter/schwarzer Angreifer, alle auf
// der d-Linie.
const EIGENE_KOENIG: BoardSquare = { row: 7, col: 3 }; // d1
const EIGENE_WAECHTER: BoardSquare = { row: 4, col: 3 }; // d4
const EIGENE_ANGREIFER: BoardSquare = { row: 0, col: 3 }; // d8
const EIGENE_STOPP_FELD: BoardSquare = { row: 4, col: 4 }; // e4 — direkt neben dem Wächter, aber abseits der d-Linie

// "perspektivwechselUndSchlagen"-Stellung (Screens 3-5).
const FREMDER_KOENIG: BoardSquare = { row: 0, col: 4 }; // e8
const FREMDER_WAECHTER: BoardSquare = { row: 4, col: 4 }; // e4
const EIGENER_FESSELNDER_TURM: BoardSquare = { row: 7, col: 4 }; // e1 — fesselt den fremden Wächter
const EIGENER_HELD_TURM: BoardSquare = { row: 7, col: 3 }; // d1 — schlägt gefahrlos zu
const GEGNERISCHER_SPRINGER: BoardSquare = { row: 4, col: 3 }; // d4 — vom fremden Wächter nur SCHEINBAR gedeckt

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  0: [
    // Paket 1 (2026-09-11): "Heute" gestrichen — setzt eine Sitzungsgrenze voraus, die es nicht gibt.
    // 2026-09-11 (Nutzerentscheidung): "Hallo, ich bin's wieder, Lux!" entfällt wie in Quest 2–6.
    "Ich zeige dir ein spannendes Geheimnis.",
    "Schau dir diesen Wächter an.",
    "Er steht genau zwischen seinem König und einer gegnerischen Figur.",
    "Er ist an seinen König gekettet.",
    "Man nennt das eine Fesselung.",
  ],
  1: [
    "Siehst du die goldene Kette? Sie geht durch den Wächter hindurch, bis zum König.",
    "Solange die Kette da ist, darf er sich nicht von ihr lösen.",
  ],
  2: [
    "Er darf sich auf der Kette bewegen.",
    "Probier es mal.",
    "Aber probier auch, ob er zur Seite kann.",
  ],
  3: [
    "Schau!",
    "Auch der andere hat manchmal so einen gefesselten Wächter.",
    "Er kann seinen König nicht verlassen, ganz gleich, wie sehr er möchte.",
  ],
  4: ["Weil der Turm gefesselt ist, kann er nicht zur Seite ziehen, um zu helfen.", "Ich zeig's dir einmal."],
  5: ["Jetzt bist du dran.", "Tipp auf ein leuchtendes Feld.", "Probier, den Springer zu schlagen!"],
  6: [
    "Und schon war der Springer weg!",
    "Der gefesselte Turm konnte gar nicht eingreifen!",
    "Du kennst jetzt die Fesselung.",
    "Fantastisch gemacht!",
  ],
};

// Reine Tipp-durch-Erzählung-Screens (kein Brett-gesteuerter Fortschritt, dieselbe tapArea-
// Logik wie Screen 0 in allen sechs Haupt-Quests) — auf allen übrigen Screens spricht Lux
// ihre Zeilen stattdessen automatisch nacheinander (siehe autoWeiter unten).
const TIPP_SCREENS = new Set<ScreenId>([0, 1, 3]);

// Nutzerfeedback 2026-09-09 ("In der Einführung bitte selbständig durchführen ohne
// klicken ... Übergänge langsam gestalten"): wohin ein reiner Erzähl-Screen von selbst
// weitergeht, sobald seine letzte Zeile fertig gesprochen ist — dieselben Ziele, die
// bisher nur per Antippen (advanceOrGo) erreichbar waren.
const NAECHSTER_SCREEN_NACH_EINFUEHRUNG: Partial<Record<ScreenId, ScreenId>> = { 0: 1, 1: 2, 3: 4 };
// Bewusst deutlich länger als die 950ms-Konsequenz-Pausen anderswo im Bonuskapitel (die
// eine kurze Animation ausklingen lassen) — hier soll der Wechsel selbst ruhig und
// unaufgeregt wirken, nicht nur technisch überbrückt sein.
const UEBERGANGS_PAUSE_MS = 1800;

// Aktive Zugaufgaben (bestätigter Geltungsbereich der Hinweisfunktion, siehe
// Import-Kommentar oben): Screen 2 (Kernaufgabe) und Screen 5 (Mini-Übung) — die
// übrigen Screens sind reine Tap-Through-/Vorführ-Szenen ohne eigenen Zug.
function istZugaufgabe(screen: ScreenId): boolean {
  return screen === 2 || screen === 5;
}

// Der eigentliche Hinweis-Inhalt je aktiver Zugaufgabe — bewusst eine ausführlichere
// Umformulierung der jeweils normalen Instruktion, nicht neue Information: die legalen
// Zielfelder sind ohnehin schon immer als leuchtende Ringe sichtbar (siehe
// Vorschlagsdokument, Teil B3).
function hinweisInhaltFuer(screen: ScreenId): string {
  if (screen === 2) return "Der Wächter darf nur auf der goldenen Kette bleiben. Tipp auf eines der leuchtenden Felder!";
  if (screen === 5) return "Der gefesselte Turm kann nicht helfen. Tipp auf das leuchtende Feld, um den Springer zu schlagen!";
  return "";
}

export default function Fesselung() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();
  const [introGezeigt, markiereIntroGezeigt] = useHinweisEinfuehrungGezeigt();

  // Einmaliger Erklärsatz beim allerersten Erreichen der allerersten Zugaufgabe im
  // ganzen Bonusbereich (Screen 2) — hängt sich an die erste Instruktions-Zeile an,
  // statt eine eigene Sprechpause zu erzwingen (siehe Vorschlagsdokument, Teil B2).
  const introSichtbar = screen === 2 && hinweiseAktiv && !introGezeigt;
  const lines = introSichtbar
    ? [SCREEN_SCRIPTS[2][0] + hinweisEinfuehrungSatz(), ...SCREEN_SCRIPTS[2].slice(1)]
    : SCREEN_SCRIPTS[screen];
  const isLastLine = lineIndex === lines.length - 1;

  useEffect(() => {
    if (introSichtbar) markiereIntroGezeigt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introSichtbar]);

  // Ein Screen-Wechsel (= jeder tatsächliche Zug) setzt die Antipp-Geste immer auf
  // "still" zurück — die nächste Aufgabe startet wieder bei "einmal antippen =
  // wiederholen".
  useEffect(() => {
    setHinweisPhase("still");
  }, [screen]);

  // Hält den setTimeout-Handle des automatischen Screen-Übergangs (siehe
  // UEBERGANGS_PAUSE_MS/onFertig unten). Ohne dieses Aufräumen könnte ein Tester, der
  // während der Übergangs-Pause manuell weitertippt (advanceOrGo), auf dem NÄCHSTEN
  // Screen unerwartet auf Zeile 0 zurückgesetzt werden, sobald der ursprüngliche,
  // eigentlich schon überholte Timer verspätet doch noch feuert.
  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  function gehZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
  }

  function advanceOrGo(next: ScreenId) {
    if (!isLastLine) {
      setLineIndex((i) => i + 1);
      return;
    }
    gehZu(next);
  }

  // Nutzerfeedback 2026-09-09 ("In der Einführung bitte selbständig durchführen ohne
  // klicken"): früher liefen NUR die Nicht-TIPP_SCREENS (Zugaufgaben/Vorführung/Abschluss)
  // automatisch von Zeile zu Zeile weiter, TIPP_SCREENS brauchten für jede einzelne Zeile
  // einen Tipp. Jetzt sprechen alle Screens ihre Zeilen automatisch nacheinander — das
  // Antippen (tapArea, siehe unten) bleibt zusätzlich als schnellerer manueller Weg
  // erhalten, ist aber nicht mehr nötig, damit überhaupt etwas passiert.
  const autoWeiter = true;
  // Während einer aktiven Zugaufgabe kann die Antipp-Geste stattdessen die
  // Hinweis-Angebots-/Hinweis-Zeile sprechen (siehe handleLuxTap unten) — schluessel/
  // zeile/onFertig weichen dann bewusst vom normalen SCREEN_SCRIPTS-Ablauf ab.
  const zugaufgabeAktiv = istZugaufgabe(screen);
  // Nutzerfeedback 2026-09-09 ("die vorgeschlagenen Züge bei den Übungen entfernen, sonst
  // sind die Hinweise sinnlos"): solange die Hinweisfunktion aktiv ist, bleiben die
  // Zielfeld-Ringe/-Punkte (Board.tsx, `zeigeZielringe`) verborgen, bis Lux tatsächlich
  // einen Hinweis gegeben hat (`hinweisPhase === "hinweis"`) — danach dürfen sie ruhig
  // erscheinen, das Kind hat den Hinweis ja bewusst angefordert. Ist die Hinweisfunktion
  // ausgeschaltet (Standard), ändert sich am bisherigen Verhalten nichts: Ringe erscheinen
  // wie gewohnt immer.
  const zeigeZielringe = !hinweiseAktiv || hinweisPhase === "hinweis";
  const sprechSchluessel = hinweisPhase === "still" ? `${screen}-${lineIndex}` : `${screen}-${hinweisPhase}`;
  const sprechZeile =
    hinweisPhase === "still" ? lines[lineIndex] : hinweisPhase === "angebot" ? hinweisAngebotZeile() : hinweisInhaltFuer(screen);
  // Nutzerfeedback 2026-09-09: auf der letzten Zeile eines reinen Erzähl-Screens
  // (TIPP_SCREENS) geht es jetzt nach einer ruhigen Pause von selbst zum nächsten Screen
  // weiter, statt (wie zuvor bei autoWeiter-Screens ohne definiertes Nachfolge-Ziel) in
  // die 8-Sekunden-Erinnerungsschleife von useLuxSprechzeile zu fallen. `onFertig` feuert
  // dabei erst, wenn Lux tatsächlich fertig gesprochen hat — die Wartezeit passt sich also
  // automatisch der eingestellten Sprechgeschwindigkeit an.
  const naechsterScreenNachLetzterZeile = NAECHSTER_SCREEN_NACH_EINFUEHRUNG[screen];
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    sprechSchluessel,
    sprechZeile,
    hinweisPhase === "still"
      ? !isLastLine
        ? () => setLineIndex((i) => i + 1)
        : naechsterScreenNachLetzterZeile !== undefined
          ? () => {
              const next = naechsterScreenNachLetzterZeile;
              uebergangsTimer.current = setTimeout(() => gehZu(next), UEBERGANGS_PAUSE_MS);
            }
          : undefined
      : undefined
  );
  const zeigeUntertitel = useUntertitelAktiv();

  function handleLuxTap() {
    if (!hinweiseAktiv || !zugaufgabeAktiv || hinweisPhase === "hinweis") {
      wiederholen();
      return;
    }
    setHinweisPhase(hinweisPhase === "still" ? "angebot" : "hinweis");
  }

  // chess.js-Instanz je Screen — bei jedem Betreten von Screen 2 frisch aus der "eigenePin"-
  // FEN aufgebaut, bei Screen 5 frisch aus der "perspektivwechselUndSchlagen"-FEN. Die reinen
  // Erzähl-/Vorführ-Screens (0/1/3/4) brauchen keine mutierbare chess.js-Instanz, da dort
  // entweder gar nichts gezogen wird oder (Screen 4) die Demo rein optisch bleibt.
  // `useMemo` statt `useState`: dieselbe Instanz bleibt über Re-Renders desselben Screens
  // hinweg erhalten (Züge mutieren sie in place, siehe tryMove in chessEngine.ts), wird aber
  // automatisch ausgetauscht, sobald sich `screen` ändert — dasselbe Prinzip wie die
  // `gameRef`-Ref in QuestMoveScreen.tsx, hier als `useMemo` geschrieben, weil pro Screen
  // ohnehin nur EIN Zug vorkommt (keine Übungsrunden wie dort).
  const game = useMemo(() => {
    if (screen === 2) return createPosition(FESSELUNG_POSITIONS.eigenePin);
    if (screen === 5) return createPosition(FESSELUNG_POSITIONS.perspektivwechselUndSchlagen);
    return null;
  }, [screen]);

  const [ort, setOrt] = useState<BoardSquare>(EIGENE_WAECHTER);
  const [legalTargets, setLegalTargets] = useState<BoardSquare[]>([]);

  useEffect(() => {
    if (screen === 2 && game) {
      setOrt(EIGENE_WAECHTER);
      setLegalTargets(legalTargetsFor(game, EIGENE_WAECHTER));
    } else if (screen === 5 && game) {
      setOrt(EIGENER_HELD_TURM);
      setLegalTargets(legalTargetsFor(game, EIGENER_HELD_TURM));
    }
  }, [screen, game]);

  async function handleKapitelAbgeschlossen() {
    await saveBonusFortschrittLocal("fesselung", true);
  }

  // Gemeinsamer Teil der BoardConfig für die "eigenePin"-Stellung (Screens 0-2) — als kleine
  // Hilfsfunktion statt eines gemeinsamen Objekt-Spreads, damit TypeScript die Pflichtfelder
  // von BoardConfig an jeder Aufrufstelle trotzdem vollständig prüfen kann.
  function eigenePinKonfig(
    erweiterung: Pick<
      BoardConfig,
      "pieceAt" | "legalTargets" | "zeigeZielringe" | "trapTarget" | "trapBedrohtAt" | "trapAngreiferAt" | "kettenlinie"
    >
  ): BoardConfig {
    return {
      rows: 8,
      cols: 8,
      pieceIcon: <TurmMasterIcon />,
      opponentAt: EIGENE_ANGREIFER,
      opponentIcon: <TurmMasterDunkelIcon />,
      zusatzfiguren: [{ at: EIGENE_KOENIG, icon: <KoenigMasterIcon /> }],
      ...erweiterung,
    };
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund />
      <Pressable
        style={styles.luxCorner}
        onPress={handleLuxTap}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {zeigeUntertitel && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{aktuelleZeile}</Text>
        </View>
      )}

      {/* Screen 0 — Vorstellung: Wächter zwischen König und Angreifer, noch OHNE Kettenlinie
          (die kommt erst in Screen 1 "Entdecken" hinzu — genau der im Skript beschriebene
          zweistufige Aufbau). */}
      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)}>
          <Board
            config={eigenePinKonfig({ pieceAt: EIGENE_WAECHTER, legalTargets: [] })}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screen 1 — Entdecken: dieselbe Stellung, jetzt MIT der goldenen Kettenlinie. */}
      {screen === 1 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(2)}>
          <Board
            config={eigenePinKonfig({
              pieceAt: EIGENE_WAECHTER,
              legalTargets: [],
              kettenlinie: { von: EIGENE_KOENIG, bis: EIGENE_ANGREIFER },
            })}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screen 2 — Kernaufgabe: kombinierte Stopp!-Aufgabe. Echte Legalzüge AUF der Linie
          UND ein Stopp!-Feld ABSEITS der Linie sind gleichzeitig antippbar (Board.tsx
          unterstützt legalTargets + trapTarget nebeneinander bereits seit den Haupt-Quests) —
          egal, welchen der beiden das Kind zuerst wählt, geht es danach zu Screen 3 weiter. */}
      {screen === 2 && game && (
        <Board
          config={eigenePinKonfig({
            pieceAt: ort,
            legalTargets,
            zeigeZielringe,
            kettenlinie: { von: EIGENE_KOENIG, bis: EIGENE_ANGREIFER },
            trapTarget: EIGENE_STOPP_FELD,
            trapBedrohtAt: EIGENE_KOENIG,
            trapAngreiferAt: EIGENE_ANGREIFER,
          })}
          onCorrectMove={(target) => {
            // Design-Grundsatz "immer alle Legalzüge anbieten" (siehe QuestMoveScreen.tsx-
            // Kommentar): JEDES der angebotenen Zielfelder schließt den Screen ab, auch das
            // Schlagen des Angreifers auf d8 selbst — das löst die Fesselung sogar vollständig
            // auf, ist also erst recht eine gültige, sinnvolle Lösung.
            tryMove(game, ort, target);
            gehZu(3);
          }}
          onTrapTap={() => {
            // Dasselbe 950ms-Muster wie Quest1.tsx Screen 4 (onTrapTap): kurze Zeit, damit die
            // Stopp!-/Bedrohungs-Konsequenz-Animation (Board.tsx) tatsächlich gesehen wird,
            // bevor der Screen wechselt.
            setTimeout(() => gehZu(3), 950);
          }}
        />
      )}

      {/* Screen 3 — Perspektivwechsel-Entdecken: dieselbe Fesselungs-Geometrie, jetzt an einer
          GEGNERISCHEN Figur — keine Interaktion, reine Erkenntnis. */}
      {screen === 3 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(4)}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: EIGENER_FESSELNDER_TURM,
              legalTargets: [],
              pieceIcon: <TurmMasterIcon />,
              zusatzfiguren: [
                { at: FREMDER_KOENIG, icon: <KoenigMasterDunkelIcon /> },
                { at: FREMDER_WAECHTER, icon: <TurmMasterDunkelIcon /> },
                { at: EIGENER_HELD_TURM, icon: <TurmMasterIcon /> },
              ],
              kettenlinie: { von: EIGENER_FESSELNDER_TURM, bis: FREMDER_KOENIG },
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screen 4 — Vorführung: Auto-Demo des sicheren Schlagzugs (derselbe demoTarget/
          onDemoDone-Mechanismus, den QuestMoveScreen.tsx für die Vorführ-Phase aller sechs
          Haupt-Quests nutzt) — rein optisch, mutiert `game` nicht, Screen 5 baut die Stellung
          deshalb ohnehin frisch auf. */}
      {screen === 4 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: EIGENER_HELD_TURM,
            legalTargets: [],
            pieceIcon: <TurmMasterIcon />,
            opponentAt: GEGNERISCHER_SPRINGER,
            opponentIcon: <SpringerMasterDunkelIcon />,
            zusatzfiguren: [
              { at: FREMDER_KOENIG, icon: <KoenigMasterDunkelIcon /> },
              { at: FREMDER_WAECHTER, icon: <TurmMasterDunkelIcon /> },
              { at: EIGENER_FESSELNDER_TURM, icon: <TurmMasterIcon /> },
            ],
            kettenlinie: { von: EIGENER_FESSELNDER_TURM, bis: FREMDER_KOENIG },
          }}
          onCorrectMove={() => {}}
          demoTarget={GEGNERISCHER_SPRINGER}
          onDemoDone={() => gehZu(5)}
        />
      )}

      {/* Screen 5 — Mini-Übung: dasselbe Kernpuzzle jetzt selbst gelöst. */}
      {screen === 5 && game && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: ort,
            legalTargets,
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            opponentAt: GEGNERISCHER_SPRINGER,
            opponentIcon: <SpringerMasterDunkelIcon />,
            zusatzfiguren: [
              { at: FREMDER_KOENIG, icon: <KoenigMasterDunkelIcon /> },
              { at: FREMDER_WAECHTER, icon: <TurmMasterDunkelIcon /> },
              { at: EIGENER_FESSELNDER_TURM, icon: <TurmMasterIcon /> },
            ],
            kettenlinie: { von: EIGENER_FESSELNDER_TURM, bis: FREMDER_KOENIG },
          }}
          onCorrectMove={(target) => {
            tryMove(game, ort, target);
            gehZu(6);
            handleKapitelAbgeschlossen();
          }}
        />
      )}

      {screen === 6 && (
        // Update (Rochade-Umsetzung, siehe bonus/Rochade.tsx): führt jetzt zum nächsten
        // Bonuskapitel weiter statt zurück zu KidHome — die Bonuskapitel sind laut Skript
        // eine ununterbrochene Kette ("der Weg zur Wisentfeste-Burg"), kein Satz einzeln
        // erreichbarer Stationen.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("Rochade")}>
          <QuestGeschafft>
            <KetteIcon size={92} />
          </QuestGeschafft>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  sprechblase: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 20,
    marginHorizontal: 8,
    minHeight: 76,
    justifyContent: "center",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  sprechblaseSchweif: {
    position: "absolute",
    top: -6,
    left: 28,
    width: 14,
    height: 14,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  speech: { fontSize: 16, color: "#4A4038", textAlign: "center" },
  tapArea: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center" },
});
