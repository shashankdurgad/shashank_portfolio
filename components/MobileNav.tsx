"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/mini";

/**
 * The mobile navigation sheet.
 *
 * A native <dialog> driven by showModal(): focus containment, the inert
 * backdrop, Esc and the modal semantics come from the platform rather than a
 * hand-rolled overlay — which is what makes this small enough to keep. It is
 * server-rendered in its closed state; opening is purely a user action, so a
 * JS-less visitor simply never sees it (the footer always carries the same
 * destinations as plain links).
 *
 * Enter/exit uses motion's mini DOM entry (WAAPI underneath) — the only place
 * the sanctioned `motion` dependency is allowed, per the plan's motion
 * architecture. Everything else on this page is CSS.
 */

type Item = { href: string; label: string };

/** Sheet travel time in seconds; 0 under reduced motion (still commits styles). */
function sheetDuration(): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 0.2;
}

export function MobileNav({
  items,
  className,
}: {
  items: readonly Item[];
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Mirror of dialog.open for the imperative handlers — a ref, not state,
  // because the handlers run inside animation callbacks where state would be
  // a frame stale. React's `open` below only exists for aria-expanded.
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);
  // Body overflow taken over on open, handed back on close.
  const savedOverflow = useRef<string | null>(null);

  /*
   * If the component unmounts with the sheet open (shouldn't happen today,
   * but the lock is global and must not outlive its owner), hand the page's
   * scroll back.
   */
  useEffect(() => {
    return () => {
      if (savedOverflow.current !== null) {
        document.body.style.overflow = savedOverflow.current;
        savedOverflow.current = null;
      }
    };
  }, []);

  function openMenu() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    /*
     * Park the sheet above the viewport *before* showModal() so the first
     * painted frame is already the animation's first keyframe — otherwise the
     * dialog appears in its final place for one frame and then jumps.
     */
    dialog.style.opacity = "0";
    dialog.style.transform = "translateY(-100%)";
    openRef.current = true;
    dialog.showModal();
  }

  function closeMenu() {
    const dialog = dialogRef.current;
    if (!dialog || !openRef.current) return;
    openRef.current = false;

    // v11's playback controls are thenable — resolving when the exit settles.
    animate(
      dialog,
      { opacity: 0, y: "-100%" },
      { duration: sheetDuration(), ease: "easeIn" },
    ).then(() => {
      // The animation commits inline opacity/transform; close() takes the
      // element out of flow anyway, but re-open resets both explicitly.
      if (dialogRef.current?.open) dialogRef.current.close();
    });
  }

  /** Tab cycling stays inside the sheet; the platform handles Esc's keypress,
   *  we handle its consequence (see onCancel). */
  function onKey(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab" || !openRef.current) return;
    const dialog = e.currentTarget;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || !dialog.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  /*
   * `toggle` fires whenever dialog.open flips, from any path — showModal,
   * close(), even devtools. Centralising the side effects here means the
   * scroll lock, the focus handoff and the enter animation can never disagree
   * about whether the sheet is open.
   */
  function onToggle() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setOpen(dialog.open);

    if (dialog.open) {
      savedOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      animate(
        dialog,
        { opacity: [0, 1], y: ["-100%", "0%"] },
        { duration: sheetDuration(), ease: "easeOut" },
      );
      // Land focus on the first destination, not the close button.
      dialog.querySelector<HTMLElement>("nav a")?.focus();
    } else {
      if (savedOverflow.current !== null) {
        document.body.style.overflow = savedOverflow.current;
        savedOverflow.current = null;
      }
      // Return focus to the trigger, per the dialog authoring contract —
      // otherwise keyboard users lose their place in the header.
      buttonRef.current?.focus();
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-haspopup="dialog"
        aria-label="Open navigation"
        className={`grid size-11 place-items-center rounded-full border border-line text-muted transition-colors hover:text-fg [&_svg]:size-5 ${className ?? ""}`}
      >
        {/* Three rules, one hairline each — the grid language, reduced to an
            icon. */}
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path strokeLinecap="round" d="M3 6h14M3 10h14M3 14h9" />
        </svg>
      </button>

      <dialog
        id="mobile-nav"
        ref={dialogRef}
        aria-label="Site navigation"
        aria-modal="true" /* showModal implies it; state it for older AT anyway. */
        onCancel={(e) => {
          // Native Esc would close without exit animation, scroll unlock or
          // focus restore — veto it and run the proper path.
          e.preventDefault();
          closeMenu();
        }}
        onToggle={onToggle}
        onKeyDown={onKey}
        onClick={(e) => {
          // Clicks on the backdrop target the dialog element itself; anything
          // inside targets a descendant.
          if (e.target === e.currentTarget) closeMenu();
        }}
        /* className rationale: preflight zeroes the UA border, so border-b
           alone is honest about which edge is drawn. */
        className="fixed inset-x-0 top-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto border-b border-line bg-overlay p-0 text-fg shadow-e3 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-3xl px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="flex h-16 items-center justify-between">
            <p className="font-mono text-[11px] tracking-[0.18em] text-faint uppercase">
              Menu
            </p>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation"
              className="grid size-11 place-items-center rounded-full border border-line text-muted transition-colors hover:text-fg [&_svg]:size-4"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          <nav aria-label="Sections">
            <ul>
              {items.map((item, i) => (
                <li key={item.href}>
                  {/*
                    Anchors close the sheet but keep their default jump —
                    preventDefault here would trade the scroll for nothing.
                  */}
                  <a
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-14 items-center justify-between border-t border-line text-lg"
                  >
                    {item.label}
                    <span className="font-mono text-xs text-faint tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
