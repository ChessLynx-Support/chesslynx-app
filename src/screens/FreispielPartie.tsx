// FreispielPartie — die Spielansicht des Freispiel-Modus (Schritt #74; siehe
// projektwissen.md, Kurzstatus 2026-09-06, für die vollständige durchnummerierte
// Schritt-Tabelle #71–#78, verbindlich für jede künftige Unterhaltung zu diesem
// Feature). Übernimmt von FreispielScreen.tsx (Route-Param `elo`, siehe dessen
// `onSpielen`) und lässt das Kind eine vollständige Partie gegen den Waldfreunde-Bot
// (src/lib/waldfreundeBot.ts) spielen.
//
// WICHTIG, ausdrücklicher Nutzerwunsch (2026-09-06, bei der Beauftragung von #74):
// "spätestens nun das vollständige Schachbrett (1-8, a-h)". Dieser Screen zeigt daher
// bewusst ALLE 64 Felder mit allen Figuren — kein reduziertes Anzeigefenster wie bei
// den sechs Hauptquests (quest1/Board.tsx zeigt dort z. B. nur ein 3x3- oder
// 5x5-Ausschnittsfenster um die einzelne Übungsfigur, siehe Kommentare dort und in den
// jeweiligen Quest*.tsx-Dateien). Board.tsx selbst wird deshalb hier NICHT
// wiederverwendet — es kennt nur eine einzelne Übungsfigur plus höchstens einen
// einzelnen, farblich neutralen Besuchsgegner, keinen vollen 32-Figuren-Stellungs-
// zustand. Dieser Screen bringt sein eigenes, einfaches 8x8-Raster mit, das direkt aus
// `chess.js`' `board()`-Methode gespeist wird.
//
// Arbeits-Annahme (bitte melden, falls falsch statt einfach nur anzunehmen): Das Kind
// spielt durchgehend Weiß, der Bot durchgehend Schwarz — passend zu allen bisherigen
// FEN-Konventionen im Projekt (chessEngine.ts: "w - -" in jeder QUEST*_POSITIONS-Zeile)
// und zu waldfreundeBot.ts (spieleBotZug erwartet, dass er aufgerufen wird, wenn der
// Bot tatsächlich am Zug ist).
//
// Update (2026-09-09, Nutzer-Rückfrage "Freispielmodus angleichen, wir haben die
// Cburnett-Figuren doch durch eigene Figuren ersetzt?"): Der Nutzer hatte recht — seit
// Task #110 (siehe Quest6.tsx-Kommentar) existieren für alle sechs Kreaturen sowohl helle
// als auch dunkle gemalte Master-Icons (`pieceMasters.tsx`, `*MasterIcon`/
// `*MasterDunkelIcon`), ursprünglich nur für die Einzelfigur+Besuchsfigur der sechs
// Hauptquests gedacht. Der einzige Grund, warum FreispielPartie hier bisher stattdessen
// die neutralen Cburnett-Kontur-Figuren aus chessPieces.tsx nutzte (siehe deren
// Kopfkommentar), war der Zeitpunkt der Einführung (Schritt #74, 2026-09-06) — zu dem
// Zeitpunkt gab es die dunklen Master-Varianten noch nicht. Das ist durch Task #110
// überholt: Freispiel nutzt jetzt dieselben gemalten Master-Icons wie das Hauptspiel,
// chessPieces.tsx wird hier nicht mehr gebraucht (bleibt aber als Datei bestehen, falls
// später doch wieder ein neutrales Kontur-Set gebraucht wird).
//
// Neu (2026-09-06, neuer Schritt #75 "Farb-Einführung", zwischen #74 und der
// ehemaligen Schildkröten-Nummer #75 eingeschoben — siehe projektwissen.md Kurzstatus
// für die aktualisierte Tabelle): Freispiel ist die erste Stelle im Spiel, an der
// überhaupt beide Farben gleichzeitig auf dem Brett stehen. Der vollständige
// Textentwurf dafür (Leitplanken, Sprechzeilen, offene technische Fragen) steht in
// `freispiel_farbeinfuehrung_sprachentwurf.md` im Claude-Projekt — hier 1:1 umgesetzt:
// - Einmaliger, ausführlicher Moment nur beim allerersten Freispiel-Start überhaupt
//   (Flag in AsyncStorage, siehe lib/freispielEinfuehrung.ts — bewusst rein lokal
//   entschieden, konsistent mit dem übrigen Freispiel-Fortschritt; die im Entwurf
//   offen gelassene Alternative "serverseitig" wurde NICHT gewählt).
// - Kurze Animation (Brett teilt sich in zwei Gruppen heller/dunkler Figuren) plus
//   zwei nacheinander antippbare Sprechzeilen — die zwei getrennten Zeilen lösen genau
//   das im Entwurf offen gelassene Problem ("Zeile 2 muss auch dann korrekt
//   anschließen, wenn das Kind die Animation vorzeitig wegtippt"): die Animation ist
//   selbst antippbar/überspringbar, Zeile 1 und 2 folgen davon unabhängig als eigene,
//   erst per Tipp fortschreitende Schritte.
// - Der Tiername wird dynamisch eingesetzt (siehe TIER_NAMEN_MIT_ARTIKEL) — die im
//   Entwurf offen gelassene generische Alternative ("dein Gegner") wurde NICHT
//   gewählt, da ohnehin pro Rang ein unterschiedliches Tier angezeigt wird.
// - Ab der zweiten Partie nur noch ein kurzer Reminder-Satz.
// - Sprach-Harmonie-Review (2026-09-09, Nutzerauftrag "prüfe alle Sprachteile von Lux
//   nochmal auf Harmonie ... arbeite kindgerechte und sinnvolle Ergänzungen aus"):
//   die Sprachsynthese-Frage, die dieser Kommentar bis dahin bewusst offengelassen hatte
//   ("wie bei allen Quest-Sprechzeilen ... wird der Text aktuell als sichtbarer
//   Lux-Sprechtext angezeigt"), war inzwischen längst überholt — Quest1.tsx–Quest6.tsx
//   sprechen seit `luxStimme.ts`/`useLuxSprechzeile.ts` (2026-09-07) alle wirklich laut,
//   nur dieser Kommentar war nie nachgezogen worden. Dieser Screen war dadurch die
//   einzige verbliebene Stelle im ganzen Spielfluss, an der ein nicht lesefähiges Kind
//   (Design-Grundsatz "vollständig textfrei") die Farb-Einführung nicht verstehen konnte
//   — ein echter, unbeabsichtigter Bug, kein bewusster Platzhalter-Zustand. Jetzt über
//   `useLuxSprechzeile` (siehe Aufrufstelle unten) genauso laut wie überall sonst; der
//   sichtbare Text bleibt (wie überall sonst auch) hinter dem Eltern-Untertitel-Schalter
//   (`useUntertitelAktiv`), statt wie bisher immer sichtbar zu sein.
//
// Textzahlenfrei-Prinzip im übrigen Screen (siehe Design-Grundsätze in
// projektwissen.md): das Spielbrett selbst zeigt zu keinem Zeitpunkt Text oder Zahlen.
// Ein bedrohter König pulsiert sanft in warmem Orange (Design-Grundsatz 3 — die
// Quest-6-Spezifikation beschreibt genau dieses Pulsieren, ergänzt dort zusätzlich um
// ein sichtbares "Schach!"-Textabzeichen; hier bewusst NUR das visuelle Pulsieren,
// konsistent mit dem bereits rein icon-/audio-basierten Freispiel-Screen). Sieg/
// Remis/Niederlage werden ausschließlich über Farbe + Icon vermittelt. Design-
// Grundsatz 2 ("niemand wird dauerhaft besiegt") gilt hier wortwörtlich: eine
// Niederlage gegen den Bot hat keinerlei negative Konsequenz — nur ein Sieg schaltet
// über `meldeSiegGegenStufe` (freispielFortschritt.ts) die nächste Stufe frei.
//
// Zugumsetzung bewusst vereinfacht wie im übrigen Projekt: Bauernumwandlung geht immer
// automatisch zur Dame (promotion: "q"), analog zu chessEngine.ts/waldfreundeBot.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { View, StyleSheet, SafeAreaView, Pressable, Animated, Text, ActivityIndicator, Image, Dimensions } from "react-native";
// Visuelle Angleichung ans Hauptspiel (2026-09-09, Nutzer-Rückfrage "Freispielmodus
// angleichen"): Ziel-/Schach-Markierung jetzt als Verlaufs-SVG statt reiner View-Kontur,
// dieselbe Technik wie ZielfeldMarker/BedrohungsPuls in quest1/Board.tsx (siehe dort und
// produktionsanleitung_elemente.md Abschnitt 7.6).
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
// Update (2026-09-08, Claude-Projekt "ChessLynx", produktionsanleitung_elemente.md
// Abschnitt 7.2 "Freispiel: PfeilLinksIcon/NochmalIcon ... ablösen durch gemalte,
// waldthematische Varianten"): die bisher hier lokal definierten, rein funktionalen
// Strichzeichnungen sind durch die waldthematischen Ersatz-Icons aus lib/freispielIcons
// ersetzt (gleiche Prop-Signatur, bewährte Pfeil-/Bogen-Geometrie unverändert
// übernommen — nur um Farn-/Blatt-Akzente ergänzt). (Der direkte `Svg`-Import oben ist
// seit 2026-09-09 wieder nötig — für die neuen Ziel-/Schach-Verlaufsmarker, nicht mehr für
// diese beiden Icons.)
import { FarnZurueckIcon, BlattNochmalIcon } from "../lib/freispielIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Chess, type Square as AlgebraicSquare, type PieceSymbol } from "chess.js";
import { holeStufe, spieleBotZug, waehleBotZug, type WaldgefaehrtenTier } from "../lib/waldfreundeBot";
import { meldeSiegGegenStufe } from "../lib/freispielFortschritt";
import { wurdeFarbeinfuehrungGezeigt, markiereFarbeinfuehrungGezeigt } from "../lib/freispielEinfuehrung";
// Angleichung ans Hauptspiel (2026-09-09, Rückfrage "weitere Optimierungspotenziale"):
// Zug-Feedback fehlte hier bisher komplett, obwohl der ganze Screen nur aus Zügen besteht —
// dieselben Funktionen wie in quest1/Board.tsx (dort an jedem Zug ausgelöst). Haptik bewusst
// nur beim eigenen Zug des Kindes (direkte Reaktion auf die eigene Berührung), der Klang bei
// beiden Seiten (Zug hörbar machen, unabhängig davon, wer zieht) — Bot-Züge vibrieren
// bewusst NICHT, da Haptik an dieser Stelle sonst wie eine unaufgeforderte Systemreaktion
// wirken würde statt an eine eigene Berührung gekoppelt zu sein.
import { haptikZug, haptikQuestGeschafft } from "../lib/luxHaptik";
import { spieleZugKlang, spieleQuestKlang } from "../lib/luxKlang";
// Sprach-Harmonie-Review (2026-09-09, siehe Kopfkommentar): dieselbe Sprech-Infrastruktur
// wie in allen sechs Quest-Screens, hier bisher komplett gefehlt (siehe dortiger
// Kommentar) — LuxEckIcon ersetzt den bisherigen unbelebten Platzhalter-Kreis
// (styles.luxHead), useUntertitelAktiv steuert jetzt auch hier den sichtbaren Text.
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
// Sprach-Vollständigkeit (Claude-Projekt "ChessLynx",
// sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md, Fund
// A3 — Nutzer-Entscheidung: vertonen): die Ergebnis-Überlagerung war bisher bewusst
// textfrei (siehe ErgebnisUeberlagerung-Kopfkommentar). Auf ausdrücklichen Wunsch jetzt
// zusätzlich eine kurze, rotierende Sprechzeile — die Niederlagen-Variante bleibt
// ausdrücklich unbestraft/aufmunternd, ganz ohne Trauer-/Fehlerton.
import { luxVariante } from "../lib/luxVarianten";
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09,
// siehe sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md,
// Teil B) — bestätigter Geltungsbereich schließt die Partien gegen die Waldfreunde-Bots
// ausdrücklich ein ("nicht bei den Spielen gegen Luchs, sondern gegen die Bots"). Anders
// als bei den kuratierten Bonuskapiteln gibt es hier kein vorab bekanntes "richtiges"
// Feld — der Hinweis nutzt deshalb `waehleBotZug` aus waldfreundeBot.ts (dieselbe
// Zugauswahl, die sonst die Bot-Gegner steuert) mit der stärksten Kalibrierung
// (Elo 1300, praktisch kein Zufallsanteil mehr) für die WEISSE Seite — die Funktion ist
// unabhängig von der Farbe, sie bewertet einfach, wer gerade am Zug ist.
import { useHinweiseAktiv, hinweisAngebotZeile, type HinweisPhase } from "../lib/luxHinweis";
// Paket 3: Gegner-Illustration im Kapitel „Die ganze Partie".
import { SchildkroeteIcon } from "../lib/schildkroete";
// Paket 3: Remis-Ursache (reine Logik, eigene Datei für verify/test-ganze-partie-logic.cjs).
import { REMIS_ZEILEN, remisUrsacheVon, type RemisUrsache } from "../lib/remisUrsache";
// Paket 3c: Abschied, wenn das Kind die Kapitel-Partie mittendrin verlässt.
import { useAbschiedBeimVerlassen } from "../lib/useAbschiedBeimVerlassen";
import { loescheGanzePartieEtappe } from "../lib/ganzePartieStand";
import { saveBonusFortschrittLocal } from "../lib/storage";
import { ABSCHIED_ZEILE } from "../bonus/ganzePartieLogik";
import { Funkeln } from "../components/Funkeln";
import { EichhoernchenIcon, FuchsIcon, DachsIcon, AdlerinIcon, WolfIcon, WisentIcon } from "../lib/waldgefaehrten";
import {
  BauerMasterIcon,
  TurmMasterIcon,
  LaeuferMasterIcon,
  SpringerMasterIcon,
  DameMasterIcon,
  KoenigMasterIcon,
  BauerMasterDunkelIcon,
  TurmMasterDunkelIcon,
  LaeuferMasterDunkelIcon,
  SpringerMasterDunkelIcon,
  DameMasterDunkelIcon,
  KoenigMasterDunkelIcon,
} from "../lib/pieceMasters";

