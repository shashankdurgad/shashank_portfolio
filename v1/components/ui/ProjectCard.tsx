"use client";

import { PROJECTS } from "@/lib/projectData";

/**
 * Detail for the hovered chip.
 *
 * A fixed overlay rather than 3D text, for the same reason the timeline's card
 * is: prose at this length needs real typography and line breaking, and stays
 * selectable and legible to assistive tech as DOM.
 */
export function ProjectCard({ id }: { id: string | null }) {
  const project = PROJECTS.find((p) => p.id === id);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-10 left-1/2 z-30 w-[min(34rem,calc(100vw-3rem))] -translate-x-1/2 border border-line/80 bg-void/95 p-4 transition-opacity duration-200 ${
        project ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Kept mounted through the fade so the card does not blank a frame
          before it has finished disappearing. */}
      {project && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-arc">
            {project.award}
          </p>
          <p className="mt-1.5 text-base font-medium text-ink">
            {project.name}
            <span className="ml-2 font-mono text-[11px] font-normal text-ink-dim">
              {project.period}
            </span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {project.detail.map((d) => (
              <li key={d} className="text-xs leading-relaxed text-ink/85">
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-[0.08em] text-cyan/80">
            {project.stack.join(" · ")}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-arc">
            Click to open on GitHub
          </p>
        </>
      )}
    </div>
  );
}
