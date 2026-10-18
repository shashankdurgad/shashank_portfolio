import { SKILLS } from "@/content/skills";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
          </div>

          <div>
            <dl className="space-y-5 text-sm">
              <div className="grid grid-cols-[7rem_1fr] gap-4">
                <dt className="font-mono text-xs text-faint">degree</dt>
                <dd>BSc CS, UCL · Predicted First</dd>
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

        </div>
      </div>
    </section>
  );
}
