#!/usr/bin/env node
// Tests für die animierten Motiv-Einführungen (src/lib/motivEinfuehrungen.ts).
//
// Wie in verify/test-endlosmodus-logic.cjs: kein Jest, kein ts-node — das reine TS-Modul wird
// per ts.transpileModule + Module._compile geladen und wirklich ausgeführt.
// Ausführen: `node verify/test-motiv-einfuehrungen-logic.cjs` im Projektverzeichnis.
//
// Geprüft wird in drei Ebenen:
//
//   1. SCHACHLICH. Jede Stellung ist gültig UND spielbar (die nicht am Zug befindliche Seite
//      darf nicht im Schach stehen — chess.js nimmt solche Stellungen sonst klaglos an; genau
//      dieser Fehler ist am 19.09. in einer selbst gebauten Stellung gefunden worden). Jeder
//      `zug` ist legal, jedes `wackeln` ist ABSICHTLICH nicht legal.
//
//   2. DIDAKTISCH. Die Behauptungen, die Lux aufstellt, stimmen nach dem jeweiligen Schritt:
//      „nichts schlägt zurück", „der Springer kann nicht fliehen", „er kann nicht auf der Linie
//      bleiben", „eine hat einen Beschützer, die andere nicht". Das ist der eigentliche Grund
//      für diesen Test — eine legale Zugfolge kann trotzdem das Falsche lehren.
//
//   3. SPRACHLICH. Die Regeln aus der Lückenanalyse, die im Code sonst still erodieren:
//      kein „erobern", keine Feldkoordinaten in den Sprechzeilen, keine räumlichen Wörter für
//      Deckung (Christians Korrektur vom 19.09.), und jede Zeile hat eine englische Fassung.

const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const Module = require("module");

let ts;
try {
  ts = require("typescript");
} catch {
  console.error("Konnte das Paket 'typescript' nicht laden. Bitte einmalig `npm install` ausführen.");
  process.exit(1);
}

let Chess;
try {
  ({ Chess } = require("chess.js"));
} catch {
  console.error("Konnte 'chess.js' nicht laden. Bitte einmalig `npm install` ausführen.");
  process.exit(1);
}

let passed = 0;
let failed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failed++;
    failures.push({ name, err });
  }
}

function lade(relPfad, dateiName) {
  const quelle = path.join(__dirname, "..", ...relPfad);
  const js = ts.transpileModule(fs.readFileSync(quelle, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: dateiName,
  }).outputText;
  const mod = new Module(quelle, module);
  mod.filename = quelle;
  mod.paths = Module._nodeModulePaths(path.dirname(quelle));
  mod._compile(js, quelle);
  return mod.exports;
}

const {
  MOTIV_EINFUEHRUNGEN,
  motivFuerSpalte,
  anzahlSchritte,
  schritt,
  bildFuerSchritt,
  animationNachSchritt,
  sprechSchluessel,
} = lade(["src", "lib", "motivEinfuehrungen.ts"], "motivEinfuehrungen.ts");

// endlosmodusSpalten.ts hat nur einen `import type` und lässt sich deshalb ebenfalls direkt
// laden (dasselbe Vorgehen wie in test-revier-erstlehre-logic.cjs).
const { ENDLOSMODUS_SPALTEN } = lade(["src", "lib", "endlosmodusSpalten.ts"], "endlosmodusSpalten.ts");

const ALLE = Object.keys(MOTIV_EINFUEHRUNGEN);

function koenigsFeld(b, farbe) {
  for (const r of b.board()) for (const f of r || []) if (f && f.type === "k" && f.color === farbe) return f.square;
  return null;
}

// ============================================================================
// 1. Schachliche Grundlagen
// ============================================================================

test("es gibt genau die sechs geplanten Motive", () => {
  assert.deepEqual(
    [...ALLE].sort(),
    ["beschuetzen", "fesselung", "figurGewinnen", "gabel", "spiess", "verteidigen"]
  );
});

