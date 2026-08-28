import { SectionHeading } from "@/components/ui/SectionHeading";
import { Timeline } from "@/components/sections/Timeline";

export function Work() {
  return (
    <section id="work" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="Experience" title="Work and education" />

        {/* The rail marks work and education by node shape; without a key that
            distinction is decorative rather than legible. */}
        <div className="mb-8 flex items-center gap-5 text-xs text-faint">
          <span className="flex items-center gap-2">
            <span className="size-2.25 rounded-full bg-(--fg)" />
            Work
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.25 rounded-full border border-(--fg-muted)" />
            Education
          </span>
        </div>

        <Timeline />
      </div>
    </section>
  );
}
