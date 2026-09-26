import { CATEGORY_CODE, CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/categories";
import type { Category, SessionStatus } from "@/lib/supabase/database.types";

/**
 * Category square with letter code. Status by fill: planned = outline,
 * done = filled, skipped = grey.
 */
export function CategoryMark({ category, status, size = 28 }: { category: Category; status: SessionStatus; size?: number }) {
  const color = status === "skipped" ? "var(--color-dead)" : CATEGORY_COLOR[category];
  const filled = status === "done";
  return (
    <span
      aria-label={CATEGORY_LABEL[category]}
      title={CATEGORY_LABEL[category]}
      className="t-strong inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.46),
        border: `2px solid ${color}`,
        background: filled ? color : "transparent",
        color: filled ? "var(--color-bg)" : color,
      }}
    >
      {CATEGORY_CODE[category]}
    </span>
  );
}
