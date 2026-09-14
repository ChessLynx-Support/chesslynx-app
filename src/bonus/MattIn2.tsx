// Viertes Bonuskapitel: Matt in 2 — siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "Matt in 2" (gate-pflichtig fürs Schlosstor).
// Baut direkt auf Quest 6 Screen 4 auf (die drei gleichwertigen Wege, den König zu befreien)
// und auf Figurenwert (die Dame als "neun Sterne wert" in Beispiel 2). Kein Zahlen-Label fürs
// Kind — bleibt unter demselben Matt-Icon (KroneSternIcon) wie Matt in 1 aus Quest 6; das neue
// MattIn2Icon aus puzzleIcons.tsx ist ausschließlich das Kapitel-ABSCHLUSS-Abzeichen, siehe
// dortiger Kommentar.
//
// Sechs Screens, exakt nach bonuskapitel_screen_skripte.md, Abschnitt "Matt in 2":
//   0 Vorstellung        — Rückbezug auf Quest 6 ("ein einziger Zug hat gereicht"), diesmal
//                           zwei kluge Schritte nötig. Statisches Brett, keine Interaktion.
//   1 Beispiel "Schlagen" — Zug 1: Turm schlägt den Wächter. Zug 2: König wird befreit.
//   2 Beispiel "Ablenkung" — Zug 1: Turm bedroht eine wertvolle gegnerische Figur (die Dame,
//                            9 Sterne — löst Review-Befund 1.11 ein: Figurenwert wird hier
//                            tatsächlich eingelöst, nicht nur behauptet). Zug 2: König wird
//                            befreit, unabhängig davon, was der Wächter als Reaktion tut
//                            (Zugzwang-Fassung aus projektwissen.md, siehe auch
//                            chessEngine.ts/MATT_IN_2_POSITIONEN-Kommentar).
//   3 Gleichwertigkeit + Wahl (NEU laut Review-Befund 1.8) — eine Sprechzeile macht die
//                            Gleichwertigkeit der beiden Wege hörbar, plus eine Position mit
//                            ZWEI antippbaren ersten Zügen (Schlagen ODER Bedrohen), beide
//                            führen zum selben Zug 2.
//   4 Mini-Übung          — zwei weitere Runden, "Schlagen" und "Ablenkung" gemischt.
//   5 Abschluss           — neues MattIn2Icon-Kapitel-Abzeichen erscheint zum ersten Mal,
//                            Puzzle-Ziel-Icon bleibt KroneSternIcon.
//
// Wichtige, bewusst dokumentierte Vereinfachung (siehe chessEngine.ts/MATT_IN_2_POSITIONEN-
// Kommentar für die volle Begründung inkl. der zunächst verworfenen "erzwungen durch Schach"-
// Konstruktion, die sich als bereits-Matt-Widerspruch erwiesen hat): die ZWEI-ZUG-REIHENFOLGE
// ist hier geskriptet (curated `legalTargets`), nicht aus einer vollständigen Engine-Analyse
// abgeleitet. Jeder einzelne angebotene Zug ist für sich genommen ein echter, geprüfter
// Legalzug — nur ihre didaktische Abfolge ist eine UI-Entscheidung. `npm test` auf dem eigenen
// Rechner bestätigt zumindest, dass jeder einzelne angebotene Zug tatsächlich legal ist.
//
// Bewusst OHNE QuestMoveScreen (wie schon Fesselung.tsx/Rochade.tsx/Figurenwert.tsx) — die
// Screens 1-3 brauchen einen lokalen Zwei-Teilzug-Zustand (`teilzug`) innerhalb EINES Screens,
// den QuestMoveScreen nicht kennt.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MATT_IN_2_POSITIONEN, createPosition, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board } from "../quest1/Board";
import { saveBonusFortschrittLocal } from "../lib/storage";
import { KoenigMasterIcon, TurmMasterIcon, SpringerMasterDunkelIcon, DameMasterDunkelIcon } from "../lib/pieceMasters";
import { MattIn2Icon, KroneSternIcon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B) — der einmalige Einführungssatz erscheint bereits in Fesselung.tsx.
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

