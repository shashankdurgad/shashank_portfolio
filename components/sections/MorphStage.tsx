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
      style={{ height: "400vh" }}
    >
      {/* Stage captions, pinned as the sequence advances behind them. */}
      <div className="pointer-events-none sticky top-0 flex h-screen items-end justify-center pb-16">
        <p className="max-w-md text-center text-[11px] uppercase tracking-[0.22em] text-ink-dim/70">
          <span className="sr-only">
            An animated sequence: a Lorenz attractor disperses into molecules, gathers
            into a sphere, then forms a branching tree. The left branches lead to
            experience and education, the right to projects.
          </span>
          <span aria-hidden="true">scroll</span>
        </p>
      </div>
    </section>
  );
}
