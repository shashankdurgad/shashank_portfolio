"use client";

import { useEffect, useRef } from "react";

/**
 * The line-art portrait, with lines that push away from the cursor.
 *
 * Canvas rather than SVG: this is tens of thousands of vertices across ~115
 * polylines, an unremarkable amount of drawing but an impossible number of DOM
 * nodes.
 *
 * Geometry comes from scripts/portrait/waves.py, re-encoded by
 * scripts/portrait/encode.py into the v2 format: the horizontal zigzag is
 * shared by every line and theme, and each y delta is one printable ASCII
 * character (`charCode - 47`), so the whole artwork lands as two strings rather
 * than 460k JSON numbers — see the encode.py docstring for the codec and the
 * measured size win. It is decoded once into flat Float32Arrays and never
 * re-allocated; the animation mutates `pos` in place. The emitted grid is
 * uniform horizontal scanlines (115 rows × 751 columns), so the vertex at
 * (row r, col c) lives at index r*751+c — row addressing is O(1) and free.
 *
 * Two geometries ship, one per theme. Strokes are the ink on a light page and
 * the light on a dark one, so the tone mapping has to invert with the
 * background — a single geometry reads as a photographic negative in whichever
 * theme it was not built for.
 *
 * Behaviour layers, all armed post-mount so server HTML and no-JS see the
 * finished portrait, and all gated off under reduced motion:
 *
 *   assembly   rows start displaced by seeded noise and spring home, released
 *              top→bottom at 8 ms per row (~1.4 s, once);
 *   breathing  a slow row sine about rest once the portrait is in view and no
 *              input has arrived for a few seconds;
 *   dissolve   scrolling the portrait up toward the content flattens line
 *              displacement bottom-up, reversing on scroll-down;
 *   ripple     a touch tap fires one expanding ring — the coarse-pointer
 *              answer to the cursor repel, which a finger would hide.
 *
 * The layers ride the same spring loop as the repel: they modify the spring's
 * *target* (physics stays anchored to rest), share the single park path, and
 * cost nothing at rest.
 *
 * TODO(portrait-v2.1): the gaze layer needs the `eyes` field described in
 * scripts/portrait/encode.py — it stays absent until the owner's source photo
 * can feed trace.py's find_eyes().
 */

type ThemeName = "dark" | "light";

type PortraitGeom = {
  grid: number;
  width: number;
  height: number;
  /** Polyline count — the uniform row count. */
  lines: number;
  /** Vertices per polyline — the uniform column count. */
  verts: number;
  xStart: number;
  xDeltas: string;
  themes: Record<ThemeName, { yStarts: number[]; yDeltas: string }>;
  /** [[cx, cy], [cx, cy]] in grid units once the photo pipeline can supply
   *  it — see scripts/portrait/encode.py. Tolerated absent. */
  eyes?: [[number, number], [number, number]];
};

/**
 * Grid dimensions, declared here rather than read from the geometry because
 * the canvas must reserve its box on the very first render while the geometry
 * is still loading. These must match encode.py's output (grid 2000, the
 * rounded width/height) — it asserts nothing less.
 */
const GRID_W = 2000;
const GRID_H = 1878;

/** Codec base: a delta string decodes as `charCode - 47`. See encode.py. */
const CODEC_BASE = 47;

const TAU = Math.PI * 2;

/** Radius of the cursor's influence, as a fraction of the portrait's width. */
const REPEL_RADIUS = 0.19;

/**
 * Peak displacement, as a multiple of the median gap between neighbouring lines.
 *
 * Expressed relative to the artwork's own spacing rather than as a fraction of
 * the canvas, because the two line styles this renders have very different
 * densities. A fixed fraction of width that reads as a gentle bulge on loosely
 * spaced contour lines will shove uniform scanlines clean past four of their
 * neighbours and tear a hole in the field.
 *
 * Bounded by construction — see the note in step() — so this is a literal
 * maximum offset from rest, not a force that can accumulate.
 */
