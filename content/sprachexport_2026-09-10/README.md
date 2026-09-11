# Sprachausgabe-Export: heutige neue Inhalte (2026-09-10)

Begleitdokument zu `chesslynx_sprachexport_2026-09-10.csv` — 90 Sprechzeilen aus der
heutigen Sitzung (Wisent-Kürs, Boss-Puzzle, Lichess-Puzzle-Bereich, Gefährten-Kampagne,
Motto-Moment, Wisentfeste-Übergang, aktualisierte Schlossvorplatz-Zeilen). **Nicht
enthalten:** bereits bestehender, unveränderter Code-Bestand (Onboarding, sechs
Hauptquests, fünf Bonuskapitel inkl. Matt in 3, Freispiel, ParentGate) — der müsste bei
Bedarf separat aus dem Code extrahiert werden, siehe `lux_sprechzeilen_sammlung_2026-09-09.md`
als Vorlage dafür.

## Format

Vier Spalten, UTF-8, Komma-getrennt:
- **id** — stabiler, sprechender Schlüssel (`bereich.unterbereich.zeile`), eindeutig pro
  Zeile. Genau dieser Schlüssel sollte später der Dateiname der Audiodatei werden
  (`wisent.kuer.hub.intro_1.mp3` o. Ä.) — das macht die Zuordnung zum Code später
  eindeutig, ohne dass ich den Text selbst erneut abgleichen muss.
- **bereich** — grobe Gruppierung, rein zur Orientierung beim Durcharbeiten.
- **text_de** — deutscher Sprechtext, exakt wie im Konzept abgestimmt.
- **text_en** — englische Entsprechung, gleicher Ton/gleiche Kürze, aus dem Deutschen neu
  übersetzt (keine wörtliche Übersetzung, sondern gleich kindgerecht formuliert).

**Eine bewusste Ausnahme:** `motto.3_schachluchs` — hier unterscheiden sich DE/EN
absichtlich stärker als sonst (Schach-Luchs vs. ChessLynx, siehe die dazu getroffene
Entscheidung), nicht nur sprachlich, sondern im gewählten Begriff selbst.

## Verwendung mit einer KI-Stimme (z. B. Google Cloud TTS, siehe Entscheidungsvorlage)

Pro Zeile zwei Aufrufe (einen mit `text_de` + deutscher Stimme, einen mit `text_en` +
englischer Stimme), Ergebnis jeweils als `<id>_de.mp3` / `<id>_en.mp3` speichern. Ein
Skript, das die CSV zeilenweise einliest und die API aufruft, ist der natürliche nächste
Schritt (passend zur in der Entscheidungsvorlage vorgeschlagenen hash-/schlüsselbasierten
Pipeline) — sag Bescheid, falls ich das Skript selbst dafür aufsetzen soll, sobald klar
ist, welcher Anbieter es wird.

## Rückweg: wie ich die fertigen Dateien exakt zuordne

Wenn du mir die fertig erzeugten Audiodateien (oder auch nur eine Liste, welche `id` zu
welcher Datei gehört) zurückgibst, kann ich anhand der `id`-Spalte jede Datei eindeutig
der richtigen Sprechzeile im jeweiligen Screen zuordnen — ohne erneuten Textabgleich,
selbst wenn zwei Zeilen inhaltlich ähnlich klingen (z. B. die vier
Wiederholungshinweis-Varianten `wisent.kuer.wiederholungshinweis_a`–`_d`).

## Änderungen 2026-09-11 (Paket 1, Sprachkorrekturen)

- 33 Zeilen an die Korrekturliste (`sprachkorrekturen_alt_neu_2026-09-10.md`, Abschnitt D) und an
  `gefaehrten_wisent_lichess_sprechtexte_final.md` v2 angeglichen: „Umwandlung" statt
  „Bauern-Verwandlung", Beugung „zum Wisent", Boss-Puzzle als Einladung, Gefährten-Anliegen,
  „Bergtor" statt „Wisentfeste" in der gesprochenen Übergangssequenz, „gewonnen" statt
  „geschlagen" beim Freispiel-Wiederholungshinweis. EN-Fassungen entsprechend nachgezogen.
- `lichess.themenuebung.erstbesuch` in `…_1` / `…_2` geteilt (zwei Tipp-weiter-Zeilen).
- Neu: `schlossvorplatz.uebergang_2_launch10`, `wisentfeste.uebergang_4_launch10`
  (Übergangszeilen nur für Launch 1.0, bis Update 1), `motto.2a_figuren`, `motto.2b_figuren`,
  `motto.3b_motto` (Motto-Moment v2). Jetzt 96 Zeilen.
- Die IDs werden mit der TTS-Pipeline (Paket 4) ins neue Schema `<bereich>_<einheit>_<screen>_<lfd>`
  überführt; dieses Dokument bekommt dann die Mapping-Tabelle.
