// Erstlehre-Zuordnung je Gefährten-Revier (Nachtrag 2026-09-17, Bonuskapitel→
// Gefährtensaga-Neuordnung, siehe claude/schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md
// und claude/erobern_screen_reviere_ruhmeshalle_befund_2026-09-17.md).
//
// Ersetzt die weggefallene Rolle von `BONUSKAPITEL_ROUTEN` (früher in lib/gate.ts, dort
// pro GATE gedacht) — hier stattdessen pro REVIER: welches der vier bereits bestehenden,
// verifizierten Bonuskapitel-Screens (Fesselung/Rochade/Figurenwert/MattIn2) läuft als
// "Erstlehre" beim jeweiligen Gefährten, bevor/neben den normalen Endlosmodus-
// Übungsspalten (siehe endlosmodusSpalten.ts, komplett unabhängig davon).
//
// Zuordnung ursprünglich nach der in schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md
// entschiedenen Tabelle (Fesselung damals bei Adlerhorst). Wisent bekommt weiterhin
// bewusst KEINEN Eintrag: er hat keinen Revier-Screen dieser Art (siehe
// screens/Revier.tsx-Kopfkommentar).
//
// Bewusst KEIN `BonusKapitelId`-Import aus storage.ts (dort nicht exportiert) — die vier
// hier vorkommenden Literale sind ohnehin eine Teilmenge davon und damit strukturell
// kompatibel zu `loadBonusFortschrittLocal`/`saveBonusFortschrittLocal`.
//
// Nachtrag 2026-09-19 (Christian, nach Auswertung der Lehrbuch-Quellen zur Taktik-
// Reihenfolge, siehe claude/lernweg_taktik_umstrukturierung_2026-09-19.md, Abschnitt 3):
// Die Fesselung-Erstlehre hing bisher am Adlerhorst (Gefährte #4) — die zugehörige
// Endlosmodus-Übung "Fesselung setzen" beginnt aber bereits bei Rabe (Gefährte #2), zwei
// Gefährten früher. Ein Kind, das die Gefährten der Reihe nach spielt, übte die Fesselung
// also, bevor ihm überhaupt erklärt wurde, was eine Fesselung ist — vermutlich Ursache für
// den Testbericht-Befund "Motiv der Fesselung nie wirklich erklärt"
// (claude/testbefunde_2026-09-19_ausgewertet.md, Abschnitt 2.3). Fesselung-Erstlehre
// deshalb jetzt bei Rabe verdrahtet. Adlerhorst bekommt bewusst KEINEN Ersatz-Eintrag:
// "Fesselung erkennen" ist dort ab jetzt reine Wiederholung/Vertiefung (die Fesselung ist
// zu dem Zeitpunkt schon aus Rabe bekannt), kein Neulernen mehr — passt inhaltlich sogar
// besser als vorher. Ein eigenes Spieß-Erstlehre-Kapitel für Adlerhorst (Spieß hat aktuell
// noch gar keine volle Erstlehre, nur einen gesprochenen Einführungssatz beim Öffnen der
// Endlosmodus-Spalte) ist als separates Konzept vorgemerkt, siehe genanntes Dokument,
// Abschnitt 4/7 — hier bewusst noch nicht mit umgesetzt, das ist eine eigene, größere
// Produktion (neuer 7-Screen-Bonuskapitel-Screen nach dem Vorbild von bonus/Fesselung.tsx),
// kein Ein-Zeiler wie diese Verschiebung.

import type { GefaehrteId } from "./gefaehrtenZustaende";

export type RevierErstlehreKapitelId = "figurenwert" | "rochade" | "fesselung" | "mattIn2";

export type RevierErstlehre = {
  kapitelId: RevierErstlehreKapitelId;
  // Routenname in RootNavigator.tsx — identisch zur Bonuskapitel-Komponente selbst.
  route: "Figurenwert" | "Rochade" | "Fesselung" | "MattIn2";
  // Anzeigename für die Erstlehre-Kachel in Revier.tsx (kein neuer Sprechtext, nur ein
  // kurzes Kachel-Label wie bei den Endlosmodus-Spalten-Titeln).
  titel: string;
};

