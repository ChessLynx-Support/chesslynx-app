// Wisent-Endspiel-Kür (Dame-Matt/Turm-Matt) — vierte, gleichrangige Kür im Hub (siehe
// screens/WisentKuerHub.tsx und claude/wisent_endspiel_kuer_kuratierung_2026-09-17.md).
//
// Bewusster Unterschied zu JEDEM bisherigen Bonuskapitel/Kür: kein geskriptetes "onlyTarget"-
// Rätsel mit fester Zugzahl (wie MattIn3.tsx), sondern eine echte, vom Kind selbst ausgespielte
// Mattführung — beliebig viele eigene Züge, freie Figurenwahl (König ODER Dame/Turm) über
// components/EndspielBrett.tsx. Der gegnerische, einsame König antwortet nach jedem Kind-Zug
// über lib/wisentEndspielFlucht.ts/waehleFluchtZug (siehe dortiger Kopfkommentar, warum bewusst
// NICHT waldfreundeBot.ts).
//
// Zehn Startstellungen je Unterthema (chessEngine.ts/WISENT_ENDSPIEL_DAME_POSITIONEN bzw.
// _TURM_POSITIONEN), Stufen A(4)/B(3)/C(3) — Sterne-Auswertung über lib/
// wisentEndspielFortschritt.ts (wiederverwendet dieselbe reine Logik wie der Endlosmodus,
// endlosmodusStufen.ts). Christians Entscheidung bei Rückfrage 2026-09-17: NUR Aufgaben-
// Fortschritt speichern, kein Zwischenstand einer einzelnen laufenden Mattführung.
//
// Bewusst OHNE "Lux fragen"-Hinweisfunktion (anders als die geskripteten Rätsel-Kapitel) — bei
// freier Mehrzug-Mattführung gibt es keinen einzelnen "nächsten richtigen Zug", den ein Hinweis
// sinnvoll vorschlagen könnte, ohne dem Kind die eigentliche Aufgabe (die Technik selbst
// erarbeiten) abzunehmen.

import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Chess } from "chess.js";
import {
  WISENT_ENDSPIEL_DAME_POSITIONEN,
  WISENT_ENDSPIEL_TURM_POSITIONEN,
  WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE,
  toAlgebraic,
  fromAlgebraic,
  type BoardSquare,
} from "../lib/chessEngine";
import { waehleFluchtZug } from "../lib/wisentEndspielFlucht";
import {
  ladeWisentEndspielFortschritt,
  meldeWisentEndspielAufgabeGeloest,
  sterneFuerThema,
  wisentEndspielVollstaendig,
  naechsteOffeneAufgabeFuerThema,
  type WisentEndspielThema,
} from "../lib/wisentEndspielFortschritt";
import { saveBonusFortschrittLocal } from "../lib/storage";
import { EndspielBrett } from "../components/EndspielBrett";
import { KoenigMasterDunkelIcon, DameMasterIcon, TurmMasterIcon } from "../lib/pieceMasters";
import { Sternensaeule } from "../lib/sternenleiter";
import { ExtraSternchenIcon } from "../lib/puzzleIcons";
import { BadgeRahmen } from "../components/BadgeRahmen";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { LuxEckIcon } from "../lib/luxAssets";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { WaldHintergrund } from "../components/WaldHintergrund";

type ScreenId = 0 | 1 | 2 | 3; // 0 Einladung, 1 Themenauswahl, 2 Gameplay, 3 Gesamtabschluss

// Nutzerfeedback 2026-09-09 ("Übergänge langsam gestalten"), konsistent zu den übrigen
// Bonuskapiteln.
const UEBERGANGS_PAUSE_MS = 1800;
// Etwas großzügiger für die Matt-/Patt-Meldung, damit das Kind sie in Ruhe lesen/hören kann,
// bevor automatisch weitergegangen wird.
const MELDUNGS_PAUSE_MS = 2200;
// Dieselbe "Bedenkzeit" wie screens/FreispielPartie.tsx, damit sich der Zug des flüchtenden
// Königs lebendiger anfühlt als ein sofortiger Automatismus.
const BOT_BEDENKZEIT_MS = 650;

const EINLADUNG_ZEILEN = [
  "Jetzt kommt eine große Aufgabe: Du darfst selbst einen König gefangen setzen!",
  "Wähle eine Dame oder einen Turm — und treibe den einsamen König ganz allein ins Matt.",
  "Nimm dir so viele Züge, wie du brauchst. Du schaffst das bestimmt!",
];
const ABSCHLUSS_ZEILEN = ["Unglaublich! Du hast beide Mattführungen gemeistert!", "Der Wisent wird über deine Klugheit staunen!"];
const AUSWAHL_ZEILE = "Wähle: Dame-Matt oder Turm-Matt — mit welcher Figur möchtest du üben?";
const SPIEL_ANWEISUNG_ZEILE = "Du bist Weiß. Wähle eine Figur, dann tippe auf das leuchtende Ziel.";
const MATT_ZEILE = "Matt! Du hast den König gefangen!";
const PATT_ZEILE = "Oh, das war ein Patt — unentschieden. Wir versuchen es gleich noch einmal!";

