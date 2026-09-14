#!/usr/bin/env node
// Paket 5 (2026-09-11) — Konto & Datenschutz (compliance_paket_2026-09-10.md, Abschn. 1, 3, 4).
// Prüft die ECHTEN Quelldateien (TS-require-Hook wie test-ganze-partie-logic.cjs). Firebase,
// React Native und AsyncStorage werden durch kleine Attrappen ersetzt, die jeden Aufruf
// mitschreiben — so lässt sich prüfen, WANN Firebase startet, ohne Netzwerk.
//
//   1. Firebase startet NICHT beim Laden der Kind-Module (Speicher, Gate, Freispiel,
//      Zwischenstand) und nicht beim Speichern von Fortschritt — erst bei holeDb()/holeAuth().
//   2. Keine Datei importiert noch die alten Konstanten `db`/`auth`/`firebaseApp`.
//   3. Double-Opt-In: darfCloudNutzen; Registrierung verschickt die Bestätigungsmail und
//      übersteht einen Fehler dabei; vorgemerkter Kind-Nickname.
//   4. Passwort vergessen: Reset-Mail an die bereinigte Adresse.
//   6. Mailsprache: folgt der App-Sprache (lib/sprache.ts) und wird vor JEDEM Versand
//      gesetzt — nicht einmalig bei der Initialisierung, und nicht über useDeviceLanguage().
//   5. Kontolöschung/Spielstand: welche lokalen Schlüssel gelöscht werden und welche bleiben.
//
// Ausführen: `node verify/test-konto-datenschutz.cjs` im Projektverzeichnis (nach npm install).

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("Konnte 'typescript' nicht laden — bitte einmalig `npm install` ausführen.");
  process.exit(1);
}
Module._extensions[".ts"] = function (mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
    fileName: filename,
  });
  mod._compile(outputText, filename);
};

// --- Attrappen ---------------------------------------------------------------------------
const aufrufe = [];
const merke = (name) => (...args) => {
  aufrufe.push({ name, args });
  return undefined;
};
const speicher = new Map();
const asyncStorage = {
  getItem: async (k) => (speicher.has(k) ? speicher.get(k) : null),
  setItem: async (k, v) => void speicher.set(k, String(v)),
  removeItem: async (k) => void speicher.delete(k),
  multiRemove: async (ks) => ks.forEach((k) => speicher.delete(k)),
  getAllKeys: async () => [...speicher.keys()],
};
let verifizierungWirft = false;
const testNutzer = { uid: "u1", email: "a@b.de", emailVerified: false, getIdToken: async () => "t" };
const attrappen = {
  "firebase/app": { initializeApp: (...a) => (aufrufe.push({ name: "initializeApp", args: a }), { name: "app" }) },
  "firebase/auth": {
    initializeAuth: (...a) => (aufrufe.push({ name: "initializeAuth", args: a }), { currentUser: testNutzer, languageCode: null }),
    browserLocalPersistence: {},
    getReactNativePersistence: () => ({}),
    useDeviceLanguage: merke("useDeviceLanguage"),
    createUserWithEmailAndPassword: async (_a, email, pw) => (aufrufe.push({ name: "create", args: [email, pw] }), { user: testNutzer }),
    signInWithEmailAndPassword: async () => ({ user: testNutzer }),
    signOut: async () => {},
    sendEmailVerification: async (u) => {
      aufrufe.push({ name: "sendEmailVerification", args: [u] });
      if (verifizierungWirft) throw Object.assign(new Error("netz"), { code: "auth/network-request-failed" });
    },
    sendPasswordResetEmail: async (_a, email) => void aufrufe.push({ name: "sendPasswordResetEmail", args: [email] }),
    reload: async () => {},
    onAuthStateChanged: () => () => {},
    EmailAuthProvider: { credential: (e, p) => ({ e, p }) },
    reauthenticateWithCredential: async (_u, c) => {
      aufrufe.push({ name: "reauth", args: [c] });
      if (c.p !== "Geheim1!") throw Object.assign(new Error("pw"), { code: "auth/wrong-password" });
    },
    deleteUser: async (u) => void aufrufe.push({ name: "deleteUser", args: [u] }),
  },
  "firebase/firestore": {
    getFirestore: (...a) => (aufrufe.push({ name: "getFirestore", args: a }), { db: true }),
    doc: (...a) => (aufrufe.push({ name: "doc", args: a }), { pfad: a[1] }),
    deleteDoc: async (ref) => void aufrufe.push({ name: "deleteDoc", args: [ref] }),
    setDoc: async () => {}, getDoc: async () => ({ exists: () => false }), collection: merke("collection"),
    getDocs: async () => ({ empty: true, docs: [] }), addDoc: async () => ({ id: "k1" }), limit: merke("limit"), query: merke("query"),
  },
  "react-native": { Platform: { OS: "ios" } },
  "@react-native-async-storage/async-storage": { __esModule: true, default: asyncStorage },
  react: { useEffect: () => {}, useState: (v) => [v, () => {}] },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(attrappen, request)) return attrappen[request];
  return originalLoad.apply(this, arguments);
};

