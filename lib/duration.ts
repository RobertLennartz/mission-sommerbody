/**
 * Durations in seconds. Input: "45" (minutes), "26:40" (mm:ss) or "1:05:30"
 * (h:mm:ss). Output German style. Pace needs seconds, whole minutes would be
 * too coarse (26:40 for 5 km is 5:20 min/km, "27 min" would say 5:24).
 */

export const MAX_DURATION_SEC = 10 * 60 * 60;

export function parseDuration(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (s === "") return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 60);
  const parts = s.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return NaN;
  const nums = parts.map(Number);
  const [h, m, sec] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  if (sec >= 60 || (parts.length === 3 && m >= 60)) return NaN;
  return h * 3600 + m * 60 + sec;
}

export function validateDuration(raw: string): string | null {
  const v = parseDuration(raw);
  if (v === null) return null;
  if (Number.isNaN(v)) return "Dauer als Minuten (45) oder mm:ss (26:40) oder h:mm:ss (1:05:30).";
  if (v < 1 || v > MAX_DURATION_SEC) return "Dauer zwischen 1 Sekunde und 10 Stunden.";
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 1600 -> "26:40", 3930 -> "1:05:30", 2700 -> "45:00" */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Short label for lists: "45 min", "60 min", "26:40 min", "1:05:30 h". */
export function durationLabel(sec: number): string {
  if (sec % 60 === 0) return `${sec / 60} min`;
  return sec >= 3600 ? `${formatDuration(sec)} h` : `${formatDuration(sec)} min`;
}

/** Pace in seconds per km, null without both values. */
export function paceSecPerKm(sec: number | null, km: number | null): number | null {
  if (!sec || !km || km <= 0) return null;
  return sec / km;
}

/** "5:20 min/km" */
export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${pad(total % 60)} min/km`;
}

export function speedKmh(sec: number | null, km: number | null): number | null {
  if (!sec || !km || km <= 0) return null;
  return km / (sec / 3600);
}
