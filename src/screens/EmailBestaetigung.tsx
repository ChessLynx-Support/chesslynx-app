// Paket 5 (2026-09-11) — Double-Opt-In für Elternkonten (compliance_paket_2026-09-10.md,
// Abschnitt 1, COPPA „Email plus“; Entscheidung 2026-09-10: Double-Opt-In ist Launch-
// Voraussetzung). Der ElternBereichRouter schickt jedes angemeldete, aber noch nicht
// bestätigte Konto hierher. Erst nach der Bestätigung entsteht das Kinderprofil in der Cloud,
// laufen Sync und (später) Kauf. Bis dahin spielt das Kind ganz normal weiter — alles bleibt
// lokal auf dem Gerät.
//
// Erwachsenen-Screen (Fließtext wie ElternLogin.tsx), kein Lux-Sprechen. Kehrt die App aus
// dem Hintergrund zurück (Elternteil hat den Link in der Mail-App angetippt), prüft der
// Screen den Status von selbst.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  bestaetigungsMailErneutSenden,
  elternAbmelden,
  emailBestaetigungPruefen,
  unbestaetigtesKontoLoeschen,
  useAuthUser,
} from "../lib/auth";

const ERNEUT_SENDEN_SPERRE_S = 60;

export function EmailBestaetigung({ navigation }: any) {
  const { user } = useAuthUser();
  const [prueft, setPrueft] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sperreBis, setSperreBis] = useState(Date.now() + ERNEUT_SENDEN_SPERRE_S * 1000);
  const [jetzt, setJetzt] = useState(Date.now());
  const weitergeleitet = useRef(false);
  const [loeschOffen, setLoeschOffen] = useState(false);
  const [loeschPasswort, setLoeschPasswort] = useState("");
  const [loeschLaeuft, setLoeschLaeuft] = useState(false);

  async function kontoLoeschen() {
    setFehler(null);
    setLoeschLaeuft(true);
    try {
      await unbestaetigtesKontoLoeschen(loeschPasswort);
      navigation.replace("KidHome");
    } catch (e: any) {
      setFehler(
        e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential"
          ? "Das Passwort stimmt nicht."
          : "Löschen hat nicht geklappt. Bitte Internetverbindung prüfen."
      );
    } finally {
      setLoeschLaeuft(false);
    }
  }

  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function pruefen(stumm = false) {
    if (weitergeleitet.current) return;
    setFehler(null);
    if (!stumm) setPrueft(true);
    try {
      const bestaetigt = await emailBestaetigungPruefen();
      if (bestaetigt) {
        weitergeleitet.current = true;
        navigation.replace("ElternBereich");
        return;
      }
      if (!stumm) setHinweis("Noch nicht bestätigt. Bitte den Link in der E-Mail antippen und dann hierher zurückkommen.");
    } catch (e: any) {
      if (!stumm) setFehler(e?.code === "auth/network-request-failed" ? "Keine Verbindung. Bitte Internet prüfen." : "Prüfen hat nicht geklappt. Bitte gleich nochmal versuchen.");
    } finally {
      if (!stumm) setPrueft(false);
    }
  }

  // Zurück aus der Mail-App → automatisch prüfen.
  useEffect(() => {
    const abo = AppState.addEventListener("change", (zustand: string) => {
      if (zustand === "active") pruefen(true);
    });
    return () => abo.remove();
  }, []);

  async function erneutSenden() {
    setFehler(null);
    setHinweis(null);
    try {
      await bestaetigungsMailErneutSenden();
      setSperreBis(Date.now() + ERNEUT_SENDEN_SPERRE_S * 1000);
      setHinweis("Neue E-Mail ist unterwegs. Bitte auch im Spam-Ordner nachsehen.");
    } catch (e: any) {
      setFehler(
        e?.code === "auth/too-many-requests"
          ? "Gerade wurden schon mehrere E-Mails verschickt. Bitte ein paar Minuten warten."
          : "Senden hat nicht geklappt. Bitte Internetverbindung prüfen."
      );
    }
  }

  const restSekunden = Math.max(0, Math.ceil((sperreBis - jetzt) / 1000));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bitte bestätige deine E-Mail-Adresse</Text>
        <Text style={styles.body}>
          Wir haben dir eine E-Mail{user?.email ? ` an ${user.email}` : ""} geschickt. Tippe dort auf den
          Bestätigungslink — dann wird der Fortschritt deines Kindes in deinem Konto gesichert und der
          Eltern-Bereich öffnet sich.
        </Text>
        {/* Gerätetest 2026-09-12: Die Bestätigungsmail landete im Spam und kam verzögert
            (Greylisting beim Empfänger, weil SPF/DKIM des Standardabsenders
            `noreply@<projekt>.firebaseapp.com` Google gehören, nicht ChessLynx). Behoben wird
            das über den eigenen Absender `noreply@chesslynx.com` — siehe
            claude/auth_mails_eigene_domain_2026-09-12.md.
            Diese Zeile bleibt trotzdem dauerhaft stehen: Kein Absender der Welt kommt bei
            jedem Empfänger in den Posteingang, und eine ungefundene Bestätigungsmail ist bei
            ChessLynx kein Schönheitsfehler, sondern ein abgebrochenes Onboarding — ohne sie
            gibt es kein Kinderprofil in der Cloud, keinen Sync und keinen Kauf. */}
        <Text style={styles.nebentext}>
          Keine Mail bekommen? Schau bitte auch im Spam-Ordner nach.
        </Text>
        <Text style={styles.nebentext}>
          Bis dahin spielt dein Kind ganz normal weiter; der Fortschritt bleibt auf diesem Gerät.
        </Text>

        {hinweis ? <Text style={styles.info}>{hinweis}</Text> : null}
        {fehler ? <Text style={styles.error}>{fehler}</Text> : null}

        <Pressable style={styles.hauptButton} onPress={() => pruefen(false)} disabled={prueft}>
          {prueft ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.hauptButtonText}>Ich habe bestätigt</Text>}
        </Pressable>

        <Pressable style={styles.link} onPress={erneutSenden} disabled={restSekunden > 0}>
          <Text style={[styles.linkText, restSekunden > 0 && styles.linkGesperrt]}>
            {restSekunden > 0 ? `E-Mail erneut senden (in ${restSekunden} s)` : "E-Mail erneut senden"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.link}
          onPress={async () => {
            await elternAbmelden();
            navigation.replace("ElternLogin");
          }}
        >
          <Text style={styles.linkText}>Mit einer anderen Adresse anmelden</Text>
        </Pressable>

        <Pressable style={styles.link} onPress={() => navigation.replace("KidHome")}>
          <Text style={styles.linkText}>Zurück zum Spiel</Text>
        </Pressable>

        {/* Apple 5.1.1(v): Konto muss auch vor der Bestätigung löschbar sein. */}
        {!loeschOffen ? (
          <Pressable style={styles.link} onPress={() => setLoeschOffen(true)}>
            <Text style={styles.loeschLink}>Konto wieder löschen</Text>
          </Pressable>
        ) : (
          <View style={styles.loeschBox}>
            <Text style={styles.nebentext}>Zum Löschen bitte das Passwort eingeben. Der Spielstand auf diesem Gerät bleibt.</Text>
            <TextInput
              style={styles.input}
              placeholder="Passwort"
              placeholderTextColor="#A39C8D"
              secureTextEntry
              value={loeschPasswort}
              onChangeText={setLoeschPasswort}
            />
            <Pressable style={styles.loeschButton} onPress={kontoLoeschen} disabled={loeschLaeuft || !loeschPasswort}>
              {loeschLaeuft ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.hauptButtonText}>Konto endgültig löschen</Text>}
            </Pressable>
            <Pressable style={styles.link} onPress={() => setLoeschOffen(false)}>
              <Text style={styles.linkText}>Abbrechen</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1E4" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#4A4038", marginBottom: 12 },
  body: { fontSize: 15, color: "#4A4038", lineHeight: 22, marginBottom: 10 },
  nebentext: { fontSize: 13, color: "#6B6255", lineHeight: 19, marginBottom: 20 },
  info: { color: "#5C7A63", fontSize: 13, lineHeight: 18, marginBottom: 12 },
  error: { color: "#B0553A", fontSize: 13, marginBottom: 12 },
  hauptButton: {
    backgroundColor: "#C9855F",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  hauptButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 18, alignItems: "center" },
  linkText: { color: "#5C7A63", fontSize: 14, textDecorationLine: "underline" },
  linkGesperrt: { color: "#A39C8D", textDecorationLine: "none" },
  loeschLink: { color: "#B0553A", fontSize: 13, textDecorationLine: "underline" },
  loeschBox: { marginTop: 18, backgroundColor: "#E7E3D9", borderRadius: 12, padding: 14 },
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
  loeschButton: { backgroundColor: "#B0553A", paddingVertical: 12, borderRadius: 14, alignItems: "center" },
});