const SRC = path.join(__dirname, "..", "src");
const anzahl = (name) => aufrufe.filter((a) => a.name === name).length;

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ------------------------------------------------------------------------------------------
test("Kind-Module laden startet Firebase nicht (storage, gate, freispielFortschritt, ganzePartieStand)", async () => {
  require(path.join(SRC, "lib", "storage.ts"));
  require(path.join(SRC, "lib", "gate.ts"));
  require(path.join(SRC, "lib", "freispielFortschritt.ts"));
  require(path.join(SRC, "lib", "ganzePartieStand.ts"));
  require(path.join(SRC, "lib", "auth.ts"));
  assert.equal(anzahl("initializeApp"), 0, "initializeApp beim Laden aufgerufen");
  assert.equal(anzahl("initializeAuth"), 0);
  assert.equal(anzahl("getFirestore"), 0);
});

test("Fortschritt speichern/laden (Quest, Bonus) startet Firebase nicht", async () => {
  const storage = require(path.join(SRC, "lib", "storage.ts"));
  await storage.saveQuestFortschrittLocal("quest1", { sterne: 3, abgeschlossen: true, letzterSchritt: "7" });
  await storage.saveBonusFortschrittLocal("fesselung", true);
  assert.deepEqual(await storage.loadQuestFortschrittLocal("quest1"), { sterne: 3, abgeschlossen: true, letzterSchritt: "7" });
  assert.equal(await storage.loadBonusFortschrittLocal("fesselung"), true);
  assert.equal(anzahl("initializeApp"), 0);
});

test("holeDb/holeAuth starten Firebase genau einmal, ohne useDeviceLanguage", async () => {
  const fb = require(path.join(SRC, "lib", "firebase.ts"));
  assert.equal(fb.istFirebaseGestartet(), false);
  fb.holeDb();
  fb.holeDb();
  fb.holeAuth();
  fb.holeAuth();
  assert.equal(fb.istFirebaseGestartet(), true);
  assert.equal(anzahl("initializeApp"), 1);
  assert.equal(anzahl("getFirestore"), 1);
  assert.equal(anzahl("initializeAuth"), 1);
  // Früher stand hier 1. `useDeviceLanguage()` liest `navigator.language`, das es in
  // React Native nicht gibt — die Mailsprache blieb nativ leer und Firebase nahm die
  // Vorlagensprache des Projekts. Gesetzt wird sie jetzt in auth.ts vor jedem Versand.
  assert.equal(anzahl("useDeviceLanguage"), 0, "useDeviceLanguage wird nicht mehr benutzt");
  assert.equal(fb.holeAuth().languageCode, null, "bei der Initialisierung noch nicht gesetzt");
});

test("keine Datei importiert mehr db/auth/firebaseApp; initializeApp nur in holeFirebaseApp", async () => {
  const dateien = [];
  (function sammle(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) sammle(p);
      else if (/\.tsx?$/.test(e.name)) dateien.push(p);
    }
  })(SRC);
  const alt = /import\s*\{([^}]*)\}\s*from\s*"(?:\.\.\/lib\/firebase|\.\/firebase)"/g;
  for (const datei of dateien) {
    const text = fs.readFileSync(datei, "utf8");
    let m;
    while ((m = alt.exec(text))) {
      const namen = m[1].split(",").map((n) => n.trim().replace(/^type\s+/, "")).filter(Boolean);
      for (const n of namen) {
        assert.ok(!["db", "auth", "firebaseApp"].includes(n), `${path.relative(SRC, datei)} importiert noch "${n}"`);
      }
    }
  }
  const fbText = fs.readFileSync(path.join(SRC, "lib", "firebase.ts"), "utf8");
  const code = fbText.replace(/\/\/.*$/gm, "");
  assert.equal((code.match(/initializeApp\(/g) || []).length, 1, "initializeApp( genau einmal");
  assert.ok(/function holeFirebaseApp[\s\S]*?initializeApp\(/.test(code), "initializeApp liegt in holeFirebaseApp");
  assert.ok(!/export const (auth|db|firebaseApp)\b/.test(code), "keine eager-Exporte mehr");
});

