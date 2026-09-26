"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { AutosaveText } from "@/components/form/AutosaveText";
import { SaveStatusText } from "@/components/form/SaveStatusText";
import { useAutosave } from "@/components/form/useAutosave";
import {
  addSessionExercise,
  deleteSession,
  removeSessionExercise,
  saveSessionField,
  saveSet,
  setSessionStatus,
  setTargetSets,
  type ExerciseState,
} from "@/app/actions/training";
import { FIELDS, TEXT_MAX, parseField } from "@/lib/fields";
import { toInputValue } from "@/lib/numbers";
import type { SessionStatus } from "@/lib/supabase/database.types";

export function StatusButtons({
  id,
  status,
  partnerName,
  afterDelete,
}: {
  id: string;
  status: SessionStatus;
  partnerName: string | null;
  afterDelete: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      {status !== "done" ? (
        <button type="button" className="btn btn-primary min-h-[56px] text-[15px]" disabled={pending} onClick={() => startTransition(() => setSessionStatus(id, "done"))}>
          Als erledigt markieren
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {status !== "skipped" ? (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => startTransition(() => setSessionStatus(id, "skipped"))}>
            Ausgelassen
          </button>
        ) : null}
        {status !== "planned" ? (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => startTransition(() => setSessionStatus(id, "planned"))}>
            Zurück auf geplant
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={pending}
          onClick={() => {
            if (!confirm("Einheit löschen? Alle eingetragenen Sätze gehen verloren.")) return;
            const both = partnerName
              ? confirm(`Gemeinsame Einheit: auch bei ${partnerName} löschen?\n\nOK = beide, Abbrechen = nur diese.`)
              : false;
            startTransition(() => deleteSession(id, both, afterDelete));
          }}
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

export function RpeButtons({ id, initial }: { id: string; initial: number | null }) {
  const auto = useAutosave({
    id: `rpe-${id}`,
    initial: initial === null ? "" : String(initial),
    save: (v) => saveSessionField(id, "rpe", v),
    debounceMs: 0,
  });
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-label" id={`rpe-${id}`}>
        Anstrengung (RPE) <span className="text-mute">1 locker bis 10 am Limit</span>
      </span>
      <div className="grid grid-cols-10 gap-1" role="group" aria-labelledby={`rpe-${id}`}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = auto.value === String(n);
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              className="btn t-num px-0 text-[14px]"
              style={active ? { background: "var(--color-acc)", color: "var(--color-acc-on)" } : undefined}
              onClick={() => auto.change(active ? "" : String(n))}
            >
              {n}
            </button>
          );
        })}
      </div>
      <SaveStatusText status={auto.status} savedAt={auto.savedAt} error={auto.error} />
    </div>
  );
}

export function SessionBasics({
  id,
  title,
  date,
  duration,
  notes,
}: {
  id: string;
  title: string;
  date: string;
  duration: number | null;
  notes: string | null;
}) {
  return (
    <>
      <AutosaveText label="Titel" initial={title} max={TEXT_MAX.title} save={(v) => saveSessionField(id, "title", v)} />
      <div className="grid grid-cols-2 gap-3">
        <DateField id={id} initial={date} />
        <AutosaveNumber
          label="Dauer"
          field={FIELDS.duration}
          initial={duration === null ? "" : String(duration)}
          draftKey={`ms:session:${id}:duration`}
          save={(v) => saveSessionField(id, "duration_min", v)}
        />
      </div>
      <AutosaveText
        label="Notiz"
        multiline
        rows={3}
        max={TEXT_MAX.notes}
        initial={notes ?? ""}
        draftKey={`ms:session:${id}:notes`}
        placeholder="Wie lief es? Technik, Schmerzen, Stimmung"
        save={(v) => saveSessionField(id, "notes", v)}
      />
    </>
  );
}

function DateField({ id, initial }: { id: string; initial: string }) {
  const htmlId = useId();
  const auto = useAutosave({ id: htmlId, initial, save: (v) => saveSessionField(id, "date", v), debounceMs: 0 });
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlId}>
      <span className="t-label">Datum</span>
      <input id={htmlId} type="date" className="field" value={auto.value} onChange={(e) => auto.change(e.target.value)} />
      <SaveStatusText status={auto.status} savedAt={auto.savedAt} error={auto.error} />
    </label>
  );
}

export function CardioFields({
  id,
  activity,
  distance,
  avgHr,
}: {
  id: string;
  activity: string | null;
  distance: number | null;
  avgHr: number | null;
}) {
  return (
    <>
      <AutosaveText label="Aktivität" initial={activity ?? ""} max={TEXT_MAX.activity} placeholder="Laufen, Rad, HIIT-Kurs ..." save={(v) => saveSessionField(id, "activity", v)} />
      <div className="grid grid-cols-2 gap-3">
        <AutosaveNumber
          label="Distanz"
          field={FIELDS.distance}
          initial={toInputValue(distance)}
          placeholder="optional"
          draftKey={`ms:session:${id}:distance`}
          save={(v) => saveSessionField(id, "distance_km", v)}
        />
        <AutosaveNumber
          label="Puls Ø"
          field={FIELDS.heartRate}
          initial={avgHr === null ? "" : String(avgHr)}
          placeholder="optional"
          draftKey={`ms:session:${id}:hr`}
          save={(v) => saveSessionField(id, "avg_hr", v)}
        />
      </div>
    </>
  );
}

