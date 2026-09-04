// Portierung von prototyp/client/src/quest1/Board.tsx nach React Native.
// Kernänderung gegenüber dem Web-Prototyp: `legalTargets` kommt nicht mehr aus einem
// hart kodierten Array im Screen-Objekt, sondern wird live aus chess.js abgeleitet
// (siehe src/lib/chessEngine.ts) — das war die zentrale, in technisches_konzept.md
// benannte Lücke des Web-Prototyps.
//
// Grafiken sind hier bewusst einfache Platzhalter-Formen (Kreis/Farbfläche), nicht die
// finalen Illustrationen — die Icon-Anbindung (Igel-Grafik statt Kreis) ist ein reiner
// Austausch der gerenderten Komponente, sobald die Assets aus Phase 2 der
// `checkliste_produktionsphasen.md` vorliegen.

import { useRef, useState } from "react";
import { View, Pressable, StyleSheet, Animated, AccessibilityInfo } from "react-native";
import type { BoardSquare } from "../lib/chessEngine";

export type BoardConfig = {
  rows: number;
  cols: number;
  pieceAt: BoardSquare;
  legalTargets: BoardSquare[];
  trapTarget?: BoardSquare; // Stopp!-Aufgabe: antippbar, aber löst Konsequenz-Animation aus statt echtem Zug
  opponentAt?: BoardSquare;
};

function key(s: BoardSquare) {
  return `${s.row}-${s.col}`;
}

export function Board({
  config,
  onCorrectMove,
  onTrapTap,
  disabled,
}: {
  config: BoardConfig;
  onCorrectMove: (target: BoardSquare) => void;
  onTrapTap?: () => void;
  disabled?: boolean;
}) {
  const { rows, cols, pieceAt, legalTargets, trapTarget, opponentAt } = config;
  const [trappedKey, setTrappedKey] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const legalKeys = new Set(legalTargets.map(key));
  const trapKey = trapTarget ? key(trapTarget) : null;
  const pieceKey = key(pieceAt);
  const opponentKey = opponentAt ? key(opponentAt) : null;

  function handleTap(r: number, c: number) {
    if (disabled) return;
    const k = `${r}-${c}`;
    if (legalKeys.has(k)) {
      onCorrectMove({ row: r, col: c });
      return;
    }
    if (k === trapKey) {
      setTrappedKey(k);
      onTrapTap?.();
      AccessibilityInfo.announceForAccessibility?.("Da steht etwas im Weg.");
      setTimeout(() => setTrappedKey(null), 900);
      return;
    }
    // sanftes Feedback bei jedem anderen Tipp (kein Bestrafungs-Ton, siehe Design-Grundsatz)
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 90, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  const cellSize = 42;

  return (
    <View
      style={[styles.board, { width: cellSize * cols + 12, height: cellSize * rows + 12 }]}
      accessibilityRole="none"
    >
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const k = `${r}-${c}`;
          const isDark = (r + c) % 2 === 1;
          const isLegal = legalKeys.has(k);
          const isTrap = k === trapKey;
          const isTrapped = isTrap && trappedKey === k;
          const hasPiece = k === pieceKey;
          const hasOpponent = k === opponentKey;

          return (
            <Pressable
              key={k}
              onPress={() => handleTap(r, c)}
              disabled={disabled}
              accessibilityLabel={
                hasPiece ? "Dein Spielstein" : isLegal ? "Zulässiges Zielfeld" : hasOpponent ? "Besuchende Figur" : "Feld"
              }
              style={[
                styles.cell,
                { width: cellSize, height: cellSize, backgroundColor: isDark ? "#DED2B0" : "#F0EBDD" },
              ]}
            >
              {isLegal && (
                <View style={styles.legalRing} pointerEvents="none" />
              )}
              {isTrapped && <View style={styles.trapRing} pointerEvents="none" />}
              {hasOpponent && <View style={styles.opponentDot} />}
              {hasPiece && (
                <Animated.View style={[styles.pieceDot, { transform: [{ scale: pulse }] }]} />
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 20,
    borderWidth: 6,
    borderColor: "#F7F1E4",
    backgroundColor: "#F7F1E4",
    alignSelf: "center",
    overflow: "hidden",
  },
  cell: {
    borderWidth: 0.5,
    borderColor: "#C9C2B0",
    alignItems: "center",
    justifyContent: "center",
  },
  legalRing: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#9CB89A",
  },
  trapRing: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#D98E72",
  },
  pieceDot: {
    width: "70%",
    height: "70%",
    borderRadius: 999,
    backgroundColor: "#C9855F",
  },
  opponentDot: {
    width: "60%",
    height: "60%",
    borderRadius: 999,
    backgroundColor: "#A6AEB8",
  },
});
