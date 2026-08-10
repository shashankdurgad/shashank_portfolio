import * as THREE from "three";

/**
 * Position buffers for every stage of the morph sequence.
 *
 * Sequence: face → explosion → tree. The face comes from sampling a mesh at
 * runtime (see lib/faceSampler.ts); the tree is generated here.
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
/* Stage 2 — recursive fractal tree (final)                                    */

/** Angle between the two trunks, in degrees. */
export const TREE_SPREAD_DEG = 65;

type Branch = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  depth: number;
  /** -1 left of trunk, +1 right. Set by the first split, inherited after. */
  side: number;
};

/**
 * Grow a binary branching tree. The first split assigns each subtree to a
 * side, which every descendant inherits — that tagging is what makes the
 * two clickable halves possible.
 */
function growBranches(maxDepth: number, seed: number): Branch[] {
  const r = rng(seed);
  const branches: Branch[] = [];

  const grow = (
    start: THREE.Vector3,
    dir: THREE.Vector3,
    len: number,
    depth: number,
    side: number,
  ) => {
    const end = start.clone().addScaledVector(dir, len);
    branches.push({ start: start.clone(), end, depth, side });
    if (depth >= maxDepth) return;

    const children = 2;
    for (let i = 0; i < children; i++) {
      // Spread children apart in the XY plane, with a little Z wander so the
      // tree has depth instead of being flat.
      const spread = 0.20 + r() * 0.12;
      const lean = i === 0 ? -spread : spread;
      const next = dir
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), lean)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 0.7)
        .normalize();

      // Every particle inherits the side of the tree it belongs to, set once
      // at the root — the two trees are the two buttons.
      grow(end, next, len * (0.76 + r() * 0.06), depth + 1, side);
    }
  };

  /**
   * Two trees from a shared base, splayed apart. Previously this was one tree
   * tagged left/right at its first split, but the two halves were visually
   * indistinguishable — separate trunks make each one read as its own target.
   */
  const base = new THREE.Vector3(0, -1.15, 0);
  const half = (TREE_SPREAD_DEG * Math.PI) / 180 / 2;
  const lean = (a: number) =>
    new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), a).normalize();

  grow(base.clone(), lean(half), 0.62, 0, -1); // leans left
  grow(base.clone(), lean(-half), 0.62, 0, 1); // leans right
  return branches;
}

/**
 * Sample points along the branches. Returns positions plus a per-particle
 * side attribute (-1 left tree / +1 right tree) used for the two hit targets.
 */
export function treePositions(
  n: number,
  seed = 33,
): { positions: Float32Array; sides: Float32Array } {
  const branches = growBranches(8, seed);
  const positions = new Float32Array(n * 3);
  const sides = new Float32Array(n);
  const r = rng(seed + 1);

  // Weight sampling toward thinner outer branches so the canopy is dense
  // and the trunk stays a clean line.
  const weights = branches.map((b) => 1 + b.depth * 1.6);
  const total = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < n; i++) {
    let pick = r() * total;
    let bi = 0;
    while (bi < branches.length - 1 && pick > weights[bi]) {
      pick -= weights[bi];
      bi++;
    }
    const b = branches[bi];
    const t = r();
    const jitter = 0.012 + b.depth * 0.004;

    positions[i * 3] = b.start.x + (b.end.x - b.start.x) * t + (r() - 0.5) * jitter;
    positions[i * 3 + 1] = b.start.y + (b.end.y - b.start.y) * t + (r() - 0.5) * jitter;
    positions[i * 3 + 2] = b.start.z + (b.end.z - b.start.z) * t + (r() - 0.5) * jitter;
    sides[i] = b.side;
  }

  return { positions, sides };
}

/* ------------------------------------------------------------------ */

/** Particle count per quality tier. Same N across every stage. */
export const PARTICLES = { high: 40000, low: 12000 } as const;

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
