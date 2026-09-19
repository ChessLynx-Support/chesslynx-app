// Laufzeit-Komponente für eine einzelne Endlosmodus-Aufgabe (siehe lib/endlosmodusAufgaben.tsx
// für die Brett-Konfigurationen und dortigen Kommentar, warum dies NICHT einfach
// QuestMoveScreen.tsx wiederverwendet: volle FEN-Validierung statt `createPosition()`s
// skipValidation, und bedrohtAt/angreiferAt unabhängig von der ziehenden Figur).
//
// Nachtrag (2026-09-18, Christian: "Sprachausgabe Deutsch vervollständigen", siehe claude/
// sprachausgabe_nichtueberspringbarkeit_audit_2026-09-18.md, Fund P2): Bis hierhin galt
// "Bewusst OHNE Lux-Sprechzeile — wie schon screens/Revier.tsx" (siehe dortiger, jetzt
// überholter Kommentar), weil für den Endlosmodus noch keine freigegebene Sprechzeile
// existierte. Die Spalten-Einführung (Begriff + knappe Erklärung, z. B. "Das ist eine
// Gabel...") spricht jetzt screens/EndlosmodusSpalte.tsx beim Betreten der Spalte — hier
// (pro Einzelaufgabe) wird zusätzlich der ohnehin schon angezeigte Hinweistext (siehe
// `hinweisText` unten) laut vorgelesen, sobald das Kind auf "💡 Hinweis" tippt. Bewusst KEIN
// `onFertig`/keine Sperre für die Brett-Eingabe währenddessen: Anders als eine Einführung ist
// ein Hinweis eine vom Kind selbst angeforderte Zusatzinfo, kein Pflichttext — das Kind darf
// weiterprobieren, während Lux ihn vorliest. Die Erfolgsrückmeldung selbst bleibt weiterhin
// rein visuell/haptisch über QuestGeschafft (Funkeln + Haptik + Klang), ohne eigene
// gesprochene Zeile — dafür gibt es (wie überall sonst) keinen Text, der sie bräuchte.
//
// Nachtrag (2026-09-17, Christian: "Hinweise von Lux, falls der gesuchte Zug nicht gefunden
// wird und direkt die Möglichkeit, es nochmal zu probieren", siehe claude/taktik_
// schwierigkeitseskalation_konzept_2026-09-16.md):
//   1. "Nochmal versuchen" — ein Zug auf ein zusätzliches, aber nicht lösendes Legalfeld
//      (siehe endlosmodusAufgaben.tsx, `zielTargets`) bewegt die Figur bewusst wirklich
//      dorthin und die Übung geht von der neuen Position weiter (kein Fehler, keine
//      Bestrafung). Das kann ein Kind aber in eine Stellung bringen, aus der der eigentliche
//      Lernzug nicht mehr sichtbar ist (die Zielfigur ist z. B. nicht mehr erreichbar) — der
//      Reset-Knopf lädt exakt die ursprüngliche FEN erneut, ohne den Screen zu verlassen.
//   2. Hinweis-Knopf — NUR ein generischer, stufenabhängiger Text (kein Audio, keine
//      Lux-Sprechzeile, siehe Kommentar oben, warum das hier noch nicht existiert), und NUR
//      bei den Erobern-Eskalationsaufgaben (`aufgabe.stufe` gesetzt) sichtbar, respektiert den
//      Eltern-Schalter "Hinweise von Lux" (useHinweiseAktiv, wie überall sonst in der App).
//      Der Text wird bewusst hier zur Laufzeit gebaut, nicht in endlosmodusAufgaben.tsx
//      eingebrannt (siehe dortiger Kommentar zu `stufe`, "FUNKTION statt Konstante").
//
// Nachtrag (2026-09-17, Stufe-3-Interaktionsmodell, siehe claude/
// stufe3_interaktionsmodell_konzept_2026-09-17.md — Christians Rückmeldung beim Vorstellen
// der Gefährten-Motive-Kuration): bei STUFE 3 (alle Motive, auch rückwirkend Eichhörnchen-/
// Dachshöhle-Erobern) darf das Kind jede eigene Figur antippen und deren Legalzüge sehen
// (`figurenAusFen`/`iconFuer`, wiederverwendet aus quest6/SchachAufgabe.tsx) — anders als bei
// Stufe 1/2, wo weiterhin nur `aufgabe.pieceAt` ziehen darf. Tippt das Kind ein Zielfeld an,
// das NICHT genau `aufgabe.pieceAt` -> `aufgabe.zielTargets[0]` ist, wird NICHTS am Brett
// verändert (kein `game.move()`) — Board.tsx animiert die Figur zwar kurz zum angetippten
// Feld, "snapt" sie danach aber automatisch zurück, weil sich `pieceAt` nicht ändert. Grund
// (Christians eigener Einwand): ein wirklich ausgeführter falscher Zug könnte z. B. den
// eigenen König verschieben und die Taktik kaputt machen, obwohl die feste Zielfeld-Prüfung
// den späteren richtigen Zug trotzdem als gelöst werten würde. Jeder abgewiesene Fehlversuch
// schaltet automatisch die nächste Hinweisstufe frei. ÜBERHOLT seit dem 2026-09-19: Die
// Stufenlogik liegt jetzt in lib/hinweisLeiter.ts und ist vierstufig; der Fehlversuchszähler
// bleibt als zusätzlicher Auslöser erhalten (stufeAusFehlversuchen), die höhere von
// angeforderter und erarbeiteter Stufe gewinnt.
//
// Ebenfalls geändert: Der Hinweisknopf erscheint jetzt überall dort, wo die Leiter etwas zu
// sagen hat — also auch in den fünf klassischen Drei-Aufgaben-Spalten, die bisher gar keinen
// hatten (der Knopf hing an `aufgabe.stufe !== undefined`). Der Eltern-Schalter "Hinweise von
// Lux" (useHinweiseAktiv) bleibt die übergeordnete Bedingung wie überall sonst.

