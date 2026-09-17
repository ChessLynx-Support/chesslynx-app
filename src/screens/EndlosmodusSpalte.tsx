// Update-1-Vorzug (2026-09-15): Screen für EINE Endlosmodus-Fokus-Spalte (z. B. Dachshöhle
// "Figur gewinnen") — zeigt die drei Sterne-Stellungen als antippbare Reihe, öffnet beim
// Antippen die passende EndlosmodusPuzzle-Aufgabe, speichert den Fortschritt danach.
//
// Bewusst EIN gemeinsamer Screen für alle sieben spielbaren Spalten (status "bereit" in
// lib/endlosmodusSpalten.ts) statt eigener Dateien je Spalte — dieselbe Struktur-
// entscheidung wie bei screens/Revier.tsx für die fünf Gefährten.
//
// Kein Reihenfolge-Zwang innerhalb der Spalte (siehe lib/endlosmodusFortschritt.ts,
// "beliebig oft wiederholbar") — bei den fünf klassischen Drei-Aufgaben-Spalten sind alle
// drei Sterne von Anfang an antippbar, gelöste Sterne bleiben dauerhaft als gefüllter Stern
// markiert.
//
// Nachtrag (2026-09-17, Christian: "10x Stufe eins ..., 8x Stufe zwei, 5x Stufe drei", siehe
// claude/taktik_schwierigkeitseskalation_konzept_2026-09-16.md): die beiden "Figur gewinnen"-
// Spalten haben jetzt 23 statt 3 Aufgaben (siehe endlosmodusAufgaben.tsx). Für sie zeigt
// dieser Screen NICHT mehr die alte Drei-Sterne-Kachelreihe, sondern eine fortlaufende
// Aufgabenfolge: die jeweils nächste offene Aufgabe wird automatisch geöffnet ("dort
// weitermachen, wenn man aussteigt", siehe endlosmodusFortschritt.ts, naechsteOffeneAufgabe
// InSpalte), mit einer Fortschrittsanzeige ("Stufe 1 · Aufgabe 4 von 10") und derselben
// Drei-Sterne-Reihe darüber — hier aber als reine STUFEN-Fortschrittsanzeige, nicht mehr als
// Tipp-Ziel. Die fünf klassischen Spalten (Schach lösen, Rochade, Fesselung) bleiben exakt
// beim bisherigen Verhalten (siehe `istEskaliert` unten).

import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { SternIcon } from "../lib/sternenleiter";
import { t } from "../lib/sprache";
import { EndlosmodusPuzzle } from "../lib/EndlosmodusPuzzle";
import { ENDLOSMODUS_AUFGABEN } from "../lib/endlosmodusAufgaben";
import { spalteById, type EndlosmodusSpalteId } from "../lib/endlosmodusSpalten";
import { stufeUndPositionFuerIndex, stufenFuerSpalte } from "../lib/endlosmodusStufen";
import {
  ladeEndlosmodusFortschritt,
  meldeAufgabeGeloest,
  naechsteOffeneAufgabeInSpalte,
  sterneInSpalte,
  type EndlosmodusFortschritt,
} from "../lib/endlosmodusFortschritt";

export type EndlosmodusSpalteParams = { spalteId: EndlosmodusSpalteId };

