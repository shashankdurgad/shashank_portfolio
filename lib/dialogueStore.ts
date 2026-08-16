"use client";

import { create } from "zustand";
import {
  COOLDOWN,
  LINES,
  ONCE,
  PRIORITY,
  type Line,
  type Trigger,
  pick,
} from "./dialogueLines";
// Read only by the dev hook below. dialogueSignals imports nothing from here,
// so this direction is safe.
import { signals, sweepDebug } from "./dialogueSignals";

/**
 * The eyes' conversation: what is being said, and whether they may say it.
 *
 * Split in two on purpose. The bookkeeping — cooldowns, counts, which lines
 * have been heard — lives in a plain mutable object because it is written from
 * the frame loop, where a `setState` per frame would be 60 renders a second for
 * nothing. Only the line itself is React state, and that changes a handful of
 * times per session.
 *
 * Same reasoning as lib/scrollStore.ts, and the same rule: nothing in `book`
 * may be read during render.
 */

/** Global gap between lines, in seconds. Sparse by design — see below. */
const GAP_MIN = 20;
const GAP_MAX = 30;

/**
 * Dev-only override of the pacing, for exercising triggers back to back.
 *
 * The gap and the cap exist to keep the eyes from chattering at a visitor, and
 * they do that well: across ninety seconds of deliberately provoking every
 * trigger in turn, the gap alone blocked eleven attempts and only three lines
 * were heard. That is right for a visit and useless for testing, where the
 * question is whether a given trigger detects at all.
 *
 * `__dlg.fast()` shrinks the gap and lifts the cap without touching detection,
 * so what is observed is still the real trigger firing.
 */
let gapMin = GAP_MIN;
let gapMax = GAP_MAX;
let maxLines = 5;
/** Multiplier on every per-trigger cooldown; 1 in normal use. */
let cooldownScale = 1;

/*
 * How many lines before the eyes go quiet for good, held in `maxLines` above.
 *
 * The failure mode of a talking mascot is chattiness, and it arrives fast. Five
 * is enough for a visitor to notice the eyes are responsive without the bubble
 * becoming furniture. `backToTop` is exempt — see `request`.
 */

/** Typing speed and hold, in seconds. */
const TYPE_RATE = 0.028;
const HOLD_MIN = 1.6;
const HOLD_PER_CHAR = 0.045;
const FADE = 0.35;

type Phase = "idle" | "typing" | "held" | "leaving";

type Book = {
  /** Seconds on the page. Advanced by the frame loop. */
  now: number;
  /** `now` at which the global gap next expires. */
  nextAt: number;
  /** Last utterance time per trigger, for per-trigger cooldowns. */
  lastAt: Partial<Record<Trigger, number>>;
  /** Lines spoken, against maxLines. */
  spoken: number;
  /** Text already heard, so pools drain before recycling. */
  seen: Set<string>;
  /** Latched shut once the reader has scrolled past the eyes. */
  silenced: boolean;
  /** Phase clock: seconds remaining in the current phase. */
  until: number;
  /** Characters revealed so far, when typing. */
  chars: number;
  /** Set when the visitor's motion preference says: no typing animation. */
  instant: boolean;
};

export const book: Book = {
  now: 0,
  nextAt: 0,
  lastAt: {},
  spoken: 0,
  seen: new Set(),
  silenced: false,
  until: 0,
  chars: 0,
  instant: false,
};

type DialogueStore = {
  /** The line being spoken, or null between them. */
  line: Line | null;
  /** How much of `line.text` to show. Drives the typing reveal. */
  visible: string;
  phase: Phase;
  say: (line: Line) => void;
  advance: (visible: string, phase: Phase) => void;
  clear: () => void;
};

export const useDialogueStore = create<DialogueStore>((set) => ({
  line: null,
  visible: "",
  phase: "idle",
  say: (line) => set({ line, visible: "", phase: "typing" }),
  advance: (visible, phase) =>
    set((s) => (s.visible === visible && s.phase === phase ? s : { visible, phase })),
  clear: () => set({ line: null, visible: "", phase: "idle" }),
}));

