// Die animierten Motiv-Einführungen: Daten und Ablauflogik.
//
// Hintergrund (Christian, 2026-09-19): „Eine vollständige Animation, umfassend von Lux erklärt
// und einleitend direkt auf das Wesentliche fokussiert (Schau dir diese Stellung an, achte auf
// den schwarzen Turm vor dem König) und dann kommt die eigentliche Erklärung und Schritt für
// Schritt für die Taktik gezeigt." Ausdrücklich NICHT als Standbild-Folge zum Durchklicken:
// „Das Standbild setzt voraus, dass das Kind in Ruhe die Themen durchklickt, das ist nicht
// immer der Fall."
//
// Konzept und Herleitung: claude/ChessLynx_Motiv_Einfuehrungen_2026-09-19.docx, Teile 1 und 3.
// Alle Stellungen und alle Züge sind gegen chess.js 1.4 geprüft
// (verify/verify_motiv_einfuehrungen.cjs) — jede Folge einmal ganz durchgespielt, inklusive der
// Behauptung, die Lux nach jedem Schritt aufstellt („nichts schlägt zurück", „der Springer kann
// nicht fliehen", „er kann nicht auf der Linie bleiben").
//
// ── Warum dieses Modul React-frei ist ────────────────────────────────────────────────────────
// Wie endlosmodusStufen.ts, boardDemo.ts und lobAuswahl.ts (siehe dortige Kopfkommentare):
// ein reines TS-Modul lässt sich per `ts.transpileModule` + `Module._compile` in verify/*.cjs
// laden und wirklich ausführen, eine RN-Komponente nicht. Deshalb liegt hier ALLES, bei dem man
// sich vertun kann — welche Stellung in welchem Schritt auf dem Brett steht, welche Figur sich
// bewegt, was der Blickfang gerade umkreist — und in der Komponente nur noch das Zeichnen.
//
// `chess.js` ist der einzige Laufzeit-Import und bewusst zugelassen: es ist ein echtes
// npm-Paket, das der Test-Harness über `Module._nodeModulePaths` auflösen kann. Ein Import aus
// chessEngine.ts wäre dagegen ein .ts-Import und würde das Laden im Test unmöglich machen —
// deshalb arbeitet dieses Modul durchgehend in algebraischer Notation ("e4") und überlässt die
// Umrechnung nach {row, col} der aufrufenden Komponente (chessEngine.ts/fromAlgebraic).
//
// ── Sprachregeln, die in JEDER Zeile hier gelten ─────────────────────────────────────────────
// (aus der Lückenanalyse vom 19.09. und Christians Korrektur am selben Tag)
//   · „schlagen", nie „erobern".
//   · „Beschützer/beschützen" als Alltagswort, „gedeckt/ungedeckt" nur als Begriffsbrücke.
//   · KEINE räumlichen Wörter für Deckung. Nicht „hinter der niemand steht" — ein Beschützer
//     kann seitlich, davor oder diagonal stehen. Immer „hat einen/keinen Beschützer".
//     Einzige Ausnahme: die allererste Zeile von „Beschützen", die den Begriff erst anbahnt.
//   · Und nicht „von deinen Figuren": beim Motiv „Figur gewinnen" sucht das Kind eine
//     GEGNERISCHE Figur, die von deren eigenen Figuren beschützt würde.
//   · Keine Feldkoordinaten. Ein fünfjähriges Kind liest kein „f6".
//   · Kein Konjunktiv, höchstens ein neuer Begriff je Äußerung.
//
// ── Offener Punkt: die englischen Zeilen ─────────────────────────────────────────────────────
// Die englischen Fassungen hier sind ROHÜBERSETZUNGEN und noch nicht gegengelesen. Am 18.09.
// mussten die englischen Zeilen der Revier-Ankunft schon einmal von Christian nachgebessert
// werden, weil sie neue Übersetzungen waren. Das Konzept sieht dafür einen eigenen Durchgang
// nach der deutschen Freigabe vor (siehe .docx, Teil 7, „Offene Punkte").

import { Chess } from "chess.js";

