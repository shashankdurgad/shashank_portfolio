"use client";

import { useEffect, useRef } from "react";
import { TIMELINE, type TimelineEntry } from "@/content/timeline";
import { Chip } from "@/components/ui/Chip";
import { subscribe } from "@/lib/motion/scrollDirector";

/**
 * The timeline rail.
 *
 * A single line runs down the left with a node per entry. The line is drawn in
 * two layers: a static track at low contrast, and a bright progress line on top
 * whose height follows scroll position, so it appears to draw itself downward as
 * the section passes through the viewport. A signal dot rides the head of that
 * line — the one place the colour appears while scrolling.
 *
 * Progress is measured against the rail's own geometry rather than the section's,
 * so the line reaches the last node exactly when that node is read — tying it to
 * the section box instead leaves the line short by the height of the final card.
 *
 * Scroll work rides the shared ScrollDirector and writes the DOM directly:
 * --p on the rail (a registered <number>, see globals.css) drives the line
 * height and the dot position through CSS calc, and each entry flips a
 * data-reached attribute that CSS reads. No React state participates in the
 * scroll path at all — the component renders once and never again.
 */

/** Where in the viewport a node counts as "reached", as a fraction of height. */
const TRIGGER = 0.72;

/*
 * The P3 timeline rewrite (plan §4) landed `highlight` (a one-line metric) and
 * `award` (honours belonging to the role) on TimelineEntry itself; the widening
 * is kept so this file still typechecks against either shape.
 */
type WithHighlight = TimelineEntry & { highlight?: string; award?: string };

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
   * So: the server-rendered HTML is the readable end state — the rail carries
   * --p: 1 explicitly (a *registered* custom property falls back to its
   * initial-value of 0, not to any var() fallback), and every entry renders
   * data-reached="true". Arming only ever takes things away from there.
   */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Arming is a DOM attribute, not state. It only ever gates CSS
    // transitions, so routing it through state would buy nothing and cost a
    // render.
    rail.dataset.armed = "true";

    // The component holds no state, so this DOM never changes shape and the
    // node list can be collected once instead of per callback.
    const items = Array.from(
      rail.querySelectorAll<HTMLElement>("li[data-reached]"),
    );
    // Server end state: everything reached.
    let reached = items.length - 1;

    function flipTo(last: number) {
      if (last === reached) return;
      // Entries differ from the previous mark only between the old and new
      // index — attribute writes stay proportional to what actually changed.
      const lo = Math.min(last, reached);
      const hi = Math.max(last, reached);
      for (let i = lo + 1; i <= hi; i++) {
        items[i].dataset.reached = i <= last ? "true" : "false";
      }
      reached = last;
    }

    const unsubscribe = subscribe(() => {
      const rect = rail!.getBoundingClientRect();
      const line = window.innerHeight * TRIGGER;
      // How far the trigger line has travelled down the rail, 0..1. The
      // string conversion is the CSS interface's cost, not an allocation the
      // director makes.
      const p = (line - rect.top) / Math.max(rect.height, 1);
      rail!.style.setProperty("--p", Math.min(Math.max(p, 0), 1).toFixed(4));

      // Which nodes sit above the trigger line. Measured from the entries
      // themselves so the reveal stays in step with the drawn line even as
      // cards change height across breakpoints.
      let last = -1;
      for (let i = 0; i < items.length; i++) {
        if (items[i].getBoundingClientRect().top < line) last = i;
      }
      flipTo(last);
    });

    return () => {
      unsubscribe();
      delete rail.dataset.armed;
    };
  }, []);

  return (
    <ol
      ref={railRef}
      className="relative"
      // --p must be set here rather than left to var() fallbacks: the property
      // is registered (globals.css) and so always resolves — to 0.
      style={{ "--p": "1" } as React.CSSProperties}
    >
      {/* Static track. Inset to sit under the node centres. */}
      <div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-1.25 w-px bg-(--line) sm:left-37.25"
      />
      {/* Progress line, drawn on top. Height follows --p in CSS, so the scroll
          callback never touches this element. */}
      <div
        aria-hidden="true"
        className="absolute top-2 left-1.25 w-px origin-top bg-(--fg-muted) transition-none sm:left-37.25 in-data-armed:transition-[height] in-data-armed:duration-[120ms] in-data-armed:ease-linear"
        style={{ height: "calc((100% - 1rem) * var(--p))" }}
      />
      {/* Signal dot riding the head of the progress line: 3px centred on the
          same x as the line, with the same y --p puts the line's end. */}
      <div
        aria-hidden="true"
        className="absolute left-[calc(0.3125rem_-_1.5px_+_0.5px)] size-[3px] -translate-y-1/2 rounded-full bg-signal transition-none sm:left-[calc(9.3125rem_-_1.5px_+_0.5px)] in-data-armed:transition-[top] in-data-armed:duration-[120ms] in-data-armed:ease-linear"
        style={{ top: "calc(0.5rem + (100% - 1rem) * var(--p))" }}
      />

      {TIMELINE.map((raw) => {
        const entry = raw as WithHighlight;
        return (
          <li
            key={entry.id}
            // Everything below reads this to decide whether it is revealed;
            // server renders "reached" for all, arming revises it.
            data-reached="true"
            className="relative grid gap-x-8 gap-y-2 pb-10 pl-8 last:pb-0 sm:grid-cols-[9rem_1fr] sm:pl-0"
          >
            {/* Period column. On mobile it sits above the role instead. */}
            <div className="sm:text-right sm:pr-8">
              {/* Data type: mono with tabular figures, so periods across
                  entries line up in columns rather than dance. */}
              <p className="font-mono text-xs tabular-nums text-muted">
                {entry.period}
              </p>
              <p className="mt-0.5 text-xs text-faint">{entry.location}</p>
              {entry.highlight && (
                <p className="mt-1 font-mono text-xs tabular-nums text-faint">
                  {entry.highlight}
                </p>
              )}
              {/* Honours that belong to the role rather than a project card
                  (Onflow's awards live here, not on the rail). */}
              {entry.award && (
                <p className="mt-1.5 text-xs text-muted sm:text-right">{entry.award}</p>
              )}
            </div>

            {/* Node. Filled for work, hollow for education — the distinction is
                carried by shape rather than colour so it survives both themes.
                The overshoot ease (1.56 back-out) gives the pop a slight
                bounce on arrival, armed-only. */}
            <span
              data-node
              aria-hidden="true"
              className={[
                "absolute top-1.5 left-0 size-2.75 rounded-full border transition-none sm:left-36",
                "in-data-armed:transition-[transform,opacity] in-data-armed:duration-400 in-data-armed:ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                "in-data-[reached=false]:scale-75 in-data-[reached=false]:opacity-35",
                entry.kind === "work"
                  ? "border-(--fg) bg-(--fg)"
                  : "border-(--fg-muted) bg-surface",
              ].join(" ")}
            />

            {/* Unreached hides the card body; the transition exists only under
                data-armed, and the 60ms delay (also armed-only) staggers the
                fade behind the node pop — entries already stagger naturally
                by crossing the trigger line at different times. */}
            <div className="transition-none in-data-armed:transition-all in-data-armed:duration-500 in-data-armed:ease-out in-data-armed:[transition-delay:60ms] in-data-[reached=false]:translate-y-3 in-data-[reached=false]:opacity-0">
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
