import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { RootNavigator } from "./src/navigation/RootNavigator";

// ErrorBoundary bewusst hier um RootNavigator gelegt (statt innerhalb von
// RootNavigator.tsx selbst) — siehe src/components/ErrorBoundary.tsx: so fängt sie auch
// einen unerwarteten Fehler in RootNavigator()/NavigationContainer selbst ab, nicht nur
// in dessen Kind-Screens.
export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <RootNavigator />
    </ErrorBoundary>
  );
}
