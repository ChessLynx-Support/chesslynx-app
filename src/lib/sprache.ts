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

export type Sprache = "de" | "en";

// Einmal ermittelt und gemerkt: Die Gerätesprache ändert sich während einer Sitzung nicht,
// und ein wiederholter Intl-Aufruf in jedem Render wäre unnötig.
let gemerkteSprache: Sprache | undefined;

/**
 * Die Sprache, in der die App läuft. Alles außer Englisch ergibt Deutsch — die App ist
 * deutschsprachig entstanden, Deutsch ist die sichere Rückfallebene, nicht Englisch.
 */
export function sprache(): Sprache {
  if (gemerkteSprache) return gemerkteSprache;
  gemerkteSprache = ermittle();
  return gemerkteSprache;
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