/** One compact input in a set row; the border shows the save state. */
function SetInput({
  label,
  exerciseRowId,
  setNo,
  field,
  initial,
  placeholder,
}: {
  label: string;
  exerciseRowId: string;
  setNo: number;
  field: "reps" | "weight_kg";
  initial: string;
  placeholder?: string;
}) {
  const id = useId();
  const spec = field === "reps" ? FIELDS.reps : FIELDS.setWeight;
  const auto = useAutosave({
    id,
    initial,
    save: (v) => saveSet(exerciseRowId, setNo, field, v),
    validate: (raw) => {
      const r = parseField(raw, spec);
      return r.ok ? null : r.error;
    },
    draftKey: `ms:set:${exerciseRowId}:${setNo}:${field}`,
    debounceMs: 600,
  });
  const border =
    auto.status === "invalid" || auto.status === "error"
      ? "var(--color-bad)"
      : auto.status === "saved"
        ? "var(--color-good)"
        : "var(--color-ink)";
  return (
    <label className="flex flex-1 flex-col" title={auto.error ?? undefined}>
      <span className="sr-only">{label}</span>
      <input
        className="field t-num text-center"
        style={{ borderColor: border }}
        inputMode={field === "reps" ? "numeric" : "decimal"}
        enterKeyHint="next"
        autoComplete="off"
        placeholder={placeholder}
        value={auto.value}
        aria-invalid={auto.status === "invalid" || undefined}
        onChange={(e) => auto.change(e.target.value)}
        onBlur={() => void auto.flush()}
      />
      {auto.error ? <span className="t-label t-label-sm mt-1 text-bad">{auto.error}</span> : null}
    </label>
  );
}

export type ExerciseView = {
  id: string;
  name: string;
  targetSets: number | null;
  targetReps: string | null;
  sets: { set_no: number; reps: number | null; weight_kg: number | null }[];
  last: string | null;
};

export function ExerciseBlock({ exercise }: { exercise: ExerciseView }) {
  const [pending, startTransition] = useTransition();
  const rows = Math.max(exercise.targetSets ?? 0, ...exercise.sets.map((s) => s.set_no), 1);
  const bySet = new Map(exercise.sets.map((s) => [s.set_no, s]));
  return (
    <li className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="t-strong text-[16px]">{exercise.name}</span>
          <span className="t-label t-label-sm text-mute">
            {exercise.targetSets ? `Plan ${exercise.targetSets} × ${exercise.targetReps ?? "?"}` : "ohne Plan"}
          </span>
        </div>
        <button
          type="button"
          className="t-label text-mute underline"
          disabled={pending}
          onClick={() => {
            if (confirm(`${exercise.name} aus dieser Einheit entfernen?`)) startTransition(() => removeSessionExercise(exercise.id));
          }}
        >
          Entfernen
        </button>
      </div>
      <p className="t-num text-[13px]" style={{ color: exercise.last ? "var(--color-ink)" : "var(--color-mute)" }}>
        {exercise.last ?? "Noch kein früherer Wert"}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="t-label t-label-sm grid grid-cols-[32px_1fr_1fr] gap-2 text-mute">
          <span>Satz</span>
          <span className="text-center">Wdh.</span>
          <span className="text-center">kg</span>
        </div>
        {Array.from({ length: rows }, (_, i) => i + 1).map((setNo) => {
          const s = bySet.get(setNo);
          return (
            <div key={setNo} className="grid grid-cols-[32px_1fr_1fr] items-start gap-2">
              <span className="t-num pt-3 text-[14px] text-mute">{setNo}</span>
              <SetInput
                label={`Satz ${setNo} Wiederholungen`}
                exerciseRowId={exercise.id}
                setNo={setNo}
                field="reps"
                initial={s?.reps === null || s?.reps === undefined ? "" : String(s.reps)}
                placeholder={exercise.targetReps ?? ""}
              />
              <SetInput
                label={`Satz ${setNo} Gewicht`}
                exerciseRowId={exercise.id}
                setNo={setNo}
                field="weight_kg"
                initial={toInputValue(s?.weight_kg ?? null)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-sm" disabled={pending || rows >= 20} onClick={() => startTransition(() => setTargetSets(exercise.id, rows + 1))}>
          + Satz
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={pending || rows <= 1}
          onClick={() => {
            const hasData = bySet.get(rows);
            if (hasData && !confirm(`Satz ${rows} mit eingetragenen Werten entfernen?`)) return;
            startTransition(() => setTargetSets(exercise.id, rows - 1));
          }}
        >
          Satz weg
        </button>
      </div>
    </li>
  );
}

export function AddExerciseForm({ sessionId, suggestions }: { sessionId: string; suggestions: string[] }) {
  const [state, action, pending] = useActionState<ExerciseState, FormData>(addSessionExercise.bind(null, sessionId), {});
  const listId = useId();
  const [value, setValue] = useState("");
  return (
    <form
      action={(fd) => {
        action(fd);
        setValue("");
      }}
      className="flex flex-col gap-2 p-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="t-label">Übung hinzufügen</span>
        <div className="flex gap-2">
          <input
            name="name"
            list={listId}
            className="field"
            placeholder="Name, z. B. Dips"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            maxLength={80}
            required
          />
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
