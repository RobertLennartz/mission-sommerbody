"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { FIELDS, TEXT_MAX, parseField, parseText } from "@/lib/fields";
import { InputError, guard, oneOf, requireAthlete, requireDate, requireUuid } from "@/lib/data/guard";
import { isIsoDate, startOfIsoWeek } from "@/lib/dates";
import { MISSION_END, MISSION_START } from "@/lib/mission";
import { invalid, saved, type SaveResult } from "@/lib/save-result";
import { check, db, unwrap } from "@/lib/supabase/server";
import type { Category, PlanTemplateExerciseRow, PlanTemplateRow, SessionRow, SessionSetRow } from "@/lib/supabase/database.types";

const CATEGORIES = ["strength", "cardio", "hiit", "recovery"] as const;
const STATUSES = ["planned", "done", "skipped"] as const;

function toResult(error: unknown): SaveResult {
  if (error instanceof InputError) return invalid(error.message);
  console.error(error);
  return { ok: false, error: "Nicht gespeichert, Serverfehler. Wird automatisch wiederholt." };
}

// ---------------------------------------------------------------------------
// Creating sessions
// ---------------------------------------------------------------------------

export type CreateState = { error?: string };

/** "Einheit planen" / "Einheit erfassen": one person or both, from a template or free. */
export async function createSessions(_prev: CreateState, formData: FormData): Promise<CreateState> {
  await guard();
  let ids: string[];
  let date: string;
  try {
    date = requireDate(formData.get("date"));
    const who = String(formData.get("who") ?? "");
    const athleteIds =
      who === "both"
        ? (await db().from("athletes").select("id").order("sort_order")).data?.map((a) => a.id) ?? []
        : [(await requireAthlete(who)).id];
    if (athleteIds.length === 0) throw new InputError("Bitte auswählen, für wen.");
    const status = oneOf(formData.get("status"), ["planned", "done"] as const, "Status");
    const templateRaw = String(formData.get("template") ?? "");
    const template = templateRaw ? requireUuid(templateRaw, "Vorlage") : null;
    let category: Category | null = null;
    let title: string | null = null;
    if (!template) {
      category = oneOf(formData.get("category"), CATEGORIES, "Kategorie");
      const t = parseText(String(formData.get("title") ?? ""), TEXT_MAX.title);
      if (!t.ok) throw new InputError(t.error);
      if (!t.value) throw new InputError("Bitte einen Titel eingeben, zum Beispiel Oberkörper oder Radtour.");
      title = t.value;
    }
    const result = await db().rpc("create_sessions", {
      p_athletes: athleteIds,
      p_date: date,
      p_status: status,
      p_template: template,
      p_category: category,
      p_title: title,
    });
    ids = unwrap(result, "Einheit anlegen") as string[];
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    console.error(error);
    return { error: "Anlegen hat nicht geklappt. Bitte noch einmal versuchen." };
  }
  const back = String(formData.get("back") ?? "");
  if (ids.length === 1 && (formData.get("status") === "done" || back === "session")) redirect(`/einheit/${ids[0]}`);
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : `/planung?woche=${startOfIsoWeek(date)}`);
}

/**
 * Quick log from the today page: "Was habt ihr heute gemacht?" Creates a done
 * session (optionally for both) and opens the own one for details. Several per
 * day are fine, each tap adds one more.
 */
