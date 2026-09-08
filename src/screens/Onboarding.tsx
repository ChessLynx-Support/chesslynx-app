// Onboarding/Splash-Screen — priorisierter_umsetzungsplan.md, Phase 3, "Onboarding/
// Splash-Screen-Komposition (Lux + CTA)": bisher der einzige der sechs ursprünglichen
// Design-Entwürfe (Claude-Design-Canvas vom 2026-09-04, siehe entwicklungsstatus_
// grundgeruest.md), der noch nirgends als echte React-Native-Komponente umgesetzt war.
// Übernimmt bewusst nur die im Entwurf festgelegte Grundstruktur (App-Titel, große
// Lux-Illustration, ein CTA-Button "Loslegen") — von der Wettbewerbsanalyse
// (wettbewerbsanalyse_kinderapps_design.md) als bereits Best-Practice-konform bestätigt
// ("Grundstruktur ... entspricht bereits Best Practice ... hier keine strukturelle
// Änderung nötig"), keine zusätzliche Tagline oder Deko erfunden.
//
// Ersetzt `KidHome` als `initialRouteName` in RootNavigator.tsx — die App zeigt diesen
// Screen jetzt bei jedem Start zuerst, der CTA führt per `navigation.replace` (nicht
// `navigate`, siehe dortiger Kommentar) weiter zu KidHome. Bewusst KEINE
// "nur beim ersten Start zeigen"-Logik (AsyncStorage-Flag o. Ä.) — das ist im Design-
// Entwurf nicht vorgesehen und stand nicht im Auftrag; falls gewünscht, ist das ein
// kleiner, separater Folgeschritt (siehe Projektdokumentation).
//
// Bewusst NICHT Teil dieses Schritts: das Nebel-/Blätter-Detail, das die
// Wettbewerbsanalyse für den oberen Bildrand vorschlägt ("sollte in ähnlicher Dichte
// auch in anderen, aktuell leereren Screens auftauchen") — eigene Illustrationsarbeit,
// die über die im Design-Entwurf ursprünglich festgelegte Grundstruktur hinausgeht.
//
// Update (Opus-Review, 2026-09-07, Befund 2.8, siehe claude/review_logik_grafik_
// audiofuehrung.md): Der Screen bewegte sich bisher überhaupt nicht — für den allerersten
// Eindruck der App ein spürbares Manko. Drei Ergänzungen, alle ohne neues Material:
// (1) sanftes Einblenden beim Mount, (2) Lux' Idle-Atem-Loop (LuxAtem, siehe
// lib/luxAssets.tsx) statt einer bewegungslosen Illustration, (3) ein Funkeln-Ausbruch
// (bereits aus QuestGeschafft.tsx bekannt) beim Antippen des CTA, kurz sichtbar vor der
// Navigation. Zusätzlich: `LuxHeroIcon`-Breite kommt jetzt aus der tatsächlichen
// Bildschirmhöhe statt fest 220px — auf kurzen Bildschirmen (z. B. kleinere Android-
// Geräte im Querformat-nahen Seitenverhältnis) wurde die feste Höhe von 368px sonst knapp,
// weil Titel und CTA-Button sich denselben vertikalen Platz teilen müssen.

import { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View, Pressable, Animated, useWindowDimensions } from "react-native";
import { LuxHeroIcon, LuxAtem, LUX_HERO_ASPECT_RATIO } from "../lib/luxAssets";
import { Funkeln } from "../components/Funkeln";
// Opus-Review, 2026-09-07, Abschnitt 3.1, siehe claude/review_logik_grafik_
// audiofuehrung.md: "Onboarding-CTA 'Loslegen' ist die allererste Interaktion der App und
// verlangt Lesen — Icon/antippbarer Lux plus gesprochene Begrüßung gehört hierhin."
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";

const BEGRUESSUNG = "Hallo! Ich bin Lux. Willkommen im Wald von ChessLynx!";

export function Onboarding({ navigation }: any) {
  const { height: bildschirmHoehe } = useWindowDimensions();
  // Lux darf höchstens ~42% der Bildschirmhöhe einnehmen, zwischen 150 und 220px gedeckelt
  // (220 war der bisherige feste Wert, siehe Kommentar oben).
  const luxBreite = Math.max(150, Math.min(220, Math.floor((bildschirmHoehe * 0.42) / LUX_HERO_ASPECT_RATIO)));

  const einblenden = useRef(new Animated.Value(0)).current;
  const [funkelnAusloesen, setFunkelnAusloesen] = useState(0);

  // `erinnerung: false` — anders als auf den Quest-Screens soll sich die einmalige
  // Begrüßung NICHT alle 8 Sekunden wiederholen, solange der CTA nicht angetippt wird
  // (kein "Auftrag", der eine Erinnerung bräuchte, siehe useLuxSprechzeile.ts). Tap auf
  // Lux selbst wiederholt die Begrüßung weiterhin bewusst (wiederholen unten).
  const { wiederholen } = useLuxSprechzeile("onboarding", BEGRUESSUNG, undefined, { erinnerung: false });

  useEffect(() => {
    Animated.timing(einblenden, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [einblenden]);

  function handleCta() {
    // Kurzer Funkeln-Ausbruch (siehe components/Funkeln.tsx, bereits aus
    // QuestGeschafft.tsx bekannt) vor der Navigation, damit der allererste Tap in der App
    // sich genauso lebendig anfühlt wie ein Quest-Abschluss. 260ms Verzögerung: der Effekt
    // soll kurz sichtbar sein, bevor der Screen wechselt.
    setFunkelnAusloesen((n) => n + 1);
    setTimeout(() => navigation.replace("KidHome"), 260);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.content, { opacity: einblenden }]}>
        <Text style={styles.titel}>ChessLynx</Text>
        <Pressable
          onPress={wiederholen}
          accessibilityRole="button"
          accessibilityLabel="Lux, tippen zum Wiederholen"
        >
          <LuxAtem>
            <LuxHeroIcon width={luxBreite} />
          </LuxAtem>
        </Pressable>
        <View style={styles.ctaWrap}>
          {funkelnAusloesen > 0 && <Funkeln key={funkelnAusloesen} size={140} />}
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleCta}
            accessibilityRole="button"
            accessibilityLabel="Loslegen"
          >
            <Text style={styles.ctaText}>Loslegen</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  // Gleiche Textfarbe wie die Lux-Sprechzeilen in den Quest-Screens (#4A4038), damit der
  // Titel sich in die bestehende Farbwelt einfügt statt eine neue Textfarbe einzuführen.
  titel: {
    fontSize: 40,
    fontWeight: "700",
    color: "#4A4038",
    marginBottom: 8,
  },
  ctaWrap: {
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    backgroundColor: "#C9855F",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 20,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
});