test("Double-Opt-In: darfCloudNutzen nur mit bestätigter E-Mail", async () => {
  const auth = require(path.join(SRC, "lib", "auth.ts"));
  assert.equal(auth.darfCloudNutzen(null), false);
  assert.equal(auth.darfCloudNutzen(undefined), false);
  assert.equal(auth.darfCloudNutzen({ emailVerified: false }), false);
  assert.equal(auth.darfCloudNutzen({ emailVerified: true }), true);
});

test("Registrierung verschickt die Bestätigungsmail — und übersteht einen Fehler dabei", async () => {
  const auth = require(path.join(SRC, "lib", "auth.ts"));
  const vorher = anzahl("sendEmailVerification");
  const u = await auth.elternKontoErstellen("  a@b.de ", "Geheim1!");
  assert.equal(u.uid, "u1");
  assert.equal(anzahl("sendEmailVerification"), vorher + 1);
  assert.equal(aufrufe.filter((a) => a.name === "create").pop().args[0], "a@b.de", "E-Mail getrimmt");
  verifizierungWirft = true;
  const warn = console.warn;
  console.warn = () => {};
  try {
    const u2 = await auth.elternKontoErstellen("a@b.de", "Geheim1!");
    assert.equal(u2.uid, "u1", "Konto trotz Mail-Fehler erstellt");
  } finally {
    console.warn = warn;
    verifizierungWirft = false;
  }
});

test("Bestätigung erneut senden geht an den angemeldeten Nutzer", async () => {
  const auth = require(path.join(SRC, "lib", "auth.ts"));
  const vorher = anzahl("sendEmailVerification");
  await auth.bestaetigungsMailErneutSenden();
  assert.equal(anzahl("sendEmailVerification"), vorher + 1);
  assert.equal(await auth.emailBestaetigungPruefen(), false);
  testNutzer.emailVerified = true;
  assert.equal(await auth.emailBestaetigungPruefen(), true);
  testNutzer.emailVerified = false;
});

test("Passwort vergessen: Reset-Mail an die bereinigte Adresse", async () => {
  const auth = require(path.join(SRC, "lib", "auth.ts"));
  await auth.passwortZuruecksetzen("  eltern@example.org ");
  assert.equal(aufrufe.filter((a) => a.name === "sendPasswordResetEmail").pop().args[0], "eltern@example.org");
});

test("Mailsprache folgt der App-Sprache und wird vor jedem Versand gesetzt", async () => {
  const auth = require(path.join(SRC, "lib", "auth.ts"));
  const spr = require(path.join(SRC, "lib", "sprache.ts"));
  const fb = require(path.join(SRC, "lib", "firebase.ts"));

  // Alle drei Wege, auf denen eine Mail hinausgeht, einzeln geprüft — der Fehler vom
  // 2026-09-14 saß in keinem davon, sondern in der einmaligen Initialisierung.
  await spr.setzeSprache("de");
  await auth.elternKontoErstellen("a@b.de", "Geheim1!");
  assert.equal(fb.holeAuth().languageCode, "de", "Registrierung");

  await spr.setzeSprache("en");
  await auth.passwortZuruecksetzen("a@b.de");
  assert.equal(fb.holeAuth().languageCode, "en", "Passwort vergessen");

  await spr.setzeSprache("de");
  await auth.bestaetigungsMailErneutSenden();
  assert.equal(fb.holeAuth().languageCode, "de", "Bestätigung erneut senden");

  // Der eigentliche Regressionsschutz: Eine Umstellung NACH dem ersten Versand muss
  // ankommen. Genau das konnte die alte Lösung nicht, weil holeAuth() nur einmal läuft.
  await spr.setzeSprache("en");
  await auth.bestaetigungsMailErneutSenden();
  assert.equal(fb.holeAuth().languageCode, "en", "Umstellung wirkt auch nachträglich");

  await spr.setzeSprache("auto");
});

