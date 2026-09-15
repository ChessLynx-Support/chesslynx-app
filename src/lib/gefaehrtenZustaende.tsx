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
// Warum nur Grundzustand, Blinzeln — und seit 2026-09-15 bei Adlerin UND Rabe auch Zwinkern
// -------------------------------------------------------------------------------------
// Im Rig liegt je Gefährte auch ein SPRECHEN-Zustand (bei Adlerin und Rabe zusätzlich ein
// Zwinkern, beim Wisent Kopfheben und Schnauben). Sprechen bleibt weiterhin unexportiert:
// Die App ist bewusst textfrei/stimmenfrei nur mit geprüften, freigegebenen Sprechzeilen,
// und für "Gefährte spricht im Revier" gibt es noch keine — siehe screens/Revier.tsx-
// Kommentar. Eine Datei, die kein Screen anzeigt, ist Bundle-Gewicht ohne Gegenwert
// (claude/zustaende_app_einbindung_2026-09-13.md).
//
// Zwinkern braucht dagegen KEINEN Text — die Zustandsdefinition selbst nennt es "Reaktion
// auf Lob". Für die Adlerin ist es seit 2026-09-15 exportiert und verdrahtet: screens/
// Revier.tsx löst es aus, sobald im Revier ein neuer Stern erreicht wird (`zwinkernAusloeser`
// unten). Beim Raben war es zunächst zurückgestellt: der frische Export wich beim
// Grundzustand um 77 % der Pixel von der ausgelieferten Wegmarke ab. Ursache war NICHT (wie
// zunächst vermutet) eine unvollständig nachgezogene Kopfausschnitt-Korrektur, sondern ein
// falsches Master-Bild — die als Master abgelegte Datei war per Prüfsumme bitgleich mit der
// ausdrücklich ABGELEHNTEN Rabe-Lieferung, nicht mit der freigegebenen (siehe
// `scripts/rig_configs/rabe.json`, Feld `korrektur_2026_09_15`, und
// `claude/rabe_v2_master_korrektur_2026-09-15.md`). Nach Umstellung auf das tatsächlich
// freigegebene Master-Bild registriert sich Rabe wieder sauber (Versatz 0,0 px, Abweichung
// 1–4/255, wie ursprünglich), Zwinkern ist jetzt ebenfalls exportiert und verdrahtet.
// Eichhörnchen, Dachs und Wolf haben ohnehin kein Zwinkern-Bild geliefert bekommen (nur
// Sprechen), bleiben also unverändert bei Grundzustand + Blinzeln.
//
// -------------------------------------------------------------------------------------
// E3 "Freude" (seit 2026-09-15, erste Figur: Eichhörnchen) — ersetzt den Grundzustand,
// sobald das Revier abgeschlossen ist
// -------------------------------------------------------------------------------------
// Anders als Zwinkern (einmalige Geste, siehe oben) ist Freude ein eigener VOLLBILD-Zustand
// (`S3_freude` im Rig, siehe `scripts/rig_configs/<tier>.json`) — Kopf sichtbar nach hinten
// gekippt, warmer Ausdruck, kein Blinzeln-Layer dafür geliefert. Auslöser (Christian,
// 2026-09-15: "Passt für E3, Eichhörnchen freigeben"): `istRevierAbgeschlossen()` aus
// lib/endlosmodusFortschritt.ts — sobald das Revier dieses Gefährten alle Sterne hat, zeigt
// screens/Revier.tsx dauerhaft die Freude-Pose statt Grundzustand+Blinzeln (kein einmaliges
// Aufblitzen wie beim Zwinkern, sondern der neue Ruhezustand für ein fertig gespieltes
// Revier — passt zur Bedeutung "das ist geschafft"). Die Ruhmeshalle bekommt beim selben
// Ereignis zusätzlich einmalig den Funkeln-Effekt (E5, siehe
// `e5_rangaufstieg_verdrahtung_2026-09-15.md`) — zwei unabhängige Reaktionen an zwei
// verschiedenen Orten auf dasselbe Ereignis, kein Widerspruch.
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
// Station 2 ist seit dem 2026-09-14 der RABE, nicht mehr der Fuchs
// -------------------------------------------------------------------------------------
// Der Fuchs teilte sich die Farbe mit dem Eichhörnchen und mit Lux und die Silhouette mit
// dem Wolf. Auf der Karte standen Fuchs und Eichhörnchen 10,6 Referenzpunkte auseinander,
// in den Schattenrissen der Ruhmeshalle waren Fuchs und Wolf dieselbe Form. Umfärben half
// nicht: Orange kollidiert mit Eichhörnchen und Lux, Grau mit dem Wolf, Braun mit Wisent
// und Adlerin — für einen hundeartigen Vierbeiner ist in dieser Besetzung keine Farbe mehr
// frei. Schwarz war die einzige. Herleitung: claude/rabe_ersetzt_fuchs_2026-09-14.md.
//
// Der Rabe ist mit 27,3 Referenzpunkten schmaler als der Fuchs (38,2); die Lücke zum
// Eichhörnchen wächst dadurch von 10,6 auf 16,1 Punkte, ohne dass eine Wegmarke verschoben
// werden musste. Die Fuchs-Dateien bleiben im Archiv und in `scripts/rig_configs/fuchs.json`
// liegen — die Figur ist nicht gelöscht, nur nicht mehr verdrahtet.