const REPEL_STRENGTH = 1.15;

/** Spring constant pulling a vertex back to where it belongs. */
const SPRING = 0.11;

/** Velocity retained per frame. Below 1, or it never settles. */
const DAMPING = 0.82;

/**
 * Squared displacement, in grid units, under which the whole field counts as
 * settled and the loop parks itself.
 *
 * Small enough that parking is invisible. At a looser threshold the loop stops
 * while vertices are still a fraction of a pixel from home, which leaves a faint
 * permanent smudge wherever the cursor last was.
 */
const REST_EPSILON = 0.0004;

// --- assembly (one-time intro) -------------------------------------------------

/** Stiffer, shorter intro spring — assembly is a arrival, not a wobble. */
const INTRO_SPRING = 0.14;
const INTRO_DAMPING = 0.78;

/** Delay added per row going top→bottom; 115 rows ≈ 0.9 s of release wave. */
const ASSEMBLE_STAGGER = 8;

/** Vertical noise amplitude, as a multiple of the median line spacing. */
const ASSEMBLE_NOISE = 6;

/** Fraction of the row bias that per-vertex jitter may add. */
const ASSEMBLE_JITTER = 0.08;

// --- idle breathing -------------------------------------------------------------

/** Row sine amplitude, as a multiple of the median line spacing. */
const BREATH_AMP = 0.18;

/** Breathing period, in milliseconds. */
const BREATH_PERIOD = 5500;

/** Phase offset per row, in radians — the wave crests travel down the face. */
const BREATH_PHASE = 0.12;

/** Fine-pointer silence required before the field starts breathing. */
const BREATH_IDLE_MS = 4000;

// --- scroll dissolve ------------------------------------------------------------

/** p starts when the canvas top reaches this fraction of viewport height. */
const DISSOLVE_TOP = 0.85;

/** p reaches 1 after the canvas has moved up this fraction of viewport height. */
const DISSOLVE_SPAN = 0.6;

/** Envelope floor: at p = 1 displacement is reduced to 1 − 0.65 = 0.35×. */
const DISSOLVE_DEPTH = 0.65;

/** How far down the row index the dissolve front starts, as a fraction of p.
 *  The bottom rows flatten first, the front travelling up. */
const DISSOLVE_BOTTOM_UP = 0.7;

// --- touch tap ripple ------------------------------------------------------------

/** Ripple amplitude, as a multiple of the median line spacing. */
const RIPPLE_AMP = 1.4;

/** Ripple wavelength, speed, oscillation period and band width — as fractions
 *  of the portrait width (speed per second) and seconds, per the plan. */
const RIPPLE_LAMBDA = 0.06;
const RIPPLE_SPEED = 0.28;
const RIPPLE_PERIOD = 0.9;
const RIPPLE_SIGMA = 0.05;

/** The ring dies at this age and the field springs home through the park path. */
const RIPPLE_LIFE = 1.1;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Deterministic 32-bit PRNG — the assembly must look the same on every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Decode one theme of the v2 document into the flat rest buffer.
 *
 * The layout is row-major and uniform — vertex v = row*verts + col — so
 * `starts` is just multiples of `verts` and row addressing in the animation is
 * O(1), which is what lets the intro stagger, the breathing wave and the
 * dissolve envelope address rows directly.
 */
function decodeTheme(doc: PortraitGeom, theme: ThemeName) {
  const { lines, verts } = doc;
  const count = lines * verts;
  const rest = new Float32Array(count * 2);
  const starts = new Uint32Array(lines + 1);

  // The shared x zigzag, decoded once and stamped into every row.
  const xs = new Float32Array(verts);
  xs[0] = doc.xStart;
  for (let c = 1; c < verts; c++) {
    xs[c] = xs[c - 1] + doc.xDeltas.charCodeAt(c - 1) - CODEC_BASE;
  }

  const t = doc.themes[theme];
  let v = 0;
  let di = 0;
  for (let r = 0; r < lines; r++) {
    starts[r] = r * verts;
    let y = t.yStarts[r];
    for (let c = 0; c < verts - 1; c++) {
      rest[v * 2] = xs[c];
      rest[v * 2 + 1] = y;
      v++;
      y += t.yDeltas.charCodeAt(di++) - CODEC_BASE;
    }
    rest[v * 2] = xs[verts - 1];
    rest[v * 2 + 1] = y;
    v++;
  }
  starts[lines] = count;

  return { rest, starts, count, spacing: medianSpacing(rest, starts) };
}

