// Paket 3c (2026-09-11): fünf Trittsteine als zahlen- und textfreie Fortschrittsanzeige für das
// Kapitel „Die ganze Partie" — passend zur Steinbrücke. Fertige Etappen leuchten goldwarm, die
// aktuelle Etappe hat einen sanft pulsierenden Goldrand, spätere sind schlichte graue Steine
// (keine Sperr-Symbolik, siehe Design-Grundsätze). Mit `aufleuchten` leuchten die fertigen
// Steine nacheinander auf (Rückkehr-Screen: „Schau, so weit sind wir schon gekommen.").

import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const GOLD = "#D7A52D";
const STEIN = "#B9B2A3";
const STEIN_RAND = "#8C8475";
const STEIN_HELL = "#F1D98A";

export function Trittsteine({
  anzahl = 5,
  fertig,
  aktuell,
  groesse = 1,
  aufleuchten = false,
}: {
  anzahl?: number;
  /** Anzahl fertiger Etappen. */
  fertig: number;
  /** Aktuelle Etappe (1-basiert), bekommt den pulsierenden Rand. 0 = keine. */
  aktuell: number;
  groesse?: number;
  /** Fertige Steine nacheinander aufleuchten lassen (einmalig beim Wechsel auf true). */
  aufleuchten?: boolean;
}) {
  const leuchten = useRef(Array.from({ length: anzahl }, () => new Animated.Value(aufleuchten ? 0 : 1))).current;
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!aufleuchten) {
      leuchten.forEach((w) => w.setValue(1));
      return;
    }
    leuchten.forEach((w) => w.setValue(0));
    const ablauf = Animated.stagger(
      350,
      leuchten.slice(0, fertig).map((w) =>
        Animated.timing(w, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true })
      )
    );
    ablauf.start();
    return () => ablauf.stop();
  }, [aufleuchten, fertig, leuchten]);

  useEffect(() => {
    const schleife = Animated.loop(
      Animated.timing(puls, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const b = 30 * groesse;
  const h = 18 * groesse;

  return (
    <View style={[styles.reihe, { gap: 10 * groesse }]} pointerEvents="none" accessibilityLabel={`${fertig} von ${anzahl} Steinen`}>
      {Array.from({ length: anzahl }, (_, i) => {
        const istFertig = i < fertig;
        const istAktuell = i + 1 === aktuell;
        return (
          <View key={i} style={{ width: b, height: h, alignItems: "center", justifyContent: "center" }}>
            {/* grauer Grundstein */}
            <View style={[styles.stein, { width: b, height: h, borderRadius: h / 2 }]} />
            {/* goldwarme Füllung für fertige Etappen */}
            {istFertig && (
              <Animated.View
                style={[
                  styles.steinHell,
                  {
                    width: b,
                    height: h,
                    borderRadius: h / 2,
                    opacity: leuchten[i],
                    transform: [{ scale: leuchten[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
                  },
                ]}
              />
            )}
            {istAktuell && (
              <Animated.View
                style={[
                  styles.ring,
                  {
                    width: b + 8 * groesse,
                    height: h + 8 * groesse,
                    borderRadius: (h + 8 * groesse) / 2,
                    opacity: puls.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 0.35, 0.9] }),
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  reihe: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  stein: { position: "absolute", backgroundColor: STEIN, borderWidth: 1.5, borderColor: STEIN_RAND },
  steinHell: {
    position: "absolute",
    backgroundColor: STEIN_HELL,
    borderWidth: 1.5,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  ring: { position: "absolute", borderWidth: 2.5, borderColor: GOLD },
});