// Board-Kacheln — dieselben Bilder wie im Hauptspiel (quest1/Board.tsx), statt der
// bisherigen reinen Flächenfarbe (2026-09-09, siehe Update-Kommentar oben).
const feldHell = require("../../assets/brett/tile_hell.webp");
const feldDunkel = require("../../assets/brett/tile_dunkel.webp");

// Weißer Außenrahmen ums Brett — als Konstante statt Literal, damit die Breiten-/Höhen-
// Berechnung unten (cellSize * 8 + RAHMEN_BREITE * 2) und der tatsächliche StyleSheet-Wert
// nie auseinanderlaufen können (dieselbe Absicherung wie in quest1/Board.tsx).
const RAHMEN_BREITE = 6;

type BoardSquare = { row: number; col: number };
type Ausgang = "spielt" | "kindGewinnt" | "botGewinnt" | "remis";

type VorspielPhase = "laedt" | "animation" | "text1" | "text2" | "reminder" | "fertig";

const DATEIEN = ["a", "b", "c", "d", "e", "f", "g", "h"];

function zuAlgebraisch(sq: BoardSquare): AlgebraicSquare {
  return `${DATEIEN[sq.col]}${8 - sq.row}` as AlgebraicSquare;
}
function vonAlgebraisch(a: string): BoardSquare {
  return { row: 8 - Number(a[1]), col: DATEIEN.indexOf(a[0]) };
}

