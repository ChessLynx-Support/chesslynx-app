// Grundnavigation gemäß konzept/technisches_konzept.md Abschnitt 9, Schritt 1:
// "Grundnavigation (Elternbereich vs. Kindbereich) implementieren."
//
// Struktur: Die App startet immer im Kindbereich (kein Login nötig, um zu spielen —
// das Elternkonto wird nur für Fortschrittssync/Kauf gebraucht, nicht fürs Spielen
// selbst, siehe Design-Dokument "Einstieg so einfach wie möglich"). Der Elternbereich
// ist ausschließlich über einen dezenten Zugang + ParentGate erreichbar.
//
// Update (2026-09-06): `ParentDashboardPlaceholder` durch die vollständige
// ParentDashboard-Umsetzung (siehe screens/ParentDashboard.tsx) ersetzt — Inhalt und
// Aufbau folgen 1:1 dem geprüften Entwurf im Claude-Projekt "ChessLynx". Außerdem neu:
// die lokale, harte Zeitlimit-Sperre (siehe lib/zeitlimit.ts) ist jetzt in KidHome
// eingebunden — Details zur bewussten Scope-Grenze (noch nicht in den Quest-Screens
// selbst) siehe Kommentar dort.
//
// Update (2026-09-06, Schritt #74 "FreispielPartie", siehe projektwissen.md Kurzstatus
// für die vollständige Schritt-Tabelle #71–#77): `FreispielScreen` (die Übungslichtung-
// Liste, Schritt #73) und `FreispielPartie` (die eigentliche Spielansicht gegen den
// Bot, Schritt #74) sind ab jetzt als Routen registriert — beide waren zuvor gebaut,
// aber noch an keiner Stelle erreichbar. Bewusst NOCH KEIN Einstiegspunkt von KidHome
// aus (kein neuer Button/Kartenwegpunkt) — das ist Schritt #76 ("provisorische
// Navigation zum Freispiel-Screen"), ein eigener, separat zu bestätigender Schritt.
// Bis dahin ist `FreispielScreen` nur über `navigation.navigate("FreispielScreen")`
// aus dem Code heraus erreichbar (z. B. zu Testzwecken), nicht über die UI.

import { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, createNavigationContainerRef, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet, Platform, ScrollView, BackHandler, Pressable } from "react-native";
// Nutzer-Feedback 2026-09-09 (Android: Wasserzeichen/Elternbereich-Zugang lag in der
// Systemtasten-Leiste): `react-native-safe-area-context` war zwar bereits als
// Abhängigkeit installiert, aber im ganzen Projekt nirgends tatsächlich verdrahtet —
// überall wurde stattdessen das aus "react-native" importierte, mittlerweile
// deprecated `SafeAreaView` genutzt, das auf Android schon immer ein reines No-op war
// (keine Innenabstände für Status-/Navigationsleiste). Für die meisten Screens fiel das
// bisher nicht auf, weil ihr Inhalt nicht bis ganz an den unteren Bildschirmrand reicht
// — beim neuen, global unten rechts sitzenden BrandWatermark (siehe dortiger
// Bugfix-Kommentar) genau dort aber schon. `SafeAreaProvider` hier einmalig ganz oben
// im Baum ist Voraussetzung dafür, dass `useSafeAreaInsets()` in BrandWatermark.tsx
// funktioniert — reine Ergänzung, ändert am Verhalten des bisherigen
// "react-native"-SafeAreaView in allen anderen Screens nichts.
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ParentGate } from "../screens/ParentGate";
import { Credits } from "../screens/Credits";
import { ElternLogin } from "../screens/ElternLogin";
import { EmailBestaetigung } from "../screens/EmailBestaetigung";
import { ParentDashboard } from "../screens/ParentDashboard";
import { LuxSperre } from "../components/LuxSperre";
// Dezentes Marken-Wasserzeichen, immer oben rechts, auf jedem Bildschirm — siehe
// Rückfrage des Nutzers im Claude-Projekt "ChessLynx" ("Wasserzeichen ... um alle
// Designentwürfe in der App zu schützen"). Bewusst hier zentral montiert statt in jedem
// Screen einzeln, siehe components/BrandWatermark.tsx für die Details/Grenzen.
import { BrandWatermark } from "../components/BrandWatermark";
import { darfCloudNutzen, useAuthUser } from "../lib/auth";
import {
  getOrCreateAktivesKindId,
  holeVorgemerktenKindNickname,
  syncPendingBonusProgress,
  syncPendingProgress,
  vergesseVorgemerktenKindNickname,
} from "../lib/storage";
import { kindProfilPfad } from "../lib/firebase";
// Neu (2026-09-06): Sync des neuen Freispiel-Fortschritts (Übungslichtung, siehe
// endlosmodus_freispiel_konzept.md) — eigener Aufruf neben syncPendingProgress, damit
// beide Fortschrittsarten unabhängig voneinander fehlschlagen/erneut versucht werden
// können (siehe Kommentar in lib/freispielFortschritt.ts).
import { syncPendingFreispielFortschritt } from "../lib/freispielFortschritt";
import { useZeitlimitWaechter } from "../lib/zeitlimit";
import Quest1 from "../quest1/Quest1";
import Quest2 from "../quest2/Quest2";
import Quest3 from "../quest3/Quest3";
import Quest4 from "../quest4/Quest4";
import Quest5 from "../quest5/Quest5";
import Quest6 from "../quest6/Quest6";
// Erstes von vier Bonuskapiteln (siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "Fesselung"). Nachtrag 2026-09-17
// (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/schlossvorplatz_ruhmeshalle_kritik_
// 2026-09-16.md): läuft jetzt als "Erstlehre" im Adlerhorst-Revier (screens/Revier.tsx,
// lib/revierErstlehre.ts) statt in einer festen Schlossvorplatz-Kette — die vormalige
// Ketten-Navigation (Fesselung→Rochade→Figurenwert→MattIn2→Schlossvorplatz) ist entfallen,
// jedes Kapitel ist jetzt über einen `rueckkehrZiel`-Param (siehe dortiger Kommentar in den
// jeweiligen Dateien, Vorbild bonus/MattIn3.tsx) für sich stehend erreichbar.
import Fesselung from "../bonus/Fesselung";
import Rochade from "../bonus/Rochade";
import Figurenwert from "../bonus/Figurenwert";
import MattIn2 from "../bonus/MattIn2";
// Fünftes, optionales Bonuskapitel (siehe Claude-Projekt "ChessLynx",
// bonuskapitel_screen_skripte.md, Abschnitt "Matt in 3") — weiterhin kein Gate-Blocker,
// erreichbar über die Extra-Karte am Ende von Matt in 2 (siehe dortiger Kommentar).
import MattIn3 from "../bonus/MattIn3";
import FreispielScreen from "../screens/FreispielScreen";
import FreispielPartie from "../screens/FreispielPartie";
// Isolierter Rig-Renderer-Vorversuch, Schritt 2 der Grundgerüst-Integrationsplan-Liste
// (siehe priorisierter_umsetzungsplan.md) — nach demselben Muster wie seinerzeit
// FreispielScreen vor Schritt #76 registriert: bewusst kein Einstiegspunkt in der
// eigentlichen UI, nur als Route erreichbar. Siehe dev/RigRendererProbe.tsx für Zweck
// und Umfang. Schritt 2 ist abgeschlossen (initialRouteName steht wieder auf
// "KidHome") — dieser Import, der Stack.Screen-Eintrag unten und der
// RootStackParamList-Eintrag bleiben als bei Bedarf erreichbarer Testscreen stehen.
import RigRendererProbe from "../dev/RigRendererProbe";
// Isolierter Vorversuch für die "Verstecken"/"Landen"-Flugchoreografie aus dem
// Verschmelzungs-Konzept (siehe claude/konzept_screen0_verschmelzung_appstart.md im
// Claude-Projekt "ChessLynx", Nutzerwunsch "Bitte antesten, ich bin sehr gespannt!") —
// nach demselben Muster wie RigRendererProbe direkt darüber registriert: nur per
// navigation.navigate erreichbar, kein Einstiegspunkt in der echten UI. Siehe
// dev/WillkommensFlugProbe.tsx für Umfang und Zweck. Kann nach Abschluss des Vorversuchs
// folgenlos wieder entfernt werden.
import WillkommensFlugProbe from "../dev/WillkommensFlugProbe";
// Update (2026-09-09, Bau der echten Willkommens-Sequenz, siehe Claude-Projekt "ChessLynx",
// konzept_screen0_verschmelzung_appstart.md): `Onboarding.tsx` ist als Navigationsziel
// ersetzt durch `WillkommensSequenz.tsx` (siehe dortiger Datei-Kopfkommentar für den
// vollen Umfang — sie übernimmt sowohl Onboardings bisherige Begrüßung als auch die
// bisherige Quest-1-Screen-0-Tiervorstellung, jetzt deutlich ausgebaut um die bestätigte
// Verstecken/Landen-Flugchoreografie aus dev/WillkommensFlugProbe.tsx). `Onboarding.tsx`
// selbst bleibt unverändert im Repo (siehe Konzept Abschnitt 4: "kann vorerst
// unreferenziert bleiben"), ist ab jetzt aber an keiner Stelle mehr verlinkt.
import { WillkommensSequenz } from "../screens/WillkommensSequenz";
// Paket 3 (2026-09-11, Claude-Projekt "ChessLynx", umsetzungsplan_audit_punkte_2026-09-11.md):
// Bonuskapitel "Die ganze Partie" und der Schildkröten-Wegpunkt an der Steinbrücke
// (Übungslichtung). Einstieg ausschließlich über den neuen Kartenwegpunkt im Oberland der
// LuchsRevierKarte — schließt Freispiel-Schritt #76/#77 ("Navigation zum Freispiel-Screen").
import GanzePartie from "../bonus/GanzePartie";
import Steinbruecke from "../screens/Steinbruecke";
// Update-1-Vorzug (2026-09-15, siehe claude/update1_vorzug_plan_2026-09-15.md): erste echte
// Route für die Gefährten-Reviere — vorher gab es dafür überhaupt keinen Screen, nur den
// __DEV__-Vorschauschalter in LuchsRevierKarte.tsx. Ein gemeinsamer, generischer Screen für
// alle fünf Gefährten (siehe dortiger Datei-Kopfkommentar für den bewussten Funktionsumfang
// dieses ersten Schritts).
import Revier from "../screens/Revier";
import type { RevierParams } from "../screens/Revier";
// Update-1-Vorzug, Fortsetzung (2026-09-15, Christian: "Endlosmodus-Verdrahtung (27 fertige
// Stellungen) ... prüfen und ggf. aktualisieren"): Screen für eine einzelne Endlosmodus-
// Fokus-Spalte, aufgerufen aus Revier.tsx heraus — siehe dortiger Kommentar und
// lib/endlosmodusSpalten.ts für den vollen Stand (7 von 9 Spalten spielbar).
import EndlosmodusSpalte from "../screens/EndlosmodusSpalte";
import type { EndlosmodusSpalteParams } from "../screens/EndlosmodusSpalte";
// Update-1-Vorzug, Fortsetzung (2026-09-15): Wisent-Boss-Puzzle, das Pflicht-Herzstück des
// Wisent-Kampfs (siehe lib/chessEngine.ts/WISENT_BOSS_POSITION-Kommentar und
// claude/wisent_kampf_verdrahtung_2026-09-15.md).
import WisentKampf from "../screens/WisentKampf";
// Wisent-Kür-Runde (2026-09-15, siehe claude/wisent_kuer_verdrahtung_2026-09-15.md): die drei
// optionalen Kürs (Bauernumwandlung/En passant/Matt in 3 als Kür) sind jetzt verdrahtet, samt
// gemeinsamem Auswahl-Hub. Matt in 3 existierte als eigenes Bonuskapitel bereits (Import weiter
// oben), Umwandlung/EnPassant sind neu.
import Umwandlung from "../bonus/Umwandlung";
import EnPassant from "../bonus/EnPassant";
import WisentKuerHub from "../screens/WisentKuerHub";
// Wisent-Endspiel-Kür (2026-09-17, siehe claude/wisent_endspiel_kuer_kuratierung_2026-09-17.md):
// vierte, eigenständige Kür auf demselben Hub (WisentKuerHub.tsx) — echte Mattführung
// (Dame-Matt/Turm-Matt) gegen den Bot statt eines kurzen Rätsels.
import WisentEndspielKuer from "../bonus/WisentEndspielKuer";
// Ruhmeshalle-Grundgerüst (2026-09-15, Christian: "Wisent Kür, danach Ruhmeshalle
// Grundgerüst" — Wisent-Kür-Runde ist jetzt committed/getestet/gepusht, siehe
// claude/update1_vorzug_plan_2026-09-15.md Abschnitt 4, Punkt 9). Gemeinsame Galerie aller
// fünf Gefährten + Wisent-Sonderplatz, siehe screens/Ruhmeshalle.tsx für den vollen Umfang
// und die bewussten Auslassungen dieses ersten Schritts (keine Assets, keine Sprechzeile).
import Ruhmeshalle from "../screens/Ruhmeshalle";
// Motto-Moment-Grundverdrahtung (2026-09-18, siehe claude/motto_moment_freischaltung_
// entscheidung_2026-09-17.md): siebter Kartenpunkt, analog zum Burgtor-Ring, gesperrt bis
// `bonusFortschritt.wisentKampf === true`. Reiner Navigationsziel-Stub — der eigentliche
// Inhalt ist bewusst noch nicht gescopt, siehe screens/MottoMoment.tsx für die volle
// Begründung.
import MottoMoment from "../screens/MottoMoment";
// Ladebildschirm/Intro (Nutzerwunsch, siehe claude/lux_begruessungsvideo_freistellung_
// konzept.md, Abschnitt "Ladebildschirm") — läuft jetzt VOR der Willkommens-Sequenz, siehe
// screens/LadeBildschirm.tsx für die volle Begründung (Video 1 unverändert, Überblendung
// über die gemeinsame Hintergrundfarbe) UND für die neue Weiche zwischen Willkommens-
// Sequenz (erster Start) und direktem Sprung zu KidHome (jeder weitere Start), siehe
// dortiger Kommentar zu `hatWillkommenGesehen()`. Ab jetzt initialRouteName, siehe unten.
import { LadeBildschirm } from "../screens/LadeBildschirm";
// Update (2026-09-08, Nutzerwunsch "passt nun, bitte umsetzen und die Figuren entsprechend
// mit den Quests verlinken"): die 6 KidHome-Quest-Buttons (zuvor ChessLynxButton + BadgeRahmen
// + Flach-SVG-Tier-Icon aus lib/creatures.tsx, davor reiner Text) sind jetzt komplett durch die
// echte, interaktive Luchs-Revier-Kartenkomponente ersetzt — siehe components/LuchsRevierKarte.tsx
// für den vollen Hintergrund (Bildausschnitt-Herkunft, Design-Canvas-Abstimmung mit dem Nutzer,
// Zustands-/Textfrei-Prinzipien). Der bisherige 7. Button ("Zum Schlossvorplatz", KetteIcon) ist
// dort das Burgtor der Wisentfeste geworden — seit der Bonuskapitel→Gefährtensaga-Neuordnung
// (2026-09-17) führt dieser Ring zur Ruhmeshalle statt zum (entfallenen) Schlossvorplatz.tsx,
// siehe `onSelectRuhmeshalle`-Kommentar weiter unten.
import { LuchsRevierKarte, type QuestId } from "../components/LuchsRevierKarte";
// Sprach-Harmonie-Review (2026-09-09, siehe KidHome-Kommentar unten): KidHome bekommt
// jetzt eine eigene, kurze, wechselnde Begrüßung.
import { sprich } from "../lib/luxStimme";
import { luxVariante } from "../lib/luxVarianten";

