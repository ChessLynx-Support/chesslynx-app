// Kapselt die gesprochene Lux-Führung (Opus-Review, 2026-09-07, Abschnitt 3.1, siehe
// claude/review_logik_grafik_audiofuehrung.md: "gravierendstes Einzelproblem der App" —
// bisher hatte ChessLynx trotz des zentralen Design-Grundsatzes "vollständig textfrei,
// durchgehend über Lux' gesprochene Führung" keinerlei Sprachausgabe, nur geschriebenen
// Text). Nutzt Geräte-TTS (`expo-speech`) statt vorgerenderter Audiodateien: keine neuen
// Assets, keine Netzwerkanfrage, auf iOS vollständig on-device (siehe Ergänzung in
// datenschutz_store_pruefung.md, dort noch nachzutragen). Bewusst in einem eigenen,
// schmalen Modul gekapselt (nur `sprich`/`stoppen` nach außen sichtbar) — der im
// Aufwandsdokument angepeilte spätere Umstieg auf vorgerenderte KI-Sprachdateien soll
// dadurch ein Ein-Datei-Wechsel bleiben, ohne `useLuxSprechzeile.ts` oder die aufrufenden
// Quest-Screens anzufassen.
//
// WICHTIG für den Nutzer: `expo-speech` ist im Projekt noch nicht installiert (siehe
// package.json — die genaue, zum installierten Expo SDK 51 passende Version lässt sich
// nicht pauschal eintragen, ohne ein Fehlschlagen von `npm install` zu riskieren). Vor dem
// ersten Testlauf einmalig im Projektordner ausführen:
//   npx expo install expo-speech expo-haptics expo-av
// (die beiden anderen Pakete gehören zu luxHaptik.ts/luxKlang.ts, siehe dort). Ohne diesen
// Schritt lässt sich die App gar nicht mehr bündeln ("Unable to resolve module").

import { useEffect, useState } from "react";
import * as Speech from "expo-speech";
import { STIMME_OPTIONEN, bevorzugteStimmeIdSynchron, leseBevorzugteStimmeId } from "./stimmeAuswahl";

// Design-Vorgabe 3.1, Schritt 3: etwas langsamer und eine Idee höher als die
// Systemstimme im Standard — für Kinderohren klarer artikuliert, ohne kindisch/
// übertrieben zu klingen. Nutzer-Feedback 2026-09-07 ("Sprechgeschwindigkeit ist gut")
// ließ `rate` zunächst unverändert; Feedback 2026-09-08 nach Test der Stimmauswahl
// ("kann leicht erhöht werden") passte `rate` dann leicht nach oben an — siehe die
// eigentliche Definition samt Versionsgeschichte in stimmeAuswahl.ts (einzige Quelle),
// damit das dortige Vorhören exakt so klingt wie Lux tatsächlich im Spiel.

// Nutzer-Feedback 2026-09-07: "Stimme ist sehr künstlich, computergesteuert. Wir brauchen
// hier eine sehr freundliche, kindliche Stimme." Ohne eigene `voice`-Angabe wählt
// expo-speech/das Betriebssystem stillschweigend irgendeine Standardstimme der Sprache —
// auf iOS ist das oft eine ältere, kompakte "Default"-Qualitätsstufe, obwohl auf
// demselben Gerät meist bereits eine deutlich natürlicher klingende "Enhanced"/
// "Premium"-Stimme installiert oder (in den iOS-Bedienungshilfen) mit einem Fingertipp
// nachladbar ist. `getAvailableVoicesAsync()` listet alle auf dem Gerät bekannten Stimmen
// inkl. ihrer `quality` — hier wird daraus einmalig die beste verfügbare deutsche Stimme
// ausgewählt und für alle folgenden sprich()-Aufrufe gemerkt.
//
// EHRLICHE EINSCHRÄNKUNG (siehe auch aufwandsschaetzung_mvp_rollout.md): das ist die
// Obergrenze dessen, was reine Geräte-TTS leisten kann. Eine wirklich warme, professionell
// klingende Kinderstimme — wie es sich der Nutzer wünscht — braucht eine cloud-basierte
// KI-Sprachsynthese; das ist im Aufwandsdokument bereits als bewusst zurückgestellte,
// spätere Ablösung vorgesehen, genau deshalb ist dieses Modul so schmal gekapselt (siehe
// Datei-Kommentar oben). Diese Funktion holt lediglich das beste heraus, was auf dem
// jeweiligen Testgerät bereits vorhanden ist, ganz ohne neue Assets oder Netzwerkzugriff —
// auf manchen Android-Geräten mit nur einer einzigen, undifferenzierten Systemstimme wird
// sich dadurch hörbar wenig ändern.
//
// Nutzer-Feedback 2026-09-08: im Browser am PC (`expo start --web`) hilft auch das
// nichts — die Web Speech API liefert keine verlässliche `quality`-Angabe, das
// String-Matching unten greift dort praktisch nie. Deshalb gibt es inzwischen
// zusätzlich eine bewusste, manuelle Stimmauswahl mit Vorhören im Eltern-Dashboard
// (siehe stimmeAuswahl.ts) — die hat in `sprich()` unten IMMER Vorrang vor dem
// Ergebnis dieser automatischen Heuristik hier.
let automatischeStimme: string | undefined;
let stimmenSucheGestartet = false;

