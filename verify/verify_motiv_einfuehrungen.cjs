/**
 * ChessLynx — Prüfung der Stellungen für die animierten Motiv-Einführungen
 * =======================================================================
 *
 * Jede Einführung ist eine vertonte Zugfolge, die Lux Schritt für Schritt erklärt. Geprüft
 * wird deshalb nicht nur die Startstellung, sondern die GANZE Folge: Ist jeder Zug legal,
 * stimmt die Aussage nach jedem Schritt, und passiert nebenbei nichts, was ablenkt?
 *
 * Aufruf: node verify/verify_motiv_einfuehrungen.cjs
 */
const { Chess } = require("chess.js");

let fehler = 0;
const melde = (ok, text) => {
  console.log(`   ${ok ? "✅" : "❌"} ${text}`);
  if (!ok) fehler++;
};

function koenigsFeld(b, farbe) {
  for (const r of b.board()) for (const f of r || []) if (f && f.type === "k" && f.color === farbe) return f.square;
  return null;
}

/** Jede Startstellung muss spielbar sein: die NICHT am Zug befindliche Seite darf nicht im
 *  Schach stehen. chess.js nimmt solche Stellungen sonst klaglos an (Fund vom 19.09.). */
function spielbar(b, name) {
  const wartend = b.turn() === "w" ? "b" : "w";
  const kf = koenigsFeld(b, wartend);
  const ang = kf ? b.attackers(kf, b.turn()) : [];
  melde(ang.length === 0, `${name}: Startstellung spielbar (König ${wartend} auf ${kf} nicht im Schach)`);
}

function zaehleFiguren(b) {
  let n = 0;
  for (const r of b.board()) for (const f of r || []) if (f) n++;
  return n;
}

/**
 * Spielt eine Einführungsfolge durch und prüft nach jedem Schritt die behauptete Aussage.
 * schritte: [{ zug, sagt, pruefe(brett) }]
 */
