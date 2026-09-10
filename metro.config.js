// Bugfix (Nutzer-Feedback 2026-09-08, Android-Absturz nach SDK-57-Update):
// "[runtime not ready]: Error: Component auth has not been registered yet"
//
// Ursache: Seit Expo SDK 53 aktiviert Metro standardmäßig die neuere Node.js-
// "package exports"-Paketauflösung (`unstable_enablePackageExports`). `firebase`
// (hier v10, modulare API, siehe package.json) liefert darüber für React Native
// fälschlich sein BROWSER-Build von `firebase/auth` statt des RN-kompatiblen Builds
// aus — dieses Browser-Build registriert die Auth-Komponente nie, weshalb
// `initializeAuth()`/`getAuth()` zur Laufzeit mit "Component auth has not been
// registered yet" abstürzt. Ein bekanntes, breit dokumentiertes Firebase+Expo/
// Metro-Zusammenspiel-Problem (nicht spezifisch für dieses Projekt).
//
// Bewusst NUR auf Web nie aufgefallen: der Browser löst Pakete anders auf als
// Metro für native Plattformen, deshalb liefen alle bisherigen Web-Smoke-Tests
// dieser Sitzung sauber durch — erst der erste echte Android-Test (Expo Go) auf
// SDK 57 hat den Fehler sichtbar gemacht.
//
// Fix: die neue Paketauflösung gezielt abschalten, Metro fällt dadurch auf die
// klassische "main"/"react-native"-Feld-Auflösung zurück, die `firebase/auth`
// korrekt das RN-kompatible Build liefert. Diese Datei existierte im Projekt
// bisher gar nicht (reine Expo-Standardkonfiguration) — das ist ihr erstes Mal.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
