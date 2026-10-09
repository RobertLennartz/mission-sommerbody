"use client";

import { useEffect, useState, useTransition } from "react";
import { KCAL_EVENT } from "./EnergyCard";
import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { AutosaveText } from "@/components/form/AutosaveText";
import { Progress } from "@/components/Progress";
import { addMeal, deleteMeal, saveDailyField, saveMealField } from "@/app/actions/day";
import { MEAL_LABEL, MEAL_TYPES } from "@/lib/categories";
import { FIELDS, TEXT_MAX } from "@/lib/fields";
import { formatDecimal, formatInt, toInputValue } from "@/lib/numbers";
import type { MealRow, MealType } from "@/lib/supabase/database.types";

export type ProteinTarget = { grams: number; basis: string } | null;

export function MealsCard({
  athleteId,
  date,
  meals,
  target,
  proteinTotal,
  kcalTotal,
}: {
  athleteId: string;
  date: string;
  meals: MealRow[];
  target: ProteinTarget;
  proteinTotal: number | null;
  kcalTotal: number | null;
}) {
  const [protein, setProtein] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(meals.map((m) => [m.id, m.protein_g])),
  );
  const [dayProtein, setDayProtein] = useState<number | null>(proteinTotal);
  const [dayKcal, setDayKcal] = useState<number | null>(kcalTotal);
  const [pending, startTransition] = useTransition();
  const mealSum = meals.reduce((sum, m) => sum + ((m.id in protein ? protein[m.id] : m.protein_g) ?? 0), 0);
  // A daily total wins over the meals (Robert, 27.09.2026).
  const total = dayProtein ?? mealSum;
  const mealKcal = meals.some((m) => m.kcal !== null) ? meals.reduce((sum, m) => sum + (m.kcal ?? 0), 0) : null;
  const kcal = dayKcal ?? mealKcal;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(KCAL_EVENT, { detail: kcal }));
  }, [kcal]);

  return (
    <section className="card">
      <div className="card-head flex items-baseline justify-between gap-3">
        <h2 className="t-label t-label-lg">Ernährung</h2>
        <span className="t-num text-[13px] text-mute">
          {target ? `Ziel ${formatInt(Math.round(target.grams))} g Protein` : "Noch kein Proteinziel"}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="t-num text-[28px] font-medium">
            {formatDecimal(total, 1)} g
          </span>
          <span className="t-num text-[13px] text-mute">
            {target ? `${Math.round((total / target.grams) * 100)} % vom Ziel` : ""}
          </span>
        </div>
        <p className="t-label t-label-sm text-mute">
          {dayProtein !== null
            ? `Tageswert zählt${meals.length ? ` (Mahlzeiten ergeben ${formatDecimal(mealSum, 1)} g)` : ""}`
            : meals.length
              ? "Summe der Mahlzeiten"
              : "Noch nichts eingetragen"}
        </p>
        <p className="t-num text-[15px]">
          {kcal === null ? <span className="text-mute">Kalorien: nicht erfasst</span> : `${formatInt(kcal)} kcal`}
          {kcal !== null ? <span className="t-label t-label-sm ml-2 text-mute">{dayKcal !== null ? "Tageswert" : "aus Mahlzeiten"}</span> : null}
        </p>
        {target ? (
          <>
            <Progress value={total} max={target.grams} label="Protein gegen Ziel" />
            <p className="t-label t-label-sm text-mute">{target.basis}</p>
          </>
        ) : (
          <p className="text-[14px] text-mute">
            Das Ziel erscheint, sobald ein Checkup oder ein Morgengewicht eingetragen ist.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
        <span className="t-label">Schnell: Gesamtwerte für den Tag</span>
        <div className="grid grid-cols-2 gap-3">
          <AutosaveNumber
            label="Protein"
            field={FIELDS.proteinTotal}
            initial={toInputValue(proteinTotal, 1)}
            placeholder="ungefähr"
            draftKey={`ms:${athleteId}:${date}:proteinTotal`}
            onValue={setDayProtein}
            save={(v) => saveDailyField(athleteId, date, "protein_total_g", v)}
          />
          <AutosaveNumber
            label="Kalorien"
            field={FIELDS.kcalTotal}
            initial={kcalTotal === null ? "" : String(kcalTotal)}
            placeholder="ungefähr"
            draftKey={`ms:${athleteId}:${date}:kcalTotal`}
            onValue={setDayKcal}
            save={(v) => saveDailyField(athleteId, date, "kcal_total", v)}
          />
        </div>
        <span className="t-label t-label-sm text-mute">
          Ein Gesamtwert gilt vor der Summe der Mahlzeiten. Feld leeren, dann zählen wieder die Mahlzeiten.
        </span>
      </div>

      {meals.length ? (
        <div className="px-4 pb-1 pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
          <span className="t-label">Einzelne Mahlzeiten (optional)</span>
        </div>
      ) : null}
      <ul className="divide-line">
        {meals.map((meal) => (
          <li key={meal.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <MealTypeSelect meal={meal} />
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={pending}
                onClick={() => {
                  if (confirm("Mahlzeit löschen?")) startTransition(() => deleteMeal(meal.id));
                }}
              >
                Löschen
              </button>
            </div>
            <AutosaveText
              label="Was gab es?"
              hideLabel
              max={TEXT_MAX.mealDescription}
              initial={meal.description}
              placeholder="Was gab es? z. B. 250 g Skyr mit Beeren"
              draftKey={`ms:meal:${meal.id}:description`}
              save={(v) => saveMealField(meal.id, "description", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <AutosaveNumber
                label="Protein"
                field={FIELDS.protein}
                initial={toInputValue(meal.protein_g, 1)}
                placeholder="Schätzung"
                draftKey={`ms:meal:${meal.id}:protein`}
                onValue={(v) => setProtein((p) => ({ ...p, [meal.id]: v }))}
                save={(v) => saveMealField(meal.id, "protein_g", v)}
              />
              <AutosaveNumber
                label="Kalorien"
                field={FIELDS.kcal}
                initial={meal.kcal === null ? "" : String(meal.kcal)}
                placeholder="optional"
                draftKey={`ms:meal:${meal.id}:kcal`}
                save={(v) => saveMealField(meal.id, "kcal", v)}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 p-4" style={{ borderTop: "1px solid var(--color-line)" }}>
        <span className="t-label">Einzelne Mahlzeit hinzufügen (optional)</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="btn btn-sm"
              disabled={pending}
              onClick={() => startTransition(() => addMeal(athleteId, date, type))}
            >
              + {MEAL_LABEL[type]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MealTypeSelect({ meal }: { meal: MealRow }) {
  const [value, setValue] = useState<MealType>(meal.meal_type);
  const [error, setError] = useState<string | null>(null);
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Art der Mahlzeit</span>
      <select
        className="field t-strong w-auto py-1 text-[14px] uppercase"
        value={value}
        onChange={async (e) => {
          const next = e.target.value as MealType;
          setValue(next);
          const r = await saveMealField(meal.id, "meal_type", next);
          setError(r.ok ? null : r.error);
        }}
      >
        {MEAL_TYPES.map((t) => (
          <option key={t} value={t}>
            {MEAL_LABEL[t]}
          </option>
        ))}
      </select>
      {error ? <span className="t-label text-bad">{error}</span> : null}
    </label>
  );
}
