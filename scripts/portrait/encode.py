"""
Re-encode the committed portrait JSONs into the compact v2 format.

The v2 format (app/_portrait/portrait-geom.json) replaces the two per-theme
files with one file whose bulk is one-printable-char-per-delta strings:

    grid/width/height  unchanged
    lines / verts      vertex topology, now declared (115 x 751)
    xStart + xDeltas   the horizontal zigzag, shared by every line and theme
    themes[t].yStarts  first y of each line, absolute integers
    themes[t].yDeltas  the remaining y deltas, one char each, lines concatenated

Why this is possible (verified, not assumed — see verify() below): the output
of waves.py is uniform horizontal scanlines, so the x delta sequence is
byte-identical across all 115 lines and both themes, and the y deltas live in
[-12, +12]. Two facts, two savings: the x zigzag is stored once instead of 230
times, and a y delta costs one byte instead of a JSON number.

CHAR CODEC
    value = charCode - 47, i.e. delta d (in -12..12) is stored as chr(d + 47).
    The alphabet is '#' (0x23, delta -12) through ';' (0x3B, delta +12) — 25
    printable ASCII bytes, none of which JSON needs to escape. (The obvious
    chr(33 + d) base '!' would hit '"' at delta -11, and every quote inside a
    JSON string costs an extra byte to escape; base 47 dodges '"' and '\\'
    entirely at the cost of shifting the range by two.) Decoding in JS is one
    subtract: `s.charCodeAt(i) - 47`. The same codec encodes xDeltas.

PROVENANCE
    This script reads the two COMMITTED JSONs (portrait-dark.json,
    portrait-light.json) — not source.jpg, which is owner-only and gitignored.
    Regenerating geometry from the photo stays in waves.py / trace.py; when a
    future waves.py v2 emits this format directly, it replaces this re-encode
    step and this script retires. (The old JSONs are kept until the branches
    merge, which is also what makes the round-trip check here possible.)

EYES
    The emitted document reserves an optional `eyes` field:  [[cx, cy], [cx, cy]]
    in grid units, ported from trace.py's find_eyes() once source.jpg is
    available to the pipeline. It is deliberately NOT fabricated here — there
    is no photo to measure — and the renderer tolerates its absence.

Usage:
    python3 scripts/portrait/encode.py
"""

from __future__ import annotations

import gzip
import json
from pathlib import Path

HERE = Path(__file__).parent
IN_DIR = HERE.parent.parent / "app" / "_portrait"
DARK_IN = IN_DIR / "portrait-dark.json"
LIGHT_IN = IN_DIR / "portrait-light.json"
OUT = IN_DIR / "portrait-geom.json"

LINES_EXPECT = 115
VERTS_EXPECT = 751
DELTA_MIN, DELTA_MAX = -12, 12

# value = charCode - DELTA_BASE; see module docstring for why 47.
DELTA_BASE = 47


def decode_lines(doc: dict) -> list[list[tuple[int, int]]]:
    """Reference decoder: first pair absolute, the rest deltas."""
    out = []
    for flat in doc["lines"]:
        pts = []
        x = y = 0
        for j in range(0, len(flat), 2):
            if j == 0:
                x, y = flat[0], flat[1]
            else:
                x += flat[j]
                y += flat[j + 1]
            pts.append((x, y))
        out.append(pts)
    return out


def encode_delta(d: int) -> str:
    assert DELTA_MIN <= d <= DELTA_MAX, f"delta {d} outside codec range"
    return chr(d + DELTA_BASE)


def verify(dark: dict, light: dict) -> tuple[list[int], str]:
    """Assert every structural invariant the v2 format depends on.

    Returns the shared xStart and xDeltas string. Any failure raises — the
    encoder must not emit a file over geometry it cannot describe losslessly.
    """
    x_start = None
    x_deltas = None

    for theme, doc in (("dark", dark), ("light", light)):
        for key in ("grid", "width", "height"):
            assert dark[key] == light[key], f"{key} differs between themes"

        lines = doc["lines"]
        assert len(lines) == LINES_EXPECT, (
            f"{theme}: {len(lines)} lines, expected {LINES_EXPECT}")

        for i, flat in enumerate(lines):
            assert len(flat) == VERTS_EXPECT * 2, (
                f"{theme} line {i}: {len(flat) // 2} verts, expected {VERTS_EXPECT}")

            xs = flat[2::2]   # x deltas of every pair after the first
            ys_d = flat[3::2]  # y deltas of every pair after the first (flat[1] is absolute)
            assert all(DELTA_MIN <= d <= DELTA_MAX for d in ys_d), (
                f"{theme} line {i}: y delta outside [{DELTA_MIN},{DELTA_MAX}]"
                " — widen the codec before emitting")

            if x_start is None:
                x_start = flat[0]
                x_deltas = "".join(encode_delta(d) for d in xs)
            else:
                assert flat[0] == x_start, (
                    f"{theme} line {i}: x start {flat[0]} != {x_start} — the "
                    "shared-x assumption is broken, v2 cannot encode this")
                assert "".join(encode_delta(d) for d in xs) == x_deltas, (
                    f"{theme} line {i}: x delta sequence differs from the "
                    "shared one — the uniform-scanline assumption is broken")

        starts = [flat[1] for flat in lines]
        assert all(b > a for a, b in zip(starts, starts[1:])), (
            f"{theme}: line y starts are not strictly increasing")

    assert x_start is not None and x_deltas is not None
    return x_start, x_deltas


