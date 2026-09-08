// Detailreiche Tier-Illustrationen für die sechs Quest-Figuren, als React-Native-SVG-
// Komponenten (nicht als hart eingebettete PNG-Assets) — damit bleiben sie in jeder
// Bildschirmgröße scharf und ohne zusätzliche Bild-Dateien im Bundle.
//
// Stil und Farbpalette folgen strikt `chesslynx-export/konzept/gesamtbriefing_
// illustrationsassets.md` Abschnitt 1 (identisch mit `lux-maskottchen-und-palette.svg`):
// gedämpfte Pastelltöne, durchgehend abgerundete Formen, große freundliche Augen mit
// weißem Lichtpunkt, angedeutete Fell-/Feder-Textur über wiederholte Striche statt
// Fotorealismus, niemals bedrohliche Haltungen. Jede Figur ist in einer bewegungs-
// typischen Pose gezeichnet (siehe Kommentar je Komponente), wie in dieser Session mit
// dem Nutzer abgestimmt.
//
// Jede Komponente rendert quadratisch (viewBox 0 0 100 100) und nimmt eine `size`-Prop
// entgegen; `Board.tsx` platziert sie an der Stelle des bisherigen Platzhalter-Punkts.

import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";

type IconProps = { size?: number };

const SHADOW = "rgba(0,0,0,0.08)";

/** Bauer/Igel — Quest 1. Pose: nach vorn geneigt, Schritt nach vorn (Bauer zieht geradeaus). */
export function IgelIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={52} cy={86} rx={10} ry={5} fill={SHADOW} />
      <G transform="rotate(-6 50 55)">
        <Ellipse cx={34} cy={80} rx={7} ry={6} fill="#A66A4A" />
        <Ellipse cx={62} cy={83} rx={8} ry={7} fill="#A66A4A" />
        <Path d="M20 55 Q16 40 26 26 Q30 40 30 52 Z" fill="#A66A4A" />
        <Path d="M28 40 Q26 24 38 14 Q40 30 36 44 Z" fill="#C9855F" />
        <Path d="M42 32 Q44 16 58 12 Q56 28 50 40 Z" fill="#A66A4A" />
        <Path d="M56 34 Q64 20 78 22 Q70 34 62 44 Z" fill="#C9855F" />
        <Path d="M64 44 Q76 36 86 44 Q76 48 66 54 Z" fill="#A66A4A" />
        <Ellipse cx={50} cy={58} rx={34} ry={26} fill="#C9855F" />
        <Ellipse cx={58} cy={66} rx={20} ry={16} fill="#F0DFC0" />
        <Ellipse cx={76} cy={66} rx={9} ry={7} fill="#F0DFC0" />
        <Circle cx={83} cy={65} r={2.4} fill="#3A2A1E" />
        <Circle cx={64} cy={58} r={4.2} fill="#3A2A1E" />
        <Circle cx={62.7} cy={56.3} r={1.4} fill="#FFFFFF" />
        <Ellipse cx={50} cy={38} rx={6} ry={7} fill="#C9855F" />
        <Ellipse cx={50} cy={39} rx={3} ry={4} fill="#E3A98B" />
      </G>
    </Svg>
  );
}

/**
 * Turm/Bär — Quest 2. Pose: aufrecht, standfest, breite Schulterpartie (zieht sicher
 * und kraftvoll geradeaus/seitwärts, wie der Turm). Ersetzt am 2026-09-06 die bisherige
 * SchildkroeteIcon (siehe projektwissen.md, Läufer/Turm-Umbenennung vom 2026-09-05 —
 * war damals nur dokumentiert, jetzt tatsächlich im Code nachgezogen).
 */
