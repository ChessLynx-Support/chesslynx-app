// Paket 3 (2026-09-11, Umsetzungsplan / Vorlage bonuskapitel_ganze_partie_umsetzung_2026-09-10.md):
// Erklärkapitel „Die ganze Partie" an der Steinbrücke. Der einzige Ort, an dem das Kind lernt,
// was eine ganze Schachpartie IST — Grundstellung, Ziel, erste Züge, Patt —, bevor es im
// Freispiel zum ersten Mal ohne Leuchtfelder gegen einen Bot spielt.
//
// Ablauf (5 Screens + Abschluss):
//   1 Grundstellung: alle 32 Figuren, Farbeinführung Weiß/Schwarz (aus FreispielPartie
//     hierher verschoben), Figuren antippen → Lux nennt Tier und Figur.
//   2 Ziel der Partie (nur Sprechzeilen).
//   3 Die ersten Züge, geführt: die Eichel zeigt jeweils eine gute Idee (e4, Sf3, Lc4), jeder
//     andere Legalzug ist ebenfalls erlaubt; die Schildkröte antwortet fest (e5, Sc6, d6) oder,
//     wenn das nicht mehr passt, als Bot der Stufe 250.
//   4 Patt (Begriffsbrücke 3 + Stopp!-Aufgabe): erst Dg6 (Patt) ausprobieren, dann eines der
//     vier Mattfelder.
//   5 Erste eigene Partie: echte FreispielPartie gegen die Schildkröte (Route-Parameter
//     `kapitel: "ganzePartie"`, Hinweise immer an). Nach Partieende — egal wie sie ausgeht —
//     kommt FreispielPartie mit `abschluss: true` hierher zurück.
//   Abschluss: Flag `bonusFortschritt.ganzePartie` (lokal + Firestore-Sync wie die übrigen
//     Bonuskapitel), dann weiter zur Steinbrücke (Bots-Wahl). 3 Sterne fest — es ist ein
//     Erklärkapitel, kein Leistungsmaß.
//
// Paket 3c (2026-09-11, Nutzerwunsch): Weitermachen, wo du aufgehört hast. Das Kapitel merkt sich
// (nur lokal, lib/ganzePartieStand.ts), wie viele der fünf Etappen fertig sind. Kommt das Kind
// zurück, zeigt der Rückkehr-Screen die fünf Trittsteine (fertige leuchten nacheinander auf) und
// zwei Bild-Kacheln: Schildkröte = weitermachen (am Anfang der ersten unfertigen Etappe, mit
// kurzem Brückensatz), Kreis-Pfeil = ganz von vorn (Zwischenstand gelöscht). Eine angefangene
// Partie (Etappe 5) beginnt neu. Verlässt das Kind das Kapitel mittendrin (Zurück), sagt Lux
// kurz „Bis gleich! Die Schildkröte wartet hier auf dich." und lässt es dann gehen. Eltern sehen
// den Zwischenstand im Eltern-Dashboard und können ihn dort ebenfalls zurücksetzen.
//
// Launch 1.0: die Schlusszeile ist die Übergangsfassung aus gefaehrten_wisent_lichess_
// sprechtexte_final.md, Abschnitt 13 („fast wie ein echter Schach-Luchs"); Rätsel werden noch
// nicht versprochen (Lichess = Update 2).