test("Kind-Nickname vormerken / holen / vergessen; leer wird nicht vorgemerkt", async () => {
  const storage = require(path.join(SRC, "lib", "storage.ts"));
  await storage.merkeKindNicknameVor("   ");
  assert.equal(await storage.holeVorgemerktenKindNickname(), undefined);
  await storage.merkeKindNicknameVor("  Mia ");
  assert.equal(await storage.holeVorgemerktenKindNickname(), "Mia");
  await storage.vergesseVorgemerktenKindNickname();
  assert.equal(await storage.holeVorgemerktenKindNickname(), undefined);
});

test("Spielstand-Schlüssel: Fortschritt ja, Eltern-Einstellungen nein", async () => {
  const storage = require(path.join(SRC, "lib", "storage.ts"));
  for (const k of [
    "chesslynx:questFortschritt:quest3",
    "chesslynx:bonusFortschritt:rochade",
    "chesslynx:freispielFortschritt:hoechsteFreigeschalteteElo",
    "chesslynx:freispiel:farbeinfuehrungGezeigt",
    "chesslynx:hatWillkommenGesehen",
    "chesslynx:ganzePartieEtappe",
    "chesslynx:syncQueue",
    "chesslynx:bonusSyncQueue",
  ]) {
    assert.equal(storage.istSpielstandSchluessel(k), true, k);
  }
  for (const k of ["chesslynx:aktivesKindId:u1", "chesslynx:dashboardEinfuehrungGezeigt", "chesslynx:zeitlimit:minuten", "chesslynx:untertitelAktiv", "chesslynx:bevorzugteStimme"]) {
    assert.equal(storage.istSpielstandSchluessel(k), false, k);
  }
});

test("Kontolöschung lokal: Konto-Cache, Nickname und Spielstand weg — Einstellungen und fremde Konten bleiben", async () => {
  const storage = require(path.join(SRC, "lib", "storage.ts"));
  speicher.clear();
  const setze = (k) => speicher.set(k, "x");
  ["chesslynx:aktivesKindId:u1", "chesslynx:aktivesKindId:u2", "chesslynx:kindNicknameVorgemerkt", "chesslynx:questFortschritt:quest1",
    "chesslynx:bonusSyncQueue", "chesslynx:ganzePartieEtappe", "chesslynx:zeitlimit:minuten", "chesslynx:untertitelAktiv"].forEach(setze);
  await storage.kontoBezogeneLokaleDatenLoeschen("u1");
  assert.deepEqual([...speicher.keys()].sort(), ["chesslynx:aktivesKindId:u2", "chesslynx:untertitelAktiv", "chesslynx:zeitlimit:minuten"]);
});

test("Unbestätigtes Konto löschen: Passwort nötig, Einwilligungs-Dokument + Nutzer weg, Spielstand bleibt", async () => {
  const auth = require(path.join(SRC, "lib", "auth.ts"));
  speicher.clear();
  speicher.set("chesslynx:kindNicknameVorgemerkt", "Mia");
  speicher.set("chesslynx:questFortschritt:quest1", "x");
  await assert.rejects(auth.unbestaetigtesKontoLoeschen("falsch"));
  assert.equal(anzahl("deleteUser"), 0, "bei falschem Passwort nichts gelöscht");
  await auth.unbestaetigtesKontoLoeschen("Geheim1!");
  assert.equal(anzahl("deleteUser"), 1);
  assert.equal(aufrufe.filter((a) => a.name === "deleteDoc").pop().args[0].pfad, "eltern/u1/einstellungen/dashboard");
  assert.equal(speicher.has("chesslynx:kindNicknameVorgemerkt"), false);
  assert.equal(speicher.has("chesslynx:questFortschritt:quest1"), true);
});

(async () => {
  console.log("\nKonto & Datenschutz (Paket 5)\n");
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.name}\n      ${err.message}`);
    }
  }
  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
  process.exit(failed ? 1 : 0);
})();
