// Update-1-Vorzug (2026-09-15, Christian: "Ich möchte es versuchen, die Inhalte aus Update 1
// ins Release zu packen. Wir schaffen das"): Erster Baustein der Gefährten-Reviere — bisher
// gab es dafür überhaupt keine Route, nur den `__DEV__`-Schalter "Gefährten-Vorschau" in
// LuchsRevierKarte.tsx, der die Wegmarken zeigte, aber nicht antippbar machte (siehe
// claude/status_technik_code.md: "Wer die Reviere baut, ergänzt in RootNavigator.tsx echte
// Routen und in LuchsRevierKarte.tsx ein onPress je Gefährte").
//
// Bewusst EIN generischer Screen für alle fünf Gefährten (Eichhörnchen, Rabe, Dachs, Adlerin,
// Wolf) statt fünf eigener Dateien — sie unterscheiden sich nur in `gefaehrteId`, genauso wie
// die sechs Quests sich eine gemeinsame Board.tsx teilen, aber eigene Quest*.tsx-Hüllen haben.
//
// Bewusste Auslassungen in diesem ersten Schritt (siehe claude/update1_vorzug_plan_2026-09-15.md):
//   - Kulisse: `WaldHintergrund` ohne `variante` (dieselbe Platzhalter-Kulisse wie Bonuskapitel/
//     Schlossvorplatz) statt der eigentlichen Revier-Illustration (Asset E1) — die ist noch
//     nicht beauftragt.
//   - Keine gesprochene Begrüßung: Die App ist bewusst textfrei UND stimmenfrei nur mit
//     geprüften, freigegebenen Sprechzeilen (siehe decisions.md, "Konjunktiv vermeiden" etc.) —
//     für "Kind betritt ein Revier zum ersten Mal" gibt es noch keine freigegebene Zeile
//     (status_konzept_story.md: "Zeile für 'Kind tippt auf vernebeltes Revier' … fehlt — Update
//     1"). Neue Kind-Dialoge erfinde ich hier nicht auf eigene Faust.
// Update-1-Vorzug, Fortsetzung (2026-09-15, Christian: "Endlosmodus-Verdrahtung (27 fertige
// Stellungen) ... prüfen und ggf. aktualisieren"): der oben noch als offen beschriebene
// Endlosmodus-Einstieg ist jetzt da — für sieben der neun Fokus-Spalten (siehe
// lib/endlosmodusSpalten.ts, status "bereit"; die restlichen zwei — Figurenwert und Matt in
// 2 — brauchen eine andere Interaktionsart als "eine Figur zieht einmal" und sind bewusst
// noch nicht verdrahtet, siehe dortiger Kommentar). Unterhalb des Gefährten erscheint pro
// spielbarer Spalte eine Kachel mit Titel + erreichten Sternen; Antippen öffnet
// EndlosmodusSpalte.tsx. Reviere ohne spielbare Spalte (aktuell keins) zeigen nichts an.
//
// Weiterhin bewusst ausgelassen (siehe Abschnitt oben): Revier-Kulisse (Platzhalter bleibt),
// gesprochene Begrüßung (keine freigegebene Zeile).
//
// Zustands-Rig-Verdrahtung (2026-09-15, Christian: "Erst Zustands-Rig verdrahten"): Im Rig
// liegt neben Blinzeln auch ein SPRECHEN-Zustand je Gefährte und, bei Adlerin und Rabe, ein
// ZWINKERN. Sprechen bleibt weiterhin unexportiert — das wäre ein offener Mund ohne Ton und
// ohne Sprechblase, also erfundener Dialog ohne Text, den ich hier nicht auf eigene Faust
// ergänze (dieselbe Begründung wie bei der fehlenden Begrüßung oben). Zwinkern braucht
// dagegen keinen Text: die Zustandsdefinition selbst nennt es "Reaktion auf Lob". Unten löst
// `zwinkernAusloeser` bei Adlerin UND Rabe (seit 2026-09-15, siehe lib/gefaehrtenZustaende.tsx
// und claude/rabe_v2_master_korrektur_2026-09-15.md) genau das aus, sobald beim Wiederbetreten
// des Reviers mehr Sterne stehen als beim letzten Verlassen — ein neuer Stern, kein
// spezifisches Klick-Ereignis, damit es unabhängig davon funktioniert, über welche Spalte er
// kam. Eichhörnchen, Dachs und Wolf haben kein Zwinkern-Bild geliefert bekommen,
// `zwinkernAusloeser` wirkt dort ohnehin nicht (siehe GefaehrteWegmarke-Kommentar).
//
// E3 "Freude" (seit 2026-09-15, Christian: "Passt für E3, Eichhörnchen freigeben"): sobald
// `istRevierAbgeschlossen()` für dieses Revier true ist, zeigt `GefaehrteWegmarke` dauerhaft
// die Freude-Pose statt Grundzustand+Blinzeln (`freudeAktiv` unten) — anders als Zwinkern kein
// einmaliges Aufblitzen, sondern der neue Ruhezustand, siehe lib/gefaehrtenZustaende.tsx.
// Aktuell nur beim Eichhörnchen exportiert; bei den übrigen Gefährten wirkungslos, bis ihre
// E3-Lieferung eingebaut ist (siehe claude/e3_e5_produktionsauftraege_2026-09-15.md).