// Nachtrag (2026-09-19, Christian: "nicht immer der beste Zug ist entscheidend, sondern es ist
// wichtiger wenig ungenaue/schlechte Züge zu spielen — um nicht zu viel Druck aufzubauen"):
//
// 1. DREITEILIGE RÜCKMELDUNG statt zweiteiliger. Bisher galt: gelöst oder Schweigen. Wer einen
//    völlig vernünftigen, aber nicht vorgesehenen Zug spielte, bekam dieselbe Nicht-Antwort wie
//    jemand, der eine Figur verschenkt hat — und genau dieses Schweigen erzeugt den Druck, immer
//    sofort das Maximum finden zu müssen. Jetzt: stark / in Ordnung / verschenkt, berechnet in
//    lib/zugBewertung.ts (reines Modul, testbar).
//
// 2. VIERSTUFIGE HINWEISLEITER statt der bisherigen drei Stufen, erzeugt statt gepflegt (siehe
//    lib/hinweisLeiter.ts). Neu ist vor allem Stufe 0 — "wo soll ich überhaupt hinschauen": eine
//    Frage, die sich bei drei bis sieben Figuren nie stellte, bei den Lichess-Stellungen mit acht
//    bis zwanzig aber sofort.
//
// 3. ZWEI FEHLER IM BISHERIGEN HINWEISTEXT MIT BEHOBEN. `hinweisTextFuerStufe3` sagte
//    `Ziehe den/die/das ${figurName} nach ${toAlgebraic(ziel)}` — also wörtlich "den/die/das"
//    als nie ersetzter Platzhalter, und dazu eine Feldkoordinate ("f6"), die ein fünfjähriges
//    Kind nicht lesen kann. Solange der Text nur angezeigt wurde, fiel es nicht auf; seit dem
//    18.09. wird er VORGELESEN. Beides fällt mit der neuen Leiter weg: richtige Artikel, und das
//    Zielfeld leuchtet, statt benannt zu werden.

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Chess } from "chess.js";
import { Board, type BoardConfig } from "../quest1/Board";
import { legalTargetsFor, toAlgebraic, tryMove, type BoardSquare } from "./chessEngine";
import { figurenAusFen, iconFuer } from "../quest6/SchachAufgabe";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { SternIcon } from "./sternenleiter";
import { t } from "./sprache";
import { useHinweiseAktiv } from "./luxHinweis";
import { useLuxSprechzeile } from "./useLuxSprechzeile";
import type { EndlosmodusAufgabe } from "./endlosmodusAufgaben";
import type { MotivId } from "./motivEinfuehrungen";
import {
  hinweisText as hinweisZeile,
  naechsteStufeMitText,
  stufeAusFehlversuchen,
  type FigurTyp as HinweisFigurTyp,
  type Hinweisstufe,
} from "./hinweisLeiter";
import { bewerteZug, zeileAusPool, IN_ORDNUNG_ZEILEN, VERSCHENKT_ZEILEN } from "./zugBewertung";

