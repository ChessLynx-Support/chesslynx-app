// Firebase-Grundgerüst gemäß konzept/technisches_konzept.md, Abschnitt 2 (Spark-Plan:
// Authentication + Firestore) und Abschnitt 5 (Datenmodell).
//
// Update (2026-09-04): Echtes Firebase-Projekt "ChessLynx" (Spark-Tarif) steht. Die
// Werte unten sind 1:1 aus Projekteinstellungen → Allgemein → Meine Apps übernommen.
// Firestore-Standort bewusst eur3 (Europa) gewählt, nicht der Vorschlagswert nam5 —
// aus Datenschutzgründen für eine Kinder-App mit Sitz/Zielgruppe in Deutschland (siehe
// datenschutz_store_pruefung.md im Claude-Projekt). E-Mail/Passwort-Anmeldung ist in
// Authentication aktiviert, die Firestore-Sicherheitsregel unten unter "Firestore-Pfade"
// ist bereits in der Konsole veröffentlicht.
//
// Hinweis für später (kein akuter Fix nötig, da Spark-Tarif + privates Repo): Für ein
// öffentliches Repo gehören diese Werte nicht hart kodiert hierher, sondern in `.env` +
// `app.config.ts` (Expo-üblich) — Firebase-Web-Config-Werte sind zwar keine Geheimnisse
// (sie werden clientseitig ohnehin ausgeliefert), aber die Trennung ist trotzdem guter Stil.

import { Platform } from "react-native";
import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  browserLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
// `getReactNativePersistence` bewusst getrennt importiert, damit die Unterdrückung genau
// diese eine Zeile trifft und nicht den ganzen Import-Block (2026-09-14, aufgefallen beim
// ersten Typecheck, der überhaupt gelaufen ist — siehe tsconfig.json):
//
// Die Funktion existiert in firebase 11.10 nur im "react-native"-Zweig der Exportkarte von
// @firebase/auth. Metro löst diesen Zweig zur Laufzeit korrekt auf, deshalb funktioniert die
// Anmeldung auf dem Gerät seit jeher. TypeScript liest dagegen die Browser-Typen, und dort
// ist sie nicht deklariert. Es ist also keine Lücke im Code — der `Platform.OS`-Zweig unten
// ist bereits richtig —, sondern eine Lücke in Firebases Typauslieferung.
//
// `@ts-expect-error` statt `@ts-ignore`: Liefert Firebase die Typen eines Tages nach, meldet
// der Typecheck die dann überflüssige Unterdrückung. Die Zeile verschwindet dadurch von
// selbst, statt für immer stillschweigend stehen zu bleiben.
// @ts-expect-error -- siehe Begründung oben
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDUjcfKb_JwtIqEeE5Y4L7ZoNwjQFgT7XI",
  authDomain: "chelynx.firebaseapp.com",
  projectId: "chelynx",
  storageBucket: "chelynx.firebasestorage.app",
  messagingSenderId: "94955044847",
  appId: "1:94955044847:web:9e314c51c4190a228d401a",
};

// Paket 5 (2026-09-11, COPPA-Grundlage, compliance_paket_2026-09-10.md Abschnitt 1):
// Firebase wird NICHT mehr beim App-Start initialisiert, sondern erst beim ersten echten
// Bedarf — und den gibt es nur im Eltern-Bereich (Login, Dashboard, Sync). Der kostenlose
// Teil (Willkommenssequenz, Quest 1–3) und überhaupt alles, was das Kind spielt, läuft damit
// ohne jede Firebase-Verbindung: kein Auth-Listener, kein Token-Refresh, keine Firestore-
// Instanz, solange kein Erwachsener den Eltern-Bereich geöffnet hat. Die Imports oben laden
// nur Code, sie bauen keine Verbindung auf.
//
// Deshalb gibt es statt der früheren Konstanten `firebaseApp`/`auth`/`db` drei Getter.
// `verify/test-konto-datenschutz.cjs` prüft, dass beim Laden der Kind-Module (Karte,
// Speicher, Gate) kein `initializeApp` passiert.
let firebaseAppInstanz: FirebaseApp | undefined;
let authInstanz: Auth | undefined;
let dbInstanz: Firestore | undefined;

