// Die sechs Quest-Tiere als LEBENDIGE Waldtiere (2026-09-12).
//
// Hintergrund: Bis hierher zeigte die App überall dieselben geschnitzten Schachfiguren-
// Master (pieceMasters.tsx) — auf der Saga-Karte, im Vorstellungs-Screen und auf dem
// Brett. Der "Verwandlungsmoment" (Verwandlung.tsx) war dadurch nur ein Schrumpfen
// derselben Grafik: Aus dem Igel wurde nicht der Bauer, er WAR bereits der Bauer. Das
// widerspricht der Weltregel ("Sechs Tiere wohnen auf dem Brett — sie werden zum Spiel",
// siehe story_tiefe_weltregel_finale_2026-09-10.md).
//
// Deshalb gibt es jetzt pro Quest-Tier eine zweite Illustration: das lebendige Tier im
// Stil der Gefährten (Landesherren, Wisent, Schildkröte), erzeugt und freigegeben am
// 2026-09-11/12 (siehe claude/quest_tiere_lebendig_prompt_paket_2026-09-11.md und die
// jeweilige rights.md unter Grafiken/Figuren/<Tier>/).
//
// Regel in der ganzen App: VOR der eigenen Verwandlung wird das Tier gezeigt, AB der
// Verwandlung die Figur. Konkret:
//   - Saga-Karte (LuchsRevierKarte.tsx): Tier, solange die Quest nicht abgeschlossen ist;
//     danach die Figur — dadurch sieht das Kind seinen Fortschritt ohne ein Wort Text.
//   - Quest-Screen 1 + Verwandlung.tsx: Tier, danach die Figur.
//   - Spielbrett: immer die Figur (unverändert).
//
// Export-Konvention (bewusst anders als bei pieceMasters.tsx): Alle sechs PNGs liegen auf
// einer gemeinsamen quadratischen 768×768-Leinwand, fußbündig und mittig, mit fest
// eingebauten GRÖSSENVERHÄLTNISSEN zueinander (Igel am kleinsten, Hirsch am größten).
// Dadurch genügt eine einzige `size`-Angabe an der Aufrufstelle, und die Tiere haben
// trotzdem untereinander plausible Größen — bei den figurenbasierten Mastern war das nicht
// nötig, weil geschnitzte Schachfiguren ohnehin alle gleich hoch sind.
//
// Update 2026-09-13 — DIE TIERE BLINZELN. Seit dem 2026-09-11 entstehen Bewegungen nach
// der Zustands-Methode: Das Bild-Tool liefert vollständige Bilder, `scripts/rig_master.py`
// richtet sie deckungsgleich auf den Grundzustand aus und exportiert beide in die App
// (siehe claude/rig_master_system_2026-09-12.md). Für alle sechs Tiere ist der Zustand
// "Augen zu" inzwischen freigegeben und liegt unter assets/figuren/lebendig/zustaende/.
//
// Wichtig für das Verständnis der Dateien: `chesslynx_<tier>_blinzeln.webp` ist KEINE
// Augen-Ebene und kein Ausschnitt, sondern das vollständige Tier mit geschlossenen Augen,
// auf derselben 768er Leinwand, an derselben Stelle, in derselben Größe. Gemessen wurde
// das vor dem Export: Auf allen sichtbaren Pixeln unterscheiden sich Grund- und
// Blinzelbild ausschließlich in der Augenpartie (Igel y 374–677, Bär y 260–351, Eule
// y 339–438, Pferd y 210–299, Schwan y 162–273, Hirsch y 197–406), die Alphakanäle sind
// identisch. Deshalb genügt es, die beiden Bilder übereinanderzulegen und zu überblenden —
// ohne jede Positionierungsrechnung (siehe components/ZustandsTier.tsx).
//
// Das Grundbild bleibt bewusst `chesslynx_<tier>_lebendig.webp`: Der neue Export
// `zustaende/chesslynx_<tier>_grund.webp` ist damit auf allen sichtbaren Pixeln identisch
// (Abweichung 0,00 in RGB und Alpha, gemessen 2026-09-13) — es doppelt einzupacken würde
// das Bundle nur um rund 1 MB vergrößern.