test("jede Stellung jeder Folge ist gültig UND spielbar", () => {
  // „Spielbar" heißt: die NICHT am Zug befindliche Seite steht nicht im Schach. chess.js nimmt
  // solche Stellungen klaglos an — am 19.09. ist genau so eine unbemerkt durchgerutscht.
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      const { fen } = bildFuerSchritt(id, i);
      const b = new Chess(fen);
      const wartend = b.turn() === "w" ? "b" : "w";
      const kf = koenigsFeld(b, wartend);
      assert.ok(kf, `${id}/${i}: kein ${wartend}-König in ${fen}`);
      assert.equal(
        b.attackers(kf, b.turn()).length,
        0,
        `${id}/${i}: wartender König auf ${kf} steht im Schach — Stellung nicht spielbar (${fen})`
      );
    }
  }
});

test("jeder angekündigte Zug ist legal", () => {
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      const a = animationNachSchritt(id, i);
      if (!a || !a.bleibt) continue;
      const b = new Chess(bildFuerSchritt(id, i).fen);
      const legal = b.moves({ verbose: true }).some((m) => m.from === a.von && m.to === a.nach);
      assert.ok(legal, `${id}/${i}: ${a.von}->${a.nach} ist nicht legal`);
    }
  }
});

test("das Wackeln in der Fesselung ist ABSICHTLICH kein legaler Zug", () => {
  // Es zeigt ja gerade, dass der Springer nicht wegkann. Wäre es legal, würde die Animation
  // das Gegenteil der Aussage behaupten.
  const i = MOTIV_EINFUEHRUNGEN.fesselung.schritte.findIndex((s) => s.wackeln);
  assert.ok(i >= 0, "die Fesselungsfolge hat kein Wackeln mehr");
  const a = animationNachSchritt("fesselung", i);
  assert.equal(a.bleibt, false);
  const b = new Chess(bildFuerSchritt("fesselung", i).fen);
  const legal = b.moves({ verbose: true }).some((m) => m.from === a.von && m.to === a.nach);
  assert.equal(legal, false, "der gefesselte Springer dürfte diesen Zug nicht machen können");
});

test("jede Folge bleibt ein Lehrbild, keine Übungsstellung (höchstens 6 Figuren)", () => {
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      const n = bildFuerSchritt(id, i).figuren.length;
      assert.ok(n <= 6, `${id}/${i}: ${n} Figuren — zu viel für eine Einführung`);
    }
  }
});

test("das Heldenfeld trägt immer eine WEISSE Figur", () => {
  // Der goldene Sockel bedeutet „das ist deine Figur" (siehe styles.pieceSockel in Board.tsx).
  // Läge er je auf einer schwarzen, wäre die Aussage falsch — und genau das passiert leicht,
  // wenn der Held geschlagen wird (Beschützen, erstes Brett).
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      const bild = bildFuerSchritt(id, i);
      const figur = bild.figuren.find((f) => f.feld === bild.held);
      assert.ok(figur, `${id}/${i}: auf dem Heldenfeld ${bild.held} steht gar nichts`);
      assert.ok(figur.code.startsWith("w"), `${id}/${i}: Heldenfeld ${bild.held} trägt ${figur.code}`);
    }
  }
});

test("Blickfang, Linien und Bedrohungen zeigen nie auf ein leeres Feld", () => {
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      const bild = bildFuerSchritt(id, i);
      const belegt = new Set(bild.figuren.map((f) => f.feld));
      for (const f of bild.blickfang) {
        assert.ok(belegt.has(f), `${id}/${i}: Blickfang auf leerem Feld ${f}`);
      }
      for (const f of bild.linie ? [bild.linie.von, bild.linie.bis] : []) {
        assert.ok(belegt.has(f), `${id}/${i}: Linie endet auf leerem Feld ${f}`);
      }
      for (const f of bild.bedrohung ? [bild.bedrohung.angreifer, bild.bedrohung.bedroht] : []) {
        assert.ok(belegt.has(f), `${id}/${i}: Bedrohung zeigt auf leeres Feld ${f}`);
      }
    }
  }
});

test("jeder animierte Zug startet auf einer Figur", () => {
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      const a = animationNachSchritt(id, i);
      if (!a) continue;
      const belegt = new Set(bildFuerSchritt(id, i).figuren.map((f) => f.feld));
      assert.ok(belegt.has(a.von), `${id}/${i}: Animation startet auf leerem Feld ${a.von}`);
    }
  }
});

// ============================================================================
// 2. Die didaktischen Behauptungen
// ============================================================================

