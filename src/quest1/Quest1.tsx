// Portierung von prototyp/client/src/quest1/Quest1.tsx nach React Native.
//
// Umfang dieser Portierung (bewusst, siehe README): Screens 0, 1, 2, 4, 5, 7 sind
// funktional nachgebaut, inkl. echter chess.js-Zuglogik für die Spielfeld-Screens
// (2 = Bewegung, 4 = Stopp!-Aufgabe/Blockade, 5 = Schlagen). Screen 3 (Doppelschritt),
// Screen 6 (3-Runden-Mini-Spiel mit Sterne-Auswertung) und die Verwandlungsmoment-
// Animation sind ABSICHTLICH NICHT Teil dieses Grundgerüsts — sie brauchen die
// Cburnett-Grafiken (Verwandlungsmoment) bzw. eine eigene Zähl-/Auswertungslogik
// (Mini-Spiel), die laut `aufwandsschaetzung_mvp_rollout.md` erst mit den echten
// MVP-Kern-Assets sinnvoll ist. Vollständige Screen-Texte/-Reihenfolge: siehe
// SCREEN_SCRIPTS im Web-Prototyp, hier unverändert übernommen für Konsistenz.

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { Board, type BoardConfig } from "./Board";
import { createPosition, legalTargetsFor, tryMove, QUEST1_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";

type ScreenId = 0 | 1 | 2 | 4 | 5 | 7;

// 1:1 aus dem Web-Prototyp übernommen (SCREEN_SCRIPTS), gekürzt auf die hier
// umgesetzten Screens. Screen 3/6 fehlen bewusst, siehe Kommentar oben.
const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  0: [
    "Willkommen im Wald von ChessLynx!",
    "Hier siehst du das Spielbrett und alle seine Bewohner.",
    "Tipp weiter, um den Igel kennenzulernen.",
  ],
  1: [
    "Hallo! Ich bin Lux, dein Freund im Wald.",
    "Das ist ein kleiner Igel.",
    "Tipp irgendwo hin, um weiterzumachen.",
  ],
  2: ["Der Igel darf ein Feld nach vorne gehen.", "Tipp auf das leuchtende Feld."],
  4: ["Der Igel kann nicht geradeaus über eine andere Figur springen.", "Versuch es ruhig einmal aus."],
  5: ["Eine Figur ist zu Besuch!", "Der Igel kann sie schräg vorne freundlich begrüßen."],
  7: ["Der Igel hat ein neues Gebiet entdeckt!", "Wunderbar gemacht."],
};

export default function Quest1() {
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);

  const lines = SCREEN_SCRIPTS[screen];
  const isLastLine = lineIndex === lines.length - 1;

  function advanceOrGo(next: ScreenId) {
    if (!isLastLine) {
      setLineIndex((i) => i + 1);
      return;
    }
    setLineIndex(0);
    setScreen(next);
  }

  async function handleQuestComplete() {
    await saveQuestFortschrittLocal("quest1", {
      sterne: 3,
      abgeschlossen: true,
      letzterSchritt: "screen7",
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.luxCorner}>
        <View style={styles.luxHead} />
      </View>
      <Text style={styles.speech}>{lines[lineIndex]}</Text>

      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)} />
      )}

      {screen === 1 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(2)} />
      )}

      {screen === 2 && (
        <MoveScreen
          fen={QUEST1_POSITIONS.screen2}
          // Curriculum-Einschränkung: Screen 2 zeigt laut Design nur den Ein-Feld-Schritt,
          // der Doppelschritt ist Screen 3 vorbehalten (hier nicht Teil des Grundgerüsts).
          // chess.js selbst kennt diese Lernpfad-Reihenfolge nicht und liefert bei einem
          // unbewegten Bauern korrekt BEIDE Zielfelder (e3 und e4) — die Filterung auf
          // "ein Feld entfernt" ist bewusste App-Logik, keine Zugregel-Änderung.
          restrictToSingleStep
          onSolved={() => {
            setLineIndex(0);
            setScreen(4);
          }}
        />
      )}

      {screen === 4 && (
        <MoveScreen
          fen={QUEST1_POSITIONS.screen4Blocked}
          trapAt={{ row: 4, col: 4 }} // Feld direkt hinter der blockierenden Figur (e4)
          onSolved={() => {
            setLineIndex(0);
            setScreen(5);
          }}
        />
      )}

      {screen === 5 && (
        <MoveScreen
          fen={QUEST1_POSITIONS.screen5Capture}
          // Curriculum-Einschränkung wie bei Screen 2: chess.js liefert hier korrekt
          // auch e3/e4 als legale Züge (der Bauer könnte ja auch einfach weitergehen),
          // aber dieser Screen soll gezielt nur das diagonale Schlagen zeigen.
          onlyDiagonal
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        <View style={styles.tapArea}>
          <View style={styles.unlockedBlob} />
        </View>
      )}
    </SafeAreaView>
  );
}

