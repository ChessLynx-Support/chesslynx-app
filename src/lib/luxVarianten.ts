// Zweisprachige Texte — siehe lib/sprache.ts.
import { t } from "./sprache";

// Sprach-Harmonie-Review (Nutzerauftrag 2026-09-09: "prüfe alle Sprachteile von Lux
// nochmal auf Harmonie zur Story ... Die Sprachführung soll die Kinder wirklich an die
// Hand nehmen, aber zugleich nicht störend wirken"). Ausgangsbefund: KEINE der sechs
// Haupt-Waldabenteuer-Dateien (Quest1.tsx–Quest6.tsx) hatte bis dahin irgendeine
// Variations-/Zufallslogik — jede Sprechzeile ist bei jedem Durchlauf und jeder
// automatischen 8-Sekunden-Erinnerung (siehe ERINNERUNG_MS in useLuxSprechzeile.ts)
// wortidentisch. Zwei konkrete Wiederholungs-Situationen sind dadurch potenziell
// "störend" statt "an die Hand nehmend":
//   1. Innerhalb EINES Bildschirms: ein Kind, das länger als 8 Sekunden für einen
//      Zug/eine Übungsrunde braucht, hört exakt denselben Satz erneut und erneut.
//   2. Über die sechs Waldabenteuer hinweg: dieselben drei PHASE_LINES-Zeilen
//      ("Jetzt bist du dran!" / "Tipp auf ein leuchtendes Feld." / "Kannst du das noch
//      ein paar Mal?" / "Super, das kannst du schon richtig gut!") sind in Quest1–Quest6
//      wortidentisch — ein Kind, das an einem Nachmittag mehrere Abenteuer hintereinander
//      spielt, hört sie entsprechend oft.
//
// Dieses Modul löst beide Fälle mit EINEM gemeinsamen Mechanismus: ein session-weiter,
// rotierender Zähler pro Schlüssel. Bewusst KEIN echter Zufall (Math.random) — echter
// Zufall könnte zwei Aufrufe in Folge dieselbe Variante ziehen, was sich für das Kind
// exakt so repetitiv anfühlen würde wie gar keine Variation. Ein rotierender Zähler
// garantiert stattdessen, dass zwei AUFEINANDERFOLGENDE Aufrufe (egal ob als 8-Sekunden-
// Erinnerung auf demselben Bildschirm oder als nächstes Waldabenteuer in derselben
// Sitzung) nie dieselbe Formulierung liefern, bis der ganze Pool einmal durchlaufen ist.
//
// Bewusst rein modulweit im Arbeitsspeicher (keine Persistenz in AsyncStorage/Firestore):
// die Abwechslung soll sich innerhalb EINER Spielsitzung lebendig anfühlen, nicht über
// App-Neustarts hinweg "erinnert" werden — dafür gäbe es keinen sinnvollen Nutzen, nur
// unnötigen Speicheraufwand. Nach einem Neustart beginnt jeder Pool wieder bei Variante 1,
// der klarsten/direktesten Formulierung.
const zaehler = new Map<string, number>();

/**
 * Liefert die nächste Variante aus `pool` für den gegebenen `schluessel` und zählt dabei
 * den zu diesem Schlüssel gehörenden Zähler genau einmal weiter. WICHTIG: nur an der
 * Stelle aufrufen, an der eine Zeile tatsächlich (erneut) gesprochen wird (siehe
 * useLuxSprechzeile.ts — dort als `() => luxVariante(...)` übergeben, damit der Zähler
 * nur bei echten Sprechvorgängen weiterläuft, nicht bei jedem Komponenten-Rerender).
 */
/** Eine Variante: entweder ein fester Satz oder ein Paar [deutsch, englisch]. */
export type Variante = string | readonly [string, string];

export function luxVariante(pool: readonly Variante[], schluessel: string): string {
  if (pool.length === 0) return "";
  const n = zaehler.get(schluessel) ?? 0;
  zaehler.set(schluessel, n + 1);
  const gewaehlt = pool[n % pool.length];
  // Das Sprachpaar wird ERST HIER aufgelöst, nicht schon beim Anlegen des Pools. Grund
  // (2026-09-14): Die Pools unten sind Modulkonstanten und würden beim Import ausgewertet —
  // also bevor `ladeSprache()` in App.tsx die im Eltern-Bereich gewählte Sprache kennt. Sie
  // blieben dann für den Rest der Sitzung auf der Gerätesprache stehen. Als Paare gespeichert
  // und hier aufgelöst folgen sie der Umschaltung sofort, und sämtliche Aufrufstellen in den
  // sechs Quests bleiben unverändert.
  // Einfache Strings sind weiterhin erlaubt: Pools, die noch nicht übersetzt sind (etwa der
  // Quest-6-eigene und der KidHome-Gruß), funktionieren unverändert weiter.
  return typeof gewaehlt === "string" ? gewaehlt : t(gewaehlt[0], gewaehlt[1]);
}

