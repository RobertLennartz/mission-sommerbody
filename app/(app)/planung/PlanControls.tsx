"use client";

import { useActionState, useTransition } from "react";
import { deleteSession, fillWeek, moveSession, reorderSession, type FillState } from "@/app/actions/training";
import { addDays, formatDayShort } from "@/lib/dates";

export function SessionControls({
  id,
  date,
  monday,
  partnerName,
  isFirst,
  isLast,
}: {
  id: string;
  date: string;
  monday: string;
  /** Set when this is a joint session: name of the other person. */
  partnerName: string | null;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const askPair = (verb: string) =>
    partnerName ? confirm(`Gemeinsame Einheit: auch bei ${partnerName} ${verb}?\n\nOK = beide, Abbrechen = nur diese.`) : false;

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-1.5" aria-busy={pending}>
      <label className="flex min-w-0 items-center">
        <span className="sr-only">Tag ändern</span>
        <select
          className="field py-1 text-[14px]"
          style={{ minHeight: 36 }}
          value={date}
          disabled={pending}
          onChange={(e) => {
            const target = e.target.value;
            const both = askPair("verschieben");
            startTransition(() => moveSession(id, target, both));
          }}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {formatDayShort(d)}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn-sm" disabled={pending || isFirst} aria-label="Nach oben" style={{ paddingInline: 8 }} onClick={() => startTransition(() => reorderSession(id, "up"))}>
        Hoch
      </button>
      <button type="button" className="btn btn-sm" disabled={pending || isLast} aria-label="Nach unten" style={{ paddingInline: 8 }} onClick={() => startTransition(() => reorderSession(id, "down"))}>
        Runter
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        style={{ paddingInline: 8 }}
        disabled={pending}
        onClick={() => {
          if (!confirm("Einheit löschen?")) return;
          const both = askPair("löschen");
          startTransition(() => deleteSession(id, both));
        }}
      >
        Löschen
      </button>
    </div>
  );
}

export function FillWeekForm({
  monday,
  weekTemplates,
  athletes,
  defaultWho,
}: {
  monday: string;
  weekTemplates: { id: string; name: string; summary: string }[];
  athletes: { id: string; name: string }[];
  defaultWho: string;
}) {
  const [state, action, pending] = useActionState<FillState, FormData>(fillWeek, {});
  if (weekTemplates.length === 0) return null;
  return (
    <form action={action} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="monday" value={monday} />
      <label className="flex flex-col gap-1.5">
        <span className="t-label">Wochenvorlage</span>
        <select name="weekTemplate" className="field" defaultValue={weekTemplates[0].id}>
          {weekTemplates.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}: {w.summary}
            </option>
          ))}
        </select>
      </label>
      <WhoChoice athletes={athletes} defaultWho={defaultWho} />
      <label className="flex items-center gap-2 text-[15px]">
        <input type="checkbox" name="replace" className="h-5 w-5 accent-[var(--color-ink)]" />
        Geplante (noch nicht erledigte) Einheiten dieser Woche vorher löschen
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Wird angelegt ..." : "Woche füllen"}
      </button>
      {state.error ? <p className="text-[14px] text-bad" role="alert">{state.error}</p> : null}
      {state.message ? <p className="text-[14px] text-good" role="status">{state.message}</p> : null}
    </form>
  );
}

export function WhoChoice({ athletes, defaultWho }: { athletes: { id: string; name: string }[]; defaultWho: string }) {
  const options = [...athletes.map((a) => ({ value: a.id, label: a.name })), { value: "both", label: "Beide" }];
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="t-label mb-1.5">Für wen</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input type="radio" name="who" value={o.value} defaultChecked={o.value === defaultWho} className="peer sr-only" />
            <span className="btn w-full peer-checked:bg-acc peer-checked:text-acc-on peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-acc">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
