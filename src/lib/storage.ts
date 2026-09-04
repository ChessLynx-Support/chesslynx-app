// Offline-first Fortschrittsspeicherung gemäß konzept/technisches_konzept.md Abschnitt 4:
// "Fortschritt wird lokal zwischengespeichert und synchronisiert mit Firestore, sobald
// eine Verbindung besteht." Diese Datei deckt die lokale Seite ab; die tatsächliche
// Firestore-Schreib-Logik ist als TODO markiert, da sie ein bestehendes Kinderprofil-
// Dokument voraussetzt (Login-Flow, hier noch nicht Teil des Grundgerüsts).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QuestFortschritt } from "./firebase";

const KEY_PREFIX = "chesslynx:questFortschritt:";
const SYNC_QUEUE_KEY = "chesslynx:syncQueue";

export async function saveQuestFortschrittLocal(questId: string, fortschritt: QuestFortschritt) {
  await AsyncStorage.setItem(KEY_PREFIX + questId, JSON.stringify(fortschritt));
  await enqueueForSync(questId);
}

export async function loadQuestFortschrittLocal(questId: string): Promise<QuestFortschritt | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + questId);
  return raw ? (JSON.parse(raw) as QuestFortschritt) : null;
}

async function enqueueForSync(questId: string) {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  const queue: string[] = raw ? JSON.parse(raw) : [];
  if (!queue.includes(questId)) queue.push(questId);
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * TODO (Teil des Login-/Elternkonto-Bausteins, siehe technisches_konzept.md Abschnitt 9,
 * Schritt 2): beim Herstellen einer Verbindung + vorhandenem eingeloggtem Elternkonto
 * die Warteschlange gegen `db` (firebase.ts) abgleichen, z. B.:
 *
 *   import { doc, setDoc } from "firebase/firestore";
 *   import { db } from "./firebase";
 *
 *   export async function syncPendingProgress(kindProfilPfad: string) {
 *     const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
 *     const queue: string[] = raw ? JSON.parse(raw) : [];
 *     for (const questId of queue) {
 *       const fortschritt = await loadQuestFortschrittLocal(questId);
 *       if (fortschritt) {
 *         await setDoc(doc(db, kindProfilPfad), { [`questFortschritt.${questId}`]: fortschritt }, { merge: true });
 *       }
 *     }
 *     await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
 *   }
 *
 * Bewusst nicht in diesem Grundgerüst fertig implementiert, weil das Elternkonto-/
 * Login-Modell (Auth-Status, Kinderprofil-Pfad) noch nicht Teil dieses Schritts ist.
 */
export async function syncPendingProgress(_kindProfilPfad: string) {
  // Platzhalter — siehe Kommentar oben.
}
