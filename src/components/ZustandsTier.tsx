// Zustands-Renderer für die lebendigen Tiere und für Lux (2026-09-13/14).
//
// Hintergrund: Seit dem 2026-09-11 entstehen die Bewegungen der Figuren nach der
// Zustands-Methode — das Bild-Tool liefert vollständige Bilder, `scripts/rig_master.py`
// baut daraus deckungsgleiche Zustände und exportiert sie in die App (siehe
// claude/rig_master_system_2026-09-12.md). Bis hierher zeigte die App davon nur den
// Grundzustand als einzelnes Standbild; die fertigen Zustände lagen ungenutzt im
// Rig-Paket.
//
// Diese Datei ist die Gegenstelle dazu und hat drei Teile:
//   ZustandsTier  — legt Zustände deckungsgleich übereinander und blendet sie ein/aus.
//   ZustandsFigur — dasselbe für Bilder mit GESTEN-RAND (siehe unten).
//   useGeste      — macht aus einem Gesten-BILD eine Bewegung.
//
// Warum Überblenden und nicht Umschalten: Ein harter Wechsel zeigt beide Bilder je einen
// Frame lang gleichzeitig nicht an und wirkt als Ruckeln. 90 ms Überblendung genügen, um
// daraus ein Lidschlag-Gefühl zu machen, und sind kurz genug, dass das Auge die Kontur
// nicht vergleicht.
//
// Die Blinzel-Pausen sind bewusst zufällig (3–6 s): Bei festem Takt fällt zweierlei auf —
// dass es eine Schleife ist, und dass alle sechs Tiere auf der Saga-Karte gleichzeitig
// blinzeln.

