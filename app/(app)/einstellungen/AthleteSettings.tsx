"use client";

import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { saveAthleteField } from "@/app/actions/settings";
import { FIELDS } from "@/lib/fields";
import { toInputValue } from "@/lib/numbers";
import type { AthleteRow } from "@/lib/supabase/database.types";

export function AthleteSettings({ athlete }: { athlete: AthleteRow }) {
  const save = (field: string) => (v: string) => saveAthleteField(athlete.id, field, v);
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      <AutosaveNumber label="Geburtsjahr" field={FIELDS.birthYear} initial={athlete.birth_year === null ? "" : String(athlete.birth_year)} placeholder="z. B. 1990" save={save("birth_year")} />
      <AutosaveNumber label="Größe" field={FIELDS.height} initial={toInputValue(athlete.height_cm, 1)} placeholder="optional" save={save("height_cm")} />
      <AutosaveNumber label="Proteinziel" field={FIELDS.proteinFactor} initial={toInputValue(athlete.protein_target_g_per_kg, 1)} save={save("protein_target_g_per_kg")} />
      <AutosaveNumber label="Schrittziel" field={FIELDS.stepsTarget} initial={String(athlete.steps_target)} save={save("steps_target")} />
      <div className="col-span-2">
        <AutosaveNumber
          label="Trainings pro Woche (ohne Recovery)"
          field={FIELDS.weeklyTarget}
          initial={String(athlete.training_target_per_week)}
          save={save("training_target_per_week")}
        />
      </div>
    </div>
  );
}
