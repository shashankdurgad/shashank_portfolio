import { PROFILE } from "@/content/profile";
import { Portrait } from "@/components/portrait/Portrait";
import { CursorGrid } from "@/components/CursorGrid";

/**
 * The hero, assembled from named PROFILE fields rather than inline strings:
 * eyebrow → name → role line → the claim → the pitch → proof tiles → CTAs.
 *
 * The order is deliberate: the tagline is a statement, so it sits below the
 * name with room of its own instead of wearing the name's type size, and the
 * proof tiles sit under the blurb so the pitch is followed by receipts before
 * any button is asked to do the persuading. Tiles are links only where the
 * data has a target; a tile with nowhere honest to go stays a tile.
 */
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

        {/* Role line. Joined with middots rather than a sentence, so the
            tenses can stay quiet — the timeline says what is finished. */}
        <p className="mt-5 text-sm text-muted">
          {PROFILE.roles.map((role, i) => (
            <span key={role.org}>
              {i > 0 && <span className="text-faint"> · </span>}
              {role.label}
              {", "}
              {"href" in role && role.href ? (
                <a
                  href={role.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-(--line-strong) underline-offset-4 transition-colors hover:text-fg"
                >
                  {role.org}
                </a>
              ) : (
                role.org
              )}
            </span>
          ))}
        </p>

        {/* The claim. Sized as a statement, not as a second heading. */}
        <p className="mx-auto mt-6 max-w-xl text-2xl leading-snug font-medium tracking-[-0.02em]">
          {PROFILE.tagline}
        </p>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
          {PROFILE.blurb}
        </p>

        <div className="mx-auto mt-9 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          {PROFILE.proof.map((tile) => {
            const body = (
              <>
                <p className="text-xl font-medium tabular-nums">{tile.value}</p>
                <p className="mt-1 text-xs text-faint">{tile.label}</p>
              </>
            );
            // Whole tile links only when there is somewhere honest to land:
            // an external source, or an in-page anchor.
            return "href" in tile && tile.href ? (
              <a
                key={tile.value}
                href={tile.href}
                {...(tile.href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className="rounded-2xl border border-line bg-raised p-4 transition-colors hover:border-line-strong"
              >
                {body}
              </a>
            ) : (
              <div
                key={tile.value}
                className="rounded-2xl border border-line bg-raised p-4"
              >
                {body}
              </div>
            );
          })}
        </div>

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
          <a
            href={PROFILE.resume}
            className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            Résumé
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
