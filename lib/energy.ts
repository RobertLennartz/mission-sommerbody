/**
 * Rough energy estimates (Robert, 09.10.2026: "grob schätzen, was wir
 * verbraucht und eingespart haben"). Every number here is an estimate and
 * the UI says so.
 *
 * - Basal metabolic rate: Mifflin-St Jeor (1990).
 *     men   10*kg + 6.25*cm - 5*age + 5
 *     women 10*kg + 6.25*cm - 5*age - 161
 * - Day: BMR * 1.1 (about 10 % for digestion) + walking from steps + training.
 * - Training: MET values from the 2024 Adult Compendium of Physical Activities.
 *   Only the part above rest (MET - 1) enters the balance, the resting part is
 *   already in the BMR. Running with km: ACSM running equation, net about
 *   1 kcal per kg and km.
 * - Easy movement ("locker", 10.10.2026): bike 3.5 MET (Compendium 01210,
 *   stationary 25-30 W, very light to light). Walking like the steps, net
 *   0.5 kcal per kg and km; without km 4.5 km/h is assumed (Compendium 17352
 *   puts 4.0 to 4.7 km/h at 3.5 MET).
 * - Steps: ACSM walking equation, net about 0.5 kcal per kg and km; stride
 *   from height (0.415 x height). Run km and walk km are subtracted so they
 *   are not counted twice (the phone counts treadmill steps too).
 * - 1 kg body fat is about 7,700 kcal (rule of thumb).
 */

import type { Category } from "@/lib/supabase/database.types";

export type Sex = "male" | "female";

export const KCAL_PER_KG_FAT = 7700;
const DIGESTION_FACTOR = 1.1;
const WALK_NET_KCAL_PER_KG_KM = 0.5;
const RUN_NET_KCAL_PER_KG_KM = 1.0;
const WALK_ASSUMED_KMH = 4.5;

export function bmrMifflin(input: { weightKg: number; heightCm: number; age: number; sex: Sex }): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return base + (input.sex === "male" ? 5 : -161);
}

type Kind = "strength" | "running" | "spinning" | "swimming" | "hiit" | "cardio" | "recovery" | "walking" | "light";

/** MET (gross) and default minutes when no duration was entered. */
const PROFILE: Record<Kind, { met: number; minutes: number; label: string }> = {
  strength: { met: 3.5, minutes: 60, label: "Kraft, 3,5 MET" }, // Compendium 02054
  running: { met: 8.3, minutes: 30, label: "Laufen" }, // ACSM with km, else assumed ~8 km/h
  spinning: { met: 9.0, minutes: 45, label: "Spinning, 9,0 MET" }, // Compendium 01270
  swimming: { met: 5.8, minutes: 45, label: "Schwimmen, 5,8 MET" }, // Compendium 18240
  hiit: { met: 7.0, minutes: 45, label: "HIIT, 7,0 MET" }, // Compendium 02210
  cardio: { met: 7.0, minutes: 45, label: "Ausdauer, 7,0 MET" },
  recovery: { met: 1.0, minutes: 0, label: "Recovery" },
  walking: { met: 3.5, minutes: 20, label: "Gehen" }, // net per km, see walkingKm
  light: { met: 3.5, minutes: 20, label: "locker, 3,5 MET" }, // Compendium 01210
};

export function sessionKind(s: { category: Category; activity: string | null; title: string }): Kind {
  if (s.category === "strength") return "strength";
  if (s.category === "recovery") return "recovery";
  if (s.category === "hiit") return "hiit";
  const text = `${s.activity ?? ""} ${s.title}`.toLowerCase();
  // "Laufband" in an easy session means walking on it, not running.
  if (s.category === "light") return /geh|walk|spazier|lauf/.test(text) ? "walking" : "light";
  if (/lauf|jogg|run/.test(text)) return "running";
  if (/spinning|rad|bike|cycl/.test(text)) return "spinning";
  if (/schwimm|swim/.test(text)) return "swimming";
  return "cardio";
}

