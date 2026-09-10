// Freispiel-Screen ("Übungslichtung") — siehe endlosmodus_freispiel_konzept.md im
// Claude-Projekt "ChessLynx". Zeigt die 16 fein gestuften Bot-Gegner (250–1300 Elo,
// aufsteigend) als vertikal scrollende Liste, mit den sechs Waldgefährten-Charakteren
// als wiederverwendete Rang-Abzeichen (Eichhörnchen ×3, Fuchs/Dachs/Adlerin/Wolf ×2,
// Wisent ×5) — siehe waldfreundeBot.ts.
//
// Wichtige Design-Entscheidungen aus dem Konzept-Dokument, hier 1:1 umgesetzt:
// - "Textzahlenfrei": keine Elo-Zahl, kein "Rang N"-Text sichtbar — Fortschritt
//   innerhalb eines Charakters wird stattdessen über eine Punktreihe (RangPunkte)
//   dargestellt, die zu einem Charakter gehörigen, bereits erreichten Ränge gefüllt.
// - Design-Grundsatz 3 ("keine Schloss-/Sperr-Symbolik"): noch nicht erreichte
//   Einträge bekommen eine "vernebelte Silhouette" (NebelHuelle) statt Schloss-Icon.
// - Zwei Animationsmomente laut Konzept: kurze Reaktion beim Antippen eines
//   freigeschalteten Eintrags, sanfte Feier-Animation beim erstmaligen Freischalten
//   einer neuen Stufe (ausgelöst über den Navigationsparameter `neuFreigeschaltetElo`,
//   den die Partie-Screen nach einem Sieg mitgibt).
//
// Technische Anmerkung zur Animationsbibliothek (Nutzerentscheidung 2026-09-06): das
// Konzept-Dokument sah react-native-reanimated vor, das Paket war zu diesem Zeitpunkt
// aber noch nicht installiert. Der Nutzer hat sich für die Nachrüstung entschieden
// (siehe package.json/babel.config.js-Änderungen) statt ersatzweise die eingebaute
// Animated-API zu verwenden — hier also bewusst `react-native-reanimated` statt
// `Animated` aus "react-native".
//
// Bekannte, an den Nutzer zurückgemeldete Lücke: dieser Screen deckt laut
// Konzept-Dokument nur die LISTE ab. Das Antippen eines freigeschalteten Eintrags
// navigiert zu einer "FreispielPartie"-Spielansicht, die noch nicht existiert (weder
// als Datei noch als Route in RootNavigator.tsx) — bewusst so belassen, siehe
// Rückmeldung an den Nutzer zum Abschluss dieses Schritts.

import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  WALDFREUNDE_STUFEN,
  holeStufe,
  type WaldfreundeStufe,
  type WaldgefaehrtenTier,
} from "../lib/waldfreundeBot";
import { ladeFreispielStufenMitStatus } from "../lib/freispielFortschritt";
import {
  EichhoernchenIcon,
  FuchsIcon,
  DachsIcon,
  AdlerinIcon,
  WolfIcon,
  WisentIcon,
} from "../lib/waldgefaehrten";
// Sprach-Vollständigkeit (Claude-Projekt "ChessLynx",
// sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md, Fund A1):
// dieser Screen war die einzige Stelle im ganzen Spiel ohne jede gesprochene
// Orientierung für ein nicht lesefähiges Kind — weder beim Betreten noch bei der
// Freischalt-Feier. Gleiche Sprech-Infrastruktur wie überall sonst.
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { luxVariante } from "../lib/luxVarianten";

// Rotierende Begrüßung beim (Wieder-)Betreten der Liste — dasselbe Prinzip wie die
// KidHome-Begrüßung (RootNavigator.tsx): ein Kind, das öfter hierher zurückkehrt, soll
// nicht jedes Mal denselben Satz hören.
const BEGRUESSUNG_VARIANTEN = [
  "Welches Tier forderst du heute heraus?",
  "Schau dir deine Waldfreunde an. Gegen wen spielst du diesmal?",
  "Tipp auf ein Tier, das du schon erreicht hast, und leg los!",
];
// Rotierende Feier-Zeile bei einer frisch freigeschalteten Stufe — bisher rein optisch
// (Funkeln/Icon), obwohl jeder andere Feiermoment im Spiel (QuestGeschafft & Co.) eine
// gesprochene Zeile hat.
const FREISCHALTUNG_VARIANTEN = [
  "Super! Ein neues Tier wartet jetzt auf dich!",
  "Du hast eine neue Stufe erspielt! Weiter geht's!",
  "Stark gespielt! Schau, wer als Nächstes auf dich wartet.",
];

