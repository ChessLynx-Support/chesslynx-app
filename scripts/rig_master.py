#!/usr/bin/env python3
"""
ChessLynx — Rig-Master-Skript (Stand 2026-09-12)

Baut aus freigegebenen ZUSTANDSBILDERN eines Charakters ein vollständiges Rig-Paket
(Zustände, abgeleitete Ebenen, Beweisbilder, Manifest, Prüfsummen, App-Export).

Warum so: Seit dem 2026-09-11 ist die Zustands-Methode Standard (siehe
claude/tier_animationen_produktionsmethode_und_prompts_2026-09-11.md). Das Bild-Tool
liefert nur vollständige Bilder; alles Feinere (Ebenentrennung, Registrierung, Export)
entsteht hier deterministisch aus dem Vergleich zweier Zustände. Cutout-Rigs mit
einzeln generierten Körperteil-Ebenen sind bewusst NICHT vorgesehen — sie sind bei
Fuchs, Schildkröte und zuletzt beim externen Bären-Rig gescheitert.

Aufrufe:
    python scripts/rig_master.py clean  <bild.png> [-o ziel.png]
    python scripts/rig_master.py build  scripts/rig_configs/schildkroete.json
    python scripts/rig_master.py check  scripts/rig_configs/schildkroete.json
    python scripts/rig_master.py build-all scripts/rig_configs/
    python scripts/rig_master.py todo    scripts/rig_configs/
    python scripts/rig_master.py prompts scripts/rig_configs/ -o auftraege.md

`todo` listet alle noch nicht erzeugten Zustandsbilder mit Ablageort und fertigem
Auftragstext; `prompts` schreibt daraus eine Copy-&-Paste-Vorlage fürs Bild-Tool
(je Zustand: welches Bild hochladen, welcher Text, wohin das Ergebnis). Die
Konfigurationsdateien selbst gehören NICHT ins Bild-Tool — sie steuern dieses Skript.
Ein Zustand darf in der
Konfiguration mit "geplant": true stehen; er wird dann übersprungen, und alles, was auf
ihm aufbaut, ebenfalls. Dadurch ist jede Konfiguration der vollständige Rig-Plan einer
Figur, auch solange erst ein Teil der Bilder vorliegt.

Optionen für build/check/build-all:
    --grafiken PFAD   Master-Archiv (Standard: <Projektordner>/Grafiken)
    --repo PFAD       App-Repository (Standard: Ordner über scripts/)
    --gif             zusätzlich eine Bewegungsvorschau als GIF schreiben
    --dry-run         nichts schreiben, nur prüfen und berichten

Abhängigkeiten: Pillow, NumPy. (SciPy ist optional; ohne SciPy laufen die
morphologischen Schritte über eine eigene, etwas langsamere NumPy-Variante.)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --------------------------------------------------------------------------------------
# Kleine Bild-Helfer (bewusst ohne SciPy-Zwang, damit das Skript überall läuft)
# --------------------------------------------------------------------------------------


def _binary_dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        p = np.pad(out, 1, mode="constant", constant_values=False)
        out = (
            p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
        )
    return out


def _binary_erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    return ~_binary_dilate(~mask, iterations)


def _label_largest(mask: np.ndarray) -> np.ndarray:
    """Größte zusammenhängende Fläche (4er-Nachbarschaft), ohne SciPy."""
    try:
        from scipy import ndimage  # type: ignore

        lab, n = ndimage.label(mask)
        if n == 0:
            return mask
        groesse = ndimage.sum(mask, lab, range(1, n + 1))
        return lab == (int(np.argmax(groesse)) + 1)
    except Exception:
        pass
    # Fallback: iteratives Wachsen vom größten Startpunkt aus.
    besucht = np.zeros_like(mask)
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return mask
    start = np.zeros_like(mask)
    start[ys[len(ys) // 2], xs[len(xs) // 2]] = True
    vorher = -1
    while start.sum() != vorher:
        vorher = start.sum()
        start = _binary_dilate(start) & mask
    besucht |= start
    return besucht


def alpha_bereinigen(img: Image.Image, rand_iter: int = 6, kern_iter: int = 3) -> tuple[Image.Image, dict]:
    """
    Bekanntes Muster aller Bild-KI-Lieferungen: Die Figur ist innen nicht ganz deckend
    (Alpha 243–254) und außen liegt ein Rauschen aus Alpha 1–3. Beides wird hier
    bereinigt, RGB bleibt unangetastet.
    """
    a = np.array(img.convert("RGBA"))
    alpha = a[..., 3]
    kern = alpha >= 128
    haupt = _label_largest(kern)
    nahe = _binary_dilate(haupt, rand_iter)
    innen = _binary_erode(haupt, kern_iter)
    neu = alpha.copy()
    entfernt = int(((alpha > 0) & ~nahe).sum())
    neu[~nahe] = 0
    angehoben = int((innen & (alpha >= 200) & (alpha < 255)).sum())
    neu[innen & (alpha >= 200)] = 255
    a[..., 3] = neu
    bericht = {
        "streupixel_entfernt": entfernt,
        "innenraum_auf_255": angehoben,
        "alpha_min_innen_vorher": int(alpha[innen].min()) if innen.any() else 0,
    }
    return Image.fromarray(a), bericht


def bbox(img: Image.Image, schwelle: int = 128) -> tuple[int, int, int, int]:
    a = np.array(img.convert("RGBA"))[..., 3]
    maske = Image.fromarray(((a >= schwelle) * 255).astype("uint8"))
    b = maske.getbbox()
    if b is None:
        raise ValueError("Bild ist vollständig transparent")
    return b


def versatz_schaetzen(a: Image.Image, b: Image.Image) -> tuple[int, int]:
    """Ganzzahliger Versatz zwischen zwei Zuständen über Kreuzkorrelation der Alphakanäle."""
    fa = np.array(a.convert("RGBA"))[..., 3].astype(float)
    fb = np.array(b.convert("RGBA"))[..., 3].astype(float)
    fa -= fa.mean()
    fb -= fb.mean()
    korr = np.fft.ifft2(np.fft.fft2(fa) * np.conj(np.fft.fft2(fb))).real
    dy, dx = np.unravel_index(int(np.argmax(korr)), korr.shape)
    h, w = korr.shape
    if dy > h // 2:
        dy -= h
    if dx > w // 2:
        dx -= w
    return int(dx), int(dy)


def mittlere_abweichung(a: Image.Image, b: Image.Image, maske: np.ndarray | None = None) -> float:
    x = np.array(a.convert("RGBA")).astype(int)
    y = np.array(b.convert("RGBA")).astype(int)
    if x.shape != y.shape:
        return float("inf")
    sichtbar = (x[..., 3] > 200) & (y[..., 3] > 200)
    if maske is not None:
        sichtbar &= maske
    if not sichtbar.any():
        return 0.0
    return float(np.abs(x[..., :3] - y[..., :3]).max(-1)[sichtbar].mean())


def differenz_ebene(
    basis: Image.Image,
    neu: Image.Image,
    schwelle: int = 40,
    feather: float = 2.0,
    region: list[int] | None = None,
    dilatation: int = 2,
) -> tuple[Image.Image, dict]:
    """
    Ebene aus dem Unterschied zweier vollständiger Zustände (z. B. geschlossene Lider,
    herausschauender Kopf). Die Maske folgt damit zwangsläufig der echten Kontur —
    geometrische Masken (Kreise, Rechtecke) kann dieses Verfahren gar nicht erzeugen.
    """
    A = np.array(basis.convert("RGBA")).astype(int)
    B = np.array(neu.convert("RGBA")).astype(int)
    if A.shape != B.shape:
        raise ValueError("Zustände haben unterschiedliche Größe — vorher registrieren")
    d = np.abs(A[..., :3] - B[..., :3]).max(-1)
    maske = d > schwelle
    if region:
        r = np.zeros(maske.shape, bool)
        x0, y0, x1, y1 = region
        r[y0:y1, x0:x1] = True
        maske &= r
    maske = _binary_dilate(_binary_erode(maske, 1), 3)
    maske = _binary_dilate(maske, dilatation)
    weich = np.array(
        Image.fromarray((maske * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(feather))
    ).astype(float) / 255.0
    out = B.copy().astype(float)
    out[..., 3] = B[..., 3] * weich
    ebene = Image.fromarray(np.clip(out, 0, 255).astype("uint8"))
    return ebene, {
        "geaenderte_pixel": int(maske.sum()),
        "schwelle": schwelle,
        "feather": feather,
        "maskenart": "differenz",
    }


def auf_leinwand(
    img: Image.Image, kante: int, skala: float, mitte_x: float, boden_y: float
) -> Image.Image:
    """Skaliert ein Bild und setzt es so, dass Fußpunkt und Mitte auf die Zielwerte fallen."""
    b = bbox(img)
    zuschnitt = img.crop(b)
    w = max(1, round(zuschnitt.width * skala))
    h = max(1, round(zuschnitt.height * skala))
    klein = zuschnitt.resize((w, h), Image.LANCZOS)
    leinwand = Image.new("RGBA", (kante, kante), (0, 0, 0, 0))
    leinwand.alpha_composite(klein, (round(mitte_x - w / 2), round(boden_y - h)))
    return leinwand


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


# --------------------------------------------------------------------------------------
# Konfiguration
# --------------------------------------------------------------------------------------


@dataclass
class Kontext:
    grafiken: Path
    repo: Path
    dry_run: bool = False
    gif: bool = False
    protokoll: list[str] = field(default_factory=list)

    def sag(self, text: str) -> None:
        self.protokoll.append(text)
        print(text)


def pfad(ktx: Kontext, wert: str) -> Path:
    p = Path(wert)
    if p.is_absolute():
        return p
    if wert.startswith("assets/") or wert.startswith("src/"):
        return ktx.repo / wert
    return ktx.grafiken / wert


# --------------------------------------------------------------------------------------
# Hauptablauf
# --------------------------------------------------------------------------------------


def rig_bauen(cfg: dict, ktx: Kontext) -> dict:
    name = cfg["character"]
    ktx.sag(f"\n=== {cfg.get('display_name', name)} ===")

    # 1) Zustände laden und bereinigen
    #
    # Ein Zustand darf "geplant" sein: dann ist das Bild noch nicht erzeugt. Solche
    # Zustände (und alles, was auf ihnen aufbaut) werden übersprungen und am Ende als
    # offene Produktionsschritte ausgewiesen. Dadurch ist eine Konfiguration immer der
    # vollständige Rig-Plan einer Figur, auch wenn erst ein Teil der Bilder vorliegt.
    zustaende: dict[str, Image.Image] = {}
    quellen: dict[str, dict] = {}
    offen: list[dict] = []
    for z in cfg["states"]:
        p = pfad(ktx, z["file"]) if z.get("file") else None
        if z.get("geplant") or p is None or not p.exists():
            offen.append(
                {
                    "art": "zustand",
                    "id": z["id"],
                    "datei": str(p) if p else None,
                    "zweck": z.get("zweck", ""),
                    "produktion": z.get("produktion", ""),
                }
            )
            ktx.sag(f"  Zustand {z['id']:16s} — noch nicht produziert, übersprungen")
            continue
        img = Image.open(p).convert("RGBA")
        bericht = {}
        if z.get("clean", True):
            img, bericht = alpha_bereinigen(img)
        zustaende[z["id"]] = img
        quellen[z["id"]] = {
            "datei": str(p),
            "sha256_quelle": sha256(p),
            "alpha_bereinigung": bericht,
        }
        ktx.sag(f"  Zustand {z['id']:16s} {img.size}  {bericht}")

    # 2) Registrierung prüfen (Zustände, die deckungsgleich sein müssen)
    registrierung = {}
    for z in cfg["states"]:
        ref = z.get("registered_to")
        if not ref or z["id"] not in zustaende or ref not in zustaende:
            continue
        dx, dy = versatz_schaetzen(zustaende[ref], zustaende[z["id"]])
        region = z.get("change_region")
        maske = None
        if region:
            maske = np.ones(np.array(zustaende[ref]).shape[:2], bool)
            x0, y0, x1, y1 = region
            maske[y0:y1, x0:x1] = False
        abw = mittlere_abweichung(zustaende[ref], zustaende[z["id"]], maske)
        registrierung[z["id"]] = {"gegen": ref, "versatz_px": [dx, dy], "mittlere_abweichung": round(abw, 3)}
        grenze = z.get("max_abweichung", 2.0)
        # Bei Zuständen, die geometrisch aus dem Master abgeleitet sind (zustand_kopfsenken.py),
        # ist der Versatz per Konstruktion null. Die Kreuzkorrelation findet dort trotzdem
        # gelegentlich ein falsches Maximum, weil der gesenkte Kopf mehrere ähnlich gute
        # Überlagerungen zulässt. Die Farbabweichung bleibt in diesen Fällen das verlässliche Maß.
        versatz_pruefen = z.get("versatz_pruefen", True)
        versatz_ok = (abs(dx) <= 6 and abs(dy) <= 6) if versatz_pruefen else True
        status = "ok" if versatz_ok and abw <= grenze else "PRÜFEN"
        zusatz = "" if versatz_pruefen else "  (Versatz nicht bewertet, Zustand ist abgeleitet)"
        ktx.sag(f"  Registrierung {z['id']} gegen {ref}: Versatz {dx},{dy} px, "
                f"Abweichung {abw:.2f}/255 → {status}{zusatz}")

    # 3) Abgeleitete Ebenen
    ebenen: dict[str, Image.Image] = {}
    ebenen_info: dict[str, dict] = {}
    for l in cfg.get("layers", []):
        gebraucht = [l.get("from"), l.get("to"), l.get("state")]
        fehlt = [s for s in gebraucht if s and s not in zustaende]
        if fehlt:
            offen.append(
                {
                    "art": "ebene",
                    "id": l["id"],
                    "wartet_auf": fehlt,
                    "zweck": l.get("zweck", ""),
                }
            )
            ktx.sag(f"  Ebene {l['id']:28s} — wartet auf {', '.join(fehlt)}")
            continue
        if l.get("type", "difference") == "difference":
            bild, info = differenz_ebene(
                zustaende[l["from"]],
                zustaende[l["to"]],
                schwelle=l.get("threshold", 40),
                feather=l.get("feather", 2.0),
                region=l.get("region"),
                dilatation=l.get("dilate", 2),
            )
        else:  # vollständiger Zustand als Ebene
            bild, info = zustaende[l["state"]], {"maskenart": "vollbild"}
        ebenen[l["id"]] = bild
        ebenen_info[l["id"]] = info
        ktx.sag(f"  Ebene {l['id']:28s} {info}")

    # 4) Gemeinsame Rig-Leinwand
    lein = cfg.get("canvas", {})
    kante = lein.get("size", 2048)
    rand = lein.get("margin", 0.08)
    ref_id = lein.get("reference_state", cfg["states"][0]["id"])
    ref_bb = bbox(zustaende[ref_id])
    ref_h = ref_bb[3] - ref_bb[1]
    skala_basis = (kante * (1 - 2 * rand)) / ref_h
    mitte_x = kante / 2
    boden_y = kante * (1 - rand)

    rig_ziele: dict[str, Image.Image] = {}
    for z in cfg["states"]:
        if z["id"] not in zustaende:
            continue
        rel = z.get("scale_rel", 1.0)
        folgt = z.get("same_transform_as")
        if folgt:
            # Muss pixelgenau zum Bezugszustand passen (z. B. Kopf-Peek zu Panzer zu):
            # exakt dieselbe Skalierung und Verschiebung verwenden.
            basis_bb = bbox(zustaende[folgt])
            skala = skala_basis * zustaende_rel(cfg, folgt)
            versch_x = mitte_x - (basis_bb[0] + basis_bb[2]) / 2 * skala
            versch_y = boden_y - basis_bb[3] * skala
            b = zustaende[z["id"]]
            gross = b.resize((round(b.width * skala), round(b.height * skala)), Image.LANCZOS)
            leinwand = Image.new("RGBA", (kante, kante), (0, 0, 0, 0))
            leinwand.alpha_composite(gross, (round(versch_x), round(versch_y)))
            rig_ziele[z["id"]] = leinwand
        else:
            rig_ziele[z["id"]] = auf_leinwand(zustaende[z["id"]], kante, skala_basis * rel, mitte_x, boden_y)
    for lid, bild in ebenen.items():
        herkunft = next((l for l in cfg["layers"] if l["id"] == lid), {})
        # Die Ebene wird in der Koordinatenlage des Zustands platziert, ÜBER dem sie
        # später liegt (Standard: der Ausgangszustand der Differenz) — sonst verrutscht
        # sie um die wenigen Pixel, um die sich die beiden Zustände unterscheiden.
        bezug = herkunft.get("align_to") or herkunft.get("from") or herkunft.get("state")
        basis_bb = bbox(zustaende[bezug])
        rel = zustaende_rel(cfg, bezug)
        skala = skala_basis * rel
        versch_x = mitte_x - (basis_bb[0] + basis_bb[2]) / 2 * skala
        versch_y = boden_y - basis_bb[3] * skala
        gross = bild.resize((round(bild.width * skala), round(bild.height * skala)), Image.LANCZOS)
        leinwand = Image.new("RGBA", (kante, kante), (0, 0, 0, 0))
        leinwand.alpha_composite(gross, (round(versch_x), round(versch_y)))
        rig_ziele[lid] = leinwand

    # 5) Schreiben
    ziel = pfad(ktx, cfg["rig_dir"])
    previews = cfg.get("previews", {})
    hintergrund = tuple(cfg.get("preview_background", [236, 232, 222, 255]))
    ergebnis = {"states": {}, "layers": {}, "previews": {}}
    if not ktx.dry_run:
        (ziel / "states").mkdir(parents=True, exist_ok=True)
        (ziel / "layers").mkdir(parents=True, exist_ok=True)
        (ziel / "previews").mkdir(parents=True, exist_ok=True)
        for z in cfg["states"]:
            if z["id"] not in rig_ziele:
                continue
            p = ziel / "states" / f"{z['id']}.png"
            rig_ziele[z["id"]].save(p, optimize=True)
            ergebnis["states"][z["id"]] = mess(rig_ziele[z["id"]], p)
        for lid in ebenen:
            p = ziel / "layers" / f"{lid}.png"
            rig_ziele[lid].save(p, optimize=True)
            ergebnis["layers"][lid] = {**mess(rig_ziele[lid], p), **ebenen_info[lid]}
        for pname, teile in previews.items():
            if any(t not in rig_ziele for t in teile):
                ktx.sag(f"  Vorschau {pname:24s} — wartet auf fehlende Zustände")
                continue
            bild = Image.new("RGBA", (kante, kante), hintergrund)
            for t in teile:
                bild.alpha_composite(rig_ziele[t])
            p = ziel / "previews" / f"{pname}.png"
            bild.convert("RGB").save(p, optimize=True)
            ergebnis["previews"][pname] = {"aus": teile, "sha256": sha256(p)}
        zeigbar = {k: v for k, v in previews.items() if all(t in rig_ziele for t in v)}
        kontaktbogen(zeigbar, rig_ziele, hintergrund, kante, ziel / "previews" / "contact_sheet.png")
        if ktx.gif:
            bewegungsvorschau(cfg, rig_ziele, hintergrund, ziel / "bewegungsvorschau.gif")

    # 6) App-Export
    app = []
    for ex in cfg.get("app_export", []):
        # Ein Export ist entweder ein einzelner Zustand ("state") oder eine Schichtung
        # aus Grundzustand und abgeleiteten Ebenen ("compose"). Compose ist der
        # Normalfall für Varianten wie das Blinzeln: der neu generierte Zustand weicht
        # überall minimal vom Grundzustand ab, die Differenz-Ebene über dem
        # Grundzustand ändert dagegen NUR die Augen — sonst flimmert das Bild beim
        # Wechsel.
        teile_ex = ex.get("compose") or [ex["state"]]
        if any(t not in rig_ziele for t in teile_ex):
            continue
        if len(teile_ex) == 1:
            quelle = rig_ziele[teile_ex[0]]
        else:
            quelle = Image.new("RGBA", rig_ziele[teile_ex[0]].size, (0, 0, 0, 0))
            for t in teile_ex:
                quelle.alpha_composite(rig_ziele[t])
            # Auf die Silhouette des Grundzustands beschneiden. Eine Differenz-Ebene darf
            # nie außerhalb der Figur malen; wenn die Änderungsregion in der Konfiguration
            # zu weit gefasst ist, entstehen sonst freischwebende Streifen neben dem Tier
            # (beim Hirsch am 2026-09-13 aufgetreten: ein Band auf Augenhöhe bis zum
            # rechten Bildrand).
            #
            # Schwelle bewusst 0 und nicht 8: Mit 8 fielen die schwächsten Randpixel der
            # Silhouette aus dem zusammengesetzten Bild heraus, im Grundzustand blieben sie
            # stehen. Beim Überblenden flackerte dadurch die Kontur — beim Igel 191 Pixel
            # mit bis zu 20 Stufen Unterschied, alle mit Alpha unter 250, also genau der
            # weiche Saum. Gegen freischwebende Streifen genügt der Umriss selbst.
            basis_alpha = np.array(rig_ziele[teile_ex[0]])[..., 3]
            erlaubt = _binary_dilate(basis_alpha > 0, 2)
            a_q = np.array(quelle)
            a_q[..., 3] = np.where(erlaubt, a_q[..., 3], 0)
            quelle = Image.fromarray(a_q, "RGBA")
        ex = {**ex, "state": ex.get("state", teile_ex[0])}
        c = ex.get("canvas", 768)
        breite_app, hoehe_app = (c, c) if isinstance(c, int) else (int(c[0]), int(c[1]))
        rand_app = ex.get("margin", 0.03)
        rel = ex.get("rel_height", 1.0)
        # Der BEZUGSZUSTAND bestimmt die Zielhöhe; alle übrigen Zustände einer Figur
        # werden mit genau demselben Faktor skaliert. Nur so bleiben die Verhältnisse
        # zwischen den Zuständen erhalten (die zugezogene Schildkröte MUSS kleiner sein
        # als die stehende) und alle Exporte teilen dieselbe Bodenlinie.
        bezug_bild = rig_ziele[ref_id]
        bb_ref = bbox(bezug_bild, 8)
        h_ref = int(hoehe_app * (1 - 2 * rand_app) * rel)
        faktor = h_ref / (bb_ref[3] - bb_ref[1])
        # Ein Zustand, der auf einen anderen registriert ist, zeigt dieselbe Pose an
        # derselben Stelle. Er wird deshalb mit dem AUSSCHNITT des Bezugszustands
        # exportiert — sonst genügt ein Pixel Unterschied in der Silhouette (etwa
        # gesenkte Lider), damit das Bild um ein paar Pixel springt oder anders
        # skaliert wird und die Zustände in der App nicht mehr deckungsgleich sind.
        geo_id = ex.get("geometry_from") or geometrie_bezug(cfg, ex["state"])
        b_geo = bbox(rig_ziele.get(geo_id, quelle), 8)
        # "geometry_union": der Ausschnitt umfasst zusätzlich die genannten Zustände.
        #
        # Nötig, seit es GESTEN gibt. Ein Blinzeln bleibt innerhalb der Silhouette des
        # Grundzustands — dessen Ausschnitt genügt. Eine erhobene Pfote, ein gehobener
        # Flügel oder ein gedrehter Kopf ragen darüber hinaus; mit dem Ausschnitt des
        # Grundzustands wären sie abgeschnitten (beim Schwan fehlten 36 % der Bildbreite).
        #
        # Umgekehrt darf der größere Ausschnitt die Figur nicht verschieben oder
        # verkleinern: Die Zustände einer Familie werden in der App übereinandergelegt.
        # Deshalb gilt der größere Ausschnitt für ALLE Exporte der Familie (auch für den
        # Grundzustand), und die Platzierung hängt weiterhin am BEZUGSZUSTAND — seine
        # Bodenlinie und seine Mitte bestimmen, wo die Figur landet. Der Zugewinn ist
        # dadurch reiner, durchsichtiger Rand um dieselbe Figur an derselben Stelle.
        b_state = b_geo
        for uid in ex.get("geometry_union", []):
            if uid not in rig_ziele:
                continue
            bu = bbox(rig_ziele[uid], 8)
            b_state = (min(b_state[0], bu[0]), min(b_state[1], bu[1]),
                       max(b_state[2], bu[2]), max(b_state[3], bu[3]))
        # Passt der Ausschnitt nicht in die Breite (z. B. der Hirsch mit breitem Geweih auf
        # schmaler Leinwand, oder ein gehobener Flügel), wird der MASSSTAB zurückgenommen —
        # nicht nur die Bildgröße. Beides auseinanderlaufen zu lassen war ein Fehler: Die
        # Bodenlinie und die gemeldete Figurenlage werden aus `faktor` gerechnet, das Bild
        # aber aus der gekappten Breite. Beim Lux-Export am 2026-09-14 stand die Figur
        # dadurch 14 px über der Bodenlinie und war 1,4 % zu klein.
        max_w = int(breite_app * (1 - 2 * rand_app))
        breite_ausschnitt = b_state[2] - b_state[0]
        if breite_ausschnitt * faktor > max_w:
            faktor = max_w / breite_ausschnitt
            ktx.sag(f"  Maßstab wegen der Ausschnittbreite auf {faktor:.4f} zurückgenommen "
                    f"({ex['file'].rsplit('/', 1)[-1]})")
        h = max(1, round((b_state[3] - b_state[1]) * faktor))
        w = max(1, round(breite_ausschnitt * faktor))
        klein = quelle.crop(b_state).resize((w, h), Image.LANCZOS)
        leinwand = Image.new("RGBA", (breite_app, hoehe_app), (0, 0, 0, 0))
        # Fußpunkt: entweder fest vorgegeben ("ground_line" = letzte Zeile mit Tier)
        # oder aus dem Rand gerundet. Gerundet, damit oben und unten derselbe Rand
        # entsteht — sonst wandert die Bodenlinie je nach Leinwandhöhe um ein Pixel.
        boden_app = ex.get("ground_line")
        if boden_app is None:
            boden_app = hoehe_app - 1 - round(hoehe_app * rand_app)
        # Senkrecht am Bezugszustand ausrichten, nicht am Ausschnitt: Reicht eine Geste
        # tiefer als der Grundzustand, soll trotzdem der Grundzustand auf der Bodenlinie
        # stehen — sonst hebt die Geste die ganze Figur an.
        oben = int(boden_app) + 1 - max(1, round((b_geo[3] - b_state[1]) * faktor))
        # Waagerecht an der Mitte des Bezugszustands ausrichten, nicht an der eigenen —
        # sonst springt ein Zustand seitlich, dessen Silhouette anders ausfällt.
        mitte_ref = (bb_ref[0] + bb_ref[2]) / 2
        # Bei einem Ausschnitt aus mehreren Zuständen ist die Mitte des Ausschnitts
        # gemeint — die Formel unten setzt daraus die Mitte des BEZUGSZUSTANDS auf die
        # Leinwandmitte, egal wie unsymmetrisch die Geste ausfällt.
        mitte_state = (b_state[0] + b_state[2]) / 2
        links = round(breite_app / 2 + (mitte_state - mitte_ref) * faktor - w / 2)
        leinwand.alpha_composite(klein, (links, oben))
        p = pfad(ktx, ex["file"])
        if not ktx.dry_run:
            p.parent.mkdir(parents=True, exist_ok=True)
            if p.suffix.lower() == ".webp":
                # Verlustfrei: Diese Exporte werden im Wechsel übereinander gezeigt
                # (Grundzustand ↔ Blinzeln). Verlustbehaftete Kompression erzeugt in
                # beiden Bildern unterschiedliches Rauschen, das beim Wechsel als
                # Flimmern über die ganze Figur sichtbar würde — gemessen am Igel
                # 2.615 Pixel mit über 18 Stufen Unterschied außerhalb der Augen.
                leinwand.save(p, lossless=True, quality=100, method=6)
            else:
                leinwand.save(p, optimize=True)
        # Wo der BEZUGSZUSTAND auf dieser Leinwand liegt. Die App braucht genau diese vier
        # Zahlen, um ein Bild mit Gesten-Rand so einzupassen, dass die Figur dieselbe Größe
        # und Stelle behält wie ohne Rand (siehe src/lib/luxAssets.tsx, Funktion `kasten`).
        figur = [
            links + round((b_geo[0] - b_state[0]) * faktor),
            oben + round((b_geo[1] - b_state[1]) * faktor),
            round((b_geo[2] - b_geo[0]) * faktor),
            round((b_geo[3] - b_geo[1]) * faktor),
        ]
        app.append(
            {
                "datei": str(p),
                "groesse": [breite_app, hoehe_app],
                "tier_hoehe": h,
                "bodenlinie_y": int(boden_app),
                "figur_box": figur,
                "sha256": sha256(p) if p.exists() else None,
            }
        )
        ktx.sag(
            f"  App-Export {p.name}: Ausschnitt {w}×{h} px auf {breite_app}×{hoehe_app} px "
            f"Leinwand, Bodenlinie y={int(boden_app)}, Figur x {figur[0]}–{figur[0] + figur[2]}, "
            f"y {figur[1]}–{figur[1] + figur[3]}"
        )

    # 7) Manifest, Prüfsummen, README
    manifest = {
        "character": name,
        "display_name": cfg.get("display_name", name),
        "erzeugt_mit": "scripts/rig_master.py",
        "datum": cfg.get("datum"),
        "canvas": {"size": kante, "margin": rand, "bodenlinie_y": round(boden_y), "mitte_x": round(mitte_x)},
        "quellen": quellen,
        "registrierung": registrierung,
        "states": ergebnis["states"],
        "layers": ergebnis["layers"],
        "previews": ergebnis["previews"],
        "app_export": app,
        "animation": cfg.get("animation", {}),
        "bekannte_einschraenkungen": cfg.get("known_limits", []),
        "offen": offen,
    }
    if not ktx.dry_run:
        (ziel / f"{name}_rig_manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        pruefsummen(ziel)
        readme(cfg, ziel, manifest)
    return manifest


def geometrie_bezug(cfg: dict, state_id: str) -> str:
    """
    Der Zustand, dessen Ausschnitt für den App-Export gilt: bei registrierten Zuständen
    der Bezugszustand (rekursiv), sonst der Zustand selbst.
    """
    for z in cfg["states"]:
        if z["id"] == state_id:
            ref = z.get("registered_to")
            if ref and ref != state_id:
                return geometrie_bezug(cfg, ref)
            return state_id
    return state_id


def zustaende_rel(cfg: dict, state_id: str) -> float:
    for z in cfg["states"]:
        if z["id"] == state_id:
            folgt = z.get("same_transform_as")
            if folgt:
                return zustaende_rel(cfg, folgt)
            return z.get("scale_rel", 1.0)
    return 1.0


def mess(img: Image.Image, p: Path) -> dict:
    a = np.array(img)[..., 3]
    b = bbox(img)
    return {
        "datei": p.name,
        "bbox": list(b),
        "alpha_255": int((a == 255).sum()),
        "alpha_teil": int(((a > 0) & (a < 255)).sum()),
        "sha256": sha256(p),
    }


def kontaktbogen(previews: dict, teile: dict, bg, kante: int, ziel: Path) -> None:
    if not previews:
        return
    n = len(previews)
    z = 420
    bild = Image.new("RGB", (n * z, z + 40), "white")
    d = ImageDraw.Draw(bild)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except Exception:
        f = ImageFont.load_default()
    for i, (pname, schichten) in enumerate(previews.items()):
        c = Image.new("RGBA", (kante, kante), tuple(bg))
        for t in schichten:
            c.alpha_composite(teile[t])
        bild.paste(c.convert("RGB").resize((z, z), Image.LANCZOS), (i * z, 36))
        d.text((i * z + 8, 8), pname, font=f, fill="black")
    bild.save(ziel)


def bewegungsvorschau(cfg: dict, teile: dict, bg, ziel: Path) -> None:
    """Grobe Bewegungsprobe (kein App-Asset): Sequenz aus `animation.preview`."""
    schritte = cfg.get("animation", {}).get("preview", [])
    if not schritte:
        return
    frames, dauer = [], []
    for s in schritte:
        c = Image.new("RGBA", teile[list(teile)[0]].size, tuple(bg))
        for t in s.get("layers", []):
            c.alpha_composite(teile[t])
        frames.append(c.convert("RGB").resize((512, 512), Image.LANCZOS))
        dauer.append(s.get("ms", 400))
    frames[0].save(ziel, save_all=True, append_images=frames[1:], duration=dauer, loop=0)


def pruefsummen(ziel: Path) -> None:
    zeilen = []
    for p in sorted(ziel.rglob("*")):
        if p.is_file() and p.name != "SHA256SUMS.txt":
            zeilen.append(f"{sha256(p)}  {p.relative_to(ziel)}")
    (ziel / "SHA256SUMS.txt").write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def readme(cfg: dict, ziel: Path, manifest: dict) -> None:
    txt = [
        f"# {cfg.get('display_name', cfg['character'])} — Rig-Paket",
        "",
        "Erzeugt mit `scripts/rig_master.py` aus den freigegebenen Zustandsbildern.",
        "Zustands-Methode: Jeder Zustand ist ein vollständiges Bild; feinere Ebenen entstehen",
        "aus der Differenz zweier Zustände, nicht aus einzeln generierten Körperteilen.",
        "",
        f"- Leinwand: {manifest['canvas']['size']}×{manifest['canvas']['size']}, Bodenlinie y={manifest['canvas']['bodenlinie_y']}, Mitte x={manifest['canvas']['mitte_x']}",
        f"- Zustände: {', '.join(manifest['states'])}",
        f"- Ebenen: {', '.join(manifest['layers']) or '—'}",
        f"- Beweisbilder: {', '.join(manifest['previews']) or '—'}",
        "",
        "## Bekannte Einschränkungen",
        "",
    ]
    txt += [f"- {x}" for x in manifest.get("bekannte_einschraenkungen", [])] or ["- keine vermerkt"]
    offen = manifest.get("offen", [])
    if offen:
        txt += ["", "## Noch zu produzieren", ""]
        for o in offen:
            if o["art"] == "zustand":
                txt += [
                    f"### {o['id']} — {o['zweck']}",
                    "",
                    f"Ablage: `{o['datei']}`",
                    "",
                    f"Auftrag ans Bild-Tool: {o['produktion']}",
                    "",
                ]
            else:
                txt.append(f"- Ebene `{o['id']}` entsteht automatisch, sobald {', '.join(o['wartet_auf'])} vorliegt.")
    (ziel / "README.md").write_text("\n".join(txt) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------------------
# QA-Gate
# --------------------------------------------------------------------------------------


def pruefen(cfg: dict, ktx: Kontext) -> bool:
    """Prüft die Eingangsbilder gegen die Projektregeln, ohne etwas zu schreiben."""
    ok = True
    for z in cfg["states"]:
        p = pfad(ktx, z["file"]) if z.get("file") else None
        if p is None or not p.exists():
            ktx.sag(f"  FEHLT: {p}")
            ok = False
            continue
        roh = Image.open(p)
        kein_alpha = roh.mode not in ("RGBA", "LA") and "transparency" not in roh.info
        img = roh.convert("RGBA")
        a = np.array(img)[..., 3]
        if kein_alpha or (a == 255).all():
            # Wiederkehrender Lieferfehler: Das Bild-Tool MALT ein Karomuster ins Bild,
            # statt einen Alphakanal zu liefern. Sieht in der Vorschau aus wie
            # Transparenz, ist aber undurchsichtig — in der App läge ein Karobrett
            # hinter der Figur. Das ist ein harter Abbruchgrund.
            ktx.sag(
                f"  {z['id']:16s} {img.size} → KEIN ECHTER ALPHAKANAL "
                f"(Modus {roh.mode}, Hintergrund undurchsichtig). "
                "Vermutlich ein ins Bild gemaltes Karomuster — neu anfordern."
            )
            ok = False
            continue
        ecken = [a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]]
        b = bbox(img)
        rand = min(b[0], b[1], img.width - b[2], img.height - b[3])
        meldungen = []
        if max(ecken) > 8:
            meldungen.append(f"Ecken nicht transparent ({ecken})")
        if rand < 2:
            meldungen.append(f"Figur berührt den Rand (kleinster Abstand {rand} px)")
        if (a == 255).sum() < (a >= 200).sum() * 0.5:
            meldungen.append("Innenraum nicht voll deckend (wird beim Bauen bereinigt)")
        status = "ok" if not meldungen else "; ".join(meldungen)
        ktx.sag(f"  {z['id']:16s} {img.size} Rand {rand:3d} px → {status}")
        if any("Ecken" in m or "berührt" in m for m in meldungen):
            ok = False
    return ok


# --------------------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------------------


def standard_pfade(script: Path) -> tuple[Path, Path]:
    repo = script.resolve().parents[1]
    projekt = repo.parent.parent  # …/ChessLynx/<repo-ordner>/<repo-ordner>
    return projekt / "Grafiken", repo


# --------------------------------------------------------------------------------------
# Auftragstexte fürs Bild-Tool
# --------------------------------------------------------------------------------------

AUFTRAGSDATEI = "auftragstexte_bildtool.md"
UI_ORDNER = "auftraege_ui"   # Aufträge, die zu keiner Figur gehören (UI-Grafiken, Texturen)


def ui_auftraege(konfig_ordner: Path, ktx: "Kontext") -> list[dict]:
    """Aufträge für UI-Grafiken. Gleiche Datei, gleiche Prioritätenliste wie die
    Figuren-Zustände — Christian will eine einzige Liste, nach Priorität sortiert
    (Festlegung 2026-09-13). Erledigt ist ein Auftrag, sobald seine Zieldatei existiert."""
    ordner = konfig_ordner.parent / UI_ORDNER
    if not ordner.is_dir():
        return []
    aus = []
    for f in sorted(ordner.glob("*.json")):
        a = json.loads(f.read_text(encoding="utf-8"))
        a["_erledigt"] = bool(a.get("file")) and pfad(ktx, a["file"]).exists()
        aus.append(a)
    return aus


def auftragstexte(dateien: list[Path], ktx: "Kontext") -> tuple[str, int]:
    """Copy-&-Paste-Vorlage fürs Bild-Tool: je offenem Zustand ein Block mit dem
    hochzuladenden Master, dem Auftragstext und dem Ablageort.

    Die Konfigurationsdateien selbst gehören NICHT ins Bild-Tool — sie steuern dieses
    Skript. Diese Datei ist die einzige Fassung, aus der bestellt wird; sie wird nach
    jedem build/check automatisch neu geschrieben, damit eine Prompt-Änderung in der
    Konfiguration niemals unbemerkt liegen bleibt (Festlegung Christian, 2026-09-13).

    Reihenfolge: nach dem Feld `prioritaet` der Konfiguration (kleiner = wichtiger),
    bei Gleichstand alphabetisch. Fertige Figuren stehen als kurze Liste am Ende, damit
    oben nur steht, was noch zu tun ist (Festlegung Christian, 2026-09-13).
    """
    from datetime import datetime

    geladen = []
    for f in dateien:
        cfg = json.loads(f.read_text(encoding="utf-8"))
        offen = [
            z for z in cfg["states"]
            if z.get("geplant") or not (z.get("file") and pfad(ktx, z["file"]).exists())
        ]
        fertig = [z for z in cfg["states"] if z not in offen and z.get("file")]
        geladen.append((cfg.get("prioritaet", 5), cfg.get("display_name", cfg["character"]),
                        cfg, offen, fertig))
    for a in ui_auftraege(dateien[0].parent if dateien else Path("."), ktx):
        offen = [] if a["_erledigt"] else [a]
        geladen.append((a.get("prioritaet", 5), a.get("display_name", a["name"]), a, offen,
                        [] if offen else [a]))
    geladen.sort(key=lambda e: (e[0], e[1]))
    mit_offen = [e for e in geladen if e[3]]
    offen_gesamt = sum(len(e[3]) for e in geladen)

    zeilen = [
        "# Auftragstexte fürs Bild-Tool",
        "",
        f"**Stand: {datetime.now().strftime('%Y-%m-%d %H:%M')} — {offen_gesamt} offene Aufträge.** "
        "Steht oben eine ältere Uhrzeit oder eine andere Zahl, ist es eine veraltete Kopie; "
        "die gültige Fassung liegt unter `Grafiken\\auftragstexte_bildtool.md`.",
        "",
        "Automatisch erzeugt aus `scripts/rig_configs/*.json` und `scripts/auftraege_ui/*.json` "
        "durch `scripts/rig_master.py`. "
        "Nicht von Hand bearbeiten; Änderungen gehören in die Konfiguration.",
        "",
        "Je Auftrag eine eigene Anfrage. Hochladen: **nur das genannte Vorlagenbild**, sonst nichts "
        "(bei reinen Textaufträgen gar nichts).",
        "Den Textblock unverändert einfügen. Das Ergebnis unter dem angegebenen Namen ablegen.",
        "",
        f"## Offen ({offen_gesamt})",
        "",
        "Nach Priorität. Fertige Figuren stehen am Ende dieser Datei.",
        "",
    ]
    for prio, name, cfg, offen, _ in mit_offen:
        ids = ", ".join(f"`{z.get('id') or z['name']}`" for z in offen)
        grund = cfg.get("prioritaet_grund", "")
        zeilen.append(f"{prio}. **{name}** — {ids}  ")
        if grund:
            zeilen.append(f"   *{grund}*  ")
    zeilen.append("")

    for prio, name, cfg, offen, _ in mit_offen:
        if "states" not in cfg:                      # UI-Auftrag
            a = cfg
            zeilen += [f"## {name}", "", f"### {a['name']} — {a.get('zweck','')}", ""]
            if a.get("vorlage"):
                zeilen.append(f"**Hochladen:** `{a['vorlage']}`  ")
            else:
                zeilen.append("**Hochladen:** nichts — reiner Textauftrag  ")
            zeilen += [f"**Ergebnis ablegen als:** `{a['file']}`", ""]
            if a.get("hinweis"):
                zeilen += [f"> {a['hinweis']}", ""]
            zeilen += ["```", a.get("produktion", "").strip(), "```", ""]
            if a.get("qa"):
                zeilen += ["**Prüfung nach Lieferung:** " + a["qa"], ""]
            continue
        vorlage = next((z.get("file") for z in cfg["states"] if not z.get("geplant")), "")
        zeilen += [f"## {name}", ""]
        for z in offen:
            quelle = z.get("vorlage") or vorlage
            ablage = z.get("lieferung_nach") or z["file"]
            zeilen += [
                f"### {z['id']} — {z.get('zweck', '')}",
                "",
                f"**Hochladen:** `{quelle}`  ",
                f"**Ergebnis ablegen als:** `{ablage}`",
                "",
            ]
            if z.get("lieferung_nach"):
                # Die Lieferung ist hier Rohstoff, nicht der fertige Zustand: Ein Skript
                # setzt sie in den Master ein. Ohne diesen Hinweis legt man sie versehentlich
                # direkt als Zustandsbild ab.
                zeilen += [
                    f"> Rohlieferung. Der fertige Zustand `{z['file']}` entsteht daraus "
                    "durch das in `produktion` genannte Skript — die Lieferung NICHT direkt "
                    "als Zustandsbild ablegen.",
                    "",
                ]
            zeilen += [
                "```",
                z.get("produktion", "").strip(),
                "```",
                "",
            ]
            if z.get("produktion_alternativ"):
                zeilen += [
                    "**Ausweichfassung** — nur nehmen, wenn der Text oben gesperrt wird:",
                    "",
                    "```",
                    z["produktion_alternativ"].strip(),
                    "```",
                    "",
                ]

    zeilen += ["---", "", "## Erledigt", "",
               "Nur zum Nachschlagen — hier ist nichts mehr zu bestellen.", ""]
    for prio, name, cfg, offen, fertig in geladen:
        if not fertig:
            continue
        stand = "fertig" if not offen else f"{len(offen)} offen"
        zeilen.append(f"**{name}** ({stand})  ")
        for z in fertig:
            frei = z.get("freigabe", "")
            kennung = z.get("id") or z.get("name", "?")
            zeilen.append(f"- `{kennung}` — `{z['file']}`" + (f" · {frei}" if frei else "") + "  ")
        zeilen.append("")
    zeilen.append(f"Offen insgesamt: {offen_gesamt} Aufträge.")
    return "\n".join(zeilen) + "\n", offen_gesamt


def auftragstexte_nachziehen(konfig_ordner: Path, ktx: "Kontext") -> None:
    """Schreibt die Auftragsdatei neu — nach jedem build/check, ohne eigenen Aufruf."""
    if ktx.dry_run:
        return
    dateien = sorted(konfig_ordner.glob("*.json"))
    if not dateien:
        return
    text, offen = auftragstexte(dateien, ktx)
    ziel = ktx.grafiken / AUFTRAGSDATEI
    vorher = ziel.read_text(encoding="utf-8") if ziel.exists() else ""
    if vorher == text:
        return
    ziel.write_text(text, encoding="utf-8")
    ktx.sag(f"  Auftragstexte nachgezogen: {ziel}  ({offen} offen)")
    # Im Ordner der Chat-Anhänge liegt oft eine ältere Kopie derselben Datei. Sie wird
    # mitgezogen, damit nicht versehentlich aus einer veralteten Fassung bestellt wird
    # (passiert am 2026-09-13).
    zweit = ktx.grafiken.parent / "Claude outputs" / AUFTRAGSDATEI
    if zweit.parent.is_dir():
        zweit.write_text(text, encoding="utf-8")
        ktx.sag(f"  Zweitkopie aktualisiert: {zweit}")


def main(argv: list[str] | None = None) -> int:
    g_std, r_std = standard_pfade(Path(__file__))
    p = argparse.ArgumentParser(description="ChessLynx Rig-Master")
    p.add_argument("befehl", choices=["clean", "build", "check", "build-all", "todo", "prompts"])
    p.add_argument("ziel")
    p.add_argument("-o", "--out")
    p.add_argument("--grafiken", default=str(g_std))
    p.add_argument("--repo", default=str(r_std))
    p.add_argument("--gif", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)

    ktx = Kontext(grafiken=Path(args.grafiken), repo=Path(args.repo), dry_run=args.dry_run, gif=args.gif)

    if args.befehl == "clean":
        src = Path(args.ziel)
        img, bericht = alpha_bereinigen(Image.open(src).convert("RGBA"))
        ziel = Path(args.out) if args.out else src.with_name(src.stem + "_alpha_bereinigt.png")
        img.save(ziel, optimize=True)
        print(f"{ziel}  {bericht}")
        return 0

    # Ein Ordner gilt für jeden Befehl als "alle Konfigurationen darin" — nicht nur für
    # build-all. Sonst scheitert `check scripts/rig_configs` an einem IsADirectoryError.
    dateien = (
        sorted(Path(args.ziel).glob("*.json"))
        if args.befehl == "build-all" or Path(args.ziel).is_dir()
        else [Path(args.ziel)]
    )
    if args.befehl == "prompts":
        dateien = sorted(Path(args.ziel).glob("*.json")) if Path(args.ziel).is_dir() else [Path(args.ziel)]
        text, offen_gesamt = auftragstexte(dateien, ktx)
        ziel = Path(args.out) if args.out else ktx.grafiken / AUFTRAGSDATEI
        ziel.write_text(text, encoding="utf-8")
        print(f"geschrieben: {ziel}  ({offen_gesamt} Aufträge)")
        return 0

    if args.befehl == "todo":
        dateien = sorted(Path(args.ziel).glob("*.json")) if Path(args.ziel).is_dir() else [Path(args.ziel)]
        gesamt = 0
        for f in dateien:
            cfg = json.loads(f.read_text(encoding="utf-8"))
            fehlend = [
                z for z in cfg["states"]
                if z.get("geplant") or not (z.get("file") and pfad(ktx, z["file"]).exists())
            ]
            if not fehlend:
                continue
            print(f"\n## {cfg.get('display_name', cfg['character'])}  ({len(fehlend)} Zustände)")
            for z in fehlend:
                gesamt += 1
                print(f"\n- {z['id']} — {z.get('zweck', '')}")
                print(f"  Ablage: {pfad(ktx, z['file'])}")
                print(f"  Auftrag: {z.get('produktion', '')}")
        print(f"\nOffen insgesamt: {gesamt} Zustandsbilder")
        return 0

    fehler = 0
    for f in dateien:
        cfg = json.loads(f.read_text(encoding="utf-8"))
        if args.befehl == "check":
            if not pruefen(cfg, ktx):
                fehler += 1
        else:
            if not pruefen(cfg, ktx):
                ktx.sag("  → Eingangsprüfung nicht bestanden, Paket wird trotzdem gebaut (Werte siehe Manifest)")
            rig_bauen(cfg, ktx)

    # Prompt-Änderungen in den Konfigurationen schlagen sofort auf die Auftragsdatei
    # durch — sonst bestellt man aus einer veralteten Fassung.
    ordner = Path(args.ziel) if Path(args.ziel).is_dir() else Path(args.ziel).parent
    auftragstexte_nachziehen(ordner, ktx)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
