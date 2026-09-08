// Portierung von prototyp/client/src/quest1/Board.tsx nach React Native.
// Kernänderung gegenüber dem Web-Prototyp: `legalTargets` kommt nicht mehr aus einem
// hart kodierten Array im Screen-Objekt, sondern wird live aus chess.js abgeleitet
// (siehe src/lib/chessEngine.ts) — das war die zentrale, in technisches_konzept.md
// benannte Lücke des Web-Prototyps.
//
// Die Übungsfigur wird über `pieceIcon` als SVG-Illustration übergeben statt als
// schlichter Farbpunkt. WICHTIG (siehe projektwissen.md, "Verwandlungsmoment"): Board.tsx
// selbst ist neutral und weiß nichts von Tier vs. Figur — welches Icon hereingereicht
// wird, entscheidet die aufrufende Quest*.tsx. Auf dem Spielbrett wird dabei laut Design
// AUSSCHLIESSLICH die echte Schachfigur gezeigt (src/lib/chessPieces.tsx, Cburnett-Set),
// niemals das Waldtier (src/lib/creatures.tsx) — das Tier tritt nur bei der Vorstellung
// (Screen 1) auf und verwandelt sich sichtbar, dauerhaft und unumkehrbar in die Figur
// (src/lib/Verwandlung.tsx), bevor das Brett zum ersten Mal erscheint. Gegnerfigur
// (`opponentIcon`, Schritt 5) folgt demselben "Board.tsx ist neutral"-Prinzip wie
// `pieceIcon`.
//
// Update (UI-Marker-Runde, 2026-09-07, siehe priorisierter_umsetzungsplan.md, "Asset-
// Produktion Phase 1 der Checkliste ... UI-Marker"): Zielfeld-Ring und Stopp!-Ring waren
// bisher schlichte View-Rechtecke mit Rand (styles.legalRing/trapRing). Ersetzt durch
// `ZielfeldMarker`/`StoppMarker` (unten) — anders als pieceIcon/opponentIcon/blockerIcon
// bewusst NICHT über BoardConfig von außen hereingereicht, weil diese beiden Marker in
// jeder Quest identisch aussehen (kein kreaturspezifisches Icon nötig) und Board.tsx sie
// deshalb direkt selbst zeichnen kann, ohne die "Board.tsx bleibt neutral"-Regel zu
// verletzen (die gilt für Kreatur-/Figuren-Illustrationen, nicht für generisches UI-Chrome).
//
// Update (Schritt 3, 2026-09-07): Die Feldfarbe kommt jetzt aus dem neuen, orthogonalen
// Brett-Produktions-Export (siehe priorisierter_umsetzungsplan.md, Schritt 1) statt aus
// zwei flachen backgroundColor-Werten — aus dem freigestellten Brett-Master ausgeschnittene
// Feld-Kacheln (hell/dunkel, `assets/brett/tile_hell.png/.webp`, `tile_dunkel.png/.webp`),
// dieselbe lokale Schachbrettmuster-Logik (isDark) wie zuvor. Der äußere, cremefarbene
// Rahmen (styles.board) bleibt unverändert; der verzierte Bilderrahmen aus dem
// Brett-Asset wird hier bewusst NICHT verwendet (für ein volles 8×8-Brett gezeichnet,
// bei kleineren Fenstern optisch überproportioniert).
//
// Update (2026-09-07, Nutzer-Feedback nach dem Quest1–6-Testlauf): Zwei Änderungen.
// (1) `cellSize` ist nicht mehr fest 42px, sondern wird aus der tatsächlichen
// Bildschirmbreite berechnet (gedeckelt bei 42px) — Quest 2–6 zeigen ab jetzt das VOLLE
// 8×8-Brett (rows=8, cols=8, kein Fenster-Offset mehr, siehe Quest2.tsx-Quest6.tsx), und
// 8 Zellen à 42px plus Rahmen/Padding würden auf kleinen Geräten (z. B. iPhone SE, 375px
// Breite) über den Bildschirmrand hinauslaufen. Bei kleineren `cols`-Werten (Quest 1s
// 3×3-Fenster bleibt unverändert bewusst klein) bleibt die Zellgröße unverändert bei 42px,
// da die Bildschirmbreite dort nicht der begrenzende Faktor ist.
// (2) Neues, drittes optionales Icon-Feld `blockerIcon`/`blockerAt` (siehe BoardConfig
// unten) für "hier steht eine EIGENE Figur im Weg" (Stopp!-Aufgaben) — bewusst getrennt
// von `opponentIcon`, das ausschließlich echte Schlagfelder markiert. Grund: eine dunkle
// (gegnerische) Figur an einer reinen Blockade-Stelle suggerierte fälschlich "die könnte
// ich doch schlagen" — dabei ist diese Stelle in den kuratierten Stellungen
// (chessEngine.ts) ohnehin meist schon technisch eine EIGENE (weiße) Figur, nur bisher
// visuell falsch als dunkel dargestellt.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View, Pressable, Image, StyleSheet, Animated, Easing, AccessibilityInfo, Dimensions } from "react-native";
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from "react-native-svg";
import type { BoardSquare } from "../lib/chessEngine";
// Opus-Review, 2026-09-07, Abschnitt 3.1, Schritt 7 (siehe claude/review_logik_grafik_
// audiofuehrung.md): sofortiges haptisches + akustisches Feedback bei Zug/Stopp-Tap,
// unabhängig von der Sprachqualität der TTS-Anbindung (siehe luxStimme.ts).
import { haptikZug, haptikStopp } from "../lib/luxHaptik";
import { spieleZugKlang, spieleStoppKlang } from "../lib/luxKlang";
// Bugfix (Nutzer-Feedback 2026-09-07, "Die Zugvorschläge (markierte Felder und Kreise)
// pulsieren auch laggy. Die Farbgebung ist weniger hochwertig als die Spielfiguren."):
// dieselbe Einzel-Loop+Stützstellen-Technik, die den Lux-Puls geschmeidig gemacht hat
// (siehe luxAssets.tsx/LuxAtem-Kommentar), plus Verlaufsfüllungen statt Flat-Fill für
// ZielfeldMarker/BedrohungsPuls weiter unten.
import { SANFTE_PHASEN, baueSanftenVerlauf } from "../lib/luxAssets";

