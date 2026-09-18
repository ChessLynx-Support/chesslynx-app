// Zweites Bonuskapitel: die Rochade — siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "Rochade" (gate-pflichtig fürs Schlosstor).
// König (Hirsch) und Turm (Bär) sind die "guten Freunde" aus Screen 1 — beide bereits aus
// Quest 2/6 bekannte Figuren, dieses Kapitel führt keine neue Kreatur ein, sondern eine
// neue REGEL (genau wie Fesselung.tsx für den Turm).
//
// Abweichung von der "7 Screens"-Überschrift im Claude-Projekt-Dokument: der dort
// beschriebene Screen 5 ("Sinn-Kontext") ist im Fließtext ausdrücklich als "kein eigener
// Screen mehr, in die Erfolgszeile integriert" markiert. Diese Datei folgt — wie schon bei
// Fesselung.tsx — dem tatsächlich ausformulierten Screen-Inhalt, nicht der Kopfzeilen-Zahl.
//
// Update (2026-09-09, Nutzer-Feedback nach Gerätetest, Rückfrage 3 "Ja, als neues Beispiel
// ergänzen"): ein zweites Stopp!-Beispiel ergänzt (neu: Screen 4) — die Rochade scheitert
// hier nicht an einer physisch blockierenden Figur, sondern daran, dass eine gegnerische
// Figur freie Sicht auf eines der Felder hat, die der König dabei durchqueren würde ("durchs
// Schach"). Dadurch jetzt 7 echte Screens statt 6:
//
//   0 Vorstellung        — statisches Brett, König + beide Türme unbewegt, keine Interaktion.
//   1 Seite A (kurz)      — Auto-Demo (König springt zu g1) + danach echter, eigener Zug.
//   2 Seite B (lang)       — dasselbe Muster, jetzt zur Damenseite (c1), Turm zieht 3 Felder.
//   3 Stopp!-Aufgabe 1    — eigene Figur zwischen König und Turm verhindert die Rochade.
//   4 Stopp!-Aufgabe 2    — niemand steht im Weg, aber ein gegnerischer Turm bedroht das
//                           Durchgangsfeld d1 — die Rochade scheitert trotzdem.
//   5 Mini-Übung          — 3 kuratierte Positionen (lang/kurz/blockiert gemischt).
//   6 Abschluss           — QuestGeschafft + neues Rochade-Kapitel-Abzeichen.
//
// Bekannte, bewusste Vereinfachung (siehe auch chessEngine.ts/ROCHADE_POSITIONS-Kommentar):
// Board.tsx animiert pro Zug nur EINE Figur. Der Turm "springt" deshalb ohne eigene
// Animation an sein neues Feld, sichtbar wird nur der animierte Königszug — eine echte
// Zwei-Figuren-Gleichzeitigkeits-Animation ist zurückgestellt.
//
// Bewusst OHNE QuestMoveScreen (wie schon Fesselung.tsx) — diese Szene braucht gleichzeitig
// zwei benannte, eigene Figuren (König + Turm) plus eine Demo/Interaktiv-Zweiteilung
// innerhalb ein und desselben Screens, die für die sechs Haupt-Quests nicht vorgesehen ist.