export function holeFirebaseApp(): FirebaseApp {
  if (!firebaseAppInstanz) firebaseAppInstanz = initializeApp(firebaseConfig);
  return firebaseAppInstanz;
}

// React Native braucht eine explizite Persistenz-Strategie für den Login-Status —
// anders als im Web nutzt Firebase hier nicht automatisch localStorage, sonst wäre
// das Elternkonto nach jedem App-Neustart abgemeldet. `getReactNativePersistence`
// kommt aus dem "react-native"-Export-Zweig von @firebase/auth (siehe dessen
// package.json) und nutzt dieselbe AsyncStorage-Instanz wie storage.ts.
//
// Korrektur (2026-09-04, gefunden beim ersten echten Test): `getReactNativePersistence`
// darf NICHT plattformunabhängig aufgerufen werden — im Expo-Web-Build (Metro-Bundler)
// führte das zu einem sofortigen, unabgefangenen Fehler (leere/weiße Seite). Deshalb per
// `Platform.OS` unterschieden: Web nutzt Firebases eigene `browserLocalPersistence`, nur
// native (iOS/Android) nutzt `getReactNativePersistence(AsyncStorage)`.
export function holeAuth(): Auth {
  if (!authInstanz) {
    authInstanz = initializeAuth(holeFirebaseApp(), {
      persistence:
        Platform.OS === "web" ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
    });
    // Die Sprache der Firebase-Mails wird hier BEWUSST NICHT gesetzt, sondern in
    // `auth.ts` unmittelbar vor jedem Versand (`mailSpracheSetzen()`). Zwei Gründe,
    // beide am 2026-09-14 an einer echt ausgelieferten Bestätigungsmail belegt:
    //
    // 1. Hier stünde die Sprache des ERSTEN Eltern-Bereich-Besuchs fest. Stellt ein
    //    Elternteil danach im Dashboard um, bekäme es die Mail trotzdem in der alten
    //    Sprache — `holeAuth()` läuft pro App-Start nur ein einziges Mal.
    // 2. Der frühere Aufruf `useDeviceLanguage(authInstanz)` konnte das ohnehin nicht
    //    leisten. Er liest `navigator.languages[0] ?? navigator.language`, also eine
    //    Browser-Eigenschaft, die es in React Native nicht gibt: `languageCode` blieb
    //    nativ immer `null`, Firebase fiel auf die Vorlagensprache des Projekts zurück,
    //    und die stand auf Englisch. Deutsche Eltern bekamen eine englische
    //    Bestätigungsmail — und die Sprachwahl aus `lib/sprache.ts` war nie beteiligt.
  }
  return authInstanz;
}

export function holeDb(): Firestore {
  if (!dbInstanz) dbInstanz = getFirestore(holeFirebaseApp());
  return dbInstanz;
}

/** Nur für Tests/Diagnose: wurde Firebase in dieser Sitzung schon gestartet? */
export function istFirebaseGestartet(): boolean {
  return firebaseAppInstanz !== undefined;
}

// --- Firestore-Pfade (Datenmodell 1:1 aus technisches_konzept.md Abschnitt 5) ---
// Eltern-Konto (Firebase-Auth-User, UID als Dokument-ID in der Collection "eltern")
// → Subcollection "kinder" mit einem Dokument pro Kinderprofil. Für den MVP-Kern
// reicht ein aktives Kinderprofil pro Elternkonto (siehe getOrCreateAktivesKindId in
// storage.ts) — die Struktur selbst unterstützt bereits mehrere Kinder pro Familie,
// ohne dass sich an diesen Pfaden etwas ändern müsste.

export function kinderCollectionPfad(parentUid: string): string {
  return `eltern/${parentUid}/kinder`;
}

export function kindProfilPfad(parentUid: string, kindId: string): string {
  return `${kinderCollectionPfad(parentUid)}/${kindId}`;
}

