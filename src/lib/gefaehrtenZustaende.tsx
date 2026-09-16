// Die sechs Gefährten als lebendige Wegmarken auf der Saga-Karte (2026-09-14).
//
// Hintergrund: Seit dem 2026-09-11 entstehen Bewegungen nach der Zustands-Methode — das
// Bild-Tool liefert vollständige Bilder, `scripts/rig_master.py` richtet sie deckungsgleich
// auf den Grundzustand aus und exportiert alle Zustände einer Figur mit DEMSELBEN
// Ausschnitt auf DIESELBE Leinwand (siehe claude/rig_master_system_2026-09-12.md). Die
// Quest-Tiere und Lux sind seit dem 2026-09-13 so verdrahtet (ZustandsTier.tsx); die sechs
// Gefährten waren die letzte Gruppe, deren fertige Zustände ungenutzt im Rig lagen — auf
// der Karte stand von jedem nur ein Standbild.
//
// Diese Datei ist die Gegenstelle dazu, gebaut wie der Wegmarken-Teil von questTiere.tsx.
//
// -------------------------------------------------------------------------------------
// Warum nur Grundzustand, Blinzeln — und seit 2026-09-15 bei Adlerin UND Rabe auch Zwinkern
// -------------------------------------------------------------------------------------
// Im Rig liegt je Gefährte auch ein SPRECHEN-Zustand (bei Adlerin und Rabe zusätzlich ein
// Zwinkern, beim Wisent Kopfheben und Schnauben). Sprechen bleibt weiterhin unexportiert:
// Die App ist bewusst textfrei/stimmenfrei nur mit geprüften, freigegebenen Sprechzeilen,
// und für "Gefährte spricht im Revier" gibt es noch keine — siehe screens/Revier.tsx-
// Kommentar. Eine Datei, die kein Screen anzeigt, ist Bundle-Gewicht ohne Gegenwert
// (claude/zustaende_app_einbindung_2026-09-13.md).
//
// Zwinkern braucht dagegen KEINEN Text — die Zustandsdefinition selbst nennt es "Reaktion
// auf Lob". Für die Adlerin ist es seit 2026-09-15 exportiert und verdrahtet: screens/
// Revier.tsx löst es aus, sobald im Revier ein neuer Stern erreicht wird (`zwinkernAusloeser`
// unten). Beim Raben war es zunächst zurückgestellt: der frische Export wich beim
// Grundzustand um 77 % der Pixel von der ausgelieferten Wegmarke ab. Ursache war NICHT (wie
// zunächst vermutet) eine unvollständig nachgezogene Kopfausschnitt-Korrektur, sondern ein
// falsches Master-Bild — die als Master abgelegte Datei war per Prüfsumme bitgleich mit der
// ausdrücklich ABGELEHNTEN Rabe-Lieferung, nicht mit der freigegebenen (siehe
// `scripts/rig_configs/rabe.json`, Feld `korrektur_2026_09_15`, und
// `claude/rabe_v2_master_korrektur_2026-09-15.md`). Nach Umstellung auf das tatsächlich
// freigegebene Master-Bild registriert sich Rabe wieder sauber (Versatz 0,0 px, Abweichung
// 1–4/255, wie ursprünglich), Zwinkern ist jetzt ebenfalls exportiert und verdrahtet.
// Eichhörnchen, Dachs und Wolf haben ohnehin kein Zwinkern-Bild geliefert bekommen (nur
// Sprechen), bleiben also unverändert bei Grundzustand + Blinzeln.
//
// -------------------------------------------------------------------------------------
// E3 "Freude" (seit 2026-09-15, bei allen fünf Gefährten — Eichhörnchen, Dachs, Wolf,
// Adlerin und Rabe) — ersetzt den Grundzustand, sobald das Revier abgeschlossen ist
// -------------------------------------------------------------------------------------
// Anders als Zwinkern (einmalige Geste, siehe oben) ist Freude ein eigener VOLLBILD-Zustand
// (`S3_freude` im Rig, siehe `scripts/rig_configs/<tier>.json`) — Kopf sichtbar nach hinten
// gekippt, warmer Ausdruck, kein Blinzeln-Layer dafür geliefert. Auslöser (Christian,
// 2026-09-15: "Passt für E3, Eichhörnchen freigeben"): `istRevierAbgeschlossen()` aus
// lib/endlosmodusFortschritt.ts — sobald das Revier dieses Gefährten alle Sterne hat, zeigt
// screens/Revier.tsx dauerhaft die Freude-Pose statt Grundzustand+Blinzeln (kein einmaliges
// Aufblitzen wie beim Zwinkern, sondern der neue Ruhezustand für ein fertig gespieltes
// Revier — passt zur Bedeutung "das ist geschafft"). Die Ruhmeshalle bekommt beim selben
// Ereignis zusätzlich einmalig den Funkeln-Effekt (E5, siehe
// `e5_rangaufstieg_verdrahtung_2026-09-15.md`) — zwei unabhängige Reaktionen an zwei
// verschiedenen Orten auf dasselbe Ereignis, kein Widerspruch.
//
// -------------------------------------------------------------------------------------
// Die Leinwand ist größer als die Figur
// -------------------------------------------------------------------------------------
// Der Export legt um die Zustandsfamilie einen kleinen durchsichtigen Rand (3 px oben und
// unten). `ZustandsFigur` rechnet ihn wieder heraus, damit `breiteFrac` in
// LuchsRevierKarte.tsx weiterhin die Breite des TIERES meint und nicht die der Bilddatei.
// Die vier Zahlen in `figur` misst `rig_master.py` beim Export über den Alphakanal.
//
// -------------------------------------------------------------------------------------
// Station 2 ist seit dem 2026-09-14 der RABE, nicht mehr der Fuchs
// -------------------------------------------------------------------------------------
// Der Fuchs teilte sich die Farbe mit dem Eichhörnchen und mit Lux und die Silhouette mit
// dem Wolf. Auf der Karte standen Fuchs und Eichhörnchen 10,6 Referenzpunkte auseinander,
// in den Schattenrissen der Ruhmeshalle waren Fuchs und Wolf dieselbe Form. Umfärben half
// nicht: Orange kollidiert mit Eichhörnchen und Lux, Grau mit dem Wolf, Braun mit Wisent
// und Adlerin — für einen hundeartigen Vierbeiner ist in dieser Besetzung keine Farbe mehr
// frei. Schwarz war die einzige. Herleitung: claude/rabe_ersetzt_fuchs_2026-09-14.md.
//
// Der Rabe ist mit 27,3 Referenzpunkten schmaler als der Fuchs (38,2); die Lücke zum
// Eichhörnchen wächst dadurch von 10,6 auf 16,1 Punkte, ohne dass eine Wegmarke verschoben
// werden musste. Die Fuchs-Dateien bleiben im Archiv und in `scripts/rig_configs/fuchs.json`
// liegen — die Figur ist nicht gelöscht, nur nicht mehr verdrahtet.