export type RootStackParamList = {
  // Neu: erster Bildschirm der App (siehe initialRouteName unten).
  LadeBildschirm: undefined;
  // Update (2026-09-09): löst "Onboarding" als Navigationsziel ab, siehe Import-Kommentar
  // oben.
  WillkommensSequenz: undefined;
  // Update (2026-09-09, Sprach-Harmonie-Review, siehe KidHome-Kommentar unten):
  // `vonWillkommen` sagt KidHome, dass die WillkommensSequenz unmittelbar vorausging,
  // damit KidHome seine eigene Begrüßung in diesem einen Fall auslässt.
  KidHome: { vonWillkommen?: boolean } | undefined;
  Quest1: undefined;
  Quest2: undefined;
  Quest3: undefined;
  Quest4: undefined;
  Quest5: undefined;
  Quest6: undefined;
  // Nachtrag 2026-09-17 (siehe Import-Kommentar oben): alle vier Bonuskapitel bekommen
  // jetzt denselben optionalen `rueckkehrZiel`/`rueckkehrParams`-Parametersatz wie
  // MattIn3 seit der Wisent-Kür-Runde (2026-09-15) — Standard-Rücksprung ohne Params ist
  // "KidHome" (siehe jeweiliger Datei-Kommentar in bonus/*.tsx).
  Fesselung: { rueckkehrZiel?: keyof RootStackParamList; rueckkehrParams?: any } | undefined;
  Rochade: { rueckkehrZiel?: keyof RootStackParamList; rueckkehrParams?: any } | undefined;
  Figurenwert: { rueckkehrZiel?: keyof RootStackParamList; rueckkehrParams?: any } | undefined;
  MattIn2: { rueckkehrZiel?: keyof RootStackParamList; rueckkehrParams?: any } | undefined;
  // Fünftes, optionales Bonuskapitel (siehe Import-Kommentar oben). Ohne Angabe seit
  // 2026-09-17 Rücksprung zu "KidHome" (siehe bonus/MattIn3.tsx-Kommentar) — vorher
  // Schlossvorplatz, das mit der Bonuskapitel→Gefährtensaga-Neuordnung entfallen ist.
  MattIn3: { rueckkehrZiel?: keyof RootStackParamList; rueckkehrParams?: any } | undefined;
  // Wisent-Kür-Runde (2026-09-15, siehe Import-Kommentar oben): keine Parameter, feste
  // Einzel-Screens genau wie WisentKampf.
  Umwandlung: undefined;
  EnPassant: undefined;
  WisentKuerHub: undefined;
  // Neu (Wisent-Endspiel-Kür, siehe Import-Kommentar oben): keine Parameter, feste
  // Einzel-Screens genau wie Umwandlung/EnPassant.
  WisentEndspielKuer: undefined;
  ParentGate: undefined;
  // Zwischenstopp nach dem Eltern-Gate: entscheidet anhand des Anmeldestatus, ob es
  // zu ElternLogin oder direkt zu ParentDashboard weitergeht (siehe
  // ElternBereichRouter unten). `kindNicknameFallsNeu` kommt nur aus dem
  // Registrieren-Formular in ElternLogin.tsx.
  ElternBereich: { kindNicknameFallsNeu?: string } | undefined;
  ElternLogin: undefined;
  // Paket 5: Double-Opt-In — angemeldet, E-Mail noch nicht bestätigt.
  EmailBestaetigung: undefined;
  ParentDashboard: undefined;
  Credits: undefined;
  // Neu (2026-09-06): Sperr-Bildschirm, wenn das tägliche Zeitlimit erreicht ist —
  // siehe lib/zeitlimit.ts (useZeitlimitWaechter) und components/LuxSperre.tsx.
  ZeitlimitSperre: undefined;
  // Neu (2026-09-06, Schritt #73/#74): die Freispiel-Übungslichtung (Liste der 16
  // Bot-Stufen) und die eigentliche Partie-Ansicht. `neuFreigeschaltetElo` wird von
  // FreispielPartie beim Zurücknavigieren nach einem Sieg gesetzt (löst die
  // Freischalt-Feier-Animation in FreispielScreen aus, siehe dort).
  FreispielScreen: { neuFreigeschaltetElo?: number } | undefined;
  // Paket 3: `kapitel: "ganzePartie"` = Screen 5 des Kapitels (Partie gegen die Schildkröte,
  // Hinweise immer an, Rückweg zum Kapitel-Abschluss statt zur Bot-Liste).
  FreispielPartie: { elo: number; kapitel?: "ganzePartie" };
  // Paket 3: Bonuskapitel "Die ganze Partie" (`abschluss: true` = Rückkehr aus der Partie).
  GanzePartie: { abschluss?: boolean } | undefined;
  // Paket 3: Schildkröten-Wegpunkt (Bots/Puzzles-Wahl). `nachKapitel` = direkt aus dem
  // Kapitel-Abschluss kommend (erste Begrüßung statt Wiederkehr-Zeile).
  Steinbruecke: { nachKapitel?: boolean } | undefined;
  // Update-1-Vorzug (2026-09-15, siehe Import-Kommentar oben): Gefährten-Revier, generisch
  // für alle fünf. `gefaehrteId` sagt, welcher Gefährte/welches Revier gezeigt wird.
  Revier: RevierParams;
  // Update-1-Vorzug, Fortsetzung (2026-09-15, siehe Import-Kommentar oben): eine einzelne
  // Endlosmodus-Fokus-Spalte innerhalb eines Reviers.
  EndlosmodusSpalte: EndlosmodusSpalteParams;
  // Update-1-Vorzug, Fortsetzung (2026-09-15, siehe Import-Kommentar oben): keine Parameter,
  // genau wie Steinbruecke — ein fester Einzel-Screen.
  WisentKampf: undefined;
  // Ruhmeshalle-Grundgerüst (2026-09-15, siehe Import-Kommentar oben): keine Parameter, genau
  // wie WisentKampf — ein fester Einzel-Screen. Erreichbar über den Burgtor-Ring an der
  // Wisentfeste (siehe components/LuchsRevierKarte.tsx, `onSelectRuhmeshalle`), gesperrt bis
  // Eichhörnchen ≥ 1 Stern (Nachtrag 2026-09-17).
  Ruhmeshalle: undefined;
  // Motto-Moment-Grundverdrahtung (2026-09-18, siehe Import-Kommentar oben): keine Parameter,
  // genau wie Ruhmeshalle — ein fester Einzel-Screen. Erreichbar über den siebten Kartenpunkt
  // an der Wisentfeste (siehe components/LuchsRevierKarte.tsx, `onSelectMottoMoment`),
  // gesperrt bis `bonusFortschritt.wisentKampf === true`.
  MottoMoment: undefined;
  // Nur für Schritt 2 (siehe Import-Kommentar oben) — wieder entfernen, sobald der
  // Vorversuch geprüft und abgeschlossen ist.
  RigProbe: undefined;
  // Nur für den Willkommens-Flug-Vorversuch (siehe Import-Kommentar oben) — wieder
  // entfernen, sobald der Vorversuch geprüft und abgeschlossen ist.
  WillkommensFlugProbe: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Zuordnung von LuchsRevierKarte-QuestIds ("quest1"…, dieselben Ids wie in storage.ts/
// firebase.ts) zu den tatsächlichen RootNavigator-Routennamen ("Quest1"…).
const QUEST_ROUTEN: Record<QuestId, keyof RootStackParamList> = {
  quest1: "Quest1",
  quest2: "Quest2",
  quest3: "Quest3",
  quest4: "Quest4",
  quest5: "Quest5",
  quest6: "Quest6",
};

// Die echte Königreich-/Quest-Übersichtskarte ("Luchs-Revier") — siehe
// components/LuchsRevierKarte.tsx für Bildquelle, Positionierung und Zustands-/
// Textfrei-Prinzipien. Löst die bisherige Platzhalter-Buttonliste (davor: Übergangs-
// Saga-Kartenausschnitt + Schleier + Buttonliste, siehe Git-Historie dieser Datei) ab.
// Sprach-Harmonie-Review (2026-09-09, siehe KidHome-Kommentar unten und
// lib/luxVarianten.ts für die Begründung des Rotations-Mechanismus).
const KIDHOME_BEGRUESSUNG_VARIANTEN = [
  "Welches Abenteuer schauen wir uns heute an?",
  "Dein Waldrevier wartet auf dich!",
  "Wohin geht's als Nächstes?",
];

function KidHome({ navigation, route }: any) {
  // Prüft beim Öffnen sofort, ob das Tageslimit schon erreicht ist, und verbucht
  // danach in regelmäßigen Abständen weiter, solange dieser Screen sichtbar ist (siehe
  // lib/zeitlimit.ts). Bewusste Scope-Grenze dieses Umsetzungsschritts: die einzelnen
  // Quest-Screens (Quest1–6) rufen diesen Hook noch nicht auf — dort verbrachte Zeit
  // wird aktuell nicht mitgezählt. Das Nachrüsten ist dank dieses Hooks pro Screen nur
  // noch eine Zeile (`useZeitlimitWaechter(() => navigation.replace("ZeitlimitSperre"))`),
  // aber als eigener, in sich abgeschlossener Folgeschritt zurückgestellt.
  useZeitlimitWaechter(() => navigation.replace("ZeitlimitSperre"));

  // Nachtrag 2026-09-17 (Bonuskapitel→Gefährtensaga-Neuordnung, siehe claude/
  // schlossvorplatz_ruhmeshalle_kritik_2026-09-16.md): der bisher hier stehende, bewusst
  // provisorische bildschirmfixierte Ruhmeshalle-Zugangsknopf ("Ruhmeshalle-Grundgerüst",
  // 2026-09-15) ist entfallen — die Ruhmeshalle hat jetzt einen echten Kartenzugang über
  // den bereits pixelgenau eingemessenen Burgtor-Ring an der Wisentfeste (Segment 10/11,
  // siehe components/LuchsRevierKarte.tsx, `onSelectRuhmeshalle`), gesperrt bis Eichhörnchen
  // ≥ 1 Stern. Kein zweiter, redundanter Zugang mehr nötig.

  // Sprach-Harmonie-Review (2026-09-09, Nutzerauftrag "Die Sprachführung soll die Kinder
  // wirklich an die Hand nehmen, aber zugleich nicht störend wirken"): bestätigter
  // Befund — diese Karte, der zentrale Anlaufpunkt zwischen allen sechs Waldabenteuern,
  // hatte bis dahin ÜBERHAUPT keine gesprochene Führung, obwohl jeder Screen davor und
  // danach durchgehend spricht. Kurze, zwischen drei Varianten rotierende Begrüßung bei
  // jedem (Wieder-)Betreten dieser Karte (siehe lib/luxVarianten.ts) — `useFocusEffect`
  // statt `useEffect`, da KidHome beim Hineinnavigieren in ein Abenteuer NICHT unmountet
  // (React-Navigation-Stack) und beim Zurückkommen sonst keine neue Sprechzeile ausgelöst
  // würde. Ausnahme: unmittelbar nach der ausführlichen WillkommensSequenz
  // (`route.params?.vonWillkommen`, siehe dortiger Aufrufstellen-Kommentar) bleibt Lux
  // hier bewusst still — sie hat gerade erst "Auf geht's!" gesagt, eine weitere
  // Begrüßung im selben Moment wäre genau die Art Doppelung, die "nicht störend wirken"
  // vermeiden soll.
  // Wichtig: `ersterFokus` statt direkt `route.params.vonWillkommen` zu prüfen —
  // `navigation.navigate("KidHome")` aus den Quest-Screens (kein neuer Parameter) behält
  // beim Zurückkehren zu dieser bereits gemounteten Instanz denselben, alten
  // route.params-Wert bei; ohne diesen Ref würde Lux nach der allerersten
  // WillkommensSequenz NIE MEHR begrüßen, statt nur dieses eine Mal.
  const ersterFokus = useRef(true);

  // Paket 3 (2026-09-11, "Karte nach oben erweitern"): KidHome scrollt jetzt vertikal, weil
  // über der bisherigen Karte das Oberland mit der Steinbrücke liegt. Damit sich für alle
  // bisherigen Abläufe (v. a. die Landeanimation der WillkommensSequenz, die exakt auf die
  // Wegmarken-Koordinaten zielt) nichts verschiebt, steht die bisherige Karte beim Öffnen
  // pixelgenau dort, wo sie vorher stand:
  //   Inhalt = [Polster P][Oberland O][Karte K][Polster P], P = max(0, (Sichthöhe − K) / 2)
  //   Start-Scrollposition = O + max(0, (K − Sichthöhe) / 2)
  // (vorher: Karte per justifyContent:"center" mittig, bei Überhöhe oben/unten gleich weit
  // abgeschnitten — genau das ergibt diese Rechnung.)
  const scrollRef = useRef<ScrollView>(null);
  const [sichtHoehe, setSichtHoehe] = useState(0);
  // Gerätetest 2026-09-11 (Bugfix): Kartenbreite = Breite dieses bildschirmfüllenden Rahmens,
  // an LuchsRevierKarte durchgereicht (siehe dortiger Kommentar bei `breiteVorgabe`).
  const [sichtBreite, setSichtBreite] = useState(0);
  const [kartenHoehen, setKartenHoehen] = useState<{ oberland: number; karte: number } | null>(null);
  const startPositionGesetzt = useRef(false);
  const [bereit, setBereit] = useState(false);
  const polster = kartenHoehen ? Math.max(0, (sichtHoehe - kartenHoehen.karte) / 2) : 0;
  const startY = kartenHoehen ? kartenHoehen.oberland + Math.max(0, (kartenHoehen.karte - sichtHoehe) / 2) : 0;
  useEffect(() => {
    if (startPositionGesetzt.current || !kartenHoehen || sichtHoehe <= 0) return;
    startPositionGesetzt.current = true;
    // Einen Frame warten, bis das neue Polster nativ gelayoutet ist — sonst würde Android
    // die Scrollposition auf die alte (kleinere) Inhaltshöhe begrenzen.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: startY, animated: false });
      requestAnimationFrame(() => setBereit(true));
    });
  }, [kartenHoehen, sichtHoehe, startY]);
  // Wartet die Schildkröte (Schlosstor gerade offen, Kapitel noch nicht gespielt), scrollt
  // die Karte nach einem Moment sanft nach oben, damit das Kind den neuen Wegpunkt sieht.
  const zeigeSteinbruecke = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 900);
  }, []);
  useFocusEffect(
    useCallback(() => {
      const warErsterFokus = ersterFokus.current;
      ersterFokus.current = false;
      if (warErsterFokus && route?.params?.vonWillkommen) return;
      sprich(luxVariante(KIDHOME_BEGRUESSUNG_VARIANTEN, "kidhome-begruessung"));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Update (2026-09-09, Nutzerwunsch): der bisher hier eigens platzierte, bewusst fast
  // unsichtbare Eltern-Bereich-Zugang (ein einzelnes "·", nur auf KidHome) entfällt —
  // siehe Kommentar bei BrandWatermark unten. Das global sichtbare Wasserzeichen (jetzt
  // unten rechts, siehe components/BrandWatermark.tsx) übernimmt diese Rolle stattdessen
  // auf JEDEM Screen, nicht mehr nur auf KidHome, wodurch der Eltern-Bereich konsistent
  // von überall aus erreichbar ist statt nur von einer Stelle, an der er zufällig schon
  // stand.
  return (
    <View
      style={styles.kidHomeRoot}
      onLayout={(e) => {
        setSichtHoehe(e.nativeEvent.layout.height);
        setSichtBreite(e.nativeEvent.layout.width);
      }}
    >
      <ScrollView
        ref={scrollRef}
        // Bis die Start-Position gesetzt ist, unsichtbar — sonst blitzt beim Öffnen kurz das
        // Oberland (Scrollposition 0) auf, bevor die Karte an ihre gewohnte Stelle springt.
        style={[styles.kidHomeScroll, { opacity: bereit ? 1 : 0 }]}
        contentContainerStyle={{ paddingVertical: polster }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <LuchsRevierKarte
          onSelectQuest={(quest) => navigation.navigate(QUEST_ROUTEN[quest])}
          onSelectRuhmeshalle={() => navigation.navigate("Ruhmeshalle")}
          onSelectSteinbruecke={() => navigation.navigate("Steinbruecke")}
          onSelectGefaehrte={(gefaehrteId) => navigation.navigate("Revier", { gefaehrteId })}
          // Wisent-Kür-Runde (2026-09-15): führt jetzt zum Kür-Auswahl-Hub statt direkt zum
          // Boss-Puzzle (siehe screens/WisentKuerHub.tsx) — "weiter zum Wisent" bleibt von
          // dort aus ein eigener, jederzeit verfügbarer Tipp.
          onSelectWisent={() => navigation.navigate("WisentKuerHub")}
          // Motto-Moment-Grundverdrahtung (2026-09-18, siehe Import-Kommentar oben): führt zum
          // noch leeren Platzhalter-Screen, siehe screens/MottoMoment.tsx.
          onSelectMottoMoment={() => navigation.navigate("MottoMoment")}
          onHoehen={setKartenHoehen}
          onSteinbrueckeWartet={zeigeSteinbruecke}
          breiteVorgabe={sichtBreite}
        />
      </ScrollView>
    </View>
  );
}

// Sperr-Bildschirm, wenn das Tageslimit erreicht ist (siehe lib/zeitlimit.ts und
// components/LuxSperre.tsx) — "Ein Elternteil holen" führt direkt ins Eltern-Gate,
// danach (bei erfolgreicher Freigabe) automatisch weiter ins Eltern-Dashboard, wo das
// Limit verlängert werden kann (kürzester Weg zur Verlängerung, siehe Entwurf).
function ZeitlimitSperreScreen({ navigation }: any) {
  return <LuxSperre aufElternteilHolen={() => navigation.navigate("ParentGate")} />;
}

// Testmodus-Bypass (Claude-Projekt "ChessLynx", 2026-09-09, ausdrücklicher Nutzerwunsch):
// das Eltern-Gate (Halten+Wischen+Rechenaufgabe, siehe ParentGate.tsx) funktioniert
// einwandfrei, kostet beim wiederholten manuellen Durchtesten der übrigen neuen Funktionen
// aber jedes Mal Zeit. Bewusst über `__DEV__` realisiert (gleiches Muster wie der
// Testmodus-Abschnitt in ParentDashboard.tsx) statt eines eigenen Schalters/Flags — dadurch
// ist das Gate in jedem Produktions-/Store-Build automatisch wieder scharf geschaltet, ohne
// dass diese Stelle vor dem Launch manuell zurückgebaut werden müsste. `ParentGate.tsx`
// selbst bleibt dabei komplett unverändert. Vor dem Launch soll das echte Gate laut Nutzer
// nochmal gezielt durchgetestet werden — dafür genügt ein Release-/Non-Dev-Build.
function ParentGateScreen({ navigation }: any) {
  useEffect(() => {
    if (__DEV__) navigation.replace("ElternBereich");
  }, [navigation]);
  if (__DEV__) return null;
  return <ParentGate onUnlocked={() => navigation.replace("ElternBereich")} />;
}

// Zwischenstopp zwischen Eltern-Gate und Eltern-Dashboard: wartet kurz auf den
// initialen Anmeldestatus (siehe useAuthUser in auth.ts), leitet dann entweder zu
// ElternLogin (kein Elternkonto angemeldet) oder — nach dem Sicherstellen des aktiven
// Kinderprofils und dem Abgleich ausstehenden Fortschritts, siehe storage.ts — direkt
// zum Eltern-Dashboard weiter. Genau der in technisches_konzept.md Abschnitt 4
// vorgesehene Zeitpunkt ("nur das Eltern-Dashboard und der initiale Konto-Login
// benötigen zwingend eine Verbindung").
function ElternBereichRouter({ navigation, route }: any) {
  const { loading, user } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigation.replace("ElternLogin");
      return;
    }
    // Paket 5 (Double-Opt-In, COPPA „Email plus“): ohne bestätigte E-Mail kein Kinderprofil
    // in der Cloud, kein Sync — erst der Bestätigungs-Screen.
    if (!darfCloudNutzen(user)) {
      navigation.replace("EmailBestaetigung");
      return;
    }
    let abgebrochen = false;
    (async () => {
      try {
        const nickname = route?.params?.kindNicknameFallsNeu || (await holeVorgemerktenKindNickname());
        const kindId = await getOrCreateAktivesKindId(user.uid, nickname);
        await vergesseVorgemerktenKindNickname();
        await syncPendingProgress(kindProfilPfad(user.uid, kindId));
        await syncPendingFreispielFortschritt(kindProfilPfad(user.uid, kindId));
        await syncPendingBonusProgress(kindProfilPfad(user.uid, kindId));
      } catch (fehler) {
        // Sync-Fehler blockieren den Dashboard-Zugang bewusst nicht (Offline-first-
        // Prinzip, siehe technisches_konzept.md Abschnitt 4) — beim nächsten
        // Verbindungsaufbau wird automatisch erneut versucht (Warteschlange bleibt
        // erhalten, siehe syncPendingProgress in storage.ts).
        console.warn("Firestore-Sync beim Öffnen des Eltern-Bereichs fehlgeschlagen:", fehler);
      }
      if (!abgebrochen) navigation.replace("ParentDashboard");
    })();
    return () => {
      abgebrochen = true;
    };
  }, [loading, user]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color="#8FA888" />
    </View>
  );
}

