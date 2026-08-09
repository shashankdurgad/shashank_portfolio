"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
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
/** Idle spin rate, rad/s, that drag hands back to when it settles. */
const IDLE_SPIN = 0.1;
/** Fraction of angular velocity retained per second — the friction curve. */
const DAMPING = 0.12;
/** Screen px of horizontal drag → rad/s of angular velocity. */
const DRAG_GAIN = 0.011;

export function Lorenz({ detail }: { detail: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<React.ComponentRef<typeof Line>>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  /**
   * Spin state, kept in refs so dragging never triggers a React render.
   * One degree of freedom (yaw), so the "physics" is just angular velocity
   * under exponential friction — a rigid-body engine would add a WASM
   * dependency and a second update loop to solve a problem we don't have.
   */
  const spin = useRef({
    angle: 0,
    velocity: IDLE_SPIN,
    dragging: false,
    lastX: 0,
    /** Velocity sampled from recent pointer motion, for release momentum. */
    throwVel: 0,
  });
  const [hovered, setHovered] = useState(false);

  // Cursor affordance — without it the attractor gives no sign it's grabbable.
  useEffect(() => {
    if (!hovered) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grab";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [hovered]);

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

      // Angular integration. While dragging the pointer drives the angle
      // directly; on release the stored throw velocity carries it and decays
      // toward the idle spin, so it coasts to rest rather than stopping dead.
      const s = spin.current;
      if (!s.dragging) {
        const target = IDLE_SPIN + p * 0.18;
        const k = Math.pow(DAMPING, delta);
        s.velocity = target + (s.velocity - target) * k;
        s.angle += s.velocity * delta;
      }
      group.current.rotation.y = s.angle;
      group.current.rotation.z = -0.18 + Math.sin(t * 0.25) * 0.06;

      if (process.env.NODE_ENV !== "production") {
        // Test hook: lets a browser check assert the friction curve directly,
        // since pixel churn saturates on the constantly-animating head.
        (window as unknown as { __lorenz?: unknown }).__lorenz = {
          angle: s.angle,
          velocity: s.velocity,
          dragging: s.dragging,
        };
      }
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

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    const s = spin.current;
    s.dragging = true;
    s.lastX = e.clientX;
    s.throwVel = 0;
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const s = spin.current;
    if (!s.dragging) return;
    e.stopPropagation();
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    s.angle += dx * DRAG_GAIN;
    // Blend so a brief stutter mid-drag doesn't kill the throw.
    s.throwVel = s.throwVel * 0.7 + dx * DRAG_GAIN * 60 * 0.3;
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    const s = spin.current;
    if (!s.dragging) return;
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    s.dragging = false;
    // Hand the sampled pointer speed to the physics as launch velocity.
    s.velocity = THREE.MathUtils.clamp(s.throwVel, -14, 14);
  };

  return (
    <group ref={group} scale={0.95}>
      {/*
        Invisible grab target. The wireframe lines are ~1px and effectively
        impossible to hit; this sphere gives the drag a real surface while
        staying invisible. pointer-events are enabled here only — the canvas
        itself stays pointer-events:none so the HTML above remains clickable.
      */}
      <mesh
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.55, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Full trajectory, faint — the structure */}
      <Line
        points={path}
        color="#7dd3fc"
        lineWidth={hovered ? 1.4 : 1}
        transparent
        opacity={hovered ? 0.55 : 0.32}
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
