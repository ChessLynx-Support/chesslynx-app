// Neue "klug fliehen"-Logik für den einsamen flüchtenden König in der Wisent-Endspiel-Kür
// (Dame-Matt/Turm-Matt: eigener König + Dame bzw. Turm gegen einen einsamen gegnerischen
// König, siehe chessEngine.ts/WISENT_ENDSPIEL_DAME_POSITIONEN-Kommentar). Bewusst NICHT
// waldfreundeBot.ts wiederverwendet — Christians ausdrückliche Entscheidung bei Rückfrage
// 2026-09-17 (siehe claude/wisent_endspiel_kuer_kuratierung_2026-09-17.md): `waehleBotZug` ist
// farbneutral und bewertet Züge über eine Materialbilanz (`bewerteZug`); für einen nackten
// König ohne jede eigene Nebenfigur haben aber ALLE seine Legalzüge exakt dieselbe (Null-)
// Bilanz, und die dort vorhandene "Endspiel-Hilfe" (`endspielBonus`) greift ausdrücklich nur
// für die MATERIELL ÜBERLEGENE Seite, nie für den fliehenden einsamen König selbst — der
// bestehende Bot würde hier de facto zufällig zwischen den legalen Königszügen wählen.
//
// Heuristik (bewusst einfach, nachvollziehbar und OHNE Suchbaum/Look-ahead — für einen bloßen
// Fluchtzug eines einsamen Königs wäre ein Suchbaum unverhältnismäßiger Aufwand und stünde in
// keinem Verhältnis zum didaktischen Zweck, dieselbe Abwägung wie bei waldfreundeBot.ts/
// bewerteZug, dort aber für echte Materialentscheidungen): von allen legalen Königszügen wird
// der gewählt, der
//   1. (Hauptkriterium, Gewicht 2) die Zentrumsnähe des Zielfelds maximiert — ein König, der
//      sich in der Mitte hält statt sich an den Rand drängen zu lassen, verzögert das
//      unausweichliche Matt am längsten, und
//   2. (zweites Kriterium, Gewicht 1) dabei den Abstand zum gegnerischen König maximiert.
// Das Kind übt damit dieselbe Technik (den König Schritt für Schritt an den Rand treiben), die
// es auch gegen einen perfekt verteidigenden König anwenden müsste — nur in endlich vielen,
// für ein Kind bewältigbaren Zügen statt einem theoretisch unlösbaren Wettlauf. Da diese
// Stellungen ausschließlich aus König + Dame/Turm (eigen) gegen einen einsamen König (Gegner)
// bestehen, hat die am Zug befindliche flüchtende Seite ohnehin nie eine andere Figur als ihren
// eigenen König zu ziehen — `spiel.moves()` liefert für sie deshalb automatisch ausschließlich
// Königszüge.

import { Chess, type Move } from "chess.js";

type Koordinate = { datei: number; reihe: number };

function koordinateVonFeld(feldName: string): Koordinate {
  return { datei: feldName.charCodeAt(0) - "a".charCodeAt(0), reihe: Number(feldName[1]) - 1 };
}

/** Königsabstand (Chebyshev-Distanz, "wie viele Königszüge mindestens dazwischenliegen"). */
function koenigsabstand(a: Koordinate, b: Koordinate): number {
  return Math.max(Math.abs(a.datei - b.datei), Math.abs(a.reihe - b.reihe));
}

const BRETTMITTE: Koordinate = { datei: 3.5, reihe: 3.5 };

function zentrumsabstand(feld: Koordinate): number {
  return Math.max(Math.abs(feld.datei - BRETTMITTE.datei), Math.abs(feld.reihe - BRETTMITTE.reihe));
}

function koenigsfeld(spiel: Chess, farbe: "w" | "b"): string | null {
  for (const zeile of spiel.board()) {
    for (const feld of zeile) {
      if (feld && feld.type === "k" && feld.color === farbe) return feld.square;
    }
  }
  return null;
}

/**
 * Wählt für den gerade am Zug befindlichen, allein flüchtenden König den nach obiger Heuristik
 * besten Legalzug aus — `null`, wenn kein Zug mehr legal ist (Matt oder Patt in der
 * Ausgangsstellung). Führt den Zug bewusst NICHT selbst aus (Konsistenz mit `waehleBotZug` in
 * waldfreundeBot.ts, das den Zug ebenfalls nur AUSWÄHLT) — die aufrufende Stelle
 * (bonus/WisentEndspielKuer.tsx) entscheidet, wann und wie der Zug tatsächlich gespielt wird.
 */
export function waehleFluchtZug(spiel: Chess): Move | null {
  const alleZuege = spiel.moves({ verbose: true }) as Move[];
  if (alleZuege.length === 0) return null;

  const gegnerFarbe: "w" | "b" = spiel.turn() === "w" ? "b" : "w";
  const gegnerKoenigFeld = koenigsfeld(spiel, gegnerFarbe);
  const gegnerKoenigKoordinate = gegnerKoenigFeld ? koordinateVonFeld(gegnerKoenigFeld) : null;

  let bester = alleZuege[0];
  let besteBewertung = -Infinity;
  for (const zug of alleZuege) {
    const ziel = koordinateVonFeld(zug.to);
    const zentrumsNaehe = -zentrumsabstand(ziel); // je näher am Zentrum, desto größer (weniger negativ)
    const abstandZumGegner = gegnerKoenigKoordinate ? koenigsabstand(ziel, gegnerKoenigKoordinate) : 0;
    const bewertung = zentrumsNaehe * 2 + abstandZumGegner * 1;
    if (bewertung > besteBewertung) {
      besteBewertung = bewertung;
      bester = zug;
    }
  }
  return bester;
}
