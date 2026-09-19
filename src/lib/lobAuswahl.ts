// Welche Lobzeile bekommt das Kind am Ende einer Stufe?
//
// Reines TS-Modul ohne AsyncStorage-/React-Native-Import (wie endlosmodusStufen.ts, siehe
// dortigen Kopfkommentar) — damit es in verify/*.cjs geladen und getestet werden kann.
// endlosmodusFortschritt.ts liefert die Zahlen, dieses Modul trifft die Entscheidung.
//
// Hintergrund (Christian, 2026-09-19): „nicht immer der beste Zug ist entscheidend, sondern
// es ist wichtiger wenig ungenaue/schlechte Züge zu spielen — um nicht zu viel Druck
// aufzubauen". Und zum Lob selbst: ein reines „du hast nichts verschenkt" ist eine
// Abwesenheits-Aussage, da fehlt der Zug nach vorn.
//
// Daraus die beiden Regeln, die dieses Modul durchsetzt:
//
//   1. GELOBT WIRD DIE ABWESENHEIT VON FEHLERN, nicht die Trefferquote. Deshalb hängt die
//      Lobzeile allein an der Zahl verschenkter Figuren — nie daran, wie viele Aufgaben auf
//      Anhieb gelöst wurden.
//   2. KÖNNEN BENENNEN, NICHT LEISTUNG EINFORDERN. Der zweite Teil der Zeile ist immer ein
//      Angebot ("ich zeige dir"), nie eine Hausaufgabe ("beim nächsten Mal kannst du mehr").
//      Eine Forderung würde die Aussage von Regel 1 direkt wieder zurücknehmen.
//
// Siehe claude/ChessLynx_Motiv_Einfuehrungen_2026-09-19.docx, Teil 5, auch für die dort
// ausdrücklich verworfenen Formulierungen.

/** Welche Art zweiter Zeile ans Lob gehängt wird. Die Wortlaute liegen in der aufrufenden
 *  Komponente (i18n), hier wird nur entschieden, WELCHE Art dran ist. */
export type LobZugabe =
  /** „Beim letzten Mal ist dir noch eine Figur weggekommen. Diesmal keine einzige!" —
   *  die stärkste Variante, weil sie belegt statt behauptet. */
  | "belegterFortschritt"
  /** „Und beim nächsten Gefährten zeige ich dir einen neuen Trick." — Vorfreude statt
   *  Rückblick; schließt zugleich die in der Lückenanalyse gemeldete Lücke, dass am Ende
   *  einer Etappe der Ausblick auf die nächste fehlt. */
  | "vorausblick"
  /** „Du wirst immer besser darin." u. a. — rotierender Pool, benennt Können. */
  | "koennen";

export type LobLage = {
  /** Verschenkte Figuren in dieser Runde. */
  verschenktJetzt: number;
  /** Verschenkte Figuren in der vorherigen Runde derselben Stufe; null = es gab keine. */
  verschenktVorher: number | null;
  /** Gibt es überhaupt einen nächsten Gefährten, auf den man sich freuen kann? */
  hatNaechstenGefaehrten: boolean;
};

export type LobEntscheidung = {
  /** Wurde in dieser Runde nichts verschenkt? Entscheidet über den ERSTEN Teil der Zeile. */
  ohneVerlust: boolean;
  /** Welche zweite Zeile angehängt wird. */
  zugabe: LobZugabe;
};

/**
 * Trifft die Entscheidung für eine Stufen-Abschlusszeile.
 *
 * Reihenfolge der Zugabe bewusst so:
 *   1. Belegter Fortschritt, wenn es ihn wirklich gibt — eine wahre, überprüfbare Aussage
 *      wirkt ungleich mehr als jede allgemeine Zusicherung.
 *   2. Sonst Vorfreude, wenn es einen nächsten Gefährten gibt.
 *   3. Sonst das Benennen von Können.
 *
 * Ausdrücklich NICHT umgesetzt: eine Zugabe, die mehr einfordert. Siehe Kopfkommentar.
 */
