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
import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { elternAbmelden, useAuthUser } from "../lib/auth";
import {
  ladeGanzePartieEtappe,
  loescheGanzePartieEtappe,
  speichereGanzePartieEtappe,
} from "../lib/ganzePartieStand";
import {
  getOrCreateAktivesKindId,
  kontoBezogeneLokaleDatenLoeschen,
  lokalenSpielstandLoeschen,
  loadBonusFortschrittLocal,
  loadQuestFortschrittLocal,
  saveBonusFortschrittLocal,
  saveQuestFortschrittLocal,
  setWillkommenGesehen,
} from "../lib/storage";
import { markiereFarbeinfuehrungGezeigt } from "../lib/freispielEinfuehrung";
import { leseTestAnsicht, setzeTestAnsicht } from "../lib/testAnsicht";
import {
  CONSENT_VERSION,
  COPPA_HINWEIS_VERSION,
  holeDb,
  elternEinstellungenPfad,
  kinderCollectionPfad,
  kindProfilPfad,
  type ElternEinstellungen,
  type KindProfil,
} from "../lib/firebase";
// Rechtstexte-Adressen und Datenschutz-Kontakt zentral, sprachabhängig — siehe lib/sprache.ts.
import {
  DATENSCHUTZ_MAIL,
  datenschutzUrl,
  impressumUrl,
  setzeSprache,
  sprachWahl,
  t,
  type SprachWahl,
} from "../lib/sprache";
// Nutzer-Entscheidung 2026-09-09 ("Spielstand zurücksetzen" als echte Eltern-Funktion,
// nicht nur lokaler Test-Reset): derselbe Startwert wie beim Neuanlegen eines
// Kinderprofils (siehe storage.ts, getOrCreateAktivesKindId) — ein zurückgesetzter
// Freispiel-Fortschritt beginnt konsistent bei genau derselben ersten Stufe wie ein
// brandneues Profil, statt einer eigenen, potenziell abweichenden Konstante.
import { ersteStufe } from "../lib/waldfreundeBot";
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
// "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag 2026-09-09) —
// Eltern-Schalter, gleiche Bauart wie der Untertitel-Schalter oben, aber Standard AUS
// (ausdrückliche Nutzerentscheidung), siehe luxHinweis.ts.
import { HINWEISE_STANDARD, leseHinweiseAktiv, setzeHinweiseAktiv } from "../lib/luxHinweis";
// Manuelle Stimmauswahl mit Vorhören (Nutzer-Feedback 2026-09-08: "möchte eine andere
// Stimme haben, der Computer-Ton ist unangenehm") — siehe stimmeAuswahl.ts für die
// ausführliche Begründung. Ergänzt (nicht ersetzt) die automatische Bestenauswahl in
// luxStimme.ts, die vor allem im Browser am PC praktisch wirkungslos ist.
import {
  type StimmenOption,
  leseBevorzugteStimmeId,
  listeStimmen,
  setzeBevorzugteStimmeId,
  stimmeVorhoeren,
  vorhoerenStoppen,
} from "../lib/stimmeAuswahl";

const EINFUEHRUNG_GEZEIGT_KEY = "chesslynx:dashboardEinfuehrungGezeigt";

// Reihenfolge der Grundfiguren-Quests, wie im geprüften Entwurf abgebildet (Bauer →
// Turm → Läufer → Springer → Dame → König).
//
// Korrektur (2026-09-09, im Zuge der neuen Testmodus-Buttons unten): die vorherige
// Fassung hier war nur gegen Quest1.tsx/Quest6.tsx verifiziert (beide rufen
// `saveQuestFortschrittLocal("quest1"/"quest6", …)` auf) und vertauschte dabei Quest 2
// und Quest 4 — stand "Springer" bei quest2 und "Turm" bei quest4. Tatsächlich (per
// pieceIcon-Aufruf in Quest2.tsx bzw. Quest4.tsx nachgesehen) ist Quest 2 der Turm
// (Waldtier: Bär) und Quest 4 der Springer (Waldtier: Pferd) — die Sterne-Übersicht
// unten zeigte dadurch bislang für Quest 2/4 den jeweils falschen Figurnamen an.
// `questFortschritt` selbst ist mit den Schlüsseln "quest1".."quest6" belegt, passend
// zur Freischaltungs-Reihenfolge in KidHome (RootNavigator.tsx) — davon ist nur das
// Anzeige-Label hier betroffen, keine gespeicherten Daten.
const FIGUR_REIHENFOLGE = [
  { questId: "quest1", name: "Bauer" },
  { questId: "quest2", name: "Turm" },
  { questId: "quest3", name: "Läufer" },
  { questId: "quest4", name: "Springer" },
  { questId: "quest5", name: "Dame" },
  { questId: "quest6", name: "König" },
] as const;

