// Ruhmeshalle-Grundgerüst (2026-09-15, Christian: "Wisent Kür, danach Ruhmeshalle
// Grundgerüst" — Wisent-Kür-Runde siehe claude/wisent_kuer_verdrahtung_2026-09-15.md,
// jetzt committed/getestet/gepusht).
//
// Konzept (siehe claude/projektwissen.md, Abschnitt "Waldgefährten"): "Waldgefährten ...
// graduieren nach voller 3-Sterne-Meisterung in die Ruhmeshalle (visuelle Galerie)". Dieser
// Screen ist genau das — eine gemeinsame Galerie aller fünf Gefährten plus dem Wisent an
// seinem eigenen, abgesetzten Sonderplatz.
//
// Bewusste Auslassungen dieses ersten Schritts (exakt dieselbe Begründungsstruktur wie
// screens/Revier.tsx, siehe dortiger Kopfkommentar):
//   - Kulisse: `WaldHintergrund` ohne `variante`, dieselbe Platzhalter-Kulisse wie Revier.tsx/
//     Bonuskapitel/Schlossvorplatz. Die eigentlichen Ruhmeshalle-Assets (E7 Rahmen-
//     illustration, E8 Leer-Schattenrisse, E8b Wisent-Nebelschleier — siehe
//     checkliste_produktionsphasen.md, Phase 9) sind noch nicht beauftragt.
//   - Statt E8 (gemalte Leer-Schattenrisse) zeigt ein noch nicht gradierter Gefährte hier
//     einen schlichten gestrichelten Rahmen ohne Figur — ehrlich als Platzhalter erkennbar,
//     statt eine echte Schattenriss-Illustration zu simulieren.
//   - Statt E8b (gemalter Nebelschleier) bekommt der Wisent-Sonderplatz einen einfachen
//     halbtransparenten Grauschleier über demselben leeren Rahmen, solange
//     `bonusFortschritt.wisentKampf` noch nicht erreicht ist.
//   - Keine gesprochene Begrüßung: für "Ruhmeshalle betreten" gibt es noch keine freigegebene
//     Lux-Zeile (Audit-Punkt C.7, `claude/archiv/projekt_audit_2026-09-10.md`: "der
//     Ruhmeshalle-Screen ... hat keinen einzigen Sprechtext"). Neue Kind-Dialoge erfinde ich
//     hier nicht auf eigene Faust — siehe Revier.tsx-Kommentar für dieselbe Begründung.
//
// Graduierungs-Signal: `istRevierAbgeschlossen()` aus lib/endlosmodusFortschritt.ts — rein
// LOKAL (AsyncStorage), nicht das Firestore-synchronisierte `waldgefaehrtenFortschritt.
// ruhmeshalle`-Feld aus firebase.ts (das existiert im Datenmodell bereits, aber es gibt noch
// KEINE Schreibfunktion dafür in storage.ts, siehe dortiger TODO-Kommentar am Dateiende von
// endlosmodusFortschritt.ts). Für das Grundgerüst reicht das lokale Signal — genau dieselbe
// bewusste Scope-Grenze wie beim Endlosmodus-Fortschritt selbst (Firestore-Sync als eigener,
// unabhängiger Folgeschritt). Für den Wisent: `bonusFortschritt.wisentKampf`
// (`loadBonusFortschrittLocal`, ebenfalls lokal), dieselbe Quelle, die WisentKampf.tsx beim
// Abschluss setzt.
//
// `blinzeln={false}` bei einer gradierten Figur schaltet laut ZustandsTier.tsx-Kommentar
// ("Blinzeln abschaltbar, etwa für Standbilder in der Ruhmeshalle") genau das ab, was dort
// als künftiger Verwendungszweck vorgesehen war — ein ruhiges Standbild statt der auf der
// Karte blinzelnden Wegmarke.
//
// E5 "Rangaufstieg" (2026-09-15, Christian: "E5 Option A passt für mich"): kein eigenes Bild
// — der Moment, in dem ein Gefährte (bzw. der Wisent) HIER neu ankommt, bekommt stattdessen
// einmalig denselben Funkeln-Effekt, den QuestGeschafft.tsx bereits für "Quest geschafft"
// verwendet (components/Funkeln.tsx, bild-unabhängig, Marken-Gold). Bewusst EINMALIG pro
// Gefährte, nicht bei jedem Ruhmeshalle-Besuch erneut — dafür sorgt das persistierte
// "schon gefeiert"-Set in `holeUndMarkiereRangaufstiege` (storage.ts): der erste Besuch NACH
// der Graduierung feiert, jeder weitere zeigt nur noch das ruhige Standbild. Ein reiner
// Vorher/Nachher-Vergleich innerhalb dieser Komponente (wie der Zwinkern-Auslöser in
// Revier.tsx) hätte genau den ersten, wichtigsten Besuch verpasst — siehe Kommentar dort in
// storage.ts.

