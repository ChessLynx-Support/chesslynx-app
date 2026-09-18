// Wisent-Boss-Puzzle — das Pflicht-Herzstück des Wisent-Kampfs (siehe Claude-Projekt
// "ChessLynx", claude/gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 8, und
// claude/wisent_kampf_verdrahtung_2026-09-15.md für den vollen Umfangs-Abgleich). "Matt in 2 +
// Fesselung" und das kuratierte Mehr-Mechaniken-Boss-Puzzle sind laut Konzept EIN UND DASSELBE
// kombinierte Puzzle, kein separates Zusatzraster.
//
// Sieben Screens, exakt nach obigem Dokument:
//   0 Anmoderation        — statisches Brett, keine Interaktion.
//   1 Entdecken: Fesselung        — dieselbe Stellung, jetzt MIT Kettenlinie-Signal
//                                    (Wächter-Turm e7 an seinen eigenen König e8 gefesselt).
//   2 Entdecken: scheinbare Deckung — reine Erzähl-Zeile, keine neue Brett-Änderung.
//   3 Kernaufgabe, Zug 1  — Dame a2 schlägt den Bauern f7 (Schach). NICHT vom Kind getippt:
//                            die erzwungene schwarze Antwort (Kd7 — geprüft die einzige
//                            legale Antwort, siehe chessEngine.ts/WISENT_BOSS_POSITION) wird
//                            automatisch im `game`-Objekt nachvollzogen und als eigene,
//                            nicht-interaktive Teilzug-Ansicht erzählt (derselbe Zwei-Teilzug-
//                            Aufbau wie in bonus/MattIn2.tsx, hier aber mit einem NICHT vom
//                            Kind ausgeführten zweiten Teilzug).
//   4 Kernaufgabe, Zug 2  — Dame f7 setzt matt, entweder nach d5 oder durch Schlagen auf e7
//                            (beide gegen echtes chess.js als Matt bestätigt, siehe
//                            chessEngine.ts). Eine dritte, im Konzept genannte Mattmöglichkeit
//                            (Re1-d1#) ist bewusst NICHT als dritte Tipp-Option übernommen —
//                            siehe ausführliche Begründung im WISENT_BOSS_POSITION-Kommentar.
//   5 Würdigung           — reine Erzähl-Zeile vor der finalen Mattstellung.
//   6 Abschluss           — 3 Sterne fest vergeben (kein Sterne-Raster, kein Puzzle-Icon-
//                            Ziel wie bei den übrigen Bonuskapiteln), KEINE eigene gesprochene
//                            Zeile (siehe content/sprachexport_2026-09-10/: die CSV endet mit
//                            `wisent.boss.wuerdigung`, es gibt keine zehnte Zeile für diesen
//                            Screen — echte TTS-Lücke im Konzept, kein Versehen dieser Runde).
//
// Bewusst OHNE QuestMoveScreen (wie schon Fesselung.tsx/Rochade.tsx/MattIn2.tsx) — Screen 3/4
// brauchen einen lokalen Zwei-Teilzug-Zustand (`teilzug`) innerhalb je eines Screens.
//
// `game` ist bewusst `new Chess(...)` OHNE `skipValidation` (nicht `createPosition()`, siehe
// dortiger Kommentar) — die Stellung ist vollständig und gültig, das soll im Code sichtbar
// bleiben, genau wie in `lib/EndlosmodusPuzzle.tsx` begründet. Anders als bei den übrigen
// Bonuskapiteln lebt `game` hier über MEHRERE Screens hinweg (3 und 4 teilen sich denselben
// Zustand, inklusive der automatisch nachvollzogenen schwarzen Antwort) — deshalb `useMemo`
// mit leerer Dependency-Liste statt je Screen neu erzeugt.
//
// Kulisse: `WaldHintergrund` als Platzhalter (dieselbe, die auch Revier.tsx nutzt) — die
// eigentliche Wisentfeste-Kulisse (Asset E10) ist noch nicht beauftragt, siehe
// claude/update1_vorzug_plan_2026-09-15.md, Abschnitt 2.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Chess } from "chess.js";
import { WISENT_BOSS_POSITION, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board } from "../quest1/Board";
import { saveBonusFortschrittLocal } from "../lib/storage";
import {
  KoenigMasterIcon,
  KoenigMasterDunkelIcon,
  TurmMasterIcon,
  TurmMasterDunkelIcon,
  LaeuferMasterIcon,
  SpringerMasterIcon,
  DameMasterIcon,
  BauerMasterDunkelIcon,
} from "../lib/pieceMasters";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { Sternensaeule } from "../lib/sternenleiter";

