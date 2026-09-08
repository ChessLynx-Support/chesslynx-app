// Befund (Nutzer-Rückfrage 2026-09-07, nach Prüfung der Projekt-Unterlagen): Quest1.tsx
// Screen 0 spricht bereits seit einer früheren Sitzungs-Bearbeitung die Zeile "Hier siehst
// du das Spielbrett und alle seine Bewohner." — der Screen zeigte dazu aber nur eine leere,
// nicht illustrierte Tipp-Fläche (`styles.tapArea` ohne Inhalt). Ein echter Text/Bild-
// Widerspruch: Lux kündigt Brett + Bewohner an (Audio UND Untertitel), zu sehen war keins
// von beidem. Deckt sich mit der in `entwicklungsstatus_grundgeruest.md` dokumentierten,
// aber nie umgesetzten Lücke ("Zusätzlich ein einmaliger Einführungs-Screen vor Quest 1 mit
// leerem Brett und allen sechs Tieren im Überblick (MVP-Kern, noch nicht gebaut)").
//
// Diese Komponente füllt genau diese Lücke — als eigenständiger, wiederverwendbarer
// Bildbaustein statt direkt inline in Quest1.tsx, damit die Quest1.tsx-Datei selbst schlank
// bleibt (Quest1.tsx bindet sie in Screen 0 ein, siehe dortiger Kommentar).
//
// Bewusst KEINE Wiederverwendung von Board.tsx: diese Ansicht ist rein dekorativ (leeres
// Brett, sechs Tier-Icons als Gruppenbild, nicht interaktiv), Board.tsx ist dagegen
// komplett auf genau EINE interaktive Übungsfigur zugeschnitten (Pflicht-Prop `pieceAt`,
// Tap-/Zug-Logik, Bedrohungs-Anzeige usw.) — für ein reines Übersichtsbild wäre das
// Zweckentfremdung derselben Komponente. Stattdessen ein eigenes, stark vereinfachtes
// 8×8-Gitter, das dieselben Feld-Kacheln (`assets/brett/tile_hell.png`/`tile_dunkel.png`)
// wie Board.tsx nutzt, damit das Brett hier optisch exakt so aussieht wie später beim
// echten Üben.
//
// Design-Vorgabe des Nutzers (2026-09-07): "Das Bild sollte generell zentriert sein sich
// alles in eine skalierbaren, handyformat abspielen. Das Schachbrett sollte so entsprechend
// groß und zentral sichtbar sein." — Brettgröße deshalb wie in Board.tsx aus der
// tatsächlichen Bildschirmbreite berechnet (nicht fest), Aufrufstelle (Quest1.tsx, Screen 0
// `tapArea`) zentriert die Komponente bereits über Flexbox.
//
// Die sechs Tiere stehen in einer Reihe auf der mittleren Zeile (Reihe 4 von 8, Spalten
// b–g) — ein bewusst einfaches "Gruppenfoto"-Arrangement statt einer Schach-
// Startaufstellung (die hätte an dieser Stelle noch keine erklärbare Bedeutung).
// Reihenfolge links nach rechts entspricht der Quest-Reihenfolge (Igel, Bär, Eule, Pferd,
// Schwan, Hirsch, siehe projektwissen.md "Tier-Zuordnung"). Zeigt bewusst die NORMALE
// (34px-)Icon-Variante statt der großen Verwandlung-Variante — dieselbe Größe, in der die
// Tiere/Figuren später auch auf dem echten Übungsbrett erscheinen (siehe pieceMasters.tsx).
// Wichtig laut "Namensregel" (projektwissen.md): Screen 0 nennt bewusst weiterhin keinen
// einzigen Schachfigur-Namen (nur "Bewohner") — die Namen fallen weiterhin erst im
// jeweiligen Verwandlungsmoment jeder einzelnen Quest.
//
// Bewusste Vereinfachung gegenüber der Doku-Formulierung "einmalig": diese Ansicht
// erscheint (wie jeder andere Screen dieser Quest auch) bei jedem Aufruf von Quest1 neu,
// ohne eigenes "nur beim ersten Mal"-Flag — konsistent mit der bestehenden Entscheidung in
// Onboarding.tsx ("Bewusst KEINE 'nur beim ersten Start zeigen'-Logik ... falls gewünscht,
// ist das ein kleiner, separater Folgeschritt"). Ein AsyncStorage-Flag wäre hier zusätzliche
// Komplexität (Ladezustand, Race Conditions) für ein Verhalten, das nicht explizit
// eingefordert wurde — bei Bedarf einfach nachrüstbar.

import { View, Image, StyleSheet, Dimensions } from "react-native";
import {
  BauerMasterIcon,
  TurmMasterIcon,
  LaeuferMasterIcon,
  SpringerMasterIcon,
  DameMasterIcon,
  KoenigMasterIcon,
} from "../lib/pieceMasters";

const feldHell = require("../../assets/brett/tile_hell.png");
const feldDunkel = require("../../assets/brett/tile_dunkel.png");

// Reihe 4 (0-indiziert), Spalten 1-6 (b-g) — mittig auf dem 8x8-Brett, siehe Datei-
// Kommentar oben.
const TIER_REIHE = 4;
const TIERE: { spalte: number; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { spalte: 1, Icon: BauerMasterIcon },
  { spalte: 2, Icon: TurmMasterIcon },
  { spalte: 3, Icon: LaeuferMasterIcon },
  { spalte: 4, Icon: SpringerMasterIcon },
  { spalte: 5, Icon: DameMasterIcon },
  { spalte: 6, Icon: KoenigMasterIcon },
];

export function LeeresBrettMitAllenTieren() {
  // Dieselbe Berechnung wie Board.tsx (cellSize) für ein volles 8×8-Brett, damit das Brett
  // hier optisch exakt so groß/proportioniert wirkt wie später beim echten Üben — siehe
  // Design-Vorgabe im Datei-Kommentar oben ("Schachbrett ... groß und zentral sichtbar").
  const { width: bildschirmBreite } = Dimensions.get("window");
  const maxBrettBreite = bildschirmBreite - 48;
  const cellSize = Math.max(24, Math.min(42, Math.floor((maxBrettBreite - 12) / 8)));

  return (
    <View
      style={[styles.board, { width: cellSize * 8 + 12, height: cellSize * 8 + 12 }]}
      accessibilityRole="none"
      accessibilityLabel="Das Schachbrett mit allen sechs Waldtieren"
    >
      {Array.from({ length: 8 }).flatMap((_, r) =>
        Array.from({ length: 8 }).map((_, c) => {
          const isDark = (r + c) % 2 === 1;
          const tier = r === TIER_REIHE ? TIERE.find((t) => t.spalte === c) : undefined;
          return (
            <View key={`${r}-${c}`} style={[styles.cell, { width: cellSize, height: cellSize }]}>
              <Image source={isDark ? feldDunkel : feldHell} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              {tier && <tier.Icon />}
            </View>
          );
        })
      )}
    </View>
  );
}

// Identisch zu Board.tsx/styles.board (siehe Datei-Kommentar oben, "Brett hier optisch
// exakt so ... wie später beim echten Üben").
const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 20,
    borderWidth: 6,
    borderColor: "#E4DAC6",
    backgroundColor: "#F7F1E4",
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cell: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