type StufeMitStatus = WaldfreundeStufe & { freigeschaltet: boolean };

const TIER_ICONS: Record<WaldgefaehrtenTier, ComponentType<{ size?: number }>> = {
  eichhoernchen: EichhoernchenIcon,
  fuchs: FuchsIcon,
  dachs: DachsIcon,
  adlerin: AdlerinIcon,
  wolf: WolfIcon,
  wisent: WisentIcon,
};

// Nur für Screenreader/Bedienungshilfen gedacht (siehe accessibilityLabel unten) — auf
// dem Bildschirm selbst erscheint dieser Text nicht, das "textzahlenfrei"-Prinzip
// bleibt also gewahrt.
const TIER_NAMEN: Record<WaldgefaehrtenTier, string> = {
  eichhoernchen: "Eichhörnchen",
  fuchs: "Fuchs",
  dachs: "Dachs",
  adlerin: "Adlerin",
  wolf: "Wolf",
  wisent: "Wisent",
};

const MAX_RANG_PRO_TIER: Record<WaldgefaehrtenTier, number> = WALDFREUNDE_STUFEN.reduce(
  (acc, stufe) => {
    acc[stufe.tier] = Math.max(acc[stufe.tier] ?? 0, stufe.rang);
    return acc;
  },
  {} as Record<WaldgefaehrtenTier, number>
);

export default function FreispielScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [stufen, setStufen] = useState<StufeMitStatus[] | null>(null);
  const [feierStufe, setFeierStufe] = useState<WaldfreundeStufe | null>(null);
  const zeigeUntertitel = useUntertitelAktiv();
  // Begrüßung nur, solange keine Freischalt-Feier läuft (die spricht ihre eigene Zeile,
  // siehe FeierUeberlagerung unten) — sonst würden beide gleichzeitig sprechen wollen.
  // Vor dem `if (!stufen) return` platziert (React-Hook-Regel: keine bedingten
  // Hook-Aufrufe), genau wie schon in FreispielPartie.tsx gelöst.
  const { wiederholen: begruessungWiederholen, aktuelleZeile: begruessungZeile } = useLuxSprechzeile(
    stufen ? (feierStufe ? "feier-aktiv" : "begruessung") : "laden",
    stufen && !feierStufe ? () => luxVariante(BEGRUESSUNG_VARIANTEN, "freispiel-liste-begruessung") : undefined
  );

  const ladeStufen = useCallback(async () => {
    const geladen = await ladeFreispielStufenMitStatus();
    setStufen(geladen);
  }, []);

  // Bei jedem Fokussieren neu laden (nicht nur beim ersten Mount) — wichtig, damit eine
  // frisch freigeschaltete Stufe sichtbar wird, wenn der Screen nach einem Sieg in der
  // (noch zu bauenden) Partie-Ansicht wieder in den Vordergrund kommt.
  useFocusEffect(
    useCallback(() => {
      ladeStufen();
    }, [ladeStufen])
  );

  // Feier-Animation auslösen, wenn die Partie-Ansicht einen Navigationsparameter
  // `neuFreigeschaltetElo` mitgibt (siehe Kommentar oben zur noch fehlenden
  // FreispielPartie). Param sofort wieder löschen, damit die Feier nicht bei jedem
  // erneuten Fokussieren dieses Screens wiederholt wird.
  useFocusEffect(
    useCallback(() => {
      const neueElo: number | undefined = route.params?.neuFreigeschaltetElo;
      if (neueElo !== undefined) {
        setFeierStufe(holeStufe(neueElo));
        navigation.setParams({ neuFreigeschaltetElo: undefined });
      }
    }, [route.params?.neuFreigeschaltetElo, navigation])
  );

  const hoechsteFreigeschaltete = stufen
    ? Math.max(...stufen.filter((s) => s.freigeschaltet).map((s) => s.elo))
    : undefined;

  if (!stufen) {
    return (
      <SafeAreaView style={styles.safeLaden}>
        <ActivityIndicator color="#8FA888" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable
        style={styles.luxCorner}
        onPress={begruessungWiederholen}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {zeigeUntertitel && !feierStufe && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{begruessungZeile}</Text>
        </View>
      )}
      <ScrollView style={styles.scrollFlex} contentContainerStyle={styles.liste}>
        {stufen.map((stufe) => (
          <StufenEintrag
            key={stufe.elo}
            stufe={stufe}
            istAktuellerRand={stufe.elo === hoechsteFreigeschaltete}
            onSpielen={() => navigation.navigate("FreispielPartie", { elo: stufe.elo })}
          />
        ))}
      </ScrollView>

      {feierStufe && (
        <FeierUeberlagerung stufe={feierStufe} onSchliessen={() => setFeierStufe(null)} />
      )}
    </SafeAreaView>
  );
}