// Web-Vorschau (Nutzer-Feedback 2026-09-08: "Bildschirm auf ein Standard-Handyformat
// (ca. 6 Zoll) bringen, damit er nicht so verschoben wirkt"): im Browser liefert
// Dimensions.get("window") die tatsächliche, oft sehr breite BROWSERFENSTER-Breite — die
// App (komplett für Handy-Bildschirme gebaut) hing dort bisher als kleiner Block in einer
// riesigen, ungenutzten Fläche. `HANDY_MAX_BREITE` deckelt die sichtbare Breite auf der
// Web-Vorschau auf eine gängige Handybreite; 430 deckt praktisch die gesamte Bandbreite
// heutiger ~6″-Geräte ab (z. B. iPhone 14 Pro Max 430pt, iPhone 14 390pt, Pixel/Galaxy-
// Klasse ~360–412dp) — bei einem schmaleren Browserfenster schrumpft der Rahmen (siehe
// `width: "100%"` unten) responsiv mit, bei einem breiteren bleibt er bei diesem Deckel
// stehen, statt unbegrenzt zu wachsen. Rein kosmetisch für Web/Testen; auf nativen
// Plattformen (iOS/Android) exakt dasselbe `{flex:1}` wie zuvor, ohne jede Wirkung, da
// dort das Gerät selbst bereits die Handybreite vorgibt. Board.tsx (siehe dortiger
// Kommentar) misst seine verfügbare Breite jetzt ohnehin per onLayout statt über
// Dimensions.get("window") und füllt dadurch innerhalb dieses Rahmens automatisch fast
// die gesamte Breite, statt winzig in einem breiten Browserfenster zu wirken.
const HANDY_MAX_BREITE = 430;