// Gemeinsame Varianten-Pools für die drei über Quest1–Quest6 hinweg wortidentischen
// PHASE_LINES-Zeilen (siehe Befund oben). Zentral hier definiert statt sechsfach
// dupliziert, damit der rotierende Zähler außerdem GLOBAL über alle sechs Abenteuer
// hinweg weiterläuft (derselbe Schlüssel "uebung-hinweis"/"fertig-lob" wird von jedem
// Quest-Screen verwendet) — ein Kind, das Quest 1 bis Quest 6 hintereinander spielt,
// hört dadurch eine natürlich fortlaufende Abwechslung statt sechsmal denselben Satz.
// Quest6 hat für INTERAKTIV_HINWEIS_VARIANTEN eine eigene, leicht abgewandelte
// Formulierung ("... direkt neben ihm", siehe dortiger Kommentar in Quest6.tsx) und
// definiert deshalb dort einen eigenen, gleich langen Pool statt diesen zu importieren —
// der Rotations-Fortschritt bleibt trotzdem gemeinsam, da beide denselben Schlüssel
// "interaktiv-hinweis" verwenden.
export const INTERAKTIV_HINWEIS_VARIANTEN: readonly Variante[] = [
  ["Tipp auf ein leuchtendes Feld.", "Tap a glowing square."],
  ["Schau, wo es leuchtet. Dort darfst du hin.", "Look where it's glowing. That's where you may go."],
  ["Trau dich, tipp einfach auf das leuchtende Feld!", "Go on, just tap the glowing square!"],
];

export const UEBUNG_HINWEIS_VARIANTEN: readonly Variante[] = [
  ["Kannst du das noch ein paar Mal?", "Can you do that a few more times?"],
  ["Weiter so! Versuch's gleich noch einmal!", "Keep going! Have another try right away!"],
  ["Du wirst schon richtig sicher darin. Nochmal?", "You're getting really sure of this. Once more?"],
  ["Prima! Probier es noch ein paarmal aus.", "Lovely! Try it a few more times."],
];

export const FERTIG_LOB_VARIANTEN: readonly Variante[] = [
  ["Super, das kannst du schon richtig gut!", "Great! You're really good at this already!"],
  ["Klasse gemacht! Du wirst richtig gut darin!", "Well done! You're getting really good at this!"],
  ["Toll! Das hast du wunderbar hinbekommen.", "Brilliant! You did that beautifully."],
  ["Du machst das schon wie ein kleiner Schach-Profi!", "You're doing this like a proper little chess player!"],
];

// Wisent-Kür-Runde (2026-09-15, gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 4,
// "Wiederholungs-Hinweis bei bereits abgeschlossener Kür"): EIN gemeinsamer Pool für die
// Umwandlungs- UND die En-passant-Kür (beide nutzen denselben Schlüssel "kuer-wiederholung"),
// genau dasselbe Prinzip wie INTERAKTIV_HINWEIS_VARIANTEN oben — ein Kind, das beide Kürs
// wiederholt spielt, hört eine gemeinsam fortlaufende Abwechslung statt getrennter, doppelt so
// schnell auslaufender Pools. Bewusst NICHT für Matt in 3 mitverwendet (siehe
// bonus/MattIn3.tsx-Kopfkommentar) — dieses Kapitel bestand schon vor der Hub-Runde und hat
// keine eigene Wiederholungs-Variantenlogik, das anzuflicken wäre ein Eingriff in bereits
// getesteten Code ohne zwingenden Grund.
export const KUER_WIEDERHOLUNG_VARIANTEN: readonly Variante[] = [
  [
    "Schön, dass du nochmal vorbeischaust! Schau genau hin — vielleicht sieht es diesmal ein kleines bisschen anders aus.",
    "Lovely to see you again! Look closely — this time it might look a little different.",
  ],
  [
    "Du bist wieder da! Heute könnte die Aufgabe ein bisschen anders aussehen.",
    "You're back! Today the task might look a bit different.",
  ],
  [
    "Zurück für eine Wiederholung? Manchmal ändert sich die Aufgabe ein kleines bisschen!",
    "Back for another go? Sometimes the task changes just a little!",
  ],
  ["Schaffst du auch diese Variante?", "Can you master this version too?"],
];
