"use client";

import { useEffect, useRef } from "react";
import { TIMELINE, type TimelineEntry } from "@/content/timeline";
import { observeReveal } from "@/lib/motion/reveal";

/**
 * The trace waterfall.
 *
 * The owner's product is agent observability, so the experience section is a
 * Perfetto/Jaeger-style trace: one span per role, laid out on a shared time
 * axis, with a signal hairline parked at now. The résumé rail is gone; the
 * rows it carried are now collapsed by default and expand natively — every
 * word stays in the server-rendered HTML (crawlable, JS-off readable), the
 * `<details>` toggle needs no script at all.
 *
 * The axis is piecewise on purpose. Six student years would otherwise dwarf
 * every professional span, so the ACS era (2017-01 → 2022-12) is compressed
 * into the track's first 12% — the classic trace-viewer trick for a long
 * quiet prefix — and everything from 2023-01 onward gets the remaining 88%
 * at a single linear scale. The '22 and '23 ticks sit close by design: the
 * compression boundary is meant to be legible, not hidden.
 *
 * NO scroll listener. An earlier revision of this section rode the shared
 * ScrollDirector; the waterfall doesn't need it — the parked now-line and the
 * one-time draw-in (shared IntersectionObserver, lib/motion/reveal) carry the
 * whole motion story, and the section renders once and never again.
 */

/* ---- the time domain ------------------------------------------------- */

/** "YYYY-MM" → absolute month index; only differences are ever read. */
const month = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m - 1;
};

/**
 * NOW is computed once, here at module scope. This page is statically
 * prerendered, so that is build time, and the value ships inside the HTML —
 * the same convention as the sitemap's lastModified (app/sitemap.ts): a
 * rebuilt site re-derives it, a deployed site is self-consistent because
 * ticks, spans and the hairline all read this one constant. (A visit that
 * straddles the month rollover before the next rebuild just means the hairline
 * sits a month back; nothing disagrees with anything else.)
 */
const NOW = (() => {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
})();

/** Start of the compressed era, and the era boundary; live scale resumes at PIVOT. */
const ERA = month("2017-01");
const PIVOT = month("2023-01");

/** Where in the track the piecewise map meets: 0..12% era one, 12..100% era two. */
const KNEE = 12;
/** The narrowest a span may paint, in % — three months must still be visible. */
const MIN_SPAN = 1.2;

/** Month index → % of track. End months are inclusive, so callers pass the
 *  month *after* the last one for a right edge. */
function pos(m: number): number {
  if (m <= PIVOT) return KNEE * ((m - ERA) / (PIVOT - ERA));
  // Clamp at the hairline: ongoing spans end "now", and UCL's future end
  // date (2028-06) parks its bar against it too.
  const live = Math.min(m, NOW);
  return KNEE + (88 * (live - PIVOT)) / Math.max(NOW - PIVOT, 1);
}

/** The span geometry for one entry, in % of track. */
function spanOf(entry: TimelineEntry): { left: number; width: number } {
  const start = month(entry.start);
  const end = entry.end === null ? NOW : month(entry.end) + 1;
  const left = Math.min(pos(start), 100 - MIN_SPAN);
  return { left, width: Math.max(pos(end) - pos(start), MIN_SPAN) };
}

/* ---- labels ----------------------------------------------------------- */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07" → "Jul 2026". */
const label = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/** The period the label column prints; null end reads "Present". */
const period = (entry: TimelineEntry) =>
  `${label(entry.start)} — ${entry.end === null ? "Present" : label(entry.end)}`;

/* ---- axis --------------------------------------------------------------
 * The fixed ticks the two eras deserve: era one gets its start and the year
 * before the knee; era two one per January. `align` pins the label so the
 * compressed '22 and '23 — two track percents apart — cannot collide.       */

type Tick = { ym: string; label: string; align: "" | "-translate-x-1/2" | "-translate-x-full" };

const TICKS: Tick[] = [
  { ym: "2017-01", label: "'17", align: "" },
  { ym: "2022-01", label: "'22", align: "-translate-x-full" },
  { ym: "2023-01", label: "'23", align: "" },
  { ym: "2024-01", label: "'24", align: "-translate-x-1/2" },
  { ym: "2025-01", label: "'25", align: "-translate-x-1/2" },
  { ym: "2026-01", label: "'26", align: "-translate-x-1/2" },
];

/** The row grid: label column + track, mirroring the axis header's column. */
const LABEL_GRID = "grid grid-cols-1 gap-x-6 sm:grid-cols-[11rem_1fr]";

/* ---- marks ------------------------------------------------------------- */

/** The ↗ from the Projects link idiom; local because nothing exports there. */
function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/* ---- the waterfall ------------------------------------------------------ */

