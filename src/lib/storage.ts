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
import { holeDb, kinderCollectionPfad } from "./firebase";
// Ergänzt 2026-09-06: Startwert für das neue freispielFortschritt-Feld unten
// (KindProfil verlangt es jetzt als Pflichtfeld, siehe firebase.ts) — Single Source of
// Truth für "welche Elo-Stufe ist die erste/leichteste" bleibt waldfreundeBot.ts.
import { ersteStufe } from "./waldfreundeBot";
import { GANZE_PARTIE_ETAPPE_KEY } from "./ganzePartieStand";
// Wisent-Endspiel-Kür (2026-09-17, siehe Abschnitt weiter unten und Import-Kommentar bei
// `holeUndSchalteMattIn3Versatz`): nur der Schlüssel wird importiert (für
// `istSpielstandSchluessel` unten), nicht die Lese-/Schreibfunktionen selbst — die liegen
// bewusst in wisentEndspielFortschritt.ts und importieren NICHT aus storage.ts zurück (kein
// Zirkelbezug zwischen den beiden Modulen, siehe dortiger Kopfkommentar).
import { WISENT_ENDSPIEL_FORTSCHRITT_KEY } from "./wisentEndspielFortschritt";

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
        doc(holeDb(), kindProfilPfad),
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
  await setDoc(doc(holeDb(), kindProfilPfad), { bonusFortschritt, zuletztAktivAm: Date.now() }, { merge: true });
  await AsyncStorage.removeItem(BONUS_SYNC_QUEUE_KEY);
}

// --- Wisent-Kür-Hub: Wiederholungs-Variante (2026-09-15) ------------------------------------
//
// Sowohl die Umwandlungs- als auch die En-passant-Kür haben laut Konzept
// (`gefaehrten_wisent_lichess_sprechtexte_final.md`, Abschnitt 4, "Wiederholungs-Hinweis bei
// bereits abgeschlossener Kür") zwei Stellungs-Varianten ("hauptstellung"/"variante2" in
// chessEngine.ts) — beim zweiten und jedem weiteren Besuch soll abwechselnd die jeweils
// ANDERE Variante gezeigt werden ("vielleicht sieht es diesmal ein kleines bisschen anders
// aus"), nicht bei jedem Besuch dieselbe. Ein einziger gemeinsamer Mechanismus für beide
// Kürs, parametrisiert über `kuerId` — dieselbe Idee wie BONUS_KEY_PREFIX oben, nur mit
// einem 1|2-Wert statt einem Boolean.
const KUER_VARIANTE_KEY_PREFIX = "chesslynx:kuerVariante:";

/**
 * Liefert die für DIESEN Besuch zu zeigende Variante (1 oder 2) und merkt sich zugleich die
 * jeweils ANDERE für den nächsten Aufruf — ein Aufruf pro Besuch der Kür genügt also. Erster
 * jemals erfolgter Aufruf liefert immer 1 (Hauptstellung), jeder folgende wechselt.
 */
export async function holeUndSchalteKuerVariante(kuerId: "umwandlung" | "enPassant"): Promise<1 | 2> {
  const raw = await AsyncStorage.getItem(KUER_VARIANTE_KEY_PREFIX + kuerId);
  const aktuelle: 1 | 2 = raw === "2" ? 2 : 1;
  const naechste: 1 | 2 = aktuelle === 1 ? 2 : 1;
  await AsyncStorage.setItem(KUER_VARIANTE_KEY_PREFIX + kuerId, String(naechste));
  return aktuelle;
}

