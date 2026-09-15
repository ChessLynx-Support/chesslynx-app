// En-passant-Kür — optionale, nicht gate-pflichtige Wisent-Kür, siehe Claude-Projekt
// "ChessLynx", claude/gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 6, und
// claude/wisent_kuer_verdrahtung_2026-09-15.md. Erreichbar AUSSCHLIESSLICH über
// screens/WisentKuerHub.tsx (kein eigener "Einladung"-Screen, siehe bonus/Umwandlung.tsx-
// Kopfkommentar für dieselbe Begründung).
//
// Drei Screens:
//   0 Entdecken (Vor-Animation + Erklärung) — der gegnerische Bauer ist GERADE zwei Felder
//     gesprungen. Rein KOSMETISCHE Vor-Animation beim Screen-Eintritt (siehe
//     `vorAnimationGezeigt` unten): der Bauer gleitet sichtbar von seinem Ausgangs- zum
//     Zielfeld, das erzeugt aber KEINEN echten chess.js-Zug — `game` startet direkt in der
//     Zielstellung aus chessEngine.ts/EN_PASSANT_KUER_POSITION. Erst danach wird das Brett
//     interaktiv (Screen 1).
//   1 Kür-Aufgabe (interaktiv, Teilzug 0) — Bauer schlägt im Vorbeigehen. Teilzug 1:
//     nicht-interaktive Ergebnis-Erzählung.
//   2 Abschluss — Abzeichen "Schatten-Sprung", zurück zum Kür-Auswahl-Hub.
//
// Board.tsx-Besonderheit, die diese Kür erst sauber möglich macht: `opponentAt`/`opponentIcon`
// sind an ein EIGENES Feld gebunden, unabhängig von `legalTargets` (siehe Board.tsx,
// `hasOpponent = k === opponentKey`, kein Abgleich gegen `legalKeys`). Für den Schlagzug im
// Vorbeigehen ist das genau richtig: die geschlagene gegnerische Figur (`opponentAt`) steht auf
// einem ANDEREN Feld als das Zielfeld des eigenen Bauern (`legalTargets`, das eigentlich
// leere Feld dahinter) — visuell exakt die echte Regel, ohne dass Board.tsx dafür angepasst
// werden musste.
//
// ZWEI Stellungs-Varianten, dieselbe Wiederholungs-Logik wie bonus/Umwandlung.tsx (siehe
// dortiger Kopfkommentar und storage.ts/holeUndSchalteKuerVariante) — geteilter
// Rotationspool KUER_WIEDERHOLUNG_VARIANTEN (lib/luxVarianten.ts).
//
// Bewusst OHNE QuestMoveScreen, `game` bewusst `new Chess(...)` ohne `skipValidation` — siehe
// bonus/Umwandlung.tsx-Kopfkommentar für dieselbe Begründung.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Chess } from "chess.js";
import { EN_PASSANT_KUER_POSITION, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board } from "../quest1/Board";
import { saveBonusFortschrittLocal, loadBonusFortschrittLocal, holeUndSchalteKuerVariante } from "../lib/storage";
import { KoenigMasterIcon, KoenigMasterDunkelIcon, BauerMasterIcon, BauerMasterDunkelIcon } from "../lib/pieceMasters";
import { SchattenSprungIcon } from "../lib/puzzleIcons";
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
  bauerEigenerStart: BoardSquare; // zieht/schlägt im Vorbeigehen.
  bauerZiel: BoardSquare; // das eigentlich leere Zielfeld dahinter.
  bauerGegnerVorSprung: BoardSquare; // Ausgangsfeld der kosmetischen Vor-Animation.
  bauerGegnerStellung: BoardSquare; // tatsächliche FEN-Stellung — auch Ende der Vor-Animation.
  eigenerKoenig: BoardSquare;
  gegnerKoenig: BoardSquare;
};

