"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { quickLogSession } from "@/app/actions/training";
import { CATEGORY_COLOR, QUICK_ACTIVITIES } from "@/lib/categories";

/** "Was habt ihr heute gemacht?": one tap logs a done training, several per day are fine. */
export function QuickLog({ athleteId, date, partnerName }: { athleteId: string; date: string; partnerName: string | null }) {
  const [both, setBoth] = useState(false);
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
            onClick={() => startTransition(() => quickLogSession(athleteId, date, q.category, q.activity, both))}
          >
            {q.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {partnerName ? (
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={both} onChange={(e) => setBoth(e.target.checked)} />
            Zusammen mit {partnerName}
          </label>
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
