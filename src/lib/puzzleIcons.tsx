// Puzzle-Icon-System — vier Vektor-Icons für die geplanten Bonuskapitel-Rätsel. Siehe
// Claude-Projekt "ChessLynx", `produktionsanleitung_elemente.md`, Abschnitt 7.2
// ("Puzzle-Icon-System ... gehört noch nicht sichtbar"), und `projektwissen.md` für die
// zugrunde liegende Bedeutungs-Zuordnung:
//   Schild               = Figur gewinnen
//   Krone + Ausrufezeichen = Schach lösen
//   Krone + Stern         = Matt
//   Kette                 = Fesselung
//
// Status: produktionsreif, aber noch NICHT in einen Screen verdrahtet — die
// Bonuskapitel-Bildschirme selbst existieren noch nicht (siehe Produktionsliste,
// Abschnitt 6, Punkt D "Bonuskapitel"). Diese Datei liegt bereit, damit die Icons beim
// Bau dieser Screens direkt importiert werden können, statt sie dann unter Zeitdruck neu
// zu entwerfen.
//
// Stil: gleiche Vektor-Technik wie ChessLynxButton.tsx/FortschrittsRing.tsx
// (react-native-svg direkt im Code), gleiche Markenpalette (Gold #D7A52D, Terrakotta
// #C9855F, Salbeigrün #8FA888) — keine neuen Farben erfunden.

import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import { hexAufhellen, hexAbdunkeln } from "./farbverlauf";

/** Schild — "Figur gewinnen". */
export function SchildIcon({
  size = 32,
  farbe = "#C9855F",
  akzent = "#D7A52D",
}: {
  size?: number;
  farbe?: string;
  akzent?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        {/* Visuelle-Politur-Runde (2026-09-09): Verlauf statt Flatcolor, aus `farbe`
            abgeleitet (siehe lib/farbverlauf.ts) — bleibt bei abweichender Aufrufer-Farbe
            konsistent statt einen zweiten, unabhängigen Farbwert zu benötigen. */}
        <LinearGradient id="schildVerlauf" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(farbe, 0.22)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(farbe, 0.18)} />
        </LinearGradient>
      </Defs>
      <Path
        d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z"
        fill="url(#schildVerlauf)"
        stroke={akzent}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* Glanzstreifen links, gleiche Technik wie ChessLynxButton — macht aus der
          Flatcolor eine "veredelte" Fläche ohne zusätzliches Bild-Asset. */}
      <Path d="M16 3 L27 7 V15 C27 22 22 27 16 29 Z" fill="#FFFFFF" opacity={0.12} />
    </Svg>
  );
}

/** Krone mit Ausrufezeichen — "Schach lösen". */
export function KroneAusrufezeichenIcon({
  size = 32,
  kronenFarbe = "#D7A52D",
  akzentFarbe = "#C9855F",
}: {
  size?: number;
  kronenFarbe?: string;
  akzentFarbe?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="kroneVerlaufAusruf" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(kronenFarbe, 0.25)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(kronenFarbe, 0.15)} />
        </LinearGradient>
        <LinearGradient id="akzentVerlaufAusruf" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(akzentFarbe, 0.25)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(akzentFarbe, 0.15)} />
        </LinearGradient>
      </Defs>
      <Path
        d="M5 12 L11 18 L16 8 L21 18 L27 12 L25 23 H7 Z"
        fill="url(#kroneVerlaufAusruf)"
        stroke="#B5822A"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Circle cx={27} cy={24} r={6} fill="url(#akzentVerlaufAusruf)" stroke="#FFFFFF" strokeWidth={1.4} />
      <Rect x={25.7} y={20.5} width={2.6} height={4.6} rx={1.3} fill="#FFFFFF" />
      <Circle cx={27} cy={27} r={1.3} fill="#FFFFFF" />
    </Svg>
  );
}