import { useCallback, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { GefaehrteWegmarke, type GefaehrteId } from "../lib/gefaehrtenZustaende";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { Sternensaeule } from "../lib/sternenleiter";
import { spaltenFuerGefaehrte } from "../lib/endlosmodusSpalten";
import {
  ladeEndlosmodusFortschritt,
  sterneInSpalte,
  istRevierAbgeschlossen,
  type EndlosmodusFortschritt,
} from "../lib/endlosmodusFortschritt";
import { markiereRevierBesucht } from "../lib/storage";

/** Name je Revier — dieselben Namen wie in LuchsRevierKarte.tsx (GEFAEHRTEN_ROH), nur hier für
 *  den Screen selbst gebraucht (z. B. `accessibilityLabel`, kein sichtbarer Text). */
const REVIER_NAME: Record<GefaehrteId, string> = {
  eichhoernchen: "Eichhörnchen-Lichtung",
  rabe: "Rabenfels",
  dachs: "Dachshöhle",
  adlerin: "Adlerhorst",
  wolf: "Wolfsfeste",
  // Wisent hat keinen eigenen Revier-Screen dieser Art (Wisent-Kampf ist ein eigener,
  // separater Screen an anderer Stelle der Karte, Segment 18) — hier nur der Vollständigkeit
  // halber im Record, damit `GefaehrteId` nicht zwei leicht unterschiedliche Aufzählungen
  // braucht.
  wisent: "Wisent-Weide",
};

export type RevierParams = { gefaehrteId: GefaehrteId };

export default function Revier() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const gefaehrteId: GefaehrteId = route.params?.gefaehrteId ?? "eichhoernchen";
  const spielbareSpalten = spaltenFuerGefaehrte(gefaehrteId).filter((s) => s.status === "bereit");

  const [fortschritt, setFortschritt] = useState<EndlosmodusFortschritt>({});

  // Zwinkern-Auslöser (siehe Datei-Kommentar oben): `vorherigeSterneRef` hält den zuletzt
  // gesehenen Sternestand dieses Reviers über mehrere Fokus-Wechsel hinweg (Kind spielt eine
  // Spalte, kehrt zurück) — beginnt bei `null`, damit das allererste Laden nie als "neuer
  // Stern" zählt. Steigt die Summe gegenüber dem letzten Laden, zählt `zwinkernAusloeser`
  // eins hoch; `GefaehrteWegmarke` liest daraus ein einmaliges Zwinkern aus (nur bei
  // Gefährten mit exportiertem Zwinkern-Bild, aktuell nur Adlerin).
  const vorherigeSterneRef = useRef<number | null>(null);
  const [zwinkernAusloeser, setZwinkernAusloeser] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Reihenfolge-Freischaltung (siehe storage.ts, Abschnitt "Gefährten-Reviere"): Dieser
      // Besuch schaltet das NÄCHSTE Revier auf der Karte frei. Wisent hat keinen eigenen
      // Revier-Screen dieser Art (siehe Datei-Kopfkommentar) und braucht deshalb keinen
      // eigenen Aufruf — sein Freischalt-Check in LuchsRevierKarte.tsx prüft direkt, ob der
      // letzte reguläre Gefährte (Wolf) schon besucht wurde.
      markiereRevierBesucht(gefaehrteId);
      ladeEndlosmodusFortschritt().then((f) => {
        setFortschritt(f);
        const summe = spielbareSpalten.reduce((acc, s) => acc + sterneInSpalte(f, s.id), 0);
        if (vorherigeSterneRef.current !== null && summe > vorherigeSterneRef.current) {
          setZwinkernAusloeser((n) => n + 1);
        }
        vorherigeSterneRef.current = summe;
      });
      // spielbareSpalten bewusst nicht in den Deps: Sie hängt nur von `gefaehrteId` ab (fest
      // pro Bildschirm-Instanz, siehe Datei-Kommentar oben) und wäre bei jedem Rendern eine
      // neue Array-Referenz.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gefaehrteId])
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
          <View pointerEvents="none" accessibilityLabel={REVIER_NAME[gefaehrteId]}>
            <GefaehrteWegmarke
              id={gefaehrteId}
              breite={200}
              blinzeln
              zwinkernAusloeser={zwinkernAusloeser}
              freudeAktiv={istRevierAbgeschlossen(gefaehrteId, fortschritt)}
            />
          </View>
          {spielbareSpalten.length > 0 && (
            <View style={styles.spaltenReihe}>
              {spielbareSpalten.map((spalte) => (
                <Pressable
                  key={spalte.id}
                  onPress={() => navigation.navigate("EndlosmodusSpalte", { spalteId: spalte.id })}
                  accessibilityLabel={spalte.titel}
                  style={styles.spaltenKachel}
                >
                  <Text style={styles.spaltenTitel}>{spalte.titel}</Text>
                  <Sternensaeule wert={sterneInSpalte(fortschritt, spalte.id)} groesse={12} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
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
  mitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  spaltenReihe: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 20, maxWidth: 320 },
  spaltenKachel: {
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(247,241,228,0.85)",
    alignItems: "center",
  },
  spaltenTitel: { fontSize: 13, fontWeight: "600", color: "#4A4038", marginBottom: 6, textAlign: "center" },
});
