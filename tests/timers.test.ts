import { describe, expect, it } from "vitest";
import { formatBerlinTime } from "@/lib/dates";
import { REST_OVER_VISIBLE_SEC, elapsedSec, extendRest, parseRestState, restPhase, startRest } from "@/lib/timers";

const T0 = Date.parse("2026-10-10T08:00:00.000Z");

describe("rest timer", () => {
  it("counts down and rounds partial seconds up", () => {
    const state = startRest(120, T0);
    expect(restPhase(state, T0)).toEqual({ phase: "running", remainingSec: 120 });
    expect(restPhase(state, T0 + 400)).toEqual({ phase: "running", remainingSec: 120 });
    expect(restPhase(state, T0 + 119_001)).toEqual({ phase: "running", remainingSec: 1 });
  });

  it("is over at the end and idle again after the visible window", () => {
    const state = startRest(90, T0);
    expect(restPhase(state, T0 + 90_000)).toEqual({ phase: "over", overSec: 0 });
    expect(restPhase(state, T0 + 102_500)).toEqual({ phase: "over", overSec: 12 });
    expect(restPhase(state, T0 + 90_000 + REST_OVER_VISIBLE_SEC * 1000)).toEqual({ phase: "idle" });
    expect(restPhase(null, T0)).toEqual({ phase: "idle" });
  });

  it("adds 30 s to a running timer and starts fresh after the end", () => {
    const running = startRest(60, T0);
    expect(extendRest(running, T0 + 10_000)).toEqual({ endAt: T0 + 90_000, totalSec: 90 });
    expect(extendRest(running, T0 + 70_000)).toEqual({ endAt: T0 + 100_000, totalSec: 30 });
    expect(extendRest(null, T0)).toEqual({ endAt: T0 + 30_000, totalSec: 30 });
  });

  it("caps extending at 30 minutes from now", () => {
    let state = startRest(180, T0);
    for (let i = 0; i < 100; i++) state = extendRest(state, T0);
    expect(state.endAt).toBe(T0 + 30 * 60 * 1000);
  });

  it("ignores broken storage values", () => {
    expect(parseRestState(JSON.stringify({ endAt: T0, totalSec: 120 }))).toEqual({ endAt: T0, totalSec: 120 });
    expect(parseRestState(null)).toBeNull();
    expect(parseRestState("{")).toBeNull();
    expect(parseRestState("null")).toBeNull();
    expect(parseRestState(JSON.stringify({ endAt: "x", totalSec: 120 }))).toBeNull();
    expect(parseRestState(JSON.stringify({ endAt: T0, totalSec: 0 }))).toBeNull();
  });
});

describe("training clock", () => {
  it("counts up while running and freezes at the end", () => {
    const start = "2026-10-10T08:00:00.000Z";
    expect(elapsedSec(start, null, T0 + 61_900)).toBe(61);
    expect(elapsedSec(start, "2026-10-10T09:05:30.000Z", T0)).toBe(3930);
  });

  it("never shows negative time when the phone clock is behind", () => {
    expect(elapsedSec("2026-10-10T08:00:00.000Z", null, T0 - 5_000)).toBe(0);
  });

  it("shows start and end in Berlin time", () => {
    expect(formatBerlinTime("2026-10-10T08:12:00.000Z")).toBe("10:12");
    // After the switch to winter time (25.10.2026) Berlin is UTC+1.
    expect(formatBerlinTime("2026-11-02T06:05:00.000Z")).toBe("07:05");
  });
});
