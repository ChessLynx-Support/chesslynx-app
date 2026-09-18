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
// Zuordnung exakt nach der in schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md
// entschiedenen Tabelle. Rabenfels und Wisent bekommen bewusst KEINEN Eintrag:
// Rabenfels braucht keine Erstlehre ("Schach lösen" ist aus Quest 6 bekannt), der Wisent
// hat keinen Revier-Screen dieser Art (siehe screens/Revier.tsx-Kopfkommentar).
//
// Bewusst KEIN `BonusKapitelId`-Import aus storage.ts (dort nicht exportiert) — die vier
// hier vorkommenden Literale sind ohnehin eine Teilmenge davon und damit strukturell
// kompatibel zu `loadBonusFortschrittLocal`/`saveBonusFortschrittLocal`.

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

export const REVIER_ERSTLEHRE: Partial<Record<GefaehrteId, RevierErstlehre>> = {
  eichhoernchen: { kapitelId: "figurenwert", route: "Figurenwert", titel: "Figurenwert" },
  dachs: { kapitelId: "rochade", route: "Rochade", titel: "Rochade" },
  adlerin: { kapitelId: "fesselung", route: "Fesselung", titel: "Fesselung" },
  wolf: { kapitelId: "mattIn2", route: "MattIn2", titel: "Matt in 2" },
  // rabe/wisent bewusst ohne Eintrag, siehe Datei-Kopfkommentar.
};

export function erstlehreFuerRevier(gefaehrteId: GefaehrteId): RevierErstlehre | undefined {
  return REVIER_ERSTLEHRE[gefaehrteId];
}
