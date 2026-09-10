// Isolierter Vorversuch für die Flug-Choreografie aus dem "Verschmelzung App-Start +
// Screen 0"-Konzept (siehe Claude-Projekt "ChessLynx",
// claude/konzept_screen0_verschmelzung_appstart.md, Abschnitt 5 "Offene Entscheidungen",
// Punkt 5: "erst isoliert testen, bevor in die echte WillkommensSequenz.tsx eingebaut
// wird" — genau nach demselben Muster wie seinerzeit RigRendererProbe.tsx für die
// Figuren-Rendering-Frage). Nutzerwunsch, der diesen Screen ausgelöst hat: "Bitte
// antesten, ich bin sehr gespannt!"
//
// Getestet werden hier NUR die beiden Beats, für die der Nutzer ausdrücklich eine hohe
// visuelle Qualität gefordert hat ("Insbesondere das Verstecken von der Karte im Wald
// und das dortige Platzieren muss optisch ansprechend und hochwertig wirken"):
//   Beat 4 "Verstecken": die sechs Tiere fliegen nacheinander vom (gemockten) Brett weg,
//     Richtung Waldkulisse — nicht wie ein simples Verblassen an Ort und Stelle (siehe
//     Konzept-Abschnitt 7, Handwerksvorschlag 1).
//   Beat 6 "Landen": dieselben sechs Tiere fliegen von oben (aus dem Nebel kommend) auf
//     die ECHTEN Wegmarken-Koordinaten der Luchs-Revier-Karte ein — dafür wurden in
//     LuchsRevierKarte.tsx die bislang internen Konstanten WEGMARKEN/REFERENZ_BREITE/
//     REFERENZ_HOEHE/MAP_ASPECT exportiert (rein additive Änderung dort), damit hier
//     exakt dieselben Zielkoordinaten verwendet werden wie auf der echten Karte — siehe
//     Konzept-Abschnitt 6 "Logische Prüfung", Fakt 3: ein unabhängig neu geschätzter Wert
//     hätte beim Übergang zur echten Karte sichtbar "gesprungen".
//   Wichtigste inhaltliche Korrektur aus derselben Prüfung (Abschnitt 6): nur der Igel
//     (Quest 1, auf einer frischen Installation die einzige "als nächstes dran"-Wegmarke)
//     landet vollständig klar + mit Puls/Bounce; die anderen fünf fallen nach der Landung
//     sichtbar in die Nebel-Deckkraft zurück (0.55, exakt GESPERRT_OPACITY aus
//     LuchsRevierKarte.tsx) — sonst gäbe es beim tatsächlichen Wechsel zur echten Karte
//     (die 5 von 6 Wegmarken von Anfang an gedimmt zeigt) einen sichtbaren "Pop".
//
// Update (2026-09-09, Rückmeldung nach dem ersten Ansehen — "Nebel-Rückfall der anderen
// fünf verständlich? Ja, vielleicht unterstützend mit Einblenden des restlichen Nebels?"):
// erste Fassung dieses Updates fügte einen kleinen Nebel-Fleck PRO nicht-Igel-Figur hinzu.
// Klarstellung direkt danach: gemeint war NICHT Nebel nur um die einzelnen Figuren,
// sondern die ECHTE Saga-Karte als Ganzes, die sich nach dem Ankommen/Verstecken der
// Figuren in Nebel hüllt — also dieselbe Technik wie in `LuchsRevierKarte.tsx` (ein
// durchgehendes Nebel-Höhenband über der GESAMTEN Karte, mit einer weichen Lichtung nur um
// den Igel), nicht sechs unabhängige Einzeleffekte. Jetzt entsprechend umgesetzt: das
// echte `luchsrevier_nebel_band.png`-Asset, per SVG-`Mask`/`RadialGradient` mit GENAU einer
// Lichtung um den Igel (dieselbe `NEBEL_KLARUNG_NAECHSTES`-Logik wie dort — die anderen
// fünf bekommen bewusst KEINE Lichtung, exakt wie in der echten Karte, wo "gesperrte"
// Wegmarken keinerlei Nebel-Klarung erhalten), blendet als GANZES über die komplette
// Kartenfläche ein, nachdem alle sechs Figuren gelandet sind.
//
// Bewusst NICHT in echten Produktionscode integriert (kein Import in Quest1.tsx/
// RootNavigator-Startroute) — nur als Route erreichbar, siehe RootNavigator.tsx,
// Eintrag "WillkommensFlugProbe", nach demselben "nur per navigation.navigate
// erreichbar, nicht in der UI verlinkt"-Muster wie RigRendererProbe/FreispielScreen vor
// Schritt #76. Kann nach Abschluss des Vorversuchs folgenlos gelöscht werden.
//
// Bewusste Vereinfachungen gegenüber der künftigen echten WillkommensSequenz.tsx (hier
// geht es nur um Choreografie/Gefühl, nicht um die finale Produktionsarchitektur):
// - Die "Brett"-Szene ist ein grobes Mock (sechs Tiere in einer Reihe vor der bereits
//   etablierten WaldHintergrund-Kulisse), NICHT die echte LeeresBrettMitAllenTieren-
//   Komponente — die exponiert keine einzeln ansteuerbaren Animationswerte pro Figur.
// - Keine Sprachausgabe/Audio, nur eine kurze Textzeile analog zur bestehenden
//   Sprechblase (die geplante SVG-Neugestaltung der Sprechblase selbst ist ein separates,
//   noch nicht entschiedenes Thema, siehe claude/sprechblasen_gestaltungskonzept.md).
// - Die "Landen"-Zielkoordinaten sind exakt (siehe oben), die "Verstecken"-Start- und
//   -Zielkoordinaten (Brettreihe → Waldrand) sind für diesen Vorversuch frei gewählte,
//   aber an der echten Kulisse orientierte Näherungswerte.

