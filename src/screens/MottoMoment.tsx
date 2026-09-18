// Motto-Moment — reiner Navigationsziel-Stub (2026-09-18, Grundverdrahtung siehe claude/
// motto_moment_freischaltung_entscheidung_2026-09-17.md, Abschnitt "Weiterhin offen").
//
// Bewusste Scope-Grenze dieses ersten Schritts: Christian hat entschieden, dass die
// Grund­verdrahtung (Gate-Check + Pressable-Icon auf der Karte + Navigationsziel) jetzt
// gebaut wird — der eigentliche INHALT dieses Screens (Verschmelzungs-Animation, Abzeichen,
// Lux-Pose laut produktionsanleitung_elemente.md Abschnitt H) ist laut Entscheidungsdok
// AUSDRÜCKLICH noch nicht gescopt und nicht gebaut. Dieser Screen ist deshalb bewusst leer
// gehalten — dieselbe Begründungsstruktur wie beim ersten Ruhmeshalle-Grundgerüst
// (screens/Ruhmeshalle.tsx, Kopfkommentar "Bewusste Auslassungen dieses ersten Schritts"):
// lieber ehrlich als Platzhalter erkennbar, statt einen echten Inhalt zu simulieren.
//
// Erreichbar ausschließlich über den siebten Kartenpunkt in components/LuchsRevierKarte.tsx
// (`onSelectMottoMoment`), gesperrt bis `bonusFortschritt.wisentKampf === true`. Dieser
// Screen selbst kennt sein Freischalt-Kriterium nicht, nur seinen Aufrufer — exakt dieselbe
// Verantwortungsteilung wie bei Ruhmeshalle.tsx (siehe dortiger Kommentar).
//
// Kulisse: `WaldHintergrund` ohne `variante`, dieselbe Platzhalter-Kulisse wie Revier.tsx/
// Ruhmeshalle.tsx — die eigentlichen Motto-Moment-Assets sind noch nicht beauftragt.
// Bewusst TEXTFREI (projektweites Prinzip, siehe LuchsRevierKarte.tsx-Kopfkommentar): auch
// ein Platzhalter bekommt keinen erklärenden Text, den ein Kind ab 5 ohne Lesefähigkeit
// ohnehin nicht nutzen könnte — nur der immer gleiche Zurück-Pfeil zur Karte.
//
// Keine gesprochene Begrüßung: siehe Ruhmeshalle.tsx-Kommentar, dieselbe Begründung (keine
// neuen Kind-Dialoge auf eigene Faust erfinden).

import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { Funkeln } from "../components/Funkeln";

export default function MottoMoment() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.wurzel}>
      <WaldHintergrund />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.navigate("KidHome")}
          accessibilityLabel="Zurück zur Karte"
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          style={styles.zurueck}
        >
          <FarnZurueckIcon size={26} />
        </Pressable>
        {/* Platzhalter-Mitte, bis Inhalt/Assets gescopt sind (siehe Kopfkommentar) — der
            Funkeln-Effekt allein markiert die Stelle als "hier passiert bald etwas
            Besonderes", ohne eine der noch nicht beauftragten Illustrationen zu simulieren. */}
        <View style={styles.mitte}>
          <Funkeln size={120} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wurzel: { flex: 1, backgroundColor: "#DCE7C8" },
  safe: { flex: 1 },
  zurueck: {
    position: "absolute",
    top: 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247,241,228,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  mitte: { flex: 1, alignItems: "center", justifyContent: "center" },
});
