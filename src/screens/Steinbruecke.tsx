// Paket 3 (2026-09-11, Claude-Projekt "ChessLynx", umsetzungsplan_audit_punkte_2026-09-11.md,
// Abschnitt 3a): Schildkröten-Wegpunkt an der Steinbrücke — die Übungslichtung. Schließt
// Freispiel-Schritt #76/#77 ("Navigation zum Freispiel-Screen"): der FreispielScreen war bisher
// nur aus dem Code heraus erreichbar.
//
// Ablauf:
//   - Erreichbar über den Schildkröten-Wegpunkt im Oberland der LuchsRevierKarte (antippbar,
//     sobald das Schlosstor offen ist).
//   - Erster Besuch (Flag `bonusFortschritt.ganzePartie` noch nicht gesetzt): sofort weiter ins
//     Kapitel „Die ganze Partie" (bonus/GanzePartie.tsx) — die Schildkröte ist das natürliche
//     Gate vor dem Freispiel (Vorlage bonuskapitel_ganze_partie_umsetzung_2026-09-10.md,
//     Abschnitt 1). Das Kapitel kehrt am Ende mit `nachKapitel: true` hierher zurück.
//   - Danach: Bots/Puzzles-Wahl als zwei große, textfreie Bild-Kacheln (icon_bots_schildkroete /
//     icon_puzzles_brett aus assets/ui/lichess_bereich/). Für Launch 1.0 ist nur "Bots" aktiv;
//     "Puzzles" bleibt vernebelt bis Update 2 (Lichess, März 2027) — Antippen gibt eine
//     freundliche Zeile statt eines Sperr-Symbols (Design-Grundsatz "keine Schloss-Symbolik").
//
// Sprechzeilen: die finalen Texte (gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 10,
// Screen 1) nennen Rätsel als Wahlmöglichkeit — das passt erst ab Update 2. Bis dahin gelten die
// Übergangszeilen unten (STEINBRUECKE_ZEILEN_1_0); sie sind im Claude-Projekt als Ergänzung zu
// Abschnitt 13 (Übergangszeilen Launch 1.0) vermerkt.

