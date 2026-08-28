/**
 * What the eyes say, and what makes them say it.
 *
 * Data only. The machine in dialogueStore decides *when* a pool is eligible;
 * this file decides what comes out of it. Keeping the two apart means tuning
 * the voice never risks the timing, which is the part that is easy to break.
 *
 * Register is warm and playful throughout — the eyes are pleased you are here,
 * not performing detachment. Lowercase is deliberate: it reads as spoken rather
 * than announced.
 */

/**
 * Trigger pools, in the rough order a visitor meets them.
 *
 * `once` pools retire permanently after firing. The rest recycle, but only
 * after every line in the pool has been used — see `pick` below.
 */
export type Trigger =
  | "greeting"
  | "watching"
  | "eyeDwell"
  | "gazeLimit"
  | "jitter"
  | "sweep"
  | "blinkSync"
  | "idle"
  | "idleDeep"
  | "scrollNudge"
  | "scrollStart"
  | "contactHover"
  | "blurbDwell"
  | "return"
  | "refocus"
  | "resize"
  | "cursorLeft"
  | "backToTop";

export type Line = {
  trigger: Trigger;
  text: string;
};

/**
 * The script.
 *
 * Several variants per trigger so a visitor who lingers does not hear the same
 * sentence twice. Lines are kept short: this is a bubble under a pair of eyes,
 * not a paragraph, and anything longer than about eight words outstays the
 * hold time it earns.
 */
export const LINES: Record<Trigger, string[]> = {
  greeting: [
    "hey! welcome in.",
    "oh, hi! come on in.",
    "hello! didn't expect you so soon.",
  ],
  watching: [
    "i can see you moving around :)",
    "hi again — still here, still looking.",
    "you're fun to follow.",
  ],
  eyeDwell: [
    "…yes? can i help?",
    "hi! very close.",
    "you're right in my face, you know.",
  ],
  gazeLimit: [
    "ooh, you're way over there!",
    "that's as far as i turn, sorry.",
  ],
  jitter: [
    "okay now you're just testing me.",
    "left, right, left — very funny.",
  ],
  sweep: [
    "whoa! slow down :)",
    "whoa! okay, i'm keeping up.",
    "all the way over there? fine, fine.",
  ],
  blinkSync: [
    "did you just blink too? we're bonding.",
    "we blinked together. that counts for something.",
  ],
  idle: [
    "still there? i'll wait.",
    "i'm very patient. very.",
  ],
  idleDeep: [
    "i can do this all day, honestly.",
    "no rush. i've got nowhere to be.",
  ],
  scrollNudge: [
    "psst — scroll down, there's good stuff.",
    "there's a whole thing below, promise.",
  ],
  scrollStart: [
    "wait — where are you going!",
    "ooh, here we go!",
  ],
  contactHover: [
    "that one's real, i checked.",
    "go on, say hi properly.",
  ],
  blurbDwell: [
    "that's the part i'd read too.",
    "good choice, that bit's the important one.",
  ],
  return: [
    "you came back! i kept watching anyway.",
    "oh good, you're back.",
  ],
  refocus: [
    "oh good, you're back.",
    "there you are!",
  ],
  resize: [
    "ooh, new dimensions.",
    "a resize! bold.",
  ],
  cursorLeft: [
    "…where'd you go?",
    "you wandered off. i noticed.",
  ],
  backToTop: [
    "you're back! did you see the doors?",
    "oh, hello again — miss me?",
  ],
};

/**
 * Per-trigger cooldown, in seconds.
 *
 * On top of the global spacing, so a trigger that keeps firing (the gaze limit
 * does, whenever the cursor sits in a corner) cannot dominate the conversation.
 * Longer than the global gap by design: variety across triggers reads as
 * attention, repetition within one reads as a loop.
 */
export const COOLDOWN: Record<Trigger, number> = {
  greeting: Infinity,
  watching: 70,
  eyeDwell: 45,
  gazeLimit: 60,
  jitter: 60,
  sweep: 60,
  blinkSync: 90,
  idle: 50,
  idleDeep: 70,
  scrollNudge: 40,
  scrollStart: Infinity,
  contactHover: 50,
  blurbDwell: 60,
  return: 40,
  refocus: 60,
  resize: 45,
  cursorLeft: 50,
  backToTop: Infinity,
};

/**
 * Triggers that fire at most once per session, no matter the cooldown.
 *
 * These are moments rather than states — there is only one arrival, and only
 * one first departure downward.
 */
export const ONCE: ReadonlySet<Trigger> = new Set<Trigger>([
  "greeting",
  "scrollStart",
  "backToTop",
]);

/**
 * Priority when two triggers land in the same frame.
 *
 * Higher wins. Ordered by how strongly the line depends on the exact moment:
 * "wait — where are you going!" is meaningless a second late, whereas an idle
 * nudge is just as true whenever it arrives.
 */
export const PRIORITY: Record<Trigger, number> = {
  greeting: 100,
  scrollStart: 90,
  backToTop: 85,
  return: 80,
  refocus: 75,
  cursorLeft: 70,
  blinkSync: 65,
  eyeDwell: 60,
  contactHover: 59,
  /*
   * Jitter outranks sweep: waggling back and forth also travels a distance, so
   * both detect together, and the reversal is the more particular observation.
   * A bare "moving fast" trigger used to sit alongside these and is gone — see
   * the note in dialogueSignals; it lost every contest it ever entered.
   */
  jitter: 58,
  sweep: 55,
  gazeLimit: 45,
  blurbDwell: 40,
  resize: 35,
  watching: 30,
  idleDeep: 25,
  idle: 20,
  scrollNudge: 15,
};

/**
 * Choose a line from a pool, preferring ones not yet heard.
 *
 * Drains the pool before recycling, so a visitor hears every variant once
 * before any repeats. Falls back to the whole pool when exhausted rather than
 * going silent — a repeated line is better than a trigger that stops working.
 */
export function pick(trigger: Trigger, seen: ReadonlySet<string>): Line {
  const pool = LINES[trigger];
  const fresh = pool.filter((t) => !seen.has(t));
  const from = fresh.length > 0 ? fresh : pool;
  return { trigger, text: from[Math.floor(Math.random() * from.length)] };
}
