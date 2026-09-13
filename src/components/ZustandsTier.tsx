// Zustands-Renderer für die lebendigen Tiere und für Lux (2026-09-13).
//
// Hintergrund: Seit dem 2026-09-11 entstehen die Bewegungen der Figuren nach der
// Zustands-Methode — das Bild-Tool liefert vollständige Bilder, `scripts/rig_master.py`
// baut daraus deckungsgleiche Zustände und exportiert sie in die App (siehe
// claude/rig_master_system_2026-09-12.md). Bis hierher zeigte die App davon nur den
// Grundzustand als einzelnes Standbild; die fertigen Zustände lagen ungenutzt im
// Rig-Paket.
//
// Diese Komponente ist die Gegenstelle dazu: Sie legt einen zweiten Zustand deckungsgleich
// über den Grundzustand und blendet ihn ein und aus. Mehr braucht es nicht, weil die
// Exporte per Konstruktion dieselbe Leinwand, denselben Maßstab und dieselbe Bodenlinie
// haben — sie sind aus demselben Bezugszustand gerechnet. Deshalb gibt es hier auch keine
// Positionierungslogik: beide Bilder liegen einfach übereinander.
//
// Warum Überblenden und nicht Umschalten: Ein harter Wechsel zeigt beide Bilder je einen
// Frame lang gleichzeitig nicht an und wirkt als Ruckeln. 90 ms Überblendung genügen, um
// daraus ein Lidschlag-Gefühl zu machen, und sind kurz genug, dass das Auge die Kontur
// nicht vergleicht.
//
// Die Blinzel-Pausen sind bewusst zufällig (3–6 s): Bei festem Takt fällt zweierlei auf —
// dass es eine Schleife ist, und dass alle sechs Tiere auf der Saga-Karte gleichzeitig
// blinzeln.

import { useEffect, useRef, useState } from "react";
import { Animated, Image, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

/** Dauer einer Überblendung in beide Richtungen. */
const UEBERBLENDUNG_MS = 90;
/** Wie lange die Lider unten bleiben. */
const LIDSCHLAG_MS = 120;
const PAUSE_MIN_MS = 3000;
const PAUSE_MAX_MS = 6000;

type Props = {
  /** Grundzustand — liegt immer unten und ist nie transparent. */
  grund: ImageSourcePropType;
  /** Blinzel-Zustand, deckungsgleich zum Grundzustand. Fehlt er, wird nicht geblinzelt. */
  blinzeln?: ImageSourcePropType;
  /**
   * Zustand, der solange gezeigt wird, wie `aktiv` gesetzt ist (z. B. der offene Mund,
   * während eine Sprechzeile läuft). Überlagert das Blinzeln nicht — beide sind eigene
   * Ebenen und dürfen gleichzeitig sichtbar sein.
   */
  aktiverZustand?: ImageSourcePropType;
  aktiv?: boolean;
  breite: number;
  hoehe: number;
  /** Blinzeln abschaltbar, etwa für Standbilder in der Ruhmeshalle. */
  idle?: boolean;
  accessibilityLabel?: string;
};

// Derselbe Android-Fix wie in pieceMasters.tsx/questTiere.tsx: ohne diese Prop blendet
// Android jedes Bild beim ersten Anzeigen 300 ms lang ein, was hier als Aufblitzen der
// oberen Ebene sichtbar wäre.
const ANDROID_FIX_PROPS = { fadeDuration: 0 } as const;

export function ZustandsTier({
  grund,
  blinzeln,
  aktiverZustand,
  aktiv = false,
  breite,
  hoehe,
  idle = true,
  accessibilityLabel,
}: Props) {
  const lid = useRef(new Animated.Value(0)).current;
  const zustand = useRef(new Animated.Value(0)).current;
  // Erst nach dem ersten Blinzeln überhaupt einhängen: Solange nie geblinzelt wurde, muss
  // das zweite Bild nicht geladen werden — auf der Saga-Karte spart das sechs Dekodier-
  // vorgänge beim Öffnen des Screens.
  const [lidGeladen, setLidGeladen] = useState(false);

  useEffect(() => {
    if (!idle || !blinzeln) return;
    let abgebrochen = false;
    let timer: ReturnType<typeof setTimeout>;

    const plane = () => {
      const pause = PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
      timer = setTimeout(() => {
        if (abgebrochen) return;
        setLidGeladen(true);
        Animated.sequence([
          Animated.timing(lid, {
            toValue: 1,
            duration: UEBERBLENDUNG_MS,
            useNativeDriver: true,
          }),
          Animated.delay(LIDSCHLAG_MS),
          Animated.timing(lid, {
            toValue: 0,
            duration: UEBERBLENDUNG_MS,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!abgebrochen) plane();
        });
      }, pause);
    };

    plane();
    return () => {
      abgebrochen = true;
      clearTimeout(timer);
      lid.stopAnimation();
    };
  }, [idle, blinzeln, lid]);

  useEffect(() => {
    Animated.timing(zustand, {
      toValue: aktiv ? 1 : 0,
      duration: UEBERBLENDUNG_MS,
      useNativeDriver: true,
    }).start();
  }, [aktiv, zustand]);

  const masse = { width: breite, height: hoehe } as const;

  return (
    <View style={masse} accessibilityLabel={accessibilityLabel}>
      <Image source={grund} style={masse} resizeMode="contain" {...ANDROID_FIX_PROPS} />
      {aktiverZustand ? (
        <Animated.Image
          source={aktiverZustand}
          style={[masse, { position: "absolute", left: 0, top: 0, opacity: zustand }]}
          resizeMode="contain"
          {...ANDROID_FIX_PROPS}
        />
      ) : null}
      {blinzeln && lidGeladen ? (
        <Animated.Image
          source={blinzeln}
          style={[masse, { position: "absolute", left: 0, top: 0, opacity: lid }]}
          resizeMode="contain"
          {...ANDROID_FIX_PROPS}
        />
      ) : null}
    </View>
  );
}
