// Die vierstufige Hinweisleiter für die Übungsspalten.
//
// Konzept: claude/ChessLynx_Motiv_Einfuehrungen_2026-09-19.docx, Teil 4.
//
// ── Warum vier Stufen statt drei ─────────────────────────────────────────────────────────────
// Bisher waren Hinweise faktisch binär: entweder nichts oder die volle Lösung. Die dreistufige
// Eskalation gab es nur in Endlosmodus-Stufe 3. Mit den Lichess-Stellungen wachsen die Bretter
// von drei bis sieben auf acht bis zwanzig Figuren — damit stellt sich eine Frage, die sich bei
// einer Minimalstellung nie stellte: „Wo soll ich überhaupt hinschauen?" Das ist Stufe 0.
//
//   0  Brettbereich   „Schau dir die Figuren oben rechts an."
//   1  das Konzept    „Such einen Zug, der zwei Figuren auf einmal bedroht."
//   2  die Figur      „Dein Springer kann das. Tipp ihn an."
//   3  der Zug        „Zieh den Springer auf das leuchtende Feld."  (+ Zielring)
//
// ── Zwei Regeln, die hier durchgesetzt werden ───────────────────────────────────────────────
//
// KEINE FELDKOORDINATEN, auf keiner Stufe. Ein fünfjähriges Kind liest kein „f6". Es heißt
// immer „das leuchtende Feld", genau wie in allen bestehenden Hinweisen der App.
//
//   → Das behebt zugleich einen Fehler, der seit dem 2026-09-17 im Code stand und seit dem
//     18.09. auch VORGELESEN wurde: hinweisTextFuerStufe3() in EndlosmodusPuzzle.tsx sagte
//     `Ziehe den/die/das ${figurName} nach ${toAlgebraic(ziel)}` — also wörtlich „den/die/das"
//     als nie ersetzter Platzhalter, und dazu die Koordinate. Beides fällt hier weg: die
//     Artikel stehen richtig in der Tabelle unten, das Feld leuchtet statt benannt zu werden.
//
// KEINE FRAGE NACH DEM BESTEN ZUG. Stufe 1 formuliert das ZIEL, nicht die Optimalität — also
// „Such einen Zug, bei dem deine Figur sicher steht", nicht „Finde den besten Zug". Das ist
// dieselbe Festlegung wie in lobAuswahl.ts und geht auf Christians Punkt vom 19.09. zurück:
// Druck entsteht dort, wo das Kind meint, sofort das Maximum finden zu müssen.
//
// ── Warum erzeugt statt gepflegt ────────────────────────────────────────────────────────────
// Sechs Spalten mal 23 Aufgaben sind 138 Hinweisleitern — von Hand 552 Texte. Sie werden
// deshalb aus dem erzeugt, was ohnehin je Aufgabe vorliegt: Lösungszug und Figurenart. Als
// Nebenwirkung verschwindet Befund A.2 der Lückenanalyse (fünf Spalten zeigten einen
// generischen „Erobern"-Hinweis, teils sinnwidrig — „schlage sie" bei einer Aufgabe, die gar
// kein Schlagen verlangt).
//
// Reines TS-Modul ohne React-Import, damit verify/*.cjs es laden und ausführen kann (siehe
// Kopfkommentar von motivEinfuehrungen.ts für die ausführliche Begründung).

import type { MotivId } from "./motivEinfuehrungen";

export type FigurTyp = "p" | "n" | "b" | "r" | "q" | "k";

/** Zweisprachiger Text. Die Auflösung über `t()` passiert in der Komponente. */
export type Zweisprachig = { de: string; en: string };

/**
 * Figurnamen kindgerecht — MIT dem richtigen Artikel im Akkusativ.
 *
 * Der Artikel steht hier und nicht als „den/die/das" im Satz: Deutsch hat drei Geschlechter,
 * und ein vorgelesener Platzhalter ist schlimmer als gar kein Artikel.
 */