import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { Funkeln } from "../components/Funkeln";
import { GefaehrteWegmarke, gefaehrteWegmarkeAspekt, type GefaehrteId } from "../lib/gefaehrtenZustaende";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { ladeEndlosmodusFortschritt, istRevierAbgeschlossen, type EndlosmodusFortschritt } from "../lib/endlosmodusFortschritt";
import { loadBonusFortschrittLocal, holeUndMarkiereRangaufstiege } from "../lib/storage";

/** Die fünf Reviere, in derselben Reihenfolge wie auf der Karte/in Revier.tsx — der Wisent
 *  wird bewusst separat behandelt (eigener Sonderplatz, siehe Konzept-Kommentar oben). */
const RUHMESHALLE_GEFAEHRTEN: Exclude<GefaehrteId, "wisent">[] = [
  "eichhoernchen",
  "rabe",
  "dachs",
  "adlerin",
  "wolf",
];

const FIGUR_BREITE = 68;
const WISENT_BREITE = 78;

export default function Ruhmeshalle() {
  const navigation = useNavigation<any>();
  const [fortschritt, setFortschritt] = useState<EndlosmodusFortschritt>({});
  const [wisentGeschafft, setWisentGeschafft] = useState(false);
  // Siehe E5-Kommentar oben: IDs, für die JETZT (dieser Besuch) einmalig gefunkelt wird.
  const [frischGradiert, setFrischGradiert] = useState<Set<GefaehrteId>>(new Set());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [f, wisentJetztGeschafft] = await Promise.all([
          ladeEndlosmodusFortschritt(),
          loadBonusFortschrittLocal("wisentKampf"),
        ]);
        setFortschritt(f);
        setWisentGeschafft(wisentJetztGeschafft);

        const gradierteIds: GefaehrteId[] = RUHMESHALLE_GEFAEHRTEN.filter((id) => istRevierAbgeschlossen(id, f));
        if (wisentJetztGeschafft) gradierteIds.push("wisent");

        const neu = await holeUndMarkiereRangaufstiege(gradierteIds);
        if (neu.length > 0) {
          setFrischGradiert((vorher) => new Set([...vorher, ...(neu as GefaehrteId[])]));
        }
      })();
    }, [])
  );

  return (
    <View style={styles.wurzel}>
      <WaldHintergrund />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.navigate("KidHome")}
          accessibilityLabel="Zurück zur Karte"
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          style={styles.zurueck}
        >
          <FarnZurueckIcon size={26} />
        </Pressable>
        <View style={styles.mitte}>
          <View style={styles.galerie} accessibilityLabel="Ruhmeshalle">
            {RUHMESHALLE_GEFAEHRTEN.map((id) => (
              <GefaehrtenPlatz
                key={id}
                id={id}
                gradiert={istRevierAbgeschlossen(id, fortschritt)}
                funkeln={frischGradiert.has(id)}
              />
            ))}
          </View>
          {/* Wisent-Sonderplatz: bewusst abgesetzt von der Fünferreihe (eigener, entfernter
              Ort laut Konzept — "der Wisent thront erst am gegenüberliegenden, noch
              unerforschten Kartenrand"), siehe Kopfkommentar. */}
          <View style={styles.wisentPlatz}>
            <GefaehrtenPlatz
              id="wisent"
              gradiert={wisentGeschafft}
              breite={WISENT_BREITE}
              vernebelt={!wisentGeschafft}
              funkeln={frischGradiert.has("wisent")}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function GefaehrtenPlatz({
  id,
  gradiert,
  breite = FIGUR_BREITE,
  vernebelt = false,
  funkeln = false,
}: {
  id: GefaehrteId;
  gradiert: boolean;
  breite?: number;
  vernebelt?: boolean;
  /** E5 Rangaufstieg (siehe Datei-Kommentar oben): einmaliger Funkeln-Ausbruch über der
   *  frisch gradierten Figur, nur beim allerersten Besuch danach. */
  funkeln?: boolean;
}) {
  const aspekt = gefaehrteWegmarkeAspekt(id);
  const hoehe = breite * aspekt;
  const label = gradiert
    ? `${GEFAEHRTE_LABEL[id]}, in der Ruhmeshalle`
    : `${GEFAEHRTE_LABEL[id]}, noch nicht erreicht`;

  return (
    <View style={styles.rahmen} accessibilityLabel={label}>
      {gradiert ? (
        <View style={styles.mitFunkeln}>
          {funkeln && <Funkeln size={Math.max(breite, hoehe) * 1.3} />}
          <GefaehrteWegmarke id={id} breite={breite} blinzeln={false} />
        </View>
      ) : (
        <View style={[styles.leererPlatz, { width: breite, height: hoehe }]}>
          {vernebelt && <NebelschleierIcon size={Math.min(breite, hoehe) * 0.6} />}
        </View>
      )}
    </View>
  );
}

