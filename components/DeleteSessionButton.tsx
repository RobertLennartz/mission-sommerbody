"use client";

import { useTransition } from "react";
import { deleteSession } from "@/app/actions/training";

/** Delete with confirmation; for a joint session it asks whether the partner's goes too. */
export function DeleteSessionButton({
  id,
  title,
  partnerName,
  redirectTo,
}: {
  id: string;
  title: string;
  partnerName: string | null;
  redirectTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-danger shrink-0"
      disabled={pending}
      aria-label={`${title} löschen`}
      onClick={() => {
        if (!confirm(`"${title}" löschen? Eingetragene Sätze gehen verloren.`)) return;
        const both = partnerName
          ? confirm(`Gemeinsame Einheit: auch bei ${partnerName} löschen?\n\nOK = beide, Abbrechen = nur diese.`)
          : false;
        startTransition(() => deleteSession(id, both, redirectTo));
      }}
    >
      {pending ? "..." : "Löschen"}
    </button>
  );
}