/**
 * Kapselt "eine chess.js-Stellung laden, Legalzüge für die Übungsfigur anzeigen,
 * bei korrektem Zug weiter". Ersetzt den im Web-Prototyp pro Screen hart kodierten
 * BoardConfig-Aufbau.
 */
function MoveScreen({
  fen,
  trapAt,
  restrictToSingleStep,
  onlyDiagonal,
  onSolved,
}: {
  fen: string;
  trapAt?: BoardSquare;
  restrictToSingleStep?: boolean;
  onlyDiagonal?: boolean;
  onSolved: () => void;
}) {
  const [game] = useState(() => createPosition(fen));
  const pieceAt: BoardSquare = { row: 6, col: 4 }; // e2 — Startfeld des Übungs-Bauern in allen Quest1-FENs
  const [legalTargets] = useState(() => {
    const all = legalTargetsFor(game, pieceAt);
    // Siehe Kommentar an den Aufrufstellen: reine Lernpfad-Kuration, chess.js selbst
    // validiert weiterhin alle Zugarten korrekt, hier werden pro Screen nur die zum
    // aktuellen Lernschritt passenden Optionen tatsächlich angeboten.
    if (restrictToSingleStep) return all.filter((t) => Math.abs(t.row - pieceAt.row) === 1 && t.col === pieceAt.col);
    if (onlyDiagonal) return all.filter((t) => t.col !== pieceAt.col);
    return all;
  });

  // Fenster e/d/f-Linie x Reihen 4-6 (row-4, col-3): deckt Startfeld (row6), Einzel- und
  // Doppelschritt (row5/row4) sowie beide Diagonalfelder (row5, col3/col5) ab — die
  // ursprüngliche Fassung nutzte row-5 und schnitt damit row4 (Doppelschritt- bzw.
  // Stopp!-Zielfeld in Screen 4) versehentlich ab.
  const rowOffset = 4;
  const colOffset = 3;

  const config: BoardConfig = {
    rows: 3,
    cols: 3,
    pieceAt: { row: pieceAt.row - rowOffset, col: pieceAt.col - colOffset },
    legalTargets: legalTargets.map((t) => ({ row: t.row - rowOffset, col: t.col - colOffset })),
    trapTarget: trapAt ? { row: trapAt.row - rowOffset, col: trapAt.col - colOffset } : undefined,
  };

  return (
    <Board
      config={config}
      onCorrectMove={(target) => {
        const real: BoardSquare = { row: target.row + rowOffset, col: target.col + colOffset };
        const result = tryMove(game, pieceAt, real);
        if (result.ok) onSolved();
      }}
      onTrapTap={() => {
        /* Konsequenz-Animation läuft in Board.tsx selbst (Stopp!-Aufgabe) */
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24 },
  luxHead: { width: 52, height: 48, borderRadius: 26, backgroundColor: "#E8D2B0" },
  speech: { fontSize: 16, color: "#4A4038", textAlign: "center", marginBottom: 20, paddingHorizontal: 24 },
  tapArea: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center" },
  unlockedBlob: { width: 120, height: 90, borderRadius: 40, backgroundColor: "#DCE5D6" },
});
