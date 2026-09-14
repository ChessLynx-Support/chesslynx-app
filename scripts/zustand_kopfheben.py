#!/usr/bin/env python3
"""Erzeugt einen Zustand „Kopf heben" rein geometrisch aus einem freigegebenen Master.

Hintergrund
-----------
Beim Wisent hat das Bild-Tool den Auftrag `W1_kopf_heben` zweimal mit
„Ähnlichkeit mit Inhalten Dritter" abgewiesen (2026-09-14, vor und nach einer
vollständigen Textüberarbeitung). Die eine Lieferung dazwischen kam mit richtiger
Kopfhaltung, aber umproportionierter Figur zurück (Rumpf −13 %, Hörner +40 %) und
war als Überblendungspartner unbrauchbar. Dieselbe Sperre hatte beim Pferd am
2026-09-11 viermal und am 2026-09-13 dreimal zugeschlagen; der damalige Befund
(`claude/pferd_bildtool_sperre_2026-09-13.md`) lautet, dass das ERZEUGTE BILD
geprüft wird, nicht der Auftragstext. Weitere Anläufe über den Prompt sind deshalb
nicht aussichtsreich.

Dieses Skript geht denselben Weg wie `zustand_kopfsenken.py` beim Pferd: Der
Zustand wird aus dem bereits freigegebenen Master gerechnet, ohne neue
KI-Generierung. Es entsteht kein zweites generiertes Werk, sondern eine
dokumentierte geometrische Ableitung des eigenen Masters.

Warum nicht dasselbe Skript wie beim Pferd
------------------------------------------
`zustand_kopfsenken.py` verschiebt den Kopf als Ganzes nach unten und lässt die
Rampe darunter das Fell stauchen. Nach OBEN geht das beim Wisent nicht: Über den
Hörnern liegen im 1254er-Master nur 19 Pixel Luft (oberster deckender Pixel
y = 19). Jede Verschiebung des ganzen Kopfes schneidet die Hornspitzen ab.

Deshalb hier ein Feld mit drei Abschnitten statt zwei. Es hält den Kopfoberrand
fest und hebt nur, was darunter liegt:

    dy(y) = 0                                              y <= y_anker
    dy(y) = -H/2 * (1 - cos(pi*(y-y_anker)/(y_hoch-y_anker)))   y_anker..y_hoch
    dy(y) = -H/2 * (1 + cos(pi*(y-y_hoch)/(y_ende-y_hoch)))     y_hoch..y_ende
    dy(y) = 0                                              y >= y_ende

Oberhalb von `y_anker` (Hörner, Stirnschopf) bleibt das Bild bitgenau stehen,
unterhalb von `y_ende` (Rumpf, Beine) ebenso — die Registrierung gegen den
Grundzustand ist damit per Konstruktion 0/0. Dazwischen staucht sich die Stirn
und streckt sich das Kehlfell, genau wie beim echten Heben des Kopfes.

Beide Teilstücke sind Kosinus-Rampen mit waagerechter Tangente an allen drei
Knoten — es gibt keine Knickstelle und damit keine sichtbare Naht.

Grenzen des Verfahrens
----------------------
Die abgelehnte Lieferung zeigt, wie ein 25°-Heben in Wirklichkeit aussieht: Die
Augen wandern 90 px nach oben, der Nasenspiegel 150 px, der Abstand zwischen
beiden schrumpft von 80 auf 20 px, und die Nüstern sind plötzlich von unten zu
sehen. Diese Ansicht steckt nicht in den Pixeln des Masters. Ein eindimensionales
Verschiebungsfeld kann sie nicht erfinden — es kann den Kopf nur anheben und das
Gesicht dabei stauchen.

Realistisch ist deshalb ein KLEINES Heben (H um 50 px). Das Skript druckt die
örtliche Stauchung und Streckung mit aus; über etwa 1,4 hinaus wird das Fell
sichtbar weich. Wer mehr Bewegung braucht, ergänzt sie app-seitig als
Transformation (leichtes translateY plus Stauchen) statt im Bild.

Aufruf
------
    python zustand_kopfheben.py MASTER.png -o ZIEL.png \
        --hebung 50 --anker 240 --hoch 480 --ende 700
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates


def verschiebung(hoehe: int, hebung: float, y_anker: int, y_hoch: int,
                 y_ende: int) -> np.ndarray:
    """dy je Bildzeile. Negativ = nach oben."""
    y = np.arange(hoehe, dtype=np.float64)
    dy = np.zeros(hoehe)
    auf = (y > y_anker) & (y < y_hoch)
    dy[auf] = -hebung * 0.5 * (
        1 - np.cos(np.pi * (y[auf] - y_anker) / (y_hoch - y_anker)))
    ab = (y >= y_hoch) & (y < y_ende)
    dy[ab] = -hebung * 0.5 * (
        1 + np.cos(np.pi * (y[ab] - y_hoch) / (y_ende - y_hoch)))
    return dy


def anwenden(bild: Image.Image, dy: np.ndarray) -> Image.Image:
    feld = np.array(bild).astype(np.float64)
    hoehe, breite = feld.shape[:2]
    yy, xx = np.mgrid[0:hoehe, 0:breite].astype(np.float64)
    koord = np.array([yy - dy[:, None], xx])
    kanaele = [map_coordinates(feld[:, :, k], koord, order=3,
                               mode="constant", cval=0.0) for k in range(4)]
    return Image.fromarray(
        np.clip(np.stack(kanaele, axis=-1), 0, 255).astype(np.uint8), "RGBA")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("master")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--hebung", type=float, default=50.0,
                   help="Wie weit die Gesichtsmitte nach oben wandert, in Pixeln")
    p.add_argument("--anker", type=int, default=240,
                   help="Bis hier bleibt das Bild stehen (Hörner, Stirnschopf)")
    p.add_argument("--hoch", type=int, default=480,
                   help="Zeile mit der vollen Hebung (Nasenspiegel)")
    p.add_argument("--ende", type=int, default=700,
                   help="Ab hier steht das Bild wieder still (Rumpf)")
    a = p.parse_args()

    if not a.anker < a.hoch < a.ende:
        raise SystemExit("Es muss gelten: --anker < --hoch < --ende")

    master = Image.open(a.master).convert("RGBA")
    dy = verschiebung(master.size[1], a.hebung, a.anker, a.hoch, a.ende)
    ergebnis = anwenden(master, dy)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    ergebnis.save(a.out)

    # Örtlicher Maßstab: 1 + d(dy)/dy. Kleiner 1 heißt gestaucht, größer 1 gestreckt.
    massstab = 1.0 + np.gradient(dy)
    stauchung = massstab[a.anker:a.hoch].min()
    streckung = massstab[a.hoch:a.ende].max()

    m = np.array(master).astype(int)
    e = np.array(ergebnis).astype(int)
    abw = np.abs(m[:, :, :3] - e[:, :, :3]).mean(axis=2)
    print(f"geschrieben: {a.out}  {ergebnis.size[0]}x{ergebnis.size[1]} RGBA")
    print(f"  Hebung {a.hebung:.0f} px, Rampe {a.anker} → {a.hoch} → {a.ende}")
    print(f"  oberster Pixel: Master y={np.where(m[:, :, 3] > 8)[0].min()} → "
          f"Zustand y={np.where(np.array(ergebnis)[:, :, 3] > 8)[0].min()}")
    print(f"  örtliche Stauchung der Stirn  {stauchung:.2f}  "
          f"(unter 0,70 wird das Fell matschig)")
    print(f"  örtliche Streckung der Kehle  {streckung:.2f}  "
          f"(über 1,40 wird das Fell weich)")
    print(f"  oberhalb y={a.anker}: mittlere Abweichung {abw[:a.anker].mean():.4f}/255")
    print(f"  unterhalb y={a.ende}: mittlere Abweichung {abw[a.ende:].mean():.4f}/255")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