import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ROCHADE_POSITIONS, createPosition, tryMove, type BoardSquare } from "../lib/chessEngine";
import { Board, type BoardConfig } from "../quest1/Board";
import { saveBonusFortschrittLocal } from "../lib/storage";
import { KoenigMasterIcon, TurmMasterIcon, TurmMasterDunkelIcon, SpringerMasterIcon } from "../lib/pieceMasters";
import { RochadeIcon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B) — der einmalige Einführungssatz erscheint bereits in Fesselung.tsx (der
// allerersten Zugaufgabe im Bonusbereich), hier deshalb nicht nochmal nötig.
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

// --- Feste Feldkoordinaten (siehe chessEngine.ts/ROCHADE_POSITIONS-Kommentar) -------------
// Die Rochade ist an die echten Startfelder e1/a1/h1 gebunden — anders als bei den übrigen
// Bonuskapiteln keine frei gewählte Übungsposition.

const KOENIG_START: BoardSquare = { row: 7, col: 4 }; // e1
const TURM_KURZ_START: BoardSquare = { row: 7, col: 7 }; // h1
const TURM_LANG_START: BoardSquare = { row: 7, col: 0 }; // a1
const KOENIG_KURZ_ZIEL: BoardSquare = { row: 7, col: 6 }; // g1
const KOENIG_LANG_ZIEL: BoardSquare = { row: 7, col: 2 }; // c1
const BLOCKIERER_FELD: BoardSquare = { row: 7, col: 3 }; // d1 — eigener Springer im Weg
// Neu (2026-09-09, zweites Stopp!-Beispiel "durchs Schach"): dasselbe Feld d1 wie
// BLOCKIERER_FELD oben — bewusst dieselbe Koordinate, um zu zeigen, dass ein und dasselbe
// Durchgangsfeld die Rochade aus zwei GANZ unterschiedlichen Gründen verhindern kann: einmal,
// weil dort jemand STEHT (Screen 3), einmal, weil es nur BEDROHT ist, ohne dass dort jemand
// steht (Screen 4). Als eigene Konstante gehalten, damit die Absicht an der Aufrufstelle klar
// benannt ist, statt denselben Namen "BLOCKIERER_FELD" in einem Kontext ohne Blockade-Figur
// wiederzuverwenden.
const KOENIG_LANG_DURCHGANG: BoardSquare = { row: 7, col: 3 }; // d1, bedrohtes Durchgangsfeld
const GEGNERTURM_ANGRIFF: BoardSquare = { row: 0, col: 3 }; // d8 — sieht die ganze d-Linie hinunter bis d1, ungehindert (kein eigener Bauer/keine andere Figur dazwischen)

type UebungsArt = "kurz" | "lang" | "blockiert";
type UebungsPosition = { fen: string; kind: UebungsArt; ziel: BoardSquare; turmVon: BoardSquare };

// Mini-Übung (Screen 5): drei kuratierte Positionen, Richtung gemischt, mindestens eine
// Wiederholung pro Richtung plus eine blockierte Position — siehe Skript-Vorgabe. Nutzt
// dieselben drei FENs wie die vorherigen Lehr-Screens (die Rochade-Geometrie lässt sich
// nicht auf andere Felder "verschieben", siehe chessEngine.ts-Kommentar) — bewusste
// Wiederverwendung statt künstlich neuer, aber geometrisch identischer Stellungen.
const UEBUNGS_POSITIONEN: UebungsPosition[] = [
  { fen: ROCHADE_POSITIONS.langeRochade, kind: "lang", ziel: KOENIG_LANG_ZIEL, turmVon: TURM_LANG_START },
  { fen: ROCHADE_POSITIONS.kurzeRochade, kind: "kurz", ziel: KOENIG_KURZ_ZIEL, turmVon: TURM_KURZ_START },
  { fen: ROCHADE_POSITIONS.wegBlockiert, kind: "blockiert", ziel: KOENIG_LANG_ZIEL, turmVon: TURM_LANG_START },
];

type ScreenId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const SCREEN_SCRIPTS: Record<ScreenId, string[]> = {
  0: [
    // Paket 1 (2026-09-11): "Heute" gestrichen (wie Fesselung), zwei Zeilen zu einer zusammengezogen.
    // 2026-09-11 (Nutzerentscheidung): "Hallo, ich bin's wieder!" entfällt wie in Quest 2–6.
    "Ich zeig dir noch einen Schach-Trick!",
    "Der König und der Turm sind gute Freunde.",
    "Der König darf sonst immer nur einen Schritt machen – das weißt du schon.",
    "Aber jetzt passiert etwas ganz Besonderes!",
    "Nur dieses eine Mal im ganzen Spiel!",
  ],
  1: [
    "Schau: Sie tauschen die Plätze!",
    "Gemeinsam, in einem einzigen Zug!",
    "Das nennt man in der Schachwelt: Rochade!",
    "Jetzt bist du dran!",
    "Tipp auf das Feld, wohin der König hüpfen möchte.",
  ],
  2: [
    "Er kann das auch zur anderen Seite machen.",
    "Schau genau hin, der Turm hat hier einen etwas weiteren Weg.",
    "Jetzt bist du wieder dran!",
  ],
  // Nutzer-Feedback 2026-09-09 ("Das muss deutlicher herausgearbeitet werden, dass das die
  // Stop! Aufgabe ist, ggf. sollte Luchs dazu auch etwas sagen"): bisher endete dieser Screen
  // mit der Regel-Erklärung, ohne das Kind zum Antippen des (unmarkierten) Zielfelds
  // aufzufordern — dadurch war nicht erkennbar, dass hier überhaupt etwas zu TUN ist. Dritte
  // Zeile neu ergänzt.
  3: [
    "Diesmal steht aber jemand im Weg.",
    "Erst muss der Platz zwischen König und Turm frei sein, dann geht die Rochade.",
    "Tipp trotzdem auf das Feld, wohin der König wollte — dann zeig ich dir, warum es diesmal nicht geht!",
  ],
  // Neu (2026-09-09, Nutzer-Rückfrage 3 "Ja, als neues Beispiel ergänzen"): zweites
  // Stopp!-Beispiel — niemand steht im Weg, aber der gegnerische Turm bedroht das
  // Durchgangsfeld d1 aus der Ferne. Siehe KOENIG_LANG_DURCHGANG/GEGNERTURM_ANGRIFF oben.
  4: [
    "Diesmal steht niemand im Weg!",
    "Aber schau genau hin: der andere Turm sieht bis zu dem Feld, wo der König durchmüsste.",
    "Würde der König da durchgehen, wäre er kurz in Gefahr.",
    "Deshalb geht die Rochade auch dann nicht, wenn nur der Weg bedroht ist — nicht nur, wenn dort jemand steht.",
    "Tipp trotzdem auf das Feld, wohin der König wollte, dann zeig ich es dir!",
  ],
  5: ["Jetzt bist du dran!", "Kannst du die Rochade in jeder Stellung finden?"],
  6: ["Wieder ein neuer Schach-Trick für dich!", "Und du beherrschst ihn auf beiden Seiten!", "Fantastisch gemacht!"],
};

const TIPP_SCREENS = new Set<ScreenId>([0]);

// Nutzerfeedback 2026-09-09 ("In der Einführung bitte selbständig durchführen ohne
// klicken ... Übergänge langsam gestalten"), hier konsistent zu Fesselung.tsx übernommen
// (dieselbe reine Tipp-durch-Erzählung-Screen-Art): wohin Screen 0 von selbst weitergeht,
// sobald seine letzte Zeile fertig gesprochen ist.
const NAECHSTER_SCREEN_NACH_EINFUEHRUNG: Partial<Record<ScreenId, ScreenId>> = { 0: 1 };
const UEBERGANGS_PAUSE_MS = 1800;

// Aktive Zugaufgaben: Screen 1/2 erst NACH der Auto-Demo (vorher ist gar keine
// Berührung möglich), Screen 3/4 (beide Stopp!-Aufgaben) und Screen 5 (Mini-Übung) durchgehend.
function istZugaufgabe(screen: ScreenId, demoDone: boolean): boolean {
  if (screen === 1 || screen === 2) return demoDone;
  return screen === 3 || screen === 4 || screen === 5;
}

function hinweisInhaltFuer(screen: ScreenId, uebungAktuelle: UebungsPosition | null): string {
  if (screen === 1) return "Tipp auf das leuchtende Feld. Dort hüpft der König für die Rochade hin!";
  if (screen === 2) return "Auch hier: tipp auf das leuchtende Feld, dann rochiert der König zur anderen Seite!";
  if (screen === 3) return "Zwischen König und Turm steht noch jemand im Weg. Deshalb geht hier keine Rochade. Tipp auf das Stopp-Feld!";
  if (screen === 4) return "Der andere Turm sieht das Feld, wo der König durchmüsste. Deshalb geht hier keine Rochade. Tipp trotzdem auf das Zielfeld!";
  if (screen === 5) {
    if (uebungAktuelle?.kind === "blockiert") {
      return "Hier steht wieder jemand im Weg. Tipp auf das Stopp-Feld, statt auf die Rochade zu hoffen!";
    }
    return "Tipp auf das leuchtende Feld, dorthin hüpft der König!";
  }
  return "";
}

export default function Rochade() {
  const navigation = useNavigation<any>();
  // Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
  // schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md): dieses Kapitel läuft jetzt als
  // "Erstlehre" im Dachshöhle-Revier (screens/Revier.tsx, lib/revierErstlehre.ts) statt in
  // einer festen Schlossvorplatz-Kette — `rueckkehrZiel`/`rueckkehrParams` funktionieren
  // exakt wie das bereits bestehende Muster in bonus/MattIn3.tsx.
  const route = useRoute<any>();
  const rueckkehrZiel: string = route.params?.rueckkehrZiel ?? "KidHome";
  const rueckkehrParams = route.params?.rueckkehrParams;
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [demoDone, setDemoDone] = useState(false);
  const [uebungIndex, setUebungIndex] = useState(0);
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const hinweiseAktiv = useHinweiseAktiv();

  const lines = SCREEN_SCRIPTS[screen];
  const isLastLine = lineIndex === lines.length - 1;

  // Screen-Wechsel UND das Ende der Auto-Demo (Screen 1/2, `demoDone` wird true) setzen
  // die Antipp-Geste zurück — ab hier beginnt jeweils eine neue, "frische" Zugaufgabe.
  useEffect(() => {
    setHinweisPhase("still");
  }, [screen, demoDone]);

  // Siehe identischer Kommentar/Zweck in Fesselung.tsx.
  const uebergangsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (uebergangsTimer.current) clearTimeout(uebergangsTimer.current);
    };
  }, [screen]);

  function gehZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
  }

  // 2026-09-18 (Christian: Einführungen/Erklärungen dürfen nicht überspringbar und während
  // sie laufen nicht per Eingabe unterbrechbar sein, "Zurück" bleibt die einzige Ausnahme —
  // siehe ausführliche Begründung in bonus/Fesselung.tsx): Der frühere manuelle
  // "Weitertippen"-Weg (`advanceOrGo`, per `Pressable` auf dem Vorstellungs-Screen) ist
  // ersatzlos entfernt. Der Screen läuft ausschließlich über das an echtes Sprechende
  // gekoppelte `onFertig` weiter.

  useEffect(() => {
    setDemoDone(false);
  }, [screen]);

  const uebungAktuelle = UEBUNGS_POSITIONEN[uebungIndex];
  // Siehe Fesselung.tsx-Kommentar: alle Screens sprechen ihre Zeilen jetzt automatisch.
  const autoWeiter = true;
  const zugaufgabeAktiv = istZugaufgabe(screen, demoDone);
  // Nutzerfeedback 2026-09-09 ("die vorgeschlagenen Züge bei den Übungen entfernen, sonst
  // sind die Hinweise sinnlos") — siehe ausführlicher Kommentar in Fesselung.tsx.
  const zeigeZielringe = !hinweiseAktiv || hinweisPhase === "hinweis";
  const sprechSchluessel = hinweisPhase === "still" ? `${screen}-${lineIndex}` : `${screen}-${hinweisPhase}`;
  const sprechZeile =
    hinweisPhase === "still"
      ? lines[lineIndex]
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : hinweisInhaltFuer(screen, uebungAktuelle);
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

  // chess.js-Instanz je Screen (bzw. je Mini-Übungsschritt) — dasselbe `useMemo`-Muster wie
  // in Fesselung.tsx.
  const game = useMemo(() => {
    if (screen === 1) return createPosition(ROCHADE_POSITIONS.kurzeRochade);
    if (screen === 2) return createPosition(ROCHADE_POSITIONS.langeRochade);
    if (screen === 3) return createPosition(ROCHADE_POSITIONS.wegBlockiert);
    if (screen === 4) return createPosition(ROCHADE_POSITIONS.wegBedroht);
    if (screen === 5) return createPosition(UEBUNGS_POSITIONEN[uebungIndex].fen);
    return null;
  }, [screen, uebungIndex]);

  async function handleKapitelAbgeschlossen() {
    await saveBonusFortschrittLocal("rochade", true);
  }

  function naechsteUebungOderAbschluss() {
    if (uebungIndex < UEBUNGS_POSITIONEN.length - 1) {
      setUebungIndex((i) => i + 1);
    } else {
      handleKapitelAbgeschlossen();
      gehZu(6);
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

      {/* Screen 0 — Vorstellung: König + beide Türme unbewegt, keine Interaktion. */}
      {screen === 0 && (
        <View style={styles.tapArea}>
          <Board
            config={{
              rows: 8,
              cols: 8,
              pieceAt: KOENIG_START,
              legalTargets: [],
              pieceIcon: <KoenigMasterIcon />,
              zusatzfiguren: [
                { at: TURM_KURZ_START, icon: <TurmMasterIcon /> },
                { at: TURM_LANG_START, icon: <TurmMasterIcon /> },
              ],
            }}
            onCorrectMove={() => {}}
            disabled
          />
        </View>
      )}

      {/* Screen 1 — Seite A (kurze Rochade): erst Auto-Demo, danach echter, eigener Zug. Nur
          DAS Zielfeld ist antippbar (bewusste Einschränkung für diesen Einführungs-Screen,
          analog zum "onlyTarget"-Muster aus Quest4.tsx — nicht die sonst übliche "alle
          Legalzüge anbieten"-Regel, weil hier gezielt genau EIN neuer Zugtyp vorgeführt wird). */}
      {screen === 1 && game && !demoDone && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [],
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: TURM_KURZ_START, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={() => {}}
          demoTarget={KOENIG_KURZ_ZIEL}
          onDemoDone={() => setDemoDone(true)}
        />
      )}
      {screen === 1 && game && demoDone && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [KOENIG_KURZ_ZIEL],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: TURM_KURZ_START, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            gehZu(2);
          }}
        />
      )}

      {/* Screen 2 — Seite B (lange Rochade): gleiches Muster, Damenseite. */}
      {screen === 2 && game && !demoDone && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [],
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: TURM_LANG_START, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={() => {}}
          demoTarget={KOENIG_LANG_ZIEL}
          onDemoDone={() => setDemoDone(true)}
        />
      )}
      {screen === 2 && game && demoDone && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [KOENIG_LANG_ZIEL],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: TURM_LANG_START, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            gehZu(3);
          }}
        />
      )}

      {/* Screen 3 — Stopp!-Aufgabe: eigener Springer zwischen König und Turm, c1 ist dadurch
          strukturell unerreichbar (kein echter Legalzug) -> legalTargets bewusst leer, nur
          das Stopp!-Feld ist antippbar (dieselbe Konvention wie Quest1 Screen 4). */}
      {screen === 3 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [],
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [
              { at: TURM_LANG_START, icon: <TurmMasterIcon /> },
              { at: BLOCKIERER_FELD, icon: <SpringerMasterIcon /> },
            ],
            trapTarget: KOENIG_LANG_ZIEL,
          }}
          onCorrectMove={() => {}}
          onTrapTap={() => setTimeout(() => gehZu(4), 950)}
        />
      )}

      {/* Screen 4 — Stopp!-Aufgabe 2 (neu, 2026-09-09): niemand steht im Weg, aber der
          gegnerische Turm auf d8 bedroht das Durchgangsfeld d1 aus der Ferne — die Rochade
          scheitert deshalb trotzdem. legalTargets bewusst leer (wie Screen 3), nur das
          Stopp!-Feld c1 ist antippbar. bedrohtAt/angreiferAt zeichnen zusätzlich die bereits
          bestehende gestrichelte Bedrohungslinie (siehe Board.tsx) vom Turm zum bedrohten
          Feld — macht "eine andere Figur hat freie Sicht darauf" sichtbar, ohne ein neues
          UI-Element zu brauchen. */}
      {screen === 4 && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [],
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [
              { at: TURM_LANG_START, icon: <TurmMasterIcon /> },
              { at: GEGNERTURM_ANGRIFF, icon: <TurmMasterDunkelIcon /> },
            ],
            bedrohtAt: KOENIG_LANG_DURCHGANG,
            angreiferAt: GEGNERTURM_ANGRIFF,
            trapTarget: KOENIG_LANG_ZIEL,
          }}
          onCorrectMove={() => {}}
          onTrapTap={() => setTimeout(() => gehZu(5), 950)}
        />
      )}

      {/* Screen 5 — Mini-Übung: 3 kuratierte Positionen (lang/kurz/blockiert gemischt). */}
      {screen === 5 && game && uebungAktuelle.kind !== "blockiert" && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [uebungAktuelle.ziel],
            zeigeZielringe,
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [{ at: uebungAktuelle.turmVon, icon: <TurmMasterIcon /> }],
          }}
          onCorrectMove={(target) => {
            tryMove(game, KOENIG_START, target);
            naechsteUebungOderAbschluss();
          }}
        />
      )}
      {screen === 5 && game && uebungAktuelle.kind === "blockiert" && (
        <Board
          config={{
            rows: 8,
            cols: 8,
            pieceAt: KOENIG_START,
            legalTargets: [],
            pieceIcon: <KoenigMasterIcon />,
            zusatzfiguren: [
              { at: uebungAktuelle.turmVon, icon: <TurmMasterIcon /> },
              { at: BLOCKIERER_FELD, icon: <SpringerMasterIcon /> },
            ],
            trapTarget: uebungAktuelle.ziel,
          }}
          onCorrectMove={() => {}}
          onTrapTap={() => setTimeout(naechsteUebungOderAbschluss, 950)}
        />
      )}

      {screen === 6 && (
        // Nachtrag 2026-09-17: führt jetzt zurück zum `rueckkehrZiel` (Standard: das
        // Dachshöhle-Revier, aus dem diese Erstlehre gestartet wurde) statt fest zum
        // nächsten Bonuskapitel — siehe Fesselung.tsx-Kommentar, warum die frühere
        // ununterbrochene Kette entfallen ist.
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate(rueckkehrZiel, rueckkehrParams)}>
          <QuestGeschafft>
            <RochadeIcon size={92} />
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
