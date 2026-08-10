"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_POSITION, CAMERA_TARGET } from "@/lib/constants";

const tmpPos = new THREE.Vector3();

/**
 * Static camera with a touch of cursor parallax.
 *
 * The camera previously dollied along a generated path. It no longer moves:
 * the particle field is fixed in world space and the sequence plays out in
 * front of the camera, so nothing drifts as you scroll.
 */
export function Rig({ pointer = true }: { pointer?: boolean }) {
  useFrame((state, dt) => {
    tmpPos.copy(CAMERA_POSITION);

    // Subtle parallax from the cursor — the only camera motion that remains.
    if (pointer) {
      tmpPos.x += state.pointer.x * 0.35;
      tmpPos.y += state.pointer.y * 0.2;
    }

    state.camera.position.lerp(tmpPos, Math.min(1, dt * 3));
    state.camera.lookAt(CAMERA_TARGET);
  });

  return null;
}
