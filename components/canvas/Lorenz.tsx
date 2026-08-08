"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { CAMERA_CURVE, HOIST_OFFSET } from "@/lib/constants";
import { scroll } from "@/lib/scrollStore";

const tmp = new THREE.Vector3();

/** Classic Lorenz parameters — the values that produce the butterfly. */
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;

/**
 * Integrate the Lorenz system with RK4.
 *
 * Euler drifts visibly at the step sizes that keep the point count low, so
 * the extra derivative evaluations are worth it — the attractor's shape is
 * the whole point.
 */
function integrate(steps: number, dt: number) {
  const pts: THREE.Vector3[] = [];
  let x = 0.01;
  let y = 0;
  let z = 0;

  const d = (px: number, py: number, pz: number) => [
    SIGMA * (py - px),
    px * (RHO - pz) - py,
    px * py - BETA * pz,
  ];

  // Discard the transient so the curve starts on the attractor itself.
  for (let i = 0; i < 400; i++) {
    const [dx, dy, dz] = d(x, y, z);
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
  }

  for (let i = 0; i < steps; i++) {
    const [k1x, k1y, k1z] = d(x, y, z);
    const [k2x, k2y, k2z] = d(x + (k1x * dt) / 2, y + (k1y * dt) / 2, z + (k1z * dt) / 2);
    const [k3x, k3y, k3z] = d(x + (k2x * dt) / 2, y + (k2y * dt) / 2, z + (k2z * dt) / 2);
    const [k4x, k4y, k4z] = d(x + k3x * dt, y + k3y * dt, z + k3z * dt);

    x += ((k1x + 2 * k2x + 2 * k3x + k4x) * dt) / 6;
    y += ((k1y + 2 * k2y + 2 * k3y + k4y) * dt) / 6;
    z += ((k1z + 2 * k2z + 2 * k3z + k4z) * dt) / 6;

    // Scale to bay units and centre on the attractor's mean z (~25).
    pts.push(new THREE.Vector3(x * 0.055, (z - 25) * 0.055, y * 0.055));
  }
  return pts;
}

/**
 * The Lorenz attractor as the bay's centrepiece, replacing the machine on the
 * hoist. A faint full trajectory shows the whole structure; a bright head
 * traces the path through it, so the system reads as running rather than
 * displayed.
 */
export function Lorenz({ detail }: { detail: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<React.ComponentRef<typeof Line>>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const steps = detail === "high" ? 4200 : 1600;
  const dt = detail === "high" ? 0.0045 : 0.009;

  const path = useMemo(() => integrate(steps, dt), [steps, dt]);

  /** Length of the bright traced segment, in points. */
  const headLen = detail === "high" ? 260 : 130;
  const headPts = useMemo(
    () => Array.from({ length: headLen }, () => new THREE.Vector3()),
    [headLen],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const p = THREE.MathUtils.clamp(scroll.progress, 0, 1);

    if (group.current) {
      // Ride the camera curve exactly as the hoist did, so the centrepiece
      // stays framed the whole way down the bay.
      CAMERA_CURVE.getPointAt(p, tmp);
      tmp.add(HOIST_OFFSET);
      tmp.y += Math.sin(t * 0.6) * 0.08;
      group.current.position.lerp(tmp, Math.min(1, delta * 2.6));

      // Tilt so the butterfly reads face-on rather than edge-on, and rotate
      // slowly to give the structure depth.
      group.current.rotation.y += delta * (0.1 + p * 0.18);
      group.current.rotation.z = -0.18 + Math.sin(t * 0.25) * 0.06;
    }

    // Advance the traced head along the trajectory.
    const geo = headRef.current?.geometry;
    const attr = geo?.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (geo && attr) {
      const arr = attr.array as Float32Array;
      const maxPts = Math.min(headLen, arr.length / 3);
      const speed = 34 + p * 26;
      const start = Math.floor((t * speed) % path.length);

      for (let i = 0; i < maxPts; i++) {
        const src = path[(start + i) % path.length];
        arr[i * 3] = src.x;
        arr[i * 3 + 1] = src.y;
        arr[i * 3 + 2] = src.z;
      }
      attr.needsUpdate = true;
      geo.computeBoundingSphere();

      // Glow sphere sits on the leading point.
      const lead = path[(start + maxPts - 1) % path.length];
      glowRef.current?.position.copy(lead);
    }
  });

  return (
    <group ref={group} scale={0.95}>
      {/* Full trajectory, faint — the structure */}
      <Line
        points={path}
        color="#7dd3fc"
        lineWidth={1}
        transparent
        opacity={0.32}
      />

      {/* Traced head, bright — the motion */}
      <Line
        ref={headRef}
        points={headPts}
        color="#22d3ee"
        lineWidth={1.8}
        transparent
        opacity={0.95}
      />

      <mesh ref={glowRef}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
