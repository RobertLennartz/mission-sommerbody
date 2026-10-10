// Written by hand and checked column by column against the generated types
// (Supabase generate_typescript_types, 26.09.2026). Kept by hand because the
// generator types CHECK-constrained text columns as plain string, while the
// unions below document the allowed values. Update both after a migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Base = { id: string; created_at: string; updated_at: string };
type Auto = "id" | "created_at" | "updated_at";

type Table<Row, Optional extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Auto | Optional> & Partial<Pick<Row, Extract<Auto | Optional, keyof Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type AthleteRow = Base & {
  slug: string;
  name: string;
  sort_order: number;
  birth_year: number | null;
  height_cm: number | null;
  protein_target_g_per_kg: number;
  steps_target: number;
  training_target_per_week: number;
  bodyfat_formula: BodyfatFormula | null;
};

export type BodyfatFormula = "jp7_male" | "jp7_female";

export type CheckupType = "start" | "interim" | "end";

export type CheckupRow = Base & {
  athlete_id: string;
  type: CheckupType;
  date: string;
  weight_kg: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  upper_arm_left_cm: number | null;
  upper_arm_right_cm: number | null;
  forearm_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  calf_left_cm: number | null;
  calf_right_cm: number | null;
  notes: string | null;
};

export type CheckupSkinfoldRow = {
  checkup_id: string;
  site: string;
  reading_no: number;
  value_mm: number;
  created_at: string;
  updated_at: string;
};

export type DailyLogRow = Base & {
  athlete_id: string;
  date: string;
  steps: number | null;
  weight_kg: number | null;
  sleep_hours: number | null;
  energy: number | null;
  notes: string | null;
  protein_total_g: number | null;
  kcal_total: number | null;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealRow = Base & {
  athlete_id: string;
  date: string;
  meal_type: MealType;
  description: string;
  protein_g: number | null;
  kcal: number | null;
};

export type ExerciseRow = Base & { name: string };

export type Category = "strength" | "cardio" | "hiit" | "recovery";
export type SessionStatus = "planned" | "done" | "skipped";

export type PlanTemplateRow = Base & {
  name: string;
  category: Category;
  default_duration_min: number | null;
  activity: string | null;
  default_distance_km: number | null;
  notes: string | null;
};

export type PlanTemplateExerciseRow = Base & {
  template_id: string;
  position: number;
  exercise_id: string;
  target_sets: number | null;
  target_reps: string | null;
};

export type WeekTemplateRow = Base & { name: string };

export type WeekTemplateItemRow = Base & {
  week_template_id: string;
  weekday: number;
  slot: number;
  plan_template_id: string;
};

export type SessionRow = Base & {
  athlete_id: string;
  date: string;
  slot: number;
  category: Category;
  title: string;
  status: SessionStatus;
  duration_sec: number | null;
  rpe: number | null;
  activity: string | null;
  distance_km: number | null;
  avg_hr: number | null;
  notes: string | null;
  template_id: string | null;
  pair_id: string | null;
  /** Training clock: set by "Training starten", cleared by "Abbrechen". */
  started_at: string | null;
  ended_at: string | null;
};

export type SessionExerciseRow = Base & {
  session_id: string;
  position: number;
  exercise_id: string;
  target_sets: number | null;
  target_reps: string | null;
  notes: string | null;
};

export type SessionSetRow = Base & {
  session_exercise_id: string;
  set_no: number;
  reps: number | null;
  weight_kg: number | null;
};

export type LoginAttemptRow = { id: number; ip_hash: string; attempted_at: string };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      athletes: Table<
        AthleteRow,
        | "sort_order"
        | "birth_year"
        | "height_cm"
        | "protein_target_g_per_kg"
        | "steps_target"
        | "training_target_per_week"
        | "bodyfat_formula"
      >;
      checkups: Table<CheckupRow, Exclude<keyof CheckupRow, "athlete_id" | "type" | "date" | Auto>>;
      checkup_skinfolds: {
        Row: CheckupSkinfoldRow;
        Insert: Omit<CheckupSkinfoldRow, "created_at" | "updated_at">;
        Update: Partial<CheckupSkinfoldRow>;
        Relationships: [];
      };
      daily_logs: Table<DailyLogRow, "steps" | "weight_kg" | "sleep_hours" | "energy" | "notes" | "protein_total_g" | "kcal_total">;
      meals: Table<MealRow, "description" | "protein_g" | "kcal">;
      exercises: Table<ExerciseRow>;
      plan_templates: Table<
        PlanTemplateRow,
        "default_duration_min" | "activity" | "default_distance_km" | "notes"
      >;
      plan_template_exercises: Table<PlanTemplateExerciseRow, "target_sets" | "target_reps">;
      week_templates: Table<WeekTemplateRow>;
      week_template_items: Table<WeekTemplateItemRow, "slot">;
      sessions: Table<
        SessionRow,
        | "slot"
        | "status"
        | "duration_sec"
        | "rpe"
        | "activity"
        | "distance_km"
        | "avg_hr"
        | "notes"
        | "template_id"
        | "pair_id"
        | "started_at"
        | "ended_at"
      >;
      session_exercises: Table<SessionExerciseRow, "target_sets" | "target_reps" | "notes">;
      session_sets: Table<SessionSetRow, "reps" | "weight_kg">;
      login_attempts: {
        Row: LoginAttemptRow;
        Insert: { ip_hash: string; attempted_at?: string };
        Update: Partial<LoginAttemptRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_sessions: {
        Args: {
          p_athletes: string[];
          p_date: string;
          p_status: SessionStatus;
          p_template: string | null;
          p_category: Category | null;
          p_title: string | null;
        };
        Returns: string[];
      };
      fill_week: {
        Args: {
          p_athletes: string[];
          p_week_template: string;
          p_monday: string;
          p_from: string;
          p_to: string;
          p_replace: boolean;
        };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
