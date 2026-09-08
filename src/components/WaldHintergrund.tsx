// Nutzer-Feedback 2026-09-07 ("Hier sollte auch ein schöner Hintergrund genutzt werden.
// Zunächst diesen hier verwenden. Bis wir das generell oder ggf. sogar je Quest
// individualisieren"): der vom Nutzer bereitgestellte Wald-Lichtung-Entwurf zeigt ein
// eigenes, bereits gemaltes Schachbrett in der Bildmitte — direkt als Ganzes hinter das
// echte, interaktive Board.tsx gelegt, gäbe es zwei sich überlagernde Schachbretter.
// Deshalb hier auf die Wald-/Himmel-Kulisse oben und die Wiesen-/Steine-Kulisse unten
// zugeschnitten (der gemalte Brett-Bereich in der Bildmitte bewusst weggelassen), beide
// mit weichem Alpha-Verlauf zur Bildschirmmitte hin ausgeblendet (siehe
// waldkulisse_oben.png/waldkulisse_unten.png) — die eigentliche Übungsfläche (Board.tsx,
// Sprechblase, Lux-Ecke) sitzt dadurch unverändert auf dem bisherigen cremefarbenen
// Hintergrund (#F7F1E4, siehe styles.safe in den Quest*.tsx), umrahmt statt überdeckt.
//
// Update (Nutzer-Feedback 2026-09-07, zweite Rückmeldung: "Lux, die Sprechblasen und alle
// Aktionen sollen vor dem Hintergrund passieren. Aktuell wirkt das sehr abgeschnitten und
// ergibt keinen Sinn. Die Interaktionen finden in der Mitte statt."): die erste Fassung
// nutzte feste Pixelhöhen (150px oben, 92px unten) für die beiden Kulissen-Streifen. Auf
// einem normal hohen Handy-Bildschirm (oft 700-900 logische Pixel netto) blieb dadurch ein
// riesiger, komplett unbebilderter beiger Bereich in der Bildmitte übrig — genau dort, wo
// Lux, die Sprechblase und die eigentliche Spielfläche liegen. Das wirkte nicht wie eine
// Kulisse, VOR der die Handlung stattfindet, sondern wie zwei lose angeschnittene
// Bildstreifen an den Bildschirmrändern mit einer großen Lücke dazwischen.
//
// Jetzt sind beide Bänder PROZENTUAL zur tatsächlichen Bildschirmhöhe skaliert (TOP_ANTEIL/
// UNTEN_ANTEIL unten) statt fest — die beiden Anteile entsprechen bewusst genau dem Anteil,
// den die jeweils schachbrett-freie Zone in der Quell-Illustration selbst einnimmt (oben
// ca. 36%, unten ca. 19% der Bildhöhe, siehe Zuschnitt im Erzeugungsskript), damit die
// Kulisse auf einem ähnlich hochformatigen Handy-Bildschirm (Quellbild-Seitenverhältnis
// 941:1672 liegt nahe an typischen Telefon-Seitenverhältnissen) proportional genauso wirkt
// wie im Originalgemälde. Beide PNGs wurden dafür deutlich großzügiger aus dem Originalbild
// zugeschnitten (mehr Baumkronen oben, mehr Wiese/Steine unten) und tragen weiterhin einen
// weichen, jetzt aber prozentual zur neuen (größeren) Bandhöhe passenden Alpha-Verlauf zur
// Bildschirmfarbe (#F7F1E4) hin eingebacken — der Übergang zur beigen Mitte bleibt dadurch
// weich statt hart abgeschnitten, auch mit den jetzt viel größeren Bändern. Die verbleibende
// Mittelzone (wo Lux/Sprechblase/Board tatsächlich liegen) ist dadurch deutlich kleiner als
// vorher und liegt sichtbar VOR den beiden ineinander verlaufenden Kulissenteilen, statt in
// einer bildlosen Lücke dazwischen zu schweben.
//
// Bewusst eine einzige, für alle Quests gemeinsame Komponente (siehe Nutzer-Zitat oben:
// "Bis wir das generell oder ggf. sogar je Quest individualisieren") — eine spätere
// Individualisierung je Quest (eigene Kulisse pro Waldgefährten-Gebiet, siehe
// projektwissen_verlauf.md "Gebiets-Welten"-Konzept) kann diese Komponente um eine
// `variante`-Prop erweitern, ohne die Aufrufstellen in den Quest*.tsx grundlegend zu
// ändern.
//
// Rein dekorativ (`pointerEvents="none"`), liegt als absolut positionierter Rahmen HINTER
// dem eigentlichen Bildschirminhalt — bewusst als erstes Kind der jeweiligen
// SafeAreaView, damit spätere Geschwister-Elemente (Sprechblase, Board, Lux-Ecke) beim
// Stapeln automatisch darüber liegen (Stapelreihenfolge war nie das Problem — die
// Bänder selbst waren schlicht zu klein, siehe Update oben).

import { View, Image, StyleSheet, useWindowDimensions } from "react-native";

const oben = require("../../assets/hintergrund/waldkulisse_oben.png");
const unten = require("../../assets/hintergrund/waldkulisse_unten.png");

// Siehe Update-Kommentar oben: entsprechen dem schachbrett-freien Anteil der jeweiligen
// Zone im Quellbild (598px bzw. 322px von 1672px Gesamthöhe).
const TOP_ANTEIL = 0.35;
const UNTEN_ANTEIL = 0.19;

export function WaldHintergrund() {
  const { height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Image source={oben} style={[styles.oben, { height: height * TOP_ANTEIL }]} resizeMode="cover" />
      <Image source={unten} style={[styles.unten, { height: height * UNTEN_ANTEIL }]} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  oben: { position: "absolute", top: 0, left: 0, right: 0 },
  unten: { position: "absolute", bottom: 0, left: 0, right: 0 },
});