/**
 * Dev-only test hook.
 *
 * The triggers are gated behind cooldowns measured in tens of seconds, which
 * makes exercising them one after another impractical otherwise. `relax` drops
 * the gates without touching the detection itself, so what a test observes is
 * still the real trigger firing.
 */
/** Where the dev pacing override is remembered across reloads. */
const FAST_KEY = "dlg.fast";
const TRACE_KEY = "dlg.trace";

/**
 * Apply the testing pace. Persisted, so it survives a reload.
 *
 * Every refresh otherwise dropped back to the 20-30s visitor pacing, which
 * looks exactly like the override not working — and a testing aid that has to
 * be re-armed after each reload is one that will be silently lost.
 */
export function setFast(on: boolean) {
  gapMin = on ? 3 : GAP_MIN;
  gapMax = on ? 3.5 : GAP_MAX;
  maxLines = on ? Infinity : 5;
  cooldownScale = on ? 0.05 : 1;
  book.nextAt = 0;
  book.spoken = 0;
  book.silenced = false;
  try {
    if (on) localStorage.setItem(FAST_KEY, "1");
    else localStorage.removeItem(FAST_KEY);
  } catch {
    // Private mode or blocked storage: the override still applies this session.
  }
}

export function installDialogueHook() {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;

  // Restore whatever was left on before the reload.
  let restored = false;
  try {
    if (localStorage.getItem(FAST_KEY)) {
      setFast(true);
      restored = true;
    }
    if (localStorage.getItem(TRACE_KEY)) setTracing(true);
  } catch {
    /* storage unavailable; carry on with defaults */
  }

  console.log(
    "%c👁 eye dialogue%c\n  __dlg.fast()   pace for testing — ~3s between lines, no cap (persists across reloads)\n  __dlg.trace()  log every trigger, spoken or blocked (persists)\n  __dlg.lines()  the whole script\n  __dlg.state()  live signals (gaze, toEyes, speed, still, sweep)\n  __dlg.off()    turn both off",
    "color:#2bb8d4;font-weight:bold",
    "color:#64748b",
  );

  if (restored) {
    console.log(
      "%c  ↳ FAST + trace restored from last session%c — __dlg.off() to stop",
      "color:#2bb8d4",
      "color:#64748b",
    );
  }

  (window as unknown as { __dlg?: unknown }).__dlg = {
    relax: () => {
      book.nextAt = 0;
      book.spoken = 0;
      book.silenced = false;
      // Clear per-trigger cooldowns but keep the once-only ones retired —
      // wiping those wholesale makes the greeting eligible again, and it then
      // wins on priority and masks whatever the test was actually driving.
      for (const k of Object.keys(book.lastAt) as Trigger[]) {
        if (!ONCE.has(k)) delete book.lastAt[k];
      }
      // Forget what has already been reported, so the next round logs its
      // blocks afresh instead of suppressing them as duplicates.
      for (const k of Object.keys(lastBlock) as Trigger[]) delete lastBlock[k];
      lastContest = "";
    },
    state: () => ({
      spoken: book.spoken,
      silenced: book.silenced,
      nextIn: +Math.max(0, book.nextAt - book.now).toFixed(1),
      phase: useDialogueStore.getState().phase,
      still: +signals.still.toFixed(1),
      x: +signals.x.toFixed(2),
      sweep: sweepDebug(),
      speed: +signals.speed.toFixed(2),
      gaze: +signals.gaze.toFixed(2),
      toEyes: +signals.toEyes.toFixed(2),
      seen: signals.seen,
    }),
    reset: resetDialogue,
    /**
     * Testing pace: near-instant gap, no cap, short per-trigger cooldowns.
     * `__dlg.fast(false)` restores the real pacing.
     */
    /*
     * The gap in fast mode is 3s, not zero.
     *
     * A line occupies the bubble for its typing time plus a hold of at least
     * HOLD_MIN plus the fade — roughly two and a half seconds at minimum. A
     * gap shorter than that means the next trigger is offered while the last
     * line is still on screen, gets refused as "already speaking", and the
     * tester sees the *previous* line and reads it as the wrong one firing.
     */
    fast: (on = true) => {
      setFast(on);
      console.log(
        on
          ? "%cdialogue FAST mode%c — ~3s between lines, no cap, persists across reloads. __dlg.off() to stop."
          : "%cdialogue pacing restored%c — 20-30s gap, cap 5.",
        "color:#2bb8d4;font-weight:bold",
        "color:#64748b",
      );
    },
    /** Log every trigger offered, spoken or blocked, with the reason. */
    trace: (on = true) => {
      setTracing(on);
      try {
        if (on) localStorage.setItem(TRACE_KEY, "1");
        else localStorage.removeItem(TRACE_KEY);
      } catch {
        /* storage unavailable */
      }
      console.log(`dialogue trace ${on ? "ON (persists across reloads)" : "off"}`);
    },
    /** Restore visitor pacing and stop logging, clearing both from storage. */
    off: () => {
      setFast(false);
      setTracing(false);
      try {
        localStorage.removeItem(FAST_KEY);
        localStorage.removeItem(TRACE_KEY);
      } catch {
        /* storage unavailable */
      }
      console.log(
        "%cdialogue back to normal%c — 20-30s gap, cap 5, no logging.",
        "color:#2bb8d4;font-weight:bold",
        "color:#64748b",
      );
    },
    /** The whole script, so the console can show what is possible. */
    lines: () => {
      console.table(
        (Object.keys(LINES) as Trigger[]).map((t) => ({
          trigger: t,
          priority: PRIORITY[t],
          cooldown: COOLDOWN[t] === Infinity ? "once" : `${COOLDOWN[t]}s`,
          variants: LINES[t].length,
          example: LINES[t][0],
        })),
      );
    },
  };
}

