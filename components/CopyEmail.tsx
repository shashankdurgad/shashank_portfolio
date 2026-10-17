"use client";

import { PROFILE } from "@/content/profile";
import { showToast } from "@/components/ui/Toast";

/**
 * Copy-the-address button, living next to the honest door.
 *
 * The button copies PROFILE.email; the mailto link beside it is deliberately
 * visible, not a hidden fallback — clipboard writes fail quietly in
 * permissions-blocked or insecure contexts, and a visitor who cannot paste
 * still has a working, one-tap path right there. Both render server-side; only
 * the copy gesture needs JS.
 */
export function CopyEmail({ className }: { className?: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      showToast("copied");
    } catch {
      // Denied, unsupported, or a transient failure — the mailto beside this
      // button is the recovery path, so there is nothing to announce.
    }
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <button
        type="button"
        onClick={copy}
        className="rounded-full border border-line bg-inset px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        {PROFILE.email}
      </button>
      <a
        href={`mailto:${PROFILE.email}`}
        className="text-sm text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg"
      >
        Email
      </a>
    </span>
  );
}
