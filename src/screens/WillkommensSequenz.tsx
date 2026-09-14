// WillkommensSequenz — die echte, produktive "Willkommens-Sequenz", die `Onboarding.tsx`
// als Ziel von `LadeBildschirm` ablöst (siehe Claude-Projekt "ChessLynx",
// claude/konzept_screen0_verschmelzung_appstart.md, vollständiges Konzept + Abschnitt 6
// "Logische Prüfung" + Abschnitt 8/9 "Isolierter Vorversuch"). Ersetzt ZWEI bisher
// getrennte, sich teils überschneidende Screens durch EINE zusammenhängende Erzählung:
// den bisherigen `Onboarding.tsx`-Begrüßungsscreen UND die bisherige Quest-1-Screen-0-
// Tiervorstellung (siehe Quest1.tsx, dort jetzt ersatzlos entfernt — Begründung siehe
// Konzept Abschnitt 3: "wer den Igel-Marker antippt, springt direkt zu dem, was heute
// Screen 1 ist", die Tiere wurden hier bereits vorgestellt UND haben sich schon
// versteckt, ein zweites Mal vorzustellen wäre derselbe Doppler-Fehler nur eine Ebene
// tiefer).
//
// Sechs Beats (Konzept Abschnitt 2), als interner Zustandsautomat (`Phase`):
//  1. LadeBildschirm (Video) — nicht Teil dieser Datei, siehe screens/LadeBildschirm.tsx.
//  2. "begruessung": Lux (Atem-Loop, wie zuvor Onboarding.tsx) spricht die EINE
//     Begrüßungszeile + Aufforderung, IHN SELBST anzutippen (kein CTA-Button mehr, siehe
//     bereits umgesetzter Onboarding.tsx-Fix, hier von Anfang an so gebaut). Bewusst KEIN
//     zusätzliches "Hallo, ich bin Lux." (Konzept Abschnitt 1/2: genau das war der
//     gemeldete Doppler-Vorspann, seit die Sequenz jetzt beide bisherigen Screens
//     ersetzt).
//  3. "vorstellung": dieselben sechs Sprechzeilen wie die bisherige Quest-1-Screen-0-
//     Vorstellung, aber deutlich aufwändiger (Konzept Abschnitt 2, Beat 3) — das Brett
//     startet LEER, jedes Tier erscheint erst mit seiner eigenen Sprechzeile, mit eigener
//     Auftritts-Animation + Funkeln-Akzent (siehe `sichtbarBisIndex`-Erweiterung in
//     `LeeresBrettMitAllenTieren.tsx`). Läuft automatisch durch (kein Tap nötig).
//  4. "verstecken": die sechs Tiere fliegen einzeln, gestaffelt vom Brett weg Richtung
//     Waldkulisse — exakt die in `dev/WillkommensFlugProbe.tsx` gebaute und vom Nutzer
//     ausdrücklich bestätigte Choreografie ("Flugrichtung überzeugend? Ja, toll!"), hier
//     nur auf die ECHTEN Zwei-Reihen-Brett-Positionen angewendet (siehe `TIERE`/
//     `berechneBrettMasse`-Export in `LeeresBrettMitAllenTieren.tsx`) statt auf die
//     dortige Mock-Einzelreihe.
//  5. "kartenLeer": kurzer Zwischenstopp auf der reinen Kartenkulisse, ohne Tiere/Nebel
//     (Konzept Abschnitt 2/6, Fakt 1: dieser Zustand existiert in der echten
//     `LuchsRevierKarte.tsx` gar nicht, ist eine eigens für diese Sequenz gebaute Kulisse).
//  6. "landen": die sechs Tiere fallen von oben ein und landen auf den ECHTEN
//     `WEGMARKEN`-Koordinaten aus `LuchsRevierKarte.tsx` — nur der Igel (auf einer
//     frischen Installation die einzige "als nächstes dran"-Wegmarke) landet vollständig
//     klar, mit Bounce/Schatten/größerem Funkeln, die anderen fünf fallen sichtbar in die
//     gedimmte Nebel-Deckkraft zurück, danach hüllt sich die GANZE Karte in das echte
//     `nebelBand`-Höhenband (SVG-Maske, EINE Lichtung um den Igel) — exakt die vom Nutzer
//     nach einer Korrekturrunde bestätigte Fassung aus `dev/WillkommensFlugProbe.tsx`
//     ("Mit Nebel meinte ich ... die in Nebel gehüllte Saga-Karte ... nicht nur die
//     Figuren"). Endet damit exakt im Zustand, den die echte `KidHome`-Karte unmittelbar
//     danach ohnehin zeigt (Konzept Abschnitt 6) — kein sichtbarer Bruch beim Übergang.
//
// Persistenz (Konzept Abschnitt 4, "weiterhin nötig"): läuft nur beim allerersten
// App-Start — `LadeBildschirm.tsx` prüft `hatWillkommenGesehen()` (siehe lib/storage.ts)
// und navigiert bei bereits gesehener Sequenz direkt zu `KidHome`. Diese Datei selbst
// setzt das Flag erst ganz am Ende (`setWillkommenGesehen()`, kurz vor
// `navigation.replace("KidHome")`) — schlägt die Sequenz aus irgendeinem Grund vorher fehl
// (z. B. App-Neustart mitten in der Animation), lief sie also noch nicht "zu Ende" und
// wird beim nächsten Start korrekt erneut gezeigt statt fälschlich übersprungen.
//
// Bewusste Vereinfachung ggü. den Sprechzeilen in "vorstellung"/"begruessung": dort
// übernimmt weiterhin `useLuxSprechzeile` (automatisches Sprechen + Auto-Weiter-Kette,
// exakt wie in allen sechs Quest-Screens). Die Beats 4-6 laufen dagegen als eine einzige
// durchgehende, Promise-basierte Animationskette (dieselbe Technik wie in
// `dev/WillkommensFlugProbe.tsx`) — dort synchronisiert `spreche()` (ruft `sprich()` aus
// `lib/luxStimme.ts` direkt auf) die Sprachausgabe MANUELL zu den jeweiligen
// Animationsmomenten, statt sie in die Zeilen-für-Zeilen-Logik von `useLuxSprechzeile`
// zu zwingen, die für strikt lineare, tap-/sprechende-getriebene Abfolgen gebaut ist, nicht
// für parallel dazu laufende Mehrfach-Animationen.

import { useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Defs, Image as SvgBild, Mask, RadialGradient, Rect, Stop } from "react-native-svg";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { Funkeln } from "../components/Funkeln";
import { LuxHeroIcon, LuxAtem, LuxEckIcon, LUX_HERO_ASPECT_RATIO } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { sprich, sprichtGerade } from "../lib/luxStimme";
import { LuxSprechblase } from "../components/LuxSprechblase";
import {
  LeeresBrettMitAllenTieren,
  TIERE,
  berechneBrettMasse,
} from "../components/LeeresBrettMitAllenTieren";
import { WEGMARKEN, MAP_ASPECT } from "../components/LuchsRevierKarte";
// Die Wegmarken-Tiere kommen seit dem 2026-09-14 aus der Zustandsfamilie statt aus einem
// Standbild-Feld `bild` (siehe lib/questTiere.tsx und `Wegmarke` in LuchsRevierKarte.tsx).
import { QuestTierWegmarke } from "../lib/questTiere";
import { setWillkommenGesehen } from "../lib/storage";

const hintergrundKarte = require("../../assets/hintergrund/luchsrevier_wisentfeste.webp");
// Dasselbe Nebel-Höhenband-Asset wie in LuchsRevierKarte.tsx/dev/WillkommensFlugProbe.tsx
// (siehe dortige Kommentare zu Herkunft/Kalibrierung) — hier erneut per require()
// eingebunden statt exportiert, da reines Bild-Asset ohne Koordinatenbezug (kein
// Drift-Risiko wie bei Positionswerten).
const nebelBand = require("../../assets/hintergrund/luchsrevier_nebel_band.webp");
// Exakt derselbe Grauton wie NEBEL_KLARUNG_NAECHSTES in LuchsRevierKarte.tsx — siehe
// dortiger Kommentar.
const NEBEL_KLARUNG_NAECHSTES = "#8A8A8A";
// Exakt derselbe Wert wie GESPERRT_OPACITY in LuchsRevierKarte.tsx.
const NEBEL_GEDIMMT = 0.55;
// Derselbe Android-Fix wie in lib/pieceMasters.tsx/dev/WillkommensFlugProbe.tsx.
const ANDROID_FIX_PROPS = Platform.OS === "android" ? { fadeDuration: 0 } : {};

// Beat 2 — siehe Datei-Kopfkommentar: EINE Begrüßungszeile, kein zusätzliches
// "Hallo, ich bin Lux." mehr (Konzept Abschnitt 1/2, Doppler-Vermeidung). Zweiter Satz
// fordert zum Antippen VON LUX SELBST auf (Konzept Abschnitt 2, Beat 2).
const BEGRUESSUNG_ZEILE = "Willkommen im Wald von ChessLynx! Tipp auf mich, dann zeig ich dir meinen Wald!";

// Beat 3 — 1:1 der bisherige Inhalt von Quest1.tsx SCREEN_SCRIPTS[0], nur ohne dessen
// erste Zeile ("Willkommen im Wald von ChessLynx!", jetzt bereits in Beat 2 gesagt) und mit
// einer neuen letzten Zeile, die den Übergang zu Beat 4 ("Verstecken") ankündigt (Konzept
// Abschnitt 2, Beat 4: "ein bis zwei neue, kurze Sprechzeilen").
const VORSTELLUNG_ZEILEN = [
  "Hier siehst du das Spielbrett und alle seine Bewohner.",
  "Jeder hat seinen eigenen Platz darauf.",
  "Das ist der Igel.",
  "Das ist der Bär.",
  "Das ist die Eule.",
  "Das ist das Pferd.",
  "Das ist der Schwan.",
  "Das ist der Hirsch.",
  "Und jetzt verstecken sie sich im Wald …",
];

// Ziel-Ecken für Beat 4 "Verstecken", Richtung Waldkulisse — 1:1 aus
// dev/WillkommensFlugProbe.tsx übernommen (dort vom Nutzer bestätigt: "Flugrichtung
// überzeugend? Ja, toll!"), hier nur auf die echten Zwei-Reihen-Brettpositionen (TIERE aus
// LeeresBrettMitAllenTieren.tsx) statt auf die dortige Mock-Einzelreihe angewendet.
const VERSTECK_ZIEL_FX = [0.08, 0.9, 0.14, 0.84, 0.2, 0.78];
const VERSTECK_ZIEL_FY = 0.06;
// Startpunkte für Beat 6 "Landen": senkrecht über der jeweiligen echten Zielposition — die
// Figuren "fallen" aus dem Nebel herab, 1:1 aus dev/WillkommensFlugProbe.tsx übernommen.
const LANDE_START_FY_OFFSET = -0.16;

