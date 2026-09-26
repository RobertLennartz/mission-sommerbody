import { describe, expect, it } from "vitest";
import {
  ageFromBirthYear,
  bodyDensity,
  computeBodyComposition,
  mean,
  siriBodyFatPct,
  type SkinfoldReadings,
} from "@/lib/bodyfat";

// Reference values computed by hand (and cross-checked in Python):
// S = 100 mm, age 35: density = 1.112 - 0.043499 + 0.0055 - 0.0100891 = 1.0639119
// body fat = 495 / 1.0639119 - 450 = 15.2641 %
describe("Jackson/Pollock 7 + Siri", () => {
  it("matches the worked example S=100, age 35", () => {
    const d = bodyDensity(100, 35);
    expect(d).toBeCloseTo(1.0639119, 7);
    expect(siriBodyFatPct(d)).toBeCloseTo(15.2641, 4);
  });

  it("matches further reference points", () => {
    expect(siriBodyFatPct(bodyDensity(120, 40))).toBeCloseTo(18.6653, 4);
    expect(siriBodyFatPct(bodyDensity(60, 30))).toBeCloseTo(8.6592, 4);
  });

  it("derives age from birth year and measuring date", () => {
    expect(ageFromBirthYear(1991, "2026-10-12")).toBe(35);
  });
});

describe("computeBodyComposition", () => {
  // Means: chest 10, midaxillary 12, triceps 14, subscapular 16, abdominal 20,
  // suprailiac 15, thigh 13 -> S = 100
  const readings: SkinfoldReadings = {
    chest: [9, 11],
    midaxillary: [12],
    triceps: [13, 14, 15],
    subscapular: [16],
    abdominal: [20, 20],
    suprailiac: [15],
    thigh: [13],
  };

  it("uses the mean of up to three readings per site", () => {
    expect(mean([13, 14, 15])).toBe(14);
    const r = computeBodyComposition({ readings, birthYear: 1991, measuredOn: "2026-10-12", weightKg: 90 });
    expect(r.sumMm).toBeCloseTo(100, 10);
    expect(r.bodyFatPct).toBeCloseTo(15.2641, 4);
    expect(r.fatMassKg).toBeCloseTo(90 * 0.152641, 3);
    expect(r.leanMassKg).toBeCloseTo(90 - 90 * 0.152641, 3);
    expect(r.missing).toEqual([]);
  });

  it("reports what is missing instead of guessing", () => {
    const partial = { ...readings, thigh: [] };
    const r = computeBodyComposition({ readings: partial, birthYear: null, measuredOn: "2026-10-12", weightKg: null });
    expect(r.bodyFatPct).toBeNull();
    expect(r.missing).toEqual(["Hautfalte Oberschenkel", "Geburtsjahr"]);
  });

  it("computes body fat without weight but no masses", () => {
    const r = computeBodyComposition({ readings, birthYear: 1991, measuredOn: "2026-10-12", weightKg: null });
    expect(r.bodyFatPct).toBeCloseTo(15.2641, 4);
    expect(r.fatMassKg).toBeNull();
    expect(r.missing).toEqual(["Gewicht"]);
  });
});
