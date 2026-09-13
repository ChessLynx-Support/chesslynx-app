// Firebase Cloud Function: serverseitige Quittungsprüfung für den In-App-Kauf des
// vollständigen Lernpfads. Siehe Claude-Projekt "ChessLynx",
// monetarisierung_iap_technische_recherche_2026-09-09.md — dieses Skelett setzt genau
// den dort beschriebenen Architekturvorschlag um:
//   1. Kauf läuft client-seitig über `expo-iap` (siehe src/lib/kauf.ts).
//   2. Die Quittung landet hier und wird gegen Apples/Googles Verifizierungs-API geprüft.
//   3. Bei Erfolg wird `vollstaendigerLernpfadFreigeschaltet: true` ins
//      Eltern-Einstellungen-Dokument geschrieben (`eltern/{parentUid}/einstellungen/dashboard`,
//      siehe src/lib/firebase.ts, `elternEinstellungenPfad`).
//   4. Der Pflicht-"Käufe wiederherstellen"-Button ruft dieselbe Funktion erneut auf.
//
// Läuft auf dem Firebase Spark-Tarif (kein Blaze-Upgrade nötig) — siehe Recherche-Notiz,
// Abschnitt "Backend-Implikation".
//
// ══════════════════════════════════════════════════════════════════════════════
// UMSETZUNG 2026-09-10 (Claude-Projekt "ChessLynx", Umsetzung des in
// monetarisierung_iap_technische_recherche_2026-09-09.md recherchierten Ansatzes):
// `pruefeAppleQuittung`/`pruefeGoogleQuittung` unten sind jetzt echte Implementierungen
// statt der bisherigen `return false`-Platzhalter.
//
// ACHTUNG — VOR DEM NÄCHSTEN `npm run build` / `firebase deploy` NOCH ZU ERLEDIGEN:
//   1. `npm install @apple/app-store-server-library googleapis --prefix functions`
//      lokal ausführen (beide Pakete stehen unten bereits in package.json, aber
//      node_modules fehlt noch — `tsc` bricht sonst mit "Cannot find module" ab).
//      Paketnamen/Versionen am 2026-09-10 per Websuche gegen die npm-Registry
//      verifiziert: `@apple/app-store-server-library` (Apples aktuelles, offizielles
//      Scoped-Package — NICHT das alte, verwaiste unscoped `app-store-server-library`,
//      das seit Version 0.1.3 nicht weitergepflegt wird) in Version 3.x, sowie
//      `googleapis` in Version 178.x.
//   2. Apples aktuelle Root-Zertifikate (.cer-Dateien, von Apple bereitgestellt) lokal
//      besorgen und laden — `appleRootCAs` unten ist noch ein leeres Array (TODO).
//   3. `APPLE_APP_STORE_CONNECT_APP_ID` unten durch die echte numerische App-ID aus
//      App Store Connect ersetzen (Pflichtfeld für Production laut aktueller
//      SignedDataVerifier-Signatur, siehe Kommentar dort — in der Referenzrecherche
//      vom 2026-09-09 noch nicht als eigener Parameter bekannt).
//   4. Die vier Secrets einmalig setzen und die `defineSecret`-Zeilen unten wieder
//      aktivieren (sie sind seit 2026-09-13 auskommentiert, Begründung dort) — erst DANN
//      schaltet ein echter Kauf tatsächlich frei.
//
// Bis Punkt 1 erledigt ist, bleibt dieses Skelett bewusst NICHT deploybar (genau wie
// src/lib/kauf.ts bewusst nicht importierbar ist, solange `expo-iap` nicht installiert
// ist) — kein stiller Fake-Erfolg, sondern ein klarer Build-Stopp, bis die Abhängigkeit
// wirklich da ist.
// ══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
// `defineSecret` ist vorerst nicht in Gebrauch — siehe Kommentar bei den auskommentierten
// Secret-Deklarationen weiter unten. Import beim Reaktivieren wieder ergänzen.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// 1. Generation, ausschliesslich fuer den Auth-Loeschausloeser ganz unten —
// Begruendung dort. Der Rest dieser Datei nutzt die v2-API.
import * as functionsV1 from "firebase-functions/v1";

