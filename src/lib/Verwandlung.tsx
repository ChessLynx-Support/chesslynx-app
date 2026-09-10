// Der "Verwandlungsmoment": beim Übergang von der Tier-Vorstellung (Screen 1, "Das ist
// ein/eine …") zur Bewegungs-Aufgabe (Screen 2) verwandelt sich das Waldtier sichtbar,
// dauerhaft und unumkehrbar in die echte Schachfigur — siehe projektwissen.md, Abschnitt
// "Tier-Zuordnung und Verwandlungsmoment": "Kein Tier-/Figuren-Umschalter danach." Ab
// hier zeigt das Spielbrett in jeder Quest nur noch die echte Figur, das Tier taucht in
// derselben Quest nicht mehr auf.
//
// Rein automatisch ablaufende Überblendung, keine Kind-Interaktion nötig — bewusst kein
// Countdown/Zeitdruck-Element (Design-Grundsatz 1), die Animation läuft einmal ab und
// ruft danach `onDone` auf, das den nächsten Screen zeigt.
//
// Update (2026-09-10, Kurztest-Feedback: "Die Einführung in die Quests, mit Animation,
// sollte nicht durch Klick zu unterbrechen sein"): die Animation war bisher komplett in
// einen Pressable gehüllt (eine `ueberspringen()`-Funktion stoppte die Sequenz und rief
// sofort `onDone()` auf), ursprünglich als bewusste Opus-Review-Entscheidung vom
// 2026-09-07 ("Wiederholbarkeit statt Zeitdruck ... antippbar überspringbar"). Genau
// dieses Antippbar-Sein führte jetzt dazu, dass ein einzelner, auch unabsichtlicher Tipp
// des Kindes den eigentlichen Verwandlungsmoment abschnitt, bevor er zu sehen war — das
// widerspricht dem eigentlichen Zweck dieser Animation (siehe oben: "GRÖSSEN-Verwandlung
// ... exakt dieselbe Grafik"). Pressable und die Skip-Funktion sind deshalb ersatzlos
// entfernt — die Animation läuft jetzt immer vollständig durch.

//
// Update (Schritt 6 der Grundgerüst-Integrationsplan-Liste, priorisierter_
// umsetzungsplan.md, 2026-09-07): komplett neu gedacht, siehe Rückfrage im Claude-Projekt
// "ChessLynx". Der Verwandlungsmoment ist jetzt NICHT mehr eine Überblendung zwischen zwei
// unterschiedlich aussehenden Bildern (Tier-SVG → Cburnett-Figur-SVG), sondern eine
// GRÖSSEN-Verwandlung derselben neuen Master-Illustration: "Das Tier, das Lux im Wald
// kennengelernt hat" (groß, Screen 1) wird sichtbar kleiner und wird dadurch zur
// Spielfigur auf dem Schachbrett — exakt dieselbe Grafik, nur in der Größe, in der sie
// gleich auf dem Brett erscheint (siehe `kleinGroesse`, standardmäßig identisch zur
// `pieceIcon`-Standardgröße in pieceMasters.tsx). Dahinter steckt fachlich: der Nutzer
// nutzt weiterhin dieselbe Master-Datei-Familie, nur zwei Export-Auflösungen ("groß" für
// Saga-Karte/Vorstellung, "klein" fürs Spielbrett) — siehe pieceMasters.tsx-Kommentar zur
// Auflösungs-Recherche. Effekt-Aufbau (bewusst mehrschichtig für einen "ausgereiften"
// Eindruck statt eines einzelnen linearen Scale-Tweens):
//   1. Ankündigung — warmes Licht (glow) blendet auf und wächst leicht.
//   2. Anticipation — die Figur "holt Luft" (minimaler Scale-Overshoot nach oben), ein
//      klassisches Animationsprinzip, bevor die eigentliche Bewegung (hier: Schrumpfen)
//      einsetzt.
//   3. Schrumpfen — die Figur federt (Animated.spring) von groß auf klein, dabei ein
//      kurzes, leichtes Wackeln (Rotation ±6°) für einen verspielten statt mechanischen
//      Eindruck, während ein dünner Goldring als "Magie-Puls" nach außen wächst und
//      verblasst und der Lichtschein synchron mitschrumpft.
//   4. Funkeln — im Moment, in dem die Figur einrastet, ein kurzer Funkeln-Ausbruch
//      (components/Funkeln.tsx).
//   5. Ausklang — der Lichtschein verblasst, danach `onDone()`.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { Funkeln } from "../components/Funkeln";

