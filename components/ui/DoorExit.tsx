"use client";

import { useDoorStore } from "@/lib/doorStore";

/**
 * Explicit way back out of a door.
 *
 * The door stays open behind the viewer, so there is no visual cue that
 * leaving is possible — scrolling back would be a guess. A named control is
 * the honest affordance, and it is real DOM so it is keyboard-reachable and
 * announced, which a 3D hit target would not be.
 */
export function DoorExit() {
  const entered = useDoorStore((s) => s.entered);
  const exit = useDoorStore((s) => s.exit);

  return (
    <button
      type="button"
      onClick={exit}
      // Kept mounted and faded, so it can transition rather than blink away,
      // and hidden from the tab order while there is nothing to exit.
      aria-hidden={!entered}
      tabIndex={entered ? 0 : -1}
      className={`bp-chip fixed left-1/2 top-8 z-30 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.16em] transition-opacity duration-300 ${
        entered ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ ["--chip" as string]: "var(--color-arc)" }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 4.5 8 12l7.5 7.5-1.4 1.4L5.2 12l8.9-8.9z" />
      </svg>
      Back
    </button>
  );
}
