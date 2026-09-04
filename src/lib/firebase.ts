// Firebase-Grundgerüst gemäß konzept/technisches_konzept.md, Abschnitt 2 (Spark-Plan:
// Authentication + Firestore) und Abschnitt 5 (Datenmodell).
//
// ACHTUNG: Platzhalter-Config. Vor dem ersten Start ein eigenes Firebase-Projekt anlegen
// (console.firebase.google.com, kostenloser Spark-Plan reicht laut Konzeptdokument) und
// die Werte unten durch die echten aus den Projekteinstellungen ersetzen. Niemals echte
// Keys in ein öffentliches Repo committen — für Expo üblich: über `.env` + `app.config.ts`
// statt hier hart kodiert.

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: "TODO_AUS_FIREBASE_CONSOLE",
  authDomain: "TODO.firebaseapp.com",
  projectId: "TODO",
  storageBucket: "TODO.appspot.com",
  messagingSenderId: "TODO",
  appId: "TODO",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// --- Datenmodell-Typen (1:1 aus technisches_konzept.md Abschnitt 5 übertragen) ---

export type QuestFortschritt = {
  sterne: 0 | 1 | 2 | 3;
  abgeschlossen: boolean;
  letzterSchritt: string;
};

export type KindProfil = {
  nickname: string;
  avatarWahl?: string;
  questFortschritt: Record<string, QuestFortschritt>;
  waldgefaehrtenFortschritt: Record<string, { sterne: 0 | 1 | 2 | 3; ruhmeshalle: boolean }>;
  bonusFortschritt: {
    fesselung: boolean;
    rochade: boolean;
    mattIn2: boolean;
    mattIn3: boolean;
    schlossFinale: boolean;
  };
  screenTimeHeute: { minutenGenutzt: number; datum: string };
  erstelltAm: number;
  zuletztAktivAm: number;
};

export type ElternEinstellungen = {
  taeglichesZeitlimitMinuten: number; // Standard laut Design-Dokument: 15
  einwilligungErteiltAm: number | null;
  benachrichtigungenAktiv: boolean; // Default false — nie ans Kind, siehe Design-Dokument
};