// Zeitpunkt (ms), an dem die Figur laut Sequenz unten eingerastet ist und das Funkeln
// einsetzen soll: Ankündigung (300ms) + Anticipation (140ms) + größter Teil der
// Schrumpf-Feder (~460ms) ≈ 900ms.
const FUNKELN_START_MS = 900;

export function Verwandlung({
  figur,
  grossGroesse = 140,
  kleinGroesse = 34,
  onDone,
}: {
  /** Die große Master-Illustration, bereits auf `grossGroesse` skaliert (z. B. <BauerMasterGrossIcon size={140} />). */
  figur: ReactNode;
  /** Muss zur tatsächlichen Größe des `figur`-Elements passen — bestimmt die Boxgröße von Lichtschein/Ring. */
  grossGroesse?: number;
  /** Zielgröße nach der Verwandlung — standardmäßig identisch zur pieceIcon-Standardgröße auf dem Brett (34px, siehe Board.tsx/pieceMasters.tsx), damit die Figur exakt in der Größe einrastet, die sie im nächsten Screen ohnehin hat. */
  kleinGroesse?: number;
  onDone: () => void;
}) {
  const zielSkalierung = kleinGroesse / grossGroesse;

  const figurSkalierung = useRef(new Animated.Value(1)).current;
  const wackeln = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowSkalierung = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringSkalierung = useRef(new Animated.Value(0.6)).current;
  const [zeigeFunkeln, setZeigeFunkeln] = useState(false);
  // Update (2026-09-10, siehe Datei-Kommentar oben): die frühere antippbare
  // "ueberspringen()"-Funktion (Opus-Review 2026-09-07, Abschnitt 3.3) ist entfallen —
  // `fertig` bleibt trotzdem als einfache Absicherung gegen einen doppelten
  // `onDone()`-Aufruf bestehen (z. B. falls die Sequenz-Callback-Logik künftig erweitert
  // wird).
  const fertig = useRef(false);

  useEffect(() => {
    const funkelnTimer = setTimeout(() => setZeigeFunkeln(true), FUNKELN_START_MS);

    const sequenz = Animated.sequence([
      // 1. Ankündigung: warmes Licht blendet auf
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(glowSkalierung, {
          toValue: 1.15,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 2. Anticipation: kurzer Aufwärts-Puff, bevor die Figur schrumpft
      Animated.timing(figurSkalierung, {
        toValue: 1.07,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // 3. Schrumpfen: Feder-Bewegung + leichtes Wackeln + Magie-Ring + mitschrumpfender Lichtschein
      Animated.parallel([
        Animated.spring(figurSkalierung, {
          toValue: zielSkalierung,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(wackeln, { toValue: 1, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(wackeln, { toValue: -1, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(wackeln, { toValue: 0, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
            Animated.timing(ringSkalierung, {
              toValue: 1.5,
              duration: 460,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ringOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]),
        Animated.timing(glowSkalierung, {
          toValue: 0.55,
          duration: 460,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(250),
      // 5. Ausklang
      Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);

    sequenz.start(({ finished }) => {
      if (finished && !fertig.current) {
        fertig.current = true;
        onDone();
      }
    });
    return () => {
      sequenz.stop();
      clearTimeout(funkelnTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drehung = wackeln.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] });
  const wrapGroesse = grossGroesse + 80;
  const glowGroesse = grossGroesse + 40;
  const ringGroesse = grossGroesse + 20;

  return (
    // Siehe Datei-Kommentar oben (Update 2026-09-10): kein Pressable/onPress mehr — die
    // Animation läuft immer vollständig durch, statt durch einen (auch unabsichtlichen)
    // Kind-Tipp abgeschnitten werden zu können.
    <View style={[styles.wrap, { width: wrapGroesse, height: wrapGroesse }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: glowGroesse,
            height: glowGroesse,
            borderRadius: glowGroesse / 2,
            opacity: glowOpacity,
            transform: [{ scale: glowSkalierung }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: ringGroesse,
            height: ringGroesse,
            borderRadius: ringGroesse / 2,
            opacity: ringOpacity,
            transform: [{ scale: ringSkalierung }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: figurSkalierung }, { rotate: drehung }] }}>{figur}</Animated.View>
      {zeigeFunkeln && <Funkeln size={grossGroesse * 1.1} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "#F4EDE0",
  },
  ring: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#D7A52D", // Marken-Gold, siehe Funkeln.tsx
  },
});