/** Stellung NACH dem Schritt `i` — also das, was der nächste Schritt zeigt. */
function fenNach(id, i) {
  return i + 1 < anzahlSchritte(id) ? bildFuerSchritt(id, i + 1).fen : null;
}

test("Figur gewinnen: das Bild trägt Beispiel UND Gegenbeispiel", () => {
  const b = new Chess(MOTIV_EINFUEHRUNGEN.figurGewinnen.startFen);
  assert.equal(b.attackers("d6", "b").length, 0, "der Springer d6 müsste UNGEDECKT sein");
  assert.ok(b.attackers("f6", "b").includes("g7"), "der Läufer f6 müsste von g7 GEDECKT sein");
});

test("Figur gewinnen: nach dem Schlagen schlägt wirklich nichts zurück", () => {
  const i = MOTIV_EINFUEHRUNGEN.figurGewinnen.schritte.findIndex((s) => s.zug);
  const b = new Chess(fenNach("figurGewinnen", i));
  assert.equal(b.attackers("d6", "b").length, 0, "auf d6 schlägt etwas zurück");
  assert.equal(b.isCheck(), false, "nebenbei entsteht ein Schach — das lenkt ab");
});

test("Beschützen: ohne Beschützer schlägt nichts zurück, mit Beschützer schon", () => {
  const folge = MOTIV_EINFUEHRUNGEN.beschuetzen;
  const zuege = folge.schritte.map((s, i) => (s.zug ? i : -1)).filter((i) => i >= 0);
  assert.equal(zuege.length, 3, "erwartet: schlagen (Brett A), schlagen und zurückschlagen (Brett B)");

  // Brett A: der Läufer hat niemanden.
  const nachA = new Chess(fenNach("beschuetzen", zuege[0]));
  assert.equal(nachA.attackers("d4", "w").length, 0, "auf Brett A dürfte nichts zurückschlagen");

  // Brett B: genau das ist der Unterschied.
  const vorB = new Chess(bildFuerSchritt("beschuetzen", zuege[1]).fen);
  assert.ok(vorB.attackers("d4", "w").includes("d1"), "auf Brett B müsste der Turm d1 decken");
});

test("Gabel: der König steht wirklich im Schach und die Dame gleichzeitig unter Beschuss", () => {
  const i = MOTIV_EINFUEHRUNGEN.gabel.schritte.findIndex((s) => s.zug);
  const b = new Chess(fenNach("gabel", i));
  assert.ok(b.isCheck(), "ohne Schach MUSS der König nicht weichen — dann ist es keine Gabel");
  assert.ok(b.attackers("d7", "w").includes("f6"), "die Dame müsste gleichzeitig angegriffen sein");
});

test("Gabel: am Ende steht der Gewinn wirklich", () => {
  const letzterZug = MOTIV_EINFUEHRUNGEN.gabel.schritte.reduce((a, s, i) => (s.zug ? i : a), -1);
  const b = new Chess(fenNach("gabel", letzterZug));
  assert.equal(b.attackers("d7", "b").length, 0, "die geschlagene Dame wird zurückgeholt");
});

test("Fesselung: der Springer hat nach dem Bauernzug NULL legale Züge", () => {
  // Das ist die ganze Lektion. Stimmt es nicht, lehrt die Animation das Gegenteil.
  const i = MOTIV_EINFUEHRUNGEN.fesselung.schritte.findIndex((s) => s.zug);
  const b = new Chess(fenNach("fesselung", i));
  assert.ok(b.attackers("e6", "w").includes("d5"), "der Bauer d5 müsste den Springer angreifen");
  const springerZuege = b.moves({ verbose: true }).filter((m) => m.piece === "n");
  assert.equal(springerZuege.length, 0, `der Springer kann fliehen (${springerZuege.length} Züge)`);
});

test("Spieß: der König kann NICHT auf der Linie bleiben", () => {
  const i = MOTIV_EINFUEHRUNGEN.spiess.schritte.findIndex((s) => s.zug);
  const b = new Chess(fenNach("spiess", i));
  assert.ok(b.isCheck(), "ohne Schach ist es kein Spieß");
  const aufLinie = b.moves({ verbose: true }).filter((m) => m.to[0] === "a");
  assert.equal(aufLinie.length, 0, `der König kann auf der a-Linie bleiben (${aufLinie.map((m) => m.to)})`);
});

