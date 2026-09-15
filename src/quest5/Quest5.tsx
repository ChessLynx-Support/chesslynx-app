// Portierung von prototyp/client/src/quest5/Quest5.tsx nach React Native, nach demselben
// reduzierten Muster wie Quest 1-4. Die im Web-Prototyp enthaltene Figurenwert-Aufgabe
// ("Weitblick", dortiger Screen 5) und das 3-Runden-Mini-Spiel fehlen ABSICHTLICH, aus
// denselben Gründen wie bei den vorherigen Quests. Der Verwandlungsmoment (Schwan → Dame,
// zwischen Screen 1 und 2) IST umgesetzt, siehe Quest1.tsx-Kommentar. Screen 2 vergleicht
// die Dame bewusst mit "Turm" und "Läufer" (nicht mehr "Schildkröte"/"Wiesel") — beide
// haben sich in ihren eigenen Quests bereits dauerhaft in die echte Figur verwandelt.

import { useRef, useState } from "react";
import { View, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { Einschweben } from "../components/Einschweben";
import { useNavigation } from "@react-navigation/native";
import { QUEST5_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, siehe ausführlicher Kommentar in QuestMoveScreen.tsx.
// Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
// automatikvorfuehrung.md Punkt 2 + claude/quest_review_automatik_vollbrett_vorschlag.md
// Abschnitt 3): QuestPhase-Typ mitimportiert, für dieselbe Automatik-Vorführung +
// Übungsphase auf Screen 2, die Quest 1 bereits nutzt.
import { QuestMoveScreen, type QuestPhase } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon), Gegner-/
// "Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Schwan/Dame-
// Master-Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs.
import { DameMasterIcon, DameMasterDunkelIcon, DameMasterGrossIcon } from "../lib/pieceMasters";
// Lebendiges Quest-Tier für Screen 1 und den Verwandlungsmoment (2026-09-12, siehe
// src/lib/questTiere.tsx): vor der Verwandlung zeigt die App das Tier, danach die Figur.
import { QuestTierIcon } from "../lib/questTiere";
// Bugfix (Opus-Review, 2026-09-07, Befund 2.1, siehe claude/review_logik_grafik_
// audiofuehrung.md): LuxEckIcon statt des beigen Platzhalter-Kreises (styles.luxHead).
// LuxAtem (Update 2026-09-08, Task #109, siehe Screen-1-Aufrufstelle unten): dasselbe
// Puls-Muster wie bei Quest 1s Igel, jetzt auch für den antippbaren Schwan hier.
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
// eigenen Eintrag mehr hier — seine Zeilen sind phasenabhängig, siehe PHASE_LINES unten.
const SCREEN_SCRIPTS: Record<Exclude<ScreenId, 2>, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt eine neue Freundin.",
    // Gerätetest 2026-09-11 (Nutzerwunsch): die Vorstellung läuft bis zur Verwandlung von
    // selbst — getippt wird nur noch auf das Tier, nach Lux' Aufforderung. Deshalb keine
    // "Tipp weiter"-Aufforderung mehr.
    "Komm, wir lernen sie kennen!",
  ],
  // Update (2026-09-10, siehe Quest2.tsx-Kommentar zur selben Änderung): "Hallo! Ich
  // bin's wieder, Lux." ersatzlos gestrichen.
  1: [
    // Gerätetest 2026-09-13 (Nutzer: "Der Text wirkt sehr generisch. Wir sollten hier eine
    // kleine Vorstellung der Figuren spendieren ... 2-3 Haupteigenschaften, die ihn mit der
    // Figur verbinden, um so die Verwandlung schon einmal einzuleiten."): Aus der einen
    // Namenszeile sind drei geworden — Name, Wesen, Gangart. Gleichlautend in allen sechs
    // Quests umgesetzt, ausführliche Begründung in quest1/Quest1.tsx.
    //
    // ZWEI REGELN für diese Zeilen:
    //  1. KEIN FIGURENNAME — "Dame" fällt erst im Verwandlungsmoment unten (Namensregel,
    //     projektwissen.md). Die Eigenschaften deuten die Figur nur an.
    //  2. KEINE REGEL ERKLÄREN — die Gangart wird als Bild angedeutet, nicht beigebracht;
    //     das ist Aufgabe der Brett-Screens. Sonst steht dieselbe Information zweimal.
    //
    // Ohne Code-Änderung: `autoWeiter` blättert die neuen Zeilen nach dem Sprechende von
    // selbst weiter, `isLastLine` hält die Tipp-Aufforderung als einzige tap-gesteuerte Zeile.
    "Das ist der Schwan.",
    "Er ist elegant und sehr stolz.",
    "Er kommt überall hin: geradeaus, schräg, in jede Richtung.",
    // Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
    // automatikvorfuehrung.md Punkt 3): löst "Tipp irgendwo hin, um weiterzumachen" ab —
    // fordert jetzt konkret dazu auf, GENAU den (jetzt sichtbar pulsierenden) Schwan
    // anzutippen, siehe Screen-1-Aufrufstelle unten.
    "Tippe den Schwan an, um die Verwandlung zur Schachfigur zu sehen.",
  ],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Schwan wird eine Dame!"],
  4: [
    "Da steht jemand mitten auf dem Weg.",
    "Auch die Dame kann nicht darüber hinwegziehen.",
    "Sie darf aber jede andere Richtung nehmen.",
  ],
  // Update (2026-09-10, siehe Quest1.tsx-Kommentar zur selben Formulierungsänderung):
  // "freundlich begrüßen" ersetzt durch "einfangen".
  // Paket 1 (2026-09-11, Entscheidungslog): "schlagen" wird in Quest 1 per Brückenzeile
  // eingeführt und ab hier durchgängig verwendet — kein "begrüßen", kein "einfangen" mehr.
  5: ["Am Ende des Weges ist eine gegnerische Figur aufgetaucht.", "Schlag sie – zieh einfach dorthin!"],
  // Update (2026-09-08, siehe Kommentar an der screen===7-Stelle unten): zweite Zeile nennt
  // jetzt explizit das Antippen und wohin es führt (Karte statt nächste Quest).
  // Paket 1 (2026-09-11, Audit C.2): Ich-/Wir-Perspektive statt Lux in der dritten Person.
  7: ["Wir haben ein neues Gebiet entdeckt!", "Wunderbar gemacht! Tippe, um zurück zur Karte zu gehen."],
};

