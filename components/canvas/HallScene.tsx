"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { useDoorStore } from "@/lib/doorStore";
import { useProjectStore } from "@/lib/projectStore";
import { Hall } from "./Hall";

/**
 * Mounts the hall and tells it how far the flight through the right door has
 * carried the viewer.
 *
 * Unlike the timeline there is no scroll traverse here: the hall appears with
 * the flight and stays. Visibility is therefore keyed on flight progress
 * alone.
 */
export function HallScene() {
  const visible = useRef(0);
  const entered = useDoorStore((s) => s.entered);
  const setHovered = useProjectStore((s) => s.setHovered);

  useFrame(() => {
    /*
     * Keyed on the flight's own door rather than on `entered`.
     *
     * `entered` clears the moment Back is pressed, so keying on it made the
     * chips vanish on the click and left the viewer zooming out of an empty
     * doorway. `scroll.doorSide` stays set until the flight has fully unwound,
     * which keeps the hall in view for the whole way out.
     */
    /*
     * Asymmetric, for the same reason as the timeline's: arriving, the chips
     * must not be up before the camera is through the doorway; leaving, the
     * flight unwinds over 0.85s and a window high in the range would be spent
     * in the first moments of it, leaving the retreat to play over an empty
     * room.
     */
    const outbound = entered === null;
    visible.current =
      scroll.doorSide === "right"
        ? THREE.MathUtils.smoothstep(
            scroll.doorFlight,
            outbound ? 0.05 : 0.4,
            outbound ? 0.85 : 0.95,
          )
        : 0;

    if (process.env.NODE_ENV !== "production") {
      // Test hook: the hall is invisible in a screenshot when this is zero,
      // and the chain that sets it spans three files.
      (window as unknown as { __hall?: unknown }).__hall = {
        visible: +visible.current.toFixed(3),
        flight: +scroll.doorFlight.toFixed(3),
      };
    }
  });

  return <Hall visible={visible} onHover={setHovered} />;
}