export type MotivId =
  | "beschuetzen"
  | "figurGewinnen"
  | "verteidigen"
  | "gabel"
  | "fesselung"
  | "spiess";

/** Algebraisches Feld, z. B. "e4". Wird dem Kind nie angezeigt (siehe chessEngine.ts). */
export type Feld = string;

/**
 * Ein Schritt der Einführung: eine Sprechzeile und das, was dabei auf dem Brett zu sehen ist.
 *
 * TAKT (Konzept, Teil 1): Erst wird die Zeile zu Ende gesprochen, DANN läuft die Animation
 * dieses Schritts. Es gibt keinen Tipp zum Weiterblättern — ein Kind, das schnell tippt, kann
 * die Erklärung nicht überholen. Deshalb ist `zug` immer das, was NACH der Zeile passiert, und
 * `blickfang`/`linie`/`bedrohung` das, was WÄHREND der Zeile zu sehen ist.
 */
export type EinfuehrungsSchritt = {
  de: string;
  en: string;
  /** Felder, auf denen der goldene Blickfang-Ring pulsiert, während die Zeile läuft. */
  blickfang?: readonly Feld[];
  /** Goldene Ketten-/Schutzlinie (Board.tsx: `kettenlinie`) — „der beschützt ihn". */
  linie?: { von: Feld; bis: Feld };
  /** Orangefarbene Bedrohungslinie (Board.tsx: `angreiferAt`/`bedrohtAt`) — „der schaut ihn an". */
  bedrohung?: { angreifer: Feld; bedroht: Feld };
  /**
   * Zug, der nach der Zeile animiert wird und STEHEN BLEIBT (Board.tsx: `demoBleibt`).
   * Wird auf die Stellung angewendet, der nächste Schritt sieht das Ergebnis.
   */
  zug?: { von: Feld; nach: Feld };
  /**
   * Ausschlag hin und zurück, ohne die Stellung zu ändern — für „Aber er kann nicht. Gar
   * nicht." Das ist genau die bisherige Vorführ-Animation OHNE `demoBleibt`, es braucht dafür
   * keine eigene Mechanik. Der Zug ist absichtlich NICHT legal; er wird deshalb auch nie auf
   * die Stellung angewendet.
   */
  wackeln?: { von: Feld; nach: Feld };
  /**
   * Setzt das Brett vor dieser Zeile auf eine andere Stellung. Zwei Verwendungen:
   * „Jetzt machen wir das noch einmal" (Beschützen: zweites Brett mit Beschützer) und
   * „Noch einmal von vorn" (Verteidigen: zurück vor den verlorenen Turm).
   */
  stellung?: string;
};

export type MotivEinfuehrung = {
  motivId: MotivId;
  /** Überschrift des Screens. Nennt das Motiv, bevor Lux es erklärt. */
  titelDe: string;
  titelEn: string;
  startFen: string;
  /**
   * Feld der Figur, die den goldenen Sockel bekommt („das ist deine Figur", siehe
   * styles.pieceSockel in Board.tsx). Wandert mit, wenn diese Figur zieht — und fällt auf den
   * eigenen König zurück, falls sie geschlagen wird (Beschützen, erstes Brett).
   */
  heldStart: Feld;
  /** Kurzer Satz beim Wiederbesuch statt der vollen Folge (siehe Konzept, Teil 1). */
  erinnerungDe: string;
  erinnerungEn: string;
  schritte: readonly EinfuehrungsSchritt[];
};

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Die sechs Folgen
// ═════════════════════════════════════════════════════════════════════════════════════════════
//
// Anmerkung zur Zählung: Der Konzeptentwurf sprach in einer Überschrift von „sieben
// Einführungen" — das war ein Zählfehler in der Überschrift, nicht im Inhalt. Es sind sechs
// Motive; „Schach lösen" und „Rochade" haben bewusst keine bekommen, weil beides Regeln sind,
// die Quest 6 bzw. das Rochade-Kapitel bereits ausführlich zeigen (siehe .docx, Teil 7).

