#!/usr/bin/env python3
"""
ChessLynx — Stimmen-Voranhören (Audit-Schritt 9, S1)

Rendert sechs feste Lux-Testzeilen mit allen Chirp-3-HD-Stimmen für Deutsch und
Englisch und schreibt eine lokale HTML-Seite, auf der alle Varianten nebeneinander
abspielbar sind. Kein Bezug zum späteren Produktions-Export — reines Hörvergleichs-
Werkzeug.

Voraussetzungen (lokal):
  pip install google-cloud-texttospeech
  export GOOGLE_APPLICATION_CREDENTIALS=/pfad/zu/service-account.json
  (Text-to-Speech API im Projekt aktiviert; Chirp 3 HD ist im kostenlosen Kontingent)

Aufruf:
  python tts_voranhoeren.py --out ./voranhoeren
  python tts_voranhoeren.py --out ./voranhoeren --nur de   # nur Deutsch
"""
import argparse, html, os, sys

try:
    from google.cloud import texttospeech as tts
except ImportError:
    sys.exit("google-cloud-texttospeech fehlt: pip install google-cloud-texttospeech")

TESTZEILEN = {
    "de": [
        ("begruessung",  "Willkommen im Wald von ChessLynx! Tipp auf mich, dann zeig ich dir meinen Wald!"),
        ("verwandlung",  "Und jetzt die Verwandlung: Aus dem Igel wird ein Bauer!"),
        ("schach",       "Achtung – der Turm zielt genau auf unseren König. In der Schachwelt nennt man das: Schach!"),
        ("lob",          "Klasse gemacht! Du wirst richtig gut darin!"),
        ("motto",        "Folge dem Luchs – und werde selbst zum Schach-Luchs!"),
        ("elterngate",   "Hoppla, das hier ist für die Erwachsenen! Hol dir schnell Mama, Papa oder eine andere erwachsene Person dazu."),
    ],
    "en": [
        ("begruessung",  "Welcome to the ChessLynx forest! Tap me, and I'll show you my forest!"),
        ("verwandlung",  "And now the transformation: the hedgehog becomes a pawn!"),
        ("schach",       "Careful – the rook is aiming right at our king. In the world of chess, that's called: check!"),
        ("lob",          "Well done! You're getting really good at this!"),
        ("motto",        "Follow the Lynx to become a ChessLynx yourself."),
        ("elterngate",   "Oops, this part is for grown-ups! Go get Mum, Dad, or another grown-up."),
    ],
}
SPRACHCODES = {"de": ["de-DE"], "en": ["en-US", "en-GB", "en-AU"]}

def chirp_stimmen(client, sprachcode):
    antwort = client.list_voices(language_code=sprachcode)
    return sorted(v.name for v in antwort.voices if "Chirp3-HD" in v.name)

def render(client, text, sprachcode, stimme, pfad):
    if os.path.exists(pfad):
        return
    antwort = client.synthesize_speech(
        input=tts.SynthesisInput(text=text),          # Chirp 3 HD: Klartext, kein SSML
        voice=tts.VoiceSelectionParams(language_code=sprachcode, name=stimme),
        audio_config=tts.AudioConfig(audio_encoding=tts.AudioEncoding.MP3, speaking_rate=0.95),
    )
    with open(pfad, "wb") as f:
        f.write(antwort.audio_content)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./voranhoeren")
    ap.add_argument("--nur", choices=["de", "en"], default=None)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    client = tts.TextToSpeechClient()

    seiten = []
    for sprache, codes in SPRACHCODES.items():
        if args.nur and sprache != args.nur:
            continue
        for code in codes:
            stimmen = chirp_stimmen(client, code)
            if not stimmen:
                print(f"keine Chirp-3-HD-Stimmen für {code}", file=sys.stderr); continue
            print(f"{code}: {len(stimmen)} Stimmen — {', '.join(s.split('-')[-1] for s in stimmen)}")
            zeilen_html = []
            for stimme in stimmen:
                kurz = stimme.split("-")[-1]
                zellen = []
                for key, text in TESTZEILEN[sprache]:
                    datei = f"{code}_{kurz}_{key}.mp3"
                    render(client, text, code, stimme, os.path.join(args.out, datei))
                    zellen.append(f'<td><audio controls preload="none" src="{datei}"></audio></td>')
                zeilen_html.append(f"<tr><th>{kurz}</th>{''.join(zellen)}</tr>")
            kopf = "".join(f"<th>{k}</th>" for k, _ in TESTZEILEN[sprache])
            seiten.append(f"<h2>{code}</h2><table><tr><th>Stimme</th>{kopf}</tr>{''.join(zeilen_html)}</table>")

    with open(os.path.join(args.out, "index.html"), "w", encoding="utf-8") as f:
        f.write("<!doctype html><meta charset='utf-8'><title>Lux – Stimmen-Voranhören</title>"
                "<style>body{font-family:sans-serif;padding:1rem}table{border-collapse:collapse}"
                "th,td{border:1px solid #ccc;padding:.3rem .5rem;text-align:left}audio{width:180px}</style>"
                "<h1>Lux – Stimmen-Voranhören</h1><p>Testzeilen: "
                + html.escape(" · ".join(k for k, _ in TESTZEILEN['de'])) + "</p>" + "".join(seiten))
    print(f"\nFertig: {args.out}/index.html im Browser öffnen.")

if __name__ == "__main__":
    main()
