// Laufzeit-Komponente für eine einzelne Endlosmodus-Aufgabe (siehe lib/endlosmodusAufgaben.tsx
// für die Brett-Konfigurationen und dortigen Kommentar, warum dies NICHT einfach
// QuestMoveScreen.tsx wiederverwendet: volle FEN-Validierung statt `createPosition()`s
// skipValidation, und bedrohtAt/angreiferAt unabhängig von der ziehenden Figur).
//
// Bewusst OHNE Lux-Sprechzeile — wie schon screens/Revier.tsx (siehe dortiger Kommentar):
// für den Endlosmodus existiert noch keine freigegebene Sprechzeile ("Sprechzeilen-Vorgabe
// ... Ich-/Wir-Perspektive", claude/fahrplan_story_endlosmodus_und_launch_2026-09-09.md,
// Teil B1 — noch offen). Die Erfolgsrückmeldung läuft deshalb rein visuell/haptisch über
// die bereits bestehende QuestGeschafft-Komponente (Funkeln + Haptik + Klang), genau wie an
// anderen Stellen der App ohne zusätzliche gesprochene Zeile.
//
// Nachtrag (2026-09-17, Christian: "Hinweise von Lux, falls der gesuchte Zug nicht gefunden
// wird und direkt die Möglichkeit, es nochmal zu probieren", siehe claude/taktik_
// schwierigkeitseskalation_konzept_2026-09-16.md):
//   1. "Nochmal versuchen" — ein Zug auf ein zusätzliches, aber nicht lösendes Legalfeld
//      (siehe endlosmodusAufgaben.tsx, `zielTargets`) bewegt die Figur bewusst wirklich
//      dorthin und die Übung geht von der neuen Position weiter (kein Fehler, keine
//      Bestrafung). Das kann ein Kind aber in eine Stellung bringen, aus der der eigentliche
//      Lernzug nicht mehr sichtbar ist (die Zielfigur ist z. B. nicht mehr erreichbar) — der
//      Reset-Knopf lädt exakt die ursprüngliche FEN erneut, ohne den Screen zu verlassen.
//   2. Hinweis-Knopf — NUR ein generischer, stufenabhängiger Text (kein Audio, keine
//      Lux-Sprechzeile, siehe Kommentar oben, warum das hier noch nicht existiert), und NUR
//      bei den Erobern-Eskalationsaufgaben (`aufgabe.stufe` gesetzt) sichtbar, respektiert den
//      Eltern-Schalter "Hinweise von Lux" (useHinweiseAktiv, wie überall sonst in der App).
//      Der Text wird bewusst hier zur Laufzeit gebaut, nicht in endlosmodusAufgaben.tsx
//      eingebrannt (siehe dortiger Kommentar zu `stufe`, "FUNKTION statt Konstante").
//
// Nachtrag (2026-09-17, Stufe-3-Interaktionsmodell, siehe claude/
// stufe3_interaktionsmodell_konzept_2026-09-17.md — Christians Rückmeldung beim Vorstellen
// der Gefährten-Motive-Kuration): bei STUFE 3 (alle Motive, auch rückwirkend Eichhörnchen-/
// Dachshöhle-Erobern) darf das Kind jede eigene Figur antippen und deren Legalzüge sehen
// (`figurenAusFen`/`iconFuer`, wiederverwendet aus quest6/SchachAufgabe.tsx) — anders als bei
// Stufe 1/2, wo weiterhin nur `aufgabe.pieceAt` ziehen darf. Tippt das Kind ein Zielfeld an,
// das NICHT genau `aufgabe.pieceAt` -> `aufgabe.zielTargets[0]` ist, wird NICHTS am Brett
// verändert (kein `game.move()`) — Board.tsx animiert die Figur zwar kurz zum angetippten
// Feld, "snapt" sie danach aber automatisch zurück, weil sich `pieceAt` nicht ändert. Grund
// (Christians eigener Einwand): ein wirklich ausgeführter falscher Zug könnte z. B. den
// eigenen König verschieben und die Taktik kaputt machen, obwohl die feste Zielfeld-Prüfung
// den späteren richtigen Zug trotzdem als gelöst werten würde. Jeder abgewiesene Fehlversuch
// schaltet automatisch die nächste Hinweisstufe frei (`stufe3HinweisStufe` unten): 1 = welche
// Figur, 2 = grober Bereich, 3 = volle Empfehlung (Figur automatisch ausgewählt + Zielfeld als
// Sammel-Marker + `aufgabe.stufe3Erklaerung`).

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chess } from "chess.js";
import { Board, type BoardConfig } from "../quest1/Board";
import { legalTargetsFor, toAlgebraic, tryMove, type BoardSquare } from "./chessEngine";
import { figurenAusFen, iconFuer } from "../quest6/SchachAufgabe";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { SternIcon } from "./sternenleiter";
import { t } from "./sprache";
import { useHinweiseAktiv } from "./luxHinweis";
import type { EndlosmodusAufgabe } from "./endlosmodusAufgaben";