const BESCHUETZEN: MotivEinfuehrung = {
  motivId: "beschuetzen",
  titelDe: "Beschützen",
  titelEn: "Protecting",
  // Zwei Bretter, identisch bis auf den weißen Turm auf d1. Die einzige Folge mit einem
  // Stellungswechsel als Inhalt statt als Mittel: Der Kontrast IST hier die Lektion.
  startFen: "k2r4/8/8/8/3B4/8/8/7K b - - 0 1",
  heldStart: "d4",
  erinnerungDe: "Weißt du noch? Eine Figur ohne Beschützer ist in Gefahr.",
  erinnerungEn: "Remember? A piece with no protector is in danger.",
  schritte: [
    { de: "Schau dir diesen Läufer an.", en: "Look at this bishop.", blickfang: ["d4"] },
    // Einzige Stelle mit einem räumlichen Wort — hier bahnt es den Begriff erst an, es
    // beschreibt ihn nicht (siehe Sprachregeln im Kopfkommentar).
    { de: "Er steht ganz allein auf dem Brett.", en: "He is all alone on the board.", blickfang: ["d4"] },
    {
      de: "Und der große Turm da oben schaut ihn schon an.",
      en: "And the big rook up there is already looking at him.",
      blickfang: ["d8"],
      bedrohung: { angreifer: "d8", bedroht: "d4" },
    },
    {
      de: "Pass auf, was jetzt passiert.",
      en: "Watch what happens now.",
      bedrohung: { angreifer: "d8", bedroht: "d4" },
    },
    { de: "Weg ist er.", en: "And he's gone.", zug: { von: "d8", nach: "d4" } },
    { de: "Und niemand konnte ihm helfen.", en: "And nobody could help him.", blickfang: ["d4"] },
    {
      de: "Jetzt machen wir das noch einmal.",
      en: "Now let's do that again.",
      stellung: "k2r4/8/8/8/3B4/8/8/3R3K b - - 0 1",
    },
    { de: "Aber diesmal ist ein Freund dabei.", en: "But this time a friend is here.", blickfang: ["d1"] },
    {
      de: "Siehst du die goldene Linie? Dein Turm passt auf den Läufer auf.",
      en: "See the golden line? Your rook is watching over the bishop.",
      linie: { von: "d1", bis: "d4" },
    },
    { de: "Er beschützt ihn.", en: "He protects him.", linie: { von: "d1", bis: "d4" } },
    { de: "Pass wieder auf.", en: "Watch again.", linie: { von: "d1", bis: "d4" } },
    { de: "Er hat ihn geschlagen!", en: "He captured him!", zug: { von: "d8", nach: "d4" } },
    {
      de: "Aber schau — dein Turm holt ihn sich sofort.",
      en: "But look — your rook takes him right back.",
      zug: { von: "d1", nach: "d4" },
    },
    { de: "Für den Gegner hat sich das nicht gelohnt.", en: "That wasn't worth it for the opponent." },
    // Die Begriffsbrücke, dasselbe Muster wie bei Schach, Matt, Fesselung, Rochade.
    {
      de: "Eine Figur mit Beschützer nennt man in der Schachwelt: gedeckt.",
      en: "In the chess world, a piece with a protector is called: defended.",
    },
    {
      de: "Und eine ohne Beschützer? Die ist ungedeckt.",
      en: "And one without a protector? That one is undefended.",
    },
  ],
};

