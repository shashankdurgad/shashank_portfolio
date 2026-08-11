/**
 * Shared helpers and buffers for the morph sequence.
 *
 * Sequence: eyes → explosion → doors. The eyes are generated in
 * lib/eyeGeometry.ts and assembled in lib/eyeTargets.ts; the doors are meshes
 * (components/canvas/Doors.tsx) with the cloud settling into a halo around
 * them (lib/haloTargets.ts). What remains here is what those stages share.
 *
 * The hard rule: every buffer is exactly N*3. The vertex shader lerps
 * index-to-index between stages, so mismatched lengths would tear the morph
 * apart.
 */

/** Deterministic PRNG so the scene is identical across reloads. */
export function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */

/**
 * Particle count per quality tier. Same N across every stage.
 *
 * Raised alongside the smaller sprite size in MorphField: finer grain needs
 * more points to keep the cloud reading as a volume rather than a spray. The
 * cost is close to free — these are unlit, untextured points with no per-frame
 * buffer rewrites, so the whole morph stays a single draw call whatever N is.
 */
export const PARTICLES = { high: 70000, low: 20000 } as const;

/**
 * Per-particle random unit direction, used to scatter the explosion so the
 * burst is chaotic rather than a clean radial puff.
 */
export function scatterDirections(n: number, seed = 91): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    // Uniform on the sphere: inverting cos avoids clustering at the poles.
    const u = r() * 2 - 1;
    const theta = r() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    out[i * 3] = s * Math.cos(theta);
    out[i * 3 + 1] = u;
    out[i * 3 + 2] = s * Math.sin(theta);
  }
  return out;
}
