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
// Stil der Gefährten, erzeugt und freigegeben am 2026-09-11/12 (siehe
// claude/quest_tiere_lebendig_prompt_paket_2026-09-11.md und die jeweilige rights.md).
//
// Regel in der ganzen App: VOR der eigenen Verwandlung wird das Tier gezeigt, AB der
// Verwandlung die Figur.
//
// Export-Konvention (bewusst anders als bei pieceMasters.tsx): Alle sechs Bilder liegen auf
// einer gemeinsamen quadratischen 768×768-Leinwand, fußbündig und mittig, mit fest
// eingebauten GRÖSSENVERHÄLTNISSEN zueinander (Igel am kleinsten, Hirsch am größten).
// Dadurch genügt eine einzige `size`-Angabe an der Aufrufstelle, und die Tiere haben
// trotzdem untereinander plausible Größen.
//
// -------------------------------------------------------------------------------------
// Update 2026-09-13/14 — DIE TIERE BLINZELN UND GRÜSSEN
// -------------------------------------------------------------------------------------
// Seit dem 2026-09-11 entstehen Bewegungen nach der Zustands-Methode: Das Bild-Tool
// liefert vollständige Bilder, `scripts/rig_master.py` richtet sie deckungsgleich auf den
// Grundzustand aus und exportiert alle Zustände einer Figur mit DEMSELBEN Ausschnitt auf
// DIESELBE Leinwand (siehe claude/rig_master_system_2026-09-12.md). Freigegeben und hier
// eingebunden sind je Tier drei Zustände:
//
//   Grundzustand · Augen zu · eine Geste
//   Igel/Bär winken · Eule dreht den Kopf · Pferd senkt den Kopf ·
//   Schwan hebt die Flügel · Hirsch nickt
//
// Wichtig für das Verständnis der Dateien: `chesslynx_<tier>_blinzeln.webp` ist KEINE
// Augen-Ebene und kein Ausschnitt, sondern das vollständige Tier mit geschlossenen Augen,
// auf derselben Leinwand, an derselben Stelle, in derselben Größe. Gemessen am 2026-09-14
// über den Alphakanal unterscheiden sich Grund- und Blinzelbild ausschließlich in der
// Augenpartie (Igel y 427–504, Bär y 257–353, Eule y 338–439, Pferd y 208–301, Schwan
// y 157–274, Hirsch y 196–339). Deshalb genügt es, die Bilder übereinanderzulegen und zu
// überblenden — ohne jede Positionierungsrechnung (siehe components/ZustandsTier.tsx).
//
// Die Gestenbilder liegen auf derselben 768er Leinwand, brauchen darin aber mehr Platz
// (die erhobene Pfote, der gehobene Flügel). Der Platz war da: Alle sechs Gesten passen
// ohne Maßstabsänderung in die Leinwand, die Figur steht unverändert auf der Bodenlinie
// y=744. Deshalb bleibt `size` genau das, was es war — die Kantenlänge der Leinwand.
//
// Das Grundbild ist jetzt `zustaende/chesslynx_<tier>_grund.webp` statt der alten
// `chesslynx_<tier>_lebendig.webp`: Beide Bilder sind aus demselben Master gerechnet, aber
// mit unterschiedlichem Ausschnitt, und schon ein Unterschied von einem Pixel im Ausschnitt
// erzeugt beim Überblenden ein Flimmern entlang der Kontur. Alle Zustände einer Familie
// müssen aus demselben Export stammen. Die alte Datei ist damit verwaist (siehe
// scripts/waisen_pruefen.cjs).

import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

import {
  GESTE_EINMAL,
  GESTE_WINKEN,
  ZustandsFigur,
  ZustandsTier,
  useGeste,
} from "../components/ZustandsTier";
import type { GestenTakt, Leinwand } from "../components/ZustandsTier";

/** Quest-IDs wie in LuchsRevierKarte.tsx/RootNavigator.tsx. */
export type QuestTierId = "quest1" | "quest2" | "quest3" | "quest4" | "quest5" | "quest6";

// Derselbe Android-Fix wie in pieceMasters.tsx (siehe dortigen Kommentar).
const ANDROID_FIX_PROPS = { fadeDuration: 0 } as const;

type TierBilder = {
  grund: ImageSourcePropType;
  blinzeln: ImageSourcePropType;
  geste: ImageSourcePropType;
  /** Wie die Geste läuft — siehe ZustandsTier.tsx, Abschnitt "Gesten-Takt". */
  takt: GestenTakt;
  /** Für die Sprachausgabe/Screenreader, nicht sichtbar. */
  gesteName: string;
};

