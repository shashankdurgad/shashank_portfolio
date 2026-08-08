"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Accent, ReadoutProps } from "@/content/types";

export const ACCENT_HEX: Record<Accent, string> = {
  cyan: "#7dd3fc",
  arc: "#22d3ee",
  amber: "#fbbf24",
};

/** Deterministic PRNG so scenes are stable across reloads. */
export function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Panel is ~7 wide x 4 tall in local space, origin at centre. */
const W = 7;
const H = 4;

function count(base: number, density: number) {
  return Math.max(2, Math.round(base * density));
}

/* ------------------------------------------------------------------ */

/** Scrolling signal trace — the default "something is running" readout. */
export function Waveform({ focus, accent, density, seed }: ReadoutProps) {
  const ref = useRef<THREE.Group>(null);
  const n = count(96, density);
  const noise = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => r() * 2 - 1);
  }, [n, seed]);

  const lineRef = useRef<React.ComponentRef<typeof Line>>(null);
  const pts = useMemo(
    () => Array.from({ length: n }, () => new THREE.Vector3()),
    [n],
  );

  /**
   * Write straight into the geometry's position attribute rather than calling
   * setFromPoints: drei's <Line> uses LineGeometry, whose buffers are sized
   * once from the initial `points` and cannot grow. setFromPoints is rejected
   * every frame ("Buffer size too small"), leaving the line frozen.
   */
  useFrame(({ clock }) => {
    const geo = lineRef.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;

    const t = clock.elapsedTime;
    const amp = 0.35 + focus * 0.75;
    const count = Math.min(n, arr.length / 3);
    for (let i = 0; i < count; i++) {
      const x = (i / (n - 1) - 0.5) * W;
      const phase = t * 1.6 - i * 0.16;
      const y =
        Math.sin(phase) * 0.42 * amp +
        Math.sin(phase * 2.3) * 0.16 * amp +
        noise[i] * 0.14 * amp;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = 0;
    }
    attr.needsUpdate = true;
    geo.computeBoundingSphere();
  });

  return (
    <group ref={ref}>
      <Line
        ref={lineRef}
        points={pts}
        color={ACCENT_HEX[accent]}
        lineWidth={1.4}
        transparent
        opacity={0.35 + focus * 0.6}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */

/** Node lattice with connecting edges — swarms, graphs, agent meshes. */
export function Lattice({ focus, accent, density, seed }: ReadoutProps) {
  const n = count(26, density);
  const group = useRef<THREE.Group>(null);

  const { nodes, edges } = useMemo(() => {
    const r = rng(seed);
    const nodes = Array.from({ length: n }, () => ({
      base: new THREE.Vector3((r() - 0.5) * W, (r() - 0.5) * H, (r() - 0.5) * 1.2),
      drift: r() * Math.PI * 2,
    }));
    const edges: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (nodes[i].base.distanceTo(nodes[j].base) < 1.9) edges.push([i, j]);
      }
    }
    return { nodes, edges };
  }, [n, seed]);

  const edgePts = useMemo(
    () => edges.flatMap(() => [new THREE.Vector3(), new THREE.Vector3()]),
    [edges],
  );
  const edgeLine = useRef<React.ComponentRef<typeof Line>>(null);
  const inst = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Reused across frames: the previous version allocated n fresh Vector3s
  // every tick, which is steady GC pressure at 60fps.
  const live = useMemo(
    () => Array.from({ length: n }, () => new THREE.Vector3()),
    [n],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const w = 0.12 + focus * 0.12;
    nodes.forEach((nd, i) => {
      live[i].set(
        nd.base.x + Math.sin(t * 0.5 + nd.drift) * w,
        nd.base.y + Math.cos(t * 0.42 + nd.drift) * w,
        nd.base.z,
      );
    });

    // Write into the existing buffer — see the note in Waveform above.
    const geo = edgeLine.current?.geometry;
    const attr = geo?.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (geo && attr) {
      const arr = attr.array as Float32Array;
      const maxPts = arr.length / 3;
      for (let k = 0; k < edges.length && k * 2 + 1 < maxPts; k++) {
        const [a, b] = edges[k];
        const p0 = live[a];
        const p1 = live[b];
        arr[k * 6] = p0.x;
        arr[k * 6 + 1] = p0.y;
        arr[k * 6 + 2] = p0.z;
        arr[k * 6 + 3] = p1.x;
        arr[k * 6 + 4] = p1.y;
        arr[k * 6 + 5] = p1.z;
      }
      attr.needsUpdate = true;
      geo.computeBoundingSphere();
    }

    if (inst.current) {
      live.forEach((p, i) => {
        dummy.position.copy(p);
        const s = 0.045 + Math.sin(t * 2 + i) * 0.012 + focus * 0.02;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.current!.setMatrixAt(i, dummy.matrix);
      });
      inst.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <Line
        ref={edgeLine}
        points={edgePts}
        segments
        color={ACCENT_HEX[accent]}
        lineWidth={1}
        transparent
        opacity={0.16 + focus * 0.3}
      />
      <instancedMesh ref={inst} args={[undefined, undefined, n]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={ACCENT_HEX[accent]}
          transparent
          opacity={0.5 + focus * 0.5}
        />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */

/** Concentric orbital rings with tracked bodies — orbital / cyclic systems. */
export function Orbit({ focus, accent, density, seed }: ReadoutProps) {
  const rings = count(5, density);
  const group = useRef<THREE.Group>(null);

  const ringData = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: rings }, (_, i) => ({
      radius: 0.55 + i * 0.34,
      tilt: (r() - 0.5) * 0.8,
      speed: 0.25 + r() * 0.5,
      phase: r() * Math.PI * 2,
    }));
  }, [rings, seed]);

  const circle = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    return pts;
  }, []);

  const bodies = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) group.current.rotation.z = t * 0.05;
    if (bodies.current) {
      ringData.forEach((rd, i) => {
        const a = t * rd.speed + rd.phase;
        dummy.position.set(
          Math.cos(a) * rd.radius * 1.5,
          Math.sin(a) * rd.radius * Math.cos(rd.tilt),
          Math.sin(a) * rd.radius * Math.sin(rd.tilt),
        );
        dummy.scale.setScalar(0.05 + focus * 0.03);
        dummy.updateMatrix();
        bodies.current!.setMatrixAt(i, dummy.matrix);
      });
      bodies.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      {ringData.map((rd, i) => (
        <Line
          key={i}
          points={circle}
          color={ACCENT_HEX[accent]}
          lineWidth={1}
          transparent
          opacity={0.12 + focus * 0.28}
          scale={[rd.radius * 1.5, rd.radius * Math.cos(rd.tilt), 1]}
          rotation={[rd.tilt, 0, 0]}
        />
      ))}
      <instancedMesh ref={bodies} args={[undefined, undefined, rings]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color={ACCENT_HEX[accent]} transparent opacity={0.6 + focus * 0.4} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */

/** Directed flow — stepped paths with travelling pulses. Pipelines, funnels. */
export function Flow({ focus, accent, density, seed }: ReadoutProps) {
  const lanes = count(6, density);
  const lanePts = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: lanes }, (_, i) => {
      const y = (i / (lanes - 1) - 0.5) * (H * 0.75);
      const mid = (r() - 0.5) * 1.2;
      return [
        new THREE.Vector3(-W / 2, y, 0),
        new THREE.Vector3(-1.2 + mid, y, 0),
        new THREE.Vector3(0.4 + mid, y * 0.45, 0),
        new THREE.Vector3(W / 2, y * 0.2, 0),
      ];
    });
  }, [lanes, seed]);

  const curves = useMemo(
    () => lanePts.map((p) => new THREE.CatmullRomCurve3(p, false, "catmullrom", 0.3)),
    [lanePts],
  );

  const pulses = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!pulses.current) return;
    curves.forEach((c, i) => {
      const u = ((t * 0.28 + i * 0.17) % 1 + 1) % 1;
      dummy.position.copy(c.getPoint(u));
      dummy.scale.setScalar(0.05 + focus * 0.035);
      dummy.updateMatrix();
      pulses.current!.setMatrixAt(i, dummy.matrix);
    });
    pulses.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {curves.map((c, i) => (
        <Line
          key={i}
          points={c.getPoints(40)}
          color={ACCENT_HEX[accent]}
          lineWidth={1}
          transparent
          opacity={0.14 + focus * 0.3}
        />
      ))}
      <instancedMesh ref={pulses} args={[undefined, undefined, lanes]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color={ACCENT_HEX[accent]} transparent opacity={0.7 + focus * 0.3} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */

/** Throughput bars — histogram / metric readout. */
export function Bars({ focus, accent, density, seed }: ReadoutProps) {
  const n = count(18, density);
  const phases = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => r() * Math.PI * 2);
  }, [n, seed]);

  const inst = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!inst.current) return;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - 0.5) * W;
      const h =
        (0.25 + (Math.sin(t * 1.1 + phases[i]) * 0.5 + 0.5) * 1.5) *
        (0.45 + focus * 0.55);
      dummy.position.set(x, -H / 2 + h / 2 + 0.2, 0);
      dummy.scale.set(0.11, h, 0.11);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
    }
    inst.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={inst} args={[undefined, undefined, n]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={ACCENT_HEX[accent]}
        wireframe
        transparent
        opacity={0.3 + focus * 0.55}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */

/** Drifting point field — datasets, embeddings, sample distributions. */
export function Scatter({ focus, accent, density, seed }: ReadoutProps) {
  const n = count(220, density);
  const { positions, phases } = useMemo(() => {
    const r = rng(seed);
    const positions = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Two loose clusters so it reads as structured, not noise.
      const cluster = r() > 0.5 ? 1 : -1;
      positions[i * 3] = cluster * 1.3 + (r() - 0.5) * 3.4;
      positions[i * 3 + 1] = (r() - 0.5) * H * 0.85;
      positions[i * 3 + 2] = (r() - 0.5) * 1.2;
      phases[i] = r() * Math.PI * 2;
    }
    return { positions, phases };
  }, [n, seed]);

  const ref = useRef<THREE.Points>(null);
  const base = useMemo(() => positions.slice(), [positions]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const geo = ref.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.6 + phases[i]) * 0.09;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={ACCENT_HEX[accent]}
        size={0.055}
        sizeAttenuation
        transparent
        opacity={0.35 + focus * 0.5}
      />
    </points>
  );
}
