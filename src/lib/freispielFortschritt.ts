// Fortschrittsspeicherung für den "Freispiel"-Modus (Übungslichtung), siehe
// endlosmodus_freispiel_konzept.md im Claude-Projekt "ChessLynx".
//
// Bewusst als eigenes, kleines Modul angelegt statt storage.ts zu erweitern — genau
// wie bereits bei elternEinstellungen.ts und zeitlimit.ts gehandhabt: jedes
// Nebenfeature bekommt sein eigenes Modul, statt storage.ts immer weiter wachsen zu
// lassen.
//
// WICHTIG, nicht verwechseln: Freispiel-Fortschritt (`freispielFortschritt` auf
// KindProfil, hier verwaltet) ist ein eigenes, unabhängiges Feld — NICHT dasselbe wie
// `waldgefaehrtenFortschritt` in firebase.ts. Letzteres gehört zur narrativen
// Waldgefährten-Kampagne (5 Königreiche + Wisent, 1-3-Sterne-Progression,
// Ruhmeshalle-Graduierung). Freispiel ist laut Konzept-Entscheidung (2026-09-06) ein
// davon unabhängiger, nicht-narrativer Übungsmodus — beide Fortschritte existieren
// nebeneinander, keiner ersetzt den anderen.
//
// Offline-first wie überall sonst im Projekt (siehe storage.ts): lokal sofort
// speichern, Sync nach Firestore erst wenn ein Elternteil den Eltern-Bereich öffnet
// (ElternBereichRouter in RootNavigator.tsx) — das Kind spielt weiter, ohne auf eine
// Verbindung zu warten.
//
// Da die 16 Freispiel-Stufen linear freigeschaltet werden (siehe waldfreundeBot.ts,
// Reihenfolge von WALDFREUNDE_STUFEN), genügt eine einzige Zahl als vollständiger
// Fortschritts-Zustand: die höchste bereits freigeschaltete Elo-Stufe. Jede Stufe mit
// `elo <= hoechsteFreigeschalteteElo` gilt als freigeschaltet — kein separates
// Freischalt-Flag pro Stufe nötig.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { holeDb } from "./firebase";
import { ersteStufe, naechsteStufeNach, WALDFREUNDE_STUFEN, type WaldfreundeStufe } from "./waldfreundeBot";

const LOKALER_SCHLUESSEL = "chesslynx:freispielFortschritt:hoechsteFreigeschalteteElo";
const SYNC_AUSSTEHEND_SCHLUESSEL = "chesslynx:freispielFortschritt:syncAusstehend";
// Schritt #75 (siehe projektwissen.md, Kurzstatus): einmaliger Farbeinführung-Moment
// ("zwei Seiten, Weiß beginnt", siehe Farbeinfuehrung-Komponente in FreispielPartie.tsx
// und claude/freispiel_farbeinfuehrung_sprachentwurf.md). Bewusst ein eigener, rein
// lokaler Schlüssel statt eines Felds auf `freispielFortschritt` selbst — dieser Moment
// ist reine Einmal-Information, kein Spielfortschritt, und braucht deshalb keinen
// Firestore-Sync (siehe hatFarbeinfuehrungGesehen()/markiereFarbeinfuehrungGesehen()
// unten).
const FARBEINFUEHRUNG_GESEHEN_SCHLUESSEL = "chesslynx:freispielFortschritt:farbeinfuehrungGesehen";

/**
 * Liefert die aktuell höchste freigeschaltete Elo-Stufe. Startwert (noch nie
 * gespeichert): die erste/leichteste Stufe aus waldfreundeBot.ts — rein lokal, kein
 * Netzwerk nötig.
 */
export async function ladeHoechsteFreigeschalteteElo(): Promise<number> {
  const gespeichert = await AsyncStorage.getItem(LOKALER_SCHLUESSEL);
  return gespeichert ? Number(gespeichert) : ersteStufe().elo;
}

/**
 * Alle 16 Stufen mit Freischalt-Status — fertig aufbereitet für die Übungslichtung-
 * Liste im Freispiel-Screen (siehe Aufgabe "Freispiel-Screen").
 */
export async function ladeFreispielStufenMitStatus(): Promise<
  Array<WaldfreundeStufe & { freigeschaltet: boolean }>
> {
  const hoechsteFreigeschaltete = await ladeHoechsteFreigeschalteteElo();
  return WALDFREUNDE_STUFEN.map((stufe) => ({
    ...stufe,
    freigeschaltet: stufe.elo <= hoechsteFreigeschaltete,
  }));
}

