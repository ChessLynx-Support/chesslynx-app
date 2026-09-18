// Nutzer-Feedback 2026-09-07 ("Hier sollte auch ein schöner Hintergrund genutzt werden.
// Zunächst diesen hier verwenden. Bis wir das generell oder ggf. sogar je Quest
// individualisieren"): der vom Nutzer bereitgestellte Wald-Lichtung-Entwurf zeigt ein
// eigenes, bereits gemaltes Schachbrett in der Bildmitte — direkt als Ganzes hinter das
// echte, interaktive Board.tsx gelegt, gäbe es zwei sich überlagernde Schachbretter.
// Deshalb hier auf die Wald-/Himmel-Kulisse oben und die Wiesen-/Steine-Kulisse unten
// zugeschnitten (der gemalte Brett-Bereich in der Bildmitte bewusst weggelassen), beide
// mit weichem Alpha-Verlauf zur Bildschirmmitte hin ausgeblendet (siehe
// waldkulisse_oben.png/waldkulisse_unten.png) — die eigentliche Übungsfläche (Board.tsx,
// Sprechblase, Lux-Ecke) sitzt dadurch unverändert auf dem bisherigen cremefarbenen
// Hintergrund (#F7F1E4, siehe styles.safe in den Quest*.tsx), umrahmt statt überdeckt.
// Setzt die bereits in checkliste_produktionsphasen.md (Abschnitt "L5") festgehaltene
// Entscheidung "Board-Kulisse = eine durchgängige Trainingslichtung" erstmals mit echter
// Illustration um, statt nur den Feld-Kacheln (tile_hell.png/tile_dunkel.png).
//
// Update (2026-09-08, Nutzerwunsch): Wie hier oben bereits vorgesehen, jetzt um eine
// `variante`-Prop erweitert — Quest1.tsx–Quest6.tsx übergeben ihre Quest-Nummer (1–6) und
// bekommen dadurch je einen eigenen Bildausschnitt statt der bisher für alle Quests
// identischen Kulisse. Aufrufstellen ohne `variante` (falls es je welche außerhalb der
// sechs Quests gibt) verhalten sich unverändert wie zuvor.
//
// Bildquelle der sechs Ausschnitte (Update 2026-09-08, DRITTE Iteration, Nutzerwunsch
// "Bitte folgende Datei als neue Saga Karte verwenden und neue Ausschnitte davon
// erstellen."): Achtung — die zweite Iteration (Kommentar-Historie s. Git) hatte
// versehentlich ein ANDERES, bereits im Chat-Verlauf vorhandenes Referenzbild verwendet
// ("Deine Schach-Saga" mit Text-Bannern und Tier-Medaillons) statt der tatsächlich vom
// Nutzer zu dieser Anfrage hochgeladenen Datei — vom Nutzer zu Recht als "falsche,
// veraltete Saga-Karte" zurückgewiesen. Jetzt korrigiert: Quelle ist die tatsächlich
// angehängte Illustration (reine Landschaft ohne Text/Medaillons — Goldpfad von einem
// Teich/Wiesental über mehrere Brücken, ein Baumhaus und ein Bauernhaus, vorbei an einem
// ersten Schloss samt Wasserfall, hinauf zu einem Gipfelschloss vor schneebedeckten
// Bergen). Ohne eingebaute Spielelemente ist die Zuordnung diesmal frei gewählt statt
// durch Medaillons vorgegeben: sechs Anker-Höhen wurden gleichmäßig vom untersten
// Teich (Quest 1, Start) bis zum ersten/unteren Schloss (Quest 6, "Wisentfeste"-
// Äquivalent) verteilt — das Gipfelschloss ganz oben bleibt bewusst jenseits von Quest 6
// (Bonus-/Endgame-Bereich). "oben" zeigt je den Kartenbereich OBERHALB des Ankers (weiter
// fortgeschritten), "unten" den Bereich UNTERHALB (Richtung Start) — beide je
// 750×477/750×257px, per Skript aus der Karte geschnitten und auf die App-Zielgröße
// reduziert. Weiterhin AUSDRÜCKLICH NUR ALS ÜBERGANGSLÖSUNG ("vorübergehend",
// Nutzerzitat), bis die in `produktionsplan_saga_karte_18_ansichten.md` (Claude-Projekt)
// geplanten 18 Einzelansichten produziert sind.
//
// Alpha-Verlauf (ebenfalls in dieser dritten Iteration korrigiert, Nutzer-Feedback
// "Ich will diesen weißen Bereich in der Mitte nicht haben!!!"): die vorige Fassung fadete
// über die GESAMTE innere Hälfte jedes Bildes aus (frac 0,5–1,0) — kombiniert mit der
// vorherigen 50%/50%-Bandhöhe (siehe styles-Kommentar unten) traf das dazu, dass GENAU in
// der Bildschirmmitte beide Bänder gleichzeitig bei Alpha 0 (voll durchsichtig) ankamen,
// also exakt dort der nackte cremefarbene App-Hintergrund durchschien — derselbe helle
// Balken wie beim allerersten Bugfix, nur diesmal durch den Alpha-Verlauf selbst erzeugt
// statt durch zu kurze Bänder. Jetzt fadet jedes Bild nur noch in seinen ÄUSSEREN 20%
// (oben: frac 0,8–1,0; unten: frac 0–0,2) — der Rest bleibt voll deckend. Zusammen mit der
// auf 65% erhöhten Bandhöhe (s. u.) überlappen sich beide Bänder in der Bildschirmmitte so
// weit, dass an JEDER Bildschirmposition mindestens eines der beiden Bilder noch voll
// deckend ist (rechnerisch geprüft) — kein Punkt mehr, an dem beide gleichzeitig
// durchsichtig sind.
//
// Rein dekorativ (`pointerEvents="none"`), liegt als absolut positionierter Rahmen HINTER
// dem eigentlichen Bildschirminhalt — bewusst als erstes Kind der jeweiligen
// SafeAreaView, damit spätere Geschwister-Elemente (Sprechblase, Board, Lux-Ecke) beim
// Stapeln automatisch darüber liegen.

