import { berlinToday, isIsoDate, startOfIsoWeek, type IsoDate } from "@/lib/dates";
import { defaultWeekStart } from "@/lib/mission";

/** ?woche=YYYY-MM-DD (any day of the week) or the current mission week. */
export function weekFromParam(raw: string | string[] | undefined): IsoDate {
  return isIsoDate(raw) ? startOfIsoWeek(raw) : defaultWeekStart(berlinToday());
}
