import { SceneRoot } from "@/components/canvas/SceneRoot";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";

export default function Home() {
  return (
    <>
      {/* Static schematic underlay — visible even when the canvas is off. */}
      <div
        aria-hidden="true"
        className="bp-grid pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
      />

      <SceneRoot />

      {/* All copy lives here: real HTML, server-rendered, selectable. */}
      <main id="main" className="relative z-10">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>
    </>
  );
}
