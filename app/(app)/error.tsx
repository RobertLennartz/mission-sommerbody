"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Error page inside the normal frame (taken over from One and Done).
 * "Neu laden" must refetch server data (router.refresh); reset() alone only
 * re-renders the UI and runs into the same error.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-[640px]">
      <p className="t-label text-mute">Da ist etwas schiefgegangen</p>
      <h1 className="t-head mt-2 text-[30px]">Die Seite lässt sich gerade nicht laden</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-mute">
        Meist ist das ein kurzer Aussetzer der Datenbank, beim zweiten Versuch klappt es.
      </p>
      {error.digest ? <p className="t-num mt-4 text-[13px] text-mute">Fehlercode: {error.digest}</p> : null}
      {process.env.NODE_ENV === "development" ? (
        <pre
          className="t-num mt-5 overflow-x-auto px-3 py-3 text-[12px]"
          style={{ background: "var(--color-paper)", border: "1px solid var(--color-line)" }}
        >
          {error.message}
        </pre>
      ) : null}
      <button
        type="button"
        className="btn btn-primary mt-6"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        {pending ? "Wird geladen ..." : "Neu laden"}
      </button>
    </div>
  );
}