// Ergänzt (2026-09-06) für das ParentDashboard: Pfad für die Eltern-Einstellungen
// (Zeitlimit-Normwert zur Anzeige, Einwilligungs-Nachweis, Benachrichtigungen — siehe
// ElternEinstellungen unten und lib/elternEinstellungen.ts). Bewusst NICHT direkt auf
// `eltern/{parentUid}` selbst, sondern eine Ebene tiefer in einer eigenen Subcollection
// ("einstellungen/dashboard") — damit der Zugriff zweifelsfrei von der bereits in der
// Firebase-Konsole veröffentlichten Regel abgedeckt ist (siehe Kommentar weiter unten):
// `{document=**}` verlangt mindestens ein weiteres Pfadsegment unter `eltern/{parentUid}`,
// ein Dokument direkt auf diesem Pfad wäre damit nicht zweifelsfrei erfasst.
export function elternEinstellungenPfad(parentUid: string): string {
  return `eltern/${parentUid}/einstellungen/dashboard`;
}

// Firestore-Sicherheitsregel — bereits am 2026-09-04 in der Firebase-Konsole unter
// "Firestore Database" → "Regeln" veröffentlicht (kein Teil dieses Grundgerüsts, Regeln
// werden in der Konsole gepflegt, nicht im App-Code — hier nur zur Dokumentation, damit
// klar ist, warum Zugriffe außerhalb des eigenen Elternkontos mit "permission-denied"
// fehlschlagen, was so beabsichtigt ist):
//
//   match /eltern/{parentUid}/{document=**} {
//     allow read, write: if request.auth != null && request.auth.uid == parentUid;
//   }

// --- Datenmodell-Typen (1:1 aus technisches_konzept.md Abschnitt 5 übertragen) ---

export type QuestFortschritt = {
  sterne: 0 | 1 | 2 | 3;
  abgeschlossen: boolean;
  letzterSchritt: string;
};

// Fortschritt im neuen "Freispiel"-Übungsmodus (Übungslichtung, siehe
// endlosmodus_freispiel_konzept.md, ergänzt 2026-09-06) — bewusst ein eigenes,
// unabhängiges Feld, NICHT dasselbe wie `waldgefaehrtenFortschritt` oben: Letzteres
// gehört zur narrativen Waldgefährten-Kampagne (5 Königreiche + Wisent,
// 1-3-Sterne-Progression, Ruhmeshalle), Freispiel ist der davon unabhängige,
// nicht-narrative Übungsmodus mit den 16 Bot-Elo-Stufen aus lib/waldfreundeBot.ts.
// Da diese Stufen strikt linear freigeschaltet werden, genügt die höchste erreichte
// Elo-Zahl als vollständiger Zustand — siehe lib/freispielFortschritt.ts.
export type FreispielFortschritt = {
  hoechsteFreigeschalteteElo: number;
};

export type KindProfil = {
  nickname: string;
  avatarWahl?: string;
  questFortschritt: Record<string, QuestFortschritt>;
  waldgefaehrtenFortschritt: Record<string, { sterne: 0 | 1 | 2 | 3; ruhmeshalle: boolean }>;
  freispielFortschritt: FreispielFortschritt;
  bonusFortschritt: {
    fesselung: boolean;
    rochade: boolean;
    mattIn2: boolean;
    mattIn3: boolean;
    // Ergänzt (Implementierungsrunde 2026-09-08, Fesselung-Umsetzung): fehlte bisher noch —
    // das Feld wurde erst NACH figurenwert als fünftes Bonuskapitel beschlossen (siehe
    // Claude-Projekt "ChessLynx", priorisierter_umsetzungsplan.md), bonusFortschritt war zu
    // dem Zeitpunkt aber schon angelegt. Reine Datenmodell-Nachrüstung, kein Verhaltens-
    // unterschied für die bereits vorhandenen vier Felder.
    figurenwert: boolean;
    schlossFinale: boolean;
    // Paket 3 (2026-09-11): Kapitel „Die ganze Partie" an der Steinbrücke — optional, weil
    // bestehende Kinderprofile das Feld noch nicht haben (fehlt = noch nicht gespielt).
    ganzePartie?: boolean;
    // Update-1-Vorzug (2026-09-15): Wisent-Boss-Puzzle (Pflicht-Herzstück des Wisent-Kampfs,
    // siehe chessEngine.ts/WISENT_BOSS_POSITION-Kommentar) — genau wie `ganzePartie` optional,
    // weil bestehende Profile das Feld noch nicht kennen. Die drei optionalen Kürs
    // (Bauernumwandlung/En passant/Matt in 3 als Kür) sind bewusst NICHT hier mit abgebildet —
    // sie sind laut Konzept nicht gate-pflichtig und noch nicht verdrahtet (siehe
    // endlosmodus_verdrahtung_2026-09-15.md-Nachfolgedokument für den Stand).
    wisentKampf?: boolean;
    // Wisent-Kür-Runde (2026-09-15, Nachtrag zu obigem Kommentar): die drei optionalen Kürs
    // sind jetzt doch verdrahtet (siehe screens/WisentKuerHub.tsx) — `mattIn3` existierte
    // dafür bereits (s. o.), hier kommen die beiden NEUEN Kürs dazu. Genau wie `wisentKampf`
    // optional, aus demselben Grund (bestehende Profile kennen die Felder noch nicht).
    umwandlung?: boolean;
    enPassant?: boolean;
  };
  screenTimeHeute: { minutenGenutzt: number; datum: string };
  erstelltAm: number;
  zuletztAktivAm: number;
};

