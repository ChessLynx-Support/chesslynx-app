// ARBEITSENTWURF (Stand 2026-09-07): Das aktuelle Logo-Bild ist aus dem echten
// Lux- und Springer-Master zusammengesetzt, aber vom Nutzer ausdrücklich noch
// als vorläufig markiert — er möchte die Komposition ggf. noch nacharbeiten
// (Größe/Überlappung/Pose). Vor Store-Release hier noch einmal die aktuelle
// Bilddatei prüfen bzw. mit dem Nutzer abstimmen, ob sie final ist. Siehe
// wasserzeichen_und_bewegungsanimationen.md.
//
// Update (2026-09-09, Nutzerfeedback): oben rechts saß das Wasserzeichen direkt neben/über
// Lux' Sprechblasen-Ecke (luxCorner, siehe Quest1.tsx u.a. — dort ebenfalls oben links/
// rechts positioniert) — optisch doppelt belegte Ecke. Verschoben nach unten rechts.
//
// Update (2026-09-09, Folge-Entscheidung des Nutzers, "Ja, global auf allen Screens"):
// der ursprüngliche Nebenbefund oben (zwei fast deckungsgleiche Tap-Ziele in derselben
// Ecke — dieses Wasserzeichen unten rechts UND der bisherige, separate "·"-Eltern-
// Zugang, der bisher nur auf KidHome saß) ist jetzt aufgelöst: der "·" entfällt ersatzlos
// (siehe RootNavigator.tsx, KidHome-Kommentar), und DIESES Wasserzeichen übernimmt seine
// Rolle als Eltern-Bereich-Zugang — global auf JEDEM Screen antippbar, nicht mehr nur auf
// einem. Deshalb jetzt: `onPress` (optional, damit die Komponente ohne Aufrufer weiterhin
// rein dekorativ bleibt), `pointerEvents="box-none"` auf dem äußeren Container statt
// "none" (der Container selbst darf keine Touches außerhalb des Logos schlucken — er
// überspannt ja potenziell die ganze Fläche über NavigationContainer, siehe
// RootNavigator.tsx), und ein `Pressable` mit `hitSlop` um das Logo, damit die kleine
// 34×40-Grafik trotzdem ein angenehmes Tap-Ziel abgibt. Der eigentliche Kinder-Schutz
// bleibt unverändert das ParentGate selbst (Halten+Wischen+Rechenaufgabe) — nicht die
// Unauffälligkeit des Zugangs, siehe Kommentar in RootNavigator.tsx.
import { Image, Pressable, StyleSheet, View } from "react-native";
// Bugfix (Nutzer-Feedback 2026-09-09, Android: "liegt in dem Bereich der Systemtasten"):
// das bisherige `SafeAreaView` aus "react-native" ist auf Android schon immer ein
// reines No-op (siehe RootNavigator.tsx-Import-Kommentar) — es reservierte keinerlei
// Abstand zur unteren Navigationsleiste (Zurück/Home/Übersicht-Tasten bzw. Gesten-Balken),
// wodurch `bottom: 0` das Logo direkt IN diese Leiste hinein positionierte, statt
// darüber. `useSafeAreaInsets()` aus der bereits installierten, jetzt per
// SafeAreaProvider (RootNavigator.tsx) verdrahteten `react-native-safe-area-context`
// liefert den tatsächlichen, geräteabhängigen unteren Sicherheitsabstand.
import { useSafeAreaInsets } from "react-native-safe-area-context";
const LOGO = require("../../assets/brand/chesslynx_watermark_icon.png");

type Props = { onPress?: () => void };

export function BrandWatermark({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.safeOverlay, { bottom: insets.bottom + ZUSAETZLICHER_ABSTAND }]}
      pointerEvents="box-none"
      collapsable={false}
    >
      <View style={styles.corner} pointerEvents="box-none" collapsable={false}>
        {onPress ? (
          <Pressable
            onPress={onPress}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Eltern-Bereich"
          >
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </Pressable>
        ) : (
          <Image source={LOGO} style={styles.logo} resizeMode="contain" pointerEvents="none" />
        )}
      </View>
    </View>
  );
}

// Zusätzlicher, fester Puffer OBEN DRAUF auf den gemessenen Sicherheitsabstand (der bei
// Geräten mit reinen 3-Tasten- statt Geste-Navigation ohnehin schon großzügig ist, bei
// Geräten mit Vollbild-Gestennavigation aber recht knapp ausfallen kann) — sorgt dafür,
// dass zwischen Logo und Systemleiste immer sichtbar Luft bleibt, statt exakt an der
// Kante zu kleben.
const ZUSAETZLICHER_ABSTAND = 10;
const styles = StyleSheet.create({
  // Update (2026-09-09): von oben nach unten verschoben (siehe Kommentar oben) — bottom:0
  // statt top:0, sonst unverändert (links/rechts weiterhin volle Breite, damit `corner`
  // per flexDirection/alignItems die Rechtsbündigkeit übernimmt, wie zuvor).
  //
  // Bugfix (Nutzer-Feedback 2026-09-09, Android: "Das Wasserzeichen und damit der Link
  // zum Elternbereich fehlt auf der Karte Luchsrevier"): dieses Wasserzeichen sitzt als
  // Geschwister-Element NACH <NavigationContainer> (siehe RootNavigator.tsx-Kommentar
  // "BrandWatermark als Geschwister-Element AUSSERHALB von <NavigationContainer>") und
  // sollte dadurch in der Element-Reihenfolge über jedem Screen-Inhalt liegen — auf
  // Android bestimmt aber `elevation`, nicht die reine JSX-/Geschwister-Reihenfolge, wer
  // wirklich obenauf gezeichnet wird. Ausgerechnet die Luchsrevier-Karte (viele
  // gestapelte Bilder + SVG-Nebelmaske, siehe LuchsRevierKarte.tsx) erzeugt dadurch
  // offenbar eine eigene, höher liegende Android-Compositing-Ebene, die dieses ohne
  // jede eigene `elevation` gezeichnete Wasserzeichen verdeckt — auf einfacheren
  // Screens (z. B. den Quest-Screens) trat das Problem deshalb nicht auf. Explizite,
  // bewusst hohe `elevation` (plus `zIndex` für iOS/Web, wo Stapelreihenfolge über
  // zIndex statt elevation läuft) erzwingt jetzt zuverlässig die oberste Ebene,
  // unabhängig davon, was der jeweilige Screen an eigenen Ebenen mitbringt.
  // `bottom` kommt jetzt dynamisch aus useSafeAreaInsets() (siehe Aufrufstelle oben) statt
  // eines festen 0 — deshalb hier nicht mehr gesetzt.
  safeOverlay: { position: "absolute", left: 0, right: 0, elevation: 999, zIndex: 999 },
  corner: { alignItems: "flex-end", paddingBottom: 8, paddingRight: 12 },
  // Seitenverhältnis an das neue, aus Lux- und Springer-Master zusammengesetzte
  // Logo angepasst (1774x2059 ≈ 0,86), ersetzt das alte, separat KI-generierte
  // Logo (420x407 ≈ 1,03) — siehe wasserzeichen_und_bewegungsanimationen.md.
  // Nutzer-Feedback 2026-09-09 ("Logo minimal sichtbarer werden"): Deckkraft von 0,55
  // auf 0,7 angehoben — bewusst nur ein kleiner Schritt, das Wasserzeichen soll weiterhin
  // dezent bleiben (siehe Datei-Kopfkommentar), nur eben zuverlässig erkennbar/antippbar.
  logo: { width: 34, height: 40, opacity: 0.7 },
});