/** Dauer der Erfolgs-Überlagerung, bevor onSolved() feuert — kurz genug, um nicht zu
 *  bremsen, lang genug, damit Funkeln/Wippen (siehe QuestGeschafft) tatsächlich gesehen
 *  werden. Kein Warten auf eine Sprechzeile nötig (siehe Kommentar oben), deshalb ein
 *  fester Wert statt der Lux-Timing-Logik aus QuestMoveScreen.tsx. */
const ERFOLG_ANZEIGE_MS = 900;

const gleich = (a?: BoardSquare, b?: BoardSquare) => Boolean(a && b && a.row === b.row && a.col === b.col);

// Die drei früheren Hinweistext-Funktionen (hinweisTextFuerStufe, stufe3HinweisStufe,
// hinweisTextFuerStufe3) samt FIGUR_NAME_DE/EN und grobesBrettfeld sind am 2026-09-19 nach
// lib/hinweisLeiter.ts gewandert — als erzeugte vierstufige Leiter statt dreier von Hand
// gepflegter Texte (siehe Datei-Kopfkommentar Punkt 2 und 3). Dort sind sie testbar; hier waren
// sie es nicht, und genau deshalb stand dort zwei Tage lang "den/die/das" im gesprochenen Text.

/** Figurenart auf einem Feld, aus der FEN gelesen — für Stufe 2/3 der Hinweisleiter. */
function figurTypAuf(fen: string, feld: BoardSquare): HinweisFigurTyp | null {
  const stein = new Chess(fen).get(toAlgebraic(feld));
  return stein ? (stein.type as HinweisFigurTyp) : null;
}

