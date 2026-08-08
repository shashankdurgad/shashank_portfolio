"use client";

import { Panel, Section } from "@/components/ui/Panel";
import { education, profile } from "@/content/resume";

export function About() {
  return (
    <Section id="about" index="SYS.01" title="Operator">
      <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
        <Panel fig="FIG.00" label="profile">
          <p className="text-sm leading-relaxed text-ink">{profile.blurb}</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            The through-line across everything below is the same loop: instrument a
            system, measure what it actually does, change something, measure again.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {profile.interests.map((it) => (
              <li
                key={it}
                className="border border-line/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan"
              >
                {it}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-5">
          {education.map((ed, i) => (
            <Panel key={ed.id} fig={`FIG.0${i}`} label="education">
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-ink">
                {ed.institution}
              </h3>
              <p className="mt-1.5 text-sm text-cyan">{ed.qualification}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
                {ed.period} · {ed.location}
              </p>
              <ul className="mt-3 space-y-1.5">
                {ed.detail.map((d) => (
                  <li key={d} className="flex gap-2 text-[13px] leading-relaxed text-ink-dim">
                    <span className="text-line">—</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
    </Section>
  );
}
