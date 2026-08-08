import * as THREE from "three";
import { projects } from "@/content/projects";
import { roles } from "@/content/resume";

export type SectionId =
  | "hero"
  | "about"
  | "experience"
  | "projects"
  | "skills"
  | "contact";

export type Stop = {
  id: string;
  /** Which page section this stop belongs to. */
  section: SectionId;
  /** Index of the item within its section (roles, projects...), or 0. */
  item: number;
};

/**
 * The bay is laid out along -Z. Every stop is one dolly position.
 * Stops are *derived* from the content arrays, so adding a project or a
 * role lengthens the path automatically — no waypoint is hand-written.
 */
export function buildStops(): Stop[] {
  return [
    { id: "hero", section: "hero", item: 0 },
    { id: "about", section: "about", item: 0 },
    ...roles.map((r, i) => ({
      id: `exp-${r.id}`,
      section: "experience" as const,
      item: i,
    })),
    ...projects.map((p, i) => ({
      id: `proj-${p.id}`,
      section: "projects" as const,
      item: i,
    })),
    { id: "skills", section: "skills", item: 0 },
    { id: "contact", section: "contact", item: 0 },
  ];
}

export const STOPS = buildStops();

/** Distance along -Z between consecutive stops. */
export const STOP_SPACING = 14;

/** The hoist sits at the bay centre; the camera tracks past it. */
export const HOIST_POSITION = new THREE.Vector3(0, 0.6, 0);

/** Wall panels live to the camera's left, angled inward. */
export const WALL_X = -6.2;
export const WALL_Y = 1.9;

/**
 * Camera waypoints, one per stop, with a gentle lateral weave so the
 * dolly never feels like a straight rail.
 */
export function buildWaypoints(stops: Stop[] = STOPS): THREE.Vector3[] {
  return stops.map((stop, i) => {
    const z = -i * STOP_SPACING;
    // Weave toward the wall on wall-facing stops, back to centre otherwise.
    const wallFacing = stop.section === "experience" || stop.section === "projects";
    const x = wallFacing ? -1.6 : 0.35 * Math.sin(i * 1.1);
    const y = 1.75 + 0.22 * Math.cos(i * 0.9);
    return new THREE.Vector3(x, y, z);
  });
}

/**
 * Smooth curve through the waypoints. Sampled by scroll progress in the Rig.
 * Rebuilt only at module load — the content arrays are static.
 */
export const CAMERA_CURVE = new THREE.CatmullRomCurve3(
  buildWaypoints(),
  false,
  "catmullrom",
  0.4,
);

/** Where the camera looks: slightly ahead along the path, biased to the wall. */
export const LOOK_AHEAD = 0.045;

/** Total scrollable height, in viewport units, derived from stop count. */
export const SCROLL_VH = STOPS.length * 100;

/** Progress (0..1) at which a given stop is centred. */
export function stopProgress(index: number, total = STOPS.length): number {
  return total <= 1 ? 0 : index / (total - 1);
}

/**
 * How "focused" a stop is at the current progress: 1 when centred,
 * falling to 0 by the time the neighbouring stop is reached.
 */
export function focusFor(index: number, progress: number, total = STOPS.length): number {
  const span = total <= 1 ? 1 : 1 / (total - 1);
  const d = Math.abs(progress - stopProgress(index, total));
  return Math.max(0, 1 - d / span);
}
