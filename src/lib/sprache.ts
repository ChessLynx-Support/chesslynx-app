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
// BEWUSST OHNE NEUE ABHÄNGIGKEIT: `expo-localization` wäre der übliche Weg, ist aber ein
// natives Modul — es würde einen neuen Dev-Client-Build erzwingen, bevor irgendjemand die
// Änderung testen kann. `Intl.DateTimeFormat().resolvedOptions().locale` liefert dieselbe
// Auskunft aus der JavaScript-Laufzeit (Hermes bringt Intl auf beiden Plattformen mit) und
// funktioniert im bestehenden Build sofort. Sollte sich das auf einem Gerät als unzuverlässig
// erweisen, ist der Wechsel auf `expo-localization` ein Eingriff in genau diese eine Funktion.
//
// UMFANG, damit niemand den Aufwand unterschätzt: Eine Zählung am 2026-09-14 ergab rund
// **410 deutschsprachige Textstellen in 38 Dateien**. Der größte Teil davon sind Lux'
// Sprechzeilen — und die brauchen nicht nur eine Übersetzung, sondern auch englische
// TTS-Stimmen und eine erneute Abstimmung von Tempo und Pausen (siehe lib/stimmeAuswahl.ts
// und die Sprechende-Erkennung in lib/useLuxSprechzeile.ts). Das Übersetzen ist die kleinere
// Hälfte der Arbeit. Diese Datei macht die Umschaltung möglich, sie erledigt sie nicht.

import AsyncStorage from "@react-native-async-storage/async-storage";

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
 * Bewusst KEIN Schlüssel-/Katalogsystem (`t("common.cancel")`): Bei 410 Textstellen, die
 * fast alle genau einmal vorkommen, kostet ein Katalog mehr, als er einbringt — man muss
 * beim Lesen des Codes immer erst nachschlagen, was dort eigentlich steht. Die zweisprachige
 * Form hält beide Fassungen nebeneinander und damit auch beim Ändern zusammen.
 * Falls später doch ein Katalog gebraucht wird (z. B. für externe Übersetzer), bleibt diese
 * Funktion die einzige Stelle, die umgestellt werden muss.
 *
 * WICHTIG FÜR AUFRUFSTELLEN: `t()` liest die Sprache im Moment des Aufrufs. Sprechzeilen-
 * Listen gehören deshalb in eine **Funktion**, nicht in eine Modulkonstante — eine Konstante
 * würde beim Import ausgewertet, also bevor `ladeSprache()` die gespeicherte Wahl kennt, und
 * bliebe danach auf der Gerätesprache stehen. Siehe `screenScripts()`/`phaseLines()` in
 * quest1/Quest1.tsx als Muster für die übrigen Quest-Screens.
 */
export function t(de: string, en: string): string {
  return sprache() === "en" ? en : de;
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
