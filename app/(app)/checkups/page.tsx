import type { Metadata } from "next";
import { openCheckup } from "@/app/actions/checkups";
import { getAthletes, requireSelectedAthlete } from "@/lib/athletes";
import { getCheckups, type CheckupDetail } from "@/lib/data/checkups";
import { formatDate } from "@/lib/dates";
import { MISSION_END_SHORT, MISSION_START_SHORT } from "@/lib/mission";
import { CHECKUP_TYPES, CHECKUP_TYPE_LABEL, CIRCUMFERENCES } from "@/lib/measurements";
import { formatDecimal, formatSigned } from "@/lib/numbers";

export const metadata: Metadata = { title: "Checkups" };

type Row = { label: string; unit: string; digits: number; get: (c: CheckupDetail) => number | null };

const ROWS: Row[] = [
  { label: "Gewicht", unit: "kg", digits: 1, get: (c) => c.weight_kg },
  { label: "Körperfett", unit: "%", digits: 1, get: (c) => c.composition.bodyFatPct },
  { label: "Fettmasse", unit: "kg", digits: 1, get: (c) => c.composition.fatMassKg },
  { label: "Fettfreie Masse", unit: "kg", digits: 1, get: (c) => c.composition.leanMassKg },
  { label: "Summe 7 Hautfalten", unit: "mm", digits: 1, get: (c) => c.composition.sumMm },
  ...CIRCUMFERENCES.map((m) => ({ label: m.label.replace(" (optional)", ""), unit: "cm", digits: 1, get: (c: CheckupDetail) => c[m.key] })),
];

export default async function CheckupsPage() {
  await requireSelectedAthlete();
  const athletes = await getAthletes();
  const checkups = await getCheckups(athletes);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="t-head text-[30px]">Checkups</h1>
        <p className="mt-1 text-[15px] text-mute">
          Start am {MISSION_START_SHORT}, Ende am {MISSION_END_SHORT} Körperfett nach Jackson/Pollock (7 Hautfalten).
        </p>
      </div>

      {athletes.map((athlete) => {
        const own = checkups.filter((c) => c.athlete_id === athlete.id);
        const byType = Object.fromEntries(own.map((c) => [c.type, c])) as Partial<Record<CheckupDetail["type"], CheckupDetail>>;
        const columns = CHECKUP_TYPES.map((t) => ({ type: t, c: byType[t] }));
        const first = byType.start;
        const last = byType.end;
        return (
          <section key={athlete.id} className="card">
            <div className="card-head flex items-baseline justify-between">
              <h2 className="t-strong text-[16px] uppercase">{athlete.name}</h2>
              {athlete.birth_year === null || athlete.bodyfat_formula === null ? (
                <span className="t-label text-bad">{athlete.birth_year === null ? "Geburtsjahr" : "Formel"} fehlt</span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {CHECKUP_TYPES.map((type) => {
                const c = byType[type];
                return (
                  <form key={type} action={openCheckup}>
                    <input type="hidden" name="athlete" value={athlete.id} />
                    <input type="hidden" name="type" value={type} />
                    <button
                      type="submit"
                      className="btn flex h-full w-full flex-col items-start gap-1 px-3 py-2 text-left normal-case"
                      style={c ? undefined : { borderStyle: "dashed", color: "var(--color-mute)" }}
                    >
                      <span className="t-label">{CHECKUP_TYPE_LABEL[type]}</span>
                      {c ? (
                        <>
                          <span className="t-num text-[13px] font-medium">{formatDate(c.date)}</span>
                          <span className="t-num text-[13px] font-medium">
                            {c.composition.bodyFatPct === null ? "KFA offen" : `${formatDecimal(c.composition.bodyFatPct, 1, true)} % KFA`}
                          </span>
                        </>
                      ) : (
                        <span className="text-[13px] font-medium">+ anlegen</span>
                      )}
                    </button>
                  </form>
                );
              })}
            </div>

            {first ? (
              <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--color-line)" }}>
                <table className="w-full min-w-[420px] text-left">
                  <thead>
                    <tr className="t-label" style={{ background: "var(--color-paper)" }}>
                      <th className="px-3 py-2 font-medium">Messwert</th>
                      {columns.map((col) => (
                        <th key={col.type} className="px-3 py-2 text-right font-medium">
                          {CHECKUP_TYPE_LABEL[col.type]}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium">Differenz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => {
                      const a = row.get(first);
                      const b = last ? row.get(last) : null;
                      const diff = a !== null && b !== null && last ? b - a : null;
                      return (
                        <tr key={row.label} style={{ borderTop: "1px solid var(--color-line)" }}>
                          <td className="px-3 py-2 text-[14px]">
                            {row.label} <span className="text-mute">({row.unit})</span>
                          </td>
                          {columns.map((col) => {
                            const v = col.c ? row.get(col.c) : null;
                            return (
                              <td key={col.type} className="t-num px-3 py-2 text-right text-[14px]">
                                {v === null ? <span className="text-dead">offen</span> : formatDecimal(v, row.digits, true)}
                              </td>
                            );
                          })}
                          <td className="t-num px-3 py-2 text-right text-[14px] font-medium">
                            {diff === null ? <span className="text-dead">offen</span> : formatSigned(diff, row.digits)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="px-3 py-2 text-[12px] text-mute">
                  Differenz = Ende minus Start. Negative Werte heißen weniger.
                </p>
              </div>
            ) : (
              <p className="px-4 pb-4 text-[14px] text-mute">Noch kein Start-Checkup.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