import { useEffect, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SchachAufgabe, type Figur } from "../quest6/SchachAufgabe";
import { createPosition, fromAlgebraic, toAlgebraic, type BoardSquare } from "../lib/chessEngine";
// Stellungen, Eröffnungsideen und die Schildkröten-Antwort liegen in einer reinen Logikdatei,
// damit verify/test-ganze-partie-logic.cjs sie ohne React Native prüfen kann.
import {
  ABSCHIED_ZEILE,
  EROEFFNUNG,
  ETAPPEN_ANZAHL,
  GRUNDSTELLUNG,
  MATTZUEGE,
  PATT_STELLUNG,
  RUECKKEHR_ERINNERUNG,
  RUECKKEHR_ZEILEN,
  VON_VORN_ZEILE,
  brauchtRueckkehr,
  brueckenZeileFuer,
  istLegal,
  schildkroetenAntwort,
  startEtappeFuer,
} from "./ganzePartieLogik";
import { ladeGanzePartieEtappe, loescheGanzePartieEtappe, speichereGanzePartieEtappe } from "../lib/ganzePartieStand";
import { Trittsteine } from "../components/Trittsteine";
import { BlattNochmalIcon } from "../lib/freispielIcons";
import { saveBonusFortschrittLocal } from "../lib/storage";
import { markiereFarbeinfuehrungGezeigt } from "../lib/freispielEinfuehrung";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { LuxEckIcon, LuxAtem } from "../lib/luxAssets";
import { SchildkroeteIcon } from "../lib/schildkroete";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { LuxSprechblase } from "../components/LuxSprechblase";
import { QuestGeschafft } from "../components/QuestGeschafft";
import { BadgeRahmen } from "../components/BadgeRahmen";

type ScreenId = "laden" | "rueckkehr" | 1 | 2 | 3 | 4 | 5 | "abschluss";

const S1_ZEILEN = [
  "Hier an der Steinbrücke wohnt die Schildkröte. Sie übt mit allen, die vorbeikommen – und sie hat Zeit. Viel Zeit.",
  "Schau: Zum ersten Mal steht alles auf dem Brett. Alle unsere Freunde – und alle ihre Freunde.",
  "Acht Igel vorne, dahinter Bär, Pferd, Eule, Schwan, Hirsch, Eule, Pferd, Bär.",
  // Farbeinführung (bisher beim allerersten Freispiel, siehe freispiel_farbeinfuehrung_
  // sprachentwurf.md) — gehört zur Grundstellung, nicht zur ersten Partie.
  "Die hellen Figuren heißen in der Schachwelt Weiß, die dunklen Schwarz. Die andere Seite hat genau dasselbe, nur in Dunkel.",
  "Du bist Weiß – und Weiß fängt immer an.",
  "Tipp auf eine deiner Figuren, dann sag ich dir, wer das ist.",
];
const FIGUREN_NAMEN: Record<Figur["typ"], string> = {
  p: "Das ist ein Igel – ein Bauer.",
  r: "Das ist der Bär, der Turm.",
  n: "Das ist das Pferd, der Springer.",
  b: "Das ist die Eule, der Läufer.",
  q: "Das ist der Schwan, die Dame.",
  k: "Das ist der Hirsch, der König.",
};
const S1_ERINNERUNG = ["Tipp auf einen Igel, einen Bären oder ein Pferd!", "Tipp einfach auf irgendeine helle Figur."];
// Nach so vielen verschiedenen benannten Figuren geht es weiter (sonst nach zwei Erinnerungen).
const S1_GENUG_FIGUREN = 3;

const S2_ZEILEN = [
  "Bei einer ganzen Partie geht es nur um eines: den anderen König befreien. Matt – das kennst du.",
  "Alle anderen Figuren helfen dabei. Und der eigene König? Auf den passen wir auf.",
  "Es dauert viele Züge. Das ist normal. Die Schildkröte sagt: Wer langsam ist, sieht mehr.",
];

const S3_EINSTIEG = "Zum Anfang gibt es drei gute Ideen. Ich zeig sie dir mit der Eichel – du darfst aber auch anders ziehen.";
const S3_ANDERS = "Auch gut! Beim Schach gibt es viele richtige Züge.";
const S3_FREI = "Such dir einen Zug aus – ganz wie du magst.";
const S3_ABSCHLUSS = "Siehst du? Jetzt ist Platz auf dem Brett. Ab hier gibt es keinen Plan mehr – nur noch Schauen und Denken.";

