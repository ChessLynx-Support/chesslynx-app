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
// Neu (2026-09-09, Bau der echten WillkommensSequenz.tsx, siehe Claude-Projekt "ChessLynx",
// konzept_screen0_verschmelzung_appstart.md Abschnitt 4, "Persistenz-Flag, weiterhin
// nötig"): die neue Willkommens-Sequenz (Begrüßung + Tier-Vorstellung + Verstecken/Landen-
// Choreografie, grob 20-25s plus Animationszeit) soll nur beim allerersten App-Start
// laufen, nicht bei jedem Öffnen erneut — anders als z. B. Quest1.tsx Screen 0 (dort
// bewusst KEIN "einmalig"-Flag, siehe dortiger Kommentar) ist diese Sequenz dafür deutlich
// zu lang. Rein lokal (kein Sync nötig, kein Bezug zu Quest-/Bonusfortschritt) — reicht ein
// simples Flag statt einer Warteschlange wie bei saveQuestFortschrittLocal oben.
const WILLKOMMEN_GESEHEN_KEY = "chesslynx:hatWillkommenGesehen";

export async function hatWillkommenGesehen(): Promise<boolean> {
  return (await AsyncStorage.getItem(WILLKOMMEN_GESEHEN_KEY)) === "1";
}

export async function setWillkommenGesehen(): Promise<void> {
  await AsyncStorage.setItem(WILLKOMMEN_GESEHEN_KEY, "1");
}

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

// --- Bonuskapitel-Fortschritt (Fesselung, Rochade, Matt in 2/3, Figurenwert, Schlossfinale) --
//
// Ergänzt (Implementierungsrunde 2026-09-08, Fesselung-Umsetzung, siehe Claude-Projekt
// "ChessLynx", priorisierter_umsetzungsplan.md): `KindProfil.bonusFortschritt` existierte im
// Datenmodell (firebase.ts) und in der Neuanlage oben schon länger, aber es gab bisher gar
// keine Funktionen, die tatsächlich hineinschreiben — dieselbe Lücke, die
// `saveQuestFortschrittLocal`/`syncPendingProgress` oben für Quest-Fortschritt schon lange
// schließen. Bewusst EIGENE Konstanten/Warteschlange statt Wiederverwendung von
// KEY_PREFIX/SYNC_QUEUE_KEY: Bonuskapitel sind reine Booleans ("abgeschlossen ja/nein"), kein
// {sterne, abgeschlossen, letzterSchritt}-Objekt wie QuestFortschritt — eine gemeinsame
// Warteschlange hätte an dieser Typ-Inkompatibilität ohnehin nichts sparen können.
type BonusKapitelId = keyof KindProfil["bonusFortschritt"];

const BONUS_KEY_PREFIX = "chesslynx:bonusFortschritt:";
const BONUS_SYNC_QUEUE_KEY = "chesslynx:bonusSyncQueue";

export async function saveBonusFortschrittLocal(kapitelId: BonusKapitelId, abgeschlossen: boolean): Promise<void> {
  await AsyncStorage.setItem(BONUS_KEY_PREFIX + kapitelId, abgeschlossen ? "1" : "0");
  const raw = await AsyncStorage.getItem(BONUS_SYNC_QUEUE_KEY);
  const queue: string[] = raw ? JSON.parse(raw) : [];
  if (!queue.includes(kapitelId)) queue.push(kapitelId);
  await AsyncStorage.setItem(BONUS_SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function loadBonusFortschrittLocal(kapitelId: BonusKapitelId): Promise<boolean> {
  const raw = await AsyncStorage.getItem(BONUS_KEY_PREFIX + kapitelId);
  return raw === "1";
}

/**
 * Gleicht die lokale Bonuskapitel-Sync-Warteschlange gegen Firestore ab — analog zu
 * `syncPendingProgress` oben, als eigener Aufruf (siehe dortiger Kommentar zur
 * Freispiel-Variante: unabhängig fehlschlagbar/wiederholbar). Wird vom ElternBereichRouter
 * aufgerufen. Schreibt gezielt nur die betroffenen `bonusFortschritt.<kapitelId>`-Felder
 * (per `merge: true`), damit gleichzeitiger Fortschritt eines anderen Bereichs (Quest/
 * Freispiel/Waldgefährten) von einem zweiten Gerät nicht überschrieben wird.
 */
export async function syncPendingBonusProgress(kindProfilPfad: string): Promise<void> {
  const raw = await AsyncStorage.getItem(BONUS_SYNC_QUEUE_KEY);
  const queue: string[] = raw ? JSON.parse(raw) : [];
  if (queue.length === 0) return;

  const bonusFortschritt: Record<string, boolean> = {};
  for (const kapitelId of queue) {
    bonusFortschritt[kapitelId] = await loadBonusFortschrittLocal(kapitelId as BonusKapitelId);
  }
  await setDoc(doc(db, kindProfilPfad), { bonusFortschritt, zuletztAktivAm: Date.now() }, { merge: true });
  await AsyncStorage.removeItem(BONUS_SYNC_QUEUE_KEY);
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
    // figurenwert ergänzt (siehe firebase.ts-Kommentar zu KindProfil.bonusFortschritt).
    bonusFortschritt: {
      fesselung: false,
      rochade: false,
      mattIn2: false,
      mattIn3: false,
      figurenwert: false,
      schlossFinale: false,
      ganzePartie: false,
    },
    screenTimeHeute: { minutenGenutzt: 0, datum: heute },
    erstelltAm: Date.now(),
    zuletztAktivAm: Date.now(),
  };
  const neuesDoc = await addDoc(kinderRef, neuesKindProfil);
  await AsyncStorage.setItem(cacheKey, neuesDoc.id);
  return neuesDoc.id;
}
