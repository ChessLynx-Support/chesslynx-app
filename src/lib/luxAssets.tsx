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
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

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
// Sinusförmige Auf-/Ab-Bewegung als Stützstellen-Tabelle statt als Sequence aus zwei
// Animated.timing-Aufrufen (siehe Kommentar in LuxAtem unten, wo diese Tabelle
// verwendet wird) — 24 Stützstellen pro Zyklus sind für das bloße Auge nicht mehr von
// einer echten, kontinuierlichen Sinuskurve zu unterscheiden. `(1 - cos(2πx))/2`
// durchläuft dafür glatt und mit Geschwindigkeit null an beiden Enden 0 → 1 → 0 über
// eine volle Periode — exakt die Form, die ein "Atem"-Pulsieren braucht.
// Update (Nutzer-Feedback 2026-09-07, "Zugvorschläge pulsieren auch laggy. Die Farbgebung
// ist weniger hochwertig als die Spielfiguren."): dieselbe Stützstellen-Technik wird jetzt
// auch von ZielfeldMarker/BedrohungsPuls in quest1/Board.tsx gebraucht — deshalb hier als
// generische, exportierte Helfer statt lokal nur für den Atem-Puls. `baueSanftenVerlauf`
// interpoliert zwischen zwei beliebigen Werten (nicht nur 1↔betrag wie zuvor), damit
// Board.tsx sie auch für Opazität/Skalierung mit anderen Start-/Endwerten wiederverwenden
// kann (z. B. Opazität 0,25↔0,5 beim Bedrohungs-Puls).
export const SANFTE_STUETZSTELLEN = 24;
export const SANFTE_PHASEN = Array.from({ length: SANFTE_STUETZSTELLEN + 1 }, (_, i) => i / SANFTE_STUETZSTELLEN);

export function baueSanftenVerlauf(von: number, bis: number): number[] {
  return SANFTE_PHASEN.map((phase) => von + (bis - von) * ((1 - Math.cos(2 * Math.PI * phase)) / 2));
}

const ATEM_PHASEN = SANFTE_PHASEN;

function baueAtemAusschlag(betrag: number): number[] {
  return baueSanftenVerlauf(1, betrag);
}

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
    // Nutzer-Feedback (2026-09-07, zweite Rückmeldung nach dem ersten Fix): "besser,
    // aber immer noch laggy, nicht geschmeidig". Vermutliche Restursache: Das bisherige
    // Sequence-aus-zwei-timings-Muster (hoch, dann runter) brauchte pro voller Atem-
    // Periode ZWEI Bridge-Synchronisationspunkte — an jedem der beiden Wendepunkte muss
    // die JS-Seite den jeweils nächsten Animationsschritt anstoßen. Ist der JS-Thread
    // genau in diesem Moment mit etwas anderem beschäftigt (Sprachausgabe, Netzwerk,
    // React-Rerenders — und besonders relevant beim Testen im Browser/auf dem Desktop,
    // wo Animated dort komplett über den JS-Thread läuft statt über einen echten,
    // separaten nativen UI-Thread), entsteht genau dort ein kleiner Hänger, zweimal pro
    // Zyklus. Fix: nur noch EIN einziger, durchgehender linearer Lauf pro voller Periode
    // (halbiert die Synchronisationspunkte auf einen) — die komplette Auf-und-ab-Form
    // entsteht rein aus der Interpolation über die oben vorbereitete Stützstellen-
    // Tabelle, läuft also ganz ohne weitere JS-Beteiligung.
    const schleife = Animated.loop(
      Animated.timing(puls, {
        toValue: 1,
        duration: dauer * 2,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls, dauer]);

  const scale = puls.interpolate({ inputRange: ATEM_PHASEN, outputRange: baueAtemAusschlag(betrag) });

  return (
    <Animated.View
      style={{ transform: [{ scale }] }}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      {children}
    </Animated.View>
  );
}

