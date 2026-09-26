import { AthleteSwitch } from "@/components/AthleteSwitch";
import { Wordmark } from "@/components/Wordmark";

/** Black bar with a 4 px yellow bottom edge, as in One and Done. */
export function SiteHeader({
  missionLabel,
  athletes,
  selected,
}: {
  missionLabel: string;
  athletes: { slug: string; name: string }[];
  selected: string;
}) {
  return (
    <header className="bg-ink text-bg" style={{ borderBottom: "4px solid var(--color-acc)" }}>
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Wordmark />
        <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto sm:gap-6">
          <span className="t-label t-label-sm hidden whitespace-nowrap text-dead sm:inline">trägt ein</span>
          <AthleteSwitch athletes={athletes} selected={selected} />
          <span className="t-num ml-auto whitespace-nowrap text-[13px] font-medium text-bg">{missionLabel}</span>
        </div>
      </div>
    </header>
  );
}