export function Timeline() {
  const rootRef = useRef<HTMLDivElement>(null);

  /*
   * Server-rendered HTML is the finished state: bars paint full, rows sit
   * closed, and nothing here is hidden — JS-off, RM and pre-hydration all
   * read exactly what the crawler does. Arming (house rule) only ever takes
   * the draw-in away from that state and hands it to the shared reveal
   * observer: under [data-trace][data-armed] the CSS scales each row's bar to
   * zero until the observer marks the row [data-inview], and the transition
   * plays the grow (globals.css). Under reduced motion this returns early —
   * never armed, bars simply full — and the RM belt there repeats the point.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.dataset.armed = "true";
    // One shared IntersectionObserver for the page; rows carry data-reveal.
    const stopReveal = observeReveal(root);

    return () => {
      stopReveal();
      delete root.dataset.armed;
    };
  }, []);

  return (
    <div ref={rootRef} data-trace>
      {/* Axis header, sm+ only: on mobile every bar is full-track width, so a
          shared scale would be a lie — only the now hairline survives there. */}
      <div
        aria-hidden="true"
        className="mb-2 hidden gap-x-6 sm:grid sm:grid-cols-[11rem_1fr]"
      >
        <div />
        <div className="relative h-6">
          {TICKS.map((t) => {
            const at = `${pos(month(t.ym))}%`;
            return (
              <div key={t.ym}>
                <span
                  className="absolute top-0 h-1.5 w-px bg-(--line-strong)"
                  style={{ left: at }}
                />
                <span
                  className={`absolute top-2 font-mono text-[10px] tabular-nums text-faint ${t.align}`}
                  style={{ left: at }}
                >
                  {t.label}
                </span>
              </div>
            );
          })}
          {/* The now tick, pinned to the hairline that runs the rows below. */}
          <span className="absolute top-0 right-0 h-1.5 w-px bg-signal" />
          <span className="absolute top-2 right-0 font-mono text-[10px] text-signal">
            now
          </span>
        </div>
      </div>

      <ol className="relative">
        {/* The clock cursor: a signal hairline at the now position, running
            down every row. Purely a reading aid, so it stays out of the
            a11y tree — the rows carry the dates as text. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-px bg-signal opacity-50"
        />

        {TIMELINE.map((entry, i) => {
          const { left, width } = spanOf(entry);
          return (
            <li
              key={entry.id}
              // The shared observer's selector; --i is the draw-in stagger.
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
              className="pb-5 last:pb-0"
            >
              {/* Native disclosure: always in the DOM, always expandable with
                  zero JS; the mono +/− in the label column is the visible cue. */}
              <details>
                <summary className={`cursor-pointer ${LABEL_GRID}`}>
                  {/* Label column: org, role, derived period (+ location, as
                      on the rail it replaces), right-aligned into the track. */}
                  <div className="min-w-0 sm:text-right">
                    <p className="text-sm leading-5 font-medium">{entry.org}</p>
                    <p className="text-xs leading-4 text-faint">{entry.role}</p>
                    <p className="mt-1 flex items-baseline gap-1.5 font-mono text-xs leading-4 tabular-nums text-muted sm:justify-end">
                      {/* Empty on purpose: the glyph is CSS ::before content,
                          flipping with [open] for free (globals.css). */}
                      <span data-trace-toggle aria-hidden="true" className="text-faint" />
                      <span>{period(entry)}</span>
                    </p>
                    <p className="text-xs leading-4 text-faint">
                      {entry.location}
                    </p>
                  </div>

                  {/* The track: hairline ground, span bar, honour diamond,
                      live dot. All decoration — the summary text above is the
                      content — so the whole row paints aria-hidden. */}
                  <div
                    aria-hidden="true"
                    className="relative mt-2 h-3 sm:mt-0 sm:self-center"
                  >
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-(--line)" />
                    {entry.award && (
                      <span
                        className="absolute top-[1.5px] text-[9px] leading-none text-accent"
                        style={{ left: `calc(${left}% - 13px)` }}
                      >
                        ◆
                      </span>
                    )}
                    {/* The span. Solid = work, outlined = education; the
                        draw-in transform lives in CSS (never touches this
                        element's positioning, which stays transform-free). */}
                    <span
                      data-trace-bar
                      className={`absolute top-0.5 block h-2 rounded-full ${
                        entry.kind === "work"
                          ? "bg-(--fg)"
                          : "border border-(--fg-muted)"
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {entry.end === null && (
                        // The live span: a 5px signal dot riding the right
                        // cap, centred on the now hairline. This section's
                        // one signal usage per screen.
                        <span
                          className="absolute top-[1.5px] size-[5px] rounded-full bg-signal"
                          style={{ right: "-2.5px" }}
                        />
                      )}
                    </span>
                  </div>
                </summary>

                {/* The expanded body, indented to the track's start on sm+. */}
                <div className="mt-2 sm:mt-1 sm:pl-[calc(11rem_+_1.5rem)]">
                  <p className="text-sm leading-relaxed text-muted">
                    {entry.summary}
                  </p>

                  <ul className="mt-2 space-y-1.5">
                    {entry.detail.map((line) => (
                      <li
                        key={line}
                        className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>

                  {entry.award && (
                    <p className="mt-3 text-xs leading-relaxed text-accent">
                      {entry.award}
                    </p>
                  )}

                  {entry.links && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                      {entry.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-fg"
                        >
                          {link.label} <ArrowIcon />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
