// Gemeinsamer Hook für alle sechs Quest-Screens und Onboarding.tsx (Opus-Review,
// 2026-09-07, Abschnitt 3.1, Schritt 4: "Verdrahtung über gemeinsamen Hook
// useLuxSprechzeile(screen, lineIndex, lines) statt sechsfachem Copy-Paste", siehe
// claude/review_logik_grafik_audiofuehrung.md). Übernimmt die gesamte Sprech-Logik rund
// um eine einzelne Lux-Sprechzeile:
//
//  - spricht `zeile` jedes Mal, wenn sich `schluessel` ändert (in den Quests z. B.
//    `${screen}-${lineIndex}`) — siehe sprich() in luxStimme.ts.
//  - ruft nach natürlichem Sprechende `onFertig` auf, sofern übergeben. Auf den
//    Brett-Screens (2/4/5/7 in den Quests — dort gibt es keinen eigenen "Tipp irgendwo
//    hin"-Tap-Bereich wie auf Screen 0/1) übernimmt das Sprechende jetzt die Rolle, die
//    vorher der manuelle advanceLine()-Tap auf das Lux-Icon hatte (Opus-Review Befund 1.1):
//    die nächste Zeile eines mehrzeiligen Skripts erscheint automatisch.
//  - erinnert bei Inaktivität (Design-Vorgabe 3.3: "Nach ~8 Sekunden ohne Tipp ... sollte
//    Lux von sich aus erinnern", dasselbe Zeitfenster wie in
//    eltern_gate_sprachansage_entwurf.md) durch Wiederholen derselben Zeile — NUR wenn
//    kein `onFertig` übergeben wurde (auf Screens mit Auto-Weiter übernimmt der nächste
//    Screen-/Zeilenwechsel ohnehin die Rolle) UND `erinnerung` nicht explizit
//    ausgeschaltet wurde (siehe Onboarding.tsx: eine einmalige Begrüßung soll sich nicht
//    alle 8 Sekunden wiederholen, solange niemand auf "Loslegen" tippt).
//  - meldet über `optionen.onErinnerung` (Nutzerentscheidung 2026-09-09, "Eigenständigkeit
//    zählt" für die Sterne-Logik am Quest-Abschluss, siehe Claude-Projekt "ChessLynx",
//    aktueller_projektstand_2026-09-09.md) jedes Mal, wenn eine solche 8-Sekunden-
//    Erinnerung tatsächlich auslöst — NICHT als Fehlerzähler gedacht (es gibt bewusst
//    keinen `onFehler` o. ä.), sondern als einziges Signal, das misst, ob das Kind
//    eigenständig drangeblieben ist oder Lux von sich aus nachhelfen musste. Die Quests
//    zählen die Aufrufe lokal (z. B. in einem Ref) und leiten daraus am Quest-Ende die
//    Sterne-Anzahl ab, statt fest `sterne: 3` zu speichern.
//  - gibt `wiederholen()` zurück, gedacht für den Tap auf das Lux-Icon (luxCorner in allen
//    sechs Quests). Ersetzt das bisherige advanceLine() (Opus-Review Befund 1.1): jetzt,
//    wo jede Zeile automatisch gesprochen wird, ist "Zeile wiederholen" die sinnvollere
//    Geste für ein abgelenktes Kind (Abschnitt 3.1, Schritt 5) als "nächste Zeile
//    aufdecken".
//
// Sprechen wird beim Verlassen (Schlüsselwechsel oder Unmount) automatisch gestoppt (siehe
// stoppen() im Cleanup) — das erfüllt zugleich Design-Vorgabe 3.3 ("Tap während laufender
// Sprachausgabe sollte zur nächsten Zeile überspringen, nicht zusätzlich abspielen"): ein
// Tap auf einen der bestehenden "weiter"-Tap-Bereiche ändert `schluessel`
// (setLineIndex/setScreen), wodurch dieser Effekt vor dem nächsten Sprechen zuerst
// aufräumt.

import { useEffect, useRef, useState } from "react";
import { ENGINE_ABFRAGE_VERLAESSLICH, sprich, sprichtGerade, stoppen } from "./luxStimme";

const ERINNERUNG_MS = 8000;