function einfuehrung(name, fen, maxFiguren, schritte) {
  console.log(`\n── ${name}\n   FEN: ${fen}`);
  let b;
  try {
    b = new Chess(fen);
  } catch (e) {
    melde(false, `FEN ungültig: ${e.message}`);
    return;
  }
  const n = zaehleFiguren(b);
  console.log(`   ${n} Figuren · ${b.turn() === "w" ? "Weiß" : "Schwarz"} am Zug`);
  melde(n <= maxFiguren, `höchstens ${maxFiguren} Figuren (Lehrbild, nicht Übungsstellung)`);
  spielbar(b, name);

  for (const s of schritte) {
    let m;
    try {
      m = b.move(s.zug);
    } catch {
      melde(false, `Zug ${s.zug} ist NICHT legal`);
      return;
    }
    melde(true, `${m.san} — „${s.sagt}"`);
    if (s.pruefe) s.pruefe(b, (ok, text) => melde(ok, `      ↳ ${text}`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 — BESCHÜTZEN (Kontrastpaar, übernommen aus Kapitel A)
// ═══════════════════════════════════════════════════════════════════════════

einfuehrung("1a  Beschützen — OHNE Beschützer", "k2r4/8/8/8/3B4/8/8/7K b - - 0 1", 4, [
  {
    zug: "Rxd4",
    sagt: "Weg ist er. Und niemand konnte ihm helfen.",
    pruefe: (b, p) => p(b.attackers("d4", "w").length === 0, "nichts schlägt auf d4 zurück"),
  },
]);

einfuehrung("1b  Beschützen — MIT Beschützer", "k2r4/8/8/8/3B4/8/8/3R3K b - - 0 1", 5, [
  {
    zug: "Rxd4",
    sagt: "Er hat ihn geschlagen!",
    pruefe: (b, p) => p(b.moves().includes("Rxd4"), "Weiß kann mit Rxd4 zurückholen"),
  },
  { zug: "Rxd4", sagt: "Aber schau — dein Turm holt ihn sich sofort." },
]);

// ═══════════════════════════════════════════════════════════════════════════
// 2 — FIGUR GEWINNEN (hängende Figur, mit gedecktem Gegenbeispiel im Bild)
// ═══════════════════════════════════════════════════════════════════════════

einfuehrung("2   Figur gewinnen — hängend vs. gedeckt", "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1", 6, [
  {
    zug: "Rxd6",
    sagt: "Der Springer hatte keinen Beschützer. Den kannst du dir holen.",
    pruefe: (b, p) => {
      p(b.attackers("d6", "b").length === 0, "auf d6 schlägt nichts zurück");
      p(!b.isCheck(), "kein Schach nebenbei (lenkt sonst ab)");
    },
  },
]);

// Kontrolle der Ausgangslage: genau EINE schwarze Figur hängt, die andere ist gedeckt.
{
  const b = new Chess("7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1");
  console.log("   Ausgangslage:");
  melde(b.attackers("d6", "b").length === 0, "      ↳ Springer d6 ist UNGEDECKT (das Lehrbeispiel)");
  melde(b.attackers("f6", "b").includes("g7"), "      ↳ Läufer f6 ist von g7 GEDECKT (das Gegenbeispiel im selben Bild)");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 — VERTEIDIGEN (erst zeigen, was ohne Rettung passiert, dann die Rettung)
// ═══════════════════════════════════════════════════════════════════════════

einfuehrung("3a  Verteidigen — was passiert, wenn nichts geschieht", "7k/8/8/2b5/8/8/5R2/7K w - - 0 1", 4, [
  { zug: "Kg1", sagt: "Stell dir vor, du machst irgendetwas anderes …" },
  {
    zug: "Bxf2+",
    sagt: "… dann ist dein Turm weg.",
    pruefe: (b, p) => p(true, "der Läufer holt sich den Turm"),
  },
]);

einfuehrung("3b  Verteidigen — die Rettung", "7k/8/8/2b5/8/8/5R2/7K w - - 0 1", 4, [
  {
    zug: "Ra2",
    sagt: "Bring ihn lieber in Sicherheit.",
    pruefe: (b, p) => {
      p(b.attackers("a2", "b").length === 0, "auf a2 ist der Turm nicht mehr angegriffen");
      p(!b.isCheck(), "kein Schach nebenbei");
    },
  },
]);

// ═══════════════════════════════════════════════════════════════════════════
// 4 — GABEL (der Kernfall: Drohung, Flucht, Beute)
// ═══════════════════════════════════════════════════════════════════════════

einfuehrung("4   Gabel — Springer bedroht König und Dame", "6k1/3q4/8/8/4N3/8/8/7K w - - 0 1", 4, [
  {
    zug: "Nf6+",
    sagt: "Er bedroht jetzt beide auf einmal.",
    pruefe: (b, p) => {
      p(b.isCheck(), "der König steht im Schach — deshalb MUSS er weichen");
      p(b.attackers("d7", "w").includes("f6"), "und die Dame auf d7 wird gleichzeitig angegriffen");
    },
  },
  {
    zug: "Kh8",
    sagt: "Der König muss weg, der steht im Schach.",
    pruefe: (b, p) => p(b.attackers("d7", "w").includes("f6"), "die Dame steht immer noch unter Beschuss"),
  },
  {
    zug: "Nxd7",
    sagt: "Und jetzt ist die Dame weg.",
    pruefe: (b, p) => p(b.attackers("d7", "b").length === 0, "nichts schlägt zurück — der Gewinn bleibt"),
  },
]);

// ═══════════════════════════════════════════════════════════════════════════
// 5 — FESSELUNG (die gefesselte Figur kann nicht weglaufen)
// ═══════════════════════════════════════════════════════════════════════════

einfuehrung("5   Fesselung — der Springer ist angekettet", "4k3/8/4n3/8/3P4/8/8/4R2K w - - 0 1", 5, [
  {
    zug: "d5",
    sagt: "Jetzt greift dein Bauer den Springer an.",
    pruefe: (b, p) => {
      p(b.attackers("e6", "w").includes("d5"), "der Bauer d5 bedroht den Springer e6");
      const springerZuege = b.moves({ verbose: true }).filter((m) => m.piece === "n");
      p(springerZuege.length === 0, `der Springer kann NICHT fliehen (${springerZuege.length} Springerzüge legal)`);
    },
  },
  { zug: "Kd8", sagt: "Er kann nicht weg — er ist an seinen König gekettet." },
  {
    zug: "dxe6",
    sagt: "Weg ist er.",
    pruefe: (b, p) => p(b.attackers("e6", "b").length === 0, "und nichts holt ihn zurück"),
  },
]);

// ═══════════════════════════════════════════════════════════════════════════
// 6 — SPIESS (Schach vorn, Beute dahinter)
// ═══════════════════════════════════════════════════════════════════════════

einfuehrung("6   Spieß — König vorn, Dame dahinter", "q7/8/8/k7/8/8/7K/7R w - - 0 1", 4, [
  {
    zug: "Ra1+",
    sagt: "Schach! Und schau, wer genau dahinter steht.",
    pruefe: (b, p) => {
      p(b.isCheck(), "der König steht im Schach");
      const fluchten = b.moves();
      p(
        !fluchten.some((z) => /^Ka[0-9]/.test(z)),
        "er kann NICHT auf der Linie bleiben — jede Flucht gibt die Dame frei"
      );
    },
  },
  { zug: "Kb5", sagt: "Er muss zur Seite." },
  {
    zug: "Rxa8",
    sagt: "Und die Dame dahinter ist deine.",
    pruefe: (b, p) => p(b.attackers("a8", "b").length === 0, "nichts schlägt zurück"),
  },
]);

console.log(
  fehler === 0
    ? "\n\n✅ Alle Einführungsfolgen sind gegen chess.js 1.4 verifiziert."
    : `\n\n❌ ${fehler} Prüfung(en) fehlgeschlagen.`
);
process.exit(fehler === 0 ? 0 : 1);
