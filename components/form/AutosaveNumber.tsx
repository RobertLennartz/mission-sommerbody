"use client";

import { useId } from "react";
import { parseField, type NumberField } from "@/lib/fields";
import type { SaveResult } from "@/lib/save-result";
import { SaveStatusText } from "./SaveStatusText";
import { useAutosave } from "./useAutosave";

/** Number field with German input rules, instant validation and autosave. */
export function AutosaveNumber({
  label,
  field,
  initial,
  save,
  draftKey,
  placeholder,
  onValue,
  large = false,
  hideLabel = false,
}: {
  label: string;
  field: NumberField;
  initial: string;
  save: (value: string) => Promise<SaveResult>;
  draftKey?: string;
  placeholder?: string;
  /** Parsed value on every valid change, for live progress bars. */
  onValue?: (value: number | null) => void;
  large?: boolean;
  hideLabel?: boolean;
}) {
  const id = useId();
  const validate = (raw: string) => {
    const r = parseField(raw, field);
    return r.ok ? null : r.error;
  };
  const auto = useAutosave({ id, initial, save, validate, draftKey });

  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className={`t-label ${hideLabel ? "sr-only" : ""}`}>
        {label}
        {field.unit ? <span className="text-mute"> ({field.unit})</span> : null}
      </span>
      <input
        id={id}
        className={`field t-num ${large ? "text-[28px] font-medium" : ""}`}
        style={large ? { minHeight: 60 } : undefined}
        inputMode={field.kind === "int" ? "numeric" : "decimal"}
        enterKeyHint="done"
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
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <SaveStatusText status={auto.status} savedAt={auto.savedAt} error={auto.error} />
    </label>
  );
}
