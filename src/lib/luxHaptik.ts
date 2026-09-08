// Kleiner Wrapper um `expo-haptics` (Opus-Review, 2026-09-07, Abschnitt 3.1, Schritt 7:
// "Getrennt davon: expo-haptics für Impuls bei korrektem Zug/Stopp-Tap ... liefert den
// Wirkungshebel sofort, auch vor finaler Sprachqualität", siehe
// claude/review_logik_grafik_audiofuehrung.md). Bewusst in einem eigenen, winzigen Modul
// statt direkt in Board.tsx/QuestGeschafft.tsx — jede Funktion fängt Fehler still ab
// (z. B. auf Geräten/Emulatoren ohne Haptik-Engine oder mit ausgeschalteter Systemeinstellung):
// haptisches Feedback ist ein Zusatz, kein kritischer Pfad.
//
// WICHTIG für den Nutzer: siehe luxStimme.ts — `expo-haptics` gehört zum selben
// `npx expo install expo-speech expo-haptics expo-av`-Schritt.

import * as Haptics from "expo-haptics";

/** Korrekter Zug (Board.tsx, legales Zielfeld angetippt) — kurz und leicht. */
export function haptikZug() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Stopp!-Feld angetippt (Board.tsx, onTrapTap) — spürbar deutlicher als ein normaler Zug,
 * aber bewusst kein "Fehler-Ton" (Design-Grundsatz: kein Bestrafungs-Feedback). */
export function haptikStopp() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Quest abgeschlossen (QuestGeschafft.tsx) — die "Erfolg"-Notification-Haptik. */
export function haptikQuestGeschafft() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
