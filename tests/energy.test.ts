import { describe, expect, it } from "vitest";
import { bmrMifflin, dayEnergy, energyPerDay, fatEquivalentLabel, sessionEnergy, sessionKind, sessionStepKm, stepsKcal, totalSaved } from "@/lib/energy";

describe("Mifflin-St Jeor", () => {
  it("matches the standard worked example (30 y, 80 kg, 180 cm, man)", () => {
    // 800 + 1125 - 150 + 5 = 1780
    expect(bmrMifflin({ weightKg: 80, heightCm: 180, age: 30, sex: "male" })).toBe(1780);
  });

  it("uses -161 for women", () => {
    expect(bmrMifflin({ weightKg: 80, heightCm: 180, age: 30, sex: "female" })).toBe(1614);
  });
});

const base = { activity: null, duration_sec: null, distance_km: null };

describe("session energy", () => {
  it("one hour of strength at 85 kg: about 300 gross, 210 above rest", () => {
    const e = sessionEnergy({ ...base, category: "strength", title: "Oberkörper 1", duration_sec: 3600 }, 85);
    expect(e.grossKcal).toBeCloseTo(297.5, 5);
    expect(e.netKcal).toBeCloseTo(212.5, 5);
    expect(e.assumedDuration).toBe(false);
  });

  it("assumes 60 minutes of strength when no duration was entered", () => {
    const e = sessionEnergy({ ...base, category: "strength", title: "Kraft" }, 85);
    expect(e.minutes).toBe(60);
    expect(e.assumedDuration).toBe(true);
  });

  it("running with km: about 1 kcal per kg and km above rest", () => {
    const e = sessionEnergy({ ...base, category: "cardio", activity: "Laufen", title: "Laufen", duration_sec: 1600, distance_km: 5 }, 80);
    expect(e.netKcal).toBe(400);
    expect(e.grossKcal).toBeCloseTo(400 + (80 * 1600) / 3600, 5);
  });

  it("recognises activities and counts recovery as nothing", () => {
    expect(sessionKind({ category: "cardio", activity: "Spinning", title: "Spinning" })).toBe("spinning");
    expect(sessionKind({ category: "cardio", activity: "Schwimmen", title: "Schwimmen" })).toBe("swimming");
    expect(sessionKind({ category: "hiit", activity: null, title: "HIIT-Kurs" })).toBe("hiit");
    expect(sessionEnergy({ ...base, category: "recovery", activity: "Sauna", title: "Sauna" }, 85).netKcal).toBe(0);
  });

  it("spinning 45 min at 85 kg uses 9 MET", () => {
    const e = sessionEnergy({ ...base, category: "cardio", activity: "Spinning", title: "Spinning", duration_sec: 2700 }, 85);
    expect(e.grossKcal).toBeCloseTo(9 * 85 * 0.75, 5);
    expect(e.netKcal).toBeCloseTo(8 * 85 * 0.75, 5);
  });
});

describe("steps and day balance", () => {
  it("10,000 steps at 85 kg and 183 cm: 7.6 km walking, about 323 kcal", () => {
    expect(stepsKcal(10000, 85, 183)).toBeCloseTo(0.5 * 85 * 7.5945, 3);
  });

  it("does not count run km twice", () => {
    expect(stepsKcal(10000, 85, 183, 5)).toBeCloseTo(0.5 * 85 * (7.5945 - 5), 3);
    expect(stepsKcal(3000, 85, 183, 10)).toBe(0);
  });

  it("adds up the day and compares with what was eaten", () => {
    const d = dayEnergy({
      bmr: 1800,
      weightKg: 85,
      heightCm: 183,
      steps: 10000,
      sessions: [
        { category: "strength", activity: null, title: "Oberkörper 1", duration_sec: 3600, distance_km: null, status: "done" },
        { category: "strength", activity: null, title: "geplant", duration_sec: 3600, distance_km: null, status: "planned" },
      ],
      intakeKcal: 2200,
    });
    expect(d.digestion).toBeCloseTo(180, 5);
    expect(d.training).toBeCloseTo(212.5, 5);
    expect(d.total).toBeCloseTo(1800 + 180 + 0.5 * 85 * 7.5945 + 212.5, 3);
    expect(d.balance).toBeCloseTo(d.total - 2200, 5);
  });

  it("has no balance without recorded calories", () => {
    const d = dayEnergy({ bmr: 1800, weightKg: 85, heightCm: 183, steps: null, sessions: [], intakeKcal: null });
    expect(d.balance).toBeNull();
    expect(d.total).toBeCloseTo(1980, 5);
  });
});


