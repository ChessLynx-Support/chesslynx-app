// Befund (Nutzer-Rückfrage 2026-09-07, nach Prüfung der Projekt-Unterlagen): Quest1.tsx
// Screen 0 spricht bereits seit einer früheren Sitzungs-Bearbeitung die Zeile "Hier siehst
// du das Spielbrett und alle seine Bewohner." — der Screen zeigte dazu aber nur eine leere,
// nicht illustrierte Tipp-Fläche (`styles.tapArea` ohne Inhalt). Ein echter Text/Bild-
// Widerspruch: Lux kündigt Brett + Bewohner an (Audio UND Untertitel), zu sehen war keins
// von beidem. Deckt sich mit der in `entwicklungsstatus_grundgeruest.md` dokumentierten,
// aber nie umgesetzten Lücke ("Zusätzlich ein einmaliger Einführungs-Screen vor Quest 1 mit
// leerem Brett und allen sechs Tieren im Überblick (MVP-Kern, noch nicht gebaut)").
//
// Diese Komponente füllt genau diese Lücke — als eigenständiger, wiederverwendbarer
// Bildbaustein statt direkt inline in Quest1.tsx, damit die Quest1.tsx-Datei selbst schlank
// bleibt (Quest1.tsx bindet sie in Screen 0 ein, siehe dortiger Kommentar).
//
// Bewusst KEINE Wiederverwendung von Board.tsx: diese Ansicht ist rein dekorativ (leeres
// Brett, sechs Tier-Icons als Gruppenbild, nicht interaktiv), Board.tsx ist dagegen
// komplett auf genau EINE interaktive Übungsfigur zugeschnitten (Pflicht-Prop `pieceAt`,
// Tap-/Zug-Logik, Bedrohungs-Anzeige usw.) — für ein reines Übersichtsbild wäre das
// Zweckentfremdung derselben Komponente. Stattdessen ein eigenes, stark vereinfachtes
// 8×8-Gitter, das dieselben Feld-Kacheln (`assets/brett/tile_hell.png`/`tile_dunkel.png`)
// wie Board.tsx nutzt, damit das Brett hier optisch exakt so aussieht wie später beim
// echten Üben.
//
// Design-Vorgabe des Nutzers (2026-09-07): "Das Bild sollte generell zentriert sein sich
// alles in eine skalierbaren, handyformat abspielen. Das Schachbrett sollte so entsprechend
// groß und zentral sichtbar sein." — Brettgröße deshalb wie in Board.tsx aus der
// tatsächlichen Bildschirmbreite berechnet (nicht fest), Aufrufstelle (Quest1.tsx, Screen 0
// `tapArea`) zentriert die Komponente bereits über Flexbox.
//
// Die sechs Tiere stehen auf ECHTEN Brettfeldern, zwei versetzten Reihen — ein bewusst
// einfaches "Gruppenfoto"-Arrangement statt einer Schach-Startaufstellung (die hätte an
// dieser Stelle noch keine erklärbare Bedeutung). Reihenfolge links nach rechts entspricht
// der Quest-Reihenfolge (Igel, Bär, Eule, Pferd, Schwan, Hirsch, siehe projektwissen.md
// "Tier-Zuordnung"). Zeigt bewusst die NORMALE (34px-)Icon-Variante statt der großen
// Verwandlung-Variante — dieselbe Größe, in der die Tiere/Figuren später auch auf dem
// echten Übungsbrett erscheinen (siehe pieceMasters.tsx).
//
// Update (2026-09-09, Nutzer-Feedback "Verteile die Figuren bitte noch etwas mehr, sie
// stehen so zu dicht aneinander"): die ursprüngliche Fassung stellte die sechs Tiere auf
// sechs BENACHBARTE Spalten einer einzigen Reihe (b–g, Index 1–6 von 8) — bei einer
// Icon-Größe von ~34px in ~44-46px breiten Zellen blieb dadurch kaum sichtbarer Abstand.
// Eine erste Korrektur verteilte die Tiere stattdessen frei (nicht feldgebunden) über die
// volle Brettbreite — auf ausdrücklichen Nutzerwunsch danach durch DIESE Fassung ersetzt:
// "auf mit jeweils 1 Feld Abstand auf echte Felder des Bretts stellen". Sechs Figuren mit
// je einem vollen Feld Abstand passen rechnerisch nicht in eine einzige Reihe (6 Figuren +
// 5 Lücken = 11 Spalten, das Brett hat nur 8) — TIER_POSITIONEN unten löst das durch zwei
// versetzte Reihen (ROW_UNTEN/ROW_OBEN, direkt benachbart): drei Tiere auf den Feldern
// 1/3/5 der unteren Reihe, die anderen drei auf 2/4/6 der Reihe direkt darüber. Jedes Tier
// steht dadurch auf einem ECHTEN Brettfeld, mit vollem Feld Abstand zu seinen Nachbarn in
// derselben Reihe UND diagonalem Abstand zu den Tieren der jeweils anderen Reihe — kein
// Icon berührt mehr ein anderes. Reihenfolge links nach rechts bleibt dieselbe
// Quest-Reihenfolge, nur jetzt im Zickzack auf beide Reihen verteilt.
// Wichtig laut "Namensregel" (projektwissen.md): Screen 0 nennt bewusst weiterhin keinen
// einzigen Schachfigur-Namen (nur "Bewohner") — die Namen fallen weiterhin erst im
// jeweiligen Verwandlungsmoment jeder einzelnen Quest.
//
// Bewusste Vereinfachung gegenüber der Doku-Formulierung "einmalig": diese Ansicht
// erscheint (wie jeder andere Screen dieser Quest auch) bei jedem Aufruf von Quest1 neu,
// ohne eigenes "nur beim ersten Mal"-Flag — konsistent mit der bestehenden Entscheidung in
// Onboarding.tsx ("Bewusst KEINE 'nur beim ersten Start zeigen'-Logik ... falls gewünscht,
// ist das ein kleiner, separater Folgeschritt"). Ein AsyncStorage-Flag wäre hier zusätzliche
// Komplexität (Ladezustand, Race Conditions) für ein Verhalten, das nicht explizit
// eingefordert wurde — bei Bedarf einfach nachrüstbar.
//
// ---------------------------------------------------------------------------------------
// REGRESSION UND KORREKTUR (Nutzer-Feedback 2026-09-08, Abend: "das Schachbrett ist jetzt
// KOMPLETT unsichtbar — auch die Kacheln, die vorher da waren"). Analyse mit Opus, rein
// statisch (kein Gerätezugriff), gegen die bestätigt funktionierende Board.tsx:
//
// (1) Die Annahme der vorigen Runde war falsch. Board.tsx hat NIE "von View auf Pressable
//     umgestellt" — die Zellen dort waren von Anfang an `Pressable`, weil sie echte,
//     antippbare Spielsteuerung sind. Board.tsx' eigener "ROOT CAUSE gefunden"-Kommentar
//     benennt als wirksamen Fix ausdrücklich etwas anderes: die absolute Positionierung der
//     Figuren-Ebene. Es gab also nie einen Beleg dafür, dass "Pressable-Sein" die fehlende
//     Zutat wäre.
// (2) Der Zellen-Wechsel View → Pressable war für das ZEICHNEN sogar ein Nullereignis:
//     React Natives `Pressable` rendert intern exakt ein `<View collapsable={false} …>`
//     plus Touch-Handler plus `accessible`. `collapsable={false}` stand hier aber ohnehin
//     schon an der Zelle. Der Wechsel konnte die Tiere also gar nicht sichtbar machen —
//     und er kann auch nicht die Ursache der neuen Totalausblendung sein.
// (3) Damit bleibt per Ausschluss genau EINE echte Änderung übrig: `pointerEvents="none"`
//     auf dem Gitter-Container. Und genau dieser Container ist NICHT irgendein Wrapper,
//     sondern die einzige View, die die gesamte sichtbare Brett-Optik trägt (Hintergrund
//     #F7F1E4, 3px-Rahmen, borderRadius, elevation) UND per `overflow: "hidden"` alle 64
//     Zellen beschneidet. `pointerEvents` ist auf Android/Fabric eben KEIN reiner JS-Filter:
//     `PointerEventsMode` ist Teil der nativen `ViewProps` und geht in die
//     Stacking-Context-/View-Flattening-Entscheidung des Shadow-Nodes mit ein. Auf diesem
//     RN-0.86-Fabric-Stand endet die Kombination "beschneidender + zeichnender +
//     angehobener (elevation) Container, der zugleich für die Trefferermittlung
//     abgeschaltet ist, mit 64 touch-fähigen Kindern darunter" damit, dass der Container
//     zwar korrekt vermessen und eingehängt, sein Teilbaum aber nicht mehr gezeichnet wird.
//     Gegenprobe im eigenen Code: `pointerEvents="none"` an sich ist unschuldig —
//     Board.tsx setzt es auf die Feld-Kachel (`Image`) und auf JEDE Overlay-View, und all
//     das ist auf demselben Gerät bestätigt sichtbar. Die belastbare Regel aus diesem
//     Projekt lautet also: `pointerEvents="none"` auf Blättern und absolut positionierten
//     Overlays = unbedenklich, auf dem beschneidenden Gitter-Container = zerstört das
//     Zeichnen. Der Prop ist hier deshalb ersatzlos entfernt.
//
// Was stattdessen gemacht wurde — zwei getrennte Bedingungen, zwei getrennte Lösungen:
//
// (a) "Der Tap darf nicht abgefangen werden": Die Zellen bleiben `Pressable` (maximale
//     Struktur-Gleichheit mit dem bestätigt funktionierenden Board.tsx), bekommen aber
//     `disabled`. Das ist der saubere, dokumentierte Weg statt eines Touch-Killers am
//     Container: RN reicht `disabled` in die `Pressability`-Konfiguration durch, deren
//     `onStartShouldSetResponder` daraufhin `false` liefert — die Zelle beansprucht die
//     Responder-Rolle also gar nicht erst, und der Tap steigt garantiert zum umschließenden
//     `tapArea`-Pressable in Quest1.tsx auf ("tippen zum Weiterblättern" bleibt erhalten).
//     Board.tsx reicht an genau derselben Stelle ebenfalls ein `disabled` durch, dieser
//     Zustand ist dort also bereits erprobt. Zusätzliche Sicherheit: diese Zellen haben
//     ohnehin KEINEN einzigen Press-Handler.
// (b) "Die Tiere müssen sichtbar sein": Die Tier-Icons sitzen nicht mehr als Overlay IN der
//     jeweiligen Zelle (dieses Muster war es, das hier zweimal in Folge unsichtbar blieb),
//     sondern als sechs absolut positionierte Overlays direkt im Gitter-Container, NACH
//     allen 64 Zellen — also exakt das Muster, mit dem Board.tsx seine frei bewegliche
//     Zugfigur zeichnet (siehe dort `animatingTo`-Overlay: absolut, auf Zellgröße gesetzt,
//     zentrierter Inhalt, letztes Kind des Bretts) und das auf diesem Gerät bestätigt über
//     allen Kacheln liegt. Vorteile gegenüber dem Zell-Overlay: keine Stapelreihenfolge
//     INNERHALB einer Zelle mehr nötig (der bisherige zIndex-0/zIndex-2-Tanz entfällt), und
//     das Icon kann nicht mehr vom `overflow: "hidden"` der Zelle beschnitten werden.
//     Bewusst OHNE eigenen zIndex, ebenfalls wie in Board.tsx — dort trägt weder die Zelle
//     noch das Zug-Overlay auf Container-Ebene einen zIndex, und die reine JSX-Reihenfolge
//     genügt dort nachweislich.
// (c) Nebenbei: der beschreibende `accessibilityLabel` sitzt jetzt am äußeren Mess-Rahmen
//     (reiner Layout-Wrapper, zeichnet und beschneidet nichts) statt am Gitter-Container —
//     der Gitter-Container trägt dadurch exakt dieselben Props wie sein bestätigt
//     funktionierendes Gegenstück in Board.tsx (nur `accessibilityRole="none"`).
//     `accessible` am Mess-Rahmen fasst das Brett für TalkBack zu EINEM Element zusammen,
//     was für ein rein dekoratives Übersichtsbild ohnehin das gewünschte Verhalten ist.
// ---------------------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { View, Pressable, Image, Animated, Easing, StyleSheet, Dimensions } from "react-native";
import {
  BauerMasterIcon,
  TurmMasterIcon,
  LaeuferMasterIcon,
  SpringerMasterIcon,
  DameMasterIcon,
  KoenigMasterIcon,
} from "../lib/pieceMasters";
// Update (2026-09-09, Bau der echten WillkommensSequenz.tsx, siehe Claude-Projekt
// "ChessLynx", konzept_screen0_verschmelzung_appstart.md Beat 3 "Sequenzielle Tier-
// Vorstellung"): jedes neu erscheinende Tier bekommt jetzt einen kurzen Funkeln-Akzent
// (siehe sichtbarBisIndex-Kommentar unten) — dieselbe Komponente, die bereits bei
// Verwandlung/QuestGeschafft für "magische Momente" steht.
import { Funkeln } from "./Funkeln";

