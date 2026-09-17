// Fortschrittsspeicherung für die Wisent-Endspiel-Kür (Dame-Matt/Turm-Matt), siehe
// claude/wisent_endspiel_kuer_kuratierung_2026-09-17.md. Bewusst rein LOKAL (kein Firestore-
// Sync) — genau dasselbe "feineres Detail, wird noch nicht synchronisiert"-Prinzip wie
// endlosmodusFortschritt.ts (siehe dortiger Kommentar/TODO). Der kompakte, tatsächlich
// SYNCHRONISIERTE Gesamtstand bleibt ein einzelner Boolean in `bonusFortschritt.wisentEndspiel`
// (firebase.ts), genau wie bei jedem anderen Bonuskapitel/Kür — gesetzt über
// `saveBonusFortschrittLocal("wisentEndspiel", true)`, sobald beide Unterthemen alle drei
// Sterne erreicht haben. Bewusst OHNE Import aus storage.ts (auch dieser Aufruf liegt daher
// bei der aufrufenden Stelle, bonus/WisentEndspielKuer.tsx) — storage.ts importiert umgekehrt
// den Schlüssel dieser Datei für `istSpielstandSchluessel`, ein Import in beide Richtungen
// wäre ein unnötiger Zirkelbezug zwischen den beiden Modulen.
//
// Speicherung: ein Wahrheitswert pro Einzelaufgabe je Unterthema (Index 0-9, exakt dieselbe
// Reihenfolge wie chessEngine.ts/WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE: a1,a2,a3,a4,b1,b2,b3,
// c1,c2,c3) — wiederverwendet dieselbe reine Stufen-/Sterne-Logik wie der Endlosmodus
// (endlosmodusStufen.ts), mit den Stufengrößen [4, 3, 3] (Christians Vorgabe: 4x Stufe A, 3x
// Stufe B, 3x Stufe C je Unterthema). Christians Entscheidung bei Rückfrage 2026-09-17: NUR
// Aufgaben-Fortschritt speichern, KEIN Zwischenstand einer einzelnen, noch laufenden
// Mattführung (anders als ganzePartieStand.ts) — verlässt das Kind eine Mattführung mitten im
// Zug, geht nur diese eine Aufgabe verloren, nicht der gesamte bisherige Kür-Fortschritt.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sterneAusFortschritt,
  naechsteOffeneAufgabe,
  gesamtAnzahlAufgaben,
  stufeUndPositionFuerIndex,
  type StufenGroessen,
} from "./endlosmodusStufen";

export type WisentEndspielThema = "dame" | "turm";

/** 4x Stufe A, 3x Stufe B, 3x Stufe C je Unterthema — siehe Datei-Kopfkommentar. */
export const WISENT_ENDSPIEL_STUFEN: StufenGroessen = [4, 3, 3];

export const WISENT_ENDSPIEL_FORTSCHRITT_KEY = "chesslynx:wisentEndspielFortschritt";

type WisentEndspielFortschritt = { dame: boolean[]; turm: boolean[] };

export async function ladeWisentEndspielFortschritt(): Promise<WisentEndspielFortschritt> {
  const roh = await AsyncStorage.getItem(WISENT_ENDSPIEL_FORTSCHRITT_KEY);
  const geladen = roh ? (JSON.parse(roh) as Partial<WisentEndspielFortschritt>) : {};
  return { dame: geladen.dame ?? [], turm: geladen.turm ?? [] };
}

/**
 * Meldet, dass eine einzelne Aufgabe (per Index innerhalb ihres Unterthemas, siehe
 * Kopfkommentar) gelöst wurde. Bewusst ohne Reihenfolge-Zwang beim SPEICHERN selbst (jeder
 * Index einzeln, in beliebiger Reihenfolge, setzbar) — dieselbe Freiheit wie im Endlosmodus
 * (siehe endlosmodusFortschritt.ts). Ob ein Unterthema damit einen neuen Stern erreicht,
 * entscheidet allein `sterneFuerThema` unten.
 */
export async function meldeWisentEndspielAufgabeGeloest(
  thema: WisentEndspielThema,
  aufgabenIndex: number
): Promise<WisentEndspielFortschritt> {
  const aktuell = await ladeWisentEndspielFortschritt();
  const spalte = [...aktuell[thema]];
  spalte[aufgabenIndex] = true;
  const neu: WisentEndspielFortschritt = { ...aktuell, [thema]: spalte };
  await AsyncStorage.setItem(WISENT_ENDSPIEL_FORTSCHRITT_KEY, JSON.stringify(neu));
  return neu;
}

export function sterneFuerThema(fortschritt: WisentEndspielFortschritt, thema: WisentEndspielThema): 0 | 1 | 2 | 3 {
  return sterneAusFortschritt(fortschritt[thema] ?? [], WISENT_ENDSPIEL_STUFEN);
}

/** Beide Unterthemen zusammen bei je drei Sternen — die Bedingung für
 *  `bonusFortschritt.wisentEndspiel = true` (siehe Datei-Kopfkommentar). */
export function wisentEndspielVollstaendig(fortschritt: WisentEndspielFortschritt): boolean {
  return sterneFuerThema(fortschritt, "dame") === 3 && sterneFuerThema(fortschritt, "turm") === 3;
}

/** Index der nächsten offenen Aufgabe dieses Unterthemas (siehe endlosmodusStufen.ts,
 *  naechsteOffeneAufgabe) — Grundlage für "dort weitermachen", dasselbe Prinzip wie
 *  EndlosmodusSpalte.tsx. */
export function naechsteOffeneAufgabeFuerThema(
  fortschritt: WisentEndspielFortschritt,
  thema: WisentEndspielThema
): number {
  return naechsteOffeneAufgabe(fortschritt[thema] ?? [], gesamtAnzahlAufgaben(WISENT_ENDSPIEL_STUFEN));
}

export { stufeUndPositionFuerIndex, gesamtAnzahlAufgaben };
