// Eltern-Gate gemäß konzept/technisches_konzept.md Abschnitt 6:
// 1. Erst 3 Sekunden halten + wischen, bevor überhaupt eine Eingabe erscheint
//    (verhindert zufälliges Antippen durch Kinder).
// 2. Dann eine einfache, zufällige Rechenaufgabe (z. B. "7 + 4") über ein Ziffernfeld.
// Rein clientseitige Logik, keine Backend-Abhängigkeit — bewusst kein Lese-Text nötig,
// da sich die Aufgabe an Eltern richtet (siehe Design-Dokument: "ohne Lesen" gilt nur
// für die Kind-UI, Eltern-Text ist explizit erlaubt).

import { useRef, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, PanResponder, Platform } from "react-native";
// `Pressable` wird unten nur noch für den Rechenaufgabe-Bestätigen-Button gebraucht,
// nicht mehr für den Halt-Bereich (siehe Korrektur vom 2026-09-04 unten).

const HOLD_DURATION_MS = 3000;

// Korrektur (2026-09-04, gefunden beim ersten echten Test im Browser): Auf der
// Web-Plattform interpretiert der Browser ein gehaltenes Mausklicken auf Text/View
// standardmäßig als Text-Markierung ("select") statt als Beginn einer Wisch-Geste —
// der Nutzer sah dadurch nur blau markierten Text, PanResponder bekam die Freigabe-
// Geste nie zu fassen, weil die native Browser-Selektion "gewinnt". `userSelect`/
// `WebkitUserSelect`/`WebkitTouchCallout` sind reine Web-CSS-Eigenschaften, die
// react-native-web unverändert durchreicht; auf nativen Plattformen (iOS/Android)
// werden sie schlicht ignoriert, dort gab es das Problem ohnehin nie (kein
// Text-Selektions-Verhalten bei Touch-Long-Press).
// `as any`, weil `userSelect`/`WebkitUserSelect`/`WebkitTouchCallout` reine Web-CSS-
// Eigenschaften sind, die in den React-Native-Style-Typen (ViewStyle/TextStyle) nicht
// deklariert sind — react-native-web akzeptiert sie trotzdem zur Laufzeit anstandslos.
const webNoTextSelect: any =
  Platform.OS === "web"
    ? { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }
    : {};

function zufallsZahl(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Update (Nutzer-Feedback 2026-09-07): Die bisherige einstellige Addition (z. B.
// "7 + 4") konnte von der 5-jährigen Tochter des Nutzers bereits gelesen UND gelöst
// werden — als Kind-Sperre damit zu schwach. Jetzt drei zufällig gewählte Aufgaben-
// typen, alle bewusst jenseits dessen, was im Vorschulalter/der 1. Klasse üblich
// unterrichtet wird (zweistellige Addition/Subtraktion mit Übertrag, kleines Einmaleins
// im oberen Bereich 6–9), für einen Erwachsenen aber weiterhin im Kopf und in
// Sekunden lösbar.
function randomMathProblem(): { frage: string; answer: number } {
  const art = Math.floor(Math.random() * 3);
  if (art === 0) {
    const a = zufallsZahl(23, 89);
    const b = zufallsZahl(14, 77);
    return { frage: `${a} + ${b}`, answer: a + b };
  }
  if (art === 1) {
    const a = zufallsZahl(40, 99);
    const b = zufallsZahl(12, a - 5); // b immer deutlich kleiner als a, kein negatives Ergebnis
    return { frage: `${a} − ${b}`, answer: a - b };
  }
  const a = zufallsZahl(6, 9);
  const b = zufallsZahl(6, 9);
  return { frage: `${a} × ${b}`, answer: a * b };
}

export function ParentGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [stage, setStage] = useState<"hold" | "math">("hold");
  const [problem] = useState(randomMathProblem);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdComplete = useRef(false);

  // Korrektur (2026-09-04, gefunden beim ersten echten Test): Vorher lag hier ein
  // PanResponder auf der äußeren View UND ein separates Pressable (für den Halt) auf
  // einer verschachtelten inneren View. Im React-Native-Responder-System beansprucht
  // die INNERSTE Komponente unter dem Finger/Mauszeiger die "Responder"-Rolle zuerst —
  // das verschachtelte Pressable hat den PanResponder der äußeren View dadurch nie zum
  // Zug kommen lassen, seine Bewegungserkennung (onPanResponderMove/-Release) wurde nie
  // aufgerufen. Betraf jede Plattform, ist aber erst beim ersten echten Wisch-Test
  // aufgefallen. Fix: nur noch EIN Handler für die gesamte Halt+Wisch-Geste — der
  // PanResponder selbst übernimmt jetzt auch den Halt-Start (`onPanResponderGrant`,
  // das React-Native-Äquivalent zu Pressables `onPressIn`) statt eines eigenen,
  // konkurrierenden Pressable.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        holdComplete.current = false;
        holdTimer.current = setTimeout(() => {
          holdComplete.current = true;
        }, HOLD_DURATION_MS);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        // Wischen nur werten, wenn der 3-Sekunden-Halt vorher abgeschlossen wurde
        // UND eine tatsächliche Wischbewegung stattfand (kein bloßes Tippen).
        if (holdComplete.current && Math.abs(gesture.dx) > 60) {
          setStage("math");
        }
      },
      onPanResponderTerminate: () => {
        // Falls das Betriebssystem/der Browser den Responder abbricht (z. B. Wechsel
        // zu einem anderen Tab mitten im Halten) — Timer trotzdem sauber aufräumen.
        if (holdTimer.current) clearTimeout(holdTimer.current);
      },
    })
  ).current;

  function checkAnswer() {
    if (Number(input) === problem.answer) {
      onUnlocked();
    } else {
      setError(true);
      setInput("");
    }
  }

  if (stage === "hold") {
    return (
      <View style={[styles.container, webNoTextSelect]} {...panResponder.panHandlers}>
        <View style={[styles.holdArea, webNoTextSelect]}>
          <Text style={[styles.hint, webNoTextSelect]}>Für Eltern: 3 Sekunden halten, dann wischen</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Bitte löse zur Bestätigung:</Text>
      <Text style={styles.problem}>{problem.frage} = ?</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={(t) => {
          setInput(t.replace(/[^0-9]/g, ""));
          setError(false);
        }}
        keyboardType="number-pad"
        // 3 statt bisher 2 Stellen — die zweistellige Addition kann jetzt bis 166 gehen
        // (z. B. 89 + 77), siehe randomMathProblem() oben.
        maxLength={3}
        autoFocus
      />
      {error && <Text style={styles.error}>Nicht ganz — versuch's nochmal.</Text>}
      <Pressable style={styles.button} onPress={checkAnswer}>
        <Text style={styles.buttonText}>Bestätigen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F1E4", padding: 24 },
  holdArea: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 16, color: "#6B6255", textAlign: "center", marginBottom: 16 },
  problem: { fontSize: 32, fontWeight: "600", color: "#4A4038", marginBottom: 16 },
  input: {
    borderWidth: 2,
    borderColor: "#C9C2B0",
    borderRadius: 12,
    padding: 12,
    fontSize: 24,
    width: 100,
    textAlign: "center",
    marginBottom: 12,
  },
  error: { color: "#B5713C", marginBottom: 12 },
  button: { backgroundColor: "#9CB89A", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 16 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
