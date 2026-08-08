"use client";

import { Panel, Section } from "@/components/ui/Panel";
import { roles } from "@/content/resume";

export function Experience() {
  return (
    <Section id="experience" index="SYS.02" title="Deployment Log">
      <div className="grid gap-5">
        {roles.map((role, i) => (
          <Panel key={role.id} fig={`FIG.1${i}`} label={role.company}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="font-display text-base uppercase tracking-[0.1em] text-ink">
                {role.title}
              </h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-arc">
                {role.period}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
              {role.company} · {role.location}
            </p>

            <ul className="mt-4 space-y-2.5">
              {role.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-dim">
                  <span className="mt-[7px] h-px w-3 shrink-0 bg-cyan/60" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {role.stack.map((s) => (
                <li
                  key={s}
                  className="border border-line/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-dim"
                >
                  {s}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
