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

import { useRef, useState } from "react";
import { View, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { Einschweben } from "../components/Einschweben";
import { useNavigation } from "@react-navigation/native";
import { QUEST2_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, siehe ausführlicher Kommentar in QuestMoveScreen.tsx.
// Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
// automatikvorfuehrung.md Punkt 2 + claude/quest_review_automatik_vollbrett_vorschlag.md
// Abschnitt 3): QuestPhase-Typ mitimportiert, für dieselbe Automatik-Vorführung +
// Übungsphase auf Screen 2, die Quest 1 bereits nutzt (siehe dortiger Kommentar in
// QuestMoveScreen.tsx).
import { QuestMoveScreen, type QuestPhase } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon), Gegner-/
// "Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Bär/Turm-Master-
// Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs.
import { TurmMasterIcon, TurmMasterDunkelIcon, TurmMasterGrossIcon } from "../lib/pieceMasters";
// Lebendiges Quest-Tier für Screen 1 und den Verwandlungsmoment (2026-09-12, siehe
// src/lib/questTiere.tsx): vor der Verwandlung zeigt die App das Tier, danach die Figur.
import { QuestTierIcon } from "../lib/questTiere";
// Bugfix (Opus-Review, 2026-09-07, Befund 2.1, siehe claude/review_logik_grafik_
// audiofuehrung.md): LuxEckIcon statt des beigen Platzhalter-Kreises (styles.luxHead).
// LuxAtem (Update 2026-09-08, Task #109, siehe Screen-1-Aufrufstelle unten): dasselbe
// Puls-Muster, das für Quest 1s Igel bereits eingeführt wurde (siehe luxAssets.tsx),
// jetzt auch für den antippbaren Bären hier.
import { LuxEckIcon, LuxAtem } from "../lib/luxAssets";
// Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
// audiofuehrung.md): gemeinsamer Sprech-Hook + Untertitel-Flag, siehe Aufrufstellen unten.
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
// Sprach-Harmonie-Review (2026-09-09, siehe lib/luxVarianten.ts für die volle
// Begründung): die drei über alle sechs Waldabenteuer wortidentischen PHASE_LINES-Zeilen
// unten (interaktiv/uebung/fertig) rotieren jetzt durch mehrere kindgerechte Varianten,
// statt bei jeder 8-Sekunden-Erinnerung bzw. in jedem Abenteuer identisch zu klingen.
import { luxVariante, INTERAKTIV_HINWEIS_VARIANTEN, UEBUNG_HINWEIS_VARIANTEN, FERTIG_LOB_VARIANTEN } from "../lib/luxVarianten";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { Verwandlung } from "../lib/Verwandlung";
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

// Update (2026-09-08, Task #109, siehe claude/quest_review_automatik_vollbrett_
// vorschlag.md Abschnitt 5 und Quest1.tsx-Kommentar): Screen 2 hat ab jetzt KEINEN
// eigenen Eintrag mehr hier — seine Zeilen sind phasenabhängig (Vorführung/Interaktiv/
// Übung/Fertig) und stehen stattdessen in PHASE_LINES weiter unten, exakt wie in Quest 1.
const SCREEN_SCRIPTS: Record<Exclude<ScreenId, 2>, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt ein neuer Freund.",
    // Gerätetest 2026-09-11 (Nutzerwunsch): die Vorstellung läuft bis zur Verwandlung von
    // selbst — getippt wird nur noch auf das Tier, nach Lux' Aufforderung. Deshalb keine
    // "Tipp weiter"-Aufforderung mehr.
    "Komm, wir lernen ihn kennen!",
  ],
  // Update (2026-09-10, Kurztest-Feedback: die Wiederholungszeile "Hallo! Ich bin's
  // wieder, Lux." wirkte deplatziert, da Lux sich bereits in der WillkommensSequenz
  // vorgestellt hat und seitdem durchgehend spricht — ersatzlos gestrichen, siehe
  // claude/entscheidungslog.md.
  1: [
    "Das ist ein Bär.",
    // Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
    // automatikvorfuehrung.md Punkt 3, "auch für die restlichen Figuren vormerken"): löst
    // das vorherige, unspezifische "Tipp irgendwo hin, um weiterzumachen" ab — genau wie
    // bei Quest 1s Igel fordert die letzte Zeile jetzt konkret dazu auf, GENAU den Bären
    // anzutippen (der jetzt auch sichtbar pulsiert, siehe Screen-1-Aufrufstelle unten),
    // statt vage irgendwohin zu tippen.
    "Tippe den Bären an, um die Verwandlung zur Schachfigur zu sehen.",
  ],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Bären wird ein Turm!"],
  4: [
    "Da steht jemand mitten auf dem Weg.",
    "Der Turm kann nicht darüber hinwegziehen.",
    "Er darf aber trotzdem zur Seite ziehen.",
  ],
  // Update (2026-09-10, Kurztest-Feedback, siehe Quest1.tsx-Kommentar zur selben
  // Formulierungsänderung): "freundlich begrüßen" ersetzt durch "einfangen".
  // Paket 1 (2026-09-11, Entscheidungslog): "schlagen" wird in Quest 1 per Brückenzeile
  // eingeführt und ab hier durchgängig verwendet — kein "begrüßen", kein "einfangen" mehr.
  5: ["Am Ende des Weges ist eine gegnerische Figur aufgetaucht.", "Schlag sie – zieh einfach dorthin!"],
  // Update (2026-09-08, siehe Kommentar an der screen===7-Stelle unten): zweite Zeile nennt
  // jetzt explizit das Antippen und wohin es führt (Karte statt nächste Quest).
  // Paket 1 (2026-09-11, Audit C.2): Ich-/Wir-Perspektive statt Lux in der dritten Person.
  7: ["Wir haben ein neues Gebiet entdeckt!", "Wunderbar gemacht! Tippe, um zurück zur Karte zu gehen."],
};

