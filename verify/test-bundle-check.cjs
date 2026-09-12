#!/usr/bin/env node
// Paket 5 (2026-09-11) — Bundle-Check „kein Tracking“ (compliance_paket_2026-09-10.md, Abschn. 1;
// Apple Kids Category 1.3: keine Analytics-/Tracking-/Werbe-SDKs, auch nicht ungenutzt).
//
// Warum nicht das ursprünglich notierte `grep "firebase/analytics" package-lock.json`: Das
// Firebase-JS-Paket bringt `@firebase/analytics` immer als Unterpaket mit — der grep wäre
// dauerhaft rot, ohne dass etwas davon in der App landet (Metro bündelt nur, was importiert
// wird). Geprüft wird deshalb, was tatsächlich zählt:
//   1. package.json: keine Tracking-/Analytics-/Crash-/Werbe-Pakete als Abhängigkeit.
//   2. package-lock.json (falls vorhanden): keine nativen Tracking-SDKs, auch nicht transitiv —
//      native Module landen im App-Binary, egal ob importiert.
//   3. Quellcode (src/, App.tsx): kein Import von Firebase-Analytics/Performance/Messaging/
//      Remote-Config oder anderen Tracking-Bibliotheken.
//
// Ausführen: `node verify/test-bundle-check.cjs` im Projektverzeichnis.

const fs = require("fs");
const path = require("path");

const WURZEL = path.join(__dirname, "..");
const VERBOTEN = [
  /^@react-native-firebase\/(analytics|crashlytics|perf|messaging|in-app-messaging|remote-config|dynamic-links)$/,
  /^expo-firebase-analytics$/,
  /^expo-analytics/,
  /^expo-tracking-transparency$/,
  /^expo-ads-/,
  /^react-native-google-mobile-ads$/,
  /^react-native-fbsdk/,
  /^react-native-appsflyer$/,
  /^react-native-adjust$/,
  /^@sentry\//,
  /^sentry-expo$/,
  /^@bugsnag\//,
  /^@amplitude\//,
  /^@segment\//,
  /^mixpanel/,
  /^posthog-/,
  /^@datadog\//,
  /^@newrelic\//,
];
const VERBOTENE_IMPORTE = /from\s+["'](firebase\/(analytics|performance|messaging|remote-config)|@react-native-firebase\/[^"']+|@sentry\/[^"']+|sentry-expo|mixpanel[^"']*|@amplitude\/[^"']+|@segment\/[^"']+)["']/;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}
const istVerboten = (name) => VERBOTEN.some((re) => re.test(name));

console.log("\nBundle-Check: kein Tracking\n");

test("package.json: keine Tracking-/Analytics-/Werbe-Abhängigkeiten", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(WURZEL, "package.json"), "utf8"));
  const alle = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
  const treffer = Object.keys(alle).filter(istVerboten);
  if (treffer.length) throw new Error(`verboten: ${treffer.join(", ")}`);
});

test("package-lock.json: keine nativen Tracking-SDKs (auch transitiv)", () => {
  const datei = path.join(WURZEL, "package-lock.json");
  if (!fs.existsSync(datei)) {
    console.log("      (kein package-lock.json gefunden — übersprungen)");
    return;
  }
  const lock = JSON.parse(fs.readFileSync(datei, "utf8"));
  const namen = Object.keys(lock.packages || {}).map((p) => p.replace(/^.*node_modules\//, "")).filter(Boolean);
  const treffer = [...new Set(namen.filter(istVerboten))];
  if (treffer.length) throw new Error(`verboten: ${treffer.join(", ")}`);
});

test("Quellcode: kein Import von Analytics/Performance/Messaging/Tracking", () => {
  const dateien = [path.join(WURZEL, "App.tsx")];
  (function sammle(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) sammle(p);
      else if (/\.(t|j)sx?$/.test(e.name)) dateien.push(p);
    }
  })(path.join(WURZEL, "src"));
  const treffer = dateien.filter((d) => fs.existsSync(d) && VERBOTENE_IMPORTE.test(fs.readFileSync(d, "utf8")));
  if (treffer.length) throw new Error(`verbotener Import in: ${treffer.map((d) => path.relative(WURZEL, d)).join(", ")}`);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
process.exit(failed ? 1 : 0);
