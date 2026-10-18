import { LANES, type Lane, type Month, type TimelineEntry } from "@/content/timeline";

/**
 * Layout for the commit graph, computed once from the timeline data.
 *
 * Every lane is a trunk; every entry is a branch that forks off its trunk at
 * the entry's own row and merges back in at the row of the latest entry that
 * started before it ended. Entries still running when the page was built never
 * merge — they run up into the HEAD strip instead.
 *
 * Nothing here is hardcoded to the current data. Two entries of the same lane
 * whose branches are alive across any shared row get separate sub-columns, so
 * adding a role that overlaps others needs no change here.
 */

/** Vertical position of the commit dot within a row, in px. Matches the
 *  centre of the first (mono) text line: 14px top padding + half a 16px line. */
export const DOT_Y = 22;
/** Where a branch leaves its trunk, below the dot. */
export const FORK_Y = DOT_Y + 20;
/** Height of the HEAD strip above the first row, and its dot position. */
export const HEAD_H = 28;
export const HEAD_Y = 10;

/**
 * Lanes differ by stroke style rather than hue: the page has one accent and it
 * belongs to awards. Solid, dashed and dotted survive both themes and greyscale.
 */
export const LANE_STYLE: Record<Lane, { dash?: string; width: number; cap: "butt" | "round" }> = {
  work: { width: 1.5, cap: "butt" },
  study: { dash: "5 4", width: 1.5, cap: "butt" },
  society: { dash: "0.1 4", width: 2.2, cap: "round" },
};

export type Placed = TimelineEntry & {
  row: number;
  /** Highest row the branch reaches; -1 is the HEAD strip. */
  top: number;
  open: boolean;
  col: number;
  trunk: number;
  year: string;
  hash: string;
};

export type Graph = {
  rows: Placed[];
  cols: number;
  /** Per lane: trunk column and the last row it reaches down to. */
  trunks: { lane: Lane; col: number; last: number }[];
};

/** FNV-1a, trimmed to 7 hex chars — stable across builds, looks like a sha. */
function hash(id: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

/**
 * `asOf` decides which entries are still open. It is passed in from the server
 * rather than read from the clock here, so the server render and hydration
 * agree even if a month boundary falls between build and visit.
 */
export function layout(entries: TimelineEntry[], asOf: Month): Graph {
  // Sorted defensively: the graph's geometry is only valid in start order, and
  // a hand-edited data file is the likeliest place for that to slip.
  const sorted = [...entries].sort((a, b) => b.start.localeCompare(a.start));

  const rows = sorted.map((e, row) => {
    const open = e.end === null || e.end > asOf;
    // Rise through every row above that began before this entry ended. Rows
    // above are newer, so that run is contiguous from just above `row`.
    let top = row;
    if (open) top = -1;
    // Strictly before: a role that starts the month another ends is a
    // handoff, not an overlap, and drawing it as one crosses the two curves.
    else while (top > 0 && sorted[top - 1].start < e.end!) top--;
    return { ...e, row, top, open, col: 0, trunk: 0, year: e.start.slice(0, 4), hash: hash(e.id) };
  });

  const trunks: Graph["trunks"] = [];
  let next = 0;
  for (const { id: lane } of LANES) {
    const mine = rows.filter((r) => r.lane === lane);
    if (!mine.length) continue;
    const trunk = next;
    // Greedy interval colouring, oldest first. `free[k]` is the highest row
    // sub-column k is occupied from; a branch fits if it ends below that.
    // Touching counts as overlap — a merge and a fork in the same row and
    // column would draw over each other.
    const free: number[] = [];
    for (const r of [...mine].sort((a, b) => b.row - a.row)) {
      let k = free.findIndex((t) => r.row < t);
      if (k === -1) k = free.push(Infinity) - 1;
      free[k] = r.top;
      r.col = trunk + 1 + k;
      r.trunk = trunk;
    }
    trunks.push({ lane, col: trunk, last: Math.max(...mine.map((r) => r.row)) });
    next = trunk + 1 + free.length;
  }

  return { rows, cols: next, trunks };
}

/** A vertical S-curve between two points — the fork and merge connectors. */
export function curve(x1: number, y1: number, x2: number, y2: number) {
  const ym = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${ym}, ${x2} ${ym}, ${x2} ${y2}`;
}
