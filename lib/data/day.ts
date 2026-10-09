import "server-only";
import { db, unwrap } from "@/lib/supabase/server";
import type { DailyLogRow, MealRow, SessionRow } from "@/lib/supabase/database.types";

export type ProteinBasis = { weightKg: number; source: "checkup" | "morning"; date: string };

/** Body weight the protein target is based on, as of a given day (latest checkup, else latest morning weight). */
export async function proteinBasis(athleteId: string, date: string): Promise<ProteinBasis | null> {
  const [checkup, morning] = await Promise.all([
    db()
      .from("checkups")
      .select("weight_kg, date")
      .eq("athlete_id", athleteId)
      .lte("date", date)
      .not("weight_kg", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db()
      .from("daily_logs")
      .select("weight_kg, date")
      .eq("athlete_id", athleteId)
      .lte("date", date)
      .not("weight_kg", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (checkup.error) throw new Error(`Checkup laden: ${checkup.error.message}`);
  if (morning.error) throw new Error(`Gewicht laden: ${morning.error.message}`);
  if (checkup.data?.weight_kg) return { weightKg: checkup.data.weight_kg, source: "checkup", date: checkup.data.date };
  if (morning.data?.weight_kg) return { weightKg: morning.data.weight_kg, source: "morning", date: morning.data.date };
  return null;
}

export async function getDay(athleteId: string, date: string) {
  const [log, meals, sessions] = await Promise.all([
    db().from("daily_logs").select("*").eq("athlete_id", athleteId).eq("date", date).maybeSingle(),
    db().from("meals").select("*").eq("athlete_id", athleteId).eq("date", date).order("created_at"),
    db().from("sessions").select("*").eq("athlete_id", athleteId).eq("date", date).order("slot"),
  ]);
  if (log.error) throw new Error(`Tageswerte laden: ${log.error.message}`);
  return {
    log: log.data as DailyLogRow | null,
    meals: unwrap(meals, "Mahlzeiten laden") as MealRow[],
    sessions: unwrap(sessions, "Einheiten laden") as SessionRow[],
  };
}

/** For joint sessions: pair_id -> athlete ids of the other participants. */
export async function pairPartners(pairIds: string[], ownAthleteId: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (pairIds.length === 0) return out;
  const rows = unwrap(
    await db().from("sessions").select("pair_id, athlete_id").in("pair_id", pairIds).neq("athlete_id", ownAthleteId),
    "Gemeinsame Einheiten laden",
  );
  for (const r of rows) {
    if (!r.pair_id) continue;
    out.set(r.pair_id, [...(out.get(r.pair_id) ?? []), r.athlete_id]);
  }
  return out;
}
