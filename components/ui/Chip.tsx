/**
 * Small pill for a stack item or a skill. One place, because these appear in
 * three sections and drifting from each other would be immediately visible.
 * The only response is a hairline brightening under a fine pointer — the pill
 * is a label, not a control, so it must not light up like one.
 */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-inset px-2.5 py-1 text-xs text-muted transition-colors hover:border-line-strong">
      {children}
    </span>
  );
}