export async function quickLogSession(athleteId: string, date: string, category: string, activity: string | null, both: boolean): Promise<void> {
  await guard();
  const athlete = await requireAthlete(athleteId);
  const day = requireDate(date);
  const cat = oneOf(category, ["strength", "cardio", "hiit", "recovery"] as const, "Kategorie");
  const act = activity ? parseText(activity, TEXT_MAX.activity) : null;
  if (act && !act.ok) throw new InputError(act.error);
  const athletes = unwrap(await db().from("athletes").select("id").order("sort_order"), "Personen laden");
  const ids = both ? [athlete.id, ...athletes.map((a) => a.id).filter((id) => id !== athlete.id)] : [athlete.id];
  const title = act?.ok && act.value ? act.value : cat === "strength" ? "Kraft" : cat === "hiit" ? "HIIT" : cat === "recovery" ? "Recovery" : "Ausdauer";
  const created = unwrap(
    await db().rpc("create_sessions", { p_athletes: ids, p_date: day, p_status: "done", p_template: null, p_category: cat, p_title: title }),
    "Einheit anlegen",
  ) as string[];
  if (cat !== "strength" && act?.ok && act.value) {
    check(await db().from("sessions").update({ activity: act.value }).in("id", created), "Aktivität speichern");
  }
  // create_sessions returns the ids in the order of p_athletes: the first is the own one.
  redirect(`/einheit/${created[0]}`);
}

export type FillState = { error?: string; message?: string };

export async function fillWeek(_prev: FillState, formData: FormData): Promise<FillState> {
  await guard();
  try {
    const monday = requireDate(formData.get("monday"));
    if (startOfIsoWeek(monday) !== monday) throw new InputError("Ungültige Woche.");
    const weekTemplate = requireUuid(formData.get("weekTemplate"), "Wochenvorlage");
    const who = String(formData.get("who") ?? "");
    const athletes = unwrap(await db().from("athletes").select("id, slug").order("sort_order"), "Personen laden");
    const athleteIds = who === "both" ? athletes.map((a) => a.id) : [(await requireAthlete(who)).id];
    const replace = formData.get("replace") === "on";
    const count = unwrap(
      await db().rpc("fill_week", {
        p_athletes: athleteIds,
        p_week_template: weekTemplate,
        p_monday: monday,
        p_from: MISSION_START,
        p_to: MISSION_END,
        p_replace: replace,
      }),
      "Woche füllen",
    ) as number;
    refresh();
    return {
      message:
        count === 0
          ? "Keine Einheit angelegt: Die Vorlage hat keine Tage in dieser Woche innerhalb der Mission."
          : `${count} ${count === 1 ? "Einheit" : "Einheiten"} angelegt${replace ? ", vorher geplante ersetzt" : ""}.`,
    };
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    console.error(error);
    return { error: "Woche füllen hat nicht geklappt. Bitte noch einmal versuchen." };
  }
}

// ---------------------------------------------------------------------------
// Changing sessions
// ---------------------------------------------------------------------------

async function loadSession(id: string): Promise<SessionRow> {
  const r = await db().from("sessions").select("*").eq("id", requireUuid(id, "Einheit")).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  if (!r.data) throw new InputError("Einheit nicht gefunden.");
  return r.data;
}

async function partnerIds(session: SessionRow, withPair: boolean): Promise<string[]> {
  if (!withPair || !session.pair_id) return [session.id];
  const rows = unwrap(await db().from("sessions").select("id").eq("pair_id", session.pair_id), "Gemeinsame Einheit laden");
  return rows.map((r) => r.id);
}

async function nextSlot(athleteId: string, date: string): Promise<number> {
  const rows = unwrap(
    await db().from("sessions").select("slot").eq("athlete_id", athleteId).eq("date", date).order("slot", { ascending: false }).limit(1),
    "Reihenfolge laden",
  );
  return (rows[0]?.slot ?? 0) + 1;
}

export async function moveSession(id: string, date: string, withPair: boolean): Promise<void> {
  await guard();
  const session = await loadSession(id);
  const target = requireDate(date);
  if (target === session.date) return;
  for (const sid of await partnerIds(session, withPair)) {
    const s = sid === session.id ? session : await loadSession(sid);
    check(
      await db().from("sessions").update({ date: target, slot: await nextSlot(s.athlete_id, target) }).eq("id", sid),
      "Einheit verschieben",
    );
  }
  refresh();
}

