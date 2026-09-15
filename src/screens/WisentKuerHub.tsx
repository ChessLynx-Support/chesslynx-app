// Kür-Auswahl-Hub — neuer gemeinsamer Screen vor dem Wisent-Kampf, siehe Claude-Projekt
// "ChessLynx", claude/gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 4, und
// claude/wisent_kuer_verdrahtung_2026-09-15.md. Ersetzt den bisherigen direkten Sprung vom
// Wisent-Torwächter (LuchsRevierKarte.tsx) zu screens/WisentKampf.tsx — der Torwächter führt
// jetzt hierher, "weiter zum Wisent" bleibt von hier aus jederzeit ein eigener Tipp.
//
// Drei gleichrangige, frei wählbare Kürs (Entscheidung 2026-09-10, siehe Konzeptdokument):
// Matt in 3 (bereits bestehendes Bonuskapitel, siehe bonus/MattIn3.tsx), Umwandlung
// (bonus/Umwandlung.tsx, neu), En passant (bonus/EnPassant.tsx, neu). Kein Gate — alle drei
// sind optional, "Du darfst wählen ... oder auch keine!".
//
// Bewusst KEIN Tap-Through-Bildschirm mit fester Screen-Sequenz wie die übrigen
// Bonuskapitel/Kürs — dieser Screen zeigt IMMER alle vier Optionen gleichzeitig (3 Kürs +
// "weiter zum Wisent"), nur die GESPROCHENE Begleitzeile ändert sich je nach Fortschritt
// (0/1/2/3 von 3 erledigt). Fortschritt wird bei jedem Erreichen neu aus AsyncStorage gelesen
// (`loadBonusFortschrittLocal`), damit ein frisch abgeschlossenes Kür-Kapitel (das über
// `navigation.navigate("WisentKuerHub")` hierher zurückkehrt) sofort korrekt gezählt wird —
// kein zusätzlicher Fokus-Listener nötig, weil jede Rückkehr hierher ein echter
// Navigations-Sprung ist (kein Zurück-Wisch), der die Komponente neu mounted.

import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { loadBonusFortschrittLocal, wisentKuerAlleDreiGezeigt, setWisentKuerAlleDreiGezeigt } from "../lib/storage";
import { ExtraSternchenIcon, KronenBauerIcon, SchattenSprungIcon } from "../lib/puzzleIcons";
import { KoenigMasterDunkelIcon } from "../lib/pieceMasters";
import { BadgeRahmen } from "../components/BadgeRahmen";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { luxVariante } from "../lib/luxVarianten";
import { WaldHintergrund } from "../components/WaldHintergrund";

const ERSTBESUCH_ZEILEN = [
  "Bevor wir zum Wisent aufbrechen, gibt es noch drei besondere Aufgaben für mutige Entdecker.",
  "Die Umwandlung, das Schlagen im Vorbeigehen – und das Treiben des Königs.",
  "Du darfst wählen, welche du zuerst probierst – oder auch keine!",
];
const EIN_VON_DREI_VARIANTEN = [
  "Eine kennst du schon! Willst du noch eine probieren?",
  "Weiter geht's — welche schauen wir uns als Nächstes an?",
];
const ZWEI_VON_DREI_VARIANTEN = ["Nur noch eine übrig — traust du dich?", "Fast geschafft! Die letzte wartet noch auf dich."];
const ALLE_DREI_ZEILE = "Du hast alle drei Geheimnisse gemeistert — der Wisent wird staunen!";
const JEDERZEIT_ZEILE = "Du darfst auch direkt zum Wisent weiterziehen, wenn du magst.";

const UEBERGANGS_PAUSE_MS = 1800;

type Fortschritt = { mattIn3: boolean; umwandlung: boolean; enPassant: boolean } | null;

// Platzhalter statt direktem `luxVariante(...)`-Aufruf in `zeilenFuer` — siehe
// bonus/Umwandlung.tsx-Kommentar bei derselben Konstante (dort ausführlich begründet):
// `zeilenFuer` läuft bei JEDEM Render (u. a. für `lines.length`), `luxVariante` darf aber nur
// beim tatsächlichen Sprechen laufen. Aufgelöst wird erst in `zeileAufloesen`, das
// ausschließlich innerhalb der an useLuxSprechzeile übergebenen lazy Funktion läuft.
const PLATZHALTER_1_VON_3 = "__KUERHUB_1VON3__";
const PLATZHALTER_2_VON_3 = "__KUERHUB_2VON3__";

function zeilenFuer(erledigtCount: number, alle3SchonGezeigt: boolean): string[] {
  if (erledigtCount === 0) return ERSTBESUCH_ZEILEN;
  if (erledigtCount === 1) return [PLATZHALTER_1_VON_3, JEDERZEIT_ZEILE];
  if (erledigtCount === 2) return [PLATZHALTER_2_VON_3, JEDERZEIT_ZEILE];
  // erledigtCount === 3
  return alle3SchonGezeigt ? [JEDERZEIT_ZEILE] : [ALLE_DREI_ZEILE, JEDERZEIT_ZEILE];
}

function zeileAufloesen(basis: string): string {
  if (basis === PLATZHALTER_1_VON_3) return luxVariante(EIN_VON_DREI_VARIANTEN, "kuerhub-1von3");
  if (basis === PLATZHALTER_2_VON_3) return luxVariante(ZWEI_VON_DREI_VARIANTEN, "kuerhub-2von3");
  return basis;
}

