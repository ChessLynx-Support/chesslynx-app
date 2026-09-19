// Verifikation aller vorgeschlagenen Stellungen für das neue Deckungs-/Verteidigungs-Kapitel
// gegen echtes chess.js 1.4 (Projektregel: Stellungen nie von Hand prüfen).
//
// Geprüft werden nicht nur Zug-Legalitäten, sondern die didaktischen Aussagen selbst:
//   angegriffen(feld)  → es gibt schwarze Angreifer auf dieses Feld
//   gedeckt(feld)      → es gibt weiße Verteidiger dieses Feldes
//   ungedeckt(feld)    → es gibt KEINEN weißen Verteidiger
//   keinSchach         → der Lehrzug gibt kein Schach (Störgeräusch im Deckungs-Kapitel)
const { Chess } = require("chess.js");

let fehler = 0;
const melde = (ok, text) => {
  console.log(`   ${ok ? "✅" : "❌"} ${text}`);
  if (!ok) fehler++;
};

/** Feld des Königs einer Farbe. */
function koenigsFeld(brett, farbe) {
  for (const reihe of brett.board()) {
    for (const f of reihe || []) if (f && f.type === "k" && f.color === farbe) return f.square;
  }
  return null;
}

function stellung(name, fen, pruefungen) {
  console.log(`\n── ${name}\n   FEN: ${fen}`);
  let c;
  try {
    c = new Chess(fen);
  } catch (e) {
    melde(false, `FEN ungültig: ${e.message}`);
    return;
  }
  console.log(`   Am Zug: ${c.turn() === "w" ? "Weiß" : "Schwarz"} · ${c.moves().length} Legalzüge`);

  // PFLICHTPRÜFUNG für jede Stellung (Nachtrag 2026-09-19): chess.js akzeptiert klaglos
  // Stellungen, in denen die NICHT am Zug befindliche Seite im Schach steht — die sind aber
  // unspielbar (die Seite am Zug könnte den König schlagen). Genau daran ist der erste Entwurf
  // von B-2 gescheitert: weißer Turm a1 gab dem schwarzen König a8 bereits Schach, während
  // Weiß am Zug war. `new Chess(fen)` hat das durchgelassen, `moves()` lieferte 28 Züge, und
  // erst der Vergleich mit einer daraus gebauten Testpartie hat es aufgedeckt. Diese Prüfung
  // läuft deshalb ab jetzt automatisch bei JEDER Stellung mit.
  const wartend = c.turn() === "w" ? "b" : "w";
  const kf = koenigsFeld(c, wartend);
  const angreifer = kf ? c.attackers(kf, c.turn()) : [];
  melde(
    angreifer.length === 0,
    `Stellung ist spielbar (König ${wartend === "w" ? "Weiß" : "Schwarz"} auf ${kf} steht nicht im Schach, ` +
      `während ${c.turn() === "w" ? "Weiß" : "Schwarz"} am Zug ist)` +
      (angreifer.length ? ` — ANGEGRIFFEN VON ${angreifer.join(", ")}` : "")
  );

  pruefungen(c, fen);
}

const ang = (c, f, farbe) => c.attackers(f, farbe);

function angegriffenVon(c, feld, farbe, name) {
  const a = ang(c, feld, farbe);
  melde(a.length > 0, `${name} (${feld}) wird angegriffen von: ${a.join(", ") || "— niemand —"}`);
}
function gedecktVon(c, feld, farbe, name) {
  const a = ang(c, feld, farbe);
  melde(a.length > 0, `${name} (${feld}) ist gedeckt von: ${a.join(", ") || "— niemand —"}`);
}
function ungedeckt(c, feld, farbe, name) {
  const a = ang(c, feld, farbe);
  melde(a.length === 0, `${name} (${feld}) ist UNGEDECKT${a.length ? ` (aber gedeckt von ${a.join(", ")})` : ""}`);
}
function zugLegalOhneSchach(c, fen, zug) {
  const k = new Chess(fen);
  let m;
  try {
    m = k.move(zug);
  } catch {
    melde(false, `Zug ${zug} ist NICHT legal`);
    return null;
  }
  melde(true, `Zug ${m.san} ist legal`);
  melde(!k.isCheck(), `Zug ${m.san} gibt KEIN Schach (kein Störgeräusch im Kapitel)`);
  return k;
}

// ═══════════════════════════════════════════════════════════════════════════
// KAPITEL A — „Der Beschützer" (reines Zeigen, das Kind handelt nicht)
// ═══════════════════════════════════════════════════════════════════════════

// Screen 0+1: Läufer steht ganz allein. Turm nimmt ihn — nichts schlägt zurück.
stellung("A-1  Läufer OHNE Beschützer (Screen 0+1)", "k2r4/8/8/8/3B4/8/8/7K b - - 0 1", (c, fen) => {
  angegriffenVon(c, "d4", "b", "weißer Läufer");
  ungedeckt(c, "d4", "w", "weißer Läufer");
  const nach = zugLegalOhneSchach(c, fen, "Rxd4");
  if (nach) melde(nach.attackers("d4", "w").length === 0, "Nach Rxd4 kann Weiß auf d4 nichts zurückschlagen");
});

// Screen 2+3: IDENTISCHE Stellung — nur ein weißer Turm auf d1 kommt dazu.
stellung("A-2  Läufer MIT Beschützer (Screen 2+3)", "k2r4/8/8/8/3B4/8/8/3R3K b - - 0 1", (c, fen) => {
  angegriffenVon(c, "d4", "b", "weißer Läufer");
  gedecktVon(c, "d4", "w", "weißer Läufer");
  const nach = zugLegalOhneSchach(c, fen, "Rxd4");
  if (nach) melde(nach.moves().includes("Rxd4"), "Nach Rxd4 holt Weiß mit Rxd4 zurück");
});