export function waehleLob(lage: LobLage): LobEntscheidung {
  const ohneVerlust = lage.verschenktJetzt === 0;

  // Belegter Fortschritt setzt voraus, dass es eine Vorrunde GAB und dass es diesmal
  // tatsächlich besser lief. „Besser" heißt strikt weniger — bei Gleichstand wäre die
  // Aussage falsch, und ein falsches Lob ist schlimmer als ein allgemeines.
  const gabVorrunde = lage.verschenktVorher !== null;
  const besserAlsVorher = gabVorrunde && lage.verschenktJetzt < (lage.verschenktVorher as number);

  if (besserAlsVorher) return { ohneVerlust, zugabe: "belegterFortschritt" };
  if (lage.hatNaechstenGefaehrten) return { ohneVerlust, zugabe: "vorausblick" };
  return { ohneVerlust, zugabe: "koennen" };
}

/**
 * Wie eine Runde in die Vorrunde überführt wird: Der laufende Zähler wird zum Vergleichswert
 * der nächsten Runde und beginnt wieder bei null.
 *
 * Als eigene Funktion gehalten, damit die Regel „nur abgeschlossene Runden zählen" an einer
 * Stelle steht: Steigt ein Kind mittendrin aus, soll sein halber Zwischenstand NICHT zum
 * Vergleichswert werden — sonst stünde beim nächsten Mal ein zu niedriger Wert im Weg und
 * der belegte Fortschritt bliebe für immer aus.
 */