async function ermittleBevorzugteStimme(): Promise<string | undefined> {
  try {
    const stimmen = await Speech.getAvailableVoicesAsync();
    const deutsche = stimmen.filter((s) => s.language?.toLowerCase().startsWith("de"));
    if (deutsche.length === 0) return undefined;
    // "Enhanced"/"Premium" (iOS-Bezeichnungen) klingen hörbar natürlicher als "Default" —
    // wo vorhanden, bevorzugt wählen. Android liefert meist keine differenzierte
    // `quality`-Angabe; dort bleibt es bei der ersten gefundenen deutschen Stimme (i. d. R.
    // ohnehin identisch mit der Systemstandardstimme).
    // (String-Vergleich statt direktem Enum-Vergleich: expo-speechs `VoiceQuality`-Typ
    // kennt modellabhängig ggf. nicht beide Werte, "Premium" soll aber nicht an einem
    // reinen TS-Typfehler scheitern.)
    const beste =
      deutsche.find((s) => String(s.quality) === "Enhanced" || String(s.quality) === "Premium") ?? deutsche[0];
    return beste.identifier;
  } catch {
    // getAvailableVoicesAsync() ist nicht auf jeder Plattform/jedem Gerät garantiert
    // verfügbar (z. B. manche Web-Umgebungen) — bei Fehlschlag einfach bei der
    // Systemstandardstimme bleiben, statt die Sprachausgabe ganz zu verlieren.
    return undefined;
  }
}

function stelleStimmeBereit() {
  if (stimmenSucheGestartet) return;
  stimmenSucheGestartet = true;
  // Beides parallel anstoßen: die manuelle Wahl (falls im Eltern-Dashboard bereits
  // einmal getroffen und gespeichert) und die automatische Bestenauswahl als Fallback.
  // `leseBevorzugteStimmeId()` füllt dabei denselben Zwischenspeicher, den
  // `bevorzugteStimmeIdSynchron()` unten in sprich() abfragt — wichtig, damit auch die
  // allererste gesprochene Zeile der App (meist vor einem ersten Dashboard-Besuch) schon
  // eine zuvor gespeicherte manuelle Wahl berücksichtigen kann, sobald sie geladen ist.
  leseBevorzugteStimmeId();
  ermittleBevorzugteStimme().then((id) => {
    automatischeStimme = id;
  });
}

/**
 * Spricht `zeile` sofort (bricht eine eventuell noch laufende vorherige Ausgabe zuerst
 * ab, statt sie zu überlagern — Design-Vorgabe 3.3: "nicht zusätzlich abspielen").
 * `onFertig` feuert nur bei natürlichem Sprechende, NICHT wenn die Ausgabe durch einen
 * Abbruch (erneuter sprich()-Aufruf oder stoppen()) unterbrochen wurde — sonst würde ein
 * schnelles Weitertippen fälschlich als "Zeile zu Ende gesprochen" gewertet.
 *
 * Ruft `stelleStimmeBereit()` bei jedem Aufruf auf (billige No-Op nach dem ersten Mal) —
 * die Stimmen-Ermittlung läuft asynchron im Hintergrund, deshalb kann die allererste
 * gesprochene Zeile der App (meist die Onboarding-Begrüßung) noch mit der System-
 * standardstimme herauskommen, bevor `automatischeStimme` gesetzt ist; jede folgende
 * Zeile profitiert dann bereits davon.
 */
