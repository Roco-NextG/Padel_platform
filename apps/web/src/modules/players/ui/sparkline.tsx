export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <span className={className} style={{ display: "inline-block", width: 44 }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 44;
      const y = 16 - ((v - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 44 16" width="44" height="16" className={className} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
