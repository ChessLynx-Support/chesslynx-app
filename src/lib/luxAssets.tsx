// Lux als eigene Grafik (siehe priorisierter_umsetzungsplan.md, Phase 3, "Lux als eigene
// Grafik — V4/Revision 5 freigegeben") — bisher nirgends im Code verdrahtet, überall wo
// Lux auftaucht (Quest-Screens-Ecke, hier) stand bislang nur ein schlichter beigefarbener
// Kreis (`styles.luxHead`) als Platzhalter.
//
// Diese Datei nutzt bewusst NICHT das komplette Mehrebenen-Rig aus
// Grafiken/Lux/V4/chesslynx_lux_assets_png_masterfaithful_revision5/ (das Rig existiert für
// spätere Idle-/Blinzel-Animation, siehe dortiges README.md und lux_rig_manifest.json),
// sondern eine einzelne, flache Illustration: `lux_rig_composite_preview.png`, laut README
// "auf allen sichtbaren Pixeln (Alpha>10) pixelidentisch" mit dem freigegebenen
// Master-Referenzbild (Augen offen, Standard-Zustand) — für einen statischen Onboarding-
// Screen ist das exakt richtig, ohne die Rig-Komplexität zu brauchen.
//
// Produktions-Export: Quellcanvas 2048×2048, per Alpha-Bounding-Box (Schwelle 10, wie im
// Lux-Rig-Abnahmeverfahren selbst verwendet) auf den tatsächlichen Bildinhalt zugeschnitten
// (1194×1997 vor dem Resize) und mit Lanczos-Resampling auf 600px Breite herunterskaliert
// (Seitenverhältnis 600:1004 bleibt erhalten) — deutlich mehr native Auflösung als die
// Schachfiguren-Master (die aus einer nur ~230×560px kleinen Quelle stammen), weil Lux aus
// einer eigenen hochauflösenden Referenzgrafik erzeugt wurde. PNG (827 KB) wird analog zu
// Board.tsx/pieceMasters.tsx bewusst als Quelle verwendet; eine WebP-Variante (147 KB)
// liegt für eine spätere Umstellung bereit (siehe dortige offene PNG/WebP-Detailfrage).

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, Image } from "react-native";

const luxHero = require("../../assets/lux/chesslynx_lux_hero.png");

// Natives Seitenverhältnis des Produktions-Exports (Höhe/Breite) — siehe Kommentar oben.
// Bewusst als Konstante statt hart im Style verdrahtet, falls die Quellgrafik künftig neu
// zugeschnitten wird.
export const LUX_HERO_ASPECT_RATIO = 1004 / 600;

type LuxHeroIconProps = { width?: number };

/**
 * Lux, große Held:innen-Illustration — für den Onboarding/Splash-Screen (siehe
 * screens/Onboarding.tsx) und potenziell weitere "Lux stellt sich groß vor"-Momente.
 * Anders als die MasterIcon-Komponenten in pieceMasters.tsx (quadratische size-Prop, da
 * die Schachfiguren dort in quadratische Brett-/Kartenfelder passen müssen) nimmt diese
 * Komponente bewusst nur eine `width`-Prop und berechnet die Höhe aus dem echten
 * Seitenverhältnis — Lux ist deutlich höher als breit (sitzende Pose), ein quadratisches
 * `contain` würde das Bild unnötig verkleinern.
 */
export function LuxHeroIcon({ width = 220 }: LuxHeroIconProps) {
  const height = Math.round(width * LUX_HERO_ASPECT_RATIO);
  return (
    <Image
      source={luxHero}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="Lux, der Luchs"
    />
  );
}

// Update (Opus-Review, 2026-09-07, Befund 2.1/2.8, siehe claude/review_logik_grafik_
// audiofuehrung.md): sanftes, endloses Atem-Pulsieren (Skalierung 1↔1,03) für Lux-
// Auftritte, die noch bewegungslos wirkten (Quest-Ecken-Icon unten, Onboarding.tsx) —
// dieselbe "kein Zeitdruck/keine hektische Animation"-Charakteristik wie der
// ZielfeldMarker-Puls in quest1/Board.tsx, nur langsamer und dezenter, da Lux hier
// dauerhaft sichtbar ist statt nur auf einem Zielfeld.
export function LuxAtem({
  children,
  dauer = 2400,
  betrag = 1.03,
}: {
  children: ReactNode;
  dauer?: number;
  betrag?: number;
}) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: dauer, useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: dauer, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls, dauer]);

  const scale = puls.interpolate({ inputRange: [0, 1], outputRange: [1, betrag] });

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

type LuxEckIconProps = { size?: number; atmen?: boolean };

/**
 * Lux-Icon für Quest-Ecken und ähnliche kleine Auftritte neben der Sprechblase — löste
 * ursprünglich den beigen Platzhalter-Kreis ab (`styles.luxHead` in Quest1.tsx–Quest6.tsx).
 *
 * Update (2026-09-08, Nutzerwunsch: "Ist es möglich für die Sprechblasen den Lux Master
 * vollständig zu nehmen (nicht nur einen Ausschnitt), dafür kleiner skaliert?"): bis dahin
 * zeigte diese Komponente nur einen kreisförmig zugeschnittenen KOPF-Ausschnitt (dieselbe
 * `chesslynx_lux_hero.png` stark vergrößert und verschoben, Rest per `overflow: hidden`
 * abgeschnitten — Details dazu in der Git-Historie dieser Datei). Jetzt stattdessen exakt
 * dasselbe Prinzip wie `LuxHeroIcon` oben: die KOMPLETTE Illustration (Ganzkörper), nur in
 * deutlich kleinerem Maßstab und ohne Kreis-Rahmen/Beige-Backdrop (dafür bräuchte es bei
 * einer Ganzkörper-Pose ohnehin eine andere Form als einen Kreis). `size` wirkt jetzt als
 * Bildbreite (vorher: Kreisdurchmesser) — die Höhe ergibt sich aus dem echten
 * Seitenverhältnis (LUX_HERO_ASPECT_RATIO). Bestehende Aufrufstellen (`<LuxEckIcon
 * size={52} />` in allen sechs Quest*.tsx) brauchen dafür keine Änderung, wirken durch die
 * neue Interpretation von `size` lediglich automatisch als kleines Ganzkörper-Lux statt
 * als Kopf-Kreis.
 *
 * `atmen`: sanftes Idle-Pulsieren (siehe LuxAtem oben) — standardmäßig an, da Lux hier
 * antippbar ist (löst laut useLuxSprechzeile.ts die aktuelle Sprechzeile erneut aus,
 * siehe Opus-Review Abschnitt 3.1) und die Bewegung zusätzlich "hier tut sich was"
 * signalisiert.
 */
export function LuxEckIcon({ size = 52, atmen = true }: LuxEckIconProps) {
  const hoehe = Math.round(size * LUX_HERO_ASPECT_RATIO);
  const inhalt = (
    <Image
      source={luxHero}
      style={{ width: size, height: hoehe }}
      resizeMode="contain"
      accessibilityLabel="Lux, der Luchs"
    />
  );

  return atmen ? <LuxAtem>{inhalt}</LuxAtem> : inhalt;
}
