"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHIP, HALL_CENTRE, chipPlacement } from "@/lib/hallLayout";
import { PROJECTS } from "@/lib/projectData";
import { Chip } from "./Chip";

/**
 * The hall of projects: chips in alcoves on an arc, seen from a viewer who
 * stands still and turns to look.
 *
 * Hover expands a chip; clicking opens its repository. Both come from one
 * screen-space hit test rather than R3F's events — the canvas is
 * pointer-events:none so the page above stays clickable, which means pointer
 * events land on the HTML sections and onPointerOver never fires.
 */

const projected = new THREE.Vector3();

/**
 * Hit radius, in pixels.
 *
 * Chips are large on screen, so this is generous enough to feel forgiving at
 * the edges without letting two adjacent chips both claim the same pointer —
 * the nearest always wins.
 */
const HIT_RADIUS_PX = 120;

function useChipPicking(
  visible: React.RefObject<number>,
  onHover: (id: string | null) => void,
) {
  const [hovered, setHovered] = useState<string | null>(null);
  const pointer = useRef({ x: 0, y: 0, seen: false });
  const hoveredRef = useRef<string | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.seen = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    /*
     * Click is bound here too, on the window, for the same reason the hover is
     * — an onClick on the mesh would never fire. Reading the hovered chip from
     * a ref rather than state keeps the handler from needing to be rebound
     * every time the hover changes.
     */
    const onClick = () => {
      if ((visible.current ?? 0) < 0.5) return;
      const id = hoveredRef.current;
      if (!id) return;
      const project = PROJECTS.find((p) => p.id === id);
      if (project) window.open(project.repo, "_blank", "noopener,noreferrer");
    };
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [visible]);

  useFrame((state) => {
    if ((visible.current ?? 0) < 0.5) {
      if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        setHovered(null);
        onHover(null);
      }
      return;
    }
    if (!pointer.current.seen) return;

    const { width, height } = state.size;
    let best: string | null = null;
    let bestDist = HIT_RADIUS_PX;

    for (let i = 0; i < PROJECTS.length; i++) {
      projected.copy(chipPlacement(i).position);
      projected.project(state.camera);
      // Behind the camera: project() wraps these round to the far side.
      if (projected.z > 1) continue;

      const sx = (projected.x * 0.5 + 0.5) * width;
      const sy = (-projected.y * 0.5 + 0.5) * height;
      const d = Math.hypot(sx - pointer.current.x, sy - pointer.current.y);
      if (d < bestDist) {
        bestDist = d;
        best = PROJECTS[i].id;
      }
    }

    if (best !== hoveredRef.current) {
      hoveredRef.current = best;
      setHovered(best);
      onHover(best);
    }
  });

  return hovered;
}

export function Hall({
  visible,
  onHover,
}: {
  /** 0..1 as the hall takes over. */
  visible: React.RefObject<number>;
  /** Reports the hovered chip, so the card can render outside the canvas. */
  onHover: (id: string | null) => void;
}) {
  const root = useRef<THREE.Group>(null);
  const hovered = useChipPicking(visible, onHover);

  /*
   * Cursor affordance while a chip is under the pointer. Reuses the scene's
   * existing target crosshair rather than setting body.style.cursor, which
   * would shadow the crosshair defined in globals.css.
   */
  useEffect(() => {
    if (!hovered) {
      delete document.body.dataset.cursor;
      return;
    }
    document.body.dataset.cursor = "target";
    return () => {
      delete document.body.dataset.cursor;
    };
  }, [hovered]);

  useFrame(() => {
    if (root.current) root.current.visible = (visible.current ?? 0) > 0.01;
  });

  return (
    <group ref={root} visible={false}>
      {/* The chips are standard-material, so they need something to light. */}
      <pointLight
        position={[HALL_CENTRE.x, HALL_CENTRE.y + 1.2, HALL_CENTRE.z + 1.5]}
        intensity={5}
        distance={12}
        color="#7dd3fc"
      />

      {PROJECTS.map((project, i) => (
        <Chip
          key={project.id}
          project={project}
          index={i}
          active={hovered === project.id}
          visible={visible}
        />
      ))}

      {/* Floor glow beneath the arc, so the chips stand in a place. */}
      <mesh
        position={[HALL_CENTRE.x, HALL_CENTRE.y - CHIP.height * 0.75, HALL_CENTRE.z - 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[4.2, 48]} />
        <meshBasicMaterial
          color="#2bb8d4"
          transparent
          opacity={0.045}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
