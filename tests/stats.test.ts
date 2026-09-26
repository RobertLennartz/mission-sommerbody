import { describe, expect, it } from "vitest";
import { averageOfPresent, proteinTargetFor, sumByDate, weekGoal } from "@/lib/stats";

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

  it("scales the target in the short final week", () => {
    expect(weekGoal([], "2026-11-09", 5)).toEqual({ training: { done: 0, target: 4 }, recovery: 0 });
  });
});
