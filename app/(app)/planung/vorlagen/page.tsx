import type { Metadata } from "next";
import Link from "next/link";
import { CategoryMark } from "@/components/SessionBadge";
import { createTemplate } from "@/app/actions/training";
import { requireSelectedAthlete } from "@/lib/athletes";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { getTemplates, getWeekTemplates } from "@/lib/data/training";
import { formatDecimal } from "@/lib/numbers";
import { WeekTemplateEditor } from "./TemplateForms";

export const metadata: Metadata = { title: "Vorlagen" };

export default async function TemplatesPage() {
  await requireSelectedAthlete();
  const [templates, weekTemplates] = await Promise.all([getTemplates(), getWeekTemplates()]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/planung" className="t-label underline">
        Zur Planung
      </Link>
      <h1 className="t-head text-[30px]">Vorlagen</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="card-head">
            <h2 className="t-label t-label-lg">Einheiten</h2>
          </div>
          <ul className="divide-line">
            {templates.map((t) => (
              <li key={t.id}>
                <Link href={`/planung/vorlagen/${t.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-2 hover:bg-paper">
                  <CategoryMark category={t.category} status="done" />
                  <span className="flex flex-1 flex-col">
                    <span className="t-strong text-[15px]">{t.name}</span>
                    <span className="t-label t-label-sm text-mute">
                      {CATEGORY_LABEL[t.category]}
                      {t.default_duration_min ? ` · ${t.default_duration_min} min` : ""}
                      {t.category === "strength" ? ` · ${t.exercises.length} Übungen` : ""}
                      {t.default_distance_km ? ` · ${formatDecimal(t.default_distance_km, 2)} km` : ""}
                    </span>
                  </span>
                  <span className="t-label text-mute">Bearbeiten</span>
                </Link>
              </li>
            ))}
          </ul>
          <form action={createTemplate} className="flex flex-col gap-3 p-4" style={{ borderTop: "1px solid var(--color-line)" }}>
            <span className="t-label">Neue Vorlage</span>
            <input name="name" className="field" placeholder="Name, z. B. Oberkörper" maxLength={60} required />
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c, i) => (
                <label key={c}>
                  <input type="radio" name="category" value={c} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="btn w-full peer-checked:bg-acc peer-checked:text-acc-on">{CATEGORY_LABEL[c]}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-primary">
              Anlegen
            </button>
          </form>
        </section>

        {weekTemplates.map((w) => (
          <section key={w.id} className="card">
            <div className="card-head">
              <h2 className="t-label t-label-lg">Wochenvorlage: {w.name}</h2>
            </div>
            <WeekTemplateEditor
              weekTemplateId={w.id}
              items={w.items}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            />
            <p className="px-4 pb-4 pt-2 text-[13px] text-mute">Änderungen speichern sofort. Zum Anwenden in der Planung &quot;Woche füllen&quot;.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
