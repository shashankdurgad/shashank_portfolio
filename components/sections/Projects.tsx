"use client";

import { Panel, Section } from "@/components/ui/Panel";
import { projects } from "@/content/projects";

export function Projects() {
  return (
    <Section id="projects" index="SYS.03" title="Builds">
      <div className="grid gap-5">
        {projects.map((p, i) => (
          <Panel
            key={p.id}
            fig={`FIG.${String(i + 1).padStart(2, "0")}`}
            label={p.subtitle}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="font-display text-lg uppercase tracking-[0.1em] text-ink">
                {p.title}
              </h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim">
                {p.period}
              </span>
            </div>

            {p.award && (
              <p className="mt-2 inline-block border border-amber/35 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                {p.award}
              </p>
            )}

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink">{p.blurb}</p>

            <ul className="mt-4 space-y-2.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-dim">
                  <span className="mt-[7px] h-px w-3 shrink-0 bg-cyan/60" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <ul className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <li
                    key={t}
                    className="border border-line/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim"
                  >
                    {t}
                  </li>
                ))}
              </ul>
              {p.links?.paper && (
                <a
                  href={p.links.paper}
                  target="_blank"
                  rel="noreferrer"
                  className="border-b border-arc/40 pb-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-arc transition-colors hover:border-arc hover:text-ink"
                >
                  White paper ↗
                </a>
              )}
              {p.links?.repo && (
                <a
                  href={p.links.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="border-b border-line pb-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
                >
                  Repo ↗
                </a>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
