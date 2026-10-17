"use client";

import { useEffect, useRef } from "react";
import { observeReveal } from "@/lib/motion/reveal";

/**
 * A metric that counts up to the number the server already printed.
 *
 * The final value is the server HTML — this component is only ever allowed to
 * animate *toward* it, never to gate it. When the counter first meaningfully
 * enters view (delegated to lib/motion/reveal.ts, same arrangement as
 * ScrambleText: `data-reveal` as the observer's selector, no `.reveal` class),
 * the numeric prefix runs once from 60% to 100% over 800ms with an ease-out,
 * then hands the text node back as the exact rendered string.
 *
 * 60% is the floor on purpose: starting near zero turns a supporting figure
 * into a slot machine, and a number arriving from a plausible neighbour reads
 * as instrumentation correcting itself — which is what the plan's "instrument"
 * language wants the site to feel like.
 *
 * Only values with a leading number animate: "~800", "2,000+" and "$30k" all
 * have one under any prefix of non-digits; "5 → 25 mm" and "arXiv" do not, and
 * they render and stay. Reduced motion means the same — the effect is never
 * armed at all.
 *
 * The value's text node is written directly because this component re-renders
 * exactly never (no state, props are content constants), which is the same
 * bargain the ScrollDirector consumers make: React writes the DOM until
 * hydration, after which the animation owns what it owns.
 */

/** Duration of the single count-up. */
const DURATION_MS = 800;

/** Where the count starts, as a fraction of the final value. */
const START = 0.6;

/**
 * Leading-number parse: any prefix of non-digits, the number itself (digit
 * grouping kept as written), the remainder ("+", "k", " mm"…). A value with no
 * digit at all yields null and never observes, never animates.
 */
const LEADING_NUMBER = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/;

function format(raw: number, digits: string): string {
  // Grouping follows the content file's own notation ("2,000+" is en-US
  // grouped, "289" is not), so the animation can never print a number styled
  // differently from the final value it resolves to.
  if (!digits.includes(",")) return String(raw);
  return raw.toLocaleString("en-US");
}

export function MetricCounter({
  value,
  label,
}: {
  /** Final value as the content states it: "2,000+". */
  value: string;
  /** What the number counts, in the pill's own words. */
  label: string;
}) {
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;
    const parsed = LEADING_NUMBER.exec(value);
    if (!parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const [, prefix, digits, suffix] = parsed;
    const target = parseFloat(digits.replace(/,/g, ""));
    // A "0" has nothing under it to count from; render and leave.
    if (!(target > 0)) return;

    let raf = 0;

    function run() {
      const from = target * START;
      const t0 = performance.now();
      function frame(now: number) {
        const t = Math.min((now - t0) / DURATION_MS, 1);
        const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const v = Math.round(from + (target - from) * e);
        el!.textContent = prefix + format(v, digits) + suffix;
        if (t < 1) {
          raf = requestAnimationFrame(frame);
        } else {
          // The exact server string, byte for byte, whatever rounding did on
          // the way up — the end state is the content, not a computation.
          el!.textContent = value;
        }
      }
      raf = requestAnimationFrame(frame);
    }

    const stopReveal = observeReveal(el);
    const mo = new MutationObserver(() => {
      if (el!.dataset.inview !== "true") return;
      mo.disconnect();
      run();
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-inview"] });

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      stopReveal();
    };
  }, [value]);

  // Whether a leading number exists decides two things at once — the effect's
  // animation and whether the observer is asked to watch this node at all.
  const hasNumber = LEADING_NUMBER.test(value);

  return (
    // Chip's pill, reused for the metric band: same border, same inset ground,
    // a hair more breathing room for the tabular figures.
    <span className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-inset px-2.5 py-1 text-xs">
      <span
        ref={valueRef}
        // The animated text node keeps the final value as its accessible
        // name, so a reader mid-count-up still hears the truth.
        aria-label={value}
        data-reveal={hasNumber ? "true" : undefined}
        className="font-mono font-medium tabular-nums text-fg"
      >
        {value}
      </span>{" "}
      <span className="text-muted">{label}</span>
    </span>
  );
}
