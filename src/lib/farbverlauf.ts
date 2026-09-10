// Kleine, gemeinsam genutzte Verlaufs-Hilfsfunktion (siehe Claude-Projekt "ChessLynx",
// Rückfrage 2026-09-09: "Im Spiel werden auf dem Schachbrett kleine Animationen verwendet ...
// ich würde hierfür gerne hochwertige Designs haben"). Mischt eine Hex-Markenfarbe Richtung
// Weiß/Schwarz, damit bisher flach gefüllte SVG-Icons/-Marker per RadialGradient/
// LinearGradient spürbares Volumen bekommen, ohne für jede Farbe von Hand einen zweiten
// Farbwert pflegen zu müssen. Bewusst KEINE externe Farb-Bibliothek (z. B. `color`/
// `tinycolor2`) — die App hat bisher keine einzige Farb-Hilfsbibliothek als Abhängigkeit,
// und diese eine kleine Funktion deckt den vollständigen Bedarf (helle/dunkle Verlaufs-Stops)
// bereits ab.
//
// Verwendet u. a. in: quest1/Board.tsx (ZielfeldMarker, SammelMarker, BedrohungsPuls,
// Kettenlinie), components/FortschrittsRing.tsx, lib/puzzleIcons.tsx, lib/sternenleiter.tsx,
// lib/freispielIcons.tsx.

function hexTeile(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [parseInt(n.substring(0, 2), 16), parseInt(n.substring(2, 4), 16), parseInt(n.substring(4, 6), 16)];
}

function hexZusammensetzen(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Mischt `hex` um `anteil` (0–1) Richtung Weiß — für den hellen Verlaufs-Stop (z. B. Glanzseite). */
export function hexAufhellen(hex: string, anteil: number): string {
  const [r, g, b] = hexTeile(hex);
  return hexZusammensetzen(r + (255 - r) * anteil, g + (255 - g) * anteil, b + (255 - b) * anteil);
}

/** Mischt `hex` um `anteil` (0–1) Richtung Schwarz — für den dunklen Verlaufs-Stop (z. B. Schattenseite). */
export function hexAbdunkeln(hex: string, anteil: number): string {
  const [r, g, b] = hexTeile(hex);
  return hexZusammensetzen(r * (1 - anteil), g * (1 - anteil), b * (1 - anteil));
}
