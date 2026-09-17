// Freies 8x8-Spielbrett für die Wisent-Endspiel-Kür (Dame-Matt/Turm-Matt, siehe
// bonus/WisentEndspielKuer.tsx). Anders als Board.tsx (das "onlyTarget"-Muster: EINE feste
// ziehende Figur pro Screen, siehe dortige `pieceAt`/`legalTargets`-Props, genutzt von allen
// bisherigen Bonuskapiteln inkl. MattIn3.tsx) muss das Kind hier selbst wählen, mit welcher
// eigenen Figur (König ODER Dame/Turm) es zieht — dasselbe freie Auswahlmuster wie
// screens/FreispielPartie.tsx' eigener, dort nicht exportierter `Brett`-Komponente.
//
// Bewusst eine NEUE, eigenständige Datei statt FreispielPartie.tsx' `Brett` zu exportieren und
// wiederzuverwenden: `Brett` ist dort ein privates Implementierungsdetail einer bereits
// getesteten, 1000+ Zeilen umfassenden Datei (u. a. mit Schach-Glüh-Puls, Hinweis-Ring, allen
// sechs Figurentypen beider Farben) — ein Eingriff dort nur wegen eines neuen Aufrufers wäre
// unnötiges Risiko für bereits funktionierenden Code. Diese Stellungen brauchen ohnehin nur
// einen Bruchteil davon (nie mehr als König + Dame/Turm für Weiß, nackter König für Schwarz,
// keine Bauern -> keine Umwandlungs-Auswahl-UI), daher hier bewusst schlanker nachgebaut:
// eigene, auf drei Figurtypen reduzierte Icon-Zuordnung, ohne Hinweis-Ring (diese Kür hat keine
// "Lux fragen"-Hinweisfunktion, siehe bonus/WisentEndspielKuer.tsx-Kopfkommentar).
//
// Interaktionsmodell wie FreispielPartie.tsx' `Brett`: rein präsentational, hält selbst keinen
// Zustand — `ausgewaehlt`/`legalZiele`/`koenigInSchachFeld` kommen vom aufrufenden Screen, der
// auch `game` (die mutable chess.js-Partie) hält und nach jedem `game.move(...)` selbst
// neu rendert (kein `useState` für die Partie hier, exakt wie beim Vorbild).

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { View, Pressable, Image, StyleSheet, Animated, Dimensions } from "react-native";
import type { Chess, PieceSymbol } from "chess.js";
import type { BoardSquare } from "../lib/chessEngine";
import { KoenigMasterIcon, KoenigMasterDunkelIcon, TurmMasterIcon, DameMasterIcon } from "../lib/pieceMasters";

const feldHell = require("../../assets/brett/tile_hell.webp");
const feldDunkel = require("../../assets/brett/tile_dunkel.webp");

// Dieselbe Berechnung (width/height: cellSize * 8 + RAHMEN_BREITE * 2) wie in
// screens/FreispielPartie.tsx' `Brett` — siehe dortiger Kommentar, warum das eine eigene
// Konstante statt eines Literals ist.
const RAHMEN_BREITE = 6;

/** Nur die drei in dieser Kür tatsächlich vorkommenden Figurtypen (König beider Farben, Dame/
 *  Turm nur Weiß) — anders als FreispielPartie.tsx' vollständige WEISSE_FIGUREN/
 *  SCHWARZE_FIGUREN-Tabellen (alle sechs Typen beider Farben) genügt hier eine kleine
 *  Lookup-Funktion, da nie ein anderer Figurtyp auf dem Brett stehen kann. */
function iconFuerFeld(feld: { type: PieceSymbol; color: "w" | "b" }): ComponentType<{ size?: number }> | null {
  if (feld.type === "k") return feld.color === "w" ? KoenigMasterIcon : KoenigMasterDunkelIcon;
  if (feld.type === "q") return DameMasterIcon;
  if (feld.type === "r") return TurmMasterIcon;
  return null; // sollte in dieser Kür nie vorkommen (keine Bauern/Läufer/Springer)
}