test("Verteidigen: die Rettung rettet wirklich", () => {
  const folge = MOTIV_EINFUEHRUNGEN.verteidigen;
  const rettung = folge.schritte.findIndex((s) => s.zug && s.zug.von === "f2");
  assert.ok(rettung >= 0, "die Rettung (Turm zieht weg) fehlt");
  const b = new Chess(fenNach("verteidigen", rettung));
  assert.equal(b.attackers("a2", "b").length, 0, "der Turm ist auch auf a2 angegriffen");
  assert.equal(b.isCheck(), false, "nebenbei entsteht ein Schach");
});

test("Verteidigen: die Folge springt wirklich auf die Ausgangsstellung zurück", () => {
  // Der Teil „was passiert, wenn man nichts tut" hat nur Sinn, wenn danach wieder die
  // ungerettete Stellung steht.
  const folge = MOTIV_EINFUEHRUNGEN.verteidigen;
  const zurueck = folge.schritte.findIndex((s) => s.stellung);
  assert.ok(zurueck >= 0, "der Rücksprung fehlt");
  assert.equal(bildFuerSchritt("verteidigen", zurueck).fen, folge.startFen);
});

// ============================================================================
// 3. Die Sprachregeln
// ============================================================================

function alleZeilen() {
  const raus = [];
  for (const id of ALLE) {
    const f = MOTIV_EINFUEHRUNGEN[id];
    for (let i = 0; i < f.schritte.length; i++) raus.push({ id, i, ...f.schritte[i] });
    raus.push({ id, i: "erinnerung", de: f.erinnerungDe, en: f.erinnerungEn });
  }
  return raus;
}

test("jede Zeile hat eine deutsche UND eine englische Fassung", () => {
  for (const z of alleZeilen()) {
    assert.ok(z.de && z.de.trim(), `${z.id}/${z.i}: deutsche Zeile fehlt`);
    assert.ok(z.en && z.en.trim(), `${z.id}/${z.i}: englische Zeile fehlt`);
    assert.notEqual(z.de, z.en, `${z.id}/${z.i}: deutsch und englisch sind identisch`);
  }
});

test('keine Zeile sagt "erobern"', () => {
  // Festlegung aus der Lückenanalyse: es heißt "schlagen".
  for (const z of alleZeilen()) {
    assert.ok(!/erober/i.test(z.de), `${z.id}/${z.i}: "${z.de}"`);
  }
});

test("keine Zeile nennt eine Feldkoordinate", () => {
  // Ein fünfjähriges Kind liest kein "f6". Es heißt immer "das leuchtende Feld".
  for (const z of alleZeilen()) {
    const treffer = z.de.match(/\b[a-h][1-8]\b/);
    assert.equal(treffer, null, `${z.id}/${z.i}: "${z.de}" enthält ${treffer && treffer[0]}`);
  }
});

test("keine räumlichen Wörter für Deckung (Christian, 2026-09-19)", () => {
  // "Such immer die Figur, hinter der niemand steht" war die beanstandete Formulierung: Deckung
  // ist keine Ortseigenschaft, ein Beschützer kann seitlich, davor oder diagonal stehen.
  //
  // Zwei Regeln, nicht eine:
  //   (a) Raumwort UND Schutzbegriff in derselben Zeile. Nicht das Raumwort an sich — "Direkt
  //       hinter ihm steht sein König" beschreibt eine Fesselung und ist dort genau richtig.
  //   (b) "allein" überhaupt, weil das Alleinsein die Deckung schon für sich räumlich erklärt.
  //       Genau eine Zeile darf das: die allererste von "Beschützen", die den Begriff erst
  //       anbahnt, bevor es ihn gibt.
  //
  // KEIN \b um die Schutzbegriffe: "ü" ist in JavaScript kein Wortzeichen, dadurch scheitert
  // /\bbeschütz\b/ ausgerechnet an "beschützt". Beim ersten Entwurf dieses Tests ist genau
  // Christians Originalsatz deshalb unbemerkt durchgerutscht (Gegenprobe 2026-09-19).
  const AUSNAHME = "Er steht ganz allein auf dem Brett.";
  const raum = /(dahinter|hinter (ihm|ihr|der|dem|den)|daneben|davor|allein|niemand steht)/i;
  const schutz = /(beschütz|gedeckt|schützt|Schutz|Beschützer)/i;
  for (const z of alleZeilen()) {
    if (z.de === AUSNAHME) continue;
    assert.equal(
      raum.test(z.de) && schutz.test(z.de),
      false,
      `${z.id}/${z.i}: "${z.de}" beschreibt Deckung über einen Ort`
    );
    assert.equal(/allein/i.test(z.de), false, `${z.id}/${z.i}: "${z.de}" — "allein" nur in der Ausnahme`);
  }
  // Die Ausnahme muss es wirklich geben, sonst prüft die Zeile oben ins Leere.
  assert.ok(
    alleZeilen().some((z) => z.de === AUSNAHME),
    "die namentlich erlaubte Ausnahme steht nicht mehr in den Folgen"
  );
});