// --- Feste Feldkoordinaten (siehe chessEngine.ts/WISENT_BOSS_POSITION-Kommentar für die FEN:
// "4k3/N3rp2/8/B6B/8/8/Q7/4R1K1 w - - 0 1") ----------------------------------------------
const KOENIG_EIGENER: BoardSquare = { row: 7, col: 6 }; // g1
const TURM_EIGENER: BoardSquare = { row: 7, col: 4 }; // e1 — der (zu Beginn irrelevante) Turm,
// dessen alternativer Mattzug (Rd1#) bewusst nicht angeboten wird, siehe Datei-Kopfkommentar.
const DAME_START: BoardSquare = { row: 6, col: 0 }; // a2
const DAME_NACH_ZUG1: BoardSquare = { row: 1, col: 5 }; // f7 — Zielfeld Zug 1, zugleich
// Ausgangsfeld der Dame für Zug 2.
const LAEUFER_A: BoardSquare = { row: 3, col: 0 }; // a5
const LAEUFER_H: BoardSquare = { row: 3, col: 7 }; // h5
const SPRINGER_EIGENER: BoardSquare = { row: 1, col: 0 }; // a7
const KOENIG_GEGNER_START: BoardSquare = { row: 0, col: 4 }; // e8
const KOENIG_GEGNER_AUSGEWICHEN: BoardSquare = { row: 1, col: 3 }; // d7 — einzige legale
// Antwort auf Zug 1, siehe Kopfkommentar.
const TURM_GEGNER: BoardSquare = { row: 1, col: 4 }; // e7 — gefesselter Wächter-Turm; zugleich
// eines der beiden Zug-2-Zielfelder (Qxe7#).
const BAUER_GEGNER: BoardSquare = { row: 1, col: 5 }; // f7 — Zielfeld Zug 1 (= DAME_NACH_ZUG1).
const ZIEL_ZUG2_D5: BoardSquare = { row: 3, col: 3 }; // d5 — anderes Zug-2-Zielfeld (Qd5#).

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Teilzug = 0 | 1;

// Sprechzeilen für Screens 3/4 hängen vom Teilzug ab (Aufgabe vs. Ergebnis-Erzählung) — wie in
// bonus/MattIn2.tsx deshalb als Funktion statt starrer Tabelle.
function zeilenFuer(screen: ScreenId, teilzug: Teilzug): string[] {
  switch (screen) {
    case 0:
      return [
        "Vor dir steht der Wisent – der klügste und stärkste Schachmeister im ganzen Wald.",
        "Er möchte sehen, was du gelernt hast – mit seiner schwierigsten Aufgabe. Bist du bereit?",
      ];
    case 1:
      return ["Schau genau hin: Sein Wächter-Turm ist gefesselt. Er darf sich nicht von dieser Linie wegbewegen."];
    case 2:
      return ["Der Turm möchte diesen Bauern beschützen. Aber er ist gefesselt – er darf gar nicht hin!"];
    case 3:
      return teilzug === 0
        ? ["Trau dich! Der Wächter kann nicht helfen – nimm den Bauern!"]
        : ["Schach! Der Wisent muss ausweichen — er hat keine andere Wahl."];
    case 4:
      return teilzug === 0
        ? ["Jetzt kommt der entscheidende Moment – findest du das letzte Feld?"]
        : ["Matt! Zwei kluge Züge – genau wie du es schon geübt hast!"];
    case 5:
      return ["Der Wisent neigt respektvoll den Kopf. So klug hat noch niemand mit ihm gespielt."];
    default:
      return [];
  }
}

