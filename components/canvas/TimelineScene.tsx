"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { useTimelineStore } from "@/lib/timelineStore";
import { useDoorStore } from "@/lib/doorStore";
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
  const entered = useDoorStore((s) => s.entered);

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
    /*
     * Only the left door leads here. Keying on flight progress alone drew the
     * thread inside the projects hall as well, since both doors share the same
     * flight value — the timeline's labels bled straight through the chips.
     */
    /*
     * Keyed on the flight's own door, so the thread survives the way out.
     *
     * `entered` clears on the Back click while the flight still has most of a
     * second to run; keyed to it, the timeline vanished before the camera had
     * begun to withdraw. `doorSide` holds until the flight has unwound.
     *
     * Asymmetric on purpose: 0.5..1 arriving, 0.05..0.85 leaving.
     *
     * Arriving, the thread must not be up before the camera is through the
     * doorway, which needs a window high in the range. Leaving, doorFlight
     * unwinds toward zero over 0.85s, and that same high window is spent in
     * the first fraction of it — measured, the thread was on screen for only
     * 0.23s of the retreat and the rest played over an empty grid. Fading
     * across almost the whole range keeps it drawn for the withdrawal.
     */
    const side = scroll.doorSide;
    const outbound = entered === null;
    const byFlight =
      side === "left"
        ? THREE.MathUtils.smoothstep(scroll.doorFlight, outbound ? 0.05 : 0.5, outbound ? 0.85 : 1)
        : 0;
    /*
     * While leaving, the flight alone decides how visible the thread is.
     *
     * The scroll term is dropped because the page is still parked inside the
     * timeline's section as the camera withdraws, so it would hold the thread
     * at full strength for the whole retreat and then cut. The flight is the
     * thing actually moving, so it is the thing that should govern the fade.
     *
     * `byFlight` alone is enough here precisely because doorFlight is pinned
     * at 1 until the rewind completes — the thread stays fully drawn through
     * the scroll back to the start, then fades as the camera pulls out.
     */
    const leaving = entered === null && side === "left";
    visible.current =
      side === "right" ? 0 : leaving ? byFlight : Math.max(byScroll, byFlight);

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
