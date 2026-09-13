// Lux als eigene Grafik (siehe priorisierter_umsetzungsplan.md, Phase 3, "Lux als eigene
// Grafik — V4/Revision 5 freigegeben") — bisher nirgends im Code verdrahtet, überall wo
// Lux auftaucht (Quest-Screens-Ecke, hier) stand bislang nur ein schlichter beigefarbener
// Kreis (`styles.luxHead`) als Platzhalter.
//
// -------------------------------------------------------------------------------------
// Update 2026-09-13 — LUX LEBT: Zustandsbilder statt eines Standbilds
// -------------------------------------------------------------------------------------
// Bis hierher war Lux überall ein einzelnes, unbewegtes Bild
// (assets/lux/chesslynx_lux_hero.webp, ein flacher Abzug des Rig-Pakets V4/Revision 5).
// Inzwischen gibt es für Lux freigegebene ZUSTÄNDE nach der Zustands-Methode: vollständige
// Bilder auf gemeinsamer Leinwand, deckungsgleich zum Grundzustand ausgerichtet durch
// scripts/rig_master.py (siehe claude/rig_master_system_2026-09-12.md und
// scripts/rig_configs/lux.json).
//
// Eingebunden sind hier drei davon:
//   lux_grund.webp     — S0_standing, der Grundzustand
//   lux_blinzeln.webp  — S0b_blink, beide Augen geschlossen
//   lux_sprechen.webp  — S1_sprechen, Maul geöffnet
//
// Gemessen gegen den Grundzustand (2026-09-13, maskiert über den Alphakanal): Blinzeln
// verändert nur y 376–463, Sprechen nur y 519–556; alles andere — Ohrpinsel, Brauen,
// Flecken, Backenbart, Körper — ist Pixel für Pixel dasselbe Bild, die Alphakanäle sind
// identisch. Deshalb genügt reines Überblenden ohne jede Positionierungsrechnung, siehe
// components/ZustandsTier.tsx.
//
// ACHTUNG, BEWUSSTE ÄNDERUNG AM AUSSEHEN: Die Zustände sind aus dem neueren Master
// V6/Revision 6 gerechnet, das bisherige Hero-Bild stammt aus V4/Revision 5. Beide zeigen
// dieselbe Figur, unterscheiden sich aber in Details (Silhouetten-IoU 0,933 — vor allem
// Neigung der Ohrpinsel, Fleckenverteilung, Schwanzhaltung). Ein Mischbetrieb wäre schlimmer
// als der Wechsel: Ein Lidschlag aus V6 über einem Körper aus V5 würde springen. Deshalb
// zeigt die App ab jetzt durchgehend V6. `chesslynx_lux_hero.webp` bleibt liegen, bis der
// Wechsel auf dem Gerät bestätigt ist.
//
// LEINWAND UND EINPASSUNG: Der Zustands-Export ist 660×1060 groß und hat rundherum Rand,
// weil spätere Zustände (winkende Pfote, erhobene Zeigepfote) über die Silhouette des
// Grundzustands hinausragen — ohne diesen Rand wären sie angeschnitten. Das bisherige
// Hero-Bild dagegen war randlos auf die Figur zugeschnitten (600×1004). Würde man das neue
// Bild einfach in denselben Kasten legen, stünde Lux kleiner und verschoben da. Die
// Komponente `LuxZustand` unten rechnet den Rand deshalb heraus: Der äußere Kasten behält
// exakt die alten Maße (`breite` × `breite * LUX_HERO_ASPECT_RATIO`), das Zustandsbild wird
// darin so weit vergrößert und negativ versetzt, dass die FIGUR an derselben Stelle und in
// derselben Größe steht wie vorher. Alle bestehenden Aufrufstellen bleiben dadurch
// unverändert gültig.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, View } from "react-native";

import { ZustandsTier } from "../components/ZustandsTier";
import { useLuxSpricht } from "./luxStimme";

const luxGrund = require("../../assets/lux/zustaende/lux_grund.webp");
const luxBlinzeln = require("../../assets/lux/zustaende/lux_blinzeln.webp");
const luxSprechen = require("../../assets/lux/zustaende/lux_sprechen.webp");

// Natives Seitenverhältnis (Höhe/Breite) der FIGUR, wie sie die App darstellt. Der Wert
// stammt aus dem randlosen Hero-Export und bleibt die Rechengrundlage aller Layouts
// (Quest1.tsx, WillkommensSequenz.tsx) — die Umstellung auf die Zustandsbilder ändert ihn
// bewusst nicht, damit sich keine Abstände verschieben.
export const LUX_HERO_ASPECT_RATIO = 1004 / 600;

// Maße des Zustands-Exports und Lage der Figur darin, gemessen am 2026-09-13 über den
// Alphakanal (Schwelle 8): Leinwand 660×1060, Figur bei x 30–630, y 32–1027.
const LEINWAND = { breite: 660, hoehe: 1060 };
const FIGUR = { x: 30, y: 32, breite: 601 };

