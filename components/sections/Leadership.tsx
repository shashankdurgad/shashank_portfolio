import { LEADERSHIP } from "@/content/leadership";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Leadership & Community — the organising behind the roles.
 *
 * Two columns because these are small cards, not essays: the grid keeps each
 * entry the size of its own claim. The kind label is printed on every card
 * even where it reads a bit dully ("Cohort" on a cohort) — the
 * leadership/cohort/exposure gradient is the point of the section, and it is
 * only honest if it is visible.
 */

const KIND_LABEL: Record<string, string> = {
  leadership: "Leadership",
  cohort: "Cohort",
  exposure: "Exposure",
};

export function Leadership() {
  return (
    <section id="leadership" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="Community" title="Leadership & Community" />

        <div className="grid gap-4 sm:grid-cols-2">
          {LEADERSHIP.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-line bg-raised p-5"
            >
              <p className="text-xs tracking-[0.14em] text-faint uppercase">
                {KIND_LABEL[entry.kind]}
              </p>

              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-medium tracking-[-0.01em]">{entry.name}</h3>
                {entry.period && (
                  <span className="text-xs text-faint">{entry.period}</span>
                )}
              </div>

              <p className="mt-0.5 text-sm text-muted">{entry.role}</p>

              {/* The award idiom again, at badge size — same meaning, amber
                  only when something was won. */}
              {entry.award && (
                <p className="mt-3 inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-2.5 py-0.5 text-xs text-[var(--color-accent)]">
                  {entry.award}
                </p>
              )}

              <ul className="mt-3 space-y-2">
                {entry.detail.map((line) => (
                  <li
                    key={line}
                    className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
