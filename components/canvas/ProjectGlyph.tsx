"use client";

import { useEffect, useRef } from "react";

/**
 * A 96px emblem per selected project — the portrait's wave engine at card scale.
 *
 * Same DNA: n horizontal scanlines whose per-vertex vertical zigzag amplitude
 * carries a shape. Here the shape is a lens — `sin(πu)` across the line index,
 * so amplitude opens at the centre line and closes to nothing top and bottom.
 * Two-dimensional because the scanlines are two-dimensional; amplitude is the
 * only thing doing work, exactly as it is in the portrait.
 *
 * Nothing about the drawing is invented at runtime: the seed is a hash of the
 * project id, and the three parameters come off the project's own data (line
 * count off the stack, amplitude off the headline metric's digits, phase off
 * the period's digits). The same project therefore draws the same emblem on
 * every load and on every machine, which is what earns it a spot next to the
 * name — a per-render dice-roll emblem is decoration, an invariant one is an
 * identifier. No image assets anywhere.
 *
 * The canvas is empty in server HTML (nothing can draw server-side) and is
 * painted once at rest from the effect. It is `aria-hidden` for the same
 * reason: it stands for nothing that a name and summary do not already say.
 *
 * The only motion is a single amplification pulse on hover — fine pointers
 * only, one spring back to rest, then the loop parks. Off-screen it does not
 * draw at all, and a resize repaints without a loop because the rest frame is
 * still the correct end state.
 */

/** Square plate side in CSS pixels. Fixed, so the box is reserved from the
 *  first render and cannot shift what follows it. */
const SIZE = 96;

/** Clear margin per edge, in CSS pixels. */
const PAD = 8;

/** Column vertex count. 25 vertices over 80px gives the zigzag ~3.3px — wide
 *  enough to read as line modulation at 96px rather than as fuzz. */
const COLS = 25;

/** Rows are centred in the field, so a line count of 1 still lands centred. */
const SPAN = SIZE - 2 * PAD;

/** Spring constants for the hover pulse. Under-damped enough to overshoot
 *  once — the overshoot is what makes it read as a pulse rather than a fade. */
const PULSE_K = 0.18;
const PULSE_DAMP = 0.72;

/** Peak extra amplitude at the pulse apex (the impulse/spring ratio puts it
 *  at about ×1.4 total). Deliberately modest: an emblem that throbs competes
 *  with the copy. */
const PULSE_AMP = 0.45;

/** Amplitude as a fraction of the gap between neighbouring lines. The
 *  precomputed offsets run to about ±1.17, so at rest two neighbours' crests
 *  stay short of each other (~0.53 gap each); at the pulse apex they can graze
 *  and cross locally, which is the surge — the portrait's own repel displaces
 *  lines by 1.15× spacing, so this is the same language, just smaller. */
const AMP_OVER_GAP = 0.45;

/** Stroke width, in CSS pixels. The portrait's stroke floor generalises: at
 *  96px there is no scaling headroom to protect, so it is a fixed hairline. */
const STROKE = 1;

const TAU = Math.PI * 2;

/** Deterministic 32-bit PRNG — the same generator the portrait's assembly
 *  uses, so "seeded" means one thing across the site. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. Chosen over the repo's PRNG because a hash needs to be stable for
 *  an arbitrary string, and FNV is the shortest one that is. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/** Sum of every digit in a string, ignoring separators. "Oct 2025 – Jul 2026"
 *  reads as a duration rather than a number, so the digits are summed. */
function digitSum(text: string): number {
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    const d = text.charCodeAt(i) - 48;
    if (d >= 0 && d <= 9) sum += d;
  }
  return sum;
}

/**
 * The three shape parameters, read off the project's own data.
 *
 * Kept pure so the derivation stays in one place and the effect body stays
 * about drawing.
 */
function derive(p: {
  /** The project id — the seed. */
  id: string;
  /** Project stack, for the line count. */
  stack: string[];
  /** Project period, for the phase. */
  period: string;
  /** Project metrics, for the amplitude (the headline number's digits). */
  metrics?: { value: string; label: string }[];
}) {
  const seed = hash(p.id);
  const rnd = mulberry32(seed);

  // 6–13 lines: a small stack is a sparse emblem, a large one is dense, and
  // the modulo keeps the densest from turning the plate into a barcode.
  const lines = (p.stack.length % 8) + 6;

  // Amplitude off the headline metric — the digits the project is measured by
  // decide how far its lines swing. Two digits of it are used so "289" and
  // "30%" differ without one digit's luck dominating. A project with no
  // metric falls back to the seed, which is just as stable.
  const digits = p.metrics?.[0]?.value ? digitSum(p.metrics[0].value) : seed % 97;
  const amp = 0.3 + (digits % 12) * 0.03;

  // Phase off the period: where along the travelling wave the line set sits.
  // Summing the year digits puts projects a year apart roughly a full turn
  // apart, which is a nicer spread than hashing the string again.
  const phase = ((digitSum(p.period) % 12) / 12) * TAU;

  // One jitter sample per vertex, fixed for the life of the component.
  const jitter = new Float32Array(lines * COLS);
  for (let i = 0; i < jitter.length; i++) jitter[i] = rnd();

  return { seed, lines, amp: Math.min(amp, 0.6), phase, jitter };
}

