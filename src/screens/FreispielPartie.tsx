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
// Neue Abhängigkeit: die sechs schwarzen Cburnett-Figuren-Varianten (BauerSchwarzIcon
// usw., neu in chessPieces.tsx) — bisher gab es im Projekt nie eine Stelle mit beiden
// Farben gleichzeitig auf dem Brett. Siehe Kopfkommentar in chessPieces.tsx für die
// Details zur (bewusst vereinfachten) Umsetzung.
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
// - Sprachsynthese-Frage aus dem Entwurf bewusst NICHT hier entschieden: wie bei allen
//   Quest-Sprechzeilen (siehe SCREEN_SCRIPTS in Quest1.tsx usw.) wird der Text aktuell
//   als sichtbarer Lux-Sprechtext angezeigt (etablierte Platzhalter-Konvention dieses
//   Grundgerüsts, bis eine echte Sprachausgabe angebunden ist) — kein Bruch mit
//   "textzahlenfrei" speziell an dieser Stelle, sondern derselbe bereits bestehende,
//   projektweite Platzhalter-Zustand.
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
import { View, StyleSheet, SafeAreaView, Pressable, Animated, Text, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Chess, type Square as AlgebraicSquare, type PieceSymbol } from "chess.js";
import { holeStufe, spieleBotZug, type WaldgefaehrtenTier } from "../lib/waldfreundeBot";
import { meldeSiegGegenStufe } from "../lib/freispielFortschritt";
import { wurdeFarbeinfuehrungGezeigt, markiereFarbeinfuehrungGezeigt } from "../lib/freispielEinfuehrung";
import { EichhoernchenIcon, FuchsIcon, DachsIcon, AdlerinIcon, WolfIcon, WisentIcon } from "../lib/waldgefaehrten";
import {
  BauerIcon,
  TurmIcon,
  LaeuferIcon,
  SpringerIcon,
  DameIcon,
  KoenigIcon,
  BauerSchwarzIcon,
  TurmSchwarzIcon,
  LaeuferSchwarzIcon,
  SpringerSchwarzIcon,
  DameSchwarzIcon,
  KoenigSchwarzIcon,
} from "../lib/chessPieces";

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
  p: BauerIcon,
  r: TurmIcon,
  b: LaeuferIcon,
  n: SpringerIcon,
  q: DameIcon,
  k: KoenigIcon,
};
const SCHWARZE_FIGUREN: Record<PieceSymbol, ComponentType<{ size?: number }>> = {
  p: BauerSchwarzIcon,
  r: TurmSchwarzIcon,
  b: LaeuferSchwarzIcon,
  n: SpringerSchwarzIcon,
  q: DameSchwarzIcon,
  k: KoenigSchwarzIcon,
};