const feldHell = require("../../assets/brett/tile_hell.png");
const feldDunkel = require("../../assets/brett/tile_dunkel.png");

// Zwei benachbarte Reihen (0-indiziert), siehe Datei-Kommentar oben — "unten" ist die
// bisherige mittlere Reihe 4, "oben" die Reihe direkt darüber.
//
// Update (2026-09-09, Bau der echten WillkommensSequenz.tsx): jetzt `export`iert, zusammen
// mit TIERE/RAHMEN_BREITE/TIER_GROESSE/berechneBrettMasse weiter unten — rein additive
// Änderung, keine Verhaltensänderung dieser Datei selbst. Grund: Beat 4 ("Verstecken", die
// sechs Tiere fliegen vom Brett weg) braucht exakt dieselben Feld-Koordinaten wie dieses
// Brett selbst, sonst "springt" die Position beim Umschalten von der hier gezeigten
// Vorstellung zur Flug-Choreografie sichtbar — genau dasselbe Prinzip, mit dem
// LuchsRevierKarte.tsx bereits WEGMARKEN/MAP_ASPECT für die "Landen"-Choreografie
// exportiert (siehe dortiger Kommentar, dev/WillkommensFlugProbe.tsx).
export const ROW_UNTEN = 4;
export const ROW_OBEN = 3;
// `ReactElement` statt des globalen `JSX.Element`: React 19 (siehe package.json) stellt den
// globalen JSX-Namensraum nicht mehr zwingend bereit, `ReactElement` ist der stabile Typ
// (dieselbe Schreibweise wie `ReactNode` in Board.tsx).
//
// Jedes Tier bekommt jetzt sein eigenes echtes Feld (reihe/spalte) statt einer gemeinsamen
// Reihe + freier/fraktionaler Position — siehe Datei-Kommentar oben ("auf mit jeweils 1
// Feld Abstand auf echte Felder des Bretts stellen"). Zickzack zwischen ROW_UNTEN/ROW_OBEN,
// Spalten 1/3/5 (unten) bzw. 2/4/6 (oben) — je zwei Nachbarn derselben Reihe liegen zwei
// Spalten auseinander (= 1 leeres Feld dazwischen), Nachbarn der jeweils anderen Reihe
// stehen diagonal versetzt.
export const TIERE: { reihe: number; spalte: number; Icon: (p: { size?: number }) => ReactElement }[] = [
  { reihe: ROW_UNTEN, spalte: 1, Icon: BauerMasterIcon },
  { reihe: ROW_OBEN, spalte: 2, Icon: TurmMasterIcon },
  { reihe: ROW_UNTEN, spalte: 3, Icon: LaeuferMasterIcon },
  { reihe: ROW_OBEN, spalte: 4, Icon: SpringerMasterIcon },
  { reihe: ROW_UNTEN, spalte: 5, Icon: DameMasterIcon },
  { reihe: ROW_OBEN, spalte: 6, Icon: KoenigMasterIcon },
];

