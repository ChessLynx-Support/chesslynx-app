// Illustrationen der sechs Waldgefährten (Endlosmodus-Landesherren: Eichhörnchen, Fuchs,
// Dachs, Adlerin, Wolf, Wisent) als React-Native-SVG-Komponenten — analog zu
// `creatures.tsx` (die sechs Quest-Tiere), aber bewusst eine eigene Datei, weil es sich
// terminologisch um eine andere Gruppe handelt (siehe projektwissen.md, Abschnitt
// "Endlosmodus": "Waldgefährten" ≠ die sechs Quest-Tiere).
//
// Diese Icons werden zunächst NUR im neuen Freispiel-Modus verwendet (Rang-Abzeichen in
// der Übungslichtung-Liste, siehe endlosmodus_freispiel_konzept.md) — die aufwendigeren,
// mehrschichtigen Illustrationen derselben Tiere im Design-Canvas (`WeltkarteVollstaendig
// .dc.html`) sind ein separates, für die spätere echte Waldgefährten-Kampagnenkarte
// vorgesehenes Kunstwerk und werden hier bewusst nicht 1:1 übernommen (andere Zielgröße:
// kleine Listeneinträge statt große Kartenmarker). Stil/Palette folgen denselben
// Grundsätzen wie creatures.tsx: gedämpfte Pastelltöne, runde Formen, keine bedrohliche
// Haltung.
//
// Jede Komponente rendert quadratisch (viewBox 0 0 100 100) und nimmt eine `size`-Prop
// entgegen, identisch zum Muster in creatures.tsx.

import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";

type IconProps = { size?: number };

const SHADOW = "rgba(0,0,0,0.08)";

/** Eichhörnchen — Freispiel Rang 1-3 (250/300/350 Elo). Pose: aufrecht sitzend, buschiger Schwanz über dem Rücken. */
export function EichhoernchenIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={22} ry={5} fill={SHADOW} />
      <Path
        d="M62 78 Q86 74 88 48 Q90 28 72 20 Q84 34 80 52 Q76 72 58 76 Z"
        fill="#B5652E"
      />
      <Path
        d="M64 74 Q82 70 82 50 Q82 34 70 26 Q78 38 76 52 Q74 66 60 70 Z"
        fill="#E3A98B"
        opacity={0.7}
      />
      <Ellipse cx={38} cy={90} rx={9} ry={6} fill="#8A4A22" />
      <Ellipse cx={54} cy={90} rx={7} ry={5} fill="#8A4A22" />
      <Ellipse cx={46} cy={64} rx={22} ry={22} fill="#C9855F" />
      <Ellipse cx={46} cy={72} rx={12} ry={11} fill="#F0DFC0" />
      <Ellipse cx={44} cy={34} rx={15} ry={14} fill="#C9855F" />
      <Path d="M32 24 L28 12 L38 20 Z" fill="#C9855F" />
      <Path d="M52 24 L58 12 L48 20 Z" fill="#C9855F" />
      <Ellipse cx={40} cy={38} rx={7} ry={6} fill="#F0DFC0" />
      <Circle cx={34} cy={32} r={3.2} fill="#3A2A1E" />
      <Circle cx={32.9} cy={30.8} r={1.1} fill="#FFFFFF" />
      <Ellipse cx={38} cy={40} rx={1.6} ry={1.2} fill="#5A3A22" />
      <Path d="M55 62 Q60 64 62 60" stroke="#8A4A22" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Fuchs — Freispiel Rang 1-2 (400/450 Elo). Pose: wach sitzend, Kopf leicht schräg. */