initializeApp();
const db = getFirestore();

// Muss mit der Region in src/lib/kauf.ts (`FUNCTIONS_REGION`) übereinstimmen.
const REGION = "europe-west1";

// Muss mit VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID in src/lib/kauf.ts übereinstimmen UND
// mit der Produkt-ID, die in App Store Connect / Google Play Console angelegt wird
// (Recherche-Notiz, Schritt 3).
const ERWARTETE_PRODUKT_ID = "vollstaendiger_lernpfad";

// Secrets für die Kaufprüfung — Änderung 2026-09-13 (erster echter Deploy-Versuch): Die vier Secrets waren über
// `defineSecret` deklariert UND in den `secrets`-Optionen von `verifyPurchase`
// eingetragen. Damit prüft die Firebase-CLI sie beim Deploy — und der Deploy scheiterte
// mit HTTP 403: Die Secret-Manager-API ist im Projekt gar nicht aktiviert, und keines der
// vier Secrets existiert. Blockiert war damit ALLES, auch die Löschfunktion ganz unten,
// die mit Käufen nichts zu tun hat.
//
// Die Kaufprüfung kann derzeit ohnehin nichts prüfen (siehe die drei TODOs im
// ACHTUNG-Block oben: keine numerische App-ID, keine Apple-Root-Zertifikate, keine
// gesetzten Secrets). Deshalb werden die Secrets vorerst NICHT deklariert, sondern zur
// Laufzeit aus der Umgebung gelesen — fehlt einer, bricht die Prüfung mit einer klaren
// Meldung ab, statt einen Kauf durchzuwinken.
//
// WENN DIE KAUFPRÜFUNG ECHT WIRD, in dieser Reihenfolge:
//   1. Secret-Manager-API aktivieren.
//   2. `firebase functions:secrets:set APPLE_IAP_PRIVATE_KEY` (und die übrigen drei).
//   3. Hier die vier `defineSecret`-Zeilen unten einkommentieren und sie wieder in die
//      `secrets`-Option von `verifyPurchase` eintragen — erst dadurch bindet Firebase sie
//      als Umgebungsvariablen in die Funktion ein und `secretWert()` findet sie.
// const APPLE_IAP_PRIVATE_KEY = defineSecret("APPLE_IAP_PRIVATE_KEY");
// const APPLE_IAP_KEY_ID = defineSecret("APPLE_IAP_KEY_ID");
// const APPLE_IAP_ISSUER_ID = defineSecret("APPLE_IAP_ISSUER_ID");
// const GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = defineSecret("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");

/**
 * Liest ein Secret aus der Laufzeitumgebung. Wirft, wenn es fehlt — bei einer Kaufprüfung
 * ist ein Abbruch mit klarer Ursache die einzig vertretbare Reaktion; ein Leerstring würde
 * die Prüfung gegen Apple/Google unbemerkt fehlschlagen lassen.
 */
function secretWert(name: string): string {
  const wert = process.env[name];
  if (!wert) {
    throw new Error(
      `Secret ${name} ist nicht gesetzt. Kaufprüfung nicht möglich — siehe Kommentar zu ` +
        "den defineSecret-Zeilen in dieser Datei."
    );
  }
  return wert;
}

// Bundle-ID/Package-Name — aus app.json übernommen (ios.bundleIdentifier /
// android.package), nicht aus der Recherche-Notiz geraten.
const APPLE_BUNDLE_ID = "com.chesslynx.app";
const GOOGLE_PACKAGE_NAME = "com.chesslynx.app";

