#!/usr/bin/env python3
"""Misst, wie eine Kopfausschnitt-Lieferung zur hochgeladenen Vorlage steht.

Wozu
----
Der Kopfausschnitt-Weg lädt beim Bild-Tool nur den Kopf hoch
(`<tier>_kopfausschnitt_vorlage.png`) und bekommt ihn mit geänderten Augen oder
geändertem Mund zurück. Der Auftragstext verlangt ausdrücklich „gleiche Stelle,
gleiche Größe, gleicher Abstand nach oben, links und rechts" — und genau daran
hält sich das Werkzeug regelmäßig NICHT. Die Lieferung vom 2026-09-14
(Eichhörnchen, Blinzeln) kam mit 1254 statt 956 px Kantenlänge zurück, der Kopf
darin 20 % größer und um gut 130 px verschoben.

Für `zustand_montage.py` ist das kein Problem, SOLANGE es weiß, wohin der
Ausschnitt gehört: Es übernimmt ohnehin nur die geänderte Region und lässt
Silhouette, Körper und Alphakanal beim Master. Seine eigene Feinsuche deckt aber
nur ein schmales Fenster ab (Vorgabe 0,90–1,06 bei ±40 px). Eine um ein Fünftel
verschobene Lieferung liegt weit außerhalb — die Suche landet dann am Rand ihres
Bereichs und richtet auf ein falsches Optimum aus. Am Ergebnis sieht man das
nicht sofort; man sieht nur, dass die Restabweichung zu hoch ist.

Dieses Skript nimmt der Montage die Grobsuche ab und liefert die beiden Zahlen,
die sie braucht: `--lieferung-groesse` und `--lieferung-versatz`.

Verfahren
---------
Rastersuche über Maßstab und Versatz, verglichen wird die mittlere
Helligkeitsabweichung zwischen Lieferung und Vorlage — die Region, in der sich
etwas ändern SOLL (Augen bzw. Mund), wird dabei ausgenommen. Gerechnet wird
zuerst auf einem Viertel der Auflösung (schnell, grob), dann auf voller
Auflösung in einem engen Fenster um das grobe Optimum.

Aufruf
------
    python kopf_einpassen.py VORLAGE.png LIEFERUNG.png \
        --vorlage-versatz 119 -159 --aendert 470 640 320 660

`--vorlage-versatz` ist die Stelle, an der die Vorlage im Master sitzt (steht in
der rig_config beim jeweiligen Zustand im Montage-Befehl). `--aendert` ist die
Region in VORLAGEN-Koordinaten, in der die Lieferung anders sein darf.
"""
from __future__ import annotations

import argparse

import numpy as np
from PIL import Image