export function EndspielBrett({
  game,
  ausgewaehlt,
  legalZiele,
  koenigInSchachFeld,
  onFeldTipp,
}: {
  game: Chess;
  ausgewaehlt: BoardSquare | null;
  legalZiele: BoardSquare[];
  koenigInSchachFeld: BoardSquare | null;
  onFeldTipp: (r: number, c: number) => void;
}) {
  const brett = game.board();

  // Responsive Zellgröße — dieselbe Technik wie FreispielPartie.tsx' `Brett`/quest1/Board.tsx
  // (siehe dortiger Kommentar): die tatsächlich zugewiesene Layout-Breite messen statt sich auf
  // die globale Fensterbreite zu verlassen.
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const bildschirmBreite = containerWidth ?? Dimensions.get("window").width;
  const maxBrettBreite = Math.floor(bildschirmBreite * 0.98);
  const cellSize = Math.max(24, Math.min(64, Math.floor((maxBrettBreite - RAHMEN_BREITE * 2) / 8)));
  const figurGroesse = Math.round(cellSize * 0.75);

  const legalSet = new Set(legalZiele.map((z) => `${z.row}-${z.col}`));

  const schachPuls = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!koenigInSchachFeld) {
      schachPuls.setValue(1);
      return;
    }
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(schachPuls, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(schachPuls, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    schleife.start();
    return () => schleife.stop();
  }, [koenigInSchachFeld?.row, koenigInSchachFeld?.col, schachPuls]);

  return (
    <View style={styles.messRahmen} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.brett, { width: cellSize * 8 + RAHMEN_BREITE * 2, height: cellSize * 8 + RAHMEN_BREITE * 2 }]}>
        {brett.flatMap((zeile, r) =>
          zeile.map((feld, c) => {
            const istDunkel = (r + c) % 2 === 1;
            const istAusgewaehlt = ausgewaehlt?.row === r && ausgewaehlt?.col === c;
            const istZiel = legalSet.has(`${r}-${c}`);
            const istSchachfeld = koenigInSchachFeld?.row === r && koenigInSchachFeld?.col === c;
            const Icon = feld ? iconFuerFeld(feld) : null;

            return (
              <Pressable
                key={`${r}-${c}`}
                onPress={() => onFeldTipp(r, c)}
                accessibilityLabel={feld ? "Figur auf dem Feld" : istZiel ? "Zulässiges Zielfeld" : "Feld"}
                style={[styles.feld, { width: cellSize, height: cellSize }]}
              >
                {/* Kachel-Bild statt Flatcolor, dieselbe Image+absoluteFill+zIndex-Technik wie
                    in quest1/Board.tsx/FreispielPartie.tsx' `Brett` (Android-Rendering-Fix:
                    die Kachel muss explizit ganz unten liegen). */}
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
                  <Image source={istDunkel ? feldDunkel : feldHell} style={StyleSheet.absoluteFill} resizeMode="cover" />
                </View>
                {istAusgewaehlt && <View style={[styles.feldAusgewaehltUeberlagerung, { zIndex: 1 }]} pointerEvents="none" />}
                {istZiel && <View style={[styles.zielUeberlagerung, { zIndex: 2 }]} pointerEvents="none" />}
                {istSchachfeld && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.schachUeberlagerung, { zIndex: 2, transform: [{ scale: schachPuls }] }]}
                  />
                )}
                {/* Android-Fix (siehe identischer Fund in quest1/Board.tsx): Figur explizit
                    absolut + zIndex rendern, seit die Kachel selbst absolut positioniert ist. */}
                {Icon && (
                  <View style={[StyleSheet.absoluteFill, styles.figurWrap, { zIndex: 3 }]} pointerEvents="none">
                    <Icon size={figurGroesse} />
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messRahmen: { width: "100%", alignItems: "center" },
  brett: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: RAHMEN_BREITE,
    borderColor: "#4A4038",
    borderRadius: 6,
    overflow: "hidden",
  },
  feld: { alignItems: "center", justifyContent: "center" },
  figurWrap: { alignItems: "center", justifyContent: "center" },
  feldAusgewaehltUeberlagerung: { ...StyleSheet.absoluteFill, backgroundColor: "#D7A52D", opacity: 0.35 },
  zielUeberlagerung: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#5FA05F",
    opacity: 0.32,
    borderRadius: 999,
    margin: "22%",
  },
  schachUeberlagerung: { ...StyleSheet.absoluteFill, backgroundColor: "#C9433F", opacity: 0.4, borderRadius: 999, margin: "10%" },
});
