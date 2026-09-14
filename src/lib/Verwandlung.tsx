// Update (2026-09-12): ECHTE Verwandlung statt reinem Schrumpfen. Bis hierher zeigte
// Screen 1 bereits die geschnitzte Schachfigur, die Animation machte sie nur kleiner —
// "aus dem Igel wird ein Bauer" war also nie zu sehen (siehe Kommentar von Schritt 6
// weiter unten). Jetzt bekommt die Komponente zusätzlich das LEBENDIGE Tier (`tier`,
// src/lib/questTiere.tsx) und blendet in der Mitte der Sequenz zur Figur um:
//   Lichtschein → Anticipation → greller Lichtblitz, unter dem das Bild getauscht wird →
//   Schrumpfen mit Federn und kleiner Landung → Funkeln → Ausklang.
// Der Tausch passiert im hellsten Moment des Blitzes, damit kein hartes Umschalten zu
// sehen ist. Ohne `tier` verhält sich die Komponente exakt wie vorher (rückwärts-
// kompatibel für Aufrufstellen ohne lebendiges Tier).
//
// Der "Verwandlungsmoment": beim Übergang von der Tier-Vorstellung (Screen 1, "Das ist
// ein/eine …") zur Bewegungs-Aufgabe (Screen 2) verwandelt sich das Waldtier sichtbar,
// dauerhaft und unumkehrbar in die echte Schachfigur — siehe projektwissen.md, Abschnitt
// "Tier-Zuordnung und Verwandlungsmoment": "Kein Tier-/Figuren-Umschalter danach." Ab
// hier zeigt das Spielbrett in jeder Quest nur noch die echte Figur, das Tier taucht in
// derselben Quest nicht mehr auf.
//
// Rein automatisch ablaufende Überblendung, keine Kind-Interaktion nötig — bewusst kein
// Countdown/Zeitdruck-Element (Design-Grundsatz 1), die Animation läuft einmal ab und
// ruft danach `onDone` auf, das den nächsten Screen zeigt.
//
// Update (2026-09-10, Kurztest-Feedback: "Die Einführung in die Quests, mit Animation,
// sollte nicht durch Klick zu unterbrechen sein"): die Animation war bisher komplett in
// einen Pressable gehüllt (eine `ueberspringen()`-Funktion stoppte die Sequenz und rief
// sofort `onDone()` auf), ursprünglich als bewusste Opus-Review-Entscheidung vom
// 2026-09-07 ("Wiederholbarkeit statt Zeitdruck ... antippbar überspringbar"). Genau
// dieses Antippbar-Sein führte jetzt dazu, dass ein einzelner, auch unabsichtlicher Tipp
// des Kindes den eigentlichen Verwandlungsmoment abschnitt, bevor er zu sehen war — das
// widerspricht dem eigentlichen Zweck dieser Animation (siehe oben: "GRÖSSEN-Verwandlung
// ... exakt dieselbe Grafik"). Pressable und die Skip-Funktion sind deshalb ersatzlos
// entfernt — die Animation läuft jetzt immer vollständig durch.

