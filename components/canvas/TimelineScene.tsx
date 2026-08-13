"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { useTimelineStore } from "@/lib/timelineStore";
import { Timeline } from "./Timeline";

/**
 * Bridges the scroll store to the timeline.
 *
 * The store is mutated outside React by ScrollTrigger, so this reads it in the
 * frame loop and hands the values down as refs — passing them as props would
 * mean a re-render per frame for values only the GPU and the frame loop use.
 */
export function TimelineScene() {
  const progress = useRef(0);
  const visible = useRef(0);
  const setHovered = useTimelineStore((s) => s.setHovered);

  useFrame(() => {
    const t = THREE.MathUtils.clamp(scroll.timeline, 0, 1);
    /*
     * Mapped into the same curve range the camera travels (see Rig): the
     * reveal has to track where the camera actually is, not the raw scroll,
     * or the thread draws itself somewhere the viewer is not.
     */
    progress.current = 0.12 + t * (0.86 - 0.12);

    /*
     * Fade in over the first sliver of the region and out again at the very
     * end, so the thread does not pop into existence at full strength while
     * the doors are still on screen behind it.
     */
    /*
     * Visible either by scrolling into the section or by flying through a
     * door — whichever is further along. The flight arrives at the thread
     * before any scrolling has happened, so keying on scroll alone would land
     * the camera in front of an empty scene.
     */
    const byScroll =
      THREE.MathUtils.smoothstep(t, 0.0, 0.04) *
      (1 - THREE.MathUtils.smoothstep(t, 0.97, 1.0));
    visible.current = Math.max(byScroll, THREE.MathUtils.smoothstep(scroll.doorFlight, 0.5, 1));

    if (process.env.NODE_ENV !== "production") {
      // Test hook: the thread is invisible in a screenshot when anything in
      // this chain is zero, and the chain spans three files.
      (window as unknown as { __tl?: unknown }).__tl = {
        raw: +t.toFixed(3),
        progress: +progress.current.toFixed(3),
        visible: +visible.current.toFixed(3),
      };
    }
  });

  return <Timeline progress={progress} visible={visible} onHover={setHovered} />;
}
