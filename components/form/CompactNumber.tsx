"use client";

import { useId } from "react";
import { parseField, type NumberField } from "@/lib/fields";
import type { SaveResult } from "@/lib/save-result";
import { useAutosave } from "./useAutosave";

/** Small autosaving number box for grids; the border color shows the save state. */
export function CompactNumber({
  label,
  field,
  initial,
  save,
  draftKey,
  onValue,
  placeholder,
}: {
  label: string;
  field: NumberField;
  initial: string;
  save: (value: string) => Promise<SaveResult>;
  draftKey?: string;
  onValue?: (value: number | null) => void;
  placeholder?: string;
}) {
  const id = useId();
  const auto = useAutosave({
    id,
    initial,
    save,
    draftKey,
    debounceMs: 600,
    validate: (raw) => {
      const r = parseField(raw, field);
      return r.ok ? null : r.error;
    },
  });
  const border =
    auto.status === "invalid" || auto.status === "error" ? "var(--color-bad)" : auto.status === "saved" ? "var(--color-good)" : "var(--color-ink)";
  return (
    <label className="flex min-w-0 flex-1 flex-col" title={auto.error ?? undefined}>
      <span className="sr-only">{label}</span>
      <input
        className="field t-num px-1 text-center"
        style={{ borderColor: border }}
        inputMode={field.kind === "int" ? "numeric" : "decimal"}
        autoComplete="off"
        placeholder={placeholder}
        value={auto.value}
        aria-invalid={auto.status === "invalid" || undefined}
        onChange={(e) => {
          auto.change(e.target.value);
          const r = parseField(e.target.value, field);
          if (r.ok) onValue?.(r.value);
        }}
        onBlur={() => void auto.flush()}
      />
      {auto.error ? <span className="t-label t-label-sm mt-1 text-bad">{auto.error}</span> : null}
    </label>
  );
}
