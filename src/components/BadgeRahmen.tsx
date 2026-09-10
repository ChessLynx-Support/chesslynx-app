// BadgeRahmen — wiederverwendbarer runder Rahmen (Gold-Akzent, sanfter Schatten), der ein
// beliebiges bereits vorhandenes Tier-/Figuren-Icon aufnimmt. Siehe Claude-Projekt
// "ChessLynx", `produktionsanleitung_elemente.md`, Abschnitt 7.2 — erster Einsatzort:
// die 6 KidHome-Quest-Buttons (RootNavigator.tsx), die bisher nur reiner Text ohne Icon
// waren. Später auch für die geplante Ruhmeshalle (Phase 9 der Checkliste) und die
// "Begleiter-Badge"-Idee aus dem Opus-Review nutzbar (ein Rahmen für alle Tiere statt
// eines eigenen Rahmens pro Tier).
//
// Bewusst reines RN-View-Styling statt SVG — ein Kreis mit Rand/Schatten braucht keine
// Vektorgrafik, siehe produktionsanleitung_elemente.md Abschnitt 7.3 ("UI-Chrome, das
// überall gleich aussieht, wird nur dort als SVG gezeichnet, wo Formen gebraucht werden,
// die reines Box-Styling nicht leisten kann").

import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

const GOLD = "#D7A52D";

type BadgeRahmenProps = {
  size?: number;
  akzent?: string;
  hintergrund?: string;
  children?: ReactNode;
};

export function BadgeRahmen({ size = 56, akzent = GOLD, hintergrund = "#FFFFFF", children }: BadgeRahmenProps) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: hintergrund, borderColor: akzent },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
});
