// Portierung von prototyp/client/src/quest1/Board.tsx nach React Native.
// Kernänderung gegenüber dem Web-Prototyp: `legalTargets` kommt nicht mehr aus einem
// hart kodierten Array im Screen-Objekt, sondern wird live aus chess.js abgeleitet
// (siehe src/lib/chessEngine.ts) — das war die zentrale, in technisches_konzept.md
// benannte Lücke des Web-Prototyps.
//
// Die Übungsfigur wird über `pieceIcon` als SVG-Illustration übergeben statt als
// schlichter Farbpunkt. WICHTIG (siehe projektwissen.md, "Verwandlungsmoment"): Board.tsx
// selbst ist neutral und weiß nichts von Tier vs. Figur — welches Icon hereingereicht
// wird, entscheidet die aufrufende Quest*.tsx. Auf dem Spielbrett wird dabei laut Design
// AUSSCHLIESSLICH die echte Schachfigur gezeigt (src/lib/chessPieces.tsx, Cburnett-Set),
// niemals das Waldtier (src/lib/creatures.tsx) — das Tier tritt nur bei der Vorstellung
// (Screen 1) auf und verwandelt sich sichtbar, dauerhaft und unumkehrbar in die Figur
// (src/lib/Verwandlung.tsx), bevor das Brett zum ersten Mal erscheint. Gegnerfigur
// (`opponentIcon`, Schritt 5) folgt demselben "Board.tsx ist neutral"-Prinzip wie
// `pieceIcon`.
//
// Update (UI-Marker-Runde, 2026-09-07, siehe priorisierter_umsetzungsplan.md, "Asset-
// Produktion Phase 1 der Checkliste ... UI-Marker"): Zielfeld-Ring und Stopp!-Ring waren
// bisher schlichte View-Rechtecke mit Rand (styles.legalRing/trapRing). Ersetzt durch
// `ZielfeldMarker`/`StoppMarker` (unten) — anders als pieceIcon/opponentIcon/blockerIcon
// bewusst NICHT über BoardConfig von außen hereingereicht, weil diese beiden Marker in
// jeder Quest identisch aussehen (kein kreaturspezifisches Icon nötig) und Board.tsx sie
// deshalb direkt selbst zeichnen kann, ohne die "Board.tsx bleibt neutral"-Regel zu
// verletzen (die gilt für Kreatur-/Figuren-Illustrationen, nicht für generisches UI-Chrome).
//
// Update (Schritt 3, 2026-09-07): Die Feldfarbe kommt jetzt aus dem neuen, orthogonalen
// Brett-Produktions-Export (siehe priorisierter_umsetzungsplan.md, Schritt 1) statt aus
// zwei flachen backgroundColor-Werten — aus dem freigestellten Brett-Master ausgeschnittene
// Feld-Kacheln (hell/dunkel, `assets/brett/tile_hell.png/.webp`, `tile_dunkel.png/.webp`),
// dieselbe lokale Schachbrettmuster-Logik (isDark) wie zuvor. Der äußere, cremefarbene
// Rahmen (styles.board) bleibt unverändert; der verzierte Bilderrahmen aus dem
// Brett-Asset wird hier bewusst NICHT verwendet (für ein volles 8×8-Brett gezeichnet,
// bei kleineren Fenstern optisch überproportioniert).
//
// Update (2026-09-07, Nutzer-Feedback nach dem Quest1–6-Testlauf): Zwei Änderungen.
// (1) `cellSize` ist nicht mehr fest 42px, sondern wird aus der tatsächlichen
// Bildschirmbreite berechnet (gedeckelt bei 42px) — Quest 2–6 zeigen ab jetzt das VOLLE
// 8×8-Brett (rows=8, cols=8, kein Fenster-Offset mehr, siehe Quest2.tsx-Quest6.tsx), und
// 8 Zellen à 42px plus Rahmen/Padding würden auf kleinen Geräten (z. B. iPhone SE, 375px
// Breite) über den Bildschirmrand hinauslaufen. Bei kleineren `cols`-Werten (Quest 1s
// 3×3-Fenster bleibt unverändert bewusst klein) bleibt die Zellgröße unverändert bei 42px,
// da die Bildschirmbreite dort nicht der begrenzende Faktor ist.
// (2) Neues, drittes optionales Icon-Feld `blockerIcon`/`blockerAt` (siehe BoardConfig
// unten) für "hier steht eine EIGENE Figur im Weg" (Stopp!-Aufgaben) — bewusst getrennt
// von `opponentIcon`, das ausschließlich echte Schlagfelder markiert. Grund: eine dunkle
// (gegnerische) Figur an einer reinen Blockade-Stelle suggerierte fälschlich "die könnte
// ich doch schlagen" — dabei ist diese Stelle in den kuratierten Stellungen
// (chessEngine.ts) ohnehin meist schon technisch eine EIGENE (weiße) Figur, nur bisher
// visuell falsch als dunkel dargestellt.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { View, Pressable, Image, StyleSheet, Animated, AccessibilityInfo, Dimensions } from "react-native";
import Svg, { Defs, Pattern, Rect, Image as SvgImage } from "react-native-svg";
import type { BoardSquare } from "../lib/chessEngine";
// Opus-Review, 2026-09-07, Abschnitt 3.1, Schritt 7 (siehe claude/review_logik_grafik_
// audiofuehrung.md): sofortiges haptisches + akustisches Feedback bei Zug/Stopp-Tap,
// unabhängig von der Sprachqualität der TTS-Anbindung (siehe luxStimme.ts).
import { haptikZug, haptikStopp } from "../lib/luxHaptik";
import { spieleZugKlang, spieleStoppKlang } from "../lib/luxKlang";
// Reine Vorführ-Logik ausgelagert, damit sie in verify/test-board-demo-logic.cjs testbar ist
// (siehe dortigen Kopfkommentar — eine RN-Komponente lässt sich nicht laden, ein reines
// TS-Modul schon).
import {
  blickfangSchluessel,
  demoIconQuelle,
  demoSchrittSchluessel,
  demoUrsprungFuer,
  istDemoQuelleFeld,
} from "./boardDemo";

const feldHell = require("../../assets/brett/tile_hell.webp");
const feldDunkel = require("../../assets/brett/tile_dunkel.webp");

// Sheet 6 (Board-Chrome-Marker) und Sheet 7 (Linien-Texturen) — produziert, QA-geprüft
// (Kantenweichzeichnung Zielfeld-Punkt/-Ring, Farbkorrektur Warnlinie) und committet
// 2026-09-11 (siehe claude/status_content_produktion.md, claude/produktionsliste_
// buttons_farbcodes_v1.md §8/§9). Ersetzen ab hier die bisherigen, live gezeichneten
// react-native-svg-Formen der Board-Chrome-Marker/Linien durch Bild-Assets.
const zielfeldPunktBild = require("../../assets/ui/board_chrome/icon_board_zielfeld_punkt.webp");
const zielfeldRingBild = require("../../assets/ui/board_chrome/icon_board_zielfeld_ring.webp");
const warnringBild = require("../../assets/ui/board_chrome/icon_board_warnring.webp");
const bedrohungGluehenBild = require("../../assets/ui/board_chrome/icon_board_bedrohung_gluehen.webp");
const eichelSammelBild = require("../../assets/ui/board_chrome/icon_board_eichel_sammelobjekt.webp");
const kettenTexturBild = require("../../assets/ui/linien_texturen/textur_kettenglied.webp");
const warnlinieTexturBild = require("../../assets/ui/linien_texturen/textur_warnlinie.webp");

