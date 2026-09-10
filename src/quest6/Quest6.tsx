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
// Update (2026-09-08, Task #110, "komplette Modernisierung + Demo/Übung", siehe
// claude/vorgemerkt_quest_tempo_und_automatikvorfuehrung.md Punkt 2): Quest 6 war die
// letzte Quest, die noch nicht auf den gemeinsamen Stand von Quest 1-5 gehoben war (siehe
// vorheriger WaldHintergrund-Kommentar "eigener Modernisierungs-Rückstand"). Diese Runde
// gleicht das vollständig an:
// - Die lokale, 5x5-gefensterte `MoveScreen()`-Funktion (samt eigenem chess.js-Handling)
//   ist komplett entfernt — Quest 6 nutzt jetzt wie alle anderen Quests die gemeinsame
//   `QuestMoveScreen` (siehe dortiger Kommentar) auf dem VOLLEN 8x8-Brett. Die
//   QUEST6_POSITIONS-FENs (chessEngine.ts) waren bereits durchgehend in echten
//   Vollbrett-Koordinaten kuratiert (d4/c6/e5/h8 usw.) — das 5x5-Fenster war nur ein
//   Anzeige-Crop, keine inhaltliche Notwendigkeit, entfällt also ersatzlos.
// - HirschIcon (creatures.tsx) / KoenigIcon (chessPieces.tsx) sind durch die
//   KoenigMaster*-Illustrationen (pieceMasters.tsx) ersetzt — dieselbe Umstellung, die
//   Quest 1-5 bereits für ihre Figuren durchlaufen haben. KoenigMasterGrossIcon ist dabei
//   (wie z. B. BauerMasterGrossIcon bei Quest 1) DIESELBE Hirsch-Illustration, nur als
//   "groß"-Export für Screen 1/Verwandlung — die Master-Assets sind nach der Schachfigur
//   benannt, zeigen aber bis zur Verwandlung die jeweilige Waldkreatur.
// - Lux' Auftritt (LuxEckIcon statt des beigen Platzhalter-Kreises `styles.luxHead`),
//   die echte Sprechblasen-Optik statt freistehendem Text, der TTS-Hook
//   (useLuxSprechzeile) und der Eltern-Untertitel-Schalter (useUntertitelAktiv) fehlten
//   hier bisher komplett — Quest 6 sprach bis dahin gar nicht laut, nur Screen 4 zeigte
//   geschriebenen Text. Jetzt identisch zu Quest 1-5 verdrahtet.
// - Das handgeschriebene "Schach!"-Badge (`styles.checkBadge`/`checkBadgeText`) ist
//   ENTFERNT: Board.tsx hat bereits seit dem Opus-Review (Befund 2.6, siehe
//   claude/review_logik_grafik_audiofuehrung.md) ein rein visuelles Bedrohungssignal
//   (BedrohungsPuls + Verbindungslinie zwischen Angreifer und bedrohtem Feld), extra
//   gebaut, um genau dieses geschriebene Badge abzulösen ("Verstoß gegen 'Fachbegriffe
//   werden gesprochen, nie geschrieben'", siehe dortiger Kommentar) — nur wurde Quest6.tsx
//   nie darauf umgestellt. Jetzt übernimmt `zeigeSchach` (QuestMoveScreen-Prop) das.
// - QuestGeschafft (Feier-Animation) ersetzt den beigen `unlockedBlob`-Platzhalter auf
//   Screen 7, analog zu Quest 1-5.
// - Screen 2 nutzt jetzt dieselbe Automatik-Vorführung + Übungsphase (autoDemo,
//   uebungsrunden, onPhaseChange, PHASE_LINES) wie Quest 1-5, siehe dortiger Kommentar in
//   QuestMoveScreen.tsx.
// - Screen 1 nutzt dasselbe "Tier antippen, um die Verwandlung zu sehen"-Muster (LuxAtem-
//   Puls + präzise Sprechzeile + automatisches Weiterblättern zur letzten Zeile) wie
//   Quest 1-5, siehe claude/vorgemerkt_quest_tempo_und_automatikvorfuehrung.md Punkt 3.
//
// Update (2026-09-09, Sprechblasen-Rollout, siehe claude/sprechblasen_gestaltungskonzept.md
// Abschnitt 5): die neuere, teiltransparente, einteilige SVG-Sprechblase (LuxSprechblase.tsx)
// ist inzwischen vom Nutzer am Gerät bestätigt und hier — wie in Quest 2-5 — nachgezogen.
// Löst die vorherige Box+Schweif-Kombination ab, siehe Aufrufstelle unten.

