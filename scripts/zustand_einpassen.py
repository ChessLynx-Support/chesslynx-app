#!/usr/bin/env python3
"""Passt eine Vollbild-Lieferung maßstäblich auf den Master ein.

Wozu
----
Manche Zustände lassen sich nicht als Differenz zum Grundzustand bauen — beim
Winken etwa verschwindet das Vorderbein von seinem Platz, die Änderung ist also
nicht lokal. Solche Lieferungen werden als VOLLBILD-ZUSTAND übernommen und nur
überblendet. Damit dabei nichts springt, müssen sie dieselbe Größe und dieselbe
Standposition haben wie der Master — und sie kommen in aller Regel weder in
derselben Leinwandgröße noch im selben Maßstab zurück.

Verfahren
---------
Gemessen wird ausschließlich am SITZENDEN TEIL der Figur, also unterhalb der
Schulterlinie: Dort ändert die neue Pose nichts, während Kopf und erhobener Arm
die Bezugsmaße verfälschen würden.

1. Maßstab = Sitzbreite des Masters / Sitzbreite der Lieferung.
2. Verschiebung so, dass die unterste Bildzeile der Figur (die Pfotenlinie) und
   die Mitte des sitzenden Teils übereinstimmen.

Es wird ausschließlich skaliert und verschoben, kein Bildinhalt verändert.

Aufruf
------
    python zustand_einpassen.py MASTER.png LIEFERUNG.png -o ZIEL.png [--schulter 1450]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def sitzmasse(bild: Image.Image, schulter_rel: float) -> tuple[int, float, int]:
    """Breite, Mitte und Unterkante des sitzenden Teils (unterhalb der Schulterlinie)."""
    a = np.array(bild.convert("RGBA"))
    maske = a[:, :, 3] > 8
    ys, xs = np.where(maske)
    oben, unten = ys.min(), ys.max()
    grenze = int(oben + schulter_rel * (unten - oben))
    teil = maske[grenze:unten + 1]
    breiten = teil.sum(axis=1)
    breite = int(breiten.max())
    zeile = grenze + int(np.argmax(breiten))
    spalten = np.where(maske[zeile])[0]
    mitte = (spalten.min() + spalten.max()) / 2.0
    return breite, mitte, int(unten)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("master")
    p.add_argument("lieferung")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--anker", choices=("sitz", "hoehe"), default="sitz",
                   help="Woran der Maßstab hängt: an der Sitzbreite (Vorgabe) oder an der "
                        "Gesamthöhe der Figur")
    p.add_argument("--rand-oben", type=int, default=30,
                   help="Mindestabstand der höchsten Stelle zum oberen Bildrand")
    p.add_argument("--schulter", type=float, default=0.70,
                   help="Ab welchem Anteil der Figurenhöhe der sitzende Teil beginnt (0.70 = "
                        "unteres Drittel). Nur dieser Bereich bestimmt Maßstab und Lage.")
    a = p.parse_args()

    master = Image.open(a.master).convert("RGBA")
    lieferung = Image.open(a.lieferung).convert("RGBA")

    b_m, x_m, u_m = sitzmasse(master, a.schulter)
    b_l, x_l, u_l = sitzmasse(lieferung, a.schulter)
    # Die Lieferung wird zuerst auf die Leinwandgröße des Masters gebracht, damit
    # Maßstab und Versatz in denselben Pixeln gerechnet werden.
    if lieferung.size != master.size:
        lieferung = lieferung.resize(master.size, Image.LANCZOS)
        b_l, x_l, u_l = sitzmasse(lieferung, a.schulter)

    if a.anker == "hoehe":
        # Auf die Gesamthöhe einpassen: Ohrspitzen und Pfotenlinie liegen danach auf denselben
        # Zeilen wie im Grundzustand. Sinnvoll, wenn die Silhouette beim Überblenden stehen
        # bleiben soll und die Lieferung im Rumpf etwas breiter geraten ist.
        ys_m, _ = np.where(np.array(master)[:, :, 3] > 8)
        ys_l0, _ = np.where(np.array(lieferung)[:, :, 3] > 8)
        faktor = (ys_m.max() - ys_m.min()) / (ys_l0.max() - ys_l0.min())
    else:
        faktor = b_m / b_l
    # Schutz gegen Anschnitt oben: Die Ohren sind in der Lieferung oft länger. Passt die
    # Figur bei diesem Maßstab nicht mehr unter den oberen Rand, wird der Maßstab so weit
    # zurückgenommen, dass ein Rand von --rand-oben Pixeln bleibt. Die Sitzbreite weicht
    # dann um ein knappes Prozent ab — sichtbar abgeschnittene Ohrpinsel wären schlimmer.
    ys_l, _ = np.where(np.array(lieferung)[:, :, 3] > 8)
    hoehe_l = ys_l.max() - ys_l.min()
    platz = u_m - a.rand_oben
    if hoehe_l * faktor > platz:
        faktor = platz / hoehe_l
        print(f"  Maßstab wegen der Ohrpinsel auf {faktor:.4f} zurückgenommen "
              f"(Rand oben {a.rand_oben} px)")
    kante = master.size[0]
    gr = max(1, int(round(kante * faktor)))
    skaliert = lieferung.resize((gr, gr), Image.LANCZOS)
    b_s, x_s, u_s = sitzmasse(skaliert, a.schulter)

    ergebnis = Image.new("RGBA", master.size, (0, 0, 0, 0))
    ergebnis.paste(skaliert, (int(round(x_m - x_s)), int(round(u_m - u_s))))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    ergebnis.save(a.out)

    b_e, x_e, u_e = sitzmasse(ergebnis, a.schulter)
    ys, xs = np.where(np.array(ergebnis)[:, :, 3] > 8)
    ym, xm = np.where(np.array(master)[:, :, 3] > 8)
    print(f"geschrieben: {a.out}")
    print(f"  Maßstab {faktor:.4f}  (Sitzbreite Lieferung {b_l} → {b_e}, Master {b_m})")
    print(f"  Pfotenlinie: Master y={u_m}, eingepasst y={u_e}")
    print(f"  Mitte des sitzenden Teils: Master x={x_m:.1f}, eingepasst x={x_e:.1f}")
    print(f"  Bounding-Box eingepasst: x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()}  "
          f"(Master: x {xm.min()}-{xm.max()}, y {ym.min()}-{ym.max()})")
    rand = int((np.array(ergebnis)[-1, :, 3] > 200).sum())
    print(f"  deckende Pixel auf der letzten Bildzeile: {rand}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
