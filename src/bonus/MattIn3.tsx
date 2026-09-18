// Fünftes, OPTIONALES Bonuskapitel: Matt in 3 — siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "5. Matt in 3 (optional, kein Pflichtteil, kein
// Gate — 6 Screens)". Kein Gate-Blocker (siehe lib/gate.ts) — erreichbar über die Extra-Karte
// am Ende von Matt in 2 UND (Wisent-Kür-Runde, 2026-09-15) über screens/WisentKuerHub.tsx als
// eine der drei gleichrangigen Wisent-Kürs (siehe dortiger Kommentar und `rueckkehrZiel` unten
// für das dabei optional umschaltbare Navigationsziel nach Abschluss).
//
// Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
// schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md): Schlossvorplatz.tsx wurde entfernt — der
// Default für `rueckkehrZiel` ist jetzt "KidHome" statt "Schlossvorplatz". Kommt der Aufruf von
// MattIn2.tsx, wird zusätzlich `rueckkehrParams` durchgereicht, sodass die Rückkehr wieder im
// jeweiligen Wolfsfeste-Revier landet statt auf der Kartenübersicht.
//
// Bewusster Rollentausch gegenüber allen vorherigen Bonuskapiteln (siehe chessEngine.ts/
// MATT_IN_3_POSITIONEN-Kommentar): bisher hat das Kind immer das EIGENE, gefangene Königreich
// befreit. Hier führt das Kind zum ersten Mal selbst den GEGNERISCHEN König aufs Matt — die
// schachlich klassische Bedeutung von "Matt", nicht die App-eigene "befreien"-Metapher aus
// Matt in 2. Neue, hier erstmals gebrauchte Fähigkeit: den gegnerischen König aktiv "treiben"
// (Review-Befund 1.10), deshalb der eigene Entdecken-Screen (Screen 1) dafür.
//
// Sechs Screens, exakt nach bonuskapitel_screen_skripte.md:
//   0 Einladung (statt Pflicht-Vorstellung) — freiwillig, einladender Ton statt fordernd.
//   1 NEU — Treib-Entdecken — reine Auto-Demo (hier als tap-vorgeführte Bildfolge umgesetzt,
//     siehe Kommentar bei TreibEntdeckenScreen unten), kein Lösen.
//   2 Erstes Rätsel (Turmleiter-Matt), volle Führung — drei Züge.
//   3 Zweites Rätsel (Dame-und-Turm-Randmatt), volle Führung — drei Züge.
//   4 NEU — Dritte Stellung, reduzierte Hilfe — dieselbe Mechanik, sparsamere Sprechzeilen.
//   5 Abschluss — neues Extra-Sternchen-Abzeichen, Übergang zurück zum Aufrufer (siehe
//     Nachtrag 2026-09-17 oben).
//
// WICHTIGE, DOKUMENTIERTE VEREINFACHUNG (siehe chessEngine.ts/MATT_IN_3_POSITIONEN-Kommentar
// für die volle Begründung): die drei Weißzüge je Rätsel UND die jeweilige Schluss-Matt-
// stellung sind vollständig verifiziert (echtes, lückenloses Matt). Die animierte schwarze
// Zwischenantwort nach Zug 1/2 ist dagegen NICHT die einzig legale (der König hat jeweils drei
// legale Fluchtfelder) — genau die vom Skript selbst vorgesehene Ausweichklausel greift hier:
// "wird die Zwischenantwort stattdessen als 'eine mögliche Antwort' erzählt". MattIn3.tsx hält
// sich strikt daran (siehe Sprechzeilen unten: "Er versucht, hier zu entkommen…", nie "muss").
//
// Bewusst OHNE QuestMoveScreen (wie alle bisherigen Bonuskapitel) — die Drei-Zug-Rätsel
// brauchen einen lokalen Phasen-Zustand (`phase`) UND müssen den gegnerischen König nach
// Weiß' Zug 1/2 selbst automatisch weiterziehen (echter chess.js-Zug, kein reiner UI-Trick),
// was QuestMoveScreen nicht kennt.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MATT_IN_3_POSITIONEN, createPosition, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board } from "../quest1/Board";
import { saveBonusFortschrittLocal, holeUndSchalteMattIn3Versatz } from "../lib/storage";
import { KoenigMasterIcon, KoenigMasterDunkelIcon, TurmMasterIcon, DameMasterIcon } from "../lib/pieceMasters";
import { ExtraSternchenIcon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
// Sprach-Vollständigkeit (Claude-Projekt "ChessLynx",
// sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md, Fund
// A4): drei Zeilen der "großen Führung" (Screens 2/3, teils auch Screen 4) sind über
// mehrere Rätsel-Screens hinweg wortidentisch — jetzt rotierende Pools, gleiches Prinzip
// wie luxVarianten.ts. `zeileMitVariante` wird bewusst NUR innerhalb der an
// useLuxSprechzeile übergebenen Funktion aufgerufen (nicht direkt in
// `zeilenFuerAktuellenScreen`, die bei jedem Rerender neu läuft) — sonst würde der
// rotierende Zähler bei jedem Rerender statt nur bei echten Sprechvorgängen weiterzählen.
import { luxVariante } from "../lib/luxVarianten";
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B) — der einmalige Einführungssatz erscheint bereits in Fesselung.tsx.
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