// Bonuskapitel-Fortschrittsanzeige (Task #112, ergänzt 2026-09-08) — siehe Claude-Projekt
// "ChessLynx", priorisierter_umsetzungsplan.md ("ParentDashboard um eine Bonuskapitel-
// Fortschrittsanzeige ergänzen").
//
// Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
// schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md und claude/erobern_screen_reviere_
// ruhmeshalle_befund_2026-09-17.md): die vier ersten sind jetzt als "Erstlehre" direkt in
// ihre Gefährten-Reviere eingebunden (siehe lib/revierErstlehre.ts) und NICHT mehr
// Voraussetzung für das Burgtor/die Wisentfeste — `gatePflichtig` ist daher überall false.
// Das Feld bleibt als Anzeige-Gruppierung ("Erstlehre" vs. echtes Extra-Kapitel) erhalten.
const BONUSKAPITEL_REIHENFOLGE = [
  { id: "fesselung", name: "Fesselung", gatePflichtig: false },
  { id: "rochade", name: "Rochade", gatePflichtig: false },
  { id: "figurenwert", name: "Figurenwert", gatePflichtig: false },
  { id: "mattIn2", name: "Matt in 2", gatePflichtig: false },
  { id: "mattIn3", name: "Matt in 3 (Extra)", gatePflichtig: false },
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
  // Sprachwahl (2026-09-14). `sprachWahl()` ist synchron und beim Rendern bereits gefüllt,
  // weil App.tsx `ladeSprache()` vor dem ersten Screen abwartet — deshalb kein Laden hier.
  const [gewaehlteSprache, setGewaehlteSprache] = useState<SprachWahl>(sprachWahl());
  const [hinweiseAktiv, setHinweiseAktivState] = useState(HINWEISE_STANDARD);

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

  // Ursprünglich (2026-09-09) als reiner __DEV__-Testknopf gebaut ("Ich teste jetzt" —
  // auf dem Test-Gerät sammeln sich über mehrere Testrunden lokale Daten an, die
  // erneutes Testen der Willkommens-Sequenz bzw. eines "frischen" Karten-Zustands
  // verhinderten). Nutzer-Entscheidung, denselben Tag: als echte, dauerhafte Eltern-
  // Funktion belassen ("Spielstand selbst zurücksetzen können") — deshalb jetzt OHNE
  // __DEV__-Gate, mit eigener Fehleranzeige (Firestore-Schreibvorgang kann
  // fehlschlagen) und geräteübergreifend (siehe spielstandZuruecksetzen() unten: löscht
  // sowohl die lokalen AsyncStorage-Daten dieses Geräts als auch die entsprechenden
  // Felder im Firestore-Kinderprofil, damit der alte Stand nicht bei einer
  // Neuinstallation oder auf einem zweiten Gerät wieder auftaucht).
  //
  // Nutzerwunsch "Abstufung für später vorhalten": aktuell setzt ein einziger Knopf
  // IMMER alle drei Fortschrittsarten zurück (Quests, Bonuskapitel, Freispiel) — die
  // Funktion unten ist bewusst in drei klar getrennte Blöcke (lokal/Quests+Bonus,
  // lokal/Freispiel, Cloud) gegliedert, damit eine spätere Auswahl-UI (z. B. einzelne
  // Checkboxen je Bereich) sich ohne Umbau der eigentlichen Lösch-Logik ergänzen lässt.
  // Paket 3c (2026-09-11): Zwischenstand des Kapitels „Die ganze Partie" (nur lokal, siehe
  // lib/ganzePartieStand.ts) + ob das Kapitel schon ganz geschafft ist (lokales Flag — das
  // Kind spielt es auf diesem Gerät).
  const [ganzePartieEtappe, setGanzePartieEtappe] = useState(0);
  const [ganzePartieGeschafft, setGanzePartieGeschafft] = useState(false);
  // Gerätetest 2026-09-11: Rückmeldung für die Testmodus-Knöpfe (vorher passierte sichtbar nichts).
  const [testMeldung, setTestMeldung] = useState<string | null>(null);
  // Reine Ansichts-Schalter der Saga-Karte (2026-09-14, siehe lib/testAnsicht.ts) — die
  // Knöpfe unten zeigen den aktuellen Stand an, deshalb werden sie hier beim Öffnen
  // einmal gelesen.
  const [gefaehrtenVorschau, setGefaehrtenVorschau] = useState(false);
  const [alleGruessen, setAlleGruessen] = useState(false);
  const [nebelAus, setNebelAus] = useState(false);
  useEffect(() => {
    let abgebrochen = false;
    Promise.all([ladeGanzePartieEtappe(), loadBonusFortschrittLocal("ganzePartie")]).then(([etappe, geschafft]) => {
      if (abgebrochen) return;
      setGanzePartieEtappe(etappe);
      setGanzePartieGeschafft(geschafft);
    });
    leseTestAnsicht("gefaehrtenVorschau").then((an) => {
      if (!abgebrochen) setGefaehrtenVorschau(an);
    });
    leseTestAnsicht("alleGruessen").then((an) => {
      if (!abgebrochen) setAlleGruessen(an);
    });
    leseTestAnsicht("nebelAus").then((an) => {
      if (!abgebrochen) setNebelAus(an);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  const [resetSchritt, setResetSchritt] = useState<0 | 1 | 2>(0);
  const [resetLaeuft, setResetLaeuft] = useState(false);
  const [resetFehler, setResetFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let abgebrochen = false;
    (async () => {
      try {
        const kindId = await getOrCreateAktivesKindId(user.uid);
        const [kindSnap, geladeneEinstellungen, limit, nutzung, einfuehrungGezeigt, untertitel, hinweise] =
          await Promise.all([
            getDoc(doc(holeDb(), kindProfilPfad(user.uid, kindId))),
            ladeElternEinstellungen(user.uid),
            leseTaeglichesZeitlimit(),
            leseHeutigeNutzung(),
            AsyncStorage.getItem(EINFUEHRUNG_GEZEIGT_KEY),
            leseUntertitelAktiv(),
            leseHinweiseAktiv(),
          ]);
        if (abgebrochen) return;
        setKindProfil(kindSnap.exists() ? (kindSnap.data() as KindProfil) : null);
        setEinstellungen(geladeneEinstellungen);
        setTaeglichesLimit(limit);
        setHeutigeNutzung(nutzung);
        setUntertitelAktivState(untertitel);
        setHinweiseAktivState(hinweise);
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
      const [stimmen, gewaehlteId] = await Promise.all([listeStimmen(), leseBevorzugteStimmeId()]);
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

  // Sprache umstellen. Wirkt sofort — die Sprechzeilen-Listen der Quest-Screens sind
  // Funktionen, keine Konstanten (siehe lib/sprache.ts), und werden beim nächsten Rendern
  // neu gebildet. Das Dashboard selbst zeichnet durch setState ohnehin neu.
  async function spracheUmschalten(neu: SprachWahl) {
    setGewaehlteSprache(neu);
    await setzeSprache(neu);
  }

  async function hinweiseUmschalten(wert: boolean) {
    setHinweiseAktivState(wert);
    await setzeHinweiseAktiv(wert);
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
        coppaHinweisVersion: COPPA_HINWEIS_VERSION,
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
      const kinderSnap = await getDocs(collection(holeDb(), kinderCollectionPfad(user.uid)));
      await Promise.all(kinderSnap.docs.map((kindDoc) => deleteDoc(kindDoc.ref)));
      await deleteDoc(doc(holeDb(), elternEinstellungenPfad(user.uid))).catch(() => {
        // Kein Einstellungen-Dokument vorhanden (nie etwas gespeichert) — kein Fehlerfall.
      });
      // Paket 5: auch auf diesem Gerät alles entfernen, was zum Konto gehört (Kind-ID,
      // vorgemerkter Nickname, Spielstand + Warteschlangen) — siehe storage.ts.
      await kontoBezogeneLokaleDatenLoeschen(user.uid);

      await deleteUser(user);
      navigation.replace("KidHome");
    } catch (fehler: any) {
      setLoeschFehler(uebersetzeFirebaseFehlerKonto(fehler?.code));
    } finally {
      setLoeschLaeuft(false);
    }
  }

  // Siehe useState-Kommentar oben: setzt den kompletten Lernfortschritt zurück — sowohl
  // lokal auf DIESEM Gerät (AsyncStorage) als auch im Firestore-Kinderprofil (Cloud),
  // damit der alte Stand nicht bei einer Neuinstallation oder auf einem zweiten Gerät
  // wieder auftaucht. Anders als `kontoEndgueltigLoeschen` oben bleiben Konto und
  // Anmeldung dabei vollständig unangetastet — nur die drei Fortschrittsfelder auf dem
  // Kinderprofil (questFortschritt/bonusFortschritt/freispielFortschritt) plus die
  // zugehörigen einmaligen "schon gesehen"-Hinweise. `waldgefaehrtenFortschritt` (die
  // separate, laut lib/freispielFortschritt.ts-Kommentar noch nicht ausgebaute
  // Waldgefährten-Kampagne) bleibt bewusst unberührt — dafür gab es keine explizite
  // Nutzerentscheidung, und ein Reset ins Leere wäre unnötiges Risiko.
  async function spielstandZuruecksetzen() {
    if (!user) return;
    setResetFehler(null);
    setResetLaeuft(true);
    try {
      // 1. Lokal (dieses Gerät): Willkommens-Flag, Quest-/Bonusfortschritt samt deren
      //    Sync-Warteschlangen, sowie beide vorgefundenen Freispiel-Fortschritts-
      //    Präfixe (siehe lib/freispielFortschritt.ts UND das ältere, separate
      //    lib/freispielEinfuehrung.ts — beide betreffen denselben "Farbeinführung
      //    schon gezeigt"-Moment, sicherheitshalber werden beide zurückgesetzt).
      await lokalenSpielstandLoeschen();

      // 2. Cloud (Firestore): dieselben drei Felder auf dem Kinderprofil-Dokument, per
      //    updateDoc statt setDoc(..., {merge:true}) — merge:true führt bei
      //    Objekt-/Map-Feldern einen TIEFEN Merge durch (siehe bereits bestehender
      //    Kommentar bei syncPendingProgress in storage.ts), ein leeres {} würde den
      //    vorhandenen Inhalt also NICHT löschen. updateDoc ersetzt das benannte Feld
      //    dagegen vollständig.
      const kindId = await getOrCreateAktivesKindId(user.uid);
      const bonusFortschrittZurueckgesetzt: KindProfil["bonusFortschritt"] = {
        fesselung: false,
        rochade: false,
        mattIn2: false,
        mattIn3: false,
        figurenwert: false,
        schlossFinale: false,
        ganzePartie: false,
      };
      const freispielFortschrittZurueckgesetzt: KindProfil["freispielFortschritt"] = {
        hoechsteFreigeschalteteElo: ersteStufe().elo,
      };
      await updateDoc(doc(holeDb(), kindProfilPfad(user.uid, kindId)), {
        questFortschritt: {},
        bonusFortschritt: bonusFortschrittZurueckgesetzt,
        freispielFortschritt: freispielFortschrittZurueckgesetzt,
        zuletztAktivAm: Date.now(),
      });

      // Dashboard-Anzeige (Fortschrittszahlen oben auf diesem Screen) sofort
      // mitziehen, statt auf ein erneutes Laden zu warten.
      setKindProfil((vorher) =>
        vorher
          ? {
              ...vorher,
              questFortschritt: {},
              bonusFortschritt: bonusFortschrittZurueckgesetzt,
              freispielFortschritt: freispielFortschrittZurueckgesetzt,
            }
          : vorher
      );
      setResetSchritt(2);
    } catch (fehler) {
      console.warn("ParentDashboard: Spielstand zurücksetzen fehlgeschlagen:", fehler);
      setResetFehler("Zurücksetzen fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.");
    } finally {
      setResetLaeuft(false);
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
  // `?.` je Feld statt eines pauschalen `kindProfil?.bonusFortschritt?.[id]`, weil ältere
  // Kinderprofile (vor der Einführung dieses Datenmodell-Felds, siehe firebase.ts-Kommentar
  // zu bonusFortschritt) das Feld ggf. noch gar nicht besitzen — soll dann als "noch nicht
  // begonnen" statt als Absturz behandelt werden.
  //
  // Nachtrag 2026-09-17: nicht mehr "gate-pflichtig" (kein Schlosstor-Gate mehr, siehe
  // BONUSKAPITEL_REIHENFOLGE-Kommentar oben) — gezählt werden jetzt die vier echten
  // Erstlehre-Kapitel (alles außer "Matt in 3 (Extra)").
  const erstlehreErledigtAnzahl = BONUSKAPITEL_REIHENFOLGE.filter(
    (k) => k.id !== "mattIn3" && kindProfil?.bonusFortschritt?.[k.id]
  ).length;
  const erstlehreGesamtAnzahl = BONUSKAPITEL_REIHENFOLGE.filter((k) => k.id !== "mattIn3").length;
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

      {/* --- 2b. Bonuskapitel (Task #112) --- */}
      <Text style={styles.sectionTitle}>Bonuskapitel</Text>
      <View style={styles.panel}>
        {gespielteQuests === 0 ? (
          <Text style={styles.body}>Die Bonuskapitel folgen, sobald alle sechs Waldabenteuer geschafft sind.</Text>
        ) : (
          <>
            <View style={styles.sterneReihe}>
              {BONUSKAPITEL_REIHENFOLGE.map((k) => {
                const erledigt = Boolean(kindProfil?.bonusFortschritt?.[k.id]);
                return (
                  <Text key={k.id} style={styles.sterneEintrag}>
                    {k.name} {erledigt ? "✓" : "○"}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.body}>
              {erstlehreErledigtAnzahl} von {erstlehreGesamtAnzahl} Erstlehre-Kapiteln in den Revieren geschafft.
            </Text>
          </>
        )}
      </View>

      {/* --- 2c. Die ganze Partie (Paket 3c) — nur sichtbar, sobald das Kind damit angefangen hat. --- */}
      {(ganzePartieGeschafft || ganzePartieEtappe > 0) && (
        <>
          <Text style={styles.sectionTitle}>Die ganze Partie (Steinbrücke)</Text>
          <View style={styles.panel}>
            {ganzePartieGeschafft ? (
              <Text style={styles.body}>Geschafft ✓ — Ihr Kind kann jetzt frei gegen die Waldfreunde spielen.</Text>
            ) : (
              <>
                <Text style={styles.body}>
                  {ganzePartieEtappe} von 5 Etappen geschafft. Beim nächsten Besuch der Schildkröte fragt Lux, ob Ihr
                  Kind dort weitermachen oder von vorn beginnen möchte.
                </Text>
                <Pressable
                  style={styles.sekundaerButton}
                  onPress={async () => {
                    await loescheGanzePartieEtappe();
                    setGanzePartieEtappe(0);
                  }}
                >
                  <Text style={styles.sekundaerButtonText}>Kapitel neu beginnen</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}

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
      {/* --- Sprache (2026-09-14) ---
          Eingebaut, weil die App sonst nur auf einem Gerät mit englischer Systemsprache in
          Englisch zu sehen ist — für den Test des DE+EN-Simultanlaunches unzumutbar, und
          auch für Familien sinnvoll, die die Gerätesprache nicht umstellen wollen (etwa
          zweisprachige Haushalte oder Eltern, die ihrem Kind gezielt Englisch anbieten).
          "Automatisch" folgt der Gerätesprache und bleibt die Voreinstellung. */}
      <Text style={styles.sectionTitle}>{t("Sprache", "Language")}</Text>
      <View style={styles.panel}>
        <Text style={styles.muted}>
          {t(
            "Gilt für die ganze App — auch für das, was Lux spricht. Die Stimme wird passend zur Sprache neu gewählt.",
            "Applies to the whole app, including what Lux says. The voice is picked to match the language."
          )}
        </Text>
        {([
          ["auto", t("Automatisch (Gerätesprache)", "Automatic (device language)")],
          ["de", "Deutsch"],
          ["en", "English"],
        ] as [SprachWahl, string][]).map(([wert, beschriftung]) => (
          <Pressable
            key={wert}
            style={styles.switchZeile}
            onPress={() => spracheUmschalten(wert)}
            accessibilityRole="radio"
            accessibilityState={{ selected: gewaehlteSprache === wert }}
          >
            <Text style={styles.karteName}>{beschriftung}</Text>
            <Text style={styles.karteName}>{gewaehlteSprache === wert ? "●" : "○"}</Text>
          </Pressable>
        ))}
      </View>

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
        {/* "Lux fragen"-Hinweisfunktion (Claude-Projekt "ChessLynx", Nutzerauftrag
            2026-09-09): bei den Bonuskapitel-Rätseln und in den Freispiel-Partien gegen
            die Waldfreunde-Bots kann das Kind Lux durch zweimaliges Antippen um einen
            Hinweis bitten. Standard AUS (Nutzerentscheidung), siehe luxHinweis.ts. */}
        <View style={styles.switchZeile}>
          <View style={styles.switchBeschriftung}>
            <Text style={styles.karteName}>Hinweise von Lux</Text>
            <Text style={styles.muted}>
              Bei den Lernkapiteln und im Freispiel gegen die Waldfreunde kann das Kind
              Lux zweimal antippen und um einen Hinweis bitten, wenn es nicht
              weiterweiß — nützlich gegen Frust, wenn es wirklich feststeckt.
            </Text>
          </View>
          <Switch
            value={hinweiseAktiv}
            onValueChange={hinweiseUmschalten}
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
          Update (2026-09-09, Monetarisierung/IAP-Vorbereitung, Claude-Projekt "ChessLynx",
          monetarisierung_iap_technische_recherche_2026-09-09.md): Der Freischaltungsstatus
          selbst wird jetzt ECHT angezeigt (aus `einstellungen`, das dieser Screen ohnehin
          schon lädt — kein neuer Import, keine neue Abhängigkeit). Der Kauf-Button/
          "Käufe wiederherstellen" selbst bleibt bewusst auskommentiert: `lib/kauf.ts`
          importiert `expo-iap`, das noch nicht installiert ist (siehe dortiger
          Kopfkommentar) — ein aktiver Import hier würde das komplette Metro-Bundling zum
          Absturz bringen. Sobald `npx expo install expo-iap` gelaufen ist UND ein Custom
          Dev Client existiert (Recherche-Notiz, Schritte 1+2), den Block weiter unten
          einkommentieren und den Import
          `import { kaufeVollstaendigenLernpfad, kaeufeWiederherstellen } from "../lib/kauf";`
          oben ergänzen. */}
      <Text style={styles.sectionTitle}>Vollständiger Lernpfad</Text>
      <View style={styles.panel}>
        <Text style={styles.body}>
          Die Grundfiguren (Quest 1–3) sind kostenlos. Quest 4–6 sowie alle
          Bonuskapitel gehören zum vollständigen Lernpfad — für alle Kinderprofile in
          diesem Konto.
        </Text>
        {einstellungen?.vollstaendigerLernpfadFreigeschaltet ? (
          <Text style={styles.body}>
            ✓ Freigeschaltet
            {einstellungen.freischaltungAm
              ? ` seit ${formatDatumUhrzeit(einstellungen.freischaltungAm)}`
              : ""}
            .
          </Text>
        ) : (
          <>
            <Text style={styles.caption}>Freischaltung: 7,99 € (Vorschlagspreis, einmalig)</Text>
            <Text style={styles.muted}>
              Der In-App-Kauf ist noch nicht angebunden — dieser Bereich zeigt bereits Preis
              und Umfang, wie im Entwurf vorgesehen.
            </Text>
          </>
        )}

        {/* AKTIVIEREN SOBALD expo-iap INSTALLIERT IST + CUSTOM DEV CLIENT EXISTIERT:
        {!einstellungen?.vollstaendigerLernpfadFreigeschaltet && (
          <Pressable
            style={styles.sekundaerButton}
            onPress={async () => {
              setKaufLaeuft(true);
              setKaufFehler(null);
              const ergebnis = await kaufeVollstaendigenLernpfad();
              setKaufLaeuft(false);
              if (ergebnis.erfolg) {
                setEinstellungen((vorher) =>
                  vorher
                    ? { ...vorher, vollstaendigerLernpfadFreigeschaltet: true, freischaltungAm: Date.now() }
                    : vorher
                );
              } else if (ergebnis.grund !== "abgebrochen") {
                setKaufFehler("Der Kauf konnte nicht abgeschlossen werden. Bitte erneut versuchen.");
              }
            }}
            disabled={kaufLaeuft}
          >
            {kaufLaeuft ? (
              <ActivityIndicator color="#4A4038" />
            ) : (
              <Text style={styles.sekundaerButtonText}>Vollständigen Lernpfad freischalten</Text>
            )}
          </Pressable>
        )}
        {kaufFehler && <Text style={styles.error}>{kaufFehler}</Text>}
        <Pressable
          onPress={async () => {
            setKaufLaeuft(true);
            setKaufFehler(null);
            const ergebnis = await kaeufeWiederherstellen();
            setKaufLaeuft(false);
            if (ergebnis.erfolg) {
              setEinstellungen((vorher) =>
                vorher ? { ...vorher, vollstaendigerLernpfadFreigeschaltet: true } : vorher
              );
            } else {
              setKaufFehler("Es wurde kein bereits getätigter Kauf gefunden.");
            }
          }}
          disabled={kaufLaeuft}
        >
          <Text style={styles.link}>Käufe wiederherstellen</Text>
        </Pressable>
        // Zugehörige State-Deklarationen (oben bei den anderen useState-Aufrufen ergänzen):
        // const [kaufLaeuft, setKaufLaeuft] = useState(false);
        // const [kaufFehler, setKaufFehler] = useState<string | null>(null);
        */}
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
        <Pressable onPress={() => Linking.openURL(datenschutzUrl())}>
          <Text style={styles.link}>Datenschutzerklärung ansehen</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(impressumUrl())}>
          <Text style={styles.link}>Impressum ansehen</Text>
        </Pressable>
        <Text style={styles.caption}>Fragen zu deinen Daten oder eine Löschanfrage?</Text>
        {/* Korrektur 2026-09-14 (Guideline-1.3-Prüfung): Hier stand `privacy@chesslynx.de` —
            diese Adresse existiert nicht, es gibt nur die `.com`-Fassung. Anfragen von Eltern
            zu ihren Daten wären ins Leere gelaufen. Adresse jetzt zentral in lib/sprache.ts. */}
        <Pressable onPress={() => Linking.openURL(`mailto:${DATENSCHUTZ_MAIL}`)}>
          <Text style={styles.link}>Kontakt: {DATENSCHUTZ_MAIL}</Text>
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
              gesamte Lernfortschritt werden unwiderruflich entfernt — in der Cloud und
              auf diesem Gerät. Ein bereits
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

      {/* Nutzer-Entscheidung 2026-09-09: als echte, dauerhafte Eltern-Funktion belassen
          (nicht mehr __DEV__-only, siehe useState-Kommentar oben) — Eltern sollen den
          Spielstand ihres Kindes jederzeit selbst zurücksetzen können, z. B. für ein
          Geschwisterkind oder um noch einmal ganz von vorne zu beginnen. */}
      <View>
        <Text style={styles.sectionTitle}>Spielstand</Text>
        <View style={styles.panel}>
          {resetSchritt === 0 && (
            <Pressable style={styles.kontoZeile} onPress={() => setResetSchritt(1)}>
              <Text style={styles.kontoZeileText}>Spielstand zurücksetzen</Text>
            </Pressable>
          )}
          {resetSchritt === 1 && (
            <View style={styles.loeschBox}>
              <Text style={styles.body}>
                Setzt den gesamten Lernfortschritt zurück: alle sechs Waldabenteuer, alle
                Bonuskapitel und die im Freispiel-Modus freigeschaltete Bot-Stärke — sowohl
                auf diesem Gerät als auch in der Cloud, damit der alte Stand nicht bei
                einer Neuinstallation oder auf einem anderen Gerät wieder auftaucht. Die
                Willkommens-Sequenz läuft beim nächsten App-Start erneut. Dein Konto und
                ein bereits getätigter Kauf bleiben davon unberührt.
              </Text>
              {resetFehler && <Text style={styles.error}>{resetFehler}</Text>}
              <View style={styles.loeschButtonReihe}>
                <Pressable style={styles.sekundaerButton} onPress={() => setResetSchritt(0)}>
                  <Text style={styles.sekundaerButtonText}>Abbrechen</Text>
                </Pressable>
                <Pressable style={styles.testResetButton} onPress={spielstandZuruecksetzen} disabled={resetLaeuft}>
                  {resetLaeuft ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loeschButtonText}>Zurücksetzen</Text>
                  )}
                </Pressable>
              </View>
              </View>
            )}
            {resetSchritt === 2 && (
              <View style={styles.loeschBox}>
                <Text style={styles.body}>
                  Erledigt — beim nächsten App-Start läuft die Willkommens-Sequenz erneut.
                </Text>
                <Pressable style={styles.sekundaerButton} onPress={() => setResetSchritt(0)}>
                  <Text style={styles.sekundaerButtonText}>Ok</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

      {/* Provisorischer Testmodus (Claude-Projekt "ChessLynx", 2026-09-09) — auf
          ausdrücklichen Nutzerwunsch ergänzt, um beim Smoke-Test der Sprach-
          vervollständigung und der neuen "Lux fragen"-Hinweisfunktion nicht jedes Mal
          den kompletten Lernpfad (sechs Waldabenteuer, Bonuskapitel-Kette) neu
          durchspielen zu müssen, gerade nach einem "Spielstand zurücksetzen" (siehe
          oben). Bewusst über `__DEV__` statt eines eigenen Schalters/Flags realisiert
          — verschwindet dadurch automatisch in einer Store-/Produktions-Version, ohne
          dass diese Sektion später manuell wieder ausgebaut werden müsste. Ersetzt
          NICHT die eigentliche Freispiel-Kartenanbindung (Schritt #77 aus der
          Roadmap, siehe projektwissen.md), die weiterhin offen ist — die Buttons hier
          sind ein reiner Entwickler-/Test-Shortcut, kein Kind-Zugang. Die
          Bonuskapitel-Buttons springen bewusst direkt zur jeweiligen Route (nicht über
          den Umweg über ein Revier), da die eigentliche Erstlehre-Kachel in Revier.tsx
          erst nach dem Laden des jeweiligen Reviers erscheint — für gezieltes Testen
          einzelner Kapitel reicht das nicht.

          Update (2026-09-09, Nutzer-Feedback nach Gerätetest: "Bitte im Elternmenü
          auch alle Basisquests einzeln auswählen lassen, König kann aktuell nicht
          getestet werden, noch nicht freigespielt") — ergänzt um eine Zeile
          "Waldabenteuer (Grundfiguren)" mit allen sechs Quest-Buttons, aus demselben
          Grund wie oben bei den Bonuskapitel-Buttons: LuchsRevierKarte.tsx schaltet auf
          der Karte immer nur die jeweils nächste noch unerledigte Quest frei
          (naechsterIndex-Logik dort), Quest 6 (König) wäre über die Karte also erst
          nach dem Durchspielen von Quest 1-5 überhaupt antippbar. Bewusst als reiner
          direkter navigation.navigate-Sprung gelöst (wie bei den Bonuskapitel-Buttons),
          NICHT über eine Manipulation von questFortschritt: kein Risiko, dabei
          versehentlich echte Fortschrittsdaten (Sterne, "X von 6 gemeistert" oben in
          der Fortschrittsanzeige) zu verfälschen — die Quest-Screens selbst brauchen
          keinen Fortschritt der vorherigen Quests, um zu funktionieren. Reihenfolge/
          Figurnamen wie FIGUR_REIHENFOLGE oben (dabei fiel die dortige Turm/Springer-
          Verwechslung zwischen Quest 2 und 4 auf und wurde korrigiert, siehe dortiger
          Kommentar). */}
      {__DEV__ && (
        <View>
          <Text style={styles.sectionTitle}>Testmodus (nur Entwicklung)</Text>
          <View style={styles.panel}>
            <Text style={styles.body}>
              Springt direkt zu einem Bildschirm, ohne den Lernpfad durchzuspielen. Nur in
              Entwicklungs-Builds sichtbar, kein Bestandteil der Kind-Oberfläche.
            </Text>
            {/* Ergänzt (2026-09-10, Kurztest-Feedback "Willkommensbildschirm nach Video
                erscheint nicht mehr, es geht direkt zur Saga-Karte"): kein Bug — die
                Sequenz läuft laut Design (siehe WillkommensSequenz.tsx-Kopfkommentar und
                lib/storage.ts, WILLKOMMEN_GESEHEN_KEY) bewusst nur beim allerersten
                App-Start, das Flag war auf diesem Testgerät aus einem früheren Durchlauf
                bereits gesetzt. Dieser Button setzt das Flag zurück und springt direkt
                zur Sequenz, damit sie erneut angesehen werden kann, ohne die App
                neu zu installieren/Daten zu löschen. */}
            <Text style={styles.testGruppenTitel}>Willkommens-Sequenz</Text>
            <View style={styles.testKnopfReihe}>
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  await AsyncStorage.removeItem("chesslynx:hatWillkommenGesehen");
                  navigation.navigate("WillkommensSequenz");
                }}
              >
                <Text style={styles.testKnopfText}>Erneut ansehen (setzt Flag zurück)</Text>
              </Pressable>
            </View>
            <Text style={styles.testGruppenTitel}>Waldabenteuer (Grundfiguren)</Text>
            <View style={styles.testKnopfReihe}>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Quest1")}>
                <Text style={styles.testKnopfText}>1. Bauer (Igel)</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Quest2")}>
                <Text style={styles.testKnopfText}>2. Turm (Bär)</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Quest3")}>
                <Text style={styles.testKnopfText}>3. Läufer (Eule)</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Quest4")}>
                <Text style={styles.testKnopfText}>4. Springer (Pferd)</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Quest5")}>
                <Text style={styles.testKnopfText}>5. Dame (Schwan)</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Quest6")}>
                <Text style={styles.testKnopfText}>6. König (Hirsch)</Text>
              </Pressable>
            </View>
            <Text style={styles.testGruppenTitel}>Bonuskapitel</Text>
            <View style={styles.testKnopfReihe}>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Fesselung")}>
                <Text style={styles.testKnopfText}>Fesselung</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Rochade")}>
                <Text style={styles.testKnopfText}>Rochade</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Figurenwert")}>
                <Text style={styles.testKnopfText}>Figurenwert</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("MattIn2")}>
                <Text style={styles.testKnopfText}>Matt in 2</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("MattIn3")}>
                <Text style={styles.testKnopfText}>Matt in 3</Text>
              </Pressable>
            </View>
            {/* Paket 3 (2026-09-11): Steinbrücke + Kapitel „Die ganze Partie". Der
                Schildkröten-Wegpunkt auf der Karte ist erst antippbar, sobald alle sechs
                Basisquests geschafft sind (siehe lib/gate.ts) — "Burgtor-Test" markiert dafür
                alle sechs Quests (bereits geschaffte behalten ihre Sterne).
                Nachtrag 2026-09-17: die vier Erstlehre-Kapitel werden hier trotzdem gleich
                mitgesetzt, rein als praktischer Test-Shortcut — sie sind seit der
                Bonuskapitel→Gefährtensaga-Neuordnung nicht mehr Voraussetzung fürs Burgtor. */}
            <Text style={styles.testGruppenTitel}>Steinbrücke (Schildkröte)</Text>
            <View style={styles.testKnopfReihe}>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("GanzePartie")}>
                <Text style={styles.testKnopfText}>Die ganze Partie</Text>
              </Pressable>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("Steinbruecke")}>
                <Text style={styles.testKnopfText}>Steinbrücke</Text>
              </Pressable>
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  await saveBonusFortschrittLocal("ganzePartie", false);
                  await loescheGanzePartieEtappe();
                  setGanzePartieGeschafft(false);
                  setGanzePartieEtappe(0);
                  setTestMeldung("✓ Kapitel zurückgesetzt — beim nächsten Besuch der Schildkröte startet es neu.");
                }}
              >
                <Text style={styles.testKnopfText}>Kapitel-Flag zurücksetzen</Text>
              </Pressable>
              {/* Paket 3c: Rückkehr-Screen testen — so tun, als wären drei Etappen geschafft. */}
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  await saveBonusFortschrittLocal("ganzePartie", false);
                  await loescheGanzePartieEtappe();
                  await speichereGanzePartieEtappe(3);
                  setGanzePartieGeschafft(false);
                  setGanzePartieEtappe(3);
                  setTestMeldung("✓ Zwischenstand 3 von 5 gesetzt — jetzt die Schildkröte auf der Karte antippen.");
                }}
              >
                <Text style={styles.testKnopfText}>Zwischenstand: 3 Etappen</Text>
              </Pressable>
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  for (const id of ["quest1", "quest2", "quest3", "quest4", "quest5", "quest6"]) {
                    const alt = await loadQuestFortschrittLocal(id);
                    if (!alt?.abgeschlossen) {
                      await saveQuestFortschrittLocal(id, { sterne: 3, abgeschlossen: true, letzterSchritt: "test" });
                    }
                  }
                  for (const id of ["fesselung", "rochade", "figurenwert", "mattIn2"] as const) {
                    await saveBonusFortschrittLocal(id, true);
                  }
                  setTestMeldung(
                    "✓ Burgtor ist offen — Erstlehre-Kapitel zusätzlich als geschafft markiert, Ruhmeshalle-Ring öffnet sich ab 1 Stern bei Eichhörnchen."
                  );
                }}
              >
                <Text style={styles.testKnopfText}>Burgtor-Test (alles geschafft)</Text>
              </Pressable>
            </View>
            {/* Nutzerwunsch 2026-09-14 („Inhalt komplett freigespielt, sonst sehe ich das
                nicht"): Der Burgtor-Test oben öffnet nur das Gate — er lässt Matt in 3
                (die Kür), das Kapitel „Die ganze Partie" und die Willkommenssequenz
                unberührt. Die Steinbrücke springt dann beim Besuch weiterhin sofort ins
                Kapitel, statt ihre beiden Kacheln zu zeigen, und wer die Karte ansehen will,
                sitzt erst in der Begrüßung fest.

                Dieser Knopf setzt deshalb ALLES, was ein Kind in Version 1.0 überhaupt
                erreichen kann. Was er bewusst NICHT tut: die sieben Gefährten im Oberland
                freischalten — die sind Update-1-Inhalt und bleiben gesperrt, gedimmt und
                nicht antippbar. Das ist kein Fehler des Knopfes, sondern der Auslieferungs-
                stand.

                Rückgängig machen: „Spielstand zurücksetzen" weiter oben auf dieser Seite. */}
            <Text style={styles.testGruppenTitel}>Alles freischalten</Text>
            <View style={styles.testKnopfReihe}>
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  // Sechs Quests: bereits geschaffte behalten ihre Sterne — ein Testknopf
                  // soll keine echten Ergebnisse überschreiben (gleiche Regel wie oben).
                  for (const id of ["quest1", "quest2", "quest3", "quest4", "quest5", "quest6"]) {
                    const alt = await loadQuestFortschrittLocal(id);
                    if (!alt?.abgeschlossen) {
                      await saveQuestFortschrittLocal(id, { sterne: 3, abgeschlossen: true, letzterSchritt: "test" });
                    }
                  }
                  // Alle fünf Lernkapitel, also inklusive Matt in 3 — das ist die echte,
                  // optionale Kür und fehlt im Burgtor-Test bewusst.
                  for (const id of ["fesselung", "rochade", "figurenwert", "mattIn2", "mattIn3"] as const) {
                    await saveBonusFortschrittLocal(id, true);
                  }
                  // „Die ganze Partie" als gespielt markieren und den Zwischenstand löschen:
                  // Sonst zeigt die Steinbrücke beim Besuch den Rückkehr-Screen statt der
                  // Bots-/Puzzles-Wahl.
                  await saveBonusFortschrittLocal("ganzePartie", true);
                  await loescheGanzePartieEtappe();
                  // Begrüßung und Farbeinführung als gesehen markieren — beide laufen sonst
                  // vor der Karte ab und stehen jedem schnellen Blick im Weg.
                  await setWillkommenGesehen();
                  await markiereFarbeinfuehrungGezeigt();
                  setGanzePartieGeschafft(true);
                  setGanzePartieEtappe(0);
                  setTestMeldung(
                    "✓ Alles freigespielt: sechs Abenteuer, fünf Lernkapitel, „Die ganze Partie\", Burgtor offen, Begrüßung übersprungen. Die sieben Gefährten im Oberland bleiben gesperrt — die kommen erst mit Update 1."
                  );
                }}
              >
                <Text style={styles.testKnopfText}>Inhalt komplett freispielen</Text>
              </Pressable>
              {/* Nutzerwunsch 2026-09-14 („ungedimmt und nebelfrei anzeigen"): Die sieben
                  Gefährten im Oberland lassen sich NICHT freischalten — es gibt keine
                  Screens hinter ihnen (der Navigator kennt keine Revier-Route, keine
                  Ruhmeshalle, keinen Wisent-Kampf). Was geht, ist sie so zu ZEIGEN, wie sie
                  später aussehen: volle Deckkraft, Nebel weg. Antippbar werden sie dadurch
                  nicht — deshalb heißt der Knopf „Vorschau" und nicht „freischalten". */}
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  const neu = !gefaehrtenVorschau;
                  await setzeTestAnsicht("gefaehrtenVorschau", neu);
                  setGefaehrtenVorschau(neu);
                  setTestMeldung(
                    neu
                      ? "✓ Gefährten-Vorschau an — zurück zur Karte und nach oben scrollen. Antippbar sind sie weiterhin nicht, dahinter gibt es noch keine Screens."
                      : "✓ Gefährten-Vorschau aus — das Oberland zeigt wieder den Auslieferungsstand."
                  );
                }}
              >
                <Text style={styles.testKnopfText}>
                  Gefährten-Vorschau: {gefaehrtenVorschau ? "an" : "aus"}
                </Text>
              </Pressable>
              {/* Nutzerwunsch 2026-09-14 („eine Option, wo die freigespielten Figuren
                  trotzdem grüßen, um die Animationen zu testen"): Die Geste hängt sonst an
                  „nächste Station" — nach dem Freispielen gibt es keine mehr, und damit
                  auch keine Geste zu sehen. Dieser Schalter lässt alle erledigten
                  Quest-Tiere mitgrüßen.

                  Gilt nur für die sechs Quest-Tiere: Sie haben eine Zustandsfamilie
                  (grund/blinzeln/geste). Schildkröte und die sieben Gefährten sind
                  Standbilder ohne Gesten-Asset — sie können nicht grüßen, solange es die
                  Bilder dafür nicht gibt. */}
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  const neu = !alleGruessen;
                  await setzeTestAnsicht("alleGruessen", neu);
                  setAlleGruessen(neu);
                  setTestMeldung(
                    neu
                      ? "✓ Alle grüßen an — auf der Karte winken/nicken jetzt auch die schon erledigten Quest-Tiere in ruhigen Abständen. Schildkröte und Gefährten sind Standbilder und bleiben ruhig."
                      : "✓ Alle grüßen aus — es grüßt wieder nur das Tier, das als nächstes dran ist."
                  );
                }}
              >
                <Text style={styles.testKnopfText}>
                  Alle Tiere grüßen: {alleGruessen ? "an" : "aus"}
                </Text>
              </Pressable>
              {/* Eigener Schalter seit 2026-09-14 (Nutzer: „vorher war er komplett weg, seit
                  den Grußbewegungen ist er wieder da"): Die Nebelfreiheit hing vorher an der
                  Gefährten-Vorschau — dort ist sie ein Nebeneffekt, kein Zweck. Wer die
                  Vorschau ausschaltete, holte sich den Nebel ungewollt zurück. Jetzt
                  unabhängig, und er nimmt den Nebel auf der GANZEN Karte weg, nicht nur im
                  Oberland. */}
              <Pressable
                style={styles.testKnopf}
                onPress={async () => {
                  const neu = !nebelAus;
                  await setzeTestAnsicht("nebelAus", neu);
                  setNebelAus(neu);
                  setTestMeldung(
                    neu
                      ? "✓ Nebel aus — Oberland und Karte liegen komplett frei, unabhängig vom Fortschritt. Gut zum Prüfen von Figuren und Animationen; der Nebel ist im Auslieferungsstand ein Fortschrittsanzeiger."
                      : "✓ Nebel an — die Karte zeigt wieder den Nebel zum aktuellen Spielstand."
                  );
                }}
              >
                <Text style={styles.testKnopfText}>Nebel aus: {nebelAus ? "an" : "aus"}</Text>
              </Pressable>
            </View>
            {testMeldung && <Text style={styles.body}>{testMeldung}</Text>}
            <Text style={styles.testGruppenTitel}>Freispiel / Endlosspiel</Text>
            <View style={styles.testKnopfReihe}>
              <Pressable style={styles.testKnopf} onPress={() => navigation.navigate("FreispielScreen")}>
                <Text style={styles.testKnopfText}>Übungslichtung (Liste)</Text>
              </Pressable>
              <Pressable
                style={styles.testKnopf}
                onPress={() => navigation.navigate("FreispielPartie", { elo: ersteStufe().elo })}
              >
                <Text style={styles.testKnopfText}>Partie direkt starten</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

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
  // Bewusst Salbeigrün statt des Warnrot von loeschButton — dieser Reset ist nicht
  // destruktiv fürs Konto, nur ein lokaler Test-Reset (siehe useState-Kommentar oben).
  testResetButton: {
    backgroundColor: "#8FA888",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  // Provisorischer Testmodus (siehe JSX-Kommentar oben, __DEV__-only) — dieselbe
  // ruhige Salbeigrün-Optik wie testResetButton, damit die Sektion sich nicht wie ein
  // Warn-/Löschen-Element anfühlt, obwohl sie rein für Entwickler:innen gedacht ist.
  testGruppenTitel: { fontSize: 13, fontWeight: "700", color: "#6E6050", marginTop: 12, marginBottom: 6 },
  testKnopfReihe: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  testKnopf: {
    backgroundColor: "#EFE9D8",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  testKnopfText: { color: "#4A4038", fontSize: 13, fontWeight: "600" },
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
