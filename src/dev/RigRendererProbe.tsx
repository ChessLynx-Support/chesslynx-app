// Isolierter Rig-Renderer-Vorversuch (Schritt 2 der Grundgerüst-Integrationsplan-Liste,
// siehe priorisierter_umsetzungsplan.md, Abschnitt "Review-Runde: Integrationsplan fürs
// Grundgerüst"). Zweck: mit NUR einer Figur (Igel/Bauer, Quest 1) klären, (a) ob die
// neuen PNG/WebP-Produktions-Exporte mit der React-Native-Core-`Image`-Komponente sauber
// bei allen tatsächlich im Spiel vorkommenden Anzeigegrößen rendern, und (b) wie sich
// PNG gegenüber WebP dabei schlägt — BEVOR irgendetwas davon in Quest1.tsx, Board.tsx,
// Verwandlung.tsx oder QuestGeschafft.tsx eingebaut wird. Bewusst nicht in echten
// Produktionscode integriert: kein Import in creatures.tsx/chessPieces.tsx, keine
// Änderung an Board.tsx. Dieser Screen ist rein zum Anschauen/Prüfen gedacht und kann
// nach Abschluss von Schritt 2 folgenlos gelöscht werden (siehe RootNavigator.tsx,
// Route "RigProbe" — nach demselben "nur per navigation.navigate erreichbar, nicht in
// der UI verlinkt"-Muster wie seinerzeit FreispielScreen vor Schritt #76).
//
// Die vier hier verwendeten Dateien liegen unter assets/figuren/ (Produktions-Export aus
// Schritt 1, siehe priorisierter_umsetzungsplan.md) — nur die Igel/Bauer-Variante, hell
// und dunkel, PNG und WebP, wie im Manifest chesslynx_12_piece_produktionsexport_v1.zip.
//
// Reale Anzeigegrößen, gegen die hier geprüft wird (siehe Fundstellen im echten Code):
//   28px  ~ Gegnerfigur im Brett (Board.tsx: opponentDot, 60% von cellSize=42)
//   34px  — Standardgröße von pieceIcon, wenn keine size-Prop übergeben wird (Board.tsx
//           MoveScreen ruft z. B. <BauerIcon /> ohne size auf)
//   92px  — QuestGeschafft-Icon (Screen 7 in allen sechs Quest*.tsx) UND die Figur im
//           Verwandlungsmoment (Verwandlung.tsx piece-/creature-Prop)
//   110px — Tier-Vorstellung auf Screen 1 (z. B. <IgelIcon size={110} /> in Quest1.tsx)
// Zusätzlich ein 170×170-Rahmen mit demselben Creme-Glow-Hintergrund wie
// Verwandlung.tsx (styles.wrap/glow dort), um zu sehen, wie die neue Illustration sich
// in diesem bestehenden, fix bemaßten Container schlägt.

// NACHTRAG 2026-09-19 — die PNG-Hälfte dieses Vergleichs musste raus, und zwar dringend:
//
// Android leitet aus jedem gebündelten Asset einen Ressourcennamen ab, indem es den Pfad
// abflacht UND DIE ENDUNG WEGLÄSST. `chesslynx_hedgehog_pawn_light_export.png` und
// `...light_export.webp` ergeben damit beide `assets_figuren_chesslynx_hedgehog_pawn_light_
// export` — und `:app:packageReleaseResources` bricht mit "Duplicate resources" ab. Der
// EAS-Build vom 19.09. ist genau daran gescheitert.
//
// Im Entwicklungsmodus fällt das nie auf; es trifft ausschließlich den echten Build. Die
// Frage, für die dieser Vergleich gebaut wurde, ist seit dem 07.09. beantwortet (WebP, siehe
// Kopfkommentar von lib/pieceMasters.tsx) — die WebP-Hälfte bleibt hier als Größenprobe
// stehen, die PNG-Hälfte ist ersatzlos entfallen.
//
// Diese Datei ist ohnehin an keiner Stelle mehr eingebunden (die frühere Route "RigProbe"
// gibt es in RootNavigator.tsx nicht mehr) und kann folgenlos gelöscht werden; die beiden
// PNG-Dateien unter assets/figuren/ dann gleich mit, das sind 243 KB.

import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

const hedgehogLightWebp = require("../../assets/figuren/chesslynx_hedgehog_pawn_light_export.webp");
const hedgehogDarkWebp = require("../../assets/figuren/chesslynx_hedgehog_pawn_dark_export.webp");

const SIZES = [28, 34, 92, 110] as const;

function Swatch({
  label,
  source,
  size,
}: {
  label: string;
  source: number;
  size: number;
}) {
  return (
    <View style={styles.swatch}>
      <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
      <Text style={styles.swatchLabel}>{label}</Text>
    </View>
  );
}

