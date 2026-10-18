/**
 * Small tag for a stack item or a skill. One place, because these appear in
 * several sections and drifting from each other would be immediately visible.
 */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-line bg-inset px-2 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </span>
  );
}

/** The amber award tag. The accent is reserved for these and nothing else. */
export function AwardTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-soft bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent">
      <span aria-hidden="true">◆</span>
      {children}
    </span>
  );
}