/**
 * Median vertical distance between neighbouring lines, in grid units.
 *
 * Derived from the geometry rather than hardcoded so the repel effect stays
 * proportionate across both line styles — the contour tracing and the uniform
 * scanlines differ in density by roughly a factor of four.
 *
 * Takes each line's midpoint y, sorts, and reads the median consecutive gap.
 * Robust enough for a scale factor, and it costs one pass at startup.
 */
function medianSpacing(rest: Float32Array, starts: Uint32Array): number {
  const mids: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const from = starts[i];
    const to = starts[i + 1];
    if (to - from < 2) continue;
    mids.push(rest[(((from + to) >> 1) << 1) + 1]);
  }
  if (mids.length < 2) return 16;
  mids.sort((a, b) => a - b);

  const gaps: number[] = [];
  for (let i = 1; i < mids.length; i++) {
    const g = mids[i] - mids[i - 1];
    if (g > 0.01) gaps.push(g);
  }
  if (!gaps.length) return 16;
  gaps.sort((a, b) => a - b);
  return gaps[gaps.length >> 1];
}

/**
 * Vertical noise offsets for the assembly: one seeded bias per row plus a
 * small per-vertex jitter on top. Row-coherent so whole lines arrive as lines —
 * pure per-vertex noise would read as confetti, not as a portrait assembling.
 */
function buildIntroNoise(doc: PortraitGeom, spacing: number): Float32Array {
  const rnd = mulberry32(1);
  const { lines, verts } = doc;
  const noise = new Float32Array(lines * verts);
  const amp = ASSEMBLE_NOISE * spacing;
  for (let r = 0; r < lines; r++) {
    const bias = rnd() * 2 - 1;
    for (let c = 0; c < verts; c++) {
      noise[r * verts + c] = amp * (bias + (rnd() * 2 - 1) * ASSEMBLE_JITTER);
    }
  }
  return noise;
}

