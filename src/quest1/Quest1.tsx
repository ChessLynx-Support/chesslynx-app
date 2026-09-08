// Portierung von prototyp/client/src/quest1/Quest1.tsx nach React Native.
//
// Umfang dieser Portierung (bewusst, siehe README): Screens 0, 1, 2, 4, 5, 7 sind
// funktional nachgebaut, inkl. echter chess.js-Zuglogik für die Spielfeld-Screens
// (2 = Bewegung, 4 = Stopp!-Aufgabe/Blockade, 5 = Schlagen). Screen 3 (Doppelschritt)
// und Screen 6 (3-Runden-Mini-Spiel mit Sterne-Auswertung) sind ABSICHTLICH NICHT Teil
// dieses Grundgerüsts — sie brauchen eine eigene Zähl-/Auswertungslogik, die laut
// `aufwandsschaetzung_mvp_rollout.md` erst mit den echten MVP-Kern-Assets sinnvoll ist.
//
// Verwandlungsmoment (siehe projektwissen.md): zwischen Screen 1 ("Das ist ein Igel")
// und Screen 2 zeigt ein eigener Zwischen-Screen (`Verwandlung`, src/lib/Verwandlung.tsx)
// die Verwandlung des Igels in den Bauern (echte Figur aus src/lib/chessPieces.tsx,
// Cburnett-Set). Ab da erscheint auf dem Brett nur noch der Bauer, nicht mehr der Igel —
// kein Tier-/Figuren-Umschalter danach, wie im Projektwissen festgelegt.
// Vollständige Screen-Texte/-Reihenfolge: siehe SCREEN_SCRIPTS im Web-Prototyp, hier
// um die Verwandlung ergänzt und ab Screen 2 auf den Figurnamen umgestellt.

import { useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST1_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab — Stellung laden/Legalzüge filtern/BoardConfig aufbauen ist
// jetzt eine einzige, von allen sechs Quests gemeinsam genutzte Implementierung, siehe
// dortiger ausführlicher Kommentar.
import { QuestMoveScreen } from "../lib/QuestMoveScreen";
// Schritt 4 der Grundgerüst-Integrationsplan-Liste (priorisierter_umsetzungsplan.md):
// die Spielerfigur AUF DEM BRETT (pieceIcon, siehe MoveScreen unten) nutzt ab jetzt die
// neue Master-Illustration statt des Cburnett-Kontur-Icons.
// Schritt 5 (ebenfalls priorisierter_umsetzungsplan.md): die dunkle Igel-Variante als
// Gegner-/"Besuchsfigur" (opponentIcon, siehe MoveScreen), statt des anonymen grauen
// Punkts in Board.tsx. Nutzt bewusst dieselbe Standardgröße (34px) wie die Spielerfigur
// (pieceIcon) — anfangs auf 28px gesetzt (die frühere Größe des grauen Platzhalter-
// Punkts), aber vom Nutzer beim Testen zu Recht als ungleich groß bemängelt: es ist
// dieselbe Figur nur in Schwarz/Weiß, wie bei einem echten Schachset sollten beide
// gleich groß wirken.
// Schritt 6: Screen 1 ("Das ist ein kleiner Igel"), der Verwandlungsmoment UND
// QuestGeschafft (Screen 7) nutzen jetzt ebenfalls die neue Master-Illustration statt der
// alten Cburnett-/creatures.tsx-SVGs (BauerMasterGrossIcon = derselbe Igel-Master, nur als
// "groß"-Export für Vorstellung/Saga-Karte statt fürs kleine Spielbrett-Feld, siehe
// pieceMasters.tsx) — `chessPieces.tsx`/`creatures.tsx` werden in dieser Datei dadurch gar
// nicht mehr importiert.
import { BauerMasterIcon, BauerMasterDunkelIcon, BauerMasterGrossIcon } from "../lib/pieceMasters";
// Bugfix (Opus-Review, 2026-09-07, Befund 2.1, siehe claude/review_logik_grafik_
// audiofuehrung.md): LuxEckIcon statt des beigen Platzhalter-Kreises (styles.luxHead).
import { LuxEckIcon } from "../lib/luxAssets";
// Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
// audiofuehrung.md): gemeinsamer Sprech-Hook + Untertitel-Flag, siehe Aufrufstellen unten.
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { Verwandlung } from "../lib/Verwandlung";
// Feier-Animation für "Quest abgeschlossen" — analog für Quest2–6 (siehe dortige Dateien).
import { QuestGeschafft } from "../components/QuestGeschafft";
// Nutzer-Feedback 2026-09-07 ("Hier sollte auch ein schöner Hintergrund genutzt werden"):
// gemeinsame Wald-Lichtung-Kulisse für alle Quests, siehe ausführlicher Kommentar in
// WaldHintergrund.tsx.
import { WaldHintergrund } from "../components/WaldHintergrund";
// Befund (Nutzer-Rückfrage 2026-09-07, nach Prüfung der Projekt-Unterlagen): Screen 0
// sprach bereits "Hier siehst du das Spielbrett und alle seine Bewohner", zeigte dazu aber
// nur eine leere Tipp-Fläche — deckt sich mit der in entwicklungsstatus_grundgeruest.md
// dokumentierten, nie umgesetzten Lücke ("einmaliger Einführungs-Screen ... mit leerem
// Brett und allen sechs Tieren im Überblick, noch nicht gebaut"). Siehe ausführlicher
// Kommentar in LeeresBrettMitAllenTieren.tsx für Umfang und bewusste Vereinfachungen.
import { LeeresBrettMitAllenTieren } from "../components/LeeresBrettMitAllenTieren";

type ScreenId = 0 | 1 | "verwandlung" | 2 | 4 | 5 | 7;

// 1:1 aus dem Web-Prototyp übernommen (SCREEN_SCRIPTS), gekürzt auf die hier
// umgesetzten Screens, plus "verwandlung" als neuer Zwischen-Screen. Screen 3/6 fehlen
// bewusst, siehe Kommentar oben. Ab Screen 2 nennt Lux die Figur beim Schachnamen
// ("Bauer"), da die Verwandlung zu diesem Zeitpunkt bereits stattgefunden hat.
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
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Igel wird ein Bauer!"],
  2: ["Der Bauer darf ein Feld nach vorne gehen.", "Tipp auf das leuchtende Feld."],
  4: [
    // Update (2026-09-07, Nutzer-Feedback): einmalig (nur in Quest 1) erklärt Lux vor der
    // ersten Blockade-Aufgabe das allgemeine Prinzip, dass Figuren den Zugweg blockieren
    // können. Ab Quest 2 wird dieses Wissen als bekannt vorausgesetzt, siehe
    // priorisierter_umsetzungsplan.md.
    // Bugfix (Opus-Review, 2026-09-07, Abschnitt 3.3 "Ton und Tempo für Fünfjährige",
    // siehe claude/review_logik_grafik_audiofuehrung.md): die vorherige erste Zeile hatte
    // 24 Wörter plus einen abstrakten Kausalnebensatz ("denn dahinter könnten sich ja
    // weitere Figuren verstecken") — zu lang für ein Kind, das gerade erst zuhört, und für
    // die neue TTS-Anbindung (useLuxSprechzeile unten) ohnehin zu lang für eine einzelne
    // gesprochene Zeile. Aufgeteilt in zwei kurze Sätze, Kausalsatz gestrichen statt in
    // Bildsprache übersetzt (die Blockade selbst ist gleich sichtbar).
    "Manchmal steht eine Figur auf dem Weg.",
    "Dann kommt keine andere Figur daran vorbei.",
    "Der Bauer kann nicht geradeaus über eine andere Figur springen.",
    "Versuch es ruhig einmal aus.",
  ],
  5: ["Eine Figur ist zu Besuch!", "Der Bauer kann sie schräg vorne freundlich begrüßen."],
  7: ["Lux hat ein neues Gebiet entdeckt!", "Wunderbar gemacht."],
};

