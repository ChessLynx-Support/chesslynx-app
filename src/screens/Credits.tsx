// Lizenzhinweise / App-Credits gemäß projektwissen.md ("Eltern-Bereich & Rechtliches")
// und priorisierter_umsetzungsplan.md (Phase 1): Cburnett-Schachfiguren-Set und chess.js
// brauchen beide eine sichtbare Attribution. Vollständiger, ausführlicherer Lizenztext
// (inkl. Vorbehalt zur exakten chess.js-LICENSE-Datei) siehe NOTICE.md im Projekt-Root —
// dieser Screen zeigt die für Endnutzer relevante Kurzfassung.
//
// Bewusst ein reiner Erwachsenen-/Rechts-Screen (Fließtext erlaubt): anders als die
// Kind-Oberfläche, die laut Design-Grundsätzen textfrei bleiben muss, richtet sich
// dieser Screen an Eltern/Store-Prüfer, nicht an das Kind selbst.
//
// Copyright-Hinweis (ergänzt 2026-09-07, auf Nutzerwunsch, ergänzend zum Wasserzeichen —
// siehe wasserzeichen_und_bewegungsanimationen.md im Claude-Projekt): eigener, klar
// sichtbarer Absatz, der den urheberrechtlichen Anspruch auf die selbst erstellten
// Illustrationen/Charaktere (Lux, die sechs Quest-Tiere, Logo) explizit benennt —
// unabhängig von den unten aufgeführten DRITTLIZENZEN (Cburnett/chess.js), die im
// Gegenteil gerade NICHT ChessLynx gehören und deshalb per CC-BY-SA/BSD attributiert
// werden müssen.

import { ScrollView, Text, StyleSheet, Pressable } from "react-native";

export function Credits({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Lizenzen &amp; Credits</Text>

      <Text style={styles.sectionTitle}>Urheberrecht</Text>
      <Text style={styles.body}>
        © {new Date().getFullYear()} CMZen Digital (Christian Mäusezahl). Das Maskottchen
        „Lux", alle Wald-/Quest-Tier-Illustrationen sowie das ChessLynx-Logo sind eigens für
        diese App erstellt und urheberrechtlich bzw. markenrechtlich geschützt. Jede
        Vervielfältigung, Bearbeitung oder Weiterverwendung außerhalb der App — auch
        auszugsweise — ist ohne vorherige schriftliche Zustimmung von CMZen Digital nicht
        gestattet.
      </Text>

      <Text style={styles.sectionTitle}>Schachfiguren-Illustrationen</Text>
      <Text style={styles.body}>
        Die Schachfiguren-Grafiken (ab dem Verwandlungsmoment in jeder Quest) stammen
        vom Cburnett-Schachfiguren-Set von Colin M. L. Burnett, Wikimedia Commons,
        lizenziert unter Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0).
        Original-Pfaddaten und -Farben wurden unverändert übernommen.
      </Text>
      <Text style={styles.link}>creativecommons.org/licenses/by-sa/3.0</Text>

      <Text style={styles.sectionTitle}>Schach-Zuglogik</Text>
      <Text style={styles.body}>
        Die Berechnung der erlaubten Züge basiert auf der Bibliothek chess.js von Jeff
        Hlywa, lizenziert unter der BSD-2-Clause-Lizenz.
      </Text>
      <Text style={styles.link}>github.com/jhlywa/chess.js</Text>

      <Text style={styles.footnote}>
        Vollständige Lizenztexte: siehe NOTICE.md im Projekt-Repository.
      </Text>

      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Zurück</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1E4" },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700", color: "#4A4038", marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A4038",
    marginTop: 16,
    marginBottom: 6,
  },
  body: { fontSize: 14, color: "#6B6255", lineHeight: 20 },
  link: { fontSize: 13, color: "#8FA888", marginTop: 4 },
  footnote: { fontSize: 12, color: "#A39C8D", marginTop: 28 },
  backButton: {
    marginTop: 28,
    alignSelf: "flex-start",
    backgroundColor: "#C9855F",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
