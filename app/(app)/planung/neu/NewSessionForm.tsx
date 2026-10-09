"use client";

import { useActionState, useState } from "react";
import { createSessions, type CreateState } from "@/app/actions/training";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import type { Category } from "@/lib/supabase/database.types";
import { WhoChoice } from "../PlanControls";

export function NewSessionForm({
  date,
  athletes,
  defaultWho,
  templates,
  back,
  defaultStatus,
}: {
  date: string;
  athletes: { id: string; name: string }[];
  defaultWho: string[];
  templates: { id: string; name: string; category: Category; detail: string }[];
  back: string;
  defaultStatus: "planned" | "done";
}) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createSessions, {});
  const [template, setTemplate] = useState(templates[0]?.id ?? "");

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="back" value={back} />
      <label className="flex flex-col gap-1.5">
        <span className="t-label">Datum</span>
        <input type="date" name="date" defaultValue={date} required className="field" />
      </label>

      <WhoChoice athletes={athletes} defaultIds={defaultWho} />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="t-label mb-1.5">Status</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: "planned", label: "Geplant" },
            { value: "done", label: "Schon erledigt" },
          ].map((o) => (
            <label key={o.value}>
              <input type="radio" name="status" value={o.value} defaultChecked={o.value === defaultStatus} className="peer sr-only" />
              <span className="btn w-full peer-checked:bg-acc peer-checked:text-acc-on">{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="t-label">Vorlage</span>
        <select name="template" className="field" value={template} onChange={(e) => setTemplate(e.target.value)}>
          {CATEGORIES.map((c) => (
            <optgroup key={c} label={CATEGORY_LABEL[c]}>
              {templates
                .filter((t) => t.category === c)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.detail ? ` (${t.detail})` : ""}
                  </option>
                ))}
            </optgroup>
          ))}
          <option value="">Ohne Vorlage, frei eingeben</option>
        </select>
      </label>

      {template === "" ? (
        <div className="flex flex-col gap-4 p-4" style={{ background: "var(--color-paper)" }}>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="t-label mb-1.5">Kategorie</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {CATEGORIES.map((c, i) => (
                <label key={c}>
                  <input type="radio" name="category" value={c} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="btn w-full peer-checked:bg-acc peer-checked:text-acc-on">{CATEGORY_LABEL[c]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="t-label">Titel</span>
            <input name="title" className="field" maxLength={80} placeholder="z. B. Oberkörper, Radtour, Spinning" required />
          </label>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="px-3 py-2 text-[14px]" style={{ border: "1.5px solid var(--color-bad)", color: "var(--color-bad)" }}>
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Wird angelegt ..." : "Anlegen"}
      </button>
    </form>
  );
}