const FIGUR_GEWINNEN: MotivEinfuehrung = {
  motivId: "figurGewinnen",
  titelDe: "Figur gewinnen",
  titelEn: "Winning a piece",
  // Diese Stellung trägt Beispiel UND Gegenbeispiel im selben Bild: der Springer d6 ist
  // ungedeckt, der Läufer f6 wird vom Bauern g7 gedeckt. Genau diese Unterscheidung verlangt
  // die Spalte ab Stufe 2 — hier wird sie zum ersten Mal gezeigt statt vorausgesetzt.
  startFen: "7k/6p1/3n1b2/8/8/8/8/3R3K w - - 0 1",
  heldStart: "d1",
  erinnerungDe: "Such die Figur ohne Beschützer.",
  erinnerungEn: "Look for the piece with no protector.",
  schritte: [
    { de: "Schau dir diese Stellung an.", en: "Look at this position." },
    {
      de: "Da drüben stehen zwei gegnerische Figuren.",
      en: "Over there stand two of the opponent's pieces.",
      blickfang: ["d6", "f6"],
    },
    {
      de: "Eine davon hat einen Beschützer.",
      en: "One of them has a protector.",
      blickfang: ["g7"],
      linie: { von: "g7", bis: "f6" },
    },
    { de: "Die andere hat keinen.", en: "The other one doesn't.", blickfang: ["d6"] },
    { de: "Die kannst du dir holen.", en: "That one you can take.", blickfang: ["d6"] },
    { de: "Pass auf.", en: "Watch." },
    {
      de: "Weg ist er. Und nichts schlägt zurück.",
      en: "And he's gone. And nothing takes back.",
      zug: { von: "d1", nach: "d6" },
    },
    {
      de: "Bei der anderen wäre das schiefgegangen.",
      en: "With the other one that would have gone wrong.",
      blickfang: ["f6", "g7"],
      linie: { von: "g7", bis: "f6" },
    },
    {
      de: "Such immer die Figur, die keinen Beschützer hat.",
      en: "Always look for the piece that has no protector.",
    },
  ],
};

const VERTEIDIGEN: MotivEinfuehrung = {
  motivId: "verteidigen",
  titelDe: "In Sicherheit bringen",
  titelEn: "Getting to safety",
  // Die einzige Folge, die zuerst zeigt, WAS PASSIERT, WENN MAN NICHTS TUT. Ohne diesen Teil
  // ist nicht erkennbar, wozu die Rettung gut ist.
  startFen: "7k/8/8/2b5/8/8/5R2/7K w - - 0 1",
  heldStart: "f2",
  erinnerungDe: "Welche deiner Figuren ist in Gefahr?",
  erinnerungEn: "Which of your pieces is in danger?",
  schritte: [
    { de: "Schau, dein Turm steht hier unten.", en: "Look, your rook is down here.", blickfang: ["f2"] },
    {
      de: "Und der Läufer da oben schaut ihn an.",
      en: "And the bishop up there is looking at him.",
      blickfang: ["c5"],
      bedrohung: { angreifer: "c5", bedroht: "f2" },
    },
    {
      de: "Dein Turm ist ungedeckt.",
      en: "Your rook is undefended.",
      bedrohung: { angreifer: "c5", bedroht: "f2" },
    },
    {
      de: "Stell dir vor, du machst irgendetwas anderes …",
      en: "Imagine you do something else …",
      bedrohung: { angreifer: "c5", bedroht: "f2" },
      zug: { von: "h1", nach: "g1" },
    },
    { de: "… dann ist dein Turm weg.", en: "… then your rook is gone.", zug: { von: "c5", nach: "f2" } },
    {
      de: "Das wollen wir nicht. Noch einmal von vorn.",
      en: "We don't want that. Let's start again.",
      stellung: "7k/8/8/2b5/8/8/5R2/7K w - - 0 1",
    },
    {
      de: "Bring ihn lieber in Sicherheit.",
      en: "Better bring him to safety.",
      bedrohung: { angreifer: "c5", bedroht: "f2" },
      zug: { von: "f2", nach: "a2" },
    },
    { de: "Jetzt kann der Läufer ihm nichts mehr tun.", en: "Now the bishop can't do anything to him." },
    { de: "Es gibt drei Wege, eine Figur zu retten.", en: "There are three ways to save a piece." },
    // Der Konzeptentwurf hatte die drei Wege in EINER Zeile und merkte selbst an, dass das
    // gegen die Regel „höchstens ein neuer Begriff je Äußerung" verstößt, mit dem Vorschlag,
    // sie bei Bedarf aufzuteilen. Hier gleich aufgeteilt: Es kostet nichts, jede Zeile bekommt
    // durch die Zeilenpause (ZEILEN_PAUSE_MS in useLuxSprechzeile.ts) ihren eigenen Atemzug,
    // und für ein fünfjähriges Kind sind drei kurze Sätze leichter als einer mit drei Begriffen.
    { de: "Wegziehen.", en: "Move away." },
    { de: "Einen Beschützer dazuholen.", en: "Bring in a protector." },
    { de: "Oder den Angreifer schlagen.", en: "Or capture the attacker." },
  ],
};

