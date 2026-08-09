"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { buildMorphBuffers, PARTICLES, rng } from "@/lib/morphTargets";
import { scroll } from "@/lib/scrollStore";
import { morphFragment, morphVertex } from "./morph.glsl";

/**
 * Offset from the camera along its path. The field rides the camera rather
 * than sitting at a fixed point in the bay, so it stays centred and at a
 * constant apparent size throughout the sequence.
 */
const FIELD_OFFSET = new THREE.Vector3(0, -0.15, -7.0);

const cursorPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
const localCursor = new THREE.Vector3();
const fieldTarget = new THREE.Vector3();
const camDir = new THREE.Vector3();
const planeNormal = new THREE.Vector3();

function makeUniforms(detail: "high" | "low") {
  return {
    uProgress: { value: 0 },
    uSize: { value: detail === "high" ? 2.6 : 3.4 },
    uCursor: { value: new THREE.Vector3(999, 999, 999) },
    uCursorRadius: { value: 0.9 },
    uPush: { value: 0.55 },
    uHoverSide: { value: 0 },
    uTreeMix: { value: 0 },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#7dd3fc") },
    uAccent: { value: new THREE.Color("#22d3ee") },
    uOpacity: { value: 0 },
  };
}

/**
 * The morph sequence: one particle system whose targets change.
 *
 * Particles never spawn or die — only their destination changes — so the
 * sequence reads as the same matter rearranging rather than objects being
 * swapped out.
 */
export function MorphField({
  detail,
  onSelect,
}: {
  detail: "high" | "low";
  onSelect: (side: "left" | "right") => void;
}) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [hoverSide, setHoverSide] = useState(0);

  const count = detail === "high" ? PARTICLES.high : PARTICLES.low;
  const buffers = useMemo(() => buildMorphBuffers(count), [count]);

  const seeds = useMemo(() => {
    const r = rng(5);
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = r();
    return a;
  }, [count]);

  /**
   * Built once for the initial material. Per-frame updates go through the
   * material ref rather than this object — mutating a value captured in
   * render is what the immutability lint rule (rightly) objects to.
   */
  const initialUniforms = useMemo(() => makeUniforms(detail), [detail]);

  useEffect(() => {
    const u = matRef.current?.uniforms;
    if (u) u.uHoverSide.value = hoverSide;
  }, [hoverSide]);

  // Cursor affordance once the tree is interactive.
  useEffect(() => {
    if (!hoverSide) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [hoverSide]);

  useFrame((state, delta) => {
    /*
     * Writing uniform values on the three.js material each frame is the
     * standard R3F pattern — it drives the GPU without re-rendering React.
     * The immutability rule cannot tell "reassigning a ref" from "mutating
     * the object a ref points at", so it is disabled for this block only.
     */
    /* eslint-disable react-hooks/immutability */
    const u = matRef.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;

    // Damp toward the scroll-driven target so stage changes glide.
    const target = THREE.MathUtils.clamp(scroll.morph, 0, 3);
    u.uProgress.value += (target - u.uProgress.value) * Math.min(1, delta * 3.4);

    // Tree interactions only switch on once the tree has essentially formed.
    const treeMix = THREE.MathUtils.smoothstep(u.uProgress.value, 2.55, 2.95);
    u.uTreeMix.value = treeMix;

    // Visible only while the morph region is on screen; fades at both ends.
    const vis =
      THREE.MathUtils.smoothstep(u.uProgress.value, 0.0, 0.25) *
      (1 - THREE.MathUtils.smoothstep(u.uProgress.value, 3.05, 3.4));
    u.uOpacity.value += (vis - u.uOpacity.value) * Math.min(1, delta * 4);

    if (group.current) {
      // Ride the camera: place the field a fixed distance ahead along the
      // camera's forward axis so it never drifts off-screen as the bay scrolls.
      state.camera.getWorldDirection(camDir);
      fieldTarget
        .copy(state.camera.position)
        .addScaledVector(camDir, -FIELD_OFFSET.z);
      fieldTarget.x += FIELD_OFFSET.x;
      fieldTarget.y += FIELD_OFFSET.y;
      group.current.position.lerp(fieldTarget, Math.min(1, delta * 3));
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.16;

      // Cursor plane faces the camera through the field's centre. Negate into
      // a scratch vector — mutating camDir would corrupt next frame's position.
      planeNormal.copy(camDir).negate();
      cursorPlane.setFromNormalAndCoplanarPoint(planeNormal, group.current.position);
      state.raycaster.setFromCamera(state.pointer, state.camera);
      if (state.raycaster.ray.intersectPlane(cursorPlane, hitPoint)) {
        localCursor.copy(hitPoint).sub(group.current.position);
        u.uCursor.value.lerp(localCursor, Math.min(1, delta * 9));
      }
    }
    /* eslint-enable react-hooks/immutability */
  });

  /** Which half a pointer event landed on, in the field's local space. */
  const sideAt = (e: ThreeEvent<PointerEvent>) =>
    e.point.x - (group.current?.position.x ?? 0) < 0 ? -1 : 1;

  const interactive = () => (matRef.current?.uniforms.uTreeMix.value ?? 0) > 0.5;

  return (
    <group ref={group} scale={1.7}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.attractor, 3]} />
          <bufferAttribute attach="attributes-aMolecule" args={[buffers.molecule, 3]} />
          <bufferAttribute attach="attributes-aSphere" args={[buffers.sphere, 3]} />
          <bufferAttribute attach="attributes-aTree" args={[buffers.tree, 3]} />
          <bufferAttribute attach="attributes-aSide" args={[buffers.sides, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={morphVertex}
          fragmentShader={morphFragment}
          uniforms={initialUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/*
        Hit targets for the two halves. Particles are ~2px and cannot be
        picked reliably, so invisible planes stand in — the same approach as
        the attractor's grab sphere.
      */}
      {(["left", "right"] as const).map((side, i) => (
        <mesh
          key={side}
          position={[i === 0 ? -0.95 : 0.95, 0.1, 0]}
          visible={false}
          onPointerOver={(e) => {
            if (!interactive()) return;
            e.stopPropagation();
            setHoverSide(sideAt(e));
          }}
          onPointerOut={() => setHoverSide(0)}
          onClick={(e) => {
            if (!interactive()) return;
            e.stopPropagation();
            onSelect(side);
          }}
        >
          <planeGeometry args={[1.9, 3.2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
