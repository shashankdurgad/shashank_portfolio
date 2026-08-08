"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ScrollController } from "@/components/ScrollController";
import { BootLoader } from "@/components/ui/BootLoader";
import { useQuality } from "@/lib/quality";

/**
 * The scene is client-only: it probes WebGL support and reduced-motion, which
 * have no meaning during SSR. Keeping it in its own dynamic boundary means the
 * HTML sections stay server-rendered and indexable.
 */
const SceneCanvas = dynamic(
  () => import("./SceneCanvas").then((m) => m.SceneCanvas),
  { ssr: false },
);

export function SceneRoot() {
  // Detect the tier here rather than inside SceneCanvas: that component lives
  // behind a dynamic import, so waiting for it would mean the boot overlay
  // could only appear after the chunk it exists to cover had already arrived.
  const init = useQuality((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <ScrollController />
      <SceneCanvas />
      <BootLoader />
    </>
  );
}
