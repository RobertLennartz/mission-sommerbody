import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSelectedAthlete } from "@/lib/athletes";
import { getExercises, getTemplates } from "@/lib/data/training";
import { AddTemplateExercise, DeleteTemplateButton, TemplateBasics, TemplateExerciseRow } from "../TemplateForms";

export const metadata: Metadata = { title: "Vorlage bearbeiten" };

export default async function TemplatePage({ params }: PageProps<"/planung/vorlagen/[id]">) {
  const { id } = await params;
  await requireSelectedAthlete();
  const [templates, catalog] = await Promise.all([getTemplates(), getExercises()]);
  const t = templates.find((x) => x.id === id);
  if (!t) notFound();

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <Link href="/planung/vorlagen" className="t-label underline">
        Alle Vorlagen
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="t-head text-[28px]">{t.name}</h1>
        <DeleteTemplateButton id={t.id} name={t.name} />
      </div>
      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Grunddaten</h2>
        </div>
        <TemplateBasics
          key={t.category}
          id={t.id}
          name={t.name}
          category={t.category}
          duration={t.default_duration_min}
          activity={t.activity}
          distance={t.default_distance_km}
        />
      </section>
      {t.category === "strength" ? (
        <section className="card">
          <div className="card-head">
            <h2 className="t-label t-label-lg">Übungen</h2>
          </div>
          <ul className="divide-line">
            {t.exercises.map((e, i) => (
              <TemplateExerciseRow key={`${e.id}:${e.position}`} row={e} isFirst={i === 0} isLast={i === t.exercises.length - 1} />
            ))}
          </ul>
          <div style={{ borderTop: "1px solid var(--color-line)" }}>
            <AddTemplateExercise templateId={t.id} suggestions={catalog.map((c) => c.name)} />
          </div>
        </section>
      ) : null}
      <p className="text-[13px] text-mute">Änderungen gelten für neu angelegte Einheiten. Bereits geplante Einheiten bleiben, wie sie sind.</p>
    </div>
  );
}
