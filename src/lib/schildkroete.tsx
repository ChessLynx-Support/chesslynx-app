// Paket 3 (2026-09-11): Schildkröte — Torfigur der Steinbrücke, Gegnerin im Kapitel
// „Die ganze Partie". Quelle: Grafiken/Schildkroete/V1/schildkroete_freigestellt_kandidat_v1.png
// (von Christian am 11.09. als Standfigur bestimmt). Beim Export (Python, nicht Teil der App)
// auf die Figur zugeschnitten, auf 420 px Breite verkleinert und das Alpha bereinigt: die
// Figur hatte durchgehend Deckkraft 252–253 (leicht durchscheinend) und vereinzelte
// Streupixel mit Deckkraft 1–2 — jetzt Deckkraft ≥ 245 → 255, < 8 → 0. Zweite Pose
// („Panzer zu", Wegpunkt-Animation #76) steht weiterhin aus.

import { Image } from "react-native";

export const SCHILDKROETE_BILD = require("../../assets/figuren/chesslynx_turtle_light_export_gross.png");
/** Höhe/Breite der exportierten Grafik (420 × 768 px). */
export const SCHILDKROETE_ASPEKT = 768 / 420;

/** Schildkröte als kleines Icon (gleiche Größenlogik wie die Tier-Icons: `size` = Höhe). */
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