// --- Feste Feldkoordinaten (siehe chessEngine.ts/MATT_IN_2_POSITIONEN-Kommentar) ----------
// Beide Stellungen teilen dieselbe Grundgeometrie: eigener König in der Ecke (a1), eigener
// Turm auf h1, ein einzelner gegnerischer "Wächter" auf der h-Linie.
const KOENIG_START: BoardSquare = { row: 7, col: 0 }; // a1
const TURM_START: BoardSquare = { row: 7, col: 7 }; // h1
const WAECHTER_H5: BoardSquare = { row: 3, col: 7 }; // h5 — Springer ("schlagen") bzw. Zielfeld der Bedrohung
const WAECHTER_DAME_H6: BoardSquare = { row: 2, col: 7 }; // h6 — Dame ("ablenkung")
const ZIEL_BEDROHEN_H4: BoardSquare = { row: 4, col: 7 }; // h4 — Wahl-Screen: Alternative zu h5, ebenfalls ein
// echter Legalzug des Turms (gleiche Linie wie der Springer, ein Feld davor) — bedroht den
// Springer, ohne ihn zu schlagen.
const KOENIG_ZIEL: BoardSquare = { row: 6, col: 0 }; // a2 — "Befreiung" (Zug 2, in jedem Beispiel gleich)

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5;
type Teilzug = 0 | 1;

// Sprechzeilen hängen bei den Zwei-Teilzug-Screens (1/2/3) vom aktuellen Teilzug ab, deshalb
// hier als Funktion statt als starre Tabelle (anders als in Fesselung/Rochade/Figurenwert, wo
// jeder Screen nur eine feste Zeilenliste braucht).
function zeilenFuer(screen: ScreenId, teilzug: Teilzug): string[] {
  switch (screen) {
    case 0:
      return [
        "Weißt du noch, wie wir den König befreit haben? Ein einziger Zug hat gereicht.",
        "Manchmal reicht ein Zug aber nicht. Diesmal brauchen wir zwei kluge Schritte.",
      ];
    case 1:
      return teilzug === 0 ? ["Schlag zuerst den Wächter."] : ["Jetzt kannst du den König befreien!"];
    case 2:
      return teilzug === 0
        ? ["Schau, seine Dame, neun Sterne! Die will er auf keinen Fall verlieren."]
        : ["Ganz gleich, was er jetzt macht!", "Der Weg zum König ist frei!"];
    case 3:
      return teilzug === 0
        ? ["Manchmal räumen wir den Wächter weg.", "Manchmal locken wir ihn weg.", "Beides ist richtig, probier es einmal aus, du darfst wählen!"]
        : ["Und jetzt: befreie den König!"];
    case 4:
      return ["Jetzt bist du dran!", "Kannst du beide Wege wiedererkennen?"];
    case 5:
      // Sprach-Harmonie-Review (2026-09-09): dritte Zeile neu ergänzt — die "★ Für mutige
      // Entdecker"-Karte (siehe Aufrufstelle unten, extraKarte) hatte bisher NUR
      // geschriebenen Text, kein nicht lesefähiges Kind konnte also erfahren, dass es die
      // Extra-Aufgabe überhaupt gibt (echter TTS-Lücke, kein bewusster Platzhalter — genau
      // dieselbe Kategorie Fund wie bei FreispielPartie.tsx). Läuft automatisch nach den
      // beiden Lob-Zeilen weiter (siehe autoWeiter/isLastLine-Verdrahtung unten), spricht
      // die bereits sichtbare Karten-Beschriftung jetzt auch laut aus.
      return [
        "Zwei kluge Schritte!",
        "Du wirst richtig gut darin!",
        "Fantastisch gemacht!",
        "Wenn du magst, wartet noch eine Extra-Aufgabe für mutige Entdecker!",
      ];
    default:
      return [""];
  }
}

// Screen 0 ist der einzige reine Tap-Through-Screen ohne Brett-Interaktion (analog zu Screen 0
// in Fesselung/Rochade/Figurenwert) — nur hier wird die automatische Sprechzeilen-Weiterschaltung
// abgeschaltet, siehe TIPP_SCREENS-Konvention in den übrigen Bonuskapiteln.
const TIPP_SCREENS = new Set<ScreenId>([0]);

// Nutzerfeedback 2026-09-09 ("In der Einführung bitte selbständig durchführen ohne
// klicken ... Übergänge langsam gestalten"), konsistent zu den übrigen Bonuskapiteln.
const NAECHSTER_SCREEN_NACH_EINFUEHRUNG: Partial<Record<ScreenId, ScreenId>> = { 0: 1 };
const UEBERGANGS_PAUSE_MS = 1800;