// Siehe chessEngine.ts/EN_PASSANT_KUER_POSITION-Kommentar für die FENs und die Bestätigung
// gegen echtes chess.js (e5xd6 e.p. bzw. f5xg6 e.p., je eine gegnerische Figur verschwindet).
const VARIANTEN: Record<VarianteId, VarianteDaten> = {
  1: {
    fen: EN_PASSANT_KUER_POSITION.hauptstellung,
    bauerEigenerStart: { row: 3, col: 4 }, // e5
    bauerZiel: { row: 2, col: 3 }, // d6
    bauerGegnerVorSprung: { row: 1, col: 3 }, // d7
    bauerGegnerStellung: { row: 3, col: 3 }, // d5
    eigenerKoenig: { row: 7, col: 4 }, // e1
    gegnerKoenig: { row: 0, col: 4 }, // e8
  },
  2: {
    fen: EN_PASSANT_KUER_POSITION.variante2,
    bauerEigenerStart: { row: 3, col: 5 }, // f5
    bauerZiel: { row: 2, col: 6 }, // g6
    bauerGegnerVorSprung: { row: 1, col: 6 }, // g7
    bauerGegnerStellung: { row: 3, col: 6 }, // g5
    eigenerKoenig: { row: 7, col: 4 }, // e1
    gegnerKoenig: { row: 0, col: 4 }, // e8
  },
};

type ScreenId = 0 | 1 | 2;
type Teilzug = 0 | 1;
const UEBERGANGS_PAUSE_MS = 1800;
// Zeitpunkt der kosmetischen Vor-Animation (Bauernsprung) innerhalb Screen 0 — bewusst deutlich
// kürzer als UEBERGANGS_PAUSE_MS, damit der Sprung schon während der ERSTEN Sprechzeile
// ("...springt gerade...") zu sehen ist, nicht erst danach.
const VOR_ANIMATION_MS = 1100;

// Platzhalter statt direktem `luxVariante(...)`-Aufruf — siehe bonus/Umwandlung.tsx-Kommentar
// bei derselben Konstante für die volle Begründung (luxVariante darf nur beim tatsächlichen
// Sprechen laufen, `zeilenFuer` läuft aber bei jedem Render).
const WIEDERHOLUNG_PLATZHALTER = "__KUER_WIEDERHOLUNG__";

function zeileAufloesen(basis: string): string {
  return basis === WIEDERHOLUNG_PLATZHALTER ? luxVariante(KUER_WIEDERHOLUNG_VARIANTEN, "kuer-wiederholung") : basis;
}

