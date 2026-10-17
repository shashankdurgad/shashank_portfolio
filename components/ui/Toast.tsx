"use client";

import { animate } from "motion/mini";

/**
 * A single bottom-centre pill that says what just happened ("copied").
 *
 * One module-owned element rather than a context or a per-call mount: the page
 * has exactly one transient message to show, so the toast is a service you
 * call, not a component you render. `role="status"` + `aria-live="polite"`
 * make the text swap an announcement for screen readers; sighted users get the
 * pill sliding up from the bottom safe area.
 *
 * The element is created on first use — it is JS-only garnish, and there is
 * nothing for server HTML to render.
 */

const DISMISS_MS = 2400;

function dur(seconds: number) {
  // WAAPI ignores the global reduced-motion CSS override, so it is honoured
  // here at the call site instead: duration 0 still runs and still commits.
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : seconds;
}

let el: HTMLElement | undefined;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;

function ensure(): HTMLElement {
  el ??= Object.assign(document.createElement("div"), {
    role: "status",
    ariaLive: "polite",
    // E3 floating: overlay + blur + the deep shadow, mono text like all data.
    className:
      "pointer-events-none fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-100 mx-auto w-fit max-w-[calc(100vw-2rem)] truncate rounded-full border border-line bg-overlay px-4 py-2 font-mono text-xs text-fg shadow-e3 backdrop-blur-xl",
  });
  if (!el.isConnected) document.body.append(el);
  return el;
}

export function showToast(message: string) {
  const node = ensure();
  clearTimeout(dismissTimer);
  node.textContent = message;

  // Re-showing mid-animation needs no cancel logic: animate() stops the
  // previous animation of the same property on the same element first.
  animate(
    node,
    { opacity: [0, 1], y: ["12px", "0px"] },
    { duration: dur(0.16), ease: "easeOut" },
  );

  dismissTimer = setTimeout(() => {
    // The mini animator commits the final keyframe to inline style, so
    // opacity 0 persists without an explicit finish handler.
    animate(node, { opacity: 0 }, { duration: dur(0.2), ease: "easeIn" });
  }, DISMISS_MS);
}
