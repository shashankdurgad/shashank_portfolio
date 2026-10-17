import { PROFILE } from "@/content/profile";
import { ABOUT } from "@/content/about";
import { SKILLS } from "@/content/skills";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * About — the prose section.
 *
 * The copy moved to content/about.ts; this file is layout only. v2 rendered
 * the hero's tagline as the heading here and its blurb as the body, which
 * meant one page read the same sentences twice. The heading is now something
 * the paragraphs earn ("The long route"), and the skills grid stays as the
 * tail, because "what he works with" reads best immediately after "who did
 * the work".
 */
export function About() {
  return (
    <section id="about" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="About" title="The long route" />

        <div className="max-w-2xl space-y-4">
          {ABOUT.paras.map((para, i) => (
            <p key={i} className="leading-relaxed text-muted">
              {para}
            </p>
          ))}
        </div>

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