// Zielfeld-Marker (löst styles.legalRing ab): weicher grüner Licht-/Ringschein, plus ein
// sehr sanftes, endloses Atem-Pulsieren (Skalierung 1,0↔1,08), das den Blick des Kindes
// aufs Zielfeld lenkt, ohne aufdringlich zu wirken (Design-Grundsatz "kein Zeitdruck/keine
// hektische Animation").
// `variante`-Prop (Opus-Review, 2026-09-07, Befund 2.5, siehe claude/review_logik_grafik_
// audiofuehrung.md): "punkt" (Standard) für leere Zielfelder. "ring" für Zielfelder, die
// ZUGLEICH ein Schlagfeld sind (hasOpponent/hasBlocker) — dort saß der Mittelpunkt-Punkt
// bisher unsichtbar HINTER der Figur; die Ring-Variante wird deshalb (siehe Aufrufstelle
// unten) NACH der Figur gerendert und bleibt so als Kontur sichtbar — etabliertes
// Schach-App-Muster: Punkt = leeres Zielfeld, Ring = Schlagfeld.
// Update (2026-09-11, Sheet 6 Board-Chrome-Marker, siehe claude/produktionsliste_buttons_
// farbcodes_v1.md §8): die Form wird nicht mehr live als SVG-Radialverlauf gezeichnet,
// sondern als produziertes, QA-geprüftes Bild-Asset gerendert (zielfeldPunktBild/
// zielfeldRingBild oben) — Animations-Wrapper/-Timing unverändert. Die beiden ursprünglich
// generierten Kandidaten für Punkt/Ring hatten harte statt der geforderten weichen Kanten
// und wurden vor dem Export per Alpha-Weichzeichner nachbearbeitet (Details dort).
function ZielfeldMarker({ size, variante = "punkt" }: { size: number; variante?: "punkt" | "ring" }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const scale = puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = puls.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Animated.View pointerEvents="none" style={[styles.markerWrap, { transform: [{ scale }], opacity }]}>
      <Image
        source={variante === "punkt" ? zielfeldPunktBild : zielfeldRingBild}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// Sammel-Marker (neu, 2026-09-08, siehe claude/quest_review_automatik_vollbrett_vorschlag.md,
// Abschnitt 3): Für die neue Übungsphase in QuestMoveScreen.tsx (BoardConfig.sammelAt) — ein
// kleines Eichel-Glyph auf dem jeweils vorgeschlagenen nächsten Zielfeld, damit die
// Wiederholungsrunden ("kannst du das noch ein paar Mal?") sich wie ein kleines Sammelspiel
// anfühlen statt wie trockene Wiederholung, passend zum Wald-/Freispiel-Thema der App. Bewusst
// als eigenes, von Board.tsx selbst gezeichnetes SVG (wie ZielfeldMarker/StoppMarker) statt
// einer neuen Illustrations-Asset-Runde — dieselbe Begründung wie dort: generisches UI-Chrome,
// sieht in jeder Quest identisch aus, braucht keine kreaturspezifische Grafik. WICHTIG (siehe
// Design-Grundsatz "immer alle Legalzüge anbieten", QuestMoveScreen.tsx-Kommentar): sammelAt
// markiert nur eine VORGESCHLAGENE Vorzugswahl, schränkt die tatsächlich antippbaren Felder
// nicht ein — jedes andere legale Feld bleibt genauso lösend.
function SammelMarker({ size }: { size: number }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const scale = puls.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] });

  // Update (2026-09-11, Sheet 6 Board-Chrome-Marker, siehe claude/produktionsliste_buttons_
  // farbcodes_v1.md §8): nicht mehr live als SVG-Eichel-Silhouette gezeichnet, sondern als
  // produziertes, QA-geprüftes Bild-Asset gerendert (eichelSammelBild oben) — Animations-
  // Wrapper/-Timing (puls, scale) unverändert.
  return (
    <Animated.View pointerEvents="none" style={[styles.markerWrap, { transform: [{ scale }], zIndex: 1 }]}>
      <Image source={eichelSammelBild} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
}

// Stopp!-Marker (löst styles.trapRing ab): Erscheint laut bestehender Logik (isTrapped
// unten) ohnehin nur kurz (900ms) als Reaktion NACH dem Antippen, nicht vorab als
// Warnung (bewusst, damit die Lernaufgabe nicht vorweggenommen wird) — deshalb hier mit
// einer kleinen Eintritts-Animation (Skalierung + Einblenden) statt einer statischen
// Form. Gestrichelter statt durchgezogener Ring: bewusste Wiederverwendung desselben
// "gestrichelte Linie = gerade nicht verfügbar"-Musters, das auch die Luchs-Revier-Karte
// für noch nicht erreichte Wegpunkte nutzt (siehe wettbewerbsanalyse_kinderapps_
// design.md) — konsistente visuelle Grammatik statt einer neuen Formsprache nur fürs
// Brett. Bewusst OHNE zusätzliches Zweig-/Ast-Glyph in der Mitte: Der Ring erscheint an
// derselben Stelle wie die opponentIcon/blockerIcon-Illustration und rendert davor im
// Stapel (siehe Aufrufreihenfolge unten) — ein Mittelpunkt-Glyph wäre vom Icon verdeckt.
function StoppMarker({ size }: { size: number }) {
  const eintritt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(eintritt, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [eintritt]);

  const scale = eintritt.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  // Update (2026-09-11, Sheet 6 Board-Chrome-Marker, siehe claude/produktionsliste_buttons_
  // farbcodes_v1.md §8): nicht mehr live als SVG-Doppelring gezeichnet, sondern als
  // produziertes, QA-geprüftes Bild-Asset gerendert (warnringBild oben) — Eintritts-Animation
  // (scale/opacity) unverändert.
  return (
    <Animated.View pointerEvents="none" style={[styles.markerWrap, { transform: [{ scale }], opacity: eintritt }]}>
      <Image source={warnringBild} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
}

// Neu (2026-09-19, animierte Motiv-Einführungen, siehe claude/ChessLynx_Motiv_Einfuehrungen_
// 2026-09-19.docx, Teil 2): ruhiger Marken-Gold-Ring als BLICKFANG — "schau dir mal diese
// Figur an", während Lux sie benennt. Bewusst klar unterschieden von den beiden bereits
// vorhandenen Markern: ZielfeldMarker (grün) heißt "hier darfst du hin", BedrohungsPuls
// (orange) heißt "hier ist Gefahr" — dieser hier heißt nur "schau hierhin" und fordert
// nichts. Deshalb Gold (dieselbe Marken-Farbe wie die Erstlehre-Kacheln in Revier.tsx) und
// ein deutlich langsamerer Puls als bei der Bedrohung.
//
// Im Gegensatz zu den übrigen Markern (siehe Sheet-6-Kommentare) noch im Code gezeichnet
// statt als produziertes Bild-Asset: Ein einfarbiger Ring braucht keine Illustration. Falls
// die Marker-Familie später vereinheitlicht wird, ist das hier der Kandidat zum Austausch.
function BlickfangRing({ size }: { size: number }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const opacity = puls.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const scale = puls.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.0] });
  const ringGroesse = size * 0.9;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: ringGroesse,
        height: ringGroesse,
        borderRadius: 999,
        borderWidth: Math.max(2, size * 0.055),
        borderColor: "#E8B44A",
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// Bugfix (Opus-Review, 2026-09-07, Befund 2.6, siehe claude/review_logik_grafik_
// audiofuehrung.md): warmes, endloses Pulsieren auf dem bedrohten Feld — ersetzt das
// geschriebene "Schach!"-Badge in Quest6.tsx (Verstoß gegen "Fachbegriffe werden
// gesprochen, nie geschrieben"). Bewusst ein eigener, wärmerer Farbton (dasselbe Orange
// wie StoppMarker) statt des grünen ZielfeldMarker-Tons, damit "hier ist Gefahr" optisch
// klar von "hier ist ein Zug möglich" unterscheidbar bleibt.
function BedrohungsPuls({ size }: { size: number }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [puls]);

  const opacity = puls.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });
  const scale = puls.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.04] });
  const kreisGroesse = size * 0.92;

  // Update (2026-09-11, Sheet 6 Board-Chrome-Marker, siehe claude/produktionsliste_buttons_
  // farbcodes_v1.md §8): nicht mehr live als SVG-Radialverlauf gezeichnet, sondern als
  // produziertes, QA-geprüftes Bild-Asset gerendert (bedrohungGluehenBild oben) —
  // Animations-Timing/-Wrapper (opacity/scale-Puls) unverändert.
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: kreisGroesse,
        height: kreisGroesse,
        opacity,
        transform: [{ scale }],
      }}
    >
      <Image source={bedrohungGluehenBild} style={{ width: kreisGroesse, height: kreisGroesse }} resizeMode="contain" />
    </Animated.View>
  );
}

