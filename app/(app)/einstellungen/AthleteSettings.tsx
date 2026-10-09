"use client";

import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { SaveStatusText } from "@/components/form/SaveStatusText";
import { useAutosave } from "@/components/form/useAutosave";
import { FORMULA_LABEL } from "@/lib/bodyfat";
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
          label="Trainings pro Woche (0 = kein Ziel, Recovery zählt nicht)"
          field={FIELDS.weeklyTarget}
          initial={String(athlete.training_target_per_week)}
          save={save("training_target_per_week")}
        />
      </div>
      <div className="col-span-2">
        <FormulaSelect athleteId={athlete.id} initial={athlete.bodyfat_formula ?? ""} />
      </div>
    </div>
  );
}

function FormulaSelect({ athleteId, initial }: { athleteId: string; initial: string }) {
  const auto = useAutosave({
    id: `formula-${athleteId}`,
    initial,
    save: (v) => saveAthleteField(athleteId, "bodyfat_formula", v),
    debounceMs: 0,
  });
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-label">Körperfettformel</span>
      <select className="field" value={auto.value} onChange={(e) => auto.change(e.target.value)}>
        <option value="">Bitte wählen</option>
        <option value="jp7_male">{FORMULA_LABEL.jp7_male}</option>
        <option value="jp7_female">{FORMULA_LABEL.jp7_female}</option>
      </select>
      <SaveStatusText status={auto.status} savedAt={auto.savedAt} error={auto.error} />
    </label>
  );
}
