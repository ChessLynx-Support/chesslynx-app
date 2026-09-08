// Eltern-Dashboard — vollständige Umsetzung des mit Christian abgestimmten und
// unabhängig gegengeprüften Entwurfs (Claude-Projekt "ChessLynx", Dokument
// "ChessLynx_ParentDashboard_Entwurf", Stand 2026-09-06). Ersetzt den bisherigen
// `ParentDashboardPlaceholder` in RootNavigator.tsx.
//
// Reiner Erwachsenen-/Rechts-Screen mit Fließtext (wie Credits.tsx/ElternLogin.tsx) —
// die textfreie Kind-Oberfläche ist davon unberührt, das Kind sieht diesen Screen nie
// (Eltern-Gate ist vorgeschaltet, siehe RootNavigator.tsx).
//
// Bewusste Scope-Grenzen dieses Umsetzungsschritts (jeweils im Code unten markiert):
// - Der In-App-Kauf selbst (Store-Anbindung, Restore Purchases) ist noch nicht gebaut
//   — dieser Screen zeigt bereits Preis/Umfang, aber keinen funktionsfähigen Kauf-Button.
// - Die Konto-Löschung löscht Firestore-Daten und den Auth-Nutzer client-seitig; eine
//   serverseitig garantiert verknüpfte Löschung (Cloud Function) ist laut Entwurf eine
//   spätere, in sich geschlossene Ausbaustufe.
// - Die Frage, ob der Einwilligungs-Nachweis anonymisiert über eine Kontolöschung hinaus
//   aufbewahrt werden soll, ist im Entwurf selbst als offener Punkt für die geplante
//   Datenschutz-Fachperson-Prüfung markiert — hier bewusst NICHT vorweggenommen: die
//   Löschung entfernt den Nachweis vollständig, siehe `kontoEndgueltigLoeschen` unten.

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, deleteDoc, doc, getDoc, getDocs } from "firebase/firestore";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { elternAbmelden, useAuthUser } from "../lib/auth";
import { getOrCreateAktivesKindId } from "../lib/storage";
import {
  CONSENT_VERSION,
  db,
  elternEinstellungenPfad,
  kinderCollectionPfad,
  kindProfilPfad,
  type ElternEinstellungen,
  type KindProfil,
} from "../lib/firebase";
import { ladeElternEinstellungen, speichereElternEinstellungen } from "../lib/elternEinstellungen";
import {
  ZEITLIMIT_KEIN_LIMIT,
  ZEITLIMIT_PRESETS,
  gewaehreBonusHeute,
  leseHeutigeNutzung,
  leseTaeglichesZeitlimit,
  setzeTaeglichesZeitlimit,
} from "../lib/zeitlimit";
// Echter Eltern-Dashboard-Schalter für die geschriebenen Untertitel (siehe
// priorisierter_umsetzungsplan.md) — löst die frühere feste ZEIGE_UNTERTITEL-Konstante
// in luxStimme.ts ab. Bewusst rein lokal (kein Firestore-Feld), siehe Begründung in
// untertitelEinstellung.ts: Quest1.tsx–Quest6.tsx laufen offline-first und lesen den
// Wert direkt vom Gerät.
import {
  UNTERTITEL_STANDARD,
  leseUntertitelAktiv,
  setzeUntertitelAktiv,
} from "../lib/untertitelEinstellung";
// Manuelle Stimmauswahl mit Vorhören (Nutzer-Feedback 2026-09-08: "möchte eine andere
// Stimme haben, der Computer-Ton ist unangenehm") — siehe stimmeAuswahl.ts für die
// ausführliche Begründung. Ergänzt (nicht ersetzt) die automatische Bestenauswahl in
// luxStimme.ts, die vor allem im Browser am PC praktisch wirkungslos ist.
import {
  type StimmenOption,
  leseBevorzugteStimmeId,
  listeDeutscheStimmen,
  setzeBevorzugteStimmeId,
  stimmeVorhoeren,
  vorhoerenStoppen,
} from "../lib/stimmeAuswahl";

// Muss mit AKTIVES_KIND_ID_KEY_PREFIX in lib/storage.ts übereinstimmen (dort nicht
// exportiert) — nur hier gebraucht, um den lokalen Cache bei einer Kontolöschung
// sauber zu leeren, damit ein neu registriertes Konto auf demselben Gerät nicht
// versehentlich die alte Kind-ID wiederverwendet.
const AKTIVES_KIND_ID_KEY_PREFIX = "chesslynx:aktivesKindId:";
const EINFUEHRUNG_GEZEIGT_KEY = "chesslynx:dashboardEinfuehrungGezeigt";

