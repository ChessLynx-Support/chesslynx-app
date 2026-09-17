// Reine Stufen-/Sterne-Logik für den Endlosmodus (siehe endlosmodusFortschritt.ts für die
// AsyncStorage-Speicherschicht darüber) — bewusst OHNE jeden React-Native-Import, damit sie
// unverändert in verify/*.cjs testbar bleibt (dasselbe Prinzip wie chessEngine.ts, "kein
// Jest, kein ts-node", siehe dortiger Kommentar: ein reines TS-Modul lässt sich per
// `ts.transpileModule` + `Module._compile` laden, ein RN-Paket wie AsyncStorage nicht ohne
// Weiteres).
//
// Hintergrund (Christian, 2026-09-16 spät abends: "10x Stufe eins ..., 8x Stufe zwei, 5x
// Stufe drei", siehe claude/taktik_schwierigkeitseskalation_konzept_2026-09-16.md): die
// bisherigen drei Sterne-Stellungen je Spalte werden für "Figur gewinnen" durch 23 einzeln
// lösbare Aufgaben in drei Schwierigkeitsstufen ersetzt (Eichhörnchen-Lichtung, Dachshöhle).
// Alle übrigen Spalten (Schach lösen, Rochade, Fesselung) behalten weiterhin genau drei
// Aufgaben — deshalb sind die Stufengrößen hier PRO SPALTE konfigurierbar statt fest
// verdrahtet, mit [1,1,1] (= "jede der drei Aufgaben zählt für sich, wie bisher") als
// unverändertem Standardwert für alle noch nicht eskalierten Spalten.

import type { EndlosmodusSpalteId } from "./endlosmodusSpalten";

/** [Anzahl Stufe-1-, Stufe-2-, Stufe-3-Aufgaben] einer Spalte, in genau dieser Reihenfolge
 *  innerhalb des Aufgaben-Arrays (siehe endlosmodusAufgaben.tsx: Stufe 1 zuerst, dann 2,
 *  dann 3 — feste Reihenfolge, weil die Stufen selbst eine echte Schwierigkeitssteigerung
 *  sind, anders als die freie Reihenfolge INNERHALB einer Stufe). */
export type StufenGroessen = readonly [number, number, number];

/** Unverändertes Verhalten für die fünf klassischen Drei-Aufgaben-Spalten: jede der drei
 *  Aufgaben zählt für sich als ein eigener Stern. */
export const STANDARD_STUFEN: StufenGroessen = [1, 1, 1];

/** Neue Eskalationsstufen (Christian, 2026-09-16 spät abends): 10 leichte, 8 mittlere,
 *  5 schwere Aufgaben je Spalte — siehe claude/erobern_kuration_2026-09-17.md für die
 *  konkreten, python-chess-verifizierten Stellungen. */
export const EROBERN_ESKALATIONS_STUFEN: StufenGroessen = [10, 8, 5];

/** Welche Spalten die neue Eskalationsstruktur verwenden — aktuell nur die beiden
 *  "Figur gewinnen"-Spalten. Wird beim Übertragen des Rezepts auf die übrigen vier Motive
 *  (Fesselung lösen/setzen, Gabel, Spieß, siehe taktik_schwierigkeitseskalation_konzept_
 *  2026-09-16.md) hier erweitert. */
const ESKALATIONS_SPALTEN: ReadonlySet<EndlosmodusSpalteId> = new Set([
  "eichhoernchen_figurGewinnen",
  "dachshoehle_figurGewinnen",
]);

export function stufenFuerSpalte(spalteId: EndlosmodusSpalteId): StufenGroessen {
  return ESKALATIONS_SPALTEN.has(spalteId) ? EROBERN_ESKALATIONS_STUFEN : STANDARD_STUFEN;
}

export function gesamtAnzahlAufgaben(stufen: StufenGroessen): number {
  return stufen[0] + stufen[1] + stufen[2];
}

/**
 * Wertet einen Fortschritts-Array (ein Wahrheitswert pro Aufgabe, Index 0 = erste Aufgabe
 * der Spalte) gegen die Stufengrößen aus: ein Stern verlangt, dass ALLE Aufgaben innerhalb
 * der jeweiligen Stufe gelöst sind — nicht nur irgendeine Teilmenge in passender Anzahl.
 * Stufe 2 zählt erst als Stern 2, wenn Stufe 1 bereits vollständig ist, usw. Reihenfolge
 * INNERHALB einer Stufe bleibt bewusst frei (siehe endlosmodusFortschritt.ts, "kein
 * Reihenfolge-Zwang") — nur die Stufen selbst sind gestaffelt, nicht jede Einzelaufgabe.
 */
export function sterneAusFortschritt(geloest: boolean[], stufen: StufenGroessen): 0 | 1 | 2 | 3 {
  const alleGeloestZwischen = (von: number, bis: number) => {
    for (let i = von; i < bis; i++) {
      if (!geloest[i]) return false;
    }
    return true;
  };
  const endeStufe1 = stufen[0];
  const endeStufe2 = endeStufe1 + stufen[1];
  const endeStufe3 = endeStufe2 + stufen[2];
  if (!alleGeloestZwischen(0, endeStufe1)) return 0;
  if (!alleGeloestZwischen(endeStufe1, endeStufe2)) return 1;
  if (!alleGeloestZwischen(endeStufe2, endeStufe3)) return 2;
  return 3;
}

/**
 * Index der nächsten noch nicht gelösten Aufgabe (für "dort weitermachen, wenn man
 * aussteigt", Christian 2026-09-16 spät abends) — die erste `false`-Stelle im Fortschritts-
 * Array, oder `gesamt` (= "alle gelöst"), falls keine offen ist. Bewusst die ERSTE offene
 * Aufgabe, nicht "die am weitesten fortgeschrittene Stelle": wer zwischendurch eine frühere
 * Aufgabe erneut probiert (kein Reihenfolge-Zwang beim Lösen selbst) und dabei aussteigt,
 * landet beim nächsten Öffnen wieder an der am wenigsten weit fortgeschrittenen Stelle der
 * eigentlichen Eskalation — passend zu ihrem didaktischen Zweck (der Reihe nach schwerer).
 */
export function naechsteOffeneAufgabe(geloest: boolean[], gesamt: number): number {
  for (let i = 0; i < gesamt; i++) {
    if (!geloest[i]) return i;
  }
  return gesamt;
}

/** Zu welcher Stufe ein Aufgaben-Index gehört (1-basiert) plus seine Position innerhalb
 *  dieser Stufe (ebenfalls 1-basiert) und deren Gesamtgröße — für die Fortschrittsanzeige
 *  "Stufe 1 · Aufgabe 4 von 10" in EndlosmodusSpalte.tsx. */
export function stufeUndPositionFuerIndex(
  index: number,
  stufen: StufenGroessen
): { stufe: 1 | 2 | 3; positionInStufe: number; groesseStufe: number } {
  const endeStufe1 = stufen[0];
  const endeStufe2 = endeStufe1 + stufen[1];
  if (index < endeStufe1) {
    return { stufe: 1, positionInStufe: index + 1, groesseStufe: stufen[0] };
  }
  if (index < endeStufe2) {
    return { stufe: 2, positionInStufe: index - endeStufe1 + 1, groesseStufe: stufen[1] };
  }
  return { stufe: 3, positionInStufe: index - endeStufe2 + 1, groesseStufe: stufen[2] };
}
