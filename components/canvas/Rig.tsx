"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_POSITION, CAMERA_TARGET } from "@/lib/constants";
import { scroll } from "@/lib/scrollStore";
import { timelineCurve } from "@/lib/timelineCurve";
import { TIMELINE_ORIGIN as ORIGIN } from "./Timeline";
import { useDoorStore } from "@/lib/doorStore";
import { DOOR_CENTRE, hingeX } from "@/lib/doors";

const tmpPos = new THREE.Vector3();
const curvePos = new THREE.Vector3();
const lookAhead = new THREE.Vector3();
const target = new THREE.Vector3();

/** Shared with the Timeline group — see the note on its export. */
const TIMELINE_ORIGIN = new THREE.Vector3(...ORIGIN);
/** Distance back along the curve the camera sits from its focus. */
const TRAIL = 0.075;

/**
 * Curve range the camera actually travels.
 *
 * Not 0..1. The curve carries a lead-in and run-out control point either side
 * of the nodes so its ends are shaped like its middle, which means t=1 sits
 * well past the final entry — travelling the full range flies the camera into
 * empty space beyond the last node. These bounds keep it over the nodes.
 */
const T_START = 0.12;
const T_END = 0.86;
/** Lift above the thread, so it is seen from slightly outside rather than on. */
const LIFT = 0.5;

/** Seconds the flight through a door takes, in and out. */
const FLIGHT_IN = 1.25;
const FLIGHT_OUT = 0.85;

/** How far past the door plane the flight carries the camera. */
const THROUGH_Z = -3.2;

const flightPos = new THREE.Vector3();
const flightTarget = new THREE.Vector3();

/**
 * Camera: static for the hero and morph, travelling for the timeline.
 *
 * It used to be unconditionally fixed — the particle field is static in world
 * space and the morph plays out in front of it, so nothing needed to move. The
 * timeline is the exception: it is a thread receding into depth, and reading
 * it means travelling along it rather than watching it pass.
 */
export function Rig({ pointer = true }: { pointer?: boolean }) {
  const entered = useDoorStore((s) => s.entered);

  useFrame((state, dt) => {
    /*
     * Flight through a door, eased on a clock rather than on scroll.
     *
     * Entering is a click, not a scroll gesture, so it cannot borrow the
     * scroll position the way the timeline traverse does — it needs its own
     * progress, advanced by elapsed time and reversed on exit.
     */
    const flightTargetT = entered ? 1 : 0;
    const rate = entered ? 1 / FLIGHT_IN : 1 / FLIGHT_OUT;
    scroll.doorFlight = THREE.MathUtils.clamp(
      scroll.doorFlight + Math.sign(flightTargetT - scroll.doorFlight) * rate * dt,
      0,
      1,
    );

    const raw = THREE.MathUtils.clamp(scroll.timeline, 0, 1);
    const t = T_START + raw * (T_END - T_START);

    /*
     * The traverse only exists inside a door. Outside, scroll.timeline is
     * meaningless — its section has no height — and letting it steer would
     * drag the camera off the doors as the page bottomed out.
     *
     * The flight owns the camera on the way in and on the way out; in between,
     * `entered` keeps the rail live so scrolling walks the thread. Blending on
     * flight progress rather than replacing means the handover in either
     * direction is continuous.
     */
    const onRail = entered ? THREE.MathUtils.smoothstep(scroll.doorFlight, 0.45, 1) : 0;

    tmpPos.copy(CAMERA_POSITION);
    target.copy(CAMERA_TARGET);

    if (onRail > 0) {
      // Focus rides ahead of the camera, so the thread leads into frame.
      timelineCurve.getPoint(t, lookAhead);
      lookAhead.add(TIMELINE_ORIGIN);

      timelineCurve.getPoint(Math.max(0, t - TRAIL), curvePos);
      curvePos.add(TIMELINE_ORIGIN);
      curvePos.y += LIFT;
      // Stand off the thread so it is not viewed end-on down its own axis.
      curvePos.z += 3.4;

      tmpPos.lerp(curvePos, onRail);
      target.lerp(lookAhead, onRail);
    }

    /*
     * The flight overrides both, carrying the camera from wherever it is
     * through the chosen doorway. Eased rather than linear so it accelerates
     * away and settles, which reads as being drawn through rather than pushed.
     */
    /*
     * The approach through the doorway. Only while the flight is still in
     * progress — once through, the rail above has the camera, and continuing
     * to blend a fixed flight position over it would pin the view to the
     * timeline's start however far the reader scrolled, and would also strand
     * the camera there when the door was exited.
     */
    if (scroll.doorFlight > 0.001 && onRail < 1) {
      const f = THREE.MathUtils.smoothstep(scroll.doorFlight, 0, 1);
      const side = entered === "left" ? -1 : 1;
      // Aim at the middle of the chosen panel, not the pair's centre.
      const doorX = (hingeX(side) - side * 0.575) * 1.15;

      /*
       * The flight ends exactly where the scroll traverse begins, so the
       * handover is invisible: the flight becomes the first step of the walk.
       */
      timelineCurve.getPoint(T_START, lookAhead);
      lookAhead.add(TIMELINE_ORIGIN);
      timelineCurve.getPoint(Math.max(0, T_START - TRAIL), curvePos);
      curvePos.add(TIMELINE_ORIGIN);
      curvePos.y += LIFT;
      curvePos.z += 3.4;

      // First half is the approach through the doorway; second half arrives.
      const approach = THREE.MathUtils.smoothstep(f, 0, 0.55);
      flightPos.set(doorX, 1.5 + DOOR_CENTRE.y, THREE.MathUtils.lerp(4, THROUGH_Z, approach));
      flightPos.lerp(curvePos, THREE.MathUtils.smoothstep(f, 0.45, 1));

      flightTarget.set(doorX, 1.5 + DOOR_CENTRE.y, THROUGH_Z - 4);
      flightTarget.lerp(lookAhead, THREE.MathUtils.smoothstep(f, 0.45, 1));

      tmpPos.lerp(flightPos, f);
      target.lerp(flightTarget, f);
    }

    // Subtle parallax from the cursor. Damped while travelling: the same
    // offset that reads as life on a static shot becomes a wobble in motion.
    if (pointer) {
      const par = (1 - onRail * 0.75) * (1 - scroll.doorFlight);
      tmpPos.x += state.pointer.x * 0.35 * par;
      tmpPos.y += state.pointer.y * 0.2 * par;
    }

    state.camera.position.lerp(tmpPos, Math.min(1, dt * 3));
    state.camera.lookAt(target);
  });

  return null;
}
