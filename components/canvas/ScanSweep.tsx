"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { STOPS, STOP_SPACING } from "@/lib/constants";

/**
 * A diagnostic scan line travelling the length of the bay. Cheap (one draw
 * call) and does a lot of work tying the space together — it's the cue that
 * the whole room is one machine under inspection.
 */
export function ScanSweep() {
  const ref = useRef<THREE.Group>(null);
  const depth = (STOPS.length + 1) * STOP_SPACING;

  // A floor-level bar, not a full frame: a closed rectangle spanning the bay
  // reads as a stray box drifting across the viewport rather than a scan.
  const points = useMemo(() => {
    const halfW = 15;
    return [new THREE.Vector3(-halfW, -1.33, 0), new THREE.Vector3(halfW, -1.33, 0)];
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    // Loops down the bay every ~9s.
    const u = (t % 9) / 9;
    ref.current.position.z = STOP_SPACING - u * (depth + STOP_SPACING);
    // Fades at both ends of its run.
    const fade = Math.sin(u * Math.PI);
    const line = ref.current.children[0] as THREE.Object3D & {
      material?: THREE.Material & { opacity: number };
    };
    if (line?.material) line.material.opacity = fade * 0.28;
  });

  return (
    <group ref={ref}>
      <Line points={points} color="#22d3ee" lineWidth={1.2} transparent opacity={0} />
    </group>
  );
}