const FIGUR: Record<FigurTyp, { de: string; akkusativDe: string; en: string }> = {
  p: { de: "Bauer", akkusativDe: "den Bauern", en: "pawn" },
  n: { de: "Springer", akkusativDe: "den Springer", en: "knight" },
  b: { de: "Läufer", akkusativDe: "den Läufer", en: "bishop" },
  r: { de: "Turm", akkusativDe: "den Turm", en: "rook" },
  q: { de: "Dame", akkusativDe: "die Dame", en: "queen" },
  k: { de: "König", akkusativDe: "den König", en: "king" },
};

export function figurName(typ: FigurTyp): Zweisprachig {
  return { de: FIGUR[typ].de, en: FIGUR[typ].en };
}

/**
 * Grober Brettbereich aus einem Feld — für Stufe 0.
 *
 * Bewusst UNGENAU: Der Hinweis soll die Blickrichtung geben, nicht das Feld verraten.
 * Die Einteilung ist dreiteilig statt geviertelt, damit die Mitte nicht künstlich einer Seite
 * zugeschlagen wird:
 *
 *   Linie  a–c links · d–e in der Mitte · f–h rechts
 *   Reihe  1–3 unten · 4–5 in der Mitte · 6–8 oben
 *
 * Seit der Spiegelung im Filterwerkzeug spielt das Kind in den Übungsspalten immer Weiß, das
 * Brett wird nie gedreht — „oben rechts" heißt deshalb immer dasselbe. Käme je wieder eine
 * Schwarz-am-Zug-Stellung dazu, müsste die Angabe gespiegelt werden.
 */
export function bereichFuerFeld(feld: string): Zweisprachig {
  const linie = feld[0];
  const reihe = Number(feld[1]);

  const senkrecht: Zweisprachig | null =
    reihe <= 3 ? { de: "unten", en: "at the bottom" } : reihe >= 6 ? { de: "oben", en: "at the top" } : null;
  const waagerecht: Zweisprachig | null =
    linie <= "c" ? { de: "links", en: "on the left" } : linie >= "f" ? { de: "rechts", en: "on the right" } : null;

  if (senkrecht && waagerecht) return { de: `${senkrecht.de} ${waagerecht.de}`, en: `${senkrecht.en} ${waagerecht.en}` };
  if (senkrecht) return { de: `${senkrecht.de} in der Mitte`, en: `${senkrecht.en} in the middle` };
  if (waagerecht) return { de: `in der Mitte ${waagerecht.de}`, en: `in the middle ${waagerecht.en}` };
  return { de: "in der Mitte", en: "in the middle" };
}

/** Stufe 1: fest je Motiv, unabhängig von der einzelnen Aufgabe. */
const KONZEPT_ZEILE: Record<MotivId, Zweisprachig> = {
  figurGewinnen: {
    de: "Eine gegnerische Figur hat keinen Beschützer. Finde sie.",
    en: "One of the opponent's pieces has no protector. Find it.",
  },
  gabel: {
    de: "Such einen Zug, der zwei Figuren auf einmal bedroht.",
    en: "Look for a move that threatens two pieces at once.",
  },
  fesselung: {
    de: "Stell deine Figur so hin, dass eine gegnerische nicht mehr weg darf.",
    en: "Place your piece so that one of theirs is no longer allowed to move.",
  },
  spiess: {
    de: "Gib Schach — und schau, wer hinter dem König steht.",
    en: "Give check — and look who is standing behind the king.",
  },
  beschuetzen: {
    de: "Schau bei jeder Figur nach, ob jemand auf sie aufpasst.",
    en: "Check every piece for whether somebody is watching over it.",
  },
  verteidigen: {
    de: "Eine von deinen Figuren ist in Gefahr. Welche?",
    en: "One of your pieces is in danger. Which one?",
  },
};

export type HinweisLage = {
  /** Motiv der Spalte. null = Spalte ohne Motiv (Schach lösen, Rochade). */
  motivId: MotivId | null;
  /** Art der Figur, die den Lösungszug macht. */
  figurTyp: FigurTyp | null;
  /**
   * Alle gültigen Zielfelder, algebraisch. Beim Verteidigen sind das viele und ALLE richtig:
   * Wenn eine bedrohte Figur auf fünfzehn sichere Felder fliehen kann, sind fünfzehn Antworten
   * richtig. Die Spalte muss sie alle annehmen — sonst zieht das Kind etwas objektiv Richtiges
   * und bekommt kein Erfolgserlebnis. Genau diese Sorte Ärgernis steckte hinter dem
   * Fesselungs-Befund vom 16.09.
   */
  zielFelder: readonly string[];
};

