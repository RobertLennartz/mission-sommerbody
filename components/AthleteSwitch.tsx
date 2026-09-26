"use client";

import { useTransition } from "react";
import { switchAthlete } from "@/app/actions/athlete";

export function AthleteSwitch({
  athletes,
  selected,
}: {
  athletes: { slug: string; name: string }[];
  selected: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="seg" role="group" aria-label="Wer trägt ein" aria-busy={pending}>
      {athletes.map((a) => (
        <button
          key={a.slug}
          type="button"
          aria-pressed={a.slug === selected}
          disabled={pending}
          onClick={() => {
            if (a.slug !== selected) startTransition(() => switchAthlete(a.slug));
          }}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}