const ENTKOMMEN_VARIANTEN = ["Er versucht, hier zu entkommen...", "Schau, er will fliehen...", "Er sucht einen Ausweg..."];
const NOCHMAL_VARIANTEN = ["Er versucht es noch einmal...", "Er sucht noch einen Ausweg...", "Nochmal versucht er zu entkommen..."];
const MATT_SCHLUSS_VARIANTEN = ["Und jetzt: der letzte Zug. Matt!", "Jetzt schnappt die Falle zu. Matt!", "Der letzte Schritt. Und Matt!"];

// Aktive Zugaufgaben für die "Lux fragen"-Hinweisfunktion: die drei Rätsel-Screens
// (2/3/4) — Screen 0 (Einladung) und Screen 1 (Treib-Entdecken) sind reine
// Tap-Through-/Vorführ-Szenen ohne eigenen Zug.
function istZugaufgabe(screen: ScreenId): boolean {
  return screen === 2 || screen === 3 || screen === 4;
}

function hinweisInhaltFuer(phase: Phase): string {
  if (phase === 0) return "Zieh den Turm auf das leuchtende Feld, um dem König eine Reihe abzuschneiden!";
  if (phase === 1) return "Jetzt die zweite Figur. Tipp auf das leuchtende Feld, um die nächste Reihe abzuschneiden!";
  return "Letzter Schritt. Tipp auf das leuchtende Feld für Matt!";
}

function zeileMitVariante(basis: string): string {
  if (basis === "Er versucht, hier zu entkommen...") return luxVariante(ENTKOMMEN_VARIANTEN, "mattin3-entkommt");
  if (basis === "Er versucht es noch einmal...") return luxVariante(NOCHMAL_VARIANTEN, "mattin3-nochmal");
  if (basis === "Und jetzt: der letzte Zug. Matt!") return luxVariante(MATT_SCHLUSS_VARIANTEN, "mattin3-matt-schluss");
  return basis;
}

type RaetselId = "turmleiter" | "damenUndTurm" | "reduziert" | "spiegelungALinie" | "drehung180";

// Geometrische Beschreibung je Rätsel (siehe chessEngine.ts/MATT_IN_3_POSITIONEN-Kommentar für
// die zugrunde liegende, verifizierte Zugfolge). `stueckA` zieht in Zug 1 UND Zug 3 (dieselbe
// Figur — Zug 1 an ihr Zwischenziel, Zug 3 von dort ans Mattfeld), `stueckB` zieht nur in
// Zug 2.
type RaetselDaten = {
  fen: string;
  eigenerKoenig: BoardSquare;
  stueckBIstDame: boolean;
  stueckAStart: BoardSquare;
  stueckAZwischenziel: BoardSquare;
  stueckAMattziel: BoardSquare;
  stueckBStart: BoardSquare;
  stueckBZiel: BoardSquare;
  gegnerKoenigStart: BoardSquare;
  gegnerKoenigNachZug1: BoardSquare;
  gegnerKoenigNachZug2: BoardSquare;
};

