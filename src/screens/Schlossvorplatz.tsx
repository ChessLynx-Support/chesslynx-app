// Schlossvorplatz — echter Navigations-Knotenpunkt für die Bonuskapitel-Kette, siehe
// Claude-Projekt "ChessLynx", projektwissen.md ("Schlossvorplatz (erreicht bereits am Ende
// von Quest 6 ...) → [Bonuskapitel] → Schlosstor (Gate-Bedingung) → Schlosshof → ...").
// Ersetzt den bisherigen PROVISORISCHEN 7. KidHome-Button, der direkt und ausschließlich zu
// Fesselung führte (siehe RootNavigator.tsx-Kommentar zur alten Übergangslösung).
//
// Aufgabe dieses Screens:
//   1. Zeigt den Fortschritt über die vier gate-pflichtigen Bonuskapitel (Fesselung, Rochade,
//      Figurenwert, Matt in 2) — abgeschlossene Kapitel als erledigt markiert, das jeweils
//      nächste als "weiter hier"-Einstieg, spätere noch gesperrt (der Kette folgend, siehe
//      bonuskapitel_screen_skripte.md: "es gibt keinen einzigen Ausstieg" aus der Kette).
//   2. Sobald alle vier UND alle sechs Basisquests abgeschlossen sind (siehe lib/gate.ts),
//      zeigt dieser Screen, dass sich das Schlosstor öffnet.
//   3. Bietet — sobald Matt in 2 abgeschlossen ist — zusätzlich einen freiwilligen Zugang zum
//      optionalen Matt-in-3-Extra-Kapitel (siehe bonuskapitel_screen_skripte.md, Abschnitt
//      "Matt in 3": "Erscheint am Ende von Matt in 2 als zusätzliche, freiwillig antippbare
//      Karte" — hier zusätzlich dauerhaft über den Schlossvorplatz erreichbar, nicht nur im
//      Moment des Abschlusses).
//
// BEWUSSTE SCOPE-GRENZE (siehe auch lib/gate.ts-Kopfkommentar): der eigentliche Inhalt HINTER
// dem geöffneten Schlosstor (Schlosshof mit Wiederholungspuzzles, Begegnung mit der
// Prinzessin, Thronsaal/Befreiung) ist ein eigener, umfangreicher Illustrations-/Content-
// Produktionsschritt und wird hier NICHT gebaut — der "Schlosstor offen"-Zustand zeigt
// stattdessen eine klar als vorläufig erkennbare Ankündigungs-Karte ("Das Tor öffnet sich!"),
// ohne die eigentliche Schlosshof-Szene vorzutäuschen.

import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { pruefeSchlosstorStatus, BONUSKAPITEL_ROUTEN, type SchlosstorStatus } from "../lib/gate";
import { loadBonusFortschrittLocal } from "../lib/storage";
import { ChessLynxButton } from "../components/ChessLynxButton";
import { BadgeRahmen } from "../components/BadgeRahmen";
import { KetteIcon, RochadeIcon, SternenleiterIcon, MattIn2Icon } from "../lib/puzzleIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { SchildkroeteIcon } from "../lib/schildkroete";

const KAPITEL_ANZEIGE: Record<
  keyof typeof BONUSKAPITEL_ROUTEN,
  { label: string; icon: (groesse: number) => React.ReactNode }
> = {
  fesselung: { label: "Fesselung", icon: (g) => <KetteIcon size={g} /> },
  rochade: { label: "Rochade", icon: (g) => <RochadeIcon size={g} /> },
  figurenwert: { label: "Figurenwert", icon: (g) => <SternenleiterIcon size={g} /> },
  mattIn2: { label: "Matt in 2", icon: (g) => <MattIn2Icon size={g} /> },
};
const KAPITEL_REIHENFOLGE: (keyof typeof BONUSKAPITEL_ROUTEN)[] = ["fesselung", "rochade", "figurenwert", "mattIn2"];