// Neu (2026-09-08, Task #109, siehe Kommentar bei SCREEN_SCRIPTS oben und Quest1.tsx):
// Screen 2s Zeilen sind jetzt an die von QuestMoveScreen gemeldete QuestPhase gekoppelt,
// exakt nach demselben Schema wie Quest 1 — nur die erste (einmalige "jetzt siehst du das
// ganze Brett"-Erklärung, ab Quest 3 als bekannt vorausgesetzt) und die zweite Zeile
// (Turm-spezifische Zugregel) unterscheiden sich inhaltlich von den anderen Quests.
const PHASE_LINES: Record<QuestPhase, string[]> = {
  vorfuehrung: [
    // Update (2026-09-07, Nutzer-Feedback): ab Quest 2 zeigt das Brett erstmals alle 64
    // Felder auf einmal (vorher kleines Ausschnittsfenster) — Lux erklärt das hier
    // einmalig, ab Quest 3 wird es als bekannt vorausgesetzt.
    "Ab jetzt siehst du das ganze Schachbrett.",
    "So siehst du immer alle Möglichkeiten auf einmal.",
    "Der Turm darf so weit ziehen, wie der Weg frei ist.",
    "Schau mal, so zieht der Turm!",
  ],
  interaktiv: ["Jetzt bist du dran!", "Tipp auf ein leuchtendes Feld."],
  uebung: ["Kannst du das noch ein paar Mal?"],
  fertig: ["Super, das kannst du schon richtig gut!"],
};

// Startfeld des Turms in allen Quest2-FENs.
const PIECE_AT: BoardSquare = { row: 7, col: 0 }; // a1

