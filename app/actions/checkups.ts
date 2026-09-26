"use server";

import { redirect } from "next/navigation";
import { SKINFOLD_SITES } from "@/lib/bodyfat";
import { FIELDS, TEXT_MAX, parseField, parseText } from "@/lib/fields";
import { InputError, guard, oneOf, requireAthlete, requireUuid } from "@/lib/data/guard";
import { berlinToday, isIsoDate } from "@/lib/dates";
import { MISSION_END, MISSION_START } from "@/lib/mission";
import { CIRCUMFERENCES } from "@/lib/measurements";
import { invalid, saved, type SaveResult } from "@/lib/save-result";
import { check, db } from "@/lib/supabase/server";
import type { CheckupRow } from "@/lib/supabase/database.types";

function toResult(error: unknown): SaveResult {
  if (error instanceof InputError) return invalid(error.message);
  console.error(error);
  return { ok: false, error: "Nicht gespeichert, Serverfehler. Wird automatisch wiederholt." };
}

/** Opens the checkup of that type, creating it on first use (one per person and type). */
export async function openCheckup(formData: FormData): Promise<void> {
  await guard();
  const athlete = await requireAthlete(formData.get("athlete"));
  const type = oneOf(formData.get("type"), ["start", "end"] as const, "Checkup-Art");
  const existing = await db().from("checkups").select("id").eq("athlete_id", athlete.id).eq("type", type).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  let id = existing.data?.id;
  if (!id) {
    const today = berlinToday();
    const date = type === "start" && today < MISSION_START ? MISSION_START : type === "end" && today < MISSION_END ? MISSION_END : today;
    const inserted = await db().from("checkups").insert({ athlete_id: athlete.id, type, date }).select("id").single();
    if (inserted.error) throw new Error(inserted.error.message);
    id = inserted.data.id;
  }
  redirect(`/checkups/${id}`);
}

const TEXT_OR_DATE = ["date", "notes"] as const;

export async function saveCheckupField(id: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const checkupId = requireUuid(id, "Checkup");
    let value: string | number | null;
    const circ = CIRCUMFERENCES.find((c) => c.key === field);
    if (field === "weight_kg" || circ) {
      const r = parseField(raw, circ ? circ.field : FIELDS.weight);
      if (!r.ok) throw new InputError(r.error);
      value = r.value;
    } else {
      const column = oneOf(field, TEXT_OR_DATE, "Feld");
      if (column === "date") {
        if (!isIsoDate(raw)) throw new InputError("Ungültiges Datum.");
        value = raw;
      } else {
        const r = parseText(raw, TEXT_MAX.notes);
        if (!r.ok) throw new InputError(r.error);
        value = r.value;
      }
    }
    check(await db().from("checkups").update({ [field]: value } as Partial<CheckupRow>).eq("id", checkupId), "Checkup speichern");
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

export async function saveSkinfold(checkupId: string, site: string, readingNo: number, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const id = requireUuid(checkupId, "Checkup");
    const s = oneOf(site, SKINFOLD_SITES, "Messpunkt");
    if (![1, 2, 3].includes(readingNo)) throw new InputError("Messung 1 bis 3.");
    const r = parseField(raw, FIELDS.skinfold);
    if (!r.ok) throw new InputError(r.error);
    if (r.value === null) {
      check(
        await db().from("checkup_skinfolds").delete().eq("checkup_id", id).eq("site", s).eq("reading_no", readingNo),
        "Messung löschen",
      );
    } else {
      check(
        await db()
          .from("checkup_skinfolds")
          .upsert({ checkup_id: id, site: s, reading_no: readingNo, value_mm: r.value }, { onConflict: "checkup_id,site,reading_no" }),
        "Messung speichern",
      );
    }
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteCheckup(id: string): Promise<void> {
  await guard();
  check(await db().from("checkups").delete().eq("id", requireUuid(id, "Checkup")), "Checkup löschen");
  redirect("/checkups");
}
