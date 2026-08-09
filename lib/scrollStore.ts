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
};

export type ScrollState = typeof scroll;
