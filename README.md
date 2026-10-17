# shashankdurgad.com

Personal site. Live at [shashankdurgad.com](https://www.shashankdurgad.com).
Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, fully static — every
byte here is prerendered; the server exists only on `next start` for CI.

```bash
npm install
npm run dev
```

## The rules (why the code looks like this)

**Server HTML is the finished, readable end state. JS only arms decoration.**
Every animation on the page follows the same choreography: the prerendered
document already shows the final frame; a client effect flips a `data-armed`
attribute after mount and the CSS transitions take it from there. No-JS,
hydration failure, and `prefers-reduced-motion` all degrade to the finished
page, never to blank boxes. This is the oldest rule in the repo and predates
v2 — keep honouring it.

**No `setState` in scroll or pointer paths.** Scroll work rides
`lib/motion/scrollDirector.ts`: one passive listener, rAF-batched, parks
70 ms after the last event, publishes positions as the registered `--p`
custom property. Components read it in CSS. If a new effect needs scroll
position, subscribe to the director; do not add a second listener.

**Canvas loops park.** The portrait and the cursor grid idle at zero CPU:
settled fields snap home and stop calling `requestAnimationFrame`, off-screen
or hidden-tab means parked. New canvas features inherit this contract.

**Tokens, not literals.** Theme colours are CSS custom properties in
`app/globals.css` (near-black ↔ off-white swap; one cold `--color-signal`
token for "live" state; amber `--color-accent` means *award* and nothing
else — the focus ring moved off it in v3 for exactly that reason). Type:
Inter for everything, Instrument Serif for the display scale
(`font-display` + `text-display`), JetBrains Mono for data (periods,
metrics, eyebrows — always `tabular-nums`).

## The portrait

The hero portrait is line art generated from a photograph, and the lines push
away from the cursor. Geometry is generated **offline** — never in the
browser — and shipped as data.

The shipped format (`app/_portrait/portrait-geom.json`, ~170 KB raw / ~23 KB
brotli, both themes in one file) encodes each y-delta as one printable
character (`value = charCode − 47`), because the scanline x-zigzag is
byte-identical across all 115 lines and every y-delta fits −12..+12. Both
themes must ship together (67% of the light values differ from dark; a
theme toggle has to be instant) but as strings, not array literals — the
whole file is a **lazy chunk** (`await import` inside the effect), off the
initial load and off the hydration path: parse+decode ≈ 0.4 ms vs the ~5 ms
the old inlined-JSON format cost. `node scripts/portrait/bench.mjs` re-runs
the round-trip proof (`python3 scripts/portrait/encode.py` refused to emit
anything not integer-exact) and the benchmark.

Regenerating the artwork itself needs `scripts/portrait/source.jpg`, which is
gitignored (it's a photo of a person):

```bash
python3 scripts/portrait/waves.py   # amplitude-modulated scanlines (active)
python3 scripts/portrait/trace.py   # flowline hatching (alternate style)
```

Those emit the legacy two-file format; `encode.py` (its one-time converter)
documents how to get back to v2. The renderer adapts to either style's
density: the repel displacement is scaled by the *measured* median line gap.

At small widths the physical line gap falls under the stroke width and 115
scanlines fuse into a solid mass, so the canvas picks a row stride from the
actual gap (`draw()` in `Portrait.tsx`) and the hero plate sizes itself to a
Nyquist-safe floor. Behaviour layers — assembly on load, idle breathing,
scroll dissolve, touch tap-ripple — all compose through the rest-anchored
spring (effects modify the spring's *target*, never the position) and none
run under reduced motion. Gaze needs eye coordinates from `source.jpg`
(port `find_eyes()` from `trace.py`) and is waiting on the owner.

## Content

Everything the page says lives in `content/*.ts` — typed, ordered
explicitly, no runtime sorting, one module per kind. Adding a section means
a new module plus one line in `app/page.tsx`; the header nav reads the same
`NAV` list. `public/resume.pdf` carries what the site deliberately omits
(phone, module grades) — by decision, not by omission.

## Privacy

Cookieless first-party analytics only (`@vercel/analytics` +
`@vercel/speed-insights`, ~1–3 KB, no stored identifiers, no consent banner
required under ICO guidance for this class of script). No ad pixels, no
LinkedIn insight tag, ever. Adding a third-party script is a deliberate act,
not a dependency bump.

## Budgets

Lighthouse (mobile, simulated) on `next start` at the v3 merge: performance
83 / accessibility 96 / best-practices 96 / SEO 100, CLS 0.00. The measured
goals that guide changes: LCP < 2.5 s under simulation (font-swap bound),
JS ≤ 240 KB gz initial, CSS ≤ 10 KB gz, total ≤ 420 KB gz. The portrait
payload is the one number that grew deliberately: it bought the artwork.

## CI

`.github/workflows/ci.yml` runs the local trio — `tsc --noEmit`, `eslint`,
`next build` — on every PR. The dev loop *is* the gate; the workflow exists
so a forgotten local run can't reach `main`.

## v1

`v1/` is the archived WebGL predecessor (a 3D "hall" with an animated
character). It is frozen: not linted, excluded from tsconfig, kept for
reference and its `CONTENT.md` archaeology. Nothing imports it.