export function Portrait({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    // The geometry is a dynamic import so it compiles to its own lazy chunk
    // fetched after hydration, instead of ~175 KB of JSON.parse string literal
    // sitting in the initial bundle on the hydration path. The canvas is below
    // the fold and the prerender needs none of it — the finished portrait is
    // drawn the moment the data lands. If the component unmounts while the
    // chunk is still in flight, the `cancelled` flag abandons the decode.
    void (async () => {
      const doc = ((await import("@/app/_portrait/portrait-geom.json")) as unknown as {
        default: PortraitGeom;
      }).default;
      if (cancelled) return;

      // Both variants share line topology and vertex count — only the positions
      // differ — so `starts` and the buffers are decoded once and a theme change
      // just copies new rest positions in.
      const geometry = {
        dark: decodeTheme(doc, "dark"),
        light: decodeTheme(doc, "light"),
      };

      function activeTheme(): ThemeName {
        const attr = document.documentElement.getAttribute("data-theme");
        if (attr === "light" || attr === "dark") return attr;
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }

      let theme = activeTheme();
      const { starts, count, spacing } = geometry[theme];
      const rest = new Float32Array(geometry[theme].rest);
      const pos = new Float32Array(rest);
      const vel = new Float32Array(count * 2);

      const LINES = doc.lines;
      const W = doc.width;

      // Pointer in grid units. Null means "not over the portrait".
      let px: number | null = null;
      let py: number | null = null;

      let width = 0;
      let height = 0;
      let scale = 1;
      let raf = 0;
      let running = false;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      /**
       * Low-power tier: halve the vertex load and the pixel density on
       * machines with few cores.
       *
       * Stride 2 skips every other column vertex, which is Nyquist-safe on the
       * 7 px wave: the oscillation period is ~15.6 grid units (waves.py
       * WAVELENGTH 7.0 in the 900 px working field) and lines sample every
       * ~2.56 units (STEP 1.15), so a line carries ~6.1 verts per period — the
       * stride leaves ~3, above the two-per-period floor, and what it drops is
       * sub-pixel interpolation at display scale, which the matching 1.5 DPR
       * cap cannot resolve anyway. Breathing is halved for the same reason:
       * at that tier, quarter-pixel tremor is spendable budget elsewhere.
       */
      const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
      const dprCap = lowPower ? 1.5 : 2;
      const stride = lowPower ? 2 : 1;
      const breathAmp = BREATH_AMP * (lowPower ? 0.5 : 1);

      // --- layer state -----------------------------------------------------------

      const introNoise = reduceMotion.matches ? null : buildIntroNoise(doc, spacing);
      let assemblyPending = introNoise !== null;
      let assembling = false;
      let assemblyT0 = 0;

      let inView = false;
      let breathing = false;
      let lastInput = performance.now();
      let idleTimer: ReturnType<typeof setTimeout> | undefined;

      let ripple: { x: number; y: number; t0: number } | null = null;

      // Per-row scroll-dissolve envelopes, recomputed once per frame from the
      // live rect while anything is displacing.
      const env = new Float32Array(LINES);

      // --- drawing ---------------------------------------------------------------

      function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        // currentColor, resolved at draw time — this is what makes the portrait
        // follow the theme without a second copy of the geometry.
        ctx.strokeStyle = getComputedStyle(canvas!).color;
        ctx.lineWidth = Math.max(0.7, scale * 1.15);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        for (let i = 0; i < starts.length - 1; i++) {
          const from = starts[i];
          const to = starts[i + 1];
          if (to - from < 2) continue;
          ctx.moveTo(pos[from * 2] * scale, pos[from * 2 + 1] * scale);
          for (let v = from + stride; v < to; v += stride) {
            ctx.lineTo(pos[v * 2] * scale, pos[v * 2 + 1] * scale);
          }
          // Always land on the line's true final vertex — the stride must never
          // move where a line ends.
          if ((to - 1 - from) % stride !== 0) {
            ctx.lineTo(pos[(to - 1) * 2] * scale, pos[(to - 1) * 2 + 1] * scale);
          }
        }
        ctx.stroke();
      }

      // --- layer bookkeeping -------------------------------------------------------

      function breathingWanted(now: number): boolean {
        return (
          inView &&
          !document.hidden &&
          !reduceMotion.matches &&
          !assembling &&
          ripple === null &&
          px === null &&
          now - lastInput >= BREATH_IDLE_MS
        );
      }

      function armIdleBreath() {
        clearTimeout(idleTimer);
        // The stopping of input is not an event — schedule the breath instead.
        idleTimer = setTimeout(() => {
          if (breathingWanted(performance.now())) kick();
        }, BREATH_IDLE_MS);
      }

      function markInput() {
        lastInput = performance.now();
        armIdleBreath();
      }

      function startAssembly(now: number) {
        if (!assemblyPending || reduceMotion.matches || !inView) return;
        assemblyPending = false;
        assembling = true;
        assemblyT0 = now;
        // Displace every vertex once; the existing spring animates the rest.
        for (let i = 0; i < count; i++) {
          pos[i * 2 + 1] = rest[i * 2 + 1] + introNoise![i];
        }
        vel.fill(0);
        kick();
      }

      function cancelAssembly() {
        // Any pointer or touch mid-assembly drops the intro instantly: the
        // displaced rows simply become an ordinary displacement the normal
        // spring pulls home.
        assembling = false;
        assemblyPending = false;
      }

      function hardPark() {
        // Snap-and-stop for moments where even an easing settle is motion no
        // one can watch: the canvas fully off-screen, or the tab hidden.
        cancelAnimationFrame(raf);
        cancelAssembly();
        breathing = false;
        ripple = null;
        px = null;
        py = null;
        pos.set(rest);
        vel.fill(0);
        draw();
        running = false;
      }

      // --- the loop ----------------------------------------------------------------

      function step(now: number) {
        const radius = REPEL_RADIUS * W;
        const strength = REPEL_STRENGTH * spacing;
        const r2 = radius * radius;

        // The intro runs on stiffer springs; once assembly is over (or has been
        // cancelled by input) the field reverts to the everyday constants.
        const k = assembling ? INTRO_SPRING : SPRING;
        const damp = assembling ? INTRO_DAMPING : DAMPING;
        const assemblyAllReleased =
          assembling && now >= assemblyT0 + (LINES - 1) * ASSEMBLE_STAGGER;

        // Breathing is a state of the loop, not a second loop: entering it only
        // forces the existing "still moving" condition true, and leaving it
        // lets the existing settle-and-park path do the rest.
        if (breathing !== breathingWanted(now)) breathing = breathingWanted(now);

        if (ripple) {
          const age = (now - ripple.t0) / 1000;
          if (age >= RIPPLE_LIFE) ripple = null;
        }

        // Scroll progress read from the live rect every frame — one
        // getBoundingClientRect, and it reverses on scroll-up for free.
        const rect = canvas!.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const p = clamp((DISSOLVE_TOP * vh - rect.top) / (DISSOLVE_SPAN * vh), 0, 1);
        // Only rows whose displacement can be seen need envelopes.
        if (breathing || px !== null) {
          for (let r = 0; r < LINES; r++) {
            const pr = clamp(p - ((LINES - 1 - r) / LINES) * DISSOLVE_BOTTOM_UP, 0, 1);
            env[r] = 1 - DISSOLVE_DEPTH * pr;
          }
        }

        const ripOn = ripple !== null;
        const ripT = ripOn ? (now - ripple!.t0) / 1000 : 0;
        const lam = RIPPLE_LAMBDA * W;
        const front = RIPPLE_SPEED * W * ripT;
        const sig2 = 2 * (RIPPLE_SIGMA * W) * (RIPPLE_SIGMA * W);

        let moving = false;

        for (let r = 0; r < LINES; r++) {
          const from = starts[r];
          const to = starts[r + 1];

          // Assembly gate: a row holds at its seeded offset until the release
          // wave reaches it. Frozen rows are far from rest, so they keep the
          // loop's "still moving" flag true without any extra bookkeeping.
          if (assembling && now < assemblyT0 + r * ASSEMBLE_STAGGER) continue;

          // One multiply per row per frame decides what this row's
          // displacement is allowed to look like.
          const erv = breathing || px !== null ? env[r] : 1;
          const bY = breathing
            ? breathAmp * spacing * erv * Math.sin((TAU * now) / BREATH_PERIOD + r * BREATH_PHASE)
            : 0;

          for (let v = from; v < to; v++) {
            const ix = v * 2;
            const iy = ix + 1;

            // Every layer modifies the spring's *target*; the vertex itself is
            // only ever sprung toward rest + effects, never shoved.
            let tx = rest[ix];
            let ty = rest[iy] + bY;

            if (px !== null && py !== null) {
              // Measured from the vertex's *rest* position, not its current one.
              //
              // Using the live position makes the force chase the vertex it is
              // pushing: the vertex leaves the radius, the force cuts out, the
              // spring drags it back in, and the zone pumps itself empty. Anchoring
              // to rest means each vertex has one fixed target offset for a given
              // cursor position, so the field deforms and holds.
              const dx = rest[ix] - px;
              const dy = rest[iy] - py;
              const d2 = dx * dx + dy * dy;
              if (d2 < r2 && d2 > 1e-6) {
                const d = Math.sqrt(d2);
                // Smooth shoulder: full push near the cursor, easing to nothing at
                // the rim so there is no visible circular edge.
                const t = 1 - d / radius;
                const falloff = t * t * (3 - 2 * t);
                // Target position, then spring toward *that* rather than applying a
                // raw force. Displacement is bounded by construction, so the bulge
                // can never open into a crater however long the cursor rests.
                const amount = strength * falloff * erv;
                tx += (dx / d) * amount;
                ty += (dy / d) * amount;
              }
            }

            if (ripOn) {
              const dx = rest[ix] - ripple!.x;
              const dy = rest[iy] - ripple!.y;
              const d2 = dx * dx + dy * dy;
              if (d2 > 1e-6) {
                const d = Math.sqrt(d2);
                // A travelling sine, gated by a Gaussian band around the
                // wavefront: a ring of oscillation crossing the field, not a
                // standing wobble. Cheap to kill — outside the band the whole
                // term rounds to nothing.
                const q = d - front;
                if (q * q < 9 * sig2) {
                  const g = Math.exp(-(q * q) / sig2);
                  const dr =
                    RIPPLE_AMP *
                    spacing *
                    Math.sin(TAU * (d / lam - ripT / RIPPLE_PERIOD)) *
                    g;
                  tx += (dx / d) * dr;
                  ty += (dy / d) * dr;
                }
              }
            }

            const ax = (tx - pos[ix]) * k;
            const ay = (ty - pos[iy]) * k;

            vel[ix] = (vel[ix] + ax) * damp;
            vel[iy] = (vel[iy] + ay) * damp;
            pos[ix] += vel[ix];
            pos[iy] += vel[iy];

            if (!moving) {
              const ox = pos[ix] - rest[ix];
              const oy = pos[iy] - rest[iy];
              if (ox * ox + oy * oy > REST_EPSILON || vel[ix] * vel[ix] + vel[iy] * vel[iy] > REST_EPSILON) {
                moving = true;
              }
            }
          }
        }

        // A breathing field never satisfies the settle test even when each row
        // passes through rest momentarily — the sine phases are spread across
        // more than 2π over 115 rows, and this makes it explicit so parking
        // stays one code path.
        if (!moving && breathing) moving = true;

        // Assembly ends quietly: every row released and the field home means
        // the intro is over, so from here the everyday constants apply — the
        // park snap below draws the identical final frame. The idle-breath
        // timer may have expired while the intro held the field shut, so arm
        // it once more from the moment the portrait actually became still.
        if (assembling && assemblyAllReleased && !moving) {
          assembling = false;
          armIdleBreath();
        }

        // Park the loop once everything is home and the pointer has left. An idle
        // portrait should cost nothing.
        if (!moving && px === null && !assembling && ripple === null) {
          // Snap to exact rest before the final draw. Parking leaves whatever
          // sub-threshold offsets remain frozen in place, and across repeated
          // hovers those accumulate into a visible smudge.
          pos.set(rest);
          vel.fill(0);
          draw();
          running = false;
          return;
        }

        draw();
        raf = requestAnimationFrame(step);
      }

      function kick() {
        if (running || reduceMotion.matches) return;
        running = true;
        raf = requestAnimationFrame(step);
      }

      function onTheme() {
        const next = activeTheme();
        if (next !== theme) {
          theme = next;
          // Swap the rest positions in place. Velocity and current positions are
          // left alone, so a theme change mid-hover eases into the new geometry
          // through the spring rather than snapping.
          rest.set(geometry[theme].rest);
          kick();
        }
        draw();
      }

      function resize() {
        const rect = canvas!.getBoundingClientRect();
        if (!rect.width) return;
        const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
        scale = rect.width / doc.width;
        width = rect.width;
        height = rect.height || doc.height * scale;
        canvas!.width = Math.round(width * dpr);
        canvas!.height = Math.round(height * dpr);
        // The CSS box belongs to the canvas element's own aspect-ratio style
        // (set inline, from the first render) — writing style.height here is
        // what used to fight it and re-introduce layout shift.
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }

      function toGrid(e: PointerEvent) {
        const rect = canvas!.getBoundingClientRect();
        const gx = (e.clientX - rect.left) / scale;
        const gy = (e.clientY - rect.top) / scale;
        // A pointer outside the canvas is no input at all: null it. A stale
        // off-canvas coordinate reads as "input present" to the park path, and
        // one mousemove anywhere on the page would keep the loop alive forever.
        if (gx < 0 || gy < 0 || gx > doc.width || gy > doc.height) {
          px = null;
          py = null;
        } else {
          px = gx;
          py = gy;
        }
      }

      function onMove(e: PointerEvent) {
        // Coarse pointers get the static portrait: a repel effect anchored to a
        // finger is hidden by the finger. The tap ripple below is touch's
        // answer — it starts from the point the finger left, not the finger.
        if (e.pointerType === "touch") return;
        cancelAssembly();
        markInput();
        toGrid(e);
        kick();
      }

      function onLeave() {
        px = null;
        py = null;
        markInput();
        kick();
      }

      function onDown(e: PointerEvent) {
        // Any touch cancels the intro like any pointer move. The ripple itself
        // is one-shot and reduced-motion-gated; re-tapping replaces the ring.
        cancelAssembly();
        markInput();
        if (reduceMotion.matches || e.pointerType !== "touch") return;
        const rect = canvas!.getBoundingClientRect();
        ripple = {
          x: (e.clientX - rect.left) / scale,
          y: (e.clientY - rect.top) / scale,
          t0: performance.now(),
        };
        kick();
      }

      // The portrait carries its own scroll read — one passive listener whose
      // only job is to wake the loop; the envelope itself is recomputed from
      // the live rect in step(), so scroll-up reverses it for free. If nothing
      // can be displaced there is nothing to update, so a parked portrait
      // ignores scrolling entirely.
      function onScroll() {
        if (running) return;
        if (breathing || ripple !== null || breathingWanted(performance.now())) kick();
      }

      function onVisibility() {
        if (document.hidden) hardPark();
        else if (breathingWanted(performance.now())) kick();
      }

      // --- wiring ----------------------------------------------------------------

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);

      // The only architectural addition to the original: whether the canvas is
      // on screen at all. Off-screen, hardPark stops the loop (the effects it
      // gates — breathing, assembly — are meaningless unseen); back on screen,
      // whatever is eligible restarts through the normal kick path.
      const view = new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        if (inView) {
          const now = performance.now();
          startAssembly(now);
          if (breathingWanted(now)) kick();
        } else {
          hardPark();
        }
      });
      view.observe(canvas);

      resize();

      window.addEventListener("pointermove", onMove, { passive: true });
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      // Swap geometry and re-ink on theme change. The stroke colour is read at
      // draw time, so a parked loop would otherwise keep both the old colour and
      // the old polarity until something moved.
      const themeObserver = new MutationObserver(onTheme);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      const scheme = window.matchMedia("(prefers-color-scheme: light)");
      scheme.addEventListener("change", onTheme);

      // Arm the idle timer from mount: with no input at all, breathing starts
      // on its own once the portrait has been seen long enough.
      markInput();

      cleanup = () => {
        cancelAnimationFrame(raf);
        clearTimeout(idleTimer);
        observer.disconnect();
        view.disconnect();
        themeObserver.disconnect();
        window.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        scheme.removeEventListener("change", onTheme);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label="Line-art portrait of Shashank Durgad"
      // CLS fix: the exact box, reserved from the committed grid dimensions on
      // the very first render — server-rendered, so there is no moment in
      // which the layout below this could shift when the async geometry (or
      // the first draw) arrives. GRID_W/GRID_H must match encode.py's output.
      style={{ aspectRatio: `${GRID_W} / ${GRID_H}` }}
    />
  );
}
