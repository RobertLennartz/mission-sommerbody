import { describe, expect, it } from "vitest";
import { averageOfPresent, dayNutrition, nutritionByDate, proteinTargetFor, sumByDate, weekGoal } from "@/lib/stats";

describe("proteinTargetFor", () => {
  const checkups = [
    { date: "2026-10-12", weightKg: 90 },
    { date: "2026-11-13", weightKg: 86 },
  ];
  const morning = [{ date: "2026-10-10", weightKg: 91 }];

  it("uses the latest checkup on or before the day", () => {
    expect(proteinTargetFor("2026-10-20", checkups, morning, 2)).toBe(180);
    expect(proteinTargetFor("2026-11-13", checkups, morning, 2)).toBe(172);
  });

  it("falls back to the morning weight before the first checkup", () => {
    expect(proteinTargetFor("2026-10-11", checkups, morning, 2)).toBe(182);
  });

  it("has no target without any weight", () => {
    expect(proteinTargetFor("2026-10-01", checkups, morning, 2)).toBeNull();
  });
});

describe("averages and sums", () => {
  it("averages only days with a value", () => {
    expect(averageOfPresent([10000, null, 8000, undefined])).toEqual({ average: 9000, days: 2 });
    expect(averageOfPresent([null])).toEqual({ average: null, days: 0 });
  });

  it("sums meals per day", () => {
    const sums = sumByDate(
      [
        { date: "2026-10-12", p: 30 },
        { date: "2026-10-12", p: null },
        { date: "2026-10-13", p: 45.5 },
      ],
      (r) => r.p,
    );
    expect(sums.get("2026-10-12")).toBe(30);
    expect(sums.get("2026-10-13")).toBe(45.5);
  });
});

describe("weekGoal", () => {
  const sessions = [
    { category: "strength" as const, status: "done" as const, date: "2026-10-12" },
    { category: "strength" as const, status: "planned" as const, date: "2026-10-14" },
    { category: "hiit" as const, status: "done" as const, date: "2026-10-13" },
    { category: "cardio" as const, status: "done" as const, date: "2026-10-15" },
    { category: "cardio" as const, status: "skipped" as const, date: "2026-10-16" },
    { category: "recovery" as const, status: "done" as const, date: "2026-10-17" },
  ];

  it("counts every done training, recovery separately", () => {
    expect(weekGoal(sessions, "2026-10-12", 5)).toEqual({ training: { done: 3, target: 5 }, recovery: 1 });
  });

  it("does not count easy rides and walks, neither as training nor as recovery", () => {
    const withLight = [...sessions, { category: "light" as const, status: "done" as const, date: "2026-10-12" }];
    expect(weekGoal(withLight, "2026-10-12", 5)).toEqual({ training: { done: 3, target: 5 }, recovery: 1 });
  });

  it("scales the target in the short final week", () => {
    expect(weekGoal([], "2026-11-09", 5)).toEqual({ training: { done: 0, target: 4 }, recovery: 0 });
  });
});

import { linear, niceTicks } from "@/lib/chart-scale";

describe("chart scale", () => {
  it("maps linearly", () => {
    const x = linear([0, 10], [0, 100]);
    expect(x(5)).toBe(50);
  });

  it("finds nice ticks that cover the data", () => {
    expect(niceTicks(84.3, 91.2)).toEqual([84, 86, 88, 90, 92]);
    expect(niceTicks(0, 14000)).toEqual([0, 5000, 10000, 15000]);
    const t = niceTicks(80, 80);
    expect(t[0]).toBeLessThanOrEqual(79);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(81);
  });
});

describe("daily nutrition totals", () => {
  const meals = [
    { protein_g: 30, kcal: 500 },
    { protein_g: 45.5, kcal: null },
  ];

  it("uses the sum of the meals without a daily total", () => {
    const n = dayNutrition({ protein_total_g: null, kcal_total: null }, meals);
    expect(n).toMatchObject({ protein: 75.5, kcal: 500, proteinFromTotal: false, kcalFromTotal: false, meals: 2 });
  });

  it("lets the daily total win, protein and kcal independently", () => {
    const n = dayNutrition({ protein_total_g: 160, kcal_total: null }, meals);
    expect(n).toMatchObject({ protein: 160, kcal: 500, proteinFromTotal: true, kcalFromTotal: false, mealProtein: 75.5 });
  });

  it("works with a daily total and no meals at all", () => {
    expect(dayNutrition({ protein_total_g: 140, kcal_total: 2300 }, [])).toMatchObject({ protein: 140, kcal: 2300, meals: 0 });
    expect(dayNutrition(undefined, [])).toMatchObject({ protein: null, kcal: null });
  });

  it("collects days that have a total or meals", () => {
    const byDate = nutritionByDate(
      [
        { date: "2026-10-12", protein_total_g: 150, kcal_total: null },
        { date: "2026-10-13", protein_total_g: null, kcal_total: null },
      ],
      [{ date: "2026-10-14", protein_g: 40, kcal: 600 }],
    );
    expect([...byDate.keys()].sort()).toEqual(["2026-10-12", "2026-10-14"]);
    expect(byDate.get("2026-10-12")!.protein).toBe(150);
    expect(byDate.get("2026-10-14")!.kcal).toBe(600);
  });
});
