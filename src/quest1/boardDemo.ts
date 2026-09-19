// Reine Hilfslogik für die Vorführ-Animation des Bretts (siehe quest1/Board.tsx).
//
// Bewusst als eigenes Modul OHNE React-Native-Import — genau wie endlosmodusStufen.ts und
// aus demselben Grund (siehe dortiger Kopfkommentar): Ein reines TS-Modul lässt sich per
// `ts.transpileModule` + `Module._compile` in verify/*.cjs laden und richtig testen, eine
// RN-Komponente nicht. Board.tsx selbst bleibt damit ungetestet, aber die Entscheidungen,
// bei denen man sich vertun kann, liegen hier und sind geprüft.
//
// Hintergrund (2026-09-19, animierte Motiv-Einführungen, siehe claude/
// ChessLynx_Motiv_Einfuehrungen_2026-09-19.docx, Teil 2): Die Vorführung glitt bisher immer
// mit der EIGENEN Figur zum Zielfeld und wieder zurück. Für eine erzählte Zugfolge muss jeder
// Schritt stehen bleiben, und auch die Gegnerantwort muss ziehen können.

export type BoardFeld = { row: number; col: number };

/** Feldschlüssel, identisch zur `key()`-Hilfe in Board.tsx. */
export function feldSchluessel(f: BoardFeld): string {
  return `${f.row}-${f.col}`;
}

/**
 * Von welchem Feld aus wird vorgeführt? Ohne `demoVon` ist das die eigene Figur — damit
 * verhalten sich alle bestehenden Aufrufstellen exakt wie vorher.
 */
export function demoUrsprungFuer(demoVon: BoardFeld | undefined, pieceAt: BoardFeld): BoardFeld {
  return demoVon ?? pieceAt;
}

/**
 * Welches Icon gehört auf das bewegliche Overlay?
 *
 * Bisher war das immer `pieceIcon`, weil sich immer nur die eigene Figur bewegte. Sobald auch
 * die Gegnerantwort animiert wird, muss es das Icon der Figur sein, die tatsächlich auf dem
 * Ausgangsfeld steht — sonst gleitet die eigene Figur dorthin, wo der gegnerische König
 * hinziehen sollte. Gibt zurück, WELCHE Quelle zu nehmen ist; das Icon selbst holt Board.tsx.
 */
export function demoIconQuelle(
  ursprung: BoardFeld,
  pieceAt: BoardFeld,
  opponentAt: BoardFeld | undefined,
  zusatzfigurFelder: readonly BoardFeld[]
): "eigen" | "gegner" | "zusatz" | "keins" {
  const k = feldSchluessel(ursprung);
  if (k === feldSchluessel(pieceAt)) return "eigen";
  if (opponentAt && k === feldSchluessel(opponentAt)) return "gegner";
  if (zusatzfigurFelder.some((f) => feldSchluessel(f) === k)) return "zusatz";
  return "keins";
}

/**
 * Ist dieses Feld gerade die Quelle einer laufenden Vorführung? Die Figur dort wird dann
 * ausgeblendet, weil sie als frei bewegliches Overlay gezeichnet wird.
 *
 * Wichtig für die Rückwärtskompatibilität: Bei `demoVon === undefined` ist der Ursprung
 * `pieceAt`, und die Bedingung wird damit gleichbedeutend mit dem früheren `!animatingTo`
 * an der eigenen Figur.
 */
export function istDemoQuelleFeld(
  feldKey: string,
  ursprung: BoardFeld,
  laeuftAnimation: boolean
): boolean {
  return laeuftAnimation && feldKey === feldSchluessel(ursprung);
}

/**
 * Schlüssel des Vorführ-Schritts. Enthält bewusst AUCH das Ausgangsfeld: In einer Zugfolge
 * kann dasselbe Zielfeld zweimal hintereinander vorkommen (der König weicht auf ein Feld,
 * und die eigene Figur schlägt danach genau dort). Ohne das Ausgangsfeld im Schlüssel würde
 * der zweite Schritt als "schon gelaufen" gelten und stillschweigend ausfallen.
 */
export function demoSchrittSchluessel(ursprung: BoardFeld, ziel: BoardFeld): string {
  return `${feldSchluessel(ursprung)}->${feldSchluessel(ziel)}`;
}

/** Felder mit Blickfang-Ring. Einzelwert und Array sind zugelassen (wie bei `blockerAt`). */
export function blickfangSchluessel(
  blickfangAt: BoardFeld | readonly BoardFeld[] | undefined
): Set<string> {
  const felder = Array.isArray(blickfangAt)
    ? blickfangAt
    : blickfangAt
      ? [blickfangAt as BoardFeld]
      : [];
  return new Set(felder.map(feldSchluessel));
}
