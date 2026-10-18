import { PROFILE, WINS, PAPER } from "@/content/profile";
import { Portrait } from "@/components/portrait/Portrait";
import { CursorGrid } from "@/components/CursorGrid";
import { CopyEmail } from "@/components/ui/CopyEmail";

export function Hero() {
  return (
    <section id="top" className="relative px-6 pt-16 pb-16 sm:pt-24">
      {/* Sits behind everything and never takes the pointer — the portrait's
          repel effect has to keep receiving it. z-0, not negative: the page
          background lives on <html> and would paint over it. */}
      <CursorGrid className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-10 sm:grid-cols-[1fr_auto] sm:gap-14">
        <div>
          <p className="font-mono text-xs text-faint">
            {PROFILE.location} <span className="opacity-50">·</span> from {PROFILE.origin}
          </p>

          <h1 className="mt-4 text-[clamp(2.6rem,8vw,4.75rem)] leading-[1.02] font-medium tracking-[-0.035em]">
            {PROFILE.name}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-snug text-muted sm:text-xl">
            {PROFILE.pitch}
          </p>

          <ul className="mt-6 space-y-1 font-mono text-xs text-faint">
            {PROFILE.now.map((line, i) => (
              <li key={line} className="flex items-center gap-2">
                {/* One live dot for the whole block, on its first line. */}
                <span
                  aria-hidden="true"
                  className={`relative inline-flex size-1.5 rounded-full ${i === 0 ? "bg-(--fg)" : "bg-transparent"}`}
                >
                  {i === 0 && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-(--fg) opacity-40" />
                  )}
                </span>
                {i === 0 && <span className="sr-only">Currently: </span>}
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <CopyEmail className="rounded-full bg-(--fg) px-4 py-2 font-medium text-(--bg) [&_span:last-child]:text-(--bg)/60 hover:opacity-90" />
            <a
              href={PROFILE.github}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-fg"
            >
              GitHub ↗
            </a>
            <a
              href={PROFILE.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-fg"
            >
              LinkedIn ↗
            </a>
          </div>
        </div>

        {/* Deliberately small: a signature, not a poster. Sized so the whole
            hero, proof strip included, fits a laptop viewport. */}
        <div className="relative z-10 mx-auto w-44 sm:w-52 lg:w-60">
          <Portrait className="block w-full" />
        </div>
      </div>

      {/* Proof strip. Each win links to the project that won it. */}
      <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
        <ul className="grid grid-cols-2 border-t border-line sm:grid-cols-5">
          {WINS.map((w) => (
            <li key={w.event} className="border-b border-line sm:border-b-0">
              <a
                href={w.href}
                className="group block py-4 pr-3 transition-colors hover:text-fg"
              >
                <span className="font-mono text-sm text-accent">{w.place}</span>
                <span className="mt-1 block text-sm leading-tight text-fg">{w.event}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-faint">{w.note}</span>
              </a>
            </li>
          ))}
          <li className="col-span-2 sm:col-span-1">
            <a
              href={PAPER.href}
              target="_blank"
              rel="noreferrer"
              className="block py-4 pr-3"
            >
              <span className="font-mono text-sm text-muted">paper ↗</span>
              <span className="mt-1 block text-sm leading-tight text-fg">{PAPER.title}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-faint">{PAPER.venue}</span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