// Gerätetest 2026-09-13 (Nutzer: "Die automatische Führung beim Turm wirkt abgehackt, die
// Sätze werden nicht zu Ende gesprochen"): Manche Android-TTS-Engines melden `onDone`
// verfrüht — teils schon, wenn die Äußerung nur in die Warteschlange gestellt wurde, teils
// ausgelöst durch das `Speech.stop()`, das `sprich()` unmittelbar davor aufruft. Der Hook
// hielt die Zeile daraufhin für fertig, schaltete weiter — und der Aufräumschritt des
// Schlüsselwechsels rief `stoppen()`, was den noch laufenden Satz mitten im Wort abschnitt.
//
// ERSTER ANLAUF (verworfen als alleinige Lösung): eine geschätzte Mindest-Sprechdauer pro
// Zeichen. Nutzer-Rückmeldung nach dem Test: "Die Texte wirken weiterhin abgehackt" — die
// Schätzung war zu knapp, und sie kann grundsätzlich nicht stimmen, weil die tatsächliche
// Dauer an Engine, Stimme, Sprechrate und Satzzeichen hängt.
//
// JETZIGE LÖSUNG: nicht schätzen, sondern die Engine fragen. `sprichtGerade()`
// (= `Speech.isSpeakingAsync()`, gekapselt in luxStimme.ts) wird im Takt von
// PRUEF_INTERVALL_MS abgefragt; als fertig gilt eine Zeile erst, wenn die Engine erst
// "spricht" und dann "spricht nicht mehr" gemeldet hat. Ein verfrühtes `onDone` kann damit
// gar nicht mehr weiterschalten.
const PRUEF_INTERVALL_MS = 200;
// Wie lange auf das erste "ich spreche jetzt" gewartet wird. Zwischen `Speech.speak()` und
// dem hörbaren Beginn liegt gerade beim ersten Satz einer Sitzung spürbar Zeit (Engine lädt
// die Stimme). Meldet die Plattform bis dahin gar nichts (manche Web-Umgebungen können
// `isSpeakingAsync` nicht beantworten), wird die Abfrage eingestellt und es übernehmen
// wieder `onDone` + Mindestdauer + Sicherheitsnetz wie zuvor.
// 2026-09-14 von 3 s auf 5 s erhöht: Im Browser braucht die erste Äußerung einer Stimme
// spürbar länger bis zum hörbaren Beginn, und das Aufgeben führt zurück zu genau der
// unzuverlässigen `onDone`-Ebene, die dieser Mechanismus ersetzen soll. Gegen ein echtes
// Hängenbleiben schützt weiterhin das Sicherheitsnetz weiter unten, nicht diese Frist.
const START_GEDULD_MS = 5000;
// Wie lange nach `Speech.stop()` ein gemeldetes "ich spreche" noch von der ABGEBROCHENEN
// vorherigen Äußerung stammen kann (siehe die ausführliche Begründung bei der Abfrage
// unten). Innerhalb dieser Frist zählt ein "spricht" nur dann als Beginn der neuen Zeile,
// wenn er durch `onStart` bestätigt ist oder dazwischen eine Sprechpause gemessen wurde.
const ABBRUCH_NACHHALL_MS = 700;
// So viele Messungen in Folge müssen "spricht nicht" ergeben, bevor eine Zeile als beendet
// gilt. Zwei statt einer: Eine einzelne Messlücke mitten im Satz (im Browser zwischen zwei
// Satzteilen beobachtbar) darf nicht als Satzende durchgehen. Kostet im Normalfall 200 ms.
const LEER_MESSUNGEN_FUER_ENDE = 2;
// Nur noch Rückfallebene für den Fall, dass die Engine-Abfrage nichts liefert: Untergrenze
// für die plausible Sprechdauer, bevor ein `onDone` als echtes Ende gewertet wird. 60 ms pro
// Zeichen entspricht knapp 17 Zeichen pro Sekunde — langsamer als jede normale Vorlesestimme
// spricht niemand, schneller bei `rate: 0.95` (siehe STIMME_OPTIONEN in stimmeAuswahl.ts)
// aber auch nicht. Ein von der Engine bestätigtes Ende umgeht diese Untergrenze bewusst
// (Parameter `vonEngine` unten) — dort ist nichts mehr zu schätzen.
const MINDEST_MS_PRO_ZEICHEN = 60;
// Pause zwischen dem Ende einer Zeile und dem automatischen Weiterschalten (siehe unten).
const ZEILEN_PAUSE_MS = 600;