// -------------------------------------------------------------------------------------
// Die Figuren sind 1–4 px schmaler als die bisherigen Standbilder
// -------------------------------------------------------------------------------------
// Die alten `chesslynx_<tier>_wegmarke.webp` waren aus dem ROHEN Master geschnitten, die
// neuen aus dem bereinigten: `rig_master.py` entfernt vor dem Bauen Streupixel und setzt
// den Innenraum auf volle Deckkraft. Beim Eichhörnchen fallen dadurch 3 px Fransensaum
// weg (215 → 212 px Breite bei gleicher Höhe). Die `aspekt`-Werte in LuchsRevierKarte.tsx
// kommen deshalb jetzt aus `gefaehrteWegmarkeAspekt()` statt aus fest eingetragenen
// Brüchen — sonst stünde die Figur um bis zu 2 % verzerrt auf der Karte.

import { useEffect, useRef } from "react";
import { Animated, Image } from "react-native";
import { ZustandsFigur, useGeste, GESTE_EINMAL } from "../components/ZustandsTier";
import type { Leinwand } from "../components/ZustandsTier";

// "Auftritt an der Wisentfeste" (W1_kopf_heben, seit 2026-09-16 freigegeben, siehe
// claude/wisent_kopf_heben_geometrisch_2026-09-14.md, Empfehlung/Nachtrag). Die Werte sind aus
// dort übernommen: Überblendung 260 ms (die übrigen Überblendungen in ZustandsTier.tsx laufen
// mit 90 ms — hier bewusst länger, weil die Bewegung selbst subtiler ist als ein Lidschlag und
// mehr Zeit braucht, um als Kopfheben statt als Zucken gelesen zu werden), translateY ≈ −10 px
// AUF DER 1254er-RIG-LEINWAND, auf der die Empfehlung gemessen wurde — deshalb hier als
// Bruchteil der Figurenbreite geführt, nicht als fester Pixelwert, damit es an jeder
// Aufrufstelle (Karte ~50 px, Revier 200 px, …) proportional gleich wirkt.
const AUFTRITT_UEBERBLENDUNG_MS = 260;
const AUFTRITT_HEBUNG_FRAKTION = 10 / 1254;