export function FuchsIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={26} ry={5} fill={SHADOW} />
      <Ellipse cx={36} cy={90} rx={9} ry={6} fill="#B5482A" />
      <Ellipse cx={64} cy={90} rx={9} ry={6} fill="#B5482A" />
      <Path
        d="M70 78 Q90 82 88 64 Q86 72 74 72 Z"
        fill="#D9723D"
      />
      <Path d="M84 66 Q92 68 92 62 Q88 64 84 64 Z" fill="#F5F0E6" />
      <Ellipse cx={50} cy={62} rx={26} ry={22} fill="#D9723D" />
      <Path d="M34 68 Q50 78 66 68 Q66 82 50 84 Q34 82 34 68 Z" fill="#F5F0E6" />
      <G transform="rotate(-8 50 40)">
        <Path d="M28 26 L18 8 L36 20 Z" fill="#D9723D" />
        <Path d="M72 26 L82 8 L64 20 Z" fill="#D9723D" />
        <Path d="M27 20 L23 12 L32 18 Z" fill="#3A2A1E" />
        <Path d="M73 20 L77 12 L68 18 Z" fill="#3A2A1E" />
      </G>
      <Ellipse cx={50} cy={40} rx={20} ry={17} fill="#D9723D" />
      <Path d="M38 46 Q50 54 62 46 Q60 40 50 40 Q40 40 38 46 Z" fill="#F5F0E6" />
      <Circle cx={40} cy={36} r={3.2} fill="#3A2A1E" />
      <Circle cx={38.9} cy={34.8} r={1.1} fill="#FFFFFF" />
      <Circle cx={60} cy={36} r={3.2} fill="#3A2A1E" />
      <Circle cx={58.9} cy={34.8} r={1.1} fill="#FFFFFF" />
      <Path d="M47 46 L53 46 L50 50 Z" fill="#3A2A1E" />
    </Svg>
  );
}

/** Dachs — Freispiel Rang 1-2 (500/550 Elo). Pose: frontal, erdverbunden, Gesichtsstreifen. */
export function DachsIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={26} ry={5} fill={SHADOW} />
      <Ellipse cx={36} cy={88} rx={8} ry={6} fill="#3A342E" />
      <Ellipse cx={64} cy={88} rx={8} ry={6} fill="#3A342E" />
      <Ellipse cx={50} cy={62} rx={28} ry={24} fill="#8B8378" />
      <Path d="M32 58 Q50 70 68 58 Q66 78 50 80 Q34 78 32 58 Z" fill="#F5F0E6" />
      <Ellipse cx={32} cy={26} rx={9} ry={9} fill="#3A342E" />
      <Ellipse cx={68} cy={26} rx={9} ry={9} fill="#3A342E" />
      <Ellipse cx={50} cy={38} rx={20} ry={19} fill="#F5F0E6" />
      <Path d="M38 22 Q42 40 40 52 Q34 42 34 26 Z" fill="#3A342E" />
      <Path d="M62 22 Q58 40 60 52 Q66 42 66 26 Z" fill="#3A342E" />
      <Ellipse cx={50} cy={48} rx={7} ry={6} fill="#4A4038" />
      <Circle cx={41} cy={36} r={3} fill="#3A2A1E" />
      <Circle cx={39.9} cy={34.8} r={1} fill="#FFFFFF" />
      <Circle cx={59} cy={36} r={3} fill="#3A2A1E" />
      <Circle cx={57.9} cy={34.8} r={1} fill="#FFFFFF" />
      <Path d="M20 66 L14 62 M18 72 L11 70" stroke="#3A342E" strokeWidth={2} strokeLinecap="round" />
      <Path d="M80 66 L86 62 M82 72 L89 70" stroke="#3A342E" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Adlerin — Freispiel Rang 1-2 (600/650 Elo). Pose: aufrecht, Flügel leicht angelegt, wacher Blick. */
export function AdlerinIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={22} ry={5} fill={SHADOW} />
      <Ellipse cx={40} cy={88} rx={5} ry={4} fill="#F0A93C" />
      <Ellipse cx={60} cy={88} rx={5} ry={4} fill="#F0A93C" />
      <Path d="M18 40 Q6 58 20 80 Q26 66 30 50 Z" fill="#6E4A2E" />
      <Path d="M82 40 Q94 58 80 80 Q74 66 70 50 Z" fill="#6E4A2E" />
      <Ellipse cx={50} cy={64} rx={24} ry={26} fill="#6E4A2E" />
      <Path d="M36 66 Q50 76 64 66 Q62 84 50 86 Q38 84 36 66 Z" fill="#8B6B47" />
      <Ellipse cx={50} cy={32} rx={18} ry={16} fill="#F5F0E6" />
      <Path d="M50 40 L62 44 L50 48 Z" fill="#F0A93C" />
      <Circle cx={41} cy={30} r={3.4} fill="#3A2A1E" />
      <Circle cx={39.8} cy={28.7} r={1.1} fill="#FFFFFF" />
      <Circle cx={59} cy={30} r={3.4} fill="#3A2A1E" />
      <Circle cx={57.8} cy={28.7} r={1.1} fill="#FFFFFF" />
      <Path
        d="M36 24 Q41 18 46 22 M64 24 Q59 18 54 22"
        stroke="#D8D2C4"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Wolf — Freispiel Rang 1-2 (700/800 Elo). Pose: ruhig aufrecht, Nackenfell/Kragen betont. */
