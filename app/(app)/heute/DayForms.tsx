"use client";

import { useState, useTransition } from "react";
import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { AutosaveText } from "@/components/form/AutosaveText";
import { SaveStatusText } from "@/components/form/SaveStatusText";
import { useAutosave } from "@/components/form/useAutosave";
import { Progress } from "@/components/Progress";
import { saveDailyField } from "@/app/actions/day";
import { FIELDS, TEXT_MAX } from "@/lib/fields";
import { formatInt, toInputValue } from "@/lib/numbers";

type Props = { athleteId: string; date: string };

export function StepsCard({ athleteId, date, initial, target }: Props & { initial: number | null; target: number }) {
  const [steps, setSteps] = useState<number | null>(initial);
  return (
    <section className="card">
      <div className="card-head flex items-baseline justify-between">
        <h2 className="t-label t-label-lg">Schritte</h2>
        <span className="t-num text-[13px] text-mute">Ziel {formatInt(target)}</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <AutosaveNumber
          label="Schritte heute"
          hideLabel
          large
          field={FIELDS.steps}
          initial={initial === null ? "" : String(initial)}
          placeholder="0"
          draftKey={`ms:${athleteId}:${date}:steps`}
          onValue={setSteps}
          save={(v) => saveDailyField(athleteId, date, "steps", v)}
        />
        <Progress value={steps ?? 0} max={target} label="Schritte gegen Ziel" />
        <p className="t-num text-[13px] text-mute">
          {formatInt(steps ?? 0)} von {formatInt(target)} ({target ? Math.round(((steps ?? 0) / target) * 100) : 0} %)
        </p>
      </div>
    </section>
  );
}

function EnergyButtons({ athleteId, date, initial }: Props & { initial: number | null }) {
  const [, startTransition] = useTransition();
  const auto = useAutosave({
    id: `energy-${athleteId}-${date}`,
    initial: initial === null ? "" : String(initial),
    save: (v) => saveDailyField(athleteId, date, "energy", v),
    debounceMs: 0,
  });
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-label" id="energy-label">
        Energie <span className="text-mute">(1 platt bis 5 top)</span>
      </span>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-labelledby="energy-label">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = auto.value === String(n);
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              className="btn t-num px-0 text-[16px]"
              style={active ? { background: "var(--color-acc)", color: "var(--color-acc-on)" } : undefined}
              onClick={() => startTransition(() => auto.change(active ? "" : String(n)))}
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

export function BodyCard({
  athleteId,
  date,
  weight,
  sleep,
  energy,
}: Props & { weight: number | null; sleep: number | null; energy: number | null }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="t-label t-label-lg">Körper und Schlaf</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <AutosaveNumber
          label="Morgengewicht"
          field={FIELDS.weight}
          initial={toInputValue(weight)}
          placeholder="optional"
          draftKey={`ms:${athleteId}:${date}:weight`}
          save={(v) => saveDailyField(athleteId, date, "weight_kg", v)}
        />
        <AutosaveNumber
          label="Schlaf"
          field={FIELDS.sleep}
          initial={toInputValue(sleep)}
          placeholder="optional"
          draftKey={`ms:${athleteId}:${date}:sleep`}
          save={(v) => saveDailyField(athleteId, date, "sleep_hours", v)}
        />
        <div className="col-span-2">
          <EnergyButtons athleteId={athleteId} date={date} initial={energy} />
        </div>
      </div>
    </section>
  );
}

export function NotesCard({ athleteId, date, initial }: Props & { initial: string | null }) {
  return (
    <section className="card" style={{ borderColor: "var(--color-ink)", borderWidth: 2 }}>
      <div className="card-head" style={{ background: "var(--color-acc-tint)" }}>
        <h2 className="t-label t-label-lg">Bemerkungen</h2>
      </div>
      <div className="p-4">
        <AutosaveText
          label="Bemerkungen zum Tag"
          hideLabel
          multiline
          rows={5}
          max={TEXT_MAX.notes}
          initial={initial ?? ""}
          placeholder="Wie lief der Tag? Muskelkater, Stimmung, Ausreißer beim Essen ..."
          draftKey={`ms:${athleteId}:${date}:notes`}
          save={(v) => saveDailyField(athleteId, date, "notes", v)}
        />
      </div>
    </section>
  );
}
