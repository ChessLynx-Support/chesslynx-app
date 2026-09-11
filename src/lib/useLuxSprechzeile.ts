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
import { sprich, stoppen } from "./luxStimme";

const ERINNERUNG_MS = 8000;
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
    // Eigener Griff je Zeile: ein verspätetes Ende einer ÄLTEREN Zeile darf nur deren eigenes
    // Netz löschen, nie das der aktuellen.
    const eigenesNetz = setTimeout(() => zeileFertig(), text.length * 130 + 3000);
    sicherheitsnetz.current = eigenesNetz;
    const zeileFertig = () => {
      if (gemeldet) return;
      gemeldet = true;
      clearTimeout(eigenesNetz);
      erledigt();
    };
    sprich(text, { onFertig: zeileFertig });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  function wiederholen() {
    zeileSprechenRef.current();
  }

  return { wiederholen, aktuelleZeile };
}