import { useEffect, useRef, useState } from "react";
import { Animated, Image, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

/** Dauer einer Überblendung in beide Richtungen. */
const UEBERBLENDUNG_MS = 90;
/** Wie lange die Lider unten bleiben. */
const LIDSCHLAG_MS = 120;
const PAUSE_MIN_MS = 3000;
const PAUSE_MAX_MS = 6000;

type Props = {
  /** Grundzustand — liegt immer unten und ist nie transparent. */
  grund: ImageSourcePropType;
  /** Blinzel-Zustand, deckungsgleich zum Grundzustand. Fehlt er, wird nicht geblinzelt. */
  blinzeln?: ImageSourcePropType;
  /**
   * Weitere Zustände, die ein- und ausgeblendet werden, solange ihr `aktiv` gesetzt ist:
   * der offene Mund während einer Sprechzeile, die erhobene Pfote beim Winken. Jede Ebene
   * blendet für sich; das Blinzeln liegt darüber und läuft unabhängig weiter.
   *
   * Bewusst eine LISTE und nicht ein einzelner Zustand: Bei Lux können Maul und Pose
   * gleichzeitig gebraucht werden, und ein einzelner Steckplatz hätte bedeutet, mitten in
   * einer laufenden Überblendung die Bildquelle zu tauschen — das ist genau der harte
   * Schnitt, den die Überblendung vermeiden soll. Die Länge der Liste muss je Aufrufstelle
   * gleich bleiben (React-Hooks je Ebene).
   */
  ebenen?: { bild: ImageSourcePropType; aktiv: boolean }[];
  breite: number;
  hoehe: number;
  /** Blinzeln abschaltbar, etwa für Standbilder in der Ruhmeshalle. */
  idle?: boolean;
  accessibilityLabel?: string;
};

// Derselbe Android-Fix wie in pieceMasters.tsx/questTiere.tsx: ohne diese Prop blendet
// Android jedes Bild beim ersten Anzeigen 300 ms lang ein, was hier als Aufblitzen der
// oberen Ebene sichtbar wäre.
const ANDROID_FIX_PROPS = { fadeDuration: 0 } as const;

export function ZustandsTier({
  grund,
  blinzeln,
  ebenen,
  breite,
  hoehe,
  idle = true,
  accessibilityLabel,
}: Props) {
  const lid = useRef(new Animated.Value(0)).current;
  // Erst nach dem ersten Blinzeln überhaupt einhängen: Solange nie geblinzelt wurde, muss
  // das zweite Bild nicht geladen werden — auf der Saga-Karte spart das sechs Dekodier-
  // vorgänge beim Öffnen des Screens.
  const [lidGeladen, setLidGeladen] = useState(false);

  useEffect(() => {
    if (!idle || !blinzeln) return;
    let abgebrochen = false;
    let timer: ReturnType<typeof setTimeout>;

    const plane = () => {
      const pause = PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
      timer = setTimeout(() => {
        if (abgebrochen) return;
        setLidGeladen(true);
        Animated.sequence([
          Animated.timing(lid, {
            toValue: 1,
            duration: UEBERBLENDUNG_MS,
            useNativeDriver: true,
          }),
          Animated.delay(LIDSCHLAG_MS),
          Animated.timing(lid, {
            toValue: 0,
            duration: UEBERBLENDUNG_MS,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!abgebrochen) plane();
        });
      }, pause);
    };

    plane();
    return () => {
      abgebrochen = true;
      clearTimeout(timer);
      lid.stopAnimation();
    };
  }, [idle, blinzeln, lid]);

  const masse = { width: breite, height: hoehe } as const;

  return (
    <View style={masse} accessibilityLabel={accessibilityLabel}>
      <Image source={grund} style={masse} resizeMode="contain" {...ANDROID_FIX_PROPS} />
      {ebenen?.map((e, i) => (
        <Ueberblendung key={i} bild={e.bild} aktiv={e.aktiv} masse={masse} />
      ))}
      {blinzeln && lidGeladen ? (
        <Animated.Image
          source={blinzeln}
          style={[masse, { position: "absolute", left: 0, top: 0, opacity: lid }]}
          resizeMode="contain"
          {...ANDROID_FIX_PROPS}
        />
      ) : null}
    </View>
  );
}

/**
 * Eine einzelne überblendete Ebene. Eigene Komponente, damit jede Ebene ihren eigenen
 * Animationswert bekommt — und damit ihr Bild erst dann geladen wird, wenn sie zum ersten
 * Mal gebraucht wird: Auf der Saga-Karte grüßt immer nur EIN Tier, die anderen fünf
 * Gestenbilder bleiben ungeladen.
 */
function Ueberblendung({
  bild,
  aktiv,
  masse,
}: {
  bild: ImageSourcePropType;
  aktiv: boolean;
  masse: { width: number; height: number };
}) {
  const wert = useRef(new Animated.Value(0)).current;
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    if (aktiv) setGeladen(true);
    Animated.timing(wert, {
      toValue: aktiv ? 1 : 0,
      duration: UEBERBLENDUNG_MS,
      useNativeDriver: true,
    }).start();
  }, [aktiv, wert]);

  if (!geladen) return null;
  return (
    <Animated.Image
      source={bild}
      style={[masse, { position: "absolute", left: 0, top: 0, opacity: wert }]}
      resizeMode="contain"
      {...ANDROID_FIX_PROPS}
    />
  );
}

// ---------------------------------------------------------------------------------------
// Bilder mit Gesten-Rand
// ---------------------------------------------------------------------------------------
// Sobald es GESTEN gibt (Winken, Flügelheben, Kopfdrehen), reicht die Silhouette des
// Grundzustands nicht mehr: Die erhobene Pfote ragt darüber hinaus. `rig_master.py`
// exportiert eine Zustandsfamilie deshalb mit einem gemeinsamen, größeren Ausschnitt
// (Option `geometry_union`) — beim Schwan ist das Bild dadurch 71 % breiter als die
// stehende Figur; der Zugewinn ist reiner durchsichtiger Rand.
//
// Für das Layout wäre dieser Rand ein Rückschritt: Gäbe man das Bild einfach in einen
// Kasten, stünde die Figur kleiner und verschoben da, und jede Aufrufstelle müsste neu
// eingemessen werden. `ZustandsFigur` nimmt deshalb die Maße der FIGUR entgegen und
// rechnet den Rand heraus. Die vier Zahlen dazu misst `rig_master.py` beim Export und
// meldet sie als `figur_box` ins Manifest.
export type Leinwand = {
  /** Maße der Bilddatei. */
  breite: number;
  hoehe: number;
  /** Lage der Figur darin: x, y, Breite, Höhe — gemessen über den Alphakanal. */
  figur: [number, number, number, number];
};

