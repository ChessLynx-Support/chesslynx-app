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
// Eingebunden sind alle sechs:
//   lux_grund.webp         — S0_standing, der Grundzustand
//   lux_blinzeln.webp      — S0b_blink, beide Augen geschlossen
//   lux_sprechen.webp      — S1_sprechen, Maul geöffnet
//   lux_winken.webp        — L1_winken, Begrüßung
//   lux_achtung.webp       — L2_achtung, Pfote gehoben: „Pass auf!" / „Dich meine ich"
//   lux_zeigen_brett.webp  — L3_zeigen_brett, deutet auf ein Feld oder eine Figur
//
// Gemessen gegen den Grundzustand (2026-09-14, maskiert über den Alphakanal): Blinzeln
// verändert nur y 383–474, Sprechen nur y 526–565; alles andere — Ohrpinsel, Brauen,
// Flecken, Backenbart, Körper — ist Pixel für Pixel dasselbe Bild. Deshalb genügt reines
// Überblenden ohne jede Positionierungsrechnung, siehe components/ZustandsTier.tsx. Die
// drei Posen verändern die Figur großflächig — sie sind keine Differenz, sondern eigene
// Haltungen, und liegen deshalb als ganze Bilder auf derselben Leinwand.
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
// gemeinsame Hilfskomponente `ZustandsFigur` (components/ZustandsTier.tsx) rechnet den Rand
// deshalb heraus: Der äußere Kasten behält exakt die alten Maße (`breite` × `breite *
// LUX_HERO_ASPECT_RATIO`), das Zustandsbild wird darin so weit vergrößert und negativ
// versetzt, dass die FIGUR an derselben Stelle und in derselben Größe steht wie vorher.
// Alle bestehenden Aufrufstellen bleiben dadurch unverändert gültig.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated } from "react-native";

import {
  GESTE_EINMAL,
  GESTE_WINKEN,
  ZustandsFigur,
  useGeste,
} from "../components/ZustandsTier";
import type { Leinwand } from "../components/ZustandsTier";
import { useLuxSpricht } from "./luxStimme";

const luxGrund = require("../../assets/lux/zustaende/lux_grund.webp");
const luxBlinzeln = require("../../assets/lux/zustaende/lux_blinzeln.webp");
const luxSprechen = require("../../assets/lux/zustaende/lux_sprechen.webp");

// Die drei Posen, freigegeben am 2026-09-13. Sie ragen über die Silhouette des
// Grundzustands hinaus; deshalb hat der Export rundherum Rand (siehe LEINWAND unten).
const luxPosen = {
  winken: require("../../assets/lux/zustaende/lux_winken.webp"),
  achtung: require("../../assets/lux/zustaende/lux_achtung.webp"),
  zeigen_brett: require("../../assets/lux/zustaende/lux_zeigen_brett.webp"),
} as const;

export type LuxPose = keyof typeof luxPosen;

// Natives Seitenverhältnis (Höhe/Breite) der FIGUR, wie sie die App darstellt. Der Wert
// stammt aus dem randlosen Hero-Export und bleibt die Rechengrundlage aller Layouts
// (Quest1.tsx, WillkommensSequenz.tsx) — die Umstellung auf die Zustandsbilder ändert ihn
// bewusst nicht, damit sich keine Abstände verschieben.
export const LUX_HERO_ASPECT_RATIO = 1004 / 600;

// Maße des Zustands-Exports und Lage der Figur darin, gemessen am 2026-09-14 über den
// Alphakanal (Schwelle 8). Die Figur füllt die Leinwand NICHT aus: Rundherum bleibt Rand
// für die Posen — die winkende Pfote steht 13 px weiter links und 7 px höher als die
// Silhouette des Grundzustands. `ZustandsFigur` rechnet diesen Rand wieder heraus.
const LEINWAND: Leinwand = { breite: 660, hoehe: 1060, figur: [33, 46, 594, 982] };

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
  /** Welche Pose gezeigt werden kann. Ohne Angabe wird kein Posenbild geladen. */
  pose?: LuxPose;
  /** Löst die Pose aus: Bei jedem Wechsel dieses Werts läuft sie einmal ab. */
  posenAusloeser?: unknown;
};

/**
 * Lux in seiner jetzigen Machart: Grundzustand plus überblendete Zustände. Gemeinsame
 * Grundlage von `LuxHeroIcon` und `LuxEckIcon` unten.
 *
 * Maul und Pose sind zwei getrennte Ebenen. Sie dürfen gleichzeitig laufen — dann liegt
 * die Pose über dem Maul und verdeckt es, weil beide Bilder die ganze Figur zeigen. Das
 * ist die ehrliche Grenze der Zustands-Methode: Ein Bild "Pfote gehoben UND Maul offen"
 * gibt es nicht. Gesten dauern rund eine Sekunde, das Maul bewegt sich danach weiter.
 */
function LuxZustand({
  breite,
  blinzeln = true,
  mundBewegung = true,
  pose,
  posenAusloeser,
}: LuxZustandProps) {
  const spricht = useLuxSpricht();
  const mundOffen = useMundTakt(mundBewegung && spricht);
  const posiert = useGeste(
    posenAusloeser,
    pose === "winken" ? GESTE_WINKEN : GESTE_EINMAL
  );

  return (
    <ZustandsFigur
      leinwand={LEINWAND}
      figurBreite={breite}
      // Das Layout der Quest-Ecken und der Willkommenssequenz ist auf diesen Wert
      // eingemessen (Quest1.tsx rechnet die Sprechblase danach aus) — deshalb bleibt er
      // die Vorgabe, statt aus der neuen Figur abgeleitet zu werden.
      aspekt={LUX_HERO_ASPECT_RATIO}
      grund={luxGrund}
      blinzeln={luxBlinzeln}
      ebenen={[
        { bild: luxSprechen, aktiv: mundOffen },
        { bild: pose ? luxPosen[pose] : luxSprechen, aktiv: pose != null && posiert },
      ]}
      idle={blinzeln}
      accessibilityLabel="Lux, der Luchs"
    />
  );
}

type LuxHeroIconProps = { width?: number; pose?: LuxPose; posenAusloeser?: unknown };

/**
 * Lux, große Held:innen-Illustration — für den Onboarding/Splash-Screen (siehe
 * screens/Onboarding.tsx) und potenziell weitere "Lux stellt sich groß vor"-Momente.
 * Anders als die MasterIcon-Komponenten in pieceMasters.tsx (quadratische size-Prop, da
 * die Schachfiguren dort in quadratische Brett-/Kartenfelder passen müssen) nimmt diese
 * Komponente bewusst nur eine `width`-Prop und berechnet die Höhe aus dem echten
 * Seitenverhältnis — Lux ist deutlich höher als breit (sitzende Pose), ein quadratisches
 * `contain` würde das Bild unnötig verkleinern.
 */
export function LuxHeroIcon({ width = 220, pose, posenAusloeser }: LuxHeroIconProps) {
  return <LuxZustand breite={width} pose={pose} posenAusloeser={posenAusloeser} />;
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

type LuxEckIconProps = {
  size?: number;
  atmen?: boolean;
  pose?: LuxPose;
  posenAusloeser?: unknown;
};

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
export function LuxEckIcon({ size = 52, atmen = true, pose, posenAusloeser }: LuxEckIconProps) {
  const inhalt = <LuxZustand breite={size} pose={pose} posenAusloeser={posenAusloeser} />;
  return atmen ? <LuxAtem>{inhalt}</LuxAtem> : inhalt;
}
