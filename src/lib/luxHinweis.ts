// "Lux fragen" — Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B). Neben der normalen Führung kann das Kind Lux während einer aktiven Zugaufgabe
// um einen Hinweis bitten: Lux antippen wiederholt wie bisher die aktuelle Zeile,
// nochmal antippen bietet einen Hinweis an ("Möchtest du einen Hinweis von mir? Tipp
// mich nochmal!"), ein drittes Antippen gibt den eigentlichen Hinweis.
//
// Bestätigter Geltungsbereich (Nutzer-Korrektur "NIcht bei den Spielen gegen Luchs
// sondern gegen die Bots!"): alle Bonuskapitel-Rätsel-Screens mit eigenem Zug
// (Fesselung/Rochade/Figurenwert/MattIn2/MattIn3) UND die Partien gegen die
// Waldfreunde-Bots im Freispiel (FreispielPartie.tsx) — NICHT irgendein "Spiel gegen
// Lux", da Lux durchgängig Begleiterin bleibt, kein Gegner.
//
// Bewusst rein lokal (AsyncStorage), exakt dieselbe Begründung wie
// untertitelEinstellung.ts: die Kind-Seite läuft offline-first, ein Eltern-Schalter auf
// demselben Gerät braucht keinen Firestore-Sync.
//
// Standardwert bewusst AUS (Nutzerentscheidung 2026-09-09, Rückfrage zum
// Vorschlagsdokument) — anders als der Untertitel-Schalter (Standard AN): Eltern müssen
// die Hinweisfunktion aktiv einschalten, bevor ein Kind sie per Doppel-Tipp nutzen kann.

import { useEffect, useState } from "react";
import { t } from "./sprache";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCHLUESSEL = "chesslynx:hinweiseAktiv";
const EINFUEHRUNG_GEZEIGT_SCHLUESSEL = "chesslynx:hinweisEinfuehrungGezeigt";

// Paket 3 (2026-09-11, Entscheidungslog): Standardwert AN — widerruft die Entscheidung vom
// 2026-09-09. Ein Fünfjähriger in der ersten freien Partie soll Hilfe bekommen können;
// Eltern schalten bewusst ab. Bereits gespeicherte Elternwahl (leseHinweiseAktiv) bleibt
// unangetastet — der Standard greift nur, solange nie etwas gespeichert wurde.
export const HINWEISE_STANDARD = true;

/** Die feste Angebots-Zeile, exakt in der vom Nutzer vorgeschlagenen Formulierung. */
// FUNKTION statt Konstante (2026-09-14): siehe lib/sprache.ts — eine Konstante würde beim
// Import ausgewertet, also bevor die gewählte Sprache gelesen ist.
export function hinweisAngebotZeile(): string {
  return t("Möchtest du einen Hinweis von mir? Tipp mich nochmal!", "Would you like a hint from me? Tap me again!");
}

/** Einmaliger, zusätzlicher Erklärsatz beim allerersten Erreichen einer hinweisfähigen
 * Zugaufgabe überhaupt (siehe Teil B2 im Vorschlagsdokument) — hängt sich an die normale
 * Instruktions-Zeile an, statt eine eigene Sprechpause zu erzwingen. */
export function hinweisEinfuehrungSatz(): string {
  return t(
    " Und falls du nicht weiterweißt: tipp einfach zweimal auf mich, dann helfe ich dir!",
    " And if you get stuck, just tap me twice and I'll help you!"
  );
}

export async function leseHinweiseAktiv(): Promise<boolean> {
  const gespeichert = await AsyncStorage.getItem(SCHLUESSEL);
  if (gespeichert === null) return HINWEISE_STANDARD;
  return gespeichert === "1";
}

/** Schalter im ParentDashboard ("Hinweise von Lux"). */
export async function setzeHinweiseAktiv(aktiv: boolean): Promise<void> {
  await AsyncStorage.setItem(SCHLUESSEL, aktiv ? "1" : "0");
}

/** Für die Kind-Seite (Bonuskapitel/FreispielPartie): liefert `HINWEISE_STANDARD` sofort
 * beim ersten Render und lädt danach den echten, evtl. von den Eltern geänderten Wert
 * nach — dasselbe Muster wie `useUntertitelAktiv`. */
export function useHinweiseAktiv(): boolean {
  const [aktiv, setAktiv] = useState(HINWEISE_STANDARD);

  useEffect(() => {
    let abgebrochen = false;
    leseHinweiseAktiv().then((wert) => {
      if (!abgebrochen) setAktiv(wert);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  return aktiv;
}

export async function wurdeHinweisEinfuehrungGezeigt(): Promise<boolean> {
  return (await AsyncStorage.getItem(EINFUEHRUNG_GEZEIGT_SCHLUESSEL)) === "1";
}

export async function markiereHinweisEinfuehrungGezeigt(): Promise<void> {
  await AsyncStorage.setItem(EINFUEHRUNG_GEZEIGT_SCHLUESSEL, "1");
}

/** Für die Kind-Seite: liefert beim allerersten Render `false` ("noch nicht gezeigt")
 * und lädt danach den echten Wert nach — bewusst dieser Default statt umgekehrt: der
 * asynchrone AsyncStorage-Ladevorgang löst praktisch nie vor dem allerersten
 * Sprech-Effekt auf, ein Default von `true` würde also ein Kind, das die Einführung
 * wirklich zum ersten Mal erlebt, zuverlässig um den Erklärsatz bringen. Die einzige
 * Kehrseite ist harmlos: wer die Einführung längst gehört hat, könnte sie durch diesen
 * Default in einem seltenen Rennlauf-Fall ein einziges Mal zusätzlich hören. */
export function useHinweisEinfuehrungGezeigt(): [boolean, () => void] {
  const [gezeigt, setGezeigt] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    wurdeHinweisEinfuehrungGezeigt().then((wert) => {
      if (!abgebrochen) setGezeigt(wert);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  function markieren() {
    setGezeigt(true);
    markiereHinweisEinfuehrungGezeigt();
  }

  return [gezeigt, markieren];
}

/** Die drei Phasen der Antipp-Geste während einer aktiven Zugaufgabe (siehe
 * Datei-Kopfkommentar): `still` = normales Antippen wiederholt nur die aktuelle Zeile,
 * `angebot` = Lux hat gerade den Hinweis angeboten, das nächste Antippen gibt ihn,
 * `hinweis` = der eigentliche Hinweis wurde bereits gegeben (weiteres Antippen
 * wiederholt ihn einfach). Ein tatsächlicher Zug/Screen-Wechsel setzt immer auf `still`
 * zurück. */
export type HinweisPhase = "still" | "angebot" | "hinweis";
