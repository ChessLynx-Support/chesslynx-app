#!/usr/bin/env node
// Waisen-Prüfung (2026-09-12) — findet Firestore-Daten, zu denen es kein Elternkonto mehr gibt.
//
// Warum es das braucht: Das Löschen eines Kontos läuft im Client (ParentDashboard.tsx →
// `kontoEndgueltigLoeschen`): erst die Firestore-Dokumente, dann der Auth-Nutzer. Das deckt
// den normalen Weg ab — aber nicht diesen:
//
//   Ein Elternteil schreibt an den Support und bittet um Löschung, das Konto wird in der
//   Firebase-Konsole gelöscht. Der App-Code läuft dabei nie. Der komplette Kinderprofil-Baum
//   unter `eltern/<uid>/` bleibt liegen — unsichtbar, weil die UID nirgends mehr auftaucht.
//
// Dieses Skript hält beide Seiten gegeneinander und meldet, was übrig geblieben ist.
// Es ersetzt keine serverseitige Lösung (Firebase-Extension „Delete User Data", braucht
// Blaze) — es ist die Kontrolle, die auch ohne sie funktioniert.
//
// Datenmodell (siehe src/lib/firebase.ts):
//   eltern/<uid>                          ← KEIN Dokument, nur Pfadsegment
//   eltern/<uid>/kinder/<kindId>          ← ein Dokument pro Kinderprofil
//   eltern/<uid>/einstellungen/dashboard  ← Einwilligungs-Nachweis, Zeitlimit
//
// Deshalb wird `listDocuments()` benutzt und nicht `get()`: nur `listDocuments()` liefert
// auch die „Phantom-Dokumente", also UIDs, unter denen Subcollections hängen, obwohl das
// Dokument selbst nie angelegt wurde. Ein `get()` würde jede Waise übersehen.
//
// ---------------------------------------------------------------------------------------
// AUSFÜHREN
//
//   1. Dienstkonto-Schlüssel holen (einmalig):
//      Firebase-Konsole → Zahnrad → Projekteinstellungen → Dienstkonten →
//      „Neuen privaten Schlüssel generieren" → JSON-Datei speichern.
//      NICHT ins Repository legen. `.gitignore` fängt `*service-account*.json` bereits ab —
//      am besten außerhalb des Projektordners ablegen, z. B. C:\Users\cmZ\keys\.
//
//   2. Prüfen (ändert nichts):
//      node scripts/waisen_pruefen.cjs C:\Users\cmZ\keys\chelynx-service-account.json
//
//      Alternativ ohne Argument, wenn GOOGLE_APPLICATION_CREDENTIALS gesetzt ist.
//
//   3. Nur falls etwas gefunden wurde und weg soll:
//      node scripts/waisen_pruefen.cjs <schlüssel.json> --aufraeumen
//
//      Löscht die gemeldeten Bäume rekursiv und endgültig. Vorher die Liste aus Schritt 2
//      lesen — es gibt keine Rückfrage und kein Zurück.
//
// Exit-Code: 0 = sauber, 1 = Waisen gefunden (oder Fehler). Damit taugt es als Release-Gate.
// ---------------------------------------------------------------------------------------

const path = require("path");
const fs = require("fs");

// firebase-admin liegt in functions/node_modules — das Hauptprojekt braucht es nicht als
// eigene Abhängigkeit (es gehört nicht in die App, nur in dieses Wartungsskript).
function ladeAdmin() {
  try {
    return require("firebase-admin");
  } catch {
    const ausFunctions = path.join(__dirname, "..", "functions", "node_modules", "firebase-admin");
    if (fs.existsSync(ausFunctions)) return require(ausFunctions);
    console.error(
      "\nfirebase-admin nicht gefunden.\n" +
        "  → einmal `npm install` im Ordner functions/ ausführen, dann erneut versuchen.\n"
    );
    process.exit(1);
  }
}

const admin = ladeAdmin();

const argumente = process.argv.slice(2);
const aufraeumen = argumente.includes("--aufraeumen");
const schluesselPfad =
  argumente.find((a) => a.toLowerCase().endsWith(".json")) ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!schluesselPfad) {
  console.error(
    "\nKein Dienstkonto-Schlüssel angegeben.\n\n" +
      "  node scripts/waisen_pruefen.cjs <pfad-zum-schluessel.json>\n\n" +
      "  Schlüssel erzeugen: Firebase-Konsole → Projekteinstellungen → Dienstkonten →\n" +
      "  „Neuen privaten Schlüssel generieren\". Datei außerhalb des Projektordners ablegen.\n"
  );
  process.exit(1);
}
if (!fs.existsSync(schluesselPfad)) {
  console.error(`\nSchlüsseldatei nicht gefunden: ${schluesselPfad}\n`);
  process.exit(1);
}

