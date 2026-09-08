// Neue Illustrations-Generation (siehe design_bibliotheken_und_lizenzen.md,
// "Illustrations-Strategie entschieden") — löst schrittweise die Cburnett-Kontur-Icons
// aus chessPieces.tsx ab. Das ist Schritt 4 der Grundgerüst-Integrationsplan-Liste
// (siehe priorisierter_umsetzungsplan.md, Abschnitt "Review-Runde: Integrationsplan
// fürs Grundgerüst"): die Spielerfigur (`pieceIcon` in Board.tsx) bekommt die neue
// helle Master-Variante. Die dunkle Variante (Schritt 5, Gegner-/"Besuchsfigur") liegt
// hier bereits mit bereit, da beide aus derselben Produktions-Export-Datei-Paarung
// stammen (siehe chesslynx_12_piece_produktionsexport_v1.zip).
//
// Jede Komponente rendert die produktions-exportierte Master-Grafik
// (assets/figuren/, PNG — dieselbe Wahl wie in Board.tsx für die Feld-Kacheln, siehe
// dortigen Kommentar zur noch offenen PNG/WebP-Detailfrage aus Schritt 2) über die
// React-Native-Core-`Image`-Komponente mit `resizeMode="contain"`, exakt wie im
// RigRendererProbe.tsx bei allen tatsächlich im Spiel vorkommenden Größen geprüft.
// `size`-Prop kompatibel zu den bestehenden *Icon-Komponenten aus chessPieces.tsx/
// creatures.tsx, damit sie 1:1 an derselben Stelle einsetzbar sind (kein Anpassungsbedarf
// an den Aufrufstellen außer dem Komponentennamen selbst).
//
// Update (2026-09-07, Nacht — Ausweitung auf Quest 2-6): Nachdem Quest 1 (Igel/Bauer) im
// echten Spielfluss bestätigt war ("Passt perfekt"), wurde derselbe mechanische Umbau auf
// die übrigen fünf Kreaturen ausgeweitet — deren Produktions-Exporte lagen bereits fertig
// unter Grafiken/Figuren/chesslynx_12_piece_produktionsexport_v1.zip (siehe Schritt 1),
// wurden jetzt ebenfalls nach assets/figuren/ kopiert. Alle sechs Kreaturen (Bär/Turm,
// Eule/Läufer, Pferd/Springer, Schwan/Dame, Hirsch/König, Igel/Bauer) sind jetzt sowohl
// als "klein" (Spielbrett-Icon, dieser Abschnitt) als auch als "groß" (siehe Update
// Schritt 6 unten) vorhanden und in Quest1.tsx-Quest6.tsx verdrahtet.
//
// Update (Schritt 6, 2026-09-07): Für die "Saga-Karte" (Weltkarte-Übersicht mit einem
// Begleiter-Badge pro Kreatur, siehe projektwissen_verlauf.md) und für den neu gedachten
// Verwandlungsmoment (Verwandlung.tsx: großes Waldtier-Bild schrumpft zur kleinen
// Spielfigur, statt zwei verschiedene Bilder überzublenden) wird dieselbe Master-Grafik
// zusätzlich in einer "groß"-Variante gebraucht. WICHTIG — Auflösungs-Recherche vorab
// (siehe priorisierter_umsetzungsplan.md, Schritt 6): die 12 Master stammen aus einer nur
// 1402×1122px großen 2×6-Generierungs-Vorlage (Desktop/ChessLynx/Grafiken/fd8ddfa3-...png,
// hell oben, dunkel unten) — pro Figur nur ca. 230×560px nativ. Die bereits verbauten
// "klein"-Exporte (183–248px breit) entsprechen also praktisch schon dem Auflösungslimit
// der Quelle; eine höher aufgelöste Originaldatei existiert nicht. Die "groß"-Dateien hier
// sind deshalb keine neue Generierung, sondern die bewährten "klein"-Exporte 1,5-fach mit
// Lanczos-Resampling + leichter Schärfung hochskaliert (siehe Rückfrage im Claude-Projekt:
// "Die Figuren auf der Saga-Karte sollen nicht riesig erscheinen, lediglich ca. 50% größer"
// — mit diesem moderaten Faktor bleibt das Ergebnis auch bei feinen Details wie Hirsch-
// Geweih oder Eulen-Federn sauber, siehe Sichtprüfung vor dem Einbau). Dateinamen-Muster:
// `chesslynx_<kreatur>_<seite>_export_gross.png`.

import { Image } from "react-native";

type MasterIconProps = { size?: number };

const hedgehogPawnLight = require("../../assets/figuren/chesslynx_hedgehog_pawn_light_export.png");
const hedgehogPawnDark = require("../../assets/figuren/chesslynx_hedgehog_pawn_dark_export.png");

