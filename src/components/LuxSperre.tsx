// Sperr-Bildschirm, wenn das tägliche Zeitlimit erreicht ist — Wortlaut und Aufbau
// 1:1 aus dem geprüften ParentDashboard-Entwurf (Abschnitt "Zeitlimit") übernommen.
// Bewusst mit Text (anders als die sonst textfreie Kind-Oberfläche): diese Ausnahme
// wurde im Entwurf selbst so gestaltet und geprüft, weil die Sperre dem Kind ohne ein
// Minimum an Erklärung unverständlich bliebe — begleitet von einem freundlichen,
// nicht-technischen Ton statt einer nüchternen Sperr-Meldung.
//
// Icon bewusst 🐾 (Pfote) statt des im Entwurfs-Mockup nur als ASCII-Skizze notierten
// 🦁 — passt zu Lux, dem Luchs (siehe projektwissen.md), und zum bereits an anderer
// Stelle im ParentDashboard verwendeten Pfoten-Symbol (Abschnitt "Fortschritt je Kind").
// Der Wortlaut selbst ist unverändert aus dem Entwurf übernommen.
//
// Ton/Sound: aktuell eine kurze, nicht erschreckende Vibration statt eines eigenen
// Sound-Effekts (`expo-av` ist im Projekt noch nicht als Abhängigkeit installiert —
// das Nachrüsten eines eigenen "Lux legt sich schlafen"-Klangs bleibt bewusst ein
// separater, in sich abgeschlossener Folgeschritt, siehe Kommentar am Ende der Datei).

import { useEffect } from "react";
import { StyleSheet, Text, Vibration, View, Pressable } from "react-native";

export function LuxSperre({ aufElternteilHolen }: { aufElternteilHolen: () => void }) {
  useEffect(() => {
    // Kurz, zweifach, sanft — kein Alarm-Muster. Auf Web-Build ohne Effekt (Vibration
    // API ist dort ein No-Op), das visuelle Erscheinungsbild bleibt das eigentliche Signal.
    Vibration.vibrate([0, 120, 80, 120]);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🐾</Text>
      <Text style={styles.titel}>Lux' Pfote</Text>
      <Text style={styles.text}>
        Für heute hast du genug geübt! Frag doch mal ein Elternteil, ob es noch etwas
        Zeit gibt.
      </Text>
      <Pressable style={styles.button} onPress={aufElternteilHolen}>
        <Text style={styles.buttonText}>Ein Elternteil holen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F1E4",
    padding: 32,
  },
  icon: { fontSize: 56, marginBottom: 8 },
  titel: { fontSize: 22, fontWeight: "700", color: "#4A4038", marginBottom: 16 },
  text: {
    fontSize: 16,
    color: "#6B6255",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#C9855F",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});

// Folgeschritt (nicht Teil dieses Umsetzungsschritts, siehe projektwissen.md): sobald
// `expo-av` installiert ist, hier einen kurzen, freundlichen Klang abspielen (parallel
// zur Vibration, siehe useEffect oben) — passend zur im Entwurf beschriebenen sanften
// visuellen Überblendung ("Lux legt sich schlafen"), die ebenfalls noch aussteht.