type Meldung = { art: "matt"; vollstaendig: boolean } | { art: "patt" } | null;

export default function WisentEndspielKuer() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<ScreenId>(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [fortschritt, setFortschritt] = useState<{ dame: boolean[]; turm: boolean[] } | null>(null);
  const [aktuellesThema, setAktuellesThema] = useState<WisentEndspielThema | null>(null);
  const [aktuellerIndex, setAktuellerIndex] = useState<number | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [, setVersion] = useState(0);
  const [ausgewaehlt, setAusgewaehlt] = useState<BoardSquare | null>(null);
  const [legalZiele, setLegalZiele] = useState<BoardSquare[]>([]);
  const [botDenkt, setBotDenkt] = useState(false);
  const [meldung, setMeldung] = useState<Meldung>(null);

  useEffect(() => {
    let abgebrochen = false;
    ladeWisentEndspielFortschritt().then((f) => {
      if (!abgebrochen) setFortschritt(f);
    });
    return () => {
      abgebrochen = true;
    };
  }, []);

  function neuZeichnen() {
    setVersion((v) => v + 1);
  }

  function starteAufgabe(thema: WisentEndspielThema, index: number) {
    const schluessel = WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE[index];
    const fen = (thema === "dame" ? WISENT_ENDSPIEL_DAME_POSITIONEN : WISENT_ENDSPIEL_TURM_POSITIONEN)[schluessel];
    setAktuellesThema(thema);
    setAktuellerIndex(index);
    setGame(new Chess(fen));
    setAusgewaehlt(null);
    setLegalZiele([]);
    setMeldung(null);
    setLineIndex(0);
    setScreen(2);
  }

  function themaWaehlen(thema: WisentEndspielThema) {
    const idx = fortschritt ? naechsteOffeneAufgabeFuerThema(fortschritt, thema) : 0;
    // Alle zehn Aufgaben schon gelöst (idx === 10, "kein offener Index mehr") -> von vorn, zum
    // Üben (kein Verlust-Malus, beliebig oft wiederholbar — dasselbe Prinzip wie im
    // Endlosmodus/Freispiel, siehe endlosmodusFortschritt.ts-Kommentar).
    starteAufgabe(thema, idx >= WISENT_ENDSPIEL_AUFGABEN_REIHENFOLGE.length ? 0 : idx);
  }

  async function behandleMatt() {
    if (!aktuellesThema || aktuellerIndex === null) return;
    const neu = await meldeWisentEndspielAufgabeGeloest(aktuellesThema, aktuellerIndex);
    setFortschritt(neu);
    const vollstaendig = wisentEndspielVollstaendig(neu);
    if (vollstaendig) await saveBonusFortschrittLocal("wisentEndspiel", true);
    setLineIndex(0);
    setMeldung({ art: "matt", vollstaendig });
  }

  function behandlePatt() {
    setLineIndex(0);
    setMeldung({ art: "patt" });
  }

  function nachZugPruefen(g: Chess) {
    if (g.isCheckmate()) {
      behandleMatt();
      return;
    }
    if (g.isStalemate() || g.isDraw()) {
      behandlePatt();
      return;
    }
    // Schwarz (der flüchtende König) ist jetzt am Zug.
    setBotDenkt(true);
    setTimeout(() => {
      const zug = waehleFluchtZug(g);
      if (zug) g.move({ from: zug.from, to: zug.to });
      setBotDenkt(false);
      neuZeichnen();
      if (g.isStalemate() || g.isDraw()) behandlePatt();
      // g.isCheckmate() hier ist ausgeschlossen: der flüchtende König ist die einzige
      // schwarze Figur, ein nackter König kann selbst kein Schach bieten.
    }, BOT_BEDENKZEIT_MS);
  }

  function feldAntippen(r: number, c: number) {
    if (!game || botDenkt || meldung) return;
    const ziel: BoardSquare = { row: r, col: c };
    const istZiel = legalZiele.some((z) => z.row === r && z.col === c);

    if (ausgewaehlt && istZiel) {
      game.move({ from: toAlgebraic(ausgewaehlt), to: toAlgebraic(ziel), promotion: "q" });
      setAusgewaehlt(null);
      setLegalZiele([]);
      neuZeichnen();
      nachZugPruefen(game);
      return;
    }

    const feld = game.get(toAlgebraic(ziel));
    if (feld && feld.color === "w" && game.turn() === "w") {
      setAusgewaehlt(ziel);
      const zuege = game.moves({ square: toAlgebraic(ziel), verbose: true }) as Array<{ to: string }>;
      setLegalZiele(zuege.map((z) => fromAlgebraic(z.to as any)));
      return;
    }
    setAusgewaehlt(null);
    setLegalZiele([]);
  }

  const koenigInSchachFeld: BoardSquare | null = useMemo(() => {
    if (!game || !game.inCheck()) return null;
    const brett = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const feld = brett[r][c];
        if (feld && feld.type === "k" && feld.color === game.turn()) return { row: r, col: c };
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `game` ist mutable (chess.js),
    // `version` (über neuZeichnen) ist das eigentliche Re-Render-Signal, dasselbe Muster wie
    // in screens/FreispielPartie.tsx.
  }, [game]);

  function zeileFuerAktuellenScreen(): string {
    if (screen === 0) return EINLADUNG_ZEILEN[lineIndex] ?? "";
    if (screen === 1) return AUSWAHL_ZEILE;
    if (screen === 2) {
      if (meldung?.art === "matt") return MATT_ZEILE;
      if (meldung?.art === "patt") return PATT_ZEILE;
      return SPIEL_ANWEISUNG_ZEILE;
    }
    return ABSCHLUSS_ZEILEN[lineIndex] ?? "";
  }
  const istLetzteEinladungszeile = screen === 0 && lineIndex === EINLADUNG_ZEILEN.length - 1;
  const istLetzteAbschlusszeile = screen === 3 && lineIndex === ABSCHLUSS_ZEILEN.length - 1;

  const sprechSchluessel = `${screen}-${lineIndex}-${meldung?.art ?? "still"}`;
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(sprechSchluessel, () => zeileFuerAktuellenScreen(), () => {
    if (screen === 0) {
      if (!istLetzteEinladungszeile) {
        setLineIndex((i) => i + 1);
      } else {
        setTimeout(() => setScreen(1), UEBERGANGS_PAUSE_MS);
      }
      return;
    }
    if (screen === 2 && meldung) {
      setTimeout(() => {
        if (meldung.art === "matt") {
          setMeldung(null);
          if (meldung.vollstaendig) setScreen(3);
          else setScreen(1);
        } else {
          setMeldung(null);
          if (aktuellesThema !== null && aktuellerIndex !== null) starteAufgabe(aktuellesThema, aktuellerIndex);
        }
      }, MELDUNGS_PAUSE_MS);
      return;
    }
    if (screen === 3 && !istLetzteAbschlusszeile) {
      setLineIndex((i) => i + 1);
    }
  });
  const zeigeUntertitel = useUntertitelAktiv();

  const sterneDame = fortschritt ? sterneFuerThema(fortschritt, "dame") : 0;
  const sterneTurm = fortschritt ? sterneFuerThema(fortschritt, "turm") : 0;

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
      {zeigeUntertitel && (
        <View style={styles.sprechblase}>
          <View style={styles.sprechblaseSchweif} />
          <Text style={styles.speech}>{aktuelleZeile}</Text>
        </View>
      )}

      {screen === 0 && (
        <Pressable
          style={styles.tapArea}
          onPress={() => (istLetzteEinladungszeile ? undefined : setLineIndex((i) => i + 1))}
        >
          <BadgeRahmen size={104} akzent="#C9855F">
            <KoenigMasterDunkelIcon size={68} />
          </BadgeRahmen>
        </Pressable>
      )}

      {screen === 1 && (
        <View style={styles.tapArea}>
          <View style={styles.karten}>
            <Pressable style={styles.karte} onPress={() => themaWaehlen("dame")} accessibilityLabel="Dame-Matt">
              <BadgeRahmen size={92} akzent={sterneDame === 3 ? "#D7A52D" : "#C9B79A"}>
                <DameMasterIcon size={60} />
              </BadgeRahmen>
              <View style={styles.sterneAbstand}>
                <Sternensaeule wert={sterneDame} groesse={13} />
              </View>
            </Pressable>
            <Pressable style={styles.karte} onPress={() => themaWaehlen("turm")} accessibilityLabel="Turm-Matt">
              <BadgeRahmen size={92} akzent={sterneTurm === 3 ? "#D7A52D" : "#C9B79A"}>
                <TurmMasterIcon size={60} />
              </BadgeRahmen>
              <View style={styles.sterneAbstand}>
                <Sternensaeule wert={sterneTurm} groesse={13} />
              </View>
            </Pressable>
          </View>
          <Pressable
            style={styles.zurueck}
            onPress={() => navigation.navigate("WisentKuerHub")}
            accessibilityLabel="Zurück zur Kür-Auswahl"
          >
            <FarnZurueckIcon size={44} />
          </Pressable>
        </View>
      )}

      {screen === 2 && game && (
        <View style={styles.tapArea}>
          <EndspielBrett
            game={game}
            ausgewaehlt={ausgewaehlt}
            legalZiele={legalZiele}
            koenigInSchachFeld={koenigInSchachFeld}
            onFeldTipp={feldAntippen}
          />
        </View>
      )}

      {screen === 3 && (
        <Pressable style={styles.tapArea} onPress={() => navigation.navigate("WisentKuerHub")}>
          <QuestGeschafft>
            <ExtraSternchenIcon size={92} />
          </QuestGeschafft>
        </Pressable>
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
  tapArea: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center" },
  karten: { flexDirection: "row", justifyContent: "center", gap: 28, marginBottom: 28 },
  karte: { alignItems: "center", justifyContent: "center" },
  sterneAbstand: { marginTop: 10 },
  zurueck: { position: "absolute", bottom: 8 },
});
