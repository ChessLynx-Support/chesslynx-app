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
  type Purchase,
  type PurchaseError,
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

  // iOS liefert die App-Store-Quittung über `transactionReceipt`, Android den
  // Play-Store-`purchaseToken` — expo-iap normalisiert beides (noch) nicht auf ein
  // gemeinsames Feld, deshalb beide Werte mitschicken und serverseitig je nach
  // `platform` auswerten (siehe functions/src/index.ts).
  await verifyPurchase({
    platform: Platform.OS === "ios" ? "ios" : "android",
    productId: VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID,
    receipt: kauf.transactionReceipt ?? "",
    purchaseToken: (kauf as unknown as { purchaseToken?: string }).purchaseToken,
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

    const fehlerListener = purchaseErrorListener((fehler: PurchaseError) => {
      erfolgListener.remove();
      fehlerListener.remove();
      const abgebrochen = fehler.code === "E_USER_CANCELLED";
      resolve({ erfolg: false, grund: abgebrochen ? "abgebrochen" : "fehler", details: fehler.message });
    });

    requestPurchase({ request: { sku: VOLLSTAENDIGER_LERNPFAD_PRODUKT_ID } }).catch((fehler: any) => {
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
