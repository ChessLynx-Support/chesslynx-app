// LuxSprechblase.tsx — löst die bisherige, in Quest1.tsx lokal gebaute Sprechblase (ein
// View für die Box + ein zweites, um 45° gedrehtes View als Schweif) ab. Siehe Claude-
// Projekt "ChessLynx", `claude/sprechblasen_gestaltungskonzept.md`, Christians Rückmeldung
// zum bisherigen Design: "Sprechblasen wirken besser, nur die Qualität des Layouts ist zu
// einfach." Konkrete Ursache laut Dokument: Box und Schweif sind zwei unabhängige Formen
// ohne gemeinsamen Rand — an der Nahtstelle fehlt die Rand-Fortsetzung, das Auge nimmt das
// als kleinen Bruch wahr ("zwei Formen" statt "eine Sprechblase").
//
// Umgesetzt: Vorschlag B+C+D+E aus dem Dokument ("Empfehlung", vollständige Neugestaltung,
// auf ausdrücklichen Wunsch direkt so umgesetzt, ohne den Zwischenschritt A):
//   B — eine einzige, zusammenhängende SVG-Kontur für Box UND Schweif (ein `Path`, siehe
//       `pfadSprechblase` unten) — Rand/Schatten gelten dadurch automatisch für die ganze
//       Form, eine Naht ist geometrisch gar nicht mehr möglich.
//   C — dezentes, halbtransparentes Gold-Hairline innerhalb des hellen Rands (Markenbezug,
//       dieselbe Doppelkontur-Sprache wie StoppMarker/Sammel-Eichel/Zielring in
//       quest1/Board.tsx, Marken-Gold #D7A52D).
//   D — sehr sanfte Verlaufsfüllung (Weiß → App-eigener Creme-Unterton #F7F1E4) statt der
//       bisherigen flachen rgba-Fläche, dieselbe "painterly statt flat"-Linie wie bei
//       Ringen/Markern/Icons (siehe produktionsanleitung_elemente.md, Abschnitt 7.6).
//   E — kurzes Pop-in (Scale 0.9→1 + Opacity 0→1) bei jedem Zeilenwechsel, ausgelöst über
//       `zeilenSchluessel` (derselbe Key, der schon an useLuxSprechzeile übergeben wird).
//
// Bewusst NICHT Teil dieser Runde: Vorschlag F (asymmetrische, weniger stark abgerundete
// Schweif-Ecke) — laut Dokument ein separates "nice to have", das sich bei Gelegenheit
// ergänzen lässt, kein Bestandteil der als "Empfehlung" markierten Kombination.
//
// Architektur-Entscheidung (Schatten-Zuverlässigkeit): Der native RN-Schatten
// (shadowColor/shadowOpacity/…) wird auf denselben `Animated.View` gelegt, der auch die
// SVG-Form trägt, UND dieser View bekommt zusätzlich eine eigene, niedrig-transparente
// `backgroundColor` (0.4 Alpha) — ohne eigene Hintergrundfarbe würde iOS auf einem sonst
// transparenten View gar keinen Schatten berechnen (der native Schatten wird aus dem
// Alpha-Kanal DES VIEWS SELBST abgeleitet, nicht aus dem, was seine Kind-Elemente wie die
// SVG zeichnen). Die SVG-Verlaufsfüllung ist deshalb bewusst niedriger angesetzt (0.55–0.68
// Alpha statt der ursprünglichen 0.82–0.9) als die alte Flat-Fläche, damit die GESAMT-
// Deckkraft (Hintergrund-View + SVG übereinander) in etwa der ursprünglichen, vom Nutzer
// ausdrücklich gewünschten Teiltransparenz entspricht, statt durch die Kombination beider
// Ebenen ungewollt blickdichter zu werden. Ohne Live-Vorschau in dieser Umgebung nach bestem
// Wissen austariert — bei Bedarf nach Gerätetest einfach die beiden Alpha-Werte in
// `styles.traeger.backgroundColor` bzw. den `<Stop>`-Elementen unten nachjustieren.
//
// Rollout-Hinweis: Aktuell nur in Quest1.tsx eingesetzt (dort ersetzt sie
// styles.sprechblase/styles.sprechblaseSchweif). Die Übertragung auf Quest 2–6 (siehe
// claude/status_tiefenpruefung_naechste_schritte_2026-09-09.md, Punkt 4: "Gerätebestätigung
// des neuen Sprechblasen-Designs ... → danach Rollout auf Quest 2–6") ist bewusst ein
// separater, noch offener nächster Schritt und nicht Teil dieser Änderung.