const GABEL: MotivEinfuehrung = {
  motivId: "gabel",
  titelDe: "Gabel",
  titelEn: "Fork",
  // Die reinste Form: Springer, König, Dame — mehr nicht. Der König MUSS weichen (Schach),
  // deshalb ist der Gewinn zwingend und nicht bloß wahrscheinlich.
  startFen: "6k1/3q4/8/8/4N3/8/8/7K w - - 0 1",
  heldStart: "e4",
  erinnerungDe: "Such den Zug, der zwei auf einmal bedroht.",
  erinnerungEn: "Look for the move that threatens two at once.",
  schritte: [
    { de: "Schau dir diese Stellung an.", en: "Look at this position." },
    { de: "Achte auf deinen Springer hier.", en: "Pay attention to your knight here.", blickfang: ["e4"] },
    {
      de: "Und auf diese beiden: den König und die Dame.",
      en: "And to these two: the king and the queen.",
      blickfang: ["g8", "d7"],
    },
    { de: "Jetzt pass auf.", en: "Now watch." },
    { de: "Er bedroht beide auf einmal.", en: "He threatens both at once.", zug: { von: "e4", nach: "f6" } },
    // Board.tsx kann nur EINE Bedrohungslinie zeichnen. Deshalb zeigt dieser Schritt die Linie
    // zum König (das ist das Zwingende — Schach) und umkreist zusätzlich die Dame. Eine zweite
    // Linie wäre eine weitere Board-Erweiterung; der Ring leistet hier dasselbe.
    {
      de: "Der König steht im Schach. Er muss weg.",
      en: "The king is in check. He has to move.",
      bedrohung: { angreifer: "f6", bedroht: "g8" },
      blickfang: ["d7"],
      zug: { von: "g8", nach: "h8" },
    },
    { de: "Und jetzt kann ihr niemand mehr helfen.", en: "And now nobody can help her.", blickfang: ["d7"] },
    { de: "Weg ist sie.", en: "And she's gone.", zug: { von: "f6", nach: "d7" } },
    { de: "Eine Figur hat zwei auf einmal bedroht.", en: "One piece threatened two at once." },
    { de: "Der Gegner konnte nur eine retten.", en: "The opponent could only save one." },
    { de: "Das nennt man in der Schachwelt: Gabel.", en: "In the chess world that's called: a fork." },
  ],
};

const FESSELUNG: MotivEinfuehrung = {
  motivId: "fesselung",
  titelDe: "Fesselung",
  titelEn: "Pin",
  // Der Unterschied zum bestehenden Kapitel bonus/Fesselung.tsx: Dort wird gezeigt, DASS eine
  // Figur gefesselt ist. Hier wird gezeigt, WOZU das gut ist — man greift sie an, und sie kann
  // nicht weglaufen. chess.js bestätigt: nach dem Bauernzug hat der Springer null legale Züge.
  startFen: "4k3/8/4n3/8/3P4/8/8/4R2K w - - 0 1",
  heldStart: "d4",
  erinnerungDe: "Eine gefesselte Figur kann nicht weglaufen.",
  erinnerungEn: "A pinned piece cannot run away.",
  schritte: [
    { de: "Schau dir diesen Springer an.", en: "Look at this knight.", blickfang: ["e6"] },
    { de: "Direkt hinter ihm steht sein König.", en: "Right behind him stands his king.", blickfang: ["e8"] },
    {
      de: "Und dein Turm schaut genau durch ihn hindurch.",
      en: "And your rook is looking right through him.",
      linie: { von: "e1", bis: "e8" },
    },
    {
      de: "Er ist an seinen König gekettet.",
      en: "He is chained to his king.",
      linie: { von: "e1", bis: "e8" },
      blickfang: ["e6"],
    },
    { de: "Jetzt greift dein Bauer ihn an.", en: "Now your pawn attacks him.", zug: { von: "d4", nach: "d5" } },
    {
      de: "Normalerweise würde er einfach weglaufen.",
      en: "Normally he would simply run away.",
      blickfang: ["e6"],
      linie: { von: "e1", bis: "e8" },
    },
    // Der Ausschlag hin und zurück IST die bisherige Vorführ-Animation ohne `demoBleibt` —
    // keine eigene Mechanik nötig. Bewusst kein legaler Zug: Der Springer kann ja gerade nicht.
    {
      de: "Aber er kann nicht. Gar nicht.",
      en: "But he can't. Not at all.",
      linie: { von: "e1", bis: "e8" },
      wackeln: { von: "e6", nach: "g5" },
    },
    {
      de: "Sein König muss stattdessen zur Seite.",
      en: "His king has to step aside instead.",
      zug: { von: "e8", nach: "d8" },
    },
    { de: "Zu spät.", en: "Too late.", zug: { von: "d5", nach: "e6" } },
    { de: "Das nennt man in der Schachwelt: Fesselung.", en: "In the chess world that's called: a pin." },
  ],
};

