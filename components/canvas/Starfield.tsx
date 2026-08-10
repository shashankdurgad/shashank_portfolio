"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rng } from "@/lib/morphTargets";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;

  attribute float aSeed;
  attribute float aBright;

  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = -mv.z;

    // Slow twinkle, desynchronised per star so the field never pulses as one.
    float twinkle = 0.72 + 0.28 * sin(uTime * 0.7 + aSeed * 6.283);

    vAlpha = aBright * twinkle;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aBright * (60.0 / max(depth, 1.0));
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    // Round points with a soft falloff; square stars read as dead pixels.
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(uColor, a * vAlpha);
  }
`;

/**
 * Distant starfield.
 *
 * Sits far behind everything else purely as a depth cue — without it the head
 * floats in flat black with nothing but the floor grid to place it. Kept dim
 * and cool deliberately: the scene already has a lot of bright cyan, and
 * stars that compete with the centrepiece stop reading as background.
 *
 * Parallaxes gently against the cursor, which is what actually sells the
 * distance; a static field reads as noise on the backdrop.
 */
export function Starfield({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, seeds, brights } = useMemo(() => {
    const r = rng(1471);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const brights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on a hemisphere shell behind the scene, biased above the
      // horizon so the floor grid stays the dominant element below.
      const theta = r() * Math.PI * 2;
      const y = Math.pow(r(), 0.7); // bias upward
      const radius = 34 + r() * 22;
      const rim = Math.sqrt(Math.max(0, 1 - y * y));

      positions[i * 3] = Math.cos(theta) * rim * radius;
      positions[i * 3 + 1] = y * radius * 0.75 - 4;
      positions[i * 3 + 2] = Math.sin(theta) * rim * radius - 12;

      seeds[i] = r();
      // Most stars faint, a few brighter — an even field looks artificial.
      brights[i] = 0.42 + Math.pow(r(), 2) * 0.58;
    }
    return { positions, seeds, brights };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 7.0 },
      uColor: { value: new THREE.Color("#9ec7de") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const u = matRef.current?.uniforms;
    if (u) u.uTime.value = state.clock.elapsedTime;

    if (group.current) {
      // Counter-parallax: the field drifts opposite the cursor, far less than
      // the camera moves, which is what makes it read as distant.
      group.current.position.x +=
        (-state.pointer.x * 1.4 - group.current.position.x) * Math.min(1, delta * 1.5);
      group.current.position.y +=
        (-state.pointer.y * 0.8 - group.current.position.y) * Math.min(1, delta * 1.5);
      group.current.rotation.y = state.clock.elapsedTime * 0.006;
    }
  });

  if (count <= 0) return null;

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
          <bufferAttribute attach="attributes-aBright" args={[brights, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          // Normal blending, not additive: additive would let overlapping
          // stars stack into bright blobs, and these must stay recessive.
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}
