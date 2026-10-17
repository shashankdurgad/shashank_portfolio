import { SectionHeading } from "@/components/ui/SectionHeading";
import { Timeline } from "@/components/sections/Timeline";

export function Work() {
  return (
    <section id="work" className="border-t border-line px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading label="Experience" title="Work and education" />

        {/* The waterfall marks spans by fill, outline and the live dot;
            without a key those marks are decorative rather than legible. */}
        <div className="mb-8 flex items-center gap-5 text-xs text-faint">
          <span className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-full bg-(--fg)" />
            Work
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-4 rounded-full border border-(--fg-muted)" />
            Education
          </span>
          <span className="flex items-center gap-2">
            <span className="size-[5px] rounded-full bg-signal" />
            Ongoing
          </span>
        </div>

        <Timeline />
      </div>
    </section>
  );
}