export default function Schlossvorplatz() {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<SchlosstorStatus | null>(null);
  const [mattIn3Erledigt, setMattIn3Erledigt] = useState(false);

  // Neu laden, sobald der Screen (wieder) sichtbar wird — z. B. nach Rückkehr aus einem
  // gerade abgeschlossenen Bonuskapitel (die Kette selbst führt zwar automatisch weiter,
  // aber ein Zurück-Navigieren oder ein erneuter Besuch soll immer den aktuellen Stand
  // zeigen, nicht einen veralteten).
  useFocusEffect(
    useCallback(() => {
      let abgebrochen = false;
      (async () => {
        const [s, mattIn3] = await Promise.all([pruefeSchlosstorStatus(), loadBonusFortschrittLocal("mattIn3")]);
        if (!abgebrochen) {
          setStatus(s);
          setMattIn3Erledigt(mattIn3);
        }
      })();
      return () => {
        abgebrochen = true;
      };
    }, [])
  );

  // Sprach-Vollständigkeit (Claude-Projekt "ChessLynx",
  // sprechzeilen_vorschlaege_bonus_endlosspiel_und_hinweisfunktion_2026-09-09.md, Fund
  // A2): der "Schlosstor öffnet sich"-Zustand hatte einen erklärenden zweiten Satz
  // (siehe styles.hinweis-Text unten, "Was dahinter wartet..."), der bisher NUR
  // sichtbar war, nie gesprochen — jetzt als echte Zwei-Zeilen-Sequenz, gleiches
  // lineIndex-Muster wie in den Bonuskapiteln (SCREEN_SCRIPTS), statt einer einzelnen
  // festen Zeichenkette.
  const statusSchluessel = !status
    ? "laden"
    : status.offen
      ? "offen"
      : status.naechstesBonuskapitel
        ? "weiter"
        : "warten";
  const luxLines: string[] =
    statusSchluessel === "laden"
      ? [""]
      : statusSchluessel === "offen"
        ? [
            // Aktualisiert 2026-09-10 (Claude-Projekt "ChessLynx",
            // gefaehrten_wisent_lichess_sprechtexte_final.md, Abschnitt 1): ersetzt die
            // alte Du-/Ihr-Inkonsistenz ("Ihr habt es geschafft!") und den vagen
            // Platzhalter ("Was dahinter wartet, zeigen wir euch schon bald.") durch die
            // finale, konkrete Vorschau auf die Gefährten-Kampagne.
            "Du hast es geschafft! Das Schlosstor öffnet sich!",
            // Paket 3 (2026-09-11): Übergangszeile Launch 1.0 (gefaehrten_wisent_lichess_
            // sprechtexte_final.md, Abschnitt 13) — die Gefährten kommen erst mit Update 1,
            // erreichbar ist ab jetzt die Schildkröte an der Steinbrücke (Kartenwegpunkt im
            // Oberland über der Wisentfeste). Mit Update 1 zurück auf „Dahinter liegt der
            // Wald – und fünf neue Freunde warten schon auf uns!".
            "Dahinter liegt der Wald – und an der Steinbrücke wartet die Schildkröte schon auf uns!",
            "Und du hast das alles ganz allein geschafft, du mutiger Entdecker!",
          ]
        : statusSchluessel === "weiter"
          ? ["Auf zum nächsten Lernkapitel!", "Der Weg zur Burg führt weiter!"]
          : ["Erst müssen alle sechs Waldabenteuer geschafft sein, bevor es hier weitergeht."];

  const [lineIndex, setLineIndex] = useState(0);
  // Zurücksetzen, sobald sich der eigentliche Status ändert (nicht bei jedem erneuten
  // Laden mit unverändertem Ergebnis) — `status` wird bei jedem Fokussieren neu vom
  // Server/Storage geladen (siehe useFocusEffect oben), bekommt dabei aber ein neues
  // Objekt auch dann, wenn sich inhaltlich nichts geändert hat.
  useEffect(() => {
    setLineIndex(0);
  }, [statusSchluessel]);

  const isLastLine = lineIndex === luxLines.length - 1;
  const { wiederholen, aktuelleZeile: luxZeile } = useLuxSprechzeile(
    `${statusSchluessel}-${lineIndex}`,
    luxLines[lineIndex],
    !isLastLine ? () => setLineIndex((i) => i + 1) : undefined
  );
  const zeigeUntertitel = useUntertitelAktiv();

  return (
    <SafeAreaView style={styles.safe}>
      <WaldHintergrund />
      <Pressable
        style={styles.luxCorner}
        onPress={wiederholen}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        accessibilityLabel="Lux, tippen zum Wiederholen"
      >
        <LuxEckIcon size={52} />
      </Pressable>
      {zeigeUntertitel && luxZeile !== "" && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{luxZeile}</Text>
        </View>
      )}

      {!status && (
        <View style={styles.mitte}>
          <ActivityIndicator color="#8FA888" />
        </View>
      )}

      {status && !status.offen && (
        <View style={styles.mitte}>
          <Text style={styles.ueberschrift}>Der Weg zur Burg</Text>
          {KAPITEL_REIHENFOLGE.map((id) => {
            const erledigt = status.bonuskapitelStatus[id];
            const istNaechstes = status.naechstesBonuskapitel === id;
            const anzeige = KAPITEL_ANZEIGE[id];
            return (
              <ChessLynxButton
                key={id}
                variante={erledigt ? "secondary" : "primary"}
                disabled={!erledigt && !istNaechstes}
                onPress={() => navigation.navigate(BONUSKAPITEL_ROUTEN[id])}
                icon={<BadgeRahmen size={44}>{anzeige.icon(30)}</BadgeRahmen>}
                accessibilityLabel={`Bonuskapitel — ${anzeige.label}${erledigt ? " (geschafft)" : ""}`}
                style={styles.kapitelAbstand}
              >
                {erledigt ? `${anzeige.label} ✓` : istNaechstes ? `${anzeige.label} — weiter!` : anzeige.label}
              </ChessLynxButton>
            );
          })}
          {!status.basisquestsVollstaendig && status.naechstesBonuskapitel === null && (
            <Text style={styles.hinweis}>
              Alle vier Lernkapitel sind geschafft — es fehlen nur noch die sechs Waldabenteuer, bevor sich das
              Schlosstor öffnet.
            </Text>
          )}
        </View>
      )}

      {status && status.offen && (
        <View style={styles.mitte}>
          <Text style={styles.ueberschrift}>Das Schlosstor öffnet sich!</Text>
          <Text style={styles.hinweis}>
            Du hast alle Waldabenteuer und alle vier Lernkapitel gemeistert. Dahinter liegt der Wald – und an der
            Steinbrücke wartet die Schildkröte!
          </Text>
          {/* Paket 3: direkter Weg zur Schildkröte (derselbe Screen wie der Kartenwegpunkt). */}
          <ChessLynxButton
            variante="primary"
            onPress={() => navigation.navigate("Steinbruecke")}
            icon={
              <BadgeRahmen size={44}>
                <SchildkroeteIcon size={34} />
              </BadgeRahmen>
            }
            accessibilityLabel="Zur Steinbrücke"
            style={styles.kapitelAbstand}
          >
            Zur Steinbrücke
          </ChessLynxButton>
          <ChessLynxButton
            variante="secondary"
            onPress={() => navigation.navigate("KidHome")}
            accessibilityLabel="Zurück zum Luchs-Revier"
            style={styles.kapitelAbstand}
          >
            Zurück zum Luchs-Revier
          </ChessLynxButton>
        </View>
      )}

      {/* Freiwillige Extra-Karte für Matt in 3 — erst sichtbar, sobald Matt in 2 (das letzte
          gate-pflichtige Kapitel) geschafft ist, siehe Datei-Kopfkommentar Punkt 3. */}
      {status?.bonuskapitelStatus.mattIn2 && (
        <ChessLynxButton
          variante="icon"
          onPress={() => navigation.navigate("MattIn3")}
          accessibilityLabel={`Extra-Aufgabe — Matt in 3${mattIn3Erledigt ? " (geschafft)" : ""}`}
          style={styles.extraKarte}
        >
          {mattIn3Erledigt ? "★ Extra: Matt in 3 ✓" : "★ Extra: Matt in 3"}
        </ChessLynxButton>
      )}
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
  mitte: { width: "100%", alignItems: "center", justifyContent: "center" },
  ueberschrift: { fontSize: 20, fontWeight: "700", color: "#4A4038", marginBottom: 16, textAlign: "center" },
  kapitelAbstand: { marginTop: 12, width: "100%" },
  hinweis: { fontSize: 14, color: "#6E6050", textAlign: "center", marginTop: 12, paddingHorizontal: 12 },
  extraKarte: { position: "absolute", bottom: 24, alignSelf: "center" },
});