export const HOECHSTE_HINWEISSTUFE = 3;
export type Hinweisstufe = 0 | 1 | 2 | 3;

/**
 * Der Text zur Stufe. Gibt null zurück, wenn zu dieser Lage nichts Sinnvolles sagbar ist —
 * dann überspringt der Aufrufer die Stufe, statt einen leeren Platzhalter vorzulesen.
 */
export function hinweisText(stufe: Hinweisstufe, lage: HinweisLage): Zweisprachig | null {
  switch (stufe) {
    case 0: {
      // Bei mehreren Zielfeldern (Verteidigen) hilft ein einzelner Bereich nicht weiter —
      // die Rettungsfelder liegen verstreut. Dann gleich das Konzept.
      if (lage.zielFelder.length !== 1) return null;
      const b = bereichFuerFeld(lage.zielFelder[0]);
      return {
        de: `Schau dir die Figuren ${b.de} an.`,
        en: `Have a look at the pieces ${b.en}.`,
      };
    }
    case 1:
      return lage.motivId ? KONZEPT_ZEILE[lage.motivId] : null;
    case 2: {
      if (!lage.figurTyp) return null;
      const f = FIGUR[lage.figurTyp];
      return {
        de: `Dein ${f.de} kann das. Tipp ihn an.`,
        en: `Your ${f.en} can do it. Tap it.`,
      };
    }
    case 3: {
      if (!lage.figurTyp) return null;
      const f = FIGUR[lage.figurTyp];
      // Kein Feldname, nie. Das Feld leuchtet — die Komponente blendet dazu den Zielring ein.
      if (lage.zielFelder.length > 1) {
        return {
          de: `Zieh ${f.akkusativDe} auf eines der leuchtenden Felder. Hier gibt es mehrere richtige Antworten.`,
          en: `Move your ${f.en} to one of the glowing squares. There are several right answers here.`,
        };
      }
      return {
        de: `Zieh ${f.akkusativDe} auf das leuchtende Feld.`,
        en: `Move your ${f.en} to the glowing square.`,
      };
    }
  }
}

/**
 * Die nächste Stufe, zu der es etwas zu sagen gibt.
 *
 * Nötig, weil einzelne Stufen je nach Lage entfallen (Stufe 0 bei mehreren Zielfeldern,
 * Stufe 1 ohne Motiv). Ohne diese Funktion müsste das Kind einen Knopf drücken, auf den nichts
 * passiert — und würde beim nächsten Mal nicht mehr drücken.
 */
export function naechsteStufeMitText(ab: Hinweisstufe, lage: HinweisLage): Hinweisstufe | null {
  for (let s = ab; s <= HOECHSTE_HINWEISSTUFE; s++) {
    if (hinweisText(s as Hinweisstufe, lage)) return s as Hinweisstufe;
  }
  return null;
}

/**
 * Welche Stufe ein Kind bekommt, das mehrfach danebengetippt hat, ohne einen Hinweis
 * anzufordern.
 *
 * Der bestehende Fehlversuchszähler bleibt damit als ZUSÄTZLICHER Auslöser erhalten (bisher
 * 0/3/6 in EndlosmodusPuzzle.tsx, hier auf die vier Stufen umgelegt). Wer oft danebentippt,
 * bekommt die nächste Stufe auch ohne sie anzufordern — der Hinweisknopf bleibt trotzdem der
 * schnellere Weg, und die höhere der beiden Stufen gewinnt.
 */
export function stufeAusFehlversuchen(fehlversuche: number): Hinweisstufe {
  if (fehlversuche >= 8) return 3;
  if (fehlversuche >= 5) return 2;
  if (fehlversuche >= 2) return 1;
  return 0;
}