export type GefaehrteId =
  | "eichhoernchen"
  | "rabe"
  | "dachs"
  | "adlerin"
  | "wolf"
  | "wisent";

type WegmarkenBilder = {
  grund: ReturnType<typeof require>;
  blinzeln: ReturnType<typeof require>;
  /** Nur bei Adlerin und Rabe geliefert UND exportiert (Stand 2026-09-15, siehe
   *  Datei-Kommentar oben) — bei den übrigen Gefährten bewusst `undefined`. */
  zwinkern?: ReturnType<typeof require>;
  /** E3 Freude-Vollbild — ersetzt `grund`, sobald das Revier abgeschlossen ist (siehe
   *  Datei-Kommentar oben). Stand 2026-09-15 bei allen fünf Gefährten (Eichhörnchen, Dachs,
   *  Wolf, Adlerin, Rabe) geliefert UND exportiert; nur beim Wisent bewusst `undefined`
   *  (kein E3-Auftrag für ihn, siehe Produktionsauftragsdoku). */
  freude?: ReturnType<typeof require>;
  /** W1_kopf_heben — "Auftritt an der Wisentfeste" (siehe Konstanten-Kommentar oben und
   *  claude/wisent_kopf_heben_geometrisch_2026-09-14.md). Ersetzt `grund` dauerhaft, sobald
   *  der Wisent-Torwächter zum ersten Mal antippbar wird (siehe `GefaehrteWegmarke` unten und
   *  LuchsRevierKarte.tsx). Nur beim Wisent geliefert/exportiert, bei allen anderen Gefährten
   *  `undefined` (kein W1-Zustand für sie vorgesehen). */
  kopfHeben?: ReturnType<typeof require>;
  leinwand: Leinwand;
};

