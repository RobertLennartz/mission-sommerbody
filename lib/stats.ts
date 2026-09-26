import { countsAsTraining } from "@/lib/categories";
import type { IsoDate } from "@/lib/dates";
import { weeklyTarget } from "@/lib/mission";
import type { Category, SessionStatus } from "@/lib/supabase/database.types";

export type WeightPoint = { date: IsoDate; weightKg: number };

/**
 * Protein target for one day: weight of the latest checkup on or before the
 * day, otherwise the latest morning weight, times g/kg. Null without weight.
 */
export function proteinTargetFor(
  date: IsoDate,
  checkups: WeightPoint[],
  morning: WeightPoint[],
  gramsPerKg: number,
): number | null {
  const latest = (points: WeightPoint[]) =>
    points.filter((p) => p.date <= date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const basis = latest(checkups) ?? latest(morning);
  return basis ? basis.weightKg * gramsPerKg : null;
}

export function sumByDate<T extends { date: IsoDate }>(rows: T[], value: (row: T) => number | null): Map<IsoDate, number> {
  const out = new Map<IsoDate, number>();
  for (const row of rows) out.set(row.date, (out.get(row.date) ?? 0) + (value(row) ?? 0));
  return out;
}

/** Average over the days that have a value; a missing entry is not a zero. */
export function averageOfPresent(values: (number | null | undefined)[]): { average: number | null; days: number } {
  const present = values.filter((v): v is number => typeof v === "number");
  if (present.length === 0) return { average: null, days: 0 };
  return { average: present.reduce((a, b) => a + b, 0) / present.length, days: present.length };
}

export type GoalProgress = { done: number; target: number };

/** Done trainings of any kind against one weekly target; recovery is counted separately. */
export function weekGoal(
  sessions: { category: Category; status: SessionStatus; date: IsoDate }[],
  monday: IsoDate,
  target: number,
): { training: GoalProgress; recovery: number } {
  const done = sessions.filter((s) => s.status === "done");
  return {
    training: { done: done.filter((s) => countsAsTraining(s.category)).length, target: weeklyTarget(target, monday) },
    recovery: done.filter((s) => !countsAsTraining(s.category)).length,
  };
}

export type DayNutrition = {
  /** What counts for the day: the daily total if set, otherwise the sum of the meals. */
  protein: number | null;
  kcal: number | null;
  proteinFromTotal: boolean;
  kcalFromTotal: boolean;
  mealProtein: number | null;
  mealKcal: number | null;
  meals: number;
};

/** Robert, 27.09.2026: a daily total overrides the meals; meals stay optional. */
export function dayNutrition(
  log: { protein_total_g: number | null; kcal_total: number | null } | undefined,
  meals: { protein_g: number | null; kcal: number | null }[],
): DayNutrition {
  const mealProtein = meals.length ? meals.reduce((sum, m) => sum + (m.protein_g ?? 0), 0) : null;
  const mealKcal = meals.some((m) => m.kcal !== null) ? meals.reduce((sum, m) => sum + (m.kcal ?? 0), 0) : null;
  const proteinTotal = log?.protein_total_g ?? null;
  const kcalTotal = log?.kcal_total ?? null;
  return {
    protein: proteinTotal ?? mealProtein,
    kcal: kcalTotal ?? mealKcal,
    proteinFromTotal: proteinTotal !== null,
    kcalFromTotal: kcalTotal !== null,
    mealProtein,
    mealKcal,
    meals: meals.length,
  };
}

/** Nutrition per day for one person, only days with a total or at least one meal. */
export function nutritionByDate(
  logs: { date: IsoDate; protein_total_g: number | null; kcal_total: number | null }[],
  meals: { date: IsoDate; protein_g: number | null; kcal: number | null }[],
): Map<IsoDate, DayNutrition> {
  const dates = new Set<IsoDate>([
    ...logs.filter((l) => l.protein_total_g !== null || l.kcal_total !== null).map((l) => l.date),
    ...meals.map((m) => m.date),
  ]);
  const out = new Map<IsoDate, DayNutrition>();
  for (const d of dates) {
    out.set(d, dayNutrition(logs.find((l) => l.date === d), meals.filter((m) => m.date === d)));
  }
  return out;
}
