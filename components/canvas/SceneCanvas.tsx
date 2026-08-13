"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { BUDGET, useQuality } from "@/lib/quality";
import { useDoorStore } from "@/lib/doorStore";
import { BayFloor } from "./BayFloor";
import { MorphField } from "./MorphField";
import { ProgressBridge } from "./ProgressBridge";
import { Starfield } from "./Starfield";
import { TimelineScene } from "./TimelineScene";
import { Rig } from "./Rig";

function Bay({ tier }: { tier: "high" | "low" }) {
  const budget = BUDGET[tier];
  return (
    <>
      <fog attach="fog" args={["#05070a", 14, 120]} />
      <ambientLight intensity={0.6} />
      <Starfield count={budget.stars} />
      <BayFloor divisions={budget.gridDivisions} />
      <MorphField
        detail={tier}
        onSelect={(side) => {
          /*
           * Only the left door leads anywhere so far. The right one opens as
           * before but has nothing behind it yet, so entering it would fly the
           * camera into empty space.
           */
          if (side === "left") useDoorStore.getState().enter(side);
        }}
      />
      <TimelineScene />
    </>
  );
}

/**
 * The single fixed canvas, mounted once behind all page content.
 *
 * pointer-events:none keeps the HTML above fully interactive — the scene is
 * scenery, never an input surface.
 */
/**
 * Resolution to render at, as a [min, max] DPR range.
 *
 * On a 1x display the browser gives no supersampling of its own, so every
 * particle edge lands on a whole pixel and the cloud reads as a grid of dots
 * rather than a volume. Rendering above native and letting the GPU downscale
 * supplies the smoothing the panel cannot — the one fix that genuinely helps a
 * low-DPR monitor, since nothing else can add samples that aren't there.
 *
 * Only applied where it is both needed and affordable: high tier, and only
 * when devicePixelRatio is 1. A 2x display already has the samples, and the
 * low tier is where a weak GPU is assumed. The eyes shade roughly one
 * full-screen pass worth of fragments at 2x, which is a light load for the
 * hardware the high tier already implies.
 */
function renderScale(tier: "high" | "low"): number | [number, number] {
  const base = BUDGET[tier].dpr;
  if (tier !== "high" || typeof window === "undefined") return base;

  /*
   * A scalar, not a range. R3F's calculateDpr clamps devicePixelRatio into
   * whatever [min, max] it is given, so the array form can never exceed the
   * display's own density — [1, 2] on a 1x panel resolves to exactly 1. Only
   * a fixed number renders above native and gets the downscale.
   */
  return window.devicePixelRatio === 1 ? 2 : base;
}

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
        dpr={renderScale(tier)}
        gl={{ antialias: tier === "high", powerPreference: "high-performance" }}
        camera={{ fov: 52, near: 0.1, far: 160, position: [0, 1.75, 4] }}
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
