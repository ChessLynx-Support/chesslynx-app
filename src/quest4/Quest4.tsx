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

import { useRef, useState } from "react";
import { View, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { Einschweben } from "../components/Einschweben";
import { useNavigation } from "@react-navigation/native";
import { QUEST4_POSITIONS, type BoardSquare } from "../lib/chessEngine";
import { saveQuestFortschrittLocal } from "../lib/storage";
// Opus-Review, 2026-09-07, Abschnitt 3.2 ("QuestMoveScreen.tsx-Zusammenführung", siehe
// claude/review_logik_grafik_audiofuehrung.md): löst die bisher hier lokal definierte
// MoveScreen()-Funktion ab, siehe ausführlicher Kommentar in QuestMoveScreen.tsx.
// Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
// automatikvorfuehrung.md Punkt 2 + claude/quest_review_automatik_vollbrett_vorschlag.md
// Abschnitt 3): QuestPhase-Typ mitimportiert, für dieselbe Automatik-Vorführung +
// Übungsphase auf Screen 2, die Quest 1 bereits nutzt. Screen 4 (Sprung-Überraschung +
// Schlagen in einem) bleibt bewusst unverändert — dort gibt es keine mehrrundige
// Übungsphase, siehe dortiger Kommentar.
import { QuestMoveScreen, type QuestPhase } from "../lib/QuestMoveScreen";
// Grundgerüst-Integrationsplan-Schritt 4-6 (priorisierter_umsetzungsplan.md), analog zu
// Quest1.tsx umgesetzt: Screen 1, Verwandlungsmoment, Spielerfigur (pieceIcon), Gegner-/
// "Besuchsfigur" (opponentIcon) und QuestGeschafft nutzen jetzt die neue Pferd/Springer-
// Master-Illustration statt der alten `creatures.tsx`/`chessPieces.tsx`-SVGs.
import { SpringerMasterIcon, SpringerMasterDunkelIcon, SpringerMasterGrossIcon } from "../lib/pieceMasters";
// Lebendiges Quest-Tier für Screen 1 und den Verwandlungsmoment (2026-09-12, siehe
// src/lib/questTiere.tsx): vor der Verwandlung zeigt die App das Tier, danach die Figur.
import { QuestTierIcon } from "../lib/questTiere";
// Bugfix (Nutzer-Feedback 2026-09-07, nach dem ersten `npm test`-Durchlauf: "Es ist sehr
// unrealistisch, dass der Springer von so vielen anderen Springern umzingelt ist"): Screen 4
// zeigte hier fälschlich SpringerMasterIcon für die umgebenden Figuren, obwohl die FEN
// (siehe chessEngine.ts/QUEST4_POSITIONS.screen4Blocked) durchgehend Bauern kodiert — ein
// echter Icon/FEN-Mismatch, kein reines Geschmacksthema. Jetzt BauerMasterIcon, passend zur
// jetzt ebenfalls auf eine realistische 3er-Bauernkette reduzierten Stellung.
import { BauerMasterIcon } from "../lib/pieceMasters";
// Bugfix (Opus-Review, 2026-09-07, Befund 2.1, siehe claude/review_logik_grafik_
// audiofuehrung.md): LuxEckIcon statt des beigen Platzhalter-Kreises (styles.luxHead).
// LuxAtem (Update 2026-09-08, Task #109, siehe Screen-1-Aufrufstelle unten): dasselbe
// Puls-Muster wie bei Quest 1s Igel, jetzt auch für das antippbare Pferd hier.
import { LuxEckIcon, LuxAtem } from "../lib/luxAssets";
// Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
// audiofuehrung.md): gemeinsamer Sprech-Hook + Untertitel-Flag, siehe Aufrufstellen unten.
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
// Sprach-Harmonie-Review (2026-09-09, siehe lib/luxVarianten.ts für die volle
// Begründung): die drei über alle sechs Waldabenteuer wortidentischen PHASE_LINES-Zeilen
// unten (interaktiv/uebung/fertig) rotieren jetzt durch mehrere kindgerechte Varianten,
// statt bei jeder 8-Sekunden-Erinnerung bzw. in jedem Abenteuer identisch zu klingen.
import { luxVariante, INTERAKTIV_HINWEIS_VARIANTEN, UEBUNG_HINWEIS_VARIANTEN, FERTIG_LOB_VARIANTEN } from "../lib/luxVarianten";
// Zweisprachige Texte (DE+EN, Key-basiertes System) — siehe lib/sprache.ts und
// claude/i18next_umstellung_plan_2026-09-15.md. War bis dahin komplett auf festes Deutsch,
// jetzt im selben Zug übersetzt UND keybasiert migriert (siehe Quest2.tsx-Kommentar).
import { tk } from "../lib/sprache";
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

type ScreenId = 0 | 1 | "verwandlung" | 2 | 4 | 7;

// Update (2026-09-08, Task #109, siehe claude/quest_review_automatik_vollbrett_
// vorschlag.md Abschnitt 5 und Quest1.tsx-Kommentar): Screen 2 hat ab jetzt KEINEN
// eigenen Eintrag mehr hier — seine Zeilen sind phasenabhängig, siehe PHASE_LINES unten.
// Screen 4 (Sprung-Überraschung + Schlagen) bleibt unverändert.
// FUNKTION statt Konstante (2026-09-15, siehe Quest1.tsx-Kommentar zur selben Regel).
function screenScripts(): Record<Exclude<ScreenId, 2>, string[]> {
  return {
  0: [
    tk("quest4.screen0.zeile1"),
    tk("quest4.screen0.zeile2"),
    // Gerätetest 2026-09-11 (Nutzerwunsch): die Vorstellung läuft bis zur Verwandlung von
    // selbst — getippt wird nur noch auf das Tier, nach Lux' Aufforderung. Deshalb keine
    // "Tipp weiter"-Aufforderung mehr.
    tk("quest4.screen0.zeile3"),
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
    //  1. KEIN FIGURENNAME — "Springer" fällt erst im Verwandlungsmoment unten (Namensregel,
    //     projektwissen.md). Die Eigenschaften deuten die Figur nur an.
    //  2. KEINE REGEL ERKLÄREN — die Gangart wird als Bild angedeutet, nicht beigebracht;
    //     das ist Aufgabe der Brett-Screens. Sonst steht dieselbe Information zweimal.
    //
    // Ohne Code-Änderung: `autoWeiter` blättert die neuen Zeilen nach dem Sprechende von
    // selbst weiter, `isLastLine` hält die Tipp-Aufforderung als einzige tap-gesteuerte Zeile.
    tk("quest4.screen1.zeile1"),
    tk("quest4.screen1.zeile2"),
    tk("quest4.screen1.zeile3"),
    // Update (2026-09-08, Task #109, siehe claude/vorgemerkt_quest_tempo_und_
    // automatikvorfuehrung.md Punkt 3): löst "Tipp irgendwo hin, um weiterzumachen" ab —
    // fordert jetzt konkret dazu auf, GENAU das (jetzt sichtbar pulsierende) Pferd
    // anzutippen, siehe Screen-1-Aufrufstelle unten.
    tk("quest4.screen1.zeile4"),
  ],
  verwandlung: [tk("quest4.verwandlung.zeile1")],
  4: [
    tk("quest4.screen4.zeile1"),
    tk("quest4.screen4.zeile2"),
    // Update (2026-09-10, siehe Quest1.tsx-Kommentar zur selben Formulierungsänderung):
    // "wartet sogar Besuch. Kannst du ihn schlagen?" ersetzt durch "einfangen"-Framing.
    // Paket 1 (2026-09-11): "schlagen" statt "einfangen", siehe Quest1.tsx Screen 5.
    tk("quest4.screen4.zeile3"),
  ],
  // Update (2026-09-08, siehe Kommentar an der screen===7-Stelle unten): zweite Zeile nennt
  // jetzt explizit das Antippen und wohin es führt (Karte statt nächste Quest).
  // Paket 1 (2026-09-11, Audit C.2): Ich-/Wir-Perspektive statt Lux in der dritten Person.
  7: [tk("quest4.screen7.zeile1"), tk("quest4.screen7.zeile2")],
  };
}

// Neu (2026-09-08, Task #109, siehe Kommentar bei SCREEN_SCRIPTS oben und Quest1.tsx):
// Screen 2s Zeilen sind jetzt an die von QuestMoveScreen gemeldete QuestPhase gekoppelt.
// Siehe Kommentar bei screenScripts() — aus demselben Grund eine Funktion.
function phaseLines(): Record<QuestPhase, string[]> {
  return {
  vorfuehrung: [
    tk("quest4.screen2.vorfuehrung.zeile1"),
    tk("quest4.screen2.vorfuehrung.zeile2"),
  ],
  interaktiv: [tk("quest4.screen2.interaktiv.zeile1"), tk("quest4.screen2.interaktiv.zeile2")],
  uebung: [tk("quest4.screen2.uebung.zeile1")],
  fertig: [tk("quest4.screen2.fertig.zeile1")],
  };
}

// Startfeld des Springers in allen Quest4-FENs.
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

export default function Quest4() {
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

  const lines = screen === 2 ? phaseLines()[movePhase] : screenScripts()[screen];
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
    await saveQuestFortschrittLocal("quest4", { sterne, abgeschlossen: true, letzterSchritt: "screen7" });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund variante={4} />
      <Pressable
        style={styles.luxCorner}
        onPress={wiederholen}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel={tk("quest4.a11y.lux_wiederholen")}
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
            <QuestTierIcon quest="quest4" size={150} />
          </Einschweben>
        </View>
      )}
      {screen === 1 && (
        // Update (2026-09-08, Task #109, siehe Quest1.tsx-Kommentar zum identischen
        // Muster): Pressable jetzt direkt am Pferde-Icon (großzügiger hitSlop), LuxAtem
        // lässt es sichtbar pulsieren, disabled={!isLastLine} sperrt Taps, bis die letzte
        // Zeile ("Tippe das Pferd an...") gezeigt wird.
        <View style={styles.tapArea}>
          <Pressable
            onPress={() => advanceOrGo("verwandlung")}
            disabled={!isLastLine}
            hitSlop={{ top: 24, left: 24, right: 24, bottom: 24 }}
            accessibilityLabel={tk("quest4.a11y.pferd_antippen")}
          >
            <LuxAtem dauer={900} betrag={1.08}>
              <QuestTierIcon quest="quest4" size={150} />
            </LuxAtem>
          </Pressable>
        </View>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<SpringerMasterGrossIcon size={150} />}
          tier={<QuestTierIcon quest="quest4" size={150} />}
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
          fen={QUEST4_POSITIONS.screen2}
          pieceAt={PIECE_AT}
          pieceIcon={<SpringerMasterIcon />}
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
        // Update (2026-09-08, Nutzerwunsch "nach jedem Quest zu dieser Karte zurückgekehrt,
        // nicht die Quests nacheinander einfach durchgeklickt werden"): führte bisher direkt
        // zu Quest5 weiter — jetzt bewusst zurück zum Luchs-Revier (KidHome, siehe
        // components/LuchsRevierKarte.tsx), analog zu Quest1–3 und Quest6.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("KidHome")}>
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