// Startfeld des Übungs-Bauern in allen Quest1-FENs, sowie das kleine Ausschnittsfenster —
// einzige der sechs Quests, die noch ein Fenster statt des vollen Bretts zeigt (siehe
// QuestMoveScreen.tsx-Kommentar): e/d/f-Linie x Reihen 4-6 (row-4, col-3) — deckt
// Startfeld (row6), Einzel- und Doppelschritt (row5/row4) sowie beide Diagonalfelder
// (row5, col3/col5) ab.
const PIECE_AT: BoardSquare = { row: 6, col: 4 }; // e2
const FENSTER = { rows: 3, cols: 3, rowOffset: 4, colOffset: 3 } as const;

export default function Quest1() {
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
  // audiofuehrung.md): löst den bisherigen advanceLine()-Tap-zum-Aufdecken-Mechanismus
  // (Befund 1.1) ab. Screens ohne eigenen "Tipp irgendwo hin"-Bereich (die Brett-Screens
  // 2/4/5 sowie 7, dessen Tap sofort navigiert statt durch die Zeilen zu blättern) haben
  // sonst keine Möglichkeit, durch mehrzeilige Skripte zu kommen — das übernimmt jetzt das
  // natürliche Sprechende (onFertig unten). Screens 0/1/"verwandlung" behalten ihren
  // bestehenden Tap-Ablauf (advanceOrGo), dort bleibt autoWeiter aus.
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
    await saveQuestFortschrittLocal("quest1", {
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
          audiofuehrung.md): echte Sprechblasen-Optik (Hintergrund/Radius/Schatten/Tail)
          statt freistehendem Text, plus feste Mindesthöhe gegen den Layout-Sprung, den
          unterschiedlich lange Sprechzeilen bisher verursacht haben (das Brett rutschte
          bei jedem Screenwechsel etwas nach unten/oben). Opus-Review Abschnitt 3.1,
          Schritt 6: geschriebener Text jetzt hinter einem echten Eltern-Schalter (siehe
          src/lib/untertitelEinstellung.ts) — Lux spricht die Zeile in jedem Fall
          (useLuxSprechzeile oben). */}
      {zeigeUntertitel && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{lines[lineIndex]}</Text>
        </View>
      )}

      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)}>
          <LeeresBrettMitAllenTieren />
        </Pressable>
      )}

      {screen === 1 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo("verwandlung")}>
          <BauerMasterGrossIcon size={150} />
        </Pressable>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<BauerMasterGrossIcon size={150} />}
          grossGroesse={150}
          // Zielgröße bewusst identisch zur pieceIcon-Standardgröße auf dem Brett (siehe
          // Board.tsx/pieceMasters.tsx) — die Figur rastet exakt in der Größe ein, die sie
          // im nächsten Screen ohnehin hat.
          kleinGroesse={34}
          onDone={() => {
            setLineIndex(0);
            setScreen(2);
          }}
        />
      )}

      {screen === 2 && (
        <QuestMoveScreen
          fen={QUEST1_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          {...FENSTER}
          // Curriculum-Einschränkung: Screen 2 zeigt laut Design nur den Ein-Feld-Schritt,
          // der Doppelschritt ist Screen 3 vorbehalten (hier nicht Teil des Grundgerüsts).
          // chess.js selbst kennt diese Lernpfad-Reihenfolge nicht und liefert bei einem
          // unbewegten Bauern korrekt BEIDE Zielfelder (e3 und e4) — die Filterung auf
          // "ein Feld entfernt" ist bewusste App-Logik, keine Zugregel-Änderung.
          restrictToSingleStep
          pieceIcon={<BauerMasterIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(4);
          }}
        />
      )}

      {screen === 4 && (
        <QuestMoveScreen
          fen={QUEST1_POSITIONS.screen4Blocked}
          pieceAt={PIECE_AT}
          {...FENSTER}
          // Korrektur (Opus-Review, 2026-09-07, Abschnitt 3.2 "Didaktische Progression",
          // siehe claude/review_logik_grafik_audiofuehrung.md): trapAt/blockerAt zeigen
          // jetzt auf e3 (nicht mehr e4) — siehe ausführlicher Kommentar bei
          // chessEngine.ts/QUEST1_POSITIONS.screen4Blocked. Der Bauer hat dadurch KEINEN
          // legalen Zug mehr (weder Einzel- noch Doppelschritt); die einzige Interaktion
          // ist das Antippen der Blockade selbst (onTrapTap unten), was bewusst und
          // vollständig lösbar ist, seit Befund 1.3 (onTrapTap führt zuverlässig weiter)
          // umgesetzt ist.
          trapAt={{ row: 5, col: 4 }} // e3
          blockerAt={{ row: 5, col: 4 }}
          pieceIcon={<BauerMasterIcon />}
          blockerIcon={<BauerMasterIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(5);
          }}
          // Bugfix (Opus-Review Befund 1.3): onTrapTap tat bisher nichts außer der
          // 900ms-Ring-Animation in Board.tsx. Jetzt führt das Ausprobieren des blockierten
          // Feldes genauso zum nächsten Screen wie der korrekte Zug — kurze Verzögerung,
          // damit die Stopp!-Animation noch sichtbar ist, bevor der Screen wechselt.
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
          fen={QUEST1_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          {...FENSTER}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // früher per onlyDiagonal auf das Schlagfeld beschränkt — chess.js liefert hier
          // korrekt auch e3/e4 (der Bauer könnte auch einfach weitergehen), die jetzt
          // ebenfalls angezeigt und akzeptiert werden. Die gesprochene Zeile weist
          // trotzdem gezielt auf das Schlagen hin.
          // Bugfix, siehe Screen 4: die "zu Besuch" angekündigte Figur war bisher
          // unsichtbar auf dem Brett.
          opponentAt={{ row: 5, col: 5 }} // f3
          pieceIcon={<BauerMasterIcon />}
          opponentIcon={<BauerMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("Quest2")}>
          <QuestGeschafft>
            <BauerMasterIcon size={92} />
          </QuestGeschafft>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  // Bugfix (Opus-Review, Befund 2.2): Sprechblase statt freistehendem Text. minHeight
  // schätzt die längste vorkommende Sprechzeile dieser Quest ab (Screen 4, ~3 Zeilen bei
  // schmalen Bildschirmen) — bei Bedarf nach Sichtprüfung auf dem Gerät nachjustierbar.
  sprechblase: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 20,
    marginHorizontal: 8,
    minHeight: 92,
    justifyContent: "center",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  // Kleines, um 45° gedrehtes Quadrat oben links — grobe, aber erkennbare Annäherung an
  // "Sprechblase zeigt zu Lux" (Lux sitzt oben links, siehe luxCorner); Lux' exakte
  // Bildschirmposition variiert je nach Gerät, eine pixelgenaue Ausrichtung ist hier
  // bewusst nicht das Ziel.
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
