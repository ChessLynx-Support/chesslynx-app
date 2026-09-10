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
//   4. Die vier Secrets einmalig setzen (siehe bestehende `defineSecret`-Deklarationen
//      unten, unverändert) — erst DANN schaltet ein echter Kauf tatsächlich frei.
//
// Bis Punkt 1 erledigt ist, bleibt dieses Skelett bewusst NICHT deploybar (genau wie
// src/lib/kauf.ts bewusst nicht importierbar ist, solange `expo-iap` nicht installiert
// ist) — kein stiller Fake-Erfolg, sondern ein klarer Build-Stopp, bis die Abhängigkeit
// wirklich da ist.
// ══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// Muss mit der Region in src/lib/kauf.ts (`FUNCTIONS_REGION`) übereinstimmen.
const REGION = "europe-west1";

// Muss mit VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID in src/lib/kauf.ts übereinstimmen UND
// mit der Produkt-ID, die in App Store Connect / Google Play Console angelegt wird
// (Recherche-Notiz, Schritt 3).
const ERWARTETE_PRODUKT_ID = "vollstaendiger_lernpfad";

// Secrets — Werte werden NICHT hier eingetragen, sondern einmalig per
// `firebase functions:secrets:set APPLE_IAP_PRIVATE_KEY` (und für die übrigen drei)
// gesetzt, sobald die echte Prüfung implementiert wird. Bis dahin bleiben sie
// ungenutzt (siehe Platzhalter-Funktionen unten) und müssen nicht gesetzt sein, damit
// dieses Skelett trotzdem deploybar ist.
const APPLE_IAP_PRIVATE_KEY = defineSecret("APPLE_IAP_PRIVATE_KEY");
const APPLE_IAP_KEY_ID = defineSecret("APPLE_IAP_KEY_ID");
const APPLE_IAP_ISSUER_ID = defineSecret("APPLE_IAP_ISSUER_ID");
const GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = defineSecret("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");

// Bundle-ID/Package-Name — aus app.json übernommen (ios.bundleIdentifier /
// android.package), nicht aus der Recherche-Notiz geraten.
const APPLE_BUNDLE_ID = "com.chesslynx.app";
const GOOGLE_PACKAGE_NAME = "com.chesslynx.app";

// TODO (siehe ACHTUNG-Block oben, Punkt 3): numerische App-ID aus App Store Connect
// eintragen — Pflichtfeld für SignedDataVerifier in Production seit einer neueren
// Version der Bibliothek (App Store Connect → App → "Apple ID" in den allgemeinen
// App-Informationen, eine rein numerische ID, NICHT die Bundle-ID).
const APPLE_APP_STORE_CONNECT_APP_ID = "TODO_NUMERISCHE_APP_ID_AUS_APP_STORE_CONNECT";

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
    secrets: [APPLE_IAP_PRIVATE_KEY, APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON],
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
  const { SignedDataVerifier, AppStoreServerAPIClient, Environment } = await import(
    "@apple/app-store-server-library"
  );

  // TODO: auf Environment.SANDBOX umstellen, solange nur mit TestFlight/Sandbox-
  // Käufen getestet wird — siehe Kopfkommentar dieser Datei.
  const environment = Environment.PRODUCTION;

  const client = new AppStoreServerAPIClient(
    APPLE_IAP_PRIVATE_KEY.value(),
    APPLE_IAP_KEY_ID.value(),
    APPLE_IAP_ISSUER_ID.value(),
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
    const verifiedTransaction = await verifier.verifyAndDecodeTransaction(
      transactionResponse.signedTransactionInfo
    );

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

  const serviceAccount = JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.value());

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
