import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { getCheckups } from "@/lib/data/checkups";
import { CHECKUP_TYPE_LABEL } from "@/lib/measurements";
import { CheckupForm } from "./CheckupForm";

export const metadata: Metadata = { title: "Checkup" };

export default async function CheckupPage({ params }: PageProps<"/checkups/[id]">) {
  const { id } = await params;
  await requireSelectedAthlete();
  const athletes = await getAthletes();
  const checkup = (await getCheckups(athletes)).find((c) => c.id === id);
  if (!checkup) notFound();
  const athlete = athletes.find((a) => a.id === checkup.athlete_id)!;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <Link href="/checkups" className="t-label underline">
        Alle Checkups
      </Link>
      <div>
        <h1 className="t-head text-[28px]">
          {CHECKUP_TYPE_LABEL[checkup.type]}-Checkup {athlete.name}
        </h1>
        {athlete.bodyfat_formula === null ? (
          <p className="mt-2 text-[14px] text-bad">
            Für das Körperfett fehlt die Formel (Männer oder Frauen).{" "}
            <Link href="/einstellungen" className="underline">In den Einstellungen wählen</Link>.
          </p>
        ) : null}
        {athlete.birth_year === null ? (
          <p className="mt-2 text-[14px] text-bad">
            Für das Körperfett fehlt das Geburtsjahr. <Link href="/einstellungen" className="underline">In den Einstellungen eintragen</Link>.
          </p>
        ) : null}
      </div>
      <CheckupForm checkup={checkup} rawReadings={checkup.rawReadings} birthYear={athlete.birth_year} formula={athlete.bodyfat_formula} />
    </div>
  );
}
