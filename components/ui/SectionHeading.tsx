"use client";

import { useEffect, useRef } from "react";

/**
 * Section eyebrow + title, the two lines every section opens with.
 *
 * The eyebrow is set in mono at 11px with wide tracking — the data-type
 * language from plan §1, kept static so it never reflows.
 *
 * The title carries a clip-rise: it starts parked 12px low inside an
 * overflow-hidden mask and rises into place once, after mount. Same house
 * contract as everything else — the server paints the *final* position; the
 * below-edge state exists only inside a `data-armed` element, so JS-off,
 * reduced motion, and pre-hydration all simply read the heading.
 *
 * Client rather than server because arming needs an effect; it re-renders
 * exactly never afterwards.
 */
export function SectionHeading({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  const innerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Two states, one tick apart: `armed` puts the title at the hidden edge
    // (the transition is armed-only, so the move down is instant), a forced
    // style flush lets that frame take effect, and `risen` releases it upward.
    // Without the flush the browser batches both writes and sees one no-op.
    el.dataset.armed = "true";
    void el.offsetWidth;
    el.dataset.risen = "true";

    return () => {
      delete el.dataset.armed;
      delete el.dataset.risen;
    };
  }, []);

  return (
    <div className="mb-10">
      <p className="font-mono text-[11px] tracking-[0.18em] text-faint uppercase">
        {label}
      </p>
      {/* The mask clips the rise; the inner span's pb keeps descenders from
          meeting the same edge (leading alone is too tight at this size). */}
      <h2 className="mt-2 overflow-hidden text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
        <span
          ref={innerRef}
          className="block pb-1 transition-none data-[armed=true]:translate-y-3 data-[armed=true]:transition-transform data-[armed=true]:duration-[550ms] data-[armed=true]:ease-out data-[risen=true]:translate-y-0"
        >
          {title}
        </span>
      </h2>
    </div>
  );
}
