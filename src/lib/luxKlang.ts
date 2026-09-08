// Kleiner Wrapper um `expo-av` (Opus-Review, 2026-09-07, Abschnitt 3.1, Schritt 7: "...
// drei kurze CC0-Klänge (Zug/Stopp/Quest geschafft) über expo-av", siehe
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
// WICHTIG für den Nutzer: siehe luxStimme.ts — `expo-av` gehört zum selben
// `npx expo install expo-speech expo-haptics expo-av`-Schritt.

import { Audio } from "expo-av";

const zugDatei = require("../../assets/sounds/zug.wav");
const stoppDatei = require("../../assets/sounds/stopp.wav");
const questDatei = require("../../assets/sounds/quest_geschafft.wav");

async function spieleKlang(datei: number) {
  try {
    const { sound } = await Audio.Sound.createAsync(datei);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
    await sound.playAsync();
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
