// ChessLynxButton — gemeinsamer Button-Baukasten für die ganze App (siehe Claude-Projekt
// "ChessLynx", Dokument `produktionsanleitung_elemente.md`, Abschnitt 7 "Buttons und
// Zusatzelemente — für ein rundes Gesamtbild"). Löst die bisher pro Screen einzeln
// gestalteten `Pressable`+`StyleSheet`-Buttons ab (KidHome-Quest-Chips, Onboarding-CTA,
// ParentGate-Bestätigen) — EINE Komponente mit drei Varianten statt eines Stilbruchs pro
// Bildschirm, exakt wie es die Produktionsanleitung als größten Konsistenz-Hebel nennt.
//
// Kein neues Bild-Asset nötig: der "gemalte" Eindruck entsteht rein aus Vektor-Mitteln
// (Farbverlauf, dünner Gold-Rand, sanfter Glanz oben) — dieselbe Kategorie wie die
// bereits bestehenden `ZielfeldMarker`/`StoppMarker` in quest1/Board.tsx (react-native-svg
// direkt im Code statt Rastergrafik), siehe Abschnitt 7.3 der Produktionsanleitung.
//
// Press-Feedback: leichtes Einsinken (Scale) für alle Varianten, zusätzlich ein kurzer
// Funkeln-Ausbruch (siehe components/Funkeln.tsx) für `primary` — dieselbe Belohnungs-
// Geste, die bisher nur QuestGeschafft/Onboarding kannten, nutzt jetzt jeder Haupt-CTA.
//
// Update (2026-09-08, Claude-Projekt "ChessLynx", produktionsanleitung_elemente.md
// Abschnitt 7.5): neuer optionaler `textur`-Prop testet die drei vom Nutzer favorisierten
// Richtungen aus dem gemalten Button-Mockup direkt im Code — bewusst als vollwertige
// Vektor-Umsetzung (kein Bild-Asset, gleicher Grund wie oben), nicht als exakte 1:1-Kopie
// des CSS-Mockups, sondern als grobe Annäherung zum Testen ("werden ggf. später
// verfeinert", Nutzerzitat). `textur="vektor"` (Standard) ist die bisherige, unveränderte
// Farbverlauf-Pille — bestehende Aufrufstellen ohne den neuen Prop verhalten sich exakt
// wie zuvor.
//   - "stein"  (Nutzer-Favorit C, Runder Waldstein): heller Stein-Farbverlauf, feine
//     Sprenkel, zwei Moosflecken am unteren Rand.
//   - "holz"   (Nutzer-Favorit A, Holzschild mit Blattranke): gebänderter Holzton-
//     Farbverlauf, Gold-Rand, Blattranke am unteren Rand.
//   - "aquarell" (Nutzer-Favorit B, Aquarell-Blatt-Form): organische Blatt-Silhouette
//     statt Pillenform, mit weich auslaufendem Rand-Schimmer und angedeuteter Blattader.

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop, Image as SvgImage } from "react-native-svg";
import { Funkeln } from "./Funkeln";

// Marken-Gold, wie in Funkeln.tsx/ZielfeldMarker verwendet — nicht frei gewählt.
const GOLD = "#D7A52D";

// Update (2026-09-11, siehe claude/status_content_produktion.md, Gruppe A): die drei
// gemalten Button-Texturen (Stein/Holz/Aquarell) sind seit 2026-09-10 fertig produziert,
// QA-geprüft und freigegeben (512×512, nahtlos kachelbar) — ersetzen ab hier die bisherigen
// Vektor-Näherungen (SteinHintergrund/HolzHintergrund/AquarellHintergrund unten) durch
// SVG-`<Pattern>`-Füllungen mit den echten, gemalten Kacheln. `textur="vektor"` bleibt
// unverändert die versagenssichere Grundeinstellung/Fallback (siehe Datei-Kommentar oben).
const steinTexturBild = require("../../assets/ui/buttons/button_stein_export.png");
const holzTexturBild = require("../../assets/ui/buttons/button_holz_export.png");
const aquarellTexturBild = require("../../assets/ui/buttons/button_aquarell_export.png");

type Variante = "primary" | "secondary" | "icon";
type Textur = "vektor" | "stein" | "holz" | "aquarell";

const FARBEN: Record<Variante, { unten: string; oben: string; textFarbe: string; goldRand: boolean }> = {
  // Terrakotta — bisherige Haupt-CTA-Farbe (Onboarding-CTA, KidHome-Buttons), jetzt mit
  // Glanz-Verlauf statt Flatcolor plus dünnem Gold-Rand als "veredelter" Akzent.
  primary: { unten: "#C9855F", oben: "#DE9F76", textFarbe: "#FFFFFF", goldRand: true },
  // Salbeigrün — bisherige Sekundärfarbe (questButtonSecond, ParentGate-Bestätigen),
  // bewusst ohne Gold-Rand, damit primary/secondary auf einen Blick unterscheidbar bleiben.
  secondary: { unten: "#8FA888", oben: "#A6BFA0", textFarbe: "#FFFFFF", goldRand: false },
  // Für reine Icon-Buttons (z. B. künftig die Lux-Ecke) — heller, cremiger Grundton statt
  // eines Farbakzents, damit das Icon selbst im Vordergrund bleibt.
  icon: { unten: "#FFFFFF", oben: "#FFFFFF", textFarbe: "#4A4038", goldRand: true },
};