const feldHell = require("../../assets/brett/tile_hell.png");
const feldDunkel = require("../../assets/brett/tile_dunkel.png");

// Zielfeld-Marker (löst styles.legalRing ab): Kreisform statt abgerundetem Rechteck
// (liest sich eindeutiger als "Landeplatz"), weicher Grün-Schimmer als Füllung statt
// reiner Kontur, kleiner Mittelpunkt-Punkt (verbreitetes, gut lesbares Schach-App-Muster
// für "hier ist ein Zug möglich"), plus ein sehr sanftes, endloses Atem-Pulsieren
// (Skalierung 1,0↔1,08), das den Blick des Kindes aufs Zielfeld lenkt, ohne aufdringlich
// zu wirken (Design-Grundsatz "kein Zeitdruck/keine hektische Animation").
// Update (Opus-Review, 2026-09-07, Befund 2.5, siehe claude/review_logik_grafik_
// audiofuehrung.md): neue `variante`-Prop. "punkt" (Standard, unverändert) für leere
// Zielfelder. "ring" für Zielfelder, die ZUGLEICH ein Schlagfeld sind (hasOpponent/
// hasBlocker) — dort saß der Mittelpunkt-Punkt bisher unsichtbar HINTER der Figur; die
// Ring-Variante hat bewusst keine Füllung und keinen Mittelpunkt, wird deshalb (siehe
// Aufrufstelle unten) NACH der Figur gerendert und bleibt so als Kontur sichtbar —
// etabliertes Schach-App-Muster: Punkt = leeres Zielfeld, Ring = Schlagfeld.
function ZielfeldMarker({ size, variante = "punkt" }: { size: number; variante?: "punkt" | "ring" }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bugfix (Nutzer-Feedback 2026-09-07): dasselbe Sequence-aus-zwei-Timings-Muster wie
    // beim ursprünglichen Lux-Puls brauchte zwei Bridge-Synchronisationspunkte pro Zyklus
    // (siehe ausführliche Begründung in luxAssets.tsx/LuxAtem) — hier durch denselben
    // Einzel-Loop mit linearer Zeit + Stützstellen-Interpolation ersetzt, macht die
    // komplette Auf-und-ab-Form ganz ohne weitere JS-Beteiligung.
    const schleife = Animated.loop(
      Animated.timing(puls, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true })
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const scale = puls.interpolate({ inputRange: SANFTE_PHASEN, outputRange: baueSanftenVerlauf(1, 1.08) });
  const opacity = puls.interpolate({ inputRange: SANFTE_PHASEN, outputRange: baueSanftenVerlauf(0.85, 1) });
  // Bugfix (Nutzer-Feedback: "Die Farbgebung ist weniger hochwertig als die Spielfiguren."):
  // Verlaufsfüllung statt Flat-Fill — dasselbe "Verlaufsfüllungen statt Flat-Fill"-Muster,
  // das schon in der übrigen Design-Produktion etabliert ist. Jede ZielfeldMarker-Instanz
  // bekommt ihre eigene <Svg>-Wurzel, Gradient-IDs kollidieren deshalb trotz gleichem
  // Namen nicht zwischen den Zellen.
  const gradientId = variante === "punkt" ? "zielfeldVerlaufPunkt" : "zielfeldVerlaufRing";

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.markerWrap, { transform: [{ scale }], opacity }]}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <RadialGradient id={gradientId} cx="42%" cy="38%" r="65%">
            <Stop offset="0%" stopColor="#C8E0C2" />
            <Stop offset="55%" stopColor="#9CB89A" />
            <Stop offset="100%" stopColor="#7A9C78" />
          </RadialGradient>
        </Defs>
        {variante === "punkt" ? (
          <>
            <Circle cx={20} cy={20} r={15} fill={`url(#${gradientId})`} fillOpacity={0.3} />
            <Circle cx={20} cy={20} r={15} stroke={`url(#${gradientId})`} strokeWidth={2.5} fill="none" />
            <Circle cx={20} cy={20} r={4.5} fill={`url(#${gradientId})`} />
          </>
        ) : (
          <Circle cx={20} cy={20} r={18} stroke={`url(#${gradientId})`} strokeWidth={2.5} fill="none" />
        )}
      </Svg>
    </Animated.View>
  );
}

