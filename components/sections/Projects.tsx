import { FEATURED, INDEX, type Project } from "@/content/projects";
import { AwardTag, Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SpotlightCard } from "@/components/projects/SpotlightCard";
import { Emblem } from "@/components/projects/Emblem";

/**
 * Arrival flash for a card reached by hash — the hero's proof strip links
 * straight to these. A ring that stays would read as a selected state, so it
 * fades out once the eye has found the card. Hoisted by React into <head>;
 * kept here rather than in globals.css because nothing else uses it.
 */
const TARGET_CSS = `
@keyframes project-arrive {
  0%, 35% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 55%, transparent); }
  100% { box-shadow: 0 0 0 2px transparent; }
}
.project-card:target { animation: project-arrive 2.2s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .project-card:target { animation: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 55%, transparent); }
}
`;

function FeaturedCard({ project }: { project: Project }) {
  return (
    <SpotlightCard
      id={`p-${project.id}`}
      className="project-card group relative flex flex-col overflow-hidden rounded-xl border border-line bg-raised p-6 transition-[border-color,transform] duration-300 hover:border-line-strong motion-safe:hover:-translate-y-0.5 sm:p-7"
    >
      <Emblem
        id={project.id}
        className="absolute top-5 right-5 size-16 text-fg opacity-25 transition-opacity duration-300 group-hover:opacity-50"
      />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 pr-20">
        <span className="font-mono text-xs text-faint">{project.period}</span>
        {project.award && <AwardTag>{project.award}</AwardTag>}
      </div>

      <h3 className="relative mt-4 pr-20 text-xl font-medium tracking-[-0.01em]">
        {project.name}
      </h3>
      <p className="relative mt-1.5 leading-relaxed text-muted">{project.line}</p>

      {project.metric && (
        <div className="relative mt-6">
          <p className="text-4xl font-medium tracking-[-0.03em] tabular-nums">
            {project.metric.value}
          </p>
          <p className="mt-1 font-mono text-xs text-faint">{project.metric.label}</p>
        </div>
      )}

      <ul className="relative mt-6 space-y-2">
        {project.points.map((point) => (
          <li
            key={point}
            className="text-sm leading-relaxed text-muted before:mr-2 before:text-faint before:content-['—']"
          >
            {point}
          </li>
        ))}
      </ul>

      {/* mt-auto pins stack and links to the bottom, so cards in a row line
          up there however long their points run. */}
      <div className="relative mt-auto pt-6">
        <div className="flex flex-wrap gap-1.5">
          {project.stack.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>

        {project.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-5 border-t border-line pt-4">
            {project.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-muted transition-colors hover:text-fg"
              >
                {link.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}

function IndexRow({ project }: { project: Project }) {
  const link = project.links[0];

  const cells = (
    <>
      <span className="font-medium sm:col-start-1">{project.name}</span>
      <span className="text-sm leading-relaxed text-muted sm:col-start-2">
        {project.line}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:col-start-3 sm:justify-end">
        {project.award && <AwardTag>{project.award}</AwardTag>}
        <span className="font-mono text-xs whitespace-nowrap text-faint">
          {project.period}
        </span>
        <span
          aria-hidden="true"
          className="w-3 font-mono text-xs text-faint transition-colors group-hover:text-fg"
        >
          {link ? "↗" : ""}
        </span>
      </span>
    </>
  );

  // Columns collapse into a stack on phones rather than truncating — the line
  // is the only description these get, so cutting it off defeats the row.
  const row =
    "grid gap-x-6 gap-y-1.5 px-3 py-4 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline";

  return (
    <li className="border-b border-line last:border-b-0">
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${project.name} — ${link.label}`}
          className={`group ${row} rounded-md transition-colors hover:bg-inset`}
        >
          {cells}
        </a>
      ) : (
        <div className={row}>{cells}</div>
      )}
    </li>
  );
}

export function Projects() {
  return (
    <section id="projects" className="border-t border-line px-6 py-24">
      <style href="projects-target" precedence="default">
        {TARGET_CSS}
      </style>

      <div className="mx-auto max-w-5xl">
        <SectionHeading index="02" label="projects" title="Things I've shipped" />

        <div className="grid gap-4 md:grid-cols-2">
          {FEATURED.map((project) => (
            <FeaturedCard key={project.id} project={project} />
          ))}
        </div>

        <div className="mt-16">
          <p className="mb-3 px-3 font-mono text-xs text-faint">other work</p>
          <ul className="border-t border-line">
            {INDEX.map((project) => (
              <IndexRow key={project.id} project={project} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