// Fallback-Hintergrundfarbe für den einen Layout-Tick, bevor `onLayout` die tatsächliche
// Größe liefert und die Textur-Svg zeichnen kann (siehe `groesse`-State unten).
const TEXTUR_FALLBACK_FARBE: Record<Exclude<Textur, "vektor">, string> = {
  stein: "#D8CBB0",
  holz: "#A66A4A",
  aquarell: "#9CB89A",
};

const TEXTUR_TEXTFARBE: Record<Exclude<Textur, "vektor">, string> = {
  stein: "#4A4038",
  holz: "#FFFFFF",
  aquarell: "#4A4038",
};

type ChessLynxButtonProps = {
  variante?: Variante;
  onPress: () => void;
  children?: ReactNode;
  /** Optionales Icon links vom Text, z. B. ein BadgeRahmen mit Tier-Icon (KidHome). */
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Standard: an für primary, aus für secondary/icon — siehe FARBEN oben. */
  funkeln?: boolean;
  accessibilityLabel?: string;
  /** Standard "vektor" (bisherige Farbverlauf-Pille) — siehe Datei-Kommentar oben für die
   * drei testweisen gemalten Richtungen. */
  textur?: Textur;
};

export function ChessLynxButton({
  variante = "primary",
  onPress,
  children,
  icon,
  disabled = false,
  style,
  funkeln,
  accessibilityLabel,
  textur = "vektor",
}: ChessLynxButtonProps) {
  const { unten, oben, textFarbe: vektorTextFarbe, goldRand } = FARBEN[variante];
  const zeigeFunkeln = funkeln ?? variante === "primary";
  const hintergrundFarbe = textur === "vektor" ? unten : TEXTUR_FALLBACK_FARBE[textur];
  const textFarbe = textur === "vektor" ? vektorTextFarbe : TEXTUR_TEXTFARBE[textur];

  const [groesse, setGroesse] = useState<{ w: number; h: number } | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const [funkelnTick, setFunkelnTick] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setGroesse({ w: Math.round(width), h: Math.round(height) });
  }

  function onPressIn() {
    Animated.timing(scale, { toValue: 0.96, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
  }
  function handlePress() {
    if (zeigeFunkeln) setFunkelnTick((n) => n + 1);
    onPress();
  }

  const radius = variante === "icon" ? (groesse ? groesse.h / 2 : 26) : groesse ? groesse.h / 2 : 20;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View
        onLayout={onLayout}
        style={[
          styles.wrap,
          variante === "icon" ? styles.wrapIcon : styles.wrapText,
          { backgroundColor: hintergrundFarbe, transform: [{ scale }], opacity: disabled ? 0.55 : 1 },
        ]}
      >
        {groesse && textur === "vektor" && (
          <Svg
            width={groesse.w}
            height={groesse.h}
            viewBox={`0 0 ${groesse.w} ${groesse.h}`}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={oben} stopOpacity={1} />
                <Stop offset="1" stopColor={unten} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={groesse.w} height={groesse.h} rx={radius} ry={radius} fill="url(#grad)" />
            {/* dünner Glanzstreifen oben — macht aus der Flatcolor eine "veredelte" Fläche,
                ohne ein neues Bild-Asset zu brauchen. */}
            <Rect
              x={1.5}
              y={1.5}
              width={Math.max(groesse.w - 3, 0)}
              height={Math.max(groesse.h * 0.42 - 1.5, 0)}
              rx={Math.max(radius - 1.5, 0)}
              ry={Math.max(radius - 1.5, 0)}
              fill="#FFFFFF"
              opacity={0.16}
            />
            {goldRand && (
              <Rect
                x={1.2}
                y={1.2}
                width={Math.max(groesse.w - 2.4, 0)}
                height={Math.max(groesse.h - 2.4, 0)}
                rx={Math.max(radius - 1.2, 0)}
                ry={Math.max(radius - 1.2, 0)}
                fill="none"
                stroke={GOLD}
                strokeWidth={1.4}
                strokeOpacity={0.6}
              />
            )}
          </Svg>
        )}
        {groesse && textur === "stein" && <SteinHintergrund w={groesse.w} h={groesse.h} />}
        {groesse && textur === "holz" && <HolzHintergrund w={groesse.w} h={groesse.h} />}
        {groesse && textur === "aquarell" && <AquarellHintergrund w={groesse.w} h={groesse.h} />}
        <View style={variante === "icon" ? styles.innerIcon : styles.innerText}>
          {icon}
          {typeof children === "string" ? (
            <Text
              style={[
                styles.text,
                { color: textFarbe },
                icon ? styles.textMitIcon : undefined,
                textur === "holz" ? styles.textHolzSchatten : undefined,
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
        {funkelnTick > 0 && groesse && (
          <Funkeln key={funkelnTick} size={Math.max(groesse.w, groesse.h) * 1.5} />
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Richtung C aus dem Mockup ("Runder Waldstein", Nutzer-Favorit): jetzt die echte,
 * gemalte 512×512-Steintextur (`button_stein_export.png`) als `<Pattern>`-Füllung statt
 * der bisherigen Vektor-Näherung — Sprenkel/Moosflecken sind bereits Teil der produzierten
 * Textur (siehe claude/produktionsliste_buttons_farbcodes_v1.md §2.2, Auftrag 1), deshalb
 * hier nicht mehr zusätzlich als Vektor-Overlay gezeichnet. Kachelgröße = Button-Höhe, damit
 * die Maserung unabhängig von der Textlänge in konsistenter Materialgröße erscheint. */
function SteinHintergrund({ w, h }: { w: number; h: number }) {
  const radius = h / 2;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="steinMuster" patternUnits="userSpaceOnUse" width={h} height={h}>
          <SvgImage href={steinTexturBild} x={0} y={0} width={h} height={h} preserveAspectRatio="xMidYMid slice" />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill="url(#steinMuster)" />
      {/* Sanfter Glanz oben bleibt als Vektor-Veredelung erhalten, wie bei der Vektor-Pille. */}
      <Rect
        x={1.5}
        y={1.5}
        width={Math.max(w - 3, 0)}
        height={Math.max(h * 0.36 - 1.5, 0)}
        rx={Math.max(radius - 1.5, 0)}
        ry={Math.max(radius - 1.5, 0)}
        fill="#FFFFFF"
        opacity={0.18}
      />
    </Svg>
  );
}

/** Richtung A aus dem Mockup ("Holzschild mit Blattranke"): jetzt die echte, gemalte
 * 512×512-Holztextur (`button_holz_export.png`, V2) als `<Pattern>`-Füllung — Maserung und
 * Blattranke sind bereits Teil der produzierten Textur (siehe claude/produktionsliste_
 * buttons_farbcodes_v1.md §2.2, Auftrag 2), deshalb hier nicht mehr zusätzlich als
 * Vektor-Overlay gezeichnet. Gold-Rand bleibt Vektor-Overlay (Design-Entscheidung, gilt
 * unabhängig von der Textur). */
function HolzHintergrund({ w, h }: { w: number; h: number }) {
  const radius = Math.min(18, h * 0.3);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="holzMuster" patternUnits="userSpaceOnUse" width={h} height={h}>
          <SvgImage href={holzTexturBild} x={0} y={0} width={h} height={h} preserveAspectRatio="xMidYMid slice" />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill="url(#holzMuster)" />
      <Rect
        x={1.2}
        y={1.2}
        width={Math.max(w - 2.4, 0)}
        height={Math.max(h - 2.4, 0)}
        rx={Math.max(radius - 1.2, 0)}
        ry={Math.max(radius - 1.2, 0)}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.4}
        strokeOpacity={0.6}
      />
    </Svg>
  );
}

/** Richtung B aus dem Mockup ("Aquarell-Blatt-Form"): organische Blatt-Silhouette (fest
 * gezeichnete Blob-Kontur in einem 220×70-Koordinatenraum, per `preserveAspectRatio="none"`
 * auf die tatsächliche Button-Größe gestreckt) bleibt bestehen — sie ist die bewusste
 * Formabgrenzung von der Pillenform der beiden anderen Texturen. Gefüllt wird sie jetzt mit
 * der echten, gemalten 512×512-Aquarell-Textur (`button_aquarell_export.png`) als
 * `<Pattern>`-Füllung statt des bisherigen Radialverlaufs — Bleed-Rand und Blattader sind
 * bereits Teil der produzierten Textur (siehe claude/produktionsliste_buttons_farbcodes_
 * v1.md §2.2, Auftrag 3), deshalb hier nicht mehr zusätzlich als Vektor-Overlay gezeichnet. */
function AquarellHintergrund({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 70" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="aquarellMuster" patternUnits="userSpaceOnUse" width={70} height={70}>
          <SvgImage href={aquarellTexturBild} x={0} y={0} width={70} height={70} preserveAspectRatio="xMidYMid slice" />
        </Pattern>
      </Defs>
      <Path
        d="M18 35 C18 15 46 4 92 6 C142 8 172 1 197 17 C216 28 211 51 187 59 C158 69 118 67 78 64 C39 61 18 55 18 35 Z"
        fill="url(#aquarellMuster)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "visible", alignItems: "center", justifyContent: "center" },
  wrapText: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 24 },
  wrapIcon: { width: 48, height: 48, borderRadius: 24 },
  innerText: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  innerIcon: { alignItems: "center", justifyContent: "center" },
  text: { fontSize: 18, fontWeight: "600" },
  textMitIcon: { marginLeft: 2 },
  // Leichter Textschatten für die weiße Beschriftung auf der Holz-Textur — gleiche Idee
  // wie im CSS-Mockup (`text-shadow`), damit der Text auf der gebänderten Maserung lesbar
  // bleibt statt mit ihr zu verschmelzen.
  textHolzSchatten: {
    textShadowColor: "rgba(74,40,20,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
