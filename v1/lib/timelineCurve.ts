import * as THREE from "three";
import { rng } from "./morphTargets";
import { TIMELINE } from "./timelineData";

/**
 * The path the timeline runs along, and where its nodes sit.
 *
 * A curve receding into depth rather than a flat line across the screen. The
 * reference for this is the Ancient One's timeline in Doctor Strange: a thread
 * that travels away from the viewer, so scrolling reads as moving *along* it
 * rather than panning across a diagram.
 */

/** Spacing between consecutive nodes, along the path. */
const STEP = 3.4;

/** How far the path wanders side to side and vertically as it recedes. */
const WANDER_X = 1.5;
const WANDER_Y = 0.55;

/**
 * Control points, one per entry plus a lead-in and run-out.
 *
 * The extra points at either end matter: a Catmull-Rom curve interpolates
 * between its interior points but only approaches the outermost ones, so
 * without them the first and last nodes would sit on a visibly straighter
 * stretch than the rest.
 */
function controlPoints(): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const n = TIMELINE.length;

  for (let i = -1; i <= n; i++) {
    const t = i / (n - 1);
    pts.push(
      new THREE.Vector3(
        Math.sin(t * Math.PI * 1.35) * WANDER_X,
        Math.sin(t * Math.PI * 2.1) * WANDER_Y,
        -i * STEP,
      ),
    );
  }
  return pts;
}

export const timelineCurve = new THREE.CatmullRomCurve3(controlPoints(), false, "catmullrom", 0.4);

/**
 * Curve parameter for each entry, 0..1.
 *
 * Offset past the lead-in control point so node 0 lands on the curve proper
 * rather than at its very start, where the tangent is still settling.
 */
export function nodeT(index: number): number {
  const n = TIMELINE.length;
  return (index + 1) / (n + 1);
}

/** World position of a node. */
export function nodePosition(index: number, out = new THREE.Vector3()): THREE.Vector3 {
  return timelineCurve.getPoint(nodeT(index), out);
}

/**
 * Which side of the path a node's label sits on.
 *
 * Alternating keeps consecutive labels from overlapping as the path recedes
 * and successive nodes draw closer together in screen space.
 */
export function nodeSide(index: number): -1 | 1 {
  return index % 2 === 0 ? -1 : 1;
}

/**
 * Sample the curve into a particle cloud.
 *
 * This is the buffer the door halo settles into, so it has to be exactly N*3
 * like every other morph target — the vertex shader lerps index-to-index and
 * a mismatched length would tear the transition apart.
 *
 * Particles cluster tightly around the line with a few straying wider, which
 * is what gives it the drawn-in-the-air quality of the reference rather than
 * the hard edge of a rendered tube.
 */
export function timelinePositions(n: number, seed = 71): Float32Array {
  const out = new Float32Array(n * 3);
  const r = rng(seed);
  const p = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    const t = r();
    timelineCurve.getPoint(t, p);

    // Most particles hug the line; the tail drifts out as a soft glow.
    const loose = r() > 0.82;
    const spread = loose ? 0.42 : 0.055;
    const falloff = Math.pow(r(), loose ? 1.0 : 2.2) * spread;

    // Uniform direction, so the scatter is a tube rather than a ribbon.
    const u = r() * 2 - 1;
    const theta = r() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - u * u));

    out[i * 3] = p.x + s * Math.cos(theta) * falloff;
    out[i * 3 + 1] = p.y + u * falloff;
    out[i * 3 + 2] = p.z + s * Math.sin(theta) * falloff;
  }

  return out;
}

/** Total length of the path, for pacing the scroll region. */
export const TIMELINE_LENGTH = timelineCurve.getLength();
