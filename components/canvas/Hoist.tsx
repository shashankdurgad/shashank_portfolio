"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { rng } from "./readouts/primitives";

/**
 * The machine on the hoist: a wireframe assembly at the bay centre.
 * Scroll progress drives an exploded view — shells drift outward and the
 * core rings spin up. This is the object the whole bay is built around.
 */
export function Hoist({ detail }: { detail: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Group>(null);
  const shellRefs = useRef<(THREE.Group | null)[]>([]);

  const shellCount = detail === "high" ? 5 : 3;

  const shells = useMemo(() => {
    const r = rng(91);
    return Array.from({ length: shellCount }, (_, i) => ({
      // Direction each shell drifts to when exploded.
      dir: new THREE.Vector3(
        (r() - 0.5) * 2,
        (r() - 0.5) * 1.4 + 0.25,
        (r() - 0.5) * 2,
      ).normalize(),
      size: 0.55 + i * 0.32,
      spin: (r() - 0.5) * 0.5,
    }));
  }, [shellCount]);

  // Concentric arc rings for the reactor core.
  const arcs = useMemo(() => {
    const mk = (radius: number, gap: number) => {
      const pts: THREE.Vector3[] = [];
      const segs = 64;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        // Leave a gap so the ring reads as machined, not a plain circle.
        if (Math.abs(Math.sin(a * 2)) < gap) continue;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      return pts;
    };
    return [mk(0.34, 0.08), mk(0.5, 0.16), mk(0.68, 0.05)];
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scroll.progress;

    if (group.current) {
      // Slow idle rotation, accelerating slightly as you move through the bay.
      group.current.rotation.y += dt * (0.12 + p * 0.25);
      group.current.position.y = 0.6 + Math.sin(t * 0.6) * 0.06;
    }

    if (coreRef.current) {
      coreRef.current.rotation.z = t * 0.55;
      coreRef.current.children.forEach((c, i) => {
        c.rotation.z = t * (i % 2 === 0 ? 0.7 : -0.95);
      });
    }

    // Exploded view peaks mid-scroll, reassembling toward the end.
    const explode = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * 1.15;
    shells.forEach((s, i) => {
      const g = shellRefs.current[i];
      if (!g) return;
      g.position.copy(s.dir).multiplyScalar(explode * (0.5 + i * 0.28));
      g.rotation.x += dt * s.spin * 0.4;
      g.rotation.y += dt * s.spin * 0.6;
    });
  });

  return (
    <group ref={group}>
      {/* Reactor core — the bright heart of the bay */}
      <group ref={coreRef}>
        {arcs.map((pts, i) => (
          <Line
            key={i}
            points={pts}
            segments
            color={i === 2 ? "#7dd3fc" : "#22d3ee"}
            lineWidth={1.6}
            transparent
            opacity={0.85}
          />
        ))}
        <mesh>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
        </mesh>
      </group>

      {/* Wireframe shells that peel away */}
      {shells.map((s, i) => (
        <group
          key={i}
          ref={(el) => {
            shellRefs.current[i] = el;
          }}
        >
          <mesh>
            <icosahedronGeometry args={[s.size, i === 0 ? 1 : 0]} />
            <meshBasicMaterial
              color="#7dd3fc"
              wireframe
              transparent
              opacity={0.14 + (shellCount - i) * 0.035}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
