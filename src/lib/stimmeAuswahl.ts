// Manuelle Stimmauswahl fürs Eltern-Dashboard.
//
// Nutzer-Feedback 2026-09-08: "Ich möchte eine andere Stimme haben, selbst zum Testen
// ist der Computer-Ton sehr unangenehm." Getestet wurde dabei im Browser am PC
// (`expo start --web`) — dort liefert die Web Speech API (unter Windows: die
// SAPI-Systemstimmen) keine verlässliche `quality`-Angabe, weshalb die automatische
// Bestenauswahl in luxStimme.ts (`ermittleBevorzugteStimme`, sucht nach "Enhanced"/
// "Premium") dort praktisch wirkungslos ist und meist einfach die erste gefundene
// deutsche Stimme nimmt — oft genau die unangenehm klingende Standardstimme.
//
// Statt hier blind eine andere feste Stimmen-ID einzutragen (die auf dem jeweiligen
// Gerät/Browser sowieso anders heißen kann), bekommt der Elternteil hier eine echte
// Auswahl mit Vorhören: `listeStimmen()` fragt alle auf dem aktuellen
// Testgerät/Browser bekannten deutschen Stimmen ab, `stimmeVorhoeren()` spricht damit
// einen Beispielsatz, und eine bewusst gewählte Stimme wird hier gespeichert und hat in
// luxStimme.ts Vorrang vor der automatischen Bestenauswahl.
//
// Bewusst rein lokal (AsyncStorage), keine Firestore-Synchronisation — dieselbe
// Begründung wie bei untertitelEinstellung.ts: eine Geräte-/Browser-Einstellung (welche
// Stimmen überhaupt verfügbar sind, unterscheidet sich ohnehin pro Gerät), kein
// Konto-übergreifendes Datum, muss ohne Firebase-Netzwerk funktionieren.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { sprache } from "./sprache";

// Der Speicherschlüssel trägt seit 2026-09-14 die Sprache, weil die gewählte Stimme
// sprachgebunden ist: Eine deutsche Stimme kann keinen englischen Satz sprechen. Ohne
// Trennung würde beim Sprachwechsel eine unpassende Stimme aus dem Speicher geholt und
// Lux klänge auf Englisch wie ein deutscher Vorleser mit englischen Wörtern.
// Der alte, sprachlose Schlüssel wird bewusst NICHT migriert — er stammt aus der Zeit, als
// es nur Deutsch gab, und eine Neuwahl im Eltern-Dashboard ist ein Griff.
function schluessel(): string {
  return `chesslynx:bevorzugteStimmeId:${sprache()}`;
}

// Design-Vorgabe 3.1, Schritt 3 (siehe luxStimme.ts) — hier als einzige Quelle definiert
// und von luxStimme.ts importiert, damit das Vorhören unten exakt so klingt wie Lux
// später tatsächlich im Spiel spricht (gleiche Geschwindigkeit/Tonhöhe).
//
// Nutzer-Feedback 2026-09-08 (nach Test der Stimmauswahl im Eltern-Dashboard):
// "Sprechgeschwindigkeit kann leicht erhöht werden" — löst die vorherige Einschätzung vom
// 2026-09-07 ("Sprechgeschwindigkeit ist gut", siehe luxStimme.ts-Kommentar dort) ab.
// 0.85 -> 0.95, bewusst nur ein kleiner Schritt (kein Sprung auf 1.0/Normalgeschwindigkeit),
// um für Kinderohren weiterhin klar artikuliert zu bleiben.
// Tempo und Tonhöhe gelten für beide Sprachen gleich (Design-Vorgabe 3.1 ist keine
// Eigenschaft der Sprache, sondern der Zielgruppe). Nur das Sprach-Kennzeichen wechselt.
const KLANG = { rate: 0.95, pitch: 1.1 } as const;