// Nutzer-Feedback 2026-09-08 (dasselbe wie in Board.tsx, siehe dortiger ausführlicher
// Kommentar): Dimensions.get("window") liefert in der Web-Vorschau die BROWSERFENSTER-
// Breite statt der schmaleren Handy-Rahmen-Breite, und ein fester Pixel-Puffer bleibt bei
// wachsender/schrumpfender Bildschirmgröße nicht proportional. Ersetzt durch dieselbe
// onLayout-Messung + 98%-Ziel + minimalen Rahmen wie in Board.tsx — RAHMEN_BREITE hier
// bewusst als eigene Konstante dupliziert statt aus Board.tsx importiert, da diese
// Komponente laut Datei-Kommentar oben ausdrücklich NICHT von Board.tsx abhängen soll.
// Update (2026-09-09, siehe ROW_UNTEN/ROW_OBEN-Kommentar oben): `export`, aus demselben Grund.
export const RAHMEN_BREITE = 3;

// Standardgröße der "klein"-Master (siehe pieceMasters.tsx) — dieselbe Größe wie später auf
// dem echten Übungsbrett, siehe Datei-Kommentar oben. Update (2026-09-09): `export`, siehe
// ROW_UNTEN/ROW_OBEN-Kommentar oben.
export const TIER_GROESSE = 34;

