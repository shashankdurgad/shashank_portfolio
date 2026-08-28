"use client";

import { useEffect, useRef, useState } from "react";
import { TIMELINE } from "@/content/timeline";
import { Chip } from "@/components/ui/Chip";

/**
 * The timeline rail.
 *
 * A single line runs down the left with a node per entry. The line is drawn in
 * two layers: a static track at low contrast, and a bright progress line on top
 * whose height follows scroll position, so it appears to draw itself downward as
 * the section passes through the viewport.
 *
 * Progress is measured against the rail's own geometry rather than the section's,
 * so the line reaches the last node exactly when that node is read — tying it to
 * the section box instead leaves the line short by the height of the final card.
 */

/** Where in the viewport a node counts as "reached", as a fraction of height. */
const TRIGGER = 0.72;

export function Timeline() {
  const railRef = useRef<HTMLOListElement>(null);

  /*
   * Everything starts fully revealed, and the scroll animation is opted into
   * after mount.
   *
   * This ordering is deliberate and both halves matter. Reading matchMedia in a
   * state initialiser desynchronises server and client — the server has no
   * matchMedia, so it renders the animated-from state while a reduced-motion
   * client initialises to the final one, and React reports a hydration
   * mismatch. And starting hidden means that if the effect never runs — JS
   * disabled, a hydration error, reduced motion taking an early return — the
   * content stays invisible, which is a far worse failure than not animating.
   *
   * So: the server-rendered HTML is the readable end state, and arming only ever
   * takes things away from it.
   */
  const [progress, setProgress] = useState(1);
  // Index of the last node the progress line has passed.
  const [reached, setReached] = useState(TIMELINE.length - 1);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Arming is a class on the DOM node, not React state. It only ever gates CSS
    // transitions, so routing it through state would buy nothing and cost a
    // render — and setting state synchronously in an effect is exactly the
    // cascading-render pattern the lint rule exists to catch.
    rail.dataset.armed = "true";

    let raf = 0;

    function update() {
      raf = 0;
      const el = railRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const line = window.innerHeight * TRIGGER;
      // How far the trigger line has travelled down the rail, 0..1.
      const p = (line - rect.top) / Math.max(rect.height, 1);
      setProgress(Math.min(Math.max(p, 0), 1));

      // Which nodes sit above the trigger line. Measured from the nodes
      // themselves so the reveal stays in step with the drawn line even as
      // cards change height across breakpoints.
      const nodes = el.querySelectorAll<HTMLElement>("[data-node]");
      let last = -1;
      nodes.forEach((node, i) => {
        if (node.getBoundingClientRect().top < line) last = i;
      });
      setReached(last);
    }

    function onScroll() {
      // Coalesce to one update per frame: scroll fires far more often, and each
      // update writes state that re-renders the list.
      if (!raf) raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <ol ref={railRef} className="relative">
      {/* Static track. Inset to sit under the node centres. */}
      <div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-1.25 w-px bg-(--line) sm:left-37.25"
      />
      {/* Progress line, drawn on top. */}
      <div
        aria-hidden="true"
        className="absolute top-2 left-1.25 w-px origin-top bg-(--fg-muted) transition-none sm:left-37.25 in-data-armed:transition-[height] in-data-armed:duration-[120ms] in-data-armed:ease-linear"
        style={{
          height: `calc((100% - 1rem) * ${progress})`,
        }}
      />

      {TIMELINE.map((entry, i) => {
        const active = i <= reached;
        return (
          <li
            key={entry.id}
            className="relative grid gap-x-8 gap-y-2 pb-10 pl-8 last:pb-0 sm:grid-cols-[9rem_1fr] sm:pl-0"
          >
            {/* Period column. On mobile it sits above the role instead. */}
            <div className="sm:text-right sm:pr-8">
              <p className="text-sm text-muted">{entry.period}</p>
              <p className="mt-0.5 text-xs text-faint">{entry.location}</p>
            </div>

            {/* Node. Filled for work, hollow for education — the distinction is
                carried by shape rather than colour so it survives both themes. */}
            <span
              data-node
              aria-hidden="true"
              className={[
                "absolute top-1.5 left-0 size-2.75 rounded-full border sm:left-36 in-data-armed:transition-all in-data-armed:duration-500",
                entry.kind === "work"
                  ? "border-(--fg) bg-(--fg)"
                  : "border-(--fg-muted) bg-surface",
                active ? "scale-100 opacity-100" : "scale-75 opacity-35",
              ].join(" ")}
            />

            <div
              className="in-data-armed:transition-all in-data-armed:duration-500 in-data-armed:ease-out"
              style={{
                opacity: active ? 1 : 0,
                transform: active ? "none" : "translateY(12px)",
                // Stagger within a card only — entries are already staggered by
                // arriving at the trigger line at different times.
                transitionDelay: active ? "60ms" : "0ms",
              }}
            >
              <h3 className="font-medium">
                {entry.role}
                <span className="text-faint"> · </span>
                <span className="text-muted">{entry.org}</span>
              </h3>

              <ul className="mt-3 space-y-2">
                {entry.detail.map((line) => (
                  <li
                    key={line}
                    className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
                  >
                    {line}
                  </li>
                ))}
              </ul>

              {entry.stack && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {entry.stack.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