// Stopp!-Marker (löst styles.trapRing ab): Erscheint laut bestehender Logik (isTrapped
// unten) ohnehin nur kurz (900ms) als Reaktion NACH dem Antippen, nicht vorab als
// Warnung (bewusst, damit die Lernaufgabe nicht vorweggenommen wird) — deshalb hier mit
// einer kleinen Eintritts-Animation (Skalierung + Einblenden) statt einer statischen
// Form. Gestrichelter statt durchgezogener Ring: bewusste Wiederverwendung desselben
// "gestrichelte Linie = gerade nicht verfügbar"-Musters, das auch die Luchs-Revier-Karte
// für noch nicht erreichte Wegpunkte nutzt (siehe wettbewerbsanalyse_kinderapps_
// design.md) — konsistente visuelle Grammatik statt einer neuen Formsprache nur fürs
// Brett. Bewusst OHNE zusätzliches Zweig-/Ast-Glyph in der Mitte: Der Ring erscheint an
// derselben Stelle wie die opponentIcon/blockerIcon-Illustration und rendert davor im
// Stapel (siehe Aufrufreihenfolge unten) — ein Mittelpunkt-Glyph wäre vom Icon verdeckt.
function StoppMarker({ size }: { size: number }) {
  const eintritt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(eintritt, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [eintritt]);

  const scale = eintritt.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View pointerEvents="none" style={[styles.markerWrap, { transform: [{ scale }], opacity: eintritt }]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={15} stroke="#D98E72" strokeWidth={2.5} strokeDasharray="5,4" fill="none" />
      </Svg>
    </Animated.View>
  );
}

