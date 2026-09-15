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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENDLOSMODUS_SPALTEN, spaltenFuerGefaehrte, type EndlosmodusSpalteId } from "./endlosmodusSpalten";
import type { GefaehrteId } from "./gefaehrtenZustaende";

const LOKALER_SCHLUESSEL = "chesslynx:endlosmodusFortschritt:v1";
const SYNC_AUSSTEHEND_SCHLUESSEL = "chesslynx:endlosmodusFortschritt:syncAusstehend";

/** Je Spalte drei Wahrheitswerte — einer pro Sterne-Stellung (Index 0 = Stern 1 usw.). */
export type SpalteFortschritt = [boolean, boolean, boolean];
export type EndlosmodusFortschritt = Partial<Record<EndlosmodusSpalteId, SpalteFortschritt>>;

function leereSpalte(): SpalteFortschritt {
  return [false, false, false];
}

export async function ladeEndlosmodusFortschritt(): Promise<EndlosmodusFortschritt> {
  const roh = await AsyncStorage.getItem(LOKALER_SCHLUESSEL);
  return roh ? (JSON.parse(roh) as EndlosmodusFortschritt) : {};
}

/**
 * Meldet, dass eine einzelne Sterne-Stellung gelöst wurde. Bewusst ohne Reihenfolge-Zwang
 * innerhalb einer Spalte (anders als die strikt lineare Revier-zu-Revier-Freischaltung) —
 * wie beim Freispiel-Modus beliebig oft wiederholbar, kein Verlust-Malus, siehe
 * endlosmodus_freispiel_konzept.md.
 */
export async function meldeAufgabeGeloest(
  spalteId: EndlosmodusSpalteId,
  sternIndex: 0 | 1 | 2
): Promise<EndlosmodusFortschritt> {
  const aktuell = await ladeEndlosmodusFortschritt();
  const spalte: SpalteFortschritt = aktuell[spalteId] ? [...aktuell[spalteId]!] as SpalteFortschritt : leereSpalte();
  spalte[sternIndex] = true;
  const neu: EndlosmodusFortschritt = { ...aktuell, [spalteId]: spalte };
  await AsyncStorage.setItem(LOKALER_SCHLUESSEL, JSON.stringify(neu));
  await AsyncStorage.setItem(SYNC_AUSSTEHEND_SCHLUESSEL, "1");
  return neu;
}

export function sterneInSpalte(fortschritt: EndlosmodusFortschritt, spalteId: EndlosmodusSpalteId): 0 | 1 | 2 | 3 {
  const spalte = fortschritt[spalteId] ?? leereSpalte();
  return spalte.filter(Boolean).length as 0 | 1 | 2 | 3;
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
