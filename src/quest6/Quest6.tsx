// ===================================================================================
// Paket 2 (2026-09-11, Umsetzungsplan / quest6_matt_bruecke_umsetzung_2026-09-10.md):
// Quest 6 ist um die Schach-Brücke (drei Wege, dem König zu helfen, mit Stopp!-Aufgabe),
// das Mini-Spiel "Schach entkommen" (vier Stellungen) und den Matt-Moment erweitert. Die
// Absätze direkt unten ("nur wegziehen", "Matt bewusst NICHT Teil") beschreiben den
// Stand davor und sind damit überholt — Audit-Befund: "Matt" wurde im Code nie
// eingeführt, Matt in 2 verwies auf einen nicht existierenden Moment.
// ===================================================================================
//
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
import { Einschweben } from "../components/Einschweben";
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
// Lebendiges Quest-Tier für Screen 1 und den Verwandlungsmoment (2026-09-12, siehe
// src/lib/questTiere.tsx): vor der Verwandlung zeigt die App das Tier, danach die Figur.
import { QuestTierIcon } from "../lib/questTiere";
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

// Paket 2 (2026-09-11): Brett-Komponente mit mehreren eigenen Figuren (Schach-Brücke,
// Mini-Spiel, Matt-Moment) und die Versöhnungs-Animation nach dem ersten Matt.
import { SchachAufgabe, type SchachZug } from "./SchachAufgabe";
import { MattMomentFeier } from "./MattMomentFeier";
import { fromAlgebraic } from "../lib/chessEngine";

// Paket 2 (2026-09-11, Vorlage quest6_matt_bruecke_umsetzung_2026-09-10.md): neue
// Reihenfolge 1 → Verwandlung → 2 (Bewegung) → 3 (Schlagen, bisher Screen 5) → 4
// (Schach-Brücke) → 5 (Mini-Spiel "Schach entkommen") → 6 (Matt-Moment) → Matt-Feier →
// 7 (Abschluss). Lernfolge damit: bewegen → schlagen → Schach → Schach lösen → Matt.
// Der frühere Screen 4 ("Achtung, Schach!", nur wegziehen, Springer auf c6) geht in der
// Schach-Brücke auf und ist entfallen.
type ScreenId = 0 | 1 | "verwandlung" | 2 | 3 | 4 | 5 | 6 | "mattFeier" | 7;

