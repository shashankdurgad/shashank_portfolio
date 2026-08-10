import * as THREE from "three";

/**
 * Gaze physics for a single eye: a spring under a saccade layer.
 *
 * Real eyes do not track continuously. They fixate, then jump — a saccade —
 * and the jump itself is ballistic and fast. Modelling only a spring gives a
 * smooth glide that reads as a mechanism following a cursor; modelling only
 * jumps reads as a strobe. Both together is what makes it read as looking.
 *
 * Angles are yaw/pitch in radians, relative to straight ahead.
 */

/** How far the eye can turn before it holds at the limit, in radians (~28deg). */
export const GAZE_LIMIT = 0.49;

/** Spring stiffness. High, because a saccade is ballistic, not a drift. */
const STIFFNESS = 190;

/**
 * Damping ratio. Just under 1 so the eye arrives hard and settles without a
 * visible bounce — a real saccade slightly overshoots and corrects.
 */
const DAMPING_RATIO = 0.86;

/** Cursor movement below this angle is ignored; the eye holds its fixation. */
const DEAD_ZONE = 0.055;

/** Latency between the cursor leaving the dead zone and the eye committing. */
const LATENCY_MIN = 0.08;
const LATENCY_MAX = 0.15;

/** Amplitude of ocular drift between saccades. Sub-degree, deliberately. */
const DRIFT = 0.004;

export type GazeState = {
  /** Current angle, what the shader consumes. */
  yaw: number;
  pitch: number;
  /** Angular velocity, carried by the spring. */
  vYaw: number;
  vPitch: number;
  /** Committed fixation target — only updated when a saccade fires. */
  targetYaw: number;
  targetPitch: number;
  /** Seconds until a pending saccade commits; <=0 when none is pending. */
  latency: number;
  /** Phase offsets so two eyes never drift in lockstep. */
  driftPhase: number;
  /** Per-eye jitter on saccade latency, so the eyes do not fire together. */
  latencyBias: number;
};

export function createGaze(seed = 0): GazeState {
  return {
    yaw: 0,
    pitch: 0,
    vYaw: 0,
    vPitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    latency: 0,
    driftPhase: seed * 2.4,
    latencyBias: seed * 0.017,
  };
}

/**
 * Advance one eye by `delta` seconds toward a desired angle.
 *
 * `desiredYaw/Pitch` is where the eye would look to hit the cursor exactly;
 * the saccade layer decides whether and when to accept it.
 */
export function stepGaze(
  s: GazeState,
  desiredYaw: number,
  desiredPitch: number,
  delta: number,
  time: number,
) {
  // Clamp before anything else, so the eye holds at its limit instead of
  // chasing a target that would slide the pupil off the sclera.
  const wantYaw = THREE.MathUtils.clamp(desiredYaw, -GAZE_LIMIT, GAZE_LIMIT);
  const wantPitch = THREE.MathUtils.clamp(desiredPitch, -GAZE_LIMIT, GAZE_LIMIT);

  const offYaw = wantYaw - s.targetYaw;
  const offPitch = wantPitch - s.targetPitch;
  const off = Math.hypot(offYaw, offPitch);

  if (off > DEAD_ZONE) {
    // The cursor has left the current fixation. Start the clock if it is not
    // already running; a saccade already pending simply continues counting.
    if (s.latency <= 0) {
      s.latency =
        LATENCY_MIN + Math.random() * (LATENCY_MAX - LATENCY_MIN) + s.latencyBias;
    }
    s.latency -= delta;
    if (s.latency <= 0) {
      s.targetYaw = wantYaw;
      s.targetPitch = wantPitch;
      s.latency = 0;
    }
  } else {
    // Inside the dead zone: cancel any pending saccade. The eye stays put.
    s.latency = 0;
  }

  /*
   * Microsaccades and drift. Without this the eye is perfectly still between
   * saccades, which is the single strongest tell that it is not alive.
   */
  const driftYaw = Math.sin(time * 1.7 + s.driftPhase) * DRIFT;
  const driftPitch = Math.cos(time * 2.3 + s.driftPhase * 1.4) * DRIFT;

  // Semi-implicit Euler. Stable at this stiffness for any frame time the
  // browser will realistically hand us, and the clamp below covers stalls.
  const dt = Math.min(delta, 1 / 30);
  const damping = 2 * DAMPING_RATIO * Math.sqrt(STIFFNESS);

  const aYaw =
    (s.targetYaw + driftYaw - s.yaw) * STIFFNESS - s.vYaw * damping;
  const aPitch =
    (s.targetPitch + driftPitch - s.pitch) * STIFFNESS - s.vPitch * damping;

  s.vYaw += aYaw * dt;
  s.vPitch += aPitch * dt;
  s.yaw += s.vYaw * dt;
  s.pitch += s.vPitch * dt;

  // The spring can overshoot past the anatomical limit on a hard saccade.
  s.yaw = THREE.MathUtils.clamp(s.yaw, -GAZE_LIMIT, GAZE_LIMIT);
  s.pitch = THREE.MathUtils.clamp(s.pitch, -GAZE_LIMIT, GAZE_LIMIT);
}

/* ------------------------------------------------------------------ */
/* Blinks                                                              */

/** Seconds between idle blinks. */
const BLINK_MIN = 3;
const BLINK_MAX = 6;

/** Duration of one full close-and-open, in seconds. */
const BLINK_DURATION = 0.12;

export type BlinkState = {
  /** 0 open, 1 shut. What the shader consumes. */
  value: number;
  /** Seconds until the next idle blink starts. */
  next: number;
  /** Progress through the current blink; <0 when not blinking. */
  phase: number;
};

export function createBlink(): BlinkState {
  return { value: 0, next: BLINK_MIN, phase: -1 };
}

/**
 * Advance the blink machine.
 *
 * `scrollClose` is the lids' second driver: the eyes shut as the scroll
 * explosion begins, so the burst happens behind closed lids. The two sources
 * are combined with max() rather than added — a blink during the scroll close
 * must not drive the lids past shut.
 */
export function stepBlink(s: BlinkState, delta: number, scrollClose: number) {
  if (s.phase >= 0) {
    s.phase += delta / BLINK_DURATION;
    if (s.phase >= 1) {
      s.phase = -1;
      s.next = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
    }
  } else {
    s.next -= delta;
    if (s.next <= 0) s.phase = 0;
  }

  // Triangular close/open. sin() would linger at the extremes; a blink is
  // fastest at its midpoint and has no dwell time shut.
  const blink = s.phase >= 0 ? 1 - Math.abs(s.phase * 2 - 1) : 0;

  s.value = Math.max(blink, THREE.MathUtils.clamp(scrollClose, 0, 1));
  return s.value;
}
