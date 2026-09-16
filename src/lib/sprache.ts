// Sprachumschaltung — Grundlage für den geplanten DE+EN-Simultanlaunch.
//
// WARUM ES DIESE DATEI GIBT (2026-09-14): Bei der Prüfung von Apple Guideline 1.3 fiel auf,
// dass die App überhaupt keine Sprachumschaltung hatte — kein `expo-localization`, keine
// i18n-Bibliothek, kein Locale-Zugriff. Jeder sichtbare Text steht fest auf Deutsch im Code.
// `useDeviceLanguage()` in lib/firebase.ts betrifft nur die Firebase-Mails, nicht die
// Oberfläche. Zugleich verweisen die Rechtstexte-Links auf `chesslynx.de`, während der
// Launch laut Projektunterlagen DE+EN simultan geplant ist und für Englisch `chesslynx.com`
// vorgesehen war. Ohne eine Stelle, die die Sprache kennt, ließ sich das gar nicht umsetzen.
//
// BEWUSST OHNE NEUE ABHÄNGIGKEIT FÜR DIE SPRACHERKENNUNG: `expo-localization` wäre der
// übliche Weg, ist aber ein natives Modul — es würde einen neuen Dev-Client-Build erzwingen,
// bevor irgendjemand die Änderung testen kann. `Intl.DateTimeFormat().resolvedOptions().locale`
// liefert dieselbe Auskunft aus der JavaScript-Laufzeit (Hermes bringt Intl auf beiden
// Plattformen mit) und funktioniert im bestehenden Build sofort. Sollte sich das auf einem
// Gerät als unzuverlässig erweisen, ist der Wechsel auf `expo-localization` ein Eingriff in
// genau diese eine Funktion.
//
// UMFANG, damit niemand den Aufwand unterschätzt: Eine Zählung am 2026-09-14 ergab rund
// **410 deutschsprachige Textstellen in 38 Dateien**. Der größte Teil davon sind Lux'
// Sprechzeilen — und die brauchen nicht nur eine Übersetzung, sondern auch englische
// TTS-Stimmen und eine erneute Abstimmung von Tempo und Pausen (siehe lib/stimmeAuswahl.ts
// und die Sprechende-Erkennung in lib/useLuxSprechzeile.ts). Das Übersetzen ist die kleinere
// Hälfte der Arbeit. Diese Datei macht die Umschaltung möglich, sie erledigt sie nicht.
//
// KEY-BASIERTES SYSTEM (2026-09-15, Christian-Entscheidung, siehe claude/
// i18next_umstellung_plan_2026-09-15.md): Ab jetzt kommt für NEUE bzw. migrierte Textstellen
// `tk(key)` statt `t(de, en)` zum Einsatz, siehe Kommentar bei `tk` unten. `t()` bleibt
// UNVERÄNDERT bestehen — die ~370 bereits umgestellten Aufrufstellen funktionieren
// unverändert weiter, beide Aufrufmuster laufen während der schrittweisen Migration
// nebeneinander her.

import AsyncStorage from "@react-native-async-storage/async-storage";
import i18next from "i18next";
// Statischer JSON-Import: Metro bündelt diese Dateien wie jedes andere Modul mit, kein
// asynchrones Nachladen nötig — genau wie bei `t()` bleibt jeder Aufruf synchron (siehe
// `tk()`-Kommentar unten, dieselbe Begründung wie schon bei `t()` oben).
import commonDe from "../../content/sprachen/de/common.json";
import commonEn from "../../content/sprachen/en/common.json";

export type Sprache = "de" | "en";
/** "auto" = der Gerätesprache folgen (Voreinstellung). */
export type SprachWahl = Sprache | "auto";

const SCHLUESSEL = "chesslynx:sprache";

// Die aus der Gerätesprache abgeleitete Sprache — einmal ermittelt und gemerkt, denn sie
// ändert sich während einer Sitzung nicht.
let ausGeraet: Sprache | undefined;
// Die bewusste Wahl aus dem Eltern-Bereich. Bis `ladeSprache()` gelaufen ist "auto", damit
// die App auch dann etwas Vernünftiges anzeigt, wenn der Speicher noch nicht gelesen wurde.
let wahl: SprachWahl = "auto";

