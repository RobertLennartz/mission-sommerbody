/**
 * Pure helpers for the training clock and the rest timer. Everything is
 * computed from timestamps, never from counted ticks, so a phone that slept
 * in between still shows the right time.
 */

/** Rest presets in seconds: 1:00, 1:30, 2:00, 3:00. */
export const REST_PRESETS_SEC = [60, 90, 120, 180] as const;
export const REST_EXTEND_SEC = 30;
/** How long "Pause vorbei" stays visible before the timer is idle again. */
export const REST_OVER_VISIBLE_SEC = 60;
const REST_MAX_SEC = 30 * 60;

export type RestState = { endAt: number; totalSec: number } | null;

export type RestPhase =
  | { phase: "idle" }
  | { phase: "running"; remainingSec: number }
  | { phase: "over"; overSec: number };

export function restPhase(state: RestState, now: number): RestPhase {
  if (!state) return { phase: "idle" };
  const diff = state.endAt - now;
  if (diff > 0) return { phase: "running", remainingSec: Math.ceil(diff / 1000) };
  const overSec = Math.floor((now - state.endAt) / 1000);
  return overSec < REST_OVER_VISIBLE_SEC ? { phase: "over", overSec } : { phase: "idle" };
}

export function startRest(totalSec: number, now: number): NonNullable<RestState> {
  return { endAt: now + totalSec * 1000, totalSec };
}

/** +30 s on a running timer; on a finished one it starts a fresh 30 s. */
export function extendRest(state: RestState, now: number, sec: number = REST_EXTEND_SEC): NonNullable<RestState> {
  if (!state || state.endAt <= now) return startRest(sec, now);
  const endAt = Math.min(state.endAt + sec * 1000, now + REST_MAX_SEC * 1000);
  return { endAt, totalSec: state.totalSec + sec };
}

/** Reads what localStorage holds; anything unexpected counts as no timer. */
export function parseRestState(raw: string | null): RestState {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    const { endAt, totalSec } = v as Record<string, unknown>;
    if (typeof endAt !== "number" || !Number.isFinite(endAt)) return null;
    if (typeof totalSec !== "number" || totalSec <= 0 || totalSec > REST_MAX_SEC) return null;
    return { endAt, totalSec };
  } catch {
    return null;
  }
}

/** Seconds on the training clock; a running clock counts up to `now`. */
export function elapsedSec(startedAt: string, endedAt: string | null, now: number): number {
  const end = endedAt ? Date.parse(endedAt) : now;
  return Math.max(0, Math.floor((end - Date.parse(startedAt)) / 1000));
}