function zeilenFuer(screen: ScreenId, teilzug: Teilzug, warSchonAbgeschlossen: boolean): string[] {
  switch (screen) {
    case 0: {
      const basis = [
        "Schau, der gegnerische Bauer springt gerade zwei Felder auf einmal…",
        "Er ist an deinem Bauern vorbeigehüpft. Aber dein Bauer darf ihn noch erwischen – genau jetzt!",
        "Das nennt man 'im Vorbeigehen schlagen'. Aber Achtung: Das geht nur genau in diesem einen Moment — direkt nach seinem Sprung!",
      ];
      return warSchonAbgeschlossen ? [WIEDERHOLUNG_PLATZHALTER, ...basis] : basis;
    }
    case 1:
      return teilzug === 0
        ? ["Probier's aus — schlag ihn im Vorbeigehen!"]
        : ["Genau richtig! Du hast gerade einen der seltensten Tricks im ganzen Schach gemeistert!"];
    case 2:
      return ["Umwandlung, Schlagen im Vorbeigehen – du kennst jetzt richtig viele Schach-Geheimnisse! Bereit für den Wisent?"];
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

export default function EnPassant() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [teilzug, setTeilzug] = useState<Teilzug>(0);
  const [variante, setVariante] = useState<VarianteId>(1);
  const [warSchonAbgeschlossen, setWarSchonAbgeschlossen] = useState(false);
  const [vorAnimationGezeigt, setVorAnimationGezeigt] = useState(false);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [v, schonAbgeschlossen] = await Promise.all([
        holeUndSchalteKuerVariante("enPassant"),
        loadBonusFortschrittLocal("enPassant"),
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

  // Kosmetische Vor-Animation: läuft einmal an, sobald Screen 0 erreicht wird (unabhängig vom
  // Sprechfortschritt, siehe Datei-Kopfkommentar zu VOR_ANIMATION_MS) — reiner Standbild-Wechsel
  // wie MattIn3.tsx/TREIB_ENTDECKEN_FRAMES, hier aber zeitgesteuert statt tipp-gesteuert, weil
  // es nur EIN Wechsel ist, kein mehrstufiger Ablauf.
  const vorAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setVorAnimationGezeigt(false);
    if (screen === 0) {
      vorAnimationTimer.current = setTimeout(() => setVorAnimationGezeigt(true), VOR_ANIMATION_MS);
    }
    return () => {
      if (vorAnimationTimer.current) clearTimeout(vorAnimationTimer.current);
    };
  }, [screen, variante]);

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

  function tippeWeiter(next: ScreenId) {
    if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    gehZu(next);
  }

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
  // Als lazy Funktion übergeben, nicht als bereits aufgelöster String — siehe
  // WIEDERHOLUNG_PLATZHALTER-Kommentar oben.
  const sprechZeile = () =>
    hinweisPhase === "still"
      ? zeileAufloesen(lines[lineIndex])
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : "Tipp auf das leuchtende Feld hinter dem gegnerischen Bauern!";
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
    await saveBonusFortschrittLocal("enPassant", true);
  }

  function handleZug(target: BoardSquare) {
    tryMove(game, daten.bauerEigenerStart, target);
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

      {/* Screen 0 — Entdecken: Vor-Animation (Bauer springt zwei Felder) + Erklärung. Vor
          `vorAnimationGezeigt` steht der gegnerische Bauer noch auf seinem Ausgangsfeld,
          danach auf der tatsächlichen FEN-Stellung. */}
      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => tippeWeiter(1)}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: daten.bauerEigenerStart,
              legalTargets: [],
              pieceIcon: <BauerMasterIcon />,
              zusatzfiguren: [
                { at: daten.eigenerKoenig, icon: <KoenigMasterIcon /> },
                { at: daten.gegnerKoenig, icon: <KoenigMasterDunkelIcon /> },
                {
                  at: vorAnimationGezeigt ? daten.bauerGegnerStellung : daten.bauerGegnerVorSprung,
                  icon: <BauerMasterDunkelIcon />,
                },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screen 1, Teilzug 0 — Kür-Aufgabe (interaktiv): Schlagen im Vorbeigehen. `opponentAt`
          zeigt den TATSÄCHLICH geschlagenen Bauern (auf `bauerGegnerStellung`), `legalTargets`
          das eigentlich leere Zielfeld dahinter (`bauerZiel`) — siehe Datei-Kopfkommentar. */}
      {screen === 1 && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: daten.bauerEigenerStart,
            legalTargets: [daten.bauerZiel],
            zeigeZielringe,
            pieceIcon: <BauerMasterIcon />,
            opponentAt: daten.bauerGegnerStellung,
            opponentIcon: <BauerMasterDunkelIcon />,
            zusatzfiguren: [
              { at: daten.eigenerKoenig, icon: <KoenigMasterIcon /> },
              { at: daten.gegnerKoenig, icon: <KoenigMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={handleZug}
        />
      )}
      {/* Screen 1, Teilzug 1 — Ergebnis-Erzählung, nicht interaktiv: eigener Bauer auf dem
          Zielfeld, gegnerischer Bauer verschwunden. */}
      {screen === 1 && teilzug === 1 && (
        <Pressable style={styles.tapArea} onPress={() => tippeWeiter(2)}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: daten.bauerZiel,
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
        </Pressable>
      )}

      {/* Screen 2 — Abschluss: Abzeichen "Schatten-Sprung", zurück zum Kür-Auswahl-Hub. */}
      {screen === 2 && (
        <Pressable
          style={styles.tapArea}
          onPress={() => {
            handleKapitelAbgeschlossen();
            navigation.navigate("WisentKuerHub");
          }}
        >
          <QuestGeschafft>
            <SchattenSprungIcon size={92} />
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
