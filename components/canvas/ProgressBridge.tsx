"use client";

import { useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useQuality } from "@/lib/quality";

/**
 * Publishes drei's load progress out of the Canvas and into the quality store,
 * so the DOM boot overlay can read it. `useProgress` only works inside the
 * R3F tree, hence this bridge.
 */
export function ProgressBridge() {
  const { progress, active } = useProgress();
  const setProgress = useQuality((s) => s.setProgress);

  useEffect(() => {
    setProgress(progress);
  }, [progress, setProgress]);

  // A scene with no async assets never goes active, so `progress` can sit at 0
  // forever. Report complete once loading has settled.
  useEffect(() => {
    if (!active) setProgress(100);
  }, [active, setProgress]);

  return null;
}