import { useRef, useState } from "react";
import { View, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST6_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): Quest 6 nutzte bisher als einzige Quest
// noch eine eigene lokale MoveScreen()-Funktion (siehe Datei-Kommentar oben, Task #110) —
// jetzt dieselbe gemeinsame Implementierung wie Quest 1-5.
import { QuestMoveScreen, type QuestPhase } from "../lib/QuestMoveScreen";
// Update (2026-09-08, Task #110, siehe Datei-Kommentar oben): löst HirschIcon
// (creatures.tsx) und KoenigIcon (chessPieces.tsx) ab. SpringerMasterDunkelIcon für die
// angreifende/besuchende gegnerische Figur (Screen 4/5) — dieselbe "Springer als
// Angreifer"-Wahl wie in QUEST6_POSITIONS (chessEngine.ts) begründet, ein Springer bedroht
// den König aus kurzer Distanz, bei einer Linienfigur läge sie weit außerhalb jedes
// sinnvollen Anzeigebereichs.
import { KoenigMasterIcon, KoenigMasterGrossIcon, SpringerMasterDunkelIcon } from "../lib/pieceMasters";
// Bugfix (Opus-Review, 2026-09-07, Befund 2.1, siehe claude/review_logik_grafik_
// audiofuehrung.md): LuxEckIcon statt des beigen Platzhalter-Kreises (styles.luxHead) —
// wie bei checkBadge (siehe Datei-Kommentar oben) war Quest 6 hier bisher nicht auf den
// Stand von Quest 1-5 gehoben. LuxAtem für den antippbaren Hirsch auf Screen 1, siehe
// dortige Aufrufstelle.
import { LuxEckIcon, LuxAtem } from "../lib/luxAssets";
// Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
// audiofuehrung.md): gemeinsamer Sprech-Hook + Untertitel-Flag, siehe Aufrufstellen unten.
// Quest 6 sprach bis Task #110 gar nicht laut (siehe Datei-Kommentar oben) — jetzt
// identisch zu Quest 1-5 verdrahtet.
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
// Sprach-Harmonie-Review (2026-09-09, siehe lib/luxVarianten.ts für die volle
// Begründung): die "uebung"/"fertig"-Zeilen sind über alle sechs Waldabenteuer
// wortidentisch und rotieren jetzt durch mehrere kindgerechte Varianten. Die
// "interaktiv"-Hinweiszeile hat hier eine eigene, an den König angepasste Formulierung
// ("... direkt neben ihm", siehe PHASE_LINES unten) — deshalb ein eigener, lokaler Pool
// (INTERAKTIV_HINWEIS_VARIANTEN unten) statt des generischen Imports, aber mit demselben
// globalen Rotations-Schlüssel wie die anderen fünf Abenteuer.
import { luxVariante, UEBUNG_HINWEIS_VARIANTEN, FERTIG_LOB_VARIANTEN } from "../lib/luxVarianten";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { Verwandlung } from "../lib/Verwandlung";
// Feier-Animation für "Quest abgeschlossen" — löst den beigen unlockedBlob-Platzhalter ab,
// siehe Datei-Kommentar oben.
import { QuestGeschafft } from "../components/QuestGeschafft";
// Nutzer-Feedback 2026-09-07 ("Hier sollte auch ein schöner Hintergrund genutzt werden"):
// gemeinsame Wald-Lichtung-Kulisse für alle Quests, siehe ausführlicher Kommentar in
// WaldHintergrund.tsx.
import { WaldHintergrund } from "../components/WaldHintergrund";
// Sprechblasen-Rollout (2026-09-09, siehe claude/sprechblasen_gestaltungskonzept.md,
// Abschnitt 5): löst die bisherige, hier lokal gebaute Box+Schweif-Kombination ab —
// dieselbe Umstellung, die Quest1.tsx bereits durchlaufen hat, jetzt vom Nutzer am Gerät
// bestätigt und auf Quest 2-6 ausgerollt.
import { LuxSprechblase } from "../components/LuxSprechblase";

type ScreenId = 0 | 1 | "verwandlung" | 2 | 4 | 5 | 7;

