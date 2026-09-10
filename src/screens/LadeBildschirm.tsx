// Ladebildschirm/Intro — Nutzerwunsch (Claude-Projekt "ChessLynx", claude/
// lux_begruessungsvideo_freistellung_konzept.md, Abschnitt "Ladebildschirm"): "das Video
// unverändert (im Original wie hochgeladen) ganz am Anfang ... als Ladebildschirm, danach
// eine sanfte Überblendung zum bisherigen Startbildschirm mit Luchs". Video 1 (mit der
// "Welcome to ChessLynx"-Titelkarte und Ton) unverändert, OHNE jede Freistellung.
//
// Verlauf (siehe Projektdokumentation für die volle Historie): JPEG-Bildfolge (flackerte)
// → `expo-video` vollflächig mit `play()` im Setup-Callback (blieb auf Android/im Build
// beim ersten Bild stehen, siehe expo/expo#31247) → `play()` stattdessen erst bei
// `status === "readyToPlay"` ausgelöst (per `useEffect` UND `statusChange`-Listener) +
// Video läuft seitdem in einem zentrierten, abgerundeten Rahmen statt Vollbild.
//
// Update (Nutzer-Feedback 2026-09-08, Web-Vorschau, Browser-Konsole):
// "[NotAllowedError: The play method is not allowed by the user agent or the platform
// in the current context, possibly because the user denied permission.]"
// Ursache: Browser-Autoplay-Richtlinie (kein `expo-video`-spezifisches Problem, siehe u. a.
// expo/expo#36350 "Autoplay doesn't work for video on Web") — Video MIT Ton darf im
// Browser nur durch eine echte Nutzer-Geste (Klick/Tap) gestartet werden, ein
// programmatischer `play()`-Aufruf ohne vorherige Interaktion wird abgelehnt. Native
// Plattformen (iOS/Android) kennen diese Einschränkung nicht — dort bleibt automatisches
// Abspielen unverändert bestehen. Fix: NUR auf `Platform.OS === "web"` wird das
// automatische `play()` unterdrückt; stattdessen zeigt der Rahmen ein Abspielsymbol und der
// erste Tap (der jetzt zweifelsfrei eine "echte" Nutzer-Geste ist) startet die Wiedergabe.
// Ein zweiter Tap (oder der erste auf allen anderen Plattformen) überspringt wie gehabt.
//
// "Sanfte Überblendung": dieser Screen blendet am Ende auf dieselbe Hintergrundfarbe aus
// wie WillkommensSequenz.tsx/KidHome (#F7F1E4 bzw. #DCE7C8), DANACH erst
// navigation.replace. Auslöser ist das `playToEnd`-Ereignis des Video-Players.
//
// Update (2026-09-09, Bau der echten Willkommens-Sequenz, siehe Claude-Projekt "ChessLynx",
// konzept_screen0_verschmelzung_appstart.md Abschnitt 4, "Persistenz-Flag, weiterhin
// nötig"): dieser Screen entscheidet jetzt, WOHIN es nach dem Video weitergeht — bei einer
// frischen Installation (bzw. solange die Sequenz noch nie vollständig zu Ende gelaufen
// ist) zu "WillkommensSequenz", danach direkt zu "KidHome" (die 20-25s lange Sequenz soll
// nur einmal laufen, siehe dortiger Datei-Kopfkommentar). Die Prüfung
// (`hatWillkommenGesehen()`, siehe lib/storage.ts) wird schon beim Mount angestoßen, nicht
// erst beim Video-Ende — AsyncStorage braucht dafür nur wenige Millisekunden, weit weniger
// als die Mindestlaufzeit des Videos, sodass das Ergebnis so gut wie immer rechtzeitig
// vorliegt. Liegt es (im unwahrscheinlichen Fall eines sehr langsamen Geräts) ausnahmsweise
// doch noch nicht vor, wird sicherheitshalber die Sequenz gezeigt (siehe `?? false` unten)
// statt sie fälschlich zu überspringen.
//
// Update (Nutzer-Feedback 2026-09-08, "Video ist etwas größer als der Bildschirmrahmen"):
// Ursache war die Kombination `overflow: "hidden"` + `elevation` (Android-Schatten) auf
// EINER UND DERSELBEN View — ein bekanntes React-Native-Verhalten, bei dem `elevation`
// das Zuschneiden der Kinder auf den abgerundeten Rahmen unterläuft, sodass das Video
// sichtbar über die runden Ecken/den Rahmenrand hinausragt. Fix: der Rahmen ist jetzt
// zweigeteilt — eine äußere View trägt nur Schatten/Elevation (kein `overflow`), eine
// innere View trägt Rand, Ecken-Radius UND `overflow: "hidden"` und schneidet damit das
// Video zuverlässig zu. Gleichzeitig responsiv gemacht: der Rahmen ist jetzt ca. 90–95 %
// der Bildschirmbreite (vorher 78 %) und reagiert per `useWindowDimensions` live auf
// Bildschirmgröße/-drehung.