export const GEFAEHRTE_WEGMARKE: Record<GefaehrteId, WegmarkenBilder> = {
  eichhoernchen: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_blinzeln.webp"),
    freude: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_eichhoernchen_wegmarke_freude.webp"),
    leinwand: { breite: 221, hoehe: 326, figur: [4, 3, 212, 320] },
  },
  rabe: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_blinzeln.webp"),
    zwinkern: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_zwinkern.webp"),
    freude: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_rabe_wegmarke_freude.webp"),
    leinwand: { breite: 171, hoehe: 326, figur: [3, 3, 165, 320] },
  },
  dachs: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_blinzeln.webp"),
    freude: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_dachs_wegmarke_freude.webp"),
    leinwand: { breite: 204, hoehe: 326, figur: [5, 3, 194, 320] },
  },
  adlerin: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_blinzeln.webp"),
    zwinkern: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_zwinkern.webp"),
    freude: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_adlerin_wegmarke_freude.webp"),
    leinwand: { breite: 178, hoehe: 326, figur: [3, 3, 172, 320] },
  },
  wolf: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wolf_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wolf_wegmarke_blinzeln.webp"),
    freude: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wolf_wegmarke_freude.webp"),
    leinwand: { breite: 199, hoehe: 326, figur: [4, 3, 191, 320] },
  },
  wisent: {
    grund: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wisent_wegmarke_grund.webp"),
    blinzeln: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wisent_wegmarke_blinzeln.webp"),
    // Noch NICHT exportiert (Stand 2026-09-16) — die Quelle (Grafiken/Wisent/Zustaende/
    // wisent_W1_kopf_heben.png) liegt vor und ist freigegeben, aber `rig_master.py build
    // scripts/rig_configs/wisent.json` muss noch einmal auf Christians Rechner laufen, um
    // diese Datei in App-Auflösung zu erzeugen (siehe claude/status_technik_code.md). Bis
    // dahin bricht `require` beim Bauen der App — das ist beabsichtigt: ein fehlendes Asset
    // soll hier laut auffallen, nicht still als leeres Bild durchrutschen.
    kopfHeben: require("../../assets/figuren/gefaehrten/wegmarken/chesslynx_wisent_wegmarke_kopf_heben.webp"),
    leinwand: { breite: 210, hoehe: 326, figur: [4, 3, 203, 320] },
  },
};

/** Seitenverhältnis (Höhe/Breite) der FIGUR — nicht der Bilddatei. */
export function gefaehrteWegmarkeAspekt(id: GefaehrteId): number {
  const [, , breite, hoehe] = GEFAEHRTE_WEGMARKE[id].leinwand.figur;
  return hoehe / breite;
}

// -------------------------------------------------------------------------------------
// E4 "Ruhmeshallen-Porträt" (seit 2026-09-15, bei allen fünf Gefährten — Eichhörnchen, Rabe,
// Dachs, Adlerin, Wolf; bewusst NICHT beim Wisent, kein E4-Auftrag für ihn)
// -------------------------------------------------------------------------------------
// Kein eigenes KI-Bild: `scripts/kopfausschnitt.py` schneidet aus jeder bereits freigegebenen
// Standfigur reproduzierbar einen Kopf-/Schulter-Ausschnitt (Kante = 1,157 × Figurenbreite,
// zentriert auf die Kopfmitte, siehe claude/kopfausschnitt_lieferungen_einpassen_2026-09-14.md
// und claude/e3_e5_produktionsauftraege_2026-09-15.md). Der Ausschnitt ist DURCH KONSTRUKTION
// immer QUADRATISCH — deshalb hier kein `leinwand`/`figur`-Rechteck wie bei den Wegmarken
// oben, sondern eine einzige Breite, die zugleich die Höhe ist. Christian, 2026-09-15: "so
// lassen, eine Formel für alle fünf Gefährten" — bewusst keine Sonderbehandlung fürs
// Eichhörnchen trotz des dort etwas kleiner wirkenden Kopfes (breite buschige Rute treibt die
// GESAMT-Figurenbreite hoch, siehe Produktionsauftragsdoku).
const GEFAEHRTE_PORTRAET: Record<Exclude<GefaehrteId, "wisent">, ReturnType<typeof require>> = {
  eichhoernchen: require("../../assets/figuren/gefaehrten/portraets/chesslynx_eichhoernchen_portraet.webp"),
  rabe: require("../../assets/figuren/gefaehrten/portraets/chesslynx_rabe_portraet.webp"),
  dachs: require("../../assets/figuren/gefaehrten/portraets/chesslynx_dachs_portraet.webp"),
  adlerin: require("../../assets/figuren/gefaehrten/portraets/chesslynx_adlerin_portraet.webp"),
  wolf: require("../../assets/figuren/gefaehrten/portraets/chesslynx_wolf_portraet.webp"),
};