// KALIBRIERUNG (2026-09-07, per tatsächlicher Pixelanalyse des PNGs ersetzt — siehe
// Nutzer-Feedback "Links oben pulsiert etwas (Ausschnitt von Luchskopf und rechtem
// Ohr). Was soll das darstellen?" und "man sieht nur den Igel, aber nicht den Luchs").
// Die bisherigen Schätzwerte hatten zwei Fehler: (1) KOPF_MITTE_X fehlte komplett — der
// Code nahm an, Kopf/Ohren lägen horizontal exakt mittig im 600px breiten Bild;
// tatsächlich liegt die Kopf-/Ohren-Mitte bei x≈251px (Alpha-Bounding-Box je Zeile,
// gemittelt über den Kopf-/Ohren-Bereich) — eine Verschiebung von 48px nach links, bei
// dem vorher nur ~138px breiten Ausschnittfenster genug, um praktisch nur die rechte
// Kopf-/Ohrhälfte zu zeigen. (2) KOPF_ANTEIL war mit 0.225 viel zu klein — der Kopf ist
// an der breitesten Stelle (Wangenbereich, ca. 40 % der Bildhöhe) bereits ca. 435px
// breit, weit mehr als das alte ~226px breite Fenster fassen konnte. Neue Werte zeigen
// Kopf UND Ohren vollständig, von den Ohrspitzen (ganz oben im Bild) bis zum Hals
// (deutlichste Verengung bei ca. 55 % der Bildhöhe).
const KOPF_MITTE_X = 0.419; // Anteil der Bildbreite, auf dem die Kopf-/Ohren-Mitte liegt
const KOPF_MITTE_Y = 0.284; // Anteil der Bildhöhe, auf dem die Kopf-/Ohren-Mitte liegt
const KOPF_ANTEIL = 0.548; // Anteil der Bildhöhe, den Kopf+Ohren zusammen einnehmen

type LuxEckIconProps = { size?: number; atmen?: boolean };

/**
 * Rundes Lux-Icon für Quest-Ecken und ähnliche kleine Auftritte — löst den beigen
 * Platzhalter-Kreis ab (`styles.luxHead` in Quest1.tsx–Quest6.tsx). `LuxHeroIcon` eignet
 * sich dafür nicht direkt (Ganzkörper-Sitzpose, bei 52px Breite wäre der Kopf winzig):
 * Diese Komponente rendert stattdessen dieselbe `chesslynx_lux_hero.png` stark vergrößert
 * und so verschoben, dass der Kopf den Kreis füllt — der Rest wird vom runden Rahmen
 * (`overflow: hidden`) abgeschnitten. Kein neues Asset nötig, reiner Ausschnitt per
 * Layout-Mathematik.
 *
 * `atmen`: sanftes Idle-Pulsieren (siehe LuxAtem oben) — standardmäßig an, da Lux hier
 * antippbar ist (löst laut useLuxSprechzeile.ts die aktuelle Sprechzeile erneut aus,
 * siehe Opus-Review Abschnitt 3.1) und die Bewegung zusätzlich "hier tut sich was"
 * signalisiert.
 */
export function LuxEckIcon({ size = 52, atmen = true }: LuxEckIconProps) {
  const bildHoehe = size / KOPF_ANTEIL;
  const bildBreite = bildHoehe / LUX_HERO_ASPECT_RATIO;
  const verschiebungX = -(bildBreite * KOPF_MITTE_X - size / 2);
  const verschiebungY = -(bildHoehe * KOPF_MITTE_Y - size / 2);

  const inhalt = (
    <View style={[styles.eckRahmen, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={luxHero}
        style={{
          width: bildBreite,
          height: bildHoehe,
          position: "absolute",
          left: verschiebungX,
          top: verschiebungY,
        }}
        resizeMode="contain"
        accessibilityLabel="Lux, der Luchs"
      />
    </View>
  );

  return atmen ? <LuxAtem>{inhalt}</LuxAtem> : inhalt;
}

const styles = StyleSheet.create({
  // Beige Grundfarbe entspricht dem bisherigen Platzhalter (styles.luxHead, #E8D2B0) —
  // bleibt als Untergrund sichtbar, solange das Bild noch lädt.
  eckRahmen: {
    overflow: "hidden",
    backgroundColor: "#E8D2B0",
  },
});
