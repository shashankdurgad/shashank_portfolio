/**
 * Mutable scroll state, deliberately outside React.
 *
 * ScrollTrigger writes here on every scroll tick and `useFrame` reads it.
 * Going through `setState` would re-render React 60x/sec — this keeps the
 * hot path free of renders entirely.
 */
export const scroll = {
  /** 0..1 across the whole page */
  progress: 0,
  /** index of the section currently nearest the camera */
  section: 0,
  /**
   * 0..3 across the morph region: attractor → molecules → sphere → tree.
   * Driven by its own ScrollTrigger, independent of page progress.
   */
  morph: 0,
  /**
   * 0..1 across the work & education timeline region, driven by its own
   * ScrollTrigger. Independent of `morph` so the two regions can be paced
   * separately.
   */
  timeline: 0,
  /**
   * 0 outside a door, 1 fully through it. Eased by the rig each frame.
   *
   * Lives here rather than beside the door's React state for the same reason
   * the values above do — it changes every frame and only the frame loop reads
   * it. Keeping it here also means the timeline can react to the flight
   * without importing the door module, which would make the two mutually
   * dependent: the flight already reads the timeline's curve.
   */
  doorFlight: 0,
  /**
   * Which door the flight belongs to: "left", "right", or null at rest.
   *
   * Distinct from the store's `entered`, which clears the instant Back is
   * pressed. The flight out takes most of a second after that, and the scene
   * behind the doorway has to stay drawn for the whole of it — keyed on
   * `entered` alone, the timeline and the hall blinked out on the click and
   * the viewer zoomed out of an empty doorway. Cleared once the flight has
   * fully unwound.
   */
  doorSide: null as "left" | "right" | null,
};

export type ScrollState = typeof scroll;