const TIER_ICONS: Record<WaldgefaehrtenTier, ComponentType<{ size?: number }>> = {
  eichhoernchen: EichhoernchenIcon,
  fuchs: FuchsIcon,
  dachs: DachsIcon,
  adlerin: AdlerinIcon,
  wolf: WolfIcon,
  wisent: WisentIcon,
};

// Nur für die Farb-Einführungs-Sprechzeile gebraucht (siehe Kopfkommentar) — mit
// Artikel, da die Zeile mit dem Tiernamen einen neuen Satz beginnt ("Der Fuchs spielt
// mit den dunklen Figuren..."). Bewusst hier lokal gehalten statt aus
// FreispielScreen.tsx importiert, analog zur dortigen (ebenfalls lokalen) TIER_ICONS-
// Definition — beide Screens halten ihre eigene kleine Kopie.
const TIER_NAMEN_MIT_ARTIKEL: Record<WaldgefaehrtenTier, string> = {
  eichhoernchen: "Das Eichhörnchen",
  fuchs: "Der Fuchs",
  dachs: "Der Dachs",
  adlerin: "Die Adlerin",
  wolf: "Der Wolf",
  wisent: "Der Wisent",
};

const WEISSE_FIGUREN: Record<PieceSymbol, ComponentType<{ size?: number }>> = {
  p: BauerMasterIcon,
  r: TurmMasterIcon,
  b: LaeuferMasterIcon,
  n: SpringerMasterIcon,
  q: DameMasterIcon,
  k: KoenigMasterIcon,
};
// Rotierende Ergebnis-Zeilen (siehe Import-Kommentar oben) — Remis hat bewusst nur eine
// feste Formulierung, da dieser Ausgang deutlich seltener vorkommt als Sieg/Niederlage.
const SIEG_VARIANTEN = ["Gewonnen! Das war stark gespielt!", "Juhu, du hast gewonnen!", "Klasse! Du hast die Partie für dich entschieden!"];
const NIEDERLAGE_VARIANTEN = ["Kein Problem, probier's gleich nochmal!", "Nicht schlimm, das schaffst du beim nächsten Mal!"];
// "Lux fragen" während der Partie (siehe Import-Kommentar oben) — bewusst allgemein
// gehalten, ohne Fachbegriffe ("guter Zug", "Drohung" o. Ä.), das Zielfeld zeigt der
// Ring auf dem Brett selbst.
const HINWEIS_ZUG_VARIANTEN = [
  "Schau, diese Figur hier könnte einen starken Zug machen!",
  "Diese Figur hat hier eine gute Möglichkeit!",
  "Wie wäre es mit diesem Zug?",
];

const SCHWARZE_FIGUREN: Record<PieceSymbol, ComponentType<{ size?: number }>> = {
  p: BauerMasterDunkelIcon,
  r: TurmMasterDunkelIcon,
  b: LaeuferMasterDunkelIcon,
  n: SpringerMasterDunkelIcon,
  q: DameMasterDunkelIcon,
  k: KoenigMasterDunkelIcon,
};

