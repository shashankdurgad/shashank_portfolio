"use client";

import type { Trigger } from "./dialogueLines";

/**
 * What the eyes notice.
 *
 * A plain mutable object written by the frame loop and by a handful of window
 * listeners, for the same reason lib/scrollStore.ts is one: these change every
 * frame and only the frame loop reads them.
 *
 * Signals are split by where they come from. The `live` half is sampled from
 * the gaze system MorphField already runs, so noticing costs nothing beyond a
 * few comparisons. The `pending` half is set by event listeners and drained on
 * the next frame — events arrive between frames, and a trigger that fired at
 * the wrong moment in the frame would be lost.
 */

export const signals = {
  /** Pointer in NDC, mirrored from MorphField's own tracking. */
  x: 0,
  y: 0,
  /** True once the pointer has moved at all. Gaze holds its rest pose until. */
  seen: false,
  /** Seconds since the pointer last moved. */
  still: 0,
  /** Distance from the pointer to the eyes, in the field's local units. */
  toEyes: Infinity,
  /** |yaw| of the further-turned eye, against GAZE_LIMIT. */
  gaze: 0,
  /** Current lid closure, 0 open 1 shut. */
  blink: 0,
  /** Pointer speed in NDC units per second. */
  speed: 0,
};

/**
 * Triggers raised by event listeners since the last frame.
 *
 * A set rather than a queue: two `resize` events between frames are still one
 * thing worth remarking on.
 */
export const pending = new Set<Trigger>();

/** Raise an event-sourced trigger. Drained by the frame loop. */
export function raise(trigger: Trigger) {
  pending.add(trigger);
}

/**
 * Bind the window-level detectors.
 *
 * Returns a teardown. Everything here is passive and cheap; the expensive
 * detection (jitter, sweeps, dwell) happens in the frame loop against
 * `signals`, where the gaze data already lives.
 */
export function bindSignals(): () => void {
  /*
   * Away-and-back. Thirty seconds is the threshold for "you left" rather than
   * "you glanced at another tab" — below that, remarking on it is uncanny
   * rather than charming.
   */
  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = performance.now();
    } else if (hiddenAt && performance.now() - hiddenAt > 30_000) {
      raise("return");
      hiddenAt = 0;
    }
  };

  /*
   * Focus regained without the tab having been hidden — another window was on
   * top. Distinct from `return`, and deliberately lower priority: it is a
   * weaker signal, and both firing together should yield the stronger line.
   */
  let blurredAt = 0;
  const onBlur = () => {
    blurredAt = performance.now();
  };
  const onFocus = () => {
    if (blurredAt && performance.now() - blurredAt > 20_000 && !document.hidden) {
      raise("refocus");
    }
    blurredAt = 0;
  };

  /*
   * Pointer leaving the window. Raised on the way back in, not on the way out:
   * there is no one there to read it while the cursor is gone, and a bubble
   * that appeared in an empty room would simply be missed.
   */
  let leftAt = 0;
  const onLeave = (e: PointerEvent) => {
    // relatedTarget is null when the pointer genuinely exits the window, as
    // opposed to crossing between elements inside it.
    if (e.relatedTarget === null) leftAt = performance.now();
  };
  const onEnter = () => {
    if (leftAt && performance.now() - leftAt > 4_000) raise("cursorLeft");
    leftAt = 0;
  };

  /* Resize, debounced — a drag emits a continuous stream of these. */
  let resizeTimer = 0;
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => raise("resize"), 400);
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  document.addEventListener("pointerout", onLeave);
  document.addEventListener("pointerover", onEnter);
  window.addEventListener("resize", onResize, { passive: true });

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("pointerout", onLeave);
    document.removeEventListener("pointerover", onEnter);
    window.removeEventListener("resize", onResize);
    window.clearTimeout(resizeTimer);
  };
}

/* ------------------------------------------------------------------ */
/* Frame-loop detectors                                                */

/**
 * Motion history, for the detectors that need more than the current frame.
 *
 * Kept here rather than in `signals` because nothing outside this module has
 * any use for it.
 */
const motion = {
  /** Recent horizontal direction flips, with timestamps. */
  flips: [] as number[],
  /** Sign of the last horizontal step, and the position it was measured from. */
  lastDir: 0,
  lastX: 0,
  /** Where the current sweep started, and when. */
  sweepX: 0,
  sweepAt: 0,
  /** Dwell timers for the regions worth noticing. */
  eyeDwell: 0,
  blurbDwell: 0,
  /** Last blink value, for edge detection. */
  wasBlinking: false,
  /** Accumulated pointer travel, for the "i see you" remark. */
  travel: 0,
  /*
   * One-shot latches for the triggers whose condition stays true while the
   * pointer is still. Without these each pushes on every frame, monopolising
   * the priority contest and starving everything else.
   */
  dwellSaid: false,
  blurbSaid: false,
  idleSaid: false,
  idleDeepSaid: false,
  nudgeSaid: false,
  /** Highest morph reached, so a return to the top can be recognised. */
  peakMorph: 0,
};

