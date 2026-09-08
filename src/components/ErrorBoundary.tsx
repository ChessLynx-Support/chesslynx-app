// Error Boundary (siehe claude/priorisierter_umsetzungsplan.md, "Zusätzliche
// Optimierungspotentiale" — "Ein Wrapper um RootNavigator, der bei einem unerwarteten
// Laufzeitfehler eine freundliche Lux-Ausweichmeldung statt eines weißen Bildschirms
// zeigt"). Wichtig gerade für die Zielgruppe (5-Jährige, oft ohne direkt daneben
// sitzendes Elternteil): ein weißer Absturz-Bildschirm ohne jede Erklärung ist für ein
// Kind unverständlich und beängstigend — React zeigt bei einem nicht abgefangenen
// Render-Fehler sonst genau das (bzw. im Dev-Modus einen roten Fehlerbildschirm).
//
// React Error Boundaries MÜSSEN Klassenkomponenten sein (getDerivedStateFromError/
// componentDidCatch existieren nicht als Hook-Äquivalent) — deshalb hier bewusst die
// einzige Klassenkomponente im sonst durchgehend funktionalen Code der App.
//
// Bewusste Design-Entscheidungen:
// - KEIN Import von luxHaptik.ts/luxKlang.ts/luxStimme.ts hier: diese hängen an
//   expo-haptics/expo-av/expo-speech, die laut Projektstand noch nicht installiert sind
//   (siehe luxHaptik.ts-Kommentar, `npx expo install ...`). Eine Error Boundary ist das
//   letzte Sicherheitsnetz der App — sie soll so wenig wie irgend möglich selbst
//   scheitern können, deshalb bewusst ohne zusätzliche Abhängigkeiten, nur React Native
//   Kernkomponenten plus die bereits verdrahtete LuxHeroIcon-Grafik.
// - Ton/Wortlaut orientiert sich an LuxSperre.tsx (src/components/LuxSperre.tsx): warm,
//   kein Bestrafungs-/Schuld-Ton, kurzer Fließtext statt technischer Details.
// - "Nochmal versuchen" setzt nur den internen Fehlerzustand zurück (kein Neustart der
//   ganzen App) — reicht in den meisten Fällen (z. B. ein einmaliger Rendering-Fehler in
//   einem Quest-Screen) aus, damit RootNavigator neu rendert. Tritt der Fehler beim
//   erneuten Rendern sofort wieder auf, bleibt die Ausweichmeldung stehen — bewusst kein
//   automatischer Loop-Schutz/Retry-Zähler für diesen ersten Wurf, siehe Kommentar am
//   Dateiende.
// - componentDidCatch loggt aktuell nur nach console.error — es ist noch kein
//   Crash-Reporting-Dienst (z. B. Sentry) im Projekt verdrahtet; das Anbinden eines
//   solchen Diensts ist ein separater, in sich abgeschlossener Folgeschritt.

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { LuxHeroIcon } from "../lib/luxAssets";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Absichtlich nur Konsolen-Log (siehe Dateikopf) — kein Crash-Reporting-Dienst bisher
    // angebunden. Für die spätere Fehlersuche trotzdem mit vollem Stack/Component-Stack.
    console.error("[ErrorBoundary] Unerwarteter Laufzeitfehler:", error, errorInfo.componentStack);
  }

  resetError = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <LuxHeroIcon width={160} />
          <Text style={styles.titel}>Huch, da ist etwas durcheinandergeraten!</Text>
          <Text style={styles.text}>
            Das ist nicht deine Schuld. Tipp einfach auf den Knopf — dann versucht Lux es
            noch einmal. Klappt es weiterhin nicht, hilft ein Elternteil bestimmt gerne
            beim Neustart der App.
          </Text>
          <Pressable style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Nochmal versuchen</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  // Farben/Aufbau bewusst identisch zu LuxSperre.tsx — dieselbe "warme, kindgerechte
  // Ausweich-/Hinweismeldung"-Sprache wie an der anderen Stelle, an der die sonst
  // textfreie Kind-Oberfläche ausnahmsweise Text zeigt.
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F1E4",
    padding: 32,
  },
  titel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4A4038",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: "#6B6255",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#C9855F",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});

// Bewusst NICHT Teil dieses Umsetzungsschritts (mögliche spätere Erweiterungen):
// - Automatischer Loop-Schutz (z. B. "nach 3 Fehlern in Folge trotzdem einen echten
//   App-Neustart vorschlagen") — für den ersten Wurf reicht das einfache Zurücksetzen.
// - Anbindung eines Crash-Reporting-Diensts (Sentry o. Ä.) statt/zusätzlich zu
//   console.error, sobald ein solcher Dienst für das Projekt ausgewählt ist.
// - Mehrere, gezielt platzierte innere Error Boundaries (z. B. je Quest-Screen statt nur
//   einmal um RootNavigator) — aktuell bewusst nur die eine äußere Grenze, siehe App.tsx.
