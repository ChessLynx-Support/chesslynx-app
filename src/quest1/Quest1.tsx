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

import { useRef, useState } from "react";
// `Text` wird seit der Sprechblasen-Neugestaltung nicht mehr direkt hier gebraucht (siehe
// LuxSprechblase.tsx, rendert den Sprechzeilen-Text jetzt selbst). `Animated`/`useEffect`/
// `useRef` wurden nur noch von der jetzt entfernten Screen-0-Kartenüberblendung gebraucht
// (siehe ScreenId-Kommentar oben) — kein Bedarf mehr in dieser Datei.
import { View, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { QUEST1_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab — Stellung laden/Legalzüge filtern/BoardConfig aufbauen ist
// jetzt eine einzige, von allen sechs Quests gemeinsam genutzte Implementierung, siehe
// dortiger ausführlicher Kommentar.
import { QuestMoveScreen, type QuestPhase } from "../lib/QuestMoveScreen";
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
// LuxAtem (Update 2026-09-08, siehe Screen-1-Kommentar unten): dasselbe Puls-Muster, das
// Lux bereits idle "atmen" lässt, jetzt auch für den antippbaren Igel auf Screen 1 genutzt.
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
// Feier-Animation für "Quest abgeschlossen" — analog für Quest2–6 (siehe dortige Dateien).
import { QuestGeschafft } from "../components/QuestGeschafft";
// Nutzer-Feedback 2026-09-07 ("Hier sollte auch ein schöner Hintergrund genutzt werden"):
// gemeinsame Wald-Lichtung-Kulisse für alle Quests, siehe ausführlicher Kommentar in
// WaldHintergrund.tsx.
import { WaldHintergrund } from "../components/WaldHintergrund";
// Sprechblasen-Neugestaltung (2026-09-09, siehe claude/sprechblasen_gestaltungskonzept.md,
// Vorschlag B+C+D+E): löst die bisherige, hier lokal gebaute Box+Schweif-Kombination ab.
import { LuxSprechblase } from "../components/LuxSprechblase";
// Update (2026-09-09, Bau der echten Willkommens-Sequenz, siehe Claude-Projekt "ChessLynx",
// konzept_screen0_verschmelzung_appstart.md Abschnitt 3, "Was mit Quest 1 selbst
// passiert"): Screen 0 (die bisherige Tier-Vorstellung auf dem leeren Brett, siehe
// Git-Historie dieser Datei für den vollen bisherigen Kommentar dazu) entfällt ab jetzt
// ERSATZLOS. Begründung: die neue `screens/WillkommensSequenz.tsx` (ersetzt
// `Onboarding.tsx` als Ziel von `LadeBildschirm`, läuft VOR jedem Antippen eines
// Quest-Markers) übernimmt exakt diese Aufgabe bereits — deutlich ausgebaut (Tiere
// erscheinen einzeln mit eigener Auftritts-Animation, verstecken sich anschließend
// choreografiert im Wald) — und geht ihr sogar noch voraus ("die Tiere haben sich schon
// versteckt"). Die Tiere beim ersten Antippen des Igel-Markers NOCHMAL vorzustellen wäre
// derselbe Doppler-Fehler (siehe Konzept Abschnitt 1), nur eine Ebene tiefer verschoben.
// Wer den Igel-Marker auf der Karte antippt, springt jetzt direkt zu dem, was bisher
// Screen 1 war ("Das ist ein kleiner Igel. Tippe den Igel an, ...").
type ScreenId = 1 | "verwandlung" | 2 | 4 | 5 | 7;

// 1:1 aus dem Web-Prototyp übernommen (SCREEN_SCRIPTS), gekürzt auf die hier
// umgesetzten Screens, plus "verwandlung" als neuer Zwischen-Screen. Screen 3/6 fehlen
// bewusst, siehe Kommentar oben. Ab Screen 2 nennt Lux die Figur beim Schachnamen
// ("Bauer"), da die Verwandlung zu diesem Zeitpunkt bereits stattgefunden hat.
//
// Update (2026-09-08, siehe claude/quest_review_automatik_vollbrett_vorschlag.md
// Abschnitt 5): Screen 2 ("Bewegung entdecken") hat KEINEN eigenen Eintrag mehr hier —
// seine Zeilen sind phasenabhängig (Vorführung/Interaktiv/Übung/Fertig) und stehen
// stattdessen in PHASE_LINES weiter unten, siehe dortiger Kommentar.
//
// Update (2026-09-09, siehe Kommentar bei ScreenId oben): der bisherige Screen 0 (Tier-
// Vorstellung auf dem leeren Brett) ist ersatzlos entfallen — diese Aufgabe übernimmt jetzt
// vollständig `screens/WillkommensSequenz.tsx`, die VOR jedem Antippen eines Quest-Markers
// läuft.
const SCREEN_SCRIPTS: Record<Exclude<ScreenId, 2>, string[]> = {
  1: [
    // Update (2026-09-09, siehe ScreenId-Kommentar oben): "Lux hat sich in Screen 0 bereits
    // gemeldet" gilt jetzt entsprechend für die neue WillkommensSequenz.tsx, die diesem
    // Screen unmittelbar vorausgeht (bei jedem App-Start, nicht mehr nur einmalig hier) —
    // eine erneute Begrüßung wäre weiterhin überflüssig, siehe dortiger Datei-Kopfkommentar
    // zur Doppler-Vermeidung.
    "Das ist ein kleiner Igel.",
    // Bugfix (Nutzer-Feedback 2026-09-08, "ergibt keinen Sinn"): "Tipp irgendwo hin" war
    // unnötig vage für ein Kind, das gerade erst lernt, wie diese Tipp-Interaktion
    // überhaupt funktioniert — die Zeile sagte nicht, WAS als Nächstes passiert. Erst durch
    // "Tipp weiter" (konkreter Ausblick auf den nächsten Moment) ersetzt, dann auf
    // ausdrücklichen Nutzerwunsch nochmal präzisiert: die Zeile fordert jetzt dazu auf, GENAU
    // den (jetzt sanft pulsierenden, siehe Screen-1-Aufrufstelle unten) Igel anzutippen,
    // statt vage "weiterzutippen" — deckt sich mit der Einschränkung des Tipp-Bereichs dort
    // von der ganzen Fläche auf genau das Tier.
    "Tippe den Igel an, um die Verwandlung zur Schachfigur zu sehen.",
  ],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Igel wird ein Bauer!"],
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
  // Update (2026-09-10, Kurztest-Feedback: "sollte wirklich davon gesprochen werden, dass
  // eine gegnerische Figur auftaucht, die wir fangen wollen — nicht von begrüßen, das
  // wirkt albern"): löst die bisherige "ist zu Besuch"/"freundlich begrüßen"-Formulierung
  // ab, siehe claude/entscheidungslog.md. Bleibt bewusst nicht-gewalttätig (Design-
  // Grundsatz 2: kein Besiegen/keine Kill-Effekte), sagt aber klar, dass es sich um eine
  // gegnerische Figur handelt, die gefangen statt begrüßt wird — "schräg nach vorne"
  // bleibt als bauernspezifischer Hinweis erhalten (einzige erlaubte Schlagrichtung).
  // Paket 1 (2026-09-11, Entscheidungslog): Begriffsbrücke "einfangen → schlagen" — Quest 1
  // führt den Fachbegriff ein, Quest 2–6 verwenden danach nur noch "schlagen". Die
  // Zugaufforderung steht bewusst als letzte Zeile (das Brett ist sofort antippbar).
  5: [
    "Da drüben ist eine gegnerische Figur aufgetaucht.",
    "Wir fangen sie ein – in der Schachwelt sagt man dazu: schlagen.",
    "Schlag sie – zieh schräg nach vorne dorthin!",
  ],
  // Sprach-Harmonie-Review (2026-09-09): zweite Zeile war hier bisher die einzige der
  // sechs Abenteuer-Abschluss-Zeilen ohne den Rückkehr-Hinweis ("Tippe, um zurück zur
  // Karte zu gehen.") UND navigierte direkt zu Quest2 statt zur Karte (siehe
  // Aufrufstelle unten, `onPress={() => navigation.navigate("Quest2")}`) — Quest2–6
  // sagen alle denselben Satz und kehren alle zu KidHome zurück. Auf Konsistenz
  // angeglichen: Lux' Abschluss-Führung soll sich für ein Kind, das mehrere Abenteuer
  // hintereinander spielt, überall gleich anfühlen (nicht: "beim ersten Mal geht's von
  // allein weiter, danach nicht mehr" — das wäre eher verwirrend als hilfreich).
  // Paket 1 (2026-09-11, Audit C.2): Ich-/Wir-Perspektive statt Lux in der dritten Person.
  7: ["Wir haben ein neues Gebiet entdeckt!", "Wunderbar gemacht! Tippe, um zurück zur Karte zu gehen."],
};

// Neu (2026-09-08, siehe Kommentar bei SCREEN_SCRIPTS oben und claude/quest_review_
// automatik_vollbrett_vorschlag.md Abschnitt 5): Screen 2s Zeilen sind jetzt an die von
// QuestMoveScreen gemeldete QuestPhase gekoppelt statt an eine feste Liste — je nach
// Phase zeigt/spricht Lux etwas anderes, während dieselbe Figur auf demselben Brett
// bleibt:
// - "vorfuehrung": Regel-Erklärung, dann die Ankündigung der Automatik-Vorführung
//   ("Schau mal, so zieht der Bauer!"), während Board.tsx die Figur von selbst zum
//   Beispiel-Zielfeld und zurück bewegt (siehe Board.tsx demoTarget/onDemoDone).
// - "interaktiv": "Jetzt bist du dran!", danach die (jetzt korrekt unbestimmte, siehe
//   Review Abschnitt 2) Aufforderung "Tipp auf ein leuchtendes Feld."
// - "uebung": die vier zusätzlichen Übungszüge (uebungsrunden={4} unten, siehe Bugfix-
//   Kommentar an der Aufrufstelle) laufen alle unter derselben Zeile "Kannst du das noch
//   ein paar Mal?" — kein Zeilenwechsel pro Runde, das Sammel-Icon (Board.tsx
//   SammelMarker) übernimmt die visuelle Führung.
// - "fertig": kurzes Lob, bevor QuestMoveScreen (nach der dortigen 950ms-Verzögerung,
//   siehe QuestMoveScreen.tsx-Kommentar zu beendeAufgabe) onSolved() auslöst und der
//   Screen zu 4 wechselt.
//
// Update (2026-09-08, Nutzerwunsch "Am Anfang darf Igel/der Bauer zwei Felder ziehen,
// aber nur wenn du ihn das erste Mal im Spiel bewegst, danach nur noch ein Feld"): die
// vorfuehrung/interaktiv-Zeilen nennen jetzt "ein oder zwei Felder" statt nur "ein Feld" —
// siehe QuestMoveScreen.tsx-Kommentar zur entfernten restrictToSingleStep-Einschränkung:
// chess.js erlaubt den Doppelschritt ohnehin nur von der Startreihe aus, jeder
// Folgezug (Übungsphase unten) ist automatisch auf ein Feld begrenzt, ganz ohne eigene
// App-Logik dafür.
const PHASE_LINES: Record<QuestPhase, string[]> = {
  vorfuehrung: ["Beim ersten Zug darf der Bauer ein oder zwei Felder nach vorne gehen.", "Schau mal, so zieht der Bauer!"],
  interaktiv: ["Jetzt bist du dran!", "Tipp auf ein leuchtendes Feld."],
  uebung: ["Kannst du das noch ein paar Mal?"],
  fertig: ["Super, das kannst du schon richtig gut!"],
};

// Startfeld des Übungs-Bauern in allen Quest1-FENs. Bis 2026-09-08 zeigte Quest 1 hier
// als einzige der sechs Quests ein kleines 3×3-Ausschnittsfenster (e/d/f-Linie x Reihen
// 4-6) statt des vollen Bretts — mit der neuen Automatik-Vorführung oben (die Bewegung
// wird jetzt immer erst vorgeführt, bevor das Kind selbst zieht) übernimmt die Vorführung
// diese "enge Führung" visuell, das Fenster wird dafür nicht mehr gebraucht (siehe
// claude/quest_review_automatik_vollbrett_vorschlag.md Abschnitt 4). PIECE_AT sowie die
// trapAt/blockerAt/opponentAt-Koordinaten an den Aufrufstellen unten sind bereits reine
// Vollbrett-Koordinaten (e2/e3/f3) und bleiben unverändert gültig — es entfällt nur die
// {...FENSTER}-Weitergabe an QuestMoveScreen, wodurch dessen Standardwerte (rows/cols=8,
// Offsets 0) greifen, exakt wie bei Quest 2–5.
const PIECE_AT: BoardSquare = { row: 6, col: 4 }; // e2

export default function Quest1() {
  const navigation = useNavigation<any>();
  // Update (2026-09-09, siehe ScreenId-Kommentar oben): startet jetzt direkt bei Screen 1
  // (bisheriger Screen 0 entfällt ersatzlos, siehe dortiger Kommentar).
  const [screen, setScreen] = useState<ScreenId>(1);
  const [lineIndex, setLineIndex] = useState(0);
  // Neu (2026-09-08, siehe PHASE_LINES-Kommentar oben): nur für Screen 2 relevant, treibt
  // dort welche Zeilen gerade angezeigt/gesprochen werden. Startwert "vorfuehrung" passt
  // zum Startzustand von QuestMoveScreen (autoDemo unten), wird nie zurückgesetzt, da
  // Screen 2 in diesem linearen Ablauf immer nur einmal durchlaufen wird.
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
  // audiofuehrung.md): löst den bisherigen advanceLine()-Tap-zum-Aufdecken-Mechanismus
  // (Befund 1.1) ab. Screens ohne eigenen "Tipp irgendwo hin"-Bereich (die Brett-Screens
  // 2/4/5 sowie 7, dessen Tap sofort navigiert statt durch die Zeilen zu blättern) haben
  // sonst keine Möglichkeit, durch mehrzeilige Skripte zu kommen — das übernimmt jetzt das
  // natürliche Sprechende (onFertig unten). Screens 1/"verwandlung" behalten ihren
  // bestehenden Tap-Ablauf (advanceOrGo), dort bleibt autoWeiter aus.
  //
  // Update (2026-09-08, weiteres Nutzer-Feedback: "'Das ist ein kleiner Igel', direkt
  // danach (ohne weiteren Klick) sollte die Aufforderung kommen 'Tippe den Igel an, um die
  // Verwandlung' zu sehen."): Zeile 0 ("Das ist ein kleiner Igel.") blättert von selbst zu
  // Zeile 1 weiter, sobald Lux sie fertig gesprochen hat, und `isLastLine` sorgt dafür, dass
  // die letzte Zeile ("Tippe den Igel an...") tap-gesteuert bleibt — genau dort muss ja
  // tatsächlich der Igel angetippt werden, siehe disabled={!isLastLine} an dessen Pressable
  // weiter unten. Nur "verwandlung" bleibt rein tap-gesteuert (dort gibt es ohnehin nur eine
  // einzige Zeile, siehe SCREEN_SCRIPTS).
  const autoWeiter = screen !== "verwandlung";
  // Der TTS-Hook erkennt an einem geänderten Key, dass eine neue Zeile gesprochen werden
  // muss. Für Screen 2 reicht `${screen}-${lineIndex}` allein nicht mehr aus: wechselt
  // movePhase (z. B. "vorfuehrung" → "interaktiv"), setzt Quest1 lineIndex jeweils auf 0
  // zurück (siehe onPhaseChange unten) — ohne movePhase im Key wäre der Key in diesem
  // Moment identisch zum vorherigen ("2-0" für beide Phasen) und der Hook würde die neue
  // Zeile fälschlich NICHT erneut aussprechen.
  // Auch an LuxSprechblase weitergereicht (siehe Rendering unten) — derselbe Key identifiziert
  // dort eindeutig die aktuell gezeigte Zeile, damit deren Pop-in-Animation bei jedem
  // Zeilenwechsel erneut abspielt, exakt synchron mit dem, was Lux gerade (wieder) ausspricht.
  const zeilenSchluessel = screen === 2 ? `2-${movePhase}-${lineIndex}` : `${screen}-${lineIndex}`;
  // Sprach-Harmonie-Review (2026-09-09, siehe lib/luxVarianten.ts): genau die drei
  // Stellen, an denen Screen 2 sonst wortidentisch zu den anderen fünf Abenteuern wäre
  // UND die bei einer 8-Sekunden-Erinnerung (kein onFertig, da jeweils letzte Zeile
  // ihrer Phase) sonst identisch wiederholt würden, bekommen hier eine rotierende
  // Variante statt der festen PHASE_LINES-Zeile. Alle anderen Zeilen (Screen 1/
  // verwandlung/4/5/7 sowie Screen 2s Vorführungs-Zeilen) bleiben unverändert fest.
  const zeileZuSprechen =
    screen === 2 && movePhase === "uebung"
      ? () => luxVariante(UEBUNG_HINWEIS_VARIANTEN, "uebung-hinweis")
      : screen === 2 && movePhase === "interaktiv" && isLastLine
        ? () => luxVariante(INTERAKTIV_HINWEIS_VARIANTEN, "interaktiv-hinweis")
        : screen === 2 && movePhase === "fertig"
          ? () => luxVariante(FERTIG_LOB_VARIANTEN, "fertig-lob")
          : lines[lineIndex];
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
    await saveQuestFortschrittLocal("quest1", {
      sterne,
      abgeschlossen: true,
      letzterSchritt: "screen7",
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund variante={1} />
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
          (useLuxSprechzeile oben).

          Update (2026-09-08, Nutzer-Feedback: "Bitte die Sprechblasen auf einen festen
          Raum neben Lux begrenzen, um diesen nicht zu verdecken. Die Sprechblase bitte
          teilweise Transparent und etwas schöner."): bis hierhin war styles.sprechblase ein
          ganz normales, im Fluss zentriertes View — bei langen Zeilen (z. B. Screen 4,
          drei kurze Sätze) konnte die Box dadurch in der Höhe wachsen und driftete je nach
          Bildschirm optisch über/neben Lux, ohne einen wirklich FESTEN, reservierten Raum
          zu haben. styles.sprechblase ist jetzt position:"absolute", fest rechts neben dem
          luxCorner-Icon verankert (das bei size=52 knapp 87px hoch ist, siehe
          LUX_HERO_ASPECT_RATIO in luxAssets.tsx) und über maxHeight nach unten begrenzt —
          Lux bleibt dadurch immer vollständig sichtbar, die Blase wächst bei langem Text
          nur noch bis zu dieser Grenze (der Text selbst bricht innerhalb davon um). Der
          Hintergrund ist jetzt teiltransparent (rgba statt #FFFFFF) statt blickdicht, dazu
          ein dezenter heller Rand statt nur Schatten für mehr optische Tiefe/"schöner" —
          der Sprechblasen-Schweif (sprechblaseSchweif) zeigt jetzt konsequenterweise nach
          LINKS zu Lux (vorher nach oben-links, als die Blase noch unterhalb/im Fluss nach
          Lux kam), mit exakt derselben teiltransparenten Füllfarbe, damit der Übergang
          zwischen Schweif und Blasenkörper nahtlos wirkt. */}
      {zeigeUntertitel && (
        <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={zeilenSchluessel} style={styles.sprechblase} />
      )}

      {screen === 1 && (
        // Update (2026-09-08, Nutzerwunsch): bisher war die GESAMTE Fläche antippbar (der
        // Igel selbst nur mittig platziert, aber ohne eigene Bedeutung als Tippziel) — die
        // Sprechzeile fordert jetzt aber ausdrücklich dazu auf, GENAU den Igel anzutippen.
        // Deshalb liegt der Pressable jetzt direkt am Igel-Icon (mit großzügigem hitSlop
        // für kleine Kinderfinger), nicht mehr am ganzen Screen — `styles.tapArea` dient
        // nur noch der Zentrierung, ist selbst kein Pressable mehr. LuxAtem (siehe
        // luxAssets.tsx, dasselbe Muster wie Lux' eigenes Idle-Pulsieren) lässt den Igel
        // spürbar schneller/stärker pulsieren (900ms/1.08) als Lux' eigene, dezente
        // Ambient-Animation (2400ms/1.03) — hier soll die Bewegung aktiv "tipp mich an"
        // signalisieren, nicht nur "hier ist Leben".
        //
        // Update (2026-09-08, siehe autoWeiter-Kommentar oben): disabled={!isLastLine}
        // ergänzt — während Zeile 0 ("Das ist ein kleiner Igel.") noch automatisch
        // weiterblättert, nimmt der Igel selbst noch keine Taps an; erst zur letzten Zeile
        // ("Tippe den Igel an...") wird er antippbar. Ohne das wäre ein sehr ungeduldiger
        // Tap während Zeile 0 zwar unschädlich (er würde nur die Zeile weiterschalten,
        // siehe advanceOrGo), aber unnötig früh möglich.
        <View style={styles.tapArea}>
          <Pressable
            onPress={() => advanceOrGo("verwandlung")}
            disabled={!isLastLine}
            hitSlop={{ top: 24, left: 24, right: 24, bottom: 24 }}
            accessibilityLabel="Den Igel antippen, um die Verwandlung zu sehen"
          >
            <LuxAtem dauer={900} betrag={1.08}>
              <BauerMasterGrossIcon size={150} />
            </LuxAtem>
          </Pressable>
        </View>
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
          // Bis 2026-09-08 war Screen 2 hier künstlich per restrictToSingleStep auf den
          // Ein-Feld-Schritt beschränkt (Doppelschritt war "Screen 3", nicht Teil dieses
          // Grundgerüsts). Auf Nutzerwunsch entfernt: chess.js liefert für den unbewegten
          // Bauern jetzt korrekt BEIDE Zielfelder (e3 und e4), jeder Folgezug in der
          // Übungsphase unten ist automatisch (nicht durch App-Logik) auf ein Feld
          // begrenzt, siehe QuestMoveScreen.tsx-Kommentar.
          pieceIcon={<BauerMasterIcon />}
          // Neu (2026-09-08, siehe PHASE_LINES-Kommentar oben und claude/quest_review_
          // automatik_vollbrett_vorschlag.md Abschnitt 3): erst Automatik-Vorführung, dann
          // eigener Zug, dann Übungsrunden mit Sammel-Marker, bevor onSolved() greift.
          // Bugfix (2026-09-09, Nutzer-Feedback nach Gerätetest: Bauer "zieht zu weit",
          // letzter Schritt wird als Dame in Gestalt des Igel-Bauern ausgeführt): War hier
          // fälschlich weiterhin auf 5 gesetzt, obwohl QUEST1_POSITIONS.screen2 in
          // chessEngine.ts diesen Fix bereits als erledigt dokumentierte ("uebungsrunden
          // 5 -> 4") — die Konstante selbst war nie angepasst worden. Bei einem
          // Doppelschritt als erstem Zug (e2-e4, siehe Kommentar zwei Zeilen oben) erreichte
          // der Bauer die Umwandlung bei 5 Runden eine Runde zu früh (Runde 4: e7-e8), die
          // fünfte Runde bot dann sichtbar Damen-Zielfelder an, während weiterhin nur das
          // Bauern-Icon gezeichnet wurde. Mit 4 Runden endet die Übungsphase jetzt in
          // beiden Fällen spätestens dort, wo die Umwandlung stattfindet (Doppelschritt-Fall)
          // bzw. vorher (Einzelschritt-Fall e2-e3: endet bei e7, keine Umwandlung nötig).
          autoDemo
          uebungsrunden={4}
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
          fen={QUEST1_POSITIONS.screen4Blocked}
          pieceAt={PIECE_AT}
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
        // Sprach-Harmonie-Review (2026-09-09, siehe PHASE_LINES-Kommentar oben): navigiert
        // jetzt zu KidHome statt direkt zu Quest2, konsistent mit Quest2–6.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("KidHome")}>
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
  // luxCorner bei size=52 (siehe LuxEckIcon-Aufrufstelle oben) ist knapp 87px hoch
  // (52 * LUX_HERO_ASPECT_RATIO, siehe luxAssets.tsx) — die Sprechblase unten rechnet mit
  // genau diesen Maßen, um direkt neben (nicht über) Lux zu beginnen.
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  // Update (2026-09-08, Nutzer-Feedback: "Bitte die Sprechblasen auf einen festen Raum
  // neben Lux begrenzen, um diesen nicht zu verdecken. Die Sprechblase bitte teilweise
  // Transparent und etwas schöner."): vorher ein normales, im Textfluss zentriertes View
  // mit variabler Höhe (siehe Git-Historie) — dadurch driftete die Blase je nach Zeilenlänge
  // optisch über/neben Lux, statt einen festen Platz zu haben. Jetzt position:"absolute",
  // fest rechts neben luxCorner verankert (left = 24 [luxCorner-Abstand zum Bildschirmrand]
  // + 52 [Icon-Breite] + 16 [fester Zwischenraum] = 92) und mit maxHeight nach unten
  // begrenzt statt mit wachsender minHeight — Lux' Bereich (links davon) bleibt dadurch in
  // jedem Fall frei, egal wie lang eine Sprechzeile ist (der Text bricht innerhalb der
  // festen Breite/Höhe um bzw. scrollt visuell nicht, sondern bleibt kompakt, da die
  // Sprechzeilen bewusst kurz gehalten sind, siehe SCREEN_SCRIPTS/PHASE_LINES oben).
  // Sprechblasen-Neugestaltung (2026-09-09, siehe LuxSprechblase.tsx): nur noch die reine
  // Platzierung (fest rechts neben luxCorner verankert, siehe Herleitung oben unverändert)
  // bleibt hier — Füllung/Rand/Verlauf/Schatten/Schweif zeichnet jetzt LuxSprechblase selbst
  // als eine einzige zusammenhängende SVG-Kontur statt der früheren Box+Schweif-Kombination.
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
