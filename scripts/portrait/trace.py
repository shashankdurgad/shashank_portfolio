"""
Turn a portrait photograph into flowline hatching.

Offline. Run by hand when the source or the tuning changes; the JSON it emits is
committed and the site loads that. Nothing here runs at build time.

The approach is the one plotter artists use for engraved-looking portraits: rather
than drawing edges, lay down long continuous curves that travel *along* lines of
constant tone, and vary how tightly they pack by how dark the region is. Hair ends
up dense and almost solid, cheeks get open spacing, the forehead nearly empties out.
Tone is carried by line density, which is what makes it read as a likeness instead
of as a contour map.

Dependencies are PIL and numpy only. The blur and the gradient are a few lines each
below, which is cheaper than taking on scipy for two functions.

Usage:
    python3 scripts/portrait/trace.py
    python3 scripts/portrait/trace.py --preview-only   # skip writing JSON
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
PREVIEW = HERE / "preview.png"
OUT_JSON = HERE.parent.parent / "app" / "_portrait" / "portrait.json"

# --- tunables -----------------------------------------------------------------
# The whole character of the output lives here. Expect to move these around a few
# times while looking at preview.png.

# Working resolution for the tone field. Higher picks up more detail but the trace
# gets slower and the line count climbs.
WORK = 1000

# Crop of the source, as fractions (left, top, right, bottom). The source has
# shoulders running off all three lower edges; this pulls in to a deliberate
# head-and-shoulders composition that ends on purpose rather than at the frame.
CROP = (0.06, 0.03, 0.94, 0.88)

# Background threshold. Above this luminance is "not the subject". The studio
# backdrop sits at a true 1.0 so there is a lot of daylight around this number.
BG_CUTOFF = 0.965

# Pull the mask in by this many pixels, so lines stop before the JPEG fringing
# at the subject's edge.
MASK_ERODE = 3

# Smoothing applied to the tone field before differentiating it. This is the main
# "squiggle scale" control: larger is calmer and more sweeping, smaller chases
# skin texture and starts to look noisy.
FLOW_BLUR = 7.0

# How much the contour direction is allowed to steer the line, 0..1.
#
# This is the single most important knob in the file, and it is what decides
# whether the portrait reads as drawn or as printed.
#
# At 1.0 lines follow tone contours exactly and wrap around the form — hair curls
# over the skull, lines bend across the cheekbones and jaw, and the lip edges get
# traced for free. Lower values blend toward BASE_ANGLE and give straighter,
# more mechanical hatching.
#
# An early version of this script sat at 1.0 and produced a topographic map, which
# is what motivated the blend. That turned out to be the wrong diagnosis: the real
# problems were the occupancy grid (see trace()) and the missing eye pass. With
# those fixed, full contour-following is the better-looking result, so it is the
# default again.
FLOW_BEND = 1.0

# The direction lines travel when tone is not bending them, in degrees. 0 is
# horizontal. At FLOW_BEND = 1.0 this only applies where the gradient vanishes
# entirely — flat regions, and the eye pass, which hatches along it. Lower
# FLOW_BEND to give it real influence over the whole portrait.
BASE_ANGLE = -8.0

# Blur used for the density decision. Kept separate from FLOW_BLUR so line
# *direction* and line *spacing* tune independently — direction wants smoothing
# to stay sweeping, density wants detail so eyes and mouth keep their edges.
TONE_BLUR = 1.2

# Spacing between neighbouring lines, in pixels, at the darkest and lightest tone
# that still gets drawn. Dark regions pack tight.
#
# The dark end must stay above the rendered line width or dark and mid tones both
# saturate to solid black and the features stop separating from the skin — the
# whole tonal range has to remain visible as *density*, not collapse into fill.
SPACING_DARK = 2.4
SPACING_LIGHT = 30.0

# Tone above this is left blank.
#
# Raised deliberately high. The site renders this light-on-dark, which inverts
# what empty space means: on white paper an untouched forehead reads as lit skin,
# but on black it is a hole with nothing describing the form. Measured on the
# earlier 0.78 setting, the forehead and cheek carried 2.6% ink — fine on paper,
# a void on screen.
#
# Letting the light areas take sparse hatching costs a little of the airiness and
# buys a face that holds together in both polarities.
TONE_CEILING = 0.93

# Gamma on the tone→spacing mapping. >1 pushes midtones lighter (more open),
# <1 fills them in.
TONE_GAMMA = 2.1

# Number of tone bands to seed in, darkest first. See the note in trace(): this
# is what stops the hair from starving the eyes of canvas space. More bands means
# finer features survive, at the cost of a slightly less even overall texture.
SEED_BANDS = 7

# Local-contrast density boost. See build_fields() — this is what makes eyes,
# nostrils and the mouth line read as features instead of dissolving into the
# surrounding tone.
#
# CONTRAST_RADIUS is the neighbourhood a pixel is compared against: roughly the
# size of the features to pull out. CONTRAST_REF is the contrast that counts as
# full strength. CONTRAST_WEIGHT is how far it may push spacing toward the dark
# end, 0..1.
# CONTRAST_RADIUS was swept against this photo: eye-vs-hair separation peaks
# around 11–16px and collapses above ~30, where the neighbourhood grows large
# enough that the hair mass reads as "locally dark" too and stops being
# distinguishable from a genuine feature.
CONTRAST_RADIUS = 13.0
CONTRAST_REF = 0.16

# Kept below 1 deliberately. Pushing this toward 1 also floods the hair — which
# carries real local contrast of its own — until it competes with the eyes for
# attention and the likeness gets worse, not better.
CONTRAST_WEIGHT = 0.72

# Local contrast this strong overrides TONE_CEILING, so a dark feature sitting in
# light skin still gets drawn. Without this the ceiling silently deletes exactly
# the details that carry the likeness.
CONTRAST_OVERRIDE = 0.28

# Gamma applied to the normalised relief. >1 keeps only the strongest local
# contrast — see the note in build_fields().
RELIEF_GAMMA = 1.8

# --- eyes ---------------------------------------------------------------------
# The eyes need their own pass, and it is worth being clear about why rather than
# treating it as a hack.
#
# Every other feature on a face is a *tonal region* — the hair, the jaw, the
# shadow beside the nose — and density hatching describes those well. An iris is
# not that. It is a ~45px disc of near-black inside a small pocket of white
# sclera, and the thing that makes it read as an eye is the hard boundary between
# the two. At the ~2px line spacing used everywhere else, that disc resolves to
# three or four squiggles and the eye reads as a vague hollow. Every global knob
# that darkens it enough to register also floods the hair and the brows, which
# makes the whole portrait worse — that was tried across several passes.
#
# So: find the eyes from the tone field, and hatch just those two discs at a
# finer spacing. The detection is geometric rather than hardcoded, so a different
# source photo still works.

# Vertical band to search, as fractions of height. Eyes sit below the brows.
EYE_BAND = (0.455, 0.52)

# Tone below this counts as eye-dark within that band.
EYE_DARK = 0.22

# A candidate blob must be at least this wide and no wider than this, as a
# fraction of image width — rejects both speckle and the hair at the temples.
EYE_WIDTH = (0.06, 0.14)

# Line spacing inside the iris. Tighter than SPACING_DARK — that is the point of
# the pass — but not so tight it fills solid. A solid iris reads as a dark disc
# on paper and, inverted, as the brightest object on the whole face, which is
# exactly wrong for the feature the eye is drawn to first.
EYE_SPACING = 2.6

# Radius of the hatched disc around each detected centre, as a fraction of the
# blob's own width. Generous, because the hatching is gated on tone within the
# disc — so this bounds where fine lines *may* go, and the photo decides where
# they actually land.
EYE_RADIUS = 0.52

# Tone ceiling inside the eye pass. Above this the sweep breaks, leaving the
# sclera open and the catchlight as a gap.
#
# Measured against this photo: inside the disc, tone p20 is 0.22 and p50 is 0.34,
# so a ceiling of 0.55 inks ~84% of the disc and produces a flat grey circle with
# a visible rim. Around 0.24 selects roughly the iris and lash line only, which is
# what should carry fine hatching.
EYE_CEILING = 0.24

# Fraction of the disc radius over which the fine hatching thins out to nothing.
# Without this the disc ends on a hard circular edge that reads as a pasted-on
# sticker; fading it lets the eye pass hand back to the general hatching.
EYE_FEATHER = 0.32

# Portion of the eye disc radius the general pass keeps off, as a fraction. Only
# the core is reserved — see the note in trace().
EYE_KEEPOUT = 0.62

# Integration step, in pixels. Smaller is smoother but multiplies vertex count.
STEP = 1.6

# Longest a single line may run, in steps. Caps runaway curves that would otherwise
# wander the whole face and spoil the hand-drawn feel.
MAX_STEPS = 260

# Stop a line if the flow direction swings harder than this per step (radians).
# With FLOW_BEND holding lines near the base direction this rarely fires; it is
# a backstop against degenerate gradients rather than a shaping control.
MAX_TURN = 0.5

# Lines shorter than this many points are dropped as specks.
MIN_POINTS = 8

# Radius, in pixels, of the disc stamped into the distance field per line vertex.
# Must comfortably exceed SPACING_LIGHT or the field saturates and open regions
# stop spacing correctly.
MARK_RADIUS = 30

# How close a line in progress may run to an existing one, as a fraction of the
# local spacing requirement. Below 1 so lines can converge slightly rather than
# terminating as soon as the tone tightens ahead of them.
TRACE_CLEARANCE = 0.72

# Vertical fade. Below FADE_START (fraction of height) the seeding thins out,
# reaching zero at FADE_END, so the shirt dissolves and the face carries the image.
FADE_START = 0.62
FADE_END = 1.0
FADE_FLOOR = 0.18  # density multiplier at FADE_END, not quite zero

# Coordinate grid for the emitted JSON. Vertices are integers on a GRID×GRID
# lattice over the longest edge, so 2000 is sub-pixel at any size the portrait is
# realistically displayed at.
GRID = 2000
# ------------------------------------------------------------------------------


def gaussian_blur(a: np.ndarray, sigma: float) -> np.ndarray:
    """Separable Gaussian. Two 1-D passes, which is all we need scipy for."""
    if sigma <= 0:
        return a
    radius = max(1, int(math.ceil(sigma * 3)))
    x = np.arange(-radius, radius + 1, dtype=np.float32)
    k = np.exp(-(x**2) / (2 * sigma * sigma))
    k /= k.sum()
    # Edge-replicate so the blur does not drag the frame's darkness inward.
    padded = np.pad(a, ((0, 0), (radius, radius)), mode="edge")
    out = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 1, padded)
    padded = np.pad(out, ((radius, radius), (0, 0)), mode="edge")
    out = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 0, padded)
    return out.astype(np.float32)


def erode(mask: np.ndarray, iterations: int) -> np.ndarray:
    """Binary erosion by repeated 4-neighbour minimum."""
    m = mask.copy()
    for _ in range(iterations):
        p = np.pad(m, 1, mode="constant", constant_values=False)
        m = m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    return m


def bilinear(field: np.ndarray, x: float, y: float) -> float:
    """Sample a scalar field at fractional coordinates."""
    h, w = field.shape
    if x < 0 or y < 0 or x > w - 2 or y > h - 2:
        return 0.0
    x0, y0 = int(x), int(y)
    fx, fy = x - x0, y - y0
    a = field[y0, x0] * (1 - fx) + field[y0, x0 + 1] * fx
    b = field[y0 + 1, x0] * (1 - fx) + field[y0 + 1, x0 + 1] * fx
    return float(a * (1 - fy) + b * fy)


def load_tone() -> tuple[np.ndarray, np.ndarray]:
    """Return (tone, mask) at working resolution. Tone is 0=black, 1=white."""
    im = Image.open(SOURCE).convert("L")
    w, h = im.size
    box = (int(CROP[0] * w), int(CROP[1] * h), int(CROP[2] * w), int(CROP[3] * h))
    im = im.crop(box)
    # Preserve aspect: WORK is the width, height follows.
    ratio = im.size[1] / im.size[0]
    im = im.resize((WORK, int(WORK * ratio)), Image.LANCZOS)
    tone = np.asarray(im, dtype=np.float32) / 255.0

    mask = erode(tone < BG_CUTOFF, MASK_ERODE)
    return tone, mask


def build_fields(tone: np.ndarray, mask: np.ndarray):
    """Flow direction to trace along, and the spacing each pixel wants."""
    # Fill background with white before blurring, so the subject's edge does not
    # get dragged toward whatever happens to be outside it.
    filled = np.where(mask, tone, 1.0)

    flow_src = gaussian_blur(filled, FLOW_BLUR)
    gy, gx = np.gradient(flow_src)
    # Perpendicular to the gradient == along the contour. This is the direction
    # that makes lines wrap around form rather than cut across it.
    cx, cy = -gy, gx
    mag = np.sqrt(cx * cx + cy * cy)

    base = math.radians(BASE_ANGLE)
    bx, by = math.cos(base), math.sin(base)

    # Resolve the contour direction's sign against the base direction before
    # blending. The contour field is unsigned — a line along it is equally valid
    # in either direction — so without this the two terms cancel wherever the
    # arbitrary sign happens to oppose the base.
    dot = cx * bx + cy * by
    sign = np.where(dot < 0, -1.0, 1.0)
    cx, cy = cx * sign, cy * sign

    # Weight the bend by gradient strength, normalised against a robust high
    # percentile rather than the max, so one specular highlight cannot flatten
    # the bend everywhere else.
    ref = np.percentile(mag[mask], 92) if mask.any() else 1.0
    strength = np.clip(mag / max(ref, 1e-6), 0.0, 1.0) * FLOW_BEND

    fx = bx * (1 - strength) + (cx / np.maximum(mag, 1e-6)) * strength
    fy = by * (1 - strength) + (cy / np.maximum(mag, 1e-6)) * strength
    n = np.sqrt(fx * fx + fy * fy)
    fx = np.where(n < 1e-6, bx, fx / np.maximum(n, 1e-6))
    fy = np.where(n < 1e-6, by, fy / np.maximum(n, 1e-6))

    tone_src = gaussian_blur(filled, TONE_BLUR)

    # Density is driven by two things, combined.
    #
    # Absolute tone alone does not work: measured on this photo it puts the eyes
    # and the hair at the same spacing (~9.4px vs ~10.0px), because both bottom
    # out dark and the gamma crushes everything below midtone together. The eyes
    # then vanish into the hair mass instead of reading as features.
    #
    # What actually distinguishes a feature is *local contrast* — an eye is dark
    # against light skin, while the middle of the hair is dark against dark. So
    # take the local mean, and boost density wherever a pixel is darker than its
    # own neighbourhood. That is unsharp masking, used to place ink rather than
    # to sharpen.
    local_mean = gaussian_blur(tone_src, CONTRAST_RADIUS)
    relief = np.clip(local_mean - tone_src, 0.0, 1.0)
    relief = np.clip(relief / max(CONTRAST_REF, 1e-6), 0.0, 1.0)
    # Gamma to separate strong contrast from weak. The hair carries a lot of mild
    # local contrast; the eyes carry a little very strong contrast. Raising the
    # power suppresses the former while leaving the latter nearly untouched, which
    # is what lets the features stay dominant.
    relief = relief**RELIEF_GAMMA

    t = np.clip(tone_src, 0.0, 1.0) ** TONE_GAMMA
    # Pull toward the dark end by whatever the local contrast asks for.
    t = np.clip(t * (1.0 - CONTRAST_WEIGHT * relief), 0.0, 1.0)
    spacing = SPACING_DARK + (SPACING_LIGHT - SPACING_DARK) * t

    return (
        fx.astype(np.float32),
        fy.astype(np.float32),
        tone_src,
        spacing.astype(np.float32),
        relief.astype(np.float32),
    )


def fade_at(y: float, h: int) -> float:
    """Vertical density multiplier — dissolves the shirt toward the bottom."""
    f = y / h
    if f <= FADE_START:
        return 1.0
    if f >= FADE_END:
        return FADE_FLOOR
    k = (f - FADE_START) / (FADE_END - FADE_START)
    return 1.0 + (FADE_FLOOR - 1.0) * k


def find_eyes(tone: np.ndarray) -> list[tuple[int, int, float]]:
    """Locate the irises as (cx, cy, radius). Geometric, not hardcoded.

    Looks for dark blobs in a horizontal band below the brows, keeps the ones
    whose width is plausible for an eye, and takes the two closest to the centre
    line — which rejects hair at the temples without needing to know where the
    hair is.
    """
    h, w = tone.shape
    y0, y1 = int(EYE_BAND[0] * h), int(EYE_BAND[1] * h)
    band = tone[y0:y1, :]
    dark = band < EYE_DARK
    if not dark.any():
        return []

    cols = np.nonzero(dark.any(axis=0))[0]
    groups: list[list[int]] = []
    cur = [int(cols[0])]
    for c in cols[1:]:
        if c - cur[-1] <= 6:
            cur.append(int(c))
        else:
            groups.append(cur)
            cur = [int(c)]
    groups.append(cur)

    lo, hi = EYE_WIDTH[0] * w, EYE_WIDTH[1] * w
    cands: list[tuple[int, int, float]] = []
    for g in groups:
        width = g[-1] - g[0]
        if not (lo <= width <= hi):
            continue
        sl = dark[:, g[0] : g[-1] + 1]
        rows = np.nonzero(sl.any(axis=1))[0]
        if not len(rows):
            continue
        cx = (g[0] + g[-1]) // 2
        cy = y0 + int(rows.mean())
        cands.append((cx, cy, width * EYE_RADIUS))

    # Two closest to the horizontal centre.
    cands.sort(key=lambda c: abs(c[0] - w / 2))
    return sorted(cands[:2], key=lambda c: c[0])


def hatch_eyes(tone: np.ndarray, mask: np.ndarray, eyes) -> list[list[tuple[float, float]]]:
    """Dense horizontal hatching over each iris disc."""
    lines: list[list[tuple[float, float]]] = []
    h, w = tone.shape
    base = math.radians(BASE_ANGLE)
    dx, dy = math.cos(base), math.sin(base)

    for cx, cy, r in eyes:
        n = max(2, int((2 * r) / EYE_SPACING))
        for i in range(n + 1):
            # Offset perpendicular to the line direction, across the disc.
            off = -r + (2 * r) * (i / n)
            half = math.sqrt(max(r * r - off * off, 0.0))
            if half < 1.0:
                continue
            px, py = cx - dy * off, cy + dx * off
            steps = max(2, int((2 * half) / STEP))

            # Break the sweep wherever the underlying pixel is too light to carry
            # ink. Filling the disc uniformly gives a solid black circle that
            # reads as a cartoon eye; gating on tone keeps the sclera open and
            # leaves the catchlight as a gap, which is what makes it read as wet.
            run: list[tuple[float, float]] = []
            for s in range(steps + 1):
                t = -half + (2 * half) * (s / steps)
                x, y = px + dx * t, py + dy * t
                ix, iy = int(x), int(y)
                inside = 0 <= ix < w and 0 <= iy < h and mask[iy, ix]
                if inside:
                    # Feather the ceiling toward the rim of the disc, so the fine
                    # hatching thins out instead of stopping on a hard circle.
                    d = math.hypot(x - cx, y - cy) / max(r, 1e-6)
                    k = min(1.0, max(0.0, (1.0 - d) / max(EYE_FEATHER, 1e-6)))
                    inside = tone[iy, ix] <= EYE_CEILING * k
                if inside:
                    run.append((x, y))
                else:
                    if len(run) >= 2:
                        lines.append(run)
                    run = []
            if len(run) >= 2:
                lines.append(run)
    return lines


def trace(fx, fy, tone, spacing, mask, relief, reserved=None):
    """Walk the flow field, laying lines down where there is room for them.

    `reserved` is a list of (cx, cy, r) discs already hatched by another pass;
    the general pass keeps clear of them.
    """
    h, w = tone.shape

    # Discs the eye pass already owns. The general pass must not hatch across
    # them, or its coarse lines cut through the fine ones and the iris turns to
    # mush — the exact failure the eye pass exists to avoid.
    blocked = np.zeros((h, w), dtype=bool)
    if reserved:
        yy, xx = np.ogrid[:h, :w]
        for cx, cy, r in reserved:
            # Only the core is reserved. The feathered outer ring is left open so
            # the general hatching runs into it and the two passes meet, rather
            # than leaving a white halo around each eye.
            pad = r * EYE_KEEPOUT
            blocked |= (xx - cx) ** 2 + (yy - cy) ** 2 <= pad * pad

    def drawable(ix: int, iy: int) -> bool:
        """Whether this pixel may carry ink at all."""
        if blocked[iy, ix]:
            return False
        return tone[iy, ix] <= TONE_CEILING or relief[iy, ix] >= CONTRAST_OVERRIDE

    # Distance to the nearest line already drawn, in pixels, saturating at DIST_MAX.
    #
    # Storing a distance rather than a boolean is what makes variable spacing work
    # at all. A boolean grid can only answer "is there ink anywhere near here", so
    # a pixel wanting tight 3px spacing gets rejected by a line sitting 8px away.
    # The pixels that want the tightest spacing are precisely the dark features
    # adjacent to other dark ink — so the eyes and nostrils were being considered
    # and then starved out, every time. With a distance field each pixel compares
    # against its own spacing requirement and dense areas can pack properly.
    DIST_MAX = 255
    dist = np.full((h, w), DIST_MAX, dtype=np.int16)

    # Disc offsets, built once per radius. This is the inner loop of the script.
    disc_cache: dict[int, tuple[np.ndarray, np.ndarray, np.ndarray]] = {}

    def disc(r: int):
        if r not in disc_cache:
            o = np.arange(-r, r + 1)
            dy, dx = np.meshgrid(o, o, indexing="ij")
            d = np.sqrt(dx * dx + dy * dy)
            keep = d <= r
            disc_cache[r] = (dy[keep], dx[keep], d[keep].astype(np.int16))
        return disc_cache[r]

    def room(x: float, y: float, spacing_here: float) -> bool:
        ix, iy = int(x), int(y)
        if not (0 <= ix < w and 0 <= iy < h):
            return False
        return dist[iy, ix] >= spacing_here

    def mark(x: float, y: float) -> None:
        """Stamp a line's passage into the distance field."""
        ix, iy = int(x), int(y)
        dy, dx, dd = disc(MARK_RADIUS)
        yy, xx = iy + dy, ix + dx
        ok = (yy >= 0) & (yy < h) & (xx >= 0) & (xx < w)
        np.minimum.at(dist, (yy[ok], xx[ok]), dd[ok])

    lines: list[list[tuple[float, float]]] = []

    # Seed in tone bands, darkest band first, shuffling within each band.
    #
    # A single global darkest-first sort does not work here: the hair bottoms out
    # around 0.04 and the eyes around 0.07, so hair claims the entire occupancy
    # grid before a single eye pixel is considered, and the features never get
    # drawn. Banding gives each tonal range its own pass at the canvas, so small
    # dark features survive next to large dark masses.
    #
    # Shuffling inside a band matters too — scan order lays lines down in a
    # top-left sweep, which produces visible directional banding.
    ys, xs = np.nonzero(mask)
    t = tone[ys, xs]
    rs = np.random.RandomState(7)

    # Band on effective darkness — tone lightened by however much local contrast
    # is present — so a high-contrast eye seeds in an early band alongside the
    # hair rather than in a late one after the space is gone.
    eff = t - relief[ys, xs] * CONTRAST_WEIGHT

    seeds: list[tuple[int, int]] = []
    edges = np.linspace(eff.min(), TONE_CEILING, SEED_BANDS + 1)
    for lo, hi in zip(edges[:-1], edges[1:]):
        sel = np.nonzero((eff >= lo) & (eff < hi))[0]
        rs.shuffle(sel)
        seeds.extend(zip(xs[sel].tolist(), ys[sel].tolist()))

    for sx, sy in seeds:
        if not drawable(sx, sy):
            continue
        sp = spacing[sy, sx] / max(fade_at(sy, h), 1e-3)
        if not room(sx, sy, sp):
            continue

        # Trace forward from the seed, then backward, and join — a seed in the
        # middle of a contour should produce one line through it, not two stubs.
        halves = []
        for direction in (1.0, -1.0):
            pts: list[tuple[float, float]] = []
            x, y = float(sx), float(sy)
            px, py = None, None
            for _ in range(MAX_STEPS):
                iy, ix = int(y), int(x)
                if not (0 <= ix < w and 0 <= iy < h) or not mask[iy, ix]:
                    break
                if not drawable(ix, iy):
                    break
                # Stop before merging into a neighbour. Checked against the local
                # requirement scaled by TRACE_CLEARANCE, which is below 1 so a line
                # may run a little closer than it could have started — otherwise
                # lines terminate the moment spacing tightens along their path.
                need = spacing[iy, ix] / max(fade_at(y, h), 1e-3)
                if len(pts) > 2 and not room(x, y, need * TRACE_CLEARANCE):
                    break
                dx = bilinear(fx, x, y) * direction
                dy = bilinear(fy, x, y) * direction
                n = math.hypot(dx, dy)
                if n < 1e-6:
                    break
                dx, dy = dx / n, dy / n
                if px is not None:
                    # Keep direction continuous: the contour field is unsigned, so
                    # the sampled vector can flip 180° between steps.
                    if dx * px + dy * py < 0:
                        dx, dy = -dx, -dy
                    turn = math.acos(max(-1.0, min(1.0, dx * px + dy * py)))
                    if turn > MAX_TURN:
                        break
                pts.append((x, y))
                px, py = dx, dy
                x += dx * STEP
                y += dy * STEP
            halves.append(pts)

        line = list(reversed(halves[1])) + halves[0]
        if len(line) < MIN_POINTS:
            continue

        # Only commit once the line is known to be long enough, otherwise rejected
        # stubs would still block the space they walked through.
        for x, y in line:
            mark(x, y)
        lines.append(line)

    return lines