type FigurProps = Omit<Props, "breite" | "hoehe"> & {
  leinwand: Leinwand;
  /** Gewünschte Breite der FIGUR (nicht der Bilddatei). */
  figurBreite: number;
  /**
   * Höhe des äußeren Kastens als Vielfaches der Figurenbreite. Vorgabe: das echte
   * Seitenverhältnis der Figur. Überschreiben, wo ein bestehendes Layout auf einen
   * bestimmten Wert eingemessen ist (Lux: LUX_HERO_ASPECT_RATIO).
   */
  aspekt?: number;
};

export function ZustandsFigur({ leinwand, figurBreite, aspekt, ...rest }: FigurProps) {
  const [fx, fy, fb, fh] = leinwand.figur;
  const skala = figurBreite / fb;
  const kastenHoehe = figurBreite * (aspekt ?? fh / fb);

  return (
    // Äußerer Kasten in den Maßen der Figur: Er bestimmt, wie viel Platz das Tier im
    // Layout einnimmt. Das größere Bild liegt absolut darin und ragt darüber hinaus —
    // aber nur mit seinem leeren Rand. Sollte Android den Überstand wider Erwarten
    // abschneiden, geht deshalb nichts Sichtbares verloren.
    <View style={{ width: figurBreite, height: kastenHoehe }}>
      <View style={{ position: "absolute", left: -fx * skala, top: -fy * skala }}>
        <ZustandsTier
          {...rest}
          breite={leinwand.breite * skala}
          hoehe={leinwand.hoehe * skala}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------
// Gesten-Takt
// ---------------------------------------------------------------------------------------
// Eine Geste ist EIN Bild, kein Bewegungsablauf. Aus einem Bild wird eine Bewegung, indem
// es ein- und wieder ausgeblendet wird — zweimal hintereinander liest sich als Winken oder
// Nicken, einmal und länger gehalten als Kopfdrehen oder Flügelheben. Mehr braucht es
// nicht, und mehr wäre auch nicht ehrlich: Zwischenposen gibt es nicht.
export type GestenTakt = {
  /** Wie oft die Geste hintereinander gezeigt wird. */
  wiederholungen: number;
  /** Wie lange sie jeweils steht. */
  halten: number;
};

export const GESTE_WINKEN: GestenTakt = { wiederholungen: 2, halten: 420 };
export const GESTE_EINMAL: GestenTakt = { wiederholungen: 1, halten: 900 };

/**
 * Liefert den `aktiv`-Wert für `aktiverZustand`. `ausloeser` startet die Geste: Bei jedem
 * Wechsel auf einen neuen Wert läuft sie einmal ab. `wiederholen` lässt sie danach in
 * ruhigen, leicht zufälligen Abständen erneut laufen — für die Saga-Karte gedacht, wo das
 * nächste Tier den Blick auf sich ziehen soll, ohne zu zappeln.
 */
export function useGeste(
  ausloeser: unknown,
  takt: GestenTakt = GESTE_EINMAL,
  wiederholen = false
): boolean {
  const [an, setAn] = useState(false);

  useEffect(() => {
    // Ohne Auslöser passiert nichts. Wichtig, weil sonst JEDE Aufrufstelle beim ersten
    // Rendern einmal gestikulieren würde — auf der Saga-Karte hätten alle sechs Tiere
    // gleichzeitig gewunken.
    if (ausloeser == null) {
      setAn(false);
      return;
    }
    let abgebrochen = false;
    const laufende: ReturnType<typeof setTimeout>[] = [];
    const warte = (ms: number) =>
      new Promise<void>((fertig) => laufende.push(setTimeout(fertig, ms)));

    const lauf = async () => {
      for (let i = 0; i < takt.wiederholungen && !abgebrochen; i++) {
        setAn(true);
        await warte(takt.halten);
        if (abgebrochen) return;
        setAn(false);
        // Zwischen zwei Ausschlägen nur die Überblendung abwarten — sonst wirkt das
        // Winken wie zwei getrennte Gesten statt wie eine Bewegung.
        await warte(UEBERBLENDUNG_MS * 2);
      }
      if (abgebrochen || !wiederholen) return;
      await warte(5000 + Math.random() * 4000);
      if (!abgebrochen) lauf();
    };

    lauf();
    return () => {
      abgebrochen = true;
      laufende.forEach(clearTimeout);
      setAn(false);
    };
  }, [ausloeser, wiederholen, takt.wiederholungen, takt.halten]);

  return an;
}
