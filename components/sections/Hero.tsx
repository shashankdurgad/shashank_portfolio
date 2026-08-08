"use client";

import { motion } from "motion/react";
import { profile } from "@/content/resume";

const boot = [
  "BAY.PWR ......... ONLINE",
  "HOIST.SYNC ...... LOCKED",
  "TELEMETRY ....... STREAMING",
];

export function Hero() {
  return (
    <section
      id="hero"
      className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24 sm:px-8"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8 font-mono text-[11px] leading-relaxed text-ink-dim"
      >
        {boot.map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
          >
            <span className="text-arc">›</span> {line}
          </motion.div>
        ))}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="bp-glow font-display text-4xl uppercase leading-[1.05] tracking-[0.06em] text-ink sm:text-6xl lg:text-7xl"
      >
        {profile.name}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.68, duration: 0.6 }}
        className="mt-5 max-w-xl text-balance font-mono text-sm leading-relaxed text-cyan sm:text-base"
      >
        {profile.tagline}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-4 max-w-xl text-sm leading-relaxed text-ink-dim"
      >
        {profile.blurb}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95, duration: 0.6 }}
        className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[12px] uppercase tracking-[0.16em]"
      >
        <a
          className="border-b border-arc/40 pb-0.5 text-arc transition-colors hover:border-arc hover:text-ink"
          href={`mailto:${profile.email}`}
        >
          Email
        </a>
        <a
          className="border-b border-line pb-0.5 text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
          href={profile.links.github}
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          className="border-b border-line pb-0.5 text-ink-dim transition-colors hover:border-cyan hover:text-cyan"
          href={profile.links.linkedin}
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn
        </a>
        <span className="text-ink-dim/70">{profile.location}</span>
      </motion.div>
    </section>
  );
}
