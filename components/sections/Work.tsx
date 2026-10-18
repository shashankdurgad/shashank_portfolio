import { SectionHeading } from "@/components/ui/SectionHeading";
import { Timeline } from "@/components/sections/Timeline";
import { LANE_STYLE } from "@/components/work/graph";
import { LANES, type Month } from "@/content/timeline";

export function Work() {
  // Read on the server and handed down, so which branches count as still open
  // is decided once — see layout() in components/work/graph.ts.
  const asOf = new Date().toISOString().slice(0, 7) as Month;

  return (
    <section id="work" className="border-t border-line px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading index="01" label="work" title="Where I've been building" />

        {/* Lanes are told apart by line style alone; without a key that is
            decoration rather than information. */}
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-faint">
          {LANES.map(({ id, label }) => {
            const s = LANE_STYLE[id];
            return (
              <span key={id} className="flex items-center gap-2">
                <svg width="22" height="4" aria-hidden="true">
                  <line
                    x1="1"
                    x2="21"
                    y1="2"
                    y2="2"
                    stroke="var(--fg-muted)"
                    strokeWidth={s.width}
                    strokeDasharray={s.dash}
                    strokeLinecap={s.cap}
                  />
                </svg>
                {label}
              </span>
            );
          })}
          <span className="sm:ml-auto">click a commit to open it</span>
        </div>

        <Timeline asOf={asOf} />
      </div>
    </section>
  );
}
