/**
 * Small pill for a stack item or a skill. One place, because these appear in
 * three sections and drifting from each other would be immediately visible.
 */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-inset px-2.5 py-1 text-xs text-muted">
      {children}
    </span>
  );
}
