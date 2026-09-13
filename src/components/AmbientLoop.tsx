// Paket 11 (2026-09-12) — dezente Umgebungsanimation auf Basis von `lottie-react-native`
// (Apache-2.0, siehe NOTICE.md). Gedacht für die vier handgebauten Bodymovin-Schleifen in
// `assets/lottie/`: Baumwiegen, Glühwürmchen, Wasserglanz, Vogelauffliegen.
//
// GRUNDGEDANKE: Diese Schleifen sind Hintergrundleben, keine Information. Ein Kind, das die
// Karte anschaut, soll den Wald atmen sehen — es soll aber nie den Eindruck bekommen, dass
// sich hier etwas bewegt, worauf es reagieren müsste. Deshalb:
//   - keine Interaktion (`pointerEvents="none"`), die Schleife schluckt keinen Tipp;
//   - kein Ton, keine Farbwechsel, keine Bewegung über größere Strecken;
//   - versetzter Start (`verzoegerungMs`), damit mehrere Schleifen auf einem Screen nicht
//     im Gleichtakt laufen — synchrone Wiederholung fällt sofort als "Maschine" auf.
//
// LEISTUNG: Jede laufende Lottie-Ansicht kostet auf Android spürbar, und der Android-
// Speicherverdacht aus `status_content_produktion.md` ist noch nicht endgültig ausgeräumt.
// Deshalb gibt es `pausiert` — die Karte soll die Schleifen anhalten, sobald der Screen
// nicht mehr im Vordergrund steht (`useFocusEffect`). Faustregel aus der Erprobung: nicht
// mehr als drei gleichzeitig sichtbare Schleifen pro Screen.
//
// BEWEGUNGSREDUKTION: Wer im Betriebssystem "Animationen reduzieren" eingeschaltet hat,
// bekommt hier gar keine Bewegung — die Schleife wird dann auf ein einzelnes Standbild
// (Frame 0) eingefroren statt entfernt, damit sich das Layout nicht verändert.
//
// ROBUSTHEIT: Fällt die Schleife aus irgendeinem Grund aus (defekte JSON, Modul im Client
// nicht vorhanden), rendert die Komponente nichts und der Screen bleibt vollständig
// benutzbar. Eine Zierde darf nie einen Bildschirm mitreißen.

import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import LottieView from "lottie-react-native";

type Props = {
  /** Die Bodymovin-JSON, z. B. require("../../assets/lottie/chesslynx-tree-sway.json"). */
  quelle: any;
  /** Kantenlänge in Punkten. Die vier Schleifen sind quadratisch angelegt. */
  groesse: number;
  /** Absolute Position auf dem Elternelement. Ohne Angabe fügt sich die Schleife normal ein. */
  position?: { left?: number; top?: number; right?: number; bottom?: number };
  /** Startverzögerung in Millisekunden — gegen Gleichtakt bei mehreren Schleifen. */
  verzoegerungMs?: number;
  /** Abspielgeschwindigkeit. Unter 1 wirkt ruhiger; Vorgabe 1. */
  tempo?: number;
  /** Deckkraft. Vorgabe 1 — für sehr zurückhaltende Schleifen niedriger setzen. */
  deckkraft?: number;
  /** Anhalten, wenn der Screen nicht im Vordergrund ist (siehe Kopfkommentar, Leistung). */
  pausiert?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AmbientLoop({
  quelle,
  groesse,
  position,
  verzoegerungMs = 0,
  tempo = 1,
  deckkraft = 1,
  pausiert = false,
  style,
}: Props) {
  const [laeuft, setLaeuft] = useState(verzoegerungMs === 0);
  const [wenigerBewegung, setWenigerBewegung] = useState(false);
  const [ausgefallen, setAusgefallen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Systemeinstellung "Animationen reduzieren" abfragen und auf Änderungen hören.
  useEffect(() => {
    let aktiv = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((an) => {
        if (aktiv) setWenigerBewegung(an);
      })
      .catch(() => {
        // Auskunft nicht verfügbar — dann bleibt es bei normaler Bewegung.
      });
    const abo = AccessibilityInfo.addEventListener("reduceMotionChanged", (an) =>
      setWenigerBewegung(an)
    );
    return () => {
      aktiv = false;
      abo?.remove?.();
    };
  }, []);

  // Versetzter Start.
  useEffect(() => {
    if (verzoegerungMs === 0) return;
    timer.current = setTimeout(() => setLaeuft(true), verzoegerungMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [verzoegerungMs]);

  if (ausgefallen) return null;

  const spielt = laeuft && !pausiert && !wenigerBewegung;

  return (
    <View
      pointerEvents="none"
      style={[
        position ? styles.absolut : null,
        position,
        { width: groesse, height: groesse, opacity: deckkraft },
        style,
      ]}
      // Für Vorlesehilfen unsichtbar: die Schleife trägt keine Information.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LottieView
        source={quelle}
        autoPlay={spielt}
        loop={spielt}
        speed={tempo}
        // Bei reduzierter Bewegung auf Frame 0 einfrieren statt ausblenden — das hält
        // das Layout stabil und zeigt weiterhin ein ruhiges Bild.
        progress={wenigerBewegung ? 0 : undefined}
        resizeMode="contain"
        style={styles.voll}
        onAnimationFailure={() => setAusgefallen(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  absolut: { position: "absolute" },
  voll: { width: "100%", height: "100%" },
});
