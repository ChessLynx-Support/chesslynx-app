// "Sternenleiter" — gemeinsame Wertevergleichs-Darstellung für das Figurenwert-Bonuskapitel
// (siehe Claude-Projekt "ChessLynx", bonuskapitel_screen_skripte.md, Abschnitt "Figurenwert",
// Darstellungsprinzip "Sternenleiter"). Löst die zuvor erwogene 3×3-Cluster-Idee ab (Review-
// Befund 2.3): Sterne werden in Dreierreihen von unten nach oben aufgebaut, alle Säulen
// links-/unten-bündig auf derselben Grundlinie — dadurch entsteht ein Höhenvergleich wie bei
// einem Balkendiagramm ("höher = mehr"), ohne dass gezählt werden muss, während die Sterne
// selbst weiterhin einzeln zählbar bleiben (kein Widerspruch zur Grundanforderung).
//
// Eigene Datei statt Teil von puzzleIcons.tsx: wird sowohl vom Figurenwert-Bonuskapitel
// (Vorstellungs-Screen: alle fünf Figuren nebeneinander) als auch von einzelnen Puzzle-Screens
// (zwei Figuren im direkten Vergleich) gebraucht — ein gemeinsamer, wiederverwendbarer
// Baustein statt einer kapitel-internen Hilfsfunktion.

import { View } from "react-native";
import type { ReactNode } from "react";
import Svg, { Path, Defs, RadialGradient, Stop } from "react-native-svg";
import { hexAufhellen } from "./farbverlauf";

/** Ein einzelner Fünf-Zacken-Stern, Marken-Gold (#D7A52D) — dieselbe Farbe wie an anderer
 * Stelle in der App (Funkeln.tsx, pieceSockel in Board.tsx).
 * Visuelle-Politur-Runde (2026-09-09): radialer Verlauf statt Flatcolor gibt jedem einzelnen
 * Stern einen kleinen "Münzglanz" — bei einer ganzen Sternensäule (siehe Sternensaeule unten)
 * summiert sich das zu einem deutlich hochwertigeren Gesamteindruck. */
export function SternIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 1 }}>
      <Defs>
        <RadialGradient id="sternVerlauf" cx="38%" cy="32%" r="70%">
          <Stop offset="0%" stopColor={hexAufhellen("#D7A52D", 0.4)} />
          <Stop offset="55%" stopColor="#D7A52D" />
          <Stop offset="100%" stopColor="#B5822A" />
        </RadialGradient>
      </Defs>
      <Path
        d="M12 1.5 L14.9 8.6 L22.5 9.2 L16.7 14.1 L18.5 21.5 L12 17.4 L5.5 21.5 L7.3 14.1 L1.5 9.2 L9.1 8.6 Z"
        fill="url(#sternVerlauf)"
        stroke="#B5822A"
        strokeWidth={0.6}
      />
    </Svg>
  );
}

/**
 * Eine Sternensäule für EINEN Wert: baut von unten nach oben Dreierreihen auf
 * (`column-reverse`, damit die erste erzeugte Reihe optisch UNTEN landet). Wird immer als
 * letztes Kind einer Spalte gerendert (siehe FigurenWertKarte unten), damit die Grundlinie
 * über mehrere Karten hinweg gemeinsam ist.
 */
export function Sternensaeule({ wert, groesse = 14 }: { wert: number; groesse?: number }) {
  const reihen: number[] = [];
  let rest = wert;
  while (rest > 0) {
    const inDieserReihe = Math.min(3, rest);
    reihen.push(inDieserReihe);
    rest -= inDieserReihe;
  }
  return (
    <View style={{ flexDirection: "column-reverse", alignItems: "flex-start" }}>
      {reihen.map((anzahl, i) => (
        <View key={i} style={{ flexDirection: "row" }}>
          {Array.from({ length: anzahl }).map((_, j) => (
            <SternIcon key={j} size={groesse} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Eine vollständige "Karte" für eine Figur: Icon oben, ihre Sternensäule darunter — beide
 * Kinder in EINER Spalte, die von der umgebenden Reihe (siehe Sternenleiter unten) an ihrer
 * Unterkante ausgerichtet wird (`alignItems: "flex-end"` am Elternteil). Dadurch wandert das
 * Icon bei höherem Wert sichtbar weiter nach oben — genau der gewünschte Balkendiagramm-
 * Effekt, ohne dass die einzelnen Sterne ihre Zählbarkeit verlieren. `koenig` (kein Zahlenwert,
 * "unbezahlbar") ersetzt die Sternensäule durch einen sanften goldenen Schimmer statt Sternen.
 */
export function FigurenWertKarte({
  icon,
  wert,
  iconGroesse = 40,
  sternGroesse = 13,
  koenig = false,
}: {
  icon: ReactNode;
  wert?: number;
  iconGroesse?: number;
  sternGroesse?: number;
  koenig?: boolean;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: iconGroesse, height: iconGroesse, marginBottom: 6 }}>{icon}</View>
      {koenig ? (
        <View
          style={{
            width: iconGroesse * 0.9,
            height: sternGroesse,
            borderRadius: 999,
            backgroundColor: "#D7A52D",
            opacity: 0.35,
          }}
        />
      ) : (
        <Sternensaeule wert={wert ?? 0} groesse={sternGroesse} />
      )}
    </View>
  );
}

/**
 * Reiht mehrere FigurenWertKarte nebeneinander, gemeinsam an der Unterkante ausgerichtet
 * (`alignItems: "flex-end"`) — das ist der eigentliche "Leiter"-Effekt: alle Sternensäulen
 * teilen sich dieselbe Grundlinie, nur ihre Höhe (= Anzahl Reihen) unterscheidet sich.
 */
export function Sternenleiter({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 18 }}>
      {children}
    </View>
  );
}