describe("energy per day from data", () => {
  const athlete = { birth_year: 1987, height_cm: 183, bodyfat_formula: "jp7_male" as const };

  it("uses the latest weight on or before each day and sums the savings", () => {
    const days = energyPerDay({
      dates: ["2026-10-12", "2026-10-13", "2026-10-14"],
      athlete,
      weights: [
        { date: "2026-10-12", weightKg: 90 },
        { date: "2026-10-14", weightKg: 89 },
      ],
      logs: [
        { date: "2026-10-12", steps: null, kcal_total: 2000 },
        { date: "2026-10-13", steps: null, kcal_total: null },
      ],
      meals: [{ date: "2026-10-14", kcal: 1500 }],
      sessions: [],
    });
    // 12.10.: 90 kg -> BMR 900 + 1143.75 - 195 + 5 = 1853.75, x1.1 = 2039.125
    expect(days[0].energy!.bmr).toBeCloseTo(1853.75, 5);
    expect(days[0].energy!.balance).toBeCloseTo(39.125, 3);
    expect(days[1].energy!.balance).toBeNull();
    // 14.10.: 89 kg -> BMR 1843.75, x1.1 = 2028.125, eaten 1500 (meals)
    expect(days[2].energy!.balance).toBeCloseTo(528.125, 3);
    expect(totalSaved(days)).toEqual({ kcal: expect.closeTo(567.25, 3), days: 2 });
  });

  it("says what is missing instead of guessing", () => {
    const [d] = energyPerDay({
      dates: ["2026-10-12"],
      athlete: { birth_year: null, height_cm: null, bodyfat_formula: null },
      weights: [],
      logs: [],
      meals: [],
      sessions: [],
    });
    expect(d.energy).toBeNull();
    expect(d.missing).toEqual(["Gewicht", "Größe", "Geburtsjahr", "Formel Männer/Frauen (Einstellungen)"]);
  });
});

describe("fat equivalent", () => {
  it("shows grams below a kilogram and kilograms above", () => {
    expect(fatEquivalentLabel(90)).toBe("≈ 12 g Fett");
    expect(fatEquivalentLabel(10780)).toBe("≈ 1,4 kg Fett");
  });
});

describe("easy movement (locker)", () => {
  it("separates easy rides and walks from spinning and running", () => {
    expect(sessionKind({ category: "light", activity: "Lockeres Radfahren", title: "Lockeres Radfahren" })).toBe("light");
    expect(sessionKind({ category: "light", activity: "Gehen", title: "Gehen" })).toBe("walking");
    expect(sessionKind({ category: "light", activity: null, title: "Laufband locker" })).toBe("walking");
    // The same words in an endurance session stay what they were.
    expect(sessionKind({ category: "cardio", activity: "Spinning", title: "Rad" })).toBe("spinning");
  });

  it("easy ride at 90 kg for 20 min: 3.5 MET instead of 9.0 for spinning", () => {
    const light = sessionEnergy({ ...base, category: "light", activity: "Lockeres Radfahren", title: "Lockeres Radfahren", duration_sec: 1200 }, 90);
    expect(light.grossKcal).toBeCloseTo(105, 5); // 3.5 * 90 * 1/3
    expect(light.netKcal).toBeCloseTo(75, 5); // 2.5 * 90 * 1/3
    const spinning = sessionEnergy({ ...base, category: "cardio", activity: "Spinning", title: "Spinning", duration_sec: 1200 }, 90);
    expect(spinning.netKcal).toBeCloseTo(240, 5); // 8.0 * 90 * 1/3
  });

  it("walk without km: 4.5 km/h assumed, 0.5 kcal per kg and km above rest", () => {
    const e = sessionEnergy({ ...base, category: "light", activity: "Gehen", title: "Gehen", duration_sec: 1800 }, 90);
    expect(e.netKcal).toBeCloseTo(0.5 * 90 * 2.25, 5);
    expect(e.grossKcal).toBeCloseTo(0.5 * 90 * 2.25 + 45, 5);
    expect(e.assumedDuration).toBe(false);
  });

  it("walk with km uses the km", () => {
    const e = sessionEnergy({ ...base, category: "light", activity: "Gehen", title: "Gehen", duration_sec: 2400, distance_km: 3 }, 80);
    expect(e.netKcal).toBe(120);
  });

  it("takes walk km out of the steps so the treadmill is not counted twice", () => {
    const walk = { ...base, category: "light" as const, activity: "Gehen", title: "Gehen", duration_sec: 1800, status: "done" };
    const run = { ...base, category: "cardio" as const, activity: "Laufen", title: "Laufen", distance_km: 5, status: "done" };
    const planned = { ...walk, status: "planned" };
    expect(sessionStepKm([walk, run, planned])).toBeCloseTo(2.25 + 5, 5);

    const withWalk = dayEnergy({ bmr: 1800, weightKg: 90, heightCm: 183, steps: 10000, sessions: [walk], intakeKcal: null });
    const without = dayEnergy({ bmr: 1800, weightKg: 90, heightCm: 183, steps: 10000, sessions: [], intakeKcal: null });
    // Same distance walked either way: the walk moves from "steps" to "training", the total stays.
    expect(withWalk.steps + withWalk.training).toBeCloseTo(without.steps, 5);
  });
});
