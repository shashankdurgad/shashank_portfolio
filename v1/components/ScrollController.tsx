"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { scroll } from "@/lib/scrollStore";
import { doorScroll, useDoorStore } from "@/lib/doorStore";

gsap.registerPlugin(ScrollTrigger);

/**
 * Owns smooth scrolling and publishes progress into the mutable scroll store.
 *
 * Nothing here calls setState — ScrollTrigger writes plain numbers that the
 * R3F Rig reads in useFrame, keeping React out of the per-frame path.
 */
export function ScrollController() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: skip Lenis entirely, but still publish progress so any
    // scroll-linked UI stays correct.
    const lenis = reduced
      ? null
      : new Lenis({ smoothWheel: true, lerp: 0.1, wheelMultiplier: 0.9 });

    if (lenis) {
      /*
       * Exposed so the door store can restore the scroll position on exit.
       * Lenis owns scrolling, so setting scrollTop directly would be undone on
       * its next tick — the instance itself has to be told.
       */
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // Route in-page anchors through Lenis, or native jumps fight the
      // smoothed scroll and land in the wrong place.
      const onClick = (e: MouseEvent) => {
        const anchor = (e.target as HTMLElement)?.closest?.('a[href^="#"]');
        const href = anchor?.getAttribute("href");
        if (!href || href === "#") return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: 0, duration: 1.1 });
      };
      document.addEventListener("click", onClick);

      const trigger = ScrollTrigger.create({
        trigger: "#main",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          scroll.progress = self.progress;
        },
      });

      // Separate trigger for the morph region: its 0..1 maps to the four
      // stages, independent of overall page progress.
      const morphEl = document.querySelector("#morph");
      const morphTrigger = morphEl
        ? ScrollTrigger.create({
            trigger: morphEl,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => {
              scroll.morph = self.progress * 2;
            },
          })
        : null;

      /*
       * Same pattern as the morph region: its own 0..1, scrubbed.
       *
       * The timeline section has no height until a door is entered, so this
       * trigger measures zero at mount. ScrollTrigger.refresh() below re-reads
       * it once the section opens; without that the traverse would never
       * advance, because the trigger would still believe it had no extent.
       */
      const timelineEl = document.querySelector("#timeline");
      const timelineTrigger = timelineEl
        ? ScrollTrigger.create({
            trigger: timelineEl,
            /*
             * The traverse spans the section's own scrollable extent.
             *
             * "top top"/"bottom bottom" left a viewport-high dead zone at the
             * start: entry scrolls the reader to the section's top, but that
             * pair does not begin until the top has reached the top of the
             * screen — which is the same position, so the first ~1000px of
             * scrolling did nothing. Measuring from where the section starts
             * to one viewport before its end makes the very first wheel tick
             * advance the camera.
             */
            start: "top top",
            end: () => `+=${(timelineEl as HTMLElement).offsetHeight - window.innerHeight}`,
            scrub: true,
            onUpdate: (self) => {
              scroll.timeline = self.progress;
            },
          })
        : null;

      /*
       * Re-measure whenever a door is entered or left: the timeline section
       * changes height between 0 and 360vh, and every trigger below it shifts
       * with it.
       */
      /*
       * While inside a door, scrolling cannot go back past where the timeline
       * begins.
       *
       * Without this, scrolling up unwinds the morph as well: the eyes reform
       * and the explosion replays while the timeline is still drawn, so two
       * scenes occupy the frame at once. Leaving is a deliberate act with a
       * flight attached, so the Back control has to be the only way out.
       */
      const clampFloor = () => {
        const entered = useDoorStore.getState().entered;
        if (!entered) return;
        const el = document.querySelector(entered === "right" ? "#hall" : "#timeline");
        if (!el) return;
        const floor = window.scrollY + el.getBoundingClientRect().top;
        if (window.scrollY < floor - 1) {
          lenis?.scrollTo(floor, { immediate: true, force: true });
        }
      };
      lenis?.on("scroll", clampFloor);

      /*
       * Where the doors sit, recorded before entering so exit can return here.
       * Read at the moment of entry rather than measured up front: the page
       * height changes when the timeline opens, so a value captured at mount
       * would be stale.
       */
      const unsubscribe = useDoorStore.subscribe((state, prev) => {
        if (state.entered && !prev.entered) doorScroll.y = window.scrollY;
        requestAnimationFrame(() => ScrollTrigger.refresh());
      });

      return () => {
        lenis?.off("scroll", clampFloor);
        unsubscribe();
        document.removeEventListener("click", onClick);
        timelineTrigger?.kill();
        morphTrigger?.kill();
        trigger.kill();
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll.progress = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