// TODO (siehe ACHTUNG-Block oben, Punkt 3): numerische App-ID aus App Store Connect
// eintragen — Pflichtfeld für SignedDataVerifier in Production seit einer neueren
// Version der Bibliothek (App Store Connect → App → "Apple ID" in den allgemeinen
// App-Informationen, eine rein numerische ID, NICHT die Bundle-ID).
//
// Korrektur 2026-09-13: Stand hier als Platzhalter-STRING und ließ damit den gesamten
// `functions`-Build scheitern (TS2345, erwartet wird `number`) — aufgefallen beim ersten
// `npm run build` überhaupt. Jetzt `0` als klar unmöglicher Zahlenwert plus eine
// Laufzeitprüfung in `pruefeAppleQuittung()`: Die Quittungsprüfung meldet sauber
// „nicht verifiziert", solange die echte ID fehlt, statt mit einer Platzhalter-ID gegen
// Apple zu laufen. Der Build läuft dadurch wieder, ohne dass irgendwo ein Kauf
// fälschlich als gültig durchgeht.
const APPLE_APP_STORE_CONNECT_APP_ID = 0;

type VerifyPurchaseRequest = {
  platform: "ios" | "android";
  productId: string;
  receipt: string;
  purchaseToken?: string;
};

type VerifyPurchaseResponse = {
  freigeschaltet: true;
};

export const verifyPurchase = onCall<VerifyPurchaseRequest>(
  {
    region: REGION,
    // `secrets: [...]` bewusst entfernt — siehe Kommentar bei den defineSecret-Zeilen oben.
  },
  async (request): Promise<VerifyPurchaseResponse> => {
    // Nur angemeldete Elternkonten dürfen Käufe verifizieren — `request.auth.uid` ist
    // die Firebase-Auth-UID, identisch mit `parentUid` überall sonst im Datenmodell
    // (siehe src/lib/firebase.ts, `kinderCollectionPfad`/`elternEinstellungenPfad`).
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Nur angemeldete Elternkonten können Käufe verifizieren."
      );
    }
    const parentUid = request.auth.uid;
    const { platform, productId, receipt, purchaseToken } = request.data;

    if (productId !== ERWARTETE_PRODUKT_ID) {
      throw new HttpsError("invalid-argument", `Unbekannte Produkt-ID: ${productId}`);
    }

    const gueltig =
      platform === "ios"
        ? await pruefeAppleQuittung(receipt)
        : await pruefeGoogleQuittung(purchaseToken ?? receipt);

    if (!gueltig) {
      throw new HttpsError(
        "failed-precondition",
        "Die Quittung konnte nicht verifiziert werden."
      );
    }

    // Dieselbe Datenschicht wie ladeElternEinstellungen/speichereElternEinstellungen
    // in src/lib/elternEinstellungen.ts — `merge: true`, damit z. B. ein zeitgleich
    // gespeichertes Zeitlimit nicht überschrieben wird.
    await db.doc(`eltern/${parentUid}/einstellungen/dashboard`).set(
      { vollstaendigerLernpfadFreigeschaltet: true, freischaltungAm: Date.now() },
      { merge: true }
    );

    return { freigeschaltet: true };
  }
);

/**
 * Prüft eine Apple-Quittung über die App Store Server API (App Store Server Library,
 * `@apple/app-store-server-library`, Version 3.x). `_receipt` ist hier die
 * `transactionId`, die der Client über `src/lib/kauf.ts` mitschickt (nicht die alte,
 * veraltete Receipt-Datei — siehe dortigen Kommentar zu `receipt`/`transactionReceipt`).
 *
 * Ablauf: Server ruft mit der transactionId `getTransactionInfo()` bei Apple ab,
 * bekommt ein signiertes JWS zurück, verifiziert die Signatur gegen Apples
 * Root-Zertifikate und liest erst aus dem VERIFIZIERTEN Payload Produkt-ID und
 * Widerrufsstatus aus (niemals aus der unverifizierten Antwort direkt).
 */
