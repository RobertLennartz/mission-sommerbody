import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, unwrap } from "@/lib/supabase/server";
import type { AthleteRow } from "@/lib/supabase/database.types";

export const ATHLETE_COOKIE = "ms_athlete";

export const getAthletes = cache(async (): Promise<AthleteRow[]> => {
  return unwrap(await db().from("athletes").select("*").order("sort_order"), "Personen laden");
});

/** Who is entering data on this device (cookie), or null before the first choice. */
export const getSelectedAthlete = cache(async (): Promise<AthleteRow | null> => {
  const slug = (await cookies()).get(ATHLETE_COOKIE)?.value;
  if (!slug) return null;
  return (await getAthletes()).find((a) => a.slug === slug) ?? null;
});

export async function requireSelectedAthlete(): Promise<AthleteRow> {
  const athlete = await getSelectedAthlete();
  if (!athlete) redirect("/wer");
  return athlete;
}
