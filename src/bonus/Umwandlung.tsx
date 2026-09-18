// Umwandlungs-Kür — optionale, nicht gate-pflichtige Wisent-Kür, siehe Claude-Projekt
// "ChessLynx", claude/gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 5, und
// claude/wisent_kuer_verdrahtung_2026-09-15.md für den vollen Umsetzungs-Abgleich. Erreichbar
// AUSSCHLIESSLICH über screens/WisentKuerHub.tsx — der frühere eigene "Einladung"-Screen
// entfällt laut Konzept, der Hub übernimmt diese Rolle (siehe dortiger Abschnitt 4).
//
// Drei Screens, exakt nach obigem Dokument:
//   0 Entdecken (Auto-Demo, statisches Brett, keine Interaktion) — erklärt die Umwandlung
//     allgemein, ohne dass das Kind schon selbst zieht.
//   1 Kür-Aufgabe (interaktiv, Teilzug 0) — Bauer zieht auf die letzte Reihe. Teilzug 1:
//     nicht-interaktive Ergebnis-Erzählung (Dame steht jetzt da, König "darf raus").
//   2 Abschluss — Abzeichen "Kronen-Bauer", zurück zum Kür-Auswahl-Hub.
//
// Automatische Damen-Umwandlung: KEINE Auswahl-UI (siehe chessEngine.ts/
// UMWANDLUNGS_KUER_POSITION-Kommentar) — `tryMove()` übergibt immer `promotion: "q"`, das
// genügt hier vollständig.
//
// ZWEI Stellungs-Varianten (hauptstellung/variante2) — NICHT zwei verschiedene Rätsel,
// sondern dieselbe Aufgabe an anderer Stelle des Bretts, gezeigt beim zweiten+ Besuch (siehe
// storage.ts/holeUndSchalteKuerVariante und Konzept Abschnitt 4, "Wiederholungs-Hinweis bei
// bereits abgeschlossener Kür"). `warSchonAbgeschlossen` (geladen VOR dem Speichern dieses
// Durchlaufs) entscheidet, ob Screen 0 die zusätzliche Wiederholungs-Zeile bekommt.
//
// Bewusst OHNE QuestMoveScreen (wie alle Bonuskapitel/Kürs) — braucht einen lokalen
// Zwei-Teilzug-Zustand innerhalb Screen 1, genau wie bonus/MattIn2.tsx/screens/WisentKampf.tsx.
// `game` ist bewusst `new Chess(...)` OHNE `skipValidation` (nicht `createPosition()`) — die
// Stellung ist vollständig und gültig, siehe lib/EndlosmodusPuzzle.tsx-Kopfkommentar für die
// Begründung dieser Konvention.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Chess } from "chess.js";
import { UMWANDLUNGS_KUER_POSITION, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board } from "../quest1/Board";
import { saveBonusFortschrittLocal, loadBonusFortschrittLocal, holeUndSchalteKuerVariante } from "../lib/storage";
import { KoenigMasterIcon, KoenigMasterDunkelIcon, BauerMasterIcon, DameMasterIcon } from "../lib/pieceMasters";
import { KronenBauerIcon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { luxVariante, KUER_WIEDERHOLUNG_VARIANTEN } from "../lib/luxVarianten";
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

type VarianteId = 1 | 2;

type VarianteDaten = {
  fen: string;
  bauerStart: BoardSquare;
  bauerZiel: BoardSquare; // Umwandlungsfeld, zugleich Matt-Feld.
  eigenerKoenig: BoardSquare;
  gegnerKoenig: BoardSquare;
};

// Siehe chessEngine.ts/UMWANDLUNGS_KUER_POSITION-Kommentar für die FENs und die Bestätigung
// gegen echtes chess.js (f7-f8=Q# bzw. c7-c8=Q#, beide Matt).
const VARIANTEN: Record<VarianteId, VarianteDaten> = {
  1: {
    fen: UMWANDLUNGS_KUER_POSITION.hauptstellung,
    bauerStart: { row: 1, col: 5 }, // f7
    bauerZiel: { row: 0, col: 5 }, // f8
    eigenerKoenig: { row: 2, col: 6 }, // g6
    gegnerKoenig: { row: 0, col: 7 }, // h8
  },
  2: {
    fen: UMWANDLUNGS_KUER_POSITION.variante2,
    bauerStart: { row: 1, col: 2 }, // c7
    bauerZiel: { row: 0, col: 2 }, // c8
    eigenerKoenig: { row: 2, col: 1 }, // b6
    gegnerKoenig: { row: 0, col: 0 }, // a8
  },
};

type ScreenId = 0 | 1 | 2;
type Teilzug = 0 | 1;
const UEBERGANGS_PAUSE_MS = 1800;

// Platzhalter statt direktem `luxVariante(...)`-Aufruf in `zeilenFuer` unten — siehe
// lib/luxVarianten.ts-Kopfkommentar: `luxVariante` darf NUR an der Stelle aufgerufen werden,
// an der eine Zeile tatsächlich (erneut) GESPROCHEN wird, sonst zählt der rotierende Pool bei
// jedem Rerender weiter statt nur bei echten Sprechvorgängen. `zeilenFuer` wird dagegen bei
// jedem Render aufgerufen (u. a. für `lines.length`/`isLastLine`). Aufgelöst wird der
// Platzhalter deshalb erst in `zeileAufloesen` unten, das NUR innerhalb der an
// useLuxSprechzeile übergebenen lazy Funktion läuft — dieselbe Technik wie
// `zeileMitVariante`/ENTKOMMEN_VARIANTEN in bonus/MattIn3.tsx.
const WIEDERHOLUNG_PLATZHALTER = "__KUER_WIEDERHOLUNG__";

function zeileAufloesen(basis: string): string {
  return basis === WIEDERHOLUNG_PLATZHALTER ? luxVariante(KUER_WIEDERHOLUNG_VARIANTEN, "kuer-wiederholung") : basis;
}

function zeilenFuer(screen: ScreenId, teilzug: Teilzug, warSchonAbgeschlossen: boolean): string[] {
  switch (screen) {
    case 0: {
      const basis = [
        "Schau: Wenn ein Bauer ganz bis zur letzten Reihe kommt, darf er eine andere Figur werden!",
        "Meistens nimmt man die Dame – die stärkste von allen. In der Schachwelt heißt das: Umwandlung.",
      ];
      return warSchonAbgeschlossen ? [WIEDERHOLUNG_PLATZHALTER, ...basis] : basis;
    }
    case 1:
      return teilzug === 0
        ? ["Jetzt bist du dran! Zieh deinen Bauern ganz nach vorne."]
        : [
            "Und schon ist er eine Dame! Und schau – gleich Matt. Der König darf raus aus seiner Ecke!",
            "Später darfst du sogar aussuchen, was aus deinem Bauern wird.",
          ];
    case 2:
      return ["Du kennst jetzt die Umwandlung – die kann am Ende einer Partie alles entscheiden!"];
    default:
      return [];
  }
}

function naechsterUebergangsScreen(screen: ScreenId, teilzug: Teilzug): ScreenId | undefined {
  if (screen === 0) return 1;
  if (screen === 1 && teilzug === 1) return 2;
  return undefined;
}

function istZugaufgabe(screen: ScreenId, teilzug: Teilzug): boolean {
  return screen === 1 && teilzug === 0;
}

export default function Umwandlung() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [teilzug, setTeilzug] = useState<Teilzug>(0);
  const [variante, setVariante] = useState<VarianteId>(1);
  const [warSchonAbgeschlossen, setWarSchonAbgeschlossen] = useState(false);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();

  // Einmalig beim Mounten: welche Variante zeigen wir diesmal, und war die Kür vorher schon
  // abgeschlossen (bestimmt, ob Screen 0 die Wiederholungs-Zeile bekommt)? Reihenfolge wichtig:
  // `loadBonusFortschrittLocal` VOR dem späteren `saveBonusFortschrittLocal` dieses Durchlaufs
  // lesen, sonst wäre "schon abgeschlossen" nach dem eigenen Abschluss immer wahr.
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [v, schonAbgeschlossen] = await Promise.all([
        holeUndSchalteKuerVariante("umwandlung"),
        loadBonusFortschrittLocal("umwandlung"),
      ]);
      if (!abgebrochen) {
        setVariante(v);
        setWarSchonAbgeschlossen(schonAbgeschlossen);
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const daten = VARIANTEN[variante];
  const game = useMemo(() => new Chess(daten.fen), [daten.fen]);

  const lines = zeilenFuer(screen, teilzug, warSchonAbgeschlossen);
  const isLastLine = lineIndex === lines.length - 1;

  useEffect(() => {
    setHinweisPhase("still");
  }, [screen, teilzug]);

  useEffect(() => {
    setTeilzug(0);
  }, [screen]);

  function gehZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
  }

  // 2026-09-18 (Christian: Einführungen/Erklärungen dürfen nicht überspringbar und während
  // sie laufen nicht per Eingabe unterbrechbar sein, "Zurück" bleibt die einzige Ausnahme —
  // siehe ausführliche Begründung in bonus/Fesselung.tsx): Der frühere manuelle
  // "Weitertippen"-Weg (`tippeWeiter`, per `Pressable` auf den reinen Erzähl-Screens) ist
  // ersatzlos entfernt. Die Screens laufen ausschließlich über das an echtes Sprechende
  // gekoppelte `onFertig` weiter.

  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  const zugaufgabeAktiv = istZugaufgabe(screen, teilzug);
  const zeigeZielringe = !hinweiseAktiv || hinweisPhase === "hinweis";
  const sprechSchluessel =
    hinweisPhase === "still" ? `${screen}-${teilzug}-${lineIndex}-${variante}` : `${screen}-${teilzug}-${hinweisPhase}`;
  // Als lazy Funktion (nicht als bereits aufgelöster String) übergeben — siehe
  // WIEDERHOLUNG_PLATZHALTER-Kommentar oben: `zeileAufloesen`/`luxVariante` dürfen erst beim
  // tatsächlichen Sprechen laufen, nicht bei jedem Render.
  const sprechZeile = () =>
    hinweisPhase === "still"
      ? zeileAufloesen(lines[lineIndex])
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : "Tipp auf das leuchtende Feld ganz oben — dein Bauer darf dort hin!";
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

  async function handleKapitelAbgeschlossen() {
    await saveBonusFortschrittLocal("umwandlung", true);
  }

  function handleZug(target: BoardSquare) {
    tryMove(game, daten.bauerStart, target); // promotion: "q" steckt bereits fest in tryMove.
    setTeilzug(1);
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
      {zeigeUntertitel && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{aktuelleZeile}</Text>
        </View>
      )}

      {/* Screen 0 — Entdecken: statisches Brett, Bauer kurz vor der letzten Reihe. */}
      {screen === 0 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: daten.bauerStart,
              legalTargets: [],
              pieceIcon: <BauerMasterIcon />,
              zusatzfiguren: [
                { at: daten.eigenerKoenig, icon: <KoenigMasterIcon /> },
                { at: daten.gegnerKoenig, icon: <KoenigMasterDunkelIcon /> },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 1, Teilzug 0 — Kür-Aufgabe (interaktiv): Bauer zieht auf die letzte Reihe. */}
      {screen === 1 && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: daten.bauerStart,
            legalTargets: [daten.bauerZiel],
            zeigeZielringe,
            pieceIcon: <BauerMasterIcon />,
            zusatzfiguren: [
              { at: daten.eigenerKoenig, icon: <KoenigMasterIcon /> },
              { at: daten.gegnerKoenig, icon: <KoenigMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={handleZug}
        />
      )}
      {/* Screen 1, Teilzug 1 — Ergebnis-Erzählung, nicht interaktiv: aus dem Bauern ist eine
          Dame geworden. */}
      {screen === 1 && teilzug === 1 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: daten.bauerZiel,
              legalTargets: [],
              pieceIcon: <DameMasterIcon />,
              zusatzfiguren: [
                { at: daten.eigenerKoenig, icon: <KoenigMasterIcon /> },
                { at: daten.gegnerKoenig, icon: <KoenigMasterDunkelIcon /> },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 2 — Abschluss: Abzeichen "Kronen-Bauer", zurück zum Kür-Auswahl-Hub. */}
      {screen === 2 && (
        <Pressable
          style={styles.tapArea}
          onPress={() => {
            handleKapitelAbgeschlossen();
            navigation.navigate("WisentKuerHub");
          }}
        >
          <QuestGeschafft>
            <KronenBauerIcon size={92} />
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