const RAETSEL: Record<RaetselId, RaetselDaten> = {
  turmleiter: {
    fen: MATT_IN_3_POSITIONEN.turmleiter,
    eigenerKoenig: { row: 0, col: 0 }, // a8
    stueckBIstDame: false,
    stueckAStart: { row: 2, col: 7 }, // h6
    stueckAZwischenziel: { row: 5, col: 7 }, // h3
    stueckAMattziel: { row: 7, col: 7 }, // h1
    stueckBStart: { row: 4, col: 0 }, // a4
    stueckBZiel: { row: 6, col: 0 }, // a2
    gegnerKoenigStart: { row: 5, col: 4 }, // e3
    gegnerKoenigNachZug1: { row: 6, col: 4 }, // e2
    gegnerKoenigNachZug2: { row: 7, col: 4 }, // e1
  },
  damenUndTurm: {
    fen: MATT_IN_3_POSITIONEN.damenUndTurm,
    eigenerKoenig: { row: 0, col: 0 }, // a8
    stueckBIstDame: true,
    stueckAStart: { row: 2, col: 7 }, // h6
    stueckAZwischenziel: { row: 5, col: 7 }, // h3
    stueckAMattziel: { row: 7, col: 7 }, // h1
    stueckBStart: { row: 4, col: 0 }, // a4
    stueckBZiel: { row: 6, col: 0 }, // a2
    gegnerKoenigStart: { row: 5, col: 4 }, // e3
    gegnerKoenigNachZug1: { row: 6, col: 4 }, // e2
    gegnerKoenigNachZug2: { row: 7, col: 4 }, // e1
  },
  reduziert: {
    fen: MATT_IN_3_POSITIONEN.reduziert,
    eigenerKoenig: { row: 7, col: 0 }, // a1
    stueckBIstDame: false,
    stueckAStart: { row: 5, col: 7 }, // h3
    stueckAZwischenziel: { row: 2, col: 7 }, // h6
    stueckAMattziel: { row: 0, col: 7 }, // h8
    stueckBStart: { row: 3, col: 0 }, // a5
    stueckBZiel: { row: 1, col: 0 }, // a7
    gegnerKoenigStart: { row: 2, col: 4 }, // e6
    gegnerKoenigNachZug1: { row: 1, col: 4 }, // e7
    gegnerKoenigNachZug2: { row: 0, col: 4 }, // e8
  },
  // NEU (2026-09-17, Pool-Erweiterung 3 -> 5, siehe chessEngine.ts/MATT_IN_3_POSITIONEN-
  // Kommentar und claude/wisent_endspiel_kuer_kuratierung_2026-09-17.md Abschnitt 2): reine
  // Brett-Isometrien der Turmleiter-Stellung. Alle {row,col}-Koordinaten hier NICHT von Hand
  // ausgerechnet, sondern programmatisch aus den algebraischen Feldnamen der bereits gegen
  // echtes chess.js verifizierten Zugfolge abgeleitet und gegengeprüft (siehe
  // verify/test-wisent-endspiel-kuer-logic.cjs).
  spiegelungALinie: {
    fen: MATT_IN_3_POSITIONEN.spiegelungALinie,
    eigenerKoenig: { row: 0, col: 7 }, // h8
    stueckBIstDame: false,
    stueckAStart: { row: 2, col: 0 }, // a6
    stueckAZwischenziel: { row: 5, col: 0 }, // a3
    stueckAMattziel: { row: 7, col: 0 }, // a1
    stueckBStart: { row: 4, col: 7 }, // h4
    stueckBZiel: { row: 6, col: 7 }, // h2
    gegnerKoenigStart: { row: 5, col: 3 }, // d3
    gegnerKoenigNachZug1: { row: 6, col: 3 }, // d2
    gegnerKoenigNachZug2: { row: 7, col: 3 }, // d1
  },
  drehung180: {
    fen: MATT_IN_3_POSITIONEN.drehung180,
    eigenerKoenig: { row: 7, col: 7 }, // h1
    stueckBIstDame: false,
    stueckAStart: { row: 3, col: 7 }, // h5
    stueckAZwischenziel: { row: 2, col: 7 }, // h6
    stueckAMattziel: { row: 0, col: 7 }, // h8
    stueckBStart: { row: 5, col: 0 }, // a3
    stueckBZiel: { row: 1, col: 0 }, // a7
    gegnerKoenigStart: { row: 2, col: 3 }, // d6
    gegnerKoenigNachZug1: { row: 1, col: 3 }, // d7
    gegnerKoenigNachZug2: { row: 0, col: 3 }, // d8
  },
};