import { useEffect, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Animated, StyleSheet, Text, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

const RADIUS = 22;
// Vertikale Mitte/Größe des Schweifs — an die Position des bisherigen 16×16-Quadrats
// angelehnt (top: 26, Mitte bei ca. 34, siehe Git-Historie von Quest1.tsx), damit sich die
// Blase trotz der neuen Zeichentechnik optisch nicht spürbar verschiebt.
const SCHWEIF_MITTE_Y = 34;
const SCHWEIF_BREITE = 11;
const SCHWEIF_HALBHOEHE = 8;
const HAIRLINE_ABSTAND = 3;

/** Einfaches abgerundetes Rechteck (kein Schweif) — für das innere Gold-Hairline (Vorschlag
 * C), bewusst ohne eigene Schweif-Aussparung: der winzige geometrische Versatz an der
 * Schweif-Nahtstelle ist bei 1px Strichstärke und 18% Deckkraft nicht wahrnehmbar, eine
 * zweite vollständige Schweif-Kontur wäre unnötiger Mehraufwand für denselben Effekt. */
function pfadAbgerundetesRechteck(x0: number, y0: number, x1: number, y1: number, r: number) {
  const rr = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  return [
    `M ${x0 + rr} ${y0}`,
    `H ${x1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1} ${y0 + rr}`,
    `V ${y1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1 - rr} ${y1}`,
    `H ${x0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0} ${y1 - rr}`,
    `V ${y0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y0}`,
    "Z",
  ].join(" ");
}

/** Abgerundetes Rechteck MIT integriertem Schweif als eine einzige, zusammenhängende Kontur
 * (Vorschlag B) — der Schweif ersetzt einen Teil des linken, senkrechten Segments des
 * Standard-Rounded-Rect-Pfads, statt eine eigene Form zu sein. `schweifSpitzeX` liegt links
 * von `x0` (negativ im lokalen Koordinatensystem), damit die Spitze aus der Box heraus zeigt. */
function pfadSprechblase(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  schweifMitteY: number,
  schweifSpitzeX: number,
  schweifHalbHoehe: number
) {
  const rr = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  const untereGrenze = y0 + rr + schweifHalbHoehe + 2;
  const obereGrenze = y1 - rr - schweifHalbHoehe - 2;
  const tMitte = obereGrenze >= untereGrenze ? Math.max(untereGrenze, Math.min(schweifMitteY, obereGrenze)) : (y0 + y1) / 2;
  const tOben = tMitte - schweifHalbHoehe;
  const tUnten = tMitte + schweifHalbHoehe;
  return [
    `M ${x0 + rr} ${y0}`,
    `H ${x1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1} ${y0 + rr}`,
    `V ${y1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x1 - rr} ${y1}`,
    `H ${x0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0} ${y1 - rr}`,
    `V ${tUnten}`,
    `L ${schweifSpitzeX} ${tMitte}`,
    `L ${x0} ${tOben}`,
    `V ${y0 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y0}`,
    "Z",
  ].join(" ");
}

export function LuxSprechblase({
  text,
  zeilenSchluessel,
  style,
}: {
  text: string;
  zeilenSchluessel: string | number;
  style?: StyleProp<ViewStyle>;
}) {
  // Größe wird per onLayout gemessen (dieselbe Technik wie überall sonst im Projekt, z. B.
  // cellSize in Board.tsx) statt geschätzt — Text und Zeilenumbruch bestimmen die Höhe, die
  // SVG-Form muss exakt der tatsächlich gerenderten Box folgen, nicht umgekehrt.
  const [groesse, setGroesse] = useState<{ breite: number; hoehe: number } | null>(null);
  const eintritt = useRef(new Animated.Value(0)).current;
  const vorherigerSchluessel = useRef<string | number | null>(null);

  useEffect(() => {
    if (vorherigerSchluessel.current === zeilenSchluessel) return;
    vorherigerSchluessel.current = zeilenSchluessel;
    eintritt.setValue(0);
    Animated.spring(eintritt, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }).start();
  }, [zeilenSchluessel, eintritt]);

  function aufLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setGroesse((vorher) =>
      vorher && Math.abs(vorher.breite - width) < 0.5 && Math.abs(vorher.hoehe - height) < 0.5
        ? vorher
        : { breite: width, hoehe: height }
    );
  }

  const scale = eintritt.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <Animated.View style={[styles.traeger, style, { opacity: eintritt, transform: [{ scale }] }]} onLayout={aufLayout}>
      {/* Erster Render, bevor onLayout feuert: noch keine gemessene Größe, also noch keine
          SVG-Form (nur die transparente Hintergrundfarbe von styles.traeger sichtbar) — ein
          einzelner Frame, in der bestehenden Codebasis an mehreren Stellen (z. B. cellSize-
          Fallback) genauso bewusst in Kauf genommen. */}
      {groesse && (
        <Svg
          pointerEvents="none"
          width={groesse.breite + SCHWEIF_BREITE}
          height={groesse.hoehe}
          viewBox={`0 0 ${groesse.breite + SCHWEIF_BREITE} ${groesse.hoehe}`}
          style={{ position: "absolute", left: -SCHWEIF_BREITE, top: 0 }}
        >
          <Defs>
            <LinearGradient id="sprechblaseFuellung" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.68} />
              <Stop offset="100%" stopColor="#F7F1E4" stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          <Path
            d={pfadSprechblase(
              SCHWEIF_BREITE,
              0,
              SCHWEIF_BREITE + groesse.breite,
              groesse.hoehe,
              RADIUS,
              SCHWEIF_MITTE_Y,
              0,
              SCHWEIF_HALBHOEHE
            )}
            fill="url(#sprechblaseFuellung)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1.2}
          />
          <Path
            d={pfadAbgerundetesRechteck(
              SCHWEIF_BREITE + HAIRLINE_ABSTAND,
              HAIRLINE_ABSTAND,
              SCHWEIF_BREITE + groesse.breite - HAIRLINE_ABSTAND,
              groesse.hoehe - HAIRLINE_ABSTAND,
              RADIUS - HAIRLINE_ABSTAND
            )}
            fill="none"
            stroke="#D7A52D"
            strokeWidth={1}
            strokeOpacity={0.18}
          />
        </Svg>
      )}
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  traeger: {
    // Siehe Datei-Kommentar oben ("Architektur-Entscheidung: Schatten-Zuverlässigkeit") —
    // diese Hintergrundfarbe ist bewusst niedrig angesetzt, dient in erster Linie dazu,
    // dass der native Schatten unten überhaupt etwas hat, aus dem er berechnet werden kann.
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 18,
    justifyContent: "center",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  text: { fontSize: 16, color: "#4A4038", textAlign: "center" },
});
