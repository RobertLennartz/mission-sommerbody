import type { Category, MealType, SessionStatus } from "@/lib/supabase/database.types";

export const CATEGORY_LABEL: Record<Category, string> = { strength: "Kraft", cardio: "Ausdauer", hiit: "HIIT", recovery: "Recovery", light: "Locker" };
export const CATEGORY_CODE: Record<Category, string> = { strength: "K", cardio: "A", hiit: "H", recovery: "R", light: "L" };
export const CATEGORY_COLOR: Record<Category, string> = {
  strength: "var(--color-strength)",
  cardio: "var(--color-cardio)",
  hiit: "var(--color-hiit)",
  recovery: "var(--color-recovery)",
  light: "var(--color-light)",
};
/** Text on a filled category mark: white on the dark two, ink on the light three. */
export const CATEGORY_ON_COLOR: Record<Category, string> = {
  strength: "#FFFFFF",
  cardio: "#FFFFFF",
  hiit: "var(--color-ink)",
  recovery: "var(--color-ink)",
  light: "var(--color-ink)",
};
export const CATEGORIES: Category[] = ["strength", "cardio", "hiit", "light", "recovery"];

/** Quick buttons on the today page: "Was habt ihr heute gemacht?" */
export const QUICK_ACTIVITIES: { label: string; category: Category; activity: string | null }[] = [
  { label: "Kraft", category: "strength", activity: null },
  { label: "Laufen", category: "cardio", activity: "Laufen" },
  { label: "Schwimmen", category: "cardio", activity: "Schwimmen" },
  { label: "Spinning", category: "cardio", activity: "Spinning" },
  { label: "HIIT", category: "hiit", activity: "HIIT" },
  // Easy movement around a training, no extra effort (Robert, 10.10.2026).
  { label: "Rad locker", category: "light", activity: "Lockeres Radfahren" },
  { label: "Gehen", category: "light", activity: "Gehen" },
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

/** Recovery is ticked, not timed: one entry per chosen item. */
export const RECOVERY_OPTIONS = ["Sauna", "Eisbad", "Massage"] as const;

/**
 * Recovery and easy movement ("locker": warm-up bike, walking) are shown but
 * do not count toward the weekly training goal.
 */
export function countsAsTraining(category: Category): boolean {
  return category !== "recovery" && category !== "light";
}
