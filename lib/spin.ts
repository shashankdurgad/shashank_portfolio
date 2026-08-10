import * as THREE from "three";

/**
 * Drag-to-spin physics for a single axis.
 *
 * One degree of freedom under exponential friction, which is all a
 * grab-and-flick interaction needs. A rigid-body engine would add a WASM
 * dependency and a second update loop to solve a problem this doesn't have —
 * and would need an invented moment of inertia anyway, since a particle cloud
 * has no mass.
 */

/** Idle spin rate (rad/s) that a flick decays back toward. */
export const IDLE_SPIN = 0.1;
/** Fraction of excess angular velocity retained per second. */
export const DAMPING = 0.12;
/** Screen px of horizontal drag → rad/s. */
export const DRAG_GAIN = 0.011;

export type SpinState = {
  angle: number;
  velocity: number;
  dragging: boolean;
  lastX: number;
  /** Velocity sampled from recent pointer motion, used as release momentum. */
  throwVel: number;
};

export function createSpin(idle = IDLE_SPIN, angle = 0): SpinState {
  return { angle, velocity: idle, dragging: false, lastX: 0, throwVel: 0 };
}

/**
 * Advance one frame. `Math.pow(DAMPING, delta)` rather than a fixed multiplier
 * keeps the decay framerate-independent — identical feel at 60 and 120fps.
 */
export function stepSpin(s: SpinState, delta: number, idleTarget = IDLE_SPIN) {
  if (s.dragging) return s.angle;
  const k = Math.pow(DAMPING, delta);
  s.velocity = idleTarget + (s.velocity - idleTarget) * k;
  s.angle += s.velocity * delta;
  return s.angle;
}

export function beginDrag(s: SpinState, clientX: number) {
  s.dragging = true;
  s.lastX = clientX;
  s.throwVel = 0;
}

export function moveDrag(s: SpinState, clientX: number) {
  if (!s.dragging) return;
  const dx = clientX - s.lastX;
  s.lastX = clientX;
  s.angle += dx * DRAG_GAIN;
  // Blend so a brief stutter mid-drag doesn't kill the throw.
  s.throwVel = s.throwVel * 0.7 + dx * DRAG_GAIN * 60 * 0.3;
}

export function endDrag(s: SpinState) {
  if (!s.dragging) return;
  s.dragging = false;
  s.velocity = THREE.MathUtils.clamp(s.throwVel, -14, 14);
}
