// Paket 3 (2026-09-11): Schildkröte — Torfigur der Steinbrücke, Gegnerin im Kapitel
// „Die ganze Partie". Quelle: Grafiken/Schildkroete/V1/schildkroete_freigestellt_kandidat_v1.png
// (von Christian am 11.09. als Standfigur bestimmt). Beim Export (Python, nicht Teil der App)
// auf die Figur zugeschnitten, auf 420 px Breite verkleinert und das Alpha bereinigt: die
// Figur hatte durchgehend Deckkraft 252–253 (leicht durchscheinend) und vereinzelte
// Streupixel mit Deckkraft 1–2 — jetzt Deckkraft ≥ 245 → 255, < 8 → 0.
//
// Nachtrag (2026-09-15): Das Zustands-Rig V2 (schildkroete_state_rig_v2_pruefung_2026-09-11.md)
// lag seither fertig, aber ungenutzt im Archiv — auf der Karte blinzelte die Schildkröte nie,
// weil hier bis heute nur ein einzelnes Standbild verdrahtet war (Christian-Befund beim Testen:
// "Schildkröte schließt nicht die Augen"). Blinzeln nachgezogen, exakt nach dem Muster der
// Gefährten (gefaehrtenZustaende.tsx): Grund- und Blinzelbild sind pixelgleich registriert
// (Alphakanal-Differenz 0, RGB-Änderung ausschließlich y 70–183 / x 62–347 — die Augenpartie),
// deshalb genügt ZustandsTier ohne Leinwand-Rand wie bei den Gesten.
//
// Nachtrag 2 (2026-09-15, "alle Zustände einbinden"): Die beiden restlichen V2-Zustände
// "Panzer zu" und "Hervorschauen" lagen ebenfalls fertig und exportiert
// (assets/figuren/chesslynx_turtle_zustand_{panzer_zu,hervorschauen}.png, 420×768, gleicher
// Ausschnitt/Bodenlinie wie stehend/blinzeln — geprüft: identische Randmaße, "Hervorschauen"
// ist laut Produktionsnotiz pixelgleich zu "Panzer zu" bis auf den Kopf-Ausschnitt) — nur die
// Verdrahtung fehlte, wie im Prüfdokument selbst vermerkt ("Offen bleibt nur die Verdrahtung
// der Animation … in LuchsRevierKarte.tsx / src/lib/schildkroete.tsx"). Anders als beim
// Winken der Gefährten sind das ZWEI Bilder in Folge (zu → schauen), kein einzelnes Ein/Aus,
// deshalb ein eigener kleiner Taktgeber (`useSchildkroetenRueckzug`) statt `useGeste` aus
// ZustandsTier.tsx (das kennt nur eine Ebene). Während die Geste läuft, blinzelt die
// Schildkröte nicht (idle=false) — das registrierte Lid-Bild passt nur zur stehenden Figur,
// nicht zum eingezogenen Panzer.

import { Image } from "react-native";
import { useEffect, useState } from "react";
import { ZustandsTier } from "../components/ZustandsTier";

export const SCHILDKROETE_BILD = require("../../assets/figuren/chesslynx_turtle_light_export_gross.webp");
export const SCHILDKROETE_BLINZELN_BILD = require("../../assets/figuren/chesslynx_turtle_light_blinzeln_export_gross.webp");
export const SCHILDKROETE_PANZER_ZU_BILD = require("../../assets/figuren/chesslynx_turtle_light_panzer_zu_export_gross.webp");
export const SCHILDKROETE_HERVORSCHAUEN_BILD = require("../../assets/figuren/chesslynx_turtle_light_hervorschauen_export_gross.webp");
/** Höhe/Breite der exportierten Grafik (420 × 768 px). */
export const SCHILDKROETE_ASPEKT = 768 / 420;

// Rückzugsgeste: nach einer ruhigen, leicht zufälligen Pause zieht sich die Schildkröte für
// PANZER_ZU_MS in den Panzer zurück, schaut für HERVORSCHAUEN_MS wieder heraus und kehrt dann
// zur Grundhaltung zurück. Deutlich seltener als das Blinzeln, weil es die auffälligere Geste
// ist — sie soll als kleine Überraschung wirken, nicht als Tick.
const RUECKZUG_PAUSE_MIN_MS = 14000;
const RUECKZUG_PAUSE_MAX_MS = 24000;
const PANZER_ZU_MS = 900;
const HERVORSCHAUEN_MS = 1500;

function useSchildkroetenRueckzug(aktiv: boolean): "grund" | "zu" | "schauen" {
  const [phase, setPhase] = useState<"grund" | "zu" | "schauen">("grund");

  useEffect(() => {
    if (!aktiv) {
      setPhase("grund");
      return;
    }
    let abgebrochen = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const warte = (ms: number, tun: () => void) => {
      timers.push(setTimeout(() => {
        if (!abgebrochen) tun();
      }, ms));
    };

    const plane = () => {
      const pause = RUECKZUG_PAUSE_MIN_MS + Math.random() * (RUECKZUG_PAUSE_MAX_MS - RUECKZUG_PAUSE_MIN_MS);
      warte(pause, () => {
        setPhase("zu");
        warte(PANZER_ZU_MS, () => {
          setPhase("schauen");
          warte(HERVORSCHAUEN_MS, () => {
            setPhase("grund");
            plane();
          });
        });
      });
    };

    plane();
    return () => {
      abgebrochen = true;
      timers.forEach(clearTimeout);
    };
  }, [aktiv]);

  return phase;
}

/** Schildkröte als kleines Icon (gleiche Größenlogik wie die Tier-Icons: `size` = Höhe). Ohne Blinzeln — für Ruhmeshalle/Abzeichen-Kontexte, wo ein Standbild richtig ist. */
export function SchildkroeteIcon({ size = 38 }: { size?: number }) {
  return (
    <Image
      source={SCHILDKROETE_BILD}
      style={{ height: size, width: size / SCHILDKROETE_ASPEKT }}
      resizeMode="contain"
      accessibilityLabel="Schildkröte"
    />
  );
}

/**
 * Die Schildkröte als lebendige Wegmarke auf der Saga-Karte — blinzelt, wie die sechs
 * Quest-Tiere und die sechs Gefährten, und zieht sich dazu gelegentlich in den Panzer zurück
 * (siehe `useSchildkroetenRueckzug` oben). `breite` ist die Breite der FIGUR (kein
 * Leinwand-Rand nötig, siehe Kopfkommentar: alle vier Zustände teilen sich dieselbe
 * Silhouette/Bodenlinie). `blinzeln` steuert wie bisher beide Animationen zusammen — bei
 * `false` (gesperrt) steht die Schildkröte reglos im Nebel.
 */
export function SchildkroeteWegmarke({
  breite,
  blinzeln = true,
}: {
  breite: number;
  blinzeln?: boolean;
}) {
  const rueckzugPhase = useSchildkroetenRueckzug(blinzeln);
  return (
    <ZustandsTier
      grund={SCHILDKROETE_BILD}
      blinzeln={blinzeln ? SCHILDKROETE_BLINZELN_BILD : undefined}
      ebenen={[
        { bild: SCHILDKROETE_PANZER_ZU_BILD, aktiv: rueckzugPhase === "zu" },
        { bild: SCHILDKROETE_HERVORSCHAUEN_BILD, aktiv: rueckzugPhase === "schauen" },
      ]}
      breite={breite}
      hoehe={breite * SCHILDKROETE_ASPEKT}
      idle={blinzeln && rueckzugPhase === "grund"}
      accessibilityLabel="Schildkröte"
    />
  );
}