/**
 * Dev-only view of the motion accumulators.
 *
 * Kept rather than deleted: every threshold in this file was set from traces
 * of these three numbers, and the next person to retune one will want the same
 * view. Stripped from production builds along with the hook that exposes it.
 */
export function sweepDebug() {
  return {
    span: +Math.abs(signals.x - motion.sweepX).toFixed(2),
    age: motion.sweepAt ? Math.round(performance.now() - motion.sweepAt) : -1,
    travel: +motion.travel.toFixed(2),
  };
}

export function resetMotion() {
  motion.flips.length = 0;
  motion.lastDir = 0;
  motion.lastX = 0;
  motion.sweepX = 0;
  motion.sweepAt = 0;
  motion.eyeDwell = 0;
  motion.blurbDwell = 0;
  motion.wasBlinking = false;
  motion.travel = 0;
  motion.dwellSaid = false;
  motion.blurbSaid = false;
  motion.idleSaid = false;
  motion.idleDeepSaid = false;
  motion.nudgeSaid = false;
  motion.peakMorph = 0;
}

/** Pointer within this distance of the eyes counts as dwelling on them. */
const EYE_RADIUS = 1.1;

/** Seconds of stillness before the two idle tiers fire. */
const IDLE_AT = 8;
const IDLE_DEEP_AT = 25;

/** Seconds dwelling in a region before it counts as reading it. */
const DWELL_AT = 4;

/**
 * Collect every trigger true of this frame.
 *
 * Returns them all rather than picking one — the caller resolves priority, so
 * that the choice is made by the table in dialogueLines and not by the order
 * these ifs happen to be written in.
 */
