"use client";

import { useEffect, useRef } from "react";
import { PROFILE, NAV as PROFILE_NAV } from "@/content/profile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";
import { subscribe } from "@/lib/motion/scrollDirector";

/**
 * Header v2.
 *
 * Three behaviours ride the shared ScrollDirector: a 1px signal line at the
 * bottom edge tracking document progress, hide-on-scroll-down / show-on-
 * scroll-up, and the active-section link marker (that last one via its own
 * IntersectionObserver, since "which section am I in" is a geometry question,
 * not a scroll-offset one).
 *
 * All three write DOM attributes and custom properties directly — no React
 * state exists in the scroll path, per the house rule. Nothing arms unless the
 * client opts in after mount, and the hide behaviour additionally never engages
 * while something inside the header owns focus (a keyboard user mid-tab, or the
 * mobile sheet) or under reduced motion.
 */

/*
 * Nav lives in content/profile.ts — the page composition and the mobile sheet
 * read the same list, so a section can no longer exist in one place and be
 * missing from another.
 */
const NAV = PROFILE_NAV;

/** Travel before the header starts hiding — small jitters shouldn't trigger it. */
const HIDE_AFTER = 80;

export function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const hideCapable = !window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Arming is a DOM attribute, not state: it only gates CSS transitions.
    if (hideCapable) el.dataset.armed = "true";

    let hidden = false;
    let shown = -1; // last written --p, so unchanged frames write nothing
    // Scroll position the page settled at — load, or restore after reload.
    let restY = -1;

    const unsubscribe = subscribe((next) => {
      // Document progress line. setProperty still costs a style invalidation,
      // so skip it when the value has not moved (e.g. resize on a short page).
      if (next.docP !== shown) {
        shown = next.docP;
        el.style.setProperty("--p", next.docP.toFixed(3));
      }

      if (!hideCapable) return;

      /*
       * The very first delivery is the position the page *started* at (scroll
       * restoration included), and its reported direction is synthetic —
       * nobody scrolled yet. Hiding then would punish a reload in mid-page,
       * so hide decisions wait for real movement.
       */
      if (restY === -1) {
        restY = next.lastY;
        return;
      }
      if (next.lastY === restY) return;

      /*
       * Focus anywhere inside — a tabbed link, the sheet's close button — pins
       * the header open. Hiding a control set the visitor is actively using is
       * the one thing a hiding header must never do.
       */
      const wantsHidden =
        next.dir === "down" &&
        next.lastY > HIDE_AFTER &&
        !el.contains(document.activeElement);

      if (wantsHidden !== hidden) {
        hidden = wantsHidden;
        el.dataset.hidden = wantsHidden ? "true" : "false";
      }
    });

    return () => {
      unsubscribe();
      delete el.dataset.armed;
      delete el.dataset.hidden;
      el.style.removeProperty("--p");
    };
  }, []);

  /*
   * Active section. The observer band is the strip 15%–30% down the viewport;
   * whichever target section sits in it owns the nav, first-listed winning if
   * boundaries overlap. Links get data-active (signal underline) plus
   * aria-current so assistive tech hears it too.
   */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const links = NAV.map((item) => ({
      item,
      el: header.querySelector<HTMLAnchorElement>(`nav a[href="${item.href}"]`),
      section: document.querySelector<HTMLElement>(item.href),
    })).filter((entry) => entry.el && entry.section);

    const visible = new Set<string>();
    let current: string | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        const active = links.find((l) => visible.has(l.item.href.slice(1)));
        const href = active ? active.item.href : null;
        if (href === current) return;

        for (const link of links) {
          const on = link.item.href === href;
          if (on) link.el?.setAttribute("data-active", "true");
          else link.el?.removeAttribute("data-active");
          // aria-current must be absent, not "false" — the ARIA default is
          // "no current item here".
          if (on) link.el?.setAttribute("aria-current", "true");
          else link.el?.removeAttribute("aria-current");
        }
        current = href;
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );

    for (const { section } of links) io.observe(section!);
    return () => io.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-line bg-overlay backdrop-blur-md data-[armed=true]:transition-transform data-[armed=true]:duration-150 data-[armed=true]:ease-out data-[hidden=true]:-translate-y-full"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        <a href="#top" className="text-[15px] font-medium tracking-tight">
          {PROFILE.name}
        </a>

        <nav className="ml-auto hidden items-center gap-7 sm:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative text-sm text-muted transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:bg-signal after:scale-x-0 after:transition-transform after:duration-200 hover:text-fg data-[active=true]:text-fg data-[active=true]:after:scale-x-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:ml-0">
          {/* Mobile users lose the link row below sm, so the sheet becomes
              their nav — same destinations, index-numbered like the rail. */}
          <MobileNav items={NAV} className="sm:hidden" />
          <ThemeToggle />
          <a
            href={`mailto:${PROFILE.email}`}
            className="rounded-full bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] transition-opacity hover:opacity-88"
          >
            Get in touch
          </a>
        </div>
      </div>

      {/* Document progress: one signal hairline across the bottom border,
          scaled from the left by --p (registered <number>, initial 0 — so the
          server-rendered state is "no progress yet", which is true). */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-signal"
        style={{ transform: "scaleX(var(--p))" }}
      />
    </header>
  );
}
