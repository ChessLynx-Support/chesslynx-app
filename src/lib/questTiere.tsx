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

import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

/** Quest-IDs wie in LuchsRevierKarte.tsx/RootNavigator.tsx. */
export type QuestTierId = "quest1" | "quest2" | "quest3" | "quest4" | "quest5" | "quest6";

// Derselbe Android-Fix wie in pieceMasters.tsx (siehe dortigen Kommentar).
const ANDROID_FIX_PROPS = { fadeDuration: 0 } as const;

const igel = require("../../assets/figuren/lebendig/chesslynx_igel_lebendig.png");
const baer = require("../../assets/figuren/lebendig/chesslynx_baer_lebendig.png");
const eule = require("../../assets/figuren/lebendig/chesslynx_eule_lebendig.png");
const pferd = require("../../assets/figuren/lebendig/chesslynx_pferd_lebendig.png");
const schwan = require("../../assets/figuren/lebendig/chesslynx_schwan_lebendig.png");
const hirsch = require("../../assets/figuren/lebendig/chesslynx_hirsch_lebendig.png");

/** Lebendiges Tier je Quest. Alle Bilder: 768×768 RGBA, Tier fußbündig, Seitenverhältnis 1. */
export const QUEST_TIER_BILD: Record<QuestTierId, ImageSourcePropType> = {
  quest1: igel,
  quest2: baer,
  quest3: eule,
  quest4: pferd,
  quest5: schwan,
  quest6: hirsch,
};

/** Seitenverhältnis (Höhe/Breite) der Leinwand — bewusst 1, siehe Export-Konvention oben. */
export const QUEST_TIER_ASPEKT = 1;

/**
 * Das lebendige Quest-Tier. `size` ist Kantenlänge der quadratischen Leinwand, nicht die
 * Höhe des Tiers — die Tiere füllen die Leinwand absichtlich unterschiedlich hoch aus
 * (Igel ~0,55, Hirsch 1,0), damit die Größenverhältnisse untereinander stimmen.
 */
export function QuestTierIcon({ quest, size = 150 }: { quest: QuestTierId; size?: number }) {
  return (
    <Image
      source={QUEST_TIER_BILD[quest]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      {...ANDROID_FIX_PROPS}
    />
  );
}
