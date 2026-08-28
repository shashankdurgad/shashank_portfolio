"use client";

/**
 * Scroll region for the morph sequence.
 *
 * Deliberately tall and mostly empty: the visual is the 3D field behind it,
 * and this element exists to give that field scroll distance to play out.
 * The captions are real text so the sequence is not invisible to screen
 * readers or search engines.
 */
export function MorphStage() {
  return (
    <section
      id="morph"
      aria-label="Interactive sequence"
      className="relative"
      style={{ height: "320vh" }}
    >
      {/* Stage captions, pinned as the sequence advances behind them. */}
      <div className="pointer-events-none sticky top-0 flex h-screen items-end justify-center pb-16">
        <p className="max-w-md text-center text-[11px] uppercase tracking-[0.22em] text-ink-dim/70">
          <span className="sr-only">
            An animated sequence: a pair of eyes rendered as particles closes and
            bursts apart, then the fragments settle around a pair of doors. The
            left door leads to experience and education, the right to projects.
          </span>
        </p>
      </div>
    </section>
  );
}