export function sprich(zeile: string, optionen?: { onFertig?: () => void }) {
  if (!zeile) return;
  stelleStimmeBereit();
  Speech.stop();
  const stimme = bevorzugteStimmeIdSynchron() ?? automatischeStimme;
  // `onDone` bewusst gekapselt statt direkt durchgereicht: Je nach Plattform/Version ruft
  // expo-speech den Callback mit einem Ereignisobjekt auf. `onFertig` in useLuxSprechzeile.ts
  // hat inzwischen einen optionalen ersten Parameter (`vonEngine`) — ein durchgereichtes
  // Ereignis würde dort versehentlich als `true` gelesen und die Absicherung gegen zu frühe
  // Ende-Meldungen aushebeln. Hier wird deshalb garantiert ohne Argumente aufgerufen.
  Speech.speak(fuerSprachausgabe(zeile), {
    ...STIMME_OPTIONEN,
    voice: stimme,
    onDone: () => optionen?.onFertig?.(),
  });
  beginneSprechzustand();
}

// ---------------------------------------------------------------------------
// "Spricht Lux gerade?" — als abonnierbarer Zustand für die Darstellung
//
// Wozu: Seit dem 2026-09-13 gibt es für Lux einen freigegebenen Zustand mit geöffnetem
// Maul (assets/lux/zustaende/lux_sprechen.webp, siehe scripts/rig_configs/lux.json,
// Zustand S1_sprechen). Damit das Maul sich zur Stimme bewegt statt willkürlich, braucht
// die Anzeige eine Auskunft darüber, ob gerade tatsächlich gesprochen wird — und zwar
// dieselbe Auskunft, die auch `useLuxSprechzeile.ts` benutzt: die der Engine.
//
// Warum nicht einfach `onDone` auswerten: aus genau dem Grund, der bei `sprichtGerade()`
// weiter unten ausführlich steht — auf Android melden etliche TTS-Engines `onDone` viel zu
// früh. Das Maul würde dann mitten im Satz zugehen. Deshalb wird der Zustand hier nur
// EINGESCHALTET, wenn `sprich()` läuft, und ausgeschaltet, wenn die Engine selbst meldet,
// dass sie verstummt ist.
//
// `ANLAUF_MS` ist die Gegenrichtung desselben Problems: Unmittelbar nach `Speech.speak()`
// meldet die Engine je nach Plattform noch "spricht nicht" (die Äußerung steht erst in der
// Warteschlange). Ohne diese Anlaufzeit ginge das Maul sofort wieder zu.
//
// Gehört bewusst in dieses Modul: Es kapselt die gesprochene Ausgabe, und ein späterer
// Umstieg auf vorgerenderte Sprachdateien (siehe Datei-Kommentar oben) muss diese Auskunft
// genauso liefern — dort sogar einfacher, weil die Dauer einer Datei bekannt ist.
const ANLAUF_MS = 500;
const PRUEF_TAKT_MS = 250;

let spricht = false;
let begonnenAm = 0;
let pruefung: ReturnType<typeof setInterval> | undefined;
const zuhoerer = new Set<(spricht: boolean) => void>();

function setzeSprechzustand(neu: boolean) {
  if (spricht === neu) return;
  spricht = neu;
  zuhoerer.forEach((melde) => melde(neu));
}

function beendePruefung() {
  if (!pruefung) return;
  clearInterval(pruefung);
  pruefung = undefined;
}

function beginneSprechzustand() {
  begonnenAm = Date.now();
  setzeSprechzustand(true);
  if (pruefung) return;
  pruefung = setInterval(() => {
    if (Date.now() - begonnenAm < ANLAUF_MS) return;
    sprichtGerade().then((laeuft) => {
      if (laeuft || Date.now() - begonnenAm < ANLAUF_MS) return;
      beendePruefung();
      setzeSprechzustand(false);
    });
  }, PRUEF_TAKT_MS);
}

/**
 * Meldet, ob Lux gerade spricht — anders als `sprichtGerade()` nicht als einmalige Abfrage,
 * sondern als React-Zustand, der sich von selbst aktualisiert. Gedacht für Lux' Maul
 * (siehe lib/luxAssets.tsx) und alles andere, was zur Stimme mitgehen soll.
 */