// Bugfix (Opus-Review, 2026-09-07, Befund 2.6, siehe claude/review_logik_grafik_
// audiofuehrung.md): warmes, endloses Pulsieren auf dem bedrohten Feld — ersetzt das
// geschriebene "Schach!"-Badge in Quest6.tsx (Verstoß gegen "Fachbegriffe werden
// gesprochen, nie geschrieben"). Bewusst ein eigener, wärmerer Farbton (dasselbe Orange
// wie StoppMarker) statt des grünen ZielfeldMarker-Tons, damit "hier ist Gefahr" optisch
// klar von "hier ist ein Zug möglich" unterscheidbar bleibt.
function BedrohungsPuls({ size }: { size: number }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bugfix (Nutzer-Feedback 2026-09-07): siehe ZielfeldMarker oben — derselbe
    // Einzel-Loop+Stützstellen-Ansatz statt des laggy Sequence-Musters.
    const schleife = Animated.loop(
      Animated.timing(puls, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const opacity = puls.interpolate({ inputRange: SANFTE_PHASEN, outputRange: baueSanftenVerlauf(0.25, 0.5) });
  const scale = puls.interpolate({ inputRange: SANFTE_PHASEN, outputRange: baueSanftenVerlauf(0.9, 1.04) });

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", width: size * 0.92, height: size * 0.92, opacity, transform: [{ scale }] }}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      {/* Verlaufsfüllung statt Flat-Fill (siehe ZielfeldMarker-Kommentar oben) — wärmerer
          Farbton (Orange) bleibt unverändert, damit "hier ist Gefahr" weiterhin klar vom
          grünen ZielfeldMarker-Ton unterscheidbar bleibt. */}
      <Svg width="100%" height="100%" viewBox="0 0 40 40">
        <Defs>
          <RadialGradient id="bedrohungsVerlauf" cx="50%" cy="50%" r="55%">
            <Stop offset="0%" stopColor="#F0A784" />
            <Stop offset="100%" stopColor="#D98E72" />
          </RadialGradient>
        </Defs>
        <Circle cx={20} cy={20} r={19} fill="url(#bedrohungsVerlauf)" />
      </Svg>
    </Animated.View>
  );
}

// Bugfix (Opus-Review, Befund 2.6): Elbow-Punkt für die gestrichelte Bedrohungslinie
// (siehe Aufrufstelle unten). Bewusst KEINE gerade Linie vom Angreifer zum bedrohten Feld —
// bei einem Springer (aktuell der einzige Anwendungsfall, Quest 6) würde eine gerade Linie
// fälschlich "Blickkontakt in einer Linie" suggerieren, obwohl der Springer bekanntlich im
// Winkel zieht (siehe Quest4.tsx). Der Linienzug folgt deshalb exakt der L-Form: erst die
// längere Achse (volle Zeilen- oder Spaltendifferenz), dann die kürzere — dieselbe Form,
// die das Kind in Quest 4 bereits als "Springer-Sprung" kennengelernt hat.
function bedrohungsElbow(von: BoardSquare, bis: BoardSquare): BoardSquare {
  const deltaRow = bis.row - von.row;
  const deltaCol = bis.col - von.col;
  return Math.abs(deltaRow) >= Math.abs(deltaCol) ? { row: bis.row, col: von.col } : { row: von.row, col: bis.col };
}

