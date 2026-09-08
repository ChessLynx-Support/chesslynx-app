// Portierung von prototyp/client/src/quest4/Quest4.tsx nach React Native, nach demselben
// reduzierten Muster wie Quest 1-3. Besonderheit laut Projektwissen: der Springer ist die
// einzige Figur, die über andere Figuren hinwegziehen darf — Screen 4 zeigt das deshalb
// bewusst NICHT als Stopp!-Aufgabe (kein trapTarget), sondern als positive Überraschung:
// dieselben Sprungfelder bleiben trotz mehrerer "im Weg stehender" Figuren uneingeschränkt
// legal, weil chess.js Springerzüge korrekt nie durch Zwischenfelder blockiert.
// Der Verwandlungsmoment (Pferd → Springer, zwischen Screen 1 und 2) IST umgesetzt,
// siehe Quest1.tsx-Kommentar und src/lib/Verwandlung.tsx.
//
// Update (Nutzer-Feedback 2026-09-07, "Es sollten sinnvolle Züge des Pferds mit weißen
// Figuren verdeckt werden, und alle möglichen Züge und ggf. ein Zug mit Materialgewinn
// vorgeschlagen werden"): die früheren getrennten Screens 4 ("umzingelt, hüpft trotzdem")
// und 5 ("schlägt eine Besuchsfigur") sind zu einem einzigen Screen 4 verschmolzen — der
// Springer steht jetzt auf ALLEN acht Nachbarfeldern von eigenen Figuren umgeben (siehe
// chessEngine.ts/QUEST4_POSITIONS.screen4Blocked), und eines der acht Sprungfelder trägt
// zusätzlich eine schlagbare gegnerische Figur. Passend zum allgemeinen Prinzip aus
// QuestMoveScreen.tsx zeigt der Screen jetzt alle acht Sprünge gleichzeitig an; die
// gesprochene Zeile weist gezielt auf das Schlagen hin, ohne die anderen sieben Sprünge zu
// verstecken.

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST4_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, siehe ausführlicher Kommentar in QuestMoveScreen.tsx.
import { QuestMoveScreen } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon), Gegner-/
// "Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Pferd/Springer-
// Master-Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs.
import { SpringerMasterIcon, SpringerMasterDunkelIcon, SpringerMasterGrossIcon } from "../lib/pieceMasters";
// Bugfix (Nutzer-Feedback 2026-09-07, nach dem ersten `npm test`-Durchlauf: "Es ist sehr
// unrealistisch, dass der Springer von so vielen anderen Springern umzingelt ist"): Screen 4
// zeigte hier fälschlich SpringerMasterIcon für die umgebenden Figuren, obwohl die FEN
// (siehe chessEngine.ts/QUEST4_POSITIONS.screen4Blocked) durchgehend Bauern kodiert — ein
// echter Icon/FEN-Mismatch, kein reines Geschmacksthema. Jetzt BauerMasterIcon, passend zur
// jetzt ebenfalls auf eine realistische 3er-Bauernkette reduzierten Stellung.
import { BauerMasterIcon } from "../lib/pieceMasters";
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

type ScreenId = 0 | 1 | "verwandlung" | 2 | 4 | 7;

const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt ein neuer Freund.",
    "Tipp weiter, um ihn kennenzulernen.",
  ],
  1: ["Hallo! Ich bin's wieder, Lux.", "Das ist ein Pferd.", "Tipp irgendwo hin, um weiterzumachen."],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Pferd wird ein Springer!"],
  2: [
    "Der Springer hüpft immer im Winkel — zwei Felder in eine Richtung, dann eins zur Seite.",
    "Tipp auf ein leuchtendes Feld.",
  ],
  4: [
    "Schau, hinter dem Springer steht eine kleine Bauernkette.",
    "Die stören ihn überhaupt nicht — er hüpft einfach über alle hinweg.",
    "Ganz hinten wartet sogar Besuch. Kannst du ihn schlagen?",
  ],
  7: ["Lux hat ein neues Gebiet entdeckt!", "Wunderbar gemacht."],
};

// Startfeld des Springers in allen Quest4-FENs.
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

export default function Quest4() {
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
    await saveQuestFortschrittLocal("quest4", { sterne: 3, abgeschlossen: true, letzterSchritt: "screen7" });
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
          <SpringerMasterGrossIcon size={150} />
        </Pressable>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<SpringerMasterGrossIcon size={150} />}
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
          fen={QUEST4_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          pieceIcon={<SpringerMasterIcon />}
          onSolved={() => { setLineIndex(0); setScreen(4); }}
        />
      )}

      {screen === 4 && (
        // Bewusst KEIN trapAt hier — der Springer soll jeden Sprung tatsächlich ausführen
        // können, die drei "im Weg stehenden" Bauern verändern die Zuglogik nicht (siehe
        // chessEngine.ts-Kommentar). blockerAt (Array, siehe Board.tsx-Update) statt
        // opponentAt für die Bauernkette: die stehen im FEN WEISS (eigene Figuren), sollen
        // also hell/eigen dargestellt werden. Die einzige echte Besuchsfigur (c6, ein
        // Sprungziel) bleibt separat über opponentAt/opponentIcon, damit sie erkennbar
        // schlagbar wirkt statt wie eine weitere Blockade.
        // Update (Nutzer-Feedback 2026-09-07, siehe Kommentar oben in dieser Datei): löst
        // die frühere onlyTarget-Beschränkung auf ein einzelnes Sprungfeld ab — alle acht
        // Sprünge sind weiterhin gleichzeitig sichtbar und lösbar (siehe QuestMoveScreen.tsx).
        // Bugfix (Nutzer-Feedback 2026-09-07, siehe Import-Kommentar oben): Bauernkette auf
        // drei Feldern (c3/d3/e3) statt des vollen Achter-Rings, mit BauerMasterIcon statt
        // des fälschlich verwendeten SpringerMasterIcon.
        <QuestMoveScreen
          fen={QUEST4_POSITIONS.screen4Blocked}
          pieceAt={PIECE_AT}
          blockerAt={[
            { row: 5, col: 2 }, // c3
            { row: 5, col: 3 }, // d3
            { row: 5, col: 4 }, // e3
          ]}
          opponentAt={{ row: 2, col: 2 }} // c6
          pieceIcon={<SpringerMasterIcon />}
          blockerIcon={<BauerMasterIcon />}
          opponentIcon={<SpringerMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("Quest5")}>
          <QuestGeschafft>
            <SpringerMasterIcon size={92} />
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