/** Krone mit Stern — "Matt". */
export function KroneSternIcon({
  size = 32,
  kronenFarbe = "#D7A52D",
  akzentFarbe = "#8FA888",
}: {
  size?: number;
  kronenFarbe?: string;
  akzentFarbe?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="kroneVerlaufStern" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(kronenFarbe, 0.25)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(kronenFarbe, 0.15)} />
        </LinearGradient>
        <LinearGradient id="akzentVerlaufStern" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(akzentFarbe, 0.25)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(akzentFarbe, 0.15)} />
        </LinearGradient>
      </Defs>
      <Path
        d="M5 12 L11 18 L16 8 L21 18 L27 12 L25 23 H7 Z"
        fill="url(#kroneVerlaufStern)"
        stroke="#B5822A"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Circle cx={27} cy={24} r={6} fill="url(#akzentVerlaufStern)" stroke="#FFFFFF" strokeWidth={1.4} />
      <Path
        d="M27 20.5 L28.1 23 L30.6 23.3 L28.8 25 L29.3 27.5 L27 26.2 L24.7 27.5 L25.2 25 L23.4 23.3 L25.9 23 Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/** Kette — "Fesselung". */
export function KetteIcon({ size = 32, farbe = "#8B7A63" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        {/* Visuelle-Politur-Runde (2026-09-09): Verlaufs-Stroke statt Flatcolor — leicht
            metallischer Eindruck, dieselbe Technik wie die Kettenlinie in quest1/Board.tsx. */}
        <LinearGradient id="ketteVerlauf" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={hexAufhellen(farbe, 0.3)} />
          <Stop offset="100%" stopColor={hexAbdunkeln(farbe, 0.2)} />
        </LinearGradient>
      </Defs>
      <Path d="M11 8 a5 5 0 0 1 7 7 l-3 3" fill="none" stroke="url(#ketteVerlauf)" strokeWidth={3} strokeLinecap="round" />
      <Path d="M21 24 a5 5 0 0 1 -7 -7 l3 -3" fill="none" stroke="url(#ketteVerlauf)" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Sternenleiter — Puzzle-Ziel-Icon für "Figurenwert" (welche Figur ist mehr wert?). Zwei
 * ungleich hohe Sternreihen nebeneinander, dieselbe visuelle Idee wie die ausführliche
 * Sternenleiter-Darstellung in lib/sternenleiter.tsx, hier nur stark verkleinert als
 * Miniatur-Icon (kein eigenes Kapitel-Abzeichen nötig, siehe bonuskapitel_screen_skripte.md,
 * Abschnitt "Icon-System": dieses Icon markiert bereits eindeutig genug "Figurenwert-Aufgabe").
 */
export function SternenleiterIcon({ size = 32, farbe = "#D7A52D" }: { size?: number; farbe?: string }) {
  const stern = (cx: number, cy: number, r: number) =>
    `M${cx} ${cy - r} L${cx + r * 0.22} ${cy - r * 0.28} L${cx + r} ${cy - r * 0.24} L${cx + r * 0.38} ${cy + r * 0.16} L${cx + r * 0.6} ${cy + r} L${cx} ${cy + r * 0.5} L${cx - r * 0.6} ${cy + r} L${cx - r * 0.38} ${cy + r * 0.16} L${cx - r} ${cy - r * 0.24} L${cx - r * 0.22} ${cy - r * 0.28} Z`;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {/* Linke Säule: eine Reihe (niedrigerer Wert). */}
      <Path d={stern(9, 22, 3)} fill={farbe} />
      {/* Rechte Säule: zwei Reihen (höherer Wert) — bewusst höher, damit der Höhenvergleich
          schon im Miniatur-Icon erkennbar ist. */}
      <Path d={stern(22, 22, 3)} fill={farbe} />
      <Path d={stern(22, 14, 3)} fill={farbe} />
    </Svg>
  );
}

/**
 * Rochade — rundes KAPITEL-ABZEICHEN (nicht Puzzle-Ziel-Icon), siehe
 * bonuskapitel_screen_skripte.md, Abschnitt "Icon-System": Rochade ist eine Zugart, keine
 * Aufgabenstellung, verdient deshalb kein Puzzle-Ziel-Icon wie Schild/Kette/Krone — nur ein
 * Abschluss-Abzeichen für "dieses Kapitel ist geschafft". Verschränkte Turm+König-Silhouette
 * in einem runden Rahmen, gleiche Markenpalette wie die übrigen Icons dieser Datei.
 */
export function RochadeIcon({ size = 32, farbe = "#8FA888" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={farbe} fillOpacity={0.16} stroke={farbe} strokeWidth={1.6} />
      {/* Turm (links): einfacher Zinnen-Umriss. */}
      <Path
        d="M8 24 V15 H9 V13 H11 V15 H12 V13 H14 V15 H15 V24 Z"
        fill="#8B7A63"
        stroke="#6E6050"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {/* König (rechts): einfache Krone, leicht überlappend mit dem Turm — die
          "verschränkte" Rochade-Geste. */}
      <Path
        d="M15 24 V19 L13.5 15 L17 17 L19 13 L21 17 L24.5 15 L23 19 V24 Z"
        fill="#D7A52D"
        stroke="#B5822A"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Matt in 2 — rundes KAPITEL-ABZEICHEN, unterscheidbar vom Matt-in-1-Puzzle-Ziel-Icon
 * (KroneSternIcon) aus Quest 6, siehe bonuskapitel_screen_skripte.md, Abschnitt "Icon-System"
 * und projektwissen.md ("Matt in 2: eigenes rundes Abzeichen, unterscheidbar vom
 * Matt-in-1-Icon"). Bewusst OHNE Ziffer "2" (App-Grundsatz: keine sichtbare Schrift in
 * Icons/Grafiken, siehe produktionsanleitung_elemente.md) — stattdessen ZWEI überlappende,
 * unterschiedlich große Kronen, die "zwei kluge Schritte" (Lux' eigene Formulierung im
 * Abschluss-Screen) rein visuell andeuten, ohne eine Zahl zu benutzen. Das Puzzle-Ziel-Icon
 * für die eigentlichen Matt-Aufgaben bleibt unverändert KroneSternIcon (siehe
 * bonuskapitel_screen_skripte.md: "Puzzle-Ziel-Icon bleibt das bekannte Krone+Stern") — dieses
 * Icon hier markiert ausschließlich den Kapitelabschluss.
 */
export function MattIn2Icon({ size = 32, farbe = "#D7A52D" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={farbe} fillOpacity={0.16} stroke={farbe} strokeWidth={1.6} />
      {/* Hintere Krone (größer, oben links) — erste der "zwei Kronen". */}
      <Path
        d="M6 20 L8.5 13 L11.5 18 L14.5 10 L17.5 18 L20.5 13 L23 20 Z"
        fill="#C9855F"
        stroke="#A9694A"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {/* Vordere Krone (kleiner, unten rechts, überlappend) — zweite der "zwei Kronen". */}
      <Path
        d="M13 25 L14.6 20.5 L16.6 24 L18.6 19.5 L20.6 24 L22.6 20.5 L24.2 25 Z"
        fill={farbe}
        stroke="#B5822A"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Extra-Sternchen — rundes KAPITEL-ABZEICHEN für das optionale Matt-in-3-Bonuskapitel, siehe
 * bonuskapitel_screen_skripte.md: "eigenes 'Extra-Sternchen'-Abzeichen (auffälliger/
 * glitzernder als die anderen Kapitel-Abzeichen), bewusst NICHT das Matt-in-2-Abzeichen."
 * Umgesetzt als ein großer zentraler Stern (dieselbe 10-Punkt-Sternformel wie
 * SternenleiterIcon) plus vier kleine funkelnde Zusatzsternchen ringsum — der Größen-/
 * Anzahl-Unterschied zu den übrigen, ruhigeren Abzeichen dieser Datei macht das "Extra"
 * sichtbar, ohne Text oder Ziffern zu benutzen.
 */
export function ExtraSternchenIcon({ size = 32, farbe = "#D7A52D" }: { size?: number; farbe?: string }) {
  const stern = (cx: number, cy: number, r: number) =>
    `M${cx} ${cy - r} L${cx + r * 0.22} ${cy - r * 0.28} L${cx + r} ${cy - r * 0.24} L${cx + r * 0.38} ${cy + r * 0.16} L${cx + r * 0.6} ${cy + r} L${cx} ${cy + r * 0.5} L${cx - r * 0.6} ${cy + r} L${cx - r * 0.38} ${cy + r * 0.16} L${cx - r} ${cy - r * 0.24} L${cx - r * 0.22} ${cy - r * 0.28} Z`;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={farbe} fillOpacity={0.16} stroke={farbe} strokeWidth={1.6} />
      {/* Vier kleine Funkelsternchen ringsum — das "glitzernde" Extra gegenüber den anderen
          Abzeichen. */}
      <Path d={stern(7, 9, 1.6)} fill="#FFFFFF" />
      <Path d={stern(25, 9, 1.6)} fill="#FFFFFF" />
      <Path d={stern(7, 24, 1.6)} fill="#FFFFFF" />
      <Path d={stern(25, 24, 1.6)} fill="#FFFFFF" />
      {/* Großer zentraler Stern. */}
      <Path d={stern(16, 16, 7)} fill={farbe} stroke="#B5822A" strokeWidth={0.6} strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Kronen-Bauer — rundes KAPITEL-ABZEICHEN für die optionale Umwandlungs-Kür, siehe
 * `gefaehrten_wisent_lichess_sprechtexte_final.md`, Abschnitt 7: "Bauern-Silhouette mit
 * kleiner Krone darüber — bleibt als Bauer erkennbar (zeigt die Fähigkeit, nicht nur das
 * Ergebnis)." Bewusst dieselbe Kreis-Rahmen-Technik wie RochadeIcon/MattIn2Icon oben (runder
 * Rahmen, zwei Ebenen: schlichte Bauern-Silhouette unten, Krone obendrauf), damit die drei
 * neuen Kür-Abzeichen (dieses, SchattenSprungIcon unten, ExtraSternchenIcon von Matt in 3)
 * als erkennbare Familie wirken, siehe screens/WisentKuerHub.tsx.
 */
export function KronenBauerIcon({ size = 32, farbe = "#D7A52D" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={farbe} fillOpacity={0.16} stroke={farbe} strokeWidth={1.6} />
      {/* Bauern-Silhouette: Kopf, Kragen, Sockel — dieselbe vereinfachte Form wie die
          Bauer-Kontur in chessPieces.tsx, hier nur klein als Abzeichen-Motiv. */}
      <Path
        d="M16 19 A3.4 3.4 0 1 0 16 12.2 A3.4 3.4 0 1 0 16 19 Z M12.5 22 H19.5 L21 26 H11 Z"
        fill="#8B7A63"
        stroke="#6E6050"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {/* Kleine Krone über dem Bauernkopf — das "Extra", das ihn von einem gewöhnlichen
          Bauern unterscheidet. */}
      <Path
        d="M11.5 11 L13 7.5 L16 10 L19 7.5 L20.5 11 Z"
        fill={farbe}
        stroke="#B5822A"
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Schatten-Sprung — rundes KAPITEL-ABZEICHEN für die optionale En-passant-Kür, siehe
 * `gefaehrten_wisent_lichess_sprechtexte_final.md`, Abschnitt 7: "Bauern-Silhouette mit
 * zartem, halbtransparentem zweitem Umriss schräg dahinter (Bewegungsspur) — bewusst kein
 * Uhr-/Blitzsymbol (kein Zeitdruck)." Dieselbe Bauern-Grundform wie KronenBauerIcon oben,
 * hier ohne Krone, dafür mit einem zweiten, versetzten und halbtransparenten Umriss.
 */
export function SchattenSprungIcon({ size = 32, farbe = "#8FA888" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={15} fill={farbe} fillOpacity={0.16} stroke={farbe} strokeWidth={1.6} />
      {/* Bewegungsspur: dieselbe Bauern-Silhouette, kleiner und nach links oben versetzt,
          halbtransparent — "schräg dahinter", VOR der eigentlichen Figur gerendert, damit sie
          dahinter liegend wirkt. */}
      <Path
        d="M12 16.5 A2.8 2.8 0 1 0 12 11 A2.8 2.8 0 1 0 12 16.5 Z M9 19 H15 L16.2 22.4 H7.8 Z"
        fill="#8B7A63"
        opacity={0.32}
      />
      {/* Eigentliche Bauern-Silhouette, unverschattet, rechts unten. */}
      <Path
        d="M17 20.5 A3.2 3.2 0 1 0 17 14.1 A3.2 3.2 0 1 0 17 20.5 Z M13.7 23.3 H20.3 L21.7 27 H12.3 Z"
        fill="#8B7A63"
        stroke="#6E6050"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
