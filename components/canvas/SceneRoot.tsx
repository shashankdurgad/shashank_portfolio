"use client";

import dynamic from "next/dynamic";
import { ScrollController } from "@/components/ScrollController";

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
  return (
    <>
      <ScrollController />
      <SceneCanvas />
    </>
  );
}
