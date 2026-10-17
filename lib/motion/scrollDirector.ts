/**
 * One scroll listener for the whole page.
 *
 * Every scroll-driven widget on the site (header hide/reveal, the document
 * progress line, the Timeline rail, later the portrait dissolve) wants the same
 * three facts — direction, document progress, scroll offset. Registering a
 * passive listener per widget duplicates the cost and desynchronises the
 * readers; one singleton batched to the frame keeps them all in step at the
 * price of a single callback per frame.
 *
 * The loop *parks* roughly a frame-budget after the last scroll event instead
 * of spinning forever: a perpetual rAF loop keeps the main thread compiling and
 * painting work that nothing is watching, and it competes with input handling —
 * exactly what an INP budget on a mid-tier phone punishes. The grace window
 * keeps the loop alive a few frames past the final event so trailing updates
 * (an anchor jump, a resize settling) still land before it idles.
 *
 * Subscribers receive one shared, reused info object. Treat it as read-only and
 * copy anything you need to retain — that is what makes the hot path allocation
 * free (no per-frame objects, closures or arrays).
 */

export type ScrollInfo = {
  /** Direction of the most recent movement. */
  dir: "up" | "down";
  /** Scroll offset as a fraction of the scrollable document, 0..1. */
  docP: number;
  /** Last scrollY in CSS pixels. */
  lastY: number;
};

type Subscriber = (info: ScrollInfo) => void;

/** How long past the last scroll event the loop stays alive. */
const PARK_AFTER_MS = 70;

const subscribers = new Set<Subscriber>();

/** Reused across every notification — see the module note above. */
const info: ScrollInfo = { dir: "down", docP: 0, lastY: 0 };

let lastY = 0;
// An event arrived since the last flush and has not been measured yet.
let dirty = false;
// Timestamp of the most recent scroll/resize event, for the park decision.
let lastEventAt = 0;
let raf = 0;
let attached = false;

function measure() {
  dirty = false;

  const y = window.scrollY;
  const scrollable =
    document.documentElement.scrollHeight - window.innerHeight;

  info.dir = y >= lastY ? "down" : "up";
  info.lastY = y;
  // A page shorter than the viewport has no progress to report.
  info.docP = scrollable > 0 ? Math.min(Math.max(y / scrollable, 0), 1) : 0;
  lastY = y;
}

function tick(now: number) {
  raf = 0;
  if (dirty) {
    measure();
    // Pass the shared object; subscribers copy what they must keep.
    subscribers.forEach((fn) => fn(info));
  }
  // Keep looping while events keep arriving, plus the grace window; then park.
  if (dirty || now - lastEventAt < PARK_AFTER_MS) {
    raf = requestAnimationFrame(tick);
  }
}

function kick() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function onEvent() {
  dirty = true;
  lastEventAt = performance.now();
  kick();
}

function listen() {
  if (attached) return;
  attached = true;
  // Passive: this must never block scrolling, even to preventDefault.
  window.addEventListener("scroll", onEvent, { passive: true });
  window.addEventListener("resize", onEvent, { passive: true });
}

function maybeIdle() {
  if (subscribers.size > 0 || !attached) return;
  attached = false;
  window.removeEventListener("scroll", onEvent);
  window.removeEventListener("resize", onEvent);
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  dirty = false;
}

/**
 * Listen to the director, starting the shared listener if this is the first
 * subscriber. The subscriber is called once synchronously so a widget can paint
 * its correct initial position, then once per frame while the page moves.
 * Returns the unsubscribe; the listeners detach when the last one leaves.
 */
export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  listen();

  // Seed from the current position — widgets mount mid-page on navigation.
  measure();
  fn(info);

  return () => {
    subscribers.delete(fn);
    maybeIdle();
  };
}
