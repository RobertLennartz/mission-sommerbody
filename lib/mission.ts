import { addDays, diffDays, formatDate, isoWeek, startOfIsoWeek, type IsoDate } from "@/lib/dates";

/**
 * The mission period lives here and nowhere else. Start moved from 12.10. to
 * Saturday 10.10.2026 on Robert's request (09.10.2026); end unchanged.
 */
export const MISSION_START: IsoDate = "2026-10-10";
export const MISSION_END: IsoDate = "2026-11-13";
export const MISSION_DAYS = diffDays(MISSION_START, MISSION_END) + 1;

/** "10.10." */
export const MISSION_START_SHORT = formatDate(MISSION_START).slice(0, 6);
/** "13.11." */
export const MISSION_END_SHORT = formatDate(MISSION_END).slice(0, 6);
/** "10.10. bis 13.11.2026" */
export const MISSION_RANGE_LABEL = `${MISSION_START_SHORT} bis ${formatDate(MISSION_END)}`;

export type MissionStatus =
  | { phase: "before"; daysUntilStart: number }
  | { phase: "running"; day: number; daysLeft: number }
  | { phase: "after" };

export function missionStatus(today: IsoDate): MissionStatus {
  if (today < MISSION_START) {
    return { phase: "before", daysUntilStart: diffDays(today, MISSION_START) };
  }
  if (today > MISSION_END) return { phase: "after" };
  const day = diffDays(MISSION_START, today) + 1;
  return { phase: "running", day, daysLeft: MISSION_DAYS - day };
}

/** Header countdown: "Start in 16 Tagen", "Tag 3 von 33", "Mission beendet". */
export function missionLabel(today: IsoDate): string {
  const s = missionStatus(today);
  if (s.phase === "before") {
    return s.daysUntilStart === 1 ? "Start morgen" : `Start in ${s.daysUntilStart} Tagen`;
  }
  if (s.phase === "after") return "Mission beendet";
  return `Tag ${s.day} von ${MISSION_DAYS}`;
}

export function isInMission(date: IsoDate): boolean {
  return date >= MISSION_START && date <= MISSION_END;
}

/** Mondays of all mission weeks (KW 42 to KW 46). */
export function missionWeeks(): IsoDate[] {
  const weeks: IsoDate[] = [];
  for (let monday = startOfIsoWeek(MISSION_START); monday <= MISSION_END; monday = addDays(monday, 7)) {
    weeks.push(monday);
  }
  return weeks;
}

/** The week to show by default: the current one, clamped to the mission. */
export function defaultWeekStart(today: IsoDate): IsoDate {
  const weeks = missionWeeks();
  const current = startOfIsoWeek(today);
  if (current < weeks[0]) return weeks[0];
  if (current > weeks[weeks.length - 1]) return weeks[weeks.length - 1];
  return current;
}

export function missionDaysInWeek(monday: IsoDate): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (isInMission(addDays(monday, i))) n++;
  return n;
}

/**
 * Weekly target scaled to the mission days of that week, so the short final
 * week (Mon to Fri) asks for 2 instead of 3 sessions.
 */
export function weeklyTarget(target: number, monday: IsoDate): number {
  return Math.round((target * missionDaysInWeek(monday)) / 7);
}

export function weekLabel(monday: IsoDate): string {
  return `KW ${isoWeek(monday).week}`;
}
