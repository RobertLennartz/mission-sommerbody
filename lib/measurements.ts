import { FIELDS, type NumberField } from "@/lib/fields";
import type { CheckupRow, CheckupType } from "@/lib/supabase/database.types";

export type CircumferenceKey = keyof Pick<
  CheckupRow,
  | "neck_cm"
  | "chest_cm"
  | "waist_cm"
  | "hips_cm"
  | "upper_arm_left_cm"
  | "upper_arm_right_cm"
  | "forearm_cm"
  | "thigh_left_cm"
  | "thigh_right_cm"
  | "calf_left_cm"
  | "calf_right_cm"
>;

/** Same place, same way at start and end, otherwise the difference means nothing. */
export const CIRCUMFERENCES: { key: CircumferenceKey; label: string; hint: string; field: NumberField }[] = [
  { key: "neck_cm", label: "Hals", hint: "Direkt unter dem Kehlkopf, Band leicht nach vorne unten geneigt.", field: FIELDS.neck },
  { key: "chest_cm", label: "Brust", hint: "Auf Höhe der Brustwarzen, nach normalem Ausatmen.", field: FIELDS.chest },
  { key: "waist_cm", label: "Bauch", hint: "Auf Bauchnabelhöhe, entspannt, nach normalem Ausatmen.", field: FIELDS.waist },
  { key: "hips_cm", label: "Hüfte", hint: "Breiteste Stelle des Gesäßes, Füße zusammen.", field: FIELDS.hips },
  { key: "upper_arm_left_cm", label: "Oberarm links", hint: "Mitte zwischen Schulter und Ellenbogen, Arm hängt entspannt.", field: FIELDS.upperArm },
  { key: "upper_arm_right_cm", label: "Oberarm rechts", hint: "Mitte zwischen Schulter und Ellenbogen, Arm hängt entspannt.", field: FIELDS.upperArm },
  { key: "forearm_cm", label: "Unterarm (optional)", hint: "Dickste Stelle, Arm entspannt.", field: FIELDS.forearm },
  { key: "thigh_left_cm", label: "Oberschenkel links", hint: "Mitte zwischen Leiste und Kniescheibe, Gewicht auf beiden Beinen.", field: FIELDS.thigh },
  { key: "thigh_right_cm", label: "Oberschenkel rechts", hint: "Mitte zwischen Leiste und Kniescheibe, Gewicht auf beiden Beinen.", field: FIELDS.thigh },
  { key: "calf_left_cm", label: "Wade links", hint: "Dickste Stelle, stehend.", field: FIELDS.calf },
  { key: "calf_right_cm", label: "Wade rechts", hint: "Dickste Stelle, stehend.", field: FIELDS.calf },
];

export const CHECKUP_TYPE_LABEL: Record<CheckupType, string> = { start: "Start", interim: "Zwischen", end: "Ende" };
export const CHECKUP_TYPES: CheckupType[] = ["start", "interim", "end"];
