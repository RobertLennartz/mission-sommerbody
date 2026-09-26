import type { Metadata } from "next";
import Link from "next/link";
import { WeekNav } from "@/components/WeekNav";
import { requireSelectedAthlete } from "@/lib/athletes";
import { loadRange } from "@/lib/data/range";
import { addDays, formatDayShort, weekDates } from "@/lib/dates";
import { MISSION_END, MISSION_START, isInMission } from "@/lib/mission";
import { formatDecimal, formatInt } from "@/lib/numbers";
import { daysLabel } from "@/lib/numbers";
import { averageOfPresent, nutritionByDate, proteinTargetFor } from "@/lib/stats";
import { weekFromParam } from "@/lib/week-param";

export const metadata: Metadata = { title: "Ernährung" };

export default async function NutritionPage({ searchParams }: PageProps<"/ernaehrung">) {
  const params = await searchParams;
  const monday = weekFromParam(params.woche);
  const athlete = await requireSelectedAthlete();
  const [week, mission] = await Promise.all([
    loadRange([athlete.id], monday, addDays(monday, 6)),
    loadRange([athlete.id], MISSION_START, MISSION_END),
  ]);

  const target = (d: string, data = week) =>
    proteinTargetFor(d, data.checkupWeights.get(athlete.id) ?? [], data.morningWeights.get(athlete.id) ?? [], athlete.protein_target_g_per_kg);

  const nutrition = nutritionByDate(week.logs, week.meals);
  const days = weekDates(monday).map((d) => {
    const n = nutrition.get(d);
    return {
      d,
      meals: n?.meals ?? 0,
      protein: n?.protein ?? null,
      kcal: n?.kcal ?? null,
      proteinFromTotal: n?.proteinFromTotal ?? false,
      kcalFromTotal: n?.kcalFromTotal ?? false,
      target: target(d),
    };
  });
  const weekAvg = averageOfPresent(days.map((x) => x.protein));
  const reached = days.filter((x) => x.protein !== null && x.target !== null && x.protein >= x.target).length;

  const missionNutrition = [...nutritionByDate(mission.logs, mission.meals).entries()].filter(([, n]) => n.protein !== null);
  const missionAvg = averageOfPresent(missionNutrition.map(([, n]) => n.protein));
  const missionReached = missionNutrition.filter(([d, n]) => {
    const t = target(d, mission);
    return t !== null && n.protein! >= t;
  }).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="t-head text-[30px]">Ernährung</h1>
        <p className="mt-1 text-[15px] text-mute">{athlete.name}, umschalten oben in der Kopfleiste.</p>
      </div>
      <WeekNav monday={monday} basePath="/ernaehrung" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Protein Ø Woche", value: weekAvg.average === null ? "keine" : `${formatDecimal(weekAvg.average, 0)} g`, sub: `${daysLabel(weekAvg.days)} erfasst` },
          { label: "Ziel erreicht", value: `${reached} von ${days.filter((x) => isInMission(x.d)).length}`, sub: "Tage dieser Woche" },
          { label: "Protein Ø Mission", value: missionAvg.average === null ? "keine" : `${formatDecimal(missionAvg.average, 0)} g`, sub: `${daysLabel(missionAvg.days)} erfasst` },
          { label: "Ziel erreicht", value: `${daysLabel(missionReached)}`, sub: "seit Missionsstart" },
        ].map((c, i) => (
          <div key={i} className="card flex flex-col gap-1 p-3">
            <span className="t-label text-mute">{c.label}</span>
            <span className="t-num text-[22px] font-medium">{c.value}</span>
            <span className="t-label t-label-sm text-mute">{c.sub}</span>
          </div>
        ))}
      </div>

      <section className="card">
        <table className="w-full text-left">
          <thead className="card-head">
            <tr className="t-label">
              <th className="px-3 py-2 font-medium">Tag</th>
              <th className="px-3 py-2 text-right font-medium">Protein</th>
              <th className="px-3 py-2 text-right font-medium">Ziel</th>
              <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">kcal</th>
              <th className="px-3 py-2 text-right font-medium">Mahlz.</th>
            </tr>
          </thead>
          <tbody className="divide-line">
            {days.map((x) => {
              const ok = x.protein !== null && x.target !== null && x.protein >= x.target;
              return (
                <tr key={x.d} style={{ borderTop: "1px solid var(--color-line)", opacity: isInMission(x.d) ? 1 : 0.55 }}>
                  <td className="px-3 py-2.5">
                    <Link href={`/heute?datum=${x.d}`} className="t-strong text-[14px] underline-offset-2 hover:underline">
                      {formatDayShort(x.d)}
                    </Link>
                  </td>
                  <td className="t-num px-3 py-2.5 text-right text-[14px]" style={{ color: ok ? "var(--color-good)" : undefined }}>
                    {x.protein === null ? "nicht erfasst" : `${formatDecimal(x.protein, 0)} g`}
                    {ok ? <span className="t-label t-label-sm ml-1.5">erreicht</span> : null}
                    {x.proteinFromTotal ? <span className="t-label t-label-sm block text-mute">Tageswert</span> : null}
                  </td>
                  <td className="t-num px-3 py-2.5 text-right text-[14px] text-mute">{x.target === null ? "offen" : `${formatDecimal(x.target, 0)} g`}</td>
                  <td className="t-num hidden px-3 py-2.5 text-right text-[14px] sm:table-cell">
                    {x.kcal === null ? "" : formatInt(x.kcal)}
                    {x.kcalFromTotal ? <span className="t-label t-label-sm block text-mute">Tageswert</span> : null}
                  </td>
                  <td className="t-num px-3 py-2.5 text-right text-[14px]">{x.meals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="text-[13px] text-mute">
        Ziel = Gewicht aus dem letzten Checkup (vorher letztes Morgengewicht) × {formatDecimal(athlete.protein_target_g_per_kg, 1)} g/kg.
        Pro Tag zählt der eingetragene Gesamtwert, sonst die Summe der Mahlzeiten. Durchschnitte zählen nur Tage mit Eintrag.
      </p>
    </div>
  );
}