/** Dauer der Erfolgs-Überlagerung, bevor onSolved() feuert — kurz genug, um nicht zu
 *  bremsen, lang genug, damit Funkeln/Wippen (siehe QuestGeschafft) tatsächlich gesehen
 *  werden. Kein Warten auf eine Sprechzeile nötig (siehe Kommentar oben), deshalb ein
 *  fester Wert statt der Lux-Timing-Logik aus QuestMoveScreen.tsx. */
const ERFOLG_ANZEIGE_MS = 900;

const gleich = (a?: BoardSquare, b?: BoardSquare) => Boolean(a && b && a.row === b.row && a.col === b.col);

/** Generischer, stufenabhängiger Hinweistext für die Erobern-Eskalationsaufgaben (siehe
 *  Datei-Kopfkommentar) — Stufe 1 hat keinen Köder, Stufe 2 schon. NUR für Stufe 1/2 (siehe
 *  hinweisTextFuerStufe3 unten für Stufe 3, komplett anderes Interaktionsmodell). */
function hinweisTextFuerStufe(stufe: 1 | 2): string {
  if (stufe === 1) {
    return t(
      "Eine gegnerische Figur steht ungedeckt da. Finde sie und schlage sie mit deiner Figur!",
      "One of the opponent's pieces is undefended. Find it and capture it with your piece!"
    );
  }
  return t(
    "Vorsicht: eine Figur sieht verlockend aus, ist aber verteidigt. Welche ANDERE Figur kannst du OHNE eigenen Verlust schlagen?",
    "Careful: one piece looks tempting but is defended. Which OTHER piece can you capture WITHOUT losing anything yourself?"
  );
}

// Schwellenwerte fuer die drei Hinweisstufen (siehe Datei-Kopfkommentar) — Vorschlag, kein
// feststehender Wert, ggf. nach echtem Gerätetest nachjustieren (siehe claude/
// stufe3_interaktionsmodell_konzept_2026-09-17.md).
function stufe3HinweisStufe(fehlversuche: number): 1 | 2 | 3 {
  if (fehlversuche >= 6) return 3;
  if (fehlversuche >= 3) return 2;
  return 1;
}

type FigurTyp = "p" | "n" | "b" | "r" | "q" | "k";
const FIGUR_NAME_DE: Record<FigurTyp, string> = {
  p: "Bauer",
  n: "Springer",
  b: "Läufer",
  r: "Turm",
  q: "Dame",
  k: "König",
};
const FIGUR_NAME_EN: Record<FigurTyp, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

/** Grober Brett-Viertel als Text — bewusst UNGENAU (Hinweisstufe 2 soll einen Bereich
 *  andeuten, nicht das Feld verraten, siehe Datei-Kopfkommentar). */
function grobesBrettfeld(feld: BoardSquare): string {
  const oben = feld.row < 4;
  const links = feld.col < 4;
  if (oben && links) return t("oben links auf dem Brett", "the upper left of the board");
  if (oben && !links) return t("oben rechts auf dem Brett", "the upper right of the board");
  if (!oben && links) return t("unten links auf dem Brett", "the lower left of the board");
  return t("unten rechts auf dem Brett", "the lower right of the board");
}