// Welcher Schlüssel tatsächlich benutzt wird, wird bewusst ausgegeben (2026-09-13): Beim
// ersten Einsatz scheiterte das Skript zweimal mit „insufficient permission", weil im
// Hintergrund GOOGLE_APPLICATION_CREDENTIALS auf den Google-TTS-Schlüssel zeigte
// (`tts-export@…`, darf nur Sprachsynthese) — sichtbar war das nirgends, weil das Skript
// stillschweigend auf die Umgebungsvariable zurückfällt, wenn kein Argument ankommt. Eine
// leere Shell-Variable als Argument (`"$fbKey"` ohne vorherige Zuweisung) führt zum selben
// Ergebnis. Die zwei Zeilen hier machen in einer Sekunde sichtbar, woran es liegt.
const schluesselDaten = require(path.resolve(schluesselPfad));
console.log(`  Schlüssel:  ${schluesselDaten.client_email}`);
console.log(`  Projekt:    ${schluesselDaten.project_id}`);
if (!String(schluesselDaten.client_email || "").startsWith("firebase-adminsdk-")) {
  console.log(
    "\n  ACHTUNG: Das ist nicht das von Firebase angelegte Admin-SDK-Dienstkonto.\n" +
      "  Ein selbst erstelltes Dienstkonto hat in der Regel keinen Zugriff auf Firestore\n" +
      "  und Authentication — der Lauf wird gleich mit „insufficient permission\" abbrechen.\n" +
      "  Richtigen Schlüssel holen: Firebase-Konsole → Projekteinstellungen → Dienstkonten\n" +
      "  → „Neuen privaten Schlüssel generieren\", Datei außerhalb des Projektordners ablegen\n" +
      "  und ihren Pfad diesem Skript als Argument übergeben."
  );
}

admin.initializeApp({ credential: admin.credential.cert(schluesselDaten) });
const db = admin.firestore();
const auth = admin.auth();

/** Alle UIDs aus Firebase Authentication, seitenweise (1000 pro Seite). */
async function alleAuthUids() {
  const uids = new Set();
  let seite = await auth.listUsers(1000);
  for (;;) {
    seite.users.forEach((u) => uids.add(u.uid));
    if (!seite.pageToken) break;
    seite = await auth.listUsers(1000, seite.pageToken);
  }
  return uids;
}

/** Was liegt unter eltern/<uid>/ ? Liefert [{ name, anzahl }] je Subcollection. */
async function inhaltVon(ref) {
  const unter = await ref.listCollections();
  const zeilen = [];
  for (const coll of unter) {
    const snap = await coll.get();
    zeilen.push({ name: coll.id, anzahl: snap.size });
  }
  return zeilen;
}

async function main() {
  console.log("\nWaisen-Prüfung: Firestore gegen Firebase Authentication\n");

  const authUids = await alleAuthUids();
  const elternRefs = await db.collection("eltern").listDocuments();

  console.log(`  Konten in Authentication: ${authUids.size}`);
  console.log(`  Einträge unter eltern/:   ${elternRefs.length}\n`);

  const waisen = [];
  for (const ref of elternRefs) {
    if (authUids.has(ref.id)) continue;
    waisen.push({ ref, inhalt: await inhaltVon(ref) });
  }

  // Andere Richtung: Konto ohne Daten. Das ist normal (frisch registriert, noch kein
  // Kinderprofil) und deshalb nur eine Randnotiz, kein Befund.
  const elternIds = new Set(elternRefs.map((r) => r.id));
  const ohneDaten = [...authUids].filter((uid) => !elternIds.has(uid));
  if (ohneDaten.length) {
    console.log(
      `  (${ohneDaten.length} Konto/Konten ohne Firestore-Daten — bei frisch registrierten ` +
        `Konten normal)\n`
    );
  }

  if (!waisen.length) {
    console.log("  ✓ keine verwaisten Daten — zu jedem eltern/<uid> gibt es ein Konto\n");
    process.exit(0);
  }

  console.log(`  ✗ ${waisen.length} verwaiste(r) Eintrag/Einträge:\n`);
  for (const { ref, inhalt } of waisen) {
    const beschreibung = inhalt.length
      ? inhalt.map((z) => `${z.name}: ${z.anzahl}`).join(", ")
      : "leer (nur Pfadsegment, kein Inhalt)";
    console.log(`      eltern/${ref.id}  —  ${beschreibung}`);
  }
  console.log();

  if (!aufraeumen) {
    console.log(
      "  Zum Löschen erneut mit --aufraeumen starten. Vorher diese Liste prüfen:\n" +
        "  das Löschen ist rekursiv und endgültig.\n"
    );
    process.exit(1);
  }

  console.log("  Räume auf …\n");
  for (const { ref } of waisen) {
    await db.recursiveDelete(ref);
    console.log(`      gelöscht: eltern/${ref.id}`);
  }
  console.log(`\n  ${waisen.length} Eintrag/Einträge entfernt.\n`);
  process.exit(0);
}

main().catch((fehler) => {
  const text = String(fehler?.message || fehler);
  console.error("\nAbbruch:", text, "\n");
  if (/insufficient permission/i.test(text)) {
    console.error(
      `  Benutzt wurde: ${schluesselDaten.client_email} (Projekt ${schluesselDaten.project_id})\n` +
        "  Dieses Dienstkonto darf nicht auf Firestore/Authentication zugreifen.\n" +
        "  Richtigen Schlüssel holen: Firebase-Konsole → Projekteinstellungen → Dienstkonten\n" +
        "  → „Neuen privaten Schlüssel generieren\" (Konto beginnt dann mit firebase-adminsdk-).\n"
    );
  }
  process.exit(1);
});