/** Ruhmeshallen-Porträt eines Gefährten (siehe Kommentar oben) — `breite` ist zugleich die
 *  Höhe, der Ausschnitt ist immer quadratisch. Statisch, kein Blinzeln/Zwinkern/Freude-Layer
 *  (anders als `GefaehrteWegmarke`): das Porträt ist ein fertiges Einzelbild, keine
 *  Zustandsfamilie. */
export function GefaehrtenPortraet({ id, breite }: { id: Exclude<GefaehrteId, "wisent">; breite: number }) {
  return (
    <Image
      source={GEFAEHRTE_PORTRAET[id]}
      style={{ width: breite, height: breite }}
      resizeMode="contain"
      // Derselbe Android-Fix wie in ZustandsTier.tsx/pieceMasters.tsx/questTiere.tsx: ohne
      // diese Prop blendet Android das Bild beim ersten Anzeigen 300 ms lang ein.
      fadeDuration={0}
    />
  );
}

/**
 * Ein Gefährte als Wegmarke auf der Saga-Karte ODER im Revier-Screen. `breite` ist die
 * Breite des TIERES.
 *
 * Auf der Karte grüßt weiterhin niemand: Die Gefährten haben dort keinen Gesten-Zustand,
 * der offene Mund allein — ohne Sprechblase und ohne Ton — läse sich nicht als Gruß,
 * sondern als Fehler. Im Revier gibt es seit 2026-09-15 ZWEI Ausnahmen: `zwinkernAusloeser`
 * löst bei Adlerin und Rabe ein einmaliges Zwinkern aus (Reaktion auf Lob, siehe
 * screens/Revier.tsx) — kein Sprechen, kein erfundener Dialog, nur eine stumme Geste mit
 * bereits freigegebenem Bildmaterial. `freudeAktiv` ersetzt den Grundzustand dauerhaft durch
 * die Freude-Pose, sobald das Revier abgeschlossen ist (siehe Datei-Kommentar oben). Bei
 * jeder anderen Aufrufstelle bzw. jedem anderen Gefährten bleiben beide Props wirkungslos
 * (kein exportiertes Zwinkern-/Freude-Bild, siehe `GEFAEHRTE_WEGMARKE` oben) — kein
 * Sonderfall nötig.
 */
