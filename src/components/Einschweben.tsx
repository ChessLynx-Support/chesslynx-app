// Gerätetest 2026-09-11 (Nutzer: "Die Figur taucht relativ spät auf. Vielleicht sollte sie
// langsam reinschweben?"): lässt ein Tier während der Vorstellung (Quest 2–6, Screen 0) sanft
// von unten einschweben — ab der Zeile „Hier lebt …“ —, sodass es beim Wechsel zu Screen 1
// („Das ist ein …“) schon an genau derselben Stelle steht und nicht plötzlich auftaucht.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing } from "react-native";

export function Einschweben({ sichtbar, children, dauer = 1400 }: { sichtbar: boolean; children: ReactNode; dauer?: number }) {
  const wert = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!sichtbar) return;
    const anim = Animated.timing(wert, { toValue: 1, duration: dauer, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [sichtbar, wert, dauer]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        opacity: wert,
        transform: [
          { translateY: wert.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          { scale: wert.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
