import { diffDays, formatDate, formatDayShort, isoWeek, type IsoDate } from "@/lib/dates";
import { linear, niceTicks } from "@/lib/chart-scale";
import { missionWeeks } from "@/lib/mission";
import { formatDecimal, formatInt } from "@/lib/numbers";

const W = 380;
const H = 190;
const M = { top: 18, right: 8, bottom: 22, left: 38 };
const AXIS = "var(--color-mute)";
const GRID = "var(--color-line)";

function Frame({ from, to, ticks, y, fmt, children, label }: {
  from: IsoDate;
  to: IsoDate;
  ticks: number[];
  y: (v: number) => number;
  fmt: (v: number) => string;
  children: React.ReactNode;
  label: string;
}) {
  const x = linear([0, diffDays(from, to)], [M.left, W - M.right]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text x={M.left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={AXIS} className="t-num">
            {fmt(t)}
          </text>
        </g>
      ))}
      {missionWeeks().map((monday) => {
        const d = diffDays(from, monday);
        if (d < 0) return null;
        return (
          <text key={monday} x={x(d)} y={H - 8} fontSize={10} fill={AXIS} className="t-num">
            KW {isoWeek(monday).week}
          </text>
        );
      })}
      {children}
    </svg>
  );
}

export type Point = { date: IsoDate; value: number };

/** Weight over the mission: morning weights as a 2 px line, checkups as labelled squares. */
export function WeightChart({ points, checkups, from, to, label }: {
  points: Point[];
  checkups: (Point & { label: string })[];
  from: IsoDate;
  to: IsoDate;
  label: string;
}) {
  const all = [...points, ...checkups];
  if (all.length === 0) return <p className="py-6 text-center text-[14px] text-mute">Noch kein Gewicht eingetragen.</p>;
  const values = all.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 4);
  const y = linear([ticks[0], ticks[ticks.length - 1]], [H - M.bottom, M.top]);
  const x = linear([0, diffDays(from, to)], [M.left, W - M.right]);
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  const path = sorted.map((p, i) => `${i ? "L" : "M"}${x(diffDays(from, p.date)).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <Frame from={from} to={to} ticks={ticks} y={y} fmt={(v) => formatDecimal(v, 1)} label={label}>
      {sorted.length > 1 ? <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" /> : null}
      {sorted.map((p) => (
        <g key={p.date}>
          <circle cx={x(diffDays(from, p.date))} cy={y(p.value)} r={3} fill="var(--color-ink)" />
          <circle cx={x(diffDays(from, p.date))} cy={y(p.value)} r={12} fill="transparent">
            <title>{`${formatDayShort(p.date)}: ${formatDecimal(p.value, 1)} kg (Morgengewicht)`}</title>
          </circle>
        </g>
      ))}
      {checkups.map((c) => {
        const cx = x(diffDays(from, c.date));
        const cy = y(c.value);
        return (
          <g key={c.label}>
            <rect x={cx - 5} y={cy - 5} width={10} height={10} fill="var(--color-acc)" stroke="var(--color-ink)" strokeWidth={1.5}>
              <title>{`${c.label}-Checkup ${formatDate(c.date)}: ${formatDecimal(c.value, 1)} kg`}</title>
            </rect>
            <text
              x={cx > W - 90 ? cx - 9 : cx + 9}
              y={cy + 4}
              textAnchor={cx > W - 90 ? "end" : "start"}
              fontSize={10}
              fill="var(--color-ink)"
              className="t-num"
              paintOrder="stroke"
              stroke="var(--color-bg)"
              strokeWidth={3}
            >
              {c.label} {formatDecimal(c.value, 1)}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/** Daily steps as thin bars with the target as a labelled line. */
export function StepsChart({ points, target, from, to, label }: {
  points: Point[];
  target: number;
  from: IsoDate;
  to: IsoDate;
  label: string;
}) {
  if (points.length === 0) return <p className="py-6 text-center text-[14px] text-mute">Noch keine Schritte eingetragen.</p>;
  const ticks = niceTicks(0, Math.max(target, ...points.map((p) => p.value)), 4);
  const y = linear([0, ticks[ticks.length - 1]], [H - M.bottom, M.top]);
  const days = diffDays(from, to) + 1;
  const band = (W - M.left - M.right) / days;
  const barW = Math.max(2, band - 2); // 2 px gap between neighbours
  return (
    <Frame from={from} to={to} ticks={ticks} y={y} fmt={(v) => (v >= 1000 ? `${formatDecimal(v / 1000, 1)}k` : formatInt(v))} label={label}>
      {points.map((p) => {
        const i = diffDays(from, p.date);
        const top = y(p.value);
        return (
          <rect key={p.date} x={M.left + i * band + 1} y={top} width={barW} height={Math.max(0, H - M.bottom - top)} fill="var(--color-ink)">
            <title>{`${formatDayShort(p.date)}: ${formatInt(p.value)} Schritte${p.value >= target ? ", Ziel erreicht" : ""}`}</title>
          </rect>
        );
      })}
      <line x1={M.left} x2={W - M.right} y1={y(target)} y2={y(target)} stroke="var(--color-acc)" strokeWidth={2} />
      <text x={W - M.right} y={y(target) - 5} textAnchor="end" fontSize={10} fill="var(--color-ink)" className="t-num">
        Ziel {formatInt(target)}
      </text>
    </Frame>
  );
}
