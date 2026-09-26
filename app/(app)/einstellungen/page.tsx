import type { Metadata } from "next";
import { logout } from "@/app/login/actions";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { EXPORTS } from "@/lib/data/export";
import { AthleteSettings } from "./AthleteSettings";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  await requireSelectedAthlete();
  const athletes = await getAthletes();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="t-head text-[30px]">Einstellungen</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {athletes.map((a) => (
          <section key={a.id} className="card">
            <div className="card-head">
              <h2 className="t-strong text-[16px] uppercase">{a.name}</h2>
            </div>
            <AthleteSettings key={a.updated_at} athlete={a} />
          </section>
        ))}
      </div>
      <p className="-mt-3 text-[13px] leading-relaxed text-mute">
        Das Geburtsjahr braucht die Körperfettformel. Das Proteinziel gilt pro kg Körpergewicht aus dem letzten Checkup. In der
        letzten Woche (Mo bis Fr) wird das Wochenziel anteilig gerechnet.
      </p>

      <section className="card">
        <div className="card-head">
          <h2 className="t-label t-label-lg">Export</h2>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-[14px] text-mute">
            CSV für Excel und Google Sheets (Semikolon, Dezimalkomma). Das ist auch eure Sicherung: Im Gratis-Tarif von Supabase lassen
            sich Backups nicht herunterladen.
          </p>
          <a href="/export/alles.zip" className="btn btn-primary self-start">
            Alles als ZIP
          </a>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EXPORTS).map(([key, label]) => (
              <a key={key} href={`/export/${key}.csv`} className="btn btn-sm">
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <form action={logout}>
        <button type="submit" className="btn">
          Abmelden
        </button>
      </form>
    </div>
  );
}