import { useEventListener } from "expo";
import { useEffect, useRef, useState } from "react";
import {
  View,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { hatWillkommenGesehen } from "../lib/storage";

const introVideo = require("../../assets/lux/intro/lux_ladebildschirm.mp4");

const AUSBLENDEN_MS = 450;
// Rahmen nimmt ~92% der Bildschirmbreite ein (Nutzerwunsch: 90–95%), quadratisch
// (passend zum 640×640-Originalvideo) — auf sehr breiten/kurzen Bildschirmen (z. B.
// Querformat) zusätzlich auf 70% der Höhe gedeckelt, damit der Rahmen nicht oben/unten
// anstößt und Platz für den "Tippen zum..."-Hinweis darunter bleibt. `useWindowDimensions`
// liefert bei Größenänderung/Drehung automatisch neue Werte, der Rahmen ist also live
// responsiv, kein einmalig berechneter Fixwert.
const RAHMEN_BREITE_ANTEIL = 0.92;
const RAHMEN_HOEHE_ANTEIL = 0.7;

export function LadeBildschirm({ navigation }: any) {
  const { width: bildschirmBreite, height: bildschirmHoehe } = useWindowDimensions();
  const rahmenGroesse = Math.min(bildschirmBreite * RAHMEN_BREITE_ANTEIL, bildschirmHoehe * RAHMEN_HOEHE_ANTEIL);

  const opazitaet = useRef(new Animated.Value(1)).current;
  // Verhindert doppeltes Auslösen, falls Antippen und das `playToEnd`-Ereignis fast
  // gleichzeitig eintreffen.
  const beendetWirdBereits = useRef(false);
  // Auf Web (Browser-Autoplay-Richtlinie, siehe Dateikommentar) wartet die Wiedergabe auf
  // einen echten Tap; auf allen anderen Plattformen gilt sie von Anfang an als "gestartet"
  // (automatisches Abspielen, siehe unten).
  const [gestartet, setGestartet] = useState(Platform.OS !== "web");
  // Siehe Dateikommentar oben — `null` bedeutet "noch nicht geladen", wird praktisch immer
  // längst vorliegen, bevor weiterZuOnboarding() tatsächlich gebraucht wird.
  const [bereitsGesehen, setBereitsGesehen] = useState<boolean | null>(null);
  useEffect(() => {
    let abgebrochen = false;
    hatWillkommenGesehen().then((gesehen) => {
      if (!abgebrochen) setBereitsGesehen(gesehen);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  const player = useVideoPlayer(introVideo, (player) => {
    player.loop = false;
  });

  // Automatisches Abspielen NUR auf nativen Plattformen — auf Web würde der Aufruf ohne
  // vorherige Nutzer-Geste ohnehin mit NotAllowedError abgelehnt (siehe Dateikommentar).
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (player.status === "readyToPlay") {
      player.play();
    }
  }, [player]);

  useEventListener(player, "statusChange", ({ status }) => {
    if (Platform.OS === "web") return;
    if (status === "readyToPlay") {
      player.play();
    }
  });

  // Offizielles Vorgehen für "Video zu Ende abgespielt" laut Expo-Doku/-Maintainer (kein
  // eigenes Zeit-/Dauer-Polling nötig).
  useEventListener(player, "playToEnd", () => {
    weiter();
  });

  function handleTap() {
    if (Platform.OS === "web" && !gestartet) {
      // Dieser Tap ist eine echte Nutzer-Geste — genau das, was der Browser für die
      // Wiedergabe von Video MIT Ton verlangt (siehe Dateikommentar). Ein zweiter Tap
      // überspringt dann wie überall sonst.
      player.play();
      setGestartet(true);
      return;
    }
    weiter();
  }

  function weiter() {
    if (beendetWirdBereits.current) return;
    beendetWirdBereits.current = true;
    player.pause();
    Animated.timing(opazitaet, {
      toValue: 0,
      duration: AUSBLENDEN_MS,
      useNativeDriver: true,
    }).start(() => {
      // Siehe Dateikommentar oben — `?? false` ist die sichere Seite (Sequenz sicherheits-
      // halber zeigen statt fälschlich überspringen), falls die AsyncStorage-Prüfung wider
      // Erwarten noch nicht vorliegt.
      navigation.replace(bereitsGesehen ?? false ? "KidHome" : "WillkommensSequenz");
    });
  }

  const wartetAufTapZumStarten = Platform.OS === "web" && !gestartet;

  return (
    <View style={styles.hintergrund}>
      <Pressable
        style={styles.tippFlaeche}
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel={
          wartetAufTapZumStarten
            ? "Lux' Begrüßung, zum Starten antippen"
            : "Lux' Begrüßung, zum Überspringen antippen"
        }
      >
        <Animated.View
          style={[
            styles.rahmenAussen,
            { width: rahmenGroesse, height: rahmenGroesse, opacity: opazitaet },
          ]}
        >
          <View style={styles.rahmenInnen}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
            {wartetAufTapZumStarten && (
              <View style={styles.playUeberlagerung} pointerEvents="none">
                <Text style={styles.playSymbol}>▶</Text>
              </View>
            )}
          </View>
        </Animated.View>
        <Text style={styles.uberspringenHinweis}>
          {wartetAufTapZumStarten ? "Tippen zum Abspielen" : "Tippen zum Überspringen"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Exakt dieselbe Farbe wie Onboarding.tsx (styles.safe) — trägt die Überblendung, siehe
  // Dateikommentar oben.
  hintergrund: { flex: 1, backgroundColor: "#F7F1E4" },
  tippFlaeche: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Abgerundeter "Bilderrahmen" statt Vollbild (Nutzerwunsch), zweigeteilt in Außen-/
  // Innen-View (siehe Dateikommentar oben — `overflow: "hidden"` + `elevation` auf EINER
  // View schneidet Kinder auf Android nicht zuverlässig zu, das Video ragte sichtbar über
  // den Rahmen hinaus).
  //
  // Außen: NUR Schatten/Elevation, kein `overflow` — damit die Elevation ungestört wirkt.
  rahmenAussen: {
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  // Innen: Rand, Ecken-Radius UND `overflow: "hidden"` — schneidet das Video zuverlässig
  // auf die runden Ecken zu. Passend zur warmen Storybook-Optik der App (gleicher
  // Grundton wie die Fließtext-Farbe #4A4038, siehe Onboarding.tsx/ChessLynxButton.tsx).
  rahmenInnen: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 6,
    borderColor: "#4A4038",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: { width: "100%", height: "100%" },
  // Dezentes Abspielsymbol über dem (auf Web) noch nicht gestarteten Video — signalisiert
  // Kindern/Eltern, dass hier etwas antippbar ist, statt sie vor einem scheinbar
  // eingefrorenen Bild stehen zu lassen.
  playUeberlagerung: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playSymbol: { fontSize: 48, color: "#FFFFFF" },
  uberspringenHinweis: {
    position: "absolute",
    bottom: 24,
    color: "#8A7F6E",
    fontSize: 13,
  },
});