export default function FreispielPartie() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const elo: number = route.params?.elo;
  const stufe = holeStufe(elo);
  // Paket 3 (2026-09-11): Kapitel „Die ganze Partie" (bonus/GanzePartie.tsx, Screen 5) nutzt
  // diese Spielansicht für die erste echte Partie gegen die Schildkröte (Bot-Stufe 250):
  // eigene Gegner-Illustration, Hinweise immer an, keine Farbeinführung (die kommt jetzt im
  // Kapitel selbst), kein Freischalten von Bot-Stufen, und nach Partieende geht es zurück
  // ins Kapitel statt zur Übungslichtung.
  const istKapitel = route.params?.kapitel === "ganzePartie";

  // `game` wird über seine chess.js-Methoden mutiert (wie in waldfreundeBot.ts/
  // chessEngine.ts überall üblich) — `setVersion` erzwingt danach jeweils einen
  // Re-Render, ohne dass der Wert selbst irgendwo gelesen werden muss.
  const [game] = useState(() => new Chess());
  const [, setVersion] = useState(0);
  const [ausgewaehlt, setAusgewaehlt] = useState<BoardSquare | null>(null);
  const [legalZiele, setLegalZiele] = useState<BoardSquare[]>([]);
  const [botDenkt, setBotDenkt] = useState(false);
  const [ausgang, setAusgang] = useState<Ausgang>("spielt");
  // Paket 3c: Verlässt das Kind die Kapitel-Partie mittendrin, verabschiedet sich Lux kurz.
  useAbschiedBeimVerlassen(istKapitel && ausgang === "spielt", ABSCHIED_ZEILE);
  // Paket 3c: Das Kapitel gilt als geschafft, sobald die Partie zu Ende ist (Vorlage, Abschnitt 1)
  // — schon hier gespeichert, damit es auch zählt, wenn das Kind danach per Zurück statt über
  // die Ergebnis-Karte geht.
  useEffect(() => {
    if (!istKapitel || ausgang === "spielt") return;
    saveBonusFortschrittLocal("ganzePartie", true);
    loescheGanzePartieEtappe();
  }, [istKapitel, ausgang]);
  // Paket 3 (F1a): warum eine Partie unentschieden endete — steuert die Remis-Zeile.
  const [remisUrsache, setRemisUrsache] = useState<RemisUrsache>("sonst");
  const [neuFreigeschalteteElo, setNeuFreigeschalteteElo] = useState<number | null>(null);
  const gemeldet = useRef(false); // verhindert doppeltes meldeSiegGegenStufe bei schnellem Doppel-Tipp
  // "Lux fragen" (siehe Import-Kommentar oben): Antipp-Phase plus der zuletzt berechnete
  // Hinweis-Zug (Ring-Markierung auf dem Brett, siehe Brett-Komponente unten).
  const [hinweisPhase, setHinweisPhase] = useState<HinweisPhase>("still");
  const [hinweisZug, setHinweisZug] = useState<{ von: BoardSquare; nach: BoardSquare } | null>(null);
  const elternHinweiseAktiv = useHinweiseAktiv();
  // Paket 3: im Kapitel „Die ganze Partie" sind Lux' Hinweise immer an (Vorlage Abschnitt 6).
  const hinweiseAktiv = elternHinweiseAktiv || istKapitel;

  // Farb-Einführung (siehe Kopfkommentar): läuft VOR dem eigentlichen Spiel ab.
  const [vorspiel, setVorspiel] = useState<VorspielPhase>("laedt");

  useEffect(() => {
    let abgebrochen = false;
    if (istKapitel) {
      setVorspiel("fertig");
      return;
    }
    wurdeFarbeinfuehrungGezeigt().then((gezeigt) => {
      if (!abgebrochen) setVorspiel(gezeigt ? "reminder" : "animation");
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  const vorspielWeiter = useCallback(() => {
    setVorspiel((phase) => {
      if (phase === "animation") return "text1";
      if (phase === "text1") return "text2";
      if (phase === "text2") {
        markiereFarbeinfuehrungGezeigt();
        return "fertig";
      }
      if (phase === "reminder") return "fertig";
      return phase;
    });
  }, []);

  const neuZeichnen = useCallback(() => setVersion((v) => v + 1), []);

  function pruefeSpielende(): Ausgang {
    if (game.isCheckmate()) {
      // Nach einem Matt zeigt game.turn() die Farbe, die keinen Zug mehr hat — also
      // die verlierende Seite.
      return game.turn() === "b" ? "kindGewinnt" : "botGewinnt";
    }
    if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
      setRemisUrsache(remisUrsacheVon(game));
      return "remis";
    }
    return "spielt";
  }

  function nachZugPruefen() {
    const nachKindzug = pruefeSpielende();
    if (nachKindzug !== "spielt") {
      setAusgang(nachKindzug);
      if (nachKindzug === "kindGewinnt" && !gemeldet.current && !istKapitel) {
        gemeldet.current = true;
        // Fortschritt wird unabhängig vom Navigations-Zeitpunkt sofort lokal
        // gespeichert (siehe freispielFortschritt.ts) — der Rückgabewert wird nur für
        // die Freischalt-Feier-Animation im Freispiel-Screen gebraucht.
        meldeSiegGegenStufe(elo).then(({ neueStufeFreigeschaltet }) => {
          if (neueStufeFreigeschaltet) setNeuFreigeschalteteElo(neueStufeFreigeschaltet.elo);
        });
      }
      return;
    }
    // Bot ist jetzt am Zug — kurze "Bedenkzeit" statt eines sofortigen Automatismus,
    // damit sich der Zug lebendiger anfühlt.
    setBotDenkt(true);
    setTimeout(() => {
      spieleBotZug(game, elo);
      // Nur Klang, bewusst keine Haptik (siehe Import-Kommentar oben) — der Bot-Zug ist
      // keine eigene Berührung des Kindes.
      spieleZugKlang();
      setBotDenkt(false);
      neuZeichnen();
      const nachBotzug = pruefeSpielende();
      if (nachBotzug !== "spielt") setAusgang(nachBotzug);
    }, 650);
  }

  function feldAntippen(r: number, c: number) {
    if (ausgang !== "spielt" || botDenkt) return;
    const ziel: BoardSquare = { row: r, col: c };
    const istZiel = legalZiele.some((z) => z.row === r && z.col === c);

    if (ausgewaehlt && istZiel) {
      game.move({ from: zuAlgebraisch(ausgewaehlt), to: zuAlgebraisch(ziel), promotion: "q" });
      // Sofortiges haptisches + akustisches Feedback beim eigenen Zug (2026-09-09,
      // Angleichung ans Hauptspiel, siehe Import-Kommentar oben).
      haptikZug();
      spieleZugKlang();
      setAusgewaehlt(null);
      setLegalZiele([]);
      // Ein tatsächlicher Zug setzt "Lux fragen" zurück — die nächste eigene Zugaufgabe
      // (nach der Bot-Antwort) startet wieder bei "einmal antippen = wiederholen".
      setHinweisPhase("still");
      setHinweisZug(null);
      neuZeichnen();
      nachZugPruefen();
      return;
    }

    const figurAmFeld = game.get(zuAlgebraisch(ziel));
    if (figurAmFeld && figurAmFeld.color === "w" && game.turn() === "w") {
      setAusgewaehlt(ziel);
      const zuege = game.moves({ square: zuAlgebraisch(ziel), verbose: true }) as Array<{ to: string }>;
      setLegalZiele(zuege.map((z) => vonAlgebraisch(z.to)));
      return;
    }

    setAusgewaehlt(null);
    setLegalZiele([]);
  }

  function nochmal() {
    game.reset();
    gemeldet.current = false;
    setAusgewaehlt(null);
    setLegalZiele([]);
    setAusgang("spielt");
    setRemisUrsache("sonst");
    setNeuFreigeschalteteElo(null);
    setHinweisPhase("still");
    setHinweisZug(null);
    // Die Farb-Einführung selbst wird beim Wiederholen NICHT erneut gezeigt (Flag
    // bleibt gesetzt) — "Nochmal spielen" ist keine neue "allererste" Partie.
    neuZeichnen();
  }

  function zurueckZurListe() {
    navigation.navigate(
      "FreispielScreen",
      neuFreigeschalteteElo !== null ? { neuFreigeschaltetElo: neuFreigeschalteteElo } : undefined
    );
  }

  const koenigInSchachFeld: BoardSquare | null = (() => {
    if (!game.inCheck()) return null;
    const brett = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const feld = brett[r][c];
        if (feld && feld.type === "k" && feld.color === game.turn()) return { row: r, col: c };
      }
    }
    return null;
  })();

  // Sprach-Harmonie-Review (2026-09-09, siehe Kopfkommentar): vorspielText wird jetzt
  // UNBEDINGT berechnet (nicht mehr nur innerhalb des `vorspiel !== "fertig"`-Zweigs),
  // damit der useLuxSprechzeile()-Hook direkt darunter unbedingt (React-Hook-Regel: keine
  // bedingten Hook-Aufrufe) aufgerufen werden kann — für "laedt"/"fertig" liefert er einen
  // leeren String, den der Hook selbst ignoriert (siehe dortiges `if (!text) return`).
  const vorspielText =
    vorspiel === "text1"
      ? `Schau mal! Im Schach gibt es immer zwei Seiten: die hellen Figuren, die nennt man Weiß, und die dunklen Figuren, die nennt man Schwarz. Du spielst heute mit den hellen Figuren, du bist also Weiß. ${TIER_NAMEN_MIT_ARTIKEL[stufe.tier]} spielt mit den dunklen Figuren, also Schwarz.`
      : vorspiel === "text2"
        ? "Und weil du Weiß bist, darfst du als Erstes ziehen. Das ist bei jeder Schachpartie so. Los, such dir eine Figur aus!"
        : vorspiel === "reminder"
          ? "Du bist wieder Weiß, du fängst an!"
          : "";
  // Nutzerfeedback 2026-09-09 ("im Freispielmodus ist noch ein Lux auf der falschen
  // Seite ... und die alte Luxfigur taucht noch auf. Die Textblase rutscht dabei in die
  // Mitte über das Brett"): die "reminder"-Phase (kurzer Hinweis "Du bist wieder Weiß"
  // vor JEDER weiteren Partie, nicht nur der allerersten) nutzte bisher denselben
  // vollflächigen, brettlosen Alt-Bildschirm wie die echte Erst-Einführung (großer
  // luxCorner oben links + zentrierter Text) — das ist gerade das "alte" Erscheinungsbild
  // von vor der neuen Kopfzeile weiter unten, und beim Übergang von der letzten Partie
  // (Brett sichtbar) zu diesem vollflächigen Zwischenschritt wirkte der zentrierte Text
  // wie eine über das Brett rutschende Sprechblase. Die "reminder"-Phase läuft jetzt
  // stattdessen INNERHALB der normalen Spielansicht (Kopfzeile + Brett, siehe unten) ab
  // und geht von selbst weiter, sobald Lux fertig gesprochen hat (Prinzip wie bei den
  // Bonuskapitel-Einführungen: kein Antippen nötig, Tempo richtet sich nach der
  // Sprechgeschwindigkeit) — nur die ECHTE, allererste Einführung (laedt/animation/
  // text1/text2) behält den vollflächigen Ablauf.
  const { wiederholen: vorspielWiederholen } = useLuxSprechzeile(
    vorspiel,
    vorspielText,
    vorspiel === "reminder" ? () => setVorspiel("fertig") : undefined
  );
  const zeigeUntertitel = useUntertitelAktiv();

  // "Lux fragen" während der laufenden Partie (siehe Import-Kommentar oben) — eigener,
  // von der Vorspiel-Begrüßung unabhängiger Sprech-Hook. Leerer String in der
  // "still"-Phase, den der Hook selbst ignoriert (kein Sprechen, kein Timer) — während
  // der eigentlichen Partie gibt es sonst keine feste Instruktionszeile.
  const hinweisSchluessel = `spiel-${hinweisPhase}`;
  const hinweisZeile: string | (() => string) | undefined =
    hinweisPhase === "still"
      ? undefined
      : hinweisPhase === "angebot"
        ? hinweisAngebotZeile()
        : () => luxVariante(HINWEIS_ZUG_VARIANTEN, "freispiel-zug-hinweis");
  const { wiederholen: hinweisWiederholen, aktuelleZeile: hinweisAnzeige } = useLuxSprechzeile(
    hinweisSchluessel,
    hinweisZeile
  );

  function handleLuxSpielTap() {
    const zugaufgabeAktiv = ausgang === "spielt" && !botDenkt && game.turn() === "w";
    if (!hinweiseAktiv || !zugaufgabeAktiv) return;
    if (hinweisPhase === "still") {
      setHinweisPhase("angebot");
      return;
    }
    if (hinweisPhase === "angebot") {
      const zug = waehleBotZug(game, 1300);
      if (zug) setHinweisZug({ von: vonAlgebraisch(zug.from), nach: vonAlgebraisch(zug.to) });
      setHinweisPhase("hinweis");
      return;
    }
    // phase === "hinweis": einfach nochmal denselben Hinweis sprechen.
    hinweisWiederholen();
  }

  // Nur die ECHTE, allererste Einführung bekommt noch den vollflächigen, brettlosen
  // Alt-Bildschirm (siehe Kommentar oben) — "reminder" läuft weiter unten INNERHALB der
  // normalen Spielansicht.
  if (vorspiel === "laedt" || vorspiel === "animation" || vorspiel === "text1" || vorspiel === "text2") {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable
          style={styles.luxCorner}
          onPress={vorspielWiederholen}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel="Lux, tippen zum Wiederholen"
        >
          <LuxEckIcon size={52} />
        </Pressable>
        {vorspiel === "laedt" && (
          <View style={styles.vorspielLaden}>
            <ActivityIndicator color="#8FA888" />
          </View>
        )}
        {vorspiel === "animation" && <FarbTrennungAnimation onFertig={vorspielWeiter} />}
        {(vorspiel === "text1" || vorspiel === "text2") && (
          <Pressable style={styles.vorspielTapArea} onPress={vorspielWeiter} accessibilityLabel={vorspielText}>
            {zeigeUntertitel && <Text style={styles.vorspielText}>{vorspielText}</Text>}
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.kopf}>
        {/* Nutzerfeedback 2026-09-09 ("ein Lux auf der falschen Seite, mit zurückbutton
            tauschen"): die Lux-Hinweis-Ecke sitzt in JEDEM anderen Screen der App oben
            LINKS (luxCorner) — hier steht sie jetzt ebenfalls zuerst/links, der
            Zurück-Knopf dafür rechts, statt umgekehrt wie zuvor. */}
        <Pressable
          style={styles.kopfPlatzhalter}
          onPress={handleLuxSpielTap}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel="Lux, für einen Hinweis antippen"
        >
          <LuxEckIcon size={36} />
        </Pressable>
        <View style={[styles.gegnerAbzeichen, botDenkt && styles.gegnerAbzeichenDenkt]}>
          {(() => {
            if (istKapitel) return <SchildkroeteIcon size={38} />;
            const Icon = TIER_ICONS[stufe.tier];
            return <Icon size={38} />;
          })()}
        </View>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Zurück zur Übungslichtung" style={styles.zurueckKnopf}>
          <FarnZurueckIcon />
        </Pressable>
      </View>

      {/* "reminder" (siehe Kommentar oben bei vorspielText/useLuxSprechzeile): kurzer
          Hinweis vor jeder weiteren Partie, jetzt in derselben Sprechblasen-Optik wie die
          "Lux fragen"-Hinweise, statt im alten vollflächigen Einführungs-Look. */}
      {vorspiel === "reminder" && zeigeUntertitel && (
        <View style={styles.hinweisBlase}>
          <Text style={styles.hinweisBlaseText}>{vorspielText}</Text>
        </View>
      )}

      {zeigeUntertitel && vorspiel === "fertig" && hinweisPhase !== "still" && (
        <View style={styles.hinweisBlase}>
          <Text style={styles.hinweisBlaseText}>{hinweisAnzeige}</Text>
        </View>
      )}

      <Brett
        game={game}
        ausgewaehlt={ausgewaehlt}
        legalZiele={legalZiele}
        koenigInSchachFeld={koenigInSchachFeld}
        hinweisZug={hinweisZug}
        // Während der kurzen "reminder"-Zeile ist das Brett zwar schon sichtbar (siehe
        // Kommentar oben), aber bewusst noch nicht antippbar — ein versehentlicher Zug,
        // während Lux noch "Du bist wieder Weiß" sagt, soll nicht möglich sein.
        onFeldTipp={vorspiel === "reminder" ? () => {} : feldAntippen}
      />

      {ausgang !== "spielt" && (
        <ErgebnisUeberlagerung
          ausgang={ausgang}
          tier={stufe.tier}
          remisUrsache={remisUrsache}
          kapitel={istKapitel}
          onNochmal={nochmal}
          onZurueck={istKapitel ? () => navigation.replace("GanzePartie", { abschluss: true }) : zurueckZurListe}
        />
      )}
    </SafeAreaView>
  );
}

/** Einmalige Farb-Einführungs-Animation (siehe Kopfkommentar und
 * freispiel_farbeinfuehrung_sprachentwurf.md): zwei anfangs überlappende Figuren-
 * Gruppen (helle/dunkle Master-Variante von Bauer/Turm/König, `pieceMasters.tsx`,
 * seit 2026-09-09 statt der ursprünglichen Cburnett-Icons) driften sanft auseinander.
 * Läuft automatisch ab UND ist antippbar,
 * um sofort zu `onFertig` zu springen — löst genau das im Sprachentwurf offen
 * gelassene Problem, dass ein vorzeitiges Wegtippen der Animation den Ablauf nicht
 * durcheinanderbringen darf, weil Zeile 1/2 als eigene, unabhängig davon antippbare
 * Folgeschritte kommen. */
function FarbTrennungAnimation({ onFertig }: { onFertig: () => void }) {
  const versatz = useRef(new Animated.Value(0)).current;
  const deckkraft = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequenz = Animated.sequence([
      Animated.timing(deckkraft, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(versatz, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(500),
    ]);
    sequenz.start(({ finished }) => {
      if (finished) onFertig();
    });
    return () => sequenz.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFertig ist ein
    // frischer Inline-Callback vom Elternscreen; die Sequenz soll nicht bei jeder
    // Identitätsänderung neu starten.
  }, []);

  const hellVersatz = versatz.interpolate({ inputRange: [0, 1], outputRange: [0, -54] });
  const dunkelVersatz = versatz.interpolate({ inputRange: [0, 1], outputRange: [0, 54] });

  return (
    <Pressable style={styles.trennungWrap} onPress={onFertig} accessibilityLabel="Weiter">
      <Animated.View style={[styles.trennungGruppe, { opacity: deckkraft, transform: [{ translateX: hellVersatz }] }]}>
        <BauerMasterIcon size={30} />
        <TurmMasterIcon size={30} />
        <KoenigMasterIcon size={30} />
      </Animated.View>
      <Animated.View style={[styles.trennungGruppe, { opacity: deckkraft, transform: [{ translateX: dunkelVersatz }] }]}>
        <BauerMasterDunkelIcon size={30} />
        <TurmMasterDunkelIcon size={30} />
        <KoenigMasterDunkelIcon size={30} />
      </Animated.View>
    </Pressable>
  );
}

/** Ziel-Markierung für ein legales Feld — Verlaufs-Ring statt der bisherigen reinen
 * View-Kontur (2026-09-09, Angleichung ans Hauptspiel), dieselbe Grün-Palette und
 * Doppelkontur-Technik wie die Ring-Variante von `ZielfeldMarker` in quest1/Board.tsx. */
function FreispielZielRing({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="freispielZielFuellung" cx="42%" cy="38%" r="65%">
          <Stop offset="0%" stopColor="#C7DCC5" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#7FA07D" stopOpacity={0.12} />
        </RadialGradient>
      </Defs>
      <Circle cx={20} cy={20} r={15} fill="url(#freispielZielFuellung)" />
      <Circle cx={20} cy={20} r={15} stroke="#7FA07D" strokeWidth={4} opacity={0.3} fill="none" />
      <Circle cx={20} cy={20} r={15} stroke="#9CB89A" strokeWidth={2.5} fill="none" />
    </Svg>
  );
}

/** Schach-Signal auf dem bedrohten Königsfeld — warmes Glühen statt einer reinen
 * Rand-Kontur (2026-09-09, Angleichung ans Hauptspiel), dieselbe Technik/Farbgebung wie
 * `BedrohungsPuls` in quest1/Board.tsx. Der bereits vorhandene `schachPuls`-Skalierungs-
 * Loop (siehe Brett-Komponente unten) bleibt unverändert der Animations-Treiber. */
function FreispielSchachGlut({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="freispielSchachGlut" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#EFAF8D" stopOpacity={1} />
          <Stop offset="60%" stopColor="#D98E72" stopOpacity={0.85} />
          <Stop offset="100%" stopColor="#D98E72" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill="url(#freispielSchachGlut)" />
    </Svg>
  );
}

/** Hinweis-Markierung für "Lux fragen" (siehe Import-Kommentar oben) — bewusst eine
 * eigene, warme Goldfarbe statt der grünen `FreispielZielRing`, damit ein Hinweis-Zug
 * (Vorschlag) klar von einem bereits selbst gewählten Legalzug unterscheidbar bleibt. */
function FreispielHinweisRing({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="freispielHinweisFuellung" cx="42%" cy="38%" r="65%">
          <Stop offset="0%" stopColor="#F0DBA0" stopOpacity={0.6} />
          <Stop offset="100%" stopColor="#D7A52D" stopOpacity={0.15} />
        </RadialGradient>
      </Defs>
      <Circle cx={20} cy={20} r={15} fill="url(#freispielHinweisFuellung)" />
      <Circle cx={20} cy={20} r={15} stroke="#D7A52D" strokeWidth={4} opacity={0.35} fill="none" />
      <Circle cx={20} cy={20} r={15} stroke="#E8C468" strokeWidth={2.5} fill="none" />
    </Svg>
  );
}

/**
 * Das vollständige 8x8-Brett. `game.board()` liefert bereits genau das benötigte
 * Zeilen/Spalten-Raster (Zeile 0 = 8. Reihe/Schwarz-Grundreihe, Spalte 0 = a-Linie) —
 * exakt dieselbe row/col-Konvention wie in chessEngine.ts (toAlgebraic/fromAlgebraic),
 * hier lokal noch einmal (siehe zuAlgebraisch/vonAlgebraisch oben) nachgebaut, um
 * dieses Modul unabhängig vom kuratierten Quest-Wrapper zu halten.
 */
function Brett({
  game,
  ausgewaehlt,
  legalZiele,
  koenigInSchachFeld,
  hinweisZug,
  onFeldTipp,
}: {
  game: Chess;
  ausgewaehlt: BoardSquare | null;
  legalZiele: BoardSquare[];
  koenigInSchachFeld: BoardSquare | null;
  hinweisZug: { von: BoardSquare; nach: BoardSquare } | null;
  onFeldTipp: (r: number, c: number) => void;
}) {
  const brett = game.board();

  // Responsive Zellgröße statt des bisherigen festen 40px-Werts (2026-09-09, Rückfrage
  // "weitere Optimierungspotenziale") — dieselbe Technik wie in quest1/Board.tsx: die
  // tatsächlich zugewiesene Breite an dieser Stelle im Layout (onLayout unten) messen statt
  // sich auf die globale Fensterbreite zu verlassen (die in der Web-Vorschau die oft viel
  // breitere Browserfenster-Breite statt der schmaleren App-Rahmenbreite liefert),
  // `Dimensions.get("window")` bleibt nur als Rückfallwert für den allerersten Render.
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const bildschirmBreite = containerWidth ?? Dimensions.get("window").width;
  const maxBrettBreite = Math.floor(bildschirmBreite * 0.98);
  const cellSize = Math.max(24, Math.min(64, Math.floor((maxBrettBreite - RAHMEN_BREITE * 2) / 8)));
  // Figuren-/Marker-Größe proportional zur Zellgröße statt eines festen 30px-Werts (bisher
  // 30/40 = 75 % der Zellgröße — dasselbe Verhältnis bleibt bei jeder Bildschirmgröße erhalten).
  const figurGroesse = Math.round(cellSize * 0.75);

  const legalSet = new Set(legalZiele.map((z) => `${z.row}-${z.col}`));

  const schachPuls = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!koenigInSchachFeld) {
      schachPuls.setValue(1);
      return;
    }
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(schachPuls, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(schachPuls, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [koenigInSchachFeld?.row, koenigInSchachFeld?.col, schachPuls]);

  return (
    <View style={styles.messRahmen} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.brett, { width: cellSize * 8 + RAHMEN_BREITE * 2, height: cellSize * 8 + RAHMEN_BREITE * 2 }]}>
        {brett.flatMap((zeile, r) =>
        zeile.map((feld, c) => {
          const istDunkel = (r + c) % 2 === 1;
          const istAusgewaehlt = ausgewaehlt?.row === r && ausgewaehlt?.col === c;
          const istZiel = legalSet.has(`${r}-${c}`);
          const istSchachfeld = koenigInSchachFeld?.row === r && koenigInSchachFeld?.col === c;
          const istHinweisFeld =
            (hinweisZug?.von.row === r && hinweisZug?.von.col === c) ||
            (hinweisZug?.nach.row === r && hinweisZug?.nach.col === c);
          const Icon = feld ? (feld.color === "w" ? WEISSE_FIGUREN[feld.type] : SCHWARZE_FIGUREN[feld.type]) : null;

          return (
            <Pressable
              key={`${r}-${c}`}
              onPress={() => onFeldTipp(r, c)}
              accessibilityLabel={feld ? "Figur auf dem Feld" : istZiel ? "Zulässiges Zielfeld" : "Feld"}
              style={[styles.feld, { width: cellSize, height: cellSize }]}
            >
              {/* Kachel-Bild statt Flatcolor (2026-09-09, Angleichung ans Hauptspiel) —
                  dieselbe Image+absoluteFill+zIndex-Technik wie in quest1/Board.tsx
                  (dort aus einem echten Android-Rendering-Bug gelernt: die Kachel muss
                  explizit ganz unten liegen, alles andere darüber). */}
              {/* RN 0.86 kennt `pointerEvents` nur noch als Eigenschaft von View, nicht mehr
                  von Image. Statt die Eigenschaft ersatzlos zu streichen (was das Verhalten
                  stillschweigend ändern könnte) trägt sie jetzt eine umhüllende View — die
                  behält zugleich das `zIndex: 0`, auf das der Android-Rendering-Fix oben baut. */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
                <Image
                  source={istDunkel ? feldDunkel : feldHell}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              </View>
              {istAusgewaehlt && <View style={[styles.feldAusgewaehltUeberlagerung, { zIndex: 1 }]} pointerEvents="none" />}
              {istZiel && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="none">
                  <FreispielZielRing size={cellSize} />
                </View>
              )}
              {istHinweisFeld && !istZiel && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="none">
                  <FreispielHinweisRing size={cellSize} />
                </View>
              )}
              {istSchachfeld && (
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { zIndex: 2, transform: [{ scale: schachPuls }] }]}
                >
                  <FreispielSchachGlut size={cellSize} />
                </Animated.View>
              )}
              {/* Android-Fix (siehe identischer Fund in quest1/Board.tsx, Kopfkommentar dort):
                  die Figur explizit absolut + zIndex statt als einziges normal fließendes
                  Kind rendern, seit die Kachel jetzt selbst ein absolut positioniertes
                  Bild ist — sonst dieselbe „Figur bleibt auf Android unsichtbar"-Falle. */}
              {Icon && (
                <View style={[StyleSheet.absoluteFill, styles.figurWrap, { zIndex: 3 }]} pointerEvents="none">
                  <Icon size={figurGroesse} />
                </View>
              )}
            </Pressable>
          );
        })
        )}
      </View>
    </View>
  );
}

