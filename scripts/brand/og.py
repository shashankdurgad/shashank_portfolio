#!/usr/bin/env python3
"""Render public/og.png — the 1200x630 link-preview card — from the shipped
portrait geometry.

Why a committed PNG instead of a build-time ImageResponse: the line art is
115 polylines of integer deltas; rasterising it is a two-second offline job,
and a static asset costs zero runtime and zero Satori path-parsing risk. This
script reads the same portrait-geom.json the site loads, so card and canvas
can never drift — whichever theme the chat surface shows, the card is the
dark-inked variant, because link previews live on dark chrome.

Type is set with the system DejaVu faces (the same family shape category as
the site's stack); the card is a preview, the page owns the real typography.

    python3 scripts/brand/og.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
GEOM = ROOT / "app" / "_portrait" / "portrait-geom.json"
OUT = ROOT / "public" / "og.png"

import json

# v2 codec, mirrored from Portrait.tsx: one char per y-delta, base 47 ('#'),
# range 0..24 representing -12..+12. x-deltas shared, absolute start per line.
CODEC_BASE = 47
DELTA_BIAS = 12

W, H = 1200, 630
BG = (10, 10, 11)
INK = (244, 244, 242)
MUTED = (161, 161, 166)
FAINT = (110, 110, 118)
AMBER = (217, 154, 43)


def decode_theme(doc: dict, theme: dict) -> list[list[tuple[int, int]]]:
    """Return 115 polylines in grid coordinates."""
    verts = doc["verts"]
    x_start = doc["xStart"]
    xs = []
    x = x_start
    for ch in doc["xDeltas"]:
        x += ord(ch) - CODEC_BASE - DELTA_BIAS  # x deltas fit the same window
        xs.append(x)
    lines = []
    for i, ys0 in enumerate(theme["yStarts"]):
        y = ys0
        pts = [(xs[0], y)]
        seg = theme["yDeltas"][i * (verts - 1):(i + 1) * (verts - 1)]
        for j, ch in enumerate(seg):
            y += ord(ch) - CODEC_BASE - DELTA_BIAS
            pts.append((xs[j], y))
        lines.append(pts)
    return lines


def main() -> None:
    import sys
    sys.path.insert(0, str(ROOT / "scripts" / "portrait"))
    doc = json.loads(GEOM.read_text())

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Portrait plate: right side, full height minus a 24px margin.
    scale = (H - 48) / doc["height"]
    pw, ph = doc["width"] * scale, doc["height"] * scale
    ox, oy = W - pw - 56, 24
    d.rounded_rectangle([ox - 16, 8, W - 24, H - 8], radius=18, outline=(38, 38, 42), width=1)

    theme = doc["themes"]["dark"]
    lw = max(1, round(scale * 1.15))
    for pts in decode_theme(doc, theme):
        d.line(
            [(ox + x * scale, oy + y * scale) for x, y in pts],
            fill=INK, width=lw, joint="curve",
        )

    # Type block, left column.
    def font(size: int, kind: str = "DejaVuSans") -> ImageFont.FreeTypeFont:
        return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{kind}.ttf", size)

    d.text((72, 96), "LONDON, UK", font=font(20, "DejaVuSansMono"), fill=FAINT)
    d.text((72, 150), "Shashank Durgad", font=font(76, "DejaVuSerif-Bold"), fill=INK)

    tagline = "I build agentic AI systems —"
    tagline2 = "and prove they work."
    d.text((74, 278), tagline, font=font(36, "DejaVuSans-Bold"), fill=AMBER)
    d.text((74, 328), tagline2, font=font(36, "DejaVuSans-Bold"), fill=AMBER)

    for i, line in enumerate([
        "3× hackathon wins incl. an NVIDIA GTC track",
        "arXiv co-author — automated usability evaluation",
        "30% Onflow beta conversion",
    ]):
        y = 418 + i * 40
        d.ellipse([74, y + 9, 82, y + 17], fill=AMBER)
        d.text((96, y), line, font=font(24, "DejaVuSansMono"), fill=MUTED)

    img.save(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
