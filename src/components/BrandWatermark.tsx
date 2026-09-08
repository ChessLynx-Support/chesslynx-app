// ARBEITSENTWURF (Stand 2026-09-07): Das aktuelle Logo-Bild ist aus dem echten
// Lux- und Springer-Master zusammengesetzt, aber vom Nutzer ausdrücklich noch
// als vorläufig markiert — er möchte die Komposition ggf. noch nacharbeiten
// (Größe/Überlappung/Pose). Vor Store-Release hier noch einmal die aktuelle
// Bilddatei prüfen bzw. mit dem Nutzer abstimmen, ob sie final ist. Siehe
// wasserzeichen_und_bewegungsanimationen.md.
import { Image, SafeAreaView, StyleSheet, View } from "react-native";
const LOGO = require("../../assets/brand/chesslynx_watermark_icon.png");
export function BrandWatermark() {
  return (
    <SafeAreaView style={styles.safeOverlay} pointerEvents="none">
      <View style={styles.corner}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  corner: { alignItems: "flex-end", paddingTop: 8, paddingRight: 12 },
  // Seitenverhältnis an das neue, aus Lux- und Springer-Master zusammengesetzte
  // Logo angepasst (1774x2059 ≈ 0,86), ersetzt das alte, separat KI-generierte
  // Logo (420x407 ≈ 1,03) — siehe wasserzeichen_und_bewegungsanimationen.md.
  logo: { width: 34, height: 40, opacity: 0.55 },
});
