import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { SiteHeader } from "@/components/SiteHeader";
import { TopNav } from "@/components/TopNav";
import { logout } from "@/app/login/actions";
import { getAthletes, getSelectedAthlete } from "@/lib/athletes";
import { requireSession } from "@/lib/auth";
import { berlinToday } from "@/lib/dates";
import { MISSION_RANGE_LABEL, missionLabel } from "@/lib/mission";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  const [athletes, selected] = await Promise.all([getAthletes(), getSelectedAthlete()]);
  if (!selected) redirect("/wer");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        missionLabel={missionLabel(berlinToday())}
        athletes={athletes.map((a) => ({ slug: a.slug, name: a.name }))}
        selected={selected.slug}
      />
      <TopNav />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
        {children}
      </main>
      <footer className="hidden sm:block" style={{ borderTop: "1px solid var(--color-line)" }}>
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-6 py-5">
          <span className="t-label text-mute">Mission Sommerbody · {MISSION_RANGE_LABEL}</span>
          <form action={logout} className="ml-auto">
            <button type="submit" className="t-label text-mute underline hover:text-ink">
              Abmelden
            </button>
          </form>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