type Phase = "begruessung" | "vorstellung" | "verstecken" | "kartenLeer" | "landen";
type FunkelBurst = { id: number; x: number; y: number; size: number };

export function WillkommensSequenz({ navigation }: any) {
  const { height: bildschirmHoehe } = useWindowDimensions();
  // Exakt dieselbe Formel wie zuvor in Onboarding.tsx (siehe dortiger Kommentar) — Lux darf
  // in Beat 2 höchstens ~42% der Bildschirmhöhe einnehmen, zwischen 150 und 220px gedeckelt.
  const luxHeroBreite = Math.max(150, Math.min(220, Math.floor((bildschirmHoehe * 0.42) / LUX_HERO_ASPECT_RATIO)));

  const [phase, setPhase] = useState<Phase>("begruessung");
  const [lineIndex, setLineIndex] = useState(0);
  const [zeigeFunkelnBeiLux, setZeigeFunkelnBeiLux] = useState(false);
  // Manuell verwaltete Sprechblasen-Anzeige für die Beats 4-6 (siehe Datei-Kopfkommentar,
  // letzter Absatz) — `captionSchluessel` sorgt dafür, dass LuxSprechblase ihre
  // Pop-in-Animation bei jeder NEUEN manuellen Zeile erneut abspielt, exakt wie der
  // zeilenSchluessel-Mechanismus in Quest1.tsx/allen Quest-Screens.
  const [caption, setCaption] = useState("");
  const [captionSchluessel, setCaptionSchluessel] = useState(0);
  const [bursts, setBursts] = useState<FunkelBurst[]>([]);
  const burstIdRef = useRef(0);
  const zeigeUntertitel = useUntertitelAktiv();

  const [buehneBreite, setBuehneBreite] = useState(0);
  const [buehneHoehe, setBuehneHoehe] = useState(0);
  const onBuehneLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - buehneBreite) > 0.5) setBuehneBreite(width);
    if (Math.abs(height - buehneHoehe) > 0.5) setBuehneHoehe(height);
  };
  const kartenHoehe = buehneBreite * MAP_ASPECT;
  // Update (2026-09-09, siehe berechneBrettMasse-Export-Kommentar in
  // LeeresBrettMitAllenTieren.tsx): dieselbe Formel wie das echte, in Beat 3 gezeigte
  // Brett — garantiert, dass Beat 4 exakt an denselben Feld-Koordinaten startet, an denen
  // Beat 3 die Tiere zuletzt zeigte (kein sichtbarer "Sprung" beim Phasenwechsel).
  const { cellSize: brettZellgroesse, brettSeite, tierGroesse: brettTierGroesse } = berechneBrettMasse(
    buehneBreite || 1
  );
  const brettLeft = (buehneBreite - brettSeite) / 2;
  const brettTop = (buehneHoehe - brettSeite) / 2;

  const versteckWerte = useRef(TIERE.map(() => new Animated.Value(0))).current;
  const landeWerte = useRef(WEGMARKEN.map(() => new Animated.Value(0))).current;
  const nebelRueckfallWerte = useRef(WEGMARKEN.map(() => new Animated.Value(0))).current;
  // 0 = Wald-Szene (Begrüßung/Vorstellung/Verstecken) sichtbar, 1 = Karten-Szene
  // (Karte-leer/Landen) sichtbar — dieselbe Überblendungstechnik wie in
  // dev/WillkommensFlugProbe.tsx.
  const szenenUeberblendung = useRef(new Animated.Value(0)).current;
  const nebelGesamtdeckung = useRef(new Animated.Value(0)).current;

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

  // Spricht `zeile` sofort (siehe Datei-Kopfkommentar) UND zeigt sie als Untertitel an,
  // mit neuem captionSchluessel für die Sprechblasen-Pop-in-Animation. `onFertig`
  // (optional) reicht direkt an sprich()/expo-speech durch — Nutzer-Feedback 2026-09-09
  // ("abruptes Sprechende nach 'der Igel wartet schon...'"): starteLanden() braucht das,
  // um vor dem Verlassen des Screens wirklich auf das ECHTE Sprechende zu warten statt auf
  // eine geschätzte feste Wartezeit (siehe dortiger Kommentar).
  function spreche(zeile: string, onFertig?: () => void) {
    setCaption(zeile);
    setCaptionSchluessel((n) => n + 1);
    sprich(zeile, onFertig ? { onFertig } : undefined);
  }

  // Wie spreche(), wartet aber zusätzlich auf das ECHTE Sprechende statt sofort
  // weiterzumachen — mit Sicherheitsnetz (`timeoutMs`), damit die Sequenz nie unbegrenzt
  // hängen bleibt. Siehe starteLanden() für die Verwendung.
  //
  // Gerätetest 2026-09-13 (Nutzer: "Die Texte wirken weiterhin abgehackt"): Bisher hing das
  // Weiterschalten allein an expo-speechs `onDone`. Etliche Android-TTS-Engines melden das
  // aber VIEL zu früh (siehe ausführlich in lib/luxStimme.ts bei `sprichtGerade`), und weil
  // der jeweils nächste `sprich()`-Aufruf mit `Speech.stop()` beginnt, schnitt das
  // verfrühte Weiterschalten den laufenden Satz mitten im Wort ab — genau der hörbare
  // Effekt. Jetzt wird stattdessen die Engine selbst gefragt: Fertig ist eine Zeile, wenn
  // die Engine erst "spricht" und danach "spricht nicht mehr" gemeldet hat. `onDone` zählt
  // nur noch als Hinweis für den Fall, dass eine Plattform gar keine Auskunft gibt (etwa
  // manche Web-Umgebungen) — dort bleibt es beim bisherigen Verhalten.
  //
  // Bewusst dieselbe Logik wie in lib/useLuxSprechzeile.ts, aber nicht geteilt: Dieser
  // Screen steuert seine Sprechkette manuell (siehe Datei-Kopfkommentar), der Hook dagegen
  // pro Zeilenschlüssel mit eigener Generationszählung. Eine gemeinsame Abstraktion müsste
  // beides abdecken und wäre schwerer zu lesen als diese knappe Fassung.
  const PRUEF_TAKT_MS = 200;
  const START_GEDULD_MS = 3000;
  function sprecheUndWarte(zeile: string, timeoutMs = 8000): Promise<void> {
    return new Promise<void>((resolve) => {
      let erledigt = false;
      let hatGesprochen = false;
      let onDoneGemeldet = false;
      const start = Date.now();
      const fertig = () => {
        if (erledigt) return;
        erledigt = true;
        clearInterval(takt);
        clearTimeout(netz);
        resolve();
      };
      const netz = setTimeout(fertig, timeoutMs);
      const takt = setInterval(() => {
        if (erledigt) return;
        sprichtGerade().then((spricht) => {
          if (erledigt) return;
          if (spricht) {
            hatGesprochen = true;
            return;
          }
          // Engine hat gesprochen und ist jetzt still — das ist das echte Ende.
          if (hatGesprochen) return fertig();
          // Engine meldet gar nichts: Erst nach der Geduldsfrist (die Stimme braucht beim
          // ersten Satz spürbar Anlauf) auf `onDone` zurückfallen.
          if (onDoneGemeldet && Date.now() - start >= START_GEDULD_MS) fertig();
        });
      }, PRUEF_TAKT_MS);
      spreche(zeile, () => {
        onDoneGemeldet = true;
      });
    });
  }

  const isVorstellungLastLine = lineIndex === VORSTELLUNG_ZEILEN.length - 1;
  // Siehe LeeresBrettMitAllenTieren.tsx-Kommentar zu sichtbarBisIndex: die ersten beiden
  // Vorstellungszeilen zeigen noch kein Tier, ab Zeile 2 ("Das ist der Igel.") kommt mit
  // jeder Zeile genau eines dazu, ab Zeile 7 ("Das ist der Hirsch.") stehen alle sechs.
  const sichtbarBisIndex = lineIndex < 2 ? 0 : Math.min(lineIndex - 1, TIERE.length);
  const tierIndexFuerZeile = lineIndex >= 2 && lineIndex <= 7 ? lineIndex - 2 : undefined;

  const sprechSchluessel = phase === "begruessung" ? "begruessung" : `vorstellung-${lineIndex}`;
  const { wiederholen } = useLuxSprechzeile(
    sprechSchluessel,
    phase === "begruessung" ? BEGRUESSUNG_ZEILE : phase === "vorstellung" ? VORSTELLUNG_ZEILEN[lineIndex] : undefined,
    phase === "vorstellung"
      ? isVorstellungLastLine
        ? () => starteVerstecken()
        : () => setLineIndex((i) => i + 1)
      : undefined,
    // Bewusst immer `false`: für "begruessung" (einmalige Begrüßung, kein Auto-Weiter) aus
    // demselben Grund wie zuvor in Onboarding.tsx; für "vorstellung" ist ein `onFertig`
    // gesetzt, wodurch der Erinnerungs-Zweig im Hook ohnehin nie erreicht wird (siehe
    // useLuxSprechzeile.ts).
    { erinnerung: false }
  );

  function handleLuxTap() {
    // Kurzer Funkeln-Ausbruch, dann weiter zu Beat 3 — dasselbe Muster wie zuvor in
    // Onboarding.tsx (dort: Übergang zu KidHome).
    setZeigeFunkelnBeiLux(true);
    setTimeout(() => {
      setPhase("vorstellung");
      setLineIndex(0);
    }, 260);
  }

  function handleLuxCornerTap() {
    if (phase === "vorstellung") {
      wiederholen();
    } else if (caption) {
      sprich(caption);
    }
  }

  // Beat 4 "Verstecken" — wird von useLuxSprechzeile aufgerufen, sobald die letzte
  // Vorstellungszeile ("Und jetzt verstecken sie sich im Wald …") natürlich zu Ende
  // gesprochen ist (kein erneutes sprich() hier nötig, die Zeile wurde bereits gesprochen).
  async function starteVerstecken() {
    // Bleibt als Sprechblasen-Text sichtbar, bis die Flucht beginnt (siehe unten) — ohne
    // erneutes sprich(), nur die Anzeige wandert von der zeilenbasierten Vorstellungs-
    // Sprechblase in die manuell verwaltete Caption über.
    setCaption(VORSTELLUNG_ZEILEN[VORSTELLUNG_ZEILEN.length - 1]);
    setPhase("verstecken");
    if (buehneBreite === 0 || buehneHoehe === 0) return;
    const STAGGER = 340;
    await Promise.all(
      TIERE.map(({ reihe, spalte }, i) => {
        const startX = brettLeft + spalte * brettZellgroesse + brettZellgroesse / 2;
        const startY = brettTop + reihe * brettZellgroesse + brettZellgroesse / 2;
        return new Promise<void>((resolve) => {
          setTimeout(() => addBurst(startX, startY, brettZellgroesse * 1.4), i * STAGGER);
          timing(versteckWerte[i], 1, 620, i * STAGGER, Easing.in(Easing.cubic)).then(resolve);
        });
      })
    );
    setCaption("");
    await timing(szenenUeberblendung, 1, 700, 250, Easing.inOut(Easing.ease));
    setPhase("kartenLeer");
    // Gerätetest 2026-09-11 ("längere Pausen einplanen"): 550 → 900 ms Ruhe vor dem Landen.
    setTimeout(() => starteLanden(), 900);
  }

  // Beat 6 "Landen" — 1:1 die vom Nutzer bestätigte Choreografie aus
  // dev/WillkommensFlugProbe.tsx (siehe dortiger Kommentar zur Korrekturrunde: nur der
  // Igel landet klar, die anderen fünf fallen in die Nebel-Deckkraft zurück, danach hüllt
  // sich die GANZE Karte in das echte Nebel-Höhenband).
  async function starteLanden() {
    setPhase("landen");
    landeWerte.forEach((v) => v.setValue(0));
    nebelRueckfallWerte.forEach((v) => v.setValue(0));
    nebelGesamtdeckung.setValue(0);
    // Nutzerfeedback 2026-09-09 ("generell Bindestriche entfernen"): derselbe, hier schon
    // einmal für "Der Igel wartet schon ..." weiter unten behobene Fund (Gedankenstriche
    // erzeugen bei der Geräte-TTS keine hörbare Pause) galt bisher übersehen auch für diese
    // Begrüßungszeile — jetzt ebenfalls zwei eigene Sprechzeilen mit echter Pause. Bewusst
    // NICHT über sprecheUndWarte() (das würde den nachfolgenden `await Promise.all(...)` der
    // Lande-Animation verzögern) — beide spreche()-Aufrufe bleiben wie bisher nebenläufig
    // dazu, nur mit einer kurzen Verzögerung zwischen den beiden Sätzen.
    // Gerätetest 2026-09-11 (Nutzer-Feedback: "Luchs sagt die ersten 2 Textzeilen nach dem
    // Verstecken im Wald nicht"): die zweite Zeile wurde bisher nach festen 400 ms
    // gesprochen — sprich() stoppt vorher jede laufende Ausgabe, damit schnitt sie die erste
    // Zeile ab; im Browser (Web-Speech) gehen zwei so schnell aufeinanderfolgende
    // Abbruch-/Start-Aufrufe zudem oft ganz verloren. Jetzt als Kette, die jeweils das echte
    // Sprechende abwartet; die Lande-Animation läuft unverändert parallel, und die
    // Schlusszeilen unten warten auf das Ende dieser Kette.
    const begruessungFertig = (async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
      await sprecheUndWarte("Da seid ihr ja wieder!", 5000);
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      await sprecheUndWarte("Willkommen in eurem Revier!", 5000);
    })();
    const breite = buehneBreite;
    const hoehe = kartenHoehe;
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
    // Nutzer-Feedback 2026-09-09 ("Die letzten Sprachausgaben von Luchs, wenn die Figuren
    // landen, sind etwas zu schnell"): bisher folgte die zweite Sprechzeile ohne jede Pause
    // auf das Einrasten der letzten Wegmarke — das Kind sah/hörte den kleinen "Bums" der
    // letzten Landung und Lux fing im selben Moment schon den nächsten Satz an, ohne dass
    // die vorherige Zeile ("Da seid ihr ja wieder ...") erkennbar zu Ende war. Kurze,
    // bewusste Atempause (450ms, dasselbe Prinzip wie der 950ms-Abstand vor onSolved() in
    // QuestMoveScreen.tsx/beendeAufgabe) gibt beiden Zeilen Raum, statt direkt ineinander
    // überzugehen.
    await begruessungFertig;
    // Gerätetest 2026-09-11 ("längere Pausen einplanen"): 450 → 800 ms.
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    // Folge-Feedback 2026-09-09 ("abruptes Sprechende nach 'der Igel wartet schon...'"):
    // diese letzte Zeile wurde bisher NICHT abgewartet — direkt danach lief die
    // Nebel-Animation (900ms+300ms) und eine feste 1500ms-Pause, macht zusammen ~2,7s, was
    // für den ganzen Satz je nach Gerät/TTS-Tempo zu knapp war. navigation.replace() am Ende
    // räumt den Screen ab, während Lux mitten im letzten Wort war. Jetzt wird auf das ECHTE
    // Sprechende gewartet (expo-speechs onDone via sprecheUndWarte()) statt auf eine
    // geschätzte feste Zeit.
    //
    // Zweiter Folge-Feedback 2026-09-09 ("auf geht's folgt ohne jegliche Pause"): der
    // Gedankenstrich in "Der Igel wartet schon auf dem Weg — auf geht's!" erzeugte bei der
    // Geräte-TTS keine hörbare Pause — expo-speech/die jeweilige System-Engine liest über
    // Gedankenstriche oft einfach hinweg. Jetzt als zwei eigene Sprechzeilen mit einer
    // echten, bewussten Pause dazwischen (gleiches Prinzip wie die 450ms oben).
    await sprecheUndWarte("Der Igel wartet schon auf dem Weg.");
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    await sprecheUndWarte("Auf geht's!");
    // Erst NACHDEM alle sechs gelandet sind, hüllt sich die GANZE Karte in Nebel (siehe
    // Datei-Kopfkommentar/dev/WillkommensFlugProbe.tsx-Korrekturrunde) — nicht während des
    // Landens selbst, damit erst sichtbar wird, WER wo steht, bevor der Nebel darüberzieht.
    await timing(nebelGesamtdeckung, 1, 900, 300, Easing.inOut(Easing.ease));
    // Kurze Pause, damit das Kind den pulsierenden/klaren Igel noch einen Moment sehen
    // kann, bevor die echte KidHome-Karte (mit demselben Endzustand) übernimmt.
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    await setWillkommenGesehen();
    // Sprach-Harmonie-Review (2026-09-09): KidHome bekommt jetzt eine eigene, kurze
    // Begrüßungszeile beim Betreten (siehe RootNavigator.tsx-Kommentar bei KidHome) — der
    // Parameter hier sagt KidHome, dass diese ausführliche Willkommens-Sequenz gerade erst
    // zu Ende gesprochen hat ("Auf geht's!"), damit KidHome seine eigene Begrüßung genau
    // dieses eine Mal auslässt statt Lux doppelt reden zu lassen.
    navigation.replace("KidHome", { vonWillkommen: true });
  }

  const angezeigterText = phase === "vorstellung" ? VORSTELLUNG_ZEILEN[lineIndex] : caption;
  const bubbleSchluessel = phase === "vorstellung" ? sprechSchluessel : `caption-${captionSchluessel}`;

  return (
    <SafeAreaView style={styles.safe} collapsable={false}>
      {/* Bugfix (Nutzer-Feedback 2026-09-09, Android: "Lux sitzt vor einem weißen Bildschirm
          und viel zu weit oben, wird abgeschnitten ... beim Spielbrett auch"): exakt der
          bekannte, bereits mehrfach dokumentierte Android-Fallstrick aus WaldHintergrund.tsx/
          LuchsRevierKarte.tsx — eine einfache View ohne Touch-Handler UND ohne
          `collapsable={false}` kann vom Android-View-Flattening wegoptimiert werden. Diese
          Bühne hier maß bisher zwar korrekt per `onLayout` (JS-seitig unverändert richtig),
          war aber selbst so eine "einfache" View — genau wie in LuchsRevierKarte.tsx
          ("collapsable={false} auf dem messenden Außen-Wrapper") jetzt nachgerüstet. Ohne das
          verlieren auf Android auch die FLEX-zentrierten Kinder weiter unten
          (begruessungWrap/boardWrap) beim Wegoptimieren ihrer eigenen Eltern-View ihre
          Zentrierung und rutschen an den oberen Bildschirmrand — exakt das gemeldete Bild.
          Update (Nutzer-Retest 2026-09-09): Bild blieb trotz collapsable={false} auf buehne/
          begruessungWrap/boardWrap bestehen — nur bei "einfliegen der Figuren" (Beat 6,
          Karten-Szene) war es weg. Der noch fehlende Baustein war die äußere SafeAreaView
          selbst (jetzt hier ebenfalls `collapsable={false}`) sowie die beiden
          Animated.View-Überblend-Wrapper direkt darunter (siehe deren eigene Kommentare) —
          auch DIE sind auf Android ganz normale, wegoptimierbare Views, solange sie nur eine
          Opacity-Prop tragen. */}
      <View style={styles.buehne} onLayout={onBuehneLayout} collapsable={false}>
        {buehneBreite > 0 && buehneHoehe > 0 && (
          <>
            {/* Wald-Szene: Begrüßung (Beat 2), Vorstellung (Beat 3), Verstecken (Beat 4) */}
            {/* Bugfix, dritte Runde (Nutzer-Diagnose-Screenshots 2026-09-09, mit den
                temporären Debug-Farben): die rote Bühne füllte auf Android nachweislich den
                ganzen Bildschirm, aber vom grünen Wald-Szene-Wrapper (und den blau/gelben
                Zentrierungs-Boxen darin) war NICHTS zu sehen außer direkt um Lux/das Brett
                herum — dieser Wrapper bekam also selbst nie die volle Bühnenhöhe, wodurch
                auch `flex:1` in begruessungWrap/boardWrap ins Leere lief (ein Flex-Kind ohne
                Größenvorgabe vom Elternteil fällt auf seine reine Inhaltsgröße zurück).
                Bisherige Theorie (Android-View-Flattening, siehe ältere Kommentare/
                mehrere `collapsable={false}`-Runden) hat das NICHT behoben. Tatsächliche
                Ursache: `StyleSheet.absoluteFill` (position:absolute + inset 0 auf
                allen vier Seiten) verlässt sich darauf, dass Android die Höhe aus den
                Inset-Werten relativ zum Elternteil selbst herleitet — bei einem erst NACH
                dem ersten Layout der Bühne neu eingehängten absolut positionierten Kind
                geschah das auf diesem Gerät nicht zuverlässig. Fix: statt der Inset-Technik
                jetzt feste, bereits per `onLayout` gemessene Pixelmaße (`buehneBreite`/
                `buehneHoehe`) direkt als `width`/`height` — eindeutig, keine Herleitung
                nötig. Gating entsprechend um `buehneHoehe > 0` ergänzt. */}
            <Animated.View
              collapsable={false}
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: buehneBreite,
                  height: buehneHoehe,
                },
                { opacity: szenenUeberblendung.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
              ]}
            >
              {/* Bugfix: die zuvor hier zusätzlich verpackende, rein layoutlose View
                  (`<View style={StyleSheet.absoluteFill}>`) war genau eine weitere
                  wegoptimierbare Ebene ohne eigenen Zweck — WaldHintergrund bringt seinen
                  eigenen, bereits `collapsable={false}` gesicherten Vollflächen-Wrapper
                  mit (siehe dortige Datei), die zusätzliche Hülle hier war überflüssig und
                  ist ersatzlos entfernt. */}
              {/* Gerätetest 2026-09-13 (Nutzer: "alter Hintergrund in Szene 0"): stand hier
                  bis dahin als `baender`-Fassung, die als einzige Aufrufstelle der App noch
                  `waldkulisse_oben_q1/unten_q1.webp` zog — zwei Bänder, geschnitten aus dem
                  ALTEN, helleren Karten-Master, während die Quests seit demselben Tag die
                  neu aus `luchsrevier_wisentfeste.webp` erzeugten `questkulisse_q*.webp`
                  zeigen. Ergebnis: die Begrüßungsszene fiel sichtbar aus der Reihe (helle
                  Brücke, breiter Fluss, anderer Farbraum).
                  Behoben ohne neue Assets, indem hier dieselbe Vollflächen-Kulisse wie in
                  Quest 1 verwendet wird (`baender` entfällt): Die Willkommenssequenz führt
                  ohnehin unmittelbar auf Quest 1 hin, der Übergang dorthin wird dadurch
                  nahtlos statt zu einem Stilbruch. Die Band-Geometrie hatte hier keinen
                  eigenen Zweck — sie stammt aus der Zeit, als die Kulissen nur als
                  querformatige Ausschnitte vorlagen und ein Hochkant-Bildschirm aus zwei
                  überlappenden Bändern gefüllt werden musste; `questkulisse_q1.webp` ist
                  bereits hochkant (1024x2150) genau dafür erzeugt. Die Flugziele von Beat 4
                  (VERSTECK_ZIEL_FX/FY) sind reine Bildschirmanteile und damit vom
                  Hintergrundbild unabhängig. */}
              <WaldHintergrund variante={1} />

              {phase === "begruessung" && (
                <View style={styles.begruessungWrap} collapsable={false}>
                  <Pressable
                    onPress={handleLuxTap}
                    hitSlop={16}
                    accessibilityRole="button"
                    accessibilityLabel="Lux, tippen um loszulegen"
                  >
                    <LuxAtem>
                      <LuxHeroIcon width={luxHeroBreite} />
                    </LuxAtem>
                    {zeigeFunkelnBeiLux && <Funkeln size={luxHeroBreite * 0.8} />}
                  </Pressable>
                </View>
              )}

              {phase === "vorstellung" && (
                <View style={styles.boardWrap} collapsable={false}>
                  <LeeresBrettMitAllenTieren highlightIndex={tierIndexFuerZeile} sichtbarBisIndex={sichtbarBisIndex} />
                </View>
              )}

              {phase === "verstecken" && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none" collapsable={false}>
                  {TIERE.map(({ reihe, spalte, Icon }, i) => {
                    const startX = brettLeft + spalte * brettZellgroesse + brettZellgroesse / 2;
                    const startY = brettTop + reihe * brettZellgroesse + brettZellgroesse / 2;
                    const zielX = VERSTECK_ZIEL_FX[i] * buehneBreite;
                    const zielY = VERSTECK_ZIEL_FY * buehneHoehe;
                    const fortschritt = versteckWerte[i];
                    return (
                      <Animated.View
                        key={`versteck-${i}`}
                        style={{
                          position: "absolute",
                          left: startX - brettZellgroesse / 2,
                          top: startY - brettZellgroesse / 2,
                          width: brettZellgroesse,
                          height: brettZellgroesse,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: fortschritt.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1, 0] }),
                          transform: [
                            {
                              translateX: fortschritt.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, zielX - startX],
                              }),
                            },
                            {
                              translateY: fortschritt.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, zielY - startY],
                              }),
                            },
                            { scale: fortschritt.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.08, 0.35] }) },
                          ],
                        }}
                      >
                        <Icon size={brettTierGroesse} />
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </Animated.View>

            {/* Karten-Szene: Karte-leer (Beat 5), Landen (Beat 6) */}
            {/* Bugfix, dritte Runde (siehe ausführlicher Kommentar am Wald-Szene-Wrapper
                oben): dieselbe Umstellung von inset-basiertem `StyleSheet.absoluteFill`
                auf feste, gemessene Pixelmaße — dieser Wrapper zeigte den Bug zwar nicht
                (ImageBackground selbst setzt ohnehin explizite width/height, siehe unten),
                aber aus Konsistenz- und Robustheitsgründen hier ebenfalls umgestellt, statt
                sich weiter auf die inset-basierte Technik zu verlassen. */}
            <Animated.View
              pointerEvents="none"
              collapsable={false}
              style={[
                { position: "absolute", top: 0, left: 0, width: buehneBreite, height: buehneHoehe },
                { opacity: szenenUeberblendung },
              ]}
            >
              <ImageBackground
                source={hintergrundKarte}
                style={{ width: buehneBreite, height: kartenHoehe }}
                resizeMode="cover"
              >
                {phase === "landen" &&
                  WEGMARKEN.map((w, i) => {
                    const zielX = w.fx * buehneBreite;
                    const zielY = w.fy * kartenHoehe;
                    const startX = zielX;
                    const startY = (w.fy + LANDE_START_FY_OFFSET) * kartenHoehe;
                    const bildBreite = w.breiteFrac * buehneBreite;
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
                        <Animated.View
                          {...ANDROID_FIX_PROPS}
                          style={{
                            width: bildBreite,
                            height: bildHoehe,
                            // Wie in LuchsRevierKarte.tsx (styles.wegmarke): Das Tier steht am
                            // unteren Rand seiner Box, damit die Füße auf dem Weg aufsetzen.
                            alignItems: "center",
                            justifyContent: "flex-end",
                            opacity: nebelRueckfall.interpolate({ inputRange: [0, 1], outputRange: [1, NEBEL_GEDIMMT] }),
                          }}
                        >
                          <QuestTierWegmarke quest={w.quest} breite={bildBreite} blinzeln={false} />
                        </Animated.View>
                      </Animated.View>
                    );
                  })}

                {/* Die GANZE Karte hüllt sich in Nebel, NACHDEM alle sechs gelandet sind —
                    dieselbe SVG-Masken-/Lichtungs-Technik wie LuchsRevierKarte.tsx, mit
                    GENAU einer weichen Lichtung um den Igel, siehe Datei-Kopfkommentar. */}
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { opacity: nebelGesamtdeckung }]}
                >
                  <Svg width={buehneBreite} height={kartenHoehe} style={StyleSheet.absoluteFill}>
                    <Defs>
                      <RadialGradient id="klarungIgelWillkommen" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={NEBEL_KLARUNG_NAECHSTES} stopOpacity={1} />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
                      </RadialGradient>
                      <Mask id="nebelMaskeWillkommen" maskUnits="userSpaceOnUse" x={0} y={0} width={buehneBreite} height={kartenHoehe}>
                        <Rect x={0} y={0} width={buehneBreite} height={kartenHoehe} fill="#FFFFFF" />
                        <Circle
                          cx={WEGMARKEN[0].fx * buehneBreite}
                          cy={WEGMARKEN[0].fy * kartenHoehe}
                          r={0.17 * buehneBreite * 0.85}
                          fill="url(#klarungIgelWillkommen)"
                        />
                      </Mask>
                    </Defs>
                    <SvgBild
                      href={nebelBand}
                      x={0}
                      y={0}
                      width={buehneBreite}
                      height={kartenHoehe}
                      preserveAspectRatio="xMidYMid slice"
                      mask="url(#nebelMaskeWillkommen)"
                    />
                  </Svg>
                </Animated.View>
              </ImageBackground>
            </Animated.View>

            {/* Funkeln-Ausbrüche (Verstecken + Landen), siehe Handwerksvorschlag 2 im
                Konzept — liegen bewusst über beiden Szenen-Ebenen. */}
            {bursts.map((b) => (
              <View key={b.id} style={{ position: "absolute", left: b.x - b.size / 2, top: b.y - b.size / 2 }} pointerEvents="none">
                <Funkeln size={b.size} />
              </View>
            ))}
          </>
        )}
      </View>

      {/* Kleines Lux-Ecken-Icon + Sprechblase, wie auf allen Quest-Screens — bewusst NICHT
          während "begruessung" (dort ist Lux selbst schon groß mittig sichtbar und
          antippbar, ein zusätzliches Ecken-Icon wäre doppelt gemoppelt, exakt wie zuvor
          Onboarding.tsx keines hatte). */}
      {phase !== "begruessung" && (
        <Pressable
          style={styles.luxCorner}
          onPress={handleLuxCornerTap}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel="Lux, tippen zum Wiederholen"
        >
          <LuxEckIcon size={52} />
        </Pressable>
      )}
      {zeigeUntertitel && phase !== "begruessung" && angezeigterText.length > 0 && (
        <LuxSprechblase text={angezeigterText} zeilenSchluessel={bubbleSchluessel} style={styles.sprechblase} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4" },
  buehne: { flex: 1 },
  begruessungWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  boardWrap: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  // Exakt dieselbe Platzierung wie luxCorner/sprechblase in Quest1.tsx (siehe dortiger
  // Kommentar zur Herleitung der Zahlen).
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  sprechblase: { position: "absolute", top: 20, left: 92, right: 16, maxHeight: 170, zIndex: 15 },
  schatten: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(10,10,5,0.32)" },
});
