// Web-Fassung von AmbientLoop (Metro wählt bei `import { AmbientLoop } from "./AmbientLoop"`
// auf Web automatisch diese `.web.tsx`, auf iOS/Android die normale `.tsx`).
//
// WARUM ES DIESE DATEI GIBT (Bundling-Fehler 2026-09-13): `lottie-react-native` liefert für
// Web eine eigene Implementierung mit, die ihrerseits `@lottiefiles/dotlottie-react`
// importiert — ein Paket, das im Projekt nicht installiert ist. Das ist kein Laufzeit-,
// sondern ein Auflösungsfehler: Metro bricht das Web-Bundling ab, sobald irgendeine Datei
// `lottie-react-native` importiert. Ein `Platform.OS === "web"`-Zweig INNERHALB der
// Komponente hilft deshalb nicht — der Import allein genügt, um `npx expo start --web`
// unbenutzbar zu machen.
//
// Diese Datei importiert `lottie-react-native` bewusst gar nicht erst und rendert nichts.
// Die Umgebungsschleifen sind reine Zierde (siehe AmbientLoop.tsx): Ihr Fehlen im Browser
// kostet keine Funktion, und die Web-Vorschau bleibt für alles andere nutzbar.
//
// Falls die Schleifen später auch im Browser laufen sollen: `npx expo install
// @lottiefiles/dotlottie-react`, dann kann diese Datei ersatzlos entfallen. Zu bedenken
// wäre dann, dass ein reines Web-Paket in `package.json` landet, das für die ausgelieferte
// App (iOS/Android) nutzlos ist — und dass `verify/test-bundle-check.cjs` jede neue
// Abhängigkeit ohnehin gegen die Tracking-Liste prüft.

import type { StyleProp, ViewStyle } from "react-native";

type Props = {
  quelle: any;
  groesse: number;
  position?: { left?: number; top?: number; right?: number; bottom?: number };
  verzoegerungMs?: number;
  tempo?: number;
  deckkraft?: number;
  pausiert?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Absichtlich ohne Platzhalter-View: Die Schleifen liegen absolut positioniert über der
// Karte, ein leeres Element würde dort nichts verändern — und ein sichtbarer Platzhalter
// wäre im Browser störender als gar nichts.
export function AmbientLoop(_props: Props) {
  return null;
}
