"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { firstMesh, sampleMesh } from "@/lib/faceSampler";
import { PARTICLES, rng, scatterDirections, treePositions } from "@/lib/morphTargets";
import { scroll } from "@/lib/scrollStore";
import { beginDrag, createSpin, endDrag, moveDrag, stepSpin } from "@/lib/spin";
import { morphFragment, morphVertex } from "./morph.glsl";

const MODEL_URL = "/models/head.glb";

/**
 * Fixed world position. The field used to ride the camera, which made the
 * head drift across the viewport as you scrolled; it is now static in 3D
 * space and only its rotation changes.
 */
const FIELD_POSITION = new THREE.Vector3(0, 1.5, 0);

/** Fraction of the model's height discarded — the bust's flat plinth. */
const PLINTH_CROP = 0.3;

/** Scroll progress below which the face is still coherent enough to grab. */
const GRAB_UNTIL = 0.25;

const cursorPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
const localCursor = new THREE.Vector3();
const camDir = new THREE.Vector3();
const planeNormal = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);

function makeUniforms(detail: "high" | "low") {
  return {
    uProgress: { value: 0 },
    uSize: { value: detail === "high" ? 2.2 : 3.0 },
    uCursor: { value: new THREE.Vector3(999, 999, 999) },
    uCursorRadius: { value: 0.9 },
    uPush: { value: 0.55 },
    uHoverSide: { value: 0 },
    uTreeMix: { value: 0 },
    uTime: { value: 0 },
    uForm: { value: 1 },
    uColor: { value: new THREE.Color("#7dd3fc") },
    uAccent: { value: new THREE.Color("#22d3ee") },
    uOpacity: { value: 0 },
  };
}