import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

import { ZustandsTier } from "../components/ZustandsTier";

/** Quest-IDs wie in LuchsRevierKarte.tsx/RootNavigator.tsx. */
export type QuestTierId = "quest1" | "quest2" | "quest3" | "quest4" | "quest5" | "quest6";

// Derselbe Android-Fix wie in pieceMasters.tsx (siehe dortigen Kommentar).
const ANDROID_FIX_PROPS = { fadeDuration: 0 } as const;

const igel = require("../../assets/figuren/lebendig/chesslynx_igel_lebendig.webp");
const baer = require("../../assets/figuren/lebendig/chesslynx_baer_lebendig.webp");
const eule = require("../../assets/figuren/lebendig/chesslynx_eule_lebendig.webp");
const pferd = require("../../assets/figuren/lebendig/chesslynx_pferd_lebendig.webp");
const schwan = require("../../assets/figuren/lebendig/chesslynx_schwan_lebendig.webp");
const hirsch = require("../../assets/figuren/lebendig/chesslynx_hirsch_lebendig.webp");

const igelZu = require("../../assets/figuren/lebendig/zustaende/chesslynx_igel_blinzeln.webp");
const baerZu = require("../../assets/figuren/lebendig/zustaende/chesslynx_baer_blinzeln.webp");
const euleZu = require("../../assets/figuren/lebendig/zustaende/chesslynx_eule_blinzeln.webp");
const pferdZu = require("../../assets/figuren/lebendig/zustaende/chesslynx_pferd_blinzeln.webp");
const schwanZu = require("../../assets/figuren/lebendig/zustaende/chesslynx_schwan_blinzeln.webp");
const hirschZu = require("../../assets/figuren/lebendig/zustaende/chesslynx_hirsch_blinzeln.webp");

/** Lebendiges Tier je Quest. Alle Bilder: 768×768 RGBA, Tier fußbündig, Seitenverhältnis 1. */
export const QUEST_TIER_BILD: Record<QuestTierId, ImageSourcePropType> = {
  quest1: igel,
  quest2: baer,
  quest3: eule,
  quest4: pferd,
  quest5: schwan,
  quest6: hirsch,
};

/** Zustand "Augen zu", deckungsgleich zum jeweiligen Grundbild oben. */
export const QUEST_TIER_BLINZELN: Record<QuestTierId, ImageSourcePropType> = {
  quest1: igelZu,
  quest2: baerZu,
  quest3: euleZu,
  quest4: pferdZu,
  quest5: schwanZu,
  quest6: hirschZu,
};

/** Seitenverhältnis (Höhe/Breite) der Leinwand — bewusst 1, siehe Export-Konvention oben. */
export const QUEST_TIER_ASPEKT = 1;

/**
 * Das lebendige Quest-Tier. `size` ist Kantenlänge der quadratischen Leinwand, nicht die
 * Höhe des Tiers — die Tiere füllen die Leinwand absichtlich unterschiedlich hoch aus
 * (Igel ~0,55, Hirsch 1,0), damit die Größenverhältnisse untereinander stimmen.
 *
 * `blinzeln`: standardmäßig an. Ausschalten, wo das Bild ohnehin schon in Bewegung ist —
 * im Verwandlungsmoment etwa würde ein Lidschlag mitten im Lichtblitz nur stören.
 */
export function QuestTierIcon({
  quest,
  size = 150,
  blinzeln = true,
}: {
  quest: QuestTierId;
  size?: number;
  blinzeln?: boolean;
}) {
  if (!blinzeln) {
    return (
      <Image
        source={QUEST_TIER_BILD[quest]}
        style={{ width: size, height: size }}
        resizeMode="contain"
        {...ANDROID_FIX_PROPS}
      />
    );
  }

  return (
    <ZustandsTier
      grund={QUEST_TIER_BILD[quest]}
      blinzeln={QUEST_TIER_BLINZELN[quest]}
      breite={size}
      hoehe={size}
    />
  );
}
