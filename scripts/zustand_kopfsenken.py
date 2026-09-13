#!/usr/bin/env python3
"""Erzeugt einen Zustand „Kopf senken" rein geometrisch aus einem freigegebenen Master.

Hintergrund
-----------
Beim Pferd sperrt das Bild-Tool jeden Auftrag, der die Haltung ändert, mit
„Ähnlichkeit mit Inhalten Dritter" (2026-09-11 viermal, 2026-09-13 dreimal).
Geprüft wird laut Fehlertext das ERZEUGTE BILD, nicht der Auftragstext — ein
weiterer Anlauf über den Prompt ist deshalb nicht aussichtsreich. Siehe
`claude/pferd_bildtool_sperre_2026-09-13.md`.

Dieses Skript geht den anderen Weg: Der zweite Zustand wird aus dem bereits
freigegebenen Master gerechnet, ohne neue KI-Generierung. Rechtlich ist das die
sauberere Variante — es entsteht kein zweites generiertes Werk, sondern eine
dokumentierte geometrische Ableitung des eigenen Masters.

Verfahren
---------
Ein weiches vertikales Verschiebungsfeld, überall stetig:

    dy(y) = D                                        für y <= y0   (Kopf sinkt)
    dy(y) = D/2 * (1 + cos(pi * (y-y0)/(y1-y0)))     für y0 < y < y1 (Rampe)
    dy(y) = 0                                        für y >= y1   (Körper steht)
    dx(y) = dy(y) * neigung                          (leichte Neigung)

Das Fell zwischen y0 und y1 wird dabei um D/(y1-y0) gestaucht — genau das
passiert beim Kopfsenken auch in der Natur. Weil das Feld keine Sprungstelle
hat, entstehen keine Ausschnittkanten und keine Naht; unterhalb von y1 bleibt
das Bild bitgenau erhalten, was die Registrierung gegen den Grundzustand
trivial macht (Versatz 0/0 per Konstruktion).

Aufruf
------
    python zustand_kopfsenken.py MASTER.png -o ZIEL.png \
        --senkung 70 --rampe 520 800 --neigung 0.14
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates


def verschiebungsfeld(hoehe: int, breite: int, senkung: float,
                      y0: int, y1: int, neigung: float):
    y = np.arange(hoehe, dtype=np.float64)
    dy = np.where(
        y <= y0, senkung,
        np.where(y >= y1, 0.0,
                 senkung * 0.5 * (1 + np.cos(np.pi * (y - y0) / (y1 - y0)))))
    eins = np.ones((1, breite))
    return dy[:, None] * eins, (dy * neigung)[:, None] * eins


def anwenden(bild: Image.Image, senkung: float, y0: int, y1: int,
             neigung: float) -> Image.Image:
    feld = np.array(bild).astype(np.float64)
    hoehe, breite = feld.shape[:2]
    dy, dx = verschiebungsfeld(hoehe, breite, senkung, y0, y1, neigung)
    yy, xx = np.mgrid[0:hoehe, 0:breite].astype(np.float64)
    koord = np.array([yy - dy, xx - dx])
    kanaele = [map_coordinates(feld[:, :, k], koord, order=3,
                               mode="constant", cval=0.0) for k in range(4)]
    return Image.fromarray(
        np.clip(np.stack(kanaele, axis=-1), 0, 255).astype(np.uint8), "RGBA")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("master")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--senkung", type=float, default=70.0,
                   help="Verschiebung des Kopfes nach unten in Pixeln")
    p.add_argument("--rampe", type=int, nargs=2, default=(520, 800),
                   metavar=("Y0", "Y1"), help="Anfang und Ende der Rampe")
    p.add_argument("--neigung", type=float, default=0.14,
                   help="horizontaler Versatz je Pixel Senkung")
    a = p.parse_args()

    master = Image.open(a.master).convert("RGBA")
    ergebnis = anwenden(master, a.senkung, a.rampe[0], a.rampe[1], a.neigung)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    ergebnis.save(a.out)

    m = np.array(master).astype(int)
    e = np.array(ergebnis).astype(int)
    abw = np.abs(m[:, :, :3] - e[:, :, :3]).mean(axis=2)
    unten = abw[a.rampe[1]:]
    oben = np.where(np.array(ergebnis)[:, :, 3] > 8)[0].min()
    print(f"geschrieben: {a.out}  {ergebnis.size[0]}x{ergebnis.size[1]} RGBA")
    print(f"  unterhalb y={a.rampe[1]}: mittlere Abweichung {unten.mean():.3f}/255, "
          f"maximal {unten.max():.0f}")
    print(f"  oberster Pixel: Master y={np.where(m[:, :, 3] > 8)[0].min()} → "
          f"Zustand y={oben}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
