// Paket 3 (2026-09-11): aus screens/FreispielPartie.tsx ausgelagert, damit
// verify/test-ganze-partie-logic.cjs die Klassifikation ohne React Native prüfen kann.
//
// Paket 3 (2026-09-11, F1a, bonuskapitel_ganze_partie_umsetzung_2026-09-10.md Abschnitt 7a):
// Remis nach Ursache benennen — vor allem Patt, das Anfänger sonst als "gewonnen, aber
// irgendwie nicht" erleben.
import type { Chess } from "chess.js";

export type RemisUrsache = "patt" | "material" | "wiederholung" | "sonst";

export function remisUrsacheVon(spiel: Chess): RemisUrsache {
  if (spiel.isStalemate()) return "patt";
  if (spiel.isInsufficientMaterial()) return "material";
  if (spiel.isThreefoldRepetition() || spiel.isDrawByFiftyMoves()) return "wiederholung";
  return "sonst";
}

export const REMIS_ZEILEN: Record<RemisUrsache, string> = {
  patt: "Patt! Der König konnte nicht mehr ziehen, war aber nicht im Schach. Unentschieden – beim nächsten Mal: erst Schach, dann kein Ausweg.",
  material: "Unentschieden – mit so wenigen Figuren kann niemand mehr Matt setzen.",
  wiederholung: "Unentschieden – ihr habt euch lange im Kreis gedreht. Nächstes Mal probieren wir was Neues!",
  sonst: "Unentschieden! Ihr wart beide richtig gut!",
};