// Update (2026-09-09, Nutzerwunsch): das Wasserzeichen (siehe components/BrandWatermark.tsx,
// jetzt unten rechts statt oben rechts) übernimmt jetzt zusätzlich die Rolle des bisher
// separaten, nur auf KidHome sitzenden "·"-Eltern-Zugangs (siehe Kommentar dort und bei
// KidHome oben) — global auf jedem Screen antippbar, nicht mehr nur auf einem. Da
// BrandWatermark als Geschwister-Element AUSSERHALB von <NavigationContainer> sitzt (siehe
// Kommentar an dessen Aufrufstelle unten), hat es keinen eigenen `navigation`-Prop aus dem
// React-Navigation-Kontext zur Verfügung — der Standard-Weg dafür ist eine
// `NavigationContainerRef`, hier direkt mit `RootStackParamList` typisiert, damit
// `navigate("ParentGate")` unten typsicher bleibt.
const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Gerätetest 2026-09-11 (Nutzerwunsch "Maus zurück geht zurück zur Saga-Karte … oder
// Zurück-Button am Handy"): aus allen Kinder-Screens (Quests, Bonuskapitel, Steinbrücke,
// Kapitel „Die ganze Partie", Übungslichtung) führt „Zurück" direkt zur Karte —
// auch wenn der Screen aus dem Eltern-Testmodus geöffnet wurde. Android: Hardware-Zurück.
// Web-Vorschau: Browser-/Maus-Zurück (über einen eigenen Verlaufseintrag, damit die Seite
// dabei nicht verlassen wird). Überall sonst (Eltern-Bereich, Freispiel-Partie → Liste)
// bleibt das normale Zurück.
const ZURUECK_ZUR_KARTE = new Set<string>([
  "Quest1",
  "Quest2",
  "Quest3",
  "Quest4",
  "Quest5",
  "Quest6",
  "Fesselung",
  "Rochade",
  "Figurenwert",
  "MattIn2",
  "MattIn3",
  "Steinbruecke",
  "GanzePartie",
  "FreispielScreen",
  "Revier",
  "EndlosmodusSpalte",
  "WisentKampf",
  "WisentKuerHub",
  "Umwandlung",
  "EnPassant",
  "WisentEndspielKuer",
  "Ruhmeshalle",
  "MottoMoment",
]);

function zurueckZurKarte(): boolean {
  if (!navigationRef.isReady()) return false;
  const aktuell = navigationRef.getCurrentRoute()?.name;
  if (!aktuell || !ZURUECK_ZUR_KARTE.has(aktuell)) return false;
  navigationRef.navigate("KidHome");
  return true;
}

export function RootNavigator() {
  useEffect(() => {
    if (Platform.OS === "android") {
      const abo = BackHandler.addEventListener("hardwareBackPress", zurueckZurKarte);
      return () => abo.remove();
    }
    // `globalThis.window` statt `window`, damit die Datei auch ohne DOM-Typen übersetzt.
    const w: any = Platform.OS === "web" ? (globalThis as any).window : undefined;
    if (w?.history && w.addEventListener) {
      // Gerätetest 2026-09-11 ("Maus zurück funktioniert nicht"): Chrome überspringt beim
      // Zurück Verlaufseinträge, die ohne Nutzerinteraktion angelegt wurden — der Eintrag beim
      // Start war deshalb wirkungslos. Jetzt: (1) die Maus-Zurück-Taste (button 3) wird direkt
      // abgefangen und die Browser-Navigation verhindert; (2) der eigene Verlaufseintrag wird
      // erst beim ersten Antippen/Klicken angelegt, damit auch die Browser-Zurück-Schaltfläche
      // in der App bleibt.
      let zuletztPerMaus = 0;
      const zurueck = () => {
        if (!zurueckZurKarte() && navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
      };
      const beiMaus = (e: any) => {
        if (e.button !== 3) return;
        e.preventDefault?.();
        zuletztPerMaus = Date.now();
        zurueck();
      };
      const blockiereMausZurueck = (e: any) => {
        if (e.button === 3 || e.button === 4) e.preventDefault?.();
      };
      let eintragAngelegt = false;
      const ersteInteraktion = () => {
        if (eintragAngelegt) return;
        eintragAngelegt = true;
        w.history.pushState({ chesslynx: true }, "");
      };
      const beiZurueck = () => {
        w.history.pushState({ chesslynx: true }, "");
        if (Date.now() - zuletztPerMaus < 800) return; // schon über die Maustaste erledigt
        zurueck();
      };
      w.addEventListener("mouseup", beiMaus);
      w.addEventListener("mousedown", blockiereMausZurueck);
      w.addEventListener("pointerdown", ersteInteraktion);
      w.addEventListener("popstate", beiZurueck);
      return () => {
        w.removeEventListener("mouseup", beiMaus);
        w.removeEventListener("mousedown", blockiereMausZurueck);
        w.removeEventListener("pointerdown", ersteInteraktion);
        w.removeEventListener("popstate", beiZurueck);
      };
    }
    return undefined;
  }, []);

  return (
    // `webHintergrund`/`appRoot` sind auf nativen Plattformen wirkungslose Aliase von
    // `{flex:1}` (siehe Kommentar oben) — `styles.appRoot` gibt BrandWatermark weiterhin
    // einen gemeinsamen, garantiert bildschirmfüllenden (bzw. auf Web: rahmenfüllenden)
    // Bezugsrahmen für seine absolute Positionierung — ohne diesen Wrapper wäre "oben
    // rechts" nicht zuverlässig relativ zum ganzen Bildschirm/Rahmen.
    <View style={styles.webHintergrund}>
      <View style={styles.appRoot}>
        {/* SafeAreaProvider s. Import-Kommentar oben — muss den Baum umschließen, aus dem
            heraus BrandWatermark unten `useSafeAreaInsets()` aufruft. */}
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
            screenOptions={{ headerShown: false }}
            // Update (Onboarding/Splash-Screen, priorisierter_umsetzungsplan.md Phase 3):
            // Startbildschirm war "Onboarding" statt "KidHome". Der Rig-Renderer-Probe-
            // Screen bleibt unverändert nur über navigation.navigate("RigProbe") aus dem
            // Code heraus erreichbar.
            //
            // Diagnose abgeschlossen (2026-09-08): auf "RigProbe" rendert dieselbe
            // Igel-Grafik einwandfrei — das Problem liegt also in der Brett-Zellstruktur
            // selbst (siehe Board.tsx/LeeresBrettMitAllenTieren.tsx, dortiger
            // overflow:hidden-Test), nicht an Image/PNG grundsätzlich.
            //
            // Update (Nutzerwunsch, siehe claude/lux_begruessungsvideo_freistellung_
            // konzept.md, Abschnitt "Ladebildschirm"): "LadeBildschirm" (Video 1
            // unverändert) läuft jetzt VOR der Willkommens-Sequenz und ist der neue
            // initialRouteName — siehe screens/LadeBildschirm.tsx.
            //
            // Update (2026-09-09, Willkommens-Flug-Vorversuch): initialRouteName war
            // vorübergehend auf "WillkommensFlugProbe" gesetzt (siehe Git-Historie), damit
            // der Vorversuch direkt beim App-Start sichtbar war — Christians Rückmeldung
            // dazu war durchweg positiv ("Super Arbeit!"), der Vorversuch ist damit
            // bestätigt. Der Probe-Screen bleibt unverändert über
            // navigation.navigate("WillkommensFlugProbe") erreichbar, falls die
            // Flug-Choreografie noch einmal einzeln angesehen werden soll.
            //
            // Update (2026-09-09, Bau der echten Willkommens-Sequenz, siehe Import-
            // Kommentar oben): "Onboarding" ist als Ziel von "LadeBildschirm" durch
            // "WillkommensSequenz" ersetzt — `initialRouteName` selbst bleibt unverändert
            // "LadeBildschirm" (der lädt/entscheidet weiterhin per hatWillkommenGesehen()
            // zwischen "WillkommensSequenz" und "KidHome", siehe screens/
            // LadeBildschirm.tsx).
            initialRouteName="LadeBildschirm"
          >
            <Stack.Screen name="LadeBildschirm" component={LadeBildschirm} />
            <Stack.Screen name="WillkommensSequenz" component={WillkommensSequenz} />
            <Stack.Screen name="RigProbe" component={RigRendererProbe} />
            <Stack.Screen name="WillkommensFlugProbe" component={WillkommensFlugProbe} />
            <Stack.Screen name="KidHome" component={KidHome} />
            <Stack.Screen name="Quest1" component={Quest1} />
            <Stack.Screen name="Quest2" component={Quest2} />
            <Stack.Screen name="Quest3" component={Quest3} />
            <Stack.Screen name="Quest4" component={Quest4} />
            <Stack.Screen name="Quest5" component={Quest5} />
            <Stack.Screen name="Quest6" component={Quest6} />
            <Stack.Screen name="Fesselung" component={Fesselung} />
            <Stack.Screen name="Rochade" component={Rochade} />
            <Stack.Screen name="Figurenwert" component={Figurenwert} />
            <Stack.Screen name="MattIn2" component={MattIn2} />
            <Stack.Screen name="MattIn3" component={MattIn3} />
            <Stack.Screen name="ParentGate" component={ParentGateScreen} />
            <Stack.Screen name="ElternBereich" component={ElternBereichRouter} />
            <Stack.Screen name="ElternLogin" component={ElternLogin} />
            <Stack.Screen name="EmailBestaetigung" component={EmailBestaetigung} />
            <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
            <Stack.Screen name="Credits" component={Credits} />
            <Stack.Screen name="ZeitlimitSperre" component={ZeitlimitSperreScreen} />
            <Stack.Screen name="FreispielScreen" component={FreispielScreen} />
            <Stack.Screen name="FreispielPartie" component={FreispielPartie} />
            <Stack.Screen name="GanzePartie" component={GanzePartie} />
            <Stack.Screen name="Steinbruecke" component={Steinbruecke} />
            <Stack.Screen name="Revier" component={Revier} />
            <Stack.Screen name="EndlosmodusSpalte" component={EndlosmodusSpalte} />
            <Stack.Screen name="WisentKampf" component={WisentKampf} />
            <Stack.Screen name="WisentKuerHub" component={WisentKuerHub} />
            <Stack.Screen name="Umwandlung" component={Umwandlung} />
            <Stack.Screen name="EnPassant" component={EnPassant} />
            <Stack.Screen name="WisentEndspielKuer" component={WisentEndspielKuer} />
            <Stack.Screen name="Ruhmeshalle" component={Ruhmeshalle} />
            <Stack.Screen name="MottoMoment" component={MottoMoment} />
            </Stack.Navigator>
          </NavigationContainer>
          <BrandWatermark
            onPress={() => {
              if (navigationRef.isReady()) navigationRef.navigate("ParentGate");
            }}
          />
        </SafeAreaProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webHintergrund:
    Platform.OS === "web"
      ? { flex: 1, alignItems: "center", backgroundColor: "#DED3BC" }
      : { flex: 1 },
  appRoot:
    Platform.OS === "web"
      ? {
          flex: 1,
          width: "100%",
          maxWidth: HANDY_MAX_BREITE,
          backgroundColor: "#F7F1E4",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
        }
      : { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F1E4" },
  // Rahmen für die LuchsRevierKarte — zentriert die Karte, falls sie (je nach
  // Bildschirmformat) nicht die volle Bildschirmhöhe füllt; Grünton als ruhiger
  // Übergang zur Kartenfarbgebung statt des sonstigen Creme-Hintergrunds.
  kidHomeRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#DCE7C8" },
  // Paket 3: volle Breite, damit LuchsRevierKarte (misst per onLayout) wie bisher die ganze
  // Bildschirmbreite bekommt.
  kidHomeScroll: { flex: 1, width: "100%" },
  // Update (2026-09-09): der frühere `parentLink`/`parentLinkText`-Stil (der einzelne "·"
  // auf KidHome) ist ersatzlos entfallen — siehe Kommentar bei KidHome oben und bei
  // BrandWatermark unten. Der eigentliche Kinder-Schutz kommt ohnehin weiterhin vom
  // ParentGate selbst (Halten+Wischen+Rechenaufgabe), nicht von der Unauffälligkeit des
  // Zugangs — das Wasserzeichen darf deshalb gefahrlos sichtbarer/globaler sein.
});
