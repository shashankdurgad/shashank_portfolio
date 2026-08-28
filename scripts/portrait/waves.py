"""
Turn a portrait photograph into amplitude-modulated scanlines.

An alternative to trace.py, and a genuinely different technique rather than a
tuning of it:

    trace.py  — lines follow tone contours; tone is encoded as line *density*.
    waves.py  — lines are evenly spaced and horizontal; tone is encoded as the
                *amplitude* of a zigzag riding along each one.

Every line here spans the full canvas at fixed spacing. Dark regions make the
line oscillate hard into tight peaks; light regions flatten it toward straight.
The likeness emerges from where the waves are active, with no masking involved —
the silhouette is a by-product of the tone, not a cut-out.

Emits the same JSON format as trace.py, so the renderer is shared. One run
produces both theme variants — see VARIANTS.

Usage:
    python3 scripts/portrait/waves.py
    python3 scripts/portrait/waves.py --preview-only
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
SOURCE = HERE / "source.jpg"
OUT_DIR = HERE.parent.parent / "app" / "_portrait"

# One run emits both polarities — see INVERT. A single geometry cannot be right
# in both themes: strokes are the ink on a light page and the light on a dark
# one, so the tone mapping has to invert with the background or the portrait
# reads as a photographic negative in whichever theme it was not built for.
VARIANTS = {
    # Dark theme: light strokes on near-black. Strokes follow lightness.
    "dark": {
        "invert": True,
        "preview": HERE / "preview-waves-dark.png",
        "floor": 0.05,
    },
    # Light theme: dark strokes on off-white. Strokes follow darkness, the way
    # ink behaves on paper.
    #
    # Higher floor than dark, and the reason is contrast rather than geometry. A
    # nearly-straight dark line on white is fully visible, so a quiet region
    # reads as a hard flat band running through the face — around the eyes and
    # under the chin especially. The same line on a dark ground is dim and simply
    # recedes. Light mode therefore needs a larger guaranteed wobble to keep
    # quiet areas reading as texture rather than as ruled lines.
    # Swept against banding and face contrast:
    #
    #     floor    0.08   0.11   0.14   0.17   0.20
    #     chin     0.099  0.071  0.047  0.023  0.014   (fraction under 1.5px)
    #     contrast 1.58   1.52   1.47   1.42   1.37
    #
    # No knee, just a straight trade — the floor lifts quiet areas, which is the
    # point, but it also compresses the tonal range everything else sits in. 0.14
    # clears most of the banding while the face still reads against the panel.
    "light": {
        "invert": False,
        "preview": HERE / "preview-waves-light.png",
        "floor": 0.14,
    },
}

# --- tunables -----------------------------------------------------------------

# Working resolution for the tone field.
WORK = 900

# Crop of the source, as fractions (left, top, right, bottom).
#
# Wider than the trace.py crop. With a background panel the subject needs air
# around it — cropped tight to the head, the panel reads as a box jammed against
# the face rather than a field it sits in.
CROP = (0.0, 0.0, 1.0, 0.94)

# Vertical gap between scanlines, in working pixels. This is fixed for every
# line — it is the defining property of the technique, and varying it would turn
# this back into trace.py.
LINE_GAP = 7.0

# Horizontal sampling step along a line. Needs to be a good deal finer than the
# wavelength or the zigzag renders as noise instead of as a wave.
STEP = 1.15

# Wavelength of the oscillation, in pixels.
WAVELENGTH = 7.0

# Peak amplitude at full darkness, in pixels.
#
# Deliberately allowed to exceed LINE_GAP. Neighbouring lines interleaving in the
# darkest regions is what produces the dense woven mass in the reference; clamping
# amplitude below the gap keeps every line in its own lane and reads as corduroy.
AMPLITUDE = 5.2

# The amplitude floor — the minimum wobble every line keeps, so quiet areas read
# as texture rather than as ruled lines — is set per variant in VARIANTS, because
# the two themes need different amounts of it.

# Background panel.
#
# Rather than fading the scanlines out around the subject, they run edge to edge
# across a defined rectangle — the reference's full-bleed field, but bounded, so
# the portrait sits *in* something instead of floating in the page. The panel
# edge also gives the composition a hard edge to work against, which is most of
# what stops a light-on-dark portrait reading as a specimen scan.
#
# Amplitude in the background, as a fraction of AMPLITUDE. Low enough to stay a
# texture rather than competing with the face.
BG_AMPLITUDE = 0.055

# Inset of the panel from the canvas edge, as a fraction of width. Zero would run
# the lines to the very edge; a small inset reads as deliberate.
PANEL_INSET = 0.02

# Which end of the tone range gets the ink.
#
# This is the difference between a portrait and an X-ray, and it depends entirely
# on what the artwork is drawn *on*.
#
# On paper, ink goes where the photo is dark: hair and shadow fill in, lit skin is
# left as bare paper. Rendered light-on-dark that mapping inverts — the hair, now
# carrying the most strokes, becomes the brightest thing on the face while the lit
# forehead stays black. The result reads as an X-ray or a photographic negative,
# because it is one.
#
# INVERT flips the mapping so strokes follow *lightness* instead: dense where the
# face catches the light, sparse in the hair and shadows. That is how the face
# actually reads when the strokes themselves are the light.
#
# Passed per variant rather than fixed here — see VARIANTS. Both are generated
# every run and the renderer picks by theme.

# Tone response. Higher gamma holds more of the frame quiet and lets only the
# extreme end open up into full oscillation.
TONE_GAMMA = 1.15

# Tone window mapped across the full amplitude range, as (black point, white
# point). Everything at or below BLACK oscillates at full amplitude; everything
# at or above WHITE drops to the floor.
#
# Measured on this photo: the subject spans roughly 0.07 to 0.82, with hair at
# 0.17 and the lit forehead and cheek up at 0.71–0.78. Mapping the raw 0..1 range
# leaves that whole upper band at near-identical amplitude and the face renders as
# one flat mass. Stretching the window to the tone that is actually present is
# what recovers the modelling.
LEVELS = (0.30, 0.88)

# Local-contrast boost, same idea as trace.py's relief term: compare each pixel
# against its neighbourhood and lift amplitude where it is locally darker. This
# is what separates eyes, nostrils and the mouth line from surrounding skin that
# sits at a similar absolute tone.
CONTRAST_RADIUS = 12.0
CONTRAST_REF = 0.15
CONTRAST_WEIGHT = 0.55

# Tone at or above this is treated as pure background: floor amplitude only.
# The studio backdrop sits at a true 1.0, so this only needs to clear paper white.
BG_CUTOFF = 0.97

# Blur applied to the tone field before sampling. Smooths JPEG noise without
# softening the features that carry the likeness.
TONE_BLUR = 1.1

# Phase jitter per line, in radians. Without it, every line peaks on the same
# column and the image develops vertical banding that reads as a moiré artefact.
PHASE_JITTER = 1.0

# Coordinate grid for the emitted JSON — must match the renderer's expectation.
GRID = 2000
# ------------------------------------------------------------------------------


def gaussian_blur(a: np.ndarray, sigma: float) -> np.ndarray:
    """Separable Gaussian, same helper as trace.py."""
    if sigma <= 0:
        return a
    radius = max(1, int(math.ceil(sigma * 3)))
    x = np.arange(-radius, radius + 1, dtype=np.float32)
    k = np.exp(-(x**2) / (2 * sigma * sigma))
    k /= k.sum()
    padded = np.pad(a, ((0, 0), (radius, radius)), mode="edge")
    out = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 1, padded)
    padded = np.pad(out, ((radius, radius), (0, 0)), mode="edge")
    out = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 0, padded)
    return out.astype(np.float32)


def load_tone() -> np.ndarray:
    im = Image.open(SOURCE).convert("L")
    w, h = im.size
    box = (int(CROP[0] * w), int(CROP[1] * h), int(CROP[2] * w), int(CROP[3] * h))
    im = im.crop(box)
    ratio = im.size[1] / im.size[0]
    im = im.resize((WORK, int(WORK * ratio)), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255.0


def build_amplitude(tone: np.ndarray, invert: bool, floor: float) -> np.ndarray:
    """Map tone to oscillation amplitude, in pixels."""
    t = gaussian_blur(tone, TONE_BLUR)

    # Stretch the tone window that is actually present to the full range.
    lo, hi = LEVELS
    stretched = np.clip((t - lo) / max(hi - lo, 1e-6), 0.0, 1.0)

    # Local contrast, so features separate from skin at a similar absolute tone.
    # Signed, and taken against the same polarity as the main mapping — an
    # unsigned boost would brighten the eyes in inverted mode too, which is the
    # X-ray artefact in miniature.
    local_mean = gaussian_blur(t, CONTRAST_RADIUS)
    if invert:
        relief = np.clip((t - local_mean) / max(CONTRAST_REF, 1e-6), 0.0, 1.0)
        drive = np.clip(stretched, 0.0, 1.0) ** TONE_GAMMA
    else:
        relief = np.clip((local_mean - t) / max(CONTRAST_REF, 1e-6), 0.0, 1.0)
        drive = np.clip(1.0 - stretched, 0.0, 1.0) ** TONE_GAMMA

    drive = np.clip(drive + relief * CONTRAST_WEIGHT, 0.0, 1.0)

    amp = floor + (1.0 - floor) * drive
    # The backdrop is not part of the subject's tone range — it gets a flat,
    # quiet amplitude of its own so it reads as a field the portrait sits on.
    # Kept just under the variant's floor. It has to wobble — on a light ground a
    # ruler-straight background line is as visible as one across the face — but
    # staying below the floor keeps the panel quieter than the subject sitting on
    # it, which is what stops the background competing with the portrait.
    amp = np.where(t >= BG_CUTOFF, max(BG_AMPLITUDE, floor * 0.75), amp)

    return (amp * AMPLITUDE).astype(np.float32)


def sample(field: np.ndarray, x: float, y: float) -> float:
    h, w = field.shape
    if x < 0 or y < 0 or x > w - 2 or y > h - 2:
        return 0.0
    x0, y0 = int(x), int(y)
    fx, fy = x - x0, y - y0
    a = field[y0, x0] * (1 - fx) + field[y0, x0 + 1] * fx
    b = field[y0 + 1, x0] * (1 - fx) + field[y0 + 1, x0 + 1] * fx
    return float(a * (1 - fy) + b * fy)


def build_lines(amp: np.ndarray) -> list[list[tuple[float, float]]]:
    h, w = amp.shape
    rs = np.random.RandomState(11)
    lines: list[list[tuple[float, float]]] = []

    # Panel bounds. Lines run edge to edge inside this rectangle and stop at it.
    inset = PANEL_INSET * w
    x0, x1 = inset, w - 1 - inset
    y0, y1 = inset, h - 1 - inset

    y = y0 + LINE_GAP * 0.5
    while y <= y1:
        phase = float(rs.uniform(0, 2 * math.pi))
        pts: list[tuple[float, float]] = []
        x = x0
        while x <= x1:
            a = sample(amp, x, y)
            # Ride the wave about the line's own baseline. Sampling amplitude at
            # the baseline rather than at the displaced position keeps the wave
            # centred on the row it belongs to; sampling at the offset makes the
            # wave chase itself and drift off the feature it is describing.
            offset = math.sin(x / WAVELENGTH * 2 * math.pi + phase) * a
            # Clamp inside the panel so a tall wave near the top or bottom row
            # cannot spill past the edge it is meant to define.
            pts.append((x, min(max(y + offset, y0), y1)))
            x += STEP
        if len(pts) >= 2:
            lines.append(pts)
        y += LINE_GAP

    return lines


def write_preview(lines, size, path: Path, invert: bool) -> None:
    """Preview on the ground this variant is actually for."""
    from PIL import ImageDraw

    h, w = size
    scale = 2
    bg, fg = ((10, 10, 11), (244, 244, 242)) if invert else ((251, 251, 249), (22, 22, 26))
    img = Image.new("RGB", (w * scale, h * scale), bg)
    draw = ImageDraw.Draw(img)
    for line in lines:
        pts = [(x * scale, y * scale) for x, y in line]
        if len(pts) > 1:
            draw.line(pts, fill=fg, width=scale)
    img = img.resize((w, h), Image.LANCZOS)
    img.save(path)


def write_json(lines, size, path: Path) -> None:
    """Same encoding as trace.py — integer grid coords, delta-encoded."""
    h, w = size
    longest = max(w, h)
    payload = []
    for line in lines:
        flat: list[int] = []
        px = py = 0
        for i, (x, y) in enumerate(line):
            gx = int(round(x / longest * GRID))
            gy = int(round(y / longest * GRID))
            if i == 0:
                flat.extend((gx, gy))
            else:
                flat.extend((gx - px, gy - py))
            px, py = gx, gy
        payload.append(flat)

    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "grid": GRID,
        "width": round(w / longest * GRID),
        "height": round(h / longest * GRID),
        "lines": payload,
    }
    path.write_text(json.dumps(doc, separators=(",", ":")))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview-only", action="store_true")
    args = ap.parse_args()

    tone = load_tone()

    for name, cfg in VARIANTS.items():
        invert = bool(cfg["invert"])
        lines = build_lines(build_amplitude(tone, invert, float(cfg["floor"])))
        verts = sum(len(p) for p in lines)
        print(f"[{name}] lines: {len(lines)}  vertices: {verts}")

        write_preview(lines, tone.shape, cfg["preview"], invert)
        print(f"[{name}] preview: {cfg['preview']}")

        if not args.preview_only:
            out = OUT_DIR / f"portrait-{name}.json"
            write_json(lines, tone.shape, out)
            print(f"[{name}] json: {out} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
