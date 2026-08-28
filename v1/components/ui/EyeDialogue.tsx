"use client";

import { useDialogueStore } from "@/lib/dialogueStore";

/**
 * What the eyes are saying, as a bubble beneath them.
 *
 * Ordinary DOM rather than drei's <Html>, for the reason recorded on
 * TimelineCard: anchoring a reading surface in the scene has failed twice on
 * this project, once shrinking to illegibility and once losing its transform
 * entirely. Text belongs in the layer that is good at text.
 *
 * Placed by the hero's grid rather than fixed to the viewport, so it sits with
 * the eyes instead of floating over whatever happens to be on screen.
 */
export function EyeDialogue() {
  const line = useDialogueStore((s) => s.line);
  const visible = useDialogueStore((s) => s.visible);
  const phase = useDialogueStore((s) => s.phase);

  const showing = line !== null && phase !== "idle";

  return (
    /*
     * aria-live, and not aria-hidden.
     *
     * The rest of the hero's decorative furniture is hidden from assistive
     * tech, but this is the one piece with something to say — the nudge to
     * scroll is genuine guidance. "polite" so it waits its turn rather than
     * interrupting, and the container is always mounted so the region is
     * registered before the first line arrives.
     */
    <div
      aria-live="polite"
      // The boot loader also has a live region; this names the one that speaks.
      data-eye-dialogue={phase}
      className="pointer-events-none flex min-h-10 items-end justify-center"
    >
      <div
        className={`relative max-w-[min(22rem,calc(100vw-3rem))] border border-cyan/25 bg-void/90 px-3.5 py-2 transition-all duration-300 ${
          showing ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
        style={{ boxShadow: "0 0 24px -6px var(--color-cyan)" }}
      >
        {/*
          Tail, pointing up at the eyes. Two stacked squares rather than a
          border trick: the bubble has both a border and a glow, and a CSS
          triangle can carry neither.
        */}
        <span
          aria-hidden="true"
          className="absolute -top-1.25 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-cyan/25 bg-void/90"
        />
        <p className="text-center font-mono text-[12px] leading-relaxed tracking-[0.02em] text-ink/90">
          {visible}
          {/*
            Cursor, while typing. Hidden from assistive tech, which receives the
            finished line through the live region rather than character by
            character.
          */}
          {phase === "typing" && (
            <span aria-hidden="true" className="ml-0.5 text-cyan opacity-80">
              ▌
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
