"use client";

import { useEffect, useState } from "react";
import { useDoorStore } from "@/lib/doorStore";
import { scroll } from "@/lib/scrollStore";
import { TIMELINE } from "@/lib/timelineData";

/**
 * Scroll region for the work & education timeline.
 *
 * Only reachable by going through the left door: the section collapses to
 * nothing until then, so the page ends at the doors and there is no way to
 * scroll past them into a timeline the viewer never chose to enter.
 *
 * Deliberately tall and near-empty once open, in the same spirit as
 * MorphStage: the visual is the 3D thread behind it, and this element exists
 * to give that thread scroll distance to be travelled along.
 *
 * The entries are also written out as real text. The 3D labels are drawn into
 * a canvas and are invisible to screen readers and to search engines, so the
 * content has to exist in the DOM as well — the canvas is presentation, this
 * is the actual record.
 */
export function TimelineStage() {
  const entered = useDoorStore((s) => s.entered);
  const open = entered === "left";
  /*
   * Whether the traverse has begun, so the prompt can retire once it has done
   * its job. Polled on scroll rather than held in the scroll store: this is
   * the only consumer, and the store is deliberately outside React so that
   * per-frame values never trigger renders.
   */
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setStarted(scroll.timeline > 0.02);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      setStarted(false);
    };
  }, [open]);

  return (
    <section
      id="timeline"
      aria-label="Work and education"
      className="relative"
      // Zero height while closed, so the page simply ends at the doors.
      style={{ height: open ? "360vh" : 0 }}
    >
      <div
        /*
          justify-end, not justify-between: the heading above is now sr-only
          and takes no space, so a spread layout pushed the scroll prompt up
          under the Back control instead of leaving it at the foot of the
          screen.
        */
        className={`pointer-events-none sticky top-0 flex h-screen flex-col justify-end py-16 ${
          open ? "" : "hidden"
        }`}
      >
        {/*
          The heading is for assistive tech only. On screen the Back control
          already names where the reader is and the thread labels each entry,
          so a third caption pinned above them was noise — and it sat directly
          under the Back button, reading as part of it.
        */}
        <h2 className="sr-only">Work &amp; Education</h2>

        <ol className="sr-only">
          {TIMELINE.map((e) => (
            <li key={e.id}>
              <h3>
                {e.org} — {e.role}
              </h3>
              <p>
                {e.period} · {e.location}
              </p>
              <ul>
                {e.detail.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              {e.stack && <p>Stack: {e.stack.join(", ")}</p>}
            </li>
          ))}
        </ol>

        {/*
          Kept, but only until the reader has begun: once they are moving along
          the thread the prompt has served its purpose.
        */}
        <p
          className={`text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim/70 transition-opacity duration-500 ${
            started ? "opacity-0" : "opacity-100"
          }`}
        >
          scroll
        </p>
      </div>
    </section>
  );
}