export function BaerIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={28} ry={5} fill={SHADOW} />
      {/* Arme VOR dem Rumpf gezeichnet (Lehre aus dem Design-Canvas-Feinschliff vom
          2026-09-05: sonst entsteht eine harte Sichtkante an der Schulter). */}
      <Ellipse cx={24} cy={66} rx={9} ry={13} fill="#8B6B47" />
      <Ellipse cx={76} cy={66} rx={9} ry={13} fill="#8B6B47" />
      <Ellipse cx={22} cy={77} rx={6} ry={5} fill="#C9A876" opacity={0.85} />
      <Ellipse cx={78} cy={77} rx={6} ry={5} fill="#C9A876" opacity={0.85} />
      <Path d="M17 74 L14 79 M20 76 L18 81" stroke="#5A3A22" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
      <Path d="M83 74 L86 79 M80 76 L82 81" stroke="#5A3A22" strokeWidth={1} strokeLinecap="round" opacity={0.6} />
      <Ellipse cx={38} cy={90} rx={10} ry={7} fill="#6E4A2E" />
      <Ellipse cx={62} cy={90} rx={10} ry={7} fill="#6E4A2E" />
      <Ellipse cx={50} cy={62} rx={30} ry={26} fill="#8B6B47" />
      <Ellipse cx={50} cy={70} rx={16} ry={14} fill="#C9A876" />
      <Path d="M40 66 Q50 72 60 66 M42 74 Q50 78 58 74" stroke="#A9885E" strokeWidth={1} fill="none" opacity={0.6} />
      <Ellipse cx={50} cy={33} rx={20} ry={18} fill="#8B6B47" />
      <Ellipse cx={31} cy={19} rx={8} ry={8} fill="#8B6B47" />
      <Ellipse cx={69} cy={19} rx={8} ry={8} fill="#8B6B47" />
      <Ellipse cx={31} cy={19} rx={4} ry={4} fill="#6E4A2E" />
      <Ellipse cx={69} cy={19} rx={4} ry={4} fill="#6E4A2E" />
      <Ellipse cx={50} cy={41} rx={11} ry={9} fill="#C9A876" />
      <Ellipse cx={50} cy={39} rx={4} ry={3} fill="#5A3A22" />
      <Circle cx={40} cy={29} r={3.4} fill="#3A2A1E" />
      <Circle cx={38.8} cy={27.7} r={1.1} fill="#FFFFFF" />
      <Circle cx={60} cy={29} r={3.4} fill="#3A2A1E" />
      <Circle cx={58.8} cy={27.7} r={1.1} fill="#FFFFFF" />
    </Svg>
  );
}

/**
 * Läufer/Eule — Quest 3. Pose: leicht diagonal geneigt, Flügel angedeutet gespreizt
 * (zieht schräg, wie der Läufer). Ersetzt am 2026-09-06 die bisherige WieselIcon (siehe
 * Kommentar bei BaerIcon oben).
 */
export function EuleIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={52} cy={90} rx={24} ry={5} fill={SHADOW} />
      <G transform="rotate(-14 50 55)">
        <Ellipse cx={50} cy={58} rx={22} ry={28} fill="#A9885E" />
        {/* Flügel NACH dem Körper und in eigener Farbe gezeichnet (Lehre aus dem
            Design-Canvas-Fund vom 2026-09-05: gleiche Füllfarbe + falsche Reihenfolge
            machte dort einen Flügel unsichtbar). */}
        <Path d="M30 40 Q14 52 20 76 Q30 68 34 52 Z" fill="#8B6B47" />
        <Path d="M70 40 Q86 52 80 76 Q70 68 66 52 Z" fill="#8B6B47" />
        <Ellipse cx={50} cy={66} rx={11} ry={14} fill="#F0E6D2" />
        <Path
          d="M42 58 Q50 62 58 58 M43 68 Q50 72 57 68 M44 78 Q50 81 56 78"
          stroke="#C9B48A"
          strokeWidth={1.2}
          fill="none"
        />
        <Ellipse cx={50} cy={34} rx={18} ry={16} fill="#A9885E" />
        <Path d="M36 22 L32 10 L42 18 Z" fill="#8B6B47" />
        <Path d="M64 22 L68 10 L58 18 Z" fill="#8B6B47" />
        <Circle cx={42} cy={32} r={7} fill="#F0E6D2" />
        <Circle cx={58} cy={32} r={7} fill="#F0E6D2" />
        <Circle cx={42} cy={32} r={4.2} fill="#F0A93C" />
        <Circle cx={58} cy={32} r={4.2} fill="#F0A93C" />
        <Circle cx={42} cy={32} r={2} fill="#3A2A1E" />
        <Circle cx={58} cy={32} r={2} fill="#3A2A1E" />
        <Circle cx={41} cy={30.8} r={0.7} fill="#FFFFFF" />
        <Circle cx={57} cy={30.8} r={0.7} fill="#FFFFFF" />
        <Path d="M47 38 L53 38 L50 44 Z" fill="#D98E72" />
        <Path d="M46 78 L42 84 M54 78 L58 84" stroke="#D98E72" strokeWidth={2.4} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** Springer/Pferd — Quest 4. Pose: Sprung/Aufbäumen, Vorderbeine oben (der L-Sprung). */
