#!/usr/bin/env python3
"""Überträgt eine Gesichtsänderung aus einer Lieferung auf den freigegebenen Master.

Hintergrund
-----------
Manche Lieferungen des Bild-Tools sind inhaltlich richtig (die Augen sind
tatsächlich geschlossen), zeichnen aber die ganze Figur neu: andere Breite,
andere Beinstellung, anderer Umriss. Als Idle alle 3-6 Sekunden ist das
unbrauchbar, weil die Figur im Wechsel mit dem Grundzustand sichtbar pulsiert.

Dieses Skript rettet solche Lieferungen: Es richtet die Lieferung am GESICHT des
Masters aus, übernimmt ausschließlich die geänderte Region und lässt alles
andere — Silhouette, Körper, Beine, Alphakanal — beim Master.

Verfahren
---------
1. Ausrichtung: Rastersuche über Skalierung und Versatz. Bewertet wird die
   mittlere Farbabweichung in einem Gesichtsfenster, wobei die Augenpartie
   ausgenommen ist — dort SOLL sich ja etwas ändern. Verglichen wird also nur,
   was gleich bleiben muss (Stirn, Wangen, Ohren, Schnauzenumgebung).
2. Maske: Nicht gemalt, sondern aus der Differenz der beiden ausgerichteten
   Bilder gewonnen. Die größten zusammenhängenden Änderungsflächen (je Auge
   eine) werden geschlossen, geweitet und weich ausgeblendet. Die Maske folgt
   damit der echten Änderungskontur — dieselbe Logik wie bei den
   Differenz-Ebenen des Rig-Baus.
3. Zusammensetzen: Master als Grund, Lieferung nur innerhalb der Maske. Der
   Alphakanal wird vom Master übernommen, die Silhouette bleibt also exakt.

Rechtlich bleibt es eine Lieferung des Bild-Tools; die Rohdatei mit
C2PA-Nachweis ist der Beleg und gehört ins Archiv.

Aufruf
------
    python zustand_montage.py MASTER.png LIEFERUNG.png -o ZIEL.png \\
        --fenster 300 600 430 820 --augen 60 200 30 360
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_closing, binary_dilation, label

RAND = 200          # Polsterung für die Verschiebungssuche
MIN_FLAECHE = 1500  # kleinere Änderungsinseln gelten als Rauschen


def ausrichten(master: Image.Image, lieferung: Image.Image,
               fenster, augen, skalen, weite: int, schritt: int):
    Y0, Y1, X0, X1 = fenster
    ziel = np.array(master).astype(np.float32)[Y0:Y1, X0:X1, :3].mean(axis=2)
    gewicht = np.ones(ziel.shape, bool)
    gewicht[augen[0]:augen[1], augen[2]:augen[3]] = False
    kante = master.size[0]
    bestes = None
    for s in skalen:
        gr = int(round(kante * s))
        gepolstert = Image.new("RGBA", (kante + 2 * RAND, kante + 2 * RAND), (0, 0, 0, 0))
        versatz = (kante + 2 * RAND - gr) // 2
        gepolstert.paste(lieferung.resize((gr, gr), Image.LANCZOS), (versatz, versatz))
        grau = np.array(gepolstert).astype(np.float32)[:, :, :3].mean(axis=2)
        for dy in range(-weite, weite + 1, schritt):
            for dx in range(-weite, weite + 1, schritt):
                probe = grau[RAND + Y0 + dy:RAND + Y0 + dy + (Y1 - Y0),
                             RAND + X0 + dx:RAND + X0 + dx + (X1 - X0)]
                fehler = np.abs(ziel - probe)[gewicht].mean()
                if bestes is None or fehler < bestes[0]:
                    bestes = (float(fehler), float(s), dy, dx)
    fehler, s, dy, dx = bestes
    gr = int(round(kante * s))
    gepolstert = Image.new("RGBA", (kante + 2 * RAND, kante + 2 * RAND), (0, 0, 0, 0))
    versatz = (kante + 2 * RAND - gr) // 2
    gepolstert.paste(lieferung.resize((gr, gr), Image.LANCZOS), (versatz, versatz))
    passend = gepolstert.crop((RAND + dx, RAND + dy, RAND + dx + kante, RAND + dy + kante))
    return passend, fehler, s, dy, dx


def maske_aus_differenz(master: Image.Image, passend: Image.Image, fenster,
                        schwelle: int, weitung: int, weichzeichnen: float):
    Y0, Y1, X0, X1 = fenster
    am = np.array(master).astype(int)
    ap = np.array(passend).astype(int)
    d = np.abs(am[:, :, :3] - ap[:, :, :3]).mean(axis=2)
    roh = (d > schwelle) & (am[:, :, 3] > 200)
    ausserhalb = np.ones(roh.shape, bool)
    ausserhalb[Y0:Y1, X0:X1] = False
    roh[ausserhalb] = False
    roh = binary_closing(roh, np.ones((9, 9)))
    lab, anzahl = label(roh)
    behalten = np.zeros_like(roh)
    inseln = []
    for i in range(1, anzahl + 1):
        flaeche = int((lab == i).sum())
        if flaeche >= MIN_FLAECHE:
            ys, xs = np.where(lab == i)
            inseln.append((flaeche, int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())))
            behalten |= (lab == i)
    behalten = binary_dilation(behalten, np.ones((weitung, weitung)))
    maske = Image.fromarray((behalten * 255).astype(np.uint8))
    return maske.filter(ImageFilter.GaussianBlur(weichzeichnen)), sorted(inseln, reverse=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("master")
    p.add_argument("lieferung")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--fenster", type=int, nargs=4, default=(300, 600, 430, 820),
                   metavar=("Y0", "Y1", "X0", "X1"), help="Gesichtsfenster im Master")
    p.add_argument("--augen", type=int, nargs=4, default=(60, 200, 30, 360),
                   metavar=("Y0", "Y1", "X0", "X1"),
                   help="Augenpartie relativ zum Fenster — bei der Ausrichtung ausgenommen")
    p.add_argument("--skalen", type=float, nargs=3, default=(0.90, 1.07, 0.01),
                   metavar=("VON", "BIS", "SCHRITT"))
    p.add_argument("--maskenfenster", type=int, nargs=4, default=None,
                   metavar=("Y0", "Y1", "X0", "X1"),
                   help="Bereich, in dem nach Änderungsflächen gesucht wird "
                        "(Vorgabe: das Gesichtsfenster). Enger setzen, wenn die "
                        "Lieferung außerhalb des Gesichts Unruhe enthält.")
    p.add_argument("--lieferung-groesse", type=int, default=None, metavar="N",
                   help="Die Lieferung ist ein AUSSCHNITT (z. B. nur der Kopf): erst auf N×N "
                        "skalieren und dann per --lieferung-versatz in die Master-Leinwand "
                        "einsetzen. Ohne diese Angabe wird die Lieferung als Vollbild behandelt.")
    p.add_argument("--lieferung-versatz", type=int, nargs=2, default=(0, 0), metavar=("X", "Y"),
                   help="Wohin die linke obere Ecke des Ausschnitts in der Master-Leinwand gehört. "
                        "Negative Werte sind erlaubt (der Ausschnitt ragt dann oben/links hinaus).")
    p.add_argument("--suchweite", type=int, default=40)
    p.add_argument("--suchschritt", type=int, default=2)
    p.add_argument("--schwelle", type=int, default=28)
    p.add_argument("--weitung", type=int, default=21)
    p.add_argument("--weich", type=float, default=10.0)
    a = p.parse_args()

    master = Image.open(a.master).convert("RGBA")
    lieferung = Image.open(a.lieferung).convert("RGBA")
    if a.lieferung_groesse:
        # Ausschnitt-Lieferung grob an ihre Stelle in der Master-Leinwand setzen. Die
        # Feinausrichtung übernimmt danach die Rastersuche wie bei jeder anderen Lieferung.
        n = a.lieferung_groesse
        ausschnitt = lieferung.resize((n, n), Image.LANCZOS)
        leinwand = Image.new("RGBA", master.size, (0, 0, 0, 0))
        leinwand.paste(ausschnitt, (a.lieferung_versatz[0], a.lieferung_versatz[1]))
        lieferung = leinwand
        print(f"Ausschnitt eingesetzt: {n}x{n} px an Position "
              f"{a.lieferung_versatz[0]},{a.lieferung_versatz[1]}")
    skalen = np.arange(a.skalen[0], a.skalen[1], a.skalen[2])

    passend, fehler, s, dy, dx = ausrichten(
        master, lieferung, a.fenster, a.augen, skalen, a.suchweite, a.suchschritt)
    print(f"Ausrichtung: Skalierung {s:.2f}, dy {dy}, dx {dx} — "
          f"Restabweichung außerhalb der Augen {fehler:.2f}/255")

    maske, inseln = maske_aus_differenz(
        master, passend, a.maskenfenster or a.fenster,
        a.schwelle, a.weitung, a.weich)
    for flaeche, y0, y1, x0, x1 in inseln:
        print(f"  Änderungsfläche {flaeche:6d} px  y {y0}-{y1}  x {x0}-{x1}")

    ergebnis = Image.composite(passend, master, maske)
    fertig = np.array(ergebnis)
    fertig[:, :, 3] = np.array(master)[:, :, 3]      # Silhouette bleibt die des Masters
    ergebnis = Image.fromarray(fertig, "RGBA")
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    ergebnis.save(a.out)

    am = np.array(master).astype(int)
    ae = fertig.astype(int)
    d = np.abs(am[:, :, :3] - ae[:, :, :3]).mean(axis=2)
    geaendert = d > 25
    ys, xs = np.where(geaendert)
    aussen = d.copy()
    aussen[ys.min():ys.max() + 1, xs.min():xs.max() + 1] = 0
    print(f"geschrieben: {a.out}")
    print(f"  Änderung y {ys.min()}-{ys.max()}, x {xs.min()}-{xs.max()}, {geaendert.sum()} Pixel")
    print(f"  mittlere Abweichung außerhalb der Änderungsregion {aussen.mean():.4f}/255")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
