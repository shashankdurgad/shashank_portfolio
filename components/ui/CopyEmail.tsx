"use client";

import { useState } from "react";
import { PROFILE } from "@/content/profile";

/**
 * The email as a button that copies itself.
 *
 * A mailto link alone fails for anyone without a desktop mail client, which on
 * a laptop is most people; copying always works. The mailto stays as the
 * fallback for when the clipboard API is refused.
 */
export function CopyEmail({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent<HTMLAnchorElement>) {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      e.preventDefault();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Let the mailto navigation go ahead.
    }
  }

  return (
    <a
      href={`mailto:${PROFILE.email}`}
      onClick={copy}
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label={`Copy email address ${PROFILE.email}`}
    >
      <span>{PROFILE.email}</span>
      <span
        aria-live="polite"
        className="font-mono text-[11px] text-faint transition-colors group-hover:text-fg"
      >
        {copied ? "copied ✓" : "copy"}
      </span>
    </a>
  );
}
