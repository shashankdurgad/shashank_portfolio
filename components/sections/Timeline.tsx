"use client";

import { useEffect, useRef, useState } from "react";
import { TIMELINE, type Month } from "@/content/timeline";
import { AwardTag, Chip } from "@/components/ui/Chip";
import { GraphCell } from "@/components/work/GraphCell";
import { HEAD_H, layout } from "@/components/work/graph";

/**
 * The commit graph: `git log --graph` over work, study and societies.
 *
 * Text is a list of entries, each a git-log line that opens into its detail.
 * The graph is drawn one row at a time beside it (see GraphCell for why).
 *
 * The draw-in reveals each row's slice bottom-up with a clip-path, oldest
 * first, so history appears to grow towards HEAD. A stroke-dashoffset draw
 * would be the obvious technique, but it needs the dash array to itself, and
 * two of the three lanes already use theirs for their line style.
 */

function range(start: Month, end: Month | null) {
  return `${start} → ${end ?? "now"}`;
}

export function Timeline({ asOf }: { asOf: Month }) {
  const graph = layout(TIMELINE, asOf);
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(graph.rows[0]?.id ?? null);
  const [active, setActive] = useState<string | null>(null);

  /*
   * The server renders the drawn end state, and arming only ever takes things
   * away from it — if this effect never runs, the graph is simply there.
   *
   * It also only arms when the graph is still below the fold. Hiding something
   * the visitor is already looking at, just to animate it back, reads as a
   * flicker rather than an entrance.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.phase = "armed";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.phase = "drawn";
        io.disconnect();
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const n = graph.rows.length;

  // The reveal wrapper around each row's graph. Delays run bottom-up.
  const reveal =
    "flex self-stretch [clip-path:inset(0)] transition-[clip-path] duration-500 ease-out in-data-[phase=armed]:[clip-path:inset(100%_0_0_0)]";

  function cells(row: number) {
    return (
      <div className={reveal} style={{ transitionDelay: `${(n - row) * 90}ms` }}>
        <GraphCell graph={graph} row={row} gap={13} active={active} className="sm:hidden" />
        <GraphCell graph={graph} row={row} gap={20} active={active} className="hidden sm:block" />
      </div>
    );
  }

  return (
    <div ref={ref}>
      {/* HEAD strip: where the open branches end. */}
      <div className="flex" style={{ height: HEAD_H }}>
        <span className="hidden w-12 shrink-0 sm:block" />
        {cells(-1)}
        <p className="pl-3 font-mono text-xs leading-[20px] text-faint">
          HEAD <span className="opacity-60">→</span> now
        </p>
      </div>

      <ol>
        {graph.rows.map((e, i) => {
          const expandable = Boolean(e.points?.length || e.stack?.length);
          const isOpen = expandable && open === e.id;
          const newYear = i === 0 || graph.rows[i - 1].year !== e.year;

          const head = (
            <>
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs leading-4">
                <span className="text-muted">{e.hash}</span>
                <span className="text-faint">{range(e.start, e.end)}</span>
                {e.tags?.map((t) => <AwardTag key={t}>{t}</AwardTag>)}
                {expandable && (
                  <span aria-hidden="true" className="ml-auto text-faint transition-colors group-hover:text-fg">
                    {isOpen ? "[−]" : "[+]"}
                  </span>
                )}
              </span>
              <span className="mt-2 block font-medium tracking-[-0.01em]">
                {e.role}
                <span className="text-faint"> · </span>
                <span className="text-muted">{e.org}</span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{e.line}</span>
            </>
          );

          return (
            <li
              key={e.id}
              className="flex"
              onMouseEnter={() => setActive(e.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(e.id)}
              onBlur={() => setActive(null)}
            >
              {/* Year gutter: only where the year changes, like a log's date
                  separators. On phones the date in the line carries it. */}
              <span className="hidden w-12 shrink-0 pt-3.5 font-mono text-xs leading-4 text-faint sm:block">
                {newYear ? e.year : ""}
              </span>

              {cells(i)}

              <div className="min-w-0 flex-1 pb-7 pl-3">
                {expandable ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`tl-${e.id}`}
                    onClick={() => setOpen(isOpen ? null : e.id)}
                    className="group block w-full rounded-md pt-3.5 text-left"
                  >
                    {head}
                  </button>
                ) : (
                  <div className="pt-3.5">{head}</div>
                )}

                {expandable && (
                  // Height animates via the 0fr → 1fr grid-row trick; `inert`
                  // keeps the collapsed links out of the tab order.
                  <div
                    id={`tl-${e.id}`}
                    inert={!isOpen}
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      {e.points && (
                        <ul className="mt-3 space-y-1.5">
                          {e.points.map((p) => (
                            <li
                              key={p}
                              className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
                            >
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                      {e.stack && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {e.stack.map((s) => (
                            <Chip key={s}>{s}</Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