// Feste Reihenfolge der fünf Rätsel-Geometrien für den rotierenden Fenster-Versatz (Christians
// Entscheidung bei Rückfrage 2026-09-17, siehe storage.ts/holeUndSchalteMattIn3Versatz-
// Kommentar). Versatz 0 (erster jemals erfolgter Besuch) ergibt exakt die bisherige feste
// Reihenfolge (Turmleiter -> Dame-und-Turm -> Reduziert) — siehe raetselFuerScreen unten.
const RAETSEL_REIHENFOLGE: readonly RaetselId[] = [
  "turmleiter",
  "damenUndTurm",
  "reduziert",
  "spiegelungALinie",
  "drehung180",
];

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5;
type Phase = 0 | 1 | 2; // welcher der drei Weißzüge wird gerade angeboten

// Screen 1 (Treib-Entdecken): reine Auto-Demo laut Skript, hier als tap-vorgeführte Bildfolge
// umgesetzt statt als echte Mehrfach-Zug-Animation — Board.tsx's `demoTarget`/`onDemoDone`
// ist für EINEN Vorführ-Zug ausgelegt, der danach wieder zurückspringt (siehe Rochade.tsx-
// Kommentar), nicht für eine PERMANENTE Drei-Zug-Sequenz mit zwei verschiedenen ziehenden
// Figuren. Eine echte Animationskette wäre eine eigene, größere Board.tsx-Erweiterung — hier
// bewusst durch vier antippbare, klar aufeinanderfolgende Standbilder ersetzt (Start, nach
// Zug 1, nach Zug 2, nach Zug 3/Matt), was die Kernidee ("Reihe für Reihe an den Rand")
// genauso vermittelt, ohne Board.tsx anfassen zu müssen.
const TREIB_ENTDECKEN_FRAMES = 4;

// Nutzerfeedback 2026-09-09 ("Übergänge langsam gestalten"), konsistent zu den übrigen
// Bonuskapiteln.
const UEBERGANGS_PAUSE_MS = 1800;

const SCREEN_SCRIPTS: Record<0 | 5, string[]> = {
  0: [
    "Für mutige Schach-Entdecker gibt es noch eine Extra-Aufgabe.",
    "Sie ist etwas kniffliger.",
    "Aber du schaffst das bestimmt!",
  ],
  5: [
    "Das war die schwierigste Aufgabe im ganzen Wald!",
    "Und du hast sie ganz allein gemeistert!",
  ],
};

