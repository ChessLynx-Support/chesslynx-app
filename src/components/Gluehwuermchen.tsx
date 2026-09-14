// Glühwürmchen als Markierung der nächsten Wegmarke (2026-09-14).
//
// Vorgeschichte: Die nächste Station auf der Saga-Karte trug bis heute einen goldenen
// Puls-Ring — einen exakten Kreis mit 3 px Kontur. Nutzer-Feedback: "aufgrund des Nebels,
// der grüßenden Geste etc wird der Ring und die Scheibe nicht benötigt. Sie wirken störend.
// Einzige Alternative wäre ein sehr dezentes Leuchten … vielleicht in der Art wie
// Glühwürmchen."
//
// WARUM NICHT DIE VORHANDENE LOTTIE-SCHLEIFE: Auf der Karte liegt bereits
// `chesslynx-firefly-twinkle.json` als Umgebungsleben (AMBIENT_SCHLEIFEN in
// LuchsRevierKarte.tsx). Der erste Anlauf hat genau die für die Wegmarke wiederverwendet —
// und sie war im Browser unsichtbar. Grund: `AmbientLoop.web.tsx` rendert bewusst `null`,
// weil `lottie-react-native` auf Web ein nicht installiertes Paket nachzieht und sonst das
// ganze Web-Bundling scheitert (siehe dortiger Kommentar).
//
// Für reine Zierde ist das in Ordnung. Hier aber nicht: Die Glühwürmchen haben eine
// AUFGABE — sie sagen dem Kind, wo es weitergeht. Ein funktionaler Hinweis darf nicht
// davon abhängen, auf welcher Plattform die App gerade läuft. Deshalb sind sie hier aus
// einfachen Views und `Animated` gebaut: läuft überall, kostet kein Paket, keine Datei.
//
// Machart: wenige Lichtpunkte, jeder mit eigener Dauer, eigener Verzögerung und eigenem
// Weg. Nichts davon ist zufällig zur Laufzeit gewürfelt, sondern fest eingetragen — sonst
// sähe jedes Neuzeichnen anders aus. Wichtig ist nur, dass die Punkte NICHT im Gleichtakt
// leuchten: Gleichtakt liest sich sofort als Maschine, nicht als Tier.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

/** Kern und Hof eines Lichtpunkts. Warmes Gold aus der Palette, kein grelles Gelb. */
const KERN = "#FBF0C4";
const HOF = "#D7A52D";

// x/y als Anteil der Kantenlänge (0…1, von der Mitte aus gerechnet), Größe in Punkten,
// dauer = eine volle Auf-und-ab-Blende, verzoegerung = Versatz gegen die anderen.
const PUNKTE = [
  { x: -0.34, y: -0.18, groesse: 5.0, dauer: 2200, verzoegerung: 0, driftX: 5, driftY: -7 },
  { x: 0.31, y: -0.3, groesse: 4.2, dauer: 2600, verzoegerung: 700, driftX: -6, driftY: -5 },
  { x: 0.38, y: 0.16, groesse: 5.4, dauer: 1900, verzoegerung: 1400, driftX: -4, driftY: -8 },
  { x: -0.27, y: 0.27, groesse: 3.8, dauer: 2400, verzoegerung: 1900, driftX: 6, driftY: -6 },
  { x: 0.04, y: -0.42, groesse: 4.6, dauer: 2800, verzoegerung: 2600, driftX: 3, driftY: -5 },
];

function Lichtpunkt({
  punkt,
  kante,
  pausiert,
}: {
  punkt: (typeof PUNKTE)[number];
  kante: number;
  pausiert: boolean;
}) {
  const wert = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pausiert) {
      wert.stopAnimation();
      wert.setValue(0);
      return;
    }
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.delay(punkt.verzoegerung),
        Animated.timing(wert, {
          toValue: 1,
          duration: punkt.dauer / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wert, {
          toValue: 0,
          duration: punkt.dauer / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Dunkelpause: Ein Glühwürmchen leuchtet nicht ununterbrochen. Die Länge ist je
        // Punkt anders, damit die Punkte nicht nach ein paar Durchläufen wieder
        // zusammenfinden.
        Animated.delay(600 + punkt.groesse * 120),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [wert, pausiert, punkt.dauer, punkt.verzoegerung, punkt.groesse]);

  const opacity = wert.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] });
  const translateX = wert.interpolate({ inputRange: [0, 1], outputRange: [0, punkt.driftX] });
  const translateY = wert.interpolate({ inputRange: [0, 1], outputRange: [0, punkt.driftY] });
  const hofGroesse = punkt.groesse * 3.2;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: kante / 2 + punkt.x * kante - hofGroesse / 2,
        top: kante / 2 + punkt.y * kante - hofGroesse / 2,
        width: hofGroesse,
        height: hofGroesse,
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: [{ translateX }, { translateY }],
      }}
    >
      {/* Der Hof macht aus dem Punkt ein Leuchten. Ohne ihn sähe es aus wie ein Staubkorn
          auf dem Bildschirm — mit ihm wie etwas, das selbst Licht abgibt. */}
      <View
        style={{
          position: "absolute",
          width: hofGroesse,
          height: hofGroesse,
          borderRadius: hofGroesse / 2,
          backgroundColor: HOF,
          opacity: 0.28,
        }}
      />
      <View
        style={{
          width: punkt.groesse,
          height: punkt.groesse,
          borderRadius: punkt.groesse / 2,
          backgroundColor: KERN,
        }}
      />
    </Animated.View>
  );
}

/**
 * `kante` ist die Kantenlänge des quadratischen Bereichs, in dem die Punkte schweben —
 * bei der Wegmarke also etwa die Höhe des Tiers.
 */
export function Gluehwuermchen({
  kante,
  pausiert = false,
  style,
}: {
  kante: number;
  pausiert?: boolean;
  style?: { left?: number; top?: number };
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", width: kante, height: kante, ...style }}
    >
      {PUNKTE.map((p, i) => (
        <Lichtpunkt key={i} punkt={p} kante={kante} pausiert={pausiert} />
      ))}
    </View>
  );
}
