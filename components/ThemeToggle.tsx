"use client";

import { useSyncExternalStore } from "react";

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
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const scheme = window.matchMedia("(prefers-color-scheme: light)");
  scheme.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    scheme.removeEventListener("change", onChange);
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

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
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

  return (
    <button
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
