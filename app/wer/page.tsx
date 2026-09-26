import type { Metadata } from "next";
import { Wordmark } from "@/components/Wordmark";
import { getAthletes } from "@/lib/athletes";
import { requireSession } from "@/lib/auth";
import { chooseAthlete } from "@/app/actions/athlete";

export const metadata: Metadata = { title: "Wer trägt ein?" };

export default async function WhoPage() {
  await requireSession();
  const athletes = await getAthletes();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-ink text-bg" style={{ borderBottom: "4px solid var(--color-acc)" }}>
        <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6">
          <Wordmark href="/wer" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 py-12 sm:px-6">
        <h1 className="t-head text-[34px]">Wer trägt ein?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          Das Gerät merkt sich die Wahl. Oben in der Kopfleiste lässt sie sich jederzeit umschalten.
        </p>
        <form action={chooseAthlete} className="mt-8 flex flex-col gap-3">
          {athletes.map((a) => (
            <button key={a.id} type="submit" name="slug" value={a.slug} className="btn min-h-[64px] text-[18px]">
              {a.name}
            </button>
          ))}
        </form>
      </main>
    </div>
  );
}