const SPIESS: MotivEinfuehrung = {
  motivId: "spiess",
  titelDe: "Spieß",
  titelEn: "Skewer",
  // Der Spieß wird über den UNTERSCHIED zur Fesselung eingeführt, nicht als neues Thema.
  // chess.js bestätigt: Der König hat keinen Fluchtzug, der auf der a-Linie bleibt.
  startFen: "q7/8/8/k7/8/8/7K/7R w - - 0 1",
  heldStart: "h1",
  erinnerungDe: "Gib Schach — und schau, wer dahinter steht.",
  erinnerungEn: "Give check — and look who is standing behind.",
  schritte: [
    { de: "Weißt du noch, die Fesselung?", en: "Do you remember the pin?" },
    {
      de: "Da stand die kleine Figur vorn und der König dahinter.",
      en: "There the small piece stood in front and the king behind.",
    },
    { de: "Jetzt ist es andersherum.", en: "Now it's the other way around.", blickfang: ["a5", "a8"] },
    {
      de: "Der König steht vorn. Die Dame steht dahinter.",
      en: "The king stands in front. The queen stands behind.",
      blickfang: ["a5", "a8"],
    },
    { de: "Pass auf.", en: "Watch." },
    { de: "Schach!", en: "Check!", zug: { von: "h1", nach: "a1" } },
    {
      de: "Der König muss weg. Das muss er immer.",
      en: "The king has to move. He always has to.",
      bedrohung: { angreifer: "a1", bedroht: "a5" },
      blickfang: ["a8"],
    },
    {
      de: "Und er kann nicht auf der Linie bleiben.",
      en: "And he can't stay on the line.",
      bedrohung: { angreifer: "a1", bedroht: "a5" },
      zug: { von: "a5", nach: "b5" },
    },
    { de: "Jetzt kann ihr niemand mehr helfen.", en: "Now nobody can help her.", blickfang: ["a8"] },
    { de: "Und die ist deine.", en: "And she is yours.", zug: { von: "a1", nach: "a8" } },
    { de: "Das nennt man in der Schachwelt: Spieß.", en: "In the chess world that's called: a skewer." },
  ],
};

