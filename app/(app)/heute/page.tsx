import type { Metadata } from "next";
import Link from "next/link";
import { DayNav } from "@/components/DayNav";
import { CategoryMark } from "@/components/SessionBadge";
import { StatusPill } from "@/components/StatusPill";
import { requireSelectedAthlete } from "@/lib/athletes";
import { CATEGORY_LABEL } from "@/lib/categories";
import { getDay, proteinBasis } from "@/lib/data/day";
import { berlinToday, isIsoDate } from "@/lib/dates";
import { formatDecimal } from "@/lib/numbers";
import { durationLabel, formatPace, paceSecPerKm } from "@/lib/duration";
import type { SessionRow } from "@/lib/supabase/database.types";

function pace(s: SessionRow): string | null {
  const p = s.category === "strength" ? null : paceSecPerKm(s.duration_sec, s.distance_km);
  return p === null ? null : formatPace(p);
}
import { BodyCard, NotesCard, StepsCard } from "./DayForms";
import { MealsCard, proteinBasisText } from "./MealsCard";
import { QuickLog } from "./QuickLog";
import { getAthletes } from "@/lib/athletes";

export const metadata: Metadata = { title: "Heute" };

export default async function TodayPage({ searchParams }: PageProps<"/heute">) {
  const params = await searchParams;
  const today = berlinToday();
  const date = isIsoDate(params.datum) ? params.datum : today;
  const athlete = await requireSelectedAthlete();
  const [day, basis, athletes] = await Promise.all([getDay(athlete.id, date), proteinBasis(athlete.id, date), getAthletes()]);
  const partner = athletes.find((a) => a.id !== athlete.id) ?? null;
  const target = basis
    ? { grams: basis.weightKg * athlete.protein_target_g_per_kg, basis: proteinBasisText(basis, athlete.protein_target_g_per_kg) }
    : null;
  // Remount the forms when person or day changes, so no field shows stale values.
  const k = `${athlete.id}:${date}`;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <DayNav date={date} today={today} basePath="/heute" />

      <section className="card">
        <div className="card-head flex items-baseline justify-between">
          <h2 className="t-label t-label-lg">Training</h2>
          <Link href={`/planung/neu?datum=${date}&zurueck=${encodeURIComponent(`/heute?datum=${date}`)}`} className="t-label underline">
            Planen
          </Link>
        </div>
        {day.sessions.length === 0 ? (
          <p className="px-4 pt-4 text-[14px] text-mute">Noch keine Einheit an diesem Tag.</p>
        ) : (
          <ul className="divide-line">
            {day.sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/einheit/${s.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-paper">
                  <CategoryMark category={s.category} status={s.status} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={`t-strong truncate text-[16px] ${s.status === "skipped" ? "text-mute line-through" : ""}`}>
                      {s.title}
                    </span>
                    <span className="t-label t-label-sm text-mute">
                      {CATEGORY_LABEL[s.category]}
                      {s.duration_sec ? ` · ${durationLabel(s.duration_sec)}` : ""}
                      {s.distance_km ? ` · ${formatDecimal(s.distance_km, 2)} km` : ""}
                      {pace(s) ? ` · ${pace(s)}` : ""}
                      {s.pair_id ? " · gemeinsam" : ""}
                    </span>
                  </span>
                  <StatusPill status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div style={{ borderTop: "1px solid var(--color-line)" }}>
          <QuickLog athleteId={athlete.id} date={date} partnerName={partner?.name ?? null} />
        </div>
      </section>

      <StepsCard key={`steps:${k}`} athleteId={athlete.id} date={date} initial={day.log?.steps ?? null} target={athlete.steps_target} />
      <MealsCard key={`meals:${k}:${day.meals.map((m) => m.id).join(",")}`} athleteId={athlete.id} date={date} meals={day.meals} target={target} />
      <BodyCard
        key={`body:${k}`}
        athleteId={athlete.id}
        date={date}
        weight={day.log?.weight_kg ?? null}
        sleep={day.log?.sleep_hours ?? null}
        energy={day.log?.energy ?? null}
      />
      <NotesCard key={`notes:${k}`} athleteId={athlete.id} date={date} initial={day.log?.notes ?? null} />
    </div>
  );
}
