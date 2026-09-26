import { describe, expect, it } from "vitest";
import { durationLabel, formatDuration, formatPace, paceSecPerKm, parseDuration, speedKmh, validateDuration } from "@/lib/duration";

describe("parseDuration", () => {
  it.each([
    ["45", 2700],
    ["26:40", 1600],
    ["1:05:30", 3930],
    ["45,5", 2730],
    [" 30 ", 1800],
  ])("%s -> %d s", (raw, sec) => {
    expect(parseDuration(raw)).toBe(sec);
  });

  it("rejects nonsense", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("26:61")).toBeNaN();
    expect(parseDuration("1:61:00")).toBeNaN();
    expect(parseDuration("halbe Stunde")).toBeNaN();
    expect(validateDuration("11:00:00")).toMatch(/10 Stunden/);
    expect(validateDuration("26:40")).toBeNull();
  });
});

describe("pace", () => {
  it("computes min/km and km/h", () => {
    expect(formatPace(paceSecPerKm(1600, 5)!)).toBe("5:20 min/km");
    expect(formatPace(paceSecPerKm(3930, 10)!)).toBe("6:33 min/km");
    expect(speedKmh(3600, 25)).toBe(25);
    expect(paceSecPerKm(1600, null)).toBeNull();
    expect(paceSecPerKm(null, 5)).toBeNull();
  });

  it("formats durations", () => {
    expect(formatDuration(1600)).toBe("26:40");
    expect(formatDuration(3930)).toBe("1:05:30");
    expect(durationLabel(2700)).toBe("45 min");
    expect(durationLabel(1600)).toBe("26:40 min");
    expect(durationLabel(3930)).toBe("1:05:30 h");
  });
});
