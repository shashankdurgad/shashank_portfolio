/**
 * The trophy marquee: the five wins, on one scrolling line.
 *
 * Positioned above the project deck, where its job is quantity-of-proof at a
 * glance — the per-act cards carry the full, exact award lines, so this band
 * is intentionally the abbreviated telling, and its strings are its own
 * (marquee-width copy, not card copy: a marquee that quotes the cards
 * verbatim breaks when a card is reworded).
 *
 * The whole component is `aria-hidden`: every award on this line also exists
 * as real text on the awarding project's card, and screen-reader users should
 * hear it once, in place, not twice and on a loop.
 *
 * Mechanically this is pure CSS (see the `trophy-marquee` rules in
 * globals.css): the content is duplicated so `translateX(-50%)` loops
 * seamlessly, hover/focus pauses it, and under reduced motion the rules turn
 * the track into a static wrapped list — the wins stay visible, only the
 * motion goes. Reduced motion takes things away; it never does.
 */

/** Marquee-length strings; each ends conceptually in its ★ separator. */
const WINS = [
  "NVIDIA GTC Hack for Impact · Environment — 1st",
  "UCL BUILD AI — 1st → GTC trip",
  "Gemini 3 London — 2nd + $30k GCP",
  "BSA Demo Day — 1st",
  "FIRST Global — 2nd globally",
];

export function TrophyMarquee() {
  // Two identical copies; the track animates one copy's width and the seam
  // lands exactly where the second copy began.
  const copies = [0, 1];
  // Trailing separator per win keeps the seam rhythm identical to every
  // intra-copy gap.
  const items = copies.map(() => WINS);

  return (
    <div
      data-marquee
      aria-hidden="true"
      className="overflow-hidden border-y border-line py-3 font-mono text-sm text-muted"
    >
      <div data-marquee-track>
        {items.map((wins, copy) => (
          <span key={copy} data-marquee-copy className="whitespace-nowrap">
            {wins.map((win) => (
              <span key={win}>
                {win}
                <span className="px-4 text-accent">★</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
