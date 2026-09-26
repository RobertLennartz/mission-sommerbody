/** Flat bar: ink frame, yellow fill, green once the target is reached. */
export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const reached = max > 0 && value >= max;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className="h-3 w-full"
      style={{ border: "1.5px solid var(--color-ink)", background: "var(--color-bg)" }}
    >
      <div
        className="h-full transition-[width] duration-200"
        style={{ width: `${pct}%`, background: reached ? "var(--color-good)" : "var(--color-acc)" }}
      />
    </div>
  );
}
