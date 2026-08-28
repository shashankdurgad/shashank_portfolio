import { rng } from "./morphTargets";

/**
 * Where a particle sits on the eye. Drives both the gaze rotation (only iris
 * and pupil turn) and the brightness ramp in the fragment shader.
 */
export type EyePart = "sclera" | "iris" | "pupil" | "lidUpper" | "lidLower";

/** A sampled part, in the eye's own local space with the eye centred at origin. */
export type PartCloud = {
  positions: Float32Array;
  normals: Float32Array;
};

/**
 * The seam between "what an eye is made of" and "how it is drawn".
 *
 * Everything downstream — assembly, attributes, shader — consumes tagged point
 * clouds and never learns where they came from. Swapping the procedural source
 * for one backed by a GLB is a single line in MorphField; see GltfEyeSource in
 * the plan notes. That is the whole reason this indirection exists.
 */
export interface EyeSource {
  sample(part: EyePart, n: number): PartCloud;
}

/** Eyeball radius in local units. Everything else is expressed relative to it. */
export const EYE_RADIUS = 0.5;

/**
 * How far the iris disc sits from the eye centre, as a fraction of radius.
 * Below 1.0 so the iris reads as inset into the sclera rather than floating
 * off the front of it.
 */
const IRIS_DEPTH = 0.86;

/** Angular half-width of the iris, from the forward axis. */
const IRIS_ANGLE = 0.62;

/** Angular half-width of the pupil. Sits inside IRIS_ANGLE. */
const PUPIL_ANGLE = 0.3;

/**
 * Lids ride slightly proud of the eyeball. With additive blending there is no
 * z-fighting to avoid, but the gap keeps the closed silhouette from being
 * eaten by the sclera underneath it.
 */
const LID_RADIUS = EYE_RADIUS * 1.04;

/**
 * How much of the sclera's front cap is omitted, as a z threshold — the iris
 * and pupil occupy that area, and stacking a dim wash under the brightest part
 * of the eye flattens exactly the feature that has to read.
 *
 * Only the area the iris actually covers is removed. Cutting further back
 * leaves the sclera as a hollow rim with nothing between it and the iris, so
 * the eye reads as a ring rather than a ball.
 */
const SCLERA_FRONT_CUT = 0.86;

/**
 * Procedural eyes: spheres, annuli and spherical caps.
 *
 * Every point carries a true outward normal. The explosion stage in the vertex
 * shader drives displacement off `aNormal`, so a cloud with absent or fudged
 * normals would burst in the wrong directions and the morph would come apart.
 */
export class ProceduralEyeSource implements EyeSource {
  private seed: number;

  constructor(seed = 17) {
    this.seed = seed;
  }

  sample(part: EyePart, n: number): PartCloud {
    switch (part) {
      case "sclera":
        return this.sphereShell(n);
      case "iris":
        return this.disc(n, PUPIL_ANGLE, IRIS_ANGLE);
      case "pupil":
        return this.disc(n, 0, PUPIL_ANGLE);
      case "lidUpper":
        return this.lidCap(n, +1);
      case "lidLower":
        return this.lidCap(n, -1);
    }
  }

  /**
   * Sphere surface with the forward cap removed.
   *
   * Sampling z uniformly (rather than the polar angle) is what keeps density
   * even — going through theta directly would pile points at the poles.
   */
  private sphereShell(n: number): PartCloud {
    const r = rng(this.seed);
    const positions = new Float32Array(n * 3);
    const normals = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, z = 0;
      // Reject into the visible shell. Bounded so a bad cut can't spin forever.
      for (let tries = 0; tries < 32; tries++) {
        const u = r() * 2 - 1;
        const theta = r() * Math.PI * 2;
        const s = Math.sqrt(Math.max(0, 1 - u * u));
        x = s * Math.cos(theta);
        y = u;
        z = s * Math.sin(theta);
        if (z < SCLERA_FRONT_CUT) break;
      }

      positions[i * 3] = x * EYE_RADIUS;
      positions[i * 3 + 1] = y * EYE_RADIUS;
      positions[i * 3 + 2] = z * EYE_RADIUS;
      normals[i * 3] = x;
      normals[i * 3 + 1] = y;
      normals[i * 3 + 2] = z;
    }

    return { positions, normals };
  }

  /**
   * An annulus laid on the eyeball's forward surface, between two polar
   * angles. `inner = 0` yields a filled disc, which is how the pupil is made.
   *
   * Points sit at IRIS_DEPTH rather than on the sphere itself so the iris is
   * a shallow inset plate — a real iris is behind the cornea, and the small
   * offset is enough to read as depth once the gaze starts moving.
   */
  private disc(n: number, inner: number, outer: number): PartCloud {
    const r = rng(this.seed + (inner === 0 ? 3 : 5));
    const positions = new Float32Array(n * 3);
    const normals = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      // sqrt keeps area density even; without it points crowd the centre.
      const t = Math.sqrt(r());
      const angle = inner + (outer - inner) * t;
      const phi = r() * Math.PI * 2;

      const s = Math.sin(angle);
      const x = s * Math.cos(phi);
      const y = s * Math.sin(phi);
      const z = Math.cos(angle);

      positions[i * 3] = x * EYE_RADIUS * IRIS_DEPTH;
      positions[i * 3 + 1] = y * EYE_RADIUS * IRIS_DEPTH;
      positions[i * 3 + 2] = z * EYE_RADIUS * IRIS_DEPTH;
      normals[i * 3] = x;
      normals[i * 3 + 1] = y;
      normals[i * 3 + 2] = z;
    }

    return { positions, normals };
  }

  /**
   * A lid: the band of the front hemisphere it sweeps through when closing.
   *
   * Generated in the *open* pose. The shader rotates each point down by uBlink
   * scaled by its own sweep parameter, so the lid unrolls over the eye instead
   * of sliding as a rigid plate. `sign` is +1 for the upper lid, -1 for lower.
   *
   * Restricted to the front hemisphere. Sweeping phi through a full circle
   * wraps the lid around the back of the eyeball too, which renders as a
   * filled dome capping the whole top half — a beanie rather than a lid, with
   * a hard horizontal edge across the eye where the cap ends.
   */
  private lidCap(n: number, sign: number): PartCloud {
    const r = rng(this.seed + (sign > 0 ? 7 : 11));
    const positions = new Float32Array(n * 3);
    const normals = new Float32Array(n * 3);

    /*
     * How far down from the pole the lid reaches, as a polar angle.
     *
     * Starts at the pole (0) rather than part-way down: leaving a gap there
     * shows as a dark ring band across the open eye, because the lid's own
     * particles are what cover that part of the sclera.
     *
     * The far edge stays well short of the iris (IRIS_ANGLE, 0.62) so an open
     * lid never sits over the pupil — it is a hood above the eye, and only
     * reaches across once the blink rotates it down.
     */
    const from = 0;
    const to = sign > 0 ? 0.78 : 0.62;

    for (let i = 0; i < n; i++) {
      const polar = from + (to - from) * r();
      // Front hemisphere only: phi in [0, PI] puts every point at z >= 0.
      const phi = r() * Math.PI;

      const s = Math.sin(polar);
      const x = s * Math.cos(phi);
      const y = Math.cos(polar) * sign;
      const z = s * Math.sin(phi);

      positions[i * 3] = x * LID_RADIUS;
      positions[i * 3 + 1] = y * LID_RADIUS;
      positions[i * 3 + 2] = z * LID_RADIUS;
      normals[i * 3] = x;
      normals[i * 3 + 1] = y * sign;
      normals[i * 3 + 2] = z;
    }

    return { positions, normals };
  }
}