// Update (2026-09-08, Task #110, siehe Datei-Kommentar oben): Screen 2 hat ab jetzt KEINEN
// eigenen Eintrag mehr hier — seine Zeilen sind phasenabhängig, siehe PHASE_LINES unten.
const SCREEN_SCRIPTS: Record<Exclude<ScreenId, 2>, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt der Wichtigste von allen.",
    "Tipp weiter, um ihn kennenzulernen.",
  ],
  1: [
    "Hallo! Ich bin's wieder, Lux.",
    "Das ist ein Hirsch.",
    // Update (2026-09-08, Task #110, siehe claude/vorgemerkt_quest_tempo_und_
    // automatikvorfuehrung.md Punkt 3): löst "Tipp irgendwo hin, um weiterzumachen" ab —
    // fordert jetzt konkret dazu auf, GENAU den (jetzt sichtbar pulsierenden) Hirsch
    // anzutippen, siehe Screen-1-Aufrufstelle unten.
    "Tippe den Hirsch an, um die Verwandlung zur Schachfigur zu sehen.",
  ],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Hirsch wird ein König!"],
  4: ["Achtung, Schach! Der König ist in Gefahr.", "Tipp auf ein sicheres Feld, um ihm zu helfen."],
  5: ["Steht eine Figur direkt daneben, kann der König sie freundlich begrüßen.", "Tipp hin."],
  // Update (2026-09-08, siehe RootNavigator/Quest1–5-Kommentare zum selben Datum): zweite
  // Zeile jetzt konsistent mit Quest1–5 — nennt explizit das Antippen und wohin es führt
  // (zurück zur Karte). Die Navigation selbst war hier schon immer "KidHome" (siehe unten).
  7: ["Du kennst jetzt den König, und alle sechs Figuren!", "Wunderbar gemacht! Tippe, um zurück zur Karte zu gehen."],
};

// Neu (2026-09-08, Task #110, siehe Kommentar bei SCREEN_SCRIPTS oben und Quest1.tsx):
// Screen 2s Zeilen sind jetzt an die von QuestMoveScreen gemeldete QuestPhase gekoppelt.
const PHASE_LINES: Record<QuestPhase, string[]> = {
  vorfuehrung: [
    "Der König zieht in jede Richtung, aber immer nur ein einziges Feld weit.",
    "Schau mal, so zieht der König!",
  ],
  interaktiv: ["Jetzt bist du dran!", "Tipp auf ein leuchtendes Feld direkt neben ihm."],
  uebung: ["Kannst du das noch ein paar Mal?"],
  fertig: ["Super, das kannst du schon richtig gut!"],
};

// Sprach-Harmonie-Review (2026-09-09, siehe Import-Kommentar oben und lib/luxVarianten.ts):
// eigener Varianten-Pool für die "interaktiv"-Hinweiszeile, da Quest 6 hier abweichend
// "... direkt neben ihm" statt der generischen Formulierung der anderen fünf Abenteuer
// sagt (der König hat nur die acht Nachbarfelder, "irgendein leuchtendes Feld" wäre hier
// weniger präzise). Derselbe Schlüssel "interaktiv-hinweis" wie in Quest1–5 sorgt trotzdem
// für einen gemeinsam fortlaufenden Rotations-Fortschritt über alle sechs Abenteuer.
const INTERAKTIV_HINWEIS_VARIANTEN = [
  "Tipp auf ein leuchtendes Feld direkt neben ihm.",
  "Schau, wo es leuchtet. Genau neben ihm.",
  "Trau dich, tipp auf das leuchtende Feld neben ihm!",
];

// Startfeld des Königs in allen Quest6-FENs (siehe chessEngine.ts/QUEST6_POSITIONS) —
// bereits echte Vollbrett-Koordinaten, das frühere 5x5-Anzeigefenster (rowOffset 2,
// colOffset 1) entfällt seit Task #110 ersatzlos (siehe Datei-Kommentar oben).
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

