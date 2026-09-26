"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { AutosaveText } from "@/components/form/AutosaveText";
import {
  addTemplateExercise,
  deleteTemplate,
  moveTemplateExercise,
  removeTemplateExercise,
  saveTemplateExerciseField,
  saveTemplateField,
  setWeekTemplateItem,
  type ExerciseState,
} from "@/app/actions/training";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { FIELDS, TEXT_MAX } from "@/lib/fields";
import { toInputValue } from "@/lib/numbers";
import type { Category } from "@/lib/supabase/database.types";

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function WeekTemplateEditor({
  weekTemplateId,
  items,
  templates,
}: {
  weekTemplateId: string;
  items: { weekday: number; slot: number; plan_template_id: string }[];
  templates: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const valueFor = (weekday: number, slot: number) =>
    items.find((i) => i.weekday === weekday && i.slot === slot)?.plan_template_id ?? "";
  return (
    <ul className="divide-line" aria-busy={pending}>
      {WEEKDAYS.map((day, index) => {
        const weekday = index + 1;
        return (
          <li key={day} className="grid grid-cols-[92px_1fr] items-start gap-2 px-4 py-2 sm:grid-cols-[110px_1fr_1fr]">
            <span className="t-strong pt-2.5 text-[14px]">{day}</span>
            {[1, 2].map((slot) => (
              <label key={slot} className={slot === 2 ? "col-start-2 sm:col-start-auto" : ""}>
                <span className="sr-only">{`${day}, ${slot}. Einheit`}</span>
                <select
                  className="field py-1.5 text-[14px]"
                  value={valueFor(weekday, slot)}
                  disabled={pending}
                  onChange={(e) => {
                    const v = e.target.value;
                    startTransition(() => setWeekTemplateItem(weekTemplateId, weekday, slot, v));
                  }}
                >
                  <option value="">{slot === 1 ? "Ruhetag" : "keine 2. Einheit"}</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

export function TemplateBasics({
  id,
  name,
  category,
  duration,
  activity,
  distance,
}: {
  id: string;
  name: string;
  category: Category;
  duration: number | null;
  activity: string | null;
  distance: number | null;
}) {
  const [cat, setCat] = useState(category);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-4 p-4">
      <AutosaveText label="Name" initial={name} max={TEXT_MAX.templateName} save={(v) => saveTemplateField(id, "name", v)} />
      <fieldset className="flex flex-col gap-1.5" aria-busy={pending}>
        <legend className="t-label mb-1.5">Kategorie</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cat === c}
              className="btn"
              style={cat === c ? { background: "var(--color-acc)", color: "var(--color-acc-on)" } : undefined}
              onClick={() => {
                setCat(c);
                startTransition(async () => {
                  await saveTemplateField(id, "category", c);
                });
              }}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <AutosaveNumber
          label="Dauer"
          field={FIELDS.duration}
          initial={duration === null ? "" : String(duration)}
          save={(v) => saveTemplateField(id, "default_duration_min", v)}
        />
        {cat !== "strength" ? (
          <AutosaveNumber
            label="Distanz"
            field={FIELDS.distance}
            initial={toInputValue(distance)}
            placeholder="optional"
            save={(v) => saveTemplateField(id, "default_distance_km", v)}
          />
        ) : null}
      </div>
      {cat !== "strength" ? (
        <AutosaveText label="Aktivität" initial={activity ?? ""} max={TEXT_MAX.activity} placeholder="Laufen, Rad, HIIT-Kurs" save={(v) => saveTemplateField(id, "activity", v)} />
      ) : null}
    </div>
  );
}

export function TemplateExerciseRow({
  row,
  isFirst,
  isLast,
}: {
  row: { id: string; name: string; target_sets: number | null; target_reps: string | null };
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-col gap-2 px-4 py-3" aria-busy={pending}>
      <div className="flex items-center justify-between gap-2">
        <span className="t-strong text-[15px]">{row.name}</span>
        <div className="flex gap-1">
          <button type="button" className="btn btn-sm" disabled={pending || isFirst} onClick={() => startTransition(() => moveTemplateExercise(row.id, "up"))}>
            Hoch
          </button>
          <button type="button" className="btn btn-sm" disabled={pending || isLast} onClick={() => startTransition(() => moveTemplateExercise(row.id, "down"))}>
            Runter
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`${row.name} aus der Vorlage entfernen?`)) startTransition(() => removeTemplateExercise(row.id));
            }}
          >
            Weg
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AutosaveNumber
          label="Sätze"
          field={{ kind: "int", min: 1, max: 20 }}
          initial={row.target_sets === null ? "" : String(row.target_sets)}
          save={(v) => saveTemplateExerciseField(row.id, "target_sets", v)}
        />
        <AutosaveText
          label="Wiederholungen"
          initial={row.target_reps ?? ""}
          max={TEXT_MAX.reps}
          placeholder="z. B. 8-10"
          save={(v) => saveTemplateExerciseField(row.id, "target_reps", v)}
        />
      </div>
    </li>
  );
}

export function AddTemplateExercise({ templateId, suggestions }: { templateId: string; suggestions: string[] }) {
  const [state, action, pending] = useActionState<ExerciseState, FormData>(addTemplateExercise.bind(null, templateId), {});
  const listId = useId();
  return (
    <form action={action} className="flex flex-col gap-2 p-4">
      <label className="flex flex-col gap-1.5">
        <span className="t-label">Übung hinzufügen</span>
        <div className="flex gap-2">
          <input name="name" list={listId} className="field" placeholder="Name, z. B. Dips" autoComplete="off" maxLength={80} required />
          <button type="submit" className="btn shrink-0" disabled={pending}>
            Dazu
          </button>
        </div>
      </label>
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {state.error ? <p className="text-[14px] text-bad">{state.error}</p> : null}
    </form>
  );
}

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => {
        if (confirm(`Vorlage "${name}" löschen? Bereits angelegte Einheiten bleiben erhalten, Wochenvorlagen verlieren diesen Tag.`)) {
          startTransition(() => deleteTemplate(id));
        }
      }}
    >
      Vorlage löschen
    </button>
  );
}
