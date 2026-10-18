/**
 * Small line-drawn emblems, one per featured project.
 *
 * Each hints at what the project actually does rather than decorating it, and
 * draws in currentColor so it inks correctly in either theme. They only move
 * on card hover (the card is the `group`), and `motion-safe` keeps them still
 * for anyone who has asked for reduced motion.
 *
 * SVG transforms default to the viewport origin, so anything that rotates or
 * scales opts into `transform-box: fill-box` to pivot around itself.
 */

const PIVOT = "[transform-box:fill-box] origin-center";
const EASE = "transition-transform duration-700 ease-out";

/** Small deterministic PRNG, so the swarm is the same on server and client. */
function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Nested robust regions widening from 5 mm to 25 mm, with a gripper at the centre. */
function BuildAPolicy() {
  return (
    <>
      {[6, 12, 18, 24, 30].map((r, i) => (
        <circle
          key={r}
          cx="32"
          cy="34"
          r={r}
          strokeDasharray={i === 4 ? "none" : "2 3"}
          opacity={0.35 + i * 0.15}
          className={`${PIVOT} ${EASE} motion-safe:group-hover:scale-[1.08]`}
          style={{ transitionDelay: `${i * 60}ms` }}
        />
      ))}
      <g className={`${EASE} motion-safe:group-hover:translate-y-[3px]`}>
        <path d="M32 6v14M26 20h12" />
        <path d="M27 20v8l2 3M37 20v8l-2 3" />
      </g>
    </>
  );
}

/** Two orbits whose paths cross, and the conjunction point they negotiate over. */
function Sentinel() {
  return (
    <>
      <circle cx="32" cy="32" r="5" />
      <g className={`${PIVOT} ${EASE} motion-safe:group-hover:rotate-[24deg]`}>
        <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(-25 32 32)" />
        <circle cx="10" cy="40" r="2" fill="currentColor" />
      </g>
      <g className={`${PIVOT} ${EASE} motion-safe:group-hover:-rotate-[24deg]`}>
        <ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(30 32 32)" />
        <circle cx="55" cy="44" r="2" fill="currentColor" />
      </g>
      <circle cx="32" cy="32" r="12" strokeDasharray="1 3" opacity="0.5" />
    </>
  );
}

/** A patrol swarm: scattered agents, local edges, and one quorum triangle. */
function Sentrix() {
  const rand = seeded("sentrix");
  const nodes = Array.from({ length: 11 }, () => ({
    x: 8 + rand() * 48,
    y: 8 + rand() * 48,
  }));
  const edges: [number, number][] = [];
  nodes.forEach((a, i) =>
    nodes.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 20) edges.push([i, j]);
    }),
  );
  const [q0, q1, q2] = [0, 1, 2];
  return (
    <>
      {edges.map(([i, j]) => (
        <line
          key={`${i}-${j}`}
          x1={nodes[i].x}
          y1={nodes[i].y}
          x2={nodes[j].x}
          y2={nodes[j].y}
          opacity="0.4"
        />
      ))}
      <path
        d={`M${nodes[q0].x} ${nodes[q0].y}L${nodes[q1].x} ${nodes[q1].y}L${nodes[q2].x} ${nodes[q2].y}Z`}
        strokeDasharray="2 2"
        className="transition-opacity duration-500 motion-safe:opacity-40 motion-safe:group-hover:opacity-100"
      />
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i < 3 ? 2.6 : 1.8}
          fill={i < 3 ? "currentColor" : "var(--bg-raised)"}
          className={`${PIVOT} ${EASE} motion-safe:group-hover:scale-125`}
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
    </>
  );
}

/** A cursor tracing a path through a wireframed page. */
function Onflow() {
  return (
    <>
      <rect x="6" y="8" width="52" height="44" rx="4" />
      <path d="M6 16h52" opacity="0.6" />
      <path d="M12 24h20M12 30h28M12 36h16" opacity="0.4" />
      <rect x="38" y="40" width="14" height="6" rx="2" opacity="0.6" />
      <path
        d="M14 46C22 40 26 26 34 28S44 42 45 43"
        strokeDasharray="60"
        className="motion-safe:[stroke-dashoffset:60] transition-[stroke-dashoffset] duration-1000 ease-out motion-safe:group-hover:[stroke-dashoffset:0]"
      />
      <path
        d="M45 43l0 9 2.4-2.4 2 4 1.6-.8-2-4h3.4z"
        fill="currentColor"
        strokeWidth="0.6"
      />
    </>
  );
}

const EMBLEMS: Record<string, () => React.ReactElement> = {
  buildapolicy: BuildAPolicy,
  sentinel: Sentinel,
  sentrix: Sentrix,
  onflow: Onflow,
};

export function Emblem({ id, className }: { id: string; className?: string }) {
  const Drawing = EMBLEMS[id];
  if (!Drawing) return null;
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <Drawing />
    </svg>
  );
}