export function useLuxSpricht(): boolean {
  const [aktiv, setAktiv] = useState(spricht);
  useEffect(() => {
    // Beim Einhängen einmal nachziehen: Zwischen dem ersten Rendern und diesem Effekt kann
    // eine Zeile begonnen haben.
    setAktiv(spricht);
    zuhoerer.add(setAktiv);
    return () => {
      zuhoerer.delete(setAktiv);
    };
  }, []);
  return aktiv;
}

/**
 * Gerätetest 2026-09-11 (Nutzer: "Es sind wieder Bindestriche enthalten, die den Sprachfluss
 * mit der Computerstimme unnatürlich wirken lassen"): Gedankenstriche werden von der Geräte-
 * Stimme überlesen oder seltsam betont. Nur für die Sprachausgabe (die Untertitel behalten
 * den Strich) wird ein freistehender Gedankenstrich zu einem Komma — das gibt eine kurze,
 * natürliche Pause. Dieselbe Regel gehört später ins TTS-Exportskript (Paket 4), damit die
 * vorgerenderten Dateien genauso klingen.
 */
export function fuerSprachausgabe(zeile: string): string {
  return zeile.replace(/\s+[–—-]\s+/g, ", ").replace(/,\s*,/g, ",");
}

export function stoppen() {
  Speech.stop();
  // Hier ist der Abbruch die verlässliche Information — nicht erst die Engine fragen,
  // sondern das Maul sofort schließen.
  beendePruefung();
  setzeSprechzustand(false);
}

/**
 * Meldet, ob die Sprachausgabe GERADE JETZT tatsächlich spricht — direkt aus der
 * Sprach-Engine, nicht aus einer Schätzung.
 *
 * Gerätetest 2026-09-11/13 (Nutzer: "Die automatische Führung beim Turm wirkt abgehackt,
 * die Sätze werden nicht zuende gesprochen", nach einem ersten Anlauf erneut: "Die Texte
 * wirken weiterhin abgehackt"): Auf Android melden etliche TTS-Engines ihr `onDone` VIEL zu
 * früh — teils schon beim Einreihen der Äußerung, teils ausgelöst durch das `Speech.stop()`,
 * das `sprich()` unmittelbar davor aufruft. Die Folge ist keine reine Anzeigefrage, sondern
 * ein echter Abschnitt: Auf ein zu frühes `onDone` schaltet die Auto-Weiter-Kette zur
 * nächsten Zeile, der Schlüsselwechsel räumt auf und ruft `stoppen()` — und schneidet damit
 * den noch laufenden Satz mitten im Wort ab.
 *
 * Der erste Anlauf schätzte die Sprechdauer nur (Mindestdauer pro Zeichen). Das ist
 * grundsätzlich unzuverlässig: Die tatsächliche Dauer hängt an Engine, Stimme, gewählter
 * Sprechrate und Satzzeichen. `isSpeakingAsync()` ist stattdessen die Engine-eigene Auskunft
 * und damit die einzige belastbare Quelle — `useLuxSprechzeile.ts` fragt sie in kurzen
 * Abständen ab und schaltet erst weiter, wenn die Engine wirklich verstummt ist.
 *
 * Bei Fehlern bewusst `false`: Kann die Plattform nicht antworten, soll die Führung nicht
 * hängen bleiben — das Sicherheitsnetz und die Mindestdauer in `useLuxSprechzeile.ts`
 * greifen dann weiterhin.
 */
export async function sprichtGerade(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

// Design-Vorgabe 3.1, Schritt 6 ("Text vorerst hinter ein Flag ... im
// Auslieferungszustand an"): stand hier zunächst als einfache Code-Konstante
// (`ZEIGE_UNTERTITEL`), inzwischen durch einen echten Eltern-Dashboard-Schalter
// abgelöst — siehe `src/lib/untertitelEinstellung.ts` (`useUntertitelAktiv()`-Hook für
// Quest1.tsx–Quest6.tsx, Umschalt-Funktion für ParentDashboard.tsx). Bewusst als eigenes
// Modul statt hier belassen: `luxStimme.ts` kapselt weiterhin nur die gesprochene
// Ausgabe, das Untertitel-Ein/Aus ist eine reine Anzeige-Einstellung ohne Bezug zu TTS.
