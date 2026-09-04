// Grundnavigation gemäß konzept/technisches_konzept.md Abschnitt 9, Schritt 1:
// "Grundnavigation (Elternbereich vs. Kindbereich) implementieren."
//
// Struktur: Die App startet immer im Kindbereich (kein Login nötig, um zu spielen —
// das Elternkonto wird nur für Fortschrittssync/Kauf gebraucht, nicht fürs Spielen
// selbst, siehe Design-Dokument "Einstieg so einfach wie möglich"). Der Elternbereich
// ist ausschließlich über einen dezenten Zugang + ParentGate erreichbar.

import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ParentGate } from "../screens/ParentGate";
import Quest1 from "../quest1/Quest1";

export type RootStackParamList = {
  KidHome: undefined;
  Quest1: undefined;
  ParentGate: undefined;
  ParentDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Platzhalter-Startscreen: in der echten App die Königreich-/Quest-Übersichtskarte
// (Luchs-Revier), hier nur eine minimale Auswahl, um Quest 1 direkt erreichbar zu machen.
function KidHome({ navigation }: any) {
  return (
    <View style={styles.center}>
      <Pressable style={styles.questButton} onPress={() => navigation.navigate("Quest1")}>
        <Text style={styles.questButtonText}>Quest 1 — Igel</Text>
      </Pressable>
      <Pressable style={styles.parentLink} onPress={() => navigation.navigate("ParentGate")}>
        <Text style={styles.parentLinkText}>·</Text>
      </Pressable>
    </View>
  );
}

function ParentDashboardPlaceholder() {
  return (
    <View style={styles.center}>
      <Text>Eltern-Dashboard — TODO (Fortschrittsanzeige, Zeitlimit, Datenschutz-Link)</Text>
    </View>
  );
}

function ParentGateScreen({ navigation }: any) {
  return <ParentGate onUnlocked={() => navigation.replace("ParentDashboard")} />;
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="KidHome" component={KidHome} />
        <Stack.Screen name="Quest1" component={Quest1} />
        <Stack.Screen name="ParentGate" component={ParentGateScreen} />
        <Stack.Screen name="ParentDashboard" component={ParentDashboardPlaceholder} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F1E4" },
  questButton: { backgroundColor: "#C9855F", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20 },
  questButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  // Bewusst unauffällig (kein Icon/Label) — der eigentliche Kinder-Schutz kommt vom
  // ParentGate selbst (Halten+Wischen+Rechenaufgabe), nicht von Unsichtbarkeit allein.
  parentLink: { position: "absolute", bottom: 12, right: 16, padding: 12 },
  parentLinkText: { color: "#D8D2C4", fontSize: 12 },
});
