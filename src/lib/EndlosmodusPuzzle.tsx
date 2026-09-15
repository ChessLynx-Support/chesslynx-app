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

import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Chess } from "chess.js";
import { Board, type BoardConfig } from "../quest1/Board";
import { legalTargetsFor, tryMove, type BoardSquare } from "./chessEngine";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { SternIcon } from "./sternenleiter";
import type { EndlosmodusAufgabe } from "./endlosmodusAufgaben";

/** Dauer der Erfolgs-Überlagerung, bevor onSolved() feuert — kurz genug, um nicht zu
 *  bremsen, lang genug, damit Funkeln/Wippen (siehe QuestGeschafft) tatsächlich gesehen
 *  werden. Kein Warten auf eine Sprechzeile nötig (siehe Kommentar oben), deshalb ein
 *  fester Wert statt der Lux-Timing-Logik aus QuestMoveScreen.tsx. */
const ERFOLG_ANZEIGE_MS = 900;

export function EndlosmodusPuzzle({
  aufgabe,
  onSolved,
}: {
  aufgabe: EndlosmodusAufgabe;
  onSolved: () => void;
}) {
  // Volle Validierung (siehe Datei-Kopfkommentar) — bewusst NICHT createPosition().
  const game = useMemo(() => new Chess(aufgabe.fen), [aufgabe.fen]);
  const [legalTargets, setLegalTargets] = useState<BoardSquare[]>(() => legalTargetsFor(game, aufgabe.pieceAt));
  const [geloest, setGeloest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLegalTargets(legalTargetsFor(game, aufgabe.pieceAt));
    setGeloest(false);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgabe.fen]);

  const config: BoardConfig = {
    rows: 8,
    cols: 8,
    pieceAt: aufgabe.pieceAt,
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
    const ergebnis = tryMove(game, aufgabe.pieceAt, target);
    if (!ergebnis.ok) return; // sollte dank legalTargets nicht vorkommen, sicherheitshalber geprüft
    setGeloest(true);
    timerRef.current = setTimeout(onSolved, ERFOLG_ANZEIGE_MS);
  }

  return (
    <View style={styles.wurzel}>
      <Board config={config} onCorrectMove={handleCorrectMove} disabled={geloest} />
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
});
