import type { Category, MealType, SessionStatus } from "@/lib/supabase/database.types";

export const CATEGORY_LABEL: Record<Category, string> = { strength: "Kraft", cardio: "Ausdauer", hiit: "HIIT", recovery: "Recovery" };
export const CATEGORY_CODE: Record<Category, string> = { strength: "K", cardio: "A", hiit: "H", recovery: "R" };
export const CATEGORY_COLOR: Record<Category, string> = {
  strength: "var(--color-strength)",
  cardio: "var(--color-cardio)",
  hiit: "var(--color-hiit)",
  recovery: "var(--color-recovery)",
};
/** Text on a filled category mark: white on the dark two, ink on the light two. */
export const CATEGORY_ON_COLOR: Record<Category, string> = {
  strength: "#FFFFFF",
  cardio: "#FFFFFF",
  hiit: "var(--color-ink)",
  recovery: "var(--color-ink)",
};
export const CATEGORIES: Category[] = ["strength", "cardio", "hiit", "recovery"];

/** Quick buttons on the today page: "Was habt ihr heute gemacht?" */
export const QUICK_ACTIVITIES: { label: string; category: Category; activity: string | null }[] = [
  { label: "Kraft", category: "strength", activity: null },
  { label: "Laufen", category: "cardio", activity: "Laufen" },
  { label: "Schwimmen", category: "cardio", activity: "Schwimmen" },
  { label: "Rad", category: "cardio", activity: "Radfahren" },
  { label: "HIIT", category: "hiit", activity: "HIIT" },
  { label: "Recovery", category: "recovery", activity: "Recovery" },
];

export const STATUS_LABEL: Record<SessionStatus, string> = {
  planned: "Geplant",
  done: "Erledigt",
  skipped: "Ausgelassen",
};

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
  snack: "Snack",
};
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/** Recovery is shown but does not count toward the weekly training goal. */
export function countsAsTraining(category: Category): boolean {
  return category !== "recovery";
}
