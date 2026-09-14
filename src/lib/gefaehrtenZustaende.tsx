// Die sechs Gefährten als lebendige Wegmarken auf der Saga-Karte (2026-09-14).
//
// Hintergrund: Seit dem 2026-09-11 entstehen Bewegungen nach der Zustands-Methode — das
// Bild-Tool liefert vollständige Bilder, `scripts/rig_master.py` richtet sie deckungsgleich
// auf den Grundzustand aus und exportiert alle Zustände einer Figur mit DEMSELBEN
// Ausschnitt auf DIESELBE Leinwand (siehe claude/rig_master_system_2026-09-12.md). Die
// Quest-Tiere und Lux sind seit dem 2026-09-13 so verdrahtet (ZustandsTier.tsx); die sechs
// Gefährten waren die letzte Gruppe, deren fertige Zustände ungenutzt im Rig lagen — auf
// der Karte stand von jedem nur ein Standbild.
//
// Diese Datei ist die Gegenstelle dazu, gebaut wie der Wegmarken-Teil von questTiere.tsx.
//
// -------------------------------------------------------------------------------------
// Warum nur Grundzustand und Blinzeln
// -------------------------------------------------------------------------------------
// Im Rig liegt je Gefährte auch ein SPRECHEN-Zustand (bei der Adlerin zusätzlich ein
// Zwinkern, beim Wisent Kopfheben und Schnauben). Exportiert ist davon nichts: Die
// Reviere werden erst in Update 1 spielbar, und auf der Karte spricht niemand. Eine Datei,
// die kein Screen anzeigt, ist Bundle-Gewicht ohne Gegenwert — dieselbe Begründung, mit
// der beim Grundzustand der Quest-Tiere rund 1 MB eingespart wurde
// (claude/zustaende_app_einbindung_2026-09-13.md). Die Zustände sind gebaut und
// freigegeben; sie zu exportieren ist ein Einzeiler in der jeweiligen rig_config.
//
// -------------------------------------------------------------------------------------
// Die Leinwand ist größer als die Figur
// -------------------------------------------------------------------------------------
// Der Export legt um die Zustandsfamilie einen kleinen durchsichtigen Rand (3 px oben und
// unten). `ZustandsFigur` rechnet ihn wieder heraus, damit `breiteFrac` in
// LuchsRevierKarte.tsx weiterhin die Breite des TIERES meint und nicht die der Bilddatei.
// Die vier Zahlen in `figur` misst `rig_master.py` beim Export über den Alphakanal.
//
// -------------------------------------------------------------------------------------
// Die Figuren sind 1–4 px schmaler als die bisherigen Standbilder
// -------------------------------------------------------------------------------------
// Die alten `chesslynx_<tier>_wegmarke.webp` waren aus dem ROHEN Master geschnitten, die
// neuen aus dem bereinigten: `rig_master.py` entfernt vor dem Bauen Streupixel und setzt
// den Innenraum auf volle Deckkraft. Beim Eichhörnchen fallen dadurch 3 px Fransensaum
// weg (215 → 212 px Breite bei gleicher Höhe). Die `aspekt`-Werte in LuchsRevierKarte.tsx
// kommen deshalb jetzt aus `gefaehrteWegmarkeAspekt()` statt aus fest eingetragenen
// Brüchen — sonst stünde die Figur um bis zu 2 % verzerrt auf der Karte.

import { ZustandsFigur } from "../components/ZustandsTier";
import type { Leinwand } from "../components/ZustandsTier";

export type GefaehrteId =
  | "eichhoernchen"
  | "fuchs"
  | "dachs"
  | "adlerin"
  | "wolf"
  | "wisent";

type WegmarkenBilder = {
  grund: ReturnType<typeof require>;
  blinzeln: ReturnType<typeof require>;
  leinwand: Leinwand;
};

export const GEFAEHRTE_WEGMARKE: Record<GefaehrteId, WegmarkenBilder> = {
  eichhoernchen: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_blinzeln.webp"),
    leinwand: { breite: 221, hoehe: 326, figur: [4, 3, 212, 320] },
  },
  fuchs: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_fuchs_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_fuchs_wegmarke_blinzeln.webp"),
    leinwand: { breite: 230, hoehe: 326, figur: [4, 3, 221, 320] },
  },
  dachs: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_blinzeln.webp"),
    leinwand: { breite: 204, hoehe: 326, figur: [5, 3, 194, 320] },
  },
  adlerin: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_blinzeln.webp"),
    leinwand: { breite: 178, hoehe: 326, figur: [2, 3, 173, 320] },
  },
  wolf: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wolf_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wolf_wegmarke_blinzeln.webp"),
    leinwand: { breite: 199, hoehe: 326, figur: [4, 3, 191, 320] },
  },
  wisent: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wisent_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wisent_wegmarke_blinzeln.webp"),
    leinwand: { breite: 210, hoehe: 326, figur: [4, 3, 203, 320] },
  },
};

/** Seitenverhältnis (Höhe/Breite) der FIGUR — nicht der Bilddatei. */
export function gefaehrteWegmarkeAspekt(id: GefaehrteId): number {
  const [, , breite, hoehe] = GEFAEHRTE_WEGMARKE[id].leinwand.figur;
  return hoehe / breite;
}

/**
 * Ein Gefährte als Wegmarke auf der Saga-Karte. `breite` ist die Breite des TIERES.
 *
 * Anders als die Quest-Tiere grüßt hier niemand: Die Gefährten haben keinen Gesten-
 * Zustand, und der offene Mund allein — ohne Sprechblase und ohne Ton — läse sich nicht
 * als Gruß, sondern als Fehler. Bis die Reviere spielbar sind, blinzeln sie nur.
 */
export function GefaehrteWegmarke({
  id,
  breite,
  blinzeln = true,
}: {
  id: GefaehrteId;
  breite: number;
  blinzeln?: boolean;
}) {
  const w = GEFAEHRTE_WEGMARKE[id];
  return (
    <ZustandsFigur
      leinwand={w.leinwand}
      figurBreite={breite}
      grund={w.grund}
      blinzeln={blinzeln ? w.blinzeln : undefined}
      idle={blinzeln}
    />
  );
}