// --- Matt in 3: rotierender Fenster-Versatz über den 5er-Rätsel-Pool (2026-09-17) ----------
//
// Matt-in-3-Pool-Erweiterung 3 -> 5 (siehe claude/wisent_endspiel_kuer_kuratierung_
// 2026-09-17.md Abschnitt 2 und bonus/MattIn3.tsx/RAETSEL_REIHENFOLGE-Kommentar): Christians
// Entscheidung bei Rückfrage 2026-09-17 war "rotierender Fenster-Versatz" statt eines echten
// Zufalls — verallgemeinert exakt das Prinzip von `holeUndSchalteKuerVariante` oben (dort ein
// 1|2-Umschalter, hier ein 0-4-Zähler, der bei jedem Aufruf um eins weiterrückt und dabei
// zyklisch bei 0 wieder beginnt). Der erste jemals erfolgte Aufruf liefert 0 — das entspricht
// exakt der bisherigen festen Reihenfolge (Turmleiter -> Dame-und-Turm -> Reduziert), bestehende
// Spielstände sehen also beim allernächsten Besuch noch dieselben drei Rätsel wie bisher.
const MATT_IN_3_VERSATZ_KEY = "chesslynx:mattIn3Versatz";

export async function holeUndSchalteMattIn3Versatz(): Promise<0 | 1 | 2 | 3 | 4> {
  const raw = await AsyncStorage.getItem(MATT_IN_3_VERSATZ_KEY);
  const aktuelle = (raw ? Number(raw) : 0) as 0 | 1 | 2 | 3 | 4;
  const naechste = (((aktuelle + 1) % 5) as 0 | 1 | 2 | 3 | 4);
  await AsyncStorage.setItem(MATT_IN_3_VERSATZ_KEY, String(naechste));
  return aktuelle;
}

// "Alle drei erledigt"-Sonderzeile im Hub (Konzept Abschnitt 4) ist ausdrücklich "einmalig" —
// dasselbe Flag-Prinzip wie WILLKOMMEN_GESEHEN_KEY oben, nur für diesen einen Moment.
const WISENT_KUER_ALLE_DREI_GEZEIGT_KEY = "chesslynx:wisentKuerAlleDreiGezeigt";

export async function wisentKuerAlleDreiGezeigt(): Promise<boolean> {
  return (await AsyncStorage.getItem(WISENT_KUER_ALLE_DREI_GEZEIGT_KEY)) === "1";
}

export async function setWisentKuerAlleDreiGezeigt(): Promise<void> {
  await AsyncStorage.setItem(WISENT_KUER_ALLE_DREI_GEZEIGT_KEY, "1");
}

// "Auftritt an der Wisentfeste" (W1_kopf_heben, siehe claude/wisent_kopf_heben_geometrisch_
// 2026-09-14.md, Nachtrag 2026-09-16) — derselbe Zweck wie WISENT_KUER_ALLE_DREI_GEZEIGT_KEY
// oben: Der Wisent-Torwächter auf der Karte (LuchsRevierKarte.tsx) hebt beim allerersten Mal,
// das er antippbar wird (Wolf-Revier gerade abgeschlossen), einmalig Kopf und Hals — App-
// seitige Bewegungskopplung (Überblendung S0 → W1 + translateY) zur an sich sehr kleinen
// Posenänderung, siehe Empfehlung im Dokument oben. Danach bleibt W1 der dauerhafte
// Ruhezustand (kein Zurückfallen auf S0), nur die einmalige Animation selbst soll sich nicht
// bei jedem Kartenbesuch wiederholen.
const WISENT_AUFTRITT_GEZEIGT_KEY = "chesslynx:wisentAuftrittGezeigt";

export async function wisentAuftrittGezeigt(): Promise<boolean> {
  return (await AsyncStorage.getItem(WISENT_AUFTRITT_GEZEIGT_KEY)) === "1";
}

export async function setWisentAuftrittGezeigt(): Promise<void> {
  await AsyncStorage.setItem(WISENT_AUFTRITT_GEZEIGT_KEY, "1");
}

// --- Ruhmeshalle: Rangaufstiegs-Funkeln (2026-09-15, E5) -----------------------------------
//
// "Rangaufstieg" (E5) hat laut e3_e5_produktionsauftraege_2026-09-15.md Option A: kein neues
// Bild, sondern derselbe Funkeln-Effekt (components/Funkeln.tsx), einmalig beim Übertritt
// eines Gefährten (bzw. des Wisents) in die Ruhmeshalle. Bewusst EIN persistiertes
// "schon gefeiert"-Set statt eines reinen Vorher/Nachher-Vergleichs innerhalb der Komponente
// (wie beim Zwinkern-Auslöser in Revier.tsx): Ruhmeshalle.tsx lädt den Gradierungsstand bei
// jedem `useFocusEffect` frisch, aber gerade der ALLERERSTE Besuch nach der Graduierung soll
// trotzdem funkeln — ein Komponenten-interner Vergleich hätte keinen Baseline-Wert von VOR
// diesem ersten Laden und würde genau diesen wichtigsten Moment verpassen. Analog
// WISENT_KUER_ALLE_DREI_GEZEIGT_KEY oben, nur als Set von Gefährten-IDs statt eines einzelnen
// Flags.
const RUHMESHALLE_GEFEIERT_KEY = "chesslynx:ruhmeshalleGefeiert";

