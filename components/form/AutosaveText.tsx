"use client";

import { useId } from "react";
import type { SaveResult } from "@/lib/save-result";
import { SaveStatusText } from "./SaveStatusText";
import { useAutosave } from "./useAutosave";

/** Free text (single or multi line) with autosave. */
export function AutosaveText({
  label,
  initial,
  save,
  max,
  draftKey,
  placeholder,
  multiline = false,
  rows = 4,
  hideLabel = false,
}: {
  label: string;
  initial: string;
  save: (value: string) => Promise<SaveResult>;
  max: number;
  draftKey?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  hideLabel?: boolean;
}) {
  const id = useId();
  const validate = (raw: string) => (raw.trim().length > max ? `Höchstens ${max} Zeichen.` : null);
  const auto = useAutosave({ id, initial, save, validate, draftKey, debounceMs: 1200 });

  const common = {
    id,
    className: "field",
    placeholder,
    value: auto.value,
    "aria-invalid": auto.status === "invalid" || undefined,
    onBlur: () => void auto.flush(),
  };

  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className={`t-label ${hideLabel ? "sr-only" : ""}`}>{label}</span>
      {multiline ? (
        <textarea {...common} rows={rows} onChange={(e) => auto.change(e.target.value)} style={{ resize: "vertical" }} />
      ) : (
        <input {...common} autoComplete="off" onChange={(e) => auto.change(e.target.value)} />
      )}
      <SaveStatusText status={auto.status} savedAt={auto.savedAt} error={auto.error} />
    </label>
  );
}
