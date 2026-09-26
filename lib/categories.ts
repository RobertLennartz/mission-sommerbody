import type { Category, MealType, SessionStatus } from "@/lib/supabase/database.types";

export const CATEGORY_LABEL: Record<Category, string> = { strength: "Kraft", cardio: "Ausdauer", hiit: "HIIT" };
export const CATEGORY_CODE: Record<Category, string> = { strength: "K", cardio: "A", hiit: "H" };
export const CATEGORY_COLOR: Record<Category, string> = {
  strength: "var(--color-strength)",
  cardio: "var(--color-cardio)",
  hiit: "var(--color-hiit)",
};
export const CATEGORIES: Category[] = ["strength", "cardio", "hiit"];

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

/** Strength counts toward the strength goal; cardio and HIIT share the endurance goal. */
export function goalBucket(category: Category): "strength" | "cardio" {
  return category === "strength" ? "strength" : "cardio";
}
