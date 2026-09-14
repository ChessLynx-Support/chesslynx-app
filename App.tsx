import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ladeSprache } from "./src/lib/sprache";

// ErrorBoundary bewusst hier um RootNavigator gelegt (statt innerhalb von
// RootNavigator.tsx selbst) — siehe src/components/ErrorBoundary.tsx: so fängt sie auch
// einen unerwarteten Fehler in RootNavigator()/NavigationContainer selbst ab, nicht nur
// in dessen Kind-Screens.
//
// Sprachwahl laden, BEVOR der erste Screen rendert (2026-09-14, siehe src/lib/sprache.ts):
// `t()` liest die Sprache im Moment des Aufrufs. Würde RootNavigator schon rendern, während
// die gespeicherte Wahl aus dem Eltern-Bereich noch gelesen wird, zeigte der erste Screen
// die Gerätesprache und wechselte danach sichtbar — auf einem deutschen Gerät mit gewähltem
// Englisch also ein kurzes deutsches Aufblitzen.
//
// Das kurze `null` davor ist unkritisch: Es dauert einen AsyncStorage-Zugriff lang, und
// direkt danach kommt ohnehin der Ladebildschirm mit dem Lux-Video.
export default function App() {
  const [spracheGeladen, setSpracheGeladen] = useState(false);

  useEffect(() => {
    // Bewusst ohne catch: `ladeSprache()` fängt seine Fehler selbst ab und fällt auf die
    // Gerätesprache zurück — die App darf an einer nicht lesbaren Einstellung nicht hängen.
    ladeSprache().then(() => setSpracheGeladen(true));
  }, []);

  if (!spracheGeladen) return null;

  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <RootNavigator />
    </ErrorBoundary>
  );
}
