// Portierung von prototyp/client/src/quest3/Quest3.tsx nach React Native, nach demselben
// reduzierten Muster wie Quest 1/2 (siehe dortige Kommentare zum Umfang). Die im
// Web-Prototyp enthaltene Turm-vs-Läufer-Unterscheidungsaufgabe (dortiger Screen 3) und
// das 3-Runden-Mini-Spiel (Screen 5/6) fehlen ABSICHTLICH, aus denselben Gründen wie bei
// Quest 1/2 (Assets/Zähl-Logik erst mit MVP-Kern-Assets sinnvoll). Der Verwandlungsmoment
// (Eule → Läufer, zwischen Screen 1 und 2) IST umgesetzt, siehe Quest1.tsx-Kommentar.
// (Korrigiert 2026-09-06: war bis dahin noch auf die alte Wiesel-Zuordnung codiert,
// siehe projektwissen.md.)

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST3_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, siehe ausführlicher Kommentar in QuestMoveScreen.tsx.
import { QuestMoveScreen } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon), Gegner-/
// "Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Eule/Läufer-
// Master-Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs.
import { LaeuferMasterIcon, LaeuferMasterDunkelIcon, LaeuferMasterGrossIcon } from "../lib/pieceMasters";
// Bugfix (Opus-Review, 2026-09-07, Befund 2.1, siehe claude/review_logik_grafik_
// audiofuehrung.md): LuxEckIcon statt des beigen Platzhalter-Kreises (styles.luxHead).
import { LuxEckIcon } from "../lib/luxAssets";
// Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
// audiofuehrung.md): gemeinsamer Sprech-Hook + Untertitel-Flag, siehe Aufrufstellen unten.
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { Verwandlung } from "../lib/Verwandlung";
import { QuestGeschafft } from "../components/QuestGeschafft";
// Nutzer-Feedback 2026-09-07 ("Hier sollte auch ein schöner Hintergrund genutzt werden"):
// gemeinsame Wald-Lichtung-Kulisse für alle Quests, siehe ausführlicher Kommentar in
// WaldHintergrund.tsx.
import { WaldHintergrund } from "../components/WaldHintergrund";

type ScreenId = 0 | 1 | "verwandlung" | 2 | 4 | 5 | 7;

const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt eine neue Freundin.",
    "Tipp weiter, um sie kennenzulernen.",
  ],
  1: ["Hallo! Ich bin's wieder, Lux.", "Das ist eine Eule.", "Tipp irgendwo hin, um weiterzumachen."],
  verwandlung: ["Und jetzt die Verwandlung: Aus der Eule wird ein Läufer!"],
  2: ["Der Läufer zieht immer schräg, nie gerade.", "Tipp auf ein leuchtendes Feld."],
  4: [
    "Da steht jemand mitten auf dem Weg.",
    "Der Läufer kann nicht darüber hinwegziehen.",
    "Er darf aber die andere Richtung nehmen.",
  ],
  5: ["Am Ende des Weges wartet eine Figur.", "Der Läufer kann sie freundlich begrüßen."],
  7: ["Lux hat ein neues Gebiet entdeckt!", "Wunderbar gemacht."],
};

// Startfeld des Läufers in allen Quest3-FENs.
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

export default function Quest3() {
  const navigation = useNavigation<any>();
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

  // Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
  // audiofuehrung.md): siehe ausführlicher Kommentar in Quest1.tsx — löst den bisherigen
  // advanceLine()-Mechanismus (Befund 1.1) ab.
  const autoWeiter = screen !== 0 && screen !== 1 && screen !== "verwandlung";
  const { wiederholen } = useLuxSprechzeile(
    `${screen}-${lineIndex}`,
    lines[lineIndex],
    autoWeiter && !isLastLine ? () => setLineIndex((i) => i + 1) : undefined
  );
  // Echter Eltern-Dashboard-Schalter statt der früheren ZEIGE_UNTERTITEL-Konstante,
  // siehe src/lib/untertitelEinstellung.ts.
  const zeigeUntertitel = useUntertitelAktiv();

  async function handleQuestComplete() {
    await saveQuestFortschrittLocal("quest3", { sterne: 3, abgeschlossen: true, letzterSchritt: "screen7" });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund />
      <Pressable
        style={styles.luxCorner}
        onPress={wiederholen}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {/* Bugfix (Opus-Review, 2026-09-07, Befund 2.2, siehe claude/review_logik_grafik_
          audiofuehrung.md): Sprechblase statt freistehendem Text, siehe Quest1.tsx.
          Abschnitt 3.1, Schritt 6: Text jetzt hinter einem echten Eltern-Schalter (siehe
          src/lib/untertitelEinstellung.ts). */}
      {zeigeUntertitel && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{lines[lineIndex]}</Text>
        </View>
      )}

      {screen === 0 && <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)} />}
      {screen === 1 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo("verwandlung")}>
          <LaeuferMasterGrossIcon size={150} />
        </Pressable>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<LaeuferMasterGrossIcon size={150} />}
          grossGroesse={150}
          kleinGroesse={34}
          onDone={() => {
            setLineIndex(0);
            setScreen(2);
          }}
        />
      )}

      {screen === 2 && (
        <QuestMoveScreen
          fen={QUEST3_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          pieceIcon={<LaeuferMasterIcon />}
          onSolved={() => { setLineIndex(0); setScreen(4); }}
        />
      )}

      {screen === 4 && (
        <QuestMoveScreen
          fen={QUEST3_POSITIONS.screen4Blocked}
          pieceAt={PIECE_AT}
          trapAt={{ row: 2, col: 5 }} // f6
          blockerAt={{ row: 2, col: 5 }}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // früher per onlyTarget auf e5 (das eine Feld direkt vor der Blockade)
          // verborgen — chess.js liefert hier zusätzlich die komplette zweite, offene
          // Diagonale, die jetzt ebenfalls sichtbar und akzeptiert wird (dritte
          // Sprechzeile oben: "Er darf aber die andere Richtung nehmen."). Die
          // Stopp!-Aufgabe selbst bleibt über trapAt/onTrapTap unten weiterhin ein
          // eigener, gleichwertiger Lösungsweg.
          pieceIcon={<LaeuferMasterIcon />}
          blockerIcon={<LaeuferMasterIcon />}
          onSolved={() => { setLineIndex(0); setScreen(5); }}
          // Bugfix (Opus-Review Befund 1.3): onTrapTap führt jetzt genauso weiter wie der
          // korrekte Zug — zwei gleichwertige Wege (siehe Quest1.tsx).
          onTrapTap={() => {
            setTimeout(() => {
              setLineIndex(0);
              setScreen(5);
            }, 950);
          }}
        />
      )}

      {screen === 5 && (
        <QuestMoveScreen
          fen={QUEST3_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // früher per onlyCaptureAt auf f6 verborgen, jetzt sind auch die übrigen
          // Legalzüge sichtbar und akzeptiert.
          opponentAt={{ row: 2, col: 5 }}
          pieceIcon={<LaeuferMasterIcon />}
          opponentIcon={<LaeuferMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("Quest4")}>
          <QuestGeschafft>
            <LaeuferMasterIcon size={92} />
          </QuestGeschafft>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  // Bugfix (Opus-Review, Befund 2.2): Sprechblase statt freistehendem Text, siehe
  // ausführlicher Kommentar in Quest1.tsx.
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
