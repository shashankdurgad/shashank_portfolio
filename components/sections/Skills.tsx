"use client";

import { Panel, Section } from "@/components/ui/Panel";
import { skills } from "@/content/resume";

export function Skills() {
  return (
    <Section id="skills" index="SYS.04" title="Instrument Cluster">
      <div className="grid gap-5 md:grid-cols-3">
        {skills.map((group, i) => (
          <Panel key={group.id} fig={`FIG.2${i}`} label={group.label}>
            <ul className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="border border-line/60 px-2 py-1 font-mono text-[11px] tracking-[0.06em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
