"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { STOPS } from "@/lib/constants";
import { scroll } from "@/lib/scrollStore";

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
          scroll.section = Math.round(self.progress * (STOPS.length - 1));
        },
      });

      return () => {
        document.removeEventListener("click", onClick);
        trigger.kill();
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    }

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll.progress = max > 0 ? window.scrollY / max : 0;
      scroll.section = Math.round(scroll.progress * (STOPS.length - 1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
