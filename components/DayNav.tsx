import Link from "next/link";
import { addDays, formatDayLong, type IsoDate } from "@/lib/dates";
import { isInMission, missionStatus } from "@/lib/mission";

export function DayNav({ date, today, basePath }: { date: IsoDate; today: IsoDate; basePath: string }) {
  const s = missionStatus(date);
  const sub = isInMission(date) && s.phase === "running" ? `Tag ${s.day} der Mission` : "außerhalb der Mission";
  const link = (d: IsoDate) => (d === today ? basePath : `${basePath}?datum=${d}`);
  return (
    <div className="flex items-stretch gap-2">
      <Link href={link(addDays(date, -1))} className="btn btn-sm px-3" aria-label="Vorheriger Tag">
        Zurück
      </Link>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
        <span className="t-strong truncate text-[16px]">{date === today ? `Heute, ${formatDayLong(date).split(", ")[1]}` : formatDayLong(date)}</span>
        <span className="t-label t-label-sm text-mute">{sub}</span>
      </div>
      <Link href={link(addDays(date, 1))} className="btn btn-sm px-3" aria-label="Nächster Tag">
        Vor
      </Link>
    </div>
  );
}
