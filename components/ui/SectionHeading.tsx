/**
 * Section opener: a mono index like `02 / work` above a short title.
 * The index is the section's anchor and its place on the page in one.
 */
export function SectionHeading({
  index,
  label,
  title,
}: {
  index: string;
  label: string;
  title: string;
}) {
  return (
    <div className="mb-10 sm:mb-12">
      <p className="font-mono text-xs text-faint">
        {index} <span className="opacity-50">/</span> {label}
      </p>
      <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
