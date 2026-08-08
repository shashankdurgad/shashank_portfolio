"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_CURVE, HOIST_POSITION, LOOK_AHEAD } from "@/lib/constants";
import { scroll } from "@/lib/scrollStore";

const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

/**
 * Drives the camera along the generated bay path.
 *
 * Reads `scroll.progress` (a plain mutable object written by ScrollTrigger)
 * rather than React state, so this runs every frame with zero re-renders.
 */
export function Rig({ pointer = true }: { pointer?: boolean }) {
  const look = useRef(new THREE.Vector3().copy(HOIST_POSITION));

  useFrame((state, dt) => {
    const p = THREE.MathUtils.clamp(scroll.progress, 0, 1);
    const k = Math.min(1, dt * 3.2);

    // Position along the curve.
    CAMERA_CURVE.getPointAt(p, tmpPos);

    // Subtle parallax from the cursor — the "hand on the holotable" feel.
    if (pointer) {
      tmpPos.x += state.pointer.x * 0.5;
      tmpPos.y += state.pointer.y * 0.28;
    }
    state.camera.position.lerp(tmpPos, k);

    // Look slightly further along the path, blended toward the hoist so the
    // machine stays roughly framed throughout the journey.
    CAMERA_CURVE.getPointAt(Math.min(1, p + LOOK_AHEAD), tmpLook);
    tmpTarget.copy(tmpLook).lerp(HOIST_POSITION, 0.35);
    tmpTarget.z = tmpLook.z - 6;

    look.current.lerp(tmpTarget, k);
    state.camera.lookAt(look.current);
  });

  return null;
}
