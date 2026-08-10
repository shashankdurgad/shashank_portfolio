"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

/**
 * Wireframe bay floor. One merged LineSegments for the whole grid so the
 * floor costs a single draw call regardless of how long the bay gets.
 */
export function BayFloor({ divisions }: { divisions: number }) {
  const points = useMemo(() => {
    if (divisions <= 0) return [];

    // Fixed extent: the camera no longer travels, so the floor just needs
    // to reach the horizon from a static viewpoint.
    const depth = 60;
    const halfW = 16;
    const pts: THREE.Vector3[] = [];

    // Lines running along the bay (parallel to travel).
    const lanes = Math.max(4, Math.round(divisions / 3));
    for (let i = 0; i <= lanes; i++) {
      const x = -halfW + (i / lanes) * halfW * 2;
      pts.push(new THREE.Vector3(x, 0, 14));
      pts.push(new THREE.Vector3(x, 0, -depth));
    }

    // Cross ties.
    const ties = divisions;
    for (let i = 0; i <= ties; i++) {
      const z = 14 - (i / ties) * (depth + 14);
      pts.push(new THREE.Vector3(-halfW, 0, z));
      pts.push(new THREE.Vector3(halfW, 0, z));
    }

    return pts;
  }, [divisions]);

  if (!points.length) return null;

  return (
    <Line
      points={points}
      segments
      color="#1e3a52"
      lineWidth={1}
      transparent
      opacity={0.55}
      position={[0, -1.35, 0]}
    />
  );
}
