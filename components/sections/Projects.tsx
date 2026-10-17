"use client";

import { useEffect, useRef } from "react";
import { PROJECTS } from "@/content/projects";
import { PUBLICATIONS } from "@/content/publications";
import { Chip } from "@/components/ui/Chip";
import { MetricCounter } from "@/components/ui/MetricCounter";
import { ScrambleText } from "@/components/ScrambleText";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TrophyMarquee } from "@/components/TrophyMarquee";
import { ProjectGlyph } from "@/components/canvas/ProjectGlyph";
import { subscribe } from "@/lib/motion/scrollDirector";

/**
 * Projects, in the two tiers the content module declares — the selected tier
 * as a stacked deck (plan §3, "index + stacked acts").
 *
 * The deck is the one section at `max-w-6xl` (the rhythm rule keeps everything
 * else at 3xl; a two-column sticky layout cannot exist inside 48rem of text
 * measure, which is why the plan carves this exception). Left, a sticky index
 * rail; right, the acts. At `lg` and above, and only once armed, each act
 * sticks at 6rem inside the flow container, so the cards physically stack the
 * way the plan asks; an outgoing act reads its own cover fraction from the
 * ScrollDirector — how far the next card has travelled over it — and writes it
 * to its own `--p`, which CSS spends on a slight scale-down and a theme-aware
 * dim. Below `lg`, under reduced motion, and without JS the same markup is a
 * plain stack of cards and a static two-column list. That is the whole house
 * contract restated: the server HTML is the finished page; arming only ever
 * takes motion away from it, never content.
 *
 * No React state participates in any of this. The scroll work writes `--p` and
 * a `data-out` flag directly, the rail's active row is written by one
 * IntersectionObserver, and the component renders exactly once — the Timeline
 * section is the canonical precedent for the shape of this effect.
 *
 * Array order from content/projects.ts is display order in both tiers — no
 * sorting here to disagree with it.
 */

/** The sticky shelf (globals.css `top` for [data-act]), in CSS pixels. */
const SHELF_PX = 96; // 6rem

/** Where a rail click parks an act's top edge: the shelf plus breathing room
 *  clear of the sticky header. Matches the acts' `scroll-mt` utility, which
 *  is what the no-JS native anchor jump obeys. */
const TARGET_INSET_PX = 112; // 7rem

/**
 * The metrics band above the deck: the four headline numbers of the selected
 * work, each stated in at most one place with its project too (the plan's
 * "one depth place" rule — a glance layer, not a second source).
 */
