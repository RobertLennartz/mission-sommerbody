import type { Metadata } from "next";
import Link from "next/link";
import { CategoryMark } from "@/components/SessionBadge";
import { StatusPill } from "@/components/StatusPill";
import { WeekNav } from "@/components/WeekNav";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { CATEGORY_LABEL } from "@/lib/categories";
import { getTemplates, getWeekTemplates, listSessions } from "@/lib/data/training";
import { addDays, formatDayLong, weekDates } from "@/lib/dates";
import { MISSION_RANGE_LABEL, isInMission } from "@/lib/mission";
import { weekFromParam } from "@/lib/week-param";
import { joinNames } from "@/lib/numbers";
import { FillWeekForm, SessionControls } from "./PlanControls";

export const metadata: Metadata = { title: "Planung" };

const WEEKDAY = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default async function PlanningPage({ searchParams }: PageProps<"/planung">) {
  const params = await searchParams;
  const monday = weekFromParam(params.woche);
  await requireSelectedAthlete();
  const athletes = await getAthletes();
  const [sessions, templates, weekTemplates] = await Promise.all([
    listSessions(athletes.map((a) => a.id), monday, addDays(monday, 6)),
    getTemplates(),
    getWeekTemplates(),
  ]);
  const templateName = new Map(templates.map((t) => [t.id, t.name]));
  const nameOf = new Map(athletes.map((a) => [a.id, a.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="t-head text-[30px]">Planung</h1>
        <div className="flex gap-2">
          <Link href={`/planung/neu?datum=${monday}`} className="btn btn-primary btn-sm">
            Einheit planen
          </Link>
          <Link href="/planung/vorlagen" className="btn btn-sm">
            Vorlagen
          </Link>
        </div>
      </div>

      <WeekNav monday={monday} basePath="/planung" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {weekDates(monday).map((date) => {
            const daySessions = sessions.filter((s) => s.date === date);
            return (
              <section key={date} className="card" style={isInMission(date) ? undefined : { borderColor: "var(--color-dead)" }}>
                <div className="card-head flex items-baseline justify-between">
                  <h2 className="t-strong text-[14px] uppercase">{formatDayLong(date)}</h2>
                  <Link href={`/planung/neu?datum=${date}`} className="t-label underline">
                    + Einheit
                  </Link>
                </div>
                {daySessions.length === 0 ? (
                  <p className="px-4 py-3 text-[14px] text-mute">{isInMission(date) ? "Nichts geplant." : "Außerhalb der Mission."}</p>
                ) : (
                  <ul className="divide-line">
                    {athletes.map((athlete) => {
                      const own = daySessions.filter((s) => s.athlete_id === athlete.id);
                      return own.map((s, i) => {
                        const partners = s.pair_id
                          ? sessions.filter((x) => x.pair_id === s.pair_id && x.id !== s.id)
                          : [];
                        return (
                          <li key={s.id} className="flex flex-col gap-2 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <CategoryMark category={s.category} status={s.status} />
                              <Link href={`/einheit/${s.id}`} className="flex min-w-0 flex-1 flex-col">
                                <span className="t-strong truncate text-[15px] underline-offset-2 hover:underline">{s.title}</span>
                                <span className="t-label t-label-sm text-mute">
                                  {athlete.name} · {CATEGORY_LABEL[s.category]}
                                  {s.template_id && templateName.get(s.template_id) !== s.title ? ` · ${templateName.get(s.template_id)}` : ""}
                                  {partners.length ? " · gemeinsam" : ""}
                                </span>
                              </Link>
                              <StatusPill status={s.status} />
                            </div>
                            <SessionControls
                              id={s.id}
                              date={s.date}
                              monday={monday}
                              partnerName={partners.length ? joinNames(partners.map((x) => nameOf.get(x.athlete_id) ?? "")) : null}
                              isFirst={i === 0}
                              isLast={i === own.length - 1}
                            />
                          </li>
                        );
                      });
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card">
            <div className="card-head">
              <h2 className="t-label t-label-lg">Woche aus Vorlage füllen</h2>
            </div>
            <FillWeekForm
              monday={monday}
              athletes={athletes.map((a) => ({ id: a.id, name: a.name }))}
              defaultIds={athletes.filter((a) => a.training_target_per_week > 0).map((a) => a.id)}
              weekTemplates={weekTemplates.map((w) => ({
                id: w.id,
                name: w.name,
                summary:
                  w.items.map((i) => `${WEEKDAY[i.weekday - 1]} ${templateName.get(i.plan_template_id) ?? ""}`).join(", ") || "leer",
              }))}
            />
          </section>
          <p className="text-[13px] leading-relaxed text-mute">
            Füllen legt nur Tage innerhalb der Mission an ({MISSION_RANGE_LABEL}). Danach lässt sich jede Einheit einzeln verschieben.
            Bei gemeinsamen Einheiten fragt die App, ob beide gemeint sind.
          </p>
        </aside>
      </div>
    </div>
  );
}
