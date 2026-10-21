"""Turn the raw scene renders into web layers.

- downsample the 1.25x supersampled renders (clean edges on grass and crane lattice)
- shallow depth of field on the nearest grass (bottom rows)
- write alpha WebP layers to src/assets/scene/, plus scene.json (hotspot positions, crane rig placement)

Run after render.mjs:  python3 scripts/scene/finish.py  [--meta-only: just refresh scene.json after moving anchors]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "src" / "assets" / "scene"
TARGET = {"desktop": (4400, 2000), "mobile": (1240, 2000)}


def near_blur(img: Image.Image, start: float, radius: float) -> Image.Image:
    """Blend in a blurred copy towards the bottom edge (nearest blades out of focus)."""
    w, h = img.size
    blurred = img.filter(ImageFilter.GaussianBlur(radius))
    y = np.linspace(0, 1, h)
    ramp = np.clip((y - start) / (1 - start), 0, 1) ** 1.6
    mask = Image.fromarray((np.repeat(ramp[:, None], w, axis=1) * 255).astype(np.uint8), "L")
    return Image.composite(blurred, img, mask)


OUT.mkdir(parents=True, exist_ok=True)
anchors = json.load(open(HERE / "out" / "hotspots.json"))
meta_only = "--meta-only" in sys.argv  # anchors moved, renders unchanged: keep the layers and the load crop
old = json.load(open(OUT / "scene.json")) if meta_only else {}
meta = {}
for framing, size in TARGET.items():
    rig = anchors[framing]
    meta[framing] = {"spots": {k: v for k, v in rig.items() if k != "trolley"}, "trolley": rig["trolley"][1]}
    if meta_only:
        meta[framing]["load"] = old[framing]["load"]
        continue
    for layer in ("far", "building", "grass", "load"):
        img = Image.open(HERE / "out" / f"{framing}-{layer}.png").convert("RGBA").resize(size, Image.LANCZOS)
        if layer == "grass":
            img = near_blur(img, 0.86, size[0] / 800)
        if layer == "far":
            img = img.filter(ImageFilter.GaussianBlur(0.6))  # distance: slightly softer than the building
        if layer == "load":
            # a small object: ship only its bounding box, placed on the page by fractions of the frame
            x0, y0, x1, y1 = img.getchannel("A").point(lambda a: 255 if a > 6 else 0).getbbox()
            pad = 12
            x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(size[0], x1 + pad), min(size[1], y1 + pad)
            img = img.crop((x0, y0, x1, y1))
            meta[framing]["load"] = [round(x0 / size[0], 5), round(y0 / size[1], 5), round((x1 - x0) / size[0], 5), round((y1 - y0) / size[1], 5)]
        dest = OUT / f"{framing}-{layer}.webp"
        img.save(dest, "WEBP", quality=88, method=6)
        print(f"  {dest.relative_to(OUT.parent.parent.parent)}  {img.size[0]}x{img.size[1]}  {dest.stat().st_size // 1024} KB")
json.dump(meta, open(OUT / "scene.json", "w"), indent=2)
print("  scene.json:", meta["desktop"])