import { View, Image, StyleSheet } from "react-native";

const obenStandard = require("../../assets/hintergrund/waldkulisse_oben.webp");
const untenStandard = require("../../assets/hintergrund/waldkulisse_unten.webp");

// Update (2026-09-09, Nutzerwunsch "auch alle anderen prüfen"): alle sechs Quest-Varianten
// (oben + unten) wurden aus dem später aufgetauchten, deutlich höher aufgelösten Master
// `davinci_enhancer_image_1788860236858.jpg` neu geschnitten und als WebP bei 2x Pixelgröße
// ausgeliefert (750×477px → 1500×954px bzw. 750×257px → 1500×514px) — der eingebaute
// Alpha-Verlauf (siehe Datei-Kommentar oben, Abschnitt "Alpha-Verlauf") wurde dabei aus den
// alten PNGs übernommen und auf die neue Höhe skaliert, da der JPG-Master selbst keinen
// Alphakanal hat. `waldkulisse_oben.png`/`waldkulisse_unten.png` (die generische
// Standard-Kulisse ohne `variante`-Prop) bleiben unverändert — Bildvergleich ergab, dass sie
// aus einer ANDEREN, nicht verwandten Illustration stammen und daher nicht aus diesem Master
// nachgeschärft werden können.
//
// Statische require()-Tabelle statt dynamischem Pfad — Metro/Expo muss jeden
// Bild-Import zur Bundle-Zeit auflösen können, ein zusammengesetzter Pfad
// (`` `...q${variante}.png` ``) funktioniert dafür nicht.
// (Die früheren Band-Paare OBEN_JE_QUEST/UNTEN_JE_QUEST — `waldkulisse_oben/unten_q1–q6.webp` —
// sind seit dem Gerätetest 2026-09-11 durch KULISSE_JE_QUEST unten ersetzt und nicht mehr
// eingebunden, damit sie nicht mehr ins App-Bundle wandern.)

