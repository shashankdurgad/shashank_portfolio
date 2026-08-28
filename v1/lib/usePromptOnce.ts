"use client";

import { useEffect, useState } from "react";

/**
 * A prompt that shows once and never returns.
 *
 * Latching matters: these are instructions, and an instruction that reappears
 * after the reader has already followed it reads as a fault. The naive version
 * — deriving visibility from current scroll — brings the prompt back whenever
 * the reader returns to the top, and clearing it on unmount brings it back on
 * every re-entry to a section.
 *
 * `poll` is called on scroll and should report whether the reader has moved
 * far enough for the prompt to have done its job.
 */
export function usePromptOnce(active: boolean, poll: () => boolean): boolean {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active || dismissed) return;

    const check = () => {
      if (poll()) setDismissed(true);
    };
    window.addEventListener("scroll", check, { passive: true });
    // Also check once on activation: the reader may already be past the
    // threshold when the section opens, in which case the prompt is stale
    // before it has ever been seen.
    check();

    return () => window.removeEventListener("scroll", check);
    // `poll` is a fresh closure each render; depending on it would re-bind the
    // listener every frame the parent re-renders for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dismissed]);

  return !dismissed;
}
