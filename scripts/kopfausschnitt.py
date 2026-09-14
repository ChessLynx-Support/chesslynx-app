#!/usr/bin/env python3
"""Schneidet aus einem freigegebenen Master den Kopfausschnitt fürs Bild-Tool.

Wozu
----
Der Kopfausschnitt-Weg (siehe claude/kopfausschnitt_lieferungen_einpassen_2026-09-14.md)
lädt beim Bild-Tool nicht die ganze Figur hoch, sondern nur den Kopf. Das ist der
Unterschied zwischen zehn brauchbaren Lieferungen an einem Tag und den Vollbild-Aufträgen,
die die Figur regelmäßig umproportioniert zurückgeben: Was nicht im Bild ist, kann das
Werkzeug nicht verändern.

Bis heute wurde dieser Ausschnitt von Hand gesetzt — fünfmal, mit fünfmal von Hand
notierten Zahlen. Dieses Skript macht daraus einen reproduzierbaren Schritt und druckt
gleich alle Werte mit aus, die danach gebraucht werden.

Die Regel — rückgerechnet aus den fünf von Hand gesetzten Ausschnitten
---------------------------------------------------------------------
Die Ausschnitte von Eichhörnchen, Fuchs, Dachs, Wolf und Wisent sind am 2026-09-14 nach
Augenmaß gesetzt worden. Nachgemessen ergeben sie zwei erstaunlich feste Regeln und eine
lose:

    Kantenlänge / Figurenbreite   1,157   (Spanne 1,142-1,168 über fünf Figuren)
    waagerecht auf die KOPFMITTE  ±0      (Spanne −4 bis +6 px)
    Luft über dem Kopf / Kante    0,125   (Spanne 0,088-0,175 — hier wurde nach Gefühl gesetzt)

Bemerkenswert ist die erste Zeile: Die Kante hängt an der Breite der GANZEN FIGUR, nicht
an der des Kopfes. Beim Wisent mit seinem mächtigen Schädel ergibt das einen engen
Kopfausschnitt, beim Eichhörnchen mit kleinem Kopf und großer Rute einen weiten, der halbe
Schultern mitnimmt. Beides hat funktioniert — zehn brauchbare Lieferungen an einem Tag —,
deshalb ist diese Regel übernommen und nicht durch eine „logischere" ersetzt worden.

Die zweite Zeile ist die wichtigere Einsicht: zentriert wird auf den KOPF, nicht auf die
Figur. Beim Eichhörnchen liegt die Figurenmitte 182 px neben der Kopfmitte, weil die Rute
auf einer Seite hängt; ein auf die Figur zentrierter Ausschnitt hätte den Kopf an den Rand
gerückt.

Schritte:
1. HALSLINIE FINDEN. Über die Breite je Bildzeile: Der Kopf ist breit, darunter wird die
   Figur schmaler (Hals/Schulter), dann wieder breiter (Rumpf). Gesucht ist das Minimum
   dieses Verlaufs zwischen 20 % und 55 % der Figurenhöhe. Wer es besser weiß, gibt
   `--halslinie` vor.
2. KOPF VERMESSEN oberhalb dieser Linie: Breite, Mitte, oberster Pixel.
3. QUADRAT bilden: Kante = Figurenbreite × `--kante` (Vorgabe 1,157), waagerecht auf die
   Kopfmitte zentriert.
4. Oben `--luft` × Kante Platz über dem höchsten Pixel lassen (Vorgabe 0,125). Der
   Ausschnitt ragt dabei über den oberen Rand der Master-Leinwand hinaus — die bestehenden
   tun das alle (Wisent −76, Eichhörnchen −159). Was draußen liegt, ist transparent.

Warum überhaupt Luft: Ohne Rand schneidet das Werkzeug den Kopf gern neu zu oder zoomt
heran. Mit sichtbarem Rand ringsum versteht es den Ausschnitt als gegeben.

Aufruf
------
    python kopfausschnitt.py MASTER.png -o VORLAGE.png [--halslinie 430] [--kante 1.157] [--luft 0.125]

Gegenprobe: Mit den Vorgabewerten trifft das Skript die von Hand gesetzten Kanten auf unter
ein Prozent genau (Wisent 914 gegen 916, Eichhörnchen 960 gegen 956, Wolf 870 gegen 876).
Die senkrechte Lage weicht ab, weil sie von Hand zwischen 0,088 und 0,175 schwankte — hier
steht sie einheitlich auf 0,125.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def halslinie(maske: np.ndarray, oben: int, unten: int) -> int:
    """Zeile mit der schmalsten Stelle zwischen Kopf und Rumpf."""
    hoehe = unten - oben
    # Nur zwischen 20 % und 55 % der Figurenhöhe suchen: Darüber liegt der Kopf selbst,
    # darunter wird jede Taille mitgezählt, die der Rumpf noch hat.
    von, bis = oben + int(0.20 * hoehe), oben + int(0.55 * hoehe)
    breiten = np.array([maske[y].sum() for y in range(von, bis)])
    # Leicht glätten, sonst trifft das Minimum eine einzelne ausgefranste Zeile.
    kern = np.ones(15) / 15
    glatt = np.convolve(breiten, kern, mode="same")
    return von + int(np.argmin(glatt[7:-7])) + 7


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("master")
    p.add_argument("-o", "--out", required=True)
    p.add_argument("--halslinie", type=int, default=None,
                   help="Zeile, unterhalb derer der Kopf endet. Ohne Angabe gemessen.")
    p.add_argument("--kante", type=float, default=1.157,
                   help="Kantenlänge als Vielfaches der FIGURENBREITE (Vorgabe 1,157, "
                        "Mittel der fünf von Hand gesetzten Ausschnitte)")
    p.add_argument("--luft", type=float, default=0.125,
                   help="Platz über dem Kopf als Vielfaches der Kante (Vorgabe 0,125)")
    a = p.parse_args()

    master = Image.open(a.master).convert("RGBA")
    m = np.array(master)[:, :, 3] > 8
    ys, xs = np.where(m)
    oben, unten = int(ys.min()), int(ys.max())

    hals = a.halslinie if a.halslinie is not None else halslinie(m, oben, unten)
    kopf = m[oben:hals]
    kys, kxs = np.where(kopf)
    k_links, k_rechts = int(kxs.min()), int(kxs.max())
    k_breite = k_rechts - k_links + 1
    k_mitte = (k_links + k_rechts) / 2

    f_breite = int(xs.max() - xs.min() + 1)
    kante = int(round(f_breite * a.kante))
    vx = int(round(k_mitte - kante / 2))
    vy = int(round(oben - a.luft * kante))

    ausschnitt = Image.new("RGBA", (kante, kante), (0, 0, 0, 0))
    ausschnitt.paste(master, (-vx, -vy))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    ausschnitt.save(a.out)

    b = np.array(ausschnitt)[:, :, 3] > 8
    bys, bxs = np.where(b)
    print(f"geschrieben: {a.out}  {kante}x{kante} RGBA")
    print(f"  Halslinie   y {hals}" + ("" if a.halslinie is not None else "  (gemessen)"))
    print(f"  Kopf        x {k_links}-{k_rechts}  Breite {k_breite}  Mitte {k_mitte:.0f}")
    print(f"  Figur       Breite {f_breite}")
    print(f"  Ausschnitt  Kante {kante} = {a.kante:.3f} × Figurenbreite, "
          f"Versatz im Master {vx} {vy}")
    print(f"  darin liegt die Figur bei x {bxs.min()}-{bxs.max()}, y {bys.min()}-{bys.max()}")
    print(f"  Rand um den Kopf: links {k_links - vx}, rechts {vx + kante - 1 - k_rechts}, "
          f"oben {oben - vy}")
    print()
    print("Für die Auftragstexte:")
    print(f"  Bildgröße im Prompt:            {kante} × {kante} Pixel")
    print(f"  kopf_einpassen.py --vorlage-versatz {vx} {vy}")
    print()
    print("Noch einzumessen (am Master, nicht hier): --aendert je Zustand sowie --fenster")
    print("und --maskenfenster für zustand_montage.py. Faustregeln aus dem 2026-09-14:")
    print("  · --fenster muss zu mindestens 95 % INNERHALB der Figur liegen. Ein Fenster mit")
    print("    Hintergrund vergleicht Hintergrund mit Hintergrund und richtet falsch aus.")
    print("  · --maskenfenster eng um die Änderung, Ränder am Master ablesen, nicht rechnen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
