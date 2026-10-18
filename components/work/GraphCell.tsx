import { curve, DOT_Y, FORK_Y, HEAD_Y, LANE_STYLE, type Graph } from "@/components/work/graph";
import type { Lane } from "@/content/timeline";

/**
 * One row's slice of the graph.
 *
 * Rows have no fixed height — an opened entry grows — so the graph cannot be a
 * single SVG laid over the list. Each row draws only what passes through it,
 * in the git-log-graph way: straight runs as <line>s, whose percentage
 * endpoints stretch with the row, and fork/merge curves as paths pinned to
 * fixed pixel offsets near the row's top, where the text they point at sits.
 *
 * `row` -1 is the HEAD strip above the first entry.
 */

const PAD = 6;

export function GraphCell({
  graph,
  row,
  gap,
  active,
  className,
}: {
  graph: Graph;
  row: number;
  /** Column spacing in px. Rendered once per breakpoint rather than scaled, so
   *  dots stay round and curves keep their shape. */
  gap: number;
  /** Hovered or focused entry; everything else dims while one is set. */
  active: string | null;
  className?: string;
}) {
  const x = (col: number) => PAD + col * gap + gap / 2;
  const width = PAD * 2 + graph.cols * gap;

  function stroke(lane: Lane, id: string | null) {
    const s = LANE_STYLE[lane];
    const on = active !== null && id === active;
    return {
      fill: "none",
      stroke: on ? "var(--fg)" : id ? "var(--fg-muted)" : "var(--fg-faint)",
      strokeWidth: s.width + (on ? 0.75 : 0),
      strokeDasharray: s.dash,
      strokeLinecap: s.cap,
      opacity: active === null || on ? 1 : id ? 0.3 : 0.45,
      className: "transition-[opacity,stroke] duration-200",
    } as const;
  }

  const parts: React.ReactNode[] = [];

  for (const t of graph.trunks) {
    if (t.last < row) continue;
    const tx = x(t.col);
    if (row === -1) {
      parts.push(<line key={`t${t.col}`} x1={tx} x2={tx} y1="100%" y2={4} {...stroke(t.lane, null)} />);
    } else if (row < t.last) {
      parts.push(<line key={`t${t.col}`} x1={tx} x2={tx} y1={0} y2="100%" {...stroke(t.lane, null)} />);
    } else {
      // The trunk's root: it starts where its oldest branch leaves it.
      parts.push(
        <line key={`t${t.col}`} x1={tx} x2={tx} y1={0} y2={FORK_Y} {...stroke(t.lane, null)} />,
        <circle key={`r${t.col}`} cx={tx} cy={FORK_Y} r={2} fill="var(--fg-faint)" />,
      );
    }
  }

  const dots: React.ReactNode[] = [];

  for (const e of graph.rows) {
    if (row < e.top || row > e.row) continue;
    const bx = x(e.col);
    const tx = x(e.trunk);
    const s = stroke(e.lane, e.id);
    const k = e.id;

    if (row === -1) {
      // Still running: the branch ends in an open, pulsing head.
      parts.push(<line key={k} x1={bx} x2={bx} y1="100%" y2={HEAD_Y} {...s} />);
      dots.push(
        <g key={`h${k}`}>
          <circle
            cx={bx}
            cy={HEAD_Y}
            r={4}
            fill="var(--fg)"
            className="animate-ping motion-reduce:animate-none"
            style={{ transformBox: "fill-box", transformOrigin: "center", opacity: 0.35 }}
          />
          <circle cx={bx} cy={HEAD_Y} r={3} fill="var(--fg)" opacity={s.opacity} />
        </g>,
      );
    } else if (row === e.row) {
      parts.push(<path key={`f${k}`} d={curve(tx, FORK_Y, bx, DOT_Y)} {...s} />);
      parts.push(
        e.top === row ? (
          // Began and ended between two newer entries: a closed bubble.
          <path key={`m${k}`} d={curve(bx, DOT_Y, tx, 2)} {...s} />
        ) : (
          <line key={`u${k}`} x1={bx} x2={bx} y1={DOT_Y} y2={0} {...s} />
        ),
      );
      const on = active === e.id;
      dots.push(
        <circle
          key={`d${k}`}
          cx={bx}
          cy={DOT_Y}
          r={on ? 5 : 4}
          fill={on ? "var(--fg)" : "var(--bg)"}
          stroke="var(--fg)"
          strokeWidth={1.5}
          opacity={s.opacity}
          className="transition-all duration-200"
        />,
      );
    } else if (row === e.top) {
      parts.push(
        <line key={`v${k}`} x1={bx} x2={bx} y1="100%" y2={FORK_Y} {...s} />,
        <path key={`m${k}`} d={curve(bx, FORK_Y, tx, DOT_Y)} {...s} />,
      );
    } else {
      parts.push(<line key={`v${k}`} x1={bx} x2={bx} y1={0} y2="100%" {...s} />);
    }
  }

  return (
    <div aria-hidden="true" className={`relative shrink-0 ${className ?? ""}`} style={{ width }}>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {parts}
        {/* Dots last, so lines never cross over them. */}
        {dots}
      </svg>
    </div>
  );
}
