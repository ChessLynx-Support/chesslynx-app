// Paket 3c (2026-09-11): Lux verabschiedet sich kurz, wenn das Kind einen Screen mittendrin per
// Zurück verlässt ("Bis gleich! Die Schildkröte wartet hier auf dich.") — erklärt dem Kind, dass
// nichts verloren geht. Hält die Zurück-Aktion nur so lange an, bis Lux fertig gesprochen hat
// (höchstens 4 s); ein zweites Zurück lässt sofort gehen. `replace`-Wechsel (geplante Übergänge
// innerhalb eines Kapitels) werden nicht abgefangen.
//
// Verwendet in FreispielPartie.tsx (Kapitel-Modus „Die ganze Partie"). GanzePartie.tsx löst
// dasselbe über seinen eigenen Sprechzeilen-Schlüssel, damit keine laufende Kapitelzeile den
// Abschied überspricht.

import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { sprich } from "./luxStimme";

export function useAbschiedBeimVerlassen(aktiv: boolean, zeile: string) {
  const navigation = useNavigation<any>();
  const aktivRef = useRef(aktiv);
  aktivRef.current = aktiv;

  useEffect(() => {
    let laeuft = false;
    return navigation.addListener("beforeRemove", (e: any) => {
      if (!aktivRef.current || laeuft || e.data?.action?.type === "REPLACE") return;
      e.preventDefault();
      laeuft = true;
      let erledigt = false;
      const weiter = () => {
        if (erledigt) return;
        erledigt = true;
        navigation.dispatch(e.data.action);
      };
      sprich(zeile, { onFertig: weiter });
      setTimeout(weiter, 4000);
    });
  }, [navigation, zeile]);
}