// Bugfix (Opus-Review, Befund 2.6): Elbow-Punkt für die gestrichelte Bedrohungslinie
// (siehe Aufrufstelle unten). Bewusst KEINE gerade Linie vom Angreifer zum bedrohten Feld —
// bei einem Springer (aktuell der einzige Anwendungsfall, Quest 6) würde eine gerade Linie
// fälschlich "Blickkontakt in einer Linie" suggerieren, obwohl der Springer bekanntlich im
// Winkel zieht (siehe Quest4.tsx). Der Linienzug folgt deshalb exakt der L-Form: erst die
// längere Achse (volle Zeilen- oder Spaltendifferenz), dann die kürzere — dieselbe Form,
// die das Kind in Quest 4 bereits als "Springer-Sprung" kennengelernt hat.
function bedrohungsElbow(von: BoardSquare, bis: BoardSquare): BoardSquare {
  const deltaRow = bis.row - von.row;
  const deltaCol = bis.col - von.col;
  return Math.abs(deltaRow) >= Math.abs(deltaCol) ? { row: bis.row, col: von.col } : { row: von.row, col: bis.col };
}

export type BoardConfig = {
  rows: number;
  cols: number;
  pieceAt: BoardSquare;
  legalTargets: BoardSquare[];
  // Neu (Claude-Projekt "ChessLynx", 2026-09-09, Nutzerfeedback zur "Lux fragen"-
  // Hinweisfunktion: "die vorgeschlagenen Züge bei den Übungen entfernen, sonst sind die
  // Hinweise sinnlos"): `legalTargets` ist zugleich die einzige Quelle für die funktionale
  // Zug-Erkennung in `handleTap` weiter unten (`legalKeys`) UND — bisher untrennbar — für
  // die leuchtenden Zielfeld-Ringe/-Punkte. Ein Tipp-Feld ohne sichtbaren Ring macht die
  // eigens eingeführte, standardmäßig unsichtbare Hinweisfunktion aber wirkungslos, wenn
  // die Lösung ohnehin schon dauerhaft eingeblendet ist. `zeigeZielringe` trennt beides:
  // `legalTargets`/`legalKeys`/`handleTap` bleiben IMMER vollständig (sonst könnte nie ein
  // Zug erkannt werden), nur die beiden `<ZielfeldMarker>`-Renderstellen unten (und das
  // begleitende "Zulässiges Zielfeld"-Accessibility-Label, das sonst die Lösung verraten
  // würde) werden bei `false` unterdrückt. Default `true` (undefined-Fall) — bestehende
  // Aufrufstellen ohne dieses Feld verhalten sich exakt wie bisher.
  zeigeZielringe?: boolean;
  trapTarget?: BoardSquare; // Stopp!-Aufgabe: antippbar, aber löst Konsequenz-Animation aus statt echtem Zug
  opponentAt?: BoardSquare;
  // Detailreiche Tier-Illustration (siehe src/lib/creatures.tsx) statt des schlichten
  // Platzhalter-Punkts. Optional gehalten, damit ältere Aufrufstellen ohne Anpassung
  // weiterlaufen (Fallback: pieceDot).
  pieceIcon?: ReactNode;
  // Schritt 5 der Grundgerüst-Integrationsplan-Liste (priorisierter_umsetzungsplan.md):
  // die dunkle Master-Variante DERSELBEN Quest-Kreatur statt des anonymen grauen Punkts
  // (opponentDot) — rein optische Unterscheidung, siehe dortige Entscheidung dazu, dass
  // die Quest-Texte weiterhin nie "Schwarz"/"Weiß" benennen. NUR für echte Schlagfelder
  // (Screen 5) — für reine Blockade-Stellen (Screen 4) siehe `blockerIcon` unten.
  opponentIcon?: ReactNode;
  // Reine Blockade-Stelle (Screen 4, "Stopp!"-Aufgaben): zeigt die HELLE Master-Variante
  // DERSELBEN Quest-Kreatur — "hier steht eine deiner eigenen Figuren im Weg", nicht "hier
  // ist eine gegnerische Figur zu Besuch, die man schlagen könnte". Meist identisch zu
  // `trapTarget`. Optional gehalten wie opponentIcon (Fallback: blockerDot).
  //
  // Bugfix (Nutzer-Feedback 2026-09-08, "Blockerfigur wird bei Quest 1 Igel nicht
  // angezeigt" — reproduzierbar auch im Web, also ein echter Logikfehler, kein Android-
  // Rendering-Sonderfall): dieses Feld war bisher als EINZELNES BoardSquare typisiert,
  // aber QuestMoveScreen.tsx (siehe dort, `alsArray`/`blockerSquares`) reicht seit der
  // Quest4-Mehrfach-Blocker-Erweiterung IMMER ein Array durch, auch für Quests mit nur
  // einer Blockade-Figur (Quest 1/2/3/5) — `key(blockerAt)` unten erhielt dadurch ein
  // Array statt eines {row,col}-Objekts und lieferte für JEDE Zelle "undefined-undefined"
  // statt einer echten Koordinate, wodurch `hasBlocker` nie zutraf. Jetzt hier ebenfalls
  // Array ODER Einzelwert zugelassen (wie schon in QuestMoveScreenProps), siehe
  // `blockerKeys` unten für die passende Vergleichslogik.
  blockerAt?: BoardSquare | BoardSquare[];
  blockerIcon?: ReactNode;
  // Bugfix (Opus-Review, Befund 2.6): rein visuelles "Schach!"-Signal statt geschriebenem
  // Text (siehe BedrohungsPuls/bedrohungsElbow oben). `bedrohtAt` ist üblicherweise
  // identisch mit `pieceAt` (der eigene König steht im Schach); als eigenes Feld gehalten,
  // falls künftig auch andere bedrohte Figuren markiert werden sollen. Beide Felder nur
  // gesetzt, wenn tatsächlich eine Bedrohung angezeigt werden soll.
  // Neu (2026-09-19, animierte Motiv-Einführungen): ein oder mehrere Felder, auf denen
  // gerade der Blickfang-Ring liegen soll (siehe BlickfangRing oben). Wandert im Verlauf
  // einer Einführung von Figur zu Figur, während Lux sie der Reihe nach benennt. Rein
  // optisch — ändert weder Zugrecht noch Legalzüge.
  blickfangAt?: BoardSquare | BoardSquare[];
  bedrohtAt?: BoardSquare;
  angreiferAt?: BoardSquare;
  // Neu (2026-09-08, Übungsphase, siehe SammelMarker oben): vorgeschlagenes nächstes Zielfeld
  // während der Wiederholungsrunden — rein kosmetisch, siehe SammelMarker-Kommentar.
  sammelAt?: BoardSquare;
  // Neu (2026-09-08, Fesselung-Bonuskapitel, siehe chessEngine.ts/findeFesselung): gerade,
  // goldene "Kettenlinie" zwischen zwei Feldern — bewusst ein NEUES, von bedrohtAt/
  // angreiferAt (warmes Orange, "Schach"-Signal) klar unterschiedenes Signal, wie vom
  // Bonuskapitel-Skript gefordert ("ein neues, von zeigeSchach bewusst unterschiedenes
  // Signal"). Anders als die geknickte bedrohungsElbow-Linie (Springer-Bedrohung, die
  // absichtlich KEINE Linien-Bewegung suggerieren darf) ist eine echte Fesselung immer
  // geometrisch eine gerade Linie oder Diagonale (Turm-/Läufer-/Damen-Zugmuster) — deshalb
  // hier bewusst KEIN Elbow, sondern eine einzige gerade Verbindung mit kleinen goldenen
  // "Kettengliedern" darauf statt einer schlichten Strichlinie.
  kettenlinie?: { von: BoardSquare; bis: BoardSquare };
  // Generische Liste zusätzlicher statischer Figuren-Icons an beliebigen Feldern — gebraucht,
  // weil die Fesselungs-Szene gleichzeitig DREI benannte Figuren zeigen muss (König, Wächter,
  // Angreifer), mehr als das bestehende pieceAt/opponentAt/blockerAt-Trio direkt hergibt, ohne
  // deren etablierte, kreaturspezifische Bedeutung für die sechs Haupt-Quests zu verwässern.
  // Board.tsx bleibt dabei weiterhin neutral: welches Icon hereingereicht wird, entscheidet
  // ausschließlich die aufrufende Screen-Komponente (siehe Fesselung.tsx).
  zusatzfiguren?: { at: BoardSquare; icon: ReactNode }[];
  // Stopp!-Konsequenz der Fesselungs-Aufgabe: wird NUR während desselben 900ms-Fensters
  // gezeigt, in dem auch StoppMarker nach dem Antippen von trapTarget erscheint (siehe
  // Merge-Logik unten) — "würde der Wächter die Linie verlassen, wäre der König plötzlich in
  // Gefahr". Bewusst getrennt von bedrohtAt/angreiferAt gehalten, damit dieses Feldpaar
  // weiterhin ausschließlich eine ECHTE, dauerhafte Bedrohung (zeigeSchach) beschreibt, nicht
  // eine nur hypothetische Konsequenz.
  trapBedrohtAt?: BoardSquare;
  trapAngreiferAt?: BoardSquare;
};

