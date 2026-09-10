// Kleiner Wrapper um Audiowiedergabe (Opus-Review, 2026-09-07, Abschnitt 3.1, Schritt 7: "...
// drei kurze CC0-Klänge (Zug/Stopp/Quest geschafft)", siehe
// claude/review_logik_grafik_audiofuehrung.md). Statt echter CC0-Fundstücke (die als
// Datei-Download aus dem Internet eine eigene Rechte-/Lizenzprüfung bräuchten, siehe
// design_bibliotheken_und_lizenzen.md) verwendet dieses erste Feedback-Level drei selbst
// synthetisierte, reine Sinuston-Klänge (assets/sounds/*.wav, per kleinem Python-Skript
// erzeugt) — vollständig eigene, urheberrechtsfreie Erzeugnisse, kein Fremdmaterial.
// Klanglich bewusst einfach (kein Musikinstrument-Sample): liefert den im Review
// beschriebenen "Wirkungshebel sofort", kann aber jederzeit gegen hochwertigere,
// tatsächlich lizenzierte Klänge ausgetauscht werden, ohne die Aufrufstellen
// (Board.tsx/QuestGeschafft.tsx) anzufassen.
//
// Bugfix (Nutzer-Feedback 2026-09-08, Android-Absturz nach SDK-57-Update):
// "[runtime not ready]: Error: Cannot find native module 'ExponentAV'" — `expo-av` war
// schon seit SDK 54 als "wird entfernt" markiert (siehe die ursprüngliche Version dieses
// Kommentars/die dauerhafte expo-doctor-Warnung "Unmaintained: expo-av"), auf Web fiel das
// nie auf (Web ignoriert das native Modul komplett), aber Expo Go auf SDK 57 liefert das
// native ExponentAV-Modul offenbar tatsächlich nicht mehr mit aus — jeder Zugriff auf
// `expo-av`s Audio-API stürzt dadurch beim ersten echten Gerätetest ab. Ersetzt durch
// `expo-audio` (den von Expo offiziell empfohlenen Nachfolger, siehe
// https://docs.expo.dev/versions/latest/sdk/audio/), imperative API (`createAudioPlayer`)
// statt des komponentengebundenen `useAudioPlayer`-Hooks, da diese Datei außerhalb einer
// React-Komponente aufgerufen wird — genau der hier im Datei-Kommentar oben schon
// angekündigte "jederzeit austauschbar, ohne die Aufrufstellen anzufassen"-Fall.
//
// WICHTIG für den Nutzer: `expo-audio` muss einmalig installiert werden:
//   npx expo install expo-audio
// und `expo-av` kann danach entfernt werden:
//   npm uninstall expo-av

import { createAudioPlayer } from "expo-audio";

const zugDatei = require("../../assets/sounds/zug.wav");
const stoppDatei = require("../../assets/sounds/stopp.wav");
const questDatei = require("../../assets/sounds/quest_geschafft.wav");

function spieleKlang(datei: number) {
  try {
    const player = createAudioPlayer(datei);
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        player.remove();
      }
    });
    player.play();
  } catch {
    // Klang ist ein Zusatz-Feedback, kein kritischer Pfad — bei Fehlern (z. B. kein
    // Audio-Fokus, stumm geschaltetes Gerät) bleibt die App unbeeinträchtigt
    // funktionsfähig.
  }
}

export function spieleZugKlang() {
  spieleKlang(zugDatei);
}

export function spieleStoppKlang() {
  spieleKlang(stoppDatei);
}

export function spieleQuestKlang() {
  spieleKlang(questDatei);
}