export type BoardConfig = {
  rows: number;
  cols: number;
  pieceAt: BoardSquare;
  legalTargets: BoardSquare[];
  trapTarget?: BoardSquare; // Stopp!-Aufgabe: antippbar, aber löst Konsequenz-Animation aus statt echtem Zug
  opponentAt?: BoardSquare;
  // Detailreiche Tier-Illustration (siehe src/lib/creatures.tsx) statt des schlichten
  // Platzhalter-Punkts. Optional gehalten, damit ältere Aufrufstellen ohne Anpassung
  // weiterlaufen (Fallback: pieceDot).
  pieceIcon?: ReactNode;
  // Schritt 5 der Grundgerüst-Integrationsplan-Liste (priorisierter_umsetzungsplan.md):
  // die dunkle Master-Variante DERSELBEN Quest-Kreatur statt des anonymen grauen Punkts
  // (opponentDot) — rein optische Unterscheidung, siehe dortige Entscheidung dazu, dass
  // die Quest-Texte weiterhin nie "Schwarz"/"Weiß" benennen. NUR für echte Schlagfelder
  // (Screen 5) — für reine Blockade-Stellen (Screen 4) siehe `blockerIcon` unten.
  opponentIcon?: ReactNode;
  // Reine Blockade-Stelle (Screen 4, "Stopp!"-Aufgaben): zeigt die HELLE Master-Variante
  // DERSELBEN Quest-Kreatur — "hier steht eine deiner eigenen Figuren im Weg", nicht "hier
  // ist eine gegnerische Figur zu Besuch, die man schlagen könnte". Meist identisch zu
  // `trapTarget`. Optional gehalten wie opponentIcon (Fallback: blockerDot).
  // Update (Nutzer-Feedback 2026-09-07, Quest 4/Springer: "sollten sinnvolle Züge des
  // Pferds mit weißen Figuren verdeckt werden"): akzeptiert jetzt auch ein ganzes Array,
  // damit eine Übungsfigur wie der Springer gleichzeitig von mehreren eigenen Figuren
  // umgeben gezeigt werden kann (siehe Quest4.tsx), nicht nur von einer einzelnen.
  blockerAt?: BoardSquare | BoardSquare[];
  blockerIcon?: ReactNode;
  // Bugfix (Opus-Review, Befund 2.6): rein visuelles "Schach!"-Signal statt geschriebenem
  // Text (siehe BedrohungsPuls/bedrohungsElbow oben). `bedrohtAt` ist üblicherweise
  // identisch mit `pieceAt` (der eigene König steht im Schach); als eigenes Feld gehalten,
  // falls künftig auch andere bedrohte Figuren markiert werden sollen. Beide Felder nur
  // gesetzt, wenn tatsächlich eine Bedrohung angezeigt werden soll.
  bedrohtAt?: BoardSquare;
  angreiferAt?: BoardSquare;
};

function key(s: BoardSquare) {
  return `${s.row}-${s.col}`;
}