export const QUEST_TIER: Record<QuestTierId, TierBilder> = {
  quest1: {
    grund: require("../../assets/figuren/lebendig/zustaende/chesslynx_igel_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/zustaende/chesslynx_igel_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/zustaende/chesslynx_igel_winken.webp"),
    takt: GESTE_WINKEN,
    gesteName: "winkt",
  },
  quest2: {
    grund: require("../../assets/figuren/lebendig/zustaende/chesslynx_baer_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/zustaende/chesslynx_baer_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/zustaende/chesslynx_baer_winken.webp"),
    takt: GESTE_WINKEN,
    gesteName: "winkt",
  },
  quest3: {
    grund: require("../../assets/figuren/lebendig/zustaende/chesslynx_eule_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/zustaende/chesslynx_eule_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/zustaende/chesslynx_eule_kopfdreh.webp"),
    takt: GESTE_EINMAL,
    gesteName: "dreht den Kopf",
  },
  quest4: {
    grund: require("../../assets/figuren/lebendig/zustaende/chesslynx_pferd_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/zustaende/chesslynx_pferd_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/zustaende/chesslynx_pferd_kopfsenken.webp"),
    takt: GESTE_EINMAL,
    gesteName: "senkt den Kopf",
  },
  quest5: {
    grund: require("../../assets/figuren/lebendig/zustaende/chesslynx_schwan_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/zustaende/chesslynx_schwan_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/zustaende/chesslynx_schwan_fluegel.webp"),
    takt: GESTE_EINMAL,
    gesteName: "hebt die Flügel",
  },
  quest6: {
    grund: require("../../assets/figuren/lebendig/zustaende/chesslynx_hirsch_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/zustaende/chesslynx_hirsch_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/zustaende/chesslynx_hirsch_nicken.webp"),
    takt: GESTE_WINKEN,
    gesteName: "nickt",
  },
};

/** Nur der Grundzustand — für Aufrufstellen, die ein Standbild brauchen. */
export const QUEST_TIER_BILD: Record<QuestTierId, ImageSourcePropType> = {
  quest1: QUEST_TIER.quest1.grund,
  quest2: QUEST_TIER.quest2.grund,
  quest3: QUEST_TIER.quest3.grund,
  quest4: QUEST_TIER.quest4.grund,
  quest5: QUEST_TIER.quest5.grund,
  quest6: QUEST_TIER.quest6.grund,
};

/** Seitenverhältnis (Höhe/Breite) der Leinwand — bewusst 1, siehe Export-Konvention oben. */
export const QUEST_TIER_ASPEKT = 1;

type IconProps = {
  quest: QuestTierId;
  /** Kantenlänge der quadratischen Leinwand, nicht die Höhe des Tiers. */
  size?: number;
  /** Lidschlag im Leerlauf. */
  blinzeln?: boolean;
  /**
   * Löst die Geste aus. Bei jedem WECHSEL dieses Werts läuft sie einmal ab — ein Zähler,
   * ein Zustandsname oder schlicht `true` beim Betreten des Screens. `null` heißt: keine
   * Geste, das Gestenbild wird dann auch nicht geladen.
   */
  geste?: unknown;
  /** Geste in ruhigen Abständen wiederholen (Saga-Karte). */
  gesteWiederholen?: boolean;
};

/**
 * Das lebendige Quest-Tier. `size` ist Kantenlänge der quadratischen Leinwand, nicht die
 * Höhe des Tiers — die Tiere füllen die Leinwand absichtlich unterschiedlich hoch aus
 * (Igel ~0,52, Hirsch ~0,94), damit die Größenverhältnisse untereinander stimmen.
 *
 * `blinzeln`: standardmäßig an. Ausschalten, wo das Bild ohnehin schon in Bewegung ist —
 * im Verwandlungsmoment etwa würde ein Lidschlag mitten im Lichtblitz nur stören.
 */
export function QuestTierIcon({
  quest,
  size = 150,
  blinzeln = true,
  geste = null,
  gesteWiederholen = false,
}: IconProps) {
  const tier = QUEST_TIER[quest];
  const gestikuliert = useGeste(geste, tier.takt, gesteWiederholen && geste != null);

  if (!blinzeln && geste == null) {
    return (
      <Image
        source={tier.grund}
        style={{ width: size, height: size }}
        resizeMode="contain"
        {...ANDROID_FIX_PROPS}
      />
    );
  }

  return (
    <ZustandsTier
      grund={tier.grund}
      blinzeln={blinzeln ? tier.blinzeln : undefined}
      ebenen={geste == null ? undefined : [{ bild: tier.geste, aktiv: gestikuliert }]}
      breite={size}
      hoehe={size}
    />
  );
}

