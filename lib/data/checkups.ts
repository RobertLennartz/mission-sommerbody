import "server-only";
import { computeBodyComposition, SKINFOLD_SITES, type BodyComposition, type SkinfoldReadings, type SkinfoldSite } from "@/lib/bodyfat";
import { db, unwrap } from "@/lib/supabase/server";
import type { AthleteRow, CheckupRow } from "@/lib/supabase/database.types";

export type CheckupDetail = CheckupRow & { readings: SkinfoldReadings; rawReadings: Record<string, number>; composition: BodyComposition };

export async function getCheckups(athletes: AthleteRow[]): Promise<CheckupDetail[]> {
  const checkups = unwrap(await db().from("checkups").select("*").order("date"), "Checkups laden");
  if (checkups.length === 0) return [];
  const folds = unwrap(
    await db().from("checkup_skinfolds").select("*").in("checkup_id", checkups.map((c) => c.id)).order("reading_no"),
    "Hautfalten laden",
  );
  return checkups.map((c) => {
    const readings: SkinfoldReadings = {};
    const rawReadings: Record<string, number> = {};
    for (const f of folds.filter((x) => x.checkup_id === c.id)) {
      if (!(SKINFOLD_SITES as readonly string[]).includes(f.site)) continue;
      const site = f.site as SkinfoldSite;
      readings[site] = [...(readings[site] ?? []), f.value_mm];
      rawReadings[`${site}:${f.reading_no}`] = f.value_mm;
    }
    const athlete = athletes.find((a) => a.id === c.athlete_id);
    return {
      ...c,
      readings,
      rawReadings,
      composition: computeBodyComposition({
        readings,
        birthYear: athlete?.birth_year ?? null,
        measuredOn: c.date,
        weightKg: c.weight_kg,
        formula: athlete?.bodyfat_formula ?? null,
      }),
    };
  });
}