export function ProjectGlyph({
  id,
  stack,
  period,
  metrics,
  className,
}: {
  id: string;
  stack: string[];
  period: string;
  metrics?: { value: string; label: string }[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { lines, amp, phase, jitter } = derive({
      id,
      stack,
      period,
      metrics,
    });
    const gap = SPAN / Math.max(lines - 1, 1);
    const ampPx = gap * AMP_OVER_GAP * (amp / 0.6);
    const cols = COLS;
    const dx = SPAN / (cols - 1);

    // Precomputed rest geometry: one Float32Array of y offsets, then the y of
    // row r at column c is (r + amp·offset)·gap + PAD.
    const offset = new Float32Array(lines * cols);
    for (let r = 0; r < lines; r++) {
      const u = lines > 1 ? r / (lines - 1) : 0.5;
      const envelope = Math.sin(Math.PI * u);
      for (let c = 0; c < cols; c++) {
        const v = r * cols + c;
        // Triangle core, alternated by row so adjacent lines' peaks interlock
        // rather than stack into bands.
        const tri = Math.abs(((c + r) % 8) / 4 - 1);
        const wave = Math.sin((c / cols) * TAU * 1.5 + phase + (r / lines) * TAU);
        // The offset is the shape's voice: the triangle is the zigzag core
        // carrying the lens, the travelling sine adds the phase-derived tilt,
        // and the seeded jitter (±0.17) keeps it hand-drawn rather than machined.
        offset[v] = envelope * (tri * 0.72 + wave * 0.28 + (jitter[v] - 0.5) * 0.34);
      }
    }

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;
    let inView = false;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // The pulse is one scalar, not a second field: it scales the amplitude of
    // a fixed rest geometry. Cheaper than the portrait's per-vertex spring,
    // and at this size the difference would be invisible.
    let pulse = 0;
    let pulseVel = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      // currentColor resolved at draw time, so the emblem follows the theme
      // the same way the portrait does.
      ctx.strokeStyle = getComputedStyle(canvas!).color;
      ctx.lineWidth = STROKE;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const a = ampPx * (1 + pulse);
      ctx.beginPath();
      for (let r = 0; r < lines; r++) {
        const baseY = PAD + r * gap;
        for (let c = 0; c < cols; c++) {
          const y = baseY + a * offset[r * cols + c];
          const x = PAD + c * dx;
          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    function step() {
      // Damped spring toward zero. Bounded by construction: the apex is set by
      // the impulse below and the spring only ever removes energy.
      pulseVel += -pulse * PULSE_K;
      pulseVel *= PULSE_DAMP;
      pulse += pulseVel;

      draw();

      if (Math.abs(pulse) < 0.002 && Math.abs(pulseVel) < 0.002) {
        pulse = 0;
        pulseVel = 0;
        draw();
        running = false;
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function kick() {
      if (running || reduceMotion.matches || !inView) return;
      running = true;
      raf = requestAnimationFrame(step);
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
      // Repaint at rest: a rest frame is the correct end state, and after a
      // resize the old bitmap is gone whatever the loop was doing.
      draw();
    }

    function onEnter(e: PointerEvent) {
      // A hover-only effect, so a finger does not get it — the same rule the
      // portrait's repel follows, and for the same reason: the finger hides
      // what it triggers.
      if (e.pointerType === "touch" || reduceMotion.matches || !inView) return;
      // One impulse per arrival. Re-firing while hovering only adds energy if
      // the previous pulse is still airborne, so cap the total swing — the
      // pulse is bounded by construction, however impatient the pointer.
      pulseVel = Math.min(pulseVel + PULSE_AMP * 0.4, PULSE_AMP * 0.5);
      kick();
    }

    function onVisibility() {
      if (document.hidden) hardPark();
    }

    function hardPark() {
      cancelAnimationFrame(raf);
      running = false;
      pulse = 0;
      pulseVel = 0;
      draw();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Off-screen, nothing about this canvas can be seen: the loop stops and
    // no repaint is scheduled until it is on screen again.
    const view = new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      if (inView) resize();
      else hardPark();
    });
    view.observe(canvas);

    // Re-ink on theme change: the stroke is read from currentColor at draw
    // time, and a parked emblem would otherwise keep the old colour.
    function onTheme() {
      draw();
    }
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: light)");
    scheme.addEventListener("change", onTheme);

    canvas.addEventListener("pointerenter", onEnter);
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    // Rest frame, immediately — including under reduced motion, which is the
    // point: the emblem is content, only its pulse is decoration.
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      view.disconnect();
      themeObserver.disconnect();
      scheme.removeEventListener("change", onTheme);
      canvas.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id, stack, period, metrics]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ width: SIZE, height: SIZE }}
    />
  );
}