// Sprach-Harmonie-Review (Nutzerauftrag 2026-09-09, siehe lib/luxVarianten.ts für die
// volle Begründung): `zeile` akzeptiert jetzt zusätzlich eine Funktion statt nur eines
// festen Strings. Eine Funktion wird bei JEDEM tatsächlichen Sprechvorgang neu
// aufgerufen (Erst-Aussprache UND jede 8-Sekunden-Erinnerung UND jeder wiederholen()-Tap)
// statt nur einmal beim Mounten — genau der richtige Zeitpunkt, um z. B.
// `luxVariante(...)` aufzurufen, damit dessen rotierender Zähler nur bei echten
// Sprechvorgängen weiterzählt, nicht bei jedem Rerender der aufrufenden Komponente.
type Zeile = string | (() => string);

export function useLuxSprechzeile(
  schluessel: string,
  zeile: Zeile | undefined,
  onFertig?: () => void,
  optionen?: { erinnerung?: boolean; onErinnerung?: () => void }
) {
  const erinnerungAktiv = optionen?.erinnerung ?? true;

  const erinnerungTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sicherheitsnetz = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Laufende Engine-Abfrage (siehe PRUEF_INTERVALL_MS oben) — in einer Ref, damit sowohl der
  // nächste Sprechvorgang als auch der Effekt-Cleanup sie zuverlässig beenden.
  const pruefung = useRef<ReturnType<typeof setInterval> | null>(null);
  const zeileRef = useRef(zeile);
  const onFertigRef = useRef(onFertig);
  const erinnerungAktivRef = useRef(erinnerungAktiv);
  const onErinnerungRef = useRef(optionen?.onErinnerung);
  zeileRef.current = zeile;
  onFertigRef.current = onFertig;
  erinnerungAktivRef.current = erinnerungAktiv;
  onErinnerungRef.current = optionen?.onErinnerung;

  // Der zuletzt tatsächlich aufgelöste/gesprochene Text — als State (nicht nur Ref),
  // damit aufrufende Screens denselben Text auch für die (optionale) Lux-Sprechblase
  // (LuxSprechblase.tsx) anzeigen können, statt ihn (bei einer Varianten-Funktion) ein
  // zweites Mal selbst aufzulösen und damit den Zähler in luxVarianten.ts versehentlich
  // ein zweites Mal weiterzuzählen.
  const [aktuelleZeile, setAktuelleZeile] = useState(() =>
    typeof zeile === "function" ? "" : zeile ?? ""
  );

  // Bugfix (Nutzer-Feedback 2026-09-08: Lux wiederholte nach 8 Sekunden eine Zeile und
  // wechselte danach unvermittelt — ganz ohne Bildschirmwechsel — zum Text eines ANDEREN
  // Screens). Ursache: `sprich()` in luxStimme.ts ruft `Speech.stop()` unmittelbar vor
  // `Speech.speak()` auf; auf manchen Plattformen/Browsern (beobachtet unter Windows/
  // Chrome, Web Speech API) löst die abgebrochene VORHERIGE Sprechausgabe trotzdem noch
  // ihr `onDone` aus, nur zeitversetzt. Ohne Gegenmaßnahme wertete dieses verspätete,
  // längst überholte `onDone` sich selbst als "diese Zeile ist fertig gesprochen" — und
  // setzte einen erinnerungTimer bzw. löste `onFertig` aus, ganz gleich, ob der Hook
  // zwischenzeitlich für einen anderen `schluessel` neu lief oder sogar unmountete.
  //
  // Fix: eine simple Generationszählung. Jede tatsächlich losgeschickte Sprechanfrage
  // bekommt beim Auslösen eine neu hochgezählte Nummer; ihr `onDone`-Callback prüft beim
  // Feuern, ob diese Nummer noch der AKTUELLEN entspricht. Wurde zwischenzeitlich (egal ob
  // durch schluessel-Wechsel, Unmount oder einen erneuten wiederholen()-Aufruf) bereits
  // erneut gesprochen, ist die alte Generation überholt — ihr `onDone` tut dann nichts mehr,
  // statt einen verwaisten Timer zu setzen oder ein verspätetes onFertig auszulösen.
  const generation = useRef(0);

  // In einem Ref gehalten, damit sowohl der Mount-/Wechsel-Effekt als auch wiederholen()
  // dieselbe Implementierung nutzen, ohne sie als Effekt-Abhängigkeit führen zu müssen.
  const zeileSprechenRef = useRef<() => void>(() => {});
  zeileSprechenRef.current = () => {
    if (erinnerungTimer.current) clearTimeout(erinnerungTimer.current);
    const quelle = zeileRef.current;
    if (!quelle) return;
    const text = typeof quelle === "function" ? quelle() : quelle;
    if (!text) return;
    setAktuelleZeile(text);
    const eigeneGeneration = ++generation.current;
    // Gerätetest 2026-09-11 (Web-Vorschau: "nach Vorstellung des Hirsch lässt sich nicht
    // weiterklicken"): meldet die Sprachausgabe ihr Ende nicht (im Browser verschluckt die
    // Web-Speech-API gelegentlich einzelne Äußerungen samt onDone, v. a. direkt nach einem
    // Abbruch), blieb eine Auto-Weiter-Kette stehen — und mit ihr jedes Antippen, das erst
    // auf der letzten Zeile freigegeben wird. Sicherheitsnetz: nach einer großzügig
    // geschätzten Sprechdauer (≈130 ms pro Zeichen + 3 s — großzügig, weil der Browser die
    // erste Äußerung einer Stimme oft verzögert startet; Sprechtempo 0,95) gilt die
    // Zeile als fertig. Kommt das echte Ende früher, verfällt das Netz; kommt es später,
    // wird es über `gemeldet` ignoriert (kein doppeltes Weiter).
    let gemeldet = false;
    const startZeit = Date.now();
    const erledigt = () => {
      if (eigeneGeneration !== generation.current) return;
      if (onFertigRef.current) {
        // Gerätetest 2026-09-11 (Nutzer: "Übergang wirkt an Stellen abgehackt, längere
        // Pausen einplanen"): kurze Atempause zwischen dem Ende einer Zeile und dem, was
        // danach kommt (nächste Zeile, Screenwechsel). Zum Zeitpunkt des Weiterschaltens
        // wird nochmals geprüft, dass inzwischen nichts anderes gesprochen wurde.
        erinnerungTimer.current = setTimeout(() => {
          if (eigeneGeneration !== generation.current) return;
          onFertigRef.current?.();
        }, ZEILEN_PAUSE_MS);
        return;
      }
      if (!erinnerungAktivRef.current) return;
      erinnerungTimer.current = setTimeout(() => {
        onErinnerungRef.current?.();
        zeileSprechenRef.current();
      }, ERINNERUNG_MS);
    };
    if (sicherheitsnetz.current) clearTimeout(sicherheitsnetz.current);
    if (pruefung.current) clearInterval(pruefung.current);
    // Eigener Griff je Zeile: ein verspätetes Ende einer ÄLTEREN Zeile darf nur deren eigenes
    // Netz bzw. deren eigene Abfrage beenden, nie die der aktuellen.
    let eigenePruefung: ReturnType<typeof setInterval> | null = null;
    const eigenesNetz = setTimeout(() => zeileFertig(true), text.length * 130 + 3000);
    sicherheitsnetz.current = eigenesNetz;

    // `vonEngine`: Das Ende wurde von der Sprach-Engine selbst bestätigt (Abfrage unten) oder
    // liegt so weit zurück, dass nichts mehr zu prüfen ist (Sicherheitsnetz). Dann entfällt
    // die geschätzte Mindestdauer — sie ist nur die Rückfallebene für ein `onDone`, dem nicht
    // zu trauen ist.
    const zeileFertig = (vonEngine = false) => {
      if (gemeldet) return;
      gemeldet = true;
      clearTimeout(eigenesNetz);
      if (eigenePruefung) clearInterval(eigenePruefung);
      // Verfrühtes `onDone` abfangen (siehe MINDEST_MS_PRO_ZEICHEN): kam die Meldung, bevor
      // der Text überhaupt gesprochen sein kann, wird der Rest der Mindestdauer abgewartet,
      // statt sofort weiterzuschalten. Der Timer liegt in derselben Ref wie das
      // Sicherheitsnetz — beim Schlüsselwechsel oder Unmount räumt der Cleanup ihn mit auf.
      const verstrichen = Date.now() - startZeit;
      const mindestens = text.length * MINDEST_MS_PRO_ZEICHEN;
      if (!vonEngine && verstrichen < mindestens) {
        sicherheitsnetz.current = setTimeout(() => {
          if (eigeneGeneration !== generation.current) return;
          erledigt();
        }, mindestens - verstrichen);
        return;
      }
      erledigt();
    };
    // Engine-Abfrage (siehe PRUEF_INTERVALL_MS oben): Eine Zeile gilt erst dann als
    // gesprochen, wenn die Engine erst "spricht" und danach "spricht nicht mehr" gemeldet
    // hat. Solange sie noch spricht, wird nicht weitergeschaltet — und damit auch nichts
    // abgeschnitten, denn abgeschnitten wird nur durch das `stoppen()` beim Weiterschalten.
    //
    // WEB-VORSCHAU 2026-09-14 (Nutzer: "Die Texte in der Vorschau sind zu schnell und werden
    // abgehackt"): Genau diese Abfrage lieferte sich im Browser ein Wettrennen mit dem
    // `Speech.stop()`, das `sprich()` unmittelbar vor jedem `Speech.speak()` aufruft. Nativ
    // ist der Abbruch praktisch sofort wirksam; im Browser (`speechSynthesis.cancel()`) läuft
    // er asynchron ab, während die NEUE Äußerung erst nach ~100-500 ms hörbar beginnt:
    //   200 ms: `speaking` meldet true — aber das ist die abgebrochene VORHERIGE Zeile.
    //           Der Hook merkte sich "diese Zeile hat begonnen".
    //   400 ms: der Abbruch ist durch, die neue Zeile hat noch nicht angefangen, also false.
    //           Der Hook las das als "fertig gesprochen" und schaltete weiter.
    // Die gerade erst begonnene Zeile wurde daraufhin vom `stoppen()` des Schlüsselwechsels
    // wieder abgeschnitten — auf jedem Screen aufs Neue, und das Weiterschalten wirkte
    // entsprechend gehetzt. Beides ist dieselbe Ursache.
    //
    // ERSTER ANLAUF, der NICHT gereicht hat (Nutzer am 2026-09-14: "Stimme brechen immer noch
    // ab bevor die erste Aufgabe von Q1 gestartet werden"): Die Abfrage wurde gegen den
    // Nachhall des Abbruchs abgesichert — `onStart` als eindeutiger Beginn, eine Karenzzeit,
    // zwei Leermessungen für das Ende. Das konnte im Browser gar nicht helfen, denn JEDE
    // dieser Stufen wertet weiterhin `window.speechSynthesis.speaking` aus, und genau dieser
    // Wert ist dort das Problem (Beleg: node_modules/expo-speech/build/ExponentSpeech.web.js,
    // `isSpeaking()` gibt ihn unverändert zurück). Er kann mitten in einer laufenden Äußerung
    // `false` melden — zwei Messungen später galt die Zeile als beendet, und das Weiterschalten
    // schnitt sie ab.
    //
    // JETZIGE LÖSUNG: im Browser wird die Abfrage gar nicht erst gestartet. Dort ist `onDone`
    // das `end`-Ereignis genau dieser Äußerung und damit die verlässliche Quelle; die Stufen
    // unten gelten nur noch nativ, wo es umgekehrt ist. Siehe ENGINE_ABFRAGE_VERLAESSLICH in
    // luxStimme.ts — dort steht die Begründung für beide Plattformen an einer Stelle.
    //
    // Die drei Stufen der nativen Abfrage:
    //  1. `onStart` (unten an `sprich()` übergeben) ist die eindeutige Auskunft "DIESE
    //     Äußerung beginnt jetzt". Sie kann nicht von der abgebrochenen vorherigen stammen,
    //     deren Beginn längst zurückliegt.
    //  2. Falls eine Plattform kein `onStart` meldet: Ein "spricht" innerhalb von
    //     ABBRUCH_NACHHALL_MS zählt nur als Beginn, wenn dazwischen mindestens einmal eine
    //     Sprechpause gemessen wurde (`leerGesehen`) — also nach einer steigenden Flanke, die
    //     nur die neue Äußerung ausgelöst haben kann. Danach ist ein "spricht" ohnehin
    //     zweifelsfrei die neue Zeile.
    //  3. Für das Ende zählen LEER_MESSUNGEN_FUER_ENDE aufeinanderfolgende Messungen, nicht
    //     eine einzelne.
    let hatGesprochen = false;
    let leerGesehen = false;
    let leerFolge = 0;

    // Bewusst als eigene, argumentlose Aufrufe: `zeileFertig` hätte sonst das erste Argument
    // aus expo-speech bekommen und `vonEngine` fälschlich als "bestätigt" gelesen.
    sprich(text, {
      onStart: () => {
        if (eigeneGeneration !== generation.current) return;
        hatGesprochen = true;
        leerFolge = 0;
      },
      // Im Browser ist dieses `onDone` das `end`-Ereignis genau dieser Äußerung und damit
      // bestätigt (`vonEngine: true`) — die geschätzte Mindestdauer entfällt, es ist nichts
      // mehr zu schätzen. Nativ bleibt es die unzuverlässige Meldung, die abgesichert wird.
      onFertig: () => zeileFertig(!ENGINE_ABFRAGE_VERLAESSLICH),
    });

    // Im Browser gar nicht erst abfragen (siehe die lange Begründung oben): Dort liefert die
    // Abfrage `window.speechSynthesis.speaking` zurück, und dieser Wert ist nach dem
    // `Speech.stop()` vor jeder Zeile nicht brauchbar. `onDone` oben übernimmt.
    if (!ENGINE_ABFRAGE_VERLAESSLICH) {
      pruefung.current = null;
      return;
    }

    eigenePruefung = setInterval(() => {
      if (gemeldet || eigeneGeneration !== generation.current) {
        if (eigenePruefung) clearInterval(eigenePruefung);
        return;
      }
      sprichtGerade().then((spricht) => {
        // Zwischen Abfrage und Antwort kann eine neue Zeile begonnen haben — dann ist diese
        // Antwort über eine fremde Äußerung und darf nichts auslösen.
        if (gemeldet || eigeneGeneration !== generation.current) return;
        if (spricht) {
          leerFolge = 0;
          // Siehe Stufe 2 oben: im Nachhall des Abbruchs nur mit gemessener Sprechpause.
          if (leerGesehen || Date.now() - startZeit >= ABBRUCH_NACHHALL_MS) {
            hatGesprochen = true;
          }
          return;
        }
        leerGesehen = true;
        leerFolge++;
        if (!hatGesprochen) {
          // Noch nicht angefangen (Engine lädt die Stimme) — weiter warten, aber nicht ewig:
          // Nach der Geduldsfrist ist die Auskunft offenbar nicht zu gebrauchen, dann wieder
          // `onDone` + Mindestdauer + Sicherheitsnetz übernehmen lassen.
          if (Date.now() - startZeit >= START_GEDULD_MS && eigenePruefung) {
            clearInterval(eigenePruefung);
          }
          return;
        }
        if (leerFolge < LEER_MESSUNGEN_FUER_ENDE) return;
        zeileFertig(true);
      });
    }, PRUEF_INTERVALL_MS);
    pruefung.current = eigenePruefung;
  };

  useEffect(() => {
    zeileSprechenRef.current();
    return () => {
      // Generation vorab hochzählen: ein eventuell noch ausstehendes/verspätetes onDone
      // der gerade beendeten Sprechanfrage erkennt sich damit sofort als überholt (siehe
      // Kommentar oben) — zusätzlich zum ohnehin folgenden stoppen()/clearTimeout().
      generation.current++;
      stoppen();
      if (erinnerungTimer.current) clearTimeout(erinnerungTimer.current);
      if (sicherheitsnetz.current) clearTimeout(sicherheitsnetz.current);
      if (pruefung.current) clearInterval(pruefung.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  function wiederholen() {
    zeileSprechenRef.current();
  }

  return { wiederholen, aktuelleZeile };
}
