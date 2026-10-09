"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { quickLogRecovery, quickLogSession, quickLogTemplate } from "@/app/actions/training";
import { CATEGORY_COLOR, QUICK_ACTIVITIES, RECOVERY_OPTIONS } from "@/lib/categories";

/** "Was habt ihr heute gemacht?": one tap logs a done training, several per day are fine. */
export function QuickLog({
  athleteId,
  date,
  others,
  strengthTemplates,
}: {
  athleteId: string;
  date: string;
  /** The other people, to log a session together with them. */
  others: { id: string; name: string }[];
  strengthTemplates: { id: string; name: string; count: number }[];
}) {
  const [withIds, setWithIds] = useState<string[]>([]);
  const [open, setOpen] = useState<"strength" | "recovery" | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy={pending}>
      <span className="t-label">Was habt ihr gemacht? Antippen, danach Details eintragen.</span>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACTIVITIES.map((q) => (
          <button
            key={q.label}
            type="button"
            className="btn min-h-[52px] px-1"
            style={{ borderLeft: `6px solid ${CATEGORY_COLOR[q.category]}` }}
            disabled={pending}
            aria-expanded={q.category === "strength" || q.category === "recovery" ? open === q.category : undefined}
            onClick={() => {
              if (q.category === "recovery") setOpen((o) => (o === "recovery" ? null : "recovery"));
              else if (q.category === "strength" && strengthTemplates.length > 0) setOpen((o) => (o === "strength" ? null : "strength"));
              else startTransition(() => quickLogSession(athleteId, date, q.category, q.activity, withIds));
            }}
          >
            {q.label}
          </button>
        ))}
      </div>
      {open === "recovery" ? (
        <div className="flex flex-col gap-2 p-3" style={{ background: "var(--color-paper)", borderLeft: `6px solid ${CATEGORY_COLOR.recovery}` }}>
          <span className="t-label">Was war dabei? Mehrere möglich.</span>
          <div className="grid grid-cols-3 gap-2">
            {RECOVERY_OPTIONS.map((item) => {
              const on = recovery.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={on}
                  className="btn px-1"
                  style={on ? { background: "var(--color-acc)", color: "var(--color-acc-on)" } : undefined}
                  onClick={() => setRecovery((r) => (on ? r.filter((x) => x !== item) : [...r, item]))}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || recovery.length === 0}
            onClick={() =>
              startTransition(async () => {
                await quickLogRecovery(athleteId, date, recovery, withIds);
                setRecovery([]);
                setOpen(null);
              })
            }
          >
            Eintragen
          </button>
        </div>
      ) : null}
      {open === "strength" ? (
        <div className="flex flex-col gap-2 p-3" style={{ background: "var(--color-paper)", borderLeft: `6px solid ${CATEGORY_COLOR.strength}` }}>
          <span className="t-label">Welches Krafttraining?</span>
          <div className="grid grid-cols-2 gap-2">
            {strengthTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn flex-col gap-0 px-2 py-2"
                disabled={pending}
                onClick={() => startTransition(() => quickLogTemplate(athleteId, date, t.id, withIds))}
              >
                <span>{t.name}</span>
                <span className="t-label t-label-sm text-mute normal-case">{t.count} Übungen</span>
              </button>
            ))}
            <button
              type="button"
              className="btn px-2"
              disabled={pending}
              onClick={() => startTransition(() => quickLogSession(athleteId, date, "strength", null, withIds))}
            >
              Frei, ohne Vorlage
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {others.length ? (
          <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <legend className="sr-only">Zusammen mit</legend>
            {others.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-ink)]"
                  checked={withIds.includes(o.id)}
                  onChange={(e) => setWithIds((ids) => (e.target.checked ? [...ids, o.id] : ids.filter((x) => x !== o.id)))}
                />
                Mit {o.name}
              </label>
            ))}
          </fieldset>
        ) : (
          <span />
        )}
        <Link href={`/planung/neu?datum=${date}&status=erledigt&zurueck=${encodeURIComponent(`/heute?datum=${date}`)}`} className="t-label underline">
          Anderes oder aus Vorlage
        </Link>
      </div>
      {pending ? <span className="t-label text-mute">Wird angelegt ...</span> : null}
    </div>
  );
}
