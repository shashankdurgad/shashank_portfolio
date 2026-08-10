import { SceneRoot } from "@/components/canvas/SceneRoot";
import { Hero } from "@/components/sections/Hero";
import { MorphStage } from "@/components/sections/MorphStage";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-arc focus:bg-void focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:text-arc"
      >
        Skip to content
      </a>

      {/* Static schematic underlay — visible even when the canvas is off. */}
      <div
        aria-hidden="true"
        className="bp-grid pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
      />

      <SceneRoot />

      {/* All copy lives here: real HTML, server-rendered, selectable. */}
      <main id="main" className="relative z-10">
        <Hero />
        <MorphStage />
      </main>
    </>
  );
}
