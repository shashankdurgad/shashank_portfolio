import * as THREE from "three";

/**
 * Two doors — the morph's final stage.
 *
 * Real geometry rather than particles, unlike every stage before it. A door is
 * a flat panel with a hard edge, and additive particles have no shading to
 * render an edge with: the same limitation that defeated an attempt at a brain
 * earlier would make a particle door a fuzzy glowing rectangle. Panels are
 * meshes; the particle field becomes the atmosphere around them instead.
 *
 * The affordance and the visual are the same object here, which is what the
 * abstract shapes kept failing at — a labelled door needs no interpretation.
 */

/**
 * Centre of the doorway pair, in the field's local space.
 *
 * Zero, not an offset. The field already sits at world y=1.5, which is exactly
 * where the camera looks — so any lift here stacks on top of that and pushes
 * the doors above the frame's centre. At 1.0 they sat some 265px high, with an
 * empty expanse of floor beneath them.
 */
export const DOOR_CENTRE = new THREE.Vector3(0, 0, 0);

/** Panel dimensions. */
export const DOOR = {
  width: 1.15,
  height: 1.95,
  /**
   * Thickness. Not cosmetic: the camera is head-on, so an open door is seen
   * nearly edge-on and a paper-thin panel would vanish at full swing.
   */
  depth: 0.06,
} as const;

/** Gap between the two closed doors, where they meet at the centre. */
export const DOOR_GAP = 0.06;

/**
 * X of a door's hinge — its outer edge.
 *
 * Hinging outside means the doors swing away from each other. Hinged on the
 * inner edge they would swing into one another and collide at the midline.
 */
export function hingeX(side: number): number {
  return side * (DOOR_GAP / 2 + DOOR.width);
}

/**
 * Swing angles, in radians.
 *
 * Stopping short of a right angle is deliberate. At 90° a thin panel presents
 * its edge to a head-on camera and all but disappears; a little under keeps
 * the face catching light and the door legible as open.
 */
export const ANGLES = {
  rest: 0,
  /** Hover: a peek, enough to read as responsive without committing. */
  peek: 0.32,
  /** Click: fully open. */
  open: 1.62,
} as const;

/**
 * Opening speed, as exponential-ease rates.
 *
 * Opening is quicker than closing: a door should answer promptly and settle
 * back unhurriedly. The reverse feels sluggish then twitchy.
 */
export const SWING = {
  opening: 7.5,
  closing: 4.5,
} as const;

export const LABELS = {
  left: "WORK & EDUCATION",
  right: "PROJECTS",
} as const;
