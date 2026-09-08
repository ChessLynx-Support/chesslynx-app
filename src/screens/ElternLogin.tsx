// Eltern-Konto-Login/-Registrierung (E-Mail/Passwort) — Ziel von ElternBereichRouter
// in RootNavigator.tsx, wenn nach dem Eltern-Gate noch kein Elternkonto angemeldet
// ist. Bewusst ein reiner Erwachsenen-/Rechts-Screen mit Fließtext (wie Credits.tsx)
// — die Kind-Oberfläche bleibt davon komplett unberührt, das Kind sieht diesen
// Screen nie (siehe Design-Grundsätze in projektwissen.md: textfrei nur für den
// Kindbereich, nicht für Eltern-/Rechts-Screens).
//
// ACHTUNG: Funktioniert erst mit einem echten Firebase-Projekt (siehe firebase.ts) —
// mit der aktuellen Platzhalter-Config zeigt jeder Versuch unten die Fehlermeldung
// aus `uebersetzeFirebaseFehler()` an, statt die App abstürzen zu lassen.
//
// Update (Nutzer-Feedback 2026-09-07): Die Einwilligung zu Datenschutzerklärung/
// Nutzungsbedingungen wurde bisher erst im ParentDashboard abgefragt (siehe dortiger
// "Datenschutz & Einwilligung"-Abschnitt) — ein Elternteil konnte die App also bereits
// eine Weile nutzen, bevor diese Bestätigung überhaupt auftauchte. Auf ausdrücklichen
// Wunsch wird die Zustimmung jetzt direkt hier, im selben Schritt wie die Konto-
// erstellung, verbindlich eingeholt (eigener, optisch abgesetzter grauer Block unten,
// „Konto erstellen" bleibt gesperrt, bis zugestimmt wurde). Verwendet bewusst dieselbe
// `CONSENT_VERSION`/`einwilligungVersion`-Ablage wie ParentDashboard.tsx, damit beide
// Stellen denselben Zustimmungs-Nachweis fortschreiben statt zwei parallele Stände zu
// erzeugen — der Re-Consent-Fallback im Dashboard (falls sich der Text künftig ändert)
// bleibt dadurch unverändert nutzbar, betrifft dann nur noch ältere Konten.

// Update (Nutzer-Feedback 2026-09-07, siehe auch ParentDashboard.tsx): Dieser Screen
// wird ebenfalls per navigation.replace erreicht (siehe ElternBereichRouter in
// RootNavigator.tsx) — auf iOS/Android funktioniert Zurück-Geste/Hardware-Taste daher
// bereits ohne Zusatzcode, nur auf Web/Desktop fehlt jede sichtbare Möglichkeit, den
// Screen zu verlassen. Gleicher schlanker Fix wie dort: ein kleiner Zurück-Link, nur
// auf Web sichtbar, statt eines dauerhaften Buttons.
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { elternAnmelden, elternKontoErstellen } from "../lib/auth";
import { CONSENT_VERSION } from "../lib/firebase";
import { speichereElternEinstellungen } from "../lib/elternEinstellungen";

// Passwort-Richtlinie für NEUE Elternkonten (2026-09-04, auf Nutzerwunsch verschärft —
// vorher reichte Firebases Minimum von 6 Zeichen ohne weitere Anforderung). Gilt bewusst
// nur bei der Registrierung, nicht beim Anmelden: ein bestehendes Konto mit einem älteren,
// einfacheren Passwort muss weiterhin funktionieren, ohne dass die Person ihr Passwort
// ändern muss, nur weil sich die Richtlinie später verschärft hat.
const PASSWORT_MIN_LAENGE = 8;

function fehlendePasswortAnforderungen(passwort: string): string[] {
  const fehlt: string[] = [];
  if (passwort.length < PASSWORT_MIN_LAENGE) fehlt.push(`mind. ${PASSWORT_MIN_LAENGE} Zeichen`);
  if (!/[A-ZÄÖÜ]/.test(passwort)) fehlt.push("einen Großbuchstaben");
  if (!/[0-9]/.test(passwort)) fehlt.push("eine Zahl");
  if (!/[^A-Za-z0-9]/.test(passwort)) fehlt.push("ein Sonderzeichen");
  return fehlt;
}

