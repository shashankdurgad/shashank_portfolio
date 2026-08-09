"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { BUDGET, useQuality } from "@/lib/quality";
import { BayFloor } from "./BayFloor";
import { Lorenz } from "./Lorenz";
import { ProgressBridge } from "./ProgressBridge";
import { Rig } from "./Rig";
import { ScanSweep } from "./ScanSweep";
import { TelemetryWall } from "./TelemetryWall";

function Bay({ tier }: { tier: "high" | "low" }) {
  const budget = BUDGET[tier];
  return (
    <>
      <fog attach="fog" args={["#05070a", 12, 58]} />
      <ambientLight intensity={0.6} />
      <BayFloor divisions={budget.gridDivisions} />
      <Lorenz detail={tier} />
      <TelemetryWall maxPanels={budget.wallPanels} />
      {tier === "high" && <ScanSweep />}
    </>
  );
}

/**
 * The single fixed canvas, mounted once behind all page content.
 *
 * pointer-events:none keeps the HTML above fully interactive — the scene is
 * scenery, never an input surface.
 */
export function SceneCanvas() {
  const tier = useQuality((s) => s.tier);
  const ready = useQuality((s) => s.ready);

  // Tier detection runs in SceneRoot, ahead of this dynamic chunk.
  // "off" covers reduced-motion and missing WebGL: the canvas never mounts.
  if (!ready || tier === "off") return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0"
      data-scene-tier={tier}
    >
      <Canvas
        dpr={BUDGET[tier].dpr}
        gl={{ antialias: tier === "high", powerPreference: "high-performance" }}
        camera={{ fov: 52, near: 0.1, far: 90, position: [0, 1.75, 4] }}
        /*
         * The canvas element ignores pointer events, so page content above it
         * stays clickable; R3F still hit-tests, and interactive meshes opt back
         * in by setting pointerEvents:"auto" on the container in onPointerOver.
         * Without this the whole viewport would swallow clicks on links.
         */
        style={{ pointerEvents: "none" }}
        eventSource={
          typeof document !== "undefined" ? document.body : undefined
        }
        eventPrefix="client"
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color("#05070a"), 1);
          scene.background = new THREE.Color("#05070a");
        }}
      >
        {/* Outside Suspense: inside, it would be suspended by the very
            loading it is meant to report on. */}
        <ProgressBridge />
        <Suspense fallback={null}>
          <Bay tier={tier} />
          <Preload all />
        </Suspense>
        <Rig />
      </Canvas>
    </div>
  );
}
