// Update-1-Vorzug (2026-09-15): Screen für EINE Endlosmodus-Fokus-Spalte (z. B. Dachshöhle
// "Figur gewinnen") — zeigt die drei Sterne-Stellungen als antippbare Reihe, öffnet beim
// Antippen die passende EndlosmodusPuzzle-Aufgabe, speichert den Fortschritt danach.
//
// Bewusst EIN gemeinsamer Screen für alle sieben spielbaren Spalten (status "bereit" in
// lib/endlosmodusSpalten.ts) statt eigener Dateien je Spalte — dieselbe Struktur-
// entscheidung wie bei screens/Revier.tsx für die fünf Gefährten.
//
// Kein Reihenfolge-Zwang innerhalb der Spalte (siehe lib/endlosmodusFortschritt.ts,
// "beliebig oft wiederholbar") — bei den fünf klassischen Drei-Aufgaben-Spalten sind alle
// drei Sterne von Anfang an antippbar, gelöste Sterne bleiben dauerhaft als gefüllter Stern
// markiert.
//
// Nachtrag (2026-09-17, Christian: "10x Stufe eins ..., 8x Stufe zwei, 5x Stufe drei", siehe
// claude/taktik_schwierigkeitseskalation_konzept_2026-09-16.md): die beiden "Figur gewinnen"-
// Spalten haben jetzt 23 statt 3 Aufgaben (siehe endlosmodusAufgaben.tsx). Für sie zeigt
// dieser Screen NICHT mehr die alte Drei-Sterne-Kachelreihe, sondern eine fortlaufende
// Aufgabenfolge: die jeweils nächste offene Aufgabe wird automatisch geöffnet ("dort
// weitermachen, wenn man aussteigt", siehe endlosmodusFortschritt.ts, naechsteOffeneAufgabe
// InSpalte), mit einer Fortschrittsanzeige ("Stufe 1 · Aufgabe 4 von 10") und derselben
// Drei-Sterne-Reihe darüber — hier aber als reine STUFEN-Fortschrittsanzeige, nicht mehr als
// Tipp-Ziel. Die fünf klassischen Spalten (Schach lösen, Rochade, Fesselung) bleiben exakt
// beim bisherigen Verhalten (siehe `istEskaliert` unten).
//
// Nachtrag (2026-09-18, Christian: "Sprachausgabe Deutsch vervollständigen ... Begriffe, die
// verwendet werden, erstmalig mit einer knappen Erklärung eingeführt"): Dieser Screen — und
// mit ihm der gesamte Endlosmodus — hatte bis hierhin GAR KEINE Lux-Sprechzeile (siehe
// bisheriger Kopfkommentar in lib/EndlosmodusPuzzle.tsx: "für den Endlosmodus existiert noch
// keine freigegebene Sprechzeile"). Jetzt spricht Lux beim Betreten einer Spalte EINMAL eine
// kurze Einführung, die den taktischen Begriff der Spalte nennt UND knapp erklärt (siehe
// `einfuehrungZeileFuerSpalte` unten) — für "Gabel" und "Spieß" ist das zugleich die ERSTE
// gesprochene Einführung dieser Begriffe überhaupt in der App (siehe claude/
// sprachausgabe_nichtueberspringbarkeit_audit_2026-09-18.md, Fund P2). Läuft nur EINMAL pro
// Spalten-Aufruf (nicht vor jeder der bis zu 23 Einzelaufgaben — das wäre bei einer so langen
// Aufgabenfolge unnötig repetitiv, siehe Kommentar an der `useLuxSprechzeile`-Aufrufstelle
// unten), dafür aber wie überall sonst in der App NICHT überspringbar: die Sterne-Kacheln
// (klassische Spalten) bzw. die Aufgabe selbst (eskalierte Spalten) werden erst nach dem
// tatsächlichen Sprechende bedienbar (`fertigGesprochen`, siehe useLuxSprechzeile.ts/
// Quest1.tsx-Kommentar zum identischen Muster) — "Zurück" bleibt dabei die einzige jederzeit
// mögliche Eingabe.

