"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { id: "hero", label: "00" },
  { id: "about", label: "01" },
  { id: "experience", label: "02" },
  { id: "projects", label: "03" },
  { id: "skills", label: "04" },
  { id: "contact", label: "05" },
];

/**
 * Fixed section index. Uses IntersectionObserver rather than scroll maths so
 * it stays correct under Lenis' smoothed scrolling.
 */
export function Nav() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.25, 0.5], rootMargin: "-20% 0px -20% 0px" },
    );

    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Section navigation"
      className="fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex"
    >
      {LINKS.map((l) => {
        const on = active === l.id;
        return (
          <a
            key={l.id}
            href={`#${l.id}`}
            aria-current={on ? "true" : undefined}
            className="group flex items-center justify-end gap-2 font-mono text-[10px] tracking-[0.16em] transition-colors"
          >
            <span className={on ? "text-arc" : "text-ink-dim/50 group-hover:text-cyan"}>
              {l.label}
            </span>
            <span
              className={`h-px transition-all ${
                on ? "w-6 bg-arc" : "w-3 bg-line group-hover:w-5 group-hover:bg-cyan"
              }`}
            />
          </a>
        );
      })}
    </nav>
  );
}
