export function SectionHeading({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <div className="mb-10">
      <p className="text-xs tracking-[0.14em] text-faint uppercase">{label}</p>
      <h2 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