import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Defs, Image as SvgBild, Mask, RadialGradient, Rect, Stop } from "react-native-svg";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { Funkeln } from "../components/Funkeln";
import { WEGMARKEN, MAP_ASPECT } from "../components/LuchsRevierKarte";

const hintergrundKarte = require("../../assets/hintergrund/luchsrevier_wisentfeste.webp");
// Dasselbe durchgehende Nebel-Höhenband wie in LuchsRevierKarte.tsx (siehe dortiger
// ausführlicher Kommentar zu Herkunft/Kalibrierung) — hier direkt erneut per require()
// eingebunden statt (wie WEGMARKEN/MAP_ASPECT) aus der Komponente exportiert, da es sich
// um ein reines Bild-Asset ohne Koordinatenbezug handelt (kein "Sprung"-Risiko wie bei
// Positionswerten, siehe Kommentar bei NEBEL_GEDIMMT unten).
const nebelBand = require("../../assets/hintergrund/luchsrevier_nebel_band.png");
// Exakt derselbe Grauton wie NEBEL_KLARUNG_NAECHSTES in LuchsRevierKarte.tsx — die
// "als nächstes dran"-Lichtung ist dort bewusst nur eine schwache Aufhellung, kein
// vollständiges Freilegen (das bleibt "erledigten" Wegmarken vorbehalten, die es hier noch
// gar nicht geben kann).
const NEBEL_KLARUNG_NAECHSTES = "#8A8A8A";

// Derselbe Android-Fix wie in lib/pieceMasters.tsx (dortiger Kommentar: verhindert, dass
// eine Figur auf Android erst nach einer unsichtbaren Fade-Transition erscheint) —
// hier besonders relevant, weil die Figuren hier direkt in eine laufende Animation
// hinein sichtbar werden müssen, nicht erst danach.
const ANDROID_FIX_PROPS = Platform.OS === "android" ? { fadeDuration: 0 } : {};

// Exakt derselbe Wert wie GESPERRT_OPACITY in LuchsRevierKarte.tsx (dort bewusst nicht
// exportiert, da eine reine Zahl ohne Bezug zu Koordinaten/Assets — anders als
// WEGMARKEN/MAP_ASPECT oben besteht hier kein Risiko eines sichtbaren "Sprungs", daher
// hier separat benannt statt einen weiteren Export zu erzwingen).
const NEBEL_GEDIMMT = 0.55;

