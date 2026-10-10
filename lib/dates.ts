/**
 * Calendar-day helpers. A day is always an ISO string "YYYY-MM-DD" meaning a
 * day in Berlin. Arithmetic runs on UTC midnight, so DST changes never shift
 * a day. Only "what day is today" needs the time zone.
 */

export type IsoDate = string;

export const TZ = "Europe/Berlin";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const berlinDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const berlinTimeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "07:05" in Berlin time, for a timestamp from the database. */
export function formatBerlinTime(iso: string): string {
  return berlinTimeFormat.format(new Date(iso));
}

/** Today's date in Berlin, independent of the server's time zone. */
export function berlinToday(now: Date = new Date()): IsoDate {
  return berlinDayFormat.format(now);
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = toUtc(value);
  return !Number.isNaN(d.getTime()) && fromUtc(d) === value;
}

function toUtc(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Whole days from a to b (b minus a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** 1 = Monday ... 7 = Sunday */
export function isoWeekday(date: IsoDate): number {
  const day = toUtc(date).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfIsoWeek(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekDates(anyDayInWeek: IsoDate): IsoDate[] {
  const monday = startOfIsoWeek(anyDayInWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** ISO 8601 week number (German "KW"). */
export function isoWeek(date: IsoDate): { year: number; week: number } {
  // The Thursday of a week decides which year the week belongs to.
  const thursday = addDays(date, 4 - isoWeekday(date));
  const year = Number(thursday.slice(0, 4));
  const week = Math.floor(diffDays(`${year}-01-01`, thursday) / 7) + 1;
  return { year, week };
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function datesBetween(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAY_LONG = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export function weekdayShort(date: IsoDate): string {
  return WEEKDAY_SHORT[isoWeekday(date) - 1];
}

export function weekdayLong(date: IsoDate): string {
  return WEEKDAY_LONG[isoWeekday(date) - 1];
}

/** "Mo, 12.10." */
export function formatDayShort(date: IsoDate): string {
  return `${weekdayShort(date)}, ${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}

/** "12.10.2026" */
export function formatDate(date: IsoDate): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`;
}

/** "Montag, 12.10.2026" */
export function formatDayLong(date: IsoDate): string {
  return `${weekdayLong(date)}, ${formatDate(date)}`;
}
