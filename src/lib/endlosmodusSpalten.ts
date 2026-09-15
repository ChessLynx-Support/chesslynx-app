// Update-1-Vorzug (2026-09-15, Christian: "Endlosmodus-Verdrahtung (27 fertige Stellungen)
// ... prüfen und ggf. aktualisieren"). Reine Metadaten-Ebene: welche "Fokus-Spalten"
// (siehe chessEngine.ts, Kommentar über EICHHOERNCHEN_FIGUR_GEWINNEN_POSITIONS) es gibt,
// zu welchem Gefährten sie gehören, und ob sie bereits als Screen spielbar sind.
//
// Bewusst von den eigentlichen Brett-Konfigurationen (endlosmodusAufgaben.tsx, mit Icons/
// JSX) getrennt: dieses Modul bleibt reines TypeScript ohne React-Import, damit sowohl die
// UI-Schicht als auch endlosmodusFortschritt.ts (reine Speicherlogik, ebenfalls ohne
// React) es ohne Umweg importieren können.
//
// Namens-Hinweis: `chessEngine.ts` nennt die Rabenfels-Spalte noch `FUCHSBAU_SCHACH_
// POSITIONEN` — Restbezeichnung aus der Zeit vor dem Fuchs->Rabe-Tausch (siehe
// claude/rabe_ersetzt_fuchs_2026-09-14.md). Die Zugstellungen selbst sind vom Charakter
// unabhängig und bleiben gültig; nur der Konstantenname ist inzwischen unpassend. Hier
// bewusst schon unter dem richtigen Namen (`rabenfels_schach`) geführt, ohne chessEngine.ts
// selbst anzufassen — eine reine Umbenennung dort ist risikolos, aber unabhängig von dieser
// Aufgabe und deshalb nicht mit hineingemischt.

import type { GefaehrteId } from "./gefaehrtenZustaende";

export type EndlosmodusSpalteId =
  | "eichhoernchen_figurGewinnen"
  | "eichhoernchen_figurenwert"
  | "rabenfels_schach"
  | "dachshoehle_figurGewinnen"
  | "dachshoehle_schach"
  | "dachshoehle_rochade"
  | "adlerhorst_fesselung"
  | "wolfsfeste_fesselung"
  | "wolfsfeste_mattIn2";

export type EndlosmodusSpalteMeta = {
  id: EndlosmodusSpalteId;
  gefaehrteId: GefaehrteId;
  titel: string;
  /**
   * "bereit": alle drei Stellungen sind über endlosmodusAufgaben.tsx als spielbarer
   * EndlosmodusSpalte-Screen erreichbar (jede Aufgabe = ein einzelner, per chess.js
   * geprüfter Zug — "Figur gewinnen", "Schach lösen", "Rochade" und "Fesselung" sind alle
   * strukturell genau das: eine Figur bewegt sich einmal, chess.js erlaubt dabei ohnehin
   * nur Züge, die die Aufgabe tatsächlich lösen).
   * "folgt": Die drei FEN-Stellungen existieren fertig und verifiziert in chessEngine.ts,
   * brauchen aber eine ANDERE Interaktionsart als "einen Zug ziehen" — Figurenwert ist ein
   * Tippvergleich zwischen zwei Figuren (kein Zug), Matt in 2 ist eine echte Zwei-Zug-Folge
   * (Zug, Gegenantwort, zweiter Zug). Beide Mechaniken existieren bereits als fertige,
   * eigenständige Bonuskapitel-Komponenten (Figurenwert.tsx, MattIn2.tsx) — das Nachziehen
   * für den Endlosmodus ist ein klar umrissener, aber eigener nächster Schritt.
   */
  status: "bereit" | "folgt";
};

export const ENDLOSMODUS_SPALTEN: EndlosmodusSpalteMeta[] = [
  { id: "eichhoernchen_figurGewinnen", gefaehrteId: "eichhoernchen", titel: "Figur gewinnen", status: "bereit" },
  { id: "eichhoernchen_figurenwert", gefaehrteId: "eichhoernchen", titel: "Figurenwert", status: "folgt" },
  { id: "rabenfels_schach", gefaehrteId: "rabe", titel: "Schach lösen", status: "bereit" },
  { id: "dachshoehle_figurGewinnen", gefaehrteId: "dachs", titel: "Figur gewinnen", status: "bereit" },
  { id: "dachshoehle_schach", gefaehrteId: "dachs", titel: "Schach lösen", status: "bereit" },
  { id: "dachshoehle_rochade", gefaehrteId: "dachs", titel: "Rochade", status: "bereit" },
  { id: "adlerhorst_fesselung", gefaehrteId: "adlerin", titel: "Fesselung", status: "bereit" },
  { id: "wolfsfeste_fesselung", gefaehrteId: "wolf", titel: "Fesselung", status: "bereit" },
  { id: "wolfsfeste_mattIn2", gefaehrteId: "wolf", titel: "Matt in 2", status: "folgt" },
];

export function spaltenFuerGefaehrte(gefaehrteId: GefaehrteId): EndlosmodusSpalteMeta[] {
  return ENDLOSMODUS_SPALTEN.filter((s) => s.gefaehrteId === gefaehrteId);
}

export function spalteById(id: EndlosmodusSpalteId): EndlosmodusSpalteMeta {
  const treffer = ENDLOSMODUS_SPALTEN.find((s) => s.id === id);
  if (!treffer) throw new Error(`Unbekannte Endlosmodus-Spalte: ${id}`);
  return treffer;
}