// Screen 4: zweiter Beschützer-Typ (Springer deckt Bauer), Könige so gestellt, dass
// der Schlagzug kein Schach gibt.
stellung("A-3  Springer deckt Bauer (Screen 4)", "7k/1b6/8/8/4P3/2N5/7K/8 b - - 0 1", (c, fen) => {
  angegriffenVon(c, "e4", "b", "weißer Bauer");
  gedecktVon(c, "e4", "w", "weißer Bauer");
  const nach = zugLegalOhneSchach(c, fen, "Bxe4");
  if (nach) melde(nach.moves().includes("Nxe4"), "Nach Bxe4 holt Weiß mit Nxe4 zurück");
});

// Screen 5: Perspektivwechsel — auch der Gegner passt auf seine Figuren auf.
stellung("A-4  Gegner deckt selbst (Screen 5)", "7k/6p1/5n2/8/3B4/8/8/7K w - - 0 1", (c, fen) => {
  gedecktVon(c, "f6", "b", "schwarzer Springer");
  const nach = zugLegalOhneSchach(c, fen, "Bxf6");
  if (nach) melde(nach.moves().includes("gxf6"), "Nach Bxf6 holt Schwarz mit gxf6 zurück");
});

// Screen 6: Erkennungsaufgabe (Tipp, kein Zug) — genau EINE schwarze Figur steht allein.
stellung("A-5  Erkennen: welche steht allein? (Screen 6)", "7k/8/4p2p/3n2b1/8/r7/8/6RK w - - 0 1", (c) => {
  ungedeckt(c, "a3", "b", "schwarzer Turm  ← die gesuchte Figur");
  gedecktVon(c, "d5", "b", "schwarzer Springer");
  gedecktVon(c, "g5", "b", "schwarzer Läufer");
});

// ═══════════════════════════════════════════════════════════════════════════
// KAPITEL B — „In Sicherheit bringen" (das Kind handelt, mit Figurenwert)
// ═══════════════════════════════════════════════════════════════════════════

// B-1 Wegziehen: Turm vom Läufer angegriffen, kein Beschützer, kein Gegenschlag möglich.
stellung("B-1  Weg 1 — Wegziehen", "7k/8/8/2b5/8/8/5R2/7K w - - 0 1", (c, fen) => {
  angegriffenVon(c, "f2", "b", "weißer Turm");
  ungedeckt(c, "f2", "w", "weißer Turm");
  const nach = zugLegalOhneSchach(c, fen, "Ra2");
  if (nach) melde(nach.attackers("a2", "b").length === 0, "Auf a2 ist der Turm nicht mehr angegriffen");
});

// B-2 Decken: Läufer d4 angegriffen — ein Beschützer stellt sich dazu.
stellung("B-2  Weg 2 — Decken (Turm nach d1)", "3r2k1/8/8/8/3B4/8/8/R6K w - - 0 1", (c, fen) => {
  angegriffenVon(c, "d4", "b", "weißer Läufer");
  ungedeckt(c, "d4", "w", "weißer Läufer (noch)");
  const nach = zugLegalOhneSchach(c, fen, "Rd1");
  if (nach) melde(nach.attackers("d4", "w").length > 0, "Nach Rd1 ist der Läufer gedeckt");
});

// B-3 Angreifer schlagen: der angreifende Läufer ist selbst erreichbar und ungedeckt.
stellung("B-3  Weg 3 — Angreifer schlagen", "k7/8/1b6/8/3R4/8/8/1R5K w - - 0 1", (c, fen) => {
  angegriffenVon(c, "d4", "b", "weißer Turm");
  ungedeckt(c, "b6", "b", "schwarzer Läufer (der Angreifer)");
  const nach = zugLegalOhneSchach(c, fen, "Rxb6");
  if (nach) melde(nach.attackers("b6", "b").length === 0, "Nach Rxb6 schlägt nichts zurück");
  if (nach) melde(nach.attackers("d4", "b").length === 0, "Der weiße Turm auf d4 ist nicht mehr angegriffen");
});

// B-4 Der Figurenwert-Punkt: gedeckt sein REICHT NICHT, wenn der Angreifer weniger wert ist.
//     Turm c3 ist von Tc1 gedeckt, wird aber von einem Bauern angegriffen → muss trotzdem weg.
stellung("B-4  Gedeckt reicht nicht (Bauer greift gedeckten Turm an)", "k7/8/8/8/3p4/2R5/8/2R4K w - - 0 1", (c, fen) => {
  angegriffenVon(c, "c3", "b", "weißer Turm");
  gedecktVon(c, "c3", "w", "weißer Turm (ist also gedeckt!)");
  melde(c.get("d4")?.type === "p", "Der Angreifer ist ein BAUER (1 Stern gegen 5 Sterne)");
  const nach = zugLegalOhneSchach(c, fen, "Rc7");
  if (nach) melde(nach.attackers("c7", "b").length === 0, "Nach Rc7 ist der Turm in Sicherheit");
});

console.log(
  fehler === 0
    ? "\n\n✅ Alle Prüfungen bestanden — alle 9 Stellungen sind gegen chess.js 1.4 verifiziert."
    : `\n\n❌ ${fehler} Prüfung(en) fehlgeschlagen.`
);