// Update (2026-09-08, Task #110, siehe Datei-Kommentar oben): Screen 2 hat ab jetzt KEINEN
// eigenen Eintrag mehr hier — seine Zeilen sind phasenabhängig, siehe PHASE_LINES unten.
// Paket 2: Screen 5 (Mini-Spiel) hat ebenfalls keinen festen Eintrag — seine Zeilen hängen
// von der gerade gespielten Stellung ab, siehe MINI_SPIEL unten.
const SCREEN_SCRIPTS: Record<Exclude<ScreenId, 2 | 5>, string[]> = {
  0: [
    "Weiter geht's durch den Wald von ChessLynx!",
    "Hier lebt der Wichtigste von allen.",
    // Gerätetest 2026-09-11 (Nutzerwunsch): die Vorstellung läuft bis zur Verwandlung von
    // selbst — getippt wird nur noch auf das Tier, nach Lux' Aufforderung. Deshalb keine
    // "Tipp weiter"-Aufforderung mehr.
    "Komm, wir lernen ihn kennen!",
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
    //  1. KEIN FIGURENNAME — "König" fällt erst im Verwandlungsmoment unten (Namensregel,
    //     projektwissen.md). Die Eigenschaften deuten die Figur nur an.
    //  2. KEINE REGEL ERKLÄREN — die Gangart wird als Bild angedeutet, nicht beigebracht;
    //     das ist Aufgabe der Brett-Screens. Sonst steht dieselbe Information zweimal.
    //
    // Ohne Code-Änderung: `autoWeiter` blättert die neuen Zeilen nach dem Sprechende von
    // selbst weiter, `isLastLine` hält die Tipp-Aufforderung als einzige tap-gesteuerte Zeile.
    "Das ist der Hirsch.",
    "Er ist der Wichtigste im ganzen Wald.",
    "Er geht ruhig und langsam, immer nur einen Schritt. Alle anderen passen auf ihn auf.",
    // Update (2026-09-08, Task #110, siehe claude/vorgemerkt_quest_tempo_und_
    // automatikvorfuehrung.md Punkt 3): löst "Tipp irgendwo hin, um weiterzumachen" ab —
    // fordert jetzt konkret dazu auf, GENAU den (jetzt sichtbar pulsierenden) Hirsch
    // anzutippen, siehe Screen-1-Aufrufstelle unten.
    "Tippe den Hirsch an, um die Verwandlung zur Schachfigur zu sehen.",
  ],
  verwandlung: ["Und jetzt die Verwandlung: Aus dem Hirsch wird ein König!"],
  // Paket 1 (2026-09-11, Entscheidungslog): "schlagen" wird in Quest 1 per Brückenzeile
  // eingeführt und ab hier durchgängig verwendet. Paket 2: rückt vor die Schach-Brücke
  // (bisher Screen 5).
  3: ["Steht eine gegnerische Figur direkt daneben, kann auch der König sie schlagen.", "Tipp hin."],
  // Paket 2: Schach-Brücke (Begriffsbrücke 1). Zeilen 0–2 Beat 1, Zeilen 3–7 Beat 2 (Lux
  // führt bei Zeile 4/5/6 je einen der drei Wege vor, siehe BRUECKE_DEMOS), Zeile 8 Beat 3
  // (interaktiv, letzte Zeile).
  4: [
    "Schau, der Turm dort oben. Er zielt genau auf unseren König.",
    "In der Schachwelt nennt man das: Schach!",
    "Wenn Schach ist, müssen wir dem König sofort helfen.",
    "Es gibt drei Wege, ihm zu helfen. Ich zeig sie dir.",
    "Manchmal reicht ein Schritt zur Seite.",
    "Manchmal stellt sich jemand dazwischen.",
    "Manchmal muss der Angreifer weg.",
    "Alle drei sind richtig. Du darfst aussuchen.",
    "Jetzt du. Hilf dem König – auf deine Weise.",
  ],
  // Paket 2: Matt-Moment (Begriffsbrücke 2), letzte Zeile interaktiv (nur Ra8 leuchtet).
  6: [
    "Schau dir den anderen König an. Seine drei Igel stehen wie Wächter vor ihm.",
    "Sie beschützen ihn – aber sie versperren ihm auch jeden Weg nach vorne.",
    "Wenn unser Turm jetzt ganz nach oben zieht, ist auch dahinter kein Platz mehr. Probier's!",
  ],
  // Paket 2: Versöhnungsmoment nach dem Matt (MattMomentFeier-Animation läuft dazu).
  mattFeier: [
    "Und wenn Matt ist, ist das Spiel vorbei – der König darf aus seiner Ecke heraus. Wir haben ihn befreit!",
    "Merk dir das: Dem eigenen König helfen wir. Den anderen König befreien wir.",
  ],
  // Paket 2 (Vorlage Abschnitt 5): Abschluss nennt jetzt auch Schach und Matt.
  // Update (2026-09-08): zweite Zeile nennt explizit das Antippen und wohin es führt.
  7: ["Du kennst jetzt alle sechs Figuren – und Schach und Matt dazu!", "Wunderbar gemacht! Tippe, um zurück zur Karte zu gehen."],
};

// Paket 2: die drei Vorführ-Züge der Schach-Brücke, gekoppelt an die Zeilen 4/5/6 von
// SCREEN_SCRIPTS[4] (König e1→d1, Springer c3→e2, Läufer a4 schlägt den Turm auf e8).
const BRUECKE_DEMOS: Record<number, { von: BoardSquare; nach: BoardSquare }> = {
  4: { von: fromAlgebraic("e1"), nach: fromAlgebraic("d1") },
  5: { von: fromAlgebraic("c3"), nach: fromAlgebraic("e2") },
  6: { von: fromAlgebraic("a4"), nach: fromAlgebraic("e8") },
};

