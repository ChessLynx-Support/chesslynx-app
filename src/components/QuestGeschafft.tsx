// Feier-Animation für den Moment "Quest abgeschlossen" (Screen 7 in Quest1.tsx, analog
// für Quest2–6) — siehe Rückfrage des Nutzers im Claude-Projekt "ChessLynx" zu kleinen
// Bewegungen bei den sechs Figuren. Bewusst eine reine "ganze Figur bewegt sich"-
// Animation (Hüpfen/Wippen der kompletten Illustration + Funkeln drumherum), KEINE
// Bewegung einzelner Körperteile (Flügel/Ohr/Schwanz) — die aktuellen Freistellungen
// (sowohl die alten SVG-Platzhalter als auch die neuen PNG-Master aus Grafiken/Figuren)
// sind einteilige Illustrationen ohne separate Teil-Ebenen, echte Teil-Animation würde
// wie beim Lux-Rig eine eigene Mehrebenen-Zerlegung pro Tier voraussetzen (siehe
// design_bibliotheken_und_lizenzen.md) — hier bewusst nicht gebraucht.
//
// `children` ist die zu feiernde Illustration (aktuell z. B. <BauerIcon/>, später der
// PNG-Produktions-Export der jeweiligen Figur) — diese Komponente weiß selbst nichts
// über Tier vs. Figur, genau wie Board.tsx/Verwandlung.tsx neutral bleiben.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { Funkeln } from "./Funkeln";
import type { ReactNode } from "react";
// Opus-Review, 2026-09-07, Abschnitt 3.1, Schritt 7 (siehe claude/review_logik_grafik_
// audiofuehrung.md): haptisches + akustisches Erfolgs-Feedback beim Quest-Abschluss.
import { haptikQuestGeschafft } from "../lib/luxHaptik";
import { spieleQuestKlang } from "../lib/luxKlang";

export function QuestGeschafft({ children }: { children: ReactNode }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const drehung = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptikQuestGeschafft();
    spieleQuestKlang();
    const sequenz = Animated.sequence([
      // sanftes Hereinploppen (gleiche Federcharakteristik wie in Verwandlung.tsx, damit
      // sich Verwandlung → Feier stimmig anfühlen)
      Animated.spring(scale, { toValue: 1.15, friction: 4, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      // zwei kleine, freudige Wippbewegungen links/rechts
      Animated.sequence([
        Animated.timing(drehung, { toValue: 1, duration: 140, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drehung, { toValue: -1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drehung, { toValue: 0, duration: 140, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    sequenz.start();
    return () => sequenz.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotate = drehung.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] });

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Bugfix (Opus-Review, 2026-09-07, Befund 2.9, siehe claude/review_logik_grafik_
          audiofuehrung.md): Funkeln lief bisher nur einmalig ab, danach wirkte der Screen
          wieder komplett bewegungslos. `loop` lässt denselben Ausbruch im Abstand von
          3200ms endlos wiederholen, solange der Screen sichtbar bleibt. */}
      <Funkeln size={110} loop pause={3200} />
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>{children}</Animated.View>
    </View>
  );
}
