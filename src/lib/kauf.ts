// In-App-Kauf: Freischaltung des vollständigen Lernpfads (Quest 4–6 + alle
// Bonuskapitel) via `expo-iap`. Siehe Claude-Projekt "ChessLynx",
// monetarisierung_iap_technische_recherche_2026-09-09.md für die vollständige
// Recherche/Entscheidungsgrundlage — dieser Code setzt die dort entschiedene
// Architektur um:
//   Kauf (Client, expo-iap) → Quittung an Cloud Function `verifyPurchase`
//   (functions/src/index.ts) → serverseitige Prüfung gegen Apple/Google →
//   `vollstaendigerLernpfadFreigeschaltet: true` im Eltern-Einstellungen-Dokument.
//
// ══════════════════════════════════════════════════════════════════════════════
// STAND 2026-09-12 (ersetzt den früheren ACHTUNG-Block):
//   1. `expo-iap` ist installiert und steht in package.json (^5.5.1) sowie als
//      Plugin in app.json — die frühere Warnung "Paket fehlt, Datei darf nirgends
//      importiert werden" gilt nicht mehr.
//   2. Offen bleibt der Custom Dev Client (EAS Build): Expo Go unterstützt keine
//      In-App-Käufe. Vor dem ersten echten Kauf-Test außerdem in
//      functions/src/index.ts: numerische App-ID eintragen, Apple-Root-Zertifikate
//      laden, Sandbox/Production umschalten, die vier Firebase-Secrets setzen;
//      dazu Produkt-ID `vollstaendiger_lernpfad` in beiden Store-Konsolen anlegen
//      und Sandbox-Testkonten einrichten.
//   3. Der Kaufbutton in ParentDashboard.tsx ist weiterhin auskommentiert
//      (Abschnitt "5. Freischaltung / Kauf") und wird in Paket 8 aktiviert.
//
// Hinweis zur API-Form unten: `expo-iap` folgt der etablierten react-native-iap-
// API-Form (initConnection/purchaseUpdatedListener/requestPurchase/...), auf der
// die OpenIAP-Spezifikation aufbaut. Die exakten Funktions-/Typnamen der jetzt
// installierten Version sind noch nicht gegengeprüft — TypeScript zeigt beim
// ersten Build sofort, falls sich seit Version 3.4 etwas verschoben hat.
// ══════════════════════════════════════════════════════════════════════════════

import { Platform } from "react-native";
import {
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  // `ErrorCode` ist ein echtes Enum (Wert, kein Typ) — seit expo-iap 5.x heißen die
  // Fehlercodes nicht mehr "E_USER_CANCELLED", sondern "user-cancelled" (siehe unten).
  ErrorCode,
  type Purchase,
} from "expo-iap";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { holeDb, elternEinstellungenPfad, holeFirebaseApp, type ElternEinstellungen } from "./firebase";

// Produkt-ID — muss exakt mit der ID übereinstimmen, die in App Store Connect bzw.
// Google Play Console angelegt wird (Recherche-Notiz, Schritt 3). Ein einziges
// nicht-verbrauchbares (non-consumable) Produkt für beide Stores, siehe
// "Kauf gilt pro Elternkonto"-Entscheidung.
export const VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID = "vollstaendiger_lernpfad";

// Dieselbe Region wie in functions/src/index.ts — muss übereinstimmen, sonst
// findet der Client die Cloud Function nicht.
const FUNCTIONS_REGION = "europe-west1";

export type KaufErgebnis =
  | { erfolg: true }
  | {
      erfolg: false;
      grund: "abgebrochen" | "quittungspruefung_fehlgeschlagen" | "fehler";
      details?: string;
    };

let verbindungAktiv = false;

async function stelleVerbindungSicher(): Promise<void> {
  if (verbindungAktiv) return;
  await initConnection();
  verbindungAktiv = true;
}

/**
 * Prüft den aktuellen Freischaltungsstatus rein lesend (Firestore, Elternkonto-
 * Ebene). Bewusst OHNE expo-iap-Abhängigkeit — diese Funktion braucht nur
 * Firestore und kann daher schon jetzt sicher verwendet werden (siehe
 * ParentDashboard.tsx, das denselben Wert bereits über `ladeElternEinstellungen`
 * lädt; diese Funktion hier ist der direkte Weg, falls ein Screen nur den
 * Freischaltungsstatus braucht, ohne die volle ElternEinstellungen-Struktur).
 */
export async function pruefeFreischaltungStatus(parentUid: string): Promise<boolean> {
  const snap = await getDoc(doc(holeDb(), elternEinstellungenPfad(parentUid)));
  if (!snap.exists()) return false;
  const daten = snap.data() as Partial<ElternEinstellungen>;
  return daten.vollstaendigerLernpfadFreigeschaltet === true;
}

/**
 * Schickt eine Kauf-Quittung an die Cloud Function `verifyPurchase` zur
 * serverseitigen Prüfung. Der Client schreibt `vollstaendigerLernpfadFreigeschaltet`
 * NIE selbst — nur die Cloud Function tut das, nach erfolgreicher Prüfung gegen
 * Apples/Googles Verifizierungs-API. Eine rein clientseitige Prüfung gilt laut
 * Recherche-Notiz als unsicher/manipulierbar.
 */
