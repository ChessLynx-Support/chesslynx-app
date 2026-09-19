// Welche Motiv-Einführungen (siehe motivEinfuehrungen.ts) das Kind schon gesehen hat.
//
// Offline-first nach demselben Muster wie freispielFortschritt.ts und
// endlosmodusFortschritt.ts: lokal sofort speichern, ein Firestore-Sync wäre ein eigener,
// unabhängiger Schritt.
//
// EIGENE DATEI, nicht in endlosmodusFortschritt.ts mit hineingelegt: Der Fortschritt hängt am
// MOTIV, nicht an einer Endlosmodus-Spalte. Dieselbe Fesselungs-Einführung deckt drei Spalten
// an drei verschiedenen Revieren ab (siehe MOTIV_JE_SPALTE) — läge die Zählung bei den Spalten,
// sähe ein Kind dieselbe Erklärung dreimal. Und zwei der sechs Motive („Beschützen",
// „In Sicherheit bringen") hängen gar nicht am Endlosmodus, sondern an der Erstlehre.
//
// Bewusst NUR ein „schon gesehen"-Kennzeichen, kein Zeitstempel und keine Zählung: Es gibt
// nichts, was man damit täte, und alles, was hier steht, müsste auch gelöscht werden können.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MotivId } from "./motivEinfuehrungen";

const SCHLUESSEL = "chesslynx:motivEinfuehrungen:v1";

export type MotivEinfuehrungStand = Partial<Record<MotivId, boolean>>;

export async function ladeMotivEinfuehrungen(): Promise<MotivEinfuehrungStand> {
  const roh = await AsyncStorage.getItem(SCHLUESSEL);
  return roh ? (JSON.parse(roh) as MotivEinfuehrungStand) : {};
}

/** Wurde die volle Folge für dieses Motiv schon einmal gezeigt? */
export async function einfuehrungGesehen(motivId: MotivId): Promise<boolean> {
  return (await ladeMotivEinfuehrungen())[motivId] === true;
}

/**
 * Merkt, dass die Folge einmal ganz durchgelaufen ist.
 *
 * Wird bewusst erst am ENDE der Folge gerufen, nicht beim Start: Bricht das Kind ab (Zurück),
 * soll es die Erklärung beim nächsten Mal noch einmal ganz bekommen statt nur den
 * Erinnerungssatz zu einem Motiv, das es nie erklärt bekommen hat.
 */
export async function merkeEinfuehrungGesehen(motivId: MotivId): Promise<MotivEinfuehrungStand> {
  const alles = await ladeMotivEinfuehrungen();
  const neu: MotivEinfuehrungStand = { ...alles, [motivId]: true };
  await AsyncStorage.setItem(SCHLUESSEL, JSON.stringify(neu));
  return neu;
}
