#!/usr/bin/env python3
"""Render the app/icon.png and app/apple-icon.png from the monogram geometry.

The committed SVG (app/icon.svg) is the source of truth; this exists so the
PNG rasters can be regenerated at any size without a designer, and documents
the exact geometry the SVG uses. Pillow only, run from the repo root:

    python3 scripts/brand/export-icons.py

apple-icon is drawn on a fully opaque plate — iOS ignores alpha.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"

BG = (10, 10, 11, 255)
AMBER = (217, 154, 43, 255)


def draw_icon(size: int) -> Image.Image:
    s = size / 64  # one scale from the 64-unit viewBox the SVG uses
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=14 * s, fill=BG)

    w = 3 * s  # the SVG stroke width, as a filled band height
    bands = [20, 28, 36, 44]
    runs = {20: [(16, 28), (38, 48)], 28: [(16, 34), (38, 54)],
            36: [(16, 28), (38, 48)], 44: [(16, 34), (38, 54)]}
    for y, spans in runs.items():
        for x0, x1 in spans:
            d.rounded_rectangle(
                [x0 * s, (y - 1.5) * s, x1 * s, (y + 1.5) * s],
                radius=w / 2, fill=AMBER,
            )
    return img


def main() -> None:
    draw_icon(64).save(APP / "icon.png")
    apple = Image.new("RGBA", (180, 180), BG)
    apple.alpha_composite(draw_icon(164), (8, 8))
    apple.convert("RGB").save(APP / "apple-icon.png")
    print("wrote app/icon.png (64) and app/apple-icon.png (180)")


if __name__ == "__main__":
    main()
