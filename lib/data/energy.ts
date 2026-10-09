import "server-only";
import { energyPerDay, type EnergyDay } from "@/lib/energy";
import type { RangeData } from "@/lib/data/range";
import type { AthleteRow } from "@/lib/supabase/database.types";

/** Energy per day for one person from a loaded range (see lib/energy.ts for the model). */
export function energyFromRange(athlete: AthleteRow, data: RangeData, dates: string[]): EnergyDay[] {
  return energyPerDay({
    dates,
    athlete,
    weights: [...(data.checkupWeights.get(athlete.id) ?? []), ...(data.morningWeights.get(athlete.id) ?? [])],
    logs: data.logs.filter((l) => l.athlete_id === athlete.id),
    meals: data.meals.filter((m) => m.athlete_id === athlete.id),
    sessions: data.sessions.filter((s) => s.athlete_id === athlete.id),
  });
}

/** Weight on a day: latest checkup or morning weight on or before it. */
export function weightOn(athlete: AthleteRow, data: RangeData, date: string): number | null {
  const all = [...(data.checkupWeights.get(athlete.id) ?? []), ...(data.morningWeights.get(athlete.id) ?? [])]
    .filter((w) => w.date <= date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return all[0]?.weightKg ?? null;
}
