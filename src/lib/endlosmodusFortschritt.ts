// Sterne-Fortschrittsspeicherung für die Waldgefährten-Kampagne/Endlosmodus (siehe
// claude/projektwissen.md, "Noch nicht gebaut, weiterhin offen: ... Sterne-Fortschritts-
// speicherung für die Kampagne, analog zum bereits bestehenden freispielFortschritt.ts-
// Muster — existiert für die Kampagne noch nicht"). Genau dieses Muster wird hier
// nachgebaut: offline-first, lokal sofort speichern (siehe storage.ts), Sync nach
// Firestore als eigener, unabhängiger Schritt.
//
// WICHTIG, nicht verwechseln (dieselbe Abgrenzung wie in freispielFortschritt.ts):
// - `waldgefaehrtenFortschritt` in firebase.ts (KindProfil) ist ein EINZELNER Sternewert
//   0-3 pro Gefährte plus ein `ruhmeshalle`-Flag — gedacht als der synchronisierte,
//   kompakte Gesamtstand für Eltern-Dashboard/Ruhmeshalle.
// - Dieses Modul hier führt zusätzlich Buch pro FOKUS-SPALTE (ein Revier kann mehrere
//   Spalten haben, z. B. die Dachshöhle mit "Figur gewinnen" + "Schach lösen" + "Rochade")
//   und pro einzelner der drei Sterne-Stellungen darin — das feinere Detail, aus dem sich
//   der kompakte waldgefaehrtenFortschritt-Wert ableiten lässt (siehe sterneFuerGefaehrte).
//
// Firestore-Sync für dieses feinere Detail ist bewusst noch NICHT gebaut (siehe TODO unten)
// — das Offline-first-Prinzip ist damit erfüllt (das Kind spielt sofort weiter, nichts geht
// verloren), nur der geräteübergreifende Abgleich fehlt noch. Das entspricht exakt dem
// Punkt, den Christian mit "prüfen und ggf. aktualisieren" angestoßen hat: siehe
// claude/endlosmodus_verdrahtung_2026-09-15.md für den vollständigen Stand.
//
// Nachtrag (2026-09-17, Christian: "10x Stufe eins ..., 8x Stufe zwei, 5x Stufe drei" für
// "Figur gewinnen", siehe claude/taktik_schwierigkeitseskalation_konzept_2026-09-16.md):
// `SpalteFortschritt` ist jetzt ein Wahrheitswert PRO EINZELAUFGABE (variable Länge statt
// starrem Dreier-Tupel) — die eigentliche Stufen-/Sterne-Auswertung liegt in
// endlosmodusStufen.ts (reines TS-Modul ohne AsyncStorage-Import, siehe dortiger Kommentar,
// warum das eine eigene Datei ist). Speicherschlüssel bewusst auf v2 angehoben: unter v1
// bedeutete Index 0/1/2 "Stern 1/2/3 der alten Drei-Aufgaben-Fassung" — für die beiden jetzt
// eskalierten Spalten wäre das unter der neuen Bedeutung ("Stufe-1-Aufgabe 1/2/3 von 10")
// schlicht falsch. Die App ist vor dem Launch, betroffen ist nur Christians eigener
// Testfortschritt auf dem Gerät (geht durch den Schlüsselwechsel einmalig zurück auf 0).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { spaltenFuerGefaehrte, type EndlosmodusSpalteId } from "./endlosmodusSpalten";
import type { GefaehrteId } from "./gefaehrtenZustaende";
import {
  gesamtAnzahlAufgaben,
  naechsteOffeneAufgabe,
  sterneAusFortschritt,
  stufenFuerSpalte,
} from "./endlosmodusStufen";

const LOKALER_SCHLUESSEL = "chesslynx:endlosmodusFortschritt:v2";
const SYNC_AUSSTEHEND_SCHLUESSEL = "chesslynx:endlosmodusFortschritt:syncAusstehend";

/** Ein Wahrheitswert PRO AUFGABE der Spalte, Index 0 = erste Aufgabe (siehe Reihenfolge in
 *  endlosmodusAufgaben.tsx) — bei den fünf klassischen Spalten weiterhin drei Einträge, bei
 *  den eskalierten "Figur gewinnen"-Spalten 23 (siehe endlosmodusStufen.ts). */
export type SpalteFortschritt = boolean[];
export type EndlosmodusFortschritt = Partial<Record<EndlosmodusSpalteId, SpalteFortschritt>>;

export async function ladeEndlosmodusFortschritt(): Promise<EndlosmodusFortschritt> {
  const roh = await AsyncStorage.getItem(LOKALER_SCHLUESSEL);
  return roh ? (JSON.parse(roh) as EndlosmodusFortschritt) : {};
}

/**
 * Meldet, dass eine einzelne Aufgabe (per Index innerhalb ihrer Spalte, siehe Reihenfolge in
 * endlosmodusAufgaben.tsx) gelöst wurde. Bewusst weiterhin ohne Reihenfolge-Zwang beim
 * SPEICHERN selbst (jeder Index einzeln, in beliebiger Reihenfolge, setzbar) — wie beim
 * Freispiel-Modus beliebig oft wiederholbar, kein Verlust-Malus, siehe
 * endlosmodus_freispiel_konzept.md. Ob eine STUFE als abgeschlossen gilt (und damit ein
 * Stern vergeben wird), entscheidet allein sterneAusFortschritt in endlosmodusStufen.ts.
 */
