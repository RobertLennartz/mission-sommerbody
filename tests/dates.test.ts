import { describe, expect, it } from "vitest";
import { addDays, berlinToday, diffDays, formatDayShort, isIsoDate, isoWeek, isoWeekday, startOfIsoWeek } from "@/lib/dates";
import {
  MISSION_DAYS,
  defaultWeekStart,
  missionDaysInWeek,
  missionLabel,
  missionWeeks,
  weekLabel,
  weeklyTarget,
} from "@/lib/mission";

describe("berlinToday", () => {
  it("uses Berlin time, not UTC", () => {
    // 23:30 UTC on 11.10. is already 01:30 on 12.10. in Berlin (CEST, UTC+2)
    expect(berlinToday(new Date("2026-10-11T23:30:00Z"))).toBe("2026-10-12");
    expect(berlinToday(new Date("2026-10-11T21:59:00Z"))).toBe("2026-10-11");
  });

  it("handles the end of daylight saving time on 25.10.2026", () => {
    // After the switch Berlin is UTC+1: 23:30 UTC on 25.10. is 00:30 on 26.10.
    expect(berlinToday(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    expect(berlinToday(new Date("2026-10-25T22:59:00Z"))).toBe("2026-10-25");
  });
});

describe("date arithmetic", () => {
  it("adds days across the DST change and month ends", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(diffDays("2026-10-12", "2026-11-13")).toBe(32);
  });

  it("knows weekdays and ISO weeks", () => {
    expect(isoWeekday("2026-10-12")).toBe(1);
    expect(isoWeekday("2026-10-18")).toBe(7);
    expect(isoWeek("2026-10-12")).toEqual({ year: 2026, week: 42 });
    expect(isoWeek("2026-11-13")).toEqual({ year: 2026, week: 46 });
    expect(isoWeek("2027-01-01")).toEqual({ year: 2026, week: 53 });
    expect(startOfIsoWeek("2026-10-15")).toBe("2026-10-12");
    expect(formatDayShort("2026-10-12")).toBe("Mo, 12.10.");
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-10-12")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("12.10.2026")).toBe(false);
  });
});

describe("mission", () => {
  it("spans 33 days in KW 42 to KW 46", () => {
    expect(MISSION_DAYS).toBe(33);
    expect(missionWeeks().map(weekLabel)).toEqual(["KW 42", "KW 43", "KW 44", "KW 45", "KW 46"]);
  });

  it("labels the countdown", () => {
    expect(missionLabel("2026-09-26")).toBe("Start in 16 Tagen");
    expect(missionLabel("2026-10-11")).toBe("Start morgen");
    expect(missionLabel("2026-10-12")).toBe("Tag 1 von 33");
    expect(missionLabel("2026-11-13")).toBe("Tag 33 von 33");
    expect(missionLabel("2026-11-14")).toBe("Mission beendet");
  });

  it("scales the weekly target in the short last week", () => {
    expect(missionDaysInWeek("2026-10-12")).toBe(7);
    expect(missionDaysInWeek("2026-11-09")).toBe(5);
    expect(weeklyTarget(3, "2026-10-12")).toBe(3);
    expect(weeklyTarget(3, "2026-11-09")).toBe(2);
  });

  it("clamps the default week to the mission", () => {
    expect(defaultWeekStart("2026-09-26")).toBe("2026-10-12");
    expect(defaultWeekStart("2026-10-28")).toBe("2026-10-26");
    expect(defaultWeekStart("2026-12-01")).toBe("2026-11-09");
  });
});