export type SessionEnergy = {
  /** What the session cost in total ("wie viel hast du verbraucht"). */
  grossKcal: number;
  /** Only the part above rest; this goes into the daily balance. */
  netKcal: number;
  minutes: number;
  assumedDuration: boolean;
  basis: string;
};

export function sessionEnergy(
  s: { category: Category; activity: string | null; title: string; duration_sec: number | null; distance_km: number | null },
  weightKg: number,
): SessionEnergy {
  const kind = sessionKind(s);
  const profile = PROFILE[kind];
  if (kind === "recovery") return { grossKcal: 0, netKcal: 0, minutes: 0, assumedDuration: false, basis: profile.label };

  const km = s.distance_km && s.distance_km > 0 ? s.distance_km : null;
  if (kind === "walking") {
    const minutes = s.duration_sec ? s.duration_sec / 60 : km !== null ? (km / WALK_ASSUMED_KMH) * 60 : profile.minutes;
    const walked = walkingKm(s);
    const net = WALK_NET_KCAL_PER_KG_KM * weightKg * walked;
    return {
      grossKcal: net + (weightKg * minutes) / 60,
      netKcal: net,
      minutes,
      assumedDuration: !s.duration_sec && km === null,
      basis: km !== null ? `Gehen, ${km.toLocaleString("de-DE")} km (ACSM)` : "Gehen, 4,5 km/h angenommen (ACSM)",
    };
  }
  if (kind === "running" && km !== null) {
    const net = RUN_NET_KCAL_PER_KG_KM * weightKg * km;
    // Resting share for the time spent; without a duration assume 6 min per km.
    const minutes = s.duration_sec ? s.duration_sec / 60 : km * 6;
    const rest = (weightKg * minutes) / 60;
    return {
      grossKcal: net + rest,
      netKcal: net,
      minutes,
      assumedDuration: !s.duration_sec,
      basis: `Laufen, ${km.toLocaleString("de-DE")} km (ACSM)`,
    };
  }

  const assumed = !s.duration_sec;
  const minutes = s.duration_sec ? s.duration_sec / 60 : profile.minutes;
  const hours = minutes / 60;
  const met = profile.met;
  return {
    grossKcal: met * weightKg * hours,
    netKcal: (met - 1) * weightKg * hours,
    minutes,
    assumedDuration: assumed,
    basis: kind === "running" ? "Laufen ohne km, angenommen 8,3 MET" : profile.label,
  };
}

type KmSession = { category: Category; activity: string | null; title: string; duration_sec: number | null; distance_km: number | null };

/** km of a walking session: entered, or from the duration at 4.5 km/h. */
function walkingKm(s: KmSession): number {
  if (s.distance_km && s.distance_km > 0) return s.distance_km;
  const minutes = s.duration_sec ? s.duration_sec / 60 : PROFILE.walking.minutes;
  return (minutes / 60) * WALK_ASSUMED_KMH;
}

/** km the done sessions already count and the steps would count again: runs with km, walks. */
export function sessionStepKm(sessions: (KmSession & { status: string })[]): number {
  return sessions
    .filter((s) => s.status === "done")
    .reduce((sum, s) => {
      const kind = sessionKind(s);
      if (kind === "running") return sum + (s.distance_km ?? 0);
      if (kind === "walking") return sum + walkingKm(s);
      return sum;
    }, 0);
}

/** Walking from steps, net of rest; run and walk km are taken out so they do not count twice. */
export function stepsKcal(steps: number, weightKg: number, heightCm: number | null, runKm = 0): number {
  const strideM = heightCm ? heightCm * 0.00415 : 0.75;
  const km = Math.max(0, (steps * strideM) / 1000 - runKm);
  return WALK_NET_KCAL_PER_KG_KM * weightKg * km;
}

export type DayEnergy = {
  bmr: number;
  digestion: number;
  steps: number;
  training: number;
  /** Estimated total expenditure for the day. */
  total: number;
  /** Eaten, if recorded. */
  intake: number | null;
  /** Expenditure minus intake: positive means saved (deficit). */
  balance: number | null;
};

