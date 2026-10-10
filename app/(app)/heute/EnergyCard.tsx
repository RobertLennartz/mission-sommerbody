"use client";

import { useEffect, useState } from "react";
import { fatEquivalentLabel, stepsKcal } from "@/lib/energy";
import { formatInt } from "@/lib/numbers";

export const KCAL_EVENT = "ms-kcal";
export const STEPS_EVENT = "ms-steps";

/**
 * Energy balance of the day (estimate). Server computes the fixed parts; steps
 * and eaten calories follow the inputs live via window events.
 */
export function EnergyCard({
  bmr,
  digestion,
  training,
  trainingCount,
  weightKg,
  heightCm,
  stepKm,
  initialSteps,
  initialIntake,
}: {
  bmr: number;
  digestion: number;
  training: number;
  trainingCount: number;
  weightKg: number;
  heightCm: number | null;
  /** km already counted by runs and walks, taken out of the steps. */
  stepKm: number;
  initialSteps: number | null;
  initialIntake: number | null;
}) {
  const [steps, setSteps] = useState<number | null>(initialSteps);
  const [intake, setIntake] = useState<number | null>(initialIntake);

  useEffect(() => {
    const onKcal = (e: Event) => setIntake((e as CustomEvent<number | null>).detail);
    const onSteps = (e: Event) => setSteps((e as CustomEvent<number | null>).detail);
    window.addEventListener(KCAL_EVENT, onKcal);
    window.addEventListener(STEPS_EVENT, onSteps);
    return () => {
      window.removeEventListener(KCAL_EVENT, onKcal);
      window.removeEventListener(STEPS_EVENT, onSteps);
    };
  }, []);

  const walk = steps ? stepsKcal(steps, weightKg, heightCm, stepKm) : 0;
  const total = bmr + digestion + walk + training;
  const balance = intake === null ? null : total - intake;
  const r = (n: number) => formatInt(Math.round(n));

  return (
    <section className="card">
      <div className="card-head flex items-baseline justify-between">
        <h2 className="t-label t-label-lg">Energiebilanz</h2>
        <span className="t-label t-label-sm text-mute">grobe Schätzung</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-num text-[28px] font-medium" style={{ color: balance === null ? undefined : balance >= 0 ? "var(--color-good)" : "var(--color-bad)" }}>
            {balance === null ? `${r(total)} kcal` : `${r(Math.abs(balance))} kcal`}
          </span>
          <span className="t-label text-mute text-right">
            {balance === null ? "Verbrauch heute" : balance >= 0 ? "eingespart" : "mehr gegessen als verbraucht"}
          </span>
        </div>
        {balance !== null && balance > 0 ? (
          <p className="t-label t-label-sm text-mute">entspricht {fatEquivalentLabel(balance)} (Faustregel 7.700 kcal pro kg)</p>
        ) : null}
        <dl className="t-num grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[14px]">
          <dt className="text-mute">Grundumsatz</dt>
          <dd className="text-right">{r(bmr)}</dd>
          <dt className="text-mute">Verdauung (+10 %)</dt>
          <dd className="text-right">{r(digestion)}</dd>
          <dt className="text-mute">Schritte</dt>
          <dd className="text-right">{r(walk)}</dd>
          <dt className="text-mute">Training{trainingCount ? ` (${trainingCount})` : ""}, über Grundumsatz</dt>
          <dd className="text-right">{r(training)}</dd>
          <dt className="t-strong" style={{ borderTop: "1px solid var(--color-line)" }}>Verbrauch</dt>
          <dd className="t-strong text-right" style={{ borderTop: "1px solid var(--color-line)" }}>{r(total)}</dd>
          <dt className="text-mute">Gegessen</dt>
          <dd className="text-right">{intake === null ? "nicht erfasst" : r(intake)}</dd>
        </dl>
        {training > 0 ? (
          <p className="text-[13px] text-mute">
            Training zählt hier nur mit dem Teil über dem Grundumsatz. Was der Körper in der Zeit auch in Ruhe verbraucht hätte, steckt schon im Grundumsatz. Die Einheit selbst zeigt den ganzen Verbrauch.
          </p>
        ) : null}
        {intake === null ? (
          <p className="text-[13px] text-mute">Kalorien oben bei Ernährung eintragen, dann rechnet die Bilanz.</p>
        ) : null}
      </div>
    </section>
  );
}
