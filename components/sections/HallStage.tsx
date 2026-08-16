"use client";

import { useDoorStore } from "@/lib/doorStore";
import { PROJECTS } from "@/lib/projectData";

/**
 * Region for the projects hall.
 *
 * Only reachable through the right-hand door, and collapsed to nothing until
 * then, so the page still ends at the doors.
 *
 * Unlike the timeline this has no traverse — the viewer stands still and turns
 * — so it needs only a single screen of height rather than a scrollable span.
 *
 * The projects are written out as real text as well. The 3D chips are drawn
 * into a canvas and are invisible to screen readers and search engines, so the
 * content has to exist in the DOM: the canvas is presentation, this is the
 * record.
 */
export function HallStage() {
  const entered = useDoorStore((s) => s.entered);
  const open = entered === "right";

  return (
    <section
      id="hall"
      aria-label="Projects"
      className="relative"
      style={{ height: open ? "100vh" : 0 }}
    >
      <div className={`pointer-events-none sticky top-0 h-screen ${open ? "" : "hidden"}`}>
        <h2 className="sr-only">Projects</h2>
        <ol className="sr-only">
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <h3>{p.name}</h3>
              <p>{p.summary}</p>
              <p>{p.award}</p>
              <ul>
                {p.detail.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p>Stack: {p.stack.join(", ")}</p>
              <a href={p.repo}>{p.name} on GitHub</a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
