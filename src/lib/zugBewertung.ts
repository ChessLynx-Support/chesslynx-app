// Dreiteilige Rückmeldung auf einen Zug: stark / in Ordnung / verschenkt.
//
// ── Der Auftrag ──────────────────────────────────────────────────────────────────────────────
// Christian, 2026-09-19: „nicht immer der beste Zug ist entscheidend, sondern es ist wichtiger
// wenig ungenaue/schlechte Züge zu spielen — um nicht zu viel Druck aufzubauen, beim Schachspiel
// stets die besten Züge direkt am Anfang finden zu müssen."
//
// ── Wo der Druck heute wirklich entsteht ────────────────────────────────────────────────────
// Nicht bei einer Fehlermeldung — die gibt es bewusst nicht. Der Druck entsteht durch SCHWEIGEN:
// Ist bei einer Aufgabe ein Zielfeld gesetzt, zählt nur ein Zug genau dorthin als gelöst. Jeder
// andere legale Zug wird ausgeführt, das Brett ändert sich — und es passiert nichts. Ein Kind,
// das einen völlig vernünftigen Zug gespielt hat, bekommt dieselbe Nicht-Antwort wie eines, das
// eine Figur verschenkt hat. Beim Verteidigen ist das besonders krass: Dort sind im Schnitt
// zwölf bis sechzehn Zielfelder sicher, aber nur eines gilt.
//
// Deshalb hier die dritte Unterscheidung. Sie ist zur Laufzeit berechenbar, ohne Engine.
//
// ── Wie gerechnet wird, und was das NICHT ist ───────────────────────────────────────────────
// Das ist KEINE Stellungsbewertung. Es ist eine Ein-Zug-Frage: Kann der Gegner unmittelbar nach
// diesem Zug etwas von mir schlagen, ohne dafür genug zu bezahlen — und habe ich mit dem Zug
// selbst genug eingenommen, um das aufzuwiegen?
//
//   verlust  = das Beste, was der Gegner jetzt schlagen kann, abzüglich dessen, was er dabei
//              verliert, falls ich zurückschlagen kann.
//   gewinn   = was ich mit meinem Zug selbst geschlagen habe.
//   verschenkt  ⟺  gewinn − verlust < 0
//
// Bewusst über die ECHTEN LEGALZÜGE des Gegners gerechnet, nicht über `attackers()`: Gebe ich
// mit meinem Zug Schach, kann der Gegner meine scheinbar hängende Figur oft gar nicht nehmen,
// und eine gefesselte gegnerische Figur schlägt ebenfalls nicht. `attackers()` sieht beides
// nicht und würde das Kind für einen guten Zug tadeln — der schlimmste denkbare Fehler an
// dieser Stelle.
//
// Die Grenzen, offen benannt: Es wird nur ein Halbzug tief geschaut, Abzugsangriffe und
// Zwischenzüge bleiben unsichtbar, und eine Rückeroberungskette wird nur bis zum ersten
// Zurückschlagen gerechnet. Für die Frage „hat das Kind gerade etwas verschenkt?" reicht das;
// für eine Zugempfehlung würde es nicht reichen — als solche wird es auch nirgends benutzt.
//
// Reines TS-Modul (nur chess.js), damit verify/*.cjs es laden und ausführen kann.

import { Chess } from "chess.js";

export type ZugUrteil =
  /** Der vorgesehene Lösungszug. */
  | "stark"
  /** Sicher, nur nicht der stärkste. Bekommt Lob, keinen Tadel. */
  | "inOrdnung"
  /** Verliert Material. Bekommt einen Hinweis, nie ein „falsch". */
  | "verschenkt";

// Der König steht mit 0 in der Tabelle, und das ist reine Vorsicht: Ein Eintrag für ihn wird
// nie gebraucht. chess.js erzeugt keinen Zug mit `captured === "k"` (ein König wird nicht
// geschlagen), und ein König als SCHLAGENDE Figur kommt in der Rückschlag-Rechnung nicht vor,
// weil ein Königsschlag auf ein gedecktes Feld gar nicht legal ist. Der Wert ist deshalb auch
// nicht testbar — die Gegenprobe vom 19.09. (Königswert auf 9 gesetzt) blieb folgerichtig
// grün. Der Test sichert stattdessen die Eigenschaft ab, auf der das beruht.
const WERT: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Was der Gegner in dieser Stellung im besten Fall gewinnt, wenn er am Zug ist.
 *
 * Der König zählt mit 0: Ihn kann niemand schlagen, und ein Schach ist kein Materialverlust.
 */
export function groessterVerlust(fen: string): number {
  const brett = new Chess(fen);
  let schlimmstes = 0;
  for (const zug of brett.moves({ verbose: true })) {
    if (!zug.captured) continue;
    const beute = WERT[zug.captured] ?? 0;
    // Kann ich auf demselben Feld zurückschlagen? Dann zahlt der Gegner den Wert seiner
    // schlagenden Figur mit.
    const danach = new Chess(fen);
    danach.move({ from: zug.from, to: zug.to, promotion: "q" });
    const kannZurueck = danach.moves({ verbose: true }).some((z) => z.to === zug.to && z.captured);
    const netto = kannZurueck ? beute - (WERT[zug.piece] ?? 0) : beute;
    if (netto > schlimmstes) schlimmstes = netto;
  }
  return schlimmstes;
}

