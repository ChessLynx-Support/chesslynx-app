// Lokale, harte Tageslimit-Sperre für die Bildschirmzeit im Kindbereich.
//
// Entscheidung (2026-09-06, mit Christian abgestimmt, siehe ParentDashboard-Entwurf
// Abschnitt "Zeitlimit"): "Harte Sperre, lokal durchgesetzt. Erhöhung nur im
// Eltern-Bereich möglich, alle anderen Bereiche lassen sich mit einem audiovisuellen
// Hinweis nicht mehr öffnen bzw. fortsetzen."
//
// Bewusst rein lokal (AsyncStorage), NICHT über Firestore/`ElternEinstellungen`
// synchronisiert: die Sperre muss auch offline und sofort greifen, nicht erst nach dem
// nächsten Sync (der laut technisches_konzept.md Abschnitt 4 ohnehin nur beim Öffnen
// des Eltern-Bereichs läuft). Gültig pro Gerät, wie im Entwurf bewusst so entschieden.
//
// Bekannte, akzeptierte Grenze (siehe Entwurf): App-Neuinstallation, Cache-Löschen oder
// eine geänderte Geräteuhrzeit umgehen diesen Zähler; er synchronisiert sich nicht über
// mehrere Geräte desselben Kindes hinweg. Ein Wechsel auf einen Firestore-Zähler ist als
// spätere, in sich geschlossene Ausbaustufe im Entwurf dokumentiert, kein Launch-Blocker.
//
// Anwendung in Screens: `useZeitlimitWaechter(() => navigation.replace("ZeitlimitSperre"))`
// in JEDEM Screen aufrufen, der zur Nutzungszeit zählen und die Sperre respektieren soll.
// Aktuell nur in KidHome eingebunden (siehe RootNavigator.tsx) — das Verbuchen von
// Zeit innerhalb der einzelnen Quest-Screens (Quest1–6) ist als nächster, in sich
// abgeschlossener Schritt bewusst zurückgestellt (Scope-Disziplin für diesen
// Umsetzungsschritt), aber durch diesen Hook auf eine Zeile pro Screen reduziert.

import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ZEITLIMIT_MINUTEN_KEY = "chesslynx:zeitlimitMinuten";
const HEUTE_KEY = "chesslynx:zeitHeute"; // { datum, minutenGenutzt, bonusMinuten }

export const STANDARD_ZEITLIMIT_MINUTEN = 15;
// Voreinstellungen laut ParentDashboard-Entwurf: "10 / 15 (Standard) / 20 / 30 / 45 /
// Kein Limit" — kein Freitext-Zahlenfeld, reduziert Fehlbedienung. "Kein Limit" wird
// als 0 abgebildet (siehe `istAktuellGesperrt`/`verbucheMinutenUndPruefeLimit` unten).
export const ZEITLIMIT_PRESETS = [10, 15, 20, 30, 45] as const;
export const ZEITLIMIT_KEIN_LIMIT = 0;
export const BONUS_MINUTEN_SCHRITT = 15; // "+15 Min. für heute"-Schnellbutton

type HeuteZeit = { datum: string; minutenGenutzt: number; bonusMinuten: number };

function heuteDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

async function leseHeuteZeit(): Promise<HeuteZeit> {
  const raw = await AsyncStorage.getItem(HEUTE_KEY);
  const heute = heuteDatum();
  if (raw) {
    const gespeichert = JSON.parse(raw) as HeuteZeit;
    // Automatischer Reset bei Tageswechsel — inklusive eines am Vortag gewährten
    // "+15 für heute"-Bonus, der laut Entwurf ausdrücklich nur für den jeweiligen Tag gilt.
    if (gespeichert.datum === heute) return gespeichert;
  }
  return { datum: heute, minutenGenutzt: 0, bonusMinuten: 0 };
}

async function schreibeHeuteZeit(wert: HeuteZeit): Promise<void> {
  await AsyncStorage.setItem(HEUTE_KEY, JSON.stringify(wert));
}