async function pruefeAppleQuittung(transactionId: string): Promise<boolean> {
  // Siehe Kommentar bei APPLE_APP_STORE_CONNECT_APP_ID: Ohne die echte, numerische App-ID
  // aus App Store Connect kann hier nichts verifiziert werden. Dann lieber hier aussteigen
  // als mit einem Platzhalter gegen Apple zu laufen — „nicht verifiziert" ist bei einer
  // Kaufprüfung die einzig sichere Antwort, wenn die Voraussetzungen fehlen.
  if (!APPLE_APP_STORE_CONNECT_APP_ID) {
    console.error(
      "Apple-Quittungsprüfung übersprungen: APPLE_APP_STORE_CONNECT_APP_ID ist noch nicht " +
        "gesetzt (numerische Apple-ID aus App Store Connect)."
    );
    return false;
  }

  const { SignedDataVerifier, AppStoreServerAPIClient, Environment } = await import(
    "@apple/app-store-server-library"
  );

  // TODO: auf Environment.SANDBOX umstellen, solange nur mit TestFlight/Sandbox-
  // Käufen getestet wird — siehe Kopfkommentar dieser Datei.
  const environment = Environment.PRODUCTION;

  const client = new AppStoreServerAPIClient(
    secretWert("APPLE_IAP_PRIVATE_KEY"),
    secretWert("APPLE_IAP_KEY_ID"),
    secretWert("APPLE_IAP_ISSUER_ID"),
    APPLE_BUNDLE_ID,
    environment
  );

  // TODO (siehe ACHTUNG-Block im Kopfkommentar, Punkt 2): echte Root-CA-.cer-Dateien
  // von Apple laden und hier als Buffer-Array übergeben — ohne sie schlägt JEDE
  // Verifizierung fehl (SignedDataVerifier kann die JWS-Signatur nicht prüfen).
  const appleRootCAs: Buffer[] = [];
  const verifier = new SignedDataVerifier(
    appleRootCAs,
    /* enableOnlineChecks */ true,
    environment,
    APPLE_BUNDLE_ID,
    // Fünfter Parameter (appAppleId) — Pflichtfeld für Production laut aktueller
    // Bibliotheksversion, in der ursprünglichen Recherche-Notiz vom 2026-09-09 noch
    // nicht bekannt. Siehe TODO Punkt 3 oben.
    APPLE_APP_STORE_CONNECT_APP_ID
  );

  try {
    const transactionResponse = await client.getTransactionInfo(transactionId);
    // Korrektur 2026-09-13 (TS2345, zweiter Build-Fehler): `signedTransactionInfo` ist in
    // der Bibliothek als optional deklariert — Apple liefert das Feld nicht in jeder
    // Antwort. Ohne signiertes JWS gibt es nichts zu verifizieren; das als „Kauf nicht
    // bestätigt" zu werten ist die einzig vertretbare Auslegung.
    const signiert = transactionResponse.signedTransactionInfo;
    if (!signiert) {
      console.error("Apple-Antwort ohne signedTransactionInfo — Kauf nicht verifizierbar.");
      return false;
    }
    const verifiedTransaction = await verifier.verifyAndDecodeTransaction(signiert);

    // Echtheit + richtiges Produkt + kein Widerruf/keine Erstattung.
    const istRichtigesProdukt = verifiedTransaction.productId === ERWARTETE_PRODUKT_ID;
    const nichtErstattet = !verifiedTransaction.revocationDate;

    return istRichtigesProdukt && nichtErstattet;
  } catch (fehler) {
    console.error("Apple-Quittungsprüfung fehlgeschlagen:", fehler);
    return false;
  }
}

/**
 * Prüft eine Google-Quittung über die Play Developer API (`googleapis`, Version
 * 178.x, Teilmodul `androidpublisher`, Methode `purchases.products.get`).
 * `purchaseToken` kommt vom Client (siehe `src/lib/kauf.ts`, `kauf.purchaseToken`).
 */