export default function Quest6() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  // Neu (2026-09-08, Task #110, siehe PHASE_LINES-Kommentar oben und Quest1.tsx): nur für
  // Screen 2 relevant, treibt dort, welche Zeilen gerade angezeigt/gesprochen werden.
  const [movePhase, setMovePhase] = useState<QuestPhase>("vorfuehrung");

  // Screen 2 hat keinen eigenen SCREEN_SCRIPTS-Eintrag mehr (siehe dortiger Kommentar) —
  // seine Zeilen kommen stattdessen aus PHASE_LINES, abhängig von movePhase.
  const lines = screen === 2 ? PHASE_LINES[movePhase] : SCREEN_SCRIPTS[screen];
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
  // advanceLine()-Mechanismus (Befund 1.1) ab. Neu für Quest 6 seit Task #110 (vorher gab
  // es hier gar keinen TTS-/Auto-Advance-Mechanismus, siehe Datei-Kommentar oben).
  //
  // Screen 1 blättert von selbst durch seine Zeilen, sobald Lux sie fertig gesprochen hat
  // (siehe claude/vorgemerkt_quest_tempo_und_automatikvorfuehrung.md Punkt 3); `isLastLine`
  // sorgt dafür, dass die letzte Zeile ("Tippe den Hirsch an...") tap-gesteuert bleibt.
  // Screen 0 bleibt bewusst ausgenommen (ganzflächig tap-gesteuert, wie bei Quest 2-5).
  const autoWeiter = screen !== 0 && screen !== "verwandlung";
  // Der TTS-Hook erkennt an einem geänderten Key, dass eine neue Zeile gesprochen werden
  // muss. Für Screen 2 reicht `${screen}-${lineIndex}` allein nicht mehr aus, siehe
  // Quest1.tsx-Kommentar zur identischen Verdrahtung.
  // Sprach-Harmonie-Review (2026-09-09, siehe lib/luxVarianten.ts): genau die drei
  // Stellen, an denen Screen 2 sonst wortidentisch zu den anderen fünf Abenteuern wäre
  // UND die bei einer 8-Sekunden-Erinnerung (kein onFertig, da jeweils letzte Zeile
  // ihrer Phase) sonst identisch wiederholt würden, bekommen hier eine rotierende
  // Variante statt der festen PHASE_LINES-Zeile.
  const zeileZuSprechen =
    screen === 2 && movePhase === "uebung"
      ? () => luxVariante(UEBUNG_HINWEIS_VARIANTEN, "uebung-hinweis")
      : screen === 2 && movePhase === "interaktiv" && isLastLine
        ? () => luxVariante(INTERAKTIV_HINWEIS_VARIANTEN, "interaktiv-hinweis")
        : screen === 2 && movePhase === "fertig"
          ? () => luxVariante(FERTIG_LOB_VARIANTEN, "fertig-lob")
          : lines[lineIndex];
  // Sprechblasen-Rollout (2026-09-09): einmal berechnet statt an zwei Stellen dupliziert —
  // auch an LuxSprechblase weitergereicht, siehe identische Verdrahtung in Quest1.tsx.
  const zeilenSchluessel = screen === 2 ? `2-${movePhase}-${lineIndex}` : `${screen}-${lineIndex}`;
  // Sterne-Logik "Eigenständigkeit zählt" (Nutzerentscheidung 2026-09-09, siehe
  // Claude-Projekt "ChessLynx", aktueller_projektstand_2026-09-09.md): zählt über die
  // gesamte Quest hinweg, wie oft Lux' 8-Sekunden-Erinnerung (useLuxSprechzeile.ts)
  // tatsächlich einspringen musste — kein Fehlerzähler, sondern ein Signal für
  // eigenständiges Drankleiben vs. Nachhelfen-müssen. Bewusst ein Ref statt State: die
  // Zählung soll den Verlauf nicht rerendern, sie wird erst bei handleQuestComplete
  // ausgelesen.
  const erinnerungenRef = useRef(0);
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    zeilenSchluessel,
    zeileZuSprechen,
    autoWeiter && !isLastLine ? () => setLineIndex((i) => i + 1) : undefined,
    { onErinnerung: () => { erinnerungenRef.current += 1; } }
  );
  // Echter Eltern-Dashboard-Schalter statt der früheren ZEIGE_UNTERTITEL-Konstante,
  // siehe src/lib/untertitelEinstellung.ts.
  const zeigeUntertitel = useUntertitelAktiv();

  async function handleQuestComplete() {
    // 0 Erinnerungen → 3 Sterne (ganz eigenständig), 1-2 → 2 Sterne, ab 3 → 1 Stern.
    const sterne: 0 | 1 | 2 | 3 =
      erinnerungenRef.current === 0 ? 3 : erinnerungenRef.current <= 2 ? 2 : 1;
    await saveQuestFortschrittLocal("quest6", { sterne, abgeschlossen: true, letzterSchritt: "screen7" });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund variante={6} />
      <Pressable
        style={styles.luxCorner}
        onPress={wiederholen}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {/* Sprechblasen-Rollout (2026-09-09, siehe claude/sprechblasen_gestaltungskonzept.md):
          echte, einteilige SVG-Sprechblase statt der früheren Box+Schweif-Kombination —
          siehe LuxSprechblase.tsx für die volle Begründung. Abschnitt 3.1, Schritt 6: Text
          jetzt hinter einem echten Eltern-Schalter (siehe src/lib/untertitelEinstellung.ts). */}
      {zeigeUntertitel && (
        <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={zeilenSchluessel} style={styles.sprechblase} />
      )}

      {screen === 0 && <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)} />}
      {screen === 1 && (
        // Update (2026-09-08, Task #110, siehe Quest1.tsx-Kommentar zum identischen
        // Muster): Pressable jetzt direkt am Hirsch-Icon (großzügiger hitSlop), LuxAtem
        // lässt ihn sichtbar pulsieren, disabled={!isLastLine} sperrt Taps, bis die letzte
        // Zeile ("Tippe den Hirsch an...") gezeigt wird.
        <View style={styles.tapArea}>
          <Pressable
            onPress={() => advanceOrGo("verwandlung")}
            disabled={!isLastLine}
            hitSlop={{ top: 24, left: 24, right: 24, bottom: 24 }}
            accessibilityLabel="Den Hirsch antippen, um die Verwandlung zu sehen"
          >
            <LuxAtem dauer={900} betrag={1.08}>
              <KoenigMasterGrossIcon size={150} />
            </LuxAtem>
          </Pressable>
        </View>
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
          // Neu (2026-09-08, Task #110, siehe Quest1.tsx): erst Automatik-Vorführung, dann
          // eigener Zug, dann fünf Übungsrunden, bevor onSolved() greift.
          autoDemo
          uebungsrunden={5}
          onPhaseChange={(neu) => {
            setMovePhase(neu);
            setLineIndex(0);
          }}
          onSolved={() => {
            setLineIndex(0);
            setScreen(4);
          }}
        />
      )}

      {screen === 4 && (
        <QuestMoveScreen
          fen={QUEST6_POSITIONS.screen4Check}
          pieceAt={PIECE_AT}
          // Bugfix (2026-09-09, Nutzer-Feedback nach Gerätetest: "Ab Screen Schach ist er
          // ein roter Punkt und nicht mehr als Figur sichtbar"): pieceIcon fehlte hier —
          // Board.tsx fällt ohne pieceIcon automatisch auf den Platzhalter-Punkt
          // (styles.pieceDot) zurück, siehe dortiger Kommentar. Screen 2 hatte die Prop
          // bereits (Zeile oben), Screen 4/5 nicht.
          pieceIcon={<KoenigMasterIcon />}
          // Echtes Schach statt Blockade (siehe Datei-Kommentar oben) — zeigeSchach lässt
          // QuestMoveScreen bedrohtAt/angreiferAt an Board.tsx durchreichen, das daraus
          // das rein visuelle BedrohungsPuls-Signal baut (siehe Board.tsx-Kommentar zu
          // Befund 2.6) — ersetzt das frühere geschriebene "Schach!"-Badge vollständig.
          zeigeSchach
          // e5 bleibt trotz Wegzug-Möglichkeiten weiterhin vom Springer auf c6 bedroht
          // (siehe chessEngine.ts/QUEST6_POSITIONS.screen4Check-Kommentar) — chess.js
          // filtert e5 deshalb bereits selbst aus den Legalzügen heraus, trapAt macht das
          // Feld hier trotzdem antippbar, um genau diese "das bleibt gefährlich"-Lektion
          // zu zeigen (Stopp!-Ring-Animation in Board.tsx).
          trapAt={{ row: 3, col: 4 }} // e5
          // Bewusst KEIN onTrapTap hier (anders als bei den Stopp!-Aufgaben in Quest 2/3/5,
          // wo das Antippen der Blockade als gleichwertiger, weiterführender Lösungsweg
          // gilt, siehe dortige onTrapTap-Kommentare): e5 löst das Schach NICHT auf — ein
          // Tap darauf zeigt nur die Warn-Animation, führt aber absichtlich NICHT zum
          // nächsten Screen, damit das Kind lernt, dass diese Option hier tatsächlich
          // ungültig bleibt (im Gegensatz zur "Figur steht nur im Weg"-Situation).
          opponentAt={{ row: 2, col: 2 }} // c6 — der bedrohende Springer
          opponentIcon={<SpringerMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(5);
          }}
        />
      )}

      {screen === 5 && (
        <QuestMoveScreen
          fen={QUEST6_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          // Bugfix (2026-09-09, siehe Screen-4-Kommentar oben): pieceIcon fehlte auch hier.
          pieceIcon={<KoenigMasterIcon />}
          // Kein Schach hier (siehe chessEngine.ts/QUEST6_POSITIONS.screen5Capture-
          // Kommentar) — ganz normales Schlagen wie bei jeder anderen Figur auch, deshalb
          // ohne zeigeSchach/trapAt.
          opponentAt={{ row: 3, col: 4 }} // e5
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
  // Sprechblasen-Rollout (2026-09-09): nur noch reine Positionierung, siehe Quest1.tsx.
  sprechblase: {
    position: "absolute",
    top: 20,
    left: 92,
    right: 16,
    maxHeight: 170,
    zIndex: 15,
  },
  tapArea: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center" },
});
