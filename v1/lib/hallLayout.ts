import * as THREE from "three";
import { PROJECTS } from "./projectData";

/**
 * Where the chips sit in the hall.
 *
 * An arc around the viewer rather than a flat wall: the camera stays put and
 * only turns, so the chips have to be arranged around that pivot for the
 * turning to reveal anything. A wall would show all three at once and the head
 * movement would be decoration.
 */

/** Where the viewer stands. The camera never leaves this point. */
export const HALL_CENTRE = new THREE.Vector3(0, 1.5, 0);

/** How far the chips sit from the viewer. */
const RADIUS = 3.4;

/**
 * Total angle the arc spans, in radians.
 *
 * Deliberately shallow. A wide arc puts the outer chips behind the viewer's
 * shoulders, where the damped head-turn can only just reach them; this keeps
 * every chip inside a comfortable sweep while still requiring the turn.
 */
const ARC = Math.PI * 0.34;

export type ChipPlacement = {
  position: THREE.Vector3;
  /** Y rotation that turns the chip to face the viewer. */
  rotationY: number;
  /** Angle from centre, for driving the camera toward a chip. */
  angle: number;
};

export function chipPlacement(index: number): ChipPlacement {
  const count = PROJECTS.length;

  /*
   * Spread across the arc with the set centred on straight ahead. Dividing by
   * (count - 1) puts the first and last chips exactly on the arc's edges,
   * rather than leaving a half-step of padding at each end.
   */
  const t = count === 1 ? 0.5 : index / (count - 1);
  const angle = (t - 0.5) * ARC;

  return {
    position: new THREE.Vector3(
      HALL_CENTRE.x + Math.sin(angle) * RADIUS,
      HALL_CENTRE.y,
      HALL_CENTRE.z - Math.cos(angle) * RADIUS,
    ),
    /*
     * Negated, so the arc faces inward.
     *
     * A chip sits at +angle around the viewer, so squaring it to them means
     * rotating back by that same amount. Using +angle turns it the other way
     * — twice as far from the viewer as leaving it unrotated would — and the
     * outer chips present their edges rather than their faces.
     */
    rotationY: -angle,
    angle,
  };
}

/** Chip dimensions, in world units. */
export const CHIP = {
  width: 1.15,
  height: 1.5,
  depth: 0.05,
} as const;

/** How the chip moves when hovered. */
export const CHIP_HOVER = {
  /** Toward the viewer, along the chip's own facing. */
  forward: 0.42,
  lift: 0.12,
  scale: 1.18,
  /** Exponential ease rates; opening quicker than settling back. */
  inRate: 9,
  outRate: 6,
} as const;

/**
 * How far the camera turns to follow the cursor.
 *
 * Exactly the arc's half-width, so the cursor at the edge of the screen looks
 * straight at the outermost chip. Turning further overshoots: the chip swings
 * past centre and ends up beside the cursor rather than under it, so it can
 * never be hovered — which is the whole point of looking at it.
 */
export const LOOK = {
  yaw: ARC * 0.5,
  pitch: 0.13,
  /** Damping rate — low enough to feel like a head, not a gimbal. */
  rate: 2.6,
} as const;