export default function FreispielPartie() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const elo: number = route.params?.elo;
  const stufe = holeStufe(elo);

  // `game` wird über seine chess.js-Methoden mutiert (wie in waldfreundeBot.ts/
  // chessEngine.ts überall üblich) — `setVersion` erzwingt danach jeweils einen
  // Re-Render, ohne dass der Wert selbst irgendwo gelesen werden muss.
  const [game] = useState(() => new Chess());
  const [, setVersion] = useState(0);
  const [ausgewaehlt, setAusgewaehlt] = useState<BoardSquare | null>(null);
  const [legalZiele, setLegalZiele] = useState<BoardSquare[]>([]);
  const [botDenkt, setBotDenkt] = useState(false);
  const [ausgang, setAusgang] = useState<Ausgang>("spielt");
  const [neuFreigeschalteteElo, setNeuFreigeschalteteElo] = useState<number | null>(null);
  const gemeldet = useRef(false); // verhindert doppeltes meldeSiegGegenStufe bei schnellem Doppel-Tipp

  // Farb-Einführung (siehe Kopfkommentar): läuft VOR dem eigentlichen Spiel ab.
  const [vorspiel, setVorspiel] = useState<VorspielPhase>("laedt");

  useEffect(() => {
    let abgebrochen = false;
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
      return "remis";
    }
    return "spielt";
  }

  function nachZugPruefen() {
    const nachKindzug = pruefeSpielende();
    if (nachKindzug !== "spielt") {
      setAusgang(nachKindzug);
      if (nachKindzug === "kindGewinnt" && !gemeldet.current) {
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
      setAusgewaehlt(null);
      setLegalZiele([]);
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
    setNeuFreigeschalteteElo(null);
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

  if (vorspiel !== "fertig") {
    const vorspielText =
      vorspiel === "text1"
        ? `Schau mal! Im Schach gibt es immer zwei Seiten: die hellen Figuren – die nennt man Weiß – und die dunklen Figuren – die nennt man Schwarz. Du spielst heute mit den hellen Figuren, du bist also Weiß. ${TIER_NAMEN_MIT_ARTIKEL[stufe.tier]} spielt mit den dunklen Figuren, also Schwarz.`
        : vorspiel === "text2"
          ? "Und weil du Weiß bist, darfst du als Erstes ziehen – das ist bei jeder Schachpartie so. Los, such dir eine Figur aus!"
          : vorspiel === "reminder"
            ? "Du bist wieder Weiß – du fängst an!"
            : "";

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.luxCorner}>
          <View style={styles.luxHead} />
        </View>
        {vorspiel === "laedt" && (
          <View style={styles.vorspielLaden}>
            <ActivityIndicator color="#8FA888" />
          </View>
        )}
        {vorspiel === "animation" && <FarbTrennungAnimation onFertig={vorspielWeiter} />}
        {(vorspiel === "text1" || vorspiel === "text2" || vorspiel === "reminder") && (
          <Pressable style={styles.vorspielTapArea} onPress={vorspielWeiter} accessibilityLabel={vorspielText}>
            <Text style={styles.vorspielText}>{vorspielText}</Text>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.kopf}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Zurück zur Übungslichtung" style={styles.zurueckKnopf}>
          <PfeilLinksIcon />
        </Pressable>
        <View style={[styles.gegnerAbzeichen, botDenkt && styles.gegnerAbzeichenDenkt]}>
          {(() => {
            const Icon = TIER_ICONS[stufe.tier];
            return <Icon size={38} />;
          })()}
        </View>
        <View style={styles.kopfPlatzhalter} />
      </View>

      <Brett
        game={game}
        ausgewaehlt={ausgewaehlt}
        legalZiele={legalZiele}
        koenigInSchachFeld={koenigInSchachFeld}
        onFeldTipp={feldAntippen}
      />

      {ausgang !== "spielt" && (
        <ErgebnisUeberlagerung ausgang={ausgang} tier={stufe.tier} onNochmal={nochmal} onZurueck={zurueckZurListe} />
      )}
    </SafeAreaView>
  );
}

/** Einmalige Farb-Einführungs-Animation (siehe Kopfkommentar und
 * freispiel_farbeinfuehrung_sprachentwurf.md): zwei anfangs überlappende Figuren-
 * Gruppen (helle/dunkle Variante von Bauer/Turm/König, bereits vorhandene Icons aus
 * chessPieces.tsx) driften sanft auseinander. Läuft automatisch ab UND ist antippbar,
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
        <BauerIcon size={30} />
        <TurmIcon size={30} />
        <KoenigIcon size={30} />
      </Animated.View>
      <Animated.View style={[styles.trennungGruppe, { opacity: deckkraft, transform: [{ translateX: dunkelVersatz }] }]}>
        <BauerSchwarzIcon size={30} />
        <TurmSchwarzIcon size={30} />
        <KoenigSchwarzIcon size={30} />
      </Animated.View>
    </Pressable>
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
  onFeldTipp,
}: {
  game: Chess;
  ausgewaehlt: BoardSquare | null;
  legalZiele: BoardSquare[];
  koenigInSchachFeld: BoardSquare | null;
  onFeldTipp: (r: number, c: number) => void;
}) {
  const brett = game.board();
  const cellSize = 40;
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
    <View style={[styles.brett, { width: cellSize * 8 + 12, height: cellSize * 8 + 12 }]}>
      {brett.flatMap((zeile, r) =>
        zeile.map((feld, c) => {
          const istDunkel = (r + c) % 2 === 1;
          const istAusgewaehlt = ausgewaehlt?.row === r && ausgewaehlt?.col === c;
          const istZiel = legalSet.has(`${r}-${c}`);
          const istSchachfeld = koenigInSchachFeld?.row === r && koenigInSchachFeld?.col === c;
          const Icon = feld ? (feld.color === "w" ? WEISSE_FIGUREN[feld.type] : SCHWARZE_FIGUREN[feld.type]) : null;

          return (
            <Pressable
              key={`${r}-${c}`}
              onPress={() => onFeldTipp(r, c)}
              accessibilityLabel={feld ? "Figur auf dem Feld" : istZiel ? "Zulässiges Zielfeld" : "Feld"}
              style={[
                styles.feld,
                { width: cellSize, height: cellSize, backgroundColor: istDunkel ? "#DED2B0" : "#F0EBDD" },
                istAusgewaehlt && styles.feldAusgewaehlt,
              ]}
            >
              {istZiel && <View style={styles.zielRing} pointerEvents="none" />}
              {istSchachfeld && (
                <Animated.View pointerEvents="none" style={[styles.schachRing, { transform: [{ scale: schachPuls }] }]} />
              )}
              {Icon && <Icon size={30} />}
            </Pressable>
          );
        })
      )}
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
  onNochmal,
  onZurueck,
}: {
  ausgang: Ausgang;
  tier: WaldgefaehrtenTier;
  onNochmal: () => void;
  onZurueck: () => void;
}) {
  const Icon = TIER_ICONS[tier];
  const farbe = ausgang === "kindGewinnt" ? "#8FA888" : ausgang === "remis" ? "#C9855F" : "#D9A26C";
  const beschriftung =
    ausgang === "kindGewinnt" ? "Gewonnen" : ausgang === "remis" ? "Unentschieden" : "Verloren, kein Problem";

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.ergebnisHintergrund} onPress={onZurueck} accessibilityLabel={beschriftung} />
      <View style={styles.ergebnisMitte} pointerEvents="box-none">
        <View style={[styles.ergebnisKarte, { borderColor: farbe }]}>
          <Icon size={72} />
          <View style={styles.ergebnisKnopfReihe}>
            <Pressable onPress={onNochmal} accessibilityLabel="Nochmal spielen" style={[styles.ergebnisKnopf, { backgroundColor: farbe }]}>
              <NochmalIcon />
            </Pressable>
            <Pressable
              onPress={onZurueck}
              accessibilityLabel="Zurück zur Übungslichtung"
              style={[styles.ergebnisKnopf, styles.ergebnisKnopfSekundaer]}
            >
              <PfeilLinksIcon />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Schlichter Pfeil nach links (Zurück-Navigation), im selben minimalen SVG-Icon-Stil
 * wie die übrigen Nicht-Kreatur-Icons der App. */
function PfeilLinksIcon({ size = 22, farbe = "#4A4038" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 4 L7 12 L15 20" fill="none" stroke={farbe} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Kreisförmiger "Nochmal"-Pfeil (Wiederholen-Symbol) für den Ergebnis-Bildschirm. */
function NochmalIcon({ size = 24, farbe = "#FFFFFF" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 12a8 8 0 1 1 2.6 5.9M4 12V6M4 12H10"
        fill="none"
        stroke={farbe}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
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
  kopfPlatzhalter: { width: 44 },

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
  },
  feldAusgewaehlt: { backgroundColor: "#E3D9BE" },
  zielRing: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#9CB89A",
  },
  schachRing: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#D98E72",
  },

  ergebnisHintergrund: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(74,64,56,0.55)" },
  ergebnisMitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  ergebnisKarte: {
    width: 220,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    paddingVertical: 28,
    gap: 20,
  },
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
