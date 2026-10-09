import type { Metadata } from "next";
import { StepsChart, WeightChart } from "@/components/charts/TimeCharts";
import { CategoryMark } from "@/components/SessionBadge";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { CATEGORIES, CATEGORY_LABEL, countsAsTraining } from "@/lib/categories";
import { loadRange } from "@/lib/data/range";
import { addDays, berlinToday, formatDayShort, isoWeek } from "@/lib/dates";
import { MISSION_DAYS, MISSION_END, MISSION_START, missionStatus, missionWeeks } from "@/lib/mission";
import { formatDecimal, formatInt, formatSigned } from "@/lib/numbers";
import { daysLabel } from "@/lib/numbers";
import { averageOfPresent, nutritionByDate, proteinTargetFor } from "@/lib/stats";
import { energyFromRange } from "@/lib/data/energy";
import { fatEquivalentLabel, totalSaved } from "@/lib/energy";
import { datesBetween } from "@/lib/dates";

export const metadata: Metadata = { title: "Übersicht" };

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3" style={{ border: "1px solid var(--color-line)" }}>
      <span className="t-label text-mute">{label}</span>
      <span className="t-num text-[22px] font-medium leading-tight">{value}</span>
      {sub ? <span className="t-label t-label-sm text-mute">{sub}</span> : null}
    </div>
  );
}

