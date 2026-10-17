import { PROJECTS } from "@/content/projects";
import { PUBLICATIONS } from "@/content/publications";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Projects, in the two tiers the content module declares.
 *
 * Selected projects get the full card; everything else gets a border-t row
 * with the one-line summary. The rows exist because deleting the smaller
 * builds (or inflating them into cards) both lie about the shape of the work.
 * The publication band closes the section: it is a credit adjacent to the
 * builds, and its own data module means paper #2 grows this into a real
 * research section rather than relocating it.
 *
 * Array order from content/projects.ts is display order in both tiers — no
 * sorting here to disagree with it.
 */

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/**
 * The accent pill. Amber's meaning is "this was won", so it stays on awards
 * — and on the publication band below, which is the same kind of fact.
 */
function AwardBadge({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-1 text-xs text-[var(--color-accent)]">
      {children}
    </p>
  );
}

const LINK_CLASS =
  "inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg";

export function Projects() {
  const selected = PROJECTS.filter((p) => p.tier === "selected");
  const other = PROJECTS.filter((p) => p.tier === "other");

  return (
    <section id="projects" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="Selected work" title="Projects" />

        <div className="space-y-4">
          {selected.map((project) => (
            <article
              key={project.id}
              className="rounded-2xl border border-line bg-raised p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-medium tracking-[-0.01em]">
                  {project.name}
                </h3>
                <span className="text-sm text-faint">{project.period}</span>
              </div>

              {project.role && (
                <p className="mt-1 text-xs text-faint">{project.role}</p>
              )}

              <p className="mt-1.5 text-muted">{project.summary}</p>

              {project.award && <AwardBadge>{project.award}</AwardBadge>}

              {/* The numbers first: a reader who never reaches the bullets
                  still gets what the project did. */}
              {project.metrics && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.metrics.map((metric) => (
                    <Chip key={metric.label}>
                      <span className="font-medium text-fg tabular-nums">
                        {metric.value}
                      </span>{" "}
                      {metric.label}
                    </Chip>
                  ))}
                </div>
              )}

              <ul className="mt-5 space-y-2">
                {project.detail.map((line) => (
                  <li
                    key={line}
                    className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
                  >
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {project.stack.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>

              {project.links.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-5 border-t border-line pt-5">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK_CLASS}
                    >
                      {link.label} <ArrowIcon />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <h3 className="mt-16 text-xs tracking-[0.14em] text-faint uppercase">
          Other work
        </h3>

        <div>
          {other.map((project) => (
            <div key={project.id} className="border-t border-line py-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <h4 className="font-medium">{project.name}</h4>
                <span className="text-xs text-faint">{project.period}</span>
                {project.award && (
                  <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-2.5 py-0.5 text-xs text-[var(--color-accent)]">
                    {project.award}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {project.summary}
              </p>

              {project.links.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-4">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
                    >
                      {link.label} <ArrowIcon />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Publication band. Tinted with the award idiom because a paper is
            the same kind of fact as a win: earned, verifiable, external. */}
        {PUBLICATIONS.map((pub) => (
          <div
            key={pub.id}
            className="mt-14 rounded-2xl border border-[color-mix(in_srgb,var(--color-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] p-5 sm:p-6"
          >
            <p className="text-xs tracking-[0.14em] text-[var(--color-accent)] uppercase">
              Publication
            </p>

            <h3 className="mt-2 leading-snug font-medium">
              <a
                href={pub.href}
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-80"
              >
                {pub.title}
              </a>
            </h3>

            <p className="mt-1.5 text-sm text-muted">
              {pub.authors} <span className="text-faint">— co-authored</span>
            </p>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {pub.summary}
            </p>

            <div className="mt-4">
              <a
                href={pub.href}
                target="_blank"
                rel="noreferrer"
                className={LINK_CLASS}
              >
                Paper ({pub.venue}) <ArrowIcon />
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
