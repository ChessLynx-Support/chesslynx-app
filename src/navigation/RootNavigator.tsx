// Grundnavigation gemäß konzept/technisches_konzept.md Abschnitt 9, Schritt 1:
// "Grundnavigation (Elternbereich vs. Kindbereich) implementieren."
//
// Struktur: Die App startet immer im Kindbereich (kein Login nötig, um zu spielen —
// das Elternkonto wird nur für Fortschrittssync/Kauf gebraucht, nicht fürs Spielen
// selbst, siehe Design-Dokument "Einstieg so einfach wie möglich"). Der Elternbereich
// ist ausschließlich über einen dezenten Zugang + ParentGate erreichbar.
//
// Update (2026-09-06): `ParentDashboardPlaceholder` durch die vollständige
// ParentDashboard-Umsetzung (siehe screens/ParentDashboard.tsx) ersetzt — Inhalt und
// Aufbau folgen 1:1 dem geprüften Entwurf im Claude-Projekt "ChessLynx". Außerdem neu:
// die lokale, harte Zeitlimit-Sperre (siehe lib/zeitlimit.ts) ist jetzt in KidHome
// eingebunden — Details zur bewussten Scope-Grenze (noch nicht in den Quest-Screens
// selbst) siehe Kommentar dort.
//
// Update (2026-09-06, Schritt #74 "FreispielPartie", siehe projektwissen.md Kurzstatus
// für die vollständige Schritt-Tabelle #71–#77): `FreispielScreen` (die Übungslichtung-
// Liste, Schritt #73) und `FreispielPartie` (die eigentliche Spielansicht gegen den
// Bot, Schritt #74) sind ab jetzt als Routen registriert — beide waren zuvor gebaut,
// aber noch an keiner Stelle erreichbar. Bewusst NOCH KEIN Einstiegspunkt von KidHome
// aus (kein neuer Button/Kartenwegpunkt) — das ist Schritt #76 ("provisorische
// Navigation zum Freispiel-Screen"), ein eigener, separat zu bestätigender Schritt.
// Bis dahin ist `FreispielScreen` nur über `navigation.navigate("FreispielScreen")`
// aus dem Code heraus erreichbar (z. B. zu Testzwecken), nicht über die UI.

import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from "react-native";
import { ParentGate } from "../screens/ParentGate";
import { Credits } from "../screens/Credits";
import { ElternLogin } from "../screens/ElternLogin";
import { ParentDashboard } from "../screens/ParentDashboard";
import { LuxSperre } from "../components/LuxSperre";
// Dezentes Marken-Wasserzeichen, immer oben rechts, auf jedem Bildschirm — siehe
// Rückfrage des Nutzers im Claude-Projekt "ChessLynx" ("Wasserzeichen ... um alle
// Designentwürfe in der App zu schützen"). Bewusst hier zentral montiert statt in jedem
// Screen einzeln, siehe components/BrandWatermark.tsx für die Details/Grenzen.
import { BrandWatermark } from "../components/BrandWatermark";
import { useAuthUser } from "../lib/auth";
import { getOrCreateAktivesKindId, syncPendingProgress } from "../lib/storage";
import { kindProfilPfad } from "../lib/firebase";
// Neu (2026-09-06): Sync des neuen Freispiel-Fortschritts (Übungslichtung, siehe
// endlosmodus_freispiel_konzept.md) — eigener Aufruf neben syncPendingProgress, damit
// beide Fortschrittsarten unabhängig voneinander fehlschlagen/erneut versucht werden
// können (siehe Kommentar in lib/freispielFortschritt.ts).
import { syncPendingFreispielFortschritt } from "../lib/freispielFortschritt";
import { useZeitlimitWaechter } from "../lib/zeitlimit";
import Quest1 from "../quest1/Quest1";
import Quest2 from "../quest2/Quest2";
import Quest3 from "../quest3/Quest3";
import Quest4 from "../quest4/Quest4";
import Quest5 from "../quest5/Quest5";
import Quest6 from "../quest6/Quest6";
import FreispielScreen from "../screens/FreispielScreen";
import FreispielPartie from "../screens/FreispielPartie";
// Isolierter Rig-Renderer-Vorversuch, Schritt 2 der Grundgerüst-Integrationsplan-Liste
// (siehe priorisierter_umsetzungsplan.md) — nach demselben Muster wie seinerzeit
// FreispielScreen vor Schritt #76 registriert: bewusst kein Einstiegspunkt in der
// eigentlichen UI, nur als Route erreichbar. Siehe dev/RigRendererProbe.tsx für Zweck
// und Umfang. Schritt 2 ist abgeschlossen (initialRouteName steht wieder auf
// "KidHome") — dieser Import, der Stack.Screen-Eintrag unten und der
// RootStackParamList-Eintrag bleiben als bei Bedarf erreichbarer Testscreen stehen.
import RigRendererProbe from "../dev/RigRendererProbe";
// Onboarding/Splash-Screen (priorisierter_umsetzungsplan.md, Phase 3) — siehe
// screens/Onboarding.tsx für Umfang und bewusste Scope-Grenzen (kein "nur beim ersten
// Start"-Flag, keine zusätzliche Deko). Ab jetzt initialRouteName, siehe unten.
import { Onboarding } from "../screens/Onboarding";