/**
 * Erstlehre-KETTE je Revier (Umbau 2026-09-19, Christian).
 *
 * Bis zum 19.09.2026 stand hier `Partial<Record<GefaehrteId, RevierErstlehre>>` — genau EIN
 * Kapitel je Revier. Die beschlossene neue Lernreihenfolge ("Variante A", siehe
 * claude/entscheidungen_lernkurve_lichess_2026-09-19.md) braucht aber Reviere mit mehreren
 * Kapiteln hintereinander (Eichhörnchen bekommt Figurenwert UND das neue "Der Beschützer").
 * Deshalb jetzt ein Array je Revier, in fester didaktischer Reihenfolge.
 *
 * Anzeigeregel in Revier.tsx: Es wird immer nur EINE Kachel gezeigt — das erste noch nicht
 * abgeschlossene Kapitel der Kette (siehe `naechsteOffeneErstlehre`). Bewusst nicht alle
 * offenen Kapitel gleichzeitig: Die Kette hat eine feste Reihenfolge, und drei goldene
 * Kacheln nebeneinander wären für ein fünfjähriges Kind eine Auswahl, die es gar nicht
 * treffen soll.
 *
 * ── ZIELZUSTAND "Variante A", noch NICHT gesetzt ──────────────────────────────────────────
 * Die Zuordnung unten ist bewusst noch die alte. Grund: Variante A lautet
 *   Figurenwert → Deckung → Verteidigen → Rochade → Gabel → Fesselung → Spieß → Matt in 2,
 * und die beiden Deckungs-Kapitel ("Der Beschützer", "In Sicherheit bringen") existieren noch
 * nicht. Jede Zwischenstufe hätte einen Haken: Zieht man die Fesselung-Erstlehre jetzt schon
 * zurück zu Adlerin, steht Rabe ganz ohne Kapitel da; lässt man sie bei Rabe, kommt die
 * Rochade weiterhin NACH der Fesselung — genau der Punkt, der geändert werden soll. Die
 * Neuzuordnung passiert deshalb in einem Zug mit den neuen Kapiteln:
 *
 *   eichhoernchen: [figurenwert, beschuetzer]
 *   rabe:          [inSicherheit]
 *   dachs:         [rochade]
 *   adlerin:       [gabel, fesselung]      ← Fesselung kehrt hierher zurück
 *   wolf:          [spiess, mattIn2]
 *
 * Dazu wandern dann auch die zugehörigen Endlosmodus-Spalten mit (endlosmodusSpalten.ts):
 * `eichhoernchen_gabel` → adlerin, `rabenfels_fesselungSetzen` → adlerin,
 * `adlerhorst_spiess` → wolf. Wichtig dabei: nur `gefaehrteId` ändern, NICHT die Spalten-IDs
 * — an den IDs hängt der gespeicherte Fortschritt (endlosmodusFortschritt.ts) und sie sind
 * zugleich Schlüssel in ENDLOSMODUS_AUFGABEN und ESKALATIONS_SPALTEN.
 * ──────────────────────────────────────────────────────────────────────────────────────────
 */
export const REVIER_ERSTLEHRE: Partial<Record<GefaehrteId, readonly RevierErstlehre[]>> = {
  eichhoernchen: [{ kapitelId: "figurenwert", route: "Figurenwert", titel: "Figurenwert" }],
  // Nachtrag 2026-09-19: von adlerin hierher verschoben, siehe Datei-Kopfkommentar.
  // Kehrt mit Variante A nach adlerin zurück (siehe Zielzustand oben).
  rabe: [{ kapitelId: "fesselung", route: "Fesselung", titel: "Fesselung" }],
  dachs: [{ kapitelId: "rochade", route: "Rochade", titel: "Rochade" }],
  wolf: [{ kapitelId: "mattIn2", route: "MattIn2", titel: "Matt in 2" }],
  // adlerin/wisent bewusst ohne Eintrag, siehe Datei-Kopfkommentar (Nachtrag 2026-09-19).
};

/** Die vollständige Kapitel-Kette eines Reviers, leer wenn das Revier keine Erstlehre hat. */
export function erstlehreFuerRevier(gefaehrteId: GefaehrteId): readonly RevierErstlehre[] {
  return REVIER_ERSTLEHRE[gefaehrteId] ?? [];
}

/**
 * Das erste Kapitel der Kette, das laut Fortschritt noch offen ist — genau das bekommt die
 * goldene Kachel. Gibt `null` zurück, wenn die Kette leer oder komplett abgeschlossen ist.
 *
 * `erledigt` ist eine Zuordnung kapitelId → true/false, wie sie Revier.tsx aus mehreren
 * `loadBonusFortschrittLocal`-Aufrufen zusammensetzt. Ein fehlender Eintrag zählt als NICHT
 * erledigt — im Zweifel lieber das Kapitel anbieten als es verschwinden lassen.
 */
export function naechsteOffeneErstlehre(
  gefaehrteId: GefaehrteId,
  erledigt: Partial<Record<RevierErstlehreKapitelId, boolean>>
): RevierErstlehre | null {
  for (const kapitel of erstlehreFuerRevier(gefaehrteId)) {
    if (!erledigt[kapitel.kapitelId]) return kapitel;
  }
  return null;
}
