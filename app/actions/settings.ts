"use server";

import { FIELDS, parseField } from "@/lib/fields";
import { InputError, guard, oneOf, requireAthlete } from "@/lib/data/guard";
import { invalid, saved, type SaveResult } from "@/lib/save-result";
import { check, db } from "@/lib/supabase/server";
import type { AthleteRow } from "@/lib/supabase/database.types";

const SPEC = {
  birth_year: FIELDS.birthYear,
  height_cm: FIELDS.height,
  protein_target_g_per_kg: FIELDS.proteinFactor,
  steps_target: FIELDS.stepsTarget,
  training_target_per_week: FIELDS.weeklyTarget,
} as const;
const REQUIRED = ["protein_target_g_per_kg", "steps_target", "training_target_per_week"];

export async function saveAthleteField(athleteId: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const athlete = await requireAthlete(athleteId);
    const column = oneOf(field, Object.keys(SPEC) as (keyof typeof SPEC)[], "Feld");
    const r = parseField(raw, SPEC[column]);
    if (!r.ok) throw new InputError(r.error);
    if (r.value === null && REQUIRED.includes(column)) throw new InputError("Dieser Wert darf nicht leer sein.");
    check(await db().from("athletes").update({ [column]: r.value } as Partial<AthleteRow>).eq("id", athlete.id), "Einstellung speichern");
    return saved;
  } catch (error) {
    if (error instanceof InputError) return invalid(error.message);
    console.error(error);
    return { ok: false, error: "Nicht gespeichert, Serverfehler." };
  }
}