export default function EndlosmodusSpalte() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const spalteId: EndlosmodusSpalteId = route.params?.spalteId;
  const spalte = spalteById(spalteId);
  const aufgaben = ENDLOSMODUS_AUFGABEN[spalteId];

  // Eskalierte Spalten (aktuell nur die beiden "Figur gewinnen"-Spalten, siehe Datei-
  // Kopfkommentar) erkennt der Screen rein an der Aufgabenanzahl — kein hartverdrahteter
  // Spaltenname hier, das entscheidet allein endlosmodusAufgaben.tsx/endlosmodusStufen.ts.
  const istEskaliert = (aufgaben?.length ?? 0) > 3;

  const [fortschritt, setFortschritt] = useState<EndlosmodusFortschritt>({});
  // Nur gesetzt, während "Von vorne üben" (siehe unten) aktiv ist — unabhängig vom
  // gespeicherten Fortschritt, da hier bereits gelöste Aufgaben zum Wiederholen erneut
  // gezeigt werden. null = normaler Modus (nächste offene Aufgabe, siehe naechsterIndex).
  const [uebungsIndex, setUebungsIndex] = useState<number | null>(null);
  // Für die klassischen Drei-Aufgaben-Spalten weiterhin per Sterne-Kachel wählbar.
  const [aktiverStern, setAktiverStern] = useState<0 | 1 | 2 | null>(null);

  const ladeFortschritt = useCallback(() => {
    ladeEndlosmodusFortschritt().then(setFortschritt);
  }, []);

  // Neu laden, wenn der Screen wieder in den Fokus kommt (z. B. Rückkehr aus einer
  // anderen Spalte) — deckt auch den ersten Mount mit ab, kein separater useEffect nötig.
  useFocusEffect(ladeFortschritt);

  if (!aufgaben) {
    // Sollte nicht erreichbar sein (Revier.tsx verlinkt nur "bereit"-Spalten), Sicherheitsnetz.
    return null;
  }

  const sterne = sterneInSpalte(fortschritt, spalteId);

  if (istEskaliert) {
    const stufen = stufenFuerSpalte(spalteId);
    const naechsterIndex = naechsteOffeneAufgabeInSpalte(fortschritt, spalteId);
    const alleGeloest = naechsterIndex >= aufgaben.length;
    // Im Übungsmodus (siehe "Von vorne üben" unten) zeigt der Screen `uebungsIndex`
    // unabhängig vom gespeicherten Fortschritt — sonst die nächste offene Aufgabe.
    const imUebungsModus = uebungsIndex !== null;
    const offenerIndex = imUebungsModus ? uebungsIndex! : naechsterIndex;

    async function handleEskaliertGeloest(index: number) {
      if (imUebungsModus) {
        // Bereits gelöste Aufgaben werden hier nur wiederholt (kein erneuter Speicher-
        // Schreibzugriff nötig, sie stehen schon auf `true`) — einfach zur nächsten
        // Übungsaufgabe weiter, oder zurück zur Übersicht, wenn die letzte erreicht ist.
        const naechsteUebung = index + 1;
        setUebungsIndex(naechsteUebung < aufgaben!.length ? naechsteUebung : null);
        return;
      }
      const neu = await meldeAufgabeGeloest(spalteId, index);
      setFortschritt(neu);
    }

    return (
      <View style={styles.wurzel}>
        <WaldHintergrund />
        <SafeAreaView style={styles.safe} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityLabel={t("Zurück", "Back")}
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            style={styles.zurueck}
          >
            <FarnZurueckIcon size={26} />
          </Pressable>

          <View style={styles.mitte}>
            <Text style={styles.titel}>{spalte.titel}</Text>
            <View style={styles.sterneReihe}>
              {([0, 1, 2] as const).map((i) => (
                <View key={i} style={styles.sternKachel}>
                  <SternIcon size={sterne > i ? 40 : 30} />
                </View>
              ))}
            </View>

            {alleGeloest && !imUebungsModus ? (
              <>
                <Text style={styles.fortschrittText}>
                  {t("Alle Aufgaben gemeistert! Du kannst jederzeit von vorne üben.", "All tasks mastered! You can practice from the start any time.")}
                </Text>
                <Pressable style={styles.uebenKnopf} onPress={() => setUebungsIndex(0)}>
                  <Text style={styles.uebenKnopfText}>{t("Von vorne üben", "Practice from the start")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                {(() => {
                  const { stufe, positionInStufe, groesseStufe } = stufeUndPositionFuerIndex(offenerIndex, stufen);
                  return (
                    <Text style={styles.fortschrittText}>
                      {t(
                        `Stufe ${stufe} · Aufgabe ${positionInStufe} von ${groesseStufe}`,
                        `Level ${stufe} · Task ${positionInStufe} of ${groesseStufe}`
                      )}
                    </Text>
                  );
                })()}
                <EndlosmodusPuzzle
                  key={offenerIndex}
                  aufgabe={aufgaben[offenerIndex]}
                  onSolved={() => handleEskaliertGeloest(offenerIndex)}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const geloest = fortschritt[spalteId] ?? [];

  async function handleSolved(sternIndex: 0 | 1 | 2) {
    const neu = await meldeAufgabeGeloest(spalteId, sternIndex);
    setFortschritt(neu);
    setAktiverStern(null);
  }

  return (
    <View style={styles.wurzel}>
      <WaldHintergrund />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Pressable
          onPress={() => (aktiverStern !== null ? setAktiverStern(null) : navigation.goBack())}
          accessibilityLabel="Zurück"
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          style={styles.zurueck}
        >
          <FarnZurueckIcon size={26} />
        </Pressable>

        {aktiverStern !== null ? (
          <View style={styles.mitte}>
            <EndlosmodusPuzzle aufgabe={aufgaben[aktiverStern]} onSolved={() => handleSolved(aktiverStern)} />
          </View>
        ) : (
          <View style={styles.mitte}>
            <Text style={styles.titel}>{spalte.titel}</Text>
            <View style={styles.sterneReihe}>
              {([0, 1, 2] as const).map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setAktiverStern(i)}
                  accessibilityLabel={`Stern ${i + 1}${geloest[i] ? ", gelöst" : ""}`}
                  style={styles.sternKachel}
                >
                  <SternIcon size={geloest[i] ? 40 : 30} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
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
  titel: { fontSize: 20, fontWeight: "700", color: "#4A4038", marginBottom: 24 },
  sterneReihe: { flexDirection: "row", gap: 28, marginBottom: 12 },
  sternKachel: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(247,241,228,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  fortschrittText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A4038",
    marginBottom: 16,
    textAlign: "center",
    maxWidth: 280,
  },
  uebenKnopf: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(247,241,228,0.9)",
  },
  uebenKnopfText: { fontSize: 15, fontWeight: "700", color: "#4A4038" },
});
