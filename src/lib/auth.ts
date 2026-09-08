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
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export async function elternKontoErstellen(email: string, passwort: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), passwort);
  return cred.user;
}

export async function elternAnmelden(email: string, passwort: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), passwort);
  return cred.user;
}

export async function elternAbmelden(): Promise<void> {
  await signOut(auth);
}

/**
 * React-Hook mit dem aktuellen Anmeldestatus des Elternkontos. `loading: true` nur
 * ganz kurz beim allerersten Aufruf nach App-Start (Firebase liest den über
 * `getReactNativePersistence` gespeicherten Login-Status aus AsyncStorage, siehe
 * firebase.ts) — danach ist `user` immer sofort aktuell, auch über signOut/signIn
 * hinweg, ohne dass Screens sich manuell neu abonnieren müssen.
 */
export function useAuthUser(): { loading: boolean; user: User | null } {
  const [state, setState] = useState<{ loading: boolean; user: User | null }>({
    loading: true,
    user: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ loading: false, user });
    });
    return unsubscribe;
  }, []);

  return state;
}