// Update (2026-09-09, siehe ROW_UNTEN/ROW_OBEN-Kommentar oben): die Breiten-/Zellgrößen-
// Rechnung unten (bisher nur inline in dieser Komponente) als eigene, `export`ierte
// Funktion — damit die Flug-Choreografie in WillkommensSequenz.tsx exakt dieselbe
// Brett-Geometrie berechnet wie dieses Brett selbst, statt dieselbe Formel ein zweites Mal
// von Hand nachzubauen (Drift-Risiko, siehe MAP_ASPECT-Kommentar in LuchsRevierKarte.tsx für
// dasselbe Prinzip). Reiner Refactor: dieselbe Formel, jetzt nur an einer Stelle definiert;
// die Komponente unten ruft sie selbst auf, statt sie zu duplizieren.
export function berechneBrettMasse(containerBreite: number) {
  const maxBrettBreite = Math.floor(containerBreite * 0.98);
  const cellSize = Math.max(24, Math.min(64, Math.floor((maxBrettBreite - RAHMEN_BREITE * 2) / 8)));
  const brettSeite = cellSize * 8 + RAHMEN_BREITE * 2;
  const tierGroesse = Math.min(TIER_GROESSE, Math.round(cellSize * 0.78));
  return { cellSize, brettSeite, tierGroesse };
}