test('die Begriffsbrücke steht in genau der etablierten Form', () => {
  // "Das nennt man in der Schachwelt: X." — dasselbe Muster wie bei Schach, Matt, Rochade,
  // Umwandlung. Ein Motiv ohne Namensgebung hätte das Kind am Ende nicht benennen können.
  for (const id of ["gabel", "fesselung", "spiess"]) {
    const letzte = MOTIV_EINFUEHRUNGEN[id].schritte.at(-1).de;
    assert.match(letzte, /^Das nennt man in der Schachwelt: .+\.$/, `${id}: "${letzte}"`);
  }
  // Beschützen führt zwei Begriffe ein und darf deshalb von der Form abweichen.
  assert.match(
    MOTIV_EINFUEHRUNGEN.beschuetzen.schritte.map((s) => s.de).join(" "),
    /nennt man in der Schachwelt: gedeckt/
  );
});

test("keine Zeile ist zu lang für einen Atemzug", () => {
  // Grenze aus der Praxis der bestehenden Bonuskapitel-Zeilen. Eine zu lange Zeile blockiert
  // die Bedienung entsprechend lange (nicht überspringbar) und verliert ein fünfjähriges Kind.
  for (const z of alleZeilen()) {
    assert.ok(z.de.length <= 90, `${z.id}/${z.i}: ${z.de.length} Zeichen — "${z.de}"`);
  }
});

// ============================================================================
// 4. Zuordnung zu den Spalten
// ============================================================================

test("jede Spalte, der ein Motiv zugeordnet ist, gibt es wirklich", () => {
  // Fängt Tippfehler, die der Compiler hier nicht fangen kann (siehe Kommentar bei
  // MOTIV_JE_SPALTE — bewusst keine .ts-Abhängigkeit, damit dieses Modul ladbar bleibt).
  const echte = new Set(ENDLOSMODUS_SPALTEN.map((s) => s.id));
  for (const s of ENDLOSMODUS_SPALTEN) {
    const m = motivFuerSpalte(s.id);
    if (m) assert.ok(ALLE.includes(m), `${s.id}: unbekanntes Motiv "${m}"`);
  }
  // Und andersherum: keine Zuordnung auf eine Spalte, die es nicht gibt.
  for (const id of [
    "eichhoernchen_figurGewinnen",
    "dachshoehle_figurGewinnen",
    "eichhoernchen_gabel",
    "rabenfels_fesselungSetzen",
    "adlerhorst_fesselung",
    "wolfsfeste_fesselung",
    "adlerhorst_spiess",
  ]) {
    assert.ok(echte.has(id), `zugeordnete Spalte "${id}" existiert nicht (mehr)`);
    assert.ok(motivFuerSpalte(id), `Spalte "${id}" hat keine Einführung mehr`);
  }
});

test("die bewusst einführungslosen Spalten bleiben einführungslos", () => {
  // Schach und Rochade sind Regeln, die Quest 6 bzw. das Rochade-Kapitel ausführlich zeigen.
  // Steht hier eines Tages doch eine Einführung, soll das eine Entscheidung sein, kein Versehen.
  for (const id of ["rabenfels_schach", "dachshoehle_schach", "dachshoehle_rochade"]) {
    assert.equal(motivFuerSpalte(id), null, `${id} hat unerwartet eine Einführung bekommen`);
  }
});

