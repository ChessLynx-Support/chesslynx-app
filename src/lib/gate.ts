// Bergtor-Gate-Auswertung — siehe Claude-Projekt "ChessLynx", projektwissen.md.
//
// Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
// schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md und claude/erobern_screen_reviere_
// ruhmeshalle_befund_2026-09-17.md): Diese Datei hieß vorher "Schlosstor-Gate-Auswertung"
// und verlangte zusätzlich zu den sechs Basisquests noch alle vier gate-pflichtigen
// Bonuskapitel (Fesselung, Rochade, Figurenwert, Matt in 2), bevor sich das "Schlosstor"
// (Übergang zur Burg/Wisentfeste) öffnete. Die vier Bonuskapitel sind jetzt als
// "Erstlehre" in die jeweiligen Gefährten-Reviere gewandert (siehe lib/revierErstlehre.ts,
// screens/Revier.tsx) — sie sind dort weiterhin exakt dieselben, bereits verifizierten
// Screens, nur nicht mehr Vorbedingung für den Bergtor-Übergang. Das frühere
// "Schlossvorplatz.tsx" (der Bonuskapitel-Navigations-Hub) ist ersatzlos entfallen; der
// bisher dorthin führende Burgtor-Ring auf der Karte (LuchsRevierKarte.tsx) führt jetzt
// zur Ruhmeshalle (mit eigenem, von diesem Gate unabhängigem Freischalt-Kriterium: ab
// Eichhörnchen mit 1 Stern, siehe dort).
//
// "Gefährten erreicht" (vormals "Schlosstor offen") bedeutet ab jetzt schlicht: alle
// sechs Basisquests abgeschlossen. Das ist zugleich die Bedingung für die Steinbrücken-
// Wegmarke (Die-ganze-Partie-Zugang, siehe LuchsRevierKarte.tsx) — deren Freischaltung
// war bisher an dieselbe, jetzt vereinfachte Bedingung gekoppelt und bleibt es.

import { loadQuestFortschrittLocal } from "./storage";

// Reihenfolge der sechs Basisquests, wie in RootNavigator.tsx/KidHome verdrahtet.
const BASISQUEST_IDS = ["quest1", "quest2", "quest3", "quest4", "quest5", "quest6"] as const;

export type GefaehrtenErreichtStatus = {
  // true, sobald ALLE sechs Basisquests abgeschlossen sind — vormals zusätzlich an vier
  // Bonuskapitel gekoppelt (siehe Datei-Kopfkommentar), das ist seit 2026-09-17 entfallen.
  offen: boolean;
};

/**
 * Prüft den aktuellen "Gefährten erreicht"-Zustand (vormals "Schlosstor") anhand der
 * lokal gespeicherten Basisquest-Fortschritte (siehe storage.ts). Rein lesend, keine
 * Seiteneffekte — kann beliebig oft aufgerufen werden (z. B. bei jedem Betreten von
 * LuchsRevierKarte.tsx).
 */
export async function pruefeGefaehrtenErreichtStatus(): Promise<GefaehrtenErreichtStatus> {
  const questErgebnisse = await Promise.all(BASISQUEST_IDS.map((id) => loadQuestFortschrittLocal(id)));
  const offen = questErgebnisse.every((q) => q?.abgeschlossen === true);
  return { offen };
}
