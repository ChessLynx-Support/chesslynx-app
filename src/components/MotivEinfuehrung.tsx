// Die animierte Motiv-Einführung: ein Brett, Lux, und eine Zugfolge, die sie Schritt für
// Schritt erklärt.
//
// Hintergrund (Christian, 2026-09-19): „Das Standbild setzt voraus, dass das Kind in Ruhe die
// Themen durchklickt, das ist nicht immer der Fall. Eine vollständige Animation, umfassend von
// Lux erklärt und einleitend direkt auf das Wesentliche fokussiert."
//
// DER TAKT IST DER GANZE PUNKT: Jeder Animationsschritt startet, wenn die zugehörige
// Sprechzeile ZU ENDE GESPROCHEN ist (`useLuxSprechzeile`, siehe dortigen Kommentar zu
// `fertigGesprochen` und zur Engine-Abfrage). Es gibt keinen Tipp zum Weiterblättern. Ein
// Kind, das hektisch tippt, kann die Erklärung nicht überholen — genau das war der Grund,
// warum die Standbild-Variante verworfen wurde, und genau der manuelle Tipp-Skip, den der
// Audit vom 18.09. in acht Bonuskapiteln entfernt hat.
//
// ARBEITSTEILUNG: Diese Datei zeichnet. Sie entscheidet nichts. Welche Stellung in welchem
// Schritt steht, welche Figur sich bewegt und was der Blickfang umkreist, liegt vollständig in
// lib/motivEinfuehrungen.ts — einem reinen TS-Modul, das verify/test-motiv-einfuehrungen-
// logic.cjs wirklich ausführen und gegen chess.js prüfen kann. Eine RN-Komponente kann das
// nicht, deshalb steht hier bewusst so wenig wie möglich.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Board, type BoardConfig } from "../quest1/Board";
import { fromAlgebraic, type BoardSquare } from "../lib/chessEngine";
import { WaldHintergrund } from "./WaldHintergrund";
import { LuxSprechblase } from "./LuxSprechblase";
import { LuxEckIcon } from "../lib/luxAssets";
import { FarnZurueckIcon } from "../lib/freispielIcons";
import { useLuxSprechzeile } from "../lib/useLuxSprechzeile";
import { useUntertitelAktiv } from "../lib/untertitelEinstellung";
import { t } from "../lib/sprache";
import {
  BauerMasterIcon,
  BauerMasterDunkelIcon,
  TurmMasterIcon,
  TurmMasterDunkelIcon,
  LaeuferMasterIcon,
  LaeuferMasterDunkelIcon,
  SpringerMasterIcon,
  SpringerMasterDunkelIcon,
  DameMasterIcon,
  DameMasterDunkelIcon,
  KoenigMasterIcon,
  KoenigMasterDunkelIcon,
} from "../lib/pieceMasters";
import {
  MOTIV_EINFUEHRUNGEN,
  anzahlSchritte,
  animationNachSchritt,
  bildFuerSchritt,
  schritt,
  sprechSchluessel,
  type MotivId,
} from "../lib/motivEinfuehrungen";

/**
 * Algebraisches Feld ("e4") auf die Brettkoordinate {row, col}.
 *
 * motivEinfuehrungen.ts typisiert Felder bewusst als schlichten String — es darf chessEngine.ts
 * nicht importieren, sonst liesse es sich im Test nicht mehr laden (siehe dortigen
 * Kopfkommentar). Die Umrechnung passiert deshalb genau hier, an einer einzigen Stelle, statt
 * als verstreute Casts im ganzen Baum.
 */
function zuFeld(feld: string): BoardSquare {
  return fromAlgebraic(feld as Parameters<typeof fromAlgebraic>[0]);
}

/** Figurencode aus motivEinfuehrungen.ts ("wR", "bN", …) auf die Master-Illustration. */
function figurIcon(code: string) {
  switch (code) {
    case "wP": return <BauerMasterIcon />;
    case "bP": return <BauerMasterDunkelIcon />;
    case "wR": return <TurmMasterIcon />;
    case "bR": return <TurmMasterDunkelIcon />;
    case "wB": return <LaeuferMasterIcon />;
    case "bB": return <LaeuferMasterDunkelIcon />;
    case "wN": return <SpringerMasterIcon />;
    case "bN": return <SpringerMasterDunkelIcon />;
    case "wQ": return <DameMasterIcon />;
    case "bQ": return <DameMasterDunkelIcon />;
    case "wK": return <KoenigMasterIcon />;
    default: return <KoenigMasterDunkelIcon />;
  }
}

