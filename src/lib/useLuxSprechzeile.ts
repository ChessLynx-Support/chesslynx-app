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

import { useEffect, useRef } from "react";
import { sprich, stoppen } from "./luxStimme";

const ERINNERUNG_MS = 8000;

export function useLuxSprechzeile(
  schluessel: string,
  zeile: string | undefined,
  onFertig?: () => void,
  optionen?: { erinnerung?: boolean }
) {
  const erinnerungAktiv = optionen?.erinnerung ?? true;

  const erinnerungTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zeileRef = useRef(zeile);
  const onFertigRef = useRef(onFertig);
  const erinnerungAktivRef = useRef(erinnerungAktiv);
  zeileRef.current = zeile;
  onFertigRef.current = onFertig;
  erinnerungAktivRef.current = erinnerungAktiv;

  // In einem Ref gehalten, damit sowohl der Mount-/Wechsel-Effekt als auch wiederholen()
  // dieselbe Implementierung nutzen, ohne sie als Effekt-Abhängigkeit führen zu müssen.
  const zeileSprechenRef = useRef<() => void>(() => {});
  zeileSprechenRef.current = () => {
    if (erinnerungTimer.current) clearTimeout(erinnerungTimer.current);
    if (!zeileRef.current) return;
    sprich(zeileRef.current, {
      onFertig: () => {
        if (onFertigRef.current) {
          onFertigRef.current();
          return;
        }
        if (!erinnerungAktivRef.current) return;
        erinnerungTimer.current = setTimeout(() => zeileSprechenRef.current(), ERINNERUNG_MS);
      },
    });
  };

  useEffect(() => {
    zeileSprechenRef.current();
    return () => {
      stoppen();
      if (erinnerungTimer.current) clearTimeout(erinnerungTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  function wiederholen() {
    zeileSprechenRef.current();
  }

  return { wiederholen };
}