// Neu (2026-09-08, Nutzerwunsch): Screen 0 (Quest1.tsx) stellt die sechs Tiere jetzt
// nacheinander einzeln vor ("Das ist der Igel.", usw.) — `highlightIndex` (0-5, exakt der
// Index in TIERE unten) sagt dieser Komponente, welches Tier dabei gerade angesagt wird,
// und lässt genau dieses eine sanft pulsieren, während alle anderen unverändert
// stillstehen. `undefined` (Standard, alle bisherigen Aufrufstellen ohne diese Prop)
// verhält sich exakt wie zuvor: kein Tier pulsiert.
//
// Update (2026-09-09, Bau der echten WillkommensSequenz.tsx, siehe Claude-Projekt
// "ChessLynx", konzept_screen0_verschmelzung_appstart.md Beat 3): neue Prop
// `sichtbarBisIndex` — statt (wie bisher, Standardverhalten bei `undefined`) alle sechs
// Tiere von Anfang an zu zeigen, sind bei einem gesetzten Wert nur die Tiere mit
// `index < sichtbarBisIndex` sichtbar. Jedes Tier, das dadurch NEU sichtbar wird, bekommt
// eine kleine Auftritts-Animation (Skalierung aus dem Nichts, leichtes Überschwingen) plus
// einen kurzen Funkeln-Akzent an seiner Position — genau die in Beat 3 geforderte "eigene
// kleine Auftritts-Animation" pro Tier, statt (wie bisher) einfach von Anfang an
// dazustehen. Rückwärtskompatibel: ohne diese Prop verhält sich die Komponente exakt wie
// zuvor (alle sechs sofort sichtbar, keine Auftritts-Animation).
export function LeeresBrettMitAllenTieren({
  highlightIndex,
  sichtbarBisIndex,
}: { highlightIndex?: number; sichtbarBisIndex?: number } = {}) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const bildschirmBreite = containerWidth ?? Dimensions.get("window").width;
  // Update (2026-09-09, siehe ROW_UNTEN/ROW_OBEN-Kommentar oben): nutzt jetzt die
  // `export`ierte, gemeinsame Formel statt einer lokalen Kopie — identisches Ergebnis wie
  // zuvor, siehe dortiger Kommentar zum Drift-Risiko.
  const { cellSize, tierGroesse } = berechneBrettMasse(bildschirmBreite);

  // Auftritts-Animation pro Tier (0 = unsichtbar/klein, 1 = voll sichtbar) — siehe
  // sichtbarBisIndex-Kommentar oben. Initialwert richtet sich nach dem allerersten
  // Prop-Wert beim Mount: `undefined` (Standardverhalten) bedeutet "alle sofort sichtbar",
  // ein gesetzter Wert startet entsprechend viele Tiere bereits bei 1, ohne für sie eine
  // Auftritts-Animation abzuspielen (nur echte spätere Zuwächse von sichtbarBisIndex lösen
  // die Animation aus, siehe Effekt unten).
  const auftrittWerte = useRef(
    TIERE.map((_, i) => new Animated.Value(sichtbarBisIndex === undefined || i < sichtbarBisIndex ? 1 : 0))
  ).current;
  const vorherigeSichtbarBisRef = useRef(sichtbarBisIndex ?? TIERE.length);
  useEffect(() => {
    const ziel = sichtbarBisIndex ?? TIERE.length;
    const vorher = vorherigeSichtbarBisRef.current;
    for (let i = vorher; i < ziel; i++) {
      auftrittWerte[i].setValue(0);
      Animated.timing(auftrittWerte[i], {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }).start();
    }
    vorherigeSichtbarBisRef.current = ziel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sichtbarBisIndex]);

  // Sanftes Auf-und-Ab-Pulsieren (analog zum bereits bestätigten SammelMarker-Muster in
  // Board.tsx) für genau das per highlightIndex angesagte Tier. Ein einziger geteilter
  // Animated.Value genügt, da immer höchstens ein Tier gleichzeitig hervorgehoben wird.
  // Setzt sich beim Wechsel/Wegfall von highlightIndex sauber auf 1 zurück, statt mitten
  // in der Auf- oder Abwärtsbewegung stehen zu bleiben.
  const pulsScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (highlightIndex === undefined) {
      pulsScale.setValue(1);
      return;
    }
    pulsScale.setValue(1);
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsScale, { toValue: 1.18, duration: 320, useNativeDriver: true }),
        Animated.timing(pulsScale, { toValue: 0.92, duration: 320, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => {
      schleife.stop();
      pulsScale.setValue(1);
    };
  }, [highlightIndex]);

  return (
    // Bugfix (Nutzer-Feedback 2026-09-08, "Schachbrett völlig verschoben"): anders als
    // Board.tsx sitzt diese Komponente NICHT direkt in der gepolsterten SafeAreaView,
    // sondern eine Ebene tiefer im zentrierenden `tapArea`-Pressable (siehe Quest1.tsx,
    // Screen 0) — ein kompensierender negativer marginHorizontal (wie in Board.tsx) führte
    // dort zu einer fehlerhaften Zentrierung statt zu einem einfach breiteren, weiterhin
    // mittigen Brett. Deshalb hier bewusst OHNE diesen Trick: misst die tatsächlich
    // zugewiesene (bereits durch das 16px-SafeArea-Padding verkleinerte) Breite, ohne sie
    // künstlich zu kompensieren — etwas schmaler als technisch maximal möglich, aber
    // garantiert korrekt zentriert statt schief.
    <View
      style={styles.messRahmen}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      // Siehe Punkt (c) im Regressions-Kommentar oben: die Beschreibung sitzt bewusst hier
      // am reinen Layout-Wrapper, nicht am zeichnenden/beschneidenden Gitter-Container.
      accessible
      accessibilityRole="image"
      accessibilityLabel="Das Schachbrett mit allen sechs Waldtieren"
    >
      <View
        style={[
          styles.board,
          { width: cellSize * 8 + RAHMEN_BREITE * 2, height: cellSize * 8 + RAHMEN_BREITE * 2 },
        ]}
        // Bewusst exakt dieselben Props wie am Brett-Container in Board.tsx (dort bestätigt
        // sichtbar) — insbesondere KEIN `pointerEvents` mehr, siehe Punkt (3) im
        // Regressions-Kommentar oben.
        accessibilityRole="none"
      >
        {Array.from({ length: 8 }).flatMap((_, r) =>
          Array.from({ length: 8 }).map((_, c) => {
            const isDark = (r + c) % 2 === 1;
            return (
              // `disabled`: die Zelle beansprucht die Responder-Rolle nie (siehe Punkt (a)
              // im Regressions-Kommentar oben), der Weiterblättern-Tap fällt dadurch an das
              // `tapArea`-Pressable in Quest1.tsx durch. Struktur ansonsten identisch zur
              // bestätigt funktionierenden Zelle in Board.tsx.
              <Pressable
                key={`${r}-${c}`}
                disabled
                style={[styles.cell, { width: cellSize, height: cellSize }]}
              >
                <Image
                  source={isDark ? feldDunkel : feldHell}
                  style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                  resizeMode="cover"
                  pointerEvents="none"
                />
              </Pressable>
            );
          })
        )}
        {/* Die sechs Bewohner als Gitter-Overlays NACH allen Zellen — dasselbe Muster wie
            das bestätigt sichtbare Zug-Overlay in Board.tsx (absolut, auf Zellgröße,
            zentrierter Inhalt, letzte Kinder des Bretts). Siehe Punkt (b) im
            Regressions-Kommentar oben. Die absolute Position bezieht sich auf die
            Innenkante des 3px-Rahmens, deckt sich also 1:1 mit dem Zellraster — exakt wie
            die `left: pieceAt.col * cellSize`-Rechnung in Board.tsx. */}
        {TIERE.map(({ reihe, spalte, Icon }, index) => {
          // Siehe sichtbarBisIndex-Kommentar oben: ohne die Prop (undefined) ist jedes Tier
          // von Anfang an sichtbar (auftrittWerte[index] startet bereits bei 1) — dieselbe
          // Bedingung entscheidet hier zusätzlich, ob der einmalige Funkeln-Akzent gemountet
          // wird (siehe Funkeln.tsx-Kommentar: mountet er genau EINMAL, wenn `sichtbar` von
          // `false` auf `true` wechselt, spielt seinen Ausbruch automatisch beim Mount ab und
          // bleibt danach unsichtbar stehen — kein manuelles Auf-/Abbauen nötig).
          const sichtbar = index < (sichtbarBisIndex ?? TIERE.length);
          return (
            // Animated.View statt View für alle sechs Overlays (nicht nur das gerade
            // hervorgehobene) — verhält sich ohne animierten Style-Eintrag identisch zu
            // View, vermeidet aber einen Komponententyp-Wechsel (View <-> Animated.View) am
            // selben `key` zwischen Renderns, der sonst ein unnötiges Ab-/Wiederaufbauen
            // dieses Kindes auslösen könnte.
            //
            // Position jetzt direkt über das eigene Feld jedes Tiers (reihe/spalte, siehe
            // TIERE oben) statt über einen Breitenanteil — `left`/`top` richten die Overlay-Box
            // exakt an der Zellgrenze dieses Feldes aus, dieselbe Rechnung wie
            // `left: pieceAt.col * cellSize` in Board.tsx.
            <Animated.View
              key={`tier-${index}`}
              pointerEvents="none"
              collapsable={false}
              style={[
                styles.tierOverlay,
                {
                  left: spalte * cellSize,
                  top: reihe * cellSize,
                  width: cellSize,
                  height: cellSize,
                  opacity: auftrittWerte[index],
                },
                {
                  transform: [
                    { scale: auftrittWerte[index].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                    ...(index === highlightIndex ? [{ scale: pulsScale }] : []),
                  ],
                },
              ]}
            >
              <Icon size={tierGroesse} />
              {sichtbar && <Funkeln size={cellSize * 1.3} />}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

// Identisch zu Board.tsx/styles.board (siehe Datei-Kommentar oben, "Brett hier optisch
// exakt so ... wie später beim echten Üben").
const styles = StyleSheet.create({
  // Bugfix (Nutzer-Feedback 2026-09-08, "Schachbrett völlig verschoben"): dieser Eintrag
  // fehlte hier schlicht — `styles.messRahmen` oben wurde referenziert, aber nie definiert,
  // wodurch der Mess-Wrapper ganz ohne width/Zentrierung dastand (das war der eigentliche
  // Auslöser der Verschiebung, nicht in erster Linie der zwischenzeitlich versuchte negative
  // Rand). Bewusst OHNE marginHorizontal (siehe Kommentar an der Aufrufstelle oben).
  messRahmen: { width: "100%", alignItems: "center" },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 14,
    borderWidth: RAHMEN_BREITE,
    borderColor: "#E4DAC6",
    backgroundColor: "#F7F1E4",
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#4A4038",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  // Test (2026-09-08, siehe Board.tsx) rückgängig gemacht: ohne overflow:hidden verschob
  // sich das Brett, das Problem war damit nicht behoben — overflow war nicht die Ursache.
  cell: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  // Positionierungs-Rahmen für die sechs Tier-Overlays auf Gitter-Ebene (siehe Punkt (b)
  // im Regressions-Kommentar oben) — Gegenstück zu styles.markerWrap/dem Zug-Overlay in
  // Board.tsx, nur mit left/top/width/height statt der Zell-Vollfläche, weil dieses Overlay
  // eine Ebene höher (im Gitter statt in der Zelle) hängt.
  tierOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
