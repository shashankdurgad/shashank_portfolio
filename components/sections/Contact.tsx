"use client";

import { Panel, Section } from "@/components/ui/Panel";
import { profile } from "@/content/resume";

export function Contact() {
  return (
    <Section id="contact" index="SYS.05" title="Open Channel">
      <Panel fig="FIG.99" label="powering down">
        <p className="max-w-lg text-sm leading-relaxed text-ink">
          Open to internships and collaborations in agentic systems, RL and model
          training infrastructure. The fastest way to reach me is email.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[12px] uppercase tracking-[0.16em]">
          <a
            className="border-b border-arc/40 pb-0.5 text-arc transition-colors hover:border-arc hover:text-ink"
            href={`mailto:${profile.email}`}
          >
            {profile.email}
          </a>
          <a
            className="border-b border-line pb-0.5 text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
            href={profile.links.github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <a
            className="border-b border-line pb-0.5 text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
            href={profile.links.linkedin}
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
        </div>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim/60">
          {profile.location} · bay idle
        </p>
      </Panel>
    </Section>
  );
}