export async function leseTaeglichesZeitlimit(): Promise<number> {
  const raw = await AsyncStorage.getItem(ZEITLIMIT_MINUTEN_KEY);
  return raw ? Number(raw) : STANDARD_ZEITLIMIT_MINUTEN;
}

/** Ändert den dauerhaften Tages-Normwert ab sofort (Dropdown im ParentDashboard). */
export async function setzeTaeglichesZeitlimit(minuten: number): Promise<void> {
  await AsyncStorage.setItem(ZEITLIMIT_MINUTEN_KEY, String(minuten));
}

/** Wie viele Minuten heute bereits genutzt wurden (Anzeige im ParentDashboard). */
export async function leseHeutigeNutzung(): Promise<{ minutenGenutzt: number; bonusMinuten: number }> {
  const heute = await leseHeuteZeit();
  return { minutenGenutzt: heute.minutenGenutzt, bonusMinuten: heute.bonusMinuten };
}

/**
 * Gewährt zusätzliche Minuten NUR für den heutigen Tag (der "+15 Min. für heute"-
 * Schnellbutton im ParentDashboard) — der dauerhafte Tages-Normwert bleibt unverändert.
 */
export async function gewaehreBonusHeute(minuten: number = BONUS_MINUTEN_SCHRITT): Promise<void> {
  const heute = await leseHeuteZeit();
  await schreibeHeuteZeit({ ...heute, bonusMinuten: heute.bonusMinuten + minuten });
}

export async function istAktuellGesperrt(): Promise<boolean> {
  const [limit, heute] = await Promise.all([leseTaeglichesZeitlimit(), leseHeuteZeit()]);
  if (limit === ZEITLIMIT_KEIN_LIMIT) return false;
  return heute.minutenGenutzt >= limit + heute.bonusMinuten;
}

/**
 * Verbucht vergangene Nutzungsminuten und liefert zurück, ob das Tageslimit (inkl.
 * eines eventuellen heutigen Bonus) damit erreicht oder überschritten ist. Wird vom
 * `useZeitlimitWaechter`-Hook unten in regelmäßigen, kleinen Schritten aufgerufen.
 */
export async function verbucheMinutenUndPruefeLimit(
  vergangeneMinuten: number
): Promise<{ gesperrt: boolean; minutenUebrig: number }> {
  const [limit, heute] = await Promise.all([leseTaeglichesZeitlimit(), leseHeuteZeit()]);
  const neueMinuten = heute.minutenGenutzt + vergangeneMinuten;
  await schreibeHeuteZeit({ ...heute, minutenGenutzt: neueMinuten });

  if (limit === ZEITLIMIT_KEIN_LIMIT) return { gesperrt: false, minutenUebrig: Infinity };
  const erlaubt = limit + heute.bonusMinuten;
  return { gesperrt: neueMinuten >= erlaubt, minutenUebrig: Math.max(0, erlaubt - neueMinuten) };
}

/**
 * React-Hook: prüft beim Einhängen sofort, ob das Tageslimit bereits erreicht ist
 * (deckt z. B. einen App-Neustart nach Ablauf des Limits ab), und verbucht danach in
 * regelmäßigen Abständen die vergangene Zeit weiter, solange der Screen sichtbar ist.
 * Sobald gesperrt wird, ruft er `aufSperrenNavigieren` genau einmal auf — der Screen
 * selbst muss nichts weiter tun, als diesen Hook einzubinden.
 */
export function useZeitlimitWaechter(aufSperrenNavigieren: () => void, intervallSekunden: number = 30) {
  useEffect(() => {
    let abgebrochen = false;

    (async () => {
      if (await istAktuellGesperrt()) {
        if (!abgebrochen) aufSperrenNavigieren();
      }
    })();

    const intervall = setInterval(async () => {
      const { gesperrt } = await verbucheMinutenUndPruefeLimit(intervallSekunden / 60);
      if (!abgebrochen && gesperrt) aufSperrenNavigieren();
    }, intervallSekunden * 1000);

    return () => {
      abgebrochen = true;
      clearInterval(intervall);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