// Rückmeldung nach dem eigenen Zug, je nach gewähltem Weg (fest, nicht rotierend).
const WEG_ZEILE: Record<SchachZug["weg"], string> = {
  wegziehen: "Ein Schritt zur Seite – Schach vorbei!",
  dazwischen: "Der Springer hat sich dazwischengestellt – Schach vorbei!",
  schlagen: "Der Angreifer ist weg – Schach vorbei!",
};

// Erinnerungs-Pool für die interaktiven Schach-Zeilen (8-Sekunden-Erinnerung, zählt wie
// überall für die Sterne). Abweichend von der Vorlage ("Jede leuchtende Figur kann
// helfen"): es leuchten die Zielfelder der gerade gewählten Figur, nicht die Figuren
// selbst — deshalb weist die Erinnerung auf das Antippen einer anderen Figur hin.
const BRUECKE_ERINNERUNG = [
  "Tipp auf den König, den Springer oder den Läufer – dann siehst du, wohin sie dürfen.",
  "Denk an die drei Wege: weggehen, dazwischenstellen, wegnehmen.",
];
const MINI_ERINNERUNG = [
  "Tipp auf eine deiner Figuren – dann siehst du, wohin sie darf.",
  "Denk an die drei Wege: weggehen, dazwischenstellen, wegnehmen.",
];

// Paket 2: Mini-Spiel "Schach entkommen" — vier Stellungen in fester Reihenfolge, je
// genau ein Weg, die vierte wieder alle drei (QUEST6_POSITIONS.miniSpiel).
const MINI_SPIEL: { vor: string; nach?: string }[] = [
  { vor: "Ein Pferd! Das hüpft – da kann sich niemand dazwischenstellen.", nach: "Genau, der König geht einfach weg." },
  {
    vor: "Zwei Bären – und der König hat kein sicheres Feld. Wer kann sich dazwischenstellen?",
    nach: "Der Springer schützt ihn. Schach vorbei!",
  },
  { vor: "Der König steckt fest, und das Pferd hüpft. Bleibt nur eins …", nach: "Der Läufer holt ihn weg. Richtig!" },
  // Letzte Stellung: alle drei Wege sind möglich. Gerätetest 2026-09-11 (Nutzer: "hier ist
  // der klar beste Weg das Schlagen des Turms, der Text sollte das aufgreifen"): Lux fragt
  // nach dem BESTEN Weg; Rückmeldung siehe MINI_BESTER_WEG unten.
  { vor: "Und hier? Such dir einen Weg aus. Welcher ist wohl der beste?" },
];
// Rückmeldung zur letzten Mini-Stellung: Schlagen wird als bester Weg gelobt (der Angreifer
// ist dann ganz weg und kann nicht gleich wieder Schach geben); die beiden anderen Wege
// bleiben richtig, bekommen aber den Hinweis auf den noch besseren.
const MINI_BESTER_WEG = {
  schlagen: "Genau! Den Turm schlagen ist hier am besten. Dann ist er ganz weg und kann nicht wieder zielen.",
  sonst: "Richtig, Schach vorbei! Noch besser wäre es gewesen, den Turm zu schlagen. Dann ist er ganz weg.",
};
const MINI_EINSTIEG = "Vier Mal ist Schach. Findest du jedes Mal einen Weg?";
const MINI_ABSCHLUSS = "Vier Mal Schach – vier Mal geholfen. Du weißt jetzt, wie man einem König hilft.";

const STOPP_ZEILE =
  "Wenn der Läufer dorthin geht, zielt der Turm immer noch auf den König. Beim Schach muss dem König zuerst geholfen werden.";

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

// Startfeld des Königs in den Screen-2/3-FENs (siehe chessEngine.ts/QUEST6_POSITIONS).
const PIECE_AT: BoardSquare = { row: 4, col: 3 }; // d4

// Paket 2: eingeschobene Einzelzeile (Rückmeldung nach einem Zug, Stopp!-Hinweis) — wird
// statt der normalen Screen-Zeile gesprochen; `danach` läuft, sobald Lux sie fertig
// gesprochen hat. Ohne `danach` kehrt der Screen zur vorherigen Zeile zurück (Stopp!).
type Einschub = { id: number; text: string; danach?: () => void };