// Reihenfolge der Grundfiguren-Quests, wie im geprüften Entwurf abgebildet (Bauer →
// Springer → Läufer → Turm → Dame → König). Gegen Quest1.tsx/Quest6.tsx verifiziert
// (beide rufen `saveQuestFortschrittLocal("quest1"/"quest6", …)` auf): `questFortschritt`
// ist tatsächlich mit den Schlüsseln "quest1".."quest6" belegt, passend zur
// Freischaltungs-Reihenfolge in KidHome (RootNavigator.tsx).
const FIGUR_REIHENFOLGE = [
  { questId: "quest1", name: "Bauer" },
  { questId: "quest2", name: "Springer" },
  { questId: "quest3", name: "Läufer" },
  { questId: "quest4", name: "Turm" },
  { questId: "quest5", name: "Dame" },
  { questId: "quest6", name: "König" },
] as const;

// Passwort-Richtlinie — muss mit ElternLogin.tsx übereinstimmen (dort nicht exportiert).
const PASSWORT_MIN_LAENGE = 8;
function fehlendePasswortAnforderungen(passwort: string): string[] {
  const fehlt: string[] = [];
  if (passwort.length < PASSWORT_MIN_LAENGE) fehlt.push(`mind. ${PASSWORT_MIN_LAENGE} Zeichen`);
  if (!/[A-ZÄÖÜ]/.test(passwort)) fehlt.push("einen Großbuchstaben");
  if (!/[0-9]/.test(passwort)) fehlt.push("eine Zahl");
  if (!/[^A-Za-z0-9]/.test(passwort)) fehlt.push("ein Sonderzeichen");
  return fehlt;
}

function uebersetzeFirebaseFehlerKonto(code?: string): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Das Passwort ist falsch.";
    case "auth/email-already-in-use":
      return "Für diese E-Mail-Adresse existiert bereits ein anderes Konto.";
    case "auth/invalid-email":
      return "Diese E-Mail-Adresse ist ungültig.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach (mind. 8 Zeichen, Großbuchstabe, Zahl, Sonderzeichen).";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
    case "auth/network-request-failed":
      return "Keine Verbindung möglich. Bitte Internetverbindung prüfen.";
    case "auth/requires-recent-login":
      return "Bitte melde dich ab und erneut an, bevor du diese Änderung vornimmst.";
    default:
      return `Etwas ist schiefgelaufen, bitte später erneut versuchen.${code ? ` (${code})` : ""}`;
  }
}

function relativerZeitpunkt(zeitstempel: number): string {
  const heuteStr = new Date().toISOString().slice(0, 10);
  const dannStr = new Date(zeitstempel).toISOString().slice(0, 10);
  if (heuteStr === dannStr) return "heute";
  const tageDiff = Math.round(
    (new Date(heuteStr).getTime() - new Date(dannStr).getTime()) / 86400000
  );
  if (tageDiff === 1) return "gestern";
  if (tageDiff > 1) return `vor ${tageDiff} Tagen`;
  return "heute";
}

