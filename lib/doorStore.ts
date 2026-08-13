"use client";

import { create } from "zustand";

/**
 * Which door the viewer has gone through, if any.
 *
 * Entering is a deliberate act with a camera move attached, so it needs to be
 * shared state rather than something local to a door: the rig drives the
 * flight, the timeline reveals itself, and the close control has to be able to
 * reverse all of it.
 */
export type DoorId = "left" | "right";

type DoorStore = {
  /** null while still outside; set once a door has been entered. */
  entered: DoorId | null;
  /**
   * 0 outside, 1 fully through. Eased by the rig each frame rather than set
   * directly, so the transition is a flight rather than a cut.
   */
  enter: (id: DoorId) => void;
  exit: () => void;
};

export const useDoorStore = create<DoorStore>((set) => ({
  entered: null,
  enter: (id) => {
    if (useDoorStore.getState().entered === id) return;
    set({ entered: id });
    /*
     * Move the page to the timeline section as well as the camera.
     *
     * The section sits a full viewport below the doors, so entering without
     * this left ~1000px of scrolling during which its trigger had not started
     * and the camera sat still. Jumping there means the very next wheel tick
     * advances the traverse.
     *
     * Done after set() and deferred two frames: the section has no height
     * until the state lands and React has re-rendered, so the target does not
     * exist yet at the moment of the call. Kept out of the set() callback —
     * that runs during state computation, where side effects do not belong.
     */
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => scrollToTimeline());
    }
  },
  exit: () => {
    if (useDoorStore.getState().entered === null) return;
    set({ entered: null });
    /*
     * Return the page to the doors as well as the camera. The timeline's
     * section collapses to nothing on exit and the reader is usually scrolled
     * well inside it — left alone the browser clamps to the new bottom of the
     * page, which is some way past the doors.
     */
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => requestAnimationFrame(scrollBackToDoors));
    }
  },
}));

/**
 * Scroll target the doors sit at, set by the scroll controller once its
 * triggers have been measured. Held here so the store can restore it without
 * reaching into the DOM itself.
 */
export const doorScroll = { y: 0 };

function lenis() {
  return (
    window as unknown as {
      __lenis?: {
        scrollTo: (y: number | HTMLElement, o?: object) => void;
        resize?: () => void;
      };
    }
  ).__lenis;
}

/**
 * Scroll to the timeline once it has actually opened.
 *
 * Polls rather than waiting a fixed number of frames: the section has no
 * height until React has re-rendered on the new state, and how many frames
 * that takes is not something to guess at — two was not enough, and any fixed
 * count would be a race. Bounded so a failure to open cannot spin forever.
 */
function scrollToTimeline(attempt = 0) {
  const el = document.querySelector("#timeline");
  const h = el?.getBoundingClientRect().height ?? 0;

  if (h < 100) {
    if (attempt < 30) requestAnimationFrame(() => scrollToTimeline(attempt + 1));
    return;
  }

  /*
   * The section's own top, which is exactly where "top top" begins.
   *
   * The earlier viewport offset here was compensating for a jump that was
   * being silently clamped — with the resize below in place the scroll lands,
   * and the offset overshot two-thirds of the way along the thread.
   */
  const y = window.scrollY + el!.getBoundingClientRect().top;

  /*
   * Resize Lenis before scrolling to it.
   *
   * Lenis caches the document height and clamps any target to it. The section
   * has only just gained 3240px, so without this the jump is silently clamped
   * back to the old maximum — the call is made, and scrollY does not move.
   */
  const l = lenis();
  l?.resize?.();
  if (l) l.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

function scrollBackToDoors() {
  // Lenis owns scrolling, so hand it the target rather than setting scrollTop
  // directly — a raw jump would be overwritten on its next tick.
  const l = lenis();
  if (l) l.scrollTo(doorScroll.y, { immediate: true });
  else window.scrollTo(0, doorScroll.y);
}
