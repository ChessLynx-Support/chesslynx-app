#!/usr/bin/env python3
"""
ChessLynx — Lichess-Puzzle-Filter (Audit-Schritt 5)

Liest lichess_db_puzzle.csv.zst (https://database.lichess.org/#puzzles, CC0),
wendet die Qualitäts- und Themenfilter an, spielt den ersten Zug aus `Moves`
(gegnerischer Zug — Lichess-Konvention) automatisch aus und schreibt:

  1. eine Zellenbesetzungs-Tabelle (Thema × Rating-Band) nach stdout
  2. themen_kandidaten.json   — alle Treffer für die Themen-Übung (manuell zu kuratieren)
  3. rush_pool.json           — automatisch gefilterter Rush-Pool

Aufruf:
  pip install python-chess zstandard
  python lichess_filter.py lichess_db_puzzle.csv.zst --out ./puzzles

Jeder exportierte Eintrag enthält bereits die Stellung NACH dem gegnerischen Zug
("fen"), die Lösungszüge des Kindes inkl. Gegnerantworten ("loesung", UCI),
die Farbe des Kindes ("kind_farbe": "w" | "b") und ob die letzte Lösung ein Matt
ist ("endet_mit_matt": true → App akzeptiert jeden Mattzug, nicht nur diesen).
"""
import argparse, csv, io, json, sys
from collections import defaultdict

try:
    import chess
except ImportError:
    sys.exit("python-chess fehlt: pip install python-chess")

# ---------------------------------------------------------------- Parameter
THEMEN = {                       # ChessLynx-Thema → Lichess-Tags (mind. einer muss vorkommen)
    "matt_finden":    {"mateIn1", "mateIn2"},
    "figur_gewinnen": {"hangingPiece", "fork", "discoveredAttack"},
    "fesselung":      {"pin"},
}
AUSSCHLUSS = {"underPromotion", "promotion", "enPassant", "castling",
              "veryLong", "long", "crushing", "queensideAttack", "kingsideAttack"}
POPULARITY_MIN = 85
NBPLAYS_MIN = 1000
RATING_MAX = 1400
RATING_DEV_MAX = 100             # nur stabil bewertete Puzzles
THEMEN_MAX_HALBZUEGE = 4         # Lösung inkl. Gegnerantworten (ohne den Vor-Zug)
RUSH_MAX_HALBZUEGE = 6
BAENDER = list(range(400, RATING_MAX + 100, 100))   # Histogramm in 100er-Schritten

# ---------------------------------------------------------------- Hilfen
def oeffne(pfad):
    if pfad.endswith(".zst"):
        try:
            import zstandard as zstd
        except ImportError:
            sys.exit("zstandard fehlt: pip install zstandard")
        f = open(pfad, "rb")
        reader = zstd.ZstdDecompressor().stream_reader(f)
        return io.TextIOWrapper(reader, encoding="utf-8")
    return open(pfad, encoding="utf-8")

def band(rating):
    for b in BAENDER:
        if rating < b:
            return f"<{b}"
    return f">={BAENDER[-1]}"

def verarbeite(zeile):
    """Gibt (eintrag, themen) zurück oder None, wenn das Puzzle nicht passt."""
    try:
        rating = int(zeile["Rating"]); dev = int(zeile["RatingDeviation"])
        pop = int(zeile["Popularity"]); plays = int(zeile["NbPlays"])
    except (KeyError, ValueError):
        return None
    if rating > RATING_MAX or dev > RATING_DEV_MAX or pop < POPULARITY_MIN or plays < NBPLAYS_MIN:
        return None
    tags = set(zeile["Themes"].split())
    if tags & AUSSCHLUSS:
        return None
    themen = [t for t, want in THEMEN.items() if tags & want]
    zuege = zeile["Moves"].split()
    if len(zuege) < 2:
        return None
    halbzuege = len(zuege) - 1                      # erster Zug ist der Gegner
    if halbzuege > RUSH_MAX_HALBZUEGE:
        return None
    # --- erst hier (nach den billigen Filtern) das Brett anfassen
    brett = chess.Board(zeile["FEN"])
    try:
        brett.push_uci(zuege[0])                    # gegnerischer Vor-Zug
        for z in zuege[1:]:
            if chess.Move.from_uci(z) not in brett.legal_moves:
                return None                         # defekter Datensatz
            brett.push_uci(z)
    except ValueError:
        return None
    endet_mit_matt = brett.is_checkmate()
    if "matt_finden" in themen and not endet_mit_matt:
        themen.remove("matt_finden")                # Tag ohne echtes Matt → nicht als Matt-Puzzle
    # Stellung nach dem Vor-Zug rekonstruieren
    start = chess.Board(zeile["FEN"]); start.push_uci(zuege[0])
    eintrag = {
        "id": zeile["PuzzleId"],
        "fen": start.fen(),
        "kind_farbe": "w" if start.turn == chess.WHITE else "b",
        "loesung": zuege[1:],
        "halbzuege": halbzuege,
        "endet_mit_matt": endet_mit_matt,
        "rating": rating,
        "themen": themen,
        "tags": sorted(tags),
    }
    return eintrag, themen

# ---------------------------------------------------------------- Hauptlauf
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv"); ap.add_argument("--out", default=".")
    ap.add_argument("--limit", type=int, default=0, help="nur die ersten N Zeilen (Test)")
    args = ap.parse_args()

    zellen = defaultdict(lambda: defaultdict(int))      # thema → band → n
    farbe = defaultdict(int)
    themen_kand, rush = [], []
    gelesen = 0
    with oeffne(args.csv) as f:
        for zeile in csv.DictReader(f):
            gelesen += 1
            if args.limit and gelesen > args.limit:
                break
            if gelesen % 500000 == 0:
                print(f"… {gelesen:,} Zeilen", file=sys.stderr)
            r = verarbeite(zeile)
            if not r:
                continue
            eintrag, themen = r
            farbe[eintrag["kind_farbe"]] += 1
            rush.append(eintrag)
            if themen and eintrag["halbzuege"] <= THEMEN_MAX_HALBZUEGE:
                themen_kand.append(eintrag)
                for t in themen:
                    zellen[t][band(eintrag["rating"])] += 1

    # --- Ausgabe
    print(f"\nGelesen: {gelesen:,}   Rush-Pool: {len(rush):,}   Themen-Kandidaten: {len(themen_kand):,}")
    print(f"Farbe des Kindes im Rush-Pool: Weiß {farbe['w']:,}  Schwarz {farbe['b']:,}\n")
    spalten = [f"<{b}" for b in BAENDER]
    print("Thema".ljust(16) + "".join(s.rjust(8) for s in spalten))
    for t in THEMEN:
        print(t.ljust(16) + "".join(str(zellen[t][s]).rjust(8) for s in spalten))
    print("\nZiel: 12 kuratierte Puzzles je Zelle (3 Themen × 4 Stufen). Stufengrenzen dort setzen,\n"
          "wo jedes Thema mindestens ~30 Kandidaten hat (Auswahlreserve für die Handprüfung).")

    with open(f"{args.out}/themen_kandidaten.json", "w") as fo:
        json.dump(themen_kand, fo, ensure_ascii=False, indent=1)
    with open(f"{args.out}/rush_pool.json", "w") as fo:
        json.dump(rush, fo, ensure_ascii=False)
    print(f"\nGeschrieben: {args.out}/themen_kandidaten.json, {args.out}/rush_pool.json")

if __name__ == "__main__":
    main()