export function PferdIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={90} rx={26} ry={5} fill={SHADOW} />
      <Path d="M56 70 L64 70 L64 90 L56 90 Z" fill="#6E4A2E" />
      <Path d="M68 72 L76 72 L76 90 L68 90 Z" fill="#6E4A2E" />
      <Ellipse cx={66} cy={62} rx={20} ry={17} fill="#A97C4F" />
      <Path d="M50 70 Q32 68 26 48 Q34 38 48 42 Q58 46 58 62 Z" fill="#A97C4F" />
      <Path d="M32 56 Q24 62 18 58 Q22 50 30 48 Z" fill="#6E4A2E" />
      <Path d="M40 48 Q34 58 26 60 Q28 50 36 44 Z" fill="#6E4A2E" />
      <Path d="M38 22 Q28 32 32 46 Q38 36 42 26 Z" fill="#6E4A2E" />
      <Path d="M46 19 Q38 30 40 44 Q46 34 50 24 Z" fill="#6E4A2E" />
      <Path
        d="M14 34 Q10 30 12 26 Q16 22 22 24 Q20 18 24 14 Q32 10 38 16 Q42 20 40 26 Q40 32 34 36 Q24 40 16 38 Q13 37 14 34 Z"
        fill="#A97C4F"
      />
      <Path d="M24 15 L20 5 L29 13 Z" fill="#6E4A2E" />
      <Path d="M34 15 L38 5 L30 13 Z" fill="#6E4A2E" />
      <Circle cx={27} cy={24} r={3} fill="#3A2A1E" />
      <Circle cx={26} cy={22.8} r={1} fill="#FFFFFF" />
      <Ellipse cx={13} cy={32} rx={2.2} ry={1.6} fill="#5A3A22" />
    </Svg>
  );
}

/** Dame/Schwan — Quest 5. Pose: Flügel elegant gespreizt (Weitblick/Bewegung in alle Richtungen). */
export function SchwanIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={52} cy={90} rx={28} ry={5} fill={SHADOW} />
      <Path
        d="M56 68 Q78 68 90 48 Q94 34 88 22 Q90 40 78 52 Q68 62 54 60 Z"
        fill="#FFFFFF"
        stroke="#D8D2C4"
        strokeWidth={1.5}
      />
      <Path d="M64 58 Q78 52 84 36 M60 62 Q74 58 82 44" fill="none" stroke="#D8D2C4" strokeWidth={1.3} strokeLinecap="round" />
      <Path
        d="M44 68 Q22 68 10 48 Q6 34 12 22 Q10 40 22 52 Q32 62 46 60 Z"
        fill="#FFFFFF"
        stroke="#D8D2C4"
        strokeWidth={1.5}
      />
      <Path d="M36 58 Q22 52 16 36 M40 62 Q26 58 18 44" fill="none" stroke="#D8D2C4" strokeWidth={1.3} strokeLinecap="round" />
      <Ellipse cx={50} cy={70} rx={24} ry={19} fill="#FFFFFF" stroke="#D8D2C4" strokeWidth={1.5} />
      <Path
        d="M44 55 Q28 50 30 32 Q31 19 48 17 Q38 22 37 33 Q36 46 52 51 Z"
        fill="#FFFFFF"
        stroke="#D8D2C4"
        strokeWidth={1.5}
      />
      <Ellipse cx={46} cy={18} rx={9} ry={8} fill="#FFFFFF" stroke="#D8D2C4" strokeWidth={1.5} />
      <Path d="M54 17 Q64 16 66 20 Q62 22 54 21 Z" fill="#D98E72" />
      <Circle cx={65} cy={19} r={1.3} fill="#8B5A34" />
      <Circle cx={47} cy={16} r={2.4} fill="#3A2A1E" />
      <Circle cx={46.3} cy={15.2} r={0.8} fill="#FFFFFF" />
    </Svg>
  );
}

/** König/Hirsch — Quest 6. Pose: ruhig, aufrecht, würdevoll (der "Wichtigste von allen"). */
export function HirschIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={28} ry={5} fill={SHADOW} />
      <Path d="M34 72 L41 72 L41 92 L34 92 Z" fill="#8B6B47" />
      <Path d="M60 72 L67 72 L67 92 L60 92 Z" fill="#8B6B47" />
      <Ellipse cx={50} cy={66} rx={26} ry={20} fill="#C9855F" />
      <Ellipse cx={50} cy={74} rx={14} ry={11} fill="#F0DFC0" />
      <Path
        d="M38 30 Q30 18 20 18 Q28 24 28 32 M38 30 Q34 14 24 10 Q32 18 32 28"
        stroke="#A9855F"
        strokeWidth={3.4}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M62 30 Q70 18 80 18 Q72 24 72 32 M62 30 Q66 14 76 10 Q68 18 68 28"
        stroke="#A9855F"
        strokeWidth={3.4}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={50} cy={38} rx={16} ry={15} fill="#C9855F" />
      <Ellipse cx={32} cy={32} rx={6} ry={9} fill="#C9855F" transform="rotate(-30 32 32)" />
      <Ellipse cx={68} cy={32} rx={6} ry={9} fill="#C9855F" transform="rotate(30 68 32)" />
      <Ellipse cx={50} cy={48} rx={8} ry={6} fill="#F0DFC0" />
      <Circle cx={50} cy={50} r={2} fill="#3A2A1E" />
      <Circle cx={41} cy={36} r={3.6} fill="#3A2A1E" />
      <Circle cx={39.8} cy={34.6} r={1.2} fill="#FFFFFF" />
      <Circle cx={59} cy={36} r={3.6} fill="#3A2A1E" />
      <Circle cx={57.8} cy={34.6} r={1.2} fill="#FFFFFF" />
    </Svg>
  );
}