/**
 * face → explosion → tree.
 *
 * One particle system whose targets change; particles never spawn or die, so
 * the sequence reads as the same matter rearranging. The explosion is
 * procedural (see the vertex shader) rather than a third target buffer.
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
  const [grabbable, setGrabbable] = useState(true);
  /**
   * The bust already faces the camera at rotation 0. Idle spin is 0 — a
   * portrait should hold still and be turned deliberately, unlike the
   * attractor which span on its own.
   */
  const spin = useRef(createSpin(0, 0));

  const count = detail === "high" ? PARTICLES.high : PARTICLES.low;
  const { scene } = useGLTF(MODEL_URL);

  const face = useMemo(() => {
    const mesh = firstMesh(scene);
    if (!mesh) {
      // Degrade to an empty cloud rather than taking down the whole scene.
      return {
        positions: new Float32Array(count * 3),
        normals: new Float32Array(count * 3),
      };
    }
    return sampleMesh(mesh, count, 2.4, PLINTH_CROP);
  }, [scene, count]);

  const tree = useMemo(() => treePositions(count), [count]);
  const scatter = useMemo(() => scatterDirections(count), [count]);
  const seeds = useMemo(() => {
    const r = rng(5);
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = r();
    return a;
  }, [count]);

  const initialUniforms = useMemo(() => makeUniforms(detail), [detail]);

  /**
   * The head is sized to sit between two flanking text columns. On a narrow
   * viewport the copy stacks on top of it instead, so it has to shrink or it
   * swallows the headline.
   */
  const [fieldScale, setFieldScale] = useState(1.15);
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      setFieldScale(w < 640 ? 0.62 : w < 1024 ? 0.85 : 1.15);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const u = matRef.current?.uniforms;
    if (u) u.uHoverSide.value = hoverSide;
  }, [hoverSide]);

  // Cursor affordance: pointer over a tree half, grab over the intact face.
  useEffect(() => {
    if (!hoverSide && !grabbable) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = hoverSide ? "pointer" : "grab";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [hoverSide, grabbable]);

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

    const target = THREE.MathUtils.clamp(scroll.morph, 0, 2);
    u.uProgress.value += (target - u.uProgress.value) * Math.min(1, delta * 3.4);

    const p = u.uProgress.value;
    u.uTreeMix.value = THREE.MathUtils.smoothstep(p, 1.6, 1.95);
    // Depth-fading only applies while the face is a coherent surface.
    u.uForm.value = 1 - THREE.MathUtils.smoothstep(p, 0.05, 0.55);

    // Visible from the hero onward; fades out as the page content takes over.
    const vis = 1 - THREE.MathUtils.smoothstep(p, 2.05, 2.4);
    u.uOpacity.value += (vis - u.uOpacity.value) * Math.min(1, delta * 4);

    if (group.current) {
      // Drag only while the face is still coherent; once it bursts there is
      // nothing to grab, and a live drag would fight the scroll.
      const canGrab = p < GRAB_UNTIL;
      if (canGrab !== grabbable) setGrabbable(canGrab);
      if (!canGrab && spin.current.dragging) endDrag(spin.current);
      group.current.rotation.y = stepSpin(spin.current, delta, 0);

      // Cursor plane faces the camera through the field's centre.
      state.camera.getWorldDirection(camDir);
      planeNormal.copy(camDir).negate();
      cursorPlane.setFromNormalAndCoplanarPoint(planeNormal, group.current.position);
      state.raycaster.setFromCamera(state.pointer, state.camera);
      if (state.raycaster.ray.intersectPlane(cursorPlane, hitPoint)) {
        localCursor.copy(hitPoint).sub(group.current.position);
        // Undo the field's spin so repulsion follows the cursor in local space.
        localCursor.applyAxisAngle(yAxis, -group.current.rotation.y);
        u.uCursor.value.lerp(localCursor, Math.min(1, delta * 9));
      }
    }
    if (process.env.NODE_ENV !== "production" && group.current) {
      // Test hook: lets a browser assert the field is genuinely static,
      // which pixel-diffing cannot show while particles animate every frame.
      (window as unknown as { __field?: unknown }).__field = {
        x: +group.current.position.x.toFixed(4),
        y: +group.current.position.y.toFixed(4),
        z: +group.current.position.z.toFixed(4),
        rotY: +group.current.rotation.y.toFixed(4),
        camX: +state.camera.position.x.toFixed(3),
        camZ: +state.camera.position.z.toFixed(3),
      };
    }
    /* eslint-enable react-hooks/immutability */
  });

  const progress = () => matRef.current?.uniforms.uProgress.value ?? 0;
  const treeInteractive = () => (matRef.current?.uniforms.uTreeMix.value ?? 0) > 0.5;

  return (
    <group ref={group} position={FIELD_POSITION} scale={fieldScale}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[face.positions, 3]} />
          <bufferAttribute attach="attributes-aNormal" args={[face.normals, 3]} />
          <bufferAttribute attach="attributes-aScatter" args={[scatter, 3]} />
          <bufferAttribute attach="attributes-aTree" args={[tree.positions, 3]} />
          <bufferAttribute attach="attributes-aSide" args={[tree.sides, 1]} />
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

      {/* Grab target for spinning the face — particles can't be hit-tested. */}
      <mesh
        visible={false}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (progress() > GRAB_UNTIL) return;
          e.stopPropagation();
          (e.target as Element)?.setPointerCapture?.(e.pointerId);
          beginDrag(spin.current, e.clientX);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!spin.current.dragging) return;
          e.stopPropagation();
          moveDrag(spin.current, e.clientX);
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          (e.target as Element)?.releasePointerCapture?.(e.pointerId);
          endDrag(spin.current);
        }}
        onPointerCancel={() => endDrag(spin.current)}
      >
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/*
        One hit target per tree, placed over each canopy's measured centroid
        (±1.24, 0.65). Particles are ~2px and cannot be picked reliably, so
        invisible planes stand in.
      */}
      {(["left", "right"] as const).map((side, i) => (
        <mesh
          key={side}
          position={[i === 0 ? -1.24 : 1.24, 0.65, 0]}
          visible={false}
          onPointerOver={(e) => {
            if (!treeInteractive()) return;
            e.stopPropagation();
            setHoverSide(i === 0 ? -1 : 1);
          }}
          onPointerOut={() => setHoverSide(0)}
          onClick={(e) => {
            if (!treeInteractive()) return;
            e.stopPropagation();
            onSelect(side);
          }}
        >
          <planeGeometry args={[1.8, 2.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

useGLTF.preload(MODEL_URL);