export type MotivEinfuehrungProps = {
  motivId: MotivId;
  /** Läuft, wenn die letzte Zeile gesprochen ist. Der Aufrufer merkt sich das Gesehen-haben. */
  onFertig: () => void;
  /** Zurück-Knopf. Bricht ab, ohne die Einführung als gesehen zu melden (siehe Store-Kommentar). */
  onAbbruch?: () => void;
};

export function MotivEinfuehrung({ motivId, onFertig, onAbbruch }: MotivEinfuehrungProps) {
  const folge = MOTIV_EINFUEHRUNGEN[motivId];
  const [index, setIndex] = useState(0);
  // Zählt hoch, wenn das Kind Lux antippt und die Folge von vorn läuft. Steckt im Sprech-
  // schlüssel, damit auch der ERSTE Schritt eines neuen Durchlaufs ein neuer Schlüssel ist —
  // sonst spräche Lux beim Neustart nicht (siehe useLuxSprechzeile: gesprochen wird bei
  // Schlüsselwechsel).
  const [durchlauf, setDurchlauf] = useState(0);
  // Gesetzt, während eine Figur gleitet. Der Blick aufs Brett bleibt so lange stehen.
  const [animation, setAnimation] = useState<{ von: BoardSquare; nach: BoardSquare; bleibt: boolean } | null>(null);

  const zeigeUntertitel = useUntertitelAktiv();
  const bild = bildFuerSchritt(motivId, index);
  const aktuell = schritt(motivId, index);
  const letzter = index >= anzahlSchritte(motivId) - 1;

  // onFertig darf sich ändern, ohne den Sprech-Effekt neu auszulösen.
  const onFertigRef = useRef(onFertig);
  onFertigRef.current = onFertig;

  const weiter = useCallback(() => {
    setAnimation(null);
    setIndex((i) => {
      if (i >= anzahlSchritte(motivId) - 1) {
        onFertigRef.current();
        return i;
      }
      return i + 1;
    });
  }, [motivId]);

  // Was passiert, wenn Lux die Zeile zu Ende gesprochen hat: entweder die Animation dieses
  // Schritts starten — dann geht es erst nach `onDemoDone` weiter — oder direkt zum nächsten
  // Schritt. `useLuxSprechzeile` legt vor diesem Aufruf ohnehin schon eine Atempause ein
  // (ZEILEN_PAUSE_MS), deshalb hier keine zweite.
  const nachDemSprechen = useCallback(() => {
    const a = animationNachSchritt(motivId, index);
    if (!a) {
      weiter();
      return;
    }
    setAnimation({ von: zuFeld(a.von), nach: zuFeld(a.nach), bleibt: a.bleibt });
  }, [motivId, index, weiter]);

  const { wiederholen, aktuelleZeile } = useLuxSprechzeile(
    sprechSchluessel(motivId, index, durchlauf),
    // Als FUNKTION, nicht als fertiger String (siehe useLuxSprechzeile.ts, Kommentar zu
    // `Zeile`): `t()` wird so erst beim tatsaechlichen Sprechvorgang ausgewertet und friert
    // nicht auf der beim Import aktiven Sprache ein.
    () => t(aktuell.de, aktuell.en),
    nachDemSprechen,
    // Keine 8-Sekunden-Erinnerung: Die Folge läuft ohnehin von selbst weiter, eine Erinnerung
    // würde mitten in die nächste Zeile sprechen. (`useLuxSprechzeile` schaltet sie bei
    // gesetztem onFertig zwar schon selbst ab — hier zusätzlich ausdrücklich, damit die
    // Absicht beim Lesen nicht von einer Implementierungseigenschaft abhängt.)
    { erinnerung: false }
  );

  // Sicherheitsnetz gegen eine hängende Animation: Board meldet `onDemoDone` über eine
  // Animated-Sequenz, und wenn die App währenddessen in den Hintergrund geht, kann dieser
  // Rückruf ausbleiben. Dann stünde die Folge still, ohne dass das Kind irgendetwas tun kann
  // (es gibt ja bewusst keinen Weiter-Tipp). Großzügig bemessen — kommt das echte Ende
  // vorher, verfällt der Timer.
  useEffect(() => {
    if (!animation) return;
    const netz = setTimeout(() => weiter(), 4000);
    return () => clearTimeout(netz);
  }, [animation, weiter]);

  function neuStarten() {
    setAnimation(null);
    setIndex(0);
    setDurchlauf((d) => d + 1);
  }

  const heldFeld = zuFeld(bild.held);
  const config: BoardConfig = {
    rows: 8,
    cols: 8,
    // Das Heldenfeld trägt den goldenen Sockel („das ist deine Figur", siehe styles.pieceSockel
    // in Board.tsx). Der Test stellt sicher, dass dort nie eine schwarze Figur steht.
    pieceAt: heldFeld,
    pieceIcon: figurIcon(bild.figuren.find((f) => f.feld === bild.held)?.code ?? "wK"),
    // Kein einziges antippbares Zielfeld: Das hier ist eine Vorführung, keine Aufgabe.
    legalTargets: [],
    zeigeZielringe: false,
    // Alle übrigen Figuren als statische Zusatzfiguren. Bewusst NICHT über `opponentAt`:
    // Board.tsx kennt dort genau eine gegnerische Figur, eine Einführung zeigt aber bis zu
    // fünf weitere — und `demoIconQuelle` (boardDemo.ts) findet das bewegliche Icon auch
    // unter den Zusatzfiguren, sodass auch die Gegnerantwort sauber gleitet.
    zusatzfiguren: bild.figuren
      .filter((f) => f.feld !== bild.held)
      .map((f) => ({ at: zuFeld(f.feld), icon: figurIcon(f.code) })),
    blickfangAt: bild.blickfang.map(zuFeld),
    kettenlinie: bild.linie
      ? { von: zuFeld(bild.linie.von), bis: zuFeld(bild.linie.bis) }
      : undefined,
    angreiferAt: bild.bedrohung ? zuFeld(bild.bedrohung.angreifer) : undefined,
    bedrohtAt: bild.bedrohung ? zuFeld(bild.bedrohung.bedroht) : undefined,
  };

  return (
    <View style={styles.wurzel}>
      <WaldHintergrund />
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        {onAbbruch && (
          <Pressable
            onPress={onAbbruch}
            accessibilityLabel={t("Zurück", "Back")}
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
            style={styles.zurueck}
          >
            <FarnZurueckIcon size={26} />
          </Pressable>
        )}
        <Pressable
          style={styles.luxCorner}
          onPress={() => (index === 0 ? wiederholen() : neuStarten())}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel={t("Lux, tippen um noch einmal zu zeigen", "Lux, tap to show it again")}
        >
          <LuxEckIcon size={44} />
        </Pressable>
        {zeigeUntertitel && (
          <LuxSprechblase
            text={aktuelleZeile}
            zeilenSchluessel={sprechSchluessel(motivId, index, durchlauf)}
            style={styles.sprechblase}
          />
        )}

        <View style={styles.mitte}>
          <Text style={styles.titel}>{t(folge.titelDe, folge.titelEn)}</Text>
          <Board
            // Eigener Schlüssel je Schritt, und das ist kein Kosmetikdetail: Board.tsx merkt
            // sich in `demoTargetKeyRef`, welcher Vorführschritt schon lief, damit ein
            // Re-Render dieselbe Animation nicht erneut auslöst. In einer Folge kommt derselbe
            // Zug aber ein zweites Mal vor (Beschützen: der schwarze Turm schlägt auf beiden
            // Brettern von demselben Feld aufs selbe Feld) — ohne frisches Board bliebe der
            // zweite stumm stehen, und die Folge käme nie weiter.
            key={`${motivId}-${durchlauf}-${index}`}
            config={config}
            onCorrectMove={() => {}}
            disabled
            demoVon={animation?.von}
            demoTarget={animation?.nach}
            demoBleibt={animation?.bleibt}
            onDemoDone={weiter}
          />
          {/* Kein Weiter-Knopf und kein Tipp-Bereich. Die Folge läuft von selbst; der einzige
              Ausweg ist der Zurück-Knopf oben links. */}
          {letzter && !animation && <View style={styles.abschlussPlatz} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wurzel: { flex: 1, backgroundColor: "#DCE7C8" },
  safe: { flex: 1 },
  zurueck: {
    position: "absolute",
    top: 20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(247,241,228,0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // Dieselbe Anordnung wie in screens/EndlosmodusSpalte.tsx (Lux eine Zeile tiefer, weil oben
  // links schon der Zurück-Knopf sitzt), damit die Einführung und die Spalte, aus der sie
  // aufgerufen wird, nicht unterschiedlich aussehen.
  luxCorner: { position: "absolute", top: 76, left: 24, zIndex: 10 },
  sprechblase: { position: "absolute", top: 72, left: 84, right: 16, maxHeight: 170, zIndex: 15 },
  mitte: { flex: 1, alignItems: "center", justifyContent: "center" },
  titel: { fontSize: 20, fontWeight: "700", color: "#4A4038", marginBottom: 16 },
  abschlussPlatz: { height: 24 },
});
