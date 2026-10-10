/**
 * Every numeric input in one place: type, plausible range, unit. Used by the
 * form (instant German error message) and again by the server before saving.
 * The ranges match the CHECK constraints in supabase/migrations/0001_schema.sql.
 */

import { formatDecimal, formatInt, parseDecimal, parseInteger } from "@/lib/numbers";

export type NumberField = {
  kind: "int" | "decimal";
  min: number;
  max: number;
  unit?: string;
  /** Decimal places kept when saving. */
  digits?: number;
};

export const FIELDS = {
  steps: { kind: "int", min: 0, max: 100_000 },
  weight: { kind: "decimal", min: 40, max: 200, unit: "kg", digits: 2 },
  sleep: { kind: "decimal", min: 0, max: 16, unit: "h", digits: 1 },
  protein: { kind: "decimal", min: 0, max: 300, unit: "g", digits: 1 },
  kcal: { kind: "int", min: 0, max: 5000, unit: "kcal" },
  proteinTotal: { kind: "decimal", min: 0, max: 500, unit: "g", digits: 1 },
  kcalTotal: { kind: "int", min: 0, max: 10_000, unit: "kcal" },
  skinfold: { kind: "decimal", min: 2, max: 60, unit: "mm", digits: 1 },
  duration: { kind: "int", min: 1, max: 600, unit: "min" },
  distance: { kind: "decimal", min: 0, max: 300, unit: "km", digits: 2 },
  heartRate: { kind: "int", min: 40, max: 220, unit: "bpm" },
  reps: { kind: "int", min: 0, max: 100 },
  setWeight: { kind: "decimal", min: 0, max: 500, unit: "kg", digits: 2 },
  birthYear: { kind: "int", min: 1930, max: 2012 },
  height: { kind: "decimal", min: 120, max: 230, unit: "cm", digits: 1 },
  proteinFactor: { kind: "decimal", min: 0.8, max: 3.5, unit: "g/kg", digits: 1 },
  stepsTarget: { kind: "int", min: 1000, max: 50_000 },
  weeklyTarget: { kind: "int", min: 0, max: 14 },
  neck: { kind: "decimal", min: 25, max: 60, unit: "cm", digits: 1 },
  chest: { kind: "decimal", min: 60, max: 180, unit: "cm", digits: 1 },
  waist: { kind: "decimal", min: 50, max: 180, unit: "cm", digits: 1 },
  hips: { kind: "decimal", min: 60, max: 180, unit: "cm", digits: 1 },
  upperArm: { kind: "decimal", min: 15, max: 60, unit: "cm", digits: 1 },
  forearm: { kind: "decimal", min: 15, max: 50, unit: "cm", digits: 1 },
  thigh: { kind: "decimal", min: 30, max: 100, unit: "cm", digits: 1 },
  calf: { kind: "decimal", min: 20, max: 70, unit: "cm", digits: 1 },
} satisfies Record<string, NumberField>;

export type FieldName = keyof typeof FIELDS;

export type ParseResult = { ok: true; value: number | null } | { ok: false; error: string };

function fmt(n: number, field: NumberField): string {
  return field.kind === "int" ? formatInt(n) : formatDecimal(n, field.digits ?? 1);
}

/** Empty is allowed (clears the value); anything else must be a number in range. */
export function parseField(raw: string, field: NumberField): ParseResult {
  const value = field.kind === "int" ? parseInteger(raw) : parseDecimal(raw);
  if (value === null) return { ok: true, value: null };
  if (Number.isNaN(value)) {
    return {
      ok: false,
      error: field.kind === "int" ? "Bitte eine ganze Zahl eingeben." : "Bitte eine Zahl eingeben, zum Beispiel 82,5.",
    };
  }
  if (value < field.min || value > field.max) {
    const unit = field.unit ? ` ${field.unit}` : "";
    return { ok: false, error: `Bitte eine Zahl zwischen ${fmt(field.min, field)} und ${fmt(field.max, field)}${unit} eingeben.` };
  }
  const factor = 10 ** (field.digits ?? 0);
  return { ok: true, value: field.kind === "int" ? value : Math.round(value * factor) / factor };
}

export const TEXT_MAX = { notes: 4000, mealDescription: 500, title: 80, activity: 60, exerciseName: 80, exerciseNote: 300, templateName: 60, reps: 20 } as const;

export function parseText(raw: string, max: number): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.replace(/\r\n/g, "\n").trim();
  if (value.length > max) return { ok: false, error: `Höchstens ${formatInt(max)} Zeichen.` };
  return { ok: true, value: value === "" ? null : value };
}