export default function MattIn3() {
  const navigation = useNavigation<any>();
  // Wisent-Kür-Runde (2026-09-15): MattIn3 ist jetzt AUCH über screens/WisentKuerHub.tsx
  // erreichbar, zusätzlich zum bisherigen Einstieg (Extra-Karte am Ende von MattIn2.tsx —
  // siehe Datei-Kopfkommentar). Bewusst KEIN Umbau der sechs bestehenden, schon getesteten
  // Screens (der Hub-Konzepttext sieht dafür "5 Screens statt 6" vor, siehe
  // gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 4) — stattdessen nur das
  // Navigationsziel NACH Abschluss optional umschaltbar: ohne `rueckkehrZiel`-Param kehrt
  // dieses Kapitel zu "KidHome" zurück, vom Hub aus kommend zum Hub, von MattIn2.tsx aus
  // kommend ins jeweilige Revier (siehe Nachtrag 2026-09-17 oben). Siehe claude/
  // wisent_kuer_verdrahtung_2026-09-15.md für die volle Begründung dieser Änderung.
  const route = useRoute<any>();
  const rueckkehrZiel: string = route.params?.rueckkehrZiel ?? "KidHome";
  const rueckkehrParams = route.params?.rueckkehrParams;
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [treibFrame, setTreibFrame] = useState(0);
  const [phase, setPhase] = useState<Phase>(0);
  // Aktuelles Feld des gegnerischen Königs je Rätsel-Screen — startet bei RAETSEL[...].
  // gegnerKoenigStart, wird nach Zug 1/2 im selben Zug-Handler aktualisiert (siehe
  // onCorrectMove unten), inklusive eines ECHTEN chess.js-Zugs auf `game`.
  const [gegnerKoenigAt, setGegnerKoenigAt] = useState<BoardSquare>(RAETSEL.turmleiter.gegnerKoenigStart);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();
  // Rotierender Fenster-Versatz über den 5er-Pool (2026-09-17, siehe storage.ts/
  // holeUndSchalteMattIn3Versatz-Kommentar) — 0 als Default, bis der echte, gespeicherte Wert
  // geladen ist (identisch zur bisherigen festen Reihenfolge, siehe raetselFuerScreen unten).
  const [versatz, setVersatz] = useState<0 | 1 | 2 | 3 | 4>(0);
  useEffect(() => {
    let abgebrochen = false;
    holeUndSchalteMattIn3Versatz().then((v) => {
      if (!abgebrochen) setVersatz(v);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  // Screens 2/3/4 zeigen ein Fenster von drei aufeinanderfolgenden (zyklisch gewickelten)
  // Einträgen aus RAETSEL_REIHENFOLGE, beginnend bei `versatz` — Screen 1 (Treib-Entdecken)
  // bleibt bewusst die feste Turmleiter-Demo (siehe Datei-Kopfkommentar bei
  // TREIB_ENTDECKEN_FRAMES, unverändert).
  function raetselFuerScreen(s: ScreenId, versatzWert: number): RaetselId | null {
    if (s !== 2 && s !== 3 && s !== 4) return null;
    const fensterIndex = s - 2; // 0, 1, 2
    const poolIndex = (versatzWert + fensterIndex) % RAETSEL_REIHENFOLGE.length;
    return RAETSEL_REIHENFOLGE[poolIndex];
  }
  const raetselId = raetselFuerScreen(screen, versatz);
  const raetsel = raetselId ? RAETSEL[raetselId] : null;

  const game = useMemo(() => (raetsel ? createPosition(raetsel.fen) : null), [screen, versatz]);

  useEffect(() => {
    setPhase(0);
    setTreibFrame(0);
    if (raetsel) setGegnerKoenigAt(raetsel.gegnerKoenigStart);
  }, [screen, versatz]);

  // Screen- ODER Phasen-Wechsel setzt die "Lux fragen"-Geste zurück — jeder der drei
  // Weißzüge eines Rätsels ist eine eigene "frische" Zugaufgabe.
  useEffect(() => {
    setHinweisPhase("still");
  }, [screen, phase]);

  function zeilenFuerAktuellenScreen(): string[] {
    if (screen === 0 || screen === 5) return SCREEN_SCRIPTS[screen];
    if (screen === 1) {
      const frames = [
        "Schau, wie sein Platz immer kleiner wird. Wir schieben ihn Stück für Stück an den Rand.",
        "Ein Turm schneidet ihm eine Reihe ab...",
        "...der andere Turm die nächste...",
        "...bis er ganz am Rand gefangen ist. Matt!",
      ];
      return [frames[treibFrame]];
    }
    if (!raetsel) return [""];
    const grosseFuehrung = screen === 2 || screen === 3;
    const stueckBName = raetsel.stueckBIstDame ? "Dame" : "Turm";
    if (phase === 0) {
      return grosseFuehrung
        ? [`Ziehe den Turm, um dem König eine ganze Reihe abzuschneiden.`]
        : ["Diesmal probierst du es ganz allein.", "Ich bin da, wenn du magst. Tipp einfach auf mich."];
    }
    if (phase === 1) {
      return grosseFuehrung
        ? [
            "Er versucht, hier zu entkommen...",
            `Jetzt schneidet die ${stueckBName} die nächste Reihe ab!`,
          ]
        : ["Er versucht, hier zu entkommen..."];
    }
    // phase === 2
    return grosseFuehrung
      ? ["Er versucht es noch einmal...", "Und jetzt: der letzte Zug. Matt!"]
      : ["Und jetzt: der letzte Zug!"];
  }

  const lines = zeilenFuerAktuellenScreen();
  const isLastLine = lineIndex === lines.length - 1;

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

  // Siehe identischer Kommentar/Zweck in Fesselung.tsx.
  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  // Nutzerfeedback 2026-09-09 ("In der Einführung bitte selbständig durchführen ohne
  // klicken"): Screen 0 (Einladung) spricht seine Zeilen jetzt automatisch und geht danach
  // von selbst zu Screen 1 weiter, konsistent zu den übrigen Bonuskapiteln. Screen 1
  // (Treib-Entdecken) bleibt bewusst die Ausnahme — er ist keine reine Erzählung, sondern
  // eine eigens als tap-vorgeführte Bildfolge umgesetzte Ersatz-Animation (siehe
  // Kopfkommentar bei TREIB_ENTDECKEN_FRAMES): jedes Antippen zeigt ein neues Stellungsbild,
  // das Tempo hier dem Kind zu überlassen ist deshalb weiterhin die richtige Wahl.
  const autoWeiter = true;
  const zugaufgabeAktiv = istZugaufgabe(screen);
  // Nutzerfeedback 2026-09-09 ("die vorgeschlagenen Züge bei den Übungen entfernen, sonst
  // sind die Hinweise sinnlos") — siehe ausführlicher Kommentar in Fesselung.tsx.
  const zeigeZielringe = !hinweiseAktiv || hinweisPhase === "hinweis";
  const sprechSchluessel =
    hinweisPhase === "still" ? `${screen}-${phase}-${treibFrame}-${lineIndex}` : `${screen}-${phase}-${hinweisPhase}`;
  // `aktuelleZeile` (statt roh `lines[lineIndex]`) fürs Rendern unten — sonst würde die
  // sichtbare Sprechblase die feste Basiszeile zeigen, während tatsächlich eine rotierte
  // Variante oder ein Hinweis gesprochen wird (siehe Import-Kommentar oben zu
  // `zeileMitVariante`).
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    sprechSchluessel,
    hinweisPhase === "still"
      ? () => zeileMitVariante(zeilenFuerAktuellenScreen()[lineIndex])
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : hinweisInhaltFuer(phase),
    hinweisPhase === "still"
      ? !isLastLine
        ? () => setLineIndex((i) => i + 1)
        : screen === 0
          ? () => {
              uebergangsTimer.current = setTimeout(() => gehZu(1), UEBERGANGS_PAUSE_MS);
            }
          : screen === 1
            ? // Gerätetest 2026-09-11 (Nutzerwunsch: Erklär-Teile laufen von selbst, getippt wird
              // nur, wo das Kind etwas tut): die Treib-Bildfolge blättert nach jeder gesprochenen
              // Zeile selbst weiter; Antippen beschleunigt weiterhin, ist aber nicht mehr nötig.
              () => {
                uebergangsTimer.current = setTimeout(() => {
                  if (treibFrame < TREIB_ENTDECKEN_FRAMES - 1) {
                    setTreibFrame((f) => f + 1);
                    setLineIndex(0);
                  } else {
                    gehZu(2);
                  }
                }, UEBERGANGS_PAUSE_MS);
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
    await saveBonusFortschrittLocal("mattIn3", true);
  }

  // Gemeinsame Zug-Behandlung für alle drei Rätsel-Screens (2/3/4) — siehe Datei-
  // Kopfkommentar zur Drei-Phasen-Mechanik. `stueckVon`/`stueckNach` ist die gerade ziehende
  // eigene Figur; nach Phase 0 und 1 wird zusätzlich automatisch ein ECHTER chess.js-Zug für
  // den gegnerischen König ausgeführt (die "eine mögliche Antwort", siehe Kopfkommentar).
  function ziehenUndWeiter(stueckVon: BoardSquare, stueckNach: BoardSquare, naechsteAktion: () => void) {
    if (!game) return;
    tryMove(game, stueckVon, stueckNach);
    if (phase < 2) {
      const zielKoenig = phase === 0 ? raetsel!.gegnerKoenigNachZug1 : raetsel!.gegnerKoenigNachZug2;
      tryMove(game, gegnerKoenigAt, zielKoenig);
      setGegnerKoenigAt(zielKoenig);
    }
    setLineIndex(0);
    naechsteAktion();
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

      {/* Screen 0 — Einladung: freiwilliger, einladender Ton statt Pflicht-Vorstellung. */}
      {screen === 0 && (
        <Pressable style={styles.tapArea} onPress={() => advanceOrGo(1)}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: RAETSEL.turmleiter.stueckAStart,
              legalTargets: [],
              pieceIcon: <TurmMasterIcon />,
              zusatzfiguren: [
                { at: RAETSEL.turmleiter.stueckBStart, icon: <TurmMasterIcon /> },
                { at: RAETSEL.turmleiter.eigenerKoenig, icon: <KoenigMasterIcon /> },
                { at: RAETSEL.turmleiter.gegnerKoenigStart, icon: <KoenigMasterDunkelIcon /> },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screen 1 — Treib-Entdecken: vier antippbare Standbilder (siehe Kopfkommentar bei
          TREIB_ENTDECKEN_FRAMES), keine Lösung verlangt. */}
      {screen === 1 && (
        <Pressable
          style={styles.tapArea}
          onPress={() => {
            if (treibFrame < TREIB_ENTDECKEN_FRAMES - 1) {
              setTreibFrame((f) => f + 1);
              setLineIndex(0);
            } else {
              gehZu(2);
            }
          }}
        >
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: treibFrame < 2 ? RAETSEL.turmleiter.stueckAStart : RAETSEL.turmleiter.stueckAZwischenziel,
              legalTargets: [],
              pieceIcon: <TurmMasterIcon />,
              zusatzfiguren: [
                {
                  at: treibFrame < 3 ? RAETSEL.turmleiter.stueckBStart : RAETSEL.turmleiter.stueckBZiel,
                  icon: <TurmMasterIcon />,
                },
                { at: RAETSEL.turmleiter.eigenerKoenig, icon: <KoenigMasterIcon /> },
                {
                  at:
                    treibFrame === 0
                      ? RAETSEL.turmleiter.gegnerKoenigStart
                      : treibFrame === 1
                        ? RAETSEL.turmleiter.gegnerKoenigNachZug1
                        : RAETSEL.turmleiter.gegnerKoenigNachZug2,
                  icon: <KoenigMasterDunkelIcon />,
                },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </Pressable>
      )}

      {/* Screens 2/3/4 — die drei Rätsel-Screens, alle mit derselben Drei-Phasen-Mechanik
          (siehe ziehenUndWeiter oben). Phase 0/1: die jeweils richtige Figur zieht (nur ihr
          Zielfeld antippbar, "onlyTarget"-Muster). Phase 2: Mattzug. */}
      {raetsel && game && phase === 0 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: raetsel.stueckAStart,
            legalTargets: [raetsel.stueckAZwischenziel],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            zusatzfiguren: [
              { at: raetsel.stueckBStart, icon: raetsel.stueckBIstDame ? <DameMasterIcon /> : <TurmMasterIcon /> },
              { at: raetsel.eigenerKoenig, icon: <KoenigMasterIcon /> },
              { at: gegnerKoenigAt, icon: <KoenigMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={(target) => ziehenUndWeiter(raetsel.stueckAStart, target, () => setPhase(1))}
        />
      )}
      {raetsel && game && phase === 1 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: raetsel.stueckBStart,
            legalTargets: [raetsel.stueckBZiel],
            zeigeZielringe,
            pieceIcon: raetsel.stueckBIstDame ? <DameMasterIcon /> : <TurmMasterIcon />,
            zusatzfiguren: [
              { at: raetsel.stueckAZwischenziel, icon: <TurmMasterIcon /> },
              { at: raetsel.eigenerKoenig, icon: <KoenigMasterIcon /> },
              { at: gegnerKoenigAt, icon: <KoenigMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={(target) => ziehenUndWeiter(raetsel.stueckBStart, target, () => setPhase(2))}
        />
      )}
      {raetsel && game && phase === 2 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: raetsel.stueckAZwischenziel,
            legalTargets: [raetsel.stueckAMattziel],
            zeigeZielringe,
            pieceIcon: <TurmMasterIcon />,
            zusatzfiguren: [
              { at: raetsel.stueckBZiel, icon: raetsel.stueckBIstDame ? <DameMasterIcon /> : <TurmMasterIcon /> },
              { at: raetsel.eigenerKoenig, icon: <KoenigMasterIcon /> },
              { at: gegnerKoenigAt, icon: <KoenigMasterDunkelIcon /> },
            ],
          }}
          onCorrectMove={(target) => {
            if (game) tryMove(game, raetsel.stueckAZwischenziel, target);
            if (screen === 2) gehZu(3);
            else if (screen === 3) gehZu(4);
            else {
              handleKapitelAbgeschlossen();
              gehZu(5);
            }
          }}
        />
      )}

      {screen === 5 && (
        // Übergang zurück zum Aufrufer — siehe Datei-Kopfkommentar (Nachtrag 2026-09-17):
        // Default "KidHome", oder das per Param übergebene Ziel (z. B. zurück ins Revier).
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate(rueckkehrZiel, rueckkehrParams)}>
          <QuestGeschafft>
            <ExtraSternchenIcon size={92} />
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