/** Reset for a fresh session. Only used by tests. */
export function resetDialogue() {
  book.now = 0;
  book.nextAt = 0;
  book.lastAt = {};
  book.spoken = 0;
  book.seen = new Set();
  book.silenced = false;
  book.until = 0;
  book.chars = 0;
  useDialogueStore.getState().clear();
}

/**
 * Silence the eyes for the rest of the session.
 *
 * Called once the reader has scrolled past the hero. The eyes shut as the
 * burst begins, so anything said after that has no visible speaker; and a
 * prompt that returns after being followed reads as a fault, which is the same
 * reasoning that made usePromptOnce latch.
 */
export function silence() {
  book.silenced = true;
}

/**
 * Dev-only trace of every trigger offered, accepted or not.
 *
 * A trigger that fires but is refused looks identical from the outside to one
 * that never detected at all, and those two have completely different fixes —
 * so the rejection reason is the useful half of this. Toggled with
 * `__dlg.trace(true)`; off by default so the console is not flooded.
 */
let tracing = false;
export function setTracing(on: boolean) {
  tracing = on;
}

/*
 * Last block reported per trigger, so a rejection is logged once rather than
 * on every frame it stays true.
 *
 * A held cursor keeps its trigger firing continuously — gazeLimit at a screen
 * edge re-detects 60 times a second — and logging each one buries the line
 * that actually matters under hundreds of identical rows. Keyed by the reason
 * without its countdown, so "gap, 22.8s left" and "gap, 21.1s left" collapse.
 */
const lastBlock: Partial<Record<Trigger, string>> = {};
/** Same idea, for the "also detected" contest line. */
let lastContest = "";

function trace(trigger: Trigger, verdict: string, text?: string) {
  if (!tracing || process.env.NODE_ENV === "production") return;

  if (text) {
    delete lastBlock[trigger];
    console.log(
      `%c♦ ${trigger}%c → ${JSON.stringify(text)}`,
      "color:#2bb8d4;font-weight:bold",
      "color:inherit",
    );
    return;
  }

  const kind = verdict.replace(/[\d.]+s left/, "…");
  if (lastBlock[trigger] === kind) return;
  lastBlock[trigger] = kind;
  console.log(`%c· ${trigger}%c blocked: ${verdict}`, "color:#64748b", "color:#64748b");
}

/**
 * Offer a trigger. Returns true if it became the line now being spoken.
 *
 * Safe to call every frame from the frame loop: the common case is a cooldown
 * comparison and an early return, with no allocation and no store write.
 */