// Aktive Zugaufgaben für die "Lux fragen"-Hinweisfunktion: Screens 1-4 (Screen 0 ist
// reine Vorstellung, Screen 5 der Abschluss).
function istZugaufgabe(screen: ScreenId): boolean {
  return screen >= 1 && screen <= 4;
}

// Hinweis-Inhalt je Screen/Teilzug (bzw. je Übungsart auf Screen 4) — bewusst dieselbe
// ausführlichere Umformulierung wie in den übrigen Bonuskapiteln, siehe
// Vorschlagsdokument Teil B3.
function hinweisInhaltFuer(screen: ScreenId, teilzug: Teilzug, uebungArt: UebungsArt): string {
  if (teilzug === 1) return "Der Weg ist frei. Tipp auf das leuchtende Feld, um den König zu befreien!";
  const art = screen === 4 ? uebungArt : screen === 2 ? "ablenkung" : "schlagen";
  if (art === "ablenkung") return "Bedroh die Dame. Der Turm zieht auf das leuchtende Feld, ohne zu schlagen!";
  if (screen === 3) return "Du darfst wählen: schlagen oder bedrohen. Beide leuchtenden Felder sind richtig!";
  return "Schlag zuerst den Wächter. Tipp auf das leuchtende Feld!";
}

// Mini-Übung (Screen 4): zwei Runden, "Schlagen" und "Ablenkung" gemischt (siehe Skript:
// "beide Wege gemischt"). Jede Runde nutzt exakt dieselbe Zwei-Teilzug-Mechanik wie die
// vorangegangenen Beispiel-Screens, hier aber ohne die ausführlichen Lehr-Sprechzeilen.
type UebungsArt = "schlagen" | "ablenkung";
const UEBUNGS_RUNDEN: { art: UebungsArt; fen: string }[] = [
  { art: "schlagen", fen: MATT_IN_2_POSITIONEN.schlagen },
  { art: "ablenkung", fen: MATT_IN_2_POSITIONEN.ablenkung },
];

