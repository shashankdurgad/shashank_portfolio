# shashank_portfolio

## v3 (active)

Next.js 16, React 19, Tailwind 4. One page: hero → work → projects → about → contact.

```bash
npm install
npm run dev
```

**Content lives in `content/`** — profile, timeline, projects, skills. Every
section reads from there, as do the OG card and JSON-LD, so editing a fact means
editing one file. Copy is held to a budget: one line per item, at most two
points when expanded.

- **Work** is a commit graph (`components/work/`): each role is a branch that
  forks off its lane and merges back when it ends; ongoing ones stay open at
  `HEAD`. Overlaps are computed from the `start`/`end` months.
- **Projects** has four featured cards with a headline metric and a generative
  emblem each, then an index of the rest.
- Amber is reserved for awards. Mono is the metadata voice; prose stays sans.
- `app/opengraph-image.tsx` and `app/icon.tsx` are generated at build time.

CI (`.github/workflows/ci.yml`) runs typegen, tsc, lint and build.

## v2 notes (still relevant)

### The portrait

The hero portrait is line art generated from a photograph, and the lines push
away from the cursor.

Geometry is generated **offline** — it is not computed in the browser. There are
two styles, and they are genuinely different techniques rather than presets:

```bash
# amplitude-modulated scanlines — evenly spaced horizontal lines whose zigzag
# amplitude carries the tone. Currently active.
python3 scripts/portrait/waves.py

# flowline hatching — lines follow tone contours, tone carried by line density.
python3 scripts/portrait/trace.py

# either script, preview only:
python3 scripts/portrait/waves.py --preview-only
```

Both write to `app/_portrait/portrait.json` (committed), so **whichever ran last
is what the site shows**. Both read `scripts/portrait/source.jpg` and emit the
same format, and the renderer adapts to either — it measures the line spacing of
whatever it loads and scales the repel displacement to match, because the two
styles differ in density by roughly a factor of four.

Previews (`preview.png`, `preview-waves.png`) are gitignored; they exist for
tuning by eye.

Needs only PIL and numpy. Every tunable sits at the top of its script with a note
on what it trades off — several carry measurements taken against this specific
photo, so read the comment before changing one.
[Portrait.tsx](components/portrait/Portrait.tsx) renders the result to a canvas
and runs the repel physics.

**Two geometries ship, one per theme.** Line art drawn for paper puts ink where
the photo is *dark*. Rendered light-on-dark that mapping inverts — the hair
becomes the brightest thing on the face and the portrait reads as an X-ray. So
strokes have to follow lightness on a dark ground and darkness on a light one,
and no single geometry is right in both.

`waves.py` emits `portrait-dark.json` and `portrait-light.json` in one run (see
`VARIANTS`), and [Portrait.tsx](components/portrait/Portrait.tsx) swaps between
them on theme change. Both share line topology and vertex count, so the swap
copies new rest positions into the existing buffers and the spring eases into
them — nothing re-allocates and a mid-hover toggle stays smooth. Costs ~74KB
gzipped for the pair rather than ~36KB for one.

**Known limitation**: `waves.py` leaves a visible edge down the side of each ear,
where the flat lines of the hair meet the tall waves of the lit ear. It is
inherent to straight horizontal scanlines crossing a near-vertical tonal
boundary, not a bug in the tone field. The header comment in that file records
the five fixes that were measured and why each was rejected — read it before
attempting a sixth. `trace.py` does not have the problem at all, because its
lines follow the form and wrap around the ear rather than crossing it.

### The hero grid

[CursorGrid.tsx](components/CursorGrid.tsx) draws a grid behind the hero that is
invisible at rest. Lines appear only within a radius of the pointer, and that
radius tracks pointer *speed* — a fast sweep opens a wide pool, a slow drift
barely disturbs it. Stop moving and it closes completely.

Canvas rather than a CSS mask over a background image: the radius changes every
frame, and animating that through style recalcs would thrash layout. It strokes
in `currentColor`, so one implementation covers both themes, and it parks its
rAF loop once the pool has closed. Disabled entirely under
`prefers-reduced-motion`, and ignored for touch pointers, which have no hover to
reveal it with.

Note the canvas sits at `z-0`, not a negative index: the page background lives on
`<html>`, and a negative index puts the canvas behind that and paints it out.

## v1 (archived)

The previous site — a scroll-driven three.js/R3F experience — is frozen in [v1/](v1/)
for reference. It is excluded from the root TypeScript project and ESLint config, and
its dependencies are not installed at the root.

To run it, install and build inside that folder:

```bash
cd v1 && npm install && npm run dev
```

Its own notes are in [v1/README.md](v1/README.md), [v1/CONTENT.md](v1/CONTENT.md),
and [v1/CONTRIBUTING-AGENTS.md](v1/CONTRIBUTING-AGENTS.md).