export function request(trigger: Trigger): boolean {
  const s = useDialogueStore.getState();

  /*
   * `backToTop` is the one line allowed through the latch.
   *
   * Scrolling back up to the eyes is a deliberate act, and the eyes noticing it
   * is the whole charm of the feature. It is in ONCE, so it can happen at most
   * once, and it does not count against maxLines — otherwise the cap and the
   * latch between them would make it unreachable in practice.
   */
  const exempt = trigger === "backToTop";

  if (book.silenced && !exempt) {
    trace(trigger, "silenced (scrolled past the eyes)");
    return false;
  }
  if (book.spoken >= maxLines && !exempt) {
    trace(trigger, `cap reached (${book.spoken}/${maxLines})`);
    return false;
  }
  // Never interrupt. A line cut off mid-word by a livelier trigger reads as a
  // bug, and the interrupting line is rarely worth the one it replaced.
  if (s.phase !== "idle") {
    trace(trigger, `already speaking (${s.phase})`);
    return false;
  }
  if (book.now < book.nextAt && !exempt) {
    trace(trigger, `global gap, ${(book.nextAt - book.now).toFixed(1)}s left`);
    return false;
  }

  const last = book.lastAt[trigger];
  if (last !== undefined) {
    if (ONCE.has(trigger)) {
      trace(trigger, "already said (once per session)");
      return false;
    }
    const cool = COOLDOWN[trigger] * cooldownScale;
    if (book.now - last < cool) {
      trace(trigger, `cooldown, ${(cool - (book.now - last)).toFixed(1)}s left`);
      return false;
    }
  }

  const line = pick(trigger, book.seen);
  book.lastAt[trigger] = book.now;
  book.seen.add(line.text);
  if (!exempt) book.spoken += 1;
  book.nextAt = book.now + gapMin + Math.random() * (gapMax - gapMin);
  book.chars = 0;
  book.until = book.instant ? 0 : line.text.length * TYPE_RATE;

  trace(trigger, "spoken", line.text);
  s.say(line);
  if (book.instant) useDialogueStore.getState().advance(line.text, "held");
  return true;
}

/**
 * Highest-priority trigger among those offered this frame.
 *
 * Callers collect what fired and hand the winner to `request`, rather than
 * calling `request` in trigger order — otherwise whichever check happened to
 * run first would win, and "wait — where are you going!" would lose to an idle
 * nudge that had merely been evaluated earlier.
 */
export function best(triggers: Trigger[]): Trigger | null {
  let winner: Trigger | null = null;
  for (const t of triggers) {
    if (winner === null || PRIORITY[t] > PRIORITY[winner]) winner = t;
  }

  /*
   * Report the losers too. A trigger that detected correctly but lost the
   * frame never reaches `request`, so without this it is indistinguishable
   * from one that never detected — and those need opposite fixes.
   */
  if (tracing && winner && triggers.length > 1) {
    // Deduped like the block reasons above: a held pointer produces the same
    // combination every frame, and repeating it drowns the log.
    const key = `${winner}<${triggers.filter((t) => t !== winner).sort().join(",")}`;
    if (key !== lastContest) {
      lastContest = key;
      console.log(
        `%c  (also detected: ${triggers.filter((t) => t !== winner).join(", ")} — outranked by ${winner})`,
        "color:#475569;font-style:italic",
      );
    }
  }

  return winner;
}

/**
 * Advance the utterance. Call once per frame with the frame delta.
 *
 * Drives the typing reveal and the hold, and writes to the store only when the
 * revealed text or the phase actually changes.
 */
export function step(delta: number) {
  book.now += delta;

  const s = useDialogueStore.getState();
  if (!s.line || s.phase === "idle") return;

  book.until -= delta;

  if (s.phase === "typing") {
    const n = book.instant
      ? s.line.text.length
      : Math.min(s.line.text.length, Math.ceil((book.chars += delta / TYPE_RATE)));
    if (n >= s.line.text.length) {
      book.until = Math.max(HOLD_MIN, s.line.text.length * HOLD_PER_CHAR);
      s.advance(s.line.text, "held");
    } else {
      s.advance(s.line.text.slice(0, n), "typing");
    }
    return;
  }

  if (s.phase === "held" && book.until <= 0) {
    book.until = FADE;
    s.advance(s.line.text, "leaving");
    return;
  }

  if (s.phase === "leaving" && book.until <= 0) s.clear();
}
