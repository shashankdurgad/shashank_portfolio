"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { ReadoutSpec } from "@/content/types";
import { projects } from "@/content/projects";
import { roles } from "@/content/resume";
import {
  STOPS,
  STOP_SPACING,
  WALL_ROT_Y,
  WALL_X,
  WALL_Y,
  focusFor,
} from "@/lib/constants";
import { scroll } from "@/lib/scrollStore";
import { resolveReadout } from "./readouts";
import { ACCENT_HEX } from "./readouts/primitives";

/**
 * Only stops backed by real content get a wall panel — an empty frame beside
 * the hero reads as stray geometry, not instrumentation.
 * Derived from the content arrays, so a new project appears here for free.
 */
function wallPanels() {
  const panels: { spec: ReadoutSpec; index: number }[] = [];
  STOPS.forEach((stop, index) => {
    const spec =
      stop.section === "projects"
        ? projects[stop.item]?.readout
        : stop.section === "experience"
          ? roles[stop.item]?.readout
          : null;
    if (spec) panels.push({ spec, index });
  });
  return panels;
}

/** Bracket frame drawn around each panel — the schematic chrome. */
function PanelFrame({ color, opacity }: { color: string; opacity: number }) {
  const pts = useMemo(() => {
    const w = 3.9;
    const h = 2.35;
    const c = 0.7; // corner bracket arm length
    const seg: THREE.Vector3[] = [];
    const corner = (sx: number, sy: number) => {
      seg.push(new THREE.Vector3(sx * w, sy * h, 0));
      seg.push(new THREE.Vector3(sx * (w - c), sy * h, 0));
      seg.push(new THREE.Vector3(sx * w, sy * h, 0));
      seg.push(new THREE.Vector3(sx * w, sy * (h - c * 0.6), 0));
    };
    corner(1, 1);
    corner(-1, 1);
    corner(1, -1);
    corner(-1, -1);
    return seg;
  }, []);

  return (
    <Line points={pts} segments color={color} lineWidth={1.4} transparent opacity={opacity} />
  );
}

function Panel({
  spec,
  index,
  z,
}: {
  spec: ReadoutSpec;
  index: number;
  z: number;
}) {
  const Readout = useMemo(() => resolveReadout(spec), [spec]);
  const accent = spec.accent ?? "cyan";
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const focusRef = useRef(0);

  useFrame((_, dt) => {
    const target = focusFor(index, scroll.progress);
    // Damp so panels bloom in rather than popping.
    focusRef.current += (target - focusRef.current) * Math.min(1, dt * 4);
    const f = focusRef.current;
    if (inner.current) {
      // Readout-swap: collapses toward the core when not focused.
      const s = 0.35 + f * 0.65;
      inner.current.scale.setScalar(s);
      inner.current.position.z = (1 - f) * -1.4;
    }
    if (group.current) {
      group.current.visible = f > 0.01;
    }
  });

  /**
   * `focus` is a live getter over the damped ref, so each readout's useFrame
   * reads the current value while this component never re-renders.
   */
  const readoutProps = useMemo(
    () => ({
      get focus() {
        return focusRef.current;
      },
      accent,
      density: spec.density ?? 1,
      seed: spec.seed ?? index * 13 + 1,
    }),
    [accent, spec.density, spec.seed, index],
  );

  return (
    <group ref={group} position={[WALL_X, WALL_Y, z]} rotation={[0, WALL_ROT_Y, 0]}>
      <PanelFrame color={ACCENT_HEX[accent]} opacity={0.5} />
      <group ref={inner} scale={0.42}>
        <Readout {...readoutProps} />
      </group>
    </group>
  );
}

export function TelemetryWall({ maxPanels }: { maxPanels: number }) {
  const panels = useMemo(() => wallPanels().slice(0, maxPanels), [maxPanels]);

  return (
    <group>
      {panels.map(({ spec, index }) => (
        <Panel key={index} spec={spec} index={index} z={-index * STOP_SPACING} />
      ))}
    </group>
  );
}