//
// Update (Schritt 6 der Grundgerüst-Integrationsplan-Liste, priorisierter_
// umsetzungsplan.md, 2026-09-07): komplett neu gedacht, siehe Rückfrage im Claude-Projekt
// "ChessLynx". Der Verwandlungsmoment ist jetzt NICHT mehr eine Überblendung zwischen zwei
// unterschiedlich aussehenden Bildern (Tier-SVG → Cburnett-Figur-SVG), sondern eine
// GRÖSSEN-Verwandlung derselben neuen Master-Illustration: "Das Tier, das Lux im Wald
// kennengelernt hat" (groß, Screen 1) wird sichtbar kleiner und wird dadurch zur
// Spielfigur auf dem Schachbrett — exakt dieselbe Grafik, nur in der Größe, in der sie
// gleich auf dem Brett erscheint (siehe `kleinGroesse`, standardmäßig identisch zur
// `pieceIcon`-Standardgröße in pieceMasters.tsx). Dahinter steckt fachlich: der Nutzer
// nutzt weiterhin dieselbe Master-Datei-Familie, nur zwei Export-Auflösungen ("groß" für
// Saga-Karte/Vorstellung, "klein" fürs Spielbrett) — siehe pieceMasters.tsx-Kommentar zur
// Auflösungs-Recherche. Effekt-Aufbau (bewusst mehrschichtig für einen "ausgereiften"
// Eindruck statt eines einzelnen linearen Scale-Tweens):
//   1. Ankündigung — warmes Licht (glow) blendet auf und wächst leicht.
//   2. Anticipation — die Figur "holt Luft" (minimaler Scale-Overshoot nach oben), ein
//      klassisches Animationsprinzip, bevor die eigentliche Bewegung (hier: Schrumpfen)
//      einsetzt.
//   3. Schrumpfen — die Figur federt (Animated.spring) von groß auf klein, dabei ein
//      kurzes, leichtes Wackeln (Rotation ±6°) für einen verspielten statt mechanischen
//      Eindruck, während ein dünner Goldring als "Magie-Puls" nach außen wächst und
//      verblasst und der Lichtschein synchron mitschrumpft.
//   4. Funkeln — im Moment, in dem die Figur einrastet, ein kurzer Funkeln-Ausbruch
//      (components/Funkeln.tsx).
//   5. Ausklang — der Lichtschein verblasst, danach `onDone()`.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Funkeln } from "../components/Funkeln";

// Update (2026-09-14, Nutzer nach dem Web-Test: "die Verwandlung wird abgebrochen, nach
// 'now watch closely' wird schon übergeblendet. Diesen Moment sollten wir nicht abbrechen
// und er sollte wirklich schön sein"). Zwei getrennte Ursachen, beide hier behoben:
//
//  1. DIE SEQUENZ WUSSTE NICHTS VON LUX' STIMME. Sie lief los, sobald der Screen erschien,
//     und war nach ~1,9 s durch — `onDone()` schaltete weiter, und der Schlüsselwechsel rief
//     `stoppen()`, mitten in einem Satz, der (englisch) rund 3,5 s braucht. Die Ankündigung
//     lief also gleichzeitig mit dem Ereignis, das sie ankündigt, und wurde dann abgeschnitten.
//     → Neue Prop `starten`: Die Quest lässt die Sequenz erst los, wenn Lux seine Zeile zu
//     Ende gesprochen hat (siehe Quest1.tsx). Erst Ankündigung, dann Verwandlung.
//
//  2. DER MOMENT WAR ZU SCHNELL für das, was er erzählen soll. Die Zeiten unten sind
//     deshalb neu gesetzt — mit Ruhe vor dem Beginn, einem länger aufblühenden Licht, einem
//     kurz gehaltenen Atem, einem Blitz, der oben STEHENBLEIBT (vorher schaltete er ohne
//     Halten von Auf- auf Abblenden, und genau darunter wird das Bild getauscht), einer
//     weicher auslaufenden Feder und einem echten Nachklang, in dem die fertige Figur
//     einfach dasteht, bevor der Screen wechselt.
//
// Alle Zeiten stehen bewusst als benannte Konstanten beieinander, und die beiden
// Zeitpunkte darunter (Bildtausch, Funkeln) werden daraus BERECHNET. Vorher waren sie von
// Hand geschätzt ("≈ 900ms") — jede Änderung an der Sequenz ließ sie stillschweigend
// verrutschen, und ein verrutschter Tausch ist genau das sichtbare Umschalten, das der
// Blitz verbergen soll.
/** Atempause, bevor überhaupt etwas passiert — der Blick kommt beim Tier zur Ruhe. */
const RUHE_MS = 350;
/** Das warme Licht blüht auf: "gleich passiert etwas". */
const ANKUENDIGUNG_MS = 600;
/** Anticipation: das Tier holt Luft … */
const ATEM_MS = 260;
/** … und hält sie einen Moment. Ohne dieses Halten wirkt die Bewegung mechanisch. */
const ATEM_HALTEN_MS = 140;
const BLITZ_AUF_MS = 220;
/** Der Blitz steht auf voller Deckkraft still — darunter wird das Bild getauscht. */
const BLITZ_HALTEN_MS = 140;
const BLITZ_AB_MS = 320;
/** Richtwert für Ring und Lichtschein; die Schrumpf-Feder läuft parallel dazu aus. */
const SCHRUMPFEN_MS = 620;
/** Nachklang: die fertige Figur steht einfach da, das Funkeln klingt aus. */
const NACHKLANG_MS = 700;
/** Der Lichtschein verblasst, danach `onDone()`. */
const AUSKLANG_MS = 500;