function SizeRow({ size, background }: { size: number; background: string }) {
  return (
    <View style={[styles.row, { backgroundColor: background }]}>
      <Text style={styles.rowTitle}>{size}px</Text>
      <View style={styles.rowSwatches}>
        <Swatch label="hell · WebP" source={hedgehogLightWebp} size={size} />
        <Swatch label="dunkel · WebP" source={hedgehogDarkWebp} size={size} />
      </View>
    </View>
  );
}

export default function RigRendererProbe() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Rig-Renderer-Vorversuch — Schritt 2</Text>
      <Text style={styles.subheading}>
        Nur Igel/Bauer (Quest 1), core `Image`-Komponente, WebP, bei allen
        tatsächlich im Spiel vorkommenden Größen. Nichts hier ist an echten Produktionscode
        angeschlossen.
      </Text>

      <Text style={styles.sectionLabel}>Auf App-Hintergrund (#F7F1E4, wie Quest-Screens)</Text>
      {SIZES.map((s) => (
        <SizeRow key={`cream-${s}`} size={s} background="#F7F1E4" />
      ))}

      <Text style={styles.sectionLabel}>
        Auf dunklem Grund (Kantenprüfung — deckt einen hellen Fransensaum auf, falls doch
        noch Reste vom früher gefundenen Freistellungsproblem vorhanden sind)
      </Text>
      {SIZES.map((s) => (
        <SizeRow key={`dark-${s}`} size={s} background="#3A4A3E" />
      ))}

      <Text style={styles.sectionLabel}>
        170×170-Rahmen, wie in Verwandlung.tsx (styles.wrap + glow-Kreis) — zeigt, wie die
        Illustration im bestehenden Verwandlungsmoment-Container wirkt
      </Text>
      <View style={styles.verwandlungMock}>
        <View style={styles.verwandlungGlow} />
        <Image
          source={hedgehogLightWebp}
          style={{ width: 110, height: 110 }}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.footnote}>
        Ergebnis bitte kurz zurückmelden: (1) sieht PNG vs. WebP bei dir gleich gut aus
        (Android/iOS können sich bei WebP-Dekodierung unterscheiden)? (2) ist bei 28px/34px
        noch alles erkennbar oder wirkt es zu klein/verwaschen? (3) irgendein heller Rand
        auf dem dunklen Grund sichtbar? Das entscheidet, ob Schritt 3+ mit der
        Core-`Image`-Komponente arbeiten kann oder ob wir vorher doch `expo-image`
        installieren (Code dafür liegt unten im Kommentar bereit, siehe Dateiende).
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48, backgroundColor: "#FFFFFF" },
  heading: { fontSize: 20, fontWeight: "700", color: "#4A4038", marginBottom: 4 },
  subheading: { fontSize: 13, color: "#7A7266", marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#4A4038", marginTop: 20, marginBottom: 8 },
  row: { borderRadius: 12, padding: 10, marginBottom: 8 },
  rowTitle: { fontSize: 12, fontWeight: "700", color: "#4A4038", marginBottom: 6 },
  rowSwatches: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatch: { alignItems: "center", width: 78 },
  swatchLabel: { fontSize: 10, color: "#4A4038", marginTop: 4, textAlign: "center" },
  verwandlungMock: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  verwandlungGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "#F4EDE0",
  },
  footnote: { fontSize: 12, color: "#7A7266", marginTop: 24, lineHeight: 18 },
});

// ---------------------------------------------------------------------------------
// VORBEREITET, NICHT AKTIV: expo-image-Variante.
// Laut design_bibliotheken_und_lizenzen.md empfohlen (bessere WebP-Dekodierabdeckung,
// eingebautes Speicher-Caching, `recyclingKey` für Listen/Grids wie die künftige
// Luchs-Revier-Karte) — aber noch nicht installiert. Diese Datei importiert absichtlich
// NICHT aus "expo-image", weil ein fehlendes Paket sonst den gesamten Metro-Bundle-Build
// zum Absturz bringen würde (statische Imports müssen zur Build-Zeit auflösbar sein).
//
// Erst wenn `npx expo install expo-image` lokal ausgeführt wurde (löst automatisch die
// zur installierten Expo-SDK-51-Version passende expo-image-Version auf), unten stehenden
// Block manuell aktivieren (Import oben ergänzen, `Image` durch `ExpoImage` ersetzen,
// `resizeMode="contain"` durch `contentFit="contain"` ersetzen — das ist der einzige
// Prop-Namensunterschied, der hier relevant ist):
//
//   import { Image as ExpoImage } from "expo-image";
//   <ExpoImage source={hedgehogLightWebp} style={{ width: size, height: size }} contentFit="contain" />
//
// So lässt sich Schritt 2 nachträglich um einen direkten Vergleich Core-Image vs.
// expo-image erweitern, ohne dass diese Datei bis dahin den Build blockiert.