// Versionsnummer des Einwilligungstextes (Datenschutzerklärung/Nutzungsbedingungen),
// wie im ParentDashboard-Entwurf (Abschnitt "Datenschutz & Einwilligung") vorgesehen.
// Bei jeder inhaltlichen Änderung dieser Dokumente hochzählen — weicht die gespeicherte
// `einwilligungVersion` eines Elternkontos von diesem Wert ab, muss laut Entwurf erneut
// aktiv zugestimmt werden (Re-Consent-Flow), nicht nur eine Kenntnisnahme-Meldung.
export const CONSENT_VERSION = "1.0";

// Paket 5 (2026-09-11, compliance_paket_2026-09-10.md Abschnitt 1): Version des COPPA-
// Elternhinweises (Direct Notice — was erhoben wird, wofür, keine Weitergabe, Rechte auf
// Einsicht/Löschung). Wird bei Registrierung und bei jeder erneuten Einwilligung mit
// protokolliert, getrennt von CONSENT_VERSION, weil sich die beiden Texte unabhängig ändern
// können (z. B. nach der Fachperson-Prüfung nur der US-Hinweis).
export const COPPA_HINWEIS_VERSION = "1.0";

export type ElternEinstellungen = {
  taeglichesZeitlimitMinuten: number; // Standard laut Design-Dokument: 15
  einwilligungErteiltAm: number | null;
  // Ergänzt 2026-09-06 für den im ParentDashboard-Entwurf beschriebenen Re-Consent-Flow
  // (siehe CONSENT_VERSION oben) — ohne dieses Feld ließe sich eine künftige
  // Text-/Rechtsänderung nicht von der ursprünglichen Einwilligung unterscheiden.
  einwilligungVersion: string | null;
  // Paket 5: COPPA-Hinweis-Version zum Zeitpunkt der Einwilligung (fehlt bei älteren Konten).
  coppaHinweisVersion?: string | null;
  benachrichtigungenAktiv: boolean; // Default false — nie ans Kind, siehe Design-Dokument
  // Ergänzt (2026-09-09, Monetarisierung/IAP-Vorbereitung, siehe Claude-Projekt
  // "ChessLynx", monetarisierung_iap_technische_recherche_2026-09-09.md): Freischaltungs-
  // status für den vollständigen Lernpfad (Quest 4–6 + alle Bonuskapitel). Bewusst HIER
  // auf Elternkonto-Ebene statt im KindProfil, gemäß der bereits getroffenen Entscheidung
  // "Kauf gilt pro Elternkonto, für alle Kinderprofile darin" (2026-09-06, siehe
  // projektwissen_verlauf.md) — ein zweites Kinderprofil im selben Konto braucht keinen
  // zweiten Kauf. Wird NIE vom Client selbst auf `true` gesetzt, sondern ausschließlich
  // von der Cloud Function `verifyPurchase` (siehe functions/src/index.ts) nach
  // erfolgreicher serverseitiger Quittungsprüfung — alles andere wäre clientseitig
  // manipulierbar. Siehe lib/kauf.ts für die Kaufabwicklung.
  vollstaendigerLernpfadFreigeschaltet: boolean;
  // Zeitpunkt der Freischaltung, analog zu einwilligungErteiltAm oben — nur zur Anzeige
  // im ParentDashboard ("freigeschaltet am ..."), keine Zugriffslogik hängt daran.
  freischaltungAm: number | null;
};