/**
 * Rechnet aus der gewünschten FIGURENBREITE den Kasten, in dem das Zustandsbild liegen
 * muss, samt negativem Versatz. Ergebnis: Die Figur steht danach exakt dort, wo das alte,
 * randlos zugeschnittene Bild stand.
 */
function kasten(figurBreite: number) {
  const breite = figurBreite * (LEINWAND.breite / FIGUR.breite);
  const hoehe = breite * (LEINWAND.hoehe / LEINWAND.breite);
  return {
    breite,
    hoehe,
    links: -breite * (FIGUR.x / LEINWAND.breite),
    oben: -hoehe * (FIGUR.y / LEINWAND.hoehe),
  };
}

// Wie schnell sich das Maul beim Sprechen öffnet und schließt. 150 ms ist bewusst kein
// Silbentakt — die Geräte-Stimme liefert keine Lautinformation, ein echtes Lippenlesen ist
// damit nicht möglich. Zusammen mit der 90-ms-Überblendung in ZustandsTier entsteht daraus
// eine ruhige, weiche Mundbewegung statt eines Flackerns.
const MUND_TAKT_MS = 150;

function useMundTakt(spricht: boolean): boolean {
  const [offen, setOffen] = useState(false);
  useEffect(() => {
    if (!spricht) {
      setOffen(false);
      return;
    }
    setOffen(true);
    const takt = setInterval(() => setOffen((o) => !o), MUND_TAKT_MS);
    return () => {
      clearInterval(takt);
      setOffen(false);
    };
  }, [spricht]);
  return offen;
}

type LuxZustandProps = {
  /** Breite der FIGUR, nicht der Leinwand — siehe Kommentar zur Einpassung oben. */
  breite: number;
  /** Lidschlag im Leerlauf. */
  blinzeln?: boolean;
  /** Maulbewegung, solange Lux spricht. Aus, wo Lux nur als Bild dasteht. */
  mundBewegung?: boolean;
};

/**
 * Lux in seiner jetzigen Machart: Grundzustand plus überblendete Zustände. Gemeinsame
 * Grundlage von `LuxHeroIcon` und `LuxEckIcon` unten.
 */
function LuxZustand({ breite, blinzeln = true, mundBewegung = true }: LuxZustandProps) {
  const spricht = useLuxSpricht();
  const mundOffen = useMundTakt(mundBewegung && spricht);
  const k = kasten(breite);

  return (
    // Äußerer Kasten in den Maßen der Figur: Er bestimmt, wie viel Platz Lux im Layout
    // einnimmt. Das größere Zustandsbild liegt absolut darin und ragt darüber hinaus —
    // aber nur mit seinem LEEREN Rand. Die Figur selbst liegt vollständig innerhalb des
    // Kastens (sie ist sogar rund 1 % niedriger als er). Sollte Android den Überstand
    // wider Erwarten abschneiden, geht deshalb nichts Sichtbares verloren.
    <View style={{ width: breite, height: breite * LUX_HERO_ASPECT_RATIO }}>
      <View style={{ position: "absolute", left: k.links, top: k.oben }}>
        <ZustandsTier
          grund={luxGrund}
          blinzeln={luxBlinzeln}
          aktiverZustand={luxSprechen}
          aktiv={mundOffen}
          breite={k.breite}
          hoehe={k.hoehe}
          idle={blinzeln}
          accessibilityLabel="Lux, der Luchs"
        />
      </View>
    </View>
  );
}

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
  return <LuxZustand breite={width} />;
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
 * zeigte diese Komponente nur einen kreisförmig zugeschnittenen KOPF-Ausschnitt. Jetzt
 * stattdessen exakt dasselbe Prinzip wie `LuxHeroIcon` oben: die KOMPLETTE Illustration
 * (Ganzkörper), nur in deutlich kleinerem Maßstab. `size` wirkt als Breite der Figur — die
 * Höhe ergibt sich aus LUX_HERO_ASPECT_RATIO. Bestehende Aufrufstellen (`<LuxEckIcon
 * size={52} />` in allen sechs Quest*.tsx) brauchen keine Änderung.
 *
 * `atmen`: sanftes Idle-Pulsieren (siehe LuxAtem oben) — standardmäßig an, da Lux hier
 * antippbar ist (löst laut useLuxSprechzeile.ts die aktuelle Sprechzeile erneut aus,
 * siehe Opus-Review Abschnitt 3.1) und die Bewegung zusätzlich "hier tut sich was"
 * signalisiert.
 *
 * Update 2026-09-13: Zusätzlich blinzelt Lux hier und bewegt beim Sprechen das Maul. Das
 * Atem-Pulsieren bleibt trotzdem — es ist eine Skalierung des ganzen Bildes und stört die
 * Überblendung der Zustände nicht, weil beide Ebenen innerhalb desselben skalierten
 * Kastens liegen.
 */
export function LuxEckIcon({ size = 52, atmen = true }: LuxEckIconProps) {
  const inhalt = <LuxZustand breite={size} />;
  return atmen ? <LuxAtem>{inhalt}</LuxAtem> : inhalt;
}