const GEFAEHRTE_LABEL: Record<GefaehrteId, string> = {
  eichhoernchen: "Eichhörnchen",
  rabe: "Rabe",
  dachs: "Dachs",
  adlerin: "Adlerin",
  wolf: "Wolf",
  wisent: "Wisent",
};

/** Schlichter Platzhalter für E8b (Wisent-Sonderplatz "noch nicht erreichbar", Nebelschleier)
 *  — ein einfacher Wolken-/Schleier-Umriss statt einer gemalten Illustration, siehe
 *  Kopfkommentar. */
function NebelschleierIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={11} cy={18} r={6} fill="#B7C2CC" opacity={0.55} />
      <Circle cx={19} cy={15} r={7.5} fill="#B7C2CC" opacity={0.55} />
      <Circle cx={24} cy={19} r={5} fill="#B7C2CC" opacity={0.55} />
      <Rect x={5} y={19} width={24} height={5} rx={2.5} fill="#B7C2CC" opacity={0.55} />
    </Svg>
  );
}

/** Kleines Ruhmeshalle-Icon (Rahmen mit Stern) für den Kartenzugang, siehe RootNavigator.tsx
 *  (KidHome-Zugangsknopf) — eigens hier definiert statt in puzzleIcons.tsx/freispielIcons.tsx,
 *  weil es an genau dieser einen Stelle gebraucht wird und thematisch zu diesem Screen
 *  gehört, nicht zu den dortigen Icon-Familien (Kapitel-Abzeichen bzw. Freispiel-Navigation). */
export function RuhmeshalleIcon({ size = 24, farbe = "#4A4038" }: { size?: number; farbe?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={3} fill="none" stroke={farbe} strokeWidth={1.6} />
      <Path
        d="M12 7.2 L13.4 10.2 L16.6 10.6 L14.3 12.8 L14.9 16 L12 14.4 L9.1 16 L9.7 12.8 L7.4 10.6 L10.6 10.2 Z"
        fill="#D7A52D"
        stroke="#B5822A"
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wurzel: { flex: 1, backgroundColor: "#DCE7C8" },
  safe: { flex: 1 },
  zurueck: {
    position: "absolute",
    top: 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247,241,228,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  mitte: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  galerie: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", gap: 14, maxWidth: 360 },
  rahmen: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(247,241,228,0.55)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  // Zentrierender Wrapper für den Funkeln-Ausbruch (E5) — dieselbe Struktur wie in
  // QuestGeschafft.tsx: Funkeln positioniert sich absolut und zentriert sich über die
  // flex-Zentrierung dieses Wrappers, die Figur bleibt als normales Geschwister-Element.
  mitFunkeln: { alignItems: "center", justifyContent: "center" },
  leererPlatz: {
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(143,168,136,0.55)",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  wisentPlatz: { marginTop: 26 },
});