export type RootStackParamList = {
  // Neu: erster Bildschirm der App (siehe initialRouteName unten).
  Onboarding: undefined;
  KidHome: undefined;
  Quest1: undefined;
  Quest2: undefined;
  Quest3: undefined;
  Quest4: undefined;
  Quest5: undefined;
  Quest6: undefined;
  ParentGate: undefined;
  // Zwischenstopp nach dem Eltern-Gate: entscheidet anhand des Anmeldestatus, ob es
  // zu ElternLogin oder direkt zu ParentDashboard weitergeht (siehe
  // ElternBereichRouter unten). `kindNicknameFallsNeu` kommt nur aus dem
  // Registrieren-Formular in ElternLogin.tsx.
  ElternBereich: { kindNicknameFallsNeu?: string } | undefined;
  ElternLogin: undefined;
  ParentDashboard: undefined;
  Credits: undefined;
  // Neu (2026-09-06): Sperr-Bildschirm, wenn das tägliche Zeitlimit erreicht ist —
  // siehe lib/zeitlimit.ts (useZeitlimitWaechter) und components/LuxSperre.tsx.
  ZeitlimitSperre: undefined;
  // Neu (2026-09-06, Schritt #73/#74): die Freispiel-Übungslichtung (Liste der 16
  // Bot-Stufen) und die eigentliche Partie-Ansicht. `neuFreigeschaltetElo` wird von
  // FreispielPartie beim Zurücknavigieren nach einem Sieg gesetzt (löst die
  // Freischalt-Feier-Animation in FreispielScreen aus, siehe dort).
  FreispielScreen: { neuFreigeschaltetElo?: number } | undefined;
  FreispielPartie: { elo: number };
  // Nur für Schritt 2 (siehe Import-Kommentar oben) — wieder entfernen, sobald der
  // Vorversuch geprüft und abgeschlossen ist.
  RigProbe: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Platzhalter-Startscreen: in der echten App die Königreich-/Quest-Übersichtskarte
// (Luchs-Revier), hier nur eine minimale Auswahl, um Quest 1 direkt erreichbar zu machen.
function KidHome({ navigation }: any) {
  // Prüft beim Öffnen sofort, ob das Tageslimit schon erreicht ist, und verbucht
  // danach in regelmäßigen Abständen weiter, solange dieser Screen sichtbar ist (siehe
  // lib/zeitlimit.ts). Bewusste Scope-Grenze dieses Umsetzungsschritts: die einzelnen
  // Quest-Screens (Quest1–6) rufen diesen Hook noch nicht auf — dort verbrachte Zeit
  // wird aktuell nicht mitgezählt. Das Nachrüsten ist dank dieses Hooks pro Screen nur
  // noch eine Zeile (`useZeitlimitWaechter(() => navigation.replace("ZeitlimitSperre"))`),
  // aber als eigener, in sich abgeschlossener Folgeschritt zurückgestellt.
  useZeitlimitWaechter(() => navigation.replace("ZeitlimitSperre"));

  return (
    <View style={styles.center}>
      <Pressable style={styles.questButton} onPress={() => navigation.navigate("Quest1")}>
        <Text style={styles.questButtonText}>Quest 1 — Igel</Text>
      </Pressable>
      <Pressable style={[styles.questButton, styles.questButtonSecond]} onPress={() => navigation.navigate("Quest2")}>
        <Text style={styles.questButtonText}>Quest 2 — Bär</Text>
      </Pressable>
      <Pressable style={[styles.questButton, styles.questButtonSecond]} onPress={() => navigation.navigate("Quest3")}>
        <Text style={styles.questButtonText}>Quest 3 — Eule</Text>
      </Pressable>
      <Pressable style={[styles.questButton, styles.questButtonSecond]} onPress={() => navigation.navigate("Quest4")}>
        <Text style={styles.questButtonText}>Quest 4 — Pferd</Text>
      </Pressable>
      <Pressable style={[styles.questButton, styles.questButtonSecond]} onPress={() => navigation.navigate("Quest5")}>
        <Text style={styles.questButtonText}>Quest 5 — Schwan</Text>
      </Pressable>
      <Pressable style={[styles.questButton, styles.questButtonSecond]} onPress={() => navigation.navigate("Quest6")}>
        <Text style={styles.questButtonText}>Quest 6 — Hirsch</Text>
      </Pressable>
      <Pressable style={styles.parentLink} onPress={() => navigation.navigate("ParentGate")}>
        <Text style={styles.parentLinkText}>·</Text>
      </Pressable>
    </View>
  );
}

// Sperr-Bildschirm, wenn das Tageslimit erreicht ist (siehe lib/zeitlimit.ts und
// components/LuxSperre.tsx) — "Ein Elternteil holen" führt direkt ins Eltern-Gate,
// danach (bei erfolgreicher Freigabe) automatisch weiter ins Eltern-Dashboard, wo das
// Limit verlängert werden kann (kürzester Weg zur Verlängerung, siehe Entwurf).
function ZeitlimitSperreScreen({ navigation }: any) {
  return <LuxSperre aufElternteilHolen={() => navigation.navigate("ParentGate")} />;
}

function ParentGateScreen({ navigation }: any) {
  return <ParentGate onUnlocked={() => navigation.replace("ElternBereich")} />;
}

// Zwischenstopp zwischen Eltern-Gate und Eltern-Dashboard: wartet kurz auf den
// initialen Anmeldestatus (siehe useAuthUser in auth.ts), leitet dann entweder zu
// ElternLogin (kein Elternkonto angemeldet) oder — nach dem Sicherstellen des aktiven
// Kinderprofils und dem Abgleich ausstehenden Fortschritts, siehe storage.ts — direkt
// zum Eltern-Dashboard weiter. Genau der in technisches_konzept.md Abschnitt 4
// vorgesehene Zeitpunkt ("nur das Eltern-Dashboard und der initiale Konto-Login
// benötigen zwingend eine Verbindung").
function ElternBereichRouter({ navigation, route }: any) {
  const { loading, user } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigation.replace("ElternLogin");
      return;
    }
    let abgebrochen = false;
    (async () => {
      try {
        const kindId = await getOrCreateAktivesKindId(user.uid, route?.params?.kindNicknameFallsNeu);
        await syncPendingProgress(kindProfilPfad(user.uid, kindId));
        await syncPendingFreispielFortschritt(kindProfilPfad(user.uid, kindId));
      } catch (fehler) {
        // Sync-Fehler blockieren den Dashboard-Zugang bewusst nicht (Offline-first-
        // Prinzip, siehe technisches_konzept.md Abschnitt 4) — beim nächsten
        // Verbindungsaufbau wird automatisch erneut versucht (Warteschlange bleibt
        // erhalten, siehe syncPendingProgress in storage.ts).
        console.warn("Firestore-Sync beim Öffnen des Eltern-Bereichs fehlgeschlagen:", fehler);
      }
      if (!abgebrochen) navigation.replace("ParentDashboard");
    })();
    return () => {
      abgebrochen = true;
    };
  }, [loading, user]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color="#8FA888" />
    </View>
  );
}

