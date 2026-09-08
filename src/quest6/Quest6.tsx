// Portierung von prototyp/client/src/quest6/Quest6.tsx nach React Native, nach demselben
// reduzierten Muster wie Quest 1-5 — mit einer wichtigen inhaltlichen Abweichung: Screen 4
// zeigt hier laut Projektwissen ("führt Schach und Matt als gesprochene Begriffe ein")
// bewusst ein ECHTES Schach, nicht nur eine Blockade. chess.js berechnet die dadurch
// reduzierten Fluchtfelder automatisch korrekt — kein eigener Sonderfall in der UI nötig,
// nur echte Zuglogik. Von den drei gleichwertigen Lösungswegen aus der Spezifikation
// (wegziehen / dazwischenstellen / schlagen) ist hier bewusst nur "wegziehen" umgesetzt;
// Blockieren und Schlagen des Angreifers brauchen zusätzliche Helferfiguren-Logik, die
// laut aufwandsschaetzung_mvp_rollout.md erst mit den echten MVP-Kern-Assets sinnvoll ist.
// "Matt" (Checkmate-Erkennung/-UI) ist ebenfalls bewusst NICHT Teil dieser Portierung.
// Der Verwandlungsmoment (Hirsch → König, zwischen Screen 1 und 2) IST umgesetzt, siehe
// Quest1.tsx-Kommentar und src/lib/Verwandlung.tsx.
//
// Modernisierung (Nutzer-Rückfrage 2026-09-07, "Was kann noch getan werden?"): Quest 6 war
// die letzte Datei, die noch auf dem alten Stand von vor dem Opus-Review (2026-09-07, siehe
// claude/review_logik_grafik_audiofuehrung.md) stand — eigene lokale MoveScreen()-Funktion
// statt QuestMoveScreen.tsx, alte `creatures.tsx`/`chessPieces.tsx`-SVGs statt der neuen
// Master-Illustrationen, beigener Platzhalter-Kreis statt LuxEckIcon, freistehender Text
// statt Sprechblase+gesprochener Führung, geschriebenes "Schach!"-Textbadge statt des
// echten visuellen Bedrohungs-Signals (BedrohungsPuls/Verbindungslinie in Board.tsx, dort
// bereits für alle anderen Quests fertig eingebaut), kein QuestGeschafft-Feiermoment. Diese
// Datei zieht Quest 6 auf exakt denselben Stand wie Quest 1-5 — siehe Kommentare an den
// jeweiligen Stellen unten für die Details. Rein strukturelle Angleichung, KEINE inhaltliche
// Änderung an Zugregeln oder Lernzielen.
//
// Wichtig zum geschriebenen "Schach!"-Badge: der zentrale Design-Grundsatz der App ist
// "vollständig textfrei, durchgehend über Lux' gesprochene Führung" (siehe Datei-Kommentar
// in luxStimme.ts). Das bisherige Text-Badge war der letzte verbliebene Bruch damit — der
// Begriff "Schach" wird jetzt ausschließlich gesprochen (SCREEN_SCRIPTS[4], erste Zeile,
// wie schon zuvor) und zusätzlich durch die bereits vorhandene visuelle Bedrohungs-Markierung
// gezeigt (`zeigeSchach` unten, siehe QuestMoveScreen.tsx/Board.tsx) — kein separates
// geschriebenes Wort mehr auf dem Bildschirm nötig.

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST6_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, genau wie schon bei Quest1.tsx–Quest5.tsx. QuestMoveScreen
// unterstützt `zeigeSchach` (echtes Schach statt Blockade) bereits fertig — siehe dortigen
// Kommentar —, das war zuvor der einzige Grund, warum Quest 6 noch eine eigene lokale
// MoveScreen()-Funktion brauchte.
import { QuestMoveScreen } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx–Quest5.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon),
// Gegner-/"Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Hirsch/
// König-Master-Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs. Der
// bedrohende Springer in Screen 4/5 zeigt konsequent dieselbe SpringerMasterDunkelIcon wie
// in Quest4.tsx, statt ihn (wie zuvor) als unbeschrifteten Platzhalter-Punkt zu belassen.
import {
  KoenigMasterIcon,
  KoenigMasterGrossIcon,
  SpringerMasterDunkelIcon,
} from "../lib/pieceMasters";
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
// WaldHintergrund.tsx. War hier bereits eingebaut, bleibt unverändert.
import { WaldHintergrund } from "../components/WaldHintergrund";

