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
// ACHTUNG — diese Datei ist erst LAUFFÄHIG, sobald zwei Voraussetzungen erfüllt
// sind (siehe Recherche-Notiz, Abschnitt "Konkrete nächste Schritte", Punkte 1+2):
//   1. `npx expo install expo-iap` wurde lokal ausgeführt. Das Paket steht noch
//      NICHT in package.json — diese Datei importiert es trotzdem bereits, weil
//      sie genau der Code ist, der danach gebraucht wird.
//   2. Ein Custom Dev Client (EAS Build) existiert. Expo Go unterstützt keine
//      In-App-Käufe (native Module lassen sich dort nicht konfigurieren).
//
// Bis beide Punkte erledigt sind, DARF diese Datei NIRGENDS importiert werden —
// auch nicht in ParentDashboard.tsx. Ein Import von `expo-iap` schlägt fehl,
// solange das Paket nicht installiert ist, und bringt das komplette
// Metro-Bundling zum Absturz (nicht nur diesen Screen). Siehe ParentDashboard.tsx,
// Abschnitt "5. Freischaltung / Kauf", für den entsprechend auskommentierten
// Anschlusspunkt, der erst nach Punkt 1+2 einkommentiert werden soll.
//
// Hinweis zur API-Form unten: `expo-iap` folgt der etablierten react-native-iap-
// API-Form (initConnection/purchaseUpdatedListener/requestPurchase/...), auf der
// die OpenIAP-Spezifikation aufbaut. Da das Paket in dieser Umgebung nicht
// installiert werden kann (kein Terminalzugriff auf dieses Gerät), ließen sich die
// exakten Funktions-/Typnamen der tatsächlich installierten Version nicht
// gegenprüfen — nach Schritt 1 zeigt TypeScript/die IDE sofort, falls sich hier
// seit Version 3.4 etwas verschoben hat (kleine, lokal behebbare Abweichungen).
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
