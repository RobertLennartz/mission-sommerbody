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
