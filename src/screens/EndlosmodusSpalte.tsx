// Update-1-Vorzug (2026-09-15): Screen für EINE Endlosmodus-Fokus-Spalte (z. B. Dachshöhle
// "Figur gewinnen") — zeigt die drei Sterne-Stellungen als antippbare Reihe, öffnet beim
// Antippen die passende EndlosmodusPuzzle-Aufgabe, speichert den Fortschritt danach.
//
// Bewusst EIN gemeinsamer Screen für alle sieben spielbaren Spalten (status "bereit" in
// lib/endlosmodusSpalten.ts) statt eigener Dateien je Spalte — dieselbe Struktur-
// entscheidung wie bei screens/Revier.tsx für die fünf Gefährten.
//
// Kein Reihenfolge-Zwang innerhalb der Spalte (siehe lib/endlosmodusFortschritt.ts,
// "beliebig oft wiederholbar") — alle drei Sterne sind von Anfang an antippbar, gelöste
// Sterne bleiben dauerhaft als gefüllter Stern markiert.

import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { SternIcon } from "../lib/sternenleiter";
import { EndlosmodusPuzzle } from "../lib/EndlosmodusPuzzle";
import { ENDLOSMODUS_AUFGABEN } from "../lib/endlosmodusAufgaben";
import { spalteById, type EndlosmodusSpalteId } from "../lib/endlosmodusSpalten";
import {
  ladeEndlosmodusFortschritt,
  meldeAufgabeGeloest,
  type EndlosmodusFortschritt,
} from "../lib/endlosmodusFortschritt";

export type EndlosmodusSpalteParams = { spalteId: EndlosmodusSpalteId };

export default function EndlosmodusSpalte() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const spalteId: EndlosmodusSpalteId = route.params?.spalteId;
  const spalte = spalteById(spalteId);
  const aufgaben = ENDLOSMODUS_AUFGABEN[spalteId];

  const [fortschritt, setFortschritt] = useState<EndlosmodusFortschritt>({});
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

  const geloest = fortschritt[spalteId] ?? [false, false, false];

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
  sterneReihe: { flexDirection: "row", gap: 28 },
  sternKachel: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(247,241,228,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
});