def suche(vorlage: Image.Image, lieferung: Image.Image, aendert,
          skalen, weite: int, schritt: int, teiler: int, zentrum=(0, 0),
          nach_silhouette: bool = False):
    """Bestes (Fehler, Maßstab, dy, dx) für Lieferung → Vorlage, in Vorlagen-Pixeln.

    `zentrum` ist der Versatz, um den herum gesucht wird — die Feinsuche bekommt
    hier das Ergebnis der Grobsuche. Ohne das sucht sie um den Nullpunkt und
    findet bei einer stark verschobenen Lieferung nichts Brauchbares.

    `nach_silhouette` vergleicht den ALPHAKANAL statt der Helligkeit. Das ist für
    die Grobsuche deutlich verlässlicher: Helligkeiten haben bei einer Figur mit
    großen gleichmäßigen Flächen (Fuchs: Stirn, Wangen) mehrere fast gleich gute
    Optima, die Silhouette hat genau eines. Beim Fuchs-Blinzeln am 2026-09-14 fand
    die Helligkeitssuche 0,95 statt der richtigen 0,81 — die Montage musste danach
    noch einmal um 0,85 nachkorrigieren und lief dabei an den Rand ihres Bereichs.
    """
    n = vorlage.size[0] // teiler
    v = np.array(vorlage.resize((n, n), Image.LANCZOS))
    grau_v = (v[:, :, 3].astype(np.float32) if nach_silhouette
              else v[:, :, :3].astype(np.float32).mean(axis=2))
    vergleich = (np.ones(grau_v.shape, bool) if nach_silhouette else v[:, :, 3] > 200)
    y0, y1, x0, x1 = (k // teiler for k in aendert)
    vergleich[y0:y1, x0:x1] = False
    if vergleich.sum() < 1000:
        raise SystemExit("Zu wenig Vergleichsfläche — stimmt --aendert?")

    mitte_y, mitte_x = (k // teiler for k in zentrum)
    rand = n // 2 + max(abs(mitte_y), abs(mitte_x)) + 4
    bestes = None
    for s in skalen:
        gr = max(1, int(round(n * s)))
        pad = Image.new("RGBA", (n + 2 * rand, n + 2 * rand), (0, 0, 0, 0))
        pad.paste(lieferung.resize((gr, gr), Image.LANCZOS), (rand, rand))
        pa = np.array(pad)
        grau = (pa[:, :, 3].astype(np.float32) if nach_silhouette
                else pa[:, :, :3].astype(np.float32).mean(axis=2))
        w = max(1, weite // teiler)
        st = max(1, schritt // teiler)
        for dy in range(mitte_y - w, mitte_y + w + 1, st):
            for dx in range(mitte_x - w, mitte_x + w + 1, st):
                probe = grau[rand + dy:rand + dy + n, rand + dx:rand + dx + n]
                fehler = float(np.abs(grau_v - probe)[vergleich].mean())
                if bestes is None or fehler < bestes[0]:
                    bestes = (fehler, float(s), dy * teiler, dx * teiler)
    return bestes


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("vorlage", help="der hochgeladene Kopfausschnitt")
    p.add_argument("lieferung", help="was das Bild-Tool zurückgegeben hat")
    p.add_argument("--vorlage-versatz", type=int, nargs=2, required=True, metavar=("X", "Y"),
                   help="Wo die Vorlage im Master sitzt (aus der rig_config)")
    p.add_argument("--aendert", type=int, nargs=4, required=True,
                   metavar=("Y0", "Y1", "X0", "X1"),
                   help="Region in VORLAGEN-Koordinaten, die sich ändern darf "
                        "(Augen beim Blinzeln, Mund beim Sprechen)")
    p.add_argument("--skalen", type=float, nargs=3, default=(0.55, 1.45, 0.02),
                   metavar=("VON", "BIS", "SCHRITT"),
                   help="Grobsuche. Absichtlich weit — das Werkzeug hält sich nicht "
                        "an die geforderte Größe.")
    p.add_argument("--weite", type=int, default=320, help="Suchweite in Vorlagen-Pixeln")
    a = p.parse_args()

    vorlage = Image.open(a.vorlage).convert("RGBA")
    lieferung = Image.open(a.lieferung).convert("RGBA")
    if vorlage.size[0] != vorlage.size[1]:
        raise SystemExit("Die Vorlage muss quadratisch sein.")
    print(f"Vorlage {vorlage.size[0]}x{vorlage.size[1]}, "
          f"Lieferung {lieferung.size[0]}x{lieferung.size[1]}"
          + ("  (gleiche Kantenlänge)" if vorlage.size == lieferung.size
             else "  ← andere Kantenlänge als gefordert"))

    # Hat die Lieferung überhaupt einen echten Alphakanal? Ohne ihn (Karomuster ins
    # Bild gemalt) taugt die Silhouettensuche nicht und wir bleiben bei der Helligkeit.
    al = np.array(lieferung)[:, :, 3]
    echte_silhouette = bool((al < 250).mean() > 0.02)
    if not echte_silhouette:
        print("Hinweis: Die Lieferung hat keinen brauchbaren Alphakanal — "
              "Grobsuche läuft über die Helligkeit statt über die Silhouette.")

    grob = suche(vorlage, lieferung, a.aendert,
                 np.arange(*a.skalen), a.weite, 4, teiler=4,
                 nach_silhouette=echte_silhouette)
    print(f"grob:  Maßstab {grob[1]:.3f}  dy {grob[2]}  dx {grob[3]}  "
          f"({'Silhouette' if echte_silhouette else 'Helligkeit'}, "
          f"Abweichung {grob[0]:.2f}/255)")

    # Feinsuche über die Helligkeit, aber in einem Bereich, der breit genug ist,
    # um einen Grobfehler von einer Rasterstufe aufzufangen.
    fein = suche(vorlage, lieferung, a.aendert,
                 np.arange(grob[1] - 0.04, grob[1] + 0.041, 0.005),
                 28, 4, teiler=1, zentrum=(grob[2], grob[3]))
    fehler, s, dy, dx = fein
    kante = int(round(vorlage.size[0] * s))
    # dy/dx sind Verschiebungen des AUSSCHNITTFENSTERS; die Lieferung selbst
    # verschiebt sich entgegengesetzt.
    vx = a.vorlage_versatz[0] - dx
    vy = a.vorlage_versatz[1] - dy
    print(f"fein:  Maßstab {s:.3f}  dy {dy}  dx {dx}  (Abweichung {fehler:.2f}/255)")
    print()
    print("Für zustand_montage.py:")
    print(f"  --lieferung-groesse {kante} --lieferung-versatz {vx} {vy} "
          f"--skalen 0.80 1.12 0.005 --suchweite 90")
    print()
    print("WICHTIG: Die Zahlen oben sind ein Startpunkt, keine exakte Lösung. Die")
    print("Rastersuche hier vergleicht eine neu gezeichnete Lieferung mit der Vorlage;")
    print("bei Figuren mit großen gleichmäßigen Flächen kann sie um bis zu ein Fünftel")
    print("danebenliegen (Fuchs, 2026-09-14: 0,95 statt 0,81). Deshalb bekommt die")
    print("Montage bewusst einen weiten --skalen-Bereich. NACH dem Lauf prüfen:")
    print("  · Die gemeldete Skalierung darf NICHT am Rand des Bereichs liegen.")
    print("    Liegt sie dort, den Bereich in diese Richtung erweitern und neu laufen.")
    print("  · Die Restabweichung sollte unter der max_abweichung der Figur liegen (14).")
    print()
    if fehler > 20:
        print(f"ACHTUNG: {fehler:.1f}/255 Restabweichung außerhalb der Änderungsregion.")
        print("Die Lieferung ist außerhalb der Augen/des Mundes deutlich neu gezeichnet.")
        print("Das ist kein Ausschlusskriterium — die Montage übernimmt ohnehin nur die")
        print("Änderungsregion —, aber das Maskenfenster muss dann ENG sitzen, sonst")
        print("wandern fremde Unterschiede (Ohren, Schwanz, Zähne) mit ins Ergebnis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
