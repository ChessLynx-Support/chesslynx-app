// Eltern-Gate gemäß konzept/technisches_konzept.md Abschnitt 6:
// 1. Erst 3 Sekunden halten + wischen, bevor überhaupt eine Eingabe erscheint
//    (verhindert zufälliges Antippen durch Kinder).
// 2. Dann eine einfache, zufällige Rechenaufgabe (z. B. "7 + 4") über ein Ziffernfeld.
// Rein clientseitige Logik, keine Backend-Abhängigkeit — bewusst kein Lese-Text nötig,
// da sich die Aufgabe an Eltern richtet (siehe Design-Dokument: "ohne Lesen" gilt nur
// für die Kind-UI, Eltern-Text ist explizit erlaubt).

import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, PanResponder, Platform } from "react-native";
// Sprach-Harmonie-Review (2026-09-09, Nutzerauftrag "prüfe alle Sprachteile von Lux
// nochmal auf Harmonie ... arbeite kindgerechte und sinnvolle Ergänzungen aus"): dieser
// Screen hatte bis dahin ausschließlich geschriebenen Text (siehe Datei-Kopfkommentar,
// "kein Lese-Text nötig ... Eltern-Text ist explizit erlaubt") — das beantwortet aber
// nicht, wie ein nicht lesefähiges Kind, das aus Neugier oder Versehen hierher tippt,
// überhaupt versteht, was gerade passiert. Apple empfiehlt für genau diesen Fall eine
// kurze Sprachansage (siehe claude/eltern_gate_sprachansage_entwurf.md im Claude-Projekt
// "ChessLynx", dort bereits abgestimmter, bis jetzt unumgesetzter Textentwurf) — die vier
// Zeilen unten sind 1:1 dieser Entwurf, jetzt tatsächlich verdrahtet.
import { sprich, stoppen } from "../lib/luxStimme";
// Update (2026-09-08, Claude-Projekt "ChessLynx", produktionsanleitung_elemente.md
// Abschnitt 7.2 "ParentGate-Fortschrittsring"): der bisherige "Bestätigen"-Pressable ist
// durch den gemeinsamen Button-Baukasten ersetzt (kein separater `Pressable`-Import mehr
// nötig, siehe Korrektur vom 2026-09-04 zum Halt-Bereich weiter unten).
import { ChessLynxButton } from "../components/ChessLynxButton";
// Neu: animierter Gold-Ring, der während der 3-Sekunden-Halte-Geste sichtbares Feedback
// gibt (vorher: rein textliche Anweisung, keinerlei Rückmeldung während des Haltens
// selbst — siehe visuelle_politur_buttons_grafiken.md, Priorität 1).
import { FortschrittsRing } from "../components/FortschrittsRing";

const HOLD_DURATION_MS = 3000;

// Sprach-Harmonie-Review (2026-09-09) — 1:1 aus eltern_gate_sprachansage_entwurf.md:
const ANSAGE_ERSTE_ZEILE =
  "Hoppla, das hier ist für die Erwachsenen! Hol dir schnell Mama, Papa oder eine andere erwachsene Person dazu.";
// Zweite, kürzere Erinnerung laut Entwurf "falls nach ein paar Sekunden noch nicht
// gehalten/gewischt wurde" — dasselbe 8-Sekunden-Zeitfenster wie die allgemeine
// Lux-Erinnerung anderswo in der App (ERINNERUNG_MS in useLuxSprechzeile.ts), damit sich
// Lux' Geduld überall gleich anfühlt. Bewusst nur EINMALIG (kein wiederholender Loop wie
// dort) — ein Erwachsener, der den Hinweis einmal gehört hat, braucht ihn nicht alle
// 8 Sekunden erneut.
const ANSAGE_ERINNERUNG = "Ist schon ein Erwachsener bei dir? Dann kann er jetzt hier halten und wischen.";
const ANSAGE_UEBERLEITUNG_RECHENAUFGABE = "Fast geschafft. Nur noch eine kleine Rechenaufgabe.";
const ANSAGE_FALSCHE_ANTWORT = "Das war noch nicht ganz richtig. Einfach nochmal versuchen.";
const ERINNERUNG_MS = 8000;

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
  // Treibt den FortschrittsRing (siehe Import-Kommentar oben) — true genau während der
  // Finger/Maustaste unten ist, unabhängig davon, ob der Halt am Ende lang genug war.
  const [isHolding, setIsHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdComplete = useRef(false);

  // Sprach-Harmonie-Review (2026-09-09, siehe Konstanten/Import-Kommentare oben): die
  // erste Ansage läuft einmalig beim Öffnen dieses Screens, unabhängig vom Halt-Fortschritt.
  useEffect(() => {
    sprich(ANSAGE_ERSTE_ZEILE);
    return () => stoppen();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur einmal beim Mounten
  }, []);

  // Zweite, kürzere Erinnerung (siehe Konstanten-Kommentar oben) — nur wenn nach
  // ERINNERUNG_MS weiterhin nicht gehalten/gewischt wurde.
  useEffect(() => {
    if (stage !== "hold") return;
    const timer = setTimeout(() => {
      if (!holdComplete.current) sprich(ANSAGE_ERINNERUNG);
    }, ERINNERUNG_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  // Überleitung zur Rechenaufgabe, sobald der Halt+Wisch geschafft ist.
  useEffect(() => {
    if (stage === "math") sprich(ANSAGE_UEBERLEITUNG_RECHENAUFGABE);
  }, [stage]);

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
        setIsHolding(true);
        holdTimer.current = setTimeout(() => {
          holdComplete.current = true;
        }, HOLD_DURATION_MS);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        setIsHolding(false);
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
        setIsHolding(false);
      },
    })
  ).current;

  function checkAnswer() {
    if (Number(input) === problem.answer) {
      onUnlocked();
    } else {
      setError(true);
      setInput("");
      sprich(ANSAGE_FALSCHE_ANTWORT);
    }
  }

  if (stage === "hold") {
    return (
      <View style={[styles.container, webNoTextSelect]} {...panResponder.panHandlers}>
        <View style={[styles.holdArea, webNoTextSelect]}>
          <FortschrittsRing active={isHolding} durationMs={HOLD_DURATION_MS} size={140} />
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
      {/* Update (2026-09-08, Nutzerwunsch): testweiser Einsatz der Mockup-Richtung B
          ("Aquarell-Blatt-Form", produktionsanleitung_elemente.md Abschnitt 7.5) im
          Eltern-Kontext dieses Screens. */}
      <ChessLynxButton variante="secondary" textur="aquarell" onPress={checkAnswer} accessibilityLabel="Bestätigen">
        Bestätigen
      </ChessLynxButton>
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
});
