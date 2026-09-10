// FortschrittsRing — animierter SVG-Ring in Marken-Gold, der sich über `durationMs`
// füllt, solange `active` true ist (und sich zügig zurücksetzt, wenn `active` vorher
// wieder false wird). Erster Einsatzort: ParentGate.tsx — die 3-Sekunden-Halte-Fläche
// gab bisher NULL visuelles Feedback während des Haltens (siehe Claude-Projekt
// "ChessLynx", `visuelle_politur_buttons_grafiken.md`, Priorität 1). Bewusst als reines
// Vektor-UI-Chrome umgesetzt (kein Bild-Asset), gleiche Kategorie wie `ZielfeldMarker`/
// `StoppMarker` in quest1/Board.tsx — siehe `produktionsanleitung_elemente.md`,
// Abschnitt 7.3.
//
// Technik: core `Animated`-API (nicht reanimated, gleicher Grund wie in Funkeln.tsx —
// Stilkonsistenz mit Verwandlung.tsx/Board.tsx). `strokeDashoffset` ist keine
// Transform-/Opacity-Eigenschaft, react-native-svg kann sie deshalb nicht mit
// `useNativeDriver: true` animieren — bewusst `false`, wie es die Bibliothek für
// SVG-Strichprops verlangt.

import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { hexAufhellen, hexAbdunkeln } from "../lib/farbverlauf";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const GOLD = "#D7A52D";

type FortschrittsRingProps = {
  active: boolean;
  durationMs?: number;
  size?: number;
  strokeWidth?: number;
  farbe?: string;
  hintergrundFarbe?: string;
  onComplete?: () => void;
};

export function FortschrittsRing({
  active,
  durationMs = 3000,
  size = 140,
  strokeWidth = 6,
  farbe = GOLD,
  hintergrundFarbe = "#E4DAC6",
  onComplete,
}: FortschrittsRingProps) {
  const fortschritt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.timing(fortschritt, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onComplete?.();
      });
    } else {
      // Zügiges, aber sichtbares Zurückfedern statt eines harten Sprungs auf 0 — macht
      // ein zu früh losgelassenes Halten spürbar "unfertig", statt kommentarlos zu
      // verschwinden.
      Animated.timing(fortschritt, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, durationMs]);

  const radius = (size - strokeWidth) / 2;
  const umfang = 2 * Math.PI * radius;
  const dashoffset = fortschritt.interpolate({ inputRange: [0, 1], outputRange: [umfang, 0] });

  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Visuelle-Politur-Runde (2026-09-09): Verlauf statt Flatcolor für den
              animierten Bogen — aus `farbe` selbst abgeleitet (siehe lib/farbverlauf.ts),
              damit ein künftiger Aufruf mit anderer Farbe automatisch mitgeht statt einen
              hart codierten zweiten Goldton zu benötigen. */}
          <LinearGradient id="fortschrittVerlauf" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={hexAufhellen(farbe, 0.35)} />
            <Stop offset="100%" stopColor={hexAbdunkeln(farbe, 0.2)} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={hintergrundFarbe}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#fortschrittVerlauf)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${umfang}, ${umfang}`}
          strokeDashoffset={dashoffset}
          // Ring beginnt oben (12-Uhr-Position) statt bei 3 Uhr (SVG-Kreis-Standard) —
          // liest sich für ein Halte-Feedback intuitiver ("füllt sich wie eine Uhr").
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
});
