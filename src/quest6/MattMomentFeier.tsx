// Paket 2 (2026-09-11, Vorlage quest6_matt_bruecke_umsetzung_2026-09-10.md, Abschnitt 4,
// Beat 3): Versöhnungsmoment nach dem ersten Matt (Design-Grundsatz 2 — niemand wird
// dauerhaft besiegt). Die drei dunklen Igel treten zur Seite, der dunkle König tritt
// einen Schritt vor und verneigt sich, dann erscheint zum ersten Mal das Krone-mit-Stern-
// Zeichen (dasselbe Icon, das später für "Matt" in den Rätseln steht). Reine Animation
// mit vorhandenen Master-Illustrationen, keine neuen Assets.

import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { BauerMasterDunkelIcon, KoenigMasterGrossDunkelIcon } from "../lib/pieceMasters";
import { KroneSternIcon } from "../lib/puzzleIcons";
import { Funkeln } from "../components/Funkeln";

export function MattMomentFeier() {
  const igelAuseinander = useRef(new Animated.Value(0)).current;
  const koenigVor = useRef(new Animated.Value(0)).current;
  const verneigen = useRef(new Animated.Value(0)).current;
  const krone = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ablauf = Animated.sequence([
      Animated.delay(250),
      Animated.timing(igelAuseinander, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(koenigVor, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(verneigen, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(250),
        Animated.timing(verneigen, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.spring(krone, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]);
    ablauf.start();
    return () => ablauf.stop();
  }, [igelAuseinander, koenigVor, verneigen, krone]);

  // Links/Mitte/Rechts: Mitte weicht nach unten aus, die beiden äußeren zur Seite.
  const igelVersatz = [
    { x: -70, y: 10 },
    { x: 0, y: 60 },
    { x: 70, y: 10 },
  ];

  return (
    <View style={styles.buehne} pointerEvents="none">
      <Animated.View
        style={[
          styles.krone,
          { opacity: krone, transform: [{ scale: krone.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
        ]}
      >
        <KroneSternIcon size={72} />
        <Funkeln />
      </Animated.View>
      <Animated.View
        style={{
          transform: [
            { translateY: koenigVor.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) },
            { rotate: verneigen.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-14deg"] }) },
          ],
        }}
      >
        <KoenigMasterGrossDunkelIcon size={130} />
      </Animated.View>
      <View style={styles.igelReihe}>
        {igelVersatz.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              transform: [
                { translateX: igelAuseinander.interpolate({ inputRange: [0, 1], outputRange: [0, v.x] }) },
                { translateY: igelAuseinander.interpolate({ inputRange: [0, 1], outputRange: [0, v.y] }) },
              ],
            }}
          >
            <BauerMasterDunkelIcon size={64} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buehne: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  krone: { marginBottom: 12, alignItems: "center", justifyContent: "center" },
  igelReihe: { flexDirection: "row", marginTop: -18, gap: 4 },
});
