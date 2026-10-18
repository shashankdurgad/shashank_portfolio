"use client";

import type { PointerEvent, ReactNode } from "react";

/**
 * The featured card's shell, and the only client code in the section.
 *
 * The highlight follows the pointer through two custom properties written
 * straight onto the element. Going through React state would re-render the
 * whole card on every pointermove for what is purely a paint concern.
 *
 * Everything inside stays a server component, passed through as children.
 */
export function SpotlightCard({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  function onPointerMove(e: PointerEvent<HTMLElement>) {
    // Touch has no hover; a highlight that jumps to wherever a finger lands
    // reads as a glitch rather than a response.
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <article id={id} onPointerMove={onPointerMove} className={className}>
      {/* Sits under the content and never takes the pointer. Invisible until
          hover, so a card that was never hovered carries no stale position. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(22rem circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--fg) 6%, transparent), transparent 70%)",
        }}
      />
      {children}
    </article>
  );
}