export function dayEnergy(input: {
  bmr: number;
  weightKg: number;
  heightCm: number | null;
  steps: number | null;
  sessions: { category: Category; activity: string | null; title: string; duration_sec: number | null; distance_km: number | null; status: string }[];
  intakeKcal: number | null;
}): DayEnergy {
  const done = input.sessions.filter((s) => s.status === "done");
  const training = done.reduce((sum, s) => sum + sessionEnergy(s, input.weightKg).netKcal, 0);
  const steps = input.steps ? stepsKcal(input.steps, input.weightKg, input.heightCm, sessionStepKm(done)) : 0;
  const digestion = input.bmr * (DIGESTION_FACTOR - 1);
  const total = input.bmr + digestion + steps + training;
  return {
    bmr: input.bmr,
    digestion,
    steps,
    training,
    total,
    intake: input.intakeKcal,
    balance: input.intakeKcal === null ? null : total - input.intakeKcal,
  };
}

export function sexFromFormula(formula: "jp7_male" | "jp7_female" | null): Sex | null {
  return formula === "jp7_male" ? "male" : formula === "jp7_female" ? "female" : null;
}

export type EnergyDay = { date: string; energy: DayEnergy | null; missing: string[] };

/**
 * Energy per day for one person from already loaded rows. Weight per day is
 * the latest checkup or morning weight on or before that day.
 */
export function energyPerDay(input: {
  dates: string[];
  athlete: { birth_year: number | null; height_cm: number | null; bodyfat_formula: "jp7_male" | "jp7_female" | null };
  weights: { date: string; weightKg: number }[];
  logs: { date: string; steps: number | null; kcal_total: number | null }[];
  meals: { date: string; kcal: number | null }[];
  sessions: { date: string; category: Category; activity: string | null; title: string; duration_sec: number | null; distance_km: number | null; status: string }[];
}): EnergyDay[] {
  const sex = sexFromFormula(input.athlete.bodyfat_formula);
  const sorted = [...input.weights].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return input.dates.map((date) => {
    const weight = [...sorted].reverse().find((w) => w.date <= date)?.weightKg ?? null;
    const missing: string[] = [];
    if (weight === null) missing.push("Gewicht");
    if (input.athlete.height_cm === null) missing.push("Größe");
    if (input.athlete.birth_year === null) missing.push("Geburtsjahr");
    if (sex === null) missing.push("Formel Männer/Frauen (Einstellungen)");
    if (missing.length) return { date, energy: null, missing };

    const log = input.logs.find((l) => l.date === date);
    const meals = input.meals.filter((m) => m.date === date);
    const mealKcal = meals.some((m) => m.kcal !== null) ? meals.reduce((s, m) => s + (m.kcal ?? 0), 0) : null;
    const intake = log?.kcal_total ?? mealKcal;
    const bmr = bmrMifflin({
      weightKg: weight!,
      heightCm: input.athlete.height_cm!,
      age: Number(date.slice(0, 4)) - input.athlete.birth_year!,
      sex: sex!,
    });
    return {
      date,
      missing,
      energy: dayEnergy({
        bmr,
        weightKg: weight!,
        heightCm: input.athlete.height_cm,
        steps: log?.steps ?? null,
        sessions: input.sessions.filter((s) => s.date === date),
        intakeKcal: intake,
      }),
    };
  });
}

/** Sum of the balance over days with recorded calories. */
export function totalSaved(days: EnergyDay[]): { kcal: number; days: number } {
  const counted = days.filter((d) => d.energy?.balance != null);
  return { kcal: counted.reduce((s, d) => s + d.energy!.balance!, 0), days: counted.length };
}

/** "≈ 12 g Fett" below one kilogram, "≈ 1,4 kg Fett" above (rule of thumb 7,700 kcal per kg). */
export function fatEquivalentLabel(kcal: number): string {
  const kg = kcal / KCAL_PER_KG_FAT;
  if (kg < 1) return `≈ ${Math.round(kg * 1000).toLocaleString("de-DE")} g Fett`;
  return `≈ ${kg.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg Fett`;
}
