// Waldthematische Ersatz-Icons für die bisher rein funktionalen Strichzeichnungen in
// FreispielPartie.tsx (`PfeilLinksIcon`/`NochmalIcon`) — siehe Claude-Projekt
// "ChessLynx", `produktionsanleitung_elemente.md`, Abschnitt 7.2 ("Freispiel:
// PfeilLinksIcon/NochmalIcon ... ablösen durch gemalte, waldthematische Varianten").
//
// Bewusster Ansatz: die bereits bewährte, geometrisch korrekte Pfeil-Grundform bleibt
// UNVERÄNDERT erhalten (exakt dieselben Pfade wie zuvor) — ergänzt nur um kleine
// Farn-/Blatt-Akzente, statt eine neue Form zu riskieren, die sich ohne visuelle Vorschau
// in dieser Umgebung nicht gegenprüfen lässt. Gleiche Prop-Signatur (`size`, `farbe`) wie
// die abgelösten Originale — Drop-in-Ersatz an allen drei Aufrufstellen in
// FreispielPartie.tsx (Kopfzeile-Zurück, Ergebnis-Nochmal, Ergebnis-Zurück).

import Svg, { Ellipse, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { hexAufhellen, hexAbdunkeln } from "./farbverlauf";

/**
 * Zurück-Pfeil mit zwei kleinen Farn-Blättchen am Stängel — löst `PfeilLinksIcon` ab.
 * Der Pfeil selbst (bewährte Geometrie) wird zuletzt gerendert, damit er über den
 * Blättchen scharf und eindeutig lesbar bleibt.
 *
 * Visuelle-Politur-Runde (2026-09-09): nur die Blatt-Akzente bekommen einen dezenten
 * Verlauf (siehe lib/farbverlauf.ts) — die "bewährte" Pfeil-Geometrie selbst bleibt
 * bewusst unverändert (siehe Datei-Kommentar oben).
 */
export function FarnZurueckIcon({ size = 22, farbe = "#4A4038" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="farnBlattVerlauf" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(farbe, 0.35)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(farbe, 0.1)} />
        </LinearGradient>
      </Defs>
      <Path d="M15 12 C11 12 8 10.5 6.5 8" fill="none" stroke={farbe} strokeWidth={1.3} strokeLinecap="round" opacity={0.55} />
      <Ellipse cx={9} cy={9.4} rx={2.1} ry={1} rotation={-35} originX={9} originY={9.4} fill="url(#farnBlattVerlauf)" opacity={0.5} />
      <Ellipse cx={12.5} cy={11.2} rx={2.1} ry={1} rotation={-18} originX={12.5} originY={11.2} fill="url(#farnBlattVerlauf)" opacity={0.5} />
      <Path d="M15 4 L7 12 L15 20" fill="none" stroke={farbe} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Kreisförmiger "Nochmal"-Pfeil mit kleinem Blatt-Akzent — löst `NochmalIcon` ab.
 * Bogen-Geometrie unverändert gegenüber dem Original (bewährt), nur um das Blatt ergänzt.
 */
export function BlattNochmalIcon({ size = 24, farbe = "#FFFFFF" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="nochmalBlattVerlauf" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={farbe} stopOpacity={0.95} />
          <Stop offset="100%" stopColor={hexAbdunkeln(farbe, 0.15)} stopOpacity={0.7} />
        </LinearGradient>
      </Defs>
      <Path
        d="M4 12a8 8 0 1 1 2.6 5.9M4 12V6M4 12H10"
        fill="none"
        stroke={farbe}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Ellipse cx={14} cy={5.4} rx={2.2} ry={1.1} rotation={35} originX={14} originY={5.4} fill="url(#nochmalBlattVerlauf)" opacity={0.8} />
    </Svg>
  );
}