export function Verwandlung({
  figur,
  tier,
  grossGroesse = 140,
  kleinGroesse = 34,
  starten = true,
  onDone,
}: {
  /** Die große Master-Illustration, bereits auf `grossGroesse` skaliert (z. B. <BauerMasterGrossIcon size={140} />). */
  figur: ReactNode;
  /**
   * Das lebendige Waldtier (z. B. <QuestTierIcon quest="quest1" size={150} />), ebenfalls
   * bereits auf `grossGroesse` skaliert. Wird zu Beginn gezeigt und im hellsten Moment des
   * Lichtblitzes gegen `figur` getauscht. Ohne diese Prop bleibt alles wie bisher.
   */
  tier?: ReactNode;
  /** Muss zur tatsächlichen Größe des `figur`-Elements passen — bestimmt die Boxgröße von Lichtschein/Ring. */
  grossGroesse?: number;
  /** Zielgröße nach der Verwandlung — standardmäßig identisch zur pieceIcon-Standardgröße auf dem Brett (34px, siehe Board.tsx/pieceMasters.tsx), damit die Figur exakt in der Größe einrastet, die sie im nächsten Screen ohnehin hat. */
  kleinGroesse?: number;
  /**
   * Erst wenn dies `true` wird, läuft die Sequenz los. Solange es `false` ist, steht das
   * Tier unverändert und unbeleuchtet da (2026-09-14, siehe Datei-Kommentar oben).
   *
   * Gedacht für genau einen Zweck: Die Quest übergibt hier, ob Lux seine Ankündigung
   * ("Und jetzt die Verwandlung: Aus dem Igel wird ein Bauer!") zu Ende gesprochen hat.
   * Vorher lief beides gleichzeitig, und der Satz wurde vom Screenwechsel abgeschnitten.
   *
   * Voreinstellung `true`, damit Aufrufstellen ohne Sprachausgabe unverändert
   * weiterfunktionieren.
   */
  starten?: boolean;
  onDone: () => void;
}) {
  const zielSkalierung = kleinGroesse / grossGroesse;

  const figurSkalierung = useRef(new Animated.Value(1)).current;
  const wackeln = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowSkalierung = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringSkalierung = useRef(new Animated.Value(0.6)).current;
  const blitzOpacity = useRef(new Animated.Value(0)).current;
  const landung = useRef(new Animated.Value(0)).current;
  const [zeigeFunkeln, setZeigeFunkeln] = useState(false);
  // Solange `tier` gesetzt ist, startet die Animation mit dem lebendigen Tier; der Wechsel
  // auf die Figur passiert unter dem Lichtblitz (siehe tauschAb im Effekt oben).
  const [zeigeFigur, setZeigeFigur] = useState(!tier);
  // Update (2026-09-10, siehe Datei-Kommentar oben): die frühere antippbare
  // "ueberspringen()"-Funktion (Opus-Review 2026-09-07, Abschnitt 3.3) ist entfallen —
  // `fertig` bleibt trotzdem als einfache Absicherung gegen einen doppelten
  // `onDone()`-Aufruf bestehen (z. B. falls die Sequenz-Callback-Logik künftig erweitert
  // wird).
  const fertig = useRef(false);

  useEffect(() => {
    // Solange die Quest nicht freigibt (= Lux spricht noch), passiert gar nichts: Das Tier
    // steht unverändert und unbeleuchtet da. Siehe Prop `starten` oben.
    if (!starten) return;

    // Die beiden Zeitpunkte aus denselben Konstanten gerechnet, aus denen auch die Sequenz
    // unten gebaut wird — damit sie nicht auseinanderlaufen können.
    const bisBlitz = RUHE_MS + ANKUENDIGUNG_MS + ATEM_MS + ATEM_HALTEN_MS;
    // Der Tausch liegt am ANFANG der Blitz-Haltephase: Der Blitz steht dann still auf voller
    // Deckkraft, das Bild darunter kann unmöglich durchscheinen.
    const tauschAb = bisBlitz + BLITZ_AUF_MS;
    const blitzGesamt = tier ? BLITZ_AUF_MS + BLITZ_HALTEN_MS + BLITZ_AB_MS : 0;
    // Das Funkeln setzt ein, kurz bevor die Feder ausgelaufen ist — dann ist die Figur
    // sichtbar eingerastet.
    const funkelnAb = bisBlitz + blitzGesamt + SCHRUMPFEN_MS * 0.8;

    const funkelnTimer = setTimeout(() => setZeigeFunkeln(true), funkelnAb);
    const tauschTimer = tier ? setTimeout(() => setZeigeFigur(true), tauschAb) : undefined;

    const sequenz = Animated.sequence([
      // 0. Ruhe: Der Screen ist gerade erschienen und Lux hat eben zu Ende gesprochen.
      // Ein Moment, in dem nichts passiert, macht aus dem Folgenden ein Ereignis.
      Animated.delay(RUHE_MS),
      // 1. Ankündigung: warmes Licht blüht auf
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: ANKUENDIGUNG_MS * 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(glowSkalierung, {
          toValue: 1.15,
          duration: ANKUENDIGUNG_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 2. Anticipation: das Tier holt Luft, bevor es schrumpft …
      Animated.timing(figurSkalierung, {
        toValue: 1.07,
        duration: ATEM_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // … und hält sie kurz. Ein Animationsprinzip, kein Geschmackswert: Ohne diesen
      // Stillstand geht die Aufwärtsbewegung ohne Zäsur in die Abwärtsbewegung über und
      // liest sich als ein einziger mechanischer Tween.
      Animated.delay(ATEM_HALTEN_MS),
      // 2b. Lichtblitz (nur mit lebendigem Tier): aufblenden, STEHENBLEIBEN, abblenden. Im
      // Stillstand wird das Bild getauscht (siehe tauschTimer oben), sodass der Wechsel
      // Tier → Figur nicht als hartes Umschalten, sondern als Verwandlung gelesen wird.
      ...(tier
        ? [
            Animated.timing(blitzOpacity, {
              toValue: 1,
              duration: BLITZ_AUF_MS,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(BLITZ_HALTEN_MS),
            Animated.timing(blitzOpacity, {
              toValue: 0,
              duration: BLITZ_AB_MS,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]
        : []),
      // 3. Schrumpfen: Feder-Bewegung + leichtes Wackeln + Lichtsaum + mitschrumpfender
      // Lichtschein. Die Feder läuft jetzt weicher aus (mehr Reibung, weniger Spannung) —
      // die Figur setzt sich, statt einzuschnappen.
      Animated.parallel([
        Animated.spring(figurSkalierung, {
          toValue: zielSkalierung,
          friction: 7,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(wackeln, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(wackeln, { toValue: -1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(wackeln, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
            Animated.timing(ringSkalierung, {
              toValue: 1.6,
              duration: SCHRUMPFEN_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ringOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
        Animated.timing(glowSkalierung, {
          toValue: 0.55,
          duration: SCHRUMPFEN_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        // Kleine Landung: die geschrumpfte Figur setzt am Ende sichtbar auf, statt in der
        // Luft stehen zu bleiben.
        Animated.spring(landung, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ]),
      // 4. Nachklang: Die fertige Figur steht einfach da, das Funkeln klingt aus. Das ist
      // der Moment, für den die ganze Sequenz da ist — vorher waren dafür 250 ms
      // vorgesehen, in denen niemand etwas ansehen kann.
      Animated.delay(NACHKLANG_MS),
      // 5. Ausklang
      Animated.timing(glowOpacity, { toValue: 0, duration: AUSKLANG_MS, useNativeDriver: true }),
    ]);

    sequenz.start(({ finished }) => {
      if (finished && !fertig.current) {
        fertig.current = true;
        onDone();
      }
    });
    return () => {
      sequenz.stop();
      clearTimeout(funkelnTimer);
      if (tauschTimer) clearTimeout(tauschTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starten]);

  const drehung = wackeln.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] });
  const absetzen = landung.interpolate({ inputRange: [0, 1], outputRange: [0, grossGroesse * 0.06] });
  // Alle drei Lichtebenen sind gleich groß und füllen den Rahmen aus. Das ist seit dem
  // Umbau auf Verläufe (2026-09-14, siehe unten) richtig so: Ein Verlauf ist an seinem Rand
  // ohnehin durchsichtig, seine sichtbare Ausdehnung steuern die Stützpunkte — nicht die
  // Kantenlänge. Verschieden große Kästen brächten dagegen die Gefahr zurück, dass eine
  // Ebene über den Rahmen hinausragt und auf Android quadratisch abgeschnitten wird.
  const wrapGroesse = grossGroesse + 80;
  const lichtGroesse = wrapGroesse;

  return (
    // Siehe Datei-Kommentar oben (Update 2026-09-10): kein Pressable/onPress mehr — die
    // Animation läuft immer vollständig durch, statt durch einen (auch unabsichtlichen)
    // Kind-Tipp abgeschnitten werden zu können.
    <View style={[styles.wrap, { width: wrapGroesse, height: wrapGroesse }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ebene, { opacity: glowOpacity, transform: [{ scale: glowSkalierung }] }]}
      >
        <Lichtebene art="schein" groesse={lichtGroesse} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.ebene, { opacity: ringOpacity, transform: [{ scale: ringSkalierung }] }]}
      >
        <Lichtebene art="saum" groesse={lichtGroesse} />
      </Animated.View>
      <Animated.View
        style={{ transform: [{ scale: figurSkalierung }, { rotate: drehung }, { translateY: absetzen }] }}
      >
        {zeigeFigur ? figur : tier}
      </Animated.View>
      {tier && (
        <Animated.View pointerEvents="none" style={[styles.ebene, { opacity: blitzOpacity }]}>
          <Lichtebene art="blitz" groesse={lichtGroesse} />
        </Animated.View>
      )}
      {zeigeFunkeln && <Funkeln size={grossGroesse * 1.1} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Alle Lichtebenen liegen mittig übereinander; ihre Ausdehnung steckt im Verlauf selbst.
  ebene: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ---------------------------------------------------------------------------------------
// Die Lichtebenen
// ---------------------------------------------------------------------------------------
// Gerätetest 2026-09-14 (Nutzer: "Der weiße Kreis und der Ring wirken nicht gut"). Bis
// hierher waren beide schlichte Views: eine cremefarben GEFÜLLTE Kreisfläche (#F4EDE0) und
// ein Kreis mit 3 px Goldkontur. Drei Dinge gingen daran schief:
//
//  1. Eine Fläche mit gleichmäßiger Deckkraft hört an ihrem Rand abrupt auf. Licht tut das
//     nie — es fällt ab. Das Auge las deshalb keinen Lichtschein, sondern eine aufgeklebte
//     Scheibe.
//  2. Deckendes Cremeweiß nahm der gemalten Kulisse darunter die Zeichnung weg. Ein
//     Lichtschein muss den Untergrund aufhellen und sichtbar lassen.
//  3. Ein exakter Kreis mit dünner Kontur ist die Formensprache eines Bedienelements — er
//     las sich wie ein Fortschrittsring, zumal er unten angeschnitten war.
//
// Alle drei sind jetzt radiale Verläufe (`react-native-svg`, dieselbe Technik wie die
// Nebel-Lichtungen in LuchsRevierKarte.tsx): deckend im Kern, bei 100 % des Radius auf null.
// Damit gibt es keine Kante mehr, an der etwas aufhören könnte, und auch kein Problem, wenn
// eine Ebene am unteren Bildrand angeschnitten wird. Die Animation selbst — Deckkraft,
// Skalierung, Zeiten — ist unverändert; getauscht ist nur, was gezeichnet wird.
//
// Die Verlaufs-Kennung enthält die Art, weil alle Ebenen im Web-Build in DERSELBEN
// DOM-Struktur landen: Zwei Verläufe mit gleicher `id` würden sich dort gegenseitig
// überschreiben, und der Blitz bekäme die Farben des Lichtscheins.
const LICHT: Record<string, { farbe: string; stopps: [number, string, number][] }> = {
  // Warmes Ankündigungslicht: innen hell, nach außen schnell durchsichtig.
  schein: {
    farbe: "#FFE7AE",
    stopps: [
      [0, "#FFF8E6", 1],
      [45, "#FFF8E6", 0.5],
      [100, "#FFE7AE", 0],
    ],
  },
  // Goldener Lichtsaum — der frühere "Magie-Puls". Kein Strich, sondern ein Ring aus Licht:
  // durchsichtig in der Mitte, am hellsten bei 78 % des Radius, am Rand wieder auf null.
  saum: {
    farbe: "#D7A52D",
    stopps: [
      [52, "#D7A52D", 0],
      [78, "#F0C45A", 0.6],
      [100, "#D7A52D", 0],
    ],
  },
  // Lichtblitz für den Bildtausch Tier → Figur (2026-09-12). Bewusst warmes Cremeweiß statt
  // reinem Weiß — Design-Grundsatz 3 (keine harten, grellen Signale für Kinder). Die
  // Mitte bleibt länger deckend als beim Schein, damit der Tausch darunter verborgen bleibt.
  blitz: {
    farbe: "#FFF3D6",
    // Die Mitte bleibt bis 72 % des Radius voll deckend. Das ist kein Geschmackswert: Unter
    // ihr wird das Bild getauscht (siehe tauschAb im Effekt oben), und die Figur reicht bei der hier
    // verwendeten Größe bis rund 68 % des Radius. Ein früher einsetzender Abfall ließe den
    // Wechsel durchscheinen — genau das, was der Blitz verbergen soll.
    stopps: [
      [0, "#FFFDF6", 1],
      [72, "#FFFBF2", 1],
      [100, "#FFF3D6", 0],
    ],
  },
};

function Lichtebene({ art, groesse }: { art: keyof typeof LICHT; groesse: number }) {
  const r = groesse / 2;
  const kennung = `verwandlungLicht-${art}`;
  return (
    <Svg width={groesse} height={groesse}>
      <Defs>
        <RadialGradient id={kennung} cx="50%" cy="50%" r="50%">
          {LICHT[art].stopps.map(([offset, farbe, deckung]) => (
            <Stop key={offset} offset={`${offset}%`} stopColor={farbe} stopOpacity={deckung} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill={`url(#${kennung})`} />
    </Svg>
  );
}
