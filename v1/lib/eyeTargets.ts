import { EYE_RADIUS, type EyePart, type EyeSource } from "./eyeGeometry";

/**
 * Assemble two eyes into the single interleaved point cloud the morph field
 * consumes.
 *
 * The hard rule inherited from morphTargets.ts: the returned buffers are
 * exactly N*3 (or N) for the same N as every other stage. aTree, aScatter and
 * aSeed are index-matched to this cloud, and the vertex shader lerps
 * index-to-index — a different N would tear the morph apart.
 */

/** Part tags as the shader sees them. Must match the branches in morph.glsl. */
export const PART_SCLERA = 0;
export const PART_IRIS = 1;
export const PART_PUPIL = 2;
export const PART_LID = 3;

/**
 * Budget split per eye.
 *
 * Weighted by *area*, not importance. The pupil is the smallest surface on the
 * eye, so giving it a large share concentrates points into a tiny disc that
 * additive blending saturates to flat white. It earns its prominence from the
 * brightness ramp in the fragment shader instead.
 */
const SPLIT: Record<EyePart, number> = {
  sclera: 0.42,
  iris: 0.28,
  pupil: 0.02,
  lidUpper: 0.18,
  lidLower: 0.1,
};

/**
 * Horizontal offset of each eye from the assembly centre. Just over two radii,
 * so the eyes sit adjacent with a slim gap rather than touching.
 */
export const EYE_SEPARATION = EYE_RADIUS * 2.35;

/**
 * Polar angle of each lid's leading edge in the open pose. Must match the
 * upper lid's `to` in eyeGeometry — it is the widest arc either lid spans.
 */
const LID_MARGIN_POLAR = 0.78;

/**
 * Polar angle the margin rotates to when shut. Just past the equator (PI/2)
 * so the two lids overlap slightly and leave no seam down the middle.
 */
const CLOSED_POLAR = 1.72;

function THREE_CLAMP(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export type EyeCloud = {
  positions: Float32Array;
  normals: Float32Array;
  /** -1 left eye, +1 right. Selects which gaze quaternion applies. */
  eye: Float32Array;
  /** PART_* tag. Drives gaze rotation and the brightness ramp. */
  part: Float32Array;
  /**
   * Closed-pose polar angle, signed by lid: positive for the upper lid,
   * negative for the lower, 0 for non-lid particles. The shader interpolates
   * each point from its open angle to this one, so it is a destination rather
   * than a delta.
   */
  lid: Float32Array;
  /** This particle's eye centre in assembly space, so the shader can rotate
   *  a point about its own eye rather than the group origin. */
  socket: Float32Array;
  /**
   * Distance from the assembly centre to each eye centre, *after* scaling.
   *
   * The gaze solve needs this to aim each eye from where it actually sits.
   * EYE_SEPARATION is the pre-scale constant and does not survive the fit —
   * using it directly would offset every gaze angle.
   */
  separation: number;
};

/**
 * Build the full two-eye cloud.
 *
 * `targetWidth` scales the finished assembly to occupy the slot the bust used.
 *
 * Width, not height, is the constraint that matters here. sampleMesh
 * normalised the bust's *height* because a head is taller than it is wide, so
 * height was what filled the frame. A side-by-side pair of eyes is the
 * opposite: roughly 3.3 times wider than tall. Normalising its height would
 * scale it up by that ratio and throw the eyes clean off both edges of the
 * viewport.
 */
export function eyePositions(
  source: EyeSource,
  n: number,
  targetWidth = 2.9,
): EyeCloud {
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const eye = new Float32Array(n);
  const part = new Float32Array(n);
  const lid = new Float32Array(n);
  const socket = new Float32Array(n * 3);

  const parts = Object.keys(SPLIT) as EyePart[];

  // Per-eye budget, with the remainder pushed into the last part so the
  // buffers fill exactly — a short cloud would leave dead particles at the
  // origin, which additive blending would show as a bright dot.
  const perEye = Math.floor(n / 2);
  const counts = parts.map((p) => Math.floor(perEye * SPLIT[p]));
  const assigned = counts.reduce((a, b) => a + b, 0);
  counts[counts.length - 1] += perEye - assigned;

  let w = 0;

  for (const side of [-1, 1] as const) {
    // The right eye gets the leftover odd particle when n is not even.
    const budget = side === 1 ? n - perEye : perEye;
    const extra = budget - perEye;
    const cx = side * EYE_SEPARATION;

    parts.forEach((p, pi) => {
      const count = counts[pi] + (pi === parts.length - 1 ? extra : 0);
      const cloud = source.sample(p, count);

      const tag =
        p === "sclera" ? PART_SCLERA
        : p === "iris" ? PART_IRIS
        : p === "pupil" ? PART_PUPIL
        : PART_LID;

      for (let i = 0; i < count; i++, w++) {
        positions[w * 3] = cloud.positions[i * 3] + cx;
        positions[w * 3 + 1] = cloud.positions[i * 3 + 1];
        positions[w * 3 + 2] = cloud.positions[i * 3 + 2];

        normals[w * 3] = cloud.normals[i * 3];
        normals[w * 3 + 1] = cloud.normals[i * 3 + 1];
        normals[w * 3 + 2] = cloud.normals[i * 3 + 2];

        socket[w * 3] = cx;
        socket[w * 3 + 1] = 0;
        socket[w * 3 + 2] = 0;

        eye[w] = side;
        part[w] = tag;

        if (tag === PART_LID) {
          /*
           * The polar angle this point closes to, signed by which lid it is.
           *
           * The shader interpolates each point from its open polar angle to
           * this one, so the value is a destination, not a delta. Storing the
           * target keeps the closed pose exact: the margin lands precisely at
           * CLOSED_POLAR however the open arc is later retuned.
           *
           * The gradient — margin travels furthest, pole barely moves — is
           * what makes the lid unroll over the eye instead of sliding across
           * it as a rigid cap.
           */
          const py = cloud.positions[i * 3 + 1];
          const pz = cloud.positions[i * 3 + 2];
          const px = cloud.positions[i * 3];
          const radius = Math.max(1e-6, Math.hypot(px, py, pz));
          // Angle from this lid's own pole, 0 at the pole outward.
          const polar = Math.acos(
            THREE_CLAMP((p === "lidUpper" ? py : -py) / radius, -1, 1),
          );
          const frac = THREE_CLAMP(polar / LID_MARGIN_POLAR, 0, 1);
          // Pole stays put; margin reaches CLOSED_POLAR.
          const target = polar + (CLOSED_POLAR - polar) * frac;
          lid[w] = p === "lidUpper" ? target : -target;
        }
      }
    });
  }

  // Scale the finished assembly to the requested width, so the pair occupies
  // the horizontal slot the bust used between the two text columns.
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  const scale = targetWidth / Math.max(1e-6, maxX - minX);

  for (let i = 0; i < n; i++) {
    positions[i * 3] *= scale;
    positions[i * 3 + 1] *= scale;
    positions[i * 3 + 2] *= scale;
    socket[i * 3] *= scale;
    socket[i * 3 + 1] *= scale;
    socket[i * 3 + 2] *= scale;
  }

  return { positions, normals, eye, part, lid, socket, separation: EYE_SEPARATION * scale };
}