export function WolfIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={26} ry={5} fill={SHADOW} />
      <Ellipse cx={36} cy={88} rx={9} ry={6} fill="#6B6255" />
      <Ellipse cx={64} cy={88} rx={9} ry={6} fill="#6B6255" />
      <Path
        d="M26 58 Q20 44 30 32 Q26 46 32 58 Q22 62 20 74 Q28 68 34 66 Z"
        fill="#8B8378"
      />
      <Path
        d="M74 58 Q80 44 70 32 Q74 46 68 58 Q78 62 80 74 Q72 68 66 66 Z"
        fill="#8B8378"
      />
      <Ellipse cx={50} cy={62} rx={24} ry={22} fill="#8B8378" />
      <Path d="M36 66 Q50 76 64 66 Q62 82 50 84 Q38 82 36 66 Z" fill="#D8D2C4" />
      <Path d="M30 22 L20 6 L38 18 Z" fill="#8B8378" />
      <Path d="M70 22 L80 6 L62 18 Z" fill="#8B8378" />
      <Ellipse cx={50} cy={36} rx={18} ry={16} fill="#8B8378" />
      <Path d="M40 44 Q50 50 60 44 Q58 38 50 38 Q42 38 40 44 Z" fill="#D8D2C4" />
      <Circle cx={41} cy={32} r={3.2} fill="#F0A93C" />
      <Circle cx={39.9} cy={30.8} r={1.1} fill="#3A2A1E" />
      <Circle cx={59} cy={32} r={3.2} fill="#F0A93C" />
      <Circle cx={57.9} cy={30.8} r={1.1} fill="#3A2A1E" />
      <Path d="M47 44 L53 44 L50 48 Z" fill="#3A2A1E" />
    </Svg>
  );
}

/**
 * Wisent — Freispiel Rang 1-5 (900/1000/1100/1200/1300 Elo). Pose: standfest, breite
 * Schulterpartie mit dunkler Mähne (übernimmt die im Design-Canvas festgelegte
 * Grundcharakteristik, siehe projektwissen.md, "Endlosmodus"-Abschnitt, Asset E9).
 */
export function WisentIcon({ size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={28} ry={5} fill={SHADOW} />
      <Ellipse cx={34} cy={88} rx={9} ry={7} fill="#3A2A1E" />
      <Ellipse cx={66} cy={88} rx={9} ry={7} fill="#3A2A1E" />
      <Ellipse cx={50} cy={62} rx={30} ry={22} fill="#8B6B47" />
      <Path
        d="M22 40 Q18 62 34 74 Q26 66 26 50 Q26 40 34 32 Q24 34 22 40 Z"
        fill="#4A3728"
      />
      <Path
        d="M78 40 Q82 62 66 74 Q74 66 74 50 Q74 40 66 32 Q76 34 78 40 Z"
        fill="#4A3728"
      />
      <Ellipse cx={50} cy={36} rx={22} ry={19} fill="#4A3728" />
      <Path d="M30 22 Q26 14 30 8 Q34 16 34 24 Z" fill="#3A2A1E" />
      <Path d="M70 22 Q74 14 70 8 Q66 16 66 24 Z" fill="#3A2A1E" />
      <Ellipse cx={50} cy={46} rx={13} ry={10} fill="#8B6B47" />
      <Circle cx={39} cy={32} r={3} fill="#3A2A1E" />
      <Circle cx={37.9} cy={30.8} r={1} fill="#FFFFFF" />
      <Circle cx={61} cy={32} r={3} fill="#3A2A1E" />
      <Circle cx={59.9} cy={30.8} r={1} fill="#FFFFFF" />
      <Ellipse cx={44} cy={48} rx={1.6} ry={1.2} fill="#2A1E14" />
      <Ellipse cx={56} cy={48} rx={1.6} ry={1.2} fill="#2A1E14" />
    </Svg>
  );
}