test("eine unbekannte Spalte liefert null statt zu werfen", () => {
  assert.equal(motivFuerSpalte("gibtsnicht"), null);
});

test("dieselbe Fesselungs-Einführung hängt an allen drei Fesselungs-Spalten", () => {
  // Fortschritt wird je MOTIV gespeichert, nicht je Spalte — sonst sähe ein Kind dieselbe
  // Einführung an drei Revieren erneut.
  const m = ["rabenfels_fesselungSetzen", "adlerhorst_fesselung", "wolfsfeste_fesselung"].map(motivFuerSpalte);
  assert.deepEqual(m, ["fesselung", "fesselung", "fesselung"]);
});

// ============================================================================
// 5. Ablaufmechanik
// ============================================================================

test("der Sprechschlüssel ist bei jedem Schritt und jedem Durchlauf ein anderer", () => {
  // Ändert er sich nicht, spricht Lux die nächste Zeile nicht — und die Folge bleibt stehen,
  // weil die Animation auf das Sprechende wartet.
  const gesehen = new Set();
  for (const id of ALLE) {
    for (const durchlauf of [0, 1]) {
      for (let i = 0; i < anzahlSchritte(id); i++) {
        const k = sprechSchluessel(id, i, durchlauf);
        assert.ok(!gesehen.has(k), `Schlüssel doppelt: ${k}`);
        gesehen.add(k);
      }
    }
  }
});

test("bildFuerSchritt rechnet immer von vorn — zweimal gefragt, zweimal dasselbe", () => {
  // Die Folge lässt sich mittendrin neu starten (Lux antippen). Hinge das Bild an einem
  // fortgeschriebenen Zustand, wäre sie danach verschoben.
  for (const id of ALLE) {
    for (let i = 0; i < anzahlSchritte(id); i++) {
      assert.equal(bildFuerSchritt(id, i).fen, bildFuerSchritt(id, i).fen);
    }
  }
  // Und rückwärts gefragt kommt dasselbe heraus wie vorwärts.
  const vorwaerts = [];
  for (let i = 0; i < anzahlSchritte("gabel"); i++) vorwaerts.push(bildFuerSchritt("gabel", i).fen);
  const rueckwaerts = [];
  for (let i = anzahlSchritte("gabel") - 1; i >= 0; i--) rueckwaerts.unshift(bildFuerSchritt("gabel", i).fen);
  assert.deepEqual(rueckwaerts, vorwaerts);
});

test("ein Schritt außerhalb der Folge wirft statt still etwas Falsches zu zeigen", () => {
  assert.throws(() => schritt("gabel", anzahlSchritte("gabel")));
  assert.throws(() => schritt("gabel", -1));
});

test("jede Folge endet mit einer Zeile ohne Animation", () => {
  // Sonst läuft am Schluss eine Animation, auf die niemand mehr wartet, und der Screen
  // schaltet weiter, während sich noch etwas bewegt.
  for (const id of ALLE) {
    assert.equal(animationNachSchritt(id, anzahlSchritte(id) - 1), null, `${id}`);
  }
});

test("jede Folge bleibt unter einer Minute", () => {
  // Grobe Schätzung mit 17 Zeichen/Sekunde (siehe MINDEST_MS_PRO_ZEICHEN in
  // useLuxSprechzeile.ts) plus Zeilenpause plus Animationsdauer. Das Konzept nennt 40–60
  // Sekunden als Erwartung und den Gerätetest als endgültige Instanz — dieser Test hält nur
  // fest, dass niemand unbemerkt eine achte Zeile anhängt, bis es zu lang wird.
  for (const id of ALLE) {
    let ms = 0;
    for (let i = 0; i < anzahlSchritte(id); i++) {
      ms += schritt(id, i).de.length * 60 + 600;
      if (animationNachSchritt(id, i)) ms += 800;
    }
    assert.ok(ms <= 60000, `${id}: geschätzt ${Math.round(ms / 1000)} s`);
  }
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen (von ${passed + failed} Tests)\n`);
if (failed > 0) {
  for (const f of failures) {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.err.message}\n`);
  }
  process.exit(1);
}
console.log("Alle Motiv-Einführungs-Tests grün.");
process.exit(0);