def encode_theme(doc: dict) -> dict:
    y_starts = [flat[1] for flat in doc["lines"]]
    # One string per theme, lines concatenated in order — line r's slice is
    # simply [r*verts, (r+1)*verts) chars into it.
    y_deltas = "".join(
        encode_delta(d) for flat in doc["lines"] for d in flat[3::2]
    )
    return {"yStarts": y_starts, "yDeltas": y_deltas}


def decode_v2_theme(doc: dict, theme: str) -> list[list[tuple[int, int]]]:
    """Reference decoder for one theme of the v2 format — the JS side mirrors
    this exactly."""
    xs = [doc["xStart"]]
    for ch in doc["xDeltas"]:
        xs.append(xs[-1] + ord(ch) - DELTA_BASE)

    t = doc["themes"][theme]
    verts = doc["verts"]
    lines = []
    di = 0
    for y0 in t["yStarts"]:
        pts = []
        y = y0
        for c in range(verts):
            pts.append((xs[c], y))
            if c < verts - 1:
                y += ord(t["yDeltas"][di]) - DELTA_BASE
                di += 1
        lines.append(pts)
    # The per-line slices must tile the concatenated string exactly.
    assert di == len(t["yStarts"]) * (verts - 1), (
        f"{theme}: yDeltas consumed {di}, expected {len(t['yStarts']) * (verts - 1)}")
    return lines


def round_trip(originals: dict) -> None:
    """Assert every vertex of the emitted file equals the original decode."""
    with open(OUT) as f:
        emitted = json.load(f)

    for theme, flat_doc in originals.items():
        want = decode_lines(flat_doc)
        got = decode_v2_theme(emitted, theme)
        assert len(got) == len(want), f"{theme}: line count changed"
        for i, (w, g) in enumerate(zip(want, got)):
            assert w == g, (
                f"{theme} line {i}: round-trip mismatch, first differing "
                f"vertex at {next(k for k, (a, b) in enumerate(zip(w, g)) if a != b)}")


def main() -> None:
    dark = json.loads(DARK_IN.read_text())
    light = json.loads(LIGHT_IN.read_text())

    x_start, x_deltas = verify(dark, light)
    print(
        f"verified: {LINES_EXPECT} lines x {VERTS_EXPECT} verts, x-deltas "
        f"shared across all lines and both themes, y-deltas in "
        f"[{DELTA_MIN},{DELTA_MAX}]"
    )

    doc = {
        "grid": dark["grid"],
        "width": dark["width"],
        "height": dark["height"],
        "lines": LINES_EXPECT,
        "verts": VERTS_EXPECT,
        "xStart": x_start,
        "xDeltas": x_deltas,
        "themes": {
            "dark": encode_theme(dark),
            "light": encode_theme(light),
        },
        # "eyes": [[cx, cy], [cx, cy]] in grid units — omitted until the photo
        # pipeline (find_eyes) can supply it. See module docstring.
    }
    OUT.write_text(json.dumps(doc, separators=(",", ":")))

    round_trip({"dark": dark, "light": light})
    print("round-trip exact")

    old = DARK_IN.stat().st_size + LIGHT_IN.stat().st_size
    new = OUT.stat().st_size
    old_gz = len(gzip.compress(DARK_IN.read_bytes(), 9)) + len(gzip.compress(LIGHT_IN.read_bytes(), 9))
    new_gz = len(gzip.compress(OUT.read_bytes(), 9))
    print(f"old:  {old / 1024:7.1f} KB raw / {old_gz / 1024:6.1f} KB gzip  (two JSONs)")
    print(f"new:  {new / 1024:7.1f} KB raw / {new_gz / 1024:6.1f} KB gzip  (one file)")
    print(f"saved: {(1 - new / old) * 100:.1f}% raw / {(1 - new_gz / old_gz) * 100:.1f}% gzip")


if __name__ == "__main__":
    main()