export function EndlosmodusPuzzle({
  aufgabe,
  onSolved,
  motivId = null,
  onVerschenkt,
}: {
  aufgabe: EndlosmodusAufgabe;
  onSolved: () => void;
  /** Motiv der Spalte — speist Stufe 1 der Hinweisleiter. null = Spalte ohne Motiv. */
  motivId?: MotivId | null;
  /**
   * Meldet, dass das Kind in dieser Aufgabe Material eingestellt hat. Bewusst nur ein Signal
   * nach oben, kein Schreibzugriff von hier: Der Zähler hängt an Spalte und Stufe, und die
   * kennt nur der aufrufende Screen (siehe meldeFigurVerschenkt in endlosmodusFortschritt.ts).
   *
   * KEIN Fehlerzähler im alten Sinn — er wird dem Kind nie gezeigt und hat keine Folge für den
   * Fortschritt. Er dient allein dazu, am Stufenende etwas Wahres sagen zu können.
   */
  onVerschenkt?: () => void;
}) {
  const hinweiseAktiv = useHinweiseAktiv();
  const istStufe3 = aufgabe.stufe === 3;
  // Bumpt bei "Nochmal versuchen" — siehe Datei-Kopfkommentar Punkt 1. Als Dependency neben
  // aufgabe.fen unten, damit ein Reset dieselbe Ausgangsstellung ohne Navigationswechsel neu
  // lädt (game selbst muss dafür neu erzeugt werden, chess.js-Objekte sind mutierbar).
  const [resetSchluessel, setResetSchluessel] = useState(0);
  const [hinweisSichtbar, setHinweisSichtbar] = useState(false);

  // Volle Validierung (siehe Datei-Kopfkommentar) — bewusst NICHT createPosition().
  const game = useMemo(() => new Chess(aufgabe.fen), [aufgabe.fen, resetSchluessel]);
  // Stufe 1/2 (unverändertes Ein-Figur-Modell): `ort` ist die einzige ziehbare Figur.
  const [ort, setOrt] = useState<BoardSquare>(aufgabe.pieceAt);
  const [legalTargets, setLegalTargets] = useState<BoardSquare[]>(() => legalTargetsFor(game, aufgabe.pieceAt));
  // Stufe 3 (neues Mehrfachauswahl-Modell, siehe Datei-Kopfkommentar): `ausgewaehlt` ist die
  // GERADE angetippte eigene Figur (Start: die Lösungsfigur), `fehlversuche` zählt jeden
  // abgewiesenen Zug auf ein falsches Ziel (egal welche Figur).
  const [ausgewaehlt, setAusgewaehlt] = useState<BoardSquare>(aufgabe.pieceAt);
  const [fehlversuche, setFehlversuche] = useState(0);
  const [geloest, setGeloest] = useState(false);
  // Wie oft das Kind den Hinweisknopf gedrückt hat. Zusammen mit den Fehlversuchen ergibt das
  // die wirksame Stufe (die höhere von beiden gewinnt, siehe unten) — wer oft danebentippt,
  // bekommt mehr Hilfe auch ohne zu fragen, wer fragt, bekommt sie sofort.
  const [hinweisAbrufe, setHinweisAbrufe] = useState(0);
  // Die dreiteilige Rückmeldung auf einen nicht lösenden Zug (siehe Datei-Kopfkommentar).
  const [rueckmeldung, setRueckmeldung] = useState<{ art: "inOrdnung" | "verschenkt"; nummer: number } | null>(null);
  // Zählt jede gegebene Rückmeldung, damit die Pools rotieren statt sich zu wiederholen.
  const rueckmeldungsZaehler = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nur für Stufe 3 gebraucht (siehe Datei-Kopfkommentar) — für Stufe 1/2 bleibt dies ein
  // leeres Array, kostet also praktisch nichts.
  const figuren = useMemo(() => (istStufe3 ? figurenAusFen(aufgabe.fen) : []), [aufgabe.fen, resetSchluessel, istStufe3]);

  useEffect(() => {
    setOrt(aufgabe.pieceAt);
    setLegalTargets(legalTargetsFor(game, aufgabe.pieceAt));
    setAusgewaehlt(aufgabe.pieceAt);
    setFehlversuche(0);
    setGeloest(false);
    setHinweisSichtbar(false);
    setHinweisAbrufe(0);
    setRueckmeldung(null);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgabe.fen, resetSchluessel]);

  const ausgewaehlteFigur = figuren.find((f) => gleich(f.at, ausgewaehlt));
  const zielFeld = aufgabe.zielTargets?.[0];

  // ── Hinweisleiter (siehe lib/hinweisLeiter.ts) ───────────────────────────────────────────
  const hinweisLage = useMemo(
    () => ({
      motivId,
      figurTyp: figurTypAuf(aufgabe.fen, aufgabe.pieceAt),
      zielFelder: (aufgabe.zielTargets ?? []).map(toAlgebraic) as string[],
    }),
    [aufgabe.fen, aufgabe.pieceAt, aufgabe.zielTargets, motivId]
  );
  // Die höhere von beiden gewinnt: angeforderte Stufe und die aus Fehlversuchen abgeleitete.
  const gewuenschteStufe = Math.max(hinweisAbrufe, stufeAusFehlversuchen(fehlversuche)) as Hinweisstufe;
  // Einzelne Stufen entfallen je nach Lage (Stufe 0 bei mehreren richtigen Zielfeldern, Stufe 1
  // ohne Motiv) — dann die nächste, zu der es etwas zu sagen gibt. Sonst drückt das Kind einen
  // Knopf, auf den nichts passiert, und drückt ihn kein zweites Mal.
  const aktuelleHinweisstufe = naechsteStufeMitText(
    Math.min(gewuenschteStufe, 3) as Hinweisstufe,
    hinweisLage
  );
  // Volle Empfehlung (Hinweisstufe 3): die Lösungsfigur ist automatisch ausgewählt (siehe
  // Hinweis-Knopf unten) und ihr korrektes Zielfeld trägt die goldene Sammel-Markierung
  // (dieselbe, die z. B. SchachAufgabe.tsx für `hinweisZug` nutzt).
  // Auf Stufe 3 leuchtet das Zielfeld — "das leuchtende Feld" in der Sprechzeile ist damit
  // wörtlich wahr, und es braucht keine Koordinate. Gilt jetzt für ALLE Stufen der Aufgabe,
  // nicht mehr nur für Eskalationsstufe 3.
  const zeigeVolleEmpfehlung = hinweisSichtbar && aktuelleHinweisstufe === 3;

  const config: BoardConfig = istStufe3
    ? {
        rows: 8,
        cols: 8,
        pieceAt: ausgewaehlt,
        legalTargets: geloest ? [] : legalTargetsFor(game, ausgewaehlt),
        pieceIcon: ausgewaehlteFigur ? iconFuer(ausgewaehlteFigur.typ, ausgewaehlteFigur.farbe) : aufgabe.pieceIcon,
        zusatzfiguren: figuren
          .filter((f) => !gleich(f.at, ausgewaehlt))
          .map((f) => ({ at: f.at, icon: iconFuer(f.typ, f.farbe) })),
        kettenlinie: aufgabe.kettenlinie,
        bedrohtAt: aufgabe.bedrohtAt,
        angreiferAt: aufgabe.angreiferAt,
        sammelAt: zeigeVolleEmpfehlung ? zielFeld : undefined,
      }
    : {
        rows: 8,
        cols: 8,
        pieceAt: ort,
        legalTargets,
        pieceIcon: aufgabe.pieceIcon,
        opponentAt: aufgabe.opponentAt,
        opponentIcon: aufgabe.opponentAt ? aufgabe.opponentIcon : undefined,
        zusatzfiguren: aufgabe.zusatzfiguren,
        kettenlinie: aufgabe.kettenlinie,
        bedrohtAt: aufgabe.bedrohtAt,
        angreiferAt: aufgabe.angreiferAt,
        sammelAt: zeigeVolleEmpfehlung ? zielFeld : undefined,
      };

  /**
   * Ordnet einen nicht lösenden Zug ein und merkt sich die passende Rückmeldung.
   *
   * Das ist die eigentliche Umsetzung von Christians Punkt: „Nicht immer den besten Zug finden
   * müssen" ist kein Satz, den man sagt — es ist eine Rückmeldung, die man gibt.
   */
  function meldeZugZurueck(von: BoardSquare, nach: BoardSquare) {
    const urteil = bewerteZug({
      fen: game.fen(),
      von: toAlgebraic(von),
      nach: toAlgebraic(nach),
      zielFelder: hinweisLage.zielFelder,
      loesungsFigurFeld: toAlgebraic(aufgabe.pieceAt),
    });
    if (urteil === "stark") return;
    rueckmeldungsZaehler.current += 1;
    setRueckmeldung({ art: urteil, nummer: rueckmeldungsZaehler.current });
    if (urteil === "verschenkt") onVerschenkt?.();
  }

  function handleCorrectMove(target: BoardSquare) {
    if (geloest) return;
    if (istStufe3) {
      const istLoesung = gleich(ausgewaehlt, aufgabe.pieceAt) && (!aufgabe.zielTargets || gleich(zielFeld, target));
      if (!istLoesung) {
        // Bewusst KEIN tryMove()/game.move() hier (siehe Datei-Kopfkommentar): Board.tsx
        // animiert die Figur kurz zum angetippten Feld, "snapt" sie danach aber automatisch
        // zurück, weil sich `pieceAt` (=ausgewaehlt) nicht ändert — am Brett/an game.fen()
        // ändert sich dadurch nichts, nur der Fehlversuchszähler steigt.
        //
        // Nachtrag 2026-09-19: Eingeordnet wird trotzdem. Der Zug wird zwar nicht ausgeführt,
        // aber das Kind hat ihn gemeint — und die stumme Rücknahme ohne jedes Wort war genau
        // die Nicht-Antwort, um die es hier geht.
        meldeZugZurueck(ausgewaehlt, target);
        setFehlversuche((v) => v + 1);
        return;
      }
      const ergebnis = tryMove(game, ausgewaehlt, target);
      if (!ergebnis.ok) return; // sollte dank legalTargets nicht vorkommen, sicherheitshalber geprüft
      setGeloest(true);
      timerRef.current = setTimeout(onSolved, ERFOLG_ANZEIGE_MS);
      return;
    }
    // Vor tryMove(): bewerteZug() braucht die Stellung VOR dem Zug, und `game` ist mutierbar.
    meldeZugZurueck(ort, target);
    const ergebnis = tryMove(game, ort, target);
    if (!ergebnis.ok) return; // sollte dank legalTargets nicht vorkommen, sicherheitshalber geprüft
    // Bugfix (Gerätetest 2026-09-16, siehe EndlosmodusAufgabe.zielTargets-Kommentar): ist ein
    // Zielfeld-Set benannt, zählt nur ein Zug DORTHIN als gelöst. Jeder andere angebotene
    // Legalzug bewegt die Figur trotzdem wirklich (nichts wird versteckt/verboten) — die
    // Übung geht von der neuen Position aus einfach weiter, ohne Wertung oder Bestrafung.
    const istZiel =
      !aufgabe.zielTargets || aufgabe.zielTargets.some((z) => z.row === target.row && z.col === target.col);
    if (!istZiel) {
      setOrt(target);
      setLegalTargets(legalTargetsFor(game, target));
      return;
    }
    setRueckmeldung(null);
    setGeloest(true);
    timerRef.current = setTimeout(onSolved, ERFOLG_ANZEIGE_MS);
  }

  /** Stufe 3 (siehe Datei-Kopfkommentar): Tippen auf eine ANDERE eigene Figur wählt sie aus,
   *  ohne irgendetwas am Brett zu verändern — reine Anzeige ihrer Legalzüge. */
  function handleFeldTap(feld: BoardSquare) {
    if (!istStufe3 || geloest) return;
    const figur = figuren.find((f) => gleich(f.at, feld));
    if (figur && figur.farbe === "w") setAusgewaehlt(feld);
  }

  function nochmalVersuchen() {
    if (geloest) return;
    setResetSchluessel((k) => k + 1);
  }

  // Der Hinweistext kommt jetzt vollständig aus der erzeugten Leiter (siehe
  // lib/hinweisLeiter.ts) — kein von Hand gepflegter Text je Spalte mehr, und damit auch kein
  // generischer "Erobern"-Hinweis in Spalten, die gar kein Schlagen verlangen (Befund A.2 der
  // Lückenanalyse).
  const hinweisZweisprachig =
    hinweisSichtbar && !geloest && aktuelleHinweisstufe !== null
      ? hinweisZeile(aktuelleHinweisstufe, hinweisLage)
      : null;
  const hinweisText = hinweisZweisprachig ? t(hinweisZweisprachig.de, hinweisZweisprachig.en) : undefined;

  // Die Rückmeldung auf einen nicht lösenden Zug. Rotierende Pools nach dem Vorbild von
  // HINWEIS_FEHLGRIFF_VARIANTEN in bonus/Figurenwert.tsx.
  const rueckmeldungZweisprachig = rueckmeldung
    ? zeileAusPool(
        rueckmeldung.art === "verschenkt" ? VERSCHENKT_ZEILEN : IN_ORDNUNG_ZEILEN,
        rueckmeldung.nummer
      )
    : null;
  const rueckmeldungText = rueckmeldungZweisprachig
    ? t(rueckmeldungZweisprachig.de, rueckmeldungZweisprachig.en)
    : undefined;

  // EINE Sprechzeile zur Zeit. Die Rückmeldung hat Vorrang vor dem Hinweis: Sie ist die
  // Antwort auf etwas, das das Kind gerade getan hat, der Hinweis steht weiter da und kann
  // erneut abgerufen werden. Sprächen beide, fielen sie einander ins Wort.
  const gesprochen = rueckmeldungText ?? hinweisText;
  // Schlüsselwechsel stoppt eine laufende Ausgabe sauber und löst bei erneutem Öffnen
  // zuverlässig eine neue aus, auch wenn der Text derselbe ist (siehe useLuxSprechzeile.ts).
  const sprechSchluessel = rueckmeldung
    ? `rueckmeldung-${rueckmeldung.nummer}`
    : hinweisText
      ? `hinweis-${aufgabe.fen}-${resetSchluessel}-${aktuelleHinweisstufe}`
      : "still";
  // Bewusst kein onFertig (kein Weiterlauf zu irgendwas) und erinnerung:false — weder ein
  // selbst angeforderter Hinweis noch eine Rückmeldung soll sich alle 8 Sekunden wiederholen.
  useLuxSprechzeile(sprechSchluessel, gesprochen, undefined, { erinnerung: false });

  return (
    <View style={styles.wurzel}>
      <Board config={config} onCorrectMove={handleCorrectMove} onFeldTap={handleFeldTap} disabled={geloest} />
      {!geloest && (
        <View style={styles.aktionsReihe}>
          <Pressable
            onPress={nochmalVersuchen}
            style={styles.aktionsKnopf}
            accessibilityLabel={t("Nochmal versuchen", "Try again")}
          >
            <Text style={styles.aktionsText}>{t("↺ Nochmal", "↺ Retry")}</Text>
          </Pressable>
          {hinweiseAktiv && aktuelleHinweisstufe !== null && (
            <Pressable
              onPress={() => {
                // Jeder Druck geht eine Stufe weiter (0 → 1 → 2 → 3), bis zur vollen
                // Empfehlung. Erneutes Drücken auf der höchsten Stufe blendet den Hinweis aus,
                // statt in einer Sackgasse zu enden.
                if (!hinweisSichtbar) {
                  setHinweisSichtbar(true);
                  return;
                }
                if (aktuelleHinweisstufe >= 3) {
                  setHinweisSichtbar(false);
                  return;
                }
                setHinweisAbrufe((n) => Math.min(n + 1, 3));
              }}
              style={styles.aktionsKnopf}
              accessibilityLabel={t("Hinweis von Lux", "Hint from Lux")}
            >
              <Text style={styles.aktionsText}>
                {!hinweisSichtbar
                  ? t("💡 Hinweis", "💡 Hint")
                  : aktuelleHinweisstufe >= 3
                    ? t("Hinweis verbergen", "Hide hint")
                    : t("Mehr verraten", "Tell me more")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {rueckmeldungText && !geloest && (
        <View style={[styles.hinweisBlase, rueckmeldung?.art === "verschenkt" && styles.rueckmeldungAchtung]}>
          <Text style={styles.hinweisText}>{rueckmeldungText}</Text>
        </View>
      )}
      {hinweisText && (
        <View style={styles.hinweisBlase}>
          <Text style={styles.hinweisText}>{hinweisText}</Text>
        </View>
      )}
      {geloest && (
        <View style={styles.ueberlagerung} pointerEvents="none">
          <QuestGeschafft>
            <SternIcon size={72} />
          </QuestGeschafft>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wurzel: { alignItems: "center", justifyContent: "center" },
  ueberlagerung: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  aktionsReihe: { flexDirection: "row", gap: 12, marginTop: 16 },
  aktionsKnopf: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(247,241,228,0.9)",
  },
  aktionsText: { fontSize: 14, fontWeight: "700", color: "#4A4038" },
  hinweisBlase: {
    marginTop: 10,
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  hinweisText: { fontSize: 14, color: "#4A4038", textAlign: "center" },
  // Warmer Ton, kein Rot: Die Figur steht schlecht, das Kind hat nichts falsch gemacht.
  rueckmeldungAchtung: { backgroundColor: "rgba(255,243,224,0.97)" },
});
