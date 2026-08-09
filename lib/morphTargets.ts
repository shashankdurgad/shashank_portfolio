import * as THREE from "three";

/**
 * Position buffers for every stage of the morph sequence.
 *
 * The hard rule: every generator returns a Float32Array of exactly N*3. The
 * vertex shader lerps index-to-index between stages, so mismatched lengths
 * would tear the morph apart. Stages with fewer natural points repeat and
 * jitter to fill; stages with more are subsampled.
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
/* Stage 0 — Lorenz attractor                                          */

const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;

/**
 * Integrate the Lorenz system with RK4.
 * Shared with the hero attractor so both describe the same object.
 */
export function lorenzPath(steps: number, dt: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  let x = 0.01;
  let y = 0;
  let z = 0;

  const d = (px: number, py: number, pz: number) => [
    SIGMA * (py - px),
    px * (RHO - pz) - py,
    px * py - BETA * pz,
  ];

  // Discard the transient so the curve starts on the attractor itself.
  for (let i = 0; i < 400; i++) {
    const [dx, dy, dz] = d(x, y, z);
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
  }

  for (let i = 0; i < steps; i++) {
    const [k1x, k1y, k1z] = d(x, y, z);
    const [k2x, k2y, k2z] = d(x + (k1x * dt) / 2, y + (k1y * dt) / 2, z + (k1z * dt) / 2);
    const [k3x, k3y, k3z] = d(x + (k2x * dt) / 2, y + (k2y * dt) / 2, z + (k2z * dt) / 2);
    const [k4x, k4y, k4z] = d(x + k3x * dt, y + k3y * dt, z + k3z * dt);

    x += ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6;
    y += ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6;
    z += ((k1z + 2 * k2z + 2 * k3z + k4z) * dt) / 6;

    pts.push(new THREE.Vector3(x * 0.055, (z - 25) * 0.055, y * 0.055));
  }
  return pts;
}

/** Resample the attractor curve to exactly n points. */
export function attractorPositions(n: number, seed = 7): Float32Array {
  const path = lorenzPath(Math.max(n, 2000), 0.006);
  const out = new Float32Array(n * 3);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const p = path[Math.floor((i / n) * path.length)];
    // Slight scatter so the curve reads as a cloud rather than a hard wire.
    out[i * 3] = p.x + (r() - 0.5) * 0.02;
    out[i * 3 + 1] = p.y + (r() - 0.5) * 0.02;
    out[i * 3 + 2] = p.z + (r() - 0.5) * 0.02;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Stage 1 — molecules                                                 */

/**
 * Clusters of atoms: each is a nucleus with electrons on a tilted ring.
 * Particles are dealt round-robin across clusters so the disintegration
 * from the attractor scatters evenly rather than peeling off in blocks.
 */
export function moleculePositions(n: number, seed = 21): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rng(seed);
  const clusters = 26;

  const centres = Array.from({ length: clusters }, () => ({
    c: new THREE.Vector3((r() - 0.5) * 3.4, (r() - 0.5) * 2.2, (r() - 0.5) * 2.4),
    radius: 0.18 + r() * 0.22,
    tilt: r() * Math.PI,
    yaw: r() * Math.PI * 2,
  }));

  for (let i = 0; i < n; i++) {
    const m = centres[i % clusters];
    const local = i / clusters;

    if (local % 7 < 1) {
      // Nucleus: tight blob at the centre.
      out[i * 3] = m.c.x + (r() - 0.5) * 0.05;
      out[i * 3 + 1] = m.c.y + (r() - 0.5) * 0.05;
      out[i * 3 + 2] = m.c.z + (r() - 0.5) * 0.05;
    } else {
      // Electron shell: point on a tilted ring.
      const a = r() * Math.PI * 2;
      const rx = Math.cos(a) * m.radius;
      const ry = Math.sin(a) * m.radius;
      const ct = Math.cos(m.tilt);
      const st = Math.sin(m.tilt);
      const cy = Math.cos(m.yaw);
      const sy = Math.sin(m.yaw);
      out[i * 3] = m.c.x + rx * cy - ry * st * sy;
      out[i * 3 + 1] = m.c.y + ry * ct;
      out[i * 3 + 2] = m.c.z + rx * sy + ry * st * cy;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Stage 2 — sphere                                                    */

/**
 * Fibonacci sphere: even distribution with no clumping at the poles,
 * which naive lat/long sampling produces.
 */
export function spherePositions(n: number, radius = 1.35): Float32Array {
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Stage 3 — recursive fractal tree                                    */

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
      const spread = 0.26 + r() * 0.16;
      const lean = i === 0 ? -spread : spread;
      const next = dir
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), lean)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), (r() - 0.5) * 0.7)
        .normalize();

      // Depth 0 is the trunk; its two children define left and right. The
      // trunk itself keeps side 0 so it never highlights with either half.
      const childSide = depth === 0 ? (i === 0 ? -1 : 1) : side;
      grow(end, next, len * (0.76 + r() * 0.06), depth + 1, childSide);
    }
  };

  grow(new THREE.Vector3(0, -1.15, 0), new THREE.Vector3(0, 1, 0), 0.62, 0, 0);
  return branches;
}

/**
 * Sample points along the branches. Returns positions plus a per-particle
 * side attribute (-1 / +1) used for the two interactive halves.
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
export const PARTICLES = { high: 12000, low: 4000 } as const;

export type MorphBuffers = {
  attractor: Float32Array;
  molecule: Float32Array;
  sphere: Float32Array;
  tree: Float32Array;
  sides: Float32Array;
  count: number;
};

/** Build every stage at once, guaranteeing identical lengths. */
export function buildMorphBuffers(count: number): MorphBuffers {
  const { positions: tree, sides } = treePositions(count);
  return {
    attractor: attractorPositions(count),
    molecule: moleculePositions(count),
    sphere: spherePositions(count),
    tree,
    sides,
    count,
  };
}