export function GefaehrteWegmarke({
  id,
  breite,
  blinzeln = true,
  zwinkernAusloeser,
  freudeAktiv = false,
  auftrittAktiv = false,
  auftrittAnimiert = false,
}: {
  id: GefaehrteId;
  breite: number;
  blinzeln?: boolean;
  /** Ändert sich der Wert (z. B. ein hochgezählter Zähler), zwinkert die Figur einmal —
   *  siehe Funktionskommentar. */
  zwinkernAusloeser?: unknown;
  /** true → zeigt dauerhaft die Freude-Pose statt Grundzustand+Blinzeln (siehe
   *  Funktionskommentar). Ohne exportiertes Freude-Bild wirkungslos. */
  freudeAktiv?: boolean;
  /** true → zeigt dauerhaft W1 ("Kopf gehoben") statt Grundzustand+Blinzeln — der neue
   *  Ruhezustand ab dem "Auftritt an der Wisentfeste" (siehe Konstanten-Kommentar oben).
   *  Ohne exportiertes `kopfHeben`-Bild wirkungslos (aktuell nur beim Wisent). Schließt sich
   *  mit Freude aus wie Zwinkern — beides sind andere Kopfhaltungen als die Ausgangspose. */
  auftrittAktiv?: boolean;
  /** true → DIESER Übergang zu W1 läuft als Überblendung + kleines Kopfheben (translateY) ab,
   *  statt sofort im Endzustand zu stehen. Nur für den einen Render-Moment gedacht, in dem der
   *  Aufrufer den Wechsel selbst gerade zum ersten Mal auslöst (siehe LuchsRevierKarte.tsx,
   *  `wisentAuftrittGezeigt()` in lib/storage.ts) — bei jedem späteren Mount steht W1 mit
   *  `auftrittAktiv` allein (ohne dieses Flag) sofort da, ohne die Animation zu wiederholen. */
  auftrittAnimiert?: boolean;
}) {
  const w = GEFAEHRTE_WEGMARKE[id];
  const freudeJetzt = freudeAktiv && !!w.freude;
  const auftrittJetzt = auftrittAktiv && !!w.kopfHeben && !freudeJetzt;
  // Zwinkern, Freude und Auftritt schließen sich gegenseitig aus: Zwinkern ist eine Differenz
  // zum Grundzustand (S0_standing → S2_zwinkern) und würde auf einer andersartigen Kopfhaltung
  // (S3_freude ODER W1_kopf_heben) sichtbar falsch sitzen — deshalb `zwinkernAusloeser` in
  // beiden Zuständen ignorieren, nicht extra durch den Aufrufer abschalten lassen müssen.
  const zwinkertJetzt = useGeste(
    w.zwinkern && !freudeJetzt && !auftrittJetzt ? zwinkernAusloeser : undefined,
    GESTE_EINMAL
  );

  // Kopfheben-Überblendung (siehe `auftrittAnimiert`-Kommentar oben): läuft über dieselbe
  // Ebenen-Überblendung wie Zwinkern (ZustandsTier.tsx blendet `grund` synchron aus, sobald
  // irgendeine Ebene aktiv ist — mit `aktiv: true` bleibt sie es dauerhaft, genau das "halten"
  // aus der Empfehlung). `grund` bleibt in diesem Fall bewusst S0 — das ist die UNTERE Ebene
  // der Überblendung, nicht der Zielzustand.
  const ebenen =
    auftrittJetzt && auftrittAnimiert
      ? [{ bild: w.kopfHeben!, aktiv: true }]
      : w.zwinkern && !freudeJetzt && !auftrittJetzt
        ? [{ bild: w.zwinkern, aktiv: zwinkertJetzt }]
        : undefined;

  // translateY der ganzen Figur, synchron zur Überblendung oben — siehe Konstanten-Kommentar.
  // Nur in diesem einen animierten Übergang gebraucht; in jedem anderen Fall bleibt der Wert
  // bei 0 und die Animated.View wirkt sich nicht aus.
  const hebung = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!(auftrittJetzt && auftrittAnimiert)) return;
    Animated.timing(hebung, {
      toValue: -AUFTRITT_HEBUNG_FRAKTION * breite,
      duration: AUFTRITT_UEBERBLENDUNG_MS,
      useNativeDriver: true,
    }).start();
    // breite ändert sich an keiner Aufrufstelle nach dem Mount — trotzdem in den Deps, falls
    // doch, damit die Zielhöhe nie stumm veraltet.
  }, [auftrittJetzt, auftrittAnimiert, breite, hebung]);

  return (
    <Animated.View style={auftrittJetzt && auftrittAnimiert ? { transform: [{ translateY: hebung }] } : undefined}>
      <ZustandsFigur
        leinwand={w.leinwand}
        figurBreite={breite}
        grund={freudeJetzt ? w.freude : auftrittJetzt && !auftrittAnimiert ? w.kopfHeben : w.grund}
        blinzeln={blinzeln && !freudeJetzt && !auftrittJetzt ? w.blinzeln : undefined}
        idle={blinzeln && !freudeJetzt && !auftrittJetzt}
        ebenen={ebenen}
      />
    </Animated.View>
  );
}