export default function Quest2() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  // Neu (2026-09-08, Task #109, siehe PHASE_LINES-Kommentar oben und Quest1.tsx): nur für
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
  // advanceLine()-Mechanismus (Befund 1.1) ab.
  //
  // Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
  // automatikvorfuehrung.md Punkt 3): Screen 1 ist hier nicht mehr ausgenommen — genau wie
  // in Quest1.tsx blättert Screen 1 jetzt von selbst durch seine Zeilen, sobald Lux sie
  // fertig gesprochen hat, und `isLastLine` sorgt weiterhin dafür, dass die letzte Zeile
  // ("Tippe den Bären an...") tap-gesteuert bleibt — genau dort muss ja tatsächlich der Bär
  // angetippt werden (siehe disabled={!isLastLine} an dessen Pressable weiter unten).
  // Screen 0 bleibt bewusst ausgenommen (unverändert wie bisher, nicht Teil dieses Tasks).
  // Gerätetest 2026-09-11 (Nutzerwunsch "die Vorstellung bis zur Verwandlung sollte
  // automatisch laufen"): Screen 0 ist nicht mehr ausgenommen — er blättert von selbst durch
  // und geht nach seiner letzten Zeile ohne Antippen zu Screen 1 (siehe screen0Weiter).
  const autoWeiter = screen !== "verwandlung";
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
  // auch an LuxSprechblase weitergereicht, damit deren Pop-in-Animation bei jedem
  // Zeilenwechsel exakt synchron zu dem läuft, was Lux gerade (wieder) ausspricht (siehe
  // identische Verdrahtung in Quest1.tsx).
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
    autoWeiter && !isLastLine
      ? () => setLineIndex((i) => i + 1)
      : screen === 0 && isLastLine
        ? () => setTimeout(() => advanceOrGo(1), 700)
        : undefined,
    { onErinnerung: () => { erinnerungenRef.current += 1; } }
  );
  // Echter Eltern-Dashboard-Schalter statt der früheren ZEIGE_UNTERTITEL-Konstante,
  // siehe src/lib/untertitelEinstellung.ts.
  const zeigeUntertitel = useUntertitelAktiv();

  async function handleQuestComplete() {
    // 0 Erinnerungen → 3 Sterne (ganz eigenständig), 1-2 → 2 Sterne, ab 3 → 1 Stern.
    const sterne: 0 | 1 | 2 | 3 =
      erinnerungenRef.current === 0 ? 3 : erinnerungenRef.current <= 2 ? 2 : 1;
    await saveQuestFortschrittLocal("quest2", {
      sterne,
      abgeschlossen: true,
      letzterSchritt: "screen7",
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund variante={2} />
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

      {/* Screen 0 läuft seit dem Gerätetest 2026-09-11 von selbst weiter (kein Tipp-Bereich mehr). */}
      {screen === 0 && (
        <View style={styles.tapArea}>
          <Einschweben sichtbar={lineIndex >= 1}>
            <QuestTierIcon quest="quest2" size={150} />
          </Einschweben>
        </View>
      )}
      {screen === 1 && (
        // Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
        // automatikvorfuehrung.md Punkt 3 und Quest1.tsx-Kommentar zum identischen Muster):
        // der Pressable sitzt jetzt direkt am Bären-Icon (mit großzügigem hitSlop für
        // kleine Kinderfinger), nicht mehr am ganzen Screen — `styles.tapArea` dient nur
        // noch der Zentrierung. LuxAtem lässt den Bären spürbar schneller/stärker
        // pulsieren (900ms/1.08) als Lux' eigene, dezente Ambient-Animation (2400ms/1.03).
        // disabled={!isLastLine}: solange noch nicht die letzte Zeile ("Tippe den Bären
        // an...") gezeigt wird, nimmt der Bär keine Taps an — dieselbe Absicherung wie in
        // Quest1.tsx.
        <View style={styles.tapArea}>
          <Pressable
            onPress={() => advanceOrGo("verwandlung")}
            disabled={!isLastLine}
            hitSlop={{ top: 24, left: 24, right: 24, bottom: 24 }}
            accessibilityLabel="Den Bären antippen, um die Verwandlung zu sehen"
          >
            <LuxAtem dauer={900} betrag={1.08}>
              <QuestTierIcon quest="quest2" size={150} />
            </LuxAtem>
          </Pressable>
        </View>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<TurmMasterGrossIcon size={150} />}
          tier={<QuestTierIcon quest="quest2" size={150} />}
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
          // Neu (2026-09-08, Task #109, siehe PHASE_LINES-Kommentar oben und Quest1.tsx):
          // erst Automatik-Vorführung, dann eigener Zug, dann fünf Übungsrunden mit
          // Sammel-Marker, bevor onSolved() greift — exakt dieselbe Verdrahtung wie bei
          // Quest 1 Screen 2.
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
        // Update (2026-09-08, Nutzerwunsch "nach jedem Quest zu dieser Karte zurückgekehrt,
        // nicht die Quests nacheinander einfach durchgeklickt werden"): das frühere Verhalten
        // hier (direkt zu Quest3 weiter, siehe der alte "Bugfix Opus-Review Befund 1.8"-
        // Kommentar, den dieser Update-Kommentar ersetzt) war genau die jetzt unerwünschte
        // Durchklick-Kette — bewusst zurück zum Luchs-Revier (KidHome, siehe
        // components/LuchsRevierKarte.tsx), analog zu Quest1 und Quest6.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("KidHome")}>
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
  // Sprechblasen-Rollout (2026-09-09): nur noch reine Positionierung (fest rechts neben
  // luxCorner verankert, wie in Quest1.tsx) — Füllung/Rand/Verlauf/Schatten/Schweif
  // zeichnet jetzt LuxSprechblase selbst als eine einzige zusammenhängende SVG-Kontur.
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
