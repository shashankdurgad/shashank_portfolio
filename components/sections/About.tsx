import { PROFILE } from "@/content/profile";
import { SKILLS } from "@/content/skills";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About() {
  return (
    <section id="about" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="About" title={PROFILE.tagline} />

        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          {PROFILE.blurb}
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {PROFILE.interests.map((interest) => (
            <Chip key={interest}>{interest}</Chip>
          ))}
        </div>

        <div className="mt-12 space-y-7">
          {SKILLS.map((group) => (
            <div
              key={group.id}
              className="grid gap-x-8 gap-y-3 sm:grid-cols-[9rem_1fr]"
            >
              <h3 className="text-sm text-faint">{group.label}</h3>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