/**
 * Nimmt die aktuell gradierten Gefährten-/Wisent-IDs entgegen, markiert alle noch nicht
 * gefeierten davon als gefeiert (persistiert) und gibt genau die zurück, die JETZT neu
 * hinzugekommen sind — das sind die, für die `Ruhmeshalle.tsx` einmalig funkeln soll.
 */
export async function holeUndMarkiereRangaufstiege(gradierteIds: string[]): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RUHMESHALLE_GEFEIERT_KEY);
  const bereitsGefeiert: string[] = raw ? JSON.parse(raw) : [];
  const neu = gradierteIds.filter((id) => !bereitsGefeiert.includes(id));
  if (neu.length > 0) {
    await AsyncStorage.setItem(RUHMESHALLE_GEFEIERT_KEY, JSON.stringify([...bereitsGefeiert, ...neu]));
  }
  return neu;
}

// --- Gefährten-Reviere: Reihenfolge-Freischaltung (2026-09-15) -----------------------------
//
// Christian-Befund beim Testen: "Die Gefährten sind auch bei vollem Nebel nicht vom Nebel
// verdeckt" — Ursache war, dass `onSelectGefaehrte`/`onSelectWisent` in RootNavigator.tsx
// bedingungslos übergeben wurden, wodurch in LuchsRevierKarte.tsx ALLE Reviere gleichzeitig
// als "offen" galten (siehe claude/weisse_scheibe_oberland_fix_2026-09-15_final.md). Gewollt
// laut Christian: "Die Gefährten sollen der Reihe nach sichtbar werden, beginnend nachdem das
// Revier freigeschaltet wurde" — konkretisiert per Rückfrage: das jeweils NÄCHSTE Revier wird
// sichtbar, sobald das vorherige einmal besucht wurde (Screen geöffnet, nicht erst bei vollen
// Endlosmodus-Sternen); das allererste (Eichhörnchen) ist von Anfang an offen.
//
// Bewusst ein einfaches Set von IDs statt eines Zählers — robust auch dann, wenn Reviere
// (aus welchem Grund auch immer) nicht streng in der Standardreihenfolge besucht werden;
// `LuchsRevierKarte.tsx` prüft pro Revier nur "wurde der jeweilige VORGÄNGER schon besucht",
// nicht eine absolute Zahl.
const GEFAEHRTEN_BESUCHT_KEY = "chesslynx:gefaehrtenBesucht";