/** Swap with the neighbour above or below on the same day. */
export async function reorderSession(id: string, direction: "up" | "down"): Promise<void> {
  await guard();
  const session = await loadSession(id);
  const sameDay = unwrap(
    await db().from("sessions").select("id, slot").eq("athlete_id", session.athlete_id).eq("date", session.date).order("slot"),
    "Reihenfolge laden",
  );
  const i = sameDay.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sameDay.length) return;
  // Renumber the whole day so duplicate slot numbers can never block a swap.
  const order = sameDay.map((s) => s.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [index, sid] of order.entries()) {
    check(await db().from("sessions").update({ slot: index + 1 }).eq("id", sid), "Reihenfolge speichern");
  }
  refresh();
}

export async function deleteSession(id: string, withPair: boolean, redirectTo?: string): Promise<void> {
  await guard();
  const session = await loadSession(id);
  const ids = await partnerIds(session, withPair);
  check(await db().from("sessions").delete().in("id", ids), "Einheit löschen");
  if (!withPair && session.pair_id) {
    // The remaining partner is no longer a joint session.
    check(await db().from("sessions").update({ pair_id: null }).eq("pair_id", session.pair_id), "Verknüpfung lösen");
  }
  if (redirectTo) redirect(redirectTo);
  refresh();
}

export async function setSessionStatus(id: string, status: string): Promise<void> {
  await guard();
  const session = await loadSession(id);
  check(
    await db().from("sessions").update({ status: oneOf(status, STATUSES, "Status") }).eq("id", session.id),
    "Status speichern",
  );
  refresh();
}

const SESSION_FIELDS = ["title", "duration_min", "rpe", "activity", "distance_km", "avg_hr", "notes", "date"] as const;

export async function saveSessionField(id: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const session = await loadSession(id);
    const column = oneOf(field, SESSION_FIELDS, "Feld");
    let value: string | number | null;
    if (column === "title" || column === "activity" || column === "notes") {
      const max = column === "title" ? TEXT_MAX.title : column === "activity" ? TEXT_MAX.activity : TEXT_MAX.notes;
      const r = parseText(raw, max);
      if (!r.ok) throw new InputError(r.error);
      if (column === "title" && !r.value) throw new InputError("Der Titel darf nicht leer sein.");
      value = r.value;
    } else if (column === "date") {
      if (!isIsoDate(raw)) throw new InputError("Ungültiges Datum.");
      value = raw;
    } else if (column === "rpe") {
      if (raw === "") value = null;
      else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > 10) throw new InputError("RPE von 1 bis 10.");
        value = n;
      }
    } else {
      const spec = column === "duration_min" ? FIELDS.duration : column === "distance_km" ? FIELDS.distance : FIELDS.heartRate;
      const r = parseField(raw, spec);
      if (!r.ok) throw new InputError(r.error);
      value = r.value;
    }
    check(await db().from("sessions").update({ [column]: value } as Partial<SessionRow>).eq("id", session.id), "Einheit speichern");
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

// ---------------------------------------------------------------------------
// Exercises and sets
// ---------------------------------------------------------------------------

/** Exercise by name, created on the fly. Case and surrounding spaces do not matter. */
async function exerciseIdByName(rawName: string): Promise<string> {
  const r = parseText(rawName, TEXT_MAX.exerciseName);
  if (!r.ok) throw new InputError(r.error);
  if (!r.value) throw new InputError("Bitte einen Übungsnamen eingeben.");
  const name = r.value.replace(/\s+/g, " ");
  const find = async () =>
    unwrap(await db().from("exercises").select("id, name"), "Übungen laden").find(
      (e) => e.name.trim().toLowerCase() === name.toLowerCase(),
    );
  const existing = await find();
  if (existing) return existing.id;
  const inserted = await db().from("exercises").insert({ name }).select("id").single();
  if (inserted.error) {
    const again = await find(); // created at the same moment on the other phone
    if (again) return again.id;
    throw new Error(inserted.error.message);
  }
  return inserted.data.id;
}

export type ExerciseState = { error?: string };