export function rundeAbschliessen(laufend: number): { vorrunde: number; laufend: number } {
  return { vorrunde: laufend, laufend: 0 };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Die Wortlaute
// ═════════════════════════════════════════════════════════════════════════════════════════════
//
// Der Kopfkommentar dieser Datei sagte bis zum 2026-09-19, die Wortlaute lägen „in der
// aufrufenden Komponente (i18n)". Sie liegen jetzt hier, und zwar aus demselben Grund, aus dem
// die Entscheidung hier liegt: In einer Komponente sind sie nicht prüfbar. Die Regeln, die für
// sie gelten, sind aber genau die, die im Code still erodieren — deshalb stehen sie im Test.
//
// Zwei davon gehen unmittelbar auf Christians Rückmeldung vom 19.09. zurück. Sein Entwurf
// lautete „Du wirst immer besser. Beim nächsten Mal kannst du deinen Vorteil noch vergrößern."
// Die Absicht ist übernommen, die Formulierung nicht:
//
//   · „VORTEIL" IST EIN ABSTRAKTER SCHACHBEGRIFF, den die App nirgends einführt. Ein Lob ist die
//     schlechteste Stelle für einen neuen Begriff — dort hört ein Kind am wenigsten genau hin,
//     und der Begriff bliebe unerklärt im Raum stehen.
//   · „BEIM NÄCHSTEN MAL KANNST DU MEHR" HÄNGT EINE FORDERUNG ANS LOB. Direkt nachdem gesagt
//     wurde, dass es nicht um das Maximum geht, nähme das die Aussage halb zurück. Der Zug nach
//     vorn ist ein Angebot („ich zeige dir"), keine Hausaufgabe.
//
// Daraus die Regel für alle künftigen Lobzeilen: KÖNNEN BENENNEN, NICHT LEISTUNG EINFORDERN.

export type LobZeile = { de: string; en: string };

/** Rotierender Pool für die Zugabe „koennen" — benennt Können, fordert nichts. */
export const KOENNEN_ZEILEN: readonly LobZeile[] = [
  { de: "Du wirst immer besser darin.", en: "You keep getting better at this." },
  { de: "Schau mal, was du jetzt schon alles erkennst.", en: "Look at everything you can already spot." },
  { de: "Das hast du dir richtig erarbeitet.", en: "You really worked your way to that." },
];

/** Christians Zeile, wörtlich übernommen (2026-09-19). Schließt zugleich die in der
 *  Lückenanalyse gemeldete Lücke, dass am Ende einer Etappe der Ausblick auf die nächste
 *  fehlt — „evtl. eine verpasste Gelegenheit für Vorfreude/Motivation". */
export const VORAUSBLICK_ZEILE: LobZeile = {
  de: "Und beim nächsten Gefährten zeige ich dir einen neuen Trick.",
  en: "And with the next companion I'll show you a new trick.",
};

/**
 * Der erste Teil: die Feststellung.
 *
 * Ohne Verlust wird die ABWESENHEIT VON FEHLERN gelobt — das ist die inhaltliche Umkehrung,
 * um die es hier geht, nicht die Trefferquote.
 *
 * Mit Verlust wird bewusst NICHTS über die Figuren gesagt. Weder ein Lob, das nicht stimmt,
 * noch ein Hinweis auf das Verlorene: Die Stufe ist geschafft, das ist die wahre Aussage.
 * Den Zug nach vorn übernimmt dann die Zugabe.
 */
function feststellung(ohneVerlust: boolean): LobZeile {
  return ohneVerlust
    ? {
        de: "Du hast keine einzige Figur verschenkt. Das ist das Allerwichtigste.",
        en: "You didn't give away a single piece. That's the most important thing.",
      }
    : { de: "Geschafft! Diese Stufe hast du durch.", en: "Done! You got through this level." };
}

/**
 * Der belegte Fortschritt — die stärkste Variante, weil sie nicht behauptet, sondern belegt.
 *
 * Zahlwörter statt Ziffern und richtige Ein-/Mehrzahl: Die Zeile wird VORGELESEN. „Beim letzten
 * Mal sind dir noch 1 Figuren weggekommen" ist genau die Sorte Satz, die aus einer Vorlage
 * herausfällt, wenn niemand hinschaut.
 */
function belegterFortschritt(jetzt: number, vorher: number): LobZeile {
  const vorherDe = vorher === 1 ? "ist dir noch eine Figur weggekommen" : `sind dir noch ${vorher} Figuren weggekommen`;
  const vorherEn = vorher === 1 ? "one piece still got away from you" : `${vorher} pieces still got away from you`;
  const jetztDe = jetzt === 0 ? "Diesmal keine einzige!" : jetzt === 1 ? "Diesmal nur noch eine." : `Diesmal nur noch ${jetzt}.`;
  const jetztEn = jetzt === 0 ? "This time not a single one!" : jetzt === 1 ? "This time only one." : `This time only ${jetzt}.`;
  return { de: `Beim letzten Mal ${vorherDe}. ${jetztDe}`, en: `Last time ${vorherEn}. ${jetztEn}` };
}

/**
 * Die vollständige Lobzeile am Ende einer Stufe: Feststellung plus Zugabe.
 *
 * `poolZaehler` rotiert den „koennen"-Pool — ein fortlaufender Wert der aufrufenden Komponente,
 * damit dieses Modul ohne eigenen Zustand auskommt und im Test vorhersagbar bleibt.
 */
export function lobZeile(lage: LobLage, poolZaehler = 0): LobZeile {
  const e = waehleLob(lage);
  const erst = feststellung(e.ohneVerlust);

  let zweit: LobZeile;
  if (e.zugabe === "belegterFortschritt") {
    zweit = belegterFortschritt(lage.verschenktJetzt, lage.verschenktVorher as number);
  } else if (e.zugabe === "vorausblick") {
    zweit = VORAUSBLICK_ZEILE;
  } else {
    zweit = KOENNEN_ZEILEN[Math.abs(Math.trunc(poolZaehler)) % KOENNEN_ZEILEN.length];
  }

  return { de: `${erst.de} ${zweit.de}`, en: `${erst.en} ${zweit.en}` };
}
