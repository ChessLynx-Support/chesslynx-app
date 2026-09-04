// Eltern-Gate gemäß konzept/technisches_konzept.md Abschnitt 6:
// 1. Erst 3 Sekunden halten + wischen, bevor überhaupt eine Eingabe erscheint
//    (verhindert zufälliges Antippen durch Kinder).
// 2. Dann eine einfache, zufällige Rechenaufgabe (z. B. "7 + 4") über ein Ziffernfeld.
// Rein clientseitige Logik, keine Backend-Abhängigkeit — bewusst kein Lese-Text nötig,
// da sich die Aufgabe an Eltern richtet (siehe Design-Dokument: "ohne Lesen" gilt nur
// für die Kind-UI, Eltern-Text ist explizit erlaubt).

import { useRef, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, PanResponder } from "react-native";

const HOLD_DURATION_MS = 3000;

function randomMathProblem() {
  const a = Math.floor(Math.random() * 6) + 3; // 3..8
  const b = Math.floor(Math.random() * 6) + 2; // 2..7
  return { a, b, answer: a + b };
}

export function ParentGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [stage, setStage] = useState<"hold" | "math">("hold");
  const [problem] = useState(randomMathProblem);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdComplete = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, gesture) => {
        // Wischen nur werten, wenn der 3-Sekunden-Halt vorher abgeschlossen wurde
        // UND eine tatsächliche Wischbewegung stattfand (kein bloßes Tippen).
        if (holdComplete.current && Math.abs(gesture.dx) > 60) {
          setStage("math");
        }
      },
    })
  ).current;

  function handlePressIn() {
    holdComplete.current = false;
    holdTimer.current = setTimeout(() => {
      holdComplete.current = true;
    }, HOLD_DURATION_MS);
  }

  function handlePressOut() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }

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
      <View style={styles.container} {...panResponder.panHandlers}>
        <Pressable
          style={styles.holdArea}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Text style={styles.hint}>Für Eltern: 3 Sekunden halten, dann wischen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Bitte löse zur Bestätigung:</Text>
      <Text style={styles.problem}>
        {problem.a} + {problem.b} = ?
      </Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={(t) => {
          setInput(t.replace(/[^0-9]/g, ""));
          setError(false);
        }}
        keyboardType="number-pad"
        maxLength={2}
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
