import { PROFILE } from "@/content/profile";
import { Portrait } from "@/components/portrait/Portrait";
import { CursorGrid } from "@/components/CursorGrid";

export function Hero() {
  return (
    <section id="top" className="relative px-6 pt-20 pb-24 sm:pt-28">
      {/* Sits behind the copy and the portrait, and never takes the pointer —
          the portrait's own repel effect has to keep receiving it.
          z-0, not a negative index: the page background lives on <html>, and a
          negative index puts the canvas behind that and paints it out. */}
      <CursorGrid className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-sm text-faint">{PROFILE.location}</p>

        <h1 className="mt-5 text-[clamp(2.5rem,7vw,4.25rem)] leading-[1.05] font-medium tracking-[-0.03em]">
          {PROFILE.name}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          {PROFILE.blurb}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`mailto:${PROFILE.email}`}
            className="rounded-full bg-[var(--fg)] px-5 py-2.5 text-sm font-medium text-[var(--bg)] transition-opacity hover:opacity-88"
          >
            Get in touch
          </a>
          <a
            href={PROFILE.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* The focal object. Sized so the head lands near the fold on a laptop
          without the copy above it being pushed off-screen on a phone. */}
      <div className="relative z-10 mx-auto mt-16 w-full max-w-104 sm:mt-20">
        <Portrait className="block w-full" />
      </div>
    </section>
  );
}
