"use client";

import { useState, useTransition } from "react";
import { AutosaveNumber } from "@/components/form/AutosaveNumber";
import { AutosaveText } from "@/components/form/AutosaveText";
import { CompactNumber } from "@/components/form/CompactNumber";
import { SaveStatusText } from "@/components/form/SaveStatusText";
import { useAutosave } from "@/components/form/useAutosave";
import { deleteCheckup, saveCheckupField, saveSkinfold } from "@/app/actions/checkups";
import { SITE_HINT, SITE_LABEL, SKINFOLD_SITES, ageFromBirthYear, computeBodyComposition, mean, type SkinfoldReadings } from "@/lib/bodyfat";
import { FIELDS, TEXT_MAX } from "@/lib/fields";
import { CIRCUMFERENCES } from "@/lib/measurements";
import { formatDecimal, toInputValue } from "@/lib/numbers";
import type { CheckupRow } from "@/lib/supabase/database.types";

type Grid = Record<string, number | null>; // "site:reading" -> mm

export function CheckupForm({
  checkup,
  rawReadings,
  birthYear,
}: {
  checkup: CheckupRow;
  rawReadings: Record<string, number>;
  birthYear: number | null;
}) {
  const [weight, setWeight] = useState<number | null>(checkup.weight_kg);
  const [date, setDate] = useState(checkup.date);
  const [grid, setGrid] = useState<Grid>(rawReadings);
  const [pending, startTransition] = useTransition();

  const readings: SkinfoldReadings = {};
  for (const site of SKINFOLD_SITES) {
    const values = [1, 2, 3].map((n) => grid[`${site}:${n}`]).filter((v): v is number => typeof v === "number");
    if (values.length) readings[site] = values;
  }
  const result = computeBodyComposition({ readings, birthYear, measuredOn: date, weightKg: weight });

  const dateAuto = useAutosave({
    id: `checkup-date-${checkup.id}`,
    initial: checkup.date,
    save: (v) => saveCheckupField(checkup.id, "date", v),
    debounceMs: 0,
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Ergebnis</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
          {[
            { label: "Körperfett", value: result.bodyFatPct === null ? "offen" : `${formatDecimal(result.bodyFatPct, 1, true)} %` },
            { label: "Fettmasse", value: result.fatMassKg === null ? "offen" : `${formatDecimal(result.fatMassKg, 1, true)} kg` },
            { label: "Fettfreie Masse", value: result.leanMassKg === null ? "offen" : `${formatDecimal(result.leanMassKg, 1, true)} kg` },
            { label: "Summe 7 Falten", value: result.sumMm === null ? "offen" : `${formatDecimal(result.sumMm, 1, true)} mm` },
            { label: "Körperdichte", value: result.density === null ? "offen" : formatDecimal(result.density, 4, true) },
          ].map((x) => (
            <div key={x.label} className="flex flex-col gap-0.5">
              <span className="t-label text-mute">{x.label}</span>
              <span className="t-num text-[20px] font-medium">{x.value}</span>
            </div>
          ))}
        </div>
        {result.missing.length ? (
          <p className="px-4 pb-4 text-[13px] text-mute">Es fehlt noch: {result.missing.join(", ")}.</p>
        ) : (
          <p className="px-4 pb-4 text-[13px] text-mute">
            Jackson/Pollock 7-Punkt, Siri-Formel, Alter {birthYear ? ageFromBirthYear(birthYear, date) : "?"} Jahre.
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Basis</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Datum</span>
            <input
              type="date"
              className="field"
              value={dateAuto.value}
              onChange={(e) => {
                dateAuto.change(e.target.value);
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <SaveStatusText status={dateAuto.status} savedAt={dateAuto.savedAt} error={dateAuto.error} />
          </label>
          <AutosaveNumber
            label="Gewicht"
            field={FIELDS.weight}
            initial={toInputValue(checkup.weight_kg)}
            draftKey={`ms:checkup:${checkup.id}:weight`}
            onValue={setWeight}
            save={(v) => saveCheckupField(checkup.id, "weight_kg", v)}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Hautfalten (mm)</h2>
        </div>
        <p className="px-4 pt-3 text-[13px] leading-relaxed text-mute">
          Rechte Körperseite. Falte mit Daumen und Zeigefinger abheben, Zange 1 cm daneben ansetzen, 2 Sekunden warten, ablesen.
          Bis zu 3 Messungen pro Punkt, gerechnet wird mit dem Mittelwert.
        </p>
        <ul className="divide-line">
          {SKINFOLD_SITES.map((site) => {
            const m = mean(readings[site] ?? []);
            return (
              <li key={site} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-strong text-[15px]">{SITE_LABEL[site]}</span>
                  <span className="t-num text-[13px] text-mute">{m === null ? "" : `Ø ${formatDecimal(m, 1, true)}`}</span>
                </div>
                <p className="text-[13px] text-mute">{SITE_HINT[site]}</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <CompactNumber
                      key={n}
                      label={`${SITE_LABEL[site]} Messung ${n}`}
                      field={FIELDS.skinfold}
                      placeholder={`${n}.`}
                      initial={toInputValue(rawReadings[`${site}:${n}`] ?? null, 1)}
                      draftKey={`ms:checkup:${checkup.id}:${site}:${n}`}
                      onValue={(v) => setGrid((g) => ({ ...g, [`${site}:${n}`]: v }))}
                      save={(v) => saveSkinfold(checkup.id, site, n, v)}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Umfänge (cm)</h2>
        </div>
        <ul className="divide-line">
          {CIRCUMFERENCES.map((c) => (
            <li key={c.key} className="grid grid-cols-[1fr_110px] items-start gap-3 px-4 py-3">
              <div className="flex flex-col">
                <span className="t-strong text-[15px]">{c.label}</span>
                <span className="text-[13px] text-mute">{c.hint}</span>
              </div>
              <CompactNumber
                label={c.label}
                field={c.field}
                initial={toInputValue(checkup[c.key], 1)}
                draftKey={`ms:checkup:${checkup.id}:${c.key}`}
                save={(v) => saveCheckupField(checkup.id, c.key, v)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Notiz</h2>
        </div>
        <div className="p-4">
          <AutosaveText
            label="Notiz zum Checkup"
            hideLabel
            multiline
            rows={3}
            max={TEXT_MAX.notes}
            initial={checkup.notes ?? ""}
            placeholder="Uhrzeit, wer gemessen hat, nüchtern oder nicht ..."
            save={(v) => saveCheckupField(checkup.id, "notes", v)}
          />
        </div>
      </section>

      <button
        type="button"
        className="btn btn-sm btn-danger self-start"
        disabled={pending}
        onClick={() => {
          if (confirm("Checkup mit allen Messwerten löschen?")) startTransition(() => deleteCheckup(checkup.id));
        }}
      >
        Checkup löschen
      </button>
    </div>
  );
}