// -------------------------------------------------------------------------------------
// Die Figuren sind 1–4 px schmaler als die bisherigen Standbilder
// -------------------------------------------------------------------------------------
// Die alten `chesslynx_<tier>_wegmarke.webp` waren aus dem ROHEN Master geschnitten, die
// neuen aus dem bereinigten: `rig_master.py` entfernt vor dem Bauen Streupixel und setzt
// den Innenraum auf volle Deckkraft. Beim Eichhörnchen fallen dadurch 3 px Fransensaum
// weg (215 → 212 px Breite bei gleicher Höhe). Die `aspekt`-Werte in LuchsRevierKarte.tsx
// kommen deshalb jetzt aus `gefaehrteWegmarkeAspekt()` statt aus fest eingetragenen
// Brüchen — sonst stünde die Figur um bis zu 2 % verzerrt auf der Karte.

import { ZustandsFigur, useGeste, GESTE_EINMAL } from "../components/ZustandsTier";
import type { Leinwand } from "../components/ZustandsTier";

export type GefaehrteId =
  | "eichhoernchen"
  | "rabe"
  | "dachs"
  | "adlerin"
  | "wolf"
  | "wisent";

type WegmarkenBilder = {
  grund: ReturnType<typeof require>;
  blinzeln: ReturnType<typeof require>;
  /** Nur bei Adlerin und Rabe geliefert UND exportiert (Stand 2026-09-15, siehe
   *  Datei-Kommentar oben) — bei den übrigen Gefährten bewusst `undefined`. */
  zwinkern?: ReturnType<typeof require>;
  /** E3 Freude-Vollbild — ersetzt `grund`, sobald das Revier abgeschlossen ist (siehe
   *  Datei-Kommentar oben). Stand 2026-09-15 nur beim Eichhörnchen geliefert UND exportiert;
   *  bei den übrigen Gefährten bewusst `undefined`, bis ihre E3-Lieferung da ist. */
  freude?: ReturnType<typeof require>;
  leinwand: Leinwand;
};

export const GEFAEHRTE_WEGMARKE: Record<GefaehrteId, WegmarkenBilder> = {
  eichhoernchen: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_blinzeln.webp"),
    freude: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_freude.webp"),
    leinwand: { breite: 221, hoehe: 326, figur: [4, 3, 212, 320] },
  },
  rabe: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_blinzeln.webp"),
    zwinkern: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_zwinkern.webp"),
    leinwand: { breite: 171, hoehe: 326, figur: [3, 3, 165, 320] },
  },
  dachs: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_blinzeln.webp"),
    leinwand: { breite: 204, hoehe: 326, figur: [5, 3, 194, 320] },
  },
  adlerin: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_blinzeln.webp"),
    zwinkern: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_zwinkern.webp"),
    leinwand: { breite: 178, hoehe: 326, figur: [3, 3, 172, 320] },
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
 * Ein Gefährte als Wegmarke auf der Saga-Karte ODER im Revier-Screen. `breite` ist die
 * Breite des TIERES.
 *
 * Auf der Karte grüßt weiterhin niemand: Die Gefährten haben dort keinen Gesten-Zustand,
 * der offene Mund allein — ohne Sprechblase und ohne Ton — läse sich nicht als Gruß,
 * sondern als Fehler. Im Revier gibt es seit 2026-09-15 ZWEI Ausnahmen: `zwinkernAusloeser`
 * löst bei Adlerin und Rabe ein einmaliges Zwinkern aus (Reaktion auf Lob, siehe
 * screens/Revier.tsx) — kein Sprechen, kein erfundener Dialog, nur eine stumme Geste mit
 * bereits freigegebenem Bildmaterial. `freudeAktiv` ersetzt den Grundzustand dauerhaft durch
 * die Freude-Pose, sobald das Revier abgeschlossen ist (siehe Datei-Kommentar oben). Bei
 * jeder anderen Aufrufstelle bzw. jedem anderen Gefährten bleiben beide Props wirkungslos
 * (kein exportiertes Zwinkern-/Freude-Bild, siehe `GEFAEHRTE_WEGMARKE` oben) — kein
 * Sonderfall nötig.
 */
export function GefaehrteWegmarke({
  id,
  breite,
  blinzeln = true,
  zwinkernAusloeser,
  freudeAktiv = false,
}: {
  id: GefaehrteId;
  breite: number;
  blinzeln?: boolean;
  /** Ändert sich der Wert (z. B. ein hochgezählter Zähler), zwinkert die Figur einmal —
   *  siehe Funktionskommentar. */
  zwinkernAusloeser?: unknown;
  /** true → zeigt dauerhaft die Freude-Pose statt Grundzustand+Blinzeln (siehe
   *  Funktionskommentar). Ohne exportiertes Freude-Bild wirkungslos. */
  freudeAktiv?: boolean;
}) {
  const w = GEFAEHRTE_WEGMARKE[id];
  const freudeJetzt = freudeAktiv && !!w.freude;
  // Zwinkern und Freude schließen sich aus: Die Zwinkern-Ebene ist eine Differenz zum
  // Grundzustand (S0_standing → S2_zwinkern) und würde auf der andersartigen Freude-Pose
  // (S3_freude, andere Kopfhaltung) sichtbar falsch sitzen — deshalb `zwinkernAusloeser`
  // in diesem Zustand ignorieren, nicht extra durch den Aufrufer abschalten lassen müssen.
  const zwinkertJetzt = useGeste(w.zwinkern && !freudeJetzt ? zwinkernAusloeser : undefined, GESTE_EINMAL);
  return (
    <ZustandsFigur
      leinwand={w.leinwand}
      figurBreite={breite}
      grund={freudeJetzt ? w.freude : w.grund}
      blinzeln={blinzeln && !freudeJetzt ? w.blinzeln : undefined}
      idle={blinzeln && !freudeJetzt}
      ebenen={w.zwinkern && !freudeJetzt ? [{ bild: w.zwinkern, aktiv: zwinkertJetzt }] : undefined}
    />
  );
}
