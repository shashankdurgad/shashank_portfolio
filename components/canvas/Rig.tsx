"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_POSITION, CAMERA_TARGET } from "@/lib/constants";
import { scroll } from "@/lib/scrollStore";
import { timelineCurve } from "@/lib/timelineCurve";
import { TIMELINE_ORIGIN as ORIGIN } from "./Timeline";
import { useDoorStore } from "@/lib/doorStore";
import { DOOR_CENTRE, hingeX } from "@/lib/doors";
import { HALL_CENTRE, LOOK } from "@/lib/hallLayout";

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
const hallLook = new THREE.Vector3();

/** Eased head-turn, kept between frames so it damps rather than snapping. */
const look = { yaw: 0, pitch: 0 };

/**
 * Cursor in normalised device coordinates, tracked from the window.
 *
 * R3F's own `state.pointer` is unusable here: the canvas is
 * pointer-events:none so the page above stays clickable, which means pointer
 * events land on the HTML sections and R3F never updates its value — it stays
 * pinned wherever it happened to start, and the camera with it.
 */
const hallPointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      hallPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      hallPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true },
  );
}

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

    /*
     * Remember which doorway the flight belongs to for as long as it is
     * running, including all the way back out.
     *
     * `entered` clears on the click, so anything keyed to it alone disappears
     * before the camera has moved. This holds until the flight has fully
     * unwound, which is what lets the destination stay in view during the
     * zoom out.
     */
    if (entered) scroll.doorSide = entered;
    else if (scroll.doorFlight <= 0.001) scroll.doorSide = null;

    /** The door in play: the one entered, or the one being left. */
    const side = scroll.doorSide;

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
    const onRail =
      side === "left" ? THREE.MathUtils.smoothstep(scroll.doorFlight, 0.45, 1) : 0;

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
      const sign = side === "left" ? -1 : 1;
      // Aim at the middle of the chosen panel, not the pair's centre.
      const doorX = (hingeX(sign) - sign * 0.575) * 1.15;

      /*
       * The flight ends exactly where the destination's own camera begins, so
       * the handover is invisible — through the left door that is the first
       * step of the timeline walk, through the right it is the spot the viewer
       * stands on in the hall.
       */
      if (side === "right") {
        // The hall's viewer stands at its centre, looking straight ahead.
        curvePos.copy(HALL_CENTRE);
        lookAhead.set(HALL_CENTRE.x, HALL_CENTRE.y, HALL_CENTRE.z - 4);
      } else {
        timelineCurve.getPoint(T_START, lookAhead);
        lookAhead.add(TIMELINE_ORIGIN);
        timelineCurve.getPoint(Math.max(0, T_START - TRAIL), curvePos);
        curvePos.add(TIMELINE_ORIGIN);
        curvePos.y += LIFT;
        curvePos.z += 3.4;
      }

      // First half is the approach through the doorway; second half arrives.
      const approach = THREE.MathUtils.smoothstep(f, 0, 0.55);
      flightPos.set(doorX, 1.5 + DOOR_CENTRE.y, THREE.MathUtils.lerp(4, THROUGH_Z, approach));
      flightPos.lerp(curvePos, THREE.MathUtils.smoothstep(f, 0.45, 1));

      flightTarget.set(doorX, 1.5 + DOOR_CENTRE.y, THROUGH_Z - 4);
      flightTarget.lerp(lookAhead, THREE.MathUtils.smoothstep(f, 0.45, 1));

      tmpPos.lerp(flightPos, f);
      target.lerp(flightTarget, f);
    }

    /*
     * Inside the right-hand door the camera stands still and turns, as if the
     * viewer were looking around a room. Chips sit on an arc about this point,
     * so turning is what reveals them — a dolly would just approach one.
     */
    const inHall = side === "right" ? THREE.MathUtils.smoothstep(scroll.doorFlight, 0.45, 1) : 0;
    if (inHall > 0) {
      /*
       * Positive, not negated: moving the cursor left must turn the view left.
       * A yaw of +x rotates the look-at point toward +x, which is the
       * direction the cursor is already heading.
       */
      const targetYaw = hallPointer.x * LOOK.yaw;
      const targetPitch = hallPointer.y * LOOK.pitch;
      const k = Math.min(1, dt * LOOK.rate);
      look.yaw += (targetYaw - look.yaw) * k;
      look.pitch += (targetPitch - look.pitch) * k;

      hallLook.set(
        HALL_CENTRE.x + Math.sin(look.yaw) * 4,
        HALL_CENTRE.y + Math.sin(look.pitch) * 4,
        HALL_CENTRE.z - Math.cos(look.yaw) * 4,
      );

      tmpPos.lerp(HALL_CENTRE, inHall);
      target.lerp(hallLook, inHall);
    }

    // Subtle parallax from the cursor. Damped while travelling: the same
    // offset that reads as life on a static shot becomes a wobble in motion.
    // Off entirely in the hall, where the head-turn is the camera motion.
    if (pointer) {
      const par = (1 - onRail * 0.75) * (1 - scroll.doorFlight) * (1 - inHall);
      tmpPos.x += state.pointer.x * 0.35 * par;
      tmpPos.y += state.pointer.y * 0.2 * par;
    }

    state.camera.position.lerp(tmpPos, Math.min(1, dt * 3));
    state.camera.lookAt(target);
  });

  return null;
}