export function RootNavigator() {
  return (
    // `styles.appRoot` (flex:1) gibt BrandWatermark einen gemeinsamen, garantiert
    // bildschirmfüllenden Bezugsrahmen für seine absolute Positionierung — ohne diesen
    // Wrapper wäre "oben rechts" nicht zuverlässig relativ zum ganzen Bildschirm.
    <View style={styles.appRoot}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          // Update (Onboarding/Splash-Screen, priorisierter_umsetzungsplan.md Phase 3):
          // Startbildschirm ist jetzt "Onboarding" statt "KidHome" — der CTA "Loslegen"
          // dort führt per navigation.replace direkt zu KidHome weiter (siehe
          // screens/Onboarding.tsx). Der Rig-Renderer-Probe-Screen bleibt unverändert nur
          // über navigation.navigate("RigProbe") aus dem Code heraus erreichbar.
          initialRouteName="Onboarding"
        >
          <Stack.Screen name="Onboarding" component={Onboarding} />
          <Stack.Screen name="RigProbe" component={RigRendererProbe} />
          <Stack.Screen name="KidHome" component={KidHome} />
          <Stack.Screen name="Quest1" component={Quest1} />
          <Stack.Screen name="Quest2" component={Quest2} />
          <Stack.Screen name="Quest3" component={Quest3} />
          <Stack.Screen name="Quest4" component={Quest4} />
          <Stack.Screen name="Quest5" component={Quest5} />
          <Stack.Screen name="Quest6" component={Quest6} />
          <Stack.Screen name="ParentGate" component={ParentGateScreen} />
          <Stack.Screen name="ElternBereich" component={ElternBereichRouter} />
          <Stack.Screen name="ElternLogin" component={ElternLogin} />
          <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
          <Stack.Screen name="Credits" component={Credits} />
          <Stack.Screen name="ZeitlimitSperre" component={ZeitlimitSperreScreen} />
          <Stack.Screen name="FreispielScreen" component={FreispielScreen} />
          <Stack.Screen name="FreispielPartie" component={FreispielPartie} />
        </Stack.Navigator>
      </NavigationContainer>
      <BrandWatermark />
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F1E4" },
  questButton: { backgroundColor: "#C9855F", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20 },
  questButtonSecond: { marginTop: 16, backgroundColor: "#8FA888" },
  questButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  // Bewusst unauffällig (kein Icon/Label) — der eigentliche Kinder-Schutz kommt vom
  // ParentGate selbst (Halten+Wischen+Rechenaufgabe), nicht von Unsichtbarkeit allein.
  parentLink: { position: "absolute", bottom: 12, right: 16, padding: 12 },
  parentLinkText: { color: "#D8D2C4", fontSize: 12 },
});
