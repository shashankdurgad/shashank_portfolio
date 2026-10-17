/**
 * The shared scroll-reveal observer.
 *
 * One IntersectionObserver for the whole page — elements carry `data-reveal`
 * (plus the `reveal` CSS utility) and get `data-inview` added when they cross
 * the threshold, at which point they are unobserved: reveals are one-way, an
 * element never re-hides.
 *
 * The bottom margin is pulled in by 12% so "in view" means *meaningfully* in
 * view, not merely peeking at the fold's edge — a row revealed as its top pixel
 * crosses the viewport bottom is half-cut when it matters.
 *
 * As everywhere else on this site, the server-rendered state is the finished
 * one: `data-inview` only ever unlocks the armed hidden state (see globals.css),
 * and without JS or under arming-off conditions nothing observes at all.
 */

let observer: IntersectionObserver | undefined;

function shared(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.inview = "true";
        // Once is enough — a revealed thing stays revealed.
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  return observer;
}

/**
 * Observe every `[data-reveal]` element under `root` (or the document).
 * Returns a cleanup that unobserves exactly this call's elements — the
 * observer itself is shared and survives, since an idle unobserved IO costs
 * nothing and tearing it down would strand other callers.
 */
export function observeReveal(root?: HTMLElement): () => void {
  const targets: HTMLElement[] = [];
  if (root?.matches("[data-reveal]")) targets.push(root);
  targets.push(
    ...(root ?? document).querySelectorAll<HTMLElement>("[data-reveal]"),
  );

  const io = shared();
  for (const el of targets) io.observe(el);

  return () => {
    for (const el of targets) io.unobserve(el);
  };
}