export function ElternLogin({ navigation }: any) {
  const [modus, setModus] = useState<"anmelden" | "registrieren">("anmelden");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [kindNickname, setKindNickname] = useState("");
  const [consentAkzeptiert, setConsentAkzeptiert] = useState(false);
  const [ladend, setLadend] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden() {
    if (!email.trim()) {
      setFehler("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (modus === "registrieren") {
      const fehlt = fehlendePasswortAnforderungen(passwort);
      if (fehlt.length > 0) {
        setFehler(`Das Passwort braucht noch: ${fehlt.join(", ")}.`);
        return;
      }
      if (!consentAkzeptiert) {
        setFehler("Bitte bestätige die Datenschutzerklärung und die Nutzungsbedingungen, um ein Konto zu erstellen.");
        return;
      }
    } else if (!passwort) {
      setFehler("Bitte dein Passwort eingeben.");
      return;
    }
    setFehler(null);
    setLadend(true);
    try {
      if (modus === "registrieren") {
        const neuerUser = await elternKontoErstellen(email, passwort);
        // Zustimmung sofort mit derselben Ablage wie ParentDashboard.tsx protokollieren
        // (Zeitstempel + Textversion, siehe datenschutz_store_pruefung.md). Bewusst in
        // einem eigenen try/catch: ein Netzwerkhänger genau hier soll die bereits
        // erfolgreiche Kontoerstellung nicht verhindern — ParentDashboard fragt die
        // Bestätigung notfalls einfach erneut ab (bestehender Re-Consent-Fallback).
        try {
          await speichereElternEinstellungen(neuerUser.uid, {
            einwilligungErteiltAm: Date.now(),
            einwilligungVersion: CONSENT_VERSION,
          });
        } catch (consentFehler) {
          console.warn("ElternLogin: Einwilligung bei Registrierung nicht gespeichert:", consentFehler);
        }
        // Das neue Kinderprofil wird erst im ElternBereichRouter angelegt (dort läuft
        // ohnehin schon getOrCreateAktivesKindId für den Anmelden-Fall) — der hier
        // eingegebene Nickname wird als Routenparameter mitgegeben, siehe unten.
        navigation.replace("ElternBereich", { kindNicknameFallsNeu: kindNickname });
      } else {
        await elternAnmelden(email, passwort);
        navigation.replace("ElternBereich");
      }
    } catch (e: any) {
      setFehler(uebersetzeFirebaseFehler(e?.code));
    } finally {
      setLadend(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.content}>
        {Platform.OS === "web" && (
          <Pressable onPress={() => navigation.replace("KidHome")} hitSlop={8}>
            <Text style={styles.zurueckLink}>&larr; Zurück zum Spiel</Text>
          </Pressable>
        )}
        <Text style={styles.title}>{modus === "anmelden" ? "Eltern-Anmeldung" : "Elternkonto erstellen"}</Text>
        <Text style={styles.subtitle}>
          {modus === "anmelden"
            ? "Melde dich mit deinem Elternkonto an, um Fortschritt, Zeitlimit und Einstellungen zu verwalten."
            : "Ein Elternkonto verwaltet den Fortschritt deines Kindes. Dein Kind braucht dafür keinen eigenen Login."}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="E-Mail-Adresse"
          placeholderTextColor="#A39C8D"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={modus === "registrieren" ? "Neues Passwort" : "Passwort"}
          placeholderTextColor="#A39C8D"
          secureTextEntry
          value={passwort}
          onChangeText={setPasswort}
        />
        {modus === "registrieren" && (
          <Text style={styles.passwortHinweis}>
            Mind. 8 Zeichen, mit Großbuchstabe, Zahl und Sonderzeichen.
          </Text>
        )}
        {modus === "registrieren" && (
          <TextInput
            style={styles.input}
            placeholder="Name/Spitzname deines Kindes"
            placeholderTextColor="#A39C8D"
            value={kindNickname}
            onChangeText={setKindNickname}
          />
        )}

        {modus === "registrieren" && (
          <View style={styles.consentBox}>
            <Text style={styles.consentText}>
              Bevor du ein Konto erstellst, lies bitte die Datenschutzerklärung und die
              Nutzungsbedingungen.
            </Text>
            <Pressable onPress={() => Linking.openURL("https://www.chesslynx.de/datenschutz")}>
              <Text style={styles.consentLink}>Datenschutzerklärung ansehen</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL("https://www.chesslynx.de/nutzungsbedingungen")}>
              <Text style={styles.consentLink}>Nutzungsbedingungen ansehen</Text>
            </Pressable>
            <View style={styles.consentZeile}>
              <Switch
                value={consentAkzeptiert}
                onValueChange={setConsentAkzeptiert}
                accessibilityLabel="Datenschutzerklärung und Nutzungsbedingungen akzeptieren"
              />
              <Text style={styles.consentZeileText}>
                Ich habe die Datenschutzerklärung und die Nutzungsbedingungen gelesen und
                stimme zu.
              </Text>
            </View>
          </View>
        )}

        {fehler ? <Text style={styles.error}>{fehler}</Text> : null}

        <Pressable
          style={[
            styles.submitButton,
            modus === "registrieren" && !consentAkzeptiert && styles.submitButtonGesperrt,
          ]}
          onPress={absenden}
          disabled={ladend || (modus === "registrieren" && !consentAkzeptiert)}
        >
          {ladend ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{modus === "anmelden" ? "Anmelden" : "Konto erstellen"}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.switchModeLink}
          onPress={() => {
            setFehler(null);
            setModus(modus === "anmelden" ? "registrieren" : "anmelden");
          }}
        >
          <Text style={styles.switchModeLinkText}>
            {modus === "anmelden" ? "Noch kein Konto? Jetzt erstellen." : "Bereits ein Konto? Jetzt anmelden."}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function uebersetzeFirebaseFehler(code?: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Diese E-Mail-Adresse ist ungültig.";
    case "auth/email-already-in-use":
      return "Für diese E-Mail-Adresse existiert bereits ein Konto — stattdessen anmelden?";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach (mind. 8 Zeichen, Großbuchstabe, Zahl, Sonderzeichen).";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-Mail-Adresse oder Passwort ist falsch.";
    case "auth/network-request-failed":
      return "Keine Verbindung möglich. Bitte Internetverbindung prüfen.";
    default:
      return `Etwas ist schiefgelaufen, bitte später erneut versuchen.${code ? ` (${code})` : ""}`;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1E4" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#4A4038", marginBottom: 8 },
  zurueckLink: { fontSize: 14, color: "#5C7A63", marginBottom: 16 },
  subtitle: { fontSize: 14, color: "#6B6255", lineHeight: 20, marginBottom: 24 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#4A4038",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4DCC8",
  },
  passwortHinweis: { fontSize: 12, color: "#9A9282", marginTop: -6, marginBottom: 12 },
  // Bewusst grau statt der sonstigen Creme-/Akzentfarben der App (Nutzerwunsch,
  // 2026-09-07) — hebt den zustimmungspflichtigen Block optisch klar von den übrigen
  // Formularfeldern ab, ähnlich wie `consentBox` in ParentDashboard.tsx (dort auf
  // demselben neutralen Ton aufgebaut, keine neue Farbe in die Palette eingeführt).
  consentBox: {
    backgroundColor: "#E7E3D9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  consentText: { fontSize: 13, color: "#4A4038", lineHeight: 18, marginBottom: 8 },
  consentLink: { fontSize: 13, color: "#5C7A63", textDecorationLine: "underline", marginBottom: 4 },
  consentZeile: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
  consentZeileText: { flex: 1, fontSize: 13, color: "#4A4038", lineHeight: 18 },
  error: { color: "#B0553A", fontSize: 13, marginBottom: 12 },
  submitButton: {
    backgroundColor: "#C9855F",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonGesperrt: { backgroundColor: "#D9C2AE" },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  switchModeLink: { marginTop: 20, alignItems: "center" },
  switchModeLinkText: { color: "#8FA888", fontSize: 14, textDecorationLine: "underline" },
});
