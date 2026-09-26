import Link from "next/link";
import { addDays, formatDate, isoWeek, type IsoDate } from "@/lib/dates";
import { missionWeeks } from "@/lib/mission";

/** KW switcher: arrows plus a chip per mission week. `hrefFor` builds the link. */
export function WeekNav({ monday, basePath, extra = "" }: { monday: IsoDate; basePath: string; extra?: string }) {
  const weeks = missionWeeks();
  const href = (m: IsoDate) => `${basePath}?woche=${m}${extra}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <Link href={href(addDays(monday, -7))} className="btn btn-sm px-3" aria-label="Vorherige Woche">
          Zurück
        </Link>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="t-strong text-[16px]">KW {isoWeek(monday).week}</span>
          <span className="t-label t-label-sm text-mute">
            {formatDate(monday).slice(0, 6)} bis {formatDate(addDays(monday, 6))}
          </span>
        </div>
        <Link href={href(addDays(monday, 7))} className="btn btn-sm px-3" aria-label="Nächste Woche">
          Vor
        </Link>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((m) => (
          <Link
            key={m}
            href={href(m)}
            className="t-num flex min-h-[36px] flex-1 items-center justify-center px-2 text-[12px]"
            aria-current={m === monday ? "page" : undefined}
            style={{
              border: "1.5px solid var(--color-ink)",
              background: m === monday ? "var(--color-acc)" : "var(--color-bg)",
            }}
          >
            KW {isoWeek(m).week}
          </Link>
        ))}
      </div>
    </div>
  );
}
