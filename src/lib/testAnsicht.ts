// Reine ANSICHTS-Schalter für den Testmodus des Eltern-Bereichs (`__DEV__`).
//
// Hervorgegangen aus `gefaehrtenVorschau.ts` (2026-09-14). Als der zweite Schalter dazukam
// („freigespielte Figuren sollen trotzdem grüßen, um die Animationen zu testen"), wäre eine
// zweite Datei mit demselben 40-Zeilen-Muster entstanden — deshalb hier gemeinsam.
//
// WAS DIESE SCHALTER SIND: Sie ändern, wie die Saga-Karte AUSSIEHT, damit sich Illustration
// und Animation beurteilen lassen, ohne den passenden Spielstand herstellen zu müssen.
//
// WAS SIE AUSDRÜCKLICH NICHT SIND: Freischaltungen. Sie fassen keinen Fortschritt an, öffnen
// keine Screens und machen nichts antippbar. Wer Inhalte wirklich freispielen will, nimmt den
// Knopf „Inhalt komplett freispielen" daneben; wer sie wieder loswerden will, „Spielstand
// zurücksetzen".
//
// Damit ist auch klar, warum sie im Eltern-Bereich für echte Eltern nichts zu suchen haben:
// Sie zeigen einen Zustand, den das Kind so nicht hat. Sie leben deshalb im `__DEV__`-
// Testmodus und sonst nirgends.
//
// Bewusst rein lokal (AsyncStorage) und nicht über Firestore synchronisiert — dieselbe
// Begründung wie bei untertitelEinstellung.ts und zeitlimit.ts: Die Saga-Karte läuft
// offline-first, ohne Firebase-Login. Ein Firestore-Wert wäre dort nicht ohne Weiteres
// erreichbar und würde eine Netzwerkabhängigkeit in einen Screen einbauen, der laut
// Projektkonvention bewusst ohne auskommt.

import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TestAnsicht =
  /**
   * Die sieben Gefährten im Oberland ungedimmt und ohne Nebel zeigen (Nutzerwunsch
   * 2026-09-14: „ungedimmt und nebelfrei anzeigen bitte"). Gedacht zum Beurteilen von
   * Illustration, Größenstaffelung und Platz auf dem Weg, ohne auf Update 1 zu warten.
   *
   * Antippbar werden sie dadurch NICHT: Der Navigator kennt (Stand 2026-09-14) keine
   * Revier-Route, keine Ruhmeshalle, keinen Wisent-Kampf. Es gibt schlicht kein Ziel.
   */
  | "gefaehrtenVorschau"
  /**
   * Alle bereits erledigten Quest-Tiere grüßen mit, nicht nur das nächste.
   *
   * Hintergrund: Die Geste (Igel winkt, Eule dreht den Kopf, Pferd senkt es, Schwan hebt
   * den Flügel, Hirsch nickt, Bär winkt) hängt normalerweise an `zustand === "naechstes"`
   * — sie markiert die nächste Station. Wer alles freigespielt hat, sieht deshalb GAR
   * keine Geste mehr, weil es kein „nächstes" mehr gibt. Genau dann will man sie aber
   * prüfen können.
   *
   * Gesperrte Tiere grüßen weiterhin nicht: Sie stehen im Nebel, und Bewegung würde sie
   * als erreichbar lesen lassen.
   */
  | "alleGruessen"
  /**
   * Nebel vollständig aus — Oberland UND Karte, unabhängig vom Fortschritt.
   *
   * Warum als eigener Schalter (2026-09-14, nach Nutzerrückmeldung „vorher war er komplett
   * weg, seit den Grußbewegungen ist er wieder da"): Die Nebelfreiheit hing bis dahin an
   * der Gefährten-Vorschau — dort ist sie ein Nebeneffekt, kein Zweck. Wer Animationen
   * prüfen will, braucht sie aber unabhängig davon, und wer die Gefährten-Vorschau
   * ausschaltet, holt sich sonst den Nebel ungewollt zurück.
   *
   * Der Nebel ist in der ausgelieferten App ein Fortschrittsanzeiger. Dieser Schalter
   * hebelt genau das aus und gehört deshalb in den Testmodus, nirgendwo sonst.
   */
  | "nebelAus";

const SCHLUESSEL: Record<TestAnsicht, string> = {
  gefaehrtenVorschau: "chesslynx:gefaehrtenVorschau",
  alleGruessen: "chesslynx:alleGruessen",
  nebelAus: "chesslynx:nebelAus",
};

export async function leseTestAnsicht(name: TestAnsicht): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SCHLUESSEL[name])) === "1";
  } catch {
    // Ohne Speicher bleibt es beim Auslieferungsbild — das ist die sichere Richtung.
    return false;
  }
}

/** Schalter im Testmodus des Eltern-Dashboards. */
export async function setzeTestAnsicht(name: TestAnsicht, an: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHLUESSEL[name], an ? "1" : "0");
  } catch {
    // Dann gilt die Wahl nur für diese Sitzung — besser als ein Absturz beim Umschalten.
  }
}

/**
 * Für die Saga-Karte. Liest bei JEDEM Fokussieren neu — nicht nur beim Mounten.
 *
 * Das ist hier der entscheidende Unterschied zu `useUntertitelAktiv()`: Quest-Screens
 * werden bei jeder Navigation neu gemountet, KidHome mit der Karte aber nicht. Wer im
 * Eltern-Bereich umschaltet und zurückgeht, käme sonst auf eine unveränderte Karte
 * zurück und hielte den Schalter für kaputt.
 */
export function useTestAnsicht(name: TestAnsicht): boolean {
  const [an, setAn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let abgebrochen = false;
      leseTestAnsicht(name).then((wert) => {
        if (!abgebrochen) setAn(wert);
      });
      return () => {
        abgebrochen = true;
      };
    }, [name])
  );

  return an;
}
