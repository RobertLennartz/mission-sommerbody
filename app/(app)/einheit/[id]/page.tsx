import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryMark } from "@/components/SessionBadge";
import { StatusPill } from "@/components/StatusPill";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { CATEGORY_LABEL } from "@/lib/categories";
import { getExercises, getSession, lastPerformances, type LastPerformance } from "@/lib/data/training";
import { formatDayLong, formatDayShort } from "@/lib/dates";
import { formatDecimal } from "@/lib/numbers";
import { db } from "@/lib/supabase/server";
import { AddExerciseForm, CardioFields, ExerciseBlock, RpeButtons, SessionBasics, StatusButtons } from "./SessionForms";

export const metadata: Metadata = { title: "Einheit" };

const UUID = /^[0-9a-f-]{36}$/i;

function lastText(last: LastPerformance | undefined): string | null {
  if (!last) return null;
  const sets = last.sets
    .map((s) => `${s.reps ?? "?"} × ${s.weight_kg === null ? "?" : formatDecimal(s.weight_kg, 2)}`)
    .join(" · ");
  return `Letztes Mal (${formatDayShort(last.date)}): ${sets} kg`;
}

export default async function SessionPage({ params }: PageProps<"/einheit/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireSelectedAthlete();
  const data = await getSession(id);
  if (!data) notFound();
  const { session, exercises } = data;
  const athletes = await getAthletes();
  const athlete = athletes.find((a) => a.id === session.athlete_id);

  let partnerName: string | null = null;
  if (session.pair_id) {
    const p = await db().from("sessions").select("athlete_id").eq("pair_id", session.pair_id).neq("id", session.id).maybeSingle();
    partnerName = athletes.find((a) => a.id === p.data?.athlete_id)?.name ?? null;
  }

  const [last, catalog] = await Promise.all([
    session.category === "strength"
      ? lastPerformances(session.athlete_id, exercises.map((e) => e.exercise_id), { date: session.date, slot: session.slot, sessionId: session.id })
      : Promise.resolve(new Map<string, LastPerformance>()),
    session.category === "strength" ? getExercises() : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <Link href={`/heute?datum=${session.date}`} className="t-label underline">
        Zum Tag ({formatDayShort(session.date)})
      </Link>
      <div className="flex items-center gap-3">
        <CategoryMark category={session.category} status={session.status} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="t-head truncate text-[26px]">{session.title}</h1>
          <span className="t-label text-mute">
            {athlete?.name} · {CATEGORY_LABEL[session.category]} · {formatDayLong(session.date)}
            {partnerName ? ` · gemeinsam mit ${partnerName}` : ""}
          </span>
        </div>
        <StatusPill status={session.status} />
      </div>

      {session.category === "strength" ? (
        <section className="card">
          <div className="card-head">
            <h2 className="t-label t-label-lg">Übungen</h2>
          </div>
          {exercises.length === 0 ? <p className="px-4 py-3 text-[14px] text-mute">Noch keine Übung. Unten hinzufügen.</p> : null}
          <ul className="divide-line">
            {exercises.map((e) => (
              <ExerciseBlock
                key={`${e.id}:${e.target_sets}:${e.sets.length}`}
                exercise={{
                  id: e.id,
                  name: e.name,
                  targetSets: e.target_sets,
                  targetReps: e.target_reps,
                  sets: e.sets,
                  last: lastText(last.get(e.exercise_id)),
                }}
              />
            ))}
          </ul>
          <div style={{ borderTop: "1px solid var(--color-line)" }}>
            <AddExerciseForm sessionId={session.id} suggestions={catalog.map((c) => c.name)} />
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Details</h2>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <SessionBasics id={session.id} title={session.title} date={session.date} duration={session.duration_min} notes={session.notes} />
          {session.category !== "strength" ? (
            <CardioFields id={session.id} activity={session.activity} distance={session.distance_km} avgHr={session.avg_hr} />
          ) : null}
          <RpeButtons id={session.id} initial={session.rpe} />
        </div>
      </section>

      <StatusButtons id={session.id} status={session.status} partnerName={partnerName} afterDelete={`/heute?datum=${session.date}`} />
    </div>
  );
}
