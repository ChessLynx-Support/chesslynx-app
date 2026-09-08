// Offline-first Fortschrittsspeicherung gemäß konzept/technisches_konzept.md Abschnitt 4:
// "Fortschritt wird lokal zwischengespeichert und synchronisiert mit Firestore, sobald
// eine Verbindung besteht." Nur das Eltern-Dashboard und der initiale Konto-Login
// benötigen laut Konzept zwingend eine Verbindung (Abschnitt 4) — das Kind spielt
// komplett offline weiter, die Synchronisierung passiert erst, wenn ein Elternteil
// später den Eltern-Bereich öffnet (siehe ElternBereichRouter in RootNavigator.tsx).
//
// Update (2026-09-04): Login-Flow (siehe auth.ts) steht jetzt, deshalb ist die
// Firestore-Schreib-Logik unten kein TODO mehr, sondern echt implementiert — auf
// Basis genau der Vorlage, die vorher hier als Kommentar stand.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, doc, getDocs, limit, query, setDoc } from "firebase/firestore";
import type { KindProfil, QuestFortschritt } from "./firebase";
import { db, kinderCollectionPfad } from "./firebase";
// Ergänzt 2026-09-06: Startwert für das neue freispielFortschritt-Feld unten
// (KindProfil verlangt es jetzt als Pflichtfeld, siehe firebase.ts) — Single Source of
// Truth für "welche Elo-Stufe ist die erste/leichteste" bleibt waldfreundeBot.ts.
import { ersteStufe } from "./waldfreundeBot";

const KEY_PREFIX = "chesslynx:questFortschritt:";
const SYNC_QUEUE_KEY = "chesslynx:syncQueue";
const AKTIVES_KIND_ID_KEY_PREFIX = "chesslynx:aktivesKindId:";

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
 * Gleicht die lokale Sync-Warteschlange gegen das Kinderprofil-Dokument in Firestore
 * ab (Pfad via `kindProfilPfad()` aus firebase.ts bauen, z. B.
 * `kindProfilPfad(user.uid, kindId)`). Wird von `ElternBereichRouter` in
 * RootNavigator.tsx aufgerufen, sobald ein Elternkonto angemeldet ist — das ist laut
 * Konzept (Abschnitt 4) der einzige Zeitpunkt, an dem eine Verbindung vorausgesetzt
 * wird. Absichtlich nicht bei jedem Quest-Abschluss aufgerufen: das Kind soll offline
 * weiterspielen können, ohne dass ein Sync-Versuch die Interaktion verzögert.
 *
 * Schreibt pro Quest ein gezieltes `questFortschritt.<questId>`-Feld statt das ganze
 * Dokument zu ersetzen (per `{ merge: true }`), damit ein gleichzeitig von einem
 * zweiten Gerät synchronisierter anderer Quest-Fortschritt nicht überschrieben wird.
 */
export async function syncPendingProgress(kindProfilPfad: string): Promise<void> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  const queue: string[] = raw ? JSON.parse(raw) : [];
  if (queue.length === 0) return;

  for (const questId of queue) {
    const fortschritt = await loadQuestFortschrittLocal(questId);
    if (fortschritt) {
      await setDoc(
        doc(db, kindProfilPfad),
        { questFortschritt: { [questId]: fortschritt }, zuletztAktivAm: Date.now() },
        { merge: true }
      );
    }
  }
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}

/**
 * Liefert die ID des "aktiven" Kinderprofils für ein Elternkonto — für den MVP-Kern
 * reicht ein Kind pro Familie (siehe firebase.ts, Abschnitt zu den Firestore-Pfaden).
 * Reihenfolge: (1) lokal gecachte ID verwenden, falls vorhanden; (2) sonst in
 * Firestore nach einem vorhandenen Kinderprofil suchen (deckt Anmeldung auf einem
 * neuen Gerät ab); (3) sonst ein neues Kinderprofil-Dokument anlegen — passiert nur
 * beim allerersten Login nach der Registrierung.
 *
 * `nicknameFallsNeu` wird nur für Fall (3) gebraucht (kommt aus dem
 * Registrieren-Formular in ElternLogin.tsx); ohne Angabe wird ein neutraler
 * Platzhalter-Nickname gesetzt, den das Kind später im Eltern-Dashboard ändern kann,
 * sobald es dafür einen echten Inhalt gibt (siehe priorisierter_umsetzungsplan.md
 * Phase 2, Punkt 5).
 *
 * Der Cache-Key ist an `parentUid` gebunden (nicht global) — meldet sich auf
 * demselben Gerät später ein zweites Elternkonto an (z. B. Geschwisterfamilie testet
 * mit), greift keine falsche gecachte ID aus dem ersten Konto.
 */
export async function getOrCreateAktivesKindId(
  parentUid: string,
  nicknameFallsNeu?: string
): Promise<string> {
  const cacheKey = AKTIVES_KIND_ID_KEY_PREFIX + parentUid;
  const gecachteId = await AsyncStorage.getItem(cacheKey);
  if (gecachteId) return gecachteId;

  const kinderRef = collection(db, kinderCollectionPfad(parentUid));
  const vorhandene = await getDocs(query(kinderRef, limit(1)));
  if (!vorhandene.empty) {
    const kindId = vorhandene.docs[0].id;
    await AsyncStorage.setItem(cacheKey, kindId);
    return kindId;
  }

  const heute = new Date().toISOString().slice(0, 10);
  const neuesKindProfil: KindProfil = {
    nickname: nicknameFallsNeu?.trim() || "Entdecker:in",
    questFortschritt: {},
    waldgefaehrtenFortschritt: {},
    freispielFortschritt: { hoechsteFreigeschalteteElo: ersteStufe().elo },
    bonusFortschritt: { fesselung: false, rochade: false, mattIn2: false, mattIn3: false, schlossFinale: false },
    screenTimeHeute: { minutenGenutzt: 0, datum: heute },
    erstelltAm: Date.now(),
    zuletztAktivAm: Date.now(),
  };
  const neuesDoc = await addDoc(kinderRef, neuesKindProfil);
  await AsyncStorage.setItem(cacheKey, neuesDoc.id);
  return neuesDoc.id;
}
