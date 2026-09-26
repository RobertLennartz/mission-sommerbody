import type { Metadata } from "next";
import Link from "next/link";
import { CategoryMark } from "@/components/SessionBadge";
import { WeekNav } from "@/components/WeekNav";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { loadRange } from "@/lib/data/range";
import { addDays, berlinToday, formatDayShort, weekDates } from "@/lib/dates";
import { isInMission } from "@/lib/mission";
import { formatDecimal, formatInt } from "@/lib/numbers";
import { averageOfPresent, proteinTargetFor, sumByDate, weekGoal, type GoalProgress } from "@/lib/stats";
import { weekFromParam } from "@/lib/week-param";

export const metadata: Metadata = { title: "Woche" };

function Goal({ label, g }: { label: string; g: GoalProgress }) {
  const reached = g.done >= g.target;
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="t-label text-mute">{label}</span>
      <span className="t-num text-[18px] font-medium" style={{ color: reached ? "var(--color-good)" : "var(--color-ink)" }}>
        {g.done}/{g.target}
      </span>
    </span>
  );
}

export default async function WeekPage({ searchParams }: PageProps<"/woche">) {
  const params = await searchParams;
  const monday = weekFromParam(params.woche);
  const sunday = addDays(monday, 6);
  await requireSelectedAthlete();
  const athletes = await getAthletes();
  const data = await loadRange(athletes.map((a) => a.id), monday, sunday);
  const today = berlinToday();
  const days = weekDates(monday);

  const summaries = athletes.map((a) => {
    const sessions = data.sessions.filter((s) => s.athlete_id === a.id);
    const logs = data.logs.filter((l) => l.athlete_id === a.id);
    const protein = sumByDate(data.meals.filter((m) => m.athlete_id === a.id), (m) => m.protein_g);
    const steps = averageOfPresent(days.map((d) => logs.find((l) => l.date === d)?.steps));
    const proteinAvg = averageOfPresent(days.map((d) => (protein.has(d) ? protein.get(d)! : null)));
    return {
      athlete: a,
      goals: weekGoal(sessions, monday, a.training_target_per_week),
      steps,
      proteinAvg,
      proteinReached: days.filter((d) => {
        const t = proteinTargetFor(d, data.checkupWeights.get(a.id) ?? [], data.morningWeights.get(a.id) ?? [], a.protein_target_g_per_kg);
        return t !== null && (protein.get(d) ?? 0) >= t;
      }).length,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-head text-[30px]">Woche</h1>
      <WeekNav monday={monday} basePath="/woche" />

      <div className="grid gap-3 sm:grid-cols-2">
        {summaries.map((s) => (
          <section key={s.athlete.id} className="card">
            <div className="card-head">
              <h2 className="t-strong text-[15px] uppercase">{s.athlete.name}</h2>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 px-4 py-3">
              <Goal label="Trainings" g={s.goals.training} />
              <span className="flex items-baseline gap-1.5">
                <span className="t-label text-mute">Recovery</span>
                <span className="t-num text-[16px]">{s.goals.recovery}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="t-label text-mute">Schritte Ø</span>
                <span className="t-num text-[16px]">{s.steps.average === null ? "keine" : formatInt(Math.round(s.steps.average))}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="t-label text-mute">Protein Ø</span>
                <span className="t-num text-[16px]">
                  {s.proteinAvg.average === null ? "keine" : `${formatDecimal(s.proteinAvg.average, 0)} g`}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="t-label text-mute">Proteinziel</span>
                <span className="t-num text-[16px]">{s.proteinReached} Tage</span>
              </span>
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-7">
        {days.map((d) => {
          const inMission = isInMission(d);
          return (
            <section
              key={d}
              className="card flex flex-col"
              style={{
                borderColor: d === today ? "var(--color-acc)" : inMission ? "var(--color-ink)" : "var(--color-line)",
                borderWidth: d === today ? 3 : 1.5,
                opacity: inMission ? 1 : 0.55,
              }}
            >
              <div className="card-head flex items-baseline justify-between">
                <Link href={`/heute?datum=${d}`} className="t-strong text-[13px] uppercase underline-offset-2 hover:underline">
                  {formatDayShort(d)}
                </Link>
              </div>
              <div className="grid flex-1 grid-cols-2 lg:grid-cols-1">
                {athletes.map((a, i) => {
                  const sessions = data.sessions.filter((s) => s.athlete_id === a.id && s.date === d);
                  const log = data.logs.find((l) => l.athlete_id === a.id && l.date === d);
                  return (
                    <div
                      key={a.id}
                      className="flex flex-col gap-1.5 p-2.5"
                      style={i > 0 ? { borderLeft: "1px solid var(--color-line)" } : undefined}
                    >
                      <span className="t-label t-label-sm text-mute">{a.name}</span>
                      {sessions.length === 0 ? <span className="text-[12px] text-dead">kein Training</span> : null}
                      {sessions.map((s) => (
                        <Link key={s.id} href={`/einheit/${s.id}`} className="flex items-center gap-1.5">
                          <CategoryMark category={s.category} status={s.status} size={20} />
                          <span className={`truncate text-[13px] ${s.status === "skipped" ? "text-mute line-through" : ""}`}>{s.title}</span>
                        </Link>
                      ))}
                      <span className="t-num text-[12px]" style={{ color: log?.steps ? "var(--color-ink)" : "var(--color-dead)" }}>
                        {log?.steps ? `${formatInt(log.steps)} Schritte` : "keine Schritte"}
                      </span>
                      {log?.notes ? (
                        <details className="text-[12px]">
                          <summary className="t-label cursor-pointer text-mute">Bemerkung</summary>
                          <p className="mt-1 whitespace-pre-line">{log.notes}</p>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="t-label t-label-sm text-mute">
        K = Kraft, A = Ausdauer, H = HIIT, R = Recovery · gefüllt = erledigt, Rahmen = geplant, grau = ausgelassen
      </p>
    </div>
  );
}