export const MOTIV_EINFUEHRUNGEN: Readonly<Record<MotivId, MotivEinfuehrung>> = {
  beschuetzen: BESCHUETZEN,
  figurGewinnen: FIGUR_GEWINNEN,
  verteidigen: VERTEIDIGEN,
  gabel: GABEL,
  fesselung: FESSELUNG,
  spiess: SPIESS,
};

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Zuordnung Spalte → Motiv
// ═════════════════════════════════════════════════════════════════════════════════════════════
//
// Der Fortschritt wird je MOTIV gespeichert, nicht je Spalte (Konzept, Teil 6) — sonst sieht ein
// Kind dieselbe Fesselungs-Einführung an drei Revieren erneut.
//
// Bewusst als Record über Strings statt über EndlosmodusSpalteId typisiert: Ein Import aus
// endlosmodusSpalten.ts wäre ein .ts-Import und würde dieses Modul im Test unladbar machen
// (siehe Kopfkommentar). Der Test gleicht die Schlüssel stattdessen gegen die echte
// Spaltenliste ab — damit fällt ein Tippfehler oder eine neu hinzugekommene Spalte ohne
// Einführung genauso auf, nur eben im Test statt im Compiler.
const MOTIV_JE_SPALTE: Readonly<Record<string, MotivId>> = {
  eichhoernchen_figurGewinnen: "figurGewinnen",
  dachshoehle_figurGewinnen: "figurGewinnen",
  eichhoernchen_gabel: "gabel",
  rabenfels_fesselungSetzen: "fesselung",
  adlerhorst_fesselung: "fesselung",
  wolfsfeste_fesselung: "fesselung",
  adlerhorst_spiess: "spiess",
  // Ohne Einführung, und das ist eine Entscheidung, kein Loch:
  //   rabenfels_schach, dachshoehle_schach  → Schach ist eine Regel, Quest 6 zeigt sie ausführlich.
  //   dachshoehle_rochade                   → zeigt das Rochade-Bonuskapitel ausführlich.
  //   eichhoernchen_figurenwert, wolfsfeste_mattIn2 → Status "folgt", noch nicht spielbar.
  // Die Motive „beschuetzen" und „verteidigen" haben noch keine Spalte — sie gehören zu den
  // beiden neuen Spalten aus der Lückenanalyse und hängen bis dahin an der Erstlehre.
};

export function motivFuerSpalte(spalteId: string): MotivId | null {
  return MOTIV_JE_SPALTE[spalteId] ?? null;
}

/**
 * Der kurze Satz für den Wiederbesuch. Die volle Folge läuft nur beim ERSTEN Mal — eine
 * 40-Sekunden-Animation bei jedem Öffnen wäre derselbe Fehler, der im Gerätetest vom 19.09.
 * schon einmal gemeldet wurde (WisentKuerHub sprach eine Zeile bei jedem Wiederbetreten).
 */
