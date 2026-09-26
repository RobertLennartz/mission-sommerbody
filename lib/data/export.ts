import "server-only";
import { SITE_LABEL, SKINFOLD_SITES } from "@/lib/bodyfat";
import { CATEGORY_LABEL, MEAL_LABEL, STATUS_LABEL } from "@/lib/categories";
import { toCsv } from "@/lib/csv";
import { getAthletes } from "@/lib/athletes";
import { getCheckups } from "@/lib/data/checkups";
import { CHECKUP_TYPE_LABEL, CIRCUMFERENCES } from "@/lib/measurements";
import { db, unwrap } from "@/lib/supabase/server";
import { formatDuration, formatPace, paceSecPerKm, speedKmh } from "@/lib/duration";

function round(n: number | null, digits: number): number | null {
  return n === null ? null : Math.round(n * 10 ** digits) / 10 ** digits;
}

export const EXPORTS = {
  tageswerte: "Tageswerte",
  mahlzeiten: "Mahlzeiten",
  einheiten: "Einheiten",
  saetze: "Sätze",
  checkups: "Checkups",
  hautfalten: "Hautfalten (Einzelmessungen)",
} as const;

export type ExportName = keyof typeof EXPORTS;

async function all<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>, what: string): Promise<T[]> {
  return unwrap(await query, what);
}

export async function buildExport(name: ExportName): Promise<string> {
  const athletes = await getAthletes();
  const who = (id: string) => athletes.find((a) => a.id === id)?.name ?? "";

  if (name === "tageswerte") {
    const rows = await all(db().from("daily_logs").select("*").order("date"), "Tageswerte");
    return toCsv(
      ["Datum", "Person", "Schritte", "Morgengewicht kg", "Schlaf h", "Energie 1-5", "Protein gesamt g (Tageswert)", "kcal gesamt (Tageswert)", "Bemerkungen"],
      rows.map((r) => [r.date, who(r.athlete_id), r.steps, r.weight_kg, r.sleep_hours, r.energy, r.protein_total_g, r.kcal_total, r.notes]),
    );
  }
  if (name === "mahlzeiten") {
    const rows = await all(db().from("meals").select("*").order("date").order("created_at"), "Mahlzeiten");
    return toCsv(
      ["Datum", "Person", "Mahlzeit", "Beschreibung", "Protein g", "kcal"],
      rows.map((r) => [r.date, who(r.athlete_id), MEAL_LABEL[r.meal_type], r.description, r.protein_g, r.kcal]),
    );
  }
  if (name === "einheiten") {
    const rows = await all(db().from("sessions").select("*").order("date").order("slot"), "Einheiten");
    return toCsv(
      ["Datum", "Reihenfolge", "Person", "Kategorie", "Titel", "Status", "Dauer (h:mm:ss)", "Dauer min", "RPE", "Aktivität", "Distanz km", "Pace min/km", "km/h", "Puls Ø", "Gemeinsam", "Notiz"],
      rows.map((r) => [
        r.date, r.slot, who(r.athlete_id), CATEGORY_LABEL[r.category], r.title, STATUS_LABEL[r.status],
        r.duration_sec === null ? null : formatDuration(r.duration_sec),
        r.duration_sec === null ? null : round(r.duration_sec / 60, 2),
        r.rpe, r.activity, r.distance_km,
        paceSecPerKm(r.duration_sec, r.distance_km) === null ? null : formatPace(paceSecPerKm(r.duration_sec, r.distance_km)!).replace(" min/km", ""),
        speedKmh(r.duration_sec, r.distance_km) === null ? null : round(speedKmh(r.duration_sec, r.distance_km)!, 1),
        r.avg_hr, r.pair_id !== null, r.notes,
      ]),
    );
  }
  if (name === "saetze") {
    const [sessions, exercises, sets, names] = await Promise.all([
      all(db().from("sessions").select("id, date, slot, athlete_id, title, status"), "Einheiten"),
      all(db().from("session_exercises").select("id, session_id, position, exercise_id"), "Übungen"),
      all(db().from("session_sets").select("*").order("set_no"), "Sätze"),
      all(db().from("exercises").select("id, name"), "Übungsnamen"),
    ]);
    const rows = sets
      .map((s) => {
        const e = exercises.find((x) => x.id === s.session_exercise_id);
        const sess = e ? sessions.find((x) => x.id === e.session_id) : undefined;
        return { s, e, sess };
      })
      .filter((x) => x.e && x.sess)
      .sort((a, b) => (a.sess!.date + a.sess!.slot + a.e!.position).localeCompare(b.sess!.date + b.sess!.slot + b.e!.position) || a.s.set_no - b.s.set_no);
    return toCsv(
      ["Datum", "Person", "Einheit", "Status", "Übung", "Satz", "Wiederholungen", "Gewicht kg"],
      rows.map(({ s, e, sess }) => [
        sess!.date, who(sess!.athlete_id), sess!.title, STATUS_LABEL[sess!.status], names.find((n) => n.id === e!.exercise_id)?.name ?? "",
        s.set_no, s.reps, s.weight_kg,
      ]),
    );
  }
  if (name === "checkups") {
    const checkups = await getCheckups(athletes);
    return toCsv(
      [
        "Datum", "Person", "Art", "Gewicht kg",
        ...CIRCUMFERENCES.map((c) => `${c.label.replace(" (optional)", "")} cm`),
        ...SKINFOLD_SITES.map((s) => `Hautfalte ${SITE_LABEL[s]} mm (Mittel)`),
        "Summe Hautfalten mm", "Körperdichte", "Körperfett %", "Fettmasse kg", "Fettfreie Masse kg", "Notiz",
      ],
      checkups.map((c) => [
        c.date, who(c.athlete_id), CHECKUP_TYPE_LABEL[c.type], c.weight_kg,
        ...CIRCUMFERENCES.map((m) => c[m.key]),
        ...SKINFOLD_SITES.map((s) => round(c.composition.siteMeans[s] ?? null, 2)),
        round(c.composition.sumMm, 2), round(c.composition.density, 4), round(c.composition.bodyFatPct, 2), round(c.composition.fatMassKg, 2), round(c.composition.leanMassKg, 2), c.notes,
      ]),
    );
  }
  const [checkups, folds] = await Promise.all([
    all(db().from("checkups").select("id, date, athlete_id, type"), "Checkups"),
    all(db().from("checkup_skinfolds").select("*").order("site").order("reading_no"), "Hautfalten"),
  ]);
  return toCsv(
    ["Datum", "Person", "Checkup", "Messpunkt", "Messung", "mm"],
    folds.map((f) => {
      const c = checkups.find((x) => x.id === f.checkup_id);
      return [c?.date, c ? who(c.athlete_id) : "", c ? CHECKUP_TYPE_LABEL[c.type] : "", SITE_LABEL[f.site as keyof typeof SITE_LABEL] ?? f.site, f.reading_no, f.value_mm];
    }),
  );
}