/** Bauer (Igel), helle Master-Variante — Spielerfigur auf dem Brett, Quest 1. */
export function BauerMasterIcon({ size = 34 }: MasterIconProps) {
  return <Image source={hedgehogPawnLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

/**
 * Bauer (Igel), dunkle Master-Variante — Gegner-/"Besuchsfigur" derselben Quest-Kreatur
 * (Schritt 5, siehe Entscheidung in priorisierter_umsetzungsplan.md). Bewusst derselbe
 * Default-Wert 34 wie BauerMasterIcon (nicht die frühere 60%-Größe des grauen
 * Platzhalter-Punkts) — beide Seiten derselben Figur sollen gleich groß wirken.
 */
export function BauerMasterDunkelIcon({ size = 34 }: MasterIconProps) {
  return <Image source={hedgehogPawnDark} style={{ width: size, height: size }} resizeMode="contain" />;
}

// ---------------------------------------------------------------------------------------
// "Klein"-Varianten der übrigen fünf Figuren (Ausweitung von Schritt 4/5 auf Quest 2-6,
// siehe priorisierter_umsetzungsplan.md). Exakt dasselbe Muster wie BauerMasterIcon/
// BauerMasterDunkelIcon oben: Standardgröße 34 (pieceIcon auf dem Brett), Fallback-Größe
// per Prop für QuestGeschafft (92) und Verwandlung (nicht mehr genutzt, siehe unten).
// ---------------------------------------------------------------------------------------

const bearRookLight = require("../../assets/figuren/chesslynx_bear_rook_light_export.png");
const bearRookDark = require("../../assets/figuren/chesslynx_bear_rook_dark_export.png");
const owlBishopLight = require("../../assets/figuren/chesslynx_owl_bishop_light_export.png");
const owlBishopDark = require("../../assets/figuren/chesslynx_owl_bishop_dark_export.png");
const horseKnightLight = require("../../assets/figuren/chesslynx_horse_knight_light_export.png");
const horseKnightDark = require("../../assets/figuren/chesslynx_horse_knight_dark_export.png");
const swanQueenLight = require("../../assets/figuren/chesslynx_swan_queen_light_export.png");
const swanQueenDark = require("../../assets/figuren/chesslynx_swan_queen_dark_export.png");
const deerKingLight = require("../../assets/figuren/chesslynx_deer_king_light_export.png");
const deerKingDark = require("../../assets/figuren/chesslynx_deer_king_dark_export.png");

/** Turm (Bär), helle Master-Variante — Spielerfigur auf dem Brett, Quest 2. */
export function TurmMasterIcon({ size = 34 }: MasterIconProps) {
  return <Image source={bearRookLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Turm (Bär), dunkle Master-Variante — Gegner-/"Besuchsfigur", Quest 2. */
export function TurmMasterDunkelIcon({ size = 34 }: MasterIconProps) {
  return <Image source={bearRookDark} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Läufer (Eule), helle Master-Variante — Spielerfigur auf dem Brett, Quest 3. */
export function LaeuferMasterIcon({ size = 34 }: MasterIconProps) {
  return <Image source={owlBishopLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Läufer (Eule), dunkle Master-Variante — Gegner-/"Besuchsfigur", Quest 3. */
export function LaeuferMasterDunkelIcon({ size = 34 }: MasterIconProps) {
  return <Image source={owlBishopDark} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Springer (Pferd), helle Master-Variante — Spielerfigur auf dem Brett, Quest 4. */
export function SpringerMasterIcon({ size = 34 }: MasterIconProps) {
  return <Image source={horseKnightLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Springer (Pferd), dunkle Master-Variante — Gegner-/"Besuchsfigur", Quest 4. */
export function SpringerMasterDunkelIcon({ size = 34 }: MasterIconProps) {
  return <Image source={horseKnightDark} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Dame (Schwan), helle Master-Variante — Spielerfigur auf dem Brett, Quest 5. */
export function DameMasterIcon({ size = 34 }: MasterIconProps) {
  return <Image source={swanQueenLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Dame (Schwan), dunkle Master-Variante — Gegner-/"Besuchsfigur", Quest 5. */
export function DameMasterDunkelIcon({ size = 34 }: MasterIconProps) {
  return <Image source={swanQueenDark} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** König (Hirsch), helle Master-Variante — Spielerfigur auf dem Brett, Quest 6. */
export function KoenigMasterIcon({ size = 34 }: MasterIconProps) {
  return <Image source={deerKingLight} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** König (Hirsch), dunkle Master-Variante — Gegner-/"Besuchsfigur", Quest 6. */
export function KoenigMasterDunkelIcon({ size = 34 }: MasterIconProps) {
  return <Image source={deerKingDark} style={{ width: size, height: size }} resizeMode="contain" />;
}

// ---------------------------------------------------------------------------------------
// "Groß"-Varianten (Schritt 6): dieselben zwölf Master-Grafiken, 1,5-fach hochskaliert.
// Alle sechs Gross-Icons werden inzwischen tatsächlich verwendet (Quest1.tsx-Quest6.tsx
// Screen 1 + Verwandlung.tsx). Zusätzlich weiterhin vorbereitet für die noch zu bauende
// Saga-Karte (siehe projektwissen_verlauf.md), die dieselben Komponenten wiederverwenden
// kann.
// ---------------------------------------------------------------------------------------

const hedgehogPawnLightGross = require("../../assets/figuren/chesslynx_hedgehog_pawn_light_export_gross.png");
const hedgehogPawnDarkGross = require("../../assets/figuren/chesslynx_hedgehog_pawn_dark_export_gross.png");
const bearRookLightGross = require("../../assets/figuren/chesslynx_bear_rook_light_export_gross.png");
const bearRookDarkGross = require("../../assets/figuren/chesslynx_bear_rook_dark_export_gross.png");
const owlBishopLightGross = require("../../assets/figuren/chesslynx_owl_bishop_light_export_gross.png");
const owlBishopDarkGross = require("../../assets/figuren/chesslynx_owl_bishop_dark_export_gross.png");
const horseKnightLightGross = require("../../assets/figuren/chesslynx_horse_knight_light_export_gross.png");
const horseKnightDarkGross = require("../../assets/figuren/chesslynx_horse_knight_dark_export_gross.png");
const swanQueenLightGross = require("../../assets/figuren/chesslynx_swan_queen_light_export_gross.png");
const swanQueenDarkGross = require("../../assets/figuren/chesslynx_swan_queen_dark_export_gross.png");
const deerKingLightGross = require("../../assets/figuren/chesslynx_deer_king_light_export_gross.png");
const deerKingDarkGross = require("../../assets/figuren/chesslynx_deer_king_dark_export_gross.png");

// Gemeinsamer Default (140) statt 34 — die Groß-Variante wird für große Anzeigekontexte
// (Screen 1, Saga-Karte, Verwandlung) gebraucht, nicht fürs kleine Spielbrett-Feld.
const GROSS_DEFAULT_SIZE = 140;

/** Bauer (Igel), helle Master-Variante, groß — Screen 1 ("Das ist ein kleiner Igel") und Verwandlung.tsx. */
export function BauerMasterGrossIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={hedgehogPawnLightGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Bauer (Igel), dunkle Master-Variante, groß. Noch ohne Verwendungsstelle (vorbereitet). */
export function BauerMasterGrossDunkelIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={hedgehogPawnDarkGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Turm (Bär), helle Master-Variante, groß — Screen 1 ("Das ist ein Bär") und Verwandlung.tsx, Quest 2. */
export function TurmMasterGrossIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={bearRookLightGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Turm (Bär), dunkle Master-Variante, groß. Noch ohne Verwendungsstelle (vorbereitet). */
export function TurmMasterGrossDunkelIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={bearRookDarkGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Läufer (Eule), helle Master-Variante, groß — Screen 1 ("Das ist eine Eule") und Verwandlung.tsx, Quest 3. */
export function LaeuferMasterGrossIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={owlBishopLightGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Läufer (Eule), dunkle Master-Variante, groß. Noch ohne Verwendungsstelle (vorbereitet). */
export function LaeuferMasterGrossDunkelIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={owlBishopDarkGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Springer (Pferd), helle Master-Variante, groß — Screen 1 ("Das ist ein Pferd") und Verwandlung.tsx, Quest 4. */
export function SpringerMasterGrossIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={horseKnightLightGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Springer (Pferd), dunkle Master-Variante, groß. Noch ohne Verwendungsstelle (vorbereitet). */
export function SpringerMasterGrossDunkelIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={horseKnightDarkGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Dame (Schwan), helle Master-Variante, groß — Screen 1 ("Das ist ein Schwan") und Verwandlung.tsx, Quest 5. */
export function DameMasterGrossIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={swanQueenLightGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Dame (Schwan), dunkle Master-Variante, groß. Noch ohne Verwendungsstelle (vorbereitet). */
export function DameMasterGrossDunkelIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={swanQueenDarkGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** König (Hirsch), helle Master-Variante, groß — Screen 1 ("Das ist ein Hirsch") und Verwandlung.tsx, Quest 6. */
export function KoenigMasterGrossIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={deerKingLightGross} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** König (Hirsch), dunkle Master-Variante, groß. Noch ohne Verwendungsstelle (vorbereitet). */
export function KoenigMasterGrossDunkelIcon({ size = GROSS_DEFAULT_SIZE }: MasterIconProps) {
  return <Image source={deerKingDarkGross} style={{ width: size, height: size }} resizeMode="contain" />;
}
