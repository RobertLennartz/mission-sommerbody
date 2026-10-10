import "server-only";
import { db, unwrap } from "@/lib/supabase/server";
import type {
  ExerciseRow,
  PlanTemplateExerciseRow,
  PlanTemplateRow,
  SessionExerciseRow,
  SessionRow,
  SessionSetRow,
  WeekTemplateItemRow,
  WeekTemplateRow,
} from "@/lib/supabase/database.types";

export async function listSessions(athleteIds: string[], from: string, to: string): Promise<SessionRow[]> {
  return unwrap(
    await db()
      .from("sessions")
      .select("*")
      .in("athlete_id", athleteIds)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("slot"),
    "Einheiten laden",
  );
}

export async function getExercises(): Promise<ExerciseRow[]> {
  return unwrap(await db().from("exercises").select("*").order("name"), "Übungen laden");
}

export type SessionExerciseDetail = SessionExerciseRow & { name: string; sets: SessionSetRow[] };

export async function getSession(id: string): Promise<{ session: SessionRow; exercises: SessionExerciseDetail[] } | null> {
  const s = await db().from("sessions").select("*").eq("id", id).maybeSingle();
  if (s.error) throw new Error(`Einheit laden: ${s.error.message}`);
  if (!s.data) return null;
  const exercises = unwrap(
    await db().from("session_exercises").select("*").eq("session_id", id).order("position"),
    "Übungen der Einheit laden",
  );
  const ids = exercises.map((e) => e.id);
  const [sets, names] = await Promise.all([
    ids.length
      ? db().from("session_sets").select("*").in("session_exercise_id", ids).order("set_no")
      : Promise.resolve({ data: [] as SessionSetRow[], error: null }),
    exercises.length
      ? db().from("exercises").select("id, name").in("id", [...new Set(exercises.map((e) => e.exercise_id))])
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);
  const setRows = unwrap(sets, "Sätze laden") as SessionSetRow[];
  const nameById = new Map((unwrap(names, "Übungsnamen laden") as { id: string; name: string }[]).map((n) => [n.id, n.name]));
  return {
    session: s.data,
    exercises: exercises.map((e) => ({
      ...e,
      name: nameById.get(e.exercise_id) ?? "Übung",
      sets: setRows.filter((x) => x.session_exercise_id === e.id),
    })),
  };
}

export type LastPerformance = {
  date: string;
  sets: { set_no: number; reps: number | null; weight_kg: number | null }[];
  /** Exercise note of that session, e.g. "mit Band". */
  note: string | null;
};

/**
 * Most recent done session of the same person that contains the exercise,
 * before the given session (earlier day, or same day in an earlier slot).
 */
export async function lastPerformances(
  athleteId: string,
  exerciseIds: string[],
  before: { date: string; slot: number; sessionId: string },
): Promise<Map<string, LastPerformance>> {
  const result = new Map<string, LastPerformance>();
  if (exerciseIds.length === 0) return result;
  const sessions = unwrap(
    await db()
      .from("sessions")
      .select("id, date, slot")
      .eq("athlete_id", athleteId)
      .eq("status", "done")
      .lte("date", before.date)
      .neq("id", before.sessionId)
      .order("date", { ascending: false })
      .order("slot", { ascending: false })
      .limit(60),
    "Letzte Einheiten laden",
  ).filter((s) => s.date < before.date || s.slot < before.slot);
  if (sessions.length === 0) return result;

  const order = new Map(sessions.map((s, i) => [s.id, i]));
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]));
  const exRows = unwrap(
    await db()
      .from("session_exercises")
      .select("id, session_id, exercise_id, notes")
      .in("session_id", sessions.map((s) => s.id))
      .in("exercise_id", exerciseIds),
    "Letzte Übungen laden",
  );
  const best = new Map<string, { rowId: string; rank: number; sessionId: string; note: string | null }>();
  for (const row of exRows) {
    const rank = order.get(row.session_id) ?? Infinity;
    const current = best.get(row.exercise_id);
    if (!current || rank < current.rank) best.set(row.exercise_id, { rowId: row.id, rank, sessionId: row.session_id, note: row.notes });
  }
  if (best.size === 0) return result;
  const sets = unwrap(
    await db()
      .from("session_sets")
      .select("session_exercise_id, set_no, reps, weight_kg")
      .in("session_exercise_id", [...best.values()].map((b) => b.rowId))
      .order("set_no"),
    "Letzte Sätze laden",
  );
  for (const [exerciseId, b] of best) {
    const own = sets.filter((s) => s.session_exercise_id === b.rowId && (s.reps !== null || s.weight_kg !== null));
    if (own.length) result.set(exerciseId, { date: dateOf.get(b.sessionId)!, sets: own, note: b.note });
  }
  return result;
}

export type TemplateDetail = PlanTemplateRow & { exercises: (PlanTemplateExerciseRow & { name: string })[] };

export async function getTemplates(): Promise<TemplateDetail[]> {
  const [templates, items, exercises] = await Promise.all([
    db().from("plan_templates").select("*").order("category").order("name"),
    db().from("plan_template_exercises").select("*").order("position"),
    db().from("exercises").select("id, name"),
  ]);
  const nameById = new Map(unwrap(exercises, "Übungen laden").map((e) => [e.id, e.name]));
  const rows = unwrap(items, "Vorlagen-Übungen laden");
  return unwrap(templates, "Vorlagen laden").map((t) => ({
    ...t,
    exercises: rows
      .filter((r) => r.template_id === t.id)
      .map((r) => ({ ...r, name: nameById.get(r.exercise_id) ?? "Übung" })),
  }));
}

export type WeekTemplateDetail = WeekTemplateRow & { items: WeekTemplateItemRow[] };

export async function getWeekTemplates(): Promise<WeekTemplateDetail[]> {
  const [weeks, items] = await Promise.all([
    db().from("week_templates").select("*").order("name"),
    db().from("week_template_items").select("*").order("weekday").order("slot"),
  ]);
  const rows = unwrap(items, "Wochenvorlage laden");
  return unwrap(weeks, "Wochenvorlagen laden").map((w) => ({ ...w, items: rows.filter((r) => r.week_template_id === w.id) }));
}
