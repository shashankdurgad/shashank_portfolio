"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/motion/scrollDirector";

/**
 * Back-to-top pill.
 *
 * Stays parked until the visitor is past ~1.5 viewports, then rides in on a
 * plain opacity/visibility transition — visibility also pulls it out of the
 * tab order while parked, so a keyboard never stops on an invisible button.
 *
 * It is utility, not theatre, so it survives reduced motion — the *appearance*
 * is CSS (which the global RM block flattens) and the scroll picks its
 * behaviour from the same preference.
 */

/** Scroll depth, in viewport heights, at which the pill appears. */
const SHOW_AFTER_VH = 1.5;

export function BackToTop() {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = ref.current;
    if (!btn) return;

    let shown = false;
    const unsubscribe = subscribe((info) => {
      const wants = info.lastY > window.innerHeight * SHOW_AFTER_VH;
      if (wants !== shown) {
        shown = wants;
        // Attribute write, no setState — this is a scroll-path callback.
        btn.dataset.visible = wants ? "true" : "false";
      }
    });
    return unsubscribe;
  }, []);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 grid size-11 place-items-center rounded-full border border-line bg-overlay text-muted opacity-0 shadow-e3 backdrop-blur-xl transition-[opacity,visibility,color,border-color] duration-200 invisible hover:border-line-strong hover:text-fg data-[visible=true]:visible data-[visible=true]:opacity-100 [&_svg]:size-4"
    >
      {/* A caret-in-a-pipe arrow: the "up" idea without a filled triangle. */}
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5v-9M4.5 7L8 3.5 11.5 7" />
      </svg>
    </button>
  );
}
