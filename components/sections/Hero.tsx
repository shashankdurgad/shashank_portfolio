"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useQuality } from "@/lib/quality";

/**
 * Hero copy, inlined. Previously imported from content/resume.ts, which was
 * removed with the resume sections.
 */
const PROFILE = {
  name: "Shashank Durgad",
  tagline: "agentic AI systems and the infra that make them measurably better",
  blurb:
    "CS at UCL, SWE intern at Overmind. I build agentic systems and the measurement layer around them — traces, evals, and the pipelines that turn both into better models.",
  location: "London, UK",
  email: "shashankdurgad@gmail.com",
  links: {
    github: "https://github.com/shashankdurgad",
    linkedin: "https://linkedin.com/in/shashank-durgad",
  },
};

const boot = [
  ["BAY.PWR", "ONLINE"],
  ["HOIST.SYNC", "LOCKED"],
  ["TELEMETRY", "STREAMING"],
];

export function Hero() {
  // Hold the entrance until the boot overlay has lifted, so the hero reveals
  // into view rather than playing out behind the loader.
  //
  // The fallback timer is not decoration: the scene is a dynamic chunk, so on a
  // slow connection `booted` can stay false while the hero is already
  // interactive. Without this the copy would sit invisible behind no loader.
  const booted = useQuality((s) => s.booted);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Longer than BootLoader's minimum display time, so this only ever fires
    // when the scene chunk genuinely failed to arrive.
    const t = setTimeout(() => setExpired(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const show = booted || expired ? "visible" : "hidden";

  return (
    <section
      id="hero"
      className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24 sm:px-8"
    >
      <motion.div
        initial="hidden"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        animate={show}
        transition={{ duration: 0.6 }}
        className="mb-8 font-mono text-[11px] leading-relaxed text-ink-dim"
      >
        {boot.map(([label, status], i) => (
          <motion.div
            key={label}
            initial="hidden"
            variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
            animate={show}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
            className="flex max-w-76 items-baseline gap-2 tracking-[0.08em]"
          >
            <span className="text-arc">›</span>
            <span>{label}</span>
            <span
              aria-hidden="true"
              className="mx-1 h-px flex-1 self-center border-b border-dotted border-line"
            />
            <span className="text-cyan">{status}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.h1
        initial="hidden"
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        animate={show}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="bp-glow max-w-[11ch] font-display text-5xl font-medium uppercase leading-[1.02] tracking-[0.02em] text-ink sm:text-6xl lg:text-7xl"
      >
        {PROFILE.name}
      </motion.h1>

      <motion.p
        initial="hidden"
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        animate={show}
        transition={{ delay: 0.68, duration: 0.6 }}
        className="mt-5 max-w-xl text-balance font-mono text-sm leading-relaxed text-cyan sm:text-base"
      >
        {PROFILE.tagline}
      </motion.p>

      <motion.p
        initial="hidden"
        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        animate={show}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-4 max-w-xl text-sm leading-relaxed text-ink-dim"
      >
        {PROFILE.blurb}
      </motion.p>

      <motion.div
        initial="hidden"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        animate={show}
        transition={{ delay: 0.95, duration: 0.6 }}
        className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[12px] uppercase tracking-[0.16em]"
      >
        <a
          className="border-b border-arc/40 pb-0.5 text-arc transition-colors hover:border-arc hover:text-ink"
          href={`mailto:${PROFILE.email}`}
        >
          Email
        </a>
        <a
          className="border-b border-line pb-0.5 text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
          href={PROFILE.links.github}
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          className="border-b border-line pb-0.5 text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
          href={PROFILE.links.linkedin}
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn
        </a>
        <span className="text-ink-dim/70">{PROFILE.location}</span>
      </motion.div>
    </section>
  );
}