export async function holeBesuchteReviere(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(GEFAEHRTEN_BESUCHT_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

/** Markiert ein Revier als besucht — idempotent, beliebig oft aufrufbar (z. B. bei jedem
 *  Fokussieren von Revier.tsx). */
export async function markiereRevierBesucht(gefaehrteId: string): Promise<void> {
  const bisherige = await holeBesuchteReviere();
  if (bisherige.includes(gefaehrteId)) return;
  await AsyncStorage.setItem(GEFAEHRTEN_BESUCHT_KEY, JSON.stringify([...bisherige, gefaehrteId]));
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

  const kinderRef = collection(holeDb(), kinderCollectionPfad(parentUid));
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

// --- Paket 5 (2026-09-11): Double-Opt-In und Kontolöschung -----------------------------------

// Der Kind-Nickname aus dem Registrieren-Formular wird erst NACH der E-Mail-Bestätigung in die
// Cloud geschrieben (Kinderdaten erst mit bestätigtem Elternkonto, COPPA „Email plus“). Bis
// dahin liegt er nur auf diesem Gerät — sonst ginge er verloren, weil zwischen Registrierung
// und Bestätigung der Bestätigungs-Screen liegt (Routenparameter überleben das nicht).
const NICKNAME_VORGEMERKT_KEY = "chesslynx:kindNicknameVorgemerkt";

export async function merkeKindNicknameVor(nickname: string): Promise<void> {
  if (nickname.trim()) await AsyncStorage.setItem(NICKNAME_VORGEMERKT_KEY, nickname.trim());
}

export async function holeVorgemerktenKindNickname(): Promise<string | undefined> {
  return (await AsyncStorage.getItem(NICKNAME_VORGEMERKT_KEY)) ?? undefined;
}

export async function vergesseVorgemerktenKindNickname(): Promise<void> {
  await AsyncStorage.removeItem(NICKNAME_VORGEMERKT_KEY);
}

/** Alle lokalen Schlüssel, die zum Spielstand des Kindes auf diesem Gerät gehören. */
export function istSpielstandSchluessel(k: string): boolean {
  return (
    k === WILLKOMMEN_GESEHEN_KEY ||
    k === GANZE_PARTIE_ETAPPE_KEY ||
    k === WISENT_KUER_ALLE_DREI_GEZEIGT_KEY ||
    k === WISENT_AUFTRITT_GEZEIGT_KEY ||
    k === RUHMESHALLE_GEFEIERT_KEY ||
    k === GEFAEHRTEN_BESUCHT_KEY ||
    k === MATT_IN_3_VERSATZ_KEY ||
    k === WISENT_ENDSPIEL_FORTSCHRITT_KEY ||
    k.startsWith(KEY_PREFIX) ||
    k.startsWith(BONUS_KEY_PREFIX) ||
    k.startsWith(KUER_VARIANTE_KEY_PREFIX) ||
    k.startsWith("chesslynx:freispielFortschritt:") ||
    k.startsWith("chesslynx:freispiel:") ||
    // Korrektur (2026-09-17, im Zuge der Wisent-Endspiel-Kür-Umsetzung gefunden): der
    // Endlosmodus-Fortschritt (lib/endlosmodusFortschritt.ts, Schlüssel
    // "chesslynx:endlosmodusFortschritt:v2" und "...:syncAusstehend") fehlte hier bisher
    // komplett — seit dessen Einführung am 2026-09-15 wäre er von "Lokalen Spielstand löschen"
    // (Kontolöschung/"Neu beginnen") NIE erfasst worden. Reine Nachrüstung eines bestehenden
    // Lecks, keine Verhaltensänderung für die hier neu hinzugefügten Schlüssel.
    k.startsWith("chesslynx:endlosmodusFortschritt:") ||
    k === SYNC_QUEUE_KEY ||
    k === BONUS_SYNC_QUEUE_KEY
  );
}

/** Löscht den Spielstand auf diesem Gerät (Quests, Bonus, Freispiel, Willkommen, Warteschlangen). */
export async function lokalenSpielstandLoeschen(): Promise<void> {
  const zuLoeschen = (await AsyncStorage.getAllKeys()).filter(istSpielstandSchluessel);
  if (zuLoeschen.length > 0) await AsyncStorage.multiRemove(zuLoeschen);
}

/**
 * Kontolöschung (Apple 5.1.1(v), COPPA-Löschanspruch): entfernt alles, was auf diesem Gerät
 * an das gelöschte Konto gebunden ist — Kind-ID-Cache, vorgemerkter Nickname — und den
 * lokalen Spielstand, damit „alle Daten löschen“ auch auf dem Gerät gilt und nichts davon
 * später in ein neues Konto hochgeladen wird. Eltern-Einstellungen, die nur das Gerät
 * betreffen (Zeitlimit, Untertitel, Stimme), bleiben.
 */
export async function kontoBezogeneLokaleDatenLoeschen(parentUid: string): Promise<void> {
  await AsyncStorage.multiRemove([AKTIVES_KIND_ID_KEY_PREFIX + parentUid, NICKNAME_VORGEMERKT_KEY]);
  await lokalenSpielstandLoeschen();
}
