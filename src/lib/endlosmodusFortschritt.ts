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
import { rundeAbschliessen } from "./lobAuswahl";
import {
  gesamtAnzahlAufgaben,
  naechsteOffeneAufgabe,
  sterneAusFortschritt,
  stufenFuerSpalte,
} from "./endlosmodusStufen";

const LOKALER_SCHLUESSEL = "chesslynx:endlosmodusFortschritt:v2";
// Nachtrag 2026-09-19: eigener Schlüssel für die Verschenkt-Zählung (siehe unten). Bewusst
// NICHT in denselben Datensatz gelegt: Die Sterne sind der Fortschritt des Kindes und werden
// später nach Firestore synchronisiert (siehe TODO am Dateiende), die Verschenkt-Zahlen sind
// dagegen reine Gerätestatistik für die Lobzeile. Ein eigener Schlüssel hält den Sync-Datensatz
// klein und verhindert, dass ein Fehler hier den echten Fortschritt beschädigt.
const VERSCHENKT_SCHLUESSEL = "chesslynx:endlosmodusVerschenkt:v1";
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

// ─────────────────────────────────────────── Verschenkte Figuren (für die Lobzeile)
//
// Hintergrund (Christian, 2026-09-19): Am Ende einer Stufe soll Lux nicht die Trefferquote
// loben, sondern dass NICHTS VERSCHENKT wurde — und, wo es geht, den Fortschritt belegen
// statt behaupten ("Beim letzten Mal ist dir noch eine Figur weggekommen. Diesmal keine
// einzige!"). Dafür braucht es genau zwei Zahlen je Spalte und Stufe: die laufende Runde und
// die vorherige.
//
// Warum je Spalte UND Stufe, obwohl "eine Zahl je Spalte" besprochen war: Die Lobzeile fällt
// am Ende einer STUFE. Mit nur einem Wert je Spalte gäbe es beim Abschluss von Stufe 1 noch
// gar keinen Vergleichswert, und Stufe 2 würde gegen Stufe 1 verglichen — also gegen etwas
// Leichteres. Der Mehraufwand ist ein Dreier-Tupel statt einer Zahl.
//
// Die Auswertung selbst (welche Lobzeile) liegt in lobAuswahl.ts — reines Modul, testbar.

/** Zählung je Stufe (Index 0 = Stufe 1). `vorrunde[i] === null` heißt: noch keine
 *  abgeschlossene Vorrunde, also kein Vergleich möglich. */
export type VerschenktStand = {
  laufend: [number, number, number];
  vorrunde: [number | null, number | null, number | null];
};
export type VerschenktFortschritt = Partial<Record<EndlosmodusSpalteId, VerschenktStand>>;

const LEERER_STAND: VerschenktStand = { laufend: [0, 0, 0], vorrunde: [null, null, null] };

export async function ladeVerschenktFortschritt(): Promise<VerschenktFortschritt> {
  const roh = await AsyncStorage.getItem(VERSCHENKT_SCHLUESSEL);
  return roh ? (JSON.parse(roh) as VerschenktFortschritt) : {};
}

function standFuer(alles: VerschenktFortschritt, spalteId: EndlosmodusSpalteId): VerschenktStand {
  const vorhanden = alles[spalteId];
  return vorhanden
    ? { laufend: [...vorhanden.laufend] as [number, number, number], vorrunde: [...vorhanden.vorrunde] as [number | null, number | null, number | null] }
    : { laufend: [...LEERER_STAND.laufend] as [number, number, number], vorrunde: [...LEERER_STAND.vorrunde] as [number | null, number | null, number | null] };
}

/**
 * Meldet, dass das Kind in dieser Aufgabe eine Figur verschenkt hat — also einen Zug gespielt
 * hat, nach dem eine eigene Figur angegriffen und ungedeckt dasteht (siehe die dreiteilige
 * Rückmeldung in EndlosmodusPuzzle.tsx).
 *
 * Bewusst KEIN Fehlerzähler im alten Sinn: Er wird dem Kind nie angezeigt und hat keine
 * Konsequenz für den Fortschritt. Er dient allein dazu, am Stufenende etwas Wahres sagen zu
 * können. Der Design-Grundsatz "kein Fehlerzähler, keine Bestrafung" bleibt damit gewahrt.
 */
export async function meldeFigurVerschenkt(
  spalteId: EndlosmodusSpalteId,
  stufe: 1 | 2 | 3
): Promise<VerschenktFortschritt> {
  const alles = await ladeVerschenktFortschritt();
  const stand = standFuer(alles, spalteId);
  stand.laufend[stufe - 1] += 1;
  const neu: VerschenktFortschritt = { ...alles, [spalteId]: stand };
  await AsyncStorage.setItem(VERSCHENKT_SCHLUESSEL, JSON.stringify(neu));
  return neu;
}

/**
 * Schließt eine Stufe ab: Der laufende Zähler wird zum Vergleichswert der nächsten Runde und
 * beginnt wieder bei null (siehe rundeAbschliessen in lobAuswahl.ts — dort steht auch,
 * warum nur ABGESCHLOSSENE Runden zum Vergleichswert werden dürfen).
 *
 * Gibt die Lage zurück, aus der lobAuswahl.waehleLob die Zeile bestimmt — der Aufrufer muss
 * die Zahlen also nicht selbst zusammensuchen.
 */
export async function meldeStufeAbgeschlossen(
  spalteId: EndlosmodusSpalteId,
  stufe: 1 | 2 | 3
): Promise<{ verschenktJetzt: number; verschenktVorher: number | null }> {
  const alles = await ladeVerschenktFortschritt();
  const stand = standFuer(alles, spalteId);
  const i = stufe - 1;
  const jetzt = stand.laufend[i];
  const vorher = stand.vorrunde[i];

  const { vorrunde, laufend } = rundeAbschliessen(jetzt);
  stand.vorrunde[i] = vorrunde;
  stand.laufend[i] = laufend;

  await AsyncStorage.setItem(VERSCHENKT_SCHLUESSEL, JSON.stringify({ ...alles, [spalteId]: stand }));
  return { verschenktJetzt: jetzt, verschenktVorher: vorher };
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