function key(s: BoardSquare) {
  return `${s.row}-${s.col}`;
}

// Nutzer-Feedback 2026-09-08 ("nur ein minimaler Rahmen notwendig"): von 6px auf 3px
// reduziert (styles.board.borderWidth übernimmt denselben Wert, siehe unten) — als eigene
// Konstante gehalten, damit die cellSize-Berechnung oben und die Board-Gesamtgröße unten
// (width/height: cellSize * cols/rows + RAHMEN_BREITE * 2) nie auseinanderlaufen können.
const RAHMEN_BREITE = 3;


export function Board({
  config,
  onCorrectMove,
  onTrapTap,
  disabled,
  // Neu (2026-09-08, Auto-Demo-Vorführung, siehe claude/quest_review_automatik_vollbrett_
  // vorschlag.md, Abschnitt 3): wenn gesetzt, führt Board die Figur EINMALIG programmatisch
  // (ohne Fingertipp) zu diesem Feld und wieder zurück vor, bevor das Kind selbst dran ist.
  // Bewusst als eigenständige Top-Level-Props (nicht Teil von BoardConfig) gehalten, da sie
  // reines Vorführ-Verhalten steuern, keinen Spielzustand — QuestMoveScreen.tsx setzt/löscht
  // demoTarget je nach Phase, Board.tsx selbst kennt weder "Phasen" noch Sprechzeilen.
  demoTarget,
  onDemoDone,
  // Neu (2026-09-19, animierte Motiv-Einführungen): Bisher glitt die Vorführfigur zum
  // Zielfeld UND WIEDER ZURÜCK — die Stellung blieb unverändert. Für eine erzählte Zugfolge
  // ("er bedroht beide, der König muss weg, und jetzt ist die Dame weg") muss jeder Schritt
  // aber stehen bleiben. `demoBleibt` lässt die Rückgleit-Stufe weg.
  //
  // VERTRAG: Wer `demoBleibt` setzt, MUSS in `onDemoDone` die neue Stellung setzen (pieceAt/
  // opponentAt/zusatzfiguren entsprechend dem ausgeführten Zug). Board.tsx führt den Zug
  // NICHT selbst aus — es besitzt bewusst keinen eigenen Stellungszustand. Bleibt die
  // Stellung unverändert, springt die Figur im nächsten Rendern auf ihr Ausgangsfeld zurück.
  demoBleibt,
  // Welche Figur vorgeführt wird. Standard ist `pieceAt` (die eigene Figur) — für die
  // Gegnerantwort einer Einführung ("der König muss weg") wird hier das Feld der
  // GEGNERISCHEN Figur übergeben. Das bewegliche Overlay nimmt dann automatisch deren Icon
  // (siehe demoIcon unten).
  demoVon,
  // Neu (2026-09-11, Paket 2 / Quest-6-Erweiterung): wird bei jedem Tipp auf ein Feld
  // aufgerufen, das weder ein legales Zielfeld noch das Stopp!-Feld ist — zusätzlich zum
  // bisherigen sanften Puls. Gebraucht, damit eine aufrufende Komponente mit MEHREREN
  // eigenen Figuren (Quest 6, Schach-Brücke: König, Springer, Läufer) das Antippen einer
  // anderen eigenen Figur als "diese Figur auswählen" behandeln kann. Optional — alle
  // bestehenden Aufrufstellen verhalten sich unverändert.
  onFeldTap,
}: {
  config: BoardConfig;
  onCorrectMove: (target: BoardSquare) => void;
  onTrapTap?: () => void;
  disabled?: boolean;
  demoTarget?: BoardSquare;
  onDemoDone?: () => void;
  demoBleibt?: boolean;
  demoVon?: BoardSquare;
  onFeldTap?: (feld: BoardSquare) => void;
}) {
  const {
    rows,
    cols,
    pieceAt,
    legalTargets,
    zeigeZielringe = true,
    trapTarget,
    opponentAt,
    pieceIcon,
    opponentIcon,
    blockerAt,
    blockerIcon,
    blickfangAt,
    bedrohtAt,
    angreiferAt,
    sammelAt,
    kettenlinie,
    zusatzfiguren,
    trapBedrohtAt,
    trapAngreiferAt,
  } = config;
  const [trappedKey, setTrappedKey] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  // Bugfix (Opus-Review, 2026-09-07, Befund 2.4, siehe claude/review_logik_grafik_
  // audiofuehrung.md): bisher sprang das Brett bei einem korrekten Zug sofort zum
  // nächsten Screen — die Figur bewegte sich nie sichtbar. `pieceAnim` hält die aktuelle
  // Verschiebung (in Pixeln) der Spielfigur vom Ursprungsfeld aus; `animatingTo` merkt sich
  // während der ~260ms-Animation das Zielfeld, damit die Figur an ihrer alten Position kurz
  // ausgeblendet wird (siehe hasPiece-Rendering unten) und stattdessen als frei bewegliches
  // Overlay über dem ganzen Brett gezeichnet wird (sonst würde sie beim Durchqueren
  // benachbarter Felder von deren Kachel-Bild verdeckt).
  const pieceAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [animatingTo, setAnimatingTo] = useState<{ row: number; col: number } | null>(null);

  const legalKeys = new Set(legalTargets.map(key));
  const trapKey = trapTarget ? key(trapTarget) : null;
  const pieceKey = key(pieceAt);
  const opponentKey = opponentAt ? key(opponentAt) : null;
  // Bugfix (siehe BoardConfig.blockerAt-Kommentar oben): akzeptiert jetzt sowohl ein
  // einzelnes BoardSquare als auch ein Array (Quest 4 hat schon immer mehrere Blocker,
  // QuestMoveScreen.tsx reicht inzwischen für ALLE Quests ein Array durch) — als Set aus
  // Keys statt eines einzelnen Vergleichswerts, analog zu legalKeys oben.
  const blockerKeys = new Set(
    (blockerAt ? (Array.isArray(blockerAt) ? blockerAt : [blockerAt]) : []).map(key)
  );
  const sammelKey = sammelAt ? key(sammelAt) : null;
  // Fesselung-Bonuskapitel: solange das Stopp!-Feld gerade angetippt ist (derselbe
  // trappedKey/trapKey-Vergleich wie bei StoppMarker), zeigt die Bedrohung stattdessen die
  // Konsequenz "der König wäre jetzt in Gefahr" (trapBedrohtAt/trapAngreiferAt) statt einer
  // echten, dauerhaften Bedrohung — ansonsten (der Normalfall für alle sechs Haupt-Quests,
  // die trapBedrohtAt/trapAngreiferAt nie setzen) bleibt es bei bedrohtAt/angreiferAt.
  const zeigeTrapBedrohung =
    trappedKey !== null && trapKey !== null && trappedKey === trapKey && Boolean(trapBedrohtAt && trapAngreiferAt);
  const effektivBedrohtAt = zeigeTrapBedrohung ? trapBedrohtAt : bedrohtAt;
  const effektivAngreiferAt = zeigeTrapBedrohung ? trapAngreiferAt : angreiferAt;
  const bedrohtKey = effektivBedrohtAt ? key(effektivBedrohtAt) : null;
  const zusatzfigurenKeys = new Map((zusatzfiguren ?? []).map((z) => [key(z.at), z.icon]));

  // Neu (2026-09-19, animierte Motiv-Einführungen): Welche Figur wird gerade vorgeführt?
  // Standard ist die eigene (`pieceAt`) — genau wie bisher, alle bestehenden Aufrufstellen
  // verhalten sich dadurch unverändert.
  const demoUrsprung = demoUrsprungFuer(demoVon, pieceAt);
  const demoUrsprungKey = key(demoUrsprung);

  // Das Icon der vorgeführten Figur. Bisher zeichnete das bewegliche Overlay immer
  // `pieceIcon`, weil sich immer nur die eigene Figur bewegte. Sobald auch die Gegnerantwort
  // animiert wird, muss es das Icon der Figur sein, die tatsächlich auf dem Ausgangsfeld
  // steht — sonst gleitet plötzlich die eigene Figur dorthin, wo der gegnerische König
  // hinziehen sollte.
  const demoIcon = (() => {
    switch (demoIconQuelle(demoUrsprung, pieceAt, opponentAt, (zusatzfiguren ?? []).map((z) => z.at))) {
      case "eigen":
        return pieceIcon;
      case "gegner":
        return opponentIcon;
      case "zusatz":
        return zusatzfigurenKeys.get(demoUrsprungKey);
      default:
        return undefined;
    }
  })();

  // Während der Vorführung wird die Figur auf dem Ausgangsfeld ausgeblendet (sie wird ja als
  // frei bewegliches Overlay gezeichnet). Bisher galt das nur für `pieceAt`; jetzt für
  // dasjenige Feld, von dem aus animiert wird — bei Standardwerten identisch zu vorher.
  const istDemoQuelle = (k: string) => istDemoQuelleFeld(k, demoUrsprung, animatingTo !== null);

  // Felder mit Blickfang-Ring (siehe BlickfangRing oben). Wie bei blockerAt sind Einzelwert
  // und Array zugelassen.
  const blickfangKeys = blickfangSchluessel(blickfangAt);

  // `demoTargetKeyRef` verhindert ein erneutes Auslösen der Vorführ-Animation (siehe unten,
  // NACH der cellSize-Berechnung platziert, da sie cellSize für die Zug-Distanz braucht) bei
  // jedem Re-Render mit demselben Zielfeld — der übergebene `demoTarget`-Objektwert ist bei
  // jedem Render von QuestMoveScreen.tsx neu erzeugt, ein reiner `useEffect`-Abhängigkeits-
  // Vergleich per Objektidentität würde die Animation sonst wiederholt neu starten.
  const demoTargetKeyRef = useRef<string | null>(null);

  function handleTap(r: number, c: number) {
    if (disabled || animatingTo) return;
    const k = `${r}-${c}`;
    if (legalKeys.has(k)) {
      haptikZug();
      spieleZugKlang();
      const dx = (c - pieceAt.col) * cellSize;
      const dy = (r - pieceAt.row) * cellSize;
      setAnimatingTo({ row: r, col: c });
      Animated.timing(pieceAnim, { toValue: { x: dx, y: dy }, duration: 260, useNativeDriver: true }).start(() => {
        onCorrectMove({ row: r, col: c });
        pieceAnim.setValue({ x: 0, y: 0 });
        setAnimatingTo(null);
      });
      return;
    }
    if (k === trapKey) {
      haptikStopp();
      spieleStoppKlang();
      setTrappedKey(k);
      onTrapTap?.();
      AccessibilityInfo.announceForAccessibility?.("Da steht etwas im Weg.");
      setTimeout(() => setTrappedKey(null), 900);
      return;
    }
    // Paket 2 (2026-09-11): siehe onFeldTap-Kommentar in der Props-Liste oben.
    onFeldTap?.({ row: r, col: c });
    // sanftes Feedback bei jedem anderen Tipp (kein Bestrafungs-Ton, siehe Design-Grundsatz)
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 90, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  // Zellgröße: gemessen an der tatsächlich zugewiesenen Breite DIESER Stelle im Layout
  // (onLayout unten), nicht mehr an der globalen Fensterbreite (Dimensions.get("window")).
  //
  // Nutzer-Feedback 2026-09-08 ("Schachbrett soll stets fast die gesamte Bildschirmbreite
  // einnehmen, responsiv auf jeder Bildschirmgröße"): Dimensions.get("window") lieferte auf
  // nativen Geräten zwar korrekt die Gerätebreite, auf der Web-Vorschau aber die oft viel
  // breitere BROWSERFENSTER-Breite — unabhängig von einem eventuell schmaleren Handy-Rahmen
  // um die App herum (siehe RootNavigator.tsx, webHintergrund/appRoot). Der bisherige feste
  // 42px-Deckel verhinderte zwar ein Überlaufen, ließ das Brett dadurch aber auf breiten
  // Web-Fenstern winzig wirken UND nutzte auf echten Handys nicht die volle verfügbare
  // Breite aus. `onLayout` misst stattdessen die tatsächlich zugewiesene Breite an dieser
  // Stelle (bereits nach Abzug des 16px-Paddings von styles.safe) — funktioniert auf allen
  // Plattformen identisch, reagiert automatisch auf Fenster-/Orientierungswechsel (erneuter
  // onLayout-Aufruf) und macht das Brett dadurch wirklich responsiv statt nur "nicht zu
  // groß". `Dimensions.get("window")` bleibt als Rückfallwert für den allerersten Render,
  // bevor onLayout zum ersten Mal feuert.
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const bildschirmBreite = containerWidth ?? Dimensions.get("window").width;
  // Nutzer-Feedback 2026-09-08 ("Das Feld kann sogar noch größer sein, 98% passen. Nur ein
  // minimaler Rahmen notwendig"): der bisherige feste 8px-Puffer plus 48px-Zellendeckel ließ
  // auf einem Standard-Handy noch spürbar Luft an den Rändern. Jetzt ein direktes 98%-Ziel
  // statt eines Pixel-Puffers (skaliert dadurch automatisch mit jeder Bildschirmgröße mit,
  // wie schon zuvor gefordert), plus RAHMEN_BREITE unten von 6px auf 3px reduziert ("nur ein
  // minimaler Rahmen") — beides zusammen zieht das Brett spürbar näher an die Bildschirmkanten,
  // ohne dass es überläuft (styles.board bleibt weiterhin `overflow: hidden`).
  const maxBrettBreite = Math.floor(bildschirmBreite * 0.98);
  // Deckel von 48px auf 64px angehoben — auf einem Standard-Handy (~360-430px Breite) bleibt
  // ohnehin die Bildschirmbreite selbst der begrenzende Faktor (siehe Formel unten), der
  // höhere Deckel verhindert nur noch, dass das Brett auf breiten Tablet-/Web-Fenstern
  // unnötig riesige Einzelzellen bekommt.
  const cellSize = Math.max(24, Math.min(64, Math.floor((maxBrettBreite - RAHMEN_BREITE * 2) / cols)));

  // Neu (2026-09-08, Auto-Demo-Vorführung, siehe claude/quest_review_automatik_vollbrett_
  // vorschlag.md, Abschnitt 3): läuft, sobald sich `demoTarget` ändert — wiederverwendet
  // bewusst denselben `pieceAnim`/`animatingTo`-Mechanismus wie ein echter Zug (siehe
  // handleTap oben), nur mit einer zweiten Animationsstufe zurück zur Ausgangsposition statt
  // eines echten `onCorrectMove`-Aufrufs. Dadurch funktionieren alle bestehenden Rendering-
  // Regeln automatisch mit: die Figur wird während `animatingTo` als frei bewegliches Overlay
  // gezeichnet (siehe hasPiece-Bedingungen unten) und taucht danach wieder normal in ihrer
  // (unveränderten) Ausgangszelle auf. `handleTap` prüft bereits `if (disabled ||
  // animatingTo) return;` ganz oben — echte Taps sind während der Vorführung also automatisch
  // gesperrt, ohne einen eigenen Sperr-Zustand zu brauchen. Muss NACH `cellSize` stehen (siehe
  // demoTargetKeyRef-Kommentar oben), da die Zug-Distanz in Pixeln daraus berechnet wird.
  useEffect(() => {
    if (!demoTarget) return;
    // Der Schlüssel enthält jetzt auch das Ausgangsfeld: In einer Zugfolge kann dasselbe
    // Zielfeld zweimal hintereinander vorkommen (etwa wenn der König erst weicht und die
    // eigene Figur danach genau dorthin schlägt). Ohne das Ausgangsfeld im Schlüssel würde
    // der zweite Schritt als "schon gelaufen" gelten und stillschweigend ausfallen.
    const zielKey = demoSchrittSchluessel(demoUrsprung, demoTarget);
    if (demoTargetKeyRef.current === zielKey) return;
    demoTargetKeyRef.current = zielKey;

    const dx = (demoTarget.col - demoUrsprung.col) * cellSize;
    const dy = (demoTarget.row - demoUrsprung.row) * cellSize;
    setAnimatingTo({ row: demoTarget.row, col: demoTarget.col });

    const stufen: Animated.CompositeAnimation[] = [
      Animated.timing(pieceAnim, { toValue: { x: dx, y: dy }, duration: 480, useNativeDriver: true }),
      Animated.delay(320),
    ];
    // Nur ohne `demoBleibt` gleitet die Figur zurück (siehe Prop-Kommentar oben).
    if (!demoBleibt) {
      stufen.push(
        Animated.timing(pieceAnim, { toValue: { x: 0, y: 0 }, duration: 380, useNativeDriver: true })
      );
    }

    Animated.sequence(stufen).start(() => {
      // In beiden Fällen zurücksetzen: Das Overlay wird gleich ohnehin ausgeblendet
      // (animatingTo = null), und der nächste Schritt der Folge braucht einen sauberen
      // Nullpunkt. Bei `demoBleibt` übernimmt die neue Stellung des Aufrufers die Darstellung.
      pieceAnim.setValue({ x: 0, y: 0 });
      setAnimatingTo(null);
      onDemoDone?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTarget, demoVon, demoBleibt, cellSize]);

  return (
    <View
      style={styles.messRahmen}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
    <View
      style={[
        styles.board,
        { width: cellSize * cols + RAHMEN_BREITE * 2, height: cellSize * rows + RAHMEN_BREITE * 2 },
      ]}
      accessibilityRole="none"
    >
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const k = `${r}-${c}`;
          const isDark = (r + c) % 2 === 1;
          const isLegal = legalKeys.has(k);
          const isTrap = k === trapKey;
          const isTrapped = isTrap && trappedKey === k;
          const hasPiece = k === pieceKey;
          const hasOpponent = k === opponentKey;
          const hasBlocker = blockerKeys.has(k);
          const istBedroht = k === bedrohtKey;
          const istSammelfeld = k === sammelKey;
          const zusatzfigurIcon = zusatzfigurenKeys.get(k);

          return (
            <Pressable
              key={k}
              onPress={() => handleTap(r, c)}
              disabled={disabled}
              accessibilityLabel={
                hasPiece
                  ? "Dein Spielstein"
                  : isLegal && zeigeZielringe
                    ? "Zulässiges Zielfeld"
                    : hasOpponent
                      ? "Besuchende Figur"
                      : hasBlocker
                        ? "Eigene Figur, blockiert den Weg"
                        : "Feld"
              }
              style={[styles.cell, { width: cellSize, height: cellSize }]}
            >
              {/* Bugfix (Nutzer-Feedback 2026-09-08, Android: `collapsable={false}` allein
                  hat NICHT geholfen — "View Flattening" war also nicht die Ursache, siehe
                  aktualisierte Kommentare unten). Neue Vermutung: Android kann ein normal
                  im Fluss stehendes Geschwister-Element (die Figur), das NACH einem
                  absolut positionierten `Image` (`StyleSheet.absoluteFill`, hier die
                  Feld-Kachel) im JSX steht, beim Zeichnen trotzdem darunter statt darüber
                  einsortieren, wenn keine explizite Stapelreihenfolge (`zIndex`) gesetzt ist
                  — Android verlässt sich dabei nicht zuverlässig auf die reine JSX-
                  Reihenfolge. Deshalb hier und bei allen Figur-/Marker-Ebenen weiter unten
                  jetzt explizit `zIndex` gesetzt: Kachel ganz unten (0), alles andere darüber. */}
              {/* RN 0.86 kennt `pointerEvents` nur noch als Eigenschaft von View, nicht mehr
                  von Image. Statt die Eigenschaft ersatzlos zu streichen (was das Verhalten
                  stillschweigend ändern könnte) trägt sie jetzt eine umhüllende View — die
                  behält zugleich das `zIndex: 0`, auf das der Android-Rendering-Fix oben baut. */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
                <Image
                  source={isDark ? feldDunkel : feldHell}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              </View>
              {/* Bugfix (Opus-Review 2.6): warmer Puls VOR allen anderen Markern/Figuren
                  gerendert (unterste Ebene direkt über der Kachel), damit König-Icon und
                  ggf. ein ZielfeldMarker weiterhin klar erkennbar darüber liegen. */}
              {istBedroht && (
                <View pointerEvents="none" style={styles.markerWrap}>
                  <BedrohungsPuls size={cellSize} />
                </View>
              )}
              {/* Neu (2026-09-19): Blickfang-Ring auf derselben Ebene wie der Bedrohungspuls,
                  also unter Figuren und Zielfeldmarkern — er soll die Figur einrahmen, nicht
                  verdecken. */}
              {blickfangKeys.has(k) && (
                <View pointerEvents="none" style={styles.markerWrap}>
                  <BlickfangRing size={cellSize} />
                </View>
              )}
              {isLegal && zeigeZielringe && !(hasOpponent || hasBlocker) && <ZielfeldMarker size={cellSize} />}
              {/* Neu (2026-09-08, Übungsphase): Sammel-Eichel NACH dem ZielfeldMarker
                  gerendert, damit sie über dem grünen Punkt sichtbar bleibt — rein kosmetisch,
                  siehe SammelMarker-Kommentar oben, dieses Feld bleibt trotzdem ein ganz
                  normales legales Zielfeld unter vielen. */}
              {istSammelfeld && isLegal && <SammelMarker size={cellSize} />}
              {isTrapped && <StoppMarker size={cellSize} />}
              {/* Bugfix (Nutzer-Feedback 2026-09-08, Android, root-caused nach Analyse mit
                  Opus): der eigentliche Fehler war weder View-Flattening noch Stapel-
                  reihenfolge, sondern dass die Figuren-Icons die EINZIGEN Zell-Kinder waren,
                  die im normalen Layout-Fluss standen (`position: relative`, Standard) statt
                  absolut positioniert. Ausnahmslos alles, was auf Android sichtbar
                  gerendert wurde (Feld-Kachel, alle Marker, das bewegliche Zug-Overlay),
                  ist absolut positioniert. opponentIcon/blockerIcon jetzt ebenfalls über
                  styles.markerWrap absolut + zentriert gerendert, exakt wie die bereits
                  funktionierenden Marker. */}
              {hasOpponent && !istDemoQuelle(k) && (
                <View pointerEvents="none" collapsable={false} style={[styles.markerWrap, { zIndex: 2 }]}>
                  {opponentIcon ?? <View style={styles.opponentDot} />}
                </View>
              )}
              {hasBlocker && (
                <View pointerEvents="none" collapsable={false} style={[styles.markerWrap, { zIndex: 2 }]}>
                  {blockerIcon ?? <View style={styles.blockerDot} />}
                </View>
              )}
              {/* Fesselung-Bonuskapitel: zusätzliche statische Figur (z. B. der angreifende
                  gegnerische Turm), siehe BoardConfig.zusatzfiguren-Kommentar oben. Dieselbe
                  absolute Positionierung/zIndex wie opponentIcon/blockerIcon (Android-
                  Rendering-Regel, siehe Datei-Kommentar). */}
              {zusatzfigurIcon && !istDemoQuelle(k) && (
                <View pointerEvents="none" collapsable={false} style={[styles.markerWrap, { zIndex: 2 }]}>
                  {zusatzfigurIcon}
                </View>
              )}
              {/* Bugfix (Opus-Review 2.5): Ring-Variante NACH der Figur gerendert (statt
                  davor wie der Punkt), damit sie als Kontur sichtbar bleibt statt hinter
                  der Figur zu verschwinden. */}
              {isLegal && zeigeZielringe && (hasOpponent || hasBlocker) && (
                <ZielfeldMarker size={cellSize} variante="ring" />
              )}
              {/* Bugfix (Opus-Review, 2026-09-07, Befund 2.3, behebt zugleich 1.6, siehe
                  claude/review_logik_grafik_audiofuehrung.md): weicher Marken-Gold-Sockel
                  hinter der eigenen Figur, damit sie auf einen Blick von einer optisch
                  identischen Blocker-Figur (z. B. Quest 5: zwei gleiche Damen) unterscheidbar
                  ist — ohne die Master-Illustrationen selbst anzufassen. */}
              {hasPiece && !istDemoQuelle(k) && (
                <View pointerEvents="none" style={styles.markerWrap}>
                  <View
                    style={[
                      styles.pieceSockel,
                      { width: cellSize * 0.74, height: cellSize * 0.74, borderRadius: 999 },
                    ]}
                  />
                </View>
              )}
              {/* ROOT CAUSE gefunden (Nutzer-Feedback 2026-09-08, Android, Analyse mit Opus):
                  weder `collapsable={false}` noch `zIndex` noch das Entfernen von
                  `overflow:"hidden"` hatten einen Effekt — selbst ein simpler, undurchsich-
                  tiger 30×30-Testkasten ohne Image/Animated blieb unsichtbar. Der gemeinsame
                  Nenner: dieser Zweig war der EINZIGE Zell-Inhalt im normalen Layout-Fluss
                  (position: relative, RN-Standard) statt absolut positioniert — alles, was
                  tatsächlich sichtbar gerendert wurde (Feld-Kachel, alle Marker via
                  styles.markerWrap, das bewegliche Zug-Overlay unten), ist absolut
                  positioniert. Fix: dieselbe styles.markerWrap-Positionierung (absolut,
                  zentriert) wie bei den bereits funktionierenden Markern verwenden, statt
                  einer im Fluss stehenden Animated.View ohne eigene Größe. */}
              {hasPiece && !istDemoQuelle(k) && (
                <Animated.View
                  pointerEvents="none"
                  collapsable={false}
                  style={[styles.markerWrap, { transform: [{ scale: pulse }], zIndex: 3 }]}
                >
                  {pieceIcon ?? <View style={styles.pieceDot} />}
                </Animated.View>
              )}
            </Pressable>
          );
        })
      )}
      {/* Bugfix (Opus-Review 2.6): gestrichelte Bedrohungslinie vom Angreifer zum bedrohten
          Feld, als L-förmiger Linienzug über zwei Segmente (siehe bedrohungsElbow oben)
          statt einer geraden Linie. */}
      {effektivBedrohtAt && effektivAngreiferAt && (
        <Svg
          pointerEvents="none"
          width={cellSize * cols}
          height={cellSize * rows}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {(() => {
            const mitte = (s: BoardSquare) => ({ x: s.col * cellSize + cellSize / 2, y: s.row * cellSize + cellSize / 2 });
            const elbow = bedrohungsElbow(effektivAngreiferAt, effektivBedrohtAt);
            const p1 = mitte(effektivAngreiferAt);
            const pe = mitte(elbow);
            const p2 = mitte(effektivBedrohtAt);
            // Update (2026-09-11, Sheet 7 Linien-Texturen, siehe claude/produktionsliste_
            // buttons_farbcodes_v1.md §9): die gestrichelte Linie wird nicht mehr live
            // gezeichnet, sondern mit der produzierten, QA-geprüften Warnlinien-Textur
            // (warnlinieTexturBild oben) gefüllt — als SVG-<Pattern> auf einem lokal
            // unrotierten <Rect> je Elbow-Segment, das per translate+rotate-Transform-String
            // auf die jeweilige Strecke gedreht wird (die Pattern-Füllung dreht sich dabei mit
            // dem Element mit — Standard-SVG-Verhalten, dasselbe Prinzip wie bei der
            // Kettenlinien-Textur weiter unten). Native Texturmaße 2172×101px
            // (Seitenverhältnis 21,5) bestimmen die Kachel-Breite, damit die Textur unverzerrt
            // wiederholt wird.
            const dicke = Math.max(5, cellSize * 0.11);
            const kachelBreite = dicke * (2172 / 101);
            const segment = (a: { x: number; y: number }, b: { x: number; y: number }, k: string) => {
              const laenge = Math.hypot(b.x - a.x, b.y - a.y);
              if (laenge < 1) return null;
              const winkel = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              return (
                <Rect
                  key={k}
                  x={0}
                  y={-dicke / 2}
                  width={laenge}
                  height={dicke}
                  fill="url(#warnlinieMuster)"
                  transform={`translate(${a.x} ${a.y}) rotate(${winkel})`}
                />
              );
            };
            return (
              <>
                <Defs>
                  <Pattern id="warnlinieMuster" patternUnits="userSpaceOnUse" width={kachelBreite} height={dicke}>
                    <SvgImage href={warnlinieTexturBild} x={0} y={0} width={kachelBreite} height={dicke} preserveAspectRatio="none" />
                  </Pattern>
                </Defs>
                {segment(p1, pe, "bedrohung-seg1")}
                {segment(pe, p2, "bedrohung-seg2")}
              </>
            );
          })()}
        </Svg>
      )}
      {/* Fesselung-Bonuskapitel: gerade "Kettenlinie" zwischen König und Angreifer (siehe
          BoardConfig.kettenlinie-Kommentar oben) — bewusst KEIN Elbow (eine echte Fesselung
          ist immer geometrisch gerade) und bewusst Marken-Gold statt des warmen Bedrohungs-
          Orange, damit beide Signale nie miteinander verwechselt werden können. */}
      {kettenlinie && (
        <Svg
          pointerEvents="none"
          width={cellSize * cols}
          height={cellSize * rows}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {(() => {
            const mitte = (s: BoardSquare) => ({ x: s.col * cellSize + cellSize / 2, y: s.row * cellSize + cellSize / 2 });
            const p1 = mitte(kettenlinie.von);
            const p2 = mitte(kettenlinie.bis);
            const laenge = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const winkelGrad = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
            // Update (2026-09-11, Sheet 7 Linien-Texturen, siehe claude/produktionsliste_
            // buttons_farbcodes_v1.md §9): die Kettenlinie wird nicht mehr live aus Ellipse-
            // "Kettengliedern" gezeichnet, sondern mit der produzierten, QA-geprüften
            // Ketten-Textur (kettenTexturBild oben) gefüllt — als SVG-<Pattern> auf einem
            // einzigen <Rect> (die Kettenlinie ist immer geometrisch gerade, kein Elbow
            // nötig), per translate+rotate-Transform-String auf die Verbindungsstrecke
            // gedreht. Native Texturmaße 2172×200px (Seitenverhältnis 10,86) bestimmen die
            // Kachel-Breite, damit die Textur unverzerrt wiederholt wird.
            const dicke = Math.max(8, cellSize * 0.16);
            const kachelBreite = dicke * (2172 / 200);
            if (laenge < 1) return null;
            return (
              <>
                <Defs>
                  <Pattern id="kettenlinieMuster" patternUnits="userSpaceOnUse" width={kachelBreite} height={dicke}>
                    <SvgImage href={kettenTexturBild} x={0} y={0} width={kachelBreite} height={dicke} preserveAspectRatio="none" />
                  </Pattern>
                </Defs>
                <Rect
                  x={0}
                  y={-dicke / 2}
                  width={laenge}
                  height={dicke}
                  fill="url(#kettenlinieMuster)"
                  transform={`translate(${p1.x} ${p1.y}) rotate(${winkelGrad})`}
                />
              </>
            );
          })()}
        </Svg>
      )}
      {/* Bugfix (Opus-Review 2.4): frei bewegliches Overlay für den animierten Zug — liegt
          als letztes Kind über allen Feldern, damit die Figur beim Durchqueren
          benachbarter Felder nicht von deren Kachel-Bild verdeckt wird (siehe Kommentar bei
          pieceAnim/animatingTo oben). */}
      {animatingTo && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: demoUrsprung.col * cellSize,
            top: demoUrsprung.row * cellSize,
            width: cellSize,
            height: cellSize,
            alignItems: "center",
            justifyContent: "center",
            transform: pieceAnim.getTranslateTransform(),
          }}
        >
          {demoIcon ?? <View style={styles.pieceDot} />}
        </Animated.View>
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Misst die tatsächlich verfügbare Breite an dieser Stelle im Layout (siehe onLayout
  // oben) — `width: "100%"` sorgt dafür, dass onLayout die volle Breite des umgebenden
  // Screens/SafeAreaView meldet, statt sich nur auf die Inhaltsgröße des Bretts zu
  // beschränken (sonst würde sich die Messung selbst im Kreis drehen).
  // Nutzer-Feedback 2026-09-08 ("98% der BILDSCHIRMBREITE", nicht bloß 98% des
  // umgebenden Containers): Grund für die zunächst kaum sichtbare Wirkung der
  // maxBrettBreite-Anpassung oben — alle sechs Quest*.tsx (styles.safe) setzen
  // `padding: 16` auf die komplette SafeAreaView, wodurch der von onLayout gemessene
  // Container ohnehin schon fest um 32px (16px je Seite) schmaler war als der Bildschirm
  // — ein PROZENT-Anteil DAVON blieb dadurch nah an der alten festen Pixel-Reduktion, kaum
  // wahrnehmbar unterschiedlich. Statt das Padding in allen sechs Quest-Dateien anzufassen
  // (das würde auch den Lux-Icon-Abstand und die Sprechblase betreffen, nicht nur das
  // Brett), kompensiert marginHorizontal hier gezielt NUR für den Brett-Messrahmen dieses
  // eine, bekannte 16px-Padding wieder heraus — der Container, den onLayout misst, entspricht
  // dadurch wieder der tatsächlichen (Safe-Area-)Bildschirmbreite, exakt wie gewünscht.
  messRahmen: { width: "100%", alignItems: "center", marginHorizontal: -16 },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 14,
    // RAHMEN_BREITE (oben, aktuell 3px) statt eines eigenen Literals — Nutzer-Feedback
    // 2026-09-08 ("nur ein minimaler Rahmen notwendig") reduzierte dies von zuvor 6px;
    // borderRadius von 20 auf 14 mitverkleinert, damit die Ecken-Rundung bei dünnerem Rahmen
    // proportional passend bleibt statt vergleichsweise klobig zu wirken.
    borderWidth: RAHMEN_BREITE,
    // Bugfix (Opus-Review, 2026-09-07, Befund 2.7, siehe claude/review_logik_grafik_
    // audiofuehrung.md): borderColor war bislang identisch mit backgroundColor — der
    // Rahmen war dadurch faktisch unsichtbar. Jetzt eine abgesetzte, aber verwandte
    // Rahmenfarbe plus ein dezenter Schatten, damit sich das Brett vom Hintergrund löst.
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
  cell: {
    // Bugfix (Opus-Review, Befund 2.9): der 0,5px-Zellrahmen konkurrierte optisch mit der
    // Kachel-Textur (tile_hell.png/tile_dunkel.png) — testweise entfernt. borderColor
    // bleibt stehen, falls sich das auf dem Gerät als Rückschritt erweist und die Linie
    // wieder gebraucht wird (dann borderWidth zurück auf 0.5).
    borderWidth: 0,
    borderColor: "#C9C2B0",
    alignItems: "center",
    justifyContent: "center",
    // Test (2026-09-08) rückgängig gemacht: ohne overflow:hidden verschob sich das ganze
    // Brett spürbar (neue Regression, ohne das eigentliche Problem zu lösen) — overflow war
    // also nicht die (alleinige) Ursache. Zurück auf den bekannten, funktionierenden Stand.
    overflow: "hidden",
  },
  // Gemeinsamer Positionierungs-Rahmen für ZielfeldMarker/StoppMarker (siehe oben) —
  // löst styles.legalRing/trapRing ab, die jetzt als SVG statt reinem View-Rand
  // gezeichnet werden.
  markerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    // Bugfix (Nutzer-Feedback 2026-09-08, Android-Stapelreihenfolge, siehe Kommentar bei
    // der Feld-Kachel oben): explizit über der Kachel (zIndex 0) einsortiert.
    zIndex: 1,
  },
  // Bugfix (Opus-Review, Befund 2.3/1.6): weicher Marken-Gold-Sockel hinter der eigenen
  // Figur (siehe Aufrufstelle oben) — Marken-Gold (#D7A52D, dieselbe Farbe wie Funkeln.tsx)
  // bei niedriger Deckkraft, damit er die Figur nicht überstrahlt.
  pieceSockel: {
    backgroundColor: "#D7A52D",
    opacity: 0.16,
  },
  // Fallback-Punkt, nur falls ein Aufrufer keine pieceIcon übergibt (aktuell nutzen alle
  // sechs Quests eine Tier-Illustration aus src/lib/creatures.tsx). Feste Pixelmaße statt
  // Prozent, da der umgebende Animated.View jetzt kein Eigenmaß mehr vorgibt (die
  // Illustrationen bringen ihre eigene Größe über die `size`-Prop mit).
  pieceDot: {
    width: 29,
    height: 29,
    borderRadius: 999,
    backgroundColor: "#C9855F",
  },
  // Fallback-Punkt, nur falls ein Aufrufer kein opponentIcon übergibt (aktuell übergeben
  // alle Quests außer Quest 1 noch keins, siehe Schritt 5 in priorisierter_
  // umsetzungsplan.md — dort ist bisher nur die dunkle Igel-Variante verdrahtet).
  opponentDot: {
    width: "60%",
    height: "60%",
    borderRadius: 999,
    backgroundColor: "#A6AEB8",
  },
  // Fallback-Punkt, nur falls ein Aufrufer kein blockerIcon übergibt. Bewusst ein anderer
  // Farbton als pieceDot (#C9855F) und opponentDot (#A6AEB8), damit auch der Platzhalter
  // schon "eigene Figur" von "Besuchsfigur" unterscheidbar wäre.
  blockerDot: {
    width: "60%",
    height: "60%",
    borderRadius: 999,
    backgroundColor: "#D8C7A1",
  },
});