export function detect(delta: number, morph: number, idleAtTop: boolean): Trigger[] {
  const out: Trigger[] = [];

  // Drain whatever the listeners raised between frames.
  for (const t of pending) out.push(t);
  pending.clear();

  const s = signals;

  /*
   * Scroll-derived triggers are evaluated before the pointer gate below.
   *
   * Returning to the eyes is about the page position, not the cursor, and a
   * reader who scrolls with a wheel or a keyboard may never have moved the
   * pointer at all — behind the gate, this never fired for them.
   */
  motion.peakMorph = Math.max(motion.peakMorph, morph);
  if (motion.peakMorph > 0.3 && morph < 0.05) {
    out.push("backToTop");
    motion.peakMorph = 0;
  }

  // Everything past here reads the pointer, which is meaningless until it has
  // moved: an untouched pointer reports the origin, not the reader's attention.
  if (!s.seen) return out;

  const now = performance.now();
  const moving = s.speed > 0.08;

  /*
   * There is deliberately no bare "moving fast" trigger.
   *
   * There was one, and it never once spoke: across a long session it entered
   * twenty priority contests and lost all twenty. Speed is not something a
   * visitor does on its own — every fast movement is also a sweep, a jitter,
   * or a dash to the edge, and each of those has a better line for it. Its
   * only effect was to crowd the frame and make the specific triggers look
   * broken. `sweep` and `jitter` below cover the same ground and say more.
   */

  if (moving) {
    /*
     * A sweep is a long, uninterrupted horizontal run. Restarting the
     * measurement whenever the pointer stalls keeps a slow drag from
     * accumulating into one.
     *
     * The window is 900ms rather than 400: crossing most of a 1440px viewport
     * takes about 490ms even when driven deliberately, so the shorter window
     * expired mid-sweep and the run was never credited. The stall reset below
     * is what actually enforces "uninterrupted", so the window can afford to
     * be generous.
     *
     * 0.55 NDC of travel, well under the 2.0 the viewport spans.
     *
     * The threshold has to sit below what is observable *during* the run, not
     * below the run's total length: the span resets the moment the pointer
     * stops, and the last frame of motion always falls short of the full
     * distance.
     *
     * Measured across real window sizes, an edge-to-edge sweep peaks at 0.83
     * on a 16in, 14in, and QHD display alike — and at 1.00 only at exactly
     * 1440x900. An earlier 0.85 was set from that one size, which meant sweep
     * could not fire on any of the others. Anything tuned in here must be
     * checked against the range, not against whatever the test rig defaults to.
     */
    if (now - motion.sweepAt > 900) {
      motion.sweepAt = now;
      motion.sweepX = s.x;
    } else if (Math.abs(s.x - motion.sweepX) > 0.55) {
      out.push("sweep");
      motion.sweepAt = 0;
    }
  } else {
    motion.sweepAt = 0;
  }

  /*
   * Direction flips: four inside 1.5s is someone playing with the eyes.
   *
   * Compares direction against direction, not against position. The floor on
   * the step is what separates "shaking the cursor" from "holding it still":
   * at 0.01 NDC — roughly seven pixels — ordinary repositioning registered as
   * reversals, so this claimed someone was playing with the eyes whenever they
   * simply moved the pointer somewhere and back. 0.12 is a deliberate swing.
   */
  const step = s.x - motion.lastX;
  motion.lastX = s.x;
  if (Math.abs(step) > 0.12) {
    const dir = Math.sign(step);
    if (motion.lastDir !== 0 && dir !== motion.lastDir) motion.flips.push(now);
    motion.lastDir = dir;
  }
  while (motion.flips.length && now - motion.flips[0] > 1500) motion.flips.shift();
  if (motion.flips.length >= 4) {
    out.push("jitter");
    motion.flips.length = 0;
  }

  /*
   * Gaze pinned at its anatomical limit.
   *
   * 0.85, not something nearer the middle and not right at the ceiling.
   *
   * The two eyes converge — each solves from its own socket — so even a
   * centred cursor turns them inward and the normalised value never sits near
   * zero: about 0.2 dead centre, ~0.5 at the quarter marks. An early 0.47
   * therefore fired across most of the screen, where the line is untrue.
   *
   * But 0.92 was too far the other way. At the screen edge this reads 0.97-0.98
   * on a 14in or 16in display and only 0.91 on a QHD one, so the higher
   * threshold silently excluded wide screens entirely.
   */
  if (s.gaze > 0.85) out.push("gazeLimit");

  /*
   * Dwelling on the eyes themselves, and blinking while there.
   *
   * Raised once per visit to the eyes, not on every frame the pointer rests
   * there. Without the latch this pushed continuously for as long as the
   * cursor sat still — and since the middle of the screen is exactly where a
   * pointer naturally comes to rest, it re-entered the contest every frame and
   * reclaimed the conversation the instant its cooldown lapsed. Measured, it
   * spoke three times in a row while contactHover, resize and cursorLeft never
   * got a turn at all. The pointer must leave and come back to say it again.
   */
  if (s.toEyes < EYE_RADIUS) {
    motion.eyeDwell += delta;
    if (motion.eyeDwell > 1.2 && !motion.dwellSaid) {
      out.push("eyeDwell");
      motion.dwellSaid = true;
    }

    const blinking = s.blink > 0.9;
    if (blinking && !motion.wasBlinking) out.push("blinkSync");
    motion.wasBlinking = blinking;
  } else {
    motion.eyeDwell = 0;
    motion.dwellSaid = false;
    motion.wasBlinking = false;
  }

  /*
   * Reading the blurb: dwelling in the bottom-right, where it sits. Bounded
   * loosely — this is about which corner the pointer is resting in, and a
   * tighter box would depend on the exact layout at every breakpoint.
   */
  if (s.x > 0.25 && s.y < -0.15 && !moving) {
    motion.blurbDwell += delta;
    if (motion.blurbDwell > DWELL_AT && !motion.blurbSaid) {
      out.push("blurbDwell");
      motion.blurbSaid = true;
    }
  } else {
    motion.blurbDwell = 0;
    motion.blurbSaid = false;
  }

  /*
   * Stillness, in two tiers, and the nudge to scroll.
   *
   * All three latch on the same principle as the dwells above: they stay true
   * for as long as the pointer is unmoved, so pushing them every frame let
   * whichever ranked highest hold the floor indefinitely. Cleared by any
   * movement, since `still` resets on the pointer event.
   */
  if (s.still > IDLE_DEEP_AT && !motion.idleDeepSaid) {
    out.push("idleDeep");
    motion.idleDeepSaid = true;
  } else if (s.still > IDLE_AT && !motion.idleSaid) {
    out.push("idle");
    motion.idleSaid = true;
  }

  if (idleAtTop && s.still > 6 && !motion.nudgeSaid) {
    out.push("scrollNudge");
    motion.nudgeSaid = true;
  }

  if (moving) {
    motion.idleSaid = false;
    motion.idleDeepSaid = false;
    motion.nudgeSaid = false;
  }

  /*
   * The gentle "i see you", earned by sustained movement rather than by any
   * movement at all.
   *
   * This was `moving && gaze > 0.12`, which is true of almost every frame in
   * which the pointer is not perfectly still — so it fired the instant the
   * pointer was brought anywhere near the eyes and, because a line in progress
   * is never interrupted, blocked every more specific trigger behind it. The
   * accumulator makes it a remark about someone who has been moving about for
   * a while, which is what the line actually claims.
   */
  /*
   * The threshold is 1.5, and the decay is gentle.
   *
   * Both were wrong before. At 6, with the accumulator decaying by a tenth on
   * every frame the pointer paused, two minutes of unhurried wandering reached
   * 0.49 — a quarter of the way there, and falling back faster than it climbed.
   * This trigger never once fired in a full session.
   *
   * Decay still matters: without it, a pointer nudged occasionally over several
   * minutes would eventually accumulate enough to claim someone had been
   * "moving around". Draining over seconds rather than frames keeps the
   * accumulator a description of recent activity while letting it actually
   * fill.
   */
  motion.travel = moving
    ? motion.travel + s.speed * delta
    : Math.max(0, motion.travel - delta * 0.5);
  if (motion.travel > 1.5) {
    out.push("watching");
    motion.travel = 0;
  }

  return out;
}
