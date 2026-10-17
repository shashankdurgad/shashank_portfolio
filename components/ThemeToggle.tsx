"use client";

import { useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";

/**
 * Runs before paint, inlined in <head>.
 *
 * Without this the document renders at the CSS default (dark) and then corrects
 * itself once React mounts, which is a visible white flash for anyone on light.
 * Reading localStorage here — synchronously, before first paint — is the only
 * way to avoid it; it cannot move into the component.
 *
 * Only an explicit stored choice sets the attribute. Absent one, the media query
 * in globals.css decides, so the OS preference keeps working.
 */
export const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path
        strokeLinecap="round"
        d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6 17 17M7 7 5.4 5.4"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z"
      />
    </svg>
  );
}

/**
 * The active theme, read from the DOM.
 *
 * The document element is the source of truth rather than React state: the
 * pre-paint script above may already have set it, and the toggle writes to it
 * directly. Subscribing to it keeps this component reflecting reality instead of
 * holding a second, divergent copy.
 *
 * The custom event exists for the view-transition path below: a MutationObserver
 * callback lands as a microtask, which is *after* startViewTransition has
 * captured the new snapshot, so the icon swap would miss the wipe and pop in
 * when it ends. Dispatching the listener synchronously inside the callback and
 * flushing it lets the snapshot catch the new icon too.
 */
const THEME_EVENT = "theme-change";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const scheme = window.matchMedia("(prefers-color-scheme: light)");
  scheme.addEventListener("change", onChange);
  document.addEventListener(THEME_EVENT, onChange);
  return () => {
    observer.disconnect();
    scheme.removeEventListener("change", onChange);
    document.removeEventListener(THEME_EVENT, onChange);
  };
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  // The server cannot know the visitor's theme, so it renders no icon at all
  // rather than guessing and hydrating mismatched.
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function applyTheme(next: Theme) {
    // Write to the DOM only — the store subscription above picks the change up
    // and re-renders. Keeping a useState copy in step with this would be a
    // second source of truth for no gain.
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode, or storage disabled. The toggle still works for this
      // page view; it just will not be remembered.
    }
  }

  function toggle() {
    if (!theme) return; // nothing to flip until the store has resolved a theme
    const next: Theme = theme === "light" ? "dark" : "light";

    // Feature-detected view transition (plan §1) with a circular clip wipe
    // growing from the button, 350ms (the keyframes live in globals.css).
    // Reduced motion takes the instant path — and the global RM block would
    // flatten the wipe anyway.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      applyTheme(next);
      return;
    }

    const root = document.documentElement;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // The circle must clear the farthest corner by the time it ends, or the
      // wipe visibly stops mid-screen.
      const r = Math.hypot(
        Math.max(cx, root.clientWidth - cx),
        Math.max(cy, root.clientHeight - cy),
      );
      root.style.setProperty("--vt-x", `${cx}px`);
      root.style.setProperty("--vt-y", `${cy}px`);
      root.style.setProperty("--vt-r", `${r}px`);
    }
    // The --vt-* properties deliberately stay set: harmless, and overwritten
    // at the start of the next toggle.

    doc.startViewTransition(() => {
      applyTheme(next);
      // Render subscribers synchronously so the new snapshot includes the
      // swapped icon. The MutationObserver will fire again as a microtask;
      // useSyncExternalStore compares snapshots, sees no change, and skips.
      flushSync(() => {
        document.dispatchEvent(new Event(THEME_EVENT));
      });
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${theme === "light" ? "dark" : "light"} theme` : "Switch theme"}
      className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:text-fg [&_svg]:size-4.5"
    >
      {/* Before mount, neither icon — an empty button is less wrong than a
          flipping one, and it holds its space so nothing shifts. */}
      {theme === "light" ? <MoonIcon /> : theme === "dark" ? <SunIcon /> : null}
    </button>
  );
}
