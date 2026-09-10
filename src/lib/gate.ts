// Schlosstor-Gate-Auswertung — siehe Claude-Projekt "ChessLynx", projektwissen.md,
// Abschnitt "Schlosstor-Gate erweitert (2026-09-08)": "Neue, verbindliche Gate-Bedingung:
// alle Basisquests + Fesselung + Rochade + Figurenwert + Matt in 2. Nur Matt in 3 bleibt
// echt optional/nicht gate-pflichtig." Das Datenmodell dafür (bonusFortschritt,
// questFortschritt) existierte laut priorisierter_umsetzungsplan.md bereits — "die
// eigentliche Gate-Auswertungslogik selbst (der Übergang Schlossvorplatz → Schlosstor) ist
// noch nicht gebaut". Diese Datei schließt genau diese Lücke.
//
// Bewusste Scope-Grenze dieses Umsetzungsschritts: nur die GATE-PRÜFUNG selbst (boolescher
// Zustand + "was fehlt noch") wird hier gebaut. Der eigentliche Inhalt HINTER dem geöffneten
// Schlosstor (Schlosshof, Wiederholungspuzzles, Begegnung mit der Prinzessin, Thronsaal —
// siehe projektwissen.md, Abschnitt "Ablauf") ist ein eigener, umfangreicher
// Illustrations-/Content-Produktionsschritt, der über den chess-logischen Umfang dieser
// Implementierungsrunde (Task #112, Bonuskapitel + Gate-Logik) hinausgeht und hier bewusst
// NICHT mitgebaut wird — siehe Schlossvorplatz.tsx-Kommentar für den entsprechenden,
// klar markierten Platzhalter.

import { loadQuestFortschrittLocal, loadBonusFortschrittLocal } from "./storage";

// Reihenfolge der sechs Basisquests, wie in RootNavigator.tsx/KidHome verdrahtet.
const BASISQUEST_IDS = ["quest1", "quest2", "quest3", "quest4", "quest5", "quest6"] as const;

// Reihenfolge der vier GATE-PFLICHTIGEN Bonuskapitel — exakt die in
// bonuskapitel_screen_skripte.md festgelegte Kette (Fesselung → Rochade → Figurenwert →
// Matt in 2). Matt in 3 ist bewusst NICHT Teil dieser Liste (siehe Datei-Kopfkommentar).
const GATE_PFLICHTIGE_BONUSKAPITEL = ["fesselung", "rochade", "figurenwert", "mattIn2"] as const;

// Bildschirm-Routennamen (RootNavigator.tsx) je Bonuskapitel-Id, in derselben Reihenfolge —
// wird von Schlossvorplatz.tsx genutzt, um zum jeweils nächsten unvollständigen Kapitel zu
// navigieren.
export const BONUSKAPITEL_ROUTEN: Record<(typeof GATE_PFLICHTIGE_BONUSKAPITEL)[number], string> = {
  fesselung: "Fesselung",
  rochade: "Rochade",
  figurenwert: "Figurenwert",
  mattIn2: "MattIn2",
};

export type SchlosstorStatus = {
  // true, sobald ALLE sechs Basisquests UND alle vier gate-pflichtigen Bonuskapitel
  // abgeschlossen sind.
  offen: boolean;
  // Alle sechs Basisquests abgeschlossen? (Unabhängiger Teilzustand, für eine genauere
  // Rückmeldung an das Kind bzw. später das Eltern-Dashboard.)
  basisquestsVollstaendig: boolean;
  // Die Bonuskapitel-Id des NÄCHSTEN noch unvollständigen gate-pflichtigen Kapitels, in der
  // festen Kettenreihenfolge — null, wenn bereits alle vier fertig sind.
  naechstesBonuskapitel: (typeof GATE_PFLICHTIGE_BONUSKAPITEL)[number] | null;
  // Vollständiger Erfüllungsstatus je gate-pflichtigem Bonuskapitel, für eine detaillierte
  // Anzeige (z. B. im Eltern-Dashboard, siehe ParentDashboard.tsx).
  bonuskapitelStatus: Record<(typeof GATE_PFLICHTIGE_BONUSKAPITEL)[number], boolean>;
};

/**
 * Prüft den aktuellen Schlosstor-Gate-Zustand anhand der lokal gespeicherten Fortschritts-
 * daten (siehe storage.ts). Rein lesend, keine Seiteneffekte — kann beliebig oft aufgerufen
 * werden (z. B. bei jedem Betreten von Schlossvorplatz.tsx).
 */
export async function pruefeSchlosstorStatus(): Promise<SchlosstorStatus> {
  const questErgebnisse = await Promise.all(BASISQUEST_IDS.map((id) => loadQuestFortschrittLocal(id)));
  const basisquestsVollstaendig = questErgebnisse.every((q) => q?.abgeschlossen === true);

  const bonusErgebnisse = await Promise.all(
    GATE_PFLICHTIGE_BONUSKAPITEL.map((id) => loadBonusFortschrittLocal(id))
  );
  const bonuskapitelStatus = Object.fromEntries(
    GATE_PFLICHTIGE_BONUSKAPITEL.map((id, i) => [id, bonusErgebnisse[i]])
  ) as Record<(typeof GATE_PFLICHTIGE_BONUSKAPITEL)[number], boolean>;

  const naechstesBonuskapitel = GATE_PFLICHTIGE_BONUSKAPITEL.find((id) => !bonuskapitelStatus[id]) ?? null;

  return {
    offen: basisquestsVollstaendig && naechstesBonuskapitel === null,
    basisquestsVollstaendig,
    naechstesBonuskapitel,
    bonuskapitelStatus,
  };
}