export type ZugLage = {
  /** Stellung VOR dem Zug. */
  fen: string;
  von: string;
  nach: string;
  /** Die Zielfelder, die als Lösung gelten. Leer = jeder legale Zug löst. */
  zielFelder: readonly string[];
  /** Ausgangsfeld der Lösungsfigur, falls die Aufgabe eine bestimmte Figur verlangt. */
  loesungsFigurFeld?: string;
};

/**
 * Ordnet einen gespielten Zug ein.
 *
 * Reihenfolge ist Absicht: Zuerst wird geprüft, ob es der Lösungszug ist. Ein Lösungszug bleibt
 * „stark", auch wenn er kurzfristig Material einstellt — genau das ist bei einer Gabel oder
 * einem Spieß oft der Punkt (der Springer stellt sich mitten ins Feld). Die Materialrechnung
 * darf dem Kind nicht den eigenen Lehrzug madig machen.
 */
export function bewerteZug(lage: ZugLage): ZugUrteil {
  const trifftZiel = lage.zielFelder.length === 0 || lage.zielFelder.includes(lage.nach);
  const richtigeFigur = !lage.loesungsFigurFeld || lage.loesungsFigurFeld === lage.von;
  if (trifftZiel && richtigeFigur) return "stark";

  const brett = new Chess(lage.fen);
  // chess.js 1.4 WIRFT bei einem illegalen Zug, es liefert kein null zurück — ohne dieses
  // try/catch würde die Ausnahme bis in den Render-Baum durchschlagen und die Aufgabe
  // abstürzen lassen. Über das Brett ist das zwar nicht erreichbar (Board bietet nur
  // Legalzüge an), aber eine Einordnung ist der letzte Ort, an dem ein Absturz stehen darf:
  // Sie läuft als Reaktion auf jeden Zug des Kindes.
  let zug;
  try {
    zug = brett.move({ from: lage.von, to: lage.nach, promotion: "q" });
  } catch {
    zug = null;
  }
  // Im Zweifel die freundliche Antwort. Ein stillschweigendes „verschenkt" wäre hier die
  // falscheste aller Möglichkeiten.
  if (!zug) return "inOrdnung";

  const gewinn = zug.captured ? WERT[zug.captured] ?? 0 : 0;
  const verlust = groessterVerlust(brett.fen());
  return gewinn - verlust < 0 ? "verschenkt" : "inOrdnung";
}

// ── Die Sprechzeilen ────────────────────────────────────────────────────────────────────────
//
// Rotierende Pools nach dem Vorbild von HINWEIS_FEHLGRIFF_VARIANTEN in bonus/Figurenwert.tsx
// („Die ist auch okay, aber schau noch mal, welche höher steht!") — derselbe Ton, dieselbe
// Bauart, nur an einer Stelle, an der es heute gar keine Rückmeldung gibt.
//
// Beim „verschenkt"-Pool gilt durchgehend: kein „falsch", kein „leider". DIE FIGUR ist das
// Problem, nicht das Kind.

export const IN_ORDNUNG_ZEILEN: readonly { de: string; en: string }[] = [
  { de: "Guter Zug! Deine Figur steht sicher.", en: "Good move! Your piece is safe." },
  {
    de: "Das war in Ordnung. Ich zeig dir noch einen, der noch mehr bringt.",
    en: "That was fine. Let me show you one that does even more.",
  },
  {
    de: "Passt! Hier ging sogar noch ein bisschen mehr — schau mal.",
    en: "That works! There was even a bit more here — have a look.",
  },
  {
    de: "Nichts verschenkt. Sehr gut. Und jetzt der starke Zug.",
    en: "Nothing given away. Very good. And now the strong move.",
  },
];

export const VERSCHENKT_ZEILEN: readonly { de: string; en: string }[] = [
  { de: "Oh, pass auf — die Figur kann jetzt geschlagen werden.", en: "Oh, careful — that piece can be captured now." },
  { de: "Schau noch mal: Wer passt auf sie auf? Niemand.", en: "Have another look: who is watching over it? Nobody." },
  { de: "Probier einen Zug, bei dem sie sicher steht.", en: "Try a move that leaves it standing safely." },
];

/**
 * Die einmalige Ansage vor der ersten Taktik-Spalte. Der ganze Punkt in vier Sätzen.
 *
 * Steht hier und nicht in der Komponente, weil sie zur selben Festlegung gehört wie die Pools
 * oben — und weil ein Test sie so mit denselben Sprachregeln prüfen kann.
 */
export const KEIN_DRUCK_ANSAGE: readonly { de: string; en: string }[] = [
  {
    de: "Beim Schach musst du nicht immer den allerbesten Zug finden.",
    en: "In chess you don't always have to find the very best move.",
  },
  { de: "Das schafft niemand. Auch große Schachmeister nicht.", en: "Nobody manages that. Not even great chess masters." },
  { de: "Wichtig ist etwas anderes: Verschenk keine Figuren.", en: "Something else matters: don't give pieces away." },
  { de: "Wer wenig verschenkt, gewinnt ganz oft von allein.", en: "If you give little away, you often win all by yourself." },
];

/**
 * Wählt eine Zeile aus einem Pool. `zaehler` ist ein fortlaufender Wert der aufrufenden
 * Komponente — dasselbe Rotationsprinzip wie luxVarianten.ts, nur ohne dessen globalen
 * Zustand, damit dieses Modul rein bleibt und im Test vorhersagbar ist.
 */
export function zeileAusPool(
  pool: readonly { de: string; en: string }[],
  zaehler: number
): { de: string; en: string } {
  return pool[Math.abs(Math.trunc(zaehler)) % pool.length];
}