// Automatischer Screen-Übergang nach der jeweils letzten Zeile — dasselbe Muster wie
// `NAECHSTER_SCREEN_NACH_EINFUEHRUNG`/`UEBERGANGS_PAUSE_MS` in bonus/MattIn2.tsx, hier aber
// nicht nur für die Einführung, sondern für jeden reinen Erzähl-Schritt (Screens 1/2/5 sowie
// die jeweils NICHT-interaktiven Teilzug-1-Ansichten von Screen 3/4).
function naechsterUebergangsScreen(screen: ScreenId, teilzug: Teilzug): ScreenId | undefined {
  if (screen === 0) return 1;
  if (screen === 1) return 2;
  if (screen === 2) return 3;
  if (screen === 3 && teilzug === 1) return 4;
  if (screen === 4 && teilzug === 1) return 5;
  if (screen === 5) return 6;
  return undefined;
}
const UEBERGANGS_PAUSE_MS = 1800;

// Aktive Zugaufgaben für die "Lux fragen"-Hinweisfunktion: nur Teilzug 0 von Screen 3/4 (der
// jeweils vom Kind selbst zu tippende Zug) — Teilzug 1 ist reine Erzählung, kein Hinweis nötig.
function istZugaufgabe(screen: ScreenId, teilzug: Teilzug): boolean {
  return (screen === 3 || screen === 4) && teilzug === 0;
}

function hinweisInhaltFuer(screen: ScreenId): string {
  if (screen === 3) return "Tipp auf den Bauern. Die Dame schlägt ihn und gibt Schach!";
  return "Tipp auf eines der beiden leuchtenden Felder — beide setzen matt!";
}

