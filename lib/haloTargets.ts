import { rng } from "./morphTargets";
import { DOOR, DOOR_CENTRE, DOOR_GAP } from "./doors";

/**
 * Final-stage particle target: a halo hugging the doorway's perimeter.
 *
 * This is only where particles come to *rest*. The explosion before it is
 * procedural — driven off each particle's own surface normal in the vertex
 * shader — so shaping this buffer does not put a shape back into the burst.
 * An earlier version conflated the two and made the explosion resolve into a
 * wing outline; keeping them separate is what allows a formless dispersal to
 * settle into a deliberate frame.
 *
 * The doors themselves are geometry. The cloud only has to outline the opening
 * they sit in, which is the one job a shadeless point cloud does well.
 */

/** How far past the doorway edge the halo reaches. */
const SPREAD = 0.55;

/** Fraction of particles held tight to the outline versus drifting loose. */
const TIGHT = 0.72;

/** Total width of both doors plus the gap between them. */
const APERTURE_W = DOOR.width * 2 + DOOR_GAP;

export function haloPositions(
  n: number,
  seed = 33,
): { positions: Float32Array; sides: Float32Array } {
  const positions = new Float32Array(n * 3);
  const sides = new Float32Array(n);
  const r = rng(seed);

  const halfW = APERTURE_W / 2;
  const halfH = DOOR.height / 2;
  // Perimeter split, so particles spread evenly rather than bunching on the
  // short edges: each side gets share proportional to its length.
  const perim = 2 * (APERTURE_W + DOOR.height);

  for (let i = 0; i < n; i++) {
    // Walk the rectangle's perimeter by arc length.
    let t = r() * perim;
    let px: number;
    let py: number;

    if (t < APERTURE_W) {
      px = -halfW + t;
      py = halfH;
    } else if ((t -= APERTURE_W) < DOOR.height) {
      px = halfW;
      py = halfH - t;
    } else if ((t -= DOOR.height) < APERTURE_W) {
      px = halfW - t;
      py = -halfH;
    } else {
      t -= APERTURE_W;
      px = -halfW;
      py = -halfH + t;
    }

    /*
     * Push outward from the edge, densest right against it. Most particles
     * stay tight so the outline reads; the rest drift further for atmosphere,
     * which keeps the halo from looking like a drawn rectangle.
     */
    const loose = r() > TIGHT;
    const out = Math.pow(r(), loose ? 0.9 : 2.4) * SPREAD * (loose ? 2.6 : 1);

    // Outward normal from the doorway centre.
    const len = Math.hypot(px, py) || 1;

    positions[i * 3] = DOOR_CENTRE.x + px + (px / len) * out + (r() - 0.5) * 0.1;
    positions[i * 3 + 1] = DOOR_CENTRE.y + py + (py / len) * out + (r() - 0.5) * 0.1;
    /*
     * Spread through depth around the door plane rather than sitting on it.
     * Biased behind, so the halo mostly reads as depth beyond the opening
     * instead of a haze over the labels.
     */
    positions[i * 3 + 2] = DOOR_CENTRE.z - r() * 0.75 + 0.12;

    sides[i] = positions[i * 3] < DOOR_CENTRE.x ? -1 : 1;
  }

  return { positions, sides };
}