export function erinnerung(motivId: MotivId): { de: string; en: string } {
  const f = MOTIV_EINFUEHRUNGEN[motivId];
  return { de: f.erinnerungDe, en: f.erinnerungEn };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Ablauflogik
// ═════════════════════════════════════════════════════════════════════════════════════════════

export type BrettFigur = {
  feld: Feld;
  /** Farbe und Art, z. B. "wR" (weißer Turm), "bN" (schwarzer Springer). */
  code: string;
};

export type EinfuehrungsBild = {
  /** Stellung, die während dieser Sprechzeile auf dem Brett steht. */
  fen: string;
  figuren: readonly BrettFigur[];
  /** Feld mit goldenem Sockel („deine Figur"). */
  held: Feld;
  blickfang: readonly Feld[];
  linie?: { von: Feld; bis: Feld };
  bedrohung?: { angreifer: Feld; bedroht: Feld };
};

export type EinfuehrungsAnimation = {
  von: Feld;
  nach: Feld;
  /** true = Figur bleibt stehen (echter Zug), false = Ausschlag hin und zurück. */
  bleibt: boolean;
};

function figurenAus(fen: string): BrettFigur[] {
  const brett = new Chess(fen).board();
  const figuren: BrettFigur[] = [];
  for (const reihe of brett) {
    for (const feld of reihe ?? []) {
      if (feld) figuren.push({ feld: feld.square, code: `${feld.color}${feld.type.toUpperCase()}` });
    }
  }
  return figuren;
}

function koenigsFeld(fen: string, farbe: "w" | "b"): Feld {
  const treffer = figurenAus(fen).find((f) => f.code === `${farbe}K`);
  // Jede Einführungsstellung hat beide Könige (von chess.js erzwungen, und der Test prüft es).
  return treffer ? treffer.feld : "e1";
}

/**
 * Spielt die Folge bis VOR den Schritt `index` durch und liefert Stellung und Heldenfeld.
 *
 * Wird bei jedem Schritt neu von vorn gerechnet statt fortgeschrieben. Das ist bei höchstens
 * sechzehn Schritten mit vier bis sechs Figuren kostenlos und hat einen Vorteil, der ihn wert
 * ist: Es gibt keinen Zustand, der aus dem Tritt geraten kann, wenn das Kind Lux antippt und
 * die Folge mittendrin neu startet.
 */
function standVorSchritt(folge: MotivEinfuehrung, index: number): { fen: string; held: Feld } {
  let fen = folge.startFen;
  let held = folge.heldStart;
  let spiel = new Chess(fen);

  const anwenden = (schritt: EinfuehrungsSchritt) => {
    if (schritt.stellung) {
      fen = schritt.stellung;
      spiel = new Chess(fen);
      held = folge.heldStart;
    }
    if (schritt.zug) {
      // Wird der Held geschlagen (Beschützen, erstes Brett: der Läufer), rückt der Sockel auf
      // den eigenen König — irgendeine weiße Figur muss ihn tragen, und der König ist die
      // einzige, die immer da ist.
      const heldGeschlagen = schritt.zug.nach === held;
      spiel.move({ from: schritt.zug.von, to: schritt.zug.nach, promotion: "q" });
      fen = spiel.fen();
      if (schritt.zug.von === held) held = schritt.zug.nach;
      else if (heldGeschlagen) held = koenigsFeld(fen, "w");
    }
    // `wackeln` verändert die Stellung absichtlich nicht.
  };

  for (let i = 0; i < index; i++) anwenden(folge.schritte[i]);

  // Ein Stellungswechsel gilt VOR der zugehörigen Zeile — „Jetzt machen wir das noch einmal"
  // wird bereits zum neuen Brett gesprochen.
  const dieser = folge.schritte[index];
  if (dieser?.stellung) {
    fen = dieser.stellung;
    held = folge.heldStart;
  }

  return { fen, held };
}

export function anzahlSchritte(motivId: MotivId): number {
  return MOTIV_EINFUEHRUNGEN[motivId].schritte.length;
}

export function schritt(motivId: MotivId, index: number): EinfuehrungsSchritt {
  const folge = MOTIV_EINFUEHRUNGEN[motivId];
  if (index < 0 || index >= folge.schritte.length) {
    throw new Error(`Schritt ${index} gibt es in der Einführung "${motivId}" nicht.`);
  }
  return folge.schritte[index];
}

/** Was während der Sprechzeile von Schritt `index` auf dem Brett zu sehen ist. */
export function bildFuerSchritt(motivId: MotivId, index: number): EinfuehrungsBild {
  const folge = MOTIV_EINFUEHRUNGEN[motivId];
  const s = schritt(motivId, index);
  const { fen, held } = standVorSchritt(folge, index);
  return {
    fen,
    figuren: figurenAus(fen),
    held,
    blickfang: s.blickfang ?? [],
    linie: s.linie,
    bedrohung: s.bedrohung,
  };
}

/** Was NACH der Sprechzeile von Schritt `index` animiert wird — oder nichts. */
export function animationNachSchritt(motivId: MotivId, index: number): EinfuehrungsAnimation | null {
  const s = schritt(motivId, index);
  if (s.zug) return { von: s.zug.von, nach: s.zug.nach, bleibt: true };
  if (s.wackeln) return { von: s.wackeln.von, nach: s.wackeln.nach, bleibt: false };
  return null;
}

/**
 * Schlüssel für useLuxSprechzeile. Muss sich bei JEDEM Schritt ändern, sonst spricht Lux die
 * nächste Zeile nicht. Der Zähler `durchlauf` sorgt dafür, dass ein erneutes Starten derselben
 * Folge (Lux antippen) auch beim ersten Schritt wieder einen neuen Schlüssel ergibt.
 */
export function sprechSchluessel(motivId: MotivId, index: number, durchlauf: number): string {
  return `motiveinfuehrung-${motivId}-${durchlauf}-${index}`;
}