import { useCallback, useState } from "react";
import { Image, ImageBackground, Pressable, SafeAreaView, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { loadBonusFortschrittLocal } from "../lib/storage";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { luxVariante } from "../lib/luxVarianten";
import { LuxEckIcon, LuxAtem } from "../lib/luxAssets";
import { SCHILDKROETE_ASPEKT, SCHILDKROETE_BILD } from "../lib/schildkroete";
import { LuxSprechblase } from "../components/LuxSprechblase";
import { FarnZurueckIcon } from "../lib/freispielIcons";

const hintergrund = require("../../assets/hintergrund/luchsrevier_uebungslichtung.webp");
const iconBots = require("../../assets/ui/lichess_bereich/icon_bots_schildkroete.png");
const iconPuzzles = require("../../assets/ui/lichess_bereich/icon_puzzles_brett.png");

// Pixelmaße des Hintergrunds (1517×2331) und Fußpunkt der Schildkröte — seit dem Gerätetest
// 2026-09-11 (Nutzerwunsch "nicht auf der Brücke, weiter links auf der Lichtung") auf der Wiese
// links der Brücke, vor der großen Tanne; vorher auf dem Brückenbogen (1100/1912),
// als Anteil der Bildmaße. Der Hintergrund füllt den Bildschirm per "cover" — die Position
// wird unten mit derselben Cover-Rechnung auf Bildschirmkoordinaten umgerechnet, damit die
// Schildkröte auf jedem Seitenverhältnis auf der Brücke steht.
const BILD_B = 1517;
const BILD_H = 2331;
const SCHILDKROETE_FUSS = { fx: 380 / BILD_B, fy: 1905 / BILD_H };
// Höhe der Schildkröte als Anteil der (skalierten) Bildhöhe.
const SCHILDKROETE_HOEHE_FRAC = 0.13;

export const STEINBRUECKE_ZEILEN_1_0 = {
  nachKapitel: [
    "Jetzt kannst du hier gegen deine Waldfreunde spielen, so oft du magst.",
    "Tipp auf das Bild mit der Schildkröte, dann geht's los!",
  ],
  wiederkehr: [
    "Schön, dass du wieder da bist! Spielen wir gegen die Waldfreunde?",
    "Zurück an der Brücke – die Waldfreunde warten schon!",
  ],
  puzzlesVernebelt: "Diesen Weg entdecken wir später – die Schildkröte bereitet hier noch etwas für dich vor.",
  erinnerung: ["Tipp auf das Bild mit der Schildkröte!", "Die Waldfreunde warten auf dich."],
};

export default function Steinbruecke() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const nachKapitel = Boolean(route.params?.nachKapitel);
  const [bereit, setBereit] = useState(nachKapitel);
  const [flaeche, setFlaeche] = useState({ b: 0, h: 0 });

  // Erster Besuch → Kapitel. Bei jedem Fokus geprüft (nicht nur beim Mount), damit auch ein
  // abgebrochenes Kapitel beim nächsten Besuch wieder von vorn beginnt.
  useFocusEffect(
    useCallback(() => {
      if (nachKapitel) return;
      let abgebrochen = false;
      loadBonusFortschrittLocal("ganzePartie").then((gespielt) => {
        if (abgebrochen) return;
        if (!gespielt) navigation.replace("GanzePartie");
        else setBereit(true);
      });
      return () => {
        abgebrochen = true;
      };
    }, [nachKapitel, navigation])
  );

  const [zeilen] = useState<string[]>(() =>
    nachKapitel
      ? STEINBRUECKE_ZEILEN_1_0.nachKapitel
      : [luxVariante(STEINBRUECKE_ZEILEN_1_0.wiederkehr, "steinbruecke-wiederkehr")]
  );
  const [lineIndex, setLineIndex] = useState(0);
  const [einschub, setEinschub] = useState<{ id: number; text: string } | null>(null);
  const isLastLine = lineIndex === zeilen.length - 1;

  // Erinnerungs-Pool für die letzte Zeile (gleiches Muster wie in den Quests: erster Aufruf
  // = eigentliche Zeile, danach rotierend der Pool). Auf diesem Auswahl-Screen höchstens
  // zwei Erinnerungen — danach wartet Lux still, statt alle 8 Sekunden weiterzureden.
  const [erinnerungen, setErinnerungen] = useState(0);
  const zeile = einschub
    ? einschub.text
    : isLastLine
      ? () =>
          erinnerungen === 0
            ? zeilen[lineIndex]
            : STEINBRUECKE_ZEILEN_1_0.erinnerung[(erinnerungen - 1) % STEINBRUECKE_ZEILEN_1_0.erinnerung.length]
      : zeilen[lineIndex];
  const schluessel = !bereit ? "laden" : einschub ? `einschub-${einschub.id}` : `zeile-${lineIndex}`;

  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    schluessel,
    bereit ? zeile : "",
    einschub ? () => setEinschub(null) : !isLastLine ? () => setLineIndex((i) => i + 1) : undefined,
    {
      erinnerung: erinnerungen < 2,
      onErinnerung: () => setErinnerungen((n) => n + 1),
    }
  );
  const zeigeUntertitel = useUntertitelAktiv();

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - flaeche.b) > 0.5 || Math.abs(height - flaeche.h) > 0.5) setFlaeche({ b: width, h: height });
  };

  // "cover": Bild so skaliert, dass es die Fläche ganz füllt; der Überstand wird mittig
  // abgeschnitten.
  const skala = flaeche.b > 0 ? Math.max(flaeche.b / BILD_B, flaeche.h / BILD_H) : 0;
  const versatzX = (flaeche.b - BILD_B * skala) / 2;
  const versatzY = (flaeche.h - BILD_H * skala) / 2;
  const turtleH = BILD_H * skala * SCHILDKROETE_HOEHE_FRAC;
  const turtleB = turtleH / SCHILDKROETE_ASPEKT;
  const fussX = versatzX + SCHILDKROETE_FUSS.fx * BILD_B * skala;
  const fussY = versatzY + SCHILDKROETE_FUSS.fy * BILD_H * skala;

  if (!bereit) return <View style={styles.leer} />;

  return (
    <View style={styles.wurzel} onLayout={onLayout} collapsable={false}>
      {flaeche.b > 0 && (
        <ImageBackground source={hintergrund} style={{ width: flaeche.b, height: flaeche.h }} resizeMode="cover">
          {/* Schildkröte auf der Brücke — einziges absolut positioniertes Kind des
              Hintergrunds (Android/Fabric-Hinweis siehe LuchsRevierKarte.tsx). */}
          <View
            pointerEvents="none"
            style={[styles.schildkroete, { left: fussX - turtleB / 2, top: fussY - turtleH, width: turtleB, height: turtleH }]}
          >
            <LuxAtem dauer={1600} betrag={1.03}>
              <Image source={SCHILDKROETE_BILD} style={{ width: turtleB, height: turtleH }} resizeMode="contain" />
            </LuxAtem>
          </View>
        </ImageBackground>
      )}

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.kopf} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.navigate("KidHome")}
            accessibilityLabel="Zurück zur Karte"
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            style={styles.zurueck}
          >
            <FarnZurueckIcon size={26} />
          </Pressable>
          <Pressable
            onPress={wiederholen}
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            accessibilityLabel="Lux, tippen zum Wiederholen"
          >
            <LuxEckIcon size={52} />
          </Pressable>
          {zeigeUntertitel && (
            <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={schluessel} style={styles.sprechblase} />
          )}
        </View>

        <View style={styles.kacheln} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.navigate("FreispielScreen")}
            accessibilityLabel="Gegen die Waldfreunde spielen"
            style={({ pressed }) => [styles.kachel, pressed && styles.kachelGedrueckt]}
          >
            <Image source={iconBots} style={styles.kachelBild} resizeMode="contain" />
          </Pressable>
          <Pressable
            onPress={() => setEinschub({ id: Date.now(), text: STEINBRUECKE_ZEILEN_1_0.puzzlesVernebelt })}
            accessibilityLabel="Rätsel – noch nicht da"
            style={[styles.kachel, styles.kachelVernebelt]}
          >
            <Image source={iconPuzzles} style={[styles.kachelBild, { opacity: 0.55 }]} resizeMode="contain" />
            {/* Nebelschleier statt Schloss-Symbol */}
            <View pointerEvents="none" style={styles.nebelSchleier} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  leer: { flex: 1, backgroundColor: "#DCE7C8" },
  wurzel: { flex: 1, backgroundColor: "#DCE7C8", overflow: "hidden" },
  schildkroete: { position: "absolute" },
  kopf: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  zurueck: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247,241,228,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sprechblase: { flex: 1, maxHeight: 170 },
  kacheln: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginTop: 28,
    paddingHorizontal: 16,
  },
  kachel: {
    width: 148,
    height: 148,
    borderRadius: 28,
    backgroundColor: "rgba(247,241,228,0.94)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#D7A52D",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  kachelGedrueckt: { transform: [{ scale: 0.96 }] },
  kachelVernebelt: { borderColor: "rgba(255,255,255,0.7)", borderStyle: "dashed" },
  kachelBild: { width: 120, height: 120 },
  nebelSchleier: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.45)" },
});
