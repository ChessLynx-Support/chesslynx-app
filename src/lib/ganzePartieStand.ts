// Paket 3c (2026-09-11, Nutzerwunsch "Wer das Kapitel mittendrin verlässt ... kindgerecht
// einbauen", Entscheidung: fünf Trittsteine + neu startende Partie + gewolltes Zurücksetzen):
// Zwischenstand des Kapitels „Die ganze Partie" — wie viele der fünf Etappen schon fertig sind.
//
// Bewusst NUR lokal auf dem Gerät (kein Firestore-Sync): das ist ein Zwischenstand, kein
// Lernfortschritt. Der eigentliche Fortschritt ist weiterhin `bonusFortschritt.ganzePartie`
// (wird am Kapitelende gesetzt und synchronisiert). Am Kapitelende wird der Zwischenstand
// gelöscht; "Von vorn" (Kind, auf dem Rückkehr-Screen) und "Neu beginnen" (Eltern-Dashboard)
// löschen ihn ebenfalls.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ETAPPEN_ANZAHL } from "../bonus/ganzePartieLogik";

export const GANZE_PARTIE_ETAPPE_KEY = "chesslynx:ganzePartieEtappe";

/** Anzahl fertiger Etappen (0 = noch nichts / kein Zwischenstand). */
export async function ladeGanzePartieEtappe(): Promise<number> {
  const raw = await AsyncStorage.getItem(GANZE_PARTIE_ETAPPE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? Math.max(0, Math.min(ETAPPEN_ANZAHL - 1, Math.floor(n))) : 0;
}

/** Merkt sich, dass `fertig` Etappen geschafft sind (nur steigend — nie zurückschreiben). */
export async function speichereGanzePartieEtappe(fertig: number): Promise<void> {
  const bisher = await ladeGanzePartieEtappe();
  if (fertig > bisher) await AsyncStorage.setItem(GANZE_PARTIE_ETAPPE_KEY, String(fertig));
}

export async function loescheGanzePartieEtappe(): Promise<void> {
  await AsyncStorage.removeItem(GANZE_PARTIE_ETAPPE_KEY);
}