export default function WisentKampf() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [teilzug, setTeilzug] = useState<Teilzug>(0);
  // Screen 4: merkt sich, welches der beiden Zug-2-Zielfelder das Kind gewählt hat, damit
  // Teilzug 1 die Dame am richtigen Feld zeigt (und den geschlagenen Turm ggf. weglässt).
  const [zielZug2, setZielZug2] = useState<BoardSquare>(ZIEL_ZUG2_D5);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();

  const lines = zeilenFuer(screen, teilzug);
  const isLastLine = lineIndex === lines.length - 1;

  useEffect(() => {
    setHinweisPhase("still");
  }, [screen, teilzug]);

  function gehZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
  }

  // 2026-09-18 (Christian: Einführungen/Erklärungen dürfen nicht überspringbar und während
  // sie laufen nicht per Eingabe unterbrechbar sein, "Zurück" bleibt die einzige Ausnahme —
  // siehe ausführliche Begründung in bonus/Fesselung.tsx): Der frühere manuelle
  // "Weitertippen"-Weg (`tippeWeiter`, per `Pressable` auf den reinen Erzähl-Screens 0/1/2/5)
  // ist ersatzlos entfernt. Die Screens laufen ausschließlich über das an echtes Sprechende
  // gekoppelte `onFertig`/`naechsterUebergangsScreen` weiter.

  useEffect(() => {
    setTeilzug(0);
    setZielZug2(ZIEL_ZUG2_D5);
  }, [screen]);

  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  const zugaufgabeAktiv = istZugaufgabe(screen, teilzug);
  const zeigeZielringe = !hinweiseAktiv || hinweisPhase === "hinweis";
  const sprechSchluessel =
    hinweisPhase === "still" ? `${screen}-${teilzug}-${lineIndex}` : `${screen}-${teilzug}-${hinweisPhase}`;
  const sprechZeile =
    hinweisPhase === "still"
      ? lines[lineIndex]
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : hinweisInhaltFuer(screen);
  const naechsterScreen = naechsterUebergangsScreen(screen, teilzug);
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    sprechSchluessel,
    sprechZeile,
    hinweisPhase === "still"
      ? !isLastLine
        ? () => setLineIndex((i) => i + 1)
        : naechsterScreen !== undefined
          ? () => {
              uebergangsTimer.current = setTimeout(() => gehZu(naechsterScreen), UEBERGANGS_PAUSE_MS);
            }
          : undefined
      : undefined
  );
  const zeigeUntertitel = useUntertitelAktiv();

  function handleLuxTap() {
    if (!hinweiseAktiv || !zugaufgabeAktiv || hinweisPhase === "hinweis") {
      wiederholen();
      return;
    }
    setHinweisPhase(hinweisPhase === "still" ? "angebot" : "hinweis");
  }

  // Eine einzige `game`-Instanz für den gesamten Screen-Ablauf (siehe Datei-Kopfkommentar) —
  // anders als in den übrigen Bonuskapiteln NICHT je Screen neu erzeugt, weil Screen 3 und 4
  // sich denselben fortlaufenden Partieverlauf teilen (inklusive der automatisch
  // nachvollzogenen schwarzen Antwort nach Zug 1).
  const game = useMemo(() => new Chess(WISENT_BOSS_POSITION.hauptstellung), []);

  async function handleKapitelAbgeschlossen() {
    await saveBonusFortschrittLocal("wisentKampf", true);
  }

  function handleZug1(target: BoardSquare) {
    tryMove(game, DAME_START, target);
    // Die erzwungene schwarze Antwort: laut chessEngine.ts/WISENT_BOSS_POSITION-Kommentar
    // (gegen echtes chess.js geprüft) bleibt nach Qxf7+ genau EIN legaler Zug übrig (Kd7).
    // Defensiv trotzdem über `game.moves()` abgefragt statt die Koordinate hart zu kodieren,
    // damit ein künftiger Stellungswechsel hier nicht still falsch würde, sondern über
    // `npm test`/ein manuelles Durchspielen auffiele.
    const antworten = game.moves({ verbose: true });
    if (antworten.length > 0) game.move(antworten[0].san);
    setTeilzug(1);
  }

  function handleZug2(target: BoardSquare) {
    tryMove(game, DAME_NACH_ZUG1, target);
    setZielZug2(target);
    setTeilzug(1);
  }

  // Zusatzfiguren, die auf JEDEM Screen unverändert stehen (eigene Nebenfiguren + je nach
  // Fortschritt die gegnerischen Figuren) — als Funktion, um Wiederholung in den sieben
  // Screen-Konfigurationen unten zu vermeiden.
  function eigeneNebenfiguren() {
    return [
      { at: KOENIG_EIGENER, icon: <KoenigMasterIcon /> },
      { at: TURM_EIGENER, icon: <TurmMasterIcon /> },
      { at: LAEUFER_A, icon: <LaeuferMasterIcon /> },
      { at: LAEUFER_H, icon: <LaeuferMasterIcon /> },
      { at: SPRINGER_EIGENER, icon: <SpringerMasterIcon /> },
    ];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund />
      <Pressable
        style={styles.luxCorner}
        onPress={handleLuxTap}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {zeigeUntertitel && screen !== 6 && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{aktuelleZeile}</Text>
        </View>
      )}

      {/* Screen 0 — Anmoderation: statisches Brett, volle Ausgangsstellung. Läuft ausschließlich
          über das automatische Sprechende-Signal weiter, siehe Kommentar bei `tippeWeiter`
          oben — kein Antippen mehr, damit die Einführung nicht überspringbar ist. */}
      {screen === 0 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: DAME_START,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                ...eigeneNebenfiguren(),
                { at: KOENIG_GEGNER_START, icon: <KoenigMasterDunkelIcon /> },
                { at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> },
                { at: BAUER_GEGNER, icon: <BauerMasterDunkelIcon /> },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 1 — Entdecken: Fesselung. Dieselbe Stellung, jetzt mit Kettenlinie-Signal
          (eigener Turm e1 bis fremder König e8 — der gefesselte Wächter steht dazwischen auf
          e7, genau wie in bonus/Fesselung.tsx etabliert). */}
      {screen === 1 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: DAME_START,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                ...eigeneNebenfiguren(),
                { at: KOENIG_GEGNER_START, icon: <KoenigMasterDunkelIcon /> },
                { at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> },
                { at: BAUER_GEGNER, icon: <BauerMasterDunkelIcon /> },
              ],
              kettenlinie: { von: TURM_EIGENER, bis: KOENIG_GEGNER_START },
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 2 — Entdecken: die scheinbare Deckung. Reine Erzähl-Zeile, Brett unverändert
          (Kettenlinie bleibt sichtbar — sie gilt weiterhin). */}
      {screen === 2 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: DAME_START,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                ...eigeneNebenfiguren(),
                { at: KOENIG_GEGNER_START, icon: <KoenigMasterDunkelIcon /> },
                { at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> },
                { at: BAUER_GEGNER, icon: <BauerMasterDunkelIcon /> },
              ],
              kettenlinie: { von: TURM_EIGENER, bis: KOENIG_GEGNER_START },
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 3, Teilzug 0 — Kernaufgabe Zug 1 (interaktiv): Dame schlägt den Bauern f7. */}
      {screen === 3 && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: DAME_START,
            legalTargets: [BAUER_GEGNER],
            zeigeZielringe,
            pieceIcon: <DameMasterIcon />,
            opponentAt: BAUER_GEGNER,
            opponentIcon: <BauerMasterDunkelIcon />,
            zusatzfiguren: [
              ...eigeneNebenfiguren(),
              { at: KOENIG_GEGNER_START, icon: <KoenigMasterDunkelIcon /> },
              { at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> },
            ],
            kettenlinie: { von: TURM_EIGENER, bis: KOENIG_GEGNER_START },
          }}
          onCorrectMove={handleZug1}
        />
      )}
      {/* Screen 3, Teilzug 1 — reine Erzählung der erzwungenen Antwort, nicht interaktiv:
          König bereits auf d7, Dame bereits auf f7. Läuft ausschließlich über das
          automatische Sprechende-Signal weiter, siehe Kommentar bei `tippeWeiter` oben. */}
      {screen === 3 && teilzug === 1 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: DAME_NACH_ZUG1,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                ...eigeneNebenfiguren(),
                { at: KOENIG_GEGNER_AUSGEWICHEN, icon: <KoenigMasterDunkelIcon /> },
                { at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 4, Teilzug 0 — Kernaufgabe Zug 2 (interaktiv): Dame setzt matt, nach d5 ODER
          durch Schlagen auf e7 — beide Zielfelder gleichwertig antippbar (dieselbe
          "Gleichwertigkeit + Wahl"-Idee wie in bonus/MattIn2.tsx, Screen 3). */}
      {screen === 4 && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: DAME_NACH_ZUG1,
            legalTargets: [ZIEL_ZUG2_D5, TURM_GEGNER],
            zeigeZielringe,
            pieceIcon: <DameMasterIcon />,
            opponentAt: TURM_GEGNER,
            opponentIcon: <TurmMasterDunkelIcon />,
            zusatzfiguren: [
              ...eigeneNebenfiguren(),
              { at: KOENIG_GEGNER_AUSGEWICHEN, icon: <KoenigMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={handleZug2}
        />
      )}
      {/* Screen 4, Teilzug 1 — finale Mattstellung, nicht interaktiv. Turm e7 bleibt nur
          stehen, wenn das Kind NICHT geschlagen hat (Ziel war d5). Läuft ausschließlich über
          das automatische Sprechende-Signal weiter, siehe Kommentar bei `tippeWeiter` oben. */}
      {screen === 4 && teilzug === 1 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: zielZug2,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                ...eigeneNebenfiguren(),
                { at: KOENIG_GEGNER_AUSGEWICHEN, icon: <KoenigMasterDunkelIcon /> },
                ...(zielZug2.row === TURM_GEGNER.row && zielZug2.col === TURM_GEGNER.col
                  ? []
                  : [{ at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> }]),
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 5 — Würdigung: finale Mattstellung bleibt sichtbar, reine Erzähl-Zeile. Läuft
          ausschließlich über das automatische Sprechende-Signal weiter. */}
      {screen === 5 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: zielZug2,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                ...eigeneNebenfiguren(),
                { at: KOENIG_GEGNER_AUSGEWICHEN, icon: <KoenigMasterDunkelIcon /> },
                ...(zielZug2.row === TURM_GEGNER.row && zielZug2.col === TURM_GEGNER.col
                  ? []
                  : [{ at: TURM_GEGNER, icon: <TurmMasterDunkelIcon /> }]),
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 6 — Abschluss: 3 Sterne fest vergeben (kein Sterne-Raster), keine eigene
          gesprochene Zeile (siehe Datei-Kopfkommentar). Navigationsziel vorerst KidHome — der
          Kür-Auswahl-Hub und der Motto-Moment existieren noch nicht (siehe
          claude/wisent_kampf_verdrahtung_2026-09-15.md), das hier ist bewusst ein
          Übergangsziel, kein Ersatz dafür. */}
      {screen === 6 && (
        <Pressable
          style={styles.tapArea}
          onPress={() => {
            handleKapitelAbgeschlossen();
            navigation.navigate("KidHome");
          }}
        >
          <QuestGeschafft>
            <Sternensaeule wert={3} groesse={40} />
          </QuestGeschafft>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
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