// ---------------------------------------------------------------------------------------
// Saga-Karte
// ---------------------------------------------------------------------------------------
// Für die Karte gibt es eine ZWEITE Exportfamilie derselben Zustände, auf kleiner Leinwand:
// Dort sind die Tiere nur 45–61 Punkte breit, ein 768er Bild je Zustand würde im Speicher
// rund 2,4 MB belegen — bei sechs Tieren mal drei Zuständen wäre das absurd. Die kleinen
// Bilder sind im selben Arbeitsgang und aus demselben Ausschnitt gerechnet, nur eben
// herunterskaliert (scripts/rig_configs/*.json, zweiter Block in `app_export`).
//
// Die Leinwand ist hier nicht quadratisch, sondern eng um die Zustandsfamilie geschnitten —
// inklusive des Platzes, den die Geste braucht. Beim Schwan ist sie dadurch fast doppelt so
// breit wie der stehende Vogel. `ZustandsFigur` rechnet diesen Rand wieder heraus, damit
// `breiteFrac` in LuchsRevierKarte.tsx weiterhin die Breite des TIERES meint.
type WegmarkenBilder = Omit<TierBilder, "gesteName"> & { leinwand: Leinwand };

export const QUEST_TIER_WEGMARKE: Record<QuestTierId, WegmarkenBilder> = {
  quest1: {
    grund: require("../../assets/figuren/lebendig/wegmarken/chesslynx_igel_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/wegmarken/chesslynx_igel_wegmarke_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/wegmarken/chesslynx_igel_wegmarke_winken.webp"),
    takt: GESTE_WINKEN,
    leinwand: { breite: 201, hoehe: 326, figur: [8, 7, 184, 319] },
  },
  quest2: {
    grund: require("../../assets/figuren/lebendig/wegmarken/chesslynx_baer_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/wegmarken/chesslynx_baer_wegmarke_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/wegmarken/chesslynx_baer_wegmarke_winken.webp"),
    takt: GESTE_WINKEN,
    leinwand: { breite: 201, hoehe: 324, figur: [22, 4, 157, 320] },
  },
  quest3: {
    grund: require("../../assets/figuren/lebendig/wegmarken/chesslynx_eule_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/wegmarken/chesslynx_eule_wegmarke_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/wegmarken/chesslynx_eule_wegmarke_kopfdreh.webp"),
    takt: GESTE_EINMAL,
    leinwand: { breite: 168, hoehe: 324, figur: [1, 3, 167, 321] },
  },
  quest4: {
    grund: require("../../assets/figuren/lebendig/wegmarken/chesslynx_pferd_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/wegmarken/chesslynx_pferd_wegmarke_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/wegmarken/chesslynx_pferd_wegmarke_kopfsenken.webp"),
    takt: GESTE_EINMAL,
    leinwand: { breite: 198, hoehe: 321, figur: [1, 1, 196, 320] },
  },
  quest5: {
    grund: require("../../assets/figuren/lebendig/wegmarken/chesslynx_schwan_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/wegmarken/chesslynx_schwan_wegmarke_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/wegmarken/chesslynx_schwan_wegmarke_fluegel.webp"),
    takt: GESTE_EINMAL,
    leinwand: { breite: 322, hoehe: 321, figur: [67, 1, 188, 320] },
  },
  quest6: {
    grund: require("../../assets/figuren/lebendig/wegmarken/chesslynx_hirsch_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/lebendig/wegmarken/chesslynx_hirsch_wegmarke_blinzeln.webp"),
    geste: require("../../assets/figuren/lebendig/wegmarken/chesslynx_hirsch_wegmarke_nicken.webp"),
    takt: GESTE_WINKEN,
    leinwand: { breite: 166, hoehe: 320, figur: [0, 0, 166, 320] },
  },
};

/** Seitenverhältnis (Höhe/Breite) der Figur auf der Karte. */
export function questTierWegmarkeAspekt(quest: QuestTierId): number {
  const [, , breite, hoehe] = QUEST_TIER_WEGMARKE[quest].leinwand.figur;
  return hoehe / breite;
}

/**
 * Das Tier als Wegmarke auf der Saga-Karte. `breite` ist die Breite des TIERES.
 *
 * `gruesst`: Das Tier, das als nächstes dran ist, winkt (bzw. nickt, dreht den Kopf, hebt
 * die Flügel) in ruhigen Abständen — dieselbe Aufgabe wie der goldene Puls-Ring, nur ohne
 * ein Wort Text. Alle anderen blinzeln nur.
 */
export function QuestTierWegmarke({
  quest,
  breite,
  gruesst = false,
  blinzeln = true,
}: {
  quest: QuestTierId;
  breite: number;
  gruesst?: boolean;
  blinzeln?: boolean;
}) {
  const w = QUEST_TIER_WEGMARKE[quest];
  const gestikuliert = useGeste(gruesst ? quest : null, w.takt, true);

  return (
    <ZustandsFigur
      leinwand={w.leinwand}
      figurBreite={breite}
      grund={w.grund}
      blinzeln={blinzeln ? w.blinzeln : undefined}
      ebenen={[{ bild: w.geste, aktiv: gestikuliert }]}
      idle={blinzeln}
    />
  );
}