const METRIC_BAND = [
  { value: "289", label: "parallel replays" },
  { value: "~800", label: "episodes/hr" },
  { value: "2,000+", label: "surveyed" },
  { value: "$30k", label: "credits" },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/**
 * The accent pill. Amber's meaning is "this was won", so it stays on awards
 * — and on the publication band below, which is the same kind of fact.
 */
function AwardBadge({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 inline-flex rounded-full border border-accent-medium bg-accent-soft px-3 py-1 text-xs text-accent">
      {children}
    </p>
  );
}

const LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg";

export function Projects() {
  const selected = PROJECTS.filter((p) => p.tier === "selected");
  const other = PROJECTS.filter((p) => p.tier === "other");

  const deckRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const deck = deckRef.current;
    const column = columnRef.current;
    const rail = railRef.current;
    if (!deck || !column || !rail) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (reduceMotion.matches) return;

    const acts = Array.from(deck.querySelectorAll<HTMLElement>("[data-act]"));
    // With nothing to stack there is no deck — leave the plain flow alone.
    if (acts.length < 2) return;

    // Arming is what unlocks the stacking CSS ([data-deck][data-armed]
    // selectors in globals.css); it is a DOM attribute, not state.
    deck.dataset.armed = "true";

    // The stacking layout only exists at lg and up (a media query owns the
    // position:sticky); below it, --p would be written into a void.
    const stacked = window.matchMedia("(min-width: 64rem)");

    // --- rail: active row ----------------------------------------------------
    //
    // A band from the shelf down to 45% of the viewport height; several acts
    // sit inside it while stacked, and the last one in DOM order is by
    // construction the card on top of the pile — which is the act being read.
    const rows = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-rail-row]"),
    );
    const covered = acts.map(() => false);
    let active = -1;

    function mark(index: number) {
      if (index === active) return;
      if (active >= 0 && rows[active]) {
        delete rows[active].dataset.on;
        rows[active].removeAttribute("aria-current");
      }
      active = index;
      if (index >= 0 && rows[index]) {
        rows[index].dataset.on = "true";
        rows[index].setAttribute("aria-current", "true");
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = acts.indexOf(entry.target as HTMLElement);
          if (i >= 0) covered[i] = entry.isIntersecting;
        }
        let last = -1;
        for (let i = 0; i < covered.length; i++) {
          if (covered[i]) last = i;
        }
        mark(last);
      },
      { rootMargin: `-${SHELF_PX}px 0px -55% 0px` },
    );
    for (const act of acts) io.observe(act);

    // --- rail: activation ----------------------------------------------------
    //
    // The acts are sticky, so scrollIntoView is the wrong primitive for them:
    // a stuck act reports a viewport-anchored rect, and "bring this rect into
    // view" becomes a no-op exactly when the reader wants to un-stack. What a
    // click wants is the act's *flow* position, and offsetTop inside the
    // (positioned, never-stuck) acts column states it independently of any
    // current stickiness.
    function onRailClick(e: MouseEvent) {
      const link = (e.target as Element).closest("a[href^='#act-']");
      if (!link) return;
      const id = link.getAttribute("href")!.slice(1);
      const act = document.getElementById(id);
      if (!act) return;
      e.preventDefault();
      const y =
        window.scrollY +
        column!.getBoundingClientRect().top +
        act.offsetTop -
        TARGET_INSET_PX;
      window.scrollTo({
        top: Math.max(y, 0),
        // Re-read live, not the setup-time gate: a visitor who turns motion
        // on mid-session still gets a click that respects whatever is set
        // now.
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
      // The hash stays the shareable address for this act; replaceState
      // because a back-and-forward tour through one section is noise.
      history.replaceState(null, "", `#${id}`);
    }
    rail.addEventListener("click", onRailClick);

    // --- acts: cover progress --------------------------------------------------
    //
    // For act i: 0 when the next card's top edge touches this act's bottom,
    // 1 when it reaches this act's top — the fraction of the card physically
    // covered. While act i is stuck its bottom is fixed at the shelf, so the
    // number only moves as the next card arrives, and scrolling up reverses it
    // for free. The last act is never covered and never dims.
    const lastP = acts.map(() => "");

    const unsubscribe = subscribe(() => {
      // One cheap rect decides whether there is any deck on screen at all;
      // while scrolling through the rest of the page this loop costs nothing.
      const deckRect = deck!.getBoundingClientRect();
      if (
        !stacked.matches ||
        deckRect.bottom < -50 ||
        deckRect.top > window.innerHeight + 50
      ) {
        return;
      }

      for (let i = 0; i < acts.length - 1; i++) {
        const a = acts[i].getBoundingClientRect();
        const b = acts[i + 1].getBoundingClientRect();
        let p = (a.bottom - b.top) / Math.max(a.height, 1);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        const s = p.toFixed(3);
        if (s === lastP[i]) continue;
        lastP[i] = s;
        acts[i].style.setProperty("--p", s);
        // The transform/filter live on a [data-out] gate so an act at rest
        // carries no compositing cost at all — an identity scale() and a
        // brightness(1) would each still promote a layer, on every card,
        // forever.
        if (p > 0) acts[i].dataset.out = "true";
        else delete acts[i].dataset.out;
      }
    });

    return () => {
      delete deck.dataset.armed;
      unsubscribe();
      io.disconnect();
      rail.removeEventListener("click", onRailClick);
    };
  }, []);

  return (
    <section id="projects" className="border-t border-line px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading label="Selected work" title="Projects" />

        <TrophyMarquee />

        {/* The count-up band: pills, mono, tabular — the same data-type voice
            as the rail and the periods. */}
        <ul
          className="mt-8 flex flex-wrap items-center gap-2"
          aria-label="Headline numbers across the selected work"
        >
          {METRIC_BAND.map((metric) => (
            <li key={metric.label}>
              <MetricCounter value={metric.value} label={metric.label} />
            </li>
          ))}
        </ul>

        <div
          ref={deckRef}
          data-deck
          className="mt-14 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-x-16"
        >
          {/* Index rail. Sticky at lg; below lg a static two-column list —
              there is nothing to index while the cards are a plain stack. */}
          <nav
            aria-label="Selected projects"
            className="mb-8 lg:sticky lg:top-24 lg:mb-0"
          >
            <ol
              ref={railRef}
              className="grid grid-cols-2 gap-x-4 gap-y-1 lg:flex lg:flex-col lg:gap-y-0"
            >
              {selected.map((project, i) => (
                <li key={project.id}>
                  <a
                    data-rail-row
                    href={`#act-${project.id}`}
                    className="flex min-w-0 items-baseline gap-2 rounded-md px-2 py-1.5 -mx-2 transition-colors hover:bg-inset"
                  >
                    <span className="font-mono text-xs tabular-nums text-faint in-data-[on=true]:text-signal">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {/* Amber's meaning is "this was won" — the diamond marks
                        it before the name, where a reader's eye is. */}
                    {project.award && (
                      <span
                        aria-hidden="true"
                        className="text-[9px] leading-none text-accent"
                      >
                        ◆
                      </span>
                    )}
                    <span className="truncate text-sm text-muted in-data-[on=true]:text-fg">
                      {project.name}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* The acts. `relative` so each act's offsetTop is its flow distance
              inside this column — what a rail click scrolls to. */}
          <div ref={columnRef} className="relative min-w-0 space-y-4 lg:space-y-6">
            {selected.map((project, i) => (
              <div
                key={project.id}
                id={`act-${project.id}`}
                data-act
                className="scroll-mt-28"
              >
                <article
                  data-act-card
                  className="rounded-2xl border border-line bg-raised p-6 shadow-e2 sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium tracking-[-0.01em]">
                        {/* The decode happens here, in mono, where a glyph
                            swap costs zero layout shift; the section heading
                            itself stays plain. */}
                        <ScrambleText
                          text={`${String(i + 1).padStart(2, "0")} — ${project.name}`}
                          className="font-mono tabular-nums"
                        />
                      </h3>
                      <p className="mt-1 font-mono text-xs tabular-nums text-faint">
                        {project.period}
                      </p>
                    </div>

                    {/* The emblem plate: the portrait's wave engine at 96px,
                        seeded from this project's own data. */}
                    <div data-glyph-plate className="shrink-0 self-start">
                      <ProjectGlyph
                        id={project.id}
                        stack={project.stack}
                        period={project.period}
                        metrics={project.metrics}
                        className="block"
                      />
                    </div>
                  </div>

                  {project.role && (
                    <p className="mt-1 text-xs text-faint">{project.role}</p>
                  )}

                  <p className="mt-1.5 text-muted">{project.summary}</p>

                  {project.award && <AwardBadge>{project.award}</AwardBadge>}

                  {/* The numbers first: a reader who never reaches the bullets
                      still gets what the project did. */}
                  {project.metrics && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {project.metrics.map((metric) => (
                        <Chip key={metric.label}>
                          <span className="font-medium text-fg tabular-nums">
                            {metric.value}
                          </span>{" "}
                          {metric.label}
                        </Chip>
                      ))}
                    </div>
                  )}

                  <ul className="mt-5 space-y-2">
                    {project.detail.map((line) => (
                      <li
                        key={line}
                        className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {project.stack.map((s) => (
                      <Chip key={s}>{s}</Chip>
                    ))}
                  </div>

                  {project.links.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-5 border-t border-line pt-5">
                      {project.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className={LINK_CLASS}
                        >
                          {link.label} <ArrowIcon />
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Other work and the publication band return to the 3xl measure —
            they are rows and a credit, not a two-column layout. */}
        <div className="mt-16 max-w-3xl">
          <h3 className="text-xs tracking-[0.14em] text-faint uppercase">
            Other work
          </h3>

          <div>
            {other.map((project) => (
              <div key={project.id} className="border-t border-line py-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <h4 className="font-medium">{project.name}</h4>
                  <span className="text-xs text-faint">{project.period}</span>
                  {project.award && (
                    <span className="inline-flex rounded-full border border-accent-medium bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
                      {project.award}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {project.summary}
                </p>

                {project.links.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-4">
                    {project.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
                      >
                        {link.label} <ArrowIcon />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Publication band. Tinted with the award idiom because a paper is
              the same kind of fact as a win: earned, verifiable, external. */}
          {PUBLICATIONS.map((pub) => (
            <div
              key={pub.id}
              className="mt-14 rounded-2xl border border-accent-medium bg-accent-soft p-5 sm:p-6"
            >
              <p className="text-xs tracking-[0.14em] text-accent uppercase">
                Publication
              </p>

              <h3 className="mt-2 leading-snug font-medium">
                <a
                  href={pub.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  {pub.title}
                </a>
              </h3>

              <p className="mt-1.5 text-sm text-muted">
                {pub.authors} <span className="text-faint">— co-authored</span>
              </p>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {pub.summary}
              </p>

              <div className="mt-4">
                <a
                  href={pub.href}
                  target="_blank"
                  rel="noreferrer"
                  className={LINK_CLASS}
                >
                  Paper ({pub.venue}) <ArrowIcon />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
