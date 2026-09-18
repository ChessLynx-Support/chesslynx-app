// Drittes Bonuskapitel: Figurenwert — siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "Figurenwert" (gate-pflichtig fürs Schlosstor).
// Anders als Fesselung/Rochade führt dieses Kapitel KEINEN Fachbegriff als gesprochenes Wort
// ein ("Figurenwert" bleibt unausgesprochen, siehe dortige Begriffsbrücken-Regel — zu
// abstrakt für die nicht-literate Zielgruppe, kein Wiedererkennungswert).
//
// Sechs Screens (der im Dokument erwähnte optionale siebte Tausch-Screen ist laut Skript
// selbst "bei Kapazitätsengpässen zurückstellbar, ohne dass das Kapitel dadurch unvollständig
// wirkt" — hier bewusst ausgelassen, siehe priorisierter_umsetzungsplan.md):
//   0 Vorstellung (Sternenleiter aufbauen) — alle fünf "normalen" Figuren nacheinander,
//     bereits gezeigte bleiben stehen, am Ende steht die vollständige Leiter da.
//   1 Der König ist unbezahlbar — goldener Schimmer statt Sternen, keine Interaktion.
//   2 Gleichwert-Entdecken — Springer UND Läufer (beide 3 Sterne) gleichzeitig schlagbar,
//     beide Antworten richtig.
//   3 Kernaufgabe ("Welche ist mehr wert?") — zwei unterschiedlich wertvolle Figuren, nur die
//     wertvollere zählt als Lösung (die andere ist zwar ein "legaler" Schlagzug im Sinne von
//     Board.tsx, führt aber bewusst NICHT weiter, siehe Kommentar bei behandleSchlagversuch).
//   4 Mini-Übung — zwei weitere kuratierte Paare (Bauer/Turm, Springer/Dame).
//   5 Abschluss — Sternenleiter-Icon erscheint zum ersten Mal.
//
// Alle vier Übungsstellungen teilen dieselbe Zuggeometrie (eigene Dame d4, zwei schlagbare
// Figuren auf d7/a4) — siehe chessEngine.ts/FIGURENWERT_POSITIONS-Kommentar für die
// Begründung. Bewusst OHNE QuestMoveScreen (wie schon Fesselung.tsx/Rochade.tsx): die
// "richtig, aber trotzdem nicht die Lösung"-Unterscheidung bei einem Fehlgriff (Screen 3/4)
// braucht eigene, hier lokal gehaltene Zustände, die für die sechs Haupt-Quests nicht
// vorgesehen sind.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { FIGURENWERT_POSITIONS, createPosition, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board } from "../quest1/Board";
import { saveBonusFortschrittLocal } from "../lib/storage";
import {
  BauerMasterIcon,
  SpringerMasterIcon,
  LaeuferMasterIcon,
  TurmMasterIcon,
  DameMasterIcon,
  KoenigMasterIcon,
  SpringerMasterDunkelIcon,
  LaeuferMasterDunkelIcon,
  TurmMasterDunkelIcon,
  BauerMasterDunkelIcon,
  DameMasterDunkelIcon,
} from "../lib/pieceMasters";
import { FigurenWertKarte, Sternenleiter } from "../lib/sternenleiter";
import { SternenleiterIcon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
// Sprach-Vollständigkeit (Claude-Projekt "ChessLynx",
// sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md, Fund
// A4): die Korrektur-Zeile bei einem Fehlgriff kann pro Sitzung mehrfach auftreten
// (Screen 3 UND Screen 4) — jetzt ein rotierender Pool statt einer festen Formulierung,
// gleiches Prinzip wie luxVarianten.ts für die sechs Hauptquests.
import { luxVariante } from "../lib/luxVarianten";
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B) — der einmalige Einführungssatz erscheint bereits in Fesselung.tsx.
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

const HINWEIS_FEHLGRIFF_VARIANTEN = [
  "Die ist auch okay, aber schau noch mal, welche höher steht!",
  "Fast! Vergleich die Sterne noch einmal genau.",
  "Guter Versuch, aber es geht noch wertvoller. Schau nochmal!",
];

