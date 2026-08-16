"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { CHIP, CHIP_HOVER, chipPlacement } from "@/lib/hallLayout";
import type { Project } from "@/lib/projectData";

/**
 * One project, as a chip standing in its alcove.
 *
 * Geometry rather than particles: a chip is a flat slab with a hard lit edge,
 * and additive particles have no shading channel to draw an edge with. Same
 * reasoning as the doors.
 *
 * Collapsed it shows the project's name and a single line. Hovering lifts it
 * out of its alcove toward the viewer; the detail itself is rendered as DOM
 * outside the canvas, because 3D text at paragraph size is soft and needs
 * manual line breaking.
 */
export function Chip({
  project,
  index,
  active,
  visible,
}: {
  project: Project;
  index: number;
  active: boolean;
  /** 0..1 as the hall fades in. */
  visible: React.RefObject<number>;
}) {
  const lift = useRef<THREE.Group>(null);
  const slab = useRef<THREE.Mesh>(null);
  const rim = useRef<THREE.LineBasicMaterial>(null);
  const nameRef = useRef<{ fillOpacity: number } | null>(null);
  const summaryRef = useRef<{ fillOpacity: number } | null>(null);

  const place = chipPlacement(index);
  const eased = useRef(0);

  useFrame((_, delta) => {
    const v = visible.current ?? 0;

    /*
     * Ease the hover rather than snapping it. Faster in than out, so the chip
     * answers the pointer promptly but settles back unhurriedly — the reverse
     * reads as sluggish then twitchy.
     */
    const target = active ? 1 : 0;
    const rate = target > eased.current ? CHIP_HOVER.inRate : CHIP_HOVER.outRate;
    eased.current += (target - eased.current) * Math.min(1, delta * rate);
    const e = eased.current;

    if (lift.current) {
      /*
       * Forward along the chip's own facing, not world Z. Each chip is rotated
       * to face the viewer, so a world-space offset would send the outer chips
       * sideways instead of toward the camera.
       */
      lift.current.position.set(0, CHIP_HOVER.lift * e, CHIP_HOVER.forward * e);
      lift.current.scale.setScalar(1 + (CHIP_HOVER.scale - 1) * e);
    }

    if (slab.current) {
      const m = slab.current.material as THREE.MeshStandardMaterial;
      m.opacity = v;
      m.emissiveIntensity = 0.28 + e * 0.5;
    }
    if (rim.current) rim.current.opacity = v * (0.5 + e * 0.5);
    if (nameRef.current) nameRef.current.fillOpacity = v;
    if (summaryRef.current) {
      // The summary is the collapsed state's job; once expanded the DOM card
      // carries the detail and this would only compete with it.
      summaryRef.current.fillOpacity = v * (1 - e);
    }
  });

  return (
    <group position={place.position} rotation={[0, place.rotationY, 0]}>
      {/*
        Alcove: a recessed frame the chip sits in, so a lifted chip reads as
        coming out of something rather than drifting in front of nothing.
      */}
      <lineSegments position={[0, 0, -0.06]}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(CHIP.width + 0.22, CHIP.height + 0.22)]}
        />
        <lineBasicMaterial color="#1e3a52" transparent opacity={0.85} />
      </lineSegments>

      <group ref={lift}>
        <mesh ref={slab}>
          <boxGeometry args={[CHIP.width, CHIP.height, CHIP.depth]} />
          <meshStandardMaterial
            color="#0a1622"
            emissive="#0d2b3d"
            emissiveIntensity={0.28}
            metalness={0.2}
            roughness={0.85}
            transparent
            opacity={0}
          />
        </mesh>

        {/* Lit outline, so the slab has a crisp edge against the dark. */}
        <lineSegments>
          <edgesGeometry
            args={[new THREE.BoxGeometry(CHIP.width, CHIP.height, CHIP.depth)]}
          />
          <lineBasicMaterial ref={rim} color="#2bb8d4" transparent opacity={0} />
        </lineSegments>

        {/* Name and one line, sat just proud of the face so nothing z-fights. */}
        <Text
          ref={nameRef as never}
          position={[0, 0.12, CHIP.depth / 2 + 0.005]}
          fontSize={0.108}
          maxWidth={CHIP.width * 0.82}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.1}
          color="#cbd5e1"
          fillOpacity={0}
        >
          {project.name.toUpperCase()}
        </Text>
        <Text
          ref={summaryRef as never}
          position={[0, -0.08, CHIP.depth / 2 + 0.005]}
          fontSize={0.052}
          maxWidth={CHIP.width * 0.8}
          textAlign="center"
          anchorX="center"
          anchorY="top"
          lineHeight={1.5}
          color="#64748b"
          fillOpacity={0}
        >
          {project.summary}
        </Text>
      </group>
    </group>
  );
}
