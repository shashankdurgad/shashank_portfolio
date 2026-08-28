"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { ANGLES, DOOR, DOOR_CENTRE, LABELS, SWING, hingeX } from "@/lib/doors";
import { useDoorStore } from "@/lib/doorStore";
import { scroll } from "@/lib/scrollStore";

/**
 * The two doors: hover peeks them open, click swings them wide.
 *
 * Geometry rather than particles. Every earlier stage of the morph built its
 * shape from the point cloud, but a door is a flat panel with a hard edge and
 * additive particles have no shading to draw an edge with — the same
 * limitation that sank an earlier attempt at a brain. Meshes here, with the
 * particle field left to be the atmosphere around them.
 */

/**
 * Soft radial falloff for the doorway glow, generated once.
 *
 * A canvas gradient rather than an asset: it is a dozen lines, needs no
 * network request, and keeps the doors self-contained.
 */
const glowTexture = (() => {
  if (typeof document === "undefined") return null;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
})();

/** One hinged panel. Rotation lives on a pivot group at the outer edge. */
function Door({
  side,
  label,
  visible,
  onOpen,
  onHover,
}: {
  side: -1 | 1;
  label: string;
  /** 0..1 as the stage fades in; below ~0 the door is not interactive. */
  visible: React.RefObject<number>;
  onOpen: () => void;
  onHover: (side: number) => void;
}) {
  const root = useRef<THREE.Group>(null);
  const pivot = useRef<THREE.Group>(null);
  const panelMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const edgeMat = useRef<THREE.LineBasicMaterial>(null);
  const frameMat = useRef<THREE.LineBasicMaterial>(null);
  const textRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);
  const [opened, setOpened] = useState(false);
  const entered = useDoorStore((s) => s.entered);

  useFrame((_, delta) => {
    if (!pivot.current) return;

    const v = visible.current ?? 0;
    const live = v > 0.5;

    /*
     * Hide the whole door until its stage arrives.
     *
     * Fading the panel alone is not enough: the frame outline, the glow plane
     * and the label are separate objects, and they were rendering over the
     * hero from the very first frame. Toggling the group covers all of them,
     * and skips their draw calls entirely while hidden.
     */
    if (root.current) root.current.visible = v > 0.01;

    /*
     * Opening is a commitment while the reader is through: the target ignores
     * hover, so the door does not twitch as the pointer passes.
     *
     * Leaving closes it again, but only once the flight out has carried the
     * camera clear. Shutting it while still travelling would swing the panel
     * through the viewer, and they would watch it close from inside the
     * doorway rather than see it close behind them.
     */
    /*
     * 0.12, below where either destination has finished fading.
     *
     * At 0.35 the panel began swinging shut while the scene behind it was
     * still fully drawn — the hall does not start fading until 0.4 — so the
     * door closed in front of the chips and the viewer watched a shut door
     * rather than a room receding through a doorway. Closing last, once the
     * room behind is already gone, is what makes the exit read as withdrawing
     * through the opening.
     */
    const flownOut = !entered && scroll.doorFlight < 0.12;
    const held = opened && !flownOut;

    const target = held
      ? ANGLES.open
      : live && hovered && !opened
        ? ANGLES.peek
        : ANGLES.rest;

    if (process.env.NODE_ENV !== "production" && side === -1) {
      // Test hook: the resting angle is the thing to assert, and it cannot be
      // read reliably from a screenshot.
      (window as unknown as { __doorAngle?: number }).__doorAngle =
        pivot.current.rotation.y;
    }

    /*
     * Drop the latch once the door has swung back past the peek, so a later
     * hover peeks again rather than being read as a still-open door.
     *
     * Tested against the peek angle, not zero: the pointer is usually still
     * over the door that was just clicked, so it settles at the peek and never
     * reaches zero — a stricter threshold leaves the latch set forever.
     */
    if (opened && flownOut && Math.abs(pivot.current.rotation.y) <= ANGLES.peek + 0.02) {
      setOpened(false);
    }

    /*
     * Signed per side so both doors swing toward the viewer rather than into
     * the screen, which would show the camera their rear faces.
     *
     * The sign is `+side`, worked out from the geometry rather than guessed:
     * the left panel sits at +x of its hinge, so a negative Y rotation carries
     * its free edge to +z, and the right panel is the mirror of that.
     */
    const signed = target * side;
    const current = pivot.current.rotation.y;
    const rate = Math.abs(signed) > Math.abs(current) ? SWING.opening : SWING.closing;
    pivot.current.rotation.y = current + (signed - current) * Math.min(1, delta * rate);

    // The glow behind the doorway strengthens as the door actually opens,
    // driven off the real angle rather than the state so it tracks the easing.
    if (glowMat.current) {
      const openness = THREE.MathUtils.clamp(
        Math.abs(pivot.current.rotation.y) / ANGLES.open,
        0,
        1,
      );
      glowMat.current.opacity = openness * 0.5 * v;
    }

    if (panelMat.current) {
      panelMat.current.opacity = v;
      panelMat.current.emissiveIntensity = hovered && live ? 0.7 : 0.35;
    }
    if (frameMat.current) frameMat.current.opacity = v * 0.9;
    if (textRef.current) {
      const m = textRef.current.material as THREE.Material;
      m.transparent = true;
      m.opacity = v;
    }
    if (edgeMat.current) {
      edgeMat.current.opacity = v * (hovered && live ? 1 : 0.55);
    }
  });

  const x = hingeX(side);

  return (
    <group ref={root} visible={false} position={[x, DOOR_CENTRE.y, DOOR_CENTRE.z]}>
      {/*
        Glow behind the aperture — the payoff for opening the door.

        Radial rather than a flat fill: a uniform plane has a hard rectangular
        edge and reads as another solid panel sitting behind the first, which
        is the opposite of light spilling through a doorway.
      */}
      <mesh position={[-side * DOOR.width * 0.5, 0, -0.12]}>
        <planeGeometry args={[DOOR.width, DOOR.height]} />
        <meshBasicMaterial
          ref={glowMat}
          color="#2bb8d4"
          map={glowTexture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/*
        Frame, drawn as a static outline around the aperture. Without it a
        part-open door reads as a floating tilted rectangle rather than as a
        door standing in a doorway.
      */}
      <lineSegments position={[-side * DOOR.width * 0.5, 0, 0]}>
        <edgesGeometry
          args={[new THREE.PlaneGeometry(DOOR.width + 0.05, DOOR.height + 0.05)]}
        />
        <lineBasicMaterial ref={frameMat} color="#1e3a52" transparent opacity={0} />
      </lineSegments>

      <group ref={pivot}>
        {/*
          The panel is offset half its width from the pivot, so the group
          rotates about the door's outer edge rather than its centre.
        */}
        <mesh
          position={[-side * DOOR.width * 0.5, 0, 0]}
          onPointerOver={(e) => {
            if ((visible.current ?? 0) <= 0.5) return;
            e.stopPropagation();
            setHovered(true);
            onHover(side);
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover(0);
          }}
          onClick={(e) => {
            if ((visible.current ?? 0) <= 0.5) return;
            e.stopPropagation();
            setOpened(true);
            onOpen();
          }}
        >
          <boxGeometry args={[DOOR.width, DOOR.height, DOOR.depth]} />
          {/*
            Near-black and barely emissive. A brighter panel renders as a flat
            saturated slab that fights the page's dark schematic palette — the
            door should read as a dark plane with a lit edge, not a light box.
          */}
          <meshStandardMaterial
            ref={panelMat}
            color="#0a1622"
            emissive="#0d2b3d"
            emissiveIntensity={0.35}
            metalness={0.2}
            roughness={0.85}
            transparent
            opacity={0}
          />
        </mesh>

        {/* Lit outline, so the panel has a crisp edge against the dark. */}
        <lineSegments position={[-side * DOOR.width * 0.5, 0, 0]}>
          <edgesGeometry
            args={[new THREE.BoxGeometry(DOOR.width, DOOR.height, DOOR.depth)]}
          />
          <lineBasicMaterial ref={edgeMat} color="#2bb8d4" transparent opacity={0} />
        </lineSegments>

        {/*
          Label, sat just proud of the panel face so it is never z-fought.
          Measured at 0.1: ~26px on desktop and still ~14px at the 0.62 mobile
          scale, both clear of the point where small caps stop being readable.
        */}
        <Text
          ref={textRef}
          position={[-side * DOOR.width * 0.5, 0, DOOR.depth / 2 + 0.005]}
          fontSize={0.1}
          maxWidth={DOOR.width * 0.82}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
          color="#cbd5e1"
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

export function Doors({
  visible,
  onSelect,
  onHover,
}: {
  visible: React.RefObject<number>;
  onSelect: (side: "left" | "right") => void;
  /** -1 left, +1 right, 0 none. Lets the halo react alongside the door. */
  onHover: (side: number) => void;
}) {
  return (
    <>
      {/* The panels are standard-material, so they need something to light. */}
      <pointLight position={[0, 1.6, 2.6]} intensity={3.2} distance={9} color="#7dd3fc" />
      <Door
        side={-1}
        label={LABELS.left}
        visible={visible}
        onOpen={() => onSelect("left")}
        onHover={onHover}
      />
      <Door
        side={1}
        label={LABELS.right}
        visible={visible}
        onOpen={() => onSelect("right")}
        onHover={onHover}
      />
    </>
  );
}
