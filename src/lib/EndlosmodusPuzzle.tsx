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

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chess } from "chess.js";
import { Board, type BoardConfig } from "../quest1/Board";
import { legalTargetsFor, tryMove, type BoardSquare } from "./chessEngine";
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

/** Generischer, stufenabhängiger Hinweistext für die Erobern-Eskalationsaufgaben (siehe
 *  Datei-Kopfkommentar) — Stufe 1 hat keinen Köder, Stufe 2/3 schon. */
function hinweisTextFuerStufe(stufe: 1 | 2 | 3): string {
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

export function EndlosmodusPuzzle({
  aufgabe,
  onSolved,
}: {
  aufgabe: EndlosmodusAufgabe;
  onSolved: () => void;
}) {
  const hinweiseAktiv = useHinweiseAktiv();
  // Bumpt bei "Nochmal versuchen" — siehe Datei-Kopfkommentar Punkt 1. Als Dependency neben
  // aufgabe.fen unten, damit ein Reset dieselbe Ausgangsstellung ohne Navigationswechsel neu
  // lädt (game selbst muss dafür neu erzeugt werden, chess.js-Objekte sind mutierbar).
  const [resetSchluessel, setResetSchluessel] = useState(0);
  const [hinweisSichtbar, setHinweisSichtbar] = useState(false);

  // Volle Validierung (siehe Datei-Kopfkommentar) — bewusst NICHT createPosition().
  const game = useMemo(() => new Chess(aufgabe.fen), [aufgabe.fen, resetSchluessel]);
  const [ort, setOrt] = useState<BoardSquare>(aufgabe.pieceAt);
  const [legalTargets, setLegalTargets] = useState<BoardSquare[]>(() => legalTargetsFor(game, aufgabe.pieceAt));
  const [geloest, setGeloest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOrt(aufgabe.pieceAt);
    setLegalTargets(legalTargetsFor(game, aufgabe.pieceAt));
    setGeloest(false);
    setHinweisSichtbar(false);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgabe.fen, resetSchluessel]);

  const config: BoardConfig = {
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

  function nochmalVersuchen() {
    if (geloest) return;
    setResetSchluessel((k) => k + 1);
  }

  return (
    <View style={styles.wurzel}>
      <Board config={config} onCorrectMove={handleCorrectMove} disabled={geloest} />
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
              onPress={() => setHinweisSichtbar((v) => !v)}
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
          <Text style={styles.hinweisText}>{hinweisTextFuerStufe(aufgabe.stufe)}</Text>
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
