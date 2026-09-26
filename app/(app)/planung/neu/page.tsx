import type { Metadata } from "next";
import Link from "next/link";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { getTemplates } from "@/lib/data/training";
import { berlinToday, isIsoDate } from "@/lib/dates";
import { formatDecimal } from "@/lib/numbers";
import { NewSessionForm } from "./NewSessionForm";

export const metadata: Metadata = { title: "Einheit anlegen" };

export default async function NewSessionPage({ searchParams }: PageProps<"/planung/neu">) {
  const params = await searchParams;
  const date = isIsoDate(params.datum) ? params.datum : berlinToday();
  const back = typeof params.zurueck === "string" && params.zurueck.startsWith("/") && !params.zurueck.startsWith("//") ? params.zurueck : "";
  const selected = await requireSelectedAthlete();
  const [athletes, templates] = await Promise.all([getAthletes(), getTemplates()]);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-5">
      <Link href={back || "/planung"} className="t-label underline">
        Zurück
      </Link>
      <h1 className="t-head text-[30px]">Einheit anlegen</h1>
      <p className="text-[15px] leading-relaxed text-mute">
        Geplante Einheiten tragt ihr nach dem Training ein. Eine ungeplante Einheit legst du mit Status &quot;Schon erledigt&quot; direkt an.
      </p>
      <NewSessionForm
        date={date}
        back={back}
        defaultStatus={date < berlinToday() ? "done" : "planned"}
        athletes={athletes.map((a) => ({ id: a.id, name: a.name }))}
        defaultWho={selected.id}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          detail:
            t.category === "strength"
              ? `${t.exercises.length} Übungen`
              : [t.activity, t.default_distance_km ? `${formatDecimal(t.default_distance_km, 2)} km` : null].filter(Boolean).join(", "),
        }))}
      />
    </div>
  );
}
