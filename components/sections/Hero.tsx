"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useQuality } from "@/lib/quality";
import { bindSignals, raise } from "@/lib/dialogueSignals";
import { book, installDialogueHook, request } from "@/lib/dialogueStore";
import { EyeDialogue } from "@/components/ui/EyeDialogue";

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

/*
 * Contact marks, inlined as SVG paths.
 *
 * Inline rather than an icon package or files in public/: three glyphs do not
 * justify a dependency, and inlining keeps them in the same request as the
 * markup with no flash of unstyled icon. They inherit currentColor so the
 * chip's hover transition carries them along.
 *
 * The email icon is a generic envelope, not the Gmail mark. `mailto:` opens
 * whichever client the visitor actually uses, so a Gmail logo would claim a
 * relationship with a product that is not necessarily involved.
 */
const EnvelopeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v.4l-10 5.6L2 5.9v-.4Zm0 2.7V18.5A1.5 1.5 0 0 0 3.5 20h17a1.5 1.5 0 0 0 1.5-1.5V8.2l-9.6 5.4a1 1 0 0 1-.8 0L2 8.2Z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.4 4.7 18.4 5 18.4 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.4 21.5h5.2V9.5H2.4v12ZM10 9.5h5v1.6a5.5 5.5 0 0 1 4.9-2.4c3.2 0 4.7 1.9 4.7 5.6v7.2h-5.2v-6.7c0-1.7-.6-2.7-2-2.7-1.2 0-1.9.8-2.2 1.6-.1.3-.1.7-.1 1.1v6.7H10V9.5Z" />
  </svg>
);

/**
 * Contact links, rendered as chips. Each carries the token its glow keys off,
 * so the three read as one family without hard-coding colours in the markup.
 */
const CONTACTS = [
  { label: "Email", icon: EnvelopeIcon, glow: "var(--color-arc)", href: `mailto:${PROFILE.email}` },
  { label: "GitHub", icon: GitHubIcon, glow: "var(--color-cyan)", href: PROFILE.links.github },
  { label: "LinkedIn", icon: LinkedInIcon, glow: "var(--color-cyan)", href: PROFILE.links.linkedin },
] as const;

const fade = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const rise = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

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

  /*
   * The eyes' voice.
   *
   * The window-level detectors bind here rather than in the canvas so they
   * exist even on the tiers where the scene never mounts — the bubble is DOM
   * and can still greet a visitor whose GPU cannot draw the eyes. The
   * frame-driven triggers do come from the canvas, and simply never fire when
   * there is no canvas to run them.
   */
  useEffect(() => {
    book.instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    installDialogueHook();
    return bindSignals();
  }, []);

  /*
   * The greeting waits for the overlay to finish lifting, not merely for
   * `booted`.
   *
   * `booted` only starts the fade — keyed off that, the whole greeting typed
   * out and expired behind the loader, measured at 4.5s against an overlay
   * that did not leave until 9s. `uncovered` is the moment the hero is
   * genuinely on screen.
   *
   * The delay on top is deliberate: arriving in the same instant as the hero
   * copy reads as part of the page load, where the line should land as
   * someone noticing you.
   *
   * `uncovered` alone, with no `expired` fallback. That fallback exists so the
   * hero copy is never trapped behind a stalled loader, but it fires on a 3s
   * timer that can easily beat the overlay — which is exactly how the greeting
   * ended up speaking into a covered screen. A greeting nobody sees is worse
   * than one that waits, and the loader has its own 8s escape hatch.
   */
  const uncovered = useQuality((s) => s.uncovered);
  useEffect(() => {
    if (!uncovered) return;
    const t = setTimeout(() => request("greeting"), 900);
    return () => clearTimeout(t);
  }, [uncovered]);

  return (
    <section
      id="hero"
      /*
       * Corner layout: identity top-left, supporting copy bottom-right, with
       * the centre column left clear for the particle eyes behind. The grid
       * collapses to a single stacked column on small screens, where there is
       * no room to flank a centrepiece.
       */
      className="relative grid min-h-screen w-full grid-rows-[auto_1fr_auto] gap-12 px-6 py-20 sm:gap-8 sm:px-10 sm:py-24 lg:px-14"
    >
      {/* ── Top-left: name, tagline ───────────────────────────────────── */}
      <div className="max-w-xl">
        <motion.h1
          initial="hidden"
          variants={rise}
          animate={show}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="bp-glow max-w-[11ch] font-display text-5xl font-medium uppercase leading-[1.02] tracking-[0.02em] text-ink sm:text-6xl lg:text-7xl"
        >
          {PROFILE.name}
        </motion.h1>

        <motion.p
          initial="hidden"
          variants={rise}
          animate={show}
          transition={{ delay: 0.33, duration: 0.6 }}
          className="mt-5 max-w-sm text-balance font-mono text-sm leading-relaxed text-cyan/90"
        >
          {PROFILE.tagline}
        </motion.p>
      </div>

      {/*
        Middle row is otherwise empty — the eyes own the centre, and what they
        say sits at the foot of it, directly under them.

        This replaced a static "scroll" prompt. The two wanted the same slot
        and said the same thing, and the eyes nudging you downward when you
        have stalled is both the same instruction and a better one: it arrives
        because you paused, not because the page loaded.
      */}
      <div className="flex items-end justify-center pb-4">
        <EyeDialogue />
      </div>

      {/* ── Bottom-right: blurb and links ─────────────────────────────── */}
      <div className="flex justify-start lg:justify-end">
        <div className="max-w-sm lg:text-right">
          <motion.p
            initial="hidden"
            variants={rise}
            animate={show}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-sm leading-relaxed text-ink/85"
          >
            {PROFILE.blurb}
          </motion.p>

          <motion.div
            initial="hidden"
            variants={fade}
            animate={show}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 font-mono text-[12px] uppercase tracking-[0.16em] lg:justify-end"
          >
            {CONTACTS.map(({ label, icon: Icon, glow, href }) => (
              <a
                key={label}
                className="bp-chip"
                style={{ ["--chip" as string]: glow }}
                href={href}
                // The eyes notice you considering a contact link. Raised rather
                // than requested directly, so it queues with everything else
                // and loses to a livelier trigger in the same frame.
                onPointerEnter={() => raise("contactHover")}
                // mailto: must stay in the current tab; a new tab would open
                // and immediately blank when the mail client takes over.
                {...(href.startsWith("mailto:")
                  ? {}
                  : { target: "_blank", rel: "noreferrer" })}
              >
                <Icon />
                {label}
              </a>
            ))}
            <span className="ml-1 text-ink-dim/70">{PROFILE.location}</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