// Start-Positionen der sechs Tiere in der Mock-Brett-Szene (Anteil von Bühnenbreite/
// -höhe) — eine ruhige, leicht gestaffelte Reihe im unteren Bühnendrittel, angelehnt an
// die "Vorstellung auf leerem Brett"-Optik von Quest1.tsx Screen 0.
const BRETT_START_FX = [0.14, 0.284, 0.428, 0.572, 0.716, 0.86];
const BRETT_START_FY = 0.62;

// Ziel-/Ausgangspunkte für "Verstecken" bzw. "Landen" — Richtung Waldkulisse oben
// (Handwerksvorschlag 1: Richtung Wald fliegen statt an Ort und Stelle verblassen).
// Abwechselnd linke/rechte obere Ecke, mit kleinem horizontalem Versatz je Figur, damit
// die sechs Flugbahnen sich nicht exakt überlagern.
const VERSTECK_ZIEL_FX = [0.08, 0.9, 0.14, 0.84, 0.2, 0.78];
const VERSTECK_ZIEL_FY = 0.06;

// Startpunkte für "Landen": senkrecht über der jeweiligen echten Zielposition, oberhalb
// des sichtbaren Bühnenrands — die Figuren "fallen" quasi aus dem Nebel herab.
const LANDE_START_FY_OFFSET = -0.16;

type Phase = "brett" | "landet" | "ruhe";

type FunkelBurst = { id: number; x: number; y: number; size: number };

function useAnimatedZero() {
  return useRef(new Animated.Value(0)).current;
}

