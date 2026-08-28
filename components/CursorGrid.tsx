"use client";

import { useEffect, useRef } from "react";

/**
 * A grid that is invisible until the cursor moves over it.
 *
 * Lines are drawn only within a radius of the pointer, brightest at the centre
 * and falling to nothing at the rim. The radius tracks pointer *speed*, so a
 * quick sweep opens a wide pool of grid and a slow drift barely disturbs it.
 * Stop moving and it closes completely — at rest the section is plain
 * background, which is the whole idea.
 *
 * Canvas rather than a CSS mask over a background-image: the radius changes
 * every frame, and animating that through style recalcs would thrash layout.
 */

/** Grid pitch in CSS pixels. */
const CELL = 44;

/** Radius when the pointer is barely moving, in pixels. */
const RADIUS_MIN = 90;

/** Radius at or above SPEED_MAX. */
const RADIUS_MAX = 260;

/** Pointer speed, in px/frame, that maps to RADIUS_MAX. */
const SPEED_MAX = 34;

/**
 * Per-frame smoothing for the radius, 0..1 — higher is snappier.
 *
 * Speed is noisy frame to frame; using it raw makes the pool jitter. Easing it
 * lets the grid bloom as a gesture rather than flicker.
 */
const RADIUS_EASE = 0.12;

/** How fast the whole effect fades once the pointer stops or leaves. */
const FADE_EASE = 0.07;

/** Peak line alpha at the centre of the pool. */
const ALPHA = 0.5;

/** Below this the effect counts as invisible and the loop parks. */
const ALPHA_EPSILON = 0.004;

export function CursorGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    let width = 0;
    let height = 0;

    // Pointer position in canvas space, and the previous sample for speed.
    let px = 0;
    let py = 0;
    let lastX = 0;
    let lastY = 0;
    let inside = false;

    let radius = RADIUS_MIN;
    // Overall strength, 0..1. Drives the fade in and out.
    let strength = 0;
    let targetStrength = 0;

    let raf = 0;
    let running = false;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (strength < ALPHA_EPSILON) return;

      // Only the cells within the pool are visited — at RADIUS_MAX that is a
      // handful of lines, not the whole viewport.
      const x0 = Math.floor((px - radius) / CELL) * CELL;
      const x1 = Math.ceil((px + radius) / CELL) * CELL;
      const y0 = Math.floor((py - radius) / CELL) * CELL;
      const y1 = Math.ceil((py + radius) / CELL) * CELL;

      const colour = getComputedStyle(canvas!).color;
      ctx.lineWidth = 1;

      // A radial gradient does the falloff, so a line crossing the pool fades at
      // both ends without being split into segments.
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      const peak = ALPHA * strength;
      grad.addColorStop(0, withAlpha(colour, peak));
      grad.addColorStop(0.55, withAlpha(colour, peak * 0.42));
      grad.addColorStop(1, withAlpha(colour, 0));
      ctx.strokeStyle = grad;

      ctx.beginPath();
      for (let x = x0; x <= x1; x += CELL) {
        // Half-pixel offset keeps a 1px line on the pixel grid rather than
        // straddling two rows and rendering as a 2px blur.
        const gx = Math.round(x) + 0.5;
        ctx.moveTo(gx, y0);
        ctx.lineTo(gx, y1);
      }
      for (let y = y0; y <= y1; y += CELL) {
        const gy = Math.round(y) + 0.5;
        ctx.moveTo(x0, gy);
        ctx.lineTo(x1, gy);
      }
      ctx.stroke();
    }

    function step() {
      strength += (targetStrength - strength) * FADE_EASE;

      draw();

      // Park once the pool has closed and nothing is asking it to reopen.
      if (targetStrength === 0 && strength < ALPHA_EPSILON) {
        strength = 0;
        running = false;
        if (ctx) ctx.clearRect(0, 0, width, height);
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function kick() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(step);
    }

    // The pointer stopping is not an event, so it is inferred: every move
    // schedules this, and if no further move arrives the pool closes.
    let idle: ReturnType<typeof setTimeout> | undefined;

    function onMove(e: PointerEvent) {
      // Coarse pointers have no hover, so there is nothing to reveal.
      if (e.pointerType === "touch") return;

      const rect = canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (!inside) {
        targetStrength = 0;
        kick();
        return;
      }

      const speed = Math.hypot(x - lastX, y - lastY);
      lastX = x;
      lastY = y;
      px = x;
      py = y;

      const t = Math.min(speed / SPEED_MAX, 1);
      const want = RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * t;
      radius += (want - radius) * RADIUS_EASE;

      targetStrength = 1;
      kick();

      clearTimeout(idle);
      idle = setTimeout(() => {
        targetStrength = 0;
        kick();
      }, 90);
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
    />
  );
}

/**
 * Re-express a computed colour at a given alpha.
 *
 * `getComputedStyle().color` always resolves to `rgb(...)` or `rgba(...)`, so
 * pulling the three channels out is enough — this never sees a hex or a named
 * colour.
 */
function withAlpha(colour: string, alpha: number): string {
  const m = colour.match(/-?\d+\.?\d*/g);
  if (!m || m.length < 3) return `rgba(128,128,128,${alpha})`;
  return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`;
}
