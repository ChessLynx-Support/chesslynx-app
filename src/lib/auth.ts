// Eltern-Konto-Login/-Registrierung via Firebase Authentication (E-Mail/Passwort),
// siehe technisches_konzept.md Abschnitt 2 ("Firebase Authentication ... deckt den
// Elternkonto-Login komplett ab") und Abschnitt 5 (Datenmodell: Eltern-Konto als
// Firebase-Auth-User; das Kind hat laut Design-Dokument explizit KEIN eigenes
// Login — nur einen Nickname innerhalb des Kinderprofils, siehe storage.ts).
//
// ACHTUNG: Funktioniert erst mit einem echten Firebase-Projekt (siehe firebase.ts) —
// mit der aktuellen Platzhalter-Config schlägt jeder Aufruf mit einem Firebase-
// Netzwerk-/Konfigurationsfehler fehl. Das ist beabsichtigt (kein Absturz, sondern
// ein normaler Error, den `ElternLogin.tsx` als Fehlermeldung anzeigt) — sobald ein
// echtes Projekt eingetragen ist, funktionieren Anmeldung/Registrierung ohne weitere
// Code-Änderung.

import { useEffect, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { elternEinstellungenPfad, holeAuth, holeDb } from "./firebase";
import { vergesseVorgemerktenKindNickname } from "./storage";

// Paket 5 (2026-09-11): `holeAuth()` statt einer beim App-Start erzeugten Auth-Instanz —
// Firebase startet erst, wenn eine dieser Funktionen im Eltern-Bereich aufgerufen wird
// (siehe firebase.ts).

export async function elternKontoErstellen(email: string, passwort: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(holeAuth(), email.trim(), passwort);
  // Double-Opt-In (compliance_paket_2026-09-10.md, „Email plus“): Bestätigungsmail sofort.
  // Ein Fehler hier (z. B. Netz weg) verhindert die Kontoerstellung nicht — der
  // Bestätigungs-Screen bietet „erneut senden“ an.
  try {
    await sendEmailVerification(cred.user);
  } catch (fehler) {
    console.warn("auth: Bestätigungsmail konnte nicht gesendet werden:", fehler);
  }
  return cred.user;
}

export async function elternAnmelden(email: string, passwort: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(holeAuth(), email.trim(), passwort);
  return cred.user;
}

export async function elternAbmelden(): Promise<void> {
  await signOut(holeAuth());
}

/** „Passwort vergessen?“ — Firebase verschickt die Mail (Vorlage in der Konsole). */
export async function passwortZuruecksetzen(email: string): Promise<void> {
  await sendPasswordResetEmail(holeAuth(), email.trim());
}

/** Bestätigungsmail erneut senden (nur für ein angemeldetes, noch unbestätigtes Konto). */
export async function bestaetigungsMailErneutSenden(): Promise<void> {
  const user = holeAuth().currentUser;
  if (!user) throw new Error("kein-nutzer");
  await sendEmailVerification(user);
}

/**
 * Lädt den Kontostatus neu (Firebase merkt die Bestätigung erst nach `reload`) und liefert,
 * ob die E-Mail inzwischen bestätigt ist. Erneuert zusätzlich das ID-Token, damit die
 * Firestore-Regel (`email_verified`) den neuen Stand sofort sieht.
 */
export async function emailBestaetigungPruefen(): Promise<boolean> {
  const user = holeAuth().currentUser;
  if (!user) return false;
  await reload(user);
  if (user.emailVerified) await user.getIdToken(true);
  return user.emailVerified;
}

/**
 * Double-Opt-In-Regel an EINER Stelle: Sync, Kinderprofil in der Cloud und Kauf erst mit
 * bestätigter E-Mail. Als eigene Funktion, damit Router und Tests dieselbe Logik nutzen.
 */
export function darfCloudNutzen(user: Pick<User, "emailVerified"> | null | undefined): boolean {
  return !!user && user.emailVerified === true;
}

/**
 * Löscht ein noch UNBESTÄTIGTES Konto (Apple 5.1.1(v): Löschen muss immer möglich sein, auch
 * bevor das Dashboard erreichbar ist). Ein unbestätigtes Konto hat noch kein Kinderprofil in
 * der Cloud — es gibt nur den Einwilligungs-Nachweis unter `einstellungen/dashboard`. Der
 * Spielstand auf dem Gerät bleibt, er gehörte nie zu diesem Konto.
 */
export async function unbestaetigtesKontoLoeschen(passwort: string): Promise<void> {
  const user = holeAuth().currentUser;
  if (!user || !user.email) throw new Error("kein-nutzer");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, passwort));
  await deleteDoc(doc(holeDb(), elternEinstellungenPfad(user.uid))).catch(() => {});
  await vergesseVorgemerktenKindNickname();
  await deleteUser(user);
}

/**
 * React-Hook mit dem aktuellen Anmeldestatus des Elternkontos. `loading: true` nur
 * ganz kurz beim allerersten Aufruf (Firebase liest den gespeicherten Login-Status, siehe
 * firebase.ts). Wird nur im Eltern-Bereich benutzt — dort startet Firebase.
 */
export function useAuthUser(): { loading: boolean; user: User | null } {
  const [state, setState] = useState<{ loading: boolean; user: User | null }>({
    loading: true,
    user: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(holeAuth(), (user) => {
      setState({ loading: false, user });
    });
    return unsubscribe;
  }, []);

  return state;
}