export async function meldeAufgabeGeloest(
  spalteId: EndlosmodusSpalteId,
  aufgabenIndex: number
): Promise<EndlosmodusFortschritt> {
  const aktuell = await ladeEndlosmodusFortschritt();
  const spalte: SpalteFortschritt = aktuell[spalteId] ? [...aktuell[spalteId]!] : [];
  spalte[aufgabenIndex] = true;
  const neu: EndlosmodusFortschritt = { ...aktuell, [spalteId]: spalte };
  await AsyncStorage.setItem(LOKALER_SCHLUESSEL, JSON.stringify(neu));
  await AsyncStorage.setItem(SYNC_AUSSTEHEND_SCHLUESSEL, "1");
  return neu;
}

export function sterneInSpalte(fortschritt: EndlosmodusFortschritt, spalteId: EndlosmodusSpalteId): 0 | 1 | 2 | 3 {
  const spalte = fortschritt[spalteId] ?? [];
  return sterneAusFortschritt(spalte, stufenFuerSpalte(spalteId));
}

/** Index der nächsten offenen Aufgabe dieser Spalte (siehe endlosmodusStufen.ts,
 *  naechsteOffeneAufgabe) — Grundlage für "dort weitermachen, wenn man aussteigt"
 *  (Christian 2026-09-16 spät abends) in EndlosmodusSpalte.tsx. */
export function naechsteOffeneAufgabeInSpalte(
  fortschritt: EndlosmodusFortschritt,
  spalteId: EndlosmodusSpalteId
): number {
  const spalte = fortschritt[spalteId] ?? [];
  const stufen = stufenFuerSpalte(spalteId);
  return naechsteOffeneAufgabe(spalte, gesamtAnzahlAufgaben(stufen));
}

/**
 * Kompakter 0-3-Gesamtwert für einen Gefährten, geeignet für das bestehende
 * `waldgefaehrtenFortschritt`-Feld (KindProfil, firebase.ts) — Mittelwert der erreichten
 * Sterne über alle SPIELBAREN Spalten dieses Gefährten, gerundet. Spalten mit status
 * "folgt" (siehe endlosmodusSpalten.ts) zählen bewusst nicht mit, solange sie nicht
 * spielbar sind, damit ein Revier nicht künstlich niedriger erscheint, als es aktuell
 * tatsächlich spielbar ist.
 */
export function sterneFuerGefaehrte(gefaehrteId: GefaehrteId, fortschritt: EndlosmodusFortschritt): 0 | 1 | 2 | 3 {
  const spielbar = spaltenFuerGefaehrte(gefaehrteId).filter((s) => s.status === "bereit");
  if (spielbar.length === 0) return 0;
  const summe = spielbar.reduce((acc, s) => acc + sterneInSpalte(fortschritt, s.id), 0);
  return Math.round(summe / spielbar.length) as 0 | 1 | 2 | 3;
}

/**
 * Ein Revier gilt als abgeschlossen, wenn ALLE seine (spielbaren) Spalten alle drei Sterne
 * erreicht haben — siehe projektwissen.md: "ein Revier öffnet sich erst, wenn das vorherige
 * alle drei Sterne in ALLEN seinen Aufgaben erreicht hat". Für die Revier-zu-Revier-
 * Freischaltung selbst (welches Revier als Nächstes "offen" statt "gesperrt" ist) ist dies
 * der Baustein, den LuchsRevierKarte.tsx auswerten kann, sobald diese Verdrahtung ansteht —
 * aktuell sind alle fünf Reviere bewusst gleichzeitig erreichbar (siehe Revier.tsx-
 * Kommentar), diese Funktion wird also erst mit der nächsten Ausbaustufe zur
 * Freischalt-Bedingung.
 */
export function istRevierAbgeschlossen(gefaehrteId: GefaehrteId, fortschritt: EndlosmodusFortschritt): boolean {
  const spielbar = spaltenFuerGefaehrte(gefaehrteId).filter((s) => s.status === "bereit");
  if (spielbar.length === 0) return false;
  return spielbar.every((s) => sterneInSpalte(fortschritt, s.id) === 3);
}

// TODO (fast-follow): syncPendingEndlosmodusFortschritt(kindProfilPfad), analog zu
// syncPendingFreispielFortschritt in freispielFortschritt.ts — braucht zuerst ein neues
// Feld in KindProfil (firebase.ts), z. B. `endlosmodusFortschritt: Record<EndlosmodusSpalteId,
// [boolean,boolean,boolean]>`, plus denselben ElternBereichRouter-Aufruf. Bewusst nicht Teil
// dieser Runde, um firebase.ts' KindProfil-Typ (von mehreren Stellen synchronisiert gelesen)
// nicht unter Zeitdruck anzufassen — siehe claude/endlosmodus_verdrahtung_2026-09-15.md.