type ScreenId = 0 | 1 | "verwandlung" | 2 | 4 | 5 | 7;

const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt der Wichtigste von allen.",
    "Tipp weiter, um ihn kennenzulernen.",
  ],
  1: ["Hallo! Ich bin's wieder, Lux.", "Das ist ein Hirsch.", "Tipp irgendwo hin, um weiterzumachen."],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Hirsch wird ein König!"],
  2: [
    "Der König zieht in jede Richtung — aber immer nur ein einziges Feld weit.",
    "Tipp auf ein leuchtendes Feld direkt neben ihm.",
  ],
  4: ["Achtung, Schach! Der König ist in Gefahr.", "Tipp auf ein sicheres Feld, um ihm zu helfen."],
  5: ["Steht eine Figur direkt daneben, kann der König sie freundlich begrüßen.", "Tipp hin."],
  7: ["Du kennst jetzt den König — und alle sechs Figuren!", "Wunderbar gemacht."],
};

// Startfeld des Königs in allen Quest6-FENs.
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

export default function Quest6() {
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
  // advanceLine()-Mechanismus (Befund 1.1) ab, wie schon bei Quest1.tsx–Quest5.tsx.
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
    await saveQuestFortschrittLocal("quest6", { sterne: 3, abgeschlossen: true, letzterSchritt: "screen7" });
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
          src/lib/untertitelEinstellung.ts). Löst hier zusätzlich das geschriebene
          "Schach!"-Textbadge ab (siehe Datei-Kommentar oben) — der Begriff wird jetzt nur
          noch gesprochen bzw. optional als Teil dieser Sprechblase mitgelesen. */}
      {zeigeUntertitel && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{lines[lineIndex]}</Text>
        </View>
      )}

      {screen === 0 && <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)} />}
      {screen === 1 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo("verwandlung")}>
          <KoenigMasterGrossIcon size={150} />
        </Pressable>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<KoenigMasterGrossIcon size={150} />}
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
          fen={QUEST6_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          pieceIcon={<KoenigMasterIcon />}
          onSolved={() => { setLineIndex(0); setScreen(4); }}
        />
      )}

      {screen === 4 && (
        // Kein manueller Filter nötig: chess.js liefert für einen König im Schach
        // automatisch nur die Felder, die die Bedrohung tatsächlich auflösen (hier 7 von
        // 8 Nachbarfeldern) — e5 bleibt vom Springer auf c6 bedroht und wird deshalb weiter
        // als Stopp!-Feld angeboten (antippbar, löst aber die Warnung statt eines Zuges
        // aus). Das entspricht bereits vollständig dem "immer alle möglichen Züge
        // anbieten"-Grundsatz (Nutzer-Feedback 2026-09-07) — hier gab es nie einen der
        // inzwischen entfernten onlyTarget/onlyCaptureAt/onlyDiagonal-Filter.
        // `zeigeSchach`: löst das geschriebene "Schach!"-Textbadge durch das bereits für
        // alle anderen Quests fertige visuelle Bedrohungs-Signal ab (BedrohungsPuls beim
        // König + Verbindungslinie zum Springer, siehe Board.tsx).
        <QuestMoveScreen
          fen={QUEST6_POSITIONS.screen4Check}
          pieceAt={PIECE_AT}
          trapAt={{ row: 3, col: 4 }} // e5 — weiterhin bedroht, siehe Kommentar oben
          opponentAt={{ row: 2, col: 2 }} // c6 — der bedrohende Springer
          zeigeSchach
          pieceIcon={<KoenigMasterIcon />}
          opponentIcon={<SpringerMasterDunkelIcon />}
          onSolved={() => { setLineIndex(0); setScreen(5); }}
          onTrapTap={() => {}}
        />
      )}

      {screen === 5 && (
        <QuestMoveScreen
          fen={QUEST6_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          opponentAt={{ row: 3, col: 4 }} // e5 — ungedeckter Springer, kein Schach
          pieceIcon={<KoenigMasterIcon />}
          opponentIcon={<SpringerMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("KidHome")}>
          <QuestGeschafft>
            <KoenigMasterIcon size={92} />
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
