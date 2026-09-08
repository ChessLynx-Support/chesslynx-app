// Kleiner, einmalig ablaufender Funkeln-Effekt (Partikel, die radial nach außen fliegen
// und dabei verblassen) — Teil der "Bewegungen für die sechs Figuren"-Ausbaustufe (siehe
// Rückfrage des Nutzers im Claude-Projekt "ChessLynx"). Bewusst als eigenständige,
// von der jeweiligen Tier-/Figur-Illustration UNABHÄNGIGE Ebene gebaut (reine
// Kreis-Partikel, keine Bildbearbeitung der Illustrationen selbst nötig) — funktioniert
// deshalb schon heute mit den aktuellen SVG-Platzhaltern (`lib/creatures.tsx`) genauso
// wie später mit den neuen, freigestellten PNG-Mastern (`Grafiken/Figuren`), ohne
// Anpassung an dieser Stelle.
//
// Technik: core `Animated`-API (nicht `react-native-reanimated`), um dem bereits
// etablierten Stil in `Verwandlung.tsx`/`Board.tsx` zu folgen statt eine zweite
// Animationsbibliothek in denselben Code-Pfad zu mischen. `reanimated` ist zwar bereits
// eine Abhängigkeit, wird aber projektweit noch nirgends tatsächlich verwendet.
//
// Farbe: Marken-Gold (#D7A52D) aus der Markenpalette (siehe Logo-Markenblatt), nicht
// frei gewählt — sorgt dafür, dass der Effekt zur restlichen Marke passt statt generisch
// zu wirken.

import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const PARTIKEL_ANZAHL = 8;
const GOLD = "#D7A52D";

// Update (Opus-Review, 2026-09-07, Befund 2.9, siehe claude/review_logik_grafik_
// audiofuehrung.md): neue `loop`-Prop. Bisher lief der Ausbruch nur einmalig ab, wodurch
// z. B. der QuestGeschafft-Screen nach ~600ms wieder komplett bewegungslos wirkte. Mit
// `loop` wiederholt sich derselbe Ausbruch endlos im Abstand `pause` (Standard 2600ms) —
// bewusst ein deutlicher Abstand statt eines dichten Dauerfeuers, damit der Effekt
// "lebendig, aber nicht hektisch" bleibt (Design-Grundsatz "kein Zeitdruck").
export function Funkeln({ size = 90, loop = false, pause = 2600 }: { size?: number; loop?: boolean; pause?: number }) {
  // Ein Animated.Value pro Partikel (Fortschritt 0→1), Start-Verzögerung leicht
  // gestaffelt, damit der Ausbruch nicht wie ein einziger starrer Ring wirkt.
  const werte = useRef(
    Array.from({ length: PARTIKEL_ANZAHL }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const ausbruch = Animated.parallel(
      werte.map((wert, i) =>
        Animated.timing(wert, {
          toValue: 1,
          duration: 600,
          delay: i * 25,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );
    // Setzt alle Partikel-Werte ohne sichtbaren Übergang (duration 0) zurück auf 0, bevor
    // die Loop-Variante von vorn beginnt — bewusst explizit statt sich auf Animated.loops
    // eingebautes Zurücksetzen zu verlassen.
    const zuruecksetzen = Animated.parallel(
      werte.map((wert) => Animated.timing(wert, { toValue: 0, duration: 0, useNativeDriver: true }))
    );
    const sequenz = loop
      ? Animated.loop(Animated.sequence([ausbruch, Animated.delay(pause), zuruecksetzen]))
      : ausbruch;
    sequenz.start();
    return () => sequenz.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radius = size / 2;

  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }]}>
      {werte.map((wert, i) => {
        const winkel = (i / PARTIKEL_ANZAHL) * Math.PI * 2;
        const zielX = Math.cos(winkel) * radius;
        const zielY = Math.sin(winkel) * radius;
        const partikelGroesse = i % 2 === 0 ? 7 : 5;

        return (
          <Animated.View
            key={i}
            style={[
              styles.partikel,
              {
                width: partikelGroesse,
                height: partikelGroesse,
                borderRadius: partikelGroesse / 2,
                opacity: wert.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: wert.interpolate({ inputRange: [0, 1], outputRange: [0, zielX] }) },
                  { translateY: wert.interpolate({ inputRange: [0, 1], outputRange: [0, zielY] }) },
                  { scale: wert.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 0.6] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  partikel: {
    position: "absolute",
    backgroundColor: GOLD,
  },
});