/**
 * Meldet einen gewonnenen Sieg gegen den Bot der übergebenen Elo-Stufe. Schaltet die
 * nächste Stufe frei, aber NUR wenn `elo` genau die aktuell höchste freigeschaltete
 * Stufe war — ein wiederholter Sieg gegen eine bereits länger freigeschaltete,
 * niedrigere Stufe ändert nichts (beliebig wiederholbares Üben laut Konzept, aber kein
 * Überspringen von Stufen z. B. durch einen zufälligen Sieg gegen eine noch gar nicht
 * erreichte höhere Stufe, was ohnehin nicht vorkommen kann, da nur freigeschaltete
 * Stufen im Screen überhaupt spielbar sind — die Prüfung hier ist die zusätzliche,
 * robuste Absicherung auf Datenebene).
 *
 * Gibt die neu freigeschaltete Stufe zurück (oder `null`, wenn keine Freischaltung
 * stattfand) — der Freispiel-Screen nutzt das, um die Freischalt-Feier-Animation genau
 * dann zu zeigen, wenn tatsächlich etwas Neues aufgeht.
 */
export async function meldeSiegGegenStufe(
  elo: number
): Promise<{ neueStufeFreigeschaltet: WaldfreundeStufe | null }> {
  const aktuelleHoechste = await ladeHoechsteFreigeschalteteElo();
  if (elo !== aktuelleHoechste) {
    return { neueStufeFreigeschaltet: null };
  }

  const naechste = naechsteStufeNach(elo);
  if (!naechste) {
    return { neueStufeFreigeschaltet: null }; // 1300 war bereits die letzte Stufe
  }

  await AsyncStorage.setItem(LOKALER_SCHLUESSEL, String(naechste.elo));
  await AsyncStorage.setItem(SYNC_AUSSTEHEND_SCHLUESSEL, "1");
  return { neueStufeFreigeschaltet: naechste };
}

/**
 * Ob das Kind den einmaligen Farbeinführung-Moment ("im Schach gibt es zwei Seiten,
 * Weiß beginnt immer") bereits gesehen hat — unabhängig von der aktuell gespielten
 * Stufe, denn der Moment gehört unabhängig vom Gegner nur einmal gezeigt.
 */
export async function hatFarbeinfuehrungGesehen(): Promise<boolean> {
  const gespeichert = await AsyncStorage.getItem(FARBEINFUEHRUNG_GESEHEN_SCHLUESSEL);
  return gespeichert === "1";
}

/**
 * Markiert die Farbeinführung als gesehen. Wird von FreispielPartie.tsx genau einmal
 * aufgerufen, sobald das Kind den Begegnungs-Moment durchgetippt hat — siehe
 * Farbeinfuehrung-Komponente dort.
 */
export async function markiereFarbeinfuehrungGesehen(): Promise<void> {
  await AsyncStorage.setItem(FARBEINFUEHRUNG_GESEHEN_SCHLUESSEL, "1");
}

/**
 * Gleicht den lokalen Freispiel-Fortschritt nach Firestore ab — analog zu
 * `syncPendingProgress` in storage.ts, als eigener Aufruf (nicht in dieselbe Funktion
 * integriert, damit beide Fortschrittsarten unabhängig fehlschlagen/wiederholt werden
 * können). Wird vom ElternBereichRouter aufgerufen, sobald ein Elternkonto angemeldet
 * ist. Schreibt gezielt nur das `freispielFortschritt`-Feld (per `merge: true`),
 * damit gleichzeitiger Quest-/Waldgefährten-Fortschritt von einem zweiten Gerät nicht
 * überschrieben wird.
 */
export async function syncPendingFreispielFortschritt(kindProfilPfad: string): Promise<void> {
  const ausstehend = await AsyncStorage.getItem(SYNC_AUSSTEHEND_SCHLUESSEL);
  if (!ausstehend) return;

  const hoechsteFreigeschaltete = await ladeHoechsteFreigeschalteteElo();
  await setDoc(
    doc(holeDb(), kindProfilPfad),
    { freispielFortschritt: { hoechsteFreigeschalteteElo: hoechsteFreigeschaltete }, zuletztAktivAm: Date.now() },
    { merge: true }
  );
  await AsyncStorage.removeItem(SYNC_AUSSTEHEND_SCHLUESSEL);
}