/**
 * Sprechoptionen für die aktuelle Sprache. Seit 2026-09-14 eine Funktion statt einer
 * Konstante: `language` muss zur Oberflächensprache passen, sonst liest die Engine
 * englische Sätze mit deutscher Aussprache vor (und umgekehrt).
 */
export function stimmeOptionen() {
  return { language: sprache() === "en" ? "en-US" : "de-DE", ...KLANG };
}

function vorhoerSatz(): string {
  return sprache() === "en"
    ? "Hi, I'm Lux! Do you like how I sound?"
    : "Hallo, ich bin Lux! Hörst du mich gerne so sprechen?";
}

export type StimmenOption = {
  identifier: string;
  name: string;
  qualitaet: string;
};

// In-App-Zwischenspeicher: nach dem ersten `leseBevorzugteStimmeId()`-Aufruf gefüllt
// (siehe `stelleStimmeBereit()` in luxStimme.ts, die das beim App-Start einmalig
// anstößt) und von `setzeBevorzugteStimmeId()` sofort aktualisiert — so hört sich eine
// Änderung im Eltern-Dashboard schon bei der nächsten gesprochenen Zeile an, ganz ohne
// App-Neustart. `undefined` bedeutet "noch nicht geladen" GENAUSO wie "keine bewusste
// Wahl getroffen" — beides führt in luxStimme.ts zur automatischen Bestenauswahl, was
// hier unkritisch ist: die allererste gesprochene Zeile der App verhält sich so oder so
// wie bisher (siehe Kommentar dort).
let manuelleStimme: string | undefined;

export async function leseBevorzugteStimmeId(): Promise<string | undefined> {
  const gespeichert = await AsyncStorage.getItem(schluessel());
  manuelleStimme = gespeichert ?? undefined;
  return manuelleStimme;
}

export async function setzeBevorzugteStimmeId(id: string | undefined): Promise<void> {
  manuelleStimme = id;
  if (id) {
    await AsyncStorage.setItem(schluessel(), id);
  } else {
    // "Automatisch" (Reset) — die Bestenauswahl in luxStimme.ts greift wieder.
    await AsyncStorage.removeItem(schluessel());
  }
}

// Schneller, synchroner Zugriff für luxStimme.ts (siehe Kommentar bei `manuelleStimme`
// oben) — kein erneuter AsyncStorage-Zugriff bei jeder gesprochenen Zeile nötig.
export function bevorzugteStimmeIdSynchron(): string | undefined {
  return manuelleStimme;
}

/**
 * Alle dem Gerät/Browser bekannten Stimmen der aktuellen Sprache, für die Auswahl-Liste im
 * Eltern-Dashboard. Kann auf manchen Plattformen leer zurückkommen (siehe
 * `ermittleBevorzugteStimme` in luxStimme.ts) — das Dashboard zeigt dann statt einer
 * Liste einen entsprechenden Hinweis, statt eine leere Liste ohne Erklärung anzuzeigen.
 */
export async function listeStimmen(): Promise<StimmenOption[]> {
  const praefix = sprache() === "en" ? "en" : "de";
  try {
    const stimmen = await Speech.getAvailableVoicesAsync();
    return stimmen
      .filter((s) => s.language?.toLowerCase().startsWith(praefix))
      .map((s) => ({
        identifier: s.identifier,
        name: s.name || s.identifier,
        qualitaet: String(s.quality ?? ""),
      }));
  } catch {
    return [];
  }
}

/** Spricht den Vorhör-Satz mit einer bestimmten Stimme — unabhängig von der aktuell
 * gespeicherten Auswahl, damit man vor dem Festlegen mehrere Stimmen nacheinander
 * durchprobieren kann. */
export function stimmeVorhoeren(identifier: string) {
  Speech.stop();
  Speech.speak(vorhoerSatz(), { ...stimmeOptionen(), voice: identifier });
}

export function vorhoerenStoppen() {
  Speech.stop();
}
