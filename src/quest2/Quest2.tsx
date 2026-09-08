// Portierung von prototyp/client/src/quest2/Quest2.tsx nach React Native, nach exakt
// demselben Muster wie src/quest1/Quest1.tsx (siehe dortiger Kommentar zum Umfang):
// Screens 0/1/2/4/5/7 sind funktional nachgebaut, inkl. echter chess.js-Zuglogik.
// Das im Web-Prototyp enthaltene 3-Runden-Mini-Spiel mit Sterne-Auswertung (dortige
// Screens 5/6) fehlt ABSICHTLICH — siehe Begründung in Quest1.tsx bzw. README.md.
// Der Verwandlungsmoment (Bär → Turm, zwischen Screen 1 und 2) IST umgesetzt,
// siehe src/lib/Verwandlung.tsx und Quest1.tsx-Kommentar. (Korrigiert 2026-09-06: war
// bis dahin noch auf die alte Schildkröte-Zuordnung codiert, siehe projektwissen.md.)
//
// Turm-spezifisch, anders als beim Bauern: derselbe Zug (senkrecht ODER waagerecht,
// beliebig weit bei freier Bahn) deckt sowohl "Bewegung entdecken" als auch das
// "Schlagen" ab — Schlagen ist für den Turm einfach ein Zug ans Ende einer offenen
// Linie, auf der eine gegnerische Figur steht, keine eigene Zugart wie beim Bauern.
// Die Stopp!-Aufgabe (Screen 4) und das Schlagen (Screen 5) sind deshalb hier bewusst
// zwei unterschiedliche, aber strukturell ähnliche Stellungen (siehe chessEngine.ts).

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST2_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, siehe ausführlicher Kommentar in QuestMoveScreen.tsx.
import { QuestMoveScreen } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon), Gegner-/
// "Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Bär/Turm-Master-
// Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs.
import { TurmMasterIcon, TurmMasterDunkelIcon, TurmMasterGrossIcon } from "../lib/pieceMasters";
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
    "Hier lebt ein neuer Freund.",
    "Tipp weiter, um ihn kennenzulernen.",
  ],
  1: [
    "Hallo! Ich bin's wieder, Lux.",
    "Das ist ein Bär.",
    "Tipp irgendwo hin, um weiterzumachen.",
  ],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Bären wird ein Turm!"],
  2: [
    // Update (2026-09-07, Nutzer-Feedback): ab Quest 2 zeigt das Brett erstmals alle 64
    // Felder auf einmal (vorher kleines Ausschnittsfenster) — Lux erklärt das hier einmalig,
    // ab Quest 3 wird es als bekannt vorausgesetzt.
    "Ab jetzt siehst du das ganze Schachbrett — so siehst du immer alle Möglichkeiten auf einmal.",
    "Der Turm darf so weit ziehen, wie der Weg frei ist.",
    "Tipp auf ein leuchtendes Feld.",
  ],
  4: [
    "Da steht jemand mitten auf dem Weg.",
    "Der Turm kann nicht darüber hinwegziehen.",
    "Er darf aber trotzdem zur Seite ziehen.",
  ],
  5: ["Am Ende des Weges wartet eine Figur.", "Der Turm kann sie freundlich begrüßen."],
  7: ["Lux hat ein neues Gebiet entdeckt!", "Wunderbar gemacht."],
};

// Startfeld des Turms in allen Quest2-FENs.
const PIECE_AT: BoardSquare = { row: 7, col: 0 }; // a1

export default function Quest2() {
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
    await saveQuestFortschrittLocal("quest2", {
      sterne: 3,
      abgeschlossen: true,
      letzterSchritt: "screen7",
    });
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
          <TurmMasterGrossIcon size={150} />
        </Pressable>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<TurmMasterGrossIcon size={150} />}
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
          fen={QUEST2_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          pieceIcon={<TurmMasterIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(4);
          }}
        />
      )}

      {screen === 4 && (
        <QuestMoveScreen
          fen={QUEST2_POSITIONS.screen4Blocked}
          pieceAt={PIECE_AT}
          trapAt={{ row: 5, col: 0 }} // a3 — eigener Bauer, blockiert die Linie
          blockerAt={{ row: 5, col: 0 }}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // chess.js liefert hier korrekt auch b1/c1/d1 (die offene 1. Reihe) als
          // Legalzüge — früher per onlyTarget auf a2 (das Feld direkt vor der Blockade)
          // verborgen, jetzt zusätzlich sichtbar und akzeptiert (dritte Sprechzeile oben:
          // "Er darf aber trotzdem zur Seite ziehen."). Die Stopp!-Aufgabe selbst bleibt
          // über trapAt/onTrapTap unten weiterhin ein eigener, gleichwertiger Lösungsweg.
          pieceIcon={<TurmMasterIcon />}
          blockerIcon={<TurmMasterIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(5);
          }}
          // Bugfix (Opus-Review Befund 1.3): onTrapTap führt jetzt genauso zum nächsten
          // Screen wie der korrekte Zug — zwei gleichwertige Wege (siehe Quest1.tsx).
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
          fen={QUEST2_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // chess.js liefert hier zusätzlich legale Züge entlang der offenen 1. Reihe
          // (b1/c1/d1) und der freien a-Linie vor der gegnerischen Figur (a2/a3) — früher
          // per onlyCaptureAt auf a4 verborgen, jetzt ebenfalls sichtbar und akzeptiert.
          opponentAt={{ row: 4, col: 0 }}
          pieceIcon={<TurmMasterIcon />}
          opponentIcon={<TurmMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        // Bugfix (Opus-Review Befund 1.8): führte bisher zurück zu KidHome statt zu
        // Quest3 weiter — die Quest-Kette brach nach Quest 2 ab.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("Quest3")}>
          <QuestGeschafft>
            <TurmMasterIcon size={92} />
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
