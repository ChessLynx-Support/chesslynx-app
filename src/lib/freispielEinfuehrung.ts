// Freispiel — Farb-Einführung: Merker, ob dem Kind die Einführung von
// "Weiß" (helle Figuren) und "Schwarz" (dunkle Figuren) bereits einmal
// gezeigt wurde. Siehe claude/freispiel_farbeinfuehrung_sprachentwurf.md.
//
// Bewusst rein lokal (AsyncStorage, kein Firestore-Sync): der Hinweis
// ist ein einmaliger Erklär-Moment pro Gerät, kein Fortschrittswert,
// der geräteübergreifend synchron sein müsste. Wird beim "Nochmal
// spielen" NICHT zurückgesetzt.

import AsyncStorage from "@react-native-async-storage/async-storage";

const SCHLUESSEL = "chesslynx:freispiel:farbeinfuehrungGezeigt";

export async function wurdeFarbeinfuehrungGezeigt(): Promise<boolean> {
  const wert = await AsyncStorage.getItem(SCHLUESSEL);
  return wert === "1";
}

export async function markiereFarbeinfuehrungGezeigt(): Promise<void> {
  await AsyncStorage.setItem(SCHLUESSEL, "1");
}