/** Sieg/Remis/Niederlage-Rückmeldung — bewusst ohne jeden Text (siehe Kopfkommentar).
 * Die Farbe des Kartenrands trägt die Bedeutung: sanftes Grün bei Sieg, warmes
 * Terrakotta bei Remis, gedecktes Orange (kein Alarm-Rot, Design-Grundsatz 3) bei
 * einer Niederlage — eine Niederlage bleibt ausdrücklich folgenlos. */
function ErgebnisUeberlagerung({
  ausgang,
  tier,
  remisUrsache,
  kapitel,
  onNochmal,
  onZurueck,
}: {
  ausgang: Ausgang;
  tier: WaldgefaehrtenTier;
  remisUrsache: RemisUrsache;
  kapitel: boolean;
  onNochmal: () => void;
  onZurueck: () => void;
}) {
  const Icon = kapitel ? SchildkroeteIcon : TIER_ICONS[tier];
  const farbe = ausgang === "kindGewinnt" ? "#8FA888" : ausgang === "remis" ? "#C9855F" : "#D9A26C";
  const beschriftung =
    ausgang === "kindGewinnt" ? "Gewonnen" : ausgang === "remis" ? "Unentschieden" : "Verloren, kein Problem";
  const istSieg = ausgang === "kindGewinnt";
  const zeigeUntertitel = useUntertitelAktiv();
  // `erinnerung: false`: kein Lux-Antipp-Icon auf dieser Überlagerung — eine
  // Wiederholung alle 8 Sekunden, solange das Kind hier verweilt, wäre ohne jeden Nutzen.
  const { aktuelleZeile } = useLuxSprechzeile(
    ausgang,
    () =>
      ausgang === "kindGewinnt"
        ? luxVariante(SIEG_VARIANTEN, "freispiel-ergebnis-sieg")
        : ausgang === "remis"
          ? REMIS_ZEILEN[remisUrsache]
          : luxVariante(NIEDERLAGE_VARIANTEN, "freispiel-ergebnis-niederlage"),
    undefined,
    { erinnerung: false }
  );

  // Angleichung ans Hauptspiel (2026-09-09, Rückfrage "weitere Optimierungspotenziale"):
  // ein Sieg gegen den Bot ist der eigentliche Höhepunkt des Freispiel-Modus (schaltet
  // sogar eine neue Stufe frei, siehe meldeSiegGegenStufe) — bisher aber ohne jede Feier,
  // anders als QuestGeschafft. Bewusst NUR beim Sieg (kein Haptik/Klang bei Remis/Niederlage
  // — Design-Grundsatz "niemand wird bestraft", eine Niederlage bleibt ausdrücklich
  // folgenlos, siehe Datei-Kopfkommentar).
  useEffect(() => {
    if (istSieg) {
      haptikQuestGeschafft();
      spieleQuestKlang();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.ergebnisHintergrund} onPress={onZurueck} accessibilityLabel={beschriftung} />
      <View style={styles.ergebnisMitte} pointerEvents="box-none">
        <View style={[styles.ergebnisKarte, { borderColor: farbe }]}>
          <View style={styles.ergebnisIconWrap}>
            {istSieg && <Funkeln size={130} loop pause={2600} />}
            <Icon size={72} />
          </View>
          {zeigeUntertitel && <Text style={styles.ergebnisText}>{aktuelleZeile}</Text>}
          <View style={styles.ergebnisKnopfReihe}>
            {/* Paket 3: im Kapitel gibt es kein "Nochmal" — egal wie die Partie ausgeht, sie
                zählt (Vorlage: Kapitel gilt als abgeschlossen, sobald die Partie beendet ist). */}
            {!kapitel && (
              <Pressable onPress={onNochmal} accessibilityLabel="Nochmal spielen" style={[styles.ergebnisKnopf, { backgroundColor: farbe }]}>
                <BlattNochmalIcon />
              </Pressable>
            )}
            <Pressable
              onPress={onZurueck}
              accessibilityLabel="Zurück zur Übungslichtung"
              style={[styles.ergebnisKnopf, styles.ergebnisKnopfSekundaer]}
            >
              <FarnZurueckIcon />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center" },
  kopf: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  zurueckKnopf: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4DCC8",
    alignItems: "center",
    justifyContent: "center",
  },
  gegnerAbzeichen: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E4DCC8",
    alignItems: "center",
    justifyContent: "center",
  },
  gegnerAbzeichenDenkt: { borderColor: "#C9855F" },
  kopfPlatzhalter: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  // "Lux fragen"-Sprechblase während der Partie — dieselbe Optik wie die übrigen
  // Sprechblasen im Spiel, aber ohne Schweif (die Lux-Ecke sitzt hier im Header, nicht
  // links oben) und nur sichtbar, solange eine Hinweis-Anfrage läuft.
  hinweisBlase: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginHorizontal: 20,
    marginBottom: 8,
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  hinweisBlaseText: { fontSize: 15, color: "#4A4038", textAlign: "center" },

  // Misst die tatsächlich zugewiesene Breite für die responsive Zellgröße (siehe
  // Kommentar bei `cellSize` oben) — dieselbe Technik wie `messRahmen` in quest1/Board.tsx.
  messRahmen: {
    width: "100%",
    alignItems: "center",
  },
  brett: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 16,
    borderWidth: 6,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    alignSelf: "center",
    marginTop: 12,
    overflow: "hidden",
  },
  feld: {
    borderWidth: 0.5,
    borderColor: "#C9C2B0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Löst das frühere `feldAusgewaehlt` (direkte `backgroundColor` auf der Kachel) ab —
  // seit die Kachel ein Bild ist (siehe oben), braucht die Auswahl-Markierung eine eigene
  // halbtransparente Überlagerungsebene statt einer Flächenfarbe, die vom Bild verdeckt würde.
  feldAusgewaehltUeberlagerung: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(227,217,190,0.6)",
  },
  figurWrap: { alignItems: "center", justifyContent: "center" },

  ergebnisHintergrund: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(74,64,56,0.55)" },
  ergebnisMitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  ergebnisKarte: {
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 20,
  },
  // Neue, kurze Ergebnis-Sprechzeile als Untertitel (siehe Import-Kommentar oben) —
  // gleiche Farb-/Größenkonvention wie die übrigen Lux-Sprechblasen im Spiel.
  ergebnisText: { fontSize: 15, color: "#4A4038", textAlign: "center" },
  // Selbe Zentrierungstechnik wie in QuestGeschafft.tsx: Funkeln ist absolut positioniert
  // und ohne eigene top/left-Vorgabe, Yoga zentriert es dadurch automatisch über
  // alignItems/justifyContent dieses Wraps, exakt über dem normal fließenden Icon-Kind.
  ergebnisIconWrap: { alignItems: "center", justifyContent: "center" },
  ergebnisKnopfReihe: { flexDirection: "row", gap: 16 },
  ergebnisKnopf: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  ergebnisKnopfSekundaer: { backgroundColor: "#F7F1E4", borderWidth: 1, borderColor: "#E4DCC8" },

  // Vorspiel (Farb-Einführung) — dieselben Werte wie die Lux-Sprech-Zeilen in den
  // Quest*.tsx-Screens (luxCorner/luxHead/speech/tapArea), damit sich der Moment
  // konsistent in den Rest der App einfügt.
  luxCorner: { position: "absolute", top: 24, left: 24 },
  luxHead: { width: 52, height: 48, borderRadius: 26, backgroundColor: "#E8D2B0" },
  vorspielLaden: { flex: 1, alignItems: "center", justifyContent: "center" },
  vorspielTapArea: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  vorspielText: { fontSize: 16, color: "#4A4038", textAlign: "center" },
  trennungWrap: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  trennungGruppe: { flexDirection: "row", gap: 10, position: "absolute" },
});