const S4_ZEILEN_1 = [
  "Manchmal passiert am Ende etwas Seltsames. Schau: Der andere König ist ganz allein, unsere Dame ist ganz nah.",
  "Die Dame kann hierhin ziehen … probier es mal.",
];
const S4_PATT_1 = "Hm. Der König steht nicht im Schach. Aber er kann trotzdem nirgends hin. Das heißt Patt.";
const S4_PATT_2 =
  "Patt ist unentschieden. Niemand hat gewonnen – auch wenn wir so viel mehr Figuren haben. Das passiert vielen, die gerade anfangen.";
const S4_ZEILEN_2 = ["Lass uns das anders machen. Der König muss im Schach stehen und nirgends hinkönnen – dann ist es Matt."];
const S4_MATT = "Matt! Siehst du den Unterschied? Schach und kein Ausweg: Matt. Kein Schach und kein Ausweg: Patt.";
const S4_ERINNERUNG = [
  "Die Dame muss so ziehen, dass der König im Schach steht. Schau, wo es leuchtet.",
  "Denk dran: erst Schach, dann kein Ausweg.",
];

const S5_ZEILEN = [
  "Und jetzt spielst du deine erste ganze Partie – gegen die Schildkröte. Sie spielt langsam und freundlich. Wenn du magst, tipp auf mich, dann zeig ich dir eine Idee.",
];

const ABSCHLUSS_ZEILEN = [
  "Das war deine erste ganze Partie!",
  // Launch-1.0-Übergangszeile (Abschnitt 13 der Sprechtexte), bis Update 1.
  "Du spielst jetzt richtig Schach – fast wie ein echter Schach-Luchs!",
  "Die Schildkröte nickt: Jetzt darfst du gegen alle Waldfreunde spielen.",
];

type Einschub = { id: number; text: string; danach?: () => void };

function sq(a: string): BoardSquare {
  return fromAlgebraic(a as Parameters<typeof fromAlgebraic>[0]);
}