// Aktive Zugaufgaben für die "Lux fragen"-Hinweisfunktion: Screen 2 (Gleichwert-
// Entdecken), Screen 3 (Kernaufgabe) und Screen 4 (Mini-Übung).
function istZugaufgabe(screen: ScreenId): boolean {
  return screen === 2 || screen === 3 || screen === 4;
}

function hinweisInhaltFuer(screen: ScreenId): string {
  if (screen === 2) return "Beide sind genau gleich viel wert. Du kannst einfach eine der beiden schlagen!";
  if (screen === 3) return "Schau auf die Sternenleiter von vorhin. Welche Figur hatte mehr Sterne? Die ist die richtige!";
  if (screen === 4) return "Denk an die Sternenleiter. Welche der beiden Figuren ist mehr wert?";
  return "";
}

// --- Feste Feldkoordinaten (siehe chessEngine.ts/FIGURENWERT_POSITIONS-Kommentar) ---------
// Alle vier Übungsstellungen teilen dieselbe Geometrie: eigene Dame auf d4, zwei schlagbare
// gegnerische Figuren auf d7 und a4.
const DAME_START: BoardSquare = { row: 4, col: 3 }; // d4
const ZIEL_D7: BoardSquare = { row: 1, col: 3 }; // d7
const ZIEL_A4: BoardSquare = { row: 4, col: 0 }; // a4

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5;

// Screen 0 (Vorstellung): welche Figuren sind nach Sprechzeile `lineIndex` bereits enthüllt?
// Index 0 = Einleitungssatz (noch nichts enthüllt), danach je Zeile eine (bzw. bei
// Springer+Läufer zwei gleichzeitig) neue Figur.
const VORSTELLUNG_ENTHUELLT: readonly ("bauer" | "springer" | "laeufer" | "turm" | "dame")[][] = [
  [],
  ["bauer"],
  ["bauer", "springer", "laeufer"],
  ["bauer", "springer", "laeufer", "turm"],
  ["bauer", "springer", "laeufer", "turm", "dame"],
];

const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  // Bewusst genau 5 Einträge, jeweils index-gleich zu VORSTELLUNG_ENTHUELLT oben (Screen 0
  // baut die Sternenleiter Zeile für Zeile auf) — deshalb hier Bindestriche INNERHALB einer
  // Zeile durch Satzzeichen ersetzt statt (wie sonst) in zusätzliche Array-Einträge
  // aufgeteilt, das würde die Zuordnung zu VORSTELLUNG_ENTHUELLT verschieben.
  0: [
    "Die Sterne zeigen nicht, wen man lieber mag. Sie zeigen, wie viel eine Figur im Spiel bewirken kann.",
    "Der Bauer hat einen Stern.",
    "Springer und Läufer haben jeweils drei. Schau, genau gleich hoch!",
    "Der Turm hat schon fünf!",
    "Und die Dame? Die ist neun Sterne wert! Kein Wunder, dass sie so gut bewacht wird!",
  ],
  1: ["Und der König? Der bekommt gar keine Sterne.", "Er ist einfach unbezahlbar!", "Der Wichtigste von allen!"],
  2: ["Guck genau hin!", "Beide haben drei Sterne.", "Die sind gleich viel wert! Da ist es egal, welche du nimmst."],
  3: ["Du kannst zwei Figuren schlagen.", "Welche ist mehr wert? Tipp auf die wertvollere!"],
  4: ["Noch zwei Vergleiche!", "Such dir jeweils die wertvollere Figur aus!"],
  5: ["Du hast jetzt ein gutes Auge für wertvolle Figuren!", "Fantastisch gemacht!"],
};

const TIPP_SCREENS = new Set<ScreenId>([0, 1]);

// Nutzerfeedback 2026-09-09 ("In der Einführung bitte selbständig durchführen ohne
// klicken ... Übergänge langsam gestalten"), konsistent zu Fesselung.tsx/Rochade.tsx.
const NAECHSTER_SCREEN_NACH_EINFUEHRUNG: Partial<Record<ScreenId, ScreenId>> = { 0: 1, 1: 2 };
const UEBERGANGS_PAUSE_MS = 1800;

