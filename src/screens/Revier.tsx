// Update-1-Vorzug (2026-09-15, Christian: "Ich möchte es versuchen, die Inhalte aus Update 1
// ins Release zu packen. Wir schaffen das"): Erster Baustein der Gefährten-Reviere — bisher
// gab es dafür überhaupt keine Route, nur den `__DEV__`-Schalter "Gefährten-Vorschau" in
// LuchsRevierKarte.tsx, der die Wegmarken zeigte, aber nicht antippbar machte (siehe
// claude/status_technik_code.md: "Wer die Reviere baut, ergänzt in RootNavigator.tsx echte
// Routen und in LuchsRevierKarte.tsx ein onPress je Gefährte").
//
// Bewusst EIN generischer Screen für alle fünf Gefährten (Eichhörnchen, Rabe, Dachs, Adlerin,
// Wolf) statt fünf eigener Dateien — sie unterscheiden sich nur in `gefaehrteId`, genauso wie
// die sechs Quests sich eine gemeinsame Board.tsx teilen, aber eigene Quest*.tsx-Hüllen haben.
//
// Bewusste Auslassungen in diesem ersten Schritt (siehe claude/update1_vorzug_plan_2026-09-15.md;
// zur gesprochenen Begrüßung siehe aber den Nachtrag 2026-09-18 weiter unten — dieser Punkt ist
// dort korrigiert, nicht mehr aktuell):
//   - Kulisse: `WaldHintergrund` ohne `variante` (dieselbe Platzhalter-Kulisse wie Bonuskapitel/
//     Ruhmeshalle) statt der eigentlichen Revier-Illustration (Asset E1) — die ist noch
//     nicht beauftragt. Weiterhin unverändert, siehe Nachtrag 2026-09-18.
//   - ~~Keine gesprochene Begrüßung~~ — siehe Nachtrag 2026-09-18: freigegebene Zeilen lagen
//     bereits vor, nur hier übersehen.
// Update-1-Vorzug, Fortsetzung (2026-09-15, Christian: "Endlosmodus-Verdrahtung (27 fertige
// Stellungen) ... prüfen und ggf. aktualisieren"): der oben noch als offen beschriebene
// Endlosmodus-Einstieg ist jetzt da — für sieben der neun Fokus-Spalten (siehe
// lib/endlosmodusSpalten.ts, status "bereit"; die restlichen zwei — Figurenwert und Matt in
// 2 — brauchen eine andere Interaktionsart als "eine Figur zieht einmal" und sind bewusst
// noch nicht verdrahtet, siehe dortiger Kommentar). Unterhalb des Gefährten erscheint pro
// spielbarer Spalte eine Kachel mit Titel + erreichten Sternen; Antippen öffnet
// EndlosmodusSpalte.tsx. Reviere ohne spielbare Spalte (aktuell keins) zeigen nichts an.
//
// Weiterhin bewusst ausgelassen (siehe Abschnitt oben): Revier-Kulisse (Platzhalter bleibt).
// Die gesprochene Begrüßung ist seit dem Nachtrag 2026-09-18 unten verdrahtet.
//
// Zustands-Rig-Verdrahtung (2026-09-15, Christian: "Erst Zustands-Rig verdrahten"): Im Rig
// liegt neben Blinzeln auch ein SPRECHEN-Zustand je Gefährte und, bei Adlerin und Rabe, ein
// ZWINKERN. Sprechen bleibt weiterhin unexportiert — das wäre ein offener Mund ohne Ton und
// ohne Sprechblase, also erfundener Dialog ohne Text, den ich hier nicht auf eigene Faust
// ergänze (dieselbe Begründung wie bei der fehlenden Begrüßung oben). Zwinkern braucht
// dagegen keinen Text: die Zustandsdefinition selbst nennt es "Reaktion auf Lob". Unten löst
// `zwinkernAusloeser` bei Adlerin UND Rabe (seit 2026-09-15, siehe lib/gefaehrtenZustaende.tsx
// und claude/rabe_v2_master_korrektur_2026-09-15.md) genau das aus, sobald beim Wiederbetreten
// des Reviers mehr Sterne stehen als beim letzten Verlassen — ein neuer Stern, kein
// spezifisches Klick-Ereignis, damit es unabhängig davon funktioniert, über welche Spalte er
// kam. Eichhörnchen, Dachs und Wolf haben kein Zwinkern-Bild geliefert bekommen,
// `zwinkernAusloeser` wirkt dort ohnehin nicht (siehe GefaehrteWegmarke-Kommentar).
//
// E3 "Freude" (seit 2026-09-15, Christian: "Passt für E3, Eichhörnchen freigeben"): sobald
// `istRevierAbgeschlossen()` für dieses Revier true ist, zeigt `GefaehrteWegmarke` dauerhaft
// die Freude-Pose statt Grundzustand+Blinzeln (`freudeAktiv` unten) — anders als Zwinkern kein
// einmaliges Aufblitzen, sondern der neue Ruhezustand, siehe lib/gefaehrtenZustaende.tsx.
// Aktuell nur beim Eichhörnchen exportiert; bei den übrigen Gefährten wirkungslos, bis ihre
// E3-Lieferung eingebaut ist (siehe claude/e3_e5_produktionsauftraege_2026-09-15.md).
//
// Nachtrag 2026-09-18 (Christian: "Verdrahtung der Buttons, Icons, Sprechblase und
// Hintergründe der Gefährtenreviere, sodass diese Optik auch auf dem Niveau der Basisquests
// ist"): Die oben unter "Bewusste Auslassungen" genannte Begründung "keine freigegebene
// Zeile" ist überholt — die Ankunfts-/Charakterisierungssequenz je Revier (2–3 Sätze) plus
// eine Abschluss-Zeile bei drei Sternen liegen bereits seit 2026-09-10/11 final freigegeben
// vor (`claude/gefaehrten_wisent_lichess_sprechtexte_final.md`, Abschnitt 3) — vermutlich beim
// Bau dieses Screens am 15.9. übersehen bzw. mit der noch offenen "Kind tippt auf vernebeltes
// Revier"-Zeile verwechselt (das ist ein ANDERER, weiterhin fehlender Text, siehe
// `einfuehrungZeileFuerRevier` unten). Unten jetzt mit `useLuxSprechzeile` verdrahtet, exakt
// nach dem am selben Tag für EndlosmodusSpalte.tsx etablierten Muster (ein Einführungssatz
// beim Betreten, `erinnerung: false`, `fertigGesprochen` sperrt Eingabe, bis Lux fertig ist —
// siehe `claude/sprachausgabe_nichtueberspringbarkeit_audit_2026-09-18.md`). WICHTIG: Die
// DEUTSCHEN Zeilen sind wortgleich aus dem freigegebenen Dokument übernommen, KEINE neue
// Erfindung. Die ENGLISCHEN Zeilen sind dagegen neue, von mir angefertigte Übersetzungen
// dieses bereits freigegebenen deutschen Textes (im freigegebenen Dokument nur Deutsch
// vorhanden) — bitte gezielt gegenlesen, das ist etwas anderes als neuer Kind-Dialog auf
// eigene Faust.
//
// Weiterhin NICHT angefasst (siehe Datei-Kopf oben, "Bewusste Auslassungen"): Die
// Revier-Kulisse bleibt die generische `WaldHintergrund`-Platzhalterkulisse ohne `variante`
// — E1 (die fünf echten Revier-Illustrationen) ist laut `checkliste_produktionsphasen.md`
// weiterhin nicht beauftragt, dafür fehlt schlicht das Bildmaterial, keine Code-Frage.
//
// Nachtrag 2026-09-18 (überholt den Absatz direkt oben): E1a ist geliefert und freigegeben
// (Christian: "Lassen, freigeben und einbinden.", nach Abgleich des mitgelieferten
// Häuschens gegen den Kartenstil — siehe claude/auftragsliste_produktionen_2026-09-18.md,
// Abschnitt 1). `WaldHintergrund` bekommt unten die neue `revier`-Prop. Nachtrag,
// Fortsetzung: E1b (Rabenfels), E1c (Dachshöhle) und E1e (Wolfsfeste) kamen ohne
// Beanstandung durch die Prüfung (Abschnitt 1b desselben Dokuments) und sind ebenfalls
// eingebunden. Nur Adlerhorst (E1d) zeigt weiterhin die Platzhalterkulisse — dort weicht
// der Rendering-Stil der Adlerin vom Cartoon-Look ab, Christians Entscheidung steht noch
// aus (siehe WaldHintergrund.tsx, KULISSE_JE_REVIER).

