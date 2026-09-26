/**
 * Jackson/Pollock 7-site skinfold formula for men, converted with Siri.
 *
 *   body_density = 1.112 - 0.00043499*S + 0.00000055*S^2 - 0.00028826*age
 *   body_fat_pct = 495 / body_density - 450
 *
 * S is the sum of the seven sites in mm. Each site may have up to three
 * readings; the mean is used.
 */

export const SKINFOLD_SITES = [
  "chest",
  "midaxillary",
  "triceps",
  "subscapular",
  "abdominal",
  "suprailiac",
  "thigh",
] as const;

export type SkinfoldSite = (typeof SKINFOLD_SITES)[number];

export type SkinfoldReadings = Partial<Record<SkinfoldSite, number[]>>;

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function bodyDensity(sumMm: number, age: number): number {
  return 1.112 - 0.00043499 * sumMm + 0.00000055 * sumMm ** 2 - 0.00028826 * age;
}

export function siriBodyFatPct(density: number): number {
  return 495 / density - 450;
}

/** Age on the measuring day, from the birth year only (may be one year too high). */
export function ageFromBirthYear(birthYear: number, measuredOn: string): number {
  return Number(measuredOn.slice(0, 4)) - birthYear;
}

export type BodyComposition = {
  siteMeans: Partial<Record<SkinfoldSite, number>>;
  sumMm: number | null;
  density: number | null;
  bodyFatPct: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  /** German labels of what is missing for a complete result. */
  missing: string[];
};

export function computeBodyComposition(input: {
  readings: SkinfoldReadings;
  birthYear: number | null;
  measuredOn: string;
  weightKg: number | null;
}): BodyComposition {
  const siteMeans: Partial<Record<SkinfoldSite, number>> = {};
  const missing: string[] = [];

  for (const site of SKINFOLD_SITES) {
    const m = mean(input.readings[site] ?? []);
    if (m === null) missing.push(`Hautfalte ${SITE_LABEL[site]}`);
    else siteMeans[site] = m;
  }
  if (input.birthYear === null) missing.push("Geburtsjahr");

  const complete = Object.keys(siteMeans).length === SKINFOLD_SITES.length;
  const sumMm = complete ? Object.values(siteMeans).reduce((a, b) => a + b, 0) : null;

  let density: number | null = null;
  let bodyFatPct: number | null = null;
  if (sumMm !== null && input.birthYear !== null) {
    density = bodyDensity(sumMm, ageFromBirthYear(input.birthYear, input.measuredOn));
    bodyFatPct = siriBodyFatPct(density);
  }

  let fatMassKg: number | null = null;
  let leanMassKg: number | null = null;
  if (bodyFatPct !== null) {
    if (input.weightKg === null) {
      missing.push("Gewicht");
    } else {
      fatMassKg = (input.weightKg * bodyFatPct) / 100;
      leanMassKg = input.weightKg - fatMassKg;
    }
  }

  return { siteMeans, sumMm, density, bodyFatPct, fatMassKg, leanMassKg, missing };
}

export const SITE_LABEL: Record<SkinfoldSite, string> = {
  chest: "Brust",
  midaxillary: "Mittlere Achsellinie",
  triceps: "Trizeps",
  subscapular: "Schulterblatt",
  abdominal: "Bauch",
  suprailiac: "Hüftknochen",
  thigh: "Oberschenkel",
};

/** Short measuring hints, right side of the body, after the ACSM description. */
export const SITE_HINT: Record<SkinfoldSite, string> = {
  chest: "Diagonale Falte, Mitte zwischen vorderer Achselfalte und Brustwarze.",
  midaxillary: "Senkrechte Falte unter der Achselmitte, auf Höhe der Brustbeinspitze.",
  triceps: "Senkrechte Falte hinten am Oberarm, Mitte zwischen Schulterhöhe und Ellenbogen. Arm hängt locker.",
  subscapular: "Schräge Falte (45 Grad) 1 bis 2 cm unter der unteren Schulterblattspitze.",
  abdominal: "Senkrechte Falte 2 cm rechts neben dem Bauchnabel.",
  suprailiac: "Schräge Falte direkt über dem Beckenkamm, in der vorderen Achsellinie.",
  thigh: "Senkrechte Falte vorne am Oberschenkel, Mitte zwischen Leiste und Kniescheibe. Bein entlastet.",
};