export default function MattIn2() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [teilzug, setTeilzug] = useState<Teilzug>(0);
  const [uebungIndex, setUebungIndex] = useState(0);
  // Screen 3 (Wahl-Screen): merkt sich, welches der beiden Zug-1-Zielfelder das Kind gewählt
  // hat, damit Teilzug 1 den Turm am richtigen Feld zeigt.
  const [wahlZiel, setWahlZiel] = useState<BoardSquare>(WAECHTER_H5);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();

  const lines = zeilenFuer(screen, teilzug);
  const isLastLine = lineIndex === lines.length - 1;

  // Screen- ODER Teilzug-Wechsel setzt die "Lux fragen"-Geste zurück — jeder der beiden
  // Zwischenschritte einer Zugaufgabe ist eine eigene "frische" Gelegenheit.
  useEffect(() => {
    setHinweisPhase("still");
  }, [screen, teilzug]);

  function gehZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
  }

  function advanceOrGo(next: ScreenId) {
    if (!isLastLine) {
      setLineIndex((i) => i + 1);
      return;
    }
    gehZu(next);
  }

  // Teilzug (und die Wahl-Screen-Merkhilfe) bei jedem Screen-Wechsel zurücksetzen — dieselbe
  // useEffect-Konvention wie Rochade.tsx's `demoDone`-Reset.
  useEffect(() => {
    setTeilzug(0);
    setWahlZiel(WAECHTER_H5);
  }, [screen]);

  // Siehe identischer Kommentar/Zweck in Fesselung.tsx.
  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  const uebungAktuelle = UEBUNGS_RUNDEN[uebungIndex];
  // Siehe Fesselung.tsx-Kommentar: alle Screens sprechen ihre Zeilen jetzt automatisch.
  const autoWeiter = true;
  const zugaufgabeAktiv = istZugaufgabe(screen);
  // Nutzerfeedback 2026-09-09 ("die vorgeschlagenen Züge bei den Übungen entfernen, sonst
  // sind die Hinweise sinnlos") — siehe ausführlicher Kommentar in Fesselung.tsx.
  const zeigeZielringe = !hinweiseAktiv || hinweisPhase === "hinweis";
  const sprechSchluessel =
    hinweisPhase === "still" ? `${screen}-${teilzug}-${lineIndex}` : `${screen}-${teilzug}-${hinweisPhase}`;
  const sprechZeile =
    hinweisPhase === "still"
      ? lines[lineIndex]
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : hinweisInhaltFuer(screen, teilzug, uebungAktuelle.art);
  const naechsterScreenNachLetzterZeile = NAECHSTER_SCREEN_NACH_EINFUEHRUNG[screen];
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    sprechSchluessel,
    sprechZeile,
    hinweisPhase === "still"
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
    if (!hinweiseAktiv || !zugaufgabeAktiv || hinweisPhase === "hinweis") {
      wiederholen();
      return;
    }
    setHinweisPhase(hinweisPhase === "still" ? "angebot" : "hinweis");
  }

  // chess.js-Instanz je Screen (bzw. je Mini-Übungsrunde) — bleibt über beide Teilzüge eines
  // Screens hinweg bestehen (Teilzug ist bewusst NICHT Teil der useMemo-Dependency-Liste),
  // damit Zug 1 und Zug 2 auf demselben Spielzustand aufbauen, genau wie bei Rochade.tsx.
  const game = useMemo(() => {
    if (screen === 1) return createPosition(MATT_IN_2_POSITIONEN.schlagen);
    if (screen === 2) return createPosition(MATT_IN_2_POSITIONEN.ablenkung);
    if (screen === 3) return createPosition(MATT_IN_2_POSITIONEN.schlagen);
    if (screen === 4) return createPosition(UEBUNGS_RUNDEN[uebungIndex].fen);
    return null;
  }, [screen, uebungIndex]);

  async function handleKapitelAbgeschlossen() {
    await saveBonusFortschrittLocal("mattIn2", true);
  }

  function naechsteUebungsrundeOderAbschluss() {
    if (uebungIndex < UEBUNGS_RUNDEN.length - 1) {
      setUebungIndex((i) => i + 1);
      setTeilzug(0);
      setScreen(4); // bleibt auf Screen 4, nur die Runde wechselt (kein gehZu-Reset nötig)
      setLineIndex(0);
    } else {
      handleKapitelAbgeschlossen();
      gehZu(5);
    }
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

      {/* Screen 0 — Vorstellung: statisches Brett (Schlagen-Geometrie), keine Interaktion. */}
      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: TURM_START,
              legalTargets: [],
              pieceIcon: <TurmMasterIcon />,
              opponentAt: WAECHTER_H5,
              opponentIcon: <SpringerMasterDunkelIcon />,
              zusatzfiguren: [{ at: KOENIG_START, icon: <KoenigMasterIcon /> }],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screen 1 — Beispiel "Schlagen": Zug 1 (Turm schlägt Springer auf h5), dann Zug 2
          (König a1 -> a2). Nur das jeweils gewünschte Zielfeld ist antippbar (dieselbe
          "onlyTarget"-Verengung wie bereits in Rochade.tsx/Figurenwert.tsx). */}
      {screen === 1 && game && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: TURM_START,
            legalTargets: [WAECHTER_H5],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            opponentAt: WAECHTER_H5,
            opponentIcon: <SpringerMasterDunkelIcon />,
            zusatzfiguren: [{ at: KOENIG_START, icon: <KoenigMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, TURM_START, target);
            setTeilzug(1);
          }}
        />
      )}
      {screen === 1 && game && teilzug === 1 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [KOENIG_ZIEL],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: WAECHTER_H5, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            gehZu(2);
          }}
        />
      )}

      {/* Screen 2 — Beispiel "Ablenkung": Zug 1 (Turm zieht NICHT schlagend nach h5 und bedroht
          von dort die Dame auf h6), dann Zug 2 (König a1 -> a2), unabhängig davon, was mit der
          Dame passiert (Zugzwang-Fassung — es wird bewusst keine gegnerische Reaktion
          simuliert, siehe Datei-Kopfkommentar). */}
      {screen === 2 && game && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: TURM_START,
            legalTargets: [WAECHTER_H5],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            zusatzfiguren: [
              { at: KOENIG_START, icon: <KoenigMasterIcon /> },
              { at: WAECHTER_DAME_H6, icon: <DameMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={(target) => {
            tryMove(game, TURM_START, target);
            setTeilzug(1);
          }}
        />
      )}
      {screen === 2 && game && teilzug === 1 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [KOENIG_ZIEL],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [
              { at: WAECHTER_H5, icon: <TurmMasterIcon /> },
              { at: WAECHTER_DAME_H6, icon: <DameMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            gehZu(3);
          }}
        />
      )}

      {/* Screen 3 — Gleichwertigkeit + Wahl: dieselbe "Schlagen"-Geometrie wie Screen 1, aber
          diesmal ZWEI antippbare Zug-1-Zielfelder (h5 = schlagen, h4 = bedrohen) — beide echte
          Legalzüge des Turms, beide führen zum selben Zug 2 (Review-Befund 1.8: das Kind
          bekommt hier zum ersten Mal eine tatsächliche Wahl zwischen den beiden Wegen). */}
      {screen === 3 && game && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: TURM_START,
            legalTargets: [WAECHTER_H5, ZIEL_BEDROHEN_H4],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            opponentAt: WAECHTER_H5,
            opponentIcon: <SpringerMasterDunkelIcon />,
            zusatzfiguren: [{ at: KOENIG_START, icon: <KoenigMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, TURM_START, target);
            setWahlZiel(target);
            setTeilzug(1);
          }}
        />
      )}
      {screen === 3 && game && teilzug === 1 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [KOENIG_ZIEL],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: wahlZiel, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            gehZu(4);
          }}
        />
      )}

      {/* Screen 4 — Mini-Übung: zwei Runden, "Schlagen" (uebungIndex 0) und "Ablenkung"
          (uebungIndex 1) gemischt, jeweils wieder als Zwei-Teilzug-Ablauf. */}
      {screen === 4 && game && uebungAktuelle.art === "schlagen" && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: TURM_START,
            legalTargets: [WAECHTER_H5],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            opponentAt: WAECHTER_H5,
            opponentIcon: <SpringerMasterDunkelIcon />,
            zusatzfiguren: [{ at: KOENIG_START, icon: <KoenigMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, TURM_START, target);
            setTeilzug(1);
          }}
        />
      )}
      {screen === 4 && game && uebungAktuelle.art === "ablenkung" && teilzug === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: TURM_START,
            legalTargets: [WAECHTER_H5],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            zusatzfiguren: [
              { at: KOENIG_START, icon: <KoenigMasterIcon /> },
              { at: WAECHTER_DAME_H6, icon: <DameMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={(target) => {
            tryMove(game, TURM_START, target);
            setTeilzug(1);
          }}
        />
      )}
      {screen === 4 && game && teilzug === 1 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [KOENIG_ZIEL],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren:
              uebungAktuelle.art === "schlagen"
                ? [{ at: WAECHTER_H5, icon: <TurmMasterIcon /> }]
                : [
                    { at: WAECHTER_H5, icon: <TurmMasterIcon /> },
                    { at: WAECHTER_DAME_H6, icon: <DameMasterDunkelIcon /> },
                  ],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            naechsteUebungsrundeOderAbschluss();
          }}
        />
      )}

      {screen === 5 && (
        // Matt in 2 ist das letzte GATE-PFLICHTIGE Bonuskapitel (siehe lib/gate.ts) — der
        // Hauptweg führt deshalb jetzt zu Schlossvorplatz.tsx (dem echten Navigations-
        // Knotenpunkt), nicht mehr zu KidHome. Zusätzlich erscheint hier — wie in
        // bonuskapitel_screen_skripte.md, Abschnitt "Matt in 3" gefordert ("Erscheint am Ende
        // von Matt in 2 als zusätzliche, freiwillig antippbare Karte") — ein separater,
        // erkennbar optionaler Zugang zum Extra-Kapitel Matt in 3 (kein Fortschritts-Blocker).
        // Zeigt beide Icons: das neue MattIn2-Kapitel-Abzeichen UND das unveränderte
        // Matt-Puzzle-Ziel-Icon (KroneSternIcon), siehe Datei-Kopfkommentar.
        <View style={styles.tapArea}>
          <Pressable onPress={() => navigation.navigate("Schlossvorplatz")}>
            <QuestGeschafft>
              <View style={styles.abschlussIcons}>
                <MattIn2Icon size={92} />
                <KroneSternIcon size={40} />
              </View>
            </QuestGeschafft>
          </Pressable>
          <Pressable style={styles.extraKarte} onPress={() => navigation.navigate("MattIn3")}>
            <Text style={styles.extraKarteText}>★ Für mutige Entdecker: eine Extra-Aufgabe</Text>
          </Pressable>
        </View>
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
  abschlussIcons: { flexDirection: "row", alignItems: "center", gap: 10 },
  extraKarte: {
    marginTop: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D7A52D",
    backgroundColor: "#FFFFFF",
  },
  extraKarteText: { fontSize: 14, color: "#8B7A63", textAlign: "center" },
});