export async function addSessionExercise(sessionId: string, _prev: ExerciseState, formData: FormData): Promise<ExerciseState> {
  await guard();
  try {
    const session = await loadSession(sessionId);
    const exerciseId = await exerciseIdByName(String(formData.get("name") ?? ""));
    const last = unwrap(
      await db().from("session_exercises").select("position").eq("session_id", session.id).order("position", { ascending: false }).limit(1),
      "Reihenfolge laden",
    );
    check(
      await db()
        .from("session_exercises")
        .insert({ session_id: session.id, exercise_id: exerciseId, position: (last[0]?.position ?? 0) + 1, target_sets: 3 }),
      "Übung hinzufügen",
    );
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    console.error(error);
    return { error: "Übung hinzufügen hat nicht geklappt." };
  }
  refresh();
  return {};
}

export async function removeSessionExercise(sessionExerciseId: string): Promise<void> {
  await guard();
  check(
    await db().from("session_exercises").delete().eq("id", requireUuid(sessionExerciseId, "Übung")),
    "Übung entfernen",
  );
  refresh();
}

/** Number of set rows shown for an exercise (add or remove a row). */
export async function setTargetSets(sessionExerciseId: string, count: number): Promise<void> {
  await guard();
  const id = requireUuid(sessionExerciseId, "Übung");
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new InputError("1 bis 20 Sätze.");
  check(await db().from("session_exercises").update({ target_sets: count }).eq("id", id), "Satzzahl speichern");
  // Sets beyond the new count go away with the row.
  check(await db().from("session_sets").delete().eq("session_exercise_id", id).gt("set_no", count), "Sätze löschen");
  refresh();
}

export async function saveSet(sessionExerciseId: string, setNo: number, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const id = requireUuid(sessionExerciseId, "Übung");
    if (!Number.isInteger(setNo) || setNo < 1 || setNo > 30) throw new InputError("Ungültige Satznummer.");
    const column = oneOf(field, ["reps", "weight_kg"] as const, "Feld");
    const r = parseField(raw, column === "reps" ? FIELDS.reps : FIELDS.setWeight);
    if (!r.ok) throw new InputError(r.error);
    check(
      await db()
        .from("session_sets")
        .upsert({ session_exercise_id: id, set_no: setNo, ...({ [column]: r.value } as Partial<SessionSetRow>) }, { onConflict: "session_exercise_id,set_no" }),
      "Satz speichern",
    );
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function createTemplate(formData: FormData): Promise<void> {
  await guard();
  const r = parseText(String(formData.get("name") ?? ""), TEXT_MAX.templateName);
  if (!r.ok || !r.value) throw new InputError("Bitte einen Namen eingeben.");
  const category = oneOf(formData.get("category"), CATEGORIES, "Kategorie");
  const inserted = await db()
    .from("plan_templates")
    .insert({ name: r.value, category, default_duration_min: category === "strength" ? 60 : 45 })
    .select("id")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") throw new InputError("Eine Vorlage mit diesem Namen gibt es schon.");
    throw new Error(inserted.error.message);
  }
  redirect(`/planung/vorlagen/${inserted.data.id}`);
}

const TEMPLATE_FIELDS = ["name", "category", "default_duration_min", "activity", "default_distance_km", "notes"] as const;

export async function saveTemplateField(id: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const templateId = requireUuid(id, "Vorlage");
    const column = oneOf(field, TEMPLATE_FIELDS, "Feld");
    let value: string | number | null;
    if (column === "category") value = oneOf(raw, CATEGORIES, "Kategorie");
    else if (column === "name" || column === "activity" || column === "notes") {
      const r = parseText(raw, column === "name" ? TEXT_MAX.templateName : column === "activity" ? TEXT_MAX.activity : 2000);
      if (!r.ok) throw new InputError(r.error);
      if (column === "name" && !r.value) throw new InputError("Der Name darf nicht leer sein.");
      value = r.value;
    } else {
      const r = parseField(raw, column === "default_duration_min" ? FIELDS.duration : FIELDS.distance);
      if (!r.ok) throw new InputError(r.error);
      value = r.value;
    }
    const result = await db().from("plan_templates").update({ [column]: value } as Partial<PlanTemplateRow>).eq("id", templateId);
    if (result.error?.code === "23505") throw new InputError("Eine Vorlage mit diesem Namen gibt es schon.");
    check(result, "Vorlage speichern");
    if (column === "category") refresh();
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  await guard();
  check(await db().from("plan_templates").delete().eq("id", requireUuid(id, "Vorlage")), "Vorlage löschen");
  redirect("/planung/vorlagen");
}