async function pruefeGoogleQuittung(purchaseToken: string): Promise<boolean> {
  const { google } = await import("googleapis");

  const serviceAccount = JSON.parse(secretWert("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"));

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const androidpublisher = google.androidpublisher({ version: "v3", auth });

  try {
    const antwort = await androidpublisher.purchases.products.get({
      packageName: GOOGLE_PACKAGE_NAME,
      productId: ERWARTETE_PRODUKT_ID,
      token: purchaseToken,
    });

    // purchaseState: 0 = gekauft, 1 = storniert, 2 = ausstehend.
    const istGekauft = antwort.data.purchaseState === 0;

    // Pflicht: unbestätigte Käufe müssen innerhalb von 3 Tagen bestätigt werden, sonst
    // erstattet Google automatisch (acknowledgementState: 0 = nicht bestätigt).
    if (istGekauft && antwort.data.acknowledgementState === 0) {
      await androidpublisher.purchases.products.acknowledge({
        packageName: GOOGLE_PACKAGE_NAME,
        productId: ERWARTETE_PRODUKT_ID,
        token: purchaseToken,
      });
    }

    return istGekauft;
  } catch (fehler) {
    console.error("Google-Quittungsprüfung fehlgeschlagen:", fehler);
    return false;
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// Kontodaten löschen, wenn ein Eltern-Konto verschwindet
// ══════════════════════════════════════════════════════════════════════════════
//
// WARUM ES DIESE FUNKTION GIBT (2026-09-13): Die App räumt beim "Konto löschen" im
// Eltern-Bereich bereits selbst auf — am Gerät geprüft. Die Lücke liegt woanders: Wird ein
// Konto NICHT über die App entfernt (in der Firebase-Konsole, über das Admin-SDK, über einen
// späteren Support-Weg), läuft kein App-Code mit, und `eltern/<uid>` bleibt als Waise stehen
// — personenbezogene Daten eines Kontos, das es nicht mehr gibt. Genau das ist am
// 2026-09-13 nachgewiesen worden: 0 Konten in Authentication, ein vollständiger Datensatz
// mit Kinderprofil in Firestore.
//
// WARUM NICHT DIE EXTENSION "Delete User Data": Die war der erste Plan und ist nach einem
// Blick auf ihre Installationsausgabe verworfen worden:
//  - Firebase Extensions wird zum 31. März 2027 abgeschaltet. Der Launch ist der
//    1. Dezember 2026 — die Absicherung wäre vier Monate danach still weggefallen.
//  - Sie hätte vier sehr breite Rollen bekommen, darunter Storage Admin und Pub/Sub Admin,
//    für Dienste, die ChessLynx gar nicht benutzt.
//  - Sie verlangt einen eingerichteten Cloud-Storage-Bucket, den das Projekt sonst nicht
//    bräuchte.
// Diese Funktion deckt denselben Fall in ein paar Zeilen ab, mit den Rechten, die die
// Functions ohnehin haben, und ohne Abschaltdatum.
//
// WARUM 1. GENERATION (`firebase-functions/v1`): Auslöser auf das Löschen eines
// Auth-Kontos gibt es nur dort. Das v2-Gegenstück (`beforeUserDeleted`) ist ein
// BLOCKIERENDER Auslöser — er läuft VOR der Löschung, kann sie bei einem Fehler verhindern
// und setzt zusätzlich ein Upgrade auf Identity Platform voraus. Für ein Aufräumen NACH der
// Löschung ist das die falsche Bauform. Der Rest dieser Datei bleibt bei v2; beide
// Generationen nebeneinander sind ausdrücklich zulässig.
//
// Region bewusst dieselbe wie oben (`REGION`), damit alle Funktionen dieses Projekts an
// einem Ort liegen.


export const elternDatenAufraeumen = functionsV1
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    const pfad = `eltern/${user.uid}`;
    try {
      // recursiveDelete räumt das Dokument UND alles darunter ab (`kinder`,
      // `einstellungen`, und alles, was später dazukommt). Der flache Weg (`.delete()`)
      // wäre hier wirkungslos und würde es nicht einmal melden: `eltern/<uid>` ist in
      // diesem Datenmodell in der Regel gar kein Dokument, sondern nur ein Pfadsegment
      // über den Subcollections — ein `delete()` darauf ist erfolgreich und löscht nichts.
      await db.recursiveDelete(db.doc(pfad));
      console.log(`Kontodaten entfernt: ${pfad}`);
    } catch (fehler) {
      // Bewusst nicht weiterwerfen: Ein Fehler hier darf die Kontolöschung selbst nicht
      // rückgängig machen oder als fehlgeschlagen erscheinen lassen. Übrig gebliebene
      // Daten fängt `scripts/waisen_pruefen.cjs` vor jedem Release auf — deshalb bleibt
      // dieses Skript auch mit dieser Funktion sinnvoll.
      console.error(`Kontodaten konnten nicht entfernt werden (${pfad}):`, fehler);
    }
  });