function formatDatumUhrzeit(zeitstempel: number): string {
  const d = new Date(zeitstempel);
  return `${d.toLocaleDateString("de-DE")} um ${d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

export function ParentDashboard({ navigation }: any) {
  const { user } = useAuthUser();

  const [laedt, setLaedt] = useState(true);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [kindProfil, setKindProfil] = useState<KindProfil | null>(null);
  const [einstellungen, setEinstellungen] = useState<ElternEinstellungen | null>(null);
  const [taeglichesLimit, setTaeglichesLimit] = useState(15);
  const [heutigeNutzung, setHeutigeNutzung] = useState({ minutenGenutzt: 0, bonusMinuten: 0 });
  const [einfuehrungSichtbar, setEinfuehrungSichtbar] = useState(false);
  const [untertitelAktiv, setUntertitelAktivState] = useState(UNTERTITEL_STANDARD);

  const [stimmenLaden, setStimmenLaden] = useState(true);
  const [verfuegbareStimmen, setVerfuegbareStimmen] = useState<StimmenOption[]>([]);
  const [bevorzugteStimmeId, setBevorzugteStimmeIdState] = useState<string | undefined>(undefined);

  const [consentLaeuft, setConsentLaeuft] = useState(false);
  const [consentFehler, setConsentFehler] = useState<string | null>(null);

  const [emailFormSichtbar, setEmailFormSichtbar] = useState(false);
  const [emailPasswort, setEmailPasswort] = useState("");
  const [neueEmail, setNeueEmail] = useState("");
  const [emailFehler, setEmailFehler] = useState<string | null>(null);
  const [emailLaeuft, setEmailLaeuft] = useState(false);

  const [passwortFormSichtbar, setPasswortFormSichtbar] = useState(false);
  const [aktuellesPasswort, setAktuellesPasswort] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [passwortFehler, setPasswortFehler] = useState<string | null>(null);
  const [passwortLaeuft, setPasswortLaeuft] = useState(false);

  const [loeschSchritt, setLoeschSchritt] = useState<0 | 1 | 2>(0);
  const [loeschPasswort, setLoeschPasswort] = useState("");
  const [loeschFehler, setLoeschFehler] = useState<string | null>(null);
  const [loeschLaeuft, setLoeschLaeuft] = useState(false);

  useEffect(() => {
    if (!user) return;
    let abgebrochen = false;
    (async () => {
      try {
        const kindId = await getOrCreateAktivesKindId(user.uid);
        const [kindSnap, geladeneEinstellungen, limit, nutzung, einfuehrungGezeigt, untertitel] =
          await Promise.all([
            getDoc(doc(db, kindProfilPfad(user.uid, kindId))),
            ladeElternEinstellungen(user.uid),
            leseTaeglichesZeitlimit(),
            leseHeutigeNutzung(),
            AsyncStorage.getItem(EINFUEHRUNG_GEZEIGT_KEY),
            leseUntertitelAktiv(),
          ]);
        if (abgebrochen) return;
        setKindProfil(kindSnap.exists() ? (kindSnap.data() as KindProfil) : null);
        setEinstellungen(geladeneEinstellungen);
        setTaeglichesLimit(limit);
        setHeutigeNutzung(nutzung);
        setUntertitelAktivState(untertitel);
        if (!einfuehrungGezeigt) {
          setEinfuehrungSichtbar(true);
          // Wird sofort als "gezeigt" markiert (nicht erst beim Verlassen des Screens) —
          // laut Entwurf soll die Unterzeile "nach dem ersten Besuch" verschwinden.
          await AsyncStorage.setItem(EINFUEHRUNG_GEZEIGT_KEY, "1");
        }
      } catch (fehler) {
        if (!abgebrochen) {
          setLadeFehler("Deine Daten konnten nicht geladen werden. Bitte Internetverbindung prüfen.");
        }
        console.warn("ParentDashboard: Laden fehlgeschlagen:", fehler);
      } finally {
        if (!abgebrochen) setLaedt(false);
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [user?.uid]);

  // Stimmauswahl: unabhängig vom Firestore-Laden oben (braucht keinen Nutzer/Firebase,
  // nur die Geräte-/Browser-eigene Stimmenliste + die lokal gespeicherte Wahl) — deshalb
  // ein eigener Effekt, der auch dann noch anläuft, wenn das Firestore-Laden oben mit
  // ladeFehler abbricht.
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [stimmen, gewaehlteId] = await Promise.all([listeDeutscheStimmen(), leseBevorzugteStimmeId()]);
      if (abgebrochen) return;
      setVerfuegbareStimmen(stimmen);
      setBevorzugteStimmeIdState(gewaehlteId);
      setStimmenLaden(false);
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  // Ein Verlassen des Eltern-Bereichs während des Vorhörens soll die Beispielzeile nicht
  // im Hintergrund weiterlaufen lassen.
  useEffect(() => {
    return () => {
      vorhoerenStoppen();
    };
  }, []);

  async function waehleZeitlimit(minuten: number) {
    setTaeglichesLimit(minuten);
    await setzeTaeglichesZeitlimit(minuten);
  }

  async function bonusHeuteGewaehren() {
    await gewaehreBonusHeute();
    setHeutigeNutzung(await leseHeutigeNutzung());
  }

  async function untertitelUmschalten(wert: boolean) {
    setUntertitelAktivState(wert);
    await setzeUntertitelAktiv(wert);
  }

  async function stimmeAuswaehlen(id: string | undefined) {
    setBevorzugteStimmeIdState(id);
    await setzeBevorzugteStimmeId(id);
  }

  async function einwilligungBestaetigen() {
    if (!user) return;
    setConsentFehler(null);
    setConsentLaeuft(true);
    try {
      const jetzt = Date.now();
      await speichereElternEinstellungen(user.uid, {
        einwilligungErteiltAm: jetzt,
        einwilligungVersion: CONSENT_VERSION,
      });
      setEinstellungen((vorher) =>
        vorher ? { ...vorher, einwilligungErteiltAm: jetzt, einwilligungVersion: CONSENT_VERSION } : vorher
      );
    } catch (fehler) {
      setConsentFehler("Einwilligung konnte nicht gespeichert werden. Bitte erneut versuchen.");
      console.warn("ParentDashboard: Einwilligung speichern fehlgeschlagen:", fehler);
    } finally {
      setConsentLaeuft(false);
    }
  }

  async function emailAendern() {
    if (!user || !user.email) return;
    setEmailFehler(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(neueEmail.trim())) {
      setEmailFehler("Bitte eine gültige neue E-Mail-Adresse eingeben.");
      return;
    }
    setEmailLaeuft(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, emailPasswort));
      await updateEmail(user, neueEmail.trim());
      setEmailFormSichtbar(false);
      setEmailPasswort("");
      setNeueEmail("");
    } catch (fehler: any) {
      setEmailFehler(uebersetzeFirebaseFehlerKonto(fehler?.code));
    } finally {
      setEmailLaeuft(false);
    }
  }

  async function passwortAendern() {
    if (!user || !user.email) return;
    setPasswortFehler(null);
    const fehlt = fehlendePasswortAnforderungen(neuesPasswort);
    if (fehlt.length > 0) {
      setPasswortFehler(`Das neue Passwort braucht noch: ${fehlt.join(", ")}.`);
      return;
    }
    setPasswortLaeuft(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, aktuellesPasswort));
      await updatePassword(user, neuesPasswort);
      setPasswortFormSichtbar(false);
      setAktuellesPasswort("");
      setNeuesPasswort("");
    } catch (fehler: any) {
      setPasswortFehler(uebersetzeFirebaseFehlerKonto(fehler?.code));
    } finally {
      setPasswortLaeuft(false);
    }
  }

  async function kontoEndgueltigLoeschen() {
    if (!user || !user.email) return;
    setLoeschFehler(null);
    setLoeschLaeuft(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, loeschPasswort));

      // Firestore-Daten zuerst löschen, erst danach den Auth-Nutzer selbst: bricht der
      // Vorgang mittendrin ab (z. B. Verbindungsabbruch), bleibt so nie ein Auth-Konto
      // ganz ohne jede Datenspur zurück — höchstens umgekehrt (Daten schon weg, Konto
      // noch da), was sich über einen erneuten Löschversuch problemlos nachholen lässt.
      // Bekannte Grenze (siehe Entwurf): eine serverseitig GARANTIERT verknüpfte
      // Löschung bräuchte eine Cloud Function — für den MVP-Kern bewusst zurückgestellt.
      const kinderSnap = await getDocs(collection(db, kinderCollectionPfad(user.uid)));
      await Promise.all(kinderSnap.docs.map((kindDoc) => deleteDoc(kindDoc.ref)));
      await deleteDoc(doc(db, elternEinstellungenPfad(user.uid))).catch(() => {
        // Kein Einstellungen-Dokument vorhanden (nie etwas gespeichert) — kein Fehlerfall.
      });
      await AsyncStorage.removeItem(AKTIVES_KIND_ID_KEY_PREFIX + user.uid);

      await deleteUser(user);
      navigation.replace("KidHome");
    } catch (fehler: any) {
      setLoeschFehler(uebersetzeFirebaseFehlerKonto(fehler?.code));
    } finally {
      setLoeschLaeuft(false);
    }
  }

  if (laedt) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#8FA888" />
      </View>
    );
  }

  const gespielteQuests = kindProfil ? Object.keys(kindProfil.questFortschritt).length : 0;
  const gemeisterteAnzahl = FIGUR_REIHENFOLGE.filter(
    (f) => kindProfil?.questFortschritt[f.questId]?.sterne === 3
  ).length;
  const consentAktuell =
    einstellungen?.einwilligungErteiltAm != null && einstellungen?.einwilligungVersion === CONSENT_VERSION;
  const nutzungGesamt = taeglichesLimit === ZEITLIMIT_KEIN_LIMIT ? null : taeglichesLimit + heutigeNutzung.bonusMinuten;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* --- 1. Kopfzeile --- */}
      {/* Nutzer-Feedback (2026-09-07): "Ich komme nicht aus dem Elternbereich für die
          weiteren Tests" — dieser Screen wird per navigation.replace erreicht (siehe
          RootNavigator.tsx, ParentGateScreen/ElternBereichRouter), KidHome bleibt also
          korrekt darunter im Stack, und Zurück-Geste (iOS)/Hardware-Zurück-Taste
          (Android) funktionieren bereits ohne Zusatzcode. Nur auf Web/Desktop (kein
          Header, keine Geste, keine Hardware-Taste) fehlte jede sichtbare Möglichkeit,
          den Screen wieder zu verlassen — deshalb hier bewusst NUR dort ein kleiner,
          unauffälliger Zurück-Link statt eines dauerhaft mitscrollenden Buttons (zweite,
          verworfene Idee: ein schwebender Lux-Button wäre auf Dauer "nervig", so der
          Nutzer selbst — ein Link neben dem Titel reicht). */}
      {Platform.OS === "web" && (
        <Pressable onPress={() => navigation.replace("KidHome")} hitSlop={8}>
          <Text style={styles.zurueckLink}>&larr; Zurück zum Spiel</Text>
        </Pressable>
      )}
      <Text style={styles.title}>Eltern-Bereich</Text>
      {user?.email ? <Text style={styles.subtitle}>angemeldet als {user.email}</Text> : null}
      {einfuehrungSichtbar && (
        <Text style={styles.einfuehrung}>
          Hier verwaltest du Zeitlimits, siehst den Lernfortschritt und findest alle
          rechtlichen Informationen zu ChessLynx.
        </Text>
      )}
      <Pressable
        style={styles.signOutLink}
        onPress={async () => {
          await elternAbmelden();
          navigation.replace("KidHome");
        }}
      >
        <Text style={styles.signOutLinkText}>Abmelden</Text>
      </Pressable>

      {ladeFehler && <Text style={styles.error}>{ladeFehler}</Text>}

      {/* --- 2. Fortschritt je Kind --- */}
      <Text style={styles.sectionTitle}>Fortschritt</Text>
      <View style={styles.panel}>
        <Text style={styles.karteName}>🐾 {kindProfil?.nickname ?? "Dein Kind"}</Text>
        {gespielteQuests === 0 ? (
          <Text style={styles.body}>
            {kindProfil?.nickname ?? "Dein Kind"} hat noch nicht mit dem Training begonnen.
          </Text>
        ) : (
          <>
            <View style={styles.sterneReihe}>
              {FIGUR_REIHENFOLGE.map((f) => {
                const sterne = kindProfil?.questFortschritt[f.questId]?.sterne ?? 0;
                return (
                  <Text key={f.questId} style={styles.sterneEintrag}>
                    {f.name} {"★".repeat(sterne)}
                    {"☆".repeat(3 - sterne)}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.body}>{gemeisterteAnzahl} von 6 Grundfiguren gemeistert</Text>
            {kindProfil?.zuletztAktivAm ? (
              <Text style={styles.muted}>Zuletzt gespielt: {relativerZeitpunkt(kindProfil.zuletztAktivAm)}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* --- 3. Zeitlimit --- */}
      <Text style={styles.sectionTitle}>Zeitlimit</Text>
      <View style={styles.panel}>
        <Text style={styles.caption}>Tägliches Zeitlimit</Text>
        <View style={styles.presetReihe}>
          {ZEITLIMIT_PRESETS.map((minuten) => (
            <Pressable
              key={minuten}
              style={[styles.presetChip, taeglichesLimit === minuten && styles.presetChipAktiv]}
              onPress={() => waehleZeitlimit(minuten)}
            >
              <Text style={[styles.presetChipText, taeglichesLimit === minuten && styles.presetChipTextAktiv]}>
                {minuten} Min.
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.presetChip, taeglichesLimit === ZEITLIMIT_KEIN_LIMIT && styles.presetChipAktiv]}
            onPress={() => waehleZeitlimit(ZEITLIMIT_KEIN_LIMIT)}
          >
            <Text
              style={[
                styles.presetChipText,
                taeglichesLimit === ZEITLIMIT_KEIN_LIMIT && styles.presetChipTextAktiv,
              ]}
            >
              Kein Limit
            </Text>
          </Pressable>
        </View>
        <Text style={styles.muted}>
          Nach Ablauf wird das Training pausiert. Verlängern kannst du jederzeit hier im
          Eltern-Bereich.
        </Text>
        <Text style={styles.body}>
          Aktuell heute genutzt: {heutigeNutzung.minutenGenutzt}
          {nutzungGesamt != null ? ` von ${nutzungGesamt} Minuten` : " Minuten (kein Limit)"}
        </Text>
        <Pressable style={styles.sekundaerButton} onPress={bonusHeuteGewaehren}>
          <Text style={styles.sekundaerButtonText}>+15 Min. für heute</Text>
        </Pressable>
      </View>

      {/* --- 4. Sprachausgabe ---
          Echter Eltern-Dashboard-Schalter statt der früheren festen ZEIGE_UNTERTITEL-
          Code-Konstante in luxStimme.ts (siehe priorisierter_umsetzungsplan.md). Lux
          spricht jede Zeile ohnehin automatisch vor (useLuxSprechzeile) — dieser Schalter
          steuert nur, ob dieselbe Zeile zusätzlich als geschriebener Untertitel in der
          Sprechblase erscheint.
          Zusätzlich (2026-09-08): manuelle Stimmauswahl mit Vorhören, siehe
          stimmeAuswahl.ts — vor allem im Browser am PC findet die automatische
          Bestenauswahl in luxStimme.ts keine verlässliche Qualitätsangabe. */}
      <Text style={styles.sectionTitle}>Sprachausgabe</Text>
      <View style={styles.panel}>
        <View style={styles.switchZeile}>
          <View style={styles.switchBeschriftung}>
            <Text style={styles.karteName}>Untertitel anzeigen</Text>
            <Text style={styles.muted}>
              Lux spricht jede Zeile ohnehin laut vor. Sobald ihr die Sprachausgabe im
              Alltag ausprobiert habt, könnt ihr die geschriebenen Untertitel darunter
              hier ausblenden.
            </Text>
          </View>
          <Switch
            value={untertitelAktiv}
            onValueChange={untertitelUmschalten}
            trackColor={{ false: "#D8D2C4", true: "#8FA888" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.stimmeTrenner} />
        <Text style={styles.karteName}>Stimme</Text>
        <Text style={styles.muted}>
          Manche Geräte — besonders der Browser am PC — bieten mehrere Stimmen an, die
          unterschiedlich natürlich klingen. Kurz reinhören und die angenehmste wählen.
        </Text>
        {stimmenLaden ? (
          <ActivityIndicator color="#8FA888" style={styles.stimmenLadeIndikator} />
        ) : verfuegbareStimmen.length === 0 ? (
          <Text style={styles.body}>
            Auf diesem Gerät konnte keine Liste einzelner Stimmen gefunden werden — Lux
            nutzt die deutsche Systemstandardstimme.
          </Text>
        ) : (
          <View style={styles.stimmenListe}>
            <Pressable
              style={[styles.stimmenZeile, bevorzugteStimmeId === undefined && styles.stimmenZeileAktiv]}
              onPress={() => stimmeAuswaehlen(undefined)}
            >
              <View style={styles.stimmenInfo}>
                <Text style={styles.stimmenName}>Automatisch (empfohlen)</Text>
                <Text style={styles.muted}>ChessLynx sucht selbst die beste verfügbare Stimme.</Text>
              </View>
            </Pressable>
            {verfuegbareStimmen.map((stimme) => (
              <View
                key={stimme.identifier}
                style={[styles.stimmenZeile, bevorzugteStimmeId === stimme.identifier && styles.stimmenZeileAktiv]}
              >
                <Pressable style={styles.stimmenInfo} onPress={() => stimmeAuswaehlen(stimme.identifier)}>
                  <Text style={styles.stimmenName}>{stimme.name}</Text>
                  {stimme.qualitaet ? <Text style={styles.muted}>{stimme.qualitaet}</Text> : null}
                </Pressable>
                <Pressable style={styles.vorhoerButton} onPress={() => stimmeVorhoeren(stimme.identifier)}>
                  <Text style={styles.vorhoerButtonText}>Vorhören</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* --- 5. Freischaltung / Kauf ---
          Scope-Grenze dieses Schritts: der In-App-Kauf selbst ist technisch noch nicht
          angebunden (Store-Anbindung inkl. "Käufe wiederherstellen" folgt als eigener
          Umsetzungsschritt) — dieser Bereich zeigt bewusst nur Preis und Umfang an,
          statt einen Kauf-Button vorzutäuschen, der noch nichts auslösen könnte. */}
      <Text style={styles.sectionTitle}>Vollständiger Lernpfad</Text>
      <View style={styles.panel}>
        <Text style={styles.body}>
          Die Grundfiguren (Quest 1–3) sind kostenlos. Quest 4–6 sowie alle
          Bonuskapitel gehören zum vollständigen Lernpfad — für alle Kinderprofile in
          diesem Konto.
        </Text>
        <Text style={styles.caption}>Freischaltung: 7,99 € (Vorschlagspreis, einmalig)</Text>
        <Text style={styles.muted}>
          Der In-App-Kauf ist noch nicht angebunden — dieser Bereich zeigt bereits Preis
          und Umfang, wie im Entwurf vorgesehen.
        </Text>
      </View>

      {/* --- 6. Datenschutz & Einwilligung --- */}
      <Text style={styles.sectionTitle}>Datenschutz</Text>
      <View style={styles.panel}>
        <Text style={styles.body}>
          ChessLynx verwendet keine Tracking- oder Werbe-SDKs. Es werden ausschließlich
          Daten verarbeitet, die für Betrieb, Anmeldung und Lernfortschritt notwendig
          sind.
        </Text>
        {consentAktuell ? (
          <Text style={styles.body}>
            Du hast der Datenschutzerklärung am{" "}
            {formatDatumUhrzeit(einstellungen!.einwilligungErteiltAm!)} zugestimmt (Version{" "}
            {einstellungen!.einwilligungVersion}).
          </Text>
        ) : (
          <View style={styles.consentBox}>
            <Text style={styles.body}>
              {einstellungen?.einwilligungErteiltAm
                ? "Die Datenschutzerklärung wurde seit deiner letzten Zustimmung aktualisiert — bitte einmal neu bestätigen."
                : "Bitte bestätige einmalig die Datenschutzerklärung."}
            </Text>
            {consentFehler && <Text style={styles.error}>{consentFehler}</Text>}
            <Pressable style={styles.sekundaerButton} onPress={einwilligungBestaetigen} disabled={consentLaeuft}>
              {consentLaeuft ? (
                <ActivityIndicator color="#4A4038" />
              ) : (
                <Text style={styles.sekundaerButtonText}>Zustimmen (Version {CONSENT_VERSION})</Text>
              )}
            </Pressable>
          </View>
        )}
        <Pressable onPress={() => Linking.openURL("https://www.chesslynx.de/datenschutz")}>
          <Text style={styles.link}>Datenschutzerklärung ansehen</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL("https://www.chesslynx.de/impressum")}>
          <Text style={styles.link}>Impressum ansehen</Text>
        </Pressable>
        <Text style={styles.caption}>Fragen zu deinen Daten oder eine Löschanfrage?</Text>
        <Pressable onPress={() => Linking.openURL("mailto:privacy@chesslynx.de")}>
          <Text style={styles.link}>Kontakt: privacy@chesslynx.de</Text>
        </Pressable>
      </View>

      {/* --- 7. Konto verwalten --- */}
      <Text style={styles.sectionTitle}>Konto</Text>
      <View style={styles.panel}>
        {!emailFormSichtbar ? (
          <Pressable
            style={styles.kontoZeile}
            onPress={() => {
              setEmailFormSichtbar(true);
              setPasswortFormSichtbar(false);
            }}
          >
            <Text style={styles.kontoZeileText}>E-Mail ändern</Text>
          </Pressable>
        ) : (
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Aktuelles Passwort"
              placeholderTextColor="#A39C8D"
              secureTextEntry
              value={emailPasswort}
              onChangeText={setEmailPasswort}
            />
            <TextInput
              style={styles.input}
              placeholder="Neue E-Mail-Adresse"
              placeholderTextColor="#A39C8D"
              autoCapitalize="none"
              keyboardType="email-address"
              value={neueEmail}
              onChangeText={setNeueEmail}
            />
            {emailFehler && <Text style={styles.error}>{emailFehler}</Text>}
            <Pressable style={styles.sekundaerButton} onPress={emailAendern} disabled={emailLaeuft}>
              {emailLaeuft ? (
                <ActivityIndicator color="#4A4038" />
              ) : (
                <Text style={styles.sekundaerButtonText}>E-Mail-Adresse ändern</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setEmailFormSichtbar(false)}>
              <Text style={styles.link}>Abbrechen</Text>
            </Pressable>
          </View>
        )}

        {!passwortFormSichtbar ? (
          <Pressable
            style={styles.kontoZeile}
            onPress={() => {
              setPasswortFormSichtbar(true);
              setEmailFormSichtbar(false);
            }}
          >
            <Text style={styles.kontoZeileText}>Passwort ändern</Text>
          </Pressable>
        ) : (
          <View style={styles.inlineForm}>
            <TextInput
              style={styles.input}
              placeholder="Aktuelles Passwort"
              placeholderTextColor="#A39C8D"
              secureTextEntry
              value={aktuellesPasswort}
              onChangeText={setAktuellesPasswort}
            />
            <TextInput
              style={styles.input}
              placeholder="Neues Passwort"
              placeholderTextColor="#A39C8D"
              secureTextEntry
              value={neuesPasswort}
              onChangeText={setNeuesPasswort}
            />
            <Text style={styles.passwortHinweis}>Mind. 8 Zeichen, mit Großbuchstabe, Zahl und Sonderzeichen.</Text>
            {passwortFehler && <Text style={styles.error}>{passwortFehler}</Text>}
            <Pressable style={styles.sekundaerButton} onPress={passwortAendern} disabled={passwortLaeuft}>
              {passwortLaeuft ? (
                <ActivityIndicator color="#4A4038" />
              ) : (
                <Text style={styles.sekundaerButtonText}>Passwort ändern</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setPasswortFormSichtbar(false)}>
              <Text style={styles.link}>Abbrechen</Text>
            </Pressable>
          </View>
        )}

        {loeschSchritt === 0 && (
          <Pressable style={styles.kontoZeile} onPress={() => setLoeschSchritt(1)}>
            <Text style={styles.loeschenText}>Konto und alle Daten löschen</Text>
          </Pressable>
        )}
        {loeschSchritt === 1 && (
          <View style={styles.loeschBox}>
            <Text style={styles.body}>
              Möchtest du dein Konto wirklich löschen? Alle Kinderprofile und der
              gesamte Lernfortschritt werden unwiderruflich entfernt. Ein bereits
              getätigter Store-Kauf bleibt an dein Apple-/Google-Konto gebunden und
              lässt sich bei einer Neuanmeldung jederzeit über „Käufe
              wiederherstellen“ zurückholen — der Lernfortschritt selbst kommt dabei
              nicht zurück.
            </Text>
            <View style={styles.loeschButtonReihe}>
              <Pressable style={styles.sekundaerButton} onPress={() => setLoeschSchritt(0)}>
                <Text style={styles.sekundaerButtonText}>Abbrechen</Text>
              </Pressable>
              <Pressable style={styles.loeschButton} onPress={() => setLoeschSchritt(2)}>
                <Text style={styles.loeschButtonText}>Weiter</Text>
              </Pressable>
            </View>
          </View>
        )}
        {loeschSchritt === 2 && (
          <View style={styles.loeschBox}>
            <Text style={styles.body}>
              Zur endgültigen Bestätigung: bitte dein Passwort erneut eingeben.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Passwort"
              placeholderTextColor="#A39C8D"
              secureTextEntry
              value={loeschPasswort}
              onChangeText={setLoeschPasswort}
            />
            {loeschFehler && <Text style={styles.error}>{loeschFehler}</Text>}
            <View style={styles.loeschButtonReihe}>
              <Pressable
                style={styles.sekundaerButton}
                onPress={() => {
                  setLoeschSchritt(0);
                  setLoeschPasswort("");
                  setLoeschFehler(null);
                }}
              >
                <Text style={styles.sekundaerButtonText}>Abbrechen</Text>
              </Pressable>
              <Pressable style={styles.loeschButton} onPress={kontoEndgueltigLoeschen} disabled={loeschLaeuft}>
                {loeschLaeuft ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loeschButtonText}>Konto endgültig löschen</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <Pressable style={styles.creditsLink} onPress={() => navigation.navigate("Credits")}>
        <Text style={styles.creditsLinkText}>Lizenzen &amp; Credits</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1E4" },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F1E4" },
  title: { fontSize: 22, fontWeight: "700", color: "#4A4038", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B6255" },
  zurueckLink: { fontSize: 14, color: "#5C7A63", marginBottom: 12 },
  einfuehrung: { fontSize: 13, color: "#6B6255", lineHeight: 18, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#4A4038", marginTop: 24, marginBottom: 8 },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4DCC8",
  },
  karteName: { fontSize: 16, fontWeight: "600", color: "#4A4038", marginBottom: 8 },
  switchZeile: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchBeschriftung: { flex: 1 },
  stimmeTrenner: { height: 1, backgroundColor: "#E4DCC8", marginVertical: 14 },
  stimmenLadeIndikator: { alignSelf: "flex-start", marginTop: 4 },
  stimmenListe: { marginTop: 6 },
  stimmenZeile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4DCC8",
    marginBottom: 8,
  },
  stimmenZeileAktiv: { borderColor: "#8FA888", backgroundColor: "#F1F5EE" },
  stimmenInfo: { flex: 1 },
  stimmenName: { fontSize: 14, fontWeight: "600", color: "#4A4038" },
  vorhoerButton: {
    backgroundColor: "#EFE9D8",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  vorhoerButtonText: { color: "#4A4038", fontSize: 13, fontWeight: "600" },
  sterneReihe: { marginBottom: 8 },
  sterneEintrag: { fontSize: 14, color: "#4A4038", marginBottom: 2 },
  body: { fontSize: 14, color: "#6B6255", lineHeight: 20, marginBottom: 8 },
  muted: { fontSize: 12, color: "#9A9282", marginBottom: 8 },
  caption: { fontSize: 12, color: "#9A9282", fontStyle: "italic", marginBottom: 8 },
  presetReihe: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  presetChip: {
    borderWidth: 1,
    borderColor: "#D8D2C4",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  presetChipAktiv: { backgroundColor: "#8FA888", borderColor: "#8FA888" },
  presetChipText: { fontSize: 13, color: "#4A4038" },
  presetChipTextAktiv: { color: "#FFFFFF", fontWeight: "600" },
  sekundaerButton: {
    backgroundColor: "#EFE9D8",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  sekundaerButtonText: { color: "#4A4038", fontSize: 14, fontWeight: "600" },
  link: { color: "#8FA888", fontSize: 14, textDecorationLine: "underline", marginBottom: 8 },
  consentBox: { marginBottom: 8 },
  error: { color: "#B0553A", fontSize: 13, marginBottom: 8 },
  kontoZeile: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E4DCC8" },
  kontoZeileText: { fontSize: 15, color: "#4A4038" },
  loeschenText: { fontSize: 15, color: "#B0553A" },
  inlineForm: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E4DCC8" },
  loeschBox: { paddingVertical: 12 },
  loeschButtonReihe: { flexDirection: "row", gap: 12, marginTop: 8 },
  loeschButton: {
    backgroundColor: "#B0553A",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  loeschButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#F7F1E4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#4A4038",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E4DCC8",
  },
  passwortHinweis: { fontSize: 12, color: "#9A9282", marginTop: -4, marginBottom: 10 },
  signOutLink: { marginTop: 12, marginBottom: 4, alignSelf: "flex-start" },
  signOutLinkText: { color: "#B0553A", fontSize: 14, textDecorationLine: "underline" },
  creditsLink: { marginTop: 28, alignSelf: "flex-start" },
  creditsLinkText: { color: "#8FA888", fontSize: 14, textDecorationLine: "underline" },
});