export default function Quest6() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  // Neu (2026-09-08, Task #110, siehe PHASE_LINES-Kommentar oben und Quest1.tsx): nur für
  // Screen 2 relevant, treibt dort, welche Zeilen gerade angezeigt/gesprochen werden.
  const [movePhase, setMovePhase] = useState<QuestPhase>("vorfuehrung");
  // Paket 2: aktuelle Stellung im Mini-Spiel (0–3) und eingeschobene Zeile.
  const [miniIndex, setMiniIndex] = useState(0);
  const [einschub, setEinschub] = useState<Einschub | null>(null);
  const einschubZaehler = useRef(0);

  function schiebeEin(text: string, danach?: () => void) {
    einschubZaehler.current += 1;
    setEinschub({ id: einschubZaehler.current, text, danach });
  }

  function geheZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
  }

  const miniZeilen = [...(miniIndex === 0 ? [MINI_EINSTIEG] : []), MINI_SPIEL[miniIndex].vor];
  // Screen 2 hat keinen eigenen SCREEN_SCRIPTS-Eintrag mehr (siehe dortiger Kommentar) —
  // seine Zeilen kommen stattdessen aus PHASE_LINES, abhängig von movePhase.
  const lines = screen === 2 ? PHASE_LINES[movePhase] : screen === 5 ? miniZeilen : SCREEN_SCRIPTS[screen];
  const isLastLine = lineIndex === lines.length - 1;

  function advanceOrGo(next: ScreenId) {
    if (!isLastLine) {
      setLineIndex((i) => i + 1);
      return;
    }
    geheZu(next);
  }

  // Opus-Review, 2026-09-07, Abschnitt 3.1 (siehe claude/review_logik_grafik_
  // audiofuehrung.md): siehe ausführlicher Kommentar in Quest1.tsx. Screen 0 bleibt
  // bewusst ausgenommen (ganzflächig tap-gesteuert, wie bei Quest 2-5).
  // Gerätetest 2026-09-11 (Nutzerwunsch "die Vorstellung bis zur Verwandlung sollte
  // automatisch laufen"): Screen 0 ist nicht mehr ausgenommen — er blättert von selbst durch
  // und geht nach seiner letzten Zeile ohne Antippen zu Screen 1 (siehe screen0Weiter).
  const autoWeiter = screen !== "verwandlung";
  // Paket 2: interaktive letzte Zeilen der Schach-Screens — erster Durchlauf sagt die
  // eigentliche Zeile, jede 8-Sekunden-Erinnerung danach eine Variante aus dem Pool.
  const erinnerungsStand = useRef<{ schluessel: string; n: number }>({ schluessel: "", n: 0 });
  function mitErinnerung(primaer: string, pool: string[], schluessel: string) {
    return () => {
      if (erinnerungsStand.current.schluessel !== schluessel) erinnerungsStand.current = { schluessel, n: 0 };
      const n = erinnerungsStand.current.n++;
      return n === 0 ? primaer : pool[(n - 1) % pool.length];
    };
  }

  const normalerSchluessel =
    screen === 2 ? `2-${movePhase}-${lineIndex}` : screen === 5 ? `5-${miniIndex}-${lineIndex}` : `${screen}-${lineIndex}`;
  // Sprechblasen-Rollout (2026-09-09): einmal berechnet und auch an LuxSprechblase
  // weitergereicht, siehe identische Verdrahtung in Quest1.tsx.
  const zeilenSchluessel = einschub ? `einschub-${einschub.id}` : normalerSchluessel;
  // Sprach-Harmonie-Review (2026-09-09, siehe lib/luxVarianten.ts): rotierende Varianten
  // für die drei Screen-2-Stellen, die sonst wortidentisch zu den anderen Abenteuern wären.
  const zeileZuSprechen = einschub
    ? einschub.text
    : screen === 2 && movePhase === "uebung"
      ? () => luxVariante(UEBUNG_HINWEIS_VARIANTEN, "uebung-hinweis")
      : screen === 2 && movePhase === "interaktiv" && isLastLine
        ? () => luxVariante(INTERAKTIV_HINWEIS_VARIANTEN, "interaktiv-hinweis")
        : screen === 2 && movePhase === "fertig"
          ? () => luxVariante(FERTIG_LOB_VARIANTEN, "fertig-lob")
          : screen === 4 && isLastLine
            ? mitErinnerung(lines[lineIndex], BRUECKE_ERINNERUNG, normalerSchluessel)
            : screen === 5 && isLastLine
              ? mitErinnerung(lines[lineIndex], MINI_ERINNERUNG, normalerSchluessel)
              : lines[lineIndex];

  // Was passiert, wenn Lux die aktuelle Zeile fertig gesprochen hat.
  const beiZeilenende: (() => void) | undefined = einschub
    ? () => {
        const danach = einschub.danach;
        setEinschub(null);
        danach?.();
      }
    : screen === "mattFeier" && isLastLine
      ? () => {
          geheZu(7);
          handleQuestComplete();
        }
      : autoWeiter && !isLastLine
        ? () => setLineIndex((i) => i + 1)
        : screen === 0 && isLastLine
          ? () => setTimeout(() => geheZu(1), 700)
          : undefined;

  // Sterne-Logik "Eigenständigkeit zählt" (Nutzerentscheidung 2026-09-09): zählt über die
  // gesamte Quest hinweg, wie oft Lux' 8-Sekunden-Erinnerung einspringen musste. Paket 2:
  // gilt auch für die Schach-Brücke und das Mini-Spiel; eingeschobene Zeilen (Stopp!,
  // Rückmeldungen) lösen nie eine Erinnerung aus und zählen daher nicht.
  const erinnerungenRef = useRef(0);
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(zeilenSchluessel, zeileZuSprechen, beiZeilenende, {
    onErinnerung: () => {
      erinnerungenRef.current += 1;
    },
  });
  // Echter Eltern-Dashboard-Schalter statt der früheren ZEIGE_UNTERTITEL-Konstante,
  // siehe src/lib/untertitelEinstellung.ts.
  const zeigeUntertitel = useUntertitelAktiv();

  async function handleQuestComplete() {
    // 0 Erinnerungen → 3 Sterne (ganz eigenständig), 1-2 → 2 Sterne, ab 3 → 1 Stern.
    const sterne: 0 | 1 | 2 | 3 =
      erinnerungenRef.current === 0 ? 3 : erinnerungenRef.current <= 2 ? 2 : 1;
    await saveQuestFortschrittLocal("quest6", { sterne, abgeschlossen: true, letzterSchritt: "screen7" });
  }

  const brettAktiv = isLastLine && !einschub;

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
          echte, einteilige SVG-Sprechblase — Text hinter dem Eltern-Untertitel-Schalter. */}
      {zeigeUntertitel && (
        <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={zeilenSchluessel} style={styles.sprechblase} />
      )}

      {/* Screen 0 läuft seit dem Gerätetest 2026-09-11 von selbst weiter (kein Tipp-Bereich mehr). */}
      {screen === 0 && (
        <View style={styles.tapArea}>
          <Einschweben sichtbar={lineIndex >= 1}>
            <QuestTierIcon quest="quest6" size={150} />
          </Einschweben>
        </View>
      )}
      {screen === 1 && (
        // Update (2026-09-08, Task #110, siehe Quest1.tsx-Kommentar zum identischen
        // Muster): Pressable direkt am Hirsch-Icon, LuxAtem lässt ihn pulsieren,
        // disabled={!isLastLine} sperrt Taps bis zur letzten Zeile.
        <View style={styles.tapArea}>
          <Pressable
            onPress={() => advanceOrGo("verwandlung")}
            disabled={!isLastLine}
            hitSlop={{ top: 24, left: 24, right: 24, bottom: 24 }}
            accessibilityLabel="Den Hirsch antippen, um die Verwandlung zu sehen"
          >
            <LuxAtem dauer={900} betrag={1.08}>
              <QuestTierIcon quest="quest6" size={150} />
            </LuxAtem>
          </Pressable>
        </View>
      )}

      {screen === "verwandlung" && (
        <Verwandlung
          figur={<KoenigMasterGrossIcon size={150} />}
          tier={<QuestTierIcon quest="quest6" size={150} />}
          grossGroesse={150}
          kleinGroesse={34}
          onDone={() => geheZu(2)}
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
          onSolved={() => geheZu(3)}
        />
      )}

      {screen === 3 && (
        <QuestMoveScreen
          fen={QUEST6_POSITIONS.screen5Capture}
          pieceAt={PIECE_AT}
          // Bugfix (2026-09-09): pieceIcon fehlte hier früher (roter Punkt statt König).
          pieceIcon={<KoenigMasterIcon />}
          // Kein Schach hier — ganz normales Schlagen wie bei jeder anderen Figur auch.
          opponentAt={{ row: 3, col: 4 }} // e5
          opponentIcon={<SpringerMasterDunkelIcon />}
          onSolved={() => geheZu(4)}
        />
      )}

      {screen === 4 && (
        <SchachAufgabe
          fen={QUEST6_POSITIONS.schachBruecke}
          startAt={fromAlgebraic("e1")}
          zeigeSchach
          interaktiv={brettAktiv}
          demoZug={einschub ? undefined : BRUECKE_DEMOS[lineIndex]}
          // Stopp!-Aufgabe (Design-Grundsatz 4): Läufer a4 → b3 hilft dem König nicht.
          stopp={{ von: fromAlgebraic("a4"), nach: fromAlgebraic("b3") }}
          onStopp={() => schiebeEin(STOPP_ZEILE)}
          onZug={(zug) => schiebeEin(WEG_ZEILE[zug.weg], () => {
            setMiniIndex(0);
            geheZu(5);
          })}
        />
      )}

      {screen === 5 && (
        <SchachAufgabe
          // Neue Instanz je Stellung, damit Auswahl und Zug-Zustand zurückgesetzt werden.
          key={`mini-${miniIndex}`}
          fen={QUEST6_POSITIONS.miniSpiel[miniIndex]}
          startAt={miniKoenigAt(miniIndex)}
          zeigeSchach
          interaktiv={brettAktiv}
          onZug={(zug) => {
            const rueckmeldung =
              MINI_SPIEL[miniIndex].nach ??
              (miniIndex === MINI_SPIEL.length - 1
                ? zug.weg === "schlagen"
                  ? MINI_BESTER_WEG.schlagen
                  : MINI_BESTER_WEG.sonst
                : WEG_ZEILE[zug.weg]);
            schiebeEin(rueckmeldung, () => {
              if (miniIndex < MINI_SPIEL.length - 1) {
                setMiniIndex(miniIndex + 1);
                setLineIndex(0);
              } else {
                schiebeEin(MINI_ABSCHLUSS, () => geheZu(6));
              }
            });
          }}
        />
      )}

      {screen === 6 && (
        <SchachAufgabe
          fen={QUEST6_POSITIONS.mattMoment}
          startAt={fromAlgebraic("a1")}
          interaktiv={brettAktiv}
          // Nur der Mattzug leuchtet — hier geht es um den Begriff, nicht ums Suchen.
          nurZuege={[{ von: fromAlgebraic("a1"), nach: fromAlgebraic("a8") }]}
          onZug={() =>
            schiebeEin(
              "Schach – und er kann nirgends mehr hin. Kein Schritt zur Seite, niemand kann sich dazwischenstellen, niemand kann den Turm wegnehmen.",
              () => schiebeEin("In der Schachwelt heißt das: Matt.", () => geheZu("mattFeier"))
            )
          }
        />
      )}

      {screen === "mattFeier" && <MattMomentFeier />}

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

// Eigener König in den Mini-Spiel-Stellungen — Startauswahl, damit das Kind zuerst sieht,
// ob der König selbst weggehen kann (bei P2/P3 leuchtet dann nichts: die Lösung ist eine
// andere Figur, die das Kind selbst antippen muss).
function miniKoenigAt(index: number): BoardSquare {
  return [fromAlgebraic("e4"), fromAlgebraic("a1"), fromAlgebraic("h1"), fromAlgebraic("d1")][index];
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