/** Dreistufiger Hinweistext für Stufe 3 (siehe Datei-Kopfkommentar). `figurName` ist bereits
 *  die passende Sprachvariante (siehe FIGUR_NAME_DE/EN), `ziel` das eine korrekte Zielfeld. */
function hinweisTextFuerStufe3(
  tier: 1 | 2 | 3,
  aufgabe: EndlosmodusAufgabe,
  figurName: string,
  ziel?: BoardSquare
): string {
  if (tier === 1) {
    return t(
      `Finde die richtige Figur: den/die/das ${figurName}. Tippe sie an, dann siehst du, wohin sie ziehen darf.`,
      `Find the right piece: the ${figurName}. Tap it to see where it can go.`
    );
  }
  if (tier === 2) {
    return t(
      `Die richtige Figur zieht ${ziel ? grobesBrettfeld(ziel) : "irgendwohin"}.`,
      `The right piece moves to ${ziel ? grobesBrettfeld(ziel) : "somewhere on the board"}.`
    );
  }
  const zielName = ziel ? toAlgebraic(ziel) : "?";
  if (aufgabe.stufe3Erklaerung) {
    return t(
      `Ziehe den/die/das ${figurName} nach ${zielName}: ${aufgabe.stufe3Erklaerung} Versuch's jetzt selbst!`,
      `Move the ${figurName} to ${zielName}: ${aufgabe.stufe3Erklaerung} Now try it yourself!`
    );
  }
  return t(
    `Ziehe den/die/das ${figurName} nach ${zielName}. Versuch's jetzt selbst!`,
    `Move the ${figurName} to ${zielName}. Now try it yourself!`
  );
}