def write_preview(lines, size) -> None:
    """Render the traced lines to a PNG so tuning does not need a browser."""
    h, w = size
    scale = 2  # supersample, then downscale — cheap antialiasing
    img = Image.new("L", (w * scale, h * scale), 255)
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    for line in lines:
        pts = [(x * scale, y * scale) for x, y in line]
        if len(pts) > 1:
            draw.line(pts, fill=0, width=scale)
    img = img.resize((w, h), Image.LANCZOS)
    img.save(PREVIEW)


def write_json(lines, size) -> None:
    """Integer grid coordinates, delta-encoded, as a flat array per line.

    Two things keep this small. Coordinates are integers on a GRID-unit scale
    rather than decimals in [0,1] — "0.123" costs five bytes to say what "123"
    says in three. And after the first vertex each line stores deltas, which are
    single digits for a curve sampled every ~1.6px. The renderer undoes both.
    """
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

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "grid": GRID,
        "width": round(w / longest * GRID),
        "height": round(h / longest * GRID),
        "lines": payload,
    }
    OUT_JSON.write_text(json.dumps(doc, separators=(",", ":")))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview-only", action="store_true")
    args = ap.parse_args()

    tone, mask = load_tone()
    fx, fy, tone_s, spacing, relief = build_fields(tone, mask)

    # Eyes first, so the general pass can be told to keep off them.
    eyes = find_eyes(tone_s)
    eye_lines = hatch_eyes(tone_s, mask, eyes)
    print(f"eyes: {[(x, y, round(r, 1)) for x, y, r in eyes]}")

    lines = trace(fx, fy, tone_s, spacing, mask, relief, reserved=eyes) + eye_lines

    verts = sum(len(p) for p in lines)
    print(f"lines: {len(lines)}  vertices: {verts}")

    write_preview(lines, tone.shape)
    print(f"preview: {PREVIEW}")

    if not args.preview_only:
        write_json(lines, tone.shape)
        kb = OUT_JSON.stat().st_size / 1024
        print(f"json: {OUT_JSON} ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
