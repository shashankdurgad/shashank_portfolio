"use client";

import { TIMELINE } from "@/lib/timelineData";

/**
 * Detail card for the hovered timeline node.
 *
 * A fixed overlay rather than drei's <Html> anchored in the scene. Anchoring
 * it in 3D looked right on paper and failed twice: with a distanceFactor the
 * card shrank with depth until it was illegible, and without one it lost its
 * transform entirely and rendered thousands of pixels off-screen. The card is
 * a reading surface, not an object in the world — pinning it to the viewport
 * is both simpler and what it wanted to be.
 *
 * Rendered outside the Canvas so it is ordinary DOM: real typography, real
 * text selection, and legible to assistive tech.
 */
export function TimelineCard({ id }: { id: string | null }) {
  const entry = TIMELINE.find((e) => e.id === id);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-10 left-1/2 z-30 w-[min(30rem,calc(100vw-3rem))] -translate-x-1/2 border border-line/80 bg-void/95 p-4 transition-opacity duration-200 ${
        entry ? "opacity-100" : "opacity-0"
      }`}
    >
      {/*
        The entry is kept mounted through the fade-out, so the card does not
        blank a frame before it has finished disappearing.
      */}
      {entry && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-arc">
            {entry.period} · {entry.location}
          </p>
          <p className="mt-1.5 text-base font-medium text-ink">{entry.org}</p>
          <p className="text-xs text-ink-dim">{entry.role}</p>
          <ul className="mt-3 space-y-1.5">
            {entry.detail.map((d) => (
              <li key={d} className="text-xs leading-relaxed text-ink/85">
                {d}
              </li>
            ))}
          </ul>
          {entry.stack && (
            <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-cyan/80">
              {entry.stack.join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