export function Board({
  config,
  onCorrectMove,
  onTrapTap,
  disabled,
}: {
  config: BoardConfig;
  onCorrectMove: (target: BoardSquare) => void;
  onTrapTap?: () => void;
  disabled?: boolean;
}) {
  const {
    rows,
    cols,
    pieceAt,
    legalTargets,
    trapTarget,
    opponentAt,
    pieceIcon,
    opponentIcon,
    blockerAt,
    blockerIcon,
    bedrohtAt,
    angreiferAt,
  } = config;
  const [trappedKey, setTrappedKey] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  // Bugfix (Opus-Review, 2026-09-07, Befund 2.4, siehe claude/review_logik_grafik_
  // audiofuehrung.md): bisher sprang das Brett bei einem korrekten Zug sofort zum
  // nächsten Screen — die Figur bewegte sich nie sichtbar. `pieceAnim` hält die aktuelle
  // Verschiebung (in Pixeln) der Spielfigur vom Ursprungsfeld aus; `animatingTo` merkt sich
  // während der ~260ms-Animation das Zielfeld, damit die Figur an ihrer alten Position kurz
  // ausgeblendet wird (siehe hasPiece-Rendering unten) und stattdessen als frei bewegliches
  // Overlay über dem ganzen Brett gezeichnet wird (sonst würde sie beim Durchqueren
  // benachbarter Felder von deren Kachel-Bild verdeckt).
  const pieceAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [animatingTo, setAnimatingTo] = useState<{ row: number; col: number } | null>(null);

  const legalKeys = new Set(legalTargets.map(key));
  const trapKey = trapTarget ? key(trapTarget) : null;
  const pieceKey = key(pieceAt);
  const opponentKey = opponentAt ? key(opponentAt) : null;
  // Update (siehe BoardConfig-Kommentar zu blockerAt oben): akzeptiert jetzt ein Array,
  // deshalb ein Set statt eines einzelnen Schlüssels.
  const blockerKeys = new Set((Array.isArray(blockerAt) ? blockerAt : blockerAt ? [blockerAt] : []).map(key));
  const bedrohtKey = bedrohtAt ? key(bedrohtAt) : null;

  function handleTap(r: number, c: number) {
    if (disabled || animatingTo) return;
    const k = `${r}-${c}`;
    if (legalKeys.has(k)) {
      haptikZug();
      spieleZugKlang();
      const dx = (c - pieceAt.col) * cellSize;
      const dy = (r - pieceAt.row) * cellSize;
      setAnimatingTo({ row: r, col: c });
      Animated.timing(pieceAnim, { toValue: { x: dx, y: dy }, duration: 260, useNativeDriver: true }).start(() => {
        onCorrectMove({ row: r, col: c });
        pieceAnim.setValue({ x: 0, y: 0 });
        setAnimatingTo(null);
      });
      return;
    }
    if (k === trapKey) {
      haptikStopp();
      spieleStoppKlang();
      setTrappedKey(k);
      onTrapTap?.();
      AccessibilityInfo.announceForAccessibility?.("Da steht etwas im Weg.");
      setTimeout(() => setTrappedKey(null), 900);
      return;
    }
    // sanftes Feedback bei jedem anderen Tipp (kein Bestrafungs-Ton, siehe Design-Grundsatz)
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 90, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  // Zellgröße: bei kleinen Fenstern (z. B. Quest 1s 3×3) unverändert 42px; bei größeren
  // `cols`-Werten (Quest 2-6s volles 8×8-Brett) an die tatsächliche Bildschirmbreite
  // gedeckelt, damit das Brett auf kleinen Geräten nicht über den Rand hinausläuft.
  const { width: bildschirmBreite } = Dimensions.get("window");
  // 48px Sicherheitsabstand: deckt das 16px-Padding von styles.safe auf beiden Seiten
  // (32px) plus etwas Puffer ab.
  const maxBrettBreite = bildschirmBreite - 48;
  const cellSize = Math.max(24, Math.min(42, Math.floor((maxBrettBreite - 12) / cols)));

  return (
    <View
      style={[styles.board, { width: cellSize * cols + 12, height: cellSize * rows + 12 }]}
      accessibilityRole="none"
    >
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const k = `${r}-${c}`;
          const isDark = (r + c) % 2 === 1;
          const isLegal = legalKeys.has(k);
          const isTrap = k === trapKey;
          const isTrapped = isTrap && trappedKey === k;
          const hasPiece = k === pieceKey;
          const hasOpponent = k === opponentKey;
          const hasBlocker = blockerKeys.has(k);
          const istBedroht = k === bedrohtKey;

          return (
            <Pressable
              key={k}
              onPress={() => handleTap(r, c)}
              disabled={disabled}
              accessibilityLabel={
                hasPiece
                  ? "Dein Spielstein"
                  : isLegal
                    ? "Zulässiges Zielfeld"
                    : hasOpponent
                      ? "Besuchende Figur"
                      : hasBlocker
                        ? "Eigene Figur, blockiert den Weg"
                        : "Feld"
              }
              style={[styles.cell, { width: cellSize, height: cellSize }]}
            >
              <Image
                source={isDark ? feldDunkel : feldHell}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
                pointerEvents="none"
              />
              {/* Bugfix (Opus-Review 2.6): warmer Puls VOR allen anderen Markern/Figuren
                  gerendert (unterste Ebene direkt über der Kachel), damit König-Icon und
                  ggf. ein ZielfeldMarker weiterhin klar erkennbar darüber liegen. */}
              {istBedroht && (
                <View pointerEvents="none" style={styles.markerWrap}>
                  <BedrohungsPuls size={cellSize} />
                </View>
              )}
              {isLegal && !(hasOpponent || hasBlocker) && <ZielfeldMarker size={cellSize} />}
              {isTrapped && <StoppMarker size={cellSize} />}
              {hasOpponent && (opponentIcon ?? <View style={styles.opponentDot} />)}
              {hasBlocker && (blockerIcon ?? <View style={styles.blockerDot} />)}
              {/* Bugfix (Opus-Review 2.5): Ring-Variante NACH der Figur gerendert (statt
                  davor wie der Punkt), damit sie als Kontur sichtbar bleibt statt hinter
                  der Figur zu verschwinden. */}
              {isLegal && (hasOpponent || hasBlocker) && <ZielfeldMarker size={cellSize} variante="ring" />}
              {/* Bugfix (Opus-Review, 2026-09-07, Befund 2.3, behebt zugleich 1.6, siehe
                  claude/review_logik_grafik_audiofuehrung.md): weicher Marken-Gold-Sockel
                  hinter der eigenen Figur, damit sie auf einen Blick von einer optisch
                  identischen Blocker-Figur (z. B. Quest 5: zwei gleiche Damen) unterscheidbar
                  ist — ohne die Master-Illustrationen selbst anzufassen. */}
              {hasPiece && !animatingTo && (
                <View pointerEvents="none" style={styles.markerWrap}>
                  <View
                    style={[
                      styles.pieceSockel,
                      { width: cellSize * 0.74, height: cellSize * 0.74, borderRadius: 999 },
                    ]}
                  />
                </View>
              )}
              {hasPiece && !animatingTo && (
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                  {pieceIcon ?? <View style={styles.pieceDot} />}
                </Animated.View>
              )}
            </Pressable>
          );
        })
      )}
      {/* Bugfix (Opus-Review 2.6): gestrichelte Bedrohungslinie vom Angreifer zum bedrohten
          Feld, als L-förmiger Linienzug über zwei Segmente (siehe bedrohungsElbow oben)
          statt einer geraden Linie. */}
      {bedrohtAt && angreiferAt && (
        <Svg
          pointerEvents="none"
          width={cellSize * cols}
          height={cellSize * rows}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {(() => {
            const mitte = (s: BoardSquare) => ({ x: s.col * cellSize + cellSize / 2, y: s.row * cellSize + cellSize / 2 });
            const elbow = bedrohungsElbow(angreiferAt, bedrohtAt);
            const p1 = mitte(angreiferAt);
            const pe = mitte(elbow);
            const p2 = mitte(bedrohtAt);
            return (
              <>
                <Line x1={p1.x} y1={p1.y} x2={pe.x} y2={pe.y} stroke="#D98E72" strokeWidth={2.5} strokeDasharray="6,5" />
                <Line x1={pe.x} y1={pe.y} x2={p2.x} y2={p2.y} stroke="#D98E72" strokeWidth={2.5} strokeDasharray="6,5" />
              </>
            );
          })()}
        </Svg>
      )}
      {/* Bugfix (Opus-Review 2.4): frei bewegliches Overlay für den animierten Zug — liegt
          als letztes Kind über allen Feldern, damit die Figur beim Durchqueren
          benachbarter Felder nicht von deren Kachel-Bild verdeckt wird (siehe Kommentar bei
          pieceAnim/animatingTo oben). */}
      {animatingTo && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: pieceAt.col * cellSize,
            top: pieceAt.row * cellSize,
            width: cellSize,
            height: cellSize,
            alignItems: "center",
            justifyContent: "center",
            transform: pieceAnim.getTranslateTransform(),
          }}
        >
          {pieceIcon ?? <View style={styles.pieceDot} />}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 20,
    borderWidth: 6,
    // Bugfix (Opus-Review, 2026-09-07, Befund 2.7, siehe claude/review_logik_grafik_
    // audiofuehrung.md): borderColor war bislang identisch mit backgroundColor — der
    // 6px-Rahmen war dadurch faktisch unsichtbar. Jetzt eine abgesetzte, aber verwandte
    // Rahmenfarbe plus ein dezenter Schatten, damit sich das Brett vom Hintergrund löst.
    borderColor: "#E4DAC6",
    backgroundColor: "#F7F1E4",
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cell: {
    // Bugfix (Opus-Review, Befund 2.9): der 0,5px-Zellrahmen konkurrierte optisch mit der
    // Kachel-Textur (tile_hell.png/tile_dunkel.png) — testweise entfernt. borderColor
    // bleibt stehen, falls sich das auf dem Gerät als Rückschritt erweist und die Linie
    // wieder gebraucht wird (dann borderWidth zurück auf 0.5).
    borderWidth: 0,
    borderColor: "#C9C2B0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Gemeinsamer Positionierungs-Rahmen für ZielfeldMarker/StoppMarker (siehe oben) —
  // löst styles.legalRing/trapRing ab, die jetzt als SVG statt reinem View-Rand
  // gezeichnet werden.
  markerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  // Bugfix (Opus-Review, Befund 2.3/1.6): weicher Marken-Gold-Sockel hinter der eigenen
  // Figur (siehe Aufrufstelle oben) — Marken-Gold (#D7A52D, dieselbe Farbe wie Funkeln.tsx)
  // bei niedriger Deckkraft, damit er die Figur nicht überstrahlt.
  pieceSockel: {
    backgroundColor: "#D7A52D",
    opacity: 0.16,
  },
  // Fallback-Punkt, nur falls ein Aufrufer keine pieceIcon übergibt (aktuell nutzen alle
  // sechs Quests eine Tier-Illustration aus src/lib/creatures.tsx). Feste Pixelmaße statt
  // Prozent, da der umgebende Animated.View jetzt kein Eigenmaß mehr vorgibt (die
  // Illustrationen bringen ihre eigene Größe über die `size`-Prop mit).
  pieceDot: {
    width: 29,
    height: 29,
    borderRadius: 999,
    backgroundColor: "#C9855F",
  },
  // Fallback-Punkt, nur falls ein Aufrufer kein opponentIcon übergibt (aktuell übergeben
  // alle Quests außer Quest 1 noch keins, siehe Schritt 5 in priorisierter_
  // umsetzungsplan.md — dort ist bisher nur die dunkle Igel-Variante verdrahtet).
  opponentDot: {
    width: "60%",
    height: "60%",
    borderRadius: 999,
    backgroundColor: "#A6AEB8",
  },
  // Fallback-Punkt, nur falls ein Aufrufer kein blockerIcon übergibt. Bewusst ein anderer
  // Farbton als pieceDot (#C9855F) und opponentDot (#A6AEB8), damit auch der Platzhalter
  // schon "eigene Figur" von "Besuchsfigur" unterscheidbar wäre.
  blockerDot: {
    width: "60%",
    height: "60%",
    borderRadius: 999,
    backgroundColor: "#D8C7A1",
  },
});