import { useCallback, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { SternIcon } from "../lib/sternenleiter";
import { t } from "../lib/sprache";
import { EndlosmodusPuzzle } from "../lib/EndlosmodusPuzzle";
import { ENDLOSMODUS_AUFGABEN } from "../lib/endlosmodusAufgaben";
import { spalteById, type EndlosmodusSpalteId } from "../lib/endlosmodusSpalten";
import { stufeUndPositionFuerIndex, stufenFuerSpalte } from "../lib/endlosmodusStufen";
import {
  ladeEndlosmodusFortschritt,
  meldeAufgabeGeloest,
  naechsteOffeneAufgabeInSpalte,
  sterneInSpalte,
  type EndlosmodusFortschritt,
} from "../lib/endlosmodusFortschritt";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { LuxEckIcon } from "../lib/luxAssets";
import { LuxSprechblase } from "../components/LuxSprechblase";

export type EndlosmodusSpalteParams = { spalteId: EndlosmodusSpalteId };

// Als FUNKTION statt Konstante (siehe gleichlautender Kommentar in den sechs Quest-Dateien,
// z. B. quest1/Quest1.tsx screenScripts()): `t()` liest die Sprache erst beim tatsächlichen
// Aufruf, nicht beim Modul-Import — sonst würde die Zeile dauerhaft auf der beim App-Start
// aktiven Sprache einfrieren.
//
// Jede Zeile nennt den Begriff der Spalte und erklärt ihn in ein bis zwei kurzen, kindgerechten
// Sätzen (dieselbe Kürze/Bildsprache wie in den Bonuskapiteln, z. B. bonus/Fesselung.tsx). Die
// Erklärung ist bewusst in sich abgeschlossen — sie setzt NICHT voraus, dass das jeweilige
// Bonuskapitel zum selben Begriff schon gespielt wurde, weil der Endlosmodus auch unabhängig
// davon erreichbar ist.
function einfuehrungZeileFuerSpalte(id: EndlosmodusSpalteId): string {
  switch (id) {
    case "eichhoernchen_figurGewinnen":
    case "dachshoehle_figurGewinnen":
      return t(
        "Hier übst du, ungeschützte Figuren zu erobern. Manche gegnerischen Figuren stehen einfach so da, ohne dass sie jemand deckt — finde sie!",
        "Here you practice capturing undefended pieces. Some of the opponent's pieces just stand there with nobody protecting them — find them!"
      );
    case "eichhoernchen_gabel":
      return t(
        "Hier lernst du die Gabel kennen. Eine einzige Figur bedroht auf einmal zwei gegnerische Figuren gleichzeitig — oft gibt sie sogar Schach dabei. Der Gegner kann nur eine der beiden retten.",
        "Here you'll learn the fork. A single piece threatens two of the opponent's pieces at the same time — often giving check as well. The opponent can only save one of them."
      );
    case "rabenfels_schach":
    case "dachshoehle_schach":
      return t(
        "Hier übst du, ein Schach zu lösen. Dein König wird bedroht — finde den Zug, der ihn wieder in Sicherheit bringt.",
        "Here you practice escaping check. Your king is under attack — find the move that brings him back to safety."
      );
    case "rabenfels_fesselungSetzen":
      return t(
        "Hier übst du, selbst eine Fesselung zu bauen. Stell deine Figur so auf, dass eine gegnerische Figur sich nicht mehr von ihrem König lösen darf.",
        "Here you practice setting a pin yourself. Place your piece so that an opponent's piece can no longer move away from its king."
      );
    case "dachshoehle_rochade":
      return t(
        "Hier übst du die Rochade. König und Turm tauschen gemeinsam die Plätze — ein besonderer Doppelzug, den es nur einmal im ganzen Spiel gibt.",
        "Here you practice castling. The king and rook swap places together — a special double move you can only do once in the whole game."
      );
    case "adlerhorst_fesselung":
    case "wolfsfeste_fesselung":
      return t(
        "Hier übst du, eine Fesselung zu lösen. Eine deiner Figuren ist an ihren König gekettet — schlägst du die fesselnde Figur, ist sie wieder frei.",
        "Here you practice escaping a pin. One of your pieces is chained to its king — capture the pinning piece, and it's free again."
      );
    case "adlerhorst_spiess":
      return t(
        "Hier lernst du den Spieß kennen. Du gibst Schach, der König muss weichen — und genau dahinter steht eine zweite gegnerische Figur, die dadurch plötzlich ungeschützt daliegt.",
        "Here you'll learn the skewer. You give check, the king has to move — and right behind him stands a second enemy piece that suddenly stands undefended."
      );
    case "eichhoernchen_figurenwert":
    case "wolfsfeste_mattIn2":
      // Status "folgt" (siehe endlosmodusSpalten.ts) — dieser Screen zeigt diese Spalten
      // ohnehin nie an (Revier.tsx verlinkt nur "bereit"-Spalten), Zeile hier nur der
      // Vollständigkeit halber, falls sich das künftig ändert.
      return t("Diese Übung kommt bald dazu.", "This exercise is coming soon.");
  }
}

export default function EndlosmodusSpalte() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const spalteId: EndlosmodusSpalteId = route.params?.spalteId;
  const spalte = spalteById(spalteId);
  const aufgaben = ENDLOSMODUS_AUFGABEN[spalteId];

  // Eskalierte Spalten (aktuell nur die beiden "Figur gewinnen"-Spalten, siehe Datei-
  // Kopfkommentar) erkennt der Screen rein an der Aufgabenanzahl — kein hartverdrahteter
  // Spaltenname hier, das entscheidet allein endlosmodusAufgaben.tsx/endlosmodusStufen.ts.
  const istEskaliert = (aufgaben?.length ?? 0) > 3;

  const [fortschritt, setFortschritt] = useState<EndlosmodusFortschritt>({});
  // Nur gesetzt, während "Von vorne üben" (siehe unten) aktiv ist — unabhängig vom
  // gespeicherten Fortschritt, da hier bereits gelöste Aufgaben zum Wiederholen erneut
  // gezeigt werden. null = normaler Modus (nächste offene Aufgabe, siehe naechsterIndex).
  const [uebungsIndex, setUebungsIndex] = useState<number | null>(null);
  // Für die klassischen Drei-Aufgaben-Spalten weiterhin per Sterne-Kachel wählbar.
  const [aktiverStern, setAktiverStern] = useState<0 | 1 | 2 | null>(null);

  const ladeFortschritt = useCallback(() => {
    ladeEndlosmodusFortschritt().then(setFortschritt);
  }, []);

  // Neu laden, wenn der Screen wieder in den Fokus kommt (z. B. Rückkehr aus einer
  // anderen Spalte) — deckt auch den ersten Mount mit ab, kein separater useEffect nötig.
  useFocusEffect(ladeFortschritt);

  // Nachtrag 2026-09-18 (siehe Datei-Kopfkommentar): EINE Sprechzeile je Spalten-Aufruf, kein
  // `onFertig` (kein automatischer Weiterlauf zu etwas — die Sterne-Kacheln/die Aufgabe werden
  // stattdessen unten per `fertigGesprochen` freigegeben) und `erinnerung: false` (dieselbe
  // Begründung wie beim Verwandlungs-Screen in Quest1.tsx: eine einmalige Einführung soll sich
  // nicht alle 8 Sekunden wiederholen, sobald sie einmal fertig gesprochen ist). Vor Hooks-
  // Regeln bewusst noch VOR dem `if (!aufgaben) return null;` unten aufgerufen.
  const { wiederholen, aktuelleZeile, fertigGesprochen } = useLuxSprechzeile(
    spalteId,
    () => einfuehrungZeileFuerSpalte(spalteId),
    undefined,
    { erinnerung: false }
  );
  const zeigeUntertitel = useUntertitelAktiv();

  if (!aufgaben) {
    // Sollte nicht erreichbar sein (Revier.tsx verlinkt nur "bereit"-Spalten), Sicherheitsnetz.
    return null;
  }

  const sterne = sterneInSpalte(fortschritt, spalteId);

  if (istEskaliert) {
    const stufen = stufenFuerSpalte(spalteId);
    const naechsterIndex = naechsteOffeneAufgabeInSpalte(fortschritt, spalteId);
    const alleGeloest = naechsterIndex >= aufgaben.length;
    // Im Übungsmodus (siehe "Von vorne üben" unten) zeigt der Screen `uebungsIndex`
    // unabhängig vom gespeicherten Fortschritt — sonst die nächste offene Aufgabe.
    const imUebungsModus = uebungsIndex !== null;
    const offenerIndex = imUebungsModus ? uebungsIndex! : naechsterIndex;

    async function handleEskaliertGeloest(index: number) {
      if (imUebungsModus) {
        // Bereits gelöste Aufgaben werden hier nur wiederholt (kein erneuter Speicher-
        // Schreibzugriff nötig, sie stehen schon auf `true`) — einfach zur nächsten
        // Übungsaufgabe weiter, oder zurück zur Übersicht, wenn die letzte erreicht ist.
        const naechsteUebung = index + 1;
        setUebungsIndex(naechsteUebung < aufgaben!.length ? naechsteUebung : null);
        return;
      }
      const neu = await meldeAufgabeGeloest(spalteId, index);
      setFortschritt(neu);
    }

    return (
      <View style={styles.wurzel}>
        <WaldHintergrund />
        <SafeAreaView style={styles.safe} pointerEvents="box-none">
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityLabel={t("Zurück", "Back")}
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            style={styles.zurueck}
          >
            <FarnZurueckIcon size={26} />
          </Pressable>
          <Pressable
            style={styles.luxCorner}
            onPress={wiederholen}
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            accessibilityLabel={t("Lux, tippen zum Wiederholen", "Lux, tap to repeat")}
          >
            <LuxEckIcon size={44} />
          </Pressable>
          {zeigeUntertitel && (
            <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={spalteId} style={styles.sprechblase} />
          )}

          <View style={styles.mitte}>
            <Text style={styles.titel}>{spalte.titel}</Text>
            <View style={styles.sterneReihe}>
              {([0, 1, 2] as const).map((i) => (
                <View key={i} style={styles.sternKachel}>
                  <SternIcon size={sterne > i ? 40 : 30} />
                </View>
              ))}
            </View>

            {/* Nachtrag 2026-09-18: die Aufgabe selbst (echte Zug-Eingabe) bzw. der "Von
                vorne üben"-Knopf erscheinen erst, nachdem Lux die Spalten-Einführung oben
                fertig gesprochen hat (siehe Datei-Kopfkommentar) — bis dahin ist hier
                bewusst nichts Antippbares zu sehen. */}
            {!fertigGesprochen ? null : alleGeloest && !imUebungsModus ? (
              <>
                <Text style={styles.fortschrittText}>
                  {t("Alle Aufgaben gemeistert! Du kannst jederzeit von vorne üben.", "All tasks mastered! You can practice from the start any time.")}
                </Text>
                <Pressable style={styles.uebenKnopf} onPress={() => setUebungsIndex(0)}>
                  <Text style={styles.uebenKnopfText}>{t("Von vorne üben", "Practice from the start")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                {(() => {
                  const { stufe, positionInStufe, groesseStufe } = stufeUndPositionFuerIndex(offenerIndex, stufen);
                  return (
                    <Text style={styles.fortschrittText}>
                      {t(
                        `Stufe ${stufe} · Aufgabe ${positionInStufe} von ${groesseStufe}`,
                        `Level ${stufe} · Task ${positionInStufe} of ${groesseStufe}`
                      )}
                    </Text>
                  );
                })()}
                <EndlosmodusPuzzle
                  key={offenerIndex}
                  aufgabe={aufgaben[offenerIndex]}
                  onSolved={() => handleEskaliertGeloest(offenerIndex)}
                />
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const geloest = fortschritt[spalteId] ?? [];

  async function handleSolved(sternIndex: 0 | 1 | 2) {
    const neu = await meldeAufgabeGeloest(spalteId, sternIndex);
    setFortschritt(neu);
    setAktiverStern(null);
  }

  return (
    <View style={styles.wurzel}>
      <WaldHintergrund />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Pressable
          onPress={() => (aktiverStern !== null ? setAktiverStern(null) : navigation.goBack())}
          accessibilityLabel="Zurück"
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          style={styles.zurueck}
        >
          <FarnZurueckIcon size={26} />
        </Pressable>
        <Pressable
          style={styles.luxCorner}
          onPress={wiederholen}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel={t("Lux, tippen zum Wiederholen", "Lux, tap to repeat")}
        >
          <LuxEckIcon size={44} />
        </Pressable>
        {zeigeUntertitel && (
          <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={spalteId} style={styles.sprechblase} />
        )}

        {aktiverStern !== null ? (
          <View style={styles.mitte}>
            <EndlosmodusPuzzle aufgabe={aufgaben[aktiverStern]} onSolved={() => handleSolved(aktiverStern)} />
          </View>
        ) : (
          <View style={styles.mitte}>
            <Text style={styles.titel}>{spalte.titel}</Text>
            <View style={styles.sterneReihe}>
              {([0, 1, 2] as const).map((i) => (
                // Nachtrag 2026-09-18 (siehe Datei-Kopfkommentar): erst antippbar, nachdem
                // Lux die Spalten-Einführung oben fertig gesprochen hat.
                <Pressable
                  key={i}
                  onPress={() => setAktiverStern(i)}
                  disabled={!fertigGesprochen}
                  accessibilityLabel={`Stern ${i + 1}${geloest[i] ? ", gelöst" : ""}`}
                  style={styles.sternKachel}
                >
                  <SternIcon size={geloest[i] ? 40 : 30} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wurzel: { flex: 1, backgroundColor: "#DCE7C8" },
  safe: { flex: 1 },
  zurueck: {
    position: "absolute",
    top: 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247,241,228,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // Nachtrag 2026-09-18 (siehe Datei-Kopfkommentar): dieser Screen hat — anders als die
  // Quest-/Bonuskapitel-Screens, wo Lux ihren Platz oben links exklusiv hat — bereits einen
  // eigenen Zurück-Knopf dort (`styles.zurueck` oben, endet bei y=64). Lux rückt deshalb
  // eine Zeile tiefer statt links daneben, um dieselbe, an LuxSprechblase fest verankerte
  // Rechts-Platzierung (siehe Quest1.tsx-Kommentar zur Herleitung) beizubehalten, ohne den
  // Zurück-Knopf zu verdecken. size=44 (statt 52 in den Quests) macht dabei zusätzlich Platz.
  luxCorner: { position: "absolute", top: 76, left: 24, zIndex: 10 },
  sprechblase: {
    position: "absolute",
    top: 72,
    left: 84,
    right: 16,
    maxHeight: 170,
    zIndex: 15,
  },
  mitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  titel: { fontSize: 20, fontWeight: "700", color: "#4A4038", marginBottom: 24 },
  sterneReihe: { flexDirection: "row", gap: 28, marginBottom: 12 },
  sternKachel: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(247,241,228,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  fortschrittText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A4038",
    marginBottom: 16,
    textAlign: "center",
    maxWidth: 280,
  },
  uebenKnopf: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(247,241,228,0.9)",
  },
  uebenKnopfText: { fontSize: 15, fontWeight: "700", color: "#4A4038" },
});