export default function GanzePartie() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [screen, setScreen] = useState<ScreenId>(route.params?.abschluss ? "abschluss" : "laden");
  // Paket 3c: Zahl fertiger Etappen laut Zwischenstand (für Rückkehr-Screen + Trittsteine).
  const [gespeichertFertig, setGespeichertFertig] = useState(0);
  // Paket 3c: Abschied beim Verlassen mittendrin — hält die Navigations-Aktion fest, bis Lux
  // „Bis gleich!" gesagt hat.
  const [abschied, setAbschied] = useState<null | (() => void)>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [einschub, setEinschub] = useState<Einschub | null>(null);
  const einschubZaehler = useRef(0);

  // Screen 1
  const benannteTypen = useRef(new Set<string>());
  // Screen 3
  const [eroeffnungFen, setEroeffnungFen] = useState(GRUNDSTELLUNG);
  const [zugNr, setZugNr] = useState(0);
  const [schildkroeteDenkt, setSchildkroeteDenkt] = useState(false);
  // Screen 4
  const [pattPhase, setPattPhase] = useState<1 | 2>(1);

  function schiebeEin(text: string, danach?: () => void) {
    einschubZaehler.current += 1;
    setEinschub({ id: einschubZaehler.current, text, danach });
  }

  function geheZu(next: ScreenId) {
    setLineIndex(0);
    setScreen(next);
    // Paket 3c: Erreicht das Kind Etappe n, sind n−1 Etappen fertig.
    if (typeof next === "number" && next > 1) speichereGanzePartieEtappe(next - 1);
  }

  // Paket 3c: Zwischenstand laden — mit Zwischenstand zum Rückkehr-Screen, sonst Etappe 1.
  useEffect(() => {
    if (screen !== "laden") return;
    let abgebrochen = false;
    ladeGanzePartieEtappe().then((fertig) => {
      if (abgebrochen) return;
      setGespeichertFertig(fertig);
      setScreen(brauchtRueckkehr(fertig) ? "rueckkehr" : 1);
    });
    return () => {
      abgebrochen = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paket 3c: Abschied beim Verlassen mittendrin (Zurück-Taste/-Geste). Die Wechsel innerhalb
  // des Kapitels (zur Partie, zur Steinbrücke) laufen über `replace` und bleiben unberührt.
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const abschiedLaeuft = useRef(false);
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e: any) => {
      const s = screenRef.current;
      if (e.data?.action?.type === "REPLACE" || s === "abschluss" || s === "laden") return;
      if (abschiedLaeuft.current) return; // zweites Zurück: sofort gehen lassen
      e.preventDefault();
      abschiedLaeuft.current = true;
      setAbschied(() => () => navigation.dispatch(e.data.action));
    });
  }, [navigation]);
  useEffect(() => {
    if (!abschied) return;
    // Sicherheitsnetz, falls das Sprechende nicht gemeldet wird.
    const t = setTimeout(() => abschied(), 4000);
    return () => clearTimeout(t);
  }, [abschied]);

  function weitermachen() {
    const start = startEtappeFuer(gespeichertFertig);
    geheZu(start);
    const bruecke = brueckenZeileFuer(start);
    if (bruecke) schiebeEin(bruecke);
  }

  function vonVorn() {
    loescheGanzePartieEtappe();
    setGespeichertFertig(0);
    geheZu(1);
    schiebeEin(VON_VORN_ZEILE);
  }

  // Farbeinführung gilt ab jetzt als gezeigt — FreispielPartie spielt danach nur noch den
  // kurzen „Du bist wieder Weiß"-Reminder.
  useEffect(() => {
    if (screen === 1) markiereFarbeinfuehrungGezeigt();
    if (screen === "abschluss") {
      saveBonusFortschrittLocal("ganzePartie", true);
      loescheGanzePartieEtappe();
    }
  }, [screen]);

  const hinweisIdee = screen === 3 ? EROEFFNUNG[zugNr] : undefined;
  const hinweisLegal = hinweisIdee ? istLegal(eroeffnungFen, hinweisIdee.von, hinweisIdee.nach) : false;
  const s3Zeilen = [
    ...(zugNr === 0 ? [S3_EINSTIEG] : []),
    hinweisIdee && hinweisLegal ? hinweisIdee.zeile : S3_FREI,
  ];

  const lines: string[] =
    screen === "laden"
      ? [""]
      : screen === "rueckkehr"
        ? RUECKKEHR_ZEILEN
        : screen === 1
      ? S1_ZEILEN
      : screen === 2
        ? S2_ZEILEN
        : screen === 3
          ? s3Zeilen
          : screen === 4
            ? pattPhase === 1
              ? S4_ZEILEN_1
              : S4_ZEILEN_2
            : screen === 5
              ? S5_ZEILEN
              : ABSCHLUSS_ZEILEN;
  const isLastLine = lineIndex === lines.length - 1;

  const erinnerungsStand = useRef<{ schluessel: string; n: number }>({ schluessel: "", n: 0 });
  function mitErinnerung(primaer: string, pool: string[], schluessel: string) {
    return () => {
      if (erinnerungsStand.current.schluessel !== schluessel) erinnerungsStand.current = { schluessel, n: 0 };
      const n = erinnerungsStand.current.n++;
      return n === 0 ? primaer : pool[(n - 1) % pool.length];
    };
  }

  const normalerSchluessel = `${screen}-${screen === 3 ? zugNr : screen === 4 ? pattPhase : 0}-${lineIndex}`;
  const zeilenSchluessel = abschied ? "abschied" : einschub ? `einschub-${einschub.id}` : normalerSchluessel;
  const zeileZuSprechen = abschied
    ? ABSCHIED_ZEILE
    : einschub
    ? einschub.text
    : screen === "rueckkehr" && isLastLine
      ? mitErinnerung(lines[lineIndex], RUECKKEHR_ERINNERUNG, normalerSchluessel)
    : screen === 1 && isLastLine
      ? mitErinnerung(lines[lineIndex], S1_ERINNERUNG, normalerSchluessel)
      : screen === 4 && pattPhase === 2 && isLastLine
        ? mitErinnerung(lines[lineIndex], S4_ERINNERUNG, normalerSchluessel)
        : lines[lineIndex];

  const beiZeilenende: (() => void) | undefined = abschied
    ? abschied
    : einschub
    ? () => {
        const danach = einschub.danach;
        setEinschub(null);
        danach?.();
      }
    : !isLastLine
      ? () => setLineIndex((i) => i + 1)
      : screen === 2
        ? () => geheZu(3)
        : screen === 5
          ? () => navigation.replace("FreispielPartie", { elo: 250, kapitel: "ganzePartie" })
          : screen === "abschluss"
            ? () => navigation.replace("Steinbruecke", { nachKapitel: true })
            : undefined;

  // Screen 1: nach zwei Erinnerungen ohne Antippen einfach weiter — das Kind soll hier nicht
  // festhängen, das Benennen ist ein Angebot, keine Prüfung.
  const s1Erinnerungen = useRef(0);
  // Paket 3c: auf dem Rückkehr-Screen höchstens zwei Erinnerungen, dann wartet Lux still.
  const [rueckkehrErinnerungen, setRueckkehrErinnerungen] = useState(0);
  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(zeilenSchluessel, zeileZuSprechen, beiZeilenende, {
    erinnerung: !(screen === "rueckkehr" && rueckkehrErinnerungen >= 2),
    onErinnerung: () => {
      if (screen === 1) {
        s1Erinnerungen.current += 1;
        if (s1Erinnerungen.current >= 2) geheZu(2);
      }
      if (screen === "rueckkehr") setRueckkehrErinnerungen((n) => n + 1);
    },
  });
  const zeigeUntertitel = useUntertitelAktiv();
  const brettAktiv = isLastLine && !einschub;

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
        <LuxSprechblase text={aktuelleZeile} zeilenSchluessel={zeilenSchluessel} style={styles.sprechblase} />
      )}

      {screen === "rueckkehr" && (
        <View style={styles.tapArea}>
          <Trittsteine
            anzahl={ETAPPEN_ANZAHL}
            fertig={gespeichertFertig}
            aktuell={startEtappeFuer(gespeichertFertig)}
            groesse={1.6}
            aufleuchten={lineIndex >= 1}
          />
          <View style={styles.rueckkehrKacheln}>
            <Pressable
              onPress={weitermachen}
              accessibilityLabel="Weitermachen, wo wir aufgehört haben"
              style={({ pressed }) => [styles.kachel, styles.kachelWeiter, pressed && styles.kachelGedrueckt]}
            >
              <LuxAtem dauer={1200} betrag={1.05}>
                <SchildkroeteIcon size={104} />
              </LuxAtem>
            </Pressable>
            <Pressable
              onPress={vonVorn}
              accessibilityLabel="Ganz von vorn anfangen"
              style={({ pressed }) => [styles.kachel, pressed && styles.kachelGedrueckt]}
            >
              <BlattNochmalIcon size={72} farbe="#6E6050" />
            </Pressable>
          </View>
        </View>
      )}

      {(screen === 1 || screen === 2) && (
        <SchachAufgabe
          fen={GRUNDSTELLUNG}
          startAt={sq("e1")}
          interaktiv={false}
          ohneAuswahl
          onZug={() => {}}
          onFigurTap={(figur) => {
            if (screen !== 1 || !brettAktiv || figur.farbe !== "w") return;
            benannteTypen.current.add(figur.typ);
            const genug = benannteTypen.current.size >= S1_GENUG_FIGUREN;
            schiebeEin(FIGUREN_NAMEN[figur.typ], genug ? () => geheZu(2) : undefined);
          }}
        />
      )}

      {screen === 3 && (
        <SchachAufgabe
          key={eroeffnungFen}
          fen={eroeffnungFen}
          startAt={sq("e1")}
          interaktiv={brettAktiv && !schildkroeteDenkt}
          hinweisZug={hinweisIdee && hinweisLegal ? { von: sq(hinweisIdee.von), nach: sq(hinweisIdee.nach) } : undefined}
          onZug={(zug) => {
            const spiel = createPosition(eroeffnungFen);
            spiel.move({ from: toAlgebraic(zug.von), to: toAlgebraic(zug.nach), promotion: "q" });
            const fenNachKind = spiel.fen();
            const idee = EROEFFNUNG[zugNr];
            const folgteIdee = toAlgebraic(zug.von) === idee.von && toAlgebraic(zug.nach) === idee.nach;
            const naechsterZug = zugNr + 1;
            setSchildkroeteDenkt(true);
            const weiter = () => {
              // Kurze Pause, damit das Kind den eigenen Zug sieht, dann antwortet die Schildkröte.
              setTimeout(() => {
                setEroeffnungFen(schildkroetenAntwort(fenNachKind, zugNr));
                setSchildkroeteDenkt(false);
                if (naechsterZug >= EROEFFNUNG.length) {
                  schiebeEin(S3_ABSCHLUSS, () => geheZu(4));
                } else {
                  setZugNr(naechsterZug);
                  setLineIndex(0);
                }
              }, 650);
            };
            if (folgteIdee) weiter();
            else schiebeEin(S3_ANDERS, weiter);
          }}
        />
      )}

      {screen === 4 && (
        <SchachAufgabe
          key={`patt-${pattPhase}`}
          fen={PATT_STELLUNG}
          startAt={sq("g1")}
          interaktiv={brettAktiv}
          nurZuege={
            pattPhase === 1
              ? [{ von: sq("g1"), nach: sq("g6") }]
              : MATTZUEGE.map((ziel) => ({ von: sq("g1"), nach: sq(ziel) }))
          }
          onZug={() =>
            pattPhase === 1
              ? schiebeEin(S4_PATT_1, () =>
                  schiebeEin(S4_PATT_2, () => {
                    setPattPhase(2);
                    setLineIndex(0);
                  })
                )
              : schiebeEin(S4_MATT, () => geheZu(5))
          }
        />
      )}

      {screen === 5 && (
        <View style={styles.tapArea}>
          <LuxAtem dauer={1100} betrag={1.05}>
            <SchildkroeteIcon size={220} />
          </LuxAtem>
        </View>
      )}

      {/* Paket 3c: Trittsteine während der fünf Etappen — fertige leuchten, die aktuelle pulsiert. */}
      {typeof screen === "number" && (
        <View style={styles.trittsteine} pointerEvents="none">
          <Trittsteine anzahl={ETAPPEN_ANZAHL} fertig={screen - 1} aktuell={screen} />
        </View>
      )}

      {screen === "abschluss" && (
        <Pressable style={styles.tapArea} onPress={() => navigation.replace("Steinbruecke", { nachKapitel: true })}>
          <QuestGeschafft>
            {/* Abzeichen „Schildkröten-Panzer": eigene Illustration steht noch aus — bis dahin
                die Schildkröte im gemeinsamen Abzeichen-Rahmen. */}
            <BadgeRahmen size={110}>
              <SchildkroeteIcon size={90} />
            </BadgeRahmen>
          </QuestGeschafft>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F1E4", alignItems: "center", justifyContent: "center", padding: 16 },
  luxCorner: { position: "absolute", top: 24, left: 24, zIndex: 10 },
  sprechblase: { position: "absolute", top: 20, left: 92, right: 16, maxHeight: 170, zIndex: 15 },
  tapArea: { width: "100%", flex: 1, alignItems: "center", justifyContent: "center" },
  trittsteine: { position: "absolute", bottom: 28, left: 0, right: 0, alignItems: "center" },
  rueckkehrKacheln: { flexDirection: "row", gap: 22, marginTop: 36 },
  kachel: {
    width: 140,
    height: 140,
    borderRadius: 28,
    backgroundColor: "rgba(247,241,228,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#C9BFA8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  // „Weiter" ist die empfohlene Wahl — Goldrand wie beim nächsten Wegpunkt auf der Karte.
  kachelWeiter: { borderColor: "#D7A52D" },
  kachelGedrueckt: { transform: [{ scale: 0.96 }] },
});