// Gerätetest 2026-09-11 (Nutzer-Feedback: "verschobener Bildschirmausschnitt … kaputte Datei,
// kein echter Ausschnitt des Masters", betrifft fast jede Quest): die zwei überlappenden
// Bänder oben/unten mit Alpha-Verlauf ergaben in der Mitte eine Überblendung zweier
// verschiedener Kartenstellen (z. B. Quest 6: das Burgtor schimmert halbtransparent über den
// Weg). Die Quests zeigen jetzt je EINEN durchgehenden, echten Ausschnitt aus dem HQ-Saga-
// Master `davinci_enhancer_image_1788860236858.jpg` (1400×2940 HQ-px, auf 1024 px Breite
// gebracht), horizontal auf die Wegmarke der Quest zentriert (siehe WEGMARKEN in
// LuchsRevierKarte.tsx), die Wegmarke bei ca. 55 % der Höhe (Quest 1/2 am unteren Kartenrand
// entsprechend tiefer). Kein Verlauf, keine Überblendung. Die alten Band-Dateien
// `waldkulisse_oben/unten_q1–q6.webp` bleiben unbenutzt im Repo; ohne `variante` (Onboarding,
// Ruhmeshalle, Bonuskapitel …) bleibt die bisherige Standardkulisse unverändert.
const KULISSE_JE_QUEST: Record<number, ReturnType<typeof require>> = {
  1: require("../../assets/hintergrund/questkulisse_q1.webp"),
  2: require("../../assets/hintergrund/questkulisse_q2.webp"),
  3: require("../../assets/hintergrund/questkulisse_q3.webp"),
  4: require("../../assets/hintergrund/questkulisse_q4.webp"),
  5: require("../../assets/hintergrund/questkulisse_q5.webp"),
  6: require("../../assets/hintergrund/questkulisse_q6.webp"),
};

// Gerätetest 2026-09-13 (Nutzer: "alter Hintergrund in Szene 0"): Hier standen bis dahin
// zusätzlich `OBEN_Q1`/`UNTEN_Q1` und ein `baender`-Prop, das ausschließlich die
// Willkommens-Sequenz benutzte. Beides ist ersatzlos entfallen — die Sequenz zeigt jetzt
// dieselbe Vollflächen-Kulisse wie Quest 1 (Begründung ausführlich dort, im JSX-Kommentar
// über `<WaldHintergrund variante={1} />`). Damit gibt es nur noch zwei Fälle:
//   - mit `variante`: die hochkant erzeugte Quest-Kulisse aus KULISSE_JE_QUEST (neuer Master)
//   - ohne `variante`: die beiden Standard-Bänder unten (Bonuskapitel, Ruhmeshalle, Revier.tsx)
// OFFENER PUNKT: `waldkulisse_oben/unten.webp` (der Fall ohne `variante`) stammen weiterhin
// aus dem alten, helleren Karten-Master — dieselbe Stilabweichung, die in Szene 0 aufgefallen
// ist, wartet also noch in den sechs Bonuskapiteln und in der Ruhmeshalle. Sobald dafür
// eine hochkante Kulisse aus `luchsrevier_wisentfeste.webp` erzeugt ist, kann auch dieser
// Zweig auf ein einzelnes Vollflächenbild umgestellt und der Band-Code ganz entfallen.