// Mini-Übung (Screen 4): zwei kuratierte Paare, siehe FIGURENWERT_POSITIONS-Kommentar.
const UEBUNGS_PAARE = [
  { fen: FIGURENWERT_POSITIONS.uebungBauerTurm, richtig: ZIEL_A4, falsch: ZIEL_D7, richtigIcon: <TurmMasterDunkelIcon size={30} />, falschIcon: <BauerMasterDunkelIcon size={30} /> },
  { fen: FIGURENWERT_POSITIONS.uebungSpringerDame, richtig: ZIEL_A4, falsch: ZIEL_D7, richtigIcon: <DameMasterDunkelIcon size={30} />, falschIcon: <SpringerMasterDunkelIcon size={30} /> },
] as const;

export default function Figurenwert() {
  const navigation = useNavigation<any>();
  // Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
  // schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md): dieses Kapitel läuft jetzt als
  // "Erstlehre" im Eichhörnchen-Revier (screens/Revier.tsx, lib/revierErstlehre.ts) statt
  // in einer festen Schlossvorplatz-Kette — `rueckkehrZiel`/`rueckkehrParams` funktionieren
  // exakt wie das bereits bestehende Muster in bonus/MattIn3.tsx.
  const route = useRoute<any>();
  const rueckkehrZiel: string = route.params?.rueckkehrZiel ?? "KidHome";
  const rueckkehrParams = route.params?.rueckkehrParams;
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [uebungIndex, setUebungIndex] = useState(0);
  // Kurze, sich selbst wieder ausblendende Korrektur-Zeile bei einem Fehlgriff (siehe
  // behandleSchlagversuch unten) — NICHT zu verwechseln mit der "Lux fragen"-
  // Hinweisfunktion weiter unten (luxHinweisPhase), einem eigenen, vom Kind bewusst
  // angeforderten Feature. Bewusst umbenannt (vormals schlicht `hinweis`), um beide
  // Konzepte im Code klar auseinanderzuhalten.
  const [fehlgriffHinweis, setFehlgriffHinweis] = useState<string | null>(null);
  // Zählt jeden tatsächlichen Fehlgriff hoch — Teil des Sprech-Schlüssels unten, damit
  // der Hook eine neue Hinweis-Zeile auch wirklich (per TTS) ausspricht, statt nur den
  // sichtbaren Text zu ändern (derselbe Schlüssel-Mechanismus wie überall sonst: der
  // Hook spricht nur bei einer SCHLÜSSEL-Änderung neu, siehe useLuxSprechzeile.ts).
  const [fehlgriffZaehler, setFehlgriffZaehler] = useState(0);
  // "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag
  // 2026-09-09) — siehe Import-Kommentar oben.
  const [luxHinweisPhase, setLuxHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();

  const lines = SCREEN_SCRIPTS[screen];
  const isLastLine = lineIndex === lines.length - 1;

  function gehZu(next: ScreenId) {
    setLineIndex(0);
    setFehlgriffHinweis(null);
    setScreen(next);
  }

  function advanceOrGo(next: ScreenId) {
    if (!isLastLine) {
      setLineIndex((i) => i + 1);
      return;
    }
    gehZu(next);
  }

  // Screen-Wechsel setzt die "Lux fragen"-Geste zurück — die nächste Aufgabe startet
  // wieder bei "einmal antippen = wiederholen".
  useEffect(() => {
    setLuxHinweisPhase("still");
  }, [screen]);

  // Siehe identischer Kommentar/Zweck in Fesselung.tsx.
  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  // Siehe Fesselung.tsx-Kommentar: alle Screens sprechen ihre Zeilen jetzt automatisch.
  const autoWeiter = true;
  const zugaufgabeAktiv = !fehlgriffHinweis && istZugaufgabe(screen);
  // Nutzerfeedback 2026-09-09 ("die vorgeschlagenen Züge bei den Übungen entfernen, sonst
  // sind die Hinweise sinnlos") — siehe ausführlicher Kommentar in Fesselung.tsx.
  const zeigeZielringe = !hinweiseAktiv || luxHinweisPhase === "hinweis";
  const sprechSchluessel = fehlgriffHinweis
    ? `${screen}-fehlgriff-${fehlgriffZaehler}`
    : luxHinweisPhase === "still"
      ? `${screen}-${lineIndex}`
      : `${screen}-${luxHinweisPhase}`;
  const sprechZeile = fehlgriffHinweis
    ? fehlgriffHinweis
    : luxHinweisPhase === "still"
      ? lines[lineIndex]
      : luxHinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : hinweisInhaltFuer(screen);
  const naechsterScreenNachLetzterZeile = NAECHSTER_SCREEN_NACH_EINFUEHRUNG[screen];
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    sprechSchluessel,
    sprechZeile,
    !fehlgriffHinweis && luxHinweisPhase === "still"
      ? !isLastLine
        ? () => setLineIndex((i) => i + 1)
        : naechsterScreenNachLetzterZeile !== undefined
          ? () => {
              const next = naechsterScreenNachLetzterZeile;
              uebergangsTimer.current = setTimeout(() => gehZu(next), UEBERGANGS_PAUSE_MS);
            }
          : undefined
      : undefined
  );
  const zeigeUntertitel = useUntertitelAktiv();

  function handleLuxTap() {
    if (!hinweiseAktiv || !zugaufgabeAktiv || luxHinweisPhase === "hinweis") {
      wiederholen();
      return;
    }
    setLuxHinweisPhase(luxHinweisPhase === "still" ? "angebot" : "hinweis");
  }

  const game = useMemo(() => {
    if (screen === 2) return createPosition(FIGURENWERT_POSITIONS.gleichwertSpringerLaeufer);
    if (screen === 3) return createPosition(FIGURENWERT_POSITIONS.kernaufgabeTurmLaeufer);
    if (screen === 4) return createPosition(UEBUNGS_PAARE[uebungIndex].fen);
    return null;
  }, [screen, uebungIndex]);

  async function handleKapitelAbgeschlossen() {
    await saveBonusFortschrittLocal("figurenwert", true);
  }

  // Gemeinsame Behandlung eines Schlagversuchs bei Screen 3/4: BEIDE Zielfelder sind bei
  // Board.tsx "legal" (echte Schlagzüge), aber nur das wertvollere Ziel zählt als Lösung des
  // Vergleichs. Bei einem Fehlgriff wird bewusst KEIN echter Zug ausgeführt (der `game`-
  // Zustand bleibt unverändert, das Kind darf sofort erneut versuchen) — nur eine kurze,
  // freundliche Korrektur-Sprechzeile ersetzt vorübergehend die normale Sprechblase (siehe
  // `fehlgriffHinweis`-State oben), ganz ohne Fehlerzähler oder Bestrafung (Design-Grundsatz).
  function behandleSchlagversuch(target: BoardSquare, richtig: BoardSquare, aufErfolg: () => void) {
    const istRichtig = target.row === richtig.row && target.col === richtig.col;
    if (istRichtig) {
      if (game) tryMove(game, DAME_START, target);
      setFehlgriffHinweis(null);
      aufErfolg();
      return;
    }
    setFehlgriffHinweis(luxVariante(HINWEIS_FEHLGRIFF_VARIANTEN, "figurenwert-hinweis"));
    setFehlgriffZaehler((z) => z + 1);
    setTimeout(() => setFehlgriffHinweis(null), 2200);
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

      {/* Screen 0 — Vorstellung: Sternenleiter baut sich Zeile für Zeile auf, bereits gezeigte
          Figuren bleiben stehen (siehe VORSTELLUNG_ENTHUELLT oben). */}
      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)}>
          <Sternenleiter>
            {VORSTELLUNG_ENTHUELLT[lineIndex].includes("bauer") && (
              <FigurenWertKarte icon={<BauerMasterIcon size={40} />} wert={1} />
            )}
            {VORSTELLUNG_ENTHUELLT[lineIndex].includes("springer") && (
              <FigurenWertKarte icon={<SpringerMasterIcon size={40} />} wert={3} />
            )}
            {VORSTELLUNG_ENTHUELLT[lineIndex].includes("laeufer") && (
              <FigurenWertKarte icon={<LaeuferMasterIcon size={40} />} wert={3} />
            )}
            {VORSTELLUNG_ENTHUELLT[lineIndex].includes("turm") && (
              <FigurenWertKarte icon={<TurmMasterIcon size={40} />} wert={5} />
            )}
            {VORSTELLUNG_ENTHUELLT[lineIndex].includes("dame") && (
              <FigurenWertKarte icon={<DameMasterIcon size={40} />} wert={9} />
            )}
          </Sternenleiter>
        </Pressable>
      )}

      {/* Screen 1 — Der König ist unbezahlbar: kein Zahlenwert, goldener Schimmer. */}
      {screen === 1 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(2)}>
          <Sternenleiter>
            <FigurenWertKarte icon={<KoenigMasterIcon size={48} />} koenig iconGroesse={48} />
          </Sternenleiter>
        </Pressable>
      )}

      {/* Screen 2 — Gleichwert-Entdecken: Springer UND Läufer gleichzeitig schlagbar, beide
          Antworten richtig — echtes Board, beide Zielfelder als Legalzug angeboten. */}
      {screen === 2 && game && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: DAME_START,
            legalTargets: [ZIEL_D7, ZIEL_A4],
            zeigeZielringe,
            pieceIcon: <DameMasterIcon />,
            opponentAt: ZIEL_D7,
            opponentIcon: <SpringerMasterDunkelIcon />,
            zusatzfiguren: [{ at: ZIEL_A4, icon: <LaeuferMasterDunkelIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, DAME_START, target);
            gehZu(3);
          }}
        />
      )}

      {/* Screen 3 — Kernaufgabe: Turm (5) gegen Läufer (3), nur der Turm zählt als Lösung. */}
      {screen === 3 && game && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: DAME_START,
            legalTargets: [ZIEL_D7, ZIEL_A4],
            zeigeZielringe,
            pieceIcon: <DameMasterIcon />,
            opponentAt: ZIEL_D7,
            opponentIcon: <TurmMasterDunkelIcon />,
            zusatzfiguren: [{ at: ZIEL_A4, icon: <LaeuferMasterDunkelIcon /> }],
          }}
          onCorrectMove={(target) => behandleSchlagversuch(target, ZIEL_D7, () => gehZu(4))}
        />
      )}

      {/* Screen 4 — Mini-Übung: zwei weitere Paare (Bauer/Turm, Springer/Dame). */}
      {screen === 4 && game && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: DAME_START,
            legalTargets: [ZIEL_D7, ZIEL_A4],
            zeigeZielringe,
            pieceIcon: <DameMasterIcon />,
            opponentAt: ZIEL_D7,
            opponentIcon: UEBUNGS_PAARE[uebungIndex].falschIcon,
            zusatzfiguren: [{ at: ZIEL_A4, icon: UEBUNGS_PAARE[uebungIndex].richtigIcon }],
          }}
          onCorrectMove={(target) =>
            behandleSchlagversuch(target, UEBUNGS_PAARE[uebungIndex].richtig, () => {
              if (uebungIndex < UEBUNGS_PAARE.length - 1) {
                setUebungIndex((i) => i + 1);
              } else {
                handleKapitelAbgeschlossen();
                gehZu(5);
              }
            })
          }
        />
      )}

      {screen === 5 && (
        // Nachtrag 2026-09-17: führt jetzt zurück zum `rueckkehrZiel` (Standard: das
        // Eichhörnchen-Revier, aus dem diese Erstlehre gestartet wurde) statt fest zum
        // nächsten Bonuskapitel — siehe Fesselung.tsx-Kommentar, warum die frühere
        // ununterbrochene Kette entfallen ist.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate(rueckkehrZiel, rueckkehrParams)}>
          <QuestGeschafft>
            <SternenleiterIcon size={92} />
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