export function EndlosmodusPuzzle({
  aufgabe,
  onSolved,
}: {
  aufgabe: EndlosmodusAufgabe;
  onSolved: () => void;
}) {
  const hinweiseAktiv = useHinweiseAktiv();
  const istStufe3 = aufgabe.stufe === 3;
  // Bumpt bei "Nochmal versuchen" — siehe Datei-Kopfkommentar Punkt 1. Als Dependency neben
  // aufgabe.fen unten, damit ein Reset dieselbe Ausgangsstellung ohne Navigationswechsel neu
  // lädt (game selbst muss dafür neu erzeugt werden, chess.js-Objekte sind mutierbar).
  const [resetSchluessel, setResetSchluessel] = useState(0);
  const [hinweisSichtbar, setHinweisSichtbar] = useState(false);

  // Volle Validierung (siehe Datei-Kopfkommentar) — bewusst NICHT createPosition().
  const game = useMemo(() => new Chess(aufgabe.fen), [aufgabe.fen, resetSchluessel]);
  // Stufe 1/2 (unverändertes Ein-Figur-Modell): `ort` ist die einzige ziehbare Figur.
  const [ort, setOrt] = useState<BoardSquare>(aufgabe.pieceAt);
  const [legalTargets, setLegalTargets] = useState<BoardSquare[]>(() => legalTargetsFor(game, aufgabe.pieceAt));
  // Stufe 3 (neues Mehrfachauswahl-Modell, siehe Datei-Kopfkommentar): `ausgewaehlt` ist die
  // GERADE angetippte eigene Figur (Start: die Lösungsfigur), `fehlversuche` zählt jeden
  // abgewiesenen Zug auf ein falsches Ziel (egal welche Figur).
  const [ausgewaehlt, setAusgewaehlt] = useState<BoardSquare>(aufgabe.pieceAt);
  const [fehlversuche, setFehlversuche] = useState(0);
  const [geloest, setGeloest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nur für Stufe 3 gebraucht (siehe Datei-Kopfkommentar) — für Stufe 1/2 bleibt dies ein
  // leeres Array, kostet also praktisch nichts.
  const figuren = useMemo(() => (istStufe3 ? figurenAusFen(aufgabe.fen) : []), [aufgabe.fen, resetSchluessel, istStufe3]);

  useEffect(() => {
    setOrt(aufgabe.pieceAt);
    setLegalTargets(legalTargetsFor(game, aufgabe.pieceAt));
    setAusgewaehlt(aufgabe.pieceAt);
    setFehlversuche(0);
    setGeloest(false);
    setHinweisSichtbar(false);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgabe.fen, resetSchluessel]);

  const ausgewaehlteFigur = figuren.find((f) => gleich(f.at, ausgewaehlt));
  const zielFeld = aufgabe.zielTargets?.[0];
  const aktuelleHinweisstufe = stufe3HinweisStufe(fehlversuche);
  // Volle Empfehlung (Hinweisstufe 3): die Lösungsfigur ist automatisch ausgewählt (siehe
  // Hinweis-Knopf unten) und ihr korrektes Zielfeld trägt die goldene Sammel-Markierung
  // (dieselbe, die z. B. SchachAufgabe.tsx für `hinweisZug` nutzt).
  const zeigeVolleEmpfehlung = istStufe3 && hinweisSichtbar && aktuelleHinweisstufe === 3;

  const config: BoardConfig = istStufe3
    ? {
        rows: 8,
        cols: 8,
        pieceAt: ausgewaehlt,
        legalTargets: geloest ? [] : legalTargetsFor(game, ausgewaehlt),
        pieceIcon: ausgewaehlteFigur ? iconFuer(ausgewaehlteFigur.typ, ausgewaehlteFigur.farbe) : aufgabe.pieceIcon,
        zusatzfiguren: figuren
          .filter((f) => !gleich(f.at, ausgewaehlt))
          .map((f) => ({ at: f.at, icon: iconFuer(f.typ, f.farbe) })),
        kettenlinie: aufgabe.kettenlinie,
        bedrohtAt: aufgabe.bedrohtAt,
        angreiferAt: aufgabe.angreiferAt,
        sammelAt: zeigeVolleEmpfehlung ? zielFeld : undefined,
      }
    : {
        rows: 8,
        cols: 8,
        pieceAt: ort,
        legalTargets,
        pieceIcon: aufgabe.pieceIcon,
        opponentAt: aufgabe.opponentAt,
        opponentIcon: aufgabe.opponentAt ? aufgabe.opponentIcon : undefined,
        zusatzfiguren: aufgabe.zusatzfiguren,
        kettenlinie: aufgabe.kettenlinie,
        bedrohtAt: aufgabe.bedrohtAt,
        angreiferAt: aufgabe.angreiferAt,
      };

  function handleCorrectMove(target: BoardSquare) {
    if (geloest) return;
    if (istStufe3) {
      const istLoesung = gleich(ausgewaehlt, aufgabe.pieceAt) && (!aufgabe.zielTargets || gleich(zielFeld, target));
      if (!istLoesung) {
        // Bewusst KEIN tryMove()/game.move() hier (siehe Datei-Kopfkommentar): Board.tsx
        // animiert die Figur kurz zum angetippten Feld, "snapt" sie danach aber automatisch
        // zurück, weil sich `pieceAt` (=ausgewaehlt) nicht ändert — am Brett/an game.fen()
        // ändert sich dadurch nichts, nur der Fehlversuchszähler steigt.
        setFehlversuche((v) => v + 1);
        return;
      }
      const ergebnis = tryMove(game, ausgewaehlt, target);
      if (!ergebnis.ok) return; // sollte dank legalTargets nicht vorkommen, sicherheitshalber geprüft
      setGeloest(true);
      timerRef.current = setTimeout(onSolved, ERFOLG_ANZEIGE_MS);
      return;
    }
    const ergebnis = tryMove(game, ort, target);
    if (!ergebnis.ok) return; // sollte dank legalTargets nicht vorkommen, sicherheitshalber geprüft
    // Bugfix (Gerätetest 2026-09-16, siehe EndlosmodusAufgabe.zielTargets-Kommentar): ist ein
    // Zielfeld-Set benannt, zählt nur ein Zug DORTHIN als gelöst. Jeder andere angebotene
    // Legalzug bewegt die Figur trotzdem wirklich (nichts wird versteckt/verboten) — die
    // Übung geht von der neuen Position aus einfach weiter, ohne Wertung oder Bestrafung.
    const istZiel =
      !aufgabe.zielTargets || aufgabe.zielTargets.some((z) => z.row === target.row && z.col === target.col);
    if (!istZiel) {
      setOrt(target);
      setLegalTargets(legalTargetsFor(game, target));
      return;
    }
    setGeloest(true);
    timerRef.current = setTimeout(onSolved, ERFOLG_ANZEIGE_MS);
  }

  /** Stufe 3 (siehe Datei-Kopfkommentar): Tippen auf eine ANDERE eigene Figur wählt sie aus,
   *  ohne irgendetwas am Brett zu verändern — reine Anzeige ihrer Legalzüge. */
  function handleFeldTap(feld: BoardSquare) {
    if (!istStufe3 || geloest) return;
    const figur = figuren.find((f) => gleich(f.at, feld));
    if (figur && figur.farbe === "w") setAusgewaehlt(feld);
  }

  function nochmalVersuchen() {
    if (geloest) return;
    setResetSchluessel((k) => k + 1);
  }

  const loesungsFigur = figuren.find((f) => gleich(f.at, aufgabe.pieceAt));
  const figurName = loesungsFigur
    ? t(FIGUR_NAME_DE[loesungsFigur.typ], FIGUR_NAME_EN[loesungsFigur.typ])
    : t("Figur", "piece");

  return (
    <View style={styles.wurzel}>
      <Board config={config} onCorrectMove={handleCorrectMove} onFeldTap={handleFeldTap} disabled={geloest} />
      {!geloest && (
        <View style={styles.aktionsReihe}>
          <Pressable
            onPress={nochmalVersuchen}
            style={styles.aktionsKnopf}
            accessibilityLabel={t("Nochmal versuchen", "Try again")}
          >
            <Text style={styles.aktionsText}>{t("↺ Nochmal", "↺ Retry")}</Text>
          </Pressable>
          {hinweiseAktiv && aufgabe.stufe !== undefined && (
            <Pressable
              onPress={() => {
                const naechsteSichtbarkeit = !hinweisSichtbar;
                setHinweisSichtbar(naechsteSichtbarkeit);
                // Hinweisstufe 3 (volle Empfehlung, siehe Datei-Kopfkommentar): die
                // Lösungsfigur wird beim Öffnen automatisch ausgewählt, damit ihr Zielfeld
                // als Sammel-Marker sichtbar wird.
                if (naechsteSichtbarkeit && istStufe3 && stufe3HinweisStufe(fehlversuche) === 3) {
                  setAusgewaehlt(aufgabe.pieceAt);
                }
              }}
              style={styles.aktionsKnopf}
              accessibilityLabel={t("Hinweis von Lux", "Hint from Lux")}
            >
              <Text style={styles.aktionsText}>
                {hinweisSichtbar ? t("Hinweis verbergen", "Hide hint") : t("💡 Hinweis", "💡 Hint")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {hinweisSichtbar && aufgabe.stufe !== undefined && !geloest && (
        <View style={styles.hinweisBlase}>
          <Text style={styles.hinweisText}>
            {aufgabe.stufe === 3
              ? hinweisTextFuerStufe3(aktuelleHinweisstufe, aufgabe, figurName, zielFeld)
              : hinweisTextFuerStufe(aufgabe.stufe)}
          </Text>
        </View>
      )}
      {geloest && (
        <View style={styles.ueberlagerung} pointerEvents="none">
          <QuestGeschafft>
            <SternIcon size={72} />
          </QuestGeschafft>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wurzel: { alignItems: "center", justifyContent: "center" },
  ueberlagerung: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  aktionsReihe: { flexDirection: "row", gap: 12, marginTop: 16 },
  aktionsKnopf: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(247,241,228,0.9)",
  },
  aktionsText: { fontSize: 14, fontWeight: "700", color: "#4A4038" },
  hinweisBlase: {
    marginTop: 10,
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  hinweisText: { fontSize: 14, color: "#4A4038", textAlign: "center" },
});