// Neu (2026-09-08, Task #109, siehe Kommentar bei SCREEN_SCRIPTS oben und Quest1.tsx):
// Screen 2s Zeilen sind jetzt an die von QuestMoveScreen gemeldete QuestPhase gekoppelt.
const PHASE_LINES: Record<QuestPhase, string[]> = {
  vorfuehrung: [
    "Die Dame zieht wie der Turm UND wie der Läufer. Gerade und schräg, alles auf einmal!",
    "Schau mal, so zieht die Dame!",
  ],
  interaktiv: ["Jetzt bist du dran!", "Tipp auf ein leuchtendes Feld."],
  uebung: ["Kannst du das noch ein paar Mal?"],
  fertig: ["Super, das kannst du schon richtig gut!"],
};

// Startfeld der Dame in allen Quest5-FENs.
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

export default function Quest5() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  // Neu (2026-09-08, Task #109, siehe PHASE_LINES-Kommentar oben und Quest1.tsx).
  const [movePhase, setMovePhase] = useState<QuestPhase>("vorfuehrung");
  // Gerätetest 2026-09-14 (Nutzer zu Quest 1: "die Verwandlung wird abgebrochen, nach 'now
  // watch closely' wird schon übergeblendet"): Die Verwandlungs-Animation lief bisher los,
  // sobald ihr Screen erschien — also gleichzeitig mit Lux' Ankündigung. Nach ~1,9 s war sie
  // durch und schaltete weiter, was den noch laufenden Satz abschnitt. Ankündigung und
  // angekündigtes Ereignis fielen damit zusammen.
  //
  // Jetzt hält dieser Zustand die Sequenz zurück, bis Lux die Zeile zu Ende gesprochen hat
  // (siehe `onFertig` beim Sprechzeilen-Hook weiter unten und `starten` an <Verwandlung>).
  // Er kann nicht hängen bleiben: Der Hook meldet das Ende in jedem Fall, notfalls über sein
  // Sicherheitsnetz, selbst wenn die Sprachausgabe ganz ausfällt.
  const [verwandlungBereit, setVerwandlungBereit] = useState(false);

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
  // automatikvorfuehrung.md Punkt 3): Screen 1 ist hier nicht mehr ausgenommen, siehe
  // Quest1.tsx-Kommentar zum identischen Muster. Screen 0 bleibt bewusst ausgenommen.
  // Gerätetest 2026-09-11 (Nutzerwunsch "die Vorstellung bis zur Verwandlung sollte
  // automatisch laufen"): Screen 0 ist nicht mehr ausgenommen — er blättert von selbst durch
  // und geht nach seiner letzten Zeile ohne Antippen zu Screen 1 (siehe screen0Weiter).
  const autoWeiter = screen !== "verwandlung";
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
    // Auf dem Verwandlungs-Screen bedeutet "Zeile fertig gesprochen" nicht "nächste Zeile",
    // sondern "jetzt darf die Verwandlung beginnen" (siehe verwandlungBereit oben). Dass hier
    // überhaupt ein onFertig steht, schaltet nebenbei die 8-Sekunden-Erinnerung ab — die wäre
    // auf diesem Screen ohnehin sinnlos, weil das Kind nichts tun soll außer zuzusehen.
    screen === "verwandlung"
      ? () => setVerwandlungBereit(true)
      : autoWeiter && !isLastLine
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
    await saveQuestFortschrittLocal("quest5", { sterne, abgeschlossen: true, letzterSchritt: "screen7" });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund variante={5} />
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
            <QuestTierIcon quest="quest5" size={150} />
          </Einschweben>
        </View>
      )}
      {screen === 1 && (
        // Update (2026-09-08, Task #109, siehe Quest1.tsx-Kommentar zum identischen
        // Muster): Pressable jetzt direkt am Schwan-Icon (großzügiger hitSlop), LuxAtem
        // lässt ihn sichtbar pulsieren, disabled={!isLastLine} sperrt Taps, bis die
        // letzte Zeile ("Tippe den Schwan an...") gezeigt wird.
        <View style={styles.tapArea}>
          <Pressable
            onPress={() => advanceOrGo("verwandlung")}
            disabled={!isLastLine}
            hitSlop={{ top: 24, left: 24, right: 24, bottom: 24 }}
            accessibilityLabel="Den Schwan antippen, um die Verwandlung zu sehen"
          >
            <LuxAtem dauer={900} betrag={1.08}>
              <QuestTierIcon quest="quest5" size={150} />
            </LuxAtem>
          </Pressable>
        </View>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<DameMasterGrossIcon size={150} />}
          tier={<QuestTierIcon quest="quest5" size={150} />}
          grossGroesse={150}
          kleinGroesse={34}
          // Erst losreißen, wenn Lux zu Ende gesprochen hat (siehe verwandlungBereit oben).
          // Bis dahin steht das Tier ruhig da, während die Ankündigung läuft.
          starten={verwandlungBereit}
          onDone={() => {
            setLineIndex(0);
            setScreen(2);
          }}
        />
      )}

      {screen === 2 && (
        <QuestMoveScreen
          fen={QUEST5_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          pieceIcon={<DameMasterIcon />}
          // Neu (2026-09-08, Task #109, siehe Quest1.tsx): erst Automatik-Vorführung,
          // dann eigener Zug, dann fünf Übungsrunden, bevor onSolved() greift.
          autoDemo
          uebungsrunden={5}
          onPhaseChange={(neu) => {
            setMovePhase(neu);
            setLineIndex(0);
          }}
          onSolved={() => { setLineIndex(0); setScreen(4); }}
        />
      )}

      {screen === 4 && (
        <QuestMoveScreen
          fen={QUEST5_POSITIONS.screen4Blocked}
          pieceAt={PIECE_AT}
          trapAt={{ row: 2, col: 3 }} // d6
          blockerAt={{ row: 2, col: 3 }}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // früher per onlyTarget auf d5 (das eine Feld direkt vor der Blockade)
          // verborgen — chess.js liefert hier zusätzlich alle sieben unblockierten
          // Dame-Richtungen, die jetzt ebenfalls sichtbar und akzeptiert werden (dritte
          // Sprechzeile oben: "Sie darf aber jede andere Richtung nehmen."). Die
          // Stopp!-Aufgabe selbst bleibt über trapAt/onTrapTap unten weiterhin ein
          // eigener, gleichwertiger Lösungsweg.
          pieceIcon={<DameMasterIcon />}
          blockerIcon={<DameMasterIcon />}
          onSolved={() => { setLineIndex(0); setScreen(5); }}
          // Bugfix (Opus-Review Befund 1.3): onTrapTap führt jetzt genauso weiter wie der
          // korrekte Zug — zwei gleichwertige Wege (siehe Quest1.tsx).
          // Update 2026-09-15: Die frühere Verzögerung von 950 ms steckte hier als Kopie in
          // vier Quest-Dateien und schnitt beim Gerätetest Lux' Stopp!-Erklärung ab. Das
          // Abwarten liegt jetzt in QuestMoveScreen (Animation, dann Sprechende); hier bleibt
          // nur noch, WAS danach passieren soll.
          onTrapTap={() => {
            setLineIndex(0);
            setScreen(5);
          }}
        />
      )}

      {screen === 5 && (
        <QuestMoveScreen
          fen={QUEST5_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          // Update (Nutzer-Feedback 2026-09-07, siehe QuestMoveScreen.tsx-Kommentar):
          // früher per onlyCaptureAt auf f6 verborgen, jetzt sind auch die übrigen
          // Legalzüge sichtbar und akzeptiert.
          opponentAt={{ row: 2, col: 5 }}
          pieceIcon={<DameMasterIcon />}
          opponentIcon={<DameMasterDunkelIcon />}
          onSolved={() => {
            setLineIndex(0);
            setScreen(7);
            handleQuestComplete();
          }}
        />
      )}

      {screen === 7 && (
        // Update (2026-09-08, Nutzerwunsch "nach jedem Quest zu dieser Karte zurückgekehrt,
        // nicht die Quests nacheinander einfach durchgeklickt werden"): führte bisher direkt
        // zu Quest6 weiter — jetzt bewusst zurück zum Luchs-Revier (KidHome, siehe
        // components/LuchsRevierKarte.tsx), analog zu Quest1–4 und Quest6 selbst.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("KidHome")}>
          <QuestGeschafft>
            <DameMasterIcon size={92} />
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