import { useCallback, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { WaldHintergrund } from "../components/WaldHintergrund";
import { GefaehrteWegmarke, type GefaehrteId } from "../lib/gefaehrtenZustaende";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { Sternensaeule } from "../lib/sternenleiter";
import { spaltenFuerGefaehrte } from "../lib/endlosmodusSpalten";
import {
  ladeEndlosmodusFortschritt,
  sterneInSpalte,
  istRevierAbgeschlossen,
  type EndlosmodusFortschritt,
} from "../lib/endlosmodusFortschritt";
import { markiereRevierBesucht, loadBonusFortschrittLocal } from "../lib/storage";
// Nachtrag 2026-09-18 (siehe Datei-Kopfkommentar, Abschnitt "Nachtrag 2026-09-18"): Lux-Ecke +
// Sprechblase, exakt dasselbe Vierergespann wie in screens/EndlosmodusSpalte.tsx.
import { t } from "../lib/sprache";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { LuxEckIcon } from "../lib/luxAssets";
import { LuxSprechblase } from "../components/LuxSprechblase";
// Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
// schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md): welches der vier bestehenden
// Bonuskapitel-Screens (falls überhaupt eins) hier als "Erstlehre" zusätzlich zu den
// normalen Endlosmodus-Übungsspalten oben angeboten wird — komplett unabhängig
// voneinander, keine Spalte wird dadurch gesperrt oder freigeschaltet.
// Nachtrag 2026-09-19: aus "genau ein Kapitel je Revier" ist eine KETTE mehrerer Kapitel
// geworden (siehe revierErstlehre.ts). Angezeigt wird trotzdem immer nur eine Kachel — das
// jeweils erste noch offene Kapitel der Kette.
import {
  erstlehreFuerRevier,
  naechsteOffeneErstlehre,
  type RevierErstlehre,
  type RevierErstlehreKapitelId,
} from "../lib/revierErstlehre";

/** Name je Revier — dieselben Namen wie in LuchsRevierKarte.tsx (GEFAEHRTEN_ROH), nur hier für
 *  den Screen selbst gebraucht (z. B. `accessibilityLabel`, kein sichtbarer Text). */
const REVIER_NAME: Record<GefaehrteId, string> = {
  eichhoernchen: "Eichhörnchen-Lichtung",
  rabe: "Rabenfels",
  dachs: "Dachshöhle",
  adlerin: "Adlerhorst",
  wolf: "Wolfsfeste",
  // Wisent hat keinen eigenen Revier-Screen dieser Art (Wisent-Kampf ist ein eigener,
  // separater Screen an anderer Stelle der Karte, Segment 18) — hier nur der Vollständigkeit
  // halber im Record, damit `GefaehrteId` nicht zwei leicht unterschiedliche Aufzählungen
  // braucht.
  wisent: "Wisent-Weide",
};

// Nachtrag 2026-09-18: Ankunfts-/Charakterisierungssequenz je Revier (Betreten) und
// Abschluss-Zeile (sobald `istRevierAbgeschlossen()` true ist) — Deutsch wortgleich aus
// `claude/gefaehrten_wisent_lichess_sprechtexte_final.md`, Abschnitt 3 übernommen (dort als
// 3 Einzelsätze gelistet, hier zu EINEM Sprechblock zusammengefasst, weil dieser Screen —
// anders als die Haupt-Quests — kein "Tipp, um weiterzuschalten"-Muster hat; dieselbe
// Zusammenfassungs-Technik wie bei `einfuehrungZeileFuerSpalte` in EndlosmodusSpalte.tsx).
// Wisent hat keinen eigenen Revier-Screen (siehe REVIER_NAME oben) und taucht hier deshalb
// nicht auf. Englisch: neue Übersetzung des freigegebenen deutschen Texts, siehe Datei-Kopf.
function einfuehrungZeileFuerRevier(gefaehrteId: GefaehrteId, abgeschlossen: boolean): string {
  switch (gefaehrteId) {
    case "eichhoernchen":
      return abgeschlossen
        ? t(
            "Das Eichhörnchen strahlt – und schenkt uns eine Nuss für den Weg! Auf zum nächsten Revier!",
            "The squirrel is beaming — and gives us a nut for the road! On to the next territory!"
          )
        : t(
            "Hier lerne ich das fleißige Eichhörnchen in seiner Lichtung kennen. Es hat zwei Schätze gefunden und kann nur einen tragen – welcher ist wohl mehr wert? Hilfst du mir, mit ihm zu vergleichen?",
            "This is where I get to know the busy squirrel in its clearing. It found two treasures and can only carry one — which one is worth more, I wonder? Will you help me compare them?"
          );
    case "rabe":
      return abgeschlossen
        ? t(
            "Der Rabe zwinkert dir zu — das war wirklich clever gelöst! Weiter geht unsere Reise!",
            "The raven winks at you — that was really cleverly solved! Onward on our journey!"
          )
        : t(
            "Hier lerne ich den klugen Raben auf seinem Felsen kennen. Sein König steckt in der Klemme – aber der Rabe kennt für jede Klemme einen Ausweg. Zeigst du mir, wie du das schaffst?",
            "This is where I get to know the clever raven on his cliff. His king is stuck in a tight spot — but the raven always knows a way out of any tight spot. Will you show me how you do it?"
          );
    case "dachs":
      return abgeschlossen
        ? t(
            "Der Dachs nickt zufrieden aus seiner Höhle — sicher ist sicher! Weiter zum nächsten Freund!",
            "The badger nods contentedly from his den — better safe than sorry! On to the next friend!"
          )
        : t(
            "Hier lerne ich den Dachs in seiner gemütlichen Höhle kennen. Draußen wird es unruhig – der Dachs will seinen König schnell hinter die Mauer bringen. Gemeinsam bringen wir alles in Sicherheit!",
            "This is where I get to know the badger in his cozy den. Things are getting restless outside — the badger wants to bring his king safely behind the wall, quickly. Let's bring everything to safety together!"
          );
    case "adlerin":
      return abgeschlossen
        ? t(
            "Die Adlerin kreist stolz über dem Horst – gut gesehen! Sie fliegt voraus und zeigt uns den Weg zum Wolf!",
            "The eagle circles proudly over her eyrie — well spotted! She flies ahead and shows us the way to the wolf!"
          )
        : t(
            "Hier lerne ich die Adlerin in ihrem hohen Horst kennen. Von hier oben hat sie gesehen, dass jemand angekettet wurde – nichts entgeht ihrem scharfen Blick. Schauen wir gemeinsam ganz genau hin!",
            "This is where I get to know the eagle in her lofty eyrie. From up here she saw that someone got chained up — nothing escapes her sharp eyes. Let's take a really close look together!"
          );
    case "wolf":
      return abgeschlossen
        ? t(
            "Der Wolf heult zufrieden in die Nacht – das war klug gespielt! Jetzt fehlt nur noch einer – ganz oben wartet der Wisent.",
            "The wolf howls contentedly into the night — that was cleverly played! Now only one is left — high above, the bison awaits."
          )
        : t(
            "Hier lerne ich den Wolf in seiner Feste kennen. Sein Rudel wartet auf ihn – und er hat nur zwei Züge Zeit, um alles zu klären. Denken wir gemeinsam einen Schritt weiter!",
            "This is where I get to know the wolf in his stronghold. His pack is waiting for him — and he only has two moves to sort it all out. Let's think one step ahead together!"
          );
    default:
      // Unerreichbar (Wisent hat keinen Revier-Screen, siehe oben) — nur zur Typsicherheit.
      return "";
  }
}

export type RevierParams = { gefaehrteId: GefaehrteId };

export default function Revier() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const gefaehrteId: GefaehrteId = route.params?.gefaehrteId ?? "eichhoernchen";
  const spielbareSpalten = spaltenFuerGefaehrte(gefaehrteId).filter((s) => s.status === "bereit");
  const erstlehreKette = erstlehreFuerRevier(gefaehrteId);

  const [fortschritt, setFortschritt] = useState<EndlosmodusFortschritt>({});
  // undefined = noch nicht geladen (Kachel bleibt in diesem kurzen Moment unsichtbar, statt
  // einmal kurz aufzublitzen und direkt wieder zu verschwinden, siehe useFocusEffect unten).
  // null = geladen, aber nichts mehr offen (Kette komplett durch oder Revier ohne Erstlehre).
  const [offeneErstlehre, setOffeneErstlehre] = useState<RevierErstlehre | null | undefined>(undefined);

  // Zwinkern-Auslöser (siehe Datei-Kommentar oben): `vorherigeSterneRef` hält den zuletzt
  // gesehenen Sternestand dieses Reviers über mehrere Fokus-Wechsel hinweg (Kind spielt eine
  // Spalte, kehrt zurück) — beginnt bei `null`, damit das allererste Laden nie als "neuer
  // Stern" zählt. Steigt die Summe gegenüber dem letzten Laden, zählt `zwinkernAusloeser`
  // eins hoch; `GefaehrteWegmarke` liest daraus ein einmaliges Zwinkern aus (nur bei
  // Gefährten mit exportiertem Zwinkern-Bild, aktuell nur Adlerin).
  const vorherigeSterneRef = useRef<number | null>(null);
  const [zwinkernAusloeser, setZwinkernAusloeser] = useState(0);

  // Nachtrag 2026-09-18 (siehe Datei-Kopfkommentar): `abgeschlossen` hängt an `fortschritt`,
  // das erst nach dem Fokus-Effekt unten geladen ist — startet also stets mit `false`
  // (istRevierAbgeschlossen auf {} kann nie true sein), Lux spricht dadurch beim allerersten
  // Rendern immer die Ankunftszeile, bevor ein bereits abgeschlossenes Revier ggf. auf die
  // Abschluss-Zeile umschaltet, sobald der echte Fortschritt geladen ist — spürbar nur als
  // kurzer Wechsel, kein doppeltes Vorlesen (neue Sprechzeile ersetzt die laufende sofort).
  const abgeschlossen = istRevierAbgeschlossen(gefaehrteId, fortschritt);
  const { wiederholen, aktuelleZeile, fertigGesprochen } = useLuxSprechzeile(
    `${gefaehrteId}-${abgeschlossen ? "fertig" : "start"}`,
    () => einfuehrungZeileFuerRevier(gefaehrteId, abgeschlossen),
    undefined,
    { erinnerung: false }
  );
  const zeigeUntertitel = useUntertitelAktiv();

  useFocusEffect(
    useCallback(() => {
      // Reihenfolge-Freischaltung (siehe storage.ts, Abschnitt "Gefährten-Reviere"): Dieser
      // Besuch schaltet das NÄCHSTE Revier auf der Karte frei. Wisent hat keinen eigenen
      // Revier-Screen dieser Art (siehe Datei-Kopfkommentar) und braucht deshalb keinen
      // eigenen Aufruf — sein Freischalt-Check in LuchsRevierKarte.tsx prüft direkt, ob der
      // letzte reguläre Gefährte (Wolf) schon besucht wurde.
      markiereRevierBesucht(gefaehrteId);
      ladeEndlosmodusFortschritt().then((f) => {
        setFortschritt(f);
        const summe = spielbareSpalten.reduce((acc, s) => acc + sterneInSpalte(f, s.id), 0);
        if (vorherigeSterneRef.current !== null && summe > vorherigeSterneRef.current) {
          setZwinkernAusloeser((n) => n + 1);
        }
        vorherigeSterneRef.current = summe;
      });
      // Erstlehre-Kachel (siehe Datei-Kopfimport): Für JEDES Kapitel der Kette den Fortschritt
      // laden und daraus das erste noch offene bestimmen. Reviere ohne Erstlehre (Adlerhorst,
      // Wisent) haben eine leere Kette — dann gar kein Laden, `offeneErstlehre` bleibt
      // `undefined` und es erscheint nie eine Kachel (siehe Render-Stelle unten).
      if (erstlehreKette.length > 0) {
        Promise.all(
          erstlehreKette.map((k) =>
            loadBonusFortschrittLocal(k.kapitelId).then(
              (fertig) => [k.kapitelId, fertig] as [RevierErstlehreKapitelId, boolean]
            )
          )
        ).then((paare) => {
          const erledigt: Partial<Record<RevierErstlehreKapitelId, boolean>> = {};
          for (const [id, fertig] of paare) erledigt[id] = fertig;
          setOffeneErstlehre(naechsteOffeneErstlehre(gefaehrteId, erledigt));
        });
      }
      // spielbareSpalten/erstlehreKette bewusst nicht in den Deps: beide hängen nur von `gefaehrteId`
      // ab (fest pro Bildschirm-Instanz, siehe Datei-Kommentar oben); `spielbareSpalten` wäre
      // bei jedem Rendern zudem eine neue Array-Referenz.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gefaehrteId])
  );

  return (
    <View style={styles.wurzel}>
      <WaldHintergrund revier={gefaehrteId} />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.navigate("KidHome")}
          accessibilityLabel="Zurück zur Karte"
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          style={styles.zurueck}
        >
          <FarnZurueckIcon size={26} />
        </Pressable>
        {/* Nachtrag 2026-09-18: dieselbe Lux-Ecke + Sprechblase wie EndlosmodusSpalte.tsx,
            aus demselben Grund eine Zeile tiefer als der Quest-Standard positioniert (top:24),
            um den bereits vorhandenen Zurück-Knopf oben links nicht zu überdecken. */}
        <Pressable onPress={wiederholen} accessibilityLabel="Lux, Zeile wiederholen" style={styles.luxCorner}>
          <LuxEckIcon size={44} />
        </Pressable>
        {zeigeUntertitel && (
          <LuxSprechblase
            text={aktuelleZeile}
            zeilenSchluessel={`${gefaehrteId}-${abgeschlossen ? "fertig" : "start"}`}
            style={styles.sprechblase}
          />
        )}
        <View style={styles.mitte}>
          <View pointerEvents="none" accessibilityLabel={REVIER_NAME[gefaehrteId]}>
            <GefaehrteWegmarke
              id={gefaehrteId}
              breite={200}
              blinzeln
              zwinkernAusloeser={zwinkernAusloeser}
              freudeAktiv={istRevierAbgeschlossen(gefaehrteId, fortschritt)}
            />
          </View>
          {offeneErstlehre && (
            <Pressable
              onPress={() =>
                navigation.navigate(offeneErstlehre.route, {
                  rueckkehrZiel: "Revier",
                  rueckkehrParams: { gefaehrteId },
                })
              }
              // Nachtrag 2026-09-18: dieselbe "während Lux spricht keine Eingabe"-Regel wie
              // in den sechs Haupt-Quests und in EndlosmodusSpalte.tsx — disabled statt
              // ausgeblendet, damit das Kind sieht, dass hier etwas wartet, es nur noch
              // nicht antippen kann (siehe sprachausgabe_nichtueberspringbarkeit_audit_2026-09-18.md).
              disabled={!fertigGesprochen}
              accessibilityLabel={`Erstlehre: ${offeneErstlehre.titel}`}
              style={({ pressed }) => [
                styles.erstlehreKachel,
                !fertigGesprochen && styles.kachelGesperrt,
                pressed && fertigGesprochen && styles.kachelGedrueckt,
              ]}
            >
              <Text style={styles.erstlehreTitel}>{offeneErstlehre.titel}</Text>
            </Pressable>
          )}
          {spielbareSpalten.length > 0 && (
            <View style={styles.spaltenReihe}>
              {spielbareSpalten.map((spalte) => (
                <Pressable
                  key={spalte.id}
                  onPress={() => navigation.navigate("EndlosmodusSpalte", { spalteId: spalte.id })}
                  disabled={!fertigGesprochen}
                  accessibilityLabel={spalte.titel}
                  style={({ pressed }) => [
                    styles.spaltenKachel,
                    !fertigGesprochen && styles.kachelGesperrt,
                    pressed && fertigGesprochen && styles.kachelGedrueckt,
                  ]}
                >
                  <Text style={styles.spaltenTitel}>{spalte.titel}</Text>
                  <Sternensaeule wert={sterneInSpalte(fortschritt, spalte.id)} groesse={12} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
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
  mitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Nachtrag 2026-09-18: dieselben Koordinaten wie in EndlosmodusSpalte.tsx — eine Zeile
  // tiefer als der Quest-Standard (top:24,left:24), weil hier bereits der Zurück-Knopf
  // (top:20,left:16,44×44) dieselbe Ecke belegt; LuxSprechblase zeigt ihre Spitze immer nach
  // links, kann also nicht stattdessen rechts neben Lux gestapelt werden.
  luxCorner: { position: "absolute", top: 76, left: 24, zIndex: 10 },
  sprechblase: { position: "absolute", top: 72, left: 84, right: 16, maxHeight: 170, zIndex: 15 },
  // Nachtrag 2026-09-18: leichtes Press-Feedback für die beiden Kachel-Typen unten (Erstlehre
  // + Endlosmodus-Spalten) — noch kein voller Umstieg auf `ChessLynxButton` (das ist laut
  // `produktionsliste_buttons_farbcodes_v1.md`, Abschnitt 7, eine eigene, bewusst
  // zurückgestellte Nutzerentscheidung, keine stillschweigende Migration hier), nur die
  // fehlende Rückmeldung beim Antippen nachgezogen, plus eine gedimmte Optik, solange
  // `fertigGesprochen` noch nicht true ist (siehe disabled-Logik oben an den Pressables).
  kachelGedrueckt: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  kachelGesperrt: { opacity: 0.55 },
  // Erstlehre-Kachel (siehe Datei-Kopfimport): bewusst optisch abgehoben von den
  // Endlosmodus-Kacheln (Marken-Gold statt des neutralen Creme-Tons, dieselbe Farbe wie
  // z. B. Funkeln.tsx/EndspielBrett.tsx-Sockel) — signalisiert "hier gibt es etwas Neues
  // zu entdecken", nicht nur eine weitere Übungsspalte.
  erstlehreKachel: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#D7A52D",
  },
  erstlehreTitel: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  spaltenReihe: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 12, maxWidth: 320 },
  spaltenKachel: {
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(247,241,228,0.85)",
    alignItems: "center",
  },
  spaltenTitel: { fontSize: 13, fontWeight: "600", color: "#4A4038", marginBottom: 6, textAlign: "center" },
});