export default function WillkommensFlugProbe() {
  const [breite, setBreite] = useState(0);
  const [phase, setPhase] = useState<Phase>("ruhe");
  const [caption, setCaption] = useState("Lux: „Bereit? Tippe unten auf einen Ablauf, um ihn zu sehen!“");
  const [bursts, setBursts] = useState<FunkelBurst[]>([]);
  const burstIdRef = useRef(0);

  // Ein Fortschrittswert (0→1) pro Figur für "Verstecken" und einer für "Landen" —
  // getrennt, weil es sich (siehe Datei-Kopfkommentar "Bewusste Vereinfachungen") um
  // zwei unabhängige Icon-Sätze handelt, nicht dieselbe Ansichtsinstanz.
  const versteckWerte = useRef(WEGMARKEN.map(() => new Animated.Value(0))).current;
  const landeWerte = useRef(WEGMARKEN.map(() => new Animated.Value(0))).current;
  // Zweiter, an landeWerte anschließender Wert je Figur: blendet die fünf nicht-
  // "nächstes"-Figuren nach der Landung in die gedimmte Nebel-Deckkraft zurück (siehe
  // Datei-Kopfkommentar, "wichtigste inhaltliche Korrektur").
  const nebelRueckfallWerte = useRef(WEGMARKEN.map(() => new Animated.Value(0))).current;
  const szenenUeberblendung = useAnimatedZero(); // 0 = Brett-Szene, 1 = Karten-Szene
  // Blendet das durchgehende Nebel-Höhenband über der GESAMTEN Karte ein, NACHDEM alle
  // sechs Figuren gelandet sind (siehe Update-Kommentar oben) — separat von
  // nebelRueckfallWerte, weil dieser Wert die ganze Kartenfläche betrifft, nicht einzelne
  // Figuren.
  const nebelGesamtdeckung = useAnimatedZero();

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - breite) > 0.5) setBreite(w);
  };

  const hoehe = breite * MAP_ASPECT;

  const addBurst = (x: number, y: number, size = 64) => {
    const id = burstIdRef.current++;
    setBursts((b) => [...b, { id, x, y, size }]);
    setTimeout(() => setBursts((b) => b.filter((e) => e.id !== id)), 900);
  };

  const timing = (
    value: Animated.Value,
    toValue: number,
    duration: number,
    delay = 0,
    easing = Easing.out(Easing.cubic)
  ) =>
    new Promise<void>((resolve) => {
      Animated.timing(value, { toValue, duration, delay, easing, useNativeDriver: true }).start(() => resolve());
    });

  const reset = () => {
    versteckWerte.forEach((v) => v.setValue(0));
    landeWerte.forEach((v) => v.setValue(0));
    nebelRueckfallWerte.forEach((v) => v.setValue(0));
    nebelGesamtdeckung.setValue(0);
    szenenUeberblendung.setValue(0);
    setBursts([]);
    setPhase("ruhe");
    setCaption("Lux: „Bereit? Tippe unten auf einen Ablauf, um ihn zu sehen!“");
  };

  const spieleVerstecken = async () => {
    if (breite === 0) return;
    reset();
    setPhase("brett");
    setCaption("Lux: „Kommt, wir suchen uns ein gutes Versteck im Wald!“");
    const STAGGER = 340;
    await Promise.all(
      WEGMARKEN.map((_, i) => {
        const startX = BRETT_START_FX[i] * breite;
        const startY = BRETT_START_FY * hoehe;
        return new Promise<void>((resolve) => {
          setTimeout(() => addBurst(startX, startY, 56), i * STAGGER);
          timing(versteckWerte[i], 1, 620, i * STAGGER, Easing.in(Easing.cubic)).then(resolve);
        });
      })
    );
    setCaption("Lux: „Gut versteckt! Jetzt geht's zur Karte …“");
    await timing(szenenUeberblendung, 1, 700, 250, Easing.inOut(Easing.ease));
    setPhase("landet");
    setCaption("");
  };

  const spieleLanden = async () => {
    if (breite === 0) return;
    if (phase !== "landet") {
      // "Nur Landen" isoliert testen: Bühne direkt in der Karten-Szene starten, ohne
      // vorheriges Verstecken.
      reset();
      szenenUeberblendung.setValue(1);
      setPhase("landet");
    }
    landeWerte.forEach((v) => v.setValue(0));
    nebelRueckfallWerte.forEach((v) => v.setValue(0));
    nebelGesamtdeckung.setValue(0);
    setCaption("Lux: „Da seid ihr ja wieder — willkommen in eurem Revier!“");
    const STAGGER = 380;
    await Promise.all(
      WEGMARKEN.map((w, i) => {
        const zielX = w.fx * breite;
        const zielY = w.fy * hoehe;
        const istIgel = i === 0; // Quest 1 — einzige "als nächstes dran"-Wegmarke auf frischer Installation
        return new Promise<void>((resolve) => {
          timing(landeWerte[i], 1, 560, i * STAGGER, Easing.out(Easing.cubic)).then(() => {
            addBurst(zielX, zielY, istIgel ? 84 : 50);
            if (!istIgel) {
              timing(nebelRueckfallWerte[i], 1, 500, 260);
            }
            resolve();
          });
        });
      })
    );
    setCaption("Lux: „Der Igel wartet schon auf dem Weg — auf geht's!“");
    // Erst NACHDEM alle sechs gelandet sind, hüllt sich die GANZE Karte in Nebel (siehe
    // Datei-Kopfkommentar) — nicht während des Landens selbst, damit erst sichtbar wird,
    // WER wo steht, bevor der Nebel darüberzieht.
    await timing(nebelGesamtdeckung, 1, 900, 300, Easing.inOut(Easing.ease));
  };

  const spieleBeides = async () => {
    await spieleVerstecken();
    await spieleLanden();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Willkommens-Flug-Probe</Text>
      <Text style={styles.subheading}>
        Isolierter Vorversuch: Beat 4 „Verstecken“ und Beat 6 „Landen“ aus dem
        Verschmelzungs-Konzept. Nichts hier ist an echten Produktionscode angeschlossen.
      </Text>

      <View style={styles.buehneRahmen} onLayout={onLayout}>
        {breite > 0 && (
          <View style={{ width: breite, height: hoehe, overflow: "hidden", borderRadius: 18 }}>
            {/* Brett-Szene */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { opacity: szenenUeberblendung.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
              ]}
            >
              <View style={StyleSheet.absoluteFillObject}>
                <WaldHintergrund variante={1} />
              </View>
              {WEGMARKEN.map((w, i) => {
                const startX = BRETT_START_FX[i] * breite;
                const startY = BRETT_START_FY * hoehe;
                const zielX = VERSTECK_ZIEL_FX[i] * breite;
                const zielY = VERSTECK_ZIEL_FY * hoehe;
                const bildBreite = w.breiteFrac * breite * 0.85;
                const bildHoehe = bildBreite * w.aspekt;
                const fortschritt = versteckWerte[i];
                return (
                  <Animated.Image
                    key={w.quest}
                    source={w.bild}
                    resizeMode="contain"
                    {...ANDROID_FIX_PROPS}
                    style={{
                      position: "absolute",
                      left: startX - bildBreite / 2,
                      top: startY - bildHoehe,
                      width: bildBreite,
                      height: bildHoehe,
                      opacity: fortschritt.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1, 0] }),
                      transform: [
                        { translateX: fortschritt.interpolate({ inputRange: [0, 1], outputRange: [0, zielX - startX] }) },
                        { translateY: fortschritt.interpolate({ inputRange: [0, 1], outputRange: [0, zielY - startY] }) },
                        { scale: fortschritt.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.08, 0.35] }) },
                      ],
                    }}
                  />
                );
              })}
            </Animated.View>

            {/* Karten-Szene */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { opacity: szenenUeberblendung }]}
            >
              <ImageBackground source={hintergrundKarte} style={{ width: breite, height: hoehe }} resizeMode="cover">
                {WEGMARKEN.map((w, i) => {
                  const zielX = w.fx * breite;
                  const zielY = w.fy * hoehe;
                  const startX = zielX;
                  const startY = (w.fy + LANDE_START_FY_OFFSET) * hoehe;
                  const bildBreite = w.breiteFrac * breite;
                  const bildHoehe = bildBreite * w.aspekt;
                  const fortschritt = landeWerte[i];
                  const nebelRueckfall = nebelRueckfallWerte[i];
                  const istIgel = i === 0;
                  return (
                    <Animated.View
                      key={w.quest}
                      style={{
                        position: "absolute",
                        left: startX - bildBreite / 2,
                        top: startY - bildHoehe,
                        width: bildBreite,
                        height: bildHoehe,
                        opacity: fortschritt.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.7, 1] }),
                        transform: [
                          {
                            translateY: fortschritt.interpolate({
                              inputRange: [0, 0.75, 0.9, 1],
                              outputRange: [0, zielY - startY, zielY - startY - bildHoehe * 0.06, zielY - startY],
                            }),
                          },
                          {
                            scale: fortschritt.interpolate({
                              inputRange: [0, 0.75, 0.9, 1],
                              outputRange: [0.7, 1, istIgel ? 1.1 : 1.03, 1],
                            }),
                          },
                        ],
                      }}
                    >
                      {/* Schatten — nur der Igel bekommt den vollen, weich einblendenden
                          Schatten (Handwerksvorschlag 3); bei den anderen fünf bliebe er
                          ohnehin gleich wieder unter der Nebel-Rückblendung verschwinden. */}
                      {istIgel && (
                        <Animated.View
                          style={[
                            styles.schatten,
                            {
                              width: bildBreite * 0.58,
                              height: bildBreite * 0.16,
                              left: bildBreite * 0.21,
                              top: bildHoehe - bildBreite * 0.1,
                              opacity: fortschritt.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, 0.32] }),
                            },
                          ]}
                        />
                      )}
                      <Animated.Image
                        source={w.bild}
                        resizeMode="contain"
                        {...ANDROID_FIX_PROPS}
                        style={{
                          width: bildBreite,
                          height: bildHoehe,
                          opacity: nebelRueckfall.interpolate({ inputRange: [0, 1], outputRange: [1, NEBEL_GEDIMMT] }),
                        }}
                      />
                    </Animated.View>
                  );
                })}

                {/* Die GANZE Karte hüllt sich in Nebel, NACHDEM alle sechs gelandet sind
                    (siehe Datei-Kopfkommentar, Klarstellung "nicht nur Nebel für die
                    Figuren, sondern die Saga-Karte als Ganzes") — dieselbe Technik wie in
                    LuchsRevierKarte.tsx: ein durchgehendes Nebel-Höhenband, per SVG-`Mask`
                    mit GENAU einer weichen Lichtung um den Igel ausgeschnitten. Als
                    direktes ImageBackground-Kind nach allen Wegmarken-Overlays, konsistent
                    mit dem dort dokumentierten Android/Fabric-Fallstrick-Hinweis. */}
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFillObject, { opacity: nebelGesamtdeckung }]}
                >
                  <Svg width={breite} height={hoehe} style={StyleSheet.absoluteFillObject}>
                    <Defs>
                      <RadialGradient id="klarungIgelProbe" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={NEBEL_KLARUNG_NAECHSTES} stopOpacity={1} />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
                      </RadialGradient>
                      <Mask id="nebelMaskeProbe" maskUnits="userSpaceOnUse" x={0} y={0} width={breite} height={hoehe}>
                        <Rect x={0} y={0} width={breite} height={hoehe} fill="#FFFFFF" />
                        <Circle
                          cx={WEGMARKEN[0].fx * breite}
                          cy={WEGMARKEN[0].fy * hoehe}
                          r={0.17 * breite * 0.85}
                          fill="url(#klarungIgelProbe)"
                        />
                      </Mask>
                    </Defs>
                    <SvgBild
                      href={nebelBand}
                      x={0}
                      y={0}
                      width={breite}
                      height={hoehe}
                      preserveAspectRatio="xMidYMid slice"
                      mask="url(#nebelMaskeProbe)"
                    />
                  </Svg>
                </Animated.View>
              </ImageBackground>
            </Animated.View>

            {/* Funkeln-Ausbrüche (Verstecken + Landen), siehe Handwerksvorschlag 2 */}
            {bursts.map((b) => (
              <View key={b.id} style={{ position: "absolute", left: b.x - b.size / 2, top: b.y - b.size / 2 }}>
                <Funkeln size={b.size} />
              </View>
            ))}

            {caption.length > 0 && (
              <View style={styles.sprechblaseMock}>
                <Text style={styles.sprechblaseText}>{caption}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.knopfReihe}>
        <ProbeKnopf label="▶ Verstecken" onPress={spieleVerstecken} />
        <ProbeKnopf label="▶ Landen" onPress={spieleLanden} />
        <ProbeKnopf label="▶ Beides nacheinander" onPress={spieleBeides} />
        <ProbeKnopf label="↺ Zurücksetzen" onPress={reset} sekundaer />
      </View>

      <Text style={styles.footnote}>
        Rückmeldung, die hier interessiert: (1) wirkt die Flugrichtung Richtung Wald
        („Verstecken“) überzeugender als ein einfaches Verblassen? (2) wirkt der Bounce +
        Schatten + Funkeln beim Igel „hochwertig genug“? (3) wirkt es überzeugend, dass sich
        die GANZE Karte erst nach der Landung in Nebel hüllt (statt einzelner Nebel-Flecken
        pro Figur)? (4) Timing insgesamt zu schnell/zu langsam?
      </Text>
    </View>
  );
}

function ProbeKnopf({ label, onPress, sekundaer }: { label: string; onPress: () => void; sekundaer?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.knopf,
        sekundaer && styles.knopfSekundaer,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.knopfText, sekundaer && styles.knopfTextSekundaer]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF", padding: 16, paddingTop: 48 },
  heading: { fontSize: 20, fontWeight: "700", color: "#4A4038", marginBottom: 4 },
  subheading: { fontSize: 13, color: "#7A7266", marginBottom: 16, lineHeight: 18 },
  buehneRahmen: {
    width: "100%",
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: "#DCE7C8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  schatten: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(10,10,5,0.32)" },
  sprechblaseMock: {
    position: "absolute",
    left: 14,
    top: 14,
    right: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#D7A52D",
  },
  sprechblaseText: { fontSize: 13, color: "#4A4038", fontWeight: "600" },
  knopfReihe: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  knopf: {
    backgroundColor: "#D7A52D",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  knopfSekundaer: { backgroundColor: "#EDE7D8" },
  knopfText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  knopfTextSekundaer: { color: "#4A4038" },
  footnote: { fontSize: 12, color: "#7A7266", marginTop: 20, lineHeight: 18 },
});