export async function addTemplateExercise(templateId: string, _prev: ExerciseState, formData: FormData): Promise<ExerciseState> {
  await guard();
  try {
    const id = requireUuid(templateId, "Vorlage");
    const exerciseId = await exerciseIdByName(String(formData.get("name") ?? ""));
    const last = unwrap(
      await db().from("plan_template_exercises").select("position").eq("template_id", id).order("position", { ascending: false }).limit(1),
      "Reihenfolge laden",
    );
    check(
      await db()
        .from("plan_template_exercises")
        .insert({ template_id: id, exercise_id: exerciseId, position: (last[0]?.position ?? 0) + 1, target_sets: 3, target_reps: "8-12" }),
      "Übung hinzufügen",
    );
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    console.error(error);
    return { error: "Übung hinzufügen hat nicht geklappt." };
  }
  refresh();
  return {};
}

export async function removeTemplateExercise(id: string): Promise<void> {
  await guard();
  check(await db().from("plan_template_exercises").delete().eq("id", requireUuid(id, "Übung")), "Übung entfernen");
  refresh();
}

export async function moveTemplateExercise(id: string, direction: "up" | "down"): Promise<void> {
  await guard();
  const row = unwrap(await db().from("plan_template_exercises").select("*").eq("id", requireUuid(id, "Übung")).single(), "Übung laden");
  const all = unwrap(
    await db().from("plan_template_exercises").select("id").eq("template_id", row.template_id).order("position"),
    "Reihenfolge laden",
  );
  const i = all.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return;
  const order = all.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [index, rid] of order.entries()) {
    check(await db().from("plan_template_exercises").update({ position: index + 1 }).eq("id", rid), "Reihenfolge speichern");
  }
  refresh();
}

export async function saveTemplateExerciseField(id: string, field: string, raw: string): Promise<SaveResult> {
  try {
    await guard();
    const rowId = requireUuid(id, "Übung");
    const column = oneOf(field, ["target_sets", "target_reps"] as const, "Feld");
    let value: string | number | null;
    if (column === "target_sets") {
      const r = parseField(raw, { kind: "int", min: 1, max: 20 });
      if (!r.ok) throw new InputError(r.error);
      value = r.value;
    } else {
      const r = parseText(raw, TEXT_MAX.reps);
      if (!r.ok) throw new InputError(r.error);
      value = r.value;
    }
    check(await db().from("plan_template_exercises").update({ [column]: value } as Partial<PlanTemplateExerciseRow>).eq("id", rowId), "Übung speichern");
    return saved;
  } catch (error) {
    return toResult(error);
  }
}

/** Week template: which template on which weekday (slot 1 or 2). Empty removes it. */
export async function setWeekTemplateItem(weekTemplateId: string, weekday: number, slot: number, planTemplateId: string): Promise<void> {
  await guard();
  const weekId = requireUuid(weekTemplateId, "Wochenvorlage");
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) throw new InputError("Ungültiger Wochentag.");
  if (slot !== 1 && slot !== 2) throw new InputError("Ungültige Position.");
  check(
    await db().from("week_template_items").delete().eq("week_template_id", weekId).eq("weekday", weekday).eq("slot", slot),
    "Wochenvorlage ändern",
  );
  if (planTemplateId) {
    check(
      await db()
        .from("week_template_items")
        .insert({ week_template_id: weekId, weekday, slot, plan_template_id: requireUuid(planTemplateId, "Vorlage") }),
      "Wochenvorlage ändern",
    );
  }
  refresh();
}
