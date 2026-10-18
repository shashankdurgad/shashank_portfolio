"use client";

import { useEffect, useRef } from "react";

/**
 * The line-art portrait, with lines that push away from the cursor.
 *
 * Canvas rather than SVG: this is tens of thousands of vertices across ~115
 * polylines, an unremarkable amount of drawing but an impossible number of DOM
 * nodes.
 *
 * Geometry comes from scripts/portrait/waves.py as integer deltas on a fixed
 * grid — see write_json() there for the encoding. It is decoded once into flat
 * Float32Arrays and never re-allocated; the animation mutates `pos` in place.
 *
 * Two geometries ship, one per theme. Strokes are the ink on a light page and
 * the light on a dark one, so the tone mapping has to invert with the
 * background — a single geometry reads as a photographic negative in whichever
 * theme it was not built for.
 */

type PortraitDoc = {
  grid: number;
  width: number;
  height: number;
  lines: number[][];
};

/**
 * Canvas size, shared by both geometries — only vertex positions differ.
 *
 * Stated here rather than read from the JSON so the canvas can reserve its box
 * before the geometry arrives. The two files are ~750 KB between them and are
 * fetched after mount; importing them statically put all of that in the first
 * load for an image that sits beside the fold.
 */
const DOC = { width: 2000, height: 1878 } as const;

function loadDocs() {
  return Promise.all([
    import("@/app/_portrait/portrait-dark.json"),
    import("@/app/_portrait/portrait-light.json"),
  ]).then(([dark, light]) => ({
    dark: dark.default as PortraitDoc,
    light: light.default as PortraitDoc,
  }));
}

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

function decode(doc: PortraitDoc) {
  let total = 0;
  for (const line of doc.lines) total += line.length >> 1;

  const rest = new Float32Array(total * 2);
  // Where each polyline starts, in vertex indices, plus a terminator so the
  // draw loop can read starts[i + 1] without a bounds check.
  const starts = new Uint32Array(doc.lines.length + 1);

  let v = 0;
  for (let i = 0; i < doc.lines.length; i++) {
    const flat = doc.lines[i];
    starts[i] = v;
    let x = 0;
    let y = 0;
    for (let j = 0; j < flat.length; j += 2) {
      // First pair is absolute, the rest are deltas.
      if (j === 0) {
        x = flat[0];
        y = flat[1];
      } else {
        x += flat[j];
        y += flat[j + 1];
      }
      rest[v * 2] = x;
      rest[v * 2 + 1] = y;
      v++;
    }
  }
  starts[doc.lines.length] = v;

  return { rest, starts, count: total, spacing: medianSpacing(rest, starts) };
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

export function Portrait({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let teardown: (() => void) | undefined;

    loadDocs().then((DOCS) => {
      if (cancelled) return;

      // Both variants share line topology and vertex count — only the positions
      // differ — so `starts` and the buffers are decoded once and a theme change
      // just copies new rest positions in.
      const geometry = {
        dark: decode(DOCS.dark),
        light: decode(DOCS.light),
      };

      function activeTheme(): "dark" | "light" {
        const attr = document.documentElement.getAttribute("data-theme");
        if (attr === "light" || attr === "dark") return attr;
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }

      let theme = activeTheme();
      const { starts, count, spacing } = geometry[theme];
      const rest = new Float32Array(geometry[theme].rest);
      const pos = new Float32Array(rest);
      const vel = new Float32Array(count * 2);

      // Pointer in grid units. Null means "not over the portrait".
      let px: number | null = null;
      let py: number | null = null;

      let width = 0;
      let height = 0;
      let scale = 1;
      let raf = 0;
      let running = false;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
          for (let v = from + 1; v < to; v++) {
            ctx.lineTo(pos[v * 2] * scale, pos[v * 2 + 1] * scale);
          }
        }
        ctx.stroke();
      }

      function step() {
        const radius = REPEL_RADIUS * DOC.width;
        const strength = REPEL_STRENGTH * spacing;
        const r2 = radius * radius;

        let moving = false;

        for (let v = 0; v < count; v++) {
          const ix = v * 2;
          const iy = ix + 1;

          let ax = 0;
          let ay = 0;

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
              const amount = strength * falloff;
              // Target position, then spring toward *that* rather than applying a
              // raw force. Displacement is bounded by construction, so the bulge
              // can never open into a crater however long the cursor rests.
              const tx = rest[ix] + (dx / d) * amount;
              const ty = rest[iy] + (dy / d) * amount;
              ax += (tx - pos[ix]) * SPRING;
              ay += (ty - pos[iy]) * SPRING;
            } else {
              ax += (rest[ix] - pos[ix]) * SPRING;
              ay += (rest[iy] - pos[iy]) * SPRING;
            }
          } else {
            ax += (rest[ix] - pos[ix]) * SPRING;
            ay += (rest[iy] - pos[iy]) * SPRING;
          }

          vel[ix] = (vel[ix] + ax) * DAMPING;
          vel[iy] = (vel[iy] + ay) * DAMPING;
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

        // Park the loop once everything is home and the pointer has left. An idle
        // portrait should cost nothing.
        if (!moving && px === null) {
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
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        scale = rect.width / DOC.width;
        width = rect.width;
        height = DOC.height * scale;
        canvas!.width = Math.round(width * dpr);
        canvas!.height = Math.round(height * dpr);
        canvas!.style.height = `${height}px`;
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }

      function toGrid(e: PointerEvent) {
        const rect = canvas!.getBoundingClientRect();
        px = (e.clientX - rect.left) / scale;
        py = (e.clientY - rect.top) / scale;
      }

      function onMove(e: PointerEvent) {
        // Coarse pointers get the static portrait: a repel effect anchored to a
        // finger is hidden by the finger.
        if (e.pointerType === "touch") return;
        toGrid(e);
        kick();
      }

      function onLeave() {
        px = null;
        py = null;
        kick();
      }

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      window.addEventListener("pointermove", onMove, { passive: true });
      canvas.addEventListener("pointerleave", onLeave);
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

    canvas.dataset.ready = "true";

    teardown = () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      scheme.removeEventListener("change", onTheme);
    };
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // The box is reserved up front so the late geometry causes no shift, and
      // the lines fade in rather than pop once they arrive.
      style={{ aspectRatio: `${DOC.width} / ${DOC.height}` }}
      className={`opacity-0 transition-opacity duration-700 data-ready:opacity-100 ${className ?? ""}`}
      role="img"
      aria-label="Line-art portrait of Shashank Durgad"
    />
  );
}
