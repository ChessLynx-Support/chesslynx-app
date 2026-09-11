// Paket 3 (2026-09-11): reine Schachlogik des Kapitels „Die ganze Partie" (bonus/GanzePartie.tsx),
// ohne React-Native-Abhängigkeiten — damit verify/test-ganze-partie-logic.cjs genau diese
// Werte gegen das echte chess.js prüfen kann (Testspezifikation: bonuskapitel_ganze_partie_
// umsetzung_2026-09-10.md, Abschnitt 8).

import type { Square } from "chess.js";
import { createPosition } from "../lib/chessEngine";
import { waehleBotZug } from "../lib/waldfreundeBot";

export const GRUNDSTELLUNG = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Screen 4: weißer König f7, Dame g1; schwarzer König h8 allein. Dg6 = Patt, Dg7/Dg8/Dh1/Dh2 = Matt.
export const PATT_STELLUNG = "7k/5K2/8/8/8/8/8/6Q1 w - - 0 1";
export const PATT_ZUG = { von: "g1", nach: "g6" } as const;
export const MATTZUEGE = ["g7", "g8", "h1", "h2"];

// Screen 3: die drei Eröffnungsideen und die festen Antworten der Schildkröte.
export const EROEFFNUNG = [
  { von: "e2", nach: "e4", antwort: ["e7", "e5"], zeile: "Zuerst ein Igel in die Mitte. In der Mitte ist am meisten los." },
  { von: "g1", nach: "f3", antwort: ["b8", "c6"], zeile: "Dann ein Pferd nach vorne – es springt ja über die Igel." },
  { von: "f1", nach: "c4", antwort: ["d7", "d6"], zeile: "Und eine Eule schaut nach draußen. Jetzt haben deine Figuren Platz." },
] as const;

/** Ist der Zug von→nach in dieser Stellung legal? */
export function istLegal(fen: string, von: string, nach: string): boolean {
  return createPosition(fen)
    .moves({ square: von as Square, verbose: true })
    .some((m) => m.to === nach);
}

/** Antwort der Schildkröte in Screen 3: feste Antwort, falls legal, sonst Bot-Stufe 250. */
export function schildkroetenAntwort(fenNachKind: string, zugNr: number): string {
  const spiel = createPosition(fenNachKind);
  if (spiel.isGameOver()) return fenNachKind;
  const fest = EROEFFNUNG[zugNr]?.antwort;
  if (fest && istLegal(fenNachKind, fest[0], fest[1])) {
    spiel.move({ from: fest[0], to: fest[1] });
    return spiel.fen();
  }
  const zug = waehleBotZug(spiel, 250);
  if (zug) spiel.move({ from: zug.from, to: zug.to, promotion: zug.promotion ?? "q" });
  return spiel.fen();
}

// ---------------------------------------------------------------------------------------------
// Paket 3c (2026-09-11): Weitermachen, wo du aufgehört hast.
// Das Kapitel hat fünf Etappen (= Screens 1–5). Gespeichert wird, wie viele fertig sind; es geht
// immer am ANFANG der ersten unfertigen Etappe weiter, nie mitten in einem Satz oder Zug. Die
// Partie (Etappe 5) beginnt bei einer Rückkehr neu — nach Stunden erinnert sich ein Kind nicht
// mehr an eine halbe Stellung.

export const ETAPPEN_ANZAHL = 5;

/** Mit welcher Etappe (1–5) das Kapitel bei `fertig` erledigten Etappen weitergeht. */
export function startEtappeFuer(fertig: number): 1 | 2 | 3 | 4 | 5 {
  const n = Math.max(0, Math.min(ETAPPEN_ANZAHL - 1, Math.floor(fertig || 0)));
  return (n + 1) as 1 | 2 | 3 | 4 | 5;
}

/** Braucht diese Rückkehr den Weitermachen/Von-vorn-Screen? (Nur wenn schon etwas geschafft ist.) */
export function brauchtRueckkehr(fertig: number): boolean {
  return startEtappeFuer(fertig) > 1;
}

export const RUECKKEHR_ZEILEN = [
  "Da bist du ja wieder! Die Schildkröte hat auf dich gewartet.",
  "Schau, so weit sind wir schon gekommen.",
  "Machen wir da weiter? Oder fangen wir ganz von vorn an?",
];
export const RUECKKEHR_ERINNERUNG = [
  "Tipp auf die Schildkröte, dann machen wir weiter.",
  "Oder tipp auf den Kreis-Pfeil, dann fangen wir von vorn an.",
];
export const VON_VORN_ZEILE = "Gut, dann fangen wir ganz von vorn an!";
export const ABSCHIED_ZEILE = "Bis gleich! Die Schildkröte wartet hier auf dich.";

/** Kurzer Brückensatz beim Weitermachen, passend zur Etappe (Etappe 2 braucht keinen). */
export function brueckenZeileFuer(etappe: number): string | null {
  switch (etappe) {
    case 3:
      return "Weißt du noch? Du bist Weiß und fängst an.";
    case 4:
      return "Jetzt zeig ich dir das Seltsame, von dem ich erzählen wollte.";
    case 5:
      return "Die Schildkröte hat die Figuren schon wieder aufgestellt.";
    default:
      return null;
  }
}
