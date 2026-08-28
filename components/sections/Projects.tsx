import { PROJECTS } from "@/content/projects";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

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

export function Projects() {
  return (
    <section id="projects" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="Selected work" title="Projects" />

        <div className="space-y-4">
          {PROJECTS.map((project) => (
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

              <p className="mt-1.5 text-muted">{project.summary}</p>

              {/* The one place the accent is used. */}
              <p className="mt-4 inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-1 text-xs text-[var(--color-accent)]">
                {project.award}
              </p>

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

              <div className="mt-6 flex flex-wrap gap-5 border-t border-line pt-5">
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
                >
                  Repository <ArrowIcon />
                </a>
                {project.paper && (
                  <a
                    href={project.paper}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
                  >
                    Paper <ArrowIcon />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
