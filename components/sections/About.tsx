import { SKILLS, MODULES, YEAR1_AVERAGE } from "@/content/skills";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Bars start at this score rather than zero, so the spread between modules is visible. */
const FLOOR = 40;

function pct(score: number) {
  return `${((score - FLOOR) / (100 - FLOOR)) * 100}%`;
}

export function About() {
  return (
    <section id="about" className="border-t border-line px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading index="03" label="about" title="Short version" />

        <div className="grid gap-14 md:grid-cols-[1fr_1fr] md:gap-16">
          <div>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              Grew up in Singapore, served two years as a police officer, then came
              to London for CS. I like building agents, and I trust them more once
              I can measure them.
            </p>

            <dl className="mt-10 space-y-5 text-sm">
              <div className="grid grid-cols-[7rem_1fr] gap-4">
                <dt className="font-mono text-xs text-faint">degree</dt>
                <dd>BSc CS, UCL · Predicted First · IMDA SG Digital Scholar</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-4">
                <dt className="font-mono text-xs text-faint">school</dt>
                <dd>IB 42/45, Anglo-Chinese School (Independent)</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-4">
                <dt className="font-mono text-xs text-faint">programmes</dt>
                <dd>Foundry Labs C4 · Bloomsbury Startup Academy · P&amp;G Insight Week</dd>
              </div>
              {SKILLS.map((group) => (
                <div key={group.id} className="grid grid-cols-[7rem_1fr] gap-4">
                  <dt className="font-mono text-xs text-faint">{group.label.toLowerCase()}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Chip key={item}>{item}</Chip>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Year 1 grades. A table underneath, bars on top — screen readers get
              the numbers, everyone else gets the shape. */}
          <figure>
            <figcaption className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-xs text-faint">UCL year 1 · %</span>
              <span className="text-sm">
                <span className="text-2xl font-medium tabular-nums tracking-tight">
                  {YEAR1_AVERAGE.toFixed(2)}
                </span>{" "}
                <span className="font-mono text-xs text-faint">avg</span>
              </span>
            </figcaption>

            <table className="mt-5 w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Module</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => (
                  <tr key={m.name} className="group" title={`${m.name}: ${m.score.toFixed(2)}%`}>
                    <th scope="row" className="w-full py-1.5 pr-3 text-left font-normal">
                      <span className="block text-[13px] text-muted transition-colors group-hover:text-fg">
                        {m.name}
                      </span>
                      <span className="relative mt-1.5 block h-1.5 rounded-full bg-inset">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-(--fg-muted) transition-colors group-hover:bg-(--fg)"
                          style={{ width: pct(m.score) }}
                        />
                        {/* Average marker, so each bar reads against the mean. */}
                        <span
                          aria-hidden="true"
                          className="absolute -inset-y-1 w-px bg-(--fg-faint)"
                          style={{ left: pct(YEAR1_AVERAGE) }}
                        />
                      </span>
                    </th>
                    <td className="py-1.5 align-bottom font-mono text-xs tabular-nums text-faint group-hover:text-fg">
                      {m.score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-mono text-[11px] text-faint">
              axis from {FLOOR}% · tick = average
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
}
