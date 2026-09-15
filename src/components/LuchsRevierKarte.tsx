// LuchsRevierKarte — die echte "Luchs-Revier"-Kartenkomponente, die die bisherige
// Platzhalter-Buttonliste auf KidHome ablöst (siehe RootNavigator.tsx, Kommentar zur bisherigen
// Übergangslösung mit `saga_karte_uebersicht.jpg` + Schleier + Buttonliste). Siehe Claude-Projekt
// "ChessLynx", priorisierter_umsetzungsplan.md / entwicklungsstatus_grundgeruest.md: "Luchs-Revier"
// und "Lichtung mit den Waldgefährten" sind EINE durchgängige, erweiterbare Landkarte — im
// MVP-Kern zeigt sie nur die sechs Quest-Wegmarken, wächst nach Launch um die fünf
// Landesherren-Königreiche + den unerforschten Kartenrand jenseits der Wisentfeste. Deshalb
// bewusst als eigene, erweiterbare Komponente gebaut (nicht inline in RootNavigator.tsx) —
// genau die in beiden Dokumenten festgehaltene "praktische Konsequenz".
//
// Bildausschnitt: exakt der mit dem Nutzer im Design-Canvas abgestimmte Kartenausschnitt
// (ursprünglich aus Master `b105bbf4-2098-4fc6-98c9-2ebe72bc9145.png` aus Grafiken/, per
// Bildvergleich exakt reproduziert: volle Originalbreite 829px, Zeilen 576–1894 von 1897 —
// Wisentfeste oben, Startlichtung/Igel-Wiese unten). Siehe
// `claude/luchsrevier_master_korrektur.md` im Claude-Projekt für die volle Herleitung, warum
// dieser Master (und nicht das alte SVG-Design-Canvas) die richtige Quelle ist.
//
// Update (2026-09-09, Nutzerwunsch "Bitte hauptscreen Hintergrund jetzt schärfer stellen"):
// derselbe Bildausschnitt wurde erneut aus dem später aufgetauchten, deutlich höher
// aufgelösten Master `davinci_enhancer_image_1788860236858.jpg` (3576×8192px statt zuvor
// 829×1897px) geschnitten — per Template-Matching auf denselben Bereich verifiziert
// (Konfidenz 0,83). Ausgeliefert wird die neue Fassung bei 2x der bisherigen Pixelgröße
// (1658×2636px statt 829×1318px) im WebP-Format statt JPG: WebP ist dabei trotz doppelter
// Auflösung kleiner als das alte JPG (Nutzerentscheidung — Alternative wäre PNG/JPG bei 2x
// gewesen, hätte aber +29 MB allein für diese Asset-Gruppe bedeutet). Siehe
// `claude/endlosmodus_freispiel_konzept.md`, Abschnitt "Auflösungsproblem gelöst", für die
// volle Herleitung.
//
// Figuren: die bereits produzierten, freigestellten Figuren-Master aus `assets/figuren/`
// (`..._light_export_gross.png` — dieselben sechs Illustrationen, die auch anderswo in der App
// nach der Verwandlung als Ziel-Tier/-Figur gezeigt werden), NICHT die alten Flach-SVG-Icons aus
// `lib/creatures.tsx` — Illustrationsstrategie-Entscheidung vom 2026-09-07.
//
// Positionen: exakt die im Design-Canvas über mehrere Korrekturrunden mit dem Nutzer
// abgestimmten Koordinaten (bezogen auf den 390×620pt-Referenzausschnitt, hier als Anteil von
// Breite/Höhe hinterlegt — REFERENZ_BREITE/-HOEHE unten —, damit sie auf jeder Bildschirmbreite
// exakt an derselben relativen Stelle auf dem Pfad/den Landmarken sitzen, siehe onLayout-Messung
// weiter unten statt einer festen Pixelbreite).
//
// Zustände je Wegmarke — bewusst OHNE jede Schloss-/Sperr-Symbolik (siehe Claude-Projekt
// "ChessLynx", `wettbewerbsanalyse_kinderapps_design.md` Punkt 6 und
// `produktionsanleitung_elemente.md`, Abschnitt "Design-Grundsätze": "keine Schloss-/Sperr-
// Symbolik" ist projektweit bindend): "erledigt" (voll deckend + kleines Häkchen-Abzeichen in
// Salbeigrün, derselbe Ton wie die "secondary"/erledigt-Variante von ChessLynxButton),
// "als nächstes dran" (voll deckend + pulsierender Gold-Ring, derselbe Goldton `#D7A52D` wie
// ChessLynxButton/FortschrittsRing), "noch nicht erreicht" (nur reduzierte Deckkraft — exakt der
// bereits an anderer Stelle etablierte Deaktiviert-Wert, siehe ChessLynxButton.tsx
// `opacity: disabled ? 0.55 : 1` —, kein Icon, nicht antippbar). Ebenfalls bewusst TEXTFREI
// (weder Namens-Schildchen noch ein "Weiter hier!"-Label wie im Design-Canvas-Mockup) — die App
// richtet sich an Kinder ab 5 ohne Lesefähigkeit (siehe projektwissen.md); der Mockup-Textlayer
// war nur eine Verständigungshilfe mit dem Nutzer, keine Vorgabe für den echten Bildschirm.
//
// Schlossvorplatz-Zugang: der gestrichelte Gold-Ring am Burgtor der Wisentfeste ersetzt den
// bisherigen 7. KidHome-Button (siehe RootNavigator.tsx) — immer antippbar, unabhängig vom
// Hauptquest-Fortschritt (Schlossvorplatz.tsx zeigt selbst einen Hinweis, falls die sechs
// Basisquests noch nicht komplett sind).
//
// Bekannte Android/Fabric-Fallstricke in dieser Codebase (siehe RootNavigator.tsx- und
// WaldHintergrund.tsx-Kommentare zu genau diesem wiederholt aufgetretenen Bug): mehrere absolut
// positionierte Geschwister-Views hinter einem großflächigen Hintergrundbild rendern auf Android
// unzuverlässig, und eine einfache View ohne Touch-Handler kann vom View-Flattening
// wegoptimiert werden (verschiebt dann den Bezugsrahmen für position:absolute-Kinder, siehe
// LeeresBrettMitAllenTieren.tsx). Deshalb hier — wie im bereits bestätigten KidHome-Fix — eine
// EINZIGE `ImageBackground`, deren Kinder (Wegmarken, Burgtor-Tap, Nebel-Ebene) direkt darin
// liegen, sowie `collapsable={false}` auf dem messenden Außen-Wrapper.
//
// Update (2026-09-08, Nutzerwunsch "Zur Verhüllung der Karte kannst du diesen Nebel
// verwenden?" + Entscheidung "Durchgehendes Höhenband wie im alten Mockup"): löst die bisherige
// reine Opacity-Abblendung für "gesperrt" durch ein echtes Nebel-/Wolken-Höhenband ab — siehe
// die ausführliche Herleitung/Kalibrierung unten bei Kommentar bei `nebelTextur` und `claude/
// luchsrevier_master_korrektur.md` im Claude-Projekt. Die alte Opacity-Abblendung
// (GESPERRT_OPACITY) bleibt zusätzlich bestehen, nicht weil sie noch gebraucht würde, sondern
// als zweite, unabhängige Absicherung: sollte die SVG-Maskierung auf einem Gerät aus
// irgendeinem Grund nicht greifen, bleibt "gesperrt" trotzdem sichtbar abgeblendet statt
// unbeabsichtigt voll aufgedeckt.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
// Reine Ansichts-Schalter aus dem Testmodus (`__DEV__`) — sie ändern, wie die Karte
// AUSSIEHT, und fassen keinen Fortschritt an. KEINE Freischaltungen: antippbar wird
// dadurch nichts (siehe Datei-Kommentar dort).
import { useTestAnsicht } from "../lib/testAnsicht";
import Svg, { Circle, Defs, G, Image as SvgBild, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { loadBonusFortschrittLocal, loadQuestFortschrittLocal } from "../lib/storage";
import { pruefeSchlosstorStatus } from "../lib/gate";
import { SCHILDKROETE_ASPEKT, SchildkroeteWegmarke } from "../lib/schildkroete";
import { QuestTierWegmarke, questTierWegmarkeAspekt } from "../lib/questTiere";
import { GefaehrteWegmarke, gefaehrteWegmarkeAspekt } from "../lib/gefaehrtenZustaende";
import type { GefaehrteId } from "../lib/gefaehrtenZustaende";
import { AmbientLoop } from "./AmbientLoop";
import { Gluehwuermchen } from "./Gluehwuermchen";

const hintergrund = require("../../assets/hintergrund/luchsrevier_wisentfeste.webp");
// Paket 3 (2026-09-11): Oberland-Kartenstück mit der Steinbrücke, siehe Datei-Kopfkommentar.
const oberland = require("../../assets/hintergrund/luchsrevier_oberland.webp");
// Seitenverhältnis Höhe/Breite des Oberland-Stücks (1658×519px) — gleiche Breite wie die
// bisherige Karte, deshalb schließen beide bei jeder Bildschirmbreite nahtlos aneinander an.
// Update 2026-09-14: Das Oberland ist von 519 auf 1159 Zeilen gewachsen. Der HQ-Master
// (Grafiken/Sonniges_Tal_der_Maerchenschloesser_3576x8192_v2.png) trug oberhalb des bisherigen
// Ausschnitts noch 640 ungenutzte Zeilen — Hochgebirge, ein Schloss auf dem Fels, ein
// Wasserfall und der Weg, der dorthin führt. Genau dort stehen jetzt die fünf Gefährten
// (siehe GEFAEHRTEN weiter unten). Der Ausschnitt beginnt seither bei Zeile 0 statt bei 640;
// die unteren 519 Zeilen sind unverändert dieselben wie zuvor (nachgemessen: Abweichung
// 1,49/255, also reines WebP-Rauschen).
export const OBERLAND_ASPECT = 1159 / 1658;

// (Der frühere NEBEL_RANDSTREIFEN_FRAC entfällt seit 2026-09-13: er glich einen weißen
// Randstreifen des alten Nebelbands aus. Die neue Textur deckt Oberland und Karte in
// einem Stück ab und braucht weder Spiegelung noch Versatz.)

// Schildkröten-Wegpunkt im Oberland: Fußpunkt als Anteil von Breite/Höhe des Oberland-
// Stücks (Lichtung links der Steinbrücke), Bildbreite als Anteil der Kartenbreite.
// Gerätetest 2026-09-11 (Nutzerwunsch, Screenshot mit Pfeil): nicht auf/neben der Brücke,
// sondern links auf der Lichtung unter den Tannen (vorher fx 0.434).
// Die Schildkröte ist die siebte Station (Nutzer-Nummerierung 2026-09-14). Ihr alter Platz
// (fx 0,10 / fy 0,56 des 519 Zeilen hohen Oberlands, also x 166 / y 931 im Master) lag
// tatsächlich NEBEN der Steinbrücke im Wald am Hang — unter dem dichten Nebel des kleinen
// Oberlands ist das nie aufgefallen. Auf dem gewachsenen Ausschnitt steht sie jetzt auf dem
// linken Brückenkopf und etwas kleiner, passend zu den Gefährten weiter oben.
// Ihre Breite kommt seit 2026-09-14 aus derselben Größenformel wie die der Gefährten
// (siehe `oberlandBreite` weiter unten) — deshalb steht die Konstante jetzt dort.

// Nebel-/Wolken-Höhenband — siehe Datei-Kopfkommentar. Herkunft: vom Nutzer bereitgestellte
// 5-stufige Nebel-/Wolken-Bildreihe (`Grafiken/d1c399e6-….png`, "Nebel 1 Leicht" … "Wolken 5
// Gipfel"), KI-generiert mit einer (nicht echten, nur optisch angedeuteten) Schachbrett-
// "Transparenz" statt echtem Alpha-Kanal — deshalb vor der Verwendung per Median-Filter
// entstört (das feine 22px-Schachbrettmuster liegt weit unterhalb der Detailgröße der
// eigentlichen Wolkenform und lässt sich so sauber herausrechnen, ohne die Wolkenform/den
// goldenen Pfad zu verwischen). Aus den 5 entstörten Stufen wurde EIN durchgehendes 829×1318px-
// Höhenband (`assets/hintergrund/luchsrevier_nebel_band.png`) gebaut: pro Bildzeile eine
// Überblendung zwischen den beiden benachbarten Stufen für die Farbe, und als Alpha die
// Helligkeit der jeweiligen Wolkentextur an dieser Stelle multipliziert mit der Gesamtdichte
// dieser Höhe (Dichtekurve siehe Absatz unten) — dadurch bleiben einzelne Wolkenfetzen/Schwaden
// als Textur erkennbar statt eines flachen Verlaufs. Wolken 5 (Gipfel) wird hier bewusst NICHT
// verwendet — der aktuelle Kartenausschnitt endet am Wisentfeste-Tor, das Gipfelschloss liegt
// jenseits davon (noch nicht gebaut, siehe produktionsplan_saga_karte_18_ansichten.md) und ist
// der Stufe vorbehalten, die dort einmal zum Einsatz kommt.
//
// Dichte-/Texturkurve (Höhe → Nebelstärke): re-kalibriert die im alten SVG-Design-Canvas
// (`WeltkarteFortschritt.dc.html`, siehe projektwissen_verlauf.md, "Elfter Durchgang") mit dem
// Nutzer abgestimmte Kurve (praktisch klar am Lichtungs-Eingang, ab Bär hörbar/sichtbar
// zunehmend, ab Eule bereits Schloss-Dichte, ab der Wisentfeste Wechsel von Nebel- zu
// Wolkentextur) proportional auf den JETZIGEN Kartenausschnitt (der nur Lichtung bis
// Wisentfeste-Tor zeigt, nicht die volle damalige Bergmassiv-Höhe) — die ursprüngliche Kurve war
// auf eine deutlich größere Gesamthöhe (bis zum Gipfelschloss) kalibriert. Konkret verwendete
// Stützstellen (Anteil der Kartenhöhe von unten, Dichte 0–1, Texturstufe 0=Nebel1…3=Wolken4):
// 0%→(0, Nebel1) · Igel≈5%→(0.03, Nebel1) · Bär≈6%→(0.20, Nebel1→2) · Eule≈27%→(0.90, Nebel3) ·
// Hirsch≈63%→(0.93, Nebel3) · Burgtor≈87%→(0.97, Nebel3→Wolken4) · 100%→(0.97, Wolken4). Die
// eigentliche Verlaufsberechnung geschah beim Bauen des Assets (Python, nicht Teil der App) —
// hier dokumentiert, damit sich das Band bei einem größeren Kartenausschnitt (18-Segment-Karte,
// siehe oben) nachvollziehbar neu erzeugen lässt.
// 2026-09-13: neues Nebel-Asset. Das alte `luchsrevier_nebel_band.png` hatte die
// Dichtekurve fest eingebacken und erreichte nie mehr als Alpha 171 — es konnte also
// nichts wirklich verbergen. Die neue Textur trägt NUR die Wolkenform (Alpha 176–247,
// Farbton fest 236/240/243) und deckt Oberland und Karte in einem Stück ab; die Dichte
// kommt jetzt aus dem Fortschritts-Verlauf in `baueNebelVerlauf` und wird über die
// SVG-Maske aufmultipliziert. Dadurch ist der Nebel fortschrittsabhängig steuerbar,
// ohne das Bild neu zu bauen.
//
// Herkunft: aus den sechs Regionen des Pakets `Grafiken/map_fog_cloud_pack.zip`
// (13.09.2026) — davon wurde ausschließlich der Alphakanal übernommen. Die Regionen
// enthalten an jeder Bandkante einen Schwarzverlauf (9 % der Nebelfläche dunkler als
// Helligkeit 120); direkt überblendet verdunkeln sie die Karte, statt zu vernebeln.
// Löcher zwischen den Bändern sind mit einer stark geglätteten Fassung der Textur
// aufgefüllt (Grundnebel 0,70), damit bei voller Dichte keine harten Fenster entstehen.
const nebelTextur = require("../../assets/hintergrund/luchsrevier_nebel_textur.png");

// Ziel-Deckung je Wegmarke, gezählt ab der nächsten offenen: die nächste ist frei, die
// übernächste halb verschleiert, die dritte fast verdeckt, alles darüber voll verhüllt.
// Entspricht der Vorgabe "nur der Igel zeigt sich, Bär schwach, Eule kaum, Rest gar nicht"
// (Nutzerentscheidung 2026-09-13, Variante B).
const NEBEL_ZIEL_DECKUNG = [0, 0.5, 0.8, 1, 1, 1] as const;

// Seitenverhältnis des Kartenausschnitts (Originalauflösung 829×1318px, siehe Datei-
// Kopfkommentar) — legt bei gegebener Breite eindeutig die Höhe fest, damit die Karte nie
// verzerrt oder beschnitten wird (deshalb resizeMode="cover" auf einer Fläche, deren
// Seitenverhältnis rechnerisch exakt dem des Bildes entspricht — "cover" schneidet dadurch
// nie etwas ab, sondern skaliert nur verlustfrei).
// Update (2026-09-09, Willkommens-Flug-Probe, siehe dev/WillkommensFlugProbe.tsx und
// claude/konzept_screen0_verschmelzung_appstart.md Abschnitt 6 "Logische Prüfung",
// Fakt 3): dieser Wert wird jetzt außerhalb dieser Datei gebraucht, damit die neue
// Landeanimation exakt dieselben Koordinaten trifft, auf denen die echte Karte die
// Wegmarken zeichnet — ein unabhängig neu geschätzter Wert würde beim Übergang von der
// Landeanimation zur echten KidHome-Karte sichtbar "springen". Rein additive Änderung
// (nur `export` ergänzt), keine Verhaltensänderung dieser Datei selbst.
export const MAP_ASPECT = 1318 / 829;

// Referenzmaße des Design-Canvas-Ausschnitts, auf den sich alle Positionsangaben unten
// beziehen (siehe Datei-Kopfkommentar "Positionen"). Ebenfalls exportiert, siehe
// Kommentar bei MAP_ASPECT oben.
export const REFERENZ_BREITE = 390;
export const REFERENZ_HOEHE = 620;

export type QuestId = "quest1" | "quest2" | "quest3" | "quest4" | "quest5" | "quest6";
// "offen" (neu, Update-1-Vorzug 2026-09-15): erreichbar und voll aufgedeckt, aber weder
// "als Nächstes markiert" (kein Glühwürmchen-Kranz, der ist für die lineare Quest-Reihenfolge
// gedacht) noch "erledigt" (kein Häkchen-Abzeichen, das hieße fälschlich "schon geschafft").
// Für die Gefährten-Reviere, die man in beliebiger Reihenfolge besuchen kann, ohne dass "war
// schon da" bedeutet "fertig damit".
type WegmarkeStatus = "erledigt" | "naechstes" | "gesperrt" | "offen";

const GOLD = "#D7A52D";
const SAGE = "#8FA888";
// Exakt derselbe Wert wie ChessLynxButton.tsx `opacity: disabled ? 0.55 : 1` — siehe
// Datei-Kopfkommentar, Abschnitt "Zustände je Wegmarke".
const GESPERRT_OPACITY = 0.55;

// Zielwerte der weichen "Lichtungen", die die Nebelmaske (siehe baueNebelKlarungen unten) in
// das Höhenband schneidet: die NEBELDICHTE im Zentrum der Lichtung, 0 = an dieser Stelle
// bleibt kein Nebel, 1 = voller Nebel. Ein RadialGradient blendet von diesem Zentrum weich
// zur Umgebung aus.
//
// Update 2026-09-14: Bis hierher waren das Graustufen-FARBEN, und der Verlauf endete außen
// immer bei Weiß. Warum das nicht stimmte, steht bei `klarungsFarben()` weiter unten — eine
// Lichtung muss gegen ihre Umgebung gerechnet werden, sonst legt sie dort, wo ohnehin kein
// Nebel liegt, welchen dazu. Genau das war die helle Scheibe um die nächste Wegmarke.
const NEBEL_KLARUNG_VOLL = 0; // erledigte Wegmarke: komplett frei
const NEBEL_KLARUNG_NAECHSTES = 0.54; // als nächstes dran: nur angelichtet ("schwache Aufhellung")
const NEBEL_KLARUNG_BURGTOR = 0.81; // Burgtor: dauerhaft nur leicht gelichtet, unabhängig vom
// Fortschritt — siehe projektwissen_verlauf.md ("das Schloss trägt einen dauerhaften, bewusst
// lückenhaften Wolken-/Nebelschleier … sodass es hindurchschimmert statt verdeckt zu sein").

export type WegmarkenEintrag = {
  quest: QuestId;
  // Fußpunkt der Figur (wo sie auf dem Weg "steht"), als Anteil von Referenzbreite/-höhe.
  fx: number;
  fy: number;
  // Bildbreite als Anteil der Referenzbreite; die Höhe ergibt sich aus dem echten
  // Seitenverhältnis der jeweiligen Illustration (aspekt unten) statt einem festen Wert.
  breiteFrac: number;
  // Höhe/Breite des TIERES. Seit dem 2026-09-14 aus der Zustandsfamilie gerechnet statt
  // von Hand eingetragen: Die Bilder haben jetzt einen Rand für die Geste (beim Schwan
  // ist die Datei fast doppelt so breit wie der Vogel), und nur die Figur darf zählen.
  aspekt: number;
};

// Paket 11d (2026-09-13) — dezente Umgebungsschleifen (Lottie, siehe AmbientLoop.tsx).
// Sie sind Hintergrundleben, keine Information: `pointerEvents="none"`, kein Ton, und sie
// liegen im JSX VOR den Wegmarken und vor dem Nebelband — dadurch legt sich der Nebel auch
// über sie, statt dass eine Schleife mitten im vernebelten Teil unnatürlich klar blinkt.
//
// Die Plätze sind an der Landschaft ausgesucht und gegen die Wegmarken geprüft (nächste
// Wegmarke ist das Pferd bei 110/410, gut zwei Kartenbreiten von den Glühwürmchen entfernt):
// Wald am linken Rand, Baumwipfel rechts neben der Burg, der Fluss unter der oberen
// Steinbrücke, Blumenwiese links unten. Koordinaten als Anteil von Kartenbreite/-höhe, wie
// bei den Wegmarken auch.
//
// Die versetzten Startverzögerungen sind wichtig: Laufen mehrere Schleifen im Gleichtakt,
// fällt die Wiederholung sofort als "Maschine" auf.
//
// 2026-09-15 — vier weitere Schleifen ergänzt (Gerätetest: "die Lottie-Schleifen sehe ich
// kaum"). Anders als die ersten vier sitzen sie nicht irgendwo in der Landschaft, sondern
// auf einem konkreten Motiv von `luchsrevier_wisentfeste.webp` (1658x2636). Die fx/fy sind
// AM BILD ABGEMESSEN, nicht geschätzt — der Rauch steht über der Schornsteinspitze bei
// 0.9215/0.538, die Blasen im dunkleren Wasser UNTER dem Wasserfall (im Fall selbst wäre
// weiß auf weiß unsichtbar). Wer die Karte austauscht, muss hier neu messen.
//
// Damit laufen acht Schleifen gleichzeitig. Falls das auf schwachen Android-Geräten ruckelt,
// ist der richtige Hebel, die vier alten zu entschlacken (sie sind die großflächigen) —
// nicht die neuen, die den Gerätetest-Befund beheben.
const AMBIENT_SCHLEIFEN = [
  {
    name: "baum",
    quelle: require("../../assets/lottie/chesslynx-tree-sway.json"),
    fx: 0.09,
    fy: 0.35,
    groesseFrac: 0.15,
    verzoegerungMs: 0,
    tempo: 0.8,
    deckkraft: 0.75,
  },
  {
    name: "wasser",
    quelle: require("../../assets/lottie/chesslynx-water-shimmer.json"),
    fx: 0.62,
    fy: 0.55,
    groesseFrac: 0.15,
    verzoegerungMs: 1300,
    tempo: 0.9,
    deckkraft: 0.7,
  },
  {
    name: "vogel",
    quelle: require("../../assets/lottie/chesslynx-bird-flyaway.json"),
    fx: 0.85,
    fy: 0.22,
    groesseFrac: 0.16,
    verzoegerungMs: 2600,
    tempo: 1,
    deckkraft: 0.8,
  },
  {
    name: "gluehwuermchen",
    quelle: require("../../assets/lottie/chesslynx-firefly-twinkle.json"),
    fx: 0.13,
    fy: 0.8,
    groesseFrac: 0.14,
    verzoegerungMs: 3900,
    tempo: 0.9,
    deckkraft: 0.65,
  },
  {
    // Über dem Schornstein des Häuschens rechts. Der Ausschnitt ist bewusst hoch gesetzt
    // (fy 0.500 statt der gemessenen Spitze 0.538): Rauch steigt, das Motiv braucht den
    // Platz nach oben, nicht mittig um den Schornstein herum.
    name: "rauch",
    quelle: require("../../assets/lottie/chesslynx-chimney-smoke.json"),
    fx: 0.9215,
    fy: 0.5,
    groesseFrac: 0.2,
    verzoegerungMs: 700,
    tempo: 0.7,
    deckkraft: 0.85,
  },
  {
    name: "blasen",
    quelle: require("../../assets/lottie/chesslynx-waterfall-bubbles.json"),
    fx: 0.659,
    fy: 0.675,
    groesseFrac: 0.16,
    verzoegerungMs: 1900,
    tempo: 0.9,
    deckkraft: 0.8,
  },
  {
    name: "glitzern",
    quelle: require("../../assets/lottie/chesslynx-river-sparkle.json"),
    fx: 0.491,
    fy: 0.889,
    groesseFrac: 0.18,
    verzoegerungMs: 3200,
    tempo: 0.85,
    deckkraft: 0.7,
  },
  {
    name: "fischringe",
    quelle: require("../../assets/lottie/chesslynx-fish-rings.json"),
    fx: 0.401,
    fy: 0.9,
    groesseFrac: 0.14,
    verzoegerungMs: 4500,
    tempo: 0.8,
    deckkraft: 0.65,
  },
] as const;

export const WEGMARKEN: WegmarkenEintrag[] = [
  {
    quest: "quest1",
    fx: 150 / REFERENZ_BREITE,
    // 2026-09-13: 16 px tiefer — auf der neuen Karte stand der Igel bei y=590 am Bachufer
    // (gemessene Farbe dort 106/207/201, also Wasser), jetzt mittig auf dem Sandweg.
    fy: 606 / REFERENZ_HOEHE,
    breiteFrac: 45 / REFERENZ_BREITE,
    aspekt: questTierWegmarkeAspekt("quest1"),
  },
  {
    quest: "quest2",
    fx: 255 / REFERENZ_BREITE,
    // 2026-09-13: 14 px höher, damit der Bär mittig auf dem Weg steht statt am unteren Rand.
    fy: 566 / REFERENZ_HOEHE,
    breiteFrac: 50 / REFERENZ_BREITE,
    aspekt: questTierWegmarkeAspekt("quest2"),
  },
  {
    quest: "quest3",
    // 2026-09-13: 20 px nach links und 25 px tiefer, auf den Weg. Abstand zum Pferd
    // gemessen 19 px — die Silhouetten berühren sich nicht.
    fx: 175 / REFERENZ_BREITE,
    fy: 475 / REFERENZ_HOEHE,
    breiteFrac: 56 / REFERENZ_BREITE,
    aspekt: questTierWegmarkeAspekt("quest3"),
  },
  {
    quest: "quest4",
    // 2026-09-14, Nutzerwunsch: „Pferd in etwa an die Stelle des Schwans" (vorher 110/410,
    // tief im linken Wald). Nicht exakt auf dessen alten Punkt 120/300: Dort steht man am
    // Felsufer halb im Wasser — beim Schwan gewollt, beim Pferd nicht (gemessen: 16 %
    // Wasser und 54 % Fels/Dunkelgrün unter den Hufen). 30 Referenzpunkte tiefer steht es
    // mit allen vier Beinen auf dem hellen Weg am linken Brückenkopf (4 % / 18 %), und der
    // Fluss liegt als Kulisse dahinter statt darunter.
    fx: 115 / REFERENZ_BREITE,
    fy: 330 / REFERENZ_HOEHE,
    breiteFrac: 61 / REFERENZ_BREITE,
    aspekt: questTierWegmarkeAspekt("quest4"),
  },
  {
    quest: "quest5",
    // 2026-09-14, Nutzerwunsch: „auf die andere Seite, auf die Lichtung" (vorher 120/300,
    // linkes Flussufer). Jetzt rechts des Flusses auf der offenen Wiese oberhalb der
    // Steinbrücke — die einzige größere Lichtung dieser Karte. Standfläche dort vollständig
    // frei (0 % Wasser, 0 % Dunkelgrün).
    //
    // Nebenwirkung, die hier erwünscht ist: Die Pfad-Lichtungen im Nebel laufen von Quest 4
    // aus jetzt ungefähr über die Steinbrücke statt quer durchs Wasser.
    fx: 270 / REFERENZ_BREITE,
    fy: 290 / REFERENZ_HOEHE,
    breiteFrac: 61 / REFERENZ_BREITE,
    aspekt: questTierWegmarkeAspekt("quest5"),
  },
  {
    quest: "quest6",
    // 2026-09-14, Nutzerwunsch: „weiter hoch neben die Burg" (vorher 245/230, mitten auf der
    // Wiese darunter). Jetzt auf dem Weg unmittelbar links der Wisentfeste, auf Höhe ihrer
    // Grundmauern. Weiter nach rechts ginge nicht: Dort steht der Hirsch vor dem Burgtor und
    // verdeckt genau die Fläche, die als Nächstes angetippt wird.
    fx: 195 / REFERENZ_BREITE,
    fy: 200 / REFERENZ_HOEHE,
    breiteFrac: 52 / REFERENZ_BREITE,
    aspekt: questTierWegmarkeAspekt("quest6"),
  },
];

// Burgtor der Wisentfeste (Schlossvorplatz-Zugang) — Kreis-Mittelpunkt + Durchmesser, ebenfalls
// als Anteil der Referenzmaße (siehe Design-Canvas: ehemals `.gate-tap { left:236px; top:52px;
// width:54px; height:54px }`, hier auf Mittelpunkt umgerechnet: 236+27, 52+27).
// ---------------------------------------------------------------------------------------
// Die fünf Gefährten im Oberland (2026-09-14)
// ---------------------------------------------------------------------------------------
// Reihenfolge und Namen stehen fest (projektwissen.md, Abschnitt Endlosmodus): Die fünf
// Reviere öffnen sich STRIKT LINEAR — Eichhörnchen-Lichtung, Rabenfels, Dachshöhle,
// Adlerhorst, Wolfsfeste. Deshalb stehen sie hier von unten nach oben in genau dieser
// Folge auf dem Weg, der zum Schloss im Hochgebirge hinaufführt; das Kind sieht den Weg
// weitergehen, lange bevor es ihn gehen kann.
//
// Update 2026-09-14, Nutzerentscheidung anhand des eingezeichneten Kartenentwurfs: Der
// WISENT steht als sechste und letzte Station oben vor dem Schloss. Damit ist
// produktionsplan_saga_karte_18_ansichten.md überholt — dort war für Segment 18 noch eine
// Hochland-Wildnis ohne Bauwerk vorgesehen. Die Schildkröte an der Steinbrücke ist die
// siebte Station; sie liegt abseits des Aufstiegs und steht weiter unten im eigenen
// Wegpunkt (SCHILDKROETE_WEGPUNKT).
//
// Sie sind INHALT VON UPDATE 1 (Ende Januar 2027) und deshalb bis dahin gesperrt: nicht
// antippbar, gedimmt, ohne Blinzeln und ohne Glühwürmchen. Im Nebel bekommen sie dieselbe
// Behandlung wie das Burgtor — nur angelichtet, neugierig machend statt versperrt (siehe
// baueOberlandKlarungen).
//
// Die Plätze sind auf dem gemalten Weg eingemessen: Der Wegverlauf wurde im HQ-Master über
// die Wegfarbe verfolgt, die Fußpunkte liegen darauf. Die Kette SCHLÄNGELT sich dabei durch
// den Wald — sie läuft nicht als gerade Linie den Hang hinauf, sondern folgt dem Weg mit
// seinen Kehren, mal nach links, mal nach rechts. Ein Zwischenstand, der sie zu einem
// gestreckten Aufstieg begradigt hatte, wurde am 2026-09-14 wieder verworfen.
//
// OFFEN: Der Abzweig zur Steinbrücke (Schildkröte, siehe SCHILDKROETE_WEGPUNKT) ist bisher
// nur geografisch da — erzählerisch muss noch begründet werden, warum der Weg sich dort
// teilt und wohin die Brücke führt.

// ---------------------------------------------------------------------------------------
// Größenhierarchie im Oberland (2026-09-14)
// ---------------------------------------------------------------------------------------
// Nutzer-Befund: „Das Eichhörnchen ist größer als der Luchs und Fuchs und Wisent." Stimmte —
// die Breiten waren von Hand als reine Perspektivreihe gesetzt (40 → 25 Referenzpunkte, von
// unten nach oben abnehmend). Damit war ausgerechnet das kleinste Tier der Kette die größte
// Figur und der Wisent die kleinste.
//
// Nachgemessen an Q1–Q6 (Höhe der FIGUR in Referenzpunkten, also breiteFrac × aspekt):
//   Igel 77 · Bär 100 · Eule 108 · Pferd 99 · Schwan 101 · Hirsch 100
// Die Hauptkarte kennt also gar keine Perspektive: Alle Stationen stehen gleich hoch, nur
// das eine wirklich kleine Tier (Igel) fällt auf ~0,78 ab. Das ist die Bilderbuch-Konvention
// des Projekts — die Gefährten sind Gleiche, keine Größenstudie.
//
// Das Oberland übernimmt diese Konvention und ergänzt sie um das eine, was dort anders ist:
// Der Weg führt tatsächlich in die Tiefe, vom Kartenrand bis zum Schlosstor. Deshalb
//
//     Figurhöhe = GRUNDHOEHE × Ferne(fy) × Artfaktor
//
// mit GRUNDHOEHE = 100 (der Q1–Q6-Wert), einer schwachen linearen Ferne und einem Artfaktor,
// der dieselbe Spanne nutzt wie der Igel auf der Hauptkarte. Die Ferne ist bewusst schwach:
// Sie soll die Tiefe andeuten, nicht die Artgröße überstimmen. Vorher tat sie genau das.
const OBERLAND_GRUNDHOEHE = 100;
/** Fernfaktor am unteren Rand des Oberlands (Naht zur Hauptkarte) … */
const OBERLAND_FERNE_UNTEN = 0.58;
/** … und ganz oben am Gipfel. Dazwischen linear. */
const OBERLAND_FERNE_OBEN = 0.44;

function oberlandFerne(fy: number) {
  return OBERLAND_FERNE_OBEN + (OBERLAND_FERNE_UNTEN - OBERLAND_FERNE_OBEN) * fy;
}

/**
 * Bildbreite einer Oberland-Figur in Referenzpunkten. `fy` ist der Fußpunkt als Anteil der
 * Oberlandhöhe, `artFaktor` die Artgröße (1,0 = Standardgefährte), `aspekt` Höhe/Breite der
 * Grafik. Gerechnet wird über die HÖHE — nur die ist zwischen verschieden breiten Tieren
 * vergleichbar. Das Musterbeispiel war der Fuchs, der bis zum 2026-09-14 an Station 2 stand:
 * Er ist mit seiner Rute fast so breit wie hoch, nach Breite gestaffelt hätte er winzig
 * ausgesehen. Beim Raben, der ihn ersetzt hat, ist es umgekehrt — schmaler Vogel, fast
 * doppelt so hoch wie breit. Über die Höhe gerechnet stimmen beide.
 */
function oberlandBreite(fy: number, artFaktor: number, aspekt: number) {
  return (OBERLAND_GRUNDHOEHE * oberlandFerne(fy) * artFaktor) / aspekt;
}

// Umgebungsleben im Oberland (2026-09-14). Bis das Oberland auf 1159 Zeilen gewachsen ist,
// lag dort keine einzige Schleife — der obere Kartenteil war eine Standbild-Kulisse, während
// unten Bäume schwankten und Glühwürmchen flogen. Drei genügen, und sie sitzen dort, wo die
// Landschaft ohnehin Bewegung nahelegt: am Wasserfall rechts, an den Wipfeln links über der
// Steinbrücke, und ein Vogel über den Schneegipfeln.
//
// Koordinaten als Anteil von Kartenbreite und OBERLAND-Höhe. Wie unten gilt: versetzte
// Startverzögerungen, sonst fällt der Gleichtakt als Maschine auf.
const AMBIENT_OBERLAND = [
  {
    name: "wasserfall",
    quelle: require("../../assets/lottie/chesslynx-water-shimmer.json"),
    fx: 0.77,
    fy: 0.62,
    groesseFrac: 0.2,
    verzoegerungMs: 0,
    tempo: 0.9,
    deckkraft: 0.5,
  },
  {
    name: "wipfel",
    quelle: require("../../assets/lottie/chesslynx-tree-sway.json"),
    fx: 0.13,
    fy: 0.84,
    groesseFrac: 0.22,
    verzoegerungMs: 1700,
    tempo: 0.8,
    deckkraft: 0.6,
  },
  {
    name: "bergvogel",
    quelle: require("../../assets/lottie/chesslynx-bird-flyaway.json"),
    fx: 0.28,
    fy: 0.2,
    groesseFrac: 0.16,
    verzoegerungMs: 4300,
    tempo: 0.85,
    deckkraft: 0.55,
  },
] as const;

export type GefaehrtenEintrag = {
  id: GefaehrteId;
  name: string;
  /** Fußpunkt als Anteil der OBERLAND-Maße. */
  fx: number;
  fy: number;
  breiteFrac: number;
  aspekt: number;
};

const O = 1159; // Zeilen des Oberlands — die fy-Werte unten sind daran gemessen.

// Artfaktoren (1,0 = Standardgefährte, siehe Größenhierarchie oben). Begründung je Tier:
//   0,78 Eichhörnchen — das kleinste Tier der Kette, exakt der Igel-Wert der Hauptkarte
//   0,90 Dachs        — gedrungen und kurzbeinig, steht spürbar tiefer als Rabe und Wolf
//   0,92 Rabe         — schlanker Vogel; kleiner als die Adlerin, mit der er sich die Klasse
//                       teilt. Ersetzt seit 2026-09-14 den Fuchs (der stand auf 0,96), siehe
//                       src/lib/gefaehrtenZustaende.tsx
//   1,00 Adlerin      — aufrecht stehender Greifvogel, wie die Eule auf der Hauptkarte
//   1,08 Wolf         — größer als Dachs und Rabe, aber kein Koloss
//   1,15 Wisent       — das größte Tier der Welt und Herr der Feste; er soll am Tor auch so
//                       wirken. Vorher war er die KLEINSTE Figur der Karte.
//   0,82 Schildkröte  — klein und niedrig, aber nicht ganz Eichhörnchen-Maß
const GEFAEHRTEN_ROH = [
  {
    id: "eichhoernchen",
    name: "Eichhörnchen-Lichtung",
    fx: 1130 / 1658,
    fy: 1155 / O,
    artFaktor: 0.78,
    aspekt: gefaehrteWegmarkeAspekt("eichhoernchen"),
  },
  {
    id: "rabe",
    name: "Rabenfels",
    // 2026-09-14, vierte Korrekturrunde: noch einmal 35 Zeilen tiefer (vorher 1090). Der Weg
    // ist dort 821–1157 breit, x 940 liegt darin. Der Platz bleibt beim Wechsel vom Fuchs
    // auf den Raben unverändert — nur die Figur ist eine andere.
    fx: 940 / 1658,
    fy: 1125 / O,
    // 0,92 statt der 0,96 des Fuchses: Der Rabe ist ein schlanker Vogel und soll kleiner
    // wirken als die Adlerin (1,00), mit der er sich die Klasse teilt.
    artFaktor: 0.92,
    aspekt: gefaehrteWegmarkeAspekt("rabe"),
  },
  {
    id: "dachs",
    name: "Dachshöhle",
    fx: 760 / 1658,
    fy: 1015 / O,
    artFaktor: 0.9,
    aspekt: gefaehrteWegmarkeAspekt("dachs"),
  },
  {
    id: "adlerin",
    name: "Adlerhorst",
    // 2026-09-14, letzte Runde: 1030 → 1075 → 1035 und 14 Zeilen tiefer. Der Weg läuft auf
    // y 892 von x 844 bis 1093; 1035 liegt darin, rechts der Wegmitte (968), aber nicht mehr
    // am äußersten Rand wie bei 1075.
    fx: 1035 / 1658,
    fy: 892 / O,
    artFaktor: 1.0,
    aspekt: gefaehrteWegmarkeAspekt("adlerin"),
  },
  {
    id: "wolf",
    name: "Wolfsfeste",
    // 2026-09-14, letzte Runde: nach unten und rechts (vorher 1160 · 710). Auf y 710 liegt
    // die Kehre noch breit (x 976–1220); dreißig Zeilen tiefer ist der Weg dort schon nach
    // rechts abgebogen (x 1126–1288), und 1205 steht mittig darauf.
    fx: 1205 / 1658,
    fy: 740 / O,
    artFaktor: 1.08,
    aspekt: gefaehrteWegmarkeAspekt("wolf"),
  },
  {
    id: "wisent",
    name: "Wisent — vor dem Schlosstor",
    fx: 1017 / 1658,
    fy: 552 / O,
    artFaktor: 1.15,
    aspekt: gefaehrteWegmarkeAspekt("wisent"),
  },
] as const;

export const GEFAEHRTEN: GefaehrtenEintrag[] = GEFAEHRTEN_ROH.map((g) => ({
  id: g.id,
  name: g.name,
  fx: g.fx,
  fy: g.fy,
  aspekt: g.aspekt,
  breiteFrac: oberlandBreite(g.fy, g.artFaktor, g.aspekt) / REFERENZ_BREITE,
}));

// Schildkröten-Wegpunkt (siehe Kopfkommentar weiter oben): linker Brückenkopf auf der Wiese.
const SCHILDKROETE_WEGPUNKT = {
  fx: 335 / 1658,
  fy: 1055 / O,
  breiteFrac: oberlandBreite(1055 / O, 0.82, SCHILDKROETE_ASPEKT) / REFERENZ_BREITE,
};

const BURGTOR = { fx: 263 / REFERENZ_BREITE, fy: 79 / REFERENZ_HOEHE, durchmesserFrac: 54 / REFERENZ_BREITE };

type Klarung = {
  cx: number;
  cy: number;
  r: number;
  zentrum: number;
  /**
   * Anteil des Radius, bis zu dem der Zentrumswert UNVERÄNDERT gilt, bevor er zur Umgebung
   * ausblendet (0 = sofort ausblenden, der bisherige Fall).
   *
   * Nutzer-Feedback 2026-09-14: "Der nebelfreie Ausschnitt sollte die ganze Figur und etwas
   * drumherum frei machen." Ohne diesen Kern beginnt der Verlauf schon in der Mitte
   * abzublenden — die Lichtung war damit nur in ihrem Zentrum wirklich frei, und das Tier
   * stand mit Kopf und Schultern bereits wieder im Nebel.
   */
  kern?: number;
};

// Baut die Liste weicher "Lichtungen", die die Nebelmaske in das Höhenband schneidet — analog
// zur `fortschritt-fog-mask` im alten SVG-Design-Canvas (siehe Datei-Kopfkommentar): volle
// Lichtung um jede erledigte Wegmarke, eine schwächere Aufhellung um die als-nächstes-dran-
// Wegmarke, ein paar Zwischenpunkte entlang des bereits zurückgelegten Wegstücks (damit der Pfad
// selbst durchgehend "durchschimmert" statt nur einzelne Kreise), ein fester Eingangsbereich am
// unteren Kartenrand (immer leicht gelichtet, siehe Kommentar bei `nebelTextur`: "praktisch klar
// am Lichtungs-Eingang") sowie der dauerhaft leicht gelichtete Burgtor-Bereich.
// Stützstellen für den senkrechten Dichteverlauf der Nebelmaske, ausgedrückt als Anteil
// der GESAMTEN Kartenhöhe (Oberland + Karte), von oben nach unten. Weiß = voller Nebel,
// Schwarz = frei. Die Lichtungen (siehe baueNebelKlarungen) werden anschließend darüber
// gezeichnet und stanzen ihre Kreise hinein.
// Maskenwert als Graustufe: 1 = voller Nebel (weiß), 0 = frei (schwarz).
function grauwert(wert: number): string {
  const v = Math.round(Math.max(0, Math.min(1, wert)) * 255);
  return `rgb(${v}, ${v}, ${v})`;
}

// Testmodus-Vorschau (siehe `testAnsicht.ts`): Bis zu diesem Anteil der Oberland-Höhe
// liegt gar kein Nebel; darunter blendet er wieder ein, bis er an der obersten Wegmarke der
// Karte (Quest 6) seinen normalen Wert erreicht hat.
//
// Warum nicht einfach die Nebel-Ebene des Oberlands weglassen: An der Naht zwischen Oberland
// und Karte stünde dann eine harte waagerechte Kante — oben klar, direkt darunter voller
// Nebel (der senkrechte Verlauf liegt dort ohne Fortschritt bei 1). Die Einblendung läuft
// stattdessen über die Naht hinweg und ist erst an Quest 6 fertig; von dort abwärts bleibt
// die Karte in der Vorschau unverändert. Der unterste Gefährte (Eichhörnchen, fy ≈ 0,997)
// steht zwar im Anlauf der Einblendung, wird aber wie alle anderen von seiner eigenen
// Lichtung (NEBEL_KLARUNG_VOLL samt Kern) freigestellt.
const VORSCHAU_OBERLAND_FREI_BIS = 0.92;

function baueNebelVerlauf(
  status: Record<QuestId, WegmarkeStatus> | null,
  oberlandHoehe: number,
  hoehe: number,
  oberlandFrei = false
): { offset: number; wert: number }[] {
  const gesamt = oberlandHoehe + hoehe;
  const erledigt = WEGMARKEN.filter((w) => status?.[w.quest] === "erledigt").length;
  // WEGMARKEN laufen von unten (Quest 1) nach oben (Quest 6) — für den Verlauf brauchen
  // wir aufsteigende Offsets, also von oben nach unten.
  const stufen = WEGMARKEN.map((w, i) => {
    const rang = i - erledigt;
    const wert =
      rang < 0 ? 0 : NEBEL_ZIEL_DECKUNG[Math.min(rang, NEBEL_ZIEL_DECKUNG.length - 1)];
    return { offset: (oberlandHoehe + w.fy * hoehe) / gesamt, wert };
  });
  stufen.reverse();
  if (oberlandFrei) {
    return [
      { offset: 0, wert: 0 },
      { offset: (oberlandHoehe * VORSCHAU_OBERLAND_FREI_BIS) / gesamt, wert: 0 },
      ...stufen,
      { offset: 1, wert: 0 },
    ];
  }
  return [{ offset: 0, wert: 1 }, ...stufen, { offset: 1, wert: 0 }];
}

/** Nebeldichte des senkrechten Verlaufs an einer Stelle (0 = oben, 1 = unten). */
function nebelWertBei(verlauf: { offset: number; wert: number }[], offset: number): number {
  if (verlauf.length === 0) return 0;
  const o = Math.max(0, Math.min(1, offset));
  for (let i = 1; i < verlauf.length; i++) {
    const a = verlauf[i - 1];
    const b = verlauf[i];
    if (o <= b.offset) {
      const spanne = b.offset - a.offset;
      const t = spanne <= 0 ? 0 : (o - a.offset) / spanne;
      return a.wert + (b.wert - a.wert) * t;
    }
  }
  return verlauf[verlauf.length - 1].wert;
}

/**
 * Die beiden Stopp-Farben einer Lichtung: innen und außen.
 *
 * Gerätetest 2026-09-14 (Nutzer: "Der weiße Kreis und der Ring wirken nicht gut … wird
 * aufgrund des Nebels, der grüßenden Geste etc nicht benötigt"). Um die nächste Wegmarke
 * lag eine helle Scheibe mit erkennbarem Rand. Ursache: Die Lichtungen wurden als Kreise
 * ÜBER den senkrechten Verlauf in die Maske gemalt und haben ihn dabei ersetzt, nicht
 * abgeschwächt — außen immer mit Weiß, also mit vollem Nebel. Am unteren Kartenrand, wo der
 * Verlauf ohnehin bei 0 steht ("praktisch klar am Lichtungs-Eingang"), hat die Lichtung dort
 * also Nebel HINZUGEFÜGT statt weggenommen, und ihr weißer Rand am meisten.
 *
 * Jetzt wird gegen die Umgebung gerechnet: außen genau der Wert, der dort ohnehin gilt —
 * damit ist der Rand unsichtbar —, innen das Minimum aus Zielwert und Umgebung. Eine
 * Lichtung kann dadurch nur noch Nebel wegnehmen, nie welchen dazulegen. Wo kein Nebel
 * liegt, ist sie unsichtbar; wo dichter Nebel liegt, wirkt sie wie zuvor.
 */
function klarungsFarben(
  k: Klarung,
  verlauf: { offset: number; wert: number }[],
  gesamtHoehe: number,
  yVersatz: number
): [string, string] {
  const aussen = nebelWertBei(verlauf, (yVersatz + k.cy) / gesamtHoehe);
  return [grauwert(Math.min(k.zentrum, aussen)), grauwert(aussen)];
}

/**
 * Eine Lichtung, die eine stehende Figur vollständig freistellt.
 *
 * `cx`/`cy` ist der FUSSPUNKT der Figur (dort sitzt die Wegmarke), `breite`/`aspekt` ihre
 * Maße. Der Kreis wird auf die Mitte der Figur gehoben und so bemessen, dass die Figur samt
 * einem Fünftel ihrer halben Höhe als Rand vollständig im freien Kern liegt; erst danach
 * blendet er zur Umgebung aus.
 *
 * Vorher saß die Lichtung am Fußpunkt und war kleiner als die Figur — der Kopf ragte oben
 * heraus und stand wieder im Nebel.
 */
function figurLichtung(
  cx: number,
  cy: number,
  breite: number,
  aspekt: number,
  zentrum: number = NEBEL_KLARUNG_VOLL
): Klarung {
  const figurHoehe = breite * aspekt;
  const halb = Math.max(figurHoehe, breite) / 2;
  return {
    cx,
    cy: cy - figurHoehe / 2,
    r: halb * 2,
    zentrum,
    // 0,6 × Radius = 1,2 × halbe Figurhöhe: die Figur plus 20 % Rand liegen im freien Kern.
    kern: 0.6,
  };
}

function baueNebelKlarungen(
  status: Record<QuestId, WegmarkeStatus> | null,
  breite: number,
  hoehe: number
): Klarung[] {
  const pfadRadius = 0.1 * breite;
  const klarungen: Klarung[] = [
    // Lichtungs-Eingang unten (vor der ersten Wegmarke) — immer leicht angelichtet.
    { cx: WEGMARKEN[0].fx * breite, cy: hoehe, r: 0.14 * breite, zentrum: NEBEL_KLARUNG_NAECHSTES },
  ];

  WEGMARKEN.forEach((w, i) => {
    const zustand = status?.[w.quest] ?? "gesperrt";
    const cx = w.fx * breite;
    const cy = w.fy * hoehe;
    if (zustand === "erledigt" || zustand === "naechstes") {
      klarungen.push(figurLichtung(cx, cy, w.breiteFrac * breite, w.aspekt));
    }

    // Pfad-Zwischenpunkte zur nächsten Wegmarke (bzw. zum Burgtor nach der letzten) — nur wenn
    // dieses Stück bereits zurückgelegt ist (aktuelle Wegmarke erledigt), sonst bleibt der
    // weitere Weg unter dem vollen Nebel.
    if (zustand === "erledigt") {
      const ziel = WEGMARKEN[i + 1] ?? BURGTOR;
      const zielX = ziel.fx * breite;
      const zielY = ziel.fy * hoehe;
      const schritte = 4;
      for (let s = 1; s < schritte; s++) {
        const t = s / schritte;
        klarungen.push({
          cx: cx + (zielX - cx) * t,
          cy: cy + (zielY - cy) * t,
          r: pfadRadius,
          zentrum: NEBEL_KLARUNG_VOLL,
        });
      }
    }
  });

  klarungen.push({
    cx: BURGTOR.fx * breite,
    cy: BURGTOR.fy * hoehe,
    r: 0.13 * breite,
    zentrum: NEBEL_KLARUNG_BURGTOR,
  });

  return klarungen;
}

type Props = {
  onSelectQuest: (quest: QuestId) => void;
  onSelectSchlossvorplatz: () => void;
  // Paket 3 (2026-09-11): Schildkröten-Wegpunkt an der Steinbrücke.
  onSelectSteinbruecke?: () => void;
  // Meldet die gemessenen Höhen (Oberland-Stück, bisherige Karte), damit KidHome die
  // Scroll-Startposition so setzen kann, dass die bisherige Karte unverändert dort steht,
  // wo sie vor der Erweiterung stand (siehe RootNavigator.tsx, KidHome).
  onHoehen?: (hoehen: { oberland: number; karte: number }) => void;
  // Wird aufgerufen, wenn die Schildkröte gerade "als nächstes dran" ist (Schlosstor offen,
  // Kapitel noch nicht gespielt) — KidHome scrollt dann sanft nach oben, damit das Kind den
  // neuen Wegpunkt überhaupt entdeckt (Fünfjährige wischen nicht von selbst nach oben).
  onSteinbrueckeWartet?: () => void;
  // Gerätetest 2026-09-11 (Bugfix): Breite von außen vorgeben. Innerhalb der KidHome-ScrollView
  // lieferte die eigene onLayout-Messung auf dem Testgerät (nach dem Besuch der Steinbrücke) eine
  // um ein Vielfaches zu große Breite — die Karte war stark vergrößert, nur ein Streifen am
  // linken Rand sichtbar, keine Wegmarke erreichbar. KidHome misst jetzt seinen eigenen,
  // bildschirmfüllenden Rahmen und reicht die Breite hier herein; die eigene Messung bleibt nur
  // als Rückfall für Aufrufer ohne Vorgabe.
  breiteVorgabe?: number;
  // Update-1-Vorzug (2026-09-15, siehe claude/update1_vorzug_plan_2026-09-15.md): macht die
  // fünf Gefährten-Reviere zum ersten Mal antippbar. Bewusst OHNE den Wisent-Torwächter an
  // dieser Stelle (Wisent-Kampf ist ein eigener, weiter entfernter Screen, Segment 18 — nicht
  // Teil dieses Schritts). Ohne diese Prop bleiben alle sechs wie bisher gesperrt/nur per
  // Testansicht sichtbar.
  onSelectGefaehrte?: (id: GefaehrteId) => void;
  // Update-1-Vorzug, Fortsetzung (2026-09-15): der Wisent-Torwächter bekommt jetzt eine EIGENE
  // Prop statt über `onSelectGefaehrte` zu laufen — er führt nicht zu einem generischen
  // Revier-Screen (dafür gibt es beim Wisent keine Endlosmodus-Fokus-Spalte, siehe
  // lib/endlosmodusSpalten.ts). Wisent-Kür-Runde (2026-09-15, siehe
  // claude/wisent_kuer_verdrahtung_2026-09-15.md): der eigentliche Aufrufer (RootNavigator.tsx)
  // lässt diese Prop inzwischen zum Kür-Auswahl-Hub statt direkt zum Wisent-Boss-Puzzle führen —
  // LuchsRevierKarte selbst bleibt davon unberührt, kennt nur die Prop, nicht ihr Ziel. Ohne
  // diese Prop bleibt der Torwächter wie bisher gesperrt/nur per Testansicht sichtbar,
  // unabhängig davon, ob `onSelectGefaehrte` gesetzt ist.
  onSelectWisent?: () => void;
};

export function LuchsRevierKarte({
  onSelectQuest,
  onSelectSchlossvorplatz,
  onSelectSteinbruecke,
  onHoehen,
  onSteinbrueckeWartet,
  breiteVorgabe,
  onSelectGefaehrte,
  onSelectWisent,
}: Props) {
  // Schleifen laufen nur, solange die Karte wirklich vorn ist — vier gleichzeitig laufende
  // Lottie-Ansichten kosten auf Android sonst auch dann Leistung, wenn ein Quest-Screen
  // darüber liegt (siehe Android-Speicherverdacht in status_content_produktion.md).
  const karteSichtbar = useIsFocused();
  const [gemesseneBreite, setBreite] = useState(0);
  const breite = breiteVorgabe && breiteVorgabe > 0 ? breiteVorgabe : gemesseneBreite;
  const [status, setStatus] = useState<Record<QuestId, WegmarkeStatus> | null>(null);
  const [steinbruecke, setSteinbruecke] = useState<WegmarkeStatus>("gesperrt");
  // Testmodus-Ansichten (siehe lib/testAnsicht.ts). Lesen bei jedem Fokussieren neu, weil
  // KidHome — anders als die Quest-Screens — beim Zurückkommen aus dem Eltern-Bereich
  // nicht neu gemountet wird.
  const gefaehrtenVorschau = useTestAnsicht("gefaehrtenVorschau");
  const alleGruessen = useTestAnsicht("alleGruessen");
  const nebelAus = useTestAnsicht("nebelAus");
  const onSteinbrueckeWartetRef = useRef(onSteinbrueckeWartet);
  onSteinbrueckeWartetRef.current = onSteinbrueckeWartet;

  // Fortschritt neu laden, sobald die Karte (wieder) sichtbar wird — z. B. nach Rückkehr aus
  // einer gerade abgeschlossenen Quest. Analog zum bereits etablierten Muster in
  // Schlossvorplatz.tsx.
  useFocusEffect(
    useCallback(() => {
      let abgebrochen = false;
      (async () => {
        const eintraege = await Promise.all(WEGMARKEN.map((w) => loadQuestFortschrittLocal(w.quest)));
        if (abgebrochen) return;
        const naechsterIndex = eintraege.findIndex((f) => !f?.abgeschlossen);
        const neu = {} as Record<QuestId, WegmarkeStatus>;
        WEGMARKEN.forEach((w, i) => {
          neu[w.quest] = eintraege[i]?.abgeschlossen ? "erledigt" : i === naechsterIndex ? "naechstes" : "gesperrt";
        });
        setStatus(neu);

        // Paket 3: Schildkröten-Wegpunkt.
        const [tor, ganzePartie] = await Promise.all([
          pruefeSchlosstorStatus(),
          loadBonusFortschrittLocal("ganzePartie"),
        ]);
        if (abgebrochen) return;
        const zustand: WegmarkeStatus = !tor.offen ? "gesperrt" : ganzePartie ? "erledigt" : "naechstes";
        setSteinbruecke(zustand);
        if (zustand === "naechstes") onSteinbrueckeWartetRef.current?.();
      })();
      return () => {
        abgebrochen = true;
      };
    }, [])
  );

  const onLayout = (e: LayoutChangeEvent) => {
    if (breiteVorgabe && breiteVorgabe > 0) return;
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - gemesseneBreite) > 0.5) setBreite(w);
  };

  const hoehe = breite * MAP_ASPECT;
  // Gerätetest 2026-09-14 (Nutzer: "Übergang von der Saga-Karte immer noch deutlich
  // sichtbar"): An der Naht stand eine genau EINEN Pixel hohe dunkle Linie quer über die
  // ganze Breite — gemessen im Screenshot 203/206/178 gegenüber 228/229/222 in den Zeilen
  // direkt darüber und darunter, mit Grünstich, also die Unterkante des Oberland-Bildes mit
  // zu wenig Nebel darauf.
  //
  // Ursache: `breite * OBERLAND_ASPECT` ist krumm (bei 390 Punkten Breite 122,06). Das
  // Oberland-Stück und das Nebel-SVG darin sind damit 122,06 Punkte hoch; die letzte,
  // angeschnittene Zeile wird beim Zeichnen weichgerechnet und bekommt entsprechend weniger
  // Nebeldeckung ab, während die Karte darunter ihre volle bekommt. Auf ganze Punkte
  // gerundet fällt die Naht auf eine Pixelgrenze und das Problem entfällt.
  const oberlandHoehe = Math.round(breite * OBERLAND_ASPECT);
  const burgtorDurchmesser = BURGTOR.durchmesserFrac * breite;
  const torOffen = steinbruecke !== "gesperrt";
  const nebelKlarungen = breite > 0 ? baueNebelKlarungen(status, breite, hoehe) : [];
  // In der Testmodus-Vorschau liegt über dem Oberland kein Nebel mehr (Nutzerwunsch
  // 2026-09-14: "ungedimmt und nebelfrei anzeigen bitte"). Die sieben Lichtungen allein
  // genügten dafür nicht — sieben kleine Aufhellungen in einem sonst vollen Höhenband
  // lassen das Oberland weiter vernebelt wirken. Der Verlauf selbst muss weg.
  //
  // `nebelAus` geht weiter und nimmt den Nebel auf der GANZEN Karte weg, unabhängig vom
  // Fortschritt. Ein durchgehend schwarzer Verlauf maskiert die Nebeltextur vollständig
  // aus; die Lichtungen werden dadurch von selbst unsichtbar (`klarungsFarben` rechnet
  // sie gegen die Umgebung, und die ist hier überall frei).
  const nebelVerlauf =
    breite <= 0
      ? []
      : nebelAus
        ? [
            { offset: 0, wert: 0 },
            { offset: 1, wert: 0 },
          ]
        : baueNebelVerlauf(status, oberlandHoehe, hoehe, gefaehrtenVorschau);
  const nebelGesamtHoehe = oberlandHoehe + hoehe;
  // Paket 3: bei offenem Schlosstor lichtet sich der Weg vom Burgtor bis zur Oberkante der
  // Karte (dort geht er im Oberland-Stück weiter, siehe oberlandKlarungen).
  const turtleX = SCHILDKROETE_WEGPUNKT.fx * breite;
  if (breite > 0 && torOffen) {
    const vonX = BURGTOR.fx * breite;
    const vonY = BURGTOR.fy * hoehe;
    for (let s = 1; s <= 3; s++) {
      const t = s / 3;
      nebelKlarungen.push({
        cx: vonX + (turtleX - vonX) * t,
        cy: vonY * (1 - t),
        r: 0.1 * breite,
        zentrum: NEBEL_KLARUNG_VOLL,
      });
    }
  }
  const oberlandKlarungen: Klarung[] = [];
  if (breite > 0) {
    const turtleY = SCHILDKROETE_WEGPUNKT.fy * oberlandHoehe;
    if (torOffen) {
      oberlandKlarungen.push({ cx: turtleX, cy: oberlandHoehe, r: 0.1 * breite, zentrum: NEBEL_KLARUNG_VOLL });
      oberlandKlarungen.push({
        cx: turtleX,
        cy: (turtleY + oberlandHoehe) / 2,
        r: 0.1 * breite,
        zentrum: NEBEL_KLARUNG_VOLL,
      });
      // Dieselbe Rechnung wie bei den Quest-Tieren: Die Lichtung stellt die ganze Figur
      // frei, nicht nur die Stelle, an der sie steht.
      oberlandKlarungen.push(
        figurLichtung(turtleX, turtleY, SCHILDKROETE_WEGPUNKT.breiteFrac * breite, SCHILDKROETE_ASPEKT)
      );
      if (steinbruecke === "erledigt") {
        // Ganz aufgedeckt: auch Brücke und Wiese drumherum.
        oberlandKlarungen.push({ cx: 0.3 * breite, cy: 0.55 * oberlandHoehe, r: 0.22 * breite, zentrum: NEBEL_KLARUNG_VOLL });
        oberlandKlarungen.push({ cx: 0.6 * breite, cy: 0.5 * oberlandHoehe, r: 0.22 * breite, zentrum: NEBEL_KLARUNG_VOLL });
      }
    } else {
      // Schlosstor noch zu: die Schildkröte schimmert nur ganz leicht durch die Wolken —
      // genau wie das Burgtor (NEBEL_KLARUNG_BURGTOR), neugierig machend statt versperrt.
      oberlandKlarungen.push(figurLichtung(turtleX, turtleY, SCHILDKROETE_WEGPUNKT.breiteFrac * breite, SCHILDKROETE_ASPEKT, NEBEL_KLARUNG_BURGTOR));
    }
    // Die Gefährten schimmern dauerhaft durch, unabhängig vom Fortschritt: Sie sind
    // Update-1-Inhalt, und genau das sollen sie erzählen — der Weg geht weiter. Derselbe
    // Wert wie beim Burgtor.
    //
    // Mit der Testmodus-Vorschau (2026-09-14) stehen sie stattdessen ganz frei, damit
    // Illustration, Größenstaffelung und Platz auf dem Weg beurteilbar sind. Dort liegt
    // ohnehin kein Nebel mehr (siehe `nebelVerlauf` weiter unten), die Lichtung ist damit
    // wirkungslos — `klarungsFarben` rechnet sie gegen die Umgebung und sie verschwindet.
    // Sie bleibt trotzdem auf diesem Wert, damit der Anlauf der Nebel-Einblendung unten am
    // Eichhörnchen nicht doch noch Schleier auf die Figur legt.
    // Update-1-Vorzug (2026-09-15): Die fünf echten Reviere (nicht der Wisent-Torwächter,
    // siehe Props-Kommentar bei `onSelectGefaehrte`) sind, sobald `onSelectGefaehrte` gesetzt
    // ist, genauso erreichbar wie jede andere offene Station — sie sollen dann auch genauso
    // klar aus dem Nebel treten, nicht mehr nur "neugierig machend" durchschimmern.
    const gefaehrtenLichtung = gefaehrtenVorschau ? NEBEL_KLARUNG_VOLL : NEBEL_KLARUNG_BURGTOR;
    for (const g of GEFAEHRTEN) {
      // Update-1-Vorzug, Fortsetzung (2026-09-15): der Wisent hat jetzt seine eigene
      // Freischalt-Bedingung (`onSelectWisent` statt `onSelectGefaehrte`), siehe Props-
      // Kommentar oben.
      const antippbar = g.id === "wisent" ? Boolean(onSelectWisent) : Boolean(onSelectGefaehrte);
      const lichtung = antippbar ? NEBEL_KLARUNG_VOLL : gefaehrtenLichtung;
      oberlandKlarungen.push(
        figurLichtung(g.fx * breite, g.fy * oberlandHoehe, g.breiteFrac * breite, g.aspekt, lichtung)
      );
    }
  }
  const turtleBreite = SCHILDKROETE_WEGPUNKT.breiteFrac * breite;

  useEffect(() => {
    if (breite > 0) onHoehen?.({ oberland: oberlandHoehe, karte: hoehe });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breite]);

  return (
    <View style={[styles.wrap, breite > 0 && { width: breite }]} onLayout={onLayout} collapsable={false}>
      {breite > 0 && (
        <ImageBackground source={oberland} style={{ width: breite, height: oberlandHoehe }} resizeMode="cover">
          <Wegmarke
            schildkroete
            left={turtleX}
            top={SCHILDKROETE_WEGPUNKT.fy * oberlandHoehe}
            breite={turtleBreite}
            hoehe={turtleBreite * SCHILDKROETE_ASPEKT}
            zustand={steinbruecke}
            onPress={steinbruecke === "gesperrt" ? undefined : onSelectSteinbruecke}
            pausiert={!karteSichtbar}
          />
          {AMBIENT_OBERLAND.map((a) => {
            const seite = a.groesseFrac * breite;
            return (
              <AmbientLoop
                key={a.name}
                quelle={a.quelle}
                groesse={seite}
                position={{ left: a.fx * breite - seite / 2, top: a.fy * oberlandHoehe - seite / 2 }}
                verzoegerungMs={a.verzoegerungMs}
                tempo={a.tempo}
                deckkraft={a.deckkraft}
                pausiert={!karteSichtbar}
              />
            );
          })}
          {/* Die fünf Gefährten. Bewusst dieselbe `Wegmarke`-Komponente wie alle anderen
              Stationen — sie bringt Fußpunkt-Verankerung und Bodenschatten mit. Update-1-
              Vorzug (2026-09-15): sobald `onSelectGefaehrte` gesetzt ist, sind sie echt
              antippbar (siehe Props-Kommentar) — ohne die Prop bleibt das Verhalten wie zuvor
              (gesperrt, nur per Testansicht sichtbar). */}
          {/* Von hinten nach vorn: Die Liste läuft von unten (nah) nach oben (fern); gezeichnet
              wird umgekehrt, damit eine näher stehende Figur eine weiter entfernte überdeckt
              und nicht andersherum. Auf dem Zickzack des Weges stehen die Stationen dicht
              beieinander — ohne diese Reihenfolge stünde der Wolf vor der Adlerin, obwohl er
              hinter ihr den Berg hinaufgeht. */}
          {[...GEFAEHRTEN].reverse().map((g) => {
            const gBreite = g.breiteFrac * breite;
            // Update-1-Vorzug (2026-09-15): die fünf echten Reviere bekommen "offen" (voll
            // aufgedeckt, antippbar, aber ohne Häkchen/Glühwürmchen — siehe WegmarkeStatus-
            // Kommentar oben) plus ein echtes onPress zur neuen Revier-Route. Fortsetzung
            // (2026-09-15): der Wisent-Torwächter bekommt jetzt genauso ein echtes onPress,
            // aber über die eigene `onSelectWisent`-Prop (siehe Props-Kommentar oben) statt
            // über `onSelectGefaehrte(g.id)` — nicht zu einem generischen Revier-Screen.
            const antippbar = g.id === "wisent" ? Boolean(onSelectWisent) : Boolean(onSelectGefaehrte);
            const press =
              g.id === "wisent"
                ? onSelectWisent
                : onSelectGefaehrte
                  ? () => onSelectGefaehrte(g.id)
                  : undefined;
            return (
              <Wegmarke
                key={g.id}
                gefaehrte={g.id}
                left={g.fx * breite}
                top={g.fy * oberlandHoehe}
                breite={gBreite}
                hoehe={gBreite * g.aspekt}
                zustand={antippbar ? "offen" : gefaehrtenVorschau ? "erledigt" : "gesperrt"}
                onPress={antippbar ? press : undefined}
              />
            );
          })}
          {/* Nebel wie auf der Karte darunter, aber vertikal gespiegelt: so trifft die
              Unterkante dieses Stücks genau auf dieselbe Nebelzeile (Oberkante des
              Höhenbands) wie die Oberkante der Karte — kein sichtbarer Nebel-Sprung an der
              Naht. Spiegelung auf dem inneren Bild, Maske auf der Gruppe, damit die Maske
              selbst ungespiegelt in Kartenkoordinaten bleibt. */}
          {/* Einen Punkt höher als das Oberland-Stück selbst: Der Nebel des Oberlands und
              der Nebel der Karte überlappen sich dadurch an der Naht, statt sich exakt zu
              berühren. Selbst wenn die Rundung oben auf einem Gerät mit krummer
              Pixeldichte nicht ganz aufgeht, bleibt so keine Zeile ohne Nebel. Der Nebel
              ist deckend und in beiden Hälften aus derselben Textur an derselben Stelle
              gezeichnet — die Überlappung ist deshalb unsichtbar. */}
          <Svg
            width={breite}
            height={oberlandHoehe + 1}
            style={{ position: "absolute", left: 0, top: 0 }}
            pointerEvents="none"
          >
            <Defs>
              {oberlandKlarungen.map((k, i) => {
                // Die Lichtungen des Oberlands liegen bereits in Gesamtkoordinaten (y=0 ist
                // der obere Rand des Oberlands), deshalb kein Versatz.
                const [innen, aussen] = klarungsFarben(k, nebelVerlauf, nebelGesamtHoehe, 0);
                return (
                  <RadialGradient key={i} id={`oberlandKlarung-${i}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={innen} stopOpacity={1} />
                    {/* Der Kern hält den Innenwert, bis die Figur ganz frei ist — erst
                        danach wird zur Umgebung ausgeblendet. */}
                    <Stop offset={`${Math.round((k.kern ?? 0) * 100)}%`} stopColor={innen} stopOpacity={1} />
                    <Stop offset="100%" stopColor={aussen} stopOpacity={1} />
                  </RadialGradient>
                );
              })}
              {/* Senkrechter Dichteverlauf in Koordinaten der GESAMTEN Karte (Oberland +
                  Karte), damit beide Hälften dieselbe Kurve sehen und an der Naht nichts
                  springt. Siehe baueNebelVerlauf. */}
              <LinearGradient
                id="oberlandNebelHoehe"
                x1={0}
                y1={0}
                x2={0}
                y2={nebelGesamtHoehe}
                gradientUnits="userSpaceOnUse"
              >
                {nebelVerlauf.map((v, i) => (
                  <Stop key={i} offset={v.offset} stopColor={grauwert(v.wert)} stopOpacity={1} />
                ))}
              </LinearGradient>
              <Mask id="oberlandMaske" maskUnits="userSpaceOnUse" x={0} y={0} width={breite} height={oberlandHoehe + 1}>
                <Rect x={0} y={0} width={breite} height={oberlandHoehe + 1} fill="url(#oberlandNebelHoehe)" />
                {oberlandKlarungen.map((k, i) => (
                  <Circle key={i} cx={k.cx} cy={k.cy} r={k.r} fill={`url(#oberlandKlarung-${i})`} />
                ))}
              </Mask>
            </Defs>
            <G mask="url(#oberlandMaske)">
              {/* Die neue Textur deckt Oberland UND Karte in einem Stück ab — deshalb hier
                  einfach über die Gesamthöhe gezeichnet, ohne Spiegelung und ohne den
                  früheren Randstreifen-Versatz. */}
              <SvgBild
                href={nebelTextur}
                x={0}
                y={0}
                width={breite}
                height={nebelGesamtHoehe}
                preserveAspectRatio="none"
              />
            </G>
          </Svg>
        </ImageBackground>
      )}
      {breite > 0 && (
        <ImageBackground source={hintergrund} style={{ width: breite, height: hoehe }} resizeMode="cover">
          {AMBIENT_SCHLEIFEN.map((s) => {
            const seite = s.groesseFrac * breite;
            return (
              <AmbientLoop
                key={s.name}
                quelle={s.quelle}
                groesse={seite}
                position={{ left: s.fx * breite - seite / 2, top: s.fy * hoehe - seite / 2 }}
                verzoegerungMs={s.verzoegerungMs}
                tempo={s.tempo}
                deckkraft={s.deckkraft}
                pausiert={!karteSichtbar}
              />
            );
          })}

          <Pressable
            onPress={onSelectSchlossvorplatz}
            accessibilityLabel="Zum Schlossvorplatz"
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            style={[
              styles.burgtor,
              {
                left: BURGTOR.fx * breite - burgtorDurchmesser / 2,
                top: BURGTOR.fy * hoehe - burgtorDurchmesser / 2,
                width: burgtorDurchmesser,
                height: burgtorDurchmesser,
                borderRadius: burgtorDurchmesser / 2,
              },
            ]}
          />

          {WEGMARKEN.map((w) => {
            const zustand = status?.[w.quest] ?? "gesperrt";
            const bildBreite = w.breiteFrac * breite;
            const bildHoehe = bildBreite * w.aspekt;
            return (
              <Wegmarke
                key={w.quest}
                // Die sechs Quest-Tiere kommen als Zustandsfamilie (blinzeln, und das
                // nächste grüßt); die Schildkröte weiter oben ist weiterhin ein Standbild.
                tier={w.quest}
                // Normalfall: Die Geste markiert die nächste Station. Wer alles freigespielt
                // hat, sieht sie deshalb nirgends mehr — es gibt kein „nächstes". Der
                // Testmodus-Schalter lässt sie dann bei allen erledigten Tieren mitlaufen,
                // damit sich die sechs Gesten überhaupt prüfen lassen. Gesperrte Tiere
                // grüßen weiterhin nicht: Sie stehen im Nebel.
                gruesst={zustand === "naechstes" || (alleGruessen && zustand === "erledigt")}
                pausiert={!karteSichtbar}
                left={w.fx * breite}
                top={w.fy * hoehe}
                breite={bildBreite}
                hoehe={bildHoehe}
                zustand={zustand}
                onPress={zustand === "gesperrt" ? undefined : () => onSelectQuest(w.quest)}
              />
            );
          })}

          {/* Nebel-/Wolken-Höhenband, siehe Datei-Kopfkommentar. `pointerEvents="none"`, damit
              diese rein optische Ebene die Taps auf die darunterliegenden Wegmarken/das Burgtor
              nicht blockiert — genau wie beim Puls-Ring/Schatten einzelner Wegmarken oben. Ein
              einzelnes <Svg>-Element als direktes ImageBackground-Kind, konsistent mit dem
              Android/Fabric-Fallstrick-Hinweis im Datei-Kopfkommentar. */}
          <Svg
            width={breite}
            height={hoehe}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              {nebelKlarungen.map((k, i) => {
                // Die Lichtungen der Karte werden in Kartenkoordinaten gebaut — für den
                // senkrechten Verlauf zählt die Gesamthöhe, also um die Oberlandhöhe versetzt.
                const [innen, aussen] = klarungsFarben(k, nebelVerlauf, nebelGesamtHoehe, oberlandHoehe);
                return (
                  <RadialGradient key={i} id={`nebelKlarung-${i}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={innen} stopOpacity={1} />
                    {/* Der Kern hält den Innenwert, bis die Figur ganz frei ist — erst
                        danach wird zur Umgebung ausgeblendet. */}
                    <Stop offset={`${Math.round((k.kern ?? 0) * 100)}%`} stopColor={innen} stopOpacity={1} />
                    <Stop offset="100%" stopColor={aussen} stopOpacity={1} />
                  </RadialGradient>
                );
              })}
              {/* Derselbe Verlauf wie im Oberland, nur um die Oberlandhöhe nach oben
                  versetzt, weil dieses SVG bei y=0 erst unterhalb davon beginnt. */}
              <LinearGradient
                id="karteNebelHoehe"
                x1={0}
                y1={-oberlandHoehe}
                x2={0}
                y2={hoehe}
                gradientUnits="userSpaceOnUse"
              >
                {nebelVerlauf.map((v, i) => (
                  <Stop key={i} offset={v.offset} stopColor={grauwert(v.wert)} stopOpacity={1} />
                ))}
              </LinearGradient>
              <Mask id="nebelMaske" maskUnits="userSpaceOnUse" x={0} y={0} width={breite} height={hoehe}>
                <Rect x={0} y={0} width={breite} height={hoehe} fill="url(#karteNebelHoehe)" />
                {nebelKlarungen.map((k, i) => (
                  <Circle key={i} cx={k.cx} cy={k.cy} r={k.r} fill={`url(#nebelKlarung-${i})`} />
                ))}
              </Mask>
            </Defs>
            <SvgBild
              href={nebelTextur}
              x={0}
              y={-oberlandHoehe}
              width={breite}
              height={nebelGesamtHoehe}
              preserveAspectRatio="none"
              mask="url(#nebelMaske)"
            />
          </Svg>
        </ImageBackground>
      )}
    </View>
  );
}

function Wegmarke({
  bild,
  tier,
  gefaehrte,
  schildkroete,
  gruesst = false,
  left,
  top,
  breite,
  hoehe,
  zustand,
  onPress,
  pausiert = false,
}: {
  /** Standbild — für Wegmarken ganz ohne Zustandsfamilie. */
  bild?: ReturnType<typeof require>;
  /** Quest-Tier mit Zuständen; schließt `bild` aus. */
  tier?: QuestId;
  /**
   * Gefährte mit Zuständen; schließt `bild` und `tier` aus. Seit 2026-09-14 blinzeln auch
   * die sechs Gefährten — vorher stand hier je ein Standbild (siehe
   * src/lib/gefaehrtenZustaende.tsx).
   */
  gefaehrte?: GefaehrteId;
  /**
   * Die Schildkröte mit Zuständen; schließt `bild`, `tier` und `gefaehrte` aus. Nachgezogen
   * 2026-09-15 (Christian-Befund beim Testen: "Schildkröte schließt nicht die Augen") — das
   * Zustands-Rig lag seit dem 2026-09-11 fertig im Archiv, war aber nie exportiert/verdrahtet.
   * Siehe src/lib/schildkroete.tsx.
   */
  schildkroete?: boolean;
  /** Nur für `tier`: Das Tier, das als nächstes dran ist, grüßt in ruhigen Abständen. */
  gruesst?: boolean;
  /** Glühwürmchen anhalten, solange die Karte nicht sichtbar ist. */
  pausiert?: boolean;
  left: number;
  top: number;
  breite: number;
  hoehe: number;
  zustand: WegmarkeStatus;
  onPress?: () => void;
}) {
  // Update 2026-09-14 (Nutzer: "aufgrund des Nebels, der grüßenden Geste etc wird der Ring
  // und die Scheibe nicht benötigt … einzige Alternative wäre ein sehr dezentes Leuchten,
  // vielleicht in der Art wie Glühwürmchen"): Der goldene Puls-Ring ist entfallen. Er war
  // ein exakter Kreis mit 3 px Kontur — die Formensprache eines Bedienelements, am unteren
  // Kartenrand zudem angeschnitten, sodass er als Bogen erschien.
  //
  // An seiner Stelle schweben Glühwürmchen um die nächste Wegmarke (siehe
  // Gluehwuermchen.tsx — bewusst nicht die vorhandene Lottie-Schleife, die im Browser
  // unsichtbar bliebe). Zusammen mit der Lichtung im Nebel und der grüßenden Geste des
  // Tieres ist die nächste Station dreifach markiert, ohne ein Wort Text.
  const leuchtfeld = hoehe * 1.15;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
      style={[styles.wegmarke, { left: left - breite / 2, top: top - hoehe, width: breite, height: hoehe }]}
    >
      {zustand === "naechstes" && (
        <Gluehwuermchen
          kante={leuchtfeld}
          pausiert={pausiert}
          style={{
            left: breite / 2 - leuchtfeld / 2,
            // Um den Körper, nicht um die Füße: Dort heben sich die Lichtpunkte gegen die
            // Silhouette und den Himmel ab, unten gingen sie im Weg und im Schatten unter.
            top: hoehe * 0.45 - leuchtfeld / 2,
          }}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          styles.schatten,
          { width: breite * 0.58, height: breite * 0.16, left: breite * 0.21, top: hoehe - breite * 0.1 },
        ]}
      />
      {tier ? (
        // Gesperrte Tiere blinzeln nicht und grüßen nicht: Sie stehen noch im Nebel, und
        // Bewegung würde sie als erreichbar lesen lassen.
        <View style={{ opacity: zustand === "gesperrt" ? GESPERRT_OPACITY : 1 }}>
          <QuestTierWegmarke
            quest={tier}
            breite={breite}
            blinzeln={zustand !== "gesperrt"}
            gruesst={gruesst}
          />
        </View>
      ) : gefaehrte ? (
        // Dieselbe Regel wie bei den Quest-Tieren: Wer noch im Nebel steht, blinzelt nicht.
        // Seit dem Update-1-Vorzug (2026-09-15) blinzeln die fünf echten Reviere (Zustand
        // "offen") wie jede andere erreichbare Station; der Wisent-Torwächter bleibt vorerst
        // gesperrt, sichtbar wird sein Blinzeln also weiterhin nur in der Testansicht
        // „gefaehrtenVorschau".
        <View style={{ opacity: zustand === "gesperrt" ? GESPERRT_OPACITY : 1 }}>
          <GefaehrteWegmarke
            id={gefaehrte}
            breite={breite}
            blinzeln={zustand !== "gesperrt"}
          />
        </View>
      ) : schildkroete ? (
        // Dieselbe Regel wie bei Tieren und Gefährten: gesperrt = kein Blinzeln, sie steht
        // noch im Nebel.
        <View style={{ opacity: zustand === "gesperrt" ? GESPERRT_OPACITY : 1 }}>
          <SchildkroeteWegmarke breite={breite} blinzeln={zustand !== "gesperrt"} />
        </View>
      ) : (
        <Image
          source={bild}
          style={{ width: breite, height: hoehe, opacity: zustand === "gesperrt" ? GESPERRT_OPACITY : 1 }}
          resizeMode="contain"
        />
      )}
      {zustand === "erledigt" && (
        <View style={[styles.abzeichen, { right: -breite * 0.08, top: -breite * 0.04 }]}>
          <Svg width={10} height={10} viewBox="0 0 24 24">
            <Path
              d="M4 12l5 5L20 6"
              stroke="#F7F1E4"
              strokeWidth={3.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      )}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  wrap: { width: "100%" },
  burgtor: { position: "absolute", borderWidth: 2.5, borderColor: GOLD, borderStyle: "dashed" },
  wegmarke: { position: "absolute", alignItems: "center", justifyContent: "flex-end" },
  schatten: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(10,10,5,0.32)",
  },
  abzeichen: {
    position: "absolute",
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: SAGE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFF7E6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
