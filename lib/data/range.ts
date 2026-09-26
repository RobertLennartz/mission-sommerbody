import "server-only";
import { db, unwrap } from "@/lib/supabase/server";
import type { WeightPoint } from "@/lib/stats";
import type { CheckupRow, DailyLogRow, MealRow, SessionRow } from "@/lib/supabase/database.types";

export type RangeData = {
  sessions: SessionRow[];
  logs: DailyLogRow[];
  meals: MealRow[];
  checkups: CheckupRow[];
  /** All weights up to `to` (also before `from`), per athlete, for protein targets. */
  checkupWeights: Map<string, WeightPoint[]>;
  morningWeights: Map<string, WeightPoint[]>;
};

export async function loadRange(athleteIds: string[], from: string, to: string): Promise<RangeData> {
  const [sessions, logs, meals, checkups, allLogWeights] = await Promise.all([
    db().from("sessions").select("*").in("athlete_id", athleteIds).gte("date", from).lte("date", to).order("date").order("slot"),
    db().from("daily_logs").select("*").in("athlete_id", athleteIds).gte("date", from).lte("date", to).order("date"),
    db().from("meals").select("*").in("athlete_id", athleteIds).gte("date", from).lte("date", to).order("created_at"),
    db().from("checkups").select("*").in("athlete_id", athleteIds).lte("date", to).order("date"),
    db().from("daily_logs").select("athlete_id, date, weight_kg").in("athlete_id", athleteIds).lte("date", to).not("weight_kg", "is", null),
  ]);
  const checkupRows = unwrap(checkups, "Checkups laden");
  const group = (rows: { athlete_id: string; date: string; weight_kg: number | null }[]) => {
    const out = new Map<string, WeightPoint[]>();
    for (const r of rows) {
      if (r.weight_kg === null) continue;
      out.set(r.athlete_id, [...(out.get(r.athlete_id) ?? []), { date: r.date, weightKg: r.weight_kg }]);
    }
    return out;
  };
  return {
    sessions: unwrap(sessions, "Einheiten laden"),
    logs: unwrap(logs, "Tageswerte laden"),
    meals: unwrap(meals, "Mahlzeiten laden"),
    checkups: checkupRows,
    checkupWeights: group(checkupRows),
    morningWeights: group(unwrap(allLogWeights, "Gewichte laden")),
  };
}