// Einmalige, synchrone Grundinitialisierung von i18next. BEWUSST OHNE `lng`-Abhängigkeit von
// `sprache()`/`wahl` hier: `tk()` unten übergibt die aktuell aufgelöste Sprache bei JEDEM
// Aufruf explizit über die `lng`-Option (statt sich auf i18next.language/changeLanguage() zu
// verlassen) — dasselbe "im Moment des Aufrufs lesen"-Prinzip wie bei `t()`. Das erspart eine
// zweite, mit `wahl` zu synchronisierende Zustandskopie und macht `setzeSprache()` bei einem
// Sprachwechsel sofort wirksam, ohne auf eine (bei i18next grundsätzlich asynchrone)
// `changeLanguage()`-Promise zu warten.
//
// BEWUSST OHNE `.use(initReactI18next)`: `tk()` unten ruft `i18next.t()` direkt auf, nicht
// über den `useTranslation()`-Hook aus react-i18next — das Paket bleibt installiert für den
// Tag, an dem ein Screen den Hook tatsächlich braucht, wird hier aber bewusst nicht
// eingebunden.
//
// Korrektur (zweiter Typecheck-Lauf 2026-09-15, TS2769): Der tatsächliche Fehler lag NICHT
// am `.use()`-Chaining (das war eine falsche erste Diagnose), sondern schlicht an einem
// veralteten Options-Namen: `initImmediate` heißt in der installierten i18next-Version
// (26.4.2, siehe node_modules/i18next/typescript/options.d.ts) `initAsync` — `initImmediate`
// existiert dort überhaupt nicht mehr. Die verwirrende Fehlermeldung
// ("initImmediate does not exist in type InitOptions<unknown>") kam daher, dass TypeScript
// bei einem nicht auflösbaren Property zusätzlich den generischen Parameter der ganzen
// Options-Signatur als `unknown` meldet, nicht nur die eine falsche Zeile.
i18next.init({
  resources: {
    de: { common: commonDe },
    en: { common: commonEn },
  },
  lng: "de",
  fallbackLng: "de",
  defaultNS: "common",
  ns: ["common"],
  interpolation: { escapeValue: false },
  returnNull: false,
  // Ohne HTTP-Backend/async Lade-Plugins ist die Initialisierung ohnehin synchron abgeschlossen,
  // bevor der erste `tk()`-Aufruf läuft (Modul-Ladezeit) — `initAsync: false` macht das
  // zusätzlich explizit, statt sich auf diesen Umstand nur implizit zu verlassen.
  initAsync: false,
});

/**
 * Die Sprache, in der die App läuft: die bewusste Wahl aus dem Eltern-Bereich, sonst die
 * Gerätesprache. Alles außer Englisch ergibt Deutsch — die App ist deutschsprachig
 * entstanden, Deutsch ist die sichere Rückfallebene, nicht Englisch.
 *
 * BEWUSST SYNCHRON: `t()` wird in Sprechzeilen-Listen und mitten im Rendern aufgerufen; ein
 * `await` an jeder dieser Stellen wäre unzumutbar. Deshalb liegt die gespeicherte Wahl in
 * einer Modulvariable, die `ladeSprache()` beim App-Start einmalig füllt (siehe App.tsx).
 */
export function sprache(): Sprache {
  if (wahl !== "auto") return wahl;
  if (!ausGeraet) ausGeraet = ermittle();
  return ausGeraet;
}

/** Die rohe Einstellung inklusive "auto" — für die Anzeige im Eltern-Bereich. */
export function sprachWahl(): SprachWahl {
  return wahl;
}

function ermittle(): Sprache {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale?.toLowerCase().startsWith("en") ? "en" : "de";
  } catch {
    // Intl ist auf jeder von uns unterstützten Plattform vorhanden; falls doch nicht,
    // ist Deutsch die richtige Annahme (siehe oben).
    return "de";
  }
}

/**
 * Liest die gespeicherte Wahl. **Muss beim App-Start aufgerufen werden, bevor der erste
 * Screen rendert** — siehe App.tsx. Vorher gilt "auto", und ein Screen, der vor dem Laden
 * gerendert hätte, zeigte die Gerätesprache statt der gewählten.
 */
export async function ladeSprache(): Promise<void> {
  try {
    const gespeichert = await AsyncStorage.getItem(SCHLUESSEL);
    if (gespeichert === "de" || gespeichert === "en" || gespeichert === "auto") {
      wahl = gespeichert;
    }
  } catch {
    // Ohne Speicher bleibt "auto" — die App läuft, nur ohne gemerkte Wahl.
  }
}

/**
 * Setzt die Sprache aus dem Eltern-Bereich. Wirkt sofort für alles, was danach gerendert
 * oder gesprochen wird — deshalb sind die Sprechzeilen-Listen in den Quest-Screens
 * Funktionen und keine Konstanten (siehe Kommentar bei `t` unten).
 */
export async function setzeSprache(neu: SprachWahl): Promise<void> {
  wahl = neu;
  try {
    await AsyncStorage.setItem(SCHLUESSEL, neu);
  } catch {
    // Die Wahl gilt dann nur für diese Sitzung — besser als ein Absturz beim Umstellen.
  }
}

/**
 * Kurzform für zweisprachige Texte an der Verwendungsstelle:
 *
 *   <Text>{t("Abbrechen", "Cancel")}</Text>
 *
 * SEIT 2026-09-15 NUR NOCH FÜR BESTEHENDE AUFRUFSTELLEN: Für neue bzw. migrierte Texte gilt
 * jetzt `tk(key)` (siehe unten, Christian-Entscheidung "Key-basiertes System von Anfang bauen
 * und jetzt damit beginnen"). Diese Funktion bleibt unverändert bestehen, bis auch die letzte
 * der ~370 bereits so geschriebenen Aufrufstellen migriert ist — sie NICHT umzubauen oder
 * umzuwidmen ist Absicht, nicht Nachlässigkeit: eine Kollision der beiden Aufrufmuster würde
 * bestehendes Verhalten brechen.
 *
 * WICHTIG FÜR AUFRUFSTELLEN: `t()` liest die Sprache im Moment des Aufrufs. Sprechzeilen-
 * Listen gehören deshalb in eine **Funktion**, nicht in eine Modulkonstante — eine Konstante
 * würde beim Import ausgewertet, also bevor `ladeSprache()` die gespeicherte Wahl kennt, und
 * bliebe danach auf der Gerätesprache stehen. Dieselbe Regel gilt unverändert für `tk()`.
 */
