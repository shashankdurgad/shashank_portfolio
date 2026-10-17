"use client";

import { useEffect, useRef } from "react";
import { observeReveal } from "@/lib/motion/reveal";

/**
 * Text that decodes once, when it first meaningfully enters view.
 *
 * The house contract, spelled out: the server renders the final string and it
 * is the *only* text screenreaders ever see — the glyph noise is an aria-hidden
 * sibling painted over the top. Nothing hides on load, nothing waits on JS;
 * the scramble is decoration armed after mount, and under reduced motion (or
 * no JS, or a hydration failure) it simply never starts and the heading reads.
 *
 * Zero layout shift is structural, not measured: the noise lives in the same
 * grid cell as the real text and is the same character count, so as long as
 * both are set in a monospace font — ScrambleText's own contract, callers pass
 * `font-mono` — the two spans share one advance width at every frame. There is
 * no min-width trick to get wrong.
 *
 * "Meaningfully in view" is delegated to lib/motion/reveal.ts: the element
 * carries `data-reveal` (the observer's selector — deliberately *without* the
 * `.reveal` class, so the shared fade CSS never touches it) and this component
 * watches the attribute that the shared observer writes. One source of truth
 * for "in view", however many consumers read it.
 */

/** The glyph pool, per the plan: line-art characters only, so the noise keeps
 *  the hairline texture of the site rather than alphabet soup. */
const POOL = "─/|+=><#*";

/**
 * One character per tick, ticks at 35ms.
 *
 * Slow enough that the eye separates the noise from the resolved text (~7
 * chars decode over ~250ms — a word at reading speed), fast enough that no
 * title is still scrambling by the time it finishes being read.
 */
const TICK_MS = 35;

export function ScrambleText({
  text,
  className,
}: {
  /** The real, final, server-rendered string. */
  text: string;
  /** Applied to the wrapper; must include `font-mono` for the width rule. */
  className?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const noiseRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const noise = noiseRef.current;
    if (!wrap || !noise) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The character array is resolved once; spaces stay spaces through the
    // whole decode so the word boundaries never migrate mid-scramble.
    const chars = [...text];
    let timer: ReturnType<typeof setInterval> | undefined;

    function finish() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      noise!.textContent = "";
      delete wrap!.dataset.scrambling;
    }

    function start() {
      const n = chars.length;
      // The first noisy frame is written synchronously: arming and painting
      // noise happen together, so the text never blinks empty between the
      // attribute flip and the first tick.
      let resolved = 0;
      function tickFrame() {
        resolved++;
        if (resolved >= n) {
          finish();
          return;
        }
        let out = "";
        for (let i = 0; i < n; i++) {
          out +=
            i < resolved
              ? chars[i]
              : chars[i] === " "
                ? " "
                : POOL[(Math.random() * POOL.length) | 0];
        }
        noise!.textContent = out;
      }
      wrap!.dataset.scrambling = "true";
      tickFrame();
      if (resolved < n) timer = setInterval(tickFrame, TICK_MS);
    }

    // In-view arrives as reveal.ts writing data-inview on this element; the
    // MutationObserver is how a consumer without a callback learns of it.
    const stopReveal = observeReveal(wrap);
    const mo = new MutationObserver(() => {
      if (wrap!.dataset.inview !== "true") return;
      mo.disconnect();
      start();
    });
    mo.observe(wrap, { attributes: true, attributeFilter: ["data-inview"] });

    return () => {
      if (timer !== undefined) clearInterval(timer);
      mo.disconnect();
      stopReveal();
    };
  }, [text]);

  return (
    <span
      ref={wrapRef}
      data-reveal
      className={["grid", className].filter(Boolean).join(" ")}
    >
      {/* The real text. Transparent only while scrambling is in flight — the
          attribute is set by this component's timer, so before arming, after
          finishing, and without JS it paints normally. */}
      <span
        className="col-start-1 row-start-1 in-data-[scrambling=true]:opacity-0"
      >
        {text}
      </span>
      {/* The noise: same cell, same count, aria-hidden, unselectable, and
          permanently empty in server HTML. */}
      <span
        ref={noiseRef}
        aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 select-none"
      />
    </span>
  );
}
