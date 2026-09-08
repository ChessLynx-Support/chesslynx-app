// Echter Eltern-Dashboard-Schalter für die geschriebenen Untertitel unter Lux'
// Sprechblase (siehe priorisierter_umsetzungsplan.md, "Bewusst NICHT Teil dieser
// Runde" unter "Opus-Review: Quest-/Audio-Optimierung umgesetzt") — löst die bisherige
// feste Code-Konstante `ZEIGE_UNTERTITEL` in luxStimme.ts ab. `luxStimme.ts` selbst
// (Sprachausgabe per expo-speech) bleibt davon unberührt, dieses Modul betrifft nur die
// zusätzliche geschriebene Sprechblase.
//
// Bewusst rein lokal (AsyncStorage), nicht über Firestore/ElternEinstellungen
// synchronisiert — genau die gleiche Überlegung wie bei zeitlimit.ts: Quest1.tsx–
// Quest6.tsx und Onboarding.tsx laufen komplett offline-first, ohne Firebase-Login
// vorauszusetzen (das Kind soll sofort losspielen können). Ein Firestore-Wert wäre für
// diese Screens nicht ohne Weiteres erreichbar bzw. würde eine Netzwerkabhängigkeit in
// eine Stelle einbauen, die laut Projektkonvention bewusst offline bleibt. Der
// ParentDashboard-Schalter selbst läuft ohnehin auf demselben Gerät, auf dem auch das
// Kind spielt — ein geräteübergreifender Sync ist für diese reine Anzeige-Einstellung
// kein Verlust.
//
// Standardwert `true` (Untertitel sichtbar) entspricht exakt dem bisherigen fest
// codierten `ZEIGE_UNTERTITEL = true` — für alle, die den neuen Schalter nie anfassen,
// ändert sich am Verhalten nichts.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCHLUESSEL = "chesslynx:untertitelAktiv";
export const UNTERTITEL_STANDARD = true;

export async function leseUntertitelAktiv(): Promise<boolean> {
  const gespeichert = await AsyncStorage.getItem(SCHLUESSEL);
  if (gespeichert === null) return UNTERTITEL_STANDARD;
  return gespeichert === "1";
}

/** Schalter im ParentDashboard ("Untertitel anzeigen"). */
export async function setzeUntertitelAktiv(aktiv: boolean): Promise<void> {
  await AsyncStorage.setItem(SCHLUESSEL, aktiv ? "1" : "0");
}

/**
 * Für die Kind-Seite (Quest1.tsx–Quest6.tsx, statt des bisherigen statischen
 * `ZEIGE_UNTERTITEL`-Imports): liefert `UNTERTITEL_STANDARD` sofort beim ersten Render
 * (kein Warten/Aufblitzen nötig, da das der bisherige feste Wert ohnehin war) und lädt
 * danach einmalig den echten, evtl. vom Elternteil geänderten Wert nach. Jeder
 * Quest-Screen wird bei jeder Navigation neu gemountet — ein späteres Umschalten im
 * ParentDashboard wirkt sich dadurch spätestens beim nächsten Öffnen einer Quest aus,
 * ganz ohne zusätzlichen Abgleich-Mechanismus während des Spielens nötig zu machen.
 */
export function useUntertitelAktiv(): boolean {
  const [aktiv, setAktiv] = useState(UNTERTITEL_STANDARD);

  useEffect(() => {
    let abgebrochen = false;
    leseUntertitelAktiv().then((wert) => {
      if (!abgebrochen) setAktiv(wert);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  return aktiv;
}