export default function WisentKuerHub() {
  const navigation = useNavigation<any>();
  const [fortschritt, setFortschritt] = useState<Fortschritt>(null);
  const [alle3SchonGezeigt, setAlle3SchonGezeigt] = useState(true); // Default "schon gezeigt" =
  // KEINE Sonderzeile, bis der echte Wert geladen ist — sicherer Default als umgekehrt, siehe
  // lib/luxHinweis.ts/useHinweisEinfuehrungGezeigt-Kommentar für dasselbe Prinzip: die Sonder-
  // zeile soll ein Kind, das sie schon kennt, nicht durch einen Ladezustands-Zufall erneut hören.
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [mattIn3, umwandlung, enPassant, schonGezeigt] = await Promise.all([
        loadBonusFortschrittLocal("mattIn3"),
        loadBonusFortschrittLocal("umwandlung"),
        loadBonusFortschrittLocal("enPassant"),
        wisentKuerAlleDreiGezeigt(),
      ]);
      if (abgebrochen) return;
      setFortschritt({ mattIn3, umwandlung, enPassant });
      setAlle3SchonGezeigt(schonGezeigt);
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const erledigtCount = fortschritt
    ? [fortschritt.mattIn3, fortschritt.umwandlung, fortschritt.enPassant].filter(Boolean).length
    : 0;
  const lines = fortschritt ? zeilenFuer(erledigtCount, alle3SchonGezeigt) : [];
  const isLastLine = lineIndex === lines.length - 1;

  const sprechSchluessel = `${erledigtCount}-${alle3SchonGezeigt}-${lineIndex}`;
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    fortschritt ? sprechSchluessel : "laedt",
    fortschritt ? () => zeileAufloesen(lines[lineIndex]) : undefined,
    !isLastLine
      ? () => setLineIndex((i) => i + 1)
      : erledigtCount === 3 && !alle3SchonGezeigt
        ? () => setWisentKuerAlleDreiGezeigt().then(() => setAlle3SchonGezeigt(true))
        : undefined
  );
  const zeigeUntertitel = useUntertitelAktiv();

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund />
      {/* Anders als in den übrigen Bonuskapiteln/Kürs gibt es hier keine "Zugaufgabe" und
          damit keine Lux-Hinweisfunktion (siehe lib/luxHinweis.ts-Geltungsbereich-Kommentar:
          nur Rätsel-Screens mit eigenem Zug) — Antippen wiederholt hier schlicht die aktuelle
          Zeile, dasselbe Grundverhalten wie überall sonst. */}
      <Pressable
        style={styles.luxCorner}
        onPress={wiederholen}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {zeigeUntertitel && fortschritt && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{aktuelleZeile}</Text>
        </View>
      )}

      <View style={styles.karten}>
        <Pressable
          style={styles.karte}
          onPress={() => navigation.navigate("MattIn3", { rueckkehrZiel: "WisentKuerHub" })}
          accessibilityLabel="Matt in 3"
        >
          <BadgeRahmen size={84} akzent={fortschritt?.mattIn3 ? "#D7A52D" : "#C9B79A"}>
            <ExtraSternchenIcon size={56} />
          </BadgeRahmen>
        </Pressable>
        <Pressable style={styles.karte} onPress={() => navigation.navigate("Umwandlung")} accessibilityLabel="Umwandlung">
          <BadgeRahmen size={84} akzent={fortschritt?.umwandlung ? "#D7A52D" : "#C9B79A"}>
            <KronenBauerIcon size={56} />
          </BadgeRahmen>
        </Pressable>
        <Pressable style={styles.karte} onPress={() => navigation.navigate("EnPassant")} accessibilityLabel="En passant">
          <BadgeRahmen size={84} akzent={fortschritt?.enPassant ? "#D7A52D" : "#C9B79A"}>
            <SchattenSprungIcon size={56} />
          </BadgeRahmen>
        </Pressable>
      </View>

      {/* "Jederzeit verfügbar" (Konzept Abschnitt 4) — eigenständiger, immer sichtbarer und
          antippbarer Weg zum Wisent-Kampf, unabhängig vom Kür-Fortschritt. Bewusst optisch
          abgesetzt (Terrakotta statt Gold) von den drei Kür-Karten oben, damit "hier geht's
          weiter" nicht mit einer vierten Kür verwechselt wird. */}
      <Pressable style={styles.weiterZumWisent} onPress={() => navigation.navigate("WisentKampf")} accessibilityLabel="Weiter zum Wisent">
        <BadgeRahmen size={104} akzent="#C9855F">
          <KoenigMasterDunkelIcon size={68} />
        </BadgeRahmen>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  sprechblase: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 20,
    marginHorizontal: 8,
    minHeight: 76,
    justifyContent: "center",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  sprechblaseSchweif: {
    position: "absolute",
    top: -6,
    left: 28,
    width: 14,
    height: 14,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  speech: { fontSize: 16, color: "#4A4038", textAlign: "center" },
  karten: { flexDirection: "row", justifyContent: "center", gap: 22, marginBottom: 36 },
  karte: { alignItems: "center", justifyContent: "center" },
  weiterZumWisent: { alignItems: "center", justifyContent: "center" },
});