function StufenEintrag({
  stufe,
  istAktuellerRand,
  onSpielen,
}: {
  stufe: StufeMitStatus;
  istAktuellerRand: boolean;
  onSpielen: () => void;
}) {
  const Icon = TIER_ICONS[stufe.tier];
  const maxRang = MAX_RANG_PRO_TIER[stufe.tier];

  const skalierung = useSharedValue(1);
  const wackler = useSharedValue(0);

  const antippStil = useAnimatedStyle(() => ({
    transform: [{ scale: skalierung.value }, { translateX: wackler.value }],
  }));

  function handlePress() {
    if (stufe.freigeschaltet) {
      // Kurze Antipp-Reaktion (Skalier-Wackler), danach zur Partie — siehe
      // Konzept-Dokument: "kurze Charakter-Reaktion beim Antippen eines
      // freigeschalteten Eintrags".
      skalierung.value = withSequence(
        withTiming(0.88, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 6, stiffness: 220 })
      );
      setTimeout(onSpielen, 120);
    } else {
      // Vernebelte Einträge reagieren auf Antippen mit einem sanften Wackeln statt
      // Navigation — reine Rückmeldung "noch nicht erreicht", ohne Schloss-Symbolik
      // oder Text ("nicht verfügbar" o. Ä.).
      wackler.value = withSequence(
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={
        stufe.freigeschaltet
          ? `${TIER_NAMEN[stufe.tier]}, Rang ${stufe.rang}`
          : `${TIER_NAMEN[stufe.tier]}, Rang ${stufe.rang}, noch nicht erreicht`
      }
      style={[styles.eintrag, istAktuellerRand && styles.eintragAktuellerRand]}
    >
      <Animated.View style={[styles.iconRahmen, antippStil]}>
        {stufe.freigeschaltet ? (
          <Icon size={44} />
        ) : (
          <NebelHuelle>
            <Icon size={44} />
          </NebelHuelle>
        )}
      </Animated.View>
      <RangPunkte rang={stufe.rang} maxRang={maxRang} aktiv={stufe.freigeschaltet} />
    </Pressable>
  );
}

/** "Vernebelte Silhouette" statt Schloss-Symbol (Design-Grundsatz 3) — reduziert das
 * Icon auf gedämpfte Opazität und legt einen halbtransparenten, wolkigen Schleier
 * darüber, zusammengesetzt aus drei überlappenden, unregelmäßig positionierten
 * Kreisen (wirkt weicher als eine einzelne Fläche). */
function NebelHuelle({ children }: { children: ReactNode }) {
  return (
    <View style={styles.nebelWrapper}>
      <View style={styles.nebelInhalt}>{children}</View>
      <View pointerEvents="none" style={styles.nebelSchleierBasis} />
      <View pointerEvents="none" style={[styles.nebelWolke, styles.nebelWolkeA]} />
      <View pointerEvents="none" style={[styles.nebelWolke, styles.nebelWolkeB]} />
      <View pointerEvents="none" style={[styles.nebelWolke, styles.nebelWolkeC]} />
    </View>
  );
}

function RangPunkte({ rang, maxRang, aktiv }: { rang: number; maxRang: number; aktiv: boolean }) {
  return (
    <View style={styles.punkteReihe}>
      {Array.from({ length: maxRang }).map((_, i) => (
        <View key={i} style={[styles.punkt, i < rang && aktiv ? styles.punktGefuellt : styles.punktLeer]} />
      ))}
    </View>
  );
}

/** Sanfte Feier-Animation beim erstmaligen Freischalten einer neuen Stufe (siehe
 * Konzept-Dokument). Tippen oder automatisches Ausblenden nach ~3,5 s schließt sie. */
function FeierUeberlagerung({ stufe, onSchliessen }: { stufe: WaldfreundeStufe; onSchliessen: () => void }) {
  const Icon = TIER_ICONS[stufe.tier];
  const zeigeUntertitel = useUntertitelAktiv();
  // `erinnerung: false`: die Karte schließt sich ohnehin automatisch nach 3,5 s (unten,
  // deutlich vor der sonst üblichen 8-Sekunden-Erinnerung) und hat kein eigenes
  // Lux-Antipp-Icon — eine Wiederholung wäre hier ohne jeden Nutzen.
  const { aktuelleZeile } = useLuxSprechzeile(
    `freischaltung-${stufe.elo}`,
    () => luxVariante(FREISCHALTUNG_VARIANTEN, "freispiel-freischaltung"),
    undefined,
    { erinnerung: false }
  );
  const skalierung = useSharedValue(0.6);
  const deckkraft = useSharedValue(0);

  // Läuft genau einmal beim Erscheinen der Überlagerung (nicht bei jedem Re-Render) —
  // bewusst useEffect statt (fälschlicherweise) useState, damit sowohl die
  // Animationsstart-Zuweisungen als auch der Timeout echte Nebeneffekte nach dem
  // Rendern sind, nicht während des Renderns selbst.
  useEffect(() => {
    skalierung.value = withSequence(
      withTiming(1.12, { duration: 260, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 8, stiffness: 160 })
    );
    deckkraft.value = withTiming(1, { duration: 220 });
    const zeitgeber = setTimeout(onSchliessen, 3500);
    return () => clearTimeout(zeitgeber);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSchliessen ist ein
    // frischer Inline-Callback von FreispielScreen; erneutes Ausführen bei jeder
    // Identitätsänderung würde die Feier unerwünscht neu starten.
  }, []);

  const kartenStil = useAnimatedStyle(() => ({
    transform: [{ scale: skalierung.value }],
    opacity: deckkraft.value,
  }));
  const hintergrundStil = useAnimatedStyle(() => ({ opacity: deckkraft.value }));

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onSchliessen}>
      <Animated.View style={[styles.feierHintergrund, hintergrundStil]} />
      <View style={styles.feierMitte}>
        <Animated.View style={[styles.feierKarte, kartenStil]}>
          <Icon size={84} />
          {zeigeUntertitel && <Text style={styles.feierText}>{aktuelleZeile}</Text>}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4" },
  safeLaden: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center" },
  // Lux-Ecke + Sprechblase — dieselben Werte wie in den Bonuskapiteln/Quest-Screens,
  // damit sich dieser Screen konsistent in den Rest der App einfügt.
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  sprechblase: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 84,
    marginHorizontal: 20,
    minHeight: 60,
    justifyContent: "center",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 9,
  },
  sprechblaseSchweif: {
    position: "absolute",
    top: -6,
    left: 28,
    width: 14,
    height: 14,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  speech: { fontSize: 16, color: "#4A4038", textAlign: "center" },
  feierText: { fontSize: 15, color: "#4A4038", textAlign: "center", marginTop: 10, paddingHorizontal: 8 },
  scrollFlex: { flex: 1 },
  liste: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20, gap: 14 },
  eintrag: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4DCC8",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  eintragAktuellerRand: { borderColor: "#8FA888", borderWidth: 2 },
  iconRahmen: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F7F1E4",
    alignItems: "center",
    justifyContent: "center",
  },
  punkteReihe: { flexDirection: "row", gap: 6, flexShrink: 1, flexWrap: "wrap" },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  punktGefuellt: { backgroundColor: "#C9855F" },
  punktLeer: { backgroundColor: "#E4DCC8" },

  nebelWrapper: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  nebelInhalt: { opacity: 0.32 },
  nebelSchleierBasis: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(224,220,200,0.5)",
  },
  nebelWolke: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(247,241,228,0.65)" },
  nebelWolkeA: { width: 30, height: 22, top: 2, left: 4 },
  nebelWolkeB: { width: 26, height: 20, bottom: 2, right: 2 },
  nebelWolkeC: { width: 22, height: 18, top: 14, left: 16 },

  feierHintergrund: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(74,64,56,0.55)" },
  feierMitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  feierKarte: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#8FA888",
  },
});
