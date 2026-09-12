// Lese-/Schreibfunktionen für das Eltern-Einstellungen-Dokument in Firestore
// (Zeitlimit-Normwert zur Anzeige, Einwilligungs-Nachweis, Benachrichtigungen) —
// siehe das Datenmodell in firebase.ts (`ElternEinstellungen`, `elternEinstellungenPfad`)
// und den ParentDashboard-Entwurf, Abschnitte "Zeitlimit" und "Datenschutz & Einwilligung".
//
// Bewusst getrennt von der eigentlichen, lokal durchgesetzten Zeitlimit-Sperre (siehe
// zeitlimit.ts): Dieses Dokument ist der Firestore-seitige Sync-/Nachweis-Stand (u. a.
// für die serverseitige Consent-Protokollierung, laut datenschutz_store_pruefung.md
// launch-relevant) — die Sperre selbst bleibt laut Entscheidung vom 2026-09-06 bewusst
// rein lokal ("harte Sperre, lokal durchgesetzt").

import { doc, getDoc, setDoc } from "firebase/firestore";
import { holeDb, elternEinstellungenPfad, type ElternEinstellungen } from "./firebase";

const STANDARD_EINSTELLUNGEN: ElternEinstellungen = {
  taeglichesZeitlimitMinuten: 15,
  einwilligungErteiltAm: null,
  einwilligungVersion: null,
  benachrichtigungenAktiv: false,
  // Ergänzt 2026-09-09 (Monetarisierung/IAP-Vorbereitung) — siehe Kommentar bei der
  // Typdefinition in firebase.ts.
  vollstaendigerLernpfadFreigeschaltet: false,
  freischaltungAm: null,
};

/**
 * Lädt die Eltern-Einstellungen aus Firestore. Existiert noch kein Dokument (z. B.
 * direkt nach der Registrierung, bevor die erste Einwilligung erfasst wurde), werden
 * die dokumentierten Standardwerte zurückgegeben, ohne dass dafür bereits ein
 * Firestore-Dokument angelegt wird — das passiert erst beim ersten echten Schreiben.
 */
export async function ladeElternEinstellungen(parentUid: string): Promise<ElternEinstellungen> {
  const snap = await getDoc(doc(holeDb(), elternEinstellungenPfad(parentUid)));
  if (!snap.exists()) return { ...STANDARD_EINSTELLUNGEN };
  return { ...STANDARD_EINSTELLUNGEN, ...(snap.data() as Partial<ElternEinstellungen>) };
}

/**
 * Schreibt eine (Teil-)Änderung der Eltern-Einstellungen nach Firestore (`merge: true`,
 * damit z. B. das Bestätigen der Einwilligung nicht versehentlich einen zuvor
 * gespeicherten Zeitlimit-Wert überschreibt).
 */
export async function speichereElternEinstellungen(
  parentUid: string,
  aenderung: Partial<ElternEinstellungen>
): Promise<void> {
  await setDoc(doc(holeDb(), elternEinstellungenPfad(parentUid)), aenderung, { merge: true });
}