async function quittungPruefen(kauf: Purchase): Promise<void> {
  const functions = getFunctions(holeFirebaseApp(), FUNCTIONS_REGION);
  const verifyPurchase = httpsCallable<
    { platform: "ios" | "android"; productId: string; receipt: string; purchaseToken?: string },
    { freigeschaltet: boolean }
  >(functions, "verifyPurchase");

  // Korrektur 2026-09-14 (expo-iap 5.5.1): Der frühere Kommentar hier war überholt und
  // der Code damit kaputt. `transactionReceipt` gibt es nicht mehr — der Beleg wäre
  // stillschweigend als leerer String an den Server gegangen, die Prüfung hätte nie
  // funktioniert. expo-iap führt beide Quittungsformen inzwischen in EINEM Feld
  // zusammen: `purchaseToken` trägt auf iOS die JWS-Repräsentation der Transaktion, auf
  // Android den Play-Store-Token (Zitat aus node_modules/expo-iap/build/types.d.ts:
  // "Unified purchase token (iOS JWS, Android purchaseToken)").
  //
  // Die Aufteilung auf zwei Felder bleibt trotzdem bestehen: Die Cloud Function wertet
  // je nach `platform` genau eines davon aus (siehe functions/src/index.ts), und diesen
  // Vertrag ändern wir nicht nebenbei mit.
  const istIOS = Platform.OS === "ios";
  const quittung = kauf.purchaseToken ?? "";
  await verifyPurchase({
    platform: istIOS ? "ios" : "android",
    productId: VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID,
    receipt: istIOS ? quittung : "",
    purchaseToken: istIOS ? undefined : quittung,
  });
}

/**
 * Startet den Kaufvorgang für den vollständigen Lernpfad. Ausschließlich aus dem
 * ParentDashboard heraus aufzurufen (liegt bereits hinter ParentGate.tsx) — siehe
 * Apple-Kids-Category-Befund in der Recherche-Notiz: Kaufmöglichkeiten dürfen
 * nirgends im Kind-Bereich auftauchen, auch nicht dezent.
 */
export async function kaufeVollstaendigenLernpfad(): Promise<KaufErgebnis> {
  await stelleVerbindungSicher();

  return new Promise((resolve) => {
    const erfolgListener = purchaseUpdatedListener(async (kauf: Purchase) => {
      erfolgListener.remove();
      fehlerListener.remove();
      try {
        await quittungPruefen(kauf);
        // `isConsumable: false`, da nicht-verbrauchbares Produkt (einmalige
        // Freischaltung, kein Verbrauchsgut) — siehe Produktentscheidung oben.
        await finishTransaction({ purchase: kauf, isConsumable: false });
        resolve({ erfolg: true });
      } catch (fehler: any) {
        resolve({
          erfolg: false,
          grund: "quittungspruefung_fehlgeschlagen",
          details: fehler?.message,
        });
      }
    });

    // Bewusst ohne Typannotation: expo-iap deklariert `PurchaseError` an zwei Stellen
    // (types.d.ts und utils/errorMapping.d.ts) mit unterschiedlich striktem `code`.
    // Eine eigene Annotation trifft zwangsläufig die falsche; die Herleitung aus der
    // Listener-Signatur trifft immer die richtige.
    const fehlerListener = purchaseErrorListener((fehler) => {
      erfolgListener.remove();
      fehlerListener.remove();
      // Seit expo-iap 5.x ein Enum-Wert ("user-cancelled") statt der alten Konstante
      // "E_USER_CANCELLED". Der alte Vergleich war immer falsch — ein vom Elternteil
      // abgebrochener Kauf wäre als echter Fehler gemeldet worden.
      const abgebrochen = fehler.code === ErrorCode.UserCancelled;
      resolve({ erfolg: false, grund: abgebrochen ? "abgebrochen" : "fehler", details: fehler.message });
    });

    // expo-iap 5.x verlangt die Anfrage plattformgetrennt (`apple` mit einer einzelnen
    // `sku`, `google` mit einer `skus`-Liste) plus die ausdrückliche Art des Kaufs. Die
    // frühere Kurzform `{ request: { sku } }` wurde zur Laufzeit nicht mehr verstanden.
    requestPurchase({
      request: {
        apple: { sku: VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID },
        google: { skus: [VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID] },
      },
      // "in-app" = Einmalkauf, nicht Abo — entspricht dem entschiedenen Kaufmodell.
      type: "in-app",
    }).catch((fehler: any) => {
      erfolgListener.remove();
      fehlerListener.remove();
      resolve({ erfolg: false, grund: "fehler", details: fehler?.message });
    });
  });
}

/**
 * Pflicht-"Käufe wiederherstellen" — von Apple für nicht-verbrauchbare Produkte
 * zwingend vorgeschrieben (App Review lehnt sonst ab), siehe Recherche-Notiz.
 * Holt bereits getätigte Käufe (z. B. nach Neuinstallation oder auf einem zweiten
 * Gerät desselben Elternkontos) und schickt sie erneut durch dieselbe
 * Quittungsprüfung, damit die Freischaltung im Firestore-Dokument nachgezogen wird.
 */
export async function kaeufeWiederherstellen(): Promise<KaufErgebnis> {
  await stelleVerbindungSicher();
  try {
    const vorhandeneKaeufe = await getAvailablePurchases();
    const passenderKauf = vorhandeneKaeufe.find(
      (k) => k.productId === VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID
    );
    if (!passenderKauf) {
      return {
        erfolg: false,
        grund: "fehler",
        details: "Kein bereits getätigter Kauf für dieses Konto gefunden.",
      };
    }
    await quittungPruefen(passenderKauf);
    return { erfolg: true };
  } catch (fehler: any) {
    return { erfolg: false, grund: "quittungspruefung_fehlgeschlagen", details: fehler?.message };
  }
}