export function t(de: string, en: string): string {
  return sprache() === "en" ? en : de;
}

/**
 * Key-basierter Text-Lookup über i18next, ab 2026-09-15 der Standardweg für neue bzw.
 * migrierte Texte (siehe claude/i18next_umstellung_plan_2026-09-15.md für die volle
 * Architektur-Begründung). Katalogdateien: `content/sprachen/<code>/common.json`.
 *
 *   <Text>{tk("quest1.screen1.zeile1")}</Text>
 *
 * KEY-NAMENSSCHEMA: punktgetrennt, `<bereich>.<unterbereich>.<slug>` — dieselbe Form wie die
 * bestehenden TTS-Sprechzeilen-IDs in `content/sprachexport_2026-09-10/...csv`
 * (z. B. `wisent.kuer.hub.intro_1`). Für Quest 1-6 gibt es dort noch keine IDs (die CSV deckt
 * bisher nur die neueren Update-1-Inhalte ab); die hier neu vergebenen Keys
 * (`quest1.screen1.zeile1` usw.) sind bewusst so gewählt, dass sie später, wenn die
 * TTS-Anbindung auch für die sechs Kern-Quests kommt, unverändert als Audio-Datei-ID
 * weiterverwendet werden können — siehe Migrationsentscheidung, dieselbe ID für Anzeige- und
 * Sprechtext zu benutzen, statt zwei parallele Schemata zu pflegen.
 *
 * BEWUSST SYNCHRON UND OHNE i18next-INTERNEN SPRACHZUSTAND: `sprache()` wird bei JEDEM Aufruf
 * neu ausgewertet und explizit als `lng`-Option übergeben, statt sich auf
 * `i18next.changeLanguage()`/`i18next.language` zu verlassen (das wäre asynchron und müsste an
 * jeder Stelle, die `wahl` ändert, extra synchronisiert werden). Dasselbe "Sprache im Moment
 * des Aufrufs lesen"-Prinzip wie bei `t()` — siehe dortiger Kommentar zu
 * Modulkonstante-vs-Funktion, das gilt hier unverändert.
 */
export function tk(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, { lng: sprache(), ...options }) as string;
}

// --- Rechtstexte und Kontakt --------------------------------------------------------------
//
// Alle nach außen führenden Adressen an EINER Stelle. Vorher lagen sie verstreut in
// ElternLogin.tsx und ParentDashboard.tsx, alle fest auf `chesslynx.de` — was für die
// englische Fassung falsch gewesen wäre.
//
// Beide Domains gehören zum Projekt und liegen bei all-inkl (geprüft 2026-09-14):
// `chesslynx.de` trägt die deutschen Rechtstexte, `chesslynx.com` die englischen.
//
// ⚠ DIE ENGLISCHEN PFADE SIND VORLÄUFIG. Beide Websites sind derzeit geparkt; welche
// Pfade die englische Fassung bekommt (`/privacy` oder `/datenschutz` oder etwas anderes),
// entscheidet sich erst beim Bau der Seite. Wenn es so weit ist, wird genau dieser Block
// angepasst — und sonst nichts. Vor der Einreichung bei Apple müssen die Links erreichbar
// sein: Guideline 5.1.4 verlangt die Datenschutzerklärung zwingend, und der Prüfer klickt
// sie an.
const ADRESSEN = {
  de: {
    datenschutz: "https://www.chesslynx.de/datenschutz",
    nutzungsbedingungen: "https://www.chesslynx.de/nutzungsbedingungen",
    impressum: "https://www.chesslynx.de/impressum",
  },
  en: {
    datenschutz: "https://www.chesslynx.com/privacy",
    nutzungsbedingungen: "https://www.chesslynx.com/terms",
    impressum: "https://www.chesslynx.com/imprint",
  },
} as const;

export function datenschutzUrl(): string {
  return ADRESSEN[sprache()].datenschutz;
}

export function nutzungsbedingungenUrl(): string {
  return ADRESSEN[sprache()].nutzungsbedingungen;
}

export function impressumUrl(): string {
  return ADRESSEN[sprache()].impressum;
}

/**
 * Datenschutz-Kontaktadresse. Bewusst NICHT sprachabhängig: Es gibt genau ein Postfach,
 * und zwar auf `.com` (bestätigt 2026-09-14). Im Code stand bis dahin
 * `privacy@chesslynx.de` — diese Adresse existiert nicht, Anfragen wären ins Leere gelaufen.
 * Eine Datenschutz-Kontaktadresse, die niemand liest, ist schlimmer als keine.
 */
export const DATENSCHUTZ_MAIL = "privacy@chesslynx.com";
