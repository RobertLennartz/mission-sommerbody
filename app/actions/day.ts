"use server";

import { refresh } from "next/cache";
import { FIELDS, TEXT_MAX, parseField, parseText } from "@/lib/fields";
import { InputError, guard, oneOf, requireAthlete, requireDate, requireUuid } from "@/lib/data/guard";
import { invalid, saved, type SaveResult } from "@/lib/save-result";
import { check, db } from "@/lib/supabase/server";
import type { DailyLogRow, MealRow } from "@/lib/supabase/database.types";

const DAILY_FIELDS = ["steps", "weight_kg", "sleep_hours", "energy", "notes"] as const;
type DailyField = (typeof DAILY_FIELDS)[number];

function toResult(error: unknown): SaveResult {
  if (error instanceof InputError) return invalid(error.message);
  console.error(error);
  return { ok: false, error: "Nicht gespeichert, Serverfehler. Wird automatisch wiederholt." };
}

function parseDaily(field: DailyField, raw: string): number | string | null {
  if (field === "notes") {
    const r = parseText(raw, TEXT_MAX.notes);
    if (!r.ok) throw new InputError(r.error);
    return r.value;
  }
  if (field === "energy") {
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new InputError("Energie von 1 bis 5.");
    return n;
  }
  const spec = field === "steps" ? FIELDS.steps : field === "weight_kg" ? FIELDS.weight : FIELDS.sleep;
  const r = parseField(raw, spec);
  if (!r.ok) throw new InputError(r.error);
  return r.value;
}

/** One field of the day (steps, morning weight, sleep, energy, notes). */
export async function saveDailyField(athleteId: string, date: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const athlete = await requireAthlete(athleteId);
    const day = requireDate(date);
    const column = oneOf(field, DAILY_FIELDS, "Feld");
    const value = parseDaily(column, raw);
    check(
      await db()
        .from("daily_logs")
        .upsert({ athlete_id: athlete.id, date: day, ...({ [column]: value } as Partial<DailyLogRow>) }, { onConflict: "athlete_id,date" }),
      "Tageswert speichern",
    );
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export async function addMeal(athleteId: string, date: string, mealType: string): Promise<void> {
  await guard();
  const athlete = await requireAthlete(athleteId);
  check(
    await db()
      .from("meals")
      .insert({ athlete_id: athlete.id, date: requireDate(date), meal_type: oneOf(mealType, MEAL_TYPES, "Mahlzeit") }),
    "Mahlzeit anlegen",
  );
  refresh();
}

export async function saveMealField(mealId: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const id = requireUuid(mealId, "Mahlzeit");
    const column = oneOf(field, ["description", "protein_g", "kcal", "meal_type"] as const, "Feld");
    let value: string | number | null;
    if (column === "description") {
      const r = parseText(raw, TEXT_MAX.mealDescription);
      if (!r.ok) throw new InputError(r.error);
      value = r.value ?? "";
    } else if (column === "meal_type") {
      value = oneOf(raw, MEAL_TYPES, "Mahlzeit");
    } else {
      const r = parseField(raw, column === "protein_g" ? FIELDS.protein : FIELDS.kcal);
      if (!r.ok) throw new InputError(r.error);
      value = r.value;
    }
    check(await db().from("meals").update({ [column]: value } as Partial<MealRow>).eq("id", id), "Mahlzeit speichern");
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteMeal(mealId: string): Promise<void> {
  await guard();
  check(await db().from("meals").delete().eq("id", requireUuid(mealId, "Mahlzeit")), "Mahlzeit löschen");
  refresh();
}