export function WaldHintergrund({
  variante,
}: { variante?: 1 | 2 | 3 | 4 | 5 | 6 } = {}) {
  if (variante) {
    return (
      <View style={styles.wrap} collapsable={false} pointerEvents="none">
        <Image source={KULISSE_JE_QUEST[variante]} style={styles.ganz} resizeMode="cover" />
      </View>
    );
  }
  const oben = obenStandard;
  const unten = untenStandard;
  return (
    // Bugfix, fünfte Iteration (Nutzer-Feedback 2026-09-08, nach der vierten Iteration:
    // "jetzt heller Bereich unten, kein vollständiger Hintergrund" — die vierte Iteration
    // (zwei GETRENNTE, je absolut positionierte Wrapper als direkte JSX-Geschwister
    // innerhalb der SafeAreaView) hat das Problem NICHT gelöst, sondern nur verschoben:
    // vorher war WaldHintergrund aus Sicht von Quest1.tsx usw. genau EIN Geschwister-
    // Element (eine gemeinsame Wrapper-View) — mit der Aufteilung in zwei Fragmente wurde
    // daraus versehentlich ZWEI direkte Geschwister-Views in der SafeAreaView, und davon
    // rendert auf diesem Android-Gerät wieder nur das ERSTE zuverlässig (hier: "oben"),
    // exakt dasselbe Muster wie beim KidHome-Bug, nur eine Ebene weiter oben wieder
    // eingeführt. Jetzt zurück zu EINER gemeinsamen Wrapper-View (wie ursprünglich), die
    // beide Image-Elemente als direkte Kinder enthält — genau das Muster, das in
    // Board.tsx pro Zelle zuverlässig funktioniert (eine nicht wegoptimierbare Elternview
    // mit mehreren absolut positionierten Kindern direkt darin, nicht mehrere
    // eigenständige Elternviews nebeneinander). NEU dazugekommen (gegenüber der
    // ursprünglichen ersten Fassung) ist nur `collapsable={false}` auf dieser einen
    // Wrapper-View — die fehlte dort komplett und ist nach der Erkenntnis aus
    // LeeresBrettMitAllenTieren.tsx (siehe dortiger Kommentar: eine einfache `View` ohne
    // Touch-Handler kann von Androids View-Flattening wegoptimiert werden und dadurch die
    // Bezugsebene für `position:absolute`-Kinder verschieben) die naheliegende
    // Zusatzabsicherung.
    <View style={styles.wrap} collapsable={false} pointerEvents="none">
      <Image source={oben} style={styles.oben} resizeMode="cover" />
      <Image source={unten} style={styles.unten} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  ganz: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  // Bugfix, dritte Iteration (Nutzer-Feedback 2026-09-08, "Ich will diesen weißen Bereich
  // in der Mitte nicht haben!!!"): 50%/50% (vorige Fassung) reichte NICHT aus, weil sich
  // beide Bänder dabei exakt an der Bildschirmmitte trafen — dort, wo der eingebaute
  // Alpha-Verlauf beider Bilder gleichzeitig bei 0 ankam (siehe Datei-Kommentar oben,
  // Abschnitt "Alpha-Verlauf"). Jetzt je 65%, sodass sich beide Bänder in der mittleren
  // 30% der Bildschirmhöhe überlappen — kombiniert mit dem auf die äußeren 20% verkürzten
  // Alpha-Verlauf bleibt in dieser Überlappungszone immer mindestens ein Bild voll
  // deckend, der cremefarbene App-Hintergrund (#F7F1E4) scheint nirgendmehr durch. Bugfix
  // aus der vorigen Iteration weiterhin gültig: Board.tsx/die Sprechblase/Lux liegen als
  // spätere Geschwister-Elemente ohnehin bereits "vor" dieser Kulisse (siehe
  // Datei-Kommentar, "liegt ... HINTER dem eigentlichen Bildschirminhalt") — Schachbrett
  // und jede andere Interaktion laufen also unverändert ÜBER dem Bildausschnitt ab, nie
  // dahinter.
  oben: { position: "absolute", top: 0, left: 0, right: 0, height: "65%" },
  unten: { position: "absolute", bottom: 0, left: 0, right: 0, height: "65%" },
});