export default async function OverviewPage() {
  await requireSelectedAthlete();
  const athletes = await getAthletes();
  const today = berlinToday();
  // Mission range for the charts; everything up to today for the overall deficit.
  const [data, allData] = await Promise.all([
    loadRange(athletes.map((a) => a.id), MISSION_START, MISSION_END),
    loadRange(athletes.map((a) => a.id), "2000-01-01", today),
  ]);
  const status = missionStatus(today);
  const lastDay = today < MISSION_END ? today : MISSION_END;

  const hero =
    status.phase === "before"
      ? { big: `${status.daysUntilStart}`, small: status.daysUntilStart === 1 ? "Tag bis zum Start" : "Tage bis zum Start" }
      : status.phase === "running"
        ? { big: `${status.daysLeft}`, small: status.daysLeft === 1 ? "Tag bis zum Ende" : "Tage bis zum Ende" }
        : { big: "0", small: "Mission beendet" };
  const progress = status.phase === "running" ? status.day / MISSION_DAYS : status.phase === "after" ? 1 : 0;

  const people = athletes.map((a) => {
    const sessions = data.sessions.filter((s) => s.athlete_id === a.id && s.status === "done");
    const logs = data.logs.filter((l) => l.athlete_id === a.id);
    const checkups = data.checkups.filter((c) => c.athlete_id === a.id && c.weight_kg !== null && c.date >= MISSION_START);
    const morning = logs.filter((l) => l.weight_kg !== null).map((l) => ({ date: l.date, value: l.weight_kg! }));
    const weights = [...checkups.map((c) => ({ date: c.date, value: c.weight_kg! })), ...morning].sort((x, y) => (x.date < y.date ? -1 : 1));
    const steps = logs.filter((l) => l.steps !== null).map((l) => ({ date: l.date, value: l.steps! }));
    const proteinDays = [...nutritionByDate(logs, data.meals.filter((m) => m.athlete_id === a.id)).entries()]
      .filter(([, n]) => n.protein !== null)
      .map(([d, n]) => [d, n.protein!] as const);
    const reached = proteinDays.filter(([d, p]) => {
      const t = proteinTargetFor(d, data.checkupWeights.get(a.id) ?? [], data.morningWeights.get(a.id) ?? [], a.protein_target_g_per_kg);
      return t !== null && p >= t;
    }).length;
    const saved =
      lastDay >= MISSION_START ? totalSaved(energyFromRange(a, data, datesBetween(MISSION_START, lastDay))) : { kcal: 0, days: 0 };
    // Overall: every day up to today with recorded calories, also before the mission.
    const kcalDates = [
      ...new Set([
        ...allData.logs.filter((l) => l.athlete_id === a.id && l.kcal_total !== null).map((l) => l.date),
        ...allData.meals.filter((m) => m.athlete_id === a.id && m.kcal !== null).map((m) => m.date),
      ]),
    ]
      .filter((d) => d <= today)
      .sort();
    const overallDays = energyFromRange(a, allData, kcalDates);
    const savedAll = totalSaved(overallDays);
    const overallMissing = overallDays.find((d) => d.energy === null)?.missing ?? [];
    const km = sessions.filter((s) => s.category !== "strength").reduce((sum, s) => sum + (s.distance_km ?? 0), 0);
    return {
      athlete: a,
      training: sessions.filter((s) => countsAsTraining(s.category)).length,
      byCategory: CATEGORIES.map((c) => ({ c, n: sessions.filter((s) => s.category === c).length })),
      weights,
      morning,
      checkupPoints: checkups.map((c) => ({ date: c.date, value: c.weight_kg!, label: c.type === "start" ? "Start" : c.type === "end" ? "Ende" : "Zwischen" })),
      steps,
      stepsAvg: averageOfPresent(steps.map((s) => s.value)),
      weekSteps: missionWeeks().map((m) => ({ m, avg: averageOfPresent(steps.filter((s) => s.date >= m && s.date <= addDays(m, 6)).map((s) => s.value)) })),
      proteinAvg: averageOfPresent(proteinDays.map(([, p]) => p)),
      reached,
      proteinDays: proteinDays.length,
      km,
      saved,
      savedAll,
      kcalDays: kcalDates.length,
      firstKcalDay: kcalDates[0] ?? null,
      overallMissing,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 bg-ink p-5 text-bg">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="t-num block text-[56px] font-medium leading-none">{hero.big}</span>
            <span className="t-label text-dead">{hero.small}</span>
          </div>
          <span className="t-num text-right text-[13px] text-dead">
            12.10. bis 13.11.2026
            <br />
            {status.phase === "running" ? `Tag ${status.day} von ${MISSION_DAYS}` : `${daysLabel(MISSION_DAYS)}`}
          </span>
        </div>
        <div className="h-2 w-full" style={{ background: "#2A2C2A" }} aria-hidden>
          <div className="h-full" style={{ width: `${progress * 100}%`, background: "var(--color-acc)" }} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {people.map((p) => {
          const first = p.weights[0];
          const last = p.weights[p.weights.length - 1];
          return (
            <section key={p.athlete.id} className="card flex flex-col">
              <div className="card-head">
                <h2 className="t-strong text-[18px] uppercase">{p.athlete.name}</h2>
              </div>
              <div className="px-4 pt-4">
                <div className="flex flex-col gap-1 p-4" style={{ border: "1.5px solid var(--color-ink)", background: "var(--color-acc-tint)" }}>
                  <span className="t-label">Kaloriendefizit gesamt</span>
                  {p.savedAll.days ? (
                    <>
                      <span className="t-num text-[30px] font-medium leading-tight" style={{ color: p.savedAll.kcal >= 0 ? "var(--color-good)" : "var(--color-bad)" }}>
                        {formatInt(Math.round(Math.abs(p.savedAll.kcal)))} kcal {p.savedAll.kcal >= 0 ? "eingespart" : "Überschuss"}
                      </span>
                      <span className="t-label t-label-sm text-mute">
                        {p.savedAll.kcal >= 0 ? `${fatEquivalentLabel(p.savedAll.kcal)} · ` : ""}
                        {daysLabel(p.savedAll.days)} mit kcal seit {p.firstKcalDay ? formatDayShort(p.firstKcalDay) : ""}
                        {p.saved.days ? ` · davon seit 12.10.: ${formatInt(Math.round(p.saved.kcal))} kcal` : ""} · Schätzung
                      </span>
                      {p.savedAll.days < p.kcalDays ? (
                        <span className="t-label t-label-sm text-mute">
                          {daysLabel(p.kcalDays - p.savedAll.days)} ohne Schätzung, es fehlt: {p.overallMissing.join(", ")}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="t-num text-[22px] font-medium">offen</span>
                      <span className="text-[13px] text-mute">
                        {p.kcalDays === 0
                          ? "Noch keine Kalorien erfasst. Tageswert oder Mahlzeiten mit kcal eintragen."
                          : `Kalorien sind da, für die Schätzung fehlt: ${p.overallMissing.join(", ")}.`}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="t-label px-4 pt-4 text-mute">Mission ab 12.10.</span>
              <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2 sm:grid-cols-3">
                <Tile
                  label="Gewicht"
                  value={last ? `${formatDecimal(last.value, 1, true)} kg` : "offen"}
                  sub={first && last && first.date !== last.date ? `${formatSigned(last.value - first.value)} kg seit ${formatDayShort(first.date)}` : undefined}
                />
                <Tile label="Trainings" value={formatInt(p.training)} sub={`plus ${p.byCategory.find((c) => c.c === "recovery")?.n ?? 0} Recovery`} />
                <Tile label="Ausdauer-km" value={formatDecimal(p.km, 1, true)} />
                <Tile label="Schritte Ø" value={p.stepsAvg.average === null ? "offen" : formatInt(Math.round(p.stepsAvg.average))} sub={`${daysLabel(p.stepsAvg.days)} erfasst`} />
                <Tile label="Protein Ø" value={p.proteinAvg.average === null ? "offen" : `${formatDecimal(p.proteinAvg.average, 0)} g`} sub={`${daysLabel(p.proteinDays)} erfasst`} />
                <Tile label="Proteinziel" value={`${daysLabel(p.reached)}`} sub="erreicht" />
              </div>

              <div className="flex flex-col gap-1 px-4 pb-4">
                <h3 className="t-label">Einheiten nach Art</h3>
                <ul className="flex flex-col gap-1.5">
                  {p.byCategory.map(({ c, n }) => {
                    const max = Math.max(1, ...p.byCategory.map((x) => x.n));
                    return (
                      <li key={c} className="grid grid-cols-[24px_88px_1fr_32px] items-center gap-2">
                        <CategoryMark category={c} status="done" size={20} />
                        <span className="text-[13px]">{CATEGORY_LABEL[c]}</span>
                        <span className="h-3" style={{ background: "var(--color-paper)" }}>
                          <span className="block h-full" style={{ width: `${(n / max) * 100}%`, background: `var(--color-${c})` }} />
                        </span>
                        <span className="t-num text-right text-[13px]">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex flex-col gap-1 px-4 pb-4">
                <h3 className="t-label">Gewicht (kg)</h3>
                <WeightChart
                  points={p.morning}
                  checkups={p.checkupPoints}
                  from={MISSION_START}
                  to={MISSION_END}
                  label={`Gewichtsverlauf ${p.athlete.name}`}
                />
              </div>

              <div className="flex flex-col gap-1 px-4 pb-4">
                <h3 className="t-label">Schritte pro Tag</h3>
                <StepsChart points={p.steps} target={p.athlete.steps_target} from={MISSION_START} to={MISSION_END} label={`Schritte ${p.athlete.name}`} />
                <table className="mt-2 w-full text-left">
                  <thead>
                    <tr className="t-label text-mute">
                      {p.weekSteps.map((w) => (
                        <th key={w.m} className="px-1 py-1 text-right font-medium">
                          KW {isoWeek(w.m).week}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="t-num text-[13px]">
                      {p.weekSteps.map((w) => (
                        <td key={w.m} className="px-1 py-1 text-right">
                          {w.avg.average === null ? "" : formatInt(Math.round(w.avg.average))}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <span className="t-label t-label-sm text-mute">Wochendurchschnitt, nur Tage mit Eintrag</span>
              </div>

              <details className="px-4 pb-4">
                <summary className="t-label cursor-pointer text-mute">Werte als Tabelle</summary>
                <table className="mt-2 w-full text-left text-[13px]">
                  <thead>
                    <tr className="t-label text-mute">
                      <th className="py-1 font-medium">Tag</th>
                      <th className="py-1 text-right font-medium">Gewicht</th>
                      <th className="py-1 text-right font-medium">Schritte</th>
                    </tr>
                  </thead>
                  <tbody className="t-num">
                    {[...new Set([...p.weights.map((w) => w.date), ...p.steps.map((s) => s.date)])]
                      .filter((d) => d <= lastDay)
                      .sort()
                      .map((d) => (
                        <tr key={d} style={{ borderTop: "1px solid var(--color-line)" }}>
                          <td className="py-1">{formatDayShort(d)}</td>
                          <td className="py-1 text-right">{p.weights.find((w) => w.date === d) ? formatDecimal(p.weights.find((w) => w.date === d)!.value, 1, true) : ""}</td>
                          <td className="py-1 text-right">{p.steps.find((s) => s.date === d) ? formatInt(p.steps.find((s) => s.date === d)!.value) : ""}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
